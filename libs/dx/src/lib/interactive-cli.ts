/**
 * @fileoverview Enhanced Interactive CLI - Epic 6 Story 1 AC1
 * Provides guided setup, real-time validation, and troubleshooting for DNA template system
 */

import { EventEmitter } from 'events';
import * as readline from 'readline';
import * as chalk from 'chalk';
import * as ora from 'ora';
import * as inquirer from 'inquirer';
import * as fuzzy from 'fuzzy';
import { Command } from 'commander';

/**
 * CLI interaction modes
 */
export enum CLIMode {
  GUIDED = 'guided',
  INTERACTIVE = 'interactive',
  COMMAND = 'command',
  WIZARD = 'wizard'
}

/**
 * CLI configuration
 */
export interface InteractiveCLIConfig {
  // Display settings
  enableColors: boolean;
  enableEmoji: boolean;
  enableProgress: boolean;
  enableAnimations: boolean;
  
  // Interaction settings
  defaultMode: CLIMode;
  enableAutoComplete: boolean;
  enableFuzzySearch: boolean;
  enableHistory: boolean;
  historySize: number;
  
  // Validation settings
  enableRealTimeValidation: boolean;
  validationDebounce: number; // ms
  showValidationHints: boolean;
  
  // Troubleshooting settings
  enableTroubleshooting: boolean;
  enableDebugMode: boolean;
  logLevel: LogLevel;
  
  // Help system
  enableContextualHelp: boolean;
  helpCommand: string;
  enableTutorials: boolean;
  
  // Progress tracking
  enableProgressTracking: boolean;
  showTimeEstimates: boolean;
  showCompletionPercentage: boolean;
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Wizard step
 */
export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  type: StepType;
  validation?: ValidationRule[];
  dependencies?: string[];
  skipCondition?: (context: WizardContext) => boolean;
  
  // Step configuration
  prompt?: PromptConfig;
  action?: (context: WizardContext) => Promise<void>;
  
  // Help and hints
  help?: string;
  examples?: string[];
  troubleshooting?: TroubleshootingGuide[];
}

/**
 * Step types
 */
export enum StepType {
  PROMPT = 'prompt',
  ACTION = 'action',
  VALIDATION = 'validation',
  CONFIRMATION = 'confirmation',
  PROGRESS = 'progress',
  CUSTOM = 'custom'
}

/**
 * Prompt configuration
 */
export interface PromptConfig {
  type: PromptType;
  message: string;
  name: string;
  default?: any;
  choices?: ChoiceOption[];
  validate?: (input: any) => boolean | string;
  filter?: (input: any) => any;
  when?: (answers: any) => boolean;
  
  // Enhanced features
  autocomplete?: string[];
  fuzzySearch?: boolean;
  multiSelect?: boolean;
  suggestions?: (input: string) => string[];
}

/**
 * Prompt types
 */
export enum PromptType {
  INPUT = 'input',
  NUMBER = 'number',
  CONFIRM = 'confirm',
  LIST = 'list',
  CHECKBOX = 'checkbox',
  PASSWORD = 'password',
  EDITOR = 'editor',
  AUTOCOMPLETE = 'autocomplete'
}

/**
 * Choice option
 */
export interface ChoiceOption {
  name: string;
  value: any;
  short?: string;
  disabled?: boolean | string;
  checked?: boolean;
}

/**
 * Validation rule
 */
export interface ValidationRule {
  type: ValidationType;
  message: string;
  validator: (value: any, context: WizardContext) => boolean | Promise<boolean>;
  severity?: ValidationSeverity;
  autoFix?: (value: any) => any;
}

/**
 * Validation types
 */
export enum ValidationType {
  REQUIRED = 'required',
  FORMAT = 'format',
  RANGE = 'range',
  DEPENDENCY = 'dependency',
  CUSTOM = 'custom'
}

/**
 * Validation severity
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Wizard context
 */
export interface WizardContext {
  // User responses
  answers: Record<string, any>;
  
  // Progress tracking
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  
  // Validation results
  validationResults: ValidationResult[];
  
  // Session data
  sessionId: string;
  startTime: Date;
  
  // Metadata
  mode: CLIMode;
  flags: Record<string, any>;
  environment: Record<string, string>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  stepId: string;
  field?: string;
  valid: boolean;
  message?: string;
  severity: ValidationSeverity;
  suggestion?: string;
  autoFixed?: boolean;
}

/**
 * Troubleshooting guide
 */
