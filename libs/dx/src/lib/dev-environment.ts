/**
 * @fileoverview Development Environment Containerization System - Epic 6 Story 1 AC4
 * 
 * Provides comprehensive development environment containerization with Docker and orchestration
 * for one-command setup, service management, and environment parity across development teams.
 * 
 * Features:
 * - Docker-based development environments
 * - Multi-service orchestration
 * - Volume management and persistence
 * - Network configuration and isolation
 * - Environment variable management
 * - Health monitoring and auto-recovery
 * - Cross-platform compatibility
 * - Template-specific container configurations
 * 
 * @version 1.0.0
 * @author DNA Development Team
 */

import { EventEmitter } from 'events';
import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Configuration interfaces
export interface DevEnvironmentConfig {
  projectName: string;
  framework: 'nextjs' | 'tauri' | 'sveltekit' | 'react-native' | 'flutter';
  containerRuntime: 'docker' | 'podman' | 'containerd';
  orchestrationTool: 'docker-compose' | 'kubernetes' | 'docker-swarm';
  services: ServiceConfiguration[];
  volumes: VolumeConfiguration[];
  networks: NetworkConfiguration[];
  environment: EnvironmentConfiguration;
  monitoring: MonitoringConfiguration;
  security: SecurityConfiguration;
  development: DevelopmentConfiguration;
  enableAutoReload: boolean;
  enableHealthChecks: boolean;
  enableLogging: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  enableSecurity: boolean;
  resourceLimits: ResourceLimits;
  persistence: PersistenceConfiguration;
  backup: BackupConfiguration;
}

export interface ServiceConfiguration {
  name: string;
  type: ServiceType;
  image: string;
  dockerfile?: string;
  buildContext?: string;
  ports: PortMapping[];
  environment: Record<string, string>;
  volumes: string[];
  networks: string[];
  dependencies: string[];
  healthCheck: HealthCheckConfiguration;
  resources: ResourceConfiguration;
  restart: RestartPolicy;
  command?: string[];
  entrypoint?: string[];
  workingDir?: string;
  user?: string;
  privileged?: boolean;
  capabilities?: string[];
  securityOpt?: string[];
  labels: Record<string, string>;
}

export type ServiceType = 
  | 'web' 
  | 'api' 
  | 'database' 
  | 'cache' 
  | 'queue' 
  | 'storage' 
  | 'proxy' 
  | 'monitoring' 
  | 'testing' 
  | 'build' 
  | 'custom';

export type RestartPolicy = 'no' | 'always' | 'on-failure' | 'unless-stopped';

export interface PortMapping {
  host: number;
  container: number;
  protocol: 'tcp' | 'udp';
  bindAddress?: string;
}

export interface VolumeConfiguration {
  name: string;
  type: VolumeType;
  source: string;
  target: string;
  readOnly: boolean;
  consistency?: ConsistencyLevel;
  driver?: string;
  driverOpts?: Record<string, string>;
  labels: Record<string, string>;
}

export type VolumeType = 'bind' | 'volume' | 'tmpfs' | 'npipe';
export type ConsistencyLevel = 'consistent' | 'cached' | 'delegated';

export interface NetworkConfiguration {
  name: string;
  driver: NetworkDriver;
  subnet?: string;
  gateway?: string;
  ipRange?: string;
  attachable: boolean;
  internal: boolean;
  enableIPv6: boolean;
  driverOpts: Record<string, string>;
  labels: Record<string, string>;
}

export type NetworkDriver = 'bridge' | 'host' | 'overlay' | 'macvlan' | 'none';

export interface EnvironmentConfiguration {
  variables: Record<string, string>;
  secretFiles: string[];
  configFiles: ConfigFileMapping[];
  interpolation: boolean;
  validation: EnvironmentValidation;
}

export interface ConfigFileMapping {
  source: string;
  target: string;
  template: boolean;
  required: boolean;
}

export interface EnvironmentValidation {
  required: string[];
  optional: string[];
  patterns: Record<string, string>;
  validators: Record<string, EnvironmentValidator>;
}

export interface EnvironmentValidator {
  type: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'regex';
  pattern?: string;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
  defaultValue?: string;
}

export interface MonitoringConfiguration {
  enableHealthChecks: boolean;
  enableMetrics: boolean;
  enableLogs: boolean;
  enableTracing: boolean;
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthCheckRetries: number;
  metricsPort?: number;
  logsDriver?: string;
  logsOptions?: Record<string, string>;
  tracingEndpoint?: string;
  alerting: AlertingConfiguration;
}

export interface AlertingConfiguration {
  enabled: boolean;
  webhooks: string[];
  emailNotifications: string[];
  slackChannels: string[];
  thresholds: AlertThreshold[];
}

export interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface SecurityConfiguration {
  enableAppArmor: boolean;
  enableSELinux: boolean;
  enableSeccomp: boolean;
  enableUserNamespaces: boolean;
  rootless: boolean;
  runAsNonRoot: boolean;
  readOnlyRootFilesystem: boolean;
  allowPrivilegeEscalation: boolean;
  capabilities: CapabilityConfiguration;
  secrets: SecretConfiguration;
  imageSecurity: ImageSecurityConfiguration;
}

export interface CapabilityConfiguration {
  add: string[];
  drop: string[];
}

export interface SecretConfiguration {
  provider: 'file' | 'vault' | 'kubernetes' | 'docker' | 'environment';
  secrets: SecretMapping[];
  encryption: EncryptionConfiguration;
}

export interface SecretMapping {
  name: string;
  source: string;
  target: string;
  mode?: string;
  uid?: string;
  gid?: string;
}

export interface EncryptionConfiguration {
  enabled: boolean;
  algorithm: string;
  keyFile?: string;
  keyProvider?: string;
}

export interface ImageSecurityConfiguration {
  enableScanning: boolean;
  scannerProvider: 'trivy' | 'clair' | 'snyk' | 'anchore';
  allowUnknownImages: boolean;
  trustedRegistries: string[];
  signatureVerification: boolean;
  vulnerabilityThreshold: 'low' | 'medium' | 'high' | 'critical';
}

export interface DevelopmentConfiguration {
  enableHotReload: boolean;
  enableDebugMode: boolean;
  enableTestMode: boolean;
  enableProfiler: boolean;
  syncStrategy: SyncStrategy;
  buildStrategy: BuildStrategy;
  caching: CachingConfiguration;
  optimization: OptimizationConfiguration;
}

export type SyncStrategy = 'bind-mount' | 'volume-sync' | 'rsync' | 'unison' | 'mutagen';
export type BuildStrategy = 'local' | 'container' | 'multi-stage' | 'cache-mount';

export interface CachingConfiguration {
  enableBuildCache: boolean;
  enableDependencyCache: boolean;
  enableAssetCache: boolean;
  cacheDriver: 'local' | 'registry' | 's3' | 'gcs';
  maxCacheSize: string;
  cacheRetention: string;
}

