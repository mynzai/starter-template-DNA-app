import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:image/image.dart' as img;

import '../models/camera_capture.dart';
import '../models/image_analysis.dart';
import 'ai_service.dart';
import 'storage_service.dart';

enum CameraServiceState {
  idle,
  initializing,
  ready,
  capturing,
  processing,
  error,
}

class CameraService {
  static final CameraService _instance = CameraService._internal();
  static CameraService get instance => _instance;
  CameraService._internal();

  final StreamController<CameraServiceState> _stateController = 
      StreamController<CameraServiceState>.broadcast();
  final StreamController<CameraCapture> _captureController = 
      StreamController<CameraCapture>.broadcast();

  CameraController? _cameraController;
  final ImagePicker _imagePicker = ImagePicker();
  
  List<CameraDescription> _availableCameras = [];
  CameraDescription? _currentCamera;
  bool _isInitialized = false;
  CameraServiceState _currentState = CameraServiceState.idle;
  
  // Camera settings
  FlashMode _flashMode = FlashMode.auto;
  double _zoomLevel = 1.0;
  double _minZoom = 1.0;
  double _maxZoom = 8.0;
  
  // Getters
  CameraServiceState get currentState => _currentState;
  bool get isInitialized => _isInitialized;
  CameraController? get cameraController => _cameraController;
  List<CameraDescription> get availableCameras => _availableCameras;
  CameraDescription? get currentCamera => _currentCamera;
  FlashMode get flashMode => _flashMode;
  double get zoomLevel => _zoomLevel;
  double get minZoom => _minZoom;
  double get maxZoom => _maxZoom;
  
  Stream<CameraServiceState> get stateStream => _stateController.stream;
  Stream<CameraCapture> get captureStream => _captureController.stream;

  /// Initialize camera service
  Future<void> init() async {
    if (_isInitialized) return;

    try {
      _updateState(CameraServiceState.initializing);

      // Request camera permission
      final hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        throw Exception('Camera permission not granted');
      }

      // Get available cameras
      _availableCameras = await availableCameras();
      if (_availableCameras.isEmpty) {
        throw Exception('No cameras available');
      }

      // Set default camera (back camera if available)
      _currentCamera = _availableCameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => _availableCameras.first,
      );

      // Initialize camera controller
      await _initializeCameraController();

      _isInitialized = true;
      _updateState(CameraServiceState.ready);
      
