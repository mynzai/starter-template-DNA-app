# MCP Integration Guide

This document describes how to use Model Context Protocol (MCP) servers within the Starter Template DNA App ecosystem.

## Overview

The DNA App now includes comprehensive MCP integration support, allowing templates to interact with your Claude Desktop MCP servers for enhanced functionality:

- **Docker MCP**: Container management and deployment automation
- **Supabase MCP**: Database operations and backend services
- **Context7 MCP**: Conversation context management and semantic search
- **Playwright MCP**: Browser automation and end-to-end testing

## Available MCP Modules

### 1. Docker MCP Module (`docker-mcp`)

Provides container management capabilities through your Docker MCP server.

**Features:**
- Container lifecycle management (create, start, stop, delete)
- Docker Compose integration
- Container command execution
- Container listing and monitoring

**Usage:**
```typescript
import { DockerMCPModule } from '@starter-template-dna/dna-modules/mcp';

const dockerModule = new DockerMCPModule({
  enabled: true,
  containerRegistry: 'docker.io',
  defaultNetwork: 'bridge',
  volumeMounts: [
    { host: './data', container: '/app/data', mode: 'rw' }
  ]
});

await dockerModule.initialize();

// Create and start a container
const containerId = await dockerModule.createContainer({
  image: 'nginx:latest',
  name: 'web-server',
  ports: { '80': '8080' }
});

await dockerModule.startContainer(containerId);
```

### 2. Supabase MCP Module (`supabase-mcp`)

Integrates with Supabase for database operations and backend services.

**Features:**
- Database CRUD operations
- Real-time subscriptions
- Authentication management
- File storage operations
- Table creation and management

**Usage:**
```typescript
import { SupabaseMCPModule } from '@starter-template-dna/dna-modules/mcp';

const supabaseModule = new SupabaseMCPModule({
  enabled: true,
  projectUrl: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key',
  enableRealtime: true,
  enableAuth: true,
  enableStorage: true
});

await supabaseModule.initialize();

// Create a table
await supabaseModule.createTable('users', {
  id: { type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
  email: { type: 'text', unique: true, notNull: true },
  name: { type: 'text' },
  created_at: { type: 'timestamp', default: 'now()' }
});

// Insert data
const users = await supabaseModule.insertData('users', [
  { email: 'user@example.com', name: 'John Doe' }
]);
```

### 3. Context7 MCP Module (`context7-mcp`)

Manages conversation context and provides semantic search capabilities.

**Features:**
- Context storage and retrieval
- Semantic similarity search
- Automatic summarization
- Context categorization
- Time-based filtering

**Usage:**
```typescript
import { Context7MCPModule } from '@starter-template-dna/dna-modules/mcp';

const context7Module = new Context7MCPModule({
  enabled: true,
  maxContextLength: 4000,
  enableAutoSummarization: true,
  enableSemanticSearch: true,
  retentionDays: 30
});

await context7Module.initialize();

// Store context
const contextId = await context7Module.storeContext({
  content: 'User discussed implementing authentication with JWT tokens',
  category: 'development',
  timestamp: new Date(),
  metadata: { project: 'web-app', priority: 'high' }
});

// Search similar contexts
const similar = await context7Module.searchSimilar(
  'authentication implementation',
  { threshold: 0.7, limit: 5 }
);
```

### 4. Playwright MCP Module (`playwright-mcp`)

Enables browser automation and end-to-end testing capabilities.

**Features:**
- Multi-browser support (Chromium, Firefox, WebKit)
- Page automation (navigation, clicking, form filling)
- Screenshot and video recording
- Responsive design testing
- Test generation and execution

**Usage:**
```typescript
import { PlaywrightMCPModule, BrowserAction } from '@starter-template-dna/dna-modules/mcp';

const playwrightModule = new PlaywrightMCPModule({
  enabled: true,
  headless: true,
  viewport: { width: 1280, height: 720 },
  browsers: ['chromium', 'firefox']
});

await playwrightModule.initialize();

// Define test actions
const actions: BrowserAction[] = [
  { type: 'navigate', url: 'http://localhost:3000' },
  { type: 'fill', selector: 'input[name="email"]', value: 'test@example.com' },
  { type: 'fill', selector: 'input[name="password"]', value: 'password123' },
  { type: 'click', selector: 'button[type="submit"]' },
  { type: 'wait', selector: '.dashboard' },
  { type: 'screenshot' }
];

// Run the test
const result = await playwrightModule.runTest(actions);
console.log('Test result:', result.success ? 'PASSED' : 'FAILED');
```

## Template Integration

### Configuration

MCP modules are configured through the DNA module system. Add MCP configuration to your template's `template.json`:

```json
{
  "name": "ai-saas-with-mcp",
  "framework": "nextjs",
  "dnaModules": [
    {
      "id": "supabase-mcp",
      "config": {
        "enabled": true,
        "enableAuth": true,
        "enableRealtime": true
      }
    },
    {
      "id": "playwright-mcp",
      "config": {
        "enabled": true,
        "headless": true
      }
    }
  ]
}
```

### Code Generation

Each MCP module generates framework-specific code:

**Next.js Integration:**
- Service classes for MCP operations
- React hooks for state management
- API routes for server-side operations
- Component providers for context

