const { resolveTestDatabaseUrl } = require('./testDatabase');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.JWT_SECRET = 'integration-test-secret-at-least-16';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REDIS_CACHE_TTL = '60';
// The suite registers many users from one "IP"; keep the limiter out of the way.
process.env.AUTH_RATE_LIMIT_MAX = '1000';
