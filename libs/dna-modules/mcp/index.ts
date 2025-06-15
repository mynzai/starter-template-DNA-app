// MCP Module Exports
export { DockerMCPModule } from './docker-mcp.module';
export { SupabaseMCPModule } from './supabase-mcp.module';
export { Context7MCPModule } from './context7-mcp.module';
export { PlaywrightMCPModule } from './playwright-mcp.module';

// Type exports
export type { DockerMCPConfig } from './docker-mcp.module';
export type { SupabaseMCPConfig } from './supabase-mcp.module';
export type { Context7MCPConfig, ConversationContext } from './context7-mcp.module';
export type { PlaywrightMCPConfig, BrowserAction, TestResult } from './playwright-mcp.module';

// MCP Integration Registry
import { DockerMCPModule, DockerMCPConfig } from './docker-mcp.module';
import { SupabaseMCPModule, SupabaseMCPConfig } from './supabase-mcp.module';
import { Context7MCPModule, Context7MCPConfig } from './context7-mcp.module';
import { PlaywrightMCPModule, PlaywrightMCPConfig } from './playwright-mcp.module';

export interface MCPModuleConfig {
  docker?: DockerMCPConfig;
  supabase?: SupabaseMCPConfig;
  context7?: Context7MCPConfig;
  playwright?: PlaywrightMCPConfig;
}

export class MCPModuleRegistry {
  private modules: Map<string, any> = new Map();

  async initializeModules(config: MCPModuleConfig): Promise<void> {
    // Initialize Docker MCP Module
    if (config.docker?.enabled) {
      const dockerModule = new DockerMCPModule(config.docker);
      await dockerModule.initialize();
      this.modules.set('docker', dockerModule);
    }

    // Initialize Supabase MCP Module
    if (config.supabase?.enabled) {
      const supabaseModule = new SupabaseMCPModule(config.supabase);
      await supabaseModule.initialize();
      this.modules.set('supabase', supabaseModule);
    }

    // Initialize Context7 MCP Module
    if (config.context7?.enabled) {
      const context7Module = new Context7MCPModule(config.context7);
      await context7Module.initialize();
      this.modules.set('context7', context7Module);
    }

    // Initialize Playwright MCP Module
    if (config.playwright?.enabled) {
      const playwrightModule = new PlaywrightMCPModule(config.playwright);
      await playwrightModule.initialize();
      this.modules.set('playwright', playwrightModule);
    }
  }

  getModule<T>(moduleId: string): T | undefined {
    return this.modules.get(moduleId);
  }

  getDockerModule(): DockerMCPModule | undefined {
    return this.modules.get('docker');
  }

  getSupabaseModule(): SupabaseMCPModule | undefined {
    return this.modules.get('supabase');
  }

  getContext7Module(): Context7MCPModule | undefined {
    return this.modules.get('context7');
  }

  getPlaywrightModule(): PlaywrightMCPModule | undefined {
    return this.modules.get('playwright');
  }

  async cleanup(): Promise<void> {
    for (const [, module] of this.modules) {
      if (module.cleanup) {
        await module.cleanup();
      }
    }
    this.modules.clear();
  }

  getAvailableModules(): string[] {
    return Array.from(this.modules.keys());
  }

  isModuleAvailable(moduleId: string): boolean {
    return this.modules.has(moduleId);
  }
}

// Default registry instance
export const mcpRegistry = new MCPModuleRegistry();