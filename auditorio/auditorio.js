// auditorio/auditorio.js – Player YouTube + YouTube Data API v3
// Com Shorts, categorias temáticas, prioridade de idioma, lives e podcasts
// Filtro por canais via canais.json
// Tratamento de cota excedida e cache de 24h
// Tradução completa via i18n
// Sistema de decisão automática para Shorts
// Detecção de idioma ultracompleta (60+ idiomas)

// ========== VARIÁVEIS GLOBAIS ==========
let allVideos = [];
let allItems = [];
let currentTypeFilter = 'all';
let currentSubjectFilter = 'all';
let currentLanguageFilter = 'all';
let currentSearchTerm = '';
let currentLang = 'pt-br';
let translations = {};

let player = null;
let playerReady = false;
let currentVideoId = null;
let updateTimer = null;
let videoProgress = {};
let audioMode = false;

let pendingVideo = null;
let apiLoadAttempts = 0;
const MAX_API_ATTEMPTS = 8;
const API_RETRY_DELAY = 250;
const metadataCache = new Map();
const languageCache = new Map();

// ========== CONTROLE DE COTA ==========
let apiQuotaExceeded = false;

// ========== CONFIGURAÇÕES DE APIs ==========
const YOUTUBE_CONFIG = {
    apiKey: 'AIzaSyATrKdi9UhEG1d8g0jXu-M6K0UihV91Vwk'
};

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

let channelFilters = { video: [], podcast: [], live: [], shorts: [] };

// ========== SUPRESSÃO TOTAL DE LOGS DO YOUTUBE ==========
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = function(...args) {
    const msg = args[0]?.toString() || '';
    if (msg.includes('postMessage') || msg.includes('web-share') || msg.includes('Unrecognized feature')) {
        return;
    }
    originalConsoleError.apply(console, args);
};

console.warn = function(...args) {
    const msg = args[0]?.toString() || '';
    if (msg.includes('postMessage') || msg.includes('web-share') || msg.includes('Unrecognized feature')) {
        return;
    }
    originalConsoleWarn.apply(console, args);
};

// ========== UTILITÁRIOS ==========
function normalizeText(text) { return (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
function escapeHtml(s){return s?String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])):'';}
function getCachedOrFetch(cacheKey, fetchFn, ttl = CACHE_TTL) {
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < ttl) return Promise.resolve(cached.data);
    }
    return fetchFn().then(data => { cache.set(cacheKey, { data, timestamp: Date.now() }); return data; });
}

// ========== I18N ==========
async function loadTranslations(lang) {
    try {
        const response = await fetch(`../lang/${lang}.json`);
        if (!response.ok) throw new Error();
        translations = await response.json();
        return true;
    } catch {
        if (lang !== 'pt-br') return loadTranslations('pt-br');
        translations = {
            "subject_tecnologia": "Tecnologia", "subject_ciencia": "Ciência", "subject_matematica": "Matemática",
            "subject_historia": "História", "subject_literatura": "Literatura", "subject_filosofia": "Filosofia",
            "subject_psicologia": "Psicologia", "subject_economia": "Economia", "subject_politica": "Política",
            "subject_saude": "Saúde", "subject_educacao": "Educação", "subject_arte": "Arte",
            "subject_esportes": "Esportes", "subject_negocios": "Negócios", "subject_viagem": "Viagem",
            "subject_religiao": "Religião", "subject_autoajuda": "Autoajuda", "subject_culinaria": "Culinária",
            "subject_shorts": "Shorts", "subject_outros": "Outros",
            "lang_pt": "Português", "lang_en": "Inglês", "lang_es": "Espanhol", "lang_fr": "Francês",
            "lang_de": "Alemão", "lang_it": "Italiano", "lang_ja": "Japonês", "lang_zh": "Chinês",
            "lang_ko": "Coreano", "lang_ru": "Russo", "lang_ar": "Árabe", "lang_hi": "Hindi",
            "lang_undefined": "Indefinido",
            "badge_live": "AO VIVO", "badge_podcast": "PODCAST", "badge_shorts": "SHORTS",
            "auditorio_description": "Vídeos educativos selecionados pela comunidade.",
            "no_videos": "Nenhum item encontrado.", "search_videos_placeholder": "Buscar vídeos ou podcasts...",
            "random_btn": "Aleatório", "filter_by_type": "Filtrar por tipo:", "filter_by_subject": "Filtrar por assunto:",
            "filter_by_language": "Filtrar por idioma:", "app_title": "Auditório · Universidade Livre",
            "player_fallback_active": "⚠️ Player simplificado ativo.", "retry_player": "Tentar player completo",
            "loading": "Carregando...", "all": "Todos", "type_video": "Vídeos", "type_podcast": "Podcasts",
            "type_live": "Lives", "type_shorts": "Shorts", "items": "itens", "playlist_empty": "Fila vazia",
            "player_error_generic": "Erro no player.", "player_error_removed": "Vídeo removido.",
            "player_error_issue": "Problema no player.", "player_error_not_found": "Vídeo não encontrado."
        };
        return false;
    }
}

function t(key, fallback = '') { return translations[key] || fallback || key; }
function getSubjectName(subject) { return t(`subject_${subject}`, subject); }
function getLanguageName(langCode) { return t(`lang_${langCode}`, langCode?.toUpperCase() || 'Indefinido'); }

function applyTranslationsToUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[key]) {
            if (el.tagName === 'INPUT') el.placeholder = translations[key];
            else el.innerText = translations[key];
        }
    });
    document.title = t('app_title');
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = t('search_videos_placeholder');
    const randomBtn = document.querySelector('#randomVideoBtn span');
    if (randomBtn) randomBtn.innerText = t('random_btn');
    const typeFilterSpan = document.querySelector('.type-filter span');
    if (typeFilterSpan) typeFilterSpan.innerText = t('filter_by_type');
    const subjectFilterSpan = document.querySelector('.subject-filter span');
    if (subjectFilterSpan) subjectFilterSpan.innerText = t('filter_by_subject');
    const languageFilterSpan = document.querySelector('.language-filter span');
    if (languageFilterSpan) languageFilterSpan.innerText = t('filter_by_language');
}

// ========== SISTEMA DE DECISÃO AUTOMÁTICA PARA SHORTS ==========
function isShortVideo(item) {
    let score = 0;
    if (item.url && item.url.includes('/shorts/')) return true;
    if (item.categoryId && (item.categoryId === '42' || item.categoryId === '43')) return true;
    if (item.duration !== undefined && item.duration <= 60) score += 40;
    const title = (item.title || '').toLowerCase();
    if (title.includes('#shorts') || title.includes('#short')) score += 30;
    if (title.includes('shorts') || title.includes('short')) score += 15;
    const desc = (item.description || '').toLowerCase();
    if (desc.includes('#shorts') || desc.includes('#short')) score += 15;
    const shortKeywords = ['curto', 'rápido', 'rapido', 'short', 'shorts'];
    if (shortKeywords.some(kw => title.includes(kw))) score += 5;
    return score >= 40;
}

// ========== MAPEAMENTO DE CATEGORIAS ==========
const categoryToSubject = {
    '1': 'arte', '2': 'automotive', '10': 'arte', '15': 'ciencia', '17': 'esportes',
    '18': 'shorts', '19': 'viagem', '20': 'games', '21': 'cinema', '22': 'tecnologia',
    '23': 'humor', '24': 'entretenimento', '25': 'noticias', '26': 'autoajuda',
    '27': 'educacao', '28': 'ciencia', '29': 'tecnologia', '30': 'cinema',
    '31': 'games', '32': 'cinema', '33': 'cinema', '34': 'humor', '35': 'cinema',
    '36': 'cinema', '37': 'cinema', '38': 'cinema', '39': 'cinema', '40': 'cinema',
    '41': 'cinema', '42': 'shorts', '43': 'shorts', '44': 'cinema'
};

