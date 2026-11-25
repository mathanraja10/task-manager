/**
 * An expected, client-facing error. The central error handler turns it into
 * { success: false, message, errors? } with the given status code.
 */
class AppError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }

  static badRequest(message, errors) {
    return new AppError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, message);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, message);
  }

  static conflict(message) {
    return new AppError(409, message);
  }
}

module.exports = AppError;
