const crypto = require('node:crypto');
const dns = require('node:dns/promises');
const fs = require('node:fs');
const https = require('node:https');
const net = require('node:net');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_DOWNLOADABLE_STAGE_VIDEOS = 500;
const MAX_DOWNLOAD_ATTEMPTS = 3;
const SUBTITLE_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;
const YOUTUBE_PLAYBACK_FORMAT_VERSION = 2;
const YOUTUBE_MAX_HEIGHT = 1080;
const DOWNLOADABLE_EXTENSIONS = ['.mp4', '.webm'];
const MEDIA_EXTENSIONS = new Set(['.mp4', '.webm']);
const CAPTION_LANGUAGES = new Set(['pt', 'en', 'es']);
const YOUTUBE_FORMAT = [
    `bestvideo[height<=${YOUTUBE_MAX_HEIGHT}][ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]`,
    `best[height<=${YOUTUBE_MAX_HEIGHT}][ext=mp4][vcodec^=avc1]`,
    `bestvideo[height<=${YOUTUBE_MAX_HEIGHT}][ext=webm]+bestaudio[ext=webm]`,
    `best[height<=${YOUTUBE_MAX_HEIGHT}][ext=webm]`
].join('/');
const MIME_TYPES = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
};

function getMediaDetails(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        const extension = path.extname(url.pathname).toLowerCase();
        if (url.protocol !== 'https:' || url.username || url.password || url.port || !MEDIA_EXTENSIONS.has(extension)) return null;
        return { url, extension };
    } catch {
        return null;
    }
}

function getYouTubeVideoId(value) {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
        if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;

        let videoId = null;
        if (hostname === 'youtu.be') {
            videoId = url.pathname.slice(1).split('/')[0];
        } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtube-nocookie.com') {
            if (url.pathname === '/watch') videoId = url.searchParams.get('v');
            else {
                const [route, id] = url.pathname.split('/').filter(Boolean);
                if (['embed', 'shorts', 'live'].includes(route)) videoId = id;
            }
        }
        return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
    } catch {
        return null;
    }
}

function getDownloadableStageVideos(stage) {
    if (
        !stage
        || typeof stage !== 'object'
        || !Array.isArray(stage.videos)
        || stage.videos.length > MAX_DOWNLOADABLE_STAGE_VIDEOS
    ) {
        throw new Error('Etapa de curso inválida.');
    }
    if (!['pt', 'en', 'es'].includes(stage.language)) throw new Error('Idioma de legenda inválido.');
    return stage.videos.filter(video =>
        video
        && typeof video.title === 'string'
        && video.title.length <= 300
        && typeof video.url === 'string'
        && (getMediaDetails(video.url) || getYouTubeVideoId(video.url))
    ).map(video => ({ ...video, subtitleLanguage: stage.language }));
}

function isPublicAddress(address) {
    const version = net.isIP(address);
    if (version === 4) {
        const octets = address.split('.').map(Number);
        const [first, second] = octets;
        return !(
            first === 0
            || first === 10
            || first === 127
            || (first === 100 && second >= 64 && second <= 127)
            || (first === 169 && second === 254)
            || (first === 172 && second >= 16 && second <= 31)
            || (first === 192 && second === 0)
            || (first === 192 && second === 168)
            || (first === 192 && second === 88 && octets[2] === 99)
            || (first === 198 && (second === 18 || second === 19))
            || (first === 198 && second === 51 && octets[2] === 100)
            || (first === 203 && second === 0 && octets[2] === 113)
            || first >= 224
        );
    }
    if (version === 6) {
        const normalized = address.toLowerCase();
        if (normalized.startsWith('::ffff:')) return isPublicAddress(normalized.slice(7));
        const firstGroup = Number.parseInt(normalized.split(':')[0], 16);
        return firstGroup >= 0x2000 && firstGroup <= 0x3fff
            && !normalized.startsWith('2001:db8:');
    }
    return false;
}

async function resolvePublicAddresses(hostname) {
    const literalVersion = net.isIP(hostname);
    if (literalVersion) {
        if (!isPublicAddress(hostname)) throw new Error('Endereço de rede não público.');
        return [{ address: hostname, family: literalVersion }];
    }

    const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
        throw new Error('O endereço de rede não é público.');
    }
    return addresses;
}

