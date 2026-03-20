const ChatService = require('../services/ChatService');

module.exports = (io, socket) => {
  socket.on('send-message', ({ userAvatar, message, timestamp }) => {
    // Username always comes from the authenticated JWT — never trust the client
    const userName = socket.user?.username || 'Unknown';
    const chatMessage = ChatService.addMessage(userName, userAvatar, message, timestamp);
    socket.broadcast.emit('chat-message', chatMessage);
  });
};
