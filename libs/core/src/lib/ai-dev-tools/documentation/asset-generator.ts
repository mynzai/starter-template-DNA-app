/**
 * @fileoverview Asset Generator
 * Generates documentation assets like diagrams, images, and code snippets
 */

import { EventEmitter } from 'events';
import {
  DocumentationAsset,
  AssetType,
  AssetMetadata,
  DocumentationSection,
  CodeAnalysisResult,
  FunctionInfo,
  ClassInfo
} from './types';

export class AssetGenerator extends EventEmitter {
  private initialized = false;
  private assetGenerators: Map<AssetType, AssetGeneratorFunction> = new Map();

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load built-in asset generators
    await this.loadBuiltInGenerators();
    
    this.initialized = true;
    this.emit('generator:initialized', { generatorsLoaded: this.assetGenerators.size });
  }

  async generateDiagrams(codeAnalysis: CodeAnalysisResult): Promise<DocumentationAsset[]> {
    if (!this.initialized) {
      throw new Error('AssetGenerator not initialized');
    }

    this.emit('generation:started', { type: 'diagrams', analysisData: codeAnalysis });

    const assets: DocumentationAsset[] = [];

    try {
      // Generate class diagram if classes exist
      if (codeAnalysis.classes.length > 0) {
        const classDiagram = await this.generateClassDiagram(codeAnalysis.classes);
        if (classDiagram) assets.push(classDiagram);
      }

      // Generate dependency diagram if modules exist
      if (codeAnalysis.modules.length > 0) {
        const dependencyDiagram = await this.generateDependencyDiagram(codeAnalysis);
        if (dependencyDiagram) assets.push(dependencyDiagram);
      }

      // Generate flow diagram for complex functions
      const complexFunctions = codeAnalysis.functions.filter(f => f.parameters.length > 3);
      if (complexFunctions.length > 0) {
        const flowDiagram = await this.generateFlowDiagram(complexFunctions);
        if (flowDiagram) assets.push(flowDiagram);
      }

      // Generate architecture overview
      const architectureDiagram = await this.generateArchitectureDiagram(codeAnalysis);
      if (architectureDiagram) assets.push(architectureDiagram);

      this.emit('generation:completed', { 
        type: 'diagrams', 
        assetsGenerated: assets.length 
      });

      return assets;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('generation:error', { type: 'diagrams', error: errorMessage });
      throw error;
    }
  }

  async generateCodeSnippets(sections: DocumentationSection[]): Promise<DocumentationAsset[]> {
    if (!this.initialized) {
      throw new Error('AssetGenerator not initialized');
    }

    this.emit('generation:started', { type: 'code_snippets', sectionsCount: sections.length });

    const assets: DocumentationAsset[] = [];

    try {
      for (const section of sections) {
        // Extract code blocks from section content
        const codeBlocks = this.extractCodeBlocks(section.content);
        
        for (let i = 0; i < codeBlocks.length; i++) {
          const codeBlock = codeBlocks[i];
          const asset = await this.createCodeSnippetAsset(codeBlock, section, i);
          if (asset) assets.push(asset);
        }

        // Generate interactive examples for API sections
        if (section.type === 'api_reference') {
          const interactiveAsset = await this.generateInteractiveExample(section);
          if (interactiveAsset) assets.push(interactiveAsset);
        }
      }

      this.emit('generation:completed', { 
        type: 'code_snippets', 
        assetsGenerated: assets.length 
      });

      return assets;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('generation:error', { type: 'code_snippets', error: errorMessage });
      throw error;
    }
  }

  async generateAsset(
    type: AssetType,
    options: AssetGenerationOptions
  ): Promise<DocumentationAsset | null> {
    const generator = this.assetGenerators.get(type);
    if (!generator) {
      throw new Error(`No generator found for asset type: ${type}`);
    }

    this.emit('asset:generation:started', { type, options });

    try {
      const asset = await generator(options);
      
      this.emit('asset:generation:completed', { type, asset });
      
      return asset;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('asset:generation:error', { type, error: errorMessage });
      throw error;
    }
  }

  async addAssetGenerator(type: AssetType, generator: AssetGeneratorFunction): Promise<void> {
    this.assetGenerators.set(type, generator);
    this.emit('generator:added', { type });
  }

  getSupportedAssetTypes(): AssetType[] {
    return Array.from(this.assetGenerators.keys());
  }

  private async loadBuiltInGenerators(): Promise<void> {
    // Image generator
    await this.addAssetGenerator('image', async (options: AssetGenerationOptions) => {
      const asset: DocumentationAsset = {
        id: `img-${Date.now()}`,
        type: 'image',
        name: options.name || 'Generated Image',
        path: options.outputPath || `/assets/images/generated-${Date.now()}.png`,
        size: 0, // Would be calculated after actual generation
        format: 'png',
        metadata: {
          alt: options.altText || options.name || 'Generated documentation image',
          title: options.title,
          description: options.description,
          width: options.width || 800,
          height: options.height || 600,
          tags: options.tags || ['generated', 'documentation']
        }
      };

      return asset;
    });

    // Diagram generator
    await this.addAssetGenerator('diagram', async (options: AssetGenerationOptions) => {
      const diagramContent = await this.generateMermaidDiagram(options);
      
      const asset: DocumentationAsset = {
        id: `diagram-${Date.now()}`,
        type: 'diagram',
        name: options.name || 'Generated Diagram',
        path: options.outputPath || `/assets/diagrams/diagram-${Date.now()}.svg`,
        size: diagramContent.length,
        format: 'svg',
        metadata: {
          alt: options.altText || `${options.diagramType} diagram`,
          title: options.title,
          description: options.description,
          tags: options.tags || ['diagram', 'generated', options.diagramType || 'flow']
        }
      };

      return asset;
    });

    // Code snippet generator
    await this.addAssetGenerator('code_snippet', async (options: AssetGenerationOptions) => {
      const asset: DocumentationAsset = {
        id: `code-${Date.now()}`,
        type: 'code_snippet',
        name: options.name || 'Code Example',
        path: options.outputPath || `/assets/code/snippet-${Date.now()}.${options.language || 'txt'}`,
        size: options.code?.length || 0,
        format: options.language || 'text',
        metadata: {
          language: options.language,
          description: options.description,
          title: options.title,
          tags: options.tags || ['code', 'example', options.language || 'generic']
        }
      };

      return asset;
    });

    // Interactive demo generator
    await this.addAssetGenerator('interactive_demo', async (options: AssetGenerationOptions) => {
      const demoContent = await this.generateInteractiveDemo(options);
      
      const asset: DocumentationAsset = {
        id: `demo-${Date.now()}`,
        type: 'interactive_demo',
        name: options.name || 'Interactive Demo',
        path: options.outputPath || `/assets/demos/demo-${Date.now()}.html`,
        size: demoContent.length,
        format: 'html',
        metadata: {
          description: options.description,
          title: options.title,
          tags: options.tags || ['interactive', 'demo', 'example']
        }
      };

      return asset;
    });

    // API collection generator
    await this.addAssetGenerator('api_collection', async (options: AssetGenerationOptions) => {
      const collection = await this.generateAPICollection(options);
      
      const asset: DocumentationAsset = {
        id: `collection-${Date.now()}`,
        type: 'api_collection',
        name: options.name || 'API Collection',
        path: options.outputPath || `/assets/collections/collection-${Date.now()}.json`,
        size: JSON.stringify(collection).length,
        format: 'json',
        metadata: {
          description: options.description || 'Generated API collection',
          title: options.title,
          tags: options.tags || ['api', 'collection', 'postman']
        }
      };

      return asset;
    });
  }

  private async generateClassDiagram(classes: ClassInfo[]): Promise<DocumentationAsset | null> {
    if (classes.length === 0) return null;

    const mermaidCode = this.generateClassDiagramMermaid(classes);
    
    return {
      id: `class-diagram-${Date.now()}`,
      type: 'diagram',
      name: 'Class Diagram',
      path: `/assets/diagrams/class-diagram-${Date.now()}.svg`,
      size: mermaidCode.length,
      format: 'svg',
      metadata: {
        alt: 'Class relationship diagram',
        description: 'Diagram showing class relationships and structure',
        tags: ['diagram', 'class', 'uml', 'mermaid']
      }
    };
  }

  private async generateDependencyDiagram(codeAnalysis: CodeAnalysisResult): Promise<DocumentationAsset | null> {
    if (codeAnalysis.dependencies.length === 0) return null;

    const mermaidCode = this.generateDependencyDiagramMermaid(codeAnalysis);
    
    return {
      id: `dependency-diagram-${Date.now()}`,
      type: 'diagram',
      name: 'Dependency Diagram',
      path: `/assets/diagrams/dependency-diagram-${Date.now()}.svg`,
      size: mermaidCode.length,
      format: 'svg',
      metadata: {
        alt: 'Module dependency diagram',
        description: 'Diagram showing module dependencies and relationships',
        tags: ['diagram', 'dependency', 'modules', 'mermaid']
      }
    };
  }

  private async generateFlowDiagram(functions: FunctionInfo[]): Promise<DocumentationAsset | null> {
    if (functions.length === 0) return null;

    const mermaidCode = this.generateFlowDiagramMermaid(functions);
    
    return {
      id: `flow-diagram-${Date.now()}`,
      type: 'diagram',
      name: 'Function Flow Diagram',
      path: `/assets/diagrams/flow-diagram-${Date.now()}.svg`,
      size: mermaidCode.length,
      format: 'svg',
      metadata: {
        alt: 'Function flow diagram',
        description: 'Diagram showing function execution flow and logic',
        tags: ['diagram', 'flow', 'functions', 'mermaid']
      }
    };
  }

  private async generateArchitectureDiagram(codeAnalysis: CodeAnalysisResult): Promise<DocumentationAsset | null> {
    const mermaidCode = this.generateArchitectureDiagramMermaid(codeAnalysis);
    
    return {
      id: `architecture-diagram-${Date.now()}`,
      type: 'diagram',
      name: 'Architecture Overview',
      path: `/assets/diagrams/architecture-${Date.now()}.svg`,
      size: mermaidCode.length,
      format: 'svg',
      metadata: {
        alt: 'System architecture diagram',
        description: 'High-level overview of system architecture and components',
        tags: ['diagram', 'architecture', 'overview', 'mermaid']
      }
    };
  }

  private extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    return codeBlocks;
  }

  private async createCodeSnippetAsset(
    codeBlock: CodeBlock,
    section: DocumentationSection,
    index: number
  ): Promise<DocumentationAsset | null> {
    if (!codeBlock.code.trim()) return null;

    return {
      id: `code-${section.id}-${index}`,
      type: 'code_snippet',
      name: `${section.title} - Code Example ${index + 1}`,
      path: `/assets/code/${section.id}-example-${index}.${this.getFileExtension(codeBlock.language)}`,
      size: codeBlock.code.length,
      format: codeBlock.language,
      metadata: {
        language: codeBlock.language,
        description: `Code example from ${section.title}`,
        tags: ['code', 'example', codeBlock.language, section.type]
      }
    };
  }

  private async generateInteractiveExample(section: DocumentationSection): Promise<DocumentationAsset | null> {
    const demoHTML = this.generateInteractiveDemoHTML(section);
    
    return {
      id: `interactive-${section.id}`,
      type: 'interactive_demo',
      name: `${section.title} - Interactive Example`,
      path: `/assets/demos/${section.id}-demo.html`,
      size: demoHTML.length,
      format: 'html',
      metadata: {
        description: `Interactive demo for ${section.title}`,
        tags: ['interactive', 'demo', section.type, 'api']
      }
    };
  }

  private generateClassDiagramMermaid(classes: ClassInfo[]): string {
    let mermaid = 'classDiagram\n';
    
    classes.forEach(cls => {
      mermaid += `  class ${cls.name} {\n`;
      
      // Add properties
      cls.properties.forEach(prop => {
        const visibility = prop.isPublic ? '+' : '-';
        mermaid += `    ${visibility}${prop.name}: ${prop.type.name}\n`;
      });
      
      // Add methods
      cls.methods.forEach(method => {
        const visibility = method.isPublic ? '+' : '-';
        const params = method.parameters.map(p => `${p.name}: ${p.type.name}`).join(', ');
        mermaid += `    ${visibility}${method.name}(${params}): ${method.returnType.name}\n`;
      });
      
      mermaid += '  }\n';
      
      // Add inheritance relationships
      if (cls.extends) {
        mermaid += `  ${cls.extends} <|-- ${cls.name}\n`;
      }
      
      // Add interface implementations
      cls.implements.forEach(iface => {
        mermaid += `  ${iface} <|.. ${cls.name}\n`;
      });
    });
    
    return mermaid;
  }

  private generateDependencyDiagramMermaid(codeAnalysis: CodeAnalysisResult): string {
    let mermaid = 'graph TD\n';
    
    codeAnalysis.modules.forEach(module => {
      module.dependencies.forEach(dep => {
        mermaid += `  ${module.name} --> ${dep}\n`;
      });
    });
    
    // Add external dependencies
    codeAnalysis.dependencies.forEach(dep => {
      mermaid += `  App --> ${dep.name}\n`;
    });
    
    return mermaid;
  }

  private generateFlowDiagramMermaid(functions: FunctionInfo[]): string {
    let mermaid = 'flowchart TD\n';
    
    functions.forEach((func, index) => {
      const nodeId = `func${index}`;
      mermaid += `  ${nodeId}[${func.name}]\n`;
      
      // Add parameter validation steps
      if (func.parameters.length > 0) {
        const validationId = `val${index}`;
        mermaid += `  ${validationId}{Validate Parameters}\n`;
        mermaid += `  ${nodeId} --> ${validationId}\n`;
      }
      
      // Add async handling
      if (func.isAsync) {
        const asyncId = `async${index}`;
        mermaid += `  ${asyncId}[Async Operation]\n`;
        mermaid += `  ${nodeId} --> ${asyncId}\n`;
      }
    });
    
    return mermaid;
  }

  private generateArchitectureDiagramMermaid(codeAnalysis: CodeAnalysisResult): string {
    let mermaid = 'graph TB\n';
    
    // Add modules as components
    codeAnalysis.modules.forEach(module => {
      mermaid += `  ${module.name}[${module.name}]\n`;
    });
    
    // Add classes as sub-components
    codeAnalysis.classes.forEach(cls => {
      mermaid += `  ${cls.name}[${cls.name}]\n`;
    });
    
    // Add dependencies
    codeAnalysis.dependencies.forEach(dep => {
      mermaid += `  ${dep.name}[(${dep.name})]\n`;
      mermaid += `  App --> ${dep.name}\n`;
    });
    
    return mermaid;
  }

  private async generateMermaidDiagram(options: AssetGenerationOptions): Promise<string> {
    switch (options.diagramType) {
      case 'flowchart':
        return 'flowchart TD\n  A[Start] --> B[Process] --> C[End]';
      case 'sequence':
        return 'sequenceDiagram\n  participant A\n  participant B\n  A->>B: Message\n  B-->>A: Response';
      case 'class':
        return 'classDiagram\n  class Example {\n    +method()\n  }';
      default:
        return 'graph TD\n  A --> B';
    }
  }

  private async generateInteractiveDemo(options: AssetGenerationOptions): Promise<string> {
    return `<!DOCTYPE html>
<html>
<head>
    <title>${options.title || 'Interactive Demo'}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .demo-container { max-width: 800px; margin: 0 auto; }
        .code-example { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        button { padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #005a87; }
    </style>
</head>
<body>
    <div class="demo-container">
        <h1>${options.title || 'Interactive Demo'}</h1>
        <p>${options.description || 'Try out the example below:'}</p>
        
        <div class="code-example">
            <pre><code>${options.code || 'console.log("Hello, World!");'}</code></pre>
        </div>
        
        <button onclick="runExample()">Run Example</button>
        <div id="output"></div>
        
        <script>
            function runExample() {
                const output = document.getElementById('output');
                output.innerHTML = '<p>Example executed successfully!</p>';
            }
        </script>
    </div>
</body>
</html>`;
  }

  private async generateAPICollection(options: AssetGenerationOptions): Promise<any> {
    return {
      info: {
        name: options.name || 'Generated API Collection',
        description: options.description || 'Auto-generated API collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Example Request',
          request: {
            method: 'GET',
            header: [],
            url: {
              raw: '{{base_url}}/api/example',
              host: ['{{base_url}}'],
              path: ['api', 'example']
            }
          }
        }
      ],
      variable: [
        {
          key: 'base_url',
          value: 'https://api.example.com'
        }
      ]
    };
  }

  private generateInteractiveDemoHTML(section: DocumentationSection): string {
    const codeBlocks = this.extractCodeBlocks(section.content);
    const firstCodeBlock = codeBlocks[0];
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>${section.title} - Interactive Demo</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 20px; }
        .demo { max-width: 800px; margin: 0 auto; }
        .code-block { background: #f6f8fa; padding: 16px; border-radius: 6px; margin: 16px 0; }
        .run-button { background: #0366d6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
        .output { background: #f1f8ff; border: 1px solid #c8e1ff; padding: 16px; border-radius: 6px; margin: 16px 0; }
    </style>
</head>
<body>
    <div class="demo">
        <h1>${section.title}</h1>
        <p>Interactive example based on the documentation.</p>
        
        ${firstCodeBlock ? `
        <div class="code-block">
            <pre><code>${firstCodeBlock.code}</code></pre>
        </div>
        <button class="run-button" onclick="runCode()">Try it</button>
        ` : ''}
        
        <div id="output" class="output" style="display: none;">
            <h3>Output:</h3>
            <div id="result"></div>
        </div>
    </div>
    
    <script>
        function runCode() {
            const output = document.getElementById('output');
            const result = document.getElementById('result');
            output.style.display = 'block';
            result.innerHTML = 'Code executed successfully! Check the browser console for actual output.';
            
            ${firstCodeBlock && firstCodeBlock.language === 'javascript' ? 
              `try { ${firstCodeBlock.code} } catch(e) { result.innerHTML = 'Error: ' + e.message; }` :
              '// Code execution simulation'
            }
        }
    </script>
</body>
</html>`;
  }

  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'java': 'java',
      'csharp': 'cs',
      'go': 'go',
      'rust': 'rs',
      'php': 'php',
      'ruby': 'rb',
      'swift': 'swift',
      'kotlin': 'kt',
      'dart': 'dart',
      'scala': 'scala',
      'cpp': 'cpp',
      'c': 'c',
      'shell': 'sh',
      'sql': 'sql',
      'yaml': 'yml',
      'json': 'json'
    };
    
    return extensions[language] || 'txt';
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.assetGenerators.clear();
    this.emit('generator:shutdown');
  }
}

interface CodeBlock {
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

interface AssetGenerationOptions {
  name?: string;
  title?: string;
  description?: string;
  outputPath?: string;
  altText?: string;
  width?: number;
  height?: number;
  tags?: string[];
  language?: string;
  code?: string;
  diagramType?: string;
  data?: any;
}

type AssetGeneratorFunction = (options: AssetGenerationOptions) => Promise<DocumentationAsset | null>;