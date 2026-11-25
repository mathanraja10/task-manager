const jwt = require('jsonwebtoken');
const authMiddleware = require('../../src/middleware/auth.middleware');
const { signToken } = require('../../src/utils/jwt');

const USER_ID = '11111111-1111-4111-8111-111111111111';

function run(authorization) {
  const req = {
    get: (name) => (name.toLowerCase() === 'authorization' ? authorization : undefined),
  };
  const next = jest.fn();
  authMiddleware(req, {}, next);
  return { req, error: next.mock.calls[0][0] };
}

describe('authMiddleware', () => {
  it('attaches the user id from a valid Bearer token', () => {
    const { req, error } = run(`Bearer ${signToken(USER_ID)}`);
    expect(error).toBeUndefined();
    expect(req.user).toEqual({ id: USER_ID });
  });

  it.each([
    ['missing header', undefined],
    ['wrong scheme', `Basic ${signToken(USER_ID)}`],
    ['empty bearer', 'Bearer '],
  ])('rejects %s with 401', (_label, header) => {
    const { req, error } = run(header);
    expect(error).toMatchObject({ statusCode: 401 });
    expect(req.user).toBeUndefined();
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({}, 'attacker-secret-attacker-secret', { subject: USER_ID });
    expect(run(`Bearer ${forged}`).error).toMatchObject({ statusCode: 401 });
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: USER_ID, expiresIn: -10 });
    expect(run(`Bearer ${expired}`).error).toMatchObject({
      statusCode: 401,
      message: 'Invalid or expired token',
    });
  });

  it('rejects an unsigned ("alg: none") token', () => {
    const unsigned = jwt.sign({}, null, { subject: USER_ID, algorithm: 'none' });
    expect(run(`Bearer ${unsigned}`).error).toMatchObject({ statusCode: 401 });
  });
});
