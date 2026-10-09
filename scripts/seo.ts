import type { Plugin } from 'vite';
import { categories, products } from '../src/data/menu';

/**
 * Build-time robots.txt and sitemap.xml. The sitemap needs the public address of the site, so
 * it is only written when SITE_URL is set (e.g. SITE_URL=https://www.sushiriga.lv npm run build).
 * The admin panel, the API and personal pages (cart, checkout, orders) are never indexed.
 */
export function seoFiles({
  siteUrl = process.env.SITE_URL?.trim(),
  basePath = '/',
}: { siteUrl?: string | undefined; basePath?: string } = {}): Plugin {
  const prefix = basePath.replace(/\/+$/, '');
  return {
    name: 'sushiriga-seo-files',
    apply: 'build',
    generateBundle() {
      const base = siteUrl?.replace(/\/+$/, '');
      const robots = [
        'User-agent: *',
        `Disallow: ${prefix}/admin`,
        `Disallow: ${prefix}/api/`,
        `Disallow: ${prefix}/cart`,
        `Disallow: ${prefix}/checkout`,
        `Disallow: ${prefix}/order/`,
        `Disallow: ${prefix}/account`,
        ...(base ? ['', `Sitemap: ${base}/sitemap.xml`] : []),
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (!base) return;
      const paths = [
        '/',
        '/menu',
        '/pickup',
        '/reviews',
        '/assistant',
        ...categories.filter((c) => !c.hidden).map((c) => `/menu/${encodeURIComponent(c.slug)}`),
        ...products.map((p) => `/product/${encodeURIComponent(p.id)}`),
      ];
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...paths.map((path) => `  <url><loc>${base}${path}</loc></url>`),
        '</urlset>',
        '',
      ].join('\n');
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: xml });
    },
  };
}
