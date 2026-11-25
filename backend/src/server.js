const config = require('./config/env');
const prisma = require('./config/prisma');
const { redis } = require('./config/redis');
const logger = require('./utils/logger');
const { createApp } = require('./app');

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start() {
  // PostgreSQL is the source of truth: refuse to start without it.
  try {
    await prisma.$connect();
    logger.info('PostgreSQL connected');
  } catch (err) {
    logger.fatal({ reason: err.message }, 'Cannot connect to PostgreSQL');
    process.exit(1);
  }

  // Redis is optional: connect in the background; the cache service falls back
  // to PostgreSQL until (and whenever) Redis is unavailable.
  redis.connect().catch(() => {
    /* logged by the client's error listener; reconnects automatically */
  });

  const server = createApp().listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Task Manager API listening');
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    // Stop accepting connections and let in-flight requests finish.
    server.close(async () => {
      await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
      logger.info('Shutdown complete');
      process.exit(0);
    });
    server.closeIdleConnections();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
