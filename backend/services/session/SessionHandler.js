//Implement this interface for your specific session provider
class SessionHandler {
    constructor() {
        if (this.constructor === SessionHandler) {
            throw new Error("Abstract class cannot be instantiated");
        }
    }

    async createSession() {
        throw new Error("Method 'startSession()' must be implemented");
    }

    // destroySession() {
    //     throw new Error("Method 'destroySession()' must be implemented");
    // }

    // getSessionQuery() {
    //     throw new Error("Method 'getSessionQuery()' must be implemented");
    // }
}

module.exports = SessionHandler;