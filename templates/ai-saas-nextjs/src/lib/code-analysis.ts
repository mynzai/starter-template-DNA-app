import { AIService } from './ai-service'

export interface CodeAnalysis {
  language: string
  framework?: string
  complexity: {
    cyclomaticComplexity: number
    cognitiveComplexity: number
    linesOfCode: number
    maintainabilityIndex: number
  }
  suggestions: CodeSuggestion[]
  testCoverage: {
    estimatedCoverage: number
    suggestedTests: string[]
  }
  documentation: {
    summary: string
    functions: FunctionDoc[]
    classes: ClassDoc[]
  }
  security: {
    vulnerabilities: SecurityIssue[]
    score: number
  }
  performance: {
    issues: PerformanceIssue[]
    score: number
  }
}

export interface CodeSuggestion {
  type: 'refactor' | 'performance' | 'security' | 'style' | 'bug'
  severity: 'low' | 'medium' | 'high' | 'critical'
  line: number
  column?: number
  message: string
  suggestion: string
  example?: string
}

export interface FunctionDoc {
  name: string
  description: string
  parameters: Array<{
    name: string
    type: string
    description: string
    optional?: boolean
  }>
  returns: {
    type: string
    description: string
  }
  examples: string[]
}

export interface ClassDoc {
  name: string
  description: string
  methods: FunctionDoc[]
  properties: Array<{
    name: string
    type: string
    description: string
    access: 'public' | 'private' | 'protected'
  }>
}

export interface SecurityIssue {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  line: number
  description: string
  recommendation: string
}

export interface PerformanceIssue {
  type: string
  severity: 'low' | 'medium' | 'high'
  line: number
  description: string
  recommendation: string
  impact: string
}

export interface LanguageConfig {
  name: string
  extensions: string[]
  keywords: string[]
  frameworks: string[]
  testPatterns: string[]
  commonPatterns: RegExp[]
}

export class CodeAnalysisService {
  private aiService: AIService
  private languages: Map<string, LanguageConfig>

  constructor() {
    this.aiService = new AIService()
    this.languages = new Map()
    this.initializeLanguages()
  }

