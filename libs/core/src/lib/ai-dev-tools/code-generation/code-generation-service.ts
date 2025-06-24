/**
 * @fileoverview Code Generation Service
 * AC1: Code Generation Templates with 10+ languages and syntax highlighting
 */

import { EventEmitter } from 'events';
import {
  CodeGenerationRequest,
  CodeGenerationResponse,
  LanguageTemplate,
  SyntaxHighlightConfig,
  FrameworkDetectionResult,
  SupportedLanguage,
  LanguageConfig,
  FrameworkTemplate,
  CodeContext,
  CodeMetadata
} from './types';
import { AIService } from '../ai/ai-service';
import { LanguageDetector } from './language-detector';
import { SyntaxHighlighter } from './syntax-highlighter';
import { TemplateEngine } from './template-engine';
import { CodeAnalyzer } from './code-analyzer';

export class CodeGenerationService extends EventEmitter {
  private aiService: AIService;
  private languageDetector: LanguageDetector;
  private syntaxHighlighter: SyntaxHighlighter;
  private templateEngine: TemplateEngine;
  private codeAnalyzer: CodeAnalyzer;
  private templates: Map<string, LanguageTemplate> = new Map();
  private languageConfigs: Map<SupportedLanguage, LanguageConfig> = new Map();
  private frameworkTemplates: Map<string, FrameworkTemplate> = new Map();

  constructor(aiService: AIService) {
    super();
    this.aiService = aiService;
    this.languageDetector = new LanguageDetector();
    this.syntaxHighlighter = new SyntaxHighlighter();
    this.templateEngine = new TemplateEngine();
    this.codeAnalyzer = new CodeAnalyzer();
    
    this.initializeLanguageConfigs();
    this.loadBuiltinTemplates();
  }

  /**
   * Generate code based on prompt and language
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    const startTime = Date.now();
    
    try {
      this.emit('generation:started', {
        language: request.language,
        framework: request.framework,
        prompt: request.prompt.substring(0, 100) + '...'
      });

      // Detect framework if not specified
      const framework = request.framework || await this.detectFramework(request);

      // Get appropriate template
      const template = await this.getTemplate(request.language, framework);

      // Build enhanced prompt with context
      const enhancedPrompt = this.buildPrompt(request, template);

      // Generate code using AI service
      const aiResponse = await this.aiService.generate({
        prompt: enhancedPrompt,
        options: {
          maxTokens: request.options?.maxTokens || 2000,
          temperature: request.options?.temperature || 0.3
        }
      });

      // Parse and clean generated code
      const cleanedCode = this.cleanGeneratedCode(aiResponse.content, request.language);

      // Analyze code quality
      const analysis = await this.codeAnalyzer.analyze(cleanedCode, request.language);

      // Apply syntax highlighting
      const syntaxHighlighted = await this.syntaxHighlighter.highlight(
        cleanedCode,
        {
          language: request.language,
          theme: 'auto',
          showLineNumbers: true,
          highlightErrors: true
        }
      );

      // Generate explanations and suggestions
      const explanation = await this.generateExplanation(cleanedCode, request);
      const suggestions = await this.generateSuggestions(cleanedCode, analysis);

      const response: CodeGenerationResponse = {
        code: cleanedCode,
        language: request.language,
        framework,
        explanation,
        suggestions,
        syntaxHighlighted,
        metadata: {
          tokensUsed: aiResponse.usage?.totalTokens || 0,
          generationTime: Date.now() - startTime,
          complexity: analysis.complexity,
          quality: analysis.quality,
          testability: analysis.testability,
          maintainability: analysis.maintainability
        }
      };

      this.emit('generation:completed', {
        language: request.language,
        framework,
        tokensUsed: response.metadata.tokensUsed,
        generationTime: response.metadata.generationTime,
        quality: response.metadata.quality
      });

      return response;

    } catch (error) {
      this.emit('generation:error', {
        language: request.language,
        error: error instanceof Error ? error.message : 'Unknown error',
        prompt: request.prompt.substring(0, 100) + '...'
      });
      throw error;
    }
  }

  /**
   * Detect framework from context or code
   */
  async detectFramework(request: CodeGenerationRequest): Promise<FrameworkDetectionResult> {
    const context = request.context;
    
    // Check for framework keywords in prompt
    const frameworkHints = this.extractFrameworkHints(request.prompt);
    
    // Analyze existing code if provided
    let codeAnalysis = null;
    if (context?.existingCode) {
      codeAnalysis = await this.analyzeExistingCode(context.existingCode, request.language);
    }

    // Analyze dependencies
    const dependencyAnalysis = context?.dependencies 
      ? this.analyzeDependencies(context.dependencies, request.language)
      : null;

    // Combine all signals to detect framework
    const framework = this.languageDetector.detectFramework({
      language: request.language,
      hints: frameworkHints,
      codeAnalysis,
      dependencyAnalysis,
      projectType: context?.projectType
    });

    return framework;
  }

