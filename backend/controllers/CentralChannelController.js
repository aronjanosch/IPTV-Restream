const { Readable } = require('stream');
const ChannelService = require('../services/ChannelService');
const HttpViewerService = require('../services/HttpViewerService');
const ProxyHelperService = require('../services/proxy/ProxyHelperService');
const Path = require('path');
const fs = require('fs');

const STORAGE_PATH = process.env.STORAGE_PATH;
const BACKEND_URL = process.env.BACKEND_URL;

async function fetchM3u8(res, targetUrl, headers) {
    console.log('Proxy playlist request to:', targetUrl);

    try {
        const fetchHeaders = ProxyHelperService.getHeaders(headers);
        const response = await fetch(targetUrl, { headers: fetchHeaders });

        if (!response.ok) {
            if (!res.headersSent) {
                return res.status(response.status).json({ error: 'Failed to fetch m3u8 file' });
            }
            return;
        }

        const body = await response.text();

        try {
            const proxyBaseUrl = '/proxy/';
            const rewrittenBody = ProxyHelperService.rewriteUrls(body, proxyBaseUrl, headers, targetUrl).join('\n');

            if (rewrittenBody.indexOf('channel?url=') !== -1) {
                const regex = /channel\?url=([^&\s]+)/;
                const match = rewrittenBody.match(regex);
                const channelUrl = decodeURIComponent(match[1]);
                return fetchM3u8(res, channelUrl, headers);
            }

            const updatedM3u8 = rewrittenBody.replace(/(#EXTINF.*)/, '#EXT-X-DISCONTINUITY\n$1');
            return res.send(updatedM3u8);
        } catch (e) {
            console.error('Failed to rewrite URLs:', e);
            return res.status(500).json({ error: 'Failed to parse m3u8 file. Not a valid HLS stream.' });
        }
    } catch (e) {
        console.error('Failed to proxy request:', e);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Proxy request failed' });
        }
    }
}


module.exports = {
    async currentChannel(req, res) {
        const clientIp = req.ip || req.connection.remoteAddress;
        HttpViewerService.touch(clientIp);

        const channel = ChannelService.getCurrentChannel();

        res.set('Access-Control-Allow-Origin', '*');
        if (channel.restream()) {
            const path = Path.resolve(`${STORAGE_PATH}${channel.id}/${channel.id}.m3u8`);
            if (fs.existsSync(path)) {
                try {
                    const m3u8Data = fs.readFileSync(path, 'utf-8');

                    let discontinuityAdded = false;
                    const updatedM3u8 = m3u8Data
                        .split('\n')
                        .map((line) => {
                            if (!discontinuityAdded && line.startsWith('#EXTINF')) {
                                discontinuityAdded = true;
                                return `#EXT-X-DISCONTINUITY\n${line}`;
                            }

                            if (line.endsWith('.ts')) {
                                if (req.basicAuthUser) {
                                    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
                                    return `${backendUrl}/streams/${channel.id}/${line}`;
                                }
                                return `${STORAGE_PATH}${channel.id}/${line}`;
                            }

                            return line;
                        })
                        .join('\n');

                    return res.send(updatedM3u8);
                } catch (err) {
                    console.error('Error loading m3u8 data from fs:', err);
                    return res.status(500).json({ error: 'Failed to load m3u8 data from filesystem.' });
                }
            }
            return res.send('No m3u8 data found.');
        } else {
            // Direct/Proxy Mode — fetch the m3u8 from the channel URL
            let targetUrl = channel.url;

            let headers = undefined;
            if (channel.headers && channel.headers.length > 0) {
                headers = Buffer.from(JSON.stringify(channel.headers)).toString('base64');
            }

            fetchM3u8(res, targetUrl, headers);
        }
    },

    playlist(req, res) {
        const backendBaseUrl = BACKEND_URL
            ? BACKEND_URL
            : `${req.headers['x-forwarded-proto'] ?? 'http'}://${req.get('Host')}:${req.headers['x-forwarded-port'] ?? ''}`;

        let playlistStr = `#EXTM3U
#EXTINF:-1 tvg-name="CURRENT RESTREAM" tvg-logo="https://cdn-icons-png.freepik.com/512/9294/9294560.png" group-title="StreamHub",CURRENT RESTREAM
${backendBaseUrl}/proxy/current \n`;

        const channels = ChannelService.getChannels();
        for (const channel of channels) {
            let restreamMode = undefined;
            if (channel.restream()) {
                restreamMode = channel.headers && channel.headers.length > 0 ? 'proxy' : 'direct';
            }

            playlistStr += `\n#EXTINF:-1 tvg-name="${channel.name}" tvg-logo="${channel.avatar}" group-title="${channel.group ?? ''}",${channel.name} \n`;

            if (channel.mode === 'direct' || restreamMode === 'direct') {
                playlistStr += channel.url;
            } else {
                let headers = undefined;
                if (channel.headers && channel.headers.length > 0) {
                    headers = Buffer.from(JSON.stringify(channel.headers)).toString('base64');
                }
                playlistStr += `${backendBaseUrl}/proxy/channel?url=${encodeURIComponent(channel.url)}${headers ? `&headers=${headers}` : ''} \n`;
            }
        }

        res.set('Content-Type', 'text/plain');
        res.send(playlistStr);
    },
};
