/**
 * @fileoverview Project Generator - Creates projects from templates
 */

import fs from 'fs-extra';
import path from 'path';
import { spawn } from 'child_process';
import Handlebars from 'handlebars';
import { TemplateInstantiationEngine, TemplateType, SupportedFramework } from '@dna/core';
import { ProjectConfig, GenerationOptions } from '../types/cli';
import { ProgressTracker } from './progress-tracker';
import { TemplateRegistry } from './template-registry';
import { logger } from '../utils/logger';
import { createCLIError } from '../utils/error-handler';

export class ProjectGenerator {
  private config: ProjectConfig;
  private options: GenerationOptions;
  private progressTracker: ProgressTracker;
  private templateEngine: TemplateInstantiationEngine;
  private registry: TemplateRegistry;
  private backupPath?: string;

  constructor(
    config: ProjectConfig,
    options: GenerationOptions,
    progressTracker: ProgressTracker
  ) {
    this.config = config;
    this.options = options;
    this.progressTracker = progressTracker;
    this.templateEngine = new TemplateInstantiationEngine();
    this.registry = new TemplateRegistry();
  }

  async validateConfiguration(): Promise<void> {
    await this.registry.load();
    
    const template = this.registry.getTemplate(this.config.template);
    if (!template) {
      throw createCLIError(
        `Template "${this.config.template}" not found`,
        'TEMPLATE_NOT_FOUND'
      );
    }

    // Validate DNA modules compatibility
    const incompatibleModules = this.config.dnaModules.filter(
      moduleId => !template.dnaModules.includes(moduleId)
    );

    if (incompatibleModules.length > 0) {
      logger.warn(`Some DNA modules may not be compatible with this template: ${incompatibleModules.join(', ')}`);
    }

    // Check system requirements
    await this.validateSystemRequirements(template);
  }

  private async validateSystemRequirements(template: any): Promise<void> {
    // Check Node.js version if required
    if (template.requirements?.node) {
      const nodeVersion = process.version;
      logger.debug(`Node.js version: ${nodeVersion}, required: ${template.requirements.node}`);
      // Note: In a real implementation, you'd use semver to validate
    }

    // Check available disk space
    const stats = await fs.stat(path.dirname(this.config.path));
    const availableSpace = stats.size || 0;
    const requiredSpace = 500 * 1024 * 1024; // 500MB minimum

    if (availableSpace > 0 && availableSpace < requiredSpace) {
      throw createCLIError(
        'Insufficient disk space for template generation',
        'INSUFFICIENT_DISK_SPACE',
        'Please free up disk space and try again'
      );
    }
  }

  async prepareDirectory(): Promise<void> {
    if (this.options.dryRun) {
      logger.debug(`[DRY RUN] Would prepare directory: ${this.config.path}`);
      return;
    }

    // Create backup if directory exists and we're overwriting
    if (await fs.pathExists(this.config.path) && this.options.overwrite) {
      if (this.options.backup) {
        this.backupPath = `${this.config.path}.backup.${Date.now()}`;
        await fs.copy(this.config.path, this.backupPath);
        logger.debug(`Created backup at: ${this.backupPath}`);
      }
      
      await fs.remove(this.config.path);
    }

    // Create project directory
    await fs.ensureDir(this.config.path);
    
    // Set appropriate permissions
    if (process.platform !== 'win32') {
      await fs.chmod(this.config.path, 0o755);
    }
  }

  async generateFiles(): Promise<void> {
    // Use the new TemplateInstantiationEngine for all file generation
    const template = this.registry.getTemplate(this.config.template)!;
    
    const templateConfig = {
      name: this.config.name,
      type: template.type as TemplateType,
      framework: this.config.framework as SupportedFramework,
      dnaModules: this.config.dnaModules,
      outputPath: this.config.path,
      variables: this.config.variables
    };

    const instantiationOptions = {
      skipDependencyInstall: true, // We handle this separately
      skipGitInit: true, // We handle this separately
      dryRun: this.options.dryRun,
      overwrite: this.options.overwrite,
      backup: this.options.backup,
      progressCallback: (stage: string, progress: number) => {
        // Update progress within the generation stage (30-70% range)
        const adjustedProgress = 30 + (progress * 0.4);
        // Note: We could enhance ProgressTracker to support substages
      }
    };

    const result = await this.templateEngine.instantiateTemplate(templateConfig, instantiationOptions);
    
    if (!result.success) {
      throw new Error(`Template generation failed: ${result.errors.join(', ')}`);
    }
  }

