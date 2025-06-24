/**
 * @fileoverview Template Engine for Code Generation
 * Handles variable substitution and template processing
 */

import {
  LanguageTemplate,
  TemplateVariable,
  CodePattern
} from './types';

export interface TemplateProcessingOptions {
  strictMode?: boolean;
  allowUndefinedVariables?: boolean;
  preserveWhitespace?: boolean;
  enableConditionals?: boolean;
}

export interface TemplateContext {
  variables: Record<string, any>;
  helpers?: Record<string, Function>;
  partials?: Record<string, string>;
}

export class TemplateEngine {
  private helpers: Map<string, Function> = new Map();
  private partials: Map<string, string> = new Map();

  constructor() {
    this.initializeBuiltinHelpers();
  }

  /**
   * Process template with variables
   */
  process(
    template: LanguageTemplate,
    variables: Record<string, any>,
    options: TemplateProcessingOptions = {}
  ): string {
    const context: TemplateContext = {
      variables,
      helpers: Object.fromEntries(this.helpers),
      partials: Object.fromEntries(this.partials)
    };

    // Validate variables if in strict mode
    if (options.strictMode) {
      this.validateVariables(template, variables);
    }

    let processed = template.template;

    // Process conditionals if enabled
    if (options.enableConditionals) {
      processed = this.processConditionals(processed, context);
    }

    // Process loops
    processed = this.processLoops(processed, context);

    // Process variables
    processed = this.processVariables(processed, context, options);

    // Process helpers
    processed = this.processHelpers(processed, context);

    // Process partials
    processed = this.processPartials(processed, context);

    // Apply code patterns
    processed = this.applyPatterns(processed, template.patterns, context);

    // Clean up whitespace if not preserving
    if (!options.preserveWhitespace) {
      processed = this.cleanWhitespace(processed);
    }

    return processed;
  }

  /**
   * Add custom helper function
   */
  addHelper(name: string, fn: Function): void {
    this.helpers.set(name, fn);
  }

  /**
   * Add partial template
   */
  addPartial(name: string, template: string): void {
    this.partials.set(name, template);
  }

