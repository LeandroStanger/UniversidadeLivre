// Integração central com GoatCounter.
(function () {
    'use strict';

    const SITE_URL = 'https://leandrostanger.github.io/UniversidadeLivre';
    const pending = [];
    const LOCAL_COUNTS_KEY = 'ulivre_analytics_local_counts';
    const MAX_PENDING_EVENTS = 100;
    const MAX_SEND_ATTEMPTS = 3;
    const MIN_SEND_INTERVAL = 1500;
    let retryTimer = null;
    let retryDelay = 1000;
    let lastSentAt = 0;
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
        return current === 'en'
            ? { code: 'en', slug: 'ingles', label: 'English' }
            : { code: 'pt-br', slug: 'portugues', label: 'Português' };
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

    function scheduleFlush(delay = retryDelay) {
        if (retryTimer || !pending.length) return;
        retryTimer = window.setTimeout(() => {
            retryTimer = null;
            retryDelay = Math.min(retryDelay * 2, 30000);
            flush();
        }, delay);
    }

    function flush() {
        if (!window.goatcounter || typeof window.goatcounter.count !== 'function') {
            pending.forEach(event => { event.attempts += 1; });
            while (pending.length && pending[0].attempts >= MAX_SEND_ATTEMPTS) saveLocalCount(pending.shift().payload);
            scheduleFlush();
            return;
        }

        const elapsed = Date.now() - lastSentAt;
        if (elapsed < MIN_SEND_INTERVAL) {
            scheduleFlush(MIN_SEND_INTERVAL - elapsed);
            return;
        }

        const queued = pending[0];
        try {
            window.goatcounter.count(queued.payload);
            pending.shift();
            lastSentAt = Date.now();
            retryDelay = 1000;
            scheduleFlush(MIN_SEND_INTERVAL);
        } catch (error) {
            console.warn('[Analytics] Falha ao enviar evento:', error);
            queued.attempts += 1;
            if (queued.attempts >= MAX_SEND_ATTEMPTS) saveLocalCount(pending.shift().payload);
            scheduleFlush();
        }
    }

    function count(path, title, event = true) {
        const language = getLanguage();
        const payloadPath = `/universidade-livre${languagePath(path)}`;
        const payloadTitle = `${title || document.title} · ${language.label}`;
        const duplicate = pending.some(item => item.payload.path === payloadPath && item.payload.title === payloadTitle && item.payload.event === event);
        if (duplicate) return;
        if (pending.length >= MAX_PENDING_EVENTS) saveLocalCount({ path: payloadPath, event });
        else pending.push({
            payload: {
            path: payloadPath,
            title: payloadTitle,
                event,
                referrer: document.referrer || SITE_URL
            },
            attempts: 0
        });
        flush();
    }

    function pageview(path, title) {
        count(path, title, false);
    }

    function sendInitialPageview() {
        if (initialPageviewSent) return;
        initialPageviewSent = true;
        const pagePath = location.pathname.replace(/^\/+/, '') || 'inicio';
        pageview(`/pagina/${slug(pagePath)}`, document.title);
    }

    window.UniversidadeLivreAnalytics = {
        slug,
        getLanguage,
        count,
        pageview,
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
        action(area, actionName, context) {
            const suffix = context ? `/${slug(context)}` : '';
            count(`/${slug(area)}/${slug(actionName)}${suffix}`, `${actionName}${context ? ` · ${context}` : ''}`);
        },
        event(area, actionName, context = {}) {
            const suffix = contextPath(context);
            count(`/evento/${slug(area)}/${slug(actionName)}/${suffix}`, `${actionName} · ${area}`);
        },
        search(area, term, context = {}) {
            const normalizedTerm = String(term || '').trim().slice(0, 80);
            if (normalizedTerm.length < 2) return;
            this.event(area, 'busca', { ...context, term: slug(normalizedTerm) });
        }
    };

    window.goatcounter = window.goatcounter || {};
    window.goatcounter.path = function () {
        const language = getLanguage();
        const pagePath = location.pathname.replace(/^\/+/, '') || 'inicio';
        return `/universidade-livre/idioma/${language.slug}/pagina/${slug(pagePath)}`;
    };
    window.goatcounter.title = function () {
        return `${document.title} · ${getLanguage().label}`;
    };

    window.addEventListener('languageChanged', (event) => {
        const language = event.detail && event.detail.lang === 'en' ? 'English' : 'Português';
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
        flush();
    }, { once: true });
})();
