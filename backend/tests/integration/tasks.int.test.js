const {
  app,
  request,
  prisma,
  resetState,
  registerUser,
  createTask,
  closeConnections,
} = require('./helpers');

let auth;

beforeEach(async () => {
  await resetState();
  ({ auth } = await registerUser());
});
afterAll(closeConnections);

const list = (query = '') => request(app).get(`/api/tasks${query}`).set('Authorization', auth);

describe('task CRUD', () => {
  it('creates a task with defaults and the authenticated owner', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', auth)
      .send({ title: 'Learn Redis', description: 'Implement Redis caching', dueDate: '2026-12-01' })
      .expect(201);

    expect(res.body.data).toMatchObject({
      title: 'Learn Redis',
      description: 'Implement Redis caching',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: '2026-12-01T00:00:00.000Z',
    });
    const row = await prisma.task.findUnique({ where: { id: res.body.data.id } });
    expect(row.title).toBe('Learn Redis');
  });

  it('rejects an invalid task with structured 400 errors', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', auth)
      .send({ title: '', priority: 'URGENT' })
      .expect(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'title', message: 'Title is required' },
        { field: 'priority', message: 'Priority must be one of LOW, MEDIUM, HIGH' },
      ]),
    );
  });

  it('reads a single task', async () => {
    const task = await createTask(auth, { title: 'Read me' });
    const res = await request(app)
      .get(`/api/tasks/${task.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(res.body.data.id).toBe(task.id);
  });

  it('updates fields and changes status TODO -> IN_PROGRESS -> COMPLETED', async () => {
    const task = await createTask(auth, { title: 'Learn Redis' });

    for (const status of ['IN_PROGRESS', 'COMPLETED']) {
      const res = await request(app)
        .patch(`/api/tasks/${task.id}`)
        .set('Authorization', auth)
        .send({ status, title: `Learn Redis (${status})` })
        .expect(200);
      expect(res.body.data).toMatchObject({ status, title: `Learn Redis (${status})` });
    }
  });

  it('clears an optional field with null', async () => {
    const task = await createTask(auth, { title: 'x', dueDate: '2026-12-01' });
    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', auth)
      .send({ dueDate: null })
      .expect(200);
    expect(res.body.data.dueDate).toBeNull();
  });

  it('deletes a task', async () => {
    const task = await createTask(auth, { title: 'Delete me' });
    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', auth)
      .expect(200);
    expect(res.body).toEqual({ success: true, data: { id: task.id } });
    await request(app).get(`/api/tasks/${task.id}`).set('Authorization', auth).expect(404);
    await request(app).delete(`/api/tasks/${task.id}`).set('Authorization', auth).expect(404);
  });

  it('returns 400 for a malformed task id', async () => {
    await request(app).get('/api/tasks/not-a-uuid').set('Authorization', auth).expect(400);
  });

  it('requires authentication on every task endpoint', async () => {
    const id = '00000000-0000-4000-8000-000000000000';
    await request(app).get('/api/tasks').expect(401);
    await request(app).get('/api/tasks/stats').expect(401);
    await request(app).post('/api/tasks').send({ title: 'x' }).expect(401);
    await request(app).get(`/api/tasks/${id}`).expect(401);
    await request(app).patch(`/api/tasks/${id}`).send({ title: 'x' }).expect(401);
    await request(app).delete(`/api/tasks/${id}`).expect(401);
  });
});

describe('GET /api/tasks: pagination, filter, search, sort', () => {
  beforeEach(async () => {
    // Created sequentially so createdAt order is deterministic.
    const seed = [
      { title: 'Learn Redis caching', priority: 'HIGH', status: 'TODO', dueDate: '2026-12-05' },
      { title: 'Write tests', priority: 'LOW', status: 'COMPLETED', dueDate: '2026-12-01' },
      {
        title: 'Deploy app',
        description: 'redis config too',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
      },
      { title: 'Plan sprint', priority: 'HIGH', status: 'TODO', dueDate: '2026-12-03' },
      { title: 'Refactor', priority: 'LOW', status: 'TODO' },
    ];
    for (const body of seed) await createTask(auth, body);
  });

  it('paginates with total and totalPages', async () => {
    const page1 = await list('?page=1&limit=2').expect(200);
    const page3 = await list('?page=3&limit=2').expect(200);

    expect(page1.body.pagination).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(page1.body.data).toHaveLength(2);
    expect(page3.body.data).toHaveLength(1);
  });

  it('filters by status and priority', async () => {
    const res = await list('?status=TODO&priority=HIGH').expect(200);
    expect(res.body.data.map((t) => t.title).sort()).toEqual([
      'Learn Redis caching',
      'Plan sprint',
    ]);
  });

  it('searches title and description case-insensitively', async () => {
    const res = await list('?search=REDIS').expect(200);
    expect(res.body.data.map((t) => t.title).sort()).toEqual(['Deploy app', 'Learn Redis caching']);
  });

  it('sorts newest / oldest', async () => {
    const newest = await list('?sortBy=createdAt&sortOrder=desc').expect(200);
    const oldest = await list('?sortBy=createdAt&sortOrder=asc').expect(200);
    expect(newest.body.data[0].title).toBe('Refactor');
    expect(oldest.body.data[0].title).toBe('Learn Redis caching');
  });

  it('sorts by priority (HIGH first when desc)', async () => {
    const res = await list('?sortBy=priority&sortOrder=desc').expect(200);
    expect(res.body.data.map((t) => t.priority)).toEqual(['HIGH', 'HIGH', 'MEDIUM', 'LOW', 'LOW']);
  });

  it('sorts by due date with undated tasks last', async () => {
    const res = await list('?sortBy=dueDate&sortOrder=asc').expect(200);
    expect(res.body.data.map((t) => t.title)).toEqual([
      'Write tests',
      'Plan sprint',
      'Learn Redis caching',
      expect.any(String),
      expect.any(String),
    ]);
    expect(res.body.data.slice(3).every((t) => t.dueDate === null)).toBe(true);
  });

  it('returns dashboard stats', async () => {
    const res = await request(app).get('/api/tasks/stats').set('Authorization', auth).expect(200);
    expect(res.body.data).toEqual({
      total: 5,
      todo: 3,
      inProgress: 1,
      completed: 1,
      highPriority: 2,
    });
  });

  it('rejects invalid query parameters', async () => {
    const res = await list('?limit=500&sortBy=passwordHash').expect(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(['limit', 'sortBy']);
  });
});
