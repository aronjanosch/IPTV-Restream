// Authentication middleware - check if user is logged in
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  // Return JSON error for API requests
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // For non-API requests, you could redirect to login page
  res.status(401).json({ error: 'Authentication required' });
}

// Admin authorization middleware - check if user is admin
function requireAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
}

// Optional authentication middleware - set user if authenticated but don't require it
function optionalAuth(req, res, next) {
  // User will be available in req.user if authenticated, null otherwise
  return next();
}

// Role-based authorization middleware factory
function requireRole(role) {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ error: `${role} access required` });
    }

    return next();
  };
}

// Check if authentication is enabled
function authEnabled(req, res, next) {
  if (process.env.AUTH_ENABLED !== 'true') {
    return next();
  }

  return requireAuth(req, res, next);
}

// Check if user is authenticated or auth is disabled
function authEnabledOrAuthenticated(req, res, next) {
  if (process.env.AUTH_ENABLED !== 'true') {
    return next();
  }

  return requireAuth(req, res, next);
}

module.exports = {
  requireAuth,
  requireAdmin,
  optionalAuth,
  requireRole,
  authEnabled,
  authEnabledOrAuthenticated
};