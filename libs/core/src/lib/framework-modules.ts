/**
 * @fileoverview Framework-specific DNA Module Base Classes
 */

import { z } from 'zod';
import {
  BaseDNAModule,
  DNAModuleContext,
  DNAModuleFile,
  SupportedFramework,
  CompatibilityLevel,
  DNAModuleCategory,
  FrameworkImplementation
} from './index';

/**
 * Base class for Flutter DNA modules
 */
export abstract class FlutterDNAModule extends BaseDNAModule {
  protected createFlutterImplementation(config: {
    dependencies?: string[];
    devDependencies?: string[];
    configFiles?: string[];
    postInstallSteps?: string[];
    limitations?: string[];
  } = {}): FrameworkImplementation {
    return this.createFrameworkImplementation({
      framework: SupportedFramework.FLUTTER,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['flutter', ...config.dependencies || []],
      devDependencies: ['flutter_test', ...config.devDependencies || []],
      configFiles: ['pubspec.yaml', 'analysis_options.yaml', ...config.configFiles || []],
      templates: ['lib/', 'test/', 'android/', 'ios/'],
      postInstallSteps: [
        'flutter pub get',
        'flutter packages pub run build_runner build',
        ...config.postInstallSteps || []
      ],
      limitations: config.limitations || []
    });
  }

  protected generateFlutterFile(config: {
    path: string;
    content: string;
    isLibrary?: boolean;
    isTest?: boolean;
    executable?: boolean;
  }): DNAModuleFile {
    return {
      relativePath: config.path,
      content: config.content,
      encoding: 'utf8',
      executable: config.executable || false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: {
        framework: SupportedFramework.FLUTTER,
        isLibrary: config.isLibrary || false,
        isTest: config.isTest || false
      }
    };
  }

  protected generatePubspecDependency(packageName: string, version?: string): string {
    return version ? `  ${packageName}: ^${version}` : `  ${packageName}: any`;
  }

  protected generateDartImport(packageName: string, alias?: string): string {
    return alias 
      ? `import 'package:${packageName}' as ${alias};`
      : `import 'package:${packageName}';`;
  }
}

/**
 * Base class for React Native DNA modules
 */
export abstract class ReactNativeDNAModule extends BaseDNAModule {
  protected createReactNativeImplementation(config: {
    dependencies?: string[];
    devDependencies?: string[];
    peerDependencies?: string[];
    configFiles?: string[];
    postInstallSteps?: string[];
    limitations?: string[];
  } = {}): FrameworkImplementation {
    return this.createFrameworkImplementation({
      framework: SupportedFramework.REACT_NATIVE,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['react', 'react-native', ...config.dependencies || []],
      devDependencies: [
        '@types/react',
        '@types/react-native',
        'metro-config',
        ...config.devDependencies || []
      ],
      peerDependencies: config.peerDependencies || [],
      configFiles: [
        'metro.config.js',
        'react-native.config.js',
        'babel.config.js',
        ...config.configFiles || []
      ],
      templates: ['src/', '__tests__/', 'android/', 'ios/'],
      postInstallSteps: [
        'npx pod-install',
        'npx react-native link',
        ...config.postInstallSteps || []
      ],
      limitations: config.limitations || []
    });
  }

  protected generateReactNativeFile(config: {
    path: string;
    content: string;
    isComponent?: boolean;
    isTest?: boolean;
    isNative?: boolean;
  }): DNAModuleFile {
    return {
      relativePath: config.path,
      content: config.content,
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: config.isComponent ? 'merge' : 'replace',
      conditions: {
        framework: SupportedFramework.REACT_NATIVE,
        isComponent: config.isComponent || false,
        isTest: config.isTest || false,
        isNative: config.isNative || false
      }
    };
  }

  protected generatePackageJsonDependency(packageName: string, version: string): string {
    return `"${packageName}": "^${version}"`;
  }

  protected generateTypeScriptImport(moduleName: string, imports: string[], isDefault = false): string {
    if (isDefault) {
      return `import ${imports[0]} from '${moduleName}';`;
    }
    return `import { ${imports.join(', ')} } from '${moduleName}';`;
  }

  protected generateReactComponent(config: {
    name: string;
    props?: string;
    hooks?: string[];
    exports?: string;
  }): string {
    const hooks = config.hooks?.map(hook => `  ${hook}`).join('\n') || '';
    const propsType = config.props || 'any';
    
    return `import React from 'react';
import { View } from 'react-native';

interface ${config.name}Props extends ${propsType} {}

export const ${config.name}: React.FC<${config.name}Props> = (props) => {
${hooks}

  return (
    <View>
      {/* Component implementation */}
    </View>
  );
};

${config.exports || `export default ${config.name};`}`;
  }
}

/**
 * Base class for Next.js DNA modules
 */
