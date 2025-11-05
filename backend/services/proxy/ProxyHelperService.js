const url = require('url');
const path = require('path');
const crypto = require('crypto');

// Simple LRU Cache implementation for URL rewrites
class LRUCache {
    constructor(maxSize = 100, ttlMs = 300000) { // Default: 100 entries, 5 min TTL
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;
        this.cache = new Map();
    }

    _generateKey(body, headers, originalUrl) {
        // Create a hash of the inputs for cache key
        const data = `${body}|${headers}|${originalUrl}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    get(body, headers, originalUrl) {
        const key = this._generateKey(body, headers, originalUrl);
        const entry = this.cache.get(key);

        if (!entry) return null;

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    set(body, headers, originalUrl, value) {
        const key = this._generateKey(body, headers, originalUrl);

        // If at max size, remove oldest entry
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    clear() {
        this.cache.clear();
    }

    get size() {
        return this.cache.size;
    }
}

class ProxyHelperService {
    constructor() {
        this.urlCache = new LRUCache(100, 300000); // 100 entries, 5 min TTL
    }

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
        // Check cache first
        const cached = this.urlCache.get(body, headers, originalUrl);
        if (cached) {
            return cached;
        }

        let isMaster = true;
        const baseUrl = originalUrl ? this.getBaseUrl(originalUrl) : '';

        if(body.indexOf('#EXT-X-STREAM-INF') !== -1) {
            isMaster = false;
        }

        let lines = body.split('\n');
        const result = lines.map(line => {
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

        // Cache the result before returning
        this.urlCache.set(body, headers, originalUrl, result);
        return result;
    }

}

module.exports = new ProxyHelperService();