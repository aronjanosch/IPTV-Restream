const PlaylistService = require('../services/PlaylistService');
const ChannelService = require('../services/ChannelService');
const PlaylistUpdater = require('../services/PlaylistUpdater');
const Playlist = require('../models/Playlist');
require('dotenv').config();

const ADMIN_ENABLED = process.env.ADMIN_ENABLED === 'true';

async function handleAddPlaylist({ playlist, playlistName, mode, playlistUpdate, headers, isAdmin }, io, socket) {
    try {
        // If admin mode is enabled but user is not admin, reject the operation
        if (ADMIN_ENABLED && !isAdmin) {
            return socket.emit('app-error', { message: 'Admin access required to add playlists' });
        }

        const channels = await PlaylistService.addPlaylist(playlist, playlistName, mode, playlistUpdate, headers);

        if (channels) {
            channels.forEach(channel => {
                io.emit('channel-added', channel);
            });
        }

        if(playlistUpdate) {
            PlaylistUpdater.register(new Playlist(playlist, playlistName, mode, playlistUpdate, headers));
        }

    } catch (err) {
        console.error(err);
        socket.emit('app-error', { message: err.message });
    }
}

async function handleUpdatePlaylist({ playlist, updatedAttributes, isAdmin }, io, socket) {
    try {
        // If admin mode is enabled but user is not admin, reject the operation
        if (ADMIN_ENABLED && !isAdmin) {
            return socket.emit('app-error', { message: 'Admin access required to update playlists' });
        }

        if (playlist !== updatedAttributes.playlist) {
            // Playlist URL has changed - delete channels and fetch again
            await handleDeletePlaylist({ playlist, isAdmin }, io, socket);
            await handleAddPlaylist({ ...updatedAttributes, isAdmin }, io, socket);
            return;
        }

        const channels = await PlaylistService.updatePlaylist(playlist, updatedAttributes);

        channels.forEach(channel => {
            io.emit('channel-updated', channel);
        });

        PlaylistUpdater.delete(playlist);
        if(updatedAttributes.playlistUpdate) {
            PlaylistUpdater.register(new Playlist(playlist, updatedAttributes.playlistName, updatedAttributes.mode, updatedAttributes.playlistUpdate, updatedAttributes.headers));
        }

    } catch (err) {
        console.error(err);
        socket.emit('app-error', { message: err.message });
    }
}

async function handleDeletePlaylist({ playlist, isAdmin }, io, socket) {
    try {
        // If admin mode is enabled but user is not admin, reject the operation
        if (ADMIN_ENABLED && !isAdmin) {
            return socket.emit('app-error', { message: 'Admin access required to delete playlists' });
        }

        const channels = await PlaylistService.deletePlaylist(playlist);

        channels.forEach(channel => {
            io.emit('channel-deleted', channel.id);
        });
        io.emit('channel-selected', ChannelService.getCurrentChannel());

        PlaylistUpdater.delete(playlist);

    } catch (err) {
        console.error(err);
        socket.emit('app-error', { message: err.message });
    }
}

module.exports = (io, socket) => {
    socket.on('add-playlist', data => handleAddPlaylist(data, io, socket));
    socket.on('update-playlist', data => handleUpdatePlaylist(data, io, socket));
    socket.on('delete-playlist', data => {
        // Handle both old format (just playlist string) and new format (object with playlist and isAdmin)
        const playlist = typeof data === 'object' ? data.playlist : data;
        const isAdmin = typeof data === 'object' ? data.isAdmin : false;
        
        handleDeletePlaylist({ playlist, isAdmin }, io, socket);
    });
};