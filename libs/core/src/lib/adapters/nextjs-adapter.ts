/**
 * @fileoverview Next.js Framework Adapter Implementation (Stub)
 * AC2: Framework-specific adapter for Next.js implementation
 */

import { BaseFrameworkAdapter } from './base-framework-adapter';
import { SupportedFramework } from '../types';

/**
 * Next.js-specific DNA adapter implementation (placeholder)
 * TODO: Implement full Next.js adapter in Epic 4
 */
export class NextJSAdapter extends BaseFrameworkAdapter {
  public readonly framework = SupportedFramework.NEXTJS;
  public readonly version = '14.0.0';
  
  public readonly capabilities = {
    hasHotReload: true,
    hasTypeScript: true,
    hasTestingFramework: true,
    hasStateManagement: true,
    hasRouting: true,
    hasAPISupport: true,
    hasWebSupport: true,
    hasMobileSupport: false,
    hasDesktopSupport: false
  };

  public async generateConfigFiles(): Promise<any[]> {
    throw new Error('Next.js adapter implementation pending - Epic 4');
  }

  public async generateSourceFiles(): Promise<any[]> {
    throw new Error('Next.js adapter implementation pending - Epic 4');
  }

  public async generateTestFiles(): Promise<any[]> {
    throw new Error('Next.js adapter implementation pending - Epic 4');
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
    throw new Error('Next.js adapter implementation pending - Epic 4');
  }

  protected getRequiredFiles(): string[] {
    return ['package.json', 'next.config.js', 'tsconfig.json'];
  }

  protected getFrameworkComplexity(): number {
    return 2.5;
  }
}