export abstract class NextJSDNAModule extends BaseDNAModule {
  protected createNextJSImplementation(config: {
    dependencies?: string[];
    devDependencies?: string[];
    configFiles?: string[];
    postInstallSteps?: string[];
    limitations?: string[];
  } = {}): FrameworkImplementation {
    return this.createFrameworkImplementation({
      framework: SupportedFramework.NEXTJS,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['next', 'react', 'react-dom', ...config.dependencies || []],
      devDependencies: [
        '@types/node',
        '@types/react',
        '@types/react-dom',
        'typescript',
        'eslint',
        'eslint-config-next',
        ...config.devDependencies || []
      ],
      configFiles: [
        'next.config.js',
        'tailwind.config.js',
        'tsconfig.json',
        ...config.configFiles || []
      ],
      templates: ['pages/', 'components/', 'styles/', 'public/'],
      postInstallSteps: [
        'npm run build',
        ...config.postInstallSteps || []
      ],
      limitations: config.limitations || []
    });
  }

  protected generateNextJSFile(config: {
    path: string;
    content: string;
    isPage?: boolean;
    isAPI?: boolean;
    isComponent?: boolean;
    isMiddleware?: boolean;
  }): DNAModuleFile {
    return {
      relativePath: config.path,
      content: config.content,
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: config.isComponent ? 'merge' : 'replace',
      conditions: {
        framework: SupportedFramework.NEXTJS,
        isPage: config.isPage || false,
        isAPI: config.isAPI || false,
        isComponent: config.isComponent || false,
        isMiddleware: config.isMiddleware || false
      }
    };
  }

  protected generateNextJSPage(config: {
    name: string;
    path: string;
    props?: string;
    getServerSideProps?: boolean;
    getStaticProps?: boolean;
  }): string {
    const propsInterface = config.props ? `interface ${config.name}Props ${config.props}` : '';
    const propsParam = config.props ? `props: ${config.name}Props` : '';
    
    let dataFetching = '';
    if (config.getServerSideProps) {
      dataFetching = `
export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      // Add your props here
    }
  };
}`;
    } else if (config.getStaticProps) {
      dataFetching = `
export async function getStaticProps() {
  return {
    props: {
      // Add your props here
    }
  };
}`;
    }

    return `import React from 'react';
import { NextPage${config.getServerSideProps ? ', GetServerSidePropsContext' : ''} } from 'next';

${propsInterface}

const ${config.name}: NextPage${config.props ? `<${config.name}Props>` : ''} = (${propsParam}) => {
  return (
    <div>
      <h1>${config.name}</h1>
      {/* Page content */}
    </div>
  );
};

${dataFetching}

export default ${config.name};`;
  }

  protected generateAPIRoute(config: {
    name: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'all';
    requestType?: string;
    responseType?: string;
  }): string {
    const reqType = config.requestType || 'any';
    const resType = config.responseType || 'any';

    return `import { NextApiRequest, NextApiResponse } from 'next';

interface ${config.name}Request extends NextApiRequest {
  body: ${reqType};
}

interface ${config.name}Response extends ${resType} {}

export default async function handler(
  req: ${config.name}Request,
  res: NextApiResponse<${config.name}Response>
) {
  if (req.method !== '${config.method}' && '${config.method}' !== 'all') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Implementation here
    res.status(200).json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}`;
  }
}

/**
 * Base class for Tauri DNA modules
 */
export abstract class TauriDNAModule extends BaseDNAModule {
  protected createTauriImplementation(config: {
    dependencies?: string[];
    devDependencies?: string[];
    configFiles?: string[];
    postInstallSteps?: string[];
    limitations?: string[];
  } = {}): FrameworkImplementation {
    return this.createFrameworkImplementation({
      framework: SupportedFramework.TAURI,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['@tauri-apps/api', ...config.dependencies || []],
      devDependencies: [
        '@tauri-apps/cli',
        'typescript',
        'vite',
        ...config.devDependencies || []
      ],
      configFiles: [
        'src-tauri/tauri.conf.json',
        'src-tauri/Cargo.toml',
        'vite.config.ts',
        ...config.configFiles || []
      ],
      templates: ['src/', 'src-tauri/src/', 'src-tauri/capabilities/'],
      postInstallSteps: [
        'cargo check',
        'npm run tauri build',
        ...config.postInstallSteps || []
      ],
      limitations: config.limitations || []
    });
  }

  protected generateTauriFile(config: {
    path: string;
    content: string;
    isRust?: boolean;
    isFrontend?: boolean;
    isConfig?: boolean;
  }): DNAModuleFile {
    return {
      relativePath: config.path,
      content: config.content,
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: 'replace',
      conditions: {
        framework: SupportedFramework.TAURI,
        isRust: config.isRust || false,
        isFrontend: config.isFrontend || false,
        isConfig: config.isConfig || false
      }
    };
  }