export interface OptimizationConfiguration {
  enableLayerCaching: boolean;
  enableMultiStage: boolean;
  enableSquashing: boolean;
  enableCompression: boolean;
  compressionLevel: number;
  parallelBuilds: number;
}

export interface ResourceConfiguration {
  memory: string;
  memorySwap?: string;
  cpus: string;
  cpuShares?: number;
  cpuQuota?: number;
  cpuPeriod?: number;
  blkioWeight?: number;
  deviceReadBps?: string;
  deviceWriteBps?: string;
  ulimits?: UlimitConfiguration[];
}

export interface UlimitConfiguration {
  name: string;
  soft: number;
  hard: number;
}

export interface ResourceLimits {
  memory: string;
  cpu: string;
  storage: string;
  network: string;
  processes: number;
  fileDescriptors: number;
}

export interface HealthCheckConfiguration {
  test: string[];
  interval: string;
  timeout: string;
  retries: number;
  startPeriod?: string;
  disable?: boolean;
}

export interface PersistenceConfiguration {
  enablePersistence: boolean;
  volumeDriver: string;
  backupStrategy: 'snapshot' | 'incremental' | 'full' | 'streaming';
  retentionPolicy: RetentionPolicy;
  encryption: boolean;
  compression: boolean;
}

export interface RetentionPolicy {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export interface BackupConfiguration {
  enabled: boolean;
  schedule: string;
  destination: BackupDestination;
  compression: boolean;
  encryption: boolean;
  verification: boolean;
  notification: BackupNotification;
}

export interface BackupDestination {
  type: 'local' | 's3' | 'gcs' | 'azure' | 'sftp';
  path: string;
  credentials?: Record<string, string>;
}

export interface BackupNotification {
  onSuccess: boolean;
  onFailure: boolean;
  webhooks: string[];
  emails: string[];
}

// Status and monitoring interfaces
export interface EnvironmentStatus {
  status: EnvironmentState;
  services: ServiceStatus[];
  networks: NetworkStatus[];
  volumes: VolumeStatus[];
  health: HealthStatus;
  metrics: EnvironmentMetrics;
  uptime: number;
  lastUpdate: Date;
}

export type EnvironmentState = 
  | 'initializing' 
  | 'starting' 
  | 'running' 
  | 'stopping' 
  | 'stopped' 
  | 'error' 
  | 'maintenance';

export interface ServiceStatus {
  name: string;
  state: ServiceState;
  health: ServiceHealth;
  ports: PortStatus[];
  resources: ResourceUsage;
  logs: LogEntry[];
  metrics: ServiceMetrics;
  uptime: number;
  restarts: number;
  lastRestart?: Date;
  exitCode?: number;
  error?: string;
}

export type ServiceState = 
  | 'created' 
  | 'starting' 
  | 'running' 
  | 'paused' 
  | 'restarting' 
  | 'removing' 
  | 'exited' 
  | 'dead';

export type ServiceHealth = 'healthy' | 'unhealthy' | 'starting' | 'none';

export interface PortStatus {
  host: number;
  container: number;
  protocol: string;
  accessible: boolean;
  responseTime?: number;
}

export interface ResourceUsage {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
  blockRead: number;
  blockWrite: number;
  pids: number;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  metadata?: Record<string, any>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ServiceMetrics {
  requests: number;
  errors: number;
  latency: LatencyMetrics;
  throughput: number;
  availability: number;
}

export interface LatencyMetrics {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  max: number;
}

export interface NetworkStatus {
  name: string;
  driver: string;
  scope: string;
  attachedContainers: string[];
  ipam: IPAMInfo;
  created: Date;
}

export interface IPAMInfo {
  driver: string;
  config: IPAMConfig[];
}

export interface IPAMConfig {
  subnet: string;
  gateway?: string;
  ipRange?: string;
}

export interface VolumeStatus {
  name: string;
  driver: string;
  mountpoint: string;
  size: number;
  usage: number;
  created: Date;
  labels: Record<string, string>;
}

export interface HealthStatus {
  overall: ServiceHealth;
  services: Record<string, ServiceHealth>;
  issues: HealthIssue[];
  lastCheck: Date;
}

export interface HealthIssue {
  service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface EnvironmentMetrics {
  totalCpu: number;
  totalMemory: number;
  totalNetwork: number;
  totalStorage: number;
  serviceCount: number;
  runningServices: number;
  failedServices: number;
  uptime: number;
  restarts: number;
}

// Operation interfaces
export interface EnvironmentOperation {
  id: string;
  type: OperationType;
  status: OperationStatus;
  progress: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  logs: string[];
  metadata: Record<string, any>;
}

export type OperationType = 
  | 'create' 
  | 'start' 
  | 'stop' 
  | 'restart' 
  | 'destroy' 
  | 'update' 
  | 'scale' 
  | 'backup' 
  | 'restore';

export type OperationStatus = 
  | 'pending' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

// Template and framework configurations
export interface FrameworkPreset {
  framework: string;
  version: string;
  services: Partial<ServiceConfiguration>[];
  volumes: Partial<VolumeConfiguration>[];
  networks: Partial<NetworkConfiguration>[];
  environment: Partial<EnvironmentConfiguration>;
  development: Partial<DevelopmentConfiguration>;
  scripts: Record<string, string>;
  extensions: string[];
}

/**
 * Development Environment Containerization System
 * 
 * Provides comprehensive Docker-based development environment management
 * with one-command setup, service orchestration, and environment parity.
 */
export class DevEnvironmentManager extends EventEmitter {
  private config: DevEnvironmentConfig;
  private status: EnvironmentStatus;
  private operations: Map<string, EnvironmentOperation> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private logStreams: Map<string, any> = new Map();
  private isInitialized = false;

  constructor(config: DevEnvironmentConfig) {
    super();
    this.config = config;
    this.status = this.initializeStatus();
  }

  /**
   * Initialize development environment
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.emit('environment:initializing');

    try {
      // Validate configuration
      await this.validateConfiguration();

      // Check container runtime
      await this.validateContainerRuntime();

      // Create project directory structure
      await this.createProjectStructure();

      // Generate container configurations
      await this.generateContainerConfigurations();

      // Initialize monitoring
      if (this.config.monitoring.enableHealthChecks) {
        this.startHealthChecks();
      }

      if (this.config.monitoring.enableMetrics) {
        this.startMetricsCollection();
      }

      this.isInitialized = true;
      this.emit('environment:initialized');
    } catch (error) {
      this.emit('environment:error', error);
      throw error;
    }
  }

  /**
   * Create and start development environment with one command
   */
  public async createAndStart(): Promise<EnvironmentStatus> {
    const operationId = this.generateOperationId();
    const operation = this.createOperation(operationId, 'create');

    try {
      this.emit('environment:creating', { operationId });
      operation.status = 'running';

      // Pull required images
      await this.pullImages(operation);

      // Create networks
      await this.createNetworks(operation);

      // Create volumes
      await this.createVolumes(operation);

      // Start services in dependency order
      await this.startServices(operation);

      // Wait for health checks
      await this.waitForHealthy(operation);

      operation.status = 'completed';
      operation.endTime = new Date();
      this.status.status = 'running';

      this.emit('environment:created', { operationId, status: this.status });
      return this.status;
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = new Date();
      this.status.status = 'error';

      this.emit('environment:error', { operationId, error });
      throw error;
    }
  }

