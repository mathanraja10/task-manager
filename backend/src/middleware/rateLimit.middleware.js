const rateLimit = require('express-rate-limit');
const config = require('../config/env');

/** Slows down credential stuffing / brute force on login and register. */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later' },
});

module.exports = { authRateLimiter };
