// final-completion.js – Modal de conclusão com tratamento de erros e fallback
// Nota: A maior parte da lógica agora está em script.js, mas este arquivo é mantido para compatibilidade.
(function() {
    let modal = null;
    let closeBtn = null;
    let goHomeBtn = null;
    let modalText = null;
    let modalImage = null;
    let modalTitle = null;

    let completionDataCache = null;

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

    function closeModal() {
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            console.log('[Completion] Modal fechada');
        }
    }

    function showModal() {
        if (modal) {
            modal.style.display = 'flex';
            modal.offsetHeight;
            modal.classList.add('show');
            console.log('[Completion] Modal exibida');
        }
    }

    function getButtonText(courseLevel) {
        if (window.getTranslation) {
            if (courseLevel === 'graduacao') return window.getTranslation('completion_go_postgrad');
            if (courseLevel === 'pos-graduacao') return window.getTranslation('completion_go_other');
            return window.getTranslation('completion_go_graduation');
        }
        switch(courseLevel) {
            case 'graduacao': return 'Ir para Pós-Graduação';
            case 'pos-graduacao': return 'Ir para Outra Pós-Graduação';
            default: return 'Ir para Graduação';
        }
    }

    window.showFinalCompletionModal = async function(courseId, courseName, folderPath) {
        console.log(`[Completion] showFinalCompletionModal chamado para curso: ${courseId}`);
        if (!getModalElements()) {
            console.error('[Completion] Não foi possível obter os elementos da modal');
            return;
        }

        const completionData = await loadCompletionData();
        const courseData = completionData[courseId] || {};

        let text = courseData.text;
        if (!text) {
            text = `Parabéns por concluir o curso ${courseName}! Continue sua jornada acadêmica.`;
        }
        if (modalText) modalText.innerText = text;

        let imageUrl = courseData.image;
        if (!imageUrl) {
            imageUrl = 'https://placehold.co/400x200/1F2933/9CA3AF?text=Parabéns!';
        }
        if (modalImage) modalImage.src = imageUrl;

        if (modalTitle) modalTitle.innerText = 'Parabéns!';

        let level = courseData.level;
        if (!level) {
            if (folderPath && folderPath.includes('graduacao')) level = 'graduacao';
            else if (folderPath && folderPath.includes('pos-graduacao')) level = 'pos-graduacao';
            else level = 'graduacao';
        }

        if (goHomeBtn) {
            const buttonText = getButtonText(level);
            goHomeBtn.innerText = buttonText;
            goHomeBtn.onclick = () => {
                window.location.href = 'index.html';
            };
        }

        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });

        showModal();
    };
})();