const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is required.');

function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth.token || socket.handshake.query.token;

  if (!token) {
    return next(new Error('Authentication required.'));
  }

  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return next(new Error('Invalid or expired token.'));
  }
}

module.exports = socketAuthMiddleware;
