const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.getUsersService = async ({ tenantId, requestingUser }) => {
  let query = { tenantId };

  if (requestingUser.role === 'admin') {
    // Admin sees all users
    query = { tenantId };
  } else if (requestingUser.role === 'manager') {
    // Manager sees only their viewers
    query = { tenantId, managerId: requestingUser._id };
  } else {
    // Viewer sees nothing
    return [];
  }

  const users = await User.find(query)
    .select('-password -refreshTokens')
    .populate('managerId', 'name email');

  return users;
};

exports.getManagersService = async ({ tenantId }) => {
  const managers = await User.find({
    tenantId,
    role: 'manager'
  }).select('_id name email');
  return managers;
};

exports.createUserService = async ({ tenantId, name, email, password, role, managerId }) => {
  const existingUser = await User.findOne({ email, tenantId });
  if (existingUser) throw new Error('User already exists');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const userData = {
    tenantId,
    name,
    email,
    password: hashedPassword,
    role,
  };

  // Assign manager if role is viewer and managerId provided
  if (role === 'viewer' && managerId) {
    const manager = await User.findOne({ _id: managerId, tenantId, role: 'manager' });
    if (!manager) throw new Error('Manager not found');
    userData.managerId = managerId;
  }

  const user = await User.create(userData);
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    managerId: user.managerId,
  };
};

exports.updateUserService = async ({ tenantId, userId, role, isActive, managerId }) => {
  const updateData = { role, isActive };

  if (managerId) {
    const manager = await User.findOne({ _id: managerId, tenantId, role: 'manager' });
    if (!manager) throw new Error('Manager not found');
    updateData.managerId = managerId;
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, tenantId },
    updateData,
    { new: true }
  ).select('-password -refreshTokens')
   .populate('managerId', 'name email');

  if (!user) throw new Error('User not found');
  return user;
};

exports.deleteUserService = async ({ tenantId, userId }) => {
  const user = await User.findOneAndDelete({ _id: userId, tenantId });
  if (!user) throw new Error('User not found');
};
