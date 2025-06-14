/**
 * @fileoverview Enhanced List Command - Browse templates with improved UX
 */

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { TemplateRegistry } from '../lib/template-registry';
import { TemplateMetadata, TemplateFilterOptions } from '../types/cli';
import { enhancedLogger as logger, ICONS, THEME } from '../utils/enhanced-logger';
import { EnhancedProgressTracker } from '../lib/enhanced-progress-tracker';

export const enhancedListCommand = new Command('list')
  .description('Browse and search available DNA templates')
  .option('-f, --framework <framework>', 'filter by framework')
  .option('-t, --type <type>', 'filter by template type')
  .option('-c, --complexity <level>', 'filter by complexity (beginner, intermediate, advanced)')
  .option('-s, --search <query>', 'search templates by name or description')
  .option('--tags <tags>', 'filter by tags (comma-separated)')
  .option('--max-setup-time <minutes>', 'maximum setup time in minutes', parseInt)
  .option('--min-rating <rating>', 'minimum template rating', parseFloat)
  .option('-i, --interactive', 'interactive template browser')
  .option('--json', 'output as JSON')
  .option('--detailed', 'show detailed template information')
  .action(async (options) => {
    try {
      const registry = new TemplateRegistry();
      
      // Load registry with progress
      await EnhancedProgressTracker.withProgress(
        'Loading template registry',
        async () => await registry.load(),
        { enabled: !options.json }
      );

      // Build filter options
      const filters: TemplateFilterOptions = {
        framework: options.framework,
        type: options.type,
        complexity: options.complexity,
        query: options.search,
        tags: options.tags?.split(',').map((t: string) => t.trim()),
        maxSetupTime: options.maxSetupTime,
        minRating: options.minRating,
      };

      // Get filtered templates
      const templates = filterTemplates(registry.getTemplates(), filters);

      if (options.json) {
        // JSON output
        console.log(JSON.stringify(templates, null, 2));
      } else if (options.interactive) {
        // Interactive browser
        await browseTemplatesInteractive(templates, registry);
      } else {
        // Standard list display
        displayTemplates(templates, options.detailed);
      }

    } catch (error) {
      logger.error('Failed to list templates:', error);
      process.exit(1);
    }
  });

/**
 * Filter templates based on criteria
 */
function filterTemplates(
  templates: TemplateMetadata[], 
  filters: TemplateFilterOptions
): TemplateMetadata[] {
  return templates.filter(template => {
    // Framework filter
    if (filters.framework && template.framework !== filters.framework) {
      return false;
    }

    // Type filter
    if (filters.type && template.type !== filters.type) {
      return false;
    }

    // Complexity filter
    if (filters.complexity && template.complexity !== filters.complexity) {
      return false;
    }

    // Max setup time filter
    if (filters.maxSetupTime && template.estimatedSetupTime > filters.maxSetupTime) {
      return false;
    }

    // Min rating filter
    if (filters.minRating && (template.rating || 0) < filters.minRating) {
      return false;
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag => 
        template.tags.includes(tag)
      );
      if (!hasAllTags) return false;
    }

    // Search query
    if (filters.query) {
      const query = filters.query.toLowerCase();
      const searchableText = [
        template.name,
        template.description,
        ...template.tags,
        template.framework,
        template.type,
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Display templates in standard format
 */
function displayTemplates(templates: TemplateMetadata[], detailed: boolean = false): void {
  if (templates.length === 0) {
    logger.warn('No templates found matching your criteria');
    return;
  }

  // Group templates by type
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.type]) {
      acc[template.type] = [];
    }
    acc[template.type].push(template);
    return acc;
  }, {} as Record<string, TemplateMetadata[]>);

  logger.box([
    `${ICONS.sparkles} ${chalk.bold('DNA Template Library')} ${ICONS.sparkles}`,
    '',
    `Found ${chalk.cyan(templates.length)} templates`,
  ], {
    borderColor: 'cyan',
    borderStyle: 'round',
  });

  // Display each group
  Object.entries(groupedTemplates).forEach(([type, typeTemplates]) => {
    logger.newline();
    logger.step(`${getTypeIcon(type)} ${chalk.bold(formatTypeName(type))} Templates`);
    logger.divider();

    typeTemplates.forEach((template, index) => {
      if (detailed) {
        displayDetailedTemplate(template);
      } else {
        displayCompactTemplate(template);
      }
      
      if (index < typeTemplates.length - 1) {
        logger.newline();
      }
    });
  });

  // Show summary
  logger.newline();
  logger.divider();
  logger.info(`Use ${chalk.cyan('dna-cli create --template <id>')} to create a project`);
  logger.info(`Use ${chalk.cyan('dna-cli list --interactive')} for interactive browsing`);
}

/**
 * Display template in compact format
 */
function displayCompactTemplate(template: TemplateMetadata): void {
  const rating = template.rating 
    ? `${ICONS.star.repeat(Math.round(template.rating))} ${template.rating.toFixed(1)}`
    : 'Not rated';
  
  const complexity = getComplexityBadge(template.complexity);
  const time = `${ICONS.clock} ${template.estimatedSetupTime}min`;

  console.log(
    `  ${chalk.bold.cyan(template.id)} - ${template.name}`
  );
  console.log(
    `  ${chalk.dim(template.description)}`
  );
  console.log(
    `  ${getFrameworkBadge(template.framework)} ${complexity} ${time} ${chalk.dim(rating)}`
  );
  
  if (template.tags.length > 0) {
    console.log(
      `  ${chalk.dim('Tags:')} ${template.tags.map(tag => chalk.gray(`#${tag}`)).join(' ')}`
    );
  }
}

