/**
 * @fileoverview Code Analysis Service
 * Analyzes code quality, complexity, and provides metrics
 */

import {
  SupportedLanguage,
  CodeMetadata
} from './types';

export interface CodeAnalysis {
  complexity: number;
  quality: number;
  testability: number;
  maintainability: number;
  linesOfCode: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  issues: CodeIssue[];
  metrics: AnalysisMetrics;
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info';
  severity: 'high' | 'medium' | 'low';
  message: string;
  line?: number;
  column?: number;
  rule: string;
  category: 'syntax' | 'style' | 'complexity' | 'security' | 'performance';
}

export interface AnalysisMetrics {
  functions: number;
  classes: number;
  variables: number;
  imports: number;
  exports: number;
  comments: number;
  commentRatio: number;
  averageFunctionLength: number;
  longestFunction: number;
  duplicateLines: number;
}

export class CodeAnalyzer {
  private languagePatterns: Map<SupportedLanguage, LanguageAnalysisPatterns> = new Map();

  constructor() {
    this.initializeLanguagePatterns();
  }

  /**
   * Analyze code and return comprehensive metrics
   */
  async analyze(code: string, language: SupportedLanguage): Promise<CodeAnalysis> {
    const patterns = this.languagePatterns.get(language);
    if (!patterns) {
      throw new Error(`Analysis not supported for language: ${language}`);
    }

    const metrics = this.calculateMetrics(code, patterns);
    const complexity = this.calculateComplexity(code, patterns);
    const issues = this.findIssues(code, language, patterns);
    const quality = this.calculateQuality(metrics, complexity, issues);
    const testability = this.calculateTestability(code, patterns);
    const maintainability = this.calculateMaintainability(metrics, complexity, issues);

    return {
      complexity: complexity.cyclomatic,
      quality,
      testability,
      maintainability,
      linesOfCode: metrics.linesOfCode,
      cyclomaticComplexity: complexity.cyclomatic,
      cognitiveComplexity: complexity.cognitive,
      issues,
      metrics
    };
  }

  /**
   * Get quick analysis for code snippet
   */
  quickAnalyze(code: string, language: SupportedLanguage): Partial<CodeAnalysis> {
    const patterns = this.languagePatterns.get(language);
    if (!patterns) {
      return { quality: 0.5, complexity: 5 };
    }

    const lines = code.split('\n').length;
    const functions = (code.match(patterns.functionPattern) || []).length;
    const complexity = Math.min(10, Math.max(1, functions * 2 + lines / 20));
    const quality = Math.max(0.1, 1 - (complexity / 10));

    return {
      complexity,
      quality,
      linesOfCode: lines
    };
  }

