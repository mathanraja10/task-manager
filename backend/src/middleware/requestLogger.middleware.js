const pinoHttp = require('pino-http');
const logger = require('../utils/logger');

/**
 * Logs one structured line per request: method, url, status, duration (ms).
 * Headers and bodies are deliberately not logged (they carry JWTs/passwords).
 */
const requestLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});

module.exports = requestLogger;
