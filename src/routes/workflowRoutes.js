const express = require('express');
const router = express.Router();
const {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  triggerWorkflow,
  getExecutions,
} = require('../controllers/workflowController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getWorkflows);
router.post('/', authorize('admin', 'manager'), createWorkflow);
router.get('/:id', getWorkflowById);
router.put('/:id', authorize('admin', 'manager'), updateWorkflow);
router.delete('/:id', authorize('admin'), deleteWorkflow);
router.post('/:id/trigger', authorize('admin', 'manager'), triggerWorkflow);
router.get('/:id/executions', getExecutions);

module.exports = router;
