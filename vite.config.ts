import { resolve } from 'node:path';
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr(), splitVendorChunkPlugin()],
  root: resolve(__dirname, 'src'),
  base: '/7dtd-map/',
  publicDir: resolve(__dirname, 'public'),
  envDir: resolve(__dirname),
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
