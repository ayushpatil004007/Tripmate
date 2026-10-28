// Admin Authorization Middleware
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Strict Server-Side Administrator Authorization Middleware
 *
 * Requirements:
 * 1. Checks that the user is authenticated via authMiddleware (returns 401 if missing)
 * 2. Validates user ID format (returns 401 if malformed)
 * 3. Fetches the live user record from MongoDB by user ID
 * 4. Confirms user.role === 'admin' directly in the database (never trusts client headers/tokens/body)
 * 5. Returns 403 Forbidden if user is authenticated but lacks admin privileges
 */
const adminMiddleware = async (req, res, next) => {
  try {
    // 1. Verify that request was already authenticated by authMiddleware
    if (!req.user || (!req.user.id && !req.user._id)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const userId = req.user.id || req.user._id;

    // Validate MongoDB ObjectId format to prevent CastErrors
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Invalid user session format.'
      });
    }

    // 2. Query MongoDB as the single source of truth for the user's role
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User record not found.'
      });
    }

    // 3. Strict role check against MongoDB
    if (dbUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Administrator privileges required to perform this action.'
      });
    }

    // 4. Attach verified admin properties to request context
    req.user.role = 'admin';
    req.adminUser = dbUser;

    next();
  } catch (error) {
    console.error('Admin middleware authorization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authorization check',
      error: error.message
    });
  }
};

module.exports = adminMiddleware;
