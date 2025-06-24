/**
 * @fileoverview Base Framework Adapter Implementation
 * Provides common functionality for all framework-specific adapters
 */

import {
  FrameworkAdapter,
  DNAContext,
  GeneratedFile,
  ConfigFile,
  SourceFile,
  TestFile,
  PackageDependency,
  ValidationResult,
  ImportStatement,
  ExportStatement,
  FrameworkCapabilities
} from '../dna-interfaces';
import { SupportedFramework } from '../types';

/**
 * Abstract base class for framework adapters
 */
export abstract class BaseFrameworkAdapter implements FrameworkAdapter {
  public abstract readonly framework: SupportedFramework;
  public abstract readonly version: string;
  public abstract readonly capabilities: FrameworkCapabilities;

  /**
   * Generate all files for the framework
   */
  public async generateFiles(context: DNAContext, config: any): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    
    // Generate different types of files
    const configFiles = await this.generateConfigFiles(context);
    const sourceFiles = await this.generateSourceFiles(context, config);
    const testFiles = await this.generateTestFiles(context, config);
    
    files.push(...configFiles, ...sourceFiles, ...testFiles);
    
    return files;
  }

  /**
   * Generate framework-specific configuration files
   */
  public abstract generateConfigFiles(context: DNAContext): Promise<ConfigFile[]>;

  /**
   * Generate source code files
   */
  public abstract generateSourceFiles(context: DNAContext, config: any): Promise<SourceFile[]>;

  /**
   * Generate test files
   */
  public abstract generateTestFiles(context: DNAContext, config: any): Promise<TestFile[]>;

  /**
   * Get runtime dependencies
   */
  public abstract getDependencies(config: any): PackageDependency[];

  /**
   * Get development dependencies
   */
  public abstract getDevDependencies(config: any): PackageDependency[];

  /**
   * Get peer dependencies
   */
  public abstract getPeerDependencies(config: any): PackageDependency[];

  /**
   * Update build configuration
   */
  public abstract updateBuildConfig(context: DNAContext, config: any): Promise<void>;

  /**
   * Validate framework setup
   */
  public async validateSetup(context: DNAContext): Promise<ValidationResult> {
    const errors: any[] = [];
    const warnings: any[] = [];
    const suggestions: string[] = [];
    
    // Check if framework-specific files exist
    const requiredFiles = this.getRequiredFiles();
    for (const file of requiredFiles) {
      const exists = await context.fileSystem.exists(`${context.outputPath}/${file}`);
      if (!exists) {
        errors.push({
          path: file,
          message: `Required ${this.framework} file missing: ${file}`,
          code: 'MISSING_REQUIRED_FILE',
          severity: 'error' as const
        });
      }
    }
    
    // Validate dependencies
    const depValidation = await this.validateDependencies(context);
    errors.push(...depValidation.errors);
    warnings.push(...depValidation.warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      performance: {
        validationTime: Date.now(),
        complexity: this.calculateSetupComplexity(context)
      }
    };
  }

  /**
   * Add import statements to a source file
   */
  public addImports(file: SourceFile, imports: ImportStatement[]): SourceFile {
    const existingImports = new Set(file.imports.map(imp => imp.source));
    const newImports = imports.filter(imp => !existingImports.has(imp.source));
    
    return {
      ...file,
      imports: [...file.imports, ...newImports],
      content: this.updateFileContentWithImports(file.content, newImports)
    };
  }

  /**
   * Add configuration to a config file
   */
  public addConfiguration(config: ConfigFile, settings: any): ConfigFile {
    let updatedContent: string;
    
    switch (config.format) {
      case 'json':
        updatedContent = this.mergeJSONConfig(config.content, settings);
        break;
      case 'yaml':
        updatedContent = this.mergeYAMLConfig(config.content, settings);
        break;
      case 'js':
      case 'ts':
        updatedContent = this.mergeJSConfig(config.content, settings);
        break;
      default:
        updatedContent = config.content;
    }
    
    return {
      ...config,
      content: updatedContent
    };
  }

  /**
   * Apply framework-specific patterns
   */
  public async applyFrameworkPatterns(context: DNAContext): Promise<void> {
    // Base implementation - override in specific adapters
    context.logger.debug(`Applying ${this.framework} patterns to ${context.projectName}`);
  }

  /**
   * Get list of required files for this framework
   */
  protected abstract getRequiredFiles(): string[];

  /**
   * Validate framework dependencies
   */
  protected async validateDependencies(context: DNAContext): Promise<{
    errors: any[];
    warnings: any[];
  }> {
    const errors: any[] = [];
    const warnings: any[] = [];
    
    // Check package.json exists (for npm-based frameworks)
    if (['nextjs', 'react-native'].includes(this.framework)) {
      const packageJsonExists = await context.fileSystem.exists(`${context.outputPath}/package.json`);
      if (!packageJsonExists) {
        errors.push({
          path: 'package.json',
          message: 'package.json is required for this framework',
          code: 'MISSING_PACKAGE_JSON',
          severity: 'error' as const
        });
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Calculate setup complexity for performance metrics
   */
  protected calculateSetupComplexity(context: DNAContext): number {
    // Base complexity calculation
    let complexity = 1;
    
    // Add complexity based on project features
    complexity += Object.keys(context.variables).length * 0.1;
    
    // Add framework-specific complexity
    complexity += this.getFrameworkComplexity();
    
    return Math.round(complexity * 100) / 100;
  }

  /**
   * Get framework-specific complexity factor
   */
  protected abstract getFrameworkComplexity(): number;

  /**
   * Update file content with new imports
   */
  private updateFileContentWithImports(content: string, imports: ImportStatement[]): string {
    if (imports.length === 0) return content;
    
    const importStatements = imports.map(imp => {
      if (imp.default && imp.imports.length > 0) {
        return `import ${imp.default}, { ${imp.imports.join(', ')} } from '${imp.source}';`;
      } else if (imp.default) {
        return `import ${imp.default} from '${imp.source}';`;
      } else if (imp.namespace) {
        return `import * as ${imp.namespace} from '${imp.source}';`;
      } else {
        return `import { ${imp.imports.join(', ')} } from '${imp.source}';`;
      }
    }).join('\n');
    
    // Insert imports at the beginning of the file, after any existing imports
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the last import statement
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('const ') && lines[i].includes('require(')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '' && i < 10) {
        // Skip empty lines at the beginning
        continue;
      } else {
        break;
      }
    }
    
    lines.splice(insertIndex, 0, importStatements);
    return lines.join('\n');
  }

  /**
   * Merge JSON configuration
   */
  private mergeJSONConfig(existingContent: string, newSettings: any): string {
    try {
      const existing = JSON.parse(existingContent);
      const merged = { ...existing, ...newSettings };
      return JSON.stringify(merged, null, 2);
    } catch {
      return existingContent;
    }
  }

  /**
   * Merge YAML configuration
   */
  private mergeYAMLConfig(existingContent: string, newSettings: any): string {
    // Simplified YAML merging - in production, use a proper YAML library
    const newLines = Object.entries(newSettings).map(([key, value]) => {
      return `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`;
    });
    
    return `${existingContent}\n${newLines.join('\n')}`;
  }

  /**
   * Merge JavaScript/TypeScript configuration
   */
  private mergeJSConfig(existingContent: string, newSettings: any): string {
    // Simplified JS config merging - append new settings as comments
    const newLines = Object.entries(newSettings).map(([key, value]) => {
      return `// ${key}: ${JSON.stringify(value)}`;
    });
    
    return `${existingContent}\n\n// Additional configuration:\n${newLines.join('\n')}`;
  }

  /**
   * Utility method to create a basic source file
   */
  protected createSourceFile(path: string, content: string, language: string): SourceFile {
    return {
      path,
      content,
      type: 'source',
      language,
      imports: [],
      exports: [],
      overwrite: false,
      encoding: 'utf8'
    };
  }

  /**
   * Utility method to create a basic config file
   */
  protected createConfigFile(
    path: string, 
    content: string, 
    format: ConfigFile['format']
  ): ConfigFile {
    return {
      path,
      content,
      type: 'config',
      format,
      overwrite: true,
      encoding: 'utf8'
    };
  }

  /**
   * Utility method to create a basic test file
   */
  protected createTestFile(
    path: string, 
    content: string, 
    framework: string, 
    testType: TestFile['testType']
  ): TestFile {
    return {
      path,
      content,
      type: 'test',
      framework,
      testType,
      overwrite: false,
      encoding: 'utf8'
    };
  }

  /**
   * Utility method to create package dependency
   */
  protected createDependency(
    name: string, 
    version: string, 
    type: PackageDependency['type'] = 'dependency'
  ): PackageDependency {
    return { name, version, type };
  }
}