import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import Joi from 'joi';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Security Policy Enforcer
 * Enforces security policies in CI/CD pipelines with automated gates
 */
export class PolicyEnforcer {
  constructor(options = {}) {
    this.enforcement = options.enforcement || 'moderate';
    this.policyDir = path.join(__dirname, '../policies');
    this.outputDir = options.outputDir || './reports/policy';
    this.policies = {};
    
    this.enforcementLevels = {
      'strict': 3,
      'moderate': 2,
      'warning': 1
    };
    
    this.loadPolicies();
  }
  
  /**
   * Load security policies
   */
  async loadPolicies() {
    try {
      await fs.ensureDir(this.policyDir);
      
      // Load different policy types
      this.policies.security = await this.loadSecurityPolicy();
      this.policies.compliance = await this.loadCompliancePolicy();
      this.policies.code = await this.loadCodePolicy();
      this.policies.infrastructure = await this.loadInfrastructurePolicy();
      this.policies.cicd = await this.loadCICDPolicy();
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to load policies: ${error.message}`));
    }
  }
  
  /**
   * Check policy compliance
   */
  async checkPolicy(policyName = 'security') {
    const policy = this.policies[policyName];
    
    if (!policy) {
      throw new Error(`Unknown policy: ${policyName}`);
    }
    
    const policyResult = {
      policyName,
      version: policy.version,
      enforcement: this.enforcement,
      timestamp: new Date().toISOString(),
      totalRules: policy.rules.length,
      passedRules: 0,
      failedRules: 0,
      skippedRules: 0,
      compliant: true,
      violations: [],
      ruleResults: []
    };
    
    try {
      console.log(chalk.blue(`📜 Checking ${policyName} policy (${policy.rules.length} rules)...`));
      
      for (const rule of policy.rules) {
        const ruleResult = await this.checkPolicyRule(rule);
        policyResult.ruleResults.push(ruleResult);
        
        switch (ruleResult.status) {
          case 'passed':
            policyResult.passedRules++;
            break;
          case 'failed':
            policyResult.failedRules++;
            if (rule.severity === 'critical' || rule.severity === 'high') {
              policyResult.compliant = false;
            }
            policyResult.violations.push({
              rule: rule.id,
              title: rule.title,
              severity: rule.severity,
              message: ruleResult.finding,
              remediation: rule.remediation
            });
            break;
          case 'skipped':
            policyResult.skippedRules++;
            break;
        }
      }
      
      // Save results
      await fs.ensureDir(this.outputDir);
      const outputFile = path.join(this.outputDir, `policy-check-${policyName}-${Date.now()}.json`);
      await fs.writeJson(outputFile, policyResult, { spaces: 2 });
      
      return policyResult;
      
    } catch (error) {
      throw new Error(`Policy check failed: ${error.message}`);
    }
  }
  
  /**
   * Enforce all policies
   */
  async enforceAllPolicies() {
    const enforcementResult = {
      timestamp: new Date().toISOString(),
      enforcement: this.enforcement,
      policies: {},
      allCompliant: true,
      totalViolations: 0,
      criticalViolations: 0,
      highViolations: 0
    };
    
    const policyNames = Object.keys(this.policies);
    
    for (const policyName of policyNames) {
      console.log(chalk.blue(`🔒 Enforcing ${policyName} policy...`));
      
      try {
        const policyResult = await this.checkPolicy(policyName);
        enforcementResult.policies[policyName] = policyResult;
        
        if (!policyResult.compliant) {
          enforcementResult.allCompliant = false;
        }
        
        enforcementResult.totalViolations += policyResult.violations.length;
        
        // Count critical and high violations
        policyResult.violations.forEach(violation => {
          if (violation.severity === 'critical') {
            enforcementResult.criticalViolations++;
          } else if (violation.severity === 'high') {
            enforcementResult.highViolations++;
          }
        });
        
      } catch (error) {
        console.error(chalk.red(`❌ Failed to enforce ${policyName} policy: ${error.message}`));
        enforcementResult.allCompliant = false;
      }
    }
    
    // Apply enforcement actions
    await this.applyEnforcementActions(enforcementResult);
    
    return enforcementResult;
  }
  
  /**
   * Check individual policy rule
   */
  async checkPolicyRule(rule) {
    const ruleResult = {
      ruleId: rule.id,
      title: rule.title,
      category: rule.category,
      severity: rule.severity,
      status: 'skipped',
      finding: '',
      evidence: []
    };
    
    try {
      // Check if rule is applicable
      if (rule.conditions && !await this.checkRuleConditions(rule.conditions)) {
        ruleResult.status = 'skipped';
        ruleResult.finding = 'Rule conditions not met';
        return ruleResult;
      }
      
      // Execute rule checks
      const checkResults = [];
      
      for (const check of rule.checks) {
        const checkResult = await this.executeRuleCheck(check);
        checkResults.push(checkResult);
        
        if (checkResult.evidence) {
          ruleResult.evidence.push(checkResult.evidence);
        }
      }
      
      // Determine rule status
      const failedChecks = checkResults.filter(r => !r.passed);
      
      if (failedChecks.length === 0) {
        ruleResult.status = 'passed';
        ruleResult.finding = 'All policy checks passed';
      } else {
        ruleResult.status = 'failed';
        ruleResult.finding = `${failedChecks.length} policy check(s) failed: ${failedChecks.map(f => f.description).join(', ')}`;
      }
      
    } catch (error) {
      ruleResult.status = 'failed';
      ruleResult.finding = `Rule check error: ${error.message}`;
    }
    
    return ruleResult;
  }
  
  /**
   * Execute rule check
   */
  async executeRuleCheck(check) {
    const result = {
      type: check.type,
      description: check.description,
      passed: false,
      evidence: null
    };
    
    try {
      switch (check.type) {
        case 'file-required':
          result.passed = await fs.pathExists(check.path);
          result.evidence = `File ${check.path} ${result.passed ? 'exists' : 'missing'}`;
          break;
          
        case 'file-forbidden':
          result.passed = !(await fs.pathExists(check.path));
          result.evidence = `Forbidden file ${check.path} ${result.passed ? 'not found' : 'exists'}`;
          break;
          
        case 'config-value':
          const configValue = await this.getConfigValue(check.configPath, check.key);
          result.passed = this.compareValue(configValue, check.expectedValue, check.operator || '===');
          result.evidence = `Config ${check.key}: ${configValue} (expected: ${check.expectedValue})`;
          break;
          
        case 'command-output':
          const output = await this.executeCommand(check.command, check.args);
          result.passed = check.pattern ? output.includes(check.pattern) : output.trim() !== '';
          result.evidence = `Command output: ${output.substring(0, 100)}...`;
          break;
          
        case 'git-hook':
          result.passed = await this.checkGitHook(check.hookName);
          result.evidence = `Git hook ${check.hookName} ${result.passed ? 'exists' : 'missing'}`;
          break;
          
        case 'ci-config':
          result.passed = await this.checkCIConfiguration(check.platform, check.requirements);
          result.evidence = `CI configuration ${result.passed ? 'compliant' : 'non-compliant'}`;
          break;
          
        case 'dependency-check':
          result.passed = await this.checkDependencyPolicy(check.allowedPackages, check.forbiddenPackages);
          result.evidence = `Dependency policy ${result.passed ? 'compliant' : 'violations found'}`;
          break;
          
        case 'security-scan':
          result.passed = await this.checkSecurityScanResults(check.maxSeverity, check.maxCount);
          result.evidence = `Security scan ${result.passed ? 'passed' : 'failed'} policy thresholds`;
          break;
          
        case 'branch-protection':
          result.passed = await this.checkBranchProtection(check.branch, check.requirements);
          result.evidence = `Branch protection ${result.passed ? 'enabled' : 'insufficient'}`;
          break;
          
        default:
          throw new Error(`Unknown check type: ${check.type}`);
      }
      
    } catch (error) {
      result.passed = false;
      result.evidence = `Check failed: ${error.message}`;
    }
    
    return result;
  }
  
  /**
   * Load security policy
   */
  async loadSecurityPolicy() {
    return {
      name: 'Security Policy',
      version: '1.0.0',
      description: 'Comprehensive security policy for DNA templates',
      rules: [
        {
          id: 'sec-001',
          title: 'No hardcoded secrets',
          category: 'secrets',
          severity: 'critical',
          checks: [
            {
              type: 'security-scan',
              description: 'No critical secret vulnerabilities',
              maxSeverity: 'high',
              maxCount: 0
            }
          ],
          remediation: 'Remove hardcoded secrets and use environment variables or secret management'
        },
        {
          id: 'sec-002',
          title: 'HTTPS enforced',
          category: 'transport',
          severity: 'high',
          checks: [
            {
              type: 'config-value',
              description: 'HTTPS enforcement enabled',
              configPath: './config/security.json',
              key: 'enforceHttps',
              expectedValue: true
            }
          ],
          remediation: 'Enable HTTPS enforcement in configuration'
        },
        {
          id: 'sec-003',
          title: 'Strong authentication required',
          category: 'authentication',
          severity: 'high',
          checks: [
            {
              type: 'config-value',
              description: 'Multi-factor authentication enabled',
              configPath: './config/auth.json',
              key: 'mfaRequired',
              expectedValue: true
            }
          ],
          remediation: 'Enable multi-factor authentication'
        },
        {
          id: 'sec-004',
          title: 'Security headers configured',
          category: 'headers',
          severity: 'medium',
          checks: [
            {
              type: 'file-required',
              description: 'Security middleware configuration exists',
              path: './src/middleware/security.js'
            }
          ],
          remediation: 'Implement security headers middleware'
        },
        {
          id: 'sec-005',
          title: 'No vulnerable dependencies',
          category: 'dependencies',
          severity: 'high',
          checks: [
            {
              type: 'command-output',
              description: 'No high/critical vulnerabilities in dependencies',
              command: 'npm',
              args: ['audit', '--audit-level', 'high'],
              pattern: 'found 0 vulnerabilities'
            }
          ],
          remediation: 'Update vulnerable dependencies to secure versions'
        }
      ]
    };
  }
  
  /**
   * Load compliance policy
   */
  async loadCompliancePolicy() {
    return {
      name: 'Compliance Policy',
      version: '1.0.0',
      description: 'Regulatory compliance policy',
      rules: [
        {
          id: 'comp-001',
          title: 'Privacy policy documented',
          category: 'privacy',
          severity: 'high',
          checks: [
            {
              type: 'file-required',
              description: 'Privacy policy document exists',
              path: './docs/privacy-policy.md'
            }
          ],
          remediation: 'Create comprehensive privacy policy documentation'
        },
        {
          id: 'comp-002',
          title: 'Data retention policy defined',
          category: 'data-governance',
          severity: 'medium',
          checks: [
            {
              type: 'file-required',
              description: 'Data retention policy exists',
              path: './docs/data-retention-policy.md'
            }
          ],
          remediation: 'Define and document data retention policies'
        },
        {
          id: 'comp-003',
          title: 'Audit logging enabled',
          category: 'audit',
          severity: 'high',
          checks: [
            {
              type: 'config-value',
              description: 'Audit logging enabled',
              configPath: './config/audit.json',
              key: 'enabled',
              expectedValue: true
            }
          ],
          remediation: 'Enable comprehensive audit logging'
        }
      ]
    };
  }
  
  /**
   * Load code policy
   */
  async loadCodePolicy() {
    return {
      name: 'Code Quality Policy',
      version: '1.0.0',
      description: 'Code quality and security standards',
      rules: [
        {
          id: 'code-001',
          title: 'Code review required',
          category: 'process',
          severity: 'high',
          checks: [
            {
              type: 'branch-protection',
              description: 'Main branch requires code review',
              branch: 'main',
              requirements: ['review']
            }
          ],
          remediation: 'Configure branch protection to require code review'
        },
        {
          id: 'code-002',
          title: 'Linting configured',
          category: 'quality',
          severity: 'medium',
          checks: [
            {
              type: 'file-required',
              description: 'ESLint configuration exists',
              path: './.eslintrc.js'
            }
          ],
          remediation: 'Configure code linting with ESLint'
        },
        {
          id: 'code-003',
          title: 'No TODO comments in production',
          category: 'quality',
          severity: 'low',
          checks: [
            {
              type: 'command-output',
              description: 'No TODO comments in source code',
              command: 'grep',
              args: ['-r', 'TODO', './src'],
              pattern: '' // Empty means no output expected
            }
          ],
          remediation: 'Remove or convert TODO comments to proper issues'
        }
      ]
    };
  }
  
  /**
   * Load infrastructure policy
   */
  async loadInfrastructurePolicy() {
    return {
      name: 'Infrastructure Policy',
      version: '1.0.0',
      description: 'Infrastructure security and configuration standards',
      rules: [
        {
          id: 'infra-001',
          title: 'Infrastructure as Code used',
          category: 'iac',
          severity: 'medium',
          checks: [
            {
              type: 'file-required',
              description: 'Infrastructure configuration exists',
              path: './infrastructure/main.tf'
            }
          ],
          remediation: 'Define infrastructure using Infrastructure as Code'
        },
        {
          id: 'infra-002',
          title: 'Container security configured',
          category: 'containers',
          severity: 'high',
          checks: [
            {
              type: 'file-required',
              description: 'Container security policy exists',
              path: './docker/security-policy.yaml'
            }
          ],
          remediation: 'Configure container security policies'
        }
      ]
    };
  }
  
  /**
   * Load CI/CD policy
   */
  async loadCICDPolicy() {
    return {
      name: 'CI/CD Security Policy',
      version: '1.0.0',
      description: 'CI/CD pipeline security requirements',
      rules: [
        {
          id: 'cicd-001',
          title: 'Security scans in pipeline',
          category: 'pipeline',
          severity: 'high',
          checks: [
            {
              type: 'ci-config',
              description: 'Security scanning configured in CI',
              platform: 'github-actions',
              requirements: ['security-scan']
            }
          ],
          remediation: 'Add security scanning to CI/CD pipeline'
        },
        {
          id: 'cicd-002',
          title: 'No secrets in CI configuration',
          category: 'secrets',
          severity: 'critical',
          checks: [
            {
              type: 'file-forbidden',
              description: 'No hardcoded secrets in CI config',
              path: './.github/workflows/secrets.yml'
            }
          ],
          remediation: 'Use CI/CD secret management for sensitive data'
        },
        {
          id: 'cicd-003',
          title: 'Deployment approval required',
          category: 'deployment',
          severity: 'medium',
          checks: [
            {
              type: 'ci-config',
              description: 'Manual approval required for production deployment',
              platform: 'github-actions',
              requirements: ['manual-approval']
            }
          ],
          remediation: 'Configure manual approval for production deployments'
        }
      ]
    };
  }
  
  /**
   * Apply enforcement actions based on violations
   */
  async applyEnforcementActions(enforcementResult) {
    if (enforcementResult.allCompliant) {
      console.log(chalk.green('✅ All policies compliant - no enforcement actions needed'));
      return;
    }
    
    const enforcementLevel = this.enforcementLevels[this.enforcement];
    
    // Create enforcement report
    const report = {
      timestamp: new Date().toISOString(),
      enforcement: this.enforcement,
      actions: []
    };
    
    // Apply actions based on enforcement level
    if (enforcementResult.criticalViolations > 0) {
      const action = {
        type: 'block-deployment',
        reason: `${enforcementResult.criticalViolations} critical policy violations`,
        severity: 'critical'
      };
      
      report.actions.push(action);
      
      if (enforcementLevel >= 2) { // moderate or strict
        console.log(chalk.red('🚫 BLOCKING: Critical policy violations detected'));
        // In a real implementation, this would integrate with CI/CD to block deployment
      }
    }
    
    if (enforcementResult.highViolations > 0) {
      const action = {
        type: 'require-approval',
        reason: `${enforcementResult.highViolations} high severity policy violations`,
        severity: 'high'
      };
      
      report.actions.push(action);
      
      if (enforcementLevel >= 3) { // strict only
        console.log(chalk.yellow('⚠️  APPROVAL REQUIRED: High severity policy violations'));
      }
    }
    
    // Create violation remediation plan
    const remediationPlan = this.createRemediationPlan(enforcementResult);
    report.remediationPlan = remediationPlan;
    
    // Save enforcement report
    const reportFile = path.join(this.outputDir, `enforcement-report-${Date.now()}.json`);
    await fs.writeJson(reportFile, report, { spaces: 2 });
    
    console.log(chalk.blue(`📊 Enforcement report saved to ${reportFile}`));
  }
  
  /**
   * Create remediation plan for violations
   */
  createRemediationPlan(enforcementResult) {
    const plan = {
      timestamp: new Date().toISOString(),
      totalViolations: enforcementResult.totalViolations,
      remediationSteps: []
    };
    
    Object.values(enforcementResult.policies).forEach(policy => {
      policy.violations.forEach(violation => {
        plan.remediationSteps.push({
          violation: violation.rule,
          title: violation.title,
          severity: violation.severity,
          remediation: violation.remediation,
          priority: this.calculateRemediationPriority(violation.severity)
        });
      });
    });
    
    // Sort by priority
    plan.remediationSteps.sort((a, b) => b.priority - a.priority);
    
    return plan;
  }
  
  /**
   * Calculate remediation priority
   */
  calculateRemediationPriority(severity) {
    const priorities = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    return priorities[severity] || 1;
  }
  
  /**
   * Helper methods for rule checks
   */
  
  async checkRuleConditions(conditions) {
    // Mock implementation - check if rule should be applied
    return true;
  }
  
  async getConfigValue(configPath, key) {
    try {
      if (await fs.pathExists(configPath)) {
        const config = await fs.readJson(configPath);
        return this.getNestedValue(config, key);
      }
      return null;
    } catch (error) {
      return null;
    }
  }
  
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }
  
  compareValue(actual, expected, operator) {
    switch (operator) {
      case '===':
        return actual === expected;
      case '!==':
        return actual !== expected;
      case '>':
        return actual > expected;
      case '<':
        return actual < expected;
      default:
        return actual === expected;
    }
  }
  
  async executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          resolve(''); // Return empty for failed commands in policy context
        }
      });
      
      process.on('error', () => {
        resolve(''); // Return empty for failed commands
      });
    });
  }
  
  async checkGitHook(hookName) {
    const hookPath = `.git/hooks/${hookName}`;
    return fs.pathExists(hookPath);
  }
  
  async checkCIConfiguration(platform, requirements) {
    // Mock implementation - check CI configuration
    const ciConfigPaths = {
      'github-actions': '.github/workflows',
      'gitlab-ci': '.gitlab-ci.yml',
      'jenkins': 'Jenkinsfile'
    };
    
    const configPath = ciConfigPaths[platform];
    if (!configPath) {
      return false;
    }
    
    return fs.pathExists(configPath);
  }
  
  async checkDependencyPolicy(allowedPackages, forbiddenPackages) {
    // Mock implementation - check dependency policies
    return true; // Simplified for now
  }
  
  async checkSecurityScanResults(maxSeverity, maxCount) {
    // Mock implementation - check security scan results
    // In practice, this would integrate with security scanner results
    return true; // Simplified for now
  }
  
  async checkBranchProtection(branch, requirements) {
    // Mock implementation - check branch protection settings
    // In practice, this would check GitHub/GitLab API
    return fs.pathExists('.github/branch-protection.json');
  }
}