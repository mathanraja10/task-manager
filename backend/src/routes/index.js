const { Router } = require('express');
const authRoutes = require('./auth.routes');
const taskRoutes = require('./task.routes');
const { health } = require('../controllers/health.controller');

const router = Router();

router.get('/health', health);
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;
