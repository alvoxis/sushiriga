import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * GitHub Pages serves static files only. For a deep link such as /sushiriga/menu/rolli there is
 * no file, so Pages answers with the site's 404.html — a copy of index.html — and the app's router
 * shows the right page. (The HTTP status of such a first load is 404; navigation inside the app
 * is unaffected.) Also adds .nojekyll so Pages publishes the build exactly as it is.
 */
export function githubPagesFallback(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sushiriga-github-pages-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
    },
    closeBundle() {
      copyFileSync(join(outDir, 'index.html'), join(outDir, '404.html'));
    },
  };
}
