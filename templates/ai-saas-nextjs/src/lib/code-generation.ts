import { AIService } from './ai-service'
import { codeAnalysisService } from './code-analysis'

export interface CodeGenerationRequest {
  type: 'function' | 'class' | 'component' | 'test' | 'documentation' | 'api' | 'config'
  language: string
  framework?: string
  description: string
  context?: {
    existingCode?: string
    dependencies?: string[]
    styleGuide?: string
    testFramework?: string
  }
  options?: {
    includeComments?: boolean
    includeTests?: boolean
    includeTypes?: boolean
    stylePreference?: 'functional' | 'class-based' | 'hooks'
  }
}

export interface CodeGenerationResult {
  code: string
  language: string
  framework?: string
  type: string
  explanation: string
  tests?: string
  documentation?: string
  dependencies: string[]
  usage: {
    example: string
    imports: string[]
  }
  quality: {
    score: number
    suggestions: string[]
  }
}

export interface CodeTemplate {
  id: string
  name: string
  description: string
  language: string
  framework?: string
  category: string
  template: string
  variables: Array<{
    name: string
    type: string
    description: string
    default?: string
    required?: boolean
  }>
  examples: Array<{
    name: string
    description: string
    input: Record<string, any>
    output: string
  }>
}

export class CodeGenerationService {
  private aiService: AIService
  private templates: Map<string, CodeTemplate>

  constructor() {
    this.aiService = new AIService()
    this.templates = new Map()
    this.initializeTemplates()
  }

  /**
   * Initialize code templates for different languages and frameworks
   */
  private initializeTemplates(): void {
    const templates: CodeTemplate[] = [
      {
        id: 'react-component',
        name: 'React Component',
        description: 'Generate a functional React component with TypeScript',
        language: 'typescript',
        framework: 'react',
        category: 'component',
        template: `import React from 'react'

interface {{componentName}}Props {
  {{#each props}}
  {{name}}: {{type}}{{#if optional}}?{{/if}}
  {{/each}}
}

export const {{componentName}}: React.FC<{{componentName}}Props> = ({
  {{#each props}}{{name}}{{#unless @last}}, {{/unless}}{{/each}}
}) => {
  return (
    <div className="{{className}}">
      {{content}}
    </div>
  )
}`,
        variables: [
          { name: 'componentName', type: 'string', description: 'Name of the component', required: true },
          { name: 'props', type: 'array', description: 'Component props', default: '[]' },
          { name: 'className', type: 'string', description: 'CSS class name', default: '' },
          { name: 'content', type: 'string', description: 'Component content', default: '<p>Component content</p>' },
        ],
        examples: [
          {
            name: 'Button Component',
            description: 'A simple button component',
            input: {
              componentName: 'Button',
              props: [
                { name: 'onClick', type: '() => void', optional: false },
                { name: 'children', type: 'React.ReactNode', optional: false },
                { name: 'variant', type: 'string', optional: true },
              ],
              className: 'btn',
              content: '<button onClick={onClick} className={`btn ${variant}`}>{children}</button>',
            },
            output: 'Generated Button component code',
          },
        ],
      },
      {
        id: 'python-class',
        name: 'Python Class',
        description: 'Generate a Python class with methods and documentation',
        language: 'python',
        category: 'class',
        template: `class {{className}}:
    """{{description}}
    
    Attributes:
        {{#each attributes}}
        {{name}} ({{type}}): {{description}}
        {{/each}}
    """
    
    def __init__(self{{#each attributes}}, {{name}}: {{type}}{{/each}}):
        """Initialize {{className}} with provided attributes."""
        {{#each attributes}}
        self.{{name}} = {{name}}
        {{/each}}
    
    {{#each methods}}
    def {{name}}(self{{#if parameters}}{{#each parameters}}, {{name}}: {{type}}{{/each}}{{/if}}){{#if returnType}} -> {{returnType}}{{/if}}:
        """{{description}}"""
        {{implementation}}
    
    {{/each}}`,
        variables: [
          { name: 'className', type: 'string', description: 'Name of the class', required: true },
          { name: 'description', type: 'string', description: 'Class description', required: true },
          { name: 'attributes', type: 'array', description: 'Class attributes', default: '[]' },
          { name: 'methods', type: 'array', description: 'Class methods', default: '[]' },
        ],
        examples: [],
      },
      {
        id: 'express-api',
        name: 'Express API Route',
        description: 'Generate Express.js API route with validation',
        language: 'typescript',
        framework: 'express',
        category: 'api',
        template: `import { Request, Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'

{{#if validation}}
export const {{routeName}}Validation = [
  {{#each validationRules}}
  {{rule}},
  {{/each}}
]
{{/if}}

export const {{routeName}} = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    {{#if validation}}
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() })
      return
    }
    {{/if}}

    const { {{#each parameters}}{{name}}{{#unless @last}}, {{/unless}}{{/each}} } = req.{{parameterSource}}

    {{implementation}}

    res.status({{successStatus}}).json({{responseObject}})
  } catch (error) {
    next(error)
  }
}`,
        variables: [
          { name: 'routeName', type: 'string', description: 'Name of the route handler', required: true },
          { name: 'parameters', type: 'array', description: 'Route parameters', default: '[]' },
          { name: 'parameterSource', type: 'string', description: 'Source of parameters (body, params, query)', default: 'body' },
          { name: 'validation', type: 'boolean', description: 'Include validation', default: 'true' },
          { name: 'validationRules', type: 'array', description: 'Validation rules', default: '[]' },
          { name: 'implementation', type: 'string', description: 'Route implementation', required: true },
          { name: 'successStatus', type: 'number', description: 'Success status code', default: '200' },
          { name: 'responseObject', type: 'string', description: 'Response object', default: '{ success: true }' },
        ],
        examples: [],
      },
    ]

    templates.forEach(template => {
      this.templates.set(template.id, template)
    })
  }

