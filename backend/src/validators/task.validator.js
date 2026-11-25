const { z } = require('zod');

const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'];

const title = z
  .string({ error: 'Title is required' })
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be at most 200 characters');

// Empty string clears the description.
const description = z
  .string({ error: 'Description must be a string' })
  .trim()
  .max(5000, 'Description must be at most 5000 characters')
  .transform((v) => (v === '' ? null : v))
  .nullable();

const status = z.enum(TASK_STATUSES, {
  error: `Status must be one of ${TASK_STATUSES.join(', ')}`,
});
const priority = z.enum(TASK_PRIORITIES, {
  error: `Priority must be one of ${TASK_PRIORITIES.join(', ')}`,
});

// Accepts "YYYY-MM-DD" (or a full ISO timestamp, whose date part is used).
// Stored in a DATE column; null clears it.
const dueDate = z
  .string({ error: 'Due date must be a date string (YYYY-MM-DD)' })
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Due date must be a date (YYYY-MM-DD)')
  .transform((v, ctx) => {
    const date = new Date(`${v.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== v.slice(0, 10)) {
      ctx.addIssue({ code: 'custom', message: 'Due date is not a valid calendar date' });
      return z.NEVER;
    }
    return date;
  })
  .nullable();

// .strict() rejects unknown keys such as userId: ownership comes from the JWT only.
const createTaskSchema = z.strictObject({
  title,
  description: description.optional(),
  status: status.optional(),
  priority: priority.optional(),
  dueDate: dueDate.optional(),
});

const updateTaskSchema = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    status: status.optional(),
    priority: priority.optional(),
    dueDate: dueDate.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

const taskIdParamsSchema = z.object({
  id: z.uuid({ error: 'Task id must be a valid UUID' }),
});

// Treat "" (e.g. "?status=") the same as an absent parameter.
const optionalParam = (schema) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const listTasksQuerySchema = z.object({
  page: optionalParam(z.coerce.number().int().min(1, 'Page must be at least 1')).default(1),
  limit: optionalParam(
    z.coerce
      .number()
      .int()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit must be at most 100'),
  ).default(10),
  status: optionalParam(status),
  priority: optionalParam(priority),
  search: optionalParam(
    z.string().trim().max(100, 'Search must be at most 100 characters'),
  ).transform((v) => v || undefined),
  sortBy: optionalParam(
    z.enum(SORT_FIELDS, { error: `sortBy must be one of ${SORT_FIELDS.join(', ')}` }),
  ).default('createdAt'),
  sortOrder: optionalParam(
    z.enum(['asc', 'desc'], { error: 'sortOrder must be asc or desc' }),
  ).default('desc'),
});

module.exports = {
  TASK_STATUSES,
  createTaskSchema,
  updateTaskSchema,
  taskIdParamsSchema,
  listTasksQuerySchema,
};
