// help-modal.js – versão 3.0
// Modal de ajuda com i18n, suporte a todos os cursos e carregamento dinâmico de dados
// Inclui: ENEM, EsPCEx, INGLÊS, ESPANHOL, ESPANHOL-INGLÊS, JAPONÊS, PORTUGUÊS BRASILEIRO, JAPONÊS-INGLÊS

(function() {
    'use strict';

    // ========== ELEMENTOS DOM ==========
    let modal = null;
    let closeBtn = null;
    let modalBody = null;
    let modalTitle = null;
    let helpButton = null;

    let currentCourse = null;               // ID do curso (ex: 'ciencia_computacao')
    let helpDataCache = null;              // Cache do JSON
    let translationsFallbackApplied = false;

    // ========== FUNÇÃO DE TRADUÇÃO (com fallback) ==========
    function t(key, replacements = {}) {
        // Tenta usar a função global de tradução se disponível
        if (window.getTranslation && typeof window.getTranslation === 'function') {
            try {
                return window.getTranslation(key, replacements);
            } catch (e) {
                // fallback
            }
        }

        // Fallback interno (apenas para chaves críticas)
        const fallbacks = {
            'help_modal_title': 'Ajuda - {{course}}',
            'help_unknown_course': 'Curso não identificado.',
            'help_unavailable': 'Conteúdo de ajuda não disponível para este curso.',
            'loading': 'Carregando...',
            'error_loading': 'Erro ao carregar conteúdo de ajuda. Tente novamente mais tarde.',
            'help_button': 'Ajuda'
        };

        let text = fallbacks[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== CARREGAMENTO DE DADOS ==========
    async function loadHelpData() {
        if (helpDataCache) return helpDataCache;
        try {
            const response = await fetch('cursos/ajuda/help-data.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            helpDataCache = await response.json();
            console.log('[Ajuda] Dados carregados com sucesso');
            return helpDataCache;
        } catch (error) {
            console.error('[Ajuda] Erro ao carregar help-data.json:', error);
            return null;
        }
    }

    // ========== ESCAPE HTML ==========
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========== RENDERIZAR CONTEÚDO ==========
    async function renderHelpContent() {
        if (!modalBody) return;

        if (!currentCourse) {
            modalBody.innerHTML = `<p>${t('help_unknown_course')}</p>`;
            console.warn('[Ajuda] Curso não definido ao carregar conteúdo.');
            return;
        }

        const data = await loadHelpData();
        if (!data) {
            modalBody.innerHTML = `<p>${t('error_loading')}</p>`;
            return;
        }

        const courseData = data[currentCourse];
        if (!courseData) {
            modalBody.innerHTML = `<p>${t('help_unavailable')}</p>`;
            console.warn(`[Ajuda] Curso "${currentCourse}" não encontrado no JSON.`);
            return;
        }

        // Atualizar título do modal
        if (modalTitle) {
            // O título pode vir do JSON ou ser gerado
            const title = courseData.title || t('help_modal_title', { course: currentCourse });
            modalTitle.innerText = title;
        }

        // Construir HTML a partir das seções
        let html = '';
        if (courseData.sections && courseData.sections.length) {
            courseData.sections.forEach(section => {
                if (section.heading) {
                    html += `<h3>${escapeHtml(section.heading)}</h3>`;
                }
                if (section.content) {
                    html += `<p>${escapeHtml(section.content)}</p>`;
                }
                if (section.subsections) {
                    section.subsections.forEach(sub => {
                        if (sub.heading) html += `<h4>${escapeHtml(sub.heading)}</h4>`;
                        if (sub.content) html += `<p>${escapeHtml(sub.content)}</p>`;
                    });
                }
                if (section.links && section.links.length) {
                    html += '<div class="links-grid">';
                    section.links.forEach(link => {
                        html += `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${escapeHtml(link.text)}</a>`;
                    });
                    html += '</div>';
                }
            });
        } else {
            html = `<p>${t('help_unavailable')}</p>`;
        }

        modalBody.innerHTML = html;

        // Reaplicar traduções para elementos dentro do conteúdo (caso contenham data-i18n)
        if (window.applyTranslations && typeof window.applyTranslations === 'function') {
            window.applyTranslations();
        }
    }

    // ========== ABRIR / FECHAR MODAL ==========
    function openHelp() {
        if (!modal) return;
        modal.classList.add('show');
        modal.style.display = 'flex';
        renderHelpContent();
    }

    function closeHelp() {
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
    }

    // ========== CONFIGURAR CURSO ATUAL ==========
    function setCurrentCourse(courseId) {
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
            'espanhol-ingles': 'espanhol-ingles',
            'japones': 'japones',
            'portugues-brasileiro': 'portugues-brasileiro',
            'japones-ingles': 'japones-ingles'
        };

        currentCourse = courseMap[courseId] || courseId;

        // Mostrar/esconder botão de ajuda conforme suporte
        const supportedCourses = [
            'computacao', 'matematica', 'computacao_grafica', 'embarcados',
            'desenvolvimento_web', 'cybersecurity', 'devops', 'ciencia_de_dados',
            'computer-science', 'math', 'enem', 'espcex',
            'ingles', 'espanhol', 'espanhol-ingles', 'japones',
            'portugues-brasileiro', 'japones-ingles'
        ];
        if (helpButton) {
            helpButton.style.display = supportedCourses.includes(courseId) ? 'inline-flex' : 'none';
        }

        console.log(`[Ajuda] Curso definido: ${currentCourse} (original: ${courseId})`);
    }

    // ========== INICIALIZAÇÃO ==========
    function init() {
        // Capturar elementos
        modal = document.getElementById('helpModal');
        if (!modal) {
            console.warn('[Ajuda] Elemento #helpModal não encontrado.');
            return;
        }

        closeBtn = modal.querySelector('.close-help');
        modalBody = document.getElementById('helpContent');
        modalTitle = document.getElementById('helpModalTitle');
        helpButton = document.getElementById('helpButton');

        // Expor função para definir curso
        window.setCurrentCourseForHelp = setCurrentCourse;

        // Event listeners
        if (helpButton) {
            helpButton.addEventListener('click', openHelp);
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', closeHelp);
        }

        // Fechar ao clicar fora
        window.addEventListener('click', (e) => {
            if (e.target === modal) closeHelp();
        });

        // Fechar com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.style.display === 'flex') {
                closeHelp();
            }
        });

        // Atualizar conteúdo se o idioma mudar (quando o modal estiver aberto)
        window.addEventListener('languageChanged', () => {
            if (modal && modal.style.display === 'flex') {
                renderHelpContent();
            }
        });

        console.log('[Ajuda] Módulo inicializado com sucesso');
    }

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();