**Flutter Integration:**
- Service classes with async/await patterns
- Provider classes for state management
- Model classes for data structures
- Integration test setup

**React Native Integration:**
- Service classes with mobile-optimized APIs
- Custom hooks for component integration
- Async storage integration
- Cross-platform compatibility

## MCP Registry Usage

The `MCPModuleRegistry` provides centralized management of all MCP modules:

```typescript
import { mcpRegistry, MCPModuleConfig } from '@starter-template-dna/dna-modules/mcp';

// Initialize all modules
const config: MCPModuleConfig = {
  docker: { enabled: true },
  supabase: { 
    enabled: true, 
    projectUrl: 'https://your-project.supabase.co',
    anonKey: 'your-key'
  },
  context7: { enabled: true },
  playwright: { enabled: true, headless: true }
};

await mcpRegistry.initializeModules(config);

// Use specific modules
const dockerModule = mcpRegistry.getDockerModule();
const supabaseModule = mcpRegistry.getSupabaseModule();

// Cleanup when done
await mcpRegistry.cleanup();
```

## Framework-Specific Examples

### Next.js with Supabase MCP

```typescript
// lib/supabase.ts
import { SupabaseMCPModule } from '@starter-template-dna/dna-modules/mcp';

export const supabase = new SupabaseMCPModule({
  enabled: true,
  projectUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  enableAuth: true
});

// pages/api/users.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const users = await supabase.queryData('users');
    res.json(users);
  } else if (req.method === 'POST') {
    const user = await supabase.insertData('users', [req.body]);
    res.json(user);
  }
}
```

### Flutter with Context7 MCP

```dart
// lib/services/context_service.dart
class ContextService {
  Future<List<ConversationContext>> searchContext(String query) async {
    final response = await http.get(
      Uri.parse('http://localhost:3000/api/context?query=$query'),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['results'] as List)
          .map((item) => ConversationContext.fromJson(item))
          .toList();
    }
    
    throw Exception('Failed to search context');
  }
}
```

## Testing Integration

MCP modules include comprehensive testing support:

### Unit Tests
```typescript
// Test MCP module functionality
describe('DockerMCPModule', () => {
  let dockerModule: DockerMCPModule;

  beforeEach(async () => {
    dockerModule = new DockerMCPModule({ enabled: true });
    await dockerModule.initialize();
  });

  it('should create a container', async () => {
    const containerId = await dockerModule.createContainer({
      image: 'nginx:latest',
      name: 'test-container'
    });
    
    expect(containerId).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// Test full workflow with multiple MCP modules
describe('Full Stack Integration', () => {
  it('should deploy app with database and testing', async () => {
    // Initialize modules
    await mcpRegistry.initializeModules(config);
    
    // Setup database
    const supabase = mcpRegistry.getSupabaseModule()!;
    await supabase.setupAuth();
    
    // Deploy container
    const docker = mcpRegistry.getDockerModule()!;
    const containerId = await docker.createContainer(appConfig);
    
    // Run E2E tests
    const playwright = mcpRegistry.getPlaywrightModule()!;
    const testResult = await playwright.runTest(e2eActions);
    
    expect(testResult.success).toBe(true);
  });
});
```

## Best Practices

### 1. Configuration Management
- Store MCP credentials in environment variables
- Use different configurations for development/production
- Validate configuration before module initialization

### 2. Error Handling
- Implement retry logic for MCP operations
- Handle connection failures gracefully
- Log MCP operations for debugging

### 3. Performance Optimization
- Initialize MCP modules only when needed
- Cache frequently accessed data
- Use connection pooling for database operations

### 4. Security
- Never expose MCP credentials in client-side code
- Use proper authentication for MCP operations
- Implement rate limiting for MCP calls

## Troubleshooting

### Common Issues

**1. MCP Server Connection Failed**
- Verify Claude Desktop MCP servers are running
- Check network connectivity
- Validate MCP server configuration

**2. Authentication Errors**
- Verify API keys and credentials
- Check environment variable configuration
- Ensure proper permissions for MCP operations

**3. Performance Issues**
- Monitor MCP operation latency
- Implement caching where appropriate
- Consider connection pooling

### Debug Mode

Enable debug logging for MCP operations:

```typescript
const dockerModule = new DockerMCPModule({
  enabled: true,
  debug: true // Enable debug logging
});

dockerModule.on('debug', (event) => {
  console.log('MCP Debug:', event);
});
```

## Future Enhancements

- **Additional MCP Servers**: Integration with more MCP servers as they become available
- **Visual MCP Builder**: Drag-and-drop interface for configuring MCP workflows
- **MCP Monitoring**: Dashboard for monitoring MCP operations and performance
- **Advanced Caching**: Intelligent caching strategies for MCP responses
- **Batch Operations**: Support for batching multiple MCP operations

## Support

For MCP integration issues:
1. Check the [MCP Documentation](https://modelcontextprotocol.io/)
2. Review Claude Desktop MCP server logs
3. Check network connectivity to MCP servers
4. Verify API credentials and permissions

For template-specific MCP integration:
1. Review generated code in your template
2. Check framework-specific documentation
3. Test MCP operations in isolation
4. Use debug mode for detailed logging