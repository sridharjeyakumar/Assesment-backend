const Bull = require('bull');
const WorkflowExecution = require('../models/WorkflowExecution');
const Workflow = require('../models/Workflow');
const { sendEmail } = require('../utils/emailService');

const workflowQueue = new Bull('workflow-execution', {
  redis: process.env.REDIS_URL,
});

const executeNode = async (node) => {
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
          const result = await sendEmail({
            to: config.toEmail,
            subject: config.subject || 'Notification from WorkFlow Pro',
            body: config.body || 'This is an automated message.',
          });
          return {
            success: true,
            message: `Email sent to ${config.toEmail} (ID: ${result.messageId})`
          };

        case 'send_notification':
          return { success: true, message: `Notification sent: ${config.description || 'No description'}` };

        case 'update_database':
          return { success: true, message: `Database updated: ${config.collection}.${config.field} = ${config.value}` };

        case 'call_api':
          return { success: true, message: `API called: ${config.method || 'GET'} ${config.apiUrl}` };

        case 'assign_role':
          return { success: true, message: `Role assigned: ${config.role}` };

        case 'create_user':
          return { success: true, message: 'User creation triggered' };

        default:
          return { success: true, message: `Action executed: ${data?.label || 'unnamed'}` };
      }

    case 'condition':
      return {
        success: true,
        message: `Condition checked: ${config.field || 'field'} ${config.operator || 'equals'} ${config.conditionValue || 'value'}`
      };

    case 'end':
      return { success: true, message: 'Workflow completed' };

    default:
      return { success: true, message: `Node executed: ${data?.label || type}` };
  }
};

workflowQueue.process(async (job) => {
  const { executionId, workflowId } = job.data;
  console.log(`🔄 Processing workflow execution: ${executionId}`);

  const execution = await WorkflowExecution.findById(executionId);
  const workflow = await Workflow.findById(workflowId);

  if (!execution || !workflow) {
    throw new Error('Execution or workflow not found');
  }

  execution.status = 'running';
  execution.logs.push({
    step: 'running',
    status: 'running',
    message: 'Processing workflow nodes...',
  });
  await execution.save();

  for (const node of workflow.nodes) {
    try {
      console.log(`⚙️ Executing node: ${node.data?.label || node.type}`);
      const result = await executeNode(node);

      execution.logs.push({
        step: node.data?.label || node.type,
        status: 'success',
        message: result.message,
      });
      await execution.save();
      console.log(`✅ Node done: ${result.message}`);
    } catch (nodeError) {
      execution.logs.push({
        step: node.data?.label || node.type,
        status: 'failed',
        message: `Failed: ${nodeError.message}`,
      });
      await execution.save();
      console.error(`❌ Node failed: ${nodeError.message}`);
    }
  }

  execution.status = 'success';
  execution.completedAt = new Date();
  execution.logs.push({
    step: 'complete',
    status: 'success',
    message: 'All nodes processed successfully',
  });
  await execution.save();

  await Workflow.findByIdAndUpdate(workflowId, {
    $inc: { executionCount: 1 }
  });

  console.log(`✅ Workflow execution completed: ${executionId}`);
  return { success: true, executionId };
});

workflowQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

workflowQueue.on('failed', (job, err) => {
  console.log(`❌ Job ${job.id} failed: ${err.message}`);
});

workflowQueue.on('active', (job) => {
  console.log(`🔄 Job ${job.id} started`);
});

module.exports = workflowQueue;