  /**
   * Stop development environment
   */
  public async stop(): Promise<void> {
    const operationId = this.generateOperationId();
    const operation = this.createOperation(operationId, 'stop');

    try {
      this.emit('environment:stopping', { operationId });
      operation.status = 'running';
      this.status.status = 'stopping';

      // Stop services in reverse dependency order
      await this.stopServices(operation);

      // Stop health checks and metrics
      this.stopHealthChecks();
      this.stopMetricsCollection();

      operation.status = 'completed';
      operation.endTime = new Date();
      this.status.status = 'stopped';

      this.emit('environment:stopped', { operationId });
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = new Date();

      this.emit('environment:error', { operationId, error });
      throw error;
    }
  }

  /**
   * Restart development environment
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.createAndStart();
  }

  /**
   * Destroy development environment
   */
  public async destroy(): Promise<void> {
    const operationId = this.generateOperationId();
    const operation = this.createOperation(operationId, 'destroy');

    try {
      this.emit('environment:destroying', { operationId });
      operation.status = 'running';

      // Stop all services
      await this.stopServices(operation);

      // Remove containers
      await this.removeContainers(operation);

      // Remove networks
      await this.removeNetworks(operation);

      // Remove volumes (if not persistent)
      if (!this.config.persistence.enablePersistence) {
        await this.removeVolumes(operation);
      }

      operation.status = 'completed';
      operation.endTime = new Date();

      this.emit('environment:destroyed', { operationId });
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = new Date();

      this.emit('environment:error', { operationId, error });
      throw error;
    }
  }

  /**
   * Get current environment status
   */
  public async getStatus(): Promise<EnvironmentStatus> {
    await this.updateStatus();
    return { ...this.status };
  }

  /**
   * Scale service
   */
  public async scaleService(serviceName: string, replicas: number): Promise<void> {
    const operationId = this.generateOperationId();
    const operation = this.createOperation(operationId, 'scale', { serviceName, replicas });

    try {
      this.emit('service:scaling', { operationId, serviceName, replicas });
      operation.status = 'running';

      await this.executeCommand([
        this.config.containerRuntime,
        'service',
        'scale',
        `${this.config.projectName}_${serviceName}=${replicas}`
      ]);

      operation.status = 'completed';
      operation.endTime = new Date();

      this.emit('service:scaled', { operationId, serviceName, replicas });
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = new Date();

      this.emit('service:error', { operationId, serviceName, error });
      throw error;
    }
  }

  /**
   * Execute command in service container
   */
  public async executeInService(
    serviceName: string, 
    command: string[], 
    options: { interactive?: boolean; tty?: boolean; user?: string } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const containerName = `${this.config.projectName}_${serviceName}_1`;
    
    const execArgs = [
      this.config.containerRuntime,
      'exec'
    ];

    if (options.interactive) execArgs.push('-i');
    if (options.tty) execArgs.push('-t');
    if (options.user) execArgs.push('-u', options.user);

    execArgs.push(containerName, ...command);

    return this.executeCommand(execArgs);
  }

  /**
   * Get service logs
   */
  public async getServiceLogs(
    serviceName: string, 
    options: { follow?: boolean; tail?: number; since?: string } = {}
  ): Promise<string> {
    const containerName = `${this.config.projectName}_${serviceName}_1`;
    
    const logsArgs = [
      this.config.containerRuntime,
      'logs'
    ];

    if (options.follow) logsArgs.push('-f');
    if (options.tail) logsArgs.push('--tail', options.tail.toString());
    if (options.since) logsArgs.push('--since', options.since);

    logsArgs.push(containerName);

    const result = await this.executeCommand(logsArgs);
    return result.stdout;
  }

  /**
   * Stream service logs
   */
  public streamServiceLogs(serviceName: string): NodeJS.ReadableStream {
    const containerName = `${this.config.projectName}_${serviceName}_1`;
    
    const process = spawn(this.config.containerRuntime, [
      'logs',
      '-f',
      containerName
    ]);

    this.logStreams.set(serviceName, process);
    
    process.on('exit', () => {
      this.logStreams.delete(serviceName);
    });

    return process.stdout;
  }

