(function () {
    'use strict';

    const ROOMS_KEY = 'ulivre_bicho_rooms';
    const WALLET_KEY = 'ulivre_bicho_wallets';
    const STARTING_COINS = 250;
    const MAX_BET = 250;
    const ANIMALS = [
        ['avestruz', 'Avestruz', 1, '01-04'], ['aguia', 'Águia', 2, '05-08'],
        ['burro', 'Burro', 3, '09-12'], ['borboleta', 'Borboleta', 4, '13-16'],
        ['cachorro', 'Cachorro', 5, '17-20'], ['cabra', 'Cabra', 6, '21-24'],
        ['carneiro', 'Carneiro', 7, '25-28'], ['camelo', 'Camelo', 8, '29-32'],
        ['cobra', 'Cobra', 9, '33-36'], ['coelho', 'Coelho', 10, '37-40'],
        ['cavalo', 'Cavalo', 11, '41-44'], ['elefante', 'Elefante', 12, '45-48'],
        ['galo', 'Galo', 13, '49-52'], ['gato', 'Gato', 14, '53-56'],
        ['jacare', 'Jacaré', 15, '57-60'], ['leao', 'Leão', 16, '61-64'],
        ['macaco', 'Macaco', 17, '65-68'], ['porco', 'Porco', 18, '69-72'],
        ['pavao', 'Pavão', 19, '73-76'], ['peru', 'Peru', 20, '77-80'],
        ['touro', 'Touro', 21, '81-84'], ['tigre', 'Tigre', 22, '85-88'],
        ['urso', 'Urso', 23, '89-92'], ['veado', 'Veado', 24, '93-96'],
        ['vaca', 'Vaca', 25, '97-00']
    ];
    const ANIMAL_ICONS = {
        avestruz: '🦤', aguia: '🦅', burro: '🫏', borboleta: '🦋', cachorro: '🐶',
        cabra: '🐐', carneiro: '🐏', camelo: '🐫', cobra: '🐍', coelho: '🐇',
        cavalo: '🐎', elefante: '🐘', galo: '🐓', gato: '🐈', jacare: '🐊',
        leao: '🦁', macaco: '🐒', porco: '🐖', pavao: '🦚', peru: '🦃',
        touro: '🐂', tigre: '🐅', urso: '🐻', veado: '🦌', vaca: '🐄'
    };
    const DIFFICULTIES = ['iniciante', 'intermediario', 'avancado', 'mestre'];
    let activeRoomId = null;
    let game = null;
    let drawTimer = null;

    const panel = () => document.getElementById('bichoPanel');
    const tx = (key, fallback, replacements = {}) => {
        const value = typeof window.t === 'function' ? window.t(key, replacements) : key;
        return value === key ? fallback : value;
    };
    const userName = () => localStorage.getItem('userProfileName') || tx('games_room_player_label', 'Jogador');
    const playerId = () => {
        let id = sessionStorage.getItem('ulivre_bicho_player_id');
        if (!id) {
            id = `bicho-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            sessionStorage.setItem('ulivre_bicho_player_id', id);
        }
        return id;
    };
    const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

    function readRooms() {
        try { const rooms = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]'); return Array.isArray(rooms) ? rooms.filter(room => window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true) : []; } catch (_) { return []; }
    }

    function writeRooms(rooms) { let existing = []; try { existing = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]'); } catch (_) {} const otherScopes = Array.isArray(existing) ? existing.filter(room => !(window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true)) : []; localStorage.setItem(ROOMS_KEY, JSON.stringify([...otherScopes, ...rooms].slice(-20))); }
    function getRoom(id = activeRoomId) { return readRooms().find(room => room.id === id) || null; }
    function readWallets() {
        try { return JSON.parse(localStorage.getItem(WALLET_KEY) || '{}'); } catch (_) { return {}; }
    }
    function wallet() {
        if (window.UniversidadeLivreWallet) return window.UniversidadeLivreWallet.get();
        const wallets = readWallets();
        if (!wallets[userName()]) wallets[userName()] = { coins: STARTING_COINS, points: 0, wins: 0, bets: 0, history: [] };
        return wallets[userName()];
    }
    function saveWallet(value) {
        if (window.UniversidadeLivreWallet) {
            window.UniversidadeLivreWallet.update(value);
            return;
        }
        const wallets = readWallets();
        wallets[userName()] = { ...value, coins: Math.max(0, Math.floor(value.coins)) };
        localStorage.setItem(WALLET_KEY, JSON.stringify(wallets));
        window.dispatchEvent(new CustomEvent('bichoScoreUpdated', { detail: wallets[userName()] }));
    }
    function animalByGroup(group) { return ANIMALS.find(animal => animal[2] === group) || ANIMALS[0]; }
    function animalLabel(group) { return animalByGroup(Number(group))[1]; }
    function animalForNumber(number) { return animalByGroup(((number - 1 + 100) % 100) === 0 ? 25 : Math.ceil(((number - 1 + 100) % 100) / 4))[1]; }
    function numberRange(group) { return animalByGroup(group)[3]; }
    function randomDraw() {
        const number = Math.floor(Math.random() * 100);
        const group = number === 0 ? 25 : Math.ceil(number / 4);
        return { number, group, animal: animalLabel(group), at: Date.now() };
    }
    function payout(type) { return type === 'number' ? 45 : 18; }

    function createRoom() {
        const mode = panel().querySelector('#bichoMode')?.value || 'community';
        const difficulty = panel().querySelector('#bichoDifficulty')?.value || 'intermediario';
        const room = window.UniversidadeLivreGameScope?.decorateRoom({ id: `BIC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, owner: playerId(), mode, difficulty, players: [{ id: playerId(), name: userName() }], capacity: 2, lastDraw: null, createdAt: Date.now() });
        if (mode === 'bot') room.players.push({ id: `bot-${room.id}`, name: tx('bicho_bot_name', 'Bot do Bicho'), isBot: true });
        activeRoomId = room.id;
        sessionStorage.setItem('ulivre_bicho_active_room', activeRoomId);
        writeRooms([...readRooms(), room]);
        startRoom(room);
    }

    function joinRoom(id) {
        const room = getRoom(id);
        if (!room || room.mode === 'bot' || room.players.length >= room.capacity) return;
        room.players.push({ id: playerId(), name: userName() });
        activeRoomId = id;
        sessionStorage.setItem('ulivre_bicho_active_room', id);
        writeRooms(readRooms().map(item => item.id === id ? room : item));
        startRoom(room);
    }

    function startRoom(room) {
        game = { room, bet: null, selectedGroup: 1, botBet: room.mode === 'bot' ? createBotBet(room) : null, lastResult: room.lastDraw || null, history: room.history || [], message: '' };
        renderGame();
    }

    function createBotBet(room) {
        const difficulty = DIFFICULTIES.includes(room.difficulty) ? room.difficulty : 'intermediario';
        const group = difficulty === 'mestre'
            ? ((Date.now() % 25) + 1)
            : Math.floor(Math.random() * 25) + 1;
        return { type: difficulty === 'iniciante' ? 'animal' : 'animal', group };
    }

    function placeBet() {
        const room = getRoom();
        if (!room || !game) return;
        const betType = panel().querySelector('#bichoBetType')?.value || 'animal';
        const group = Number(panel().querySelector('#bichoAnimal')?.value || 1);
        const numberInput = panel().querySelector('#bichoNumber')?.value;
        const number = Number(numberInput);
        const amount = Math.floor(Number(panel().querySelector('#bichoAmount')?.value));
        const balance = wallet();
        if (!Number.isFinite(amount) || amount < 1 || amount > MAX_BET || amount > balance.coins) {
            game.message = tx('bicho_invalid_bet', 'Escolha uma aposta entre 1 e 250 moedas, dentro do seu saldo.');
            renderGame();
            return;
        }
        if (betType === 'number' && (!Number.isInteger(number) || number < 0 || number > 99)) {
            game.message = tx('bicho_invalid_number', 'Informe uma dezena entre 00 e 99.');
            renderGame();
            return;
        }
        game.bet = { type: betType, group, number: betType === 'number' ? number : null, amount, player: userName() };
        game.message = tx('bicho_bet_ready', 'Aposta registrada. Faça a extração.');
        renderGame();
    }

    function draw() {
        if (!game?.bet || drawTimer) return;
        const balance = wallet();
        const bet = game.bet;
        saveWallet({ ...balance, coins: balance.coins - bet.amount, bets: balance.bets + 1 });
        game.message = tx('bicho_draw_running', 'Extraindo o resultado...');
        renderGame();
        drawTimer = setTimeout(() => {
            drawTimer = null;
            const result = randomDraw();
            const won = bet.type === 'number' ? result.number === bet.number : result.group === bet.group;
            const botWon = game.botBet ? result.group === game.botBet.group : false;
            const prize = won ? bet.amount * payout(bet.type) : 0;
            game.lastResult = result;
            game.history = [{ ...result, won, prize }, ...(game.history || [])].slice(0, 8);
            game.message = won
                ? tx('bicho_win', 'Você acertou!')
                : botWon
                    ? `${tx('bicho_loss', 'Não foi dessa vez.')} ${tx('bicho_bot_won', 'O bot acertou o grupo.')}`
                    : tx('bicho_loss', 'Não foi dessa vez.');
            try {
                const updated = wallet();
                updated.coins += prize;
                updated.points += won ? Math.floor(prize / 2) : 1;
                updated.wins += won ? 1 : 0;
                updated.history = [{ ...result, bet, won, prize }, ...(updated.history || [])].slice(0, 12);
                saveWallet(updated);
                room.lastDraw = result;
                room.history = game.history;
                writeRooms(readRooms().map(item => item.id === room.id ? room : item));
            } catch (error) {
                console.warn('[Bicho] Resultado exibido, mas não foi possível persistir a rodada:', error);
            } finally {
                renderGame();
            }
        }, 900);
    }

    function botHint(room) {
        const difficulty = DIFFICULTIES.includes(room.difficulty) ? room.difficulty : 'intermediario';
        const group = difficulty === 'iniciante' ? Math.floor(Math.random() * 25) + 1 : difficulty === 'mestre' ? ((Date.now() % 25) + 1) : Math.floor(Math.random() * 25) + 1;
        return animalLabel(group);
    }

    function renderLobby() {
        const target = panel();
        const rooms = readRooms();
        const balance = wallet();
        target.innerHTML = `<div class="bicho-lobby"><div class="bicho-intro"><span class="bicho-mark">B</span><div><h3>${tx('bicho_title', 'Jogo do Bicho')}</h3><p>${tx('bicho_subtitle', 'Escolha um animal ou uma dezena e jogue com moedas virtuais.')}</p></div><div class="bicho-wallet"><strong>${balance.coins}</strong><small>${tx('bicho_coins', 'moedas')}</small></div></div><div class="bicho-create"><h4>${tx('bicho_create_title', 'Criar sala')}</h4><div class="bicho-create-row"><label>${tx('bicho_room_type', 'Tipo de sala')}<select id="bichoMode"><option value="community">${tx('bicho_room_community', 'Comunidade')}</option><option value="bot">${tx('bicho_room_bot', 'Bot')}</option></select></label><label id="bichoDifficultyWrap">${tx('bicho_difficulty', 'Dificuldade do bot')}<select id="bichoDifficulty"><option value="iniciante">${tx('bicho_beginner', 'Iniciante')}</option><option value="intermediario" selected>${tx('bicho_intermediate', 'Intermediário')}</option><option value="avancado">${tx('bicho_advanced', 'Avançado')}</option><option value="mestre">${tx('bicho_master', 'Mestre')}</option></select></label><button class="bicho-primary" data-bicho-create type="button"><i class="fas fa-plus"></i> ${tx('bicho_create_room', 'Criar sala')}</button></div></div><section class="bicho-rooms"><div class="bicho-section-heading"><h4>${tx('bicho_open_rooms', 'Salas disponíveis')}</h4><span>${rooms.length}</span></div>${rooms.length ? rooms.map(room => `<div class="bicho-room"><div class="bicho-room-meta"><strong>${escapeHtml(room.id)}</strong><small>${room.mode === 'bot' ? tx('bicho_room_bot', 'Bot') : tx('bicho_room_community', 'Comunidade')} · ${room.players.length}/${room.capacity}</small></div><div class="bicho-room-actions">${room.mode === 'community' && room.players.length < room.capacity ? `<button class="bicho-secondary bicho-join" data-room="${escapeHtml(room.id)}" type="button">${tx('bicho_join', 'Entrar')}</button>` : ''}<button class="bicho-secondary bicho-view" data-room="${escapeHtml(room.id)}" type="button">${tx('bicho_view', 'Visualizar')}</button>${room.owner === playerId() ? `<button class="bicho-danger bicho-delete" data-room="${escapeHtml(room.id)}" type="button"><i class="fas fa-trash"></i> ${tx('bicho_delete', 'Apagar')}</button>` : ''}</div></div>`).join('') : `<p class="bicho-muted">${tx('bicho_no_rooms', 'Nenhuma sala criada ainda.')}</p>`}</section></div>`;
        target.querySelector('#bichoMode').addEventListener('change', event => { target.querySelector('#bichoDifficultyWrap').hidden = event.target.value !== 'bot'; });
        target.querySelector('#bichoDifficultyWrap').hidden = true;
        target.querySelector('[data-bicho-create]').addEventListener('click', createRoom);
        target.querySelectorAll('.bicho-join').forEach(button => button.addEventListener('click', () => joinRoom(button.dataset.room)));
        target.querySelectorAll('.bicho-view').forEach(button => button.addEventListener('click', () => viewRoom(button.dataset.room)));
        target.querySelectorAll('.bicho-delete').forEach(button => button.addEventListener('click', () => deleteRoom(button.dataset.room)));
    }

    function renderAnimalCards() {
        return ANIMALS.map(animal => `<button class="bicho-animal-card ${game.selectedGroup === animal[2] ? 'is-selected' : ''}" data-bicho-group="${animal[2]}" type="button"><span class="bicho-animal-icon">${ANIMAL_ICONS[animal[0]]}</span><strong>${escapeHtml(animal[1])}</strong><small>${String(animal[2]).padStart(2, '0')} · ${animal[3]}</small></button>`).join('');
    }

    function viewRoom(id) { const room = getRoom(id); if (!room) return; activeRoomId = id; startRoom(room); }
    function deleteRoom(id) { const room = getRoom(id); if (!room || room.owner !== playerId()) return; const remove = () => { writeRooms(readRooms().filter(item => item.id !== id)); if (activeRoomId === id) leaveRoom(); else renderLobby(); }; if (window.openRoomDeleteDialog) window.openRoomDeleteDialog(remove); else remove(); }
    function leaveRoom() { activeRoomId = null; game = null; sessionStorage.removeItem('ulivre_bicho_active_room'); renderLobby(); }

    function renderGame() {
        const target = panel();
        const room = game.room;
        const balance = wallet();
        const result = game.lastResult;
        target.innerHTML = `<div class="bicho-game"><div class="bicho-game-top"><div class="bicho-heading"><span class="bicho-mark small">B</span><div><strong>${escapeHtml(room.id)}</strong><small>${room.mode === 'bot' ? `${tx('bicho_room_bot', 'Bot')} · ${escapeHtml(room.difficulty)}` : tx('bicho_room_community', 'Comunidade')}</small></div></div><div class="bicho-game-actions"><span class="bicho-balance"><i class="fas fa-coins"></i> ${balance.coins}</span><button class="bicho-secondary" data-bicho-leave type="button">${tx('bicho_back', 'Voltar')}</button></div></div><div class="bicho-board"><div class="bicho-draw-card ${result ? 'has-result' : ''}"><span>${tx('bicho_last_draw', 'Última extração')}</span>${result ? `<div class="bicho-result-animal"><span>${ANIMAL_ICONS[ANIMALS[result.group - 1]?.[0]] || '🐾'}</span><strong>${escapeHtml(result.animal)}</strong></div><b>${String(result.number).padStart(2, '0')}</b><em>${tx('bicho_result_group', 'Grupo')} ${String(result.group).padStart(2, '0')} · ${numberRange(result.group)}</em>` : `<strong>--</strong><em>${tx('bicho_waiting_draw', 'Aguardando extração')}</em>`}</div><div class="bicho-rules-card"><strong>${tx('bicho_rules_title', 'Como jogar')}</strong><span>${tx('bicho_rules', 'Aposte no animal ou na dezena correspondente. Uma aposta em animal paga 18x; uma dezena paga 45x.')}</span><small>${tx('bicho_virtual_only', 'Moedas virtuais, sem valor real.')}</small>${game.botBet ? `<small>${tx('bicho_bot_bet', 'O bot escolheu')} <strong>${escapeHtml(animalLabel(game.botBet.group))}</strong>.</small>` : ''}</div></div><div class="bicho-bet-card"><div class="bicho-card-heading"><h4>${tx('bicho_bet_title', 'Sua aposta')}</h4><span>${tx('bicho_max_bet', 'Máximo')}: ${MAX_BET}</span></div><div class="bicho-animal-grid">${renderAnimalCards()}</div><div class="bicho-bet-grid"><label>${tx('bicho_bet_type', 'Modalidade')}<select id="bichoBetType"><option value="animal">${tx('bicho_bet_animal', 'Animal / grupo')}</option><option value="number">${tx('bicho_bet_number', 'Dezena')}</option></select></label><label>${tx('bicho_animal', 'Bicho')}<select id="bichoAnimal">${ANIMALS.map(animal => `<option value="${animal[2]}"${game.selectedGroup === animal[2] ? ' selected' : ''}>${animal[2].toString().padStart(2, '0')} · ${escapeHtml(animal[1])} (${animal[3]})</option>`).join('')}</select></label><label>${tx('bicho_number', 'Número')}<input id="bichoNumber" type="number" min="0" max="99" placeholder="00" /></label><label>${tx('bicho_amount', 'Valor')}<input id="bichoAmount" type="number" min="1" max="${MAX_BET}" value="10" /></label></div><div class="bicho-bet-actions"><button class="bicho-primary" data-bicho-bet type="button"><i class="fas fa-ticket"></i> ${tx('bicho_place_bet', 'Registrar aposta')}</button><button class="bicho-gold" data-bicho-draw type="button" ${!game.bet || drawTimer ? 'disabled' : ''}><i class="fas fa-dice"></i> ${tx('bicho_draw', 'Fazer extração')}</button></div><p class="bicho-message">${escapeHtml(game.message || tx('bicho_select_hint', 'Escolha a modalidade e registre sua aposta.'))}</p></div><div class="bicho-history"><h4>${tx('bicho_history', 'Histórico da rodada')}</h4>${game.history.length ? game.history.map(item => `<div><strong>${ANIMAL_ICONS[ANIMALS[item.group - 1]?.[0]] || '🐾'} ${String(item.number).padStart(2, '0')} · ${escapeHtml(item.animal)}</strong><span class="${item.won ? 'is-win' : 'is-loss'}">${item.won ? `+${item.prize}` : tx('bicho_loss_short', 'Sem prêmio')}</span></div>`).join('') : `<p>${tx('bicho_no_history', 'Nenhuma extração nesta sala.')}</p>`}</div></div>`;
        target.querySelector('[data-bicho-leave]').addEventListener('click', leaveRoom);
        target.querySelector('[data-bicho-bet]').addEventListener('click', placeBet);
        target.querySelector('[data-bicho-draw]').addEventListener('click', draw);
        target.querySelectorAll('[data-bicho-group]').forEach(button => button.addEventListener('click', () => {
            game.selectedGroup = Number(button.dataset.bichoGroup);
            const select = target.querySelector('#bichoAnimal');
            if (select) select.value = String(game.selectedGroup);
            target.querySelectorAll('[data-bicho-group]').forEach(card => card.classList.toggle('is-selected', card === button));
        }));
        target.querySelector('#bichoAnimal').addEventListener('change', event => {
            game.selectedGroup = Number(event.target.value);
            target.querySelectorAll('[data-bicho-group]').forEach(card => card.classList.toggle('is-selected', Number(card.dataset.bichoGroup) === game.selectedGroup));
        });
        target.querySelector('#bichoBetType').addEventListener('change', event => { target.querySelector('#bichoNumber').disabled = event.target.value !== 'number'; target.querySelector('#bichoAnimal').disabled = event.target.value === 'number'; });
        target.querySelector('#bichoNumber').disabled = true;
    }

    function show() {
        document.getElementById('gamesMenuScreen')?.setAttribute('hidden', '');
        document.getElementById('gameShellScreen')?.removeAttribute('hidden');
        ['chessPanel', 'impostorPanel', 'hangmanPanel', 'checkersPanel', 'roulettePanel', 'unoPanel'].forEach(id => { const element = document.getElementById(id); element?.setAttribute('hidden', ''); if (element) element.style.setProperty('display', 'none', 'important'); });
        document.querySelectorAll('.chess-room-creator, .chess-opponent-panel, #chessRoomList, #tttRoomList, .game-stage').forEach(element => { element.hidden = true; element.style.display = 'none'; });
        const target = panel(); target.hidden = false; target.style.setProperty('display', 'block', 'important');
        document.querySelector('.game-shell-title-wrap strong').textContent = tx('bicho_title', 'Jogo do Bicho');
        document.getElementById('chessStatusText').textContent = tx('bicho_status', 'Aposte moedas virtuais no animal ou na dezena.');
        activeRoomId = sessionStorage.getItem('ulivre_bicho_active_room') || null;
        const room = getRoom();
        if (room) startRoom(room); else renderLobby();
    }

    window.addEventListener('storage', event => { if (event.key === ROOMS_KEY || event.key === WALLET_KEY) { const room = getRoom(); if (room && game) { game.room = room; if (room.lastDraw) game.lastResult = room.lastDraw; renderGame(); } else if (!panel()?.hidden) renderLobby(); } });
    window.addEventListener('languageChanged', () => { if (!panel()?.hidden) { const room = getRoom(); if (room && game) renderGame(); else renderLobby(); } });
    window.BichoGame = { show };
}());
