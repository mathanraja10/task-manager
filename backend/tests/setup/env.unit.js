// Unit tests never touch a real database; these values only satisfy config validation.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://unit-test-placeholder/none';
process.env.JWT_SECRET = 'unit-test-secret-at-least-16-chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REDIS_CACHE_TTL = '60';
