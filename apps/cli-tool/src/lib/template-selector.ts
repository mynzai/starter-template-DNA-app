/**
 * @fileoverview Interactive Template Selection Interface
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { TemplateMetadata, TemplateFilterOptions } from '../types/cli';
import { TemplateRegistry } from './template-registry';
import { SupportedFramework, TemplateType } from '@dna/core';

export interface TemplateSelectionOptions {
  showCategories?: boolean;
  showFilters?: boolean;
  showRecommended?: boolean;
  allowSearch?: boolean;
  maxResults?: number;
}

export class TemplateSelector {
  constructor(private registry: TemplateRegistry) {}

  async selectTemplate(options: TemplateSelectionOptions = {}): Promise<TemplateMetadata | null> {
    const {
      showCategories = true,
      showFilters = true,
      showRecommended = true,
      allowSearch = true,
      maxResults = 20,
    } = options;

    // Check if we have templates
    const allTemplates = this.registry.getTemplates();
    if (allTemplates.length === 0) {
      console.log(chalk.yellow('⚠️  No templates found. Please check your template registry.'));
      return null;
    }

    // Show initial options
    const action = await this.askForAction({
      showCategories,
      showFilters,
      showRecommended,
      allowSearch,
    });

    switch (action) {
      case 'browse':
        return this.browseTemplates(maxResults);
      case 'categories':
        return this.selectByCategory();
      case 'search':
        return this.searchTemplates();
      case 'filter':
        return this.filterTemplates();
      case 'recommended':
        return this.selectRecommended();
      default:
        return null;
    }
  }

  private async askForAction(options: {
    showCategories: boolean;
    showFilters: boolean;
    showRecommended: boolean;
    allowSearch: boolean;
  }): Promise<string> {
    const choices = [
      {
        name: '📋 Browse all templates',
        value: 'browse',
        short: 'Browse',
      },
    ];

    if (options.showCategories) {
      choices.push({
        name: '📂 Browse by category',
        value: 'categories',
        short: 'Categories',
      });
    }

    if (options.allowSearch) {
      choices.push({
        name: '🔍 Search templates',
        value: 'search',
        short: 'Search',
      });
    }

    if (options.showFilters) {
      choices.push({
        name: '🎯 Filter templates',
        value: 'filter',
        short: 'Filter',
      });
    }

    if (options.showRecommended) {
      choices.push({
        name: '⭐ Show recommended',
        value: 'recommended',
        short: 'Recommended',
      });
    }

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'How would you like to find your template?',
        choices,
        pageSize: 10,
      },
    ]);

    return action;
  }

  private async browseTemplates(maxResults: number): Promise<TemplateMetadata | null> {
    const templates = this.registry.getTemplates().slice(0, maxResults);
    return this.selectFromTemplateList(templates, 'Select a template:');
  }

  private async selectByCategory(): Promise<TemplateMetadata | null> {
    const categories = this.registry.getTemplatesByCategory();
    const categoryNames = Object.keys(categories);

    if (categoryNames.length === 0) {
      console.log(chalk.yellow('No template categories found.'));
      return null;
    }

    const { selectedCategory } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedCategory',
        message: 'Select a category:',
        choices: categoryNames.map(name => ({
          name: `${name} (${categories[name]?.length || 0} templates)`,
          value: name,
          short: name,
        })),
      },
    ]);

    const templates = categories[selectedCategory] || [];
    return this.selectFromTemplateList(templates, `Select a ${selectedCategory} template:`);
  }

  private async searchTemplates(): Promise<TemplateMetadata | null> {
    const { query } = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: 'Enter search terms:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Please enter a search term.';
          }
          return true;
        },
      },
    ]);

    const results = this.registry.searchTemplates(query.trim());

    if (results.length === 0) {
      console.log(chalk.yellow(`No templates found matching "${query}".`));
      
      // Offer to browse all templates
      const { browseFallback } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'browseFallback',
          message: 'Would you like to browse all templates instead?',
          default: true,
        },
      ]);

      if (browseFallback) {
        return this.browseTemplates(20);
      }
      return null;
    }

    console.log(chalk.green(`Found ${results.length} template(s) matching "${query}"`));
    return this.selectFromTemplateList(results, 'Select from search results:');
  }

  private async filterTemplates(): Promise<TemplateMetadata | null> {
    const filters = await this.collectFilters();
    const filtered = this.registry.filterTemplates(filters);

    if (filtered.length === 0) {
      console.log(chalk.yellow('No templates match your filters.'));
      return null;
    }

    console.log(chalk.green(`Found ${filtered.length} template(s) matching your filters`));
    return this.selectFromTemplateList(filtered, 'Select from filtered results:');
  }

  private async collectFilters(): Promise<TemplateFilterOptions> {
    const filters: TemplateFilterOptions = {};

    // Framework filter
    const frameworks = this.registry.getAvailableFrameworks();
    const { selectedFramework } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedFramework',
        message: 'Filter by framework:',
        choices: [
          { name: 'Any framework', value: null },
          ...frameworks.map(f => ({ name: f, value: f })),
        ],
      },
    ]);
    if (selectedFramework) filters.framework = selectedFramework;

    // Complexity filter
    const { selectedComplexity } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedComplexity',
        message: 'Filter by complexity:',
        choices: [
          { name: 'Any complexity', value: null },
          { name: 'Beginner', value: 'beginner' },
          { name: 'Intermediate', value: 'intermediate' },
          { name: 'Advanced', value: 'advanced' },
        ],
      },
    ]);
    if (selectedComplexity) filters.complexity = selectedComplexity;

    // DNA modules filter
    const availableModules = this.registry.getAvailableDnaModules();
    if (availableModules.length > 0) {
      const { selectedModules } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'selectedModules',
          message: 'Filter by DNA modules (optional):',
          choices: availableModules.map(module => ({ name: module, value: module })),
          pageSize: 10,
        },
      ]);
      if (selectedModules.length > 0) filters.dnaModules = selectedModules;
    }

    // Setup time filter
    const { maxSetupTime } = await inquirer.prompt([
      {
        type: 'list',
        name: 'maxSetupTime',
        message: 'Maximum setup time:',
        choices: [
          { name: 'Any setup time', value: null },
          { name: 'Quick (≤ 5 minutes)', value: 5 },
          { name: 'Medium (≤ 10 minutes)', value: 10 },
          { name: 'Long (≤ 20 minutes)', value: 20 },
        ],
      },
    ]);
    if (maxSetupTime) filters.maxSetupTime = maxSetupTime;

    return filters;
  }

  private async selectRecommended(): Promise<TemplateMetadata | null> {
    const recommended = this.registry.getRecommendedTemplates();

    if (recommended.length === 0) {
      console.log(chalk.yellow('No recommended templates available.'));
      return this.browseTemplates(20);
    }

    console.log(chalk.green('✨ Recommended templates (highest rated):'));
    return this.selectFromTemplateList(recommended, 'Select a recommended template:');
  }

  private async selectFromTemplateList(
    templates: TemplateMetadata[],
    message: string
  ): Promise<TemplateMetadata | null> {
    if (templates.length === 0) {
      return null;
    }

    if (templates.length === 1) {
      const template = templates[0];
      if (template) {
        console.log(chalk.cyan(`\n📦 ${template.name}`));
        this.displayTemplateDetails(template);
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Use this template?',
          default: true,
        },
      ]);

        return confirm ? template : null;
      }
    }

    const { selectedTemplate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedTemplate',
        message,
        choices: templates.map(template => ({
          name: this.formatTemplateChoice(template),
          value: template.id,
          short: template.name,
        })),
        pageSize: 15,
      },
    ]);

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return null;

    // Show details and confirm
    console.log('');
    this.displayTemplateDetails(template);
    
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Use this template?',
        default: true,
      },
    ]);

    return confirm ? template : null;
  }

  private formatTemplateChoice(template: TemplateMetadata): string {
    const rating = template.rating ? `⭐ ${template.rating}` : '';
    const complexity = this.getComplexityIcon(template.complexity);
    const setupTime = `⏱️  ${template.estimatedSetupTime}min`;
    
    return `${chalk.cyan(template.name)} ${chalk.gray(`(${template.framework})`)} ${complexity} ${setupTime} ${rating}\n   ${chalk.dim(template.description)}`;
  }

  private displayTemplateDetails(template: TemplateMetadata): void {
    console.log(chalk.bold(`📦 ${template.name}`));
    console.log(`   ${chalk.dim(template.description)}`);
    console.log('');
    
    console.log(chalk.bold('Details:'));
    console.log(`   Framework: ${chalk.cyan(template.framework)}`);
    console.log(`   Complexity: ${this.getComplexityIcon(template.complexity)} ${template.complexity}`);
    console.log(`   Setup time: ⏱️  ${template.estimatedSetupTime} minutes`);
    if (template.rating) {
      console.log(`   Rating: ⭐ ${template.rating}/5.0`);
    }
    console.log(`   Version: ${template.version}`);
    console.log('');

    if (template.dnaModules.length > 0) {
      console.log(chalk.bold('DNA Modules:'));
      template.dnaModules.forEach(module => {
        console.log(`   🧬 ${module}`);
      });
      console.log('');
    }

    if (template.features.length > 0) {
      console.log(chalk.bold('Features:'));
      template.features.slice(0, 5).forEach(feature => {
        console.log(`   ✅ ${feature}`);
      });
      if (template.features.length > 5) {
        console.log(`   ${chalk.dim(`   ... and ${template.features.length - 5} more`)}`);
      }
      console.log('');
    }

    if (template.tags.length > 0) {
      console.log(chalk.bold('Tags:'));
      console.log(`   ${template.tags.map(tag => chalk.blue(`#${tag}`)).join(' ')}`);
      console.log('');
    }
  }

  private getComplexityIcon(complexity: string): string {
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

  async selectDnaModules(availableModules: string[], preselected: string[] = []): Promise<string[]> {
    if (availableModules.length === 0) {
      return [];
    }

    const { selectedModules } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedModules',
        message: 'Select DNA modules to include:',
        choices: availableModules.map(module => ({
          name: `🧬 ${module}`,
          value: module,
          checked: preselected.includes(module),
        })),
        pageSize: 12,
      },
    ]);

    return selectedModules;
  }

  async collectTemplateVariables(template: TemplateMetadata, projectName: string): Promise<Record<string, string>> {
    const variables: Record<string, string> = {
      projectName,
      projectNamePascal: this.toPascalCase(projectName),
      projectNameKebab: this.toKebabCase(projectName),
      year: new Date().getFullYear().toString(),
      date: new Date().toISOString().split('T')[0] || '',
    };

    if (!template.variables || template.variables.length === 0) {
      return variables;
    }

    console.log(chalk.bold('\n📝 Template Configuration:'));
    
    for (const variable of template.variables) {
      if (variable.required && !variables[variable.name]) {
        const prompt: any = {
          type: variable.type === 'boolean' ? 'confirm' : 'input',
          name: variable.name,
          message: variable.description,
        };

        if (variable.default) {
          prompt.default = variable.default;
        }

        if (variable.type === 'select' && variable.options) {
          prompt.type = 'list';
          prompt.choices = variable.options;
        }

        if (!variable.sensitive) {
          const { [variable.name]: value } = await inquirer.prompt([prompt]);
          variables[variable.name] = value?.toString() || '';
        } else {
          // For sensitive variables, allow skipping with a note
          const { shouldSet } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'shouldSet',
              message: `Set ${variable.description} now? (can be added later to environment)`,
              default: false,
            },
          ]);

          if (shouldSet) {
            const { [variable.name]: value } = await inquirer.prompt([
              {
                ...prompt,
                type: 'password',
                mask: '*',
              },
            ]);
            variables[variable.name] = value?.toString() || '';
          }
        }
      }
    }

    return variables;
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
      .replace(/^(.)/, char => char.toUpperCase());
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');
  }
}