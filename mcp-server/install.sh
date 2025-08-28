#!/bin/bash

# DNA CLI MCP Server Installation Script
# This script installs and configures the MCP server for Claude Desktop

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MCP_CONFIG_DIR="$HOME/Library/Application Support/Claude"
MCP_CONFIG_FILE="$MCP_CONFIG_DIR/claude_desktop_config.json"

echo "🧬 DNA CLI MCP Server Installation"
echo "=================================="
echo ""

# Step 1: Check if DNA CLI is installed
echo "📦 Checking DNA CLI installation..."
if ! command -v dna-cli &> /dev/null && ! command -v dna &> /dev/null; then
    echo "⚠️  DNA CLI not found. Installing..."
    npm install -g dna-template-cli
else
    echo "✅ DNA CLI is installed"
fi

# Step 2: Install MCP server dependencies
echo ""
echo "📦 Installing MCP server dependencies..."
cd "$SCRIPT_DIR"
npm install

# Step 3: Build the MCP server
echo ""
echo "🔨 Building MCP server..."
npm run build

# Step 4: Create Claude Desktop config directory if it doesn't exist
echo ""
echo "📁 Setting up Claude Desktop configuration..."
mkdir -p "$MCP_CONFIG_DIR"

# Step 5: Get the server path
SERVER_PATH="$SCRIPT_DIR/dist/dna-cli-mcp-server.js"

# Step 6: Create or update Claude Desktop config
echo ""
echo "⚙️  Configuring Claude Desktop..."

if [ -f "$MCP_CONFIG_FILE" ]; then
    echo "Existing configuration found. Creating backup..."
    cp "$MCP_CONFIG_FILE" "$MCP_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Use Node.js to merge the configuration
    node -e "
    const fs = require('fs');
    const configPath = '$MCP_CONFIG_FILE';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.mcpServers) {
        config.mcpServers = {};
    }
    
    config.mcpServers['dna-cli'] = {
        command: 'node',
        args: ['$SERVER_PATH'],
        env: {
            PATH: process.env.PATH
        }
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Configuration updated successfully');
    "
else
    # Create new configuration
    cat > "$MCP_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "dna-cli": {
      "command": "node",
      "args": ["$SERVER_PATH"],
      "env": {
        "PATH": "$PATH"
      }
    }
  }
}
EOF
    echo "✅ Configuration created successfully"
fi

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Restart Claude Desktop application"
echo "2. The DNA CLI tools will be available in your Claude sessions"
echo ""
echo "🔧 Available Tools in Claude:"
echo "  • dna_create - Create new projects"
echo "  • dna_list - List templates and modules"
echo "  • dna_add - Add modules to projects"
echo "  • dna_validate - Validate project quality"
echo "  • dna_test - Run comprehensive tests"
echo "  • dna_track - Track development sessions"
echo "  • dna_quality - Check quality scores"
echo "  • dna_git - Git automation"
echo "  • dna_compatibility - Check module compatibility"
echo "  • dna_update - Update CLI and templates"
echo ""
echo "💡 Example usage in Claude:"
echo "  'Use dna_list to show AI templates'"
echo "  'Use dna_create to make a new AI SaaS project called my-app'"
echo ""