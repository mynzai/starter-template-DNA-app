/**
 * @fileoverview CLI Theme Configuration - Customizable visual settings
 */

import chalk from 'chalk';

export interface CLITheme {
  name: string;
  colors: {
    primary: chalk.Chalk;
    secondary: chalk.Chalk;
    success: chalk.Chalk;
    error: chalk.Chalk;
    warning: chalk.Chalk;
    info: chalk.Chalk;
    muted: chalk.Chalk;
    highlight: chalk.Chalk;
  };
  icons: {
    success: string;
    error: string;
    warning: string;
    info: string;
    debug: string;
    step: string;
    bullet: string;
    arrow: string;
    check: string;
    cross: string;
    star: string;
    folder: string;
    file: string;
    package: string;
    rocket: string;
    gear: string;
    sparkles: string;
    fire: string;
    clock: string;
    zap: string;
  };
  spinners: {
    default: string;
    dots: string;
    line: string;
    star: string;
  };
  progressBar: {
    complete: string;
    incomplete: string;
    head: string;
    width: number;
  };
  box: {
    defaultStyle: 'single' | 'double' | 'round' | 'bold' | 'classic';
    padding: number;
    margin: number;
  };
}

// Default theme
export const defaultTheme: CLITheme = {
  name: 'default',
  colors: {
    primary: chalk.cyan,
    secondary: chalk.gray,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    muted: chalk.gray,
    highlight: chalk.bold.cyan,
  },
  icons: {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ',
    debug: '🐛',
    step: '→',
    bullet: '•',
    arrow: '➜',
    check: '✓',
    cross: '✗',
    star: '★',
    folder: '📁',
    file: '📄',
    package: '📦',
    rocket: '🚀',
    gear: '⚙',
    sparkles: '✨',
    fire: '🔥',
    clock: '⏰',
    zap: '⚡',
  },
  spinners: {
    default: 'dots',
    dots: 'dots',
    line: 'line',
    star: 'star',
  },
  progressBar: {
    complete: '█',
    incomplete: '░',
    head: '▓',
    width: 20,
  },
  box: {
    defaultStyle: 'round',
    padding: 1,
    margin: 1,
  },
};

// Minimal theme (no emojis, simple characters)
export const minimalTheme: CLITheme = {
  name: 'minimal',
  colors: {
    primary: chalk.white,
    secondary: chalk.gray,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    muted: chalk.gray,
    highlight: chalk.bold.white,
  },
  icons: {
    success: '[✓]',
    error: '[✗]',
    warning: '[!]',
    info: '[i]',
    debug: '[D]',
    step: '>',
    bullet: '-',
    arrow: '->',
    check: '[✓]',
    cross: '[✗]',
    star: '*',
    folder: '[D]',
    file: '[F]',
    package: '[P]',
    rocket: '[>]',
    gear: '[*]',
    sparkles: '*',
    fire: '*',
    clock: '[T]',
    zap: '[!]',
  },
  spinners: {
    default: 'line',
    dots: 'dots',
    line: 'line',
    star: 'star',
  },
  progressBar: {
    complete: '=',
    incomplete: '-',
    head: '>',
    width: 30,
  },
  box: {
    defaultStyle: 'single',
    padding: 1,
    margin: 0,
  },
};

// Neon theme (bright colors, modern look)
export const neonTheme: CLITheme = {
  name: 'neon',
  colors: {
    primary: chalk.hex('#00FFFF'),
    secondary: chalk.hex('#FF00FF'),
    success: chalk.hex('#00FF00'),
    error: chalk.hex('#FF0066'),
    warning: chalk.hex('#FFFF00'),
    info: chalk.hex('#0099FF'),
    muted: chalk.hex('#666666'),
    highlight: chalk.bold.hex('#00FFFF'),
  },
  icons: {
    success: '⚡',
    error: '💥',
    warning: '🔥',
    info: '💡',
    debug: '🔍',
    step: '▶',
    bullet: '◆',
    arrow: '➔',
    check: '✅',
    cross: '❌',
    star: '⭐',
    folder: '📂',
    file: '📝',
    package: '📦',
    rocket: '🚀',
    gear: '⚙️',
    sparkles: '✨',
    fire: '🔥',
    clock: '⏱️',
    zap: '⚡',
  },
  spinners: {
    default: 'dots',
    dots: 'dots',
    line: 'line',
    star: 'star',
  },
  progressBar: {
    complete: '▓',
    incomplete: '░',
    head: '▒',
    width: 25,
  },
  box: {
    defaultStyle: 'double',
    padding: 2,
    margin: 1,
  },
};

// Theme manager
export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: CLITheme;
  private themes: Map<string, CLITheme>;

  private constructor() {
    this.themes = new Map([
      ['default', defaultTheme],
      ['minimal', minimalTheme],
      ['neon', neonTheme],
    ]);
    this.currentTheme = defaultTheme;
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  getTheme(): CLITheme {
    return this.currentTheme;
  }

  setTheme(themeName: string): void {
    const theme = this.themes.get(themeName);
    if (theme) {
      this.currentTheme = theme;
    } else {
      throw new Error(`Theme "${themeName}" not found`);
    }
  }

  registerTheme(theme: CLITheme): void {
    this.themes.set(theme.name, theme);
  }

  getAvailableThemes(): string[] {
    return Array.from(this.themes.keys());
  }

  // Apply theme from environment or config
  applyFromEnvironment(): void {
    const themeName = process.env.DNA_CLI_THEME;
    if (themeName && this.themes.has(themeName)) {
      this.setTheme(themeName);
    }
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();