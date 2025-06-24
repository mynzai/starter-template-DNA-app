/**
 * @fileoverview Security DNA Modules Index - Epic 5 Story 7
 * Exports all security and compliance modules for the DNA system
 */

// Encryption Module (AC1)
export { EncryptionModule } from './encryption-module';
export type {
  EncryptionConfig,
  EncryptionAlgorithm,
  KeyDerivationFunction,
  HashAlgorithm,
  SignatureAlgorithm,
  KeyStorageType,
  KeyUsage,
  EncryptionKey,
  EncryptionResult,
  DecryptionResult,
  SignatureResult,
  VerificationResult,
  KeyDerivationResult,
  KeyStorageConfig,
  AccessPolicy,
  ComplianceFlag,
  AuditRecord
} from './encryption-module';

// GDPR Compliance Module (AC2)
export { GDPRComplianceModule } from './gdpr-compliance-module';
export type {
  GDPRConfig,
  DataSubjectRight,
  LegalBasis,
  ProcessingPurpose,
  DataCategory,
  RetentionPeriod,
  RequestStatus,
  ProcessingRecord,
  DataSubjectRequest,
  ConsentRecord,
  RetentionPolicy,
  DataBreachRecord,
  RiskAssessment,
  PrivacyImpactAssessment,
  BusinessAssociateAgreement
} from './gdpr-compliance-module';

// HIPAA Compliance Module (AC3)
export { HIPAAComplianceModule } from './hipaa-compliance-module';
export type {
  HIPAAConfig,
  HIPAAEntityType,
  PHICategory,
  AccessType,
  AuditEventType,
  RiskLevel,
  UserAccessProfile,
  HIPAARole,
  HIPAAPermission,
  HIPAAAuditLog,
  RiskAssessmentRecord,
  BusinessAssociateAgreement as HIPAABusinessAssociateAgreement,
  PasswordComplexityRules,
  PHIAccessScope,
  TrainingRecord,
  CertificationRecord
} from './hipaa-compliance-module';

// Security Scanning Module (AC4)
export { SecurityScanningModule } from './security-scanning-module';
export type {
  SecurityScanningConfig,
  ScanType,
  VulnerabilitySeverity,
  VulnerabilityStatus,
  ScanStatus,
  VulnerabilityCategory,
  ScannerConfig,
  ScanTarget,
  ScanRequest,
  ScanResult,
  Vulnerability,
  RemediationInfo,
  ScanSchedule,
  ComplianceFramework,
  NotificationChannel,
  IntegrationEndpoint
} from './security-scanning-module';

// Penetration Testing Module (AC5)
export { PenetrationTestingModule } from './penetration-testing-module';
export type {
  PenetrationTestingConfig,
  PentestMethodology,
  PentestType,
  TestPhase,
  AttackVector,
  ExploitCategory,
  FindingSeverity,
  FindingStatus,
  TestExecutionStatus,
  PentestScope,
  PentestPlan,
  TestExecution,
  PentestFinding,
  ExploitAttempt,
  CompromisedSystem,
  PentestTool,
  ExploitFramework,
  ExecutionMetrics
} from './penetration-testing-module';

/**
 * Security DNA Factory
 * Factory class for creating and managing security DNA modules
 */
