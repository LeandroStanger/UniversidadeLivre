(() => {
    const controlBindings = new WeakMap();
    const downloadIcon = 'fluent:desktop-arrow-down-48-regular';
    const deleteIcon = 'fluent:paint-brush-arrow-down-24-regular';
    const style = document.createElement('style');
    style.textContent = `
        .offline-media-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.55rem;
            width: auto;
            min-width: 44px;
            min-height: 44px;
            padding: 0.65rem 1rem;
            border: 1px solid #bfdbfe;
            border-radius: 999px;
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            box-shadow: 0 5px 16px rgb(37 99 235 / 16%);
            color: #1e3a8a;
            cursor: pointer;
            font: inherit;
            font-size: 0.85rem;
            font-weight: 600;
            line-height: 1.2;
            white-space: nowrap;
            transition: background 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .offline-media-button:hover:not(:disabled) {
            background: linear-gradient(135deg, #dbeafe, #bfdbfe);
            box-shadow: 0 8px 22px rgb(37 99 235 / 24%);
            transform: translateY(-1px);
        }
        .offline-media-button:focus-visible {
            outline: 2px solid #8dcaff;
            outline-offset: 3px;
        }
        .offline-media-button[hidden] {
            display: none !important;
        }
        .offline-media-button:disabled {
            cursor: default;
            opacity: 0.88;
            box-shadow: none;
        }
        .offline-media-button i {
            font-size: 0.95rem;
            color: #2563eb;
        }
        .offline-media-button iconify-icon {
            width: 1.25rem;
            height: 1.25rem;
            flex: 0 0 auto;
            color: #2563eb;
        }
        .offline-media-delete-button {
            background: linear-gradient(135deg, #b42318, #8f1d14);
            box-shadow: 0 6px 18px rgb(180 35 24 / 25%);
            color: #fff;
        }
        .offline-media-delete-button i {
            color: inherit;
        }
        .offline-media-delete-button iconify-icon {
            color: #fecaca;
        }
        .offline-media-delete-button:hover:not(:disabled) {
            background: linear-gradient(135deg, #d92d20, #b42318);
        }
        .community-offline-media-button {
            margin-top: 0.5rem;
        }
    `;
    document.head.appendChild(style);

    function isSupported(url) {
        if (typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return false;
            const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
            const videoId = getYouTubeVideoId(parsed);
            return Boolean(videoId || /\.(mp4|webm)$/i.test(parsed.pathname));
        } catch {
            return false;
        }
    }

    function getYouTubeVideoId(url) {
        const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
        let id = null;
        if (hostname === 'youtu.be') {
            id = url.pathname.slice(1).split('/')[0];
        } else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(hostname)) {
            if (url.pathname === '/watch') id = url.searchParams.get('v');
            else {
                const [route, value] = url.pathname.split('/').filter(Boolean);
                if (['embed', 'shorts', 'live'].includes(route)) id = value;
            }
        }
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }

    function getLanguage() {
        const language = String(window.getCurrentLanguage?.() || 'pt').toLowerCase();
        if (language.startsWith('en')) return 'en';
        if (language.startsWith('es')) return 'es';
        return 'pt';
    }

    function getMessage(key, percent) {
        const messages = {
            pt: {
                checking: 'Verificando download...',
                download: 'Baixar para offline',
                downloading: 'Preparando download...',
                progress: `Baixando para offline: ${percent}%`,
                available: 'Disponível offline',
                delete: 'Apagar vídeo offline',
                confirmDelete: 'Deseja apagar este vídeo baixado para reprodução offline?',
                deleteError: 'Não foi possível apagar o vídeo offline.',
                checkError: 'Verificar download offline',
                downloadError: 'Falha no download offline',
                error: 'Não foi possível baixar esta mídia para reprodução offline.'
            },
            en: {
                checking: 'Checking offline download...',
                download: 'Download for offline',
                downloading: 'Preparing download...',
                progress: `Downloading for offline: ${percent}%`,
                available: 'Available offline',
                delete: 'Delete offline video',
                confirmDelete: 'Delete this video downloaded for offline playback?',
                deleteError: 'The offline video could not be deleted.',
                checkError: 'Check offline download',
                downloadError: 'Offline download failed',
                error: 'This media could not be downloaded for offline playback.'
            },
            es: {
                checking: 'Verificando descarga...',
                download: 'Descargar para usar sin conexión',
                downloading: 'Preparando descarga...',
                progress: `Descargando sin conexión: ${percent}%`,
                available: 'Disponible sin conexión',
                delete: 'Eliminar vídeo sin conexión',
                confirmDelete: '¿Quieres eliminar este vídeo descargado para verlo sin conexión?',
                deleteError: 'No se pudo eliminar el vídeo descargado.',
                checkError: 'Verificar descarga',
                downloadError: 'Error en la descarga',
                error: 'No se pudo descargar este contenido para reproducirlo sin conexión.'
            }
        };
        return messages[getLanguage()][key];
    }

    function getApi() {
        return window.universidadeLivreDesktop || null;
    }

    async function resolve(url) {
        const api = getApi();
        if (!api || !isSupported(url)) return null;
        return api.resolveOfflineVideo(url);
    }

    function bindButton(button, url, title, onDownloaded) {
        const previousDispose = controlBindings.get(button);
        previousDispose?.();
        const api = getApi();
        if (!api || !isSupported(url)) {
            button.hidden = true;
            return;
        }

        button.hidden = false;
        button.type = 'button';
        button.classList.add('offline-media-button');
        let downloaded = false;
        let busy = false;
        let disposed = false;
        let downloadId = null;
        let unsubscribe = () => {};

        const setLabel = (label, icon = downloadIcon) => {
            if (disposed) return;
            button.disabled = busy || downloaded;
            button.setAttribute('aria-label', label);
            button.title = label;
            const iconElement = icon === downloadIcon
                ? `<iconify-icon icon="${downloadIcon}" aria-hidden="true"></iconify-icon>`
                : `<i class="fas ${icon}" aria-hidden="true"></i>`;
            button.innerHTML = `${iconElement}<span>${label}</span>`;
        };

        const refreshStatus = async () => {
            try {
                const status = await api.getStageDownloadStatus({
                    videos: [{ title: String(title || 'Mídia').slice(0, 300), url }],
                    language: getLanguage()
                });
                if (disposed) return;
                downloaded = status.downloadedIndexes.includes(0);
                setLabel(
                    getMessage(downloaded ? 'available' : 'download'),
                    downloaded ? 'fa-circle-check' : downloadIcon
                );
            } catch (error) {
                if (disposed) return;
                console.error('[Offline] Não foi possível verificar o download da mídia:', error);
                setLabel(getMessage('checkError'), 'fa-triangle-exclamation');
            }
        };

        const handleClick = async () => {
            if (busy || downloaded) return;
            busy = true;
            downloadId = window.crypto.randomUUID();
            setLabel(getMessage('downloading'), 'fa-spinner fa-spin');
            unsubscribe = api.onDownloadProgress(progress => {
                if (progress.downloadId !== downloadId || progress.videoPercent == null) return;
                setLabel(getMessage('progress', Math.round(progress.videoPercent)), 'fa-spinner fa-spin');
            });
            try {
                await api.downloadStage({
                    videos: [{ title: String(title || 'Mídia').slice(0, 300), url }],
                    language: getLanguage(),
                    downloadId
                });
                if (disposed) return;
                const offlineUrl = await resolve(url);
                if (!offlineUrl) throw new Error('O download terminou sem gerar um arquivo offline reproduzível.');
                downloaded = true;
                setLabel(getMessage('available'), 'fa-circle-check');
                onDownloaded?.(offlineUrl);
            } catch (error) {
                if (disposed) return;
                console.error('[Offline] Não foi possível baixar a mídia:', error);
                setLabel(getMessage('downloadError'), 'fa-triangle-exclamation');
                window.alert(getMessage('error'));
            } finally {
                busy = false;
                unsubscribe();
                unsubscribe = () => {};
                downloadId = null;
                if (!disposed && !downloaded) setLabel(getMessage('download'), downloadIcon);
            }
        };

        button.addEventListener('click', handleClick);
        controlBindings.set(button, () => {
            disposed = true;
            button.removeEventListener('click', handleClick);
            unsubscribe();
        });
        setLabel(getMessage('checking'), 'fa-spinner fa-spin');
        refreshStatus();
    }

    function bindDeleteButton(button, url, title, onDeleting) {
        const previousDispose = controlBindings.get(button);
        previousDispose?.();
        const api = getApi();
        if (!api || !isSupported(url)) {
            button.hidden = true;
            return;
        }

        button.hidden = true;
        button.type = 'button';
        button.classList.add('offline-media-button', 'offline-media-delete-button');
        let downloaded = false;
        let busy = false;
        let disposed = false;

        const setVisible = visible => {
            if (disposed) return;
            button.hidden = !visible;
            button.disabled = busy;
            const label = getMessage('delete');
            button.setAttribute('aria-label', label);
            button.title = label;
            button.innerHTML = `<iconify-icon icon="${deleteIcon}" aria-hidden="true"></iconify-icon><span>${label}</span>`;
        };

        const refreshStatus = async () => {
            try {
                const status = await api.getStageDownloadStatus({
                    videos: [{ title: String(title || 'Mídia').slice(0, 300), url }],
                    language: getLanguage()
                });
                if (disposed) return;
                downloaded = status.downloadedIndexes.includes(0);
                setVisible(downloaded);
            } catch (error) {
                if (disposed) return;
                console.error('[Offline] Não foi possível verificar o vídeo para remoção:', error);
                setVisible(false);
            }
        };

        const handleClick = async () => {
            if (busy || !downloaded || !window.confirm(getMessage('confirmDelete'))) return;
            busy = true;
            setVisible(true);
            try {
                onDeleting?.();
                await api.removeStageDownloads({
                    videos: [{ title: String(title || 'Mídia').slice(0, 300), url }],
                    language: getLanguage()
                });
                if (disposed) return;
                downloaded = false;
                setVisible(false);
            } catch (error) {
                if (disposed) return;
                console.error('[Offline] Não foi possível apagar o vídeo offline:', error);
                window.alert(getMessage('deleteError'));
                setVisible(downloaded);
            } finally {
                busy = false;
                if (!disposed) button.disabled = false;
            }
        };

        button.addEventListener('click', handleClick);
        controlBindings.set(button, () => {
            disposed = true;
            button.removeEventListener('click', handleClick);
        });
        refreshStatus();
    }

    window.UniversidadeLivreOfflineMedia = { bindButton, bindDeleteButton, isSupported, resolve };
})();