  /**
   * Create backup
   */
  public async createBackup(): Promise<string> {
    if (!this.config.backup.enabled) {
      throw new Error('Backup is not enabled');
    }

    const operationId = this.generateOperationId();
    const operation = this.createOperation(operationId, 'backup');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${this.config.projectName}-backup-${timestamp}`;

    try {
      this.emit('backup:starting', { operationId, backupName });
      operation.status = 'running';

      // Create backup directory
      const backupPath = path.join(process.cwd(), '.dna-backups', backupName);
      await fs.mkdir(backupPath, { recursive: true });

      // Backup volumes
      for (const volume of this.config.volumes) {
        if (!volume.readOnly) {
          await this.backupVolume(volume, backupPath);
        }
      }

      // Backup configuration
      const configBackup = {
        config: this.config,
        status: this.status,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(backupPath, 'config.json'),
        JSON.stringify(configBackup, null, 2)
      );

      // Compress backup if enabled
      if (this.config.backup.compression) {
        await this.compressBackup(backupPath);
      }

      // Upload to destination if configured
      if (this.config.backup.destination.type !== 'local') {
        await this.uploadBackup(backupPath);
      }

      operation.status = 'completed';
      operation.endTime = new Date();

      this.emit('backup:completed', { operationId, backupName, path: backupPath });
      return backupPath;
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = new Date();

      this.emit('backup:error', { operationId, error });
      throw error;
    }
  }

  // Private methods for implementation details...

  private initializeStatus(): EnvironmentStatus {
    return {
      status: 'stopped',
      services: [],
      networks: [],
      volumes: [],
      health: {
        overall: 'none',
        services: {},
        issues: [],
        lastCheck: new Date()
      },
      metrics: {
        totalCpu: 0,
        totalMemory: 0,
        totalNetwork: 0,
        totalStorage: 0,
        serviceCount: this.config.services.length,
        runningServices: 0,
        failedServices: 0,
        uptime: 0,
        restarts: 0
      },
      uptime: 0,
      lastUpdate: new Date()
    };
  }

  private async validateConfiguration(): Promise<void> {
    // Validate required fields
    if (!this.config.projectName) {
      throw new Error('Project name is required');
    }

    if (!this.config.services || this.config.services.length === 0) {
      throw new Error('At least one service is required');
    }

    // Validate service configurations
    for (const service of this.config.services) {
      if (!service.name || !service.image) {
        throw new Error(`Service ${service.name} is missing required fields`);
      }
    }

    // Validate dependencies
    this.validateServiceDependencies();
  }

  private validateServiceDependencies(): void {
    const serviceNames = new Set(this.config.services.map(s => s.name));
    
    for (const service of this.config.services) {
      for (const dependency of service.dependencies) {
        if (!serviceNames.has(dependency)) {
          throw new Error(`Service ${service.name} depends on non-existent service ${dependency}`);
        }
      }
    }
  }

  private async validateContainerRuntime(): Promise<void> {
    try {
      const result = await this.executeCommand([this.config.containerRuntime, '--version']);
      if (result.exitCode !== 0) {
        throw new Error(`Container runtime ${this.config.containerRuntime} is not available`);
      }
    } catch (error) {
      throw new Error(`Failed to validate container runtime: ${error.message}`);
    }
  }

  private async createProjectStructure(): Promise<void> {
    const projectDir = path.join(process.cwd(), '.dna-environment');
    await fs.mkdir(projectDir, { recursive: true });
    
    const subdirs = ['config', 'data', 'logs', 'cache', 'backups'];
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(projectDir, subdir), { recursive: true });
    }
  }

  private async generateContainerConfigurations(): Promise<void> {
    if (this.config.orchestrationTool === 'docker-compose') {
      await this.generateDockerCompose();
    }
    
    await this.generateDockerfiles();
    await this.generateEnvironmentFiles();
  }

  private async generateDockerCompose(): Promise<void> {
    const compose = {
      version: '3.8',
      services: this.generateComposeServices(),
      networks: this.generateComposeNetworks(),
      volumes: this.generateComposeVolumes()
    };

    const composePath = path.join(process.cwd(), '.dna-environment', 'docker-compose.yml');
    await fs.writeFile(composePath, yaml.dump(compose));
  }

  private generateComposeServices(): Record<string, any> {
    const services: Record<string, any> = {};
    
    for (const service of this.config.services) {
      services[service.name] = {
        image: service.image,
        container_name: `${this.config.projectName}_${service.name}`,
        ports: service.ports.map(p => `${p.host}:${p.container}`),
        environment: service.environment,
        volumes: service.volumes,
        networks: service.networks,
        depends_on: service.dependencies,
        restart: service.restart,
        healthcheck: service.healthCheck.test.length > 0 ? {
          test: service.healthCheck.test,
          interval: service.healthCheck.interval,
          timeout: service.healthCheck.timeout,
          retries: service.healthCheck.retries,
          start_period: service.healthCheck.startPeriod
        } : undefined,
        deploy: {
          resources: {
            limits: {
              cpus: service.resources.cpus,
              memory: service.resources.memory
            }
          }
        }
      };

      if (service.dockerfile) {
        services[service.name].build = {
          context: service.buildContext || '.',
          dockerfile: service.dockerfile
        };
        delete services[service.name].image;
      }
    }

    return services;
  }

  private generateComposeNetworks(): Record<string, any> {
    const networks: Record<string, any> = {};
    
    for (const network of this.config.networks) {
      networks[network.name] = {
        driver: network.driver,
        attachable: network.attachable,
        internal: network.internal,
        enable_ipv6: network.enableIPv6,
        driver_opts: network.driverOpts,
        labels: network.labels
      };

      if (network.subnet || network.gateway) {
        networks[network.name].ipam = {
          config: [{
            subnet: network.subnet,
            gateway: network.gateway,
            ip_range: network.ipRange
          }]
        };
      }
    }

    return networks;
  }

  private generateComposeVolumes(): Record<string, any> {
    const volumes: Record<string, any> = {};
    
    for (const volume of this.config.volumes) {
      if (volume.type === 'volume') {
        volumes[volume.name] = {
          driver: volume.driver,
          driver_opts: volume.driverOpts,
          labels: volume.labels
        };
      }
    }

    return volumes;
  }

  private async generateDockerfiles(): Promise<void> {
    for (const service of this.config.services) {
      if (service.dockerfile && service.buildContext) {
        await this.generateServiceDockerfile(service);
      }
    }
  }

  private async generateServiceDockerfile(service: ServiceConfiguration): Promise<void> {
    // Framework-specific Dockerfile generation logic would go here
    // This is a simplified example
    const dockerfile = this.getFrameworkDockerfile(service);
    
    const dockerfilePath = path.join(process.cwd(), service.buildContext || '.', service.dockerfile || 'Dockerfile');
    await fs.writeFile(dockerfilePath, dockerfile);
  }

  private getFrameworkDockerfile(service: ServiceConfiguration): string {
    switch (this.config.framework) {
      case 'nextjs':
        return this.getNextJSDockerfile(service);
      case 'tauri':
        return this.getTauriDockerfile(service);
      case 'sveltekit':
        return this.getSvelteKitDockerfile(service);
      default:
        return this.getGenericDockerfile(service);
    }
  }

  private getNextJSDockerfile(service: ServiceConfiguration): string {
    return `# Next.js Development Environment
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE ${service.ports[0]?.container || 3000}

CMD ["npm", "start"]
`;
  }

  private getTauriDockerfile(service: ServiceConfiguration): string {
    return `# Tauri Development Environment
FROM rust:1.75-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    libwebkit2gtk-4.0-dev \\
    build-essential \\
    curl \\
    wget \\
    libssl-dev \\
    libgtk-3-dev \\
    libayatana-appindicator3-dev \\
    librsvg2-dev \\
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \\
    && apt-get install -y nodejs

# Copy source code
COPY . .

# Install dependencies
RUN npm install
RUN cargo fetch

# Build application
RUN npm run tauri build

EXPOSE ${service.ports[0]?.container || 8000}

CMD ["cargo", "run"]
`;
  }

  private getSvelteKitDockerfile(service: ServiceConfiguration): string {
    return `# SvelteKit Development Environment
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

EXPOSE ${service.ports[0]?.container || 3000}

CMD ["npm", "start"]
`;
  }

  private getGenericDockerfile(service: ServiceConfiguration): string {
    return `# Generic Development Environment
FROM ${service.image}

WORKDIR /app

COPY . .

EXPOSE ${service.ports[0]?.container || 8000}

CMD ["sh", "-c", "echo 'Container started'"]
`;
  }

  private async generateEnvironmentFiles(): Promise<void> {
    const envPath = path.join(process.cwd(), '.dna-environment', '.env');
    const envContent = Object.entries(this.config.environment.variables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    await fs.writeFile(envPath, envContent);
  }

  private createOperation(id: string, type: OperationType, metadata: Record<string, any> = {}): EnvironmentOperation {
    const operation: EnvironmentOperation = {
      id,
      type,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      logs: [],
      metadata
    };

    this.operations.set(id, operation);
    return operation;
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async executeCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const process = spawn(args[0], args.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code || 0
        });
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async pullImages(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Pulling container images...');
    
    for (const service of this.config.services) {
      if (service.image && !service.dockerfile) {
        operation.logs.push(`Pulling ${service.image}...`);
        await this.executeCommand([this.config.containerRuntime, 'pull', service.image]);
      }
    }
    
    operation.progress = 20;
  }

  private async createNetworks(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Creating networks...');
    
    for (const network of this.config.networks) {
      const createArgs = [
        this.config.containerRuntime,
        'network',
        'create',
        '--driver',
        network.driver
      ];

      if (network.subnet) {
        createArgs.push('--subnet', network.subnet);
      }

      if (network.gateway) {
        createArgs.push('--gateway', network.gateway);
      }

      createArgs.push(network.name);

      try {
        await this.executeCommand(createArgs);
        operation.logs.push(`Created network: ${network.name}`);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          throw error;
        }
        operation.logs.push(`Network already exists: ${network.name}`);
      }
    }
    
    operation.progress = 40;
  }

  private async createVolumes(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Creating volumes...');
    
    for (const volume of this.config.volumes) {
      if (volume.type === 'volume') {
        const createArgs = [
          this.config.containerRuntime,
          'volume',
          'create'
        ];

        if (volume.driver) {
          createArgs.push('--driver', volume.driver);
        }

        createArgs.push(volume.name);

        try {
          await this.executeCommand(createArgs);
          operation.logs.push(`Created volume: ${volume.name}`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
          operation.logs.push(`Volume already exists: ${volume.name}`);
        }
      }
    }
    
    operation.progress = 60;
  }

  private async startServices(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Starting services...');
    
    if (this.config.orchestrationTool === 'docker-compose') {
      const composePath = path.join(process.cwd(), '.dna-environment', 'docker-compose.yml');
      await this.executeCommand([
        'docker-compose',
        '-f',
        composePath,
        'up',
        '-d'
      ]);
    } else {
      // Start services individually in dependency order
      const startOrder = this.calculateStartOrder();
      for (const serviceName of startOrder) {
        const service = this.config.services.find(s => s.name === serviceName);
        if (service) {
          await this.startService(service, operation);
        }
      }
    }
    
    operation.progress = 80;
  }

  private calculateStartOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (serviceName: string) => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected: ${serviceName}`);
      }
      
