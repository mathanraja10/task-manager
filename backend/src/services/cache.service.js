const config = require('../config/env');
const { redis } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Key strategy (per-user "version" namespace):
 *
 *   tasks:user:<userId>:version                      -> integer, no TTL
 *   tasks:user:<userId>:v<version>:list:<query...>   -> JSON, TTL
 *   tasks:user:<userId>:v<version>:task:<taskId>     -> JSON, TTL
 *   tasks:user:<userId>:v<version>:stats             -> JSON, TTL
 *
 * Invalidating a user's caches is one atomic INCR of the version key: every
 * old key becomes unreachable at once and simply expires via its TTL. This
 * avoids SCAN+DEL over many keys, and a request that read the old version
 * before a write can only store its result under the old (dead) version,
 * so it cannot resurrect stale data.
 */
const keys = {
  version: (userId) => `tasks:user:${userId}:version`,
  scope: (userId, version) => `tasks:user:${userId}:v${version}`,
  taskList: (userId, version, q) => {
    const search = q.search ? encodeURIComponent(q.search.toLowerCase()) : 'none';
    return [
      keys.scope(userId, version),
      'list',
      `page:${q.page}`,
      `limit:${q.limit}`,
      `status:${q.status ?? 'all'}`,
      `priority:${q.priority ?? 'all'}`,
      `search:${search}`,
      `sort:${q.sortBy}:${q.sortOrder}`,
    ].join(':');
  },
  task: (userId, version, taskId) => `${keys.scope(userId, version)}:task:${taskId}`,
  stats: (userId, version) => `${keys.scope(userId, version)}:stats`,
};

/**
 * Every operation degrades gracefully: if Redis is down or a command fails,
 * reads return null (= cache miss) and writes are skipped. PostgreSQL stays
 * the source of truth, so the API keeps working without the cache.
 */
function createCacheService(client, { ttlSeconds }) {
  const isReady = () => client.status === 'ready';

  // Users whose task data changed while Redis was unreachable. Their cached
  // entries (if Redis kept them) are stale, so they bypass the cache until the
  // missed INCR has been replayed after Redis reconnects.
  const pendingInvalidations = new Set();

  async function safely(operation, fn) {
    if (!isReady()) return null;
    try {
      return await fn();
    } catch (err) {
      logger.warn({ operation, reason: err.message }, 'Redis cache operation failed');
      return null;
    }
  }

  async function replayPendingInvalidations() {
    for (const userId of [...pendingInvalidations]) {
      const result = await safely('replayInvalidation', () => client.incr(keys.version(userId)));
      if (result === null) return; // still failing; retry on the next reconnect
      pendingInvalidations.delete(userId);
    }
  }

  client.on('ready', () => {
    replayPendingInvalidations();
  });

  return {
    isReady,

    /** Current cache version for a user, or null if the cache must be bypassed. */
    getUserVersion(userId) {
      if (pendingInvalidations.has(userId)) return null;
      return safely('getUserVersion', async () => (await client.get(keys.version(userId))) ?? '0');
    },

    async get(key) {
      const raw = await safely('get', () => client.get(key));
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },

    async set(key, value) {
      await safely('set', () => client.set(key, JSON.stringify(value), 'EX', ttlSeconds));
    },

    /** Make all cached task data for this user unreachable. */
    async invalidateUser(userId) {
      const result = await safely('invalidateUser', () => client.incr(keys.version(userId)));
      if (result === null) {
        pendingInvalidations.add(userId);
        logger.warn({ userId }, 'Cache invalidation deferred until Redis reconnects');
      }
    },
  };
}

const cacheService = createCacheService(redis, { ttlSeconds: config.REDIS_CACHE_TTL });

module.exports = { cacheService, createCacheService, keys };
