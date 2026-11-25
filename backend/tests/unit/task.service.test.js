jest.mock('../../src/repositories/task.repository');
jest.mock('../../src/services/cache.service', () => {
  const actual = jest.requireActual('../../src/services/cache.service');
  return {
    keys: actual.keys,
    cacheService: {
      getUserVersion: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      invalidateUser: jest.fn(),
    },
  };
});

const taskRepository = require('../../src/repositories/task.repository');
const { cacheService: cache } = require('../../src/services/cache.service');
const taskService = require('../../src/services/task.service');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TASK_ID = '22222222-2222-4222-8222-222222222222';
const QUERY = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
const TASK = { id: TASK_ID, userId: USER_ID, title: 'Learn Redis', status: 'TODO' };

describe('task.service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    cache.getUserVersion.mockResolvedValue('3');
  });

  describe('listTasks (cache-aside)', () => {
    it('cache HIT: returns the cached page without querying PostgreSQL', async () => {
      const cached = { data: [TASK], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } };
      cache.get.mockResolvedValue(cached);

      const result = await taskService.listTasks(USER_ID, QUERY);

      expect(result).toEqual({ ...cached, cacheStatus: 'HIT' });
      expect(taskRepository.findManyForUser).not.toHaveBeenCalled();
      expect(cache.get).toHaveBeenCalledWith(
        `tasks:user:${USER_ID}:v3:list:page:1:limit:10:status:all:priority:all:search:none:sort:createdAt:desc`,
      );
    });

    it('cache MISS: queries PostgreSQL, stores the result, and computes pagination', async () => {
      cache.get.mockResolvedValue(null);
      taskRepository.findManyForUser.mockResolvedValue({ items: [TASK], total: 25 });

      const result = await taskService.listTasks(USER_ID, QUERY);

      expect(taskRepository.findManyForUser).toHaveBeenCalledWith(USER_ID, QUERY);
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
      expect(result.cacheStatus).toBe('MISS');
      expect(cache.set).toHaveBeenCalledWith(cache.get.mock.calls[0][0], {
        data: [TASK],
        pagination: result.pagination,
      });
    });

    it('Redis unavailable: bypasses the cache and still serves from PostgreSQL', async () => {
      cache.getUserVersion.mockResolvedValue(null);
      taskRepository.findManyForUser.mockResolvedValue({ items: [TASK], total: 1 });

      const result = await taskService.listTasks(USER_ID, QUERY);

      expect(result.cacheStatus).toBe('BYPASS');
      expect(result.data).toEqual([TASK]);
      expect(cache.get).not.toHaveBeenCalled();
      expect(cache.set).not.toHaveBeenCalled();
    });

    it('builds different cache keys for different filters (no cross-query collisions)', async () => {
      cache.get.mockResolvedValue(null);
      taskRepository.findManyForUser.mockResolvedValue({ items: [], total: 0 });

      await taskService.listTasks(USER_ID, { ...QUERY, status: 'TODO', search: 'Redis' });
      await taskService.listTasks(USER_ID, { ...QUERY, page: 2 });

      const [first, second] = cache.get.mock.calls.map(([key]) => key);
      expect(first).toContain(':status:TODO:');
      expect(first).toContain(':search:redis:');
      expect(second).toContain(':page:2:');
      expect(first).not.toBe(second);
    });
  });

  describe('getTask', () => {
    it('looks the task up scoped to the requesting user', async () => {
      cache.get.mockResolvedValue(null);
      taskRepository.findByIdForUser.mockResolvedValue(TASK);

      const { task } = await taskService.getTask(USER_ID, TASK_ID);

      expect(task).toEqual(TASK);
      expect(taskRepository.findByIdForUser).toHaveBeenCalledWith(TASK_ID, USER_ID);
    });

    it('throws 404 (and caches nothing) when the task is missing or owned by someone else', async () => {
      cache.get.mockResolvedValue(null);
      taskRepository.findByIdForUser.mockResolvedValue(null);

      await expect(taskService.getTask(USER_ID, TASK_ID)).rejects.toMatchObject({
        statusCode: 404,
        message: 'Task not found',
      });
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe('mutations invalidate the user cache', () => {
    it('createTask: inserts with the authenticated user id, then invalidates', async () => {
      taskRepository.create.mockResolvedValue(TASK);

      const task = await taskService.createTask(USER_ID, { title: 'Learn Redis' });

      expect(task).toEqual(TASK);
      expect(taskRepository.create).toHaveBeenCalledWith(USER_ID, { title: 'Learn Redis' });
      expect(cache.invalidateUser).toHaveBeenCalledWith(USER_ID);
    });

    it('createTask: 401 when the token belongs to a deleted user', async () => {
      taskRepository.create.mockResolvedValue(null);

      await expect(taskService.createTask(USER_ID, { title: 'x' })).rejects.toMatchObject({
        statusCode: 401,
      });
      expect(cache.invalidateUser).not.toHaveBeenCalled();
    });

    it('updateTask: updates scoped to the owner, then invalidates', async () => {
      taskRepository.updateForUser.mockResolvedValue({ ...TASK, status: 'COMPLETED' });

      const task = await taskService.updateTask(USER_ID, TASK_ID, { status: 'COMPLETED' });

      expect(task.status).toBe('COMPLETED');
      expect(taskRepository.updateForUser).toHaveBeenCalledWith(TASK_ID, USER_ID, {
        status: 'COMPLETED',
      });
      expect(cache.invalidateUser).toHaveBeenCalledWith(USER_ID);
    });

    it('updateTask: 404 and no invalidation when the user does not own the task', async () => {
      taskRepository.updateForUser.mockResolvedValue(null);

      await expect(
        taskService.updateTask(USER_ID, TASK_ID, { title: 'hijack' }),
      ).rejects.toMatchObject({ statusCode: 404 });
      expect(cache.invalidateUser).not.toHaveBeenCalled();
    });

    it('deleteTask: deletes scoped to the owner, then invalidates', async () => {
      taskRepository.deleteForUser.mockResolvedValue(true);

      await taskService.deleteTask(USER_ID, TASK_ID);

      expect(taskRepository.deleteForUser).toHaveBeenCalledWith(TASK_ID, USER_ID);
      expect(cache.invalidateUser).toHaveBeenCalledWith(USER_ID);
    });

    it('deleteTask: 404 when nothing owned by the user was deleted', async () => {
      taskRepository.deleteForUser.mockResolvedValue(false);

      await expect(taskService.deleteTask(USER_ID, TASK_ID)).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(cache.invalidateUser).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('fills in zero counts for statuses with no tasks', async () => {
      cache.get.mockResolvedValue(null);
      taskRepository.getStatsForUser.mockResolvedValue({
        byStatus: [
          { status: 'TODO', _count: { _all: 4 } },
          { status: 'COMPLETED', _count: { _all: 2 } },
        ],
        highPriority: 1,
      });

      const { stats } = await taskService.getStats(USER_ID);

      expect(stats).toEqual({ total: 6, todo: 4, inProgress: 0, completed: 2, highPriority: 1 });
    });
  });
});
