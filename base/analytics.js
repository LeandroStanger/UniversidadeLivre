// Contagem local de páginas e eventos, sem envio externo.
(function () {
    'use strict';

    const LOCAL_COUNTS_KEY = 'ulivre_analytics_local_counts';
    let initialPageviewSent = false;

    function slug(value) {
        return String(value || 'item')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80) || 'item';
    }

    function normalizeCourseId(courseId) {
        return courseId === 'contabilidade' ? 'accounting' : String(courseId || '');
    }

    function coursePath(courseId) {
        return `/curso/${slug(normalizeCourseId(courseId))}`;
    }

    function getLanguage() {
        const getCurrentLanguage = window.i18n && typeof window.i18n.getCurrentLanguage === 'function'
            ? window.i18n.getCurrentLanguage
            : window.getCurrentLanguage;
        const current = typeof getCurrentLanguage === 'function'
            ? getCurrentLanguage()
            : localStorage.getItem('selectedLanguage');
        if (current === 'en') return { code: 'en', slug: 'ingles', label: 'English' };
        if (current === 'es') return { code: 'es', slug: 'espanol', label: 'Español' };
        return { code: 'pt-br', slug: 'portugues', label: 'Português' };
    }

    function languagePath(path) {
        const normalized = path.startsWith('/') ? path : `/${path}`;
        return `/idioma/${getLanguage().slug}${normalized}`;
    }

    function ageBand() {
        const rawAge = localStorage.getItem('userAge')
            || localStorage.getItem('profileAge')
            || localStorage.getItem('age');
        const age = Number.parseInt(rawAge, 10);
        if (!Number.isFinite(age) || age < 5 || age > 120) return 'nao-informada';
        if (age < 18) return 'menor-18';
        if (age < 25) return '18-24';
        if (age < 35) return '25-34';
        if (age < 45) return '35-44';
        if (age < 55) return '45-54';
        return '55-mais';
    }

    function contextPath(context = {}) {
        const parts = [`idade-${ageBand()}`];
        if (context.course) parts.push(`curso-${slug(context.course)}`);
        if (context.stage !== undefined && context.stage !== null) parts.push(`etapa-${slug(context.stage)}`);
        if (context.game) parts.push(`jogo-${slug(context.game)}`);
        if (context.term) parts.push(`termo-${slug(context.term)}`);
        if (context.type) parts.push(`tipo-${slug(context.type)}`);
        if (context.item) parts.push(`item-${slug(context.item)}`);
        return parts.join('/');
    }

    function currentCourse() {
        return document.body?.dataset.course
            || localStorage.getItem('currentCourse')
            || localStorage.getItem('activeCourse')
            || '';
    }

    function readLocalCounts() {
        try {
            return JSON.parse(localStorage.getItem(LOCAL_COUNTS_KEY) || '{}');
        } catch (_) {
            return {};
        }
    }

    function saveLocalCount(event) {
        try {
            const counts = readLocalCounts();
            const key = `${event.event ? 'event' : 'pageview'}:${event.path}`;
            counts[key] = (Number(counts[key]) || 0) + 1;
            localStorage.setItem(LOCAL_COUNTS_KEY, JSON.stringify(counts));
        } catch (_) {}
    }

    function count(path, title, event = true) {
        const fullPath = `/universidade-livre${languagePath(path)}`;
        const payloadPath = event ? fullPath.replace(/^\/+/, '') : fullPath;
        saveLocalCount({ path: payloadPath, event });
    }

    function pageview(path, title, options) {
        count(path, title, false, options);
    }

    function trackCurrentPage() {
        const pagePath = location.pathname.replace(/^\/+/, '') || 'inicio';
        pageview(`/pagina/${slug(pagePath)}`, document.title);
    }

    function bindEvents() {
        return false;
    }

    function sendInitialPageview() {
        if (initialPageviewSent) return;
        initialPageviewSent = true;
        trackCurrentPage();
    }

    window.UniversidadeLivreAnalytics = {
        slug,
        getLanguage,
        count,
        pageview,
        view: pageview,
        bindEvents,
        sharedCourse(courseId, courseName) {
            const normalizedCourseId = normalizeCourseId(courseId);
            pageview(
                `${coursePath(normalizedCourseId)}/link-compartilhado`,
                `${courseName || `Curso ${normalizedCourseId}`} · Link compartilhado`
            );
        },
        course(courseId, courseName) {
            const normalizedCourseId = normalizeCourseId(courseId);
            pageview(coursePath(normalizedCourseId), courseName || `Curso ${normalizedCourseId}`);
        },
        discipline(courseId, disciplineName) {
            pageview(`${coursePath(courseId)}/disciplina/${slug(disciplineName)}`, disciplineName);
        },
        lesson(courseId, disciplineName, lessonName) {
            pageview(`${coursePath(courseId)}/disciplina/${slug(disciplineName)}/aula/${slug(lessonName)}`, lessonName);
        },
        media(area, mediaId, title) {
            pageview(`/${slug(area)}/conteudo/${slug(mediaId)}`, title);
        },
        action(area, actionName, context, options) {
            const suffix = context ? `/${slug(context)}` : '';
            count(`/${slug(area)}/${slug(actionName)}${suffix}`, `${actionName}${context ? ` · ${context}` : ''}`, true, options);
        },
        navigation(area, actionName, context = {}, options) {
            trackEvent(area, actionName, context, options);
        },
        event(area, actionName, context = {}, options) {
            trackEvent(area, actionName, context, options);
        },
        search(area, term, context = {}, options) {
            const normalizedTerm = String(term || '').trim().slice(0, 80);
            if (normalizedTerm.length < 2) return;
            trackEvent(area, 'busca', { ...context, term: slug(normalizedTerm) }, options);
        }
    };

    function trackEvent(area, actionName, context = {}, options) {
        const suffix = contextPath(context);
        count(`/evento/${slug(area)}/${slug(actionName)}/${suffix}`, `${actionName} · ${area}`, true, options);
    }

    window.addEventListener('languageChanged', (event) => {
        const language = event.detail?.lang === 'en'
            ? 'English'
            : event.detail?.lang === 'es'
                ? 'Español'
                : 'Português';
        count('/idioma-selecionado', `Idioma selecionado: ${language}`);
    });

    function setupInteractionTracking() {
        const searchTimers = new WeakMap();
        document.addEventListener('input', (event) => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement) || !input.matches('#courseSearchInput, #searchInput, #audiobookSearchInput')) return;
            const area = input.id === 'courseSearchInput'
                ? 'cursos'
                : input.id === 'audiobookSearchInput' ? 'audiolivros' : 'busca';
            clearTimeout(searchTimers.get(input));
            searchTimers.set(input, window.setTimeout(() => {
                window.UniversidadeLivreAnalytics?.search(area, input.value, { course: currentCourse() });
            }, 900));
        });

        document.addEventListener('click', (event) => {
            const stage = event.target.closest('.stage-card');
            if (stage && !stage.disabled) {
                const name = stage.querySelector('.stage-card-body strong')?.textContent?.trim();
                window.UniversidadeLivreAnalytics?.event('curso', 'etapa-selecionada', {
                    course: currentCourse(),
                    stage: name || 'desconhecida'
                });
            }

            const game = event.target.closest('.game-card')?.dataset.game;
            if (game) {
                window.UniversidadeLivreAnalytics?.event('jogo', 'abertura', {
                    course: currentCourse(),
                    game
                });
            }
        });
    }

    window.addEventListener('load', () => {
        setupInteractionTracking();
        const ready = window.i18nReady;
        if (ready && typeof ready.then === 'function') {
            ready.then(sendInitialPageview).catch(sendInitialPageview);
        } else {
            sendInitialPageview();
        }
    }, { once: true });
})();
