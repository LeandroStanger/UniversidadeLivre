// biblioteca.js – Versão 8.0 – COMPLETO E OTIMIZADO
// Busca de livros com loading estável, enriquecimento de metadados e APIs externas
// Player de audiobooks com controles completos: progresso, volume, legendas, modo áudio/vídeo
// Salvamento automático de progresso no localStorage (individual por vídeo/parte)
// Suporte a múltiplas partes (parte 1, 2, 3...) e links para PDF
// Capas bibliográficas para livros e miniaturas do YouTube para audiobooks
// CORREÇÃO: Usa módulo central i18n se disponível, com fallback próprio
// CORREÇÃO: Progresso salvo individualmente para cada audiobook/vídeo
// CORREÇÃO: Scroll automático para o player ao clicar em "Ouvir"
// CORREÇÃO: Container do player criado uma única vez no início

document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

    // ========== CONFIGURAÇÕES GLOBAIS ==========
    let translations = {};
    let currentLang = 'pt-br';
    let grid, searchInput, modal, modalBody, closeModalBtn;
    let localBooksCache = [];
    let currentSearchTerm = '';
    let currentAbortController = null;
    let currentSearchId = 0;
    let activeTab = 'book';
    let activeMainTab = 'library';
    let externalLibrariesData = [];

    let searchCache = new Map();
    let apiCache = new Map();
    let metadataCache = new Map();

    // ========== PLAYER MULTIMÍDIA ==========
    let multimediaPlayer = null;
    let multimediaPlayerReady = false;
    let currentVideoId = null;
    let currentPartUrl = null;
    let currentPartType = null;
    let progressSaveInterval = null;
    let isAudioMode = true;
    let isPlayerVisible = false;
    let currentTitle = '';
    let currentDescription = '';
    let subtitlesEnabled = false;
    let playerContainerCreated = false;
    let isSavingProgress = false;
    let currentParts = [];
    let currentPartIndex = 0;
    let currentAudiobookMeta = null;

    // ========== RATE LIMITING PARA GOOGLE BOOKS ==========
    let googleBooksQueue = [];
    let isProcessingGoogleBooks = false;
    let googleBooksFailedAttempts = 0;
    const GOOGLE_BOOKS_DELAY_MS = 8000;
    const GOOGLE_BOOKS_MAX_RETRIES = 3;
    const GOOGLE_BOOKS_BACKOFF_MULTIPLIER = 1.5;
    const GOOGLE_BOOKS_DISABLE_AFTER_FAILURES = 5;
    const API_TIMEOUT_MS = 8000;

    const SEARCH_CACHE_TTL = 5 * 60 * 1000;
    const API_CACHE_TTL = 10 * 60 * 1000;
    const METADATA_CACHE_TTL = 24 * 60 * 60 * 1000;
    const GLOBAL_TIMEOUT = 20000;
    const MIN_SEARCH_LENGTH = 2;
    const MAX_EXTERNAL_RESULTS = 20;

    const CORS_PROXIES = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://proxy.cors.sh/'
    ];

    const DOWNLOAD_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.doc', '.docx', '.zip', '.rar'];
    const AUDIO_EXTENSIONS = ['.mp3', '.m4b', '.ogg', '.wav', '.flac', '.aac', '.m4a'];

    const GOOGLE_BOOKS_API_KEY = 'YOUR_GOOGLE_BOOKS_API_KEY';
    const hasGoogleBooksApiKey = typeof GOOGLE_BOOKS_API_KEY === 'string'
        && GOOGLE_BOOKS_API_KEY.trim() !== ''
        && GOOGLE_BOOKS_API_KEY !== 'YOUR_GOOGLE_BOOKS_API_KEY';
    const PROGRESS_STORAGE_PREFIX = 'audiobook_progress_';
