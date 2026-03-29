const { getDashboardStatsService } = require('../services/analyticsService');

exports.getDashboardStats = async (req, res) => {
  try {
    const data = await getDashboardStatsService({ tenantId: req.tenantId });
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
