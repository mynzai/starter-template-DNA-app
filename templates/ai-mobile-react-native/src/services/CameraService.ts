import { Platform } from 'react-native';
import { RNCamera } from 'react-native-camera';
import ImagePicker from 'react-native-image-crop-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import AIService from './AIService';

export interface CameraSettings {
  quality: number; // 0-1
  maxWidth: number;
  maxHeight: number;
  compressionQuality: number; // 0-1
  includeBase64: boolean;
  enableAIAnalysis: boolean;
  autoAnalyze: boolean;
  saveToGallery: boolean;
  watermark: boolean;
}

export interface CapturedImage {
  uri: string;
  path: string;
  width: number;
  height: number;
  size: number;
  type: string;
  base64?: string;
  metadata?: {
    timestamp: Date;
    location?: {
      latitude: number;
      longitude: number;
    };
    deviceInfo: {
      platform: string;
      model: string;
    };
  };
}

export interface AIAnalysisResult {
  objects: DetectedObject[];
  text: ExtractedText[];
  faces: DetectedFace[];
  scenes: SceneDescription[];
  colors: DominantColor[];
  sentiment?: string;
  confidence: number;
  processingTime: number;
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExtractedText {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DetectedFace {
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
  attributes?: {
    age?: number;
    gender?: string;
    emotion?: string;
  };
}

export interface SceneDescription {
  description: string;
  confidence: number;
  tags: string[];
}

export interface DominantColor {
  color: string;
  percentage: number;
  name?: string;
}

export interface CameraPermissions {
  camera: boolean;
  storage: boolean;
  location: boolean;
}

export class CameraService {
  private static instance: CameraService;
  private isInitialized: boolean = false;
  private permissions: CameraPermissions = {
    camera: false,
    storage: false,
    location: false,
  };
  private aiService: AIService;
  private eventListeners: Map<string, Function[]> = new Map();

  private settings: CameraSettings = {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
    compressionQuality: 0.8,
    includeBase64: false,
    enableAIAnalysis: true,
    autoAnalyze: false,
    saveToGallery: false,
    watermark: false,
  };

  private constructor() {
    this.aiService = AIService.getInstance();
  }

  public static getInstance(): CameraService {
    if (!CameraService.instance) {
      CameraService.instance = new CameraService();
    }
    return CameraService.instance;
  }

  public async initialize(settings?: Partial<CameraSettings>): Promise<void> {
    try {
      if (settings) {
        this.settings = { ...this.settings, ...settings };
      }

      // Request permissions
      await this.requestPermissions();

      // Initialize AI service if needed
      if (!this.aiService.initialized) {
        await this.aiService.initialize();
      }

      this.isInitialized = true;
      this.emit('initialized', { settings: this.settings });
      
      console.log('[CameraService] Initialized successfully');
    } catch (error) {
      console.error('[CameraService] Initialization failed:', error);
      throw error;
    }
  }

  public async requestPermissions(): Promise<CameraPermissions> {
    try {
      const cameraPermission = Platform.OS === 'android' 
        ? await request(PERMISSIONS.ANDROID.CAMERA)
        : await request(PERMISSIONS.IOS.CAMERA);

      const storagePermission = Platform.OS === 'android'
        ? await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE)
        : await request(PERMISSIONS.IOS.PHOTO_LIBRARY);

      const locationPermission = Platform.OS === 'android'
        ? await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION)
        : await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

      this.permissions = {
        camera: cameraPermission === RESULTS.GRANTED,
        storage: storagePermission === RESULTS.GRANTED,
        location: locationPermission === RESULTS.GRANTED,
      };

      console.log('[CameraService] Permissions:', this.permissions);
      return this.permissions;
    } catch (error) {
      console.error('[CameraService] Permission request failed:', error);
      return this.permissions;
    }
  }

  public async capturePhoto(options?: {
    analyzeWithAI?: boolean;
    compressionQuality?: number;
    maxWidth?: number;
    maxHeight?: number;
    includeBase64?: boolean;
  }): Promise<CapturedImage> {
    if (!this.isInitialized) {
      throw new Error('CameraService not initialized');
    }

    if (!this.permissions.camera) {
      throw new Error('Camera permission required');
    }

    try {
      const captureOptions = {
        quality: options?.compressionQuality || this.settings.compressionQuality,
        maxWidth: options?.maxWidth || this.settings.maxWidth,
        maxHeight: options?.maxHeight || this.settings.maxHeight,
        includeBase64: options?.includeBase64 || this.settings.includeBase64,
        mediaType: 'photo' as const,
        includeExif: true,
      };

      this.emit('captureStart', { options: captureOptions });

      const result = await ImagePicker.openCamera(captureOptions);

      const capturedImage: CapturedImage = {
        uri: result.path,
        path: result.path,
        width: result.width,
        height: result.height,
        size: result.size,
        type: result.mime,
        base64: result.data,
        metadata: {
          timestamp: new Date(),
          deviceInfo: {
            platform: Platform.OS,
            model: Platform.constants.Model || 'Unknown',
          },
        },
      };

      // Process image
      const processedImage = await this.processImage(capturedImage);

      // Auto-analyze with AI if enabled
      if ((options?.analyzeWithAI ?? this.settings.autoAnalyze) && this.settings.enableAIAnalysis) {
        const analysisResult = await this.analyzeImageWithAI(processedImage);
        this.emit('analysisComplete', { image: processedImage, analysis: analysisResult });
      }

      this.emit('captureComplete', { image: processedImage });
      return processedImage;
    } catch (error) {
      console.error('[CameraService] Capture failed:', error);
      this.emit('captureError', { error });
      throw error;
    }
  }

