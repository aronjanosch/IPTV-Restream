const requireStreamAuth = (req, res, next) => {
    if (!req.basicAuthUser) {
        res.set('WWW-Authenticate', 'Basic realm="IPTV StreamHub"');
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

module.exports = requireStreamAuth;
