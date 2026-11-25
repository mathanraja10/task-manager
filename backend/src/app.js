const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/env');
const requestLogger = require('./middleware/requestLogger.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const routes = require('./routes');

/** Builds the Express app without listening, so tests can drive it with supertest. */
function createApp() {
  const app = express();

  // Behind a reverse proxy (nginx in Docker), trust its X-Forwarded-For so the
  // rate limiter and logs see the real client IP instead of the proxy's.
  if (config.TRUST_PROXY > 0) app.set('trust proxy', config.TRUST_PROXY);

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigins,
      exposedHeaders: ['X-Cache'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  app.use('/api', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
