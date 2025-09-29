const fs = require('fs');
const path = require('path');

const STORAGE_PATH = path.resolve(process.env.STORAGE_PATH || './streams');

function createChannelStorage(channelId) {
    const channelPath = path.join(STORAGE_PATH, channelId.toString());
    fs.mkdirSync(channelPath, { recursive: true });
}

function deleteChannelStorage(channelId) {
    const channelPath = path.join(STORAGE_PATH, channelId.toString());
    fs.rmSync(channelPath, { recursive: true, force: true });
}


module.exports = {
    deleteChannelStorage,
    createChannelStorage
};