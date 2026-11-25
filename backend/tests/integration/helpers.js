const request = require('supertest');
const prisma = require('../../src/config/prisma');
const { redis } = require('../../src/config/redis');
const { createApp } = require('../../src/app');

const app = createApp();

let userCounter = 0;

/** Wipe all rows and cached data so each test starts from a clean state. */
async function resetState() {
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushall();
  redis.restore();
}

/** End a simulated outage and let the cache service replay deferred invalidations. */
async function reconnectRedis() {
  redis.restore();
  await new Promise((resolve) => setTimeout(resolve, 10));
}

/** Register a fresh user and return { user, token, auth } where auth is the header value. */
async function registerUser(overrides = {}) {
  userCounter += 1;
  const body = {
    name: `User ${userCounter}`,
    email: `user${userCounter}-${Date.now()}@example.com`,
    password: 'Password123',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body).expect(201);
  return { ...res.body.data, auth: `Bearer ${res.body.data.token}`, password: body.password };
}

async function createTask(auth, body) {
  const res = await request(app)
    .post('/api/tasks')
    .set('Authorization', auth)
    .send(body)
    .expect(201);
  return res.body.data;
}

async function closeConnections() {
  await prisma.$disconnect();
}

module.exports = {
  app,
  request,
  prisma,
  redis,
  resetState,
  reconnectRedis,
  registerUser,
  createTask,
  closeConnections,
};
