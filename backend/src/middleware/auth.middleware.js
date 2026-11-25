const AppError = require('../utils/AppError');
const { verifyToken } = require('../utils/jwt');

/**
 * Requires `Authorization: Bearer <jwt>`. On success sets req.user = { id }.
 * The user id ALWAYS comes from the verified token, never from the request body.
 */
function authMiddleware(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(AppError.unauthorized());
  }

  try {
    req.user = { id: verifyToken(token) };
    return next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired token'));
  }
}

module.exports = authMiddleware;
