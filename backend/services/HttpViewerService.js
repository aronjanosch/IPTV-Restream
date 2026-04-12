const ChannelService = require('./ChannelService');

const TTL_MS = 30_000;
const activeViewers = new Map(); // ip -> timer
let _io = null;

function init(io) {
    _io = io;
}

function touch(ip) {
    if (!activeViewers.has(ip)) {
        console.log(`HTTP viewer connected: ${ip}`);
        ChannelService.viewerConnected().then(streamStarted => {
            if (streamStarted) {
                console.log(`Stream started for HTTP viewer: ${ip}`);
                if (_io) {
                    _io.emit('stream-status-changed', {
                        status: 'started',
                        channelId: ChannelService.getCurrentChannel().id,
                    });
                }
            }
        });
    }

    clearTimeout(activeViewers.get(ip));
    activeViewers.set(ip, setTimeout(() => {
        activeViewers.delete(ip);
        console.log(`HTTP viewer disconnected (timeout): ${ip}`);
        ChannelService.viewerDisconnected().then(streamStopped => {
            if (streamStopped) {
                if (_io) {
                    _io.emit('stream-status-changed', {
                        status: 'stopped',
                        channelId: ChannelService.getCurrentChannel().id,
                    });
                }
            }
        });
    }, TTL_MS));
}

function getActiveCount() {
    return activeViewers.size;
}

module.exports = { init, touch, getActiveCount };
