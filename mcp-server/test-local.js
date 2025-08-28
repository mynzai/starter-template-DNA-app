#!/usr/bin/env node

/**
 * Local test script for DNA CLI MCP Server
 * Run this to test the server without Claude Desktop
 */

import { spawn } from 'child_process';

console.log('🧪 Testing DNA CLI MCP Server locally...\n');

// Start the MCP server
const server = spawn('node', ['dist/dna-cli-mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test messages to send
const testMessages = [
  // List available tools
  {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  },
  // Test listing templates
  {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'dna_list',
      arguments: {
        category: 'ai-native'
      }
    }
  }
];

// Handle server output
server.stdout.on('data', (data) => {
  try {
    const lines = data.toString().split('\n').filter(line => line.trim());
    lines.forEach(line => {
      if (line.startsWith('{')) {
        const response = JSON.parse(line);
        console.log('📥 Response:', JSON.stringify(response, null, 2));
      }
    });
  } catch (e) {
    console.log('📝 Server output:', data.toString());
  }
});

server.stderr.on('data', (data) => {
  console.log('⚠️  Server error:', data.toString());
});

server.on('close', (code) => {
  console.log(`\n✅ Server process exited with code ${code}`);
});

// Send test messages
setTimeout(() => {
  console.log('📤 Sending test message: List tools\n');
  server.stdin.write(JSON.stringify(testMessages[0]) + '\n');
}, 1000);

setTimeout(() => {
  console.log('\n📤 Sending test message: List AI templates\n');
  server.stdin.write(JSON.stringify(testMessages[1]) + '\n');
}, 2000);

// Exit after tests
setTimeout(() => {
  console.log('\n🏁 Tests complete. Closing server...');
  server.kill();
  process.exit(0);
}, 5000);