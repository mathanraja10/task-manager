const fs = require('node:fs');
const path = require('node:path');

/**
 * Resolves the integration-test database URL from TEST_DATABASE_URL
 * (environment or backend/.env). Refuses anything that does not look like a
 * dedicated test database, because the tests delete every row.
 */
function resolveTestDatabaseUrl() {
  const envFile = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is not set. See backend/.env.example.');
  }
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.includes('test') || url === process.env.DATABASE_URL) {
    throw new Error(
      `Refusing to run integration tests against "${dbName}": TEST_DATABASE_URL must name a separate database containing "test".`,
    );
  }
  return url;
}

module.exports = { resolveTestDatabaseUrl };
