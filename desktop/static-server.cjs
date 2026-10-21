const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ALLOWED_ROOTS = new Set([
    'auditorio',
    'base',
    'biblioteca',
    'comunidade',
    'cursos',
    'notas',
    'index.html',
    'script.js',
    'style.css'
]);

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.wasm': 'application/wasm'
};

const OFFLINE_MEDIA_PATTERN = /^\/offline-media\/([a-f0-9]{64})\.(mp4|webm)$/;
const OFFLINE_SUBTITLE_PATTERN = /^\/offline-subtitles\/([a-f0-9]{64})\.(pt|en|es)\.vtt$/;

function sendError(response, statusCode, message) {
    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(message);
}

async function serveOfflineMedia(request, response, pathname, offlineDirectory) {
    const match = OFFLINE_MEDIA_PATTERN.exec(pathname);
    if (!match || !offlineDirectory) {
        sendError(response, 404, 'Not found');
        return;
    }

    const filePath = path.join(offlineDirectory, `${match[1]}.${match[2]}`);
    let fileStats;
    try {
        fileStats = await fs.promises.stat(filePath);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            sendError(response, 404, 'Not found');
            return;
        }
        console.error(`Unable to read offline video ${filePath}:`, error);
        sendError(response, 500, 'Unable to read offline video');
        return;
    }

    if (!fileStats.isFile()) {
        sendError(response, 404, 'Not found');
        return;
    }
    if (fileStats.size === 0) {
        sendError(response, 404, 'Not found');
        return;
    }

    const headers = {
        'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()],
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store'
    };
    let start = 0;
    let end = fileStats.size - 1;
    const range = request.headers.range;
    if (range) {
        const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (!rangeMatch || (!rangeMatch[1] && !rangeMatch[2])) {
            response.writeHead(416, { 'Content-Range': `bytes */${fileStats.size}` });
            response.end();
            return;
        }
        if (!rangeMatch[1]) {
            const suffixLength = Number(rangeMatch[2]);
            if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
                response.writeHead(416, { 'Content-Range': `bytes */${fileStats.size}` });
                response.end();
                return;
            }
            start = Math.max(0, fileStats.size - suffixLength);
        } else {
            start = Number(rangeMatch[1]);
            end = rangeMatch[2] ? Number(rangeMatch[2]) : end;
        }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= fileStats.size || end < start) {
            response.writeHead(416, { 'Content-Range': `bytes */${fileStats.size}` });
            response.end();
            return;
        }
        end = Math.min(end, fileStats.size - 1);
        headers['Content-Range'] = `bytes ${start}-${end}/${fileStats.size}`;
        headers['Content-Length'] = end - start + 1;
    } else {
        headers['Content-Length'] = fileStats.size;
    }

    response.writeHead(range ? 206 : 200, headers);
    if (request.method === 'HEAD') {
        response.end();
        return;
    }

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on('error', error => {
        console.error(`Unable to stream offline video ${filePath}:`, error);
        if (!response.headersSent) sendError(response, 500, 'Unable to read offline video');
        else response.destroy();
    });
    stream.pipe(response);
}

async function serveOfflineSubtitle(request, response, pathname, offlineDirectory) {
    const match = OFFLINE_SUBTITLE_PATTERN.exec(pathname);
    if (!match || !offlineDirectory) {
        sendError(response, 404, 'Not found');
        return;
    }

    const filePath = path.join(offlineDirectory, `${match[1]}.${match[2]}.vtt`);
    let fileStats;
    try {
        fileStats = await fs.promises.stat(filePath);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            sendError(response, 404, 'Not found');
            return;
        }
        console.error(`Unable to read offline subtitle ${filePath}:`, error);
        sendError(response, 500, 'Unable to read offline subtitle');
        return;
    }
    if (!fileStats.isFile() || fileStats.size === 0) {
        sendError(response, 404, 'Not found');
        return;
    }

    response.writeHead(200, {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Content-Length': fileStats.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
    });
    if (request.method === 'HEAD') {
        response.end();
        return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', error => {
        console.error(`Unable to stream offline subtitle ${filePath}:`, error);
        if (!response.headersSent) sendError(response, 500, 'Unable to read offline subtitle');
        else response.destroy();
    });
    stream.pipe(response);
}

function createStaticServer(rootDirectory, offlineDirectory) {
    const root = path.resolve(rootDirectory);

    return http.createServer(async (request, response) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.setHeader('Allow', 'GET, HEAD');
            sendError(response, 405, 'Method not allowed');
            return;
        }

        let pathname;
        try {
            pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        } catch {
            sendError(response, 400, 'Invalid URL');
            return;
        }

        if (pathname.startsWith('/offline-media/')) {
            await serveOfflineMedia(request, response, pathname, offlineDirectory);
            return;
        }
        if (pathname.startsWith('/offline-subtitles/')) {
            await serveOfflineSubtitle(request, response, pathname, offlineDirectory);
            return;
        }

        if (pathname === '/') pathname = '/index.html';
        const segments = pathname.split('/').filter(Boolean);
        if (
            segments.length === 0
            || segments.some(segment => segment.startsWith('.'))
            || !ALLOWED_ROOTS.has(segments[0])
        ) {
            sendError(response, 404, 'Not found');
            return;
        }

        const filePath = path.resolve(root, ...segments);
        if (!filePath.startsWith(`${root}${path.sep}`)) {
            sendError(response, 404, 'Not found');
            return;
        }

        let fileStats;
        try {
            fileStats = await fs.promises.stat(filePath);
        } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
                sendError(response, 404, 'Not found');
                return;
            }
            console.error(`Unable to read desktop resource ${filePath}:`, error);
            sendError(response, 500, 'Unable to read resource');
            return;
        }

        if (!fileStats.isFile()) {
            sendError(response, 404, 'Not found');
            return;
        }

        response.writeHead(200, {
            'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Content-Length': fileStats.size,
            'Cache-Control': 'no-cache'
        });
        if (request.method === 'HEAD') {
            response.end();
            return;
        }

        const stream = fs.createReadStream(filePath);
        stream.on('error', error => {
            console.error(`Unable to stream desktop resource ${filePath}:`, error);
            if (!response.headersSent) sendError(response, 500, 'Unable to read resource');
            else response.destroy();
        });
        stream.pipe(response);
    });
}

function startStaticServer(rootDirectory, offlineDirectory) {
    const server = createStaticServer(rootDirectory, offlineDirectory);

    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            server.removeListener('error', reject);
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close();
                reject(new Error('The desktop content server did not bind to a TCP port.'));
                return;
            }
            resolve({
                server,
                url: `http://127.0.0.1:${address.port}`
            });
        });
    });
}

module.exports = { startStaticServer };
