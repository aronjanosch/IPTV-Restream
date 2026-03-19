const jwt = require('jsonwebtoken');

const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        // No Basic Auth provided, continue without authentication
        return next();
    }
    
    try {
        const base64Credentials = authHeader.slice('Basic '.length);
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        const [username, password] = credentials.split(':');
        
        // Check against admin credentials
        const adminPassword = process.env.ADMIN_PASSWORD;
        const jwtSecret = process.env.JWT_SECRET;
        
        // Method 1: Check admin username/password
        if (username === 'admin' && password === adminPassword) {
            req.basicAuthUser = { username: 'admin', isAdmin: true };
            return next();
        }
        
        // Method 2: Try to verify password as JWT token
        if (jwtSecret) {
            try {
                const decoded = jwt.verify(password, jwtSecret);
                if (decoded && decoded.isAdmin) {
                    req.basicAuthUser = { username: username, isAdmin: true };
                    return next();
                }
            } catch (jwtError) {
                // JWT verification failed, continue to other methods
            }
        }
        
        // Method 3: Accept any credentials for now (temporary for testing)
        // TODO: Implement proper user authentication
        req.basicAuthUser = { username: username, isAdmin: false };
        return next();
        
    } catch (error) {
        // Malformed auth header
        res.set('WWW-Authenticate', 'Basic realm="IPTV StreamHub"');
        return res.status(401).json({ error: 'Invalid authorization header' });
    }
};

module.exports = basicAuth;