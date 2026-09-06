(function () {
    'use strict';

    const ROOMS_KEY = 'ulivre_slots_rooms';
    const WALLET_KEY = 'ulivre_slots_wallets';
    const STARTING_COINS = 250;
    const MAX_BET = 250;
    const SYMBOLS = ['🍒', '🍋', '🔔', '⭐', '7️⃣'];
    const PAYOUTS = { '🍒🍒🍒': 5, '🍋🍋🍋': 8, '🔔🔔🔔': 12, '⭐⭐⭐': 20, '7️⃣7️⃣7️⃣': 40 };
    const DIFFICULTIES = ['iniciante', 'intermediario', 'avancado', 'mestre'];
    let activeRoomId = null;
    let game = null;
    let spinTimer = null;

    const panel = () => document.getElementById('slotsPanel');
    const tx = (key, fallback, replacements = {}) => {
        const value = typeof window.t === 'function' ? window.t(key, replacements) : key;
        return value === key ? fallback : value;
    };
    const userName = () => (localStorage.getItem('userProfileName') || tx('games_room_player_label', 'Jogador')).trim();
    const playerId = () => {
        let id = sessionStorage.getItem('ulivre_slots_player_id');
        if (!id) { id = `slots-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; sessionStorage.setItem('ulivre_slots_player_id', id); }
        return id;
    };
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
    const readRooms = () => { try { const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]'); return Array.isArray(rooms) ? rooms.filter(room => window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true) : []; } catch (_) { return []; } };
    function writeRooms(rooms) { let existing = []; try { existing = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]'); } catch (_) {} const otherScopes = Array.isArray(existing) ? existing.filter(room => !(window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true)) : []; localStorage.setItem(ROOMS_KEY, JSON.stringify([...otherScopes, ...rooms].slice(-20))); }
    const getRoom = (id = activeRoomId) => readRooms().find(room => room.id === id) || null;
    function wallet() { if (window.UniversidadeLivreWallet) return window.UniversidadeLivreWallet.get(); let wallets = {}; try { wallets = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}'); } catch (_) {} if (!wallets[userName()]) wallets[userName()] = { coins: STARTING_COINS, karma: 0, spins: 0, wins: 0 }; return wallets[userName()]; }
    function saveWallet(value) { if (window.UniversidadeLivreWallet) { window.UniversidadeLivreWallet.update(value); return; } let wallets = {}; try { wallets = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}'); } catch (_) {} wallets[userName()] = { ...value, coins: Math.max(0, Math.floor(value.coins)), karma: Math.max(0, Math.floor(value.karma)) }; localStorage.setItem(WALLET_KEY, JSON.stringify(wallets)); window.dispatchEvent(new CustomEvent('slotsScoreUpdated', { detail: wallets[userName()] })); }
    const randomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const resultKey = reels => reels.join('');
    function createRoom() { const target = panel(); const mode = target.querySelector('#slotsMode')?.value || 'community'; const difficulty = target.querySelector('#slotsDifficulty')?.value || 'intermediario'; const room = window.UniversidadeLivreGameScope?.decorateRoom({ id: `SLT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, owner: playerId(), mode, difficulty, players: [{ id: playerId(), name: userName() }], capacity: 2, createdAt: Date.now() }); if (mode === 'bot') room.players.push({ id: `bot-${room.id}`, name: 'Bot', isBot: true }); activeRoomId = room.id; sessionStorage.setItem('ulivre_slots_active_room', activeRoomId); writeRooms([...readRooms(), room]); startRoom(room); }
    function joinRoom(id) { const room = getRoom(id); if (!room || room.mode === 'bot' || room.players.length >= room.capacity) return; room.players.push({ id: playerId(), name: userName() }); activeRoomId = id; sessionStorage.setItem('ulivre_slots_active_room', id); writeRooms(readRooms().map(item => item.id === id ? room : item)); startRoom(room); }
    function deleteRoom(id) { const room = getRoom(id); if (!room || room.owner !== playerId()) return; const remove = () => { writeRooms(readRooms().filter(item => item.id !== id)); if (activeRoomId === id) { activeRoomId = null; game = null; sessionStorage.removeItem('ulivre_slots_active_room'); } renderLobby(); }; if (window.openRoomDeleteDialog) window.openRoomDeleteDialog(remove); else remove(); }
    function startRoom(room) { game = { room, reels: ['❔', '❔', '❔'], spinning: false, lastWin: false, lastDelta: 0, resultText: '', history: [] }; renderGame(); }
    function botReels() { const difficulty = DIFFICULTIES.includes(game?.room?.difficulty) ? game.room.difficulty : 'intermediario'; const chance = { iniciante: .08, intermediario: .14, avancado: .22, mestre: .32 }[difficulty]; if (Math.random() < chance) { const symbol = randomSymbol(); return [symbol, symbol, symbol]; } return [randomSymbol(), randomSymbol(), randomSymbol()]; }
    function spin() { if (!game || game.spinning) return; const amount = Math.floor(Number(panel().querySelector('#slotsAmount')?.value)); const balance = wallet(); if (!Number.isFinite(amount) || amount < 1 || amount > MAX_BET || amount > balance.coins) { game.resultText = tx('slots_invalid_bet', 'Escolha uma aposta entre 1 e 250 moedas, dentro do seu saldo.'); renderGame(); return; } game.spinning = true; game.resultText = tx('slots_spinning', 'Girando...'); saveWallet({ ...balance, coins: balance.coins - amount, spins: balance.spins + 1 }); renderGame(); spinTimer = setTimeout(() => { const reels = game.room.mode === 'bot' ? botReels() : [randomSymbol(), randomSymbol(), randomSymbol()]; const key = resultKey(reels); const multiplier = PAYOUTS[key] || 0; const won = multiplier > 0; const prize = won ? amount * multiplier : 0; const karmaGain = won ? Math.max(2, Math.floor(prize / 10)) : 1; const updated = wallet(); updated.coins += prize; updated.karma += karmaGain; updated.wins += won ? 1 : 0; saveWallet(updated); game.reels = reels; game.spinning = false; game.lastWin = won; game.lastDelta = won ? prize : -amount; game.resultText = won ? `${tx('slots_win', 'Prêmio!')} +${prize} ${tx('slots_coins', 'moedas')} · +${karmaGain} ${tx('slots_karma', 'carma')}` : `${tx('slots_loss', 'Não foi dessa vez.')} +${karmaGain} ${tx('slots_karma', 'carma')}`; game.history.unshift({ reels, delta: game.lastDelta, won }); game.history = game.history.slice(0, 8); renderGame(); }, 850); }
    function renderLobby() { const target = panel(); const rooms = readRooms(); const balance = wallet(); target.innerHTML = `<div class="slots-card"><div class="slots-header"><div><h4>${tx('slots_title', 'Caça-Níqueis')}</h4><p>${tx('slots_subtitle', 'Gire, aposte moedas virtuais e acumule carma.')}</p></div><div class="slots-balance"><span>${tx('slots_coins', 'moedas')}: <strong>${balance.coins}</strong></span><span>${tx('slots_karma', 'carma')}: <strong>${balance.karma}</strong></span></div></div><div class="slots-create"><label class="slots-field">${tx('slots_play_with', 'Jogar com')}<select id="slotsMode" class="slots-select"><option value="bot">${tx('slots_bot', 'Bot')}</option><option value="community">${tx('slots_community', 'Comunidade')}</option></select></label><label class="slots-field">${tx('slots_difficulty', 'Nível do bot')}<select id="slotsDifficulty" class="slots-select"><option value="iniciante">${tx('games_room_level_beginner', 'Iniciante')}</option><option value="intermediario" selected>${tx('games_room_level_intermediate', 'Intermediário')}</option><option value="avancado">${tx('games_room_level_advanced', 'Avançado')}</option><option value="mestre">${tx('games_room_level_master', 'Mestre')}</option></select></label><button class="slots-primary" id="slotsCreate" type="button"><i class="fas fa-plus"></i> ${tx('slots_create_room', 'Criar sala')}</button></div><div class="slots-room-list"><h5>${tx('slots_open_rooms', 'Salas disponíveis')}</h5>${rooms.length ? rooms.map(room => `<div class="slots-room"><div class="slots-room-meta"><strong>${escapeHtml(room.id)}</strong><span class="slots-muted">${room.mode === 'bot' ? tx('slots_bot', 'Bot') : tx('slots_community', 'Comunidade')} · ${room.players.length}/${room.capacity}</span></div><div class="slots-room-actions">${room.mode === 'community' && room.players.length < room.capacity ? `<button class="slots-secondary slots-join" data-room="${escapeHtml(room.id)}" type="button">${tx('slots_join', 'Entrar')}</button>` : ''}<button class="slots-secondary slots-view" data-room="${escapeHtml(room.id)}" type="button">${tx('slots_view', 'Visualizar')}</button></div></div>`).join('') : `<p class="slots-muted">${tx('slots_no_rooms', 'Nenhuma sala aberta ainda.')}</p>`}</div></div>`; target.querySelector('#slotsMode').addEventListener('change', event => { target.querySelector('#slotsDifficulty').disabled = event.target.value !== 'bot'; }); target.querySelector('#slotsDifficulty').disabled = false; target.querySelector('#slotsCreate').addEventListener('click', createRoom); target.querySelectorAll('.slots-join').forEach(button => button.addEventListener('click', () => joinRoom(button.dataset.room))); target.querySelectorAll('.slots-view').forEach(button => button.addEventListener('click', () => { const room = getRoom(button.dataset.room); if (room) startRoom(room); })); }
    function renderGame() { const target = panel(); const balance = wallet(); const history = game.history.length ? game.history.map(item => `<span><b>${item.reels.join(' ')}</b><em>${item.won ? '+' : ''}${item.delta} ${tx('slots_coins', 'moedas')}</em></span>`).join('') : `<span>${tx('slots_no_history', 'Nenhuma rodada ainda.')}</span>`; target.innerHTML = `<div class="slots-card"><div class="slots-header"><div><h4>${tx('slots_room', 'Sala')} ${escapeHtml(game.room.id)}</h4><p>${game.room.mode === 'bot' ? `${tx('slots_bot', 'Bot')} · ${escapeHtml(game.room.difficulty)}` : tx('slots_community', 'Comunidade')} · ${game.room.players.length}/2</p></div><button class="slots-secondary" id="slotsBack" type="button">${tx('slots_back', 'Voltar')}</button></div><div class="slots-balance"><span>${tx('slots_coins', 'moedas')}: <strong>${balance.coins}</strong></span><span>${tx('slots_karma', 'carma')}: <strong>${balance.karma}</strong></span><span>${tx('slots_spins', 'giros')}: <strong>${balance.spins}</strong></span></div><div class="slots-machine"><div class="slots-reels ${game.spinning ? 'is-spinning' : ''}">${game.reels.map(symbol => `<span class="slots-reel">${symbol}</span>`).join('')}</div><div class="slots-result ${game.lastWin ? 'is-win' : game.lastDelta < 0 ? 'is-loss' : ''}" aria-live="polite">${escapeHtml(game.resultText)}</div><div class="slots-bet"><label class="slots-field">${tx('slots_bet', 'Aposta')}<input id="slotsAmount" class="slots-input" type="number" min="1" max="250" value="10"></label><button id="slotsSpin" class="slots-primary" type="button" ${game.spinning ? 'disabled' : ''}><i class="fas fa-play"></i> ${tx('slots_spin', 'Girar')}</button></div><small class="slots-muted">${tx('slots_rules', 'Três símbolos iguais pagam conforme a combinação. Moedas virtuais sem valor real.')}</small></div><div class="slots-history">${history}</div></div>`; target.querySelector('#slotsBack').addEventListener('click', () => { clearTimeout(spinTimer); game = null; activeRoomId = null; sessionStorage.removeItem('ulivre_slots_active_room'); renderLobby(); }); target.querySelector('#slotsSpin').addEventListener('click', spin); }
    function syncRoomActions() {
        panel()?.querySelectorAll('.slots-room').forEach(roomElement => {
            const roomId = roomElement.querySelector('[data-room]')?.dataset.room;
            const room = getRoom(roomId);
            const actions = roomElement.querySelector('.slots-room-actions');
            if (!room || !actions) return;
            if (room.mode === 'community' && room.players.length < room.capacity && !actions.querySelector('.slots-join')) {
                const join = document.createElement('button');
                join.className = 'slots-secondary slots-join';
                join.dataset.room = room.id;
                join.type = 'button';
                join.textContent = tx('slots_join', 'Entrar');
                actions.prepend(join);
            }
            if (room.owner === playerId() && !actions.querySelector('.slots-delete')) {
                const remove = document.createElement('button');
                remove.className = 'slots-danger slots-delete';
                remove.dataset.room = room.id;
                remove.type = 'button';
                remove.innerHTML = `<i class="fas fa-trash"></i> ${tx('slots_delete', 'Apagar')}`;
                actions.appendChild(remove);
            }
        });
    }

    panel()?.addEventListener('click', event => {
        const remove = event.target.closest('.slots-delete');
        if (remove) deleteRoom(remove.dataset.room);
    });
    if (panel()) new MutationObserver(syncRoomActions).observe(panel(), { childList: true, subtree: true });

    function show() { document.getElementById('gamesMenuScreen')?.setAttribute('hidden', ''); document.getElementById('gameShellScreen')?.removeAttribute('hidden'); ['chessPanel', 'impostorPanel', 'hangmanPanel', 'checkersPanel', 'roulettePanel', 'unoPanel', 'bichoPanel'].forEach(id => { const element = document.getElementById(id); element?.setAttribute('hidden', ''); if (element) element.style.setProperty('display', 'none', 'important'); }); document.querySelectorAll('.chess-room-creator, .chess-opponent-panel, #chessRoomList, #tttRoomList, .game-stage').forEach(element => { element.hidden = true; element.style.display = 'none'; }); const target = panel(); if (!target) return; target.hidden = false; target.style.setProperty('display', 'block', 'important'); document.querySelector('.game-shell-title-wrap strong').textContent = tx('slots_title', 'Caça-Níqueis'); document.getElementById('chessStatusText').textContent = tx('slots_status', 'Gire com o bot ou com a comunidade.'); activeRoomId = sessionStorage.getItem('ulivre_slots_active_room') || null; const room = getRoom(); if (room) startRoom(room); else renderLobby(); }
    window.addEventListener('storage', event => { if (event.key === ROOMS_KEY || event.key === WALLET_KEY) { const room = getRoom(); if (room && game) { game.room = room; renderGame(); } else if (!panel()?.hidden) renderLobby(); } });
    window.addEventListener('languageChanged', () => { if (!panel()?.hidden) { const room = getRoom(); if (room && game) renderGame(); else renderLobby(); } });
    window.SlotsGame = { show };
}());
