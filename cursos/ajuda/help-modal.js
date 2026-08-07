// help-modal.js – versão com i18n e suporte a ENEM, EsPCEx, INGLÊS, ESPANHOL e ESPANHOL-INGLÊS
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('helpModal');
    if (!modal) {
        console.warn('[help-modal] Elemento #helpModal não encontrado.');
        return;
    }
    const closeBtn = modal.querySelector('.close-help');
    const modalBody = document.getElementById('helpContent');
    const modalTitle = document.getElementById('helpModalTitle');

    let currentCourse = null;

    // Função para obter tradução
    function t(key, replacements = {}) {
        if (window.getTranslation) return window.getTranslation(key, replacements);
        let text = key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    window.setCurrentCourseForHelp = (courseId) => {
        const courseMap = {
            'computacao': 'ciencia_computacao',
            'matematica': 'matematica',
            'computacao_grafica': 'computacao_grafica',
            'embarcados': 'embarcados',
            'desenvolvimento_web': 'desenvolvimento_web',
            'cybersecurity': 'cybersecurity',
            'devops': 'devops',
            'ciencia_de_dados': 'ciencia_de_dados',
            'computer-science': 'computer-science',
            'math': 'math',
            'enem': 'enem',
            'espcex': 'espcex',
            'ingles': 'ingles',
            'espanhol': 'espanhol',
            'espanhol-ingles': 'espanhol-ingles'   // <-- ADICIONADO
        };
        currentCourse = courseMap[courseId] || courseId;
        const helpButton = document.getElementById('helpButton');
        if (helpButton) {
            const supportedCourses = [
                'computacao', 'matematica', 'computacao_grafica', 'embarcados',
                'desenvolvimento_web', 'cybersecurity', 'devops', 'ciencia_de_dados',
                'computer-science', 'math', 'enem', 'espcex',
                'ingles', 'espanhol',
                'espanhol-ingles'   // <-- ADICIONADO
            ];
            helpButton.style.display = supportedCourses.includes(courseId) ? 'inline-flex' : 'none';
        }
        console.log(`[Ajuda] Curso definido: ${currentCourse} (original: ${courseId})`);
        if (modalTitle) {
            let courseName = '';
            if (courseId === 'computacao') courseName = 'Ciência da Computação';
            else if (courseId === 'matematica') courseName = 'Matemática';
            else if (courseId === 'computer-science') courseName = 'Computer Science';
            else if (courseId === 'math') courseName = 'Math';
            else if (courseId === 'enem') courseName = 'ENEM';
            else if (courseId === 'espcex') courseName = 'EsPCEx';
            else if (courseId === 'ingles') courseName = 'Inglês';
            else if (courseId === 'espanhol') courseName = 'Espanhol';
            else if (courseId === 'espanhol-ingles') courseName = 'Spanish (for English Speakers)';
            else courseName = courseId;
            modalTitle.innerText = t('help_modal_title', { course: courseName });
        }
    };

    async function loadHelpContent() {
        if (!currentCourse) {
            if (modalBody) modalBody.innerHTML = `<p>${t('help_unknown_course')}</p>`;
            console.warn('[Ajuda] Curso não definido ao carregar conteúdo.');
            return;
        }
        try {
            const response = await fetch('cursos/ajuda/help-data.json');
            if (!response.ok) throw new Error('Erro ao carregar dados de ajuda');
            const data = await response.json();

            const courseData = data[currentCourse];
            if (!courseData) {
                if (modalBody) modalBody.innerHTML = `<p>${t('help_unavailable')}</p>`;
                console.warn(`[Ajuda] Curso "${currentCourse}" não encontrado no JSON.`);
                return;
            }

            if (modalTitle) modalTitle.innerText = courseData.title;

            let html = '';
            if (courseData.sections && courseData.sections.length) {
                courseData.sections.forEach(section => {
                    if (section.heading) html += `<h3>${escapeHtml(section.heading)}</h3>`;
                    if (section.content) html += `<p>${escapeHtml(section.content)}</p>`;
                    if (section.subsections) {
                        section.subsections.forEach(sub => {
                            html += `<h4>${escapeHtml(sub.heading)}</h4>`;
                            html += `<p>${escapeHtml(sub.content)}</p>`;
                        });
                    }
                    if (section.links) {
                        html += '<ul>';
                        section.links.forEach(link => {
                            html += `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.text)}</a></li>`;
                        });
                        html += '</ul>';
                    }
                });
            } else {
                html = '<p>Nenhuma seção de ajuda encontrada.</p>';
            }
            if (modalBody) modalBody.innerHTML = html;
        } catch (error) {
            console.error('[Ajuda] Erro ao carregar ajuda:', error);
            if (modalBody) modalBody.innerHTML = '<p>Erro ao carregar conteúdo de ajuda. Tente novamente mais tarde.</p>';
        }
    }

    function openHelp() {
        modal.classList.add('show');
        modal.style.display = 'flex';
        loadHelpContent();
    }

    function closeHelp() {
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    const helpButton = document.getElementById('helpButton');
    if (helpButton) helpButton.addEventListener('click', openHelp);
    if (closeBtn) closeBtn.addEventListener('click', closeHelp);
    window.addEventListener('click', (e) => { if (e.target === modal) closeHelp(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeHelp(); });

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
});