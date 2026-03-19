const jwt = require('jsonwebtoken');

const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return next();
    }

    try {
        const base64Credentials = authHeader.slice('Basic '.length);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');

        const adminPassword = process.env.ADMIN_PASSWORD;
        const streamPassword = process.env.STREAM_PASSWORD;
        const jwtSecret = process.env.JWT_SECRET;

        // Admin username + password
        if (username === 'admin' && adminPassword && password === adminPassword) {
            req.basicAuthUser = { username: 'admin', isAdmin: true };
            return next();
        }

        // Admin username + JWT token
        if (jwtSecret) {
            try {
                const decoded = jwt.verify(password, jwtSecret);
                if (decoded && decoded.isAdmin) {
                    req.basicAuthUser = { username: username, isAdmin: true };
                    return next();
                }
            } catch (jwtError) {
                // JWT verification failed
            }
        }

        // Stream-only access via STREAM_PASSWORD
        if (username === 'stream' && streamPassword && password === streamPassword) {
            req.basicAuthUser = { username: 'stream', isAdmin: false };
            return next();
        }

        // Invalid credentials — mark as unauthenticated but let the next
        // middleware decide whether to block or allow
        return next();

    } catch (error) {
        res.set('WWW-Authenticate', 'Basic realm="IPTV StreamHub"');
        return res.status(401).json({ error: 'Invalid authorization header' });
    }
};

module.exports = basicAuth;