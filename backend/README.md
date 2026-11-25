# Task Manager — Backend API

Express 5 REST API with Prisma (PostgreSQL) and a Redis cache.
The project overview, architecture and full API reference are in the [root README](../README.md).

## Quick start

```bash
npm install
cp .env.example .env              # set DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET
npx prisma migrate dev            # create tables + indexes, generate the client
npm run prisma:seed               # demo users: alice@example.com / bob@example.com, password Password123
npm run dev                       # http://localhost:5000/api
```

Redis is optional at runtime. Without it every response has `X-Cache: BYPASS` and
`/api/health` reports `degraded`.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Start with nodemon (restarts on changes in `src/`) |
| `npm start` | Start without the file watcher |
| `npm run prisma:migrate` | `prisma migrate dev`: create/apply migrations |
| `npm run prisma:deploy` | `prisma migrate deploy`: apply existing migrations (CI/prod) |
| `npm run prisma:generate` | Regenerate the Prisma client |
| `npm run prisma:seed` | Reset demo data (runs inside a transaction) |
| `npm test` | Unit + integration tests |
| `npm run test:unit` | Unit tests only (no database) |
| `npm run test:integration` | Integration tests (needs `TEST_DATABASE_URL`) |
| `npm run lint` / `npm run format` | ESLint / Prettier |

## Request flow

```text
routes/task.routes.js        authMiddleware → validate({ params, query, body })
  → controllers/task.controller.js   reads req.validated, sets X-Cache, sends { success, data }
    → services/task.service.js       cache-aside read / write + invalidate
      → services/cache.service.js    Redis (all failures fall back to "miss")
      → repositories/task.repository.js   Prisma queries, always scoped by userId
```

Errors are thrown, not handled per route. Services throw `AppError` (`utils/AppError.js`),
and `middleware/error.middleware.js` turns it, Zod errors, Prisma errors and malformed
JSON into `{ success: false, message, errors? }`. Express 5 forwards rejected async
handlers to that middleware automatically, so controllers don't need try/catch.

## Where things live

| Folder | Contents |
|--------|----------|
| `src/config/` | `env.js` (Zod-validated config), `prisma.js`, `redis.js` (fail-fast client) |
| `src/routes/` | `/api/auth`, `/api/tasks`, `/api/health` |
| `src/controllers/` | Thin HTTP adapters |
| `src/services/` | `auth.service`, `task.service`, `cache.service` |
| `src/repositories/` | `user.repository`, `task.repository` |
| `src/validators/` | Zod schemas for auth and task bodies, params and queries |
| `src/middleware/` | auth, validate, rate limit, request logger, error handler |
| `src/utils/` | `AppError`, `jwt`, `logger` (pino with redaction), response and validation helpers |
| `prisma/` | `schema.prisma`, migrations, `seed.js` |
| `tests/unit/` | Services, middleware, validators, cache (mocked DB, real dead-port Redis) |
| `tests/integration/` | supertest against real PostgreSQL + in-memory Redis |

## Testing notes

- Integration tests delete every row, so they refuse to run unless `TEST_DATABASE_URL`
  names a separate database containing `test`.
- `tests/setup/globalSetup.integration.js` applies migrations to the test database first.
- Redis is replaced by `tests/setup/ioredisMock.js` (`ioredis-mock` plus a connection
  `status` and a `simulateOutage()` switch).
