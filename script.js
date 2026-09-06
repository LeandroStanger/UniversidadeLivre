// script.js – Versão 28.0 – COMPLETO COM CORREÇÕES E LOGS
// ================================================================
// CORREÇÃO: Não sobrescreve window.t, window.setLanguage, window.applyTranslations
// CORREÇÃO: Usa i18n central para traduções com fallback
// CORREÇÃO: Carregamento assíncrono sequencial (i18n → courses → render)
// CORREÇÃO: Logs detalhados para depuração
// CORREÇÃO: Tratamento de erros robusto
// CORREÇÃO: Fallback para perfil se openProfileModal não existir
// CORREÇÃO: Slider com loop infinito e preview lateral
// CORREÇÃO: Todos os cursos com imagem de fallback via placehold.co

document.addEventListener('DOMContentLoaded', async () => {
    'use strict';

attachDisciplineQuizModalHandlers();
document.getElementById('finalExamBtn')?.addEventListener('click', openFinalExam);
console.log('[Main] Inicializando script.js v28.0...');

    // ========== LIMPEZA DE DADOS GLOBAIS ==========
    if (localStorage.getItem('currentLesson') !== null) localStorage.removeItem('currentLesson');
    if (localStorage.getItem('currentStep') !== null) localStorage.removeItem('currentStep');

    // ========== VARIÁVEL DE CONTROLE PARA RENDERIZAÇÃO ==========
    let _renderingCourses = false;
    let _progressJustHit100 = false;

    // ========== INICIALIZAR CURSOR TIMESET ==========
    if (window.CursorTimeset && typeof window.CursorTimeset.initialize === 'function') {
        window.CursorTimeset.initialize();
        console.log('[Main] CursorTimeset inicializado com sucesso');
    }

    // ========== TIMESET (TIMESTAMP) ==========
    function generateTimeSet() {
        return new Date().toISOString();
    }

    // ========== FUNÇÃO DE TRADUÇÃO (usa window.t do i18n central com fallback) ==========
    function t(key, replacements = {}) {
        if (window.t && typeof window.t === 'function') {
            try {
                return window.t(key, replacements);
            } catch (e) { /* fallback */ }
        }
        // Fallback mínimo
        let text = key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== OBTÉM IDIOMA ATUAL (usa i18n central) ==========
    function getCurrentLanguage() {
        if (window.getCurrentLanguage && typeof window.getCurrentLanguage === 'function') {
            return window.getCurrentLanguage();
        }
        return localStorage.getItem('selectedLanguage') || 'pt-br';
    }

    // ========== MAPA DE NOMES DE CURSOS TRADUZIDOS ==========
    const COURSE_NAMES = {
        'administracao': { pt: 'Administração', en: 'Administration' },
        'biologia': { pt: 'Biologia', en: 'Biology' },
        'ciencia_de_dados': { pt: 'Ciência de Dados', en: 'Data Science' },
        'ciencia-de-dados-bacharelado': { pt: 'Ciência de Dados (Bacharelado)', en: 'Data Science (Bachelor)' },
        'computacao': { pt: 'Ciência da Computação', en: 'Computer Science' },
        'computacao_grafica': { pt: 'Computação Gráfica', en: 'Computer Graphics' },
        'computer-science': { pt: 'Computer Science', en: 'Computer Science' },
        'cybersecurity': { pt: 'CyberSecurity', en: 'CyberSecurity' },
        'desenvolvimento_web': { pt: 'Desenvolvimento Web', en: 'Web Development' },
        'devops': { pt: 'DevOps', en: 'DevOps' },
        'embarcados': { pt: 'Embarcados', en: 'Embedded Systems' },
        'enem': { pt: 'ENEM', en: 'ENEM' },
        'engenharia_computacao': { pt: 'Engenharia de Computação', en: 'Computer Engineering' },
        'engenharia-producao': { pt: 'Engenharia de Produção', en: 'Production Engineering' },
        'espanhol': { pt: 'Espanhol', en: 'Spanish' },
        'espanhol-ingles': { pt: 'Espanhol (para falantes de inglês)', en: 'Spanish (for English Speakers)' },
        'espcex': { pt: 'EsPCEx', en: 'EsPCEx' },
        'fisica': { pt: 'Física', en: 'Physics' },
        'gestao-publica': { pt: 'Gestão Pública', en: 'Public Management' },
        'ingles': { pt: 'Inglês', en: 'English' },
        'japones': { pt: 'Japonês', en: 'Japanese' },
        'japones-ingles': { pt: 'Japonês (para falantes de inglês)', en: 'Japanese (for English Speakers)' },
        'letras': { pt: 'Letras', en: 'Letters' },
        'letras-portugues': { pt: 'Letras – Habilitação em Língua Portuguesa', en: 'Portuguese Language and Literature' },
        'matematica': { pt: 'Matemática', en: 'Mathematics' },
        'matematica-licenciatura': { pt: 'Matemática (Licenciatura)', en: 'Mathematics (Teaching Degree)' },
        'math': { pt: 'Math', en: 'Math' },
        'pedagogia': { pt: 'Pedagogia', en: 'Pedagogy' },
        'portugues-brasileiro': { pt: 'Português Brasileiro', en: 'Brazilian Portuguese' },
        'processos-gerenciais': { pt: 'Processos Gerenciais', en: 'Management Processes' },
        'quimica': { pt: 'Química', en: 'Chemistry' },
        'tecnologia-informacao': { pt: 'Tecnologia da Informação', en: 'Information Technology' }
    };

    function getCourseName(courseId) {
        const nameObj = COURSE_NAMES[courseId];
        if (!nameObj) return courseId;
        const lang = getCurrentLanguage();
        return nameObj[lang] || nameObj.pt || courseId;
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
    let courseNoteQuill = null;
    const courseNotePalette = [
        '#F5F9FF', '#B0C4DE', '#7A94B8', '#38BDF8',
        '#6C8CFF', '#10B981', '#14B8A6', '#FBBF24',
        '#FB7185', '#F97316', '#A78BFA', '#070B14'
    ];

    // ========== CONTROLE DE VOLUME ==========
    let playerVolume = 80;
    const VOLUME_STORAGE_KEY = 'youtube_player_volume';

    function loadSavedVolume() {
        const saved = localStorage.getItem(VOLUME_STORAGE_KEY);
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            playerVolume = isNaN(parsed) ? 80 : parsed;
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
    function debounce(func, wait) { let timeout; return function(...args) { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); }; }

    // ========== CARGA HORÁRIA DOS CURSOS ==========
    const courseDurationCache = new Map();

    async function computeCourseTotalMinutes(courseId) {
        if (courseDurationCache.has(courseId)) return courseDurationCache.get(courseId);
        const courseMap = {
            administracao: 'cursos/graduacao/administracao/administracao-data.json',
            biologia: 'cursos/graduacao/biologia/biologia-data.json',
            computacao: 'cursos/graduacao/ciencia-computacao/ciencia-computacao-data.json',
            matematica: 'cursos/graduacao/matematica/matematica-data.json',
            'matematica-licenciatura': 'cursos/graduacao/matematica-licenciatura/matematica-licenciatura-data.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/computacao-grafica-data.json',
            embarcados: 'cursos/pos-graduacao/embarcados/embarcados-data.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/desenvolvimento-web-data.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/cybersecurity-data.json',
            devops: 'cursos/pos-graduacao/devops/devops-data.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/ciencia-de-dados-data.json',
            'ciencia-de-dados-bacharelado': 'cursos/graduacao/ciencia-de-dados/ciencia-de-dados-bacharelado-data.json',
            'computer-science': 'cursos/graduacao/computer-science/computer-science-data.json',
            'math': 'cursos/graduacao/math/math-data.json',
            'enem': 'cursos/ensino-medio/enem/enem-data.json',
            'espcex': 'cursos/ensino-medio/espcex/espcex-data.json',
            'ingles': 'cursos/idiomas/ingles/ingles-data.json',
            'espanhol': 'cursos/idiomas/espanhol/espanhol-data.json',
            'espanhol-ingles': 'cursos/idiomas/espanhol-ingles/espanhol-ingles-data.json',
            'japones': 'cursos/idiomas/japones/japones-data.json',
            'portugues-brasileiro': 'cursos/idiomas/portugues-brasileiro/portugues-brasileiro-data.json',
            'japones-ingles': 'cursos/idiomas/japones-ingles/japones-ingles-data.json',
            'engenharia_computacao': 'cursos/graduacao/engenharia-computacao/engenharia-computacao-data.json',
            'engenharia-producao': 'cursos/graduacao/engenharia-producao/engenharia-producao-data.json',
            'letras': 'cursos/graduacao/letras/letras-data.json',
            'letras-portugues': 'cursos/graduacao/letras-portugues/letras-portugues-data.json',
            'pedagogia': 'cursos/graduacao/pedagogia/pedagogia-data.json',
            'gestao-publica': 'cursos/graduacao/gestao-publica/gestao-publica-data.json',
            'tecnologia-informacao': 'cursos/graduacao/tecnologia-informacao/tecnologia-informacao-data.json',
            'processos-gerenciais': 'cursos/graduacao/processos-gerenciais/processos-gerenciais-data.json',
            'fisica': 'cursos/graduacao/fisica/fisica-data.json',
            'quimica': 'cursos/graduacao/quimica/quimica-data.json'
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
                            const duration = 10 + (idx % 25) + 5;
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
        notification.style.cssText = `
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-left: 4px solid ${type === 'success' ? '#10b981' : '#6C8CFF'};
            border-radius: 16px;
            padding: 16px 24px;
            box-shadow: var(--card-shadow), var(--shadow-glow);
            color: var(--text-primary);
            font-size: 1rem;
            font-weight: 500;
            min-width: 320px;
            max-width: 420px;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                        opacity 0.3s ease;
            border: 1px solid var(--border);
        `;
        container.appendChild(notification);
        void notification.offsetHeight;
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
        setTimeout(() => {
            notification.style.transform = 'translateX(120%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 400);
        }, 4000);
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

    // ========== IMAGENS DOS CURSOS (SIMPLIFICADO) ==========
    function getCourseImagePath(courseId) {
        const folderMap = {
            administracao: 'cursos/graduacao/administracao/',
            biologia: 'cursos/graduacao/biologia/',
            computacao: 'cursos/graduacao/ciencia-computacao/',
            matematica: 'cursos/graduacao/matematica/',
            'matematica-licenciatura': 'cursos/graduacao/matematica-licenciatura/',
            'ciencia-de-dados-bacharelado': 'cursos/graduacao/ciencia-de-dados/',
            'computer-science': 'cursos/graduacao/computer-science/',
            'math': 'cursos/graduacao/math/',
            'computacao_grafica': 'cursos/pos-graduacao/computacao-grafica/',
            'embarcados': 'cursos/pos-graduacao/embarcados/',
            'desenvolvimento_web': 'cursos/pos-graduacao/desenvolvimento-web/',
            'cybersecurity': 'cursos/pos-graduacao/cybersecurity/',
            'devops': 'cursos/pos-graduacao/devops/',
            'ciencia_de_dados': 'cursos/pos-graduacao/ciencia-de-dados/',
            'enem': 'cursos/ensino-medio/enem/',
            'espcex': 'cursos/ensino-medio/espcex/',
            'ingles': 'cursos/idiomas/ingles/',
            'espanhol': 'cursos/idiomas/espanhol/',
            'espanhol-ingles': 'cursos/idiomas/espanhol-ingles/',
            'japones': 'cursos/idiomas/japones/',
            'portugues-brasileiro': 'cursos/idiomas/portugues-brasileiro/',
            'japones-ingles': 'cursos/idiomas/japones-ingles/',
            'engenharia_computacao': 'cursos/graduacao/engenharia-computacao/',
            'engenharia-producao': 'cursos/graduacao/engenharia-producao/',
            'letras': 'cursos/graduacao/letras/',
            'letras-portugues': 'cursos/graduacao/letras-portugues/',
            'pedagogia': 'cursos/graduacao/pedagogia/',
            'gestao-publica': 'cursos/graduacao/gestao-publica/',
            'tecnologia-informacao': 'cursos/graduacao/tecnologia-informacao/',
            'processos-gerenciais': 'cursos/graduacao/processos-gerenciais/',
            'fisica': 'cursos/graduacao/fisica/',
            'quimica': 'cursos/graduacao/quimica/'
        };
        const basePath = folderMap[courseId] || '';
        if (basePath) {
            return `${basePath}imagen-card.png`;
        }
        return null;
    }

    // ========== CARREGAMENTO DE DADOS ==========
    async function loadCourseData(courseId) {
        const courseMap = {
            administracao: 'cursos/graduacao/administracao/administracao-data.json',
            biologia: 'cursos/graduacao/biologia/biologia-data.json',
            computacao: 'cursos/graduacao/ciencia-computacao/ciencia-computacao-data.json',
            matematica: 'cursos/graduacao/matematica/matematica-data.json',
            'matematica-licenciatura': 'cursos/graduacao/matematica-licenciatura/matematica-licenciatura-data.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/computacao-grafica-data.json',
            embarcados: 'cursos/pos-graduacao/embarcados/embarcados-data.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/desenvolvimento-web-data.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/cybersecurity-data.json',
            devops: 'cursos/pos-graduacao/devops/devops-data.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/ciencia-de-dados-data.json',
            'ciencia-de-dados-bacharelado': 'cursos/graduacao/ciencia-de-dados/ciencia-de-dados-bacharelado-data.json',
            'computer-science': 'cursos/graduacao/computer-science/computer-science-data.json',
            'math': 'cursos/graduacao/math/math-data.json',
            'enem': 'cursos/ensino-medio/enem/enem-data.json',
            'espcex': 'cursos/ensino-medio/espcex/espcex-data.json',
            'ingles': 'cursos/idiomas/ingles/ingles-data.json',
            'espanhol': 'cursos/idiomas/espanhol/espanhol-data.json',
            'espanhol-ingles': 'cursos/idiomas/espanhol-ingles/espanhol-ingles-data.json',
            'japones': 'cursos/idiomas/japones/japones-data.json',
            'portugues-brasileiro': 'cursos/idiomas/portugues-brasileiro/portugues-brasileiro-data.json',
            'japones-ingles': 'cursos/idiomas/japones-ingles/japones-ingles-data.json',
            'engenharia_computacao': 'cursos/graduacao/engenharia-computacao/engenharia-computacao-data.json',
            'engenharia-producao': 'cursos/graduacao/engenharia-producao/engenharia-producao-data.json',
            'letras': 'cursos/graduacao/letras/letras-data.json',
            'letras-portugues': 'cursos/graduacao/letras-portugues/letras-portugues-data.json',
            'pedagogia': 'cursos/graduacao/pedagogia/pedagogia-data.json',
            'gestao-publica': 'cursos/graduacao/gestao-publica/gestao-publica-data.json',
            'tecnologia-informacao': 'cursos/graduacao/tecnologia-informacao/tecnologia-informacao-data.json',
            'processos-gerenciais': 'cursos/graduacao/processos-gerenciais/processos-gerenciais-data.json',
            'fisica': 'cursos/graduacao/fisica/fisica-data.json',
            'quimica': 'cursos/graduacao/quimica/quimica-data.json'
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
            return null;
        }
    }

    // ========== RENDERIZAÇÃO DA PÁGINA INICIAL ==========
    async function createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card animate-in';
        card.dataset.course = course.id;

        const imagePath = getCourseImagePath(course.id);
        const imageUrl = imagePath || `https://placehold.co/600x300/1A2638/6C8CFF?text=${encodeURIComponent(course.name)}`;

        const totalMinutes = await computeCourseTotalMinutes(course.id);
        const durationText = totalMinutes > 0 ? `<div class="course-duration"><i class="fas fa-clock"></i> ${t('course_hours_estimated')}: ${formatDuration(totalMinutes)}</div>` : '';

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

        let levelText = '';
        let typeText = '';
        if (course.courseLevel === 'graduacao') levelText = t('graduacao');
        else if (course.courseLevel === 'pos-graduacao') levelText = t('pos_graduacao');
        else if (course.courseLevel === 'ensino-medio') levelText = t('ensino_medio');
        else if (course.courseLevel === 'idiomas') levelText = t('idiomas');

        if (course.courseType === 'bacharelado') typeText = t('bacharelado');
        else if (course.courseType === 'licenciatura') typeText = t('licenciatura');
        else if (course.courseType === 'tecnologo') typeText = t('tecnologo');

        const levelBadge = levelText ? `<span class="badge badge-course-level">${escapeHtml(levelText)}</span>` : '';
        const typeBadge = typeText ? `<span class="badge badge-course-type">${escapeHtml(typeText)}</span>` : '';
        const roomHtml = course.room ? `<div class="course-room"><i class="fas fa-door-open"></i> Sala: ${escapeHtml(course.room)}</div>` : '';

        card.innerHTML = `
            <div class="course-image-wrapper">
                <img class="course-image" src="${imageUrl}" alt="${escapeHtml(course.name)}" 
                     onerror="this.src='https://placehold.co/600x300/1A2638/6C8CFF?text=${encodeURIComponent(course.name)}'">
            </div>
            <h2>${escapeHtml(course.name)}</h2>
            <div class="course-badges">${levelBadge}${typeBadge}</div>
            ${roomHtml}
            <p class="course-description" style="overflow: visible; -webkit-line-clamp: unset;">${escapeHtml(course.description)}</p>
            ${durationText}
            <div class="course-progress-bar">
                <div class="course-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <p>${t('course_progress')} <span class="course-progress-percent">${progressPercent}%</span></p>
            <button class="continue-btn" data-course="${course.id}" data-i18n="${buttonKey}">${t(buttonKey)}</button>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('continue-btn')) {
                openCourse(course.id);
            }
        });
        const btn = card.querySelector('.continue-btn');
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openCourse(course.id);
            });
        }
        card.classList.add('visible');
        return card;
    }

    // ========== CARREGAR CURSOS ==========
    async function loadCourses() {
        console.log('[loadCourses] Iniciando carregamento de courses.json...');
        try {
            const response = await fetch('cursos/courses.json');
            if (!response.ok) {
                console.error('[loadCourses] HTTP error:', response.status);
                throw new Error(`Erro HTTP ${response.status}`);
            }
            const parsedCourses = await response.json();
            if (!Array.isArray(parsedCourses) ||
                !parsedCourses.every(course => course && typeof course.id === 'string' && course.id.trim() &&
                    typeof course.name === 'string' && course.name.trim())) {
                throw new Error('Estrutura inválida em courses.json');
            }
            allCourses = parsedCourses;
            console.log('[loadCourses] Cursos carregados:', allCourses.length);
            return true;
        } catch (error) {
            console.error('[loadCourses] Erro ao carregar cursos:', error);
            allCourses = [];
            return false;
        }
    }

    // ========== RENDERIZAR CURSOS ==========
    const debouncedRenderCourseCards = debounce(renderCourseCards, 200);

    async function renderCourseCards() {
        if (_renderingCourses) {
            console.log('[renderCourseCards] Já em execução, ignorando.');
            return;
        }
        _renderingCourses = true;
        console.log('[renderCourseCards] Iniciando renderização...');

        const container = document.getElementById('carouselContainer');
        if (!container) {
            console.error('[renderCourseCards] #carouselContainer não encontrado');
            _renderingCourses = false;
            return;
        }

        container.innerHTML = '';

        if (allCourses.length === 0) {
            console.warn('[renderCourseCards] Nenhum curso carregado, tentando recarregar...');
            const loaded = await loadCourses();
            if (!loaded || allCourses.length === 0) {
                container.innerHTML = `<p class="error">${t('error_load_courses')}</p>`;
                _renderingCourses = false;
                return;
            }
        }

        // Filtros
        const searchTerm = document.getElementById('courseSearchInput')?.value?.trim().toLowerCase() || '';
        const normalizedSearch = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const scopeFilter = document.querySelector('#scopeChips .chip.active')?.dataset.scope || 'all';
        const levelFilter = document.querySelector('#levelChips .chip.active')?.dataset.level || 'all';

        let filteredCourses = allCourses.filter(course => {
            if (scopeFilter === 'my-courses' && !isCourseTrackedInProgress(course.id)) return false;
            if (levelFilter !== 'all' && course.courseLevel !== levelFilter) return false;
            if (searchTerm) {
                const name = (course.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const desc = (course.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                if (!name.includes(normalizedSearch) && !desc.includes(normalizedSearch)) return false;
            }
            return true;
        });

        const levels = ['ensino-medio', 'graduacao', 'pos-graduacao', 'idiomas'];
        const grouped = {};
        levels.forEach(level => { grouped[level] = []; });
        filteredCourses.forEach(course => {
            if (grouped[course.courseLevel]) {
                grouped[course.courseLevel].push(course);
            }
        });

        const activeLevels = levelFilter === 'all' ? levels : [levelFilter];
        let hasCourses = false;

        for (const level of activeLevels) {
            const courses = grouped[level] || [];
            if (courses.length === 0) continue;
            hasCourses = true;

            const useCarousel = (levelFilter === 'all' || level === 'graduacao' || level === 'ensino-medio');

            if (level === 'graduacao' && levelFilter === 'graduacao') {
                const tipos = ['bacharelado', 'licenciatura', 'tecnologo'];
                const tipoMap = {
                    'bacharelado': 'Bacharelado',
                    'licenciatura': 'Licenciatura',
                    'tecnologo': 'Tecnólogo'
                };
                const groupedByType = {};
                tipos.forEach(t => groupedByType[t] = []);
                courses.forEach(course => {
                    const type = course.courseType || 'bacharelado';
                    if (groupedByType[type]) {
                        groupedByType[type].push(course);
                    } else {
                        groupedByType['bacharelado'].push(course);
                    }
                });

                for (const type of tipos) {
                    const typeCourses = groupedByType[type] || [];
                    if (typeCourses.length === 0) continue;
                    const typeLabel = tipoMap[type] || type;

                    const carouselWrapper = document.createElement('div');
                    carouselWrapper.className = 'carousel-wrapper';

                    const title = document.createElement('h3');
                    title.className = 'carousel-title';
                    title.textContent = typeLabel;
                    carouselWrapper.appendChild(title);

                    const carouselContainer = document.createElement('div');
                    carouselContainer.className = 'carousel-container';
                    carouselContainer.id = 'carousel-' + level + '_' + type;

                    const track = document.createElement('div');
                    track.className = 'carousel-track';

                    const cards = [];
                    for (const course of typeCourses) {
                        const card = await createCourseCard(course);
                        if (card) cards.push(card);
                    }

                    const slide = document.createElement('div');
                    slide.className = 'carousel-slide';
                    for (const card of cards) {
                        slide.appendChild(card);
                    }
                    track.appendChild(slide);

                    carouselContainer.appendChild(track);

                    const prevBtn = document.createElement('button');
                    prevBtn.className = 'carousel-btn prev';
                    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'carousel-btn next';
                    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                    carouselContainer.appendChild(prevBtn);
                    carouselContainer.appendChild(nextBtn);

                    const dotsContainer = document.createElement('div');
                    dotsContainer.className = 'carousel-dots';
                    const dot = document.createElement('span');
                    dot.className = 'carousel-dot active';
                    dot.dataset.index = 0;
                    dotsContainer.appendChild(dot);
                    carouselContainer.appendChild(dotsContainer);

                    prevBtn.style.display = 'none';
                    nextBtn.style.display = 'none';
                    dotsContainer.style.display = 'none';

                    carouselWrapper.appendChild(carouselContainer);
                    container.appendChild(carouselWrapper);
                }
                continue;
            }

            if (useCarousel) {
                const carouselWrapper = document.createElement('div');
                carouselWrapper.className = 'carousel-wrapper';

                const title = document.createElement('h3');
                title.className = 'carousel-title';
                const levelName = {
                    'ensino-medio': t('ensino_medio'),
                    'graduacao': t('graduacao'),
                    'pos-graduacao': t('pos_graduacao'),
                    'idiomas': t('idiomas')
                }[level] || level;
                title.textContent = levelName;
                carouselWrapper.appendChild(title);

                const carouselContainer = document.createElement('div');
                carouselContainer.className = 'carousel-container';
                carouselContainer.id = 'carousel-' + level;

                const track = document.createElement('div');
                track.className = 'carousel-track';

                const cards = [];
                for (const course of courses) {
                    const card = await createCourseCard(course);
                    if (card) cards.push(card);
                }

                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                for (const card of cards) {
                    slide.appendChild(card);
                }
                track.appendChild(slide);

                carouselContainer.appendChild(track);

                const prevBtn = document.createElement('button');
                prevBtn.className = 'carousel-btn prev';
                prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
                const nextBtn = document.createElement('button');
                nextBtn.className = 'carousel-btn next';
                nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
                carouselContainer.appendChild(prevBtn);
                carouselContainer.appendChild(nextBtn);

                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'carousel-dots';
                const dot = document.createElement('span');
                dot.className = 'carousel-dot active';
                dot.dataset.index = 0;
                dotsContainer.appendChild(dot);
                carouselContainer.appendChild(dotsContainer);

                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
                dotsContainer.style.display = 'none';

                carouselWrapper.appendChild(carouselContainer);
                container.appendChild(carouselWrapper);

            } else {
                const sectionTitle = document.createElement('h3');
                sectionTitle.className = 'section-title';
                const levelName = {
                    'ensino-medio': t('ensino_medio'),
                    'graduacao': t('graduacao'),
                    'pos-graduacao': t('pos_graduacao'),
                    'idiomas': t('idiomas')
                }[level] || level;
                sectionTitle.textContent = levelName;
                container.appendChild(sectionTitle);

                const gridWrapper = document.createElement('div');
                gridWrapper.className = 'simple-grid';
                gridWrapper.style.marginBottom = '2rem';

                for (const course of courses) {
                    const card = await createCourseCard(course);
                    if (card) {
                        card.classList.remove('animate-in');
                        card.style.opacity = '1';
                        card.style.transform = 'none';
                        gridWrapper.appendChild(card);
                    }
                }

                container.appendChild(gridWrapper);
            }
        }

        if (!hasCourses) {
            container.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>${t('no_courses_found')}</p></div>`;
        }

        _renderingCourses = false;
        console.log('[renderCourseCards] Renderização concluída.');
    }

    function isCourseTrackedInProgress(courseId) {
        if (!courseId) return false;

        const completedKey = `course_completed_${courseId}`;
        if (localStorage.getItem(completedKey) === 'true') {
            return true;
        }

        const saved = localStorage.getItem(`ulivre_course_${courseId}`);
        if (!saved) return false;

        try {
            const data = JSON.parse(saved);
            const watchedMap = Array.isArray(data?.watchedMap) ? data.watchedMap : [];
            const watchedCount = watchedMap.filter(Boolean).length;
            return watchedCount > 0 && watchedMap.length > 0;
        } catch (error) {
            return false;
        }
    }

    // ========== FILTROS DA PÁGINA INICIAL ==========
    function initHomeFilters() {
        const searchInput = document.getElementById('courseSearchInput');
        const scopeChips = document.querySelectorAll('#scopeChips .chip');
        const levelChips = document.querySelectorAll('#levelChips .chip');

        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                renderCourseCards();
            }, 300));
        }

        if (scopeChips.length) {
            scopeChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    scopeChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    renderCourseCards();
                });
            });
        }

        if (levelChips.length) {
            levelChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    levelChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    renderCourseCards();
                });
            });
        }
    }

    // ========== SLIDER ALEATÓRIO COM LOOP INFINITO E PREVIEW LATERAL ==========
    const ALL_SLIDES = [
        { course: 'enem', img: 'slides/ENEM.png', title: 'ENEM', desc: 'Preparação completa para o Exame Nacional do Ensino Médio' },
        { course: 'engenharia_computacao', img: 'slides/Engenharia de Computação.png', title: 'Engenharia de Computação', desc: 'Hardware, software, sistemas embarcados e automação' },
        { course: 'administracao', img: 'slides/Administração.png', title: 'Administração', desc: 'Gestão de pessoas, finanças, marketing e estratégia' },
        { course: 'engenharia-producao', img: 'slides/Engenharia de Produção.png', title: 'Engenharia de Produção', desc: 'Otimização de processos, logística, qualidade e sustentabilidade' },
        { course: 'gestao-publica', img: 'slides/Gestão Pública.png', title: 'Gestão Pública', desc: 'Administração pública, políticas públicas, gestão financeira e ética' },
        { course: 'matematica', img: 'slides/Matemática.png', title: 'Matemática', desc: 'Raciocínio lógico, álgebra, cálculo e fundamentos matemáticos' },
        { course: 'pedagogia', img: 'slides/Pedagogia.png', title: 'Pedagogia', desc: 'Formação de educadores, gestão escolar e práticas pedagógicas' },
        { course: 'letras', img: 'slides/Letras.png', title: 'Letras', desc: 'Língua, literatura, linguística e ensino de português' },
        { course: 'biologia', img: 'slides/Biologia.png', title: 'Biologia', desc: 'Fundamentos biológicos, pedagogia e práticas para o ensino de ciências' },
        { course: 'computacao', img: 'slides/Ciência da Computação.png', title: 'Ciência da Computação', desc: 'Algoritmos, programação, sistemas e fundamentos da computação' },
        { course: 'ciencia-de-dados-bacharelado', img: 'slides/Ciência de Dados (Bacharelado).png', title: 'Ciência de Dados (Bacharelado)', desc: 'Programação, estatística, machine learning e análise de dados' },
        { course: 'computer-science', img: 'slides/Computer Science.png', title: 'Computer Science', desc: 'Full Computer Science curriculum in English' },
        { course: 'fisica', img: 'slides/Física.png', title: 'Física', desc: 'Fundamentos físicos, matemáticos e práticas para o ensino' },
        { course: 'letras-portugues', img: 'slides/Letras – Habilitação em Língua Portuguesa.png', title: 'Letras – Habilitação em Língua Portuguesa', desc: 'Linguística, literatura, gramática e ensino de português' },
        { course: 'matematica-licenciatura', img: 'slides/Matemática (Licenciatura).png', title: 'Matemática (Licenciatura)', desc: 'Formação pedagógica e aprofundamento em conteúdos matemáticos' },
        { course: 'math', img: 'slides/Mathematics.png', title: 'Mathematics', desc: 'Complete Mathematics curriculum in English' },
        { course: 'processos-gerenciais', img: 'slides/Processos Gerenciais.png', title: 'Processos Gerenciais', desc: 'Gestão de processos, pessoas, finanças e estratégia' },
        { course: 'quimica', img: 'slides/Química.png', title: 'Química', desc: 'Fundamentos químicos, pedagógicos e práticas para o ensino' },
        { course: 'tecnologia-informacao', img: 'slides/Tecnologia da Informação.png', title: 'Tecnologia da Informação', desc: 'Programação, sistemas, redes, segurança e gestão de TI' },
        { course: 'espcex', img: 'slides/EsPCEx.png', title: 'EsPCEx', desc: 'Preparação completa para o concurso da Escola Preparatória de Cadetes do Exército' },
        { course: 'ciencia_de_dados', img: 'slides/Ciência de Dados.png', title: 'Ciência de Dados (Pós)', desc: 'Análise de dados, estatística aplicada e reprodução de pesquisas' },
        { course: 'computacao_grafica', img: 'slides/Computação Gráfica.png', title: 'Computação Gráfica', desc: 'Renderização, modelagem, GPU, OpenGL e ray tracing' },
        { course: 'cybersecurity', img: 'slides/CyberSecurity.png', title: 'CyberSecurity', desc: 'Segurança cibernética, testes de invasão, engenharia reversa e conformidade' },
        { course: 'desenvolvimento_web', img: 'slides/Desenvolvimento Web.png', title: 'Desenvolvimento Web', desc: 'HTML, CSS, JavaScript, React, Node.js e TypeScript' },
        { course: 'devops', img: 'slides/DevOps.png', title: 'DevOps', desc: 'Automação, CI/CD, containers, orquestração e infraestrutura como código' },
        { course: 'embarcados', img: 'slides/Embarcados.png', title: 'Embarcados', desc: 'Microeletrônica, sistemas em tempo real, FPGA e IoT' },
        { course: 'portugues-brasileiro', img: 'slides/Brazilian Portuguese (for English Speakers).png', title: 'Brazilian Portuguese', desc: 'Complete Portuguese course from A1 to C2 for English speakers' },
        { course: 'espanhol', img: 'slides/Espanhol.png', title: 'Espanhol', desc: 'Curso completo do nível A1 ao C2 para falantes de português' },
        { course: 'ingles', img: 'slides/Inglês.png', title: 'Inglês', desc: 'Curso completo do nível A1 ao C2 para falantes de português' },
        { course: 'japones-ingles', img: 'slides/Japanese (for English Speakers).png', title: 'Japanese (for English Speakers)', desc: 'Complete Japanese course from zero to intermediate for English speakers' },
        { course: 'japones', img: 'slides/Japonês.png', title: 'Japonês', desc: 'Curso completo de japonês do zero com Hiragana, Katakana e prática com animes' },
        { course: 'espanhol-ingles', img: 'slides/Spanish (for English Speakers).png', title: 'Spanish (for English Speakers)', desc: 'Complete Spanish course from A1 to C2 for English speakers' }
    ];

    let sliderCurrentIndex = 0;
    let sliderInterval = null;
    const SLIDER_AUTO_PLAY_DELAY = 5000;
    const SLIDER_PEEK = 10;
    const SLIDER_SLIDE_WIDTH = 100 - 2 * SLIDER_PEEK;

    function getRandomSlides(count = 5) {
        const shuffled = [...ALL_SLIDES];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled.slice(0, count);
    }

    function createSlideElement(slide, index) {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'home-slide';
        slideDiv.dataset.course = slide.course;
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'home-slide-link';
        link.dataset.course = slide.course;
        const img = document.createElement('img');
        img.src = slide.img;
        img.alt = `${slide.title} - Universidade Livre`;
        img.loading = 'lazy';
        const overlay = document.createElement('div');
        overlay.className = 'home-slide-overlay';
        overlay.innerHTML = `<h3>${escapeHtml(slide.title)}</h3><p>${escapeHtml(slide.desc)}</p>`;
        link.appendChild(img);
        link.appendChild(overlay);
        slideDiv.appendChild(link);
        return slideDiv;
    }

    function renderRandomSlides() {
        const track = document.querySelector('.home-slider-track');
        if (!track) return;

        const originals = getRandomSlides(5);
        if (originals.length === 0) return;

        const slidesWithClones = [
            { ...originals[originals.length - 1], isClone: true, originalIndex: originals.length - 1 },
            ...originals.map((s, i) => ({ ...s, isClone: false, originalIndex: i })),
            { ...originals[0], isClone: true, originalIndex: 0 }
        ];

        track.innerHTML = '';
        slidesWithClones.forEach((slide, idx) => {
            const slideDiv = createSlideElement(slide, idx);
            if (slide.isClone) {
                slideDiv.classList.add('clone');
            }
            track.appendChild(slideDiv);
        });

        window._sliderClones = slidesWithClones;

        setupSlider();
        setupSliderLinks();
        goToSlide(1, true);
    }

    function goToSlide(index, instant = false) {
        const track = document.querySelector('.home-slider-track');
        if (!track) return;
        const slides = track.querySelectorAll('.home-slide');
        const totalVisual = slides.length;
        if (totalVisual === 0) return;

        if (index < 0) index = totalVisual - 1;
        if (index >= totalVisual) index = 0;

        const translate = SLIDER_PEEK - index * SLIDER_SLIDE_WIDTH;
        track.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        track.style.transform = `translateX(${translate}%)`;

        const realIndex = index - 1;
        const dots = document.querySelectorAll('.home-slider-dots .dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === realIndex));

        if (index === 0) {
            setTimeout(() => goToSlide(totalVisual - 2, true), 500);
        } else if (index === totalVisual - 1) {
            setTimeout(() => goToSlide(1, true), 500);
        }

        sliderCurrentIndex = index;
    }

    function nextSlide() {
        goToSlide(sliderCurrentIndex + 1);
    }

    function prevSlide() {
        goToSlide(sliderCurrentIndex - 1);
    }

    function startSliderAutoPlay() {
        if (sliderInterval) stopSliderAutoPlay();
        sliderInterval = setInterval(nextSlide, SLIDER_AUTO_PLAY_DELAY);
    }

    function stopSliderAutoPlay() {
        if (sliderInterval) {
            clearInterval(sliderInterval);
            sliderInterval = null;
        }
    }

    function setupSlider() {
        const track = document.querySelector('.home-slider-track');
        if (!track) return;
        const slides = track.querySelectorAll('.home-slide');
        if (slides.length === 0) return;

        const dotsContainer = document.querySelector('.home-slider-dots');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            const totalOriginals = slides.length - 2;
            for (let i = 0; i < totalOriginals; i++) {
                const dot = document.createElement('span');
                dot.className = 'dot' + (i === 0 ? ' active' : '');
                dot.dataset.index = i;
                dot.addEventListener('click', () => {
                    goToSlide(i + 1);
                });
                dotsContainer.appendChild(dot);
            }
        }

        const prevBtn = document.querySelector('.home-slider-prev');
        const nextBtn = document.querySelector('.home-slider-next');
        if (prevBtn) {
            const newPrev = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            newPrev.addEventListener('click', prevSlide);
        }
        if (nextBtn) {
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            newNext.addEventListener('click', nextSlide);
        }

        goToSlide(1, true);
        startSliderAutoPlay();

        const container = document.querySelector('.home-slider-container');
        if (container) {
            container.removeEventListener('mouseenter', stopSliderAutoPlay);
            container.removeEventListener('mouseleave', startSliderAutoPlay);
            container.addEventListener('mouseenter', stopSliderAutoPlay);
            container.addEventListener('mouseleave', startSliderAutoPlay);
        }
    }

    function setupSliderLinks() {
        const links = document.querySelectorAll('.home-slide-link');
        links.forEach(link => {
            link.removeEventListener('click', handleSlideClick);
            link.addEventListener('click', handleSlideClick);
        });
    }

    function handleSlideClick(e) {
        e.preventDefault();
        const courseId = this.dataset.course;
        if (courseId && typeof window.openCourse === 'function') {
            window.openCourse(courseId);
        } else {
            console.warn('[Slider] Curso não encontrado.');
        }
    }

    // ========== ABRIR CURSO ==========
    window.openCourse = async function(courseId) {
        if (!courseId) {
            console.error('[openCourse] courseId não fornecido');
            return;
        }
        console.log('[openCourse] Tentando abrir curso:', courseId);
        try {
            const courseData = await loadCourseData(courseId);
            if (!courseData) {
                console.error('[openCourse] Dados do curso não carregados para:', courseId);
                alert('Não foi possível carregar os dados do curso. Tente novamente.');
                return;
            }
            const courseInfo = allCourses.find(c => c.id === courseId);
            currentCourseDetails = courseInfo || { id: courseId, name: courseData.name, courseLevel: courseData.type === 'Bacharelado' ? 'graduacao' : (courseData.type === 'Pós-graduação' ? 'pos-graduacao' : 'ensino-medio') };
            currentCourse = courseId;
            window.UniversidadeLivreAnalytics?.course(courseId, currentCourseDetails.name || courseData.name);
            initCourse(courseData);
            const homeScreen = document.getElementById("homeScreen");
            const courseView = document.getElementById("courseView");
            const homeFilters = document.getElementById('homeFilters');
            const slider = document.getElementById('homeSlider');

            if (slider) {
                slider.style.display = 'none';
                stopSliderAutoPlay();
            }

            homeScreen.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            homeScreen.style.opacity = '0';
            homeScreen.style.transform = 'scale(0.96)';

            setTimeout(() => {
                homeScreen.style.display = 'none';
                if (homeFilters) homeFilters.style.display = 'none';

                courseView.style.display = 'block';
                courseView.style.opacity = '0';
                courseView.style.transform = 'translateY(24px)';
                courseView.classList.add('active');

                void courseView.offsetHeight;

                courseView.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                courseView.style.opacity = '1';
                courseView.style.transform = 'translateY(0)';
            }, 400);

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
            if (!currentDiscipline) {
                currentDiscipline = ensureCurrentDiscipline();
            }
            renderUnifiedCourseContent();
            expandCurrentLessonInUnifiedContent();
            renderCurrentLessonPanel();
            activeTab = 'bibliografia';
            activateTab('bibliografia');
            const introDisplayed = window.checkCourseIntro
                ? await window.checkCourseIntro(courseId)
                : false;
            if (introDisplayed) window.onIntroClosed = () => { startLesson(); window.onIntroClosed = null; };
            else startLesson();
            updateNotificationPosition();
            updatePracticeTabVisibility();
            renderProgressChart();
            setTimeout(() => {
                if (typeof window.applyTranslations === 'function') window.applyTranslations();
            }, 100);
        } catch (error) {
            console.error('[openCourse] Erro ao abrir curso:', error);
            alert('Ocorreu um erro ao abrir o curso. Tente novamente.');
        }
    };

    // ========== VOLTAR PARA HOME ==========
    function backToHome() {
        stopAllMedia();
        if (window.CursorTimeset) window.CursorTimeset.registerExit();

        const homeScreen = document.getElementById("homeScreen");
        const courseView = document.getElementById("courseView");
        const homeFilters = document.getElementById('homeFilters');
        const slider = document.getElementById('homeSlider');

        courseView.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        courseView.style.opacity = '0';
        courseView.style.transform = 'translateY(20px)';

        setTimeout(() => {
            courseView.classList.remove('active');
            courseView.style.display = 'none';
            courseView.style.opacity = '1';
            courseView.style.transform = 'translateY(0)';

            if (homeScreen) {
                homeScreen.style.display = 'flex';
                homeScreen.style.opacity = '0';
                homeScreen.style.transform = 'scale(0.96)';
                void homeScreen.offsetHeight;
                homeScreen.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                homeScreen.style.opacity = '1';
                homeScreen.style.transform = 'scale(1)';
            }
            if (homeFilters) {
                homeFilters.style.display = 'flex';
                homeFilters.style.flexDirection = 'column';
                homeFilters.style.gap = '1rem';
            }
            if (slider) {
                slider.style.display = 'block';
                renderRandomSlides();
                startSliderAutoPlay();
            }
        }, 400);

        if (updateInterval) clearInterval(updateInterval);
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
    }

    function resetProgressForNewCourse() {
        currentLessonId = 0;
        currentVideoInLesson = 0;
        allVideosFlat.forEach(v => v.watched = false);
        for (let i = 0; i < lessons.length; i++) { lessons[i].completed = false; lessons[i].unlocked = (i === 0); }
        notifiedDisciplines.clear();
    }

    function updatePracticeTabVisibility() {
        const practiceTab = document.getElementById('practiceTabBtn');
        if (!practiceTab) return;
        if (practiceTab.style.display !== 'inline-flex') {
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
        if (document.getElementById('profileModal') && document.getElementById('profileModal').style.display === 'flex') {
            if (window.updateProfileModal) window.updateProfileModal();
        }
        checkCourseCompletion();
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
        if (!currentCourse) return;
        const courseView = document.getElementById('courseView');
        if (!courseView || courseView.style.display !== 'block') return;
        if (!allVideosFlat || allVideosFlat.length === 0) return;
        if (localStorage.getItem(`course_completed_${currentCourse}`) === 'true' && getFinalExamState(currentCourse).passed) return;

        const total = allVideosFlat.length;
        const watched = allVideosFlat.filter(v => v.watched).length;
        const progressPercent = total ? Math.floor((watched / total) * 100) : 0;

        updateFinalExamButton();
        if (progressPercent >= 100 && areAllDisciplineExamsPassed() && getFinalExamState(currentCourse).passed && !_progressJustHit100) {
            _progressJustHit100 = true;
            localStorage.setItem(`course_completed_${currentCourse}`, 'true');
            if (window._completionPopupTriggered) return;
            window._completionPopupTriggered = true;

            const courseName = currentCourseDetails?.name || getCourseName(currentCourse);
            const folderPath = currentCourseFolder;
            if (window.showFinalCompletionModal) {
                window.showFinalCompletionModal(currentCourse, courseName, folderPath);
            }
        }
    }

    const DISCIPLINE_QUIZ_TIME_LIMIT_MS = 3 * 60 * 60 * 1000;
    const FINAL_EXAM_TIME_LIMIT_MS = 5 * 60 * 60 * 1000;
    const DISCIPLINE_PASS_PERCENT = 70;
    let activeDisciplineQuizTimer = null;

    function normalizeDisciplineKey(value) {
        return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
    }

    function getDisciplineExamStorageKey(courseId, disciplineName) {
        return `ulivre_discipline_exam_${courseId}_${normalizeDisciplineKey(disciplineName)}`;
    }

    function getDisciplineExamState(courseId, disciplineName) {
        if (!courseId || !disciplineName) return { passed: false, score: 0, total: 0, percent: 0, finishedAt: null, attempted: false };
        const raw = localStorage.getItem(getDisciplineExamStorageKey(courseId, disciplineName));
        if (!raw) return { passed: false, score: 0, total: 0, percent: 0, finishedAt: null, attempted: false };
        try {
            const parsed = JSON.parse(raw);
            return {
                passed: Boolean(parsed.passed),
                score: Number(parsed.score) || 0,
                total: Number(parsed.total) || 0,
                percent: Number(parsed.percent) || 0,
                finishedAt: parsed.finishedAt || null,
                attempted: Boolean(parsed.attempted),
                timeRemainingMs: Number(parsed.timeRemainingMs) || 0
            };
        } catch (error) {
            return { passed: false, score: 0, total: 0, percent: 0, finishedAt: null, attempted: false };
        }
    }

    function setDisciplineExamState(courseId, disciplineName, state) {
        if (!courseId || !disciplineName) return;
        localStorage.setItem(getDisciplineExamStorageKey(courseId, disciplineName), JSON.stringify(state));
    }

    function getCourseDisciplines() {
        const disciplines = [];
        (stagesData || []).forEach(stage => {
            (stage.disciplines || []).forEach(discipline => {
                if (discipline?.name) disciplines.push(discipline.name);
            });
        });
        return disciplines;
    }

    function areAllDisciplineExamsPassed() {
        const disciplines = getCourseDisciplines();
        return disciplines.length > 0 && disciplines.every(discipline => getDisciplineExamState(currentCourse, discipline).passed);
    }

    function getFinalExamStorageKey(courseId) {
        return `ulivre_final_exam_${courseId}`;
    }

    function getFinalExamState(courseId) {
        const fallback = { passed: false, score: 0, total: 0, percent: 0, attempted: false, finishedAt: null, timeLimitMs: FINAL_EXAM_TIME_LIMIT_MS, timeRemainingMs: 0 };
        if (!courseId) return fallback;
        try {
            const parsed = JSON.parse(localStorage.getItem(getFinalExamStorageKey(courseId)) || 'null');
            return parsed ? { ...fallback, ...parsed } : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function isFinalExamUserAuthenticated() {
        return localStorage.getItem('ulivre_authenticated_session') === 'true'
            && localStorage.getItem('ulivre_onboarding_complete') === 'true'
            && Boolean(localStorage.getItem('userProfileName')?.trim())
            && Boolean(localStorage.getItem('userMatricula')?.trim());
    }

    function getFinalQuestionCount(courseId, disciplineName) {
        const level = currentCourseDetails?.courseLevel;
        const normalized = normalizeDisciplineKey(disciplineName);
        if (courseId === 'enem') return 45;
        if (courseId === 'espcex') return /matematica|portugues|gramatica|literatura|interpretacao/.test(normalized) ? 20 : 12;
        if (level === 'pos-graduacao') return 8 + Math.floor(Math.random() * 3);
        if (level === 'idiomas') return 9;
        return 5 + Math.floor(Math.random() * 3);
    }

    function buildFinalExamQuestions(courseId, bank) {
        return getCourseDisciplines().flatMap(disciplineName => {
            const count = getFinalQuestionCount(courseId, disciplineName);
            if (!count) return [];
            const questions = findDisciplineQuestions(bank, disciplineName);
            return [...questions].sort(() => Math.random() - 0.5).slice(0, count).map(question => ({ ...question, finalDiscipline: disciplineName }));
        }).sort(() => Math.random() - 0.5);
    }

    function updateFinalExamButton() {
        const button = document.getElementById('finalExamBtn');
        if (!button || !currentCourse) return;
        const videosComplete = allVideosFlat?.length > 0 && allVideosFlat.every(video => video.watched);
        const eligible = isFinalExamUserAuthenticated() && videosComplete && areAllDisciplineExamsPassed();
        const finalState = getFinalExamState(currentCourse);
        button.disabled = !eligible || finalState.passed;
        button.classList.toggle('available', eligible && !finalState.passed);
        const label = button.querySelector('span');
        if (label) label.textContent = finalState.passed
            ? t('final_exam_passed')
            : eligible ? t('final_exam_available') : t('final_exam_locked');
    }

    function openFinalExam() {
        if (!isFinalExamUserAuthenticated()) {
            alert('Faça login no seu perfil e confirme sua matrícula antes de realizar a prova final.');
            return;
        }
        if (!currentCourse || !areAllDisciplineExamsPassed() || !allVideosFlat?.every(video => video.watched)) {
            alert('Conclua todas as disciplinas e seja aprovado em todas as provas para liberar a prova final.');
            return;
        }
        const modal = document.getElementById('disciplineQuizModal');
        const title = document.getElementById('disciplineQuizTitle');
        if (!modal || !title) return;
        loadCourseQuizBank(currentCourse).then(bank => {
            const questions = buildFinalExamQuestions(currentCourse, bank);
            if (!questions.length) {
                alert('Não há questões disponíveis para a prova final deste curso.');
                return;
            }
            const state = {
                finalExam: true,
                disciplineName: null,
                questions,
                currentIndex: 0,
                answers: new Array(questions.length).fill(null),
                startedAt: Date.now(),
                timeLimitMs: FINAL_EXAM_TIME_LIMIT_MS,
                timeRemainingMs: FINAL_EXAM_TIME_LIMIT_MS
            };
            title.textContent = `${currentCourseDetails?.name || getCourseName(currentCourse)} · Prova final`;
            modal.dataset.quizState = JSON.stringify(state);
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            startDisciplineQuizTimer();
            renderDisciplineQuizQuestion();
        });
    }

    function isDisciplinePassed(disciplineName) {
        const state = getDisciplineExamState(currentCourse, disciplineName);
        return Boolean(state.passed);
    }

    function isDisciplineUnlocked(disciplineName) {
        if (!stagesData || !Array.isArray(stagesData) || !disciplineName) return false;
        const flat = [];
        stagesData.forEach(stage => { (stage.disciplines || []).forEach(discipline => flat.push(discipline)); });
        const currentIndex = flat.findIndex(item => normalizeDisciplineKey(item.name) === normalizeDisciplineKey(disciplineName));
        if (currentIndex === -1) return false;
        if (currentIndex === 0) return true;
        return flat.slice(0, currentIndex).every(item => isDisciplinePassed(item.name));
    }

    function isDisciplineCompleted(disciplineName) {
        const lessonIds = disciplineToLessonsMap.get(disciplineName) || [];
        if (!lessonIds.length) return false;
        return lessonIds.every(lid => lessons[lid]?.completed === true);
    }

    function updateDisciplineCompletion(disciplineName, lessonIds) {
        const allLessonsCompleted = lessonIds.every(lid => lessons[lid]?.completed === true);
        if (allLessonsCompleted && !notifiedDisciplines.has(disciplineName)) {
            notifiedDisciplines.add(disciplineName);
            queueNotification(t('discipline_completed', { name: disciplineName }), 'success');
        }
    }

    function formatQuizCountdown(ms) {
        const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
    }

    function stopDisciplineQuizTimer() {
        if (activeDisciplineQuizTimer) {
            clearInterval(activeDisciplineQuizTimer);
            activeDisciplineQuizTimer = null;
        }
    }

    function updateDisciplineQuizTimerDisplay() {
        const modal = document.getElementById('disciplineQuizModal');
        if (!modal || modal.style.display === 'none') {
            stopDisciplineQuizTimer();
            return;
        }
        const timerEl = document.getElementById('disciplineQuizTimer');
        if (!timerEl) return;
        try {
            const state = JSON.parse(modal.dataset.quizState || '{}');
            if (!state || !state.startedAt) return;
            const remaining = Math.max(0, Number(state.timeLimitMs || DISCIPLINE_QUIZ_TIME_LIMIT_MS) - (Date.now() - Number(state.startedAt)));
            timerEl.textContent = `Tempo restante: ${formatQuizCountdown(remaining)}`;
            state.timeRemainingMs = remaining;
            modal.dataset.quizState = JSON.stringify(state);
            if (remaining <= 0) {
                stopDisciplineQuizTimer();
                finalizeDisciplineQuiz(true);
            }
        } catch (error) {
            stopDisciplineQuizTimer();
        }
    }

    function startDisciplineQuizTimer() {
        stopDisciplineQuizTimer();
        const modal = document.getElementById('disciplineQuizModal');
        if (!modal) return;
        const update = () => updateDisciplineQuizTimerDisplay();
        update();
        activeDisciplineQuizTimer = setInterval(update, 1000);
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
        const lessonName = video.title || `${t('lesson_label', 'Aula')} ${currentLessonId + 1}`;
        window.UniversidadeLivreAnalytics?.discipline(currentCourse, currentDiscipline);
        window.UniversidadeLivreAnalytics?.lesson(currentCourse, currentDiscipline, lessonName);
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
                }
            } else {
                if (currentVideoInLesson + 1 < lesson.videos.length) {
                    currentVideoInLesson++;
                    loadCurrentLesson();
                }
            }
            saveAllProgress();
            renderCurrentLessonPanel();
            renderUnifiedCourseContent();
            expandCurrentLessonInUnifiedContent();
            updateCurrentDiscipline();
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
            if (activeTab === 'notas') renderCourseNotes();
        }
    }

    function renderCurrentLessonPanel() {
        let container = document.getElementById("currentLessonPanelContent");
        if (!container) return;
        let lesson = lessons[currentLessonId];
        if (!lesson) { container.innerHTML = `<p>${t('loading')}</p>`; return; }
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
                        <i class="fas ${isCurrent ? 'fa-play-circle' : (v.watched ? 'fa-check-circle' : 'fa-circle')}"></i> ${escapeHtml(v.title)}
                    </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
        container.querySelectorAll('.current-video-item').forEach(el => {
            let idx = parseInt(el.dataset.videoIndex, 10);
            if (!isNaN(idx) && lessons[currentLessonId].unlocked) el.addEventListener('click', () => { currentVideoInLesson = idx; loadCurrentLesson(); });
        });
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
        updateNotificationPosition();
    }

    function renderUnifiedCourseContent() {
        let container = document.getElementById("unifiedContentList");
        if (!container) return;
        updateFinalExamButton();
        container.innerHTML = "";
        stagesData.forEach((stage, stageIdx) => {
            let totalVids = 0, watchedVids = 0;
            stage.disciplines.forEach(disc => disc.videos.forEach(v => { totalVids++; if (v.watched) watchedVids++; }));
            let stagePercent = totalVids ? Math.floor((watchedVids / totalVids) * 100) : 0;
            let stageDiv = document.createElement("div");
            stageDiv.className = "stage-group-unified animate-in visible";
            stageDiv.innerHTML = `<div class="stage-header"><span>${escapeHtml(stage.name)}</span><span class="stage-progress">${stagePercent}%</span></div><div class="disciplines-list"></div>`;
            let discList = stageDiv.querySelector('.disciplines-list');
            stage.disciplines.forEach(discipline => {
                let lessonsIndices = disciplineLessonsMap.get(discipline.name) || [];
                let lessonsForDisc = lessonsIndices.map(i => lessons[i]).filter(l => l);
                let totalV = lessonsForDisc.reduce((s, l) => s + l.videos.length, 0);
                let watchedV = lessonsForDisc.reduce((s, l) => s + l.videos.filter(v => v.watched).length, 0);
                let discPercent = totalV ? Math.round((watchedV / totalV) * 100) : 0;
                let card = document.createElement("div");
                card.className = "discipline-card";
                const disciplineCompleted = isDisciplineCompleted(discipline.name);
                const disciplineUnlocked = isDisciplineUnlocked(discipline.name);
                const disciplinePassed = isDisciplinePassed(discipline.name);
                const quizButtonTitle = !disciplineUnlocked
                    ? 'Desbloqueie a disciplina anterior para abrir esta prova.'
                    : !disciplineCompleted
                        ? 'Conclua toda a disciplina para desbloquear a prova.'
                        : disciplinePassed
                            ? 'Você já aprovou esta prova.'
                            : 'Prova disponível';
                card.innerHTML = `<div class="discipline-header"><span><i class="fas fa-book-open" style="margin-right:0.5rem;"></i>${escapeHtml(discipline.name)}</span><span class="discipline-progress">${discPercent}%</span></div><div class="weeks-container"></div><button class="discipline-quiz-btn" type="button" ${(!disciplineUnlocked || !disciplineCompleted || disciplinePassed) ? 'disabled' : ''} title="${quizButtonTitle}"><i class="fas fa-clipboard-question"></i> ${disciplinePassed ? 'Aprovado' : 'Prova'}</button>`;
                let weeksContainer = card.querySelector('.weeks-container');
                let quizButton = card.querySelector('.discipline-quiz-btn');
                if (quizButton && (!disciplineUnlocked || !disciplineCompleted || disciplinePassed)) {
                    quizButton.classList.add('locked');
                }
                if (card && !disciplineUnlocked) {
                    card.classList.add('discipline-locked');
                }
                let weeks = [];
                for (let i = 0; i < lessonsForDisc.length; i += 5) weeks.push(lessonsForDisc.slice(i, i + 5));
                weeks.forEach((week, wIdx) => {
                    let weekDiv = document.createElement("div");
                    weekDiv.className = "week-group";
                    weekDiv.innerHTML = `<div class="week-title">${t('week')} ${wIdx + 1}</div>`;
                    week.forEach(lesson => {
                        let gid = lessons.indexOf(lesson);
                        let lessonDiv = document.createElement("div");
                        lessonDiv.className = `lesson-item ${lesson.completed ? 'completed' : ''} ${!disciplineUnlocked ? 'locked-disciplines' : ''}`;
                        lessonDiv.innerHTML = `<span><i class="fas fa-play-circle" style="font-size:0.7rem; margin-right:0.5rem;"></i> ${t('lesson_label')} ${gid + 1}</span> <span>${Math.round(lesson.totalDuration)}min</span>`;
                        lessonDiv.setAttribute('data-lesson-id', gid);
                        lessonDiv.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (!disciplineUnlocked) {
                                alert('Desbloqueie a disciplina anterior fazendo a prova com a pontuação mínima.');
                                return;
                            }
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
                if (quizButton) {
                    quizButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (!isDisciplineCompleted(discipline.name)) {
                            alert(t('discipline_quiz_locked'));
                            return;
                        }
                        openDisciplineQuiz(discipline.name);
                    });
                }
                let header = card.querySelector('.discipline-header');
                header.addEventListener('click', () => weeksContainer.classList.toggle('open'));
                discList.appendChild(card);
            });
            let stageHeader = stageDiv.querySelector('.stage-header');
            stageHeader.addEventListener('click', () => discList.classList.toggle('open'));
            container.appendChild(stageDiv);
        });
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    const disciplineQuizCache = new Map();

    function getCourseQuizFile(courseId) {
        const courseMap = {
            administracao: 'cursos/graduacao/administracao/administracao-quiz.json',
            biologia: 'cursos/graduacao/biologia/biologia-quiz.json',
            computacao: 'cursos/graduacao/ciencia-computacao/ciencia-computacao-quiz.json',
            matematica: 'cursos/graduacao/matematica/matematica-quiz.json',
            'matematica-licenciatura': 'cursos/graduacao/matematica-licenciatura/matematica-licenciatura-quiz.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/computacao-grafica-quiz.json',
            embarcados: 'cursos/pos-graduacao/embarcados/embarcados-quiz.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/desenvolvimento-web-quiz.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/cybersecurity-quiz.json',
            devops: 'cursos/pos-graduacao/devops/devops-quiz.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/ciencia-de-dados-quiz.json',
            'ciencia-de-dados-bacharelado': 'cursos/graduacao/ciencia-de-dados/ciencia-de-dados-bacharelado-quiz.json',
            'computer-science': 'cursos/graduacao/computer-science/computer-science-quiz.json',
            'math': 'cursos/graduacao/math/math-quiz.json',
            'enem': 'cursos/ensino-medio/enem/enem-quiz.json',
            'espcex': 'cursos/ensino-medio/espcex/espcex-quiz.json',
            'ingles': 'cursos/idiomas/ingles/ingles-quiz.json',
            'espanhol': 'cursos/idiomas/espanhol/espanhol-quiz.json',
            'espanhol-ingles': 'cursos/idiomas/espanhol-ingles/espanhol-ingles-quiz.json',
            'japones': 'cursos/idiomas/japones/japones-quiz.json',
            'portugues-brasileiro': 'cursos/idiomas/portugues-brasileiro/portugues-brasileiro-quiz.json',
            'japones-ingles': 'cursos/idiomas/japones-ingles/japones-ingles-quiz.json',
            'engenharia_computacao': 'cursos/graduacao/engenharia-computacao/engenharia-computacao-quiz.json',
            'engenharia-producao': 'cursos/graduacao/engenharia-producao/engenharia-producao-quiz.json',
            'letras': 'cursos/graduacao/letras/letras-quiz.json',
            'letras-portugues': 'cursos/graduacao/letras-portugues/letras-portugues-quiz.json',
            'pedagogia': 'cursos/graduacao/pedagogia/pedagogia-quiz.json',
            'gestao-publica': 'cursos/graduacao/gestao-publica/gestao-publica-quiz.json',
            'tecnologia-informacao': 'cursos/graduacao/tecnologia-informacao/tecnologia-informacao-quiz.json',
            'processos-gerenciais': 'cursos/graduacao/processos-gerenciais/processos-gerenciais-quiz.json',
            'fisica': 'cursos/graduacao/fisica/fisica-quiz.json',
            'quimica': 'cursos/graduacao/quimica/quimica-quiz.json'
        };
        return courseMap[courseId] || null;
    }

    function createFallbackQuizQuestions(disciplineName, count = 50) {
        const topicBase = (disciplineName || 'disciplina').trim();
        const tokens = topicBase.split(/\s+/).slice(0, 6);
        const domainWords = tokens.length ? tokens : ['disciplina', 'estudo', 'conhecimento'];
        const questionSeeds = [
            'Qual conceito é essencial para o domínio desta disciplina?',
            'Qual alternativa melhor descreve a aplicação prática desta temática?',
            'Por que essa habilidade é importante no contexto acadêmico?',
            'Qual elemento deve ser priorizado na análise do tema?',
            'Qual abordagem costuma gerar melhor compreensão do conteúdo?',
            'Em uma situação prática, qual decisão é mais adequada?',
            'Qual é a característica central dessa área de estudo?',
            'Qual ferramenta ou método é mais indicado para aprofundar o assunto?',
            'O que distingue a teoria da prática nesta disciplina?',
            'Qual afirmação melhor resume a competência esperada?'
        ];

        return Array.from({ length: count }, (_, index) => {
            const baseQuestion = questionSeeds[index % questionSeeds.length];
            const correctIndex = index % 4;
            const optionPool = [
                'Compreender os fundamentos e aplicar com raciocínio crítico.',
                'Memorizar respostas sem relacionar ao contexto.',
                'Evitar análise prática e focar apenas na teoria isolada.',
                'Priorizar solução mecânica em vez de entendimento conceitual.'
            ];
            const options = [
                optionPool[(correctIndex + 0) % optionPool.length],
                optionPool[(correctIndex + 1) % optionPool.length],
                optionPool[(correctIndex + 2) % optionPool.length],
                optionPool[(correctIndex + 3) % optionPool.length]
            ];
            const correctAnswer = options[correctIndex];
            const topicPhrase = domainWords.join(' ');
            return {
                id: `${normalize(disciplineName || 'disciplina')}-${index + 1}`,
                discipline: disciplineName,
                question: `${baseQuestion} Considere o tema ${topicPhrase}.`,
                options,
                correctIndex,
                correctAnswer,
                explanation: `A melhor resposta está ligada à compreensão conceitual e à aplicação crítica de ${topicPhrase}, em vez de memorização mecânica.`
            };
        });
    }

    async function loadCourseQuizBank(courseId) {
        if (disciplineQuizCache.has(courseId)) {
            return disciplineQuizCache.get(courseId);
        }
        const fileName = getCourseQuizFile(courseId);
        if (!fileName) {
            return [];
        }
        try {
            const response = await fetch(fileName);
            if (!response.ok) {
                throw new Error('Quiz não disponível para este curso');
            }
            const data = await response.json();
            disciplineQuizCache.set(courseId, data || []);
            return data || [];
        } catch (error) {
            console.warn('[Quiz] Arquivo de prova não encontrado para o curso:', courseId, error);
            disciplineQuizCache.set(courseId, []);
            return [];
        }
    }

    function findDisciplineQuestions(disciplineBank, disciplineName) {
        if (!Array.isArray(disciplineBank)) return [];
        const normalizedTarget = normalize(disciplineName || '');
        for (const item of disciplineBank) {
            if (normalize(item?.name || item?.discipline || '') === normalizedTarget) {
                return Array.isArray(item.questions) ? item.questions : [];
            }
        }
        return [];
    }

    function buildQuizStateFromQuestions(disciplineName, questions) {
        const pool = Array.isArray(questions) && questions.length ? questions : createFallbackQuizQuestions(disciplineName, 50);
        const selected = [...pool].sort(() => Math.random() - 0.5).slice(0, 10);
        return {
            disciplineName,
            questions: selected,
            currentIndex: 0,
            answers: new Array(selected.length).fill(null),
            completed: false,
            startedAt: Date.now(),
            timeLimitMs: DISCIPLINE_QUIZ_TIME_LIMIT_MS,
            timeRemainingMs: DISCIPLINE_QUIZ_TIME_LIMIT_MS
        };
    }

    function openDisciplineQuiz(disciplineName) {
        const modal = document.getElementById('disciplineQuizModal');
        const title = document.getElementById('disciplineQuizTitle');
        if (!modal || !title) return;

        if (!isDisciplineCompleted(disciplineName) || !isDisciplineUnlocked(disciplineName)) {
            alert(t('discipline_quiz_locked'));
            return;
        }

        const courseId = currentCourse;
        if (!courseId) {
            alert('Selecione um curso antes de iniciar a prova.');
            return;
        }

        const openModal = async () => {
            let bank = await loadCourseQuizBank(courseId);
            let questions = findDisciplineQuestions(bank, disciplineName);
            if (!questions.length) {
                questions = createFallbackQuizQuestions(disciplineName, 50);
            }
            const state = buildQuizStateFromQuestions(disciplineName, questions);
            title.textContent = `${disciplineName} · Prova`;
            modal.dataset.quizState = JSON.stringify(state);
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            startDisciplineQuizTimer();
            renderDisciplineQuizQuestion();
        };

        openModal();
    }

    function renderDisciplineQuizQuestion() {
        const modal = document.getElementById('disciplineQuizModal');
        const statusEl = document.getElementById('disciplineQuizStatus');
        const questionEl = document.getElementById('disciplineQuizQuestion');
        const optionsEl = document.getElementById('disciplineQuizOptions');
        const navEl = document.getElementById('disciplineQuizNavigation');
        if (!modal || !statusEl || !questionEl || !optionsEl || !navEl) return;

        let state = null;
        try {
            state = JSON.parse(modal.dataset.quizState || '{}');
        } catch (e) {
            return;
        }

        if (!state || !Array.isArray(state.questions) || !state.questions.length) return;

        const current = state.questions[state.currentIndex];
        const answered = state.answers[state.currentIndex];
        const remaining = Math.max(0, Number(state.timeLimitMs || DISCIPLINE_QUIZ_TIME_LIMIT_MS) - (Date.now() - Number(state.startedAt || Date.now())));
        const progressLabel = `${state.finalExam ? 'Prova final · ' : ''}Pergunta ${state.currentIndex + 1} de ${state.questions.length}`;
        statusEl.innerHTML = `<span>${escapeHtml(progressLabel)}</span><span id="disciplineQuizTimer">Tempo restante: ${formatQuizCountdown(remaining)}</span>`;
        questionEl.innerHTML = `<strong>${escapeHtml(current.question)}</strong>`;

        optionsEl.innerHTML = current.options.map((option, index) => `
            <label class="discipline-quiz-option ${answered === index ? 'selected' : ''}">
                <input type="radio" name="disciplineQuizOption" value="${index}" ${answered === index ? 'checked' : ''}>
                <span>${escapeHtml(option)}</span>
            </label>
        `).join('');

        optionsEl.querySelectorAll('input[name="disciplineQuizOption"]').forEach(input => {
            input.addEventListener('change', (event) => {
                const answerIndex = Number(event.target.value);
                state.answers[state.currentIndex] = answerIndex;
                modal.dataset.quizState = JSON.stringify(state);
                renderDisciplineQuizQuestion();
            });
        });

        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'discipline-quiz-nav-btn secondary';
        prevBtn.textContent = 'Anterior';
        prevBtn.disabled = state.currentIndex === 0;
        prevBtn.onclick = () => {
            if (state.currentIndex > 0) {
                state.currentIndex -= 1;
                modal.dataset.quizState = JSON.stringify(state);
                renderDisciplineQuizQuestion();
            }
        };

        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'discipline-quiz-nav-btn primary';
        nextBtn.textContent = state.currentIndex === state.questions.length - 1 ? 'Finalizar' : 'Próxima';
        nextBtn.onclick = () => {
            if (remaining <= 0) {
                finalizeDisciplineQuiz(true);
                return;
            }
            if (state.currentIndex < state.questions.length - 1) {
                state.currentIndex += 1;
                modal.dataset.quizState = JSON.stringify(state);
                renderDisciplineQuizQuestion();
            } else {
                finalizeDisciplineQuiz();
            }
        };

        navEl.innerHTML = '';
        navEl.appendChild(prevBtn);
        navEl.appendChild(nextBtn);
    }

    function finalizeDisciplineQuiz(autoTimeout = false) {
        const modal = document.getElementById('disciplineQuizModal');
        const statusEl = document.getElementById('disciplineQuizStatus');
        const questionEl = document.getElementById('disciplineQuizQuestion');
        const optionsEl = document.getElementById('disciplineQuizOptions');
        const navEl = document.getElementById('disciplineQuizNavigation');
        if (!modal || !statusEl || !questionEl || !optionsEl || !navEl) return;

        try {
            const state = JSON.parse(modal.dataset.quizState || '{}');
            if (!state || !Array.isArray(state.questions)) return;

            stopDisciplineQuizTimer();

            let score = 0;
            const summary = state.questions.map((q, idx) => {
                const answerIndex = state.answers[idx];
                const correct = answerIndex === q.correctIndex;
                if (correct) score += 1;
                return `\n${idx + 1}. ${correct ? '✅' : '❌'} ${escapeHtml(q.question)}<br><small>${correct ? 'Resposta correta' : `Correta: ${escapeHtml(q.options[q.correctIndex])}`}</small>`;
            }).join('<br>');

            const percent = Math.round((score / state.questions.length) * 100);
            const passed = percent >= DISCIPLINE_PASS_PERCENT;
            const disciplineName = state.disciplineName || currentDiscipline;
            const resultState = {
                passed,
                score,
                total: state.questions.length,
                percent,
                attempted: true,
                finishedAt: Date.now(),
                userName: localStorage.getItem('userProfileName') || '',
                userNumber: localStorage.getItem('userNumber') || `UL-${localStorage.getItem('userMatricula') || ''}`,
                matricula: localStorage.getItem('userMatricula') || '',
                courseName: currentCourseDetails?.name || getCourseName(currentCourse),
                courseLevel: currentCourseDetails?.courseLevel || '',
                timeLimitMs: Number(state.timeLimitMs || FINAL_EXAM_TIME_LIMIT_MS),
                timeRemainingMs: Math.max(0, Number(state.timeRemainingMs || (Number(state.timeLimitMs || DISCIPLINE_QUIZ_TIME_LIMIT_MS) - (Date.now() - Number(state.startedAt || Date.now())))))
            };
            if (state.finalExam) {
                localStorage.setItem(getFinalExamStorageKey(currentCourse), JSON.stringify({ ...resultState, attempted: true }));
            } else {
                setDisciplineExamState(currentCourse, disciplineName, resultState);
            }

            statusEl.innerHTML = `<span>${autoTimeout ? 'Tempo esgotado' : 'Resultado final'}</span><strong>${score}/${state.questions.length}</strong>`;
            questionEl.innerHTML = `<div class='discipline-quiz-result'><h3>Você acertou ${score} de ${state.questions.length} questões.</h3><p>Seu desempenho foi de ${percent}%.</p>${passed ? `<p><strong>${state.finalExam ? 'Prova final aprovada.' : 'Prova aprovada.'}</strong></p>` : `<p><strong>Prova reprovada.</strong> Você precisa atingir ${DISCIPLINE_PASS_PERCENT}%.</p>`}</div>`;
            optionsEl.innerHTML = `<div class="discipline-quiz-summary">${summary}</div>`;
            navEl.innerHTML = '<button type="button" class="discipline-quiz-nav-btn primary" id="disciplineQuizCloseBtn">Fechar</button>';
            document.getElementById('disciplineQuizCloseBtn')?.addEventListener('click', () => {
                closeDisciplineQuiz();
                if (state.finalExam && passed) {
                    localStorage.setItem(`course_completed_${currentCourse}`, 'true');
                    if (window.showFinalCompletionModal) {
                        window.showFinalCompletionModal(currentCourse, currentCourseDetails?.name || getCourseName(currentCourse), currentCourseFolder);
                    }
                }
            });

            if (passed && !state.finalExam) {
                const flatDisciplines = [];
                stagesData.forEach(stage => {
                    (stage.disciplines || []).forEach(discipline => flatDisciplines.push(discipline));
                });
                const currentIndex = flatDisciplines.findIndex(item => normalizeDisciplineKey(item.name) === normalizeDisciplineKey(disciplineName));
                if (currentIndex >= 0 && currentIndex < flatDisciplines.length - 1) {
                    const nextDiscipline = flatDisciplines[currentIndex + 1];
                    if (nextDiscipline && nextDiscipline.name) {
                        queueNotification(`A disciplina "${nextDiscipline.name}" foi desbloqueada.`, 'success');
                    }
                }
            }

            renderUnifiedCourseContent();
        } catch (e) {
            console.error('[Quiz] Erro ao finalizar prova:', e);
        }
    }

    function closeDisciplineQuiz() {
        const modal = document.getElementById('disciplineQuizModal');
        if (!modal) return;
        stopDisciplineQuizTimer();
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
        modal.dataset.quizState = '';
    }

    function attachDisciplineQuizModalHandlers() {
        const modal = document.getElementById('disciplineQuizModal');
        const closeBtn = document.querySelector('.close-discipline-quiz');
        if (!modal || !closeBtn) return;
        closeBtn.addEventListener('click', closeDisciplineQuiz);
        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeDisciplineQuiz();
        });
    }

    // ========== BIBLIOTECA ==========
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

    async function loadBooksForCourse(courseId) {
        if (booksCache.has(courseId)) return booksCache.get(courseId);
        const bookFiles = {
            administracao: 'cursos/graduacao/administracao/administracao-books.json',
            biologia: 'cursos/graduacao/biologia/biologia-books.json',
            computacao: 'cursos/graduacao/ciencia-computacao/ciencia-computacao-books.json',
            matematica: 'cursos/graduacao/matematica/matematica-books.json',
            'matematica-licenciatura': 'cursos/graduacao/matematica-licenciatura/matematica-licenciatura-books.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/computacao-grafica-books.json',
            embarcados: 'cursos/pos-graduacao/embarcados/embarcados-books.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/desenvolvimento-web-books.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/cybersecurity-books.json',
            devops: 'cursos/pos-graduacao/devops/devops-books.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/ciencia-de-dados-books.json',
            'ciencia-de-dados-bacharelado': 'cursos/graduacao/ciencia-de-dados/ciencia-de-dados-bacharelado-books.json',
            'computer-science': 'cursos/graduacao/computer-science/computer-science-books.json',
            'enem': 'cursos/ensino-medio/enem/enem-books.json',
            'espcex': 'cursos/ensino-medio/espcex/espcex-books.json',
            'ingles': 'cursos/idiomas/ingles/ingles-books.json',
            'espanhol': 'cursos/idiomas/espanhol/espanhol-books.json',
            'espanhol-ingles': 'cursos/idiomas/espanhol-ingles/espanhol-ingles-books.json',
            'japones': 'cursos/idiomas/japones/japones-books.json',
            'portugues-brasileiro': 'cursos/idiomas/portugues-brasileiro/portugues-brasileiro-books.json',
            'japones-ingles': 'cursos/idiomas/japones-ingles/japones-ingles-books.json',
            'engenharia_computacao': 'cursos/graduacao/engenharia-computacao/engenharia-computacao-books.json',
            'engenharia-producao': 'cursos/graduacao/engenharia-producao/engenharia-producao-books.json',
            'letras': 'cursos/graduacao/letras/letras-books.json',
            'letras-portugues': 'cursos/graduacao/letras-portugues/letras-portugues-books.json',
            'pedagogia': 'cursos/graduacao/pedagogia/pedagogia-books.json',
            'gestao-publica': 'cursos/graduacao/gestao-publica/gestao-publica-books.json',
            'tecnologia-informacao': 'cursos/graduacao/tecnologia-informacao/tecnologia-informacao-books.json',
            'processos-gerenciais': 'cursos/graduacao/processos-gerenciais/processos-gerenciais-books.json',
            'fisica': 'cursos/graduacao/fisica/fisica-books.json',
            'quimica': 'cursos/graduacao/quimica/quimica-books.json'
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

    function findBookInLibrary(bibliographyBook) { return libraryBooksMap.get(normalize(bibliographyBook.title)) || null; }
    function goToLibrary(bookTitle) { localStorage.setItem('highlightBook', bookTitle); window.open('biblioteca/biblioteca.html', '_blank'); }

    function ensureCurrentDiscipline() {
        if (currentDiscipline) return currentDiscipline;
        for (const stage of stagesData || []) {
            for (const disc of stage.disciplines || []) {
                if (disc.name) {
                    currentDiscipline = disc.name;
                    return currentDiscipline;
                }
            }
        }
        return null;
    }

    async function renderBooksFilteredByDiscipline(discipline) {
        const container = document.getElementById('booksList');
        if (!container) return;
        container.innerHTML = '';
        if (!discipline) {
            discipline = ensureCurrentDiscipline();
            if (!discipline) {
                container.innerHTML = `<div class="bibliografia-heading">${t('tab_bibliography')}</div><p>${t('loading')}</p>`;
                return;
            }
        }
        const books = await loadBooksForCourse(currentCourse);
        if (!books || books.length === 0) {
            container.innerHTML = `<div class="bibliografia-heading">${t('tab_bibliography')}</div><p>${t('no_books')}</p>`;
            return;
        }
        const normalizedDiscipline = normalize(discipline);
        const filteredBooks = books.filter(book => normalize(book.discipline) === normalizedDiscipline);
        const headingText = `${t('tab_bibliography')} — ${discipline}`;
        if (filteredBooks.length === 0) {
            container.innerHTML = `<div class="bibliografia-heading">${escapeHtml(headingText)}</div><p>${t('no_books')}</p>`;
            return;
        }
        let html = `<div class="bibliografia-heading animate-in">${escapeHtml(headingText)}</div><div class="books-container">`;
        filteredBooks.forEach(book => {
            let detailsHtml = '';
            if (book.edition) detailsHtml += `<span>${escapeHtml(book.edition)}</span>`;
            if (book.year) detailsHtml += `<span>${escapeHtml(book.year)}</span>`;
            if (book.publisher) detailsHtml += `<span>${escapeHtml(book.publisher)}</span>`;
            if (book.language) detailsHtml += `<span>${escapeHtml(book.language)}</span>`;
            if (book.isbn) detailsHtml += `<span>ISBN: ${escapeHtml(book.isbn)}</span>`;
            if (book.category) detailsHtml += `<span>${escapeHtml(book.category)}</span>`;
            const existsInLibrary = !!findBookInLibrary(book);
            html += `<div class="book-card animate-in">
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
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    // ========== TIME E CONTRIBUIDORES ==========
    async function loadTeamAndContributors(courseId) {
        const teamFiles = {
            administracao: 'cursos/graduacao/administracao/team-administracao.json',
            biologia: 'cursos/graduacao/biologia/team-biologia.json',
            computacao: 'cursos/graduacao/ciencia-computacao/team-computacao.json',
            matematica: 'cursos/graduacao/matematica/team-matematica.json',
            'matematica-licenciatura': 'cursos/graduacao/matematica-licenciatura/team-matematica-licenciatura.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/team-computacao-grafica.json',
            embarcados: 'cursos/pos-graduacao/embarcados/team-embarcados.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/team-desenvolvimento-web.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/team-cybersecurity.json',
            devops: 'cursos/pos-graduacao/devops/team-devops.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/team-ciencia-de-dados.json',
            'ciencia-de-dados-bacharelado': 'cursos/graduacao/ciencia-de-dados/team-ciencia-de-dados-bacharelado.json',
            'computer-science': 'cursos/graduacao/computer-science/team-computer-science.json',
            'math': 'cursos/graduacao/math/team-math.json',
            'enem': 'cursos/ensino-medio/enem/team-enem.json',
            'espcex': 'cursos/ensino-medio/espcex/team-espcex.json',
            'ingles': 'cursos/idiomas/ingles/team-ingles.json',
            'espanhol': 'cursos/idiomas/espanhol/team-espanhol.json',
            'espanhol-ingles': 'cursos/idiomas/espanhol-ingles/team-espanhol-ingles.json',
            'japones': 'cursos/idiomas/japones/team-japones.json',
            'portugues-brasileiro': 'cursos/idiomas/portugues-brasileiro/team-portugues-brasileiro.json',
            'japones-ingles': 'cursos/idiomas/japones-ingles/team-japones-ingles.json',
            'engenharia_computacao': 'cursos/graduacao/engenharia-computacao/team-engenharia-computacao.json',
            'engenharia-producao': 'cursos/graduacao/engenharia-producao/team-engenharia-producao.json',
            'letras': 'cursos/graduacao/letras/team-letras.json',
            'letras-portugues': 'cursos/graduacao/letras-portugues/team-letras-portugues.json',
            'pedagogia': 'cursos/graduacao/pedagogia/team-pedagogia.json',
            'gestao-publica': 'cursos/graduacao/gestao-publica/team-gestao-publica.json',
            'tecnologia-informacao': 'cursos/graduacao/tecnologia-informacao/team-tecnologia-informacao.json',
            'processos-gerenciais': 'cursos/graduacao/processos-gerenciais/team-processos-gerenciais.json',
            'fisica': 'cursos/graduacao/fisica/team-fisica.json',
            'quimica': 'cursos/graduacao/quimica/team-quimica.json'
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
            if (typeof window.applyTranslations === 'function') window.applyTranslations();
        }
    }

    function renderTeam(team) {
        const container = document.getElementById('team-grid');
        if (!container) return;
        if (!team || team.length === 0) { container.innerHTML = `<p>${t('no_team')}</p>`; return; }
        container.innerHTML = team.map(member => {
            const link = member.github || member.url || '#';
            return `<div class="member-card animate-in">
                <img class="member-photo" src="${member.image || 'img/team/default-avatar.png'}" alt="${escapeHtml(member.name)}" onerror="this.src='img/team/default-avatar.png'">
                <div class="member-name"><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(member.name)}</a></div>
                <div class="member-role">${escapeHtml(member.role)}</div>
                <div class="member-year">${escapeHtml(member.year)}</div>
                <div class="member-desc">${escapeHtml(member.description)}</div>
            </div>`;
        }).join('');
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    // ========== PRÁTICA ==========
    async function loadPracticeContent(courseId) {
        if (activeTab !== 'pratica') return;
        const container = document.getElementById('practiceContent');
        if (!container) return;
        container.innerHTML = '';
        let practiceData = null;
        try {
            const specificUrl = `cursos/ensino-medio/enem/pratica-enem.json`;
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
                if (typeof window.applyTranslations === 'function') window.applyTranslations();
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
                introText = currentPracticeData.intro[getCurrentLanguage()] || currentPracticeData.intro['pt-br'] || '';
            } else {
                introText = currentPracticeData.intro;
            }
            introHtml = `<div class="practice-intro animate-in">${escapeHtml(introText)}</div>`;
        }
        const gridContainerHtml = '<div id="practiceGridContainer" class="practice-grid"></div>';
        container.innerHTML = searchHtml + introHtml + gridContainerHtml;
        practiceSearchInput = document.getElementById('practiceSearchInput');
        renderPracticeGrid(currentPracticeData);
        if (practiceSearchInput) {
            practiceSearchInput.addEventListener('input', debounce(() => filterPracticeGrid(), 300));
        }
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    function renderPracticeGrid(practiceData) {
        if (activeTab !== 'pratica') return;
        const gridContainer = document.getElementById('practiceGridContainer');
        if (!gridContainer) return;
        if (!practiceData.platforms || practiceData.platforms.length === 0) {
            gridContainer.innerHTML = `<p>${t('no_practice')}</p>`;
            if (typeof window.applyTranslations === 'function') window.applyTranslations();
            return;
        }
        let html = '';
        const lang = getCurrentLanguage();
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
            html += `<div class="practice-platform-card animate-in">
                        <div class="practice-platform-image"><img src="${escapeHtml(imagem)}" alt="${escapeHtml(titulo)}" loading="lazy" onerror="this.src='https://placehold.co/400x200/1F2933/9CA3AF?text=${encodeURIComponent(titulo)}'"></div>
                        <div class="practice-platform-content">
                            <h3>${escapeHtml(titulo)}</h3>
                            <p>${escapeHtml(descricao)}</p>
                            <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="practice-platform-btn"><i class="fas fa-external-link-alt"></i> ${t('access_practice')}</a>
                        </div>
                    </div>`;
        });
        gridContainer.innerHTML = html;
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    function filterPracticeGrid() {
        if (activeTab !== 'pratica') return;
        if (!currentPracticeData || !practiceSearchInput) return;
        const searchTerm = practiceSearchInput.value.trim().toLowerCase();
        if (searchTerm === '') {
            renderPracticeGrid(currentPracticeData);
            return;
        }
        const lang = getCurrentLanguage();
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

    // ========== ABAS ==========
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
            if (!currentDiscipline) {
                currentDiscipline = ensureCurrentDiscipline();
                if (!currentDiscipline) {
                    if (stagesData.length > 0 && stagesData[0].disciplines.length > 0) {
                        currentDiscipline = stagesData[0].disciplines[0].name;
                    }
                }
            }
            if (currentDiscipline) {
                renderBooksFilteredByDiscipline(currentDiscipline);
                if (window.CursorTimeset && currentCourse && currentDiscipline) {
                    window.CursorTimeset.registerDisciplineEntry(currentCourse, currentDiscipline, 'bibliography');
                }
            }
        } else if (tabId === 'pratica') {
            if (currentCourse) {
                loadPracticeContent(currentCourse);
                if (window.CursorTimeset && currentDiscipline) {
                    window.CursorTimeset.registerDisciplineEntry(currentCourse, currentDiscipline, 'practice');
                }
            }
        } else if (tabId === 'notas') {
            renderCourseNotes();
        } else if (tabId === 'team') {
            const teamGrid = document.getElementById('team-grid');
            if (teamGrid && teamGrid.innerHTML === '') loadTeamAndContributors(currentCourse);
        } else if (tabId === 'contributors') {
            renderContributorsTab();
        } else if (tabId === 'license') {
            renderLicenseTab();
        }
        setTimeout(() => {
            if (typeof window.applyTranslations === 'function') window.applyTranslations();
        }, 50);
    }

    function initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => btn.addEventListener('click', () => activateTab(btn.getAttribute('data-tab'))));
    }

    // ========== CONTRIBUIDORES ==========
    async function loadContributors(courseId) {
        const teamFiles = {
            administracao: 'cursos/graduacao/administracao/team-administracao.json',
            biologia: 'cursos/graduacao/biologia/team-biologia.json',
            computacao: 'cursos/graduacao/ciencia-computacao/team-computacao.json',
            matematica: 'cursos/graduacao/matematica/team-matematica.json',
            'matematica-licenciatura': 'cursos/graduacao/matematica-licenciatura/team-matematica-licenciatura.json',
            computacao_grafica: 'cursos/pos-graduacao/computacao-grafica/team-computacao-grafica.json',
            embarcados: 'cursos/pos-graduacao/embarcados/team-embarcados.json',
            desenvolvimento_web: 'cursos/pos-graduacao/desenvolvimento-web/team-desenvolvimento-web.json',
            cybersecurity: 'cursos/pos-graduacao/cybersecurity/team-cybersecurity.json',
            devops: 'cursos/pos-graduacao/devops/team-devops.json',
            ciencia_de_dados: 'cursos/pos-graduacao/ciencia-de-dados/team-ciencia-de-dados.json',
            'ciencia-de-dados-bacharelado': 'cursos/graduacao/ciencia-de-dados/team-ciencia-de-dados-bacharelado.json',
            'computer-science': 'cursos/graduacao/computer-science/team-computer-science.json',
            'math': 'cursos/graduacao/math/team-math.json',
            'enem': 'cursos/ensino-medio/enem/team-enem.json',
            'espcex': 'cursos/ensino-medio/espcex/team-espcex.json',
            'ingles': 'cursos/idiomas/ingles/team-ingles.json',
            'espanhol': 'cursos/idiomas/espanhol/team-espanhol.json',
            'espanhol-ingles': 'cursos/idiomas/espanhol-ingles/team-espanhol-ingles.json',
            'japones': 'cursos/idiomas/japones/team-japones.json',
            'portugues-brasileiro': 'cursos/idiomas/portugues-brasileiro/team-portugues-brasileiro.json',
            'japones-ingles': 'cursos/idiomas/japones-ingles/team-japones-ingles.json',
            'engenharia_computacao': 'cursos/graduacao/engenharia-computacao/team-engenharia-computacao.json',
            'engenharia-producao': 'cursos/graduacao/engenharia-producao/team-engenharia-producao.json',
            'letras': 'cursos/graduacao/letras/team-letras.json',
            'letras-portugues': 'cursos/graduacao/letras-portugues/team-letras-portugues.json',
            'pedagogia': 'cursos/graduacao/pedagogia/team-pedagogia.json',
            'gestao-publica': 'cursos/graduacao/gestao-publica/team-gestao-publica.json',
            'tecnologia-informacao': 'cursos/graduacao/tecnologia-informacao/team-tecnologia-informacao.json',
            'processos-gerenciais': 'cursos/graduacao/processos-gerenciais/team-processos-gerenciais.json',
            'fisica': 'cursos/graduacao/fisica/team-fisica.json',
            'quimica': 'cursos/graduacao/quimica/team-quimica.json'
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

    async function renderContributorsTab() {
        const container = document.getElementById('contributors-grid');
        if (!container) return;
        const contributors = await loadContributors(currentCourse);
        if (!contributors.length) { container.innerHTML = `<p>${t('no_contributors')}</p>`; return; }
        let html = '';
        contributors.forEach(contributor => {
            const isNew = contributor.isNew === true;
            const link = contributor.github || contributor.url || '#';
            html += `<div class="member-card ${isNew ? 'new-contributor' : ''} animate-in">
                        <img class="member-photo" src="${escapeHtml(contributor.image || 'https://placehold.co/60x60/1F2933/9CA3AF?text=?')}" alt="${escapeHtml(contributor.name)}" onerror="this.src='https://placehold.co/60x60/1F2933/9CA3AF?text=?'">
                        <div class="member-name"><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contributor.name)}</a>${isNew ? `<span class="new-badge">${t('new_badge')}</span>` : ''}</div>
                        <div class="member-role">${escapeHtml(contributor.role)}</div>
                        <div class="member-year">${escapeHtml(contributor.year)}</div>
                        <div class="member-desc">${escapeHtml(contributor.description)}</div>
                    </div>`;
        });
        container.innerHTML = html;
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    // ========== LICENÇA ==========
    let _licenseCache = null;

    async function loadLicenseData() {
        if (_licenseCache) return _licenseCache;
        try {
            const response = await fetch('cursos/license.json');
            if (!response.ok) throw new Error('Erro ao carregar dados da licença');
            _licenseCache = await response.json();
            return _licenseCache;
        } catch (error) {
            console.error('Erro ao carregar license.json:', error);
            return null;
        }
    }

    async function renderLicenseTab() {
        const container = document.getElementById('license-content');
        if (!container) return;
        const data = await loadLicenseData();
        if (!data) { container.innerHTML = `<p>${t('license_load_error')}</p>`; return; }
        let html = '';
        if (data.license) {
            html += `<div class="license-card animate-in">
                        <div class="license-icon"><i class="fas fa-certificate"></i></div>
                        <div class="license-title">${t('course_license')}</div>
                        <div class="license-text">${escapeHtml(data.license.text)}</div>
                        <a href="${escapeHtml(data.license.url)}" target="_blank" rel="noopener noreferrer" class="license-btn"><i class="fas fa-external-link-alt"></i> ${t('learn_more')}</a>
                    </div>`;
        }
        if (data.bio) html += `<div class="bio-section animate-in"><h3><i class="fas fa-users"></i> ${t('bio_title')}</h3><p>${escapeHtml(data.bio)}</p></div>`;
        if (data.distributor) html += `<div class="distributor-section animate-in"><h3><i class="fas fa-truck"></i> ${t('distributor_title')}</h3><p>${escapeHtml(data.distributor)}</p></div>`;
        if (data.tutoria && data.tutoria.links && data.tutoria.links.length) {
            let linksHtml = '<ul class="tutoria-info">';
            data.tutoria.links.forEach(link => linksHtml += `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-comment"></i> ${escapeHtml(link.name)}</a></li>`);
            linksHtml += '</ul>';
            html += `<div class="tutoria-section animate-in"><h3><i class="fas fa-chalkboard-teacher"></i> ${t('tutoria_title')}</h3>${linksHtml}</div>`;
        }
        if (!html) html = `<p>${t('license_no_info')}</p>`;
        container.innerHTML = html;
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
    }

    // ========== NOTAS DO CURSO ==========
    function getCourseNotes() {
        try {
            const stored = localStorage.getItem('ulivre_notas_estudo');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            return [];
        }
    }

    function getCurrentCourseDiscipline() {
        return (stagesData || []).flatMap(stage => stage.disciplines || [])
            .find(discipline => discipline.name === currentDiscipline);
    }

    function getCourseNoteLessonNumber() {
        const discipline = getCurrentCourseDiscipline();
        const currentVideo = lessons[currentLessonId]?.videos[currentVideoInLesson];
        if (!discipline || !currentVideo) return '';
        const videoIndex = discipline.videos.findIndex(video => video.id === currentVideo.id);
        return videoIndex >= 0 ? videoIndex + 1 : '';
    }

    function renderCourseNotes() {
        const container = document.getElementById('courseNotesContent');
        if (!container) return;
        const notes = getCourseNotes().filter(note =>
            note.courseId === currentCourse && note.disciplineName === currentDiscipline
        );
        const lessonNumber = getCourseNoteLessonNumber();
        const lessonOptions = (getCurrentCourseDiscipline()?.videos || []).map((video, index) =>
            `<option value="${index + 1}"${String(lessonNumber) === String(index + 1) ? ' selected' : ''}>${escapeHtml(video.title)}</option>`
        ).join('');

        container.innerHTML = `
            <div class="course-notes-header">
                <div>
                    <h3><i class="fas fa-note-sticky"></i> ${t('course_notes_title')}</h3>
                    <p>${escapeHtml(currentDiscipline || t('select_discipline'))}</p>
                </div>
                <a class="course-notes-link" href="notas/notas.html" target="_blank" rel="noopener noreferrer"><i class="fas fa-up-right-from-square"></i> ${t('course_notes_open')}</a>
            </div>
            <form id="courseNoteForm" class="course-note-form">
                <input id="courseNoteTitle" type="text" placeholder="${escapeHtml(t('course_notes_title_placeholder'))}" aria-label="${escapeHtml(t('course_notes_title_placeholder'))}" required>
                <select id="courseNoteLesson" aria-label="${escapeHtml(t('lesson_label'))}"><option value="">${t('course_notes_select_lesson')}</option>${lessonOptions}</select>
                <div id="courseNoteBody" class="course-note-editor" aria-label="${escapeHtml(t('course_notes_body_placeholder'))}"></div>
                <button class="btn-primary" type="submit"><i class="fas fa-save"></i> ${t('course_notes_save')}</button>
            </form>
            <div class="course-notes-list">
                ${notes.length ? notes.map(note => `
                    <article class="course-note-card">
                        <h4>${escapeHtml(note.titulo || t('course_notes_untitled'))}</h4>
                        <small><i class="fas fa-book-open"></i> ${escapeHtml(note.disciplineName || '')}${note.lessonNumber ? ` · ${t('lesson_label')} ${note.lessonNumber}` : ''}</small>
                        <div>${note.conteudo || ''}</div>
                    </article>
                `).join('') : `<p class="course-notes-empty">${t('course_notes_empty')}</p>`}
            </div>
        `;
        if (window.Quill) {
            courseNoteQuill = new Quill('#courseNoteBody', {
                theme: 'snow',
                placeholder: t('course_notes_body_placeholder'),
                modules: { toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
                    [{ script: 'sub' }, { script: 'super' }],
                    [{ indent: '-1' }, { indent: '+1' }],
                    [{ size: ['small', false, 'large', 'huge'] }],
                    [{ color: courseNotePalette }, { background: courseNotePalette }],
                    [{ align: [] }],
                    ['link', 'clean']
                ] }
            });
        }
        container.querySelector('#courseNoteForm')?.addEventListener('submit', saveCourseNote);
    }

    function saveCourseNote(event) {
        event.preventDefault();
        const title = document.getElementById('courseNoteTitle')?.value.trim();
        const body = courseNoteQuill?.root.innerHTML.trim();
        const bodyText = courseNoteQuill?.getText().trim();
        if (!title || !bodyText || !currentCourse || !currentDiscipline) return;
        const lessonNumber = document.getElementById('courseNoteLesson')?.value || '';
        const courseInfo = allCourses.find(course => course.id === currentCourse);
        const notes = getCourseNotes();
        const now = new Date().toISOString();
        notes.unshift({ id: Date.now().toString(), titulo: title, conteudo: body, createdAt: now, updatedAt: now, favorite: false, tags: [], courseId: currentCourse, courseName: courseInfo?.name || currentCourse, disciplineName: currentDiscipline, lessonNumber: lessonNumber ? Number(lessonNumber) : '', lessonName: lessonNumber ? `${t('lesson_label')} ${lessonNumber}` : '' });
        localStorage.setItem('ulivre_notas_estudo', JSON.stringify(notes));
        renderCourseNotes();
    }

    // ========== GRÁFICO DE PROGRESSO ==========
    function renderProgressChart() {
        const chartContainer = document.getElementById('progressChartContainer');
        if (!chartContainer) return;
        const total = allVideosFlat.length;
        const watched = allVideosFlat.filter(v => v.watched).length;
        const percent = total ? (watched / total) * 100 : 0;
        const courseName = currentCourseDetails?.name || getCourseName(currentCourse);
        const courseLevel = currentCourseDetails?.courseLevel;
        const levelText = courseLevel === 'graduacao' ? t('graduacao')
            : courseLevel === 'pos-graduacao' ? t('pos_graduacao')
                : courseLevel === 'ensino-medio' ? t('ensino_medio')
                    : courseLevel === 'idiomas' ? t('idiomas') : '';
        const courseType = courseLevel === 'graduacao' ? currentCourseDetails?.courseType : '';
        const typeText = courseType === 'bacharelado' ? t('bacharelado')
            : courseType === 'licenciatura' ? t('licenciatura')
                : courseType === 'tecnologo' ? t('tecnologo') : '';
        chartContainer.innerHTML = `
            <div class="progress-chart animate-in visible" style="margin: 1rem 0; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 12px;">
                <div class="progress-course-heading">
                    <strong>${escapeHtml(courseName)}</strong>
                    <div class="progress-course-level">
                        ${levelText ? `<span>${escapeHtml(levelText)}</span>` : ''}
                        ${typeText ? `<span>${escapeHtml(typeText)}</span>` : ''}
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>${t('course_progress')}</span>
                    <span>${Math.round(percent)}%</span>
                </div>
                <div style="background: var(--bg-secondary); border-radius: 10px; overflow: hidden;">
                    <div style="width: ${percent}%; background: var(--gradient-primary); height: 20px; border-radius: 10px;"></div>
                </div>
            </div>
        `;
    }

    // ========== YOUTUBE PLAYER ==========
    function onYouTubeIframeAPIReady() {
        player = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0,
                origin: window.location.origin,
                host: 'https://www.youtube.com'
            },
            events: {
                onReady: () => {
                    isPlayerReady = true;
                    player.setVolume(playerVolume);
                    if (window._startLessonScheduled) {
                        window._startLessonScheduled = false;
                        startLesson();
                    }
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

    // ========== PERFIL ==========
    function initProfile() {
        const profileBtn = document.getElementById('profileBtn');
        if (!profileBtn) {
            console.warn('[Profile] Botão #profileBtn não encontrado');
            return;
        }
        profileBtn.addEventListener('click', () => {
            console.log('[Profile] Clique no botão de perfil');
            if (window.openProfileModal && typeof window.openProfileModal === 'function') {
                window.openProfileModal();
            } else {
                console.warn('[Profile] openProfileModal não definido, abrindo modal manualmente');
                const modal = document.getElementById('profileModal');
                if (modal) {
                    modal.style.display = 'flex';
                    if (window.updateProfileModal) {
                        window.updateProfileModal();
                    } else {
                        console.warn('[Profile] updateProfileModal não definido');
                    }
                } else {
                    console.error('[Profile] Modal #profileModal não encontrado');
                }
            }
        });
    }

    // ========== ONBOARDING ==========
    function initOnboarding() {
        const onboardingComplete = localStorage.getItem('ulivre_onboarding_complete');
        const hasName = localStorage.getItem('userProfileName');
        if (!onboardingComplete || !hasName) {
            setTimeout(() => {
                if (window.startOnboarding) {
                    window.startOnboarding();
                } else {
                    console.warn('[Main] Módulo onboarding não encontrado.');
                }
            }, 800);
        } else {
            console.log('[Main] Onboarding já concluído e perfil preenchido.');
        }
    }

    // ========== INICIALIZAÇÃO ==========
    const savedLang = localStorage.getItem('selectedLanguage') || 'pt-br';
    console.log('[Main] Idioma inicial:', savedLang);

    // Aguarda o i18n central ser carregado
    if (window.i18n && typeof window.i18n.setLanguage === 'function') {
        await window.i18n.setLanguage(savedLang);
    } else {
        console.warn('[Main] i18n central não disponível, usando fallback.');
        // Fallback: carregar traduções manualmente
        try {
            const response = await fetch(`lang/${savedLang}.json`);
            if (response.ok) {
                window.__translations = await response.json();
                if (window.applyTranslations) window.applyTranslations();
            }
        } catch (e) {
            console.warn('[Main] Fallback de tradução falhou:', e);
        }
    }

    // Carregar cursos e renderizar
    console.log('[Main] Carregando cursos...');
    const coursesLoaded = await loadCourses();
    if (!coursesLoaded) {
        console.error('[Main] Falha ao carregar cursos. A página pode não funcionar corretamente.');
        const container = document.getElementById('carouselContainer');
        if (container) {
            container.innerHTML = `<p class="error">${t('error_load_courses')}</p>`;
        }
    } else {
        console.log('[Main] Cursos carregados com sucesso.');
        renderRandomSlides();
        setupSlider();
        setupSliderLinks();
        await renderCourseCards();
        initHomeFilters();
    }

    initProfile();
    // O acesso às páginas é livre; o cadastro/login é aberto pelo botão do menu.

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
    if (typeof YT !== 'undefined' && YT.loaded) {
        onYouTubeIframeAPIReady();
    }

    initTabs();
    bindNotificationPositionUpdates();

    // ========== REAGIR A MUDANÇAS DE IDIOMA ==========
    window.addEventListener('languageChanged', function(e) {
        const lang = e.detail.lang || 'pt-br';
        console.log('[Main] Idioma alterado para:', lang);
        if (typeof window.applyTranslations === 'function') window.applyTranslations();
        if (currentCourse) {
            renderCurrentLessonPanel();
            renderUnifiedCourseContent();
            if (activeTab === 'bibliografia' && typeof renderBooksFilteredByDiscipline === 'function') {
                renderBooksFilteredByDiscipline(currentDiscipline);
            } else if (activeTab === 'contributors' && typeof renderContributorsTab === 'function') {
                renderContributorsTab();
            } else if (activeTab === 'license' && typeof renderLicenseTab === 'function') {
                renderLicenseTab();
            } else if (activeTab === 'team') {
                const teamGrid = document.getElementById('team-grid');
                if (teamGrid && typeof loadTeamAndContributors === 'function') {
                    loadTeamAndContributors(currentCourse);
                }
            } else if (activeTab === 'pratica' && typeof currentPracticeData !== 'undefined' && currentPracticeData && typeof renderPracticeGrid === 'function') {
                renderPracticeGrid(currentPracticeData);
            }
        }
        const homeScreen = document.getElementById('homeScreen');
        if (homeScreen && homeScreen.style.display !== 'none' && !_renderingCourses) {
            renderCourseCards();
        }
        setupSliderLinks();
        const slider = document.getElementById('homeSlider');
        if (slider && slider.style.display !== 'none') {
            renderRandomSlides();
            goToSlide(1, true);
            startSliderAutoPlay();
        }
    });

    console.log('[Main] Inicialização concluída com sucesso.');
});