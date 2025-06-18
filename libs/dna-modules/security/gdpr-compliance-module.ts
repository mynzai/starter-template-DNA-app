/**
 * @fileoverview GDPR Compliance DNA Module - Epic 5 Story 7 AC2
 * Provides comprehensive GDPR compliance with data retention, deletion, and privacy rights management
 */

import { EventEmitter } from 'events';
import { BaseDNAModule } from '../../core/src/lib/dna-module';
import {
  DNAModuleMetadata,
  DNAModuleFile,
  DNAModuleContext,
  SupportedFramework,
  DNAModuleCategory,
  FrameworkSupport
} from '../../core/src/lib/types';

/**
 * GDPR data subject rights
 */
export enum DataSubjectRight {
  ACCESS = 'access',                    // Article 15
  RECTIFICATION = 'rectification',      // Article 16
  ERASURE = 'erasure',                  // Article 17 (Right to be forgotten)
  RESTRICT_PROCESSING = 'restrict_processing', // Article 18
  DATA_PORTABILITY = 'data_portability', // Article 20
  OBJECT = 'object',                    // Article 21
  WITHDRAW_CONSENT = 'withdraw_consent'  // Article 7(3)
}

/**
 * Legal basis for processing under GDPR
 */
export enum LegalBasis {
  CONSENT = 'consent',                  // Article 6(1)(a)
  CONTRACT = 'contract',                // Article 6(1)(b)
  LEGAL_OBLIGATION = 'legal_obligation', // Article 6(1)(c)
  VITAL_INTERESTS = 'vital_interests',   // Article 6(1)(d)
  PUBLIC_TASK = 'public_task',          // Article 6(1)(e)
  LEGITIMATE_INTEREST = 'legitimate_interest' // Article 6(1)(f)
}

/**
 * Data processing purposes
 */
export enum ProcessingPurpose {
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
  CUSTOMER_SERVICE = 'customer_service',
  FRAUD_PREVENTION = 'fraud_prevention',
  LEGAL_COMPLIANCE = 'legal_compliance',
  RESEARCH = 'research',
  SECURITY = 'security',
  OPERATIONAL = 'operational'
}

/**
 * Data categories under GDPR
 */
export enum DataCategory {
  PERSONAL_DATA = 'personal_data',
  SPECIAL_CATEGORY = 'special_category',  // Article 9
  CRIMINAL_DATA = 'criminal_data',        // Article 10
  PSEUDONYMIZED = 'pseudonymized',
  ANONYMOUS = 'anonymous'
}

/**
 * Data retention periods
 */
export enum RetentionPeriod {
  IMMEDIATE = 'immediate',
  THIRTY_DAYS = '30_days',
  SIX_MONTHS = '6_months',
  ONE_YEAR = '1_year',
  TWO_YEARS = '2_years',
  FIVE_YEARS = '5_years',
  TEN_YEARS = '10_years',
  INDEFINITE = 'indefinite',
  CUSTOM = 'custom'
}

/**
 * Request status
 */
export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

/**
 * GDPR compliance configuration
 */
export interface GDPRConfig {
  // Organization details
  dataControllerName: string;
  dataControllerContact: string;
  dataProtectionOfficer: string;
  supervisoryAuthority: string;
  
  // Default settings
  defaultRetentionPeriod: RetentionPeriod;
  defaultLegalBasis: LegalBasis;
  enableAutomaticDeletion: boolean;
  deletionGracePeriod: number; // days
  
  // Request handling
  requestResponseTimeLimit: number; // days (default 30)
  enableAutomaticRequests: boolean;
  requireIdentityVerification: boolean;
  enableRequestNotifications: boolean;
  
  // Data discovery
  enableDataDiscovery: boolean;
  dataSourceConnections: DataSourceConnection[];
  
  // Consent management
  enableConsentManagement: boolean;
  consentExpiryPeriod: number; // days
  enableConsentGranularity: boolean;
  
  // Breach notification
  enableBreachNotification: boolean;
  breachNotificationTimeLimit: number; // hours (default 72)
  breachNotificationRecipients: string[];
  
  // Anonymization
  enableAnonymization: boolean;
  anonymizationMethods: AnonymizationMethod[];
  
  // Cross-border transfers
  enableTransferImpactAssessment: boolean;
  adequacyDecisionCountries: string[];
  standardContractualClauses: boolean;
  
  // Privacy by design
  enablePrivacyByDesign: boolean;
  enableDataMinimization: boolean;
  enablePurposeLimitation: boolean;
  
  // Compliance monitoring
  enableComplianceMonitoring: boolean;
  complianceReportingInterval: number; // days
  enableRiskAssessment: boolean;
}

/**
 * Data source connection for discovery
 */
export interface DataSourceConnection {
  id: string;
  name: string;
  type: 'database' | 'api' | 'file' | 'cloud_storage' | 'third_party';
  connectionString: string;
  credentials: Record<string, string>;
  enabled: boolean;
  lastScan?: Date;
  dataClassification: DataClassificationResult[];
}

/**
 * Data classification result
 */
export interface DataClassificationResult {
  fieldName: string;
  dataCategory: DataCategory;
  confidence: number; // 0-1
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
  containsPII: boolean;
  suggestedRetentionPeriod: RetentionPeriod;
}

