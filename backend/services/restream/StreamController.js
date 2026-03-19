const ffmpegService = require('./FFmpegService');
const storageService = require('./StorageService');
const SessionFactory = require('../session/SessionFactory');

async function start(nextChannel) {
    console.log('Starting channel', nextChannel.id);
    storageService.createChannelStorage(nextChannel.id);

    const sessionProvider = SessionFactory.getSessionProvider(nextChannel);
    if(sessionProvider) {
        await sessionProvider.createSession();
    }

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
