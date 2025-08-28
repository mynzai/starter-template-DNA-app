# DNA CLI MCP Server

This MCP (Model Context Protocol) server provides Claude Desktop integration with the DNA Template CLI, allowing Claude to directly execute DNA CLI commands and manage projects.

## 🚀 Quick Installation

```bash
# Navigate to the MCP server directory
cd mcp-server

# Run the installation script
./install.sh
```

The installation script will:
1. Check/install DNA CLI globally
2. Install MCP server dependencies
3. Build the TypeScript server
4. Configure Claude Desktop automatically
5. Create necessary configuration files

## 🛠️ Manual Installation

If you prefer manual setup or the script doesn't work:

### Step 1: Install Dependencies
```bash
cd mcp-server
npm install
npm run build
```

### Step 2: Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dna-cli": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/dna-cli-mcp-server.js"],
      "env": {
        "PATH": "/usr/local/bin:/usr/bin:/bin"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

## 📋 Available Tools

Once installed, Claude will have access to these DNA CLI tools:

### Project Management
- **`dna_create`** - Create new projects from templates
- **`dna_list`** - Browse templates and modules
- **`dna_add`** - Add DNA modules to existing projects
- **`dna_validate`** - Validate project structure and quality

### Development Workflow
- **`dna_test`** - Run comprehensive tests with quality gates
- **`dna_track`** - Track development sessions and progress
- **`dna_quality`** - Check quality scores and benchmarks
- **`dna_git`** - Automate Git workflows

### Utilities
- **`dna_compatibility`** - Check module compatibility
- **`dna_update`** - Update CLI and templates

## 💡 Usage Examples in Claude

Once installed, you can ask Claude to:

### Create Projects
```
"Create a new AI SaaS project called my-app using the DNA CLI"
"Make a Flutter mobile app with authentication and payments"
"Generate a high-performance API with Rust"
```

### Explore Templates
```
"Show me available AI templates using DNA CLI"
"List all cross-platform templates"
"What DNA modules are available for authentication?"
```

### Development Workflow
```
"Start tracking a new feature for user authentication"
"Add Stripe payments to my existing project"
"Run quality checks on my project"
"Check if auth-jwt and payments-stripe modules are compatible"
```

## 🔧 Tool Parameters

### dna_create
```typescript
{
  projectName: string;        // Required: Name of the project
  template?: string;          // Template to use (e.g., 'ai-saas-nextjs')
  framework?: string;         // Target framework
  modules?: string;           // Comma-separated DNA modules
  output?: string;            // Output directory
  packageManager?: string;    // npm, yarn, pnpm, bun
  skipInstall?: boolean;      // Skip dependency installation
  skipGit?: boolean;          // Skip git initialization
  dryRun?: boolean;           // Preview without creating files
}
```

### dna_track
```typescript
{
  action: 'start' | 'progress' | 'end' | 'status' | 'report';
  epic?: string;              // Epic identifier
  story?: string;             // Story identifier  
  type?: string;              // feature, bugfix, refactor, testing
  notes?: string;             // Session notes
  filesModified?: number;     // For progress updates
  testsAdded?: number;        // For progress updates
  coverage?: number;          // Test coverage percentage
  status?: string;            // completed or failed
  qualityGatesStatus?: string;// passed, failed, partial
}
```

### dna_quality
```typescript
{
  action: 'check' | 'score' | 'benchmark';
  projectPath?: string;       // Project to analyze
  framework?: string;         // Target framework
  threshold?: number;         // Minimum quality threshold
  detailed?: boolean;         // Show detailed results
  output?: string;            // Output file for results
}
```

## 🐛 Troubleshooting

### Server Not Responding
1. Check if DNA CLI is installed: `npm list -g dna-template-cli`
2. Verify Claude Desktop is restarted after configuration
3. Check logs in Claude Desktop developer console

### Permission Errors
```bash
# Ensure the server has execution permissions
chmod +x mcp-server/dist/dna-cli-mcp-server.js

# Check Node.js is in PATH
which node
```

### Configuration Issues
```bash
# Verify configuration file exists
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Check if dna-cli server is listed
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | grep dna-cli
```

## 🔄 Updating

To update the MCP server:

```bash
cd mcp-server
git pull
npm install
npm run build
# Restart Claude Desktop
```

## 📝 Development

To modify the MCP server:

```bash
# Watch mode for development
npm run dev

# Test locally
node dist/dna-cli-mcp-server.js

# Check TypeScript
npx tsc --noEmit
```

## 🤝 Contributing

To add new DNA CLI commands to the MCP server:

1. Add tool definition in `dna-cli-mcp-server.ts`
2. Implement handler in the switch statement
3. Update tool list in `tools/list` handler
4. Build and test: `npm run build`
5. Update this README with new tool documentation

## 📄 License

MIT License - Part of the DNA Template CLI ecosystem