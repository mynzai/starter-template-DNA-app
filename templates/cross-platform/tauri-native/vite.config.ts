import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  // prevent vite from obscuring rust errors
  clearScreen: false,
  
  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/components': resolve(__dirname, './src/components'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/stores': resolve(__dirname, './src/stores'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
  
  // Build optimization
  build: {
    // Tauri supports es2021
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    
    // Rollup options
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for better caching
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', 'lucide-react'],
          tauri: ['@tauri-apps/api'],
        },
      },
    },
    
    // Performance optimization
    chunkSizeWarningLimit: 1000,
  },
  
  // Environment variables
  envPrefix: ['VITE_', 'TAURI_'],
  
  // CSS options
  css: {
    postcss: {
      plugins: [
        require('tailwindcss'),
        require('autoprefixer'),
      ],
    },
  },
  
  // Development options
  define: {
    __TAURI_DEBUG__: process.env.TAURI_DEBUG === 'true',
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  
  // Esbuild options for TypeScript
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
  
  // Preview server for production builds
  preview: {
    port: 1421,
    strictPort: true,
  },
  
  // Optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'framer-motion',
      'zustand',
      '@tauri-apps/api',
    ],
    exclude: [
      '@tauri-apps/cli',
    ],
  },
}));