const categoryNameMap = {
    'education': 'educacao', 'science & technology': 'ciencia', 'science': 'ciencia',
    'technology': 'tecnologia', 'music': 'arte', 'film & animation': 'arte',
    'sports': 'esportes', 'gaming': 'games', 'people & blogs': 'outros',
    'entertainment': 'entretenimento', 'news & politics': 'noticias',
    'howto & style': 'autoajuda', 'travel & events': 'viagem', 'comedy': 'humor',
    'autos & vehicles': 'automotive', 'pets & animals': 'ciencia',
    'nonprofits & activism': 'tecnologia', 'movies': 'cinema', 'shorts': 'shorts'
};

function mapCategoryToSubject(categoryId, categoryTitle) {
    if (categoryId && categoryToSubject[categoryId]) return categoryToSubject[categoryId];
    if (categoryTitle) {
        const lower = categoryTitle.toLowerCase();
        for (const [key, subject] of Object.entries(categoryNameMap)) {
            if (lower.includes(key)) return subject;
        }
    }
    return 'outros';
}

function detectSubjectLocal(title, description) {
    const categoryKeywords = {
        tecnologia: ['programação','software','hardware','código','algoritmo','inteligência artificial','machine learning','dados','cloud','computação','python','javascript','java','c++','react','node','api','devops','segurança','hacker','cyber','blockchain','web','mobile','aplicativo','framework','backend','frontend','banco de dados','sql','nosql','docker','kubernetes','linux','windows','mac','android','ios','tecnologia','inovação','digital','internet','rede','servidor'],
        ciencia: ['ciência','pesquisa','laboratório','experimento','física','química','biologia','astronomia','cosmologia','genética','evolução','ecologia','neurociência','robótica','nanotecnologia','biotecnologia','sustentabilidade','meio ambiente','clima','planeta','universo','galáxia','buraco negro','partícula','átomo','molécula','science','research','experiment','physics','chemistry','biology','astronomy'],
        matematica: ['matemática','álgebra','geometria','cálculo','trigonometria','estatística','probabilidade','equação','função','gráfico','número','frações','aritmética','teorema','math','algebra','calculus','geometry','statistics'],
        filosofia: ['filosofia','pensamento','ética','moral','existencialismo','metafísica','epistemologia','lógica','aristóteles','platão','sócrates','nietzsche','kant','hegel','philosophy'],
        literatura: ['literatura','livro','escritor','poesia','romance','conto','crônica','ensaio','biblioteca','ler','autor','clássico','ficção','fantasia','aventura','drama','literary','book','writer','poem','novel','fiction'],
        psicologia: ['psicologia','comportamento','mente','cognitivo','emoções','freud','jung','psicanálise','terapia','transtorno','ansiedade','depressão','psychology'],
        economia: ['economia','mercado','finanças','investimento','capitalismo','socialismo','inflação','juros','pib','desemprego','economy','finance'],
        politica: ['política','governo','democracia','ditadura','eleições','partido','congresso','senado','presidente','diplomacia','politics'],
        saude: ['saúde','medicina','doença','tratamento','cura','vacina','hospital','clínica','nutrição','exercício','bem-estar','health','medicine'],
        educacao: ['educação','ensino','aprendizagem','escola','universidade','professor','aluno','pedagogia','didática','education','learning'],
        arte: ['arte','pintura','escultura','música','dança','teatro','cinema','fotografia','arquitetura','design','art','music'],
        esportes: ['esporte','futebol','basquete','vôlei','tênis','corrida','natação','olimpíadas','esportes','sports'],
        negocios: ['negócios','empreendedorismo','startup','empresa','gestão','liderança','marketing','vendas','business','entrepreneurship'],
        viagem: ['viagem','turismo','destino','aventura','exploração','travel','tourism'],
        religiao: ['religião','deus','bíblia','cristianismo','islamismo','budismo','hinduísmo','espiritualidade','fé','religion'],
        autoajuda: ['autoajuda','desenvolvimento pessoal','motivação','produtividade','sucesso','hábitos','self-help'],
        culinaria: ['culinária','receita','gastronomia','cozinha','chef','comida','bebida','cooking','food']
    };
    const fullText = normalizeText(title + ' ' + description);
    const scores = {};
    for (const cat in categoryKeywords) scores[cat] = 0;
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
        for (const kw of keywords) if (fullText.includes(normalizeText(kw))) scores[cat] += 1;
    }
    let best = 'outros', max = 0;
    for (const [cat, score] of Object.entries(scores)) if (score > max) { max = score; best = cat; }
    return best;
}

// ========== YOUTUBE API ==========
async function searchYouTube(query, maxResults = 30, options = {}) {
    if (apiQuotaExceeded) return [];
    const { apiKey } = YOUTUBE_CONFIG;
    if (!apiKey) return [];
    const { type = 'video', podcastMode = false, liveMode = false, shortsMode = false, channelIds = [] } = options;
    let searchTerm = query;
    if (podcastMode) searchTerm = `${query} podcast`;
    if (liveMode) searchTerm = query;
    if (shortsMode) searchTerm = `${query} shorts`;
    const cacheKey = `yt_${normalizeText(searchTerm)}_${type}_${podcastMode}_${liveMode}_${shortsMode}_${maxResults}_${channelIds.join(',')}`;
    return getCachedOrFetch(cacheKey, async () => {
        try {
            const url = new URL('https://www.googleapis.com/youtube/v3/search');
            url.searchParams.append('part', 'snippet');
            url.searchParams.append('q', searchTerm);
            url.searchParams.append('type', type);
            url.searchParams.append('maxResults', maxResults);
            url.searchParams.append('key', apiKey);
            url.searchParams.append('videoEmbeddable', 'true');
            if (channelIds.length) url.searchParams.append('channelId', channelIds.join(','));
            if (liveMode) { url.searchParams.append('eventType', 'live'); url.searchParams.append('type', 'video'); }
            if (podcastMode) url.searchParams.append('videoDuration', 'long');
            if (shortsMode) url.searchParams.append('videoDuration', 'short');
            if (currentLanguageFilter !== 'all') url.searchParams.append('relevanceLanguage', currentLanguageFilter);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url.toString(), { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error?.message?.includes('quota')) apiQuotaExceeded = true;
                return [];
            }
            const data = await response.json();
            const videoIds = data.items.map(item => item.id.videoId).filter(Boolean);
            const details = await fetchVideoDetails(videoIds);
            return data.items.map(item => {
                const snippet = item.snippet;
                const videoId = item.id.videoId;
                const detail = details[videoId] || {};
                let itemType = 'video';
                if (liveMode) itemType = 'live';
                else if (podcastMode) itemType = 'podcast';
                else if (shortsMode) itemType = 'shorts';
                const language = detail.language || detectLanguageLocal(snippet.title, snippet.description);
                const subject = detail.categoryId ? mapCategoryToSubject(detail.categoryId, detail.categoryTitle) : detectSubjectLocal(snippet.title, snippet.description);
                const newItem = {
                    id: `yt_${videoId}`, videoId, title: snippet.title, description: snippet.description,
                    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
                    type: itemType, subject, language, url: `https://www.youtube.com/watch?v=${videoId}`,
                    source: 'YouTube', publishedAt: snippet.publishedAt, channelTitle: snippet.channelTitle,
                    duration: detail.duration, categoryId: detail.categoryId,
                    isLive: liveMode || snippet.liveBroadcastContent === 'live'
                };
                if (itemType !== 'shorts' && isShortVideo(newItem)) {
                    newItem.type = 'shorts';
                    newItem.isLive = false;
                }
                return newItem;
            });
        } catch (e) { return []; }
    }, CACHE_TTL);
}

