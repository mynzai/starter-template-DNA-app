/**
 * @fileoverview Syntax Highlighting Service
 * Provides syntax highlighting for multiple programming languages
 */

import {
  SupportedLanguage,
  SyntaxHighlightConfig,
  SyntaxRule
} from './types';

export interface HighlightTheme {
  name: string;
  background: string;
  foreground: string;
  keyword: string;
  string: string;
  comment: string;
  number: string;
  operator: string;
  function: string;
  variable: string;
  type: string;
  error: string;
}

export class SyntaxHighlighter {
  private themes: Map<string, HighlightTheme> = new Map();
  private languageRules: Map<SupportedLanguage, SyntaxRule[]> = new Map();

  constructor() {
    this.initializeThemes();
    this.initializeLanguageRules();
  }

  /**
   * Highlight code with syntax coloring
   */
  async highlight(code: string, config: SyntaxHighlightConfig): Promise<string> {
    const theme = this.getTheme(config.theme);
    const rules = this.getLanguageRules(config.language);
    
    // Combine default rules with custom rules
    const allRules = [...rules, ...(config.customRules || [])];

    let highlightedCode = this.escapeHtml(code);

    // Apply syntax highlighting rules
    for (const rule of allRules) {
      highlightedCode = this.applyRule(highlightedCode, rule, theme);
    }

    // Add line numbers if requested
    if (config.showLineNumbers) {
      highlightedCode = this.addLineNumbers(highlightedCode);
    }

    // Highlight errors if requested
    if (config.highlightErrors) {
      highlightedCode = this.highlightErrors(highlightedCode, config.language);
    }

    // Wrap in container with theme
    return this.wrapInContainer(highlightedCode, theme);
  }

  /**
   * Get available themes
   */
  getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  /**
   * Add custom theme
   */
  addTheme(name: string, theme: HighlightTheme): void {
    this.themes.set(name, theme);
  }

  /**
   * Add custom syntax rules for a language
   */
  addLanguageRules(language: SupportedLanguage, rules: SyntaxRule[]): void {
    const existing = this.languageRules.get(language) || [];
    this.languageRules.set(language, [...existing, ...rules]);
  }

  private initializeThemes(): void {
    // Light theme
    this.themes.set('light', {
      name: 'Light',
      background: '#ffffff',
      foreground: '#333333',
      keyword: '#0000ff',
      string: '#008000',
      comment: '#808080',
      number: '#ff6600',
      operator: '#666666',
      function: '#795548',
      variable: '#9c27b0',
      type: '#2196f3',
      error: '#f44336'
    });

    // Dark theme
    this.themes.set('dark', {
      name: 'Dark',
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      keyword: '#569cd6',
      string: '#ce9178',
      comment: '#6a9955',
      number: '#b5cea8',
      operator: '#d4d4d4',
      function: '#dcdcaa',
      variable: '#9cdcfe',
      type: '#4ec9b0',
      error: '#f14c4c'
    });

    // Auto theme (system preference)
    this.themes.set('auto', this.themes.get('light')!);
  }

  private initializeLanguageRules(): void {
    // TypeScript/JavaScript rules
    const jsRules: SyntaxRule[] = [
      {
        id: 'js-keywords',
        pattern: /\b(const|let|var|function|class|interface|type|enum|import|export|from|default|async|await|return|if|else|for|while|try|catch|finally|throw|new|this|super|extends|implements|public|private|protected|static|readonly)\b/g,
        token: 'keyword',
        style: { color: '{keyword}', fontWeight: 'bold' }
      },
      {
        id: 'js-strings',
        pattern: /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g,
        token: 'string',
        style: { color: '{string}' }
      },
      {
        id: 'js-comments-single',
        pattern: /\/\/.*$/gm,
        token: 'comment',
        style: { color: '{comment}', fontStyle: 'italic' }
      },
      {
        id: 'js-comments-multi',
        pattern: /\/\*[\s\S]*?\*\//g,
        token: 'comment',
        style: { color: '{comment}', fontStyle: 'italic' }
      },
      {
        id: 'js-numbers',
        pattern: /\b\d+(\.\d+)?\b/g,
        token: 'number',
        style: { color: '{number}' }
      },
      {
        id: 'js-functions',
        pattern: /\b(\w+)\s*(?=\()/g,
        token: 'function',
        style: { color: '{function}' }
      },
      {
        id: 'js-operators',
        pattern: /[+\-*/%=<>!&|^~?:]/g,
        token: 'operator',
        style: { color: '{operator}' }
      }
    ];

    this.languageRules.set('typescript', jsRules);
    this.languageRules.set('javascript', jsRules);

    // Python rules
    const pythonRules: SyntaxRule[] = [
      {
        id: 'python-keywords',
        pattern: /\b(def|class|import|from|if|elif|else|for|while|try|except|finally|with|as|return|yield|lambda|and|or|not|in|is|None|True|False|pass|break|continue|global|nonlocal)\b/g,
        token: 'keyword',
        style: { color: '{keyword}', fontWeight: 'bold' }
      },
      {
        id: 'python-strings',
        pattern: /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g,
        token: 'string',
        style: { color: '{string}' }
      },
      {
        id: 'python-comments',
        pattern: /#.*$/gm,
        token: 'comment',
        style: { color: '{comment}', fontStyle: 'italic' }
      },
      {
        id: 'python-numbers',
        pattern: /\b\d+(\.\d+)?\b/g,
        token: 'number',
        style: { color: '{number}' }
      },
      {
        id: 'python-functions',
        pattern: /\b(\w+)\s*(?=\()/g,
        token: 'function',
        style: { color: '{function}' }
      }
    ];

    this.languageRules.set('python', pythonRules);

    // Java rules
    const javaRules: SyntaxRule[] = [
      {
        id: 'java-keywords',
        pattern: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|import|package|new|this|super|return|if|else|for|while|do|try|catch|finally|throw|throws|synchronized|volatile|transient|native)\b/g,
        token: 'keyword',
        style: { color: '{keyword}', fontWeight: 'bold' }
      },
      {
        id: 'java-types',
        pattern: /\b(String|int|long|double|float|boolean|char|byte|short|void|Object|List|Map|Set|Array)\b/g,
        token: 'type',
        style: { color: '{type}', fontWeight: 'bold' }
      },
      {
        id: 'java-strings',
        pattern: /"(?:[^"\\]|\\.)*"/g,
        token: 'string',
        style: { color: '{string}' }
      },
      {
        id: 'java-comments-single',
        pattern: /\/\/.*$/gm,
        token: 'comment',
        style: { color: '{comment}', fontStyle: 'italic' }
      },
      {
        id: 'java-comments-multi',
        pattern: /\/\*[\s\S]*?\*\//g,
        token: 'comment',
        style: { color: '{comment}', fontStyle: 'italic' }
      }
    ];

