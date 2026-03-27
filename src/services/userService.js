const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.getUsersService = async ({ tenantId }) => {
  const users = await User.find({ tenantId }).select('-password -refreshTokens');
  return users;
};

exports.createUserService = async ({ tenantId, name, email, password, role }) => {
  const existingUser = await User.findOne({ email, tenantId });
  if (existingUser) throw new Error('User already exists');

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    tenantId,
    name,
    email,
    password: hashedPassword,
    role,
  });

  return { id: user._id, name: user.name, email: user.email, role: user.role };
};

exports.updateUserService = async ({ tenantId, userId, role, isActive }) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, tenantId },
    { role, isActive },
    { new: true }
  ).select('-password -refreshTokens');

  if (!user) throw new Error('User not found');
  return user;
};

exports.deleteUserService = async ({ tenantId, userId }) => {
  const user = await User.findOneAndDelete({ _id: userId, tenantId });
  if (!user) throw new Error('User not found');
};
