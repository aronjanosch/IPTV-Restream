const cron = require('node-cron');
const PlaylistService = require('./PlaylistService');
const Playlist = require('../models/Playlist');

class PlaylistUpdater {
  constructor() {
    this.playlists = new Map();
  }

  #contains(playlistUrl) {
    return this.playlists.has(playlistUrl);
  }

  register(playlist) {
    if (this.#contains(playlist.playlist)) {
      return; 
    }

    console.log('Registering playlist:', playlist.playlist);
    this.playlists.set(playlist.playlist, playlist);
  }

  registerChannelsPlaylist(channels) {
    for (const channel of channels) {
      if (channel.playlist && channel.playlistUpdate) {
        this.register(
          new Playlist(
            channel.playlist, 
            channel.playlistName, 
            channel.mode, 
            channel.playlistUpdate, 
            channel.headers
          )
        );
      }
    }
  }

  delete(playlistUrl) {
    if (this.#contains(playlistUrl)) {
      this.playlists.delete(playlistUrl);
      console.log(`Deleted playlist with URL: ${playlistUrl}`);
    }
  }

  startScheduler() {
    // Cron-Job: "0 3 * * *" -> Every day at 3:00 AM
    cron.schedule('0 3 * * *', () => {
      this.updatePlaylists();
    });
  }

  updatePlaylists() {
    console.log('Updating playlists at:', new Date());
    this.playlists.forEach(async (playlist) => {
      try {
        // Fetch and renew playlist
        await PlaylistService.deletePlaylist(playlist.playlist);
        console.log('Adding playlist with playlistUpdate:', playlist.playlistUpdate);
        await PlaylistService.addPlaylist(
          playlist.playlist,
          playlist.playlistName,
          playlist.mode,
          playlist.playlistUpdate,
          playlist.headers
        );
      } catch (error) {
        console.error(`Error while updating playlist ${playlist.playlistName}:`, error);
      }
    });
  }
}

module.exports = new PlaylistUpdater();