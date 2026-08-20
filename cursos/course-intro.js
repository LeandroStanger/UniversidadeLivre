// course-intro.js – Versão 4.1 – COMPLETO E AUTOSSUFICIENTE
// Modal de introdução para todos os cursos da Universidade Livre
// Suporte a: Administração, Matemática (Licenciatura), Engenharia de Computação,
// Engenharia de Produção, Letras – Habilitação em Língua Portuguesa,
// Pedagogia, e todos os demais cursos da plataforma.
// Inclui i18n, detecção de idioma, cache de dados e prevenção de reexibição.

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('courseIntroModal');
    const closeBtn = modal?.querySelector('.close-intro');
    const startBtn = modal?.querySelector('.start-lesson-btn');
    const dontShowCheckbox = document.getElementById('dontShowAgain');
    const contentDiv = document.getElementById('introContent');

    let currentCourseId = null;
    let introData = null;

    // ========== FUNÇÃO DE TRADUÇÃO (fallback) ==========
    function t(key, replacements = {}) {
        if (window.getTranslation) return window.getTranslation(key, replacements);
        const fallbacks = {
            'intro_start': 'Começar aula agora',
            'intro_dont_show': 'Não mostrar novamente',
            'completion_go_graduation': 'Ir para Graduação',
            'completion_go_postgrad': 'Ir para Pós-Graduação',
            'completion_go_other': 'Ir para Outra Pós-Graduação'
        };
        let text = fallbacks[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== MAPEAMENTO DE IDs PARA CHAVES NO JSON ==========
    const courseIdToJsonKey = {
        'administracao': 'administracao',
        'ciencia_de_dados': 'ciencia_de_dados',
        'computacao': 'ciencia_computacao',
        'computacao_grafica': 'computacao_grafica',
        'computer-science': 'computer-science',
        'cybersecurity': 'cybersecurity',
        'desenvolvimento_web': 'desenvolvimento_web',
        'devops': 'devops',
        'embarcados': 'embarcados',
        'enem': 'enem',
        'engenharia_computacao': 'engenharia_computacao',
        'engenharia-producao': 'engenharia-producao',
        'espanhol': 'espanhol',
        'espanhol-ingles': 'espanhol-ingles',
        'espcex': 'espcex',
        'ingles': 'ingles',
        'japones': 'japones',
        'japones-ingles': 'japones-ingles',
        'letras-portugues': 'letras-portugues',
        'matematica': 'matematica',
        'matematica-licenciatura': 'matematica-licenciatura',
        'math': 'math',
        'pedagogia': 'pedagogia',
        'portugues-brasileiro': 'portugues-brasileiro'
    };

    // ========== CURSOS COM INTRODUÇÃO PERSONALIZADA ==========
    const supportedCourses = [
        'administracao',
        'ciencia_de_dados',
        'computacao',
        'computacao_grafica',
        'computer-science',
        'cybersecurity',
        'desenvolvimento_web',
        'devops',
        'embarcados',
        'enem',
        'engenharia_computacao',
        'engenharia-producao',
        'espanhol',
        'espanhol-ingles',
        'espcex',
        'ingles',
        'japones',
        'japones-ingles',
        'letras-portugues',
        'matematica',
        'matematica-licenciatura',
        'math',
        'pedagogia',
        'portugues-brasileiro'
    ];

    // ========== CARREGAR DADOS DE INTRODUÇÃO ==========
    async function loadIntroData() {
        if (introData) return introData;
        try {
            const response = await fetch('cursos/intro-data.json');
            if (!response.ok) throw new Error('Erro ao carregar dados de introdução');
            introData = await response.json();
            return introData;
        } catch (error) {
            console.error('Erro ao carregar introdução:', error);
            return null;
        }
    }

    // ========== ABRIR LINKS EM NOVA ABA ==========
    function makeLinksOpenInNewTab(container) {
        if (!container) return;
        const links = container.querySelectorAll('a');
        links.forEach(link => {
            if (!link.hasAttribute('target')) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    // ========== RENDERIZAR CONTEÚDO DO CURSO ==========
    async function renderContent(courseId) {
        const data = await loadIntroData();
        if (!data) return false;

        const jsonKey = courseIdToJsonKey[courseId] || courseId;
        const courseData = data[jsonKey];
        if (!courseData) {
            console.error(`Dados não encontrados para o curso: ${courseId} (chave: ${jsonKey})`);
            return false;
        }

        const logoImg = modal.querySelector('.intro-logo-large');
        if (logoImg) logoImg.src = courseData.imageUrl;

        if (contentDiv) {
            contentDiv.innerHTML = courseData.readmeContent;
            makeLinksOpenInNewTab(contentDiv);
        }

        const socialDiv = modal.querySelector('.social-icons');
        if (socialDiv && courseData.socialLinks) {
            socialDiv.innerHTML = courseData.socialLinks.map(link => `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer">
                    <i class="${link.icon}"></i> ${link.name}
                </a>
            `).join('');
        }

        return true;
    }

    // ========== FUNÇÃO PÚBLICA PARA VERIFICAR E EXIBIR INTRODUÇÃO ==========
    window.checkCourseIntro = async function(courseId) {
        const completedKey = `course_completed_${courseId}`;
        if (localStorage.getItem(completedKey) === 'true') {
            console.log(`[Intro] Curso ${courseId} já concluído, não exibindo introdução.`);
            return false;
        }

        const storageKey = `intro_seen_${courseId}`;
        const alreadySeen = localStorage.getItem(storageKey) === 'true';
        if (alreadySeen) return false;

        if (!supportedCourses.includes(courseId)) {
            console.log(`[Intro] Curso ${courseId} não possui introdução personalizada.`);
            return false;
        }

        const success = await renderContent(courseId);
        if (success) {
            currentCourseId = courseId;
            modal.classList.add('show');
            modal.style.display = 'flex';
            updateModalTexts();
            return true;
        }
        return false;
    };

    // ========== FECHAR MODAL E SALVAR PREFERÊNCIA ==========
    function closeModalAndSave() {
        if (dontShowCheckbox && dontShowCheckbox.checked && currentCourseId) {
            const storageKey = `intro_seen_${currentCourseId}`;
            localStorage.setItem(storageKey, 'true');
        }
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    // ========== INICIAR AULA ==========
    function startLesson() {
        if (window.onIntroClosed && typeof window.onIntroClosed === 'function') {
            window.onIntroClosed();
        }
        closeModalAndSave();
    }

    // ========== ATUALIZAR TEXTOS DO MODAL (i18n) ==========
    function updateModalTexts() {
        const startBtnText = document.getElementById('startLessonBtn');
        const dontShowLabel = document.querySelector('.dont-show-again span');
        if (startBtnText) startBtnText.innerText = t('intro_start');
        if (dontShowLabel) dontShowLabel.innerText = t('intro_dont_show');
    }

    // ========== EVENTOS GLOBAIS ==========
    window.addEventListener('languageChanged', updateModalTexts);

    // ========== EVENTOS DO MODAL ==========
    if (closeBtn) closeBtn.addEventListener('click', closeModalAndSave);
    if (startBtn) startBtn.addEventListener('click', startLesson);

    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModalAndSave();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeModalAndSave();
    });

    // ========== INICIALIZAR TEXTOS ==========
    updateModalTexts();

    console.log('[Intro] Módulo de introdução carregado com sucesso.');
});