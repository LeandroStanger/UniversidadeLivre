// ajuda/help-modal.js – Versão 15.0 – COMPLETO E AUTOSSUFICIENTE
// Modal de ajuda com suporte a todos os cursos, i18n, carregamento dinâmico de dados
// Inclui: Administração, Biologia, Ciência da Computação, Matemática, Matemática (Licenciatura),
// Computer Science, Math, Engenharia de Computação, Engenharia de Produção,
// Letras – Habilitação em Língua Portuguesa, Letras (geral), Pedagogia, Gestão Pública,
// Tecnologia da Informação, Ciência de Dados (Bacharelado), Processos Gerenciais,
// Ciência de Dados (Pós), Computação Gráfica, CyberSecurity, Desenvolvimento Web,
// DevOps, Embarcados, ENEM, EsPCEx, Física, Inglês, Espanhol, Espanhol-Inglês,
// Japonês, Japonês-Inglês, Português Brasileiro, Química

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
    let _initialized = false;              // Evita múltiplas inicializações
    let _isOpen = false;

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
            'close': 'Fechar',
            'notas_cancel': 'Cancelar'
        };

        let text = fallbacks[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== MAPEAMENTO DE IDs PARA CHAVES NO help-data.json ==========
    const courseIdToKeyMap = {
        // Graduação
        'administracao': 'administracao',
        'biologia': 'biologia',
        'ciencia-de-dados-bacharelado': 'ciencia-de-dados-bacharelado',
        'computacao': 'ciencia_computacao',
        'computer-science': 'computer-science',
        'engenharia-producao': 'engenharia-producao',
        'engenharia_computacao': 'engenharia_computacao',
        'fisica': 'fisica',
        'letras': 'letras',
        'letras-portugues': 'letras-portugues',
        'matematica': 'matematica',
        'matematica-licenciatura': 'matematica-licenciatura',
        'math': 'math',
        'pedagogia': 'pedagogia',
        'processos-gerenciais': 'processos-gerenciais',
        'quimica': 'quimica',
        'tecnologia-informacao': 'tecnologia-informacao',
        // Pós-Graduação
        'ciencia_de_dados': 'ciencia_de_dados',
        'computacao_grafica': 'computacao_grafica',
        'cybersecurity': 'cybersecurity',
        'desenvolvimento_web': 'desenvolvimento_web',
        'devops': 'devops',
        'embarcados': 'embarcados',
        // Ensino Médio
        'enem': 'enem',
        'espcex': 'espcex',
        // Idiomas
        'espanhol': 'espanhol',
        'espanhol-ingles': 'espanhol-ingles',
        'ingles': 'ingles',
        'japones': 'japones',
        'japones-ingles': 'japones-ingles',
        'portugues-brasileiro': 'portugues-brasileiro'
    };

    // Lista de cursos com suporte a ajuda
    const supportedCourses = Object.keys(courseIdToKeyMap);

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
            // Fallback: tenta carregar de ajuda/help-data.json
            try {
                const response2 = await fetch('ajuda/help-data.json');
                if (response2.ok) {
                    helpDataCache = await response2.json();
                    console.log('[Ajuda] Dados carregados de ajuda/help-data.json');
                    return helpDataCache;
                }
            } catch (e2) {
                console.error('[Ajuda] Falha no fallback:', e2);
            }
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
        if (!modalBody) {
            console.warn('[Ajuda] modalBody não encontrado.');
            return;
        }

        if (!currentCourse) {
            modalBody.innerHTML = `<p>${t('help_unknown_course')}</p>`;
            console.warn('[Ajuda] Curso não definido ao carregar conteúdo.');
            return;
        }

        // Mostrar indicador de carregamento
        modalBody.innerHTML = `<p>${t('loading')}</p>`;

        const data = await loadHelpData();
        if (!data) {
            modalBody.innerHTML = `<p>${t('error_loading')}</p>`;
            return;
        }

        // Usa o mapeamento para encontrar a chave correta no JSON
        const dataKey = courseIdToKeyMap[currentCourse] || currentCourse;
        const courseData = data[dataKey];

        if (!courseData) {
            modalBody.innerHTML = `<p>${t('help_unavailable')}</p>`;
            console.warn(`[Ajuda] Curso "${currentCourse}" (chave: ${dataKey}) não encontrado no JSON.`);
            return;
        }

        // Atualizar título do modal
        if (modalTitle) {
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
                    // Substituir quebras de linha por <br> e manter parágrafos
                    const paragraphs = section.content.split('\n').filter(p => p.trim());
                    paragraphs.forEach(p => {
                        if (p.trim().startsWith('•')) {
                            // Lista com bullets
                            const items = p.split('•').filter(item => item.trim());
                            html += '<ul>';
                            items.forEach(item => {
                                html += `<li>${escapeHtml(item.trim())}</li>`;
                            });
                            html += '</ul>';
                        } else {
                            html += `<p>${escapeHtml(p.trim())}</p>`;
                        }
                    });
                }
                // Subseções (FAQ)
                if (section.subsections) {
                    section.subsections.forEach(sub => {
                        html += `<div class="faq-item">`;
                        if (sub.heading) {
                            html += `<h4>${escapeHtml(sub.heading)}</h4>`;
                        }
                        if (sub.content) {
                            html += `<p>${escapeHtml(sub.content)}</p>`;
                        }
                        html += `</div>`;
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

        // Aplicar animações
        observeAnimateElements();
    }

    // ========== OBSERVAR ELEMENTOS PARA ANIMAÇÃO ==========
    function observeAnimateElements() {
        if (!modalBody) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

        modalBody.querySelectorAll('.animate-in:not(.visible)').forEach(el => {
            observer.observe(el);
        });
    }

    // ========== ABRIR / FECHAR MODAL ==========
    function openHelp() {
        if (!modal) {
            console.warn('[Ajuda] Modal não encontrado.');
            return;
        }
        if (!currentCourse) {
            console.warn('[Ajuda] Nenhum curso selecionado para ajuda.');
            return;
        }
        modal.classList.add('show');
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        _isOpen = true;
        renderHelpContent();
        // Focar no modal para acessibilidade
        setTimeout(() => modal.focus(), 100);
        console.log('[Ajuda] Modal aberto para curso:', currentCourse);
    }

    function closeHelp() {
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        _isOpen = false;
        // Devolver foco ao botão de ajuda
        if (helpButton) {
            setTimeout(() => helpButton.focus(), 100);
        }
        console.log('[Ajuda] Modal fechado');
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
                helpButton.removeAttribute('disabled');
            } else {
                helpButton.style.display = 'none';
                helpButton.setAttribute('disabled', 'true');
            }
        }

        console.log(`[Ajuda] Curso definido: ${currentCourse} (original: ${courseId})`);

        // Se o modal estiver aberto, recarregar conteúdo
        if (_isOpen && modal && modal.style.display === 'flex') {
            renderHelpContent();
        }
    }

    // ========== INICIALIZAÇÃO ==========
    function init() {
        // Evitar múltiplas inicializações
        if (_initialized) {
            console.log('[Ajuda] Módulo já inicializado.');
            return;
        }

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
            // Remove listeners antigos e adiciona novo (evita duplicação)
            const newHelpBtn = helpButton.cloneNode(true);
            helpButton.parentNode.replaceChild(newHelpBtn, helpButton);
            helpButton = newHelpBtn;
            helpButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openHelp();
            });
            // Verifica se há um curso inicial definido
            if (window.currentCourse && supportedCourses.includes(window.currentCourse)) {
                setCurrentCourse(window.currentCourse);
            }
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
            if (_isOpen && modal && modal.style.display === 'flex') {
                renderHelpContent();
            }
        });

        // Atualizar título do modal quando o curso for definido globalmente
        if (window.getCurrentCourse && typeof window.getCurrentCourse === 'function') {
            const globalCourse = window.getCurrentCourse();
            if (globalCourse && supportedCourses.includes(globalCourse)) {
                setCurrentCourse(globalCourse);
            }
        }

        _initialized = true;
        console.log('[Ajuda] Módulo inicializado com sucesso. Cursos suportados:', supportedCourses.length);
    }

    // ========== INICIALIZAR QUANDO O DOM ESTIVER PRONTO ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ========== EXPOSIÇÃO PÚBLICA ==========
    window.HelpModal = {
        init,
        open: openHelp,
        close: closeHelp,
        setCurrentCourse,
        loadHelpData,
        renderHelpContent,
        supportedCourses: supportedCourses,
        courseIdToKeyMap: courseIdToKeyMap,
        isOpen: () => _isOpen
    };

})();