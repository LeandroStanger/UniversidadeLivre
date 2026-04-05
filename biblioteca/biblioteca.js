// biblioteca.js – versão com busca inteligente expandida (sinônimos, tradução, termos acadêmicos)
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('booksGrid');
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('bookModal');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.querySelector('.close-modal');

    // ========== SISTEMA DE INTERNACIONALIZAÇÃO ==========
    let currentLang = 'pt-br';
    let translations = {};
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
            console.log(`[i18n] Language loaded: ${lang}`);
            return true;
        } catch (error) {
            console.error(`[i18n] Error loading ${lang}:`, error);
            if (lang !== 'pt-br') return loadTranslations('pt-br');
            translations = {
                search_placeholder: 'Buscar...',
                loading: 'Carregando...',
                no_results: 'Nenhum resultado encontrado.',
                error_loading: 'Erro ao carregar resultados. Tente novamente mais tarde.',
                unknown_author: 'Autor desconhecido',
                year_not_informed: 'Ano não informado',
                type_book: 'Livro',
                type_article: 'Artigo',
                type_paper: 'Paper',
                type_tcc: 'TCC',
                type_dissertation: 'Dissertação',
                type_thesis: 'Tese',
                filter_books: 'Livros',
                filter_articles: 'Artigos',
                filter_papers: 'Papers',
                filter_tcc: 'TCC',
                filter_dissertation: 'Dissertações',
                filter_thesis: 'Teses',
                download_book: 'Baixar',
                access_online: 'Acessar Online',
                no_description: 'Sem descrição disponível.',
                close: 'Fechar',
                math: 'Matemática',
                technology: 'Tecnologia',
                physics: 'Física',
                literature: 'Literatura',
                initial_suggestions: 'Sugestões para você'
            };
            return false;
        }
    }

    function t(key, replacements = {}) {
        let text = translations[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    function getUserLanguage() {
        const saved = localStorage.getItem('selectedLanguage');
        if (saved && (saved === 'pt-br' || saved === 'en')) return saved;
        const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        if (browserLang.startsWith('pt')) return 'pt-br';
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
            loadInitialSuggestions();
        }
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                    el.placeholder = translations[key];
                } else {
                    el.innerText = translations[key];
                }
            }
        });
        document.title = translations.app_title || 'Biblioteca';
        if (searchInput) searchInput.placeholder = t('search_placeholder');
        const filterLabels = [
            { id: 'filterBooks', key: 'filter_books' },
            { id: 'filterArticles', key: 'filter_articles' },
            { id: 'filterPapers', key: 'filter_papers' },
            { id: 'filterTCC', key: 'filter_tcc' },
            { id: 'filterDissertation', key: 'filter_dissertation' },
            { id: 'filterThesis', key: 'filter_thesis' }
        ];
        filterLabels.forEach(f => {
            const label = document.querySelector(`label[for="${f.id}"] span`);
            if (label && translations[f.key]) label.textContent = translations[f.key];
        });
    }

    function updateLanguageSelector(lang) {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (ptBtn && enBtn) {
            if (lang === 'pt-br') { ptBtn.classList.add('active'); enBtn.classList.remove('active'); }
            else { enBtn.classList.add('active'); ptBtn.classList.remove('active'); }
        }
    }

    const langPtBtn = document.getElementById('langPtBtn');
    const langEnBtn = document.getElementById('langEnBtn');
    if (langPtBtn) langPtBtn.addEventListener('click', () => setLanguage('pt-br'));
    if (langEnBtn) langEnBtn.addEventListener('click', () => setLanguage('en'));

    // ========== CRIAÇÃO DOS FILTROS ==========
    let filterContainer = document.getElementById('filterContainer');
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
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.checked = checked;
        cb.style.cssText = 'width: 16px; height: 16px; cursor: pointer;';
        const icon = document.createElement('i');
        icon.className = iconClass;
        icon.style.fontSize = '0.9rem';
        const span = document.createElement('span');
        span.setAttribute('data-i18n', labelKey);
        span.textContent = labelKey;
        labelEl.appendChild(cb);
        labelEl.appendChild(icon);
        labelEl.appendChild(span);
        filterContainer.appendChild(labelEl);
        return cb;
    };

    const filterBooks = createFilter('filterBooks', 'filter_books', 'fas fa-book', true);
    const filterArticles = createFilter('filterArticles', 'filter_articles', 'fas fa-file-alt', false);
    const filterPapers = createFilter('filterPapers', 'filter_papers', 'fas fa-file-pdf', false);
    const filterTCC = createFilter('filterTCC', 'filter_tcc', 'fas fa-graduation-cap', false);
    const filterDissertation = createFilter('filterDissertation', 'filter_dissertation', 'fas fa-tasks', false);
    const filterThesis = createFilter('filterThesis', 'filter_thesis', 'fas fa-award', false);

    // ========== CONTROLE CENTRAL DE ESTADO DA UI ==========
    let uiState = {
        isLoading: false,
        hasResults: false,
        hasError: false,
        currentSearchId: 0
    };

    // ========== VARIÁVEIS GLOBAIS ==========
    let allLocalBooks = [];
    let currentSearchTerm = '';
    let currentAbortController = null;
    let loadingTimeout = null;

    // Caches
    let searchCache = new Map();
    let apiCache = new Map();
    let coverCache = new Map();
    let descriptionCache = new Map();
    let expansionCache = new Map(); // Cache de termos expandidos (TTL 5min)
    let intersectionObserver = null;

    // Métricas de sucesso das APIs
    let apiMetrics = {
        internetarchive: { total: 0, valid: 0, discarded: 0, avgTime: 0 },
        openalex: { total: 0, valid: 0, discarded: 0, avgTime: 0 },
        arxiv: { total: 0, valid: 0, discarded: 0, avgTime: 0 },
        gutenberg: { total: 0, valid: 0, discarded: 0, avgTime: 0 }
    };

    const SEARCH_CACHE_TTL = 5 * 60 * 1000;
    const API_CACHE_TTL = 10 * 60 * 1000;
    const DESCRIPTION_CACHE_TTL = 30 * 60 * 1000;
    const COVER_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    const EXPANSION_CACHE_TTL = 5 * 60 * 1000;
    const MAX_SEARCH_TIME = 15000;
    const MAX_API_RESULTS = 20;
    const MIN_SEARCH_LENGTH = 2;
    const BASE_TIMEOUT = 10000;
    const MAX_RETRIES = 3;
    const MAX_CONCURRENT_REQUESTS = 3;
    const BATCH_RENDER_SIZE = 20;
    const MAX_EXPANDED_TERMS = 15;

    // ========== DICIONÁRIOS PARA EXPANSÃO DE BUSCA ==========
    // Sinônimos em português (inclui tradução para inglês)
    const PORTUGUESE_SYNONYMS = {
        'calculo': ['cálculo', 'matemática', 'derivada', 'integral', 'função', 'análise', 'calculus', 'mathematics', 'derivative', 'integral', 'analysis'],
        'matematica': ['matemática', 'cálculo', 'álgebra', 'geometria', 'estatística', 'mathematics', 'calculus', 'algebra', 'geometry', 'statistics'],
        'algebra': ['álgebra', 'estruturas algébricas', 'matrizes', 'vetores', 'algebra', 'linear algebra', 'matrices', 'vectors'],
        'geometria': ['geometria', 'espacial', 'analítica', 'geometry', 'spatial geometry', 'analytic geometry'],
        'trigonometria': ['trigonometria', 'seno', 'cosseno', 'tangente', 'trigonometry', 'sine', 'cosine', 'tangent'],
        'estatistica': ['estatística', 'probabilidade', 'análise de dados', 'statistics', 'probability', 'data analysis'],
        'programacao': ['programação', 'codificação', 'desenvolvimento', 'algoritmos', 'programming', 'coding', 'development', 'algorithms'],
        'algoritmos': ['algoritmos', 'estruturas de dados', 'complexidade', 'algorithms', 'data structures', 'complexity'],
        'fisica': ['física', 'mecânica', 'termodinâmica', 'eletromagnetismo', 'óptica', 'physics', 'mechanics', 'thermodynamics', 'electromagnetism', 'optics'],
        'literatura': ['literatura', 'romance', 'poesia', 'teoria literária', 'literature', 'novel', 'poetry', 'literary theory'],
        'inteligencia': ['inteligência artificial', 'machine learning', 'aprendizado de máquina', 'redes neurais', 'artificial intelligence', 'neural networks'],
        'redes': ['redes de computadores', 'comunicação de dados', 'protocolos', 'computer networks', 'data communication', 'protocols'],
        'sistemas': ['sistemas operacionais', 'gerenciamento de processos', 'memória', 'operating systems', 'process management', 'memory'],
        'banco': ['banco de dados', 'sql', 'nosql', 'database', 'sql', 'nosql'],
        'engenharia': ['engenharia de software', 'metodologias ágeis', 'desenvolvimento', 'software engineering', 'agile methodologies', 'development']
    };

    // Tradução direta português -> inglês (para frases completas)
    const PORTUGUESE_TO_ENGLISH = {
        'calculo': 'calculus',
        'matematica': 'mathematics',
        'programacao': 'programming',
        'fisica': 'physics',
        'literatura': 'literature',
        'algebra': 'algebra',
        'geometria': 'geometry',
        'estatistica': 'statistics',
        'trigonometria': 'trigonometry',
        'algoritmos': 'algorithms',
        'inteligencia artificial': 'artificial intelligence',
        'redes': 'networks',
        'sistemas operacionais': 'operating systems',
        'banco de dados': 'database'
    };

    // Expansão acadêmica (termos relacionados)
    const ACADEMIC_EXPANSIONS = {
        'calculus': ['derivative', 'integral', 'limit', 'function', 'analysis', 'differential', 'multivariable'],
        'mathematics': ['algebra', 'geometry', 'topology', 'number theory', 'discrete mathematics'],
        'programming': ['algorithm', 'data structure', 'software engineering', 'coding', 'development', 'object oriented'],
        'physics': ['quantum', 'mechanics', 'thermodynamics', 'electromagnetism', 'relativity', 'optics'],
        'literature': ['novel', 'poetry', 'drama', 'criticism', 'theory', 'narrative', 'fiction'],
        'artificial intelligence': ['machine learning', 'deep learning', 'neural networks', 'nlp', 'computer vision'],
        'networks': ['protocol', 'tcp/ip', 'routing', 'security', 'wireless', 'cloud'],
        'operating systems': ['process', 'memory management', 'file system', 'scheduling', 'concurrency'],
        'database': ['sql', 'nosql', 'relational', 'query', 'optimization', 'transaction']
    };

    // ========== FUNÇÕES DE EXPANSÃO DE BUSCA ==========
    function normalizeText(text) {
        if (typeof text !== 'string') text = String(text || '');
        try {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
        } catch {
            return text.toLowerCase().replace(/\s+/g, ' ').trim();
        }
    }

    function getCachedExpansion(original) {
        const cached = expansionCache.get(original);
        if (cached && Date.now() - cached.timestamp < EXPANSION_CACHE_TTL) {
            return cached.terms;
        }
        return null;
    }

    function setCachedExpansion(original, terms) {
        expansionCache.set(original, { terms, timestamp: Date.now() });
    }

    function expandSearchTerms(query) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [query];
        
        const normalized = normalizeText(query);
        const cached = getCachedExpansion(normalized);
        if (cached) return cached;

        const termsSet = new Set();
        termsSet.add(normalized); // termo original

        // 1. Adicionar sinônimos do português (inclui tradução)
        for (const [ptWord, synonyms] of Object.entries(PORTUGUESE_SYNONYMS)) {
            if (normalized.includes(ptWord) || ptWord.includes(normalized)) {
                synonyms.forEach(s => termsSet.add(s.toLowerCase()));
            }
        }

        // 2. Tradução direta para inglês (para a frase inteira)
        let translatedPhrase = normalized;
        for (const [pt, en] of Object.entries(PORTUGUESE_TO_ENGLISH)) {
            if (normalized.includes(pt)) {
                translatedPhrase = translatedPhrase.replace(pt, en);
                termsSet.add(translatedPhrase);
            }
        }

        // 3. Para cada palavra individual, adicionar sinônimos e traduções
        const words = normalized.split(/\s+/);
        for (const word of words) {
            if (word.length < 3) continue;
            // Sinônimos para a palavra
            for (const [ptWord, synonyms] of Object.entries(PORTUGUESE_SYNONYMS)) {
                if (word === ptWord || word.includes(ptWord) || ptWord.includes(word)) {
                    synonyms.forEach(s => termsSet.add(s.toLowerCase()));
                }
            }
            // Tradução direta da palavra
            for (const [pt, en] of Object.entries(PORTUGUESE_TO_ENGLISH)) {
                if (word === pt || word.includes(pt)) {
                    termsSet.add(en);
                }
            }
        }

        // 4. Expansão acadêmica (para termos em inglês)
        const allTerms = Array.from(termsSet);
        for (const term of allTerms) {
            for (const [acadKey, expansions] of Object.entries(ACADEMIC_EXPANSIONS)) {
                if (term.includes(acadKey) || acadKey.includes(term)) {
                    expansions.forEach(exp => termsSet.add(exp.toLowerCase()));
                }
            }
        }

        // 5. Gerar variações de frases (para multi-termos)
        if (words.length >= 2) {
            // Versão com palavras trocadas (ex: "linear algebra" -> "algebra linear")
            const reversed = [...words].reverse().join(' ');
            if (reversed !== normalized) termsSet.add(reversed);
            
            // Adicionar versão em inglês da frase (se houver tradução palavra a palavra)
            let engPhrase = normalized;
            for (const [pt, en] of Object.entries(PORTUGUESE_TO_ENGLISH)) {
                engPhrase = engPhrase.replace(new RegExp(pt, 'g'), en);
            }
            if (engPhrase !== normalized) termsSet.add(engPhrase);
        }

        // Limitar número de termos
        let finalTerms = Array.from(termsSet).slice(0, MAX_EXPANDED_TERMS);
        
        // Ordenar por relevância: termo original primeiro, depois traduções, depois sinônimos
        finalTerms.sort((a, b) => {
            const aScore = (a === normalized) ? 100 : (PORTUGUESE_TO_ENGLISH[a] ? 80 : (PORTUGUESE_SYNONYMS[a] ? 60 : 40));
            const bScore = (b === normalized) ? 100 : (PORTUGUESE_TO_ENGLISH[b] ? 80 : (PORTUGUESE_SYNONYMS[b] ? 60 : 40));
            return bScore - aScore;
        });

        console.log(`[Search Expansion] Original: "${query}" → Expandido: ${finalTerms.join(' | ')}`);
        setCachedExpansion(normalized, finalTerms);
        return finalTerms;
    }

    // Função para construir query OR para APIs
    function buildOrQuery(terms) {
        if (!terms || terms.length === 0) return '';
        if (terms.length === 1) return terms[0];
        // Escapar caracteres especiais para cada termo
        const escaped = terms.map(t => t.replace(/[+\-&|!(){}\[\]^"~*?:\\]/g, '\\$&')).filter(t => t.length > 0);
        return escaped.join(' OR ');
    }

    // ========== NORMALIZAÇÃO DE DADOS ==========
    function normalizeAuthorName(author) {
        if (!author) return t('unknown_author');
        let authorStr = '';
        if (typeof author === 'string') authorStr = author;
        else if (Array.isArray(author)) authorStr = author[0] || '';
        else if (typeof author === 'object') authorStr = author.name || author.fullName || author.display_name || '';
        authorStr = authorStr.trim();
        if (!authorStr) return t('unknown_author');
        authorStr = authorStr.replace(/[^\p{L}\p{N}\s\.\-]/gu, '');
        authorStr = authorStr.replace(/\b\w/g, l => l.toUpperCase());
        return authorStr || t('unknown_author');
    }

    function normalizeItemType(type) {
        if (!type) return 'book';
        const t = type.toLowerCase();
        if (t === 'journal' || t === 'research') return 'article';
        if (t === 'paper' || t === 'conference paper') return 'paper';
        if (t === 'tcc' || t === 'undergraduate thesis') return 'tcc';
        if (t === 'dissertation' || t === 'master thesis') return 'dissertation';
        if (t === 'thesis' || t === 'phd thesis') return 'thesis';
        return t;
    }

    async function resolveDescription(item) {
        if (item.abstract && item.abstract.length > 20) return item.abstract;
        if (item.description && item.description.length > 20) return item.description;

        const cacheKey = `${item.source}_${normalizeText(item.title)}_${normalizeText(item.author)}`;
        const cached = descriptionCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < DESCRIPTION_CACHE_TTL) return cached.description;

        let description = '';
        try {
            const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(item.title)}&limit=1`;
            const response = await fetchWithRetry(url, {}, 2, 500);
            const data = await response.json();
            const doc = data.docs?.[0];
            if (doc) {
                description = doc.title_suggest || '';
                if (doc.author_name) description += ` por ${doc.author_name.join(', ')}`;
                if (doc.first_publish_year) description += `. Primeira publicação em ${doc.first_publish_year}.`;
            }
        } catch (e) {}
        if (!description) {
            description = `${item.type === 'book' ? 'Livro' : item.type} na área. Autor: ${item.author}. Ano: ${item.year || 'desconhecido'}.`;
        }
        descriptionCache.set(cacheKey, { description, timestamp: Date.now() });
        return description;
    }

    // ========== CONSTRUÇÃO DE LINKS ==========
    function buildInternetArchiveLink(identifier) {
        if (!identifier) return null;
        return `https://archive.org/details/${identifier}`;
    }

    function buildArxivLink(arxivId) {
        if (!arxivId) return null;
        return `https://arxiv.org/abs/${arxivId}`;
    }

    function buildGutenbergLink(gutenbergId) {
        if (!gutenbergId) return null;
        return `https://www.gutenberg.org/ebooks/${gutenbergId}`;
    }

    function buildOpenAlexLink(workId) {
        if (!workId) return null;
        return `https://openalex.org/works/${workId}`;
    }

    async function normalizeSearchItem(raw, source, defaultType = 'book', identifier = null) {
        const item = {
            id: raw.id || `${source}_${Date.now()}_${Math.random()}`,
            title: raw.title || 'Sem título',
            author: normalizeAuthorName(raw.author || raw.creator || raw.authors?.[0]?.name || raw.first_author || ''),
            year: raw.year || raw.publication_year || raw.date?.slice(0,4) || '',
            type: normalizeItemType(raw.type || defaultType),
            source: source,
            link: raw.link || '',
            download_url: raw.download_url || raw.pdf_url || '',
            cover: raw.cover || null,
            abstract: raw.abstract || raw.description || '',
            language: raw.language || detectItemLanguage(raw)
        };

        switch (source) {
            case 'Internet Archive':
                if (identifier) item.link = buildInternetArchiveLink(identifier);
                break;
            case 'arXiv':
                if (identifier) item.link = buildArxivLink(identifier);
                break;
            case 'Gutenberg':
                if (identifier) item.link = buildGutenbergLink(identifier);
                break;
            case 'OpenAlex':
                if (identifier) item.link = buildOpenAlexLink(identifier);
                else if (raw.doi) item.link = `https://doi.org/${raw.doi}`;
                break;
        }

        if (!item.abstract || item.abstract.length < 20) {
            item.abstract = await resolveDescription(item);
        }
        if (!item.cover) item.cover = null;
        return item;
    }

    function detectItemLanguage(item) {
        const title = (item.title || '').toLowerCase();
        if (/[àáâãçéêíóôúü]/i.test(title)) return 'pt';
        if (/\b(the|and|of|to|in|for)\b/i.test(title)) return 'en';
        if (/\b(el|la|de|y|en|un)\b/i.test(title)) return 'es';
        if (/[\u4e00-\u9fff]/.test(title)) return 'zh';
        return 'en';
    }

    // ========== RESOLUÇÃO DE CAPAS ==========
    async function resolveUniversalCover(item) {
        if (item.cover && item.cover.startsWith('http') && !item.cover.includes('placehold')) return item.cover;
        
        if (item.source === 'Internet Archive' && item.link) {
            const identifier = item.link.split('/details/')[1];
            if (identifier) {
                const coverUrl = `https://archive.org/services/img/${identifier}`;
                if (await imageExists(coverUrl)) return coverUrl;
            }
        }
        
        let cover = await fetchOpenLibraryCover(item.title, item.author);
        if (cover) return cover;
        cover = await fetchGoogleBookCover(item.title, item.author);
        if (cover) return cover;
        return generateDynamicCover(item.title, item.author);
    }

    async function imageExists(url) {
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

    async function fetchOpenLibraryCover(title, author) {
        if (!title) return null;
        const cacheKey = `ol_${normalizeText(title)}_${normalizeText(author || '')}`;
        if (coverCache.has(cacheKey)) {
            const cached = coverCache.get(cacheKey);
            if (Date.now() - cached.timestamp < COVER_CACHE_TTL) return cached.cover;
        }
        try {
            const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
            const response = await fetchWithRetry(url, {}, 1, 500);
            const data = await response.json();
            const doc = data.docs?.[0];
            if (doc?.cover_i) {
                const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
                if (await imageExists(coverUrl)) {
                    coverCache.set(cacheKey, { cover: coverUrl, timestamp: Date.now() });
                    return coverUrl;
                }
            }
        } catch (e) {}
        coverCache.set(cacheKey, { cover: null, timestamp: Date.now() });
        return null;
    }

    async function fetchGoogleBookCover(title, author) {
        if (!title) return null;
        const cacheKey = normalizeText(title) + '|' + normalizeText(author || '');
        if (coverCache.has(cacheKey)) {
            const cached = coverCache.get(cacheKey);
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
                if (await imageExists(coverUrl)) {
                    coverCache.set(cacheKey, { cover: coverUrl, timestamp: Date.now() });
                    return coverUrl;
                }
            }
        } catch (e) {}
        coverCache.set(cacheKey, { cover: null, timestamp: Date.now() });
        return null;
    }

    function generateDynamicCover(title, author) {
        const bgColors = ['#2563EB', '#22C55E', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4'];
        const randomColor = bgColors[Math.floor(Math.random() * bgColors.length)];
        const initials = title.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
        return `https://placehold.co/200x260/${randomColor.slice(1)}/FFFFFF?text=${encodeURIComponent(initials || '?')}`;
    }

    // ========== FETCH COM RETRY INTELIGENTE ==========
    async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES, baseDelay = 1000) {
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
                console.warn(`[API Debug] Attempt ${attempt}/${retries} failed for ${url.substring(0, 80)}: ${error.message}`);
                if (attempt === retries) break;
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    }

    // ========== APIs COM SUPORTE A EXPANSÃO DE TERMOS ==========
    async function searchOpenAlex(query, signal, filterType = null) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        
        // Expande os termos de busca
        const expandedTerms = expandSearchTerms(query);
        const orQuery = buildOrQuery(expandedTerms);
        
        const cacheKey = `openalex_${normalizeText(orQuery)}_${filterType || ''}`;
        const cached = getCached(cacheKey, apiCache, API_CACHE_TTL);
        if (cached) return cached;

        const startTime = Date.now();
        try {
            let typeFilter = '';
            if (filterType === 'article') typeFilter = '&filter=type:article';
            else if (filterType === 'paper') typeFilter = '&filter=type:proceedings_article';
            else if (filterType === 'dissertation') typeFilter = '&filter=type:dissertation';
            else if (filterType === 'thesis') typeFilter = '&filter=type:thesis';
            else if (filterType === 'tcc') typeFilter = '&filter=type:thesis';

            // Usa OR query na busca
            const encodedQuery = encodeURIComponent(orQuery);
            const url = `https://api.openalex.org/works?search=${encodedQuery}${typeFilter}&per-page=${MAX_API_RESULTS}&sort=relevance_score:desc`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            const data = await response.json();
            const results = data.results || [];
            
            const items = [];
            for (const work of results) {
                const workId = work.id?.split('/').pop();
                const rawItem = {
                    title: work.title,
                    author: work.authors?.[0]?.author?.display_name,
                    year: work.publication_year,
                    type: work.type,
                    abstract: work.abstract,
                    download_url: work.best_oa_location?.pdf_url || work.open_access?.oa_url || '',
                    doi: work.doi
                };
                const normalized = await normalizeSearchItem(rawItem, 'OpenAlex', work.type, workId);
                items.push(normalized);
            }
            
            const elapsed = Date.now() - startTime;
            apiMetrics.openalex.total += results.length;
            apiMetrics.openalex.valid += items.length;
            apiMetrics.openalex.avgTime = (apiMetrics.openalex.avgTime + elapsed) / 2;
            console.log(`[API Audit] OpenAlex: ${items.length}/${results.length} itens, ${elapsed}ms`);
            
            setCache(cacheKey, items, apiCache, API_CACHE_TTL);
            return items;
        } catch (error) {
            console.warn('[OpenAlex] Erro:', error);
            return [];
        }
    }

    async function searchArxiv(query, signal) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        
        const expandedTerms = expandSearchTerms(query);
        // arXiv suporta OR: all:term1+OR+all:term2
        const orQuery = expandedTerms.map(t => `all:${t}`).join('+OR+');
        
        const cacheKey = `arxiv_${normalizeText(orQuery)}`;
        const cached = getCached(cacheKey, apiCache, API_CACHE_TTL);
        if (cached) return cached;

        const startTime = Date.now();
        try {
            const url = `https://export.arxiv.org/api/query?search_query=${orQuery}&start=0&max_results=${MAX_API_RESULTS}&sortBy=relevance&sortOrder=descending`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            const text = await response.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');
            const entries = xml.querySelectorAll('entry');
            
            const items = [];
            for (const entry of entries) {
                const id = entry.querySelector('id')?.textContent?.trim() || '';
                const arxivId = id.split('/abs/').pop();
                const rawItem = {
                    title: entry.querySelector('title')?.textContent?.trim() || '',
                    author: entry.querySelector('author name')?.textContent?.trim() || '',
                    year: entry.querySelector('published')?.textContent?.slice(0,4) || '',
                    abstract: entry.querySelector('summary')?.textContent?.trim() || '',
                    type: 'paper'
                };
                const normalized = await normalizeSearchItem(rawItem, 'arXiv', 'paper', arxivId);
                items.push(normalized);
            }
            
            const elapsed = Date.now() - startTime;
            apiMetrics.arxiv.total += entries.length;
            apiMetrics.arxiv.valid += items.length;
            apiMetrics.arxiv.avgTime = (apiMetrics.arxiv.avgTime + elapsed) / 2;
            console.log(`[API Audit] arXiv: ${items.length}/${entries.length} itens, ${elapsed}ms`);
            
            setCache(cacheKey, items, apiCache, API_CACHE_TTL);
            return items;
        } catch (error) {
            console.warn('[arXiv] Erro:', error);
            return [];
        }
    }

    async function searchInternetArchive(query, signal) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        
        const expandedTerms = expandSearchTerms(query);
        // Internet Archive suporta OR: title:(term1 OR term2)
        const orQuery = expandedTerms.map(t => `"${t}"`).join(' OR ');
        const fullQuery = `title:(${orQuery})`;
        
        const cacheKey = `archive_${normalizeText(fullQuery)}`;
        const cached = getCached(cacheKey, apiCache, API_CACHE_TTL);
        if (cached) return cached;

        const startTime = Date.now();
        try {
            const params = new URLSearchParams({
                q: fullQuery,
                fl: ['identifier', 'title', 'creator', 'year'].join(','),
                rows: MAX_API_RESULTS,
                output: 'json'
            });
            const url = `https://archive.org/advancedsearch.php?${params.toString()}`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            const data = await response.json();
            const docs = data.response?.docs || [];
            
            const items = [];
            for (const doc of docs) {
                const identifier = doc.identifier;
                if (!identifier) continue;
                const rawItem = {
                    title: doc.title || 'Sem título',
                    author: doc.creator,
                    year: doc.year,
                    type: 'book'
                };
                const normalized = await normalizeSearchItem(rawItem, 'Internet Archive', 'book', identifier);
                items.push(normalized);
            }
            
            const elapsed = Date.now() - startTime;
            apiMetrics.internetarchive.total += docs.length;
            apiMetrics.internetarchive.valid += items.length;
            apiMetrics.internetarchive.avgTime = (apiMetrics.internetarchive.avgTime + elapsed) / 2;
            console.log(`[API Audit] Internet Archive: ${items.length}/${docs.length} itens, ${elapsed}ms`);
            
            setCache(cacheKey, items, apiCache, API_CACHE_TTL);
            return items;
        } catch (error) {
            console.warn('[InternetArchive] Erro:', error);
            return [];
        }
    }

    async function searchGutenberg(query, signal) {
        if (!query || query.length < MIN_SEARCH_LENGTH) return [];
        
        const expandedTerms = expandSearchTerms(query);
        // Gutenberg suporta OR: ?search=term1+OR+term2
        const orQuery = expandedTerms.join('+OR+');
        
        const cacheKey = `gutenberg_${normalizeText(orQuery)}`;
        const cached = getCached(cacheKey, apiCache, API_CACHE_TTL);
        if (cached) return cached;

        const startTime = Date.now();
        try {
            const url = `https://gutendex.com/books?search=${orQuery}`;
            const response = await fetchWithRetry(url, signal ? { signal } : {});
            const data = await response.json();
            const results = data.results || [];
            
            const items = [];
            for (const book of results) {
                const gutenbergId = book.id;
                const rawItem = {
                    title: book.title,
                    author: book.authors?.[0]?.name,
                    year: null,
                    type: 'book',
                    download_url: book.formats?.['application/pdf'] || book.formats?.['application/epub+zip'],
                    cover: book.formats?.['image/jpeg']
                };
                const normalized = await normalizeSearchItem(rawItem, 'Gutenberg', 'book', gutenbergId);
                items.push(normalized);
            }
            
            const elapsed = Date.now() - startTime;
            apiMetrics.gutenberg.total += results.length;
            apiMetrics.gutenberg.valid += items.length;
            apiMetrics.gutenberg.avgTime = (apiMetrics.gutenberg.avgTime + elapsed) / 2;
            console.log(`[API Audit] Gutenberg: ${items.length}/${results.length} itens, ${elapsed}ms`);
            
            setCache(cacheKey, items, apiCache, API_CACHE_TTL);
            return items;
        } catch (error) {
            console.warn('[Gutenberg] Erro:', error);
            return [];
        }
    }

    // ========== BUSCA UNIFICADA ==========
    async function unifiedSearchWithFilters(query, signal, activeFilters) {
        const trimmed = normalizeQuery(query);
        const hasQuery = trimmed.length >= MIN_SEARCH_LENGTH;
        const cacheKey = `unified_${trimmed}_${activeFilters.join('_')}`;
        const cached = getCached(cacheKey, searchCache, SEARCH_CACHE_TTL);
        if (cached) return cached;

        const promises = [];
        
        // Usa a query original, pois a expansão já é feita dentro de cada API
        const searchTerm = trimmed;

        if (activeFilters.includes('book')) {
            promises.push(runWithConcurrencyLimit(() => searchInternetArchive(searchTerm, signal)));
            promises.push(runWithConcurrencyLimit(() => searchGutenberg(searchTerm, signal)));
        }
        if (activeFilters.includes('article')) {
            promises.push(runWithConcurrencyLimit(() => searchOpenAlex(searchTerm, signal, 'article')));
        }
        if (activeFilters.includes('paper')) {
            promises.push(runWithConcurrencyLimit(() => searchArxiv(searchTerm, signal)));
            promises.push(runWithConcurrencyLimit(() => searchOpenAlex(searchTerm, signal, 'paper')));
        }
        if (activeFilters.includes('dissertation')) {
            promises.push(runWithConcurrencyLimit(() => searchOpenAlex(searchTerm, signal, 'dissertation')));
        }
        if (activeFilters.includes('thesis')) {
            promises.push(runWithConcurrencyLimit(() => searchOpenAlex(searchTerm, signal, 'thesis')));
        }
        if (activeFilters.includes('tcc')) {
            promises.push(runWithConcurrencyLimit(() => searchOpenAlex(searchTerm, signal, 'tcc')));
        }

        if (promises.length === 0) return [];

        const results = await Promise.allSettled(promises);
        let allItems = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
        allItems = allItems.filter(item => item !== null);

        if (!hasQuery) allItems = allItems.slice(0, MAX_API_RESULTS * 2);

        const unique = removeDuplicateItems(allItems);
        const withCovers = await Promise.all(unique.map(async item => {
            item.cover = await resolveUniversalCover(item);
            return item;
        }));
        const prioritized = prioritizeResults(withCovers);
        setCache(cacheKey, prioritized, searchCache, SEARCH_CACHE_TTL, true);
        console.log(`[UnifiedSearch] Total ${prioritized.length} itens`);
        return prioritized;
    }

    // ========== AUXILIARES ==========
    function normalizeQuery(query) {
        let normalized = query.toLowerCase().trim();
        normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        normalized = normalized.replace(/\s+/g, ' ');
        return normalized;
    }

    function getUniqueKey(item) {
        if (!item || !item.title) return '';
        return `${normalizeText(item.title)}|${normalizeText(item.author)}`;
    }

    function removeDuplicateItems(items) {
        const seen = new Set();
        return items.filter(item => {
            const key = getUniqueKey(item);
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function prioritizeResults(items) {
        return items.sort((a, b) => {
            const score = (item) => {
                let s = 0;
                if (item.download_url?.includes('.pdf')) s += 100;
                if (item.cover && !item.cover.includes('placehold')) s += 10;
                const langPriority = { pt: 4, en: 3, es: 2, other: 0 };
                s += (langPriority[item.language] || 0) * 5;
                const typePriority = { book: 100, article: 90, paper: 80, tcc: 70, dissertation: 60, thesis: 50 };
                s += typePriority[item.type] || 0;
                return s;
            };
            return score(b) - score(a);
        });
    }

    // ========== CONTROLE DE CONCORRÊNCIA ==========
    let pendingRequests = [];
    let activeRequests = 0;
    async function runWithConcurrencyLimit(fn) {
        if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
            await new Promise(resolve => pendingRequests.push(resolve));
        }
        activeRequests++;
        try { return await fn(); }
        finally {
            activeRequests--;
            if (pendingRequests.length) pendingRequests.shift()();
        }
    }

    function getCached(key, cacheMap, ttl) {
        const cached = cacheMap.get(key);
        if (cached && Date.now() - cached.timestamp < ttl) return cached.data;
        if (cacheMap === searchCache) {
            const stored = localStorage.getItem(`cache_${key}`);
            if (stored) {
                try {
                    const { data, timestamp } = JSON.parse(stored);
                    if (Date.now() - timestamp < ttl) {
                        cacheMap.set(key, { data, timestamp });
                        return data;
                    } else localStorage.removeItem(`cache_${key}`);
                } catch(e) {}
            }
        }
        return null;
    }

    function setCache(key, data, cacheMap, ttl, persist = false) {
        cacheMap.set(key, { data, timestamp: Date.now() });
        if (persist && cacheMap === searchCache) {
            try { localStorage.setItem(`cache_${key}`, JSON.stringify({ data, timestamp: Date.now() })); } catch(e) {}
        }
    }

    // ========== FUNÇÕES DE UI ==========
    function clearGrid() {
        if (!grid) return;
        grid.innerHTML = '';
        console.log('[UI Debug] Grid cleared');
    }

    function showLoading() {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        uiState.isLoading = true;
        uiState.hasResults = false;
        uiState.hasError = false;
        clearGrid();

        const skeleton = document.createElement('div');
        skeleton.className = 'loading-skeleton';
        skeleton.id = 'loadingSkeleton';
        skeleton.innerHTML = `
            <div class="spinner"></div>
            <p class="loading-text">${t('loading')}</p>
        `;
        skeleton.style.cssText = 'text-align: center; padding: 2rem; color: var(--text-secondary);';
        grid.appendChild(skeleton);
        console.log('[UI Debug] Loading shown');
    }

    function hideLoading() {
        uiState.isLoading = false;
        const skeleton = document.getElementById('loadingSkeleton');
        if (skeleton) skeleton.remove();
        console.log('[UI Debug] Loading hidden');
    }

    function showResults(items) {
        uiState.hasResults = true;
        uiState.hasError = false;
        hideLoading();
        clearGrid();
        renderItemsBatch(items);
        console.log(`[UI Debug] Results shown (${items.length} items)`);
    }

    function showEmptyState() {
        if (uiState.isLoading) return;
        if (uiState.hasResults) return;
        if (uiState.hasError) return;
        hideLoading();
        clearGrid();
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-state';
        emptyDiv.id = 'emptyState';
        emptyDiv.textContent = t('no_results');
        grid.appendChild(emptyDiv);
        document.getElementById('bookCount').innerText = '0';
        console.log('[UI Debug] Empty state shown');
    }

    function showErrorState() {
        uiState.hasError = true;
        uiState.hasResults = false;
        hideLoading();
        clearGrid();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-state';
        errorDiv.id = 'errorState';
        errorDiv.textContent = t('error_loading');
        grid.appendChild(errorDiv);
        document.getElementById('bookCount').innerText = '0';
        console.log('[UI Debug] Error state shown');
    }

    // ========== RENDERIZAÇÃO EM LOTE ==========
    let pendingRenderItems = [];
    let renderTimeout = null;
    function renderItemsBatch(items) {
        const validItems = (items || []).filter(item => item && item.title);
        if (validItems.length === 0) {
            showEmptyState();
            return;
        }

        uiState.hasResults = true;
        pendingRenderItems = validItems;
        if (renderTimeout) clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            const total = pendingRenderItems.length;
            let start = 0;
            function renderChunk() {
                const end = Math.min(start + BATCH_RENDER_SIZE, total);
                const chunk = pendingRenderItems.slice(start, end);
                const fragment = document.createDocumentFragment();
                chunk.forEach(item => {
                    const coverSrc = item.cover || 'https://placehold.co/200x260/1F2933/9CA3AF?text=Sem+Capa';
                    const card = document.createElement('div');
                    card.className = 'book-mini-card';
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
                        <img class="mini-cover" data-src="${coverSrc}" alt="${escapeHtml(item.title)}" onerror="this.src='https://placehold.co/200x260/1F2933/9CA3AF?text=Sem+Capa'">
                        <div class="mini-title">${escapeHtml(item.title)}</div>
                        <div class="mini-author">${escapeHtml(item.author)}</div>
                        <div class="mini-year">${escapeHtml(item.year || t('year_not_informed'))}</div>
                        <div class="mini-type-tag"><i class="${iconClass}"></i> ${t('type_' + item.type, item.type)}</div>
                    `;
                    card.addEventListener('click', () => showModal(item));
                    fragment.appendChild(card);
                });
                grid.appendChild(fragment);
                start = end;
                if (start < total) requestIdleCallback(renderChunk, { timeout: 50 });
                else {
                    document.getElementById('bookCount').innerText = total;
                    applyTranslations();
                    lazyLoadImages();
                }
            }
            grid.innerHTML = '';
            renderChunk();
            renderTimeout = null;
        }, 50);
    }

    function lazyLoadImages() {
        if (intersectionObserver) intersectionObserver.disconnect();
        intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const dataSrc = img.getAttribute('data-src');
                    if (dataSrc) {
                        img.src = dataSrc;
                        img.removeAttribute('data-src');
                    }
                    intersectionObserver.unobserve(img);
                }
            });
        }, { rootMargin: '200px' });
        document.querySelectorAll('.mini-cover').forEach(img => {
            if (img.src && !img.src.includes('placehold')) return;
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) intersectionObserver.observe(img);
        });
    }

    // ========== MODAL ==========
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
                    <p><strong>${t('book_language')}:</strong> ${escapeHtml(item.language ? item.language.toUpperCase() : 'EN')}</p>
                    <p><strong>${t('book_publisher')}:</strong> ${escapeHtml(item.source)}</p>
                    <p><strong>Tipo:</strong> ${t('type_' + item.type, item.type)}</p>
                    <div class="modal-description">${escapeHtml(item.abstract || t('no_description'))}</div>
                    <div class="modal-actions">
                        ${item.download_url ? `<a href="${escapeHtml(item.download_url)}" class="download-btn" target="_blank" rel="noopener noreferrer"><i class="fas fa-download"></i> ${t('download_book')}</a>` : ''}
                        ${item.link ? `<a href="${escapeHtml(item.link)}" class="download-btn" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${t('access_online')}</a>` : ''}
                    </div>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
    }

    function closeModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
    }
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

    // ========== BUSCA PRINCIPAL ==========
    let currentSearchId = 0;
    async function performSearchWithFilters(query) {
        const trimmed = normalizeQuery(query);
        const activeFilters = [];
        if (filterBooks.checked) activeFilters.push('book');
        if (filterArticles.checked) activeFilters.push('article');
        if (filterPapers.checked) activeFilters.push('paper');
        if (filterTCC.checked) activeFilters.push('tcc');
        if (filterDissertation.checked) activeFilters.push('dissertation');
        if (filterThesis.checked) activeFilters.push('thesis');

        if (activeFilters.length === 0) {
            showEmptyState();
            return;
        }

        const thisSearchId = ++currentSearchId;
        uiState.currentSearchId = thisSearchId;

        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();
        const signal = currentAbortController.signal;

        showLoading();

        const globalTimeout = setTimeout(() => {
            if (uiState.isLoading && thisSearchId === currentSearchId) {
                console.warn('[Search] Global timeout');
                if (currentAbortController) currentAbortController.abort();
                showErrorState();
            }
        }, MAX_SEARCH_TIME);

        try {
            let localFiltered = [];
            if (filterBooks.checked && trimmed) {
                const lower = trimmed.toLowerCase();
                localFiltered = allLocalBooks.filter(b =>
                    b.title?.toLowerCase().includes(lower) ||
                    b.author?.toLowerCase().includes(lower)
                );
            }

            const apiResults = await unifiedSearchWithFilters(trimmed, signal, activeFilters);
            if (thisSearchId !== currentSearchId) {
                console.log('[Search] Resultado de busca antiga ignorado');
                return;
            }

            const allResults = [...localFiltered, ...apiResults];
            const unique = removeDuplicateItems(allResults);
            if (unique.length > 0) {
                showResults(unique);
            } else {
                showEmptyState();
            }
        } catch (error) {
            console.error('[PerformSearch] Error:', error);
            if (thisSearchId === currentSearchId) {
                showErrorState();
            }
        } finally {
            clearTimeout(globalTimeout);
            hideLoading();
        }
    }

    let debounceTimer;
    function debounceSearch(func, delay) {
        return function(...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }
    const debouncedSearch = debounceSearch(performSearchWithFilters, 400);
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value;
            debouncedSearch(currentSearchTerm);
        });
    }

    const refreshOnFilterChange = () => {
        debouncedSearch(currentSearchTerm);
    };
    filterBooks.addEventListener('change', refreshOnFilterChange);
    filterArticles.addEventListener('change', refreshOnFilterChange);
    filterPapers.addEventListener('change', refreshOnFilterChange);
    filterTCC.addEventListener('change', refreshOnFilterChange);
    filterDissertation.addEventListener('change', refreshOnFilterChange);
    filterThesis.addEventListener('change', refreshOnFilterChange);

    // ========== SUGESTÕES INICIAIS ==========
    const SUGGESTION_AREAS = {
        math: {
            queries: ['mathematics', 'calculus', 'linear algebra', 'discrete mathematics', 'statistics'],
            types: ['book', 'article', 'paper']
        },
        technology: {
            queries: ['computer science', 'programming', 'algorithms', 'artificial intelligence', 'machine learning'],
            types: ['book', 'article', 'paper', 'dissertation', 'thesis', 'tcc']
        },
        physics: {
            queries: ['physics', 'quantum mechanics', 'thermodynamics', 'electromagnetism'],
            types: ['book', 'article', 'paper']
        },
        literature: {
            queries: ['literature', 'literary theory', 'poetry', 'novel'],
            types: ['book', 'article']
        }
    };

    const FALLBACK_ITEMS = [
        { title: 'Introduction to Algorithms', author: 'Cormen', year: '2009', type: 'book', source: 'Local', category: 'technology' },
        { title: 'Clean Code', author: 'Robert C. Martin', year: '2008', type: 'book', source: 'Local', category: 'technology' },
        { title: 'Calculus: Early Transcendentals', author: 'James Stewart', year: '2015', type: 'book', source: 'Local', category: 'math' },
        { title: 'Linear Algebra Done Right', author: 'Sheldon Axler', year: '2015', type: 'book', source: 'Local', category: 'math' },
        { title: 'Introduction to Quantum Mechanics', author: 'David J. Griffiths', year: '2017', type: 'book', source: 'Local', category: 'physics' },
        { title: 'Literary Theory: An Introduction', author: 'Terry Eagleton', year: '2008', type: 'book', source: 'Local', category: 'literature' }
    ];

    async function loadInitialSuggestions() {
        console.log('[Suggestions] Carregando sugestões iniciais...');
        const activeFilters = ['book', 'article', 'paper', 'tcc', 'dissertation', 'thesis'];
        let allItems = [];

        for (const [area, config] of Object.entries(SUGGESTION_AREAS)) {
            console.log(`[Suggestions] Buscando área: ${area}`);
            const shuffledQueries = [...config.queries].sort(() => 0.5 - Math.random());
            const selectedQueries = shuffledQueries.slice(0, 2);
            
            for (const query of selectedQueries) {
                try {
                    const results = await unifiedSearchWithFilters(query, null, activeFilters);
                    if (results && results.length) {
                        const categorized = results.slice(0, 8).map(item => {
                            item.category = area;
                            return item;
                        });
                        allItems.push(...categorized);
                        break;
                    }
                } catch (e) {
                    console.warn(`[Suggestions] Erro na query "${query}" para área ${area}:`, e);
                }
                await new Promise(r => setTimeout(r, 200));
            }
        }

        if (allItems.length === 0) {
            console.log('[Suggestions] Nenhum resultado das APIs, usando fallback local');
            for (const fb of FALLBACK_ITEMS) {
                const normalized = await normalizeSearchItem(fb, 'Local', fb.type, null);
                if (normalized) {
                    normalized.category = fb.category;
                    allItems.push(normalized);
                }
            }
        }

        const unique = removeDuplicateItems(allItems);
        const shuffled = unique.sort(() => 0.5 - Math.random());
        const topSuggestions = shuffled.slice(0, 40);
        
        if (topSuggestions.length > 0) {
            showResults(topSuggestions);
            console.log(`[Suggestions] ${topSuggestions.length} sugestões iniciais carregadas`);
        } else {
            showEmptyState();
        }

        console.log('[API Audit] Final metrics:', apiMetrics);
    }

    // ========== DADOS LOCAIS ==========
    async function loadLocalBooks() {
        try {
            const response = await fetch('books.json');
            if (response.ok) {
                const books = await response.json();
                const validBooks = [];
                for (const book of books) {
                    const normalized = await normalizeSearchItem(book, 'Local', book.type || 'book', null);
                    if (normalized) validBooks.push(normalized);
                }
                return validBooks;
            }
        } catch (e) { console.warn('[LocalBooks] Error', e); }
        return [];
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') return str || '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    // ========== INICIALIZAÇÃO ==========
    async function init() {
        console.log('[Init] Biblioteca starting');
        allLocalBooks = await loadLocalBooks();
        const initialLang = getUserLanguage();
        await setLanguage(initialLang);
        await loadInitialSuggestions();
    }
    init();
});