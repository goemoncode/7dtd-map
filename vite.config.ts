import { resolve } from 'node:path';
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDesktop = mode === 'desktop';

  return {
    plugins: [react(), svgr(), splitVendorChunkPlugin()],
    root: resolve(__dirname, 'src'),
    base: isDesktop ? './' : '/7dtd-map/',
    publicDir: resolve(__dirname, 'public'),
    envDir: resolve(__dirname),
    cacheDir: resolve(__dirname, '.vite'),
    build: {
      outDir: isDesktop ? '../dist-desktop' : '../dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
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
