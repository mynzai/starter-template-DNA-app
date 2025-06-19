/**
 * @fileoverview IDE Extensions System - Epic 6 Story 1 AC3
 * Provides intelligent code completion and template-aware IDE support
 */

import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * IDE extension configuration
 */
export interface IDEExtensionConfig {
  // Language support
  supportedLanguages: string[];
  enableSyntaxHighlighting: boolean;
  enableSemanticHighlighting: boolean;
  
  // IntelliSense features
  enableAutoCompletion: boolean;
  enableParameterHints: boolean;
  enableSignatureHelp: boolean;
  enableHover: boolean;
  enableDefinition: boolean;
  enableReferences: boolean;
  enableDocumentSymbols: boolean;
  enableWorkspaceSymbols: boolean;
  
  // Code actions
  enableCodeActions: boolean;
  enableRefactoring: boolean;
  enableQuickFixes: boolean;
  enableOrganizeImports: boolean;
  
  // Validation and diagnostics
  enableValidation: boolean;
  enableRealTimeDiagnostics: boolean;
  diagnosticSeverity: DiagnosticSeverity;
  
  // Snippets and templates
  enableSnippets: boolean;
  enableTemplateGeneration: boolean;
  customSnippetPath?: string;
  
  // Debugging
  enableDebugging: boolean;
  debuggerConfig: DebuggerConfig;
  
  // Performance
  enableIndexing: boolean;
  indexingDepth: number;
  cacheSize: number;
  
  // UI features
  enableTreeView: boolean;
  enableStatusBar: boolean;
  enableCommands: boolean;
  enableMenus: boolean;
}

/**
 * Diagnostic severity
 */
export enum DiagnosticSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  HINT = 'hint'
}

/**
 * Debugger configuration
 */
export interface DebuggerConfig {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  stopOnEntry?: boolean;
  console?: 'internalConsole' | 'integratedTerminal' | 'externalTerminal';
}

/**
 * Completion item
 */
export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string | MarkdownString;
  sortText?: string;
  filterText?: string;
  insertText?: string | SnippetString;
  insertTextFormat?: InsertTextFormat;
  range?: Range;
  command?: Command;
  commitCharacters?: string[];
  keepWhitespace?: boolean;
  additionalTextEdits?: TextEdit[];
}

/**
 * Completion item kinds
 */
export enum CompletionItemKind {
  TEXT = 1,
  METHOD = 2,
  FUNCTION = 3,
  CONSTRUCTOR = 4,
  FIELD = 5,
  VARIABLE = 6,
  CLASS = 7,
  INTERFACE = 8,
  MODULE = 9,
  PROPERTY = 10,
  UNIT = 11,
  VALUE = 12,
  ENUM = 13,
  KEYWORD = 14,
  SNIPPET = 15,
  COLOR = 16,
  FILE = 17,
  REFERENCE = 18,
  FOLDER = 19,
  ENUM_MEMBER = 20,
  CONSTANT = 21,
  STRUCT = 22,
  EVENT = 23,
  OPERATOR = 24,
  TYPE_PARAMETER = 25
}

/**
 * Insert text format
 */
export enum InsertTextFormat {
  PLAIN_TEXT = 1,
  SNIPPET = 2
}

/**
 * Markdown string
 */
export interface MarkdownString {
  value: string;
  isTrusted?: boolean;
  supportThemeIcons?: boolean;
  supportHtml?: boolean;
  baseUri?: vscode.Uri;
}

/**
 * Snippet string
 */
export interface SnippetString {
  value: string;
  appendText(string: string): SnippetString;
  appendTabstop(number?: number): SnippetString;
  appendPlaceholder(value: string | ((snippet: SnippetString) => any), number?: number): SnippetString;
  appendChoice(values: string[], number?: number): SnippetString;
  appendVariable(name: string, defaultValue: string | ((snippet: SnippetString) => any)): SnippetString;
}

/**
 * Range
 */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * Position
 */
export interface Position {
  line: number;
  character: number;
}

/**
 * Command
 */
export interface Command {
  title: string;
  command: string;
  tooltip?: string;
  arguments?: any[];
}

/**
 * Text edit
 */
export interface TextEdit {
  range: Range;
  newText: string;
}

/**
 * Diagnostic
 */
export interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: string | number;
  codeDescription?: CodeDescription;
  source?: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
  tags?: DiagnosticTag[];
}

/**
 * Code description
 */
export interface CodeDescription {
  href: vscode.Uri;
}

/**
 * Diagnostic related information
 */
export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

/**
 * Location
 */
export interface Location {
  uri: vscode.Uri;
  range: Range;
}

/**
 * Diagnostic tags
 */
