import { resolve } from 'node:path';
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDesktopDebug = mode === 'desktop-debug';
  if (mode !== 'desktop' && !isDesktopDebug) throw new Error('Only the desktop build is supported.');

  return {
    plugins: [react(), svgr(), splitVendorChunkPlugin()],
    root: resolve(__dirname, 'src'),
    base: './',
    publicDir: resolve(__dirname, 'public'),
    envDir: resolve(__dirname),
    cacheDir: resolve(__dirname, '.vite'),
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': 'http://127.0.0.1:37621',
      },
    },
    build: {
      outDir: '../dist-desktop',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      sourcemap: isDesktopDebug,
    },
    css: {
      preprocessorOptions: {
        scss: {
          quietDeps: true,
          silenceDeprecations: ['legacy-js-api'],
        },
      },
    },
  };
});