/**
 * Anonymization method
 */
export interface AnonymizationMethod {
  id: string;
  name: string;
  type: 'k_anonymity' | 'l_diversity' | 'differential_privacy' | 'data_masking' | 'generalization';
  parameters: Record<string, any>;
  effectiveness: number; // 0-1
  reversibility: boolean;
}

/**
 * Data processing record (Article 30)
 */
export interface ProcessingRecord {
  id: string;
  name: string;
  description: string;
  
  // Processing details
  dataController: string;
  dataProcessor?: string;
  legalBasis: LegalBasis;
  purposes: ProcessingPurpose[];
  
  // Data details
  dataCategories: DataCategory[];
  dataSubjects: string[]; // types of data subjects
  recipients: string[];   // categories of recipients
  
  // International transfers
  thirdCountryTransfers: ThirdCountryTransfer[];
  
  // Retention
  retentionPeriod: RetentionPeriod;
  customRetentionDays?: number;
  deletionProcedure: string;
  
  // Security measures
  technicalMeasures: string[];
  organizationalMeasures: string[];
  
  // Timestamps
  createdAt: Date;
  lastUpdated: Date;
  lastReviewed: Date;
  
  // Compliance
  riskAssessment?: RiskAssessment;
  privacyImpactAssessment?: PrivacyImpactAssessment;
}

/**
 * Third country transfer
 */
export interface ThirdCountryTransfer {
  country: string;
  recipient: string;
  adequacyDecision: boolean;
  safeguards: string[];
  legalInstrument: string;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  id: string;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  identifiedRisks: Risk[];
  mitigationMeasures: MitigationMeasure[];
  residualRisk: 'low' | 'medium' | 'high';
  assessmentDate: Date;
  nextReviewDate: Date;
  assessor: string;
}

/**
 * Individual risk
 */
export interface Risk {
  id: string;
  description: string;
  likelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  impact: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  riskScore: number; // calculated from likelihood and impact
  category: 'confidentiality' | 'integrity' | 'availability' | 'privacy';
}

/**
 * Mitigation measure
 */
export interface MitigationMeasure {
  id: string;
  description: string;
  riskId: string;
  effectiveness: 'low' | 'medium' | 'high';
  implementationStatus: 'planned' | 'in_progress' | 'implemented' | 'verified';
  responsible: string;
  deadline: Date;
}

/**
 * Privacy Impact Assessment (DPIA)
 */
export interface PrivacyImpactAssessment {
  id: string;
  processingId: string;
  necessityAssessment: string;
  proportionalityAssessment: string;
  
  // Risk analysis
  risksToRights: Risk[];
  mitigationMeasures: MitigationMeasure[];
  
  // Consultation
  stakeholdersConsulted: string[];
  dpoConsultation: boolean;
  supervisoryAuthorityConsultation: boolean;
  
  // Decision
  decision: 'proceed' | 'proceed_with_measures' | 'do_not_proceed';
  decisionRationale: string;
  
  // Metadata
  conductedBy: string;
  conductedAt: Date;
  reviewDate: Date;
  approved: boolean;
  approver?: string;
}

/**
 * Data subject request
 */
export interface DataSubjectRequest {
  id: string;
  requestType: DataSubjectRight;
  status: RequestStatus;
  
  // Requester details
  dataSubjectId: string;
  requesterId: string;
  requesterEmail: string;
  verificationMethod: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  
  // Request details
  requestDescription: string;
  requestedData?: string[];
  requestedActions?: string[];
  
  // Processing
  receivedAt: Date;
  responseDeadline: Date;
  processedAt?: Date;
  completedAt?: Date;
  
  // Response
  responseMethod: 'email' | 'portal' | 'post' | 'in_person';
  responseData?: string;
  responseActions?: string[];
  rejectionReason?: string;
  
  // Tracking
  assignedTo?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  notes: ProcessingNote[];
  
  // Compliance
  legalBasisChallenge?: boolean;
  appealReceived?: boolean;
  appealOutcome?: string;
}

/**
 * Processing note
 */
export interface ProcessingNote {
  id: string;
  timestamp: Date;
  author: string;
  type: 'progress_update' | 'verification' | 'data_discovery' | 'action_taken' | 'decision';
  content: string;
  attachments?: string[];
}

/**
 * Consent record
 */
export interface ConsentRecord {
  id: string;
  dataSubjectId: string;
  
  // Consent details
  purposes: ProcessingPurpose[];
  legalBasis: LegalBasis;
  consentText: string;
  consentVersion: string;
  
  // Status
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;
  expiresAt?: Date;
  
  // Context
  collectionMethod: 'web_form' | 'mobile_app' | 'email' | 'phone' | 'in_person' | 'api';
  collectionContext: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Granular consent
  granularConsents: GranularConsent[];
  
  // Processing history
  consentHistory: ConsentHistoryEntry[];
  
  // Verification
  doubleOptIn: boolean;
  verificationStatus: 'verified' | 'pending' | 'unverified';
}

/**
 * Granular consent for specific purposes
 */
export interface GranularConsent {
  purpose: ProcessingPurpose;
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;
  mandatory: boolean;
}

/**
 * Consent history entry
 */
