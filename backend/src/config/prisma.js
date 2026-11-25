const { PrismaClient } = require('@prisma/client');

// One PrismaClient per process; it manages its own connection pool.
const prisma = new PrismaClient();

module.exports = prisma;
