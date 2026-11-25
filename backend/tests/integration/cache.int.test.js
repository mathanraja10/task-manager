const {
  app,
  request,
  prisma,
  redis,
  resetState,
  reconnectRedis,
  registerUser,
  createTask,
  closeConnections,
} = require('./helpers');

let auth;
let userId;

beforeEach(async () => {
  await resetState();
  ({
    auth,
    user: { id: userId },
  } = await registerUser());
});
afterAll(closeConnections);

const list = (query = '') => request(app).get(`/api/tasks${query}`).set('Authorization', auth);

describe('Redis caching of task queries', () => {
  it('first request is a MISS, the identical second request is a HIT with the same body', async () => {
    await createTask(auth, { title: 'Cached task' });

    const first = await list('?page=1&limit=10&status=TODO').expect(200);
    const second = await list('?page=1&limit=10&status=TODO').expect(200);

    expect(first.headers['x-cache']).toBe('MISS');
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body).toEqual(first.body);
  });

  it('a HIT is served from Redis without querying PostgreSQL', async () => {
    await createTask(auth, { title: 'Cached task' });
    await list().expect(200); // MISS: populates the cache

    const findMany = jest.spyOn(prisma.task, 'findMany');
    const res = await list().expect(200);

    expect(res.headers['x-cache']).toBe('HIT');
    expect(findMany).not.toHaveBeenCalled();
    findMany.mockRestore();
  });

  it('stores list results under a per-user key with a TTL', async () => {
    await list('?status=TODO').expect(200);

    const [key] = await redis.keys(`tasks:user:${userId}:v*:list:*`);
    expect(key).toContain(':status:TODO:');
    const ttl = await redis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it.each([
    ['create', async () => createTask(auth, { title: 'New task' })],
    [
      'update',
      async (task) =>
        request(app)
          .patch(`/api/tasks/${task.id}`)
          .set('Authorization', auth)
          .send({ status: 'COMPLETED' }),
    ],
    [
      'delete',
      async (task) => request(app).delete(`/api/tasks/${task.id}`).set('Authorization', auth),
    ],
  ])('%s invalidates cached lists, single task and stats', async (_name, mutate) => {
    const task = await createTask(auth, { title: 'Existing task' });
    const before = {
      list: (await list().expect(200)).body,
      stats: (await request(app).get('/api/tasks/stats').set('Authorization', auth)).body,
    };
    expect((await list().expect(200)).headers['x-cache']).toBe('HIT');

    await mutate(task);

    const afterList = await list().expect(200);
    const afterStats = await request(app).get('/api/tasks/stats').set('Authorization', auth);
    expect(afterList.headers['x-cache']).toBe('MISS');
    expect(afterStats.headers['x-cache']).toBe('MISS');
    expect(afterList.body).not.toEqual(before.list);
    expect(afterStats.body).not.toEqual(before.stats);
  });

  it('a cached single task is not served after it is updated', async () => {
    const task = await createTask(auth, { title: 'Original' });
    await request(app).get(`/api/tasks/${task.id}`).set('Authorization', auth).expect(200);

    await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', auth)
      .send({ title: 'Renamed' })
      .expect(200);

    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(res.body.data.title).toBe('Renamed');
  });

  it("one user's mutation does not invalidate another user's cache", async () => {
    const other = await registerUser();
    await request(app).get('/api/tasks').set('Authorization', other.auth).expect(200);

    await createTask(auth, { title: 'Mine' });

    const res = await request(app).get('/api/tasks').set('Authorization', other.auth).expect(200);
    expect(res.headers['x-cache']).toBe('HIT');
  });
});

describe('Redis unavailable fallback', () => {
  it('serves correct, fresh data from PostgreSQL while Redis is down', async () => {
    await createTask(auth, { title: 'Before outage' });
    await list().expect(200); // cached

    redis.simulateOutage();

    // Writes still succeed even though invalidation cannot reach Redis.
    await createTask(auth, { title: 'During outage' });
    const res = await list().expect(200);

    expect(res.headers['x-cache']).toBe('BYPASS');
    expect(res.body.data.map((t) => t.title).sort()).toEqual(['Before outage', 'During outage']);
    await request(app).get('/api/tasks/stats').set('Authorization', auth).expect(200);
  });

  it('falls back when individual Redis commands fail mid-request', async () => {
    await createTask(auth, { title: 'Task' });
    const get = jest.spyOn(redis, 'get').mockRejectedValue(new Error('Connection reset'));

    const res = await list().expect(200);

    expect(res.body.data).toHaveLength(1);
    get.mockRestore();
  });

  it('a change made during an outage is never served stale after Redis reconnects', async () => {
    const task = await createTask(auth, { title: 'Before outage' });
    await list().expect(200); // cached under the current version
    await request(app).get(`/api/tasks/${task.id}`).set('Authorization', auth).expect(200);

    // Redis is unreachable (its data survives) while the task is renamed.
    redis.simulateOutage();
    await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', auth)
      .send({ title: 'Renamed during outage' })
      .expect(200);

    // Before the deferred invalidation is replayed, the cache is bypassed for this user.
    redis.status = 'ready';
    const beforeReplay = await list().expect(200);
    expect(beforeReplay.headers['x-cache']).toBe('BYPASS');
    expect(beforeReplay.body.data[0].title).toBe('Renamed during outage');

    await reconnectRedis();

    const afterReplay = await list().expect(200);
    expect(afterReplay.headers['x-cache']).toBe('MISS');
    expect(afterReplay.body.data[0].title).toBe('Renamed during outage');
    const single = await request(app).get(`/api/tasks/${task.id}`).set('Authorization', auth);
    expect(single.body.data.title).toBe('Renamed during outage');
  });

  it('health endpoint reports degraded (but still 200) when Redis is down', async () => {
    redis.simulateOutage();
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({
      status: 'degraded',
      database: 'connected',
      redis: 'disconnected',
    });
  });

  it('health endpoint reports ok when everything is up', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toMatchObject({
      success: true,
      status: 'ok',
      database: 'connected',
      redis: 'connected',
    });
  });
});
