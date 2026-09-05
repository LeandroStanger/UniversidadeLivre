(function () {
    'use strict';

    const TOTAL_PLAYERS = 6;
    const ROUND_SECONDS = 30;
    const SCORE_KEY = 'ulivre_impostor_scores';
    const WORD_PAIRS = [
        ['carro', 'carrinho'], ['barco', 'navio'], ['avião', 'helicóptero'], ['bicicleta', 'motocicleta'], ['cachorro', 'lobo'], ['pizza', 'hambúrguer'], ['praia', 'piscina'], ['violão', 'guitarra'], ['computador', 'celular'],
        ['maçã', 'pera'], ['banana', 'laranja'], ['café', 'chá'], ['arroz', 'macarrão'], ['pão', 'bolo'], ['sorvete', 'picolé'], ['água', 'suco'], ['queijo', 'iogurte'], ['chocolate', 'bala'], ['uva', 'melancia'],
        ['árvore', 'flor'], ['jardim', 'parque'], ['montanha', 'colina'], ['rio', 'lago'], ['floresta', 'selva'], ['sol', 'lua'], ['estrela', 'planeta'], ['chuva', 'neve'], ['vento', 'tempestade'], ['fogo', 'fumaça'],
        ['casa', 'apartamento'], ['escola', 'universidade'], ['hospital', 'farmácia'], ['mercado', 'padaria'], ['restaurante', 'lanchonete'], ['cinema', 'teatro'], ['museu', 'biblioteca'], ['hotel', 'pousada'], ['estádio', 'ginásio'], ['aeroporto', 'estação'],
        ['livro', 'revista'], ['jornal', 'carta'], ['caneta', 'lápis'], ['caderno', 'agenda'], ['mochila', 'mala'], ['mesa', 'cadeira'], ['cama', 'sofá'], ['janela', 'porta'], ['espelho', 'quadro'], ['relógio', 'calendário'],
        ['telefone', 'rádio'], ['televisão', 'projetor'], ['câmera', 'microfone'], ['teclado', 'mouse'], ['internet', 'aplicativo'], ['robô', 'drone'], ['jogo', 'brinquedo'], ['música', 'filme'], ['fotografia', 'desenho']
    ];
    const WORD_PAIRS_EN = [
        ['car', 'cart'], ['boat', 'ship'], ['airplane', 'helicopter'], ['bicycle', 'motorcycle'], ['dog', 'wolf'], ['pizza', 'hamburger'], ['beach', 'pool'], ['guitar', 'violin'], ['computer', 'phone'],
        ['apple', 'pear'], ['banana', 'orange'], ['coffee', 'tea'], ['rice', 'pasta'], ['bread', 'cake'], ['ice cream', 'popsicle'], ['water', 'juice'], ['cheese', 'yogurt'], ['chocolate', 'candy'], ['grape', 'watermelon'],
        ['tree', 'flower'], ['garden', 'park'], ['mountain', 'hill'], ['river', 'lake'], ['forest', 'jungle'], ['sun', 'moon'], ['star', 'planet'], ['rain', 'snow'], ['wind', 'storm'], ['fire', 'smoke'],
        ['house', 'apartment'], ['school', 'university'], ['hospital', 'pharmacy'], ['market', 'bakery'], ['restaurant', 'diner'], ['cinema', 'theater'], ['museum', 'library'], ['hotel', 'inn'], ['stadium', 'gym'], ['airport', 'station'],
        ['book', 'magazine'], ['newspaper', 'letter'], ['pen', 'pencil'], ['notebook', 'planner'], ['backpack', 'suitcase'], ['table', 'chair'], ['bed', 'sofa'], ['window', 'door'], ['mirror', 'painting'], ['clock', 'calendar'],
        ['telephone', 'radio'], ['television', 'projector'], ['camera', 'microphone'], ['keyboard', 'mouse'], ['internet', 'application'], ['robot', 'drone'], ['game', 'toy'], ['music', 'film'], ['photograph', 'drawing']
    ];
    const CLUES_BY_WORD = {
        carro: ['Rodas', 'Estrada', 'Motor'], carrinho: ['Pequeno', 'Empurrar', 'Rodinhas'],
        barco: ['Água', 'Motor', 'Viagem'], navio: ['Grande', 'Mar', 'Transporte'],
        avião: ['Altura', 'Asas', 'Viagem'], helicóptero: ['Hélices', 'Pouso', 'Voo'],
        bicicleta: ['Pedais', 'Rodas', 'Equilíbrio'], motocicleta: ['Velocidade', 'Capacete', 'Motor'],
        cachorro: ['Coleira', 'Latido', 'Osso'], lobo: ['Uivo', 'Alcateia', 'Selvagem'],
        pizza: ['Fatias', 'Queijo', 'Forno'], hambúrguer: ['Pão', 'Carne', 'Lanchonete'],
        praia: ['Areia', 'Mar', 'Verão'], piscina: ['Água', 'Natação', 'Cloro'],
        violão: ['Cordas', 'Música', 'Dedos'], guitarra: ['Elétrica', 'Cordas', 'Banda'],
        computador: ['Teclado', 'Internet', 'Trabalho'], celular: ['Tela', 'Ligação', 'Bolso']
    };
    let game = null;
    let timer = null;
    let botTimer = null;
    const rooms = [];

    function getPanel() { return document.getElementById('impostorPanel'); }
    function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function tx(key, fallback, replacements = {}) { const value = typeof window.t === 'function' ? window.t(key, replacements) : key; return value === key ? fallback : value; }
    function isEnglish() { return typeof window.getCurrentLanguage === 'function' ? window.getCurrentLanguage() === 'en' : document.documentElement.lang === 'en'; }
    function getCurrentUser() { const name = (window.currentUserName || localStorage.getItem('userProfileName') || 'Você').trim() || 'Você'; const avatar = localStorage.getItem('userAvatar') || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&size=96`; return { name, avatar }; }
    function playerName(index) { return index === 0 ? getCurrentUser().name : `Jogador ${index + 1}`; }
    function playerAvatar(index) { if (index === 0) return getCurrentUser().avatar; const name = game?.mode === 'people' ? `Jogador ${index + 1}` : `Bot ${index}`; return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=475569&color=fff&size=96`; }
    function playerTitle(index) { if (index === 0) return getCurrentUser().name; return game?.mode === 'people' ? `Jogador ${index + 1}` : `Bot ${index}`; }
    function show() {
        const panel = getPanel();
        if (!panel) return;
        const menuScreen = document.getElementById('gamesMenuScreen');
        const gameShell = document.getElementById('gameShellScreen');
        const title = document.querySelector('.game-shell-title-wrap strong');
        const status = document.getElementById('chessStatusText');
        if (menuScreen) menuScreen.hidden = true;
        if (gameShell) gameShell.hidden = false;
        if (title) title.textContent = tx('game_impostor_title', 'Jogo do Impostor');
        if (status) status.textContent = `${tx('game_impostor_title', 'Jogo do Impostor')} · ${tx('game_room_available', 'Salas disponíveis')}`;
        const hideClassic = ['.chess-room-creator', '.chess-opponent-panel', '#chessRoomList', '#tttRoomList', '#chessPanel', '.game-stage'];
        hideClassic.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) element.style.display = 'none';
        });
        panel.hidden = false;
        document.getElementById('chessPanel')?.setAttribute('hidden', '');
        document.getElementById('checkersPanel')?.setAttribute('hidden', '');
        document.getElementById('chessRoomList')?.setAttribute('hidden', '');
        document.getElementById('tttRoomList')?.setAttribute('hidden', '');
        document.querySelector('.chess-opponent-panel')?.setAttribute('hidden', '');
        document.querySelector('.chess-room-creator')?.setAttribute('hidden', '');
        renderLobby();
    }
    function renderLobby() {
        const panel = getPanel();
        panel.innerHTML = `<div class="impostor-card">
            <div class="impostor-header"><div><h4>${tx('game_impostor_title', 'Jogo do Impostor')}</h4><p>${tx('game_impostor_description', 'A maioria recebe a Palavra A; apenas um jogador recebe a Palavra B. Dê uma única palavra de dica, vote e elimine os suspeitos.')}</p></div></div>
            <div class="impostor-create-room"><label for="impostorRoomMode">${tx('game_room_play_with', 'Jogar com')}</label><select id="impostorRoomMode" class="impostor-select"><option value="bots">${tx('game_room_bots', 'Bots')}</option><option value="people">${tx('game_room_people', 'Pessoas')}</option></select><button id="impostorCreateRoomBtn" class="impostor-primary" type="button"><i class="fas fa-plus"></i> ${tx('games_room_create_room', 'Criar sala')}</button></div>
            <div class="impostor-room-list"><h5>${tx('game_room_available', 'Salas disponíveis')}</h5>${rooms.length ? rooms.map(room => `<div class="impostor-room"><div><strong>${escapeHtml(room.id)}</strong><span class="impostor-muted">${room.mode === 'bots' ? tx('game_room_you_and_bots', 'Você + cinco bots') : tx('game_room_six_players', 'Seis jogadores')}</span></div><div class="impostor-room-actions"><button class="impostor-primary impostor-join-room" type="button" data-room-id="${escapeHtml(room.id)}">${tx('games_room_join', 'Entrar')}</button><button class="impostor-secondary impostor-view-room" type="button" data-room-id="${escapeHtml(room.id)}">${tx('games_room_visualize', 'Visualizar')}</button><button class="impostor-danger impostor-delete-room" type="button" data-room-id="${escapeHtml(room.id)}">${tx('game_room_delete', 'Apagar sala')}</button></div></div>`).join('') : `<p class="impostor-muted">${tx('game_room_none', 'Nenhuma sala disponível.')}</p>`}</div>
        </div>`;
        panel.querySelector('#impostorCreateRoomBtn').addEventListener('click', createRoom);
        panel.querySelectorAll('.impostor-join-room').forEach(button => button.addEventListener('click', () => startGame(button.dataset.roomId)));
        panel.querySelectorAll('.impostor-view-room').forEach(button => button.addEventListener('click', () => viewRoom(button.dataset.roomId)));
        panel.querySelectorAll('.impostor-delete-room').forEach(button => button.addEventListener('click', () => deleteRoom(button.dataset.roomId)));
    }
    function createRoom() {
        const roomId = `IMP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        const mode = document.getElementById('impostorRoomMode')?.value || 'bots';
        rooms.push({ id: roomId, mode });
        renderLobby();
    }
    function deleteRoom(roomId) {
        const roomIndex = rooms.findIndex(room => room.id === roomId);
        if (roomIndex === -1) return;
        const removeRoom = () => {
            rooms.splice(roomIndex, 1);
            renderLobby();
        };
        if (typeof window.openRoomDeleteDialog === 'function') window.openRoomDeleteDialog(removeRoom);
        else removeRoom();
    }
    function viewRoom(roomId) {
        const room = rooms.find(item => item.id === roomId);
        if (!room) return;
        const panel = getPanel();
        panel.innerHTML = `<div class="impostor-card"><div class="impostor-header"><div><h4>Sala ${escapeHtml(room.id)}</h4><p>Visualização da partida</p></div></div><div class="impostor-room-preview"><strong>${room.mode === 'bots' ? 'Você + cinco bots' : 'Sala para seis pessoas'}</strong><span class="impostor-muted">A partida ainda não começou.</span></div><button id="impostorBackLobbyBtn" class="impostor-secondary" type="button">Voltar às salas</button></div>`;
        panel.querySelector('#impostorBackLobbyBtn').addEventListener('click', renderLobby);
    }
    function startGame(roomId) {
        const room = rooms.find(item => item.id === roomId) || { id: roomId, mode: 'bots' };
        const humanCount = room.mode === 'people' ? TOTAL_PLAYERS : 1;
        const pairs = getWordPairs();
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const impostorIndex = Math.floor(Math.random() * TOTAL_PLAYERS);
        game = { humanCount, impostorIndex, commonWord: pair[0], impostorWord: pair[1], clues: [], usedClues: [], activePlayers: Array.from({ length: TOTAL_PLAYERS }, (_, index) => index), eliminated: [], round: 0, turnIndex: 0, seconds: ROUND_SECONDS, ended: false, mode: room.mode };
        game.roomId = room.id || `IMP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
        renderPrivateWord();
    }
    function renderPrivateWord() {
        const panel = getPanel();
        panel.innerHTML = `<div class="impostor-card"><div class="impostor-header"><div><h4>${tx('games_room_room_label', 'Sala')} ${escapeHtml(game.roomId)}</h4><p>${tx('game_impostor_word_private', 'Memorize sua palavra. Cada jogador recebe uma palavra específica.')}</p></div></div>
            <div class="impostor-private-word"><span>${tx('game_impostor_your_word', 'Sua palavra')}</span><strong>${escapeHtml(game.impostorIndex === 0 ? game.impostorWord : game.commonWord)}</strong></div>
            <div class="impostor-reveal-list">${Array(TOTAL_PLAYERS).fill(null).map((_, index) => `<div class="impostor-player"><img class="impostor-avatar" src="${escapeHtml(playerAvatar(index))}" alt=""><div><strong>${escapeHtml(playerTitle(index))}${index >= game.humanCount ? ' (bot)' : ''}</strong><span class="impostor-muted">${tx('game_impostor_private_word', 'Palavra privada')}</span></div></div>`).join('')}</div>
            <button id="impostorReadyBtn" class="impostor-primary" type="button">${tx('game_impostor_start_round', 'Entendi, começar rodada')}</button></div>`;
        panel.querySelector('#impostorReadyBtn').addEventListener('click', startRound);
    }
    function clearRoundTimers() { clearInterval(timer); clearTimeout(botTimer); }
    function getPlayerWord(index) { return index === game.impostorIndex ? game.impostorWord : game.commonWord; }
    function getClues(word) { const clues = isEnglish() ? [] : (CLUES_BY_WORD[word] || []); const generic = isEnglish() ? ['Animal', 'Fur', 'Nature', 'Everyday', 'Living thing', 'Object'] : ['Animal', 'Objeto', 'Cotidiano', 'Natureza', 'Utilidade', 'Formato']; return [...clues, ...generic]; }
    function getWordPairs() { return isEnglish() ? WORD_PAIRS_EN : WORD_PAIRS; }
    function normalizeClue(clue) { return String(clue || '').trim().toLocaleLowerCase('pt-BR'); }
    function hasUsedClue(clue) { return game.usedClues.includes(normalizeClue(clue)); }
    function botClue(index) {
        const clues = index === game.impostorIndex
            ? ['Animal', 'Pelo', 'Mamífero', 'Natureza', 'Cotidiano', 'Ser vivo']
            : getClues(getPlayerWord(index));
        const availableClues = clues.filter(clue => !hasUsedClue(clue));
        return availableClues[(index + game.round) % availableClues.length] || 'Comum';
    }
    function startRound() {
        clearRoundTimers();
        game.round += 1;
        game.turnIndex = 0;
        game.clues = Array(TOTAL_PLAYERS).fill('');
        game.usedClues = [];
        renderTurn();
    }
    function renderTurn() {
        const panel = getPanel();
        const index = game.activePlayers[game.turnIndex];
        const isBot = index >= game.humanCount;
        game.seconds = ROUND_SECONDS;
        game.clues[index] = isBot ? botClue(index) : '';
        if (isBot) game.usedClues.push(normalizeClue(game.clues[index]));
        panel.innerHTML = `<div class="impostor-card"><div class="impostor-header"><div class="impostor-active-player"><img class="impostor-avatar impostor-avatar-large" src="${escapeHtml(playerAvatar(index))}" alt=""><div><h4>${tx('game_round', 'Rodada {{round}}', { round: game.round })}: ${tx('game_hangman_turn', 'vez de')} ${escapeHtml(playerTitle(index))}${isBot ? ' (bot)' : ''}</h4><p>${isBot ? tx('game_impostor_bot_clue', 'O bot está escolhendo uma dica para a palavra dele.') : tx('game_impostor_player_clue', 'Escolha uma dica relacionada à sua palavra.')}</p></div></div><div class="impostor-timer">00:30</div></div>
            <div class="impostor-round-meta"><span>${tx('game_impostor_your_word', 'Palavra de')} ${escapeHtml(playerTitle(index))}</span><strong>${escapeHtml(getPlayerWord(index))}</strong></div>
                <div class="impostor-clue-list">${game.activePlayers.map(clueIndex => `<div class="impostor-player"><img class="impostor-avatar" src="${escapeHtml(playerAvatar(clueIndex))}" alt=""><div><strong>${escapeHtml(playerTitle(clueIndex))}${clueIndex >= game.humanCount ? ' (bot)' : ''}</strong><span class="impostor-clue">${game.clues[clueIndex] ? escapeHtml(game.clues[clueIndex]) : tx('game_impostor_waiting_clue', 'Aguardando dica...')}</span></div></div>`).join('')}</div>
                ${isBot ? `<p class="impostor-muted">${tx('game_impostor_bot_turn', 'A vez do bot avança automaticamente.')}</p>` : `<label for="impostorClue">${tx('game_clue_one_word', 'Uma palavra de dica')}</label><input id="impostorClue" class="impostor-clue-select" type="text" maxlength="24" autocomplete="off" placeholder="${tx('game_choose_clue', 'Escolha uma palavra...')}"><p class="impostor-muted">${tx('game_unique_clue', 'Não repita uma dica já usada.')}</p><button id="impostorClueBtn" class="impostor-primary" type="button">${tx('game_send_clue', 'Enviar dica')}</button>`}</div>`;
        if (isBot) botTimer = setTimeout(advanceTurn, 1000);
        else panel.querySelector('#impostorClueBtn').addEventListener('click', () => {
            const clue = panel.querySelector('#impostorClue').value.trim();
            const feedback = panel.querySelector('.impostor-muted');
            if (!clue || /\s/.test(clue)) { if (feedback) feedback.textContent = tx('game_enter_one_word', 'Digite uma única palavra.'); return; }
            if (hasUsedClue(clue)) { if (feedback) feedback.textContent = tx('game_clue_used', 'Essa dica já foi usada. Escolha outra.'); return; }
            game.clues[index] = clue;
            game.usedClues.push(normalizeClue(clue));
            advanceTurn();
        });
        timer = setInterval(() => { game.seconds -= 1; const timerEl = getPanel()?.querySelector('.impostor-timer'); if (timerEl) timerEl.textContent = `00:${String(Math.max(0, game.seconds)).padStart(2, '0')}`; if (game.seconds <= 0) advanceTurn(); }, 1000);
    }
    function advanceTurn() { clearRoundTimers(); if (game.turnIndex >= game.activePlayers.length - 1) renderVoting(); else { game.turnIndex += 1; renderTurn(); } }
    function renderRound() {
        renderVoting();
    }
    function renderVoting() {
        const panel = getPanel();
            panel.innerHTML = `<div class="impostor-card"><div class="impostor-header"><div><h4>${tx('game_impostor_vote_title', 'Acusação e votação da rodada {{round}}', { round: game.round })}</h4><p>${tx('game_impostor_vote_description', 'Escolha um jogador, ou “Não sei” para abrir outra rodada de dicas.')}</p></div></div><div class="impostor-clue-list">${game.activePlayers.map(index => `<div class="impostor-player"><strong>${escapeHtml(playerTitle(index))}${index >= game.humanCount ? ' (bot)' : ''}</strong><span class="impostor-clue">${escapeHtml(game.clues[index])}</span></div>`).join('')}</div>${game.eliminated.length ? `<p class="impostor-muted">${tx('game_impostor_eliminated', 'Eliminados: {{players}}', { players: game.eliminated.map(index => playerTitle(index)).join(', ') })}</p>` : ''}<div class="impostor-vote"><label for="impostorVote">${tx('game_impostor_who', 'Quem é o impostor?')}<select id="impostorVote" class="impostor-vote-select"><option value="">${tx('game_choose_clue', 'Escolha uma opção...')}</option><option value="-1">${tx('game_dont_know', 'Não sei')}</option>${game.activePlayers.map(index => `<option value="${index}">${escapeHtml(playerTitle(index))}${index >= game.humanCount ? ' (bot)' : ''}</option>`).join('')}</select></label><button id="impostorVoteBtn" class="impostor-primary" type="button">${tx('game_confirm_vote', 'Confirmar voto')}</button></div><div id="impostorFeedback" class="impostor-muted"></div></div>`;
        panel.querySelector('#impostorVoteBtn').addEventListener('click', finishVoting);
    }
    function finishVoting() {
        if (!game || game.ended) return;
        const value = document.getElementById('impostorVote')?.value;
        if (value === '') { const feedback = document.getElementById('impostorFeedback'); if (feedback) feedback.textContent = tx('game_impostor_choose_vote', 'Escolha um jogador ou “Não sei”.'); return; }
        const vote = Number(value);
        if (vote === -1) { startRound(); return; }
        if (vote !== game.impostorIndex) {
            game.activePlayers = game.activePlayers.filter(index => index !== vote);
            game.eliminated.push(vote);
            const remainingCivilians = game.activePlayers.filter(index => index !== game.impostorIndex).length;
            if (remainingCivilians <= 1) { finishGame(false); return; }
            startRound();
            return;
        }
        finishGame(true);
    }
    function finishGame(civiliansWon) {
        if (!game || game.ended) return;
        game.ended = true; game.civiliansWon = civiliansWon; clearRoundTimers();
        if (!game.scored) {
            const scores = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}');
            const score = scores[getCurrentUser().name] || { points: 0, wins: 0, losses: 0 };
            const userWon = game.impostorIndex === 0 ? !civiliansWon : civiliansWon;
            if (userWon) { score.points += 3; score.wins += 1; } else { score.losses += 1; }
            scores[getCurrentUser().name] = score;
            localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
            window.dispatchEvent(new CustomEvent('impostorScoreUpdated', { detail: score }));
            game.scored = true;
        }
        const panel = getPanel();
        panel.innerHTML = `<div class="impostor-card"><div class="impostor-header"><div><h4>${civiliansWon ? tx('game_impostor_found', 'Você descobriu o impostor!') : tx('game_impostor_won', 'O impostor venceu!')}</h4><p>${civiliansWon ? tx('game_impostor_correct_round', 'A resposta correta foi encontrada na rodada {{round}}.', { round: game.round }) : tx('game_impostor_survived', 'O impostor sobreviveu até ficar em maioria.')}</p></div></div><div class="impostor-result${civiliansWon ? '' : ' loss'}"><strong>${tx('game_impostor_revealed', 'O impostor era {{player}}.', { player: escapeHtml(playerTitle(game.impostorIndex)) })}</strong><br>${tx('game_impostor_group_word', 'Palavra do grupo')}: ${escapeHtml(game.commonWord)} · ${tx('game_impostor_word', 'Palavra do impostor')}: ${escapeHtml(game.impostorWord)}</div><button id="impostorAgainBtn" class="impostor-primary" type="button"><i class="fas fa-rotate-left"></i> ${tx('game_room_back', 'Voltar às salas')}</button></div>`;
        panel.querySelector('#impostorAgainBtn').addEventListener('click', renderLobby);
    }
    window.addEventListener('languageChanged', () => {
        if (!getPanel()?.hidden) {
            if (game && !game.ended) renderTurn();
            else if (game?.ended) { const result = game.civiliansWon; game.ended = false; finishGame(result); }
            else renderLobby();
        }
    });
    window.ImpostorGame = { show, viewRoom };
}());