  /**
   * Generate code based on request
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    try {
      const prompt = this.buildGenerationPrompt(request)
      
      const response = await this.aiService.generateResponse([
        {
          role: 'system',
          content: `You are an expert software developer. Generate high-quality, production-ready code following best practices for ${request.language}${request.framework ? ` with ${request.framework}` : ''}. Include proper error handling, documentation, and follow established patterns.`
        },
        { role: 'user', content: prompt }
      ], {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.2,
      })

      const generatedCode = this.extractCodeFromResponse(response.content)
      
      // Analyze the generated code quality
      const analysis = await codeAnalysisService.analyzeCode(generatedCode, `temp.${this.getFileExtension(request.language)}`)
      
      // Generate tests if requested
      let tests: string | undefined
      if (request.options?.includeTests) {
        tests = await this.generateTests(generatedCode, request)
      }

      // Generate documentation if requested
      let documentation: string | undefined
      if (request.options?.includeComments || request.type === 'documentation') {
        documentation = await this.generateDocumentation(generatedCode, request)
      }

      return {
        code: generatedCode,
        language: request.language,
        framework: request.framework,
        type: request.type,
        explanation: this.extractExplanationFromResponse(response.content),
        tests,
        documentation,
        dependencies: this.extractDependencies(generatedCode, request),
        usage: {
          example: await this.generateUsageExample(generatedCode, request),
          imports: this.extractImports(generatedCode, request.language),
        },
        quality: {
          score: analysis.complexity.maintainabilityIndex,
          suggestions: analysis.suggestions.map(s => s.message),
        },
      }
    } catch (error) {
      console.error('Error generating code:', error)
      throw new Error('Failed to generate code')
    }
  }

  /**
   * Build generation prompt based on request
   */
  private buildGenerationPrompt(request: CodeGenerationRequest): string {
    let prompt = `Generate ${request.type} code in ${request.language}`
    
    if (request.framework) {
      prompt += ` using ${request.framework} framework`
    }

    prompt += `.\n\nDescription: ${request.description}\n\n`

    if (request.context?.existingCode) {
      prompt += `Existing code context:\n\`\`\`${request.language}\n${request.context.existingCode}\n\`\`\`\n\n`
    }

    if (request.context?.dependencies?.length) {
      prompt += `Available dependencies: ${request.context.dependencies.join(', ')}\n\n`
    }

    if (request.options?.stylePreference) {
      prompt += `Style preference: ${request.options.stylePreference}\n\n`
    }

    prompt += `Requirements:\n`
    prompt += `- Follow ${request.language} best practices\n`
    prompt += `- Include proper error handling\n`
    prompt += `- Use meaningful variable names\n`
    
    if (request.options?.includeTypes && (request.language === 'typescript' || request.language === 'python')) {
      prompt += `- Include type annotations\n`
    }

    if (request.options?.includeComments) {
      prompt += `- Include comprehensive comments\n`
    }

    if (request.framework) {
      prompt += `- Follow ${request.framework} conventions\n`
    }

    if (request.context?.styleGuide) {
      prompt += `- Follow this style guide: ${request.context.styleGuide}\n`
    }

    prompt += `\nProvide:\n1. The complete code implementation\n2. Brief explanation of the approach\n3. Key features and functionality`

    return prompt
  }

