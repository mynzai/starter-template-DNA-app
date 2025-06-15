import { DNAModule } from '@starter-template-dna/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface DockerMCPConfig {
  enabled: boolean;
  containerRegistry?: string;
  defaultNetwork?: string;
  volumeMounts?: Array<{
    host: string;
    container: string;
    mode?: 'ro' | 'rw';
  }>;
}

export class DockerMCPModule extends DNAModule {
  public readonly id = 'docker-mcp';
  public readonly name = 'Docker MCP Integration';
  public readonly description = 'Provides Docker container management through MCP';
  public readonly version = '1.0.0';
  public readonly category = 'infrastructure';
  
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(private config: DockerMCPConfig) {
    super();
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Initialize MCP client for Docker operations
      this.transport = new StdioClientTransport({
        command: 'docker',
        args: ['mcp', 'gateway', 'run'],
      });

      this.client = new Client(
        {
          name: 'dna-docker-client',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      await this.client.connect(this.transport);
      
      this.emit('initialized', { module: this.id });
    } catch (error) {
      this.emit('error', { module: this.id, error });
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  async createContainer(config: {
    image: string;
    name?: string;
    ports?: Record<string, string>;
    environment?: Record<string, string>;
    volumes?: Array<string>;
  }): Promise<string> {
    if (!this.client) {
      throw new Error('Docker MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'create_container',
      arguments: {
        image: config.image,
        name: config.name,
        ports: config.ports,
        environment: config.environment,
        volumes: config.volumes,
        network: this.config.defaultNetwork,
      },
    });

    return result.content[0]?.text || '';
  }

  async startContainer(containerId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Docker MCP client not initialized');
    }

    await this.client.callTool({
      name: 'start_container',
      arguments: { container_id: containerId },
    });
  }

  async stopContainer(containerId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Docker MCP client not initialized');
    }

    await this.client.callTool({
      name: 'stop_container',
      arguments: { container_id: containerId },
    });
  }

  async listContainers(): Promise<Array<{
    id: string;
    name: string;
    status: string;
    image: string;
  }>> {
    if (!this.client) {
      throw new Error('Docker MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'list_containers',
      arguments: {},
    });

    return JSON.parse(result.content[0]?.text || '[]');
  }

  async executeCommand(containerId: string, command: string): Promise<string> {
    if (!this.client) {
      throw new Error('Docker MCP client not initialized');
    }

    const result = await this.client.callTool({
      name: 'exec_container',
      arguments: {
        container_id: containerId,
        command: command,
      },
    });

    return result.content[0]?.text || '';
  }

  getCompatibleFrameworks(): string[] {
    return ['nextjs', 'react-native', 'flutter', 'tauri'];
  }

  generateCode(framework: string): Record<string, string> {
    const baseConfig = {
      enabled: true,
      containerRegistry: this.config.containerRegistry || 'docker.io',
      defaultNetwork: this.config.defaultNetwork || 'bridge',
    };

    switch (framework) {
      case 'nextjs':
        return {
          'lib/docker-integration.ts': this.generateNextJSIntegration(baseConfig),
          'docker-compose.yml': this.generateDockerCompose(),
        };
      case 'flutter':
        return {
          'lib/services/docker_service.dart': this.generateFlutterIntegration(baseConfig),
        };
      default:
        return {
          'src/integrations/docker.ts': this.generateGenericIntegration(baseConfig),
        };
    }
  }

  private generateNextJSIntegration(config: any): string {
    return `
import { DockerMCPModule } from '@starter-template-dna/dna-modules';

export class DockerService {
  private dockerModule: DockerMCPModule;

  constructor() {
    this.dockerModule = new DockerMCPModule(${JSON.stringify(config, null, 2)});
  }

  async initialize() {
    await this.dockerModule.initialize();
  }

  async deployContainer(image: string, config: any) {
    const containerId = await this.dockerModule.createContainer({
      image,
      ...config
    });
    await this.dockerModule.startContainer(containerId);
    return containerId;
  }

  async getContainerStatus() {
    return await this.dockerModule.listContainers();
  }
}
`;
  }

  private generateFlutterIntegration(config: any): string {
    return `
import 'dart:convert';
import 'package:http/http.dart' as http;

class DockerService {
  static const String _baseUrl = 'http://localhost:3000/api/docker';
  
  Future<String> deployContainer(String image, Map<String, dynamic> config) async {
    final response = await http.post(
      Uri.parse('\$_baseUrl/deploy'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'image': image,
        'config': config,
      }),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['containerId'];
    }
    throw Exception('Failed to deploy container');
  }
  
  Future<List<Map<String, dynamic>>> getContainers() async {
    final response = await http.get(Uri.parse('\$_baseUrl/containers'));
    
    if (response.statusCode == 200) {
      return List<Map<String, dynamic>>.from(jsonDecode(response.body));
    }
    throw Exception('Failed to get containers');
  }
}
`;
  }

  private generateGenericIntegration(config: any): string {
    return `
import { DockerMCPModule } from '@starter-template-dna/dna-modules';

export class DockerIntegration {
  private dockerModule: DockerMCPModule;

  constructor() {
    this.dockerModule = new DockerMCPModule(${JSON.stringify(config, null, 2)});
  }

  async initialize() {
    await this.dockerModule.initialize();
  }

  async createAndStartContainer(image: string, options: any = {}) {
    const containerId = await this.dockerModule.createContainer({
      image,
      ...options
    });
    await this.dockerModule.startContainer(containerId);
    return containerId;
  }

  async manageContainer(action: 'start' | 'stop', containerId: string) {
    if (action === 'start') {
      await this.dockerModule.startContainer(containerId);
    } else {
      await this.dockerModule.stopContainer(containerId);
    }
  }

  async getContainerList() {
    return await this.dockerModule.listContainers();
  }
}
`;
  }

  private generateDockerCompose(): string {
    return `
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    networks:
      - ${this.config.defaultNetwork || 'app-network'}
    volumes:
      ${this.config.volumeMounts?.map(mount => `- ${mount.host}:${mount.container}:${mount.mode || 'rw'}`).join('\n      ') || '- ./data:/app/data'}

networks:
  ${this.config.defaultNetwork || 'app-network'}:
    driver: bridge
`;
  }
}