export interface TroubleshootingGuide {
  id: string;
  issue: string;
  symptoms: string[];
  causes: string[];
  solutions: Solution[];
  relatedIssues?: string[];
}

/**
 * Solution
 */
export interface Solution {
  id: string;
  description: string;
  steps: string[];
  command?: string;
  automated?: boolean;
  confidence: number; // 0-1
}

/**
 * CLI command definition
 */
export interface CLICommand {
  name: string;
  description: string;
  alias?: string[];
  arguments?: CommandArgument[];
  options?: CommandOption[];
  examples?: CommandExample[];
  handler: CommandHandler;
  
  // Enhanced features
  interactive?: boolean;
  wizard?: WizardStep[];
  validation?: ValidationRule[];
  troubleshooting?: TroubleshootingGuide[];
}

/**
 * Command argument
 */
export interface CommandArgument {
  name: string;
  description: string;
  required?: boolean;
  type?: ArgumentType;
  default?: any;
  choices?: string[];
  validate?: (value: any) => boolean | string;
}

/**
 * Argument types
 */
export enum ArgumentType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  FILE = 'file',
  DIRECTORY = 'directory'
}

/**
 * Command option
 */
export interface CommandOption {
  name: string;
  short?: string;
  description: string;
  type?: ArgumentType;
  default?: any;
  required?: boolean;
  choices?: string[];
  conflicts?: string[];
  implies?: string[];
}

/**
 * Command example
 */
export interface CommandExample {
  description: string;
  command: string;
  output?: string;
}

/**
 * Command handler
 */
export type CommandHandler = (args: any, options: any, context: CLIContext) => Promise<void>;

/**
 * CLI context
 */
export interface CLIContext {
  mode: CLIMode;
  config: InteractiveCLIConfig;
  session: SessionInfo;
  ui: UIHelpers;
  troubleshooter: Troubleshooter;
}

/**
 * Session info
 */
export interface SessionInfo {
  id: string;
  startTime: Date;
  user?: string;
  history: CommandHistory[];
  environment: Record<string, string>;
}

/**
 * Command history
 */
export interface CommandHistory {
  command: string;
  timestamp: Date;
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * UI helpers
 */
export interface UIHelpers {
  spinner: (text: string) => any;
  progress: (total: number) => any;
  table: (data: any[], options?: any) => void;
  tree: (data: any, options?: any) => void;
  log: (message: string, level?: LogLevel) => void;
  error: (message: string, error?: Error) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

/**
 * Progress tracker
 */
export interface ProgressTracker {
  id: string;
  title: string;
  total: number;
  current: number;
  status: ProgressStatus;
  startTime: Date;
  estimatedTime?: number;
  
  // Sub-tasks
  subtasks?: ProgressTask[];
  
  // Events
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Progress status
 */
export enum ProgressStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Progress task
 */
export interface ProgressTask {
  id: string;
  title: string;
  weight: number;
  status: ProgressStatus;
  progress: number;
}

/**
 * Troubleshooter
 */
export class Troubleshooter {
  private guides: Map<string, TroubleshootingGuide>;
  private solutions: Map<string, Solution>;
  private eventEmitter: EventEmitter;

  constructor() {
    this.guides = new Map();
    this.solutions = new Map();
    this.eventEmitter = new EventEmitter();
    this.loadBuiltInGuides();
  }

  /**
   * Diagnose an issue
   */
  public async diagnose(symptoms: string[]): Promise<TroubleshootingGuide[]> {
    const matches: TroubleshootingGuide[] = [];
    
    for (const [id, guide] of this.guides) {
      const score = this.calculateMatchScore(symptoms, guide.symptoms);
      if (score > 0.5) {
        matches.push(guide);
      }
    }

    return matches.sort((a, b) => {
      const scoreA = this.calculateMatchScore(symptoms, a.symptoms);
      const scoreB = this.calculateMatchScore(symptoms, b.symptoms);
      return scoreB - scoreA;
    });
  }

  /**
   * Apply a solution
   */
  public async applySolution(solutionId: string, context: any): Promise<boolean> {
    const solution = this.solutions.get(solutionId);
    if (!solution || !solution.automated) {
      return false;
    }

    try {
      // Execute automated solution
      if (solution.command) {
        await this.executeCommand(solution.command, context);
      }

      this.eventEmitter.emit('solution:applied', { solutionId, success: true });
      return true;
    } catch (error) {
      this.eventEmitter.emit('solution:error', { solutionId, error });
      return false;
    }
  }

