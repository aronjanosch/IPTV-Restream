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
      role: user.role
    }, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Registration successful but login failed' });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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