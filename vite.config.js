import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'frontend/static/build',
    emptyOutDir: true,
    lib: {
      entry: 'frontend/ui/main.js',
      name: 'LLDashUI',
      formats: ['iife'],
      fileName: () => 'ui.js',
      cssFileName: 'ui',
    },
  },
});
