/**
 * @fileoverview Test Validator
 * Validates generated tests for correctness and best practices
 */

import { EventEmitter } from 'events';
import {
  TestSuite,
  GeneratedTest,
  TestFramework,
  TestValidationResult,
  ValidationError,
  ValidationWarning
} from './types';

export class TestValidator extends EventEmitter {
  private validationRules: Map<string, ValidationRule> = new Map();
  private initialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    this.loadValidationRules();
    this.initialized = true;
    this.emit('validator:initialized');
  }

  async validate(testSuite: TestSuite, framework: TestFramework): Promise<TestValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];
    
    // Validate the test suite structure
    const suiteValidation = this.validateTestSuite(testSuite);
    errors.push(...suiteValidation.errors);
    warnings.push(...suiteValidation.warnings);
    
    // Validate individual tests
    for (const test of testSuite.tests) {
      const testValidation = this.validateTest(test, framework);
      errors.push(...testValidation.errors);
      warnings.push(...testValidation.warnings);
    }
    
    // Framework-specific validation
    const frameworkValidation = this.validateFrameworkSpecifics(testSuite, framework);
    errors.push(...frameworkValidation.errors);
    warnings.push(...frameworkValidation.warnings);
    
    // Generate suggestions
    suggestions.push(...this.generateSuggestions(testSuite, errors, warnings));
    
    // Calculate score
    const score = this.calculateValidationScore(testSuite, errors, warnings);
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score
    };
  }

  private validateTestSuite(testSuite: TestSuite): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check required fields
    if (!testSuite.name) {
      errors.push({
        type: 'syntax',
        severity: 'error',
        message: 'Test suite must have a name',
        rule: 'suite-name-required'
      });
    }
    
    if (!testSuite.tests || testSuite.tests.length === 0) {
      errors.push({
        type: 'logic',
        severity: 'error',
        message: 'Test suite must contain at least one test',
        rule: 'suite-tests-required'
      });
    }
    
    // Check for duplicate test names
    const testNames = testSuite.tests.map(t => t.name);
    const duplicates = testNames.filter((name, index) => testNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push({
        type: 'logic',
        severity: 'error',
        message: `Duplicate test names found: ${duplicates.join(', ')}`,
        rule: 'no-duplicate-test-names'
      });
    }
    
    // Check naming conventions
    if (testSuite.name && !this.isValidTestSuiteName(testSuite.name)) {
      warnings.push({
        type: 'convention',
        message: 'Test suite name should follow naming conventions',
        suggestion: 'Use descriptive names that clearly indicate what is being tested'
      });
    }
    
    return { errors, warnings };
  }

  private validateTest(test: GeneratedTest, framework: TestFramework): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Check required fields
    if (!test.name) {
      errors.push({
        type: 'syntax',
        severity: 'error',
        message: 'Test must have a name',
        rule: 'test-name-required'
      });
    }
    
    if (!test.code) {
      errors.push({
        type: 'syntax',
        severity: 'error',
        message: 'Test must have code',
        rule: 'test-code-required'
      });
    }
    
    // Validate test code syntax
    if (test.code) {
      const syntaxValidation = this.validateTestCode(test.code, framework);
      errors.push(...syntaxValidation.errors);
      warnings.push(...syntaxValidation.warnings);
    }
    
    // Check for assertions
    if (test.assertions.length === 0 && test.code && !this.hasAssertionInCode(test.code, framework)) {
      warnings.push({
        type: 'maintainability',
        message: 'Test should have explicit assertions',
        suggestion: 'Add assertions to verify expected behavior'
      });
    }
    
    // Check test complexity
    if (test.complexity > 10) {
      warnings.push({
        type: 'maintainability',
        message: 'Test complexity is very high',
        suggestion: 'Consider breaking down complex tests into smaller, focused tests'
      });
    }
    
    // Check naming conventions
    if (test.name && !this.isValidTestName(test.name)) {
      warnings.push({
        type: 'convention',
        message: 'Test name should follow naming conventions',
        suggestion: 'Use descriptive names that clearly state what is being tested'
      });
    }
    
    return { errors, warnings };
  }

  private validateTestCode(code: string, framework: TestFramework): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Basic syntax checking (simplified)
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Check for common syntax issues
      if (line && !line.endsWith(';') && !line.endsWith('{') && !line.endsWith('}') && 
          !line.startsWith('//') && !line.startsWith('/*') && framework === 'jest') {
        // This is a simplified check - real implementation would be more sophisticated
        if (line.includes('expect(') || line.includes('assert')) {
          warnings.push({
            type: 'convention',
            message: `Line ${lineNumber}: Consider adding semicolon`,
            line: lineNumber,
            suggestion: 'Add semicolon at end of statement'
          });
        }
      }
      
      // Check for hardcoded values
      if (line.includes('localhost') || line.includes('127.0.0.1')) {
        warnings.push({
          type: 'maintainability',
          message: `Line ${lineNumber}: Avoid hardcoded URLs in tests`,
          line: lineNumber,
          suggestion: 'Use configuration or mock URLs instead'
        });
      }
      
      // Check for console.log statements
      if (line.includes('console.log')) {
        warnings.push({
          type: 'best_practice',
          message: `Line ${lineNumber}: Remove console.log statements from tests`,
          line: lineNumber,
          suggestion: 'Use proper assertions or debugging tools'
        });
      }
    }
    
    return { errors, warnings };
  }

  private validateFrameworkSpecifics(testSuite: TestSuite, framework: TestFramework): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    switch (framework) {
      case 'jest':
        return this.validateJestSpecifics(testSuite);
      case 'pytest':
        return this.validatePytestSpecifics(testSuite);
      case 'junit5':
        return this.validateJUnit5Specifics(testSuite);
      default:
        return { errors, warnings };
    }
  }

  private validateJestSpecifics(testSuite: TestSuite): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const test of testSuite.tests) {
      // Check for proper Jest patterns
      if (test.code.includes('expect(') && !test.code.includes('.to')) {
        // This is Jest syntax, which is good
      } else if (test.code.includes('assert.')) {
        warnings.push({
          type: 'convention',
          message: 'Use Jest expect() syntax instead of assert',
          suggestion: 'Replace assert statements with expect() assertions'
        });
      }
      
      // Check for async/await patterns
      if (test.code.includes('async') && !test.code.includes('await')) {
        warnings.push({
          type: 'best_practice',
          message: 'Async test should use await',
          suggestion: 'Add await to async operations in test'
        });
      }
    }
    
    return { errors, warnings };
  }

  private validatePytestSpecifics(testSuite: TestSuite): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const test of testSuite.tests) {
      // Check naming convention
      if (!test.name.startsWith('test_')) {
        errors.push({
          type: 'convention',
          severity: 'error',
          message: 'Pytest test names must start with "test_"',
          rule: 'pytest-naming-convention'
        });
      }
      
      // Check for proper assertions
      if (test.code.includes('expect(')) {
        warnings.push({
          type: 'convention',
          message: 'Use pytest assert statements instead of expect()',
          suggestion: 'Replace expect() with assert statements'
        });
      }
    }
    
    return { errors, warnings };
  }

  private validateJUnit5Specifics(testSuite: TestSuite): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    for (const test of testSuite.tests) {
      // Check for @Test annotation
      if (!test.code.includes('@Test')) {
        errors.push({
          type: 'framework',
          severity: 'error',
          message: 'JUnit5 tests must have @Test annotation',
          rule: 'junit5-test-annotation'
        });
      }
      
      // Check method naming
      if (test.name.includes(' ')) {
        warnings.push({
          type: 'convention',
          message: 'JUnit5 test methods should use camelCase, not spaces',
          suggestion: 'Use @DisplayName annotation for readable test names'
        });
      }
    }
    
    return { errors, warnings };
  }

  private hasAssertionInCode(code: string, framework: TestFramework): boolean {
    const assertionPatterns: Record<TestFramework, string[]> = {
      'jest': ['expect(', 'toEqual', 'toBe', 'toHaveProperty', 'toThrow'],
      'pytest': ['assert ', 'assert_', 'pytest.raises'],
      'junit5': ['assertEquals', 'assertTrue', 'assertFalse', 'assertThrows'],
      'mocha': ['expect(', 'should.', 'assert.'],
      'nunit': ['Assert.', 'StringAssert.', 'CollectionAssert.']
    };
    
    const patterns = assertionPatterns[framework] || ['assert', 'expect'];
    return patterns.some(pattern => code.includes(pattern));
  }

  private isValidTestSuiteName(name: string): boolean {
    // Basic validation - could be more sophisticated
    return name.length > 3 && !name.includes('test test') && !name.includes('Test Test');
  }

  private isValidTestName(name: string): boolean {
    // Basic validation for test names
    return name.length > 5 && 
           (name.startsWith('should ') || 
            name.startsWith('test_') || 
            name.includes('when ') || 
            name.includes('given '));
  }

  private generateSuggestions(testSuite: TestSuite, errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const suggestions: string[] = [];
    
    // General suggestions based on validation results
    if (errors.length > 0) {
      suggestions.push('Fix all validation errors before running tests');
    }
    
    if (warnings.length > 3) {
      suggestions.push('Consider addressing validation warnings to improve test quality');
    }
    
    // Test coverage suggestions
    const totalTests = testSuite.tests.length;
    if (totalTests < 3) {
      suggestions.push('Consider adding more test cases to improve coverage');
    }
    
    // Complexity suggestions
    const avgComplexity = testSuite.tests.reduce((sum, test) => sum + test.complexity, 0) / totalTests;
    if (avgComplexity > 5) {
      suggestions.push('Consider simplifying complex tests for better maintainability');
    }
    
    // Assertion suggestions
    const testsWithoutAssertions = testSuite.tests.filter(test => test.assertions.length === 0);
    if (testsWithoutAssertions.length > 0) {
      suggestions.push('Add explicit assertions to all tests');
    }
    
    return suggestions;
  }

  private calculateValidationScore(testSuite: TestSuite, errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;
    
    // Deduct points for errors
    score -= errors.length * 20;
    
    // Deduct points for warnings
    score -= warnings.length * 5;
    
    // Bonus points for good practices
    const testsWithAssertions = testSuite.tests.filter(test => test.assertions.length > 0);
    score += (testsWithAssertions.length / testSuite.tests.length) * 10;
    
    // Bonus for descriptive test names
    const descriptiveTests = testSuite.tests.filter(test => this.isValidTestName(test.name));
    score += (descriptiveTests.length / testSuite.tests.length) * 5;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private loadValidationRules(): void {
    // Load built-in validation rules
    this.validationRules.set('suite-name-required', {
      id: 'suite-name-required',
      name: 'Suite Name Required',
      description: 'Test suite must have a name',
      category: 'syntax',
      severity: 'error',
      enabled: true
    });
    
    this.validationRules.set('test-name-required', {
      id: 'test-name-required',
      name: 'Test Name Required',
      description: 'Each test must have a name',
      category: 'syntax',
      severity: 'error',
      enabled: true
    });
    
    this.validationRules.set('no-duplicate-test-names', {
      id: 'no-duplicate-test-names',
      name: 'No Duplicate Test Names',
      description: 'Test names must be unique within a suite',
      category: 'logic',
      severity: 'error',
      enabled: true
    });
    
    // Add more rules...
  }

  async addCustomRule(rule: ValidationRule): Promise<void> {
    this.validationRules.set(rule.id, rule);
    this.emit('rule:added', { rule });
  }

  async removeRule(ruleId: string): Promise<void> {
    if (this.validationRules.delete(ruleId)) {
      this.emit('rule:removed', { ruleId });
    }
  }

  async enableRule(ruleId: string): Promise<void> {
    const rule = this.validationRules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.emit('rule:enabled', { ruleId });
    }
  }

  async disableRule(ruleId: string): Promise<void> {
    const rule = this.validationRules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.emit('rule:disabled', { ruleId });
    }
  }

  getRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  getEnabledRules(): ValidationRule[] {
    return Array.from(this.validationRules.values()).filter(rule => rule.enabled);
  }
}

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'syntax' | 'logic' | 'framework' | 'dependency' | 'best_practice';
  severity: 'error' | 'warning';
  enabled: boolean;
}