function requestVideo(url, redirectsRemaining = 5) {
    return new Promise(async (resolve, reject) => {
        let addresses;
        try {
            if (url.protocol !== 'https:' || url.port) throw new Error('Apenas URLs HTTPS públicas são permitidas.');
            addresses = await resolvePublicAddresses(url.hostname);
        } catch (error) {
            reject(error);
            return;
        }

        const request = https.get(url, {
            headers: { 'User-Agent': 'UniversidadeLivreDesktop/1.0' },
            lookup: (_hostname, options, callback) => {
                if (options.all) callback(null, addresses);
                else callback(null, addresses[0].address, addresses[0].family);
            }
        }, response => {
            const status = response.statusCode || 0;
            if ([301, 302, 303, 307, 308].includes(status)) {
                response.resume();
                if (!response.headers.location || redirectsRemaining <= 0) {
                    reject(new Error('Redirecionamento inválido ou excedido.'));
                    return;
                }
                let redirectUrl;
                try {
                    redirectUrl = new URL(response.headers.location, url);
                } catch (error) {
                    reject(error);
                    return;
                }
                requestVideo(redirectUrl, redirectsRemaining - 1).then(resolve, reject);
                return;
            }
            if (status < 200 || status >= 300) {
                response.resume();
                reject(new Error(`O servidor respondeu com HTTP ${status}.`));
                return;
            }
            resolve(response);
        });

        request.setTimeout(30_000, () => request.destroy(new Error('Tempo limite ao baixar o vídeo.')));
        request.once('error', reject);
    });
}

function createSizeLimit(maxBytes, onProgress, totalBytes) {
    let receivedBytes = 0;
    const startedAt = Date.now();
    let lastReportAt = 0;
    const reportProgress = force => {
        const now = Date.now();
        if (!force && now - lastReportAt < 150) return;
        lastReportAt = now;
        const elapsedSeconds = Math.max((now - startedAt) / 1000, 0.1);
        const speedBytesPerSecond = receivedBytes / elapsedSeconds;
        onProgress({
            downloadedBytes: receivedBytes,
            totalBytes,
            videoPercent: totalBytes ? Math.min(100, receivedBytes / totalBytes * 100) : null,
            speedBytesPerSecond,
            etaSeconds: totalBytes && speedBytesPerSecond > 0
                ? Math.max(0, (totalBytes - receivedBytes) / speedBytesPerSecond)
                : null
        });
    };
    return new Transform({
        transform(chunk, _encoding, callback) {
            receivedBytes += chunk.length;
            if (receivedBytes > maxBytes) {
                callback(new Error('O vídeo excede o limite de tamanho permitido.'));
                return;
            }
            reportProgress(false);
            callback(null, chunk);
        },
        flush(callback) {
            reportProgress(true);
            callback();
        }
    });
}

