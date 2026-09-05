(function () {
    'use strict';

    const TTT_ROOMS_KEY = 'ulivre_ttt_rooms';
    const TTT_ACTIVE_ROOM_KEY = 'ulivre_ttt_active_room';
    const TTT_SCORE_KEY = 'ulivre_ttt_scores';

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

    function t(key, replacements = {}) {
        if (typeof window.t === 'function') {
            return window.t(key, replacements);
        }
        return key;
    }

    function getCurrentTTTUser() {
        return (window.currentUserName || localStorage.getItem('userProfileName') || t('games_room_player_label')).trim() || t('games_room_player_label');
    }

    function readTTTScores() {
        try {
            const parsed = JSON.parse(localStorage.getItem(TTT_SCORE_KEY) || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function recordTTTResult(result) {
        const user = getCurrentTTTUser();
        const scores = readTTTScores();
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
        localStorage.setItem(TTT_SCORE_KEY, JSON.stringify(scores));
        window.dispatchEvent(new CustomEvent('tttScoreUpdated', { detail: current }));
    }

    function isCurrentUserRoomCreator(room) {
        if (!room || !room.createdBy) return false;
        return String(room.createdBy).toLowerCase() === String(getCurrentTTTUser()).toLowerCase();
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

    function normalizeTTTRoom(room) {
        if (!room || !room.id) return null;
        const mode = room.mode === 'bot' ? 'bot' : 'community';
        const difficulty = room.difficulty || room.level || 'intermediario';
        return {
            id: room.id,
            gameType: 'tictactoe',
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

    function readTTTRooms() {
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
        localStorage.setItem(TTT_ROOMS_KEY, JSON.stringify(rooms));
    }

    function readActiveTTTRoom() {
        return sessionStorage.getItem(TTT_ACTIVE_ROOM_KEY) || null;
    }

    function persistActiveTTTRoom(roomId) {
        if (roomId) {
            sessionStorage.setItem(TTT_ACTIVE_ROOM_KEY, roomId);
            return;
        }
        sessionStorage.removeItem(TTT_ACTIVE_ROOM_KEY);
    }

    function getTTTStorageKey(roomId = readActiveTTTRoom()) {
        const targetRoom = roomId || 'global';
        return `comunidade_ttt_${getGamesRoomKey()}_${slugify(targetRoom)}`;
    }

    function createNativeTTTState() {
        return {
            board: ['', '', '', '', '', '', '', '', ''],
            turn: 'X',
            winner: null,
            lastMove: t('games_room_new_match'),
            updatedAt: Date.now()
        };
    }

    function readTTTGameState(roomId = readActiveTTTRoom()) {
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
        localStorage.setItem(getTTTStorageKey(roomId), JSON.stringify(gameState));
    }

    function getTTTWinningLines() {
        return [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
    }

    function getTTTWinner(board) {
        for (const [a, b, c] of getTTTWinningLines()) {
            if (board[a] && board[a] === board[b] && board[b] === board[c]) {
                return board[a];
            }
        }
        return null;
    }

    function getBestTTTMove(board) {
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

    function createTTTRoom() {
        const roomMode = document.getElementById('chessRoomMode')?.value || 'community';
        const difficulty = roomMode === 'bot' ? (document.getElementById('chessBotDifficulty')?.value || 'intermediario') : 'intermediario';
        const room = normalizeTTTRoom({
            id: `velha-${new Date().getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            createdBy: getCurrentTTTUser(),
            level: difficulty,
            difficulty,
            gameType: 'tictactoe',
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
        if (typeof window.setSelectedGame === 'function') {
            window.setSelectedGame('tictactoe');
        }
        if (typeof window.showTicTacToeGameScreen === 'function') {
            window.showTicTacToeGameScreen();
        }
        if (typeof window.updateChessRoomVisibility === 'function') {
            window.updateChessRoomVisibility();
        }
        if (typeof window.joinTicTacToeRoom === 'function') {
            window.joinTicTacToeRoom(room.id, 'play');
        }
    }

    function deleteTTTRoom(roomId) {
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
            if (typeof window.setSelectedGame === 'function') {
                window.setSelectedGame('tictactoe');
            }
            if (typeof window.showTicTacToeGameScreen === 'function') {
                window.showTicTacToeGameScreen();
            }
        }

        if (typeof window.updateChessRoomVisibility === 'function') {
            window.updateChessRoomVisibility();
        }
        if (typeof window.renderChessRoomList === 'function') {
            window.renderChessRoomList();
        }
        if (typeof window.renderTicTacToeBoard === 'function') {
            window.renderTicTacToeBoard();
        }
    }

    function joinTicTacToeRoom(roomId, mode) {
        const room = readTTTRooms().map(normalizeTTTRoom).filter(Boolean).find((item) => item.id === roomId);
        if (!room) return;

        if (mode === 'play' && room.mode === 'community' && room.createdBy.toLowerCase() !== getCurrentTTTUser().toLowerCase()) {
            const rooms = readTTTRooms();
            const storedRoom = rooms.find((item) => item.id === roomId);
            if (storedRoom && Number(storedRoom.players || 1) < 2) {
                storedRoom.players = 2;
                writeTTTRooms(rooms);
            }
        }
        persistActiveTTTRoom(roomId);
        if (typeof window.setSelectedGame === 'function') {
            window.setSelectedGame('tictactoe');
        }
        const modal = document.getElementById('gamesModal');
        if (modal) {
            modal.querySelectorAll('.game-card[data-game]').forEach((item) => item.classList.toggle('active', item.dataset.game === 'tictactoe'));
        }
        if (typeof window.showTicTacToeGameScreen === 'function') {
            window.showTicTacToeGameScreen();
        }
        if (typeof window.renderTicTacToeBoard === 'function') {
            window.renderTicTacToeBoard();
        }
        const statusEl = document.getElementById('chessStatusText');
        if (statusEl) {
            statusEl.textContent = `Sala ${room.id} · ${levelLabel(room.level)}`;
        }
    }

    function leaveTTTRoom() {
        persistActiveTTTRoom(null);
        if (typeof window.setSelectedGame === 'function') {
            window.setSelectedGame('tictactoe');
        }
        if (typeof window.showTicTacToeGameScreen === 'function') {
            window.showTicTacToeGameScreen();
        }
        if (typeof window.updateChessRoomVisibility === 'function') {
            window.updateChessRoomVisibility();
        }
        if (typeof window.renderChessRoomList === 'function') {
            window.renderChessRoomList();
        }
    }

    function renderTTTRoomList() {
        const listEl = document.getElementById('tttRoomList');
        if (!listEl) return;

        let rooms = readTTTRooms().map(normalizeTTTRoom).filter(Boolean);
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

    function triggerTTTBotMoveIfNeeded() {
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
            if (typeof window.renderTicTacToeBoard === 'function') {
                window.renderTicTacToeBoard();
            }
        }, 350);
    }

    function resetTTTGame() {
        const roomId = readActiveTTTRoom();
        if (!roomId) return;
        writeTTTGameState(createNativeTTTState(), roomId);
        if (typeof window.renderTicTacToeBoard === 'function') {
            window.renderTicTacToeBoard();
        }
    }

    function renderTicTacToeBoard() {
        const boardEl = document.getElementById('tttBoard');
        const statusEl = document.getElementById('chessStatusText');
        const resultEl = document.getElementById('tttResult');
        if (!boardEl || !statusEl) return;
        const chessBoard = document.getElementById('chessBoard');
        if (chessBoard) {
            chessBoard.hidden = true;
            chessBoard.style.display = 'none';
        }
        boardEl.hidden = false;
        boardEl.style.display = 'grid';
        if (typeof window.renderGameOpponentPanel === 'function') {
            window.renderGameOpponentPanel();
        }

        const activeRoomId = readActiveTTTRoom();
        if (!activeRoomId) {
            boardEl.innerHTML = '';
            boardEl.hidden = false;
            statusEl.textContent = t('games_room_create_room_prompt');
            if (resultEl) resultEl.hidden = true;
            return;
        }

        const room = readTTTRooms().map(normalizeTTTRoom).filter(Boolean).find((item) => item.id === activeRoomId);
        const state = readTTTGameState(activeRoomId);
        const winner = getTTTWinner(state.board);
        const isDraw = !winner && state.board.every(Boolean);
        const currentUser = getCurrentTTTUser();
        const isBot = room?.mode === 'bot';
        const playerX = room?.createdBy || currentUser;
        const playerO = isBot ? `${levelLabel(room.difficulty || room.level)} ${t('games_room_mode_bot')}` : (room?.players > 1 ? t('games_room_online_player') : t('games_room_waiting_player'));
        boardEl.innerHTML = '';

        state.board.forEach((cell, index) => {
            const square = document.createElement('button');
            square.type = 'button';
            square.className = `ttt-cell${cell ? ` ttt-cell-${cell.toLowerCase()}` : ''}`;
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

        if (winner || isDraw) {
            if (!state.resultRecorded) {
                const localResult = isDraw ? 'draw' : (winner === 'X' ? 'win' : 'loss');
                state.resultRecorded = true;
                writeTTTGameState(state, activeRoomId);
                recordTTTResult(localResult);
            }
            const winnerName = winner === 'X' ? playerX : playerO;
            const loserName = winner === 'X' ? playerO : playerX;
            statusEl.textContent = winner
                ? `${t('games_room_game_over')} · ${winnerName} ${t('games_room_won')}`
                : `${t('games_room_game_over')} · ${t('games_room_draw')}`;
            if (resultEl) {
                resultEl.hidden = false;
                resultEl.className = `ttt-result ${winner ? 'is-win' : 'is-draw'}`;
                resultEl.innerHTML = winner
                    ? `<strong>${winnerName} ${t('games_room_win_text')}</strong><span>${t('games_room_final_score', { winnerName, winner, loserName, loserSymbol: winner === 'X' ? 'O' : 'X' })}</span>`
                    : `<strong>${t('games_room_draw')}</strong><span>${t('games_room_draw_result', { playerX, playerO })}</span>`;
            }
        } else if (room?.mode === 'bot' && state.turn === 'O') {
            statusEl.textContent = `${t('games_room_bot_move')} · ${room.id}`;
            if (resultEl) resultEl.hidden = true;
            triggerTTTBotMoveIfNeeded();
        } else {
            statusEl.textContent = `${t('games_room_turn_of')} ${state.turn === 'X' ? playerX : playerO} · ${room?.id || activeRoomId}`;
            if (resultEl) resultEl.hidden = true;
        }
    }

    window.TicTacToeGame = {
        TTT_ROOMS_KEY,
        TTT_ACTIVE_ROOM_KEY,
        TTT_SCORE_KEY,
        getCurrentTTTUser,
        isCurrentUserRoomCreator,
        levelLabel,
        normalizeTTTRoom,
        readTTTRooms,
        writeTTTRooms,
        readActiveTTTRoom,
        persistActiveTTTRoom,
        getTTTStorageKey,
        createNativeTTTState,
        readTTTGameState,
        writeTTTGameState,
        getTTTWinningLines,
        getTTTWinner,
        getBestTTTMove,
        createTTTRoom,
        deleteTTTRoom,
        joinTicTacToeRoom,
        leaveTTTRoom,
        renderTTTRoomList,
        triggerTTTBotMoveIfNeeded,
        resetTTTGame,
        renderTicTacToeBoard
    };

    window.readTTTRooms = readTTTRooms;
    window.writeTTTRooms = writeTTTRooms;
    window.readActiveTTTRoom = readActiveTTTRoom;
    window.persistActiveTTTRoom = persistActiveTTTRoom;
    window.getTTTStorageKey = getTTTStorageKey;
    window.createNativeTTTState = createNativeTTTState;
    window.readTTTGameState = readTTTGameState;
    window.writeTTTGameState = writeTTTGameState;
    window.getTTTWinningLines = getTTTWinningLines;
    window.getTTTWinner = getTTTWinner;
    window.getBestTTTMove = getBestTTTMove;
    window.createTTTRoom = createTTTRoom;
    window.deleteTTTRoom = deleteTTTRoom;
    window.joinTicTacToeRoom = joinTicTacToeRoom;
    window.leaveTTTRoom = leaveTTTRoom;
    window.renderTTTRoomList = renderTTTRoomList;
    window.triggerTTTBotMoveIfNeeded = triggerTTTBotMoveIfNeeded;
    window.resetTTTGame = resetTTTGame;
    window.renderTicTacToeBoard = renderTicTacToeBoard;
})();
