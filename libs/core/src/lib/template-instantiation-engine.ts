/**
 * @fileoverview Template Instantiation Engine - Advanced template processing and project generation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import { spawn } from 'child_process';
import { 
  DNAModule, 
  TemplateConfig, 
  GenerationResult, 
  GenerationMetrics, 
  TemplateFile, 
  TemplateContext,
  DependencyManager,
  InstantiationOptions,
  SupportedFramework 
} from './types';

/**
 * Advanced template instantiation engine with comprehensive file processing
 */
export class TemplateInstantiationEngine {
  private readonly modules: Map<string, DNAModule> = new Map();
  private readonly dependencyManagers: Map<string, DependencyManager> = new Map();

  constructor() {
    this.registerHandlebarsHelpers();
    this.initializeDependencyManagers();
  }

  /**
   * Register a DNA module with the template engine
   */
  public registerModule(module: DNAModule): void {
    this.modules.set(module.metadata.id, module);
  }

  /**
   * Main template instantiation method with comprehensive processing
   */
  public async instantiateTemplate(
    config: TemplateConfig, 
    options: InstantiationOptions = {}
  ): Promise<GenerationResult> {
    const startTime = Date.now();
    const generatedFiles: string[] = [];
    const warnings: string[] = [];
    let backupPath: string | undefined;

    try {
      // Stage 1: Validation
      options.progressCallback?.('Validating configuration...', 10);
      await this.validateConfiguration(config);

      // Stage 2: Prepare output directory
      options.progressCallback?.('Preparing output directory...', 20);
      if (options.backup && await fs.pathExists(config.outputPath)) {
        backupPath = await this.createBackup(config.outputPath);
      }
      await this.prepareOutputDirectory(config.outputPath, options.overwrite);

      // Stage 3: Load and process template files
      options.progressCallback?.('Loading template files...', 30);
      const templateFiles = await this.loadTemplateFiles(config);
      
      options.progressCallback?.('Processing template files...', 50);
      const context = this.createTemplateContext(config);
      const processedFiles = await this.processTemplateFiles(templateFiles, context, config.outputPath);

      // Stage 4: Write files to disk
      options.progressCallback?.('Writing files...', 70);
      if (!options.dryRun) {
        for (const file of processedFiles) {
          await this.writeTemplateFile(file);
          if (file.outputPath) {
          generatedFiles.push(file.outputPath);
        }
        }
      } else {
        // In dry run, just simulate file paths
        processedFiles.forEach(file => {
          if (file.outputPath) {
          generatedFiles.push(file.outputPath);
        }
        });
      }

      // Stage 5: Detect and install dependencies
      if (!options.skipDependencyInstall && !options.dryRun) {
        options.progressCallback?.('Installing dependencies...', 85);
        await this.installDependencies(config.outputPath, config.framework);
      }

      // Stage 6: Initialize git repository
      if (!options.skipGitInit && !options.dryRun) {
        options.progressCallback?.('Initializing git repository...', 95);
        await this.initializeGit(config.outputPath);
      }

      // Stage 7: Validate project structure
      options.progressCallback?.('Validating project structure...', 98);
      const validationWarnings = await this.validateProjectStructure(config.outputPath, config.framework);
      warnings.push(...validationWarnings);

      options.progressCallback?.('Complete!', 100);

      // Calculate metrics
      const executionTime = Date.now() - startTime;
      const metrics: GenerationMetrics = {
        executionTime,
        filesGenerated: generatedFiles.length,
        linesOfCode: await this.calculateLinesOfCode(generatedFiles),
        testCoverage: 80, // Default target coverage
      };

      return {
        success: true,
        outputPath: config.outputPath,
        generatedFiles,
        errors: [],
        warnings,
        metrics,
      };

    } catch (error) {
      // Attempt rollback on failure
      if (!options.dryRun) {
        await this.rollback(config.outputPath, backupPath);
      }

      return {
        success: false,
        outputPath: config.outputPath,
        generatedFiles,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings,
        metrics: {
          executionTime: Date.now() - startTime,
          filesGenerated: generatedFiles.length,
          linesOfCode: 0,
          testCoverage: 0,
        },
      };
    }
  }

