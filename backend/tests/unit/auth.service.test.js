jest.mock('../../src/repositories/user.repository');

const bcrypt = require('bcryptjs');
const userRepository = require('../../src/repositories/user.repository');
const authService = require('../../src/services/auth.service');
const { verifyToken } = require('../../src/utils/jwt');

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('auth.service', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('register', () => {
    it('stores a bcrypt hash (never the plain password) and returns a token for the new user', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockImplementation(async ({ name, email }) => ({
        id: USER_ID,
        name,
        email,
      }));

      const result = await authService.register({
        name: 'Mathan',
        email: 'mathan@example.com',
        password: 'Password123',
      });

      const stored = userRepository.create.mock.calls[0][0];
      expect(stored.passwordHash).not.toBe('Password123');
      expect(await bcrypt.compare('Password123', stored.passwordHash)).toBe(true);
      expect(stored).not.toHaveProperty('password');

      expect(result.user).toEqual({ id: USER_ID, name: 'Mathan', email: 'mathan@example.com' });
      expect(verifyToken(result.token)).toBe(USER_ID);
    });

    it('rejects an email that is already registered with 409', async () => {
      userRepository.findByEmail.mockResolvedValue({ id: USER_ID });

      await expect(
        authService.register({ name: 'X', email: 'taken@example.com', password: 'Password123' }),
      ).rejects.toMatchObject({ statusCode: 409 });
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const storedUser = async () => ({
      id: USER_ID,
      name: 'Mathan',
      email: 'mathan@example.com',
      passwordHash: await bcrypt.hash('Password123', 4),
    });

    it('returns the safe user and a valid token for correct credentials', async () => {
      userRepository.findByEmailWithPassword.mockResolvedValue(await storedUser());

      const result = await authService.login({
        email: 'mathan@example.com',
        password: 'Password123',
      });

      expect(result.user).toEqual({ id: USER_ID, name: 'Mathan', email: 'mathan@example.com' });
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(verifyToken(result.token)).toBe(USER_ID);
    });

    it('rejects a wrong password with 401', async () => {
      userRepository.findByEmailWithPassword.mockResolvedValue(await storedUser());

      await expect(
        authService.login({ email: 'mathan@example.com', password: 'WrongPass1' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    });

    it('rejects an unknown email with the same 401 message (no account enumeration)', async () => {
      userRepository.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ghost@example.com', password: 'Password123' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid email or password' });
    });
  });

  describe('getCurrentUser', () => {
    it('rejects a valid token whose user was deleted', async () => {
      userRepository.findById.mockResolvedValue(null);
      await expect(authService.getCurrentUser(USER_ID)).rejects.toMatchObject({ statusCode: 401 });
    });
  });
});
