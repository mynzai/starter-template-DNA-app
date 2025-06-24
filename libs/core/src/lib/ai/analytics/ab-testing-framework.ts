import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { PromptTemplate, PromptExecutionResult } from '../prompts/prompt-template';

export interface ABTestVariant {
  id: string;
  name: string;
  templateId: string;
  templateVersion: string;
  weight: number; // 0-100, represents percentage of traffic
  isControl: boolean;
  metadata?: Record<string, any>;
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: number;
  endDate?: number;
  variants: ABTestVariant[];
  targetMetric: 'success_rate' | 'response_time' | 'token_usage' | 'cost' | 'quality_score';
  minimumSampleSize: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  results?: ABTestResults;
}

export interface ABTestResults {
  testId: string;
  status: 'no_winner' | 'winner_found' | 'insufficient_data';
  winnerVariantId?: string;
  confidenceScore?: number;
  variants: {
    [variantId: string]: {
      sampleSize: number;
      metricValue: number;
      standardDeviation: number;
      confidenceInterval: [number, number];
      improvementOverControl?: number;
    };
  };
  statisticalSignificance?: number;
  recommendedAction?: string;
  analysisTimestamp: number;
}

export interface ABTestingConfig {
  enableAutoOptimization: boolean;
  autoOptimizationThreshold: number; // Confidence threshold for auto-switching
  minimumTestDuration: number; // Minimum hours before declaring winner
  trafficSplitMethod: 'random' | 'hash' | 'round-robin';
  enableMultiArmedBandit: boolean; // Dynamic traffic allocation
  storageAdapter?: ABTestStorageAdapter;
}

export interface ABTestStorageAdapter {
  saveTest(test: ABTest): Promise<void>;
  loadTest(testId: string): Promise<ABTest | null>;
  listTests(status?: ABTest['status']): Promise<ABTest[]>;
  deleteTest(testId: string): Promise<boolean>;
}

export class ABTestingFramework extends EventEmitter {
  private tests = new Map<string, ABTest>();
  private variantAssignments = new Map<string, Map<string, string>>(); // userId -> testId -> variantId
  private executionData = new Map<string, PromptExecutionResult[]>(); // testId -> executions
  private config: ABTestingConfig;
  private storageAdapter?: ABTestStorageAdapter;

  constructor(config: Partial<ABTestingConfig> = {}) {
    super();
    
    this.config = {
      enableAutoOptimization: false,
      autoOptimizationThreshold: 0.95,
      minimumTestDuration: 24, // 24 hours
      trafficSplitMethod: 'random',
      enableMultiArmedBandit: false,
      ...config
    };

    this.storageAdapter = config.storageAdapter;
    this.loadPersistedTests();
  }

  public async createTest(testConfig: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<ABTest> {
    const id = uuidv4();
    const now = Date.now();

    // Validate variants
    const totalWeight = testConfig.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
    }

    const controlVariants = testConfig.variants.filter(v => v.isControl);
    if (controlVariants.length !== 1) {
      throw new Error(`Exactly one control variant required, got ${controlVariants.length}`);
    }

    const test: ABTest = {
      ...testConfig,
      id,
      status: 'draft',
      createdAt: now,
      updatedAt: now
    };

    this.tests.set(id, test);
    
    if (this.storageAdapter) {
      await this.storageAdapter.saveTest(test);
    }

    this.emit('test:created', { test, timestamp: now });
    return test;
  }

