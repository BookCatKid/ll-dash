import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'frontend/static/build',
    emptyOutDir: true,
    lib: {
      entry: 'frontend/ui/spa/main.js',
      name: 'LLDashApp',
      formats: ['iife'],
      fileName: () => 'app.js',
      cssFileName: 'app',
    },
  },
});
