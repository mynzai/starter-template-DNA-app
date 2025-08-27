"use strict";
/**
 * @fileoverview Project Generator - Creates projects from templates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectGenerator = void 0;
const tslib_1 = require("tslib");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const path_1 = tslib_1.__importDefault(require("path"));
const child_process_1 = require("child_process");
const handlebars_1 = tslib_1.__importDefault(require("handlebars"));
const template_registry_1 = require("./template-registry");
const logger_1 = require("../utils/logger");
const error_handler_1 = require("../utils/error-handler");
class ProjectGenerator {
    constructor(config, options, progressTracker) {
        console.log('[DEBUG] ProjectGenerator constructor - setting config...');
        this.config = config;
        console.log('[DEBUG] ProjectGenerator constructor - setting options...');
        this.options = options;
        console.log('[DEBUG] ProjectGenerator constructor - setting progressTracker...');
        this.progressTracker = progressTracker;
        console.log('[DEBUG] ProjectGenerator constructor - creating TemplateRegistry...');
        // Initialize template registry
        this.registry = new template_registry_1.TemplateRegistry();
        console.log('[DEBUG] ProjectGenerator constructor - completed successfully');
    }
    async validateConfiguration() {
        await this.registry.load();
        const template = this.registry.getTemplate(this.config.template);
        if (!template) {
            throw (0, error_handler_1.createCLIError)(`Template "${this.config.template}" not found`, 'TEMPLATE_NOT_FOUND');
        }
        // Validate DNA modules compatibility - ensure dnaModules is an array
        const dnaModules = this.config.dnaModules || [];
        const incompatibleModules = dnaModules.filter(moduleId => !template.dnaModules.includes(moduleId));
        if (incompatibleModules.length > 0) {
            logger_1.logger.warn(`Some DNA modules may not be compatible with this template: ${incompatibleModules.join(', ')}`);
        }
        // Check system requirements
        await this.validateSystemRequirements(template);
    }
    async validateSystemRequirements(template) {
        // Check Node.js version if required
        if (template.requirements?.node) {
            const nodeVersion = process.version;
            logger_1.logger.debug(`Node.js version: ${nodeVersion}, required: ${template.requirements.node}`);
            // Note: In a real implementation, you'd use semver to validate
        }
        // Skip disk space check for now - fs.stat doesn't provide available space
        // In production, would use a proper disk space library like 'check-disk-space'
        // const requiredSpace = 500 * 1024 * 1024; // 500MB minimum
    }
    async prepareDirectory() {
        if (this.options.dryRun) {
            logger_1.logger.debug(`[DRY RUN] Would prepare directory: ${this.config.path}`);
            return;
        }
        // Create backup if directory exists and we're overwriting
        if (await fs_extra_1.default.pathExists(this.config.path) && this.options.overwrite) {
            if (this.options.backup) {
                this.backupPath = `${this.config.path}.backup.${Date.now()}`;
                await fs_extra_1.default.copy(this.config.path, this.backupPath);
                logger_1.logger.debug(`Created backup at: ${this.backupPath}`);
            }
            await fs_extra_1.default.remove(this.config.path);
        }
        // Create project directory
        await fs_extra_1.default.ensureDir(this.config.path);
        // Set appropriate permissions
        if (process.platform !== 'win32') {
            await fs_extra_1.default.chmod(this.config.path, 0o755);
        }
    }
    async generateFiles() {
        if (this.options.dryRun) {
            logger_1.logger.debug(`[DRY RUN] Would generate files from template: ${this.config.template}`);
            return;
        }
        const template = this.registry.getTemplate(this.config.template);
        const templatePath = this.getTemplatePath(template);
        logger_1.logger.debug(`Generating files from template: ${templatePath}`);
        // Check if template directory exists
        if (!await fs_extra_1.default.pathExists(templatePath)) {
            logger_1.logger.warn(`Template directory not found: ${templatePath}, using built-in generation`);
            await this.generateFromTemplate(template);
            return;
        }
        // Copy and process template files
        await this.copyAndProcessTemplate(templatePath);
        logger_1.logger.debug('Template files generated successfully');
    }
    getTemplatePath(template) {
        // Templates are now at: templates/{template-id}/ directly
        // Use same path resolution as TemplateRegistry
        const cliPath = path_1.default.resolve(__dirname, '..', '..', '..', '..', '..');
        return path_1.default.join(cliPath, 'templates', template.id);
    }
    getTemplateCategory(templateType) {
        // Map template types to directory categories
        const categoryMap = {
            'ai-saas': 'ai-native',
            'ai-mobile': 'ai-native',
            'data-visualization': 'performance',
            'real-time-collaboration': 'performance',
            'high-performance-api': 'performance',
            'flutter-universal': 'cross-platform',
            'react-native-hybrid': 'cross-platform',
            'electron-modern': 'cross-platform',
            'tauri-native': 'cross-platform',
            'pwa-advanced': 'cross-platform',
            'foundation': 'foundation'
        };
        return categoryMap[templateType] || 'foundation';
    }
    async generateFromTemplate(template) {
        if (this.options.dryRun) {
            logger_1.logger.debug(`[DRY RUN] Would generate from template: ${template.name}`);
            return;
        }
        // Generate basic project structure based on template metadata
        const files = await this.generateTemplateFiles(template);
        for (const [filePath, content] of files) {
            const fullPath = path_1.default.join(this.config.path, filePath);
            await fs_extra_1.default.ensureDir(path_1.default.dirname(fullPath));
            await fs_extra_1.default.writeFile(fullPath, content);
            // Set executable permissions for scripts
            if (filePath.endsWith('.sh') || filePath.startsWith('scripts/')) {
                if (process.platform !== 'win32') {
                    await fs_extra_1.default.chmod(fullPath, 0o755);
                }
            }
        }
    }
    async generateTemplateFiles(template) {
        const files = new Map();
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
        const dnaModules = this.config.dnaModules || [];
        for (const moduleId of dnaModules) {
            const moduleFiles = await this.generateDNAModuleFiles(moduleId, template.framework);
            moduleFiles.forEach((content, filePath) => {
                files.set(filePath, content);
            });
        }
        return files;
    }
    async copyAndProcessTemplate(templatePath) {
        if (this.options.dryRun) {
            logger_1.logger.debug(`[DRY RUN] Would copy template from: ${templatePath}`);
            return;
        }
        // Copy template files with variable replacement
        await this.copyTemplateRecursive(templatePath, this.config.path);
    }
    async copyTemplateRecursive(sourcePath, targetPath) {
        const items = await fs_extra_1.default.readdir(sourcePath);
        for (const item of items) {
            const sourceItemPath = path_1.default.join(sourcePath, item);
            const targetItemPath = path_1.default.join(targetPath, item);
            const stat = await fs_extra_1.default.stat(sourceItemPath);
            if (stat.isDirectory()) {
                await fs_extra_1.default.ensureDir(targetItemPath);
                await this.copyTemplateRecursive(sourceItemPath, targetItemPath);
            }
            else {
                // Process file through Handlebars if it's a template
                if (item.endsWith('.hbs')) {
                    // Template file - process with Handlebars
                    const templateContent = await fs_extra_1.default.readFile(sourceItemPath, 'utf8');
                    const compiledTemplate = handlebars_1.default.compile(templateContent);
                    // Create template context with project variables and DNA module helpers
                    const templateContext = this.createTemplateContext();
                    const processedContent = compiledTemplate(templateContext);
                    // Remove .hbs extension from target file
                    const finalTargetPath = targetItemPath.replace(/\.hbs$/, '');
                    await fs_extra_1.default.writeFile(finalTargetPath, processedContent);
                    logger_1.logger.debug(`Processed template: ${item} -> ${path_1.default.basename(finalTargetPath)}`);
                }
                else {
                    // Regular file - copy as-is
                    await fs_extra_1.default.copy(sourceItemPath, targetItemPath);
                }
            }
        }
    }
    createTemplateContext() {
        // Register Handlebars helpers for DNA modules
        this.registerHandlebarsHelpers();
        return {
            project: {
                name: this.config.name,
                kebabName: this.config.name.toLowerCase().replace(/\s+/g, '-'),
                camelName: this.config.name.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/^\w/, c => c.toLowerCase()),
                pascalName: this.config.name.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/^\w/, c => c.toUpperCase()),
                description: this.config.variables.description || `A project generated with DNA CLI`,
                framework: this.config.framework,
                type: this.config.template
            },
            dnaModules: this.config.dnaModules || [],
            variables: this.config.variables,
            hasModule: (moduleId) => (this.config.dnaModules || []).includes(moduleId),
            framework: this.config.framework,
            timestamp: new Date().toISOString()
        };
    }
    registerHandlebarsHelpers() {
        // Helper to check if a DNA module is included
        handlebars_1.default.registerHelper('hasModule', function (moduleId) {
            return this.dnaModules && this.dnaModules.includes(moduleId);
        });
        // Helper for conditional module dependencies
        handlebars_1.default.registerHelper('ifModule', function (moduleId, options) {
            if (this.dnaModules && this.dnaModules.includes(moduleId)) {
                return options.fn(this);
            }
            else {
                return options.inverse(this);
            }
        });
        // Helper for framework-specific code
        handlebars_1.default.registerHelper('ifFramework', function (frameworkName, options) {
            if (this.framework === frameworkName) {
                return options.fn(this);
            }
            else {
                return options.inverse(this);
            }
        });
        // Helper for case transformations
        handlebars_1.default.registerHelper('kebabCase', function (str) {
            return str.toLowerCase().replace(/\s+/g, '-');
        });
        handlebars_1.default.registerHelper('camelCase', function (str) {
            return str.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/^\w/, c => c.toLowerCase());
        });
        handlebars_1.default.registerHelper('pascalCase', function (str) {
            return str.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
        });
    }
    async installDependencies() {
        if (this.options.dryRun) {
            logger_1.logger.debug(`[DRY RUN] Would install dependencies using ${this.config.packageManager}`);
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
    async initializeGit() {
        if (this.options.dryRun) {
            logger_1.logger.debug('[DRY RUN] Would initialize git repository');
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
    async finalize() {
        if (this.options.dryRun) {
            logger_1.logger.debug('[DRY RUN] Would finalize project setup');
            return;
        }
        // Generate project configuration file
        const dnaConfig = {
            template: this.config.template,
            framework: this.config.framework,
            modules: this.config.dnaModules || [],
            generated: new Date().toISOString(),
            version: '0.1.0',
        };
        const configPath = path_1.default.join(this.config.path, 'dna.config.json');
        await fs_extra_1.default.writeJSON(configPath, dnaConfig, { spaces: 2 });
        // Clean up temporary files
        await this.cleanupTempFiles();
    }
    async rollback() {
        try {
            // Remove created directory if it exists
            if (await fs_extra_1.default.pathExists(this.config.path)) {
                await fs_extra_1.default.remove(this.config.path);
            }
            // Restore backup if it exists
            if (this.backupPath && await fs_extra_1.default.pathExists(this.backupPath)) {
                await fs_extra_1.default.move(this.backupPath, this.config.path);
                logger_1.logger.info('Restored backup directory');
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to rollback changes:', error);
        }
    }
    // Helper methods
    getDevScript(framework) {
        switch (framework) {
            case 'nextjs': return 'next dev';
            case 'react-native': return 'react-native start';
            case 'flutter': return 'flutter run';
            default: return 'npm run start';
        }
    }
    getBuildScript(framework) {
        switch (framework) {
            case 'nextjs': return 'next build';
            case 'react-native': return 'react-native bundle --platform android --dev false';
            case 'flutter': return 'flutter build';
            default: return 'tsc';
        }
    }
    getStartScript(framework) {
        switch (framework) {
            case 'nextjs': return 'next start';
            case 'react-native': return 'react-native run-android';
            case 'flutter': return 'flutter run --release';
            default: return 'node dist/index.js';
        }
    }
    getFrameworkDependencies(framework) {
        const deps = {
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
    getDevDependencies(framework) {
        const common = {
            '@types/node': '^20.0.0',
            'typescript': '^5.3.0',
            'eslint': '^8.57.0',
            'prettier': '^3.2.0',
            'jest': '^29.0.0',
            '@types/jest': '^29.0.0',
        };
        const frameworkSpecific = {
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
    async generateFrameworkFiles(template) {
        const files = new Map();
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
    async generateDNAModuleFiles(moduleId, framework) {
        const files = new Map();
        // This would integrate with the actual DNA module system
        // For now, just create placeholder files
        files.set(`src/modules/${moduleId}.ts`, `// ${moduleId} module configuration\nexport const ${moduleId}Config = {};\n`);
        return files;
    }
    generateReadme(template, variables) {
        return `# ${variables['projectName'] || this.config.name}

Generated with DNA CLI using the **${template.name}** template.

## Features

${template.features.map((feature) => `- ${feature}`).join('\n')}

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

${(this.config.dnaModules || []).map(module => `- \`${module}\``).join('\n')}

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
    generateGitignore(framework) {
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
        const frameworkSpecific = {
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
    generateNextConfig() {
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
    generateTSConfig() {
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
    generateTailwindConfig() {
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
    generateNextIndexPage() {
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
    generateMetroConfig() {
        return `const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
`;
    }
    generateBabelConfig() {
        return `module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
};
`;
    }
    generateRNApp() {
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
    generatePubspecYaml() {
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
    generateFlutterMain() {
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
    getInstallCommand(packageManager) {
        switch (packageManager) {
            case 'yarn': return ['yarn', 'install'];
            case 'pnpm': return ['pnpm', 'install'];
            case 'bun': return ['bun', 'install'];
            default: return ['npm', 'install'];
        }
    }
    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.spawn)(command, args, {
                cwd: options.cwd || process.cwd(),
                stdio: options.stdio || 'inherit',
                shell: process.platform === 'win32',
            });
            child.on('close', (code) => {
                if (code === 0) {
                    resolve();
                }
                else {
                    reject(new Error(`Command failed with exit code ${code}: ${command} ${args.join(' ')}`));
                }
            });
            child.on('error', (error) => {
                reject(error);
            });
        });
    }
    async cleanupTempFiles() {
        // Clean up any temporary files created during generation
        // This is a placeholder for future cleanup logic
    }
}
exports.ProjectGenerator = ProjectGenerator;
//# sourceMappingURL=project-generator.js.map