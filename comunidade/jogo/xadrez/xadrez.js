(function () {
    'use strict';

    let chessSelectedSquare = null;
    let chessCommunityOpponent = null;
    let chessRoomPeer = null;
    let chessIsSpectator = false;
    let pendingPromotionResolver = null;
    const CHESS_ROOMS_KEY = 'ulivre_chess_rooms';
    const CHESS_ACTIVE_ROOM_KEY = 'ulivre_chess_active_room';
    const CHESS_SCORE_KEY = 'ulivre_chess_scores';
    const TTT_ROOMS_KEY = 'ulivre_ttt_rooms';
    const TTT_ACTIVE_ROOM_KEY = 'ulivre_ttt_active_room';
    let currentGameSelection = 'chess';
    const chessOpponentPool = [
        { name: 'Ana', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
        { name: 'Bruno', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' },
        { name: 'Carla', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=200&q=80' },
        { name: 'Diego', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80' },
        { name: 'Elisa', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80' },
        { name: 'Felipe', avatar: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=200&q=80' }
    ];

    function buildChessRoomId() {
        return `xadrez-${new Date().getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    }

    function buildTTTRoomId() {
        return `velha-${new Date().getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    }

    function t(key, replacements = {}) {
        if (typeof window.t === 'function') {
            return window.t(key, replacements);
        }
        return key;
    }

    function getCurrentChessUser() {
        return (window.currentUserName || localStorage.getItem('userProfileName') || t('games_room_player_label')).trim() || t('games_room_player_label');
    }

    function readChessScores() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CHESS_SCORE_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function recordChessResult(result) {
        const user = getCurrentChessUser();
        const scores = readChessScores();
        const current = scores[user] || { points: 0, wins: 0, draws: 0, losses: 0 };
        if (result === 'win') {
            current.points += 3;
            current.wins += 1;
        } else if (result === 'draw') {
            current.points += 1;
            current.draws += 1;
        } else {
            current.losses += 1;
        }
        scores[user] = current;
        localStorage.setItem(CHESS_SCORE_KEY, JSON.stringify(scores));
        window.dispatchEvent(new CustomEvent('chessScoreUpdated', { detail: current }));
    }

    function isCurrentUserRoomCreator(room) {
        if (!room || !room.createdBy) return false;
        return String(room.createdBy).toLowerCase() === String(getCurrentChessUser()).toLowerCase();
    }

    function readChessRooms() {
        try {
            const stored = localStorage.getItem(CHESS_ROOMS_KEY);
            if (!stored) {
                return [];
            }
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return [];
            const rooms = parsed.filter((room) => room && room.gameType === 'chess' && !String(room.id).startsWith('velha-'));
            if (rooms.length !== parsed.length) localStorage.setItem(CHESS_ROOMS_KEY, JSON.stringify(rooms));
            return rooms;
        } catch (_) {
            return [];
        }
    }

    function writeChessRooms(rooms) {
        localStorage.setItem(CHESS_ROOMS_KEY, JSON.stringify(rooms));
    }

    function readActiveChessRoom() {
        return sessionStorage.getItem(CHESS_ACTIVE_ROOM_KEY) || null;
    }

    function persistActiveChessRoom(roomId) {
        if (roomId) {
            sessionStorage.setItem(CHESS_ACTIVE_ROOM_KEY, roomId);
            return;
        }
        sessionStorage.removeItem(CHESS_ACTIVE_ROOM_KEY);
    }

    function readTTTRooms() {
        if (window.readTTTRooms) return window.readTTTRooms();
        try {
            const stored = localStorage.getItem(TTT_ROOMS_KEY);
            const rooms = stored ? (JSON.parse(stored) || []) : [];
            if (!Array.isArray(rooms)) return [];
            const filteredRooms = rooms.filter((room) => room && room.gameType === 'tictactoe' && !String(room.id).startsWith('xadrez-'));
            if (filteredRooms.length !== rooms.length) localStorage.setItem(TTT_ROOMS_KEY, JSON.stringify(filteredRooms));
            return filteredRooms;
        } catch (_) {
            return [];
        }
    }

    function writeTTTRooms(rooms) {
        if (window.writeTTTRooms) {
            window.writeTTTRooms(rooms);
            return;
        }
        localStorage.setItem(TTT_ROOMS_KEY, JSON.stringify(rooms));
    }

    function readActiveTTTRoom() {
        if (window.readActiveTTTRoom) return window.readActiveTTTRoom();
        return sessionStorage.getItem(TTT_ACTIVE_ROOM_KEY) || null;
    }

    function persistActiveTTTRoom(roomId) {
        if (window.persistActiveTTTRoom) {
            window.persistActiveTTTRoom(roomId);
            return;
        }
        if (roomId) {
            sessionStorage.setItem(TTT_ACTIVE_ROOM_KEY, roomId);
            return;
        }
        sessionStorage.removeItem(TTT_ACTIVE_ROOM_KEY);
    }

    function getSelectedGame() {
        return ['tictactoe', 'impostor', 'hangman', 'checkers', 'roulette', 'uno', 'bicho'].includes(currentGameSelection) ? currentGameSelection : 'chess';
    }

    function setSelectedGame(game) {
        currentGameSelection = ['tictactoe', 'impostor', 'hangman', 'checkers', 'roulette', 'uno', 'bicho'].includes(game) ? game : 'chess';
    }

    function getActiveRoomIdForSelection() {
        return getSelectedGame() === 'tictactoe' ? readActiveTTTRoom() : readActiveChessRoom();
    }

    function getDisplayGameTitle() {
        return getSelectedGame() === 'tictactoe' ? t('games_room_ttt_board') : t('games_room_chess_board');
    }

    function getDisplayGameStatusLabel() {
        return getSelectedGame() === 'tictactoe' ? t('games_room_sync_status') : t('games_room_sync_status');
    }

    function levelLabel(level) {
        const map = {
            iniciante: 'games_room_level_beginner',
            intermediario: 'games_room_level_intermediate',
            avancado: 'games_room_level_advanced',
            mestre: 'games_room_level_master'
        };
        return t(map[level] || 'games_room_level_intermediate');
    }

    function normalizeChessRoom(room) {
        if (!room || !room.id) return null;
        const mode = room.mode === 'bot' ? 'bot' : 'community';
        const difficulty = room.difficulty || room.level || 'intermediario';
        return {
            id: room.id,
            gameType: 'chess',
            createdBy: room.createdBy || t('games_room_mode_community'),
            level: room.level || difficulty,
            difficulty,
            createdAt: room.createdAt || Date.now(),
            players: Number(room.players || 1),
            spectators: Number(room.spectators || 0),
            status: room.status || 'disponivel',
            mode
        };
    }

    function normalizeTTTRoom(room) {
        if (window.TicTacToeGame && typeof window.TicTacToeGame.normalizeTTTRoom === 'function') {
            return window.TicTacToeGame.normalizeTTTRoom(room);
        }
        return null;
    }

    function createTTTRoom() {
        if (window.createTTTRoom) {
            window.createTTTRoom();
            return;
        }
        const roomMode = getSelectedChessMode();
        const difficulty = roomMode === 'bot' ? (document.getElementById('chessBotDifficulty')?.value || 'intermediario') : 'intermediario';
        const room = normalizeTTTRoom({
            id: buildTTTRoomId(),
            createdBy: getCurrentChessUser(),
            level: difficulty,
            difficulty,
            createdAt: Date.now(),
            players: 1,
            spectators: 0,
            status: 'disponivel',
            mode: roomMode
        });

        if (!room) return;

        const rooms = readTTTRooms();
        rooms.push(room);
        writeTTTRooms(rooms.slice(-8));
        persistActiveTTTRoom(room.id);
        const newRoomState = createNativeTTTState();
        localStorage.setItem(getTTTStorageKey(room.id), JSON.stringify(newRoomState));
        writeTTTGameState(newRoomState, room.id);
        setSelectedGame('tictactoe');
        showTicTacToeGameScreen();
        updateChessRoomVisibility();
        renderChessRoomList();
        joinTicTacToeRoom(room.id, 'play');
    }

    function deleteTTTRoom(roomId) {
        if (window.deleteTTTRoom) {
            window.deleteTTTRoom(roomId);
            return;
        }
        const rooms = readTTTRooms().map(normalizeTTTRoom).filter(Boolean);
        const room = rooms.find((item) => item.id === roomId);
        if (!room || !isCurrentUserRoomCreator(room)) {
            return;
        }

        const remainingRooms = rooms.filter((item) => item.id !== roomId);
        writeTTTRooms(remainingRooms);
        localStorage.removeItem(getTTTStorageKey(roomId));

        if (readActiveTTTRoom() === roomId) {
            persistActiveTTTRoom(null);
            setSelectedGame('tictactoe');
            showTicTacToeGameScreen();
        }

        updateChessRoomVisibility();
        renderChessRoomList();
        renderTicTacToeBoard();
    }

    function joinTicTacToeRoom(roomId, mode) {
        if (window.joinTicTacToeRoom) {
            window.joinTicTacToeRoom(roomId, mode);
            return;
        }
        const room = readTTTRooms().map(normalizeTTTRoom).filter(Boolean).find((item) => item.id === roomId);
        if (!room) return;

        persistActiveTTTRoom(roomId);
        setSelectedGame('tictactoe');
        const modal = document.getElementById('gamesModal');
        if (modal) {
            modal.querySelectorAll('.game-card[data-game]').forEach((item) => item.classList.toggle('active', item.dataset.game === 'tictactoe'));
        }
        showTicTacToeGameScreen();
        renderTicTacToeBoard();
        renderChessRoomList();
        const statusEl = document.getElementById('chessStatusText');
        if (statusEl) {
            statusEl.textContent = `Sala ${room.id} · ${levelLabel(room.level)}`;
        }
    }

    function leaveTTTRoom() {
        if (window.leaveTTTRoom) {
            window.leaveTTTRoom();
            return;
        }
        persistActiveTTTRoom(null);
        setSelectedGame('tictactoe');
        showTicTacToeGameScreen();
        updateChessRoomVisibility();
        renderChessRoomList();
    }

    function renderTTTRoomList() {
        if (window.renderTTTRoomList) {
            window.renderTTTRoomList();
            return;
        }
        const listEl = document.getElementById('tttRoomList');
        if (!listEl) return;

        listEl.dataset.game = 'tictactoe';

        let rooms = readTTTRooms().map(normalizeTTTRoom).filter((room) => room && room.gameType === 'tictactoe');
        if (!rooms.some((room) => room.id === readActiveTTTRoom())) {
            persistActiveTTTRoom(null);
        }
        if (!rooms.length) {
            rooms = [{
                id: 'sem-salas',
                createdBy: 'Sistema',
                level: 'intermediario',
                difficulty: 'intermediario',
                createdAt: Date.now(),
                players: 0,
                spectators: 0,
                status: 'sem-salas',
                mode: 'community'
            }];
        }

        listEl.innerHTML = rooms.map((room) => {
            if (room.status === 'sem-salas') {
                return `
                    <div class="chess-room-item">
                        <div class="chess-room-meta">
                            <strong>${t('games_room_no_room_yet')}</strong>
                            <small>${t('games_room_no_room_help')}</small>
                        </div>
                    </div>
                `;
            }

            const roomId = room.id;
            const activeRoomId = readActiveTTTRoom();
            const isCurrent = activeRoomId === roomId;
            const isActiveText = isCurrent ? t('games_room_in_game') : t('games_room_available');
            const roomMode = room.mode === 'bot' ? t('games_room_mode_bot') : t('games_room_mode_community');
            const roomModeClass = room.mode === 'bot' ? 'bot' : 'community';
            const roomDifficulty = room.mode === 'bot' ? (room.difficulty || room.level || 'intermediario') : (room.level || 'intermediario');
            const canDeleteRoom = isCurrentUserRoomCreator(room);
            const canJoinRoom = room.mode === 'community' && Number(room.players || 0) < 2;
            return `
                <div class="chess-room-item">
                    <div class="chess-room-meta">
                        <div class="chess-room-header-row">
                            <strong>${roomId}</strong>
                            <span class="chess-room-mode-tag ${roomModeClass}">${roomMode}</span>
                        </div>
                        <small>${levelLabel(roomDifficulty)} · ${room.players} ${t(room.players === 1 ? 'games_room_player_count_one' : 'games_room_player_count_many', { count: room.players })} · ${t('games_room_viewers', { count: room.spectators })} · ${isActiveText}</small>
                    </div>
                    <div class="chess-room-actions">
                        ${canJoinRoom ? `<button class="chess-room-button" type="button" data-room-action="join" data-room-id="${roomId}">${t('games_room_join')}</button>` : ''}
                        <button class="chess-room-view-button" type="button" data-room-action="view" data-room-id="${roomId}">${t('games_room_visualize')}</button>
                        ${canDeleteRoom ? `<button class="chess-room-delete-button" type="button" data-room-action="delete" data-room-id="${roomId}">${t('games_room_delete')}</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderChessRoomList() {
        const chessListEl = document.getElementById('chessRoomList');
        const tttListEl = document.getElementById('tttRoomList');
        const listEl = getSelectedGame() === 'tictactoe' ? tttListEl : chessListEl;
        if (!listEl) return;

        if (getSelectedGame() === 'tictactoe') {
            if (chessListEl) chessListEl.hidden = true;
            if (tttListEl) tttListEl.hidden = false;
            renderTTTRoomList();
            return;
        }
        if (chessListEl) chessListEl.hidden = false;
        if (tttListEl) tttListEl.hidden = true;

        let rooms = readChessRooms().map(normalizeChessRoom).filter((room) => room && room.gameType === 'chess');
        if (!rooms.some((room) => room.id === readActiveChessRoom())) {
            persistActiveChessRoom(null);
        }
        if (!rooms.length) {
            rooms = [{
                id: 'sem-salas',
                createdBy: 'Sistema',
                level: 'intermediario',
                difficulty: 'intermediario',
                createdAt: Date.now(),
                players: 0,
                spectators: 0,
                status: 'sem-salas',
                mode: 'community'
            }];
        }

        listEl.innerHTML = rooms.map((room) => {
            if (room.status === 'sem-salas') {
                return `
                    <div class="chess-room-item">
                        <div class="chess-room-meta">
                            <strong>${t('games_room_no_room_yet')}</strong>
                            <small>${t('games_room_no_room_help')}</small>
                        </div>
                    </div>
                `;
            }

            const roomId = room.id;
            const activeRoomId = readActiveChessRoom();
            const isCurrent = activeRoomId === roomId;
            const isActiveText = isCurrent ? t('games_room_in_game') : t('games_room_available');
            const roomMode = room.mode === 'bot' ? t('games_room_mode_bot') : t('games_room_mode_community');
            const roomModeClass = room.mode === 'bot' ? 'bot' : 'community';
            const roomDifficulty = room.mode === 'bot' ? (room.difficulty || room.level || 'intermediario') : (room.level || 'intermediario');
            const canDeleteRoom = isCurrentUserRoomCreator(room);
            const canJoinRoom = room.mode === 'community' && Number(room.players || 0) < 2;
            const playersText = `${room.players} ${t(room.players === 1 ? 'games_room_player_count_one' : 'games_room_player_count_many', { count: room.players })}`;
            const viewersText = t('games_room_viewers', { count: room.spectators });
            return `
                <div class="chess-room-item">
                    <div class="chess-room-meta">
                        <div class="chess-room-header-row">
                            <strong>${roomId}</strong>
                            <span class="chess-room-mode-tag ${roomModeClass}">${roomMode}</span>
                        </div>
                        <small>${levelLabel(roomDifficulty)} · ${playersText} · ${viewersText} · ${isActiveText}</small>
                    </div>
                    <div class="chess-room-actions">
                        ${canJoinRoom ? `<button class="chess-room-button" type="button" data-room-action="join" data-room-id="${roomId}">${t('games_room_join')}</button>` : ''}
                        <button class="chess-room-view-button" type="button" data-room-action="view" data-room-id="${roomId}">${t('games_room_visualize')}</button>
                        ${canDeleteRoom ? `<button class="chess-room-delete-button" type="button" data-room-action="delete" data-room-id="${roomId}">${t('games_room_delete')}</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    function createChessRoom() {
        if (getSelectedGame() === 'tictactoe') {
            createTTTRoom();
            return;
        }

        const roomMode = getSelectedChessMode();
        const roomDifficulty = roomMode === 'bot' ? (document.getElementById('chessBotDifficulty')?.value || 'intermediario') : 'intermediario';
        const room = normalizeChessRoom({
            id: buildChessRoomId(),
            createdBy: getCurrentChessUser(),
            level: roomDifficulty,
            difficulty: roomDifficulty,
            gameType: 'chess',
            createdAt: Date.now(),
            players: 1,
            spectators: 0,
            status: 'disponivel',
            mode: roomMode
        });

        if (!room) return;

        const rooms = readChessRooms();
        rooms.push(room);
        writeChessRooms(rooms.slice(-8));
        persistActiveChessRoom(room.id);
        const newRoomState = createNativeChessState();
        localStorage.setItem(getGamesStorageKey(room.id), JSON.stringify(newRoomState));
        writeChessGameState(newRoomState, room.id);
        chessIsSpectator = false;
        showChessGameScreen();
        updateChessRoomVisibility();
        joinChessRoom(room.id, 'play');
    }

    function deleteChessRoom(roomId) {
        if (getSelectedGame() === 'tictactoe') {
            deleteTTTRoom(roomId);
            return;
        }

        const rooms = readChessRooms().map(normalizeChessRoom).filter(Boolean);
        const room = rooms.find((item) => item.id === roomId);
        if (!room || !isCurrentUserRoomCreator(room)) {
            return;
        }

        const remainingRooms = rooms.filter((item) => item.id !== roomId);
        writeChessRooms(remainingRooms);
        localStorage.removeItem(getGamesStorageKey(roomId));

        if (readActiveChessRoom() === roomId) {
            persistActiveChessRoom(null);
            chessIsSpectator = false;
            showGamesMenuScreen();
        }

        updateChessRoomVisibility();
        renderChessRoomList();
        renderChessBoard();
    }

    function joinChessRoom(roomId, mode) {
        if (getSelectedGame() === 'tictactoe') {
            joinTicTacToeRoom(roomId, mode);
            return;
        }

        const room = readChessRooms().map(normalizeChessRoom).filter(Boolean).find(item => item.id === roomId);
        if (!room) return;

        persistActiveChessRoom(roomId);
        chessIsSpectator = mode === 'view';
        const modal = document.getElementById('gamesModal');
        if (modal) {
            modal.querySelectorAll('.game-card[data-game]').forEach(item => item.classList.add('active'));
        }
        if (room.mode) {
            syncChessModeButtons(room.mode);
        }
        showChessGameScreen();
        updateChessRoomVisibility();
        renderChessBoard();

        const statusEl = document.getElementById('chessStatusText');
        if (statusEl) {
            const viewerText = mode === 'view'
                ? t('games_room_viewer_mode')
                : t('games_room_room_with_level', { roomId: room.id, level: levelLabel(room.level) });
            statusEl.textContent = viewerText;
        }

        if (window.Peer) {
            const peerId = sessionStorage.getItem('ulivre_chess_peer_id') || `ulivre-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
            sessionStorage.setItem('ulivre_chess_peer_id', peerId);
            if (!chessRoomPeer) {
                chessRoomPeer = new window.Peer(peerId, {
                    host: '0.peerjs.com',
                    port: 443,
                    secure: true,
                    debug: 0
                });
                chessRoomPeer.on('open', () => {
                    console.info('[Xadrez] PeerJS pronto:', peerId);
                });
                chessRoomPeer.on('error', (err) => {
                    const message = err && (err.message || err.type || String(err));
                    const shouldIgnore = /peer-unavailable|could not connect to peer|disconnected|network|server/i.test(message);
                    if (!shouldIgnore) {
                        console.warn('[Xadrez] PeerJS:', err?.type || 'error', err?.message || err);
                    }
                });
            }
        }
    }

    function leaveChessRoom() {
        if (getSelectedGame() === 'tictactoe') {
            leaveTTTRoom();
            return;
        }
        persistActiveChessRoom(null);
        chessIsSpectator = false;
        showGamesMenuScreen();
        updateChessRoomVisibility();
        renderChessRoomList();
    }

    function slugify(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'disciplina';
    }

    function getGamesRoomKey() {
        const courseId = document.body?.dataset?.currentCourseId || localStorage.getItem('currentCourseId') || '';
        const discipline = document.body?.dataset?.currentDiscipline || localStorage.getItem('currentDiscipline') || '';
        if (!courseId || !discipline) {
            return 'ulivre-games-global';
        }
        return `ulivre-games-${slugify(courseId)}-${slugify(discipline)}`;
    }

    function getGamesStorageKey(roomId = readActiveChessRoom()) {
        const targetRoom = roomId || 'global';
        return `comunidade_games_${getGamesRoomKey()}_${slugify(targetRoom)}`;
    }

    function getTTTStorageKey(roomId = readActiveTTTRoom()) {
        if (window.getTTTStorageKey) return window.getTTTStorageKey(roomId);
        const targetRoom = roomId || 'global';
        return `comunidade_ttt_${getGamesRoomKey()}_${slugify(targetRoom)}`;
    }

    function createNativeChessState() {
        return {
            board: [
                ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
                ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['', '', '', '', '', '', '', ''],
                ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
                ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
            ],
            turn: 'white',
            castling: { K: true, Q: true, k: true, q: true },
            enPassant: null,
            lastMove: t('games_room_new_match'),
            updatedAt: Date.now()
        };
    }

    function readChessGameState() {
        const activeRoomId = readActiveChessRoom();
        const roomKey = getGamesStorageKey(activeRoomId);
        const legacyKey = `comunidade_games_${getGamesRoomKey()}`;
        try {
            const raw = localStorage.getItem(roomKey) || localStorage.getItem(legacyKey);
            if (!raw) return createNativeChessState();
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.board)) return createNativeChessState();
            return { ...createNativeChessState(), ...parsed, castling: { ...createNativeChessState().castling, ...(parsed.castling || {}) } };
        } catch (_) {
            return createNativeChessState();
        }
    }

    function createNativeTTTState() {
        if (window.createNativeTTTState) return window.createNativeTTTState();
        return {
            board: Array(9).fill(''),
            turn: 'X',
            winner: null,
            lastMove: t('games_room_new_match'),
            updatedAt: Date.now()
        };
    }

    function readTTTGameState(roomId = readActiveTTTRoom()) {
        if (window.readTTTGameState) return window.readTTTGameState(roomId);
        const key = getTTTStorageKey(roomId);
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return createNativeTTTState();
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.board)) return createNativeTTTState();
            return { ...createNativeTTTState(), ...parsed };
        } catch (_) {
            return createNativeTTTState();
        }
    }

    function writeTTTGameState(gameState, roomId = readActiveTTTRoom()) {
        if (window.writeTTTGameState) {
            window.writeTTTGameState(gameState, roomId);
            return;
        }
        const key = getTTTStorageKey(roomId);
        localStorage.setItem(key, JSON.stringify({ ...gameState, updatedAt: Date.now() }));
    }

    function writeChessGameState(gameState, roomId = readActiveChessRoom()) {
        const key = getGamesStorageKey(roomId);
        const stateData = { ...gameState, updatedAt: Date.now() };
        localStorage.setItem(key, JSON.stringify(stateData));
        localStorage.setItem(`comunidade_games_sync_${Date.now()}`, 'updated');
    }

    function updateChessRoomVisibility() {
        const shell = document.getElementById('gameShellScreen');
        const creator = document.querySelector('.chess-room-creator');
        const chessRoomList = document.getElementById('chessRoomList');
        const tttRoomList = document.getElementById('tttRoomList');
        const roomList = getSelectedGame() === 'tictactoe' ? tttRoomList : chessRoomList;
        const stage = document.querySelector('.game-stage');
        const hasActiveRoom = getSelectedGame() === 'tictactoe' ? !!readActiveTTTRoom() : !!readActiveChessRoom();

        if (shell) {
            shell.classList.toggle('room-active', hasActiveRoom);
        }

        if (creator) {
            creator.style.display = hasActiveRoom ? 'none' : 'flex';
        }

        if (roomList) {
            roomList.style.display = hasActiveRoom ? 'none' : 'grid';
        }
        if (chessRoomList && chessRoomList !== roomList) chessRoomList.style.display = 'none';
        if (tttRoomList && tttRoomList !== roomList) tttRoomList.style.display = 'none';

        if (stage) {
            stage.style.display = hasActiveRoom ? 'block' : 'none';
        }
    }

    function closePromotionModal() {
        const modal = document.getElementById('chessPromotionModal');
        if (!modal) return;

        modal.hidden = true;
        modal.classList.remove('show');

        if (pendingPromotionResolver) {
            const resolver = pendingPromotionResolver;
            pendingPromotionResolver = null;
            resolver(null);
        }
    }

    function openPromotionModal(callback) {
        const modal = document.getElementById('chessPromotionModal');
        if (!modal) {
            callback('Q');
            return;
        }

        pendingPromotionResolver = callback;
        modal.hidden = false;
        modal.classList.add('show');

        modal.querySelectorAll('[data-promotion]').forEach((button) => {
            button.onclick = () => {
                const choice = button.dataset.promotion || 'Q';
                modal.hidden = true;
                modal.classList.remove('show');
                if (pendingPromotionResolver) {
                    const resolver = pendingPromotionResolver;
                    pendingPromotionResolver = null;
                    resolver(choice);
                }
            };
        });

        modal.onclick = (event) => {
            if (event.target === modal) {
                closePromotionModal();
            }
        };
    }

    function choosePromotionPiece() {
        return new Promise((resolve) => {
            openPromotionModal(resolve);
        });
    }

    function getSelectedChessMode() {
        const modeSelect = document.getElementById('chessRoomMode');
        return modeSelect ? (modeSelect.value === 'bot' ? 'bot' : 'community') : 'community';
    }

    function syncChessModeButtons(mode = getSelectedChessMode()) {
        const label = document.querySelector('.chess-menu-label');
        const wrap = document.getElementById('chessBotDifficultyWrap');
        const difficulty = document.getElementById('chessBotDifficulty');
        const badge = document.getElementById('chessDifficultyValue');

        if (label) {
            label.textContent = mode === 'bot' ? t('games_room_play_against_bot') : t('games_room_play_community');
        }

        if (wrap) {
            wrap.hidden = mode !== 'bot';
        }

        if (difficulty) {
            difficulty.disabled = mode !== 'bot';
        }

        if (badge) {
            const selectedDifficulty = mode === 'bot' ? (difficulty?.value || 'intermediario') : 'intermediario';
            badge.textContent = levelLabel(selectedDifficulty);
            badge.hidden = mode !== 'bot';
        }
    }

    function getSelectedChessModeLabel() {
        return getSelectedChessMode() === 'bot' ? t('games_room_play_against_bot') : t('games_room_play_community');
    }

    function getChessOpponentDisplay() {
        const room = readChessRooms().map(normalizeChessRoom).filter(Boolean).find((item) => item.id === readActiveChessRoom());
        const currentMode = room?.mode || getSelectedChessMode();
        const currentDifficulty = room?.difficulty || (document.getElementById('chessBotDifficulty')?.value || 'intermediario');

        if (!chessCommunityOpponent || currentMode !== 'community') {
            chessCommunityOpponent = chessOpponentPool[Math.floor(Math.random() * chessOpponentPool.length)];
        }

        if (currentMode === 'bot') {
            return {
                typeLabel: t('games_room_mode_bot'),
                name: `${levelLabel(currentDifficulty)} ${t('games_room_mode_bot')}`,
                avatar: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=200&q=80',
                status: `${t('games_room_level')} ${levelLabel(currentDifficulty)}`
            };
        }

        return {
            typeLabel: t('games_room_mode_community'),
            name: chessCommunityOpponent.name,
            avatar: chessCommunityOpponent.avatar,
            status: t('games_room_available_now')
        };
    }

    function renderChessOpponentPanel() {
        const panel = document.getElementById('chessOpponentPanel');
        if (!panel) return;

        const currentUser = window.currentUserName || localStorage.getItem('userProfileName') || 'Você';
        const currentAvatar = localStorage.getItem('userAvatar') || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80';
        let opponent = getChessOpponentDisplay();
        if (getSelectedGame() === 'tictactoe') {
            const room = readTTTRooms().map(normalizeTTTRoom).find((item) => item.id === readActiveTTTRoom());
            if (!room) {
                opponent = null;
            } else {
                const isBot = room.mode === 'bot';
                const isCreator = String(room.createdBy).toLowerCase() === String(currentUser).toLowerCase();
                opponent = {
                    typeLabel: isBot ? t('games_room_opponent') : t('games_room_online_player'),
                    name: isBot ? `${levelLabel(room.difficulty || room.level)} ${t('games_room_mode_bot')}` : (isCreator ? t('games_room_waiting_player') : room.createdBy),
                    avatar: isBot
                        ? 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=200&q=80'
                        : currentAvatar,
                    status: isBot ? `${t('games_room_level')} ${levelLabel(room.difficulty || room.level)}` : (isCreator ? t('games_room_room_open') : t('games_room_connected_room'))
                };
            }
        }

        panel.innerHTML = `
            <div class="player-badge current-player">
                <img src="${currentAvatar}" alt="${currentUser}">
                <div>
                    <span class="player-label">${t('games_room_current_player')}</span>
                    <strong>${currentUser}</strong>
                </div>
            </div>
            ${opponent ? `<div class="player-badge opponent-player">
                <img src="${opponent.avatar}" alt="${opponent.name}">
                <div>
                    <span class="player-label">${opponent.typeLabel}</span>
                    <strong>${opponent.name}</strong>
                    <small>${opponent.status}</small>
                </div>
            </div>` : ''}
        `;
    }

    function isWhitePiece(piece) {
        return typeof piece === 'string' && piece.length > 0 && piece === piece.toUpperCase();
    }

    function cloneChessState(s) { return JSON.parse(JSON.stringify(s)); }
    function inside(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
    function sameSide(a, b) { return !!a && !!b && isWhitePiece(a) === isWhitePiece(b); }

    function findKing(board, white) {
        const target = white ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === target) return [r, c];
            }
        }
        return null;
    }

    function isSquareAttacked(board, row, col, byWhite) {
        const pawnDirections = byWhite ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
        for (const [dr, dc] of pawnDirections) {
            const r = row + dr;
            const c = col + dc;
            if (inside(r, c) && board[r][c] === (byWhite ? 'P' : 'p')) return true;
        }

        const knightOffsets = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of knightOffsets) {
            const r = row + dr;
            const c = col + dc;
            if (inside(r, c) && board[r][c] === (byWhite ? 'N' : 'n')) return true;
        }

        const kingOffsets = [-1, 0, 1];
        for (const dr of kingOffsets) {
            for (const dc of kingOffsets) {
                if (!dr && !dc) continue;
                const r = row + dr;
                const c = col + dc;
                if (inside(r, c) && board[r][c] === (byWhite ? 'K' : 'k')) return true;
            }
        }

        const slidingDirections = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
        for (const [dr, dc] of slidingDirections) {
            let r = row + dr;
            let c = col + dc;
            while (inside(r, c)) {
                const piece = board[r][c];
                if (piece) {
                    const attackingPiece = byWhite ? 'R' : 'r';
                    const attackingBishop = byWhite ? 'B' : 'b';
                    const attackingQueen = byWhite ? 'Q' : 'q';
                    const sameLine = (dr === 0 || dc === 0);
                    if ((sameLine && (piece === attackingPiece || piece === attackingQueen)) || (!sameLine && (piece === attackingBishop || piece === attackingQueen))) {
                        return true;
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }

        return false;
    }

    function isKingInCheck(board, side) {
        const king = findKing(board, side === 'white');
        if (!king) return false;
        return isSquareAttacked(board, king[0], king[1], side !== 'white');
    }

    function generatePseudoLegalMoves(s, side) {
        const out = [];
        const board = s.board;
        const white = side === 'white';

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece || isWhitePiece(piece) !== white) continue;
                const type = piece.toLowerCase();

                const addMove = (tr, tc, extra = {}) => {
                    if (!inside(tr, tc)) return;
                    const target = board[tr][tc];
                    if (target && sameSide(piece, target)) return;
                    if (target && target.toLowerCase() === 'k') return;
                    out.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc, ...extra });
                };

                if (type === 'p') {
                    const direction = white ? -1 : 1;
                    const oneStepRow = r + direction;
                    if (inside(oneStepRow, c) && !board[oneStepRow][c]) {
                        addMove(oneStepRow, c);
                        const startRow = white ? 6 : 1;
                        const doubleStepRow = r + direction * 2;
                        if (r === startRow && !board[doubleStepRow][c]) {
                            addMove(doubleStepRow, c, { double: true });
                        }
                    }

                    for (const dc of [-1, 1]) {
                        const captureRow = r + direction;
                        const captureCol = c + dc;
                        if (!inside(captureRow, captureCol)) continue;
                        const target = board[captureRow][captureCol];
                        if (target && !sameSide(piece, target)) {
                            addMove(captureRow, captureCol);
                        }
                        if (s.enPassant && s.enPassant[0] === captureRow && s.enPassant[1] === captureCol) {
                            addMove(captureRow, captureCol, { enPassant: true });
                        }
                    }
                }

                if (type === 'n') {
                    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
                        addMove(r + dr, c + dc);
                    }
                }

                if (type === 'b' || type === 'r' || type === 'q') {
                    const directions = type === 'b'
                        ? [[-1, -1], [-1, 1], [1, -1], [1, 1]]
                        : type === 'r'
                            ? [[-1, 0], [1, 0], [0, -1], [0, 1]]
                            : [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]];

                    for (const [dr, dc] of directions) {
                        let tr = r + dr;
                        let tc = c + dc;
                        while (inside(tr, tc)) {
                            const target = board[tr][tc];
                            if (!target) {
                                out.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
                            } else {
                                if (!sameSide(piece, target) && target.toLowerCase() !== 'k') {
                                    out.push({ fromRow: r, fromCol: c, toRow: tr, toCol: tc });
                                }
                                break;
                            }
                            tr += dr;
                            tc += dc;
                        }
                    }
                }

                if (type === 'k') {
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            if (!dr && !dc) continue;
                            addMove(r + dr, c + dc);
                        }
                    }

                    const kingRow = white ? 7 : 0;
                    const kingSideKey = white ? 'K' : 'k';
                    const queenSideKey = white ? 'Q' : 'q';
                    const castlingRights = [
                        { key: kingSideKey, row: kingRow, toCol: 6, rookFrom: 7, rookTo: 5, squares: [5, 6] },
                        { key: queenSideKey, row: kingRow, toCol: 2, rookFrom: 0, rookTo: 3, squares: [1, 2, 3] }
                    ];

                    if (!isKingInCheck(board, side)) {
                        for (const rights of castlingRights) {
                            if (!s.castling?.[rights.key]) continue;
                            const rookCol = rights.rookFrom;
                            const clearSquares = rights.squares.map((col) => board[rights.row][col]);
                            if (board[rights.row][rookCol] !== (white ? 'R' : 'r')) continue;
                            if (clearSquares.some((square) => square !== '')) continue;
                            const kingTarget = rights.toCol;
                            const threatenedSquares = rights.key === 'K' || rights.key === 'k' ? [4, 5, 6] : [4, 3, 2];
                            const isThreatened = threatenedSquares.some((col) => isSquareAttacked(board, rights.row, col, !white));
                            if (isThreatened) continue;
                            out.push({ fromRow: r, fromCol: c, toRow: rights.row, toCol: kingTarget, castle: rights.key });
                        }
                    }
                }
            }
        }

        return out;
    }

    function applyChessMove(s, m, promotion) {
        const n = cloneChessState(s);
        const board = n.board;
        const piece = board[m.fromRow][m.fromCol];
        const white = isWhitePiece(piece);
        const captured = board[m.toRow][m.toCol];

        board[m.toRow][m.toCol] = piece;
        board[m.fromRow][m.fromCol] = '';

        if (m.enPassant) {
            const capturedRow = white ? m.toRow + 1 : m.toRow - 1;
            board[capturedRow][m.toCol] = '';
        }

        if (m.double) {
            n.enPassant = [(m.fromRow + m.toRow) / 2, m.fromCol];
        } else {
            n.enPassant = null;
        }

        if (m.castle) {
            const rookFrom = (m.castle === 'K' || m.castle === 'k') ? 7 : 0;
            const rookTo = (m.castle === 'K' || m.castle === 'k') ? 5 : 3;
            const rookRow = white ? 7 : 0;
            board[rookRow][rookTo] = board[rookRow][rookFrom];
            board[rookRow][rookFrom] = '';
        }

        if (piece.toLowerCase() === 'k') {
            if (white) {
                n.castling.K = false;
                n.castling.Q = false;
            } else {
                n.castling.k = false;
                n.castling.q = false;
            }
        }

        if (piece.toLowerCase() === 'r') {
            if (m.fromRow === 7 && m.fromCol === 0) n.castling.Q = false;
            if (m.fromRow === 7 && m.fromCol === 7) n.castling.K = false;
            if (m.fromRow === 0 && m.fromCol === 0) n.castling.q = false;
            if (m.fromRow === 0 && m.fromCol === 7) n.castling.k = false;
        }

        if (captured && captured.toLowerCase() === 'r') {
            if (m.toRow === 7 && m.toCol === 0) n.castling.Q = false;
            if (m.toRow === 7 && m.toCol === 7) n.castling.K = false;
            if (m.toRow === 0 && m.toCol === 0) n.castling.q = false;
            if (m.toRow === 0 && m.toCol === 7) n.castling.k = false;
        }

        if (piece.toLowerCase() === 'p' && (m.toRow === 0 || m.toRow === 7)) {
            board[m.toRow][m.toCol] = promotion || (white ? 'Q' : 'q');
        }

        n.turn = white ? 'black' : 'white';
        n.lastMove = `${String.fromCharCode(97 + m.fromCol)}${8 - m.fromRow} → ${String.fromCharCode(97 + m.toCol)}${8 - m.toRow}`;
        return n;
    }

    function getLegalChessMoves(s, side) {
        return generatePseudoLegalMoves(s, side).filter((move) => {
            const next = applyChessMove(s, move);
            return !isKingInCheck(next.board, side);
        });
    }

    function getChessStatusText(gameState) {
        const legal = getLegalChessMoves(gameState, gameState.turn);
        if (!legal.length) {
            if (isKingInCheck(gameState.board, gameState.turn)) {
                return gameState.turn === 'white' ? t('games_room_checkmate_black') : t('games_room_checkmate_white');
            }
            return t('games_room_stalemate');
        }
        const checkPrefix = isKingInCheck(gameState.board, gameState.turn) ? `${t('games_room_check')} ` : '';
        const turnText = gameState.turn === 'white' ? t('games_room_turn_white') : t('games_room_turn_black');
        return `${checkPrefix}${turnText} · ${getSelectedChessModeLabel()}`;
    }

    function makeNativeMove(s, fr, fc, tr, tc, promotionOverride = null) {
        const move = getLegalChessMoves(s, s.turn).find((candidate) => candidate.fromRow === fr && candidate.fromCol === fc && candidate.toRow === tr && candidate.toCol === tc);
        if (!move) return false;

        let promotion = promotionOverride;
        if (s.board[fr][fc].toLowerCase() === 'p' && (tr === 0 || tr === 7) && !promotion) {
            return { requiresPromotion: true };
        }

        if (s.board[fr][fc].toLowerCase() === 'p' && (tr === 0 || tr === 7)) {
            if (s.turn === 'black') promotion = promotion.toLowerCase();
        }

        Object.assign(s, applyChessMove(s, move, promotion));
        return true;
    }

    function evaluateChessBoard(board) {
        const values = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
        const centerBonus = [[2, 2], [2, 3], [3, 2], [3, 3]];
        let score = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = board[r][c];
                if (!piece) continue;
                const baseValue = values[piece.toLowerCase()] || 0;
                const centered = centerBonus.some(([cr, cc]) => cr === r && cc === c) ? 12 : 0;
                score += isWhitePiece(piece) ? (baseValue + centered) : -(baseValue + centered);
            }
        }

        if (isKingInCheck(board, 'white')) score -= 30;
        if (isKingInCheck(board, 'black')) score += 30;

        return score;
    }

    function minimaxChess(gameState, depth, maximizing, alpha, beta) {
        const legalMoves = getLegalChessMoves(gameState, maximizing ? 'black' : 'white');
        if (depth === 0 || !legalMoves.length) {
            return evaluateChessBoard(gameState.board);
        }

        if (maximizing) {
            let best = -Infinity;
            for (const move of legalMoves) {
                const next = applyChessMove(gameState, move);
                const score = minimaxChess(next, depth - 1, false, alpha, beta);
                best = Math.max(best, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return best;
        }

        let best = Infinity;
        for (const move of legalMoves) {
            const next = applyChessMove(gameState, move);
            const score = minimaxChess(next, depth - 1, true, alpha, beta);
            best = Math.min(best, score);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return best;
    }

    function evaluateChessBoardFromPerspective(board, side) {
        const score = evaluateChessBoard(board);
        return side === 'black' ? -score : score;
    }

    function getBotMoveForDifficulty(gameState, difficulty) {
        const legalMoves = getLegalChessMoves(gameState, 'black');
        if (!legalMoves.length) return null;

        const difficultyDepthMap = {
            iniciante: 1,
            intermediario: 2,
            avancado: 3,
            mestre: 4
        };

        const depth = difficultyDepthMap[difficulty] || 2;

        function searchMove(state, sideToMove, remainingDepth, alpha, beta) {
            const moves = getLegalChessMoves(state, sideToMove);
            if (!moves.length || remainingDepth === 0) {
                return evaluateChessBoardFromPerspective(state.board, sideToMove);
            }

            if (sideToMove === 'black') {
                let best = -Infinity;
                for (const move of moves) {
                    const nextState = applyChessMove(cloneChessState(state), move);
                    const score = searchMove(nextState, 'white', remainingDepth - 1, alpha, beta);
                    best = Math.max(best, score);
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
                return best;
            }

            let best = Infinity;
            for (const move of moves) {
                const nextState = applyChessMove(cloneChessState(state), move);
                const score = searchMove(nextState, 'black', remainingDepth - 1, alpha, beta);
                best = Math.min(best, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return best;
        }

        let bestMove = legalMoves[0];
        let bestScore = -Infinity;

        for (const move of legalMoves) {
            const nextState = applyChessMove(cloneChessState(gameState), move);
            const score = searchMove(nextState, 'white', depth - 1, -Infinity, Infinity);
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    function triggerBotMoveIfNeeded() {
        const activeRoomId = readActiveChessRoom();
        if (!activeRoomId) return;

        const room = readChessRooms().map(normalizeChessRoom).filter(Boolean).find((item) => item.id === activeRoomId);
        if (!room || room.mode !== 'bot') return;

        const gameState = readChessGameState();
        if (gameState.turn !== 'black' || chessIsSpectator) return;

        window.setTimeout(() => {
            const updatedRoom = readChessRooms().map(normalizeChessRoom).filter(Boolean).find((item) => item.id === activeRoomId);
            if (!updatedRoom || updatedRoom.mode !== 'bot') return;

            const currentGameState = readChessGameState();
            if (currentGameState.turn !== 'black') return;

            const botMove = getBotMoveForDifficulty(currentGameState, updatedRoom.difficulty || updatedRoom.level || 'intermediario');
            if (!botMove) return;

            const botMoveResult = makeNativeMove(currentGameState, botMove.fromRow, botMove.fromCol, botMove.toRow, botMove.toCol, botMove.promotion || null);
            if (botMoveResult && typeof botMoveResult !== 'object') {
                writeChessGameState(currentGameState);
                renderChessBoard();
            }
        }, 350);
    }

    function resetChessGame() {
        chessSelectedSquare = null;
        writeChessGameState(createNativeChessState());
        renderChessBoard();
    }

    function closeGamesModal() {
        closePromotionModal();
        const modal = document.getElementById('gamesModal');
        if (!modal) return;

        if (modal.contains(document.activeElement)) {
            const openButton = document.getElementById('openGamesBtn');
            if (openButton) {
                openButton.focus();
            } else {
                document.activeElement.blur();
            }
        }

        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', 'true');
    }

    function showGamesMenuScreen() {
        const menuScreen = document.getElementById('gamesMenuScreen');
        const chessScreen = document.getElementById('gameShellScreen');
        const impostorPanel = document.getElementById('impostorPanel');
        const hangmanPanel = document.getElementById('hangmanPanel');
        const checkersPanel = document.getElementById('checkersPanel');
        const roulettePanel = document.getElementById('roulettePanel');
        const unoPanel = document.getElementById('unoPanel');
        const bichoPanel = document.getElementById('bichoPanel');
        const chessPanel = document.getElementById('chessPanel');
        const menuCards = document.querySelectorAll('.game-card[data-game]');
        if (menuScreen) menuScreen.hidden = false;
        if (chessScreen) chessScreen.hidden = true;
        if (chessScreen) chessScreen.classList.remove('room-active');
        if (impostorPanel) impostorPanel.hidden = true;
        if (hangmanPanel) hangmanPanel.hidden = true;
        if (checkersPanel) checkersPanel.hidden = true;
        if (roulettePanel) roulettePanel.hidden = true;
        if (unoPanel) {
            unoPanel.hidden = true;
            unoPanel.style.setProperty('display', 'none', 'important');
        }
        if (bichoPanel) {
            bichoPanel.hidden = true;
            bichoPanel.style.setProperty('display', 'none', 'important');
        }
        [chessPanel, impostorPanel, hangmanPanel, checkersPanel, roulettePanel].forEach(panel => panel?.style.removeProperty('display'));
        if (chessPanel) chessPanel.hidden = false;
        document.querySelector('.chess-opponent-panel')?.removeAttribute('hidden');
        document.querySelector('.chess-opponent-panel')?.style.removeProperty('display');
        document.querySelector('.chess-room-creator')?.removeAttribute('hidden');
        document.querySelector('.chess-room-creator')?.style.removeProperty('display');
        document.getElementById('chessRoomList')?.removeAttribute('hidden');
        document.getElementById('tttRoomList')?.removeAttribute('hidden');
        document.querySelector('.game-stage')?.removeAttribute('hidden');
        document.querySelector('.game-stage')?.style.removeProperty('display');
        document.getElementById('chessPanel')?.style.removeProperty('display');
        document.getElementById('chessRoomList')?.style.removeProperty('display');
        document.getElementById('tttRoomList')?.style.removeProperty('display');
        menuCards.forEach((card) => card.classList.remove('active'));
        updateChessRoomVisibility();
    }

    function showChessGameScreen() {
        setSelectedGame('chess');
        const menuScreen = document.getElementById('gamesMenuScreen');
        const chessScreen = document.getElementById('gameShellScreen');
        const title = document.querySelector('.game-shell-title-wrap strong');
        const statusText = document.getElementById('chessStatusText');
        if (title) title.textContent = t('games_room_chess_board');
        if (statusText) statusText.textContent = getDisplayGameStatusLabel();
        if (menuScreen) menuScreen.hidden = true;
        if (chessScreen) chessScreen.hidden = false;
        document.getElementById('impostorPanel')?.setAttribute('hidden', '');
        document.getElementById('hangmanPanel')?.setAttribute('hidden', '');
        document.getElementById('checkersPanel')?.setAttribute('hidden', '');
        document.getElementById('roulettePanel')?.setAttribute('hidden', '');
        document.getElementById('chessPanel')?.removeAttribute('hidden');
        document.querySelector('.chess-room-creator')?.removeAttribute('hidden');
        document.querySelector('.chess-opponent-panel')?.removeAttribute('hidden');
        document.querySelector('.game-stage')?.removeAttribute('hidden');
        document.querySelector('.chess-room-creator')?.style.removeProperty('display');
        document.querySelector('.chess-opponent-panel')?.style.removeProperty('display');
        document.querySelector('.game-stage')?.style.removeProperty('display');
        document.getElementById('chessPanel')?.style.removeProperty('display');
        const chessBoard = document.getElementById('chessBoard');
        const tttBoard = document.getElementById('tttBoard');
        if (chessBoard) {
            chessBoard.hidden = false;
            chessBoard.style.display = '';
        }
        if (tttBoard) {
            tttBoard.hidden = true;
            tttBoard.style.display = 'none';
        }
        const stageTitle = document.querySelector('.game-stage-header strong');
        if (stageTitle) stageTitle.textContent = t('games_room_chess_board');
        updateChessRoomVisibility();
    }

    function showTicTacToeGameScreen() {
        setSelectedGame('tictactoe');
        const menuScreen = document.getElementById('gamesMenuScreen');
        const chessScreen = document.getElementById('gameShellScreen');
        const title = document.querySelector('.game-shell-title-wrap strong');
        const statusText = document.getElementById('chessStatusText');
        if (title) title.textContent = t('games_room_ttt_board');
        if (statusText) statusText.textContent = t('games_room_select_room_prompt');
        if (menuScreen) menuScreen.hidden = true;
        if (chessScreen) chessScreen.hidden = false;
        document.getElementById('impostorPanel')?.setAttribute('hidden', '');
        document.getElementById('hangmanPanel')?.setAttribute('hidden', '');
        document.getElementById('checkersPanel')?.setAttribute('hidden', '');
        document.getElementById('roulettePanel')?.setAttribute('hidden', '');
        document.getElementById('chessPanel')?.removeAttribute('hidden');
        document.querySelector('.chess-room-creator')?.removeAttribute('hidden');
        document.querySelector('.chess-opponent-panel')?.removeAttribute('hidden');
        document.querySelector('.game-stage')?.removeAttribute('hidden');
        document.querySelector('.chess-room-creator')?.style.removeProperty('display');
        document.querySelector('.chess-opponent-panel')?.style.removeProperty('display');
        document.querySelector('.game-stage')?.style.removeProperty('display');
        document.getElementById('chessPanel')?.style.removeProperty('display');
        const chessBoard = document.getElementById('chessBoard');
        const tttBoard = document.getElementById('tttBoard');
        if (chessBoard) {
            chessBoard.hidden = true;
            chessBoard.style.display = 'none';
        }
        if (tttBoard) {
            tttBoard.hidden = false;
            tttBoard.style.display = 'grid';
        }
        const stageTitle = document.querySelector('.game-stage-header strong');
        if (stageTitle) stageTitle.textContent = t('games_room_ttt_board');
        renderChessRoomList();
        updateChessRoomVisibility();
    }

    function openGamesModal() {
        const modal = document.getElementById('gamesModal');
        const promotionModal = document.getElementById('chessPromotionModal');
        if (!modal) return;

        if (promotionModal) {
            promotionModal.hidden = true;
            promotionModal.classList.remove('show');
        }

        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.removeAttribute('inert');
        modal.setAttribute('aria-hidden', 'false');

        const boardEl = document.getElementById('chessBoard');
        const statusEl = document.getElementById('chessStatusText');
        if (boardEl) {
            boardEl.innerHTML = `<div class="empty-state" style="padding:1.5rem;border:none;background:transparent;"><i class="fas fa-spinner fa-spin"></i><p>${t('games_room_loading_chess')}</p></div>`;
        }
        if (statusEl) {
            statusEl.textContent = t('games_room_board_ready');
        }

        showGamesMenuScreen();
        renderChessRoomList();

        if (!localStorage.getItem(getGamesStorageKey())) {
            writeChessGameState(createNativeChessState());
        }

        chessSelectedSquare = null;
        renderChessBoard();
    }

    function renderChessBoard() {
        if (getSelectedGame() === 'tictactoe') {
            renderChessOpponentPanel();
            renderTicTacToeBoard();
            return;
        }

        const boardEl = document.getElementById('chessBoard');
        const statusEl = document.getElementById('chessStatusText');
        if (!boardEl || !statusEl) return;
        const resultEl = document.getElementById('tttResult');
        if (resultEl) resultEl.hidden = true;
        const tttBoard = document.getElementById('tttBoard');
        if (tttBoard) {
            tttBoard.hidden = true;
            tttBoard.style.display = 'none';
        }

        if (!readActiveChessRoom()) {
            boardEl.innerHTML = '';
            boardEl.classList.remove('native-chess-board');
            statusEl.textContent = t('games_room_create_room_prompt');
            syncChessModeButtons('community');
            return;
        }

        const activeRoom = readChessRooms().map(normalizeChessRoom).filter(Boolean).find((item) => item.id === readActiveChessRoom());
        syncChessModeButtons(activeRoom?.mode || getSelectedChessMode());

        renderChessOpponentPanel();

        const gameState = readChessGameState();
        const symbols = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟', K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' };
        const legalMoves = getLegalChessMoves(gameState, gameState.turn);
        boardEl.innerHTML = '';
        boardEl.classList.add('native-chess-board');

        gameState.board.forEach((row, rowIndex) => row.forEach((piece, colIndex) => {
            const square = document.createElement('button');
            square.type = 'button';
            square.className = `native-chess-square ${(rowIndex + colIndex) % 2 ? 'dark' : 'light'}`;
            square.textContent = symbols[piece] || '';
            if (chessSelectedSquare?.row === rowIndex && chessSelectedSquare?.col === colIndex) square.classList.add('selected');
            if (chessSelectedSquare && legalMoves.some(m => m.fromRow === chessSelectedSquare.row && m.fromCol === chessSelectedSquare.col && m.toRow === rowIndex && m.toCol === colIndex)) square.classList.add('legal-target');
            square.setAttribute('aria-label', `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`);
            square.addEventListener('click', async () => {
                if (chessIsSpectator) {
                    return;
                }
                if (chessSelectedSquare) {
                    const selected = chessSelectedSquare;
                    const targetMove = getLegalChessMoves(gameState, gameState.turn).find((candidate) => candidate.fromRow === selected.row && candidate.fromCol === selected.col && candidate.toRow === rowIndex && candidate.toCol === colIndex);
                    chessSelectedSquare = null;

                    if (!targetMove) {
                        renderChessBoard();
                        return;
                    }

                    const isPromotionMove = gameState.board[selected.row][selected.col]?.toLowerCase() === 'p' && (rowIndex === 0 || rowIndex === 7);
                    let chosenPromotion = null;

                    if (isPromotionMove) {
                        chosenPromotion = await choosePromotionPiece();
                        if (!chosenPromotion) {
                            renderChessBoard();
                            return;
                        }
                    }

                    const moved = makeNativeMove(gameState, selected.row, selected.col, rowIndex, colIndex, chosenPromotion);
                    if (moved && typeof moved !== 'object') {
                        writeChessGameState(gameState);
                        renderChessBoard();
                    } else {
                        renderChessBoard();
                    }
                } else if (piece && (gameState.turn === 'white') === isWhitePiece(piece)) {
                    chessSelectedSquare = { row: rowIndex, col: colIndex };
                    renderChessBoard();
                }
            });
            boardEl.appendChild(square);
        }));

        const baseStatus = gameState.lastMove ? `${getChessStatusText(gameState)} · ${gameState.lastMove}` : getChessStatusText(gameState);
        statusEl.textContent = chessIsSpectator ? `${t('games_room_view_mode')} · ${baseStatus}` : baseStatus;

        const scoreUser = getCurrentChessUser();
        const recordedUsers = gameState.resultRecordedUsers || {};
        if (!recordedUsers[scoreUser] && !legalMoves.length && !chessIsSpectator) {
            const result = isKingInCheck(gameState.board, gameState.turn)
                ? (gameState.turn === 'black' ? 'win' : 'loss')
                : 'draw';
            gameState.resultRecordedUsers = { ...recordedUsers, [scoreUser]: true };
            writeChessGameState(gameState);
            recordChessResult(result);
        }

        if (activeRoom?.mode === 'bot' && gameState.turn === 'black' && !chessIsSpectator) {
            triggerBotMoveIfNeeded();
        }
    }

    function getTTTWinningLines() {
        if (window.getTTTWinningLines) return window.getTTTWinningLines();
        return [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
    }

    function getTTTWinner(board) {
        if (window.getTTTWinner) return window.getTTTWinner(board);
        for (const [a, b, c] of getTTTWinningLines()) {
            if (board[a] && board[a] === board[b] && board[b] === board[c]) {
                return board[a];
            }
        }
        return null;
    }

    function getBestTTTMove(board) {
        if (window.getBestTTTMove) return window.getBestTTTMove(board);
        const emptyIndexes = board.map((cell, index) => (cell ? null : index)).filter((value) => value !== null);
        const lines = getTTTWinningLines();

        for (const index of emptyIndexes) {
            const next = [...board];
            next[index] = 'O';
            if (getTTTWinner(next) === 'O') return index;
        }

        for (const index of emptyIndexes) {
            const next = [...board];
            next[index] = 'X';
            if (getTTTWinner(next) === 'X') return index;
        }

        const priority = [4, 0, 2, 6, 8, 1, 3, 5, 7];
        const available = priority.filter((index) => board[index] === '');
        return available[0] ?? emptyIndexes[0] ?? null;
    }

    function triggerTTTBotMoveIfNeeded() {
        if (window.triggerTTTBotMoveIfNeeded) {
            window.triggerTTTBotMoveIfNeeded();
            return;
        }
        const activeRoomId = readActiveTTTRoom();
        if (!activeRoomId) return;
        const room = readTTTRooms().map(normalizeTTTRoom).filter(Boolean).find((item) => item.id === activeRoomId);
        if (!room || room.mode !== 'bot') return;

        const state = readTTTGameState(activeRoomId);
        if (state.turn !== 'O' || state.winner) return;

        window.setTimeout(() => {
            const liveState = readTTTGameState(activeRoomId);
            if (!liveState || liveState.turn !== 'O' || liveState.winner) return;
            const moveIndex = getBestTTTMove(liveState.board);
            if (moveIndex === null) return;

            const nextBoard = [...liveState.board];
            nextBoard[moveIndex] = 'O';
            const nextWinner = getTTTWinner(nextBoard);
            const nextState = {
                ...liveState,
                board: nextBoard,
                winner: nextWinner,
                turn: nextWinner ? liveState.turn : 'X',
                lastMove: t('games_room_bot_marked_house', { house: moveIndex + 1 })
            };
            writeTTTGameState(nextState, activeRoomId);
            renderTicTacToeBoard();
        }, 350);
    }

    function resetTTTGame() {
        if (window.resetTTTGame) {
            window.resetTTTGame();
            return;
        }
        const roomId = readActiveTTTRoom();
        if (!roomId) return;
        writeTTTGameState(createNativeTTTState(), roomId);
        renderTicTacToeBoard();
    }

    function renderTicTacToeBoard() {
        if (window.renderTicTacToeBoard) {
            window.renderTicTacToeBoard();
            return;
        }
        const boardEl = document.getElementById('tttBoard');
        const statusEl = document.getElementById('chessStatusText');
        if (!boardEl || !statusEl) return;

        const activeRoomId = readActiveTTTRoom();
        if (!activeRoomId) {
            boardEl.innerHTML = '';
            boardEl.hidden = false;
            statusEl.textContent = t('games_room_create_room_prompt');
            return;
        }

        const room = readTTTRooms().map(normalizeTTTRoom).filter(Boolean).find((item) => item.id === activeRoomId);
        const state = readTTTGameState(activeRoomId);
        const winner = getTTTWinner(state.board);
        boardEl.innerHTML = '';

        state.board.forEach((cell, index) => {
            const square = document.createElement('button');
            square.type = 'button';
            square.className = 'ttt-cell';
            square.textContent = cell || '';
            square.disabled = !!cell || !!winner || (room?.mode === 'bot' && state.turn === 'O');
            square.setAttribute('aria-label', `Casa ${index + 1}`);
            square.addEventListener('click', () => {
                if (room?.mode === 'bot' && state.turn === 'O') return;
                if (cell || winner) return;

                const nextBoard = [...state.board];
                nextBoard[index] = 'X';
                const nextWinner = getTTTWinner(nextBoard);
                const nextState = {
                    ...state,
                    board: nextBoard,
                    winner: nextWinner,
                    turn: nextWinner ? state.turn : 'O',
                    lastMove: t('games_room_player_marked_house', { house: index + 1 })
                };
                writeTTTGameState(nextState, activeRoomId);
                renderTicTacToeBoard();
            });
            boardEl.appendChild(square);
        });

        if (winner) {
            statusEl.textContent = `${winner === 'X' ? t('games_room_winner_player') : t('games_room_winner_bot')} · ${room?.id || activeRoomId}`;
        } else if (state.board.every(Boolean)) {
            statusEl.textContent = `${t('games_room_draw')} · ${room?.id || activeRoomId}`;
        } else if (room?.mode === 'bot' && state.turn === 'O') {
            statusEl.textContent = `${t('games_room_bot_move')} · ${room.id}`;
            triggerTTTBotMoveIfNeeded();
        } else {
            statusEl.textContent = `${t('games_room_player_move')} · ${room?.id || activeRoomId}`;
        }
    }

    function bindChessEvents() {
        const modal = document.getElementById('gamesModal');
        if (!modal || modal.dataset.chessInitialized === 'true') return;
        modal.dataset.chessInitialized = 'true';

        const openButton = document.getElementById('openGamesBtn');
        if (openButton) {
            openButton.addEventListener('click', openGamesModal);
        }

        modal.querySelectorAll('.game-card[data-game]').forEach(card => {
            card.addEventListener('click', function() {
                document.getElementById('bichoPanel')?.setAttribute('hidden', '');
                document.getElementById('bichoPanel')?.style.setProperty('display', 'none', 'important');
                const selectedGameName = this.dataset.game === 'tictactoe' ? 'tictactoe' : this.dataset.game === 'impostor' ? 'impostor' : this.dataset.game === 'hangman' ? 'hangman' : this.dataset.game === 'checkers' ? 'checkers' : this.dataset.game === 'roulette' ? 'roulette' : this.dataset.game === 'uno' ? 'uno' : this.dataset.game === 'bicho' ? 'bicho' : 'chess';
                setSelectedGame(selectedGameName);
                modal.querySelectorAll('.game-card[data-game]').forEach(item => item.classList.toggle('active', item === this));

                if (selectedGameName === 'impostor') {
                    window.ImpostorGame?.show();
                    return;
                }

                if (selectedGameName === 'hangman') {
                    window.HangmanGame?.show();
                    return;
                }

                if (selectedGameName === 'checkers') {
                    window.CheckersGame?.show();
                    return;
                }

                if (selectedGameName === 'roulette') {
                    window.RouletteGame?.show();
                    return;
                }

                if (selectedGameName === 'uno') {
                    window.UnoGame?.show();
                    return;
                }

                if (selectedGameName === 'bicho') {
                    window.BichoGame?.show();
                    return;
                }

                if (selectedGameName === 'chess') {
                    const activeRoom = readActiveChessRoom();
                    if (activeRoom) {
                        joinChessRoom(activeRoom, chessIsSpectator ? 'view' : 'play');
                    } else {
                        showChessGameScreen();
                        renderChessBoard();
                    }
                    return;
                }

                const activeTTTRoom = readActiveTTTRoom();
                if (activeTTTRoom) {
                    joinTicTacToeRoom(activeTTTRoom, 'play');
                } else {
                    showTicTacToeGameScreen();
                    renderTicTacToeBoard();
                }
            });
        });

        document.getElementById('gameBackBtn')?.addEventListener('click', () => {
            if (getSelectedGame() === 'impostor') {
                showGamesMenuScreen();
                return;
            }
            if (getSelectedGame() === 'hangman') {
                showGamesMenuScreen();
                return;
            }
            if (getSelectedGame() === 'checkers') {
                showGamesMenuScreen();
                return;
            }
            if (getSelectedGame() === 'roulette') {
                showGamesMenuScreen();
                return;
            }
            if (getSelectedGame() === 'uno') {
                showGamesMenuScreen();
                return;
            }
            if (getSelectedGame() === 'bicho') {
                showGamesMenuScreen();
                return;
            }
            if (getSelectedGame() === 'tictactoe') {
                leaveTTTRoom();
                showGamesMenuScreen();
                return;
            }
            leaveChessRoom();
        });

        const roomModeSelect = document.getElementById('chessRoomMode');
        if (roomModeSelect) {
            roomModeSelect.addEventListener('change', () => syncChessModeButtons(roomModeSelect.value));
        }

        const botDifficultySelect = document.getElementById('chessBotDifficulty');
        if (botDifficultySelect) {
            botDifficultySelect.addEventListener('change', () => syncChessModeButtons(getSelectedChessMode()));
        }

        document.getElementById('createChessRoomBtn')?.addEventListener('click', createChessRoom);

        const handleRoomAction = (event) => {
            const button = event.target.closest('[data-room-action]');
            if (!button) return;
            const action = button.dataset.roomAction;
            const roomId = button.dataset.roomId;
            if (!roomId) return;
            if (action === 'join') {
                if (getSelectedGame() === 'tictactoe') {
                    joinTicTacToeRoom(roomId, 'play');
                    return;
                }
                joinChessRoom(roomId, 'play');
            }
            if (action === 'view') {
                if (getSelectedGame() === 'tictactoe') {
                    joinTicTacToeRoom(roomId, 'view');
                    return;
                }
                joinChessRoom(roomId, 'view');
            }
            if (action === 'delete') {
                const deleteRoom = () => deleteChessRoom(roomId);
                if (typeof window.openRoomDeleteDialog === 'function') window.openRoomDeleteDialog(deleteRoom);
                else deleteRoom();
            }
        };
        document.getElementById('chessRoomList')?.addEventListener('click', handleRoomAction);
        document.getElementById('tttRoomList')?.addEventListener('click', handleRoomAction);

        document.getElementById('closeGamesBtn')?.addEventListener('click', closeGamesModal);
        document.getElementById('chessResetBtn')?.addEventListener('click', () => {
            if (getSelectedGame() === 'tictactoe') {
                resetTTTGame();
                return;
            }
            resetChessGame();
        });
        modal.addEventListener('click', function(event) {
            if (event.target === modal) closeGamesModal();
        });

        window.addEventListener('storage', function(event) {
            if (event.key && (event.key.startsWith('comunidade_games_') || event.key.startsWith('comunidade_ttt_'))) {
                renderChessBoard();
            }
            if (event.key === CHESS_ROOMS_KEY || event.key === TTT_ROOMS_KEY) {
                renderChessRoomList();
            }
        });
    }

    function initChessGame() {
        closePromotionModal();
        bindChessEvents();

        window.addEventListener('languageChanged', () => {
            renderChessRoomList();
            renderChessBoard();
            renderTicTacToeBoard();
        });

        if (!localStorage.getItem(getGamesStorageKey())) {
            writeChessGameState(createNativeChessState());
        }

        renderChessRoomList();
        showGamesMenuScreen();
        renderChessBoard();
    }

    window.setSelectedGame = setSelectedGame;
    window.showTicTacToeGameScreen = showTicTacToeGameScreen;
    window.updateChessRoomVisibility = updateChessRoomVisibility;
    window.renderChessRoomList = renderChessRoomList;
    window.renderGameOpponentPanel = renderChessOpponentPanel;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChessGame, { once: true });
    } else {
        initChessGame();
    }
})();
