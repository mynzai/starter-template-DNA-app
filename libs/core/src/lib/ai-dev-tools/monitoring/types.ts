/**
 * @fileoverview Performance Monitoring Types
 * Type definitions for AC5: Build Performance Monitoring with cost tracking
 */

export interface DevToolsMetrics {
  timestamp: number;
  sessionId: string;
  operationType: OperationType;
  duration: number;
  resourceUsage: ResourceUsage;
  costs: CostBreakdown;
  performance: PerformanceMetrics;
  quality: QualityMetrics;
  errors: ErrorMetrics;
  metadata: MetricsMetadata;
}

export type OperationType = 
  | 'code_generation'
  | 'test_generation'
  | 'documentation_generation'
  | 'git_integration'
  | 'code_review'
  | 'ai_request'
  | 'template_processing'
  | 'validation'
  | 'optimization'
  | 'asset_generation';

export interface ResourceUsage {
  cpu: CPUUsage;
  memory: MemoryUsage;
  network: NetworkUsage;
  storage: StorageUsage;
  ai: AIResourceUsage;
}

export interface CPUUsage {
  utilization: number; // Percentage 0-100
  cores: number;
  averageLoad: number;
  peakLoad: number;
  duration: number;
  processes: ProcessUsage[];
}

export interface ProcessUsage {
  pid: number;
  name: string;
  cpuPercent: number;
  memoryMB: number;
  startTime: number;
  endTime?: number;
}

export interface MemoryUsage {
  totalMB: number;
  usedMB: number;
  availableMB: number;
  peakUsageMB: number;
  heapUsedMB: number;
  heapTotalMB: number;
  external: number;
  buffers: number;
  cached: number;
}

export interface NetworkUsage {
  bytesUploaded: number;
  bytesDownloaded: number;
  requestCount: number;
  responseCount: number;
  averageLatency: number;
  peakLatency: number;
  errorRate: number;
  endpoints: EndpointUsage[];
}

export interface EndpointUsage {
  url: string;
  method: string;
  requestCount: number;
  totalBytes: number;
  averageLatency: number;
  errorCount: number;
  statusCodes: Record<number, number>;
}

export interface StorageUsage {
  diskSpaceUsed: number;
  diskSpaceAvailable: number;
  filesCreated: number;
  filesModified: number;
  filesDeleted: number;
  temporaryFiles: number;
  cacheSize: number;
  operations: StorageOperation[];
}

export interface StorageOperation {
  type: 'read' | 'write' | 'delete' | 'create';
  path: string;
  size: number;
  duration: number;
  timestamp: number;
}

export interface AIResourceUsage {
  tokenUsage: TokenUsage;
  requestCount: number;
  averageResponseTime: number;
  peakResponseTime: number;
  providers: ProviderUsage[];
  modelUsage: ModelUsage[];
  streamingUsage?: StreamingUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  tokenRate: number; // tokens per second
}

export interface ProviderUsage {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  requestCount: number;
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorCount: number;
  uptime: number;
}

export interface ModelUsage {
  model: string;
  provider: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalCost: number;
  averageLatency: number;
  successRate: number;
}

export interface StreamingUsage {
  streamCount: number;
  averageStreamDuration: number;
  totalBytesStreamed: number;
  averageChunkSize: number;
  reconnectionCount: number;
}

export interface CostBreakdown {
  totalCost: number;
  currency: string;
  aiProviderCosts: ProviderCost[];
  computeCosts: ComputeCost;
  storageCosts: StorageCost;
  networkCosts: NetworkCost;
  breakdown: CostCategory[];
  billing: BillingInfo;
}

export interface ProviderCost {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  cost: number;
  requestCount: number;
  costPerToken: number;
  costPerRequest: number;
}

export interface ComputeCost {
  cpuHours: number;
  costPerHour: number;
  totalCost: number;
  instanceType?: string;
  region?: string;
}

export interface StorageCost {
  gigabytesUsed: number;
  costPerGB: number;
  totalCost: number;
  transferCost: number;
  operationCost: number;
}

export interface NetworkCost {
  bytesTransferred: number;
  costPerGB: number;
  totalCost: number;
  regionTransfers: RegionTransfer[];
}

export interface RegionTransfer {
  fromRegion: string;
  toRegion: string;
  bytes: number;
  cost: number;
}

export interface CostCategory {
  category: 'ai' | 'compute' | 'storage' | 'network' | 'other';
  amount: number;
  percentage: number;
  details: Record<string, number>;
}

export interface BillingInfo {
  accountId?: string;
  billingPeriod: string;
  currentSpend: number;
  budgetLimit?: number;
  alertThresholds: number[];
  paymentMethod?: string;
}