async function fetchVideoDetails(videoIds) {
    if (!videoIds.length || apiQuotaExceeded) return {};
    const { apiKey } = YOUTUBE_CONFIG;
    const cacheKey = `details_${videoIds.sort().join(',')}`;
    return getCachedOrFetch(cacheKey, async () => {
        try {
            const url = new URL('https://www.googleapis.com/youtube/v3/videos');
            url.searchParams.append('part', 'snippet,contentDetails');
            url.searchParams.append('id', videoIds.join(','));
            url.searchParams.append('key', apiKey);
            const response = await fetch(url.toString());
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error?.message?.includes('quota')) apiQuotaExceeded = true;
                return {};
            }
            const data = await response.json();
            const details = {};
            data.items.forEach(item => {
                const videoId = item.id;
                const snippet = item.snippet;
                const contentDetails = item.contentDetails;
                let language = snippet.defaultAudioLanguage || snippet.defaultLanguage;
                if (!language) language = detectLanguageLocal(snippet.title, snippet.description);
                languageCache.set(videoId, language);
                let durationSec = 0;
                const durationStr = contentDetails?.duration || '';
                const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                if (match) {
                    const hours = parseInt(match[1] || '0');
                    const minutes = parseInt(match[2] || '0');
                    const seconds = parseInt(match[3] || '0');
                    durationSec = hours * 3600 + minutes * 60 + seconds;
                }
                details[videoId] = { language, duration: durationSec, categoryId: snippet.categoryId, categoryTitle: snippet.categoryTitle || '' };
            });
            return details;
        } catch (e) { return {}; }
    }, CACHE_TTL * 2);
}

// ========== DETECÇÃO DE IDIOMA ULTRACOMPLETA (60+ IDIOMAS) ==========
const LANG_STOPWORDS = {
    pt: 'de que e para com uma por mais como sua este esta você também sobre pode anos entre ser muito casa trabalho vida tempo pessoas país mundo brasil português porque está estão são foram era tinha eles nós ter fazer dizer dar ir ver estar haver poder dever querer não então bem mal hoje amanhã ontem ção ções mente dade'.split(' '),
    en: 'the and for with you this are have from they know your can more about just like people time year good work life world english will was were been has had their them would could should make get see use tion sion ment ness'.split(' '),
    es: 'el la de y que en por con para como su sobre este esta usted años vida trabajo personas español los las se ha han está están era eran muy bien gracias hola ser tener hacer decir ir ver dar ción dad mente'.split(' '),
    fr: 'le la de et que en pour par avec comme sur ce cette vous plus années vie travail personnes français sont était étaient avoir être ils elles faire dire aller voir prendre ment tion eux euse'.split(' '),
    de: 'der die und für mit von sich auf nach als über diese dieser sie mehr jahre leben arbeit menschen deutsch ist sind war waren wurde wurden sein haben werden können müssen sollen keit heit ung schaft'.split(' '),
    it: 'il la di e che per con come su questo questa lei più anni vita lavoro persone italiano sono era erano stato stata essere avere fare dire andare vedere dare zione mento ità'.split(' '),
    ru: 'и в не на я что с по а он как его но из они за русский год жизнь это было были быть сказать мочь хотеть знать думать ность ение овать'.split(' '),
    zh: '的 了 是 我 不 在 人 有 他 这 中 大 来 上 国 为 子 你 说 中文 也 个 们 到 去 看 好 什么 没有 可以 自己 因为 所以'.split(' '),
    ja: 'です ます た ない れる よう から まで て が を に の は 日本語 これ それ あれ 私 あなた する いる ある なる こと もの'.split(' '),
    ko: '은 는 이 가 을 를 에 에서 으로 로 한국어 그 저 이것 저것 사람 년 일 하다 있다 않다 없다 그리고 또한 습니다'.split(' '),
    ar: 'في من أن على هذا هذه الذي التي عن مع بعد قبل عند خلال العربية كان كانت يكون لي لك له لها ما لا إلى حتى قد'.split(' '),
    hi: 'है हैं और के में से पर यह वह इस उस हिंदी कर करना होना जाना देना लेना का की को ने तक बाद पहले'.split(' '),
    nl: 'de het een van in op voor met dat dit deze nederlands zijn hebben worden kunnen moeten zullen niet wel maar ook nog al veel mensen'.split(' '),
    sv: 'och att det som en på för med av den detta svenska vara ha kunna skola vilja inte men eller om när där här han hon'.split(' '),
    pl: 'i w na z do po przez dla ten ta to polski być mieć móc chcieć nie tak jak co który jego jej ich się już'.split(' '),
    tr: 've bir bu şu o için ile gibi kadar sonra türkçe olmak etmek yapmak gelmek gitmek değil mi da de ya ki çok daha en'.split(' '),
    cs: 'a být je v na s z do od pro za po při jako i ale které který že se si svůj tento tato toto český'.split(' '),
    el: 'και η το ο να δεν είναι σε για από με που τα της του τους τις ένα μια αυτό αυτή αυτές ελληνικ'.split(' '),
    fi: 'ja on se ei että oli ovat kuin kun kanssa mutta myös kuin hän me te he tämä tässä suomi suomen'.split(' '),
    he: 'את של על לא זה עם גם אם כי או היא הוא אבל אשר עד בין כמו כל עוד כך אחת אחד ישראל עברית'.split(' '),
    hu: 'és hogy a az egy ez azt is nem van de ha már mint még csak el meg mit ki be le fel magyar'.split(' '),
    id: 'dan yang di untuk dengan pada adalah itu dalam ini saya kamu dia kita mereka apa bisa ada tidak akan juga indonesia'.split(' '),
    no: 'og det å er jeg ikke du en den vi de at som skal har til med for av norsk'.split(' '),
    ro: 'și de la cu în pe care din ce ca sau dar pentru acest această română este sunt ați au fost'.split(' '),
    sk: 'a byť je v na s z do od pre po pri ako i ale ktorý ktorá ktoré že sa si svoj tento slovensk'.split(' '),
    th: 'ที่ เป็น ไม่ ได้ และ ใน มี ว่า ไป มา ต้อง จะ ของ โดย กับ สำหรับ เรา คุณ เขา มัน นี้ ภาษาไทย'.split(' '),
    vi: 'và của một là không có trong cho với những được khi từ bởi nếu nhưng mà tôi anh chúng ta nó họ tiếng việt'.split(' '),
    bg: 'и на за да не се от в със по като или че след до при а но български това тази тези'.split(' '),
    ca: 'i de que el la en per amb un una aquest aquesta nosaltres vosaltres ells elles català'.split(' '),
    da: 'og at det er jeg du den en de vi at som skal har til med for af dansk'.split(' '),
    et: 'ja see on et ei kui siis ka ning aga või ette eest eesti'.split(' '),
    hr: 'i je u na za od s do iz po pri jer ali ili da ne bi će hrvatski'.split(' '),
    lt: 'ir yra su į iš per nuo po prie bet arba kad kaip šis ši šitas šita lietuvių'.split(' '),
    lv: 'un ir uz no ar pa pēc pie bet vai ka kā šis šī latviešu'.split(' '),
    ms: 'dan yang di untuk pada dengan itu ini saya kamu dia kita mereka apa bisa ada tidak akan juga malaysia'.split(' '),
    sl: 'in je v na z s do od za po pri ker ali če da ne bi slovenski'.split(' '),
    sr: 'и је у на за од са из по при јер или ако да не би ће српски'.split(' '),
    uk: 'і в на з до для по при про як що це цей ця ці український'.split(' '),
    fa: 'و در به از با که این آن برای است را که تا از اما یا اگر چون فارسی'.split(' '),
    bn: 'এবং এর মধ্যে যে জন্য সঙ্গে হয় না কর এই ওই আমি তুমি সে আমরা তারা বাংলা'.split(' '),
    ta: 'மற்றும் இந்த ஒரு என்று உள்ளது நான் நீங்கள் அவர் அவள் அது நாங்கள் நீங்கள் அவர்கள் தமிழ்'.split(' '),
    te: 'మరియు ఈ ఒక అని ఉంది నేను నువ్వు అతను ఆమె అది మేము మీరు వారు తెలుగు'.split(' '),
    ml: 'ഒപ്പം ഈ ഒരു എന്ന് ഉണ്ട് ഞാൻ നീ അവൻ അവൾ അത് ഞങ്ങൾ നിങ്ങൾ അവർ മലയാളം'.split(' '),
    kn: 'ಮತ್ತು ಈ ಒಂದು ಎಂದು ಇದೆ ನಾನು ನೀನು ಅವನು ಅವಳು ಅದು ನಾವು ನೀವು ಅವರು ಕನ್ನಡ'.split(' '),
    mr: 'आणि हे एक की आहे मी तू तो ती ते आम्ही तुम्ही ते मराठी'.split(' '),
    gu: 'અને આ એક કે છે હું તું તે તેણી તે અમે તમે તેઓ ગુજરાતી'.split(' '),
    pa: 'ਅਤੇ ਇਹ ਇੱਕ ਕਿ ਹੈ ਮੈਂ ਤੂੰ ਉਹ ਉਹ ਇਹ ਅਸੀਂ ਤੁਸੀਂ ਉਹ ਪੰਜਾਬੀ'.split(' ')
};

