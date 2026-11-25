const Redis = require('ioredis');
const RedisMock = require('ioredis-mock');
const { createCacheService, keys } = require('../../src/services/cache.service');
const { createRedisClient } = require('../../src/config/redis');

const USER_ID = 'user-1';
const QUERY = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };

describe('cache.service with a working Redis', () => {
  let client;
  let cache;

  beforeEach(async () => {
    client = new RedisMock();
    client.status = 'ready'; // ioredis-mock does not track connection state
    await client.flushall();
    cache = createCacheService(client, { ttlSeconds: 60 });
  });

  it('MISS returns null, then HIT returns the stored value', async () => {
    const key = keys.taskList(USER_ID, '0', QUERY);

    expect(await cache.get(key)).toBeNull();
    await cache.set(key, { data: [{ id: 't1' }] });
    expect(await cache.get(key)).toEqual({ data: [{ id: 't1' }] });
  });

  it('stores entries with the configured TTL', async () => {
    const key = keys.stats(USER_ID, '0');
    await cache.set(key, { total: 1 });

    const ttl = await client.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('invalidateUser bumps the version so previously cached keys are no longer reachable', async () => {
    const version = await cache.getUserVersion(USER_ID);
    expect(version).toBe('0');
    await cache.set(keys.taskList(USER_ID, version, QUERY), { data: ['stale'] });

    await cache.invalidateUser(USER_ID);

    const newVersion = await cache.getUserVersion(USER_ID);
    expect(newVersion).not.toBe(version);
    expect(await cache.get(keys.taskList(USER_ID, newVersion, QUERY))).toBeNull();
  });

  it("invalidating one user does not touch another user's cache", async () => {
    await cache.set(keys.stats('other-user', '0'), { total: 5 });

    await cache.invalidateUser(USER_ID);

    expect(await cache.getUserVersion('other-user')).toBe('0');
    expect(await cache.get(keys.stats('other-user', '0'))).toEqual({ total: 5 });
  });

  it('treats a corrupted cache entry as a miss', async () => {
    await client.set('bad', '{not json');
    expect(await cache.get('bad')).toBeNull();
  });

  it('a command error is swallowed and reported as a miss', async () => {
    jest.spyOn(client, 'get').mockRejectedValueOnce(new Error('READONLY'));
    expect(await cache.get('any')).toBeNull();
  });

  it('defers an invalidation that fails during an outage and replays it on reconnect', async () => {
    const staleKey = keys.taskList(USER_ID, '0', QUERY);
    await cache.set(staleKey, { data: ['stale'] });

    client.status = 'reconnecting';
    await cache.invalidateUser(USER_ID); // cannot reach Redis

    // Redis is back but the INCR has not been replayed yet: bypass, never serve stale.
    client.status = 'ready';
    expect(await cache.getUserVersion(USER_ID)).toBeNull();

    client.emit('ready');
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(await cache.getUserVersion(USER_ID)).toBe('1');
    expect(await cache.get(keys.taskList(USER_ID, '1', QUERY))).toBeNull();
  });
});

describe('cache.service when Redis is unavailable', () => {
  let client;
  let cache;

  beforeAll(async () => {
    // Real ioredis client pointed at a port where nothing listens.
    // Short disconnectTimeout so ioredis does not leave a 2s timer behind after the test.
    client = createRedisClient('redis://127.0.0.1:1', { disconnectTimeout: 10 });
    await client.connect().catch(() => {});
    cache = createCacheService(client, { ttlSeconds: 60 });
  });

  afterAll(async () => {
    client.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  it('is not ready', () => {
    expect(client).toBeInstanceOf(Redis);
    expect(cache.isReady()).toBe(false);
  });

  it('reads fall back immediately (null) instead of hanging or throwing', async () => {
    const started = Date.now();
    expect(await cache.getUserVersion(USER_ID)).toBeNull();
    expect(await cache.get('any-key')).toBeNull();
    expect(Date.now() - started).toBeLessThan(100);
  });

  it('writes and invalidation do not throw', async () => {
    await expect(cache.set('k', { a: 1 })).resolves.toBeUndefined();
    await expect(cache.invalidateUser(USER_ID)).resolves.toBeUndefined();
  });
});
