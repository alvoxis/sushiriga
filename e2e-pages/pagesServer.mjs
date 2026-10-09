// Serves dist/ the way GitHub Pages serves a project site: only under /<repo>/, static files
// only, and for anything missing the site's 404.html with HTTP status 404. Lets the e2e tests
// check base paths, assets and deep links before anything is published.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT ?? 4177);
const base = process.env.PAGES_BASE ?? '/sushiriga/';
const root = process.env.PAGES_DIR ?? 'dist';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.map': 'application/json',
};

function send(res, status, file) {
  res.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  if (path === base.replace(/\/$/, '')) {
    res.writeHead(301, { Location: base });
    return res.end();
  }
  if (!path.startsWith(base)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found (outside the project site)');
  }
  let file = join(root, normalize(path.slice(base.length)).replace(/^(\.\.[/\\])+/, ''));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (existsSync(file) && statSync(file).isFile()) return send(res, 200, file);
  return send(res, 404, join(root, '404.html'));
}).listen(port, '127.0.0.1', () => console.log(`[pages] http://127.0.0.1:${port}${base}`));
