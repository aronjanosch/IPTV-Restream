class ProxyHelperService {

    getBaseUrl(fullUrl) {
        const parsed = new URL(fullUrl);
        const pathDir = parsed.pathname.substring(0, parsed.pathname.lastIndexOf('/') + 1);
        return `${parsed.protocol}//${parsed.host}${pathDir}`;
    }

    // Returns a plain headers object suitable for native fetch options
    getHeaders(base64Headers) {
        if (!base64Headers) return {};
        try {
            const parsed = JSON.parse(Buffer.from(base64Headers, 'base64').toString('utf-8'));
            return parsed.reduce((acc, header) => {
                acc[header.key] = header.value;
                return acc;
            }, {});
        } catch (e) {
            console.error('Failed to parse headers:', e);
            return {};
        }
    }

    rewriteUrls(body, proxyBaseUrl, headers, originalUrl) {
        let isMaster = true;
        const baseUrl = originalUrl ? this.getBaseUrl(originalUrl) : '';

        if (body.indexOf('#EXT-X-STREAM-INF') !== -1) {
            isMaster = false;
        }

        const lines = body.split('\n');
        return lines.map(line => {
            line = line.trim();

            if (line.startsWith('#')) {
                const keyURI = line.startsWith('#EXT-X-KEY');

                return line.replace(
                    /URI="([^"]+)"/,
                    (_, originalKeyUrl) => {
                        const absoluteKeyUrl = originalKeyUrl.startsWith('http')
                            ? originalKeyUrl
                            : new URL(originalKeyUrl, baseUrl).href;
                        return `URI="${proxyBaseUrl}${keyURI ? 'key' : 'channel'}?url=${encodeURIComponent(absoluteKeyUrl)}${headers ? `&headers=${headers}` : ''}"`;
                    }
                );
            } else if (line.length > 0) {
                if (line.indexOf('.m3u8') !== -1) {
                    isMaster = false;
                }

                const absoluteUrl = line.startsWith('http')
                    ? line
                    : new URL(line, baseUrl).href;

                return `${proxyBaseUrl}${isMaster ? 'segment' : 'channel'}?url=${encodeURIComponent(absoluteUrl)}${headers ? `&headers=${headers}` : ''}`;
            }

            return line;
        });
    }

}

module.exports = new ProxyHelperService();