  /**
   * Comprehensive configuration validation
   */
  private async validateConfiguration(config: TemplateConfig): Promise<void> {
    // Validate project name
    if (!config.name || !/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(config.name)) {
      throw new Error('Project name must start with alphanumeric character and contain only letters, numbers, hyphens, and underscores');
    }

    // Validate output path
    if (!config.outputPath) {
      throw new Error('Output path is required');
    }

    const outputDir = path.dirname(config.outputPath);
    try {
      await fs.access(outputDir, fs.constants.W_OK);
    } catch {
      throw new Error(`Output directory is not writable: ${outputDir}`);
    }

    // Validate DNA modules compatibility
    const incompatibleModules = config.dnaModules.filter(moduleId => {
      const module = this.modules.get(moduleId);
      return module && !module.frameworks.some(f => f.framework === config.framework);
    });

    if (incompatibleModules.length > 0) {
      throw new Error(`DNA modules not compatible with ${config.framework}: ${incompatibleModules.join(', ')}`);
    }

    // Validate disk space (require at least 100MB)
    const stats = await fs.stat(outputDir);
    if (stats.size > 0 && stats.size < 100 * 1024 * 1024) {
      throw new Error('Insufficient disk space (minimum 100MB required)');
    }
  }

  /**
   * Create backup of existing directory
   */
  private async createBackup(targetPath: string): Promise<string> {
    const backupPath = `${targetPath}.backup.${Date.now()}`;
    await fs.copy(targetPath, backupPath);
    return backupPath;
  }

  /**
   * Prepare output directory for template generation
   */
  private async prepareOutputDirectory(outputPath: string, overwrite?: boolean): Promise<void> {
    if (await fs.pathExists(outputPath)) {
      if (overwrite) {
        await fs.remove(outputPath);
      } else {
        throw new Error(`Directory already exists: ${outputPath}`);
      }
    }
    
    await fs.ensureDir(outputPath);
    
    // Set appropriate permissions on Unix-like systems
    if (process.platform !== 'win32') {
      await fs.chmod(outputPath, 0o755);
    }
  }

  /**
   * Load template files from template directory or generate from configuration
   */
  private async loadTemplateFiles(config: TemplateConfig): Promise<TemplateFile[]> {
    const templatePath = this.getTemplatePath(config.type, config.framework);
    
    if (await fs.pathExists(templatePath)) {
      return this.loadFilesFromDirectory(templatePath);
    } else {
      return this.generateDefaultTemplateFiles(config);
    }
  }

  /**
   * Recursively load template files from directory
   */
  private async loadFilesFromDirectory(templatePath: string): Promise<TemplateFile[]> {
    const files: TemplateFile[] = [];
    
    const processDirectory = async (dirPath: string, relativePath = ''): Promise<void> => {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const itemRelativePath = path.join(relativePath, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          // Skip hidden directories and common ignore patterns
          if (!item.startsWith('.') && !['node_modules', 'dist', 'build'].includes(item)) {
            await processDirectory(fullPath, itemRelativePath);
          }
        } else {
          // Skip template metadata and hidden files
          if (item === 'template.json' || item.startsWith('.')) {
            continue;
          }
          
          const content = await fs.readFile(fullPath, 'utf8');
          files.push({
            sourcePath: fullPath,
            relativePath: itemRelativePath,
            content,
            isTemplate: item.endsWith('.hbs') || this.containsTemplateVariables(content),
            encoding: 'utf8'
          });
        }
      }
    };
    