const RECENT_AUDIOBOOKS_STORAGE_KEY = 'audiobook_recently_listened';

    // ========== FUNÇÃO DE TRADUÇÃO (com fallback) ==========
    function t(key, replacements = {}) {
        // Tenta usar o módulo central i18n
        if (window.t && typeof window.t === 'function') {
            try {
                return window.t(key, replacements);
            } catch (e) { /* fallback */ }
        }

        let text = translations[key] || key;
        if (text === key) {
            const hardcoded = {
                'mark_as_read': 'Marcar como lido',
                'marked_as_read': 'Marcado como lido',
                'profile': 'Perfil',
                'download_book': 'Baixar Livro',
                'access_online': 'Acessar Online',
                'book_author': 'Autor',
                'book_year': 'Ano',
                'book_publisher': 'Editora',
                'book_language': 'Idioma',
                'repository_prefix': 'Repositório:',
                'type_book': 'Livro',
                'no_description': 'Sem descrição.',
                'unknown_author': 'Autor desconhecido',
                'unknown_publisher': 'Editora desconhecida',
                'year_not_informed': 'Ano não informado',
                'unavailable': 'Indisponível',
                'no_link_available': 'Nenhum link disponível.',
                'close': 'Fechar',
                'search_library_placeholder': 'Buscar por título, autor, idioma ou assunto...',
                'search_audiobooks_placeholder': 'Buscar audiobooks por título ou autor...',
                'loading': 'Carregando...',
                'no_results': 'Nenhum resultado encontrado.',
                'error_loading': 'Erro ao carregar resultados.',
                'library_title': 'Biblioteca · Universidade Livre',
                'library_subtitle': 'Biblioteca Digital',
                'library_book_count': 'itens',
                'filter_books': 'Livros',
                'filter_articles': 'Artigos',
                'filter_papers': 'Papers',
                'filter_tcc': 'TCC',
                'filter_dissertation': 'Dissertações',
                'filter_thesis': 'Teses',
                'tab_library': 'Biblioteca',
                'tab_audiobooks': 'Audiobooks',
                'tab_recommended': 'Bibliotecas Recomendadas',
                'back_to_courses': 'Voltar para cursos',
                'donate_button': 'Doar',
                'donate_text': 'Doar',
                'price_free': 'Grátis',
                'price_paid': 'Pago',
                'unavailable': 'Indisponível',
                'profile': 'Perfil',
                'listen_button': 'Ouvir',
                'no_audiobooks': 'Nenhum audiobook disponível no momento.',
                'audiobooks_title': 'Audiobooks',
                'close_player': 'Fechar player',
                'play': 'Play',
                'pause': 'Pausa',
                'volume': 'Volume',
                'subtitles': 'Legendas',
                'audio_mode': 'Modo Áudio',
                'video_mode': 'Modo Vídeo',
                'part': 'Parte',
                'pdf_download': 'Baixar PDF'
            };
            if (hardcoded[key]) text = hardcoded[key];
        }
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== I18N ==========
    async function loadTranslations(lang) {
        // Tenta usar o módulo central i18n
        if (window.i18n && typeof window.i18n.loadTranslations === 'function') {
            try {
                await window.i18n.loadTranslations(lang);
                translations = window.i18n.getTranslations ? window.i18n.getTranslations() : {};
                if (Object.keys(translations).length > 0) {
                    console.log('[Biblioteca] Traduções carregadas do módulo central i18n');
                    return true;
                }
            } catch (e) {
                console.warn('[Biblioteca] Falha ao carregar do módulo central:', e);
            }
        }

        // Fallback: tenta carregar o arquivo JSON diretamente
        const paths = [
            `../lang/${lang}.json`,
            `lang/${lang}.json`,
            `/lang/${lang}.json`,
            `./lang/${lang}.json`
        ];
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    translations = await response.json();
                    console.log(`[Biblioteca] Traduções carregadas de ${path}`);
                    return true;
                }
            } catch (e) { /* continua */ }
        }
        console.warn('[Biblioteca] Nenhum arquivo de tradução encontrado. Usando fallback.');
        translations = {};
        return false;
    }

    function updateLanguageSelector(lang) {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (ptBtn && enBtn) {
            ptBtn.classList.toggle('active', lang === 'pt-br');
            enBtn.classList.toggle('active', lang === 'en');
        }
    }

    function applyAllTranslations() {
        if (!translations || Object.keys(translations).length === 0) {
            console.warn('[Biblioteca] applyAllTranslations: traduções vazias, ignorando.');
            return;
        }

        // Se window.applyTranslations estiver disponível, usa-o
        if (window.applyTranslations && typeof window.applyTranslations === 'function') {
            try {
                window.applyTranslations();
            } catch (e) {
                console.warn('[Biblioteca] Erro ao chamar applyTranslations central:', e);
            }
        }

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT') {
                    el.placeholder = translations[key];
                } else {
                    el.innerText = translations[key];
                }
            }
        });
        if (searchInput) searchInput.placeholder = t('search_library_placeholder');
        const audiobookInput = document.getElementById('audiobookSearchInput');
        if (audiobookInput) audiobookInput.placeholder = t('search_audiobooks_placeholder');
        document.title = t('library_title');
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const tab = btn.dataset.tab;
            const span = btn.querySelector('span');
            if (span) {
                if (tab === 'book') span.innerText = t('filter_books');
                else if (tab === 'article') span.innerText = t('filter_articles');
                else if (tab === 'paper') span.innerText = t('filter_papers');
                else if (tab === 'tcc') span.innerText = t('filter_tcc');
                else if (tab === 'dissertation') span.innerText = t('filter_dissertation');
                else if (tab === 'thesis') span.innerText = t('filter_thesis');
            }
        });
        const bookCountSpan = document.getElementById('bookCount');
        if (bookCountSpan) {
            const count = bookCountSpan.innerText;
            bookCountSpan.nextSibling.nodeValue = ' ' + t('library_book_count');
        }
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn && profileBtn.getAttribute('data-profile-custom') !== 'true') {
            profileBtn.innerHTML = `<i class="fas fa-user"></i> ${t('profile')}`;
        }
        updateReadButtonTranslation();
        const audiobooksTabBtn = document.querySelector('.main-tab-btn[data-main-tab="audiobooks"] span');
        if (audiobooksTabBtn) audiobooksTabBtn.innerText = t('audiobooks_title');
        updatePlayerControlTranslations();
    }

    function updatePlayerControlTranslations() {
        const playPauseBtn = document.getElementById('playerPlayPause');
        if (playPauseBtn) {
            const isPlaying = playPauseBtn.dataset.playing === 'true';
            playPauseBtn.innerHTML = isPlaying ? `<i class="fas fa-pause"></i> ${t('pause')}` : `<i class="fas fa-play"></i> ${t('play')}`;
        }
        const subBtn = document.getElementById('playerSubtitles');
        if (subBtn) {
            subBtn.innerHTML = `<i class="fas fa-closed-captioning"></i> ${t('subtitles')}`;
        }
        const modeBtn = document.getElementById('playerToggleMode');
        if (modeBtn) {
            modeBtn.innerHTML = isAudioMode ? `<i class="fas fa-eye"></i> ${t('video_mode')}` : `<i class="fas fa-headphones"></i> ${t('audio_mode')}`;
        }
        const closeBtn = document.getElementById('closeMultimediaPlayer');
        if (closeBtn) closeBtn.innerHTML = `<i class="fas fa-times"></i> ${t('close_player')}`;
    }

    // ========== FUNÇÕES AUXILIARES ==========
    function normalizeText(text) {
        if (!text || typeof text !== 'string') return '';
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }

    function escapeHtml(str) {
        return str ? String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])) : '';
    }

    function generateId() {
        return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatAuthor(authorString) {
        if (!authorString) return t('unknown_author');
        let authorStr = Array.isArray(authorString) ? authorString.join(', ') : String(authorString);
        let authors = authorStr.split(/[,&eE]+\s*/).filter(a => a.trim());
        if (authors.length === 0) return authorStr;
        return authors.length <= 3 ? authorStr : authors.slice(0, 3).join(', ') + '...';
    }

    function detectDownloadLabelFromUrl(url) {
        if (!url) return t('access_online');
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            if (DOWNLOAD_EXTENSIONS.some(ext => pathname.endsWith(ext))) return t('download_book');
            if (urlObj.hostname.includes('docs.google.com') || urlObj.hostname.includes('drive.google.com')) return t('access_online');
            return t('access_online');
        } catch { return t('access_online'); }
    }

    function isAudiobook(book) {
        if (book.type === 'audiobook') return true;
        const title = (book.title || '').toLowerCase();
        if (title.includes('audiobook') || title.includes('audio book') || title.includes('narrado') || title.includes('audiolivro')) return true;
        const url = book.download || book.audioUrl || '';
        if (AUDIO_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext))) return true;
        const source = (book.source || '').toLowerCase();
        if (source.includes('librivox') || source.includes('audible')) return true;
        return false;
    }

    async function forceDownload(url, filename, fallbackUrl = null) {
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise(r => setTimeout(r, 500));
            const response = await fetch(url);
            if (!response.ok) throw new Error('Fetch falhou');
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a2 = document.createElement('a');
            a2.href = blobUrl;
            a2.download = filename || url.split('/').pop() || 'download';
            document.body.appendChild(a2);
            a2.click();
            document.body.removeChild(a2);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.warn('[Download] Falha, tentando fallback:', error);
            if (fallbackUrl) {
                if (confirm(t('download_fallback_confirm'))) window.open(fallbackUrl, '_blank');
            } else window.open(url, '_blank');
        }
    }

    function inferBookType(book) {
        if (book.type) return book.type;
        const title = (book.title || '').toLowerCase();
        const shelf = (book.shelf || '').toLowerCase();
        const description = (book.description || '').toLowerCase();
        if (title.includes('tcc') || shelf.includes('tcc') || description.includes('trabalho de conclusão')) return 'tcc';
        if (title.includes('dissertação') || shelf.includes('dissertation') || description.includes('dissertação')) return 'dissertation';
        if (title.includes('tese') || shelf.includes('thesis') || description.includes('tese')) return 'thesis';
        if (title.includes('artigo') || shelf.includes('article') || description.includes('artigo científico')) return 'article';
        if (title.includes('paper') || shelf.includes('paper') || description.includes('conferência')) return 'paper';
        return 'book';
    }

    // ========== SISTEMA DE "MARCAR COMO LIDO" ==========
    function getReadBooks() {
        try {
            const stored = localStorage.getItem('ulivre_livros_lidos');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    function saveReadBooks(books) {
        localStorage.setItem('ulivre_livros_lidos', JSON.stringify(books));
    }

    function isBookRead(bookId) {
        const read = getReadBooks();
        return read.some(b => b.id === bookId);
    }

    function toggleBookRead(book) {
        let read = getReadBooks();
        const index = read.findIndex(b => b.id === book.id);
        if (index > -1) {
            read.splice(index, 1);
        } else {
            read.push({
                id: book.id,
                title: book.title,
                author: book.author,
                cover: book.cover,
                timestamp: new Date().toISOString()
            });
        }
        saveReadBooks(read);
        return index === -1;
    }

    function updateReadButtonTranslation() {
        const toggleBtn = document.getElementById('toggleReadBtn');
        if (!toggleBtn) return;
        const isRead = toggleBtn.classList.contains('read-btn');
        const key = isRead ? 'marked_as_read' : 'mark_as_read';
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            const iconClone = icon.cloneNode(true);
            toggleBtn.innerHTML = '';
            toggleBtn.appendChild(iconClone);
            toggleBtn.appendChild(document.createTextNode(' ' + t(key)));
        } else {
            toggleBtn.textContent = t(key);
        }
    }

    // ========== ENRIQUECIMENTO DE METADADOS ==========
    let googleBooksDisabled = false;

    function processGoogleBooksQueue() {
        if (isProcessingGoogleBooks || googleBooksQueue.length === 0 || googleBooksDisabled) return;
        isProcessingGoogleBooks = true;

        (async function processNext() {
            while (googleBooksQueue.length > 0) {
                const { book, resolve, reject, attempt = 0 } = googleBooksQueue.shift();
                if (googleBooksDisabled) {
                    resolve(book);
                    continue;
                }
                try {
                    const result = await _enrichWithGoogleBooks(book, attempt);
                    resolve(result);
                    googleBooksFailedAttempts = 0;
                } catch (error) {
                    if (error.message === 'Too Many Requests') {
                        googleBooksDisabled = true;
                        console.warn('[Google Books] Limite de requisições atingido. Consultas desativadas nesta sessão.');
                        resolve(book);
                        continue;
                    }
                    if (attempt < GOOGLE_BOOKS_MAX_RETRIES) {
                        const delay = GOOGLE_BOOKS_DELAY_MS * Math.pow(GOOGLE_BOOKS_BACKOFF_MULTIPLIER, attempt);
                        console.warn(`[Google Books] Falha (tentativa ${attempt+1}), agendando retry em ${delay}ms:`, error.message);
                        setTimeout(() => {
                            googleBooksQueue.unshift({ book, resolve, reject, attempt: attempt + 1 });
                            processGoogleBooksQueue();
                        }, delay);
                        continue;
                    } else {
                        googleBooksFailedAttempts++;
                        if (googleBooksFailedAttempts >= GOOGLE_BOOKS_DISABLE_AFTER_FAILURES) {
                            googleBooksDisabled = true;
                            console.warn('[Google Books] Desativado devido a múltiplas falhas. Usando capas locais como fallback.');
                        }
                        reject(error);
                    }
                }
                await new Promise(r => setTimeout(r, GOOGLE_BOOKS_DELAY_MS));
            }
            isProcessingGoogleBooks = false;
        })();
    }

    function enrichWithGoogleBooks(book) {
        return new Promise((resolve, reject) => {
            if (googleBooksDisabled || !hasGoogleBooksApiKey) return resolve(book);
            googleBooksQueue.push({ book, resolve, reject, attempt: 0 });
            processGoogleBooksQueue();
        });
    }

    async function _enrichWithGoogleBooks(book, attempt) {
        if (!book.title) return book;
        const cacheKey = `google_enrich_${normalizeText(book.title)}_${normalizeText(book.rawAuthor || '')}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < METADATA_CACHE_TTL) {
            const cached = metadataCache.get(cacheKey).data;
            if (cached) return { ...book, ...cached };
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
            let query = `intitle:${encodeURIComponent(book.title)}`;
            if (book.rawAuthor) query += `+inauthor:${encodeURIComponent(book.rawAuthor)}`;
            let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
            if (GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY !== 'YOUR_GOOGLE_BOOKS_API_KEY') url += `&key=${GOOGLE_BOOKS_API_KEY}`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.status === 429) {
                throw new Error('Too Many Requests');
            }
            if (!response.ok) return book;
            const data = await response.json();
            return processGoogleBooksData(book, data);
        } catch (error) {
            if (error.message === 'Too Many Requests') throw error;
            if (error.name === 'AbortError') {
                console.warn('[Google Books] Timeout, retornando livro sem enriquecimento.');
                return book;
            }
            console.warn('[Google Books] Erro ao enriquecer:', error);
            return book;
        }
    }

    function processGoogleBooksData(book, data) {
        if (!data.items || data.items.length === 0) return book;
        const volume = data.items[0].volumeInfo;
        const enriched = {};
        if (!book.cover && volume.imageLinks) {
            enriched.cover = volume.imageLinks.extraLarge || volume.imageLinks.large || volume.imageLinks.medium || volume.imageLinks.thumbnail || volume.imageLinks.smallThumbnail || null;
        }
        if (!book.description && volume.description) {
            enriched.description = volume.description;
        }
        if (!book.year && volume.publishedDate) {
            enriched.year = volume.publishedDate.substring(0, 4);
        }
        if (!book.publisher && volume.publisher) {
            enriched.publisher = volume.publisher;
        }
        if (!book.language && volume.language) {
            enriched.language = volume.language;
        }
        if (Object.keys(enriched).length > 0) {
            const cacheKey = `google_enrich_${normalizeText(book.title)}_${normalizeText(book.rawAuthor || '')}`;
            metadataCache.set(cacheKey, { data: enriched, timestamp: Date.now() });
            return { ...book, ...enriched };
        }
        return book;
    }

    async function enrichWithOpenLibrary(book) {
        if (!book.title) return book;
        const cacheKey = `openlib_enrich_${normalizeText(book.title)}_${normalizeText(book.rawAuthor || '')}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < METADATA_CACHE_TTL) {
            const cached = metadataCache.get(cacheKey).data;
            if (cached) return { ...book, ...cached };
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
            let query = `title:${encodeURIComponent(book.title)}`;
            if (book.rawAuthor) query += `&author:${encodeURIComponent(book.rawAuthor)}`;
            const url = `https://openlibrary.org/search.json?q=${query}&limit=1`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) return book;
            const data = await response.json();
            if (!data.docs || data.docs.length === 0) return book;
            const doc = data.docs[0];
            const enriched = {};
            if (!book.cover && doc.cover_i) {
                enriched.cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            }
            if (!book.description && doc.first_sentence) {
                enriched.description = doc.first_sentence[0];
            }
            if (!book.year && doc.first_publish_year) {
                enriched.year = doc.first_publish_year;
            }
            if (!book.publisher && doc.publisher) {
                enriched.publisher = doc.publisher[0];
            }
            if (!book.language && doc.language) {
                enriched.language = doc.language[0];
            }
            if (Object.keys(enriched).length > 0) {
                metadataCache.set(cacheKey, { data: enriched, timestamp: Date.now() });
                return { ...book, ...enriched };
            }
            return book;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('[OpenLibrary] Timeout, retornando livro sem enriquecimento.');
            } else {
                console.warn('[OpenLibrary] Erro ao enriquecer:', error);
            }
            return book;
        }
    }

    async function enrichBookMetadata(book) {
        if (!book.title) return book;
        const isYouTubeCover = typeof book.cover === 'string' && book.cover.includes('ytimg.com');
        let enriched = isYouTubeCover ? { ...book, cover: '' } : book;
        if (!googleBooksDisabled && hasGoogleBooksApiKey) {
            try {
                enriched = await enrichWithGoogleBooks(enriched);
            } catch (e) {
                console.debug('[Enrich] Google Books falhou; usando capa local como fallback.');
            }
        }
        return enriched;
    }

    // ========== APIS EXTERNAS ==========
    async function searchGoogleBooks(query) {
        if (!hasGoogleBooksApiKey || !query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `google_books_free_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
            let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${MAX_EXTERNAL_RESULTS}&printType=books&filter=free-ebooks`;
            if (GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY !== 'YOUR_GOOGLE_BOOKS_API_KEY') url += `&key=${GOOGLE_BOOKS_API_KEY}`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.status === 429) return [];
            if (!response.ok) return [];
            const data = await response.json();
            return processGoogleBooksSearch(data);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('[Google Books] Timeout na busca.');
            } else {
                console.warn('[Google Books] Erro:', error);
            }
            return [];
        }
    }

    function processGoogleBooksSearch(data) {
        return (data.items || []).map(book => {
            const volume = book.volumeInfo || {};
            const imageLinks = volume.imageLinks || {};
            const cover = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.thumbnail || imageLinks.smallThumbnail || null;
            const downloadLink = book.accessInfo?.webReaderLink || volume.previewLink || null;
            return {
                id: `google_${book.id}`,
                title: volume.title || 'Sem título',
                author: formatAuthor(volume.authors?.join(', ') || t('unknown_author')),
                rawAuthor: volume.authors?.join(', ') || t('unknown_author'),
                description: volume.description || '',
                cover: cover,
                download: downloadLink,
                downloadLabel: t('download_book'),
                language: volume.language || 'en',
                publisher: volume.publisher || 'Google Books',
                source: 'Google Books',
                type: 'book',
                year: volume.publishedDate ? volume.publishedDate.substring(0, 4) : null
            };
        });
    }

    async function searchArxiv(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `arxiv_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetchWithProxy(url, API_TIMEOUT_MS);
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");
            const entries = xmlDoc.querySelectorAll('entry');
            const results = [];
            entries.forEach(entry => {
                const title = entry.querySelector('title')?.textContent?.trim() || 'Sem título';
                const authors = Array.from(entry.querySelectorAll('author name')).map(n => n.textContent).join(', ');
                const summary = entry.querySelector('summary')?.textContent || '';
                const id = entry.querySelector('id')?.textContent || '';
                const pdfLink = id.replace('abs', 'pdf') + '.pdf';
                results.push({
                    id: `arxiv_${id.split('/').pop()}`,
                    title,
                    author: formatAuthor(authors),
                    rawAuthor: authors,
                    description: summary,
                    cover: null,
                    download: pdfLink,
                    downloadLabel: t('download_book'),
                    language: 'en',
                    publisher: 'arXiv',
                    source: 'arXiv',
                    type: 'paper',
                    year: null
                });
            });
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.warn('[arXiv] Erro:', error);
            return [];
        }
    }

    async function searchGutenberg(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `gutenberg_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return (data.results || []).map(book => ({
                id: `gutenberg_${book.id}`,
                title: book.title,
                author: formatAuthor(book.authors?.map(a => a.name).join(', ') || t('unknown_author')),
                rawAuthor: book.authors?.map(a => a.name).join(', ') || t('unknown_author'),
                description: book.subjects?.join(', ') || '',
                cover: book.formats?.['image/jpeg'] || null,
                download: book.formats?.['text/plain'] || book.formats?.['application/pdf'] || book.formats?.['application/epub+zip'],
                downloadLabel: t('download_book'),
                language: book.languages?.[0] || 'en',
                publisher: 'Project Gutenberg',
                source: 'Gutenberg',
                type: 'book',
                year: null
            }));
        } catch (error) { console.warn('[Gutenberg] Erro:', error); return []; }
    }

    async function searchInternetArchive(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `ia_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:texts&fl[]=title&fl[]=creator&fl[]=description&fl[]=identifier&fl[]=language&fl[]=publisher&fl[]=year&rows=${MAX_EXTERNAL_RESULTS}&output=json`;
            const response = await fetchWithProxy(url, API_TIMEOUT_MS);
            const data = await response.json();
            const docs = data.response?.docs || [];
            return docs.map(doc => ({
                id: `ia_${doc.identifier}`,
                title: doc.title || 'Sem título',
                author: formatAuthor(doc.creator),
                rawAuthor: doc.creator,
                description: doc.description || '',
                cover: `https://archive.org/services/img/${doc.identifier}`,
                download: `https://archive.org/download/${doc.identifier}/${doc.identifier}.pdf`,
                downloadLabel: t('download_book'),
                language: doc.language?.[0] || 'en',
                publisher: doc.publisher?.[0] || 'Internet Archive',
                source: 'Internet Archive',
                type: 'book',
                year: doc.year || null
            }));
        } catch (error) { console.warn('[Internet Archive] Erro:', error); return []; }
    }

    async function searchStandardEbooks(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `standard_ebooks_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = 'https://standardebooks.org/ebooks.json';
            const response = await fetchWithProxy(url, API_TIMEOUT_MS);
            const contentType = response.headers.get('content-type');
            if (!response.ok || !contentType || !contentType.includes('application/json')) return [];
            const text = await response.text();
            if (!text || text.trim().startsWith('<!DOCTYPE')) return [];
            const data = JSON.parse(text);
            const filtered = data.filter(book =>
                book.title.toLowerCase().includes(query.toLowerCase()) ||
                (book.author && book.author.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, MAX_EXTERNAL_RESULTS);
            return filtered.map(book => ({
                id: `standard_${book.id}`,
                title: book.title,
                author: formatAuthor(book.author),
                rawAuthor: book.author,
                description: book.description || '',
                cover: `https://standardebooks.org${book.cover}`,
                download: `https://standardebooks.org/ebooks/${book.id}/downloads`,
                downloadLabel: t('access_online'),
                language: book.language || 'en',
                publisher: 'Standard Ebooks',
                source: 'Standard Ebooks',
                type: 'book',
                year: null
            }));
        } catch (error) {
            console.warn('[Standard Ebooks] Erro:', error);
            return [];
        }
    }

    async function searchDOAB(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `doab_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = `https://directory.doabooks.org/rest/search?query=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetchWithProxy(url, API_TIMEOUT_MS);
            const data = await response.json();
            return (data.results || []).map(book => ({
                id: `doab_${book.id}`,
                title: book.title,
                author: formatAuthor(book.author),
                rawAuthor: book.author,
                description: book.description || '',
                cover: book.coverUrl || null,
                download: book.downloadUrl,
                downloadLabel: t('download_book'),
                language: book.language || 'en',
                publisher: book.publisher,
                source: 'DOAB',
                type: 'book',
                year: book.year || null
            }));
        } catch (error) { console.warn('[DOAB] Erro:', error); return []; }
    }

    async function searchOpenLibrary(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `openlib_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
            const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return (data.docs || []).map(doc => {
                let coverId = doc.cover_i;
                let coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
                let downloadUrl = `https://openlibrary.org${doc.key}`;
                return {
                    id: `openlib_${doc.key.replace('/works/', '')}`,
                    title: doc.title,
                    author: formatAuthor(doc.author_name?.join(', ') || t('unknown_author')),
                    rawAuthor: doc.author_name?.join(', ') || t('unknown_author'),
                    description: doc.first_sentence?.[0] || '',
                    cover: coverUrl,
                    download: downloadUrl,
                    downloadLabel: t('access_online'),
                    language: doc.language?.[0] || 'en',
                    publisher: doc.publisher?.[0] || 'Open Library',
                    source: 'Open Library',
                    type: 'book',
                    year: doc.first_publish_year || null
                };
            });
        } catch (error) {
            if (error.name === 'AbortError') {
                console.warn('[Open Library] Timeout');
            } else {
                console.warn('[Open Library] Erro:', error);
            }
            return [];
        }
    }

    // Placeholders para outras APIs
    async function searchCORE(query) { return []; }
    async function searchSemanticScholar(query) { return []; }
    async function searchOpenAlex(query) { return []; }
    async function searchNDLTD(query) { return []; }
    async function searchOATD(query) { return []; }
    async function searchPaperity(query) { return []; }
    async function searchSSRN(query) { return []; }
    async function searchBASE(query) { return []; }
    async function searchHolyBooks(query) { return []; }
    async function searchObooko(query) { return []; }
    async function searchInfoBooks(query) { return []; }

    async function searchExternalBooks(query) {
        const promises = [
            searchArxiv(query),
            searchGutenberg(query),
            searchInternetArchive(query),
            searchStandardEbooks(query),
            searchDOAB(query),
            searchOpenLibrary(query),
            searchGoogleBooks(query),
            searchCORE(query), searchSemanticScholar(query), searchOpenAlex(query),
            searchNDLTD(query), searchOATD(query), searchPaperity(query), searchSSRN(query),
            searchBASE(query), searchHolyBooks(query), searchObooko(query), searchInfoBooks(query)
        ];
        const results = await Promise.allSettled(promises);
        const all = [];
        for (const res of results) {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) {
                all.push(...res.value);
            }
        }
        console.log(`[Busca Externa] Total de ${all.length} livros encontrados`);
        const enriched = await Promise.all(all.map(async book => await enrichBookMetadata(book)));
        return enriched;
    }

    // ========== UTILITÁRIOS DE REDE ==========
    async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.status === 429) {
                    const delay = baseDelay * Math.pow(2, i);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response;
            } catch (error) {
                if (i === maxRetries) throw error;
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw new Error(`Falha após ${maxRetries} tentativas`);
    }

    async function fetchWithProxy(url, timeout = 15000, retries = 2) {
        try {
            const response = await fetchWithRetry(url, {}, retries, 1000);
            if (response.ok) return response;
        } catch (e) { /* fallback */ }
        for (let i = 0; i < retries; i++) {
            for (const proxy of CORS_PROXIES) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(url);
                    const response = await fetchWithRetry(proxyUrl, {}, 1, 1000);
                    if (response.ok) return response;
                } catch (e) { /* continua */ }
            }
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
        throw new Error(`Falha ao acessar ${url}`);
    }

    // ========== UI DE CARREGAMENTO ==========
    let loadingTimer = null;
    let loadingMinTimer = null;
    let uiState = { isLoading: false, hasResults: false, hasError: false };

    function showLoading() {
        if (loadingTimer) clearTimeout(loadingTimer);
        if (loadingMinTimer) clearTimeout(loadingMinTimer);
        uiState.isLoading = true;
        if (!grid) return;
        grid.innerHTML = '';
        const skeleton = document.createElement('div');
        skeleton.className = 'loading-skeleton';
        skeleton.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-progress-container">
                <div class="loading-progress-bar"></div>
            </div>
            <p class="loading-text">${t('loading')}</p>
        `;
        grid.appendChild(skeleton);
        const progressBar = skeleton.querySelector('.loading-progress-bar');
        if (progressBar) {
            let width = 0;
            const interval = setInterval(() => {
                if (width >= 90) clearInterval(interval);
                else width += 10;
                progressBar.style.width = width + '%';
            }, 200);
            skeleton._loadingInterval = interval;
        }
        loadingMinTimer = setTimeout(() => {}, 400);
    }

    function hideLoading() {
        if (loadingTimer) clearTimeout(loadingTimer);
        const minTimePromise = new Promise(resolve => {
            if (loadingMinTimer) {
                clearTimeout(loadingMinTimer);
                loadingMinTimer = null;
                resolve();
            } else {
                setTimeout(resolve, 400);
            }
        });
        minTimePromise.then(() => {
            uiState.isLoading = false;
            const skeleton = document.querySelector('.loading-skeleton');
            if (skeleton) {
                if (skeleton._loadingInterval) clearInterval(skeleton._loadingInterval);
                skeleton.remove();
            }
        });
    }

    function showEmptyState() {
        if (uiState.isLoading || uiState.hasResults || uiState.hasError) return;
        if (!grid) return;
        grid.innerHTML = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.innerHTML = `<i class="fas fa-book-open"></i> ${t('no_results')}`;
        grid.appendChild(emptyDiv);
        document.getElementById('bookCount').innerText = '0';
    }

    function showErrorState() {
        uiState.hasError = true;
        if (!grid) return;
        grid.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-state';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${t('error_loading')}`;
        grid.appendChild(errorDiv);
        document.getElementById('bookCount').innerText = '0';
    }

    async function renderResultsIncrementally(items, targetContainer) {
        if (!targetContainer) return;
        targetContainer.innerHTML = '';
        for (let i = 0; i < items.length; i++) {
            const card = await createBookCard(items[i]);
            if (card) {
                targetContainer.appendChild(card);
                if (i % 5 === 0) await new Promise(r => setTimeout(r, 10));
            }
        }
        document.getElementById('bookCount').innerText = items.length;
        applyAllTranslations();
    }

    function getLanguagePriority(langCode) {
        if (!langCode) return 5;
        const code = langCode.toLowerCase().slice(0, 2);
        if (code === 'pt') return 1;
        if (code === 'en') return 2;
        if (code === 'es') return 3;
        if (code === 'fr') return 4;
        return 5;
    }

    function sortBooksByPriority(books) {
        return [...books].sort((a, b) => {
            if (a.sourceType === 'local' && b.sourceType !== 'local') return -1;
            if (b.sourceType === 'local' && a.sourceType !== 'local') return 1;
            const langA = getLanguagePriority(a.language);
            const langB = getLanguagePriority(b.language);
            if (langA !== langB) return langA - langB;
            return (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase());
        });
    }

    function deduplicateBooks(books) {
        const seen = new Map();
        const unique = [];
        for (const book of books) {
            if (!book.title) continue;
            const key = `${normalizeText(book.title)}|${normalizeText(book.rawAuthor || book.author)}|${book.repositoryName || book.source || ''}`;
            const existing = seen.get(key);
            if (!existing) {
                seen.set(key, book);
                unique.push(book);
            } else {
                if (!existing.download && book.download) {
                    seen.set(key, book);
                    unique[unique.indexOf(existing)] = book;
                } else if (!existing.cover && book.cover) {
                    seen.set(key, book);
                    unique[unique.indexOf(existing)] = book;
                }
            }
        }
        return unique;
    }

    function filterByActiveTab(items) {
        return items.filter(item => item.type === activeTab);
    }

    async function showResults(items) {
        const filteredByType = items.filter(book => !isAudiobook(book));
        const tabFiltered = filterByActiveTab(filteredByType);
        const unique = deduplicateBooks(tabFiltered);
        if (!grid) return;
        uiState.hasResults = true;
        uiState.hasError = false;
        hideLoading();
        if (!unique || unique.length === 0) {
            showEmptyState();
            return;
        }
        const sorted = sortBooksByPriority(unique);
        await renderResultsIncrementally(sorted, grid);
    }

    // ========== CRIAÇÃO DE CARD E MODAL ==========
    async function createBookCard(item) {
        if (!item || !item.title) return null;
        let normalized = normalizeBookFields(item);
        const coverUrl = normalized.cover || generateEnhancedColorCover(normalized.title);
        normalized.cover = coverUrl;
        let typeTagHtml = '';
        const typeKey = `type_${normalized.type}`;
        const typeText = t(typeKey, normalized.type);
        let iconClass = '';
        switch (normalized.type) {
            case 'book': iconClass = 'fas fa-book';
            break;
            case 'article': iconClass = 'fas fa-file-alt';
            break;
            case 'paper': iconClass = 'fas fa-file-pdf';
            break;
            case 'tcc': iconClass = 'fas fa-graduation-cap';
            break;
            case 'dissertation': iconClass = 'fas fa-tasks';
            break;
            case 'thesis': iconClass = 'fas fa-award';
            break;
            default: iconClass = 'fas fa-file';
        }
        typeTagHtml = `<div class="mini-type-tag"><i class="${iconClass}"></i> ${typeText}</div>`;

        const isRead = isBookRead(normalized.id);
        const readBadge = isRead ? `<span class="read-badge"><i class="fas fa-check-circle"></i> ${t('marked_as_read')}</span>` : '';

        const card = document.createElement('div');
        card.className = 'book-mini-card';
        card.style.cursor = 'pointer';
        card.dataset.id = normalized.id;
        card.innerHTML = `
            <img class="mini-cover" src="${coverUrl}" alt="${escapeHtml(normalized.title)}" onerror="this.src='${generateEnhancedColorCover(normalized.title)}'">
            <div class="mini-title">${escapeHtml(normalized.title)}</div>
            <div class="mini-author">${escapeHtml(normalized.author)}</div>
            <div class="mini-year">${escapeHtml(normalized.year || t('year_not_informed'))}</div>
            ${normalized.publisher ? `<div class="mini-publisher">${escapeHtml(normalized.publisher)}</div>` : ''}
            ${typeTagHtml}
            ${readBadge}
        `;
        card.addEventListener('click', () => showModal(normalized));
        return card;
    }

    async function showModal(item) {
        if (!item) return;
        const enriched = await enrichBookMetadata(item);
        const coverUrl = enriched.cover || generateEnhancedColorCover(enriched.title);
        const fullAuthor = enriched.rawAuthor || enriched.author;
        const isRead = isBookRead(enriched.id);

        modal._currentItem = enriched;

        modalBody.innerHTML = `
            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                <img class="modal-cover" src="${coverUrl}" alt="${escapeHtml(enriched.title)}" onerror="this.src='${generateEnhancedColorCover(enriched.title)}'">
                <div class="modal-details">
                    <h2>${escapeHtml(enriched.title)}</h2>
                    <p><strong>${t('book_author')}:</strong> ${escapeHtml(fullAuthor)}</p>
                    <p><strong>${t('book_year')}:</strong> ${escapeHtml(enriched.year || t('year_not_informed'))}</p>
                    <p><strong>${t('book_publisher')}:</strong> ${escapeHtml(enriched.publisher || t('unknown_publisher'))}</p>
                    <p><strong>${t('book_language')}:</strong> ${escapeHtml(enriched.language ? enriched.language.toUpperCase() : 'EN')}</p>
                    ${enriched.repositoryName ? `<p><strong>${t('repository_prefix')}:</strong> ${escapeHtml(enriched.repositoryName)}</p>` : ''}
                    <p><strong>Fonte:</strong> ${escapeHtml(enriched.source)}</p>
                    ${enriched.type ? `<p><strong>Tipo:</strong> ${t('type_' + enriched.type, enriched.type)}</p>` : ''}
                    <div class="modal-description">${escapeHtml(enriched.description || t('no_description'))}</div>
                    <div id="actionButtons" class="modal-actions"></div>
                    <div class="modal-read-actions">
                        <button id="toggleReadBtn" class="action-btn ${isRead ? 'read-btn' : 'unread-btn'}">
                            <i class="fas ${isRead ? 'fa-check-circle' : 'fa-circle'}"></i>
                            ${isRead ? t('marked_as_read') : t('mark_as_read')}
                        </button>
                    </div>
                </div>
            </div>
        `;
        renderActionButtons(enriched);

        const toggleBtn = document.getElementById('toggleReadBtn');
        if (toggleBtn) {
            const newToggleBtn = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);

            newToggleBtn.addEventListener('click', function() {
                const nowRead = toggleBookRead(enriched);
                const key = nowRead ? 'marked_as_read' : 'mark_as_read';
                const icon = this.querySelector('i');
                if (icon) {
                    const iconClone = icon.cloneNode(true);
                    this.innerHTML = '';
                    this.appendChild(iconClone);
                    this.appendChild(document.createTextNode(' ' + t(key)));
                } else {
                    this.textContent = t(key);
                }
                this.className = `action-btn ${nowRead ? 'read-btn' : 'unread-btn'}`;
                const card = document.querySelector(`.book-mini-card[data-id="${enriched.id}"]`);
                if (card) {
                    const existingBadge = card.querySelector('.read-badge');
                    if (nowRead) {
                        if (!existingBadge) {
                            const badge = document.createElement('span');
                            badge.className = 'read-badge';
                            badge.innerHTML = `<i class="fas fa-check-circle"></i> ${t('marked_as_read')}`;
                            card.appendChild(badge);
                        }
                    } else {
                        if (existingBadge) existingBadge.remove();
                    }
                }
                modal._currentItem = enriched;
            });
            document.getElementById('toggleReadBtn');
        }

        modal.style.display = 'flex';
        updateReadButtonTranslation();
    }

    function closeModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
        modal._currentItem = null;
    }

    function generateEnhancedColorCover(title) {
        if (!title) title = 'Sem título';
        const colors = ['#FF6B6B', '#4ECDC4', '#556270', '#C7F464', '#FFB400', '#6A4C93', '#2EC4B6', '#FF9F1C', '#1E88E5', '#E63946', '#457B9D', '#F4A261', '#2A9D8F'];
        const colorIndex = Math.abs(title.length * 7) % colors.length;
        const bgColor = colors[colorIndex];
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 450;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, bgColor);
        grad.addColorStop(1, bgColor + 'cc');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px "Inter", "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const words = title.split(' ').filter(w => w.length > 0);
        let initials = words.map(w => w[0].toUpperCase()).join('');
        if (initials.length > 3) initials = initials.slice(0, 3);
        if (initials.length === 0) initials = '?';
        ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
        return canvas.toDataURL('image/png');
    }

    function normalizeBookFields(book) {
        const inferredType = inferBookType(book);
        let finalLabel = book.download_label;
        if (!finalLabel && book.download) finalLabel = detectDownloadLabelFromUrl(book.download);
        return {
            id: book.id || generateId(),
            title: book.title || 'Sem título',
            author: formatAuthor(book.author || t('unknown_author')),
            rawAuthor: book.author || t('unknown_author'),
            publisher: book.publisher || '',
            year: book.year || null,
            description: book.description || '',
            cover: book.cover || null,
            download: book.download || book.download_url || null,
            downloadLabel: finalLabel || t('access_online'),
            repositoryName: book.repositoryName || book.repository_name || null,
            repositoryLink: book.repositoryLink || book.repository_link || null,
            language: book.language || null,
            isbn: book.isbn || null,
            identifier: book.identifier || null,
            type: inferredType,
            sourceType: book.sourceType || 'local',
            source: book.source || 'Local',
            videoId: book.videoId || null,
            parts: book.parts || [] // Array de { type: 'audio'|'video'|'pdf', url, title }
        };
    }

    function createActionButton(book) {
        const label = book.downloadLabel;
        const url = book.download;
        const repoLink = book.repositoryLink;
        if (!url && !repoLink) {
            const disabled = document.createElement('span');
            disabled.textContent = label || t('unavailable');
            disabled.className = 'action-btn disabled-btn';
            return disabled;
        }
        const btn = document.createElement('a');
        btn.textContent = label;
        btn.className = 'action-btn download-btn';
        btn.href = '#';
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (label === t('download_book') && url) {
                await forceDownload(url, (book.title || 'documento').replace(/[^a-z0-9]/gi, '_') + '.pdf', repoLink);
            } else if (url) {
                window.open(url, '_blank');
            } else if (repoLink) {
                window.open(repoLink, '_blank');
            } else {
                alert(t('no_link_available'));
            }
        });
        return btn;
    }

    function renderActionButtons(book) {
        const container = document.getElementById('actionButtons');
        if (!container) return;
        container.innerHTML = '';
        const mainBtn = createActionButton(book);
        container.appendChild(mainBtn);
        if (book.repositoryLink && book.download !== book.repositoryLink) {
            const repoBtn = document.createElement('a');
            repoBtn.textContent = book.repositoryName ? `${t('repository_prefix')} ${book.repositoryName}` : t('repository');
            repoBtn.href = book.repositoryLink;
            repoBtn.target = '_blank';
            repoBtn.rel = 'noopener noreferrer';
            repoBtn.className = 'action-btn repo-btn';
            container.appendChild(repoBtn);
        }
    }

    // ========== BIBLIOTECAS RECOMENDADAS ==========
    async function loadExternalLibraries() {
        try {
            const response = await fetch('bibliotecas.json');
            if (!response.ok) throw new Error('Erro ao carregar bibliotecas.json');
            externalLibrariesData = await response.json();
            renderExternalLibraries();
        } catch (error) {
            console.error('Erro ao carregar bibliotecas recomendadas:', error);
            const container = document.getElementById('externalLibrariesGrid');
            if (container) container.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-triangle"></i> ${t('error_loading')}</div>`;
        }
    }

    function renderExternalLibraries() {
        const container = document.getElementById('externalLibrariesGrid');
        if (!container) return;
        if (!externalLibrariesData || externalLibrariesData.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-globe"></i> ${t('no_results')}</div>`;
            return;
        }
        let html = '';
        externalLibrariesData.forEach(lib => {
            const title = typeof lib.title === 'object'
                ? (lib.title[currentLang] || lib.title['pt-br'] || '')
                : lib.title || '';
            const description = typeof lib.description === 'object'
                ? (lib.description[currentLang] || lib.description['pt-br'] || '')
                : lib.description || '';

            const priceTag = lib.price === 'free' ? t('price_free') : (lib.price === 'paid' ? t('price_paid') : '');
            const priceClass = lib.price === 'free' ? 'free' : 'paid';
            const typeText = lib.type === 'digital' ? 'Digital' : (lib.type === 'physical' ? 'Físico' : 'Físico/Digital');

            html += `
                <div class="library-card" data-url="${escapeHtml(lib.url)}">
                    <img class="library-cover" src="${escapeHtml(lib.image)}" alt="${escapeHtml(title)}" onerror="this.src='https://placehold.co/80x80/1F2933/9CA3AF?text=${encodeURIComponent(title.substring(0,2))}'">
                    <div class="library-info">
                        <div class="library-title">
                            ${escapeHtml(title)}
                            ${priceTag ? `<span class="library-price-tag ${priceClass}">${priceTag}</span>` : ''}
                        </div>
                        <div class="library-description">${escapeHtml(description)}</div>
                        <span class="library-type-tag">${typeText}</span>
                        <a href="${escapeHtml(lib.url)}" target="_blank" rel="noopener noreferrer" class="library-link">Acessar</a>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        container.querySelectorAll('.library-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') return;
                const url = card.dataset.url;
                if (url) window.open(url, '_blank');
            });
        });
        applyAllTranslations();
    }

    // ========== BUSCAS PRINCIPAIS ==========
    async function performSearchWithFilters(query) {
        if (activeMainTab !== 'library') return;
        const trimmed = normalizeText(query);
        const thisSearchId = ++currentSearchId;
        uiState.currentSearchId = thisSearchId;
        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();

        const cacheKey = `search_${trimmed}_${activeTab}`;
        if (searchCache.has(cacheKey) && Date.now() - searchCache.get(cacheKey).timestamp < SEARCH_CACHE_TTL) {
            showResults(searchCache.get(cacheKey).data);
            return;
        }

        showLoading();

        let localRaw = searchLocalBooks(trimmed);
        const localResults = await Promise.all(localRaw.map(async book => enrichBookMetadata(book)));
        if (thisSearchId !== currentSearchId) return;

        let currentResults = [...localResults];
        showResults(currentResults);

        const globalTimeoutId = setTimeout(() => {
            if (uiState.isLoading && thisSearchId === currentSearchId) {
                if (currentResults.length === 0) showErrorState();
                else hideLoading();
            }
        }, GLOBAL_TIMEOUT);

        try {
            if (trimmed.length >= MIN_SEARCH_LENGTH) {
                const externalResults = await searchExternalBooks(trimmed);
                const merged = [...currentResults, ...externalResults];
                const unique = deduplicateBooks(merged);
                searchCache.set(cacheKey, { data: unique, timestamp: Date.now() });
                showResults(unique);
            }
        } catch (error) {
            console.error('[Search] erro:', error);
            if (thisSearchId === currentSearchId && currentResults.length === 0) showErrorState();
        } finally {
            clearTimeout(globalTimeoutId);
            hideLoading();
        }
    }

    const debouncedPerformSearch = debounce(performSearchWithFilters, 400);

    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ========== CARREGAMENTO LOCAL ==========
    async function loadLocalBooks() {
        const paths = ['books.json', './books.json', '../books.json', 'data/books.json'];
        for (const path of paths) {
            try {
                const response = await fetch(path, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`[Biblioteca] ${data.length} livros carregados de ${path}`);
                        return data.map(book => ({ ...book, sourceType: 'local', source: 'Local', type: book.type || inferBookType(book) }));
                    }
                }
            } catch (e) { /* tenta próximo */ }
        }
        console.warn('[Biblioteca] Nenhum arquivo books.json encontrado. A biblioteca local estará vazia.');
        return [];
    }

    function searchLocalBooks(query) {
        if (!localBooksCache.length) return [];
        if (!query || query.length < MIN_SEARCH_LENGTH) return localBooksCache.slice(0, 30);
        const normalizedQuery = normalizeText(query);
        const results = localBooksCache.map(book => {
            let score = 0;
            const title = normalizeText(book.title || '');
            const author = normalizeText(book.author || '');
            const description = normalizeText(book.description || '');
            if (title === normalizedQuery) score += 100;
            else if (title.includes(normalizedQuery)) score += 50;
            if (author.includes(normalizedQuery)) score += 30;
            if (description.includes(normalizedQuery)) score += 10;
            return { book, score };
        });
        return results.filter(item => item.score > 0).sort((a, b) => b.score - a.score).map(item => item.book);
    }

    // ========== AUDIOBOOKS (com suporte a múltiplas partes e PDF) ==========
    function extractVideoId(url) {
        if (!url) return null;
        const patterns = [
            /youtube\.com\/shorts\/([^?#]+)/i,
            /youtube\.com\/watch\?v=([^&?#]+)/i,
            /youtu\.be\/([^?#]+)/i,
            /youtube\.com\/embed\/([^?#]+)/i,
            /youtube\.com\/v\/([^?#]+)/i,
            /youtube\.com\/e\/([^?#]+)/i
        ];
        for (const p of patterns) {
            const match = url.match(p);
            if (match && match[1]) {
                return match[1].split('?')[0].split('&')[0];
            }
        }
        return null;
    }

    async function loadAudiobooks() {
        const paths = [
            'audiobooks.json',
            '../audiobooks.json',
            '/biblioteca/audiobooks.json'
        ];
        for (const path of paths) {
            try {
                console.log(`[Biblioteca] Tentando carregar audiobooks de: ${path}`);
                const response = await fetch(path);
                if (response.ok) {
                    const data = await response.json();
                    console.log(`[Biblioteca] Audiobooks carregados de ${path}: ${data.length} itens`);
                    const enriched = await Promise.all(data.map(async item => {
                        // Se tem parts, processa cada part
                        let parts = item.parts || [];
                        if (item.url && !parts.length) {
                            // Compatibilidade com formato antigo
                            parts = [{ type: 'audio', url: item.url, title: 'Parte 1' }];
                        }
                        // Para cada part, extrai videoId se for YouTube
                        parts = parts.map(p => {
                            if (p.type === 'audio' || p.type === 'video') {
                                const videoId = extractVideoId(p.url);
                                return { ...p, videoId };
                            }
                            return p;
                        });
                        const book = {
                            ...item,
                            type: 'audiobook',
                            source: 'YouTube',
                            cover: item.cover || (parts[0]?.videoId
                                ? `https://i.ytimg.com/vi/${parts[0].videoId}/hqdefault.jpg`
                                : ''),
                            parts: parts
                        };
                        return book;
                    }));
                    return enriched;
                }
            } catch (e) {
                console.warn(`[Biblioteca] Falha ao carregar ${path}:`, e.message);
            }
        }
        console.warn('[Biblioteca] Nenhum arquivo audiobooks.json encontrado. A aba de audiobooks ficará vazia.');
        return [];
    }

    // ========== PLAYER MULTIMÍDIA ==========
    function ensureAudiobookPlayerContainer() {
        if (playerContainerCreated) {
            const container = document.getElementById('multimediaPlayerContainer');
            if (container) return container;
            playerContainerCreated = false;
        }

        let container = document.getElementById('multimediaPlayerContainer');
        if (container) {
            playerContainerCreated = true;
            return container;
        }

        console.warn('[Player] Container não encontrado, criando dinamicamente...');
        const audiobooksTab = document.getElementById('audiobooksTabContent');
        if (!audiobooksTab) {
            console.error('[Player] Aba de audiobooks não encontrada, criando no body');
            container = document.createElement('div');
            container.id = 'multimediaPlayerContainer';
            container.className = 'multimedia-player-container';
            container.style.display = 'none';
            document.body.appendChild(container);
        } else {
            const grid = document.getElementById('audiobooksGrid');
            container = document.createElement('div');
            container.id = 'multimediaPlayerContainer';
            container.className = 'multimedia-player-container';
            container.style.display = 'none';
            if (grid) {
                audiobooksTab.insertBefore(container, grid);
            } else {
                audiobooksTab.appendChild(container);
            }
        }

        container.innerHTML = `
            <div class="player-header">
                <div class="player-title-info">
                    <h3 id="playerTitle"></h3>
                    <p id="playerDescription"></p>
                </div>
                <div class="player-header-actions">
                    <button id="playerToggleMode" class="player-ctrl-btn" title="Alternar modo áudio/vídeo">
                        <i class="fas fa-eye"></i> ${t('video_mode')}
                    </button>
                    <button id="closeMultimediaPlayer" class="player-ctrl-btn" title="${t('close_player')}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="player-video-wrapper" id="playerVideoWrapper">
                <div id="multimediaYouTubePlayer"></div>
                <div id="playerCaptionsContainer" class="player-captions-container"></div>
            </div>
            <div class="player-controls">
                <div class="player-controls-row">
                    <button id="playerPlayPause" class="player-ctrl-btn" data-playing="false">
                        <i class="fas fa-play"></i> ${t('play')}
                    </button>
                    <div class="player-progress-container">
                        <span id="playerCurrentTime">00:00</span>
                        <input type="range" id="playerProgressBar" class="player-progress-bar" min="0" max="100" value="0" step="0.1">
                        <span id="playerDuration">00:00</span>
                    </div>
                    <div class="player-volume-container">
                        <button id="playerMuteBtn" class="player-ctrl-btn" title="${t('volume')}">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <input type="range" id="playerVolumeSlider" class="player-volume-slider" min="0" max="100" value="80">
                    </div>
                    <button id="playerSubtitles" class="player-ctrl-btn" title="${t('subtitles')}">
                        <i class="fas fa-closed-captioning"></i> ${t('subtitles')}
                    </button>
                </div>
            </div>
            <div id="playerPartsContainer" class="player-parts-container" style="display: none;"></div>
        `;

        setupPlayerEventListeners(container);
        playerContainerCreated = true;
        console.log('[Player] Container criado com sucesso.');
        return container;
    }

    function setupPlayerEventListeners(container) {
        const playPauseBtn = document.getElementById('playerPlayPause');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => togglePlayPause());
        }

        const progressBar = document.getElementById('playerProgressBar');
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                if (multimediaPlayer && multimediaPlayerReady) {
                    const percent = parseFloat(e.target.value);
                    const duration = multimediaPlayer.getDuration();
                    if (duration) {
                        const seekTime = (percent / 100) * duration;
                        multimediaPlayer.seekTo(seekTime, true);
                    }
                }
            });
        }

        const volumeSlider = document.getElementById('playerVolumeSlider');
        const muteBtn = document.getElementById('playerMuteBtn');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const vol = parseInt(e.target.value);
                if (multimediaPlayer && multimediaPlayerReady) {
                    multimediaPlayer.setVolume(vol);
                    updateVolumeIcon(vol);
                }
                localStorage.setItem('player_volume', vol);
            });
            const savedVol = localStorage.getItem('player_volume');
            if (savedVol !== null) {
                volumeSlider.value = savedVol;
                if (multimediaPlayer && multimediaPlayerReady) {
                    multimediaPlayer.setVolume(parseInt(savedVol));
                }
            }
        }
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                if (multimediaPlayer && multimediaPlayerReady) {
                    const muted = multimediaPlayer.isMuted();
                    if (muted) {
                        multimediaPlayer.unMute();
                        const vol = parseInt(volumeSlider.value);
                        multimediaPlayer.setVolume(vol);
                        updateVolumeIcon(vol);
                    } else {
                        multimediaPlayer.mute();
                        updateVolumeIcon(0, true);
                    }
                }
            });
        }

        const modeBtn = document.getElementById('playerToggleMode');
        if (modeBtn) {
            modeBtn.addEventListener('click', () => toggleAudioVideoMode());
        }

        const subBtn = document.getElementById('playerSubtitles');
        if (subBtn) {
            subBtn.addEventListener('click', () => toggleSubtitles());
        }

        const closeBtn = document.getElementById('closeMultimediaPlayer');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeMultimediaPlayer());
        }
    }

    function updateVolumeIcon(volume, muted = false) {
        const muteBtn = document.getElementById('playerMuteBtn');
        if (!muteBtn) return;
        if (muted || volume === 0) {
            muteBtn.innerHTML = `<i class="fas fa-volume-mute"></i>`;
        } else if (volume < 30) {
            muteBtn.innerHTML = `<i class="fas fa-volume-down"></i>`;
        } else {
            muteBtn.innerHTML = `<i class="fas fa-volume-up"></i>`;
        }
    }

    function togglePlayPause() {
        if (!multimediaPlayer || !multimediaPlayerReady) return;
        const btn = document.getElementById('playerPlayPause');
        if (multimediaPlayer.getPlayerState() === YT.PlayerState.PLAYING) {
            multimediaPlayer.pauseVideo();
            btn.dataset.playing = 'false';
            btn.innerHTML = `<i class="fas fa-play"></i> ${t('play')}`;
        } else {
            multimediaPlayer.playVideo();
            btn.dataset.playing = 'true';
            btn.innerHTML = `<i class="fas fa-pause"></i> ${t('pause')}`;
        }
        updatePlayerControlTranslations();
    }

    function toggleAudioVideoMode() {
        isAudioMode = !isAudioMode;
        const wrapper = document.getElementById('playerVideoWrapper');
        const modeBtn = document.getElementById('playerToggleMode');
        if (wrapper) {
            if (isAudioMode) {
                wrapper.style.display = 'none';
                modeBtn.innerHTML = `<i class="fas fa-eye"></i> ${t('video_mode')}`;
            } else {
                wrapper.style.display = 'block';
                modeBtn.innerHTML = `<i class="fas fa-headphones"></i> ${t('audio_mode')}`;
            }
        }
        updatePlayerControlTranslations();
        if (subtitlesEnabled) {
            showCaptionsOverlay();
        }
    }

    function toggleSubtitles() {
        subtitlesEnabled = !subtitlesEnabled;
        const subBtn = document.getElementById('playerSubtitles');
        if (subtitlesEnabled) {
            subBtn.classList.add('subtitles-active');
            subBtn.style.color = 'var(--accent-blue)';
            if (multimediaPlayer && multimediaPlayerReady) {
                try {
                    const lang = currentLang === 'pt-br' ? 'pt' : 'en';
                    multimediaPlayer.setOption('captions', 'track', { languageCode: lang });
                } catch (e) {}
            }
            showCaptionsOverlay();
        } else {
            subBtn.classList.remove('subtitles-active');
            subBtn.style.color = '';
            if (multimediaPlayer && multimediaPlayerReady) {
                try {
                    multimediaPlayer.setOption('captions', 'track', {});
                } catch (e) {}
            }
            hideCaptionsOverlay();
        }
        updatePlayerControlTranslations();
    }

    let captionInterval = null;

    function showCaptionsOverlay() {
        const container = document.getElementById('playerCaptionsContainer');
        if (!container) return;
        container.style.display = 'block';
        if (multimediaPlayer && multimediaPlayerReady) {
            startCaptionUpdates();
        }
    }

    function hideCaptionsOverlay() {
        const container = document.getElementById('playerCaptionsContainer');
        if (container) {
            container.style.display = 'none';
            container.textContent = '';
        }
        if (captionInterval) {
            clearInterval(captionInterval);
            captionInterval = null;
        }
    }

    function startCaptionUpdates() {
        if (captionInterval) clearInterval(captionInterval);
        captionInterval = setInterval(() => {
            if (!multimediaPlayer || !multimediaPlayerReady || !subtitlesEnabled) {
                clearInterval(captionInterval);
                captionInterval = null;
                return;
            }
            const container = document.getElementById('playerCaptionsContainer');
            if (container) {
                const currentTime = multimediaPlayer.getCurrentTime();
                container.innerHTML = `<span class="caption-text">${currentTitle} — ${formatTime(currentTime)}</span>`;
            }
        }, 1000);
    }

    // ========== PROGRESSO INDIVIDUAL ==========
    function getRecentAudiobookRegistry() {
        try {
            const raw = localStorage.getItem(RECENT_AUDIOBOOKS_STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (error) {
            return [];
        }
    }

    function setRecentAudiobookRegistry(items) {
        localStorage.setItem(RECENT_AUDIOBOOKS_STORAGE_KEY, JSON.stringify(items.slice(0, 12)));
    }

    function buildRecentAudiobookEntry(meta, progressSeconds, videoId) {
        const safeMeta = meta || {};
        return {
            id: safeMeta.id || videoId || safeMeta.videoId || 'audiobook',
            videoId: safeMeta.videoId || videoId || '',
            title: safeMeta.title || currentTitle || 'Audiobook',
            description: safeMeta.description || currentDescription || '',
            author: safeMeta.author || '',
            cover: safeMeta.cover || '',
            progressSeconds: Number(progressSeconds) || 0,
            lastPlayed: Date.now()
        };
    }

    function upsertRecentAudiobookProgress(meta, progressSeconds, videoId) {
        const entry = buildRecentAudiobookEntry(meta, progressSeconds, videoId);
        const currentEntries = getRecentAudiobookRegistry().filter((item) => {
            return !(item.id === entry.id || item.videoId === entry.videoId);
        });
        currentEntries.unshift(entry);

        const uniqueMap = new Map();
        currentEntries.forEach((item) => {
            const key = `${item.id || item.videoId || item.title}-${item.videoId || item.title}`;
            if (!uniqueMap.has(key)) uniqueMap.set(key, item);
        });

        const sorted = [...uniqueMap.values()].sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
        setRecentAudiobookRegistry(sorted);
    }

    function formatProgressTime(seconds) {
        if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${String(secs).padStart(2, '0')}`;
    }

    function resolveAudiobookPlayback(book) {
        const parts = Array.isArray(book && book.parts) && book.parts.length
            ? book.parts
            : (book && book.url ? [{
                type: 'audio',
                url: book.url,
                title: 'Parte 1',
                videoId: book.videoId || extractVideoId(book.url)
            }] : []);

        const firstPart = parts[0] || {};
        const videoId = book && (book.videoId || firstPart.videoId || extractVideoId(book.url) || extractVideoId(firstPart.url));

        return {
            videoId,
            title: (book && book.title) || 'Audiobook',
            description: (book && book.description) || '',
            parts
        };
    }

    function getRecentAudiobooks(audiobooks) {
        const registry = getRecentAudiobookRegistry();
        const recent = [];

        registry.forEach((item) => {
            const match = audiobooks.find((book) => {
                const matchesId = book.id && item.id && book.id === item.id;
                const matchesVideo = !!(item.videoId && (book.videoId === item.videoId || (Array.isArray(book.parts) && book.parts.some((part) => part.videoId === item.videoId))));
                return matchesId || matchesVideo;
            });

            const sourceBook = match || {
                id: item.id,
                title: item.title,
                description: item.description,
                cover: item.cover,
                author: item.author,
                videoId: item.videoId,
                parts: item.videoId ? [{ videoId: item.videoId, title: item.title }] : []
            };

            recent.push({
                ...sourceBook,
                recentItem: item,
                progressSeconds: Number(item.progressSeconds || 0)
            });
        });

        return recent.slice(0, 4);
    }

    function renderContinueListeningSection(audiobooks) {
        const section = document.getElementById('continueListeningSection');
        if (!section) return;

        const recent = getRecentAudiobooks(audiobooks || []);
        if (!recent.length) {
            section.style.display = 'none';
            section.innerHTML = '';
            return;
        }

        section.style.display = 'block';
        section.innerHTML = `
            <div class="continue-listening-header">
                <h3>Continuar ouvindo</h3>
            </div>
            <div class="continue-listening-grid">
                ${recent.map((book) => {
                    const item = book.recentItem || {};
                    const progress = Number(book.progressSeconds || item.progressSeconds || 0);
                    const playback = resolveAudiobookPlayback(book);
                    const percentage = Math.min(100, Math.max(0, ((progress / 900) * 100) || 0));
                    const title = (book.title || item.title || playback.title || 'Audiobook');
                    const description = (book.description || item.description || playback.description || 'Retome de onde parou.');
                    const cover = book.cover || item.cover || 'https://placehold.co/240x360/1F2933/FBBF24?text=Audiobook';
                    const author = book.author || item.author || 'Audiobook';
                    const safeId = book.id || item.id || playback.videoId || '';
                    return `
                        <article class="continue-listening-card">
                            <div class="continue-listening-cover-wrap">
                                <img src="${cover}" alt="${title}" class="continue-listening-cover" onerror="this.src='https://placehold.co/240x360/1F2933/FBBF24?text=Audiobook'">
                            </div>
                            <div class="continue-listening-body">
                                <span class="continue-listening-author">${author}</span>
                                <h4>${title}</h4>
                                <p>${description}</p>
                                <div class="continue-listening-progress-meta">
                                    <span>${formatProgressTime(progress)}</span>
                                    <span>${Math.round(percentage)}%</span>
                                </div>
                                <div class="continue-listening-progress-bar">
                                    <span style="width: ${percentage}%"></span>
                                </div>
                                <button class="continue-listening-button" data-book-id="${safeId}" data-video-id="${playback.videoId || ''}">Continuar</button>
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        `;

        section.querySelectorAll('.continue-listening-button').forEach((button) => {
            button.addEventListener('click', () => {
                const targetBookId = button.dataset.bookId;
                const targetVideoId = button.dataset.videoId;
                const book = (audiobooks || []).find((entry) => {
                    const matchesId = entry.id && targetBookId && entry.id === targetBookId;
                    const matchesVideo = !!(targetVideoId && (entry.videoId === targetVideoId || (Array.isArray(entry.parts) && entry.parts.some((part) => part.videoId === targetVideoId))));
                    return matchesId || matchesVideo;
                });

                if (!book) return;
                const playback = resolveAudiobookPlayback(book);
                const meta = {
                    id: book.id,
                    title: book.title,
                    description: book.description,
                    cover: book.cover,
                    author: book.author,
                    videoId: playback.videoId
                };

                playMultimedia(playback.videoId, playback.title, playback.description, playback.parts, meta, loadProgress(playback.videoId));
            });
        });
    }

    function saveProgress() {
        if (!currentVideoId || !multimediaPlayer || !multimediaPlayerReady) {
            console.warn('[Progress] Não é possível salvar: ID do vídeo ou player não disponível');
            return;
        }
        if (isSavingProgress) return;
        isSavingProgress = true;
        try {
            const currentTime = multimediaPlayer.getCurrentTime();
            if (currentTime && currentTime > 0) {
                const key = `${PROGRESS_STORAGE_PREFIX}${currentVideoId}`;
                localStorage.setItem(key, currentTime);
                if (currentAudiobookMeta) {
                    upsertRecentAudiobookProgress(currentAudiobookMeta, currentTime, currentVideoId);
                }
                console.log(`[Progress] Salvo: ${key} = ${currentTime.toFixed(1)}s`);
            }
        } catch (e) {
            console.warn('[Progress] Erro ao salvar:', e);
        } finally {
            isSavingProgress = false;
        }
    }

    function loadProgress(videoId) {
        try {
            const key = `${PROGRESS_STORAGE_PREFIX}${videoId}`;
            const saved = localStorage.getItem(key);
            const time = saved ? parseFloat(saved) : 0;
            console.log(`[Progress] Carregado: ${key} = ${time.toFixed(1)}s`);
            return time;
        } catch (e) {
            console.warn('[Progress] Erro ao carregar:', e);
            return 0;
        }
    }

    function startProgressSaving() {
        if (progressSaveInterval) {
            clearInterval(progressSaveInterval);
            progressSaveInterval = null;
        }
        saveProgress();
        progressSaveInterval = setInterval(() => {
            saveProgress();
        }, 5000);
    }

    function loadYouTubeAPI() {
        return new Promise((resolve) => {
            if (window.YT && window.YT.Player) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://www.youtube.com/iframe_api';
            script.async = true;
            script.onload = () => {
                window.onYouTubeIframeAPIReady = () => resolve();
            };
            document.head.appendChild(script);
        });
    }

    // ========== PLAYER PRINCIPAL (COM PARTES E PDF) ==========
    function renderParts(parts, currentIndex) {
        const container = document.getElementById('playerPartsContainer');
        if (!container) return;
        if (!parts || parts.length <= 1) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        container.innerHTML = '';
        parts.forEach((part, idx) => {
            const btn = document.createElement('button');
            btn.className = `player-part-btn ${idx === currentIndex ? 'active' : ''}`;
            btn.textContent = part.title || `${t('part')} ${idx+1}`;
            btn.dataset.index = idx;
            btn.addEventListener('click', () => {
                playPart(idx);
            });
            container.appendChild(btn);
        });
    }

    function playPart(index) {
        if (!currentParts || index >= currentParts.length) return;
        const part = currentParts[index];
        currentPartIndex = index;
        renderParts(currentParts, index);
        // Salva progresso da parte atual antes de trocar
        if (currentVideoId) saveProgress();
        // Para o player atual
        if (multimediaPlayer && multimediaPlayerReady) {
            multimediaPlayer.stopVideo();
            multimediaPlayer.clearVideo();
        }
        // Define o novo vídeo/url
        if (part.type === 'audio' || part.type === 'video') {
            const videoId = part.videoId || extractVideoId(part.url);
            if (videoId) {
                currentVideoId = videoId;
                currentPartType = part.type;
                currentPartUrl = part.url;
                // Carrega no player
                multimediaPlayer.loadVideoById(videoId);
                const savedTime = loadProgress(videoId);
                if (savedTime > 5) {
                    setTimeout(() => {
                        if (multimediaPlayerReady) {
                            multimediaPlayer.seekTo(savedTime, true);
                        }
                    }, 1000);
                }
                startProgressSaving();
                setTimeout(() => {
                    if (multimediaPlayerReady && multimediaPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
                        multimediaPlayer.playVideo();
                    }
                }, 500);
            }
        } else if (part.type === 'pdf') {
            // Abre PDF em nova aba
            window.open(part.url, '_blank');
            // Não há progresso para PDF
        }
    }

    async function playMultimedia(videoId, title, description, parts, meta = null, initialProgress = 0) {
        console.log('[Player] Play solicitado:', videoId, title, parts);
        window.UniversidadeLivreAnalytics?.media('biblioteca', videoId || title, title);
        currentAudiobookMeta = meta || currentAudiobookMeta || {
            id: videoId,
            title: title || currentTitle || 'Audiobook',
            description: description || currentDescription || '',
            videoId
        };

        if (window.Auditorio && typeof window.Auditorio.playVideo === 'function') {
            console.log('[Player] Usando player do Auditório');
            window.Auditorio.playVideo(videoId, title, description);
            return;
        }
        if (window.playVideo && typeof window.playVideo === 'function') {
            console.log('[Player] Usando playVideo global');
            window.playVideo(videoId, title, description);
            return;
        }

        // Salva progresso do vídeo anterior antes de trocar
        if (currentVideoId && multimediaPlayer && multimediaPlayerReady) {
            console.log('[Player] Salvando progresso do vídeo anterior:', currentVideoId);
            saveProgress();
        }
        if (progressSaveInterval) {
            clearInterval(progressSaveInterval);
            progressSaveInterval = null;
        }

        const container = ensureAudiobookPlayerContainer();
        if (!container) {
            console.error('[Player] Falha ao criar container');
            showToast('Erro ao criar player. Tente novamente.', 'error');
            if (videoId && confirm('Deseja abrir o vídeo no YouTube?')) {
                window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
            }
            return;
        }

        // Atualiza o ID do vídeo atual
        currentVideoId = videoId;
        currentParts = parts || [];
        currentPartIndex = 0;

        const titleEl = document.getElementById('playerTitle');
        const descEl = document.getElementById('playerDescription');
        if (titleEl) titleEl.textContent = title || 'Audiobook';
        if (descEl) descEl.textContent = description || '';
        currentTitle = title || '';
        currentDescription = description || '';
        if (currentAudiobookMeta) {
            currentAudiobookMeta.title = currentTitle || currentAudiobookMeta.title || 'Audiobook';
            currentAudiobookMeta.description = currentDescription || currentAudiobookMeta.description || '';
        }

        // Mostra o container e rola até ele
        container.style.display = 'block';
        isPlayerVisible = true;
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });

        isAudioMode = true;
        const wrapper = document.getElementById('playerVideoWrapper');
        const modeBtn = document.getElementById('playerToggleMode');
        if (wrapper) {
            wrapper.style.display = 'none';
            if (modeBtn) modeBtn.innerHTML = `<i class="fas fa-eye"></i> ${t('video_mode')}`;
        }

        if (subtitlesEnabled) {
            setTimeout(() => showCaptionsOverlay(), 500);
        }

        // Renderiza partes se houver mais de uma
        renderParts(currentParts, 0);

        // Se há partes, a primeira parte pode ser PDF ou áudio
        if (currentParts.length > 0) {
            const firstPart = currentParts[0];
            if (firstPart.type === 'pdf') {
                // Abre PDF e não carrega player
                window.open(firstPart.url, '_blank');
                // Opcional: não iniciar player, apenas mostrar informações
                return;
            }
            // Senão, continua com o áudio/vídeo
        }

        // Se o player já existe e está pronto
        if (multimediaPlayer && multimediaPlayerReady) {
            console.log('[Player] Player existente, carregando vídeo');
            multimediaPlayer.loadVideoById(videoId);
            const savedTime = initialProgress > 0 ? initialProgress : loadProgress(videoId);
            if (savedTime > 5) {
                setTimeout(() => {
                    if (multimediaPlayerReady) {
                        multimediaPlayer.seekTo(savedTime, true);
                    }
                }, 1000);
            }
            startProgressSaving();
            setTimeout(() => {
                if (multimediaPlayerReady && multimediaPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
                    multimediaPlayer.playVideo();
                }
            }, 500);
            return;
        }

        // Aguarda prontidão se existir
        if (multimediaPlayer && !multimediaPlayerReady) {
            console.log('[Player] Aguardando player ficar pronto...');
            let attempts = 0;
            while (!multimediaPlayerReady && attempts < 10) {
                await new Promise(r => setTimeout(r, 500));
                attempts++;
            }
            if (multimediaPlayerReady) {
                multimediaPlayer.loadVideoById(videoId);
                const savedTime = initialProgress > 0 ? initialProgress : loadProgress(videoId);
                if (savedTime > 5) {
                    setTimeout(() => {
                        if (multimediaPlayerReady) {
                            multimediaPlayer.seekTo(savedTime, true);
                        }
                    }, 1000);
                }
                startProgressSaving();
                setTimeout(() => {
                    if (multimediaPlayerReady && multimediaPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
                        multimediaPlayer.playVideo();
                    }
                }, 500);
                return;
            } else {
                console.warn('[Player] Player não ficou pronto, recriando...');
                multimediaPlayer = null;
                multimediaPlayerReady = false;
            }
        }

        await loadYouTubeAPI();

        const playerDiv = document.getElementById('multimediaYouTubePlayer');
        if (!playerDiv) {
            console.error('[Player] Elemento #multimediaYouTubePlayer não encontrado');
            const parent = container.querySelector('.player-video-wrapper');
            if (parent) {
                parent.innerHTML = `
                    <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                            allowfullscreen allow="autoplay; encrypted-media" 
                            style="width:100%;height:100%;border:0;">
                    </iframe>
                `;
                showToast('Player simplificado (iframe) ativado.', 'info');
                return;
            }
            return;
        }

        if (!multimediaPlayer) {
            console.log('[Player] Criando novo player YouTube');
            try {
                multimediaPlayer = new YT.Player('multimediaYouTubePlayer', {
                    videoId: videoId,
                    playerVars: {
                        autoplay: 1,
                        controls: 0,
                        modestbranding: 1,
                        rel: 0,
                        origin: window.location.origin,
                        cc_load_policy: 1
                    },
                    events: {
                        onReady: () => {
                            console.log('[Player] Player pronto');
                            multimediaPlayerReady = true;
                            const startingTime = initialProgress > 0 ? initialProgress : loadProgress(videoId);
                            if (startingTime > 5) {
                                setTimeout(() => {
                                    if (multimediaPlayerReady) {
                                        multimediaPlayer.seekTo(startingTime, true);
                                    }
                                }, 600);
                            }
                            const savedVol = localStorage.getItem('player_volume');
                            if (savedVol !== null) {
                                multimediaPlayer.setVolume(parseInt(savedVol));
                                document.getElementById('playerVolumeSlider').value = savedVol;
                                updateVolumeIcon(parseInt(savedVol));
                            }
                            // Carrega progresso para o vídeo atual
                            const savedTime = loadProgress(videoId);
                            if (savedTime > 5) {
                                multimediaPlayer.seekTo(savedTime, true);
                            }
                            startProgressSaving();
                            updatePlayerControlTranslations();
                            const titleEl = document.getElementById('playerTitle');
                            if (titleEl) titleEl.textContent = currentTitle;
                            setTimeout(() => {
                                if (multimediaPlayerReady && multimediaPlayer.getPlayerState() !== YT.PlayerState.PLAYING) {
                                    multimediaPlayer.playVideo();
                                }
                            }, 300);
                            if (subtitlesEnabled) {
                                showCaptionsOverlay();
                            }
                            startProgressUpdates();
                        },
                        onStateChange: (event) => {
                            const btn = document.getElementById('playerPlayPause');
                            if (event.data === YT.PlayerState.PLAYING) {
                                btn.dataset.playing = 'true';
                                btn.innerHTML = `<i class="fas fa-pause"></i> ${t('pause')}`;
                            } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
                                btn.dataset.playing = 'false';
                                btn.innerHTML = `<i class="fas fa-play"></i> ${t('play')}`;
                                if (event.data === YT.PlayerState.ENDED) {
                                    saveProgress();
                                }
                            }
                            updatePlayerControlTranslations();
                            updateProgressBar();
                        },
                        onError: (e) => {
                            console.error('[Player] Erro no player:', e);
                            showToast('Erro ao carregar o conteúdo. Tente novamente.', 'error');
                            if (videoId && confirm('Deseja abrir no YouTube?')) {
                                window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
                            }
                        }
                    }
                });
            } catch (err) {
                console.error('[Player] Falha ao criar player:', err);
                showToast('Erro ao criar player. Tente novamente.', 'error');
                const parent = container.querySelector('.player-video-wrapper');
                if (parent) {
                    parent.innerHTML = `
                        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                                allowfullscreen allow="autoplay; encrypted-media" 
                                style="width:100%;height:100%;border:0;">
                        </iframe>
                    `;
                }
            }
        }
    }

    let progressUpdateInterval = null;

    function startProgressUpdates() {
        if (progressUpdateInterval) clearInterval(progressUpdateInterval);
        progressUpdateInterval = setInterval(updateProgressBar, 500);
    }

    function updateProgressBar() {
        if (!multimediaPlayer || !multimediaPlayerReady) return;
        const progressBar = document.getElementById('playerProgressBar');
        const currentTimeEl = document.getElementById('playerCurrentTime');
        const durationEl = document.getElementById('playerDuration');
        if (!progressBar || !currentTimeEl || !durationEl) return;

        const current = multimediaPlayer.getCurrentTime() || 0;
        const duration = multimediaPlayer.getDuration() || 0;
        if (duration) {
            const percent = (current / duration) * 100;
            progressBar.value = percent;
            currentTimeEl.textContent = formatTime(current);
            durationEl.textContent = formatTime(duration);
        }
    }

    function formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function closeMultimediaPlayer() {
        // Salva o progresso final antes de fechar
        if (currentVideoId) {
            saveProgress();
        }
        const container = document.getElementById('multimediaPlayerContainer');
        if (container) container.style.display = 'none';
        if (multimediaPlayer) {
            try {
                multimediaPlayer.pauseVideo();
                multimediaPlayer.stopVideo();
                multimediaPlayer.clearVideo();
            } catch (e) {}
        }
        multimediaPlayerReady = false;
        isPlayerVisible = false;
        if (progressSaveInterval) {
            clearInterval(progressSaveInterval);
            progressSaveInterval = null;
        }
        if (progressUpdateInterval) {
            clearInterval(progressUpdateInterval);
            progressUpdateInterval = null;
        }
        if (captionInterval) {
            clearInterval(captionInterval);
            captionInterval = null;
        }
        // Não chama saveProgress novamente (já foi chamado)
        const playerDiv = document.getElementById('multimediaYouTubePlayer');
        if (playerDiv && playerDiv.parentElement) {
            if (playerDiv.tagName !== 'DIV') {
                const parent = playerDiv.parentElement;
                const newDiv = document.createElement('div');
                newDiv.id = 'multimediaYouTubePlayer';
                parent.innerHTML = '';
                parent.appendChild(newDiv);
            }
        }
        hideCaptionsOverlay();
        currentVideoId = null;
        currentParts = [];
        currentPartIndex = 0;
        const partsContainer = document.getElementById('playerPartsContainer');
        if (partsContainer) {
            partsContainer.style.display = 'none';
            partsContainer.innerHTML = '';
        }
    }

    // ========== RENDERIZAR AUDIOBOOKS ==========
    function renderAudiobooks(audiobooks) {
        const container = document.getElementById('audiobooksGrid');
        if (!container) return;

        if (!audiobooks || audiobooks.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-headphones"></i><p>${t('no_audiobooks')}</p></div>`;
            return;
        }

        let html = '';
        audiobooks.forEach(book => {
            const cover = book.cover || 'https://placehold.co/240x360/1F2933/FBBF24?text=Capa+do+livro';
            const duration = book.duration || '';
            const year = book.year || '';
            const partsCount = book.parts ? book.parts.length : 1;
            const firstVideoId = book.videoId || (book.parts && book.parts[0] && book.parts[0].videoId) || '';

            html += `
                <div class="audiobook-card" data-audiobook-id="${book.id}" data-title="${escapeHtml(book.title)}" data-description="${escapeHtml(book.description)}" data-video-id="${firstVideoId}">
                    <img class="audiobook-cover" src="${escapeHtml(cover)}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.src='https://placehold.co/240x360/1F2933/FBBF24?text=Capa+do+livro'">
                    <div class="audiobook-info">
                        <div class="audiobook-title">${escapeHtml(book.title)}</div>
                        <div class="audiobook-author"><i class="fas fa-user"></i> ${escapeHtml(book.author)}</div>
                        ${duration ? `<div class="audiobook-duration"><i class="fas fa-clock"></i> ${duration}</div>` : ''}
                        ${year ? `<div class="audiobook-year">${year}</div>` : ''}
                        ${partsCount > 1 ? `<div class="audiobook-parts"><i class="fas fa-layer-group"></i> ${partsCount} ${t('parts')}</div>` : ''}
                        <div class="audiobook-description">${escapeHtml(book.description)}</div>
                        <button class="listen-btn" data-audiobook-id="${book.id}" data-title="${escapeHtml(book.title)}" data-description="${escapeHtml(book.description)}" data-video-id="${firstVideoId}" data-parts='${JSON.stringify(book.parts || [])}'>
                            <i class="fas fa-play"></i> ${t('listen_button')}
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        renderContinueListeningSection(audiobooks);

        container.querySelectorAll('.audiobook-card').forEach(card => {
            const btn = card.querySelector('.listen-btn');
            card.addEventListener('click', function(e) {
                if (e.target.closest('.listen-btn')) return;
                if (btn) btn.click();
            });
        });

        container.querySelectorAll('.listen-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const videoId = this.dataset.videoId || this.closest('.audiobook-card')?.dataset.videoId || '';
                const title = this.dataset.title;
                const description = this.dataset.description;
                let parts = [];
                try {
                    parts = JSON.parse(this.dataset.parts) || [];
                } catch (e) {}
                if (!parts.length && videoId) {
                    parts = [{ type: 'audio', url: `https://www.youtube.com/watch?v=${videoId}`, title: 'Parte 1', videoId }];
                }
                const meta = {
                    id: this.dataset.audiobookId,
                    title,
                    description,
                    cover: this.closest('.audiobook-card')?.querySelector('.audiobook-cover')?.src || '',
                    videoId
                };
                playMultimedia(videoId || (parts.length ? parts[0].videoId : null), title, description, parts, meta, loadProgress(videoId || (parts.length ? parts[0].videoId : '')));
            });
        });
    }

    async function loadAudiobooksTab() {
        const container = document.getElementById('audiobooksTabContent');
        if (!container) return;

        container.innerHTML = `<div class="loading-skeleton"><div class="spinner"></div><p>${t('loading')}</p></div>`;

        const audiobooks = await loadAudiobooks();

        if (!audiobooks || audiobooks.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-headphones"></i><p>${t('no_audiobooks')}</p></div>`;
            return;
        }

        container.innerHTML = `
            <div class="search-bar">
                <input type="text" id="audiobookSearchInput" placeholder="${t('search_audiobooks_placeholder')}">
            </div>
            <div id="continueListeningSection" class="continue-listening-section" style="display:none;"></div>
            <div id="audiobooksGrid" class="audiobooks-grid"></div>
        `;

        renderAudiobooks(audiobooks);

        const searchInput = document.getElementById('audiobookSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function() {
                const term = this.value.trim().toLowerCase();
                const filtered = audiobooks.filter(book =>
                    book.title.toLowerCase().includes(term) ||
                    (book.author && book.author.toLowerCase().includes(term))
                );
                renderAudiobooks(filtered);
            }, 300));
        }

        applyAllTranslations();
        ensureAudiobookPlayerContainer();
    }

    // ========== ABAS E FILTROS ==========
    function setupTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                if (tabId === activeTab) return;
                activeTab = tabId;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                performSearchWithFilters(currentSearchTerm);
            });
        });
    }

    function setupMainTabs() {
        const mainTabs = document.querySelectorAll('.main-tab-btn');
        const libraryContent = document.getElementById('libraryTabContent');
        const audiobooksContent = document.getElementById('audiobooksTabContent');
        const recommendedContent = document.getElementById('recommendedTabContent');

        mainTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.mainTab;
                if (tabId === activeMainTab) return;
                activeMainTab = tabId;
                mainTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                libraryContent.classList.remove('active');
                audiobooksContent.classList.remove('active');
                recommendedContent.classList.remove('active');

                if (tabId === 'library') {
                    libraryContent.classList.add('active');
                    performSearchWithFilters(currentSearchTerm);
                } else if (tabId === 'audiobooks') {
                    audiobooksContent.classList.add('active');
                    loadAudiobooksTab();
                } else if (tabId === 'recommended') {
                    recommendedContent.classList.add('active');
                    if (externalLibrariesData.length === 0) loadExternalLibraries();
                    else renderExternalLibraries();
                }
            });
        });
    }

    // ========== PERFIL ==========
    function initProfile() {
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                if (window.openProfileModal) {
                    window.openProfileModal();
                } else {
                    const modal = document.getElementById('profileModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        if (window.updateProfileModal) window.updateProfileModal();
                    }
                }
            });
        }
    }

    // ========== TOAST ==========
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
            background: var(--bg-card); backdrop-filter: blur(12px);
            padding: 12px 24px; border-radius: 16px;
            border: 1px solid var(--border);
            box-shadow: var(--modal-shadow);
            color: var(--text-primary);
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
        }, 3000);
    }

    // ========== INICIALIZAÇÃO ==========
    async function init() {
        grid = document.getElementById('booksGrid');
        searchInput = document.getElementById('searchInput');
        modal = document.getElementById('bookModal');
        modalBody = document.getElementById('modalBody');
        closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

        ensureAudiobookPlayerContainer();

        const savedLang = localStorage.getItem('selectedLanguage');
        let initialLang = savedLang;
        if (!initialLang) {
            const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
            initialLang = browserLang.startsWith('pt') ? 'pt-br' : 'en';
        }
        currentLang = initialLang;
        await loadTranslations(currentLang);
        applyAllTranslations();
        updateLanguageSelector(currentLang);

        const langPtBtn = document.getElementById('langPtBtn');
        const langEnBtn = document.getElementById('langEnBtn');
        if (langPtBtn) langPtBtn.addEventListener('click', async () => {
            await loadTranslations('pt-br');
            currentLang = 'pt-br';
            localStorage.setItem('selectedLanguage', 'pt-br');
            applyAllTranslations();
            updateLanguageSelector('pt-br');
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: 'pt-br' } }));
            if (activeMainTab === 'library') performSearchWithFilters(currentSearchTerm);
            else if (activeMainTab === 'recommended' && externalLibrariesData.length > 0) renderExternalLibraries();
            else if (activeMainTab === 'audiobooks') loadAudiobooksTab();
            langPtBtn.classList.add('active');
            langEnBtn.classList.remove('active');
        });
        if (langEnBtn) langEnBtn.addEventListener('click', async () => {
            await loadTranslations('en');
            currentLang = 'en';
            localStorage.setItem('selectedLanguage', 'en');
            applyAllTranslations();
            updateLanguageSelector('en');
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: 'en' } }));
            if (activeMainTab === 'library') performSearchWithFilters(currentSearchTerm);
            else if (activeMainTab === 'recommended' && externalLibrariesData.length > 0) renderExternalLibraries();
            else if (activeMainTab === 'audiobooks') loadAudiobooksTab();
            langEnBtn.classList.add('active');
            langPtBtn.classList.remove('active');
        });

        setupMainTabs();
        setupTabs();
        await loadExternalLibraries();

        localBooksCache = await loadLocalBooks();

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value;
                debouncedPerformSearch(currentSearchTerm);
            });
        }

        initProfile();

        if (activeMainTab === 'library') {
            await performSearchWithFilters('');
        }
    }

    // ========== REAGIR A MUDANÇAS DE IDIOMA ==========
    window.addEventListener('languageChanged', function(e) {
        const lang = e.detail.lang || currentLang;
        currentLang = lang;
        console.log(`[Biblioteca] Idioma alterado para: ${lang}, recarregando traduções...`);

        loadTranslations(lang).then(() => {
            applyAllTranslations();
            updateLanguageSelector(lang);

            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn && profileBtn.getAttribute('data-profile-custom') !== 'true') {
                profileBtn.innerHTML = `<i class="fas fa-user"></i> ${t('profile')}`;
            }
            updateReadButtonTranslation();

            if (activeMainTab === 'recommended' && externalLibrariesData.length > 0) {
                renderExternalLibraries();
            }

            if (modal && modal.style.display === 'flex' && modal._currentItem) {
                setTimeout(() => {
                    showModal(modal._currentItem);
                }, 50);
            }

            if (activeMainTab === 'library') {
                performSearchWithFilters(currentSearchTerm);
            } else if (activeMainTab === 'audiobooks') {
                loadAudiobooksTab();
            }
        });
    });

    init();
});