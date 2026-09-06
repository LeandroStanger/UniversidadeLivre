document.addEventListener('click', event => {
	if (!event.target.closest('#bingoDraw')) return;
	event.preventDefault();
	event.stopImmediatePropagation();
	const activeId = sessionStorage.getItem('ulivre_bingo_active_room');
	let rooms = [];
	try { rooms = JSON.parse(localStorage.getItem('ulivre_bingo_rooms') || '[]'); } catch (_) {}
	const room = Array.isArray(rooms) ? rooms.find(item => item.id === activeId) : null;
	if (!room?.game || room.game.status !== 'playing') return;
	const drawn = Array.isArray(room.game.drawn) ? room.game.drawn : [];
	const balls = Array.from({ length: 75 }, (_, index) => index + 1);
	const available = balls.filter(number => !drawn.includes(number));
	if (!available.length) return;
	const ball = available[Math.floor(Math.random() * available.length)];
	room.game.balls = balls;
	room.game.drawn = [...drawn, ball];
	room.game.lastBall = ball;
	room.game.message = `Número sorteado: ${ball}`;
	const cards = room.game.cards || {};
	const marked = room.game.marked || {};
	Object.entries(cards).forEach(([id, card]) => {
		const index = Array.isArray(card) ? card.indexOf(ball) : -1;
		if (index >= 0) marked[id] = [...new Set([...(marked[id] || [12]), index])];
	});
	room.game.marked = marked;
	localStorage.setItem('ulivre_bingo_rooms', JSON.stringify(rooms));
	window.BingoGame?.show();
}, true);

