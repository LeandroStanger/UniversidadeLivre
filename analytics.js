// Integração central com GoatCounter.
(function () {
    'use strict';

    const SITE_URL = 'https://leandrostanger.github.io/UniversidadeLivre';
    const pending = [];
    let retryTimer = null;

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

    function flush() {
        if (!window.goatcounter || typeof window.goatcounter.count !== 'function') {
            if (pending.length && !retryTimer) {
                retryTimer = window.setTimeout(() => {
                    retryTimer = null;
                    flush();
                }, 1000);
            }
            return;
        }

        while (pending.length) {
            const event = pending.shift();
            try {
                window.goatcounter.count(event);
            } catch (error) {
                console.warn('[Analytics] Falha ao enviar evento:', error);
            }
        }
    }

    function count(path, title, event = true) {
        const language = getLanguage();
        pending.push({
            path: `/universidade-livre${languagePath(path)}`,
            title: `${title || document.title} · ${language.label}`,
            event,
            referrer: document.referrer || SITE_URL
        });
        flush();
    }

    function pageview(path, title) {
        count(path, title, false);
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

    window.addEventListener('load', flush, { once: true });
})();
