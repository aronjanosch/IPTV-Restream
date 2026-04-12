require('dotenv').config();
const { generators } = require('openid-client');
const jwt = require('jsonwebtoken');
const { initOidcClient, getOidcClient } = require('../services/OidcService');
const UserService = require('../services/UserService');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required.');
const JWT_EXPIRY = '24h';

// Groups whose members receive the admin role when logging in via OIDC
const OIDC_ADMIN_GROUPS = (process.env.OIDC_ADMIN_GROUPS || '')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

function mintToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isAdmin: user.role === 'admin',
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function isOidcAdminUser(claims) {
  if (!OIDC_ADMIN_GROUPS.length) return false;
  const groups = claims.groups || [];
  return groups.some((g) => OIDC_ADMIN_GROUPS.includes(g));
}

module.exports = {
  // POST /api/auth/login — email or username + password
  async login(req, res) {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ success: false, message: 'login and password are required.' });
    }

    const user = login.includes('@')
      ? UserService.findByEmail(login)
      : UserService.findByUsername(login);

    if (!user || !(await UserService.verifyPassword(user, password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    return res.json({ success: true, token: mintToken(user) });
  },

  // GET /api/auth/login — initiate OIDC authorization code + PKCE flow
  async initiateLogin(req, res) {
    try {
      if (!process.env.OIDC_ISSUER_URL) {
        return res.status(503).json({
          success: false,
          message: 'OIDC is not enabled (set OIDC_ISSUER_URL and related env vars).',
        });
      }
      await initOidcClient();
      const client = getOidcClient();
      const state = generators.state();
      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);

      req.session.oidcState = state;
      req.session.oidcCodeVerifier = codeVerifier;

      const authorizationUrl = client.authorizationUrl({
        scope: 'openid profile email groups',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      return res.redirect(authorizationUrl);
    } catch (err) {
      console.error('OIDC login initiation failed:', err);
      return res.status(503).json({
        success: false,
        message: err.message || 'OIDC unavailable (provider discovery or configuration failed).',
      });
    }
  },

  // GET /api/auth/callback — handle OIDC provider redirect
  async handleCallback(req, res) {
    const frontendUrl = process.env.OIDC_FRONTEND_URL || 'http://localhost:3000';

    try {
      await initOidcClient();
      const client = getOidcClient();
      const params = client.callbackParams(req);
      const tokenSet = await client.callback(process.env.OIDC_REDIRECT_URI, params, {
        state: req.session.oidcState,
        code_verifier: req.session.oidcCodeVerifier,
      });

      delete req.session.oidcState;
      delete req.session.oidcCodeVerifier;

      const claims = tokenSet.claims();
      let userinfo = {};
      try { userinfo = await client.userinfo(tokenSet.access_token); } catch { /* optional */ }

      const merged = { ...claims, ...userinfo };
      const email = (merged.email || '').toLowerCase();
      if (!email) throw new Error('OIDC provider did not return an email address.');

      // Find existing user by email or by oidc_sub
      let user = UserService.findByEmail(email) || UserService.findByOidcSub(merged.sub);

      if (user) {
        // Link sub if not already stored
        if (!user.oidc_sub) UserService.linkOidcSub(user.id, merged.sub);
        // Re-fetch to get latest data
        user = UserService.findById(user.id);
      } else {
        // Auto-create account
        const username = merged.preferred_username || merged.name || email.split('@')[0];
        const role = isOidcAdminUser(merged) ? 'admin' : 'user';
        user = await UserService.create({ username, email, role, oidcSub: merged.sub });
      }

      return res.redirect(`${frontendUrl}?admin_token=${mintToken(user)}`);
    } catch (err) {
      console.error('OIDC callback failed:', err.message);
      return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(err.message)}`);
    }
  },

  // GET /api/auth/me — returns current user info from JWT
  me(req, res) {
    const user = UserService.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json(user);
  },

  // GET /api/auth/config — tells the frontend which login methods are available
  config(req, res) {
    res.json({
      oidcEnabled: !!process.env.OIDC_ISSUER_URL,
    });
  },

  // Middleware: verify app-issued JWT on protected routes
  verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
  },
};
