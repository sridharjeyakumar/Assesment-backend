const Workflow = require('../models/Workflow');
const WorkflowExecution = require('../models/WorkflowExecution');

exports.getWorkflowsService = async ({ tenantId, page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const total = await Workflow.countDocuments({ tenantId });
  const workflows = await Workflow.find({ tenantId })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    workflows,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    }
  };
};

exports.getWorkflowByIdService = async ({ tenantId, workflowId }) => {
  const workflow = await Workflow.findOne({ _id: workflowId, tenantId })
    .populate('createdBy', 'name email');
  if (!workflow) throw new Error('Workflow not found');
  return workflow;
};

exports.createWorkflowService = async ({ tenantId, userId, name, description, nodes, edges }) => {
  const workflow = await Workflow.create({
    tenantId,
    createdBy: userId,
    name,
    description,
    nodes: nodes || [],
    edges: edges || [],
  });
  return workflow;
};

exports.updateWorkflowService = async ({ tenantId, workflowId, name, description, nodes, edges }) => {
  const workflow = await Workflow.findOne({ _id: workflowId, tenantId });
  if (!workflow) throw new Error('Workflow not found');

  workflow.name = name || workflow.name;
  workflow.description = description || workflow.description;
  workflow.nodes = nodes || workflow.nodes;
  workflow.edges = edges || workflow.edges;
  workflow.version = workflow.version + 1;

  await workflow.save();
  return workflow;
};

exports.deleteWorkflowService = async ({ tenantId, workflowId }) => {
  const workflow = await Workflow.findOneAndDelete({ _id: workflowId, tenantId });
  if (!workflow) throw new Error('Workflow not found');
};

exports.triggerWorkflowService = async ({ tenantId, workflowId, userId }) => {
  const workflow = await Workflow.findOne({ _id: workflowId, tenantId });
  if (!workflow) throw new Error('Workflow not found');

  const execution = await WorkflowExecution.create({
    tenantId,
    workflowId,
    triggeredBy: userId,
    status: 'pending',
    startedAt: new Date(),
    logs: [{ step: 'init', status: 'pending', message: 'Workflow execution started' }],
  });

  setTimeout(async () => {
    try {
      execution.status = 'running';
      execution.logs.push({ step: 'running', status: 'running', message: 'Processing nodes' });
      await execution.save();

      await new Promise(resolve => setTimeout(resolve, 2000));

      execution.status = 'success';
      execution.completedAt = new Date();
      execution.logs.push({ step: 'complete', status: 'success', message: 'Workflow completed successfully' });
      await execution.save();

      await Workflow.findByIdAndUpdate(workflowId, { $inc: { executionCount: 1 } });
    } catch (err) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.logs.push({ step: 'error', status: 'failed', message: err.message });
      await execution.save();
    }
  }, 100);

  return execution;
};

exports.getExecutionsService = async ({ tenantId, workflowId }) => {
  const executions = await WorkflowExecution.find({ tenantId, workflowId })
    .populate('triggeredBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(20);
  return executions;
};
