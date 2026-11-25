const Redis = require('ioredis');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * Redis is a cache, not a dependency the API needs to answer requests.
 * The client is configured to fail fast instead of queueing commands
 * while disconnected, so callers can fall back to PostgreSQL immediately.
 */
function createRedisClient(url = config.REDIS_URL, overrides = {}) {
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false, // reject commands instantly while disconnected
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    // Keep trying to reconnect in the background, backing off up to 10s.
    retryStrategy: (attempt) => Math.min(attempt * 500, 10_000),
    ...overrides,
  });

  // ioredis emits an error on every failed reconnect attempt; log once per
  // outage so a Redis failure does not flood the logs.
  let outageLogged = false;
  client.on('ready', () => {
    outageLogged = false;
    logger.info('Redis connected');
  });
  client.on('error', (err) => {
    if (outageLogged) return;
    outageLogged = true;
    logger.warn(
      { code: err.code, reason: err.message || err.code },
      'Redis unavailable, serving from PostgreSQL',
    );
  });

  return client;
}

const redis = createRedisClient();

module.exports = { redis, createRedisClient };
