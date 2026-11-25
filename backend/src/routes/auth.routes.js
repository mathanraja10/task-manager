const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { authRateLimiter } = require('../middleware/rateLimit.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