export enum DiagnosticTag {
  UNNECESSARY = 1,
  DEPRECATED = 2
}

/**
 * Hover
 */
export interface Hover {
  contents: MarkdownString | MarkdownString[];
  range?: Range;
}

/**
 * Definition
 */
export interface Definition {
  uri: vscode.Uri;
  range: Range;
}

/**
 * Document symbol
 */
export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  tags?: SymbolTag[];
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

/**
 * Symbol kinds
 */
export enum SymbolKind {
  FILE = 1,
  MODULE = 2,
  NAMESPACE = 3,
  PACKAGE = 4,
  CLASS = 5,
  METHOD = 6,
  PROPERTY = 7,
  FIELD = 8,
  CONSTRUCTOR = 9,
  ENUM = 10,
  INTERFACE = 11,
  FUNCTION = 12,
  VARIABLE = 13,
  CONSTANT = 14,
  STRING = 15,
  NUMBER = 16,
  BOOLEAN = 17,
  ARRAY = 18,
  OBJECT = 19,
  KEY = 20,
  NULL = 21,
  ENUM_MEMBER = 22,
  STRUCT = 23,
  EVENT = 24,
  OPERATOR = 25,
  TYPE_PARAMETER = 26
}

/**
 * Symbol tags
 */
export enum SymbolTag {
  DEPRECATED = 1
}

/**
 * Code action
 */
export interface CodeAction {
  title: string;
  kind?: CodeActionKind;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  disabled?: {
    reason: string;
  };
  edit?: WorkspaceEdit;
  command?: Command;
}

/**
 * Code action kinds
 */
export enum CodeActionKind {
  EMPTY = '',
  QUICK_FIX = 'quickfix',
  REFACTOR = 'refactor',
  REFACTOR_EXTRACT = 'refactor.extract',
  REFACTOR_INLINE = 'refactor.inline',
  REFACTOR_REWRITE = 'refactor.rewrite',
  SOURCE = 'source',
  SOURCE_ORGANIZE_IMPORTS = 'source.organizeImports',
  SOURCE_FIX_ALL = 'source.fixAll'
}

/**
 * Workspace edit
 */
export interface WorkspaceEdit {
  changes?: { [uri: string]: TextEdit[] };
  documentChanges?: (TextDocumentEdit | CreateFile | RenameFile | DeleteFile)[];
}

/**
 * Text document edit
 */
export interface TextDocumentEdit {
  textDocument: VersionedTextDocumentIdentifier;
  edits: TextEdit[];
}

/**
 * Versioned text document identifier
 */
export interface VersionedTextDocumentIdentifier {
  uri: vscode.Uri;
  version: number;
}

/**
 * Create file
 */
export interface CreateFile {
  kind: 'create';
  uri: vscode.Uri;
  options?: {
    overwrite?: boolean;
    ignoreIfExists?: boolean;
  };
}

/**
 * Rename file
 */
export interface RenameFile {
  kind: 'rename';
  oldUri: vscode.Uri;
  newUri: vscode.Uri;
  options?: {
    overwrite?: boolean;
    ignoreIfExists?: boolean;
  };
}

/**
 * Delete file
 */
export interface DeleteFile {
  kind: 'delete';
  uri: vscode.Uri;
  options?: {
    recursive?: boolean;
    ignoreIfNotExists?: boolean;
  };
}

/**
 * Template context
 */
export interface TemplateContext {
  templateName: string;
  framework: string;
  modulePath: string;
  moduleType: string;
  exports: string[];
  imports: string[];
  dependencies: string[];
  configuration: any;
}

/**
 * Code template
 */
export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  body: string;
  variables: TemplateVariable[];
  scope: string[];
  prefix: string;
  context?: TemplateContext;
}

/**
 * Template variable
 */
export interface TemplateVariable {
  name: string;
  description?: string;
  default?: string;
  choices?: string[];
  type?: VariableType;
}

/**
 * Variable types
 */
export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  CHOICE = 'choice'
}

/**
 * DNA Module Information
 */
export interface DNAModuleInfo {
  name: string;
  version: string;
  description: string;
  path: string;
  type: string;
  framework: string;
  exports: ExportInfo[];
  imports: ImportInfo[];
  configuration: ConfigurationOption[];
  examples: CodeExample[];
  documentation: string;
}

/**
 * Export information
 */
export interface ExportInfo {
  name: string;
  type: string;
  description?: string;
  signature?: string;
  parameters?: ParameterInfo[];
  returnType?: string;
  examples?: string[];
}

/**
 * Import information
 */
export interface ImportInfo {
  name: string;
  source: string;
  type: 'default' | 'named' | 'namespace';
  alias?: string;
}