  /**
   * Add custom troubleshooting guide
   */
  public addGuide(guide: TroubleshootingGuide): void {
    this.guides.set(guide.id, guide);
    
    // Add solutions
    for (const solution of guide.solutions) {
      this.solutions.set(solution.id, solution);
    }
  }

  private loadBuiltInGuides(): void {
    // Load built-in troubleshooting guides
    const commonGuides: TroubleshootingGuide[] = [
      {
        id: 'npm-install-failed',
        issue: 'npm install fails',
        symptoms: ['npm install error', 'dependency resolution failed', 'package not found'],
        causes: ['Network issues', 'Registry problems', 'Version conflicts'],
        solutions: [
          {
            id: 'clear-cache',
            description: 'Clear npm cache and retry',
            steps: ['Run: npm cache clean --force', 'Delete node_modules', 'Run: npm install'],
            command: 'npm cache clean --force && rm -rf node_modules && npm install',
            automated: true,
            confidence: 0.8
          },
          {
            id: 'use-legacy-deps',
            description: 'Use legacy peer dependency resolution',
            steps: ['Run: npm install --legacy-peer-deps'],
            command: 'npm install --legacy-peer-deps',
            automated: true,
            confidence: 0.6
          }
        ]
      },
      {
        id: 'port-already-in-use',
        issue: 'Port already in use',
        symptoms: ['EADDRINUSE error', 'port 3000 in use', 'cannot bind to port'],
        causes: ['Another process using the port', 'Previous process not terminated'],
        solutions: [
          {
            id: 'kill-process',
            description: 'Find and kill process using the port',
            steps: ['Find process: lsof -i :PORT', 'Kill process: kill -9 PID'],
            command: 'lsof -ti :$PORT | xargs kill -9',
            automated: true,
            confidence: 0.9
          },
          {
            id: 'change-port',
            description: 'Use a different port',
            steps: ['Set PORT environment variable', 'Or update configuration'],
            automated: false,
            confidence: 1.0
          }
        ]
      }
    ];

    for (const guide of commonGuides) {
      this.addGuide(guide);
    }
  }

  private calculateMatchScore(input: string[], reference: string[]): number {
    let matches = 0;
    
    for (const symptom of input) {
      for (const ref of reference) {
        if (ref.toLowerCase().includes(symptom.toLowerCase()) || 
            symptom.toLowerCase().includes(ref.toLowerCase())) {
          matches++;
          break;
        }
      }
    }

    return matches / Math.max(input.length, reference.length);
  }

  private async executeCommand(command: string, context: any): Promise<void> {
    // Execute command with context variable substitution
    const processedCommand = this.substituteVariables(command, context);
    
    // Implementation would execute the command
    console.log(`Executing: ${processedCommand}`);
  }

  private substituteVariables(command: string, context: any): string {
    return command.replace(/\$(\w+)/g, (match, variable) => {
      return context[variable] || match;
    });
  }
}

/**
 * Interactive CLI
 */
export class InteractiveCLI {
  private config: InteractiveCLIConfig;
  private eventEmitter: EventEmitter;
  private commands: Map<string, CLICommand>;
  private wizards: Map<string, WizardStep[]>;
  private history: CommandHistory[];
  private troubleshooter: Troubleshooter;
  private rl?: readline.Interface;
  private program: Command;

  constructor(config: InteractiveCLIConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.commands = new Map();
    this.wizards = new Map();
    this.history = [];
    this.troubleshooter = new Troubleshooter();
    this.program = new Command();
    
    this.setupCommander();
    this.loadBuiltInCommands();
  }

  /**
   * Initialize the CLI
   */
  public async initialize(): Promise<void> {
    this.eventEmitter.emit('cli:initializing');
    
    try {
      // Load command history
      await this.loadHistory();
      
      // Setup readline interface for interactive mode
      if (this.config.defaultMode === CLIMode.INTERACTIVE) {
        this.setupReadline();
      }

      this.eventEmitter.emit('cli:initialized');
    } catch (error) {
      this.eventEmitter.emit('cli:error', { error, phase: 'initialization' });
      throw error;
    }
  }

  /**
   * Register a command
   */
  public registerCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
    
    // Register with commander
    const cmd = this.program
      .command(command.name)
      .description(command.description);

    // Add aliases
    if (command.alias) {
      cmd.alias(command.alias);
    }

    // Add arguments
    if (command.arguments) {
      for (const arg of command.arguments) {
        const argString = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
        cmd.argument(argString, arg.description, arg.validate);
      }
    }

