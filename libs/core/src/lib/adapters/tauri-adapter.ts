/**
 * @fileoverview Tauri Framework Adapter Implementation (Stub)
 * AC2: Framework-specific adapter for Tauri implementation
 */

import { BaseFrameworkAdapter } from './base-framework-adapter';
import { SupportedFramework } from '../types';

/**
 * Tauri-specific DNA adapter implementation (placeholder)
 * TODO: Implement full Tauri adapter in Epic 4
 */
export class TauriAdapter extends BaseFrameworkAdapter {
  public readonly framework = SupportedFramework.TAURI;
  public readonly version = '2.0.0';
  
  public readonly capabilities = {
    hasHotReload: true,
    hasTypeScript: true,
    hasTestingFramework: true,
    hasStateManagement: true,
    hasRouting: true,
    hasAPISupport: true,
    hasWebSupport: false,
    hasMobileSupport: false,
    hasDesktopSupport: true
  };

  public async generateConfigFiles(): Promise<any[]> {
    throw new Error('Tauri adapter implementation pending - Epic 4');
  }

  public async generateSourceFiles(): Promise<any[]> {
    throw new Error('Tauri adapter implementation pending - Epic 4');
  }

  public async generateTestFiles(): Promise<any[]> {
    throw new Error('Tauri adapter implementation pending - Epic 4');
  }

  public getDependencies(): any[] {
    return [];
  }

  public getDevDependencies(): any[] {
    return [];
  }

  public getPeerDependencies(): any[] {
    return [];
  }

  public async updateBuildConfig(): Promise<void> {
    throw new Error('Tauri adapter implementation pending - Epic 4');
  }

  protected getRequiredFiles(): string[] {
    return ['package.json', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json'];
  }

  protected getFrameworkComplexity(): number {
    return 3.5;
  }
}