// Detecção por script Unicode (prioridade máxima)
function detectScript(text) {
    if (!text) return null;
    // Asiáticos
    if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
    if (/[\u3040-\u309F]/.test(text)) return 'ja';
    if (/[\u30A0-\u30FF]/.test(text)) return 'ja';
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
    // Sul e Sudeste Asiático
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Devanagari
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Gurmukhi
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Odia
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0D80-\u0DFF]/.test(text)) return 'si'; // Sinhala
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th'; // Thai
    if (/[\u0E80-\u0EFF]/.test(text)) return 'lo'; // Lao
    if (/[\u0F00-\u0FFF]/.test(text)) return 'bo'; // Tibetan
    if (/[\u1000-\u109F]/.test(text)) return 'my'; // Myanmar
    if (/[\u1780-\u17FF]/.test(text)) return 'km'; // Khmer
    // Oriente Médio
    if (/[\u0600-\u06FF]/.test(text)) return 'ar'; // Arabic
    if (/[\u0750-\u077F]/.test(text)) return 'ar'; // Arabic Supplement
    if (/[\uFB50-\uFDFF]/.test(text)) return 'ar'; // Arabic Presentation Forms-A
    if (/[\uFE70-\uFEFF]/.test(text)) return 'ar'; // Arabic Presentation Forms-B
    if (/[\u0590-\u05FF]/.test(text)) return 'he'; // Hebrew
    if (/[\uFB1D-\uFB4F]/.test(text)) return 'he'; // Hebrew Presentation Forms
    // Cirílico
    if (/[\u0400-\u04FF]/.test(text)) return 'ru';
    if (/[\u0500-\u052F]/.test(text)) return 'ru'; // Cyrillic Supplement
    if (/[\u2DE0-\u2DFF]/.test(text)) return 'ru'; // Cyrillic Extended-A
    if (/[\uA640-\uA69F]/.test(text)) return 'ru'; // Cyrillic Extended-B
    // Grego
    if (/[\u0370-\u03FF]/.test(text)) return 'el';
    // Georgiano
    if (/[\u10A0-\u10FF]/.test(text)) return 'ka';
    // Armênio
    if (/[\u0530-\u058F]/.test(text)) return 'hy';
    // Etíope
    if (/[\u1200-\u137F]/.test(text)) return 'am';
    // Tifinagh
    if (/[\u2D30-\u2D7F]/.test(text)) return 'ber';
    return null;
}

