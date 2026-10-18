const { app, BrowserWindow, shell } = require('electron');
const { startStaticServer } = require('./static-server.cjs');

let staticServer;
let applicationOrigin;

function isApplicationUrl(value) {
    try {
        return new URL(value).origin === applicationOrigin;
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
            webviewTag: false
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
        const result = await startStaticServer(app.getAppPath());
        staticServer = result.server;
        applicationOrigin = result.url;
        await createWindow(result.url);
    } catch (error) {
        console.error('Unable to start Universidade Livre Desktop:', error);
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && applicationOrigin) {
        createWindow(applicationOrigin).catch(error => {
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
