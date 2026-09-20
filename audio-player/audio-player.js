(function () {
    'use strict';

    const tracks = [
        ['AawLM81gIHo', 'Música 1'], ['0UN_HbOTTcI', 'Música 2'], ['eLa685J5uA8', 'Música 3'],
        ['PaYW7pIw0Fk', 'Música 4'], ['2bSbaeEnMDw', 'Música 5'], ['VjMCJLK_dts', 'Música 6'],
        ['_xaj8QSJZ0E', 'Música 7'], ['3dkO1eatEmY', 'Música 8'], ['pNPqQPrcSIo', 'Música 9'],
        ['4DX2QkKeByw', 'Música 10'], ['o_6xA1apzEU', 'Música 11'], ['K2VzuA6UZ7A', 'Música 12']
    ];
    const stateKey = 'universidade-livre-audio-player';
    let player;
    let currentIndex = 0;
    let isReady = false;
    let wantsToPlay = false;
    let apiLoading = false;
    let progressTimer;
    let audioStartScheduled = false;
    let savedState = {};

    const $ = id => document.getElementById(id);
    const formatTime = seconds => {
        const value = Math.max(0, Math.floor(Number(seconds) || 0));
        return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    };

    function saveState() {
        if (!player || !isReady) return;
        savedState = { index: currentIndex, time: player.getCurrentTime() || 0, volume: player.getVolume() };
        localStorage.setItem(stateKey, JSON.stringify(savedState));
    }

    function updateProgress() {
        if (!player || !isReady) return;
        const current = player.getCurrentTime() || 0;
        const duration = player.getDuration() || 0;
        $('audioPlayerSeek').value = duration ? (current / duration) * 100 : 0;
        $('audioPlayerCurrentTime').textContent = formatTime(current);
        $('audioPlayerDuration').textContent = formatTime(duration);
    }

    function updateVolumeDisplay(volume) {
        const value = Math.max(0, Math.min(100, Math.round(Number(volume) || 0)));
        $('audioPlayerVolume').value = value;
        $('audioPlayerVolumeValue').textContent = `${value}%`;
    }

    function pauseAudio() {
        wantsToPlay = false;
        if (isReady && player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    }

    function loadTrack(index, autoplay) {
        currentIndex = (index + tracks.length) % tracks.length;
        const [videoId, title] = tracks[currentIndex];
        $('audioPlayerTitle').textContent = title;
        if (!isReady) return;
        player.loadVideoById({ videoId, startSeconds: currentIndex === savedState.index ? Number(savedState.time) || 0 : 0 });
        if (!autoplay) player.pauseVideo();
        saveState();
    }

    function randomTrackIndex() {
        if (tracks.length < 2) return currentIndex;
        let nextIndex = currentIndex;
        while (nextIndex === currentIndex) nextIndex = Math.floor(Math.random() * tracks.length);
        return nextIndex;
    }

    function createPlayer() {
        player = new YT.Player('youtubeAudioPlayer', {
            height: '1', width: '1', videoId: tracks[currentIndex][0],
            playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
                onReady: event => {
                    isReady = true;
                    if (!progressTimer) {
                        progressTimer = window.setInterval(() => { updateProgress(); saveState(); }, 1000);
                    }
                    event.target.setVolume(Number(savedState.volume ?? 70));
                    updateVolumeDisplay(savedState.volume ?? 70);
                    loadTrack(currentIndex, wantsToPlay);
                    updateProgress();
                },
                onStateChange: event => {
                    const playing = event.data === YT.PlayerState.PLAYING;
                    $('audioPlayerPlay').innerHTML = `<i class="fas fa-${playing ? 'pause' : 'play'}"></i>`;
                    $('audioPlayerPlay').setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
                    if (event.data === YT.PlayerState.ENDED) loadTrack(randomTrackIndex(), true);
                },
                onError: () => loadTrack(randomTrackIndex(), true)
            }
        });
    }

    function loadYouTubeApi() {
        if (window.YT?.Player) return createPlayer();
        if (apiLoading) return;
        apiLoading = true;
        const previousReadyCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (typeof previousReadyCallback === 'function') previousReadyCallback();
            createPlayer();
        };
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
    }

    function ensurePlayerMarkup() {
        if ($('floatingAudioPlayer')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="floatingAudioPlayer" class="floating-audio-player">
                <div id="audioPlayerPanel" class="audio-player-panel" hidden>
                    <div class="audio-player-heading">
                        <div>
                            <span class="audio-player-kicker"><i class="fas fa-headphones" aria-hidden="true"></i> Música para estudar</span>
                            <strong id="audioPlayerTitle">Carregando áudio...</strong>
                        </div>
                        <button id="closeAudioPlayer" class="audio-player-close" type="button" aria-label="Fechar player">&times;</button>
                    </div>
                    <div class="audio-player-progress">
                        <input id="audioPlayerSeek" type="range" min="0" max="100" value="0" step="0.1" aria-label="Progresso da música">
                        <div class="audio-player-time"><span id="audioPlayerCurrentTime">00:00</span><span id="audioPlayerDuration">00:00</span></div>
                    </div>
                    <div class="audio-player-controls">
                        <button id="audioPlayerPrevious" type="button" aria-label="Áudio anterior"><i class="fas fa-backward-step"></i></button>
                        <button id="audioPlayerPlay" class="audio-player-play" type="button" aria-label="Reproduzir"><i class="fas fa-play"></i></button>
                        <button id="audioPlayerNext" type="button" aria-label="Próximo áudio"><i class="fas fa-forward-step"></i></button>
                        <label class="audio-player-volume" aria-label="Volume"><i class="fas fa-volume-high"></i><input id="audioPlayerVolume" type="range" min="0" max="100" value="70"><span id="audioPlayerVolumeValue">70%</span></label>
                    </div>
                </div>
                <button id="audioPlayerToggle" class="audio-player-toggle" type="button" aria-expanded="false" aria-controls="audioPlayerPanel" aria-label="Abrir player de música">
                    <i class="fas fa-music" aria-hidden="true"></i>
                    <span class="audio-player-toggle-label">Música</span>
                </button>
                <div id="youtubeAudioPlayer" class="youtube-audio-source" aria-hidden="true"></div>
            </div>
        `);
    }

    window.pauseFloatingAudio = pauseAudio;

    document.addEventListener('DOMContentLoaded', () => {
        ensurePlayerMarkup();
        try {
            savedState = JSON.parse(localStorage.getItem(stateKey) || '{}');
        } catch (error) {
            console.warn('[Audio Player] Estado salvo inválido; iniciando uma nova sessão.', error);
            savedState = {};
            localStorage.removeItem(stateKey);
        }
        currentIndex = Number.isInteger(savedState.index) ? savedState.index % tracks.length : Math.floor(Math.random() * tracks.length);
        wantsToPlay = true;
        $('audioPlayerTitle').textContent = tracks[currentIndex][1];
        $('audioPlayerToggle').addEventListener('click', () => {
            const panel = $('audioPlayerPanel');
            const isHidden = panel.hidden;
            panel.hidden = !isHidden;
            $('audioPlayerToggle').setAttribute('aria-expanded', String(isHidden));
            if (isHidden) {
                wantsToPlay = true;
                if (!player) loadYouTubeApi();
                else if (isReady) player.playVideo();
            }
        });
        $('closeAudioPlayer').addEventListener('click', () => {
            $('audioPlayerPanel').hidden = true;
            $('audioPlayerToggle').setAttribute('aria-expanded', 'false');
        });
        $('audioPlayerPlay').addEventListener('click', () => {
            if (!isReady) {
                wantsToPlay = true;
                loadYouTubeApi();
                return;
            }
            if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
            else {
                wantsToPlay = true;
                player.playVideo();
            }
        });
        $('audioPlayerPrevious').addEventListener('click', () => loadTrack(randomTrackIndex(), true));
        $('audioPlayerNext').addEventListener('click', () => loadTrack(randomTrackIndex(), true));
        $('audioPlayerVolume').addEventListener('input', event => {
            const volume = Number(event.target.value);
            updateVolumeDisplay(volume);
            if (isReady) player.setVolume(volume);
            saveState();
        });
        $('audioPlayerSeek').addEventListener('input', event => { if (isReady) player.seekTo((Number(event.target.value) / 100) * player.getDuration(), true); });
        window.addEventListener('beforeunload', saveState);
    });

    function startAudioAfterPageLoad() {
        if (audioStartScheduled) return;
        audioStartScheduled = true;
        const start = () => window.setTimeout(() => {
            if (document.visibilityState === 'visible' || document.visibilityState === 'prerender') {
                loadYouTubeApi();
            }
        }, 2500);
        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(start, { timeout: 6000 });
        } else {
            start();
        }
    }

    if (document.readyState === 'complete') startAudioAfterPageLoad();
    else window.addEventListener('load', startAudioAfterPageLoad, { once: true });
})();