  public async selectFromGallery(options?: {
    analyzeWithAI?: boolean;
    multiple?: boolean;
    maxFiles?: number;
    compressionQuality?: number;
  }): Promise<CapturedImage | CapturedImage[]> {
    if (!this.isInitialized) {
      throw new Error('CameraService not initialized');
    }

    if (!this.permissions.storage) {
      throw new Error('Storage permission required');
    }

    try {
      const pickerOptions = {
        quality: options?.compressionQuality || this.settings.compressionQuality,
        maxWidth: this.settings.maxWidth,
        maxHeight: this.settings.maxHeight,
        includeBase64: this.settings.includeBase64,
        mediaType: 'photo' as const,
        multiple: options?.multiple || false,
        maxFiles: options?.maxFiles || 1,
      };

      this.emit('gallerySelectStart', { options: pickerOptions });

      const result = options?.multiple 
        ? await ImagePicker.openPicker({ ...pickerOptions, multiple: true })
        : await ImagePicker.openPicker(pickerOptions);

      const processResults = async (imageResult: any): Promise<CapturedImage> => {
        const capturedImage: CapturedImage = {
          uri: imageResult.path,
          path: imageResult.path,
          width: imageResult.width,
          height: imageResult.height,
          size: imageResult.size,
          type: imageResult.mime,
          base64: imageResult.data,
          metadata: {
            timestamp: new Date(imageResult.modificationDate || Date.now()),
            deviceInfo: {
              platform: Platform.OS,
              model: Platform.constants.Model || 'Unknown',
            },
          },
        };

        const processedImage = await this.processImage(capturedImage);

        // Auto-analyze with AI if enabled
        if ((options?.analyzeWithAI ?? this.settings.autoAnalyze) && this.settings.enableAIAnalysis) {
          const analysisResult = await this.analyzeImageWithAI(processedImage);
          this.emit('analysisComplete', { image: processedImage, analysis: analysisResult });
        }

        return processedImage;
      };

      let processedResult;
      if (Array.isArray(result)) {
        processedResult = await Promise.all(result.map(processResults));
      } else {
        processedResult = await processResults(result);
      }

      this.emit('gallerySelectComplete', { images: processedResult });
      return processedResult;
    } catch (error) {
      console.error('[CameraService] Gallery selection failed:', error);
      this.emit('gallerySelectError', { error });
      throw error;
    }
  }

  private async processImage(image: CapturedImage): Promise<CapturedImage> {
    try {
      // Resize if needed
      if (image.width > this.settings.maxWidth || image.height > this.settings.maxHeight) {
        const resizedImage = await ImageResizer.createResizedImage(
          image.uri,
          this.settings.maxWidth,
          this.settings.maxHeight,
          'JPEG',
          this.settings.compressionQuality * 100,
          0,
          undefined,
          false,
          {
            mode: 'contain',
            onlyScaleDown: true,
          }
        );

        image.uri = resizedImage.uri;
        image.path = resizedImage.path;
        image.width = resizedImage.width;
        image.height = resizedImage.height;
        image.size = resizedImage.size || image.size;
      }

      // Add watermark if enabled
      if (this.settings.watermark) {
        // Watermark implementation would go here
        console.log('[CameraService] Watermark feature not implemented');
      }

      // Save to gallery if enabled
      if (this.settings.saveToGallery && this.permissions.storage) {
        await this.saveToGallery(image);
      }

      return image;
    } catch (error) {
      console.error('[CameraService] Image processing failed:', error);
      return image;
    }
  }