function createOfflineDownloads(directory, origin, tools = {}) {
    const offlineDirectory = path.resolve(directory);
    const downloadJobs = new Map();
    const ytDlpPath = tools.ytDlpPath;
    const denoPath = tools.denoPath;

    function getVideoKey(value) {
        const youtubeId = getYouTubeVideoId(value);
        return youtubeId
            ? crypto.createHash('sha256').update(`youtube:${youtubeId}`).digest('hex')
            : crypto.createHash('sha256').update(value).digest('hex');
    }

    async function hasCompatibleYoutubeDownload(value) {
        if (!getYouTubeVideoId(value)) return true;
        const markerPath = path.join(offlineDirectory, `${getVideoKey(value)}.playback.json`);
        try {
            const marker = JSON.parse(await fs.promises.readFile(markerPath, 'utf8'));
            return marker.formatVersion === YOUTUBE_PLAYBACK_FORMAT_VERSION;
        } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR' || error instanceof SyntaxError) return false;
            throw error;
        }
    }

    async function resolveVideo(value) {
        if (!getMediaDetails(value) && !getYouTubeVideoId(value)) return null;
        if (!await hasCompatibleYoutubeDownload(value)) return null;
        const hash = getVideoKey(value);
        for (const extension of DOWNLOADABLE_EXTENSIONS) {
            const fileName = `${hash}${extension}`;
            try {
                const stats = await fs.promises.stat(path.join(offlineDirectory, fileName));
                if (stats.isFile() && stats.size > 0) return `${origin}/offline-media/${fileName}`;
            } catch (error) {
                if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
            }
        }
        return null;
    }

    function getCaptionPaths(value, language) {
        if (!CAPTION_LANGUAGES.has(language)) throw new Error('Idioma de legenda inválido.');
        const hash = getVideoKey(value);
        return {
            hash,
            captionPath: path.join(offlineDirectory, `${hash}.${language}.vtt`),
            statusPath: path.join(offlineDirectory, `${hash}.${language}.captions.json`)
        };
    }

    async function resolveOfflineSubtitle(value, language) {
        if (!getYouTubeVideoId(value)) return null;
        const { hash, captionPath } = getCaptionPaths(value, language);
        try {
            const stats = await fs.promises.stat(captionPath);
            if (!stats.isFile() || stats.size === 0) return null;
            return `${origin}/offline-subtitles/${hash}.${language}.vtt`;
        } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
            throw error;
        }
    }

    async function getStageDownloadStatus(videos) {
        const downloadedVideos = await Promise.all(
            videos.map(video => resolveVideo(video.url))
        );
        return {
            downloadedIndexes: downloadedVideos.flatMap((url, index) => url ? [index] : [])
        };
    }

    async function removeStageDownloads(videos) {
        const hashes = new Set(videos.map(video => getVideoKey(video.url)));
        const activeJobs = [...downloadJobs.entries()]
            .filter(([key]) => [...hashes].some(hash => key.startsWith(`${hash}:`)))
            .map(([, job]) => job.promise);
        await Promise.allSettled(activeJobs);

        let fileNames;
        try {
            fileNames = await fs.promises.readdir(offlineDirectory);
        } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return { removedCount: 0 };
            throw error;
        }

        const filesToRemove = fileNames.filter(fileName => {
            const hash = fileName.split('.')[0];
            if (!hashes.has(hash)) return false;
            return DOWNLOADABLE_EXTENSIONS.some(extension => fileName.endsWith(extension))
                || fileName.endsWith('.playback.json')
                || /\.(pt|en|es)\.(vtt|captions\.json)$/.test(fileName)
                || fileName.endsWith('.part')
                || fileName.endsWith('.ytdl');
        });
        await Promise.all(filesToRemove.map(fileName =>
            fs.promises.rm(path.join(offlineDirectory, fileName), { force: true })
        ));
        return { removedCount: filesToRemove.length };
    }

    async function downloadYoutubeSubtitle(value, language) {
        const youtubeId = getYouTubeVideoId(value);
        if (!youtubeId) return null;
        const { hash, captionPath, statusPath } = getCaptionPaths(value, language);
        const existingCaption = await resolveOfflineSubtitle(value, language);
        if (existingCaption) {
            await fs.promises.writeFile(statusPath, JSON.stringify({ checked: true, available: true }));
            return existingCaption;
        }
        try {
            const status = JSON.parse(await fs.promises.readFile(statusPath, 'utf8'));
            if (Number.isFinite(status.retryAfter) && status.retryAfter > Date.now()) return null;
        } catch (error) {
            if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR' && !(error instanceof SyntaxError)) throw error;
        }

        if (!ytDlpPath || !denoPath) throw new Error('O yt-dlp ou o runtime JavaScript não está instalado.');
        await fs.promises.mkdir(offlineDirectory, { recursive: true });
        const outputPrefix = path.join(offlineDirectory, `${hash}.captions-${crypto.randomUUID()}`);
        try {
            await new Promise((resolve, reject) => {
                const args = [
                    '--no-warnings',
                    '--no-playlist',
                    '--skip-download',
                    '--write-subs',
                    '--write-auto-subs',
                    '--sub-langs', `${language},${language}-.*`,
                    '--sub-format', 'vtt/best',
                    '--convert-subs', 'vtt',
                    '--output', `${outputPrefix}.%(ext)s`,
                    '--js-runtimes', `deno:${denoPath}`,
                    '--',
                    `https://www.youtube.com/watch?v=${youtubeId}`
                ];
                const downloader = spawn(ytDlpPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
                let errorOutput = '';
                downloader.stderr.setEncoding('utf8');
                downloader.stderr.on('data', chunk => {
                    errorOutput = `${errorOutput}${chunk}`.slice(-8000);
                });
                downloader.once('error', reject);
                downloader.once('close', code => {
                    if (code === 0) resolve();
                    else reject(new Error(`yt-dlp terminou com código ${code} ao baixar a legenda: ${errorOutput.trim()}`));
                });
            });

            const temporaryPrefix = path.basename(outputPrefix);
            const matchingCaption = (await fs.promises.readdir(offlineDirectory))
                .filter(fileName => fileName.startsWith(`${temporaryPrefix}.${language}`)
                && fileName.toLowerCase().endsWith('.vtt'))
                .sort((first, second) => first.length - second.length)[0];
            if (matchingCaption) {
                await fs.promises.rename(path.join(offlineDirectory, matchingCaption), captionPath);
            }
            const available = Boolean(await resolveOfflineSubtitle(value, language));
            await fs.promises.writeFile(statusPath, JSON.stringify({ checked: true, available }));
            return available ? `${origin}/offline-subtitles/${hash}.${language}.vtt` : null;
        } finally {
            const temporaryPrefix = path.basename(outputPrefix);
            const temporaryFiles = (await fs.promises.readdir(offlineDirectory))
                .filter(fileName => fileName.startsWith(`${temporaryPrefix}.`));
            await Promise.all(temporaryFiles.map(fileName =>
                fs.promises.rm(path.join(offlineDirectory, fileName), { force: true })
            ));
        }
    }

    async function downloadYoutubeSubtitleIfAvailable(value, language) {
        try {
            return await downloadYoutubeSubtitle(value, language);
        } catch (error) {
            const rateLimited = /\b429\b|too many requests/i.test(error.message);
            if (rateLimited) {
                console.warn(`YouTube rate-limited offline subtitles for "${value}" (${language}); the video remains available offline.`);
            } else {
                console.warn(`Unable to download offline subtitles for "${value}" (${language}); keeping the video download:`, error);
            }
            const { statusPath } = getCaptionPaths(value, language);
            try {
                await fs.promises.writeFile(statusPath, JSON.stringify({
                    checked: false,
                    available: false,
                    ...(rateLimited ? { retryAfter: Date.now() + SUBTITLE_RATE_LIMIT_COOLDOWN_MS } : {})
                }));
            } catch (statusError) {
                console.error(`Unable to save offline subtitle status for "${value}" (${language}):`, statusError);
            }
            return null;
        }
    }

    async function downloadVideo(value, language, onProgress = () => {}) {
        const details = getMediaDetails(value);
        const youtubeId = getYouTubeVideoId(value);
        if (!details && !youtubeId) throw new Error('URL de vídeo não suportada.');

        await fs.promises.mkdir(offlineDirectory, { recursive: true });
        const hash = getVideoKey(value);
        const existing = await resolveVideo(value);
        if (existing) {
            if (youtubeId) await downloadYoutubeSubtitleIfAvailable(value, language);
            onProgress({
                downloadedBytes: null,
                totalBytes: null,
                videoPercent: 100,
                speedBytesPerSecond: null,
                etaSeconds: 0
            });
            return existing;
        }

        if (youtubeId) {
            if (!ytDlpPath || !denoPath) throw new Error('O yt-dlp ou o runtime JavaScript não está instalado.');
            const outputPrefix = path.join(offlineDirectory, `${hash}.download-${crypto.randomUUID()}`);
            if (!await hasCompatibleYoutubeDownload(value)) {
                const staleVideos = (await fs.promises.readdir(offlineDirectory))
                    .filter(fileName => fileName.startsWith(`${hash}.`)
                        && DOWNLOADABLE_EXTENSIONS.includes(path.extname(fileName).toLowerCase()));
                await Promise.all(staleVideos.map(fileName =>
                    fs.promises.rm(path.join(offlineDirectory, fileName), { force: true })
                ));
            }
            const temporaryParts = (await fs.promises.readdir(offlineDirectory))
                .filter(fileName => fileName.startsWith(`${hash}.`) && fileName.endsWith('.part'));
            await Promise.all(temporaryParts.map(fileName =>
                fs.promises.rm(path.join(offlineDirectory, fileName), { force: true })
            ));
            try {
                await new Promise((resolve, reject) => {
                    const args = [
                        '--no-warnings',
                        '--no-playlist',
                        '--newline',
                        '--max-filesize', '5G',
                        '--concurrent-fragments', '8',
                        '--buffer-size', '1M',
                        '--format', YOUTUBE_FORMAT,
                        '--merge-output-format', 'mp4/webm',
                        '--output', `${outputPrefix}.%(ext)s`,
                        '--js-runtimes', `deno:${denoPath}`,
                        '--progress-template',
                        'download:UL_PROGRESS:%(progress._percent)s|%(progress._downloaded_bytes)s|%(progress._total_bytes)s|%(progress._speed)s|%(progress._eta)s',
                        '--',
                        `https://www.youtube.com/watch?v=${youtubeId}`
                    ];
                    const downloader = spawn(ytDlpPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
                    let errorOutput = '';
                    let lineBuffer = '';
                    downloader.stderr.setEncoding('utf8');
                    downloader.stderr.on('data', chunk => {
                        errorOutput = `${errorOutput}${chunk}`.slice(-8000);
                        lineBuffer += chunk;
                        const lines = lineBuffer.split(/\r?\n/);
                        lineBuffer = lines.pop() || '';
                        for (const line of lines) {
                            const markerIndex = line.indexOf('UL_PROGRESS:');
                            if (markerIndex < 0) continue;
                            const [percent, downloaded, total, speed, eta] = line.slice(markerIndex + 12).split('|');
                            const parseProgressNumber = value => {
                                if (!value?.trim()) return null;
                                const number = Number(value);
                                return Number.isFinite(number) ? number : null;
                            };
                            const parsedPercent = Number.parseFloat(percent);
                            onProgress({
                                downloadedBytes: parseProgressNumber(downloaded),
                                totalBytes: parseProgressNumber(total),
                                videoPercent: Number.isFinite(parsedPercent) ? Math.max(0, Math.min(100, parsedPercent)) : null,
                                speedBytesPerSecond: parseProgressNumber(speed),
                                etaSeconds: parseProgressNumber(eta)
                            });
                        }
                    });
                    downloader.once('error', reject);
                    downloader.once('close', code => {
                        if (code === 0) resolve();
                        else reject(new Error(`yt-dlp terminou com código ${code}: ${errorOutput.trim()}`));
                    });
                });

                const temporaryPrefix = path.basename(outputPrefix);
                const temporaryFileName = (await fs.promises.readdir(offlineDirectory))
                    .find(candidate => candidate.startsWith(`${temporaryPrefix}.`)
                        && DOWNLOADABLE_EXTENSIONS.includes(path.extname(candidate).toLowerCase())
                        && !candidate.endsWith('.part'));
                if (!temporaryFileName
                    || (await fs.promises.stat(path.join(offlineDirectory, temporaryFileName))).size === 0) {
                    throw new Error('yt-dlp terminou sem produzir um vídeo MP4 ou WebM.');
                }
                const extension = path.extname(temporaryFileName).toLowerCase();
                const fileName = `${hash}${extension}`;
                await fs.promises.rename(
                    path.join(offlineDirectory, temporaryFileName),
                    path.join(offlineDirectory, fileName)
                );
                const markerPath = path.join(offlineDirectory, `${hash}.playback.json`);
                const temporaryMarkerPath = `${markerPath}.${crypto.randomUUID()}.tmp`;
                try {
                    await fs.promises.writeFile(
                        temporaryMarkerPath,
                        JSON.stringify({ formatVersion: YOUTUBE_PLAYBACK_FORMAT_VERSION })
                    );
                    await fs.promises.rename(temporaryMarkerPath, markerPath);
                } catch (error) {
                    await fs.promises.rm(temporaryMarkerPath, { force: true });
                    throw error;
                }
                await downloadYoutubeSubtitleIfAvailable(value, language);
                return `${origin}/offline-media/${fileName}`;
            } finally {
                const incompleteFiles = (await fs.promises.readdir(offlineDirectory))
                    .filter(fileName => fileName.startsWith(path.basename(outputPrefix))
                        || (fileName.startsWith(`${hash}.`) && fileName.endsWith('.ytdl')));
                await Promise.all(incompleteFiles.map(fileName =>
                    fs.promises.rm(path.join(offlineDirectory, fileName), { force: true })
                ));
            }
        }

        const fileName = `${hash}${details.extension}`;
        const destination = path.join(offlineDirectory, fileName);
        const temporaryPath = `${destination}.part`;
        try {
            await fs.promises.rm(temporaryPath, { force: true });
            const response = await requestVideo(details.url);
            const contentType = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
            const expectedType = MIME_TYPES[details.extension];
            const contentLength = Number(response.headers['content-length']);
            if (contentType && contentType !== expectedType && contentType !== 'application/octet-stream') {
                response.destroy();
                throw new Error('O servidor não forneceu um arquivo de vídeo compatível.');
            }
            if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) {
                response.destroy();
                throw new Error('O vídeo excede o limite de tamanho permitido.');
            }

            await pipeline(
                response,
                createSizeLimit(MAX_VIDEO_BYTES, onProgress, Number.isFinite(contentLength) ? contentLength : null),
                fs.createWriteStream(temporaryPath, { flags: 'wx' })
            );
            const stats = await fs.promises.stat(temporaryPath);
            if (stats.size === 0) throw new Error('O servidor forneceu um arquivo vazio.');
            await fs.promises.rename(temporaryPath, destination);
            return `${origin}/offline-media/${fileName}`;
        } catch (error) {
            await fs.promises.rm(temporaryPath, { force: true });
            throw error;
        }
    }

    async function downloadStage(videos, onProgress = () => {}) {
        const results = { downloaded: 0, failed: [] };
        const completedDurations = [];
        const stageStartedAt = Date.now();
        onProgress({
            status: 'starting',
            processedCount: 0,
            completedCount: 0,
            failedCount: 0,
            totalCount: videos.length,
            currentIndex: 0,
            currentTitle: '',
            videoPercent: 0,
            speedBytesPerSecond: null,
            estimatedRemainingSeconds: null
        });

        for (const [index, video] of videos.entries()) {
            const videoStartedAt = Date.now();
            let currentEtaSeconds = null;
            let currentPercent = 0;
            const reportVideoProgress = progress => {
                currentEtaSeconds = Number.isFinite(progress.etaSeconds) && progress.etaSeconds >= 0
                    ? progress.etaSeconds
                    : null;
                currentPercent = progress.videoPercent ?? currentPercent;
                const elapsedSeconds = (Date.now() - videoStartedAt) / 1000;
                const downloadedPercent = Number.isFinite(progress.downloadedBytes)
                    && Number.isFinite(progress.totalBytes)
                    && progress.totalBytes > 0
                    ? progress.downloadedBytes / progress.totalBytes * 100
                    : null;
                const percent = currentPercent > 0 ? currentPercent : downloadedPercent;
                const completionFraction = Number.isFinite(percent) && percent > 0
                    ? Math.min(percent, 100) / 100
                    : null;
                const currentRemainingSeconds = currentEtaSeconds
                    ?? (completionFraction ? elapsedSeconds * (1 - completionFraction) / completionFraction : null);
                const averageCompletedDuration = completedDurations.length
                    ? completedDurations.reduce((sum, duration) => sum + duration, 0) / completedDurations.length
                    : null;
                const estimatedCurrentDuration = averageCompletedDuration
                    ?? (completionFraction
                        ? elapsedSeconds / completionFraction
                        : currentEtaSeconds === null ? null : elapsedSeconds + currentEtaSeconds);
                const estimatedRemainingSeconds = currentRemainingSeconds === null
                    ? null
                    : currentRemainingSeconds + (estimatedCurrentDuration ?? 0) * (videos.length - index - 1);
                onProgress({
                    status: 'downloading',
                    processedCount: results.downloaded + results.failed.length,
                    completedCount: results.downloaded,
                    failedCount: results.failed.length,
                    totalCount: videos.length,
                    currentIndex: index + 1,
                    currentTitle: video.title,
                    ...progress,
                    videoPercent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : progress.videoPercent,
                    estimatedRemainingSeconds: estimatedRemainingSeconds === null
                        ? null
                        : Math.ceil(estimatedRemainingSeconds),
                    elapsedSeconds
                });
            };
            onProgress({
                status: 'downloading',
                processedCount: results.downloaded + results.failed.length,
                completedCount: results.downloaded,
                failedCount: results.failed.length,
                totalCount: videos.length,
                currentIndex: index + 1,
                currentTitle: video.title,
                videoPercent: 0,
                speedBytesPerSecond: null,
                estimatedRemainingSeconds: null
            });
            let downloaded = false;
            for (let attempt = 1; attempt <= MAX_DOWNLOAD_ATTEMPTS; attempt += 1) {
                try {
                    const key = `${getVideoKey(video.url)}:${video.subtitleLanguage}`;
                    let job = downloadJobs.get(key);
                    const onJobProgress = progress => reportVideoProgress(progress);
                    if (!job) {
                        job = { listeners: new Set(), promise: null };
                        job.listeners.add(onJobProgress);
                        job.promise = downloadVideo(video.url, video.subtitleLanguage, progress => {
                            for (const listener of job.listeners) listener(progress);
                        }).finally(() => downloadJobs.delete(key));
                        downloadJobs.set(key, job);
                    } else {
                        job.listeners.add(onJobProgress);
                    }
                    try {
                        await job.promise;
                    } finally {
                        job.listeners.delete(onJobProgress);
                    }
                    downloaded = true;
                    break;
                } catch (error) {
                    console.error(`Unable to download offline video "${video.title}" (attempt ${attempt}/${MAX_DOWNLOAD_ATTEMPTS}):`, error);
                    if (attempt === MAX_DOWNLOAD_ATTEMPTS) break;
                    onProgress({
                        status: 'retrying',
                        processedCount: results.downloaded + results.failed.length,
                        completedCount: results.downloaded,
                        failedCount: results.failed.length,
                        totalCount: videos.length,
                        currentIndex: index + 1,
                        currentTitle: video.title,
                        attempt: attempt + 1,
                        maxAttempts: MAX_DOWNLOAD_ATTEMPTS,
                        videoPercent: 0,
                        speedBytesPerSecond: null,
                        estimatedRemainingSeconds: null,
                        elapsedSeconds: (Date.now() - stageStartedAt) / 1000
                    });
                }
            }
            if (downloaded) {
                results.downloaded += 1;
                completedDurations.push((Date.now() - videoStartedAt) / 1000);
                onProgress({
                    status: 'video-complete',
                    processedCount: results.downloaded + results.failed.length,
                    completedCount: results.downloaded,
                    failedCount: results.failed.length,
                    totalCount: videos.length,
                    currentIndex: index + 1,
                    currentTitle: video.title,
                    videoPercent: 100,
                    speedBytesPerSecond: null,
                    estimatedRemainingSeconds: results.downloaded + results.failed.length === videos.length
                        ? 0
                        : Math.ceil(completedDurations.reduce((sum, duration) => sum + duration, 0) / completedDurations.length
                            * (videos.length - index - 1)),
                    elapsedSeconds: (Date.now() - stageStartedAt) / 1000
                });
            } else {
                results.failed.push(video.title);
                onProgress({
                    status: 'video-failed',
                    processedCount: results.downloaded + results.failed.length,
                    completedCount: results.downloaded,
                    failedCount: results.failed.length,
                    totalCount: videos.length,
                    currentIndex: index + 1,
                    currentTitle: video.title,
                    videoPercent: 0,
                    speedBytesPerSecond: null,
                    estimatedRemainingSeconds: null,
                    elapsedSeconds: (Date.now() - stageStartedAt) / 1000
                });
            }
        }
        onProgress({
            status: 'complete',
            processedCount: videos.length,
            completedCount: results.downloaded,
            failedCount: results.failed.length,
            totalCount: videos.length,
            currentIndex: videos.length,
            currentTitle: '',
            videoPercent: 100,
            speedBytesPerSecond: null,
            estimatedRemainingSeconds: 0,
            elapsedSeconds: (Date.now() - stageStartedAt) / 1000
        });
        return results;
    }

    return { resolveVideo, resolveOfflineSubtitle, getStageDownloadStatus, removeStageDownloads, downloadStage };
}

module.exports = { createOfflineDownloads, getDownloadableStageVideos, getMediaDetails, getYouTubeVideoId };