  /**
   * Get or create template for language/framework combination
   */
  async getTemplate(language: SupportedLanguage, framework?: string): Promise<LanguageTemplate> {
    const templateKey = framework ? `${language}-${framework}` : language;
    
    let template = this.templates.get(templateKey);
    if (!template) {
      template = await this.createTemplate(language, framework);
      this.templates.set(templateKey, template);
    }
    
    return template;
  }

  /**
   * Add custom template
   */
  addTemplate(template: LanguageTemplate): void {
    const key = template.framework ? `${template.language}-${template.framework}` : template.language;
    this.templates.set(key, template);
    
    this.emit('template:added', {
      id: template.id,
      language: template.language,
      framework: template.framework
    });
  }

  /**
   * Get syntax highlighting for code
   */
  async highlightSyntax(code: string, config: SyntaxHighlightConfig): Promise<string> {
    return this.syntaxHighlighter.highlight(code, config);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.languageConfigs.keys());
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(language: SupportedLanguage): LanguageConfig | undefined {
    return this.languageConfigs.get(language);
  }

  /**
   * Initialize language configurations
   */
  private initializeLanguageConfigs(): void {
    const configs: LanguageConfig[] = [
      {
        language: 'typescript',
        fileExtensions: ['.ts', '.tsx'],
        commentStyles: { single: '//', multi: { start: '/*', end: '*/' } },
        keywords: ['const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum', 'namespace'],
        builtinTypes: ['string', 'number', 'boolean', 'object', 'array', 'any', 'void', 'never'],
        frameworks: ['react', 'vue', 'angular', 'nextjs', 'nestjs', 'express'],
        testingFrameworks: ['jest', 'vitest', 'mocha', 'cypress', 'playwright'],
        packageManagers: ['npm', 'yarn', 'pnpm']
      },
      {
        language: 'javascript',
        fileExtensions: ['.js', '.jsx', '.mjs'],
        commentStyles: { single: '//', multi: { start: '/*', end: '*/' } },
        keywords: ['const', 'let', 'var', 'function', 'class', 'async', 'await', 'import', 'export'],
        builtinTypes: ['string', 'number', 'boolean', 'object', 'array', 'undefined', 'null'],
        frameworks: ['react', 'vue', 'angular', 'svelte', 'express', 'fastify'],
        testingFrameworks: ['jest', 'mocha', 'jasmine', 'ava'],
        packageManagers: ['npm', 'yarn', 'pnpm']
      },
      {
        language: 'python',
        fileExtensions: ['.py', '.pyw', '.pyc'],
        commentStyles: { single: '#', multi: { start: '"""', end: '"""' } },
        keywords: ['def', 'class', 'import', 'from', 'if', 'else', 'elif', 'for', 'while', 'try', 'except'],
        builtinTypes: ['str', 'int', 'float', 'bool', 'list', 'dict', 'tuple', 'set'],
        frameworks: ['django', 'flask', 'fastapi', 'streamlit', 'pytorch', 'tensorflow'],
        testingFrameworks: ['pytest', 'unittest', 'nose2'],
        packageManagers: ['pip', 'conda', 'poetry']
      },
      {
        language: 'java',
        fileExtensions: ['.java'],
        commentStyles: { single: '//', multi: { start: '/*', end: '*/' } },
        keywords: ['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements', 'import'],
        builtinTypes: ['String', 'int', 'long', 'double', 'boolean', 'char', 'byte', 'short'],
        frameworks: ['spring', 'hibernate', 'junit', 'maven', 'gradle'],
        testingFrameworks: ['junit', 'testng', 'mockito'],
        packageManagers: ['maven', 'gradle']
      },
      {
        language: 'csharp',
        fileExtensions: ['.cs'],
        commentStyles: { single: '//', multi: { start: '/*', end: '*/' } },
        keywords: ['public', 'private', 'protected', 'class', 'interface', 'namespace', 'using', 'var'],
        builtinTypes: ['string', 'int', 'long', 'double', 'bool', 'char', 'byte', 'object'],
        frameworks: ['dotnet', 'aspnet', 'entityframework', 'xamarin'],
        testingFrameworks: ['nunit', 'xunit', 'mstest'],
        packageManagers: ['nuget', 'dotnet']
      },
      {
        language: 'rust',
        fileExtensions: ['.rs'],
        commentStyles: { single: '//', multi: { start: '/*', end: '*/' } },
        keywords: ['fn', 'let', 'mut', 'struct', 'enum', 'impl', 'trait', 'use', 'mod'],
        builtinTypes: ['i32', 'u32', 'f64', 'bool', 'char', 'str', 'String', 'Vec'],
        frameworks: ['actix', 'warp', 'rocket', 'tokio'],
        testingFrameworks: ['cargo test', 'rstest'],
        packageManagers: ['cargo']
      },
      {
        language: 'go',
        fileExtensions: ['.go'],
        commentStyles: { single: '//', multi: { start: '/*', end: '*/' } },
        keywords: ['func', 'var', 'const', 'type', 'struct', 'interface', 'package', 'import'],
        builtinTypes: ['string', 'int', 'float64', 'bool', 'byte', 'rune'],
        frameworks: ['gin', 'echo', 'fiber', 'gorilla'],
        testingFrameworks: ['testing', 'testify'],
        packageManagers: ['go mod']
      }
    ];

    configs.forEach(config => {
      this.languageConfigs.set(config.language, config);
    });
  }

