/**
 * Mandatory user-isolation checks: User A must never read, change or delete
 * User B's tasks. Foreign tasks answer 404 (not 403) so A cannot even learn
 * that the id exists.
 */
const {
  app,
  request,
  prisma,
  resetState,
  registerUser,
  createTask,
  closeConnections,
} = require('./helpers');

let userA;
let userB;
let taskOfB;

beforeEach(async () => {
  await resetState();
  userA = await registerUser({ name: 'User A' });
  userB = await registerUser({ name: 'User B' });
  taskOfB = await createTask(userB.auth, { title: "B's private task", priority: 'HIGH' });
});
afterAll(closeConnections);

const expectUnchanged = async () => {
  const row = await prisma.task.findUnique({ where: { id: taskOfB.id } });
  expect(row).not.toBeNull();
  expect(row).toMatchObject({ title: "B's private task", status: 'TODO', userId: userB.user.id });
};

describe("User A cannot access User B's tasks", () => {
  it('User A cannot read User B task', async () => {
    const res = await request(app)
      .get(`/api/tasks/${taskOfB.id}`)
      .set('Authorization', userA.auth)
      .expect(404);
    expect(res.body).toEqual({ success: false, message: 'Task not found' });
  });

  it('User A cannot read User B task even after B has it cached', async () => {
    await request(app).get(`/api/tasks/${taskOfB.id}`).set('Authorization', userB.auth).expect(200);
    await request(app).get(`/api/tasks/${taskOfB.id}`).set('Authorization', userA.auth).expect(404);
  });

  it('User A cannot update User B task', async () => {
    await request(app)
      .patch(`/api/tasks/${taskOfB.id}`)
      .set('Authorization', userA.auth)
      .send({ title: 'hacked', status: 'COMPLETED' })
      .expect(404);
    await expectUnchanged();
  });

  it('User A cannot delete User B task', async () => {
    await request(app)
      .delete(`/api/tasks/${taskOfB.id}`)
      .set('Authorization', userA.auth)
      .expect(404);
    await expectUnchanged();
  });

  it("User A's list and stats never include User B's tasks", async () => {
    await createTask(userA.auth, { title: "A's task" });

    const list = await request(app).get('/api/tasks').set('Authorization', userA.auth).expect(200);
    expect(list.body.data.map((t) => t.title)).toEqual(["A's task"]);
    expect(list.body.pagination.total).toBe(1);

    const search = await request(app)
      .get('/api/tasks?search=private')
      .set('Authorization', userA.auth)
      .expect(200);
    expect(search.body.data).toEqual([]);

    const stats = await request(app).get('/api/tasks/stats').set('Authorization', userA.auth);
    expect(stats.body.data).toMatchObject({ total: 1, highPriority: 0 });
  });

  it('User A cannot create a task owned by User B by sending userId', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', userA.auth)
      .send({ title: 'sneaky', userId: userB.user.id })
      .expect(400);
    expect(res.body.errors).toEqual([{ field: 'userId', message: 'Unknown field "userId"' }]);
    expect(await prisma.task.count({ where: { userId: userB.user.id } })).toBe(1);
  });

  it('User A cannot move their task to User B via update', async () => {
    const taskOfA = await createTask(userA.auth, { title: "A's task" });
    await request(app)
      .patch(`/api/tasks/${taskOfA.id}`)
      .set('Authorization', userA.auth)
      .send({ userId: userB.user.id })
      .expect(400);
    const row = await prisma.task.findUnique({ where: { id: taskOfA.id } });
    expect(row.userId).toBe(userA.user.id);
  });
});
