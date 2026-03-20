const ffmpegService = require('./FFmpegService');
const storageService = require('./StorageService');

async function start(nextChannel) {
    console.log('Starting channel', nextChannel.id);
    storageService.createChannelStorage(nextChannel.id);
    ffmpegService.startFFmpeg(nextChannel);
}


async function stop(channel) {
    console.log('Stopping channel', channel.id);
    if (ffmpegService.isFFmpegRunning()) {
        await ffmpegService.stopFFmpeg();
    }

    channel.sessionUrl = null;

    storageService.deleteChannelStorage(channel.id);
}

module.exports = {
    start,
    stop
};
