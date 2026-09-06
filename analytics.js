// Integração central com GoatCounter.
(function () {
    'use strict';

    const SITE_URL = 'https://leandrostanger.github.io/UniversidadeLivre';
    const pending = [];
    const LOCAL_COUNTS_KEY = 'ulivre_analytics_local_counts';
    const MAX_PENDING_EVENTS = 100;
    const MAX_SEND_ATTEMPTS = 3;
    let retryTimer = null;
    let retryDelay = 1000;
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

    function scheduleFlush() {
        if (retryTimer || !pending.length) return;
        retryTimer = window.setTimeout(() => {
            retryTimer = null;
            retryDelay = Math.min(retryDelay * 2, 30000);
            flush();
        }, retryDelay);
    }

    function flush() {
        if (!window.goatcounter || typeof window.goatcounter.count !== 'function') {
            pending.forEach(event => { event.attempts += 1; });
            while (pending.length && pending[0].attempts >= MAX_SEND_ATTEMPTS) saveLocalCount(pending.shift().payload);
            scheduleFlush();
            return;
        }

        while (pending.length) {
            const queued = pending[0];
            try {
                window.goatcounter.count(queued.payload);
                pending.shift();
                retryDelay = 1000;
            } catch (error) {
                console.warn('[Analytics] Falha ao enviar evento:', error);
                queued.attempts += 1;
                if (queued.attempts >= MAX_SEND_ATTEMPTS) saveLocalCount(pending.shift().payload);
                else {
                    scheduleFlush();
                    return;
                }
            }
        }
    }

    function count(path, title, event = true) {
        const language = getLanguage();
        if (pending.length >= MAX_PENDING_EVENTS) saveLocalCount({ path: `/universidade-livre${languagePath(path)}`, event });
        else pending.push({
            payload: {
                path: `/universidade-livre${languagePath(path)}`,
                title: `${title || document.title} · ${language.label}`,
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
            pageview(`/curso/${slug(courseId)}`, courseName || `Curso ${courseId}`);
        },
        discipline(courseId, disciplineName) {
            pageview(`/curso/${slug(courseId)}/disciplina/${slug(disciplineName)}`, disciplineName);
        },
        lesson(courseId, disciplineName, lessonName) {
            pageview(`/curso/${slug(courseId)}/disciplina/${slug(disciplineName)}/aula/${slug(lessonName)}`, lessonName);
        },
        media(area, mediaId, title) {
            pageview(`/${slug(area)}/conteudo/${slug(mediaId)}`, title);
        },
        action(area, actionName, context) {
            const suffix = context ? `/${slug(context)}` : '';
            count(`/${slug(area)}/${slug(actionName)}${suffix}`, `${actionName}${context ? ` · ${context}` : ''}`);
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

    window.addEventListener('load', () => {
        const ready = window.i18nReady;
        if (ready && typeof ready.then === 'function') {
            ready.then(sendInitialPageview).catch(sendInitialPageview);
        } else {
            sendInitialPageview();
        }
        flush();
    }, { once: true });
})();
