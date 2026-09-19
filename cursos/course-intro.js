// course-intro.js – Versão 9.0 – COMPLETO E AUTOSSUFICIENTE
// Modal de introdução com slider de imagens e barra de busca
// Suporte a todos os 32 cursos da Universidade Livre
// Inclui i18n, cache de dados, prevenção de reexibição e fallbacks
// Otimizado para todos os cursos: Graduação, Pós-Graduação, Ensino Médio e Idiomas

(function() {
    'use strict';

    // ========== ELEMENTOS DOM ==========
    let modal = null;
    let closeBtn = null;
    let startBtn = null;
    let dontShowCheckbox = null;
    let contentDiv = null;
    let logoImg = null;
    let socialDiv = null;
    let searchInput = null;
    let searchBtn = null;
    let sliderTrack = null;
    let sliderPrev = null;
    let sliderNext = null;
    let sliderDots = null;

    let currentCourseId = null;
    let currentCardCourseId = null;
    let currentCardCourseInfo = {};
    let currentCardShareDescription = '';
    let introData = null;
    let _initialized = false;
    let _sliderInterval = null;
    let _currentSlideIndex = 0;
    let _totalSlides = 0;
    let shareButton = null;
    let shareMenu = null;

    // ========== FUNÇÃO DE TRADUÇÃO (fallback) ==========
    function t(key, replacements = {}) {
        const translate = typeof window.t === 'function'
            ? window.t
            : window.getTranslation;
        if (typeof translate === 'function' && translate !== t) {
            try {
                return translate(key, replacements);
            } catch (e) { /* fallback */ }
        }
        const fallbacks = {
            'intro_start': 'Começar aula agora',
            'intro_dont_show': 'Não mostrar novamente',
            'search_courses_placeholder': 'Buscar cursos...',
            'completion_go_graduation': 'Ir para Graduação',
            'completion_go_postgrad': 'Ir para Pós-Graduação',
            'completion_go_other': 'Ir para Outra Pós-Graduação',
            'loading': 'Carregando...',
            'error_loading': 'Erro ao carregar introdução.',
            'profile': 'Perfil',
            'course_progress': 'Progresso do Curso',
            'graduacao': 'Graduação',
            'pos_graduacao': 'Pós-graduação',
            'ensino_medio': 'Ensino Médio',
            'idiomas': 'Idiomas',
            'bacharelado': 'Bacharelado',
            'licenciatura': 'Licenciatura',
            'tecnologo': 'Tecnólogo',
            'back_to_courses': 'Voltar para cursos',
            'help_button': 'Ajuda',
            'close': 'Fechar',
            'share_course': 'Compartilhar',
            'copy_course_link': 'Copiar link',
            'share_whatsapp': 'WhatsApp',
            'share_telegram': 'Telegram',
            'course_link_copied': 'Link do curso copiado.',
            'course_share_copied': 'Descrição e link do curso copiados.'
        };
        let text = fallbacks[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    // ========== MAPEAMENTO DE IDs PARA CHAVES NO JSON ==========
    const courseIdToJsonKey = {
        // Graduação
        'administracao': 'administracao',
        'biologia': 'biologia',
        'accounting': 'accounting',
        'ciencia-de-dados-bacharelado': 'ciencia-de-dados-bacharelado',
        'computacao': 'computacao',
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

    // Lista de todos os cursos com suporte a introdução
    const supportedCourses = Object.keys(courseIdToJsonKey);
    const englishCourseIds = new Set([
        'computer-science',
        'espanhol-ingles',
        'japones-ingles',
        'math',
        'accounting',
        'portugues-brasileiro'
    ]);

    function isEnglishCourse(courseId) {
        return englishCourseIds.has(courseId);
    }

    // ========== CAPTURAR ELEMENTOS ==========
    function getElements() {
        modal = document.getElementById('courseIntroModal');
        shareButton = document.getElementById('courseShareBtn');
        shareMenu = document.getElementById('courseShareMenu');
        // O resumo é renderizado na página; o modal antigo não é mais necessário.
        if (!modal) return true;
        closeBtn = modal.querySelector('.close-intro');
        startBtn = document.getElementById('startLessonBtn');
        dontShowCheckbox = document.getElementById('dontShowAgain');
        contentDiv = document.getElementById('introContent');
        logoImg = modal.querySelector('.intro-logo-large');
        socialDiv = modal.querySelector('.social-icons');
        searchInput = document.getElementById('introSearchInput');
        searchBtn = document.getElementById('introSearchBtn');
        sliderTrack = modal.querySelector('.intro-slider-track');
        sliderPrev = modal.querySelector('.intro-slider-prev');
        sliderNext = modal.querySelector('.intro-slider-next');
        sliderDots = modal.querySelector('.intro-slider-dots');
        return true;
    }

    function getCourseShareUrl() {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('curso', currentCardCourseId || '');
        return url.toString();
    }

    function getCourseShareText() {
        const title = document.getElementById('courseIntroCardTitle')?.textContent?.trim();
        const institution = document.getElementById('courseIntroCardInstitution')?.textContent?.trim();
        const description = currentCardShareDescription
            || document.getElementById('courseIntroCardDescription')?.textContent?.trim();
        const shareTitle = title || 'Curso';
        const shareInstitution = institution || 'Universidade Livre';
        const shareDescription = description || 'Confira este curso gratuito da Universidade Livre.';
        return `${shareTitle}\n${shareInstitution}\n\n${shareDescription}`;
    }

    function getCourseShareTitle() {
        return document.getElementById('courseIntroCardTitle')?.textContent?.trim()
            || 'Curso · Universidade Livre';
    }

    function closeShareMenu() {
        if (!shareMenu || !shareButton) return;
        shareMenu.hidden = true;
        shareButton.setAttribute('aria-expanded', 'false');
    }

    async function copyCourseLink() {
        await copyToClipboard(getCourseShareUrl());
        if (window.showNotification) {
            window.showNotification(t('course_link_copied'), 'success');
        } else {
            alert(t('course_link_copied'));
        }
    }

    async function copyToClipboard(value) {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(value);
        } else {
            const input = document.createElement('textarea');
            input.value = value;
            input.setAttribute('readonly', '');
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            const copied = document.execCommand('copy');
            input.remove();
            if (!copied) throw new Error('Não foi possível copiar o conteúdo.');
        }
    }

    async function copyCourseShareMessage() {
        const message = `${getCourseShareText()}\n${getCourseShareUrl()}`;
        await copyToClipboard(message);
        if (window.showNotification) {
            window.showNotification(t('course_share_copied'), 'success');
        } else {
            alert(t('course_share_copied'));
        }
    }

    async function shareCourse(action) {
        const url = getCourseShareUrl();
        const text = getCourseShareText();
        if (action === 'copy') {
            await copyCourseLink();
        } else if (action === 'whatsapp') {
            window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener,noreferrer');
        } else if (action === 'telegram') {
            window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        } else if (action === 'native') {
            await copyCourseShareMessage();
        } else {
            await copyCourseLink();
        }
        closeShareMenu();
    }

    function initCourseSharing() {
        if (!shareButton || !shareMenu) return;
        shareButton.addEventListener('click', () => {
            const isOpen = !shareMenu.hidden;
            shareMenu.hidden = isOpen;
            shareButton.setAttribute('aria-expanded', String(!isOpen));
        });
        shareMenu.addEventListener('click', async event => {
            const actionButton = event.target.closest('[data-share-action]');
            if (!actionButton) return;
            try {
                await shareCourse(actionButton.dataset.shareAction);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('[Intro] Erro ao compartilhar curso:', error);
                    alert('Não foi possível compartilhar o curso. Tente copiar o link.');
                }
            }
        });
        document.addEventListener('click', event => {
            if (!shareMenu.hidden && !event.target.closest('.course-share')) closeShareMenu();
        });
    }

    // ========== CARREGAR DADOS DE INTRODUÇÃO ==========
    async function loadIntroData() {
        if (introData) return introData;
        try {
            const response = await fetch('cursos/intro-data.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            introData = await response.json();
            console.log('[Intro] Dados carregados com sucesso');
            return introData;
        } catch (error) {
            console.error('[Intro] Erro ao carregar dados:', error);
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

    // ========== ESCAPE HTML ==========
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function getCourseIntroImageCandidates(courseData) {
        const imageUrl = typeof courseData?.imageUrl === 'string' ? courseData.imageUrl : '';
        const folder = imageUrl.slice(0, imageUrl.lastIndexOf('/') + 1);
        const candidates = [];

        if (folder) {
            candidates.push(`${folder}sobre o curso.png`);
            candidates.push(`${folder}Sobre o curso.png`);
        }

        candidates.push('cursos/sobre o curso.png');
        // Mantém compatibilidade com a imagem padrão já existente no repositório.
        candidates.push('cursos/Sobre o curso.png');
        return candidates;
    }

    // ========== RENDERIZAR SLIDER ==========
    function renderSlider(slides) {
        if (!sliderTrack || !slides || slides.length === 0) {
            if (sliderTrack) {
                const parent = sliderTrack.closest('.intro-slider');
                if (parent) parent.style.display = 'none';
            }
            return;
        }

        const parent = sliderTrack.closest('.intro-slider');
        if (parent) parent.style.display = 'block';

        sliderTrack.innerHTML = '';
        slides.forEach((slide, index) => {
            const slideDiv = document.createElement('div');
            slideDiv.className = 'intro-slide';
            const link = document.createElement('a');
            link.href = slide.link || '#';
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            const img = document.createElement('img');
            img.src = slide.image || '';
            img.alt = slide.alt || `Slide ${index + 1}`;
            img.loading = 'lazy';
            img.onerror = function() {
                this.src = 'https://placehold.co/1200x675/1A2638/6C8CFF?text=Imagem+Indisponível';
            };
            link.appendChild(img);
            slideDiv.appendChild(link);
            sliderTrack.appendChild(slideDiv);
        });

        // Criar dots
        if (sliderDots) {
            sliderDots.innerHTML = '';
            slides.forEach((_, index) => {
                const dot = document.createElement('span');
                dot.className = 'dot' + (index === 0 ? ' active' : '');
                dot.dataset.index = index;
                dot.addEventListener('click', () => goToSlide(index));
                sliderDots.appendChild(dot);
            });
        }

        // Eventos dos botões
        if (sliderPrev) {
            sliderPrev.removeEventListener('click', prevSlide);
            sliderPrev.addEventListener('click', prevSlide);
        }
        if (sliderNext) {
            sliderNext.removeEventListener('click', nextSlide);
            sliderNext.addEventListener('click', nextSlide);
        }

        // Iniciar no slide 0
        goToSlide(0);

        // Auto-play
        startAutoPlay();
    }

    function goToSlide(index) {
        if (!sliderTrack) return;
        const slides = sliderTrack.querySelectorAll('.intro-slide');
        _totalSlides = slides.length;
        if (_totalSlides === 0) return;
        if (index < 0) index = _totalSlides - 1;
        if (index >= _totalSlides) index = 0;
        _currentSlideIndex = index;
        sliderTrack.style.transform = `translateX(-${index * 100}%)`;
        if (sliderDots) {
            const dots = sliderDots.querySelectorAll('.dot');
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === index);
            });
        }
    }

    function nextSlide() {
        goToSlide(_currentSlideIndex + 1);
    }

    function prevSlide() {
        goToSlide(_currentSlideIndex - 1);
    }

    function startAutoPlay() {
        stopAutoPlay();
        _sliderInterval = setInterval(() => {
            if (modal && modal.classList.contains('show')) {
                nextSlide();
            }
        }, 5000);
    }

    function stopAutoPlay() {
        if (_sliderInterval) {
            clearInterval(_sliderInterval);
            _sliderInterval = null;
        }
    }

    // ========== RENDERIZAR BARRA DE BUSCA ==========
    function setupSearch() {
        if (!searchInput || !searchBtn) return;

        // Função de busca - redireciona para a página inicial com filtro
        function performSearch() {
            const query = searchInput.value.trim();
            if (query) {
                // Fecha o modal e redireciona para a página inicial com o termo de busca
                closeModalAndSave();
                // Salvar no localStorage para ser usado pela página inicial
                localStorage.setItem('intro_search_query', query);
                // Redirecionar para index.html com parâmetro de busca
                window.location.href = `index.html?search=${encodeURIComponent(query)}`;
            }
        }

        searchBtn.removeEventListener('click', performSearch);
        searchBtn.addEventListener('click', performSearch);

        searchInput.removeEventListener('keydown', handleSearchKeydown);
        searchInput.addEventListener('keydown', handleSearchKeydown);

        function handleSearchKeydown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        }

        // Verificar se há busca pendente do localStorage
        const savedQuery = localStorage.getItem('intro_search_query');
        if (savedQuery) {
            searchInput.value = savedQuery;
            localStorage.removeItem('intro_search_query');
        }
    }

    // ========== RENDERIZAR CONTEÚDO DO CURSO ==========
    async function renderContent(courseId) {
        const data = await loadIntroData();
        if (!data) return false;

        const jsonKey = courseIdToJsonKey[courseId] || courseId;
        const courseData = data[jsonKey];
        if (!courseData) {
            console.error(`[Intro] Dados não encontrados para o curso: ${courseId} (chave: ${jsonKey})`);
            return false;
        }

        // Logo/imagem
        if (logoImg) {
            logoImg.src = courseData.imageUrl || 'logo-da-universidade-livre.png';
            logoImg.alt = `Universidade Livre - ${courseData.name || 'Curso'}`;
        }

        // Conteúdo markdown
        if (contentDiv) {
            contentDiv.innerHTML = courseData.readmeContent || '<p>Conteúdo não disponível.</p>';
            makeLinksOpenInNewTab(contentDiv);
        }

        // Ícones sociais
        if (socialDiv && courseData.socialLinks) {
            socialDiv.innerHTML = courseData.socialLinks.map(link => `
                <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
                    <i class="${escapeHtml(link.icon)}"></i> ${escapeHtml(link.name)}
                </a>
            `).join('');
        }

        // Slider de imagens
        if (courseData.slides && courseData.slides.length > 0) {
            renderSlider(courseData.slides);
        } else {
            // Ocultar slider se não houver slides
            const sliderContainer = document.querySelector('.intro-slider');
            if (sliderContainer) sliderContainer.style.display = 'none';
        }

        // Configurar busca
        setupSearch();

        // Aplicar traduções
        updateModalTexts();

        // Animar elementos
        observeAnimateElements();

        return true;
    }

    // Renderiza o resumo do curso na própria página, sem interromper a navegação.
    window.renderCourseIntroCard = async function(courseId, courseInfo = {}) {
        const card = document.getElementById('courseIntroCard');
        const image = document.getElementById('courseIntroCardImage');
        const mobileImage = document.getElementById('courseIntroCardMobileImage');
        const title = document.getElementById('courseIntroCardTitle');
        const classification = document.getElementById('courseIntroCardClassification');
        const institution = document.getElementById('courseIntroCardInstitution');
        const premise = document.getElementById('courseIntroCardPremise');
        const description = document.getElementById('courseIntroCardDescription');
        const learningList = document.getElementById('courseIntroCardLearningList');
        const about = document.getElementById('courseIntroCardAbout');
        const label = document.getElementById('courseIntroCardLabel');
        const learningHeading = document.getElementById('courseIntroCardLearningHeading');
        if (!card || !image || !title || !classification || !institution || !premise || !description || !learningList || !about || !label || !learningHeading) return false;

        const data = await loadIntroData();
        const jsonKey = courseIdToJsonKey[courseId] || courseId;
        const courseData = data?.[jsonKey];
        if (!courseData) {
            card.hidden = true;
            console.warn(`[Intro] Dados do resumo não encontrados para o curso: ${courseId}`);
            return false;
        }

        currentCardCourseId = courseId;
        currentCardCourseInfo = { ...courseInfo };
        const englishCourse = isEnglishCourse(courseId);
        // The course language takes precedence over the interface language.
        // This keeps the complete course summary consistent with its content.
        const useEnglishLabels = englishCourse;
        label.textContent = useEnglishLabels ? 'About the course' : 'Sobre o curso';
        learningHeading.textContent = useEnglishLabels ? 'What you will learn' : 'O que você vai aprender';

        const readme = document.createElement('div');
        readme.innerHTML = courseData.readmeContent || '';
        const readmeTitle = readme.querySelector('h1')?.textContent?.trim();
        const paragraphs = Array.from(readme.querySelectorAll('p'));
        const paragraphTexts = paragraphs
            .map(paragraph => paragraph.textContent?.trim())
            .filter(Boolean);
        const summary = paragraphTexts[0];
        const courseDetails = paragraphTexts.slice(1, 3).join(' ');
        currentCardShareDescription = courseInfo.description?.trim()
            || courseDetails
            || summary
            || '';
        const learningHeadingSource = Array.from(readme.querySelectorAll('strong'))
            .find(element => /(?:o que você vai aprender|what you will learn)/i.test(element.textContent || ''));
        const learningListSource = learningHeadingSource?.closest('p')?.nextElementSibling;
        const learningItems = learningListSource?.tagName === 'UL'
            ? Array.from(learningListSource.querySelectorAll('li'))
            : [];

        image.alt = `Imagem do curso ${readmeTitle || courseData.name || courseId}`;
        if (mobileImage) {
            mobileImage.srcset = courseData.imageUrl || '';
        }
        const imageCandidates = getCourseIntroImageCandidates(courseData);
        let imageCandidateIndex = 0;
        image.onerror = () => {
            imageCandidateIndex += 1;
            if (imageCandidateIndex < imageCandidates.length) {
                image.src = imageCandidates[imageCandidateIndex];
                return;
            }
            image.onerror = null;
            image.src = 'logo-da-universidade-livre.png';
        };
        image.src = imageCandidates[imageCandidateIndex];
        title.textContent = readmeTitle || courseData.name || courseId;
        const levelLabels = {
            graduacao: 'graduacao',
            'pos-graduacao': 'pos_graduacao',
            'ensino-medio': 'ensino_medio',
            idiomas: 'idiomas'
        };
        const typeLabels = {
            bacharelado: 'bacharelado',
            licenciatura: 'licenciatura',
            tecnologo: 'tecnologo'
        };
        const levelKey = levelLabels[courseInfo.courseLevel];
        const typeKey = courseInfo.courseLevel === 'graduacao'
            ? typeLabels[courseInfo.courseType]
            : null;
        const courseTypeLabels = {
            graduacao: 'Undergraduate',
            pos_graduacao: 'Postgraduate',
            ensino_medio: 'High School',
            idiomas: 'Languages',
            bacharelado: "Bachelor's degree",
            licenciatura: 'Teaching degree',
            tecnologo: 'Technology degree'
        };
        classification.replaceChildren(
            ...(levelKey ? [createClassificationBadge(
                useEnglishLabels ? courseTypeLabels[levelKey] : t(levelKey),
                'level'
            )] : []),
            ...(typeKey ? [createClassificationBadge(
                useEnglishLabels ? courseTypeLabels[typeKey] : t(typeKey),
                'type'
            )] : [])
        );
        institution.textContent = 'Universidade Livre';
        premise.textContent = useEnglishLabels
            ? `Course premise: ${summary || 'learn at your own pace with curated, free content.'}`
            : `Premissa do curso: ${summary || 'aprender no seu ritmo, com conteúdo curado e gratuito.'}`;
        description.textContent = currentCardShareDescription || (useEnglishLabels
            ? 'A learning journey with organized content and practical application.'
            : 'Uma jornada de aprendizagem com conteúdo organizado e aplicação prática.');
        learningList.replaceChildren(...learningItems.map(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item.textContent?.trim() || '';
            return listItem;
        }));
        about.textContent = useEnglishLabels
            ? 'Open University offers undergraduate, postgraduate and language courses with curated, free content. Study at your own pace with community support.'
            : 'A Universidade Livre oferece cursos de graduação, pós-graduação e idiomas com conteúdo curado e gratuito. Você estuda no seu ritmo, com suporte da comunidade.';
        card.hidden = false;
        closeShareMenu();
        return true;
    };

    function createClassificationBadge(label, variant) {
        const badge = document.createElement('span');
        badge.className = `course-intro-card-badge course-intro-card-badge-${variant}`;
        badge.textContent = label;
        return badge;
    }

    // ========== OBSERVAR ELEMENTOS PARA ANIMAÇÃO ==========
    function observeAnimateElements() {
        if (!contentDiv) return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

        contentDiv.querySelectorAll('.animate-in:not(.visible)').forEach(el => {
            observer.observe(el);
        });
    }

    // ========== FUNÇÃO PÚBLICA PARA VERIFICAR E EXIBIR INTRODUÇÃO ==========
    window.checkCourseIntro = async function(courseId) {
        // Verificar se o curso já foi concluído
        const completedKey = `course_completed_${courseId}`;
        if (localStorage.getItem(completedKey) === 'true') {
            console.log(`[Intro] Curso ${courseId} já concluído, não exibindo introdução.`);
            return false;
        }

        // Verificar se o usuário já viu a introdução
        const storageKey = `intro_seen_${courseId}`;
        const alreadySeen = localStorage.getItem(storageKey) === 'true';
        if (alreadySeen) {
            console.log(`[Intro] Introdução do curso ${courseId} já foi vista.`);
            return false;
        }

        // Verificar se o curso tem introdução personalizada
        if (!supportedCourses.includes(courseId)) {
            console.log(`[Intro] Curso ${courseId} não possui introdução personalizada.`);
            return false;
        }

        // Verificar se o modal foi inicializado
        if (!getElements()) {
            console.warn('[Intro] Elementos do modal não encontrados.');
            return false;
        }

        const success = await renderContent(courseId);
        if (success) {
            currentCourseId = courseId;
            if (modal) {
                modal.style.display = 'flex';
                modal.offsetHeight; // Força reflow
                modal.classList.add('show');
                // Iniciar auto-play do slider após exibir
                setTimeout(startAutoPlay, 500);
            }
            updateModalTexts();
            return true;
        }
        return false;
    };

    // ========== FECHAR MODAL E SALVAR PREFERÊNCIA ==========
    function closeModalAndSave() {
        stopAutoPlay();
        if (dontShowCheckbox && dontShowCheckbox.checked && currentCourseId) {
            const storageKey = `intro_seen_${currentCourseId}`;
            localStorage.setItem(storageKey, 'true');
            console.log(`[Intro] Introdução do curso ${currentCourseId} marcada como "não mostrar novamente".`);
        }
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
        currentCourseId = null;
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
        const searchPlaceholder = document.getElementById('introSearchInput');

        if (startBtnText) startBtnText.innerText = t('intro_start');
        if (dontShowLabel) dontShowLabel.innerText = t('intro_dont_show');
        if (searchPlaceholder) searchPlaceholder.placeholder = t('search_courses_placeholder');

        // Atualizar título do modal se houver
        const modalTitle = modal?.querySelector('.intro-modal-content h2');
        if (modalTitle) {
            // O título é definido no conteúdo HTML, mas podemos atualizar se necessário
        }
    }

    // ========== EVENTOS GLOBAIS ==========
    window.addEventListener('languageChanged', function(e) {
        const lang = e.detail.lang || 'pt-br';
        updateModalTexts();
        if (currentCardCourseId) {
            renderCourseIntroCard(currentCardCourseId, currentCardCourseInfo);
        }
        // Recarregar conteúdo se o modal estiver aberto
        if (modal && modal.classList.contains('show') && currentCourseId) {
            renderContent(currentCourseId);
        }
    });

    // ========== EVENTOS DO MODAL ==========
    function initEvents() {
        if (closeBtn) {
            closeBtn.removeEventListener('click', closeModalAndSave);
            closeBtn.addEventListener('click', closeModalAndSave);
        }

        if (startBtn) {
            startBtn.removeEventListener('click', startLesson);
            startBtn.addEventListener('click', startLesson);
        }

        if (modal) {
            // Clique fora do modal
            modal.removeEventListener('click', handleOutsideClick);
            modal.addEventListener('click', handleOutsideClick);

            // Tecla ESC
            document.removeEventListener('keydown', handleEscKey);
            document.addEventListener('keydown', handleEscKey);

            // Pausar auto-play ao passar o mouse
            modal.removeEventListener('mouseenter', stopAutoPlay);
            modal.addEventListener('mouseenter', stopAutoPlay);
            modal.removeEventListener('mouseleave', startAutoPlay);
            modal.addEventListener('mouseleave', startAutoPlay);
        }
    }

    function handleOutsideClick(e) {
        if (e.target === modal) closeModalAndSave();
    }

    function handleEscKey(e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
            closeModalAndSave();
        }
    }

    // ========== INICIALIZAR TEXTOS ==========
    function initTexts() {
        updateModalTexts();
    }

    // ========== PRÉ-CARREGAR DADOS EM SEGUNDO PLANO ==========
    function preloadData() {
        loadIntroData().catch(() => {});
    }

    // ========== INICIALIZAÇÃO PRINCIPAL ==========
    function init() {
        if (_initialized) {
            console.log('[Intro] Módulo já inicializado.');
            return;
        }

        if (!getElements()) {
            console.warn('[Intro] Elementos não encontrados, tentando novamente em 500ms...');
            setTimeout(init, 500);
            return;
        }

        initEvents();
        initCourseSharing();
        initTexts();
        preloadData();

        // Configurar busca mesmo sem curso aberto
        setupSearch();

        _initialized = true;
        console.log('[Intro] Módulo de introdução carregado com sucesso.');
    }

    // ========== AUTOINICIALIZAÇÃO SEGURA ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ========== EXPOSIÇÃO PÚBLICA ==========
    window.IntroModal = {
        init,
        open: window.checkCourseIntro,
        close: closeModalAndSave,
        renderContent,
        updateModalTexts,
        supportedCourses: supportedCourses,
        courseIdToJsonKey: courseIdToJsonKey
    };

})();