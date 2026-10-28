// Admin Authorization Middleware
const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check header secret bypass for dev/scripts
    const adminKey = req.header('x-admin-key');
    if (adminKey && adminKey === (process.env.ADMIN_SECRET || 'tripmate_admin_secret')) {
      return next();
    }

    // Check token role
    if (req.user.role === 'admin') {
      return next();
    }

    // Verify against DB user in case role was updated
    const dbUser = await User.findById(req.user.id);
    if (dbUser && dbUser.role === 'admin') {
      req.user.role = 'admin';
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin privileges are required to perform this action.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};

module.exports = adminMiddleware;
