// ============================================================
// script.js – Versão 27.2 – COM SLIDER LOOP INFINITO E PREVIEW LATERAL
// CORREÇÃO: Slider com loop infinito (clones do primeiro e último slide)
// CORREÇÃO: Preview lateral com 10% de visibilidade dos slides adjacentes
// CORREÇÃO: Navegação suave com redirecionamento automático entre clones
// CORREÇÃO: Chip ativo com underline via box-shadow (CSS)
// CORREÇÃO: Centralização do i18n com window.t()
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
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

    // ========== SISTEMA DE IDIOMA (i18n) ==========
    let currentLang = 'pt-br';
    let translations = {};

    function detectSystemLanguage() {
        const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        if (browserLang.startsWith('pt')) return 'pt-br';
        if (browserLang.startsWith('en')) return 'en';
        return 'en';
    }

    async function loadTranslations(lang) {
        // Tenta usar o módulo central i18n
        if (window.i18n && typeof window.i18n.loadTranslations === 'function') {
            try {
                await window.i18n.loadTranslations(lang);
                translations = window.i18n.getTranslations ? window.i18n.getTranslations() : {};
                if (Object.keys(translations).length > 0) {
                    console.log('[Main] Traduções carregadas do módulo central i18n');
                    return true;
                }
            } catch (e) {
                console.warn('[Main] Falha ao carregar do módulo central:', e);
            }
        }

        // Fallback: tenta carregar o arquivo JSON diretamente
        try {
            const response = await fetch(`lang/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            translations = await response.json();
            return true;
        } catch (error) {
            if (lang !== 'pt-br') return loadTranslations('pt-br');
            // Fallback inline mínimo
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
                "ensino_medio": "Ensino Médio",
                "idiomas": "Idiomas",
                "licenciatura": "Licenciatura",
                "tecnologo": "Tecnólogo",
                "mestrado": "Mestrado",
                "doutorado": "Doutorado",
                "especializacao": "Especialização",
                "donate_button": "Doar",
                "donate_text": "Doar",
                "main_program_description": "Ciência da Computação, Matemática e Computação Gráfica · Cursos de Graduação e Pós-graduação",
                "course_hours": "Carga horária",
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
                "unavailable": "Indisponível",
                "price_free": "Grátis",
                "price_paid": "Pago",
                "badge_live": "AO VIVO",
                "badge_podcast": "PODCAST",
                "badge_shorts": "SHORTS",
                "search_practice_placeholder": "Buscar práticas...",
                "no_practice": "Nenhuma prática disponível.",
                "practice_unavailable": "Conteúdo indisponível.",
                "exercise_type_practice": "Prática",
                "exercise_type_challenge": "Desafio",
                "exercise_type_assessment": "Avaliação",
                "external_lesson_desc": "Conteúdo em plataforma externa.",
                "external_platform_default": "Plataforma externa",
                "external_instruction": "Após concluir, marque como concluído.",
                "go_to_platform": "Ir para a plataforma",
                "external_footer_note": "Clique em \"Marcar como concluída\" após terminar.",
                "exercise_lesson_desc": "Atividade prática.",
                "profile": "Perfil",
                "filter_all": "Todos",
                "filter_by_level": "Filtrar por nível:",
                "no_courses_found": "Nenhum curso encontrado.",
                "search_courses_placeholder": "Buscar cursos...",
                "streak_days": "dias",
                "library_button": "Biblioteca",
                "mark_as_read": "Marcar como lido",
                "marked_as_read": "Marcado como lido",
                "unmark_as_read": "Desmarcar como lido",
                "books_read": "Livros lidos",
                "profile_title": "Meu Perfil",
                "profile_change_photo": "Alterar foto",
                "profile_name": "Nome",
                "profile_gender": "Gênero",
                "profile_password": "Senha",
                "profile_save_name": "Salvar Nome",
                "profile_save": "Salvar",
                "profile_save_progress": "Salvar Progresso",
                "profile_import_progress": "Importar Progresso",
                "profile_watched_videos": "Vídeos assistidos",
                "profile_total_videos": "Total de vídeos",
                "profile_completed_lessons": "Lições concluídas",
                "profile_completed_disciplines": "Disciplinas concluídas",
                "profile_total_points": "Pontuação total",
                "profile_auditorio_hours": "Horas no Auditório",
                "profile_saved_courses": "Cursos salvos",
                "profile_no_courses": "Nenhum curso iniciado.",
                "profile_in_progress": "Em andamento",
                "profile_completed": "Concluído",
                "profile_export_import": "Exportar / Importar",
                "profile_select_notes": "Selecione notas:",
                "profile_data_note": "Dados locais. Senha criptografa a exportação.",
                "profile_matricula": "Matrícula:",
                "profile_choose_avatar": "Escolher foto",
                "profile_avatar_description": "Selecione uma imagem.",
                "profile_upload": "Enviar",
                "profile_remove_photo": "Remover",
                "profile_license": "Licença",
                "profile_no_notes": "Nenhuma nota.",
                "profile_name_saved": "Nome salvo!",
                "profile_gender_saved": "Gênero salvo!",
                "profile_password_saved": "Senha salva!",
                "profile_avatar_updated": "Avatar atualizado!",
                "profile_avatar_removed": "Avatar removido.",
                "profile_export_success": "Exportado com sucesso!",
                "profile_import_success": "✅ Importado! {{count}} cursos.",
                "profile_import_confirm": "⚠️ Substituirá dados atuais. Continuar?",
                "profile_remove_confirm": "Remover foto?",
                "profile_no_password_confirm": "Exportar sem criptografia?",
                "profile_encrypt_error": "Erro na criptografia.",
                "profile_export_error": "Erro ao exportar.",
                "profile_import_error": "Erro ao importar.",
                "profile_invalid_file": "Arquivo inválido.",
                "profile_password_incorrect": "Senha incorreta.",
                "profile_password_required": "Digite a senha.",
                "profile_password_min": "Mínimo 8 caracteres.",
                "profile_password_weak": "Senha fraca: ",
                "profile_avatar_too_big": "Imagem muito grande.",
                "profile_avatar_upload_error": "Erro ao processar.",
                "profile_avatar_storage_error": "Imagem muito grande para armazenar.",
                "profile_avatar_save_error": "Erro ao salvar.",
                "profile_processing": "Processando...",
                "profile_select_image": "Selecione uma imagem.",
                "profile_image_too_big": "Máximo 5 MB.",
                "profile_name_required": "Nome obrigatório.",
                "profile_password_saved_indicator": "Senha salva",
                "profile_no_password_saved": "Nenhuma senha",
                "profile_gender_not_informed": "Não informado",
                "profile_gender_masculine": "Masculino",
                "profile_gender_feminine": "Feminino",
                "profile_gender_other": "Outro",
                "profile_export_courses": "Cursos",
                "profile_export_videos": "Vídeos",
                "profile_export_books": "Livros lidos",
                "profile_export_notes": "Notas",
                "onboarding_welcome_title": "Bem-vindo",
                "onboarding_welcome_text": "Educação autodidata gratuita.",
                "onboarding_about_title": "Sobre o projeto",
                "onboarding_about_text": "Cursos curados gratuitos.",
                "onboarding_form_title": "Crie seu perfil",
                "onboarding_form_name_label": "Nome",
                "onboarding_form_name_placeholder": "Seu nome",
                "onboarding_form_gender_label": "Gênero",
                "onboarding_form_gender_not_informed": "Não informado",
                "onboarding_form_gender_masculine": "Masculino",
                "onboarding_form_gender_feminine": "Feminino",
                "onboarding_form_gender_other": "Outro",
                "onboarding_form_username_label": "Usuário (opcional)",
                "onboarding_form_username_placeholder": "Apelido",
                "onboarding_confirm_title": "Pronto!",
                "onboarding_confirm_text": "Comece sua jornada.",
                "onboarding_button_start": "Começar",
                "onboarding_button_next": "Próximo",
                "onboarding_button_prev": "Voltar",
                "onboarding_button_finish": "Concluir",
                "onboarding_error_name_required": "Nome obrigatório."
            };
            console.warn("[i18n] Usando fallback interno.");
            return false;
        }
    }

    function t(key, replacements = {}) {
        // Usa window.t se disponível (módulo central)
        if (window.t && typeof window.t === 'function') {
            try {
                return window.t(key, replacements);
            } catch (e) { /* fallback */ }
        }
        let text = translations[key] || key;
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
            ptBtn.classList.toggle('active', lang === 'pt-br');
            enBtn.classList.toggle('active', lang === 'en');
        }
    }

    function applyTranslations() {
        if (!translations || Object.keys(translations).length === 0) return;

        // Se window.applyTranslations estiver disponível, usa-o
        if (window.applyTranslations && typeof window.applyTranslations === 'function') {
            try {
                window.applyTranslations();
                return;
            } catch (e) {
                console.warn('[Main] Erro ao chamar applyTranslations central:', e);
            }
        }

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
            if (key && translations[key]) el.placeholder = translations[key];
        });
        document.title = t('app_title');
    }

    async function setLanguage(lang) {
        if (lang === currentLang && Object.keys(translations).length > 0) {
            applyTranslations();
            return;
        }
        await loadTranslations(lang);
        currentLang = lang;
        localStorage.setItem('selectedLanguage', lang);
        applyTranslations();
        updateLanguageSelector(lang);
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        if (typeof applyAllModuleTranslations === 'function') applyAllModuleTranslations();
    }

    window.setLanguage = setLanguage;

    const langPtBtn = document.getElementById('langPtBtn');
    const langEnBtn = document.getElementById('langEnBtn');
    if (langPtBtn && langEnBtn) {
        langPtBtn.addEventListener('click', () => setLanguage('pt-br'));
        langEnBtn.addEventListener('click', () => setLanguage('en'));
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
        return nameObj[currentLang] || nameObj.pt || courseId;
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
    let playerVolume = 80;
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

    // ========== IMAGENS DOS CURSOS ==========
    const imageCache = new Map();

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
        return 'cursos/imagen-card.png';
    }

    async function imageExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    }

    async function getCourseImageUrl(courseId) {
        if (imageCache.has(courseId)) return imageCache.get(courseId);

        const specificPath = getCourseImagePath(courseId);
        const fallbackPath = 'cursos/imagen-card.png';
        let finalUrl = fallbackPath;

        try {
            const specificExists = await imageExists(specificPath);
            if (specificExists) {
                finalUrl = specificPath;
            } else {
                const fallbackExists = await imageExists(fallbackPath);
                if (!fallbackExists) {
                    finalUrl = `https://placehold.co/600x300/1A2638/6C8CFF?text=${encodeURIComponent(courseId)}`;
                }
            }
        } catch (error) {
            finalUrl = `https://placehold.co/600x300/1A2638/6C8CFF?text=${encodeURIComponent(courseId)}`;
        }

        imageCache.set(courseId, finalUrl);
        return finalUrl;
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

    // Cache para license.json
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

    // ========== RENDERIZAÇÃO DAS ABAS ==========
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
        applyTranslations();
        observeAnimateElements();
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
        applyTranslations();
        observeAnimateElements();
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
        applyTranslations();
        observeAnimateElements();
    }

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
        if (localStorage.getItem(`course_completed_${currentCourse}`) === 'true') return;

        const total = allVideosFlat.length;
        const watched = allVideosFlat.filter(v => v.watched).length;
        const progressPercent = total ? Math.floor((watched / total) * 100) : 0;

        if (progressPercent >= 100 && !_progressJustHit100) {
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
            stageDiv.className = "stage-group-unified animate-in";
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
        observeAnimateElements();
    }

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
            applyTranslations();
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
        applyTranslations();
        observeAnimateElements();
    }

    // ========== ABA PRÁTICA ==========
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
                const globalResponse = await fetch('pratica/practice-global.json');
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
            introHtml = `<div class="practice-intro animate-in">${escapeHtml(introText)}</div>`;
        }
        const gridContainerHtml = '<div id="practiceGridContainer" class="practice-grid"></div>';
        container.innerHTML = searchHtml + introHtml + gridContainerHtml;
        practiceSearchInput = document.getElementById('practiceSearchInput');
        renderPracticeGrid(currentPracticeData);
        if (practiceSearchInput) {
            practiceSearchInput.addEventListener('input', debounce(() => filterPracticeGrid(), 300));
        }
        applyTranslations();
        observeAnimateElements();
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
        applyTranslations();
        observeAnimateElements();
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

    // ========== GRÁFICO DE PROGRESSO ==========
    function renderProgressChart() {
        const chartContainer = document.getElementById('progressChartContainer');
        if (!chartContainer) return;
        const total = allVideosFlat.length;
        const watched = allVideosFlat.filter(v => v.watched).length;
        const percent = total ? (watched / total) * 100 : 0;
        chartContainer.innerHTML = `
            <div class="progress-chart animate-in" style="margin: 1rem 0; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>${t('course_progress')}</span>
                    <span>${Math.round(percent)}%</span>
                </div>
                <div style="background: var(--bg-secondary); border-radius: 10px; overflow: hidden;">
                    <div style="width: ${percent}%; background: var(--gradient-primary); height: 20px; border-radius: 10px;"></div>
                </div>
            </div>
        `;
        observeAnimateElements();
    }

    // ========== NAVEGAÇÃO ==========
    async function openCourse(courseId) {
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
            const introDisplayed = window.checkCourseIntro && window.checkCourseIntro(courseId);
            if (introDisplayed) window.onIntroClosed = () => { startLesson(); window.onIntroClosed = null; };
            else startLesson();
            updateNotificationPosition();
            updatePracticeTabVisibility();
            renderProgressChart();
            setTimeout(() => {
                if (typeof applyTranslations === 'function') applyTranslations();
            }, 100);
        } catch (error) {
            console.error('[openCourse] Erro ao abrir curso:', error);
            alert('Ocorreu um erro ao abrir o curso. Tente novamente.');
        }
    }

    // ========== EXPORTAÇÃO GLOBAL DA FUNÇÃO openCourse PARA O SLIDER ==========
    window.openCourse = openCourse;

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
                // Recarregar slides aleatórios
                renderRandomSlides();
                startSliderAutoPlay();
            }
        }, 400);

        if (updateInterval) clearInterval(updateInterval);
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

    let sliderCurrentIndex = 0;   // Índice visual (0 = clone do último, 1..5 originais, 6 = clone do primeiro)
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
        overlay.innerHTML = `<h3>${slide.title}</h3><p>${slide.desc}</p>`;
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

        // Cria clones: último original (índice 0), originais (1..5), primeiro original (índice 6)
        const slidesWithClones = [
            { ...originals[originals.length - 1], isClone: true, originalIndex: originals.length - 1 },
            ...originals.map((s, i) => ({ ...s, isClone: false, originalIndex: i })),
            { ...originals[0], isClone: true, originalIndex: 0 }
        ];

        track.innerHTML = '';
        slidesWithClones.forEach((slide, idx) => {
            const slideDiv = createSlideElement(slide, idx);
            if (slide.isClone) {
                // Adiciona classe para identificar clones (opcional)
                slideDiv.classList.add('clone');
            }
            track.appendChild(slideDiv);
        });

        // Guarda referência para uso posterior (opcional)
        window._sliderClones = slidesWithClones;

        setupSlider();
        setupSliderLinks();
        // Iniciar no primeiro slide original (índice 1)
        goToSlide(1, true);
    }

    function goToSlide(index, instant = false) {
        const track = document.querySelector('.home-slider-track');
        if (!track) return;
        const slides = track.querySelectorAll('.home-slide');
        const totalVisual = slides.length; // 7
        if (totalVisual === 0) return;

        // Limita o índice ao intervalo [0, totalVisual-1]
        if (index < 0) index = totalVisual - 1;
        if (index >= totalVisual) index = 0;

        // Aplica a transição
        const translate = SLIDER_PEEK - index * SLIDER_SLIDE_WIDTH;
        track.style.transition = instant ? 'none' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        track.style.transform = `translateX(${translate}%)`;

        // Atualiza dots (somente os 5 originais)
        const realIndex = index - 1; // pois índice 0 é clone do último, 1 é primeiro original
        const dots = document.querySelectorAll('.home-slider-dots .dot');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === realIndex));

        // Se estiver no clone do último (índice 0), redireciona para o último original (índice totalVisual - 2)
        if (index === 0) {
            setTimeout(() => goToSlide(totalVisual - 2, true), 500);
        }
        // Se estiver no clone do primeiro (índice totalVisual - 1), redireciona para o primeiro original (índice 1)
        else if (index === totalVisual - 1) {
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

        // Configurar dots (apenas para os 5 originais, ignorando clones)
        const dotsContainer = document.querySelector('.home-slider-dots');
        if (dotsContainer) {
            dotsContainer.innerHTML = '';
            // Número de dots = 5 (originais)
            const totalOriginals = slides.length - 2;
            for (let i = 0; i < totalOriginals; i++) {
                const dot = document.createElement('span');
                dot.className = 'dot' + (i === 0 ? ' active' : '');
                dot.dataset.index = i;
                dot.addEventListener('click', () => {
                    // Índice visual = i + 1 (porque o índice 0 é clone)
                    goToSlide(i + 1);
                });
                dotsContainer.appendChild(dot);
            }
        }

        // Configurar botões
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

        // Posicionar no primeiro slide original
        goToSlide(1, true);

        // Auto-play
        startSliderAutoPlay();

        // Pausar ao passar o mouse
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

    // ========== ANIMAÇÕES ==========
    function observeAnimateElements() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

        document.querySelectorAll('.animate-in:not(.visible)').forEach(el => {
            observer.observe(el);
        });
        return observer;
    }

    let parallaxObserver = null;

    function initParallaxCards() {
        const cards = document.querySelectorAll('.course-card, .book-mini-card, .book-card, .video-card, .practice-platform-card, .library-card, .audiobook-card');
        cards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                card.style.setProperty('--mouse-x', (x + 0.5) * 100 + '%');
                card.style.setProperty('--mouse-y', (y + 0.5) * 100 + '%');
                const rotateX = y * 4;
                const rotateY = x * 4;
                card.style.transform = `perspective(600px) rotateY(${rotateY}deg) rotateX(${-rotateX}deg) scale(1.02)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)';
            });
        });
    }

    // ========== FILTROS DA PÁGINA INICIAL ==========
    let currentLevelFilter = 'all';
    let currentSearchTermHome = '';

    const LEVEL_ORDER = {
        'ensino-medio': 0,
        'graduacao': 1,
        'pos-graduacao': 2,
        'idiomas': 3
    };

    // ========== MÚLTIPLOS CARROSSÉIS ==========
    const carousels = {};

    function getCarouselId(level) {
        return `carousel-${level}`;
    }

    // ========== RENDERIZAÇÃO DOS CARROSSÉIS / GRADE ==========
    async function renderCourseCards() {
        if (_renderingCourses) {
            console.log('[Main] renderCourseCards já em execução, ignorando chamada.');
            return;
        }
        _renderingCourses = true;

        const container = document.getElementById('carouselContainer');
        if (!container) {
            _renderingCourses = false;
            return;
        }

        container.innerHTML = '';

        if (allCourses.length === 0) {
            try {
                const response = await fetch('cursos/courses.json');
                if (!response.ok) throw new Error('Erro ao carregar lista de cursos');
                allCourses = await response.json();
            } catch (error) {
                console.error('Erro ao carregar cursos:', error);
                container.innerHTML = `<p class="error">${t('error_load_courses')}</p>`;
                _renderingCourses = false;
                return;
            }
        }

        const searchTerm = currentSearchTermHome.trim().toLowerCase();
        const normalizedSearch = searchTerm.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let filteredCourses = allCourses.filter(course => {
            if (currentLevelFilter !== 'all' && course.courseLevel !== currentLevelFilter) return false;
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

        for (const level in grouped) {
            grouped[level].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }

        const activeLevels = currentLevelFilter === 'all' ? levels : [currentLevelFilter];

        let hasCourses = false;

        for (const level of activeLevels) {
            const courses = grouped[level] || [];
            if (courses.length === 0) continue;
            hasCourses = true;

            const useCarousel = (currentLevelFilter === 'all' || level === 'graduacao' || level === 'ensino-medio');

            if (level === 'graduacao' && currentLevelFilter === 'graduacao') {
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
                    carouselContainer.id = getCarouselId(level + '_' + type);

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
                carouselContainer.id = getCarouselId(level);

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

        applyTranslations();
        observeAnimateElements();
        initParallaxCards();
        _renderingCourses = false;
    }

    async function createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card animate-in';
        card.dataset.course = course.id;

        const imageUrl = await getCourseImageUrl(course.id);
        const totalMinutes = await computeCourseTotalMinutes(course.id);
        const durationText = totalMinutes > 0 ? `<div class="course-duration"><i class="fas fa-clock"></i> ${t('course_hours')}: ${formatDuration(totalMinutes)}</div>` : '';

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
                     onerror="this.src='${await getCourseImageUrl(course.id)}'">
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
        return card;
    }

    const debouncedRenderCourseCards = debounce(renderCourseCards, 200);

    function initHomeFilters() {
        const searchInput = document.getElementById('courseSearchInput');
        const levelChips = document.querySelectorAll('#levelChips .chip');

        if (searchInput) {
            searchInput.addEventListener('input', debounce(() => {
                currentSearchTermHome = searchInput.value;
                debouncedRenderCourseCards();
            }, 300));
        }

        if (levelChips.length) {
            levelChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const level = chip.dataset.level;
                    currentLevelFilter = level;
                    levelChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    debouncedRenderCourseCards();
                });
            });
        }
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
    const savedLang = localStorage.getItem('selectedLanguage');
    let initialLang;
    if (savedLang) {
        initialLang = savedLang;
        console.log('[Main] Idioma carregado do localStorage:', initialLang);
    } else {
        initialLang = detectSystemLanguage();
        localStorage.setItem('selectedLanguage', initialLang);
    }
    if (initialLang !== 'pt-br' && initialLang !== 'en') {
        initialLang = 'en';
    }
    console.log('[Main] Idioma final para inicialização:', initialLang);
    await setLanguage(initialLang);

    if (Object.keys(translations).length === 0) {
        console.warn('[i18n] Traduções não carregadas, tentando novamente...');
        await setLanguage(initialLang);
    }

    // Renderizar slider aleatório e configurar
    renderRandomSlides();
    setupSlider();
    setupSliderLinks();

    await renderCourseCards();
    initHomeFilters();
    applyTranslations();
    initProfile();
    initOnboarding();

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

    if (typeof YT !== 'undefined' && YT.loaded) {
        onYouTubeIframeAPIReady();
    }

    initTabs();
    bindNotificationPositionUpdates();

    observeAnimateElements();
    initParallaxCards();

    const observer = new MutationObserver(() => {
        observeAnimateElements();
        initParallaxCards();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    console.log('[Main] Inicialização concluída com slider loop infinito e preview lateral.');
    console.log('[Main] Slider com loop infinito e auto-play funcionando.');

    window.addEventListener('languageChanged', function() {
        if (typeof applyAllModuleTranslations === 'function') applyAllModuleTranslations();
        if (typeof currentCourse !== 'undefined' && currentCourse) {
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
            // Recarregar slides aleatórios ao mudar idioma
            renderRandomSlides();
            goToSlide(1, true);
            startSliderAutoPlay();
        }
    });
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
        else if (folderPath && folderPath.includes('idiomas')) level = 'idiomas';
        else level = 'graduacao';
    }
    let buttonText = 'Ir para Graduação';
    if (level === 'graduacao') buttonText = 'Ir para Pós-Graduação';
    else if (level === 'pos-graduacao') buttonText = 'Ir para Outra Pós-Graduação';
    else if (level === 'ensino-medio') buttonText = 'Ir para Graduação';
    else if (level === 'idiomas') buttonText = 'Ir para Graduação';
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