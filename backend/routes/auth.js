const express = require('express');
const router = express.Router();
const passport = require('../middleware/auth');
const User = require('../models/User');

// Check if any users exist (for first-time setup)
router.get('/setup-required', async (req, res) => {
  try {
    const userCount = await User.getUserCount();
    res.json({ setupRequired: userCount === 0 });
  } catch (error) {
    console.error('Error checking setup status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: password,
      name: name.trim()
    });

    // Log the user in
    req.login({
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      role: user.role
    }, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Registration successful but login failed' });
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          role: user.role
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login with email/password
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!user) {
      return res.status(401).json({ error: info.message || 'Authentication failed' });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          role: user.role
        }
      });
    });
  })(req, res, next);
});

// SSO login (if OIDC enabled)
if (process.env.OIDC_ENABLED === 'true') {
  router.get('/sso', passport.authenticate('oidc'));

  router.get('/sso/callback',
    passport.authenticate('oidc', { failureRedirect: '/login?error=sso_failed' }),
    (req, res) => {
      // Successful authentication, redirect to frontend
      res.redirect('/?sso=success');
    }
  );
}

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }

      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  });
});

// Get current user
router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        username: req.user.username,
        avatar: req.user.avatar,
        role: req.user.role
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Get all users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user role (admin only)
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await User.updateRole(req.params.id, role);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Get OIDC configuration (admin only)
router.get('/oidc/config', requireAuth, requireAdmin, (req, res) => {
  res.json({
    enabled: process.env.OIDC_ENABLED === 'true',
    issuerUrl: process.env.OIDC_ISSUER_URL || '',
    clientId: process.env.OIDC_CLIENT_ID || '',
    callbackUrl: process.env.OIDC_CALLBACK_URL || `${req.protocol}://${req.get('host')}/auth/sso/callback`,
    autoProvision: process.env.OIDC_AUTO_PROVISION === 'true',
    roleMapping: process.env.OIDC_ROLE_MAPPING === 'true'
  });
});

// Update OIDC configuration (admin only)
router.post('/oidc/config', requireAuth, requireAdmin, (req, res) => {
  try {
    const { enabled, issuerUrl, clientId, clientSecret, autoProvision, roleMapping } = req.body;

    // Update environment variables (note: requires server restart to take full effect)
    if (enabled !== undefined) process.env.OIDC_ENABLED = enabled ? 'true' : 'false';
    if (issuerUrl) process.env.OIDC_ISSUER_URL = issuerUrl;
    if (clientId) process.env.OIDC_CLIENT_ID = clientId;
    if (clientSecret) process.env.OIDC_CLIENT_SECRET = clientSecret;
    if (autoProvision !== undefined) process.env.OIDC_AUTO_PROVISION = autoProvision ? 'true' : 'false';
    if (roleMapping !== undefined) process.env.OIDC_ROLE_MAPPING = roleMapping ? 'true' : 'false';

    // Set callback URL
    process.env.OIDC_CALLBACK_URL = `${req.protocol}://${req.get('host')}/auth/sso/callback`;

    res.json({
      success: true,
      message: 'OIDC configuration updated. Server restart required for changes to take full effect.',
      restartRequired: true
    });
  } catch (error) {
    console.error('Error updating OIDC config:', error);
    res.status(500).json({ error: 'Failed to update OIDC configuration' });
  }
});

// Test OIDC configuration (admin only)
router.post('/oidc/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { issuerUrl } = req.body;

    if (!issuerUrl) {
      return res.status(400).json({ error: 'Issuer URL is required' });
    }

    // Test OIDC endpoint availability
    const fetch = require('node-fetch');
    const wellKnownUrl = issuerUrl.endsWith('/')
      ? `${issuerUrl}.well-known/openid_configuration`
      : `${issuerUrl}/.well-known/openid_configuration`;

    const response = await fetch(wellKnownUrl, { timeout: 5000 });

    if (!response.ok) {
      return res.status(400).json({
        error: 'OIDC provider not reachable or invalid configuration',
        details: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const config = await response.json();

    res.json({
      success: true,
      message: 'OIDC provider is reachable and properly configured',
      providerInfo: {
        issuer: config.issuer,
        authorizationEndpoint: config.authorization_endpoint,
        tokenEndpoint: config.token_endpoint,
        userInfoEndpoint: config.userinfo_endpoint
      }
    });
  } catch (error) {
    console.error('Error testing OIDC config:', error);
    res.status(500).json({
      error: 'Failed to test OIDC configuration',
      details: error.message
    });
  }
});

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ error: 'Admin access required' });
}

module.exports = router;