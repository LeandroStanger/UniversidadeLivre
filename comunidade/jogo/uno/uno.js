(function () {
    'use strict';

    const ROOMS_KEY = 'ulivre_uno_rooms';
    const ACTIVE_KEY = 'ulivre_uno_active_room';
    const PLAYER_KEY = 'ulivre_uno_player_id';
    const COLORS = ['red', 'yellow', 'green', 'blue'];
    const CARD_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];
    let activeRoomId = null;
    let state = null;
    let refreshTimer = null;

    const panel = () => document.getElementById('unoPanel');
    const t = (key, fallback) => typeof window.t === 'function' && window.t(key) !== key ? window.t(key) : fallback;
    const playerId = () => {
        let id = sessionStorage.getItem(PLAYER_KEY);
        if (!id) {
            id = `uno-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            sessionStorage.setItem(PLAYER_KEY, id);
        }
        return id;
    };
    const userName = () => localStorage.getItem('userProfileName') || 'Jogador';
    const userAvatar = () => typeof window.getUserAvatar === 'function' ? window.getUserAvatar() : localStorage.getItem('userAvatar');
    const playerAvatar = player => player?.avatar || (player?.id === playerId() ? userAvatar() : '');
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

    function readRooms() {
        try { const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]'); return Array.isArray(rooms) ? rooms.filter(room => window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true) : []; } catch (_) { return []; }
    }

    function writeRooms(rooms) {
        let existing = [];
        try { existing = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]'); } catch (_) {}
        const otherScopes = Array.isArray(existing) ? existing.filter(room => !(window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true)) : [];
        localStorage.setItem(ROOMS_KEY, JSON.stringify([...otherScopes, ...rooms].slice(-30)));
    }

    function getRoom(roomId = activeRoomId) {
        const rooms = readRooms();
        const room = rooms.find(item => item.id === roomId) || null;
        // Corrige salas antigas criadas antes de o jogador humano ser separado do bot.
        if (room?.mode === 'bot' && room.owner === playerId() && room.players[0]?.isBot) {
            room.players[0].isBot = false;
            writeRooms(rooms);
        }
        return room;
    }

    function updateRoom(room) {
        const rooms = readRooms().filter(item => item.id !== room.id);
        rooms.push(room);
        writeRooms(rooms);
        state = room.game || null;
        render();
    }

    function recordUnoResult(result) {
        const key = 'ulivre_uno_scores';
        let scores;
        try { scores = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { scores = {}; }
        const score = scores[userName()] || { points: 0, wins: 0, draws: 0, losses: 0, games: 0 };
        score.games += 1;
        if (result === 'win') { score.wins += 1; score.points += 3; }
        if (result === 'loss') score.losses += 1;
        scores[userName()] = score;
        localStorage.setItem(key, JSON.stringify(scores));
        window.dispatchEvent(new CustomEvent('unoScoreUpdated', { detail: score }));
    }

    function makeDeck() {
        const deck = [];
        COLORS.forEach(color => {
            deck.push({ color, value: '0' });
            CARD_VALUES.slice(1).forEach(value => {
                deck.push({ color, value }, { color, value });
            });
        });
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'wild', value: 'wild' }, { color: 'wild', value: 'draw4' });
        }
        return deck.sort(() => Math.random() - 0.5);
    }

    function newGame(room) {
        const deck = makeDeck();
        const hands = {};
        room.players.forEach(player => { hands[player.id] = deck.splice(0, 7); });
        let discard = deck.shift();
        while (discard.color === 'wild') {
            deck.push(discard);
            discard = deck.shift();
        }
        return {
            deck,
            discard,
            hands,
            currentPlayer: 0,
            direction: 1,
            color: discard.color,
            started: true,
            winner: null,
            message: ''
        };
    }

    function ensureDeck(game) {
        if (game.deck.length) return;
        const current = game.discard;
        game.deck = makeDeck().filter(card => card.color !== 'wild' || card.value === 'wild');
        game.deck = game.deck.sort(() => Math.random() - 0.5);
        game.discard = current;
    }

    function currentPlayer(game, room) {
        return room.players[game.currentPlayer];
    }

    function nextTurn(game, room, steps = 1) {
        game.currentPlayer = (game.currentPlayer + game.direction * steps + room.players.length * 10) % room.players.length;
    }

    function isPlayable(card, game) {
        return card.color === 'wild' || card.color === game.color || card.value === game.discard.value;
    }

    function startRoom(room) {
        room.game = newGame(room);
        updateRoom(room);
        scheduleBot(room);
    }

    function createRoom(mode, difficulty = 'intermediate') {
        if (!['bot', 'community'].includes(mode)) return;
        const room = window.UniversidadeLivreGameScope?.decorateRoom({
            id: `UNO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            owner: playerId(),
            mode,
            difficulty,
            players: [{ id: playerId(), name: userName(), avatar: userAvatar(), isBot: false }],
            game: null,
            createdAt: Date.now()
        });
        if (mode === 'bot') room.players.push({ id: `bot-${room.id}`, name: 'UNO Bot', isBot: true });
        activeRoomId = room.id;
        sessionStorage.setItem(ACTIVE_KEY, activeRoomId);
        writeRooms([...readRooms(), room]);
        window.UniversidadeLivreWallet?.startWager('uno', room.id, 1);
        if (mode === 'bot') startRoom(room); else render();
    }

    function joinRoom(roomId) {
        const room = getRoom(roomId);
        if (!room || room.players.length >= 2) return;
        room.players.push({ id: playerId(), name: userName(), avatar: userAvatar(), isBot: false });
        activeRoomId = room.id;
        sessionStorage.setItem(ACTIVE_KEY, activeRoomId);
        window.UniversidadeLivreWallet?.startWager('uno', room.id, 1);
        startRoom(room);
    }

    function leaveRoom() {
        activeRoomId = null;
        state = null;
        sessionStorage.removeItem(ACTIVE_KEY);
        render();
    }

    function deleteRoom(roomId) {
        const room = getRoom(roomId);
        if (!room || room.owner !== playerId()) return;
        const confirmDelete = () => {
            writeRooms(readRooms().filter(item => item.id !== roomId));
            if (activeRoomId === roomId) leaveRoom();
            else render();
        };
        if (typeof window.openRoomDeleteDialog === 'function') window.openRoomDeleteDialog(confirmDelete);
        else confirmDelete();
    }

    function viewRoom(roomId) {
        const room = getRoom(roomId);
        if (!room?.game) return;
        activeRoomId = roomId;
        sessionStorage.setItem(ACTIVE_KEY, activeRoomId);
        render();
    }

    function drawCard(game, room, player) {
        ensureDeck(game);
        const card = game.deck.pop();
        if (card) game.hands[player.id].push(card);
        return card;
    }

    function playCard(index) {
        const room = getRoom();
        if (!room?.game || room.game.winner) return;
        const game = room.game;
        const player = currentPlayer(game, room);
        if (!player || player.id !== playerId()) return;
        const hand = game.hands[player.id] || [];
        const card = hand[index];
        if (!card || !isPlayable(card, game)) return;
        hand.splice(index, 1);
        game.discard = card;
        game.color = card.color === 'wild' ? game.color : card.color;
        if (!hand.length) {
            game.winner = player.name;
            window.UniversidadeLivreWallet?.settleWager('uno', room.id, player.name, false);
            game.message = `${player.name} venceu!`;
            recordUnoResult('win');
            updateRoom(room);
            return;
        }
        applyCardEffect(card, game, room);
        updateRoom(room);
        scheduleBot(room);
    }

    function applyCardEffect(card, game, room) {
        if (card.value === 'reverse') {
            game.direction *= -1;
            nextTurn(game, room, room.players.length === 2 ? 2 : 1);
        } else if (card.value === 'skip') nextTurn(game, room, 2);
        else if (card.value === 'draw2') {
            nextTurn(game, room);
            drawCard(game, room, currentPlayer(game, room));
            drawCard(game, room, currentPlayer(game, room));
            nextTurn(game, room);
        } else if (card.value === 'draw4') {
            nextTurn(game, room);
            for (let i = 0; i < 4; i++) drawCard(game, room, currentPlayer(game, room));
            nextTurn(game, room);
        } else if (card.value !== 'reverse' && card.value !== 'skip') nextTurn(game, room);
        if (card.value === 'wild' || card.value === 'draw4') game.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    }

    function drawForCurrentPlayer() {
        const room = getRoom();
        if (!room?.game || room.game.winner) return;
        const game = room.game;
        const player = currentPlayer(game, room);
        if (player.id !== playerId()) return;
        const drawn = drawCard(game, room, player);
        if (!drawn || !isPlayable(drawn, game)) nextTurn(game, room);
        updateRoom(room);
        scheduleBot(room);
    }

    function botTurn(room) {
        const game = room.game;
        const player = currentPlayer(game, room);
        if (!player?.isBot || game.winner) return;
        const hand = game.hands[player.id] || [];
        const playableIndexes = hand.map((card, index) => isPlayable(card, game) ? index : -1).filter(index => index >= 0);
        let index = chooseBotCard(hand, playableIndexes, room.difficulty);
        if (index === -1) {
            drawCard(game, room, player);
            index = hand.findIndex(card => isPlayable(card, game));
        }
        if (index >= 0) {
            const card = hand.splice(index, 1)[0];
            game.discard = card;
            if (card.color !== 'wild') game.color = card.color;
            if (!hand.length) {
                game.winner = player.name;
                window.UniversidadeLivreWallet?.settleWager('uno', room.id, player.name, false);
                if (player.isBot) recordUnoResult('loss');
            }
            else applyCardEffect(card, game, room);
        } else nextTurn(game, room);
        updateRoom(room);
        scheduleBot(room);
    }

    function chooseBotCard(hand, playableIndexes, difficulty) {
        if (!playableIndexes.length) return -1;
        if (difficulty === 'beginner') {
            return playableIndexes[Math.floor(Math.random() * playableIndexes.length)];
        }
        if (difficulty === 'advanced' || difficulty === 'master') {
            const actionIndex = playableIndexes.find(index => ['draw2', 'draw4', 'skip', 'reverse'].includes(hand[index].value));
            if (actionIndex !== undefined) return actionIndex;
        }
        if (difficulty === 'master') {
            const wildIndex = playableIndexes.find(index => hand[index].color === 'wild');
            if (wildIndex !== undefined) return wildIndex;
        }
        return playableIndexes[0];
    }

    function scheduleBot(room) {
        clearTimeout(refreshTimer);
        if (room?.game && currentPlayer(room.game, room)?.isBot && !room.game.winner) {
            refreshTimer = setTimeout(() => botTurn(getRoom(room.id)), 700);
        }
    }

    function cardLabel(card) {
        const labels = {
            skip: t('uno_card_skip', 'Pular'),
            reverse: t('uno_card_reverse', 'Inverter'),
            draw2: '+2',
            wild: t('uno_card_wild', 'Coringa'),
            draw4: '+4'
        };
        return labels[card.value] || card.value;
    }

    function renderCard(card, index, playable) {
        return `<button class="uno-card uno-card-${card.color} ${playable ? 'is-playable' : ''}" data-card-index="${index}" type="button" ${playable ? '' : 'disabled'}><span>${escapeHtml(cardLabel(card))}</span></button>`;
    }

    function renderPlayerCard(player, room, isActive, isCurrentUser) {
        const avatar = playerAvatar(player);
        const handCount = room.game?.hands?.[player.id]?.length || 0;
        const role = player.isBot ? t('uno_bot_label', 'Bot') : isCurrentUser ? t('uno_you', 'Você') : t('uno_player', 'Jogador');
        const avatarContent = avatar
            ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(player.name)}" />`
            : `<i class="fas ${player.isBot ? 'fa-robot' : 'fa-user'}"></i>`;
        return `<div class="uno-player-card ${isActive ? 'is-active' : ''} ${isCurrentUser ? 'is-current-user' : ''}"><div class="uno-avatar">${avatarContent}</div><div class="uno-player-info"><strong>${escapeHtml(player.name)}</strong><span>${role}</span>${isActive ? `<em><i class="fas fa-circle"></i> ${t('uno_playing_now', 'Jogando agora')}</em>` : ''}</div><b class="uno-player-count">${handCount}<small>${t('uno_cards', 'cartas')}</small></b></div>`;
    }

    function renderLobby() {
        const rooms = readRooms().filter(room => ['community', 'bot'].includes(room.mode));
        const roomCards = rooms.map(room => {
            const owner = room.owner === playerId();
            const isWaiting = room.mode === 'community' && !room.game && room.players.length < 2;
            const status = room.game
                ? t('uno_match_running', 'Partida em andamento')
                : t('uno_waiting', 'Aguardando colega');
            const actions = [
                room.game ? `<button class="btn-secondary" data-uno-view="${escapeHtml(room.id)}" type="button">${t('uno_view', 'Visualizar')}</button>` : '',
                isWaiting ? `<button class="btn-secondary" data-uno-join="${escapeHtml(room.id)}" type="button">${t('uno_join', 'Entrar')}</button>` : '',
                owner ? `<button class="btn-danger" data-uno-delete="${escapeHtml(room.id)}" type="button"><i class="fas fa-trash"></i> ${t('uno_delete', 'Apagar')}</button>` : ''
            ].join('');
            return `<div class="uno-room"><span><strong>${escapeHtml(room.id)}</strong><small>${room.mode === 'bot' ? t('uno_room_bot', 'Sala com bot') : t('uno_room_community', 'Sala com colegas')} · ${escapeHtml(room.players[0]?.name || 'Jogador')} · ${status}</small></span><div class="uno-room-actions">${actions || `<small>${t('uno_finished', 'Finalizada')}</small>`}</div></div>`;
        }).join('');
        return `<div class="uno-lobby"><div class="uno-intro"><span class="uno-logo">UNO</span><div><h3>${t('uno_title', 'UNO')}</h3><p>${t('uno_subtitle', 'Jogue contra um bot ou encontre um colega da comunidade.')}</p></div></div><div class="uno-create-box"><h4>${t('uno_create_title', 'Criar partida')}</h4><div class="uno-create-row"><label for="unoRoomMode">${t('uno_room_type', 'Tipo de sala')}</label><select id="unoRoomMode"><option value="community">${t('uno_room_community', 'Sala com colegas')}</option><option value="bot">${t('uno_room_bot', 'Sala com bot')}</option></select><span id="unoDifficultyField" hidden><label for="unoBotDifficulty">${t('uno_difficulty', 'Dificuldade do bot')}</label><select id="unoBotDifficulty"><option value="beginner">${t('uno_level_beginner', 'Iniciante')}</option><option value="intermediate" selected>${t('uno_level_intermediate', 'Intermediário')}</option><option value="advanced">${t('uno_level_advanced', 'Avançado')}</option><option value="master">${t('uno_level_master', 'Mestre')}</option></select></span><button class="btn-primary" data-uno-create type="button"><i class="fas fa-plus"></i> ${t('uno_create_room_action', 'Criar sala')}</button></div></div><section class="uno-open-rooms"><div class="uno-section-heading"><h4>${t('uno_open_rooms', 'Salas abertas')}</h4><span>${rooms.length}</span></div><div class="uno-room-list">${rooms.length ? roomCards : `<p class="uno-muted">${t('uno_no_rooms', 'Nenhuma sala criada no momento.')}</p>`}</div></section></div>`;
    }

    function renderGame(room) {
        const game = room.game;
        const me = room.players.find(player => player.id === playerId()) || room.players[0];
        const spectator = !room.players.some(player => player.id === playerId());
        const hand = spectator ? [] : game.hands[me.id] || [];
        const opponent = room.players.find(player => player.id !== me.id);
        const activePlayer = currentPlayer(game, room);
        const isMyTurn = !spectator && activePlayer?.id === me.id;
        const tableMessage = game.winner
            ? `${escapeHtml(game.winner)} ${t('uno_wins', 'venceu!')}`
            : spectator
                ? `${escapeHtml(activePlayer?.name || '')} ${t('uno_turn', 'está jogando')}`
                : isMyTurn
                    ? t('uno_your_turn', 'Sua vez')
                    : `${escapeHtml(activePlayer?.name || '')} ${t('uno_turn', 'está jogando')}`;
        return `<div class="uno-game"><div class="uno-game-top"><div class="uno-room-heading"><span class="uno-logo small">UNO</span><div><strong>${escapeHtml(room.id)}</strong><small>${room.mode === 'bot' ? `${t('uno_room_bot', 'Sala com bot')} · ${escapeHtml(room.difficulty || 'intermediate')}` : t('uno_room_community', 'Sala com colegas')}</small></div></div><button class="btn-secondary" data-uno-leave type="button"><i class="fas fa-arrow-left"></i> ${t('uno_leave', 'Voltar')}</button></div>${spectator ? `<div class="uno-spectator"><i class="fas fa-eye"></i> ${t('uno_spectator', 'Você está visualizando esta partida.')}</div>` : ''}<div class="uno-player-strip">${room.players.map(player => renderPlayerCard(player, room, activePlayer?.id === player.id, player.id === playerId())).join('')}</div><div class="uno-table"><div class="uno-deck-back">UNO</div><button class="uno-discard uno-card uno-card-${game.discard.color}" type="button" disabled><span>${escapeHtml(cardLabel(game.discard))}</span></button><span class="uno-current-color">${t('uno_color', 'Cor')} <b class="uno-dot uno-dot-${game.color}"></b></span></div><div class="uno-status ${isMyTurn ? 'your-turn' : ''}">${tableMessage}</div>${spectator ? '' : `<div class="uno-hand-label"><span>${escapeHtml(me.name)}</span><small>${hand.length} ${t('uno_cards', 'cartas')}</small></div><div class="uno-hand">${hand.map((card, index) => renderCard(card, index, isMyTurn && isPlayable(card, game))).join('')}</div><div class="uno-controls"><button class="btn-primary" data-uno-draw type="button" ${!isMyTurn || game.winner ? 'disabled' : ''}><i class="fas fa-plus"></i> ${t('uno_draw', 'Comprar carta')}</button><span>${game.message ? escapeHtml(game.message) : t('uno_rule_hint', 'Jogue uma carta da mesma cor ou valor.')}</span></div>`}</div>`;
    }

    function render() {
        const target = panel();
        if (!target) return;
        const room = getRoom();
        target.hidden = false;
        target.innerHTML = room?.game ? renderGame(room) : renderLobby();
        target.querySelectorAll('[data-uno-create]').forEach(button => button.addEventListener('click', () => createRoom(target.querySelector('#unoRoomMode')?.value || 'community', target.querySelector('#unoBotDifficulty')?.value || 'intermediate')));
        target.querySelectorAll('[data-uno-join]').forEach(button => button.addEventListener('click', () => joinRoom(button.dataset.unoJoin)));
        target.querySelectorAll('[data-uno-view]').forEach(button => button.addEventListener('click', () => viewRoom(button.dataset.unoView)));
        target.querySelectorAll('[data-uno-delete]').forEach(button => button.addEventListener('click', () => deleteRoom(button.dataset.unoDelete)));
        target.querySelectorAll('[data-card-index]').forEach(button => button.addEventListener('click', () => playCard(Number(button.dataset.cardIndex))));
        target.querySelector('[data-uno-draw]')?.addEventListener('click', drawForCurrentPlayer);
        target.querySelector('[data-uno-leave]')?.addEventListener('click', leaveRoom);
        target.querySelector('#unoRoomMode')?.addEventListener('change', event => {
            const difficultyField = target.querySelector('#unoDifficultyField');
            if (difficultyField) difficultyField.hidden = event.target.value !== 'bot';
        });
        scheduleBot(room);
    }

    function show() {
        document.getElementById('gamesMenuScreen')?.setAttribute('hidden', '');
        document.getElementById('gameShellScreen')?.removeAttribute('hidden');
        document.getElementById('gameShellScreen')?.classList.add('room-active');
        ['chessPanel', 'impostorPanel', 'hangmanPanel', 'checkersPanel', 'roulettePanel'].forEach(id => {
            const element = document.getElementById(id);
            element?.setAttribute('hidden', '');
            if (element) element.style.setProperty('display', 'none', 'important');
        });
        ['.chess-opponent-panel', '.chess-room-creator', '#chessRoomList', '#tttRoomList'].forEach(selector => {
            const element = document.querySelector(selector);
            element?.setAttribute('hidden', '');
            if (element) element.style.setProperty('display', 'none', 'important');
        });
        const uno = panel();
        if (uno) uno.style.setProperty('display', 'block', 'important');
        const title = document.querySelector('.game-shell-title-wrap strong');
        const status = document.getElementById('chessStatusText');
        if (title) title.textContent = t('uno_title', 'UNO');
        if (status) status.textContent = t('uno_status', 'Jogue com um bot ou com um colega da comunidade.');
        activeRoomId = sessionStorage.getItem(ACTIVE_KEY) || null;
        render();
    }

    window.addEventListener('storage', event => {
        if (event.key === ROOMS_KEY && !panel()?.hidden) render();
    });
    window.addEventListener('languageChanged', () => { if (!panel()?.hidden) render(); });
    window.UnoGame = { show };
}());
