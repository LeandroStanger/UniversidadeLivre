// audiobook.js – Módulo de Audiobooks (alerta removido, fallback silencioso, i18n completo)
const AudiobookModule = (function() {
    'use strict';

    // ========== CONFIGURAÇÕES ==========
    const MAX_AUDIO_PLAYERS = 1;
    const AUDIO_EXTENSIONS = [
        '.mp3', '.m4a', '.m4b', '.ogg', '.oga', '.wav', '.wave',
        '.flac', '.aac', '.opus', '.webm', '.weba', '.caf', '.aiff', '.aif',
        '.wma', '.mid', '.midi', '.mpa', '.mp2', '.mka', '.ac3', '.dts'
    ];
    const STREAMING_FORMATS = ['.m3u8', '.m3u', '.pls', '.xspf'];
    const CORS_PROXIES = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://proxy.cors.sh/'
    ];
    const API_CACHE_TTL = 10 * 60 * 1000;
    const MIN_SEARCH_LENGTH = 2;
    const MAX_EXTERNAL_RESULTS = 20;
    const DEBOUNCE_DELAY = 400;

    // Configurações do LibreTranslate (opcional)
    const LIBRETRANSLATE_API_KEY = '';
    const LIBRETRANSLATE_URL = 'https://libretranslate.com';

    // Chave do Google Books (opcional)
    const GOOGLE_BOOKS_API_KEY = 'YOUR_GOOGLE_BOOKS_API_KEY';

    let apiCache = new Map();
    let metadataCache = new Map();
    let currentLanguageFilter = 'all';
    let currentResults = [];
    let searchTimeout = null;
    let progressUpdateCallback = null;

    // Função de tradução (será definida via setTranslator)
    let _t = function(key, fallback = '') { return fallback || key; };

    // ========== FUNÇÕES AUXILIARES ==========
    function normalizeText(text) {
        if (!text || typeof text !== 'string') return '';
        return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    }
    function escapeHtml(str) { return str ? String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])) : ''; }
    
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    
    function formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}min`;
        return `${m} min`;
    }
    
    function formatAuthor(authorString) {
        if (!authorString) return _t('unknown_author');
        let authorStr = Array.isArray(authorString) ? authorString.join(', ') : String(authorString);
        let authors = authorStr.split(/[,&eE]+\s*/).filter(a => a.trim());
        if (authors.length === 0) return authorStr;
        return authors.length <= 3 ? authorStr : authors.slice(0, 3).join(', ') + '...';
    }

    function getLanguageName(langCode) {
        const key = `lang_${langCode}`;
        return _t(key, langCode?.toUpperCase() || 'Desconhecido');
    }

    // ========== MAPEAMENTO DE CÓDIGOS DE IDIOMA ==========
    function normalizeLanguageCode(code) {
        if (!code) return null;
        const lower = String(code).toLowerCase().trim();
        const map = {
            'por': 'pt', 'pt': 'pt', 'pt-br': 'pt', 'pt_br': 'pt', 'portuguese': 'pt',
            'eng': 'en', 'en': 'en', 'english': 'en',
            'spa': 'es', 'es': 'es', 'spanish': 'es',
            'fra': 'fr', 'fre': 'fr', 'fr': 'fr', 'french': 'fr',
            'deu': 'de', 'ger': 'de', 'de': 'de', 'german': 'de',
            'ita': 'it', 'it': 'it', 'italian': 'it',
            'jpn': 'ja', 'ja': 'ja', 'japanese': 'ja',
            'zho': 'zh', 'chi': 'zh', 'zh': 'zh', 'chinese': 'zh',
            'kor': 'ko', 'ko': 'ko', 'korean': 'ko',
            'rus': 'ru', 'ru': 'ru', 'russian': 'ru',
            'ara': 'ar', 'ar': 'ar', 'arabic': 'ar',
            'hin': 'hi', 'hi': 'hi', 'hindi': 'hi',
            'nld': 'nl', 'dut': 'nl', 'nl': 'nl', 'dutch': 'nl',
            'swe': 'sv', 'sv': 'sv', 'swedish': 'sv',
            'pol': 'pl', 'pl': 'pl', 'polish': 'pl',
            'tur': 'tr', 'tr': 'tr', 'turkish': 'tr'
        };
        if (map[lower]) return map[lower];
        const prefix = lower.substring(0,2);
        if (map[prefix]) return map[prefix];
        for (const [key, val] of Object.entries(map)) {
            if (key.includes(lower) || lower.includes(key)) return val;
        }
        return null;
    }

    // ========== CACHE DE CAPAS ==========
    function cacheAudiobookCover(url, imageUrl) {
        if (!url || !imageUrl) return;
        try { localStorage.setItem(`audiobook_cover_${normalizeText(url)}`, imageUrl); } catch (e) {}
    }
    function getCachedAudiobookCover(url) {
        try { return localStorage.getItem(`audiobook_cover_${normalizeText(url)}`); } catch (e) { return null; }
    }

    // ========== NOTIFICAÇÃO DE PROGRESSO ==========
    function setProgressUpdateCallback(cb) {
        progressUpdateCallback = cb;
    }
    function notifyProgressUpdate() {
        if (typeof progressUpdateCallback === 'function') progressUpdateCallback();
    }

    // ========== UTILITÁRIOS DE REDE ==========
    async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 15000);
                const response = await fetch(url, { ...options, signal: controller.signal }); clearTimeout(timeoutId);
                if (response.status === 429) { const delay = baseDelay * Math.pow(2, i); await new Promise(r => setTimeout(r, delay)); continue; }
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response;
            } catch (error) { if (i === maxRetries) throw error; const delay = baseDelay * Math.pow(2, i); await new Promise(r => setTimeout(r, delay)); }
        }
        throw new Error(`Falha após ${maxRetries} tentativas`);
    }

    async function fetchWithProxy(url, timeout = 15000, retries = 2) {
        try { const response = await fetchWithRetry(url, {}, retries, 1000); if (response.ok) return response; } catch (e) {}
        for (let i = 0; i < retries; i++) {
            for (const proxy of CORS_PROXIES) {
                try { const proxyUrl = proxy + encodeURIComponent(url); const response = await fetchWithRetry(proxyUrl, {}, 1, 1000); if (response.ok) return response; } catch (e) {}
            }
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
        throw new Error(`Falha ao acessar ${url}`);
    }

    // ========== DETECÇÃO DE IDIOMA VIA LIBRETRANSLATE ==========
    async function detectLanguageViaLibreTranslate(text) {
        if (!text || text.length < 10) return null;
        const cacheKey = `libre_${normalizeText(text)}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < 7*24*60*60*1000) {
            return metadataCache.get(cacheKey).data;
        }
        try {
            const url = `${LIBRETRANSLATE_URL}/detect`;
            const body = new URLSearchParams({ q: text.substring(0, 500), api_key: LIBRETRANSLATE_API_KEY });
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString()
            });
            if (!response.ok) return null;
            const data = await response.json();
            let detected = null;
            if (Array.isArray(data) && data.length > 0) detected = data[0].language;
            else if (data.language) detected = data.language;
            if (detected) {
                const normalized = normalizeLanguageCode(detected);
                if (normalized) {
                    metadataCache.set(cacheKey, { data: normalized, timestamp: Date.now() });
                    return normalized;
                }
            }
            return null;
        } catch (e) { return null; }
    }

    // ========== DETECÇÃO DE IDIOMA LOCAL ==========
    const languageStopwords = {
        pt: ['de', 'que', 'e', 'para', 'com', 'uma', 'por', 'mais', 'como', 'sua', 'este', 'esta', 'você', 'também', 'sobre', 'pode', 'anos', 'entre', 'ser', 'muito', 'casa', 'trabalho', 'vida', 'tempo', 'pessoas', 'país', 'mundo', 'brasil', 'português', 'porque', 'está', 'estão', 'são', 'foram', 'era', 'tinha', 'eles', 'nós', 'ter', 'fazer', 'dizer', 'dar', 'ir', 'ver', 'estar', 'haver', 'poder', 'dever', 'querer', 'não', 'então', 'bem', 'mal', 'hoje', 'amanhã', 'ontem'],
        en: ['the', 'and', 'for', 'with', 'you', 'this', 'are', 'have', 'from', 'they', 'know', 'your', 'can', 'more', 'about', 'just', 'like', 'people', 'time', 'year', 'good', 'work', 'life', 'world', 'english', 'will', 'was', 'were', 'been', 'has', 'had', 'their', 'them', 'would', 'could', 'should', 'make', 'get', 'see', 'use'],
        es: ['el', 'la', 'de', 'y', 'que', 'en', 'por', 'con', 'para', 'como', 'su', 'sobre', 'este', 'esta', 'usted', 'años', 'vida', 'trabajo', 'personas', 'español', 'los', 'las', 'se', 'ha', 'han', 'está', 'están', 'era', 'eran', 'muy', 'bien', 'gracias', 'hola', 'ser', 'tener', 'hacer', 'decir', 'ir', 'ver', 'dar'],
        fr: ['le', 'la', 'de', 'et', 'que', 'en', 'pour', 'par', 'avec', 'comme', 'sur', 'ce', 'cette', 'vous', 'plus', 'années', 'vie', 'travail', 'personnes', 'français', 'sont', 'était', 'étaient', 'avoir', 'être', 'ils', 'elles', 'faire', 'dire', 'aller', 'voir', 'prendre'],
        de: ['der', 'die', 'und', 'für', 'mit', 'von', 'sich', 'auf', 'nach', 'als', 'über', 'diese', 'dieser', 'sie', 'mehr', 'jahre', 'leben', 'arbeit', 'menschen', 'deutsch', 'ist', 'sind', 'war', 'waren', 'wurde', 'wurden', 'sein', 'haben', 'werden', 'können', 'müssen', 'sollen'],
        it: ['il', 'la', 'di', 'e', 'che', 'per', 'con', 'come', 'su', 'questo', 'questa', 'lei', 'più', 'anni', 'vita', 'lavoro', 'persone', 'italiano', 'sono', 'era', 'erano', 'stato', 'stata', 'essere', 'avere', 'fare', 'dire', 'andare', 'vedere', 'dare'],
        ja: ['です', 'ます', 'た', 'ない', 'れる', 'よう', 'から', 'まで', 'て', 'が', 'を', 'に', 'の', 'は', '日本語', 'これ', 'それ', 'あれ'],
        zh: ['的', '了', '是', '我', '不', '在', '人', '有', '他', '这', '中', '大', '来', '上', '国', '为', '子', '你', '说', '中文', '也', '个', '们', '到', '去', '看', '好'],
        ko: ['은', '는', '이', '가', '을', '를', '에', '에서', '으로', '로', '한국어', '그', '저', '이것', '저것', '사람', '년', '일', '하다', '있다', '않다', '없다', '그리고', '또한'],
        ru: ['и', 'в', 'не', 'на', 'я', 'что', 'с', 'по', 'а', 'он', 'как', 'его', 'но', 'из', 'они', 'за', 'русский', 'год', 'жизнь', 'это', 'было', 'были', 'быть', 'сказать', 'мочь', 'хотеть', 'знать', 'думать'],
        ar: ['في', 'من', 'أن', 'على', 'هذا', 'هذه', 'الذي', 'التي', 'عن', 'مع', 'بعد', 'قبل', 'عند', 'خلال', 'العربية', 'كان', 'كانت', 'يكون', 'لي', 'لك', 'له', 'لها'],
        hi: ['है', 'हैं', 'और', 'के', 'में', 'से', 'पर', 'यह', 'वह', 'इस', 'उस', 'हिंदी', 'कर', 'करना', 'होना', 'जाना', 'देना', 'लेना'],
        nl: ['de', 'het', 'een', 'van', 'in', 'op', 'voor', 'met', 'dat', 'dit', 'deze', 'nederlands', 'zijn', 'hebben', 'worden', 'kunnen', 'moeten', 'zullen'],
        sv: ['och', 'att', 'det', 'som', 'en', 'på', 'för', 'med', 'av', 'den', 'detta', 'svenska', 'vara', 'ha', 'kunna', 'skola', 'vilja'],
        pl: ['i', 'w', 'na', 'z', 'do', 'po', 'przez', 'dla', 'ten', 'ta', 'to', 'polski', 'być', 'mieć', 'móc', 'chcieć'],
        tr: ['ve', 'bir', 'bu', 'şu', 'o', 'için', 'ile', 'gibi', 'kadar', 'sonra', 'türkçe', 'olmak', 'etmek', 'yapmak', 'gelmek', 'gitmek']
    };

    function detectLanguageLocal(title, description = '') {
        const fullText = normalizeText(title + ' ' + description);
        if (/[\u4E00-\u9FFF]/.test(fullText)) return 'zh';
        if (/[\u3040-\u309F\u30A0-\u30FF]/.test(fullText)) return 'ja';
        if (/[\uAC00-\uD7AF]/.test(fullText)) return 'ko';
        if (/[\u0600-\u06FF]/.test(fullText)) return 'ar';
        if (/[\u0900-\u097F]/.test(fullText)) return 'hi';
        if (/[\u0400-\u04FF]/.test(fullText)) return 'ru';
        if (/[çãõáéíóúâêôà]/.test(fullText)) return 'pt';
        let scores = {};
        for (let lang in languageStopwords) scores[lang] = 0;
        for (const [lang, words] of Object.entries(languageStopwords)) {
            for (const w of words) {
                if (new RegExp(`\\b${w}\\b`, 'i').test(fullText)) scores[lang] += 1;
            }
        }
        if (/\b(ção|ções|mente|dade)\b/i.test(fullText)) scores.pt = (scores.pt||0) + 5;
        if (/\b(ción|dad|mente)\b/i.test(fullText)) scores.es = (scores.es||0) + 4;
        if (/\b(ment|tion|sion)\b/i.test(fullText)) scores.en = (scores.en||0) + 2;
        if (/\b(eur|euse|ment|able)\b/i.test(fullText)) scores.fr = (scores.fr||0) + 3;
        if (/\b(keit|heit|ung|schaft)\b/i.test(fullText)) scores.de = (scores.de||0) + 3;
        if (/\b(zione|mento|ità)\b/i.test(fullText)) scores.it = (scores.it||0) + 3;
        let best = 'en', max = 0;
        for (const [l, s] of Object.entries(scores)) if (s > max) { max = s; best = l; }
        return max < 2 ? 'en' : best;
    }

    async function determineLanguage(apiLanguage, title, description) {
        if (apiLanguage) {
            const normalized = normalizeLanguageCode(apiLanguage);
            if (normalized) return normalized;
        }
        const localGuess = detectLanguageLocal(title, description);
        if (LIBRETRANSLATE_URL && (title || description)) {
            try {
                const text = (title + ' ' + description).trim();
                const libreGuess = await detectLanguageViaLibreTranslate(text);
                if (libreGuess) return libreGuess;
            } catch (e) {}
        }
        return localGuess;
    }

    // ========== ENRIQUECIMENTO DE METADADOS (CAPAS) ==========
    async function fetchOpenLibraryMetadata(title, author) {
        if (!title) return null;
        const cacheKey = `ol_meta_${normalizeText(title)}_${normalizeText(author || '')}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < 24*60*60*1000) return metadataCache.get(cacheKey).data;
        try {
            let query = `title:${encodeURIComponent(title)}`;
            if (author) query += `&author:${encodeURIComponent(author)}`;
            const url = `https://openlibrary.org/search.json?q=${query}&limit=1`;
            const response = await fetchWithProxy(url, 10000);
            if (!response.ok) return null;
            const data = await response.json();
            if (!data.docs || data.docs.length === 0) return null;
            const doc = data.docs[0];
            const coverId = doc.cover_i;
            const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
            const result = { cover: coverUrl, description: doc.first_sentence?.[0] || doc.subtitle || '', year: doc.first_publish_year || doc.publish_year?.[0] || null, publisher: doc.publisher?.[0] || null };
            metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;
        } catch (error) { return null; }
    }

    async function fetchGoogleBooksMetadata(title, author) {
        if (!title) return null;
        const cacheKey = `gb_meta_${normalizeText(title)}_${normalizeText(author || '')}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < 24*60*60*1000) return metadataCache.get(cacheKey).data;
        try {
            let query = `intitle:${encodeURIComponent(title)}`;
            if (author) query += `+inauthor:${encodeURIComponent(author)}`;
            let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
            if (GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY !== 'YOUR_GOOGLE_BOOKS_API_KEY') url += `&key=${GOOGLE_BOOKS_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (!data.items || data.items.length === 0) return null;
            const volume = data.items[0].volumeInfo;
            const imageLinks = volume.imageLinks || {};
            const cover = imageLinks.thumbnail || imageLinks.smallThumbnail || null;
            const result = { cover, description: volume.description || '', year: volume.publishedDate ? volume.publishedDate.substring(0,4) : null, publisher: volume.publisher || null };
            metadataCache.set(cacheKey, { data: result, timestamp: Date.now() });
            return result;
        } catch (error) { return null; }
    }

    async function enrichAudiobookMetadata(book) {
        let enriched = { ...book };
        if (!book.cover || !book.description || !book.year || !book.publisher) {
            let meta = await fetchOpenLibraryMetadata(book.title, book.rawAuthor || book.author);
            if (!meta || !meta.cover) {
                const gbMeta = await fetchGoogleBooksMetadata(book.title, book.rawAuthor || book.author);
                if (gbMeta) meta = { ...meta, ...gbMeta };
            }
            if (meta) {
                if (!enriched.cover && meta.cover) enriched.cover = meta.cover;
                if (!enriched.description && meta.description) enriched.description = meta.description;
                if (!enriched.year && meta.year) enriched.year = meta.year;
                if (!enriched.publisher && meta.publisher) enriched.publisher = meta.publisher;
            }
        }
        return enriched;
    }

    // ========== ENRIQUECIMENTO DE FORMATOS DE ÁUDIO (INTERNET ARCHIVE) ==========
    async function enrichInternetArchiveFormats(item) {
        if (item.source !== 'Internet Archive' || !item.id) return item;
        const identifier = item.id.replace('ia_', '');
        const cacheKey = `ia_formats_${identifier}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            const cached = apiCache.get(cacheKey).data;
            return { ...item, audioUrl: cached.primary, alternateAudioUrls: cached.alternates };
        }
        try {
            const url = `https://archive.org/metadata/${identifier}`;
            const response = await fetchWithProxy(url, 10000);
            const data = await response.json();
            const files = data.files || [];
            const audioFiles = files.filter(f => f.format === 'VBR MP3' || f.format === 'Ogg Vorbis' || f.format === 'MPEG4' || f.name.match(/\.(mp3|ogg|m4a)$/i));
            if (audioFiles.length === 0) return item;
            const mp3 = audioFiles.find(f => f.name.endsWith('.mp3'));
            const ogg = audioFiles.find(f => f.name.endsWith('.ogg'));
            const m4a = audioFiles.find(f => f.name.endsWith('.m4a'));
            const primary = mp3 || ogg || m4a || audioFiles[0];
            const alternates = audioFiles.filter(f => f.name !== primary.name).map(f => `https://archive.org/download/${identifier}/${f.name}`);
            const primaryUrl = `https://archive.org/download/${identifier}/${primary.name}`;
            const result = { primary: primaryUrl, alternates };
            apiCache.set(cacheKey, { data: result, timestamp: Date.now() });
            return { ...item, audioUrl: primaryUrl, alternateAudioUrls: alternates };
        } catch (e) {
            return item;
        }
    }

    // ========== FILTRO DE PRÉVIAS ==========
    function filterPreviewOnly(books) { return books.filter(book => !book.isPreview); }

    // ========== APIS DE AUDIOBOOKS ==========
    async function searchLibrivox(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `librivox_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = `https://librivox.org/api/feed/audiobooks?search=${encodeURIComponent(query)}&format=json&extended=1`;
            const response = await fetchWithProxy(url, 15000);
            const data = await response.json();
            const results = await Promise.all((data.books || []).slice(0, MAX_EXTERNAL_RESULTS).map(async book => {
                const authors = book.authors?.map(a => a.first_name + ' ' + a.last_name).join(', ') || _t('unknown_author');
                const apiLang = book.language || null;
                const language = await determineLanguage(apiLang, book.title, book.description || '');
                const extras = [];
                if (book.url_text_source) extras.push({ title: _t('full_text'), url: book.url_text_source, type: 'text' });
                let audioUrl = book.url_rss || book.url_zip_file;
                return { id: `librivox_${book.id}`, title: book.title, author: formatAuthor(authors), rawAuthor: authors, description: book.description || '', cover: book.url_image || null, audioUrl, duration: book.totaltimesecs || null, language, publisher: 'LibriVox', source: 'LibriVox', type: 'audiobook', extras, isPreview: false, year: null };
            }));
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            console.log(`[LibriVox] ${results.length} resultados`);
            return results;
        } catch (error) { console.warn('[LibriVox] Erro:', error); return []; }
    }

    async function searchInternetArchiveAudio(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `ia_audio_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:audio&fl[]=title&fl[]=creator&fl[]=year&fl[]=description&fl[]=identifier&fl[]=language&fl[]=publisher&rows=${MAX_EXTERNAL_RESULTS}&output=json`;
            const response = await fetchWithProxy(url);
            const data = await response.json();
            const docs = data.response?.docs || [];
            const results = await Promise.all(docs.map(async doc => {
                let creator = doc.creator;
                if (Array.isArray(creator)) creator = creator.join(', ');
                else if (creator && typeof creator === 'object') creator = JSON.stringify(creator);
                else creator = creator || _t('unknown_author');
                let apiLang = null;
                if (doc.language && doc.language.length > 0) apiLang = doc.language[0];
                const language = await determineLanguage(apiLang, doc.title, doc.description || '');
                const extras = [];
                if (doc.identifier) extras.push({ title: _t('page_on_archive'), url: `https://archive.org/details/${doc.identifier}`, type: 'page' });
                const baseItem = { id: `ia_${doc.identifier}`, title: doc.title || _t('untitled'), author: formatAuthor(creator), rawAuthor: creator, description: doc.description || '', cover: `https://archive.org/services/img/${doc.identifier}`, audioUrl: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`, duration: null, language, publisher: doc.publisher?.[0] || 'Internet Archive', source: 'Internet Archive', type: 'audiobook', extras, isPreview: false, year: doc.year ? parseInt(doc.year) : null };
                return await enrichInternetArchiveFormats(baseItem);
            }));
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            console.log(`[Internet Archive] ${results.length} resultados`);
            return results;
        } catch (error) { console.warn('[Internet Archive] Erro:', error); return []; }
    }

    async function searchSpotifyAudiobooks(query) { return []; }
    async function searchTokybook(query) { return []; }
    async function searchAudible(query) { return []; }

    async function searchAudiobooks(query) {
        const promises = [searchLibrivox(query), searchInternetArchiveAudio(query), searchSpotifyAudiobooks(query), searchTokybook(query), searchAudible(query)];
        const results = await Promise.allSettled(promises);
        let all = [];
        for (const res of results) if (res.status === 'fulfilled' && Array.isArray(res.value)) all.push(...res.value);
        all = filterPreviewOnly(all);
        const normalizedQuery = normalizeText(query);
        const scored = all.map(book => {
            let score = 0;
            const title = normalizeText(book.title);
            if (title === normalizedQuery) score += 100;
            else if (title.includes(normalizedQuery)) score += 50;
            if (normalizeText(book.author).includes(normalizedQuery)) score += 30;
            return { book, score };
        });
        scored.sort((a, b) => b.score - a.score);
        let sorted = scored.map(item => item.book);
        const enriched = await Promise.all(sorted.map(async book => await enrichAudiobookMetadata(book)));
        const seen = new Set();
        const unique = enriched.filter(book => { const key = `${normalizeText(book.title)}|${normalizeText(book.author)}`; if (seen.has(key)) return false; seen.add(key); return true; });
        console.log(`[Audiobook] Total de ${unique.length} resultados (apenas completos)`);
        return unique.sort((a, b) => {
            const langOrder = { 'pt':1, 'en':2, 'es':3, 'fr':4, 'de':5, 'it':6, 'ja':7, 'zh':8, 'ko':9, 'ru':10, 'ar':11, 'hi':12, 'nl':13, 'sv':14, 'pl':15, 'tr':16 };
            return (langOrder[a.language]||99) - (langOrder[b.language]||99);
        });
    }

    async function loadRandomAudiobooks() {
        const popularTerms = ['classic', 'history', 'science', 'fiction', 'adventure', 'mystery', 'romance', 'philosophy', 'biography', 'fantasy'];
        const randomTerm = popularTerms[Math.floor(Math.random() * popularTerms.length)];
        const allResults = await searchAudiobooks(randomTerm);
        const shuffled = allResults.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 30);
    }

    // ========== PLAYER COM SUPORTE MÁXIMO E FALLBACK (SEM ALERTA) ==========
    class AudioPlayerManager {
        constructor() {
            this.currentPlayer = null;
            this.container = document.getElementById('multiAudioPlayerContainer');
            this.isClosing = false;
        }

        isPlayableUrl(url) {
            if (!url) return false;
            const lower = url.toLowerCase();
            if (AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext))) return true;
            if (STREAMING_FORMATS.some(ext => lower.endsWith(ext))) return true;
            if (lower.includes('archive.org/download/')) return true;
            if (lower.includes('librivox.org/')) return true;
            return true;
        }

        play(url, metadata) {
            if (this.currentPlayer) this.closeCurrentPlayer();
            if (!this.isPlayableUrl(url)) {
                this.openExternalPage(metadata);
                return;
            }
            this.playWithUrl(url, metadata, 0);
        }

        playWithUrl(url, metadata, attemptIndex) {
            const urls = [url, ...(metadata.alternateAudioUrls || [])];
            if (attemptIndex >= urls.length) {
                this.showErrorMessage(null, _t('audio_unplayable'), metadata);
                return;
            }
            const currentUrl = urls[attemptIndex];
            const card = this.currentPlayer ? this.currentPlayer.element : this.createPlayerCard(currentUrl, metadata);
            if (!this.currentPlayer) {
                this.container.innerHTML = '';
                this.container.appendChild(card);
                this.container.style.display = 'flex';
            }

            const audio = new Audio();
            audio.volume = 0.8;
            const player = { audio, element: card, metadata, updateTimer: null, currentUrl, errorDisplayed: false, attemptIndex };
            this.currentPlayer = player;

            const savedProgress = this.loadProgress(currentUrl);
            if (savedProgress) audio.currentTime = savedProgress;

            audio.addEventListener('play', () => this.updateUI(player));
            audio.addEventListener('pause', () => this.updateUI(player));
            audio.addEventListener('ended', () => { this.updateUI(player); this.saveProgress(currentUrl); });
            audio.addEventListener('timeupdate', () => { if (Math.floor(audio.currentTime) % 5 === 0) this.saveProgress(currentUrl); });
            audio.addEventListener('error', (e) => {
                if (!this.isClosing && !player.errorDisplayed) {
                    player.errorDisplayed = true;
                    const error = audio.error;
                    if (error && (error.code === 4 || error.code === 3)) {
                        this.playWithUrl(url, metadata, attemptIndex + 1);
                    } else {
                        let message = _t('audio_error_generic');
                        if (error && error.code === 2) message = _t('audio_error_network');
                        this.showErrorMessage(player, message, metadata);
                    }
                }
            });

            this.setupPlayerControls(card, player);
            this.startProgressUpdate(player);
            audio.src = currentUrl;
            audio.load();
            audio.play().catch(e => {
                if (!this.isClosing && !player.errorDisplayed) {
                    this.playWithUrl(url, metadata, attemptIndex + 1);
                }
            });
        }

        openExternalPage(metadata) {
            const pageUrl = metadata.extras?.find(e => e.type === 'page')?.url ||
                           (metadata.source === 'LibriVox' ? `https://librivox.org/search?title=${encodeURIComponent(metadata.title)}` : null) ||
                           (metadata.source === 'Internet Archive' ? `https://archive.org/details/${metadata.id.replace('ia_', '')}` : null);
            if (pageUrl) {
                window.open(pageUrl, '_blank');
            }
        }

        createPlayerCard(url, metadata) {
            const card = document.createElement('div');
            card.className = 'audio-player-card';
            card.dataset.url = url;
            const cover = metadata.cover || 'https://placehold.co/50x50/1F2933/9CA3AF?text=Audio';
            const titleFull = metadata.title || _t('untitled');
            const authorFull = metadata.author || _t('unknown_author');
            const titleShort = titleFull.length > 40 ? titleFull.substring(0, 37) + '...' : titleFull;
            const authorShort = authorFull.length > 30 ? authorFull.substring(0, 27) + '...' : authorFull;
            card.innerHTML = `
                <button class="audio-close-btn" title="${_t('close_player')}"><i class="fas fa-times"></i></button>
                <img class="audio-cover" src="${escapeHtml(cover)}" alt="${escapeHtml(titleFull)}">
                <div class="audio-info">
                    <div class="audio-title" title="${escapeHtml(titleFull)}">${escapeHtml(titleShort)}</div>
                    <div class="audio-author" title="${escapeHtml(authorFull)}">${escapeHtml(authorShort)}</div>
                </div>
                <div class="audio-controls">
                    <button class="audio-ctrl-btn play-pause" title="${_t('play_pause')}"><i class="fas fa-play"></i></button>
                    <div class="audio-progress-container">
                        <span class="current-time">00:00</span>
                        <input type="range" class="audio-progress-bar" min="0" max="100" value="0" step="0.1">
                        <span class="duration">00:00</span>
                    </div>
                    <button class="audio-ctrl-btn mute-unmute" title="${_t('mute_unmute')}"><i class="fas fa-volume-up"></i></button>
                    <input type="range" class="audio-volume-slider" min="0" max="100" value="80" title="${_t('volume')}">
                </div>
                <div class="audio-error-message" style="display:none;"></div>
            `;
            return card;
        }

        showErrorMessage(player, message, metadata) {
            const card = player ? player.element : (this.currentPlayer ? this.currentPlayer.element : null);
            if (!card) return;
            const errorDiv = card.querySelector('.audio-error-message');
            if (errorDiv) {
                errorDiv.style.display = 'block';
                errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message} `;
                const pageUrl = metadata.extras?.find(e => e.type === 'page')?.url || 
                               (metadata.source === 'LibriVox' ? `https://librivox.org/search?title=${encodeURIComponent(metadata.title)}` : null) ||
                               (metadata.source === 'Internet Archive' ? `https://archive.org/details/${metadata.id.replace('ia_', '')}` : null);
                if (pageUrl) {
                    const btn = document.createElement('button');
                    btn.className = 'audio-download-link';
                    btn.textContent = _t('open_page');
                    btn.style.marginLeft = '8px';
                    btn.addEventListener('click', (e) => { e.stopPropagation(); window.open(pageUrl, '_blank'); });
                    errorDiv.appendChild(btn);
                }
            }
            const playPauseBtn = card.querySelector('.play-pause');
            if (playPauseBtn) { playPauseBtn.disabled = true; playPauseBtn.style.opacity = '0.5'; playPauseBtn.style.cursor = 'not-allowed'; }
            if (player) player.audio.pause();
        }

        setupPlayerControls(card, player) {
            const audio = player.audio;
            const url = player.currentUrl;
            const playPauseBtn = card.querySelector('.play-pause');
            const progressBar = card.querySelector('.audio-progress-bar');
            const volumeSlider = card.querySelector('.audio-volume-slider');
            const muteBtn = card.querySelector('.mute-unmute');
            const closeBtn = card.querySelector('.audio-close-btn');
            const currentTimeSpan = card.querySelector('.current-time');
            const durationSpan = card.querySelector('.duration');

            playPauseBtn.addEventListener('click', () => { if (audio.paused) audio.play().catch(e=>{}); else audio.pause(); });
            progressBar.addEventListener('input', (e) => audio.currentTime = (e.target.value / 100) * audio.duration);
            volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value / 100; muteBtn.innerHTML = audio.volume === 0 ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>'; });
            muteBtn.addEventListener('click', () => { audio.muted = !audio.muted; muteBtn.innerHTML = audio.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>'; });
            closeBtn.addEventListener('click', () => { this.isClosing = true; this.close(url); });
            audio.addEventListener('loadedmetadata', () => { durationSpan.textContent = formatTime(audio.duration); progressBar.max = audio.duration; });
            const updateProgress = () => { const ct = audio.currentTime; const dur = audio.duration || 0; currentTimeSpan.textContent = formatTime(ct); progressBar.value = ct; if (!isNaN(dur) && dur > 0) progressBar.max = dur; };
            audio.addEventListener('timeupdate', updateProgress);
            player.updateTimer = setInterval(updateProgress, 500);
        }

        updateUI(player) {
            const audio = player.audio;
            const card = player.element;
            const playPauseBtn = card.querySelector('.play-pause');
            if (playPauseBtn && !playPauseBtn.disabled) playPauseBtn.innerHTML = audio.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
        }

        startProgressUpdate(player) {
            if (player.updateTimer) clearInterval(player.updateTimer);
            player.updateTimer = setInterval(() => {
                if (!player.audio.paused && !player.errorDisplayed) {
                    const ct = player.audio.currentTime;
                    const card = player.element;
                    const currentSpan = card.querySelector('.current-time');
                    const progress = card.querySelector('.audio-progress-bar');
                    if (currentSpan) currentSpan.textContent = formatTime(ct);
                    if (progress) progress.value = ct;
                }
            }, 500);
        }

        saveProgress(url) {
            if (this.currentPlayer && this.currentPlayer.currentUrl === url && !this.currentPlayer.errorDisplayed) {
                const player = this.currentPlayer;
                const progress = { url, title: player.metadata.title, author: player.metadata.author, cover: player.metadata.cover, currentTime: player.audio.currentTime, duration: player.audio.duration, lastUpdated: Date.now() };
                localStorage.setItem(`audiobook_progress_${url}`, JSON.stringify(progress));
                notifyProgressUpdate();
            }
        }

        loadProgress(url) {
            try { const saved = localStorage.getItem(`audiobook_progress_${url}`); if (saved) { const data = JSON.parse(saved); return data.currentTime || 0; } } catch (e) {}
            return 0;
        }

        closeCurrentPlayer() {
            if (!this.currentPlayer) return;
            const player = this.currentPlayer;
            const url = player.currentUrl;
            this.isClosing = true;
            player.audio.pause();
            player.audio.src = '';
            if (player.updateTimer) clearInterval(player.updateTimer);
            player.element.remove();
            this.saveProgress(url);
            this.currentPlayer = null;
            this.container.style.display = 'none';
            notifyProgressUpdate();
            this.isClosing = false;
        }

        close(url) { if (this.currentPlayer && this.currentPlayer.currentUrl === url) this.closeCurrentPlayer(); }

        getAllProgress() {
            const progressList = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('audiobook_progress_')) {
                    try { const data = JSON.parse(localStorage.getItem(key)); if (data && data.url) progressList.push(data); } catch (e) {}
                }
            }
            return progressList.sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0)).slice(0, 5);
        }
    }

    const audioManager = new AudioPlayerManager();

    // ========== UI DE CARREGAMENTO ==========
    function showLoading(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = `<div class="loading-skeleton"><div class="spinner"></div><div class="loading-progress-container"><div class="loading-progress-bar"></div></div><p class="loading-text">${_t('audiobook_loading')}</p></div>`;
        const progressBar = container.querySelector('.loading-progress-bar');
        if (progressBar) { let width = 0; const interval = setInterval(() => { if (width >= 90) clearInterval(interval); else width += 10; progressBar.style.width = width + '%'; }, 200); container._loadingInterval = interval; }
    }

    function hideLoading(containerId) {
        const container = document.getElementById(containerId);
        if (container && container._loadingInterval) { clearInterval(container._loadingInterval); delete container._loadingInterval; }
    }

    // ========== RENDERIZAÇÃO ==========
    function buildLanguageChips(languages, containerId, filterContainerId, onFilterChange, tFunc) {
        const container = document.getElementById(containerId);
        const filterContainer = document.getElementById(filterContainerId);
        if (!container || !filterContainer) return;
        if (!languages || languages.length <= 1) { filterContainer.style.display = 'none'; return; }
        filterContainer.style.display = 'flex';
        const uniqueLangs = ['all', ...new Set(languages.map(l => l || 'en'))];
        container.innerHTML = uniqueLangs.map(lang => { const langName = lang === 'all' ? (tFunc ? tFunc('filter_all_languages') : 'Todos') : getLanguageName(lang); return `<div class="chip ${currentLanguageFilter === lang ? 'active' : ''}" data-lang="${lang}"><i class="fas fa-language"></i> ${langName}</div>`; }).join('');
        container.querySelectorAll('.chip').forEach(chip => { chip.addEventListener('click', () => { currentLanguageFilter = chip.dataset.lang; buildLanguageChips(languages, containerId, filterContainerId, onFilterChange, tFunc); onFilterChange(); }); });
    }

    function renderGrid(books, containerId, tFunc) {
        const container = document.getElementById(containerId);
        if (!container) return;
        hideLoading(containerId);
        if (!books || books.length === 0) { container.innerHTML = `<div class="empty-state"><i class="fas fa-headphones"></i> ${tFunc('no_results')}</div>`; return; }
        let html = '';
        books.forEach(book => {
            const cachedCover = getCachedAudiobookCover(book.audioUrl);
            const coverUrl = cachedCover || book.cover || 'https://placehold.co/80x80/1F2933/9CA3AF?text=Audio';
            if (book.cover && !cachedCover) cacheAudiobookCover(book.audioUrl, book.cover);
            const durationFormatted = book.duration ? formatDuration(book.duration) : '';
            const langName = getLanguageName(book.language);
            const description = book.description ? escapeHtml(book.description.substring(0, 200) + '…') : tFunc('no_description');
            const publisher = book.publisher ? escapeHtml(book.publisher) : '';
            const year = book.year ? `<span class="audiobook-year"><i class="fas fa-calendar-alt"></i> ${book.year}</span>` : '';
            let extrasHtml = '';
            if (book.extras && book.extras.length) extrasHtml = `<div class="extras-container"><button class="extras-toggle"><i class="fas fa-paperclip"></i> ${tFunc('extras')} (${book.extras.length})</button><ul class="extras-list" style="display:none;">${book.extras.map(ex => `<li><a href="${escapeHtml(ex.url)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${escapeHtml(ex.title)}</a></li>`).join('')}</ul></div>`;
            html += `
                <div class="audiobook-card">
                    <img class="audiobook-cover" src="${coverUrl}" alt="${escapeHtml(book.title)}" onerror="this.src='https://placehold.co/80x80/1F2933/9CA3AF?text=Audio'">
                    <div class="audiobook-info">
                        <div class="audiobook-title">${escapeHtml(book.title)}</div>
                        <div class="audiobook-author"><i class="fas fa-user"></i> ${escapeHtml(book.author)}</div>
                        ${publisher ? `<div class="audiobook-publisher"><i class="fas fa-building"></i> ${publisher}</div>` : ''}
                        <div class="audiobook-meta">
                            ${durationFormatted ? `<span class="audiobook-duration"><i class="fas fa-clock"></i> ${durationFormatted}</span>` : ''}
                            ${year}
                            <span class="audiobook-language"><i class="fas fa-language"></i> ${langName}</span>
                        </div>
                        <div class="audiobook-description">${description}</div>
                        ${extrasHtml}
                        <button class="listen-btn" data-audio-url="${escapeHtml(book.audioUrl)}" data-title="${escapeHtml(book.title)}" data-author="${escapeHtml(book.author)}" data-cover="${escapeHtml(coverUrl)}"><i class="fas fa-play"></i> ${tFunc('listen_button')}</button>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        container.querySelectorAll('.listen-btn').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); audioManager.play(btn.dataset.audioUrl, { title: btn.dataset.title, author: btn.dataset.author, cover: btn.dataset.cover }); }); });
        container.querySelectorAll('.extras-toggle').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const list = btn.nextElementSibling; if (list) list.style.display = list.style.display === 'none' ? 'block' : 'none'; }); });
    }

    function renderContinueListening(containerId, tFunc) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const progressList = audioManager.getAllProgress();
        if (progressList.length === 0) { const section = container.closest('.continue-listening-section'); if (section) section.style.display = 'none'; return; }
        const section = container.closest('.continue-listening-section'); if (section) section.style.display = 'block';
        container.innerHTML = progressList.map(p => `
            <div class="continue-listening-card" data-url="${escapeHtml(p.url)}">
                <img src="${escapeHtml(p.cover || 'https://placehold.co/50x50/1F2933/9CA3AF?text=Audio')}" class="continue-cover" alt="">
                <div class="continue-info">
                    <div class="continue-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</div>
                    <div class="continue-author" title="${escapeHtml(p.author)}">${escapeHtml(p.author)}</div>
                    <div class="continue-progress"><i class="fas fa-clock"></i> ${formatTime(p.currentTime)} / ${formatTime(p.duration)}</div>
                </div>
                <button class="listen-btn continue-play-btn"><i class="fas fa-play"></i> ${tFunc('continue_listening_btn')}</button>
            </div>
        `).join('');
        container.querySelectorAll('.continue-listening-card').forEach(card => {
            const url = card.dataset.url;
            const progress = progressList.find(p => p.url === url);
            const playBtn = card.querySelector('.continue-play-btn');
            if (playBtn) playBtn.addEventListener('click', (e) => { e.stopPropagation(); if (progress) audioManager.play(url, { title: progress.title, author: progress.author, cover: progress.cover }); });
            card.addEventListener('click', (e) => { if (e.target.closest('.continue-play-btn')) return; if (progress) audioManager.play(url, { title: progress.title, author: progress.author, cover: progress.cover }); });
        });
    }

    // ========== API PÚBLICA ==========
    const publicAPI = {
        // Configuração da função de tradução
        setTranslator: (tFunc) => { _t = tFunc; },
        
        play: (url, metadata) => audioManager.play(url, metadata),
        closePlayer: (url) => audioManager.close(url),
        getProgress: () => audioManager.getAllProgress(),
        setProgressUpdateCallback,
        refreshContinueListening: (containerId, tFunc) => renderContinueListening(containerId, tFunc),
        search: async (query, containerId, tFunc) => {
            if (searchTimeout) clearTimeout(searchTimeout);
            showLoading(containerId);
            return new Promise((resolve) => { searchTimeout = setTimeout(async () => { try { const results = await searchAudiobooks(query); resolve(results); } catch (e) { console.error('[Audiobook] Erro na busca:', e); resolve([]); } finally { searchTimeout = null; } }, DEBOUNCE_DELAY); });
        },
        loadRandom: loadRandomAudiobooks,
        showLoading, hideLoading, renderGrid, renderContinueListening, buildLanguageChips,
        getCurrentLanguageFilter: () => currentLanguageFilter,
        setCurrentLanguageFilter: (filter) => { currentLanguageFilter = filter; },
        getLanguageName, formatDuration, formatTime
    };

    window.AudiobookModule = publicAPI;
    return publicAPI;
})();