/**
 * Parameter information
 */
export interface ParameterInfo {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  default?: string;
}

/**
 * Configuration option
 */
export interface ConfigurationOption {
  name: string;
  type: string;
  description: string;
  required: boolean;
  default?: any;
  examples?: any[];
}

/**
 * Code example
 */
export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
  framework?: string;
}

/**
 * DNA Language Server
 */
export class DNALanguageServer {
  private config: IDEExtensionConfig;
  private eventEmitter: EventEmitter;
  private moduleIndex: Map<string, DNAModuleInfo>;
  private templateIndex: Map<string, CodeTemplate>;
  private diagnostics: Map<string, Diagnostic[]>;
  private completionProviders: Map<string, CompletionProvider>;

  constructor(config: IDEExtensionConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.moduleIndex = new Map();
    this.templateIndex = new Map();
    this.diagnostics = new Map();
    this.completionProviders = new Map();
  }

  /**
   * Initialize the language server
   */
  public async initialize(): Promise<void> {
    this.eventEmitter.emit('server:initializing');
    
    try {
      // Load DNA modules
      await this.loadDNAModules();
      
      // Load templates
      await this.loadTemplates();
      
      // Setup completion providers
      this.setupCompletionProviders();
      
      // Setup diagnostics
      if (this.config.enableValidation) {
        this.setupDiagnostics();
      }
      
      this.eventEmitter.emit('server:initialized');
    } catch (error) {
      this.eventEmitter.emit('server:error', { error });
      throw error;
    }
  }

