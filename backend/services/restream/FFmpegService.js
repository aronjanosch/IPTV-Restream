const { spawn } = require('child_process');
require('dotenv').config();

let currentFFmpegProcess = null;
let currentChannelId = null;
let currentChannel = null;
let restartCount = 0;
const MAX_RESTART_ATTEMPTS = 5;
const STORAGE_PATH = process.env.STORAGE_PATH;

function startFFmpeg(nextChannel) {
    console.log('Starting FFmpeg process with channel:', nextChannel.id);

    let channelUrl = nextChannel.sessionUrl ? nextChannel.sessionUrl : nextChannel.url;

    currentChannelId = nextChannel.id;
    currentChannel = nextChannel;
    const headers = nextChannel.headers;


    currentFFmpegProcess = spawn('ffmpeg', [
        '-loglevel', 'error',
        '-hwaccel', 'auto',  // Auto-detect and use hardware acceleration if available
        '-headers', headers.map(header => `${header.key}: ${header.value}`).join('\r\n'),
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '2',
        '-i', channelUrl,
        '-c:v', 'copy',  // Copy video codec (no re-encoding)
        '-c:a', 'copy',  // Copy audio codec (no re-encoding)
        '-f', 'hls',
        '-hls_time', '2',  // Reduced to 2s for lower latency (was 6s)
        '-hls_list_size', '10',  // Increased buffer to 20 seconds (was 30s with 6s segments)
        '-hls_flags', 'delete_segments+append_list+omit_endlist+program_date_time',
        '-hls_segment_type', 'mpegts',  // Explicitly use MPEG-TS for better compatibility
        '-hls_segment_filename', `${STORAGE_PATH}${currentChannelId}/${currentChannelId}_%d.ts`,
        '-start_number', Math.floor(Date.now() / 1000),
        '-fflags', '+genpts',  // Generate presentation timestamps for better sync
        '-threads', '2',  // Limit thread usage to prevent CPU hogging
        `${STORAGE_PATH}${currentChannelId}/${currentChannelId}.m3u8`
    ]);

    currentFFmpegProcess.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
    });

    currentFFmpegProcess.stderr.on('data', (data) => {
        console.error(`FFmpeg error: ${data}`);
    });

    currentFFmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process terminated with code: ${code}`);
        const channelToRestart = currentChannel;
        currentFFmpegProcess = null;

        // Don't restart if explicitly stopped (code 255 or null means SIGTERM/SIGKILL)
        // Restart on crashes (non-zero exit codes) with exponential backoff
        if (code !== null && code !== 0 && code !== 255 && restartCount < MAX_RESTART_ATTEMPTS) {
            restartCount++;
            const delay = Math.min(1000 * Math.pow(2, restartCount - 1), 30000); // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
            console.log(`FFmpeg crashed (attempt ${restartCount}/${MAX_RESTART_ATTEMPTS}). Restarting in ${delay}ms...`);
            setTimeout(() => startFFmpeg(channelToRestart), delay);
        } else if (restartCount >= MAX_RESTART_ATTEMPTS) {
            console.error(`FFmpeg failed after ${MAX_RESTART_ATTEMPTS} restart attempts. Giving up.`);
            restartCount = 0;
        } else {
            // Clean exit or intentional stop - reset restart counter
            restartCount = 0;
        }
    });

    // Reset restart counter on successful start
    restartCount = 0;
}

function stopFFmpeg() {
    return new Promise((resolve, reject) => {
        if (currentFFmpegProcess) {
            console.log('Gracefully terminating FFmpeg process...');

            let isResolved = false;
            const timeout = setTimeout(() => {
                if (!isResolved && currentFFmpegProcess) {
                    console.warn('FFmpeg did not respond to SIGTERM within 5s, forcing with SIGKILL...');
                    currentFFmpegProcess.kill('SIGKILL');
                    currentFFmpegProcess = null;
                    isResolved = true;
                    resolve();
                }
            }, 5000); // 5 second timeout

            currentFFmpegProcess.on('close', (code) => {
                if (!isResolved) {
                    clearTimeout(timeout);
                    console.log(`FFmpeg process terminated with code: ${code}`);
                    currentFFmpegProcess = null;
                    isResolved = true;
                    resolve();
                }
            });

            currentFFmpegProcess.kill('SIGTERM');
        } else {
            console.log('No FFmpeg process is running.');
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
