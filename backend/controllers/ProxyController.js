const request = require('request');
const url = require('url');
const ChannelService = require('../services/ChannelService');
const ProxyHelperService = require('../services/proxy/ProxyHelperService');
const SessionFactory = require('../services/session/SessionFactory');

const proxyBaseUrl = '/proxy/';

module.exports = {
    async channel(req, res) {
        let { url: targetUrl, channelId, headers } = req.query;

        if(!targetUrl) {
            const channel = channelId ? 
                ChannelService.getChannelById(parseInt(channelId)) : 
                ChannelService.getCurrentChannel();

            if (!channel) {
                res.status(404).json({ error: 'Channel not found' });
                return;
            }

            targetUrl = channel.url;

            const sessionProvider = SessionFactory.getSessionProvider(channel);
            if(sessionProvider) {
                await sessionProvider.createSession();
                targetUrl = channel.sessionUrl;
            }

            if(channel.headers && channel.headers.length > 0) {
                headers = Buffer.from(JSON.stringify(channel.headers)).toString('base64');
            }
        }

        console.log('Proxy playlist request to:', targetUrl);

        res.set('Access-Control-Allow-Origin', '*');

        try {
            request({
                ...ProxyHelperService.getRequestOptions(targetUrl, headers),
                followRedirect: false 
            }, (error, response, body) => {

                if (error) {
                    if (!res.headersSent) {
                        return res.status(500).json({ error: 'Failed to fetch m3u8 file' });
                    }
                    console.error('Request error:', error);
                    return;
                }

                // invalid response
                if (response.statusCode >= 400) {
                    if (!res.headersSent) {
                        res.status(response.statusCode);
                    }
                    return res.send(body);
                }

                //redirect response
                if (response.statusCode >= 300) {
                    const redirectLocation = response.headers.location;
                    const absoluteUrl = url.resolve(targetUrl, redirectLocation);
                    
                    const proxyRedirect = `channel/?url=${encodeURIComponent(absoluteUrl)}${headers ? `&headers=${headers}` : ''}`;
                    return res.redirect(response.statusCode, proxyRedirect);
                }

                try {
                    const responseUrl = response.request.href;
                    const rewrittenBody = ProxyHelperService.rewriteUrls(body, proxyBaseUrl, headers, responseUrl).join('\n');
                    res.send(rewrittenBody);
                } catch (e) {
                    console.error('Failed to rewrite URLs:', e);
                    res.status(500).json({ error: 'Failed to parse m3uo file. Not a valid HLS stream.' });
                }

                //res.set('Content-Type', 'application/vnd.apple.mpegurl');
            }).on('error', (err) => {
                console.error('Unhandled error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Proxy request failed' });
                }
            });
        } catch (e) {
            console.error('Failed to proxy request:', e);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Proxy request failed' });
            }
        }
    },

    segment(req, res) {
        let { url: targetUrl, headers } = req.query;

        if (!targetUrl) {
            res.status(400).json({ error: 'Missing url query parameter' });
            return;
        }

        console.log('Proxy request to:', targetUrl);

        res.set('Access-Control-Allow-Origin', '*');

        req.pipe(
            request(ProxyHelperService.getRequestOptions(targetUrl, headers)) 
                .on('error', (err) => {
                    console.error('Proxy request error:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Proxy request failed' });
                    }
                    return;
                })
        ).pipe(res)
            .on('error', (err) => {
                console.error('Response stream error:', err);
            });
    },

    key(req, res) {
        module.exports.segment(req, res);
    }
};