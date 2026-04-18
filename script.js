// script.js – versão final com i18n completo, fallback robusto, controle de volume e suporte ao ENEM
document.addEventListener('DOMContentLoaded', async () => {
    // ========== LIMPEZA DE DADOS GLOBAIS ==========
    if (localStorage.getItem('currentLesson') !== null) localStorage.removeItem('currentLesson');
    if (localStorage.getItem('currentStep') !== null) localStorage.removeItem('currentStep');

    // ========== INICIALIZAR CURSOR TIMESET ==========
    if (window.CursorTimeset && typeof window.CursorTimeset.initialize === 'function') {
        window.CursorTimeset.initialize();
        console.log('[Main] CursorTimeset inicializado com sucesso');
    } else {
        console.error('[Main] CursorTimeset não disponível – verifique se cursos/cursor-timeset.js foi carregado');
    }

    // ========== TIMESET (TIMESTAMP) ==========
    function generateTimeSet() {
        return new Date().toISOString(); // Formato ISO 8601
    }

    // ========== SISTEMA DE IDIOMA (i18n) ==========
    let currentLang = 'pt-br';
    let translations = {};

    // ========== DETECÇÃO AUTOMÁTICA DE IDIOMA DO SISTEMA/NAVEGADOR ==========
    function detectSystemLanguage() {
        const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        console.log('[Language Detection] Idioma detectado no navegador:', browserLang);
        if (browserLang.startsWith('pt')) {
            console.log('[Language Detection] Mapeado para: pt-br');
            return 'pt-br';
        }
        if (browserLang.startsWith('en')) {
            console.log('[Language Detection] Mapeado para: en');
            return 'en';
        }
        console.log('[Language Detection] Idioma não suportado, usando padrão: en');
        return 'en';
    }

    async function loadTranslations(lang) {
        console.log(`[i18n] Carregando traduções para: ${lang}`);
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            translations = await response.json();
            console.log("[i18n] Traduções carregadas:", translations);
            console.log(`[i18n] Total de traduções carregadas: ${Object.keys(translations).length}`);
            console.log(`[i18n] Traduções carregadas com sucesso para ${lang}`);
            return true;
        } catch (error) {
            console.error(`[i18n] Erro ao carregar traduções para ${lang}:`, error);
            if (lang !== 'pt-br') {
                console.log('[i18n] Tentando carregar pt-br como fallback');
                return loadTranslations('pt-br');
            }
            // Fallback completo com todas as chaves necessárias (incluindo ensino_medio)
            translations = {
                "app_title": "Universidade Livre",
                "tab_bibliography": "Bibliografia",
                "tab_practice": "Prática",
                "tab_team": "Time",
                "tab_contributors": "Contribuidores",
                "tab_license": "Licença",
                "back_to_courses": "Voltar",
                "current_lesson": "Aula Atual",
                "course_content": "Conteúdo",
                "help_button": "Ajuda",
                "mark_watched": "Concluir",
                "loading": "Carregando...",
                "course_progress": "Progresso:",
                "continue_studies": "Continuar",
                "enter_course": "Entrar",
                "lesson_label": "Aula",
                "week": "Semana",
                "videos": "vídeos",
                "book_author": "Autor",
                "book_year": "Ano",
                "book_language": "Idioma",
                "book_subject": "Assunto",
                "book_publisher": "Editora",
                "book_isbn": "ISBN",
                "download_book": "Baixar Livro",
                "access_online": "Acessar Online",
                "lang_english": "Inglês",
                "lang_portuguese": "Português",
                "lang_spanish": "Espanhol",
                "graduacao": "Graduação",
                "bacharelado": "Bacharelado",
                "pos_graduacao": "Pós-Graduação",
                "ensino_medio": "Ensino Médio",   // <-- NOVO
                "licenciatura": "Licenciatura",
                "tecnologo": "Tecnólogo",
                "mestrado": "Mestrado",
                "doutorado": "Doutorado",
                "especializacao": "Especialização",
                "donate_button": "Doar",
                "donate_text": "Doar",
                "main_program_description": "Ciência da Computação, Matemática e Computação Gráfica · Cursos de Graduação e Pós-graduação",
                "course_hours": "Carga horária",
                // Novas chaves para assuntos
                "subject_tecnologia": "Tecnologia",
                "subject_ciencia": "Ciência",
                "subject_matematica": "Matemática",
                "subject_historia": "História",
                "subject_literatura": "Literatura",
                "subject_filosofia": "Filosofia",
                "subject_psicologia": "Psicologia",
                "subject_economia": "Economia",
                "subject_politica": "Política",
                "subject_saude": "Saúde",
                "subject_educacao": "Educação",
                "subject_arte": "Arte",
                "subject_esportes": "Esportes",
                "subject_negocios": "Negócios",
                "subject_viagem": "Viagem",
                "subject_religiao": "Religião",
                "subject_autoajuda": "Autoajuda",
                "subject_culinaria": "Culinária",
                "subject_shorts": "Shorts",
                "subject_outros": "Outros",
                // Idiomas
                "lang_pt": "Português",
                "lang_en": "Inglês",
                "lang_es": "Espanhol",
                "lang_fr": "Francês",
                "lang_de": "Alemão",
                "lang_it": "Italiano",
                "lang_ja": "Japonês",
                "lang_zh": "Chinês",
                "lang_ko": "Coreano",
                "lang_ru": "Russo",
                "lang_ar": "Árabe",
                "lang_hi": "Hindi",
                "lang_nl": "Holandês",
                "lang_sv": "Sueco",
                "lang_pl": "Polonês",
                "lang_tr": "Turco",
                "lang_undefined": "Indefinido",
                // Outros
                "unavailable": "Indisponível",
                "price_free": "Grátis",
                "price_paid": "Pago",
                "badge_live": "AO VIVO",
                "badge_podcast": "PODCAST",
                "badge_shorts": "SHORTS",
                "search_practice_placeholder": "Buscar práticas por título ou descrição...",
                "no_practice": "Nenhuma prática disponível no momento.",
                "practice_unavailable": "Conteúdo de prática não disponível no momento.",
                "exercise_type_practice": "Prática",
                "exercise_type_challenge": "Desafio",
                "exercise_type_assessment": "Avaliação",
                "external_lesson_desc": "Este conteúdo está disponível em uma plataforma de terceiros.",
                "external_platform_default": "Plataforma externa",
                "external_instruction": "As aulas e atividades serão realizadas na plataforma acima. Após concluir as aulas na plataforma externa, retorne aqui e marque a aula como concluída.",
                "go_to_platform": "Ir para a plataforma",
                "external_footer_note": "Após terminar as aulas no site externo, clique em \"Marcar como concluída\".",
                "exercise_lesson_desc": "Esta atividade deve ser realizada fora da plataforma. Após concluir, clique no botão abaixo para marcar como concluída."
            };
            console.warn("[i18n] Usando fallback interno devido a erro de carregamento");
            return false;
        }
    }

    function t(key, replacements = {}) {
        let text = translations[key] || key;
        if (text === key) {
            // Fallback adicional caso a chave não exista no fallback também
            const hardcoded = {
                'course_progress': 'Progresso:',
                'continue_studies': 'Continuar Estudos',
                'clause.progression': 'Progresso do Curso',
                'course_hours': 'Carga horária',
                'ensino_medio': 'Ensino Médio',
                'subject_tecnologia': 'Tecnologia',
                'subject_ciencia': 'Ciência',
            };
            if (hardcoded[key]) text = hardcoded[key];
            else console.warn(`[i18n] Chave não encontrada: ${key}`);
        }
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    window.getTranslation = t;
    window.getCurrentLanguage = () => currentLang;

    function updateLanguageSelector(lang) {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (ptBtn && enBtn) {
            if (lang === 'pt-br') {
                ptBtn.classList.add('active');
                enBtn.classList.remove('active');
            } else if (lang === 'en') {
                enBtn.classList.add('active');
                ptBtn.classList.remove('active');
            }
        }
    }

    function applyTranslations() {
        if (!translations || Object.keys(translations).length === 0) {
            console.warn('[i18n] applyTranslations ignorado: traduções ainda não carregadas');
            return;
        }
        console.log('[i18n] Aplicando traduções aos elementos estáticos e dinâmicos');
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && translations[key]) {
                if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                    el.placeholder = translations[key];
                } else if (el.innerHTML.includes('<i') && !el.hasAttribute('data-i18n-raw')) {
                    const icon = el.querySelector('i');
                    if (icon) {
                        const cloneIcon = icon.cloneNode(true);
                        el.innerHTML = '';
                        el.appendChild(cloneIcon);
                        el.appendChild(document.createTextNode(' ' + translations[key]));
                    } else {
                        el.innerText = translations[key];
                    }
                } else {
                    el.innerText = translations[key];
                }
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key && translations[key]) el.setAttribute('title', translations[key]);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key && translations[key]) el.setAttribute('placeholder', translations[key]);
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const tabId = btn.getAttribute('data-tab');
            if (tabId === 'bibliografia') btn.innerText = t('tab_bibliography');
            else if (tabId === 'pratica') btn.innerText = t('tab_practice');
            else if (tabId === 'team') btn.innerText = t('tab_team');
            else if (tabId === 'contributors') btn.innerText = t('tab_contributors');
            else if (tabId === 'license') btn.innerText = t('tab_license');
        });
        const backBtn = document.getElementById('backToHomeBtn');
        if (backBtn && !backBtn.hasAttribute('data-i18n')) {
            backBtn.innerHTML = `<i class="fas fa-arrow-left"></i> ${t('back_to_courses')}`;
        }
        const helpBtn = document.getElementById('helpButton');
        if (helpBtn && !helpBtn.hasAttribute('data-i18n')) {
            helpBtn.innerHTML = `<i class="fas fa-question-circle"></i> ${t('help_button')}`;
        }
        const markWatched = document.getElementById('markWatchedBtn');
        if (markWatched && !markWatched.hasAttribute('data-i18n')) {
            markWatched.innerHTML = `<i class="fas fa-check"></i> ${t('mark_watched')}`;
        }
        const panelTitle = document.querySelector('.panel-title');
        if (panelTitle && !panelTitle.hasAttribute('data-i18n')) {
            panelTitle.innerHTML = `<i class="fas fa-play-circle"></i> ${t('current_lesson')}`;
        }
        const unifiedTitle = document.querySelector('.unified-content h3');
        if (unifiedTitle && !unifiedTitle.hasAttribute('data-i18n')) {
            unifiedTitle.innerHTML = `<i class="fas fa-book-open"></i> ${t('course_content')}`;
        }
        document.title = t('app_title');
        const practiceSearch = document.getElementById('practiceSearchInput');
        if (practiceSearch && practiceSearch.placeholder !== t('search_practice_placeholder')) {
            practiceSearch.placeholder = t('search_practice_placeholder');
        }
    }

    async function setLanguage(lang) {
        console.log(`[i18n] setLanguage chamado: lang=${lang}, currentLang=${currentLang}, translationsLoaded=${Object.keys(translations).length}`);
        if (lang === currentLang && Object.keys(translations).length > 0) {
            console.log('[i18n] Idioma já carregado, ignorando');
            return;
        }
        console.log('[i18n] Carregando/recarregando traduções...');
        const success = await loadTranslations(lang);
        if (success) {
            currentLang = lang;
            localStorage.setItem('selectedLanguage', lang);
            applyTranslations();
            updateLanguageSelector(lang);
            if (typeof currentCourse !== 'undefined' && currentCourse) {
                console.log('[i18n] Recarregando conteúdos dinâmicos do curso');
                if (typeof renderCurrentLessonPanel === 'function') renderCurrentLessonPanel();
                if (typeof renderUnifiedCourseContent === 'function') renderUnifiedCourseContent();
                if (activeTab === 'bibliografia' && typeof renderBooksFilteredByDiscipline === 'function') {
                    await renderBooksFilteredByDiscipline(currentDiscipline);
                } else if (activeTab === 'contributors' && typeof renderContributorsTab === 'function') {
                    await renderContributorsTab();
                } else if (activeTab === 'license' && typeof renderLicenseTab === 'function') {
                    await renderLicenseTab();
                } else if (activeTab === 'team') {
                    const teamGrid = document.getElementById('team-grid');
                    if (teamGrid && typeof loadTeamAndContributors === 'function') {
                        await loadTeamAndContributors(currentCourse);
                    }
                } else if (activeTab === 'pratica' && typeof currentPracticeData !== 'undefined' && currentPracticeData && typeof renderPracticeGrid === 'function') {
                    renderPracticeGrid(currentPracticeData);
                }
            }
            const homeScreen = document.getElementById('homeScreen');
            if (homeScreen && homeScreen.style.display !== 'none') {
                await renderCourseCards();
            }
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
            setTimeout(() => {
                if (typeof applyTranslations === 'function') applyTranslations();
            }, 100);
            console.log('[i18n] Idioma alterado com sucesso para', lang);
        } else {
            console.error('[i18n] Falha ao carregar traduções, idioma não alterado');
        }
    }

    const langPtBtn = document.getElementById('langPtBtn');
    const langEnBtn = document.getElementById('langEnBtn');
    if (langPtBtn && langEnBtn) {
        langPtBtn.addEventListener('click', () => setLanguage('pt-br'));
        langEnBtn.addEventListener('click', () => setLanguage('en'));
    }

    // ========== VARIÁVEIS GLOBAIS ==========
    let allCourses = [];
    let currentCourseDetails = null;
    let currentCourseFolder = null;
    let activeTab = null;
    let currentCourse = null;
    let stagesData = [];
    let allVideosFlat = [];
    let lessons = [];
    let currentLessonId = 0, currentVideoInLesson = 0;
    let disciplineLessonsMap = new Map();
    let disciplineToLessonsMap = new Map();
    let player = null, isPlayerReady = false, currentVideoDuration = 0, updateInterval = null;
    let currentDiscipline = null;
    let notifiedDisciplines = new Set();
    let notificationQueue = [];
    let notificationActive = false;
    let libraryBooksMap = new Map();
    let booksCache = new Map();
    let practiceTabButton = document.getElementById('practiceTabBtn');
    let practiceTabContent = document.getElementById('pratica-tab');
    let currentPracticeData = null;
    let practiceSearchInput = null;

    // ========== CONTROLE DE VOLUME ==========
    let playerVolume = 80; // volume padrão
    const VOLUME_STORAGE_KEY = 'youtube_player_volume';

    function loadSavedVolume() {
        const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
        if (saved !== null) {
            playerVolume = parseInt(saved, 10);
            const volSlider = document.getElementById('volumeSlider');
            if (volSlider) volSlider.value = playerVolume;
        }
    }

    // ========== FUNÇÕES AUXILIARES ==========
    function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }
    function safeAttr(str) { if (!str) return ''; return str.replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
    function isValidUrl(str) { try { const url = new URL(str); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; } }
    function normalize(text) { if (!text) return ''; return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
    function parseTime(timeString) { if (!timeString) return null; const match = timeString.match(/(\d+)/); return match ? parseInt(match[1], 10) : null; }
    function getDurationFromDiscipline(discipline) {
        if (discipline.time) { const parsed = parseTime(discipline.time); if (parsed !== null) return parsed; }
        if (discipline.type === 'external') return 55;
        if (discipline.type === 'exercise') return 30;
        return null;
    }
    function debounce(func, wait) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; }

    // ========== CARGA HORÁRIA DOS CURSOS (CÁLCULO TOTAL) ==========
    const courseDurationCache = new Map(); // courseId -> totalMinutes

    async function computeCourseTotalMinutes(courseId) {
        if (courseDurationCache.has(courseId)) return courseDurationCache.get(courseId);
        const courseMap = {
            computacao: 'cursos/graduacao/ciencia-computacao/ciencia-computacao-data.json',
            matematica: 'cursos/graduacao/matematica/matematica-data.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/computacao-grafica-data.json',
            embarcados: 'cursos/pos-graduacao/embarcados/embarcados-data.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/desenvolvimento-web-data.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/cybersecurity-data.json',
            devops: 'cursos/pos-graduacao/devops/devops-data.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/ciencia-de-dados-data.json',
            'computer-science': 'cursos/graduacao/computer-science/computer-science-data.json',
            'math': 'cursos/graduacao/math/math-data.json',
            'enem': 'cursos/ensino-medio/enem/enem-data.json'   // <-- NOVO
        };
        const fileName = courseMap[courseId];
        if (!fileName) return 0;
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error('Erro ao carregar dados do curso');
            const data = await response.json();
            let totalMinutes = 0;
            for (const stage of data.stages || []) {
                for (const discipline of stage.disciplines || []) {
                    if (discipline.type === 'external' && discipline.time) {
                        const mins = parseTime(discipline.time);
                        totalMinutes += mins || 0;
                    } else if (discipline.type === 'exercise') {
                        totalMinutes += getDurationFromDiscipline(discipline) || 30;
                    } else if (discipline.videoIds && Array.isArray(discipline.videoIds)) {
                        for (let idx = 0; idx < discipline.videoIds.length; idx++) {
                            const duration = 10 + (idx % 25) + 5; // entre 15 e 40 min
                            totalMinutes += duration;
                        }
                    }
                }
            }
            courseDurationCache.set(courseId, totalMinutes);
            return totalMinutes;
        } catch (error) {
            console.error(`Erro ao calcular carga horária para ${courseId}:`, error);
            return 0;
        }
    }

    function formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}min`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}min`;
    }

    // ========== NOTIFICAÇÕES ==========
    function showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<div class="notification-content"><i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span></div>`;
        notification.style.cssText = `background: var(--bg-secondary); border-left: 4px solid ${type === 'success' ? '#22C55E' : '#2563EB'}; border-radius: 16px; padding: 20px 24px; box-shadow: 0 8px 20px rgba(0,0,0,0.25); color: var(--text-primary); font-size: 1.1rem; font-weight: 500; min-width: 320px; max-width: 420px; width: auto; animation: slideIn 0.3s ease; transition: opacity 0.3s;`;
        container.appendChild(notification);
        setTimeout(() => { notification.style.opacity = '0'; setTimeout(() => notification.remove(), 300); }, 4000);
    }
    function queueNotification(message, type = 'info') {
        notificationQueue.push({ message, type });
        if (!notificationActive) processNotificationQueue();
    }
    function processNotificationQueue() {
        if (notificationQueue.length === 0) { notificationActive = false; return; }
        notificationActive = true;
        const { message, type } = notificationQueue.shift();
        showNotification(message, type);
        setTimeout(processNotificationQueue, 4200);
    }
    function updateNotificationPosition() {
        const notificationContainer = document.getElementById('notificationContainer');
        const currentLessonPanel = document.querySelector('.current-lesson-panel');
        if (!notificationContainer || !currentLessonPanel) return;
        const panelRect = currentLessonPanel.getBoundingClientRect();
        const panelTop = panelRect.top;
        let desiredTop = panelTop - 10;
        desiredTop = Math.max(10, Math.min(desiredTop, window.innerHeight - 100));
        notificationContainer.style.top = `${desiredTop}px`;
    }
    function bindNotificationPositionUpdates() {
        updateNotificationPosition();
        window.addEventListener('resize', () => updateNotificationPosition());
        const lessonContent = document.getElementById('currentLessonPanelContent');
        if (lessonContent) {
            const observer = new MutationObserver(() => updateNotificationPosition());
            observer.observe(lessonContent, { childList: true, subtree: true, attributes: true });
        }
    }

    // ========== CARREGAMENTO DE DADOS ==========
    async function loadCourseData(courseId) {
        const courseMap = {
            computacao: 'cursos/graduacao/ciencia-computacao/ciencia-computacao-data.json',
            matematica: 'cursos/graduacao/matematica/matematica-data.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/computacao-grafica-data.json',
            embarcados: 'cursos/pos-graduacao/embarcados/embarcados-data.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/desenvolvimento-web-data.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/cybersecurity-data.json',
            devops: 'cursos/pos-graduacao/devops/devops-data.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/ciencia-de-dados-data.json',
            'computer-science': 'cursos/graduacao/computer-science/computer-science-data.json',
            'math': 'cursos/graduacao/math/math-data.json',
            'enem': 'cursos/ensino-medio/enem/enem-data.json'   // <-- NOVO
        };
        const fileName = courseMap[courseId];
        if (!fileName) throw new Error('Curso inválido');
        currentCourseFolder = fileName.split('/').slice(0, -1).join('/') + '/';
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error('Erro ao carregar dados do curso');
            return await response.json();
        } catch (error) {
            console.error('Falha ao carregar dados do curso:', error);
            const homeScreen = document.getElementById('homeScreen');
            if (homeScreen) homeScreen.innerHTML = `<p class="error">${t('error_load_courses')}</p>`;
            return null;
        }
    }

    async function loadLicenseData() {
        let licenseCache = null;
        if (licenseCache) return licenseCache;
        try {
            const response = await fetch('cursos/license.json');
            if (!response.ok) throw new Error('Erro ao carregar dados da licença');
            licenseCache = await response.json();
            return licenseCache;
        } catch (error) {
            console.error('Erro ao carregar license.json:', error);
            return null;
        }
    }

    async function loadContributors(courseId) {
        const teamFiles = {
            computacao: 'cursos/graduacao/ciencia-computacao/team-computacao.json',
            matematica: 'cursos/graduacao/matematica/team-matematica.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/team-computacao-grafica.json',
            embarcados: 'cursos/pos-graduacao/embarcados/team-embarcados.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/team-desenvolvimento-web.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/team-cybersecurity.json',
            devops: 'cursos/pos-graduacao/devops/team-devops.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/team-ciencia-de-dados.json',
            'computer-science': 'cursos/graduacao/computer-science/team-computer-science.json',
            'math': 'cursos/graduacao/math/team-math.json',
            'enem': 'cursos/ensino-medio/enem/team-enem.json'   // <-- NOVO
        };
        const fileName = teamFiles[courseId];
        if (!fileName) return [];
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error('Erro ao carregar contribuidores');
            const data = await response.json();
            return data.contributors || [];
        } catch (error) {
            console.error('Erro ao carregar contribuidores:', error);
            return [];
        }
    }

    async function loadLibraryBooks() {
        try {
            const response = await fetch('biblioteca/books.json');
            if (!response.ok) throw new Error('Erro ao carregar livros da biblioteca');
            const books = await response.json();
            libraryBooksMap.clear();
            books.forEach(book => libraryBooksMap.set(normalize(book.title), book));
            return true;
        } catch (error) {
            console.error('Erro ao carregar biblioteca:', error);
            return false;
        }
    }

    function findBookInLibrary(bibliographyBook) { return libraryBooksMap.get(normalize(bibliographyBook.title)) || null; }
    function goToLibrary(bookTitle) { localStorage.setItem('highlightBook', bookTitle); window.open('biblioteca/biblioteca.html', '_blank'); }

    async function loadBooksForCourse(courseId) {
        if (booksCache.has(courseId)) return booksCache.get(courseId);
        const bookFiles = {
            computacao: 'cursos/graduacao/ciencia-computacao/ciencia-computacao-books.json',
            matematica: 'cursos/graduacao/matematica/matematica-books.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/computacao-grafica-books.json',
            embarcados: 'cursos/pos-graduacao/embarcados/embarcados-books.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/desenvolvimento-web-books.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/cybersecurity-books.json',
            devops: 'cursos/pos-graduacao/devops/devops-books.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/ciencia-de-dados-books.json',
            'computer-science': 'cursos/graduacao/computer-science/computer-science-books.json',
            'enem': 'cursos/ensino-medio/enem/enem-books.json'   // <-- NOVO
        };
        const fileName = bookFiles[courseId];
        if (!fileName) return [];
        try {
            const response = await fetch(fileName);
            if (!response.ok) return [];
            const books = await response.json();
            booksCache.set(courseId, books);
            return books;
        } catch (error) {
            console.error(`[Livros] Erro ao carregar ${fileName}:`, error);
            return [];
        }
    }

    // ========== RENDERIZAÇÃO DAS ABAS ==========
    async function renderContributorsTab() {
        const container = document.getElementById('contributors-grid');
        if (!container) return;
        const contributors = await loadContributors(currentCourse);
        if (!contributors.length) { container.innerHTML = `<p>${t('no_contributors')}</p>`; applyTranslations(); return; }
        let html = '';
        contributors.forEach(contributor => {
            const isNew = contributor.isNew === true;
            html += `<div class="member-card ${isNew ? 'new-contributor' : ''}">
                        <img class="member-photo" src="${escapeHtml(contributor.image || 'https://placehold.co/60x60/1F2933/9CA3AF?text=?')}" alt="${escapeHtml(contributor.name)}" onerror="this.src='https://placehold.co/60x60/1F2933/9CA3AF?text=?'">
                        <div class="member-name"><a href="${escapeHtml(contributor.github)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contributor.name)}</a>${isNew ? `<span class="new-badge">${t('new_badge')}</span>` : ''}</div>
                        <div class="member-role">${escapeHtml(contributor.role)}</div>
                        <div class="member-year">${escapeHtml(contributor.year)}</div>
                        <div class="member-desc">${escapeHtml(contributor.description)}</div>
                    </div>`;
        });
        container.innerHTML = html;
        applyTranslations();
    }

    async function renderLicenseTab() {
        const container = document.getElementById('license-content');
        if (!container) return;
        const data = await loadLicenseData();
        if (!data) { container.innerHTML = `<p>${t('license_load_error')}</p>`; applyTranslations(); return; }
        let html = '';
        if (data.license) {
            html += `<div class="license-card">
                        <div class="license-icon"><i class="fas fa-certificate"></i></div>
                        <div class="license-title">${t('course_license')}</div>
                        <div class="license-text">${escapeHtml(data.license.text)}</div>
                        <a href="${escapeHtml(data.license.url)}" target="_blank" rel="noopener noreferrer" class="license-btn"><i class="fas fa-external-link-alt"></i> ${t('learn_more')}</a>
                    </div>`;
        }
        if (data.bio) html += `<div class="bio-section"><h3><i class="fas fa-users"></i> ${t('bio_title')}</h3><p>${escapeHtml(data.bio)}</p></div>`;
        if (data.distributor) html += `<div class="distributor-section"><h3><i class="fas fa-truck"></i> ${t('distributor_title')}</h3><p>${escapeHtml(data.distributor)}</p></div>`;
        if (data.tutoria && data.tutoria.links && data.tutoria.links.length) {
            let linksHtml = '<ul class="tutoria-info">';
            data.tutoria.links.forEach(link => linksHtml += `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-comment"></i> ${escapeHtml(link.name)}</a></li>`);
            linksHtml += '</ul>';
            html += `<div class="tutoria-section"><h3><i class="fas fa-chalkboard-teacher"></i> ${t('tutoria_title')}</h3>${linksHtml}</div>`;
        }
        if (!html) html = `<p>${t('license_no_info')}</p>`;
        container.innerHTML = html;
        applyTranslations();
    }

    async function renderBooksFilteredByDiscipline(discipline) {
        const container = document.getElementById('booksList');
        if (!container) return;
        container.innerHTML = '';
        if (!discipline) {
            discipline = ensureCurrentDiscipline();
            if (!discipline || discipline === t('discipline_unavailable')) {
                container.innerHTML = `<div class="bibliografia-heading">${t('tab_bibliography')}</div><p>${t('loading')}</p>`;
                applyTranslations();
                return;
            }
        }
        const books = await loadBooksForCourse(currentCourse);
        if (!books || books.length === 0) {
            container.innerHTML = `<div class="bibliografia-heading">${t('tab_bibliography')}</div><p>${t('no_books')}</p>`;
            applyTranslations();
            return;
        }
        const normalizedDiscipline = normalize(discipline);
        const filteredBooks = books.filter(book => normalize(book.discipline) === normalizedDiscipline);
        const headingText = `${t('tab_bibliography')} — ${discipline}`;
        if (filteredBooks.length === 0) {
            container.innerHTML = `<div class="bibliografia-heading">${escapeHtml(headingText)}</div><p>${t('no_books')}</p>`;
            applyTranslations();
            return;
        }
        let html = `<div class="bibliografia-heading">${escapeHtml(headingText)}</div><div class="books-container">`;
        filteredBooks.forEach(book => {
            let detailsHtml = '';
            if (book.edition) detailsHtml += `<span>${escapeHtml(book.edition)}</span>`;
            if (book.year) detailsHtml += `<span>${escapeHtml(book.year)}</span>`;
            if (book.publisher) detailsHtml += `<span>${escapeHtml(book.publisher)}</span>`;
            if (book.language) detailsHtml += `<span>${escapeHtml(book.language)}</span>`;
            if (book.isbn) detailsHtml += `<span>ISBN: ${escapeHtml(book.isbn)}</span>`;
            if (book.category) detailsHtml += `<span>${escapeHtml(book.category)}</span>`;
            const existsInLibrary = !!findBookInLibrary(book);
            html += `<div class="book-card">
                        <div class="book-left"><img class="book-cover" src="${escapeHtml(book.cover || '')}" alt="${escapeHtml(book.title)}" loading="lazy" onerror="this.src='https://placehold.co/140x180/1F2933/9CA3AF?text=Sem+Imagem'"></div>
                        <div class="book-right">
                            <div class="book-title">${escapeHtml(book.title)}</div>
                            <div class="book-author"><i class="fas fa-user"></i> ${escapeHtml(book.author)}</div>
                            ${detailsHtml ? `<div class="book-details">${detailsHtml}</div>` : ''}
                            <div class="book-description">${escapeHtml(book.description || t('no_description'))}</div>
                            <div class="book-actions">
                                <button class="book-details-btn" data-link="${safeAttr(book.link || '')}" ${!book.link ? 'disabled' : ''}>${t('book_details')}</button>
                                ${existsInLibrary ? `<button class="go-to-library-btn" data-title="${safeAttr(book.title)}">${t('go_to_library')}</button>` : ''}
                            </div>
                        </div>
                    </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
        document.querySelectorAll('.book-details-btn').forEach(btn => btn.addEventListener('click', () => { const link = btn.getAttribute('data-link'); if (link && isValidUrl(link)) window.open(link, '_blank'); else alert(t('book_link_unavailable')); }));
        document.querySelectorAll('.go-to-library-btn').forEach(btn => btn.addEventListener('click', () => goToLibrary(btn.getAttribute('data-title'))));
        applyTranslations();
    }

    function ensureCurrentDiscipline() {
        if (currentDiscipline) return currentDiscipline;
        if (stagesData && stagesData.length > 0 && stagesData[0].disciplines.length > 0) {
            currentDiscipline = stagesData[0].disciplines[0].name;
            return currentDiscipline;
        }
        currentDiscipline = t('discipline_unavailable');
        return currentDiscipline;
    }

    // ========== FUNÇÕES DO CURSO ==========
    function convertStages(stagesDataRaw) {
        return stagesDataRaw.map(stage => ({
            name: stage.name,
            disciplines: stage.disciplines.map(discipline => ({
                name: discipline.name,
                videos: buildVideosFromDiscipline(discipline)
            }))
        }));
    }

    function buildVideosFromDiscipline(discipline) {
        if (discipline.type === 'external') {
            const duration = getDurationFromDiscipline(discipline) || 55;
            return [{ id: 'external', title: discipline.name, url: discipline.externalUrl, platform: discipline.platformName, type: 'external', watched: false, time: 0, duration: duration }];
        } else if (discipline.type === 'exercise') {
            const duration = getDurationFromDiscipline(discipline) || 30;
            return [{ id: 'exercise', title: discipline.name, type: 'exercise', description: discipline.description || t('exercise_lesson_desc'), exerciseType: discipline.exerciseType || 'practice', watched: false, time: 0, duration: duration }];
        }
        return buildVideosFromIds(discipline.videoIds, discipline.name);
    }

    function buildVideosFromIds(ids, baseTitle) {
        return ids.map((id, idx) => ({ id, title: `${baseTitle} - Aula ${idx+1}`, url: `https://www.youtube.com/embed/${id}`, duration: 10 + (idx % 25) + 5, watched: false, time: 0 }));
    }

    function initCourse(courseData) {
        stagesData = convertStages(courseData.stages);
        rebuildDataStructures();
    }

    function rebuildDataStructures() {
        allVideosFlat = [];
        stagesData.forEach((stage, sIdx) => {
            stage.disciplines.forEach((disc, dIdx) => {
                disc.videos.forEach((video, vIdx) => allVideosFlat.push({ ...video, stageIdx: sIdx, disciplineIdx: dIdx, videoIdx: vIdx }));
            });
        });
        lessons = groupVideosIntoLessons(allVideosFlat, 60, 18);
        disciplineLessonsMap.clear();
        disciplineToLessonsMap.clear();
        stagesData.forEach((stage, sIdx) => {
            stage.disciplines.forEach(discipline => {
                const indices = [];
                lessons.forEach((l, idx) => {
                    if (l.videos.some(v => v.disciplineIdx === stage.disciplines.indexOf(discipline) && v.stageIdx === sIdx)) {
                        indices.push(idx);
                    }
                });
                disciplineLessonsMap.set(discipline.name, indices);
                disciplineToLessonsMap.set(discipline.name, indices);
            });
        });
        loadProgressForCourse(currentCourse);
        renderUnifiedCourseContent();
        renderCurrentLessonPanel();
    }

    function groupVideosIntoLessons(videos, targetMin = 60, tolerance = 18) {
        const lessons = [];
        let current = { videos: [], totalDuration: 0 };
        for (let v of videos) {
            const dur = v.duration;
            if (current.totalDuration + dur <= targetMin + tolerance) {
                current.videos.push(v);
                current.totalDuration += dur;
            } else {
                if (current.videos.length) lessons.push({ ...current, id: lessons.length, completed: false, unlocked: lessons.length === 0 });
                current = { videos: [v], totalDuration: dur };
            }
        }
        if (current.videos.length) lessons.push({ ...current, id: lessons.length, completed: false, unlocked: lessons.length === 0 });
        for (let i = 1; i < lessons.length; i++) lessons[i].unlocked = false;
        return lessons;
    }

    function loadProgressForCourse(courseId) {
        const key = `ulivre_course_${courseId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                data.watchedMap?.forEach((w, idx) => { if (allVideosFlat[idx]) allVideosFlat[idx].watched = w; });
                if (data.currentLessonId !== undefined) currentLessonId = data.currentLessonId;
                if (data.currentVideoInLesson !== undefined) currentVideoInLesson = data.currentVideoInLesson;
                for (let i = 0; i < lessons.length; i++) {
                    lessons[i].completed = lessons[i].videos.every(v => v.watched);
                    if (i > 0 && lessons[i-1].completed) lessons[i].unlocked = true;
                    else if (i === 0) lessons[i].unlocked = true;
                }
            } catch (e) { console.error(`[Progresso] Erro ao parsear dados para ${courseId}:`, e); resetProgressForNewCourse(); }
        } else { resetProgressForNewCourse(); }
        saveAllProgress();
        checkCourseCompletion();
    }

    function resetProgressForNewCourse() {
        currentLessonId = 0;
        currentVideoInLesson = 0;
        allVideosFlat.forEach(v => v.watched = false);
        for (let i = 0; i < lessons.length; i++) { lessons[i].completed = false; lessons[i].unlocked = (i === 0); }
        notifiedDisciplines.clear();
    }

    // ========== CONTROLE DE VISIBILIDADE DA ABA PRÁTICA (agora sempre visível) ==========
    function updatePracticeTabVisibility() {
        const practiceTab = document.getElementById('practiceTabBtn');
        if (!practiceTab) return;
        
        if (practiceTab.style.display !== 'inline-flex') {
            console.log('[Prática] Garantindo que a aba Prática esteja visível');
            practiceTab.style.display = 'inline-flex';
        }
        
        if (currentCourse && !currentPracticeData && activeTab === 'pratica') {
            loadPracticeContent(currentCourse);
        }
    }

    function saveAllProgress() {
        if (!currentCourse) return;
        const watchedMap = allVideosFlat.map(v => v.watched);
        let savedData = localStorage.getItem(`ulivre_course_${currentCourse}`);
        let existing = savedData ? JSON.parse(savedData) : {};
        
        const now = generateTimeSet();
        const timeCreated = existing.time_created || now;
        const timeUpdated = now;
        
        const newData = {
            watchedMap,
            currentLessonId,
            currentVideoInLesson,
            time_created: timeCreated,
            time_updated: timeUpdated
        };
        
        localStorage.setItem(`ulivre_course_${currentCourse}`, JSON.stringify(newData));
        updateGlobalStats();
        updatePracticeTabVisibility();
        if (typeof renderProgressChart === 'function') renderProgressChart();
    }

    function updateGlobalStats() {
        let total = allVideosFlat.length, watched = allVideosFlat.filter(v => v.watched).length;
        let percent = total ? Math.floor((watched / total) * 100) : 0;
        const homeScreen = document.getElementById('homeScreen');
        if (homeScreen) {
            const courseCards = homeScreen.querySelectorAll('.course-card');
            courseCards.forEach(card => {
                if (card.dataset.course === currentCourse) {
                    const fillElem = card.querySelector('.course-progress-fill');
                    const percentElem = card.querySelector('.course-progress-percent');
                    if (fillElem) fillElem.style.width = `${percent}%`;
                    if (percentElem) percentElem.innerText = `${percent}%`;
                }
            });
        }
        let totalTime = parseInt(localStorage.getItem("total_course_time") || "0");
        const totalTimeDisplay = document.getElementById("totalTimeDisplay");
        if (totalTimeDisplay) totalTimeDisplay.innerHTML = `${Math.floor(totalTime / 3600)}h ${Math.floor((totalTime % 3600) / 60)}m`;
        const streakDisplay = document.getElementById("streakDisplay");
        if (streakDisplay) streakDisplay.innerHTML = localStorage.getItem("global_streak") || "0";
    }

    function syncVideosWatched() { allVideosFlat.forEach(v => { stagesData[v.stageIdx]?.disciplines[v.disciplineIdx]?.videos[v.videoIdx] && (stagesData[v.stageIdx].disciplines[v.disciplineIdx].videos[v.videoIdx].watched = v.watched); }); }

    function updateLessonCompletion(lessonId) {
        let lesson = lessons[lessonId];
        if (!lesson) return false;
        let allWatched = lesson.videos.every(v => v.watched);
        if (allWatched && !lesson.completed) {
            lesson.completed = true;
            if (lessonId + 1 < lessons.length) lessons[lessonId + 1].unlocked = true;
            renderCurrentLessonPanel();
            renderUnifiedCourseContent();
            expandCurrentLessonInUnifiedContent();
            queueNotification(t('lesson_completed', { id: lessonId + 1 }), 'success');
            for (let [discName, lessonIds] of disciplineToLessonsMap.entries()) {
                if (lessonIds.includes(lessonId)) {
                    updateDisciplineCompletion(discName, lessonIds);
                }
            }
            return true;
        }
        return false;
    }

    function checkCourseCompletion() {
        if (!currentCourse || !allVideosFlat.length) return;
        const total = allVideosFlat.length;
        const watched = allVideosFlat.filter(v => v.watched).length;
        const progressPercent = total ? Math.floor((watched / total) * 100) : 0;
        if (progressPercent >= 100) {
            if (window._completionPopupTriggered) return;
            window._completionPopupTriggered = true;
            localStorage.setItem(`course_completed_${currentCourse}`, 'true');
            const courseName = currentCourseDetails?.name || (currentCourse === 'computacao' ? 'Ciência da Computação' : currentCourse);
            const folderPath = currentCourseFolder;
            if (window.showFinalCompletionModal) window.showFinalCompletionModal(currentCourse, courseName, folderPath);
        }
    }

    function updateDisciplineCompletion(disciplineName, lessonIds) {
        const allLessonsCompleted = lessonIds.every(lid => lessons[lid]?.completed === true);
        if (allLessonsCompleted && !notifiedDisciplines.has(disciplineName)) {
            notifiedDisciplines.add(disciplineName);
            queueNotification(t('discipline_completed', { name: disciplineName }), 'success');
        }
    }

    function expandCurrentLessonInUnifiedContent() {
        const currentLesson = lessons[currentLessonId];
        if (!currentLesson) return;
        const firstVideo = currentLesson.videos[0];
        const stageIdx = firstVideo.stageIdx;
        const disciplineIdx = firstVideo.disciplineIdx;
        const disciplineName = stagesData[stageIdx]?.disciplines[disciplineIdx]?.name;
        if (!disciplineName) return;
        const stageDivs = document.querySelectorAll('.stage-group-unified');
        if (!stageDivs[stageIdx]) return;
        const stageDiv = stageDivs[stageIdx];
        const disciplinesList = stageDiv.querySelector('.disciplines-list');
        if (disciplinesList) disciplinesList.classList.add('open');
        const disciplineCards = stageDiv.querySelectorAll('.discipline-card');
        for (let i = 0; i < disciplineCards.length; i++) {
            const headerSpan = disciplineCards[i].querySelector('.discipline-header span');
            if (headerSpan && headerSpan.innerText.trim() === disciplineName) {
                const weeksContainer = disciplineCards[i].querySelector('.weeks-container');
                if (weeksContainer) weeksContainer.classList.add('open');
                break;
            }
        }
    }

    function stopAllMedia() {
        if (player && isPlayerReady) { try { player.pauseVideo(); player.stopVideo(); player.clearVideo(); } catch (e) { console.warn('[Media] Erro ao parar YouTube:', e); } }
        hideExternalLesson();
        const progressFill = document.getElementById("videoProgressFill");
        if (progressFill) progressFill.style.width = "0%";
        const currentTimeEl = document.getElementById("videoCurrentTime");
        if (currentTimeEl) currentTimeEl.innerText = "00:00";
        const durationEl = document.getElementById("videoDuration");
        if (durationEl) durationEl.innerText = "00:00";
        if (updateInterval) clearInterval(updateInterval);
    }

    function showExternalLesson(video) {
        const container = document.getElementById('externalLessonContainer');
        const youtubeWrapper = document.getElementById('youtube-player');
        const volumeControlDiv = document.getElementById('volumeControl');
        if (!container) return;
        stopAllMedia();
        if (youtubeWrapper) youtubeWrapper.style.display = 'none';
        if (volumeControlDiv) volumeControlDiv.style.display = 'none';
        container.style.display = 'flex';
        container.innerHTML = `<div class="external-lesson-card">
            <div class="external-lesson-icon"><i class="fas fa-external-link-alt"></i></div>
            <h3>${escapeHtml(video.title)}</h3>
            <p>${t('external_lesson_desc')}</p>
            <div class="external-platform"><i class="fas fa-globe"></i> ${escapeHtml(video.platform || t('external_platform_default'))}</div>
            <p>${t('external_instruction')}</p>
            <div class="external-buttons">
                <button id="goToExternalBtn" class="external-btn external-btn-primary"><i class="fas fa-external-link-alt"></i> ${t('go_to_platform')}</button>
                <button id="markExternalWatchedBtn" class="external-btn external-btn-secondary"><i class="fas fa-check"></i> ${t('mark_watched')}</button>
            </div>
            <p style="font-size: 0.8rem; margin-top: 1rem; color: var(--text-secondary);">${t('external_footer_note')}</p>
        </div>`;
        const goBtn = document.getElementById('goToExternalBtn');
        if (goBtn) goBtn.addEventListener('click', () => { if (video.url && isValidUrl(video.url)) window.open(video.url, '_blank'); else alert(t('book_link_unavailable')); });
        const markBtn = document.getElementById('markExternalWatchedBtn');
        if (markBtn) markBtn.addEventListener('click', () => markCurrentVideoWatched());
        applyTranslations();
    }

    function showExerciseLesson(video) {
        const container = document.getElementById('externalLessonContainer');
        const youtubeWrapper = document.getElementById('youtube-player');
        const volumeControlDiv = document.getElementById('volumeControl');
        if (!container) return;
        stopAllMedia();
        if (youtubeWrapper) youtubeWrapper.style.display = 'none';
        if (volumeControlDiv) volumeControlDiv.style.display = 'none';
        container.style.display = 'flex';
        let exerciseTypeText = '';
        if (video.exerciseType === 'practice') exerciseTypeText = t('exercise_type_practice');
        else if (video.exerciseType === 'challenge') exerciseTypeText = t('exercise_type_challenge');
        else if (video.exerciseType === 'assessment') exerciseTypeText = t('exercise_type_assessment');
        else exerciseTypeText = t('exercise_type_practice');
        container.innerHTML = `<div class="external-lesson-card">
            <div class="external-lesson-icon"><i class="fas fa-tasks"></i></div>
            <h3>${escapeHtml(video.title)}</h3>
            <p>${escapeHtml(video.description)}</p>
            <div class="external-platform"><i class="fas fa-clock"></i> Duração: ${video.duration} min <i class="fas fa-tag" style="margin-left: 1rem;"></i> ${exerciseTypeText}</div>
            <p>${t('exercise_lesson_desc')}</p>
            <div class="external-buttons"><button id="markExerciseWatchedBtn" class="external-btn external-btn-primary"><i class="fas fa-check"></i> ${t('mark_watched')}</button></div>
        </div>`;
        const markBtn = document.getElementById('markExerciseWatchedBtn');
        if (markBtn) markBtn.addEventListener('click', () => markCurrentVideoWatched());
        applyTranslations();
    }

    function hideExternalLesson() {
        const container = document.getElementById('externalLessonContainer');
        const youtubeWrapper = document.getElementById('youtube-player');
        const volumeControlDiv = document.getElementById('volumeControl');
        if (container) { container.style.display = 'none'; container.innerHTML = ''; }
        if (youtubeWrapper) youtubeWrapper.style.display = 'block';
        if (volumeControlDiv) volumeControlDiv.style.display = 'flex';
    }

    function loadCurrentLesson() {
        let lesson = lessons[currentLessonId];
        if (!lesson || !lesson.unlocked) return;
        let video = lesson.videos[currentVideoInLesson] || lesson.videos[0];
        if (video) {
            if (video.type === 'external') {
                stopAllMedia();
                showExternalLesson(video);
                const titleEl = document.getElementById("currentVideoTitle");
                if (titleEl) titleEl.innerText = video.title;
                const progressFill = document.getElementById("videoProgressFill");
                if (progressFill) progressFill.style.width = "0%";
                const currentTimeEl = document.getElementById("videoCurrentTime");
                if (currentTimeEl) currentTimeEl.innerText = "00:00";
                const durationEl = document.getElementById("videoDuration");
                if (durationEl) durationEl.innerText = "00:00";
                currentVideoDuration = 0;
            } else if (video.type === 'exercise') {
                stopAllMedia();
                showExerciseLesson(video);
                const titleEl = document.getElementById("currentVideoTitle");
                if (titleEl) titleEl.innerText = video.title;
                const progressFill = document.getElementById("videoProgressFill");
                if (progressFill) progressFill.style.width = "0%";
                const currentTimeEl = document.getElementById("videoCurrentTime");
                if (currentTimeEl) currentTimeEl.innerText = "00:00";
                const durationEl = document.getElementById("videoDuration");
                if (durationEl) durationEl.innerText = "00:00";
                currentVideoDuration = 0;
            } else {
                hideExternalLesson();
                loadVideoInPlayer(video);
            }
        }
        renderCurrentLessonPanel(); renderUnifiedCourseContent();
        expandCurrentLessonInUnifiedContent();
        updateCurrentDiscipline();
        updateNotificationPosition();
        if (window.CursorTimeset && currentCourse && currentDiscipline) {
            let context = 'discipline';
            if (activeTab === 'pratica') context = 'practice';
            else if (activeTab === 'bibliografia') context = 'bibliography';
            window.CursorTimeset.registerDisciplineEntry(currentCourse, currentDiscipline, context);
        }
    }

    function loadVideoInPlayer(videoObj) {
        let videoId = videoObj.url.split("/embed/")[1]?.split("?")[0] || "j6hcALm0mLM";
        if (player && isPlayerReady) {
            player.loadVideoById(videoId);
            setTimeout(() => {
                if (player && isPlayerReady) {
                    player.setVolume(playerVolume);
                    const muteBtn = document.getElementById('muteUnmuteBtn');
                    if (muteBtn && playerVolume === 0) {
                        muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                    }
                    if (videoObj.time > 5) player.seekTo(videoObj.time, true);
                }
            }, 500);
        }
        const titleEl = document.getElementById("currentVideoTitle");
        if (titleEl) titleEl.innerText = videoObj.title;
        currentVideoDuration = videoObj.duration * 60;
        saveAllProgress();
    }

    function markCurrentVideoWatched() {
        let lesson = lessons[currentLessonId];
        if (!lesson) return;
        let currentVideo = lesson.videos[currentVideoInLesson];
        if (!currentVideo.watched) {
            currentVideo.watched = true;
            syncVideosWatched();
            let completed = updateLessonCompletion(currentLessonId);
            if (completed) {
                if (currentVideoInLesson + 1 < lesson.videos.length) {
                    currentVideoInLesson++;
                    loadCurrentLesson();
                } else if (currentLessonId + 1 < lessons.length && lessons[currentLessonId + 1].unlocked) {
                    currentLessonId++;
                    currentVideoInLesson = 0;
                    loadCurrentLesson();
                } else {
                    alert(t('all_videos_completed'));
                    setTimeout(() => checkCourseCompletion(), 100);
                }
            } else {
                if (currentVideoInLesson + 1 < lesson.videos.length) {
                    currentVideoInLesson++;
                    loadCurrentLesson();
                }
            }
            saveAllProgress(); renderCurrentLessonPanel(); renderUnifiedCourseContent();
            expandCurrentLessonInUnifiedContent();
            updateCurrentDiscipline();
            checkCourseCompletion();
            updateNotificationPosition();
        } else {
            alert(t('video_already_watched'));
        }
    }

    function nextVideo() {
        let lesson = lessons[currentLessonId];
        if (currentVideoInLesson + 1 < lesson.videos.length) {
            currentVideoInLesson++;
            loadCurrentLesson();
        } else if (currentLessonId + 1 < lessons.length && lessons[currentLessonId + 1].unlocked) {
            currentLessonId++;
            currentVideoInLesson = 0;
            loadCurrentLesson();
        } else {
            alert(t('next_locked'));
        }
    }
    function prevVideo() {
        if (currentVideoInLesson > 0) {
            currentVideoInLesson--;
            loadCurrentLesson();
        } else if (currentLessonId > 0) {
            currentLessonId--;
            currentVideoInLesson = lessons[currentLessonId].videos.length - 1;
            loadCurrentLesson();
        } else {
            alert(t('first_video'));
        }
    }

    function updateCurrentDiscipline() {
        let lesson = lessons[currentLessonId];
        if (!lesson) return;
        const discipline = lesson.videos[0].title.split(' - ')[0];
        if (currentDiscipline !== discipline) {
            currentDiscipline = discipline;
            const bibliografiaTab = document.getElementById('bibliografia-tab');
            if (bibliografiaTab && bibliografiaTab.classList.contains('active')) {
                renderBooksFilteredByDiscipline(currentDiscipline);
            }
        }
    }

    function renderCurrentLessonPanel() {
        let container = document.getElementById("currentLessonPanelContent");
        if (!container) return;
        let lesson = lessons[currentLessonId];
        if (!lesson) { container.innerHTML = `<p>${t('loading')}</p>`; applyTranslations(); return; }
        let watched = lesson.videos.filter(v => v.watched).length;
        let percent = (watched / lesson.videos.length) * 100;
        let html = `<div class="current-lesson-info">
                        <strong>${t('lesson_label')} ${currentLessonId + 1}</strong> · ${Math.round(lesson.totalDuration)} min<br>
                        <small>${watched}/${lesson.videos.length} ${t('videos')}</small>
                        <div class="lesson-progress-bar" style="margin-top:4px;">
                            <div class="lesson-progress-fill" style="width:${percent}%;"></div>
                        </div>
                    </div>
                    <div class="current-lesson-videos">`;
        lesson.videos.forEach((v, idx) => {
            let isCurrent = idx === currentVideoInLesson;
            let watchedClass = v.watched ? 'watched' : '';
            html += `<div class="current-video-item ${watchedClass}" data-video-index="${idx}">
                        <i class="fas ${isCurrent ? 'fa-play-circle' : (v.watched ? 'fa-check-circle' : 'fa-circle')}"></i> ${v.title}
                    </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
        container.querySelectorAll('.current-video-item').forEach(el => {
            let idx = parseInt(el.dataset.videoIndex);
            if (!isNaN(idx) && lessons[currentLessonId].unlocked) el.addEventListener('click', () => { currentVideoInLesson = idx; loadCurrentLesson(); });
        });
        applyTranslations();
        updateNotificationPosition();
    }

    function renderUnifiedCourseContent() {
        let container = document.getElementById("unifiedContentList");
        if (!container) return;
        container.innerHTML = "";
        stagesData.forEach((stage, stageIdx) => {
            let totalVids = 0, watchedVids = 0;
            stage.disciplines.forEach(disc => disc.videos.forEach(v => { totalVids++; if (v.watched) watchedVids++; }));
            let stagePercent = totalVids ? Math.floor((watchedVids / totalVids) * 100) : 0;
            let stageDiv = document.createElement("div");
            stageDiv.className = "stage-group-unified";
            stageDiv.innerHTML = `<div class="stage-header"><span>${stage.name}</span><span class="stage-progress">${stagePercent}%</span></div><div class="disciplines-list"></div>`;
            let discList = stageDiv.querySelector('.disciplines-list');
            stage.disciplines.forEach(discipline => {
                let lessonsIndices = disciplineLessonsMap.get(discipline.name) || [];
                let lessonsForDisc = lessonsIndices.map(i => lessons[i]).filter(l => l);
                let totalV = lessonsForDisc.reduce((s, l) => s + l.videos.length, 0);
                let watchedV = lessonsForDisc.reduce((s, l) => s + l.videos.filter(v => v.watched).length, 0);
                let discPercent = totalV ? Math.round((watchedV / totalV) * 100) : 0;
                let card = document.createElement("div");
                card.className = "discipline-card";
                card.innerHTML = `<div class="discipline-header"><span><i class="fas fa-book-open" style="margin-right:0.5rem;"></i>${discipline.name}</span><span class="discipline-progress">${discPercent}%</span></div><div class="weeks-container"></div>`;
                let weeksContainer = card.querySelector('.weeks-container');
                let weeks = [];
                for (let i = 0; i < lessonsForDisc.length; i += 5) weeks.push(lessonsForDisc.slice(i, i + 5));
                weeks.forEach((week, wIdx) => {
                    let weekDiv = document.createElement("div");
                    weekDiv.className = "week-group";
                    weekDiv.innerHTML = `<div class="week-title">${t('week')} ${wIdx + 1}</div>`;
                    week.forEach(lesson => {
                        let gid = lessons.indexOf(lesson);
                        let lessonDiv = document.createElement("div");
                        lessonDiv.className = `lesson-item ${lesson.completed ? 'completed' : ''}`;
                        lessonDiv.innerHTML = `<span><i class="fas fa-play-circle" style="font-size:0.7rem; margin-right:0.5rem;"></i> ${t('lesson_label')} ${gid + 1}</span> <span>${Math.round(lesson.totalDuration)}min</span>`;
                        lessonDiv.setAttribute('data-lesson-id', gid);
                        lessonDiv.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const lid = parseInt(e.currentTarget.getAttribute('data-lesson-id'));
                            if (!isNaN(lid) && lessons[lid] && lessons[lid].unlocked) {
                                currentLessonId = lid;
                                currentVideoInLesson = 0;
                                loadCurrentLesson();
                            } else if (lessons[lid] && !lessons[lid].unlocked) alert(t('lesson_locked'));
                        });
                        weekDiv.appendChild(lessonDiv);
                    });
                    weeksContainer.appendChild(weekDiv);
                });
                let header = card.querySelector('.discipline-header');
                header.addEventListener('click', () => weeksContainer.classList.toggle('open'));
                discList.appendChild(card);
            });
            let stageHeader = stageDiv.querySelector('.stage-header');
            stageHeader.addEventListener('click', () => discList.classList.toggle('open'));
            container.appendChild(stageDiv);
        });
        applyTranslations();
    }

    async function loadTeamAndContributors(courseId) {
        const teamFiles = {
            computacao: 'cursos/graduacao/ciencia-computacao/team-computacao.json',
            matematica: 'cursos/graduacao/matematica/team-matematica.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/team-computacao-grafica.json',
            embarcados: 'cursos/pos-graduacao/embarcados/team-embarcados.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/team-desenvolvimento-web.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/team-cybersecurity.json',
            devops: 'cursos/pos-graduacao/devops/team-devops.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/team-ciencia-de-dados.json',
            'computer-science': 'cursos/graduacao/computer-science/team-computer-science.json',
            'math': 'cursos/graduacao/math/team-math.json',
            'enem': 'cursos/ensino-medio/enem/team-enem.json'   // <-- NOVO
        };
        const fileName = teamFiles[courseId];
        if (!fileName) return;
        try {
            const response = await fetch(fileName);
            if (!response.ok) throw new Error('Erro ao carregar dados do time');
            const data = await response.json();
            renderTeam(data.time);
        } catch (error) {
            console.error('Erro ao carregar time:', error);
            const teamContainer = document.getElementById('team-grid');
            if (teamContainer) teamContainer.innerHTML = `<p>${t('no_team')}</p>`;
            applyTranslations();
        }
    }

    function renderTeam(team) {
        const container = document.getElementById('team-grid');
        if (!container) return;
        if (!team || team.length === 0) { container.innerHTML = `<p>${t('no_team')}</p>`; applyTranslations(); return; }
        container.innerHTML = team.map(member => `
            <div class="member-card">
                <img class="member-photo" src="${member.image || 'img/team/default-avatar.png'}" alt="${escapeHtml(member.name)}" onerror="this.src='img/team/default-avatar.png'">
                <div class="member-name"><a href="${member.github}" target="_blank" rel="noopener noreferrer">${escapeHtml(member.name)}</a></div>
                <div class="member-role">${escapeHtml(member.role)}</div>
                <div class="member-year">${escapeHtml(member.year)}</div>
                <div class="member-desc">${escapeHtml(member.description)}</div>
            </div>
        `).join('');
        applyTranslations();
    }

    // ========== ABA PRÁTICA ==========
    async function loadPracticeContent(courseId) {
        if (activeTab !== 'pratica') return;
        const container = document.getElementById('practiceContent');
        if (!container) return;
        container.innerHTML = '';
        let practiceData = null;
        try {
            const specificUrl = `cursos/ensino-medio/enem/pratica-enem.json`;   // <-- NOVO caminho para ENEM
            const specificResponse = await fetch(specificUrl);
            if (specificResponse.ok) {
                practiceData = await specificResponse.json();
            }
        } catch (e) {}
        if (!practiceData) {
            try {
                const globalResponse = await fetch('cursos/pratica/practice-global.json');
                if (globalResponse.ok) {
                    practiceData = await globalResponse.json();
                } else {
                    throw new Error('Arquivo global não encontrado');
                }
            } catch (error) {
                console.error('[Prática] Erro ao carregar conteúdo:', error);
                container.innerHTML = `<p>${t('practice_unavailable')}</p>`;
                applyTranslations();
                return;
            }
        }
        currentPracticeData = practiceData;
        if (activeTab !== 'pratica') return;
        const searchHtml = `
            <div class="practice-search-wrapper">
                <i class="fas fa-search search-icon"></i>
                <input type="text" id="practiceSearchInput" class="practice-search-input" placeholder="${t('search_practice_placeholder')}">
            </div>
        `;
        let introHtml = '';
        if (currentPracticeData.intro) {
            let introText = '';
            if (typeof currentPracticeData.intro === 'object') {
                introText = currentPracticeData.intro[currentLang] || currentPracticeData.intro['pt-br'] || '';
            } else {
                introText = currentPracticeData.intro;
            }
            introHtml = `<div class="practice-intro">${escapeHtml(introText)}</div>`;
        }
        const gridContainerHtml = '<div id="practiceGridContainer" class="practice-grid"></div>';
        container.innerHTML = searchHtml + introHtml + gridContainerHtml;
        practiceSearchInput = document.getElementById('practiceSearchInput');
        renderPracticeGrid(currentPracticeData);
        if (practiceSearchInput) {
            practiceSearchInput.addEventListener('input', debounce(() => filterPracticeGrid(), 300));
        }
        applyTranslations();
    }

    function renderPracticeGrid(practiceData) {
        if (activeTab !== 'pratica') return;
        const gridContainer = document.getElementById('practiceGridContainer');
        if (!gridContainer) return;
        if (!practiceData.platforms || practiceData.platforms.length === 0) {
            gridContainer.innerHTML = `<p>${t('no_practice')}</p>`;
            applyTranslations();
            return;
        }
        let html = '';
        const lang = currentLang;
        practiceData.platforms.forEach(platform => {
            let titulo = '';
            if (typeof platform.titulo === 'object') {
                titulo = platform.titulo[lang] || platform.titulo['pt-br'] || '';
            } else {
                titulo = platform.titulo || '';
            }
            let descricao = '';
            if (typeof platform.descricao === 'object') {
                descricao = platform.descricao[lang] || platform.descricao['pt-br'] || '';
            } else {
                descricao = platform.descricao || '';
            }
            const imagem = platform.imagem || 'https://placehold.co/400x200/1F2933/9CA3AF?text=Prática';
            const link = platform.link || '#';
            html += `<div class="practice-platform-card">
                        <div class="practice-platform-image"><img src="${escapeHtml(imagem)}" alt="${escapeHtml(titulo)}" loading="lazy" onerror="this.src='https://placehold.co/400x200/1F2933/9CA3AF?text=${encodeURIComponent(titulo)}'"></div>
                        <div class="practice-platform-content">
                            <h3>${escapeHtml(titulo)}</h3>
                            <p>${escapeHtml(descricao)}</p>
                            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="practice-platform-btn"><i class="fas fa-external-link-alt"></i> ${t('access_practice')}</a>
                        </div>
                    </div>`;
        });
        gridContainer.innerHTML = html;
        applyTranslations();
    }

    function filterPracticeGrid() {
        if (activeTab !== 'pratica') return;
        if (!currentPracticeData || !practiceSearchInput) return;
        const searchTerm = practiceSearchInput.value.trim().toLowerCase();
        if (searchTerm === '') {
            renderPracticeGrid(currentPracticeData);
            return;
        }
        const lang = currentLang;
        const filteredPlatforms = currentPracticeData.platforms.filter(platform => {
            let titulo = '';
            if (typeof platform.titulo === 'object') {
                titulo = platform.titulo[lang] || platform.titulo['pt-br'] || '';
            } else {
                titulo = platform.titulo || '';
            }
            let descricao = '';
            if (typeof platform.descricao === 'object') {
                descricao = platform.descricao[lang] || platform.descricao['pt-br'] || '';
            } else {
                descricao = platform.descricao || '';
            }
            return titulo.toLowerCase().includes(searchTerm) || descricao.toLowerCase().includes(searchTerm);
        });
        renderPracticeGrid({ intro: currentPracticeData.intro, platforms: filteredPlatforms });
    }

    // ========== ACTIVATE TAB ==========
    function activateTab(tabId) {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const tabContent = document.getElementById(`${tabId}-tab`);
        if (!tabBtn || !tabContent) return;
        activeTab = tabId;
        document.querySelectorAll('.tab-content').forEach(content => {
            content.style.display = 'none';
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        tabContent.style.display = 'block';
        tabContent.classList.add('active');
        tabBtn.classList.add('active');
        if (tabId === 'bibliografia') {
            if (!currentDiscipline) ensureCurrentDiscipline();
            renderBooksFilteredByDiscipline(currentDiscipline);
            if (window.CursorTimeset && currentCourse && currentDiscipline) {
                window.CursorTimeset.registerDisciplineEntry(currentCourse, currentDiscipline, 'bibliography');
            }
        } else if (tabId === 'pratica') {
            if (currentCourse) {
                loadPracticeContent(currentCourse);
                if (window.CursorTimeset && currentDiscipline) {
                    window.CursorTimeset.registerDisciplineEntry(currentCourse, currentDiscipline, 'practice');
                }
            }
        } else if (tabId === 'team') {
            const teamGrid = document.getElementById('team-grid');
            if (teamGrid && teamGrid.innerHTML === '') loadTeamAndContributors(currentCourse);
        } else if (tabId === 'contributors') {
            renderContributorsTab();
        } else if (tabId === 'license') {
            renderLicenseTab();
        }
        setTimeout(() => {
            if (typeof applyTranslations === 'function') applyTranslations();
        }, 50);
    }

    function initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => btn.addEventListener('click', () => activateTab(btn.getAttribute('data-tab'))));
    }

    // ========== YOUTUBE PLAYER ==========
    function onYouTubeIframeAPIReady() {
        player = new YT.Player('youtube-player', {
            height: '100%', width: '100%',
            playerVars: { autoplay: 0, controls: 1, modestbranding: 1, rel: 0 },
            events: {
                onReady: () => {
                    isPlayerReady = true;
                    player.setVolume(playerVolume);
                    if (window._startLessonScheduled) { window._startLessonScheduled = false; startLesson(); }
                },
                onStateChange: onPlayerStateChange,
                onError: () => console.error("Erro no player do YouTube")
            }
        });
    }

    function onPlayerStateChange(event) {
        const currentVideo = lessons[currentLessonId]?.videos[currentVideoInLesson];
        if (currentVideo && (currentVideo.type === 'external' || currentVideo.type === 'exercise')) return;
        if (event.data === YT.PlayerState.PLAYING) {
            const playPauseBtn = document.getElementById("playPauseBtn");
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            if (updateInterval) clearInterval(updateInterval);
            updateInterval = setInterval(() => { if (player && isPlayerReady && player.getCurrentTime) updateVideoProgress(player.getCurrentTime()); }, 500);
        } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            const playPauseBtn = document.getElementById("playPauseBtn");
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            if (updateInterval) clearInterval(updateInterval);
            if (event.data === YT.PlayerState.ENDED && lessons[currentLessonId]?.videos[currentVideoInLesson]) markCurrentVideoWatched();
        }
        saveAllProgress();
    }

    function updateVideoProgress(ct) {
        let percent = (ct / currentVideoDuration) * 100;
        const progressFill = document.getElementById("videoProgressFill");
        if (progressFill) progressFill.style.width = `${percent}%`;
        let mins = Math.floor(ct / 60), secs = Math.floor(ct % 60);
        const currentTimeEl = document.getElementById("videoCurrentTime");
        if (currentTimeEl) currentTimeEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        let tmins = Math.floor(currentVideoDuration / 60), tsecs = currentVideoDuration % 60;
        const durationEl = document.getElementById("videoDuration");
        if (durationEl) durationEl.innerText = `${tmins}:${tsecs.toString().padStart(2, '0')}`;
        if (lessons[currentLessonId]?.videos[currentVideoInLesson]) lessons[currentLessonId].videos[currentVideoInLesson].time = ct;
    }

    function togglePlayPause() {
        const currentVideo = lessons[currentLessonId]?.videos[currentVideoInLesson];
        if (currentVideo && (currentVideo.type === 'external' || currentVideo.type === 'exercise')) return;
        if (player && isPlayerReady) {
            if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
            else player.playVideo();
        }
    }

    function startLesson() {
        if (player && isPlayerReady) loadCurrentLesson();
        else window._startLessonScheduled = true;
    }

    // ========== GRÁFICO DE PROGRESSO ==========
    function renderProgressChart() {
        const chartContainer = document.getElementById('progressChartContainer');
        if (!chartContainer) return;
        const total = allVideosFlat.length;
        const watched = allVideosFlat.filter(v => v.watched).length;
        const percent = total ? (watched / total) * 100 : 0;
        chartContainer.innerHTML = `
            <div class="progress-chart" style="margin: 1rem 0; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>${t('course_progress')}</span>
                    <span>${Math.round(percent)}%</span>
                </div>
                <div style="background: var(--bg-secondary); border-radius: 10px; overflow: hidden;">
                    <div style="width: ${percent}%; background: var(--accent-blue); height: 20px; border-radius: 10px;"></div>
                </div>
            </div>
        `;
    }

    // ========== NAVEGAÇÃO ==========
    async function openCourse(courseId) {
        const courseData = await loadCourseData(courseId);
        if (!courseData) return;
        const courseInfo = allCourses.find(c => c.id === courseId);
        currentCourseDetails = courseInfo || { id: courseId, name: courseData.name, courseLevel: courseData.type === 'Bacharelado' ? 'graduacao' : (courseData.type === 'Pós-graduação' ? 'pos-graduacao' : 'ensino-medio') };
        currentCourse = courseId;
        initCourse(courseData);
        const homeScreen = document.getElementById("homeScreen");
        if (homeScreen) homeScreen.style.display = "none";
        const courseView = document.getElementById("courseView");
        if (courseView) courseView.classList.add("active");
        loadTeamAndContributors(courseId);
        if (window.setCurrentCourseForHelp) window.setCurrentCourseForHelp(courseId);
        await loadLibraryBooks();
        if (window.CursorTimeset) {
            window.CursorTimeset.registerGraduationEntry(courseId);
        }
        if (practiceTabButton) practiceTabButton.style.display = 'inline-flex';
        if (practiceTabContent) practiceTabContent.style.display = 'block';
        const currentLesson = lessons[currentLessonId];
        if (currentLesson && currentLesson.videos[0]) currentDiscipline = currentLesson.videos[0].title.split(' - ')[0];
        else {
            const books = await loadBooksForCourse(courseId);
            if (books && books.length > 0) {
                for (let stage of stagesData) {
                    for (let disc of stage.disciplines) {
                        if (books.some(book => normalize(book.discipline) === normalize(disc.name))) {
                            currentDiscipline = disc.name;
                            break;
                        }
                    }
                    if (currentDiscipline) break;
                }
            }
            if (!currentDiscipline && stagesData[0]?.disciplines[0]) currentDiscipline = stagesData[0].disciplines[0].name;
        }
        if (!currentDiscipline) ensureCurrentDiscipline();
        renderUnifiedCourseContent();
        expandCurrentLessonInUnifiedContent();
        renderCurrentLessonPanel();
        activeTab = 'bibliografia';
        activateTab('bibliografia');
        const introDisplayed = window.checkCourseIntro && window.checkCourseIntro(courseId);
        if (introDisplayed) window.onIntroClosed = () => { startLesson(); window.onIntroClosed = null; };
        else startLesson();
        updateNotificationPosition();
        updatePracticeTabVisibility();
        renderProgressChart();
        setTimeout(() => {
            if (typeof applyTranslations === 'function') applyTranslations();
        }, 100);
    }

    function backToHome() {
        stopAllMedia();
        if (window.CursorTimeset) window.CursorTimeset.registerExit();
        const homeScreen = document.getElementById("homeScreen");
        if (homeScreen) homeScreen.style.display = "flex";
        const courseView = document.getElementById("courseView");
        if (courseView) courseView.classList.remove("active");
        if (updateInterval) clearInterval(updateInterval);
    }

    // ========== FILTROS DA PÁGINA INICIAL ==========
    let currentLevelFilter = 'all';
    let currentSearchTerm = '';

    async function renderCourseCards() {
        const homeScreen = document.getElementById('homeScreen');
        if (!homeScreen) return;
        
        if (allCourses.length === 0) {
            try {
                const response = await fetch('cursos/courses.json');
                if (!response.ok) throw new Error('Erro ao carregar lista de cursos');
                allCourses = await response.json();
            } catch (error) {
                console.error('Erro ao carregar cursos:', error);
                homeScreen.innerHTML = `<p class="error">${t('error_load_courses')}</p>`;
                return;
            }
        }
        
        const searchTerm = currentSearchTerm.trim().toLowerCase();
        const normalizedSearch = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        const filteredCourses = allCourses.filter(course => {
            if (currentLevelFilter !== 'all' && course.courseLevel !== currentLevelFilter) return false;
            if (searchTerm) {
                const name = (course.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const desc = (course.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (!name.includes(normalizedSearch) && !desc.includes(normalizedSearch)) return false;
            }
            return true;
        });
        
        if (filteredCourses.length === 0) {
            homeScreen.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>${t('no_courses_found')}</p></div>`;
            applyTranslations();
            return;
        }
        
        homeScreen.innerHTML = '';
        for (const course of filteredCourses) {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.dataset.course = course.id;
            
            const iconHtml = `<div class="course-icon"><i class="fas ${course.icon}"></i></div>`;
            
            let levelText = '';
            let typeText = '';
            if (course.courseLevel === 'graduacao') levelText = t('graduacao');
            else if (course.courseLevel === 'pos-graduacao') levelText = t('pos_graduacao');
            else if (course.courseLevel === 'ensino-medio') levelText = t('ensino_medio');
            
            if (course.courseType === 'bacharelado') typeText = t('bacharelado');
            else if (course.courseType === 'licenciatura') typeText = t('licenciatura');
            else if (course.courseType === 'tecnologo') typeText = t('tecnologo');
            
            const levelBadge = levelText ? `<span class="badge badge-course-level">${escapeHtml(levelText)}</span>` : '';
            const typeBadge = typeText ? `<span class="badge badge-course-type">${escapeHtml(typeText)}</span>` : '';
            
            const roomHtml = course.room ? `<div class="course-room"><i class="fas fa-door-open"></i> Sala: ${escapeHtml(course.room)}</div>` : '';
            const descHtml = `<p class="course-description">${escapeHtml(course.description)}</p>`;
            
            let progressPercent = 0;
            const key = `ulivre_course_${course.id}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    const watchedMap = data.watchedMap || [];
                    const total = watchedMap.length;
                    const watched = watchedMap.filter(v => v === true).length;
                    progressPercent = total ? Math.floor((watched / total) * 100) : 0;
                } catch (e) {}
            }
            const buttonKey = progressPercent > 0 ? 'continue_studies' : 'enter_course';
            
            const totalMinutes = await computeCourseTotalMinutes(course.id);
            const durationText = totalMinutes > 0 ? `<div class="course-duration"><i class="fas fa-clock"></i> ${t('course_hours')}: ${formatDuration(totalMinutes)}</div>` : '';
            
            card.innerHTML = `${iconHtml}<h2>${escapeHtml(course.name)}</h2>
                             <div class="course-badges">${levelBadge}${typeBadge}</div>
                             ${roomHtml}${descHtml}
                             ${durationText}
                             <div class="course-progress-bar">
                                <div class="course-progress-fill" style="width: ${progressPercent}%;"></div>
                             </div>
                             <p>${t('course_progress')} <span class="course-progress-percent">${progressPercent}%</span></p>
                             <button class="continue-btn" data-course="${course.id}" data-i18n="${buttonKey}">${t(buttonKey)}</button>`;
            
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('continue-btn')) openCourse(course.id);
            });
            const btn = card.querySelector('.continue-btn');
            if (btn) btn.addEventListener('click', () => openCourse(course.id));
            homeScreen.appendChild(card);
        }
        applyTranslations();
    }

    function initHomeFilters() {
        const searchInput = document.getElementById('courseSearchInput');
        const levelChips = document.querySelectorAll('#levelChips .chip');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                currentSearchTerm = searchInput.value;
                renderCourseCards();
            }, 300));
        }
        
        if (levelChips.length) {
            levelChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const level = chip.dataset.level;
                    currentLevelFilter = level;
                    
                    levelChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    
                    renderCourseCards();
                });
            });
        }
    }

    // ========== INICIALIZAÇÃO COM DETECÇÃO AUTOMÁTICA DE IDIOMA ==========
    const savedLang = localStorage.getItem('selectedLanguage');
    let initialLang;
    
    if (savedLang) {
        initialLang = savedLang;
        console.log('[Main] Idioma carregado do localStorage:', initialLang);
    } else {
        initialLang = detectSystemLanguage();
        console.log('[Main] Idioma detectado automaticamente:', initialLang);
        localStorage.setItem('selectedLanguage', initialLang);
    }
    
    if (initialLang !== 'pt-br' && initialLang !== 'en') {
        initialLang = 'en';
        console.log('[Main] Idioma inválido, usando padrão: en');
    }
    
    console.log('[Main] Idioma final para inicialização:', initialLang);
    await setLanguage(initialLang);
    
    if (Object.keys(translations).length === 0) {
        console.warn('[i18n] Traduções não carregadas, tentando novamente...');
        await setLanguage(initialLang);
    }
    
    await renderCourseCards();
    initHomeFilters();
    applyTranslations();

    const backToHomeBtn = document.getElementById("backToHomeBtn");
    if (backToHomeBtn) backToHomeBtn.addEventListener("click", backToHome);
    const prevVideoBtn = document.getElementById("prevVideoBtn");
    if (prevVideoBtn) prevVideoBtn.addEventListener("click", prevVideo);
    const nextVideoBtn = document.getElementById("nextVideoBtn");
    if (nextVideoBtn) nextVideoBtn.addEventListener("click", nextVideo);
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlayPause);
    const markWatchedBtn = document.getElementById("markWatchedBtn");
    if (markWatchedBtn) markWatchedBtn.addEventListener("click", markCurrentVideoWatched);
    const videoProgressBar = document.getElementById("videoProgressBar");
    if (videoProgressBar) videoProgressBar.addEventListener("click", (e) => {
        const currentVideo = lessons[currentLessonId]?.videos[currentVideoInLesson];
        if (currentVideo && (currentVideo.type === 'external' || currentVideo.type === 'exercise')) return;
        if (!player || !isPlayerReady) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const seek = percent * currentVideoDuration;
        player.seekTo(seek, true);
    });

    // Controle de Volume
    const muteUnmuteBtn = document.getElementById('muteUnmuteBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeControlDiv = document.getElementById('volumeControl');

    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const vol = parseInt(e.target.value, 10);
            playerVolume = vol;
            if (player && isPlayerReady) {
                player.setVolume(vol);
                if (vol === 0) {
                    muteUnmuteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
                } else {
                    muteUnmuteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
                }
            }
            localStorage.setItem(VOLUME_STORAGE_KEY, vol);
        });
    }

    if (muteUnmuteBtn) {
        muteUnmuteBtn.addEventListener('click', () => {
            if (!player || !isPlayerReady) return;
            if (player.isMuted()) {
                player.unMute();
                const currentVol = player.getVolume();
                volumeSlider.value = currentVol;
                playerVolume = currentVol;
                muteUnmuteBtn.innerHTML = currentVol === 0 ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
                localStorage.setItem(VOLUME_STORAGE_KEY, currentVol);
            } else {
                player.mute();
                muteUnmuteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            }
        });
    }

    loadSavedVolume();

    window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
    if (typeof YT !== 'undefined' && YT.loaded) onYouTubeIframeAPIReady();
    initTabs();
    bindNotificationPositionUpdates();
});

