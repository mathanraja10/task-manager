const { registerSchema, loginSchema } = require('../../src/validators/auth.validator');
const {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
} = require('../../src/validators/task.validator');
const { formatZodIssues } = require('../../src/utils/validation');

const errorsOf = (schema, input) => formatZodIssues(schema.safeParse(input).error);

describe('auth validators', () => {
  it('normalises email to trimmed lowercase', () => {
    const data = loginSchema.parse({ email: '  Mathan@Example.COM ', password: 'x' });
    expect(data.email).toBe('mathan@example.com');
  });

  it('reports every invalid register field', () => {
    expect(
      errorsOf(registerSchema, { name: '', email: 'not-an-email', password: 'short' }),
    ).toEqual(
      expect.arrayContaining([
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Email must be a valid email address' },
        { field: 'password', message: 'Password must be at least 8 characters' },
      ]),
    );
  });

  it('requires a password with letters and numbers', () => {
    expect(
      errorsOf(registerSchema, { name: 'A', email: 'a@b.co', password: 'onlyletters' }),
    ).toEqual([{ field: 'password', message: 'Password must contain a number' }]);
  });
});

describe('task validators', () => {
  it('requires a title', () => {
    expect(errorsOf(createTaskSchema, {})).toEqual([
      { field: 'title', message: 'Title is required' },
    ]);
    expect(errorsOf(createTaskSchema, { title: '   ' })).toEqual([
      { field: 'title', message: 'Title is required' },
    ]);
  });

  it('rejects a client-supplied userId (ownership comes from the JWT)', () => {
    expect(errorsOf(createTaskSchema, { title: 'x', userId: 'someone-else' })).toEqual([
      { field: 'userId', message: 'Unknown field "userId"' },
    ]);
  });

  it('rejects unknown status and priority values', () => {
    const fields = errorsOf(updateTaskSchema, { status: 'DONE', priority: 'URGENT' }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['status', 'priority']);
  });

  it('parses dueDate to a UTC date and rejects impossible dates', () => {
    expect(
      createTaskSchema.parse({ title: 'x', dueDate: '2026-12-01' }).dueDate.toISOString(),
    ).toBe('2026-12-01T00:00:00.000Z');
    expect(errorsOf(createTaskSchema, { title: 'x', dueDate: '2026-02-30' })).toEqual([
      { field: 'dueDate', message: 'Due date is not a valid calendar date' },
    ]);
    expect(errorsOf(createTaskSchema, { title: 'x', dueDate: 'tomorrow' })[0].field).toBe(
      'dueDate',
    );
  });

  it('allows clearing description and dueDate on update', () => {
    expect(updateTaskSchema.parse({ description: '', dueDate: null })).toEqual({
      description: null,
      dueDate: null,
    });
  });

  it('rejects an empty update', () => {
    expect(errorsOf(updateTaskSchema, {})).toEqual([
      { field: 'request', message: 'Provide at least one field to update' },
    ]);
  });

  it('requires a UUID task id', () => {
    expect(errorsOf(taskIdParamsSchema, { id: '123' })[0].field).toBe('id');
  });
});

describe('list query validator', () => {
  it('applies defaults', () => {
    expect(listTasksQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('coerces numbers and treats empty strings as absent', () => {
    expect(
      listTasksQuerySchema.parse({ page: '3', limit: '25', status: '', search: '  redis  ' }),
    ).toMatchObject({ page: 3, limit: 25, search: 'redis' });
  });

  it('caps limit at 100 and rejects unsupported sort fields', () => {
    const fields = errorsOf(listTasksQuerySchema, { limit: '1000', sortBy: 'passwordHash' }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['limit', 'sortBy']);
  });
});