  /**
   * Provide completions
   */
  public async provideCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.CompletionContext
  ): Promise<CompletionItem[]> {
    const completions: CompletionItem[] = [];
    
    try {
      // Get current line text
      const line = document.lineAt(position.line);
      const lineText = line.text.substring(0, position.character);
      
      // Determine completion context
      const completionContext = this.analyzeCompletionContext(lineText, document, position);
      
      // DNA module completions
      if (completionContext.type === 'import' || completionContext.type === 'module') {
        completions.push(...this.provideDNAModuleCompletions(completionContext));
      }
      
      // Template completions
      if (completionContext.type === 'template') {
        completions.push(...this.provideTemplateCompletions(completionContext));
      }
      
      // Configuration completions
      if (completionContext.type === 'config') {
        completions.push(...this.provideConfigurationCompletions(completionContext));
      }
      
      // Method/property completions
      if (completionContext.type === 'member') {
        completions.push(...this.provideMemberCompletions(completionContext));
      }
      
      // Snippet completions
      if (this.config.enableSnippets) {
        completions.push(...this.provideSnippetCompletions(completionContext));
      }
      
    } catch (error) {
      this.eventEmitter.emit('completion:error', { error, document: document.uri, position });
    }
    
    return completions;
  }

  /**
   * Provide hover information
   */
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<Hover | null> {
    try {
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) return null;
      
      const word = document.getText(wordRange);
      const hoverContext = this.analyzeHoverContext(word, document, position);
      
      // DNA module hover
      const moduleInfo = this.moduleIndex.get(hoverContext.moduleName);
      if (moduleInfo) {
        const exportInfo = moduleInfo.exports.find(e => e.name === word);
        if (exportInfo) {
          return {
            contents: this.createHoverContent(exportInfo, moduleInfo),
            range: wordRange
          };
        }
      }
      
      // Template hover
      const template = this.templateIndex.get(word);
      if (template) {
        return {
          contents: this.createTemplateHoverContent(template),
          range: wordRange
        };
      }
      
      return null;
    } catch (error) {
      this.eventEmitter.emit('hover:error', { error, document: document.uri, position });
      return null;
    }
  }

  /**
   * Provide definitions
   */
  public async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<Definition[]> {
    const definitions: Definition[] = [];
    
    try {
      const wordRange = document.getWordRangeAtPosition(position);
      if (!wordRange) return definitions;
      
      const word = document.getText(wordRange);
      const defContext = this.analyzeDefinitionContext(word, document, position);
      
      // Find DNA module definition
      const moduleInfo = this.moduleIndex.get(defContext.moduleName);
      if (moduleInfo) {
        definitions.push({
          uri: vscode.Uri.file(moduleInfo.path),
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
        });
      }
      
    } catch (error) {
      this.eventEmitter.emit('definition:error', { error, document: document.uri, position });
    }
    
    return definitions;
  }

  /**
   * Provide diagnostics
   */
  public async provideDiagnostics(document: vscode.TextDocument): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    
    try {
      const text = document.getText();
      const templateContext = this.analyzeTemplateContext(text, document);
      
      // Validate DNA module usage
      diagnostics.push(...this.validateDNAModuleUsage(text, templateContext));
      
      // Validate configuration
      diagnostics.push(...this.validateConfiguration(text, templateContext));
      
      // Validate imports
      diagnostics.push(...this.validateImports(text, templateContext));
      
      // Store diagnostics
      this.diagnostics.set(document.uri.toString(), diagnostics);
      
    } catch (error) {
      this.eventEmitter.emit('diagnostics:error', { error, document: document.uri });
    }
    
    return diagnostics;
  }

  /**
   * Provide code actions
   */
  public async provideCodeActions(
    document: vscode.TextDocument,
    range: Range,
    context: vscode.CodeActionContext
  ): Promise<CodeAction[]> {
    const actions: CodeAction[] = [];
    
    try {
      // Quick fixes for diagnostics
      for (const diagnostic of context.diagnostics) {
        const quickFix = this.createQuickFix(diagnostic, document);
        if (quickFix) {
          actions.push(quickFix);
        }
      }
      
      // Refactoring actions
      if (this.config.enableRefactoring) {
        actions.push(...this.provideRefactoringActions(document, range));
      }
      
      // DNA module actions
      actions.push(...this.provideDNAModuleActions(document, range));
      
    } catch (error) {
      this.eventEmitter.emit('codeaction:error', { error, document: document.uri, range });
    }
    
    return actions;
  }

  // Private methods

  private async loadDNAModules(): Promise<void> {
    // Load DNA module information from the project
    const moduleFiles = await this.findDNAModules();
    
    for (const moduleFile of moduleFiles) {
      try {
        const moduleInfo = await this.analyzeDNAModule(moduleFile);
        this.moduleIndex.set(moduleInfo.name, moduleInfo);
      } catch (error) {
        console.warn(`Failed to load DNA module: ${moduleFile}`, error);
      }
    }
  }

  private async findDNAModules(): Promise<string[]> {
    const moduleFiles: string[] = [];
    
    // Search in common DNA module directories
    const searchPaths = [
      'libs/dna-modules',
      'src/modules',
      'modules',
      'dna'
    ];
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const files = await this.scanForModules(searchPath);
        moduleFiles.push(...files);
      }
    }
    
    return moduleFiles;
  }

  private async scanForModules(dir: string): Promise<string[]> {
    const modules: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          modules.push(...await this.scanForModules(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.ts') && entry.name.includes('module')) {
          modules.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or is not accessible
    }
    
    return modules;
  }

  private async analyzeDNAModule(filePath: string): Promise<DNAModuleInfo> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    
    // Simple analysis - in practice would use TypeScript compiler API
    const moduleInfo: DNAModuleInfo = {
      name: path.basename(filePath, '.ts'),
      version: '1.0.0',
      description: this.extractDescription(content),
      path: filePath,
      type: this.extractModuleType(content),
      framework: this.extractFramework(content),
      exports: this.extractExports(content),
      imports: this.extractImports(content),
      configuration: this.extractConfiguration(content),
      examples: this.extractExamples(content),
      documentation: this.extractDocumentation(content)
    };
    
    return moduleInfo;
  }

  private extractDescription(content: string): string {
    const match = content.match(/@fileoverview\s+(.+)/);
    return match ? match[1].trim() : '';
  }

  private extractModuleType(content: string): string {
    if (content.includes('extends BaseDNAModule')) {
      return 'dna-module';
    }
    if (content.includes('export class')) {
      return 'class';
    }
    if (content.includes('export function')) {
      return 'function';
    }
    return 'unknown';
  }

  private extractFramework(content: string): string {
    if (content.includes('SupportedFramework.NEXTJS')) {
      return 'nextjs';
    }
    if (content.includes('SupportedFramework.TAURI')) {
      return 'tauri';
    }
    if (content.includes('SupportedFramework.SVELTEKIT')) {
      return 'sveltekit';
    }
    return 'all';
  }

  private extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = [];
    
    // Extract class exports
    const classRegex = /export\s+class\s+(\w+)/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'class',
        description: this.extractExportDescription(content, match.index)
      });
    }
    
    // Extract function exports
    const functionRegex = /export\s+(?:async\s+)?function\s+(\w+)/g;
    while ((match = functionRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'function',
        description: this.extractExportDescription(content, match.index)
      });
    }
    
    // Extract interface exports
    const interfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      exports.push({
        name: match[1],
        type: 'interface',
        description: this.extractExportDescription(content, match.index)
      });
    }
    
    return exports;
  }

  private extractExportDescription(content: string, position: number): string {
    // Look for JSDoc comment before the export
    const beforeExport = content.substring(0, position);
    const commentMatch = beforeExport.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n\s*\*\//);
    return commentMatch ? commentMatch[1] : '';
  }

  private extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    const importRegex = /import\s+(?:(\w+)|{([^}]+)}|\*\s+as\s+(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const [, defaultImport, namedImports, namespaceImport, source] = match;
      
      if (defaultImport) {
        imports.push({
          name: defaultImport,
          source,
          type: 'default'
        });
      }
      
      if (namedImports) {
        const names = namedImports.split(',').map(n => n.trim());
        for (const name of names) {
          const [importName, alias] = name.includes(' as ') ? name.split(' as ') : [name, undefined];
          imports.push({
            name: importName.trim(),
            source,
            type: 'named',
            alias: alias?.trim()
          });
        }
      }
      
      if (namespaceImport) {
        imports.push({
          name: namespaceImport,
          source,
          type: 'namespace'
        });
      }
    }
    
    return imports;
  }

  private extractConfiguration(content: string): ConfigurationOption[] {
    const config: ConfigurationOption[] = [];
    
    // Look for interface definitions ending with Config
    const configInterfaceRegex = /interface\s+(\w*Config)\s*{([^}]+)}/g;
    let match;
    
    while ((match = configInterfaceRegex.exec(content)) !== null) {
      const [, interfaceName, body] = match;
      
      // Parse properties
      const propertyRegex = /(\w+)(\?)?:\s*([^;]+);/g;
      let propMatch;
      
      while ((propMatch = propertyRegex.exec(body)) !== null) {
        const [, name, optional, type] = propMatch;
        
        config.push({
          name,
          type: type.trim(),
          description: `Configuration option for ${interfaceName}`,
          required: !optional
        });
      }
    }
    
    return config;
  }

  private extractExamples(content: string): CodeExample[] {
    const examples: CodeExample[] = [];
    
    // Look for code examples in comments
    const exampleRegex = /@example\s*\n\s*```(\w+)?\s*\n([\s\S]*?)\n\s*```/g;
    let match;
    
    while ((match = exampleRegex.exec(content)) !== null) {
      const [, language, code] = match;
      
      examples.push({
        title: 'Usage Example',
        description: 'Example usage of this module',
        code: code.trim(),
        language: language || 'typescript'
      });
    }
    
    return examples;
  }

  private extractDocumentation(content: string): string {
    // Extract JSDoc documentation
    const docRegex = /\/\*\*\s*\n([\s\S]*?)\n\s*\*\//;
    const match = content.match(docRegex);
    
    if (match) {
      return match[1]
        .split('\n')
        .map(line => line.replace(/^\s*\*\s?/, ''))
        .join('\n')
        .trim();
    }
    
    return '';
  }

  private async loadTemplates(): Promise<void> {
    // Load built-in templates
    const builtInTemplates = this.getBuiltInTemplates();
    for (const template of builtInTemplates) {
      this.templateIndex.set(template.id, template);
    }
    
    // Load custom templates
    if (this.config.customSnippetPath && fs.existsSync(this.config.customSnippetPath)) {
      const customTemplates = await this.loadCustomTemplates(this.config.customSnippetPath);
      for (const template of customTemplates) {
        this.templateIndex.set(template.id, template);
      }
    }
  }

  private getBuiltInTemplates(): CodeTemplate[] {
    return [
      {
        id: 'dna-module',
        name: 'DNA Module',
        description: 'Create a new DNA module',
        prefix: 'dna-module',
        scope: ['typescript'],
        body: `/**
 * @fileoverview \${1:Module Description}
 */

import { BaseDNAModule } from '@dna/core';
import { DNAModuleMetadata, DNAModuleFile, DNAModuleContext } from '@dna/types';

export class \${2:ModuleName}Module extends BaseDNAModule {
  constructor() {
    super();
  }

  public getMetadata(): DNAModuleMetadata {
    return {
      name: '\${3:module-name}',
      version: '1.0.0',
      description: '\${1:Module Description}',
      // ...other metadata
    };
  }

  public generateFiles(context: DNAModuleContext): DNAModuleFile[] {
    return [
      {
        path: '\${4:file-path}',
        content: this.generateFile(context)
      }
    ];
  }

  private generateFile(context: DNAModuleContext): string {
    return \`// Generated file content\`;
  }
}`,
        variables: [
          { name: '1', description: 'Module description' },
          { name: '2', description: 'Module class name' },
          { name: '3', description: 'Module ID' },
          { name: '4', description: 'Generated file path' }
        ]
      },
      {
        id: 'dna-config',
        name: 'DNA Configuration',
        description: 'Create module configuration interface',
        prefix: 'dna-config',
        scope: ['typescript'],
        body: `export interface \${1:ModuleName}Config {
  // Basic settings
  enabled: boolean;
  
  // \${2:Configuration description}
  \${3:optionName}: \${4:string};
  
  // Optional settings
  \${5:optionalOption}?: \${6:number};
}

export const default\${1:ModuleName}Config: \${1:ModuleName}Config = {
  enabled: true,
  \${3:optionName}: '\${7:default-value}',
  \${5:optionalOption}: \${8:42}
};`,
        variables: [
          { name: '1', description: 'Module name' },
          { name: '2', description: 'Configuration description' },
          { name: '3', description: 'Option name' },
          { name: '4', description: 'Option type', choices: ['string', 'number', 'boolean'] },
          { name: '5', description: 'Optional option name' },
          { name: '6', description: 'Optional option type', choices: ['string', 'number', 'boolean'] },
          { name: '7', description: 'Default value' },
          { name: '8', description: 'Default number value' }
        ]
      }
    ];
  }

  private async loadCustomTemplates(snippetPath: string): Promise<CodeTemplate[]> {
    try {
      const content = await fs.promises.readFile(snippetPath, 'utf-8');
      const snippets = JSON.parse(content);
      
      return Object.entries(snippets).map(([key, snippet]: [string, any]) => ({
        id: key,
        name: snippet.name || key,
        description: snippet.description || '',
        prefix: snippet.prefix,
        scope: snippet.scope || [],
        body: Array.isArray(snippet.body) ? snippet.body.join('\n') : snippet.body,
        variables: []
      }));
    } catch (error) {
      console.warn('Failed to load custom templates:', error);
      return [];
    }
  }

  private setupCompletionProviders(): void {
    // Setup completion providers for different contexts
    this.completionProviders.set('import', new ImportCompletionProvider(this.moduleIndex));
    this.completionProviders.set('config', new ConfigCompletionProvider(this.moduleIndex));
    this.completionProviders.set('template', new TemplateCompletionProvider(this.templateIndex));
  }

  private setupDiagnostics(): void {
    // Setup diagnostic providers
  }

  private analyzeCompletionContext(lineText: string, document: vscode.TextDocument, position: vscode.Position): any {
    // Analyze the context for completion
    if (lineText.includes('import')) {
      return { type: 'import', line: lineText };
    }
    
    if (lineText.includes('new ') && lineText.includes('Module')) {
      return { type: 'module', line: lineText };
    }
    
    if (lineText.includes('Config')) {
      return { type: 'config', line: lineText };
    }
    
    if (lineText.includes('.')) {
      return { type: 'member', line: lineText };
    }
    
    return { type: 'general', line: lineText };
  }

  private analyzeHoverContext(word: string, document: vscode.TextDocument, position: vscode.Position): any {
    // Analyze context for hover information
    return { word, moduleName: this.findModuleName(document, position) };
  }

  private analyzeDefinitionContext(word: string, document: vscode.TextDocument, position: vscode.Position): any {
    // Analyze context for definition lookup
    return { word, moduleName: this.findModuleName(document, position) };
  }

  private analyzeTemplateContext(text: string, document: vscode.TextDocument): TemplateContext {
    // Analyze the template context
    return {
      templateName: '',
      framework: 'nextjs', // Default
      modulePath: document.uri.fsPath,
      moduleType: 'component',
      exports: [],
      imports: [],
      dependencies: [],
      configuration: {}
    };
  }

  private findModuleName(document: vscode.TextDocument, position: vscode.Position): string {
    // Find the DNA module name from imports or context
    const text = document.getText();
    const importMatch = text.match(/import.*from\s+['"]@dna\/(\w+)['"]/);
    return importMatch ? importMatch[1] : '';
  }

  private provideDNAModuleCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    for (const [name, moduleInfo] of this.moduleIndex) {
      completions.push({
        label: name,
        kind: CompletionItemKind.MODULE,
        detail: moduleInfo.description,
        documentation: moduleInfo.documentation,
        insertText: name
      });
    }
    
    return completions;
  }

  private provideTemplateCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    for (const [id, template] of this.templateIndex) {
      completions.push({
        label: template.prefix,
        kind: CompletionItemKind.SNIPPET,
        detail: template.name,
        documentation: template.description,
        insertText: template.body,
        insertTextFormat: InsertTextFormat.SNIPPET
      });
    }
    
    return completions;
  }

  private provideConfigurationCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    for (const moduleInfo of this.moduleIndex.values()) {
      for (const configOption of moduleInfo.configuration) {
        completions.push({
          label: configOption.name,
          kind: CompletionItemKind.PROPERTY,
          detail: configOption.type,
          documentation: configOption.description,
          insertText: configOption.name
        });
      }
    }
    
    return completions;
  }

  private provideMemberCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    // Extract object/class name from context
    const objectMatch = context.line.match(/(\w+)\./);
    if (!objectMatch) return completions;
    
    const objectName = objectMatch[1];
    
    // Find module with matching export
    for (const moduleInfo of this.moduleIndex.values()) {
      const exportInfo = moduleInfo.exports.find(e => e.name === objectName);
      if (exportInfo && exportInfo.type === 'class') {
        // Add class methods and properties
        // This would require more sophisticated analysis
      }
    }
    
    return completions;
  }

  private provideSnippetCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    for (const template of this.templateIndex.values()) {
      if (template.scope.length === 0 || template.scope.includes('typescript')) {
        completions.push({
          label: template.prefix,
          kind: CompletionItemKind.SNIPPET,
          detail: template.name,
          documentation: template.description,
          insertText: template.body,
          insertTextFormat: InsertTextFormat.SNIPPET
        });
      }
    }
    
    return completions;
  }

  private createHoverContent(exportInfo: ExportInfo, moduleInfo: DNAModuleInfo): MarkdownString {
    const content = [
      `**${exportInfo.name}** (${exportInfo.type})`,
      '',
      exportInfo.description || '',
      '',
      `*From ${moduleInfo.name}*`
    ];
    
    if (exportInfo.signature) {
      content.push('', '```typescript', exportInfo.signature, '```');
    }
    
    if (exportInfo.examples && exportInfo.examples.length > 0) {
      content.push('', '**Examples:**');
      for (const example of exportInfo.examples) {
        content.push('', '```typescript', example, '```');
      }
    }
    
    return {
      value: content.join('\n'),
      isTrusted: true,
      supportThemeIcons: true
    };
  }

  private createTemplateHoverContent(template: CodeTemplate): MarkdownString {
    const content = [
      `**${template.name}**`,
      '',
      template.description,
      '',
      '```typescript',
      template.body,
      '```'
    ];
    
    return {
      value: content.join('\n'),
      isTrusted: true,
      supportThemeIcons: true
    };
  }

  private validateDNAModuleUsage(text: string, context: TemplateContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    
    // Check for missing imports
    const moduleUsageRegex = /new\s+(\w+Module)/g;
    let match;
    
    while ((match = moduleUsageRegex.exec(text)) !== null) {
      const moduleName = match[1];
      const hasImport = text.includes(`import.*${moduleName}`);
      
      if (!hasImport) {
        diagnostics.push({
          range: this.getRange(text, match.index, match[0].length),
          severity: DiagnosticSeverity.ERROR,
          message: `Missing import for ${moduleName}`,
          source: 'dna-language-server'
        });
      }
    }
    
    return diagnostics;
  }

  private validateConfiguration(text: string, context: TemplateContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    
    // Validate configuration objects
    // This would require more sophisticated parsing
    
    return diagnostics;
  }

  private validateImports(text: string, context: TemplateContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    
    // Check for unused imports
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(text)) !== null) {
      const imports = match[1].split(',').map(i => i.trim());
      const source = match[2];
      
      for (const importName of imports) {
        const used = text.includes(importName) && text.indexOf(importName) !== match.index;
        
        if (!used) {
          diagnostics.push({
            range: this.getRange(text, match.index, match[0].length),
            severity: DiagnosticSeverity.WARNING,
            message: `Unused import '${importName}'`,
            source: 'dna-language-server',
            tags: [DiagnosticTag.UNNECESSARY]
          });
        }
      }
    }
    
    return diagnostics;
  }

  private createQuickFix(diagnostic: Diagnostic, document: vscode.TextDocument): CodeAction | null {
    if (diagnostic.message.includes('Missing import')) {
      const moduleName = diagnostic.message.match(/Missing import for (\w+)/)?.[1];
      if (moduleName) {
        return {
          title: `Add import for ${moduleName}`,
          kind: CodeActionKind.QUICK_FIX,
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [document.uri.toString()]: [
                {
                  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
                  newText: `import { ${moduleName} } from '@dna/modules';\n`
                }
              ]
            }
          }
        };
      }
    }
    
    if (diagnostic.message.includes('Unused import')) {
      return {
        title: 'Remove unused import',
        kind: CodeActionKind.QUICK_FIX,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [document.uri.toString()]: [
              {
                range: diagnostic.range,
                newText: ''
              }
            ]
          }
        }
      };
    }
    
    return null;
  }

  private provideRefactoringActions(document: vscode.TextDocument, range: Range): CodeAction[] {
    const actions: CodeAction[] = [];
    
    // Extract to DNA module
    actions.push({
      title: 'Extract to DNA Module',
      kind: CodeActionKind.REFACTOR_EXTRACT,
      edit: {
        // Implementation would create new module file
      }
    });
    
    return actions;
  }

  private provideDNAModuleActions(document: vscode.TextDocument, range: Range): CodeAction[] {
    const actions: CodeAction[] = [];
    
    // Generate DNA module
    actions.push({
      title: 'Generate DNA Module',
      kind: CodeActionKind.SOURCE,
      command: {
        title: 'Generate DNA Module',
        command: 'dna.generateModule',
        arguments: [document.uri, range]
      }
    });
    
    return actions;
  }

  private getRange(text: string, start: number, length: number): Range {
    const lines = text.substring(0, start).split('\n');
    const startLine = lines.length - 1;
    const startCharacter = lines[startLine].length;
    
    const endText = text.substring(0, start + length);
    const endLines = endText.split('\n');
    const endLine = endLines.length - 1;
    const endCharacter = endLines[endLine].length;
    
    return {
      start: { line: startLine, character: startCharacter },
      end: { line: endLine, character: endCharacter }
    };
  }
}