  /**
   * Load built-in templates for each language
   */
  private loadBuiltinTemplates(): void {
    // TypeScript React Component Template
    this.addTemplate({
      id: 'typescript-react-component',
      name: 'React Component',
      language: 'typescript',
      framework: 'react',
      template: `interface {{ComponentName}}Props {
  {{#each props}}
  {{name}}: {{type}};
  {{/each}}
}

export const {{ComponentName}}: React.FC<{{ComponentName}}Props> = ({{#each props}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}) => {
  return (
    <div>
      {{content}}
    </div>
  );
};`,
      variables: [
        { name: 'ComponentName', type: 'string', description: 'Name of the React component', required: true },
        { name: 'props', type: 'array', description: 'Component props', required: false, defaultValue: [] },
        { name: 'content', type: 'string', description: 'Component content', required: false, defaultValue: '<p>Component content</p>' }
      ],
      patterns: [
        {
          id: 'react-hook',
          name: 'React Hook Usage',
          description: 'Pattern for using React hooks',
          pattern: 'const [{{state}}, set{{State}}] = useState({{initialValue}});',
          examples: ['const [count, setCount] = useState(0);']
        }
      ],
      syntaxRules: [],
      examples: [
        {
          title: 'Simple Button Component',
          description: 'A reusable button component',
          input: 'ComponentName: Button, props: [{name: "onClick", type: "() => void"}, {name: "children", type: "ReactNode"}]',
          output: 'interface ButtonProps {\n  onClick: () => void;\n  children: ReactNode;\n}\n\nexport const Button: React.FC<ButtonProps> = (onClick, children) => {\n  return (\n    <button onClick={onClick}>\n      {children}\n    </button>\n  );\n};',
          explanation: 'Creates a typed React component with props interface'
        }
      ]
    });

    // Python FastAPI Endpoint Template
    this.addTemplate({
      id: 'python-fastapi-endpoint',
      name: 'FastAPI Endpoint',
      language: 'python',
      framework: 'fastapi',
      template: `from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class {{ModelName}}(BaseModel):
    {{#each fields}}
    {{name}}: {{type}}
    {{/each}}

@router.{{method}}("{{path}}")
async def {{function_name}}({{#if has_body}}{{model_param}}: {{ModelName}}{{/if}}) -> {{return_type}}:
    """
    {{description}}
    """
    try:
        {{implementation}}
        return {{return_statement}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))`,
      variables: [
        { name: 'ModelName', type: 'string', description: 'Pydantic model name', required: true },
        { name: 'method', type: 'string', description: 'HTTP method', required: true, defaultValue: 'post' },
        { name: 'path', type: 'string', description: 'API endpoint path', required: true },
        { name: 'function_name', type: 'string', description: 'Function name', required: true }
      ],
      patterns: [],
      syntaxRules: [],
      examples: []
    });

    // Add more templates for other languages...
    this.loadAdditionalTemplates();
  }

