class Playlist {
    static nextId = 0;
    constructor(playlist, playlistName, mode, playlistUpdate, headers = []) {
        this.headers = headers;
        this.mode = mode;
        this.playlist = playlist;
        this.playlistName = playlistName;
        this.playlistUpdate = playlistUpdate;
    }

    static from(json){
        return Object.assign(new Playlist(), json);
    }
}

module.exports = Playlist;