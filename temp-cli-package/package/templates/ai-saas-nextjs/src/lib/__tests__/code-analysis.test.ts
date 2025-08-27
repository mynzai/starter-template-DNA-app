import { CodeAnalysisService } from '../code-analysis'

// Mock the AI service
jest.mock('../ai-service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      content: `Type: refactor
Severity: medium
Line: 5
Message: Consider using const instead of let
Suggestion: Use const for variables that don't change
Example: const value = 10;

Type: performance
Severity: low
Line: 10
Message: Cache DOM element
Suggestion: Store DOM queries in variables
Example: const element = document.getElementById('myId');`,
    }),
  })),
}))

describe('CodeAnalysisService', () => {
  let service: CodeAnalysisService

  beforeEach(() => {
    service = new CodeAnalysisService()
    jest.clearAllMocks()
  })

  describe('Language Detection', () => {
    it('should detect TypeScript from file extension', () => {
      const code = 'const x: number = 5;'
      const language = service.detectLanguage(code, 'example.ts')
      expect(language).toBe('typescript')
    })

    it('should detect JavaScript from file extension', () => {
      const code = 'const x = 5;'
      const language = service.detectLanguage(code, 'example.js')
      expect(language).toBe('javascript')
    })

    it('should detect Python from file extension', () => {
      const code = 'def hello(): pass'
      const language = service.detectLanguage(code, 'example.py')
      expect(language).toBe('python')
    })

    it('should detect language from code patterns when no filename', () => {
      const tsCode = 'interface User { name: string; }'
      expect(service.detectLanguage(tsCode)).toBe('typescript')

      const pyCode = 'def hello_world():\n    print("Hello")'
      expect(service.detectLanguage(pyCode)).toBe('python')

      const javaCode = 'public class HelloWorld { }'
      expect(service.detectLanguage(javaCode)).toBe('java')
    })

    it('should return text for unrecognized code', () => {
      const unknownCode = 'some random text without programming patterns'
      expect(service.detectLanguage(unknownCode)).toBe('text')
    })
  })

  describe('Framework Detection', () => {
    it('should detect React framework', () => {
      const code = `import React from 'react';
const Component = () => <div>Hello</div>;`
      const framework = service.detectFramework(code, 'typescript')
      expect(framework).toBe('react')
    })

    it('should detect Vue framework', () => {
      const code = `<template><div>Hello</div></template>`
      const framework = service.detectFramework(code, 'javascript')
      expect(framework).toBe('vue')
    })

    it('should detect Express framework', () => {
      const code = `app.get('/api', (req, res) => res.json({}))`
      const framework = service.detectFramework(code, 'javascript')
      expect(framework).toBe('express')
    })

    it('should detect Django framework', () => {
      const code = `from django.db import models
class User(models.Model): pass`
      const framework = service.detectFramework(code, 'python')
      expect(framework).toBe('django')
    })

    it('should return undefined for no framework patterns', () => {
      const code = 'const x = 5;'
      const framework = service.detectFramework(code, 'javascript')
      expect(framework).toBeUndefined()
    })
  })

  describe('Complexity Calculation', () => {
    it('should calculate basic complexity metrics', () => {
      const code = `function test() {
  if (condition) {
    return true;
  } else {
    return false;
  }
}`
      const complexity = service.calculateComplexity(code)
      
      expect(complexity.linesOfCode).toBeGreaterThan(0)
      expect(complexity.cyclomaticComplexity).toBeGreaterThan(1) // Base + if/else
      expect(complexity.maintainabilityIndex).toBeGreaterThan(0)
      expect(complexity.maintainabilityIndex).toBeLessThanOrEqual(100)
    })

    it('should handle empty code', () => {
      const complexity = service.calculateComplexity('')
      expect(complexity.linesOfCode).toBe(0)
      expect(complexity.cyclomaticComplexity).toBe(1) // Base complexity
    })

    it('should increase complexity with more control structures', () => {
      const simpleCode = 'function simple() { return true; }'
      const complexCode = `function complex() {
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      while (condition) {
        if (another) {
          break;
        }
      }
    }
  }
}`
      
      const simpleComplexity = service.calculateComplexity(simpleCode)
      const complexComplexity = service.calculateComplexity(complexCode)
      
      expect(complexComplexity.cyclomaticComplexity).toBeGreaterThan(simpleComplexity.cyclomaticComplexity)
      expect(complexComplexity.cognitiveComplexity).toBeGreaterThan(simpleComplexity.cognitiveComplexity)
    })
  })

  describe('Security Analysis', () => {
    it('should detect JavaScript security issues', () => {
      const code = `
