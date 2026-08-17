// help-modal.js – versão 4.0 – COMPLETO COM SUPORTE A TODOS OS CURSOS
// Modal de ajuda com i18n, suporte a todos os cursos e carregamento dinâmico de dados
// Inclui: ENEM, EsPCEx, INGLÊS, ESPANHOL, ESPANHOL-INGLÊS, JAPONÊS, PORTUGUÊS BRASILEIRO,
// JAPONÊS-INGLÊS, ENGENHARIA DE COMPUTAÇÃO e todos os demais

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
            'help_button': 'Ajuda',
            'close': 'Fechar'
        };

        let text = fallbacks[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== Mapeamento de IDs para chaves no help-data.json ==========
    const courseIdToKeyMap = {
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
        'japones-ingles': 'japones-ingles',
        'engenharia_computacao': 'engenharia_computacao'  // NOVO
    };

    // Lista de cursos com suporte a ajuda
    const supportedCourses = [
        'computacao', 'matematica', 'computacao_grafica', 'embarcados',
        'desenvolvimento_web', 'cybersecurity', 'devops', 'ciencia_de_dados',
        'computer-science', 'math', 'enem', 'espcex',
        'ingles', 'espanhol', 'espanhol-ingles', 'japones',
        'portugues-brasileiro', 'japones-ingles', 'engenharia_computacao'
    ];

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
                // Heading
                if (section.heading) {
                    html += `<h3>${escapeHtml(section.heading)}</h3>`;
                }
                // Conteúdo
                if (section.content) {
                    html += `<p>${escapeHtml(section.content)}</p>`;
                }
                // Subseções (FAQ)
                if (section.subsections) {
                    section.subsections.forEach(sub => {
                        if (sub.heading) {
                            html += `<div class="faq-item"><h4>${escapeHtml(sub.heading)}</h4>`;
                        }
                        if (sub.content) {
                            html += `<p>${escapeHtml(sub.content)}</p></div>`;
                        }
                    });
                }
                // Links
                if (section.links && section.links.length) {
                    html += '<div class="links-grid">';
                    section.links.forEach(link => {
                        const icon = link.icon || 'fa-solid fa-external-link-alt';
                        html += `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                                    <i class="${icon}"></i> ${escapeHtml(link.text)}
                                </a>`;
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

        // Adicionar atributos de acessibilidade
        modal.setAttribute('aria-label', modalTitle ? modalTitle.innerText : 'Ajuda do curso');
    }

    // ========== ABRIR / FECHAR MODAL ==========
    function openHelp() {
        if (!modal) return;
        modal.classList.add('show');
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        renderHelpContent();
        // Focar no modal para acessibilidade
        modal.focus();
    }

    function closeHelp() {
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        // Devolver foco ao botão de ajuda
        if (helpButton) {
            setTimeout(() => helpButton.focus(), 100);
        }
    }

    // ========== CONFIGURAR CURSO ATUAL ==========
    function setCurrentCourse(courseId) {
        // Mapeia o ID do curso para a chave no JSON
        const mappedKey = courseIdToKeyMap[courseId] || courseId;
        currentCourse = mappedKey;

        // Mostrar/esconder botão de ajuda conforme suporte
        if (helpButton) {
            if (supportedCourses.includes(courseId)) {
                helpButton.style.display = 'inline-flex';
            } else {
                helpButton.style.display = 'none';
            }
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
            // Remove listeners antigos e adiciona novo
            const newHelpBtn = helpButton.cloneNode(true);
            helpButton.parentNode.replaceChild(newHelpBtn, helpButton);
            helpButton = newHelpBtn;
            helpButton.addEventListener('click', function(e) {
                e.preventDefault();
                openHelp();
            });
        }

        if (closeBtn) {
            // Remove listeners antigos
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            closeBtn = newCloseBtn;
            closeBtn.addEventListener('click', closeHelp);
        }

        // Fechar ao clicar fora do modal
        window.addEventListener('click', function(e) {
            if (e.target === modal && modal.style.display === 'flex') {
                closeHelp();
            }
        });

        // Fechar com tecla ESC
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                closeHelp();
            }
        });

        // Atualizar conteúdo se o idioma mudar (quando o modal estiver aberto)
        window.addEventListener('languageChanged', function() {
            if (modal && modal.style.display === 'flex') {
                renderHelpContent();
            }
        });

        console.log('[Ajuda] Módulo inicializado com sucesso');
    }

    // ========== INICIALIZAR QUANDO O DOM ESTIVER PRONTO ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();