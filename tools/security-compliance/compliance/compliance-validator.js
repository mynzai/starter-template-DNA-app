import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import Joi from 'joi';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Comprehensive Compliance Validator
 * Validates GDPR, SOC2, HIPAA, and other regulatory requirements
 */
export class ComplianceValidator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './reports/compliance';
    this.configDir = path.join(__dirname, '../configs/compliance');
    this.complianceStandards = {};
    
    this.loadComplianceStandards();
  }
  
  /**
   * Load compliance standards configurations
   */
  async loadComplianceStandards() {
    try {
      await fs.ensureDir(this.configDir);
      
      // Load GDPR requirements
      this.complianceStandards.gdpr = await this.loadGDPRStandard();
      
      // Load SOC2 requirements
      this.complianceStandards.soc2 = await this.loadSOC2Standard();
      
      // Load HIPAA requirements
      this.complianceStandards.hipaa = await this.loadHIPAAStandard();
      
      // Load PCI-DSS requirements
      this.complianceStandards.pcidss = await this.loadPCIDSSStandard();
      
      // Load ISO 27001 requirements
      this.complianceStandards.iso27001 = await this.loadISO27001Standard();
      
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to load compliance standards: ${error.message}`));
    }
  }
  
  /**
   * Validate compliance against specified standards
   */
  async validateCompliance(standard = 'all', templateType = null) {
    await fs.ensureDir(this.outputDir);
    
    const validationResults = {
      timestamp: new Date().toISOString(),
      templateType,
      requestedStandards: standard === 'all' ? Object.keys(this.complianceStandards) : [standard],
      standards: {},
      overallCompliant: true,
      summary: {
        totalControls: 0,
        passedControls: 0,
        failedControls: 0,
        notApplicable: 0
      }
    };
    
    try {
      const standardsToValidate = standard === 'all' 
        ? Object.keys(this.complianceStandards)
        : [standard];
      
      for (const stdName of standardsToValidate) {
        if (!this.complianceStandards[stdName]) {
          console.warn(chalk.yellow(`⚠️  Unknown compliance standard: ${stdName}`));
          continue;
        }
        
        console.log(chalk.blue(`🔍 Validating ${stdName.toUpperCase()} compliance...`));
        
        const standardResult = await this.validateStandard(
          stdName,
          this.complianceStandards[stdName],
          templateType
        );
        
        validationResults.standards[stdName] = standardResult;
        
        // Update summary
        validationResults.summary.totalControls += standardResult.totalControls;
        validationResults.summary.passedControls += standardResult.passedControls;
        validationResults.summary.failedControls += standardResult.failedControls;
        validationResults.summary.notApplicable += standardResult.notApplicable;
        
        if (!standardResult.compliant) {
          validationResults.overallCompliant = false;
        }
      }
      
      // Save results
      const outputFile = path.join(this.outputDir, `compliance-validation-${Date.now()}.json`);
      await fs.writeJson(outputFile, validationResults, { spaces: 2 });
      
      console.log(chalk.green(`📋 Compliance validation results saved to ${outputFile}`));
      
      return validationResults;
      
    } catch (error) {
      throw new Error(`Compliance validation failed: ${error.message}`);
    }
  }
  
  /**
   * Validate a specific compliance standard
   */
  async validateStandard(standardName, standardConfig, templateType) {
    const result = {
      standardName,
      version: standardConfig.version,
      description: standardConfig.description,
      totalControls: 0,
      passedControls: 0,
      failedControls: 0,
      notApplicable: 0,
      compliant: true,
      controls: [],
      issues: []
    };
    
    for (const control of standardConfig.controls) {
      const controlResult = await this.validateControl(control, templateType);
      
      result.controls.push(controlResult);
      result.totalControls++;
      
      switch (controlResult.status) {
        case 'passed':
          result.passedControls++;
          break;
        case 'failed':
          result.failedControls++;
          result.compliant = false;
          result.issues.push({
            controlId: control.id,
            title: control.title,
            severity: control.severity || 'medium',
            description: controlResult.finding,
            recommendation: control.remediation
          });
          break;
        case 'not-applicable':
          result.notApplicable++;
          break;
      }
    }
    
    return result;
  }
  
  /**
   * Validate a specific control
   */
  async validateControl(control, templateType) {
    const controlResult = {
      id: control.id,
      title: control.title,
      category: control.category,
      severity: control.severity,
      status: 'not-applicable',
      finding: '',
      evidence: []
    };
    
    try {
      // Check if control applies to this template type
      if (templateType && control.applicableTemplates && 
          !control.applicableTemplates.includes(templateType)) {
        controlResult.status = 'not-applicable';
        controlResult.finding = 'Control not applicable to this template type';
        return controlResult;
      }
      
      // Execute validation checks
      const validationResults = [];
      
      for (const check of control.checks) {
        const checkResult = await this.executeValidationCheck(check);
        validationResults.push(checkResult);
        
        if (checkResult.evidence) {
          controlResult.evidence.push(checkResult.evidence);
        }
      }
      
      // Determine overall control status
      const failedChecks = validationResults.filter(r => !r.passed);
      
      if (failedChecks.length === 0) {
        controlResult.status = 'passed';
        controlResult.finding = 'All validation checks passed';
      } else {
        controlResult.status = 'failed';
        controlResult.finding = `${failedChecks.length} validation check(s) failed: ${failedChecks.map(f => f.description).join(', ')}`;
      }
      
    } catch (error) {
      controlResult.status = 'failed';
      controlResult.finding = `Validation error: ${error.message}`;
    }
    
    return controlResult;
  }
  
  /**
   * Execute a validation check
   */
  async executeValidationCheck(check) {
    const result = {
      type: check.type,
      description: check.description,
      passed: false,
      evidence: null
    };
    
    try {
      switch (check.type) {
        case 'file-exists':
          result.passed = await fs.pathExists(check.path);
          result.evidence = `File ${check.path} ${result.passed ? 'exists' : 'does not exist'}`;
          break;
          
        case 'file-contains':
          if (await fs.pathExists(check.path)) {
            const content = await fs.readFile(check.path, 'utf8');
            result.passed = content.includes(check.pattern);
            result.evidence = `File ${check.path} ${result.passed ? 'contains' : 'does not contain'} required pattern`;
          }
          break;
          
        case 'config-value':
          const configValue = await this.getConfigValue(check.configPath, check.key);
          result.passed = this.compareValue(configValue, check.expectedValue, check.operator || '===');
          result.evidence = `Config ${check.key}: ${configValue} (expected: ${check.expectedValue})`;
          break;
          
        case 'directory-structure':
          result.passed = await this.validateDirectoryStructure(check.structure);
          result.evidence = `Directory structure validation ${result.passed ? 'passed' : 'failed'}`;
          break;
          
        case 'security-header':
          result.passed = await this.validateSecurityHeader(check.header, check.value);
          result.evidence = `Security header ${check.header} validation ${result.passed ? 'passed' : 'failed'}`;
          break;
          
        case 'encryption-check':
          result.passed = await this.validateEncryption(check.algorithm, check.keySize);
          result.evidence = `Encryption validation ${result.passed ? 'passed' : 'failed'}`;
          break;
          
        case 'access-control':
          result.passed = await this.validateAccessControl(check.resource, check.permissions);
          result.evidence = `Access control validation ${result.passed ? 'passed' : 'failed'}`;
          break;
          
        case 'audit-logging':
          result.passed = await this.validateAuditLogging(check.events, check.retention);
          result.evidence = `Audit logging validation ${result.passed ? 'passed' : 'failed'}`;
          break;
          
        case 'data-protection':
          result.passed = await this.validateDataProtection(check.dataTypes, check.protectionMethods);
          result.evidence = `Data protection validation ${result.passed ? 'passed' : 'failed'}`;
          break;
          
        default:
          throw new Error(`Unknown validation check type: ${check.type}`);
      }
      
    } catch (error) {
      result.passed = false;
      result.evidence = `Check failed: ${error.message}`;
    }
    
    return result;
  }
  
  /**
   * Load GDPR compliance standard
   */
  async loadGDPRStandard() {
    return {
      name: 'GDPR',
      version: '2018',
      description: 'General Data Protection Regulation',
      controls: [
        {
          id: 'gdpr-art-25',
          title: 'Data Protection by Design and by Default',
          category: 'privacy',
          severity: 'high',
          article: 'Article 25',
          checks: [
            {
              type: 'config-value',
              description: 'Privacy settings enabled by default',
              configPath: './config/privacy.json',
              key: 'defaultPrivacyLevel',
              expectedValue: 'strict',
              operator: '==='
            },
            {
              type: 'file-exists',
              description: 'Privacy policy document exists',
              path: './docs/privacy-policy.md'
            }
          ],
          remediation: 'Implement privacy by design principles and configure strict default privacy settings'
        },
        {
          id: 'gdpr-art-32',
          title: 'Security of Processing',
          category: 'security',
          severity: 'critical',
          article: 'Article 32',
          checks: [
            {
              type: 'encryption-check',
              description: 'Data encrypted at rest and in transit',
              algorithm: 'AES',
              keySize: 256
            },
            {
              type: 'access-control',
              description: 'Access controls implemented',
              resource: 'personal-data',
              permissions: ['authenticate', 'authorize']
            }
          ],
          remediation: 'Implement appropriate technical and organizational security measures'
        },
        {
          id: 'gdpr-art-30',
          title: 'Records of Processing Activities',
          category: 'documentation',
          severity: 'medium',
          article: 'Article 30',
          checks: [
            {
              type: 'file-exists',
              description: 'Data processing record exists',
              path: './docs/data-processing-record.md'
            },
            {
              type: 'audit-logging',
              description: 'Processing activities logged',
              events: ['data-access', 'data-modification', 'data-deletion'],
              retention: '6-years'
            }
          ],
          remediation: 'Maintain records of all data processing activities'
        },
        {
          id: 'gdpr-art-17',
          title: 'Right to Erasure (Right to be Forgotten)',
          category: 'data-rights',
          severity: 'high',
          article: 'Article 17',
          checks: [
            {
              type: 'file-contains',
              description: 'Data deletion functionality implemented',
              path: './src/services/data-service.js',
              pattern: 'deleteUserData'
            },
            {
              type: 'config-value',
              description: 'Data retention policy configured',
              configPath: './config/data-retention.json',
              key: 'automaticDeletion',
              expectedValue: true
            }
          ],
          remediation: 'Implement functionality to delete personal data upon request'
        }
      ]
    };
  }
  
  /**
   * Load SOC2 compliance standard
   */
  async loadSOC2Standard() {
    return {
      name: 'SOC2',
      version: '2017',
      description: 'Service Organization Control 2',
      controls: [
        {
          id: 'soc2-cc-6.1',
          title: 'Logical and Physical Access Controls',
          category: 'access-control',
          severity: 'high',
          trustPrinciple: 'Security',
          checks: [
            {
              type: 'config-value',
              description: 'Multi-factor authentication enabled',
              configPath: './config/auth.json',
              key: 'mfaRequired',
              expectedValue: true
            },
            {
              type: 'file-exists',
              description: 'Access control policy exists',
              path: './docs/access-control-policy.md'
            }
          ],
          remediation: 'Implement comprehensive access controls and MFA'
        },
        {
          id: 'soc2-cc-7.1',
          title: 'System Operations',
          category: 'operations',
          severity: 'medium',
          trustPrinciple: 'Availability',
          checks: [
            {
              type: 'config-value',
              description: 'Monitoring and alerting configured',
              configPath: './config/monitoring.json',
              key: 'alertingEnabled',
              expectedValue: true
            },
            {
              type: 'file-exists',
              description: 'Incident response plan exists',
              path: './docs/incident-response-plan.md'
            }
          ],
          remediation: 'Implement comprehensive system monitoring and incident response'
        },
        {
          id: 'soc2-cc-8.1',
          title: 'Change Management',
          category: 'change-management',
          severity: 'medium',
          trustPrinciple: 'Processing Integrity',
          checks: [
            {
              type: 'file-exists',
              description: 'Change management process documented',
              path: './docs/change-management.md'
            },
            {
              type: 'config-value',
              description: 'Code review required',
              configPath: './.github/branch-protection.json',
              key: 'requiresReview',
              expectedValue: true
            }
          ],
          remediation: 'Implement formal change management processes'
        }
      ]
    };
  }
  
  /**
   * Load HIPAA compliance standard
   */
  async loadHIPAAStandard() {
    return {
      name: 'HIPAA',
      version: '2013',
      description: 'Health Insurance Portability and Accountability Act',
      controls: [
        {
          id: 'hipaa-164.312-a-1',
          title: 'Access Control',
          category: 'access-control',
          severity: 'critical',
          section: '164.312(a)(1)',
          applicableTemplates: ['ai-saas-platform', 'web-performance'],
          checks: [
            {
              type: 'config-value',
              description: 'Unique user identification required',
              configPath: './config/auth.json',
              key: 'uniqueUserIds',
              expectedValue: true
            },
            {
              type: 'access-control',
              description: 'PHI access controls implemented',
              resource: 'protected-health-information',
              permissions: ['authenticate', 'authorize', 'audit']
            }
          ],
          remediation: 'Implement unique user identification and access controls for PHI'
        },
        {
          id: 'hipaa-164.312-e-1',
          title: 'Transmission Security',
          category: 'transmission',
          severity: 'critical',
          section: '164.312(e)(1)',
          checks: [
            {
              type: 'encryption-check',
              description: 'PHI encrypted during transmission',
              algorithm: 'TLS',
              version: '1.2'
            },
            {
              type: 'security-header',
              description: 'HTTPS enforced',
              header: 'Strict-Transport-Security',
              value: 'required'
            }
          ],
          remediation: 'Encrypt PHI during transmission using approved methods'
        },
        {
          id: 'hipaa-164.308-a-1-ii-d',
          title: 'Information System Activity Review',
          category: 'audit',
          severity: 'high',
          section: '164.308(a)(1)(ii)(D)',
          checks: [
            {
              type: 'audit-logging',
              description: 'PHI access and modifications logged',
              events: ['phi-access', 'phi-modification', 'phi-deletion'],
              retention: '6-years'
            },
            {
              type: 'config-value',
              description: 'Audit log monitoring enabled',
              configPath: './config/audit.json',
              key: 'realTimeMonitoring',
              expectedValue: true
            }
          ],
          remediation: 'Implement comprehensive audit logging and monitoring'
        }
      ]
    };
  }
  
  /**
   * Load PCI-DSS compliance standard
   */
  async loadPCIDSSStandard() {
    return {
      name: 'PCI-DSS',
      version: '4.0',
      description: 'Payment Card Industry Data Security Standard',
      controls: [
        {
          id: 'pci-3.4',
          title: 'Cryptographic Protection of PAN',
          category: 'cryptography',
          severity: 'critical',
          requirement: '3.4',
          checks: [
            {
              type: 'encryption-check',
              description: 'PAN encrypted with strong cryptography',
              algorithm: 'AES',
              keySize: 256
            }
          ],
          remediation: 'Implement strong cryptographic protection for cardholder data'
        }
      ]
    };
  }
  
  /**
   * Load ISO 27001 compliance standard
   */
  async loadISO27001Standard() {
    return {
      name: 'ISO27001',
      version: '2022',
      description: 'Information Security Management Systems',
      controls: [
        {
          id: 'iso-27001-a.8.2',
          title: 'Information Classification',
          category: 'information-security',
          severity: 'medium',
          control: 'A.8.2',
          checks: [
            {
              type: 'file-exists',
              description: 'Information classification policy exists',
              path: './docs/information-classification.md'
            }
          ],
          remediation: 'Implement information classification policies'
        }
      ]
    };
  }
  
  /**
   * Get configuration value from file
   */
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
  
  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : null;
    }, obj);
  }
  
  /**
   * Compare values with operator
   */
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
      case '>=':
        return actual >= expected;
      case '<=':
        return actual <= expected;
      case 'includes':
        return Array.isArray(actual) && actual.includes(expected);
      default:
        return actual === expected;
    }
  }
  
  /**
   * Validate directory structure
   */
  async validateDirectoryStructure(structure) {
    for (const item of structure) {
      const exists = await fs.pathExists(item.path);
      if (!exists && item.required) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Validate security header (mock implementation)
   */
  async validateSecurityHeader(header, value) {
    // Mock implementation - in practice, this would check actual HTTP responses
    return true;
  }
  
  /**
   * Validate encryption settings
   */
  async validateEncryption(algorithm, keySize) {
    // Mock implementation - check for encryption configuration
    const strongAlgorithms = ['AES', 'TLS', 'RSA'];
    const minKeySizes = { 'AES': 256, 'RSA': 2048, 'TLS': 1.2 };
    
    if (!strongAlgorithms.includes(algorithm)) {
      return false;
    }
    
    if (minKeySizes[algorithm] && keySize < minKeySizes[algorithm]) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate access control
   */
  async validateAccessControl(resource, permissions) {
    // Mock implementation - check for access control configuration
    return permissions.every(permission => 
      ['authenticate', 'authorize', 'audit'].includes(permission)
    );
  }
  
  /**
   * Validate audit logging
   */
  async validateAuditLogging(events, retention) {
    // Mock implementation - check for audit logging configuration
    const configPath = './config/audit.json';
    
    if (await fs.pathExists(configPath)) {
      try {
        const config = await fs.readJson(configPath);
        const hasRequiredEvents = events.every(event => 
          config.loggedEvents && config.loggedEvents.includes(event)
        );
        
        const hasRetention = config.retentionPeriod && 
          config.retentionPeriod >= retention;
        
        return hasRequiredEvents && hasRetention;
      } catch (error) {
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Validate data protection
   */
  async validateDataProtection(dataTypes, protectionMethods) {
    // Mock implementation - check for data protection measures
    return protectionMethods.every(method => 
      ['encryption', 'anonymization', 'pseudonymization'].includes(method)
    );
  }
  
  /**
   * Configure compliance standards
   */
  async configureStandards(selectedStandards) {
    console.log(chalk.blue(`📋 Configuring compliance standards: ${selectedStandards.join(', ')}`));
    
    // Create configuration directories
    await fs.ensureDir('./config');
    await fs.ensureDir('./docs');
    
    // Create sample configuration files based on selected standards
    for (const standard of selectedStandards) {
      await this.createStandardConfiguration(standard);
    }
    
    console.log(chalk.green('✅ Compliance standards configured'));
  }
  
  /**
   * Create configuration for a specific standard
   */
  async createStandardConfiguration(standard) {
    const standardName = standard.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    switch (standardName) {
      case 'gdpr':
        await this.createGDPRConfiguration();
        break;
      case 'soc2':
        await this.createSOC2Configuration();
        break;
      case 'hipaa':
        await this.createHIPAAConfiguration();
        break;
      case 'pcidss':
        await this.createPCIDSSConfiguration();
        break;
      case 'iso27001':
        await this.createISO27001Configuration();
        break;
    }
  }
  
  /**
   * Create GDPR configuration files
   */
  async createGDPRConfiguration() {
    const privacyConfig = {
      defaultPrivacyLevel: 'strict',
      cookieConsent: true,
      dataMinimization: true,
      rightToErasure: true,
      dataPortability: true
    };
    
    const dataRetentionConfig = {
      automaticDeletion: true,
      retentionPeriods: {
        userProfiles: '3-years',
        transactionData: '7-years',
        analyticsData: '26-months'
      }
    };
    
    await fs.writeJson('./config/privacy.json', privacyConfig, { spaces: 2 });
    await fs.writeJson('./config/data-retention.json', dataRetentionConfig, { spaces: 2 });
    
    const privacyPolicy = `# Privacy Policy\n\nThis document outlines our GDPR-compliant privacy practices.\n\n## Data Processing\n\n- Data minimization principles applied\n- Consent-based processing\n- Right to erasure implemented`;
    
    await fs.writeFile('./docs/privacy-policy.md', privacyPolicy);
    await fs.writeFile('./docs/data-processing-record.md', '# Data Processing Activities Record\n\nDetailed record of all data processing activities.');
  }
  
  /**
   * Create SOC2 configuration files
   */
  async createSOC2Configuration() {
    const authConfig = {
      mfaRequired: true,
      sessionTimeout: 30,
      passwordPolicy: {
        minLength: 12,
        requireSpecialChars: true,
        requireNumbers: true
      }
    };
    
    const monitoringConfig = {
      alertingEnabled: true,
      metricsCollection: true,
      logRetention: '1-year',
      alertChannels: ['email', 'slack']
    };
    
    await fs.writeJson('./config/auth.json', authConfig, { spaces: 2 });
    await fs.writeJson('./config/monitoring.json', monitoringConfig, { spaces: 2 });
    
    await fs.writeFile('./docs/access-control-policy.md', '# Access Control Policy\n\nComprehensive access control procedures.');
    await fs.writeFile('./docs/incident-response-plan.md', '# Incident Response Plan\n\nDetailed incident response procedures.');
    await fs.writeFile('./docs/change-management.md', '# Change Management Process\n\nFormal change management procedures.');
  }
  
  /**
   * Create HIPAA configuration files
   */
  async createHIPAAConfiguration() {
    const auditConfig = {
      realTimeMonitoring: true,
      loggedEvents: ['phi-access', 'phi-modification', 'phi-deletion', 'user-login', 'user-logout'],
      retentionPeriod: '6-years',
      encryptionRequired: true
    };
    
    await fs.writeJson('./config/audit.json', auditConfig, { spaces: 2 });
  }
  
  /**
   * Create PCI-DSS configuration files
   */
  async createPCIDSSConfiguration() {
    const paymentConfig = {
      encryptionAlgorithm: 'AES-256',
      keyManagement: 'HSM',
      tokenization: true,
      dataRetention: 'minimal'
    };
    
    await fs.writeJson('./config/payment-security.json', paymentConfig, { spaces: 2 });
  }
  
  /**
   * Create ISO 27001 configuration files
   */
  async createISO27001Configuration() {
    await fs.writeFile('./docs/information-classification.md', '# Information Classification Policy\n\nInformation security classification scheme.');
  }
}