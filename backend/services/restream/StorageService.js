const fs = require('fs');
const path = require('path');

const STORAGE_PATH = process.env.STORAGE_PATH;

function createChannelStorage(channelId) {
    fs.mkdirSync(path.join(STORAGE_PATH, String(channelId)), { recursive: true });
}

function deleteChannelStorage(channelId) {
    fs.rmSync(path.join(STORAGE_PATH, String(channelId)), { recursive: true, force: true  });
}


module.exports = {
    deleteChannelStorage,
    createChannelStorage
};