  private getTemplatePath(template: any): string {
    // In a real implementation, this would resolve the actual template path
    return path.resolve(process.cwd(), 'templates', template.type.toLowerCase(), template.id);
  }

  private async generateFromTemplate(template: any): Promise<void> {
    if (this.options.dryRun) {
      logger.debug(`[DRY RUN] Would generate from template: ${template.name}`);
      return;
    }

    // Generate basic project structure based on template metadata
    const files = await this.generateTemplateFiles(template);
    
    for (const [filePath, content] of files) {
      const fullPath = path.join(this.config.path, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
      
      // Set executable permissions for scripts
      if (filePath.endsWith('.sh') || filePath.startsWith('scripts/')) {
        if (process.platform !== 'win32') {
          await fs.chmod(fullPath, 0o755);
        }
      }
    }
  }

  private async generateTemplateFiles(template: any): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    const variables = this.config.variables;

    // Generate package.json
    const packageJson = {
      name: this.config.name,
      version: '0.1.0',
      description: `Generated with DNA CLI using ${template.name} template`,
      private: true,
      scripts: {
        dev: this.getDevScript(template.framework),
        build: this.getBuildScript(template.framework),
        start: this.getStartScript(template.framework),
        test: 'jest',
        lint: 'eslint . --ext .ts,.tsx,.js,.jsx',
        'lint:fix': 'eslint . --ext .ts,.tsx,.js,.jsx --fix',
        format: 'prettier --write .',
        typecheck: 'tsc --noEmit',
      },
      dependencies: this.getFrameworkDependencies(template.framework),
      devDependencies: this.getDevDependencies(template.framework),
      engines: {
        node: '>=18.0.0',
        npm: '>=8.0.0',
      },
    };

    files.set('package.json', JSON.stringify(packageJson, null, 2));

    // Generate README.md
    const readmeContent = this.generateReadme(template, variables);
    files.set('README.md', readmeContent);

    // Generate .gitignore
    const gitignoreContent = this.generateGitignore(template.framework);
    files.set('.gitignore', gitignoreContent);

    // Generate framework-specific files
    const frameworkFiles = await this.generateFrameworkFiles(template);
    frameworkFiles.forEach((content, filePath) => {
      files.set(filePath, content);
    });

    // Generate DNA module files
    for (const moduleId of this.config.dnaModules) {
      const moduleFiles = await this.generateDNAModuleFiles(moduleId, template.framework);
      moduleFiles.forEach((content, filePath) => {
        files.set(filePath, content);
      });
    }

    return files;
  }

  private async copyAndProcessTemplate(templatePath: string): Promise<void> {
    if (this.options.dryRun) {
      logger.debug(`[DRY RUN] Would copy template from: ${templatePath}`);
      return;
    }

    // Copy template files with variable replacement
    await this.copyTemplateRecursive(templatePath, this.config.path);
  }

  private async copyTemplateRecursive(sourcePath: string, targetPath: string): Promise<void> {
    const items = await fs.readdir(sourcePath);

    for (const item of items) {
      const sourceItemPath = path.join(sourcePath, item);
      const targetItemPath = path.join(targetPath, item);
      const stat = await fs.stat(sourceItemPath);

      if (stat.isDirectory()) {
        await fs.ensureDir(targetItemPath);
        await this.copyTemplateRecursive(sourceItemPath, targetItemPath);
      } else {
        // Process file through Handlebars if it's a template
        let content: string;
        
        if (item.endsWith('.hbs')) {
          // Template file - process with Handlebars
          const templateContent = await fs.readFile(sourceItemPath, 'utf8');
          const template = Handlebars.compile(templateContent);
          content = template(this.config.variables);
          
          // Remove .hbs extension from target file
          const finalTargetPath = targetItemPath.replace(/\.hbs$/, '');
          await fs.writeFile(finalTargetPath, content);
        } else {
          // Regular file - copy as-is
          await fs.copy(sourceItemPath, targetItemPath);
        }
      }
    }
  }

