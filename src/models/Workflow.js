const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  nodes: [
    {
      id: { type: String, required: true },
      type: { type: String, enum: ['start', 'action', 'condition', 'end'], required: true },
      position: { x: Number, y: Number },
      data: { label: String, config: Object },
    }
  ],
  edges: [
    {
      id: { type: String, required: true },
      source: { type: String, required: true },
      target: { type: String, required: true },
      label: { type: String },
    }
  ],
  version: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  executionCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Workflow', workflowSchema);
