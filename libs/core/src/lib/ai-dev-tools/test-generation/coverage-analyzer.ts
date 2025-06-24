/**
 * @fileoverview Coverage Analyzer
 * Analyzes test coverage and identifies gaps
 */

import { EventEmitter } from 'events';
import {
  CoverageAnalysisResult,
  FileCoverageResult,
  CoverageGap,
  UncoveredLine,
  TestSuite,
  CoverageThreshold
} from './types';

export class CoverageAnalyzer extends EventEmitter {
  private initialized = false;

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    this.emit('analyzer:initialized');
  }

  async analyzeCoverage(sourceCode: string, testSuite: TestSuite): Promise<CoverageAnalysisResult> {
    // Mock implementation - in real scenario, this would integrate with coverage tools
    const lines = sourceCode.split('\n');
    const totalLines = lines.length;
    
    // Simulate coverage analysis
    const coveredLines = Math.floor(totalLines * 0.75); // 75% coverage
    const overallCoverage = Math.round((coveredLines / totalLines) * 100);
    
    const fileCoverage: FileCoverageResult = {
      filename: 'source.js',
      coverage: overallCoverage,
      lines: {
        total: totalLines,
        covered: coveredLines,
        uncovered: this.generateUncoveredLines(totalLines, coveredLines),
        percentage: overallCoverage
      },
      branches: {
        total: Math.floor(totalLines / 10),
        covered: Math.floor(totalLines / 10 * 0.8),
        uncovered: [],
        percentage: 80
      },
      functions: {
        total: Math.floor(totalLines / 20),
        covered: Math.floor(totalLines / 20 * 0.85),
        uncovered: ['uncoveredFunction'],
        percentage: 85
      },
      statements: {
        total: totalLines,
        covered: coveredLines,
        uncovered: this.generateUncoveredLines(totalLines, coveredLines),
        percentage: overallCoverage
      }
    };

    const uncoveredLines = this.identifyUncoveredLines(sourceCode, fileCoverage);
    const gaps = await this.identifyCoverageGaps(sourceCode, testSuite, fileCoverage);
    
    const threshold: CoverageThreshold = {
      global: { branches: 80, functions: 80, lines: 80, statements: 80 }
    };

    return {
      overall: overallCoverage,
      branches: fileCoverage.branches.percentage,
      functions: fileCoverage.functions.percentage,
      lines: fileCoverage.lines.percentage,
      statements: fileCoverage.statements.percentage,
      files: [fileCoverage],
      uncoveredLines,
      threshold,
      meetThreshold: overallCoverage >= threshold.global.lines,
      gaps
    };
  }

  private generateUncoveredLines(totalLines: number, coveredLines: number): number[] {
    const uncoveredCount = totalLines - coveredLines;
    const uncovered: number[] = [];
    
    for (let i = 0; i < uncoveredCount; i++) {
      uncovered.push(Math.floor(Math.random() * totalLines) + 1);
    }
    
    return uncovered.sort((a, b) => a - b);
  }

  private identifyUncoveredLines(sourceCode: string, fileCoverage: FileCoverageResult): UncoveredLine[] {
    const lines = sourceCode.split('\n');
    const uncoveredLines: UncoveredLine[] = [];
    
    for (const lineNum of fileCoverage.lines.uncovered) {
      if (lineNum <= lines.length) {
        uncoveredLines.push({
          filename: fileCoverage.filename,
          line: lineNum,
          type: 'statement',
          code: lines[lineNum - 1] || '',
          reason: 'Line not executed by any test',
          suggestion: 'Add test case that executes this code path'
        });
      }
    }
    
    return uncoveredLines;
  }

  private async identifyCoverageGaps(
    sourceCode: string, 
    testSuite: TestSuite, 
    fileCoverage: FileCoverageResult
  ): Promise<CoverageGap[]> {
    const gaps: CoverageGap[] = [];
    const lines = sourceCode.split('\n');
    
    // Identify missing error handling tests
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('throw') || line.includes('catch') || line.includes('error')) {
        const isCovered = !fileCoverage.lines.uncovered.includes(i + 1);
        if (!isCovered) {
          gaps.push({
            type: 'missing_error_handling',
            severity: 'high',
            description: `Error handling code not covered`,
            location: {
              filename: fileCoverage.filename,
              line: i + 1
            },
            suggestedTest: `Add test case that triggers error condition on line ${i + 1}`,
            priority: 1
          });
        }
      }
    }
    
    // Identify missing branch coverage
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('if') || line.includes('else') || line.includes('switch')) {
        gaps.push({
          type: 'missing_branch',
          severity: 'medium',
          description: `Branch condition may not be fully tested`,
          location: {
            filename: fileCoverage.filename,
            line: i + 1
          },
          suggestedTest: `Add test cases for all branches of condition on line ${i + 1}`,
          priority: 2
        });
      }
    }
    
    // Identify functions without tests
    const functionPattern = /(?:function|def|func|fn)\s+(\w+)/g;
    let match;
    while ((match = functionPattern.exec(sourceCode)) !== null) {
      const functionName = match[1];
      const hasTest = testSuite.tests.some(test => 
        test.name.includes(functionName) || test.code.includes(functionName)
      );
      
      if (!hasTest) {
        gaps.push({
          type: 'missing_function',
          severity: 'high',
          description: `Function '${functionName}' has no tests`,
          location: {
            filename: fileCoverage.filename,
            line: sourceCode.substring(0, match.index).split('\n').length,
            function: functionName
          },
          suggestedTest: `Add unit test for function '${functionName}'`,
          priority: 1
        });
      }
    }
    
    return gaps.sort((a, b) => a.priority - b.priority);
  }

  async generateCoverageReport(result: CoverageAnalysisResult, format: 'html' | 'json' | 'text' = 'text'): Promise<string> {
    switch (format) {
      case 'html':
        return this.generateHTMLReport(result);
      case 'json':
        return JSON.stringify(result, null, 2);
      case 'text':
      default:
        return this.generateTextReport(result);
    }
  }

  private generateTextReport(result: CoverageAnalysisResult): string {
    let report = `Coverage Analysis Report\n`;
    report += `=======================\n\n`;
    report += `Overall Coverage: ${result.overall}%\n`;
    report += `Lines: ${result.lines}%\n`;
    report += `Branches: ${result.branches}%\n`;
    report += `Functions: ${result.functions}%\n`;
    report += `Statements: ${result.statements}%\n\n`;
    
    report += `Threshold Met: ${result.meetThreshold ? 'YES' : 'NO'}\n\n`;
    
    if (result.gaps.length > 0) {
      report += `Coverage Gaps (${result.gaps.length}):\n`;
      report += `------------------\n`;
      for (const gap of result.gaps) {
        report += `- ${gap.type} (${gap.severity}): ${gap.description}\n`;
        report += `  Location: ${gap.location.filename}:${gap.location.line}\n`;
        report += `  Suggestion: ${gap.suggestedTest}\n\n`;
      }
    }
    
    if (result.uncoveredLines.length > 0) {
      report += `Uncovered Lines (${result.uncoveredLines.length}):\n`;
      report += `------------------\n`;
      for (const line of result.uncoveredLines.slice(0, 10)) { // Show first 10
        report += `${line.filename}:${line.line} - ${line.code.trim()}\n`;
      }
      if (result.uncoveredLines.length > 10) {
        report += `... and ${result.uncoveredLines.length - 10} more\n`;
      }
    }
    
    return report;
  }

  private generateHTMLReport(result: CoverageAnalysisResult): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .coverage-summary { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        .coverage-bar { width: 100%; height: 20px; background: #ddd; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; background: linear-gradient(to right, #f44336, #ff9800, #4caf50); }
        .gap { margin: 10px 0; padding: 10px; border-left: 4px solid #ff9800; background: #fff3cd; }
        .gap.high { border-color: #f44336; background: #f8d7da; }
        .gap.medium { border-color: #ff9800; background: #fff3cd; }
        .gap.low { border-color: #28a745; background: #d4edda; }
        .uncovered-line { font-family: monospace; background: #fff2f2; padding: 2px 5px; margin: 2px 0; }
    </style>
</head>
<body>
    <h1>Coverage Analysis Report</h1>
    
    <div class="coverage-summary">
        <h2>Overall Coverage: ${result.overall}%</h2>
        <div class="coverage-bar">
            <div class="coverage-fill" style="width: ${result.overall}%"></div>
        </div>
        
        <p><strong>Lines:</strong> ${result.lines}%</p>
        <p><strong>Branches:</strong> ${result.branches}%</p>
        <p><strong>Functions:</strong> ${result.functions}%</p>
        <p><strong>Statements:</strong> ${result.statements}%</p>
        <p><strong>Threshold Met:</strong> ${result.meetThreshold ? '✅ YES' : '❌ NO'}</p>
    </div>
    
    ${result.gaps.length > 0 ? `
    <h2>Coverage Gaps (${result.gaps.length})</h2>
    ${result.gaps.map(gap => `
    <div class="gap ${gap.severity}">
        <h3>${gap.type} (${gap.severity})</h3>
        <p>${gap.description}</p>
        <p><strong>Location:</strong> ${gap.location.filename}:${gap.location.line}</p>
        <p><strong>Suggestion:</strong> ${gap.suggestedTest}</p>
    </div>
    `).join('')}
    ` : ''}
    
    ${result.uncoveredLines.length > 0 ? `
    <h2>Uncovered Lines (${result.uncoveredLines.length})</h2>
    ${result.uncoveredLines.slice(0, 20).map(line => `
    <div class="uncovered-line">
        <strong>${line.filename}:${line.line}</strong> - ${line.code.trim()}
        <br><small>${line.suggestion}</small>
    </div>
    `).join('')}
    ${result.uncoveredLines.length > 20 ? `<p>... and ${result.uncoveredLines.length - 20} more</p>` : ''}
    ` : ''}
</body>
</html>`;
  }

  async compareCoverage(before: CoverageAnalysisResult, after: CoverageAnalysisResult): Promise<{
    improvement: number;
    changes: {
      lines: number;
      branches: number;
      functions: number;
      statements: number;
    };
    newGaps: CoverageGap[];
    resolvedGaps: CoverageGap[];
  }> {
    const improvement = after.overall - before.overall;
    
    const changes = {
      lines: after.lines - before.lines,
      branches: after.branches - before.branches,
      functions: after.functions - before.functions,
      statements: after.statements - before.statements
    };
    
    // Find new gaps
    const newGaps = after.gaps.filter(afterGap => 
      !before.gaps.some(beforeGap => 
        beforeGap.type === afterGap.type && 
        beforeGap.location.line === afterGap.location.line
      )
    );
    
    // Find resolved gaps
    const resolvedGaps = before.gaps.filter(beforeGap => 
      !after.gaps.some(afterGap => 
        afterGap.type === beforeGap.type && 
        afterGap.location.line === beforeGap.location.line
      )
    );
    
    return {
      improvement,
      changes,
      newGaps,
      resolvedGaps
    };
  }

  async suggestCoverageImprovements(result: CoverageAnalysisResult): Promise<string[]> {
    const suggestions: string[] = [];
    
    if (result.overall < 50) {
      suggestions.push('Coverage is very low. Focus on testing core functionality first.');
    } else if (result.overall < 70) {
      suggestions.push('Coverage is below recommended threshold. Add tests for main code paths.');
    } else if (result.overall < 90) {
      suggestions.push('Good coverage! Consider adding edge case tests to reach 90%+.');
    }
    
    if (result.functions < result.lines) {
      suggestions.push('Function coverage is low. Ensure all functions have at least one test.');
    }
    
    if (result.branches < result.lines) {
      suggestions.push('Branch coverage is low. Add tests for all conditional paths.');
    }
    
    const highPriorityGaps = result.gaps.filter(gap => gap.severity === 'high');
    if (highPriorityGaps.length > 0) {
      suggestions.push(`Address ${highPriorityGaps.length} high-priority coverage gaps first.`);
    }
    
    const errorHandlingGaps = result.gaps.filter(gap => gap.type === 'missing_error_handling');
    if (errorHandlingGaps.length > 0) {
      suggestions.push('Add tests for error handling and exception paths.');
    }
    
    return suggestions;
  }
}