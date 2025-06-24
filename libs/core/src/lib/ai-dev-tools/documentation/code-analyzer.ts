/**
 * @fileoverview Documentation Code Analyzer
 * Analyzes source code to extract documentation-relevant information
 */

import { EventEmitter } from 'events';
import {
  CodeAnalysisResult,
  FunctionInfo,
  ClassInfo,
  InterfaceInfo,
  TypeInfo,
  ConstantInfo,
  ModuleInfo,
  SupportedDocLanguage,
  CodeComplexity,
  ParameterInfo,
  MethodInfo,
  PropertyInfo,
  SourceLocation
} from './types';

export class CodeAnalyzer extends EventEmitter {
  private initialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.emit('analyzer:initialized');
  }

  async analyzeCode(sourceCode: string, language: SupportedDocLanguage): Promise<CodeAnalysisResult> {
    if (!this.initialized) {
      throw new Error('CodeAnalyzer not initialized');
    }

    this.emit('analysis:started', { language });

    try {
      const result: CodeAnalysisResult = {
        functions: await this.extractFunctions(sourceCode, language),
        classes: await this.extractClasses(sourceCode, language),
        interfaces: await this.extractInterfaces(sourceCode, language),
        types: await this.extractTypes(sourceCode, language),
        constants: await this.extractConstants(sourceCode, language),
        modules: await this.extractModules(sourceCode, language),
        dependencies: await this.extractDependencies(sourceCode, language),
        complexity: await this.calculateComplexity(sourceCode, language)
      };

      this.emit('analysis:completed', { 
        language, 
        functions: result.functions.length,
        classes: result.classes.length,
        complexity: result.complexity.overall
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('analysis:error', { error: errorMessage, language });
      throw error;
    }
  }

  private async extractFunctions(sourceCode: string, language: SupportedDocLanguage): Promise<FunctionInfo[]> {
    const functions: FunctionInfo[] = [];
    const lines = sourceCode.split('\n');

    // Language-specific function patterns
    const patterns = this.getFunctionPatterns(language);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const func = await this.parseFunctionFromMatch(match, lines, i, language, pattern.type);
          if (func) {
            functions.push(func);
          }
        }
      }
    }

    return functions;
  }

  private async extractClasses(sourceCode: string, language: SupportedDocLanguage): Promise<ClassInfo[]> {
    const classes: ClassInfo[] = [];
    const lines = sourceCode.split('\n');

    const patterns = this.getClassPatterns(language);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      for (const pattern of patterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const cls = await this.parseClassFromMatch(match, lines, i, language);
          if (cls) {
            classes.push(cls);
          }
        }
      }
    }

    return classes;
  }

  private async extractInterfaces(sourceCode: string, language: SupportedDocLanguage): Promise<InterfaceInfo[]> {
    const interfaces: InterfaceInfo[] = [];
    
    if (language === 'typescript' || language === 'java' || language === 'csharp') {
      const lines = sourceCode.split('\n');
      const patterns = this.getInterfacePatterns(language);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        for (const pattern of patterns) {
          const match = line.match(pattern.regex);
          if (match) {
            const iface = await this.parseInterfaceFromMatch(match, lines, i, language);
            if (iface) {
              interfaces.push(iface);
            }
          }
        }
      }
    }

    return interfaces;
  }

  private async extractTypes(sourceCode: string, language: SupportedDocLanguage): Promise<TypeInfo[]> {
    const types: TypeInfo[] = [];
    
    if (language === 'typescript') {
      const typePattern = /type\s+(\w+)\s*=\s*([^;]+);?/g;
      let match;
      
      while ((match = typePattern.exec(sourceCode)) !== null) {
        types.push({
          name: match[1],
          type: match[2].trim(),
          description: this.extractComment(sourceCode, match.index),
          nullable: false,
          optional: false,
          examples: []
        });
      }
    }

    return types;
  }

  private async extractConstants(sourceCode: string, language: SupportedDocLanguage): Promise<ConstantInfo[]> {
    const constants: ConstantInfo[] = [];
    const patterns = this.getConstantPatterns(language);
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(sourceCode)) !== null) {
        constants.push({
          name: match[pattern.nameGroup],
          value: match[pattern.valueGroup],
          type: this.inferType(match[pattern.valueGroup]),
          description: this.extractComment(sourceCode, match.index),
          isPublic: this.isPublicDeclaration(match[0]),
          sourceLocation: this.getSourceLocation(sourceCode, match.index, match[0])
        });
      }
    }

    return constants;
  }

  private async extractModules(sourceCode: string, language: SupportedDocLanguage): Promise<ModuleInfo[]> {
    const modules: ModuleInfo[] = [];
    
    // Extract import/export information
    const imports = this.extractImports(sourceCode, language);
    const exports = this.extractExports(sourceCode, language);
    
    if (imports.length > 0 || exports.length > 0) {
      modules.push({
        name: 'main',
        description: 'Main module',
        exports,
        imports,
        path: '',
        dependencies: imports.map(imp => imp.from)
      });
    }

    return modules;
  }

  private async extractDependencies(sourceCode: string, language: SupportedDocLanguage): Promise<any[]> {
    const dependencies: any[] = [];
    const imports = this.extractImports(sourceCode, language);
    
    const uniqueModules = [...new Set(imports.map(imp => imp.from))];
    
    for (const module of uniqueModules) {
      if (!module.startsWith('.') && !module.startsWith('/')) {
        dependencies.push({
          name: module,
          version: 'latest',
          type: 'production',
          description: `External dependency: ${module}`
        });
      }
    }

    return dependencies;
  }

  private async calculateComplexity(sourceCode: string, language: SupportedDocLanguage): Promise<CodeComplexity> {
    const lines = sourceCode.split('\n');
    let cyclomaticComplexity = 1; // Base complexity
    let cognitiveComplexity = 0;
    
    const complexityKeywords = this.getComplexityKeywords(language);
    
    for (const line of lines) {
      for (const keyword of complexityKeywords) {
        if (line.includes(keyword)) {
          cyclomaticComplexity++;
          cognitiveComplexity += this.getCognitiveWeight(keyword);
        }
      }
    }

    const maintainability = Math.max(0, 100 - cyclomaticComplexity * 2 - cognitiveComplexity);
    const overall = Math.round((cyclomaticComplexity + cognitiveComplexity) / 2);

    return {
      overall,
      cyclomatic: cyclomaticComplexity,
      cognitive: cognitiveComplexity,
      maintainability,
      factors: [
        {
          type: 'code_complexity',
          score: overall,
          description: `Cyclomatic: ${cyclomaticComplexity}, Cognitive: ${cognitiveComplexity}`
        }
      ]
    };
  }

  // Helper methods for language-specific parsing
  private getFunctionPatterns(language: SupportedDocLanguage) {
    const patterns: Array<{regex: RegExp; type: string}> = [];
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        patterns.push(
          { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*{/, type: 'function' },
          { regex: /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*(?::\s*([^=]+))?\s*=>/, type: 'arrow' },
          { regex: /(\w+)\s*\(([^)]*)\)\s*(?::\s*([^{]+))?\s*{/, type: 'method' }
        );
        break;
      case 'python':
        patterns.push(
          { regex: /def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/, type: 'function' },
          { regex: /async\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/, type: 'async_function' }
        );
        break;
      case 'java':
        patterns.push(
          { regex: /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[\w\s,]+)?\s*{/, type: 'method' }
        );
        break;
      case 'csharp':
        patterns.push(
          { regex: /(?:public|private|protected|internal)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s+(\w+)\s*\(([^)]*)\)\s*{/, type: 'method' }
        );
        break;
      case 'go':
        patterns.push(
          { regex: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(([^)]*)\)\s*(?:\(([^)]*)\))?\s*{/, type: 'function' }
        );
        break;
      case 'rust':
        patterns.push(
          { regex: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^{]+))?\s*{/, type: 'function' }
        );
        break;
    }
    
    return patterns;
  }

  private getClassPatterns(language: SupportedDocLanguage) {
    const patterns: Array<{regex: RegExp}> = [];
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        patterns.push(
          { regex: /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\s,]+))?\s*{/ }
        );
        break;
      case 'python':
        patterns.push(
          { regex: /class\s+(\w+)(?:\(([^)]+)\))?\s*:/ }
        );
        break;
      case 'java':
      case 'csharp':
        patterns.push(
          { regex: /(?:public|private|protected)?\s*(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w\s,]+))?\s*{/ }
        );
        break;
    }
    
    return patterns;
  }

  private getInterfacePatterns(language: SupportedDocLanguage) {
    const patterns: Array<{regex: RegExp}> = [];
    
    switch (language) {
      case 'typescript':
        patterns.push(
          { regex: /(?:export\s+)?interface\s+(\w+)(?:\s+extends\s+([\w\s,]+))?\s*{/ }
        );
        break;
      case 'java':
      case 'csharp':
        patterns.push(
          { regex: /(?:public|private|protected)?\s*interface\s+(\w+)(?:\s+extends\s+([\w\s,]+))?\s*{/ }
        );
        break;
    }
    
    return patterns;
  }

  private getConstantPatterns(language: SupportedDocLanguage) {
    const patterns: Array<{regex: RegExp; nameGroup: number; valueGroup: number}> = [];
    
    switch (language) {
      case 'javascript':
      case 'typescript':
        patterns.push(
          { regex: /const\s+(\w+)\s*=\s*([^;]+);?/g, nameGroup: 1, valueGroup: 2 }
        );
        break;
      case 'python':
        patterns.push(
          { regex: /(\w+)\s*=\s*([^#\n]+)/g, nameGroup: 1, valueGroup: 2 }
        );
        break;
      case 'java':
        patterns.push(
          { regex: /(?:public\s+)?(?:static\s+)?final\s+\w+\s+(\w+)\s*=\s*([^;]+);/g, nameGroup: 1, valueGroup: 2 }
        );
        break;
    }
    
    return patterns;
  }

  private getComplexityKeywords(language: SupportedDocLanguage): string[] {
    const keywords: Record<SupportedDocLanguage, string[]> = {
      'javascript': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 'try'],
      'typescript': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 'try'],
      'python': ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally'],
      'java': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 'try'],
      'csharp': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 'try'],
      'go': ['if', 'else', 'for', 'switch', 'case', 'select'],
      'rust': ['if', 'else', 'for', 'while', 'loop', 'match'],
      'php': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 'try'],
      'ruby': ['if', 'else', 'elsif', 'for', 'while', 'until', 'case', 'when', 'rescue'],
      'swift': ['if', 'else', 'for', 'while', 'repeat', 'switch', 'case', 'catch', 'try'],
      'kotlin': ['if', 'else', 'for', 'while', 'do', 'when', 'try', 'catch'],
      'dart': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 'try'],
      'scala': ['if', 'else', 'for', 'while', 'do', 'match', 'case', 'try', 'catch'],
      'cpp': ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'catch', 'try'],
      'c': ['if', 'else', 'for', 'while', 'do', 'switch', 'case'],
      'shell': ['if', 'else', 'elif', 'for', 'while', 'case'],
      'sql': ['if', 'else', 'case', 'when'],
      'yaml': [],
      'json': []
    };
    
    return keywords[language] || [];
  }

  private getCognitiveWeight(keyword: string): number {
    const weights: Record<string, number> = {
      'if': 1,
      'else': 1,
      'elif': 1,
      'for': 1,
      'while': 1,
      'do': 1,
      'switch': 1,
      'case': 0.5,
      'catch': 1,
      'try': 1
    };
    
    return weights[keyword] || 1;
  }

  private async parseFunctionFromMatch(
    match: RegExpMatchArray, 
    lines: string[], 
    lineIndex: number, 
    language: SupportedDocLanguage,
    type: string
  ): Promise<FunctionInfo | null> {
    const name = match[1];
    const paramsStr = match[2] || '';
    const returnTypeStr = match[3] || 'void';
    
    const parameters = this.parseParameters(paramsStr, language);
    const returnType = this.parseType(returnTypeStr, language);
    const description = this.extractComment(lines.join('\n'), lineIndex);
    const isAsync = lines[lineIndex].includes('async');
    const isPublic = this.isPublicDeclaration(lines[lineIndex]);
    const isStatic = lines[lineIndex].includes('static');

    return {
      name,
      description,
      parameters,
      returnType,
      isAsync,
      isPublic,
      isStatic,
      examples: [],
      throws: [],
      tags: [],
      sourceLocation: {
        file: '',
        line: lineIndex + 1,
        column: 1
      }
    };
  }

  private async parseClassFromMatch(
    match: RegExpMatchArray, 
    lines: string[], 
    lineIndex: number, 
    language: SupportedDocLanguage
  ): Promise<ClassInfo | null> {
    const name = match[1];
    const extendsClass = match[2] || '';
    const implementsStr = match[3] || '';
    
    const implements = implementsStr ? implementsStr.split(',').map(s => s.trim()) : [];
    const description = this.extractComment(lines.join('\n'), lineIndex);
    const isPublic = this.isPublicDeclaration(lines[lineIndex]);
    const isAbstract = lines[lineIndex].includes('abstract');

    return {
      name,
      description,
      extends: extendsClass,
      implements,
      constructors: [],
      methods: [],
      properties: [],
      isPublic,
      isAbstract,
      generics: [],
      examples: [],
      tags: [],
      sourceLocation: {
        file: '',
        line: lineIndex + 1,
        column: 1
      }
    };
  }

  private async parseInterfaceFromMatch(
    match: RegExpMatchArray, 
    lines: string[], 
    lineIndex: number, 
    language: SupportedDocLanguage
  ): Promise<InterfaceInfo | null> {
    const name = match[1];
    const extendsStr = match[2] || '';
    
    const extends_ = extendsStr ? extendsStr.split(',').map(s => s.trim()) : [];
    const description = this.extractComment(lines.join('\n'), lineIndex);

    return {
      name,
      description,
      extends: extends_,
      methods: [],
      properties: [],
      generics: [],
      examples: [],
      tags: [],
      sourceLocation: {
        file: '',
        line: lineIndex + 1,
        column: 1
      }
    };
  }

  private parseParameters(paramsStr: string, language: SupportedDocLanguage): ParameterInfo[] {
    if (!paramsStr.trim()) return [];
    
    const params = paramsStr.split(',').map(p => p.trim());
    const parameters: ParameterInfo[] = [];
    
    for (const param of params) {
      if (!param) continue;
      
      let name = '';
      let type = 'any';
      let required = true;
      let defaultValue: any = undefined;
      
      // Parse based on language syntax
      switch (language) {
        case 'typescript':
        case 'javascript':
          const tsMatch = param.match(/(\w+)(\?)?:\s*([^=]+)(?:\s*=\s*(.+))?/);
          if (tsMatch) {
            name = tsMatch[1];
            required = !tsMatch[2];
            type = tsMatch[3].trim();
            defaultValue = tsMatch[4]?.trim();
          } else {
            const jsMatch = param.match(/(\w+)(?:\s*=\s*(.+))?/);
            if (jsMatch) {
              name = jsMatch[1];
              defaultValue = jsMatch[2]?.trim();
              required = !jsMatch[2];
            }
          }
          break;
        case 'python':
          const pyMatch = param.match(/(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?/);
          if (pyMatch) {
            name = pyMatch[1];
            type = pyMatch[2]?.trim() || 'Any';
            defaultValue = pyMatch[3]?.trim();
            required = !pyMatch[3];
          }
          break;
        default:
          const genericMatch = param.match(/(?:(\w+)\s+)?(\w+)(?:\s*=\s*(.+))?/);
          if (genericMatch) {
            type = genericMatch[1] || 'any';
            name = genericMatch[2];
            defaultValue = genericMatch[3]?.trim();
            required = !genericMatch[3];
          }
      }
      
      if (name) {
        parameters.push({
          name,
          type: this.parseType(type, language),
          required,
          defaultValue
        });
      }
    }
    
    return parameters;
  }

  private parseType(typeStr: string, language: SupportedDocLanguage): TypeInfo {
    const cleanType = typeStr.trim();
    
    return {
      name: cleanType,
      type: cleanType,
      nullable: cleanType.includes('null') || cleanType.includes('undefined'),
      optional: cleanType.includes('?') || cleanType.includes('undefined'),
      examples: []
    };
  }

  private extractImports(sourceCode: string, language: SupportedDocLanguage): any[] {
    const imports: any[] = [];
    
    const patterns: Record<SupportedDocLanguage, RegExp[]> = {
      'javascript': [/import\s+(?:(.+)\s+from\s+)?['"](.*?)['"];?/g],
      'typescript': [/import\s+(?:(.+)\s+from\s+)?['"](.*?)['"];?/g],
      'python': [/from\s+(.*?)\s+import\s+(.*)/g, /import\s+(.*)/g],
      'java': [/import\s+(.*?);/g],
      'csharp': [/using\s+(.*?);/g],
      'go': [/import\s+['"](.*?)['"];?/g],
      'rust': [/use\s+(.*?);/g]
    };
    
    const importPatterns = patterns[language] || patterns['javascript'];
    
    for (const pattern of importPatterns) {
      let match;
      while ((match = pattern.exec(sourceCode)) !== null) {
        const importData = this.parseImportMatch(match, language);
        if (importData) {
          imports.push(importData);
        }
      }
    }
    
    return imports;
  }

  private extractExports(sourceCode: string, language: SupportedDocLanguage): any[] {
    const exports: any[] = [];
    
    const exportPattern = /export\s+(?:default\s+)?(?:(?:const|let|var|function|class|interface|type)\s+)?(\w+)/g;
    let match;
    
    while ((match = exportPattern.exec(sourceCode)) !== null) {
      exports.push({
        name: match[1],
        type: 'unknown',
        isDefault: match[0].includes('default')
      });
    }
    
    return exports;
  }

  private parseImportMatch(match: RegExpMatchArray, language: SupportedDocLanguage): any {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return {
          name: match[1] || 'default',
          from: match[2],
          isDefault: !match[1] || match[1].trim() === ''
        };
      case 'python':
        if (match[0].startsWith('from')) {
          return {
            name: match[2],
            from: match[1],
            isDefault: false
          };
        } else {
          return {
            name: match[1],
            from: match[1],
            isDefault: true
          };
        }
      default:
        return {
          name: match[1],
          from: match[1],
          isDefault: false
        };
    }
  }

  private extractComment(sourceCode: string, position: number): string | undefined {
    const lines = sourceCode.substring(0, position).split('\n');
    const currentLineIndex = lines.length - 1;
    
    // Look for comment on previous lines
    for (let i = currentLineIndex - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('//') || line.startsWith('#')) {
        return line.replace(/^(\/\/|#)\s*/, '');
      } else if (line.startsWith('/*') || line.startsWith('/**')) {
        // Multi-line comment - extract content
        let comment = '';
        for (let j = i; j < currentLineIndex; j++) {
          const commentLine = lines[j].trim();
          if (commentLine.includes('*/')) break;
          comment += commentLine.replace(/^(\/\*\*?|\*)\s*/, '') + ' ';
        }
        return comment.trim();
      } else if (line !== '') {
        // Non-empty, non-comment line - stop looking
        break;
      }
    }
    
    return undefined;
  }

  private isPublicDeclaration(declaration: string): boolean {
    return !declaration.includes('private') && 
           !declaration.includes('protected') && 
           !declaration.includes('internal');
  }

  private inferType(value: string): string {
    value = value.trim();
    
    if (value === 'true' || value === 'false') return 'boolean';
    if (value.match(/^\d+$/)) return 'number';
    if (value.match(/^\d*\.\d+$/)) return 'number';
    if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) return 'string';
    if (value.startsWith('[') && value.endsWith(']')) return 'array';
    if (value.startsWith('{') && value.endsWith('}')) return 'object';
    
    return 'unknown';
  }

  private getSourceLocation(sourceCode: string, position: number, matchText: string): SourceLocation {
    const beforeMatch = sourceCode.substring(0, position);
    const lines = beforeMatch.split('\n');
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    
    return {
      file: '',
      line,
      column,
      endLine: line,
      endColumn: column + matchText.length
    };
  }
}