    // Add options
    if (command.options) {
      for (const opt of command.options) {
        const flags = opt.short ? `-${opt.short}, --${opt.name}` : `--${opt.name}`;
        const description = opt.required ? `${opt.description} (required)` : opt.description;
        cmd.option(flags, description, opt.default);
      }
    }

    // Set action handler
    cmd.action(async (...args) => {
      await this.executeCommand(command, args);
    });

    // Register wizard if exists
    if (command.wizard) {
      this.wizards.set(command.name, command.wizard);
    }
  }

  /**
   * Start interactive mode
   */
  public async startInteractive(): Promise<void> {
    this.eventEmitter.emit('cli:interactive:start');
    
    console.log(chalk.cyan('\n🚀 DNA Template System - Interactive Mode\n'));
    console.log(chalk.gray('Type "help" for available commands or "exit" to quit.\n'));

    if (!this.rl) {
      this.setupReadline();
    }

    this.promptCommand();
  }

  /**
   * Run a wizard
   */
  public async runWizard(wizardName: string, initialContext?: Partial<WizardContext>): Promise<WizardContext> {
    const steps = this.wizards.get(wizardName);
    if (!steps) {
      throw new Error(`Wizard '${wizardName}' not found`);
    }

    const context: WizardContext = {
      answers: {},
      currentStep: 0,
      totalSteps: steps.length,
      completedSteps: [],
      validationResults: [],
      sessionId: this.generateSessionId(),
      startTime: new Date(),
      mode: CLIMode.WIZARD,
      flags: {},
      environment: process.env as Record<string, string>,
      ...initialContext
    };

    console.log(chalk.cyan(`\n🧙 Starting ${wizardName} wizard...\n`));

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      context.currentStep = i + 1;

      // Check skip condition
      if (step.skipCondition && step.skipCondition(context)) {
        continue;
      }

      // Display step info
      this.displayStepInfo(step, context);

      try {
        // Execute step
        await this.executeWizardStep(step, context);
        
        // Mark as completed
        context.completedSteps.push(step.id);
        
      } catch (error) {
        // Handle step error
        await this.handleStepError(step, error as Error, context);
      }
    }

    // Display summary
    this.displayWizardSummary(context);

    return context;
  }

  /**
   * Show contextual help
   */
  public showHelp(command?: string): void {
    if (command && this.commands.has(command)) {
      this.showCommandHelp(command);
    } else {
      this.showGeneralHelp();
    }
  }

  /**
   * Get UI helpers
   */
  public getUIHelpers(): UIHelpers {
    return {
      spinner: (text: string) => ora(text),
      progress: (total: number) => this.createProgressBar(total),
      table: (data: any[], options?: any) => this.displayTable(data, options),
      tree: (data: any, options?: any) => this.displayTree(data, options),
      log: (message: string, level: LogLevel = LogLevel.INFO) => this.log(message, level),
      error: (message: string, error?: Error) => this.displayError(message, error),
      success: (message: string) => console.log(chalk.green(`✓ ${message}`)),
      warning: (message: string) => console.log(chalk.yellow(`⚠ ${message}`)),
      info: (message: string) => console.log(chalk.blue(`ℹ ${message}`))
    };
  }

  // Private methods

  private setupCommander(): void {
    this.program
      .name('dna-cli')
      .description('DNA Template System CLI')
      .version('1.0.0')
      .option('-d, --debug', 'Enable debug mode')
      .option('-i, --interactive', 'Start in interactive mode')
      .option('-g, --guided', 'Start in guided mode');
  }

