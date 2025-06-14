/**
 * @fileoverview Test Generation Engine for automatic test creation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  Framework, 
  TestGenerationConfig, 
  TestPattern, 
  TestTemplate, 
  TestType 
} from '../types';

export class TestGenerationEngine {
  private templates: Map<string, TestTemplate> = new Map();
  private patterns: TestPattern[] = [];

  constructor() {
    this.initializeDefaultPatterns();
    this.initializeDefaultTemplates();
  }

  /**
   * Generate tests for a given configuration
   */
  async generateTests(config: TestGenerationConfig): Promise<string[]> {
    const generatedFiles: string[] = [];
    
    // Scan target directory for files
    const sourceFiles = await this.scanSourceFiles(config.targetPath);
    
    for (const sourceFile of sourceFiles) {
      const matchedPatterns = this.matchPatterns(sourceFile, config.framework);
      
      for (const pattern of matchedPatterns) {
        const testFile = await this.generateTestFile(
          sourceFile,
          pattern,
          config
        );
        
        if (testFile) {
          generatedFiles.push(testFile);
        }
      }
    }
    
    return generatedFiles;
  }

  /**
   * Register a custom test template
   */
  registerTemplate(template: TestTemplate): void {
    const key = `${template.framework}-${template.testType}-${template.name}`;
    this.templates.set(key, template);
  }

  /**
   * Register a custom test pattern
   */
  registerPattern(pattern: TestPattern): void {
    this.patterns.push(pattern);
    // Sort by priority (higher priority first)
    this.patterns.sort((a, b) => b.priority - a.priority);
  }

  private async scanSourceFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(targetPath, entry.name);
      
      if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
        const subFiles = await this.scanSourceFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && this.isSourceFile(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '__tests__',
      'test',
      'tests',
      'e2e',
      'integration_test',
    ];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  private isSourceFile(fileName: string): boolean {
    const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.dart', '.rs'];
    const testExtensions = ['.test.', '.spec.', '_test.', '.e2e.'];
    
    // Must have source extension
    if (!sourceExtensions.some(ext => fileName.endsWith(ext))) {
      return false;
    }
    
    // Must not be a test file
    if (testExtensions.some(ext => fileName.includes(ext))) {
      return false;
    }
    
    return true;
  }

  private matchPatterns(filePath: string, framework: Framework): TestPattern[] {
    const matched: TestPattern[] = [];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(fileContent) || pattern.pattern.test(filePath)) {
        matched.push(pattern);
      }
    }
    
    return matched;
  }

  private async generateTestFile(
    sourceFile: string,
    pattern: TestPattern,
    config: TestGenerationConfig
  ): Promise<string | null> {
    const template = this.getTemplate(config.framework, pattern.testType, pattern.template);
    
    if (!template) {
      console.warn(`No template found for ${config.framework}-${pattern.testType}-${pattern.template}`);
      return null;
    }

    const testFileName = this.generateTestFileName(sourceFile, pattern.testType, config.framework);
    const testFilePath = path.join(config.testPath, testFileName);
    
    // Skip if test file already exists
    if (await fs.pathExists(testFilePath)) {
      return null;
    }

    const testContent = await this.renderTemplate(template, {
      sourceFile,
      testFile: testFilePath,
      className: this.extractClassName(sourceFile),
      functionNames: this.extractFunctionNames(sourceFile),
      imports: this.generateImports(sourceFile, testFilePath, config.framework),
      ...template.variables,
    });

    await fs.ensureDir(path.dirname(testFilePath));
    await fs.writeFile(testFilePath, testContent);
    
    return testFilePath;
  }

  private generateTestFileName(sourceFile: string, testType: TestType, framework: Framework): string {
    const basename = path.basename(sourceFile, path.extname(sourceFile));
    const extension = this.getTestFileExtension(framework);
    
    switch (testType) {
      case 'unit':
        return `${basename}.test${extension}`;
      case 'integration':
        return `${basename}.integration.test${extension}`;
      case 'e2e':
        return `${basename}.e2e.test${extension}`;
      case 'performance':
        return `${basename}.performance.test${extension}`;
      case 'accessibility':
        return `${basename}.a11y.test${extension}`;
      case 'security':
        return `${basename}.security.test${extension}`;
      default:
        return `${basename}.test${extension}`;
    }
  }

  private getTestFileExtension(framework: Framework): string {
    switch (framework) {
      case 'flutter':
        return '.dart';
      case 'tauri':
        return '.rs';
      default:
        return '.ts';
    }
  }

  private getTemplate(framework: Framework, testType: TestType, templateName: string): TestTemplate | undefined {
    const key = `${framework}-${testType}-${templateName}`;
    return this.templates.get(key);
  }

  private extractClassName(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // TypeScript/JavaScript class extraction
    const classMatch = content.match(/class\s+(\w+)/);
    if (classMatch) {
      return classMatch[1];
    }
    
    // Dart class extraction
    const dartClassMatch = content.match(/class\s+(\w+)/);
    if (dartClassMatch) {
      return dartClassMatch[1];
    }
    
    // Rust struct extraction
    const rustStructMatch = content.match(/struct\s+(\w+)/);
    if (rustStructMatch) {
      return rustStructMatch[1];
    }
    
    // Fallback to filename
    return path.basename(filePath, path.extname(filePath));
  }

  private extractFunctionNames(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const functions: string[] = [];
    
    // TypeScript/JavaScript function extraction
    const functionMatches = content.matchAll(/(?:function\s+(\w+)|(\w+)\s*\([^)]*\)\s*\{|(\w+):\s*\([^)]*\)\s*=>\s*\{)/g);
    for (const match of functionMatches) {
      const functionName = match[1] || match[2] || match[3];
      if (functionName && !functionName.startsWith('_') && functionName !== 'constructor') {
        functions.push(functionName);
      }
    }
    
    return functions;
  }

  private generateImports(sourceFile: string, testFile: string, framework: Framework): string {
    const relativePath = path.relative(path.dirname(testFile), sourceFile);
    const importPath = relativePath.replace(/\\/g, '/').replace(/\.(ts|js|dart|rs)$/, '');
    
    switch (framework) {
      case 'flutter':
        return `import 'package:flutter_test/flutter_test.dart';\nimport '${importPath}.dart';`;
      case 'react-native':
      case 'nextjs':
        return `import { render, screen } from '@testing-library/react';\nimport ${this.extractClassName(sourceFile)} from '${importPath}';`;
      case 'tauri':
        return `use super::*;\nuse tokio_test;`;
      default:
        return `import { ${this.extractClassName(sourceFile)} } from '${importPath}';`;
    }
  }

  private async renderTemplate(template: TestTemplate, variables: Record<string, any>): Promise<string> {
    let content = template.template;
    
    // Simple template rendering - replace {{variable}} with values
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, String(value));
    }
    
    return content;
  }

  private initializeDefaultPatterns(): void {
    // TypeScript/JavaScript patterns
    this.patterns.push({
      name: 'component',
      pattern: /(?:export\s+(?:default\s+)?(?:class|function|const)\s+\w+|React\.Component)/,
      testType: 'unit',
      template: 'component-test',
      priority: 10,
    });

    this.patterns.push({
      name: 'service',
      pattern: /(?:class\s+\w+Service|export\s+class\s+\w+Service)/,
      testType: 'unit',
      template: 'service-test',
      priority: 9,
    });

    this.patterns.push({
      name: 'util',
      pattern: /(?:export\s+(?:function|const)\s+\w+|function\s+\w+)/,
      testType: 'unit',
      template: 'util-test',
      priority: 8,
    });

    // Flutter patterns
    this.patterns.push({
      name: 'widget',
      pattern: /class\s+\w+\s+extends\s+StatelessWidget|class\s+\w+\s+extends\s+StatefulWidget/,
      testType: 'unit',
      template: 'widget-test',
      priority: 10,
    });

    // Rust patterns
    this.patterns.push({
      name: 'struct',
      pattern: /struct\s+\w+/,
      testType: 'unit',
      template: 'struct-test',
      priority: 9,
    });
  }

  private initializeDefaultTemplates(): void {
    // TypeScript Component Test Template
    this.registerTemplate({
      name: 'component-test',
      framework: 'react-native',
      testType: 'unit',
      template: `{{imports}}

describe('{{className}}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { getByTestId } = render(<{{className}} />);
    expect(getByTestId('{{className.toLowerCase()}}')).toBeTruthy();
  });

  it('should have correct default props', () => {
    const { getByTestId } = render(<{{className}} />);
    const component = getByTestId('{{className.toLowerCase()}}');
    expect(component).toBeTruthy();
  });

  // TODO: Add more specific tests for component behavior
});`,
      variables: {},
    });

    // Flutter Widget Test Template
    this.registerTemplate({
      name: 'widget-test',
      framework: 'flutter',
      testType: 'unit',
      template: `{{imports}}

void main() {
  group('{{className}}', () {
    testWidgets('should render without errors', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: {{className}}(),
        ),
      );

      expect(find.byType({{className}}), findsOneWidget);
    });

    testWidgets('should have correct initial state', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: {{className}}(),
        ),
      );

      // TODO: Add specific widget state tests
    });
  });
}`,
      variables: {},
    });

    // Service Test Template
    this.registerTemplate({
      name: 'service-test',
      framework: 'nextjs',
      testType: 'unit',
      template: `{{imports}}

describe('{{className}}', () => {
  let service: {{className}};

  beforeEach(() => {
    service = new {{className}}();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

{{#each functionNames}}
  describe('{{this}}', () => {
    it('should work correctly', () => {
      // TODO: Implement test for {{this}}
      expect(service.{{this}}).toBeDefined();
    });
  });

{{/each}}
});`,
      variables: {},
    });

    // Rust Struct Test Template
    this.registerTemplate({
      name: 'struct-test',
      framework: 'tauri',
      testType: 'unit',
      template: `{{imports}}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_{{className.toLowerCase()}}_creation() {
        // TODO: Implement test for {{className}} creation
    }

    #[tokio::test]
    async fn test_{{className.toLowerCase()}}_async_methods() {
        // TODO: Implement async tests for {{className}}
    }
}`,
      variables: {},
    });
  }
}