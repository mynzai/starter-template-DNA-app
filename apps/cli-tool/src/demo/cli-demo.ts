/**
 * @fileoverview CLI Demo - Showcase enhanced CLI features
 */

import { EnhancedProgressTracker } from '../lib/enhanced-progress-tracker';
import { enhancedLogger as logger, ICONS } from '../utils/enhanced-logger';
import chalk from 'chalk';

/**
 * Demo the enhanced CLI features
 */
async function runCliDemo(): Promise<void> {
  console.clear();
  
  logger.box([
    `${ICONS.sparkles} ${chalk.bold('DNA CLI Feature Demo')} ${ICONS.sparkles}`,
    '',
    'Showcasing enhanced visual feedback and progress tracking',
  ], {
    borderColor: 'cyan',
    borderStyle: 'round',
  });

  logger.newline();

  // Demo 1: Simple progress tracking
  await demoSimpleProgress();
  
  // Demo 2: Multi-stage progress
  await demoMultiStageProgress();
  
  // Demo 3: File operations tracking
  await demoFileOperations();
  
  // Demo 4: Enhanced logging
  await demoEnhancedLogging();
  
  // Demo 5: Error handling
  await demoErrorHandling();
}

/**
 * Demo simple progress tracking
 */
async function demoSimpleProgress(): Promise<void> {
  logger.step('Demo 1: Simple Progress Tracking');
  logger.divider();
  
  await EnhancedProgressTracker.withProgress(
    'Loading template registry',
    async () => {
      await simulateWork(2000);
    }
  );
  
  await EnhancedProgressTracker.withProgress(
    'Validating configuration',
    async () => {
      await simulateWork(1500);
    }
  );
  
  logger.newline();
}

/**
 * Demo multi-stage progress
 */
async function demoMultiStageProgress(): Promise<void> {
  logger.step('Demo 2: Multi-Stage Progress');
  logger.divider();
  
  const stages = [
    { name: 'Validating configuration', operation: () => simulateWork(1000) },
    { name: 'Preparing directory', operation: () => simulateWork(800) },
    { name: 'Discovering templates', operation: () => simulateWork(1200) },
    { name: 'Generating files', operation: () => simulateWork(2000) },
    { name: 'Installing dependencies', operation: () => simulateWork(3000) },
    { name: 'Finalizing project', operation: () => simulateWork(500) },
  ];
  
  await EnhancedProgressTracker.withStages(
    'Creating Next.js AI SaaS Template',
    stages
  );
  
  logger.newline();
}

/**
 * Demo file operations tracking
 */
async function demoFileOperations(): Promise<void> {
  logger.step('Demo 3: File Operations Tracking');
  logger.divider();
  
  const tracker = new EnhancedProgressTracker({
    showTime: true,
    showPercentage: true,
    verboseMode: true,
  });
  
  tracker.start('Generating project files');
  
  const files = [
    { path: 'src/pages/index.tsx', size: 2048 },
    { path: 'src/components/Header.tsx', size: 1536 },
    { path: 'src/styles/globals.css', size: 768 },
    { path: 'package.json', size: 512 },
    { path: 'tsconfig.json', size: 256 },
    { path: '.gitignore', size: 128 },
  ];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    tracker.update(`Creating files...`, (i / files.length) * 100);
    tracker.trackFileOperation('Writing', file.path, file.size);
    await simulateWork(300);
  }
  
  tracker.addMetric('Files created', files.length);
  tracker.addMetric('Total size (KB)', Math.round(files.reduce((sum, f) => sum + f.size, 0) / 1024));
  
  tracker.succeed('All files generated successfully');
  
  logger.newline();
}

/**
 * Demo enhanced logging features
 */
async function demoEnhancedLogging(): Promise<void> {
  logger.step('Demo 4: Enhanced Logging');
  logger.divider();
  
  // Different log levels
  logger.debug('Debug message with detailed information');
  logger.info('Information about the current operation');
  logger.warn('Warning: This might need attention');
  logger.error('Error: Something went wrong (demo only)');
  logger.success('Operation completed successfully!');
  
  logger.newline();
  
  // Structured output
  logger.list('Available Templates:', [
    'AI SaaS Starter',
    'Flutter Universal App',
    'Next.js E-commerce',
    'React Native Social',
  ]);
  
  logger.newline();
  
  // Table display
  const templateData = [
    { name: 'AI SaaS', framework: 'Next.js', time: '8 min', rating: 4.8 },
    { name: 'Flutter App', framework: 'Flutter', time: '10 min', rating: 4.9 },
    { name: 'E-commerce', framework: 'Next.js', time: '12 min', rating: 4.7 },
  ];
  
  logger.table(templateData);
  
  logger.newline();
  
  // Tree structure
  logger.tree('Project Structure:', {
    'src': {
      'components': {
        'Header.tsx': null,
        'Footer.tsx': null,
      },
      'pages': {
        'index.tsx': null,
        'about.tsx': null,
      },
      'styles': {
        'globals.css': null,
      },
    },
    'public': {
      'favicon.ico': null,
    },
    'package.json': null,
    'README.md': null,
  });
  
  logger.newline();
}

/**
 * Demo error handling
 */
async function demoErrorHandling(): Promise<void> {
  logger.step('Demo 5: Error Handling');
  logger.divider();
  
  const tracker = new EnhancedProgressTracker();
  
  try {
    await EnhancedProgressTracker.withProgress(
      'Simulating operation with error',
      async () => {
        await simulateWork(1000);
        throw new Error('Simulated error for demo purposes');
      }
    );
  } catch (error) {
    // Error is handled by the progress tracker
  }
  
  logger.newline();
  
  // Show error details
  const demoError = new Error('Template not found');
  (demoError as any).code = 'TEMPLATE_NOT_FOUND';
  (demoError as any).suggestion = 'Use "dna-cli list" to see available templates';
  
  logger.errorDetails(demoError, false);
  
  logger.newline();
}

/**
 * Simulate async work
 */
async function simulateWork(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show final summary
 */
function showFinalSummary(): void {
  logger.summary('Demo Complete!', {
    'Features demonstrated': 5,
    'Progress indicators': 'Spinners, stages, progress bars',
    'Visual elements': 'Colors, icons, boxes, tables',
    'Error handling': 'Graceful failures with details',
    'Time tracking': 'Automatic duration calculation',
  });
  
  logger.nextSteps([
    {
      command: 'dna-cli create',
      description: 'Try creating a new project',
    },
    {
      command: 'dna-cli list --interactive',
      description: 'Browse templates interactively',
    },
    {
      command: 'dna-cli doctor',
      description: 'Check your environment',
    },
  ]);
}

// Run demo if called directly
if (require.main === module) {
  runCliDemo()
    .then(() => {
      showFinalSummary();
    })
    .catch(error => {
      logger.error('Demo failed:', error);
      process.exit(1);
    });
}

export { runCliDemo };