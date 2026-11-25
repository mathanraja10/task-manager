const prisma = require('../config/prisma');
const { redis } = require('../config/redis');

const CHECK_TIMEOUT_MS = 2000;

function withTimeout(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function isDatabaseUp() {
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

async function isRedisUp() {
  if (redis.status !== 'ready') return false;
  try {
    return (await withTimeout(redis.ping())) === 'PONG';
  } catch {
    return false;
  }
}

/**
 * 200 "ok"       - PostgreSQL and Redis up
 * 200 "degraded" - Redis down; the API still works from PostgreSQL
 * 503 "error"    - PostgreSQL down; the API cannot serve data
 */
async function health(_req, res) {
  const [database, cache] = await Promise.all([isDatabaseUp(), isRedisUp()]);
  const status = !database ? 'error' : cache ? 'ok' : 'degraded';

  res.status(database ? 200 : 503).json({
    success: database,
    status,
    database: database ? 'connected' : 'disconnected',
    redis: cache ? 'connected' : 'disconnected',
    uptime: Math.round(process.uptime()),
  });
}

module.exports = { health };
