/**
 * @fileoverview Documentation Validator
 * Validates documentation quality, completeness, and consistency
 */

import { EventEmitter } from 'events';
import {
  DocumentationValidationResult,
  ValidationError,
  ValidationWarning,
  DocumentationSection,
  QualityIssue
} from './types';

export class DocumentationValidator extends EventEmitter {
  private initialized = false;
  private validationRules: Map<string, ValidationRule> = new Map();

  private defaultRules = [
    'grammar',
    'completeness',
    'consistency',
    'clarity',
    'structure',
    'links',
    'images',
    'code_blocks',
    'formatting'
  ];

  constructor() {
    super();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load built-in validation rules
    await this.loadBuiltInRules();
    
    this.initialized = true;
    this.emit('validator:initialized', { rulesLoaded: this.validationRules.size });
  }

  async validateDocumentation(
    content: string,
    sections: DocumentationSection[],
    rules: string[] = this.defaultRules
  ): Promise<DocumentationValidationResult> {
    if (!this.initialized) {
      throw new Error('DocumentationValidator not initialized');
    }

    this.emit('validation:started', { contentLength: content.length, sectionsCount: sections.length });

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const checkedRules: string[] = [];

    let totalScore = 0;
    let maxScore = 0;

    // Run each validation rule
    for (const ruleName of rules) {
      const rule = this.validationRules.get(ruleName);
      if (!rule) {
        warnings.push({
          rule: ruleName,
          message: `Validation rule '${ruleName}' not found`,
          suggestion: 'Check rule name or ensure rule is loaded'
        });
        continue;
      }

      try {
        this.emit('validation:rule:started', { rule: ruleName });
        
        const result = await rule.validate(content, sections);
        checkedRules.push(ruleName);
        
        totalScore += result.score;
        maxScore += result.maxScore;
        
        errors.push(...result.errors);
        warnings.push(...result.warnings);

        this.emit('validation:rule:completed', { 
          rule: ruleName, 
          score: result.score, 
          maxScore: result.maxScore,
          errors: result.errors.length,
          warnings: result.warnings.length
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          rule: ruleName,
          severity: 'error',
          message: `Validation rule failed: ${errorMessage}`,
          fix: 'Check rule implementation'
        });
      }
    }

    const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const isValid = errors.filter(e => e.severity === 'error').length === 0;
    
    const suggestions = this.generateSuggestions(errors, warnings);

    const result: DocumentationValidationResult = {
      valid: isValid,
      score: finalScore,
      errors,
      warnings,
      suggestions,
      checkedRules
    };

    this.emit('validation:completed', { 
      valid: isValid, 
      score: finalScore, 
      errors: errors.length, 
      warnings: warnings.length 
    });

    return result;
  }

  async addValidationRule(name: string, rule: ValidationRule): Promise<void> {
    this.validationRules.set(name, rule);
    this.emit('rule:added', { ruleName: name });
  }

  async removeValidationRule(name: string): Promise<boolean> {
    const removed = this.validationRules.delete(name);
    if (removed) {
      this.emit('rule:removed', { ruleName: name });
    }
    return removed;
  }

  getAvailableRules(): string[] {
    return Array.from(this.validationRules.keys());
  }