  /**
   * Load additional templates for other frameworks
   */
  private loadAdditionalTemplates(): void {
    // Java Spring Boot Controller
    this.addTemplate({
      id: 'java-spring-controller',
      name: 'Spring Boot Controller',
      language: 'java',
      framework: 'spring',
      template: `@RestController
@RequestMapping("{{basePath}}")
public class {{ControllerName}} {
    
    @{{method}}("{{path}}")
    public ResponseEntity<{{ResponseType}}> {{methodName}}({{#if requestBody}}@RequestBody {{RequestType}} request{{/if}}) {
        try {
            {{implementation}}
            return ResponseEntity.ok({{returnValue}});
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}`,
      variables: [
        { name: 'ControllerName', type: 'string', description: 'Controller class name', required: true },
        { name: 'basePath', type: 'string', description: 'Base API path', required: true },
        { name: 'method', type: 'string', description: 'HTTP method annotation', required: true, defaultValue: 'PostMapping' }
      ],
      patterns: [],
      syntaxRules: [],
      examples: []
    });
  }

  /**
   * Create template for language/framework
   */
  private async createTemplate(language: SupportedLanguage, framework?: string): Promise<LanguageTemplate> {
    const config = this.languageConfigs.get(language);
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    // Generate basic template using AI if no built-in template exists
    const prompt = `Create a code template for ${language}${framework ? ` with ${framework}` : ''}. 
Include common patterns, best practices, and placeholder variables.`;

    const aiResponse = await this.aiService.generate({
      prompt,
      options: { maxTokens: 1000, temperature: 0.2 }
    });

    return {
      id: `${language}${framework ? `-${framework}` : ''}-generated`,
      name: `${language}${framework ? ` ${framework}` : ''} Template`,
      language,
      framework,
      template: aiResponse.content,
      variables: [],
      patterns: [],
      syntaxRules: [],
      examples: []
    };
  }

  /**
   * Build enhanced prompt with context
   */
  private buildPrompt(request: CodeGenerationRequest, template: LanguageTemplate): string {
    let prompt = `Generate ${request.language} code`;
    
    if (request.framework) {
      prompt += ` using ${request.framework}`;
    }
    
    prompt += ` for the following request:\n\n${request.prompt}\n\n`;
    
    if (request.context) {
      prompt += 'Context:\n';
      if (request.context.projectType) {
        prompt += `- Project type: ${request.context.projectType}\n`;
      }
      if (request.context.architecture) {
        prompt += `- Architecture: ${request.context.architecture}\n`;
      }
      if (request.context.dependencies?.length) {
        prompt += `- Dependencies: ${request.context.dependencies.join(', ')}\n`;
      }
      prompt += '\n';
    }

    prompt += 'Requirements:\n';
    prompt += `- Use ${request.language} syntax\n`;
    if (request.framework) {
      prompt += `- Follow ${request.framework} conventions\n`;
    }
    if (request.options?.includeComments) {
      prompt += '- Include comprehensive comments\n';
    }
    if (request.options?.includeTests) {
      prompt += '- Include unit tests\n';
    }
    if (request.options?.followConventions) {
      prompt += '- Follow industry best practices\n';
    }

    prompt += '\nReturn only the code without explanations.';

    return prompt;
  }

  /**
   * Clean generated code
   */
  private cleanGeneratedCode(code: string, language: SupportedLanguage): string {
    // Remove markdown code blocks if present
    code = code.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');
    
    // Remove leading/trailing whitespace
    code = code.trim();
    
    // Language-specific cleaning
    switch (language) {
      case 'python':
        // Ensure proper indentation
        code = this.normalizePythonIndentation(code);
        break;
      case 'javascript':
      case 'typescript':
        // Add semicolons if missing (optional based on project style)
        break;
    }

    return code;
  }

