const express = require('express');
const router = express.Router();
const {
  registerTenant,
  login,
  refresh,
  logout,
  logoutAll
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerTenant);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.post('/logout-all', protect, logoutAll);

module.exports = router;
