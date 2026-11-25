const { Prisma } = require('@prisma/client');
const config = require('../config/env');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function notFoundHandler(req, _res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.path} not found`));
}

/** Map known library errors to client-facing AppErrors. */
function normalizeError(err) {
  if (err instanceof AppError) return err;

  // Malformed JSON body or oversized payload from express.json()
  if (err.type === 'entity.parse.failed') return AppError.badRequest('Malformed JSON body');
  if (err.type === 'entity.too.large') return new AppError(413, 'Request body too large');

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return AppError.conflict('Resource already exists');
    if (err.code === 'P2025') return AppError.notFound();
  }

  return null;
}

// Express recognises error handlers by their 4-argument signature.
function errorHandler(err, req, res, _next) {
  const known = normalizeError(err);

  if (known) {
    const body = { success: false, message: known.message };
    if (known.errors) body.errors = known.errors;
    return res.status(known.statusCode).json(body);
  }

  // Unexpected error: log full details server-side, return a generic message.
  (req.log || logger).error({ err }, 'Unhandled error');
  const body = { success: false, message: 'Internal server error' };
  if (!config.isProduction) body.stack = err.stack;
  return res.status(500).json(body);
}

module.exports = { notFoundHandler, errorHandler };
