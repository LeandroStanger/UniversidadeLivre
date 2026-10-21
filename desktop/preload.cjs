const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('universidadeLivreDesktop', {
    downloadStage: stage => ipcRenderer.invoke('offline:download-stage', stage),
    getStageDownloadStatus: stage => ipcRenderer.invoke('offline:stage-download-status', stage),
    removeStageDownloads: stage => ipcRenderer.invoke('offline:remove-stage-downloads', stage),
    resolveOfflineVideo: url => ipcRenderer.invoke('offline:resolve-video', url),
    resolveOfflineSubtitle: (url, language) => ipcRenderer.invoke('offline:resolve-subtitle', url, language),
    onDownloadProgress: listener => {
        const handler = (_event, progress) => listener(progress);
        ipcRenderer.on('offline:download-progress', handler);
        return () => ipcRenderer.removeListener('offline:download-progress', handler);
    }
});
