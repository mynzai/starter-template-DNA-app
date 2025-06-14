/**
 * @fileoverview List command - Display available templates
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { TemplateRegistry } from '../lib/template-registry';
import { TemplateSelector } from '../lib/template-selector';
import { logger } from '../utils/logger';
import { createCLIError } from '../utils/error-handler';
import { TemplateMetadata } from '../types/cli';
import { SupportedFramework, TemplateType } from '@dna/core';

export const listCommand = new Command('list')
  .description('List available templates')
  .option('-f, --framework <framework>', 'filter by framework')
  .option('-t, --type <type>', 'filter by template type')
  .option('-c, --complexity <level>', 'filter by complexity (beginner|intermediate|advanced)')
  .option('-d, --dna <modules>', 'filter by DNA modules (comma-separated)')
  .option('-q, --query <search>', 'search templates')
  .option('--categories', 'group by categories')
  .option('--detailed', 'show detailed information')
  .option('--json', 'output as JSON')
  .option('--no-color', 'disable colored output')
  .action(async (options) => {
    try {
      const registry = new TemplateRegistry();
      await registry.load();

      const templates = await getFilteredTemplates(registry, options);
      
      if (templates.length === 0) {
        console.log(chalk.yellow('No templates found matching your criteria.'));
        return;
      }

      if (options.json) {
        console.log(JSON.stringify(templates, null, 2));
        return;
      }

      if (options.categories) {
        await displayTemplatesByCategory(registry, templates);
      } else {
        await displayTemplatesList(templates, options);
      }

      // Show summary
      console.log(chalk.dim(`\n📊 Total: ${templates.length} template(s)`));
      
      if (templates.length > 0) {
        console.log(chalk.dim('💡 Use "dna-cli create" to start with a template'));
        console.log(chalk.dim('💡 Use "dna-cli list --detailed" for more information'));
      }

    } catch (error) {
      throw createCLIError(
        error instanceof Error ? error.message : 'Failed to list templates',
        'LIST_FAILED'
      );
    }
  });

async function getFilteredTemplates(registry: TemplateRegistry, options: any): Promise<TemplateMetadata[]> {
  let templates = registry.getTemplates();

  // Apply filters
  if (options.framework) {
    templates = registry.filterByFramework(options.framework);
  }

  if (options.type) {
    templates = registry.filterByType(options.type as TemplateType);
  }

  if (options.complexity) {
    templates = registry.filterByComplexity(options.complexity);
  }

  if (options.dna) {
    const dnaModules = options.dna.split(',').map((m: string) => m.trim());
    templates = templates.filter(t => 
      dnaModules.some((module: string) => t.dnaModules.includes(module))
    );
  }

  if (options.query) {
    templates = registry.searchTemplates(options.query);
  }

  return templates;
}

async function displayTemplatesList(templates: TemplateMetadata[], options: any): Promise<void> {
  console.log(chalk.bold('\n📦 Available Templates:\n'));

  for (const template of templates) {
    if (options.detailed) {
      displayDetailedTemplate(template);
    } else {
      displayCompactTemplate(template);
    }
  }
}

async function displayTemplatesByCategory(registry: TemplateRegistry, templates: TemplateMetadata[]): Promise<void> {
  const categories = registry.getTemplatesByCategory();
  const filteredCategories: Record<string, TemplateMetadata[]> = {};

  // Filter categories to only include templates from our filtered list
  const templateIds = new Set(templates.map(t => t.id));
  
  for (const [category, categoryTemplates] of Object.entries(categories)) {
    const filtered = categoryTemplates.filter(t => templateIds.has(t.id));
    if (filtered.length > 0) {
      filteredCategories[category] = filtered;
    }
  }

  console.log(chalk.bold('\n📂 Templates by Category:\n'));

  for (const [category, categoryTemplates] of Object.entries(filteredCategories)) {
    console.log(chalk.bold.cyan(`${getCategoryIcon(category)} ${category}`));
    console.log(chalk.dim(`   ${categoryTemplates.length} template(s)\n`));

    for (const template of categoryTemplates) {
      displayCompactTemplate(template, '   ');
    }
    console.log('');
  }
}

function displayDetailedTemplate(template: TemplateMetadata): void {
  const complexityIcon = getComplexityIcon(template.complexity);
  const rating = template.rating ? `⭐ ${template.rating}/5.0` : '';
  
  console.log(`${chalk.bold.cyan(template.name)} ${chalk.dim(`(${template.id})`)}`);
  console.log(`   ${chalk.dim(template.description)}`);
  console.log('');
  
  console.log(`   Framework: ${chalk.green(template.framework)}`);
  console.log(`   Complexity: ${complexityIcon} ${template.complexity}`);
  console.log(`   Setup time: ⏱️  ${template.estimatedSetupTime} minutes`);
  if (rating) {
    console.log(`   Rating: ${rating}`);
  }
  if (template.downloadCount) {
    console.log(`   Downloads: 📥 ${template.downloadCount.toLocaleString()}`);
  }
  console.log(`   Version: ${template.version}`);
  console.log(`   Author: ${template.author}`);
  console.log('');

  if (template.dnaModules.length > 0) {
    console.log(`   DNA Modules: ${template.dnaModules.map(m => chalk.blue(m)).join(', ')}`);
  }

  if (template.tags.length > 0) {
    console.log(`   Tags: ${template.tags.map(tag => chalk.yellow(`#${tag}`)).join(' ')}`);
  }

  if (template.features.length > 0) {
    console.log(`   Features:`);
    template.features.slice(0, 3).forEach(feature => {
      console.log(`     ✅ ${feature}`);
    });
    if (template.features.length > 3) {
      console.log(`     ${chalk.dim(`... and ${template.features.length - 3} more`)}`);
    }
  }

  console.log('');
  console.log(chalk.dim('─'.repeat(80)));
  console.log('');
}

function displayCompactTemplate(template: TemplateMetadata, indent: string = ''): void {
  const complexityIcon = getComplexityIcon(template.complexity);
  const rating = template.rating ? `⭐ ${template.rating}` : '';
  const setupTime = `⏱️  ${template.estimatedSetupTime}min`;
  
  console.log(`${indent}${chalk.cyan(template.name)} ${chalk.dim(`(${template.framework})`)} ${complexityIcon} ${setupTime} ${rating}`);
  console.log(`${indent}   ${chalk.dim(template.description)}`);
  
  if (template.dnaModules.length > 0) {
    const modules = template.dnaModules.slice(0, 3).map(m => chalk.blue(m)).join(', ');
    const extra = template.dnaModules.length > 3 ? chalk.dim(` +${template.dnaModules.length - 3} more`) : '';
    console.log(`${indent}   🧬 ${modules}${extra}`);
  }
  
  console.log('');
}

function getComplexityIcon(complexity: string): string {
  switch (complexity) {
    case 'beginner':
      return '🟢';
    case 'intermediate':
      return '🟡';
    case 'advanced':
      return '🔴';
    default:
      return '⚪';
  }
}

function getCategoryIcon(category: string): string {
  switch (category.toLowerCase()) {
    case 'ai native':
      return '🤖';
    case 'performance':
      return '⚡';
    case 'cross platform':
      return '🌐';
    case 'foundation':
      return '🏗️';
    default:
      return '📁';
  }
}