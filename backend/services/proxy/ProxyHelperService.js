const url = require('url');
const path = require('path');

class ProxyHelperService {

    getBaseUrl(fullUrl) {
        const parsedUrl = url.parse(fullUrl);
        return `${parsedUrl.protocol}//${parsedUrl.host}${path.dirname(parsedUrl.pathname)}/`;
    }

    getRequestOptions(targetUrl, base64Headers) {
        let requestOptions = { url: targetUrl };
        if (base64Headers) {
            try {
                const parsedHeaders = JSON.parse(Buffer.from(base64Headers, 'base64').toString('ascii'));
                requestOptions.headers = parsedHeaders.reduce((acc, header) => {
                    acc[header.key] = header.value;
                    return acc;
                }, {});
            } catch (e) {
                console.error('Failed to parse headers:', e);
            }
        }
        return requestOptions;
    }

    rewriteUrls(body, proxyBaseUrl, headers, originalUrl) {
        let isMaster = true;
        const baseUrl = originalUrl ? this.getBaseUrl(originalUrl) : '';
    
        if(body.indexOf('#EXT-X-STREAM-INF') !== -1) {
            isMaster = false;
        }
    
        let lines = body.split('\n');
        return lines.map(line => {
            line = line.trim();
    
            if (line.startsWith('#')) {
                const keyURI = line.startsWith('#EXT-X-KEY');

                return line.replace(
                    /URI="([^"]+)"/,
                    (_, originalKeyUrl) => {
                        // If the key URL is relative, make it absolute
                        const absoluteKeyUrl = originalKeyUrl.startsWith('http') ? 
                            originalKeyUrl : 
                            url.resolve(baseUrl, originalKeyUrl);
                        return `URI="${proxyBaseUrl}${keyURI ? 'key' : 'channel'}?url=${encodeURIComponent(absoluteKeyUrl)}${headers ? `&headers=${headers}` : ''}"`;
                    }
                );
            } else if (line.length > 0) {

                if(line.indexOf('.m3u8') !== -1) {
                    isMaster = false;
                }

                // Handle segment URLs
                if (line.startsWith('http')) {   
                    return `${proxyBaseUrl}${isMaster ? 'segment' : 'channel'}?url=${encodeURIComponent(line)}${headers ? `&headers=${headers}` : ''}`;
                } 
                else {
                    // Relative URL case - combine with base URL
                    const absoluteUrl = url.resolve(baseUrl, line);
                    return `${proxyBaseUrl}${isMaster ? 'segment' : 'channel'}?url=${encodeURIComponent(absoluteUrl)}${headers ? `&headers=${headers}` : ''}`;
                }
            }
            return line; // Return empty lines unchanged
        });
    }

}

module.exports = new ProxyHelperService();