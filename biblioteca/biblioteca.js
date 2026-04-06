// biblioteca.js – versão final com busca local-first, resultados progressivos e prioridade máxima para fonte local
document.addEventListener('DOMContentLoaded', async () => {
    // ========== 1. DECLARAÇÃO DE VARIÁVEIS GLOBAIS ==========
    let translations = {};
    let currentLang = 'pt-br';
    let grid, searchInput, modal, modalBody, closeModalBtn;
    let filterContainer, filterBooks, filterArticles, filterPapers, filterTCC, filterDissertation, filterThesis;

    let allLocalBooks = [];
    let currentSearchTerm = '';
    let currentAbortController = null;
    let loadingTimeout = null;
    let currentSearchId = 0;

    let searchCache = new Map();
    let apiCache = new Map();
    let coverCache = new Map();
    let metadataCache = new Map();
    let descriptionCache = new Map();
    let expansionCache = new Map();
    let intersectionObserver = null;

    let apiMetrics = { local: { total: 0, valid: 0, avgTime: 0 }, internetarchive: { total: 0, valid: 0, avgTime: 0 }, openalex: { total: 0, valid: 0, avgTime: 0 }, arxiv: { total: 0, valid: 0, avgTime: 0 }, gutenberg: { total: 0, valid: 0, avgTime: 0 } };
    let uiState = { isLoading: false, hasResults: false, hasError: false, currentSearchId: 0 };

    // ========== 2. CONSTANTES ==========
    const SEARCH_CACHE_TTL = 5 * 60 * 1000;
    const API_CACHE_TTL = 10 * 60 * 1000;
    const METADATA_CACHE_TTL = 30 * 60 * 1000;
    const COVER_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    const DESCRIPTION_CACHE_TTL = 30 * 60 * 1000;
    const EXPANSION_CACHE_TTL = 5 * 60 * 1000;
    const MAX_SEARCH_TIME = 20000;
    const MAX_API_RESULTS = 20;
    const MIN_SEARCH_LENGTH = 2;
    const BASE_TIMEOUT = 15000;
    const MAX_RETRIES = 2;
    const MAX_CONCURRENT_APIS = 2;
    const MAX_LOCAL_RESULTS_TO_SKIP_API = 20;
    const BATCH_RENDER_SIZE = 20;
    const MAX_EXPANDED_TERMS = 12;

    // ========== 3. PRIORIDADE DE FONTE (LOCAL SEMPRE NO TOPO) ==========
    const SourcePriorityMap = {
        local: 1,
        openalex: 2,
        arxiv: 3,
        internetarchive: 4,
        gutenberg: 5
    };

    function rankResultsBySource(results) {
        if (!results || !results.length) return results;
        return [...results].sort((a, b) => {
            const priorityA = SourcePriorityMap[a.source] || 99;
            const priorityB = SourcePriorityMap[b.source] || 99;
            if (priorityA !== priorityB) return priorityA - priorityB;
            // Mesma fonte: ordena por relevância (idioma ou título)
            const langA = detectItemLanguage(a);
            const langB = detectItemLanguage(b);
            const langPriority = { pt: 1, en: 2, es: 3, ja: 4, other: 5 };
            return (langPriority[langA] || 5) - (langPriority[langB] || 5);
        });
    }

    function mergeResultsWithoutDuplicates(existingResults, newResults) {
        const seen = new Set();
        // Primeiro, adiciona os resultados existentes (já exibidos)
        const merged = [...existingResults];
        merged.forEach(item => {
            const key = `${normalizeText(item.title)}|${normalizeText(item.author)}`;
            seen.add(key);
        });
        // Depois adiciona novos resultados que não são duplicados
        for (const item of newResults) {
            const key = `${normalizeText(item.title)}|${normalizeText(item.author)}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(item);
            }
        }
        // Reordena pela prioridade de fonte (local sempre no topo)
        return rankResultsBySource(merged);
    }

    // ========== 4. PRIORIZAÇÃO POR IDIOMA (AUXILIAR) ==========
    const LanguagePriorityMap = { pt: 1, en: 2, es: 3, ja: 4, other: 5 };
    function normalizeLanguage(langCode) {
        if (!langCode) return 'other';
        const normalized = langCode.toLowerCase().slice(0, 2);
        if (normalized === 'pt') return 'pt';
        if (normalized === 'en') return 'en';
        if (normalized === 'es') return 'es';
        if (normalized === 'ja') return 'ja';
        return 'other';
    }
    function detectItemLanguage(item) {
        if (item.language) return normalizeLanguage(item.language);
        if (item.lang) return normalizeLanguage(item.lang);
        const title = (item.title || '').toLowerCase();
        if (/[àáâãçéêíóôúü]/i.test(title)) return 'pt';
        if (/\b(the|and|of|to|in|for)\b/i.test(title)) return 'en';
        if (/\b(el|la|de|y|en|un)\b/i.test(title)) return 'es';
        if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(title)) return 'ja';
        return 'other';
    }

    // ========== 5. FUNÇÕES AUXILIARES ==========
    function normalizeText(text) {
        if (typeof text !== 'string') text = String(text || '');
        try {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        } catch {
            return text.toLowerCase().replace(/\s+/g, ' ').trim();
        }
    }
    function isAllowedMediaType(item) {
        const mediaType = (item.mediaType || item.mediatype || '').toLowerCase();
        const ALLOWED_TYPES = new Set(['book', 'books', 'text', 'texts', 'article', 'articles', 'paper', 'papers', 'tcc', 'thesis', 'theses', 'dissertation', 'dissertations']);
        const FORBIDDEN_FORMATS = new Set(['audio', 'video', 'sound', 'movie', 'music', 'mp3', 'mp4', 'avi', 'mov', 'wav', 'ogg', 'mpeg']);
        if (mediaType && ALLOWED_TYPES.has(mediaType)) return true;
        if (mediaType && FORBIDDEN_FORMATS.has(mediaType)) return false;
        const format = (item.format || '').toLowerCase();
        if (format && FORBIDDEN_FORMATS.has(format)) return false;
        const type = (item.type || '').toLowerCase();
        if (type && ALLOWED_TYPES.has(type)) return true;
        const title = (item.title || '').toLowerCase();
        if (title.includes('tcc') || title.includes('thesis') || title.includes('dissertation') || title.includes('paper')) return true;
        return ALLOWED_TYPES.has(type);
    }

    // ========== 6. FETCH COM RETRY ROBUSTO ==========
    async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES, baseDelay = 500) {
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
                console.warn(`[Fetch] Tentativa ${attempt}/${retries} falhou: ${error.message} - ${url.substring(0, 80)}`);
                if (attempt === retries) return null;
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
            }
        }
        return null;
    }

    const CORS_PROXY = 'https://corsproxy.io/?';
    async function fetchWithCorsProxy(url) {
        try {
            const proxiedUrl = CORS_PROXY + encodeURIComponent(url);
            const response = await fetchWithRetry(proxiedUrl, {}, 2, 500);
            if (!response) return null;
            return await response.json();
        } catch (error) {
            console.warn(`[CORS Proxy] Falha para ${url}:`, error);
            return null;
        }
    }

    let lastOpenLibraryCall = 0;
    async function throttledOpenLibraryFetch(url) {
        const now = Date.now();
        const timeSinceLast = now - lastOpenLibraryCall;
        if (timeSinceLast < 1000) await new Promise(resolve => setTimeout(resolve, 1000 - timeSinceLast));
        lastOpenLibraryCall = Date.now();
        return fetchWithCorsProxy(url);
    }

    // ========== 7. EXTRAÇÃO DE METADADOS E CAPAS (mantido) ==========
    function normalizeYear(year) {
        if (!year) return null;
        if (typeof year === 'number') return year;
        const str = String(year).trim();
        const match = str.match(/\b(19|20)\d{2}\b/);
        return match ? parseInt(match[0], 10) : null;
    }
    function normalizePublisher(publisher) {
        if (!publisher) return null;
        if (Array.isArray(publisher)) return publisher[0];
        return String(publisher).trim();
    }
    function normalizeIsbn(isbn) {
        if (!isbn) return null;
        const cleaned = String(isbn).replace(/[-\s]/g, '');
        if (/^(97[89]\d{10}|\d{9}[\dXx])$/.test(cleaned)) return cleaned;
        return null;
    }
    async function extractMetadata(item) {
        const cacheKey = `${item.source}_${normalizeText(item.title)}_${normalizeText(item.author)}`;
        const cached = metadataCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < METADATA_CACHE_TTL) return cached.data;
        let publisher = null, year = null, isbn = null, language = null, pages = null;
        if (item.title) {
            const data = await throttledOpenLibraryFetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(item.title)}&limit=1`);
            const doc = data?.docs?.[0];
            if (doc) {
                publisher = normalizePublisher(doc.publisher);
                year = normalizeYear(doc.first_publish_year || doc.publish_year?.[0]);
                isbn = normalizeIsbn(doc.isbn?.[0]);
                language = doc.language?.[0];
                pages = doc.number_of_pages;
            }
        }
        if (!publisher && item.title) {
            try {
                let query = `intitle:"${encodeURIComponent(item.title)}"`;
                if (item.author) query += `+inauthor:"${encodeURIComponent(item.author)}"`;
                const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
                const response = await fetchWithRetry(url, {}, 1, 500);
                if (response) {
                    const data = await response.json();
                    const vol = data.items?.[0]?.volumeInfo;
                    if (vol) {
                        publisher = normalizePublisher(vol.publisher);
                        year = normalizeYear(vol.publishedDate);
                        isbn = normalizeIsbn(vol.industryIdentifiers?.find(i => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier);
                        language = vol.language;
                        pages = vol.pageCount;
                    }
                }
            } catch (e) {}
        }
        const metadata = { publisher, year, isbn, language, pages };
        metadataCache.set(cacheKey, { data: metadata, timestamp: Date.now() });
        return metadata;
    }
    async function resolveAdvancedCover(item) {
        const cacheKey = `${item.source}_${item.isbn || item.olid || normalizeText(item.title)}_${normalizeText(item.author)}`;
        const cached = coverCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < COVER_CACHE_TTL) return cached.url;
        if (item.isbn) {
            const url = `https://covers.openlibrary.org/b/isbn/${item.isbn}-L.jpg`;
            if (await imageExists(url)) { coverCache.set(cacheKey, { url, timestamp: Date.now() }); return url; }
        }
        if (item.olid) {
            const url = `https://covers.openlibrary.org/b/olid/${item.olid}-L.jpg`;
            if (await imageExists(url)) { coverCache.set(cacheKey, { url, timestamp: Date.now() }); return url; }
        }
        if (item.title) {
            const data = await throttledOpenLibraryFetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(item.title)}&limit=1`);
            const coverId = data?.docs?.[0]?.cover_i;
            if (coverId) {
                const url = `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
                if (await imageExists(url)) { coverCache.set(cacheKey, { url, timestamp: Date.now() }); return url; }
            }
        }
        if (item.title) {
            let query = `intitle:"${encodeURIComponent(item.title)}"`;
            if (item.author) query += `+inauthor:"${encodeURIComponent(item.author)}"`;
            const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
            try {
                const response = await fetchWithRetry(url, {}, 1, 500);
                if (response) {
                    const data = await response.json();
                    const img = data.items?.[0]?.volumeInfo?.imageLinks;
                    let coverUrl = img?.thumbnail || img?.smallThumbnail;
                    if (coverUrl) {
                        coverUrl = coverUrl.replace('&edge=curl', '').replace('&zoom=1', '&zoom=3');
                        if (await imageExists(coverUrl)) { coverCache.set(cacheKey, { url: coverUrl, timestamp: Date.now() }); return coverUrl; }
                    }
                }
            } catch (e) {}
        }
        if (item.source === 'Internet Archive' && item.link) {
            const identifier = item.link.split('/details/')[1];
            if (identifier) {
                const url = `https://archive.org/services/img/${identifier}`;
                if (await imageExists(url)) { coverCache.set(cacheKey, { url, timestamp: Date.now() }); return url; }
            }
        }
        if (item.type === 'tcc' || item.type === 'dissertation' || item.type === 'thesis') {
            const bgColors = ['#1a365d', '#2c5282', '#2b6cb0', '#3182ce'];
            const bgColor = bgColors[Math.floor(Math.random() * bgColors.length)];
            const text = encodeURIComponent(`${item.title}\n${item.author}\n${item.year || ''}`);
            const url = `https://placehold.co/400x600/${bgColor.slice(1)}/FFFFFF?text=${text}`;
            coverCache.set(cacheKey, { url, timestamp: Date.now() });
            return url;
        }
        const bgColors = ['#2563EB', '#22C55E', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];
        const randomColor = bgColors[Math.floor(Math.random() * bgColors.length)];
        const initials = (item.title || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
        const url = `https://placehold.co/200x260/${randomColor.slice(1)}/FFFFFF?text=${encodeURIComponent(initials || '?')}`;
        coverCache.set(cacheKey, { url, timestamp: Date.now() });
        return url;
    }
    async function imageExists(url) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            return response.ok;
        } catch { return false; }
    }

    // ========== 8. NORMALIZAÇÃO DE ITENS ==========
    async function normalizeSearchItem(raw, source, defaultType = 'book', identifier = null) {
        if (!isAllowedMediaType(raw)) return null;
        let link = raw.link || raw.url || '';
        let downloadUrl = raw.download_url || raw.download || raw.pdf_url || '';
        if (source === 'Internet Archive' && identifier) {
            link = `https://archive.org/details/${identifier}`;
            downloadUrl = `https://archive.org/download/${identifier}/${identifier}.pdf`;
        } else if (source === 'arXiv' && identifier) {
            link = `https://arxiv.org/abs/${identifier}`;
            downloadUrl = `https://arxiv.org/pdf/${identifier}.pdf`;
        } else if (source === 'Gutenberg' && identifier) {
            link = `https://www.gutenberg.org/ebooks/${identifier}`;
            downloadUrl = `https://www.gutenberg.org/files/${identifier}/${identifier}-0.txt`;
        } else if (source === 'OpenAlex' && identifier) {
            link = `https://openalex.org/works/${identifier}`;
            if (raw.doi) downloadUrl = `https://doi.org/${raw.doi}`;
        } else if (source === 'Local') {
            if (raw.download && !downloadUrl) downloadUrl = raw.download;
            if (raw.link && !link) link = raw.link;
        }
        link = link || '';
        downloadUrl = downloadUrl || '';
        let type = (raw.type || defaultType).toLowerCase();
        const typeMap = { 'journal':'article', 'research':'article', 'conference paper':'paper', 'undergraduate thesis':'tcc', 'master thesis':'dissertation', 'phd thesis':'thesis' };
        if (typeMap[type]) type = typeMap[type];
        const metadata = await extractMetadata(raw);
        const item = {
            id: raw.id || `${source}_${Date.now()}_${Math.random()}`,
            title: raw.title || 'Sem título',
            author: raw.author ? (typeof raw.author === 'string' ? raw.author : 'Autor desconhecido') : 'Autor desconhecido',
            year: metadata.year || normalizeYear(raw.year || raw.publication_year || (raw.date ? raw.date.slice(0,4) : '')),
            type: type,
            source: source,
            link: link,
            download_url: downloadUrl,
            publisher: metadata.publisher,
            isbn: metadata.isbn,
            language: metadata.language || raw.language || detectItemLanguage(raw),
            pages: metadata.pages,
            abstract: raw.abstract || raw.description || '',
            cover: raw.cover || null
        };
        if (!item.abstract || item.abstract.length < 20) {
            item.abstract = `${item.type === 'book' ? 'Livro' : item.type} sobre ${item.title}. Autor: ${item.author}. Ano: ${item.year || 'desconhecido'}.`;
        }
        item.cover = await resolveAdvancedCover(item);
        return item;
    }

    // ========== 9. BUSCA LOCAL (PRIORIDADE MÁXIMA) ==========
    async function searchLocalRepository(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const start = Date.now();
        const lower = normalizeText(query);
        const results = allLocalBooks.filter(book => (book.title && normalizeText(book.title).includes(lower)) || (book.author && normalizeText(book.author).includes(lower)));
        const elapsed = Date.now() - start;
        apiMetrics.local.total += 1;
        apiMetrics.local.valid += results.length;
        apiMetrics.local.avgTime = (apiMetrics.local.avgTime + elapsed) / 2;
        console.log(`[Local] ${results.length} resultados em ${elapsed}ms`);
        return results;
    }

    // ========== 10. BUSCA EXTERNA EM BACKGROUND ==========
    const PORTUGUESE_SYNONYMS = {
        'calculo': ['cálculo', 'matemática', 'derivada', 'integral', 'função', 'análise', 'calculus', 'mathematics', 'derivative', 'integral', 'analysis'],
        'matematica': ['matemática', 'cálculo', 'álgebra', 'geometria', 'estatística', 'mathematics', 'calculus', 'algebra', 'geometry', 'statistics'],
        'algebra': ['álgebra', 'estruturas algébricas', 'matrizes', 'vetores', 'algebra', 'linear algebra'],
        'programacao': ['programação', 'codificação', 'desenvolvimento', 'algoritmos', 'programming', 'coding', 'development', 'algorithms'],
        'fisica': ['física', 'mecânica', 'termodinâmica', 'eletromagnetismo', 'óptica', 'physics', 'mechanics', 'thermodynamics', 'electromagnetism'],
        'literatura': ['literatura', 'romance', 'poesia', 'teoria literária', 'literature', 'novel', 'poetry', 'literary theory']
    };
    const PORTUGUESE_TO_ENGLISH = {
        'calculo': 'calculus', 'matematica': 'mathematics', 'programacao': 'programming',
        'fisica': 'physics', 'literatura': 'literature', 'algebra': 'algebra'
    };
    const ACADEMIC_EXPANSIONS = {
        'calculus': ['derivative', 'integral', 'limit', 'function', 'analysis'],
        'programming': ['algorithm', 'data structure', 'software engineering'],
        'physics': ['quantum', 'mechanics', 'thermodynamics', 'electromagnetism'],
        'literature': ['novel', 'poetry', 'drama', 'criticism']
    };
    function expandSearchTerms(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [query];
        const normalized = normalizeText(query);
        const cached = expansionCache.get(normalized);
        if (cached && Date.now() - cached.timestamp < EXPANSION_CACHE_TTL) return cached.terms;
        const termsSet = new Set();
        termsSet.add(normalized);
        for (const [ptWord, synonyms] of Object.entries(PORTUGUESE_SYNONYMS)) {
            if (normalized.includes(ptWord) || ptWord.includes(normalized)) synonyms.forEach(s => termsSet.add(s.toLowerCase()));
        }
        for (const [pt, en] of Object.entries(PORTUGUESE_TO_ENGLISH)) {
            if (normalized.includes(pt)) termsSet.add(en);
        }
        const allTerms = Array.from(termsSet);
        for (const term of allTerms) {
            for (const [acadKey, expansions] of Object.entries(ACADEMIC_EXPANSIONS)) {
                if (term.includes(acadKey) || acadKey.includes(term)) expansions.forEach(exp => termsSet.add(exp.toLowerCase()));
            }
        }
        let finalTerms = Array.from(termsSet).slice(0, MAX_EXPANDED_TERMS);
        finalTerms.sort((a, b) => {
            const aScore = (a === normalized) ? 100 : (PORTUGUESE_TO_ENGLISH[a] ? 80 : 60);
            const bScore = (b === normalized) ? 100 : (PORTUGUESE_TO_ENGLISH[b] ? 80 : 60);
            return bScore - aScore;
        });
        expansionCache.set(normalized, { terms: finalTerms, timestamp: Date.now() });
        return finalTerms;
    }

    async function searchInternetArchive(query, signal) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const expanded = expandSearchTerms(query);
        const orQuery = expanded.map(t => `"${t}"`).join(' OR ');
        const fullQuery = `title:(${orQuery})`;
        const cacheKey = `ia_${normalizeText(fullQuery)}`;
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < API_CACHE_TTL) return cached.data;
        const start = Date.now();
        try {
            const params = new URLSearchParams({ q: fullQuery, fl: ['identifier', 'title', 'creator', 'year', 'mediatype'].join(','), rows: MAX_API_RESULTS, output: 'json' });
            const url = `https://archive.org/advancedsearch.php?${params.toString()}`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            if (!response) return [];
            const data = await response.json();
            const docs = data.response?.docs || [];
            const items = [];
            for (const doc of docs) {
                const normalized = await normalizeSearchItem({ title: doc.title, author: doc.creator, year: doc.year, type: 'book', mediaType: doc.mediatype }, 'Internet Archive', 'book', doc.identifier);
                if (normalized) items.push(normalized);
            }
            apiMetrics.internetarchive.total += docs.length;
            apiMetrics.internetarchive.valid += items.length;
            apiMetrics.internetarchive.avgTime = (apiMetrics.internetarchive.avgTime + (Date.now() - start)) / 2;
            apiCache.set(cacheKey, { data: items, timestamp: Date.now() });
            return items;
        } catch (error) { console.warn('[InternetArchive] Erro:', error); return []; }
    }

    async function searchOpenAlex(query, signal, filterType = null) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const expanded = expandSearchTerms(query);
        const orQuery = expanded.map(t => `"${t}"`).join(' OR ');
        const cacheKey = `oa_${normalizeText(orQuery)}_${filterType || ''}`;
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < API_CACHE_TTL) return cached.data;
        const start = Date.now();
        try {
            let typeFilter = '';
            if (filterType === 'article') typeFilter = '&filter=type:article';
            else if (filterType === 'paper') typeFilter = '&filter=type:proceedings_article';
            else if (filterType === 'dissertation') typeFilter = '&filter=type:dissertation';
            else if (filterType === 'thesis') typeFilter = '&filter=type:thesis';
            else if (filterType === 'tcc') typeFilter = '&filter=type:thesis';
            const url = `https://api.openalex.org/works?search=${encodeURIComponent(orQuery)}${typeFilter}&per-page=${MAX_API_RESULTS}&sort=relevance_score:desc`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            if (!response) return [];
            const data = await response.json();
            const results = data.results || [];
            const items = [];
            for (const work of results) {
                const normalized = await normalizeSearchItem({ title: work.title, author: work.authors?.[0]?.author?.display_name, year: work.publication_year, type: work.type, abstract: work.abstract, doi: work.doi }, 'OpenAlex', work.type, work.id?.split('/').pop());
                if (normalized) items.push(normalized);
            }
            apiMetrics.openalex.total += results.length;
            apiMetrics.openalex.valid += items.length;
            apiMetrics.openalex.avgTime = (apiMetrics.openalex.avgTime + (Date.now() - start)) / 2;
            apiCache.set(cacheKey, { data: items, timestamp: Date.now() });
            return items;
        } catch (error) { console.warn('[OpenAlex] Erro:', error); return []; }
    }

    async function searchArxiv(query, signal) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const expanded = expandSearchTerms(query);
        const orQuery = expanded.map(t => `all:${t}`).join('+OR+');
        const cacheKey = `arxiv_${normalizeText(orQuery)}`;
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < API_CACHE_TTL) return cached.data;
        const start = Date.now();
        try {
            const url = `https://export.arxiv.org/api/query?search_query=${orQuery}&start=0&max_results=${MAX_API_RESULTS}&sortBy=relevance&sortOrder=descending`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            if (!response) return [];
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const entries = xml.querySelectorAll('entry');
            const items = [];
            for (const entry of entries) {
                const id = entry.querySelector('id')?.textContent?.trim() || '';
                const arxivId = id.split('/abs/').pop();
                const normalized = await normalizeSearchItem({ title: entry.querySelector('title')?.textContent?.trim() || '', author: entry.querySelector('author name')?.textContent?.trim() || '', year: entry.querySelector('published')?.textContent?.slice(0,4) || '', abstract: entry.querySelector('summary')?.textContent?.trim() || '', type: 'paper' }, 'arXiv', 'paper', arxivId);
                if (normalized) items.push(normalized);
            }
            apiMetrics.arxiv.total += entries.length;
            apiMetrics.arxiv.valid += items.length;
            apiMetrics.arxiv.avgTime = (apiMetrics.arxiv.avgTime + (Date.now() - start)) / 2;
            apiCache.set(cacheKey, { data: items, timestamp: Date.now() });
            return items;
        } catch (error) {
            console.warn('[arXiv] Erro (não crítico):', error);
            return [];
        }
    }

    async function searchGutenberg(query, signal) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const expanded = expandSearchTerms(query);
        const orQuery = expanded.join('+OR+');
        const cacheKey = `gut_${normalizeText(orQuery)}`;
        const cached = apiCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < API_CACHE_TTL) return cached.data;
        const start = Date.now();
        try {
            const url = `https://gutendex.com/books?search=${orQuery}`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            if (!response) return [];
            const data = await response.json();
            const results = data.results || [];
            const items = [];
            for (const book of results) {
                const normalized = await normalizeSearchItem({ title: book.title, author: book.authors?.[0]?.name, year: null, type: 'book', download_url: book.formats?.['application/pdf'] || book.formats?.['application/epub+zip'], cover: book.formats?.['image/jpeg'] }, 'Gutenberg', 'book', book.id);
                if (normalized) items.push(normalized);
            }
            apiMetrics.gutenberg.total += results.length;
            apiMetrics.gutenberg.valid += items.length;
            apiMetrics.gutenberg.avgTime = (apiMetrics.gutenberg.avgTime + (Date.now() - start)) / 2;
            apiCache.set(cacheKey, { data: items, timestamp: Date.now() });
            return items;
        } catch (error) { console.warn('[Gutenberg] Erro:', error); return []; }
    }

    // ========== 11. SISTEMA DE PRIORIDADE E EXECUÇÃO LOCAL-FIRST ==========
    const AREA_KEYWORDS = {
        mathematics: ['math', 'mathematics', 'matemática', 'álgebra', 'algebra', 'calculus', 'cálculo', 'geometria', 'geometry', 'estatística', 'statistics'],
        technology: ['programming', 'programação', 'software', 'computer', 'algorithms', 'data science', 'machine learning', 'inteligência artificial', 'web', 'javascript', 'python', 'java'],
        physics: ['physics', 'física', 'mechanics', 'mecânica', 'thermodynamics', 'quantum', 'electromagnetism'],
        literature: ['literature', 'literatura', 'poetry', 'poesia', 'novel', 'literary theory', 'teoria literária']
    };
    function detectContentArea(query) {
        const normalized = normalizeText(query);
        for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
            for (const kw of keywords) if (normalized.includes(kw)) return area;
        }
        return 'general';
    }
    const REPOSITORY_PRIORITY = {
        mathematics: ['local', 'arxiv', 'internetarchive', 'openalex'],
        technology: ['local', 'internetarchive', 'openalex', 'gutenberg'],
        physics: ['local', 'arxiv', 'internetarchive', 'openalex'],
        literature: ['local', 'gutenberg', 'internetarchive', 'openalex'],
        general: ['local', 'internetarchive', 'openalex', 'gutenberg', 'arxiv']
    };
    let activeApiCalls = 0;
    let pendingApiCalls = [];
    async function runApiWithLimit(fn) {
        if (activeApiCalls >= MAX_CONCURRENT_APIS) await new Promise(resolve => pendingApiCalls.push(resolve));
        activeApiCalls++;
        try { return await fn(); } finally { activeApiCalls--; if (pendingApiCalls.length) pendingApiCalls.shift()(); }
    }

    // Busca externa em background (sem bloquear UI)
    async function searchExternalApis(query, signal, activeFilters, area) {
        const priorityOrder = REPOSITORY_PRIORITY[area] || REPOSITORY_PRIORITY.general;
        const apiTasks = [];
        for (const repo of priorityOrder) {
            if (repo === 'local') continue;
            let task = null;
            if (repo === 'internetarchive' && activeFilters.includes('book')) task = () => searchInternetArchive(query, signal);
            else if (repo === 'openalex') {
                if (activeFilters.includes('article')) task = () => searchOpenAlex(query, signal, 'article');
                else if (activeFilters.includes('paper')) task = () => searchOpenAlex(query, signal, 'paper');
                else if (activeFilters.includes('dissertation')) task = () => searchOpenAlex(query, signal, 'dissertation');
                else if (activeFilters.includes('thesis')) task = () => searchOpenAlex(query, signal, 'thesis');
                else if (activeFilters.includes('tcc')) task = () => searchOpenAlex(query, signal, 'tcc');
            } else if (repo === 'arxiv' && activeFilters.includes('paper')) task = () => searchArxiv(query, signal);
            else if (repo === 'gutenberg' && activeFilters.includes('book')) task = () => searchGutenberg(query, signal);
            if (task) apiTasks.push(() => runApiWithLimit(task));
        }
        const apiResults = await Promise.allSettled(apiTasks.map(t => t()));
        let allExternal = [];
        for (const res of apiResults) if (res.status === 'fulfilled' && res.value) allExternal.push(...res.value);
        return allExternal;
    }

    // ========== 12. FUNÇÃO PRINCIPAL DE BUSCA (LOCAL FIRST, PROGRESSIVA) ==========
    async function performSearchWithFilters(query) {
        const trimmed = normalizeText(query);
        const activeFilters = [];
        if (filterBooks && filterBooks.checked) activeFilters.push('book');
        if (filterArticles && filterArticles.checked) activeFilters.push('article');
        if (filterPapers && filterPapers.checked) activeFilters.push('paper');
        if (filterTCC && filterTCC.checked) activeFilters.push('tcc');
        if (filterDissertation && filterDissertation.checked) activeFilters.push('dissertation');
        if (filterThesis && filterThesis.checked) activeFilters.push('thesis');
        if (activeFilters.length === 0) { showEmptyState(); return; }
        const thisSearchId = ++currentSearchId;
        uiState.currentSearchId = thisSearchId;
        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        const cacheKey = `search_${trimmed}_${activeFilters.join('_')}`;
        const cached = searchCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
            console.log(`[Cache] Usando resultados cacheados para "${query}"`);
            showResults(cached.data);
            return;
        }

        // 1. Busca local (prioridade máxima) – exibe imediatamente
        showLoading();
        const localResults = await searchLocalRepository(trimmed);
        if (thisSearchId !== currentSearchId) return;
        let currentResults = [...localResults];
        // Exibe resultados locais imediatamente (já ordenados por fonte)
        if (currentResults.length > 0) {
            showResults(rankResultsBySource(currentResults));
        } else {
            // Ainda sem resultados, mas não mostra vazio porque APIs podem trazer
            // Mantém o loading ou uma mensagem suave
        }

        // 2. Busca APIs externas em background (não bloqueia)
        const area = detectContentArea(trimmed);
        console.log(`[Priority] Área detectada: ${area} para "${query}"`);
        
        // Timeout global para evitar espera infinita
        const globalTimeout = setTimeout(() => {
            if (uiState.isLoading && thisSearchId === currentSearchId) {
                console.warn('[Search] Global timeout');
                if (currentAbortController) currentAbortController.abort();
                if (currentResults.length === 0) showErrorState();
                else hideLoading();
            }
        }, MAX_SEARCH_TIME);

        try {
            const externalResults = await searchExternalApis(trimmed, signal, activeFilters, area);
            if (thisSearchId !== currentSearchId) return;
            // Mescla resultados externos com os locais (mantém prioridade local)
            const merged = mergeResultsWithoutDuplicates(currentResults, externalResults);
            // Atualiza cache e UI
            searchCache.set(cacheKey, { data: merged, timestamp: Date.now() });
            if (merged.length > 0) showResults(merged);
            else if (currentResults.length === 0 && externalResults.length === 0) showEmptyState();
        } catch (error) {
            console.error('[Search] Erro em APIs externas:', error);
            if (thisSearchId === currentSearchId && currentResults.length === 0) showErrorState();
        } finally {
            clearTimeout(globalTimeout);
            hideLoading();
        }
    }

    const debouncedPerformSearch = debounceSearch(performSearchWithFilters, 400);
    function debounceSearch(func, delay = 400) { let timeoutId; return function (...args) { clearTimeout(timeoutId); timeoutId = setTimeout(() => func.apply(this, args), delay); }; }

    // ========== 13. FUNÇÕES DE UI ==========
    function clearGrid() { if (grid) grid.innerHTML = ''; }
    function showLoading() {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        uiState.isLoading = true; uiState.hasResults = false; uiState.hasError = false;
        clearGrid();
        const skeleton = document.createElement('div');
        skeleton.className = 'loading-skeleton'; skeleton.id = 'loadingSkeleton';
        skeleton.innerHTML = `<div class="spinner"></div><p class="loading-text">${t('loading')}</p>`;
        skeleton.style.cssText = 'text-align: center; padding: 2rem; color: var(--text-secondary);';
        grid.appendChild(skeleton);
    }
    function hideLoading() { uiState.isLoading = false; const skeleton = document.getElementById('loadingSkeleton'); if (skeleton) skeleton.remove(); }
    function showEmptyState() {
        if (uiState.isLoading || uiState.hasResults || uiState.hasError) return;
        hideLoading(); clearGrid();
        const emptyDiv = document.createElement('div'); emptyDiv.className = 'empty-state'; emptyDiv.textContent = t('no_results');
        grid.appendChild(emptyDiv); document.getElementById('bookCount').innerText = '0';
    }
    function showErrorState() {
        uiState.hasError = true; uiState.hasResults = false;
        hideLoading(); clearGrid();
        const errorDiv = document.createElement('div'); errorDiv.className = 'error-state'; errorDiv.textContent = t('error_loading');
        grid.appendChild(errorDiv); document.getElementById('bookCount').innerText = '0';
    }
    function showResults(items) {
        uiState.hasResults = true; uiState.hasError = false;
        hideLoading(); clearGrid();
        renderItemsBatch(items);
    }
    function renderItemsBatch(items) {
        if (!grid) return;
        if (!items || items.length === 0) { showEmptyState(); return; }
        const fragment = document.createDocumentFragment();
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'book-mini-card'; card.style.cursor = 'pointer';
            const coverSrc = item.cover || 'https://placehold.co/200x260/1F2933/9CA3AF?text=Sem+Capa';
            let iconClass = '';
            switch (item.type) {
                case 'book': iconClass = 'fas fa-book'; break;
                case 'article': iconClass = 'fas fa-file-alt'; break;
                case 'paper': iconClass = 'fas fa-file-pdf'; break;
                case 'tcc': iconClass = 'fas fa-graduation-cap'; break;
                case 'dissertation': iconClass = 'fas fa-tasks'; break;
                case 'thesis': iconClass = 'fas fa-award'; break;
                default: iconClass = 'fas fa-file';
            }
            card.innerHTML = `
                <img class="mini-cover" src="${coverSrc}" alt="${escapeHtml(item.title)}" onerror="this.src='https://placehold.co/200x260/1F2933/9CA3AF?text=Sem+Capa'">
                <div class="mini-title">${escapeHtml(item.title)}</div>
                <div class="mini-author">${escapeHtml(item.author)}</div>
                <div class="mini-year">${escapeHtml(item.year || t('year_not_informed'))}</div>
                ${item.publisher ? `<div class="mini-publisher">${escapeHtml(item.publisher)}</div>` : ''}
                <div class="mini-type-tag"><i class="${iconClass}"></i> ${t('type_' + item.type, item.type)}</div>
            `;
            card.addEventListener('click', () => showModal(item));
            fragment.appendChild(card);
        });
        grid.appendChild(fragment);
        document.getElementById('bookCount').innerText = items.length;
        applyTranslations();
    }
    function showModal(item) {
        if (!item) return;
        const coverUrl = item.cover || 'https://placehold.co/140x200/1F2933/9CA3AF?text=Sem+Capa';
        modalBody.innerHTML = `
            <div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">
                <img class="modal-cover" src="${coverUrl}" alt="${escapeHtml(item.title)}" onerror="this.src='https://placehold.co/140x200/1F2933/9CA3AF?text=Sem+Capa'">
                <div class="modal-details">
                    <h2>${escapeHtml(item.title)}</h2>
                    <p><strong>${t('book_author')}:</strong> ${escapeHtml(item.author)}</p>
                    <p><strong>${t('book_year')}:</strong> ${escapeHtml(item.year || t('year_not_informed'))}</p>
                    <p><strong>${t('book_publisher')}:</strong> ${escapeHtml(item.publisher || t('unknown_publisher'))}</p>
                    <p><strong>${t('book_language')}:</strong> ${escapeHtml(item.language ? item.language.toUpperCase() : 'EN')}</p>
                    ${item.isbn ? `<p><strong>ISBN:</strong> ${escapeHtml(item.isbn)}</p>` : ''}
                    <p><strong>${t('book_publisher')}:</strong> ${escapeHtml(item.source)}</p>
                    <p><strong>Tipo:</strong> ${t('type_' + item.type, item.type)}</p>
                    <div class="modal-description">${escapeHtml(item.abstract || t('no_description'))}</div>
                    <div class="modal-actions" style="display: flex; gap: 0.8rem; margin-top: 1rem;">
                        ${item.link ? `<a href="${escapeHtml(item.link)}" class="download-btn" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${t('access_online')}</a>` : ''}
                        ${item.download_url ? `<a href="${escapeHtml(item.download_url)}" class="download-btn" target="_blank" rel="noopener noreferrer"><i class="fas fa-download"></i> ${t('download_book')}</a>` : ''}
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }
    function closeModal() { modal.style.display = 'none'; modalBody.innerHTML = ''; }

    // ========== 14. SISTEMA DE INTERNACIONALIZAÇÃO (i18n) ==========
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`../lang/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            translations = await response.json();
            console.log(`[i18n] Traduções carregadas: ${lang}`);
            return true;
        } catch (error) {
            console.error(`[i18n] Erro ao carregar ${lang}:`, error);
            if (lang !== 'pt-br') return loadTranslations('pt-br');
            translations = {
                search_placeholder: 'Search...', loading: 'Loading...', no_results: 'No results found.',
                error_loading: 'Error loading results. Try again later.', unknown_author: 'Unknown author',
                unknown_publisher: 'Unknown publisher', year_not_informed: 'Year not informed',
                type_book: 'Book', type_article: 'Article', type_paper: 'Paper', type_tcc: 'Undergraduate Thesis',
                type_dissertation: 'Dissertation', type_thesis: 'Thesis', filter_books: 'Books', filter_articles: 'Articles',
                filter_papers: 'Papers', filter_tcc: 'Undergraduate Thesis', filter_dissertation: 'Dissertations',
                filter_thesis: 'Theses', download_book: 'Download', access_online: 'Access Online',
                no_description: 'No description available.', close: 'Close', math: 'Mathematics', technology: 'Technology',
                physics: 'Physics', literature: 'Literature', initial_suggestions: 'Suggestions for you',
                search_button: 'Search', suggestions_title: 'Suggestions for you', book_author: 'Author',
                book_year: 'Year', book_language: 'Language', book_publisher: 'Publisher'
            };
            console.warn('[i18n] Usando fallback inglês hardcoded');
            return false;
        }
    }
    function t(key, replacements = {}) {
        let text = translations[key] || key;
        for (const [k, v] of Object.entries(replacements)) text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        return text;
    }
    function applyTranslations() {
        if (!translations) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' && el.placeholder !== undefined) el.placeholder = translations[key];
                else el.innerText = translations[key];
            }
        });
        if (searchInput) searchInput.placeholder = t('search_placeholder');
        const filterLabels = [
            { id: 'filterBooks', key: 'filter_books' }, { id: 'filterArticles', key: 'filter_articles' },
            { id: 'filterPapers', key: 'filter_papers' }, { id: 'filterTCC', key: 'filter_tcc' },
            { id: 'filterDissertation', key: 'filter_dissertation' }, { id: 'filterThesis', key: 'filter_thesis' }
        ];
        filterLabels.forEach(f => {
            const label = document.querySelector(`label[for="${f.id}"] span`);
            if (label && translations[f.key]) label.textContent = translations[f.key];
        });
        document.title = translations.app_title || 'Biblioteca';
        console.log('[i18n] Traduções aplicadas');
    }

    function getInitialLanguage() {
        const savedLang = localStorage.getItem('selectedLanguage');
        if (savedLang === 'pt-br' || savedLang === 'en') return savedLang;
        const userLang = detectUserLanguage();
        return userLang === 'pt' ? 'pt-br' : 'en';
    }
    function detectUserLanguage() {
        const saved = localStorage.getItem('selectedLanguage');
        if (saved === 'pt-br' || saved === 'en') return saved.slice(0, 2);
        const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        if (browserLang.startsWith('pt')) return 'pt';
        if (browserLang.startsWith('en')) return 'en';
        if (browserLang.startsWith('es')) return 'es';
        if (browserLang.startsWith('ja')) return 'ja';
        return 'en';
    }
    async function setLanguage(lang) {
        if (lang === currentLang && Object.keys(translations).length > 0) return;
        const success = await loadTranslations(lang);
        if (success) {
            currentLang = lang;
            localStorage.setItem('selectedLanguage', lang);
            applyTranslations();
            updateLanguageSelector(lang);
            setTimeout(() => loadInitialSuggestions(), 0);
        }
    }
    function updateLanguageSelector(lang) {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (ptBtn && enBtn) {
            if (lang === 'pt-br') { ptBtn.classList.add('active'); enBtn.classList.remove('active'); }
            else if (lang === 'en') { enBtn.classList.add('active'); ptBtn.classList.remove('active'); }
        }
    }

    // ========== 15. INICIALIZAÇÃO DOS FILTROS E DOM ==========
    function createFilters() {
        if (!filterContainer) {
            filterContainer = document.createElement('div');
            filterContainer.id = 'filterContainer';
            filterContainer.className = 'filter-bar';
            filterContainer.style.cssText = 'display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; align-items: center;';
            const searchBar = document.querySelector('.search-bar');
            if (searchBar) searchBar.parentNode.insertBefore(filterContainer, searchBar);
            else document.querySelector('.container')?.prepend(filterContainer);
        }
        const createFilter = (id, labelKey, iconClass, checked = false) => {
            if (document.getElementById(id)) return;
            const labelEl = document.createElement('label');
            labelEl.htmlFor = id;
            labelEl.style.cssText = 'display: inline-flex; align-items: center; gap: 0.5rem; background: var(--bg-tertiary); padding: 0.4rem 0.8rem; border-radius: 2rem; cursor: pointer; transition: 0.2s;';
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = checked; cb.style.cssText = 'width: 16px; height: 16px; cursor: pointer;';
            const icon = document.createElement('i'); icon.className = iconClass; icon.style.fontSize = '0.9rem';
            const span = document.createElement('span'); span.setAttribute('data-i18n', labelKey); span.textContent = labelKey;
            labelEl.appendChild(cb); labelEl.appendChild(icon); labelEl.appendChild(span);
            filterContainer.appendChild(labelEl);
            return cb;
        };
        filterBooks = createFilter('filterBooks', 'filter_books', 'fas fa-book', true);
        filterArticles = createFilter('filterArticles', 'filter_articles', 'fas fa-file-alt', false);
        filterPapers = createFilter('filterPapers', 'filter_papers', 'fas fa-file-pdf', false);
        filterTCC = createFilter('filterTCC', 'filter_tcc', 'fas fa-graduation-cap', false);
        filterDissertation = createFilter('filterDissertation', 'filter_dissertation', 'fas fa-tasks', false);
        filterThesis = createFilter('filterThesis', 'filter_thesis', 'fas fa-award', false);
    }
    function initializeDOMElements() {
        grid = document.getElementById('booksGrid');
        searchInput = document.getElementById('searchInput');
        modal = document.getElementById('bookModal');
        modalBody = document.getElementById('modalBody');
        closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });
    }
    function setupSearchEvents() {
        if (searchInput) searchInput.addEventListener('input', (e) => { currentSearchTerm = e.target.value; debouncedPerformSearch(currentSearchTerm); });
        const filters = [filterBooks, filterArticles, filterPapers, filterTCC, filterDissertation, filterThesis];
        filters.forEach(f => { if (f) f.addEventListener('change', () => debouncedPerformSearch(currentSearchTerm)); });
    }

    // ========== 16. SUGESTÕES INICIAIS ==========
    const FALLBACK_ITEMS = [
        { title: 'Introduction to Algorithms', author: 'Cormen', year: '2009', type: 'book', link: '#', download_url: '' },
        { title: 'Clean Code', author: 'Robert C. Martin', year: '2008', type: 'book', link: '#', download_url: '' },
        { title: 'Calculus: Early Transcendentals', author: 'James Stewart', year: '2015', type: 'book', link: '#', download_url: '' },
        { title: 'Linear Algebra Done Right', author: 'Sheldon Axler', year: '2015', type: 'book', link: '#', download_url: '' },
        { title: 'Introduction to Quantum Mechanics', author: 'David J. Griffiths', year: '2017', type: 'book', link: '#', download_url: '' },
        { title: 'Literary Theory: An Introduction', author: 'Terry Eagleton', year: '2008', type: 'book', link: '#', download_url: '' }
    ];
    async function loadLocalBooks() {
        try {
            const response = await fetch('books.json');
            if (response.ok) {
                const books = await response.json();
                const valid = [];
                for (const book of books) {
                    const normalized = await normalizeSearchItem(book, 'Local', book.type || 'book');
                    if (normalized) valid.push(normalized);
                }
                return valid;
            }
        } catch (e) { console.warn('[LocalBooks] Erro', e); }
        return [];
    }
    async function loadInitialSuggestions() {
        console.log('[Suggestions] Carregando sugestões iniciais...');
        const activeFilters = ['book', 'article', 'paper', 'tcc', 'dissertation', 'thesis'];
        const area = 'general';
        // Primeiro, busca local
        const localSuggestions = await searchLocalRepository('');
        let allItems = [...localSuggestions];
        // Depois, APIs externas
        try {
            const external = await searchExternalApis('', null, activeFilters, area);
            allItems = mergeResultsWithoutDuplicates(allItems, external);
        } catch (e) { console.warn('[Suggestions] Erro em APIs externas:', e); }
        if (allItems.length === 0) {
            console.log('[Suggestions] Usando fallback local');
            for (const item of FALLBACK_ITEMS) {
                const normalized = await normalizeSearchItem(item, 'Local', item.type);
                if (normalized) allItems.push(normalized);
            }
        }
        const unique = allItems.filter((item, idx, self) => self.findIndex(i => normalizeText(i.title) === normalizeText(item.title)) === idx);
        showResults(unique.slice(0, 30));
    }
    function escapeHtml(str) { return String(str || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

    // ========== 17. INICIALIZAÇÃO PRINCIPAL ==========
    async function initLanguage() {
        try {
            const initialLang = getInitialLanguage();
            currentLang = initialLang;
            await loadTranslations(initialLang);
            applyTranslations();
            console.log('[i18n] Inicialização do idioma concluída');
        } catch (error) {
            console.error('[i18n] Erro fatal na inicialização do idioma:', error);
            translations = {
                search_placeholder: 'Buscar...', loading: 'Carregando...', no_results: 'Nenhum resultado.',
                error_loading: 'Erro ao carregar resultados.', unknown_author: 'Autor desconhecido',
                unknown_publisher: 'Editora desconhecida', year_not_informed: 'Ano não informado',
                type_book: 'Livro', type_article: 'Artigo', type_paper: 'Paper', type_tcc: 'TCC',
                type_dissertation: 'Dissertação', type_thesis: 'Tese', filter_books: 'Livros',
                filter_articles: 'Artigos', filter_papers: 'Papers', filter_tcc: 'TCC',
                filter_dissertation: 'Dissertações', filter_thesis: 'Teses', download_book: 'Baixar',
                access_online: 'Acessar Online', no_description: 'Sem descrição disponível.',
                close: 'Fechar', math: 'Matemática', technology: 'Tecnologia', physics: 'Física',
                literature: 'Literatura', initial_suggestions: 'Sugestões para você',
                search_button: 'Buscar', suggestions_title: 'Sugestões para você',
                book_author: 'Autor', book_year: 'Ano', book_language: 'Idioma', book_publisher: 'Editora'
            };
            applyTranslations();
        }
    }
    async function initSearch() {
        try {
            allLocalBooks = await loadLocalBooks();
            await loadInitialSuggestions();
            console.log('[Search] Inicialização de busca concluída');
        } catch (error) {
            console.error('[Search] Erro na inicialização de busca:', error);
            if (grid) grid.innerHTML = `<div class="error-state">${t('error_loading')}</div>`;
        }
    }
    async function init() {
        console.log('[Init] Biblioteca iniciada');
        initializeDOMElements();
        createFilters();
        setupSearchEvents();
        await initLanguage();
        const langPtBtn = document.getElementById('langPtBtn');
        const langEnBtn = document.getElementById('langEnBtn');
        if (langPtBtn) langPtBtn.addEventListener('click', () => setLanguage('pt-br'));
        if (langEnBtn) langEnBtn.addEventListener('click', () => setLanguage('en'));
        setTimeout(() => initSearch(), 0);
        console.log('[Init] Inicialização concluída');
    }
    init();
});