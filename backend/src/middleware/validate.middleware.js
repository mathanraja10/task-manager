const AppError = require('../utils/AppError');
const { formatZodIssues } = require('../utils/validation');

/**
 * Validate request parts against Zod schemas: validate({ body, query, params }).
 * Parsed (coerced, trimmed, defaulted) values are stored on req.validated,
 * because Express 5 exposes req.query as a read-only getter.
 */
function validate(schemas) {
  return (req, _res, next) => {
    req.validated = {};
    const errors = [];

    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) {
        req.validated[part] = result.data;
      } else {
        errors.push(...formatZodIssues(result.error));
      }
    }

    if (errors.length) return next(AppError.badRequest('Validation failed', errors));
    return next();
  };
}

module.exports = validate;
