#!/usr/bin/env node

/**
 * Git Auto-Commit Helper
 * Provides Git automation when the main CLI is not available
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration files
const CONFIG_FILE = '.dna-git-config.json';
const SESSION_FILE = '.dna-current-session.json';
const ROLLBACK_FILE = '.dna-git-rollback.json';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper functions
function loadJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function saveJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, silent = false) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (!silent) {
      console.log(output.trim());
    }
    return output.trim();
  } catch (error) {
    if (!silent) {
      log(`Error executing command: ${command}`, 'red');
      console.error(error.message);
    }
    throw error;
  }
}

// Git automation functions
class GitAutomation {
  constructor() {
    this.config = loadJsonFile(CONFIG_FILE) || this.getDefaultConfig();
    this.session = loadJsonFile(SESSION_FILE);
  }

  getDefaultConfig() {
    return {
      automation: {
        enabled: true,
        autoCommit: true,
        pushRemote: false,
        requireTests: false,
        commitOnProgress: true,
        commitOnTestSuccess: true,
        commitOnSessionEnd: true
      }
    };
  }

  isEnabled() {
    return this.config.automation.enabled && this.config.automation.autoCommit;
  }

  hasChanges() {
    try {
      const status = execCommand('git status --porcelain', true);
      return status.length > 0;
    } catch (error) {
      return false;
    }
  }

  createRollbackPoint() {
    try {
      const commitHash = execCommand('git rev-parse HEAD', true);
      const branch = execCommand('git branch --show-current', true);
      
      const rollback = {
        timestamp: new Date().toISOString(),
        commitHash,
        branch,
        sessionId: this.session?.id || 'manual'
      };
      
      saveJsonFile(ROLLBACK_FILE, rollback);
      log(`Created rollback point at commit: ${commitHash}`, 'blue');
    } catch (error) {
      log('No previous commits for rollback point', 'yellow');
    }
  }

  runPreCommitChecks() {
    log('Running pre-commit checks...', 'blue');
    
    // Check for blocked patterns
    const blockedPatterns = this.config.validation?.blockedPatterns || [
      '*.key', '*.pem', '*.p12', '.env.local', '.env.production', 
      'secrets.json', 'credentials.json'
    ];
    
    try {
      const files = execCommand('git diff --cached --name-only', true).split('\n').filter(f => f);
      
      for (const file of files) {
        for (const pattern of blockedPatterns) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          if (regex.test(file)) {
            log(`Blocked file detected: ${file}`, 'red');
            return false;
          }
        }
        
        // Check file size
        if (fs.existsSync(file)) {
          const stats = fs.statSync(file);
          const maxSize = this.config.validation?.maxFileSize || 10485760; // 10MB
          if (stats.size > maxSize) {
            log(`Large file detected: ${file} (${(stats.size / 1048576).toFixed(2)}MB)`, 'red');
            return false;
          }
        }
      }
    } catch (error) {
      // If no cached files, that's okay
    }
    
    log('Pre-commit checks passed', 'green');
    return true;
  }

  generateCommitMessage(type = 'progress') {
    if (!this.session) {
      return 'chore: automated commit';
    }

    const { epic, story } = this.session;
    const { filesModified = 0, testsAdded = 0 } = this.session.progress || {};
    const { coverage = 0 } = this.session.metrics || {};
    
    const templates = {
      progress: `chore(${epic}): progress update - ${filesModified} files modified, ${testsAdded} tests added`,
      'test-success': `test(${epic}): all tests passing - ${coverage}% coverage achieved`,
      'session-complete': `feat(${epic}-${story}): complete story implementation

Auto-generated commit for session completion
${filesModified} files modified, ${testsAdded} tests added, ${coverage}% coverage

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>`,
      manual: `chore(${epic}): manual commit via git automation`
    };
    
    return templates[type] || templates.manual;
  }

  async performAutoCommit(type = 'progress') {
    if (!this.isEnabled()) {
      log('Auto-commit is disabled', 'yellow');
      return false;
    }

    if (!this.hasChanges()) {
      log('No changes to commit', 'yellow');
      return false;
    }

    try {
      // Create rollback point
      this.createRollbackPoint();
      
      // Run pre-commit checks
      if (!this.runPreCommitChecks()) {
        log('Pre-commit checks failed. Commit aborted.', 'red');
        return false;
      }
      
      // Stage all changes
      log('Staging changes...', 'blue');
      execCommand('git add -A');
      
      // Generate commit message
      const message = this.generateCommitMessage(type);
      
      // Perform commit
      log('Creating commit...', 'blue');
      execCommand(`git commit -m "${message.replace(/"/g, '\\"')}"`);
      
      log('Auto-commit successful!', 'green');
      
      // Update session if needed
      if (this.session && type === 'progress') {
        if (!this.session.progress.gitCommits) {
          this.session.progress.gitCommits = 0;
        }
        this.session.progress.gitCommits++;
        saveJsonFile(SESSION_FILE, this.session);
      }
      
      return true;
    } catch (error) {
      log('Auto-commit failed', 'red');
      console.error(error);
      return false;
    }
  }

  showStatus() {
    log('=== Git Automation Status ===', 'blue');
    log(`Config file: ${CONFIG_FILE}`);
    log(`Auto-commit enabled: ${this.isEnabled() ? 'Yes' : 'No'}`, this.isEnabled() ? 'green' : 'red');
    
    if (this.session) {
      log('\nCurrent Session:', 'blue');
      log(`Epic: ${this.session.epic}`);
      log(`Story: ${this.session.story}`);
      log(`Status: ${this.session.status}`);
      log(`Files modified: ${this.session.progress?.filesModified || 0}`);
      log(`Tests added: ${this.session.progress?.testsAdded || 0}`);
    }
    
    log('\nGit Status:', 'blue');
    try {
      execCommand('git status --short');
    } catch (error) {
      log('Unable to get git status', 'red');
    }
  }

  enable() {
    this.config.automation.autoCommit = true;
    saveJsonFile(CONFIG_FILE, this.config);
    log('Auto-commit enabled', 'green');
  }

  disable() {
    this.config.automation.autoCommit = false;
    saveJsonFile(CONFIG_FILE, this.config);
    log('Auto-commit disabled', 'yellow');
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const automation = new GitAutomation();

  switch (command) {
    case 'commit':
    case 'auto-commit':
      const type = args[1] || 'progress';
      automation.performAutoCommit(type);
      break;
      
    case 'status':
      automation.showStatus();
      break;
      
    case 'enable':
      automation.enable();
      break;
      
    case 'disable':
      automation.disable();
      break;
      
    case 'help':
      console.log(`
DNA Git Automation Helper

Usage: node scripts/git-auto-commit.js [command] [options]

Commands:
  commit [type]    Perform auto-commit (types: progress, test-success, session-complete, manual)
  status           Show automation status
  enable           Enable auto-commit
  disable          Disable auto-commit
  help             Show this help message

Examples:
  node scripts/git-auto-commit.js commit progress
  node scripts/git-auto-commit.js status
  node scripts/git-auto-commit.js enable
`);
      break;
      
    default:
      log(`Unknown command: ${command}`, 'red');
      log('Use "help" for usage information');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}