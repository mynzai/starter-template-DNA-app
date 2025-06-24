/**
 * @fileoverview Test Optimizer
 * Optimizes test suites for performance and maintainability
 */

import { EventEmitter } from 'events';
import {
  TestSuite,
  GeneratedTest,
  TestOptimizationResult,
  OptimizationSuggestion
} from './types';

export class TestOptimizer extends EventEmitter {
  private initialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.emit('optimizer:initialized');
  }

  async optimize(testSuite: TestSuite): Promise<TestOptimizationResult> {
    const originalTests = testSuite.tests.length;
    const suggestions: OptimizationSuggestion[] = [];
    
    // Find duplicates
    const duplicateInfo = this.findDuplicateTests(testSuite.tests);
    const duplicatesRemoved = duplicateInfo.duplicates.length;
    
    // Find redundant tests
    const redundantInfo = this.findRedundantTests(testSuite.tests);
    const redundantTestsRemoved = redundantInfo.redundant.length;
    
    // Find combinable tests
    const combinableInfo = this.findCombinableTests(testSuite.tests);
    const combinedTests = combinableInfo.combinable.length;
    
    // Calculate execution time reduction
    const executionTimeReduction = this.calculateExecutionTimeReduction(
      testSuite.tests,
      duplicatesRemoved,
      redundantTestsRemoved,
      combinedTests
    );
    
    // Generate optimization suggestions
    suggestions.push(...this.generateOptimizationSuggestions(
      duplicateInfo,
      redundantInfo,
      combinableInfo,
      testSuite.tests
    ));
    
    const optimizedTests = originalTests - duplicatesRemoved - redundantTestsRemoved + combinedTests;
    
    return {
      originalTests,
      optimizedTests,
      duplicatesRemoved,
      redundantTestsRemoved,
      combinedTests,
      executionTimeReduction,
      suggestions
    };
  }

  private findDuplicateTests(tests: GeneratedTest[]): {
    duplicates: { original: GeneratedTest; duplicate: GeneratedTest }[];
    unique: GeneratedTest[];
  } {
    const duplicates: { original: GeneratedTest; duplicate: GeneratedTest }[] = [];
    const unique: GeneratedTest[] = [];
    const seen = new Map<string, GeneratedTest>();
    
    for (const test of tests) {
      const signature = this.getTestSignature(test);
      const existing = seen.get(signature);
      
      if (existing) {
        duplicates.push({ original: existing, duplicate: test });
      } else {
        seen.set(signature, test);
        unique.push(test);
      }
    }
    
    return { duplicates, unique };
  }

  private findRedundantTests(tests: GeneratedTest[]): {
    redundant: GeneratedTest[];
    essential: GeneratedTest[];
  } {
    const redundant: GeneratedTest[] = [];
    const essential: GeneratedTest[] = [];
    
    // Group tests by the function/feature they test
    const testGroups = this.groupTestsByFeature(tests);
    
    for (const [feature, featureTests] of testGroups) {
      if (featureTests.length > 1) {
        // Sort by complexity and keep the most comprehensive ones
        const sorted = featureTests.sort((a, b) => b.complexity - a.complexity);
        
        // Keep the most complex test and tests that add unique value
        essential.push(sorted[0]);
        
        for (let i = 1; i < sorted.length; i++) {
          const test = sorted[i];
          const isRedundant = this.isTestRedundant(test, essential);
          
          if (isRedundant) {
            redundant.push(test);
          } else {
            essential.push(test);
          }
        }
      } else {
        essential.push(...featureTests);
      }
    }
    
    return { redundant, essential };
  }

  private findCombinableTests(tests: GeneratedTest[]): {
    combinable: { tests: GeneratedTest[]; combined: GeneratedTest }[];
    remaining: GeneratedTest[];
  } {
    const combinable: { tests: GeneratedTest[]; combined: GeneratedTest }[] = [];
    const remaining: GeneratedTest[] = [...tests];
    
    // Find tests that can be combined based on similar setup/teardown
    const setupGroups = this.groupTestsBySetup(tests);
    
    for (const [setup, setupTests] of setupGroups) {
      if (setupTests.length > 2 && this.canCombineTests(setupTests)) {
        const combinedTest = this.combineTests(setupTests);
        combinable.push({ tests: setupTests, combined: combinedTest });
        
        // Remove combined tests from remaining
        for (const test of setupTests) {
          const index = remaining.indexOf(test);
          if (index > -1) {
            remaining.splice(index, 1);
          }
        }
        
        remaining.push(combinedTest);
      }
    }
    
    return { combinable, remaining };
  }

  private getTestSignature(test: GeneratedTest): string {
    // Create a signature based on test structure (ignoring variable names)
    const normalized = test.code
      .replace(/\b\w+(?=\s*[=:])/g, 'VAR') // Replace variable names
      .replace(/\d+/g, 'NUM') // Replace numbers
      .replace(/["'].*?["']/g, 'STR') // Replace strings
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return `${test.type}:${normalized}`;
  }

  private groupTestsByFeature(tests: GeneratedTest[]): Map<string, GeneratedTest[]> {
    const groups = new Map<string, GeneratedTest[]>();
    
    for (const test of tests) {
      // Extract feature name from test name or code
      const feature = this.extractFeatureName(test);
      
      if (!groups.has(feature)) {
        groups.set(feature, []);
      }
      groups.get(feature)!.push(test);
    }
    
    return groups;
  }

  private groupTestsBySetup(tests: GeneratedTest[]): Map<string, GeneratedTest[]> {
    const groups = new Map<string, GeneratedTest[]>();
    
    for (const test of tests) {
      // Group by similar setup patterns
      const setupSignature = this.getSetupSignature(test);
      
      if (!groups.has(setupSignature)) {
        groups.set(setupSignature, []);
      }
      groups.get(setupSignature)!.push(test);
    }
    
    return groups;
  }

  private extractFeatureName(test: GeneratedTest): string {
    // Extract the main feature/function being tested
    const codeMatch = test.code.match(/(\w+)\s*\(/);
    if (codeMatch) {
      return codeMatch[1];
    }
    
    // Fallback to test name analysis
    const nameWords = test.name.toLowerCase().split(' ');
    const relevantWords = nameWords.filter(word => 
      !['should', 'test', 'when', 'given', 'then', 'and', 'or', 'the', 'a', 'an'].includes(word)
    );
    
    return relevantWords[0] || 'unknown';
  }

  private getSetupSignature(test: GeneratedTest): string {
    // Analyze test setup requirements
    const setupElements: string[] = [];
    
    // Check for mocks
    if (test.mocks.length > 0) {
      setupElements.push('mocks');
    }
    
    // Check for test data
    if (test.testData.length > 0) {
      setupElements.push('testdata');
    }
    
    // Check for async operations
    if (test.code.includes('async') || test.code.includes('await')) {
      setupElements.push('async');
    }
    
    // Check for external dependencies
    if (test.code.includes('fetch') || test.code.includes('http')) {
      setupElements.push('network');
    }
    
    return setupElements.sort().join(':') || 'simple';
  }

  private isTestRedundant(test: GeneratedTest, existingTests: GeneratedTest[]): boolean {
    // Check if the test adds unique value
    const testAssertions = new Set(test.assertions.map(a => `${a.type}:${a.expected}`));
    
    for (const existing of existingTests) {
      const existingAssertions = new Set(existing.assertions.map(a => `${a.type}:${a.expected}`));
      
      // If all assertions are covered by existing test
      const uniqueAssertions = [...testAssertions].filter(a => !existingAssertions.has(a));
      if (uniqueAssertions.length === 0) {
        return true;
      }
    }
    
    return false;
  }

  private canCombineTests(tests: GeneratedTest[]): boolean {
    // Check if tests can be safely combined
    if (tests.length < 2) return false;
    
    // All tests must be of the same type
    const types = new Set(tests.map(t => t.type));
    if (types.size > 1) return false;
    
    // All tests must have similar complexity
    const complexities = tests.map(t => t.complexity);
    const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
    const hasOutliers = complexities.some(c => Math.abs(c - avgComplexity) > 3);
    if (hasOutliers) return false;
    
    // Tests must not have conflicting mocks
    const allMocks = tests.flatMap(t => t.mocks);
    const mockTargets = new Set(allMocks.map(m => m.target));
    if (allMocks.length > mockTargets.size) {
      // Check for conflicting mock implementations
      const conflicts = this.findMockConflicts(allMocks);
      if (conflicts.length > 0) return false;
    }
    
    return true;
  }

  private combineTests(tests: GeneratedTest[]): GeneratedTest {
    const combinedName = `Combined test for ${this.extractFeatureName(tests[0])}`;
    const combinedCode = this.mergeCombinableTestCode(tests);
    const combinedAssertions = tests.flatMap(t => t.assertions);
    const combinedMocks = this.mergeMocks(tests.flatMap(t => t.mocks));
    const combinedTestData = tests.flatMap(t => t.testData);
    const combinedTags = [...new Set(tests.flatMap(t => t.tags))];
    const maxComplexity = Math.max(...tests.map(t => t.complexity));
    const maxTimeout = Math.max(...tests.map(t => t.timeout || 5000));
    
    return {
      id: `combined-${Date.now()}`,
      name: combinedName,
      description: `Combined test covering: ${tests.map(t => t.name).join(', ')}`,
      type: tests[0].type,
      code: combinedCode,
      assertions: combinedAssertions,
      mocks: combinedMocks,
      testData: combinedTestData,
      expectedResult: null,
      tags: combinedTags,
      complexity: Math.min(maxComplexity + 1, 10),
      timeout: maxTimeout
    };
  }

  private mergeCombinableTestCode(tests: GeneratedTest[]): string {
    const sections: string[] = [];
    
    // Add setup section
    sections.push('// Combined test setup');
    const allMocks = tests.flatMap(t => t.mocks);
    if (allMocks.length > 0) {
      sections.push('// Setup mocks');
      sections.push(this.generateMockSetupCode(allMocks));
    }
    
    // Add test sections
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      sections.push(`// Test case ${i + 1}: ${test.name}`);
      sections.push(test.code);
      sections.push('');
    }
    
    return sections.join('\n');
  }

  private mergeMocks(mocks: any[]): any[] {
    const mockMap = new Map<string, any>();
    
    for (const mock of mocks) {
      const existing = mockMap.get(mock.target);
      if (existing) {
        // Merge mock configurations
        mockMap.set(mock.target, this.mergeMockConfigurations(existing, mock));
      } else {
        mockMap.set(mock.target, mock);
      }
    }
    
    return Array.from(mockMap.values());
  }

  private mergeMockConfigurations(existing: any, newMock: any): any {
    // Simple merge logic - in practice, this would be more sophisticated
    return {
      ...existing,
      ...newMock,
      callCount: (existing.callCount || 0) + (newMock.callCount || 0)
    };
  }

  private generateMockSetupCode(mocks: any[]): string {
    return mocks.map(mock => 
      `const ${mock.target}Mock = jest.fn(${mock.mockImplementation || ''});`
    ).join('\n');
  }

  private findMockConflicts(mocks: any[]): any[] {
    const conflicts: any[] = [];
    const mockGroups = new Map<string, any[]>();
    
    // Group mocks by target
    for (const mock of mocks) {
      if (!mockGroups.has(mock.target)) {
        mockGroups.set(mock.target, []);
      }
      mockGroups.get(mock.target)!.push(mock);
    }
    
    // Check for conflicts within groups
    for (const [target, targetMocks] of mockGroups) {
      if (targetMocks.length > 1) {
        // Check if they have different implementations
        const implementations = new Set(targetMocks.map(m => m.mockImplementation));
        if (implementations.size > 1) {
          conflicts.push({
            target,
            conflictingMocks: targetMocks,
            reason: 'Different mock implementations'
          });
        }
      }
    }
    
    return conflicts;
  }

  private calculateExecutionTimeReduction(
    originalTests: GeneratedTest[],
    duplicatesRemoved: number,
    redundantTestsRemoved: number,
    combinedTests: number
  ): number {
    const originalTime = originalTests.reduce((sum, test) => sum + (test.timeout || 5000), 0);
    
    // Calculate time saved by removing duplicates and redundant tests
    const avgTestTime = originalTime / originalTests.length;
    const timeSaved = (duplicatesRemoved + redundantTestsRemoved) * avgTestTime;
    
    // Factor in parallelization improvements from combining tests
    const parallelizationSavings = combinedTests * avgTestTime * 0.3; // 30% savings from parallelization
    
    const totalTimeSaved = timeSaved + parallelizationSavings;
    return Math.round((totalTimeSaved / originalTime) * 100);
  }

  private generateOptimizationSuggestions(
    duplicateInfo: any,
    redundantInfo: any,
    combinableInfo: any,
    tests: GeneratedTest[]
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Duplicate removal suggestions
    if (duplicateInfo.duplicates.length > 0) {
      suggestions.push({
        type: 'remove',
        description: `Remove ${duplicateInfo.duplicates.length} duplicate tests`,
        impact: 'medium',
        effort: 'low',
        testIds: duplicateInfo.duplicates.map((d: any) => d.duplicate.id)
      });
    }
    
    // Redundant test suggestions
    if (redundantInfo.redundant.length > 0) {
      suggestions.push({
        type: 'remove',
        description: `Remove ${redundantInfo.redundant.length} redundant tests`,
        impact: 'medium',
        effort: 'medium',
        testIds: redundantInfo.redundant.map((t: any) => t.id)
      });
    }
    
    // Test combination suggestions
    if (combinableInfo.combinable.length > 0) {
      for (const combo of combinableInfo.combinable) {
        suggestions.push({
          type: 'combine',
          description: `Combine ${combo.tests.length} related tests`,
          impact: 'high',
          effort: 'medium',
          testIds: combo.tests.map((t: any) => t.id),
          code: combo.combined.code
        });
      }
    }
    
    // Parallelization suggestions
    const parallelizableTests = tests.filter(test => 
      !test.code.includes('database') && 
      !test.code.includes('file') && 
      test.mocks.length === 0
    );
    
    if (parallelizableTests.length > 3) {
      suggestions.push({
        type: 'parallelize',
        description: `${parallelizableTests.length} tests can be run in parallel`,
        impact: 'high',
        effort: 'low',
        testIds: parallelizableTests.map(t => t.id)
      });
    }
    
    // Mock optimization suggestions
    const testsWithMocks = tests.filter(test => test.mocks.length > 0);
    if (testsWithMocks.length > 0) {
      suggestions.push({
        type: 'refactor',
        description: 'Optimize mock setup and teardown',
        impact: 'medium',
        effort: 'medium',
        testIds: testsWithMocks.map(t => t.id)
      });
    }
    
    return suggestions;
  }

  async applyOptimizations(testSuite: TestSuite, suggestions: OptimizationSuggestion[]): Promise<TestSuite> {
    let optimizedTests = [...testSuite.tests];
    
    for (const suggestion of suggestions) {
      switch (suggestion.type) {
        case 'remove':
          optimizedTests = optimizedTests.filter(test => !suggestion.testIds.includes(test.id));
          break;
        case 'combine':
          // This would implement the actual combination logic
          break;
        case 'parallelize':
          // Mark tests as parallelizable
          for (const test of optimizedTests) {
            if (suggestion.testIds.includes(test.id)) {
              test.tags = [...test.tags, 'parallelizable'];
            }
          }
          break;
      }
    }
    
    return {
      ...testSuite,
      tests: optimizedTests,
      parallelizable: true
    };
  }

  getOptimizationMetrics(original: TestSuite, optimized: TestSuite): {
    testReduction: number;
    executionTimeReduction: number;
    complexityReduction: number;
    maintainabilityImprovement: number;
  } {
    const testReduction = ((original.tests.length - optimized.tests.length) / original.tests.length) * 100;
    
    const originalTime = original.tests.reduce((sum, test) => sum + (test.timeout || 5000), 0);
    const optimizedTime = optimized.tests.reduce((sum, test) => sum + (test.timeout || 5000), 0);
    const executionTimeReduction = ((originalTime - optimizedTime) / originalTime) * 100;
    
    const originalComplexity = original.tests.reduce((sum, test) => sum + test.complexity, 0);
    const optimizedComplexity = optimized.tests.reduce((sum, test) => sum + test.complexity, 0);
    const complexityReduction = ((originalComplexity - optimizedComplexity) / originalComplexity) * 100;
    
    // Mock maintainability improvement calculation
    const maintainabilityImprovement = Math.min(testReduction + complexityReduction, 50);
    
    return {
      testReduction: Math.round(testReduction),
      executionTimeReduction: Math.round(executionTimeReduction),
      complexityReduction: Math.round(complexityReduction),
      maintainabilityImprovement: Math.round(maintainabilityImprovement)
    };
  }
}