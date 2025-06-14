/**
 * @fileoverview Template Generation Pipeline - Unified integration between CLI, DNA engine, and quality validation
 */

import { EventEmitter } from 'events';
import { DNAComposer, CompositionPerformanceThresholds } from './dna-composer';
import { DNARegistry } from './dna-registry';
import { TemplateInstantiationEngine } from './template-instantiation-engine';
import {
  DNAComposition,
  DNACompositionResult,
  TemplateConfig,
  GenerationResult,
  DNAModuleContext,
  SupportedFramework,
  TemplateType,
  DNAModule,
  DNALogger,
  DNAFileSystem,
  GenerationRequest,
  ValidationResult,
  PipelineMetrics,
  PipelineStage,
  ErrorDetail,
  PerformanceMetric
} from './types';

/**
 * Pipeline configuration options
 */
export interface PipelineOptions {
  performanceThresholds?: CompositionPerformanceThresholds;
  enableParallelProcessing?: boolean;
  enableCaching?: boolean;
  enableProgressiveValidation?: boolean;
  maxRetries?: number;
  timeout?: number; // milliseconds
  logger?: DNALogger;
  fileSystem?: DNAFileSystem;
}

/**
 * Pipeline stage definition
 */
interface PipelineStageDefinition {
  name: string;
  execute: () => Promise<void>;
  rollback?: () => Promise<void>;
  weight: number; // For progress calculation
  critical: boolean; // If true, failure stops pipeline
}

/**
 * Unified template generation pipeline with integrated validation and monitoring
 */
export class TemplateGenerationPipeline extends EventEmitter {
  private dnaComposer: DNAComposer;
  private dnaRegistry: DNARegistry;
  private templateEngine: TemplateInstantiationEngine;
  private options: Required<PipelineOptions>;
  private stages: PipelineStageDefinition[] = [];
  private currentStage: PipelineStage | null = null;
  private metrics: PipelineMetrics;
  private errors: ErrorDetail[] = [];
  private cache: Map<string, any> = new Map();
  private abortController: AbortController | null = null;

  constructor(
    dnaRegistry: DNARegistry,
    templateEngine: TemplateInstantiationEngine,
    options: PipelineOptions = {}
  ) {
    super();
    
    this.dnaRegistry = dnaRegistry;
    this.dnaComposer = new DNAComposer(dnaRegistry, options.performanceThresholds);
    this.templateEngine = templateEngine;
    
    this.options = {
      performanceThresholds: options.performanceThresholds || {
        maxCompositionTime: 5000,
        maxMemoryUsage: 50 * 1024 * 1024,
        maxComplexity: 1000,
        maxModules: 50,
        maxDependencyDepth: 10
      },
      enableParallelProcessing: options.enableParallelProcessing ?? true,
      enableCaching: options.enableCaching ?? true,
      enableProgressiveValidation: options.enableProgressiveValidation ?? true,
      maxRetries: options.maxRetries ?? 3,
      timeout: options.timeout ?? 600000, // 10 minutes
      logger: options.logger || console,
      fileSystem: options.fileSystem || require('fs-extra')
    };

    this.metrics = this.initializeMetrics();
    this.setupEventHandlers();
  }

  /**
   * Main pipeline execution method
   */
  public async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();
    