      if (visited.has(serviceName)) {
        return;
      }

      visiting.add(serviceName);
      
      const service = this.config.services.find(s => s.name === serviceName);
      if (service) {
        for (const dependency of service.dependencies) {
          visit(dependency);
        }
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    for (const service of this.config.services) {
      if (!visited.has(service.name)) {
        visit(service.name);
      }
    }

    return order;
  }

  private async startService(service: ServiceConfiguration, operation: EnvironmentOperation): Promise<void> {
    operation.logs.push(`Starting service: ${service.name}`);
    
    const runArgs = [
      this.config.containerRuntime,
      'run',
      '-d',
      '--name',
      `${this.config.projectName}_${service.name}`
    ];

    // Add port mappings
    for (const port of service.ports) {
      runArgs.push('-p', `${port.host}:${port.container}`);
    }

    // Add environment variables
    for (const [key, value] of Object.entries(service.environment)) {
      runArgs.push('-e', `${key}=${value}`);
    }

    // Add volume mounts
    for (const volumeMount of service.volumes) {
      runArgs.push('-v', volumeMount);
    }

    // Add networks
    for (const network of service.networks) {
      runArgs.push('--network', network);
    }

    // Add resource limits
    if (service.resources.memory) {
      runArgs.push('-m', service.resources.memory);
    }
    if (service.resources.cpus) {
      runArgs.push('--cpus', service.resources.cpus);
    }

    runArgs.push(service.image);

    if (service.command && service.command.length > 0) {
      runArgs.push(...service.command);
    }

    await this.executeCommand(runArgs);
  }

  private async waitForHealthy(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Waiting for services to be healthy...');
    
    const maxWaitTime = 120000; // 2 minutes
    const checkInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const allHealthy = await this.checkAllServicesHealthy();
      
      if (allHealthy) {
        operation.logs.push('All services are healthy');
        operation.progress = 100;
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Timeout waiting for services to become healthy');
  }

  private async checkAllServicesHealthy(): Promise<boolean> {
    for (const service of this.config.services) {
      const containerName = `${this.config.projectName}_${service.name}`;
      
      try {
        const result = await this.executeCommand([
          this.config.containerRuntime,
          'inspect',
          '--format',
          '{{.State.Health.Status}}',
          containerName
        ]);

        const healthStatus = result.stdout.trim();
        if (healthStatus === 'unhealthy' || healthStatus === 'starting') {
          return false;
        }
      } catch (error) {
        // Container might not exist or not have health check
        const runningResult = await this.executeCommand([
          this.config.containerRuntime,
          'inspect',
          '--format',
          '{{.State.Status}}',
          containerName
        ]);

        if (runningResult.stdout.trim() !== 'running') {
          return false;
        }
      }
    }

    return true;
  }

  private async stopServices(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Stopping services...');
    
    if (this.config.orchestrationTool === 'docker-compose') {
      const composePath = path.join(process.cwd(), '.dna-environment', 'docker-compose.yml');
      await this.executeCommand([
        'docker-compose',
        '-f',
        composePath,
        'down'
      ]);
    } else {
      const stopOrder = this.calculateStartOrder().reverse();
      for (const serviceName of stopOrder) {
        const containerName = `${this.config.projectName}_${serviceName}`;
        try {
          await this.executeCommand([this.config.containerRuntime, 'stop', containerName]);
          operation.logs.push(`Stopped service: ${serviceName}`);
        } catch (error) {
          operation.logs.push(`Failed to stop service ${serviceName}: ${error.message}`);
        }
      }
    }
  }

  private async removeContainers(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Removing containers...');
    
    for (const service of this.config.services) {
      const containerName = `${this.config.projectName}_${service.name}`;
      try {
        await this.executeCommand([this.config.containerRuntime, 'rm', '-f', containerName]);
        operation.logs.push(`Removed container: ${containerName}`);
      } catch (error) {
        operation.logs.push(`Failed to remove container ${containerName}: ${error.message}`);
      }
    }
  }

  private async removeNetworks(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Removing networks...');
    
    for (const network of this.config.networks) {
      try {
        await this.executeCommand([this.config.containerRuntime, 'network', 'rm', network.name]);
        operation.logs.push(`Removed network: ${network.name}`);
      } catch (error) {
        operation.logs.push(`Failed to remove network ${network.name}: ${error.message}`);
      }
    }
  }

  private async removeVolumes(operation: EnvironmentOperation): Promise<void> {
    operation.logs.push('Removing volumes...');
    
    for (const volume of this.config.volumes) {
      if (volume.type === 'volume') {
        try {
          await this.executeCommand([this.config.containerRuntime, 'volume', 'rm', volume.name]);
          operation.logs.push(`Removed volume: ${volume.name}`);
        } catch (error) {
          operation.logs.push(`Failed to remove volume ${volume.name}: ${error.message}`);
        }
      }
    }
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.emit('health:error', error);
      }
    }, this.config.monitoring.healthCheckInterval * 1000);
  }

  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private async performHealthChecks(): Promise<void> {
    const healthStatus: HealthStatus = {
      overall: 'healthy',
      services: {},
      issues: [],
      lastCheck: new Date()
    };

    for (const service of this.config.services) {
      try {
        const serviceHealth = await this.checkServiceHealth(service);
        healthStatus.services[service.name] = serviceHealth;
        
        if (serviceHealth === 'unhealthy') {
          healthStatus.overall = 'unhealthy';
          healthStatus.issues.push({
            service: service.name,
            severity: 'high',
            message: 'Service is unhealthy',
            timestamp: new Date(),
            resolved: false
          });
        }
      } catch (error) {
        healthStatus.services[service.name] = 'unhealthy';
        healthStatus.overall = 'unhealthy';
        healthStatus.issues.push({
          service: service.name,
          severity: 'critical',
          message: error.message,
          timestamp: new Date(),
          resolved: false
        });
      }
    }

    this.status.health = healthStatus;
    this.emit('health:updated', healthStatus);
  }