// ========== MODAL DE CONCLUSÃO ==========
window.showFinalCompletionModal = async function(courseId, courseName, folderPath) {
    const modal = document.getElementById('finalCompletionModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.close-final-modal');
    const goHomeBtn = document.getElementById('btnFinalGoHome');
    const modalText = document.getElementById('finalCompletionText');
    const modalImage = document.getElementById('finalCompletionImage');
    const modalTitle = modal.querySelector('.final-modal-header h2');
    function closeModal() {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }
    let completionData = {};
    try {
        const response = await fetch('cursos/course-completion-data.json');
        if (response.ok) completionData = await response.json();
    } catch (error) {}
    const courseData = completionData[courseId] || {};
    let text = courseData.text || `Parabéns por concluir o curso ${courseName}! Continue sua jornada acadêmica.`;
    if (modalText) modalText.innerText = text;
    let imageUrl = courseData.image || 'https://placehold.co/400x200/1F2933/9CA3AF?text=Parabéns!';
    if (modalImage) modalImage.src = imageUrl;
    if (modalTitle) modalTitle.innerText = 'Parabéns!';
    let level = courseData.level;
    if (!level) {
        if (folderPath && folderPath.includes('graduacao')) level = 'graduacao';
        else if (folderPath && folderPath.includes('pos-graduacao')) level = 'pos-graduacao';
        else if (folderPath && folderPath.includes('ensino-medio')) level = 'ensino-medio';
        else level = 'graduacao';
    }
    let buttonText = 'Ir para Graduação';
    if (level === 'graduacao') buttonText = 'Ir para Pós-Graduação';
    else if (level === 'pos-graduacao') buttonText = 'Ir para Outra Pós-Graduação';
    else if (level === 'ensino-medio') buttonText = 'Ir para Graduação';
    if (goHomeBtn) {
        goHomeBtn.innerText = buttonText;
        goHomeBtn.onclick = () => { window.location.href = 'index.html'; };
    }
    if (closeBtn) closeBtn.onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeModal();
            document.removeEventListener('keydown', escHandler);
        }
    });
    modal.style.display = 'flex';
    modal.offsetHeight;
    modal.classList.add('show');
};