  async installDependencies(): Promise<void> {
    if (this.options.dryRun) {
      logger.debug(`[DRY RUN] Would install dependencies using ${this.config.packageManager}`);
      return;
    }

    const packageManager = this.config.packageManager || 'npm';
    const installCommand = this.getInstallCommand(packageManager);
    const [cmd, ...cmdArgs] = installCommand;

    const cwd = this.config.path;
    if (!cwd) {
      throw new Error('Project path is not defined');
    }
    
    if (!cmd) {
      throw new Error('Install command is not defined');
    }
    
    await this.runCommand(cmd, cmdArgs, {
      cwd,
      stdio: this.options.progress ? 'pipe' : 'inherit',
    });
  }

  async initializeGit(): Promise<void> {
    if (this.options.dryRun) {
      logger.debug('[DRY RUN] Would initialize git repository');
      return;
    }

    // Initialize git repository
    await this.runCommand('git', ['init'], { cwd: this.config.path });
    
    // Add all files
    await this.runCommand('git', ['add', '.'], { cwd: this.config.path });
    
    // Create initial commit
    await this.runCommand('git', ['commit', '-m', 'Initial commit from DNA CLI'], { 
      cwd: this.config.path 
    });
  }

  async finalize(): Promise<void> {
    if (this.options.dryRun) {
      logger.debug('[DRY RUN] Would finalize project setup');
      return;
    }

    // Generate project configuration file
    const dnaConfig = {
      template: this.config.template,
      framework: this.config.framework,
      modules: this.config.dnaModules,
      generated: new Date().toISOString(),
      version: '0.1.0',
    };

    const configPath = path.join(this.config.path, 'dna.config.json');
    await fs.writeJSON(configPath, dnaConfig, { spaces: 2 });

    // Clean up temporary files
    await this.cleanupTempFiles();
  }

  async rollback(): Promise<void> {
    try {
      // Remove created directory if it exists
      if (await fs.pathExists(this.config.path)) {
        await fs.remove(this.config.path);
      }

      // Restore backup if it exists
      if (this.backupPath && await fs.pathExists(this.backupPath)) {
        await fs.move(this.backupPath, this.config.path);
        logger.info('Restored backup directory');
      }
    } catch (error) {
      logger.warn('Failed to rollback changes:', error);
    }
  }

  // Helper methods
  private getDevScript(framework: string): string {
    switch (framework) {
      case 'nextjs': return 'next dev';
      case 'react-native': return 'react-native start';
      case 'flutter': return 'flutter run';
      default: return 'npm run start';
    }
  }

  private getBuildScript(framework: string): string {
    switch (framework) {
      case 'nextjs': return 'next build';
      case 'react-native': return 'react-native bundle --platform android --dev false';
      case 'flutter': return 'flutter build';
      default: return 'tsc';
    }
  }

  private getStartScript(framework: string): string {
    switch (framework) {
      case 'nextjs': return 'next start';
      case 'react-native': return 'react-native run-android';
      case 'flutter': return 'flutter run --release';
      default: return 'node dist/index.js';
    }
  }

  private getFrameworkDependencies(framework: string): Record<string, string> {
    const deps: Record<string, Record<string, string>> = {
      nextjs: {
        'next': '^14.0.0',
        'react': '^18.0.0',
        'react-dom': '^18.0.0',
      },
      'react-native': {
        'react': '^18.0.0',
        'react-native': '^0.72.0',
      },
      flutter: {},
    };

    return deps[framework] || {};
  }