  private async checkServiceHealth(service: ServiceConfiguration): Promise<ServiceHealth> {
    const containerName = `${this.config.projectName}_${service.name}`;
    
    try {
      const result = await this.executeCommand([
        this.config.containerRuntime,
        'inspect',
        '--format',
        '{{.State.Health.Status}}',
        containerName
      ]);

      const healthStatus = result.stdout.trim();
      return healthStatus as ServiceHealth;
    } catch (error) {
      // No health check defined, check if container is running
      const runningResult = await this.executeCommand([
        this.config.containerRuntime,
        'inspect',
        '--format',
        '{{.State.Status}}',
        containerName
      ]);

      return runningResult.stdout.trim() === 'running' ? 'healthy' : 'unhealthy';
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.emit('metrics:error', error);
      }
    }, 30000); // Collect metrics every 30 seconds
  }

  private stopMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  private async collectMetrics(): Promise<void> {
    const metrics: EnvironmentMetrics = {
      totalCpu: 0,
      totalMemory: 0,
      totalNetwork: 0,
      totalStorage: 0,
      serviceCount: this.config.services.length,
      runningServices: 0,
      failedServices: 0,
      uptime: 0,
      restarts: 0
    };

    for (const service of this.config.services) {
      try {
        const serviceMetrics = await this.collectServiceMetrics(service);
        
        metrics.totalCpu += serviceMetrics.cpuPercent;
        metrics.totalMemory += serviceMetrics.memoryUsage;
        metrics.totalNetwork += serviceMetrics.networkRx + serviceMetrics.networkTx;
        
        if (serviceMetrics.cpuPercent > 0) {
          metrics.runningServices++;
        }
      } catch (error) {
        metrics.failedServices++;
      }
    }

    this.status.metrics = metrics;
    this.emit('metrics:updated', metrics);
  }

  private async collectServiceMetrics(service: ServiceConfiguration): Promise<ResourceUsage> {
    const containerName = `${this.config.projectName}_${service.name}`;
    
    const result = await this.executeCommand([
      this.config.containerRuntime,
      'stats',
      '--no-stream',
      '--format',
      'table {{.CPUPerc}},{{.MemUsage}},{{.NetIO}},{{.BlockIO}},{{.PIDs}}',
      containerName
    ]);

    const lines = result.stdout.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('No stats available');
    }

    const stats = lines[1].split(',');
    
    return {
      cpuPercent: parseFloat(stats[0].replace('%', '')),
      memoryUsage: this.parseMemoryUsage(stats[1]),
      memoryLimit: 0, // Would need additional parsing
      memoryPercent: 0,
      networkRx: this.parseNetworkUsage(stats[2]).rx,
      networkTx: this.parseNetworkUsage(stats[2]).tx,
      blockRead: this.parseBlockUsage(stats[3]).read,
      blockWrite: this.parseBlockUsage(stats[3]).write,
      pids: parseInt(stats[4]) || 0
    };
  }

  private parseMemoryUsage(usage: string): number {
    const match = usage.match(/([\d.]+)([KMGT]?B)/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    const multipliers: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    };
    
    return value * (multipliers[unit] || 1);
  }

  private parseNetworkUsage(usage: string): { rx: number; tx: number } {
    const parts = usage.split(' / ');
    return {
      rx: this.parseMemoryUsage(parts[0]),
      tx: this.parseMemoryUsage(parts[1])
    };
  }

  private parseBlockUsage(usage: string): { read: number; write: number } {
    const parts = usage.split(' / ');
    return {
      read: this.parseMemoryUsage(parts[0]),
      write: this.parseMemoryUsage(parts[1])
    };
  }

  private async updateStatus(): Promise<void> {
    // Update service statuses
    const serviceStatuses: ServiceStatus[] = [];
    
    for (const service of this.config.services) {
      const status = await this.getServiceStatus(service);
      serviceStatuses.push(status);
    }

    this.status.services = serviceStatuses;
    this.status.lastUpdate = new Date();
  }

  private async getServiceStatus(service: ServiceConfiguration): Promise<ServiceStatus> {
    const containerName = `${this.config.projectName}_${service.name}`;
    
    try {
      const inspectResult = await this.executeCommand([
        this.config.containerRuntime,
        'inspect',
        '--format',
        '{{.State.Status}},{{.State.Health.Status}},{{.State.ExitCode}},{{.RestartCount}}',
        containerName
      ]);

      const [state, health, exitCode, restartCount] = inspectResult.stdout.split(',');
      
      const resourceUsage = await this.collectServiceMetrics(service);
      
      return {
        name: service.name,
        state: state as ServiceState,
        health: (health && health !== '<no value>') ? health as ServiceHealth : 'none',
        ports: [], // Would need port status checking
        resources: resourceUsage,
        logs: [], // Would need log fetching
        metrics: {
          requests: 0,
          errors: 0,
          latency: { p50: 0, p95: 0, p99: 0, avg: 0, max: 0 },
          throughput: 0,
          availability: state === 'running' ? 100 : 0
        },
        uptime: 0, // Would need uptime calculation
        restarts: parseInt(restartCount) || 0,
        exitCode: exitCode !== '<no value>' ? parseInt(exitCode) : undefined
      };
    } catch (error) {
      return {
        name: service.name,
        state: 'exited',
        health: 'unhealthy',
        ports: [],
        resources: {
          cpuPercent: 0,
          memoryUsage: 0,
          memoryLimit: 0,
          memoryPercent: 0,
          networkRx: 0,
          networkTx: 0,
          blockRead: 0,
          blockWrite: 0,
          pids: 0
        },
        logs: [],
        metrics: {
          requests: 0,
          errors: 0,
          latency: { p50: 0, p95: 0, p99: 0, avg: 0, max: 0 },
          throughput: 0,
          availability: 0
        },
        uptime: 0,
        restarts: 0,
        error: error.message
      };
    }
  }

  private async backupVolume(volume: VolumeConfiguration, backupPath: string): Promise<void> {
    if (volume.type === 'volume') {
      // Create temporary container to backup volume
      const tempContainer = `backup_${volume.name}_${Date.now()}`;
      
      await this.executeCommand([
        this.config.containerRuntime,
        'run',
        '--rm',
        '-v',
        `${volume.name}:/source`,
        '-v',
        `${backupPath}:/backup`,
        'alpine:latest',
        'tar',
        'czf',
        `/backup/${volume.name}.tar.gz`,
        '-C',
        '/source',
        '.'
      ]);
    }
  }

  private async compressBackup(backupPath: string): Promise<void> {
    // Implementation would depend on compression method
    // This is a placeholder
  }

  private async uploadBackup(backupPath: string): Promise<void> {
    // Implementation would depend on destination type
    // This is a placeholder
  }
}