export class SecurityDNAFactory {
  private static instance: SecurityDNAFactory;
  private modules: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): SecurityDNAFactory {
    if (!SecurityDNAFactory.instance) {
      SecurityDNAFactory.instance = new SecurityDNAFactory();
    }
    return SecurityDNAFactory.instance;
  }

  /**
   * Create encryption module
   */
  public createEncryption(config: EncryptionConfig): EncryptionModule {
    const moduleId = 'encryption';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new EncryptionModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create GDPR compliance module
   */
  public createGDPRCompliance(config: GDPRConfig): GDPRComplianceModule {
    const moduleId = 'gdpr_compliance';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new GDPRComplianceModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create HIPAA compliance module
   */
  public createHIPAACompliance(config: HIPAAConfig): HIPAAComplianceModule {
    const moduleId = 'hipaa_compliance';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new HIPAAComplianceModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create security scanning module
   */
  public createSecurityScanning(config: SecurityScanningConfig): SecurityScanningModule {
    const moduleId = 'security_scanning';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new SecurityScanningModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Create penetration testing module
   */
  public createPenetrationTesting(config: PenetrationTestingConfig): PenetrationTestingModule {
    const moduleId = 'penetration_testing';
    if (!this.modules.has(moduleId)) {
      this.modules.set(moduleId, new PenetrationTestingModule(config));
    }
    return this.modules.get(moduleId);
  }

  /**
   * Get all available modules
   */
  public getAvailableModules(): string[] {
    return [
      'encryption',
      'gdpr_compliance', 
      'hipaa_compliance',
      'security_scanning',
      'penetration_testing'
    ];
  }

  /**
   * Get module by ID
   */
  public getModule(moduleId: string): any {
    return this.modules.get(moduleId);
  }

  /**
   * Check if module exists
   */
  public hasModule(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }

  /**
   * Clear all modules
   */
  public clearModules(): void {
    this.modules.clear();
  }
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig = {
  encryption: {
    defaultSymmetricAlgorithm: 'aes-256-gcm' as const,
    defaultAsymmetricAlgorithm: 'rsa-oaep' as const,
    defaultHashAlgorithm: 'sha256' as const,
    defaultSignatureAlgorithm: 'rsa-pss-sha256' as const,
    keyStorageType: 'memory' as const,
    keyRotationEnabled: true,
    keyRotationInterval: 24, // hours
    keyDerivationFunction: 'pbkdf2' as const,
    enableHardwareSecurityModule: false,
    requireKeyEscrow: false,
    enableKeyRecovery: true,
    enableAuditLogging: true,
    symmetricKeySize: 256,
    asymmetricKeySize: 2048,
    derivationIterations: 100000,
    saltSize: 32,
    enableCaching: true,
    cacheExpiry: 3600,
    enableCompression: false,
    enableFIPSMode: false,
    enableCommonCriteria: false,
    enableSuiteB: false,
    keyStorageConfig: {
      keyDirectory: './keys',
      enableFileEncryption: true,
      filePermissions: '600'
    },
    enableQuantumResistance: false,
    enablePerfectForwardSecrecy: true,
    enableZeroKnowledgeProofs: false
  },
  gdprCompliance: {
    dataControllerName: 'Your Organization',
    dataControllerContact: 'privacy@yourorg.com',
    dataProtectionOfficer: 'dpo@yourorg.com',
    supervisoryAuthority: 'National Data Protection Authority',
    defaultRetentionPeriod: 'two_years' as const,
    defaultLegalBasis: 'consent' as const,
    enableAutomaticDeletion: true,
    deletionGracePeriod: 30,
    requestResponseTimeLimit: 30,
    enableAutomaticRequests: true,
    requireIdentityVerification: true,
    enableRequestNotifications: true,
    enableDataDiscovery: true,
    dataSourceConnections: [],
    enableConsentManagement: true,
    consentExpiryPeriod: 365,
    enableConsentGranularity: true,
    enableBreachNotification: true,
    breachNotificationTimeLimit: 72,
    breachNotificationRecipients: ['privacy@yourorg.com'],
    enableAnonymization: true,
    anonymizationMethods: [],
    enableTransferImpactAssessment: true,
    adequacyDecisionCountries: ['US', 'UK', 'CA'],
    standardContractualClauses: true,
    enablePrivacyByDesign: true,
    enableDataMinimization: true,
    enablePurposeLimitation: true,
    enableComplianceMonitoring: true,
    complianceReportingInterval: 30,
    enableRiskAssessment: true
  },
  hipaaCompliance: {
    entityType: 'covered_entity' as const,
    entityName: 'Your Healthcare Organization',
    entityContact: 'compliance@yourorg.com',
    securityOfficer: 'security@yourorg.com',
    privacyOfficer: 'privacy@yourorg.com',
    enableEncryptionAtRest: true,
    enableEncryptionInTransit: true,
    enableAccessControls: true,
    enableAuditLogs: true,
    enableIntegrityControls: true,
    enableTransmissionSecurity: true,
    enableRoleBasedAccess: true,
    enableMinimumNecessary: true,
    enableAutomaticLogoff: true,
    enableUniqueUserIdentification: true,
    logoffTimeoutMinutes: 30,
    passwordComplexityRules: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90,
      preventReuse: 12,
      maxFailedAttempts: 5,
      lockoutDuration: 30
    },
    auditLogRetentionDays: 2555, // 7 years
    enableRealTimeAuditing: true,
    enableTamperDetection: true,
    auditLogBackupFrequency: 'daily' as const,
    enableRiskAssessment: true,
    riskAssessmentFrequency: 12,
    enableVulnerabilityScanning: true,
    enablePenetrationTesting: true,
    enableIncidentResponse: true,
    incidentResponseTeam: ['security@yourorg.com', 'privacy@yourorg.com'],
    breachNotificationTimeLimit: 72,
    enableBusinessAssociateTracking: true,
    requireBusinessAssociateAgreements: true,
    enableSecurityTraining: true,
    trainingFrequency: 12,
    enableAwarenessProgram: true,
    enableDataBackup: true,
    backupFrequency: 'daily' as const,
    enableDisasterRecovery: true,
    rtoTarget: 24,
    rpoTarget: 4,
    enableComplianceMonitoring: true,
    complianceReportingInterval: 30,
    enableSelfAssessment: true
  },
  securityScanning: {
    enabledScanTypes: ['vulnerability_scan', 'dependency_scan', 'code_scan', 'web_app_scan'] as const,
    defaultScanners: [],
    scanSchedule: {
      enableScheduledScans: true,
      defaultInterval: 24,
      scanWindows: [],
      typeSchedules: [],
      enableEventTriggeredScans: true,
      scanTriggers: []
    },
    enableAggressiveScanning: false,
    enableAuthenticatedScanning: true,
    enableActiveScanning: false,
    scanTimeoutMinutes: 60,
    maxConcurrentScans: 3,
    enableVulnerabilityTracking: true,
    enableAutomaticTriaging: true,
    enableRiskScoring: true,
    enableThreatIntelligence: true,
    integrationEndpoints: [],
    enableCICD: true,
    failBuildOnCritical: true,
    failBuildOnHigh: false,
    enableNotifications: true,
    notificationChannels: [],
    notificationThresholds: [],
    enableComplianceScanning: true,
    complianceFrameworks: [],
    enableReporting: true,
    reportingFormats: [],
    reportingSchedule: {
      enableScheduledReports: true,
      frequency: 'weekly' as const,
      time: '09:00',
      recipients: ['security@yourorg.com'],
      formats: ['pdf', 'json']
    },
    reportRetentionDays: 365,
    enableMachineLearning: false,
    enableBehavioralAnalysis: false,
    enableThreatHunting: false,
    enableIncidentResponse: true
  },
  penetrationTesting: {
    defaultMethodology: 'owasp' as const,
    enabledTestTypes: ['black_box', 'gray_box'] as const,
    enabledAttackVectors: ['network', 'web_application', 'api'] as const,
    enableDestructiveTesting: false,
    enableSocialEngineering: false,
    enablePhysicalTesting: false,
    allowDataExfiltration: false,
    allowPrivilegeEscalation: true,
    maxTestDuration: 72,
    maxConcurrentTests: 1,
    enableAutomatedExploitation: true,
    enableManualTesting: true,
    pentestTools: [],
    exploitFrameworks: [],
    payloadLibraries: [],
    enableSafetyChecks: true,
    enableRollbackMechanisms: true,
    enableRealTimeMonitoring: true,
    emergencyStopEnabled: true,
    requireEthicalGuidelines: true,
    requireAuthorization: true,
    enableAuditLogging: true,
    respectTimeWindows: true,
    enableRealTimeReporting: true,
    reportingFormats: [],
    includeProofOfConcept: true,
    includeRemediation: true,
    integrationEndpoints: [],
    enableTicketCreation: true,
    enableAlertGeneration: true,
    enableAIAssistedTesting: false,
    enableBehavioralAnalysis: false,
    enableThreatModeling: true,
    enableRiskAssessment: true
  }
};

/**
 * Module compatibility matrix
 */
export const securityModuleCompatibility = {
  encryption: {
    dependsOn: [],
    compatibleWith: ['gdpr_compliance', 'hipaa_compliance', 'security_scanning'],
    conflicts: []
  },
  gdpr_compliance: {
    dependsOn: [],
    compatibleWith: ['encryption', 'security_scanning', 'penetration_testing'],
    conflicts: []
  },
  hipaa_compliance: {
    dependsOn: [],
    compatibleWith: ['encryption', 'security_scanning', 'penetration_testing'],
    conflicts: []
  },
  security_scanning: {
    dependsOn: [],
    compatibleWith: ['encryption', 'gdpr_compliance', 'hipaa_compliance', 'penetration_testing'],
    conflicts: []
  },
  penetration_testing: {
    dependsOn: ['security_scanning'],
    compatibleWith: ['gdpr_compliance', 'hipaa_compliance'],
    conflicts: []
  }
};

/**
 * Security framework mapping
 */
export const securityFrameworkMapping = {
  'ISO 27001': {
    supportedModules: ['encryption', 'security_scanning', 'penetration_testing'],
    requiredControls: [
      'A.10.1.1', // Cryptographic policy
      'A.12.6.1', // Management of technical vulnerabilities
      'A.14.2.5'  // Secure system engineering principles
    ]
  },
  'NIST Cybersecurity Framework': {
    supportedModules: ['encryption', 'security_scanning', 'penetration_testing'],
    functions: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover']
  },
  'SOC 2': {
    supportedModules: ['encryption', 'gdpr_compliance', 'security_scanning'],
    trustCriteria: ['Security', 'Availability', 'Confidentiality']
  },
  'PCI DSS': {
    supportedModules: ['encryption', 'security_scanning', 'penetration_testing'],
    requirements: [
      '3.4', // Render PAN unreadable
      '6.1', // Establish a process to identify security vulnerabilities
      '11.3' // Implement a methodology for penetration testing
    ]
  }
};