  private initializeLanguagePatterns(): void {
    // TypeScript/JavaScript patterns
    this.languagePatterns.set('typescript', {
      functionPattern: /(?:function\s+\w+|\w+\s*[:=]\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|class\s+\w+)/g,
      classPattern: /class\s+\w+/g,
      variablePattern: /(?:const|let|var)\s+\w+/g,
      importPattern: /import.*from/g,
      exportPattern: /export\s+/g,
      commentPattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      complexityPatterns: {
        if: /\bif\s*\(/g,
        for: /\bfor\s*\(/g,
        while: /\bwhile\s*\(/g,
        switch: /\bswitch\s*\(/g,
        catch: /\bcatch\s*\(/g,
        ternary: /\?[^:]*:/g,
        logicalAnd: /&&/g,
        logicalOr: /\|\|/g
      },
      qualityPatterns: {
        longLines: /.{120,}/g,
        deepNesting: /\s{20,}/g,
        magicNumbers: /\b\d{2,}\b/g,
        todoComments: /\/\/\s*TODO|FIXME|HACK/gi,
        consoleLog: /console\.log/g,
        anyType: /:\s*any\b/g
      }
    });

    // JavaScript (similar to TypeScript but different patterns)
    this.languagePatterns.set('javascript', {
      ...this.languagePatterns.get('typescript')!,
      qualityPatterns: {
        longLines: /.{120,}/g,
        deepNesting: /\s{20,}/g,
        magicNumbers: /\b\d{2,}\b/g,
        todoComments: /\/\/\s*TODO|FIXME|HACK/gi,
        consoleLog: /console\.log/g,
        varUsage: /\bvar\s+/g
      }
    });

    // Python patterns
    this.languagePatterns.set('python', {
      functionPattern: /def\s+\w+|class\s+\w+/g,
      classPattern: /class\s+\w+/g,
      variablePattern: /^\s*\w+\s*=/gm,
      importPattern: /(?:import|from)\s+/g,
      exportPattern: /__all__\s*=/g,
      commentPattern: /#.*$/gm,
      complexityPatterns: {
        if: /\bif\s+/g,
        for: /\bfor\s+/g,
        while: /\bwhile\s+/g,
        try: /\btry:/g,
        except: /\bexcept/g,
        elif: /\belif\s+/g,
        and: /\band\b/g,
        or: /\bor\b/g
      },
      qualityPatterns: {
        longLines: /.{79,}/g,
        deepNesting: /^\s{16,}/gm,
        todoComments: /#\s*TODO|FIXME|HACK/gi,
        printStatements: /\bprint\s*\(/g,
        globalVariables: /\bglobal\s+/g
      }
    });

    // Java patterns
    this.languagePatterns.set('java', {
      functionPattern: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+\w+\s*\(|class\s+\w+/g,
      classPattern: /(?:public|private)?\s*class\s+\w+/g,
      variablePattern: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+\w+\s*[=;]/g,
      importPattern: /import\s+/g,
      exportPattern: /public\s+class/g,
      commentPattern: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
      complexityPatterns: {
        if: /\bif\s*\(/g,
        for: /\bfor\s*\(/g,
        while: /\bwhile\s*\(/g,
        switch: /\bswitch\s*\(/g,
        catch: /\bcatch\s*\(/g,
        ternary: /\?[^:]*:/g
      },
      qualityPatterns: {
        longLines: /.{120,}/g,
        deepNesting: /\s{24,}/g,
        magicNumbers: /\b\d{2,}\b/g,
        todoComments: /\/\/\s*TODO|FIXME|HACK/gi,
        systemOut: /System\.out\.print/g
      }
    });
  }

  private calculateMetrics(code: string, patterns: LanguageAnalysisPatterns): AnalysisMetrics {
    const lines = code.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    const functions = (code.match(patterns.functionPattern) || []).length;
    const classes = (code.match(patterns.classPattern) || []).length;
    const variables = (code.match(patterns.variablePattern) || []).length;
    const imports = (code.match(patterns.importPattern) || []).length;
    const exports = (code.match(patterns.exportPattern) || []).length;
    const comments = (code.match(patterns.commentPattern) || []).length;
    
    const commentRatio = comments / nonEmptyLines.length;
    
    // Calculate function metrics
    const functionBodies = this.extractFunctionBodies(code, patterns);
    const functionLengths = functionBodies.map(body => body.split('\n').length);
    const averageFunctionLength = functionLengths.length > 0 
      ? functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length 
      : 0;
    const longestFunction = functionLengths.length > 0 ? Math.max(...functionLengths) : 0;
    
    // Calculate duplicate lines
    const duplicateLines = this.findDuplicateLines(lines);

    return {
      functions,
      classes,
      variables,
      imports,
      exports,
      comments,
      commentRatio,
      averageFunctionLength,
      longestFunction,
      duplicateLines
    };
  }

  private calculateComplexity(code: string, patterns: LanguageAnalysisPatterns): { cyclomatic: number; cognitive: number } {
    let cyclomaticComplexity = 1; // Base complexity
    let cognitiveComplexity = 0;
    
    // Count complexity-increasing constructs
    for (const [construct, pattern] of Object.entries(patterns.complexityPatterns)) {
      const matches = (code.match(pattern) || []).length;
      cyclomaticComplexity += matches;
      
      // Cognitive complexity weights certain constructs more heavily
      const cognitiveWeight = this.getCognitiveWeight(construct);
      cognitiveComplexity += matches * cognitiveWeight;
    }
    
    // Add nesting penalty for cognitive complexity
    const nestingPenalty = this.calculateNestingPenalty(code);
    cognitiveComplexity += nestingPenalty;
    
    return {
      cyclomatic: Math.min(cyclomaticComplexity, 20), // Cap at 20
      cognitive: Math.min(cognitiveComplexity, 30) // Cap at 30
    };
  }

  private findIssues(code: string, language: SupportedLanguage, patterns: LanguageAnalysisPatterns): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');
    
    // Check quality patterns
    for (const [rule, pattern] of Object.entries(patterns.qualityPatterns)) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const lineNumber = code.substring(0, match.index).split('\n').length;
        
        issues.push({
          type: this.getIssueType(rule),
          severity: this.getIssueSeverity(rule),
          message: this.getIssueMessage(rule, language),
          line: lineNumber,
          rule,
          category: this.getIssueCategory(rule)
        });
      }
    }
    
    // Check for specific language issues
    issues.push(...this.findLanguageSpecificIssues(code, language, lines));
    
    return issues;
  }

  private calculateQuality(metrics: AnalysisMetrics, complexity: { cyclomatic: number; cognitive: number }, issues: CodeIssue[]): number {
    let quality = 1.0;
    
    // Complexity penalty
    quality -= Math.min(0.4, complexity.cyclomatic / 25);
    quality -= Math.min(0.3, complexity.cognitive / 50);
    
    // Issues penalty
    const errorPenalty = issues.filter(i => i.type === 'error').length * 0.1;
    const warningPenalty = issues.filter(i => i.type === 'warning').length * 0.05;
    quality -= Math.min(0.5, errorPenalty + warningPenalty);
    
    // Function length penalty
    if (metrics.averageFunctionLength > 20) {
      quality -= Math.min(0.2, (metrics.averageFunctionLength - 20) / 100);
    }
    
    // Comment ratio bonus/penalty
    if (metrics.commentRatio < 0.1) {
      quality -= 0.1; // Too few comments
    } else if (metrics.commentRatio > 0.3) {
      quality -= 0.05; // Too many comments might indicate unclear code
    } else {
      quality += 0.05; // Good comment ratio
    }
    
    return Math.max(0.1, Math.min(1.0, quality));
  }

  private calculateTestability(code: string, patterns: LanguageAnalysisPatterns): number {
    let testability = 1.0;
    
    // Check for dependency injection patterns
    const diPatterns = [
      /constructor\s*\([^)]+\)/g, // Constructor injection
      /@Injectable|@Inject/g, // DI annotations
      /this\./g // Instance methods (less testable than pure functions)
    ];
    
    const constructorInjection = (code.match(diPatterns[0]) || []).length;
    const diAnnotations = (code.match(diPatterns[1]) || []).length;
    const instanceMethods = (code.match(diPatterns[2]) || []).length;
    
    // Boost testability for DI patterns
    if (constructorInjection > 0 || diAnnotations > 0) {
      testability += 0.2;
    }
    
    // Reduce testability for heavy instance method usage
    if (instanceMethods > 10) {
      testability -= 0.1;
    }
    
    // Check for global state usage
    const globalPatterns = [
      /window\.|global\./g,
      /process\./g,
      /document\./g
    ];
    
    for (const pattern of globalPatterns) {
      const matches = (code.match(pattern) || []).length;
      testability -= Math.min(0.3, matches * 0.05);
    }
    
    return Math.max(0.1, Math.min(1.0, testability));
  }

  private calculateMaintainability(metrics: AnalysisMetrics, complexity: { cyclomatic: number; cognitive: number }, issues: CodeIssue[]): number {
    let maintainability = 1.0;
    
    // Complexity penalty
    maintainability -= Math.min(0.4, complexity.cognitive / 40);
    
    // Function length penalty
    maintainability -= Math.min(0.2, metrics.averageFunctionLength / 50);
    
    // Duplicate code penalty
    maintainability -= Math.min(0.2, metrics.duplicateLines / 20);
    
    // Issues penalty
    const criticalIssues = issues.filter(i => i.severity === 'high').length;
    maintainability -= Math.min(0.3, criticalIssues * 0.1);
    
    // Comment ratio bonus
    if (metrics.commentRatio >= 0.1 && metrics.commentRatio <= 0.25) {
      maintainability += 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, maintainability));
  }

  private extractFunctionBodies(code: string, patterns: LanguageAnalysisPatterns): string[] {
    // Simple extraction - could be enhanced with proper AST parsing
    const functions: string[] = [];
    const lines = code.split('\n');
    let inFunction = false;
    let braceCount = 0;
    let currentFunction = '';
    
    for (const line of lines) {
      if (patterns.functionPattern.test(line)) {
        inFunction = true;
        currentFunction = line + '\n';
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (inFunction) {
        currentFunction += line + '\n';
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        
        if (braceCount <= 0) {
          functions.push(currentFunction);
          inFunction = false;
          currentFunction = '';
        }
      }
    }
    
    return functions;
  }

  private findDuplicateLines(lines: string[]): number {
    const lineMap = new Map<string, number>();
    let duplicates = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10) { // Only consider substantial lines
        const count = lineMap.get(trimmed) || 0;
        lineMap.set(trimmed, count + 1);
        if (count === 1) { // First duplicate
          duplicates += 2; // Count both original and duplicate
        } else if (count > 1) { // Additional duplicates
          duplicates += 1;
        }
      }
    }
    
    return duplicates;
  }

  private getCognitiveWeight(construct: string): number {
    const weights: Record<string, number> = {
      if: 1,
      for: 1,
      while: 1,
      switch: 1,
      catch: 1,
      elif: 1,
      ternary: 1,
      logicalAnd: 1,
      logicalOr: 1,
      and: 1,
      or: 1
    };
    
    return weights[construct] || 1;
  }

  private calculateNestingPenalty(code: string): number {
    const lines = code.split('\n');
    let penalty = 0;
    
    for (const line of lines) {
      const indentation = line.length - line.trimStart().length;
      if (indentation > 16) { // More than 4 levels of nesting (assuming 4 spaces per level)
        penalty += Math.floor(indentation / 4) - 4;
      }
    }
    
    return penalty;
  }

  private getIssueType(rule: string): 'error' | 'warning' | 'info' {
    const errorRules = ['syntaxError', 'undefinedVariable'];
    const warningRules = ['longLines', 'deepNesting', 'consoleLog', 'anyType', 'varUsage'];
    
    if (errorRules.includes(rule)) return 'error';
    if (warningRules.includes(rule)) return 'warning';
    return 'info';
  }

  private getIssueSeverity(rule: string): 'high' | 'medium' | 'low' {
    const highSeverity = ['syntaxError', 'undefinedVariable', 'anyType'];
    const mediumSeverity = ['deepNesting', 'longLines', 'consoleLog'];
    
    if (highSeverity.includes(rule)) return 'high';
    if (mediumSeverity.includes(rule)) return 'medium';
    return 'low';
  }

  private getIssueMessage(rule: string, language: SupportedLanguage): string {
    const messages: Record<string, string> = {
      longLines: 'Line exceeds recommended length',
      deepNesting: 'Deep nesting detected - consider refactoring',
      magicNumbers: 'Magic number detected - consider using named constants',
      todoComments: 'TODO comment found',
      consoleLog: 'Console.log statement found - remove before production',
      anyType: 'Any type used - consider using specific types',
      varUsage: 'var keyword used - prefer let or const',
      printStatements: 'Print statement found - consider using logging',
      systemOut: 'System.out.print found - use proper logging'
    };
    
    return messages[rule] || `${rule} issue detected`;
  }

  private getIssueCategory(rule: string): 'syntax' | 'style' | 'complexity' | 'security' | 'performance' {
    const categories: Record<string, 'syntax' | 'style' | 'complexity' | 'security' | 'performance'> = {
      longLines: 'style',
      deepNesting: 'complexity',
      magicNumbers: 'style',
      todoComments: 'style',
      consoleLog: 'style',
      anyType: 'style',
      varUsage: 'style',
      printStatements: 'style',
      systemOut: 'style'
    };
    
    return categories[rule] || 'style';
  }

  private findLanguageSpecificIssues(code: string, language: SupportedLanguage, lines: string[]): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    // Language-specific checks
    switch (language) {
      case 'typescript':
      case 'javascript':
        // Check for missing semicolons (if project uses them)
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.length > 0 && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}')) {
            if (!line.startsWith('//') && !line.includes('if') && !line.includes('for')) {
              issues.push({
                type: 'info',
                severity: 'low',
                message: 'Missing semicolon',
                line: i + 1,
                rule: 'missingSemicolon',
                category: 'style'
              });
            }
          }
        }
        break;
        
      case 'python':
        // Check for PEP 8 violations
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('\t')) {
            issues.push({
              type: 'warning',
              severity: 'medium',
              message: 'Use spaces instead of tabs',
              line: i + 1,
              rule: 'tabsInsteadOfSpaces',
              category: 'style'
            });
          }
        }
        break;
    }
    
    return issues;
  }
}

interface LanguageAnalysisPatterns {
  functionPattern: RegExp;
  classPattern: RegExp;
  variablePattern: RegExp;
  importPattern: RegExp;
  exportPattern: RegExp;
  commentPattern: RegExp;
  complexityPatterns: Record<string, RegExp>;
  qualityPatterns: Record<string, RegExp>;
}