      debugPrint('Camera Service initialized successfully');
    } catch (e) {
      debugPrint('Camera Service initialization error: $e');
      _updateState(CameraServiceState.error);
      rethrow;
    }
  }

  /// Request camera permission
  Future<bool> requestCameraPermission() async {
    try {
      final status = await Permission.camera.request();
      return status.isGranted;
    } catch (e) {
      debugPrint('Camera permission request error: $e');
      return false;
    }
  }

  /// Initialize camera controller
  Future<void> _initializeCameraController() async {
    if (_currentCamera == null) return;

    try {
      _cameraController?.dispose();
      
      _cameraController = CameraController(
        _currentCamera!,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _cameraController!.initialize();
      
      // Get zoom constraints
      _minZoom = await _cameraController!.getMinZoomLevel();
      _maxZoom = await _cameraController!.getMaxZoomLevel();
      _zoomLevel = _minZoom;

      // Set flash mode
      await _cameraController!.setFlashMode(_flashMode);
      
    } catch (e) {
      debugPrint('Camera controller initialization error: $e');
      rethrow;
    }
  }

  /// Switch camera (front/back)
  Future<void> switchCamera() async {
    if (_availableCameras.length < 2) return;

    try {
      _updateState(CameraServiceState.initializing);

      final currentIndex = _availableCameras.indexOf(_currentCamera!);
      final nextIndex = (currentIndex + 1) % _availableCameras.length;
      _currentCamera = _availableCameras[nextIndex];

      await _initializeCameraController();
      
      _updateState(CameraServiceState.ready);
    } catch (e) {
      debugPrint('Switch camera error: $e');
      _updateState(CameraServiceState.error);
    }
  }

  /// Capture photo
  Future<CameraCapture?> capturePhoto({
    String? prompt,
    bool analyzeWithAI = true,
  }) async {
    if (!_isInitialized || _cameraController == null) return null;

    try {
      _updateState(CameraServiceState.capturing);

      final XFile imageFile = await _cameraController!.takePicture();
      final imageBytes = await imageFile.readAsBytes();
      
      final capture = CameraCapture(
        imageBytes: imageBytes,
        timestamp: DateTime.now(),
        cameraInfo: {
          'lens_direction': _currentCamera!.lensDirection.toString(),
          'sensor_orientation': _currentCamera!.sensorOrientation,
          'flash_mode': _flashMode.toString(),
          'zoom_level': _zoomLevel,
        },
      );

      _captureController.add(capture);
      
      // Analyze with AI if requested
      if (analyzeWithAI) {
        _updateState(CameraServiceState.processing);
        
        final analysis = await AIService.instance.analyzeImage(
          imageBytes: imageBytes,
          prompt: prompt,
        );
        
        capture.analysis = analysis;
        
        // Save to storage
        await StorageService.instance.saveCameraCapture(capture);
      }

      _updateState(CameraServiceState.ready);
      return capture;
    } catch (e) {
      debugPrint('Capture photo error: $e');
      _updateState(CameraServiceState.error);
      return null;
    }
  }

  /// Pick image from gallery
  Future<CameraCapture?> pickFromGallery({
    String? prompt,
    bool analyzeWithAI = true,
  }) async {
    try {
      _updateState(CameraServiceState.capturing);

      final XFile? imageFile = await _imagePicker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (imageFile == null) {
        _updateState(CameraServiceState.ready);
        return null;
      }

      final imageBytes = await imageFile.readAsBytes();
      
      final capture = CameraCapture(
        imageBytes: imageBytes,
        timestamp: DateTime.now(),
        source: 'gallery',
        cameraInfo: {
          'source': 'gallery',
          'path': imageFile.path,
        },
      );

      _captureController.add(capture);
      
      // Analyze with AI if requested
      if (analyzeWithAI) {
        _updateState(CameraServiceState.processing);
        
        final analysis = await AIService.instance.analyzeImage(
          imageBytes: imageBytes,
          prompt: prompt,
        );
        
        capture.analysis = analysis;
        
        // Save to storage
        await StorageService.instance.saveCameraCapture(capture);
      }

      _updateState(CameraServiceState.ready);
      return capture;
    } catch (e) {
      debugPrint('Pick from gallery error: $e');
      _updateState(CameraServiceState.error);
      return null;
    }
  }

  /// Set flash mode
  Future<void> setFlashMode(FlashMode mode) async {
    if (_cameraController == null) return;

    try {
      await _cameraController!.setFlashMode(mode);
      _flashMode = mode;
    } catch (e) {
      debugPrint('Set flash mode error: $e');
    }
  }

  /// Set zoom level
  Future<void> setZoomLevel(double zoom) async {
    if (_cameraController == null) return;

    try {
      final clampedZoom = zoom.clamp(_minZoom, _maxZoom);
      await _cameraController!.setZoomLevel(clampedZoom);
      _zoomLevel = clampedZoom;
    } catch (e) {
      debugPrint('Set zoom level error: $e');
    }
  }

  /// Enable/disable auto focus
  Future<void> setAutoFocus(bool enabled) async {
    if (_cameraController == null) return;

    try {
      await _cameraController!.setFocusMode(
        enabled ? FocusMode.auto : FocusMode.locked,
      );
    } catch (e) {
      debugPrint('Set auto focus error: $e');
    }
  }

  /// Set focus point
  Future<void> setFocusPoint(Offset point) async {
    if (_cameraController == null) return;

    try {
      await _cameraController!.setFocusPoint(point);
    } catch (e) {
      debugPrint('Set focus point error: $e');
    }
  }

  /// Compress image
  Future<Uint8List> compressImage(
    Uint8List imageBytes, {
    int quality = 85,
    int? maxWidth,
    int? maxHeight,
  }) async {
    try {
      final image = img.decodeImage(imageBytes);
      if (image == null) return imageBytes;

      img.Image resized = image;
      
      // Resize if needed
      if (maxWidth != null || maxHeight != null) {
        resized = img.copyResize(
          image,
          width: maxWidth,
          height: maxHeight,
          interpolation: img.Interpolation.linear,
        );
      }

      // Compress
      final compressed = img.encodeJpg(resized, quality: quality);
      return Uint8List.fromList(compressed);
    } catch (e) {
      debugPrint('Compress image error: $e');
      return imageBytes;
    }
  }

  /// Get camera capture history
  Future<List<CameraCapture>> getCaptureHistory({
    int limit = 50,
  }) async {
    try {
      return await StorageService.instance.getCameraCaptures(limit: limit);
    } catch (e) {
      debugPrint('Get capture history error: $e');
      return [];
    }
  }

  /// Delete capture
  Future<void> deleteCapture(String captureId) async {
    try {
      await StorageService.instance.deleteCameraCapture(captureId);
    } catch (e) {
      debugPrint('Delete capture error: $e');
    }
  }

  /// Start live analysis (for real-time AI features)
  Stream<ImageAnalysis> startLiveAnalysis({
    Duration interval = const Duration(seconds: 2),
    String? prompt,
  }) async* {
    if (!_isInitialized || _cameraController == null) return;

    Timer.periodic(interval, (timer) async {
      try {
        if (_currentState != CameraServiceState.ready) return;

        final image = await _cameraController!.takePicture();
        final imageBytes = await image.readAsBytes();
        
        // Compress for faster analysis
        final compressedBytes = await compressImage(
          imageBytes,
          quality: 60,
          maxWidth: 640,
          maxHeight: 480,
        );

        final analysis = await AIService.instance.analyzeImage(
          imageBytes: compressedBytes,
          prompt: prompt ?? 'Analyze this real-time camera feed',
        );

        yield analysis;
      } catch (e) {
        debugPrint('Live analysis error: $e');
        timer.cancel();
      }
    });
  }

  /// Update current state
  void _updateState(CameraServiceState newState) {
    if (_currentState != newState) {
      _currentState = newState;
      _stateController.add(newState);
    }
  }

  /// Cleanup resources
  void dispose() {
    _cameraController?.dispose();
    _stateController.close();
    _captureController.close();
  }
}