import { FrameworkType, DNAModuleId, TemplateGenerationResult } from '../types';
import { CLITestHarness } from '../utils/cli-test-harness';
import { FileSystemMock } from '../utils/file-system-mock';

export interface E2ETestScenario {
  name: string;
  description: string;
  template: string;
  framework: FrameworkType;
  dnaModules: DNAModuleId[];
  projectName: string;
  expectedFiles: string[];
  expectedDependencies: string[];
  validationSteps: ValidationStep[];
}

export interface ValidationStep {
  type: 'file_exists' | 'file_content' | 'command_execution' | 'build_success' | 'test_success';
  target: string;
  expected?: string | RegExp;
  timeout?: number;
}

export class TemplateGenerationE2E {
  private cliHarness: CLITestHarness;
  private fileSystemMock: FileSystemMock;

  constructor() {
    this.cliHarness = new CLITestHarness();
    this.fileSystemMock = new FileSystemMock();
  }

  async runE2EScenario(scenario: E2ETestScenario): Promise<E2ETestResult> {
    console.log(`Running E2E scenario: ${scenario.name}`);
    
    const result: E2ETestResult = {
      scenario: scenario.name,
      success: false,
      duration: 0,
      steps: [],
      errors: []
    };

    const startTime = Date.now();

    try {
      // Step 1: Generate project from template
      await this.generateProject(scenario);
      result.steps.push({ name: 'Project Generation', success: true, duration: 0 });

      // Step 2: Validate file structure
      await this.validateFileStructure(scenario);
      result.steps.push({ name: 'File Structure Validation', success: true, duration: 0 });

      // Step 3: Validate dependencies
      await this.validateDependencies(scenario);
      result.steps.push({ name: 'Dependencies Validation', success: true, duration: 0 });

      // Step 4: Run custom validation steps
      await this.runValidationSteps(scenario);
      result.steps.push({ name: 'Custom Validation', success: true, duration: 0 });

      // Step 5: Build project
      await this.buildProject(scenario);
      result.steps.push({ name: 'Project Build', success: true, duration: 0 });

      // Step 6: Run tests
      await this.runProjectTests(scenario);
      result.steps.push({ name: 'Project Tests', success: true, duration: 0 });

      result.success = true;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.success = false;
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  private async generateProject(scenario: E2ETestScenario): Promise<void> {
    const command = [
      'create',
      scenario.projectName,
      '--template', scenario.template,
      '--framework', scenario.framework,
      '--dna', scenario.dnaModules.join(','),
      '--skip-install', // For faster testing
      '--output', `./test-output/${scenario.projectName}`
    ];

    const result = await this.cliHarness.runCommand(command);
    
    if (result.exitCode !== 0) {
      throw new Error(`Project generation failed: ${result.stderr}`);
    }
  }

  private async validateFileStructure(scenario: E2ETestScenario): Promise<void> {
    const projectPath = `./test-output/${scenario.projectName}`;
    
    for (const expectedFile of scenario.expectedFiles) {
      const exists = await this.fileSystemMock.fileExists(`${projectPath}/${expectedFile}`);
      if (!exists) {
        throw new Error(`Expected file not found: ${expectedFile}`);
      }
    }
  }

  private async validateDependencies(scenario: E2ETestScenario): Promise<void> {
    const projectPath = `./test-output/${scenario.projectName}`;
    let packageFile: string;
    
    switch (scenario.framework) {
      case 'flutter':
        packageFile = 'pubspec.yaml';
        break;
      case 'tauri':
        packageFile = 'src-tauri/Cargo.toml';
        break;
      default:
        packageFile = 'package.json';
    }

    const packageContent = await this.fileSystemMock.readFile(`${projectPath}/${packageFile}`);
    
    for (const dependency of scenario.expectedDependencies) {
      if (!packageContent.includes(dependency)) {
        throw new Error(`Expected dependency not found: ${dependency}`);
      }
    }
  }

  private async runValidationSteps(scenario: E2ETestScenario): Promise<void> {
    const projectPath = `./test-output/${scenario.projectName}`;
    
    for (const step of scenario.validationSteps) {
      await this.executeValidationStep(step, projectPath);
    }
  }

  private async executeValidationStep(step: ValidationStep, projectPath: string): Promise<void> {
    switch (step.type) {
      case 'file_exists':
        const exists = await this.fileSystemMock.fileExists(`${projectPath}/${step.target}`);
        if (!exists) {
          throw new Error(`File does not exist: ${step.target}`);
        }
        break;

      case 'file_content':
        const content = await this.fileSystemMock.readFile(`${projectPath}/${step.target}`);
        if (step.expected instanceof RegExp) {
          if (!step.expected.test(content)) {
            throw new Error(`File content does not match pattern: ${step.target}`);
          }
        } else if (step.expected && !content.includes(step.expected)) {
          throw new Error(`File content does not include expected text: ${step.target}`);
        }
        break;

      case 'command_execution':
        const result = await this.cliHarness.runCommand([step.target], { 
          cwd: projectPath,
          timeout: step.timeout || 30000
        });
        if (result.exitCode !== 0) {
          throw new Error(`Command failed: ${step.target} - ${result.stderr}`);
        }
        break;

      case 'build_success':
        await this.buildProject({ projectName: projectPath.split('/').pop() || '', framework: step.target as FrameworkType } as E2ETestScenario);
        break;

      case 'test_success':
        await this.runProjectTests({ projectName: projectPath.split('/').pop() || '', framework: step.target as FrameworkType } as E2ETestScenario);
        break;
    }
  }

  private async buildProject(scenario: E2ETestScenario): Promise<void> {
    const projectPath = `./test-output/${scenario.projectName}`;
    let buildCommand: string[];

    switch (scenario.framework) {
      case 'flutter':
        buildCommand = ['flutter', 'build', 'apk', '--debug'];
        break;
      case 'react-native':
        buildCommand = ['npx', 'react-native', 'run-android', '--variant=debug'];
        break;
      case 'nextjs':
        buildCommand = ['npm', 'run', 'build'];
        break;
      case 'tauri':
        buildCommand = ['npm', 'run', 'tauri', 'build'];
        break;
      default:
        buildCommand = ['npm', 'run', 'build'];
    }

    const result = await this.cliHarness.runCommand(buildCommand, { 
      cwd: projectPath,
      timeout: 300000 // 5 minutes
    });

    if (result.exitCode !== 0) {
      throw new Error(`Build failed: ${result.stderr}`);
    }
  }

  private async runProjectTests(scenario: E2ETestScenario): Promise<void> {
    const projectPath = `./test-output/${scenario.projectName}`;
    let testCommand: string[];

    switch (scenario.framework) {
      case 'flutter':
        testCommand = ['flutter', 'test'];
        break;
      case 'react-native':
        testCommand = ['npm', 'test', '--', '--watchAll=false'];
        break;
      case 'nextjs':
        testCommand = ['npm', 'test', '--', '--watchAll=false'];
        break;
      case 'tauri':
        testCommand = ['npm', 'test'];
        break;
      default:
        testCommand = ['npm', 'test'];
    }

    const result = await this.cliHarness.runCommand(testCommand, { 
      cwd: projectPath,
      timeout: 180000 // 3 minutes
    });

    if (result.exitCode !== 0) {
      throw new Error(`Tests failed: ${result.stderr}`);
    }
  }

  // Predefined E2E scenarios
  getStandardScenarios(): E2ETestScenario[] {
    return [
      {
        name: 'AI SaaS NextJS with JWT and Stripe',
        description: 'Complete AI SaaS application with authentication and payments',
        template: 'ai-saas',
        framework: 'nextjs',
        dnaModules: ['auth-jwt', 'payments-stripe', 'ai-openai'],
        projectName: 'ai-saas-test',
        expectedFiles: [
          'package.json',
          'next.config.js',
          'lib/openai-client.ts',
          'lib/auth.ts',
          'lib/stripe.ts',
          'components/Chat.tsx',
          'api/auth/login.ts',
          'api/payments/stripe.ts'
        ],
        expectedDependencies: [
          'next',
          'openai',
          'jsonwebtoken',
          'stripe'
        ],
        validationSteps: [
          {
            type: 'file_content',
            target: 'package.json',
            expected: /"name":\s*"ai-saas-test"/
          },
          {
            type: 'command_execution',
            target: 'npm install'
          }
        ]
      },
      {
        name: 'Flutter Mobile Assistant with Biometric Auth',
        description: 'Mobile AI assistant with biometric authentication',
        template: 'mobile-assistant',
        framework: 'flutter',
        dnaModules: ['auth-biometric', 'ai-openai'],
        projectName: 'flutter-assistant-test',
        expectedFiles: [
          'pubspec.yaml',
          'lib/main.dart',
          'lib/services/auth_service.dart',
          'lib/services/ai_service.dart',
          'lib/widgets/chat_widget.dart'
        ],
        expectedDependencies: [
          'local_auth',
          'http',
          'flutter_secure_storage'
        ],
        validationSteps: [
          {
            type: 'file_content',
            target: 'pubspec.yaml',
            expected: /name:\s*flutter_assistant_test/
          },
          {
            type: 'command_execution',
            target: 'flutter pub get'
          }
        ]
      },
      {
        name: 'React Native E-commerce with PayPal',
        description: 'Cross-platform e-commerce app with PayPal integration',
        template: 'ecommerce',
        framework: 'react-native',
        dnaModules: ['auth-oauth', 'payments-paypal'],
        projectName: 'rn-ecommerce-test',
        expectedFiles: [
          'package.json',
          'src/services/authService.ts',
          'src/services/paymentService.ts',
          'src/components/ProductList.tsx',
          'src/components/PayPalButton.tsx'
        ],
        expectedDependencies: [
          'react-native',
          '@paypal/react-paypal-js'
        ],
        validationSteps: [
          {
            type: 'command_execution',
            target: 'npm install'
          },
          {
            type: 'file_content',
            target: 'src/services/paymentService.ts',
            expected: /PayPal/
          }
        ]
      },
      {
        name: 'Tauri Desktop App with Local AI',
        description: 'Desktop application with local AI integration',
        template: 'desktop-ai',
        framework: 'tauri',
        dnaModules: ['ai-local', 'auth-session'],
        projectName: 'tauri-ai-test',
        expectedFiles: [
          'package.json',
          'src-tauri/Cargo.toml',
          'src-tauri/tauri.conf.json',
          'src/services/aiService.ts',
          'src/components/AIChat.tsx'
        ],
        expectedDependencies: [
          '@tauri-apps/api'
        ],
        validationSteps: [
          {
            type: 'command_execution',
            target: 'npm install'
          },
          {
            type: 'file_content',
            target: 'src-tauri/Cargo.toml',
            expected: /tauri/
          }
        ]
      }
    ];
  }

  async runAllScenarios(): Promise<E2ETestSuiteResult> {
    const scenarios = this.getStandardScenarios();
    const results: E2ETestResult[] = [];
    let passedCount = 0;

    console.log(`Running ${scenarios.length} E2E scenarios...`);

    for (const scenario of scenarios) {
      try {
        const result = await this.runE2EScenario(scenario);
        results.push(result);
        
        if (result.success) {
          passedCount++;
          console.log(`✅ ${scenario.name} - PASSED`);
        } else {
          console.log(`❌ ${scenario.name} - FAILED`);
          console.log(`   Errors: ${result.errors.join(', ')}`);
        }
      } catch (error) {
        console.log(`💥 ${scenario.name} - ERROR: ${error}`);
        results.push({
          scenario: scenario.name,
          success: false,
          duration: 0,
          steps: [],
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }

    return {
      totalScenarios: scenarios.length,
      passedScenarios: passedCount,
      failedScenarios: scenarios.length - passedCount,
      results,
      duration: results.reduce((acc, r) => acc + r.duration, 0)
    };
  }
}

export interface E2ETestResult {
  scenario: string;
  success: boolean;
  duration: number;
  steps: Array<{
    name: string;
    success: boolean;
    duration: number;
  }>;
  errors: string[];
}

export interface E2ETestSuiteResult {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  results: E2ETestResult[];
  duration: number;
}