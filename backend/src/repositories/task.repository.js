const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');

const hasPrismaCode = (err, code) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;
/** P2025: record not found (update/delete matched no row). */
const isNotFound = (err) => hasPrismaCode(err, 'P2025');
/** P2003: foreign key violation (task.user_id points at a deleted user). */
const isMissingOwner = (err) => hasPrismaCode(err, 'P2003');

function buildWhere(userId, { status, priority, search }) {
  const where = { userId };
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }
  return where;
}

function buildOrderBy(sortBy, sortOrder) {
  // Tasks without a due date go last regardless of direction.
  const primary =
    sortBy === 'dueDate'
      ? { dueDate: { sort: sortOrder, nulls: 'last' } }
      : { [sortBy]: sortOrder };
  // Tie-breakers keep pagination stable when the primary values are equal.
  return [primary, { createdAt: 'desc' }, { id: 'asc' }];
}

/** One page of a user's tasks plus the total matching count. */
async function findManyForUser(
  userId,
  { page, limit, status, priority, search, sortBy, sortOrder },
) {
  const where = buildWhere(userId, { status, priority, search });
  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: buildOrderBy(sortBy, sortOrder),
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);
  return { items, total };
}

/** Returns null when the task does not exist OR belongs to another user. */
function findByIdForUser(id, userId) {
  return prisma.task.findFirst({ where: { id, userId } });
}

/** Returns null if the owning user no longer exists. */
async function create(userId, data) {
  try {
    return await prisma.task.create({ data: { ...data, userId } });
  } catch (err) {
    if (isMissingOwner(err)) return null;
    throw err;
  }
}

/**
 * Ownership is enforced in the same UPDATE statement (WHERE id AND user_id),
 * so there is no gap between "check owner" and "write". Returns null if no
 * row matched, i.e. the task is missing or owned by someone else.
 */
async function updateForUser(id, userId, data) {
  try {
    return await prisma.task.update({ where: { id, userId }, data });
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** Returns true if a task owned by the user was deleted. */
async function deleteForUser(id, userId) {
  const { count } = await prisma.task.deleteMany({ where: { id, userId } });
  return count > 0;
}

/** Counts for the dashboard, computed in PostgreSQL rather than in JS. */
async function getStatsForUser(userId) {
  const [byStatus, highPriority] = await Promise.all([
    prisma.task.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
    prisma.task.count({ where: { userId, priority: 'HIGH' } }),
  ]);
  return { byStatus, highPriority };
}

module.exports = {
  findManyForUser,
  findByIdForUser,
  create,
  updateForUser,
  deleteForUser,
  getStatsForUser,
};
