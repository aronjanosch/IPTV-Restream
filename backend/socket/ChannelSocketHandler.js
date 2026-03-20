const ChannelService = require('../services/ChannelService');
const ChatService = require('../services/ChatService');

module.exports = (io, socket) => {
    socket.on('add-channel', ({ name, url, avatar, mode, headersJson }) => {
        try {
            if (!socket.user?.isAdmin) {
                return socket.emit('app-error', { message: 'Admin access required to add channels' });
            }

            console.log('Adding solo channel:', url);
            const newChannel = ChannelService.addChannel({ name, url, avatar, mode, headersJson });
            io.emit('channel-added', newChannel);
        } catch (err) {
            socket.emit('app-error', { message: err.message });
        }
    });

    socket.on('set-current-channel', async (id) => {
        try {
            const nextChannel = await ChannelService.setCurrentChannel(id);
            io.emit('channel-selected', nextChannel);

            const username = socket.user?.username || 'Unknown';
            const chatMessage = ChatService.addMessage(
                'System',
                '',
                `${username} switched to ${nextChannel.name}`,
                new Date().toISOString()
            );
            io.emit('chat-message', chatMessage);
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });

    socket.on('delete-channel', async (id) => {
        try {
            if (!socket.user?.isAdmin) {
                return socket.emit('app-error', { message: 'Admin access required to delete channels' });
            }

            const lastChannel = ChannelService.getCurrentChannel();
            const current = await ChannelService.deleteChannel(id);
            io.emit('channel-deleted', id);
            if (lastChannel.id != current.id) io.emit('channel-selected', current);
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });

    socket.on('update-channel', async ({ id, updatedAttributes }) => {
        try {
            if (!socket.user?.isAdmin) {
                return socket.emit('app-error', { message: 'Admin access required to update channels' });
            }

            const updatedChannel = await ChannelService.updateChannel(id, updatedAttributes);
            io.emit('channel-updated', updatedChannel);
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });
};