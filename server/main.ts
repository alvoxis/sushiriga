import { serve } from '@hono/node-server';
import { ConfigError, readServerConfig } from './config';
import { createServerContext } from './context';

/** SUSHIRIGA backend: JSON API under /api and (optionally) the built frontend. */
function main() {
  let config;
  try {
    config = readServerConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[config] ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  let now = () => new Date();
  if (config.testClockStart) {
    const offset = config.testClockStart.getTime() - Date.now();
    now = () => new Date(Date.now() + offset);
    console.warn(`[server] TEST clock: starts at ${config.testClockStart.toISOString()}`);
  }
  const context = createServerContext(config, now);
  const cleanup = setInterval(() => context.orders.cleanup(), 15 * 60_000);
  cleanup.unref();

  const server = serve({ fetch: context.app.fetch, hostname: config.host, port: config.port }, () =>
    console.log(
      `[server] listening on http://${config.host}:${config.port}` +
        (config.publicDir ? ` (serving ${config.publicDir})` : ' (API only)'),
    ),
  );

  const shutdown = () => {
    server.close(() => {
      context.db.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