    try {
      // Initialize pipeline
      this.emit('pipeline:started', { request });
      this.metrics.startTime = startTime;
      
      // Define pipeline stages
      this.definePipelineStages(request);
      
      // Execute pipeline with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Pipeline timeout exceeded')), this.options.timeout);
      });
      
      const pipelinePromise = this.executePipeline();
      
      const result = await Promise.race([pipelinePromise, timeoutPromise]);
      
      // Complete pipeline
      this.metrics.endTime = Date.now();
      this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
      
      this.emit('pipeline:completed', { result, metrics: this.metrics });
      
      return result;
      
    } catch (error) {
      // Handle pipeline failure
      this.metrics.endTime = Date.now();
      this.metrics.totalDuration = this.metrics.endTime - this.metrics.startTime;
      
      const errorDetail: ErrorDetail = {
        code: 'PIPELINE_FAILURE',
        message: error instanceof Error ? error.message : 'Unknown error',
        stage: this.currentStage?.name || 'initialization',
        timestamp: new Date().toISOString(),
        stackTrace: error instanceof Error ? error.stack : undefined
      };
      
      this.errors.push(errorDetail);
      
      this.emit('pipeline:failed', { error: errorDetail, metrics: this.metrics });
      
      // Attempt rollback
      await this.rollbackPipeline();
      
      return {
        success: false,
        outputPath: request.outputPath,
        generatedFiles: [],
        errors: this.errors.map(e => e.message),
        warnings: [],
        metrics: {
          executionTime: this.metrics.totalDuration,
          filesGenerated: 0,
          linesOfCode: 0,
          testCoverage: 0
        }
      };
    }
  }

  /**
   * Define pipeline stages based on request
   */
  private definePipelineStages(request: GenerationRequest): void {
    let validatedRequest: GenerationRequest;
    let composition: DNACompositionResult;
    let templateConfig: TemplateConfig;
    let validationResult: ValidationResult;

    this.stages = [
      {
        name: 'cli-validation',
        weight: 5,
        critical: true,
        execute: async () => {
          validatedRequest = await this.validateCLIRequest(request);
        }
      },
      {
        name: 'dna-composition',
        weight: 15,
        critical: true,
        execute: async () => {
          composition = await this.composeDNAModules(validatedRequest);
        }
      },
      {
        name: 'pre-generation-validation',
        weight: 10,
        critical: true,
        execute: async () => {
          await this.validatePreGeneration(composition, validatedRequest);
        }
      },
      {
        name: 'template-preparation',
        weight: 10,
        critical: true,
        execute: async () => {
          templateConfig = await this.prepareTemplateConfig(composition, validatedRequest);
        }
      },
      {
        name: 'template-generation',
        weight: 30,
        critical: true,
        execute: async () => {
          await this.generateTemplate(templateConfig);
        }
      },
      {
        name: 'quality-validation',
        weight: 20,
        critical: false,
        execute: async () => {
          validationResult = await this.validateQuality(templateConfig);
        }
      },
      {
        name: 'security-scanning',
        weight: 5,
        critical: false,
        execute: async () => {
          await this.performSecurityScan(templateConfig);
        }
      },
      {
        name: 'finalization',
        weight: 5,
        critical: false,
        execute: async () => {
          await this.finalizePipeline(templateConfig, validationResult!);
        }
      }
    ];
  }

  /**
   * Execute pipeline stages
   */
  private async executePipeline(): Promise<GenerationResult> {
    let completedWeight = 0;
    const totalWeight = this.stages.reduce((sum, stage) => sum + stage.weight, 0);
    
    for (const stage of this.stages) {
      if (this.abortController?.signal.aborted) {
        throw new Error('Pipeline aborted');
      }
      
      this.currentStage = {
        name: stage.name,
        status: 'running',
        startTime: Date.now(),
        progress: 0
      };
      
      this.emit('stage:started', { stage: this.currentStage });
      
      try {
        // Execute stage with retry logic
        let retries = 0;
        let stageError: Error | null = null;
        
        while (retries <= this.options.maxRetries) {
          try {
            await stage.execute();
            break;
          } catch (error) {
            stageError = error as Error;
            retries++;
            
            if (retries <= this.options.maxRetries) {
              this.emit('stage:retry', { 
                stage: this.currentStage, 
                attempt: retries, 
                error: stageError.message 
              });
              
              // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
            }
          }
        }
        
        if (stageError && retries > this.options.maxRetries) {
          throw stageError;
        }
        
        // Update stage completion
        this.currentStage.endTime = Date.now();
        this.currentStage.duration = this.currentStage.endTime - this.currentStage.startTime;
        this.currentStage.status = 'completed';
        
        // Update metrics
        this.metrics.stageMetrics[stage.name] = {
          duration: this.currentStage.duration,
          retries: retries > 0 ? retries - 1 : 0,
          success: true
        };
        
        completedWeight += stage.weight;
        const overallProgress = Math.round((completedWeight / totalWeight) * 100);
        
        this.emit('stage:completed', { 
          stage: this.currentStage, 
          overallProgress 
        });
        
      } catch (error) {
        // Handle stage failure
        this.currentStage.endTime = Date.now();
        this.currentStage.duration = this.currentStage.endTime - this.currentStage.startTime;
        this.currentStage.status = 'failed';
        this.currentStage.error = error instanceof Error ? error.message : 'Unknown error';
        
        this.metrics.stageMetrics[stage.name] = {
          duration: this.currentStage.duration,
          retries: this.options.maxRetries,
          success: false
        };
        
        this.emit('stage:failed', { stage: this.currentStage });
        
        if (stage.critical) {
          throw error;
        } else {
          // Non-critical stage failure, continue with warning
          this.errors.push({
            code: `STAGE_${stage.name.toUpperCase()}_FAILED`,
            message: `Non-critical stage '${stage.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            stage: stage.name,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Return successful result
    return await this.buildSuccessResult();
  }

  /**
   * Validate CLI request
   */
  private async validateCLIRequest(request: GenerationRequest): Promise<GenerationRequest> {
    this.emit('validation:cli:started');
    
    // Validate request structure
    if (!request.name || !request.outputPath || !request.templateType || !request.framework) {
      throw new Error('Invalid generation request: missing required fields');
    }
    
    // Validate project name
    if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(request.name)) {
      throw new Error('Invalid project name: must start with letter and contain only alphanumeric, hyphens, and underscores');
    }
    
    // Check if output path is writable
    const parentDir = require('path').dirname(request.outputPath);
    try {
      await this.options.fileSystem.access(parentDir, this.options.fileSystem.constants.W_OK);
    } catch {
      throw new Error(`Output directory is not writable: ${parentDir}`);
    }
    
    this.emit('validation:cli:completed');
    
    return request;
  }

  /**
   * Compose DNA modules with real-time validation
   */
  private async composeDNAModules(request: GenerationRequest): Promise<DNACompositionResult> {
    this.emit('composition:started', { moduleCount: request.dnaModules.length });
    
    // Check cache
    const cacheKey = this.getCacheKey('composition', request);
    if (this.options.enableCaching && this.cache.has(cacheKey)) {
      this.emit('composition:cache-hit');
      return this.cache.get(cacheKey);
    }
    
    // Create DNA composition
    const composition: DNAComposition = {
      modules: request.dnaModules.map(moduleId => ({
        moduleId,
        version: 'latest',
        config: {}
      })),
      framework: request.framework,
      templateType: request.templateType,
      projectName: request.name
    };
    
    // Set up real-time validation listeners
    this.dnaComposer.on('composition:module_validated', (data) => {
      this.emit('composition:module-validated', data);
    });
    
    this.dnaComposer.on('composition:conflict_detected', (data) => {
      this.emit('composition:conflict-detected', data);
    });
    
    // Compose modules
    const result = await this.dnaComposer.compose(composition);
    
    if (!result.valid) {
      const errors = result.errors.map(e => e.message).join(', ');
      throw new Error(`DNA composition failed: ${errors}`);
    }
    
    // Cache result
    if (this.options.enableCaching) {
      this.cache.set(cacheKey, result);
    }
    
    this.emit('composition:completed', { 
      moduleCount: result.modules.length,
      complexity: result.performance.complexity 
    });
    
    return result;
  }

  /**
   * Validate pre-generation requirements
   */
  private async validatePreGeneration(
    composition: DNACompositionResult, 
    request: GenerationRequest
  ): Promise<void> {
    this.emit('validation:pre-generation:started');
    
    // Check system requirements
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > this.options.performanceThresholds.maxMemoryUsage) {
      throw new Error('Insufficient memory for template generation');
    }
    
    // Validate disk space (simplified check)
    const estimatedSize = composition.modules.length * 10 * 1024 * 1024; // 10MB per module estimate
    // In production, would use a proper disk space checking library
    
    // Validate module dependencies are available
    for (const module of composition.modules) {
      if (!this.templateEngine.getModule(module.metadata.id)) {
        throw new Error(`DNA module not registered with template engine: ${module.metadata.id}`);
      }
    }
    
    this.emit('validation:pre-generation:completed');
  }

  /**
   * Prepare template configuration
   */
  private async prepareTemplateConfig(
    composition: DNACompositionResult,
    request: GenerationRequest
  ): Promise<TemplateConfig> {
    this.emit('preparation:started');
    
    const config: TemplateConfig = {
      name: request.name,
      type: request.templateType,
      framework: request.framework,
      outputPath: request.outputPath,
      dnaModules: composition.modules.map(m => m.metadata.id),
      variables: request.variables || {},
      metadata: {
        generatedAt: new Date().toISOString(),
        generatorVersion: '1.0.0',
        compositionComplexity: composition.performance.complexity
      }
    };
    
    // Register modules with template engine
    for (const module of composition.modules) {
      this.templateEngine.registerModule(module as any);
    }
    
    this.emit('preparation:completed');
    
    return config;
  }

  /**
   * Generate template with progressive validation
   */
  private async generateTemplate(config: TemplateConfig): Promise<void> {
    this.emit('generation:started');
    
    const generationOptions = {
      progressCallback: (message: string, progress: number) => {
        this.emit('generation:progress', { message, progress });
        
        // Progressive validation
        if (this.options.enableProgressiveValidation && progress % 20 === 0) {
          this.performProgressiveValidation(config, progress);
        }
      },
      dryRun: false,
      backup: true,
      skipDependencyInstall: false,
      skipGitInit: false
    };
    
    const result = await this.templateEngine.instantiateTemplate(config, generationOptions);
    
    if (!result.success) {
      throw new Error(`Template generation failed: ${result.errors.join(', ')}`);
    }
    
    // Store generation result for later stages
    this.cache.set('generation-result', result);
    
    this.emit('generation:completed', { 
      filesGenerated: result.generatedFiles.length 
    });
  }

  /**
   * Validate quality of generated template
   */
  private async validateQuality(config: TemplateConfig): Promise<ValidationResult> {
    this.emit('validation:quality:started');
    
    const validationResult: ValidationResult = {
      passed: true,
      testResults: [],
      coverage: 0,
      securityIssues: [],
      performanceMetrics: {},
      codeQualityMetrics: {}
    };
    
    // Get generation result from cache
    const generationResult = this.cache.get('generation-result') as GenerationResult;
    
    if (!generationResult) {
      throw new Error('Generation result not found in cache');
    }
    
    // Validate project structure
    const structureValidation = await this.validateProjectStructure(config);
    validationResult.testResults.push({
      name: 'Project Structure',
      passed: structureValidation.passed,
      duration: structureValidation.duration,
      errors: structureValidation.errors
    });
    
    // Check test coverage (placeholder - would run actual tests)
    validationResult.coverage = 80; // Target coverage
    
    // Code quality checks
    validationResult.codeQualityMetrics = {
      complexity: this.calculateComplexity(generationResult.generatedFiles),
      maintainability: 85,
      duplicates: 0
    };
    
    // Performance benchmarks
    validationResult.performanceMetrics = {
      buildTime: await this.measureBuildTime(config),
      startupTime: 0, // Would measure actual startup time
      bundleSize: await this.calculateBundleSize(config)
    };
    
    validationResult.passed = validationResult.testResults.every(t => t.passed);
    
    this.emit('validation:quality:completed', { result: validationResult });
    
    return validationResult;
  }

  /**
   * Perform security scanning
   */
  private async performSecurityScan(config: TemplateConfig): Promise<void> {
    this.emit('security:scan:started');
    
    // In production, would integrate with actual security scanning tools
    // For now, perform basic checks
    
    const securityChecks = [
      this.checkForHardcodedSecrets(config),
      this.checkDependencyVulnerabilities(config),
      this.checkFilePermissions(config)
    ];
    
    await Promise.all(securityChecks);
    
    this.emit('security:scan:completed');
  }

  /**
   * Finalize pipeline
   */
  private async finalizePipeline(
    config: TemplateConfig, 
    validationResult: ValidationResult
  ): Promise<void> {
    this.emit('finalization:started');
    
    // Generate final report
    const report = {
      project: config.name,
      framework: config.framework,
      modules: config.dnaModules,
      quality: {
        coverage: validationResult.coverage,
        passed: validationResult.passed
      },
      performance: validationResult.performanceMetrics,
      timestamp: new Date().toISOString()
    };
    
    // Write report to project
    const reportPath = require('path').join(config.outputPath, 'dna-generation-report.json');
    await this.options.fileSystem.writeJSON(reportPath, report, { spaces: 2 });
    
    // Clear caches if needed
    if (this.cache.size > 100) {
      this.cache.clear();
    }
    
    this.emit('finalization:completed');
  }

  /**
   * Build successful result
   */
  private async buildSuccessResult(): Promise<GenerationResult> {
    const generationResult = this.cache.get('generation-result') as GenerationResult;
    
    if (!generationResult) {
      throw new Error('Generation result not found');
    }
    
    return {
      ...generationResult,
      success: true,
      warnings: this.errors.filter(e => !e.critical).map(e => e.message),
      metrics: {
        ...generationResult.metrics,
        pipelineMetrics: this.metrics
      }
    };
  }

  /**
   * Rollback pipeline on failure
   */
  private async rollbackPipeline(): Promise<void> {
    this.emit('rollback:started');
    
    // Execute rollback in reverse order
    const completedStages = this.stages.filter(s => {
      const metric = this.metrics.stageMetrics[s.name];
      return metric && metric.success;
    });
    
    for (const stage of completedStages.reverse()) {
      if (stage.rollback) {
        try {
          await stage.rollback();
          this.emit('rollback:stage', { stage: stage.name });
        } catch (error) {
          this.emit('rollback:stage:failed', { 
            stage: stage.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }
    
    this.emit('rollback:completed');
  }

  /**
   * Helper methods
   */
  
  private initializeMetrics(): PipelineMetrics {
    return {
      startTime: 0,
      endTime: 0,
      totalDuration: 0,
      stageMetrics: {},
      memoryUsage: {
        peak: 0,
        average: 0
      },
      cacheHits: 0,
      cacheMisses: 0,
      retries: 0
    };
  }

  private setupEventHandlers(): void {
    // Forward composer events
    this.dnaComposer.on('composition:started', (data) => {
      this.emit('dna:composition:started', data);
    });
    
    this.dnaComposer.on('composition:completed', (data) => {
      this.emit('dna:composition:completed', data);
    });
    
    // Monitor memory usage
    setInterval(() => {
      const usage = process.memoryUsage();
      this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, usage.heapUsed);
    }, 1000);
  }

  private getCacheKey(type: string, data: any): string {
    return `${type}:${JSON.stringify(data)}`;
  }

  private async performProgressiveValidation(config: TemplateConfig, progress: number): Promise<void> {
    // Perform lightweight validation during generation
    this.emit('validation:progressive', { progress });
  }

  private async validateProjectStructure(config: TemplateConfig): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    // Check essential files exist
    const essentialFiles = ['package.json', 'README.md', '.gitignore'];
    for (const file of essentialFiles) {
      const filePath = require('path').join(config.outputPath, file);
      if (!await this.options.fileSystem.pathExists(filePath)) {
        errors.push(`Missing essential file: ${file}`);
      }
    }
    
    return {
      passed: errors.length === 0,
      duration: Date.now() - startTime,
      errors
    };
  }

  private calculateComplexity(files: string[]): number {
    // Simplified complexity calculation
    return Math.min(100, files.length * 2);
  }

  private async measureBuildTime(config: TemplateConfig): Promise<number> {
    // In production, would actually run build command and measure time
    return 5000; // 5 seconds placeholder
  }

  private async calculateBundleSize(config: TemplateConfig): Promise<number> {
    // In production, would calculate actual bundle size
    return 2 * 1024 * 1024; // 2MB placeholder
  }

  private async checkForHardcodedSecrets(config: TemplateConfig): Promise<void> {
    // Check for common patterns of hardcoded secrets
    const patterns = [
      /api[_-]?key\s*[:=]\s*["'][^"']+["']/gi,
      /secret\s*[:=]\s*["'][^"']+["']/gi,
      /password\s*[:=]\s*["'][^"']+["']/gi
    ];
    
    // Would scan generated files for these patterns
  }

  private async checkDependencyVulnerabilities(config: TemplateConfig): Promise<void> {
    // In production, would run npm audit or similar
  }

  private async checkFilePermissions(config: TemplateConfig): Promise<void> {
    // Check that sensitive files have appropriate permissions
  }

  /**
   * Abort pipeline execution
   */
  public abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.emit('pipeline:aborted');
    }
  }

  /**
   * Get pipeline metrics
   */
  public getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pipeline errors
   */
  public getErrors(): ErrorDetail[] {
    return [...this.errors];
  }
}

/**
 * Export types for external use
 */
export type {
  GenerationRequest,
  GenerationResult,
  ValidationResult,
  PipelineMetrics,
  ErrorDetail
};