/**
 * @fileoverview Content Optimizer
 * Optimizes documentation content for readability, performance, and accessibility
 */

import { EventEmitter } from 'events';
import {
  DocumentationFormat,
  SupportedDocLanguage
} from './types';

export class ContentOptimizer extends EventEmitter {
  private initialized = false;
  private optimizationRules: Map<string, OptimizationRule> = new Map();

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load built-in optimization rules
    await this.loadBuiltInRules();
    
    this.initialized = true;
    this.emit('optimizer:initialized', { rulesLoaded: this.optimizationRules.size });
  }

  async optimizeContent(
    content: string,
    format: DocumentationFormat,
    options: OptimizationOptions = {}
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('ContentOptimizer not initialized');
    }

    this.emit('optimization:started', { 
      contentLength: content.length, 
      format,
      rules: options.rules || this.getDefaultRules(format)
    });

    let optimizedContent = content;
    const rules = options.rules || this.getDefaultRules(format);

    // Apply optimization rules in sequence
    for (const ruleName of rules) {
      const rule = this.optimizationRules.get(ruleName);
      if (!rule) {
        this.emit('optimization:warning', { message: `Rule '${ruleName}' not found` });
        continue;
      }

      try {
        this.emit('optimization:rule:started', { rule: ruleName });
        
        const result = await rule.optimize(optimizedContent, format, options);
        optimizedContent = result.content;
        
        this.emit('optimization:rule:completed', { 
          rule: ruleName, 
          changes: result.changes,
          originalLength: content.length,
          optimizedLength: optimizedContent.length
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.emit('optimization:error', { rule: ruleName, error: errorMessage });
      }
    }

    this.emit('optimization:completed', { 
      originalLength: content.length,
      optimizedLength: optimizedContent.length,
      compressionRatio: ((content.length - optimizedContent.length) / content.length * 100).toFixed(2)
    });

    return optimizedContent;
  }

  async addOptimizationRule(name: string, rule: OptimizationRule): Promise<void> {
    this.optimizationRules.set(name, rule);
    this.emit('rule:added', { ruleName: name });
  }

  async removeOptimizationRule(name: string): Promise<boolean> {
    const removed = this.optimizationRules.delete(name);
    if (removed) {
      this.emit('rule:removed', { ruleName: name });
    }
    return removed;
  }

  getAvailableRules(): string[] {
    return Array.from(this.optimizationRules.keys());
  }

  private getDefaultRules(format: DocumentationFormat): string[] {
    const commonRules = ['whitespace', 'formatting', 'links', 'headings'];
    
    switch (format) {
      case 'markdown':
        return [...commonRules, 'markdown-specific', 'code-blocks'];
      case 'html':
        return [...commonRules, 'html-specific', 'accessibility', 'performance'];
      case 'json':
        return ['whitespace', 'json-formatting'];
      default:
        return commonRules;
    }
  }

  private async loadBuiltInRules(): Promise<void> {
    // Whitespace optimization
    await this.addOptimizationRule('whitespace', {
      name: 'Whitespace Optimization',
      description: 'Removes excessive whitespace and normalizes spacing',
      optimize: async (content: string, format: DocumentationFormat) => {
        let optimized = content;
        let changes = 0;

        // Remove trailing whitespace
        const beforeTrailing = optimized;
        optimized = optimized.replace(/[ \t]+$/gm, '');
        if (optimized !== beforeTrailing) changes++;

        // Normalize multiple empty lines to maximum 2
        const beforeEmpty = optimized;
        optimized = optimized.replace(/\n{3,}/g, '\n\n');
        if (optimized !== beforeEmpty) changes++;

        // Remove leading/trailing whitespace from document
        const beforeDocument = optimized;
        optimized = optimized.trim();
        if (optimized !== beforeDocument) changes++;

        return { content: optimized, changes };
      }
    });

    // Formatting optimization
    await this.addOptimizationRule('formatting', {
      name: 'Formatting Optimization',
      description: 'Improves consistent formatting throughout the document',
      optimize: async (content: string, format: DocumentationFormat) => {
        let optimized = content;
        let changes = 0;

        // Normalize quotes to consistent style
        const beforeQuotes = optimized;
        optimized = optimized.replace(/[""]/g, '"').replace(/['']/g, "'");
        if (optimized !== beforeQuotes) changes++;

        // Normalize dashes
        const beforeDashes = optimized;
        optimized = optimized.replace(/—/g, '--').replace(/–/g, '-');
        if (optimized !== beforeDashes) changes++;

        // Fix spacing around punctuation
        const beforePunctuation = optimized;
        optimized = optimized.replace(/\s+([.!?:;,])/g, '$1');
        optimized = optimized.replace(/([.!?])\s+/g, '$1 ');
        if (optimized !== beforePunctuation) changes++;

        return { content: optimized, changes };
      }
    });

    // Links optimization
    await this.addOptimizationRule('links', {
      name: 'Links Optimization',
      description: 'Optimizes link formatting and accessibility',
      optimize: async (content: string, format: DocumentationFormat) => {
        let optimized = content;
        let changes = 0;

        // Convert bare URLs to proper markdown links
        if (format === 'markdown') {
          const beforeUrls = optimized;
          optimized = optimized.replace(
            /(?<!\[)(?<!\()https?:\/\/[^\s\]]+(?!\))/g,
            (url) => `[${url}](${url})`
          );
          if (optimized !== beforeUrls) changes++;
        }

        // Ensure external links have proper attributes in HTML
        if (format === 'html') {
          const beforeExternal = optimized;
          optimized = optimized.replace(
            /<a\s+href="(https?:\/\/[^"]+)"(?![^>]*target=)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer"'
          );
          if (optimized !== beforeExternal) changes++;
        }

        return { content: optimized, changes };
      }
    });

    // Headings optimization
    await this.addOptimizationRule('headings', {
      name: 'Headings Optimization',
      description: 'Optimizes heading structure and formatting',
      optimize: async (content: string, format: DocumentationFormat) => {
        let optimized = content;
        let changes = 0;

        if (format === 'markdown') {
          // Ensure consistent heading style (use # instead of underlines)
          const beforeHeadings = optimized;
          optimized = optimized.replace(/^(.+)\n=+$/gm, '# $1');
          optimized = optimized.replace(/^(.+)\n-+$/gm, '## $1');
          if (optimized !== beforeHeadings) changes++;

          // Add proper spacing around headings
          const beforeSpacing = optimized;
          optimized = optimized.replace(/^(#{1,6}\s+.+)$/gm, '\n$1\n');
          optimized = optimized.replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
          if (optimized !== beforeSpacing) changes++;
        }

        return { content: optimized, changes };
      }
    });

    // Markdown-specific optimizations
    await this.addOptimizationRule('markdown-specific', {
      name: 'Markdown Specific Optimization',
      description: 'Optimizations specific to Markdown format',
      optimize: async (content: string, format: DocumentationFormat) => {
        if (format !== 'markdown') {
          return { content, changes: 0 };
        }

        let optimized = content;
        let changes = 0;

        // Optimize list formatting
        const beforeLists = optimized;
        // Ensure consistent bullet points
        optimized = optimized.replace(/^[\s]*[*+-]\s+/gm, '- ');
        // Ensure proper spacing in numbered lists
        optimized = optimized.replace(/^(\s*)\d+\.\s+/gm, '$11. ');
        if (optimized !== beforeLists) changes++;

        // Optimize emphasis formatting
        const beforeEmphasis = optimized;
        // Prefer ** for bold over __
        optimized = optimized.replace(/__([^_]+)__/g, '**$1**');
        // Ensure emphasis has proper spacing
        optimized = optimized.replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
          return `**${p1.trim()}**`;
        });
        if (optimized !== beforeEmphasis) changes++;

        // Optimize table formatting
        const beforeTables = optimized;
        optimized = this.optimizeMarkdownTables(optimized);
        if (optimized !== beforeTables) changes++;

        return { content: optimized, changes };
      }
    });

    // Code blocks optimization
    await this.addOptimizationRule('code-blocks', {
      name: 'Code Blocks Optimization',
      description: 'Optimizes code block formatting and language specification',
      optimize: async (content: string, format: DocumentationFormat) => {
        let optimized = content;
        let changes = 0;

        // Ensure consistent code block formatting
        const beforeCode = optimized;
        
        // Convert inline code with multiple backticks to proper blocks
        optimized = optimized.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
          const cleanCode = code.trim();
          return `\`\`\`${lang}\n${cleanCode}\n\`\`\``;
        });

        // Ensure proper spacing around code blocks
        optimized = optimized.replace(/```[\w]*\n/g, '\n$&');
        optimized = optimized.replace(/```\n/g, '$&\n');
        optimized = optimized.replace(/\n{3,}/g, '\n\n');

        if (optimized !== beforeCode) changes++;

        return { content: optimized, changes };
      }
    });

    // HTML-specific optimizations
    await this.addOptimizationRule('html-specific', {
      name: 'HTML Specific Optimization',
      description: 'Optimizations specific to HTML format',
      optimize: async (content: string, format: DocumentationFormat) => {
        if (format !== 'html') {
          return { content, changes: 0 };
        }

        let optimized = content;
        let changes = 0;

        // Minify HTML (remove unnecessary whitespace)
        const beforeMinify = optimized;
        optimized = optimized.replace(/>\s+</g, '><');
        optimized = optimized.replace(/\s{2,}/g, ' ');
        if (optimized !== beforeMinify) changes++;

        // Optimize image tags
        const beforeImages = optimized;
        optimized = optimized.replace(/<img([^>]*?)>/g, (match, attrs) => {
          if (!attrs.includes('loading=')) {
            attrs += ' loading="lazy"';
          }
          return `<img${attrs}>`;
        });
        if (optimized !== beforeImages) changes++;

        return { content: optimized, changes };
      }
    });

    // Accessibility optimization
    await this.addOptimizationRule('accessibility', {
      name: 'Accessibility Optimization',
      description: 'Improves content accessibility',
      optimize: async (content: string, format: DocumentationFormat) => {
        let optimized = content;
        let changes = 0;

        if (format === 'html') {
          // Ensure images have alt attributes
          const beforeImages = optimized;
          optimized = optimized.replace(/<img([^>]*?)>/g, (match, attrs) => {
            if (!attrs.includes('alt=')) {
              attrs += ' alt=""';
            }
            return `<img${attrs}>`;
          });
          if (optimized !== beforeImages) changes++;

          // Ensure proper heading hierarchy
          const beforeHeadings = optimized;
          optimized = this.fixHeadingHierarchy(optimized);
          if (optimized !== beforeHeadings) changes++;
        }

        if (format === 'markdown') {
          // Check for images without alt text and add placeholder
          const beforeAlt = optimized;
          optimized = optimized.replace(/!\[\]\(([^)]+)\)/g, '![Image]($1)');
          if (optimized !== beforeAlt) changes++;
        }

        return { content: optimized, changes };
      }
    });

    // Performance optimization
    await this.addOptimizationRule('performance', {
      name: 'Performance Optimization',
      description: 'Optimizes content for better performance',
      optimize: async (content: string, format: DocumentationFormat) => {
        let optimized = content;
        let changes = 0;

        if (format === 'html') {
          // Add preload hints for critical resources
          const beforePreload = optimized;
          if (optimized.includes('<head>') && !optimized.includes('rel="preload"')) {
            optimized = optimized.replace(
              '</head>',
              '  <link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>\n</head>'
            );
            changes++;
          }

          // Optimize CSS delivery
          if (optimized.includes('<link') && optimized.includes('stylesheet')) {
            optimized = optimized.replace(
              /<link\s+rel="stylesheet"\s+href="([^"]+)"/g,
              '<link rel="preload" href="$1" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">'
            );
            if (optimized !== beforePreload) changes++;
          }
        }

        return { content: optimized, changes };
      }
    });

    // JSON formatting optimization
    await this.addOptimizationRule('json-formatting', {
      name: 'JSON Formatting Optimization',
      description: 'Optimizes JSON formatting for readability',
      optimize: async (content: string, format: DocumentationFormat) => {
        if (format !== 'json') {
          return { content, changes: 0 };
        }

        let optimized = content;
        let changes = 0;

        try {
          // Parse and re-stringify for consistent formatting
          const parsed = JSON.parse(content);
          const formatted = JSON.stringify(parsed, null, 2);
          
          if (formatted !== content) {
            optimized = formatted;
            changes = 1;
          }
        } catch (error) {
          // Content is not valid JSON, skip optimization
        }

        return { content: optimized, changes };
      }
    });
  }

  private optimizeMarkdownTables(content: string): string {
    return content.replace(/\|[^|\n]*\|[^|\n]*\|/g, (table) => {
      const lines = table.split('\n');
      const optimizedLines = lines.map(line => {
        if (line.includes('|')) {
          const cells = line.split('|').map(cell => cell.trim());
          return '| ' + cells.slice(1, -1).join(' | ') + ' |';
        }
        return line;
      });
      return optimizedLines.join('\n');
    });
  }

  private fixHeadingHierarchy(content: string): string {
    // Simple heading hierarchy fix for HTML
    const headingMatches = content.match(/<h([1-6])[^>]*>([^<]*)<\/h[1-6]>/g);
    if (!headingMatches) return content;

    let optimized = content;
    let currentLevel = 1;

    headingMatches.forEach(match => {
      const levelMatch = match.match(/<h([1-6])/);
      if (levelMatch) {
        const level = parseInt(levelMatch[1]);
        if (level > currentLevel + 1) {
          // Fix skipped levels
          const newLevel = currentLevel + 1;
          optimized = optimized.replace(match, match.replace(`<h${level}`, `<h${newLevel}`).replace(`</h${level}>`, `</h${newLevel}>`));
          currentLevel = newLevel;
        } else {
          currentLevel = level;
        }
      }
    });

    return optimized;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.optimizationRules.clear();
    this.emit('optimizer:shutdown');
  }
}

interface OptimizationRule {
  name: string;
  description: string;
  optimize(content: string, format: DocumentationFormat, options?: OptimizationOptions): Promise<{
    content: string;
    changes: number;
  }>;
}

export interface OptimizationOptions {
  rules?: string[];
  aggressive?: boolean;
  preserveFormatting?: boolean;
  language?: SupportedDocLanguage;
  customRules?: OptimizationRule[];
}