import { 
  PromptTemplate, 
  PromptVariable, 
  PromptValidationResult, 
  PromptCompilationOptions,
  PromptCompilationError,
  PromptValidationError 
} from './prompt-template';

export class PromptCompiler {
  private static readonly VARIABLE_PATTERN = /\{\{(\w+)(?:\.(\w+))?\}\}/g;
  private static readonly CONDITIONAL_PATTERN = /\{\{\s*#if\s+(\w+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
  private static readonly LOOP_PATTERN = /\{\{\s*#each\s+(\w+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g;

  constructor(private options: PromptCompilationOptions = {}) {
    this.options = {
      strictMode: true,
      allowMissingVariables: false,
      defaultMissingValue: '',
      preserveWhitespace: false,
      escapeHtml: true,
      ...options
    };
  }

  public compile(
    template: PromptTemplate, 
    variables: Record<string, any>
  ): string {
    try {
      // Validate variables first
      const validation = this.validate(template, variables);
      
      if (!validation.isValid && this.options.strictMode) {
        throw new PromptValidationError(
          `Template validation failed: ${validation.errors.join(', ')}`,
          validation.errors,
          template.id
        );
      }

      let compiled = template.template;

      // Process conditionals first
      compiled = this.processConditionals(compiled, variables);

      // Process loops
      compiled = this.processLoops(compiled, variables);

      // Process variables
      compiled = this.processVariables(compiled, variables, template);

      // Post-processing
      if (!this.options.preserveWhitespace) {
        compiled = this.normalizeWhitespace(compiled);
      }

      if (this.options.escapeHtml) {
        compiled = this.escapeHtmlInVariables(compiled);
      }

      return compiled.trim();

    } catch (error) {
      if (error instanceof PromptValidationError || error instanceof PromptCompilationError) {
        throw error;
      }
      
      throw new PromptCompilationError(
        `Failed to compile template: ${error instanceof Error ? error.message : String(error)}`,
        [],
        template.id,
        template.version
      );
    }
  }

  public validate(
    template: PromptTemplate, 
    variables: Record<string, any>
  ): PromptValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingVariables: string[] = [];
    const unusedVariables: string[] = [];

    try {
      // Extract variables from template
      const templateVariables = this.extractVariables(template.template);
      const definedVariables = new Set(template.variables.map(v => v.name));
      const providedVariables = new Set(Object.keys(variables));

      // Check for missing variables in template definition
      for (const varName of templateVariables) {
        if (!definedVariables.has(varName)) {
          warnings.push(`Variable '${varName}' used in template but not defined in schema`);
        }
      }

      // Check for undefined variables in template definition
      for (const varDef of template.variables) {
        if (!templateVariables.has(varDef.name)) {
          warnings.push(`Variable '${varDef.name}' defined but not used in template`);
          unusedVariables.push(varDef.name);
        }
      }

      // Validate required variables
      for (const varDef of template.variables) {
        if (varDef.required && !providedVariables.has(varDef.name)) {
          if (varDef.defaultValue === undefined) {
            errors.push(`Required variable '${varDef.name}' is missing`);
            missingVariables.push(varDef.name);
          }
        }
      }

      // Validate variable types and constraints
      for (const varDef of template.variables) {
        const value = variables[varDef.name];
        
        if (value !== undefined) {
          const typeValidation = this.validateVariableType(varDef, value);
          if (!typeValidation.isValid) {
            errors.push(...typeValidation.errors);
          }

          const constraintValidation = this.validateVariableConstraints(varDef, value);
          if (!constraintValidation.isValid) {
            errors.push(...constraintValidation.errors);
          }
        }
      }

      // Try to compile to check for syntax errors
      let compiledPrompt: string | undefined;
      try {
        compiledPrompt = this.compile(template, variables);
      } catch (compileError) {
        if (compileError instanceof PromptCompilationError) {
          errors.push(`Compilation error: ${compileError.message}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        missingVariables,
        unusedVariables,
        compiledPrompt
      };

    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        isValid: false,
        errors,
        warnings,
        missingVariables,
        unusedVariables
      };
    }
  }

  private extractVariables(template: string): Set<string> {
    const variables = new Set<string>();
    const matches = template.matchAll(PromptCompiler.VARIABLE_PATTERN);
    
    for (const match of matches) {
      if (match[1]) {
        variables.add(match[1]);
      }
    }

    return variables;
  }

  private processVariables(
    template: string, 
    variables: Record<string, any>,
    promptTemplate: PromptTemplate
  ): string {
    return template.replace(PromptCompiler.VARIABLE_PATTERN, (match, varName, property) => {
      let value = variables[varName];

      // Use default value if variable is missing
      if (value === undefined) {
        const varDef = promptTemplate.variables.find(v => v.name === varName);
        if (varDef?.defaultValue !== undefined) {
          value = varDef.defaultValue;
        } else if (this.options.allowMissingVariables) {
          return this.options.defaultMissingValue || '';
        } else {
          throw new PromptCompilationError(
            `Missing required variable: ${varName}`,
            [varName],
            promptTemplate.id,
            promptTemplate.version
          );
        }
      }

      // Handle property access (e.g., {{user.name}})
      if (property && typeof value === 'object' && value !== null) {
        value = value[property];
      }

      // Convert value to string
      if (value === null || value === undefined) {
        return '';
      }

      if (typeof value === 'object') {
        return JSON.stringify(value);
      }

      return String(value);
    });
  }

  private processConditionals(template: string, variables: Record<string, any>): string {
    return template.replace(PromptCompiler.CONDITIONAL_PATTERN, (match, condition, content) => {
      const value = variables[condition];
      const isTrue = Boolean(value) && value !== '' && value !== 0;
      
      return isTrue ? content : '';
    });
  }

  private processLoops(template: string, variables: Record<string, any>): string {
    return template.replace(PromptCompiler.LOOP_PATTERN, (match, arrayVar, content) => {
      const array = variables[arrayVar];
      
      if (!Array.isArray(array)) {
        return '';
      }

      return array.map((item, index) => {
        return content
          .replace(/\{\{this\}\}/g, String(item))
          .replace(/\{\{@index\}\}/g, String(index))
          .replace(/\{\{@first\}\}/g, String(index === 0))
          .replace(/\{\{@last\}\}/g, String(index === array.length - 1));
      }).join('');
    });
  }

  private validateVariableType(
    varDef: PromptVariable, 
    value: any
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (varDef.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Variable '${varDef.name}' must be a string, got ${typeof value}`);
        }
        break;
      
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Variable '${varDef.name}' must be a number, got ${typeof value}`);
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Variable '${varDef.name}' must be a boolean, got ${typeof value}`);
        }
        break;
      
      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Variable '${varDef.name}' must be an array, got ${typeof value}`);
        }
        break;
      
      case 'object':
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Variable '${varDef.name}' must be an object, got ${typeof value}`);
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateVariableConstraints(
    varDef: PromptVariable, 
    value: any
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!varDef.validation) {
      return { isValid: true, errors: [] };
    }

    const validation = varDef.validation;

    // String validations
    if (typeof value === 'string') {
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push(`Variable '${varDef.name}' does not match pattern: ${validation.pattern}`);
        }
      }

      if (validation.minLength && value.length < validation.minLength) {
        errors.push(`Variable '${varDef.name}' must be at least ${validation.minLength} characters`);
      }

      if (validation.maxLength && value.length > validation.maxLength) {
        errors.push(`Variable '${varDef.name}' must be no more than ${validation.maxLength} characters`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push(`Variable '${varDef.name}' must be at least ${validation.min}`);
      }

      if (validation.max !== undefined && value > validation.max) {
        errors.push(`Variable '${varDef.name}' must be no more than ${validation.max}`);
      }
    }

    // Enum validation
    if (validation.enum && !validation.enum.includes(value)) {
      errors.push(`Variable '${varDef.name}' must be one of: ${validation.enum.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private normalizeWhitespace(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n');
  }

  private escapeHtmlInVariables(text: string): string {
    // This is a simplified implementation
    // In a real system, you might want more sophisticated HTML escaping
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}