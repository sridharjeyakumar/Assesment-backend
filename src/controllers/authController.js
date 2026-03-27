const {
  registerTenantService,
  loginService,
  refreshService,
  logoutService,
  logoutAllService,
} = require('../services/authService');

exports.registerTenant = async (req, res) => {
  try {
    const result = await registerTenantService(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await loginService(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

exports.refresh = async (req, res) => {
  try {
    const result = await refreshService(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    await logoutService({ userId: req.user._id, refreshToken: req.body.refreshToken });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.logoutAll = async (req, res) => {
  try {
    await logoutAllService({ userId: req.user._id });
    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
