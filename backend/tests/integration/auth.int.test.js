const { app, request, prisma, resetState, registerUser, closeConnections } = require('./helpers');

beforeEach(resetState);
afterAll(closeConnections);

describe('POST /api/auth/register', () => {
  it('creates the user, returns a token and safe user fields, and stores only a hash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mathan', email: 'Mathan@Example.com', password: 'Password123' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: 'Mathan',
      email: 'mathan@example.com',
    });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);

    const row = await prisma.user.findUnique({ where: { email: 'mathan@example.com' } });
    expect(row.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(row.passwordHash).not.toContain('Password123');
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Again', email: 'DUP@example.com', password: 'Password123' })
      .expect(409);
    expect(res.body).toEqual({
      success: false,
      message: 'An account with this email already exists',
    });
  });

  it('returns structured validation errors with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nope', password: '123' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
  });
});

describe('POST /api/auth/login', () => {
  it('returns a working token for valid credentials', async () => {
    const { user, password } = await registerUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password })
      .expect(200);

    expect(res.body.data.user).toEqual(user);
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.data.token}`)
      .expect(200);
  });

  it('rejects a wrong password with 401', async () => {
    const { user } = await registerUser();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'WrongPass1' })
      .expect(401);
    expect(res.body).toEqual({ success: false, message: 'Invalid email or password' });
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user', async () => {
    const { user, auth } = await registerUser({ name: 'Mathan' });
    const res = await request(app).get('/api/auth/me').set('Authorization', auth).expect(200);
    expect(res.body).toEqual({ success: true, data: user });
  });

  it('requires authentication', async () => {
    await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
  });
});

describe('token of a deleted user', () => {
  it('is rejected with 401 (not 500) on /me and when creating a task', async () => {
    const { user, auth } = await registerUser();
    await prisma.user.delete({ where: { id: user.id } });

    await request(app).get('/api/auth/me').set('Authorization', auth).expect(401);
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', auth)
      .send({ title: 'Orphan' })
      .expect(401);
    expect(res.body).toEqual({ success: false, message: 'User no longer exists' });
  });
});