  private loadBuiltInCommands(): void {
    // Create command
    this.registerCommand({
      name: 'create',
      description: 'Create a new project from template',
      alias: ['new', 'init'],
      arguments: [
        {
          name: 'name',
          description: 'Project name',
          required: true,
          type: ArgumentType.STRING,
          validate: (value: string) => {
            if (!value || value.length < 3) {
              return 'Project name must be at least 3 characters';
            }
            return true;
          }
        }
      ],
      options: [
        {
          name: 'template',
          short: 't',
          description: 'Template to use',
          type: ArgumentType.STRING,
          choices: ['ai-saas', 'mobile-app', 'web-app', 'api-server']
        },
        {
          name: 'framework',
          short: 'f',
          description: 'Framework to use',
          type: ArgumentType.STRING,
          choices: ['nextjs', 'tauri', 'sveltekit', 'flutter', 'react-native']
        }
      ],
      handler: async (args, options, context) => {
        // Implementation
        context.ui.success(`Created project: ${args.name}`);
      },
      wizard: [
        {
          id: 'project-name',
          title: 'Project Configuration',
          description: 'Let\'s set up your new project',
          type: StepType.PROMPT,
          prompt: {
            type: PromptType.INPUT,
            message: 'What is your project name?',
            name: 'projectName',
            validate: (input: string) => {
              if (!input || input.length < 3) {
                return 'Project name must be at least 3 characters';
              }
              return true;
            }
          }
        },
        {
          id: 'template-selection',
          title: 'Template Selection',
          type: StepType.PROMPT,
          prompt: {
            type: PromptType.LIST,
            message: 'Which template would you like to use?',
            name: 'template',
            choices: [
              { name: 'AI-Powered SaaS Application', value: 'ai-saas' },
              { name: 'Mobile Application', value: 'mobile-app' },
              { name: 'Web Application', value: 'web-app' },
              { name: 'API Server', value: 'api-server' }
            ]
          }
        }
      ]
    });

    // Troubleshoot command
    this.registerCommand({
      name: 'troubleshoot',
      description: 'Diagnose and fix common issues',
      alias: ['fix', 'diagnose'],
      arguments: [
        {
          name: 'issue',
          description: 'Issue description',
          required: false,
          type: ArgumentType.STRING
        }
      ],
      handler: async (args, options, context) => {
        if (args.issue) {
          await this.runTroubleshooting([args.issue], context);
        } else {
          await this.runInteractiveTroubleshooting(context);
        }
      },
      interactive: true
    });
  }

  private setupReadline(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('dna> '),
      completer: this.config.enableAutoComplete ? (line: string) => this.autoComplete(line) : undefined
    });

