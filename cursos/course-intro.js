// course-intro.js – Versão 3.0 – COMPLETO COM SUPORTE A TODOS OS CURSOS
// Inclui: Administração, Matemática (Licenciatura), Engenharia de Computação e todos os demais

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('courseIntroModal');
    const closeBtn = modal?.querySelector('.close-intro');
    const startBtn = modal?.querySelector('.start-lesson-btn');
    const dontShowCheckbox = document.getElementById('dontShowAgain');
    const contentDiv = document.getElementById('introContent');

    let currentCourseId = null;
    let introData = null;

    // Função para obter tradução do sistema global (se disponível)
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

    // Mapeamento de IDs de curso para chaves no JSON (caso necessário)
    // A maioria usa o próprio ID, mas alguns têm nomes diferentes no JSON
    const courseIdToJsonKey = {
        'computacao': 'ciencia_computacao',
        'matematica': 'matematica',
        'matematica-licenciatura': 'matematica-licenciatura',
        'administracao': 'administracao',
        'ciencia_de_dados': 'ciencia_de_dados',
        'computacao_grafica': 'computacao_grafica',
        'embarcados': 'embarcados',
        'desenvolvimento_web': 'desenvolvimento_web',
        'cybersecurity': 'cybersecurity',
        'devops': 'devops',
        'computer-science': 'computer-science',
        'math': 'math',
        'enem': 'enem',
        'espcex': 'espcex',
        'ingles': 'ingles',
        'espanhol': 'espanhol',
        'espanhol-ingles': 'espanhol-ingles',
        'japones': 'japones',
        'portugues-brasileiro': 'portugues-brasileiro',
        'japones-ingles': 'japones-ingles',
        'engenharia_computacao': 'engenharia_computacao'
    };

    // Lista de cursos com suporte a introdução personalizada
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
        'espanhol',
        'espanhol-ingles',
        'espcex',
        'ingles',
        'japones',
        'japones-ingles',
        'matematica',
        'matematica-licenciatura',
        'math',
        'portugues-brasileiro'
    ];

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

    window.checkCourseIntro = async function(courseId) {
        const completedKey = `course_completed_${courseId}`;
        if (localStorage.getItem(completedKey) === 'true') {
            console.log(`[Intro] Curso ${courseId} já concluído, não exibindo introdução.`);
            return false;
        }

        const storageKey = `intro_seen_${courseId}`;
        const alreadySeen = localStorage.getItem(storageKey) === 'true';
        if (alreadySeen) return false;

        // Verifica se o curso tem suporte a introdução
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

    function closeModalAndSave() {
        if (dontShowCheckbox && dontShowCheckbox.checked && currentCourseId) {
            const storageKey = `intro_seen_${currentCourseId}`;
            localStorage.setItem(storageKey, 'true');
        }
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    function startLesson() {
        if (window.onIntroClosed && typeof window.onIntroClosed === 'function') {
            window.onIntroClosed();
        }
        closeModalAndSave();
    }

    function updateModalTexts() {
        const startBtnText = document.getElementById('startLessonBtn');
        const dontShowLabel = document.querySelector('.dont-show-again span');
        if (startBtnText) startBtnText.innerText = t('intro_start');
        if (dontShowLabel) dontShowLabel.innerText = t('intro_dont_show');
    }

    window.addEventListener('languageChanged', updateModalTexts);

    if (closeBtn) closeBtn.addEventListener('click', closeModalAndSave);
    if (startBtn) startBtn.addEventListener('click', startLesson);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModalAndSave();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeModalAndSave();
    });

    updateModalTexts();
});