  private getDevDependencies(framework: string): Record<string, string> {
    const common = {
      '@types/node': '^20.0.0',
      'typescript': '^5.3.0',
      'eslint': '^8.57.0',
      'prettier': '^3.2.0',
      'jest': '^29.0.0',
      '@types/jest': '^29.0.0',
    };

    const frameworkSpecific: Record<string, Record<string, string>> = {
      nextjs: {
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0',
        'eslint-config-next': '^14.0.0',
      },
      'react-native': {
        '@types/react': '^18.0.0',
        '@react-native/metro-config': '^0.72.0',
        'metro-react-native-babel-preset': '^0.76.0',
      },
    };

    return {
      ...common,
      ...(frameworkSpecific[framework] || {}),
    };
  }

  private async generateFrameworkFiles(template: any): Promise<Map<string, string>> {
    const files = new Map<string, string>();

    switch (template.framework) {
      case 'nextjs':
        files.set('next.config.js', this.generateNextConfig());
        files.set('tsconfig.json', this.generateTSConfig());
        files.set('tailwind.config.js', this.generateTailwindConfig());
        files.set('src/pages/index.tsx', this.generateNextIndexPage());
        break;
        
      case 'react-native':
        files.set('metro.config.js', this.generateMetroConfig());
        files.set('babel.config.js', this.generateBabelConfig());
        files.set('src/App.tsx', this.generateRNApp());
        break;
        
      case 'flutter':
        files.set('pubspec.yaml', this.generatePubspecYaml());
        files.set('lib/main.dart', this.generateFlutterMain());
        break;
    }

    return files;
  }

  private async generateDNAModuleFiles(moduleId: string, framework: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    
    // This would integrate with the actual DNA module system
    // For now, just create placeholder files
    files.set(`src/modules/${moduleId}.ts`, `// ${moduleId} module configuration\nexport const ${moduleId}Config = {};\n`);
    
    return files;
  }

  private generateReadme(template: any, variables: Record<string, string>): string {
    return `# ${variables['projectName'] || this.config.name}

Generated with DNA CLI using the **${template.name}** template.

## Features

${template.features.map((feature: string) => `- ${feature}`).join('\n')}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Open your browser and navigate to the development URL

## DNA Modules

This project includes the following DNA modules:

${this.config.dnaModules.map(module => `- \`${module}\``).join('\n')}

## Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm run start\` - Start production server
- \`npm test\` - Run tests
- \`npm run lint\` - Lint code
- \`npm run format\` - Format code

## Documentation

For more information about this template and DNA CLI, visit:
- [DNA CLI Documentation](https://github.com/dna-templates/cli)
- [Template Documentation](https://templates.dna-cli.com/${template.id})

Generated on ${new Date().toLocaleDateString()}
`;
  }

  private generateGitignore(framework: string): string {
    const common = `# Dependencies
node_modules/
.pnp
.pnp.js

# Production builds
dist/
build/
out/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

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
      nextjs: `
# Next.js
.next/
next-env.d.ts
`,
      'react-native': `
# React Native
.expo/
.expo-shared/
android/app/build/
ios/build/
*.ipa
*.apk
`,
      flutter: `
# Flutter
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
build/
`,
    };

    return common + (frameworkSpecific[framework] || '');
  }

  // Framework-specific file generators
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

  private generateTailwindConfig(): string {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
  }

  private generateNextIndexPage(): string {
    return `import { NextPage } from 'next';

const HomePage: NextPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to ${this.config.name}
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
        <Text style={styles.title}>Welcome to ${this.config.name}</Text>
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

  private generatePubspecYaml(): string {
    return `name: ${this.config.name.replace(/-/g, '_')}
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
      title: '${this.config.name}',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const MyHomePage(title: '${this.config.name}'),
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
              'Welcome to ${this.config.name}',
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

  private getInstallCommand(packageManager: string): string[] {
    switch (packageManager) {
      case 'yarn': return ['yarn', 'install'];
      case 'pnpm': return ['pnpm', 'install'];
      case 'bun': return ['bun', 'install'];
      default: return ['npm', 'install'];
    }
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

  private async cleanupTempFiles(): Promise<void> {
    // Clean up any temporary files created during generation
    // This is a placeholder for future cleanup logic
  }
}