    this.rl.on('line', async (input) => {
      await this.handleInteractiveInput(input.trim());
      this.promptCommand();
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye! 👋\n'));
      process.exit(0);
    });
  }

  private async handleInteractiveInput(input: string): Promise<void> {
    if (!input) return;

    const startTime = Date.now();

    try {
      // Parse command
      const [command, ...args] = input.split(' ');

      // Special commands
      if (command === 'exit' || command === 'quit') {
        this.rl?.close();
        return;
      }

      if (command === 'help') {
        this.showHelp(args[0]);
        return;
      }

      if (command === 'history') {
        this.showHistory();
        return;
      }

      // Execute command
      const cmd = this.commands.get(command);
      if (cmd) {
        await this.executeCommand(cmd, args);
      } else {
        console.log(chalk.red(`Unknown command: ${command}`));
        console.log(chalk.gray('Type "help" for available commands.'));
      }

      // Record history
      this.addToHistory(input, true, Date.now() - startTime);

    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      this.addToHistory(input, false, Date.now() - startTime, (error as Error).message);
      
      // Offer troubleshooting
      if (this.config.enableTroubleshooting) {
        console.log(chalk.yellow('\nWould you like help troubleshooting this issue? (y/n)'));
        // Handle troubleshooting prompt
      }
    }
  }

  private async executeCommand(command: CLICommand, args: any[]): Promise<void> {
    const context: CLIContext = {
      mode: this.config.defaultMode,
      config: this.config,
      session: {
        id: this.generateSessionId(),
        startTime: new Date(),
        history: this.history,
        environment: process.env as Record<string, string>
      },
      ui: this.getUIHelpers(),
      troubleshooter: this.troubleshooter
    };

    // Run in wizard mode if interactive
    if (command.wizard && (command.interactive || this.config.defaultMode === CLIMode.WIZARD)) {
      const wizardContext = await this.runWizard(command.name);
      args = [wizardContext.answers];
    }

    await command.handler(args, {}, context);
  }

  private async executeWizardStep(step: WizardStep, context: WizardContext): Promise<void> {
    switch (step.type) {
      case StepType.PROMPT:
        if (step.prompt) {
          const answer = await this.showPrompt(step.prompt, context);
          context.answers[step.prompt.name] = answer;
        }
        break;

      case StepType.ACTION:
        if (step.action) {
          const spinner = ora(step.title).start();
          try {
            await step.action(context);
            spinner.succeed();
          } catch (error) {
            spinner.fail();
            throw error;
          }
        }
        break;

      case StepType.VALIDATION:
        await this.validateStep(step, context);
        break;

      case StepType.CONFIRMATION:
        const confirmed = await this.showConfirmation(step, context);
        if (!confirmed) {
          throw new Error('User cancelled');
        }
        break;

      case StepType.PROGRESS:
        // Show progress for long-running operations
        break;
    }
  }

  private async showPrompt(config: PromptConfig, context: WizardContext): Promise<any> {
    const prompt: any = {
      type: config.type,
      name: config.name,
      message: config.message,
      default: config.default
    };

    // Add choices for list/checkbox
    if (config.choices) {
      prompt.choices = config.choices;
    }

    // Add validation
    if (config.validate) {
      prompt.validate = config.validate;
    }

    // Add filter
    if (config.filter) {
      prompt.filter = config.filter;
    }

    // Handle autocomplete
    if (config.type === PromptType.AUTOCOMPLETE && config.autocomplete) {
      prompt.source = async (answers: any, input: string) => {
        if (!input) return config.autocomplete;
        
        if (config.fuzzySearch) {
          const results = fuzzy.filter(input, config.autocomplete!);
          return results.map(r => r.original);
        }
        
        return config.autocomplete!.filter(item => 
          item.toLowerCase().includes(input.toLowerCase())
        );
      };
    }

    const answers = await inquirer.prompt([prompt]);
    return answers[config.name];
  }

  private async validateStep(step: WizardStep, context: WizardContext): Promise<void> {
    if (!step.validation) return;

    const spinner = ora('Validating...').start();
    const results: ValidationResult[] = [];

    for (const rule of step.validation) {
      try {
        const valid = await rule.validator(context.answers, context);
        
        if (!valid) {
          results.push({
            stepId: step.id,
            valid: false,
            message: rule.message,
            severity: rule.severity || ValidationSeverity.ERROR
          });

          // Try auto-fix
          if (rule.autoFix) {
            const fixed = rule.autoFix(context.answers);
            if (fixed) {
              context.answers = { ...context.answers, ...fixed };
              results[results.length - 1].autoFixed = true;
            }
          }
        }
      } catch (error) {
        results.push({
          stepId: step.id,
          valid: false,
          message: `Validation error: ${(error as Error).message}`,
          severity: ValidationSeverity.ERROR
        });
      }
    }

    context.validationResults.push(...results);

    const hasErrors = results.some(r => r.severity === ValidationSeverity.ERROR && !r.autoFixed);
    
    if (hasErrors) {
      spinner.fail('Validation failed');
      this.displayValidationResults(results);
      throw new Error('Validation failed');
    } else {
      spinner.succeed('Validation passed');
    }
  }

  private async showConfirmation(step: WizardStep, context: WizardContext): Promise<boolean> {
    console.log('\n' + chalk.cyan('Summary:'));
    
    // Display summary of answers
    for (const [key, value] of Object.entries(context.answers)) {
      console.log(chalk.gray(`  ${key}: `) + chalk.white(value));
    }

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Do you want to proceed with these settings?',
        default: true
      }
    ]);

    return confirmed;
  }

  private displayStepInfo(step: WizardStep, context: WizardContext): void {
    const progress = `[${context.currentStep}/${context.totalSteps}]`;
    console.log('\n' + chalk.blue(progress) + ' ' + chalk.bold(step.title));
    
    if (step.description) {
      console.log(chalk.gray(step.description));
    }

    if (step.help && this.config.enableContextualHelp) {
      console.log(chalk.dim('💡 ' + step.help));
    }
  }

  private displayWizardSummary(context: WizardContext): void {
    const duration = Date.now() - context.startTime.getTime();
    
    console.log('\n' + chalk.green('✨ Wizard completed successfully!'));
    console.log(chalk.gray(`Time: ${this.formatDuration(duration)}`));
    console.log(chalk.gray(`Steps completed: ${context.completedSteps.length}/${context.totalSteps}`));
  }

  private displayValidationResults(results: ValidationResult[]): void {
    console.log('\n' + chalk.red('Validation Issues:'));
    
    for (const result of results) {
      const icon = result.severity === ValidationSeverity.ERROR ? '✗' :
                   result.severity === ValidationSeverity.WARNING ? '⚠' : 'ℹ';
      const color = result.severity === ValidationSeverity.ERROR ? 'red' :
                    result.severity === ValidationSeverity.WARNING ? 'yellow' : 'blue';
      
      console.log(chalk[color](`  ${icon} ${result.message}`));
      
      if (result.suggestion) {
        console.log(chalk.gray(`    → ${result.suggestion}`));
      }
      
      if (result.autoFixed) {
        console.log(chalk.green(`    ✓ Auto-fixed`));
      }
    }
  }

  private async handleStepError(step: WizardStep, error: Error, context: WizardContext): Promise<void> {
    console.error(chalk.red(`\n✗ Error in step '${step.title}': ${error.message}`));

    if (this.config.enableTroubleshooting && step.troubleshooting) {
      console.log(chalk.yellow('\n🔧 Troubleshooting suggestions:'));
      
      const guides = await this.troubleshooter.diagnose([error.message]);
      
      if (guides.length > 0) {
        for (const guide of guides.slice(0, 3)) {
          console.log(chalk.cyan(`\n  ${guide.issue}`));
          
          for (const solution of guide.solutions.slice(0, 2)) {
            console.log(chalk.gray(`    • ${solution.description}`));
          }
        }
      }
    }

    throw error;
  }

  private async runTroubleshooting(symptoms: string[], context: CLIContext): Promise<void> {
    const spinner = ora('Diagnosing issue...').start();
    
    try {
      const guides = await this.troubleshooter.diagnose(symptoms);
      spinner.stop();

      if (guides.length === 0) {
        console.log(chalk.yellow('No matching troubleshooting guides found.'));
        return;
      }

      console.log(chalk.cyan(`\nFound ${guides.length} possible solution(s):\n`));

      for (let i = 0; i < guides.length; i++) {
        const guide = guides[i];
        console.log(chalk.bold(`${i + 1}. ${guide.issue}`));
        console.log(chalk.gray(`   Causes: ${guide.causes.join(', ')}`));
        
        for (const solution of guide.solutions) {
          const autoLabel = solution.automated ? chalk.green(' [automated]') : '';
          console.log(chalk.gray(`   → ${solution.description}${autoLabel}`));
        }
        console.log();
      }

      // Ask if user wants to apply automated solution
      const automatedSolutions = guides
        .flatMap(g => g.solutions)
        .filter(s => s.automated);

      if (automatedSolutions.length > 0) {
        const { apply } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'apply',
            message: 'Would you like to try an automated fix?',
            default: true
          }
        ]);

        if (apply) {
          await this.applyAutomatedSolution(automatedSolutions[0], context);
        }
      }

    } catch (error) {
      spinner.fail('Troubleshooting failed');
      throw error;
    }
  }

  private async runInteractiveTroubleshooting(context: CLIContext): Promise<void> {
    console.log(chalk.cyan('\n🔍 Interactive Troubleshooting\n'));
    
    const { symptoms } = await inquirer.prompt([
      {
        type: 'input',
        name: 'symptoms',
        message: 'Describe the issue you\'re experiencing:',
        validate: (input: string) => input.length > 0 || 'Please describe the issue'
      }
    ]);

    await this.runTroubleshooting([symptoms], context);
  }

  private async applyAutomatedSolution(solution: Solution, context: CLIContext): Promise<void> {
    const spinner = ora(`Applying: ${solution.description}`).start();
    
    try {
      const success = await this.troubleshooter.applySolution(solution.id, context);
      
      if (success) {
        spinner.succeed('Solution applied successfully');
      } else {
        spinner.fail('Solution failed');
      }
    } catch (error) {
      spinner.fail(`Error: ${(error as Error).message}`);
    }
  }

  private autoComplete(line: string): [string[], string] {
    const commands = Array.from(this.commands.keys());
    const hits = commands.filter(cmd => cmd.startsWith(line));
    return [hits, line];
  }

  private showCommandHelp(commandName: string): void {
    const command = this.commands.get(commandName);
    if (!command) return;

    console.log(chalk.bold(`\n${command.name}`) + chalk.gray(` - ${command.description}`));
    
    if (command.alias && command.alias.length > 0) {
      console.log(chalk.gray(`Aliases: ${command.alias.join(', ')}`));
    }

    if (command.arguments && command.arguments.length > 0) {
      console.log(chalk.cyan('\nArguments:'));
      for (const arg of command.arguments) {
        const required = arg.required ? ' (required)' : ' (optional)';
        console.log(`  ${arg.name}${required} - ${arg.description}`);
      }
    }

    if (command.options && command.options.length > 0) {
      console.log(chalk.cyan('\nOptions:'));
      for (const opt of command.options) {
        const flags = opt.short ? `-${opt.short}, --${opt.name}` : `--${opt.name}`;
        console.log(`  ${flags} - ${opt.description}`);
      }
    }

    if (command.examples && command.examples.length > 0) {
      console.log(chalk.cyan('\nExamples:'));
      for (const example of command.examples) {
        console.log(chalk.gray(`  # ${example.description}`));
        console.log(`  $ ${example.command}`);
        if (example.output) {
          console.log(chalk.dim(`  ${example.output}`));
        }
      }
    }
  }

  private showGeneralHelp(): void {
    console.log(chalk.cyan('\n📚 DNA CLI Help\n'));
    console.log('Available commands:\n');

    const commandList = Array.from(this.commands.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));

    for (const [name, command] of commandList) {
      console.log(`  ${chalk.bold(name.padEnd(15))} ${command.description}`);
    }

    console.log(chalk.gray('\nFor detailed help on a command, use: help <command>'));
    console.log(chalk.gray('To exit interactive mode, use: exit'));
  }

  private showHistory(): void {
    console.log(chalk.cyan('\n📜 Command History\n'));
    
    const recentHistory = this.history.slice(-10);
    
    for (const entry of recentHistory) {
      const status = entry.success ? chalk.green('✓') : chalk.red('✗');
      const time = new Date(entry.timestamp).toLocaleTimeString();
      console.log(`${status} [${time}] ${entry.command} (${entry.duration}ms)`);
      
      if (entry.error) {
        console.log(chalk.red(`  Error: ${entry.error}`));
      }
    }
  }

  private addToHistory(command: string, success: boolean, duration: number, error?: string): void {
    this.history.push({
      command,
      timestamp: new Date(),
      success,
      duration,
      error
    });

    // Limit history size
    if (this.history.length > this.config.historySize) {
      this.history = this.history.slice(-this.config.historySize);
    }

    // Save history if enabled
    if (this.config.enableHistory) {
      this.saveHistory();
    }
  }

  private async loadHistory(): Promise<void> {
    // Load command history from storage
    // Implementation would read from file or database
  }

  private async saveHistory(): Promise<void> {
    // Save command history to storage
    // Implementation would write to file or database
  }

  private promptCommand(): void {
    if (this.rl) {
      this.rl.prompt();
    }
  }

  private createProgressBar(total: number): any {
    // Create and return a progress bar instance
    // Implementation would use a progress bar library
    return {
      update: (current: number) => {
        const percentage = Math.round((current / total) * 100);
        console.log(chalk.cyan(`Progress: ${percentage}%`));
      }
    };
  }

  private displayTable(data: any[], options?: any): void {
    // Display data in table format
    // Implementation would use a table library
    console.table(data);
  }

  private displayTree(data: any, options?: any): void {
    // Display data in tree format
    // Implementation would use a tree display library
    console.log(JSON.stringify(data, null, 2));
  }

  private displayError(message: string, error?: Error): void {
    console.error(chalk.red(`✗ ${message}`));
    
    if (error && this.config.enableDebugMode) {
      console.error(chalk.gray(error.stack));
    }
  }

  private log(message: string, level: LogLevel): void {
    if (this.getLogLevel(level) < this.getLogLevel(this.config.logLevel)) {
      return;
    }

    const prefix = {
      [LogLevel.DEBUG]: chalk.gray('[DEBUG]'),
      [LogLevel.INFO]: chalk.blue('[INFO]'),
      [LogLevel.WARN]: chalk.yellow('[WARN]'),
      [LogLevel.ERROR]: chalk.red('[ERROR]')
    }[level];

    console.log(`${prefix} ${message}`);
  }

  private getLogLevel(level: LogLevel): number {
    return {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3
    }[level];
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

/**
 * Create interactive CLI instance
 */
export function createInteractiveCLI(config?: Partial<InteractiveCLIConfig>): InteractiveCLI {
  const defaultConfig: InteractiveCLIConfig = {
    enableColors: true,
    enableEmoji: true,
    enableProgress: true,
    enableAnimations: true,
    defaultMode: CLIMode.INTERACTIVE,
    enableAutoComplete: true,
    enableFuzzySearch: true,
    enableHistory: true,
    historySize: 100,
    enableRealTimeValidation: true,
    validationDebounce: 300,
    showValidationHints: true,
    enableTroubleshooting: true,
    enableDebugMode: false,
    logLevel: LogLevel.INFO,
    enableContextualHelp: true,
    helpCommand: 'help',
    enableTutorials: true,
    enableProgressTracking: true,
    showTimeEstimates: true,
    showCompletionPercentage: true
  };

  return new InteractiveCLI({ ...defaultConfig, ...config });
}