  public async analyzeImageWithAI(image: CapturedImage): Promise<AIAnalysisResult> {
    if (!this.settings.enableAIAnalysis) {
      throw new Error('AI analysis is disabled');
    }

    if (!this.aiService.initialized) {
      throw new Error('AI Service not initialized');
    }

    try {
      const startTime = Date.now();
      this.emit('analysisStart', { image });

      // Convert image to base64 if needed
      let base64Image = image.base64;
      if (!base64Image) {
        base64Image = await RNFS.readFile(image.path, 'base64');
      }

      // Create AI prompt for image analysis
      const analysisPrompt = `Analyze this image and provide a detailed JSON response with the following structure:
      {
        "objects": [{"label": "string", "confidence": number, "boundingBox": {"x": number, "y": number, "width": number, "height": number}}],
        "text": [{"text": "string", "confidence": number, "boundingBox": {"x": number, "y": number, "width": number, "height": number}}],
        "faces": [{"confidence": number, "boundingBox": {"x": number, "y": number, "width": number, "height": number}, "attributes": {"age": number, "gender": "string", "emotion": "string"}}],
        "scenes": [{"description": "string", "confidence": number, "tags": ["string"]}],
        "colors": [{"color": "string", "percentage": number, "name": "string"}],
        "sentiment": "string",
        "confidence": number
      }`;

      // Make AI request
      const response = await this.aiService.sendMessage(analysisPrompt, undefined, {
        model: 'gpt-4-vision-preview',
        maxTokens: 2000,
        temperature: 0.3,
      });

      // Parse AI response
      let analysisData;
      try {
        analysisData = JSON.parse(response.content);
      } catch {
        // Fallback if AI doesn't return valid JSON
        analysisData = {
          objects: [],
          text: [],
          faces: [],
          scenes: [{ description: response.content, confidence: 0.8, tags: [] }],
          colors: [],
          sentiment: 'neutral',
          confidence: 0.7,
        };
      }

      const processingTime = Date.now() - startTime;

      const result: AIAnalysisResult = {
        objects: analysisData.objects || [],
        text: analysisData.text || [],
        faces: analysisData.faces || [],
        scenes: analysisData.scenes || [],
        colors: analysisData.colors || [],
        sentiment: analysisData.sentiment || 'neutral',
        confidence: analysisData.confidence || 0.7,
        processingTime,
      };

      this.emit('analysisComplete', { image, analysis: result });
      return result;
    } catch (error) {
      console.error('[CameraService] AI analysis failed:', error);
      this.emit('analysisError', { image, error });
      throw error;
    }
  }

  private async saveToGallery(image: CapturedImage): Promise<void> {
    try {
      // Implementation would use CameraRoll or similar
      console.log('[CameraService] Save to gallery not implemented');
    } catch (error) {
      console.error('[CameraService] Failed to save to gallery:', error);
    }
  }

  public async getImageInfo(imagePath: string): Promise<{
    width: number;
    height: number;
    size: number;
    type: string;
  }> {
    try {
      const stats = await RNFS.stat(imagePath);
      
      // For simplicity, returning basic info
      // In a real implementation, you'd extract EXIF data
      return {
        width: 0, // Would extract from EXIF
        height: 0, // Would extract from EXIF
        size: stats.size,
        type: 'image/jpeg', // Would detect from file
      };
    } catch (error) {
      console.error('[CameraService] Failed to get image info:', error);
      throw error;
    }
  }

  public async deleteImage(imagePath: string): Promise<void> {
    try {
      await RNFS.unlink(imagePath);
      this.emit('imageDeleted', { path: imagePath });
    } catch (error) {
      console.error('[CameraService] Failed to delete image:', error);
      throw error;
    }
  }

  public async compressImage(
    imagePath: string,
    options: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    } = {}
  ): Promise<CapturedImage> {
    try {
      const resizedImage = await ImageResizer.createResizedImage(
        imagePath,
        options.maxWidth || this.settings.maxWidth,
        options.maxHeight || this.settings.maxHeight,
        'JPEG',
        (options.quality || this.settings.compressionQuality) * 100,
        0,
        undefined,
        false,
        {
          mode: 'contain',
          onlyScaleDown: true,
        }
      );

      return {
        uri: resizedImage.uri,
        path: resizedImage.path,
        width: resizedImage.width,
        height: resizedImage.height,
        size: resizedImage.size || 0,
        type: 'image/jpeg',
        metadata: {
          timestamp: new Date(),
          deviceInfo: {
            platform: Platform.OS,
            model: Platform.constants.Model || 'Unknown',
          },
        },
      };
    } catch (error) {
      console.error('[CameraService] Image compression failed:', error);
      throw error;
    }
  }

  // Event management
  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('[CameraService] Event listener error:', error);
        }
      });
    }
  }

  // Public getters and setters
  public get initialized(): boolean {
    return this.isInitialized;
  }

  public getPermissions(): CameraPermissions {
    return { ...this.permissions };
  }

  public getSettings(): CameraSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<CameraSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.emit('settingsUpdated', { settings: this.settings });
  }

  public async getCameraConstantsCached(): Promise<any> {
    // Return camera constants/capabilities
    return {
      Type: RNCamera.Constants.Type,
      FlashMode: RNCamera.Constants.FlashMode,
      AutoFocus: RNCamera.Constants.AutoFocus,
      WhiteBalance: RNCamera.Constants.WhiteBalance,
      VideoQuality: RNCamera.Constants.VideoQuality,
    };
  }
}

export default CameraService;