export interface ConsentHistoryEntry {
  id: string;
  timestamp: Date;
  action: 'granted' | 'withdrawn' | 'modified' | 'renewed' | 'expired';
  purposes: ProcessingPurpose[];
  method: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  
  // Scope
  dataCategories: DataCategory[];
  processingPurposes: ProcessingPurpose[];
  dataLocations: string[];
  
  // Retention rules
  retentionPeriod: RetentionPeriod;
  customRetentionDays?: number;
  retentionTrigger: 'creation_date' | 'last_access' | 'last_update' | 'purpose_fulfilled' | 'consent_withdrawn';
  
  // Deletion rules
  deletionMethod: 'soft_delete' | 'hard_delete' | 'anonymization' | 'archival';
  deletionDelay: number; // days after retention period
  
  // Exceptions
  legalHoldExceptions: LegalHoldException[];
  businessJustifications: string[];
  
  // Automation
  automaticDeletion: boolean;
  reviewRequired: boolean;
  approvalRequired: boolean;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
  approvedBy?: string;
  approvedAt?: Date;
  effectiveDate: Date;
  nextReviewDate: Date;
}

/**
 * Legal hold exception
 */
export interface LegalHoldException {
  id: string;
  reason: string;
  legalBasis: string;
  startDate: Date;
  endDate?: Date;
  authorizedBy: string;
  affectedData: string[];
}

/**
 * Data breach record
 */
export interface DataBreachRecord {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Incident details
  discoveredAt: Date;
  occurredAt: Date;
  reportedAt?: Date;
  description: string;
  affectedDataTypes: DataCategory[];
  
  // Impact assessment
  affectedDataSubjects: number;
  affectedDataSubjectIds?: string[];
  potentialConsequences: string[];
  riskToRightsAndFreedoms: 'low' | 'medium' | 'high';
  
  // Response actions
  containmentActions: string[];
  mitigationActions: string[];
  recoveryActions: string[];
  
  // Notifications
  supervisoryAuthorityNotified: boolean;
  supervisoryAuthorityNotifiedAt?: Date;
  dataSubjectsNotified: boolean;
  dataSubjectsNotifiedAt?: Date;
  
  // Investigation
  rootCause: string;
  lessonsLearned: string[];
  preventiveMeasures: string[];
  
  // Status
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assignedTo: string;
  
  // Documentation
  attachments: string[];
  legalAdviceObtained: boolean;
  insuranceClaimed: boolean;
}

/**
 * GDPR Compliance DNA Module
 */
export class GDPRComplianceModule extends BaseDNAModule {
  private config: GDPRConfig;
  private processingRecords: Map<string, ProcessingRecord> = new Map();
  private dataSubjectRequests: Map<string, DataSubjectRequest> = new Map();
  private consentRecords: Map<string, ConsentRecord> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private breachRecords: Map<string, DataBreachRecord> = new Map();
  private eventEmitter: EventEmitter;

  constructor(config: GDPRConfig) {
    super();
    this.config = config;
    this.eventEmitter = new EventEmitter();
    
    if (this.config.enableAutomaticDeletion) {
      this.startAutomaticDeletionProcess();
    }
  }

  /**
   * Get module metadata
   */
  public getMetadata(): DNAModuleMetadata {
    return {
      name: 'GDPR Compliance Module',
      version: '1.0.0',
      description: 'Comprehensive GDPR compliance with data retention, deletion, and privacy rights',
      category: DNAModuleCategory.SECURITY,
      tags: ['gdpr', 'privacy', 'compliance', 'data-protection', 'retention', 'deletion'],
      author: 'DNA System',
      repository: 'https://github.com/dna-system/gdpr-compliance-module',
      license: 'MIT',
      frameworks: [
        SupportedFramework.NEXTJS,
        SupportedFramework.TAURI,
        SupportedFramework.SVELTEKIT
      ],
      dependencies: [],
      peerDependencies: [],
      configuration: {
        required: ['dataControllerName', 'dataControllerContact', 'defaultRetentionPeriod'],
        optional: ['dataProtectionOfficer', 'enableAutomaticDeletion'],
        schema: {
          type: 'object',
          properties: {
            dataControllerName: { type: 'string' },
            dataControllerContact: { type: 'string', format: 'email' },
            defaultRetentionPeriod: { type: 'string', enum: Object.values(RetentionPeriod) },
            enableAutomaticDeletion: { type: 'boolean' }
          }
        }
      }
    };
  }

  /**
   * Check framework support
   */
  public checkFrameworkSupport(framework: SupportedFramework): FrameworkSupport {
    const supportedFrameworks = [
      SupportedFramework.NEXTJS,
      SupportedFramework.TAURI,
      SupportedFramework.SVELTEKIT
    ];

    return {
      framework,
      isSupported: supportedFrameworks.includes(framework),
      version: '1.0.0',
      limitations: [],
      additionalDependencies: framework === SupportedFramework.NEXTJS
        ? ['@prisma/client', 'nodemailer']
        : framework === SupportedFramework.TAURI
        ? ['@tauri-apps/api']
        : ['@sveltejs/kit']
    };
  }