document.innerHTML = userInput;
eval(someCode);
localStorage.setItem('password', 'secret123');
`
      const issues = service.analyzeSecurityIssues(code, 'javascript')
      
      expect(issues).toHaveLength(3)
      expect(issues.some(issue => issue.type === 'XSS Vulnerability')).toBe(true)
      expect(issues.some(issue => issue.type === 'Code Injection')).toBe(true)
      expect(issues.some(issue => issue.type === 'Sensitive Data Storage')).toBe(true)
    })

    it('should detect Python security issues', () => {
      const code = `
import os
os.system(user_command)
exec(user_code)
password = "hardcoded123"
`
      const issues = service.analyzeSecurityIssues(code, 'python')
      
      expect(issues.length).toBeGreaterThan(0)
      expect(issues.some(issue => issue.type === 'Command Injection')).toBe(true)
      expect(issues.some(issue => issue.type === 'Code Injection')).toBe(true)
      expect(issues.some(issue => issue.type === 'Hardcoded Password')).toBe(true)
    })

    it('should handle code with no security issues', () => {
      const code = `function safeFunction() {
  const data = JSON.parse(input);
  return data.name;
}`
      const issues = service.analyzeSecurityIssues(code, 'javascript')
      expect(issues).toHaveLength(0)
    })

    it('should provide appropriate severity levels', () => {
      const code = 'eval(userInput);'
      const issues = service.analyzeSecurityIssues(code, 'javascript')
      
      expect(issues).toHaveLength(1)
      expect(issues[0].severity).toBe('critical')
    })
  })

  describe('Performance Analysis', () => {
    it('should detect JavaScript performance issues', () => {
      const code = `
for (var i in array) {
  console.log(i);
  document.getElementById('element');
}
`
      const analysis = service.analyzePerformance(code, 'javascript')
      
      expect(analysis.issues.length).toBeGreaterThan(0)
      expect(analysis.issues.some(issue => issue.type === 'Inefficient Loop')).toBe(true)
      expect(analysis.issues.some(issue => issue.type === 'DOM Query')).toBe(true)
      expect(analysis.issues.some(issue => issue.type === 'Debug Statement')).toBe(true)
      expect(analysis.score).toBeGreaterThanOrEqual(0)
      expect(analysis.score).toBeLessThanOrEqual(100)
    })

    it('should detect Python performance issues', () => {
      const code = `
items = []
for i in range(1000):
    items.append(i)
    print(f"Processing {i}")