  /**
   * Normalize Python indentation
   */
  private normalizePythonIndentation(code: string): string {
    const lines = code.split('\n');
    const normalizedLines: string[] = [];
    
    for (const line of lines) {
      // Convert tabs to 4 spaces
      const normalized = line.replace(/\t/g, '    ');
      normalizedLines.push(normalized);
    }
    
    return normalizedLines.join('\n');
  }

  /**
   * Generate explanation for code
   */
  private async generateExplanation(code: string, request: CodeGenerationRequest): Promise<string> {
    const prompt = `Explain this ${request.language} code in simple terms:\n\n${code}\n\nProvide a brief explanation of what this code does and how it works.`;
    
    const response = await this.aiService.generate({
      prompt,
      options: { maxTokens: 500, temperature: 0.3 }
    });
    
    return response.content;
  }

  /**
   * Generate improvement suggestions
   */
  private async generateSuggestions(code: string, analysis: any): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (analysis.complexity > 7) {
      suggestions.push('Consider breaking down complex functions into smaller, more manageable pieces');
    }
    
    if (analysis.testability < 0.7) {
      suggestions.push('Add dependency injection to improve testability');
    }
    
    if (analysis.maintainability < 0.6) {
      suggestions.push('Add more descriptive variable names and comments');
    }
    
    return suggestions;
  }

  /**
   * Extract framework hints from prompt
   */
  private extractFrameworkHints(prompt: string): string[] {
    const commonFrameworks = [
      'react', 'vue', 'angular', 'svelte', 'nextjs',
      'django', 'flask', 'fastapi', 'spring', 'express',
      'laravel', 'rails', 'dotnet', 'gin', 'echo'
    ];
    
    const hints: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const framework of commonFrameworks) {
      if (lowerPrompt.includes(framework)) {
        hints.push(framework);
      }
    }
    
    return hints;
  }

  /**
   * Analyze existing code for framework detection
   */
  private async analyzeExistingCode(code: string, language: SupportedLanguage): Promise<any> {
    // Simple pattern matching for now - could be enhanced with AST parsing
    const patterns: Record<string, RegExp[]> = {
      typescript: [
        /import.*from ['"]react['"]/,
        /import.*from ['"]vue['"]/,
        /import.*from ['"]@angular/,
        /import.*from ['"]next/
      ],
      python: [
        /from django/,
        /from flask/,
        /from fastapi/,
        /import django/,
        /import flask/,
        /import fastapi/
      ],
      java: [
        /@RestController/,
        /@Component/,
        /@Service/,
        /import org\.springframework/
      ]
    };

    const languagePatterns = patterns[language] || [];
    const matches: string[] = [];

    for (const pattern of languagePatterns) {
      if (pattern.test(code)) {
        matches.push(pattern.source);
      }
    }

    return { matches, confidence: matches.length > 0 ? 0.8 : 0.2 };
  }

  /**
   * Analyze dependencies for framework detection
   */
  private analyzeDependencies(dependencies: string[], language: SupportedLanguage): any {
    const frameworkMap: Record<SupportedLanguage, Record<string, string>> = {
      typescript: {
        'react': 'react',
        'vue': 'vue',
        '@angular/core': 'angular',
        'next': 'nextjs'
      },
      javascript: {
        'react': 'react',
        'vue': 'vue',
        'express': 'express',
        'fastify': 'fastify'
      },
      python: {
        'django': 'django',
        'flask': 'flask',
        'fastapi': 'fastapi'
      },
      java: {
        'spring-boot-starter': 'spring',
        'spring-web': 'spring'
      }
    } as any;

    const langMap = frameworkMap[language] || {};
    const detectedFrameworks: string[] = [];

    for (const dep of dependencies) {
      for (const [depPattern, framework] of Object.entries(langMap)) {
        if (dep.includes(depPattern)) {
          detectedFrameworks.push(framework);
        }
      }
    }

    return {
      frameworks: detectedFrameworks,
      confidence: detectedFrameworks.length > 0 ? 0.9 : 0.1
    };
  }
}