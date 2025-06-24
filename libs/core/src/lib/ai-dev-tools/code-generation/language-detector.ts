/**
 * @fileoverview Language Detection Service
 * Detects programming languages and frameworks from various sources
 */

import {
  SupportedLanguage,
  FrameworkDetectionResult,
  CodeContext
} from './types';

export interface FrameworkDetectionInput {
  language: SupportedLanguage;
  hints?: string[];
  codeAnalysis?: any;
  dependencyAnalysis?: any;
  projectType?: string;
}

export class LanguageDetector {
  private frameworkPatterns: Map<SupportedLanguage, Map<string, RegExp[]>> = new Map();
  private dependencyMappings: Map<SupportedLanguage, Map<string, string>> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeDependencyMappings();
  }

  /**
   * Detect framework from various signals
   */
  detectFramework(input: FrameworkDetectionInput): FrameworkDetectionResult {
    const signals: Array<{ framework: string; confidence: number; source: string }> = [];

    // Analyze hints from prompt
    if (input.hints && input.hints.length > 0) {
      for (const hint of input.hints) {
        signals.push({
          framework: hint,
          confidence: 0.8,
          source: 'prompt_hint'
        });
      }
    }

    // Analyze code patterns
    if (input.codeAnalysis && input.codeAnalysis.confidence > 0.5) {
      for (const match of input.codeAnalysis.matches || []) {
        const framework = this.extractFrameworkFromPattern(match, input.language);
        if (framework) {
          signals.push({
            framework,
            confidence: input.codeAnalysis.confidence,
            source: 'code_analysis'
          });
        }
      }
    }

    // Analyze dependencies
    if (input.dependencyAnalysis && input.dependencyAnalysis.confidence > 0.5) {
      for (const framework of input.dependencyAnalysis.frameworks || []) {
        signals.push({
          framework,
          confidence: input.dependencyAnalysis.confidence,
          source: 'dependencies'
        });
      }
    }

    // Analyze project type
    if (input.projectType) {
      const frameworkFromType = this.getFrameworkFromProjectType(input.projectType, input.language);
      if (frameworkFromType) {
        signals.push({
          framework: frameworkFromType,
          confidence: 0.6,
          source: 'project_type'
        });
      }
    }

    // Combine signals and determine best framework
    const frameworkScores = new Map<string, number>();
    const frameworkSources = new Map<string, string[]>();

    for (const signal of signals) {
      const currentScore = frameworkScores.get(signal.framework) || 0;
      frameworkScores.set(signal.framework, currentScore + signal.confidence);
      
      const sources = frameworkSources.get(signal.framework) || [];
      sources.push(signal.source);
      frameworkSources.set(signal.framework, sources);
    }

    // Find best framework
    let bestFramework = '';
    let bestScore = 0;
    let bestSources: string[] = [];

    for (const [framework, score] of frameworkScores.entries()) {
      if (score > bestScore) {
        bestFramework = framework;
        bestScore = score;
        bestSources = frameworkSources.get(framework) || [];
      }
    }

    // Generate suggestions for alternative frameworks
    const suggestions = Array.from(frameworkScores.entries())
      .filter(([framework, score]) => framework !== bestFramework && score > 0.3)
      .map(([framework]) => framework)
      .slice(0, 3);

    return {
      framework: bestFramework || 'vanilla',
      confidence: Math.min(bestScore, 1.0),
      patterns: bestSources,
      suggestions
    };
  }

  /**
   * Detect language from file extension or content
   */
  detectLanguage(filename: string, content?: string): SupportedLanguage | null {
    // Try file extension first
    const ext = this.getFileExtension(filename);
    const languageFromExt = this.getLanguageFromExtension(ext);
    if (languageFromExt) {
      return languageFromExt;
    }

    // Try content analysis if available
    if (content) {
      return this.detectLanguageFromContent(content);
    }

    return null;
  }

  /**
   * Get supported frameworks for a language
   */
  getSupportedFrameworks(language: SupportedLanguage): string[] {
    const patterns = this.frameworkPatterns.get(language);
    return patterns ? Array.from(patterns.keys()) : [];
  }

  private initializePatterns(): void {
    // TypeScript/JavaScript patterns
    this.frameworkPatterns.set('typescript', new Map([
      ['react', [
        /import.*from ['"]react['"]/,
        /import.*from ['"]@types\/react['"]/,
        /React\.(Component|FC|FunctionComponent)/,
        /useState|useEffect|useContext/
      ]],
      ['vue', [
        /import.*from ['"]vue['"]/,
        /@Component|@Prop|@Watch/,
        /Vue\.component|Vue\.extend/,
        /\.vue['"]/
      ]],
      ['angular', [
        /import.*from ['"]@angular\//,
        /@Component|@Injectable|@NgModule/,
        /Angular|AngularJS/
      ]],
      ['nextjs', [
        /import.*from ['"]next\//,
        /getServerSideProps|getStaticProps/,
        /next\/router|next\/head/
      ]],
      ['nestjs', [
        /import.*from ['"]@nestjs\//,
        /@Controller|@Service|@Module/,
        /NestFactory\.create/
      ]],
      ['express', [
        /import.*express.*from ['"]express['"]/,
        /app\.get|app\.post|app\.use/,
        /express\(\)/
      ]]
    ]));

    // Python patterns
    this.frameworkPatterns.set('python', new Map([
      ['django', [
        /from django/,
        /import django/,
        /django\.conf|django\.urls/,
        /models\.Model|views\.View/
      ]],
      ['flask', [
        /from flask/,
        /import flask/,
        /Flask\(__name__\)/,
        /@app\.route/
      ]],
      ['fastapi', [
        /from fastapi/,
        /import fastapi/,
        /FastAPI\(\)/,
        /@app\.(get|post|put|delete)/
      ]],
      ['pytorch', [
        /import torch/,
        /torch\.nn|torch\.optim/,
        /torch\.cuda/
      ]],
      ['tensorflow', [
        /import tensorflow/,
        /tf\.|tensorflow\./,
        /keras\./
      ]]
    ]));

    // Java patterns
    this.frameworkPatterns.set('java', new Map([
      ['spring', [
        /import org\.springframework/,
        /@RestController|@Controller|@Service/,
        /@Autowired|@Component/,
        /@RequestMapping|@GetMapping/
      ]],
      ['hibernate', [
        /import org\.hibernate/,
        /@Entity|@Table|@Column/,
        /SessionFactory|Session/
      ]]
    ]));

    // Add more language patterns as needed
  }

  private initializeDependencyMappings(): void {
    this.dependencyMappings.set('typescript', new Map([
      ['react', 'react'],
      ['@types/react', 'react'],
      ['vue', 'vue'],
      ['@angular/core', 'angular'],
      ['next', 'nextjs'],
      ['@nestjs/core', 'nestjs'],
      ['express', 'express']
    ]));

    this.dependencyMappings.set('javascript', new Map([
      ['react', 'react'],
      ['vue', 'vue'],
      ['express', 'express'],
      ['fastify', 'fastify'],
      ['next', 'nextjs']
    ]));

    this.dependencyMappings.set('python', new Map([
      ['django', 'django'],
      ['flask', 'flask'],
      ['fastapi', 'fastapi'],
      ['torch', 'pytorch'],
      ['tensorflow', 'tensorflow']
    ]));

    this.dependencyMappings.set('java', new Map([
      ['spring-boot-starter', 'spring'],
      ['spring-web', 'spring'],
      ['hibernate-core', 'hibernate']
    ]));
  }

  private extractFrameworkFromPattern(pattern: string, language: SupportedLanguage): string | null {
    const patterns = this.frameworkPatterns.get(language);
    if (!patterns) return null;

    for (const [framework, regexes] of patterns.entries()) {
      for (const regex of regexes) {
        if (regex.test(pattern)) {
          return framework;
        }
      }
    }

    return null;
  }

  private getFrameworkFromProjectType(projectType: string, language: SupportedLanguage): string | null {
    const typeMap: Record<string, Record<SupportedLanguage, string>> = {
      'web-app': {
        'typescript': 'react',
        'javascript': 'react',
        'python': 'django'
      },
      'api': {
        'typescript': 'express',
        'javascript': 'express',
        'python': 'fastapi',
        'java': 'spring'
      },
      'mobile': {
        'typescript': 'react-native',
        'javascript': 'react-native',
        'dart': 'flutter'
      },
      'desktop': {
        'typescript': 'electron',
        'javascript': 'electron',
        'rust': 'tauri'
      }
    };

    return typeMap[projectType]?.[language] || null;
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
  }

  private getLanguageFromExtension(ext: string): SupportedLanguage | null {
    const extMap: Record<string, SupportedLanguage> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.cpp': 'cpp',
      '.rs': 'rust',
      '.go': 'go',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.dart': 'dart',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml'
    };

    return extMap[ext] || null;
  }

  private detectLanguageFromContent(content: string): SupportedLanguage | null {
    // Simple heuristics for language detection
    const patterns: Array<{ pattern: RegExp; language: SupportedLanguage }> = [
      { pattern: /import.*from ['"]/, language: 'typescript' },
      { pattern: /def \w+\(.*\):|class \w+:/, language: 'python' },
      { pattern: /public class \w+|import java\./, language: 'java' },
      { pattern: /using System|namespace \w+/, language: 'csharp' },
      { pattern: /fn \w+\(|use std::/, language: 'rust' },
      { pattern: /func \w+\(|package main/, language: 'go' },
      { pattern: /<\?php|function \w+\(/, language: 'php' },
      { pattern: /def \w+|class \w+/, language: 'ruby' },
      { pattern: /func \w+\(|import Foundation/, language: 'swift' },
      { pattern: /fun \w+\(|import kotlin/, language: 'kotlin' },
      { pattern: /void main\(\)|import 'dart:/, language: 'dart' }
    ];

    for (const { pattern, language } of patterns) {
      if (pattern.test(content)) {
        return language;
      }
    }

    return null;
  }
}