  /**
   * Validate template syntax
   */
  validateTemplate(template: LanguageTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Check for unclosed tags
      const openTags = (template.template.match(/\{\{[^}]*$/g) || []).length;
      const closeTags = (template.template.match(/^[^{]*\}\}/g) || []).length;
      
      if (openTags > 0) {
        errors.push('Unclosed template tags found');
      }

      // Check for balanced conditionals
      const ifTags = (template.template.match(/\{\{#if\s/g) || []).length;
      const endifTags = (template.template.match(/\{\{\/if\}\}/g) || []).length;
      
      if (ifTags !== endifTags) {
        errors.push('Unbalanced if/endif tags');
      }

      // Check for balanced loops
      const eachTags = (template.template.match(/\{\{#each\s/g) || []).length;
      const endEachTags = (template.template.match(/\{\{\/each\}\}/g) || []).length;
      
      if (eachTags !== endEachTags) {
        errors.push('Unbalanced each/endeach tags');
      }

      // Validate variable references
      const variableRefs = this.extractVariableReferences(template.template);
      const definedVariables = new Set(template.variables.map(v => v.name));
      
      for (const ref of variableRefs) {
        if (!definedVariables.has(ref) && !this.isBuiltinVariable(ref)) {
          errors.push(`Undefined variable reference: ${ref}`);
        }
      }

    } catch (error) {
      errors.push(`Template validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private initializeBuiltinHelpers(): void {
    // String helpers
    this.helpers.set('uppercase', (str: string) => str.toUpperCase());
    this.helpers.set('lowercase', (str: string) => str.toLowerCase());
    this.helpers.set('capitalize', (str: string) => str.charAt(0).toUpperCase() + str.slice(1));
    this.helpers.set('camelCase', (str: string) => {
      return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
    });
    this.helpers.set('kebabCase', (str: string) => {
      return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    });
    this.helpers.set('snakeCase', (str: string) => {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    });

    // Array helpers
    this.helpers.set('join', (arr: any[], separator: string = ', ') => arr.join(separator));
    this.helpers.set('length', (arr: any[]) => arr.length);
    this.helpers.set('first', (arr: any[]) => arr[0]);
    this.helpers.set('last', (arr: any[]) => arr[arr.length - 1]);

    // Logic helpers
    this.helpers.set('eq', (a: any, b: any) => a === b);
    this.helpers.set('ne', (a: any, b: any) => a !== b);
    this.helpers.set('gt', (a: any, b: any) => a > b);
    this.helpers.set('lt', (a: any, b: any) => a < b);
    this.helpers.set('and', (a: any, b: any) => a && b);
    this.helpers.set('or', (a: any, b: any) => a || b);
    this.helpers.set('not', (a: any) => !a);

    // Date helpers
    this.helpers.set('now', () => new Date().toISOString());
    this.helpers.set('year', () => new Date().getFullYear());
    this.helpers.set('formatDate', (date: Date, format: string = 'YYYY-MM-DD') => {
      // Simple date formatting
      return date.toISOString().split('T')[0];
    });
  }

  private validateVariables(template: LanguageTemplate, variables: Record<string, any>): void {
    const required = template.variables.filter(v => v.required);
    const missing = required.filter(v => !(v.name in variables));
    
    if (missing.length > 0) {
      throw new Error(`Missing required variables: ${missing.map(v => v.name).join(', ')}`);
    }

    // Type validation
    for (const variable of template.variables) {
      const value = variables[variable.name];
      if (value !== undefined && !this.validateVariableType(value, variable)) {
        throw new Error(`Invalid type for variable ${variable.name}: expected ${variable.type}, got ${typeof value}`);
      }
    }
  }

  private validateVariableType(value: any, variable: TemplateVariable): boolean {
    switch (variable.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return true;
    }
  }

  private processConditionals(template: string, context: TemplateContext): string {
    // Process {{#if condition}} ... {{/if}} blocks
    return template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      const result = this.evaluateCondition(condition.trim(), context);
      return result ? content : '';
    });
  }

  private processLoops(template: string, context: TemplateContext): string {
    // Process {{#each array}} ... {{/each}} blocks
    return template.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, content) => {
      const array = this.getVariableValue(arrayName.trim(), context);
      
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        const itemContext = {
          ...context,
          variables: {
            ...context.variables,
            '@index': index,
            '@first': index === 0,
            '@last': index === array.length - 1,
            '@item': item,
            ...item // Spread item properties if it's an object
          }
        };
        
        return this.processVariables(content, itemContext);
      }).join('');
    });
  }

  private processVariables(template: string, context: TemplateContext, options: TemplateProcessingOptions = {}): string {
    // Process {{variable}} replacements
    return template.replace(/\{\{([^#\/][^}]*)\}\}/g, (match, varPath) => {
      const value = this.getVariableValue(varPath.trim(), context);
      
      if (value === undefined) {
        if (options.allowUndefinedVariables) {
          return match; // Leave unchanged
        }
        return ''; // Remove undefined variables
      }
      
      return String(value);
    });
  }

  private processHelpers(template: string, context: TemplateContext): string {
    // Process {{helper arg1 arg2}} calls
    return template.replace(/\{\{([\w]+)\s+([^}]+)\}\}/g, (match, helperName, args) => {
      const helper = context.helpers?.[helperName];
      
      if (!helper || typeof helper !== 'function') {
        return match; // Leave unchanged if helper not found
      }

      try {
        const parsedArgs = this.parseHelperArgs(args, context);
        const result = helper(...parsedArgs);
        return String(result);
      } catch (error) {
        console.warn(`Helper ${helperName} error:`, error);
        return match;
      }
    });
  }

  private processPartials(template: string, context: TemplateContext): string {
    // Process {{> partialName}} includes
    return template.replace(/\{\{>\s*([^}]+)\}\}/g, (match, partialName) => {
      const partial = context.partials?.[partialName.trim()];
      
      if (!partial) {
        return match; // Leave unchanged if partial not found
      }

      // Recursively process the partial
      return this.processVariables(partial, context);
    });
  }

  private applyPatterns(template: string, patterns: CodePattern[], context: TemplateContext): string {
    let processed = template;
    
    for (const pattern of patterns) {
      if (pattern.replacement) {
        const regex = new RegExp(pattern.pattern, 'g');
        processed = processed.replace(regex, pattern.replacement);
      }
    }
    
    return processed;
  }

  private getVariableValue(path: string, context: TemplateContext): any {
    // Handle dot notation (e.g., "user.name")
    const parts = path.split('.');
    let value: any = context.variables;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    // Simple condition evaluation
    try {
      // Handle simple variable checks
      if (!condition.includes(' ')) {
        const value = this.getVariableValue(condition, context);
        return Boolean(value);
      }

      // Handle comparisons (basic implementation)
      const comparisons = ['===', '!==', '==', '!=', '>', '<', '>=', '<='];
      
      for (const op of comparisons) {
        if (condition.includes(op)) {
          const [left, right] = condition.split(op).map(s => s.trim());
          const leftValue = this.getVariableValue(left, context);
          const rightValue = this.parseValue(right, context);
          
          switch (op) {
            case '===':
              return leftValue === rightValue;
            case '!==':
              return leftValue !== rightValue;
            case '==':
              return leftValue == rightValue;
            case '!=':
              return leftValue != rightValue;
            case '>':
              return leftValue > rightValue;
            case '<':
              return leftValue < rightValue;
            case '>=':
              return leftValue >= rightValue;
            case '<=':
              return leftValue <= rightValue;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.warn('Condition evaluation error:', error);
      return false;
    }
  }

  private parseHelperArgs(argsString: string, context: TemplateContext): any[] {
    // Simple argument parsing
    const args = argsString.split(/\s+/);
    
    return args.map(arg => this.parseValue(arg, context));
  }

  private parseValue(value: string, context: TemplateContext): any {
    // Parse different types of values
    value = value.trim();
    
    // String literals
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // Number literals
    if (/^\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }
    
    // Boolean literals
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    // Variable reference
    return this.getVariableValue(value, context);
  }

  private extractVariableReferences(template: string): string[] {
    const matches = template.match(/\{\{([^#\/][^}]*)\}\}/g) || [];
    
    return matches.map(match => {
      const content = match.slice(2, -2).trim();
      // Extract just the variable name (before any dots or spaces)
      return content.split(/[.\s]/)[0];
    }).filter(Boolean);
  }

  private isBuiltinVariable(name: string): boolean {
    const builtins = ['@index', '@first', '@last', '@item'];
    return builtins.includes(name);
  }

  private cleanWhitespace(template: string): string {
    return template
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .replace(/^\s+|\s+$/gm, '') // Trim lines
      .trim(); // Trim overall
  }
}