const { Router } = require('express');
const taskController = require('../controllers/task.controller');
const authMiddleware = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createTaskSchema,
  updateTaskSchema,
  taskIdParamsSchema,
  listTasksQuerySchema,
} = require('../validators/task.validator');

const router = Router();

// Every task endpoint requires a valid JWT.
router.use(authMiddleware);

router.get('/', validate({ query: listTasksQuerySchema }), taskController.list);
router.post('/', validate({ body: createTaskSchema }), taskController.create);
// Declared before "/:id" so "stats" is not treated as a task id.
router.get('/stats', taskController.stats);
router.get('/:id', validate({ params: taskIdParamsSchema }), taskController.getById);
router.patch(
  '/:id',
  validate({ params: taskIdParamsSchema, body: updateTaskSchema }),
  taskController.update,
);
router.delete('/:id', validate({ params: taskIdParamsSchema }), taskController.remove);

module.exports = router;
