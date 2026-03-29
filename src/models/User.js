const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'viewer'], default: 'viewer' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  refreshTokens: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.index({ email: 1, tenantId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
