import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Production build of the backend (server/main.ts → dist-server/main.js). Shares the domain code
 * in src/ (pricing, promo rules, pickup slots) with the frontend; npm packages stay external.
 */
export default defineConfig({
  publicDir: false,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    ssr: 'server/main.ts',
    outDir: 'dist-server',
    target: 'node22',
    sourcemap: true,
    emptyOutDir: true,
  },
});
