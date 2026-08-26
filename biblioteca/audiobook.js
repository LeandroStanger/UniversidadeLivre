// biblioteca.js – Versão 5.1 – COMPLETO COM SUPORTE A AUDIOBOOKS E FALLBACK DE PATHS
// Busca de livros com loading estável, enriquecimento de metadados e APIs externas
// Suporte a Audiobooks via YouTube, integração com player do Auditório
// CORREÇÃO: Múltiplos caminhos para carregar audiobooks.json (fallback)
// CORREÇÃO: Tratamento de erro silencioso caso o arquivo não exista
// CORREÇÃO: Extração automática de videoId da URL

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

    const HATHITRUST_API_KEY = 'YOUR_HATHITRUST_API_KEY';
    const GOOGLE_BOOKS_API_KEY = 'YOUR_GOOGLE_BOOKS_API_KEY';

    // ========== FUNÇÃO DE TRADUÇÃO ==========
    function t(key, replacements = {}) {
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
                'audiobooks_title': 'Audiobooks'
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
        // Atualiza também o título da aba de audiobooks
        const audiobooksTabBtn = document.querySelector('.main-tab-btn[data-main-tab="audiobooks"] span');
        if (audiobooksTabBtn) audiobooksTabBtn.innerText = t('audiobooks_title');
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
    async function enrichWithGoogleBooks(book) {
        if (!book.title) return book;
        const cacheKey = `google_enrich_${normalizeText(book.title)}_${normalizeText(book.rawAuthor || '')}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < METADATA_CACHE_TTL) {
            const cached = metadataCache.get(cacheKey).data;
            if (cached) return { ...book, ...cached };
        }
        try {
            let query = `intitle:${encodeURIComponent(book.title)}`;
            if (book.rawAuthor) query += `+inauthor:${encodeURIComponent(book.rawAuthor)}`;
            let url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
            if (GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY !== 'YOUR_GOOGLE_BOOKS_API_KEY') url += `&key=${GOOGLE_BOOKS_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) return book;
            const data = await response.json();
            if (!data.items || data.items.length === 0) return book;
            const volume = data.items[0].volumeInfo;
            const enriched = {};
            if (!book.cover && volume.imageLinks) {
                enriched.cover = volume.imageLinks.thumbnail || volume.imageLinks.smallThumbnail || null;
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
                metadataCache.set(cacheKey, { data: enriched, timestamp: Date.now() });
                return { ...book, ...enriched };
            }
            return book;
        } catch (error) {
            return book;
        }
    }

    async function enrichWithOpenLibrary(book) {
        if (!book.title) return book;
        const cacheKey = `openlib_enrich_${normalizeText(book.title)}_${normalizeText(book.rawAuthor || '')}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < METADATA_CACHE_TTL) {
            const cached = metadataCache.get(cacheKey).data;
            if (cached) return { ...book, ...cached };
        }
        try {
            let query = `title:${encodeURIComponent(book.title)}`;
            if (book.rawAuthor) query += `&author:${encodeURIComponent(book.rawAuthor)}`;
            const url = `https://openlibrary.org/search.json?q=${query}&limit=1`;
            const response = await fetch(url);
            if (!response.ok) return book;
            const data = await response.json();
            if (!data.docs || data.docs.length === 0) return book;
            const doc = data.docs[0];
            const enriched = {};
            if (!book.cover && doc.cover_i) {
                enriched.cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
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
            return book;
        }
    }

    async function enrichBookMetadata(book) {
        if (!book.title) return book;
        let enriched = await enrichWithGoogleBooks(book);
        if (!enriched.cover || !enriched.description) {
            enriched = await enrichWithOpenLibrary(enriched);
        }
        return enriched;
    }

    // ========== APIS EXTERNAS ==========
    async function searchGoogleBooks(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `google_books_free_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${MAX_EXTERNAL_RESULTS}&printType=books&filter=free-ebooks`;
            if (GOOGLE_BOOKS_API_KEY && GOOGLE_BOOKS_API_KEY !== 'YOUR_GOOGLE_BOOKS_API_KEY') url += `&key=${GOOGLE_BOOKS_API_KEY}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return (data.items || []).map(book => {
                const volume = book.volumeInfo || {};
                const imageLinks = volume.imageLinks || {};
                const cover = imageLinks.thumbnail || imageLinks.smallThumbnail || null;
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
        } catch (error) { console.warn('[Google Books] Erro:', error); return []; }
    }

    // ========== UTILITÁRIOS DE REDE ==========
    async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
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

    // ========== APIS EXTERNAS (simplificadas) ==========
    async function searchArxiv(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `arxiv_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) return apiCache.get(cacheKey).data;
        try {
            const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetchWithProxy(url, 15000);
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
        } catch (error) { console.warn('[arXiv] Erro:', error); return []; }
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
            const response = await fetchWithProxy(url);
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
            const response = await fetchWithProxy(url);
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
            const response = await fetchWithProxy(url);
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
            const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return (data.docs || []).map(doc => {
                let coverId = doc.cover_i;
                let coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
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
        } catch (error) { console.warn('[Open Library] Erro:', error); return []; }
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
            source: book.source || 'Local'
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

    // ========== AUDIOBOOKS ==========
    // Função para extrair o ID do vídeo do YouTube a partir da URL
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

    // Carregar audiobooks com fallback de múltiplos caminhos
    async function loadAudiobooks() {
        const paths = [
            'biblioteca/audiobooks.json',
            'audiobooks.json',
            './audiobooks.json',
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
                    return data.map(item => {
                        const videoId = item.videoId || extractVideoId(item.url);
                        return {
                            ...item,
                            type: 'audiobook',
                            source: 'YouTube',
                            videoId: videoId,
                            cover: item.cover || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                        };
                    });
                }
            } catch (e) {
                console.warn(`[Biblioteca] Falha ao carregar ${path}:`, e.message);
            }
        }
        // Se não encontrar em nenhum caminho, retorna array vazio e loga aviso
        console.warn('[Biblioteca] Nenhum arquivo audiobooks.json encontrado. A aba de audiobooks ficará vazia.');
        return [];
    }

    // Renderizar audiobooks
    function renderAudiobooks(audiobooks) {
        const container = document.getElementById('audiobooksGrid');
        if (!container) return;

        if (!audiobooks || audiobooks.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-headphones"></i><p>${t('no_audiobooks')}</p></div>`;
            return;
        }

        let html = '';
        audiobooks.forEach(book => {
            const cover = book.cover || `https://i.ytimg.com/vi/${book.videoId}/hqdefault.jpg`;
            const duration = book.duration || '';
            const year = book.year || '';

            html += `
                <div class="audiobook-card" data-video-id="${book.videoId}" data-title="${escapeHtml(book.title)}" data-description="${escapeHtml(book.description)}">
                    <img class="audiobook-cover" src="${cover}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.src='https://placehold.co/120x90/1F2933/6C8CFF?text=Audiobook'">
                    <div class="audiobook-info">
                        <div class="audiobook-title">${escapeHtml(book.title)}</div>
                        <div class="audiobook-author"><i class="fas fa-user"></i> ${escapeHtml(book.author)}</div>
                        ${duration ? `<div class="audiobook-duration"><i class="fas fa-clock"></i> ${duration}</div>` : ''}
                        ${year ? `<div class="audiobook-year">${year}</div>` : ''}
                        <div class="audiobook-description">${escapeHtml(book.description)}</div>
                        <button class="listen-btn" data-video-id="${book.videoId}" data-title="${escapeHtml(book.title)}" data-description="${escapeHtml(book.description)}">
                            <i class="fas fa-play"></i> ${t('listen_button')}
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Clique no card ou no botão "Ouvir"
        container.querySelectorAll('.audiobook-card').forEach(card => {
            const btn = card.querySelector('.listen-btn');
            // Clique no card aciona o botão
            card.addEventListener('click', function(e) {
                if (e.target.closest('.listen-btn')) return;
                if (btn) btn.click();
            });
        });

        container.querySelectorAll('.listen-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const videoId = this.dataset.videoId;
                const title = this.dataset.title;
                const description = this.dataset.description;
                playAudiobook(videoId, title, description);
            });
        });
    }

    // Reproduzir audiobook reutilizando o player do Auditório
    function playAudiobook(videoId, title, description) {
        // Verifica se o módulo do Auditório está disponível
        if (window.Auditorio && typeof window.Auditorio.playVideo === 'function') {
            window.Auditorio.playVideo(videoId, title, description);
            return;
        }
        // Fallback: tenta usar o player global do auditório (caso o objeto não esteja exposto)
        if (window.playVideo && typeof window.playVideo === 'function') {
            window.playVideo(videoId, title, description);
            return;
        }
        // Último recurso: abre em nova guia
        window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
    }

    // Carregar e exibir a aba de audiobooks
    async function loadAudiobooksTab() {
        const container = document.getElementById('audiobooksTabContent');
        if (!container) return;

        // Mostra indicador de carregamento
        container.innerHTML = `<div class="loading-skeleton"><div class="spinner"></div><p>${t('loading')}</p></div>`;

        const audiobooks = await loadAudiobooks();

        // Limpa o container e renderiza
        container.innerHTML = `
            <div class="search-bar">
                <input type="text" id="audiobookSearchInput" placeholder="${t('search_audiobooks_placeholder')}">
            </div>
            <div id="audiobooksGrid" class="audiobooks-grid"></div>
        `;

        renderAudiobooks(audiobooks);

        // Configura busca
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

        // Carregar idioma
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

        // Configurar botões de idioma
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