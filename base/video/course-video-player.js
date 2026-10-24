(function () {
    function normalizeLanguage(language) {
        const value = String(language || '').toLowerCase();
        if (value.startsWith('en')) return 'en';
        if (value.startsWith('es')) return 'es';
        if (value.startsWith('pt')) return 'pt-BR';
        return '';
    }

    function syncPlayerLanguage(language) {
        const normalized = normalizeLanguage(language);
        if (normalized) document.documentElement.lang = normalized;
    }

    syncPlayerLanguage(localStorage.getItem('selectedLanguage'));
    window.addEventListener('languageChanged', event => {
        syncPlayerLanguage(event.detail?.lang || window.getCurrentLanguage?.());
    });

    const playerState = {
        unstarted: -1,
        ended: 0,
        playing: 1,
        paused: 2,
        buffering: 3,
        cued: 5
    };

    function exposeCaptionAndPipControls(skin) {
        const shadowRoot = skin?.shadowRoot;
        if (!shadowRoot) return;

        const keepVisible = (element, display) => {
            if (!element) return;
            element.style.setProperty('display', display, 'important');
            element.hidden = false;
            new MutationObserver(() => {
                if (element.hidden) element.hidden = false;
            }).observe(element, { attributes: true, attributeFilter: ['hidden'] });
        };

        keepVisible(shadowRoot.querySelector('media-pip-button'), 'grid');

        const captionsGroup = shadowRoot.querySelector('media-captions-radio-group');
        keepVisible(captionsGroup, 'flex');
        const captionsMenu = captionsGroup?.closest('media-menu-content');
        if (!captionsMenu?.id) return;

        const menuButton = shadowRoot.querySelector(
            `media-menu-item[commandfor="${CSS.escape(captionsMenu.id)}"]`
        );
        keepVisible(menuButton, 'flex');

        const captionsButton = shadowRoot.querySelector('media-captions-button');
        if (captionsButton) {
            captionsButton.menuFor = captionsMenu.id;
            keepVisible(captionsButton, 'grid');
        }
    }

    async function create(video) {
        if (!(video instanceof HTMLVideoElement)) {
            throw new TypeError('O elemento de mídia do player deve ser um vídeo HTML.');
        }

        await Promise.all([
            customElements.whenDefined('media-i18n'),
            customElements.whenDefined('video-player'),
            customElements.whenDefined('video-skin'),
            customElements.whenDefined('youtube-video')
        ]);

        const createAdapter = window.UniversidadeLivreVideoJs10?.createCompatibilityAdapter;
        if (typeof createAdapter !== 'function') {
            throw new Error('O player Video.js 10 não foi carregado.');
        }

        video.classList.remove('video-js', 'vjs-default-skin');
        video.removeAttribute('controls');
        exposeCaptionAndPipControls(video.closest('video-skin'));
        return createAdapter(video);
    }

    function createLegacyAdapter(adapter) {
        let state = playerState.unstarted;
        const callbacks = new Set();
        const notify = nextState => {
            state = nextState;
            callbacks.forEach(callback => callback({ data: state }));
        };

        adapter.on('playing', () => notify(playerState.playing));
        adapter.on('pause', () => notify(playerState.paused));
        adapter.on('ended', () => notify(playerState.ended));
        adapter.on('waiting', () => notify(playerState.buffering));

        return {
            addEventListener(name, callback) {
                if (name === 'onStateChange') callbacks.add(callback);
                else if (name === 'onApiChange') adapter.on('loadedmetadata', callback);
            },
            clearVideo() {
                adapter.reset();
                notify(playerState.unstarted);
            },
            destroy() {
                adapter.reset();
                notify(playerState.unstarted);
            },
            exitFullscreen: () => adapter.exitFullscreen(),
            getAvailableAudioTracks() {
                const api = adapter.getYouTubeAudioApi();
                return api?.getAvailableAudioTracks?.() || [];
            },
            getAvailableQualityLevels: () => [],
            getCurrentTime: () => adapter.currentTime() || 0,
            getDuration: () => adapter.duration() || 0,
            getPlayerState: () => state,
            getVolume: () => Math.round((adapter.volume() || 0) * 100),
            isMuted: () => adapter.muted(),
            loadModule() {},
            loadVideoById(videoId) {
                adapter.useYouTube(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
                return adapter.play();
            },
            mute: () => adapter.muted(true),
            pauseVideo: () => adapter.pause(),
            playVideo: () => adapter.play(),
            seekTo: (time) => { adapter.currentTime(time); },
            setAudioTrack(trackId) {
                adapter.getYouTubeAudioApi()?.setAudioTrack?.(trackId);
            },
            setOption() {},
            setPlaybackQuality() {},
            setPlaybackRate: rate => { adapter.playbackRate(rate); },
            setVolume: volume => { adapter.volume(Math.max(0, Math.min(100, Number(volume) || 0)) / 100); },
            stopVideo() {
                adapter.pause();
                adapter.currentTime(0);
                notify(playerState.paused);
            },
            unMute: () => adapter.muted(false),
            unloadModule() {}
        };
    }

    window.UniversidadeLivreCourseVideoPlayer = {
        create,
        createLegacyAdapter,
        setLanguage: syncPlayerLanguage,
        exposeControls: exposeCaptionAndPipControls
    };
})();
