import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false,
			strict: true
		}),
		alias: {
			$components: 'src/components',
			$stores: 'src/stores',
			$utils: 'src/utils',
			$types: 'src/types'
		},
		serviceWorker: {
			register: false
		}
	},

	// Performance optimizations for large datasets
	experimental: {
		inspector: true
	},
	
	// Compiler optimizations
	compilerOptions: {
		dev: process.env.NODE_ENV === 'development',
		hydratable: true,
		legacy: false
	}
};

export default config;