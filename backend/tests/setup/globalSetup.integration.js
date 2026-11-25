const { execSync } = require('node:child_process');
const { resolveTestDatabaseUrl } = require('./testDatabase');

/** Bring the test database schema up to date before any integration test runs. */
module.exports = async () => {
  execSync('npx prisma migrate deploy', {
    cwd: require('node:path').resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: resolveTestDatabaseUrl() },
    stdio: 'pipe',
  });
};
