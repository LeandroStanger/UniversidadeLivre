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
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.wasm': 'application/wasm'
};

function sendError(response, statusCode, message) {
    response.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(message);
}

function createStaticServer(rootDirectory) {
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

function startStaticServer(rootDirectory) {
    const server = createStaticServer(rootDirectory);

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
