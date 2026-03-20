const jwt = require('jsonwebtoken');
const UserService = require('../services/UserService');

const basicAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return next();
  }

  try {
    const base64Credentials = authHeader.slice('Basic '.length);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const colonIndex = credentials.indexOf(':');
    if (colonIndex === -1) return next();

    const username = credentials.slice(0, colonIndex);
    const password = credentials.slice(colonIndex + 1);
    const jwtSecret = process.env.JWT_SECRET;

    // Accept a minted JWT as the password field (for IPTV clients using a copied token)
    if (jwtSecret) {
      try {
        const decoded = jwt.verify(password, jwtSecret);
        if (decoded?.userId) {
          req.basicAuthUser = { username: decoded.username, isAdmin: decoded.isAdmin };
          return next();
        }
      } catch {
        // Not a JWT — fall through to user DB check
      }
    }

    // Verify username + password against user database
    const user = UserService.findByUsername(username);
    if (user && await UserService.verifyPassword(user, password)) {
      req.basicAuthUser = { username: user.username, isAdmin: user.role === 'admin' };
      return next();
    }

    // STREAM_PASSWORD fallback for dedicated stream-only tokens (e.g. shared TV password)
    const streamPassword = process.env.STREAM_PASSWORD;
    if (username === 'stream' && streamPassword && password === streamPassword) {
      req.basicAuthUser = { username: 'stream', isAdmin: false };
      return next();
    }

    return next();
  } catch (error) {
    res.set('WWW-Authenticate', 'Basic realm="IPTV StreamHub"');
    return res.status(401).json({ error: 'Invalid authorization header' });
  }
};

module.exports = basicAuth;
