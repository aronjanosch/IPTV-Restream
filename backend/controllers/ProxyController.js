const { Readable } = require('stream');
const ChannelService = require('../services/ChannelService');
const ProxyHelperService = require('../services/proxy/ProxyHelperService');

module.exports = {
    async channel(req, res) {
        const proxyBaseUrl = req.streamAuthUser
            ? `/proxy/${req.params.username}/${req.params.token}/`
            : '/proxy/';

        let { url: targetUrl, channelId, headers } = req.query;

        if (!targetUrl) {
            const channel = channelId
                ? ChannelService.getChannelById(parseInt(channelId))
                : ChannelService.getCurrentChannel();

            if (!channel) {
                return res.status(404).json({ error: 'Channel not found' });
            }

            targetUrl = channel.url;

            if (channel.headers && channel.headers.length > 0) {
                headers = Buffer.from(JSON.stringify(channel.headers)).toString('base64');
            }
        }

        console.log('Proxy playlist request to:', targetUrl);

        res.set('Access-Control-Allow-Origin', '*');

        try {
            const fetchHeaders = ProxyHelperService.getHeaders(headers);
            const response = await fetch(targetUrl, {
                headers: fetchHeaders,
                redirect: 'manual',
            });

            if (response.status >= 400) {
                const body = await response.text();
                return res.status(response.status).send(body);
            }

            if (response.status >= 300) {
                const location = response.headers.get('location');
                const absoluteUrl = new URL(location, targetUrl).href;
                const proxyRedirect = `${proxyBaseUrl}channel?url=${encodeURIComponent(absoluteUrl)}${headers ? `&headers=${headers}` : ''}`;
                return res.redirect(response.status, proxyRedirect);
            }

            const body = await response.text();
            const responseUrl = response.url || targetUrl;

            try {
                const rewrittenBody = ProxyHelperService.rewriteUrls(body, proxyBaseUrl, headers, responseUrl).join('\n');
                return res.send(rewrittenBody);
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
    },

    async segment(req, res) {
        const { url: targetUrl, headers } = req.query;

        if (!targetUrl) {
            return res.status(400).json({ error: 'Missing url query parameter' });
        }

        console.log('Proxy segment request to:', targetUrl);

        res.set('Access-Control-Allow-Origin', '*');

        try {
            const fetchHeaders = ProxyHelperService.getHeaders(headers);
            const response = await fetch(targetUrl, { headers: fetchHeaders });

            if (!response.ok) {
                return res.status(response.status).json({ error: 'Upstream request failed' });
            }

            res.status(response.status);
            const contentType = response.headers.get('content-type');
            if (contentType) res.set('Content-Type', contentType);

            Readable.fromWeb(response.body).pipe(res).on('error', (err) => {
                console.error('Response stream error:', err);
            });
        } catch (e) {
            console.error('Proxy segment error:', e);
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Proxy request failed' });
            }
        }
    },

    key(req, res) {
        return module.exports.segment(req, res);
    },
};
