const {
  getWorkflowsService,
  getWorkflowByIdService,
  createWorkflowService,
  updateWorkflowService,
  deleteWorkflowService,
  triggerWorkflowService,
  getExecutionsService,
} = require('../services/workflowService');

exports.getWorkflows = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const data = await getWorkflowsService({
      tenantId: req.tenantId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getWorkflowById = async (req, res) => {
  try {
    const workflow = await getWorkflowByIdService({
      tenantId: req.tenantId,
      workflowId: req.params.id,
    });
    res.json({ workflow });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

exports.createWorkflow = async (req, res) => {
  try {
    const workflow = await createWorkflowService({
      tenantId: req.tenantId,
      userId: req.user._id,
      ...req.body,
    });
    res.status(201).json({ workflow });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateWorkflow = async (req, res) => {
  try {
    const workflow = await updateWorkflowService({
      tenantId: req.tenantId,
      workflowId: req.params.id,
      ...req.body,
    });
    res.json({ workflow });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteWorkflow = async (req, res) => {
  try {
    await deleteWorkflowService({
      tenantId: req.tenantId,
      workflowId: req.params.id,
    });
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.triggerWorkflow = async (req, res) => {
  try {
    const execution = await triggerWorkflowService({
      tenantId: req.tenantId,
      workflowId: req.params.id,
      userId: req.user._id,
    });
    res.json({ message: 'Workflow triggered successfully', execution });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getExecutions = async (req, res) => {
  try {
    const executions = await getExecutionsService({
      tenantId: req.tenantId,
      workflowId: req.params.id,
    });
    res.json({ executions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