function detectLanguageLocal(title, description = '') {
    const text = (title + ' ' + description).trim();
    if (!text) return 'en';
    
    // 1. Detecção por script (alta confiança)
    const scriptLang = detectScript(text);
    if (scriptLang) return scriptLang;
    
    // 2. Análise de stopwords e padrões
    const words = text.toLowerCase().split(/[\s,.;!?()\[\]{}"':-]+/).filter(w => w.length > 1);
    const scores = {};
    
    // Inicializar scores
    for (const lang in LANG_STOPWORDS) scores[lang] = 0;
    
    // Contar stopwords
    for (const word of words) {
        for (const lang in LANG_STOPWORDS) {
            if (LANG_STOPWORDS[lang].includes(word)) {
                scores[lang] += 1;
            }
        }
    }
    
    // Bônus por padrões ortográficos
    const normalized = text.toLowerCase();
    if (normalized.match(/[áàâãéêíóôõúüç]/i)) scores.pt = (scores.pt || 0) + 10;
    if (normalized.match(/[áéíóúüñ¿¡]/i)) scores.es = (scores.es || 0) + 10;
    if (normalized.match(/[àâçéèêëîïôœùûüÿ]/i)) scores.fr = (scores.fr || 0) + 10;
    if (normalized.match(/[äöüß]/i)) scores.de = (scores.de || 0) + 10;
    if (normalized.match(/[àèéìíîòóùú]/i)) scores.it = (scores.it || 0) + 8;
    if (normalized.match(/[áéíóúýðþæö]/i)) scores.en = (scores.en || 0) + 2;
    if (normalized.match(/[åäö]/i)) scores.sv = (scores.sv || 0) + 5;
    if (normalized.match(/[æøå]/i)) scores.no = (scores.no || 0) + 5;
    if (normalized.match(/[ěščřžýáíé]/i)) scores.cs = (scores.cs || 0) + 5;
    if (normalized.match(/[ąčęėįšųūž]/i)) scores.lt = (scores.lt || 0) + 5;
    
    // Encontrar o idioma com maior pontuação
    let bestLang = 'en';
    let maxScore = 0;
    for (const lang in scores) {
        if (scores[lang] > maxScore) {
            maxScore = scores[lang];
            bestLang = lang;
        }
    }
    
    // Se a pontuação for muito baixa, fallback para inglês
    if (maxScore < 2) return 'en';
    return bestLang;
}

// ========== BUSCA UNIFICADA ==========
const languagePriority = { 'pt':1, 'en':2, 'es':3, 'zh':4, 'fr':5, 'de':6, 'it':7, 'ja':8, 'ru':9, 'ar':10, 'hi':11, 'ko':12 };

async function searchAllContent(query, filterType = 'all') {
    let results = [];
    let channelIds = [];
    if (filterType === 'podcast') channelIds = channelFilters.podcast || [];
    else if (filterType === 'live') channelIds = channelFilters.live || [];
    else if (filterType === 'shorts') channelIds = channelFilters.shorts || [];
    else if (filterType === 'video') channelIds = channelFilters.video || [];
    else channelIds = channelFilters.video || [];
    
    if (filterType === 'podcast') results = await searchYouTube(query, 30, { podcastMode: true, channelIds });
    else if (filterType === 'live') results = await searchYouTube(query, 30, { liveMode: true, channelIds });
    else if (filterType === 'shorts') results = await searchYouTube(query, 30, { shortsMode: true, channelIds });
    else if (filterType === 'video') results = await searchYouTube(query, 30, { channelIds });
    else {
        const [videos, podcasts, lives, shorts] = await Promise.all([
            searchYouTube(query, 12, { channelIds: channelFilters.video || [] }),
            searchYouTube(query, 12, { podcastMode: true, channelIds: channelFilters.podcast || [] }),
            searchYouTube(query, 8, { liveMode: true, channelIds: channelFilters.live || [] }),
            searchYouTube(query, 8, { shortsMode: true, channelIds: channelFilters.shorts || [] })
        ]);
        results = [...videos, ...podcasts, ...lives, ...shorts];
    }
    results.sort((a, b) => {
        const langA = a.language?.slice(0,2) || 'en';
        const langB = b.language?.slice(0,2) || 'en';
        const priorityA = languagePriority[langA] || 99;
        const priorityB = languagePriority[langB] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return 0;
    });
    return results;
}

// ========== VÍDEOS LOCAIS ==========
async function loadVideosFromJSON() {
    try {
        const r = await fetch('videos.json');
        if (!r.ok) return [];
        const data = await r.json();
        return data.map((item, idx) => {
            const videoId = extractVideoId(item.url);
            if (!videoId) return null;
            
            let itemType = item.type;
            if (!itemType) {
                const tempItem = { title: item.title, description: item.description, url: item.url, thumbnail: item.thumbnail };
                if (isShortVideo(tempItem)) {
                    itemType = 'shorts';
                } else {
                    const lowerTitle = (item.title || '').toLowerCase();
                    const lowerUrl = (item.url || '').toLowerCase();
                    if (lowerUrl.includes('/shorts/') || lowerTitle.includes('shorts')) {
                        itemType = 'shorts';
                    } else if (lowerTitle.includes('podcast')) {
                        itemType = 'podcast';
                    } else if (lowerTitle.includes('live') || lowerTitle.includes('ao vivo')) {
                        itemType = 'live';
                    } else {
                        itemType = 'video';
                    }
                }
            }
            
            return {
                id: `local_${idx}`,
                videoId: videoId,
                title: item.title,
                description: item.description || '',
                thumbnail: item.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                type: itemType,
                subject: item.subject || detectSubjectLocal(item.title, item.description || ''),
                language: detectLanguageLocal(item.title, item.description || ''),
                url: item.url,
                source: 'Local',
                isLive: itemType === 'live'
            };
        }).filter(v => v);
    } catch (e) { return []; }
}

function extractVideoId(url) {
    if (!url) return null;
    const patterns = [/youtube\.com\/watch\?v=([^&?#]+)/i, /youtu\.be\/([^?#]+)/i, /youtube\.com\/embed\/([^?#]+)/i];
    for (const p of patterns) { const m = url.match(p); if (m && m[1]) return m[1]; }
    return null;
}

// ========== ATUALIZAÇÃO PRINCIPAL ==========
async function refreshAllItems(term = '') {
    showLoading();
    try {
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve([]), 15000));
        const [localVideos, onlineContent] = await Promise.allSettled([
            loadVideosFromJSON(),
            apiQuotaExceeded ? Promise.resolve([]) : Promise.race([
                term.length >= 2 ? searchAllContent(term, currentTypeFilter) : searchAllContent('popular', currentTypeFilter),
                timeoutPromise
            ])
        ]);
        allVideos = [...(localVideos.status === 'fulfilled' ? localVideos.value : []), ...(onlineContent.status === 'fulfilled' ? onlineContent.value : [])];
        allItems = [...allVideos];
        buildSubjectChips(); buildLanguageChips(allItems);
    } catch (e) { console.error('Erro ao carregar itens:', e); }
    finally { hideLoading(); }
}

// ========== PLAYER YOUTUBE ==========
function isYouTubeAPIReady() { return typeof YT !== 'undefined' && YT.Player && YT.loaded; }
function waitForYouTubeAPI(callback) {
    if (isYouTubeAPIReady()) { callback(); return; }
    if (apiLoadAttempts++ < MAX_API_ATTEMPTS) { setTimeout(() => waitForYouTubeAPI(callback), API_RETRY_DELAY); }
    else { useFallbackPlayer(); }
}
function useFallbackPlayer() {
    const wrapper = document.querySelector('.player-wrapper');
    if (!wrapper) return;
    const videoId = currentVideoId || (pendingVideo && pendingVideo.videoId);
    if (!videoId) return;
    wrapper.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0" frameborder="0" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe>`;
    if (pendingVideo) {
        document.getElementById('playerTitle').textContent = pendingVideo.title;
        document.getElementById('playerDescription').textContent = pendingVideo.description;
        pendingVideo = null;
    }
    document.getElementById('playPauseBtn').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'none';
    document.querySelector('.volume-control').style.display = 'none';
    const existingMsg = document.querySelector('.fallback-message');
    if (!existingMsg) {
        const msgDiv = document.createElement('div'); msgDiv.className = 'fallback-message';
        msgDiv.style.cssText = 'padding:0.5rem;text-align:center;font-size:0.8rem;color:var(--text-secondary);';
        msgDiv.innerHTML = `${t('player_fallback_active')} <button id="retryPlayerBtn" style="background:none;border:none;color:var(--accent-blue);cursor:pointer;text-decoration:underline;">${t('retry_player')}</button>`;
        wrapper.parentNode.insertBefore(msgDiv, wrapper.nextSibling);
        document.getElementById('retryPlayerBtn').addEventListener('click', () => {
            apiLoadAttempts = 0;
            const title = document.getElementById('playerTitle').textContent;
            const desc = document.getElementById('playerDescription').textContent;
            closePlayer();
            playVideo(currentVideoId, title, desc);
        });
    }
    document.getElementById('playerContainer').style.display = 'block';
}
function onYouTubeIframeAPIReady() {
    if (pendingVideo) { const p = pendingVideo; pendingVideo = null; playVideo(p.videoId, p.title, p.description); }
}
function createPlayer(videoId, startSeconds = 0) {
    if (!isYouTubeAPIReady()) return false;
    const wrapper = document.querySelector('.player-wrapper'); if (!wrapper) return false;
    let el = document.getElementById('youtubePlayer'); if (!el) { el = document.createElement('div'); el.id = 'youtubePlayer'; wrapper.appendChild(el); }
    if (player) { try { player.destroy(); } catch(e) {} player = null; }
    try {
        player = new YT.Player('youtubePlayer', {
            videoId, 
            playerVars: { 
                autoplay: 1, controls: 0, modestbranding: 1, rel: 0, 
                start: Math.floor(startSeconds), 
                origin: window.location.origin,
                host: window.location.host
            },
            events: { onReady: onPlayerReady, onStateChange: onPlayerStateChange, onError: onPlayerError }
        });
        currentVideoId = videoId;
        document.getElementById('playerContainer').style.display = 'block';
        document.getElementById('playPauseBtn').style.display = 'flex';
        document.querySelector('.progress-container').style.display = 'flex';
        document.querySelector('.volume-control').style.display = 'flex';
        return true;
    } catch (e) { showPlayerError(t('player_error_generic')); return false; }
}
function onPlayerReady(event) {
    playerReady = true;
    const duration = player.getDuration();
    document.getElementById('durationDisplay').textContent = formatTime(duration);
    document.getElementById('progressBar').max = duration;
    const savedVolume = localStorage.getItem('yt_player_volume');
    const volSlider = document.getElementById('volumeSlider');
    if (savedVolume !== null && volSlider) { player.setVolume(parseInt(savedVolume)); volSlider.value = savedVolume; }
    startProgressUpdate();
}
function onPlayerStateChange(e) {
    const btn = document.getElementById('playPauseBtn');
    if (e.data === YT.PlayerState.PLAYING) { btn.innerHTML = '<i class="fas fa-pause"></i>'; startProgressUpdate(); }
    else if (e.data === YT.PlayerState.PAUSED) { btn.innerHTML = '<i class="fas fa-play"></i>'; stopProgressUpdate(); saveVideoProgress(); }
    else if (e.data === YT.PlayerState.ENDED) { btn.innerHTML = '<i class="fas fa-play"></i>'; stopProgressUpdate(); playlistManager.playNext(); }
}
function onPlayerError(e) {
    let msg = t('player_error_generic');
    if (e.data === 2) msg = t('player_error_removed');
    else if (e.data === 5) msg = t('player_error_issue');
    else if (e.data === 100) msg = t('player_error_not_found');
    showPlayerError(msg);
}
function showPlayerError(msg) {
    const w = document.querySelector('.player-wrapper'); if (w) w.innerHTML = `<div class="player-error"><i class="fas fa-exclamation-triangle"></i> ${msg}</div>`;
    document.getElementById('playPauseBtn').innerHTML = '<i class="fas fa-play"></i>';
}
function startProgressUpdate() {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(() => {
        if (playerReady && player && player.getCurrentTime) {
            const ct = player.getCurrentTime();
            document.getElementById('currentTimeDisplay').textContent = formatTime(ct);
            document.getElementById('progressBar').value = ct;
            if (Math.floor(ct) % 5 === 0) saveVideoProgress();
        }
    }, 500);
}
function stopProgressUpdate() { if (updateTimer) { clearInterval(updateTimer); updateTimer = null; } }
function saveVideoProgress() { if (currentVideoId && playerReady) { videoProgress[currentVideoId] = player.getCurrentTime(); localStorage.setItem('yt_video_progress', JSON.stringify(videoProgress)); } }
function loadVideoProgress(id) { const s = localStorage.getItem('yt_video_progress'); if (s) try { return JSON.parse(s)[id] || 0; } catch(e) {} return 0; }
function formatTime(s) { const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60); return h>0 ? `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}` : `${m}:${sec.toString().padStart(2,'0')}`; }
function toggleAudioMode() {
    audioMode = !audioMode;
    const c = document.getElementById('playerContainer'), b = document.getElementById('audioModeBtn');
    if (!c || !b) return;
    c.classList.toggle('audio-mode', audioMode); b.classList.toggle('audio-active', audioMode);
    b.innerHTML = audioMode ? '<i class="fas fa-video"></i>' : '<i class="fas fa-headphones"></i>';
}
function setupPlayerControls() {
    const playBtn = document.getElementById('playPauseBtn'), muteBtn = document.getElementById('muteUnmuteBtn'), volSlider = document.getElementById('volumeSlider'), progBar = document.getElementById('progressBar'), audioBtn = document.getElementById('audioModeBtn'), closeBtn = document.getElementById('closePlayerBtn');
    if (playBtn) playBtn.addEventListener('click', () => { if (!playerReady) return; player.getPlayerState()===YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo(); });
    if (muteBtn) muteBtn.addEventListener('click', () => { if (!playerReady) return; player.isMuted() ? (player.unMute(), muteBtn.innerHTML='<i class="fas fa-volume-up"></i>') : (player.mute(), muteBtn.innerHTML='<i class="fas fa-volume-mute"></i>'); });
    if (volSlider) volSlider.addEventListener('input', e => { if (!playerReady) return; const v = +e.target.value; player.setVolume(v); localStorage.setItem('yt_player_volume', v); muteBtn.innerHTML = v===0 ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>'; });
    if (progBar) progBar.addEventListener('input', e => { if (!playerReady) return; player.seekTo(+e.target.value, true); });
    if (audioBtn) audioBtn.addEventListener('click', toggleAudioMode);
    if (closeBtn) closeBtn.addEventListener('click', closePlayer);
}
function closePlayer() {
    document.getElementById('playerContainer').style.display = 'none';
    if (player) { try { player.stopVideo(); player.destroy(); } catch(e) {} player = null; }
    stopProgressUpdate(); currentVideoId = null; audioMode = false;
    document.getElementById('playerContainer').classList.remove('audio-mode');
    document.getElementById('audioModeBtn')?.classList.remove('audio-active');
    document.getElementById('audioModeBtn').innerHTML = '<i class="fas fa-headphones"></i>';
}
function playVideo(videoId, title, description) {
    document.getElementById('playerTitle').textContent = title;
    document.getElementById('playerDescription').textContent = description;
    const container = document.getElementById('playerContainer'); container.style.display = 'block';
    container.classList.toggle('audio-mode', audioMode);
    document.getElementById('audioModeBtn')?.classList.toggle('audio-active', audioMode);
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    currentVideoId = videoId;
    document.querySelector('.fallback-message')?.remove();
    document.getElementById('playPauseBtn').style.display = 'flex';
    document.querySelector('.progress-container').style.display = 'flex';
    document.querySelector('.volume-control').style.display = 'flex';
    if (!isYouTubeAPIReady()) {
        pendingVideo = { videoId, title, description };
        waitForYouTubeAPI(() => { if (pendingVideo) { const p = pendingVideo; pendingVideo = null; playVideo(p.videoId, p.title, p.description); } });
        return;
    }
    const start = loadVideoProgress(videoId);
    if (!createPlayer(videoId, start)) useFallbackPlayer();
}

// ========== PLAYLIST MANAGER ==========
class PlaylistManager {
    constructor() {
        this.queue = [];
        this.currentIndex = -1;
        this.repeatMode = 'none';
        this.shuffle = false;
        this.originalQueue = [];
        this.loadFromStorage();
        this.renderPlaylistPanel();
    }
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('video_playlist');
            if (saved) {
                const data = JSON.parse(saved);
                this.queue = data.queue || [];
                this.currentIndex = data.currentIndex ?? -1;
                this.repeatMode = data.repeatMode || 'none';
                this.shuffle = data.shuffle || false;
                this.originalQueue = data.originalQueue || [];
            }
        } catch (e) {}
    }
    saveToStorage() {
        try {
            localStorage.setItem('video_playlist', JSON.stringify({
                queue: this.queue, currentIndex: this.currentIndex,
                repeatMode: this.repeatMode, shuffle: this.shuffle, originalQueue: this.originalQueue
            }));
        } catch (e) {}
    }
    addVideo(video) {
        if (!video.videoId) return;
        if (this.queue.length > 0 && this.queue[this.queue.length-1].videoId === video.videoId) return;
        this.queue.push(video);
        if (this.shuffle) { this.originalQueue.push(video); this.shuffleQueue(); }
        this.saveToStorage(); this.renderPlaylistPanel();
        if (this.currentIndex === -1 && this.queue.length > 0) { this.currentIndex = 0; this.playCurrent(); }
    }
    removeVideo(index) {
        if (index >= 0 && index < this.queue.length) {
            this.queue.splice(index, 1);
            if (this.shuffle) this.originalQueue = this.originalQueue.filter(v => !this.queue.every(qV => qV.videoId !== v.videoId));
            if (index === this.currentIndex) { if (player) player.stopVideo(); this.currentIndex = -1; }
            else if (index < this.currentIndex) this.currentIndex--;
            this.saveToStorage(); this.renderPlaylistPanel();
        }
    }
    clearQueue() {
        this.queue = []; this.currentIndex = -1; this.originalQueue = [];
        if (player) player.stopVideo();
        this.saveToStorage(); this.renderPlaylistPanel();
    }
    playVideoByIndex(index) { if (index >= 0 && index < this.queue.length) { this.currentIndex = index; this.playCurrent(); } }
    playCurrent() {
        const video = this.queue[this.currentIndex];
        if (!video) return;
        playVideo(video.videoId, video.title, video.description);
        this.saveToStorage(); this.renderPlaylistPanel();
    }
    playNext() {
        if (this.repeatMode === 'one') { if (player) player.seekTo(0); return; }
        if (this.currentIndex < this.queue.length - 1) { this.currentIndex++; this.playCurrent(); }
        else if (this.repeatMode === 'all') { this.currentIndex = 0; this.playCurrent(); }
    }
    playPrevious() {
        if (this.currentIndex > 0) { this.currentIndex--; this.playCurrent(); }
        else if (this.repeatMode === 'all') { this.currentIndex = this.queue.length - 1; this.playCurrent(); }
    }
    toggleRepeat() {
        const modes = ['none', 'one', 'all'];
        const idx = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(idx + 1) % modes.length];
        this.saveToStorage(); this.renderPlaylistPanel();
    }
    toggleShuffle() {
        this.shuffle = !this.shuffle;
        if (this.shuffle) { this.originalQueue = [...this.queue]; this.shuffleQueue(); }
        else {
            this.queue = [...this.originalQueue];
            if (this.currentIndex >= 0) {
                const currentV = this.queue[this.currentIndex];
                const newIndex = this.queue.findIndex(v => v.videoId === currentV.videoId);
                this.currentIndex = newIndex >= 0 ? newIndex : 0;
            }
        }
        this.saveToStorage(); this.renderPlaylistPanel();
    }
    shuffleQueue() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
        if (this.currentIndex >= 0) {
            const currentV = this.queue[this.currentIndex];
            const newIndex = this.queue.findIndex(v => v.videoId === currentV.videoId);
            this.currentIndex = newIndex >= 0 ? newIndex : 0;
        }
    }
    renderPlaylistPanel() {
        const panel = document.getElementById('playlistPanel');
        if (!panel) return;
        const listContainer = document.getElementById('playlistItems');
        if (listContainer) {
            if (this.queue.length === 0) listContainer.innerHTML = `<div class="playlist-empty">${t('playlist_empty')}</div>`;
            else {
                listContainer.innerHTML = this.queue.map((v, idx) => `
                    <div class="playlist-item ${idx === this.currentIndex ? 'active' : ''}">
                        <img src="${escapeHtml(v.thumbnail || '')}" onerror="this.src='https://placehold.co/32x32/1F2933/9CA3AF?text=🎵'">
                        <div class="playlist-item-info">
                            <div class="playlist-item-title">${escapeHtml(v.title)}</div>
                            <div class="playlist-item-author">${escapeHtml(v.channelTitle || '')}</div>
                        </div>
                        <button class="playlist-item-remove" data-index="${idx}">&times;</button>
                    </div>
                `).join('');
                listContainer.querySelectorAll('.playlist-item').forEach(item => {
                    const idx = item.querySelector('.playlist-item-remove')?.dataset.index;
                    if (idx !== undefined) {
                        item.addEventListener('click', (e) => { if (!e.target.classList.contains('playlist-item-remove')) this.playVideoByIndex(parseInt(idx)); });
                        item.querySelector('.playlist-item-remove').addEventListener('click', (e) => { e.stopPropagation(); this.removeVideo(parseInt(idx)); });
                    }
                });
            }
        }
        const repeatBtn = document.getElementById('playlistRepeatBtn');
        if (repeatBtn) {
            const icons = { 'none': 'fa-repeat', 'one': 'fa-repeat-1', 'all': 'fa-repeat' };
            repeatBtn.innerHTML = `<i class="fas ${icons[this.repeatMode]}"></i>`;
            repeatBtn.classList.toggle('active', this.repeatMode !== 'none');
        }
        const shuffleBtn = document.getElementById('playlistShuffleBtn');
        if (shuffleBtn) shuffleBtn.classList.toggle('active', this.shuffle);
    }
}
const playlistManager = new PlaylistManager();