  /**
   * Extract code from AI response
   */
  private extractCodeFromResponse(response: string): string {
    // Look for code blocks
    const codeBlockMatch = response.match(/```(?:\w+)?\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    // If no code block, try to extract the code portion
    const lines = response.split('\n')
    const codeLines = lines.filter(line => 
      !line.startsWith('##') && 
      !line.startsWith('**') && 
      !line.startsWith('*') &&
      line.trim().length > 0
    )

    return codeLines.join('\n')
  }

  /**
   * Extract explanation from AI response
   */
  private extractExplanationFromResponse(response: string): string {
    // Look for explanation before or after code
    const parts = response.split(/```[\s\S]*?```/)
    if (parts.length > 1) {
      return parts.filter(part => part.trim().length > 0)[0]?.trim() || 'Code generated successfully'
    }
    
    return response.split('\n').slice(0, 3).join(' ').trim() || 'Code generated successfully'
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions = {
      typescript: 'ts',
      javascript: 'js',
      python: 'py',
      java: 'java',
      go: 'go',
      rust: 'rs',
      cpp: 'cpp',
      csharp: 'cs',
    }
    return extensions[language as keyof typeof extensions] || 'txt'
  }

  /**
   * Generate tests for the code
   */
  private async generateTests(code: string, request: CodeGenerationRequest): Promise<string> {
    const testFramework = request.context?.testFramework || this.getDefaultTestFramework(request.language, request.framework)
    
    const prompt = `Generate comprehensive tests for this ${request.language} code using ${testFramework}:

\`\`\`${request.language}
${code}
\`\`\`

Include:
- Unit tests for all functions/methods
- Edge cases and error scenarios
- Mock external dependencies
- Test setup and teardown if needed

Follow ${testFramework} best practices and conventions.`

    const response = await this.aiService.generateResponse([
      { role: 'system', content: `You are a testing expert. Generate thorough, maintainable tests using ${testFramework}.` },
      { role: 'user', content: prompt }
    ], {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.2,
    })

    return this.extractCodeFromResponse(response.content)
  }

  /**
   * Get default test framework for language/framework combination
   */
  private getDefaultTestFramework(language: string, framework?: string): string {
    const frameworks = {
      typescript: 'Jest',
      javascript: 'Jest',
      python: 'pytest',
      java: 'JUnit',
      go: 'testing',
      rust: 'cargo test',
    }

    if (framework === 'react') return 'Jest + React Testing Library'
    if (framework === 'vue') return 'Jest + Vue Test Utils'
    if (framework === 'angular') return 'Jasmine + Karma'

    return frameworks[language as keyof typeof frameworks] || 'Built-in testing'
  }

  /**
   * Generate documentation for the code
   */
  private async generateDocumentation(code: string, request: CodeGenerationRequest): Promise<string> {
    const prompt = `Generate comprehensive documentation for this ${request.language} code:

\`\`\`${request.language}
${code}
\`\`\`

Include:
- Overview and purpose
- API documentation for functions/classes
- Usage examples
- Parameter descriptions
- Return value descriptions
- Error conditions

Format as markdown.`

    const response = await this.aiService.generateResponse([
      { role: 'system', content: 'You are a technical documentation expert. Generate clear, comprehensive documentation.' },
      { role: 'user', content: prompt }
    ], {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.2,
    })

    return response.content
  }

  /**
   * Extract dependencies from generated code
   */
  private extractDependencies(code: string, request: CodeGenerationRequest): string[] {
    const dependencies: string[] = []
    
    // Extract imports based on language
    if (request.language === 'typescript' || request.language === 'javascript') {
      const importMatches = code.matchAll(/import.*from\s+['"]([^'"]+)['"]/g)
      for (const match of importMatches) {
        if (!match[1].startsWith('.') && !match[1].startsWith('/')) {
          dependencies.push(match[1])
        }
      }
    } else if (request.language === 'python') {
      const importMatches = code.matchAll(/(?:from\s+(\w+)|import\s+(\w+))/g)
      for (const match of importMatches) {
        dependencies.push(match[1] || match[2])
      }
    }

    return [...new Set(dependencies)] // Remove duplicates
  }

  /**
   * Extract imports from code
   */
  private extractImports(code: string, language: string): string[] {
    const imports: string[] = []
    
    if (language === 'typescript' || language === 'javascript') {
      const importMatches = code.matchAll(/import\s+.*?from\s+['"][^'"]+['"];?/g)
      for (const match of importMatches) {
        imports.push(match[0])
      }
    } else if (language === 'python') {
      const importMatches = code.matchAll(/(?:from\s+\w+\s+import\s+.*|import\s+.*)/g)
      for (const match of importMatches) {
        imports.push(match[0])
      }
    }

    return imports
  }

  /**
   * Generate usage example
   */
  private async generateUsageExample(code: string, request: CodeGenerationRequest): Promise<string> {
    const prompt = `Generate a practical usage example for this ${request.language} code:

\`\`\`${request.language}
${code}
\`\`\`

Show how to use this ${request.type} in a real application with realistic input/output examples.`

    const response = await this.aiService.generateResponse([
      { role: 'system', content: 'You are a developer providing practical code examples.' },
      { role: 'user', content: prompt }
    ], {
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
    })

    return this.extractCodeFromResponse(response.content)
  }

  /**
   * Get available templates
   */
  getTemplates(filters?: { language?: string; framework?: string; category?: string }): CodeTemplate[] {
    let templates = Array.from(this.templates.values())

    if (filters?.language) {
      templates = templates.filter(t => t.language === filters.language)
    }

    if (filters?.framework) {
      templates = templates.filter(t => t.framework === filters.framework)
    }

    if (filters?.category) {
      templates = templates.filter(t => t.category === filters.category)
    }

    return templates
  }

  /**
   * Generate code from template
   */
  generateFromTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template ${templateId} not found`)
    }

    // Simple template replacement (in production, use a proper template engine)
    let result = template.template
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      result = result.replace(regex, String(value))
    }

    return result
  }

  /**
   * Optimize existing code
   */
  async optimizeCode(code: string, language: string, optimizationType: 'performance' | 'readability' | 'security'): Promise<CodeGenerationResult> {
    const analysis = await codeAnalysisService.analyzeCode(code)
    
    const prompt = `Optimize this ${language} code for ${optimizationType}:

\`\`\`${language}
${code}
\`\`\`

Current issues found:
${analysis.suggestions.map(s => `- ${s.message}: ${s.suggestion}`).join('\n')}

Focus on:
${optimizationType === 'performance' ? 'Improving execution speed, reducing memory usage, optimizing algorithms' : ''}
${optimizationType === 'readability' ? 'Improving code clarity, adding documentation, better naming' : ''}
${optimizationType === 'security' ? 'Fixing security vulnerabilities, improving input validation, secure coding practices' : ''}

Provide the optimized code with explanations of changes made.`

    const response = await this.aiService.generateResponse([
      { role: 'system', content: `You are a code optimization expert specializing in ${optimizationType} improvements.` },
      { role: 'user', content: prompt }
    ], {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.2,
    })

    const optimizedCode = this.extractCodeFromResponse(response.content)
    const newAnalysis = await codeAnalysisService.analyzeCode(optimizedCode)

    return {
      code: optimizedCode,
      language,
      type: 'optimization',
      explanation: this.extractExplanationFromResponse(response.content),
      dependencies: this.extractDependencies(optimizedCode, { language, type: 'optimization', description: '' }),
      usage: {
        example: code, // Original code as example
        imports: this.extractImports(optimizedCode, language),
      },
      quality: {
        score: newAnalysis.complexity.maintainabilityIndex,
        suggestions: newAnalysis.suggestions.map(s => s.message),
      },
    }
  }
}

export const codeGenerationService = new CodeGenerationService()