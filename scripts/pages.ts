import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';
import { categories, products } from '../src/data/menu';
import { lv } from '../src/i18n/translations/lv';
import type { Category, Product } from '../src/types';

// Latvian names (the site's default language), as features/menu/catalog.ts shows them. Imported
// here directly: the Vite config loader does not resolve the "@/" alias used inside src/.
const productName = (product: Product) => product.translations?.lv?.name ?? product.name;
const categoryName = (category: Category) => category.name.lv;

/**
 * GitHub Pages serves static FILES only. Without a file for /sushiriga/menu/rolli it answers
 * with 404.html and HTTP status 404 — the app still renders (404.html is a copy of index.html),
 * but browsers, link previews and search engines see "404".
 *
 * So every route the app knows in advance gets its own HTML file (menu/rolli.html, which Pages
 * serves for /menu/rolli with status 200), each with its own title, description and canonical
 * URL. Only unknown or per-visitor paths (/order/SR-…) still fall back to 404.html.
 */
interface RouteShell {
  path: string;
  title?: string;
  description: string;
  /** Personal or staff pages: never indexed. */
  noindex?: boolean;
}

const ADDRESS = 'Latgales iela 250A, Rīga';
const SITE_DESCRIPTION =
  'SUSHIRIGA — suši Rīgā, Latgales iela 250A. Interaktīva ēdienkarte-grāmata un pasūtījumi saņemšanai uz vietas. Menu in LV / RU / EN.';

const euro = (cents: number) => `${(cents / 100).toFixed(2).replace('.', ',')} €`;

export function routeShells(): RouteShell[] {
  const visible = categories.filter((c) => !c.hidden);
  return [
    { path: '/', description: SITE_DESCRIPTION },
    {
      path: '/menu',
      title: lv.menu.title,
      description: `SUSHIRIGA ēdienkarte: ${visible.length} nodaļas, ${products.length} pozīcijas. ${ADDRESS}.`,
    },
    ...visible.map((category) => {
      const name = categoryName(category);
      const count = products.filter((p) => p.category === category.id).length;
      return {
        path: `/menu/${category.slug}`,
        title: name,
        description: `${name}: ${count} pozīcijas SUSHIRIGA ēdienkartē. Saņemšana uz vietas — ${ADDRESS}.`,
      };
    }),
    ...products.map((product) => {
      const category = categories.find((c) => c.id === product.category);
      const name = productName(product);
      return {
        path: `/product/${product.id}`,
        title: name,
        description:
          `${name} — ${euro(product.price)}` +
          (category ? ` · ${categoryName(category)}` : '') +
          `. SUSHIRIGA, ${ADDRESS}.`,
      };
    }),
    { path: '/pickup', title: lv.pickup.title, description: `${lv.pickup.title}: ${ADDRESS}.` },
    { path: '/reviews', title: lv.reviews.title, description: lv.reviews.lead },
    { path: '/assistant', title: lv.assistant.title, description: lv.assistant.lead },
    { path: '/cart', title: lv.cart.title, description: SITE_DESCRIPTION, noindex: true },
    { path: '/checkout', title: lv.checkout.title, description: SITE_DESCRIPTION, noindex: true },
    { path: '/account', title: lv.account.title, description: SITE_DESCRIPTION, noindex: true },
    ...(['orders', 'reviews', 'promocodes', 'tips'] as const).map((section) => ({
      path: `/account/${section}`,
      title: lv.account.sections[section],
      description: SITE_DESCRIPTION,
      noindex: true,
    })),
    ...['/admin', '/admin/menu', '/admin/promocodes', '/admin/reviews'].map((path) => ({
      path,
      title: lv.admin.title,
      description: SITE_DESCRIPTION,
      noindex: true,
    })),
  ];
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The built index.html with this route's title, description, canonical URL and Open Graph. */
export function renderShell(indexHtml: string, route: RouteShell, siteUrl: string): string {
  // Same format as the app's own document titles (hooks/useDocumentTitle.ts).
  const title = route.title ? `${route.title} · SUSHIRIGA` : 'SUSHIRIGA';
  const url = `${siteUrl}${route.path === '/' ? '/' : route.path}`;
  const description = escapeHtml(route.description);
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    // Open Graph needs an absolute image URL — known here, not in the generic index.html.
    `<meta property="og:image" content="${siteUrl}/icon-512.png" />`,
    '<meta property="og:image:width" content="512" />',
    '<meta property="og:image:height" content="512" />',
    ...(route.noindex ? ['<meta name="robots" content="noindex" />'] : []),
  ].join('\n    ');
  const replaced = indexHtml
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace('</head>', `    ${head}\n  </head>`);
  for (const marker of ['<title>', 'name="description"', 'og:title', 'og:description']) {
    if (!replaced.includes(marker)) throw new Error(`index.html lost ${marker}`);
  }
  return replaced;
}

export function githubPagesFallback(siteUrl: string): Plugin {
  let outDir = 'dist';
  const site = siteUrl.replace(/\/+$/, '');
  return {
    name: 'sushiriga-github-pages',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    generateBundle() {
      // Publish the build as it is (no Jekyll processing on GitHub Pages).
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
    },
    closeBundle() {
      const indexFile = join(outDir, 'index.html');
      const indexHtml = readFileSync(indexFile, 'utf8');
      // Unknown and per-visitor paths: the app shell, served by Pages with status 404.
      copyFileSync(indexFile, join(outDir, '404.html'));
      for (const route of routeShells()) {
        const file = route.path === '/' ? 'index.html' : `${route.path.slice(1)}.html`;
        const target = join(outDir, file);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, renderShell(indexHtml, route, site));
      }
    },
  };
}
