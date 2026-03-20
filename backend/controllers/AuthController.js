require('dotenv').config();
const { generators } = require('openid-client');
const jwt = require('jsonwebtoken');
const { getOidcClient } = require('../services/OidcService');

const ADMIN_ENABLED = process.env.ADMIN_ENABLED === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'streamhub-jwt-secret';
const JWT_EXPIRY = '24h';

// Groups whose members receive the admin role (comma-separated env var)
const ADMIN_GROUPS = (process.env.OIDC_ADMIN_GROUPS || '')
  .split(',')
  .map((g) => g.trim())
  .filter(Boolean);

function isAdminUser(claims) {
  if (!ADMIN_GROUPS.length) return false;
  const userGroups = claims.groups || [];
  return userGroups.some((g) => ADMIN_GROUPS.includes(g));
}

module.exports = {
  // GET /api/auth/login — initiate OIDC authorization code + PKCE flow
  initiateLogin(req, res) {
    if (!ADMIN_ENABLED) {
      return res.status(403).json({ success: false, message: 'Admin mode is disabled on this server' });
    }

    try {
      const client = getOidcClient();
      const state = generators.state();
      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);

      // Persist PKCE params across the redirect
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
      console.error('OIDC login initiation failed:', err.message);
      return res.status(500).json({ success: false, message: 'OIDC not configured' });
    }
  },

  // GET /api/auth/callback — handle OIDC provider redirect
  async handleCallback(req, res) {
    const frontendUrl = process.env.OIDC_FRONTEND_URL || 'http://localhost:3000';

    try {
      const client = getOidcClient();
      const redirectUri = process.env.OIDC_REDIRECT_URI;

      const params = client.callbackParams(req);
      const tokenSet = await client.callback(redirectUri, params, {
        state: req.session.oidcState,
        code_verifier: req.session.oidcCodeVerifier,
      });

      // Clean up session state
      delete req.session.oidcState;
      delete req.session.oidcCodeVerifier;

      const claims = tokenSet.claims();

      // Fetch userinfo for the groups claim (Authentik includes groups here)
      let userinfo = {};
      try {
        userinfo = await client.userinfo(tokenSet.access_token);
      } catch {
        // userinfo is optional — fall back to id_token claims
      }

      const merged = { ...claims, ...userinfo };

      const appToken = jwt.sign(
        {
          sub: merged.sub,
          name: merged.name || merged.preferred_username || merged.email,
          email: merged.email,
          isAdmin: isAdminUser(merged),
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      return res.redirect(`${frontendUrl}?admin_token=${appToken}`);
    } catch (err) {
      console.error('OIDC callback failed:', err.message);
      return res.redirect(`${frontendUrl}?auth_error=${encodeURIComponent(err.message)}`);
    }
  },

  // GET /api/auth/admin-status — used by frontend to check if admin is enabled
  checkAdminStatus(req, res) {
    res.json({ enabled: ADMIN_ENABLED });
  },

  // Middleware: verify app-issued JWT on protected routes
  verifyToken(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
  },
};
