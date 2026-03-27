const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Tenant = require('../models/Tenant');

const generateTokens = (id) => {
  const accessToken = jwt.sign(
    { id },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRE }
  );
  const refreshToken = jwt.sign(
    { id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE }
  );
  return { accessToken, refreshToken };
};

exports.registerTenantService = async ({ tenantName, domain, adminName, email, password }) => {
  const existingTenant = await Tenant.findOne({ domain });
  if (existingTenant) throw new Error('Domain already registered');

  const tenant = await Tenant.create({ name: tenantName, domain });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const user = await User.create({
    tenantId: tenant._id,
    name: adminName,
    email,
    password: hashedPassword,
    role: 'admin',
  });

  const { accessToken, refreshToken } = generateTokens(user._id);

  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: refreshToken }
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: { id: tenant._id, name: tenant.name, domain: tenant.domain },
  };
};

exports.loginService = async ({ email, password, domain }) => {
  const tenant = await Tenant.findOne({ domain });
  if (!tenant) throw new Error('Organization not found');

  const user = await User.findOne({ email, tenantId: tenant._id });
  if (!user) throw new Error('Invalid credentials');

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new Error('Invalid credentials');

  if (!user.isActive) throw new Error('Account is deactivated');

  const { accessToken, refreshToken } = generateTokens(user._id);

  await User.findByIdAndUpdate(user._id, {
    $push: { refreshTokens: refreshToken }
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
    tenant: { id: tenant._id, name: tenant.name, domain: tenant.domain },
  };
};

exports.refreshService = async ({ refreshToken }) => {
  if (!refreshToken) throw new Error('No refresh token');

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id);

  if (!user || !user.refreshTokens.includes(refreshToken)) {
    throw new Error('Invalid refresh token');
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

  await User.findByIdAndUpdate(user._id, {
    $pull: { refreshTokens: refreshToken },
    $push: { refreshTokens: newRefreshToken }
  });

  return { accessToken, refreshToken: newRefreshToken };
};

exports.logoutService = async ({ userId, refreshToken }) => {
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: refreshToken }
  });
};

exports.logoutAllService = async ({ userId }) => {
  await User.findByIdAndUpdate(userId, {
    $set: { refreshTokens: [] }
  });
};
