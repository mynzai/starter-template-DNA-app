/**
 * @fileoverview Documentation Template Engine
 * Renders documentation using templates for various formats
 */

import { EventEmitter } from 'events';
import {
  DocumentationFormat,
  DocumentationSection,
  DocumentationAsset,
  MarkdownOutputOptions,
  DocumentationTemplate,
  TemplateVariable,
  StyleConfig
} from './types';

export class DocumentationTemplateEngine extends EventEmitter {
  private initialized = false;
  private templates: Map<string, DocumentationTemplate> = new Map();
  private compiledTemplates: Map<string, Function> = new Map();

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load built-in templates
    await this.loadBuiltInTemplates();
    
    this.initialized = true;
    this.emit('engine:initialized');
  }

  async renderDocumentation(
    format: DocumentationFormat,
    sections: DocumentationSection[],
    assets: DocumentationAsset[],
    options?: MarkdownOutputOptions
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('DocumentationTemplateEngine not initialized');
    }

    this.emit('render:started', { format, sectionsCount: sections.length });

    try {
      let content = '';

      switch (format) {
        case 'markdown':
          content = await this.renderMarkdown(sections, assets, options);
          break;
        case 'html':
          content = await this.renderHTML(sections, assets, options);
          break;
        case 'json':
          content = await this.renderJSON(sections, assets);
          break;
        case 'openapi':
          content = await this.renderOpenAPI(sections, assets);
          break;
        case 'docusaurus':
          content = await this.renderDocusaurus(sections, assets, options);
          break;
        default:
          content = await this.renderMarkdown(sections, assets, options);
      }

      this.emit('render:completed', { format, contentLength: content.length });
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('render:error', { error: errorMessage, format });
      throw error;
    }
  }

  async loadTemplate(template: DocumentationTemplate): Promise<void> {
    this.templates.set(template.id, template);
    
    // Compile template for performance
    const compiled = this.compileTemplate(template.template);
    this.compiledTemplates.set(template.id, compiled);
    
    this.emit('template:loaded', { templateId: template.id });
  }

  async renderWithTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const compiled = this.compiledTemplates.get(templateId);
    if (!compiled) {
      throw new Error(`Compiled template not found: ${templateId}`);
    }

    // Validate required variables
    const missingVars = template.variables
      .filter(v => v.required && !(v.name in variables))
      .map(v => v.name);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    // Apply default values
    const mergedVariables = { ...variables };
    template.variables.forEach(v => {
      if (!(v.name in mergedVariables) && v.defaultValue !== undefined) {
        mergedVariables[v.name] = v.defaultValue;
      }
    });

    return compiled(mergedVariables);
  }

  private async renderMarkdown(
    sections: DocumentationSection[],
    assets: DocumentationAsset[],
    options?: MarkdownOutputOptions
  ): Promise<string> {
    let content = '';

    // Add table of contents if enabled
    if (options?.includeTableOfContents) {
      content += this.generateTableOfContents(sections, options.tocDepth || 3);
      content += '\n\n';
    }

    // Render sections
    for (const section of sections) {
      content += this.renderSection(section, 'markdown');
      content += '\n\n';
    }

    // Add assets section if needed
    if (assets.length > 0) {
      content += this.renderAssetsSection(assets, 'markdown');
    }

    // Add back to top links if enabled
    if (options?.includeBackToTop) {
      content = this.addBackToTopLinks(content);
    }

    return content;
  }

  private async renderHTML(
    sections: DocumentationSection[],
    assets: DocumentationAsset[],
    options?: MarkdownOutputOptions
  ): Promise<string> {
    const theme = options?.theme || 'github';
    const customCSS = options?.customCSS || '';
    const customJS = options?.customJavaScript || '';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation</title>
    ${this.generateStylesheet(theme, customCSS)}
    ${options?.enableMathJax ? this.getMathJaxScript() : ''}
</head>
<body>
    ${options?.navigation?.header ? this.renderHeader(options.navigation.header) : ''}
    
    <div class="documentation-container">
        ${options?.navigation?.sidebar ? this.renderSidebar(sections, options.navigation.sidebar) : ''}
        
        <main class="content">
            ${options?.navigation?.breadcrumbs ? this.renderBreadcrumbs(sections) : ''}
            
            ${options?.includeTableOfContents ? this.generateHTMLTableOfContents(sections, options.tocDepth || 3) : ''}
            
            ${sections.map(section => this.renderSection(section, 'html')).join('\n')}
            
            ${assets.length > 0 ? this.renderAssetsSection(assets, 'html') : ''}
        </main>
    </div>
    
    ${options?.navigation?.footer ? this.renderFooter(options.navigation.footer) : ''}
    ${customJS ? `<script>${customJS}</script>` : ''}
    ${options?.searchEnabled ? this.getSearchScript() : ''}
</body>
</html>`;

    return html;
  }

  private async renderJSON(
    sections: DocumentationSection[],
    assets: DocumentationAsset[]
  ): Promise<string> {
    const documentation = {
      sections,
      assets,
      metadata: {
        generatedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0.0'
      }
    };

    return JSON.stringify(documentation, null, 2);
  }

  private async renderOpenAPI(
    sections: DocumentationSection[],
    assets: DocumentationAsset[]
  ): Promise<string> {
    // Extract API sections and convert to OpenAPI format
    const apiSections = sections.filter(s => s.type === 'api_reference');
    
    const openapi = {
      openapi: '3.0.0',
      info: {
        title: 'Generated API Documentation',
        version: '1.0.0',
        description: 'Auto-generated API documentation'
      },
      paths: this.extractPathsFromSections(apiSections),
      components: {
        schemas: this.extractSchemasFromSections(apiSections)
      }
    };

    return JSON.stringify(openapi, null, 2);
  }

  private async renderDocusaurus(
    sections: DocumentationSection[],
    assets: DocumentationAsset[],
    options?: MarkdownOutputOptions
  ): Promise<string> {
    const frontmatter = {
      id: 'generated-docs',
      title: 'Generated Documentation',
      sidebar_position: 1
    };

    let content = '---\n';
    content += Object.entries(frontmatter)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
      .join('\n');
    content += '\n---\n\n';

    // Render sections in Docusaurus-compatible markdown
    for (const section of sections) {
      content += this.renderSection(section, 'docusaurus');
      content += '\n\n';
    }

    return content;
  }

  private renderSection(section: DocumentationSection, format: string): string {
    const headerPrefix = '#'.repeat(section.level);
    
    switch (format) {
      case 'markdown':
      case 'docusaurus':
        let markdown = `${headerPrefix} ${section.title}\n\n${section.content}`;
        
        // Render subsections
        if (section.subsections.length > 0) {
          markdown += '\n\n';
          markdown += section.subsections
            .map(subsection => this.renderSection(subsection, format))
            .join('\n\n');
        }
        
        return markdown;
        
      case 'html':
        const tagLevel = Math.min(section.level, 6);
        let html = `<section id="${section.id}">
    <h${tagLevel}>${section.title}</h${tagLevel}>
    <div class="section-content">${this.markdownToHTML(section.content)}</div>`;
        
        if (section.subsections.length > 0) {
          html += '\n    <div class="subsections">\n';
          html += section.subsections
            .map(subsection => '        ' + this.renderSection(subsection, format))
            .join('\n');
          html += '\n    </div>';
        }
        
        html += '\n</section>';
        return html;
        
      default:
        return section.content;
    }
  }

  private renderAssetsSection(assets: DocumentationAsset[], format: string): string {
    if (format === 'html') {
      return `<section class="assets">
    <h2>Assets</h2>
    <div class="assets-grid">
        ${assets.map(asset => this.renderAssetHTML(asset)).join('\n        ')}
    </div>
</section>`;
    } else {
      return `## Assets\n\n${assets.map(asset => this.renderAssetMarkdown(asset)).join('\n\n')}`;
    }
  }

  private renderAssetMarkdown(asset: DocumentationAsset): string {
    switch (asset.type) {
      case 'image':
        return `![${asset.metadata.alt || asset.name}](${asset.path})`;
      case 'code_snippet':
        return `\`\`\`${asset.metadata.language || ''}\n${asset.name}\n\`\`\``;
      default:
        return `[${asset.name}](${asset.path})`;
    }
  }

  private renderAssetHTML(asset: DocumentationAsset): string {
    switch (asset.type) {
      case 'image':
        return `<img src="${asset.path}" alt="${asset.metadata.alt || asset.name}" 
                     class="asset-image" ${asset.metadata.width ? `width="${asset.metadata.width}"` : ''}>`;
      case 'video':
        return `<video controls class="asset-video" ${asset.metadata.width ? `width="${asset.metadata.width}"` : ''}>
                    <source src="${asset.path}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
      default:
        return `<a href="${asset.path}" class="asset-link">${asset.name}</a>`;
    }
  }

  private generateTableOfContents(sections: DocumentationSection[], maxDepth: number): string {
    let toc = '## Table of Contents\n\n';
    
    const generateTOCEntry = (section: DocumentationSection, currentDepth: number): string => {
      if (currentDepth > maxDepth) return '';
      
      const indent = '  '.repeat(currentDepth - 1);
      const anchor = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      let entry = `${indent}- [${section.title}](#${anchor})\n`;
      
      if (section.subsections.length > 0 && currentDepth < maxDepth) {
        entry += section.subsections
          .map(subsection => generateTOCEntry(subsection, currentDepth + 1))
          .join('');
      }
      
      return entry;
    };

    toc += sections.map(section => generateTOCEntry(section, 1)).join('');
    return toc;
  }

  private generateHTMLTableOfContents(sections: DocumentationSection[], maxDepth: number): string {
    let toc = '<nav class="table-of-contents"><h2>Table of Contents</h2><ul>';
    
    const generateTOCEntry = (section: DocumentationSection, currentDepth: number): string => {
      if (currentDepth > maxDepth) return '';
      
      let entry = `<li><a href="#${section.id}">${section.title}</a>`;
      
      if (section.subsections.length > 0 && currentDepth < maxDepth) {
        entry += '<ul>';
        entry += section.subsections
          .map(subsection => generateTOCEntry(subsection, currentDepth + 1))
          .join('');
        entry += '</ul>';
      }
      
      entry += '</li>';
      return entry;
    };

    toc += sections.map(section => generateTOCEntry(section, 1)).join('');
    toc += '</ul></nav>';
    return toc;
  }

  private addBackToTopLinks(content: string): string {
    return content.replace(/\n## /g, '\n[⬆ Back to top](#table-of-contents)\n\n## ');
  }

  private markdownToHTML(markdown: string): string {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
  }

  private generateStylesheet(theme: string, customCSS: string): string {
    const baseStyles = `
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; }
        .documentation-container { display: flex; max-width: 1200px; margin: 0 auto; }
        .content { flex: 1; padding: 20px; }
        .sidebar { width: 250px; padding: 20px; border-right: 1px solid #eee; }
        .section { margin-bottom: 2rem; }
        .assets-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
        .table-of-contents { background: #f8f9fa; padding: 1rem; border-radius: 4px; margin-bottom: 2rem; }
        ${customCSS}
    </style>`;
    
    return baseStyles;
  }

  private renderHeader(headerConfig: any): string {
    return `<header class="documentation-header">
        ${headerConfig.logo ? `<img src="${headerConfig.logo}" alt="Logo" class="logo">` : ''}
        ${headerConfig.title ? `<h1>${headerConfig.title}</h1>` : ''}
        ${headerConfig.search ? '<div class="search-box"><input type="search" placeholder="Search..."></div>' : ''}
    </header>`;
  }

  private renderSidebar(sections: DocumentationSection[], sidebarConfig: any): string {
    return `<nav class="sidebar">
        <ul class="nav-list">
            ${sections.map(section => `<li><a href="#${section.id}">${section.title}</a></li>`).join('')}
        </ul>
    </nav>`;
  }

  private renderFooter(footerConfig: any): string {
    return `<footer class="documentation-footer">
        ${footerConfig.content || ''}
        ${footerConfig.copyright ? `<p>&copy; ${footerConfig.copyright}</p>` : ''}
    </footer>`;
  }

  private renderBreadcrumbs(sections: DocumentationSection[]): string {
    return '<nav class="breadcrumbs"><a href="#top">Home</a> > Documentation</nav>';
  }

  private getMathJaxScript(): string {
    return `<script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
            <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>`;
  }

  private getSearchScript(): string {
    return `<script>
        // Simple search functionality
        document.addEventListener('DOMContentLoaded', function() {
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) {
                searchInput.addEventListener('input', function(e) {
                    // Implement search logic here
                    console.log('Searching for:', e.target.value);
                });
            }
        });
    </script>`;
  }

  private extractPathsFromSections(sections: DocumentationSection[]): Record<string, any> {
    // Extract API paths from documentation sections
    const paths: Record<string, any> = {};
    
    sections.forEach(section => {
      // Parse section content for API endpoints
      const pathMatches = section.content.match(/`(GET|POST|PUT|DELETE|PATCH)\s+([^`]+)`/g);
      if (pathMatches) {
        pathMatches.forEach(match => {
          const [method, path] = match.replace(/`/g, '').split(' ');
          if (!paths[path]) paths[path] = {};
          paths[path][method.toLowerCase()] = {
            summary: section.title,
            description: section.content.substring(0, 200) + '...'
          };
        });
      }
    });
    
    return paths;
  }

  private extractSchemasFromSections(sections: DocumentationSection[]): Record<string, any> {
    // Extract schema definitions from documentation
    return {
      Error: {
        type: 'object',
        properties: {
          code: { type: 'integer' },
          message: { type: 'string' }
        }
      }
    };
  }

  private compileTemplate(template: string): Function {
    // Simple template compilation - in production, use a proper template engine
    return new Function('data', `
      let result = \`${template}\`;
      for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp('\\\\$\\\\{' + key + '\\\\}', 'g'), value);
      }
      return result;
    `);
  }

  private async loadBuiltInTemplates(): Promise<void> {
    // Load default templates
    const markdownTemplate: DocumentationTemplate = {
      id: 'default-markdown',
      name: 'Default Markdown Template',
      description: 'Basic markdown documentation template',
      format: 'markdown',
      type: 'library',
      language: 'typescript',
      template: '# ${title}\n\n${description}\n\n## Installation\n\n${installation}\n\n## Usage\n\n${usage}',
      variables: [
        { name: 'title', type: 'string', description: 'Document title', required: true },
        { name: 'description', type: 'string', description: 'Document description', required: true },
        { name: 'installation', type: 'string', description: 'Installation instructions', required: false, defaultValue: 'npm install' },
        { name: 'usage', type: 'string', description: 'Usage examples', required: false, defaultValue: 'See examples below' }
      ],
      sections: [],
      metadata: {
        version: '1.0.0',
        author: { name: 'AI Documentation Generator', role: 'generator' },
        created: Date.now(),
        lastModified: Date.now(),
        tags: ['markdown', 'default'],
        category: 'template',
        license: 'MIT'
      }
    };

    await this.loadTemplate(markdownTemplate);
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.templates.clear();
    this.compiledTemplates.clear();
    this.emit('engine:shutdown');
  }
}