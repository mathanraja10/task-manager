const pino = require('pino');
const config = require('../config/env');

// Structured JSON logger. Redaction is a safety net: secrets should never be
// passed to the logger in the first place.
const logger = pino({
  level: config.isTest ? 'silent' : config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'passwordHash',
      'token',
      '*.password',
      '*.passwordHash',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