const bingoPanelElement = document.getElementById('bingoPanel');
if (bingoPanelElement) {
	new MutationObserver(() => {
		const board = bingoPanelElement.querySelector('.bingo-board');
		if (!board || board.querySelector('[data-bingo-extra-cell]') || board.querySelectorAll('.bingo-cell').length !== 24) return;
		let rooms = [];
		try { rooms = JSON.parse(localStorage.getItem('ulivre_bingo_rooms') || '[]'); } catch (_) {}
		const activeId = sessionStorage.getItem('ulivre_bingo_active_room');
		const room = Array.isArray(rooms) ? rooms.find(item => item.id === activeId) : null;
		const player = sessionStorage.getItem('ulivre_bingo_player_id');
		const card = room?.game?.cards?.[player];
		if (!room || !card) return;
		const used = new Set(card);
		let extra = 1;
		while (used.has(extra)) extra += 1;
		card.push(extra);
		room.game.cards[player] = card;
		localStorage.setItem('ulivre_bingo_rooms', JSON.stringify(rooms));
		const cell = document.createElement('button');
		cell.className = 'bingo-cell';
		cell.type = 'button';
		cell.dataset.bingoIndex = '24';
		cell.dataset.bingoExtraCell = 'true';
		cell.textContent = String(extra);
		cell.addEventListener('click', () => {
			if (!room.game.drawn?.includes(extra) || room.game.status !== 'playing') return;
			room.game.marked[player] = [...(room.game.marked[player] || []), 24];
			localStorage.setItem('ulivre_bingo_rooms', JSON.stringify(rooms));
			window.BingoGame?.show();
		});
		board.appendChild(cell);
	}).observe(bingoPanelElement, { childList: true, subtree: true });
}
function renderDrawnNumbers() {
	const side = document.querySelector('#bingoPanel .bingo-side');
	if (!side) return;
	let rooms = [];
	try { rooms = JSON.parse(localStorage.getItem('ulivre_bingo_rooms') || '[]'); } catch (_) {}
	const activeId = sessionStorage.getItem('ulivre_bingo_active_room');
	const room = Array.isArray(rooms) ? rooms.find(item => item.id === activeId) : null;
	const drawn = room?.game?.drawn || [];
	let list = side.querySelector('.bingo-drawn-list');
	if (!list) { list = document.createElement('div'); list.className = 'bingo-drawn-list'; side.appendChild(list); }
	const signature = drawn.join(',');
	if (list.dataset.signature === signature) return;
	list.dataset.signature = signature;
	list.innerHTML = `<strong>Números sorteados (${drawn.length})</strong><div>${drawn.length ? drawn.map(number => `<span>${number}</span>`).join('') : '<small>Nenhum número sorteado ainda.</small>'}</div>`;
}
function renderBingoOutcome() {
	const status = document.querySelector('#bingoPanel .bingo-status');
	if (!status) return;
	let rooms = [];
	try { rooms = JSON.parse(localStorage.getItem('ulivre_bingo_rooms') || '[]'); } catch (_) {}
	const activeId = sessionStorage.getItem('ulivre_bingo_active_room');
	const room = Array.isArray(rooms) ? rooms.find(item => item.id === activeId) : null;
	if (room?.game?.status !== 'finished') return;
	const name = localStorage.getItem('userProfileName') || 'Jogador';
	const message = String(room.game.message || '');
	const won = message.startsWith(name);
	const outcome = won ? `Você ganhou! ${message}` : `Você perdeu. ${message}`;
	const signature = `${room.id}:${message}`;
	if (status.dataset.outcomeSignature === signature) return;
	status.dataset.outcomeSignature = signature;
	status.classList.remove('bingo-outcome-win', 'bingo-outcome-loss');
	status.classList.add(won ? 'bingo-outcome-win' : 'bingo-outcome-loss');
	status.textContent = outcome;
}
function resolveFullBingo() {
	let rooms = [];
	try { rooms = JSON.parse(localStorage.getItem('ulivre_bingo_rooms') || '[]'); } catch (_) {}
	const activeId = sessionStorage.getItem('ulivre_bingo_active_room');
	const room = Array.isArray(rooms) ? rooms.find(item => item.id === activeId) : null;
	if (!room?.game || room.game.status !== 'playing') return;
	const cards = room.game.cards || {};
	const marked = room.game.marked || {};
	const winnerId = room.players?.find(player => {
		const card = cards[player.id] || [];
		const marks = new Set(marked[player.id] || []);
		return card.length >= 25 && Array.from({ length: 25 }, (_, index) => index).every(index => marks.has(index));
	})?.id;
	if (!winnerId) return;
	const winner = room.players.find(player => player.id === winnerId);
	room.game.status = 'finished';
	room.game.winnerId = winnerId;
	room.game.message = `${winner?.name || 'Jogador'} fez bingo com a cartela completa!`;
	room.game.history = [room.game.message, ...(room.game.history || [])].slice(0, 8);
	const currentPlayerId = sessionStorage.getItem('ulivre_bingo_player_id');
	if (winnerId === currentPlayerId) {
		let wallets = {};
		try { wallets = JSON.parse(localStorage.getItem('ulivre_bingo_wallets') || '{}'); } catch (_) {}
		const name = localStorage.getItem('userProfileName') || 'Jogador';
		const current = wallets[name] || { coins: 0, wins: 0, rounds: 0 };
		wallets[name] = { ...current, coins: Math.max(0, Number(current.coins || 0)) + 80, wins: Number(current.wins || 0) + 1 };
		localStorage.setItem('ulivre_bingo_wallets', JSON.stringify(wallets));
	}
	localStorage.setItem('ulivre_bingo_rooms', JSON.stringify(rooms));
	window.BingoGame?.show();
}
if (bingoPanelElement) new MutationObserver(renderBingoOutcome).observe(bingoPanelElement, { childList: true, subtree: true });
if (bingoPanelElement) new MutationObserver(resolveFullBingo).observe(bingoPanelElement, { childList: true, subtree: true });
if (bingoPanelElement) new MutationObserver(renderDrawnNumbers).observe(bingoPanelElement, { childList: true, subtree: true });
function drawBall(room){const balls=room?.game?.balls||Array.from({length:75},(_,index)=>index+1);const available=balls.filter(number=>!(room.game?.drawn||[]).includes(number));return available.length?available[Math.floor(Math.random()*available.length)]:null}
function initializeBingoBalls(room){if(room?.game&&!Array.isArray(room.game.balls))room.game.balls=Array.from({length:75},(_,index)=>index+1);return room}
(function(){'use strict';
const ROOMS_KEY='ulivre_bingo_rooms',WALLET_KEY='ulivre_bingo_wallets',STARTING_COINS=250,ROUND_COST=10,PRIZE=80;let activeRoomId=null,game=null;const panel=()=>document.getElementById('bingoPanel');const tx=(key,fallback)=>{const value=typeof window.t==='function'?window.t(key):key;return value===key?fallback:value};const userName=()=> (localStorage.getItem('userProfileName')||tx('games_room_player_label','Jogador')).trim();const playerId=()=>{let id=sessionStorage.getItem('ulivre_bingo_player_id');if(!id){id=`bingo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;sessionStorage.setItem('ulivre_bingo_player_id',id)}return id};const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));function readRooms(){try{const rooms=JSON.parse(localStorage.getItem(ROOMS_KEY)||'[]');return Array.isArray(rooms)?rooms.filter(room=>window.UniversidadeLivreGameScope?.matchesRoom(room)??true):[]}catch(_){return[]}}function writeRooms(rooms){let all=[];try{all=JSON.parse(localStorage.getItem(ROOMS_KEY)||'[]')}catch(_){}const other=Array.isArray(all)?all.filter(room=>!(window.UniversidadeLivreGameScope?.matchesRoom(room)??true)):[];localStorage.setItem(ROOMS_KEY,JSON.stringify([...other,...rooms].slice(-20)))}const getRoom=(id=activeRoomId)=>readRooms().find(room=>room.id===id)||null;function wallet(){let wallets={};try{wallets=JSON.parse(localStorage.getItem(WALLET_KEY)||'{}')}catch(_){}if(!wallets[userName()])wallets[userName()]={coins:STARTING_COINS,wins:0,rounds:0};return wallets[userName()]}function saveWallet(value){let wallets={};try{wallets=JSON.parse(localStorage.getItem(WALLET_KEY)||'{}')}catch(_){}wallets[userName()]={...value,coins:Math.max(0,Math.floor(value.coins))};localStorage.setItem(WALLET_KEY,JSON.stringify(wallets))}function makeCard(){const values=[];for(let n=1;n<=75;n++)values.push(n);return values.sort(()=>Math.random()-.5).slice(0,24)}function drawBall(room){const available=(room.game?.balls||[]).filter(n=>!(room.game?.drawn||[]).includes(n));if(!available.length)return null;return available[Math.floor(Math.random()*available.length)]}function hasBingo(card,marked){const lines=[];for(let i=0;i<5;i++)lines.push([0,1,2,3,4].map(x=>i*5+x),[0,1,2,3,4].map(x=>x*5+i));lines.push([0,6,12,18,24],[4,8,12,16,20]);return lines.some(line=>line.every(index=>marked.includes(index)))}function createRoom(){const target=panel(),mode=target.querySelector('#bingoMode')?.value||'community';const room=window.UniversidadeLivreGameScope?.decorateRoom({id:`BIN-${Math.random().toString(36).slice(2,7).toUpperCase()}`,owner:playerId(),mode,players:[{id:playerId(),name:userName()}],capacity:2,createdAt:Date.now(),game:null});if(mode==='bot')room.players.push({id:`bot-${room.id}`,name:tx('bingo_bot','Bot'),isBot:true});activeRoomId=room.id;sessionStorage.setItem('ulivre_bingo_active_room',activeRoomId);writeRooms([...readRooms(),room]);startRoom(room)}function joinRoom(id){const room=getRoom(id);if(!room||room.mode==='bot'||room.players.length>=room.capacity)return;room.players.push({id:playerId(),name:userName()});activeRoomId=id;sessionStorage.setItem('ulivre_bingo_active_room',id);writeRooms(readRooms().map(item=>item.id===id?room:item));startRoom(room)}function deleteRoom(id){const room=getRoom(id);if(!room||room.owner!==playerId())return;const remove=()=>{writeRooms(readRooms().filter(item=>item.id!==id));if(activeRoomId===id){activeRoomId=null;game=null;sessionStorage.removeItem('ulivre_bingo_active_room')}renderLobby()};if(window.openRoomDeleteDialog)window.openRoomDeleteDialog(remove);else remove()}function startRoom(room){game={room,viewOnly:!room.players.some(player=>player.id===playerId()),card:room.game?.cards?.[playerId()]||makeCard(),marked:room.game?.marked?.[playerId()]||[12],status:room.game?.status||'waiting',drawn:room.game?.drawn||[],lastBall:room.game?.lastBall||null,message:room.game?.message||'',history:room.game?.history||[]};renderGame()}function persist(){const room=getRoom();if(!room||!game)return;room.game={...(room.game||{}),cards:{...(room.game?.cards||{}),[playerId()]:game.card},marked:{...(room.game?.marked||{}),[playerId()]:game.marked},drawn:game.drawn,lastBall:game.lastBall,status:game.status,message:game.message,history:game.history};writeRooms(readRooms().map(item=>item.id===room.id?room:item))}function startRound(){const room=getRoom(),balance=wallet();if(!room||room.players.length<2||game.status==='playing'||game.viewOnly||balance.coins<ROUND_COST)return;saveWallet({...balance,coins:balance.coins-ROUND_COST,rounds:balance.rounds+1});const cards={};const marked={};room.players.forEach(player=>{cards[player.id]=makeCard();marked[player.id]=[12]});room.game={cards,marked,drawn:[],lastBall:null,status:'playing',message:tx('bingo_started','Rodada iniciada. Marque os números sorteados.'),history:room.game?.history||[]};writeRooms(readRooms().map(item=>item.id===room.id?room:item));startRoom(room)}function draw(){const room=getRoom();if(!room?.game||room.game.status!=='playing'||game.viewOnly)return;const ball=drawBall(room);if(ball===null)return;room.game.drawn=[...(room.game.drawn||[]),ball];room.game.lastBall=ball;room.game.message=`${tx('bingo_drawn','Número sorteado')}: ${ball}`;writeRooms(readRooms().map(item=>item.id===room.id?room:item));startRoom(room);if(room.mode==='bot')setTimeout(()=>botMark(room,ball),250)}function botMark(room,ball){const bot=room.players.find(player=>player.isBot);if(!bot)return;const card=room.game.cards[bot.id]||[];const index=card.indexOf(ball);if(index>=0){room.game.marked[bot.id]=[...(room.game.marked[bot.id]||[12]),index]}writeRooms(readRooms().map(item=>item.id===room.id?room:item));if(hasBingo(card,room.game.marked[bot.id]||[]))finish(bot.name,room)}function mark(index){if(!game||game.viewOnly||game.status!=='playing'||index===12)return;if(!game.drawn.includes(game.card[index]))return;if(!game.marked.includes(index)){game.marked.push(index);persist();if(hasBingo(game.card,game.marked))finish(userName(),getRoom());else renderGame()}}function finish(winner,room){if(!room?.game||room.game.status!=='playing')return;room.game.status='finished';room.game.message=`${winner} ${tx('bingo_won','fez bingo!')} +${PRIZE} ${tx('bingo_coins','moedas')}`;room.game.history=[room.game.message,...(room.game.history||[])].slice(0,8);if(winner===userName()){const balance=wallet();saveWallet({...balance,coins:balance.coins+PRIZE,wins:balance.wins+1})}writeRooms(readRooms().map(item=>item.id===room.id?room:item));startRoom(room)}function renderLobby(){const target=panel(),rooms=readRooms(),balance=wallet();target.innerHTML=`<div class="bingo-card"><div class="bingo-header"><div><h4>${tx('bingo_title','Bingo')}</h4><p>${tx('bingo_subtitle','Marque sua cartela e complete uma linha para vencer.')}</p></div><div class="bingo-balance"><span>${tx('bingo_coins','moedas')}: <strong>${balance.coins}</strong></span></div></div><div class="bingo-create"><label class="bingo-field">${tx('bingo_play_with','Jogar com')}<select id="bingoMode" class="bingo-select"><option value="bot">${tx('bingo_bot','Bot')}</option><option value="community">${tx('bingo_community','Comunidade')}</option></select></label><span></span><button id="bingoCreate" class="bingo-primary" type="button">${tx('bingo_create','Criar sala')}</button></div><div class="bingo-room-list"><h5>${tx('bingo_rooms','Salas disponíveis')}</h5>${rooms.length?rooms.map(room=>`<div class="bingo-room"><div class="bingo-room-meta"><strong>${escapeHtml(room.id)}</strong><span class="bingo-muted">${room.mode==='bot'?tx('bingo_bot','Bot'):tx('bingo_community','Comunidade')} · ${room.players.length}/${room.capacity}</span></div><div class="bingo-room-actions">${room.mode==='community'&&room.players.length<room.capacity?`<button class="bingo-secondary bingo-join" data-room="${escapeHtml(room.id)}" type="button">${tx('bingo_join','Entrar')}</button>`:''}<button class="bingo-secondary bingo-view" data-room="${escapeHtml(room.id)}" type="button">${tx('bingo_view','Visualizar')}</button>${room.owner===playerId()?`<button class="bingo-danger bingo-delete" data-room="${escapeHtml(room.id)}" type="button">${tx('bingo_delete','Apagar')}</button>`:''}</div></div>`).join(''):`<p class="bingo-muted">${tx('bingo_no_rooms','Nenhuma sala aberta ainda.')}</p>`}</div></div>`;target.querySelector('#bingoCreate').addEventListener('click',createRoom);target.querySelectorAll('.bingo-join').forEach(button=>button.addEventListener('click',()=>joinRoom(button.dataset.room)));target.querySelectorAll('.bingo-view').forEach(button=>button.addEventListener('click',()=>{const room=getRoom(button.dataset.room);if(room)startRoom(room)}));target.querySelectorAll('.bingo-delete').forEach(button=>button.addEventListener('click',()=>deleteRoom(button.dataset.room)))}function renderGame(){const target=panel(),room=game.room,canStart=!game.viewOnly&&room.players.length>=2&&game.status!=='playing';target.innerHTML=`<div class="bingo-card"><div class="bingo-header"><div><h4>${tx('bingo_room','Sala')} ${escapeHtml(room.id)}</h4><p>${room.mode==='bot'?tx('bingo_bot','Bot'):tx('bingo_community','Comunidade')} · ${room.players.length}/2</p></div><button id="bingoBack" class="bingo-secondary" type="button">${tx('bingo_back','Voltar')}</button></div><div class="bingo-balance"><span>${tx('bingo_coins','moedas')}: <strong>${wallet().coins}</strong></span><span>${tx('bingo_cost','custo')}: <strong>${ROUND_COST}</strong></span></div><div class="bingo-board-area"><div class="bingo-board">${game.card.map((number,index)=>`<button class="bingo-cell ${game.marked.includes(index)?'marked':''} ${index===12?'free':''}" data-bingo-index="${index}" type="button">${index===12?'★':number}</button>`).join('')}</div><div class="bingo-side"><div class="bingo-draw"><span>${tx('bingo_last_ball','Última bola')}</span><strong class="bingo-ball">${game.lastBall||'--'}</strong><button id="bingoDraw" class="bingo-primary" type="button" ${game.status!=='playing'||game.viewOnly?'disabled':''}>${tx('bingo_draw','Sortear bola')}</button></div><div class="bingo-status">${escapeHtml(room.game?.message||tx('bingo_ready','Crie ou entre em uma sala para começar.'))}</div><div class="bingo-rules"><strong>${tx('bingo_rules_title','Como jogar')}:</strong> ${tx('bingo_rules','A rodada custa 10 moedas. Marque os números sorteados e complete uma linha, coluna ou diagonal. O prêmio é de 80 moedas.')}</div></div></div>${canStart?`<button id="bingoStart" class="bingo-primary" type="button">${tx('bingo_start','Começar rodada')}</button>`:''}<div class="bingo-history">${(room.game?.history||[]).map(item=>`<span>${escapeHtml(item)}</span>`).join('')||tx('bingo_no_history','Nenhuma rodada finalizada.')}</div></div>`;target.querySelector('#bingoBack')?.addEventListener('click',renderLobby);target.querySelector('#bingoStart')?.addEventListener('click',startRound);target.querySelector('#bingoDraw')?.addEventListener('click',draw);target.querySelectorAll('[data-bingo-index]').forEach(button=>button.addEventListener('click',()=>mark(Number(button.dataset.bingoIndex))))}function show(){document.getElementById('gamesMenuScreen')?.setAttribute('hidden','');document.getElementById('gameShellScreen')?.removeAttribute('hidden');['chessPanel','impostorPanel','hangmanPanel','checkersPanel','roulettePanel','unoPanel','bichoPanel','slotsPanel','pokerPanel','blackjackPanel','bacaraPanel'].forEach(id=>{const element=document.getElementById(id);element?.setAttribute('hidden','');if(element)element.style.setProperty('display','none','important')});document.querySelectorAll('.chess-room-creator,.chess-opponent-panel,#chessRoomList,#tttRoomList,.game-stage').forEach(element=>{element.hidden=true;element.style.display='none'});const target=panel();if(!target)return;target.hidden=false;target.style.setProperty('display','block','important');document.querySelector('.game-shell-title-wrap strong').textContent=tx('bingo_title','Bingo');document.getElementById('chessStatusText').textContent=tx('bingo_status','Marque sua cartela e complete uma linha para vencer.');activeRoomId=sessionStorage.getItem('ulivre_bingo_active_room')||null;const room=getRoom();if(room)startRoom(room);else renderLobby()}window.addEventListener('storage',event=>{if(event.key===ROOMS_KEY||event.key===WALLET_KEY){const room=getRoom();if(room&&game)startRoom(room);else if(!panel()?.hidden)renderLobby()}});window.addEventListener('languageChanged',()=>{if(!panel()?.hidden){const room=getRoom();if(room)startRoom(room);else renderLobby()}});window.BingoGame={show}}());
