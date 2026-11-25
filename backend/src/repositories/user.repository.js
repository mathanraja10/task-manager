const prisma = require('../config/prisma');

// Fields that are safe to return to clients. passwordHash is never selected
// except by findByEmailWithPassword, which only the login flow uses.
const SAFE_USER_SELECT = { id: true, name: true, email: true, createdAt: true, updatedAt: true };

function findById(id) {
  return prisma.user.findUnique({ where: { id }, select: SAFE_USER_SELECT });
}

function findByEmail(email) {
  return prisma.user.findUnique({ where: { email }, select: SAFE_USER_SELECT });
}

function findByEmailWithPassword(email) {
  return prisma.user.findUnique({ where: { email } });
}

function create({ name, email, passwordHash }) {
  return prisma.user.create({ data: { name, email, passwordHash }, select: SAFE_USER_SELECT });
}

module.exports = { findById, findByEmail, findByEmailWithPassword, create };