  public async startTest(testId: string): Promise<ABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.status !== 'draft') {
      throw new Error(`Can only start tests in draft status, current: ${test.status}`);
    }

    test.status = 'running';
    test.startDate = Date.now();
    test.updatedAt = Date.now();

    if (this.storageAdapter) {
      await this.storageAdapter.saveTest(test);
    }

    this.emit('test:started', { 
      testId, 
      test,
      timestamp: test.startDate 
    });

    // Start monitoring if auto-optimization is enabled
    if (this.config.enableAutoOptimization) {
      this.startTestMonitoring(testId);
    }

    return test;
  }

  public async pauseTest(testId: string): Promise<ABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.status !== 'running') {
      throw new Error(`Can only pause running tests, current: ${test.status}`);
    }

    test.status = 'paused';
    test.updatedAt = Date.now();

    if (this.storageAdapter) {
      await this.storageAdapter.saveTest(test);
    }

    this.emit('test:paused', { 
      testId, 
      test,
      timestamp: test.updatedAt 
    });

    return test;
  }

  public async completeTest(testId: string): Promise<ABTest> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    if (test.status === 'completed') {
      return test;
    }

    // Analyze results before completing
    const results = await this.analyzeTestResults(testId);
    
    test.status = 'completed';
    test.endDate = Date.now();
    test.updatedAt = Date.now();
    test.results = results;

    if (this.storageAdapter) {
      await this.storageAdapter.saveTest(test);
    }

    this.emit('test:completed', { 
      testId, 
      test,
      results,
      timestamp: test.endDate 
    });

    return test;
  }

  public assignVariant(testId: string, userId: string): ABTestVariant | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Check if user already has assignment
    let userAssignments = this.variantAssignments.get(userId);
    if (!userAssignments) {
      userAssignments = new Map();
      this.variantAssignments.set(userId, userAssignments);
    }

    const existingAssignment = userAssignments.get(testId);
    if (existingAssignment) {
      return test.variants.find(v => v.id === existingAssignment) || null;
    }

    // Assign variant based on traffic split method
    const variant = this.selectVariant(test, userId);
    userAssignments.set(testId, variant.id);

    this.emit('variant:assigned', {
      testId,
      userId,
      variantId: variant.id,
      timestamp: Date.now()
    });

    return variant;
  }

  public async recordExecution(
    testId: string, 
    variantId: string, 
    execution: PromptExecutionResult
  ): Promise<void> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const variant = test.variants.find(v => v.id === variantId);
    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }

    // Store execution data
    let executions = this.executionData.get(testId);
    if (!executions) {
      executions = [];
      this.executionData.set(testId, executions);
    }

    // Add variant info to execution
    const executionWithVariant = {
      ...execution,
      metadata: {
        ...execution.metadata,
        abTestId: testId,
        variantId: variantId,
        variantName: variant.name
      }
    };

    executions.push(executionWithVariant);

    this.emit('execution:recorded', {
      testId,
      variantId,
      execution: executionWithVariant,
      timestamp: Date.now()
    });

    // Check if we should perform analysis
    if (this.config.enableAutoOptimization && test.status === 'running') {
      await this.checkAutoOptimization(testId);
    }
  }

  public async analyzeTestResults(testId: string): Promise<ABTestResults> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const executions = this.executionData.get(testId) || [];
    
    // Group executions by variant
    const variantExecutions = new Map<string, PromptExecutionResult[]>();
    for (const execution of executions) {
      const variantId = execution.metadata?.variantId;
      if (variantId) {
        const list = variantExecutions.get(variantId) || [];
        list.push(execution);
        variantExecutions.set(variantId, list);
      }
    }

    // Calculate metrics for each variant
    const results: ABTestResults = {
      testId,
      status: 'insufficient_data',
      variants: {},
      analysisTimestamp: Date.now()
    };

    const controlVariant = test.variants.find(v => v.isControl);
    if (!controlVariant) {
      throw new Error('No control variant found');
    }

    let controlMetricValue = 0;

    for (const variant of test.variants) {
      const variantExecs = variantExecutions.get(variant.id) || [];
      
      if (variantExecs.length < test.minimumSampleSize) {
        results.variants[variant.id] = {
          sampleSize: variantExecs.length,
          metricValue: 0,
          standardDeviation: 0,
          confidenceInterval: [0, 0]
        };
        continue;
      }

      const metricValue = this.calculateMetricValue(variantExecs, test.targetMetric);
      const stdDev = this.calculateStandardDeviation(variantExecs, test.targetMetric, metricValue);
      const confidenceInterval = this.calculateConfidenceInterval(
        metricValue, 
        stdDev, 
        variantExecs.length, 
        test.confidenceLevel
      );

      results.variants[variant.id] = {
        sampleSize: variantExecs.length,
        metricValue,
        standardDeviation: stdDev,
        confidenceInterval
      };

      if (variant.isControl) {
        controlMetricValue = metricValue;
      }
    }

    // Calculate improvement over control
    for (const variant of test.variants) {
      if (!variant.isControl && results.variants[variant.id].sampleSize >= test.minimumSampleSize) {
        const variantMetric = results.variants[variant.id].metricValue;
        results.variants[variant.id].improvementOverControl = 
          ((variantMetric - controlMetricValue) / controlMetricValue) * 100;
      }
    }

    // Determine if we have a winner
    const { winner, significance } = this.determineWinner(test, results);
    if (winner) {
      results.status = 'winner_found';
      results.winnerVariantId = winner;
      results.statisticalSignificance = significance;
      results.recommendedAction = `Switch to variant ${test.variants.find(v => v.id === winner)?.name}`;
    } else if (this.hasEnoughData(test, results)) {
      results.status = 'no_winner';
      results.recommendedAction = 'No significant difference found between variants';
    }

    return results;
  }

  public getActiveTestsForTemplate(templateId: string): ABTest[] {
    return Array.from(this.tests.values()).filter(test => 
      test.status === 'running' &&
      test.variants.some(v => v.templateId === templateId)
    );
  }

  private selectVariant(test: ABTest, userId: string): ABTestVariant {
    if (this.config.trafficSplitMethod === 'hash') {
      // Deterministic assignment based on user ID
      const hash = this.hashString(userId + test.id);
      const bucket = hash % 100;
      
      let cumulativeWeight = 0;
      for (const variant of test.variants) {
        cumulativeWeight += variant.weight;
        if (bucket < cumulativeWeight) {
          return variant;
        }
      }
      return test.variants[test.variants.length - 1];
    } else if (this.config.trafficSplitMethod === 'round-robin') {
      // Round-robin assignment
      const assignments = Array.from(this.variantAssignments.values())
        .flatMap(m => Array.from(m.values()))
        .filter(v => test.variants.some(variant => variant.id === v));
      
      const currentIndex = assignments.length % test.variants.length;
      return test.variants[currentIndex];
    } else {
      // Random assignment (default)
      const random = Math.random() * 100;
      let cumulativeWeight = 0;
      
      for (const variant of test.variants) {
        cumulativeWeight += variant.weight;
        if (random < cumulativeWeight) {
          return variant;
        }
      }
      return test.variants[test.variants.length - 1];
    }
  }

  private calculateMetricValue(
    executions: PromptExecutionResult[], 
    metric: ABTest['targetMetric']
  ): number {
    if (executions.length === 0) return 0;

    switch (metric) {
      case 'success_rate':
        return executions.filter(e => e.success).length / executions.length;
      
      case 'response_time':
        return executions.reduce((sum, e) => sum + e.responseTime, 0) / executions.length;
      
      case 'token_usage':
        return executions.reduce((sum, e) => sum + e.tokenUsage.total, 0) / executions.length;
      
      case 'cost':
        return executions.reduce((sum, e) => sum + e.cost, 0) / executions.length;
      
      case 'quality_score':
        const qualityScores = executions
          .filter(e => e.quality?.score !== undefined)
          .map(e => e.quality!.score);
        return qualityScores.length > 0 
          ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length 
          : 0;
      
      default:
        return 0;
    }
  }

  private calculateStandardDeviation(
    executions: PromptExecutionResult[],
    metric: ABTest['targetMetric'],
    mean: number
  ): number {
    if (executions.length < 2) return 0;

    const values = executions.map(e => {
      switch (metric) {
        case 'success_rate':
          return e.success ? 1 : 0;
        case 'response_time':
          return e.responseTime;
        case 'token_usage':
          return e.tokenUsage.total;
        case 'cost':
          return e.cost;
        case 'quality_score':
          return e.quality?.score || 0;
        default:
          return 0;
      }
    });

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private calculateConfidenceInterval(
    mean: number,
    stdDev: number,
    sampleSize: number,
    confidenceLevel: number
  ): [number, number] {
    // Z-scores for common confidence levels
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };

    const z = zScores[confidenceLevel] || 1.96;
    const margin = z * (stdDev / Math.sqrt(sampleSize));

    return [mean - margin, mean + margin];
  }

  private determineWinner(test: ABTest, results: ABTestResults): { winner: string | null, significance: number } {
    const controlVariant = test.variants.find(v => v.isControl);
    if (!controlVariant) {
      return { winner: null, significance: 0 };
    }

    const controlResults = results.variants[controlVariant.id];
    if (!controlResults || controlResults.sampleSize < test.minimumSampleSize) {
      return { winner: null, significance: 0 };
    }

    let bestVariant: string | null = null;
    let bestImprovement = 0;
    let significance = 0;

    for (const variant of test.variants) {
      if (variant.isControl) continue;

      const variantResults = results.variants[variant.id];
      if (!variantResults || variantResults.sampleSize < test.minimumSampleSize) {
        continue;
      }

      // Check if confidence intervals don't overlap
      const controlCI = controlResults.confidenceInterval;
      const variantCI = variantResults.confidenceInterval;

      const noOverlap = variantCI[0] > controlCI[1] || variantCI[1] < controlCI[0];
      
      if (noOverlap) {
        const improvement = variantResults.improvementOverControl || 0;
        
        // For metrics where lower is better (response_time, cost, token_usage)
        const lowerIsBetter = ['response_time', 'cost', 'token_usage'].includes(test.targetMetric);
        const effectiveImprovement = lowerIsBetter ? -improvement : improvement;

        if (effectiveImprovement > bestImprovement) {
          bestVariant = variant.id;
          bestImprovement = effectiveImprovement;
          
          // Calculate statistical significance
          const z = Math.abs(variantResults.metricValue - controlResults.metricValue) / 
                   Math.sqrt(
                     Math.pow(controlResults.standardDeviation, 2) / controlResults.sampleSize +
                     Math.pow(variantResults.standardDeviation, 2) / variantResults.sampleSize
                   );
          
          // Convert z-score to p-value approximation
          significance = 1 - 2 * (1 - this.normalCDF(Math.abs(z)));
        }
      }
    }

    // Check if test has run long enough
    if (test.startDate) {
      const hoursSinceStart = (Date.now() - test.startDate) / (1000 * 60 * 60);
      if (hoursSinceStart < this.config.minimumTestDuration) {
        return { winner: null, significance: 0 };
      }
    }

    return { winner: bestVariant, significance };
  }

  private hasEnoughData(test: ABTest, results: ABTestResults): boolean {
    return test.variants.every(variant => 
      results.variants[variant.id]?.sampleSize >= test.minimumSampleSize
    );
  }

  private normalCDF(z: number): number {
    // Approximation of the cumulative distribution function for standard normal distribution
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    const t = 1 / (1 + p * z);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

    return 0.5 * (1 + sign * y);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async checkAutoOptimization(testId: string): Promise<void> {
    const test = this.tests.get(testId);
    if (!test || test.status !== 'running') {
      return;
    }

    const results = await this.analyzeTestResults(testId);
    
    if (results.status === 'winner_found' && 
        results.statisticalSignificance && 
        results.statisticalSignificance >= this.config.autoOptimizationThreshold) {
      
      // Auto-complete the test
      await this.completeTest(testId);
      
      this.emit('test:auto-optimized', {
        testId,
        winnerVariantId: results.winnerVariantId,
        confidence: results.statisticalSignificance,
        timestamp: Date.now()
      });
    } else if (this.config.enableMultiArmedBandit) {
      // Adjust traffic allocation based on performance
      await this.adjustTrafficAllocation(test, results);
    }
  }

  private async adjustTrafficAllocation(test: ABTest, results: ABTestResults): Promise<void> {
    // Multi-armed bandit approach: allocate more traffic to better-performing variants
    const variants = test.variants;
    const performances: { [id: string]: number } = {};
    
    // Calculate performance scores
    for (const variant of variants) {
      const variantResults = results.variants[variant.id];
      if (variantResults && variantResults.sampleSize > 10) {
        const metric = variantResults.metricValue;
        const lowerIsBetter = ['response_time', 'cost', 'token_usage'].includes(test.targetMetric);
        performances[variant.id] = lowerIsBetter ? 1 / (metric + 1) : metric;
      } else {
        performances[variant.id] = 0.5; // Neutral score for insufficient data
      }
    }

    // Calculate new weights using Thompson sampling approach
    const totalPerformance = Object.values(performances).reduce((sum, p) => sum + p, 0);
    
    for (const variant of variants) {
      const newWeight = Math.round((performances[variant.id] / totalPerformance) * 100);
      variant.weight = Math.max(5, Math.min(95, newWeight)); // Keep weights between 5-95%
    }

    // Normalize weights to sum to 100
    const weightSum = variants.reduce((sum, v) => sum + v.weight, 0);
    variants.forEach(v => v.weight = Math.round((v.weight / weightSum) * 100));

    test.updatedAt = Date.now();
    
    if (this.storageAdapter) {
      await this.storageAdapter.saveTest(test);
    }

    this.emit('traffic:adjusted', {
      testId: test.id,
      newWeights: variants.map(v => ({ id: v.id, weight: v.weight })),
      timestamp: Date.now()
    });
  }

  private startTestMonitoring(testId: string): void {
    // Set up periodic monitoring for auto-optimization
    const intervalId = setInterval(async () => {
      const test = this.tests.get(testId);
      if (!test || test.status !== 'running') {
        clearInterval(intervalId);
        return;
      }

      await this.checkAutoOptimization(testId);
    }, 60 * 60 * 1000); // Check every hour

    this.on('test:completed', ({ testId: completedTestId }) => {
      if (completedTestId === testId) {
        clearInterval(intervalId);
      }
    });
  }

  private async loadPersistedTests(): Promise<void> {
    if (!this.storageAdapter) {
      return;
    }

    try {
      const tests = await this.storageAdapter.listTests();
      for (const test of tests) {
        this.tests.set(test.id, test);
        
        // Resume monitoring for running tests
        if (test.status === 'running' && this.config.enableAutoOptimization) {
          this.startTestMonitoring(test.id);
        }
      }
    } catch (error) {
      this.emit('storage:error', {
        operation: 'load_tests',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  public async destroy(): void {
    this.tests.clear();
    this.variantAssignments.clear();
    this.executionData.clear();
    this.removeAllListeners();
  }
}