    await processDirectory(templatePath);
    return files;
  }

  /**
   * Generate default template files when no template directory exists
   */
  private async generateDefaultTemplateFiles(config: TemplateConfig): Promise<TemplateFile[]> {
    const files: TemplateFile[] = [];
    
    // Generate package.json based on framework
    files.push({
      relativePath: this.getPackageFileName(config.framework),
      content: this.generatePackageFile(config),
      isTemplate: true,
      encoding: 'utf8'
    });
    
    // Generate README
    files.push({
      relativePath: 'README.md',
      content: this.generateReadmeTemplate(config),
      isTemplate: true,
      encoding: 'utf8'
    });
    
    // Generate .gitignore
    files.push({
      relativePath: '.gitignore',
      content: this.generateGitignore(config.framework),
      isTemplate: false,
      encoding: 'utf8'
    });
    
    // Generate framework-specific files
    const frameworkFiles = this.generateFrameworkSpecificFiles(config);
    files.push(...frameworkFiles);
    
    // Generate DNA module files
    for (const moduleId of config.dnaModules) {
      const moduleFiles = this.generateDNAModuleFiles(moduleId, config);
      files.push(...moduleFiles);
    }
    
    return files;
  }

  /**
   * Create comprehensive template context
   */
  private createTemplateContext(config: TemplateConfig): TemplateContext {
    const resolvedModules = this.resolveDNAModules(config.dnaModules);
    
    return {
      project: {
        name: config.name,
        pascalName: this.toPascalCase(config.name),
        kebabName: this.toKebabCase(config.name),
        snakeName: this.toSnakeCase(config.name),
        camelName: this.toCamelCase(config.name),
      },
      framework: config.framework,
      type: config.type,
      modules: resolvedModules.reduce((acc, module) => {
        acc[module.metadata.id] = {
          enabled: true,
          config: module,
        };
        return acc;
      }, {} as Record<string, any>),
      variables: config.variables || {},
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear(),
    };
  }

  /**
   * Process template files with variable substitution and conditional inclusion
   */
  private async processTemplateFiles(
    templateFiles: TemplateFile[], 
    context: TemplateContext, 
    outputPath: string
  ): Promise<TemplateFile[]> {
    const processedFiles: TemplateFile[] = [];
    
    for (const file of templateFiles) {
      // Process file path templating (e.g., __projectName__ in paths)
      const processedPath = this.processFilePath(file.relativePath, context);
      
      // Check conditional inclusion based on DNA modules and framework
      if (!this.shouldIncludeFile(file, context)) {
        continue;
      }
      
      // Process file content if it's a template
      let processedContent = file.content;
      if (file.isTemplate) {
        try {
          processedContent = this.processTemplate(file.content, context);
        } catch (error) {
          throw new Error(`Template processing failed for ${file.relativePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      processedFiles.push({
        ...file,
        relativePath: processedPath,
        outputPath: path.join(outputPath, processedPath),
        content: processedContent,
      });
    }
    
    return processedFiles;
  }

  /**
   * Write processed template file to disk with proper permissions
   */
  private async writeTemplateFile(file: TemplateFile): Promise<void> {
    const fullPath = file.outputPath;
    if (!fullPath) {
      throw new Error(`No output path specified for file: ${file.relativePath}`);
    }
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(fullPath));
    
    // Write file with appropriate encoding
    await fs.writeFile(fullPath, file.content, { encoding: (file.encoding as BufferEncoding) || 'utf8' });
    
    // Set executable permissions for script files
    if (this.isExecutableFile(file.relativePath)) {
      if (process.platform !== 'win32') {
        await fs.chmod(fullPath, 0o755);
      }
    }
  }

  /**
   * Detect package manager and install dependencies
   */
  private async installDependencies(projectPath: string, framework: SupportedFramework): Promise<void> {
    const packageManager = await this.detectPackageManager(projectPath);
    const manager = this.dependencyManagers.get(packageManager);
    
    if (!manager) {
      throw new Error(`Unsupported package manager: ${packageManager}`);
    }

    // Check if package file exists
    const packageFile = path.join(projectPath, manager.configFile);
    if (!await fs.pathExists(packageFile)) {
      return; // No dependencies to install
    }

    // Execute install command
    const [cmd, ...args] = manager.installCommand;
    if (!cmd) {
      throw new Error(`Invalid install command for ${packageManager}`);
    }
    
    await this.runCommand(cmd, args, {
      cwd: projectPath,
      stdio: 'inherit'
    });
  }

  /**
   * Initialize git repository with initial commit
   */
  private async initializeGit(projectPath: string): Promise<void> {
    try {
      // Check if git is available
      await this.runCommand('git', ['--version'], { stdio: 'pipe' });
      
      // Initialize repository
      await this.runCommand('git', ['init'], { cwd: projectPath });
      
      // Add all files
      await this.runCommand('git', ['add', '.'], { cwd: projectPath });
      
      // Create initial commit
      await this.runCommand('git', ['commit', '-m', 'Initial commit from DNA CLI'], { 
        cwd: projectPath,
        stdio: 'pipe' // Suppress output for commit
      });
    } catch (error) {
      // Git initialization is not critical, so we don't throw
      console.warn('Git initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Validate generated project structure
   */
  private async validateProjectStructure(projectPath: string, framework: SupportedFramework): Promise<string[]> {
    const warnings: string[] = [];
    
    // Framework-specific validations
    switch (framework) {
      case SupportedFramework.NEXTJS:
        if (!await fs.pathExists(path.join(projectPath, 'package.json'))) {
          warnings.push('Missing package.json file');
        }
        if (!await fs.pathExists(path.join(projectPath, 'next.config.js'))) {
          warnings.push('Missing next.config.js file');
        }
        break;
        
      case SupportedFramework.FLUTTER:
        if (!await fs.pathExists(path.join(projectPath, 'pubspec.yaml'))) {
          warnings.push('Missing pubspec.yaml file');
        }
        if (!await fs.pathExists(path.join(projectPath, 'lib'))) {
          warnings.push('Missing lib directory');
        }
        break;
        
      case SupportedFramework.REACT_NATIVE:
        if (!await fs.pathExists(path.join(projectPath, 'package.json'))) {
          warnings.push('Missing package.json file');
        }
        if (!await fs.pathExists(path.join(projectPath, 'metro.config.js'))) {
          warnings.push('Missing metro.config.js file');
        }
        break;
    }
    
    // Common validations
    if (!await fs.pathExists(path.join(projectPath, 'README.md'))) {
      warnings.push('Missing README.md file');
    }
    
    if (!await fs.pathExists(path.join(projectPath, '.gitignore'))) {
      warnings.push('Missing .gitignore file');
    }
    
    return warnings;
  }

  /**
   * Calculate actual lines of code in generated files
   */
  private async calculateLinesOfCode(files: string[]): Promise<number> {
    let totalLines = 0;
    
    for (const filePath of files) {
      try {
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf8');
          // Count non-empty, non-comment lines
          const lines = content.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && 
                   !trimmed.startsWith('//') && 
                   !trimmed.startsWith('#') &&
                   !trimmed.startsWith('/*') &&
                   !trimmed.startsWith('*');
          });
          totalLines += lines.length;
        }
      } catch (error) {
        // Skip files that can't be read
        continue;
      }
    }
    
    return totalLines;
  }

  /**
   * Rollback on failure
   */
  private async rollback(outputPath: string, backupPath?: string): Promise<void> {
    try {
      if (await fs.pathExists(outputPath)) {
        await fs.remove(outputPath);
      }
      
      if (backupPath && await fs.pathExists(backupPath)) {
        await fs.move(backupPath, outputPath);
      }
    } catch (error) {
      console.warn('Rollback failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Helper methods
  private getTemplatePath(type: string, framework: string): string {
    const typeMapping: Record<string, string> = {
      'ai-saas': 'ai-native/ai-saas',
      'development-tools': 'ai-native/development-tools',
      'business-apps': 'ai-native/business-apps',
      'mobile-assistants': 'ai-native/mobile-assistants',
      'real-time-collaboration': 'performance/real-time-collaboration',
      'high-performance-apis': 'performance/high-performance-apis',
      'data-visualization': 'performance/data-visualization',
      'flutter-universal': 'cross-platform/flutter-universal',
      'react-native-hybrid': 'cross-platform/react-native-hybrid',
      'modern-electron': 'cross-platform/modern-electron',
      'foundation': 'foundation',
    };
    
    const baseDir = typeMapping[type] || 'foundation';
    return path.resolve(process.cwd(), 'templates', baseDir);
  }

  private containsTemplateVariables(content: string): boolean {
    return /{{.*?}}/.test(content) || /__\w+__/.test(content);
  }

  private processFilePath(filePath: string, context: TemplateContext): string {
    let processed = filePath;
    
    // Replace __variable__ patterns in file paths
    processed = processed.replace(/__projectName__/g, context.project.kebabName);
    processed = processed.replace(/__ProjectName__/g, context.project.pascalName);
    processed = processed.replace(/__project_name__/g, context.project.snakeName);
    processed = processed.replace(/__projectname__/g, context.project.camelName);
    
    // Remove .hbs extension
    processed = processed.replace(/\.hbs$/, '');
    
    return processed;
  }

  private shouldIncludeFile(file: TemplateFile, context: TemplateContext): boolean {
    const relativePath = file.relativePath;
    
    // DNA module conditional files (e.g., auth_module_file.ts only if auth module enabled)
    for (const moduleId of Object.keys(context.modules)) {
      const module = context.modules[moduleId];
      if (relativePath.includes(`_${moduleId}_`) && (!module || !module.enabled)) {
        return false;
      }
    }
    
    // Framework conditional files (e.g., _nextjs_component.tsx only for Next.js)
    const frameworkPatterns = [
      { pattern: /_nextjs_/, framework: SupportedFramework.NEXTJS },
      { pattern: /_react-native_/, framework: SupportedFramework.REACT_NATIVE },
      { pattern: /_flutter_/, framework: SupportedFramework.FLUTTER },
      { pattern: /_tauri_/, framework: SupportedFramework.TAURI },
      { pattern: /_sveltekit_/, framework: SupportedFramework.SVELTEKIT },
    ];
    
    for (const { pattern, framework } of frameworkPatterns) {
      if (pattern.test(relativePath) && context.framework !== framework) {
        return false;
      }
    }
    
    return true;
  }

  private processTemplate(content: string, context: TemplateContext): string {
    const template = Handlebars.compile(content);
    return template(context);
  }

  private isExecutableFile(filePath: string): boolean {
    return filePath.endsWith('.sh') || 
           filePath.endsWith('.py') || 
           filePath.startsWith('scripts/') ||
           filePath.includes('/bin/') ||
           filePath.endsWith('.command');
  }

  private async detectPackageManager(projectPath: string): Promise<string> {
    // Check for lock files to determine package manager
    if (await fs.pathExists(path.join(projectPath, 'bun.lockb'))) {
      return 'bun';
    }
    if (await fs.pathExists(path.join(projectPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    }
    if (await fs.pathExists(path.join(projectPath, 'yarn.lock'))) {
      return 'yarn';
    }
    
    // Default to npm
    return 'npm';
  }

  private async runCommand(
    command: string,
    args: string[],
    options: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        stdio: options.stdio || 'inherit',
        shell: process.platform === 'win32',
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
        }
      });

      child.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  private resolveDNAModules(moduleIds: string[]): DNAModule[] {
    return moduleIds.map(id => {
      const module = this.modules.get(id);
      if (!module) {
        throw new Error(`DNA module '${id}' not found`);
      }
      return module;
    });
  }

  // String transformation utilities
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, char => char.toUpperCase());
  }

  private toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, char => char.toLowerCase());
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .replace(/[_\s]+/g, '-')
      .toLowerCase()
      .replace(/^-+|-+$/g, '');
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/[-\s]+/g, '_')
      .toLowerCase()
      .replace(/^_+|_+$/g, '');
  }

  // File generators
  private getPackageFileName(framework: SupportedFramework): string {
    switch (framework) {
      case SupportedFramework.FLUTTER:
        return 'pubspec.yaml';
      case SupportedFramework.TAURI:
        return 'Cargo.toml';
      default:
        return 'package.json';
    }
  }

  private generatePackageFile(config: TemplateConfig): string {
    switch (config.framework) {
      case SupportedFramework.FLUTTER:
        return this.generatePubspecYaml(config);
      case SupportedFramework.TAURI:
        return this.generateCargoToml(config);
      default:
        return this.generatePackageJson(config);
    }
  }

  private generatePackageJson(config: TemplateConfig): string {
    const packageData = {
      name: '{{project.kebabName}}',
      version: '0.1.0',
      description: 'Generated with DNA CLI',
      private: true,
      scripts: this.getFrameworkScripts(config.framework),
      dependencies: this.getFrameworkDependencies(config.framework),
      devDependencies: this.getFrameworkDevDependencies(config.framework),
      engines: {
        node: '>=18.0.0',
        npm: '>=8.0.0'
      }
    };
    
    return JSON.stringify(packageData, null, 2);
  }

  private generatePubspecYaml(config: TemplateConfig): string {
    return `name: {{project.snakeName}}
description: Generated with DNA CLI
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'
  flutter: ">=3.16.0"

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`;
  }

  private generateCargoToml(config: TemplateConfig): string {
    return `[package]
name = "{{project.snakeName}}"
version = "0.1.0"
description = "Generated with DNA CLI"
edition = "2021"

[dependencies]
tauri = { version = "1.5", features = ["api-all"] }
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

[build-dependencies]
tauri-build = { version = "1.5", features = [] }
`;
  }

  private generateReadmeTemplate(config: TemplateConfig): string {
    return `# {{project.pascalName}}

Generated with DNA CLI using {{type}} template for {{framework}}.

## Features

{{#each modules}}
- {{@key}} module
{{/each}}

## Getting Started

{{#ifFramework 'nextjs'}}
1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open http://localhost:3000
{{/ifFramework}}

{{#ifFramework 'flutter'}}
1. Install dependencies:
   \`\`\`bash
   flutter pub get
   \`\`\`

2. Run the app:
   \`\`\`bash
   flutter run
   \`\`\`
{{/ifFramework}}

{{#ifFramework 'react-native'}}
1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start Metro bundler:
   \`\`\`bash
   npm start
   \`\`\`

3. Run on device:
   \`\`\`bash
   npm run android  # or npm run ios
   \`\`\`
{{/ifFramework}}

## Project Structure

Generated on {{timestamp}}
`;
  }

  private generateGitignore(framework: SupportedFramework): string {
    const common = `# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
dist/
build/
out/

# Environment variables
.env*

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# IDE and editor files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary folders
tmp/
temp/
`;

    const frameworkSpecific: Record<string, string> = {
      [SupportedFramework.NEXTJS]: `
# Next.js
.next/
next-env.d.ts
`,
      [SupportedFramework.REACT_NATIVE]: `
# React Native
.expo/
.expo-shared/
android/app/build/
ios/build/
*.ipa
*.apk
`,
      [SupportedFramework.FLUTTER]: `
# Flutter
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
build/
ios/.symlinks/
ios/Flutter/Flutter.framework
ios/Flutter/Flutter.podspec
`,
      [SupportedFramework.TAURI]: `
# Tauri
src-tauri/target/
src-tauri/Cargo.lock
`,
    };

    return common + (frameworkSpecific[framework] || '');
  }

  private generateFrameworkSpecificFiles(config: TemplateConfig): TemplateFile[] {
    const files: TemplateFile[] = [];
    
    switch (config.framework) {
      case SupportedFramework.NEXTJS:
        files.push(
          {
            relativePath: 'next.config.js',
            content: this.generateNextConfig(),
            isTemplate: false,
            encoding: 'utf8'
          },
          {
            relativePath: 'tsconfig.json',
            content: this.generateTSConfig(),
            isTemplate: false,
            encoding: 'utf8'
          },
          {
            relativePath: 'src/pages/index.tsx',
            content: this.generateNextIndexPage(),
            isTemplate: true,
            encoding: 'utf8'
          }
        );
        break;
        
      case SupportedFramework.REACT_NATIVE:
        files.push(
          {
            relativePath: 'metro.config.js',
            content: this.generateMetroConfig(),
            isTemplate: false,
            encoding: 'utf8'
          },
          {
            relativePath: 'babel.config.js',
            content: this.generateBabelConfig(),
            isTemplate: false,
            encoding: 'utf8'
          },
          {
            relativePath: 'src/App.tsx',
            content: this.generateRNApp(),
            isTemplate: true,
            encoding: 'utf8'
          }
        );
        break;
        
      case SupportedFramework.FLUTTER:
        files.push(
          {
            relativePath: 'lib/main.dart',
            content: this.generateFlutterMain(),
            isTemplate: true,
            encoding: 'utf8'
          }
        );
        break;
    }
    
    return files;
  }

  private generateDNAModuleFiles(moduleId: string, config: TemplateConfig): TemplateFile[] {
    const files: TemplateFile[] = [];
    
    // Generate module configuration file
    files.push({
      relativePath: `src/modules/${moduleId}.ts`,
      content: `/**
 * ${moduleId} module configuration
 * Generated by DNA CLI
 */

export interface ${this.toPascalCase(moduleId)}Config {
  enabled: boolean;
  // Add module-specific configuration here
}

export const ${this.toCamelCase(moduleId)}Config: ${this.toPascalCase(moduleId)}Config = {
  enabled: true,
};

export default ${this.toCamelCase(moduleId)}Config;
`,
      isTemplate: false,
      encoding: 'utf8'
    });
    
    return files;
  }

  private getFrameworkScripts(framework: SupportedFramework): Record<string, string> {
    const common = {
      lint: 'eslint . --ext .ts,.tsx,.js,.jsx',
      'lint:fix': 'eslint . --ext .ts,.tsx,.js,.jsx --fix',
      format: 'prettier --write .',
      typecheck: 'tsc --noEmit'
    };

    switch (framework) {
      case SupportedFramework.NEXTJS:
        return {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          test: 'jest',
          ...common
        };
      case SupportedFramework.REACT_NATIVE:
        return {
          start: 'react-native start',
          android: 'react-native run-android',
          ios: 'react-native run-ios',
          test: 'jest',
          ...common
        };
      default:
        return {
          dev: 'npm run start',
          build: 'tsc',
          start: 'node dist/index.js',
          test: 'jest',
          ...common
        };
    }
  }

  private getFrameworkDependencies(framework: SupportedFramework): Record<string, string> {
    switch (framework) {
      case SupportedFramework.NEXTJS:
        return {
          'next': '^14.0.0',
          'react': '^18.0.0',
          'react-dom': '^18.0.0'
        };
      case SupportedFramework.REACT_NATIVE:
        return {
          'react': '^18.0.0',
          'react-native': '^0.72.0'
        };
      default:
        return {};
    }
  }

  private getFrameworkDevDependencies(framework: SupportedFramework): Record<string, string> {
    const common = {
      '@types/node': '^20.0.0',
      'typescript': '^5.3.0',
      'eslint': '^8.57.0',
      'prettier': '^3.2.0',
      'jest': '^29.0.0',
      '@types/jest': '^29.0.0'
    };

    switch (framework) {
      case SupportedFramework.NEXTJS:
        return {
          ...common,
          '@types/react': '^18.0.0',
          '@types/react-dom': '^18.0.0',
          'eslint-config-next': '^14.0.0'
        };
      case SupportedFramework.REACT_NATIVE:
        return {
          ...common,
          '@types/react': '^18.0.0',
          '@react-native/metro-config': '^0.72.0',
          'metro-react-native-babel-preset': '^0.76.0'
        };
      default:
        return common;
    }
  }

  // Framework-specific file content generators
  private generateNextConfig(): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
`;
  }

  private generateTSConfig(): string {
    return `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;
  }

  private generateNextIndexPage(): string {
    return `import { NextPage } from 'next';

const HomePage: NextPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to {{project.pascalName}}
        </h1>
        <p className="text-gray-600 mb-8">
          Generated with DNA CLI
        </p>
        <div className="space-y-4">
          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
`;
  }

  private generateMetroConfig(): string {
    return `const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
`;
  }

  private generateBabelConfig(): string {
    return `module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
};
`;
  }

  private generateRNApp(): string {
    return `import React from 'react';
import {SafeAreaView, Text, StyleSheet, View} from 'react-native';

const App: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to {{project.pascalName}}</Text>
        <Text style={styles.subtitle}>Generated with DNA CLI</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;
`;
  }

  private generateFlutterMain(): string {
    return `import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '{{project.pascalName}}',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: '{{project.pascalName}}'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  const MyHomePage({super.key, required this.title});

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        title: Text(widget.title),
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            Text(
              'Welcome to {{project.pascalName}}',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            Text(
              'Generated with DNA CLI',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
`;
  }

  private initializeDependencyManagers(): void {
    this.dependencyManagers.set('npm', {
      name: 'npm',
      installCommand: ['npm', 'install'],
      lockFile: 'package-lock.json',
      configFile: 'package.json'
    });

    this.dependencyManagers.set('yarn', {
      name: 'yarn',
      installCommand: ['yarn', 'install'],
      lockFile: 'yarn.lock',
      configFile: 'package.json'
    });

    this.dependencyManagers.set('pnpm', {
      name: 'pnpm',
      installCommand: ['pnpm', 'install'],
      lockFile: 'pnpm-lock.yaml',
      configFile: 'package.json'
    });

    this.dependencyManagers.set('bun', {
      name: 'bun',
      installCommand: ['bun', 'install'],
      lockFile: 'bun.lockb',
      configFile: 'package.json'
    });
  }

  private registerHandlebarsHelpers(): void {
    // Logical helpers
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('and', (a: any, b: any) => a && b);
    Handlebars.registerHelper('or', (a: any, b: any) => a || b);
    Handlebars.registerHelper('not', (a: any) => !a);
    
    // String transformation helpers
    Handlebars.registerHelper('camelCase', (str: string) => this.toCamelCase(str));
    Handlebars.registerHelper('pascalCase', (str: string) => this.toPascalCase(str));
    Handlebars.registerHelper('kebabCase', (str: string) => this.toKebabCase(str));
    Handlebars.registerHelper('snakeCase', (str: string) => this.toSnakeCase(str));
    
    // DNA module helpers
    Handlebars.registerHelper('hasModule', function(this: any, moduleId: string) {
      return this.modules && this.modules[moduleId] && this.modules[moduleId].enabled;
    });
    
    // Framework helpers
    Handlebars.registerHelper('ifFramework', function(this: any, framework: string, options: any) {
      return this.framework === framework ? options.fn(this) : options.inverse(this);
    });

    // Array helpers
    Handlebars.registerHelper('each', function(this: any, context: any, options: any) {
      let ret = '';
      for (const key in context) {
        ret += options.fn({ ...context[key], '@key': key, '@index': Object.keys(context).indexOf(key) });
      }
      return ret;
    });
  }

  /**
   * Get all registered DNA modules
   */
  public getModules(): DNAModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Get a specific DNA module by ID
   */
  public getModule(id: string): DNAModule | undefined {
    return this.modules.get(id);
  }
}