/**
 * Completion provider interface
 */
interface CompletionProvider {
  provideCompletions(context: any): CompletionItem[];
}

/**
 * Import completion provider
 */
class ImportCompletionProvider implements CompletionProvider {
  constructor(private moduleIndex: Map<string, DNAModuleInfo>) {}

  provideCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    for (const [name, moduleInfo] of this.moduleIndex) {
      completions.push({
        label: `@dna/${name}`,
        kind: CompletionItemKind.MODULE,
        detail: moduleInfo.description,
        insertText: `@dna/${name}`
      });
    }
    
    return completions;
  }
}

/**
 * Config completion provider
 */
class ConfigCompletionProvider implements CompletionProvider {
  constructor(private moduleIndex: Map<string, DNAModuleInfo>) {}

  provideCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    for (const moduleInfo of this.moduleIndex.values()) {
      for (const option of moduleInfo.configuration) {
        completions.push({
          label: option.name,
          kind: CompletionItemKind.PROPERTY,
          detail: option.type,
          documentation: option.description,
          insertText: `${option.name}: ${this.getDefaultValue(option)}`
        });
      }
    }
    
    return completions;
  }

  private getDefaultValue(option: ConfigurationOption): string {
    if (option.default !== undefined) {
      return JSON.stringify(option.default);
    }
    
    switch (option.type) {
      case 'string': return "''";
      case 'number': return '0';
      case 'boolean': return 'false';
      default: return '{}';
    }
  }
}

