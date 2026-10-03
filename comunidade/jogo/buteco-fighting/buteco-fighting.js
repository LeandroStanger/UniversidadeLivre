(function () {
    'use strict';

    const GAME_URL = 'https://fighting.butecodosdevs.com/';
    const PLAYTIME_STORAGE_KEY = 'ulivre_buteco_fighting_playtime_ms';
    const PLAYTIME_SAVE_INTERVAL = 15000;
    let playSessionStartedAt = 0;
    let playtimeInterval = null;

    function savePlaytime() {
        if (!playSessionStartedAt) return;
        const now = Date.now();
        const elapsed = Math.max(0, now - playSessionStartedAt);
        if (elapsed > 0) {
            try {
                const stored = Math.max(0, Number(localStorage.getItem(PLAYTIME_STORAGE_KEY)) || 0);
                localStorage.setItem(PLAYTIME_STORAGE_KEY, String(stored + elapsed));
                window.dispatchEvent(new Event('butecoFightingPlaytimeUpdated'));
            } catch (_) { }
        }
        playSessionStartedAt = now;
    }

    function startPlaytime() {
        const panel = document.getElementById('butecoFightingPanel');
        if (playSessionStartedAt || document.visibilityState === 'hidden' || !panel || panel.hidden) return;
        playSessionStartedAt = Date.now();
        playtimeInterval = window.setInterval(savePlaytime, PLAYTIME_SAVE_INTERVAL);
    }

    function stopPlaytime() {
        if (!playSessionStartedAt) return;
        savePlaytime();
        playSessionStartedAt = 0;
        if (playtimeInterval !== null) {
            window.clearInterval(playtimeInterval);
            playtimeInterval = null;
        }
    }

    function show() {
        const panel = document.getElementById('butecoFightingPanel');
        const frame = document.getElementById('butecoFightingFrame');
        const menu = document.getElementById('gamesMenuScreen');
        const shell = document.getElementById('gameShellScreen');
        const title = document.querySelector('.game-shell-title-wrap strong');
        const status = document.getElementById('chessStatusText');
        if (!panel || !frame || !menu || !shell) return;

        if (title) title.textContent = window.t?.('game_buteco_fighting_title') || 'Buteco Fighting';
        if (status) status.textContent = window.t?.('game_buteco_fighting_status') || 'Game loaded in the room.';
        menu.hidden = true;
        shell.hidden = false;
        panel.style.removeProperty('display');
        panel.hidden = false;
        if (frame.src === 'about:blank') frame.src = GAME_URL;
        startPlaytime();
    }

    function close() {
        const panel = document.getElementById('butecoFightingPanel');
        const frame = document.getElementById('butecoFightingFrame');
        stopPlaytime();
        if (panel) panel.hidden = true;
        if (frame && frame.src !== 'about:blank') frame.src = 'about:blank';
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') stopPlaytime();
        else startPlaytime();
    });
    window.addEventListener('blur', stopPlaytime);
    window.addEventListener('focus', startPlaytime);
    window.addEventListener('pagehide', stopPlaytime);
    window.addEventListener('pageshow', startPlaytime);

    window.ButecoFightingGame = { show, close };
})();