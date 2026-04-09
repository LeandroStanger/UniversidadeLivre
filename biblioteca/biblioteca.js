// biblioteca.js – Versão final completa
// Integra: arXiv, CORE, Semantic Scholar, CrossRef, OpenAlex, Internet Archive, Gutenberg,
// HolyBooks, Obooko, InfoBooks, Google Books, Open Library.
// Download forçado com fallback para repositório, exclusão de audiobooks, prioridade de idioma,
// detecção de capa de alta resolução (Google Books com imagens large/extraLarge, Open Library com L/M/S).
// Tratamento de rate limit (429) com retry exponencial e fallback de proxy.

document.addEventListener('DOMContentLoaded', async () => {
    // ========== 1. CONFIGURAÇÕES GLOBAIS ==========
    let translations = {};
    let currentLang = 'pt-br';
    let grid, searchInput, modal, modalBody, closeModalBtn;
    let filterContainer, filterBooks, filterArticles, filterPapers, filterTCC, filterDissertation, filterThesis;

    let localBooksCache = [];
    let currentSearchTerm = '';
    let currentAbortController = null;
    let currentSearchId = 0;

    let searchCache = new Map();
    let apiCache = new Map();
    let metadataCache = new Map();

    let uiState = { isLoading: false, hasResults: false, hasError: false, currentSearchId: 0 };
    let loadingTimeout = null;

    // ========== 2. CONSTANTES ==========
    const SEARCH_CACHE_TTL = 5 * 60 * 1000;
    const API_CACHE_TTL = 10 * 60 * 1000;
    const METADATA_CACHE_TTL = 24 * 60 * 60 * 1000;
    const GLOBAL_TIMEOUT = 20000;
    const MIN_SEARCH_LENGTH = 2;
    const MAX_EXTERNAL_RESULTS = 20;

    const CORS_PROXIES = [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://proxy.cors.sh/'
    ];

    const DOWNLOAD_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.doc', '.docx', '.zip', '.rar'];
    const AUDIO_EXTENSIONS = ['.mp3', '.m4b', '.ogg', '.wav', '.flac', '.aac', '.m4a'];

    // ========== 3. FUNÇÕES AUXILIARES ==========
    function normalizeText(text) {
        if (typeof text !== 'string') text = String(text || '');
        try {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        } catch {
            return text.toLowerCase().trim();
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function generateId() {
        return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function formatAuthor(authorString) {
        if (!authorString) return 'Autor desconhecido';
        let authorStr = '';
        if (typeof authorString === 'string') {
            authorStr = authorString;
        } else if (Array.isArray(authorString)) {
            authorStr = authorString.join(', ');
        } else if (typeof authorString === 'object') {
            authorStr = authorString.name || authorString.display_name || authorString.creator || '';
            if (!authorStr) authorStr = JSON.stringify(authorString);
        } else {
            authorStr = String(authorString);
        }
        let authors = authorStr.split(/[,&eE]+\s*/).filter(a => a && a.trim().length > 0);
        if (authors.length === 0) return authorStr;
        if (authors.length <= 3) return authorStr;
        return authors.slice(0, 3).join(', ') + '...';
    }

    function detectDownloadLabelFromUrl(url) {
        if (!url) return 'Acessar';
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            if (DOWNLOAD_EXTENSIONS.some(ext => pathname.endsWith(ext))) return 'Baixar Livro';
            if (urlObj.hostname.includes('docs.google.com') || urlObj.hostname.includes('drive.google.com')) {
                return 'Acessar Online';
            }
            return 'Acessar Online';
        } catch {
            return 'Acessar Online';
        }
    }

    // ========== 4. DETECÇÃO DE AUDIOBOOKS ==========
    function isAudiobook(book) {
        if (book.type === 'audiobook') return true;
        const title = (book.title || '').toLowerCase();
        if (title.includes('audiobook') || title.includes('audio book') || title.includes('narrado') || title.includes('audiolivro')) return true;
        const url = book.download || '';
        if (AUDIO_EXTENSIONS.some(ext => url.toLowerCase().endsWith(ext))) return true;
        const source = (book.source || '').toLowerCase();
        if (source.includes('librivox') || source.includes('audible')) return true;
        return false;
    }

    // ========== 5. DOWNLOAD FORÇADO COM FALLBACK ==========
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
                if (confirm('Não foi possível baixar o arquivo diretamente. Deseja acessar o repositório do livro?')) {
                    window.open(fallbackUrl, '_blank');
                }
            } else {
                window.open(url, '_blank');
            }
        }
    }

    // ========== 6. INFERÊNCIA DE TIPO ==========
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

    // ========== 7. FETCH COM RETRY E BACKOFF ==========
    async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
        for (let i = 0; i <= maxRetries; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000);
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(timeoutId);
                if (response.status === 429) {
                    const delay = baseDelay * Math.pow(2, i);
                    console.warn(`[Rate Limit] 429 para ${url}, aguardando ${delay}ms`);
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
        } catch (e) {
            console.warn(`[Proxy] Falha direta para ${url}:`, e.message);
        }
        for (let i = 0; i < retries; i++) {
            for (const proxy of CORS_PROXIES) {
                try {
                    const proxyUrl = proxy + encodeURIComponent(url);
                    const response = await fetchWithRetry(proxyUrl, {}, 1, 1000);
                    if (response.ok) return response;
                } catch (e) {}
            }
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
        throw new Error(`Falha ao acessar ${url} após tentativas com proxies`);
    }

    // ========== 8. ENRIQUECIMENTO DE METADADOS (COM CAPA DE ALTA RESOLUÇÃO E FALLBACK PROXY) ==========
    async function fetchGoogleBooksCover(title, author, isbn) {
        if (!title && !isbn) return null;
        const cacheKey = `google_cover_${isbn || normalizeText(title)}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < METADATA_CACHE_TTL) {
            return metadataCache.get(cacheKey).data;
        }
        try {
            let query = isbn ? `isbn:${isbn}` : `intitle:${encodeURIComponent(title)}`;
            if (author) query += `+inauthor:${encodeURIComponent(author)}`;
            const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
            const response = await fetchWithRetry(url, {}, 2, 2000);
            const data = await response.json();
            if (!data.items || data.items.length === 0) return null;
            const volume = data.items[0].volumeInfo;
            const imageLinks = volume.imageLinks || {};
            const cover = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.thumbnail || null;
            if (cover && cover.startsWith('http')) {
                const cleanCover = cover.split('&')[0];
                metadataCache.set(cacheKey, { data: cleanCover, timestamp: Date.now() });
                return cleanCover;
            }
            return null;
        } catch (error) {
            console.warn('[Google Books] erro ao buscar capa (direto), tentando proxy...', error.message);
            try {
                let query = isbn ? `isbn:${isbn}` : `intitle:${encodeURIComponent(title)}`;
                if (author) query += `+inauthor:${encodeURIComponent(author)}`;
                const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
                const response = await fetchWithProxy(url, 15000, 1);
                const data = await response.json();
                if (!data.items || data.items.length === 0) return null;
                const volume = data.items[0].volumeInfo;
                const imageLinks = volume.imageLinks || {};
                const cover = imageLinks.extraLarge || imageLinks.large || imageLinks.medium || imageLinks.thumbnail || null;
                if (cover && cover.startsWith('http')) {
                    const cleanCover = cover.split('&')[0];
                    metadataCache.set(cacheKey, { data: cleanCover, timestamp: Date.now() });
                    return cleanCover;
                }
                return null;
            } catch (proxyError) {
                console.warn('[Google Books] erro final ao buscar capa:', proxyError.message);
                return null;
            }
        }
    }

    async function fetchOpenLibraryCover(title, author, isbn) {
        if (!title && !isbn) return null;
        const cacheKey = `openlib_cover_${isbn || normalizeText(title)}`;
        if (metadataCache.has(cacheKey) && Date.now() - metadataCache.get(cacheKey).timestamp < METADATA_CACHE_TTL) {
            return metadataCache.get(cacheKey).data;
        }
        try {
            let query = isbn ? `isbn:${isbn}` : `title:${encodeURIComponent(title)}`;
            if (author) query += `&author:${encodeURIComponent(author)}`;
            const url = `https://openlibrary.org/search.json?q=${query}&limit=1`;
            const response = await fetchWithRetry(url, {}, 2, 2000);
            const data = await response.json();
            if (!data.docs || data.docs.length === 0) return null;
            const doc = data.docs[0];
            const coverId = doc.cover_i;
            if (!coverId) return null;
            for (const size of ['L', 'M', 'S']) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
                const check = await fetch(coverUrl, { method: 'HEAD' });
                if (check.ok) {
                    metadataCache.set(cacheKey, { data: coverUrl, timestamp: Date.now() });
                    return coverUrl;
                }
            }
            return null;
        } catch (error) {
            console.warn('[Open Library] erro ao buscar capa (direto), tentando proxy...', error.message);
            try {
                let query = isbn ? `isbn:${isbn}` : `title:${encodeURIComponent(title)}`;
                if (author) query += `&author:${encodeURIComponent(author)}`;
                const url = `https://openlibrary.org/search.json?q=${query}&limit=1`;
                const response = await fetchWithProxy(url, 15000, 1);
                const data = await response.json();
                if (!data.docs || data.docs.length === 0) return null;
                const doc = data.docs[0];
                const coverId = doc.cover_i;
                if (!coverId) return null;
                for (const size of ['L', 'M', 'S']) {
                    const coverUrl = `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg`;
                    const check = await fetch(coverUrl, { method: 'HEAD' });
                    if (check.ok) {
                        metadataCache.set(cacheKey, { data: coverUrl, timestamp: Date.now() });
                        return coverUrl;
                    }
                }
                return null;
            } catch (proxyError) {
                console.warn('[Open Library] erro final ao buscar capa:', proxyError.message);
                return null;
            }
        }
    }

    function generateEnhancedColorCover(title) {
        if (!title) title = 'Sem título';
        const colors = ['#FF6B6B', '#4ECDC4', '#556270', '#C7F464', '#FFB400', '#6A4C93', '#2EC4B6', '#FF9F1C', '#E63946', '#457B9D', '#F4A261', '#2A9D8F'];
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

    async function enrichBookMetadata(book) {
        if (book.cover && book.cover.trim() !== '') return book;
        let cover = null;
        if (book.isbn) {
            cover = await fetchGoogleBooksCover(null, null, book.isbn);
            if (!cover) cover = await fetchOpenLibraryCover(null, null, book.isbn);
        }
        if (!cover && book.title) {
            cover = await fetchGoogleBooksCover(book.title, book.author);
            if (!cover) cover = await fetchOpenLibraryCover(book.title, book.author);
        }
        if (!cover && book.sourceType === 'internet_archive' && book.identifier) {
            cover = `https://archive.org/services/img/${book.identifier}`;
        }
        const enriched = { ...book };
        if (cover) enriched.cover = cover;
        return enriched;
    }

    // ========== 9. NORMALIZAÇÃO DE CAMPOS ==========
    function normalizeBookFields(book) {
        const inferredType = book.type || inferBookType(book);
        let finalLabel = book.download_label;
        if (!finalLabel && book.download) {
            finalLabel = detectDownloadLabelFromUrl(book.download);
        }
        return {
            id: book.id || generateId(),
            title: book.title || 'Sem título',
            author: formatAuthor(book.author || 'Autor desconhecido'),
            rawAuthor: book.author || 'Autor desconhecido',
            publisher: book.publisher || '',
            year: book.year || null,
            description: book.description || '',
            cover: book.cover || null,
            download: book.download || book.download_url || null,
            downloadLabel: finalLabel || 'Acessar',
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

    // ========== 10. BOTÃO PRINCIPAL COM FALLBACK ==========
    function createActionButton(book) {
        const label = book.downloadLabel;
        const url = book.download;
        const repoLink = book.repositoryLink;
        if (!url && !repoLink) {
            const disabled = document.createElement('span');
            disabled.textContent = label || 'Indisponível';
            disabled.className = 'action-btn disabled-btn';
            return disabled;
        }
        const btn = document.createElement('a');
        btn.textContent = label;
        btn.className = 'action-btn download-btn';
        btn.href = '#';
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (label === 'Baixar Livro' && url) {
                const filename = (book.title || 'documento').replace(/[^a-z0-9]/gi, '_') + '.pdf';
                await forceDownload(url, filename, repoLink);
            } else if (url) {
                window.open(url, '_blank');
            } else if (repoLink) {
                window.open(repoLink, '_blank');
            } else {
                alert('Nenhum link disponível para este item.');
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
            repoBtn.textContent = book.repositoryName ? `Repositório: ${book.repositoryName}` : 'Repositório';
            repoBtn.href = book.repositoryLink;
            repoBtn.target = '_blank';
            repoBtn.rel = 'noopener noreferrer';
            repoBtn.className = 'action-btn repo-btn';
            container.appendChild(repoBtn);
        }
    }

    // ========== 11. RESOLUÇÃO DE CAPA ==========
    async function resolveBookCover(book) {
        if (book.cover && book.cover.trim() !== '') return book.cover;
        const enriched = await enrichBookMetadata(book);
        if (enriched.cover) return enriched.cover;
        return generateEnhancedColorCover(book.title);
    }

    // ========== 12. APIs EXTERNAS ==========
    // --- ARXIV ---
    async function searchArxiv(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `arxiv_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${MAX_EXTERNAL_RESULTS}&sortBy=relevance&sortOrder=descending`;
            const response = await fetchWithProxy(url, 15000);
            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const entries = xmlDoc.querySelectorAll('entry');
            const results = [];
            for (let i = 0; i < Math.min(entries.length, MAX_EXTERNAL_RESULTS); i++) {
                const entry = entries[i];
                const title = entry.querySelector('title')?.textContent?.trim() || 'Sem título';
                const authors = Array.from(entry.querySelectorAll('author name')).map(a => a.textContent);
                const authorStr = authors.join(', ');
                const year = entry.querySelector('published')?.textContent?.slice(0,4) || null;
                let abstract = entry.querySelector('summary')?.textContent?.trim() || '';
                if (abstract.length > 500) abstract = abstract.slice(0, 497) + '...';
                const id = entry.querySelector('id')?.textContent?.split('/abs/').pop() || '';
                const pdfUrl = id ? `https://arxiv.org/pdf/${id}.pdf` : null;
                let journalRef = '';
                const journalRefElement = entry.getElementsByTagName('arxiv:journal_ref')[0];
                if (journalRefElement) journalRef = journalRefElement.textContent || '';
                results.push({
                    id: `arxiv_${id}`,
                    title: title,
                    author: formatAuthor(authorStr),
                    rawAuthor: authorStr,
                    publisher: journalRef || 'arXiv',
                    year: year,
                    description: abstract,
                    download: pdfUrl,
                    cover: null,
                    language: 'en',
                    type: 'paper',
                    sourceType: 'arxiv',
                    source: 'arXiv',
                    download_label: pdfUrl ? 'Baixar Livro' : 'Acessar Online'
                });
            }
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.error('[arXiv] erro:', error);
            return [];
        }
    }

    // --- CORE API ---
    async function searchCORE(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `core_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://api.core.ac.uk/v3/search/works?q=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetchWithProxy(url, 15000);
            const data = await response.json();
            const items = data.results || [];
            const results = items.map(item => {
                let authors = item.authors;
                if (Array.isArray(authors)) authors = authors.join(', ');
                return {
                    id: `core_${item.id}`,
                    title: item.title || 'Sem título',
                    author: formatAuthor(authors || 'Autor desconhecido'),
                    rawAuthor: authors || '',
                    publisher: item.publisher || 'CORE',
                    year: item.yearPublished || null,
                    description: item.abstract || '',
                    download: item.downloadUrl || null,
                    cover: null,
                    language: 'en',
                    type: 'paper',
                    sourceType: 'core',
                    source: 'CORE',
                    download_label: item.downloadUrl ? 'Baixar Livro' : 'Acessar Online'
                };
            });
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.error('[CORE] erro:', error);
            return [];
        }
    }

    // --- Semantic Scholar ---
    async function searchSemanticScholar(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `ss_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}&fields=title,authors,year,abstract,openAccessPdf`;
            const response = await fetchWithRetry(url, {}, 2, 2000);
            const data = await response.json();
            if (!data.data) return [];
            const results = data.data.map(paper => {
                let authors = paper.authors?.map(a => a.name).join(', ') || 'Autor desconhecido';
                return {
                    id: `ss_${paper.paperId}`,
                    title: paper.title || 'Sem título',
                    author: formatAuthor(authors),
                    rawAuthor: authors,
                    publisher: 'Semantic Scholar',
                    year: paper.year || null,
                    description: paper.abstract || '',
                    download: paper.openAccessPdf?.url || null,
                    cover: null,
                    language: 'en',
                    type: 'paper',
                    sourceType: 'semantic_scholar',
                    source: 'Semantic Scholar',
                    download_label: paper.openAccessPdf?.url ? 'Baixar Livro' : 'Acessar Online'
                };
            });
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.warn('[SemanticScholar] erro direto, tentando proxy...', error.message);
            try {
                const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}&fields=title,authors,year,abstract,openAccessPdf`;
                const response = await fetchWithProxy(url, 15000, 2);
                const data = await response.json();
                if (!data.data) return [];
                const results = data.data.map(paper => {
                    let authors = paper.authors?.map(a => a.name).join(', ') || 'Autor desconhecido';
                    return {
                        id: `ss_${paper.paperId}`,
                        title: paper.title || 'Sem título',
                        author: formatAuthor(authors),
                        rawAuthor: authors,
                        publisher: 'Semantic Scholar',
                        year: paper.year || null,
                        description: paper.abstract || '',
                        download: paper.openAccessPdf?.url || null,
                        cover: null,
                        language: 'en',
                        type: 'paper',
                        sourceType: 'semantic_scholar',
                        source: 'Semantic Scholar',
                        download_label: paper.openAccessPdf?.url ? 'Baixar Livro' : 'Acessar Online'
                    };
                });
                apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
                return results;
            } catch (proxyError) {
                console.error('[SemanticScholar] erro final:', proxyError);
                return [];
            }
        }
    }

    // --- CrossRef ---
    async function searchCrossRef(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `crossref_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetchWithRetry(url, {}, 2, 2000);
            const data = await response.json();
            const items = data.message?.items || [];
            const results = items.map(item => {
                const authorList = item.author?.map(a => a.family || a.given).join(', ') || 'Autor desconhecido';
                return {
                    id: `cr_${item.DOI?.replace(/[\/.]/g, '_')}`,
                    title: item.title?.[0] || 'Sem título',
                    author: formatAuthor(authorList),
                    rawAuthor: authorList,
                    publisher: item.publisher || 'CrossRef',
                    year: item.created?.['date-parts']?.[0]?.[0] || null,
                    description: item.abstract || '',
                    download: item.link?.find(l => l.contentType === 'text/html')?.URL || null,
                    cover: null,
                    language: item.language || 'en',
                    type: 'article',
                    sourceType: 'crossref',
                    source: 'CrossRef',
                    download_label: 'Acessar Online'
                };
            });
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.error('[CrossRef] erro:', error);
            return [];
        }
    }

    // --- OpenAlex ---
    async function searchOpenAlex(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `openalex_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${MAX_EXTERNAL_RESULTS}&sort=relevance_score:desc`;
            const response = await fetchWithRetry(url, {}, 2, 2000);
            const data = await response.json();
            const results = (data.results || []).map(work => {
                let type = 'paper';
                const workType = work.type?.toLowerCase();
                if (workType === 'article') type = 'article';
                else if (workType === 'dissertation') type = 'dissertation';
                else if (workType === 'thesis') type = 'thesis';
                else if (workType === 'book') type = 'book';
                else if (workType === 'tcc') type = 'tcc';
                const authorList = work.authorships?.[0]?.author?.display_name || 'Autor desconhecido';
                const is_oa = work.open_access?.is_oa || false;
                const pdf_url = work.open_access?.oa_url || null;
                return {
                    id: `oa_${work.id}`,
                    title: work.title || 'Sem título',
                    author: formatAuthor(authorList),
                    rawAuthor: authorList,
                    publisher: work.host_organization_name || 'OpenAlex',
                    year: work.publication_year || null,
                    description: work.abstract_inverted_index ? 'Resumo disponível na fonte original' : '',
                    download: pdf_url,
                    cover: null,
                    language: 'en',
                    type: type,
                    sourceType: 'openalex',
                    source: 'OpenAlex',
                    download_label: (is_oa && pdf_url) ? 'Baixar Livro' : 'Acessar Online'
                };
            });
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.error('[OpenAlex] erro:', error);
            return [];
        }
    }

    // --- Internet Archive (com identifier para capa) ---
    async function searchInternetArchive(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `ia_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=title&fl[]=creator&fl[]=year&fl[]=description&fl[]=identifier&fl[]=downloads&rows=${MAX_EXTERNAL_RESULTS}&page=1&output=json`;
            const response = await fetchWithProxy(url, 15000);
            const data = await response.json();
            const docs = data.response?.docs || [];
            const results = docs.map(doc => {
                const pdfUrl = `https://archive.org/download/${doc.identifier}/${doc.identifier}.pdf`;
                let creator = doc.creator;
                if (Array.isArray(creator)) creator = creator.join(', ');
                else if (creator && typeof creator === 'object') creator = JSON.stringify(creator);
                else creator = creator || 'Autor desconhecido';
                return {
                    id: `ia_${doc.identifier}`,
                    title: doc.title || 'Sem título',
                    author: formatAuthor(creator),
                    rawAuthor: creator,
                    publisher: 'Internet Archive',
                    year: doc.year || null,
                    description: doc.description || '',
                    download: pdfUrl,
                    cover: `https://archive.org/services/img/${doc.identifier}`,
                    identifier: doc.identifier,
                    language: 'en',
                    type: 'book',
                    sourceType: 'internet_archive',
                    source: 'Internet Archive',
                    download_label: 'Baixar Livro'
                };
            });
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.error('[InternetArchive] erro:', error);
            return [];
        }
    }

    // --- Project Gutenberg ---
    async function searchGutenberg(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `gutenberg_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}&limit=${MAX_EXTERNAL_RESULTS}`;
            const response = await fetchWithRetry(url, {}, 2, 2000);
            const data = await response.json();
            const results = (data.results || []).map(book => {
                const formats = book.formats || {};
                const pdfUrl = formats['application/pdf'] || formats['text/plain'] || Object.values(formats)[0] || null;
                const authors = book.authors?.map(a => a.name).join(', ') || 'Autor desconhecido';
                return {
                    id: `gut_${book.id}`,
                    title: book.title || 'Sem título',
                    author: formatAuthor(authors),
                    rawAuthor: authors,
                    publisher: 'Project Gutenberg',
                    year: null,
                    description: book.subjects?.join(', ') || '',
                    download: pdfUrl,
                    cover: book.formats['image/jpeg'] || null,
                    language: book.languages?.[0] || 'en',
                    type: 'book',
                    sourceType: 'gutenberg',
                    source: 'Gutenberg',
                    download_label: pdfUrl ? 'Baixar Livro' : 'Acessar Online'
                };
            });
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.error('[Gutenberg] erro:', error);
            return [];
        }
    }

    // --- HolyBooks.com ---
    async function searchHolyBooks(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `holy_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://www.holybooks.com/?s=${encodeURIComponent(query)}&post_type=post`;
            const response = await fetchWithProxy(url, 15000);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const articles = doc.querySelectorAll('article');
            const results = [];
            for (let i = 0; i < Math.min(articles.length, MAX_EXTERNAL_RESULTS); i++) {
                const article = articles[i];
                const titleEl = article.querySelector('h2 a');
                const title = titleEl?.textContent?.trim() || 'Sem título';
                const link = titleEl?.href || '';
                const descEl = article.querySelector('.entry-summary p');
                const description = descEl?.textContent?.trim() || '';
                results.push({
                    id: `holy_${i}_${Date.now()}`,
                    title: title,
                    author: 'HolyBooks',
                    rawAuthor: 'HolyBooks',
                    publisher: 'HolyBooks.com',
                    year: null,
                    description: description,
                    download: link,
                    cover: null,
                    language: 'en',
                    type: 'book',
                    sourceType: 'holybooks',
                    source: 'HolyBooks',
                    download_label: 'Acessar Online'
                });
            }
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.warn('[HolyBooks] erro (ignorado):', error);
            return [];
        }
    }

    // --- Obooko ---
    async function searchObooko(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `obooko_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://www.obooko.com/search.php?q=${encodeURIComponent(query)}`;
            const response = await fetchWithProxy(url, 15000);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.book-item');
            const results = [];
            for (let i = 0; i < Math.min(items.length, MAX_EXTERNAL_RESULTS); i++) {
                const item = items[i];
                const titleEl = item.querySelector('.book-title a');
                const title = titleEl?.textContent?.trim() || 'Sem título';
                const link = titleEl?.href || '';
                const author = item.querySelector('.book-author')?.textContent?.replace('by', '').trim() || 'Autor desconhecido';
                const description = item.querySelector('.book-description')?.textContent?.trim() || '';
                results.push({
                    id: `obooko_${i}_${Date.now()}`,
                    title: title,
                    author: formatAuthor(author),
                    rawAuthor: author,
                    publisher: 'Obooko',
                    year: null,
                    description: description,
                    download: link,
                    cover: null,
                    language: 'en',
                    type: 'book',
                    sourceType: 'obooko',
                    source: 'Obooko',
                    download_label: 'Acessar Online'
                });
            }
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.warn('[Obooko] erro (ignorado):', error);
            return [];
        }
    }

    // --- InfoBooks ---
    async function searchInfoBooks(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        const cacheKey = `infobooks_${normalizeText(query)}`;
        if (apiCache.has(cacheKey) && Date.now() - apiCache.get(cacheKey).timestamp < API_CACHE_TTL) {
            return apiCache.get(cacheKey).data;
        }
        try {
            const url = `https://www.infobooks.org/search?q=${encodeURIComponent(query)}`;
            const response = await fetchWithProxy(url, 15000);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const items = doc.querySelectorAll('.book-item');
            const results = [];
            for (let i = 0; i < Math.min(items.length, MAX_EXTERNAL_RESULTS); i++) {
                const item = items[i];
                const titleEl = item.querySelector('h3 a');
                const title = titleEl?.textContent?.trim() || 'Sem título';
                const link = titleEl?.href || '';
                const author = item.querySelector('.author')?.textContent?.replace('by', '').trim() || 'Autor desconhecido';
                const description = item.querySelector('.description')?.textContent?.trim() || '';
                results.push({
                    id: `infobooks_${i}_${Date.now()}`,
                    title: title,
                    author: formatAuthor(author),
                    rawAuthor: author,
                    publisher: 'InfoBooks',
                    year: null,
                    description: description,
                    download: link,
                    cover: null,
                    language: 'es',
                    type: 'book',
                    sourceType: 'infobooks',
                    source: 'InfoBooks',
                    download_label: 'Acessar Online'
                });
            }
            apiCache.set(cacheKey, { data: results, timestamp: Date.now() });
            return results;
        } catch (error) {
            console.warn('[InfoBooks] erro (ignorado):', error);
            return [];
        }
    }

    // Combina todas as fontes externas
    async function searchExternalBooks(query) {
        const promises = [
            searchArxiv(query), searchCORE(query), searchSemanticScholar(query),
            searchCrossRef(query), searchOpenAlex(query), searchInternetArchive(query),
            searchGutenberg(query), searchHolyBooks(query), searchObooko(query),
            searchInfoBooks(query)
        ];
        const results = await Promise.allSettled(promises);
        const all = [];
        for (const res of results) {
            if (res.status === 'fulfilled' && Array.isArray(res.value)) all.push(...res.value);
        }
        const unique = [];
        const seen = new Set();
        for (const book of all) {
            const key = `${normalizeText(book.title)}|${normalizeText(book.rawAuthor || book.author)}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(book);
            }
        }
        return unique;
    }

    // ========== 13. CARREGAMENTO LOCAL ==========
    async function loadLocalBooks() {
        const paths = ['./books.json', 'books.json', '../books.json', 'data/books.json'];
        for (const path of paths) {
            try {
                const response = await fetch(path, { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`[Local] ${data.length} itens carregados de ${path}`);
                        return data.map(book => ({
                            ...book,
                            sourceType: 'local',
                            source: 'Local',
                            type: book.type || inferBookType(book)
                        }));
                    }
                }
            } catch (e) {}
        }
        console.error('[Local] books.json não encontrado');
        return [];
    }

    function searchLocalBooks(query) {
        if (!localBooksCache.length) return [];
        if (!query || query.length < MIN_SEARCH_LENGTH) return localBooksCache.slice(0, 30);
        const normalizedQuery = normalizeText(query);
        return localBooksCache.filter(book =>
            normalizeText(book.title || '').includes(normalizedQuery) ||
            normalizeText(book.author || '').includes(normalizedQuery) ||
            normalizeText(book.description || '').includes(normalizedQuery)
        );
    }

    // ========== 14. CRIAÇÃO DE CARD E MODAL ==========
    async function createBookCard(item) {
        if (!item || !item.title) return null;
        let normalized = normalizeBookFields(item);
        const coverUrl = await resolveBookCover(normalized);
        normalized.cover = coverUrl;

        let typeTagHtml = '';
        if (normalized.type && translations[`type_${normalized.type}`]) {
            const typeText = t(`type_${normalized.type}`, normalized.type);
            let iconClass = '';
            switch (normalized.type) {
                case 'book': iconClass = 'fas fa-book'; break;
                case 'article': iconClass = 'fas fa-file-alt'; break;
                case 'paper': iconClass = 'fas fa-file-pdf'; break;
                case 'tcc': iconClass = 'fas fa-graduation-cap'; break;
                case 'dissertation': iconClass = 'fas fa-tasks'; break;
                case 'thesis': iconClass = 'fas fa-award'; break;
                default: iconClass = 'fas fa-file';
            }
            typeTagHtml = `<div class="mini-type-tag"><i class="${iconClass}"></i> ${typeText}</div>`;
        }

        const card = document.createElement('div');
        card.className = 'book-mini-card';
        card.style.cursor = 'pointer';
        card.innerHTML = `
            <img class="mini-cover" src="${coverUrl}" alt="${escapeHtml(normalized.title)}" onerror="this.src='${generateEnhancedColorCover(normalized.title)}'">
            <div class="mini-title">${escapeHtml(normalized.title)}</div>
            <div class="mini-author">${escapeHtml(normalized.author)}</div>
            <div class="mini-year">${escapeHtml(normalized.year || t('year_not_informed'))}</div>
            ${normalized.publisher ? `<div class="mini-publisher">${escapeHtml(normalized.publisher)}</div>` : ''}
            ${typeTagHtml}
        `;
        card.addEventListener('click', () => showModal(normalized));
        return card;
    }

    async function showModal(item) {
        if (!item) return;
        const enriched = await enrichBookMetadata(item);
        const coverUrl = enriched.cover || await resolveBookCover(enriched);
        const fullAuthor = enriched.rawAuthor || enriched.author;
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
                </div>
            </div>
        `;
        renderActionButtons(enriched);
        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    }

    // ========== 15. UI DE CARREGAMENTO E RESULTADOS ==========
    function showLoading() {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        uiState.isLoading = true;
        if (!grid) return;
        grid.innerHTML = '';
        const skeleton = document.createElement('div');
        skeleton.className = 'loading-skeleton';
        skeleton.innerHTML = `<div class="spinner"></div><p class="loading-text">${t('loading')}</p>`;
        grid.appendChild(skeleton);
    }

    function hideLoading() {
        uiState.isLoading = false;
        const skeleton = document.querySelector('.loading-skeleton');
        if (skeleton) skeleton.remove();
    }

    function showEmptyState() {
        if (uiState.isLoading || uiState.hasResults || uiState.hasError) return;
        if (!grid) return;
        grid.innerHTML = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.textContent = t('no_results');
        grid.appendChild(emptyDiv);
        document.getElementById('bookCount').innerText = '0';
    }

    function showErrorState() {
        uiState.hasError = true;
        if (!grid) return;
        grid.innerHTML = '';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-state';
        errorDiv.textContent = t('error_loading');
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
        applyTranslations();
    }

    // ========== 16. PRIORIDADE DE IDIOMA E ORDENAÇÃO ==========
    function getLanguagePriority(langCode) {
        if (!langCode) return 5;
        const code = langCode.toLowerCase().slice(0, 2);
        if (code === 'pt') return 1;
        if (code === 'en') return 2;
        if (code === 'es') return 3;
        if (code === 'zh') return 4;
        return 5;
    }

    function sortBooksByPriority(books) {
        return [...books].sort((a, b) => {
            if (a.sourceType === 'local' && b.sourceType !== 'local') return -1;
            if (b.sourceType === 'local' && a.sourceType !== 'local') return 1;
            const langA = getLanguagePriority(a.language);
            const langB = getLanguagePriority(b.language);
            if (langA !== langB) return langA - langB;
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            if (titleA < titleB) return -1;
            if (titleA > titleB) return 1;
            return 0;
        });
    }

    function showResults(items) {
        const filtered = items.filter(book => !isAudiobook(book));
        if (!grid) return;
        uiState.hasResults = true;
        uiState.hasError = false;
        hideLoading();
        if (!filtered || filtered.length === 0) {
            showEmptyState();
            return;
        }
        const sorted = sortBooksByPriority(filtered);
        renderResultsIncrementally(sorted, grid);
    }

    // ========== 17. BUSCA PRINCIPAL ==========
    async function performSearchWithFilters(query) {
        const trimmed = normalizeText(query);
        const activeFilters = [];
        if (filterBooks && filterBooks.checked) activeFilters.push('book');
        if (filterArticles && filterArticles.checked) activeFilters.push('article');
        if (filterPapers && filterPapers.checked) activeFilters.push('paper');
        if (filterTCC && filterTCC.checked) activeFilters.push('tcc');
        if (filterDissertation && filterDissertation.checked) activeFilters.push('dissertation');
        if (filterThesis && filterThesis.checked) activeFilters.push('thesis');
        const shouldFilterByType = activeFilters.length > 0;

        const thisSearchId = ++currentSearchId;
        uiState.currentSearchId = thisSearchId;
        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();

        const cacheKey = `search_${trimmed}_${activeFilters.join('_')}`;
        if (searchCache.has(cacheKey) && Date.now() - searchCache.get(cacheKey).timestamp < SEARCH_CACHE_TTL) {
            showResults(searchCache.get(cacheKey).data);
            return;
        }

        showLoading();

        let localRaw = searchLocalBooks(trimmed);
        if (shouldFilterByType) {
            localRaw = localRaw.filter(book => activeFilters.includes(book.type || 'book'));
        }
        const localResults = await Promise.all(localRaw.map(async book => enrichBookMetadata(book)));
        if (thisSearchId !== currentSearchId) return;

        let currentResults = [...localResults];
        if (currentResults.length > 0) showResults(currentResults);

        const globalTimeoutId = setTimeout(() => {
            if (uiState.isLoading && thisSearchId === currentSearchId) {
                if (currentResults.length === 0) showErrorState();
                else hideLoading();
            }
        }, GLOBAL_TIMEOUT);

        try {
            if (trimmed.length >= MIN_SEARCH_LENGTH) {
                const externalResults = await searchExternalBooks(trimmed);
                let filteredExternal = externalResults;
                if (shouldFilterByType) {
                    filteredExternal = externalResults.filter(book => activeFilters.includes(book.type || 'paper'));
                }
                const enrichedExternal = await Promise.all(filteredExternal.map(async book => enrichBookMetadata(book)));
                const merged = [...currentResults, ...enrichedExternal];
                const unique = [];
                const seen = new Set();
                for (const book of merged) {
                    const key = `${normalizeText(book.title)}|${normalizeText(book.rawAuthor || book.author)}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        unique.push(book);
                    }
                }
                searchCache.set(cacheKey, { data: unique, timestamp: Date.now() });
                if (unique.length > 0) showResults(unique);
                else if (currentResults.length === 0) showEmptyState();
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
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // ========== 18. FILTROS ==========
    function createFilters() {
        if (!filterContainer) {
            filterContainer = document.createElement('div');
            filterContainer.id = 'filterContainer';
            filterContainer.className = 'filter-bar';
            const searchBar = document.querySelector('.search-bar');
            if (searchBar) searchBar.parentNode.insertBefore(filterContainer, searchBar);
            else document.querySelector('.container')?.prepend(filterContainer);
        }
        const createFilter = (id, labelKey, iconClass, checked = false) => {
            if (document.getElementById(id)) return;
            const labelEl = document.createElement('label');
            labelEl.htmlFor = id;
            labelEl.style.cssText = 'display: inline-flex; align-items: center; gap: 0.5rem; background: var(--bg-tertiary); padding: 0.4rem 0.8rem; border-radius: 2rem; cursor: pointer;';
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = checked;
            const icon = document.createElement('i'); icon.className = iconClass;
            const span = document.createElement('span'); span.setAttribute('data-i18n', labelKey);
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

    function setupSearchEvents() {
        if (searchInput) searchInput.addEventListener('input', (e) => debouncedPerformSearch(e.target.value));
        [filterBooks, filterArticles, filterPapers, filterTCC, filterDissertation, filterThesis].forEach(f => {
            if (f) f.addEventListener('change', () => debouncedPerformSearch(currentSearchTerm));
        });
    }

    async function loadInitialSuggestions() {
        const localBooks = searchLocalBooks('');
        if (localBooks.length) showResults(localBooks);
        else showEmptyState();
    }

    // ========== 19. I18N ==========
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`../lang/${lang}.json`);
            if (!response.ok) throw new Error();
            translations = await response.json();
            return true;
        } catch {
            if (lang !== 'pt-br') return loadTranslations('pt-br');
            translations = {
                search_placeholder: 'Buscar livros, artigos, TCC...', loading: 'Carregando...', no_results: 'Nenhum resultado encontrado.',
                error_loading: 'Erro ao carregar resultados.', unknown_author: 'Autor desconhecido',
                unknown_publisher: 'Editora desconhecida', year_not_informed: 'Ano não informado',
                type_book: 'Livro', type_article: 'Artigo', type_paper: 'Paper', type_tcc: 'TCC',
                type_dissertation: 'Dissertação', type_thesis: 'Tese', filter_books: 'Livros', filter_articles: 'Artigos',
                filter_papers: 'Papers', filter_tcc: 'TCC', filter_dissertation: 'Dissertações',
                filter_thesis: 'Teses', download_book: 'Baixar', access_online: 'Acessar Online',
                no_description: 'Sem descrição.', close: 'Fechar', repository_prefix: 'Repositório:',
                book_author: 'Autor', book_year: 'Ano', book_language: 'Idioma', book_publisher: 'Editora'
            };
            return false;
        }
    }

    function t(key, fallback = '') { return translations[key] || fallback || key; }

    function applyTranslations() {
        if (!translations) return;
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT') el.placeholder = translations[key];
                else el.innerText = translations[key];
            }
        });
        if (searchInput) searchInput.placeholder = t('search_placeholder');
        document.title = translations.app_title || 'Biblioteca';
    }

    function getInitialLanguage() {
        const saved = localStorage.getItem('selectedLanguage');
        if (saved === 'pt-br' || saved === 'en') return saved;
        return navigator.language?.startsWith('pt') ? 'pt-br' : 'en';
    }

    async function setLanguage(lang) {
        if (lang === currentLang && Object.keys(translations).length > 0) return;
        const success = await loadTranslations(lang);
        if (success) {
            currentLang = lang;
            localStorage.setItem('selectedLanguage', lang);
            applyTranslations();
            document.getElementById('langPtBtn')?.classList.toggle('active', lang === 'pt-br');
            document.getElementById('langEnBtn')?.classList.toggle('active', lang === 'en');
            loadInitialSuggestions();
        }
    }

    // ========== 20. INICIALIZAÇÃO ==========
    async function init() {
        grid = document.getElementById('booksGrid');
        searchInput = document.getElementById('searchInput');
        modal = document.getElementById('bookModal');
        modalBody = document.getElementById('modalBody');
        closeModalBtn = document.querySelector('.close-modal');
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

        createFilters();
        setupSearchEvents();

        localBooksCache = await loadLocalBooks();
        const initialLang = getInitialLanguage();
        currentLang = initialLang;
        await loadTranslations(initialLang);
        applyTranslations();

        document.getElementById('langPtBtn')?.addEventListener('click', () => setLanguage('pt-br'));
        document.getElementById('langEnBtn')?.addEventListener('click', () => setLanguage('en'));

        await loadInitialSuggestions();
    }

    init();
});