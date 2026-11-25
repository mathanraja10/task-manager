const fs = require('node:fs');
const path = require('node:path');
const { z } = require('zod');

// Load backend/.env when present. Variables already set in the real
// environment win, so production can inject config without a file.
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  REDIS_CACHE_TTL: z.coerce.number().int().positive().default(60),
  JWT_SECRET: z.string().min(16, 'must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  // Number of reverse proxies in front of the API (0 = none, 1 = nginx).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Report variable names only - never echo values, they may be secrets.
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid environment configuration:\n${problems.join('\n')}`);
}

const env = parsed.data;

module.exports = Object.freeze({
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
});
