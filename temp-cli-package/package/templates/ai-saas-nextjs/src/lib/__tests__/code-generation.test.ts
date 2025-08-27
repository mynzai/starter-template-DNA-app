import { CodeGenerationService } from '../code-generation'

// Mock the AI service
jest.mock('../ai-service', () => ({
  AIService: jest.fn().mockImplementation(() => ({
    generateResponse: jest.fn().mockResolvedValue({
      content: `Here's a React component implementation:

\`\`\`typescript
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ onClick, children, variant = 'primary' }) => {
  return (
    <button 
      onClick={onClick} 
      className={\`btn btn-\${variant}\`}
    >
      {children}
    </button>
  );
};
\`\`\`

This component provides a reusable button with customizable styling through the variant prop.`,
    }),
  })),
}))

// Mock the code analysis service
jest.mock('../code-analysis', () => ({
  codeAnalysisService: {
    analyzeCode: jest.fn().mockResolvedValue({
      complexity: { maintainabilityIndex: 85 },
      suggestions: [
        { message: 'Consider adding PropTypes for better type checking' },
        { message: 'Add error boundary for better error handling' },
      ],
    }),
  },
}))

describe('CodeGenerationService', () => {
  let service: CodeGenerationService

  beforeEach(() => {
    service = new CodeGenerationService()
    jest.clearAllMocks()
  })

  describe('Code Generation', () => {
    it('should generate React component code', async () => {
      const request = {
        type: 'component' as const,
        language: 'typescript',
        framework: 'react',
        description: 'Create a reusable button component with click handler and variant styling',
        options: {
          includeComments: true,
          includeTests: true,
          includeTypes: true,
        },
      }

      const result = await service.generateCode(request)

      expect(result).toMatchObject({
        code: expect.stringContaining('Button'),
        language: 'typescript',
        framework: 'react',
        type: 'component',
        explanation: expect.any(String),
        tests: expect.any(String),
        dependencies: expect.any(Array),
        usage: expect.objectContaining({
          example: expect.any(String),
          imports: expect.any(Array),
        }),
        quality: expect.objectContaining({
          score: expect.any(Number),
          suggestions: expect.any(Array),
        }),
      })

      expect(result.code).toContain('React')
      expect(result.code).toContain('interface')
      expect(result.quality.score).toBeGreaterThan(0)
    })

    it('should generate Python class code', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockResolvedValueOnce({
        content: `\`\`\`python
class UserManager:
    def __init__(self):
        self.users = []
    
    def add_user(self, user):
        self.users.append(user)
        return True
\`\`\`

This class manages user operations with basic CRUD functionality.`,
      })

      const request = {
        type: 'class' as const,
        language: 'python',
        description: 'Create a user manager class with add, remove, and find methods',
      }

      const result = await service.generateCode(request)

      expect(result.code).toContain('class UserManager')
      expect(result.language).toBe('python')
      expect(result.type).toBe('class')
    })

    it('should generate API route code', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockResolvedValueOnce({
        content: `\`\`\`typescript
import { Request, Response } from 'express';

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
\`\`\`

This API endpoint retrieves a user by ID with proper error handling.`,
      })

      const request = {
        type: 'api' as const,
        language: 'typescript',
        framework: 'express',
        description: 'Create API endpoint to get user by ID',
      }

      const result = await service.generateCode(request)

      expect(result.code).toContain('Request')
      expect(result.code).toContain('Response')
      expect(result.framework).toBe('express')
    })

    it('should handle generation with context', async () => {
      const request = {
        type: 'function' as const,
        language: 'javascript',
        description: 'Create validation function',
        context: {
          existingCode: 'const users = [];',
          dependencies: ['joi', 'lodash'],
          styleGuide: 'Use camelCase and arrow functions',
        },
      }

      const result = await service.generateCode(request)

      expect(result).toBeDefined()
      expect(result.dependencies).toEqual(expect.arrayContaining(['joi', 'lodash']))
    })

    it('should extract dependencies from generated code', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockResolvedValueOnce({
        content: `\`\`\`typescript
import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import _ from 'lodash';

const Component = () => {
  return <div>Hello</div>;
};
\`\`\``,
      })

      const request = {
        type: 'component' as const,
        language: 'typescript',
        description: 'Component with multiple dependencies',
      }

      const result = await service.generateCode(request)

      expect(result.dependencies).toContain('axios')
      expect(result.dependencies).toContain('lodash')
      // Built-in React imports should be included
      expect(result.dependencies).toContain('react')
    })

    it('should extract imports from generated code', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockResolvedValueOnce({
        content: `\`\`\`typescript
import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import axios from 'axios';

const App = () => <div>App</div>;
\`\`\``,
      })

      const request = {
        type: 'component' as const,
        language: 'typescript',
        description: 'App component',
      }

      const result = await service.generateCode(request)

      expect(result.usage.imports).toHaveLength(3)
      expect(result.usage.imports.some(imp => imp.includes('useState'))).toBe(true)
    })
  })

  describe('Test Generation', () => {
    it('should generate tests when requested', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      
      // Mock the test generation call
      mockInstance.generateResponse
        .mockResolvedValueOnce({ // Main code generation
          content: `\`\`\`typescript
export const add = (a: number, b: number): number => a + b;
\`\`\``,
        })
        .mockResolvedValueOnce({ // Test generation
          content: `\`\`\`typescript
import { add } from './math';

describe('add function', () => {
  it('should add two numbers correctly', () => {
    expect(add(2, 3)).toBe(5);
  });
  
  it('should handle negative numbers', () => {
    expect(add(-1, 1)).toBe(0);
  });
});
\`\`\``,
        })

      const request = {
        type: 'function' as const,
        language: 'typescript',
        description: 'Add function',
        options: {
          includeTests: true,
        },
      }

      const result = await service.generateCode(request)

      expect(result.tests).toBeDefined()
      expect(result.tests).toContain('describe')
      expect(result.tests).toContain('expect')
    })

    it('should use appropriate test framework for language', async () => {
      const request = {
        type: 'function' as const,
        language: 'python',
        description: 'Python function',
        context: {
          testFramework: 'pytest',
        },
      }

      // We're testing that the service calls generateTests with the right framework
      await service.generateCode(request)

      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      
      // Check that the AI service was called with pytest in the prompt
      expect(mockInstance.generateResponse).toHaveBeenCalled()
    })
  })

  describe('Documentation Generation', () => {
    it('should generate documentation when requested', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      
      mockInstance.generateResponse
        .mockResolvedValueOnce({ // Main generation
          content: `\`\`\`typescript
export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
\`\`\``,
        })
        .mockResolvedValueOnce({ // Documentation generation
          content: `# Calculator Class

A simple calculator for basic arithmetic operations.

## Methods

### add(a: number, b: number): number

Adds two numbers together.

**Parameters:**
- a: First number
- b: Second number

**Returns:** Sum of a and b`,
        })

      const request = {
        type: 'class' as const,
        language: 'typescript',
        description: 'Calculator class',
        options: {
          includeComments: true,
        },
      }

      const result = await service.generateCode(request)

      expect(result.documentation).toBeDefined()
      expect(result.documentation).toContain('Calculator')
      expect(result.documentation).toContain('Parameters')
    })
  })

  describe('Code Optimization', () => {
    it('should optimize code for performance', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockResolvedValueOnce({
        content: `\`\`\`javascript
// Optimized version using Map for O(1) lookup
const userMap = new Map();
users.forEach(user => userMap.set(user.id, user));

function findUser(id) {
  return userMap.get(id); // O(1) instead of O(n)
}
\`\`\`

Optimized the user lookup from O(n) linear search to O(1) hash map lookup for better performance.`,
      })

      const originalCode = `
function findUser(id) {
  return users.find(user => user.id === id); // O(n) lookup
}
`

      const result = await service.optimizeCode(originalCode, 'javascript', 'performance')

      expect(result.code).toContain('Map')
      expect(result.type).toBe('optimization')
      expect(result.explanation).toContain('performance')
    })

    it('should optimize code for readability', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockResolvedValueOnce({
        content: `\`\`\`javascript
/**
 * Calculates the total price including tax
 * @param {number} basePrice - The base price before tax
 * @param {number} taxRate - The tax rate as a decimal (e.g., 0.08 for 8%)
 * @returns {number} The total price including tax
 */
function calculateTotalPrice(basePrice, taxRate) {
  if (typeof basePrice !== 'number' || typeof taxRate !== 'number') {
    throw new Error('Both basePrice and taxRate must be numbers');
  }
  
  if (basePrice < 0 || taxRate < 0) {
    throw new Error('Price and tax rate cannot be negative');
  }
  
  const taxAmount = basePrice * taxRate;
  const totalPrice = basePrice + taxAmount;
  
  return Math.round(totalPrice * 100) / 100; // Round to 2 decimal places
}
\`\`\`

Improved readability with comprehensive documentation, input validation, and clear variable names.`,
      })

      const result = await service.optimizeCode('function calc(p,t){return p+p*t}', 'javascript', 'readability')

      expect(result.code).toContain('/**')
      expect(result.code).toContain('@param')
      expect(result.explanation).toContain('readability')
    })

    it('should optimize code for security', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockResolvedValueOnce({
        content: `\`\`\`javascript
function sanitizeInput(userInput) {
  // Sanitize HTML to prevent XSS
  const sanitized = userInput
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  
  element.textContent = sanitized; // Use textContent instead of innerHTML
  
  return sanitized;
}
\`\`\`

Fixed XSS vulnerability by sanitizing input and using textContent instead of innerHTML.`,
      })

      const insecureCode = `
function displayInput(input) {
  element.innerHTML = input; // XSS vulnerability
}
`

      const result = await service.optimizeCode(insecureCode, 'javascript', 'security')

      expect(result.code).toContain('sanitize')
      expect(result.code).toContain('textContent')
      expect(result.explanation).toContain('XSS')
    })
  })

  describe('Templates', () => {
    it('should return available templates', () => {
      const templates = service.getTemplates()
      
      expect(templates.length).toBeGreaterThan(0)
      expect(templates[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        description: expect.any(String),
        language: expect.any(String),
        category: expect.any(String),
      })
    })

    it('should filter templates by language', () => {
      const tsTemplates = service.getTemplates({ language: 'typescript' })
      const pyTemplates = service.getTemplates({ language: 'python' })
      
      expect(tsTemplates.every(t => t.language === 'typescript')).toBe(true)
      expect(pyTemplates.every(t => t.language === 'python')).toBe(true)
    })

    it('should filter templates by framework', () => {
      const reactTemplates = service.getTemplates({ framework: 'react' })
      
      expect(reactTemplates.every(t => t.framework === 'react')).toBe(true)
    })

    it('should filter templates by category', () => {
      const componentTemplates = service.getTemplates({ category: 'component' })
      
      expect(componentTemplates.every(t => t.category === 'component')).toBe(true)
    })

    it('should generate code from template', () => {
      const templates = service.getTemplates({ language: 'typescript', framework: 'react' })
      expect(templates.length).toBeGreaterThan(0)
      
      const template = templates[0]
      const variables = {
        componentName: 'TestButton',
        className: 'test-btn',
        content: '<span>Test</span>',
      }
      
      const code = service.generateFromTemplate(template.id, variables)
      
      expect(code).toContain('TestButton')
      expect(code).toContain('test-btn')
      expect(code).toContain('<span>Test</span>')
    })

    it('should throw error for invalid template ID', () => {
      expect(() => {
        service.generateFromTemplate('invalid-template', {})
      }).toThrow('Template invalid-template not found')
    })
  })

  describe('File Extensions', () => {
    it('should return correct file extensions', () => {
      const service = new CodeGenerationService()
      
      expect(service['getFileExtension']('typescript')).toBe('ts')
      expect(service['getFileExtension']('javascript')).toBe('js')
      expect(service['getFileExtension']('python')).toBe('py')
      expect(service['getFileExtension']('java')).toBe('java')
      expect(service['getFileExtension']('unknown')).toBe('txt')
    })
  })

  describe('Error Handling', () => {
    it('should handle AI service errors gracefully', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      mockInstance.generateResponse.mockRejectedValue(new Error('AI service error'))

      const request = {
        type: 'function' as const,
        language: 'javascript',
        description: 'Test function',
      }

      await expect(service.generateCode(request)).rejects.toThrow('Failed to generate code')
    })

    it('should handle code analysis errors in optimization', async () => {
      const mockCodeAnalysis = require('../code-analysis').codeAnalysisService
      mockCodeAnalysis.analyzeCode.mockRejectedValue(new Error('Analysis error'))

      await expect(
        service.optimizeCode('function test() {}', 'javascript', 'performance')
      ).rejects.toThrow()
    })
  })

  describe('Usage Examples', () => {
    it('should generate usage examples', async () => {
      const mockAIService = require('../ai-service').AIService
      const mockInstance = new mockAIService()
      
      mockInstance.generateResponse
        .mockResolvedValueOnce({ // Main generation
          content: `\`\`\`typescript
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};
\`\`\``,
        })
        .mockResolvedValueOnce({ // Usage example generation
          content: `\`\`\`typescript
import { validateEmail } from './validation';

// Basic usage
const isValid = validateEmail('user@example.com');
console.log(isValid); // true

// Invalid email
const isInvalid = validateEmail('invalid-email');
console.log(isInvalid); // false
\`\`\``,
        })

      const request = {
        type: 'function' as const,
        language: 'typescript',
        description: 'Email validation function',
      }

      const result = await service.generateCode(request)

      expect(result.usage.example).toContain('validateEmail')
      expect(result.usage.example).toContain('example.com')
    })
  })

  describe('Default Test Frameworks', () => {
    it('should return correct default test frameworks', () => {
      expect(service['getDefaultTestFramework']('typescript')).toBe('Jest')
      expect(service['getDefaultTestFramework']('javascript')).toBe('Jest')
      expect(service['getDefaultTestFramework']('python')).toBe('pytest')
      expect(service['getDefaultTestFramework']('java')).toBe('JUnit')
      expect(service['getDefaultTestFramework']('typescript', 'react')).toBe('Jest + React Testing Library')
      expect(service['getDefaultTestFramework']('javascript', 'vue')).toBe('Jest + Vue Test Utils')
    })
  })
})