const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');

const BCRYPT_ROUNDS = 12;
// Compared against when the email is unknown, so login takes the same time
// whether or not the account exists (prevents user enumeration by timing).
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', BCRYPT_ROUNDS);

const toPublicUser = ({ id, name, email }) => ({ id, name, email });

async function register({ name, email, password }) {
  if (await userRepository.findByEmail(email)) {
    throw AppError.conflict('An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // A concurrent duplicate registration still fails on the unique index
  // (Prisma P2002), which the error handler maps to 409.
  const user = await userRepository.create({ name, email, passwordHash });
  return { user: toPublicUser(user), token: signToken(user.id) };
}

async function login({ email, password }) {
  const user = await userRepository.findByEmailWithPassword(email);
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    // Same message for unknown email and wrong password.
    throw AppError.unauthorized('Invalid email or password');
  }
  return { user: toPublicUser(user), token: signToken(user.id) };
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  // Valid token but the account no longer exists.
  if (!user) throw AppError.unauthorized('User no longer exists');
  return toPublicUser(user);
}

module.exports = { register, login, getCurrentUser };