/**
 * Template completion provider
 */
class TemplateCompletionProvider implements CompletionProvider {
  constructor(private templateIndex: Map<string, CodeTemplate>) {}

  provideCompletions(context: any): CompletionItem[] {
    const completions: CompletionItem[] = [];
    
    for (const template of this.templateIndex.values()) {
      completions.push({
        label: template.prefix,
        kind: CompletionItemKind.SNIPPET,
        detail: template.name,
        documentation: template.description,
        insertText: template.body,
        insertTextFormat: InsertTextFormat.SNIPPET
      });
    }
    
    return completions;
  }
}

/**
 * Create DNA language server
 */
export function createDNALanguageServer(config?: Partial<IDEExtensionConfig>): DNALanguageServer {
  const defaultConfig: IDEExtensionConfig = {
    supportedLanguages: ['typescript', 'javascript', 'json'],
    enableSyntaxHighlighting: true,
    enableSemanticHighlighting: true,
    enableAutoCompletion: true,
    enableParameterHints: true,
    enableSignatureHelp: true,
    enableHover: true,
    enableDefinition: true,
    enableReferences: true,
    enableDocumentSymbols: true,
    enableWorkspaceSymbols: true,
    enableCodeActions: true,
    enableRefactoring: true,
    enableQuickFixes: true,
    enableOrganizeImports: true,
    enableValidation: true,
    enableRealTimeDiagnostics: true,
    diagnosticSeverity: DiagnosticSeverity.ERROR,
    enableSnippets: true,
    enableTemplateGeneration: true,
    enableDebugging: true,
    debuggerConfig: {
      type: 'node',
      request: 'launch',
      name: 'Debug DNA Module'
    },
    enableIndexing: true,
    indexingDepth: 5,
    cacheSize: 1000,
    enableTreeView: true,
    enableStatusBar: true,
    enableCommands: true,
    enableMenus: true
  };
  
  return new DNALanguageServer({ ...defaultConfig, ...config });
}