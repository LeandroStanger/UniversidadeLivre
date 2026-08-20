// final-completion.js – Versão 6.0 – COMPLETO E AUTOSSUFICIENTE
// Modal de conclusão para todos os cursos da Universidade Livre
// Suporte completo para: Administração, Ciência da Computação, Matemática,
// Matemática (Licenciatura), Engenharia de Computação, Engenharia de Produção,
// Letras – Habilitação em Língua Portuguesa, Pedagogia, Gestão Pública,
// Tecnologia da Informação, Computer Science, Math, Computação Gráfica,
// Embarcados, Desenvolvimento Web, CyberSecurity, DevOps, Ciência de Dados,
// ENEM, EsPCEx, Inglês, Espanhol, Espanhol-Inglês, Japonês, Japonês-Inglês,
// Português Brasileiro
// Inclui i18n, cache de dados, prevenção de múltiplas exibições e fallbacks

(function() {
    'use strict';

    // ========== VARIÁVEIS DE ESTADO ==========
    let modal = null;
    let closeBtn = null;
    let goHomeBtn = null;
    let modalText = null;
    let modalImage = null;
    let modalTitle = null;

    let completionDataCache = null;
    let _initialized = false;
    let _completionModalShowing = false;

    // ========== FUNÇÃO DE TRADUÇÃO ==========
    function t(key, replacements = {}) {
        if (window.getTranslation && typeof window.getTranslation === 'function') {
            try {
                return window.getTranslation(key, replacements);
            } catch (e) { /* fallback */ }
        }
        const fallbacks = {
            'completion_congrats': 'Parabéns!',
            'completion_go_graduation': 'Ir para Graduação',
            'completion_go_postgrad': 'Ir para Pós-Graduação',
            'completion_go_other': 'Ir para Outra Pós-Graduação',
            'loading': 'Carregando...',
            'error_loading': 'Erro ao carregar dados de conclusão.'
        };
        let text = fallbacks[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== MAPEAMENTO DE IDs PARA CHAVES NO COMPLETION-DATA ==========
    const courseIdToKeyMap = {
        'administracao': 'administracao',
        'ciencia_de_dados': 'ciencia_de_dados',
        'computacao': 'computacao',
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
        'gestao-publica': 'gestao-publica',
        'ingles': 'ingles',
        'japones': 'japones',
        'japones-ingles': 'japones-ingles',
        'letras-portugues': 'letras-portugues',
        'matematica': 'matematica',
        'matematica-licenciatura': 'matematica-licenciatura',
        'math': 'math',
        'pedagogia': 'pedagogia',
        'portugues-brasileiro': 'portugues-brasileiro',
        'tecnologia-informacao': 'tecnologia-informacao'
    };

    // ========== CARREGAR DADOS DE CONCLUSÃO ==========
    async function loadCompletionData() {
        if (completionDataCache) return completionDataCache;
        try {
            const response = await fetch('cursos/course-completion-data.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            completionDataCache = await response.json();
            console.log('[Completion] Dados carregados com sucesso');
            return completionDataCache;
        } catch (error) {
            console.error('[Completion] Erro ao carregar dados de conclusão:', error);
            return {};
        }
    }

    // ========== OBTER ELEMENTOS DO MODAL ==========
    function getModalElements() {
        modal = document.getElementById('finalCompletionModal');
        if (!modal) {
            console.error('[Completion] Modal #finalCompletionModal não encontrado no DOM');
            return false;
        }
        closeBtn = modal.querySelector('.close-final-modal');
        goHomeBtn = document.getElementById('btnFinalGoHome');
        modalText = document.getElementById('finalCompletionText');
        modalImage = document.getElementById('finalCompletionImage');
        modalTitle = modal.querySelector('.final-modal-header h2');
        return true;
    }

    // ========== FECHAR MODAL ==========
    function closeModal() {
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            _completionModalShowing = false;
            console.log('[Completion] Modal fechada');
        }
    }

    // ========== EXIBIR MODAL ==========
    function showModal() {
        if (modal) {
            modal.style.display = 'flex';
            modal.offsetHeight; // Força reflow para animação
            modal.classList.add('show');
            _completionModalShowing = true;
            console.log('[Completion] Modal exibida');
        }
    }

    // ========== OBTER TEXTO DO BOTÃO CONFORME O NÍVEL ==========
    function getButtonText(courseLevel) {
        if (window.getTranslation) {
            if (courseLevel === 'graduacao') return window.getTranslation('completion_go_postgrad');
            if (courseLevel === 'pos-graduacao') return window.getTranslation('completion_go_other');
            if (courseLevel === 'ensino-medio') return window.getTranslation('completion_go_graduation');
            if (courseLevel === 'idiomas') return window.getTranslation('completion_go_graduation');
            return window.getTranslation('completion_go_graduation');
        }
        switch(courseLevel) {
            case 'graduacao': return 'Ir para Pós-Graduação';
            case 'pos-graduacao': return 'Ir para Outra Pós-Graduação';
            case 'ensino-medio': return 'Ir para Graduação';
            case 'idiomas': return 'Ir para Graduação';
            default: return 'Ir para Graduação';
        }
    }

    // ========== DETECTAR NÍVEL DO CURSO PELA PASTA ==========
    function detectLevelFromPath(folderPath) {
        if (!folderPath) return 'graduacao';
        if (folderPath.includes('pos-graduacao')) return 'pos-graduacao';
        if (folderPath.includes('ensino-medio')) return 'ensino-medio';
        if (folderPath.includes('idiomas')) return 'idiomas';
        if (folderPath.includes('graduacao')) return 'graduacao';
        return 'graduacao';
    }

    // ========== FUNÇÃO PRINCIPAL PARA EXIBIR O MODAL ==========
    window.showFinalCompletionModal = async function(courseId, courseName, folderPath) {
        console.log(`[Completion] showFinalCompletionModal chamado para curso: ${courseId}`);

        // Evitar múltiplas exibições do mesmo modal
        if (_completionModalShowing) {
            console.log('[Completion] Modal já está sendo exibido, ignorando.');
            return;
        }

        if (!getModalElements()) {
            console.error('[Completion] Não foi possível obter os elementos da modal');
            return;
        }

        const completionData = await loadCompletionData();

        // Determinar a chave correta no JSON
        const dataKey = courseIdToKeyMap[courseId] || courseId;
        const courseData = completionData[dataKey] || {};

        // ===== TEXTO =====
        let text = courseData.text;
        if (!text) {
            const level = detectLevelFromPath(folderPath);
            const defaultMessages = {
                'graduacao': `Parabéns por concluir o curso ${courseName}! Continue sua jornada acadêmica.`,
                'pos-graduacao': `Parabéns por concluir a pós-graduação em ${courseName}! Continue se especializando.`,
                'ensino-medio': `Parabéns por concluir o curso preparatório para ${courseName}! Continue seus estudos.`,
                'idiomas': `Parabéns por concluir o curso de ${courseName}! Continue praticando o idioma.`
            };
            text = defaultMessages[detectLevelFromPath(folderPath)] || `Parabéns por concluir o curso ${courseName}! Continue sua jornada acadêmica.`;
        }
        if (modalText) modalText.innerText = text;

        // ===== IMAGEM =====
        let imageUrl = courseData.image;
        if (!imageUrl) {
            imageUrl = 'https://placehold.co/400x200/1F2933/9CA3AF?text=Parab%C3%A9ns!';
        }
        if (modalImage) {
            modalImage.src = imageUrl;
            modalImage.alt = `Curso ${courseName} concluído`;
            modalImage.onerror = function() {
                this.src = 'https://placehold.co/400x200/1F2933/9CA3AF?text=Parab%C3%A9ns!';
            };
        }

        // ===== TÍTULO =====
        if (modalTitle) {
            modalTitle.innerText = t('completion_congrats');
        }

        // ===== NÍVEL DO CURSO =====
        let level = courseData.level;
        if (!level) {
            level = detectLevelFromPath(folderPath);
        }

        // ===== BOTÃO =====
        if (goHomeBtn) {
            const buttonText = getButtonText(level);
            goHomeBtn.innerText = buttonText;

            // Ações específicas por nível
            goHomeBtn.onclick = function() {
                const targetMap = {
                    'graduacao': 'pos-graduacao',
                    'pos-graduacao': 'pos-graduacao',
                    'ensino-medio': 'graduacao',
                    'idiomas': 'graduacao'
                };
                const targetLevel = targetMap[level] || 'graduacao';
                // Redirecionar para a página inicial com o filtro apropriado
                if (targetLevel === 'pos-graduacao') {
                    window.location.href = 'index.html?filter=pos-graduacao';
                } else if (targetLevel === 'graduacao') {
                    window.location.href = 'index.html?filter=graduacao';
                } else {
                    window.location.href = 'index.html';
                }
            };
        }

        // ===== FECHAR =====
        if (closeBtn) {
            // Remove listeners antigos para evitar duplicação
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            closeBtn = newCloseBtn;
            closeBtn.onclick = closeModal;
        }

        // Fechar ao clicar fora
        modal.onclick = function(e) {
            if (e.target === modal) closeModal();
        };

        // Fechar com ESC
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });

        // ===== EXIBIR =====
        showModal();

        // Resetar o flag após um pequeno delay para permitir reabertura
        setTimeout(() => {
            _completionModalShowing = false;
        }, 500);
    };

    // ========== FUNÇÃO PARA FECHAR O MODAL EXTERNAMENTE ==========
    window.closeFinalCompletionModal = function() {
        closeModal();
        _completionModalShowing = false;
    };

    // ========== INICIALIZAÇÃO ==========
    function init() {
        if (_initialized) return;
        _initialized = true;

        // Pré-carregar dados de conclusão em segundo plano
        loadCompletionData().catch(() => {});

        console.log('[Completion] Módulo de conclusão final carregado com sucesso');
    }

    // ========== AUTOINICIALIZAÇÃO ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();