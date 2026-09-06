// comunidade.js – Versão 12.2 – COMPLETO E INTEGRADO AO i18n CENTRAL
// ================================================================
// - CORREÇÃO: Inicialização do onboarding com verificação de disponibilidade
// - CORREÇÃO: Botão de perfil funcionando corretamente
// - CORREÇÃO: Integração total com i18n central
// - CORREÇÃO: Modal de onboarding com inert removido corretamente
// - Filtro de palavras ofensivas em português e inglês
// - Substitui por # mantendo a primeira letra
// - Bloqueio automático do chat após 3 ofensas em 30 segundos
// - Bloqueio automático de postagem de artigos após 2 ofensas
// - Bloqueio automático de comentários após 2 ofensas
// - Chat com textarea (3 linhas), contador de caracteres
// - Compartilhamento de artigo com preview
// - Abas: Todos / Meus Artigos / Minhas Enquetes
// - Anexo de notas
// - GIF com preview e botões para sites
// - Edição/exclusão de comentários e mensagens do chat
// - Likes em posts, comentários e mensagens
// - Sincronização entre abas (storage event)
// - Armazenamento local de posts, chat, notas
// - Interface responsiva e acessível

(function() {
    'use strict';

    // ========================================================================
    // DEPENDÊNCIA DO i18n CENTRAL
    // ========================================================================
    if (typeof window.t !== 'function') {
        console.error('[Comunidade] window.t não está disponível. Verifique se i18n.js foi carregado.');
        // Fallback mínimo para não quebrar
        window.t = function(key) { return key; };
    }

    // ========================================================================
    // CONSTANTES
    // ========================================================================
    const STORAGE_KEY_POSTS = 'comunidade_posts_';
    const STORAGE_KEY_CHAT = 'comunidade_chat_';
    const STORAGE_KEY_NOTES = 'ulivre_notas_estudo';
    const PEERJS_REGISTRY_KEY = 'comunidade_upeerjs_registry';
    const PEERJS_MESSAGE_KEY = 'comunidade_upeerjs_message';
    const COURSES_JSON = '../cursos/courses.json';
    const COURSE_DATA_BASE = '../cursos/';
    const COURSE_PATH_ALIASES = {
        'ciencia-de-dados-bacharelado': {
            directory: 'ciencia-de-dados',
            file: 'ciencia-de-dados-bacharelado'
        },
        'computacao': {
            directory: 'ciencia-computacao',
            file: 'ciencia-computacao'
        }
    };
    const MAX_CHAT_MESSAGES = 100;
    const MAX_CHAT_MESSAGE_LENGTH = 500;
    const OFFENSE_LIMIT_CHAT = 3;
    const OFFENSE_LIMIT_POST = 2;
    const OFFENSE_LIMIT_COMMENT = 2;
    const OFFENSE_WINDOW = 30000;
    const BLOCK_DURATION = 300;
    const MAX_CONTENT_WORDS = 5;
    const COURSE_REFRESH_INTERVAL = 30000;
    const PRESENCE_STORAGE_KEY = 'comunidade_presence';
    const PRESENCE_INTERVAL = 15000;
    const PRESENCE_TIMEOUT = 45000;

    const IMG_URL_REGEX = /(https?:\/\/[^\s]+\.(?:gif|png|jpg|jpeg|webp|bmp|svg)(?:\?[^\s]*)?)/gi;
    const EMOJIS = [
        '😊', '😂', '❤️', '🔥', '👍', '👏', '🎉', '💪',
        '🤔', '😢', '😡', '🥳', '🙌', '✨', '💡', '📚',
        '🤝', '💯', '😎', '🤗', '😇', '🥰', '😍', '🤩'
    ];

    // ========================================================================
    // LISTA DE PALAVRAS OFENSIVAS (em minúsculo, sem acentos)
    // ========================================================================
    const OFFENSIVE_WORDS = [
        // Português
        'buceta', 'caralho', 'foda', 'foder', 'fuder', 'merda', 'porra',
        'puta', 'putaria', 'xota', 'arrombado', 'babaca', 'bosta', 'cacete',
        'cu', 'desgraca', 'escroto', 'filhadaputa', 'fudido', 'otario',
        'pau', 'pica', 'viado', 'cuzão', 'pentelho', 'tarado', 'piranha',
        'vagabunda', 'prostituta', 'corno', 'chifrudo', 'imbecil', 'idiota',
        'retardado', 'mongol', 'analfabeto', 'burro', 'ignorante',
        'preconceituoso', 'racista', 'homofobico', 'machista', 'misogino',
        'foda-se', 'filho da puta',
        // Inglês
        'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick',
        'pussy', 'whore', 'slut', 'motherfucker', 'cocksucker',
        'douchebag', 'prick', 'twat', 'wanker', 'bugger', 'bloody',
        'damn', 'hell', 'crap', 'arse', 'arsehole', 'fanny', 'knob',
        'tosser', 'pillock', 'plonker', 'git', 'muppet', 'numpty',
        'prat', 'berk', 'chav', 'scally', 'gobshite', 'bollocks',
        'cack', 'ass', 'dickhead', 'fag', 'faggot', 'nigger', 'spic',
        'kike', 'chink', 'gook', 'wetback', 'retard', 'mong', 'spastic',
        'piss', 'pissed', 'pissing', 'piss off', 'sod off', 'fuck off',
        'god damn', 'goddamn', 'bullshit'
    ];

    // ========================================================================
    // FUNÇÃO DE NORMALIZAÇÃO (remove acentos)
    // ========================================================================
    function normalizeText(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // ========================================================================
    // FILTRO DE PALAVRAS OFENSIVAS
    // ========================================================================
    function censorText(text) {
        if (!text) return text;
        const words = text.split(/\b/);
        let result = '';
        for (const word of words) {
            const normalizedWord = normalizeText(word.toLowerCase());
            if (OFFENSIVE_WORDS.includes(normalizedWord)) {
                result += word.charAt(0) + '#'.repeat(word.length - 1);
            } else {
                result += word;
            }
        }
        return result;
    }

    function maskDigits(text) {
        return typeof text === 'string' ? text.replace(/\d/g, '*') : text;
    }

    function maskHtmlDigits(html) {
        if (!html) return html;
        const container = document.createElement('div');
        container.innerHTML = html;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
            node.textContent = maskDigits(node.textContent);
        }
        return container.innerHTML;
    }

    function countWords(text) {
        const normalized = String(text || '').trim();
        return normalized ? normalized.split(/\s+/u).length : 0;
    }

    function hasExcessiveWords(text) {
        return countWords(text) > MAX_CONTENT_WORDS;
    }

    function hasOffensiveContent(text) {
        if (!text) return false;
        const words = text.split(/\b/);
        for (const word of words) {
            const normalizedWord = normalizeText(word.toLowerCase());
            if (OFFENSIVE_WORDS.includes(normalizedWord)) return true;
        }
        return false;
    }

    // ========================================================================
    // FUNÇÃO DE TRADUÇÃO (wrapper do window.t)
    // ========================================================================
    function t(key, replacements = {}) {
        return window.t(key, replacements);
    }

    function getLocalizedCourseName(course) {
        if (!course) return '';
        return typeof window.getCourseName === 'function'
            ? window.getCourseName(course.id)
            : course.name;
    }

    function getLocalizedDisciplineName(discipline) {
        if (!discipline) return '';
        return typeof window.getDisciplineName === 'function'
            ? window.getDisciplineName(discipline)
            : discipline;
    }

    function updatePeerStatus(isOnline, customText) {
        const dot = document.getElementById('p2pStatusDot');
        const text = document.getElementById('p2pStatusText');
        if (dot) {
            dot.classList.toggle('online', !!isOnline);
            dot.classList.toggle('offline', !isOnline);
        }
        if (text) {
            text.textContent = customText || (isOnline ? `${t('connected')}` : t('disconnected'));
        }
    }

    function readPeerRegistry() {
        try {
            const raw = localStorage.getItem(PEERJS_REGISTRY_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    function writePeerRegistry(registry) {
        localStorage.setItem(PEERJS_REGISTRY_KEY, JSON.stringify(registry || {}));
    }

    function prunePeerRegistry() {
        const registry = readPeerRegistry();
        const now = Date.now();
        const pruned = {};
        Object.entries(registry).forEach(([peerId, meta]) => {
            if (!peerId || typeof peerId !== 'string') return;
            const lastSeen = Number(meta && typeof meta === 'object' ? meta.lastSeen : 0) || 0;
            const isFresh = lastSeen && now - lastSeen <= 30 * 60 * 1000;
            if (isFresh || !lastSeen) {
                pruned[peerId] = meta;
            }
        });
        if (Object.keys(pruned).length !== Object.keys(registry).length) {
            writePeerRegistry(pruned);
        }
        return pruned;
    }

    function attachPeerConnection(conn) {
        if (!conn || !state.peerNetwork.peer) return;
        state.peerNetwork.connections.set(conn.peer, conn);

        conn.on('open', () => {
            const registry = readPeerRegistry();
            registry[conn.peer] = { lastSeen: Date.now() };
            writePeerRegistry(registry);
            updatePeerStatus(true, t('connected'));
        });

        conn.on('data', (payload) => {
            if (!payload || typeof payload !== 'object') return;
            if (payload.type === 'pong' || payload.type === 'ping') return;
            if (payload.type !== 'community-chat-message') return;

            const { courseId, discipline, message } = payload;
            if (!courseId || !discipline || !message || !message.id) return;

            const existingMessages = loadChatMessages(courseId, discipline);
            const alreadyExists = existingMessages.some(item => item.id === message.id);
            if (alreadyExists) return;

            existingMessages.push(message);
            if (existingMessages.length > MAX_CHAT_MESSAGES) {
                existingMessages.splice(0, existingMessages.length - MAX_CHAT_MESSAGES);
            }
            saveChatMessages(courseId, discipline, existingMessages);

            if (state.currentCourseId === courseId && state.currentDiscipline === discipline) {
                renderChatMessages();
            }
        });

        conn.on('close', () => {
            state.peerNetwork.connections.delete(conn.peer);
            if (state.peerNetwork.connections.size === 0) {
                updatePeerStatus(false, t('disconnected'));
            }
        });

        conn.on('error', (error) => {
            console.warn('[Comunidade] Erro de conexão uPeerJS:', error);
        });
    }

    function connectToKnownPeers() {
        if (!state.peerNetwork.peer || !state.peerNetwork.ready) return;
        const registry = prunePeerRegistry();
        Object.keys(registry).forEach((remotePeerId) => {
            if (!remotePeerId || remotePeerId === state.peerNetwork.peerId) return;
            if (state.peerNetwork.connections.has(remotePeerId)) return;

            try {
                const connection = state.peerNetwork.peer.connect(remotePeerId);
                attachPeerConnection(connection);
            } catch (_) {
                // fallback silencioso
            }
        });
    }

    function broadcastPeerChatMessage(courseId, discipline, message) {
        if (!state.peerNetwork.peer || !state.peerNetwork.ready || !message || !courseId || !discipline) {
            return;
        }

        const payload = {
            type: 'community-chat-message',
            courseId,
            discipline,
            message
        };

        state.peerNetwork.connections.forEach((connection) => {
            try {
                connection.send(payload);
            } catch (_) {}
        });

        const registry = readPeerRegistry();
        Object.keys(registry).forEach((remotePeerId) => {
            if (remotePeerId === state.peerNetwork.peerId || state.peerNetwork.connections.has(remotePeerId)) return;
            try {
                const connection = state.peerNetwork.peer.connect(remotePeerId);
                attachPeerConnection(connection);
                connection.on('open', () => connection.send(payload));
            } catch (_) {}
        });
    }

    function initializePeerNetwork() {
        if (!window.Peer || typeof window.Peer !== 'function') {
            updatePeerStatus(false, t('disconnected'));
            return;
        }

        const storedPeerId = sessionStorage.getItem('comunidade_upeerjs_id') || `ulivre-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
        sessionStorage.setItem('comunidade_upeerjs_id', storedPeerId);

        const peer = new window.Peer(storedPeerId, {
            host: '0.peerjs.com',
            port: 443,
            secure: true,
            debug: 0
        });

        state.peerNetwork.peer = peer;
        peer.on('open', (id) => {
            state.peerNetwork.peerId = id;
            state.peerNetwork.ready = true;

            const registry = readPeerRegistry();
            registry[id] = { lastSeen: Date.now() };
            writePeerRegistry(registry);
            updatePeerStatus(true, `${t('connected')}`);
            connectToKnownPeers();
        });

        peer.on('connection', (connection) => {
            attachPeerConnection(connection);
        });

        peer.on('disconnected', () => {
            updatePeerStatus(false, `${t('disconnected')}`);
            peer.reconnect();
        });

        peer.on('error', (error) => {
            const message = error && (error.message || error.type || String(error));
            const shouldIgnore = /peer-unavailable|could not connect to peer|disconnected|network|server/i.test(message);
            if (!shouldIgnore) {
                console.warn('[Comunidade] uPeerJS error:', error);
            }
            updatePeerStatus(false, t('disconnected'));
        });
    }

    // ========================================================================
    // ESTADO GLOBAL
    // ========================================================================
    const state = {
        courses: [],
        disciplines: {},
        currentCourseId: null,
        currentDiscipline: null,
        posts: [],
        editingPostId: null,
        editingCommentId: null,
        editingChatMessageId: null,
        currentUser: { name: 'Anônimo', avatar: null },
        chatMessages: [],
        activeTab: 'all',
        notes: [],
        selectedNoteId: null,
        chatBlocked: false,
        chatBlockTimer: null,
        chatBlockRemaining: 0,
        chatOffenseCount: 0,
        chatOffenseTimer: null,
        postBlocked: false,
        postBlockTimer: null,
        postBlockRemaining: 0,
        postOffenseCount: 0,
        postOffenseTimer: null,
        commentBlocked: false,
        commentBlockTimer: null,
        commentBlockRemaining: 0,
        commentOffenseCount: 0,
        commentOffenseTimer: null,
        peerNetwork: {
            peer: null,
            peerId: null,
            ready: false,
            connections: new Map()
        }
    };

    const elements = {};
    let coursesRefreshTimer = null;

    const GAME_SCOPE_KEY = 'ulivre_game_matchmaking_scope';

    function readGameMatchmakingScope() {
        try {
            const stored = JSON.parse(localStorage.getItem(GAME_SCOPE_KEY) || '{}');
            return {
                mode: ['global', 'course', 'discipline'].includes(stored.mode) ? stored.mode : 'global',
                courseId: stored.courseId || state.currentCourseId || null,
                discipline: stored.discipline || state.currentDiscipline || null
            };
        } catch (_) {
            return { mode: 'global', courseId: state.currentCourseId || null, discipline: state.currentDiscipline || null };
        }
    }

    function setGameMatchmakingScope(mode) {
        const validMode = ['global', 'course', 'discipline'].includes(mode) ? mode : 'global';
        const scope = { mode: validMode, courseId: state.currentCourseId, discipline: state.currentDiscipline };
        localStorage.setItem(GAME_SCOPE_KEY, JSON.stringify(scope));
        window.dispatchEvent(new CustomEvent('gameMatchmakingScopeChanged', { detail: scope }));
        refreshPresence();
        updateGameMatchmakingOnlineCount();
        return scope;
    }

    function decorateGameRoom(room) {
        return { ...room, matchmakingScope: readGameMatchmakingScope() };
    }

    function matchesGameRoomScope(room) {
        const scope = readGameMatchmakingScope();
        if (scope.mode === 'global') return true;
        const roomScope = room?.matchmakingScope;
        if (!roomScope?.courseId || roomScope.courseId !== scope.courseId) return false;
        return scope.mode !== 'discipline' || roomScope.discipline === scope.discipline;
    }

    window.UniversidadeLivreGameScope = {
        get: readGameMatchmakingScope,
        set: setGameMatchmakingScope,
        decorateRoom: decorateGameRoom,
        matchesRoom: matchesGameRoomScope
    };

    const LIVRE_WALLET_KEY = 'ulivre_livre_coins_wallet';
    const LEGACY_WALLET_KEYS = ['ulivre_bicho_wallets', 'ulivre_roulette_wallets', 'ulivre_slots_wallets', 'ulivre_poker_wallets', 'ulivre_blackjack_wallets', 'ulivre_bacara_wallets', 'ulivre_bingo_wallets'];
    const nativeStorageSetItem = Storage.prototype.setItem;
    function livreCoinsUser() {
        return (localStorage.getItem('userProfileName') || 'Anônimo').trim() || 'Anônimo';
    }
    function readLivreWallet() {
        try {
            const all = JSON.parse(localStorage.getItem(LIVRE_WALLET_KEY) || '{}');
            return all[livreCoinsUser()] || { coins: 0, points: 0, bonuses: {}, wins: 0, games: 0, activeGame: null };
        } catch (_) {
            return { coins: 0, points: 0, bonuses: {}, wins: 0, games: 0, activeGame: null };
        }
    }
    function writeLivreWallet(value) {
        let all = {};
        try { all = JSON.parse(localStorage.getItem(LIVRE_WALLET_KEY) || '{}'); } catch (_) {}
        all[livreCoinsUser()] = { ...readLivreWallet(), ...value, coins: Math.max(0, Math.floor(value.coins ?? readLivreWallet().coins)), points: Math.max(0, Math.floor(value.points ?? readLivreWallet().points)) };
        nativeStorageSetItem.call(localStorage, LIVRE_WALLET_KEY, JSON.stringify(all));
        const activeGame = value.activeGame || all[livreCoinsUser()].activeGame;
        const legacyKeyByGame = {
            poker: 'ulivre_poker_wallets',
            blackjack: 'ulivre_blackjack_wallets',
            bacara: 'ulivre_bacara_wallets',
            bingo: 'ulivre_bingo_wallets'
        };
        const activeLegacyKey = legacyKeyByGame[activeGame];
        if (activeLegacyKey) {
            let legacy = {};
            try { legacy = JSON.parse(localStorage.getItem(activeLegacyKey) || '{}'); } catch (_) {}
            legacy[livreCoinsUser()] = {
                ...(legacy[livreCoinsUser()] || {}),
                coins: all[livreCoinsUser()].coins,
                points: all[livreCoinsUser()].points || 0,
                wins: all[livreCoinsUser()].wins || 0,
                draws: all[livreCoinsUser()].draws || 0,
                games: all[livreCoinsUser()].games || 0,
                hands: all[livreCoinsUser()].hands || 0,
                rounds: all[livreCoinsUser()].rounds || 0,
                spins: all[livreCoinsUser()].spins || 0,
                bets: all[livreCoinsUser()].bets || 0
            };
            nativeStorageSetItem.call(localStorage, activeLegacyKey, JSON.stringify(legacy));
        }
        LEGACY_WALLET_KEYS.forEach(key => {
            let legacy = {};
            try { legacy = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) {}
            if (legacy[livreCoinsUser()]) {
                legacy[livreCoinsUser()] = { ...legacy[livreCoinsUser()], coins: all[livreCoinsUser()].coins };
                nativeStorageSetItem.call(localStorage, key, JSON.stringify(legacy));
            }
        });
        window.dispatchEvent(new CustomEvent('livreWalletUpdated', { detail: all[livreCoinsUser()] }));
        return all[livreCoinsUser()];
    }
    function claimLivreGameBonus(gameId) {
        const wallet = readLivreWallet();
        if (wallet.bonuses?.[gameId]) return wallet;
        const bonusByGame = {
            chess: 50,
            tictactoe: 50,
            hangman: 50,
            checkers: 50,
            bicho: 50,
            bingo: 50,
            slots: 150,
            bacara: 150,
            poker: 150,
            blackjack: 150,
            basketball: 75,
            racing: 50,
            roulette: 0
        };
        const bonus = Number.isFinite(bonusByGame[gameId]) ? bonusByGame[gameId] : 50;
        const bonuses = { ...(wallet.bonuses || {}), [gameId]: true };
        return writeLivreWallet({ ...wallet, activeGame: gameId, coins: wallet.coins + bonus, bonuses });
    }
    window.UniversidadeLivreWallet = {
        get: readLivreWallet,
        update: writeLivreWallet,
        claimGameBonus: claimLivreGameBonus,
        syncAcademicPoints(totalPoints = 0) {
            const wallet = readLivreWallet();
            const total = Math.max(0, Math.floor(totalPoints));
            const previous = Number(wallet.syncedAcademicPoints || 0);
            const delta = Math.max(0, total - previous);
            return writeLivreWallet({ ...wallet, points: wallet.points + delta, syncedAcademicPoints: Math.max(previous, total) });
        },
        convertPoints(amount = 0) {
            const wallet = readLivreWallet();
            const points = Math.min(Math.max(0, Math.floor(amount)), wallet.points);
            return writeLivreWallet({ ...wallet, points: wallet.points - points, coins: wallet.coins + points });
        },
        startWager(gameId, roomId, amount = 1) {
            const wallet = readLivreWallet();
            const key = `${gameId}:${roomId}`;
            let wagers = {};
            try { wagers = JSON.parse(localStorage.getItem('ulivre_game_wagers') || '{}'); } catch (_) {}
            if (wagers[key]?.[livreCoinsUser()]) return true;
            const stake = Math.max(1, Math.floor(amount));
            if (wallet.coins < stake) return false;
            writeLivreWallet({ ...wallet, coins: wallet.coins - stake });
            wagers[key] = { ...(wagers[key] || {}), [livreCoinsUser()]: stake };
            localStorage.setItem('ulivre_game_wagers', JSON.stringify(wagers));
            return true;
        },
        settleWager(gameId, roomId, winnerName = null, draw = false) {
            const key = `${gameId}:${roomId}`;
            let wagers = {};
            try { wagers = JSON.parse(localStorage.getItem('ulivre_game_wagers') || '{}'); } catch (_) {}
            const stakes = wagers[key];
            if (!stakes) return;
            const current = livreCoinsUser();
            const amount = draw ? Number(stakes[current] || 0) : Object.values(stakes).reduce((sum, value) => sum + Number(value || 0), 0);
            if (draw || winnerName === current) writeLivreWallet({ ...readLivreWallet(), coins: readLivreWallet().coins + amount });
            delete wagers[key];
            localStorage.setItem('ulivre_game_wagers', JSON.stringify(wagers));
        }
    };
    const nativeStorageSetItemForBridge = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        nativeStorageSetItemForBridge.call(this, key, value);
        if (this !== localStorage || !LEGACY_WALLET_KEYS.includes(key)) return;
        try {
            const data = JSON.parse(value || '{}');
            const entry = data[livreCoinsUser()];
            if (entry && Number.isFinite(Number(entry.coins))) writeLivreWallet({ coins: Number(entry.coins) });
        } catch (_) {}
    };
    function refreshLivreCoinsDisplay() {
        const balance = document.getElementById('livreCoinsBalance');
        const points = document.getElementById('livrePointsBalance');
        if (balance) balance.textContent = String(window.UniversidadeLivreWallet.get().coins);
        if (points) points.textContent = String(window.UniversidadeLivreWallet.get().points);
    }
    window.addEventListener('livreWalletUpdated', refreshLivreCoinsDisplay);
    window.addEventListener('storage', event => {
        if (event.key === LIVRE_WALLET_KEY) refreshLivreCoinsDisplay();
    });
    document.addEventListener('DOMContentLoaded', refreshLivreCoinsDisplay, { once: true });
    document.addEventListener('click', event => {
        if (!event.target.closest('#convertLivrePoints')) return;
        const wallet = window.UniversidadeLivreWallet.get();
        if (wallet.points <= 0) return;
        window.UniversidadeLivreWallet.convertPoints(wallet.points);
        refreshLivreCoinsDisplay();
    });

    // ========================================================================
    // FUNÇÕES AUXILIARES
    // ========================================================================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function formatDate(iso) {
        try {
            const d = new Date(iso);
            if (isNaN(d)) return '';
            const lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'pt-br';
            const locale = lang === 'en' ? 'en-US' : 'pt-BR';
            return d.toLocaleString(locale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (_) { return ''; }
    }

    function openRoomDeleteDialog(onConfirm) {
        if (typeof onConfirm !== 'function') return;
        const modal = document.createElement('div');
        modal.className = 'uno-confirm-modal';
        modal.innerHTML = `<div class="uno-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="roomDeleteTitle"><div class="uno-confirm-icon"><i class="fas fa-trash"></i></div><h3 id="roomDeleteTitle">${t('uno_confirm_title')}</h3><p>${t('uno_confirm_delete')}</p><div class="uno-confirm-actions"><button class="btn-secondary" data-room-delete-cancel type="button">${t('uno_cancel')}</button><button class="btn-danger" data-room-delete-confirm type="button"><i class="fas fa-trash"></i> ${t('uno_delete')}</button></div></div>`;
        document.body.appendChild(modal);
        const close = () => modal.remove();
        modal.querySelector('[data-room-delete-cancel]')?.addEventListener('click', close);
        modal.addEventListener('click', event => { if (event.target === modal) close(); });
        modal.querySelector('[data-room-delete-confirm]')?.addEventListener('click', () => { close(); onConfirm(); });
    }

    const standaloneRoomConfigs = [
        { panel: '#checkersPanel', room: '.checkers-room', join: '.checkers-join', view: '.checkers-view', remove: '.checkers-delete', key: 'ulivre_checkers_rooms', game: 'CheckersGame' },
        { panel: '#roulettePanel', room: '.roulette-room', join: '.roulette-join', view: '.roulette-view', remove: '.roulette-delete', key: 'ulivre_roulette_rooms', game: 'RouletteGame' },
        { panel: '#hangmanPanel', room: '.hangman-room', join: '.hangman-join', view: '.hangman-view', remove: '.hangman-delete', key: 'ulivre_hangman_rooms', game: 'HangmanGame' },
        { panel: '#bichoPanel', room: '.bicho-room', join: '.bicho-join', view: '.bicho-view', remove: '.bicho-delete', key: 'ulivre_bicho_rooms', game: 'BichoGame' },
        { panel: '#slotsPanel', room: '.slots-room', join: '.slots-join', view: '.slots-view', remove: '.slots-delete', key: 'ulivre_slots_rooms', game: 'SlotsGame' }
        , { panel: '#pokerPanel', room: '.poker-room', join: '.poker-join', view: '.poker-view', remove: '.poker-delete', key: 'ulivre_poker_rooms', game: 'PokerGame' }
        , { panel: '#blackjackPanel', room: '.blackjack-room', join: '.blackjack-join', view: '.blackjack-view', remove: '.blackjack-delete', key: 'ulivre_blackjack_rooms', game: 'BlackjackGame' }
        , { panel: '#bacaraPanel', room: '.bacara-room', join: '.bacara-join', view: '.bacara-view', remove: '.bacara-delete', key: 'ulivre_bacara_rooms', game: 'BacaraGame' }
        , { panel: '#bingoPanel', room: '.bingo-room', join: '.bingo-join', view: '.bingo-view', remove: '.bingo-delete', key: 'ulivre_bingo_rooms', game: 'BingoGame' }
    ];

    function syncStandaloneRoomActions() {
        standaloneRoomConfigs.forEach(config => {
            document.querySelectorAll(`${config.panel} ${config.room}`).forEach(roomElement => {
                const idElement = roomElement.querySelector(config.join) || roomElement.querySelector(config.view) || roomElement.querySelector(config.remove);
                const roomId = idElement?.dataset.room;
                if (!roomId) return;
                let rooms;
                try { rooms = JSON.parse(localStorage.getItem(config.key) || '[]'); } catch (_) { rooms = []; }
                const room = Array.isArray(rooms) ? rooms.find(item => item.id === roomId) : null;
                const isFull = room && (room.mode === 'bot' || Number(room.players || 0) >= Number(room.capacity || 2));
                const joinButton = roomElement.querySelector(config.join);
                if (joinButton) joinButton.hidden = Boolean(isFull);
            });
        });
    }

    function bindStandaloneRoomActions() {
        document.addEventListener('click', event => {
            const button = event.target.closest('.checkers-delete, .roulette-delete, .hangman-delete, .bicho-delete, .slots-delete, .poker-delete, .blackjack-delete, .bacara-delete, .bingo-delete');
            if (!button) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            const config = standaloneRoomConfigs.find(item => button.matches(item.remove));
            const roomId = button.dataset.room;
            if (!config || !roomId) return;
            openRoomDeleteDialog(() => {
                let rooms;
                try { rooms = JSON.parse(localStorage.getItem(config.key) || '[]'); } catch (_) { rooms = []; }
                localStorage.setItem(config.key, JSON.stringify(Array.isArray(rooms) ? rooms.filter(room => room.id !== roomId) : []));
                window[config.game]?.show();
            });
        }, true);

        const observer = new MutationObserver(syncStandaloneRoomActions);
        if (document.body) observer.observe(document.body, { childList: true, subtree: true });
        syncStandaloneRoomActions();
    }

    bindStandaloneRoomActions();

    function getCurrentUser() {
        const name = localStorage.getItem('userProfileName') || 'Anônimo';
        const avatar = localStorage.getItem('userAvatar') || null;
        return { name, avatar };
    }

    const presenceId = sessionStorage.getItem('comunidade_presence_id') || generateId();
    sessionStorage.setItem('comunidade_presence_id', presenceId);
    let presenceInterval = null;

    function readPresence() {
        const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
        if (!raw) return {};
        try {
            const presence = JSON.parse(raw);
            return presence && typeof presence === 'object' ? presence : {};
        } catch (error) {
            console.warn('[Comunidade] Presença inválida no armazenamento local:', error);
            return {};
        }
    }

    function updateOnlineCount() {
        const now = Date.now();
        const presence = readPresence();
        const active = Object.entries(presence).filter(([, entry]) => entry && now - entry.timestamp < PRESENCE_TIMEOUT);
        const users = new Set(active.map(([, entry]) => entry.name).filter(Boolean));
        const count = document.getElementById('communityOnlineCount');
        if (count) {
            const key = users.size === 1 ? 'community_online_count_one' : 'community_online_count_many';
            const translated = t(key, { count: users.size });
            const fallback = users.size === 1
                ? `${users.size} ${window.getCurrentLanguage?.() === 'en' ? 'person online' : 'pessoa online'}`
                : `${users.size} ${window.getCurrentLanguage?.() === 'en' ? 'people online' : 'pessoas online'}`;
            count.textContent = translated === key ? fallback : translated;
        }
    }

    function updateGameMatchmakingOnlineCount() {
        const output = document.getElementById('gameMatchmakingOnlineCount');
        if (!output) return;

        const scope = readGameMatchmakingScope();
        const now = Date.now();
        const presence = readPresence();
        const online = Object.entries(presence).filter(([, entry]) => {
            if (!entry || now - Number(entry.timestamp || 0) >= PRESENCE_TIMEOUT) return false;
            if (scope.mode === 'global') return true;
            if (entry.courseId !== scope.courseId) return false;
            return scope.mode !== 'discipline' || entry.discipline === scope.discipline;
        });
        const users = new Set(online.map(([id, entry]) => entry.name || id));
        const count = users.size;
        const key = count === 1 ? 'games_matchmaking_online_one' : 'games_matchmaking_online_many';
        const translated = t(key, { count });
        output.textContent = translated === key
            ? `${count} ${count === 1 ? 'pessoa online' : 'pessoas online'}`
            : translated;
    }

    function refreshPresence() {
        const presence = readPresence();
        presence[presenceId] = {
            name: state.currentUser.name,
            courseId: state.currentCourseId,
            discipline: state.currentDiscipline,
            timestamp: Date.now()
        };
        Object.keys(presence).forEach(id => {
            if (Date.now() - presence[id].timestamp >= PRESENCE_TIMEOUT) delete presence[id];
        });
        localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(presence));
        updateOnlineCount();
        updateGameMatchmakingOnlineCount();
    }

    function startPresence() {
        if (presenceInterval) clearInterval(presenceInterval);
        refreshPresence();
        presenceInterval = setInterval(refreshPresence, PRESENCE_INTERVAL);
        window.addEventListener('storage', updateOnlineCount);
        window.addEventListener('storage', updateGameMatchmakingOnlineCount);
        if (window.i18nReady && typeof window.i18nReady.then === 'function') {
            window.i18nReady.then(updateOnlineCount).catch(error => {
                console.warn('[Comunidade] Não foi possível sincronizar a tradução da presença:', error);
            });
        }
        window.addEventListener('pagehide', () => {
            const presence = readPresence();
            delete presence[presenceId];
            localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(presence));
        }, { once: true });
    }

    function getCourseColor(courseId) {
        const colors = ['#6C8CFF', '#10b981', '#FBBF24', '#A78BFA', '#38BDF8', '#ef4444', '#ec4899', '#f59e0b'];
        let hash = 0;
        for (let i = 0; i < courseId.length; i++) {
            hash = courseId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    function getCourseInitial(courseName) {
        if (!courseName) return '?';
        return courseName.charAt(0).toUpperCase();
    }

    function getCourseImageUrl(courseId) {
        const course = state.courses.find(c => c.id === courseId);
        if (!course) return '';
        const alias = COURSE_PATH_ALIASES[courseId];
        const directory = alias ? alias.directory : courseId.replace(/_/g, '-');
        let basePath = '';
        if (course.courseLevel === 'graduacao') basePath = `../cursos/graduacao/${directory}/`;
        else if (course.courseLevel === 'pos-graduacao') basePath = `../cursos/pos-graduacao/${directory}/`;
        else if (course.courseLevel === 'ensino-medio') basePath = `../cursos/ensino-medio/${directory}/`;
        else if (course.courseLevel === 'idiomas') basePath = `../cursos/idiomas/${directory}/`;
        return basePath ? basePath + 'imagen-card.png' : '';
    }

    // ========================================================================
    // CARREGAR NOTAS (para anexar)
    // ========================================================================
    function loadNotes() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_NOTES);
            state.notes = stored ? JSON.parse(stored) : [];
        } catch (_) {
            state.notes = [];
        }
    }

    function populateNoteSelector() {
        const select = document.getElementById('noteAttachmentSelect');
        if (!select) return;
        loadNotes();
        select.innerHTML = '<option value="">' + t('no_note') + '</option>';
        state.notes.forEach(note => {
            const opt = document.createElement('option');
            opt.value = note.id;
            opt.textContent = note.titulo || 'Nota sem título';
            select.appendChild(opt);
        });
    }

    // ========================================================================
    // CARREGAR CURSOS E DISCIPLINAS (com fallback silencioso)
    // ========================================================================
    async function loadCoursesAndDisciplines() {
        try {
            const resp = await fetch(COURSES_JSON);
            if (!resp.ok) throw new Error('Erro ao carregar courses.json');
            const courses = await resp.json();

            const courseMap = {};
            const disciplinesMap = {};

            for (const course of courses) {
                const id = course.id;
                courseMap[id] = course;

                let dataPath = '';
                const level = course.courseLevel;
                const alias = COURSE_PATH_ALIASES[id];
                const directory = alias ? alias.directory : id.replace(/_/g, '-');
                const file = alias ? alias.file : directory;
                if (level === 'graduacao') dataPath = `graduacao/${directory}/${file}-data.json`;
                else if (level === 'pos-graduacao') dataPath = `pos-graduacao/${directory}/${file}-data.json`;
                else if (level === 'ensino-medio') dataPath = `ensino-medio/${directory}/${file}-data.json`;
                else if (level === 'idiomas') dataPath = `idiomas/${directory}/${file}-data.json`;
                else continue;

                try {
                    const fullPath = COURSE_DATA_BASE + dataPath;
                    const dResp = await fetch(fullPath);
                    if (dResp.ok) {
                        const data = await dResp.json();
                        const discSet = new Set();
                        if (data.stages && Array.isArray(data.stages)) {
                            for (const stage of data.stages) {
                                if (stage.disciplines && Array.isArray(stage.disciplines)) {
                                    for (const disc of stage.disciplines) {
                                        if (disc.name) discSet.add(disc.name);
                                    }

                                }
                            }
                        }
                        disciplinesMap[id] = [...discSet];
                    } else {
                        disciplinesMap[id] = [];
                    }
                } catch (_) {
                    disciplinesMap[id] = [];
                }
            }

            state.courses = Object.values(courseMap);
            state.disciplines = disciplinesMap;
            return true;
        } catch (error) {
            console.error('[Comunidade] Erro ao carregar cursos:', error);
            return false;
        }
    }

    async function refreshCourses() {
        const success = await loadCoursesAndDisciplines();
        if (!success) return;
        renderSidebar();
        if (state.currentCourseId && state.currentDiscipline) {
            selectDiscipline(state.currentCourseId, state.currentDiscipline);
        } else if (state.courses.length > 0) {
            const first = state.courses[0];
            const disciplines = state.disciplines[first.id] || [];
            selectDiscipline(first.id, disciplines.length > 0 ? disciplines[0] : null);
        }
    }

    // ========================================================================
    // BLOQUEIO POR OFENSAS - CHAT
    // ========================================================================
    function blockChat() {
        if (state.chatBlocked) return;
        state.chatBlocked = true;
        state.chatOffenseCount = 0;
        state.chatBlockRemaining = BLOCK_DURATION;
        updateChatBlockUI();
        updateChatStatus(false);
        const input = document.getElementById('p2pInput');
        const sendBtn = document.getElementById('p2pSendBtn');
        if (input) input.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        if (state.chatBlockTimer) clearInterval(state.chatBlockTimer);
        state.chatBlockTimer = setInterval(() => {
            state.chatBlockRemaining--;
            updateChatBlockUI();
            if (state.chatBlockRemaining <= 0) {
                unblockChat();
            }
        }, 1000);
        showToast(t('chat_blocked', { time: BLOCK_DURATION + 's' }), 'error');
    }

    function unblockChat() {
        state.chatBlocked = false;
        state.chatBlockRemaining = 0;
        if (state.chatBlockTimer) {
            clearInterval(state.chatBlockTimer);
            state.chatBlockTimer = null;
        }
        updateChatBlockUI();
        updateChatStatus(true);
        const input = document.getElementById('p2pInput');
        const sendBtn = document.getElementById('p2pSendBtn');
        if (input) input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        showToast(t('chat_unblocked'), 'success');
    }

    function updateChatBlockUI() {
        const statusEl = document.getElementById('chatBlockStatus');
        if (!statusEl) return;
        if (state.chatBlocked && state.chatBlockRemaining > 0) {
            const mins = Math.floor(state.chatBlockRemaining / 60);
            const secs = state.chatBlockRemaining % 60;
            let timeStr = '';
            if (mins > 0) timeStr += mins + 'm ';
            timeStr += secs + 's';
            statusEl.textContent = t('chat_blocked', { time: timeStr });
            statusEl.classList.add('show');
        } else {
            statusEl.classList.remove('show');
        }
    }

    function resetChatOffenseTimer() {
        if (state.chatOffenseTimer) {
            clearTimeout(state.chatOffenseTimer);
            state.chatOffenseTimer = null;
        }
        state.chatOffenseCount = 0;
    }

    function checkChatOffenses() {
        if (state.chatOffenseTimer) clearTimeout(state.chatOffenseTimer);
        state.chatOffenseTimer = setTimeout(() => {
            resetChatOffenseTimer();
        }, OFFENSE_WINDOW);
    }

    // ========================================================================
    // BLOQUEIO POR OFENSAS - POSTS
    // ========================================================================
    function blockPostCreation() {
        if (state.postBlocked) return;
        state.postBlocked = true;
        state.postOffenseCount = 0;
        state.postBlockRemaining = BLOCK_DURATION;
        updatePostBlockUI();
        if (state.postBlockTimer) clearInterval(state.postBlockTimer);
        state.postBlockTimer = setInterval(() => {
            state.postBlockRemaining--;
            updatePostBlockUI();
            if (state.postBlockRemaining <= 0) {
                unblockPostCreation();
            }
        }, 1000);
        showToast(t('post_blocked', { time: BLOCK_DURATION + 's' }), 'error');
    }

    function unblockPostCreation() {
        state.postBlocked = false;
        state.postBlockRemaining = 0;
        if (state.postBlockTimer) {
            clearInterval(state.postBlockTimer);
            state.postBlockTimer = null;
        }
        updatePostBlockUI();
        showToast(t('post_unblocked'), 'success');
    }

    function updatePostBlockUI() {
        // Pode ser exibido em algum lugar, mas por enquanto apenas toast
    }

    function resetPostOffenseTimer() {
        if (state.postOffenseTimer) {
            clearTimeout(state.postOffenseTimer);
            state.postOffenseTimer = null;
        }
        state.postOffenseCount = 0;
    }

    function checkPostOffenses() {
        if (state.postOffenseTimer) clearTimeout(state.postOffenseTimer);
        state.postOffenseTimer = setTimeout(() => {
            resetPostOffenseTimer();
        }, OFFENSE_WINDOW);
    }

    // ========================================================================
    // BLOQUEIO POR OFENSAS - COMENTÁRIOS
    // ========================================================================
    function blockCommentCreation() {
        if (state.commentBlocked) return;
        state.commentBlocked = true;
        state.commentOffenseCount = 0;
        state.commentBlockRemaining = BLOCK_DURATION;
        updateCommentBlockUI();
        if (state.commentBlockTimer) clearInterval(state.commentBlockTimer);
        state.commentBlockTimer = setInterval(() => {
            state.commentBlockRemaining--;
            updateCommentBlockUI();
            if (state.commentBlockRemaining <= 0) {
                unblockCommentCreation();
            }
        }, 1000);
        showToast(t('comment_blocked', { time: BLOCK_DURATION + 's' }), 'error');
    }

    function unblockCommentCreation() {
        state.commentBlocked = false;
        state.commentBlockRemaining = 0;
        if (state.commentBlockTimer) {
            clearInterval(state.commentBlockTimer);
            state.commentBlockTimer = null;
        }
        updateCommentBlockUI();
        showToast(t('comment_unblocked'), 'success');
    }

    function updateCommentBlockUI() {
        // Pode ser exibido em algum lugar, mas por enquanto apenas toast
    }

    function resetCommentOffenseTimer() {
        if (state.commentOffenseTimer) {
            clearTimeout(state.commentOffenseTimer);
            state.commentOffenseTimer = null;
        }
        state.commentOffenseCount = 0;
    }

    function checkCommentOffenses() {
        if (state.commentOffenseTimer) clearTimeout(state.commentOffenseTimer);
        state.commentOffenseTimer = setTimeout(() => {
            resetCommentOffenseTimer();
        }, OFFENSE_WINDOW);
    }

    // ========================================================================
    // GERENCIAR POSTS
    // ========================================================================
    function getStorageKey(courseId, discipline) {
        return `${STORAGE_KEY_POSTS}${courseId}_${discipline}`;
    }

    function loadPosts(courseId, discipline) {
        const key = getStorageKey(courseId, discipline);
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (_) { return []; }
    }

    function savePosts(courseId, discipline, posts) {
        const key = getStorageKey(courseId, discipline);
        localStorage.setItem(key, JSON.stringify(posts));
        localStorage.setItem('comunidade_sync_' + Date.now(), 'updated');
    }

    function addPost(courseId, discipline, title, contentHtml, noteId) {
        if (state.postBlocked) {
            showToast(t('post_blocked_msg'), 'error');
            return null;
        }

        const plainText = contentHtml.replace(/<[^>]*>/g, '');
        if (hasExcessiveWords(`${title} ${plainText}`)) {
            blockPostCreation();
            showToast(t('content_removed_too_many_words', { limit: MAX_CONTENT_WORDS }), 'error');
            return null;
        }
        let censored = false;
        if (hasOffensiveContent(plainText) || hasOffensiveContent(title)) {
            state.postOffenseCount++;
            checkPostOffenses();
            if (state.postOffenseCount >= OFFENSE_LIMIT_POST) {
                blockPostCreation();
            }
            title = censorText(title);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentHtml;
            const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                node.textContent = censorText(node.textContent);
            }
            contentHtml = tempDiv.innerHTML;
            censored = true;
        }
        title = maskDigits(title);
        contentHtml = maskHtmlDigits(contentHtml);

        const posts = loadPosts(courseId, discipline);
        let attachedNote = null;
        if (noteId) {
            const note = state.notes.find(n => n.id === noteId);
            if (note) {
                attachedNote = {
                    id: note.id,
                    title: maskDigits(note.titulo),
                    preview: maskDigits(note.conteudo ? note.conteudo.substring(0, 100) : '')
                };
            }
        }
        const newPost = {
            id: generateId(),
            author: state.currentUser.name,
            avatar: state.currentUser.avatar || null,
            title: title.trim(),
            content: contentHtml,
            timestamp: new Date().toISOString(),
            likes: [],
            comments: [],
            note: attachedNote,
            censored: censored
        };
        posts.unshift(newPost);
        savePosts(courseId, discipline, posts);
        return newPost;
    }

    function addPoll(courseId, discipline, question, options) {
        if (state.postBlocked) { showToast(t('post_blocked_msg'), 'error'); return null; }
        if (hasExcessiveWords(`${question} ${options.join(' ')}`)) {
            blockPostCreation();
            showToast(t('content_removed_too_many_words', { limit: MAX_CONTENT_WORDS }), 'error');
            return null;
        }
        question = maskDigits(censorText(question.trim()));
        options = options.map(o => maskDigits(censorText(o.trim())));
        const posts = loadPosts(courseId, discipline);
        const poll = { id: generateId(), type: 'poll', author: state.currentUser.name,
            avatar: state.currentUser.avatar || null, title: question, question, options,
            votes: options.map(() => 0), voters: {}, timestamp: new Date().toISOString(),
            likes: [], comments: [], censored: false };
        posts.unshift(poll); savePosts(courseId, discipline, posts); return poll;
    }

    function editPost(courseId, discipline, postId, title, contentHtml, noteId) {
        const posts = loadPosts(courseId, discipline);
        const idx = posts.findIndex(p => p.id === postId);
        if (idx === -1 || posts[idx].author !== state.currentUser.name) return false;

        const plainText = contentHtml.replace(/<[^>]*>/g, '');
        if (hasExcessiveWords(`${title} ${plainText}`)) {
            deletePost(courseId, discipline, postId);
            blockPostCreation();
            showToast(t('content_removed_too_many_words', { limit: MAX_CONTENT_WORDS }), 'error');
            return false;
        }
        let censored = false;
        if (hasOffensiveContent(plainText) || hasOffensiveContent(title)) {
            state.postOffenseCount++;
            checkPostOffenses();
            if (state.postOffenseCount >= OFFENSE_LIMIT_POST) {
                blockPostCreation();
            }
            title = censorText(title);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = contentHtml;
            const walker = document.createTreeWalker(tempDiv, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while (node = walker.nextNode()) {
                node.textContent = censorText(node.textContent);
            }
            contentHtml = tempDiv.innerHTML;
            censored = true;
        }
        title = maskDigits(title);
        contentHtml = maskHtmlDigits(contentHtml);

        posts[idx].title = title.trim();
        posts[idx].content = contentHtml;
        posts[idx].edited = true;
        posts[idx].censored = censored;
        if (noteId) {
            const note = state.notes.find(n => n.id === noteId);
            if (note) {
                posts[idx].note = {
                    id: note.id,
                    title: maskDigits(note.titulo),
                    preview: maskDigits(note.conteudo ? note.conteudo.substring(0, 100) : '')
                };
            } else {
                posts[idx].note = null;
            }
        } else {
            posts[idx].note = null;
        }
        savePosts(courseId, discipline, posts);
        return true;
    }

    function deletePost(courseId, discipline, postId) {
        const posts = loadPosts(courseId, discipline);
        const idx = posts.findIndex(p => p.id === postId);
        if (idx === -1 || posts[idx].author !== state.currentUser.name) return false;
        posts.splice(idx, 1);
        savePosts(courseId, discipline, posts);
        return true;
    }

    function refreshPostsAfterDeletion() {
        state.posts = loadPosts(state.currentCourseId, state.currentDiscipline);
        renderPosts();
    }

    function toggleLike(courseId, discipline, postId) {
        const posts = loadPosts(courseId, discipline);
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const idx = post.likes.indexOf(state.currentUser.name);
        if (idx > -1) post.likes.splice(idx, 1);
        else post.likes.push(state.currentUser.name);
        savePosts(courseId, discipline, posts);
    }

    function addComment(courseId, discipline, postId, text) {
        if (state.commentBlocked) {
            showToast(t('comment_blocked_msg'), 'error');
            return null;
        }

        if (hasExcessiveWords(text)) {
            blockCommentCreation();
            showToast(t('content_removed_too_many_words', { limit: MAX_CONTENT_WORDS }), 'error');
            return null;
        }

        let censored = false;
        if (hasOffensiveContent(text)) {
            state.commentOffenseCount++;
            checkCommentOffenses();
            if (state.commentOffenseCount >= OFFENSE_LIMIT_COMMENT) {
                blockCommentCreation();
            }
            text = censorText(text);
            censored = true;
        }

        const posts = loadPosts(courseId, discipline);
        const post = posts.find(p => p.id === postId);
        if (!post) return null;

        const comment = {
            id: generateId(),
            author: state.currentUser.name,
            avatar: state.currentUser.avatar || null,
            text: maskDigits(text.trim()),
            timestamp: new Date().toISOString(),
            likes: [],
            censored: censored
        };
        post.comments.push(comment);
        savePosts(courseId, discipline, posts);
        return comment;
    }

    function editComment(courseId, discipline, postId, commentId, newText) {
        const posts = loadPosts(courseId, discipline);
        const post = posts.find(p => p.id === postId);
        if (!post) return false;
        const comment = post.comments.find(c => c.id === commentId);
        if (!comment || comment.author !== state.currentUser.name) return false;

        if (hasExcessiveWords(newText)) {
            deleteComment(courseId, discipline, postId, commentId);
            blockCommentCreation();
            showToast(t('content_removed_too_many_words', { limit: MAX_CONTENT_WORDS }), 'error');
            return false;
        }

        let censored = false;
        if (hasOffensiveContent(newText)) {
            state.commentOffenseCount++;
            checkCommentOffenses();
            if (state.commentOffenseCount >= OFFENSE_LIMIT_COMMENT) {
                blockCommentCreation();
            }
            newText = censorText(newText);
            censored = true;
        }

        comment.text = maskDigits(newText.trim());
        comment.edited = true;
        comment.censored = censored;
        savePosts(courseId, discipline, posts);
        return true;
    }

    function deleteComment(courseId, discipline, postId, commentId) {
        const posts = loadPosts(courseId, discipline);
        const post = posts.find(p => p.id === postId);
        if (!post) return false;
        const idx = post.comments.findIndex(c => c.id === commentId);
        if (idx === -1 || post.comments[idx].author !== state.currentUser.name) return false;
        post.comments.splice(idx, 1);
        savePosts(courseId, discipline, posts);
        return true;
    }

    function toggleCommentLike(courseId, discipline, postId, commentId) {
        const posts = loadPosts(courseId, discipline);
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const comment = post.comments.find(c => c.id === commentId);
        if (!comment) return;
        const idx = comment.likes.indexOf(state.currentUser.name);
        if (idx > -1) comment.likes.splice(idx, 1);
        else comment.likes.push(state.currentUser.name);
        savePosts(courseId, discipline, posts);
    }

    // ========================================================================
    // CHAT
    // ========================================================================
    function getChatKey(courseId, discipline) {
        return `${STORAGE_KEY_CHAT}${courseId}_${discipline}`;
    }

    function loadChatMessages(courseId, discipline) {
        const key = getChatKey(courseId, discipline);
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : [];
        } catch (_) { return []; }
    }

    function saveChatMessages(courseId, discipline, messages) {
        const key = getChatKey(courseId, discipline);
        localStorage.setItem(key, JSON.stringify(messages));
        localStorage.setItem('comunidade_sync_' + Date.now(), 'chat_updated');
    }

    function addChatMessage(courseId, discipline, user, text, type = 'text', articleData = null) {
        if (state.chatBlocked) {
            showToast(t('chat_blocked_msg'), 'error');
            return null;
        }

        let finalText = text.trim();
        let censored = false;
        if (type === 'text') {
            if (hasExcessiveWords(finalText)) {
                blockChat();
                showToast(t('content_removed_too_many_words', { limit: MAX_CONTENT_WORDS }), 'error');
                return null;
            }
            if (hasOffensiveContent(finalText)) {
                state.chatOffenseCount++;
                checkChatOffenses();
                if (state.chatOffenseCount >= OFFENSE_LIMIT_CHAT) {
                    blockChat();
                }
                finalText = censorText(finalText);
                censored = true;
            }
            if (finalText.length > MAX_CHAT_MESSAGE_LENGTH) {
                finalText = finalText.substring(0, MAX_CHAT_MESSAGE_LENGTH);
            }
            finalText = maskDigits(finalText);
        } else if (articleData) {
            articleData = {
                ...articleData,
                title: maskDigits(articleData.title),
                preview: maskDigits(articleData.preview),
                question: maskDigits(articleData.question),
                options: articleData.options ? articleData.options.map(maskDigits) : articleData.options
            };
        }

        const messages = loadChatMessages(courseId, discipline);
        const msg = {
            id: generateId(),
            user: user,
            text: finalText,
            timestamp: new Date().toISOString(),
            likes: [],
            local: true,
            type: type,
            articleData: articleData,
            censored: censored
        };
        messages.push(msg);
        if (messages.length > MAX_CHAT_MESSAGES) messages.splice(0, messages.length - MAX_CHAT_MESSAGES);
        saveChatMessages(courseId, discipline, messages);
        return msg;
    }

    function editChatMessage(courseId, discipline, msgId, newText) {
        const messages = loadChatMessages(courseId, discipline);
        const msg = messages.find(m => m.id === msgId);
        if (!msg || msg.user !== state.currentUser.name) return false;

        let finalText = newText.trim();
        let censored = false;
        if (hasExcessiveWords(finalText)) {
            deleteChatMessage(courseId, discipline, msgId);
            blockChat();
            showToast(t('content_removed_too_many_words', { limit: MAX_CONTENT_WORDS }), 'error');
            return false;
        }
        if (msg.type === 'text') {
            if (hasOffensiveContent(finalText)) {
                state.chatOffenseCount++;
                checkChatOffenses();
                if (state.chatOffenseCount >= OFFENSE_LIMIT_CHAT) {
                    blockChat();
                }
                finalText = censorText(finalText);
                censored = true;
            }
            if (finalText.length > MAX_CHAT_MESSAGE_LENGTH) {
                finalText = finalText.substring(0, MAX_CHAT_MESSAGE_LENGTH);
            }
            finalText = maskDigits(finalText);
        }

        if (msg.type === 'article') {
            msg.type = 'text';
            msg.text = finalText;
            msg.articleData = null;
            msg.censored = censored;
        } else {
            msg.text = finalText;
            msg.censored = censored;
        }
        msg.edited = true;
        saveChatMessages(courseId, discipline, messages);
        return true;
    }

    function deleteChatMessage(courseId, discipline, msgId) {
        const messages = loadChatMessages(courseId, discipline);
        const idx = messages.findIndex(m => m.id === msgId);
        if (idx === -1 || messages[idx].user !== state.currentUser.name) return false;
        messages.splice(idx, 1);
        saveChatMessages(courseId, discipline, messages);
        return true;
    }

    function toggleChatLike(courseId, discipline, msgId) {
        const messages = loadChatMessages(courseId, discipline);
        const msg = messages.find(m => m.id === msgId);
        if (!msg) return;
        const idx = msg.likes.indexOf(state.currentUser.name);
        if (idx > -1) msg.likes.splice(idx, 1);
        else msg.likes.push(state.currentUser.name);
        saveChatMessages(courseId, discipline, messages);
    }

    // ========================================================================
    // COMPARTILHAR ARTIGO NO CHAT
    // ========================================================================
    function shareArticleInChat(post) {
        if (!state.currentCourseId || !state.currentDiscipline) {
            showToast(t('select_discipline_first'), 'error');
            return;
        }
        if (state.chatBlocked) {
            showToast(t('chat_blocked_msg'), 'error');
            return;
        }

        const course = state.courses.find(c => c.id === state.currentCourseId);
        const courseName = course ? course.name : 'Curso';
        const disciplineName = state.currentDiscipline || 'Disciplina';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = post.content || post.question || '';
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        const preview = plainText.length > 100 ? plainText.substring(0, 100) + '…' : plainText;

        const articleData = {
            id: post.id,
            title: post.title,
            author: post.author,
            course: courseName,
            discipline: disciplineName,
            preview: preview,
            timestamp: post.timestamp
        };
        if (post.type === 'poll') {
            articleData.question = post.question;
            articleData.options = post.options;
            articleData.votes = post.votes;
        }

        const user = state.currentUser.name || 'Anônimo';
        addChatMessage(state.currentCourseId, state.currentDiscipline, user, '', post.type === 'poll' ? 'poll' : 'article', articleData);
        renderChatMessages();
        showToast(t('article_shared'), 'success');
        closeShareArticleModal();
    }

    // ========================================================================
    // MODAL DE COMPARTILHAR ARTIGO
    // ========================================================================
    function openShareArticleModal() {
        const modal = document.getElementById('shareArticleModal');
        if (!modal) return;
        modal.style.display = 'flex';
        modal.removeAttribute('aria-hidden');
        modal.removeAttribute('inert');
        renderShareArticleList();
    }

    function closeShareArticleModal() {
        const modal = document.getElementById('shareArticleModal');
        if (!modal) return;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', '');
    }

    function renderShareArticleList() {
        const container = document.getElementById('shareArticleList');
        if (!container) return;

        const allPosts = [];
        const shareType = document.querySelector('.share-tab.active')?.dataset.shareType || 'article';
        for (const course of state.courses) {
            const disciplines = state.disciplines[course.id] || [];
            for (const disc of disciplines) {
                const posts = loadPosts(course.id, disc);
                const userPosts = posts.filter(p => p.author === state.currentUser.name && (shareType === 'poll' ? p.type === 'poll' : p.type !== 'poll'));
                if (userPosts.length > 0) {
                    allPosts.push({
                        course: course,
                        discipline: disc,
                        posts: userPosts
                    });
                }
            }
        }

        if (allPosts.length === 0) {
            container.innerHTML = `
                <div class="share-empty">
                    <i class="fas fa-file-alt" style="font-size:2rem;opacity:0.4;margin-bottom:0.5rem;"></i>
                    <p>${t(shareType === 'poll' ? 'no_polls_to_share' : 'no_articles_to_share')}</p>
                </div>
            `;
            return;
        }

        let html = '';
        for (const group of allPosts) {
            const course = group.course;
            const color = getCourseColor(course.id);
            html += `
                <div class="share-course-group">
                    <div class="share-course-title" style="border-left: 3px solid ${color};">
                        <i class="fas fa-graduation-cap" style="color:${color};"></i>
                        ${escapeHtml(course.name)}
                    </div>
                    <div class="share-discipline-group">
                        <div class="share-discipline-title">
                            <i class="fas fa-book-open"></i> ${escapeHtml(group.discipline)}
                        </div>
            `;
            for (const post of group.posts) {
                const time = formatDate(post.timestamp);
                html += `
                    <div class="share-article-item">
                        <span class="share-article-title">${escapeHtml(maskDigits(post.question || post.title))}</span>
                        <span class="share-article-meta">${time}</span>
                        <button class="share-article-btn" data-post-id="${post.id}" data-course-id="${course.id}" data-discipline="${escapeHtml(group.discipline)}">
                            <i class="fas fa-share"></i> ${t('share')}
                        </button>
                    </div>
                `;
            }
            html += `
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;

        container.querySelectorAll('.share-article-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const courseId = this.dataset.courseId;
                const discipline = this.dataset.discipline;
                const posts = loadPosts(courseId, discipline);
                const post = posts.find(p => p.id === postId);
                if (post) shareArticleInChat(post);
            });
        });
    }

    // ========================================================================
    // RENDERIZAÇÃO DO CHAT
    // ========================================================================
    function renderChatMessages() {
        const container = document.getElementById('p2pMessages');
        if (!container) return;

        const messages = loadChatMessages(state.currentCourseId, state.currentDiscipline);
        if (messages.length === 0) {
            container.innerHTML = `<div class="msg" style="color:var(--com-text-tertiary);font-style:italic;">${t('connect_to_chat')}</div>`;
            return;
        }

        let html = '';
        for (const msg of messages) {
            const user = msg.user || 'Anônimo';
            const time = formatDate(msg.timestamp);
            const likes = msg.likes || [];
            const isLiked = likes.includes(state.currentUser.name);
            const likeCount = likes.length;
            const isOwner = user === state.currentUser.name;
            const isEditing = state.editingChatMessageId === msg.id;

            let textContent = '';
            let articlePreviewHtml = '';

            if ((msg.type === 'article' || msg.type === 'poll') && msg.articleData) {
                const data = msg.articleData;
                const pollOptions = msg.type === 'poll' ? (data.options || []).map((option, index) =>
                    `<div class="chat-poll-option">${escapeHtml(maskDigits(option))} <span>${(data.votes || [])[index] || 0}</span></div>`).join('') : '';
                articlePreviewHtml = `
                    <div class="chat-article-preview ${msg.type === 'poll' ? 'chat-poll-preview' : ''}">
                        <div class="chat-article-header">
                            <span class="chat-article-title">${msg.type === 'poll' ? '📊 ' : ''}${escapeHtml(maskDigits(data.question || data.title))}</span>
                            <span class="chat-article-author">por ${escapeHtml(data.author)}</span>
                        </div>
                        <div class="chat-article-meta">
                            <span>📚 ${escapeHtml(data.course)} · ${escapeHtml(data.discipline)}</span>
                        </div>
                        <div class="chat-article-preview-text">${escapeHtml(maskDigits(data.preview))}</div>
                        ${pollOptions}
                        <button class="chat-article-view-btn" data-post-id="${data.id}" data-course-id="${state.currentCourseId}" data-discipline="${state.currentDiscipline}">
                            <i class="fas fa-eye"></i> ${t('view_article')}
                        </button>
                    </div>
                `;
                textContent = articlePreviewHtml;
            } else {
                let rawText = escapeHtml(maskDigits(msg.text));
                rawText = rawText.replace(IMG_URL_REGEX, (url) => `<img src="${url}" alt="GIF" />`);
                rawText = rawText.replace(/\n/g, '<br>');
                if (msg.censored) {
                    rawText += ` <span style="font-size:0.6rem;color:var(--com-accent-orange);">(${t('censored')})</span>`;
                }
                textContent = rawText;
            }

            html += `
                <div class="msg" data-msg-id="${msg.id}">
                    <div class="msg-header">
                        <span class="user">${escapeHtml(user)}</span>
                        <span class="time">${time}</span>
                    </div>
                    <div class="msg-body">
                        ${isEditing ? `
                            <div class="msg-edit-area">
                                <input type="text" class="chat-edit-input" data-msg-id="${msg.id}" value="${escapeHtml(maskDigits(msg.text))}" />
                                <button class="chat-edit-save" data-msg-id="${msg.id}"><i class="fas fa-check"></i></button>
                                <button class="chat-edit-cancel" data-msg-id="${msg.id}"><i class="fas fa-times"></i></button>
                            </div>
                        ` : `
                            <div class="msg-text">${textContent}</div>
                            <div class="msg-actions">
                                <button class="msg-like ${isLiked ? 'liked' : ''}" data-msg-id="${msg.id}" title="${t('like')}">
                                    <i class="fas fa-heart"></i> ${likeCount > 0 ? likeCount : ''}
                                </button>
                                ${isOwner ? `
                                    <button class="chat-edit-btn" data-msg-id="${msg.id}" title="${t('edit')}"><i class="fas fa-pencil-alt"></i></button>
                                    <button class="chat-delete-btn" data-msg-id="${msg.id}" title="${t('delete')}"><i class="fas fa-trash-alt"></i></button>
                                ` : ''}
                            </div>
                        `}
                    </div>
                </div>
            `;
        }
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;

        // Event listeners
        container.querySelectorAll('.chat-edit-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const msgId = this.dataset.msgId;
                state.editingChatMessageId = msgId;
                renderChatMessages();
                const input = container.querySelector(`.chat-edit-input[data-msg-id="${msgId}"]`);
                if (input) input.focus();
            });
        });

        container.querySelectorAll('.chat-edit-save').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const msgId = this.dataset.msgId;
                const input = container.querySelector(`.chat-edit-input[data-msg-id="${msgId}"]`);
                if (!input) return;
                const newText = input.value.trim();
                if (!newText) return;
                editChatMessage(state.currentCourseId, state.currentDiscipline, msgId, newText);
                state.editingChatMessageId = null;
                renderChatMessages();
            });
        });

        container.querySelectorAll('.chat-edit-cancel').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                state.editingChatMessageId = null;
                renderChatMessages();
            });
        });

        container.querySelectorAll('.chat-delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const msgId = this.dataset.msgId;
                if (confirm(t('comunidade_confirm_delete'))) {
                    deleteChatMessage(state.currentCourseId, state.currentDiscipline, msgId);
                    renderChatMessages();
                }
            });
        });

        container.querySelectorAll('.msg-like').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const msgId = this.dataset.msgId;
                toggleChatLike(state.currentCourseId, state.currentDiscipline, msgId);
                renderChatMessages();
            });
        });

        container.querySelectorAll('.chat-article-view-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const postId = this.dataset.postId;
                const courseId = this.dataset.courseId;
                const discipline = this.dataset.discipline;
                if (courseId && discipline) {
                    if (state.currentCourseId === courseId && state.currentDiscipline === discipline) {
                        scrollToPost(postId);
                    } else {
                        selectDiscipline(courseId, discipline, postId);
                    }
                }
            });
        });

        container.querySelectorAll('.chat-edit-input').forEach(input => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const msgId = this.dataset.msgId;
                    const saveBtn = container.querySelector(`.chat-edit-save[data-msg-id="${msgId}"]`);
                    if (saveBtn) saveBtn.click();
                }
                if (e.key === 'Escape') {
                    const msgId = this.dataset.msgId;
                    const cancelBtn = container.querySelector(`.chat-edit-cancel[data-msg-id="${msgId}"]`);
                    if (cancelBtn) cancelBtn.click();
                }
            });
        });
    }

    // ========================================================================
    // FUNÇÃO DE ENVIO DE MENSAGEM
    // ========================================================================
    function sendLocalChatMessage() {
        if (state.chatBlocked) {
            showToast(t('chat_blocked_msg'), 'error');
            return;
        }

        const input = document.getElementById('p2pInput');
        if (!input) return;
        const text = input.value;
        if (!state.currentCourseId || !state.currentDiscipline) {
            showToast(t('select_discipline_first'), 'error');
            return;
        }
        if (!text.trim()) return;

        const user = state.currentUser.name || 'Anônimo';
        const message = addChatMessage(state.currentCourseId, state.currentDiscipline, user, text);
        if (message) {
            broadcastPeerChatMessage(state.currentCourseId, state.currentDiscipline, message);
            renderChatMessages();
            input.value = '';
            input.dispatchEvent(new Event('input'));
            input.focus();
        }
    }

    // ========================================================================
    // SCROLL PARA POST
    // ========================================================================
    function scrollToPost(postId) {
        const postElement = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postElement.style.transition = 'border-color 0.5s, box-shadow 0.5s';
            postElement.style.borderColor = 'var(--com-accent-orange)';
            postElement.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.3)';
            setTimeout(() => {
                postElement.style.borderColor = '';
                postElement.style.boxShadow = '';
            }, 3000);
        } else {
            showToast(t('article_not_found'), 'error');
        }
    }

    // ========================================================================
    // EMOJI PICKER (chat)
    // ========================================================================
    function initEmojiPicker() {
        const picker = document.getElementById('emojiPicker');
        if (!picker) return;
        picker.innerHTML = '';
        EMOJIS.forEach(emoji => {
            const btn = document.createElement('button');
            btn.className = 'emoji-option';
            btn.textContent = emoji;
            btn.addEventListener('click', function() {
                const input = document.getElementById('p2pInput');
                if (input) {
                    const cursorPos = input.selectionStart;
                    const text = input.value;
                    input.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
                    input.focus();
                    input.selectionStart = input.selectionEnd = cursorPos + emoji.length;
                    input.dispatchEvent(new Event('input'));
                }
                picker.classList.remove('open');
            });
            picker.appendChild(btn);
        });

        const toggle = document.getElementById('emojiToggle');
        const positionPicker = () => {
            const rect = toggle.getBoundingClientRect();
            const left = Math.min(
                Math.max(8, rect.left + (rect.width - picker.offsetWidth) / 2),
                window.innerWidth - picker.offsetWidth - 8
            );
            picker.style.left = `${left}px`;
            const above = rect.top - picker.offsetHeight - 8;
            const below = rect.bottom + 8;
            picker.style.top = `${Math.max(8, above >= 8 ? above : Math.min(below, window.innerHeight - picker.offsetHeight - 8))}px`;
        };
        if (toggle) {
            toggle.addEventListener('click', function(e) {
                e.stopPropagation();
                const shouldOpen = !picker.classList.contains('open');
                picker.classList.toggle('open', shouldOpen);
                if (shouldOpen) {
                    positionPicker();
                } else {
                    picker.style.left = '';
                    picker.style.top = '';
                }
            });
        }

        window.addEventListener('resize', () => {
            if (!picker.classList.contains('open') || !toggle) return;
            positionPicker();
        });

        document.addEventListener('click', function(e) {
            if (!picker.contains(e.target) && e.target !== toggle) {
                picker.classList.remove('open');
            }
        });
    }

    // ========================================================================
    // EMOJI PICKER (comentários)
    // ========================================================================
    function initCommentEmojiPickers() {
        const closePicker = (picker) => {
            const originalWrapper = picker.__commentWrapper;
            if (originalWrapper) {
                originalWrapper.appendChild(picker);
                delete originalWrapper.__commentPicker;
                delete picker.__commentWrapper;
            }
            picker.classList.remove('open');
            picker.style.left = '';
            picker.style.top = '';
        };

        const positionPicker = (toggle, picker) => {
            const rect = toggle.getBoundingClientRect();
            const pickerWidth = picker.offsetWidth || 220;
            const pickerHeight = picker.offsetHeight || 150;
            const left = Math.min(
                Math.max(8, rect.left + (rect.width - pickerWidth) / 2),
                window.innerWidth - pickerWidth - 8
            );
            const above = rect.top - pickerHeight - 8;
            const below = rect.bottom + 8;
            const top = above >= 8 ? above : Math.min(below, window.innerHeight - pickerHeight - 8);
            picker.style.left = `${left}px`;
            picker.style.top = `${top}px`;
        };

        document.addEventListener('click', function(e) {
            const toggle = e.target.closest('.comment-emoji-toggle');
            if (toggle) {
                e.stopPropagation();
                const wrapper = toggle.closest('.input-wrapper');
                if (!wrapper) return;
                const picker = wrapper.__commentPicker || wrapper.querySelector('.comment-emoji-picker');
                if (picker) {
                    const shouldOpen = !picker.classList.contains('open');
                    if (!shouldOpen) {
                        closePicker(picker);
                        return;
                    }
                    picker.__commentWrapper = wrapper;
                    wrapper.__commentPicker = picker;
                    document.body.appendChild(picker);
                    picker.classList.toggle('open', shouldOpen);
                    requestAnimationFrame(() => positionPicker(toggle, picker));
                }
            }
        });

        document.addEventListener('click', function(e) {
            const pickers = document.querySelectorAll('.comment-emoji-picker');
            pickers.forEach(picker => {
                if (!picker.contains(e.target) && !e.target.closest('.comment-emoji-toggle')) {
                    closePicker(picker);
                }
            });
        });

        window.addEventListener('resize', function() {
            document.querySelectorAll('.comment-emoji-picker.open').forEach(picker => {
                const toggle = picker.closest('.input-wrapper')?.querySelector('.comment-emoji-toggle');
                const originalWrapper = picker.__commentWrapper;
                const pickerToggle = originalWrapper?.querySelector('.comment-emoji-toggle');
                if (pickerToggle) {
                    positionPicker(pickerToggle, picker);
                    return;
                }
                if (!toggle) return;
                positionPicker(toggle, picker);
            });
        });

        document.addEventListener('click', function(e) {
            const emojiBtn = e.target.closest('.comment-emoji-option');
            if (!emojiBtn) return;
            const picker = emojiBtn.closest('.comment-emoji-picker');
            const wrapper = picker?.__commentWrapper || emojiBtn.closest('.input-wrapper');
            if (!wrapper) return;
            const input = wrapper.querySelector('.comment-input');
            if (!input) return;
            const emoji = emojiBtn.textContent;
            const cursorPos = input.selectionStart;
            const text = input.value;
            input.value = text.slice(0, cursorPos) + emoji + text.slice(cursorPos);
            input.focus();
            input.selectionStart = input.selectionEnd = cursorPos + emoji.length;
            if (picker) closePicker(picker);
        });
    }

    // ========================================================================
    // GIF MODAL
    // ========================================================================
    let gifTargetInput = null;

    function openGifModal(targetInput) {
        gifTargetInput = targetInput;
        const modal = document.getElementById('gifModal');
        if (!modal) return;
        modal.style.display = 'flex';
        const urlInput = document.getElementById('gifUrlInput');
        const previewContainer = document.getElementById('gifPreview');
        if (urlInput) {
            urlInput.value = '';
            urlInput.placeholder = 'Cole a URL de um GIF (ex: https://i.imgur.com/abc.gif)';
            urlInput.focus();
        }
        if (previewContainer) {
            previewContainer.innerHTML = '<span class="gif-preview-placeholder">Cole uma URL para ver a prévia</span>';
        }
        const resultsContainer = document.getElementById('gifResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
        }
    }

    function closeGifModal() {
        const modal = document.getElementById('gifModal');
        if (modal) modal.style.display = 'none';
        gifTargetInput = null;
        const previewContainer = document.getElementById('gifPreview');
        if (previewContainer) previewContainer.innerHTML = '<span class="gif-preview-placeholder">Cole uma URL para ver a prévia</span>';
    }

    function insertGifUrl(url) {
        if (gifTargetInput) {
            const input = gifTargetInput;
            const cursorPos = input.selectionStart;
            const text = input.value;
            input.value = text.slice(0, cursorPos) + ' ' + url + ' ' + text.slice(cursorPos);
            input.focus();
            input.selectionStart = input.selectionEnd = cursorPos + url.length + 2;
            closeGifModal();
            input.dispatchEvent(new Event('input'));
        }
    }

    function previewGifUrl(url) {
        const previewContainer = document.getElementById('gifPreview');
        if (!previewContainer) return;
        if (!url || !url.match(/https?:\/\/[^\s]+\.(?:gif|png|jpg|jpeg|webp|bmp|svg)(?:\?[^\s]*)?/i)) {
            previewContainer.innerHTML = '<span class="gif-preview-placeholder">Cole uma URL para ver a prévia</span>';
            return;
        }
        previewContainer.innerHTML = `
            <img src="${url}" alt="Prévia GIF" onclick="window.Comunidade.insertGifUrl('${url}')" />
            <br>
            <small style="color:var(--text-tertiary);">Clique na imagem para inserir</small>
        `;
    }

    function initGifModal() {
        const modal = document.getElementById('gifModal');
        if (!modal) return;
        const closeBtn = document.getElementById('closeGifModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeGifModal);
        }
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeGifModal();
        });

        const urlInput = document.getElementById('gifUrlInput');
        if (urlInput) {
            let debounceTimer;
            urlInput.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    previewGifUrl(this.value);
                }, 300);
            });
            urlInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('insertGifUrlBtn')?.click();
                }
            });
        }

        const insertBtn = document.getElementById('insertGifUrlBtn');
        if (insertBtn) {
            insertBtn.addEventListener('click', function() {
                const urlInput = document.getElementById('gifUrlInput');
                if (urlInput && urlInput.value.trim()) {
                    insertGifUrl(urlInput.value.trim());
                } else {
                    showToast('Por favor, cole uma URL de GIF válida.', 'error');
                }
            });
        }

        document.querySelectorAll('.gif-site-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const site = this.dataset.site;
                const urls = {
                    giphy: 'https://giphy.com/',
                    tenor: 'https://tenor.com/',
                    imgur: 'https://imgur.com/',
                    reddit: 'https://www.reddit.com/r/gifs/'
                };
                window.open(urls[site] || urls.giphy, '_blank');
            });
        });

        const chatGifBtn = document.getElementById('chatGifBtn');
        if (chatGifBtn) {
            chatGifBtn.addEventListener('click', function() {
                const input = document.getElementById('p2pInput');
                if (input) {
                    openGifModal(input);
                }
            });
        }

        document.addEventListener('click', function(e) {
            const gifBtn = e.target.closest('.comment-gif-btn');
            if (gifBtn) {
                const wrapper = gifBtn.closest('.input-wrapper');
                if (!wrapper) return;
                const input = wrapper.querySelector('.comment-input');
                if (input) {
                    openGifModal(input);
                }
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && document.getElementById('gifModal').style.display === 'flex') {
                closeGifModal();
            }
        });
    }

    // ========================================================================
    // SANITIZAÇÃO
    // ========================================================================
    function sanitizeHtml(html) {
        if (!html) return '';
        if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
            return window.DOMPurify.sanitize(html, {
                FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
                FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
            });
        }
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    }

    // ========================================================================
    // RENDERIZAÇÃO (sidebar e posts)
    // ========================================================================
    function renderSidebar() {
        const container = elements.courseList;
        if (!container) return;

        if (state.courses.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${t('no_courses_found')}</p></div>`;
            return;
        }

        let html = '';
        for (const course of state.courses) {
            const disciplines = state.disciplines[course.id] || [];
            const isActive = state.currentCourseId === course.id;
            const localizedCourseName = getLocalizedCourseName(course);
            const initial = getCourseInitial(localizedCourseName);
            const color = getCourseColor(course.id);
            const levelLabel = course.courseLevel === 'graduacao' ? t('graduacao') :
                               course.courseLevel === 'pos-graduacao' ? t('pos_graduacao') :
                               course.courseLevel === 'ensino-medio' ? t('ensino_medio') : t('idiomas');

            const imgUrl = getCourseImageUrl(course.id);
            const safeOnError = `try{ if(this.parentNode) { this.style.display='none'; this.parentNode.textContent='${initial}'; this.parentNode.style.background='${color}'; } }catch(e){}`;
            const iconContent = imgUrl ? `<img src="${imgUrl}" alt="${escapeHtml(localizedCourseName)}" onerror="${safeOnError}" />` : initial;

            html += `
                <div class="course-entry">
                  <div class="course-item ${isActive ? 'active' : ''}" data-course-id="${course.id}" role="button" tabindex="0" aria-expanded="${isActive ? 'true' : 'false'}">
                    <div class="course-icon" style="background:${color}">${iconContent}</div>
                    <div class="course-info">
                        <div class="course-name">${escapeHtml(localizedCourseName)}</div>
                        <div class="course-level">${levelLabel}</div>
                    </div>
                  </div>
                  <div class="discipline-list ${isActive ? 'open' : ''}" data-course-id="${course.id}">
            `;
            if (disciplines.length === 0) {
                html += `<div class="discipline-item" style="color:var(--com-text-tertiary);font-size:0.75rem;">${t('no_courses_found')}</div>`;
            } else {
                for (const disc of disciplines) {
                    const activeDisc = isActive && state.currentDiscipline === disc;
                    html += `<div class="discipline-item ${activeDisc ? 'active' : ''}" data-course-id="${course.id}" data-discipline="${escapeHtml(disc)}">${escapeHtml(getLocalizedDisciplineName(disc))}</div>`;
                }
            }
            html += `</div></div>`;
        }
        container.innerHTML = html;

        container.querySelectorAll('.course-item').forEach(el => {
            el.addEventListener('click', function() {
                toggleCourse(this.dataset.courseId);
            });
            el.addEventListener('keydown', function(event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                toggleCourse(this.dataset.courseId);
            });
        });

        container.querySelectorAll('.discipline-item').forEach(el => {
            el.addEventListener('click', function() {
                const courseId = this.dataset.courseId;
                const discipline = this.dataset.discipline;
                selectDiscipline(courseId, discipline);
            });
        });
    }

    function toggleCourse(courseId) {
        const list = document.querySelector(`.discipline-list[data-course-id="${courseId}"]`);
        if (list) list.classList.toggle('open');
        document.querySelectorAll('.course-item').forEach(el => {
            el.classList.toggle('active', el.dataset.courseId === courseId);
            el.setAttribute('aria-expanded', el.dataset.courseId === courseId ? 'true' : 'false');
        });
        const disciplines = state.disciplines[courseId] || [];
        selectDiscipline(courseId, disciplines.length > 0 ? disciplines[0] : null);
    }

    function selectDiscipline(courseId, discipline, scrollToPostId) {
        state.currentCourseId = courseId;
        state.currentDiscipline = discipline;
        window.UniversidadeLivreAnalytics?.discipline(courseId, discipline);
        const currentScope = readGameMatchmakingScope();
        localStorage.setItem(GAME_SCOPE_KEY, JSON.stringify({
            mode: currentScope.mode,
            courseId,
            discipline
        }));
        refreshPresence();
        updateGameMatchmakingOnlineCount();

        document.querySelectorAll('.course-item').forEach(el => {
            el.classList.toggle('active', el.dataset.courseId === courseId);
            el.setAttribute('aria-expanded', el.dataset.courseId === courseId ? 'true' : 'false');
        });
        document.querySelectorAll('.discipline-item').forEach(el => {
            const isActive = el.dataset.courseId === courseId && el.dataset.discipline === discipline;
            el.classList.toggle('active', isActive);
        });
        const list = document.querySelector(`.discipline-list[data-course-id="${courseId}"]`);
        if (list) list.classList.add('open');

        renderDisciplineHeader(courseId, discipline);

        if (courseId && discipline) {
            state.posts = loadPosts(courseId, discipline);
            renderPosts();
            renderChatMessages();
            updateChatStatus(true);
            loadNotes();
            if (scrollToPostId) {
                setTimeout(() => {
                    scrollToPost(scrollToPostId);
                }, 300);
            }
        } else {
            state.posts = [];
            renderPosts();
            const container = document.getElementById('p2pMessages');
            if (container) {
                container.innerHTML = `<div class="msg" style="color:var(--com-text-tertiary);font-style:italic;">${t('select_discipline')}</div>`;
            }
            updateChatStatus(false);
        }
        populateNoteSelector();
    }

    function renderDisciplineHeader(courseId, discipline) {
        const course = state.courses.find(c => c.id === courseId);
        const color = course ? getCourseColor(courseId) : '#6C8CFF';
        const localizedCourseName = getLocalizedCourseName(course);
        const initial = course ? getCourseInitial(localizedCourseName) : '?';
        const courseName = localizedCourseName;

        const imgEl = document.getElementById('disciplineCourseImage');
        if (imgEl) {
            const imgUrl = course ? getCourseImageUrl(courseId) : '';
            if (imgUrl) {
                const safeOnError = `try{ if(this.parentNode) { this.style.display='none'; this.parentNode.textContent='${initial}'; this.parentNode.style.background='${color}'; } }catch(e){}`;
                imgEl.innerHTML = `<img src="${imgUrl}" alt="${escapeHtml(courseName)}" onerror="${safeOnError}" />`;
                imgEl.style.background = 'transparent';
            } else {
                imgEl.textContent = initial;
                imgEl.style.background = color;
            }
        }
        if (elements.disciplineName) {
            elements.disciplineName.textContent = getLocalizedDisciplineName(discipline) || t('select_discipline');
        }
        if (elements.disciplineCourseName) {
            elements.disciplineCourseName.textContent = courseName ? `${t('course')}: ${courseName}` : '';
        }
    }

    function renderPosts() {
        const feed = elements.postsFeed;
        if (!feed) return;

        let filteredPosts = state.posts;

        if (state.activeTab === 'my') {
            filteredPosts = filteredPosts.filter(p => p.author === state.currentUser.name && p.type !== 'poll');
        } else if (state.activeTab === 'polls') {
            filteredPosts = filteredPosts.filter(p => p.type === 'poll' && p.author === state.currentUser.name);
        }

        if (filteredPosts.length === 0) {
            const msg = state.activeTab === 'my' 
                ? t('no_my_articles')
                : state.activeTab === 'polls'
                    ? t('no_my_polls')
                : (state.currentDiscipline ? t('comunidade_no_posts') : t('select_discipline_to_see_posts'));
            feed.innerHTML = `<div class="empty-state"><i class="fas fa-pen-fancy"></i><p>${msg}</p></div>`;
            return;
        }

        let html = '';
        for (const post of filteredPosts) {
            const isLiked = (post.likes || []).includes(state.currentUser.name);
            const likeCount = post.likes.length;
            const commentCount = post.comments.length;
            const isOwner = post.author === state.currentUser.name;
            const avatar = post.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author)}&background=6C8CFF&color=fff&size=40`;
            const time = formatDate(post.timestamp);

            html += `
                <div class="post-card pop-in" data-post-id="${post.id}">
                    <div class="post-header">
                        <img class="post-avatar" src="${avatar}" alt="${escapeHtml(post.author)}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(post.author)}&background=6C8CFF&color=fff&size=40'">
                        <span class="post-author">${escapeHtml(post.author)}</span>
                        <span class="post-time">${time}</span>
                        ${post.edited ? `<span class="post-edited">(${t('edited')})</span>` : ''}
                        ${post.censored ? `<span class="post-edited" style="color:var(--com-accent-orange);">(${t('censored')})</span>` : ''}
                        ${isOwner ? `<button class="delete-post-btn" data-post-id="${post.id}" style="margin-left:auto;background:none;border:none;color:var(--com-text-tertiary);cursor:pointer;" aria-label="${t('delete')}"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                    <div class="post-title">${escapeHtml(maskDigits(post.title))}</div>
                    ${post.type === 'poll' ? `
                        <div class="poll-card">
                            <div class="poll-question">${escapeHtml(maskDigits(post.question || post.title))}</div>
                            ${(post.options || []).map((option, index) => {
                                const votes = (post.votes && post.votes[index]) || 0;
                                const total = (post.votes || []).reduce((a, b) => a + b, 0);
                                const selected = (post.voters || {})[state.currentUser.name] === index;
                                return `<button class="poll-option poll-vote ${selected ? 'selected' : ''}" data-post-id="${post.id}" data-option="${index}"><span>${escapeHtml(maskDigits(option))}</span><span>${votes}${total ? ` (${Math.round(votes / total * 100)}%)` : ''}</span></button>`;
                            }).join('')}
                        </div>
                    ` : `<div class="post-content">${sanitizeHtml(maskHtmlDigits(post.content || ''))}</div>`}
                    ${post.note ? `
                        <div class="note-attachment">
                            <i class="fas fa-paperclip"></i>
                            <span class="note-title">${escapeHtml(maskDigits(post.note.title))}</span>
                            <span class="note-preview">${escapeHtml(maskDigits(post.note.preview))}</span>
                        </div>
                    ` : ''}
                    <div class="post-actions">
                        <button class="like-btn ${isLiked ? 'liked' : ''}" data-post-id="${post.id}" aria-label="${t('like')}">
                            <i class="fas fa-heart"></i> <span>${likeCount}</span>
                        </button>
                        <button class="comment-toggle" data-post-id="${post.id}" aria-label="${t('comment')}">
                            <i class="fas fa-comment"></i> <span>${commentCount}</span>
                        </button>
                        ${isOwner && post.type !== 'poll' ? `<button class="edit-post-btn" data-post-id="${post.id}" aria-label="${t('edit')}"><i class="fas fa-pencil-alt"></i></button>` : ''}
                    </div>
                    <div class="comments-section" id="comments-${post.id}" style="display:${commentCount > 0 ? 'block' : 'none'};">
                        ${post.comments.map(c => {
                            const isCommentLiked = c.likes && c.likes.includes(state.currentUser.name);
                            const commentLikeCount = (c.likes && c.likes.length) || 0;
                            const isCommentOwner = c.author === state.currentUser.name;
                            const isEditing = state.editingCommentId && state.editingCommentId.postId === post.id && state.editingCommentId.commentId === c.id;

                            let commentText = escapeHtml(maskDigits(c.text));
                            commentText = commentText.replace(IMG_URL_REGEX, (url) => `<img src="${url}" alt="GIF" />`);
                            if (c.censored) {
                                commentText += ` <span style="font-size:0.6rem;color:var(--com-accent-orange);">(${t('censored')})</span>`;
                            }

                            return `
                                <div class="comment-item" data-comment-id="${c.id}">
                                    <img class="comment-avatar" src="${c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author)}&background=6C8CFF&color=fff&size=28`}" alt="">
                                    <div class="comment-body">
                                        <div>
                                            <span class="comment-author">${escapeHtml(c.author)}</span>
                                            <span class="comment-time">${formatDate(c.timestamp)}</span>
                                            ${c.edited ? `<span style="font-size:0.6rem;color:var(--com-text-tertiary);">(${t('edited')})</span>` : ''}
                                        </div>
                                        ${isEditing ? `
                                            <div style="display:flex;gap:0.3rem;align-items:center;margin-top:0.2rem;">
                                                <input type="text" class="comment-edit-input" value="${escapeHtml(maskDigits(c.text))}" style="flex:1;padding:0.2rem 0.5rem;background:var(--com-bg-tertiary);border:1px solid var(--com-border);border-radius:4px;color:var(--com-text-primary);" />
                                                <button class="comment-edit-save" data-post-id="${post.id}" data-comment-id="${c.id}" style="background:var(--com-accent-blue);color:white;border:none;padding:0.2rem 0.6rem;border-radius:4px;cursor:pointer;"><i class="fas fa-check"></i></button>
                                                <button class="comment-edit-cancel" data-post-id="${post.id}" data-comment-id="${c.id}" style="background:var(--com-bg-tertiary);color:var(--com-text-secondary);border:1px solid var(--com-border);padding:0.2rem 0.6rem;border-radius:4px;cursor:pointer;"><i class="fas fa-times"></i></button>
                                            </div>
                                        ` : `
                                            <div class="comment-text">${commentText}</div>
                                            <div class="comment-actions">
                                                <button class="comment-like-btn ${isCommentLiked ? 'liked' : ''}" data-post-id="${post.id}" data-comment-id="${c.id}" aria-label="Curtir comentário">
                                                    <i class="fas fa-heart"></i> ${commentLikeCount > 0 ? commentLikeCount : ''}
                                                </button>
                                                ${isCommentOwner ? `
                                                    <button class="comment-edit-btn" data-post-id="${post.id}" data-comment-id="${c.id}" aria-label="Editar comentário"><i class="fas fa-pencil-alt"></i></button>
                                                    <button class="delete-comment-btn" data-post-id="${post.id}" data-comment-id="${c.id}" aria-label="${t('delete')}"><i class="fas fa-times"></i></button>
                                                ` : ''}
                                            </div>
                                        `}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        <div class="comment-input-area">
                            <div class="input-wrapper">
                                <input type="text" class="comment-input" placeholder="${t('write_comment')} (ou cole URL de GIF)" data-post-id="${post.id}" />
                                <button class="comment-emoji-toggle emoji-btn" title="Emojis"><i class="far fa-smile"></i></button>
                                <button class="comment-gif-btn gif-btn" title="Inserir GIF"><i class="fas fa-film"></i></button>
                                <div class="comment-emoji-picker">
                                    ${EMOJIS.map(emoji => `<button class="emoji-option comment-emoji-option">${emoji}</button>`).join('')}
                                </div>
                            </div>
                            <button class="comment-submit" data-post-id="${post.id}" aria-label="${t('send')}"><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            `;
        }
        feed.innerHTML = html;

        // Eventos
        feed.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                toggleLike(state.currentCourseId, state.currentDiscipline, postId);
                renderPosts();
            });
            feed.querySelectorAll('.poll-vote').forEach(btn => {
                btn.addEventListener('click', function() {
                    const posts = loadPosts(state.currentCourseId, state.currentDiscipline);
                    const post = posts.find(p => p.id === this.dataset.postId);
                    if (!post || !post.votes) return;
                    post.voters = post.voters || {};
                    const previous = post.voters[state.currentUser.name];
                    if (previous !== undefined) post.votes[previous] = Math.max(0, post.votes[previous] - 1);
                    const option = Number(this.dataset.option);
                    if (previous === option) delete post.voters[state.currentUser.name];
                    else { post.votes[option]++; post.voters[state.currentUser.name] = option; }
                    savePosts(state.currentCourseId, state.currentDiscipline, posts);
                    state.posts = posts;
                    renderPosts();
                });
            });
        });

        feed.querySelectorAll('.comment-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const section = document.getElementById(`comments-${postId}`);
                if (section) section.style.display = section.style.display === 'none' ? 'block' : 'none';
            });
        });

        feed.querySelectorAll('.comment-submit').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const wrapper = this.closest('.comment-input-area').querySelector('.input-wrapper');
                const input = wrapper ? wrapper.querySelector('.comment-input') : null;
                if (!input || !input.value.trim()) return;
                addComment(state.currentCourseId, state.currentDiscipline, postId, input.value.trim());
                input.value = '';
                renderPosts();
            });
        });

        feed.querySelectorAll('.comment-input').forEach(input => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const postId = this.dataset.postId;
                    const btn = document.querySelector(`.comment-submit[data-post-id="${postId}"]`);
                    if (btn) btn.click();
                }
            });
        });

        feed.querySelectorAll('.comment-like-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const commentId = this.dataset.commentId;
                toggleCommentLike(state.currentCourseId, state.currentDiscipline, postId, commentId);
                renderPosts();
            });
        });

        feed.querySelectorAll('.comment-edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const commentId = this.dataset.commentId;
                state.editingCommentId = { postId, commentId };
                renderPosts();
                const input = feed.querySelector(`.comment-edit-input`);
                if (input) input.focus();
            });
        });

        feed.querySelectorAll('.comment-edit-save').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const commentId = this.dataset.commentId;
                const input = feed.querySelector(`.comment-edit-input`);
                if (!input) return;
                const newText = input.value.trim();
                if (!newText) return;
                editComment(state.currentCourseId, state.currentDiscipline, postId, commentId, newText);
                state.editingCommentId = null;
                renderPosts();
            });
        });

        feed.querySelectorAll('.comment-edit-cancel').forEach(btn => {
            btn.addEventListener('click', function() {
                state.editingCommentId = null;
                renderPosts();
            });
        });

        feed.querySelectorAll('.comment-edit-input').forEach(input => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    const postId = this.closest('.comment-item')?.dataset?.postId;
                    const commentId = this.closest('.comment-item')?.dataset?.commentId;
                    if (postId && commentId) {
                        const saveBtn = feed.querySelector(`.comment-edit-save[data-post-id="${postId}"][data-comment-id="${commentId}"]`);
                        if (saveBtn) saveBtn.click();
                    }
                }
                if (e.key === 'Escape') {
                    state.editingCommentId = null;
                    renderPosts();
                }
            });
        });

        feed.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                if (confirm(t('comunidade_confirm_delete'))) {
                    if (deletePost(state.currentCourseId, state.currentDiscipline, postId)) {
                        refreshPostsAfterDeletion();
                    }
                }
            });
        });

        feed.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const post = state.posts.find(p => p.id === postId);
                if (post) openEditModal(post);
            });
        });

        feed.querySelectorAll('.delete-comment-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const postId = this.dataset.postId;
                const commentId = this.dataset.commentId;
                if (confirm(t('delete_comment_confirm'))) {
                    deleteComment(state.currentCourseId, state.currentDiscipline, postId, commentId);
                    renderPosts();
                }
            });
        });
    }

    // ========================================================================
    // MODAL DE POST
    // ========================================================================
    let quill = null;
    let quillInitialized = false;

    function openNewPostModal() {
        if (!state.currentCourseId || !state.currentDiscipline) {
            alert(t('select_discipline_first'));
            return;
        }
        if (state.postBlocked) {
            alert(t('post_blocked_msg'));
            return;
        }
        document.getElementById('postModalTitle').innerHTML = `<i class="fas fa-pen"></i> ${t('comunidade_new_post')}`;
        document.getElementById('postTitleInput').value = '';
        if (quill) {
            quill.setContents([]);
            quill.root.dataset.placeholder = t('write_post_content');
        }
        state.editingPostId = null;
        const select = document.getElementById('noteAttachmentSelect');
        if (select) select.value = '';
        populateNoteSelector();

        const modal = document.getElementById('postModal');
        modal.style.display = 'flex';
        modal.removeAttribute('aria-hidden');
        modal.removeAttribute('inert');
        document.getElementById('postTitleInput').focus();
    }

    function openEditModal(post) {
        document.getElementById('postModalTitle').innerHTML = `<i class="fas fa-edit"></i> ${t('comunidade_edit')}`;
        document.getElementById('postTitleInput').value = maskDigits(post.title);
        if (quill) quill.root.innerHTML = maskHtmlDigits(post.content);
        state.editingPostId = post.id;
        const select = document.getElementById('noteAttachmentSelect');
        if (select) {
            populateNoteSelector();
            if (post.note) {
                select.value = post.note.id || '';
            } else {
                select.value = '';
            }
        }
        const modal = document.getElementById('postModal');
        modal.style.display = 'flex';
        modal.removeAttribute('aria-hidden');
        modal.removeAttribute('inert');
        document.getElementById('postTitleInput').focus();
    }

    function closePostModal() {
        const modal = document.getElementById('postModal');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', '');
        state.editingPostId = null;
        if (elements.newPostBtn) elements.newPostBtn.focus();
    }

    function savePost() {
        if (state.postBlocked) {
            alert(t('post_blocked_msg'));
            return;
        }
        const title = document.getElementById('postTitleInput').value.trim();
        const content = quill ? quill.root.innerHTML : '';
        if (!title || !content || content === '<p><br></p>') {
            alert(t('fill_title_content'));
            return;
        }
        const noteSelect = document.getElementById('noteAttachmentSelect');
        const noteId = noteSelect ? noteSelect.value : null;

        if (state.editingPostId) {
            if (editPost(state.currentCourseId, state.currentDiscipline, state.editingPostId, title, content, noteId)) {
                closePostModal();
                renderPosts();
            } else {
                alert(t('edit_post_error'));
            }
        } else {
            const newPost = addPost(state.currentCourseId, state.currentDiscipline, title, content, noteId);
            if (newPost) {
                state.posts = loadPosts(state.currentCourseId, state.currentDiscipline);
                closePostModal();
                renderPosts();
            }
        }
    }

    function openPollModal() {
        if (!state.currentCourseId || !state.currentDiscipline) { alert(t('select_discipline_first')); return; }
        const modal = document.getElementById('pollModal');
        document.getElementById('pollQuestionInput').value = '';
        document.getElementById('pollOptions').innerHTML = '<input type="text" class="poll-option-input" placeholder="Opção 1"><input type="text" class="poll-option-input" placeholder="Opção 2">';
        modal.style.display = 'flex'; modal.removeAttribute('aria-hidden'); modal.removeAttribute('inert');
        document.getElementById('pollQuestionInput').focus();
    }
    function closePollModal() {
        const modal = document.getElementById('pollModal');
        if (modal) { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); modal.setAttribute('inert', ''); }
    }
    function savePoll() {
        const question = document.getElementById('pollQuestionInput').value.trim();
        const options = [...document.querySelectorAll('.poll-option-input')].map(i => i.value.trim()).filter(Boolean);
        if (!question || options.length < 2) { alert('Informe a pergunta e pelo menos duas opções.'); return; }
        const newPoll = addPoll(state.currentCourseId, state.currentDiscipline, question, options);
        if (newPoll) {
            closePollModal();
            state.posts = loadPosts(state.currentCourseId, state.currentDiscipline);
            renderPosts();
        }
    }

    // ========================================================================
    // QUILL EDITOR
    // ========================================================================
    function initQuill() {
        if (typeof Quill === 'undefined') {
            console.warn('[Comunidade] Quill não carregado.');
            return;
        }
        const container = document.getElementById('postEditor');
        if (!container) return;
        if (quillInitialized) return;

        quill = new Quill(container, {
            theme: 'snow',
            placeholder: t('write_post_content'),
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'align': [] }],
                    ['link', 'image', 'video'],
                    ['clean']
                ],
                clipboard: { matchVisual: false }
            }
        });
        quillInitialized = true;
        console.log('[Comunidade] Quill inicializado.');
    }

    // ========================================================================
    // CHAT STATUS
    // ========================================================================
    function updateChatStatus(active) {
        const dot = document.getElementById('p2pStatusDot');
        const text = document.getElementById('p2pStatusText');
        const input = document.getElementById('p2pInput');
        const sendBtn = document.getElementById('p2pSendBtn');

        if (active && !state.chatBlocked) {
            dot.className = 'dot online';
            text.textContent = t('connected');
            if (input) input.disabled = false;
            if (sendBtn) sendBtn.disabled = false;
        } else {
            dot.className = 'dot offline';
            text.textContent = state.chatBlocked ? t('chat_blocked_msg') : t('disconnected');
            if (input) input.disabled = true;
            if (sendBtn) sendBtn.disabled = true;
        }
    }

    // ========================================================================
    // TOAST
    // ========================================================================
    function showToast(message, type = 'info') {
        if (window.showNotification && typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        const existing = document.getElementById('customToast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'customToast';
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: var(--bg-card, #1A2638); backdrop-filter: blur(12px);
            padding: 12px 24px; border-radius: 16px;
            border: 1px solid var(--border, rgba(42,58,90,0.4));
            box-shadow: var(--modal-shadow, 0 8px 32px rgba(0,0,0,0.5));
            color: var(--text-primary, #F5F9FF);
            font-size: 0.9rem;
            z-index: 99999;
            max-width: 90%;
            text-align: center;
            transition: opacity 0.3s ease;
        `;
        if (type === 'success') toast.style.borderLeft = '4px solid #22c55e';
        else if (type === 'error') toast.style.borderLeft = '4px solid #ef4444';
        else toast.style.borderLeft = '4px solid #6C8CFF';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
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

    function openJitsiModal(roomUrl) {
        const modal = document.getElementById('jitsiModal');
        const frame = document.getElementById('jitsiFrame');
        if (!modal || !frame) return;

        frame.src = roomUrl;
        modal.style.display = 'flex';
        modal.classList.add('show');
        modal.removeAttribute('inert');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeJitsiModal() {
        const modal = document.getElementById('jitsiModal');
        const frame = document.getElementById('jitsiFrame');
        if (!modal) return;

        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        modal.setAttribute('inert', 'true');
        if (frame) frame.src = '';
    }

    function openJitsiRoom() {
        if (!state.currentCourseId || !state.currentDiscipline) {
            showToast('Selecione uma disciplina antes de abrir a sala de vídeo.', 'error');
            return;
        }

        const currentCourse = (state.courses || []).find(course => course.id === state.currentCourseId);
        const courseName = (currentCourse?.name || state.currentCourseId || 'curso').replace(/[^\w\s-]/g, '');
        const disciplineName = String(state.currentDiscipline || 'disciplina').replace(/[^\w\s-]/g, '');
        const roomName = `ulivre-${slugify(courseName)}-${slugify(disciplineName)}`;
        const displayName = (localStorage.getItem('userProfileName') || state.currentUser?.name || 'Aluno').trim() || 'Aluno';
        const roomUrl = new URL(`https://meet.jit.si/${roomName}`);
        roomUrl.searchParams.set('userInfo.displayName', displayName);
        roomUrl.hash = `userInfo.displayName=${encodeURIComponent(displayName)}`;

        window.UniversidadeLivreAnalytics?.action('comunidade', 'sala-video', `${courseName}-${disciplineName}`);
        openJitsiModal(roomUrl.toString());
    }

    // ========================================================================
    // SINCRONIZAÇÃO ENTRE ABAS
    // ========================================================================
    function updateGameScoreboard() {
        const output = document.getElementById('tttScoreboardText');
        if (!output) return;
        let scores = {};
        try {
            scores = JSON.parse(localStorage.getItem('ulivre_ttt_scores') || '{}');
        } catch (_) {
            scores = {};
        }
        const user = window.currentUserName || localStorage.getItem('userProfileName') || 'Jogador';
        const score = scores[user];
        const labels = typeof window.t === 'function'
            ? [t('games_score_points'), t('games_score_wins'), t('games_score_draws'), t('games_score_losses')]
            : ['pts', 'vitórias', 'empates', 'derrotas'];
        output.textContent = score
            ? `${score.points} ${labels[0]} · ${score.wins} ${labels[1]} · ${score.draws} ${labels[2]} · ${score.losses} ${labels[3]}`
            : (typeof window.t === 'function' ? t('games_score_empty') : 'Nenhuma partida registrada.');
    }

    function setupSync() {
        window.addEventListener('storage', function(e) {
            if (e.key && e.key.startsWith('comunidade_sync_')) {
                if (state.currentCourseId && state.currentDiscipline) {
                    state.posts = loadPosts(state.currentCourseId, state.currentDiscipline);
                    renderPosts();
                    renderChatMessages();
                }

            }
            if (e.key === 'ulivre_ttt_scores') updateGameScoreboard();
            if (e.key === STORAGE_KEY_NOTES) {
                loadNotes();
                populateNoteSelector();
            }
        });
    }

    // ========================================================================
    // ABAS DE FILTRO
    // ========================================================================
    function initTabs() {
        const tabs = document.querySelectorAll('.feed-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                state.activeTab = this.dataset.tab;
                renderPosts();
            });
        });
    }

    // ========================================================================
    // GARANTIR QUE O PERFIL FUNCIONE NA COMUNIDADE
    // ========================================================================
    function setupProfileButton() {
        const profileBtn = document.getElementById('profileBtn');
        if (!profileBtn) return;

        // Remove listeners antigos para evitar duplicação
        const newBtn = profileBtn.cloneNode(true);
        profileBtn.parentNode.replaceChild(newBtn, profileBtn);

        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[Comunidade] Botão de perfil clicado.');
            if (typeof window.openProfileModal === 'function') {
                window.openProfileModal();
            } else {
                console.warn('[Comunidade] window.openProfileModal não disponível.');
                // Fallback: tenta abrir o modal manualmente
                const modal = document.getElementById('profileModal');
                if (modal) {
                    modal.style.display = 'flex';
                    modal.classList.add('show');
                    modal.removeAttribute('inert');
                    modal.setAttribute('aria-hidden', 'false');
                    if (typeof window.updateProfileModal === 'function') {
                        window.updateProfileModal();
                    }
                }
            }
        });

        console.log('[Comunidade] Listener do perfil configurado.');
    }

    // ========================================================================
    // INICIALIZAÇÃO – CORREÇÃO: onboarding com verificação e fallback
    // ========================================================================
    async function init() {
        elements.courseList = document.getElementById('courseList');
        elements.postsFeed = document.getElementById('postsFeed');
        elements.disciplineName = document.getElementById('disciplineName');
        elements.disciplineCourseName = document.getElementById('disciplineCourseName');
        elements.newPostBtn = document.getElementById('newPostBtn');
        elements.newPollBtn = document.getElementById('newPollBtn');
        elements.closePostModal = document.getElementById('closePostModal');
        elements.cancelPostBtn = document.getElementById('cancelPostBtn');
        elements.savePostBtn = document.getElementById('savePostBtn');
        elements.refreshCoursesBtn = document.getElementById('refreshCoursesBtn');

        state.currentUser = getCurrentUser();
        setupProfileButton();

        // ====================================================================
        // CORREÇÃO: Inicialização do onboarding com verificação robusta
        // ====================================================================
        const hasName = localStorage.getItem('userProfileName');
        const onboardingComplete = localStorage.getItem('ulivre_onboarding_complete');

        if (!hasName || onboardingComplete !== 'true') {
            console.log('[Comunidade] Onboarding necessário. Aguardando DOM e i18n...');

            // Função para iniciar onboarding com segurança
            const startOnboardingSafe = () => {
                if (typeof window.startOnboarding === 'function') {
                    console.log('[Comunidade] Iniciando onboarding...');
                    window.startOnboarding();
                } else {
                    console.warn('[Comunidade] window.startOnboarding não disponível. Tentando novamente em 1s.');
                    setTimeout(startOnboardingSafe, 1000);
                }
            };

            // Aguarda o DOM e o i18n estarem prontos
            if (document.readyState === 'complete') {
                // Se já carregado, inicia imediatamente
                setTimeout(startOnboardingSafe, 300);
            } else {
                // Aguarda o evento load
                window.addEventListener('load', function() {
                    console.log('[Comunidade] Página carregada. Iniciando onboarding.');
                    setTimeout(startOnboardingSafe, 300);
                }, { once: true });
            }

            // Também tenta após o i18nReady (se disponível)
            if (window.i18nReady && typeof window.i18nReady.then === 'function') {
                window.i18nReady.then(() => {
                    console.log('[Comunidade] i18nReady resolvido. Verificando onboarding...');
                    if (!localStorage.getItem('userProfileName')) {
                        startOnboardingSafe();
                    }
                }).catch(() => {});
            }

            // Se após 5 segundos ainda não tiver iniciado, força
            setTimeout(() => {
                if (!localStorage.getItem('userProfileName')) {
                    console.warn('[Comunidade] Forçando onboarding após timeout.');
                    startOnboardingSafe();
                }
            }, 5000);

            // Não executa o resto da inicialização até que o onboarding seja concluído
            window.addEventListener('onboardingComplete', () => {
                console.log('[Comunidade] Onboarding concluído. Inicializando funcionalidades.');
                initAfterOnboarding();
            }, { once: true });

            // Se já tiver nome, ignora onboarding e segue
            if (localStorage.getItem('userProfileName')) {
                console.log('[Comunidade] Usuário já possui nome. Ignorando onboarding.');
                initAfterOnboarding();
            }

            return;
        }

        // Se já tem nome, inicia diretamente
        console.log('[Comunidade] Usuário já cadastrado. Iniciando diretamente.');
        initAfterOnboarding();
    }

    // ========================================================================
    // INICIALIZAÇÃO APÓS ONBOARDING (ou se já estiver cadastrado)
    // ========================================================================
    async function initAfterOnboarding() {
        // Atualiza o usuário (pode ter mudado)
        state.currentUser = getCurrentUser();

        const matchmakingSelect = document.getElementById('gameMatchmakingScope');
        if (matchmakingSelect) {
            matchmakingSelect.value = readGameMatchmakingScope().mode;
            updateGameMatchmakingOnlineCount();
            matchmakingSelect.addEventListener('change', () => {
                setGameMatchmakingScope(matchmakingSelect.value);
                window.renderChessRoomList?.();
                window.renderTTTRoomList?.();
            });
        }

        initializePeerNetwork();
        startPresence();
        const success = await loadCoursesAndDisciplines();
        if (!success) {
            elements.courseList.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${t('error_load_courses')}</p></div>`;
            return;
        }

        renderSidebar();

        if (state.courses.length > 0) {
            const first = state.courses[0];
            const disciplines = state.disciplines[first.id] || [];
            selectDiscipline(first.id, disciplines.length > 0 ? disciplines[0] : null);
        }

        const chatInput = document.getElementById('p2pInput');
        const charCountSpan = document.getElementById('charCount');
        const charMaxSpan = document.getElementById('charMax');
        if (chatInput && charCountSpan && charMaxSpan) {
            charMaxSpan.textContent = MAX_CHAT_MESSAGE_LENGTH;
            chatInput.addEventListener('input', function() {
                const len = this.value.length;
                charCountSpan.textContent = len;
                charCountSpan.classList.toggle('exceed', len > MAX_CHAT_MESSAGE_LENGTH);
                this.style.height = 'auto';
                this.style.height = Math.max(this.scrollHeight, 3.2 * parseFloat(getComputedStyle(this).lineHeight)) + 'px';
                if (this.scrollHeight > 120) {
                    this.style.height = '120px';
                }
            });
            chatInput.dispatchEvent(new Event('input'));
        }

        if (chatInput) {
            chatInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    sendLocalChatMessage();
                }
            });
        }

        setTimeout(initQuill, 200);
        initEmojiPicker();
        initCommentEmojiPickers();
        initGifModal();
        initTabs();
        elements.newPollBtn?.addEventListener('click', openPollModal);
        document.getElementById('closePollModal')?.addEventListener('click', closePollModal);
        document.getElementById('cancelPollBtn')?.addEventListener('click', closePollModal);
        document.getElementById('savePollBtn')?.addEventListener('click', savePoll);
        document.getElementById('addPollOptionBtn')?.addEventListener('click', function() {
            const count = document.querySelectorAll('.poll-option-input').length + 1;
            if (count <= 8) {
                const input = document.createElement('input');
                input.type = 'text'; input.className = 'poll-option-input'; input.placeholder = t('poll_option_placeholder', { number: count });
                document.getElementById('pollOptions').appendChild(input);
            }
        });

        const shareBtn = document.getElementById('shareArticleBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', openShareArticleModal);
        }
        document.getElementById('openJitsiBtn')?.addEventListener('click', openJitsiRoom);
        document.getElementById('closeJitsiBtn')?.addEventListener('click', closeJitsiModal);
        document.getElementById('openGamesBtn')?.addEventListener('click', () => {
            window.UniversidadeLivreAnalytics?.action('comunidade', 'jogos', state.currentDiscipline || 'sala');
        });
        document.getElementById('gamesGrid')?.addEventListener('click', (event) => {
            const game = event.target.closest('.game-card')?.dataset.game;
            if (game) {
                window.UniversidadeLivreAnalytics?.action('jogo', game, state.currentDiscipline || 'sala');
            }
        });

        document.getElementById('jitsiModal')?.addEventListener('click', function(e) {
            if (e.target === this) closeJitsiModal();
        });
        document.querySelectorAll('.share-tab').forEach(tab => tab.addEventListener('click', function() {
            document.querySelectorAll('.share-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active'); renderShareArticleList();
        }));

        const closeShareBtn = document.getElementById('closeShareArticleModal');
        if (closeShareBtn) {
            closeShareBtn.addEventListener('click', closeShareArticleModal);
        }
        document.getElementById('shareArticleModal')?.addEventListener('click', function(e) {
            if (e.target === this) closeShareArticleModal();
        });

        elements.newPostBtn?.addEventListener('click', openNewPostModal);
        elements.closePostModal?.addEventListener('click', closePostModal);
        elements.cancelPostBtn?.addEventListener('click', closePostModal);
        elements.savePostBtn?.addEventListener('click', savePost);

        elements.refreshCoursesBtn?.addEventListener('click', refreshCourses);
        if (coursesRefreshTimer) clearInterval(coursesRefreshTimer);
        coursesRefreshTimer = setInterval(refreshCourses, COURSE_REFRESH_INTERVAL);

        document.getElementById('postModal')?.addEventListener('click', function(e) {
            if (e.target === this) closePostModal();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const modal = document.getElementById('postModal');
                if (modal && modal.style.display === 'flex') closePostModal();
                if (document.getElementById('gifModal').style.display === 'flex') closeGifModal();
                if (document.getElementById('shareArticleModal').style.display === 'flex') closeShareArticleModal();
                if (document.getElementById('pollModal').style.display === 'flex') closePollModal();
                if (document.getElementById('jitsiModal').style.display === 'flex') closeJitsiModal();
            }
        });

        document.getElementById('p2pSendBtn')?.addEventListener('click', sendLocalChatMessage);

        setupSync();
        updateGameScoreboard();
        window.addEventListener('tttScoreUpdated', updateGameScoreboard);
        loadNotes();
        populateNoteSelector();

        setInterval(() => {
            if (!state.chatBlocked) {
                state.chatOffenseCount = Math.max(0, state.chatOffenseCount - 1);
            }
            if (!state.postBlocked) {
                state.postOffenseCount = Math.max(0, state.postOffenseCount - 1);
            }
            if (!state.commentBlocked) {
                state.commentOffenseCount = Math.max(0, state.commentOffenseCount - 1);
            }
        }, OFFENSE_WINDOW);

        // ====================================================================
        // REAGIR A MUDANÇAS DE IDIOMA (via i18n central)
        // ====================================================================
        window.addEventListener('languageChanged', function(e) {
            const lang = e.detail.lang || 'pt-br';
            console.log('[Comunidade] Idioma alterado para:', lang);
            
            // Atualizar textos estáticos
            renderSidebar();
            renderDisciplineHeader(state.currentCourseId, state.currentDiscipline);
            renderPosts();
            renderChatMessages();
            
            // Atualizar placeholder do Quill
            if (quill) {
                quill.root.dataset.placeholder = t('write_post_content');
            }
            
            // Atualizar elementos com data-i18n
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (key) {
                    const translated = t(key);
                    if (translated && translated !== key) {
                        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                            el.placeholder = translated;
                        } else {
                            const icon = el.querySelector('i');
                            if (icon) {
                                const clone = icon.cloneNode(true);
                                el.innerHTML = '';
                                el.appendChild(clone);
                                el.appendChild(document.createTextNode(' ' + translated));
                            } else {
                                el.innerText = translated;
                            }
                        }
                    }
                }
            });
            
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (key) {
                    const translated = t(key);
                    if (translated) el.placeholder = translated;
                }
            });

            // Atualizar contador de caracteres do chat
            const charCountSpan = document.getElementById('charCount');
            const charMaxSpan = document.getElementById('charMax');
            if (charMaxSpan) charMaxSpan.textContent = MAX_CHAT_MESSAGE_LENGTH;
            updateOnlineCount();
            updateGameScoreboard();
        });

        console.log('[Comunidade] Inicializado com sucesso (v12.2).');
    }

    // ========================================================================
    // EXPOSIÇÃO GLOBAL
    // ========================================================================
    window.Comunidade = {
        init,
        state: () => state,
        refresh: async () => {
            await loadCoursesAndDisciplines();
            renderSidebar();
            if (state.currentCourseId && state.currentDiscipline) {
                selectDiscipline(state.currentCourseId, state.currentDiscipline);
            }
        },
        sendLocalChatMessage,
        renderChatMessages,
        selectDiscipline,
        renderPosts,
        insertGifUrl,
        openShareArticleModal,
        closeShareArticleModal,
        shareArticleInChat,
        openJitsiRoom,
        closeJitsiModal,
        scrollToPost,
        censorText
    };
    window.openRoomDeleteDialog = openRoomDeleteDialog;

    // ========================================================================
    // AUTOINICIALIZAÇÃO
    // ========================================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();