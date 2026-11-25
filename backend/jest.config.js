/**
 * Two projects:
 *  - unit:        no database; repositories/Redis are mocked or pointed at a dead port
 *  - integration: real PostgreSQL (TEST_DATABASE_URL) + in-memory Redis (ioredis-mock)
 */
module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup/env.unit.js'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      setupFiles: ['<rootDir>/tests/setup/env.integration.js'],
      globalSetup: '<rootDir>/tests/setup/globalSetup.integration.js',
      moduleNameMapper: { '^ioredis$': '<rootDir>/tests/setup/ioredisMock.js' },
    },
  ],
};