    this.languageRules.set('java', javaRules);

    // Add more language rules as needed
  }

  private getTheme(themeName: string): HighlightTheme {
    if (themeName === 'auto') {
      // Detect system theme preference
      const isDark = this.detectDarkMode();
      return this.themes.get(isDark ? 'dark' : 'light')!;
    }
    
    return this.themes.get(themeName) || this.themes.get('light')!;
  }

  private getLanguageRules(language: SupportedLanguage): SyntaxRule[] {
    return this.languageRules.get(language) || [];
  }

  private applyRule(code: string, rule: SyntaxRule, theme: HighlightTheme): string {
    return code.replace(rule.pattern, (match) => {
      const style = this.buildStyle(rule.style, theme);
      return `<span class="${rule.token}" style="${style}">${match}</span>`;
    });
  }

  private buildStyle(style: any, theme: HighlightTheme): string {
    const styles: string[] = [];
    
    for (const [property, value] of Object.entries(style)) {
      let cssValue = String(value);
      
      // Replace theme placeholders
      cssValue = cssValue.replace(/\{(\w+)\}/g, (_, key) => {
        return (theme as any)[key] || cssValue;
      });
      
      // Convert camelCase to kebab-case
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      styles.push(`${cssProperty}: ${cssValue}`);
    }
    
    return styles.join('; ');
  }

  private addLineNumbers(code: string): string {
    const lines = code.split('\n');
    const numberedLines = lines.map((line, index) => {
      const lineNumber = (index + 1).toString().padStart(3, ' ');
      return `<span class="line-number">${lineNumber}</span> ${line}`;
    });
    
    return numberedLines.join('\n');
  }

  private highlightErrors(code: string, language: SupportedLanguage): string {
    // Simple error detection patterns
    const errorPatterns: Record<SupportedLanguage, RegExp[]> = {
      typescript: [
        /\bconsole\.log\b/g, // Console statements (potential debug code)
        /\bany\b/g, // Any types (potential type issues)
      ],
      javascript: [
        /\bconsole\.log\b/g,
        /\bvar\b/g, // Var usage (prefer let/const)
      ],
      python: [
        /\bprint\b/g, // Print statements (potential debug code)
      ],
      java: [
        /System\.out\.println/g, // Print statements
      ]
    } as any;

    const patterns = errorPatterns[language] || [];
    
    let highlightedCode = code;
    for (const pattern of patterns) {
      highlightedCode = highlightedCode.replace(pattern, (match) => {
        return `<span class="syntax-warning" style="text-decoration: underline wavy orange;">${match}</span>`;
      });
    }
    
    return highlightedCode;
  }

  private wrapInContainer(code: string, theme: HighlightTheme): string {
    return `
<div class="syntax-highlight-container" style="
  background-color: ${theme.background};
  color: ${theme.foreground};
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  padding: 16px;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre;
">
${code}
</div>`;
  }

  private escapeHtml(text: string): string {
    const div = document?.createElement('div');
    if (div) {
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Fallback for Node.js environment
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private detectDarkMode(): boolean {
    // Try to detect system dark mode preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Default to light mode
    return false;
  }
}