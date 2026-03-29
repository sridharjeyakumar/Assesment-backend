const mongoose = require('mongoose');

const executionSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
  triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'running', 'success', 'failed'], default: 'pending' },
  logs: [
    {
      step: String,
      status: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
    }
  ],
  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('WorkflowExecution', executionSchema);
