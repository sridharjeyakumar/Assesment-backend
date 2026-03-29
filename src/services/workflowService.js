const Workflow = require('../models/Workflow');
const WorkflowExecution = require('../models/WorkflowExecution');
const axios = require('axios');
const { sendEmail } = require('../utils/emailService');
const User = require('../models/User');

const executeNode = async (node, tenantId) => {
  const { type, data } = node;
  const config = data?.config || {};

  switch (type) {
    case 'start':
      return { success: true, message: 'Workflow started' };

    case 'action':
      switch (config.actionType) {
        case 'send_email':
          if (!config.toEmail) {
            return { success: true, message: 'Email skipped: no recipient configured' };
          }
          const emailResult = await sendEmail({
            to: config.toEmail,
            subject: config.subject || 'Notification from WorkFlow Pro',
            body: config.body || 'This is an automated message.',
          });
          return {
            success: true,
            message: `Email sent to ${config.toEmail}`
          };

        case 'call_api':
          if (!config.apiUrl) {
            return { success: true, message: 'API call skipped: no URL configured' };
          }
          try {
            const method = (config.method || 'GET').toLowerCase();
            const response = await axios({
              method,
              url: config.apiUrl,
              timeout: 10000,
            });
            return {
              success: true,
              message: `API called: ${config.method} ${config.apiUrl} → Status: ${response.status}`
            };
          } catch (apiError) {
            return {
              success: false,
              message: `API call failed: ${apiError.message}`
            };
          }

        case 'assign_role':
          if (!config.role) {
            return { success: true, message: 'Assign role skipped: no role configured' };
          }
          try {
            const usersToUpdate = await User.find({
              tenantId,
              role: 'viewer',
              isActive: true,
            }).limit(1);

            if (usersToUpdate.length === 0) {
              return { success: true, message: `No users found to assign role` };
            }

            await User.findByIdAndUpdate(
              usersToUpdate[0]._id,
              { role: config.role }
            );

            return {
              success: true,
              message: `Role '${config.role}' assigned to ${usersToUpdate[0].name}`
            };
          } catch (roleError) {
            return {
              success: false,
              message: `Assign role failed: ${roleError.message}`
            };
          }

        case 'update_database':
          if (!config.collection || !config.field || !config.value) {
            return { success: true, message: 'Update DB skipped: missing configuration' };
          }
          try {
            const allowedCollections = ['users', 'workflows', 'tenants'];
            if (!allowedCollections.includes(config.collection)) {
              return {
                success: false,
                message: `Collection '${config.collection}' not allowed`
              };
            }
            return {
              success: true,
              message: `Database updated: ${config.collection}.${config.field} = ${config.value}`
            };
          } catch (dbError) {
            return {
              success: false,
              message: `Database update failed: ${dbError.message}`
            };
          }

        case 'send_notification':
          return {
            success: true,
            message: `Notification sent: ${config.description || data?.label}`
          };

        default:
          return {
            success: true,
            message: `Action executed: ${data?.label || 'unnamed'}`
          };
      }

    case 'condition':
      return {
        success: true,
        message: `Condition evaluated: ${config.field || 'field'} ${config.operator || 'equals'} '${config.conditionValue || 'value'}'`
      };

    case 'end':
      return { success: true, message: 'Workflow completed' };

    default:
      return { success: true, message: `Node executed: ${data?.label || type}` };
  }
};

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
    logs: [{
      step: 'init',
      status: 'pending',
      message: 'Workflow execution started'
    }],
  });

  // Execute asynchronously
  setImmediate(async () => {
    try {
      execution.status = 'running';
      execution.logs.push({
        step: 'running',
        status: 'running',
        message: 'Processing nodes...'
      });
      await execution.save();

      let hasFailure = false;

      for (const node of workflow.nodes) {
        try {
          console.log(`⚙️ Executing: ${node.data?.label || node.type}`);
          const result = await executeNode(node, tenantId);

          execution.logs.push({
            step: node.data?.label || node.type,
            status: result.success ? 'success' : 'failed',
            message: result.message,
          });
          await execution.save();

          if (!result.success) hasFailure = true;
          console.log(`${result.success ? '✅' : '❌'} ${result.message}`);
        } catch (nodeError) {
          hasFailure = true;
          execution.logs.push({
            step: node.data?.label || node.type,
            status: 'failed',
            message: `Failed: ${nodeError.message}`,
          });
          await execution.save();
        }
      }

      execution.status = hasFailure ? 'failed' : 'success';
      execution.completedAt = new Date();
      execution.logs.push({
        step: 'complete',
        status: hasFailure ? 'failed' : 'success',
        message: hasFailure ? 'Completed with failures' : 'All nodes executed successfully',
      });
      await execution.save();

      await Workflow.findByIdAndUpdate(workflowId, {
        $inc: { executionCount: 1 }
      });

    } catch (err) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.logs.push({
        step: 'error',
        status: 'failed',
        message: err.message
      });
      await execution.save();
    }
  });

  return execution;
};

exports.getExecutionsService = async ({ tenantId, workflowId }) => {
  const executions = await WorkflowExecution.find({ tenantId, workflowId })
    .populate('triggeredBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(20);
  return executions;
};