  /**
   * Generate framework-specific files
   */
  public async generateFiles(context: DNAModuleContext): Promise<DNAModuleFile[]> {
    const files: DNAModuleFile[] = [];

    // Base configuration file
    files.push({
      path: 'src/lib/gdpr/config.ts',
      content: this.generateConfigFile(),
      type: 'typescript'
    });

    // Core GDPR service
    files.push({
      path: 'src/lib/gdpr/gdpr-service.ts',
      content: this.generateGDPRService(),
      type: 'typescript'
    });

    // Data subject request handler
    files.push({
      path: 'src/lib/gdpr/request-handler.ts',
      content: this.generateRequestHandler(),
      type: 'typescript'
    });

    // Consent management
    files.push({
      path: 'src/lib/gdpr/consent-manager.ts',
      content: this.generateConsentManager(),
      type: 'typescript'
    });

    // Data retention manager
    files.push({
      path: 'src/lib/gdpr/retention-manager.ts',
      content: this.generateRetentionManager(),
      type: 'typescript'
    });

    // Privacy impact assessment
    files.push({
      path: 'src/lib/gdpr/privacy-impact-assessment.ts',
      content: this.generatePrivacyImpactAssessment(),
      type: 'typescript'
    });

    // Framework-specific implementations
    switch (context.framework) {
      case SupportedFramework.NEXTJS:
        files.push(...this.generateNextJSFiles());
        break;
      case SupportedFramework.TAURI:
        files.push(...this.generateTauriFiles());
        break;
      case SupportedFramework.SVELTEKIT:
        files.push(...this.generateSvelteKitFiles());
        break;
    }

    // Test files
    files.push({
      path: 'src/lib/gdpr/__tests__/gdpr-compliance.test.ts',
      content: this.generateTestFile(),
      type: 'test'
    });

    // Documentation
    files.push({
      path: 'docs/gdpr-compliance.md',
      content: this.generateDocumentation(),
      type: 'documentation'
    });

    return files;
  }

  /**
   * Register a processing record (Article 30)
   */
  public async registerProcessingRecord(record: Omit<ProcessingRecord, 'id' | 'createdAt' | 'lastUpdated' | 'lastReviewed'>): Promise<string> {
    const recordId = this.generateRecordId();
    
    const processingRecord: ProcessingRecord = {
      ...record,
      id: recordId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      lastReviewed: new Date()
    };
    
    this.processingRecords.set(recordId, processingRecord);
    
    // Emit event
    this.eventEmitter.emit('processing_record:registered', { recordId, record: processingRecord });
    
    return recordId;
  }

  /**
   * Submit a data subject request
   */
  public async submitDataSubjectRequest(
    requestType: DataSubjectRight,
    dataSubjectId: string,
    requesterEmail: string,
    requestDescription: string,
    requestedData?: string[]
  ): Promise<string> {
    const requestId = this.generateRequestId();
    
    const request: DataSubjectRequest = {
      id: requestId,
      requestType,
      status: RequestStatus.PENDING,
      dataSubjectId,
      requesterId: dataSubjectId,
      requesterEmail,
      verificationMethod: 'email',
      verificationStatus: 'pending',
      requestDescription,
      requestedData,
      receivedAt: new Date(),
      responseDeadline: new Date(Date.now() + this.config.requestResponseTimeLimit * 24 * 60 * 60 * 1000),
      responseMethod: 'email',
      priority: 'medium',
      tags: [],
      notes: [{
        id: this.generateNoteId(),
        timestamp: new Date(),
        author: 'system',
        type: 'progress_update',
        content: 'Request received and assigned for processing'
      }]
    };
    
    this.dataSubjectRequests.set(requestId, request);
    
    // Start identity verification if required
    if (this.config.requireIdentityVerification) {
      await this.initiateIdentityVerification(request);
    }
    
    // Send notifications if enabled
    if (this.config.enableRequestNotifications) {
      await this.sendRequestNotification(request);
    }
    
    // Emit event
    this.eventEmitter.emit('data_subject_request:submitted', { requestId, request });
    
    return requestId;
  }

  /**
   * Process data subject access request (Article 15)
   */
  public async processAccessRequest(requestId: string): Promise<{
    personalData: Record<string, any>;
    processingPurposes: string[];
    dataCategories: string[];
    recipients: string[];
    retentionPeriod: string;
    dataSubjectRights: string[];
  } | null> {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request || request.requestType !== DataSubjectRight.ACCESS) {
      return null;
    }
    
    // Verify identity
    if (request.verificationStatus !== 'verified') {
      throw new Error('Identity verification required');
    }
    
    // Update status
    request.status = RequestStatus.IN_PROGRESS;
    request.assignedTo = 'data-access-processor';
    
    // Discover personal data across data sources
    const personalData = await this.discoverPersonalData(request.dataSubjectId);
    
    // Get processing information
    const relevantProcessing = Array.from(this.processingRecords.values())
      .filter(record => this.isDataSubjectAffected(record, request.dataSubjectId));
    
    const processingPurposes = relevantProcessing.flatMap(r => r.purposes);
    const dataCategories = relevantProcessing.flatMap(r => r.dataCategories);
    const recipients = relevantProcessing.flatMap(r => r.recipients);
    
    const result = {
      personalData,
      processingPurposes: [...new Set(processingPurposes)],
      dataCategories: [...new Set(dataCategories)],
      recipients: [...new Set(recipients)],
      retentionPeriod: this.getRetentionPeriodForDataSubject(request.dataSubjectId),
      dataSubjectRights: Object.values(DataSubjectRight)
    };
    
