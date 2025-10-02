const { spawn, execSync } = require('child_process');
require('dotenv').config();

let currentFFmpegProcess = null;
let currentChannelId = null;
const STORAGE_PATH = process.env.STORAGE_PATH;

// Hardware acceleration detection
let detectedEncoder = null;

function detectHardwareEncoder() {
    if (detectedEncoder !== null) {
        return detectedEncoder;
    }

    try {
        // Get list of available encoders from FFmpeg
        const encoders = execSync('ffmpeg -encoders -hide_banner', { encoding: 'utf8' });

        const platform = process.platform;

        // Platform-specific encoder priority
        if (platform === 'darwin') {
            // macOS: VideoToolbox
            if (encoders.includes('h264_videotoolbox')) {
                console.log('Hardware acceleration: VideoToolbox (macOS) detected');
                detectedEncoder = 'h264_videotoolbox';
                return detectedEncoder;
            }
        } else if (platform === 'linux' || platform === 'win32') {
            // NVIDIA NVENC (highest priority for Linux/Windows)
            if (encoders.includes('h264_nvenc')) {
                console.log('Hardware acceleration: NVENC (NVIDIA) detected');
                detectedEncoder = 'h264_nvenc';
                return detectedEncoder;
            }
            // Intel QuickSync
            if (encoders.includes('h264_qsv')) {
                console.log('Hardware acceleration: QuickSync (Intel) detected');
                detectedEncoder = 'h264_qsv';
                return detectedEncoder;
            }
            // AMD AMF (Windows)
            if (platform === 'win32' && encoders.includes('h264_amf')) {
                console.log('Hardware acceleration: AMF (AMD) detected');
                detectedEncoder = 'h264_amf';
                return detectedEncoder;
            }
            // VAAPI (Linux)
            if (platform === 'linux' && encoders.includes('h264_vaapi')) {
                console.log('Hardware acceleration: VAAPI (Linux) detected');
                detectedEncoder = 'h264_vaapi';
                return detectedEncoder;
            }
        }

        // Fallback to copy codec (no transcoding)
        console.log('No hardware acceleration available, using copy codec');
        detectedEncoder = 'copy';
        return detectedEncoder;

    } catch (error) {
        console.error('Error detecting hardware encoder:', error.message);
        console.log('Falling back to copy codec');
        detectedEncoder = 'copy';
        return detectedEncoder;
    }
}

function startFFmpeg(nextChannel) {
    console.log('Starting FFmpeg process with channel:', nextChannel.id);
    // if (currentFFmpegProcess) {
    //     console.log('Gracefully terminate previous ffmpeg-Prozess...');
    //     await stopFFmpeg();
    // }

    let channelUrl = nextChannel.sessionUrl ? nextChannel.sessionUrl : nextChannel.url;

    currentChannelId = nextChannel.id;
    const headers = nextChannel.headers;

    // Detect hardware encoder
    const encoder = detectHardwareEncoder();

    // Build FFmpeg arguments
    const ffmpegArgs = [
        '-headers', headers.map(header => `${header.key}: ${header.value}`).join('\r\n'),
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '2',
        '-i', channelUrl,
    ];

    // Add encoding parameters based on detected encoder
    if (encoder === 'copy') {
        // Copy codec - no transcoding
        ffmpegArgs.push('-c', 'copy');
    } else {
        // Hardware encoding
        ffmpegArgs.push('-c:v', encoder);
        ffmpegArgs.push('-c:a', 'copy'); // Copy audio without transcoding

        // Add encoder-specific optimizations
        if (encoder === 'h264_videotoolbox') {
            // VideoToolbox (macOS) settings for low latency
            ffmpegArgs.push('-realtime', '1');
        } else if (encoder === 'h264_nvenc') {
            // NVENC (NVIDIA) settings for low latency
            ffmpegArgs.push('-preset', 'p1'); // Fastest preset
            ffmpegArgs.push('-tune', 'ull'); // Ultra-low latency
            ffmpegArgs.push('-zerolatency', '1');
        } else if (encoder === 'h264_qsv') {
            // QuickSync (Intel) settings for low latency
            ffmpegArgs.push('-preset', 'veryfast');
            ffmpegArgs.push('-global_quality', '23');
        } else {
            // Generic settings for other encoders
            ffmpegArgs.push('-preset', 'ultrafast');
            ffmpegArgs.push('-tune', 'zerolatency');
        }

        // Common quality settings for hardware encoding
        ffmpegArgs.push('-b:v', '3000k'); // Target bitrate
        ffmpegArgs.push('-maxrate', '4000k'); // Max bitrate
        ffmpegArgs.push('-bufsize', '2000k'); // Buffer size
    }

    // HLS output settings optimized for low latency
    ffmpegArgs.push(
        '-f', 'hls',
        '-hls_time', '2', // Reduced from 6 to 2 seconds
        '-hls_list_size', '10', // Increased from 5 to 10 for better buffering
        '-hls_flags', 'delete_segments+program_date_time',
        '-hls_segment_type', 'mpegts',
        '-start_number', Math.floor(Date.now() / 1000).toString(),
        `${STORAGE_PATH}${currentChannelId}/${currentChannelId}.m3u8`
    );

    console.log('FFmpeg command:', 'ffmpeg', ffmpegArgs.join(' '));
    currentFFmpegProcess = spawn('ffmpeg', ffmpegArgs);

    currentFFmpegProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    currentFFmpegProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    // currentFFmpegProcess.on('close', (code) => {
    //     console.log(`ffmpeg-Process terminated with code: ${code}`);

    //     // currentFFmpegProcess = null;
    //     // //Restart if crashed
    //     // if (code !== null && code !== 255) {
    //     //     console.log(`Restarting FFmpeg process with channel: ${nextChannel.id}`);
    //     //     //wait 1 second before restarting
    //     //     setTimeout(() => startFFmpeg(nextChannel), 2000);
    //     // }
    // });
}

function stopFFmpeg() {
    return new Promise((resolve, reject) => {
        if (currentFFmpegProcess) {
            console.log('Gracefully terminate ffmpeg-Process...');
            
            currentFFmpegProcess.on('close', (code) => {
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