  private async loadBuiltInRules(): Promise<void> {
    // Grammar validation rule
    await this.addValidationRule('grammar', {
      name: 'Grammar Check',
      description: 'Validates grammar and spelling',
      weight: 0.2,
      validate: async (content: string, sections: DocumentationSection[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        // Basic grammar checks
        const grammarIssues = this.checkBasicGrammar(content);
        errors.push(...grammarIssues);
        
        const score = Math.max(0, 100 - (grammarIssues.length * 5));
        
        return { score, maxScore: 100, errors, warnings };
      }
    });

    // Completeness validation rule
    await this.addValidationRule('completeness', {
      name: 'Completeness Check',
      description: 'Validates documentation completeness',
      weight: 0.25,
      validate: async (content: string, sections: DocumentationSection[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        // Check for essential sections
        const requiredSections = ['installation', 'usage', 'api'];
        const sectionTitles = sections.map(s => s.title.toLowerCase());
        
        for (const required of requiredSections) {
          if (!sectionTitles.some(title => title.includes(required))) {
            warnings.push({
              rule: 'completeness',
              message: `Missing recommended section: ${required}`,
              suggestion: `Consider adding a ${required} section`
            });
          }
        }
        
        // Check content length
        if (content.length < 500) {
          errors.push({
            rule: 'completeness',
            severity: 'warning',
            message: 'Documentation appears to be very short',
            fix: 'Add more detailed explanations and examples'
          });
        }
        
        const score = Math.max(0, 100 - (warnings.length * 10) - (errors.length * 20));
        
        return { score, maxScore: 100, errors, warnings };
      }
    });

    // Consistency validation rule
    await this.addValidationRule('consistency', {
      name: 'Consistency Check',
      description: 'Validates consistency in formatting and style',
      weight: 0.15,
      validate: async (content: string, sections: DocumentationSection[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        // Check header consistency
        const headerInconsistencies = this.checkHeaderConsistency(sections);
        warnings.push(...headerInconsistencies);
        
        // Check code block consistency
        const codeBlockIssues = this.checkCodeBlockConsistency(content);
        warnings.push(...codeBlockIssues);
        
        const score = Math.max(0, 100 - (warnings.length * 5));
        
        return { score, maxScore: 100, errors, warnings };
      }
    });

    // Clarity validation rule
    await this.addValidationRule('clarity', {
      name: 'Clarity Check',
      description: 'Validates content clarity and readability',
      weight: 0.2,
      validate: async (content: string, sections: DocumentationSection[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        // Check for overly complex sentences
        const complexSentences = this.checkSentenceComplexity(content);
        warnings.push(...complexSentences);
        
        // Check for jargon without explanation
        const jargonIssues = this.checkJargonUsage(content);
        warnings.push(...jargonIssues);
        
        const score = Math.max(0, 100 - (warnings.length * 8));
        
        return { score, maxScore: 100, errors, warnings };
      }
    });

    // Structure validation rule
    await this.addValidationRule('structure', {
      name: 'Structure Check',
      description: 'Validates document structure and organization',
      weight: 0.1,
      validate: async (content: string, sections: DocumentationSection[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        // Check section order
        const orderIssues = this.checkSectionOrder(sections);
        warnings.push(...orderIssues);
        
        // Check header hierarchy
        const hierarchyIssues = this.checkHeaderHierarchy(sections);
        errors.push(...hierarchyIssues);
        
        const score = Math.max(0, 100 - (warnings.length * 5) - (errors.length * 15));
        
        return { score, maxScore: 100, errors, warnings };
      }
    });

    // Links validation rule
    await this.addValidationRule('links', {
      name: 'Links Check',
      description: 'Validates links and references',
      weight: 0.05,
      validate: async (content: string, sections: DocumentationSection[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        // Check for broken internal links
        const brokenLinks = this.checkInternalLinks(content, sections);
        errors.push(...brokenLinks);
        
        // Check for external links without descriptions
        const undescribedLinks = this.checkLinkDescriptions(content);
        warnings.push(...undescribedLinks);
        
        const score = Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5));
        
        return { score, maxScore: 100, errors, warnings };
      }
    });

    // Images validation rule
    await this.addValidationRule('images', {
      name: 'Images Check',
      description: 'Validates image usage and alt text',
      weight: 0.05,
      validate: async (content: string, sections: DocumentationSection[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        
        // Check for images without alt text
        const missingAltText = this.checkImageAltText(content);
        warnings.push(...missingAltText);
        
        const score = Math.max(0, 100 - (warnings.length * 10));
        
        return { score, maxScore: 100, errors, warnings };
      }
    });
  }

  private checkBasicGrammar(content: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check for common grammar issues
    const issues = [
      { pattern: /\b(there|their|they're)\b/gi, message: 'Check there/their/they\'re usage' },
      { pattern: /\b(its|it's)\b/gi, message: 'Check its/it\'s usage' },
      { pattern: /\b(your|you're)\b/gi, message: 'Check your/you\'re usage' },
      { pattern: /\.\s+[a-z]/g, message: 'Sentence should start with capital letter' },
      { pattern: /[^\.\!\?]\s*$/gm, message: 'Sentence missing punctuation' }
    ];

    issues.forEach(issue => {
      const matches = content.match(issue.pattern);
      if (matches && matches.length > 3) { // Only flag if many instances
        errors.push({
          rule: 'grammar',
          severity: 'warning',
          message: issue.message,
          fix: 'Review and correct grammar issues'
        });
      }
    });

    return errors;
  }

  private checkHeaderConsistency(sections: DocumentationSection[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check if headers follow consistent capitalization
    const titleCases = sections.map(s => ({
      title: s.title,
      isTitle: s.title.split(' ').every(word => word[0] === word[0].toUpperCase()),
      isSentence: s.title[0] === s.title[0].toUpperCase() && s.title.split(' ').slice(1).some(word => word[0] === word[0].toLowerCase())
    }));

    const titleCaseCount = titleCases.filter(t => t.isTitle).length;
    const sentenceCaseCount = titleCases.filter(t => t.isSentence).length;

    if (titleCaseCount > 0 && sentenceCaseCount > 0) {
      warnings.push({
        rule: 'consistency',
        message: 'Inconsistent header capitalization found',
        suggestion: 'Use either Title Case or Sentence case consistently for all headers'
      });
    }

    return warnings;
  }

  private checkCodeBlockConsistency(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    // Check code block language specification
    const codeBlocks = content.match(/```(\w*)\n/g);
    if (codeBlocks) {
      const withLanguage = codeBlocks.filter(block => block.match(/```\w+\n/)).length;
      const withoutLanguage = codeBlocks.length - withLanguage;
      
      if (withLanguage > 0 && withoutLanguage > 0) {
        warnings.push({
          rule: 'consistency',
          message: 'Inconsistent code block language specification',
          suggestion: 'Specify language for all code blocks or none'
        });
      }
    }

    return warnings;
  }

  private checkSentenceComplexity(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const longSentences = sentences.filter(s => s.split(' ').length > 25);
    
    if (longSentences.length > sentences.length * 0.2) {
      warnings.push({
        rule: 'clarity',
        message: 'Many sentences are very long and may be hard to read',
        suggestion: 'Consider breaking long sentences into shorter ones'
      });
    }

    return warnings;
  }

  private checkJargonUsage(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    const technicalTerms = ['API', 'SDK', 'CLI', 'JWT', 'OAuth', 'REST', 'GraphQL'];
    const foundTerms = technicalTerms.filter(term => 
      content.includes(term) && !content.includes(`${term} (`) && !content.includes(`${term} is`)
    );
    
    if (foundTerms.length > 3) {
      warnings.push({
        rule: 'clarity',
        message: 'Many technical terms used without explanation',
        suggestion: 'Consider adding brief explanations for technical terms'
      });
    }

    return warnings;
  }

  private checkSectionOrder(sections: DocumentationSection[]): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    const expectedOrder = ['overview', 'installation', 'quickstart', 'api_reference', 'examples'];
    const actualOrder = sections.map(s => s.type).filter(type => expectedOrder.includes(type));
    
    let expectedIndex = 0;
    for (const type of actualOrder) {
      const typeIndex = expectedOrder.indexOf(type);
      if (typeIndex < expectedIndex) {
        warnings.push({
          rule: 'structure',
          message: `Section '${type}' appears out of recommended order`,
          suggestion: 'Consider reordering sections: Overview → Installation → Quick Start → API Reference → Examples'
        });
        break;
      }
      expectedIndex = Math.max(expectedIndex, typeIndex);
    }

    return warnings;
  }

  private checkHeaderHierarchy(sections: DocumentationSection[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (let i = 1; i < sections.length; i++) {
      const current = sections[i];
      const previous = sections[i - 1];
      
      if (current.level > previous.level + 1) {
        errors.push({
          rule: 'structure',
          severity: 'error',
          message: `Header level skipped: ${previous.title} (level ${previous.level}) → ${current.title} (level ${current.level})`,
          location: { section: current.id },
          fix: 'Ensure header levels increase by only one level at a time'
        });
      }
    }

    return errors;
  }

  private checkInternalLinks(content: string, sections: DocumentationSection[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const internalLinks = content.match(/\[([^\]]+)\]\(#([^)]+)\)/g);
    if (internalLinks) {
      const sectionIds = sections.map(s => s.id);
      const sectionTitles = sections.map(s => s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      
      internalLinks.forEach(link => {
        const match = link.match(/\[([^\]]+)\]\(#([^)]+)\)/);
        if (match) {
          const anchor = match[2];
          if (!sectionIds.includes(anchor) && !sectionTitles.includes(anchor)) {
            errors.push({
              rule: 'links',
              severity: 'error',
              message: `Broken internal link: ${link}`,
              fix: 'Update link target or create the referenced section'
            });
          }
        }
      });
    }

    return errors;
  }

  private checkLinkDescriptions(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    const externalLinks = content.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g);
    if (externalLinks) {
      const undescriptiveLinks = externalLinks.filter(link => {
        const match = link.match(/\[([^\]]+)\]/);
        return match && (match[1] === 'here' || match[1] === 'link' || match[1] === 'click here');
      });
      
      if (undescriptiveLinks.length > 0) {
        warnings.push({
          rule: 'links',
          message: 'Found undescriptive link text',
          suggestion: 'Use descriptive text for links instead of "here" or "click here"'
        });
      }
    }

    return warnings;
  }

  private checkImageAltText(content: string): ValidationWarning[] {
    const warnings: ValidationWarning[] = [];
    
    const images = content.match(/!\[([^\]]*)\]\([^)]+\)/g);
    if (images) {
      const imagesWithoutAlt = images.filter(img => {
        const match = img.match(/!\[([^\]]*)\]/);
        return match && match[1].trim() === '';
      });
      
      if (imagesWithoutAlt.length > 0) {
        warnings.push({
          rule: 'images',
          message: `${imagesWithoutAlt.length} images missing alt text`,
          suggestion: 'Add descriptive alt text for all images for accessibility'
        });
      }
    }

    return warnings;
  }

  private generateSuggestions(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const suggestions: string[] = [];
    
    if (errors.length > 0) {
      suggestions.push(`Fix ${errors.length} validation errors for better documentation quality`);
    }
    
    if (warnings.length > 5) {
      suggestions.push('Consider addressing validation warnings to improve readability');
    }
    
    const grammarWarnings = warnings.filter(w => w.rule === 'grammar');
    if (grammarWarnings.length > 0) {
      suggestions.push('Run content through a grammar checker for improved quality');
    }
    
    const clarityWarnings = warnings.filter(w => w.rule === 'clarity');
    if (clarityWarnings.length > 0) {
      suggestions.push('Simplify complex sentences and explain technical terms');
    }

    return suggestions;
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
    this.validationRules.clear();
    this.emit('validator:shutdown');
  }
}

interface ValidationRule {
  name: string;
  description: string;
  weight: number;
  validate(content: string, sections: DocumentationSection[]): Promise<{
    score: number;
    maxScore: number;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }>;
}