/**
 * Display template in detailed format
 */
function displayDetailedTemplate(template: TemplateMetadata): void {
  logger.box([
    chalk.bold(template.name),
    chalk.dim(`ID: ${template.id}`),
    '',
    template.description,
    '',
    `${ICONS.gear} Framework: ${getFrameworkBadge(template.framework)}`,
    `${ICONS.gear} Type: ${formatTypeName(template.type)}`,
    `${ICONS.gear} Complexity: ${getComplexityBadge(template.complexity)}`,
    `${ICONS.clock} Setup Time: ${chalk.cyan(`~${template.estimatedSetupTime} minutes`)}`,
    `${ICONS.star} Rating: ${template.rating ? chalk.yellow(template.rating.toFixed(1)) : chalk.gray('Not rated')}`,
    `${ICONS.package} Version: ${chalk.cyan(template.version)}`,
    '',
    chalk.bold('Features:'),
    ...template.features.map(feature => `  ${ICONS.check} ${feature}`),
    '',
    chalk.bold('DNA Modules:'),
    template.dnaModules.length > 0 
      ? template.dnaModules.map(module => `  ${ICONS.bullet} ${module}`).join('\n')
      : `  ${chalk.gray('No DNA modules')}`,
    '',
    chalk.bold('Tags:'),
    template.tags.length > 0
      ? `  ${template.tags.map(tag => chalk.gray(`#${tag}`)).join(' ')}`
      : `  ${chalk.gray('No tags')}`,
  ], {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'blue',
  });
}

/**
 * Interactive template browser
 */
async function browseTemplatesInteractive(
  templates: TemplateMetadata[], 
  registry: TemplateRegistry
): Promise<void> {
  if (templates.length === 0) {
    logger.warn('No templates found');
    return;
  }

  while (true) {
    // Create choices for inquirer
    const choices = templates.map(template => ({
      name: formatTemplateChoice(template),
      value: template.id,
    }));

    choices.push(new inquirer.Separator());
    choices.push({ name: chalk.gray('Exit'), value: 'exit' });

    const { selectedId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: 'Select a template to view details:',
        choices,
        pageSize: 15,
      },
    ]);

    if (selectedId === 'exit') {
      break;
    }

    const template = templates.find(t => t.id === selectedId);
    if (template) {
      displayDetailedTemplate(template);
      
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Create project with this template', value: 'create' },
            { name: 'Back to list', value: 'back' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);

      if (action === 'create') {
        logger.info(`Run: ${chalk.cyan(`dna-cli create --template ${template.id}`)}`);
        break;
      } else if (action === 'exit') {
        break;
      }
      // If 'back', continue the loop
    }
  }
}

/**
 * Format template for choice list
 */
function formatTemplateChoice(template: TemplateMetadata): string {
  const framework = getFrameworkBadge(template.framework, true);
  const complexity = getComplexityIndicator(template.complexity);
  const rating = template.rating ? `${ICONS.star}${template.rating.toFixed(1)}` : '';
  
  return `${framework} ${template.name} ${complexity} ${chalk.dim(rating)}`;
}

/**
 * Get framework badge
 */
function getFrameworkBadge(framework: string, compact: boolean = false): string {
  const badges: Record<string, { icon: string; color: any; name: string }> = {
    nextjs: { icon: '▲', color: chalk.black.bgWhite, name: 'Next.js' },
    'react-native': { icon: '⚛', color: chalk.cyan, name: 'React Native' },
    flutter: { icon: '🦋', color: chalk.blue, name: 'Flutter' },
    tauri: { icon: '🦀', color: chalk.red, name: 'Tauri' },
    sveltekit: { icon: '🔥', color: chalk.hex('#FF3E00'), name: 'SvelteKit' },
  };

  const badge = badges[framework] || { icon: '📦', color: chalk.gray, name: framework };
  
  if (compact) {
    return badge.color(badge.icon);
  }
  
  return badge.color(`${badge.icon} ${badge.name}`);
}

/**
 * Get complexity badge
 */
function getComplexityBadge(complexity: string): string {
  const badges: Record<string, string> = {
    beginner: chalk.green('● Beginner'),
    intermediate: chalk.yellow('●● Intermediate'),
    advanced: chalk.red('●●● Advanced'),
  };
  
  return badges[complexity] || chalk.gray('● Unknown');
}

/**
 * Get complexity indicator (compact)
 */
function getComplexityIndicator(complexity: string): string {
  const indicators: Record<string, string> = {
    beginner: chalk.green('●'),
    intermediate: chalk.yellow('●●'),
    advanced: chalk.red('●●●'),
  };
  
  return indicators[complexity] || '';
}

/**
 * Get type icon
 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'ai-app': '🤖',
    'web-app': '🌐',
    'mobile-app': '📱',
    'desktop-app': '🖥️',
    'api': '🔌',
    'fullstack': '🏗️',
    'library': '📚',
    'tool': '🔧',
  };
  
  return icons[type] || '📦';
}

/**
 * Format type name
 */
function formatTypeName(type: string): string {
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}