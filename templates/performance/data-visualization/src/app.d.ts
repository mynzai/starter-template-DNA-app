// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			code?: string;
			id?: string;
		}
		
		interface Locals {
			userid?: string;
			theme?: 'light' | 'dark';
		}
		
		interface PageData {
			title?: string;
			description?: string;
		}
		
		interface Platform {}
	}

	// Tauri API types
	interface Window {
		__TAURI__?: any;
	}

	// WebGL types
	interface WebGLRenderingContext {
		getExtension(name: 'WEBGL_color_buffer_float'): any;
		getExtension(name: 'OES_texture_float'): any;
		getExtension(name: 'WEBGL_depth_texture'): any;
	}

	// Environment variables
	declare const __APP_VERSION__: string;
	declare const __BUILD_TIME__: string;

	// D3 module augmentation
	declare module 'd3' {
		interface Selection<GElement, Datum, PElement, PDatum> {
			webglRender?(): this;
		}
	}
}

export {};