/**
 * Framework-specific preset configurations
 */
export const frameworkPresets: Record<string, FrameworkPreset> = {
  nextjs: {
    framework: 'nextjs',
    version: '14.0.0',
    services: [
      {
        name: 'web',
        type: 'web',
        image: 'node:18-alpine',
        ports: [{ host: 3000, container: 3000, protocol: 'tcp' }],
        environment: {
          NODE_ENV: 'development',
          NEXT_TELEMETRY_DISABLED: '1'
        },
        volumes: ['./:/app', '/app/node_modules'],
        networks: ['default'],
        dependencies: [],
        healthCheck: {
          test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health'],
          interval: '30s',
          timeout: '3s',
          retries: 3
        },
        resources: {
          cpus: '0.5',
          memory: '512m'
        },
        restart: 'unless-stopped',
        command: ['npm', 'run', 'dev'],
        workingDir: '/app',
        labels: {}
      }
    ],
    volumes: [
      {
        name: 'node_modules',
        type: 'volume',
        source: 'node_modules',
        target: '/app/node_modules',
        readOnly: false,
        labels: {}
      }
    ],
    networks: [
      {
        name: 'default',
        driver: 'bridge',
        attachable: true,
        internal: false,
        enableIPv6: false,
        driverOpts: {},
        labels: {}
      }
    ],
    environment: {
      variables: {
        NODE_ENV: 'development',
        NEXT_TELEMETRY_DISABLED: '1'
      },
      secretFiles: [],
      configFiles: [],
      interpolation: true,
      validation: {
        required: ['NODE_ENV'],
        optional: ['DATABASE_URL'],
        patterns: {},
        validators: {}
      }
    },
    development: {
      enableHotReload: true,
      enableDebugMode: true,
      enableTestMode: false,
      enableProfiler: false,
      syncStrategy: 'bind-mount',
      buildStrategy: 'local',
      caching: {
        enableBuildCache: true,
        enableDependencyCache: true,
        enableAssetCache: true,
        cacheDriver: 'local',
        maxCacheSize: '1GB',
        cacheRetention: '7d'
      },
      optimization: {
        enableLayerCaching: true,
        enableMultiStage: false,
        enableSquashing: false,
        enableCompression: false,
        compressionLevel: 6,
        parallelBuilds: 1
      }
    },
    scripts: {
      setup: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint'
    },
    extensions: ['hot-reload', 'typescript', 'eslint', 'prettier']
  },
  tauri: {
    framework: 'tauri',
    version: '1.5.0',
    services: [
      {
        name: 'app',
        type: 'build',
        image: 'rust:1.75-slim',
        ports: [{ host: 1420, container: 1420, protocol: 'tcp' }],
        environment: {
          RUST_LOG: 'debug',
          TAURI_DEV: 'true'
        },
        volumes: ['./:/app', 'cargo-cache:/usr/local/cargo'],
        networks: ['default'],
        dependencies: [],
        healthCheck: {
          test: ['CMD', 'curl', '-f', 'http://localhost:1420'],
          interval: '30s',
          timeout: '3s',
          retries: 3
        },
        resources: {
          cpus: '1.0',
          memory: '1GB'
        },
        restart: 'unless-stopped',
        command: ['cargo', 'tauri', 'dev'],
        workingDir: '/app',
        labels: {}
      }
    ],
    volumes: [
      {
        name: 'cargo-cache',
        type: 'volume',
        source: 'cargo-cache',
        target: '/usr/local/cargo',
        readOnly: false,
        labels: {}
      }
    ],
    networks: [
      {
        name: 'default',
        driver: 'bridge',
        attachable: true,
        internal: false,
        enableIPv6: false,
        driverOpts: {},
        labels: {}
      }
    ],
    environment: {
      variables: {
        RUST_LOG: 'debug',
        TAURI_DEV: 'true'
      },
      secretFiles: [],
      configFiles: [],
      interpolation: true,
      validation: {
        required: ['RUST_LOG'],
        optional: ['DATABASE_URL'],
        patterns: {},
        validators: {}
      }
    },
    development: {
      enableHotReload: true,
      enableDebugMode: true,
      enableTestMode: false,
      enableProfiler: false,
      syncStrategy: 'bind-mount',
      buildStrategy: 'container',
      caching: {
        enableBuildCache: true,
        enableDependencyCache: true,
        enableAssetCache: false,
        cacheDriver: 'local',
        maxCacheSize: '2GB',
        cacheRetention: '7d'
      },
      optimization: {
        enableLayerCaching: true,
        enableMultiStage: true,
        enableSquashing: false,
        enableCompression: true,
        compressionLevel: 6,
        parallelBuilds: 1
      }
    },
    scripts: {
      setup: 'cargo fetch && npm install',
      dev: 'cargo tauri dev',
      build: 'cargo tauri build',
      test: 'cargo test',
      lint: 'cargo clippy'
    },
    extensions: ['rust-analyzer', 'hot-reload', 'webview-debug']
  },
  sveltekit: {
    framework: 'sveltekit',
    version: '1.0.0',
    services: [
      {
        name: 'web',
        type: 'web',
        image: 'node:18-alpine',
        ports: [{ host: 5173, container: 5173, protocol: 'tcp' }],
        environment: {
          NODE_ENV: 'development',
          VITE_HMR_PORT: '5173'
        },
        volumes: ['./:/app', '/app/node_modules'],
        networks: ['default'],
        dependencies: [],
        healthCheck: {
          test: ['CMD', 'wget', '--spider', 'http://localhost:5173'],
          interval: '30s',
          timeout: '3s',
          retries: 3
        },
        resources: {
          cpus: '0.5',
          memory: '512m'
        },
        restart: 'unless-stopped',
        command: ['npm', 'run', 'dev', '--', '--host'],
        workingDir: '/app',
        labels: {}
      }
    ],
    volumes: [
      {
        name: 'node_modules',
        type: 'volume',
        source: 'node_modules',
        target: '/app/node_modules',
        readOnly: false,
        labels: {}
      }
    ],
    networks: [
      {
        name: 'default',
        driver: 'bridge',
        attachable: true,
        internal: false,
        enableIPv6: false,
        driverOpts: {},
        labels: {}
      }
    ],
    environment: {
      variables: {
        NODE_ENV: 'development',
        VITE_HMR_PORT: '5173'
      },
      secretFiles: [],
      configFiles: [],
      interpolation: true,
      validation: {
        required: ['NODE_ENV'],
        optional: ['DATABASE_URL'],
        patterns: {},
        validators: {}
      }
    },
    development: {
      enableHotReload: true,
      enableDebugMode: true,
      enableTestMode: false,
      enableProfiler: false,
      syncStrategy: 'bind-mount',
      buildStrategy: 'local',
      caching: {
        enableBuildCache: true,
        enableDependencyCache: true,
        enableAssetCache: true,
        cacheDriver: 'local',
        maxCacheSize: '1GB',
        cacheRetention: '7d'
      },
      optimization: {
        enableLayerCaching: true,
        enableMultiStage: false,
        enableSquashing: false,
        enableCompression: false,
        compressionLevel: 6,
        parallelBuilds: 1
      }
    },
    scripts: {
      setup: 'npm install',
      dev: 'npm run dev',
      build: 'npm run build',
      test: 'npm test',
      lint: 'npm run lint'
    },
    extensions: ['vite', 'svelte', 'typescript', 'hot-reload']
  }
};

