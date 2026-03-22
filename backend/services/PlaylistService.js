const m3uParser = require('iptv-playlist-parser');
const ChannelService = require('./ChannelService');
const ChannelStorage = require('./ChannelStorage');

class PlaylistService {

    async addPlaylist(playlist, playlistName, mode, playlistUpdate, headersJson) {

        console.log('Adding playlist', playlist);

        const fs = require('fs');
        let content = "";
        if(playlist.startsWith("http")) {
            const response = await fetch(playlist);
            content = await response.text();
        } else if(playlist.startsWith('/channels/')) {
            // File path reference — read from disk (used by auto-updater)
            content = fs.readFileSync(playlist, { encoding: 'utf-8' });
        } else {
            // Raw M3U content — save to disk and use
            content = playlist;
            fs.writeFileSync(`/channels/${playlistName}.txt`, playlist, { encoding: 'utf-8' });
            console.log('Saved uploaded playlist to disk');
        }

        const parsedPlaylist = m3uParser.parse(content);

        // Use URL as identifier for remote playlists, file path for uploaded content
        const playlistRef = playlist.startsWith("http") ? playlist : `/channels/${playlistName}.txt`;

        // list of added channels
        const channels = parsedPlaylist.items.map(channel => {
            //TODO: add channel.http if not '' to headers
            try {
                return ChannelService.addChannel({
                    name: channel.name,
                    url: channel.url,
                    avatar: channel.tvg.logo,
                    mode: mode,
                    headersJson: headersJson,
                    group: channel.group.title,
                    playlist: playlistRef,
                    playlistName: playlistName,
                    playlistUpdate: playlistUpdate
                }, false);
            } catch (error) {
                console.error(error);
                return null;
            }
        })
        .filter(result => result !== null);

        ChannelStorage.save(ChannelService.getChannels());

        return channels;
    }


    async updatePlaylist(playlistUrl, updatedAttributes) {

        // Update channels attributes
        const channels = ChannelService
                            .getChannels()
                            .filter(channel => channel.playlist === playlistUrl);

        for(let channel of channels) {
            channel = await ChannelService.updateChannel(channel.id, updatedAttributes, false);
        }
        ChannelStorage.save(ChannelService.getChannels());
        
        return channels;
    }

    async deletePlaylist(playlistUrl) {

        console.log('Deleting playlist', playlistUrl);

        const channels = ChannelService
                            .getChannels()
                            .filter(channel => channel.playlist === playlistUrl);
                            
        for(const channel of channels) {
            await ChannelService.deleteChannel(channel.id, false);
        }
        ChannelStorage.save(ChannelService.getChannels());

        return channels;
    }
}

module.exports = new PlaylistService();