`
      const analysis = service.analyzePerformance(code, 'python')
      
      expect(analysis.issues.length).toBeGreaterThan(0)
      expect(analysis.score).toBeLessThan(100) // Should be penalized for issues
    })

    it('should handle efficient code', () => {
      const code = `function efficientFunction(data) {
  return data.map(item => item.value);
}`
      const analysis = service.analyzePerformance(code, 'javascript')
      
      expect(analysis.score).toBeGreaterThan(90) // Should score high
    })
  })

  describe('Full Code Analysis', () => {
    it('should perform comprehensive analysis', async () => {
      const code = `function processUser(user) {
  if (user.age > 18) {
    document.innerHTML = user.name;
    return true;
  }
  return false;
}`
      
      const analysis = await service.analyzeCode(code, 'example.js')
      
      expect(analysis).toMatchObject({
        language: 'javascript',
        complexity: expect.objectContaining({
          cyclomaticComplexity: expect.any(Number),
          cognitiveComplexity: expect.any(Number),
          linesOfCode: expect.any(Number),
          maintainabilityIndex: expect.any(Number),
        }),
        suggestions: expect.any(Array),
        testCoverage: expect.objectContaining({
          estimatedCoverage: expect.any(Number),
          suggestedTests: expect.any(Array),
        }),
        documentation: expect.objectContaining({
          summary: expect.any(String),
          functions: expect.any(Array),
          classes: expect.any(Array),
        }),
        security: expect.objectContaining({
          vulnerabilities: expect.any(Array),
          score: expect.any(Number),
        }),
        performance: expect.objectContaining({
          issues: expect.any(Array),
          score: expect.any(Number),
        }),
      })
    })

    it('should detect functions and classes for test coverage', async () => {
      const code = `
class UserService {
  constructor() {}
  
  validateUser(user) {
    return user.email && user.password;
  }
  
  createUser(userData) {
    return new User(userData);
  }
}

function hashPassword(password) {
  return hash(password);
}
`
      
      const analysis = await service.analyzeCode(code, 'example.js')
      
      expect(analysis.testCoverage.suggestedTests.length).toBeGreaterThan(0)
      expect(analysis.testCoverage.suggestedTests.some(test => 
        test.includes('validateUser') || test.includes('UserService')
      )).toBe(true)
    })

    it('should handle TypeScript-specific features', async () => {
      const code = `
interface User {
  id: number;
  email: string;
}

class UserService implements ServiceInterface {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUser(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
`
      
      const analysis = await service.analyzeCode(code, 'example.ts')
      
      expect(analysis.language).toBe('typescript')
      expect(analysis.complexity.linesOfCode).toBeGreaterThan(0)
    })

    it('should provide meaningful suggestions', async () => {
      const code = 'var x = 5; eval("console.log(x)");'
      
      const analysis = await service.analyzeCode(code)
      
      expect(analysis.suggestions.length).toBeGreaterThan(0)
      expect(analysis.security.vulnerabilities.length).toBeGreaterThan(0)
    })

    it('should handle edge cases gracefully', async () => {
      const analysis = await service.analyzeCode('')
      
      expect(analysis.language).toBe('text')
      expect(analysis.complexity.linesOfCode).toBe(0)
      expect(analysis.suggestions).toEqual([])
    })
  })

  describe('Function and Class Extraction', () => {
    it('should extract JavaScript functions', async () => {
      const code = `
function regularFunction() {}
const arrowFunction = () => {};
let anotherArrow = (param) => param * 2;
`
      
      const analysis = await service.analyzeCode(code)
      
      // This tests the internal function extraction through test coverage analysis
      expect(analysis.testCoverage.suggestedTests.length).toBeGreaterThan(0)
    })

    it('should extract Python functions and classes', async () => {
      const code = `
def simple_function():
    pass

class MyClass:
    def method(self):
        return True
        
def another_function(param1, param2):
    return param1 + param2
`
      
      const analysis = await service.analyzeCode(code, 'example.py')
      
      expect(analysis.testCoverage.suggestedTests.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockRejectedValue(new Error('AI service error'))

      const analysis = await service.analyzeCode('function test() {}')
      
      // Should still return analysis even if AI suggestions fail
      expect(analysis).toBeDefined()
      expect(analysis.suggestions).toEqual([])
    })

    it('should handle malformed code', async () => {
      const malformedCode = 'function incomplete() { if (true'
      
      const analysis = await service.analyzeCode(malformedCode)
      
      expect(analysis).toBeDefined()
      expect(analysis.language).toBeDefined()
      expect(analysis.complexity).toBeDefined()
    })
  })
})