  /**
   * Initialize supported languages and their configurations
   */
  private initializeLanguages(): void {
    const languages: LanguageConfig[] = [
      {
        name: 'typescript',
        extensions: ['.ts', '.tsx'],
        keywords: ['interface', 'type', 'class', 'function', 'const', 'let', 'var'],
        frameworks: ['react', 'vue', 'angular', 'next.js', 'node.js', 'express'],
        testPatterns: ['jest', 'vitest', 'cypress', 'playwright'],
        commonPatterns: [
          /import.*from.*['"].*['"];?/g,
          /export.*{.*}/g,
          /interface\s+\w+/g,
          /class\s+\w+/g,
        ],
      },
      {
        name: 'javascript',
        extensions: ['.js', '.jsx', '.mjs'],
        keywords: ['function', 'const', 'let', 'var', 'class'],
        frameworks: ['react', 'vue', 'angular', 'node.js', 'express', 'next.js'],
        testPatterns: ['jest', 'mocha', 'jasmine', 'cypress'],
        commonPatterns: [
          /require\(['"].*['"]\)/g,
          /module\.exports/g,
          /function\s+\w+/g,
          /const\s+\w+\s*=/g,
        ],
      },
      {
        name: 'python',
        extensions: ['.py', '.pyw'],
        keywords: ['def', 'class', 'import', 'from', 'if', 'else', 'for', 'while'],
        frameworks: ['django', 'flask', 'fastapi', 'pandas', 'numpy', 'tensorflow'],
        testPatterns: ['pytest', 'unittest', 'nose2'],
        commonPatterns: [
          /def\s+\w+\(/g,
          /class\s+\w+/g,
          /import\s+\w+/g,
          /from\s+\w+\s+import/g,
        ],
      },
      {
        name: 'java',
        extensions: ['.java'],
        keywords: ['public', 'private', 'class', 'interface', 'package', 'import'],
        frameworks: ['spring', 'hibernate', 'junit', 'maven', 'gradle'],
        testPatterns: ['junit', 'testng', 'mockito'],
        commonPatterns: [
          /public\s+class\s+\w+/g,
          /private\s+\w+\s+\w+/g,
          /package\s+[\w.]+;/g,
          /import\s+[\w.]+;/g,
        ],
      },
      {
        name: 'go',
        extensions: ['.go'],
        keywords: ['func', 'type', 'struct', 'interface', 'package', 'import'],
        frameworks: ['gin', 'echo', 'fiber', 'gorilla'],
        testPatterns: ['testing', 'testify', 'ginkgo'],
        commonPatterns: [
          /func\s+\w+\(/g,
          /type\s+\w+\s+struct/g,
          /package\s+\w+/g,
          /import\s+['"].*['"]/g,
        ],
      },
    ]

    languages.forEach(lang => {
      this.languages.set(lang.name, lang)
    })
  }

  /**
   * Detect programming language from code content
   */
  detectLanguage(code: string, filename?: string): string {
    if (filename) {
      const extension = filename.substring(filename.lastIndexOf('.'))
      for (const [langName, config] of this.languages) {
        if (config.extensions.includes(extension)) {
          return langName
        }
      }
    }

    // Analyze code patterns if filename doesn't help
    const languageScores = new Map<string, number>()

    for (const [langName, config] of this.languages) {
      let score = 0
      
      // Check for keywords
      config.keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g')
        const matches = code.match(regex)
        if (matches) score += matches.length
      })

      // Check for common patterns
      config.commonPatterns.forEach(pattern => {
        const matches = code.match(pattern)
        if (matches) score += matches.length * 2
      })

      languageScores.set(langName, score)
    }

    // Return language with highest score
    let maxScore = 0
    let detectedLanguage = 'text'
    
    for (const [lang, score] of languageScores) {
      if (score > maxScore) {
        maxScore = score
        detectedLanguage = lang
      }
    }

    return detectedLanguage
  }

  /**
   * Detect framework from code analysis
   */
  detectFramework(code: string, language: string): string | undefined {
    const config = this.languages.get(language)
    if (!config) return undefined

    const frameworkIndicators = {
      react: [/import.*React/g, /JSX\.Element/g, /useState/g, /useEffect/g],
      vue: [/Vue\.component/g, /<template>/g, /Vue\.createApp/g],
      angular: [/@Component/g, /@Injectable/g, /NgModule/g],
      'next.js': [/import.*next/g, /getServerSideProps/g, /getStaticProps/g],
      express: [/app\.get/g, /app\.post/g, /express\(\)/g],
      django: [/django\.db/g, /models\.Model/g, /HttpResponse/g],
      flask: [/from flask import/g, /@app\.route/g],
      spring: [/@RestController/g, /@Service/g, /@Autowired/g],
    }

    for (const [framework, patterns] of Object.entries(frameworkIndicators)) {
      if (config.frameworks.includes(framework)) {
        const hasPatterns = patterns.some(pattern => code.match(pattern))
        if (hasPatterns) return framework
      }
    }

    return undefined
  }

  /**
   * Calculate code complexity metrics
   */
  calculateComplexity(code: string): CodeAnalysis['complexity'] {
    const lines = code.split('\n')
    const linesOfCode = lines.filter(line => 
      line.trim().length > 0 && !line.trim().startsWith('//')
    ).length

    // Simple cyclomatic complexity calculation
    const complexityKeywords = ['if', 'else', 'while', 'for', 'case', 'catch', '&&', '||']
    let cyclomaticComplexity = 1 // Base complexity
    
    complexityKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      const matches = code.match(regex)
      if (matches) cyclomaticComplexity += matches.length
    })

    // Cognitive complexity (nested structures add more)
    const cognitiveComplexity = this.calculateCognitiveComplexity(code)

    // Maintainability index (simplified formula)
    const maintainabilityIndex = Math.max(0, 
      100 * Math.exp(-0.23 * cyclomaticComplexity) 
      * Math.exp(-0.16 * linesOfCode / 1000)
    )

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      linesOfCode,
      maintainabilityIndex: Math.round(maintainabilityIndex),
    }
  }

  /**
   * Calculate cognitive complexity with nesting consideration
   */
  private calculateCognitiveComplexity(code: string): number {
    let complexity = 0
    let nestingLevel = 0
    const lines = code.split('\n')

    const incrementKeywords = ['if', 'else if', 'while', 'for', 'catch']
    const nestingKeywords = ['if', 'while', 'for', 'try']

    lines.forEach(line => {
      const trimmed = line.trim()
      
      // Track nesting level
      if (trimmed.includes('{')) nestingLevel++
      if (trimmed.includes('}')) nestingLevel = Math.max(0, nestingLevel - 1)

      // Add complexity for control structures
      incrementKeywords.forEach(keyword => {
        if (trimmed.includes(keyword)) {
          complexity += nestingLevel > 0 ? nestingLevel : 1
        }
      })

      // Binary logical operators in conditions
      if (trimmed.includes('&&') || trimmed.includes('||')) {
        complexity += 1
      }
    })

    return complexity
  }

  /**
   * Analyze code for security issues
   */
  analyzeSecurityIssues(code: string, language: string): SecurityIssue[] {
    const issues: SecurityIssue[] = []
    const lines = code.split('\n')

    const securityPatterns = {
      javascript: [
        { pattern: /eval\(/g, type: 'Code Injection', severity: 'critical' as const },
        { pattern: /innerHTML\s*=/g, type: 'XSS Vulnerability', severity: 'high' as const },
        { pattern: /document\.write/g, type: 'XSS Vulnerability', severity: 'medium' as const },
        { pattern: /localStorage\.setItem.*password/gi, type: 'Sensitive Data Storage', severity: 'high' as const },
      ],
      python: [
        { pattern: /exec\(/g, type: 'Code Injection', severity: 'critical' as const },
        { pattern: /os\.system/g, type: 'Command Injection', severity: 'critical' as const },
        { pattern: /pickle\.loads/g, type: 'Deserialization Vulnerability', severity: 'high' as const },
        { pattern: /password\s*=\s*['"].*['"]/gi, type: 'Hardcoded Password', severity: 'high' as const },
      ],
    }

    const patterns = securityPatterns[language as keyof typeof securityPatterns] || []

    lines.forEach((line, index) => {
      patterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(line)) {
          issues.push({
            type,
            severity,
            line: index + 1,
            description: `Potential ${type.toLowerCase()} detected`,
            recommendation: this.getSecurityRecommendation(type),
          })
        }
      })
    })

    return issues
  }

  /**
   * Get security recommendation for issue type
   */
  private getSecurityRecommendation(type: string): string {
    const recommendations = {
      'Code Injection': 'Avoid using eval() or exec(). Use safer alternatives like JSON.parse() or parameterized queries.',
      'XSS Vulnerability': 'Use textContent instead of innerHTML, or properly sanitize input data.',
      'Command Injection': 'Use subprocess with shell=False, or validate and sanitize all inputs.',
      'Sensitive Data Storage': 'Store sensitive data securely using encryption or secure storage APIs.',
      'Hardcoded Password': 'Use environment variables or secure configuration management.',
      'Deserialization Vulnerability': 'Avoid pickle.loads() with untrusted data. Use JSON or validate data structure.',
    }

    return recommendations[type] || 'Review this code for potential security implications.'
  }

  /**
   * Generate comprehensive code analysis
   */
  async analyzeCode(code: string, filename?: string): Promise<CodeAnalysis> {
    const language = this.detectLanguage(code, filename)
    const framework = this.detectFramework(code, language)
    const complexity = this.calculateComplexity(code)
    const security = {
      vulnerabilities: this.analyzeSecurityIssues(code, language),
      score: 0,
    }
    security.score = Math.max(0, 100 - (security.vulnerabilities.length * 10))

    // Generate AI-powered suggestions
    const suggestions = await this.generateAISuggestions(code, language, framework)

    // Estimate test coverage and generate test suggestions
    const testCoverage = await this.analyzeTestCoverage(code, language)

    // Generate documentation
    const documentation = await this.generateDocumentation(code, language)

    // Analyze performance issues
    const performance = this.analyzePerformance(code, language)

    return {
      language,
      framework,
      complexity,
      suggestions,
      testCoverage,
      documentation,
      security,
      performance,
    }
  }

  /**
   * Generate AI-powered code suggestions
   */
  private async generateAISuggestions(
    code: string, 
    language: string, 
    framework?: string
  ): Promise<CodeSuggestion[]> {
    try {
      const prompt = `Analyze this ${language}${framework ? ` (${framework})` : ''} code and provide specific improvement suggestions:

\`\`\`${language}
${code}
\`\`\`

Focus on:
1. Code quality and best practices
2. Performance optimizations
3. Security considerations
4. Maintainability improvements
5. Framework-specific patterns

Format each suggestion as:
- Type: [refactor|performance|security|style|bug]
- Severity: [low|medium|high|critical]
- Line: [line number]
- Message: [brief description]
- Suggestion: [specific improvement]
- Example: [code example if applicable]`

      const response = await this.aiService.generateResponse([
        { role: 'system', content: 'You are an expert code reviewer. Provide precise, actionable suggestions.' },
        { role: 'user', content: prompt }
      ], {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.3,
      })

      return this.parseSuggestionsFromAI(response.content)
    } catch (error) {
      console.error('Error generating AI suggestions:', error)
      return []
    }
  }

  /**
   * Parse suggestions from AI response
   */
  private parseSuggestionsFromAI(response: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = []
    
    // This is a simplified parser - in production, you'd want more robust parsing
    const suggestionBlocks = response.split(/(?=Type:|^\d+\.)/m)
    
    suggestionBlocks.forEach(block => {
      const typeMatch = block.match(/Type:\s*(refactor|performance|security|style|bug)/i)
      const severityMatch = block.match(/Severity:\s*(low|medium|high|critical)/i)
      const lineMatch = block.match(/Line:\s*(\d+)/i)
      const messageMatch = block.match(/Message:\s*(.+?)(?=\n|Suggestion:|$)/i)
      const suggestionMatch = block.match(/Suggestion:\s*(.+?)(?=\n|Example:|$)/i)
      const exampleMatch = block.match(/Example:\s*(.+?)(?=\n\n|$)/s)

      if (typeMatch && severityMatch && messageMatch && suggestionMatch) {
        suggestions.push({
          type: typeMatch[1].toLowerCase() as CodeSuggestion['type'],
          severity: severityMatch[1].toLowerCase() as CodeSuggestion['severity'],
          line: lineMatch ? parseInt(lineMatch[1]) : 1,
          message: messageMatch[1].trim(),
          suggestion: suggestionMatch[1].trim(),
          example: exampleMatch ? exampleMatch[1].trim() : undefined,
        })
      }
    })

    return suggestions
  }

  /**
   * Analyze test coverage and suggest tests
   */
  private async analyzeTestCoverage(code: string, language: string): Promise<CodeAnalysis['testCoverage']> {
    const functions = this.extractFunctions(code, language)
    const classes = this.extractClasses(code, language)
    
    const totalTestableUnits = functions.length + classes.length
    const estimatedCoverage = totalTestableUnits > 0 ? Math.min(30, totalTestableUnits * 5) : 0

    const suggestedTests = [
      ...functions.map(fn => `Test ${fn} function with various inputs`),
      ...classes.map(cls => `Test ${cls} class methods and edge cases`),
    ]

    return {
      estimatedCoverage,
      suggestedTests: suggestedTests.slice(0, 10), // Limit to top 10
    }
  }

  /**
   * Extract function names from code
   */
  private extractFunctions(code: string, language: string): string[] {
    const patterns = {
      javascript: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      typescript: /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|(?:const|let)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=.*=>)/g,
      python: /def\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      java: /(?:public|private|protected)?\s*(?:static)?\s*\w+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
      go: /func\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
    }

    const pattern = patterns[language as keyof typeof patterns]
    if (!pattern) return []

    const matches = code.matchAll(pattern)
    return Array.from(matches, match => match[1] || match[2]).filter(Boolean)
  }

  /**
   * Extract class names from code
   */
  private extractClasses(code: string, language: string): string[] {
    const patterns = {
      javascript: /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      typescript: /(?:export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
      python: /class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      java: /(?:public|private)?\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      go: /type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+struct/g,
    }

    const pattern = patterns[language as keyof typeof patterns]
    if (!pattern) return []

    const matches = code.matchAll(pattern)
    return Array.from(matches, match => match[1])
  }

  /**
   * Generate code documentation
   */
  private async generateDocumentation(code: string, language: string): Promise<CodeAnalysis['documentation']> {
    try {
      const prompt = `Generate comprehensive documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Provide:
1. A brief summary of what this code does
2. Documentation for each function (name, description, parameters, return value, examples)
3. Documentation for each class (name, description, methods, properties)

Format as structured data that can be parsed.`

      const response = await this.aiService.generateResponse([
        { role: 'system', content: 'You are a technical documentation expert. Generate clear, comprehensive documentation.' },
        { role: 'user', content: prompt }
      ], {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 0.2,
      })

      return this.parseDocumentationFromAI(response.content)
    } catch (error) {
      console.error('Error generating documentation:', error)
      return {
        summary: 'Documentation generation failed',
        functions: [],
        classes: [],
      }
    }
  }

  /**
   * Parse documentation from AI response
   */
  private parseDocumentationFromAI(response: string): CodeAnalysis['documentation'] {
    // Simplified parsing - in production, you'd want more robust parsing
    return {
      summary: response.split('\n')[0] || 'Code analysis and documentation',
      functions: [], // Would parse function documentation
      classes: [], // Would parse class documentation
    }
  }

  /**
   * Analyze performance issues
   */
  private analyzePerformance(code: string, language: string): CodeAnalysis['performance'] {
    const issues: PerformanceIssue[] = []
    const lines = code.split('\n')

    const performancePatterns = {
      javascript: [
        { pattern: /for\s*\(.*in.*\)/g, type: 'Inefficient Loop', severity: 'medium' as const },
        { pattern: /document\.getElementById/g, type: 'DOM Query', severity: 'low' as const },
        { pattern: /console\.log/g, type: 'Debug Statement', severity: 'low' as const },
      ],
      python: [
        { pattern: /\.append\(\s*.*\s*\)/g, type: 'List Append in Loop', severity: 'medium' as const },
        { pattern: /print\(/g, type: 'Debug Statement', severity: 'low' as const },
      ],
    }

    const patterns = performancePatterns[language as keyof typeof performancePatterns] || []

    lines.forEach((line, index) => {
      patterns.forEach(({ pattern, type, severity }) => {
        if (pattern.test(line)) {
          issues.push({
            type,
            severity,
            line: index + 1,
            description: `Performance issue: ${type}`,
            recommendation: this.getPerformanceRecommendation(type),
            impact: this.getPerformanceImpact(type),
          })
        }
      })
    })

    const score = Math.max(0, 100 - (issues.length * 5))

    return { issues, score }
  }

  /**
   * Get performance recommendation
   */
  private getPerformanceRecommendation(type: string): string {
    const recommendations = {
      'Inefficient Loop': 'Consider using for...of or forEach() for better performance',
      'DOM Query': 'Cache DOM elements or use more efficient selectors',
      'Debug Statement': 'Remove debug statements in production code',
      'List Append in Loop': 'Consider using list comprehension or pre-allocating list size',
    }

    return recommendations[type] || 'Review for potential performance optimization'
  }

  /**
   * Get performance impact description
   */
  private getPerformanceImpact(type: string): string {
    const impacts = {
      'Inefficient Loop': 'Can slow down iteration over large datasets',
      'DOM Query': 'Multiple DOM queries can impact rendering performance',
      'Debug Statement': 'Console logging can impact production performance',
      'List Append in Loop': 'Can cause memory reallocations and slow performance',
    }

    return impacts[type] || 'May impact application performance'
  }
}

export const codeAnalysisService = new CodeAnalysisService()