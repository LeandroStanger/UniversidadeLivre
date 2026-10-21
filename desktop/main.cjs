const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const { startStaticServer } = require('./static-server.cjs');
const { createOfflineDownloads, getDownloadableStageVideos } = require('./offline-downloads.cjs');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

let staticServer;
let applicationOrigin;
let offlineDownloads;

function isApplicationUrl(value) {
    try {
        const url = new URL(value);
        return Boolean(applicationOrigin)
            && url.origin === applicationOrigin
            && url.protocol === 'http:'
            && !url.username
            && !url.password;
    } catch {
        return false;
    }
}

function openExternalUrl(value) {
    let protocol;
    try {
        protocol = new URL(value).protocol;
    } catch {
        console.warn(`Blocked invalid external URL: ${value}`);
        return;
    }

    if (!['http:', 'https:', 'mailto:'].includes(protocol)) {
        console.warn(`Blocked unsupported external URL protocol: ${protocol}`);
        return;
    }

    shell.openExternal(value).catch(error => {
        console.error(`Unable to open external URL ${value}:`, error);
    });
}

function createWindow(url) {
    const window = new BrowserWindow({
        width: 1440,
        height: 960,
        minWidth: 800,
        minHeight: 600,
        show: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webviewTag: false,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    window.webContents.setWindowOpenHandler(({ url: destination }) => {
        if (isApplicationUrl(destination)) {
            createWindow(destination).catch(error => {
                console.error(`Unable to open application window ${destination}:`, error);
            });
        } else {
            openExternalUrl(destination);
        }
        return { action: 'deny' };
    });

    window.webContents.on('will-navigate', (event, destination) => {
        if (isApplicationUrl(destination)) return;
        event.preventDefault();
        openExternalUrl(destination);
    });

    window.once('ready-to-show', () => window.show());

    return window.loadURL(url).then(() => window);
}

app.whenReady().then(async () => {
    try {
        const result = await startStaticServer(
            app.getAppPath(),
            path.join(app.getPath('userData'), 'offline-videos')
        );
        staticServer = result.server;
        applicationOrigin = result.url;
        const platformNames = { darwin: 'mac', win32: 'win', linux: 'linux' };
        const toolDirectory = app.isPackaged
            ? path.join(process.resourcesPath, 'yt-dlp')
            : path.join(__dirname, 'bin', 'yt-dlp', `${platformNames[process.platform]}-${process.arch}`);
        const executableExtension = process.platform === 'win32' ? '.exe' : '';
        offlineDownloads = createOfflineDownloads(
            path.join(app.getPath('userData'), 'offline-videos'),
            applicationOrigin,
            {
                ytDlpPath: path.join(toolDirectory, `yt-dlp${executableExtension}`),
                denoPath: path.join(toolDirectory, `deno${executableExtension}`)
            }
        );
        ipcMain.handle('offline:resolve-video', async (event, url) => {
            if (!isApplicationUrl(event.senderFrame?.url || '')) throw new Error('Solicitação de origem inválida.');
            return offlineDownloads.resolveVideo(url);
        });
        ipcMain.handle('offline:resolve-subtitle', async (event, url, language) => {
            if (!isApplicationUrl(event.senderFrame?.url || '')) throw new Error('Solicitação de origem inválida.');
            if (!['pt', 'en', 'es'].includes(language)) throw new Error('Idioma de legenda inválido.');
            return offlineDownloads.resolveOfflineSubtitle(url, language);
        });
        ipcMain.handle('offline:stage-download-status', async (event, stage) => {
            if (!isApplicationUrl(event.senderFrame?.url || '')) throw new Error('Solicitação de origem inválida.');
            const videos = getDownloadableStageVideos(stage);
            return offlineDownloads.getStageDownloadStatus(videos);
        });
        ipcMain.handle('offline:remove-stage-downloads', async (event, stage) => {
            if (!isApplicationUrl(event.senderFrame?.url || '')) throw new Error('Solicitação de origem inválida.');
            const videos = getDownloadableStageVideos(stage);
            return offlineDownloads.removeStageDownloads(videos);
        });
        ipcMain.handle('offline:download-stage', async (event, stage) => {
            if (!isApplicationUrl(event.senderFrame?.url || '')) throw new Error('Solicitação de origem inválida.');
            const videos = getDownloadableStageVideos(stage);
            if (typeof stage.downloadId !== 'string' || !/^[a-f0-9-]{36}$/.test(stage.downloadId)) {
                throw new Error('Etapa de curso inválida.');
            }
            if (!videos.length) throw new Error('Esta etapa não possui videoaulas compatíveis para download.');
            return offlineDownloads.downloadStage(videos, progress => {
                if (!event.sender.isDestroyed()) {
                    event.sender.send('offline:download-progress', {
                        downloadId: stage.downloadId,
                        ...progress
                    });
                }
            });
        });
        await createWindow(`${applicationOrigin}/`);
    } catch (error) {
        console.error('Unable to start Universidade Livre Desktop:', error);
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && applicationOrigin) {
        createWindow(`${applicationOrigin}/`).catch(error => {
            console.error('Unable to restore Universidade Livre Desktop window:', error);
        });
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    staticServer?.close(error => {
        if (error) console.error('Unable to stop the desktop content server:', error);
    });
});
