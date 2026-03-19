const ChannelService = require('./ChannelService');

const TTL_MS = 30_000;
const activeViewers = new Map(); // ip -> timer

function touch(ip) {
    if (!activeViewers.has(ip)) {
        console.log(`HTTP viewer connected: ${ip}`);
        ChannelService.viewerConnected().then(streamStarted => {
            if (streamStarted) {
                console.log(`Stream started for HTTP viewer: ${ip}`);
            }
        });
    }

    clearTimeout(activeViewers.get(ip));
    activeViewers.set(ip, setTimeout(() => {
        activeViewers.delete(ip);
        console.log(`HTTP viewer disconnected (timeout): ${ip}`);
        ChannelService.viewerDisconnected();
    }, TTL_MS));
}

function getActiveCount() {
    return activeViewers.size;
}

module.exports = { touch, getActiveCount };
