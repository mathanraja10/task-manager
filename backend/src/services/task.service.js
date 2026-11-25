const taskRepository = require('../repositories/task.repository');
const { cacheService: cache, keys } = require('./cache.service');
const AppError = require('../utils/AppError');
const { TASK_STATUSES } = require('../validators/task.validator');

const TASK_NOT_FOUND = 'Task not found';

/**
 * Cache-aside read: Redis HIT -> return; MISS -> PostgreSQL -> store -> return.
 * If Redis is unavailable the version is null and we go straight to the DB.
 * Returns { value, cacheStatus } where cacheStatus is HIT | MISS | BYPASS.
 */
async function readThrough(userId, buildKey, load) {
  const version = await cache.getUserVersion(userId);
  if (version === null) return { value: await load(), cacheStatus: 'BYPASS' };

  const key = buildKey(version);
  const cached = await cache.get(key);
  if (cached !== null) return { value: cached, cacheStatus: 'HIT' };

  const value = await load();
  if (value !== null) await cache.set(key, value);
  return { value, cacheStatus: 'MISS' };
}

async function listTasks(userId, query) {
  const { value, cacheStatus } = await readThrough(
    userId,
    (version) => keys.taskList(userId, version, query),
    async () => {
      const { items, total } = await taskRepository.findManyForUser(userId, query);
      return {
        data: items,
        pagination: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      };
    },
  );
  return { ...value, cacheStatus };
}

async function getTask(userId, taskId) {
  const { value, cacheStatus } = await readThrough(
    userId,
    (version) => keys.task(userId, version, taskId),
    () => taskRepository.findByIdForUser(taskId, userId),
  );
  // Another user's task is reported as "not found" so its existence is not revealed.
  if (!value) throw AppError.notFound(TASK_NOT_FOUND);
  return { task: value, cacheStatus };
}

async function getStats(userId) {
  const { value, cacheStatus } = await readThrough(
    userId,
    (version) => keys.stats(userId, version),
    async () => {
      const { byStatus, highPriority } = await taskRepository.getStatsForUser(userId);
      const counts = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
      for (const row of byStatus) counts[row.status] = row._count._all;
      return {
        total: Object.values(counts).reduce((sum, n) => sum + n, 0),
        todo: counts.TODO,
        inProgress: counts.IN_PROGRESS,
        completed: counts.COMPLETED,
        highPriority,
      };
    },
  );
  return { stats: value, cacheStatus };
}

// Mutations: write to PostgreSQL first, then invalidate the user's caches.

async function createTask(userId, data) {
  const task = await taskRepository.create(userId, data);
  // The token was valid but its user has since been deleted.
  if (!task) throw AppError.unauthorized('User no longer exists');
  await cache.invalidateUser(userId);
  return task;
}

async function updateTask(userId, taskId, data) {
  const task = await taskRepository.updateForUser(taskId, userId, data);
  if (!task) throw AppError.notFound(TASK_NOT_FOUND);
  await cache.invalidateUser(userId);
  return task;
}

async function deleteTask(userId, taskId) {
  const deleted = await taskRepository.deleteForUser(taskId, userId);
  if (!deleted) throw AppError.notFound(TASK_NOT_FOUND);
  await cache.invalidateUser(userId);
}

module.exports = { listTasks, getTask, getStats, createTask, updateTask, deleteTask };
