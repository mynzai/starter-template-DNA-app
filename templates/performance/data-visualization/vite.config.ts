import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	
	// Performance optimizations
	build: {
		target: 'esnext',
		minify: 'esbuild',
		rollupOptions: {
			output: {
				manualChunks: {
					d3: ['d3'],
					three: ['three'],
					vendor: ['lodash-es', 'rxjs']
				}
			}
		}
	},

	// Development server configuration
	server: {
		host: '0.0.0.0',
		port: 5173,
		hmr: {
			port: 5174
		}
	},

	// Worker configuration for WebGL/GPU acceleration
	worker: {
		format: 'es'
	},

	// Optimize dependencies for large datasets
	optimizeDeps: {
		include: ['d3', 'three', 'gl-matrix'],
		exclude: ['@tauri-apps/api']
	},

	// Test configuration
	test: {
		include: ['tests/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		globals: true,
		setupFiles: ['tests/setup.ts']
	},

	// Define global constants
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
		__BUILD_TIME__: JSON.stringify(new Date().toISOString())
	}
});