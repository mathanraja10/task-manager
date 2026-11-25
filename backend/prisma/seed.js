/**
 * Seeds two demo users with tasks. Safe to run repeatedly: each run resets
 * the demo users' tasks. Demo password for both users: Password123
 */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password123';

const day = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};

const DEMO_USERS = [
  {
    name: 'Alice Demo',
    email: 'alice@example.com',
    tasks: [
      {
        title: 'Learn Redis caching',
        description: 'Implement cache-aside for task lists',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: day(3),
      },
      {
        title: 'Write Prisma migrations',
        description: 'Users and tasks tables with indexes',
        status: 'COMPLETED',
        priority: 'MEDIUM',
        dueDate: day(-2),
      },
      {
        title: 'Add JWT authentication',
        description: 'Register, login and /me endpoints',
        status: 'COMPLETED',
        priority: 'HIGH',
        dueDate: day(-5),
      },
      {
        title: 'Build dashboard page',
        description: 'Show task counts by status',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: day(7),
      },
      {
        title: 'Review database indexes',
        description: 'Check EXPLAIN ANALYZE for list queries',
        status: 'TODO',
        priority: 'LOW',
        dueDate: null,
      },
      {
        title: 'Prepare release notes',
        description: null,
        status: 'TODO',
        priority: 'HIGH',
        dueDate: day(1),
      },
    ],
  },
  {
    name: 'Bob Demo',
    email: 'bob@example.com',
    tasks: [
      {
        title: 'Plan sprint backlog',
        description: 'Groom stories for next sprint',
        status: 'TODO',
        priority: 'HIGH',
        dueDate: day(2),
      },
      {
        title: 'Fix login rate limiting',
        description: 'Tune limits for auth endpoints',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        dueDate: day(4),
      },
      {
        title: 'Update README',
        description: 'Document Redis setup on Windows',
        status: 'TODO',
        priority: 'LOW',
        dueDate: null,
      },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const { tasks, ...userData } of DEMO_USERS) {
    // Upsert the user and replace their tasks as one unit: either the whole
    // reset succeeds or nothing changes.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: userData.email },
        update: { name: userData.name, passwordHash },
        create: { ...userData, passwordHash },
      });
      await tx.task.deleteMany({ where: { userId: user.id } });
      await tx.task.createMany({ data: tasks.map((t) => ({ ...t, userId: user.id })) });
    });
    console.log(`Seeded ${userData.email} with ${tasks.length} tasks`);
  }
  console.log(`Demo password for all users: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
