const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let currentFFmpegProcess = null;
let currentChannelId = null;
let intentionallyStopped = false;
const STORAGE_PATH = process.env.STORAGE_PATH;

async function startFFmpeg(nextChannel) {
    console.log('Starting FFmpeg process with channel:', nextChannel.id);
    if (currentFFmpegProcess) {
        console.log('Gracefully terminating previous FFmpeg process...');
        await stopFFmpeg();
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
        console.log(`FFmpeg crashed (code ${code}), restarting in 2s...`);
        setTimeout(() => startFFmpeg(nextChannel), 2000);
    });
}

function stopFFmpeg() {
    return new Promise((resolve) => {
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
    startFFmpeg,
    stopFFmpeg,
    isFFmpegRunning
};
