(function () {
    'use strict';

    const WORDS = `abacate abelha abrigo acidente acorde acucar adivinha aeroporto amizade ampulheta anel anfora anjo antena apartamento aquario arvore armario artista asfalto atleta aviao aventura avestruz azul bacalhau bagagem balanco banana bandeira banheiro barco barraca batalha biblioteca bicicleta bilhete biologia biscoito bolo borboleta bosque brinquedo bruxa cabide cabelo caderno cadeira caju calendario cama camaleao caminho camisa campainha campo caneta caneca canela cantor capacete caracol caramelo carteira carro castelo cebola cenoura cinema cidade cigarra ciencia cobertor coelho colher cozinha colegio computador coragem coruja cachorro cachorroa coxinha crocodilo cristal quadro cubo cuidado cupcake danca dado desafio deserto desenho diamante dinossauro domingo dragao elefante elevador embrulho emprego energia enxada escada escola escorregador escritor espelho espada estadio estrela estrada fabrica familia fantasia fazenda fevereiro ferro festa foguete formiga floresta fotografia garfo garagem gato gaveta geleia girafa globo gola gorila governo gravata guitarra hamburguer helicopetro horario hospital hotel inverno ilha imagem ingresso inseto instrumento internet jardim janela jiboia jornal joelho foguete lagarta lago lampada laranja lavanda leao legenda livro limao limonada lingua lobo mochila macarrao madeira madrinha magia mala mamifero manga mapa maquina mar maratona margarida mercado melancia melancia melodia memoria menino mentira mesa meteorito milho mochila modelo moeda montanha morcego morango motorista musica navio natureza nectarina neve noticia numero oceano oculos oficina onca onda operacao oracao ouvido ovo padaria palacio panela papel parque passaro passeio pato pedreiro pedra peixe pelicula perfume piano picole pintura pipoca pirata piscina planeta pluma ponte porta presente primavera professor projetor queijo quimica raposa rato receita recreio rede relogio revista rio robalo robo roupa rua sabado safari sala sandalia sapato satelite segredo semana serpente sorvete sofa sol sombra telefone teatro teclado televisao tempestade tesoura tigre tinta tomate tornado trabalho trator travesseiro trem triangulo tubarao universo urso uva vaca vaga vagalume viagem vento vestido vidro violao vulcao xadrez xampu zebra zoologico abacaxi academia algodao alimento almofada amendoim aniversario aparelho aquecimento aquila arvoredo aspirador astronauta atencao avenida baleia balde bambu banco bateria batata beija-flor besouro biblioteca bilhar bloco boia botao boteco brigadeiro bule buraco buzina cacau cacto cachorro-quente cafe caixote calculadora caminhao campainha canario canudo capivara caranguejo carnaval cascata cenoura churrasqueira chocolate chuveiro cobras comercio conselho constelacao contrato controle coracao coroa corredor cortina costura cristalino dicionario diploma disco distancia divisa documento domingo doninha dourado dinamite embalagem enciclopedia engenheiro envelope equilibrio escova escultura esquilo escritorio espantalho espirito espumante estante extintor farinha farol fechadura felicidade ferias ferramenta festival figueira filtro flamengo flor florescente fotografia frescura frigideira furacao galinha gaviao geladeira geografia gigante girassol granizo grama grampeador gravador gravidade heroi horta identididade imigrante impressora incendio infancia informacao jacare jasmim joaninha jornalista kiwi laboratorio lagosta lancheira leopardo liberdade lixeira locadora luneta macaco maracuja marcador marinheiro mascara matematica medusa mergulho mensagem microfone minhoquinha monstro navidade navegador neblina novelista observatorio oceania oleo operario organico origem osso padrao palito pandeiro papagaio parafuso pastel patinete pavimento pegador pimenta pincel planeta plantacao plateia poltrona porcelana prefeitura princesa professorado promessa punhal quebra-cabeca quiosque raciocinio raquete ratoeira rebite recorte refugio regua rendimento rinoceronte roteiro sabedoria sabonete salada salgadinho sapateiro sardinha semaforo sinal sirene sistema soprador submarino tapete tartaruga teclado telefone terremoto tijolo toalha torneira trabalho trilho trofeu tulipa uniforme vagao vassoura vendedor veludo viagem vinagre vitamina vitrine xicara zabumba` .split(/\s+/);
    const WORDS_EN = `apple apron artist airport animal answer autumn author avenue baby bakery balance banana basket beach bedroom bicycle blanket blossom bottle bridge brother building button cabin camera candle castle cat cactus calendar camel canyon carpet carrot cartoon ceiling celery center chair cheese cherry chicken circle city cloud coffee college color computer cookie copper corner costume country cousin crystal culture curtain dance danger daughter daylight desert design diamond dinner doctor dolphin dolphin eagle earth engine evening family farmer feather festival finger fire flower forest friend garden garlic glacier glass globe guitar hammer harbor helmet holiday honey horse hospital island jacket jacket jelly jewel journey jungle kettle kitchen kitten ladder lake lamp lemon library lion lizard machine magazine magnet market meadow memory melon mirror monkey morning mountain movie muffin museum music napkin nature needle notebook ocean office orange orchard oven painter palace paper parent park parrot party pencil people pepper piano picnic pillow pilot planet pocket potato pumpkin rabbit rainbow recipe river robot rocket room school scissors season shadow sheep shirt sidewalk singer sister sketch snow soccer station stone storm strawberry student summer sunset table teacher temple theater thunder ticket tiger tomato toothbrush tower train travel treasure triangle turtle umbrella uncle universe vacation valley village violin visitor volcano wallet waterfall weather window winter woman wood world writer zebra adventure airplane almond anchor angel aquarium arrow attic avocado bakery balloon barrel basement battery beach beauty blanket border bracelet broccoli bucket butterfly button candle canyon captain carpet castle ceiling cellar chain chalk champion channel chapter circle citizen climate closet coconut compass concert cookie coral cotton country crystal curtain diamond diary dinosaur doctor dragon drawer dream dress eagle earthquake elbow electric elephant elevator emerald envelope engine evening feather field fireplace fishing flag flower football fountain freedom garage garden gate giraffe glacier gold grape grass grocery guitar hallway hammer harbor harvest helmet highway history holiday honey hotel island jacket jelly jewel journal kitchen kitten ladder lantern laptop laundry leader lemon lemonade lighthouse lightning lobster machine magazine marble market meadow medicine melody message microphone midnight milk mirror monkey morning movie muffin mushroom necklace needle neighbor notebook ocean onion opera orange orchard oven palace pancake paper parade parent peanut pencil pepper picnic pillow pilot pizza planet pocket popcorn potato prairie princess pumpkin puzzle rabbit radio rainbow recipe restaurant ribbon river rocket roof salad sandwich school scooter season shadow shelter shirt sidewalk silver singer sister sketch ski sky smile soccer soldier spider spring squirrel station statue steam strawberry stream street summer sunflower sunset teacher temple theater thunder ticket tiger tomato toothbrush tower traffic train treasure triangle tunnel turtle umbrella uniform universe valley village violin visitor volcano wallet waterfall weather window winter wizard woman wood writer yogurt zebra`.split(/\s+/);
    const WORDS_EN_EXTRA = `actor address adult advice afternoon agency agenda album alley alphabet amount ancient ankle annual answer ant apartment apple april arch army arrival article artist aspirin athlete audience author autumn bakery balcony ballot bamboo bargain basement battle bedroom beginner bicycle biology blanket border breakfast brother budget buffalo cabinet cactus calculator calendar canyon captain carpet carrier cartoon category ceiling century cereal chamber channel charity chimney chocolate choice church circle citizen classic climate closet clothing coach coast column comfort command community company concert condition contact cookie country county courage cousin creature credit cricket culture customer cylinder damage daughter decade decision delivery dentist departure detail device diamond dictionary direction disease display distance district document dollar drama driver education effort elbow election energy entrance episode equality equipment error estate exercise experiment expert family fantasy farmer fashion feather February feedback fiction field figure fireplace flight forecast fortune frame freedom friendship fuel gallery garbage garlic gasoline gateway generation geography gesture grocery growth guidance hallway harmony harvest headline health highway history hobby holiday horizon humor husband idea illness image industry ingredient insect insurance interest interview invention jacket January journey judge keyboard kingdom knowledge language lawyer leather library license lifetime location magazine manager manner marathon medicine meeting member metal method middle minute miracle mixture moment monitor morning muscle mystery nation neighbor network novel nursery object occasion package passenger pattern payment peanut penalty perfume period phrase physics picnic picture pioneer platform pleasure poetry police poverty practice president privacy process product program promise pumpkin purpose puzzle quality quarter rabbit railway reading reality reason receipt record recycle region relationship reporter research resource reward rhythm sandwich science screen season service shadow shelter shoulder signal silence silver singer society software soldier solution stadium strategy structure success suggestion supply surprise symbol teacher technology temperature theater theory thought thunder ticket tomorrow topic tourism tradition traffic treasure treatment uncle uniform union update useful valley variety vehicle victory video village violin virtue volume warning weather weekend welcome western wisdom witness`.split(/\s+/);
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const STORAGE_KEY = 'ulivre_hangman_rooms';
    const STATE_KEY = 'ulivre_hangman_states';
    const SCORE_KEY = 'ulivre_hangman_scores';
    const TURN_SECONDS = 30;
    let game = null;
    let turnTimer = null;
    let botTimer = null;
    function isEnglish() { return typeof window.getCurrentLanguage === 'function' ? window.getCurrentLanguage() === 'en' : document.documentElement.lang === 'en'; }
    function getWordBank() { return isEnglish() ? [...WORDS_EN, ...WORDS_EN_EXTRA] : WORDS; }

    function getPanel() { return document.getElementById('hangmanPanel'); }
    function escapeHtml(value) { return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
    function tx(key, fallback, replacements = {}) { const value = typeof window.t === 'function' ? window.t(key, replacements) : key; return value === key ? fallback : value; }
    function normalize(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
    function getUserName() { return (window.currentUserName || localStorage.getItem('userProfileName') || 'Você').trim() || 'Você'; }
    function levelLabel(level) { return ({ iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado', mestre: 'Mestre' }[level] || 'Intermediário'); }
    function readRooms() { try { const rooms = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(rooms) ? rooms.filter(room => window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true) : []; } catch (_) { return []; } }
    function writeRooms(rooms) { let existing = []; try { existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (_) {} const otherScopes = Array.isArray(existing) ? existing.filter(room => !(window.UniversidadeLivreGameScope?.matchesRoom(room) ?? true)) : []; localStorage.setItem(STORAGE_KEY, JSON.stringify([...otherScopes, ...rooms].slice(-20))); }
    function readStates() { try { const states = JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); return states && typeof states === 'object' ? states : {}; } catch (_) { return {}; } }
    function writeState(roomId, state) { const states = readStates(); states[roomId] = state; localStorage.setItem(STATE_KEY, JSON.stringify(states)); }
    function readState(roomId) { return readStates()[roomId] || null; }
    function roomId() { return `FOR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`; }
    function maxMisses(level) { return ({ iniciante: 8, intermediario: 6, avancado: 5, mestre: 4 }[level] || 6); }
    function randomWord(level = 'intermediario') {
        const bank = getWordBank();
        const candidates = bank.filter(word => level === 'iniciante' ? word.length <= 6 : level === 'mestre' ? word.length >= 8 : true);
        return (candidates[Math.floor(Math.random() * candidates.length)] || bank[0]).replace(/[^a-z]/g, '');
    }
    function clearTimers() { clearInterval(turnTimer); clearTimeout(botTimer); turnTimer = null; botTimer = null; }
    function clearGame() { clearTimers(); game = null; }
    function readScores() { try { const scores = JSON.parse(localStorage.getItem(SCORE_KEY) || '{}'); return scores && typeof scores === 'object' ? scores : {}; } catch (_) { return {}; } }
    function getScore(name) { return readScores()[name] || { points: 0, wins: 0, games: 0 }; }
    function recordScore(name, points, result) {
        const scores = readScores();
        const score = scores[name] || { points: 0, wins: 0, games: 0 };
        score.points = Math.max(0, score.points + points);
        if (result === 'win') { score.wins += 1; score.games += 1; }
        if (result === 'loss') score.games += 1;
        scores[name] = score;
        localStorage.setItem(SCORE_KEY, JSON.stringify(scores));
        window.dispatchEvent(new CustomEvent('hangmanScoreUpdated', { detail: score }));
    }

    function show() {
        const panel = getPanel();
        if (!panel) return;
        document.getElementById('gamesMenuScreen')?.setAttribute('hidden', '');
        document.getElementById('gameShellScreen')?.removeAttribute('hidden');
        document.getElementById('chessPanel')?.setAttribute('hidden', '');
        document.getElementById('impostorPanel')?.setAttribute('hidden', '');
        document.getElementById('checkersPanel')?.setAttribute('hidden', '');
        document.querySelectorAll('.chess-room-creator, .chess-opponent-panel, #chessRoomList, #tttRoomList, .game-stage').forEach(element => { element.hidden = true; element.style.display = 'none'; });
        panel.hidden = false;
        const title = document.querySelector('.game-shell-title-wrap strong');
        const status = document.getElementById('chessStatusText');
        if (title) title.textContent = tx('game_hangman_title', 'Jogo da Forca');
        if (status) status.textContent = `${tx('game_hangman_title', 'Jogo da Forca')} · ${tx('game_room_available', 'Salas disponíveis')}`;
        renderLobby();
    }

    function renderLobby() {
        const panel = getPanel();
        const rooms = readRooms();
        panel.innerHTML = `<div class="hangman-card">
            <div class="hangman-header"><div><h4>${tx('game_hangman_title', 'Jogo da Forca')}</h4><p>${tx('game_hangman_description', 'Adivinhe a palavra antes que o desenho seja completado. Mais de {{count}} palavras em português.', { count: getWordBank().length })}</p></div></div>
            <div class="hangman-create"><label class="hangman-field">${tx('game_hangman_type', 'Tipo de sala')}<select id="hangmanMode" class="hangman-select"><option value="bot">${tx('game_hangman_bot', 'Jogar com bot')}</option><option value="community">${tx('game_hangman_community', 'Comunidade')}</option></select></label><label class="hangman-field">${tx('game_room_capacity', 'Capacidade')}<select id="hangmanCapacity" class="hangman-select"><option value="2">2 ${tx('game_room_players', 'jogadores')}</option><option value="3">3 ${tx('game_room_players', 'jogadores')}</option><option value="4" selected>4 ${tx('game_room_players', 'jogadores')}</option><option value="5">5 ${tx('game_room_players', 'jogadores')}</option><option value="6">6 ${tx('game_room_players', 'jogadores')}</option></select></label><label class="hangman-field">${tx('game_hangman_level', 'Nível do bot')}<select id="hangmanDifficulty" class="hangman-select"><option value="iniciante">${tx('games_room_level_beginner', 'Iniciante')}</option><option value="intermediario" selected>${tx('games_room_level_intermediate', 'Intermediário')}</option><option value="avancado">${tx('games_room_level_advanced', 'Avançado')}</option><option value="mestre">${tx('games_room_level_master', 'Mestre')}</option></select></label><button id="hangmanCreateBtn" class="hangman-primary" type="button"><i class="fas fa-plus"></i> ${tx('game_hangman_create', 'Criar sala')}</button></div>
            <div class="hangman-room-list"><h5>${tx('game_room_available', 'Salas disponíveis')}</h5>${rooms.length ? rooms.map(room => `<div class="hangman-room"><div class="hangman-room-meta"><strong>${escapeHtml(room.id)}</strong><span class="hangman-muted">${room.mode === 'bot' ? `Bot · ${levelLabel(room.difficulty)}` : tx('game_hangman_community', 'Comunidade')} · ${room.players}/${room.capacity} ${tx('game_room_players', 'jogadores')}</span></div><div class="hangman-room-actions"><button class="hangman-primary hangman-join" data-room="${escapeHtml(room.id)}" type="button">${tx('game_hangman_join', 'Entrar')}</button><button class="hangman-secondary hangman-view" data-room="${escapeHtml(room.id)}" type="button">${tx('games_room_visualize', 'Visualizar')}</button><button class="hangman-danger hangman-delete" data-room="${escapeHtml(room.id)}" type="button">${tx('game_room_delete', 'Apagar sala')}</button></div></div>`).join('') : `<p class="hangman-muted">${tx('game_room_none', 'Nenhuma sala criada ainda.')}</p>`}</div>
        </div>`;
        const difficulty = panel.querySelector('#hangmanDifficulty');
        panel.querySelector('#hangmanMode').addEventListener('change', event => { difficulty.disabled = event.target.value !== 'bot'; });
        panel.querySelector('#hangmanCreateBtn').addEventListener('click', createRoom);
        panel.querySelectorAll('.hangman-join').forEach(button => button.addEventListener('click', () => joinRoom(button.dataset.room)));
        panel.querySelectorAll('.hangman-view').forEach(button => button.addEventListener('click', () => viewRoom(button.dataset.room)));
        panel.querySelectorAll('.hangman-delete').forEach(button => button.addEventListener('click', () => deleteRoom(button.dataset.room)));
    }

    function createRoom() {
        const mode = document.getElementById('hangmanMode').value;
        const room = window.UniversidadeLivreGameScope?.decorateRoom({ id: roomId(), gameType: 'hangman', mode, capacity: Number(document.getElementById('hangmanCapacity').value), difficulty: document.getElementById('hangmanDifficulty').value, players: 1, createdBy: getUserName(), createdAt: Date.now() });
        const rooms = readRooms(); rooms.push(room); writeRooms(rooms); startRoom(room);
    }
    function deleteRoom(id) { writeRooms(readRooms().filter(room => room.id !== id)); renderLobby(); }
    function viewRoom(id) {
        const room = readRooms().find(item => item.id === id);
        const snapshot = readState(id);
        if (!room) return;
        if (!snapshot) {
            const panel = getPanel();
            panel.innerHTML = `<div class="hangman-card"><div class="hangman-header"><div><h4>${tx('games_room_room_label', 'Sala')} ${escapeHtml(room.id)}</h4><p>${tx('game_hangman_waiting', 'A partida ainda não começou.')}</p></div></div><button id="hangmanPreviewBack" class="hangman-secondary" type="button">${tx('game_room_back', 'Voltar às salas')}</button></div>`;
            panel.querySelector('#hangmanPreviewBack').addEventListener('click', renderLobby);
            return;
        }
        game = { ...snapshot, room, spectator: true };
        renderGame();
    }
    function joinRoom(id) {
        const room = readRooms().find(item => item.id === id);
        if (!room || room.players >= room.capacity) return;
        room.players += 1;
        writeRooms(readRooms().map(item => item.id === room.id ? room : item));
        startRoom(room);
    }
    function startRoom(room) {
        const participants = Array.from({ length: room.capacity }, (_, index) => ({
            name: index === 0 ? getUserName() : room.mode === 'bot' ? `Bot ${index}` : `Jogador ${index + 1}`,
            isBot: room.mode === 'bot' && index > 0,
            score: 0
        }));
        game = { room, word: randomWord(room.difficulty), guessed: [], misses: 0, ended: false, hintUsed: false, participants, activePlayer: 0, seconds: TURN_SECONDS, scored: false, botThinking: false, lastAction: tx('game_hangman_started', 'A partida começou.'), spectator: false };
        renderGame();
        startTurn();
    }
    function displayWord() { return [...game.word].map(letter => `<span>${game.guessed.includes(normalize(letter)) ? letter.toUpperCase() : '_'}</span>`).join(''); }
    function drawing() {
        const parts = ['head', 'body', 'arm-left', 'arm-right', 'leg-left', 'leg-right'];
        return `<div class="hangman-scaffold"><i class="hangman-beam"></i><i class="hangman-rope"></i><div class="hangman-person">${parts.map((part, index) => `<i class="hangman-part hangman-${part}${game.misses > index ? ' is-visible' : ''}"></i>`).join('')}</div></div>`;
    }
    function currentPlayer() { return game.participants[game.activePlayer]; }
    function advanceTurn() {
        clearTimers();
        if (!game || game.ended) return;
        game.activePlayer = (game.activePlayer + 1) % game.participants.length;
        game.seconds = TURN_SECONDS;
        renderGame();
        startTurn();
    }
    function startTurn() {
        if (!game || game.ended || game.spectator) return;
        game.seconds = TURN_SECONDS;
        const active = currentPlayer();
        game.botThinking = active.isBot;
        if (active.isBot) { game.lastAction = tx('game_hangman_bot_thinking', 'O bot está escolhendo uma letra...'); renderGame(); botTimer = setTimeout(botGuess, 900); }
        turnTimer = setInterval(() => {
            if (!game || game.ended) return;
            game.seconds -= 1;
            const timerElement = getPanel()?.querySelector('#hangmanTimer');
            if (timerElement) timerElement.textContent = `00:${String(Math.max(0, game.seconds)).padStart(2, '0')}`;
            if (game.seconds <= 0) advanceTurn();
        }, 1000);
    }
    function botGuess() {
        if (!game || game.ended || !currentPlayer().isBot) return;
        const preferred = game.room.difficulty === 'iniciante' ? 'AEIOU' : 'ESAIRNTO';
        const available = ALPHABET.map(letter => letter.toLowerCase()).filter(letter => !game.guessed.includes(letter));
        const choice = [...preferred.toLowerCase(), ...available].find(letter => available.includes(letter)) || available[0];
        game.botThinking = false;
        if (choice) { game.lastAction = `${currentPlayer().name} digitou a letra ${choice.toUpperCase()}.`; submitLetter(choice, true); }
    }
    function submitLetter(letter, fromBot = false) {
        if (!game || game.ended || game.spectator || game.guessed.includes(letter) || (!fromBot && currentPlayer().isBot)) return;
        clearTimers();
        game.guessed.push(letter);
        const player = currentPlayer();
        const correct = normalize(game.word).includes(letter);
        game.lastAction = tx('game_hangman_typed', '{{player}} digitou a letra {{letter}} e {{result}}', { player: player.name, letter: letter.toUpperCase(), result: tx(correct ? 'game_hangman_correct' : 'game_hangman_wrong', correct ? 'acertou.' : 'errou.') });
        if (correct) { player.score += 10; if (player.name === getUserName()) recordScore(player.name, 10); }
        else game.misses += 1;
        const won = [...game.word].every(character => game.guessed.includes(normalize(character)));
        if (won) finishGame(player);
        else if (game.misses >= maxMisses(game.room.difficulty)) finishGame(null);
        else { renderGame(); setTimeout(() => { if (game && !game.ended) advanceTurn(); }, fromBot ? 600 : 250); }
    }
    function submitWord() {
        if (!game || game.ended || game.spectator || currentPlayer().isBot) return;
        const input = getPanel()?.querySelector('#hangmanWordGuess');
        const guess = normalize(input?.value);
        if (!guess) return;
        clearTimers();
        if (guess === normalize(game.word)) { currentPlayer().score += 100; finishGame(currentPlayer()); return; }
        currentPlayer().score = Math.max(0, currentPlayer().score - 10);
        game.misses += 1;
        if (game.misses >= maxMisses(game.room.difficulty)) finishGame(null); else { renderGame(); setTimeout(() => { if (game && !game.ended) advanceTurn(); }, 250); }
    }
    function finishGame(winner) {
        clearTimers();
        game.ended = true;
        if (!game.scored) {
            game.participants.forEach(player => { if (player.name === getUserName()) recordScore(player.name, winner?.name === player.name ? 100 : 0, winner?.name === player.name ? 'win' : 'loss'); });
            game.scored = true;
        }
        renderGame(winner);
    }
    function renderGame() {
        const panel = getPanel();
        if (!game.spectator) writeState(game.room.id, { ...game, spectator: false });
        const won = [...game.word].every(letter => game.guessed.includes(normalize(letter)));
        const lost = game.misses >= maxMisses(game.room.difficulty);
        const active = currentPlayer();
        const keys = ALPHABET.map(letter => `<button class="hangman-key" data-letter="${letter.toLowerCase()}" type="button" ${game.guessed.includes(letter.toLowerCase()) || game.ended || active.isBot || game.spectator ? 'disabled' : ''}>${letter}</button>`).join('');
        const result = game.ended ? `<div class="hangman-result${lost ? ' loss' : ''}"><strong>${won ? tx('game_hangman_word_found', 'Palavra descoberta!') : tx('game_hangman_completed', 'A forca foi completada.')}</strong> ${tx('game_hangman_word_was', 'A palavra era')} <strong>${escapeHtml(game.word.toUpperCase())}</strong>.<br>${game.spectator ? '' : `<button id="hangmanAgain" class="hangman-primary" type="button">${tx('game_hangman_new_word', 'Nova palavra')}</button>`} <button id="hangmanBack" class="hangman-secondary" type="button">${tx('game_room_back', 'Voltar às salas')}</button></div>` : '';
        const scoreRows = game.participants.map(player => `<span>${tx('game_hangman_score', '{{player}}: {{points}} pts', { player: escapeHtml(player.name), points: player.score })}</span>`).join('');
        const playerState = active.isBot ? tx('game_hangman_bot', 'bot') : tx('game_hangman_you', 'você');
        const playerMessage = game.spectator ? tx('game_hangman_viewing', 'Você está visualizando esta partida.') : active.isBot ? (game.botThinking ? tx('game_hangman_bot_thinking', 'O bot está escolhendo uma letra...') : tx('game_hangman_bot_played', 'O bot jogou. Próximo jogador em instantes.')) : tx('game_hangman_choose', 'Escolha uma letra ou tente adivinhar a palavra inteira.');
        panel.innerHTML = `<div class="hangman-card"><div class="hangman-header"><div><h4>${tx('game_room_room_label', 'Sala')} ${escapeHtml(game.room.id)}</h4><p>${game.spectator ? tx('game_hangman_viewing', 'Você está visualizando esta partida.') : game.room.mode === 'bot' ? `Bot · ${levelLabel(game.room.difficulty)}` : tx('game_hangman_community', 'Comunidade')} · ${game.room.players}/${game.room.capacity} ${tx('game_room_players', 'jogadores')}</p></div><div class="hangman-turn-badge">${tx('game_hangman_turn', 'Vez de')} <strong>${escapeHtml(active.name)}</strong><b id="hangmanTimer">00:${String(game.seconds).padStart(2, '0')}</b></div><button id="hangmanLeave" class="hangman-secondary" type="button">${tx('game_room_back', 'Voltar às salas')}</button></div><div class="hangman-scoreboard">${scoreRows}</div><div class="hangman-round-message" aria-live="polite">${escapeHtml(game.lastAction)}</div><div class="hangman-game-layout"><div class="hangman-drawing" aria-label="Hangman">${drawing()}</div><div class="hangman-progress"><div class="hangman-word" aria-live="polite">${displayWord()}</div><div class="hangman-stats"><span>${tx('game_hangman_errors', 'Erros: {{current}}/{{total}}', { current: game.misses, total: maxMisses(game.room.difficulty) })}</span><span>${tx('game_hangman_active_player', 'Jogador ativo: {{player}}', { player: playerState })}</span></div>${!game.ended ? `<p class="hangman-muted">${playerMessage}</p>` : ''}<div class="hangman-keyboard">${keys}</div>${!active.isBot && !game.spectator && !game.ended ? `<div class="hangman-word-guess"><input id="hangmanWordGuess" class="hangman-input" type="text" maxlength="30" placeholder="${tx('game_hangman_guess_placeholder', 'Digite a palavra inteira')}"><button id="hangmanGuessWord" class="hangman-primary" type="button">${tx('game_hangman_guess_word', 'Adivinhar palavra')}</button></div>` : ''}${game.room.difficulty === 'mestre' && !game.spectator && !game.hintUsed && !game.ended ? `<button id="hangmanHint" class="hangman-secondary" type="button">${tx('game_hangman_hint', 'Usar dica')}</button>` : ''}${game.hintUsed ? `<div class="hangman-hint">${tx('game_hangman_hint_text', 'Dica: a palavra tem {{count}} letras.', { count: game.word.length })}</div>` : ''}</div></div>${result}</div>`;
        panel.querySelector('#hangmanLeave').addEventListener('click', () => { clearGame(); renderLobby(); });
        panel.querySelectorAll('.hangman-key').forEach(button => button.addEventListener('click', () => guess(button.dataset.letter)));
        panel.querySelector('#hangmanGuessWord')?.addEventListener('click', submitWord);
        panel.querySelector('#hangmanWordGuess')?.addEventListener('keydown', event => { if (event.key === 'Enter') submitWord(); });
        panel.querySelector('#hangmanHint')?.addEventListener('click', () => { game.hintUsed = true; renderGame(); });
        panel.querySelector('#hangmanAgain')?.addEventListener('click', () => { game.word = randomWord(game.room.difficulty); game.guessed = []; game.misses = 0; game.ended = false; game.hintUsed = false; game.activePlayer = 0; game.participants.forEach(player => { player.score = 0; }); renderGame(); startTurn(); });
        panel.querySelector('#hangmanBack')?.addEventListener('click', () => { clearGame(); renderLobby(); });
    }
    function guess(letter) { submitLetter(letter); }

    window.addEventListener('languageChanged', () => {
        if (game) renderGame();
        else if (!getPanel()?.hidden) renderLobby();
    });
    window.addEventListener('storage', event => {
        if (game?.spectator && event.key === STATE_KEY) {
            const snapshot = readState(game.room.id);
            if (snapshot) { game = { ...snapshot, room: game.room, spectator: true }; renderGame(); }
        }
    });

    window.HangmanGame = { show, wordCount: () => getWordBank().length };
}());