export interface PerformanceMetrics {
  overall: PerformanceScore;
  operations: OperationPerformance[];
  bottlenecks: PerformanceBottleneck[];
  trends: PerformanceTrend[];
  benchmarks: BenchmarkResult[];
}

export interface PerformanceScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: PerformanceFactor[];
  recommendations: string[];
}

export interface PerformanceFactor {
  name: string;
  score: number;
  weight: number;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface OperationPerformance {
  operationType: OperationType;
  count: number;
  averageDuration: number;
  medianDuration: number;
  percentile95: number;
  percentile99: number;
  throughput: number; // operations per second
  successRate: number;
  errorRate: number;
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'network' | 'storage' | 'ai_api' | 'database';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  location: string;
  recommendation: string;
  estimatedImprovement: number; // percentage
}

export interface PerformanceTrend {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  changePercent: number;
  timeframe: string;
  dataPoints: DataPoint[];
  prediction?: TrendPrediction;
}

export interface DataPoint {
  timestamp: number;
  value: number;
  context?: Record<string, any>;
}

export interface TrendPrediction {
  nextValue: number;
  confidence: number;
  timeframe: string;
  factors: string[];
}

export interface BenchmarkResult {
  name: string;
  category: string;
  value: number;
  unit: string;
  baseline: number;
  target: number;
  status: 'passed' | 'failed' | 'warning';
  percentile: number;
}

export interface QualityMetrics {
  overall: QualityScore;
  codeQuality: CodeQualityMetrics;
  testQuality: TestQualityMetrics;
  documentationQuality: DocumentationQualityMetrics;
  userExperience: UserExperienceMetrics;
}

export interface QualityScore {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: QualityFactor[];
  improvements: QualityImprovement[];
}

export interface QualityFactor {
  name: string;
  score: number;
  weight: number;
  category: string;
  description: string;
  measuredValue: number;
  targetValue: number;
}

export interface QualityImprovement {
  area: string;
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: 'high' | 'medium' | 'low';
  description: string;
  action: string;
}

export interface CodeQualityMetrics {
  complexity: number;
  maintainability: number;
  testCoverage: number;
  duplication: number;
  documentation: number;
  standards: number;
  security: number;
  issues: CodeQualityIssue[];
}

export interface CodeQualityIssue {
  type: 'bug' | 'vulnerability' | 'code_smell' | 'duplication' | 'complexity';
  severity: 'critical' | 'major' | 'minor' | 'info';
  file: string;
  line: number;
  rule: string;
  message: string;
  effort: string; // estimated time to fix
}

export interface TestQualityMetrics {
  coverage: TestCoverageMetrics;
  reliability: number;
  performance: number;
  maintainability: number;
  automation: number;
}

export interface TestCoverageMetrics {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
  files: FileCoverage[];
  uncoveredLines: UncoveredLine[];
}

export interface FileCoverage {
  file: string;
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface UncoveredLine {
  file: string;
  line: number;
  type: 'statement' | 'branch' | 'function';
  reason?: string;
}

export interface DocumentationQualityMetrics {
  completeness: number;
  accuracy: number;
  clarity: number;
  consistency: number;
  accessibility: number;
  maintenance: number;
}

export interface UserExperienceMetrics {
  usability: number;
  performance: number;
  accessibility: number;
  reliability: number;
  satisfaction: number;
  adoption: number;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorRate: number;
  errorsByType: ErrorTypeMetrics[];
  errorsBySource: ErrorSourceMetrics[];
  resolution: ErrorResolutionMetrics;
  impact: ErrorImpactMetrics;
}

export interface ErrorTypeMetrics {
  type: 'syntax' | 'runtime' | 'logic' | 'network' | 'api' | 'validation' | 'system';
  count: number;
  percentage: number;
  averageResolutionTime: number;
  severity: ErrorSeverityDistribution;
}

export interface ErrorSeverityDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ErrorSourceMetrics {
  source: string;
  count: number;
  percentage: number;
  topErrors: TopError[];
}

export interface TopError {
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  locations: ErrorLocation[];
}

export interface ErrorLocation {
  file: string;
  line: number;
  function?: string;
  count: number;
}

export interface ErrorResolutionMetrics {
  averageResolutionTime: number;
  medianResolutionTime: number;
  resolutionRate: number;
  escalationRate: number;
  reopenRate: number;
}

export interface ErrorImpactMetrics {
  userImpact: number;
  systemImpact: number;
  businessImpact: number;
  costImpact: number;
  downtime: number;
}

export interface MetricsMetadata {
  version: string;
  environment: 'development' | 'staging' | 'production';
  region: string;
  userId?: string;
  sessionId: string;
  projectId?: string;
  branchName?: string;
  commitHash?: string;
  buildNumber?: string;
  deployment?: DeploymentInfo;
  tags: Record<string, string>;
}

export interface DeploymentInfo {
  id: string;
  version: string;
  timestamp: number;
  environment: string;
  status: 'pending' | 'active' | 'failed' | 'rolled_back';
}

export interface CostTrackingData {
  accountId: string;
  billingPeriod: BillingPeriod;
  totalCost: number;
  currency: string;
  budgets: Budget[];
  alerts: CostAlert[];
  forecasts: CostForecast[];
  recommendations: CostOptimizationRecommendation[];
  usage: UsageBreakdown;
  trends: CostTrend[];
}

export interface BillingPeriod {
  start: number;
  end: number;
  current: boolean;
  daysRemaining: number;
}

export interface Budget {
  id: string;
  name: string;
  amount: number;
  spent: number;
  percentage: number;
  status: 'under' | 'approaching' | 'over' | 'exceeded';
  alertThresholds: number[];
  scope: BudgetScope;
}

export interface BudgetScope {
  services: string[];
  projects: string[];
  environments: string[];
  timeframe: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

export interface CostAlert {
  id: string;
  type: 'budget_exceeded' | 'cost_spike' | 'unusual_usage' | 'forecast_exceeded';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: number;
  acknowledged: boolean;
  actionRequired: boolean;
  recommendations: string[];
}

export interface CostForecast {
  period: 'week' | 'month' | 'quarter' | 'year';
  estimatedCost: number;
  confidence: number;
  factors: ForecastFactor[];
  trend: 'increasing' | 'decreasing' | 'stable';
  scenarios: ForecastScenario[];
}

export interface ForecastFactor {
  name: string;
  impact: number;
  confidence: number;
  description: string;
}

export interface ForecastScenario {
  name: 'optimistic' | 'realistic' | 'pessimistic';
  estimatedCost: number;
  probability: number;
  assumptions: string[];
}

export interface UsageBreakdown {
  byService: ServiceUsage[];
  byProject: ProjectUsage[];
  byEnvironment: EnvironmentUsage[];
  byUser: UserUsage[];
  byTime: TimeUsage[];
}

export interface ServiceUsage {
  service: string;
  cost: number;
  usage: Record<string, number>;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ProjectUsage {
  projectId: string;
  projectName: string;
  cost: number;
  percentage: number;
  services: ServiceUsage[];
}

export interface EnvironmentUsage {
  environment: string;
  cost: number;
  percentage: number;
  resources: ResourceCost[];
}

export interface ResourceCost {
  resource: string;
  cost: number;
  units: number;
  unitCost: number;
}

export interface UserUsage {
  userId: string;
  userName?: string;
  cost: number;
  operations: number;
  topServices: string[];
}

export interface TimeUsage {
  timestamp: number;
  cost: number;
  operations: number;
  breakdown: Record<string, number>;
}

export interface CostTrend {
  metric: 'total_cost' | 'ai_cost' | 'compute_cost' | 'storage_cost' | 'network_cost';
  timeframe: 'hourly' | 'daily' | 'weekly' | 'monthly';
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  dataPoints: CostDataPoint[];
}

export interface CostDataPoint {
  timestamp: number;
  cost: number;
  volume: number;
  context: Record<string, any>;
}

export interface CostOptimizationRecommendation {
  id: string;
  type: 'right_sizing' | 'unused_resources' | 'reserved_instances' | 'provider_switch' | 'optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  implementation: string;
  risks: string[];
  requirements: string[];
  roi: number; // return on investment in months
}

export interface OptimizationRecommendation {
  id: string;
  category: 'performance' | 'cost' | 'quality' | 'security' | 'maintainability';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: OptimizationImpact;
  effort: OptimizationEffort;
  implementation: ImplementationGuide;
  metrics: OptimizationMetrics;
  dependencies: string[];
  risks: Risk[];
  timeline: Timeline;
}

export interface OptimizationImpact {
  performance: number; // percentage improvement
  cost: number; // cost reduction
  quality: number; // quality improvement
  userExperience: number; // UX improvement
  maintainability: number; // maintainability improvement
  description: string;
}

export interface OptimizationEffort {
  level: 'trivial' | 'low' | 'medium' | 'high' | 'complex';
  estimatedHours: number;
  requiredSkills: string[];
  resources: string[];
  complexity: number; // 1-10 scale
}

export interface ImplementationGuide {
  steps: ImplementationStep[];
  prerequisites: string[];
  tools: string[];
  documentation: string[];
  testPlan: string[];
  rollbackPlan: string[];
}

export interface ImplementationStep {
  order: number;
  title: string;
  description: string;
  estimatedTime: number;
  resources: string[];
  validation: string[];
  risks: string[];
}

export interface OptimizationMetrics {
  baseline: Record<string, number>;
  target: Record<string, number>;
  tracking: string[];
  success: SuccessCriteria[];
}

export interface SuccessCriteria {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  unit: string;
  timeframe: string;
}

export interface Risk {
  type: 'technical' | 'business' | 'operational' | 'security' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  description: string;
  mitigation: string;
  contingency: string;
}

export interface Timeline {
  phases: TimelinePhase[];
  totalDuration: number;
  milestones: Milestone[];
  dependencies: Dependency[];
}

export interface TimelinePhase {
  name: string;
  duration: number;
  parallel: boolean;
  deliverables: string[];
  resources: string[];
}

export interface Milestone {
  name: string;
  date: number;
  criteria: string[];
  importance: 'critical' | 'important' | 'nice-to-have';
}

export interface Dependency {
  type: 'blocks' | 'enables' | 'requires';
  source: string;
  target: string;
  description: string;
  critical: boolean;
}

export interface PerformanceAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  source: AlertSource;
  metrics: AlertMetrics;
  context: AlertContext;
  actions: AlertAction[];
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  resolution?: AlertResolution;
}

export type AlertType = 
  | 'high_latency'
  | 'error_rate_spike'
  | 'cost_threshold_exceeded'
  | 'resource_exhaustion'
  | 'performance_degradation'
  | 'quality_regression'
  | 'security_issue'
  | 'availability_issue'
  | 'capacity_limit'
  | 'anomaly_detected';

export interface AlertSource {
  service: string;
  component: string;
  environment: string;
  region?: string;
  host?: string;
  process?: string;
}

export interface AlertMetrics {
  current: Record<string, number>;
  threshold: Record<string, number>;
  baseline: Record<string, number>;
  trend: Record<string, 'up' | 'down' | 'stable'>;
}

export interface AlertContext {
  operation?: OperationType;
  user?: string;
  session?: string;
  request?: string;
  deployment?: string;
  experiment?: string;
  tags: Record<string, string>;
}

export interface AlertAction {
  type: 'investigate' | 'escalate' | 'autofix' | 'notify' | 'scale' | 'rollback';
  description: string;
  automated: boolean;
  priority: number;
  conditions: string[];
  script?: string;
}

export interface AlertResolution {
  timestamp: number;
  action: string;
  result: 'fixed' | 'mitigated' | 'false_positive' | 'ignored';
  details: string;
  preventionPlan?: string;
}

export interface MonitoringConfig {
  enabled: boolean;
  samplingRate: number; // 0-1, percentage of operations to monitor
  realTimeMonitoring: boolean;
  batchSize: number;
  flushInterval: number; // milliseconds
  retention: RetentionPolicy;
  alerting: AlertingConfig;
  integrations: IntegrationConfig[];
  privacy: PrivacyConfig;
}

export interface RetentionPolicy {
  rawMetrics: number; // days
  aggregatedMetrics: number; // days
  alerts: number; // days
  logs: number; // days
  traces: number; // days
}

export interface AlertingConfig {
  enabled: boolean;
  channels: NotificationChannel[];
  rules: AlertRule[];
  escalation: EscalationPolicy[];
  suppressions: SuppressionRule[];
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push';
  config: Record<string, any>;
  enabled: boolean;
  severityFilter: string[];
}

export interface AlertRule {
  name: string;
  condition: string;
  threshold: number;
  timeWindow: number; // minutes
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  channels: string[];
}

export interface EscalationPolicy {
  name: string;
  levels: EscalationLevel[];
  timeout: number; // minutes before escalation
}

export interface EscalationLevel {
  level: number;
  channels: string[];
  assignees: string[];
  actions: string[];
}

export interface SuppressionRule {
  name: string;
  condition: string;
  duration: number; // minutes
  enabled: boolean;
  reason: string;
}

export interface IntegrationConfig {
  type: 'datadog' | 'newrelic' | 'grafana' | 'prometheus' | 'elasticsearch' | 'splunk';
  config: Record<string, any>;
  enabled: boolean;
  metrics: string[];
}

export interface PrivacyConfig {
  anonymizeUserData: boolean;
  excludeFields: string[];
  dataResidency: string;
  retentionCompliance: string[];
  encryptionEnabled: boolean;
}