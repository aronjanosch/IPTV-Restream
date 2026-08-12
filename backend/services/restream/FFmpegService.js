const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let currentFFmpegProcess = null;
let currentChannelId = null;
let intentionallyStopped = false;
let retryCount = 0;
let retryTimer = null;
let _io = null;
const STORAGE_PATH = process.env.STORAGE_PATH;

const MAX_RETRIES = 6;
const BASE_RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 60000;

function init(io) {
    _io = io;
}

async function startFFmpeg(nextChannel, isRetry = false) {
    console.log('Starting FFmpeg process with channel:', nextChannel.id);
    if (currentFFmpegProcess) {
        console.log('Gracefully terminating previous FFmpeg process...');
        await stopFFmpeg();
    }

    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
    if (!isRetry) {
        retryCount = 0;
    }

    intentionallyStopped = false;

    let channelUrl = nextChannel.sessionUrl ? nextChannel.sessionUrl : nextChannel.url;
    const isHls = channelUrl.includes('.m3u8');

    currentChannelId = nextChannel.id;
    const headers = nextChannel.headers;

    // Ensure output directory exists (may have been deleted on a previous stop)
    const outputDir = path.join(STORAGE_PATH, String(currentChannelId));
    fs.mkdirSync(outputDir, { recursive: true });

    const inputArgs = [
        '-protocol_whitelist', 'file,http,https,tcp,tls,crypto',
        '-headers', headers.map(header => `${header.key}: ${header.value}`).join('\r\n'),
    ];

    if (isHls) {
        // HLS demuxer manages its own segment fetching; don't use generic HTTP reconnect flags
        // live_start_index -3 starts from near-live so segment tokens are still valid
        inputArgs.push(
            '-live_start_index', '-3',
            '-allowed_extensions', 'ALL',
        );
    } else {
        inputArgs.push(
            '-reconnect', '1',
            '-reconnect_at_eof', '1',
            '-reconnect_streamed', '1',
            '-reconnect_delay_max', '2',
        );
    }

    inputArgs.push('-i', channelUrl);

    currentFFmpegProcess = spawn('ffmpeg', [
        ...inputArgs,
        '-c', 'copy',
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+program_date_time',
        '-start_number', Math.floor(Date.now() / 1000),
        path.join(outputDir, `${currentChannelId}.m3u8`)
    ]);

    currentFFmpegProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    currentFFmpegProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    currentFFmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process terminated with code: ${code}`);
        currentFFmpegProcess = null;
        if (intentionallyStopped) {
            return;
        }

        retryCount++;
        if (retryCount > MAX_RETRIES) {
            console.error(`FFmpeg crashed ${retryCount} times for channel ${nextChannel.id}, giving up.`);
            if (_io) {
                _io.emit('stream-status-changed', {
                    status: 'failed',
                    channelId: nextChannel.id,
                });
            }
            return;
        }

        const delay = Math.min(BASE_RETRY_DELAY_MS * 2 ** (retryCount - 1), MAX_RETRY_DELAY_MS);
        console.log(`FFmpeg crashed (code ${code}), restarting in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`);
        retryTimer = setTimeout(() => startFFmpeg(nextChannel, true), delay);
    });
}

function stopFFmpeg() {
    return new Promise((resolve) => {
        if (retryTimer) {
            clearTimeout(retryTimer);
            retryTimer = null;
        }
        retryCount = 0;

        if (currentFFmpegProcess) {
            console.log('Gracefully terminate ffmpeg-Process...');
            intentionallyStopped = true;

            currentFFmpegProcess.once('close', (code) => {
                console.log(`ffmpeg-Process terminated with code: ${code}`);
                currentFFmpegProcess = null;
                resolve();
            });

            currentFFmpegProcess.kill('SIGTERM');
        } else {
            console.log('No ffmpeg process is running.');
            resolve();
        }
    });
}

function isFFmpegRunning() {
    return currentFFmpegProcess !== null;
}

module.exports = {
    init,
    startFFmpeg,
    stopFFmpeg,
    isFFmpegRunning
};