    // Update request
    request.status = RequestStatus.COMPLETED;
    request.completedAt = new Date();
    request.responseData = JSON.stringify(result);
    request.notes.push({
      id: this.generateNoteId(),
      timestamp: new Date(),
      author: 'data-access-processor',
      type: 'action_taken',
      content: 'Personal data compiled and response prepared'
    });
    
    // Emit event
    this.eventEmitter.emit('access_request:completed', { requestId, result });
    
    return result;
  }

  /**
   * Process data erasure request (Article 17 - Right to be forgotten)
   */
  public async processErasureRequest(requestId: string, verifyErasureGrounds: boolean = true): Promise<{
    erasedData: string[];
    retainedData: string[];
    erasureReasons: string[];
    retentionReasons: string[];
  } | null> {
    const request = this.dataSubjectRequests.get(requestId);
    if (!request || request.requestType !== DataSubjectRight.ERASURE) {
      return null;
    }
    
    if (request.verificationStatus !== 'verified') {
      throw new Error('Identity verification required');
    }
    
    request.status = RequestStatus.IN_PROGRESS;
    
    // Check erasure grounds if verification enabled
    if (verifyErasureGrounds) {
      const erasureGrounds = await this.verifyErasureGrounds(request.dataSubjectId);
      if (!erasureGrounds.canErase) {
        request.status = RequestStatus.REJECTED;
        request.rejectionReason = erasureGrounds.reasons.join('; ');
        
        return {
          erasedData: [],
          retainedData: erasureGrounds.retainedData,
          erasureReasons: [],
          retentionReasons: erasureGrounds.reasons
        };
      }
    }
    
    // Discover data to be erased
    const dataDiscovery = await this.discoverDataForErasure(request.dataSubjectId);
    
    // Perform erasure
    const erasureResults = await this.performDataErasure(dataDiscovery.erasableData);
    
    const result = {
      erasedData: erasureResults.successful,
      retainedData: [...dataDiscovery.retainedData, ...erasureResults.failed],
      erasureReasons: ['Data subject request', 'No longer necessary for original purpose'],
      retentionReasons: dataDiscovery.retentionReasons
    };
    
    // Update request
    request.status = RequestStatus.COMPLETED;
    request.completedAt = new Date();
    request.responseActions = result.erasedData;
    request.notes.push({
      id: this.generateNoteId(),
      timestamp: new Date(),
      author: 'data-erasure-processor',
      type: 'action_taken',
      content: `Erased ${result.erasedData.length} data items, retained ${result.retainedData.length} items`
    });
    
    // Log erasure for audit trail
    await this.logDataErasure(request.dataSubjectId, result);
    
    // Emit event
    this.eventEmitter.emit('erasure_request:completed', { requestId, result });
    
    return result;
  }

  /**
   * Record consent (Article 7)
   */
  public async recordConsent(
    dataSubjectId: string,
    purposes: ProcessingPurpose[],
    consentText: string,
    consentMethod: 'web_form' | 'mobile_app' | 'email' | 'phone' | 'in_person' | 'api',
    context: {
      ipAddress?: string;
      userAgent?: string;
      doubleOptIn?: boolean;
    } = {}
  ): Promise<string> {
    const consentId = this.generateConsentId();
    
    const consentRecord: ConsentRecord = {
      id: consentId,
      dataSubjectId,
      purposes,
      legalBasis: LegalBasis.CONSENT,
      consentText,
      consentVersion: '1.0',
      granted: true,
      grantedAt: new Date(),
      expiresAt: this.config.enableConsentManagement 
        ? new Date(Date.now() + this.config.consentExpiryPeriod * 24 * 60 * 60 * 1000)
        : undefined,
      collectionMethod: consentMethod,
      collectionContext: 'User consent collection',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      granularConsents: purposes.map(purpose => ({
        purpose,
        granted: true,
        grantedAt: new Date(),
        mandatory: false
      })),
      consentHistory: [{
        id: this.generateHistoryId(),
        timestamp: new Date(),
        action: 'granted',
        purposes,
        method: consentMethod,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent
      }],
      doubleOptIn: context.doubleOptIn || false,
      verificationStatus: context.doubleOptIn ? 'pending' : 'verified'
    };
    
    this.consentRecords.set(consentId, consentRecord);
    
    // Emit event
    this.eventEmitter.emit('consent:recorded', { consentId, record: consentRecord });
    
    return consentId;
  }

  /**
   * Withdraw consent (Article 7(3))
   */
  public async withdrawConsent(
    dataSubjectId: string,
    purposes?: ProcessingPurpose[],
    withdrawalMethod: string = 'web_form'
  ): Promise<boolean> {
    const consentRecords = Array.from(this.consentRecords.values())
      .filter(record => record.dataSubjectId === dataSubjectId && record.granted);
    
    let withdrawalCount = 0;
    
    for (const record of consentRecords) {
      const purposesToWithdraw = purposes || record.purposes;
      const applicablePurposes = record.purposes.filter(p => purposesToWithdraw.includes(p));
      
      if (applicablePurposes.length > 0) {
        // Update granular consents
        for (const purpose of applicablePurposes) {
          const granularConsent = record.granularConsents.find(gc => gc.purpose === purpose);
          if (granularConsent) {
            granularConsent.granted = false;
            granularConsent.withdrawnAt = new Date();
          }
        }
        
        // Check if all consents are withdrawn
        const allWithdrawn = record.granularConsents.every(gc => !gc.granted);
        if (allWithdrawn) {
          record.granted = false;
          record.withdrawnAt = new Date();
        }
        
        // Add to history
        record.consentHistory.push({
          id: this.generateHistoryId(),
          timestamp: new Date(),
          action: 'withdrawn',
          purposes: applicablePurposes,
          method: withdrawalMethod
        });
        
        withdrawalCount++;
      }
    }
    
    if (withdrawalCount > 0) {
      // Emit event
      this.eventEmitter.emit('consent:withdrawn', { 
        dataSubjectId, 
        purposes: purposes || [], 
        withdrawalCount 
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Create retention policy
   */
  public async createRetentionPolicy(policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'lastUpdated'>): Promise<string> {
    const policyId = this.generatePolicyId();
    
    const retentionPolicy: RetentionPolicy = {
      ...policy,
      id: policyId,
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    
    this.retentionPolicies.set(policyId, retentionPolicy);
    
    // Emit event
    this.eventEmitter.emit('retention_policy:created', { policyId, policy: retentionPolicy });
    
    return policyId;
  }

  /**
   * Execute retention policies (automatic deletion)
   */
  public async executeRetentionPolicies(): Promise<{
    policiesExecuted: number;
    dataDeleted: number;
    dataArchived: number;
    errors: string[];
  }> {
    const results = {
      policiesExecuted: 0,
      dataDeleted: 0,
      dataArchived: 0,
      errors: []
    };
    
    for (const policy of this.retentionPolicies.values()) {
      if (!policy.automaticDeletion) continue;
      
      try {
        // Find data subject to retention policy
        const dataToProcess = await this.findDataForRetentionPolicy(policy);
        
        for (const dataItem of dataToProcess) {
          if (this.isRetentionPeriodExpired(dataItem, policy)) {
            // Check for legal holds
            if (this.hasActiveLegalHold(dataItem, policy)) {
              continue;
            }
            
            switch (policy.deletionMethod) {
              case 'hard_delete':
                await this.performHardDeletion(dataItem);
                results.dataDeleted++;
                break;
              case 'soft_delete':
                await this.performSoftDeletion(dataItem);
                results.dataDeleted++;
                break;
              case 'anonymization':
                await this.performAnonymization(dataItem);
                results.dataDeleted++;
                break;
              case 'archival':
                await this.performArchival(dataItem);
                results.dataArchived++;
                break;
            }
          }
        }
        
        results.policiesExecuted++;
        
      } catch (error) {
        results.errors.push(`Policy ${policy.id}: ${error.message}`);
      }
    }
    
    // Emit event
    this.eventEmitter.emit('retention_policies:executed', { results });
    
    return results;
  }

  /**
   * Report a data breach (Article 33)
   */
  public async reportDataBreach(
    description: string,
    affectedDataTypes: DataCategory[],
    affectedDataSubjects: number,
    potentialConsequences: string[],
    containmentActions: string[]
  ): Promise<string> {
    const breachId = this.generateBreachId();
    
    const breach: DataBreachRecord = {
      id: breachId,
      severity: this.calculateBreachSeverity(affectedDataSubjects, affectedDataTypes),
      discoveredAt: new Date(),
      occurredAt: new Date(), // Would be provided by caller in real implementation
      description,
      affectedDataTypes,
      affectedDataSubjects,
      potentialConsequences,
      riskToRightsAndFreedoms: this.assessRiskToRightsAndFreedoms(affectedDataTypes, affectedDataSubjects),
      containmentActions,
      mitigationActions: [],
      recoveryActions: [],
      supervisoryAuthorityNotified: false,
      dataSubjectsNotified: false,
      rootCause: 'Under investigation',
      lessonsLearned: [],
      preventiveMeasures: [],
      status: 'open',
      assignedTo: 'incident-response-team',
      attachments: [],
      legalAdviceObtained: false,
      insuranceClaimed: false
    };
    
    this.breachRecords.set(breachId, breach);
    
    // Check if supervisory authority notification is required
    if (this.requiresSupervisoryAuthorityNotification(breach)) {
      await this.scheduleAuthorityNotification(breach);
    }
    
    // Check if data subject notification is required
    if (this.requiresDataSubjectNotification(breach)) {
      await this.scheduleDataSubjectNotification(breach);
    }
    
    // Emit event
    this.eventEmitter.emit('data_breach:reported', { breachId, breach });
    
    return breachId;
  }

  /**
   * Get compliance dashboard metrics
   */
  public getComplianceMetrics(): {
    totalProcessingRecords: number;
    pendingRequests: number;
    overdue: number;
    averageResponseTime: number; // days
    consentRecords: number;
    activeConsents: number;
    withdrawnConsents: number;
    retentionPolicies: number;
    dataBreaches: number;
    openBreaches: number;
    complianceScore: number; // 0-100
  } {
    const requests = Array.from(this.dataSubjectRequests.values());
    const consents = Array.from(this.consentRecords.values());
    const breaches = Array.from(this.breachRecords.values());
    
    const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING || r.status === RequestStatus.IN_PROGRESS);
    const overdue = requests.filter(r => r.responseDeadline < new Date() && r.status !== RequestStatus.COMPLETED);
    const completedRequests = requests.filter(r => r.status === RequestStatus.COMPLETED);
    
    const averageResponseTime = completedRequests.length > 0
      ? completedRequests.reduce((sum, r) => {
          const responseTime = r.completedAt!.getTime() - r.receivedAt.getTime();
          return sum + (responseTime / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0) / completedRequests.length
      : 0;
    
    const activeConsents = consents.filter(c => c.granted && (!c.expiresAt || c.expiresAt > new Date()));
    const withdrawnConsents = consents.filter(c => !c.granted);
    const openBreaches = breaches.filter(b => b.status === 'open' || b.status === 'investigating');
    
    // Calculate compliance score based on various factors
    const complianceScore = this.calculateComplianceScore({
      overdueRequests: overdue.length,
      totalRequests: requests.length,
      averageResponseTime,
      openBreaches: openBreaches.length,
      hasRetentionPolicies: this.retentionPolicies.size > 0,
      hasProcessingRecords: this.processingRecords.size > 0
    });
    
    return {
      totalProcessingRecords: this.processingRecords.size,
      pendingRequests: pendingRequests.length,
      overdue: overdue.length,
      averageResponseTime,
      consentRecords: consents.length,
      activeConsents: activeConsents.length,
      withdrawnConsents: withdrawnConsents.length,
      retentionPolicies: this.retentionPolicies.size,
      dataBreaches: breaches.length,
      openBreaches: openBreaches.length,
      complianceScore
    };
  }

  // Private helper methods

  private startAutomaticDeletionProcess(): void {
    // Run retention policy execution every day
    setInterval(async () => {
      try {
        await this.executeRetentionPolicies();
      } catch (error) {
        console.error('Error executing retention policies:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  private generateRecordId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBreachId(): string {
    return `breach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateNoteId(): string {
    return `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateHistoryId(): string {
    return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initiateIdentityVerification(request: DataSubjectRequest): Promise<void> {
    // Mock identity verification process
    console.log(`Initiating identity verification for request ${request.id}`);
    // In real implementation, would send verification email or other method
  }

  private async sendRequestNotification(request: DataSubjectRequest): Promise<void> {
    console.log(`Sending notification for request ${request.id}`);
    // In real implementation, would send email/notification
  }

  private async discoverPersonalData(dataSubjectId: string): Promise<Record<string, any>> {
    // Mock data discovery across configured data sources
    console.log(`Discovering personal data for subject ${dataSubjectId}`);
    return {
      profile: { name: 'Mock User', email: 'user@example.com' },
      activity: { lastLogin: new Date(), preferences: {} }
    };
  }

  private isDataSubjectAffected(record: ProcessingRecord, dataSubjectId: string): boolean {
    // Mock implementation - would check if processing record affects the data subject
    return true;
  }

  private getRetentionPeriodForDataSubject(dataSubjectId: string): string {
    // Mock implementation - would calculate based on retention policies
    return this.config.defaultRetentionPeriod;
  }

  private async verifyErasureGrounds(dataSubjectId: string): Promise<{
    canErase: boolean;
    reasons: string[];
    retainedData: string[];
  }> {
    // Mock verification of erasure grounds under Article 17
    return {
      canErase: true,
      reasons: [],
      retainedData: []
    };
  }

  private async discoverDataForErasure(dataSubjectId: string): Promise<{
    erasableData: string[];
    retainedData: string[];
    retentionReasons: string[];
  }> {
    // Mock data discovery for erasure
    return {
      erasableData: ['profile_data', 'activity_logs'],
      retainedData: ['transaction_records'],
      retentionReasons: ['Legal obligation for financial records']
    };
  }

  private async performDataErasure(dataItems: string[]): Promise<{
    successful: string[];
    failed: string[];
  }> {
    // Mock data erasure process
    console.log(`Erasing data items: ${dataItems.join(', ')}`);
    return {
      successful: dataItems,
      failed: []
    };
  }

  private async logDataErasure(dataSubjectId: string, result: any): Promise<void> {
    console.log(`Logged data erasure for ${dataSubjectId}:`, result);
  }

  private async findDataForRetentionPolicy(policy: RetentionPolicy): Promise<any[]> {
    // Mock finding data subject to retention policy
    console.log(`Finding data for retention policy ${policy.id}`);
    return [];
  }

  private isRetentionPeriodExpired(dataItem: any, policy: RetentionPolicy): boolean {
    // Mock retention period check
    return false;
  }

  private hasActiveLegalHold(dataItem: any, policy: RetentionPolicy): boolean {
    // Mock legal hold check
    return false;
  }

  private async performHardDeletion(dataItem: any): Promise<void> {
    console.log('Performing hard deletion:', dataItem);
  }

  private async performSoftDeletion(dataItem: any): Promise<void> {
    console.log('Performing soft deletion:', dataItem);
  }

  private async performAnonymization(dataItem: any): Promise<void> {
    console.log('Performing anonymization:', dataItem);
  }

  private async performArchival(dataItem: any): Promise<void> {
    console.log('Performing archival:', dataItem);
  }

  private calculateBreachSeverity(affectedSubjects: number, dataTypes: DataCategory[]): 'low' | 'medium' | 'high' | 'critical' {
    if (affectedSubjects > 10000 || dataTypes.includes(DataCategory.SPECIAL_CATEGORY)) {
      return 'critical';
    } else if (affectedSubjects > 1000) {
      return 'high';
    } else if (affectedSubjects > 100) {
      return 'medium';
    }
    return 'low';
  }

  private assessRiskToRightsAndFreedoms(dataTypes: DataCategory[], affectedSubjects: number): 'low' | 'medium' | 'high' {
    if (dataTypes.includes(DataCategory.SPECIAL_CATEGORY) || affectedSubjects > 1000) {
      return 'high';
    } else if (affectedSubjects > 100) {
      return 'medium';
    }
    return 'low';
  }

  private requiresSupervisoryAuthorityNotification(breach: DataBreachRecord): boolean {
    return breach.riskToRightsAndFreedoms !== 'low';
  }

  private requiresDataSubjectNotification(breach: DataBreachRecord): boolean {
    return breach.riskToRightsAndFreedoms === 'high';
  }

  private async scheduleAuthorityNotification(breach: DataBreachRecord): Promise<void> {
    console.log(`Scheduling supervisory authority notification for breach ${breach.id}`);
    // Would implement actual notification scheduling
  }

  private async scheduleDataSubjectNotification(breach: DataBreachRecord): Promise<void> {
    console.log(`Scheduling data subject notification for breach ${breach.id}`);
    // Would implement actual notification scheduling
  }

  private calculateComplianceScore(metrics: {
    overdueRequests: number;
    totalRequests: number;
    averageResponseTime: number;
    openBreaches: number;
    hasRetentionPolicies: boolean;
    hasProcessingRecords: boolean;
  }): number {
    let score = 100;
    
    // Deduct for overdue requests
    if (metrics.totalRequests > 0) {
      const overduePercentage = metrics.overdueRequests / metrics.totalRequests;
      score -= overduePercentage * 30;
    }
    
    // Deduct for slow response times
    if (metrics.averageResponseTime > this.config.requestResponseTimeLimit) {
      score -= 20;
    }
    
    // Deduct for open breaches
    score -= metrics.openBreaches * 10;
    
    // Deduct for missing policies
    if (!metrics.hasRetentionPolicies) score -= 10;
    if (!metrics.hasProcessingRecords) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private generateConfigFile(): string {
    return `// GDPR Compliance Configuration
export const gdprConfig = ${JSON.stringify(this.config, null, 2)};

export type GDPRConfig = typeof gdprConfig;
`;
  }

  private generateGDPRService(): string {
    return `// GDPR Compliance Service Implementation
import { GDPRComplianceModule } from './gdpr-compliance-module';

export class GDPRService {
  private module: GDPRComplianceModule;

  constructor(config: GDPRConfig) {
    this.module = new GDPRComplianceModule(config);
  }

  // Service methods here
}
`;
  }

  private generateRequestHandler(): string {
    return `// Data Subject Request Handler
export class DataSubjectRequestHandler {
  // Request processing methods
}
`;
  }

  private generateConsentManager(): string {
    return `// Consent Management
export class ConsentManager {
  // Consent handling methods
}
`;
  }

  private generateRetentionManager(): string {
    return `// Data Retention Manager
export class DataRetentionManager {
  // Retention policy methods
}
`;
  }

  private generatePrivacyImpactAssessment(): string {
    return `// Privacy Impact Assessment
export class PrivacyImpactAssessment {
  // DPIA methods
}
`;
  }

  private generateNextJSFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/hooks/useGDPR.ts',
        content: `// Next.js GDPR Hook
import { useCallback } from 'react';

export function useGDPR() {
  // Next.js specific implementation
}
`,
        type: 'typescript'
      }
    ];
  }

  private generateTauriFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/lib/gdpr/tauri-adapter.ts',
        content: `// Tauri GDPR Adapter
export class TauriGDPRAdapter {
  // Tauri specific implementation
}
`,
        type: 'typescript'
      }
    ];
  }

  private generateSvelteKitFiles(): DNAModuleFile[] {
    return [
      {
        path: 'src/lib/stores/gdpr.ts',
        content: `// SvelteKit GDPR Store
import { writable } from 'svelte/store';

export const gdprStore = writable({});
`,
        type: 'typescript'
      }
    ];
  }

  private generateTestFile(): string {
    return `// GDPR Compliance Module Tests
import { GDPRComplianceModule } from '../gdpr-compliance-module';

describe('GDPRComplianceModule', () => {
  // Test cases for GDPR compliance features
});
`;
  }

  private generateDocumentation(): string {
    return `# GDPR Compliance Module

## Overview
Comprehensive GDPR compliance with data retention, deletion, and privacy rights management.

## Features
- Article 30 Processing Records
- Data Subject Rights (Access, Erasure, Portability, etc.)
- Consent Management (Article 7)
- Data Retention and Deletion
- Privacy Impact Assessments (DPIA)
- Data Breach Management (Article 33)
- Compliance Dashboard and Metrics

## Usage
\`\`\`typescript
const gdpr = new GDPRComplianceModule(config);
const requestId = await gdpr.submitDataSubjectRequest('erasure', 'user123', 'user@example.com', 'Please delete my data');
await gdpr.processErasureRequest(requestId);
\`\`\`
`;
  }
}