  protected generateTauriCommand(config: {
    name: string;
    params: { name: string; type: string }[];
    returnType: string;
    async?: boolean;
  }): string {
    const params = config.params.map(p => `${p.name}: ${p.type}`).join(', ');
    const asyncKeyword = config.async ? 'async ' : '';
    const returnType = config.async ? `Result<${config.returnType}, String>` : config.returnType;

    return `#[tauri::command]
${asyncKeyword}fn ${config.name}(${params}) -> ${returnType} {
    // Implementation here
    ${config.async ? 'Ok(())' : 'Default::default()'}
}`;
  }

  protected generateTauriInvoke(config: {
    commandName: string;
    params?: Record<string, any>;
    returnType?: string;
  }): string {
    const params = config.params ? `, ${JSON.stringify(config.params)}` : '';
    const returnType = config.returnType ? `<${config.returnType}>` : '';

    return `import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke${returnType}('${config.commandName}'${params});`;
  }
}

/**
 * Base class for SvelteKit DNA modules
 */
export abstract class SvelteKitDNAModule extends BaseDNAModule {
  protected createSvelteKitImplementation(config: {
    dependencies?: string[];
    devDependencies?: string[];
    configFiles?: string[];
    postInstallSteps?: string[];
    limitations?: string[];
  } = {}): FrameworkImplementation {
    return this.createFrameworkImplementation({
      framework: SupportedFramework.SVELTEKIT,
      supported: true,
      compatibility: CompatibilityLevel.FULL,
      dependencies: ['svelte', '@sveltejs/kit', ...config.dependencies || []],
      devDependencies: [
        '@sveltejs/adapter-auto',
        '@sveltejs/vite-plugin-svelte',
        'typescript',
        'vite',
        'vitest',
        ...config.devDependencies || []
      ],
      configFiles: [
        'svelte.config.js',
        'vite.config.ts',
        'tsconfig.json',
        ...config.configFiles || []
      ],
      templates: ['src/routes/', 'src/lib/', 'src/app.html'],
      postInstallSteps: [
        'npm run build',
        ...config.postInstallSteps || []
      ],
      limitations: config.limitations || []
    });
  }

  protected generateSvelteKitFile(config: {
    path: string;
    content: string;
    isRoute?: boolean;
    isComponent?: boolean;
    isLayout?: boolean;
    isServer?: boolean;
  }): DNAModuleFile {
    return {
      relativePath: config.path,
      content: config.content,
      encoding: 'utf8',
      executable: false,
      overwrite: true,
      mergeStrategy: config.isComponent ? 'merge' : 'replace',
      conditions: {
        framework: SupportedFramework.SVELTEKIT,
        isRoute: config.isRoute || false,
        isComponent: config.isComponent || false,
        isLayout: config.isLayout || false,
        isServer: config.isServer || false
      }
    };
  }

  protected generateSvelteComponent(config: {
    name: string;
    props?: { name: string; type: string; optional?: boolean }[];
    stores?: string[];
    exports?: string[];
  }): string {
    const scriptContent = [];
    
    if (config.props && config.props.length > 0) {
      const propsDeclaration = config.props.map(prop => {
        const optional = prop.optional ? '?' : '';
        return `  export let ${prop.name}${optional}: ${prop.type};`;
      }).join('\n');
      scriptContent.push(propsDeclaration);
    }

    if (config.stores && config.stores.length > 0) {
      const storeImports = config.stores.map(store => `  import { ${store} } from '$lib/stores';`).join('\n');
      scriptContent.push(storeImports);
    }

    if (config.exports && config.exports.length > 0) {
      const exports = config.exports.map(exp => `  export ${exp};`).join('\n');
      scriptContent.push(exports);
    }

    return `<script lang="ts">
${scriptContent.join('\n\n')}
</script>

<div class="${config.name.toLowerCase()}">
  <!-- Component template -->
  <h1>Welcome to ${config.name}</h1>
</div>

<style>
  .${config.name.toLowerCase()} {
    /* Component styles */
  }
</style>`;
  }

  protected generateSvelteKitRoute(config: {
    path: string;
    hasLoad?: boolean;
    hasActions?: boolean;
    layout?: boolean;
  }): string {
    let content = '';

    if (config.hasLoad) {
      content += `import type { PageLoad } from './$types';

export const load = (async ({ params, url, fetch }) => {
  return {
    // Load data here
  };
}) satisfies PageLoad;

`;
    }

    if (config.hasActions) {
      content += `import type { Actions } from './$types';

export const actions = {
  default: async ({ request, params }) => {
    // Handle form submission
    return { success: true };
  }
} satisfies Actions;

`;
    }

    content += `<script lang="ts">
${config.hasLoad ? "  import type { PageData } from './$types';\n  export let data: PageData;" : ''}
${config.hasActions ? "  import type { ActionData } from './$types';\n  export let form: ActionData;" : ''}
</script>

<div>
  <h1>${config.layout ? 'Layout' : 'Page'} Content</h1>
  ${config.layout ? '<slot />' : '<!-- Page content here -->'}
</div>`;

    return content;
  }
}