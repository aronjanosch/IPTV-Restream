const crypto = require('crypto');

function getSecret() {
    const secret = process.env.STREAM_TOKEN_SECRET || (process.env.JWT_SECRET + ':stream');
    if (!secret || secret === ':stream') {
        throw new Error('STREAM_TOKEN_SECRET or JWT_SECRET must be set');
    }
    return secret;
}

module.exports = {
    generate(username) {
        return crypto.createHmac('sha256', getSecret()).update(username).digest('hex').slice(0, 32);
    },

    verify(username, token) {
        if (!username || !token || token.length !== 32) return false;
        const expected = this.generate(username);
        return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
    },
};