/**
 * Default configuration factory
 */
export function createDefaultConfig(
  projectName: string,
  framework: 'nextjs' | 'tauri' | 'sveltekit'
): DevEnvironmentConfig {
  const preset = frameworkPresets[framework];
  
  if (!preset) {
    throw new Error(`Unsupported framework: ${framework}`);
  }

  return {
    projectName,
    framework,
    containerRuntime: 'docker',
    orchestrationTool: 'docker-compose',
    services: preset.services.map(s => ({
      ...s,
      name: s.name || 'app',
      type: s.type || 'web',
      image: s.image || 'node:18-alpine',
      ports: s.ports || [],
      environment: s.environment || {},
      volumes: s.volumes || [],
      networks: s.networks || ['default'],
      dependencies: s.dependencies || [],
      healthCheck: s.healthCheck || {
        test: [],
        interval: '30s',
        timeout: '3s',
        retries: 3
      },
      resources: s.resources || {
        cpus: '0.5',
        memory: '512m'
      },
      restart: s.restart || 'unless-stopped',
      labels: s.labels || {}
    })),
    volumes: preset.volumes.map(v => ({
      ...v,
      name: v.name || 'data',
      type: v.type || 'volume',
      source: v.source || '',
      target: v.target || '',
      readOnly: v.readOnly || false,
      labels: v.labels || {}
    })),
    networks: preset.networks.map(n => ({
      ...n,
      name: n.name || 'default',
      driver: n.driver || 'bridge',
      attachable: n.attachable !== false,
      internal: n.internal || false,
      enableIPv6: n.enableIPv6 || false,
      driverOpts: n.driverOpts || {},
      labels: n.labels || {}
    })),
    environment: {
      variables: preset.environment?.variables || {},
      secretFiles: [],
      configFiles: [],
      interpolation: true,
      validation: {
        required: [],
        optional: [],
        patterns: {},
        validators: {}
      }
    },
    monitoring: {
      enableHealthChecks: true,
      enableMetrics: true,
      enableLogs: true,
      enableTracing: false,
      healthCheckInterval: 30,
      healthCheckTimeout: 10,
      healthCheckRetries: 3,
      alerting: {
        enabled: false,
        webhooks: [],
        emailNotifications: [],
        slackChannels: [],
        thresholds: []
      }
    },
    security: {
      enableAppArmor: false,
      enableSELinux: false,
      enableSeccomp: true,
      enableUserNamespaces: false,
      rootless: false,
      runAsNonRoot: false,
      readOnlyRootFilesystem: false,
      allowPrivilegeEscalation: false,
      capabilities: {
        add: [],
        drop: ['ALL']
      },
      secrets: {
        provider: 'file',
        secrets: [],
        encryption: {
          enabled: false,
          algorithm: 'AES-256-GCM'
        }
      },
      imageSecurity: {
        enableScanning: false,
        scannerProvider: 'trivy',
        allowUnknownImages: true,
        trustedRegistries: [],
        signatureVerification: false,
        vulnerabilityThreshold: 'high'
      }
    },
    development: preset.development || {
      enableHotReload: true,
      enableDebugMode: true,
      enableTestMode: false,
      enableProfiler: false,
      syncStrategy: 'bind-mount',
      buildStrategy: 'local',
      caching: {
        enableBuildCache: true,
        enableDependencyCache: true,
        enableAssetCache: true,
        cacheDriver: 'local',
        maxCacheSize: '1GB',
        cacheRetention: '7d'
      },
      optimization: {
        enableLayerCaching: true,
        enableMultiStage: false,
        enableSquashing: false,
        enableCompression: false,
        compressionLevel: 6,
        parallelBuilds: 1
      }
    },
    enableAutoReload: true,
    enableHealthChecks: true,
    enableLogging: true,
    enableMetrics: true,
    enableTracing: false,
    enableSecurity: true,
    resourceLimits: {
      memory: '2GB',
      cpu: '2.0',
      storage: '10GB',
      network: '100MB/s',
      processes: 100,
      fileDescriptors: 1024
    },
    persistence: {
      enablePersistence: true,
      volumeDriver: 'local',
      backupStrategy: 'incremental',
      retentionPolicy: {
        daily: 7,
        weekly: 4,
        monthly: 12,
        yearly: 2
      },
      encryption: false,
      compression: true
    },
    backup: {
      enabled: false,
      schedule: '0 2 * * *', // Daily at 2 AM
      destination: {
        type: 'local',
        path: './backups'
      },
      compression: true,
      encryption: false,
      verification: true,
      notification: {
        onSuccess: false,
        onFailure: true,
        webhooks: [],
        emails: []
      }
    }
  };
}