// biblioteca.js – versão final com busca unificada (Gutenberg, Internet Archive, Standard Ebooks, Feedbooks, HolyBooks, Sacred Texts),
// sistema automático de capas (Google Books + Open Library), priorização de resultados, cache, retry, e botão dinâmico de repositório.

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('booksGrid');
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('bookModal');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.querySelector('.close-modal');

    let allLocalBooks = [];
    let currentLang = 'pt-br';
    let translations = {};
    let currentOpenBook = null;
    let isLoading = false;
    let currentSearchTerm = '';
    let currentAbortController = null;
    let modalIsRendering = false;

    // Caches
    let searchCache = new Map();
    let apiCache = new Map();
    let coverCache = new Map();
    let googleCoverCache = new Map();
    const SEARCH_CACHE_TTL = 5 * 60 * 1000;
    const API_CACHE_TTL = 10 * 60 * 1000;
    const COVER_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

    // Configurações
    const GUTENDEX_URL = 'https://gutendex.com/books/';
    const ARCHIVE_URL = 'https://archive.org/advancedsearch.php';
    const STANDARD_EBOOKS_FEED = 'https://standardebooks.org/opds/all';
    const FEEDBOOKS_PUBLIC_DOMAIN = 'https://catalog.feedbooks.com/publicdomain/browse';
    const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

    const MAX_API_RESULTS = 20;
    const MIN_SEARCH_LENGTH = 3;
    const BASE_TIMEOUT = 8000;
    const MAX_RETRIES = 3;

    // ========== FETCH COM RETRY EXPONENCIAL E TIMEOUT ==========
    async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES, baseDelay = 500) {
        let lastError;
        for (let attempt = 1; attempt <= retries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), BASE_TIMEOUT);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                lastError = error;
                const isLastAttempt = attempt === retries;
                const isNetworkError = error.message === 'Failed to fetch' || error.name === 'TypeError';
                console.warn(`[FetchRetry] Tentativa ${attempt}/${retries} falhou: ${error.message} (${url})`);
                if (isLastAttempt) break;
                if (isNetworkError && attempt === 1 && !url.includes(CORS_PROXY)) {
                    return fetchWithRetry(CORS_PROXY + encodeURIComponent(url), options, retries - 1, baseDelay);
                }
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
            }
        }
        throw lastError;
    }

    // ========== UTILITÁRIOS ==========
    function normalizeText(text) {
        if (typeof text !== 'string') text = String(text || '');
        try {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        } catch {
            return text.toLowerCase().replace(/\s+/g, ' ').trim();
        }
    }

    function getUniqueKey(book) {
        const title = normalizeText(book.title || '');
        const author = normalizeText(book.author || '');
        return `${title}|${author}`;
    }

    function getBestDownloadFormat(formats) {
        if (!formats) return null;
        const priority = ['application/pdf', 'application/epub+zip', 'application/x-mobipocket-ebook', 'text/html', 'text/plain'];
        for (const mime of priority) if (formats[mime]) return formats[mime];
        return null;
    }

    function getCoverUrl(book) {
        if (book.cover?.startsWith('http') && !book.cover.includes('placehold')) return book.cover;
        return 'https://placehold.co/200x260/1F2933/9CA3AF?text=Sem+Capa';
    }

    function getCached(query, cacheMap) {
        const cached = cacheMap.get(query);
        if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) return cached.data;
        return null;
    }

    function setCache(query, data, cacheMap) {
        cacheMap.set(query, { data, timestamp: Date.now() });
    }

    // ========== SISTEMA DE CAPAS (Google Books + Open Library) ==========
    async function validateImageURL(url) {
        if (!url) return false;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            return response.ok;
        } catch {
            return false;
        }
    }

    async function fetchGoogleBookCover(title, author) {
        if (!title) return null;
        const cacheKey = normalizeText(title) + '|' + normalizeText(author || '');
        if (googleCoverCache.has(cacheKey)) {
            const cached = googleCoverCache.get(cacheKey);
            if (Date.now() - cached.timestamp < COVER_CACHE_TTL) return cached.cover;
        }
        try {
            let query = `intitle:"${encodeURIComponent(title)}"`;
            if (author) query += `+inauthor:"${encodeURIComponent(author)}"`;
            const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
            const response = await fetchWithRetry(url, {}, 2, 500);
            const data = await response.json();
            const img = data.items?.[0]?.volumeInfo?.imageLinks;
            let coverUrl = img?.thumbnail || img?.smallThumbnail;
            if (coverUrl) {
                coverUrl = coverUrl.replace('&edge=curl', '').replace('&zoom=1', '&zoom=3');
                if (await validateImageURL(coverUrl)) {
                    googleCoverCache.set(cacheKey, { cover: coverUrl, timestamp: Date.now() });
                    return coverUrl;
                }
            }
        } catch (e) {}
        return null;
    }

    async function fetchOpenLibraryCover(title) {
        if (!title) return null;
        const cacheKey = `ol_${normalizeText(title)}`;
        if (coverCache.has(cacheKey)) {
            const cached = coverCache.get(cacheKey);
            if (Date.now() - cached.timestamp < COVER_CACHE_TTL) return cached.cover;
        }
        try {
            const url = `${OPEN_LIBRARY_SEARCH_URL}?title=${encodeURIComponent(title)}&limit=1`;
            const response = await fetchWithRetry(url, {}, 2, 500);
            const data = await response.json();
            const doc = data.docs?.[0];
            if (doc?.cover_i) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
                if (await validateImageURL(coverUrl)) {
                    coverCache.set(cacheKey, { cover: coverUrl, timestamp: Date.now() });
                    return coverUrl;
                }
            }
        } catch (e) {}
        return null;
    }

    async function autoFillMissingCovers(books) {
        const toEnrich = books.filter(b => !b.cover || b.cover.includes('placehold'));
        if (!toEnrich.length) return books;
        console.log(`[CoverSystem] ${toEnrich.length} livros sem capa. Buscando...`);
        for (let i = 0; i < toEnrich.length; i++) {
            const book = toEnrich[i];
            let cover = await fetchGoogleBookCover(book.title, book.author);
            if (!cover) cover = await fetchOpenLibraryCover(book.title);
            if (cover) book.cover = cover;
            if (i < toEnrich.length - 1) await new Promise(r => setTimeout(r, 150));
        }
        return books;
    }

    // ========== PRIORIZAÇÃO DE RESULTADOS ==========
    function prioritizeBooks(books) {
        return books.sort((a, b) => {
            const score = (book) => {
                let s = 0;
                if (book.cover && !book.cover.includes('placehold')) s += 2;
                const url = book.download_url || '';
                if (url.includes('.pdf')) s += 3;
                else if (url.includes('.epub')) s += 2;
                else if (url) s += 1;
                return s;
            };
            return score(b) - score(a);
        });
    }

    // ========== NORMALIZAÇÃO DAS FONTES ==========
    function normalizeLocalBook(book) {
        return {
            id: book.id || `local_${Date.now()}_${Math.random()}`,
            title: book.title || 'Sem título',
            author: book.author || 'Unknown',
            year: book.year || null,
            description: book.description || null,
            cover: book.cover || null,
            download_url: book.download || book.link || null,
            download_label: book.download_label || 'download_book',
            provider: 'local',
            type: 'book',
            publisher: book.publisher || null,
            githubRepo: book.repositoryLink || null,   // repositoryLink do JSON
            repoName: book.repositoryName || null      // repositoryName do JSON
        };
    }

    function normalizeGutenbergBook(book) {
        const formats = book.formats || {};
        const downloadUrl = getBestDownloadFormat(formats);
        const cover = formats['image/jpeg'] || null;
        return {
            id: `gut_${book.id}`,
            title: book.title || 'Sem título',
            author: book.authors?.map(a => a.name).join(', ') || 'Unknown',
            year: null,
            description: `Livro digital do Projeto Gutenberg (ID ${book.id}).`,
            cover,
            download_url: downloadUrl,
            download_label: downloadUrl ? 'download_book' : 'access_online',
            provider: 'gutendex',
            type: 'book',
            publisher: 'Project Gutenberg',
            githubRepo: 'https://github.com/gutenberg-ebooks/',
            repoName: 'Project Gutenberg'
        };
    }

    function normalizeInternetArchiveBook(doc) {
        const identifier = doc.identifier;
        const accessUrl = identifier ? `https://archive.org/details/${identifier}` : null;
        return {
            id: `ia_${identifier || Math.random()}`,
            title: doc.title || 'Sem título',
            author: doc.creator || 'Unknown',
            year: doc.year || null,
            description: `Digitalizado pela Internet Archive.`,
            cover: null,
            download_url: null,
            access_url: accessUrl,
            download_label: 'access_online',
            provider: 'internetarchive',
            type: 'book',
            publisher: 'Internet Archive',
            githubRepo: null,
            repoName: null
        };
    }

    function normalizeStandardEbook(entry) {
        const title = entry.title || 'Sem título';
        const author = entry.author || 'Unknown';
        let downloadUrl = null, cover = null;
        if (entry.links) {
            for (const link of entry.links) {
                if (link.rel === 'http://opds-spec.org/acquisition') {
                    if (link.type === 'application/pdf') downloadUrl = link.href;
                    else if (link.type === 'application/epub+zip' && !downloadUrl) downloadUrl = link.href;
                }
                if (link.rel === 'http://opds-spec.org/image') cover = link.href;
            }
        }
        return {
            id: `se_${entry.id || Math.random()}`,
            title,
            author,
            year: entry.published ? new Date(entry.published).getFullYear() : null,
            description: entry.summary || `Livro da Standard Ebooks.`,
            cover,
            download_url: downloadUrl,
            download_label: downloadUrl ? 'download_book' : 'access_online',
            provider: 'standardebooks',
            type: 'book',
            publisher: 'Standard Ebooks',
            githubRepo: 'https://github.com/standardebooks',
            repoName: 'Standard Ebooks'
        };
    }

    function normalizeFeedbooksBook(entry) {
        const title = entry.title || 'Sem título';
        const author = entry.author || 'Unknown';
        let downloadUrl = null, cover = null;
        if (entry.links) {
            for (const link of entry.links) {
                if (link.rel === 'http://opds-spec.org/acquisition') {
                    if (link.type === 'application/pdf') downloadUrl = link.href;
                    else if (link.type === 'application/epub+zip' && !downloadUrl) downloadUrl = link.href;
                }
                if (link.rel === 'http://opds-spec.org/image') cover = link.href;
            }
        }
        return {
            id: `fb_${entry.id || Math.random()}`,
            title,
            author,
            year: entry.published ? new Date(entry.published).getFullYear() : null,
            description: entry.summary || `Livro do Feedbooks Public Domain.`,
            cover,
            download_url: downloadUrl,
            download_label: downloadUrl ? 'download_book' : 'access_online',
            provider: 'feedbooks',
            type: 'book',
            publisher: 'Feedbooks',
            githubRepo: null,
            repoName: null
        };
    }

    function normalizeHolyBook(item) {
        return {
            id: `hb_${Math.random()}`,
            title: item.title || 'Sem título',
            author: item.author || 'HolyBooks',
            year: null,
            description: item.description || `Livro religioso/filosófico do HolyBooks.`,
            cover: item.cover || null,
            download_url: item.download_url || null,
            access_url: item.download_url || null,
            download_label: 'download_book',
            provider: 'holybooks',
            type: 'book',
            publisher: 'HolyBooks',
            githubRepo: null,
            repoName: null
        };
    }

    function normalizeSacredTextBook(item) {
        return {
            id: `st_${Math.random()}`,
            title: item.title || 'Sem título',
            author: item.author || 'Sacred Texts',
            year: null,
            description: item.description || `Texto sagrado/histórico do Internet Sacred Text Archive.`,
            cover: item.cover || null,
            download_url: item.download_url || null,
            access_url: item.download_url || null,
            download_label: 'access_online',
            provider: 'sacredtexts',
            type: 'book',
            publisher: 'Sacred Texts Archive',
            githubRepo: null,
            repoName: null
        };
    }

    // ========== BUSCAS INDIVIDUAIS ==========
    async function searchGutenberg(query, signal) {
        if (query.length < MIN_SEARCH_LENGTH) return [];
        const normalized = normalizeText(query);
        const cacheKey = `gutenberg_${normalized}`;
        const cached = getCached(cacheKey, apiCache);
        if (cached) return cached;
        try {
            const url = `${GUTENDEX_URL}?search=${encodeURIComponent(normalized)}`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            const data = await response.json();
            const books = (data.results || []).map(b => normalizeGutenbergBook(b));
            setCache(cacheKey, books, apiCache);
            console.log(`[Gutenberg] ${books.length} resultados`);
            return books;
        } catch (error) {
            console.error('[Gutenberg] Erro:', error);
            return [];
        }
    }

    async function searchInternetArchive(query, signal) {
        if (query.length < MIN_SEARCH_LENGTH) return [];
        const normalized = normalizeText(query);
        const cacheKey = `archive_${normalized}`;
        const cached = getCached(cacheKey, apiCache);
        if (cached) return cached;
        try {
            const archiveQuery = `${normalized} AND mediatype:texts AND format:pdf`;
            const params = new URLSearchParams({
                q: archiveQuery,
                fl: ['identifier', 'title', 'creator', 'year'].join(','),
                rows: MAX_API_RESULTS,
                page: 1,
                output: 'json'
            });
            const url = `${ARCHIVE_URL}?${params.toString()}`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            const data = await response.json();
            const docs = data.response?.docs || [];
            const books = docs.map(doc => normalizeInternetArchiveBook(doc));
            setCache(cacheKey, books, apiCache);
            console.log(`[InternetArchive] ${books.length} resultados`);
            return books;
        } catch (error) {
            console.error('[InternetArchive] Erro:', error);
            return [];
        }
    }

    async function searchStandardEbooks(query, signal) {
        if (query.length < MIN_SEARCH_LENGTH) return [];
        const normalized = normalizeText(query);
        const cacheKey = `standard_${normalized}`;
        const cached = getCached(cacheKey, apiCache);
        if (cached) return cached;
        try {
            const proxyUrl = CORS_PROXY + encodeURIComponent(STANDARD_EBOOKS_FEED);
            const response = await fetchWithRetry(proxyUrl, signal ? { signal } : {});
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'application/xml');
            const entries = xmlDoc.querySelectorAll('entry');
            const books = [];
            const lowerQuery = normalized.toLowerCase();
            for (const entry of entries) {
                const title = entry.querySelector('title')?.textContent || '';
                const author = entry.querySelector('author name')?.textContent || '';
                if (title.toLowerCase().includes(lowerQuery) || author.toLowerCase().includes(lowerQuery)) {
                    const id = entry.querySelector('id')?.textContent;
                    const published = entry.querySelector('published')?.textContent;
                    const summary = entry.querySelector('summary')?.textContent;
                    const language = entry.querySelector('language')?.textContent;
                    const links = [];
                    entry.querySelectorAll('link').forEach(link => {
                        links.push({
                            rel: link.getAttribute('rel'),
                            href: link.getAttribute('href'),
                            type: link.getAttribute('type')
                        });
                    });
                    books.push(normalizeStandardEbook({ id, title, author, published, summary, language, links }));
                    if (books.length >= MAX_API_RESULTS) break;
                }
            }
            setCache(cacheKey, books, apiCache);
            console.log(`[StandardEbooks] ${books.length} resultados via proxy`);
            return books;
        } catch (error) {
            console.error('[StandardEbooks] Erro (fallback silencioso):', error);
            return [];
        }
    }

    async function searchFeedbooks(query, signal) {
        if (query.length < MIN_SEARCH_LENGTH) return [];
        const normalized = normalizeText(query);
        const cacheKey = `feedbooks_${normalized}`;
        const cached = getCached(cacheKey, apiCache);
        if (cached) return cached;
        try {
            const feedUrl = `${FEEDBOOKS_PUBLIC_DOMAIN}?format=atom`;
            const proxyUrl = CORS_PROXY + encodeURIComponent(feedUrl);
            const response = await fetchWithRetry(proxyUrl, signal ? { signal } : {});
            const text = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'application/xml');
            const entries = xmlDoc.querySelectorAll('entry');
            const books = [];
            const lowerQuery = normalized.toLowerCase();
            for (const entry of entries) {
                const title = entry.querySelector('title')?.textContent || '';
                const author = entry.querySelector('author name')?.textContent || '';
                if (title.toLowerCase().includes(lowerQuery) || author.toLowerCase().includes(lowerQuery)) {
                    const id = entry.querySelector('id')?.textContent;
                    const published = entry.querySelector('published')?.textContent;
                    const summary = entry.querySelector('summary')?.textContent;
                    const language = entry.querySelector('language')?.textContent;
                    const links = [];
                    entry.querySelectorAll('link').forEach(link => {
                        links.push({
                            rel: link.getAttribute('rel'),
                            href: link.getAttribute('href'),
                            type: link.getAttribute('type')
                        });
                    });
                    books.push(normalizeFeedbooksBook({ id, title, author, published, summary, language, links }));
                    if (books.length >= MAX_API_RESULTS) break;
                }
            }
            setCache(cacheKey, books, apiCache);
            console.log(`[Feedbooks] ${books.length} resultados via proxy`);
            return books;
        } catch (error) {
            console.error('[Feedbooks] Erro:', error);
            return [];
        }
    }

    async function searchHolyBooks(query, signal) {
        if (query.length < MIN_SEARCH_LENGTH) return [];
        const normalized = normalizeText(query);
        const cacheKey = `holybooks_${normalized}`;
        const cached = getCached(cacheKey, apiCache);
        if (cached) return cached;
        try {
            const searchUrl = `https://holybooks.com/?s=${encodeURIComponent(normalized)}`;
            const response = await fetchWithRetry(searchUrl, signal ? { signal } : {});
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const articles = doc.querySelectorAll('article, .post, .entry');
            const books = [];
            for (const article of articles) {
                const titleEl = article.querySelector('h2 a, .entry-title a');
                if (!titleEl) continue;
                const title = titleEl.textContent.trim();
                const link = titleEl.href;
                let cover = null;
                const imgEl = article.querySelector('img');
                if (imgEl && imgEl.src) cover = imgEl.src;
                books.push({
                    title,
                    author: 'HolyBooks',
                    cover,
                    download_url: link,
                    description: `Livro do HolyBooks. Acesse o link para visualizar/download.`
                });
                if (books.length >= MAX_API_RESULTS) break;
            }
            const normalizedBooks = books.map(b => normalizeHolyBook(b));
            setCache(cacheKey, normalizedBooks, apiCache);
            console.log(`[HolyBooks] ${normalizedBooks.length} resultados`);
            return normalizedBooks;
        } catch (error) {
            console.error('[HolyBooks] Erro (fallback vazio):', error);
            return [];
        }
    }

    async function searchSacredTexts(query, signal) {
        if (query.length < MIN_SEARCH_LENGTH) return [];
        const normalized = normalizeText(query);
        const cacheKey = `sacredtexts_${normalized}`;
        const cached = getCached(cacheKey, apiCache);
        if (cached) return cached;
        try {
            const searchUrl = `https://www.sacred-texts.com/search?q=${encodeURIComponent(normalized)}`;
            const response = await fetchWithRetry(searchUrl, signal ? { signal } : {});
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const results = doc.querySelectorAll('.result, .search-result, li.result');
            const books = [];
            for (const result of results) {
                const linkEl = result.querySelector('a');
                if (!linkEl) continue;
                const title = linkEl.textContent.trim();
                const url = linkEl.href;
                if (!url) continue;
                let cover = null;
                const imgEl = result.querySelector('img');
                if (imgEl && imgEl.src) cover = imgEl.src;
                books.push({
                    title,
                    author: 'Sacred Texts Archive',
                    cover,
                    download_url: url,
                    description: `Texto sagrado disponível em ${url}`
                });
                if (books.length >= MAX_API_RESULTS) break;
            }
            const normalizedBooks = books.map(b => normalizeSacredTextBook(b));
            setCache(cacheKey, normalizedBooks, apiCache);
            console.log(`[SacredTexts] ${normalizedBooks.length} resultados`);
            return normalizedBooks;
        } catch (error) {
            console.error('[SacredTexts] Erro (fallback vazio):', error);
            return [];
        }
    }

    // ========== BUSCA UNIFICADA ==========
    async function unifiedSmartSearch(query, signal) {
        const trimmed = normalizeText(query);
        if (trimmed.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `unified_${trimmed}`;
        const cached = getCached(cacheKey, searchCache);
        if (cached) return cached;

        const promises = [
            searchInternetArchive(trimmed, signal),
            searchGutenberg(trimmed, signal),
            searchStandardEbooks(trimmed, signal),
            searchFeedbooks(trimmed, signal),
            searchHolyBooks(trimmed, signal),
            searchSacredTexts(trimmed, signal)
        ];
        const results = await Promise.all(promises);
        let allBooks = results.flat();
        allBooks = prioritizeBooks(allBooks);
        const unique = removeDuplicateBooks(allBooks);
        setCache(cacheKey, unique, searchCache);
        return unique;
    }

    function removeDuplicateBooks(books) {
        const seen = new Set();
        return books.filter(book => {
            const key = getUniqueKey(book);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // ========== RENDERIZAÇÃO DOS CARDS (sem provedor, sem botões extras) ==========
    function renderBooks(books) {
        if (!grid) return;
        if (books.length === 0) {
            grid.innerHTML = `<p>${t('library_no_books')}</p>`;
            document.getElementById('bookCount').innerText = '0';
            return;
        }
        grid.innerHTML = books.map(book => {
            const coverSrc = getCoverUrl(book);
            return `
            <div class="book-mini-card" data-id="${book.id}">
                <img class="mini-cover" src="${coverSrc}" alt="${escapeHtml(book.title)}" onerror="this.src='https://placehold.co/200x260/1F2933/9CA3AF?text=Sem+Capa'">
                <div class="mini-title">${escapeHtml(book.title)}</div>
                <div class="mini-author">${escapeHtml(book.author)}</div>
                <div class="mini-year">${escapeHtml(book.year || t('book_year') + ' não informado')}</div>
            </div>`;
        }).join('');

        document.querySelectorAll('.book-mini-card').forEach(card => {
            const id = card.dataset.id;
            const book = books.find(b => b.id === id);
            if (book) card.addEventListener('click', () => showModal(book));
        });
        document.getElementById('bookCount').innerText = books.length;
        applyTranslations();
    }

    // ========== MODAL (com botão dinâmico de repositório) ==========
    function detectBookLanguage(book) {
        if (book.language) return book.language;
        const title = (book.title || '').toLowerCase();
        if (/[àáâãçéêíóôúü]/i.test(title)) return 'pt';
        if (/\b(the|and|of|to|in|for)\b/i.test(title)) return 'en';
        if (/\b(el|la|de|y|en|un)\b/i.test(title)) return 'es';
        if (/\b(le|la|de|et|un)\b/i.test(title)) return 'fr';
        return 'en';
    }

    function showModal(book) {
        if (modalIsRendering) return;
        modalIsRendering = true;
        currentOpenBook = book;
        if (!book.language) book.language = detectBookLanguage(book);

        let providerText = '';
        if (book.provider === 'local') providerText = t('provider_local');
        else if (book.provider === 'gutendex') providerText = t('provider_gutendex');
        else if (book.provider === 'internetarchive') providerText = t('provider_internetarchive');
        else if (book.provider === 'standardebooks') providerText = t('provider_standardebooks');
        else if (book.provider === 'feedbooks') providerText = t('provider_feedbooks');
        else if (book.provider === 'holybooks') providerText = t('provider_holybooks');
        else if (book.provider === 'sacredtexts') providerText = t('provider_sacredtexts');

        const coverHtml = `<img class="modal-cover" src="${getCoverUrl(book)}" alt="${escapeHtml(book.title)}" onerror="this.src='https://placehold.co/140x200/1F2933/9CA3AF?text=Sem+Capa'">`;
        
        let downloadButton = '';
        let accessButton = '';
        if (book.download_url) {
            downloadButton = `<a href="${escapeHtml(book.download_url)}" class="download-btn" target="_blank" rel="noopener noreferrer"><i class="fas fa-download"></i> ${t('download_book')}</a>`;
        }
        if (book.access_url) {
            const label = book.download_label === 'view_record' ? t('view_record') : t('access_online');
            accessButton = `<a href="${escapeHtml(book.access_url)}" class="download-btn" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${label}</a>`;
        }
        if (!downloadButton && !accessButton && book.download_url) {
            accessButton = `<a href="${escapeHtml(book.download_url)}" class="download-btn" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${t('access_online')}</a>`;
        }

        // 🔁 BOTÃO DINÂMICO DE REPOSITÓRIO (usa repositoryName e repositoryLink do books.json)
        let repoButton = '';
        if (book.githubRepo && book.repoName) {
            repoButton = `<a href="${escapeHtml(book.githubRepo)}" class="repo-button" target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-github"></i> ${escapeHtml(book.repoName)}
                          </a>`;
        }

        const detailsHtml = `
            <div class="modal-details">
                <h2>${escapeHtml(book.title)}</h2>
                <p><strong>${t('book_author')}:</strong> ${escapeHtml(book.author)}</p>
                <p><strong>${t('book_year')}:</strong> ${escapeHtml(book.year || 'Não informado')}</p>
                <p><strong>${t('book_language')}:</strong> ${escapeHtml(book.language.toUpperCase())}</p>
                <p><strong>${t('book_publisher')}:</strong> ${escapeHtml(book.publisher || 'Não informada')}</p>
                <p><strong><i class="fas fa-database"></i> ${t('provider_local')}:</strong> ${escapeHtml(providerText)}</p>
                <div class="modal-description">${escapeHtml(book.description || t('no_description'))}</div>
                <div class="modal-actions">
                    ${downloadButton}
                    ${accessButton}
                    ${repoButton}
                </div>
            </div>
        `;
        modalBody.innerHTML = `<div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">${coverHtml}${detailsHtml}</div>`;
        modal.style.display = 'flex';
        modalIsRendering = false;
    }

    function closeModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
        currentOpenBook = null;
    }
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

    // ========== CARREGAMENTO DE LIVROS LOCAIS ==========
    async function loadLocalBooks() {
        try {
            const response = await fetch('books.json');
            if (!response.ok) throw new Error('Erro ao carregar livros locais');
            const books = await response.json();
            return books.map(book => normalizeLocalBook(book));
        } catch (error) {
            console.error('Erro ao carregar livros locais:', error);
            return [];
        }
    }

    // ========== BUSCA PRINCIPAL COM DEBOUNCE ==========
    async function performSearch(query) {
        const trimmed = normalizeText(query);
        if (trimmed.length < MIN_SEARCH_LENGTH) {
            renderBooks(allLocalBooks);
            return;
        }
        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;
        isLoading = true;
        if (grid) grid.innerHTML = `<div class="loading-skeleton">${t('loading')}</div>`;
        try {
            let localFiltered = allLocalBooks;
            if (trimmed) {
                const lower = trimmed.toLowerCase();
                localFiltered = allLocalBooks.filter(b =>
                    b.title?.toLowerCase().includes(lower) ||
                    b.author?.toLowerCase().includes(lower)
                );
            }
            const apiBooks = await unifiedSmartSearch(trimmed, signal);
            const allBooks = [...localFiltered, ...apiBooks];
            const unique = removeDuplicateBooks(allBooks);
            const enriched = await autoFillMissingCovers(unique);
            const prioritized = prioritizeBooks(enriched);
            renderBooks(prioritized);
        } catch (error) {
            console.error('[PerformSearch] Erro:', error);
            renderBooks(allLocalBooks);
        } finally {
            isLoading = false;
        }
    }

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const term = e.target.value;
        currentSearchTerm = term;
        debounceTimer = setTimeout(() => performSearch(term), 300);
    });

    // ========== i18n ==========
    let translationCache = new Map();
    const TRANSLATION_CACHE_TTL = 60 * 60 * 1000;

    async function loadTranslations(lang) {
        try {
            const cached = translationCache.get(lang);
            if (cached && Date.now() - cached.timestamp < TRANSLATION_CACHE_TTL) {
                translations = cached.data;
                return true;
            }
            const response = await fetch(`../lang/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            translations = await response.json();
            translationCache.set(lang, { data: translations, timestamp: Date.now() });
            return true;
        } catch (error) {
            if (lang !== 'pt-br') return loadTranslations('pt-br');
            translations = {
                "library_title": "Biblioteca",
                "library_subtitle": "Biblioteca Digital",
                "library_book_count": "livros",
                "library_no_books": "Nenhum livro encontrado.",
                "library_download": "Baixar Livro",
                "library_github": "GitHub",
                "back_to_courses": "Voltar",
                "book_author": "Autor",
                "book_year": "Ano",
                "book_language": "Idioma",
                "book_subject": "Assunto",
                "book_publisher": "Editora",
                "book_isbn": "ISBN",
                "book_more_info": "Ver mais informações",
                "download_book": "Baixar Livro",
                "access_online": "Ler Online",
                "view_record": "Ver Registro",
                "lang_english": "Inglês",
                "lang_portuguese": "Português",
                "lang_spanish": "Espanhol",
                "provider_local": "Acervo Local",
                "provider_gutendex": "Gutendex",
                "provider_internetarchive": "Internet Archive",
                "provider_standardebooks": "Standard Ebooks",
                "provider_feedbooks": "Feedbooks",
                "provider_holybooks": "HolyBooks",
                "provider_sacredtexts": "Sacred Texts"
            };
            return false;
        }
    }

    function t(key, replacements = {}) {
        let text = translations[key] || key;
        for (const [k, v] of Object.entries(replacements)) text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        return text;
    }

    function applyTranslations() {
        if (!translations || Object.keys(translations).length === 0) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && translations[key]) {
                if (el.tagName === 'INPUT' && el.placeholder !== undefined) el.placeholder = translations[key];
                else if (el.innerHTML.includes('<i') && !el.hasAttribute('data-i18n-raw')) {
                    const icon = el.querySelector('i');
                    if (icon) {
                        const cloneIcon = icon.cloneNode(true);
                        el.innerHTML = '';
                        el.appendChild(cloneIcon);
                        el.appendChild(document.createTextNode(' ' + translations[key]));
                    } else el.innerText = translations[key];
                } else el.innerText = translations[key];
            }
        });
        document.title = t('library_title');
        const bookCountSpan = document.getElementById('bookCount');
        if (bookCountSpan) bookCountSpan.innerText = allLocalBooks.length;
    }

    function updateLanguageSelector(lang) {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (ptBtn && enBtn) {
            if (lang === 'pt-br') { ptBtn.classList.add('active'); enBtn.classList.remove('active'); }
            else if (lang === 'en') { enBtn.classList.add('active'); ptBtn.classList.remove('active'); }
        }
    }

    async function setLanguage(lang) {
        if (lang === currentLang && Object.keys(translations).length > 0) return;
        const success = await loadTranslations(lang);
        if (success || Object.keys(translations).length > 0) {
            currentLang = lang;
            localStorage.setItem('selectedLanguage', lang);
            applyTranslations();
            updateLanguageSelector(lang);
            renderBooks(allLocalBooks);
        }
    }

    const langPtBtn = document.getElementById('langPtBtn');
    const langEnBtn = document.getElementById('langEnBtn');
    if (langPtBtn && langEnBtn) {
        langPtBtn.addEventListener('click', () => setLanguage('pt-br'));
        langEnBtn.addEventListener('click', () => setLanguage('en'));
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return str || '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function highlightBook(title) {
        setTimeout(() => {
            const normalized = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            const cards = document.querySelectorAll('.book-mini-card');
            for (let card of cards) {
                const cardTitle = card.querySelector('.mini-title')?.innerText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
                if (cardTitle === normalized) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.transition = 'background 0.3s';
                    card.style.backgroundColor = 'var(--accent-blue)';
                    setTimeout(() => card.style.backgroundColor = '', 2000);
                    break;
                }
            }
        }, 500);
    }

    async function init() {
        const localBooks = await loadLocalBooks();
        const enriched = await autoFillMissingCovers(localBooks);
        allLocalBooks = enriched;
        const savedLang = localStorage.getItem('selectedLanguage') || 'pt-br';
        await setLanguage(savedLang);
        renderBooks(allLocalBooks);
        const highlight = localStorage.getItem('highlightBook');
        if (highlight) {
            localStorage.removeItem('highlightBook');
            highlightBook(highlight);
        }
    }
    init();
});