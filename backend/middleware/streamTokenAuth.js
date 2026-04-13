const StreamTokenService = require('../services/StreamTokenService');

module.exports = function streamTokenAuth(req, res, next) {
    const { username, token } = req.params;
    if (!username || !token) {
        return res.status(401).json({ error: 'Missing credentials' });
    }
    try {
        if (!StreamTokenService.verify(username, token)) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch {
        return res.status(401).json({ error: 'Invalid token' });
    }
    req.streamAuthUser = { username };
    next();
};
