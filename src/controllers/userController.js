const {
  getUsersService,
  createUserService,
  updateUserService,
  deleteUserService,
} = require('../services/userService');

exports.getUsers = async (req, res) => {
  try {
    const users = await getUsersService({ tenantId: req.tenantId });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const user = await createUserService({ tenantId: req.tenantId, ...req.body });
    res.status(201).json({ user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await updateUserService({
      tenantId: req.tenantId,
      userId: req.params.id,
      ...req.body
    });
    res.json({ user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await deleteUserService({ tenantId: req.tenantId, userId: req.params.id });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
