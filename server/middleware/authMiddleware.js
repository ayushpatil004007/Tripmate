// JSON Web Token (JWT) Authentication Middleware
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Extract Authorization header
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.'
    });
  }

  // Check Bearer format: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token format. Format should be: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    // Verify JWT token signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tripmate_secret_key');
    // Attach decoded user payload to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please log in again.'
    });
  }
};

module.exports = authMiddleware;
