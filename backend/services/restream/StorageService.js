const fs = require('fs');

const STORAGE_PATH = process.env.STORAGE_PATH;

function createChannelStorage(channelId) {
    const path = STORAGE_PATH + channelId;

    // Clean up any existing storage first to ensure a fresh start
    if (fs.existsSync(path)) {
        console.log(`Cleaning up existing storage for channel ${channelId}`);
        fs.rmSync(path, { recursive: true, force: true });
    }

    fs.mkdirSync(path);
    console.log(`Created fresh storage for channel ${channelId}`);
}

function deleteChannelStorage(channelId) {
    fs.rmSync(STORAGE_PATH + channelId, { recursive: true, force: true  });
}


module.exports = {
    deleteChannelStorage,
    createChannelStorage
};