// ========== RENDERIZAÇÃO ==========
function getSubjectIcon(s){
    const i={'tecnologia':'fa-microchip','ciencia':'fa-flask','matematica':'fa-calculator','historia':'fa-landmark','literatura':'fa-book','filosofia':'fa-brain','psicologia':'fa-face-smile','economia':'fa-chart-line','politica':'fa-landmark','saude':'fa-heart-pulse','educacao':'fa-graduation-cap','arte':'fa-palette','esportes':'fa-futbol','negocios':'fa-briefcase','viagem':'fa-plane','religiao':'fa-church','autoajuda':'fa-person-walking','culinaria':'fa-utensils','shorts':'fa-film','outros':'fa-tag'};
    return i[s]||'fa-tag';
}
function formatDuration(sec) {
    if (!sec) return '';
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
}
function createVideoCardHTML(v) {
    let badge = '';
    if (v.isLive) badge = `<span class="video-badge live"><i class="fas fa-circle"></i> ${t('badge_live')}</span>`;
    else if (v.type === 'podcast') badge = `<span class="video-badge podcast"><i class="fas fa-podcast"></i> ${t('badge_podcast')}</span>`;
    else if (v.type === 'shorts') badge = `<span class="video-badge shorts"><i class="fas fa-film"></i> ${t('badge_shorts')}</span>`;
    return `<div class="video-card" data-type="${v.type}" data-video-id="${v.videoId}" data-title="${escapeHtml(v.title)}" data-description="${escapeHtml(v.description)}" data-thumbnail="${escapeHtml(v.thumbnail)}" data-channel="${escapeHtml(v.channelTitle||'')}">
        <div class="video-thumb"><img src="${v.thumbnail}" alt="${escapeHtml(v.title)}" loading="lazy" onerror="this.src='https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg';">${badge}</div>
        <div class="video-info">
            <div class="video-title">${escapeHtml(v.title)}</div>
            <div class="video-description">${escapeHtml(v.description)}</div>
            <div class="video-meta">
                <span class="language-badge"><i class="fas fa-language"></i> ${getLanguageName(v.language)}</span>
                ${v.duration ? `<span class="duration-badge"><i class="fas fa-clock"></i> ${formatDuration(v.duration)}</span>` : ''}
            </div>
        </div>
    </div>`;
}
function renderUnifiedGrid(items) {
    const container = document.getElementById('videosContainer');
    if (!container) return;
    if (!items.length) { container.innerHTML = `<div class="empty-state"><i class="fas fa-film"></i><p>${t('no_videos')}</p></div>`; return; }
    let subjects = [...new Set(items.map(i => i.subject))].sort((a,b) => a==='outros'?1:b==='outros'?-1:a.localeCompare(b));
    let html = '';
    for (const subj of subjects) {
        let subjItems = items.filter(i => i.subject === subj);
        if (currentSubjectFilter === 'all') subjItems = subjItems.slice(0, 10);
        html += `<div class="category-block"><div class="category-header"><div class="category-title"><i class="fas ${getSubjectIcon(subj)}"></i> ${getSubjectName(subj)}</div><div class="category-count">${subjItems.length} ${t('items')}</div></div><div class="category-grid unified-grid">`;
        subjItems.forEach(item => html += createVideoCardHTML(item));
        html += `</div></div>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.video-card').forEach(c => {
        c.addEventListener('click', () => playVideo(c.dataset.videoId, c.dataset.title, c.dataset.description));
        c.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            playlistManager.addVideo({ videoId: c.dataset.videoId, title: c.dataset.title, description: c.dataset.description, thumbnail: c.dataset.thumbnail, channelTitle: c.dataset.channel });
        });
    });
}
async function handleSearch() {
    const term = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';
    currentSearchTerm = term;
    await refreshAllItems(term);
    updateAllContent();
}
function updateAllContent() {
    let filtered = allItems.filter(item => {
        if (currentSearchTerm && !item.title.toLowerCase().includes(currentSearchTerm) && !(item.description||'').toLowerCase().includes(currentSearchTerm)) return false;
        if (currentTypeFilter !== 'all' && item.type !== currentTypeFilter) return false;
        if (currentSubjectFilter !== 'all' && item.subject !== currentSubjectFilter) return false;
        if (currentLanguageFilter !== 'all' && item.language !== currentLanguageFilter) return false;
        return true;
    });
    renderUnifiedGrid(filtered);
    buildLanguageChips(filtered);
}
function buildTypeChips() {
    const c = document.getElementById('typeChips'); if (!c) return;
    const types = [
        {value:'all',label:t('all'),icon:'fa-globe'},{value:'video',label:t('type_video'),icon:'fa-play-circle'},
        {value:'podcast',label:t('type_podcast'),icon:'fa-podcast'},{value:'live',label:t('type_live'),icon:'fa-circle'},
        {value:'shorts',label:t('type_shorts'),icon:'fa-film'}
    ];
    c.innerHTML = types.map(t => `<div class="chip ${currentTypeFilter===t.value?'active':''}" data-type="${t.value}"><i class="fas ${t.icon}"></i> ${t.label}</div>`).join('');
    c.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { currentTypeFilter = ch.dataset.type; buildTypeChips(); handleSearch(); }));
}
function buildSubjectChips() {
    const subs = [...new Set(allItems.map(i => i.subject))].sort((a,b) => a==='outros'?1:b==='outros'?-1:a.localeCompare(b));
    const c = document.getElementById('subjectChips'); if (!c) return;
    c.innerHTML = `<div class="chip ${currentSubjectFilter==='all'?'active':''}" data-subject="all">${t('all')}</div>` + subs.map(s => `<div class="chip ${currentSubjectFilter===s?'active':''}" data-subject="${s}"><i class="fas ${getSubjectIcon(s)}"></i> ${getSubjectName(s)}</div>`).join('');
    c.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { currentSubjectFilter = ch.dataset.subject; buildSubjectChips(); updateAllContent(); }));
}
function buildLanguageChips(items = allItems) {
    const langs = [...new Set(items.map(i => i.language).filter(l => l))];
    const c = document.getElementById('languageChips'); if (!c) return;
    c.innerHTML = `<div class="chip ${currentLanguageFilter==='all'?'active':''}" data-lang="all">${t('all')}</div>` + langs.map(l => `<div class="chip ${currentLanguageFilter===l?'active':''}" data-lang="${l}"><i class="fas fa-language"></i> ${getLanguageName(l)}</div>`).join('');
    c.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { currentLanguageFilter = ch.dataset.lang; buildLanguageChips(); updateAllContent(); }));
}
function playRandomItem() {
    if (!allItems.length) return;
    const item = allItems[Math.floor(Math.random()*allItems.length)];
    playVideo(item.videoId, item.title, item.description);
}
function showLoading() { document.getElementById('videosContainer').innerHTML = `<div class="loading-skeleton"><div class="spinner"></div><p>${t('loading')}</p></div>`; }
function hideLoading() {}

// ========== CARREGAR FILTRO DE CANAIS ==========
async function loadChannelFilters() {
    try {
        const response = await fetch('canais.json');
        if (!response.ok) return;
        const data = await response.json();
        if (data.video) channelFilters.video = data.video;
        if (data.podcast) channelFilters.podcast = data.podcast;
        if (data.live) channelFilters.live = data.live;
        if (data.shorts) channelFilters.shorts = data.shorts;
    } catch (e) {}
}

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', async () => {
    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    if (!window.YT) { const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(s); }
    const savedLang = localStorage.getItem('selectedLanguage') || (navigator.language?.startsWith('pt')?'pt-br':'en');
    currentLang = savedLang;
    await loadTranslations(currentLang);
    applyTranslationsToUI();
    const langPtBtn = document.getElementById('langPtBtn'), langEnBtn = document.getElementById('langEnBtn');
    if (langPtBtn) langPtBtn.addEventListener('click', async () => {
        await loadTranslations('pt-br'); currentLang = 'pt-br'; localStorage.setItem('selectedLanguage', 'pt-br');
        applyTranslationsToUI(); await refreshAllItems(currentSearchTerm); buildTypeChips(); updateAllContent();
        langPtBtn.classList.add('active'); langEnBtn.classList.remove('active');
    });
    if (langEnBtn) langEnBtn.addEventListener('click', async () => {
        await loadTranslations('en'); currentLang = 'en'; localStorage.setItem('selectedLanguage', 'en');
        applyTranslationsToUI(); await refreshAllItems(currentSearchTerm); buildTypeChips(); updateAllContent();
        langEnBtn.classList.add('active'); langPtBtn.classList.remove('active');
    });
    if (currentLang === 'pt-br') langPtBtn?.classList.add('active'); else langEnBtn?.classList.add('active');
    await loadChannelFilters();
    setupPlayerControls();
    setupPlaylistControls();
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('randomVideoBtn').addEventListener('click', playRandomItem);
    await refreshAllItems('');
    buildTypeChips(); buildSubjectChips(); buildLanguageChips(allItems);
    updateAllContent();
});

function setupPlaylistControls() {
    const panel = document.getElementById('playlistPanel');
    if (!panel) return;
    document.getElementById('playlistPlayPauseBtn')?.addEventListener('click', () => {
        if (player && playerReady) player.getPlayerState()===YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo();
    });
    document.getElementById('playlistNextBtn')?.addEventListener('click', () => playlistManager.playNext());
    document.getElementById('playlistPrevBtn')?.addEventListener('click', () => playlistManager.playPrevious());
    document.getElementById('playlistRepeatBtn')?.addEventListener('click', () => playlistManager.toggleRepeat());
    document.getElementById('playlistShuffleBtn')?.addEventListener('click', () => playlistManager.toggleShuffle());
    document.getElementById('playlistClearBtn')?.addEventListener('click', () => playlistManager.clearQueue());
    document.getElementById('togglePlaylistBtn')?.addEventListener('click', () => panel.classList.toggle('collapsed'));
}