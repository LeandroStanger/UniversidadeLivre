(function () {
    'use strict';

    const ROOMS_KEY = 'ulivre_bitcoin_rooms';
    const GAME_ID = 'bitcoin';
    const DURATIONS = [5, 10, 15, 20, 25, 30, 35, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300];
    let activeRoomId = null;
    let game = null;
    let priceTimer = null;
    let countdownTimer = null;

    const panel = () => document.getElementById('bitcoinPanel');
    const tx = (key, fallback, replacements = {}) => {
        const value = typeof window.t === 'function' ? window.t(key, replacements) : key;
        return value === key ? fallback : value;
    };
    const name = () => (localStorage.getItem('userProfileName') || tx('games_room_player_label', 'Jogador')).trim();
    const id = () => {
        let value = sessionStorage.getItem('ulivre_bitcoin_player_id');
        if (!value) {
            value = `btc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            sessionStorage.setItem('ulivre_bitcoin_player_id', value);
        }
        return value;
    };
    const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
    const readRooms = () => {
        try {
            const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]');
            return Array.isArray(rooms) ? rooms.filter(room => window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true) : [];
        } catch (_) { return []; }
    };
    function writeRooms(rooms) {
        let all = [];
        try { all = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]'); } catch (_) {}
        const other = Array.isArray(all) ? all.filter(room => !(window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true)) : [];
        localStorage.setItem(ROOMS_KEY, JSON.stringify([...other, ...rooms].slice(-20)));
    }
    const getRoom = (roomId = activeRoomId) => readRooms().find(room => room.id === roomId) || null;
    const wallet = () => window.UniversidadeLivreWallet?.get() || { coins: 0, wins: 0, games: 0 };
    const saveWallet = value => window.UniversidadeLivreWallet?.update(value);
    const getCurrency = () => {
        const language = localStorage.getItem('selectedLanguage') || document.documentElement.lang || 'pt-BR';
        return language.toLowerCase().startsWith('en') ? 'usd' : 'brl';
    };
    const currencyConfig = currency => currency === 'usd'
        ? { locale: 'en-US', currency: 'USD' }
        : { locale: 'pt-BR', currency: 'BRL' };
    const formatPrice = (value, currency = getCurrency()) => {
        const config = currencyConfig(currency);
        return Number(value).toLocaleString(config.locale, {
            style: 'currency',
            currency: config.currency,
            maximumFractionDigits: 2
        });
    };
    const durationLabel = minutes => ({
        60: tx('bitcoin_hour', '1 hora'),
        90: tx('bitcoin_hour_half', '1 hora e meia'),
        120: tx('bitcoin_hours', '2 horas', { count: 2 }),
        150: tx('bitcoin_hours_half', '2 horas e meia', { count: 2 }),
        180: tx('bitcoin_hours', '3 horas', { count: 3 }),
        210: tx('bitcoin_hours_half', '3 horas e meia', { count: 3 }),
        240: tx('bitcoin_hours', '4 horas', { count: 4 }),
        270: tx('bitcoin_hours_half', '4 horas e meia', { count: 4 }),
        300: tx('bitcoin_hours', '5 horas', { count: 5 })
    }[minutes] || tx('bitcoin_minutes', `${minutes} minutos`, { count: minutes }));
    const durationOptions = selected => DURATIONS
        .map(minutes => `<option value="${minutes}" ${minutes === selected ? 'selected' : ''}>${durationLabel(minutes)}</option>`)
        .join('');
    const remainingMs = bet => Math.max(0, bet.startedAt + bet.duration * 60 * 1000 - Date.now());
    const formatCountdown = milliseconds => {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };
    function updateCountdown() {
        const output = panel()?.querySelector('#bitcoinCountdown');
        const bet = getRoom()?.bet?.[id()];
        if (!output || !bet || bet.resolved) return;
        output.textContent = formatCountdown(remainingMs(bet));
    }

    async function fetchPrice(currency = getCurrency()) {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('Cotação indisponível');
        const data = await response.json();
        const price = Number(data?.bitcoin?.[currency]);
        if (!Number.isFinite(price) || price <= 0) throw new Error('Cotação inválida');
        return price;
    }
    function createRoom() {
        const target = panel();
        const mode = target.querySelector('#bitcoinRoomMode')?.value === 'individual' ? 'individual' : 'community';
        const room = window.UniversidadeLivreGameScope?.decorateRoom({
            id: `BTC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
            owner: id(), mode, capacity: mode === 'individual' ? 1 : 20,
            players: [{ id: id(), name: name() }], bet: {}
        });
        activeRoomId = room.id;
        sessionStorage.setItem('ulivre_bitcoin_active_room', activeRoomId);
        writeRooms([...readRooms(), room]);
        startRoom(room);
    }
    function joinRoom(roomId) {
        const room = getRoom(roomId);
        if (!room || room.mode === 'individual' || room.players.some(player => player.id === id()) || room.players.length >= room.capacity) return;
        room.players.push({ id: id(), name: name() });
        activeRoomId = roomId;
        sessionStorage.setItem('ulivre_bitcoin_active_room', roomId);
        writeRooms(readRooms().map(item => item.id === roomId ? room : item));
        startRoom(room);
    }
    function deleteRoom(roomId) {
        const room = getRoom(roomId);
        if (!room || room.owner !== id()) return;
        writeRooms(readRooms().filter(item => item.id !== roomId));
        activeRoomId = null;
        game = null;
        renderLobby();
    }
    function startRoom(room) {
        game = { room, message: '', price: null, error: '' };
        renderGame();
        refreshPrice();
        if (priceTimer) clearInterval(priceTimer);
        priceTimer = setInterval(refreshPrice, 30000);
        if (countdownTimer) clearInterval(countdownTimer);
        const bet = room.bet?.[id()];
        if (bet && !bet.resolved) {
            const remaining = remainingMs(bet);
            updateCountdown();
            countdownTimer = setInterval(updateCountdown, 1000);
            setTimeout(() => resolveBet(room.id, id()), remaining);
        }
    }
    async function refreshPrice() {
        try {
            game.price = await fetchPrice();
            game.error = '';
            renderGame();
        } catch (error) {
            game.error = tx('bitcoin_price_error', 'Não foi possível atualizar a cotação agora. Tente novamente em instantes.');
            renderGame();
        }
    }
    async function placeBet() {
        const room = getRoom();
        if (!room || !game) return;
        const direction = panel().querySelector('input[name="bitcoinDirection"]:checked')?.value;
        const amount = Math.floor(Number(panel().querySelector('#bitcoinAmount')?.value));
        const duration = Number(panel().querySelector('#bitcoinRoundDuration')?.value);
        if (!direction || !DURATIONS.includes(duration) || !Number.isFinite(amount) || amount < 1 || amount > wallet().coins) {
            game.message = tx('bitcoin_invalid_bet', 'Escolha uma direção, duração válida e uma aposta dentro do seu saldo.');
            renderGame();
            return;
        }
        try {
            const currency = getCurrency();
            const startPrice = await fetchPrice(currency);
            if (!saveWallet({ ...wallet(), coins: wallet().coins - amount, games: Number(wallet().games || 0) + 1, activeGame: GAME_ID })) throw new Error('Saldo indisponível');
            const bet = { playerId: id(), playerName: name(), direction, amount, duration, currency, startPrice, startedAt: Date.now(), resolved: false, result: null };
            room.bet = { ...(room.bet || {}), [id()]: bet };
            writeRooms(readRooms().map(item => item.id === room.id ? room : item));
            game.message = tx('bitcoin_bet_registered', `Aposta registrada em ${formatPrice(startPrice, currency)}.`, { price: formatPrice(startPrice, currency) });
            renderGame();
            setTimeout(() => resolveBet(room.id, id()), duration * 60 * 1000);
        } catch (error) {
            game.message = tx('bitcoin_bet_error', 'Não foi possível registrar a aposta. Verifique a cotação e o saldo.');
            renderGame();
        }
    }
    async function resolveBet(roomId, playerId) {
        const room = getRoom(roomId);
        const bet = room?.bet?.[playerId];
        if (!bet || bet.resolved) return;
        try {
            const endPrice = await fetchPrice(bet.currency || getCurrency());
            const movement = endPrice > bet.startPrice ? 'up' : endPrice < bet.startPrice ? 'down' : 'same';
            const won = movement === bet.direction;
            bet.resolved = true;
            bet.result = { endPrice, movement, won, resolvedAt: Date.now() };
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
            if (won) saveWallet({ ...wallet(), coins: wallet().coins + bet.amount * 2, wins: Number(wallet().wins || 0) + 1 });
            writeRooms(readRooms().map(item => item.id === room.id ? room : item));
            if (room.id === activeRoomId && playerId === id()) {
                game.message = won
                    ? tx('bitcoin_won', `Você ganhou! ${formatPrice(bet.startPrice, bet.currency)} → ${formatPrice(endPrice, bet.currency)}.`, { start: formatPrice(bet.startPrice, bet.currency), end: formatPrice(endPrice, bet.currency) })
                    : tx('bitcoin_lost', `Você perdeu. ${formatPrice(bet.startPrice, bet.currency)} → ${formatPrice(endPrice, bet.currency)}.`, { start: formatPrice(bet.startPrice, bet.currency), end: formatPrice(endPrice, bet.currency) });
                renderGame();
            }
        } catch (_) {
            if (room.id === activeRoomId && playerId === id()) {
                game.message = tx('bitcoin_price_error', 'A cotação final não está disponível. A aposta continuará aguardando a próxima atualização.');
                renderGame();
            }
            setTimeout(() => resolveBet(roomId, playerId), 30000);
        }
    }
    function renderLobby() {
        const target = panel();
        const rooms = readRooms();
        const balance = wallet();
        target.innerHTML = `<div class="bitcoin-card"><div class="bitcoin-header"><div><h4>${tx('bitcoin_title', 'Bitcoin: sobe ou desce')}</h4><p>${tx('bitcoin_subtitle', 'Aposte Livre Coins virtuais, sem dinheiro real.')}</p></div><div class="bitcoin-price" id="bitcoinCurrentPrice">${tx('bitcoin_loading_price', 'Carregando cotação...')}</div></div><div class="bitcoin-balance"><span>${tx('bitcoin_balance', 'Saldo')}: <strong>${balance.coins}</strong> Livre Coins</span></div><div class="bitcoin-create"><label class="bitcoin-field">${tx('bitcoin_bet_type', 'Tipo de aposta')}<select id="bitcoinRoomMode" class="bitcoin-select"><option value="individual">${tx('bitcoin_individual', 'Aposta individual')}</option><option value="community">${tx('bitcoin_community', 'Aposta com a comunidade')}</option></select></label><span></span><button id="bitcoinCreate" class="bitcoin-primary" type="button">${tx('bitcoin_create_room', 'Criar sala')}</button></div><div class="bitcoin-room-list"><h5>${tx('bitcoin_rooms', 'Salas disponíveis')}</h5>${rooms.length ? rooms.map(room => `<div class="bitcoin-room"><div class="bitcoin-room-meta"><strong>${esc(room.id)}</strong><span class="bitcoin-muted">${tx('bitcoin_room_players', '{{mode}} · {{players}}/{{capacity}} jogadores', { mode: room.mode === 'individual' ? tx('bitcoin_individual', 'Aposta individual') : tx('bitcoin_community', 'Aposta com a comunidade'), players: room.players.length, capacity: room.capacity })}</span></div><div class="bitcoin-room-actions">${room.mode !== 'individual' && room.players.length < room.capacity && !room.players.some(player => player.id === id()) ? `<button class="bitcoin-secondary bitcoin-join" data-room="${esc(room.id)}" type="button">${tx('bitcoin_join', 'Entrar')}</button>` : ''}<button class="bitcoin-secondary bitcoin-view" data-room="${esc(room.id)}" type="button">${tx('bitcoin_view', 'Visualizar')}</button>${room.owner === id() ? `<button class="bitcoin-danger bitcoin-delete" data-room="${esc(room.id)}" type="button">${tx('bitcoin_delete', 'Apagar')}</button>` : ''}</div></div>`).join('') : `<p class="bitcoin-muted">${tx('bitcoin_no_rooms', 'Nenhuma sala aberta ainda.')}</p>`}</div></div>`;
        target.querySelector('#bitcoinCreate')?.addEventListener('click', createRoom);
        target.querySelectorAll('.bitcoin-join,.bitcoin-view').forEach(button => button.addEventListener('click', () => joinRoom(button.dataset.room)));
        target.querySelectorAll('.bitcoin-delete').forEach(button => button.addEventListener('click', () => deleteRoom(button.dataset.room)));
        refreshPriceForLobby();
    }
    async function refreshPriceForLobby() {
        const output = panel().querySelector('#bitcoinCurrentPrice');
        if (!output) return;
        try {
            const currency = getCurrency();
            output.textContent = formatPrice(await fetchPrice(currency), currency);
        } catch (_) { output.textContent = tx('bitcoin_price_unavailable', 'Cotação indisponível'); }
    }
    function renderGame() {
        const target = panel();
        const room = getRoom();
        if (!room || !game) return renderLobby();
        const bet = room.bet?.[id()];
        const result = bet?.result;
        const displayCurrency = bet?.currency || getCurrency();
        const roomMode = room.mode === 'individual' ? tx('bitcoin_individual', 'Aposta individual') : tx('bitcoin_community', 'Aposta com a comunidade');
        const waitingDirection = bet?.direction === 'up' ? tx('bitcoin_up', 'Bitcoin vai subir') : tx('bitcoin_down', 'Bitcoin vai descer');
        target.innerHTML = `<div class="bitcoin-card"><div class="bitcoin-header"><div><h4>${tx('bitcoin_title', 'Bitcoin: sobe ou desce')} · ${esc(room.id)}</h4><p>${tx('bitcoin_room_players', '{{mode}} · {{players}}/{{capacity}} jogadores', { mode: roomMode, players: room.players.length, capacity: room.capacity })}</p></div><div class="bitcoin-price">${game.price ? formatPrice(game.price, getCurrency()) : tx('bitcoin_loading_price', 'Atualizando...')}</div></div><div class="bitcoin-balance"><span>${tx('bitcoin_balance', 'Saldo')}: <strong>${wallet().coins}</strong> Livre Coins</span><span>${tx('bitcoin_participants', 'Participantes')}: <strong>${room.players.map(player => esc(player.name)).join(', ')}</strong></span></div>${result ? `<div class="bitcoin-status ${result.won ? 'bitcoin-win' : 'bitcoin-loss'}">${game.message || (result.won ? tx('bitcoin_won', 'Você ganhou!') : tx('bitcoin_lost', 'Você perdeu.'))} ${formatPrice(bet.startPrice, displayCurrency)} → ${formatPrice(result.endPrice, displayCurrency)}</div>` : bet ? `<div class="bitcoin-status"><div>${esc(game.message || tx('bitcoin_waiting_bet', 'Aposta em {{direction}} aguardando o vencimento.', { direction: waitingDirection }))}</div><div class="bitcoin-countdown-label">${tx('bitcoin_time_remaining', 'Tempo restante')}</div><strong id="bitcoinCountdown" class="bitcoin-countdown">${formatCountdown(remainingMs(bet))}</strong></div>` : `<div class="bitcoin-round"><div class="bitcoin-direction"><label><input type="radio" name="bitcoinDirection" value="up"> ↗ ${tx('bitcoin_up', 'Bitcoin vai subir')}</label><label><input type="radio" name="bitcoinDirection" value="down"> ↘ ${tx('bitcoin_down', 'Bitcoin vai descer')}</label></div><label class="bitcoin-field">${tx('bitcoin_bet_time', 'Tempo da aposta')}<select id="bitcoinRoundDuration" class="bitcoin-select">${durationOptions(15)}</select></label><label class="bitcoin-field">${tx('bitcoin_bet_amount', 'Valor da aposta')}<input id="bitcoinAmount" class="bitcoin-input" type="number" min="1" max="${wallet().coins}" value="10"></label><button id="bitcoinBet" class="bitcoin-primary" type="button">${tx('bitcoin_place_bet', 'Apostar')}</button></div>`}${game.error ? `<div class="bitcoin-status bitcoin-loss">${game.error}</div>` : ''}<div class="bitcoin-actions"><button id="bitcoinBack" class="bitcoin-secondary" type="button">${tx('bitcoin_back_rooms', 'Voltar para salas')}</button></div></div>`;
        target.querySelector('#bitcoinBet')?.addEventListener('click', placeBet);
        target.querySelector('#bitcoinBack')?.addEventListener('click', renderLobby);
    }
    function show() {
        document.getElementById('gamesMenuScreen')?.setAttribute('hidden', '');
        document.getElementById('gameShellScreen')?.removeAttribute('hidden');
        document.getElementById('gameShellScreen')?.classList.add('room-active');
        panel().hidden = false;
        panel().style.removeProperty('display');
        const saved = sessionStorage.getItem('ulivre_bitcoin_active_room');
        activeRoomId = saved;
        const room = getRoom();
        room ? startRoom(room) : renderLobby();
    }
    document.addEventListener('storage', event => {
        if (event.key === ROOMS_KEY && activeRoomId && getRoom()) startRoom(getRoom());
    });
    window.addEventListener('languageChanged', () => {
        if (!panel()?.hidden) {
            if (activeRoomId && getRoom()) startRoom(getRoom());
            else renderLobby();
        }
    });
    document.addEventListener('click', event => {
        if (!panel() || panel().hidden || !event.target.closest('#gameBackBtn')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        panel().hidden = true;
        panel().style.setProperty('display', 'none', 'important');
        document.getElementById('gameShellScreen')?.classList.remove('room-active');
        document.getElementById('gameShellScreen')?.setAttribute('hidden', '');
        document.getElementById('gamesMenuScreen')?.removeAttribute('hidden');
    }, true);
    window.BitcoinGame = { show };
}());
