const taskService = require('../services/task.service');
const { sendSuccess } = require('../utils/response');

// X-Cache (HIT | MISS | BYPASS) makes the Redis behaviour observable from
// curl, the browser dev tools and the integration tests.
const setCacheHeader = (res, status) => res.set('X-Cache', status);

async function list(req, res) {
  const { data, pagination, cacheStatus } = await taskService.listTasks(
    req.user.id,
    req.validated.query,
  );
  setCacheHeader(res, cacheStatus);
  sendSuccess(res, data, { pagination });
}

async function stats(req, res) {
  const { stats: result, cacheStatus } = await taskService.getStats(req.user.id);
  setCacheHeader(res, cacheStatus);
  sendSuccess(res, result);
}

async function getById(req, res) {
  const { task, cacheStatus } = await taskService.getTask(req.user.id, req.validated.params.id);
  setCacheHeader(res, cacheStatus);
  sendSuccess(res, task);
}

async function create(req, res) {
  const task = await taskService.createTask(req.user.id, req.validated.body);
  sendSuccess(res, task, { status: 201 });
}

async function update(req, res) {
  const task = await taskService.updateTask(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  sendSuccess(res, task);
}

async function remove(req, res) {
  await taskService.deleteTask(req.user.id, req.validated.params.id);
  sendSuccess(res, { id: req.validated.params.id });
}

module.exports = { list, stats, getById, create, update, remove };
