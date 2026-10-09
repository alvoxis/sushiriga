/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { githubPagesFallback } from './scripts/pages';
import { seoFiles } from './scripts/seo';

/**
 * `vite build --mode pages` (npm run build:pages): the static demo for GitHub Pages at
 * https://alvoxis.github.io/sushiriga/ — served under /sushiriga/, with a 404.html fallback for
 * deep links. GitHub Pages has no backend, so this build always runs in demo mode.
 */
const PAGES_BASE = process.env.PAGES_BASE ?? '/sushiriga/';
const PAGES_URL = process.env.PAGES_URL ?? 'https://alvoxis.github.io/sushiriga';

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? PAGES_BASE : '/',
  plugins: [
    react(),
    ...(mode === 'pages'
      ? [seoFiles({ siteUrl: PAGES_URL, basePath: PAGES_BASE }), githubPagesFallback()]
      : [seoFiles()]),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    globals: true,
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'web',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          css: { modules: { classNameStrategy: 'non-scoped' } },
        },
      },
      {
        extends: true,
        test: { name: 'server', environment: 'node', include: ['server/**/*.test.ts'] },
      },
    ],
  },
}));
