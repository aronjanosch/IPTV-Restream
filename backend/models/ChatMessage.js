class User {
    constructor(name, avatar) {
        this.name = name;
        this.avatar = avatar;
    }
}


class ChatMessage {
    static nextId = 0;
    constructor(user, message, timestamp) {
        this.id = ChatMessage.nextId++;
        this.user = user;
        this.message = message;
        this.timestamp = timestamp;
    }
}

module.exports = { ChatMessage, User };