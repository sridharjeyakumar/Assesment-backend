const Workflow = require('../models/Workflow');
const WorkflowExecution = require('../models/WorkflowExecution');
const User = require('../models/User');

exports.getDashboardStatsService = async ({ tenantId }) => {

  // Total workflows
  const totalWorkflows = await Workflow.countDocuments({ tenantId });

  // Total users
  const totalUsers = await User.countDocuments({ tenantId });

  // Total executions
  const totalExecutions = await WorkflowExecution.countDocuments({ tenantId });

  // Success vs failure count
  const executionStats = await WorkflowExecution.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const successCount = executionStats.find(e => e._id === 'success')?.count || 0;
  const failedCount = executionStats.find(e => e._id === 'failed')?.count || 0;
  const pendingCount = executionStats.find(e => e._id === 'pending')?.count || 0;
  const runningCount = executionStats.find(e => e._id === 'running')?.count || 0;

  // Executions per day (last 7 days)
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const executionsPerDay = await WorkflowExecution.aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: last7Days }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        count: { $sum: 1 },
        success: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Most executed workflows
  const topWorkflows = await WorkflowExecution.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$workflowId',
        executionCount: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    },
    { $sort: { executionCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'workflows',
        localField: '_id',
        foreignField: '_id',
        as: 'workflow'
      }
    },
    { $unwind: '$workflow' },
    {
      $project: {
        name: '$workflow.name',
        executionCount: 1,
        successCount: 1,
        failedCount: 1,
      }
    }
  ]);

  // Recent executions
  const recentExecutions = await WorkflowExecution.find({ tenantId })
    .populate('workflowId', 'name')
    .populate('triggeredBy', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  return {
    summary: {
      totalWorkflows,
      totalUsers,
      totalExecutions,
      successCount,
      failedCount,
      pendingCount,
      runningCount,
      successRate: totalExecutions > 0
        ? Math.round((successCount / totalExecutions) * 100)
        : 0,
    },
    executionsPerDay,
    topWorkflows,
    recentExecutions,
  };
};
