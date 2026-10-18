(function () {
    'use strict';
    const startedAt = performance.now();

    function getLoadingLanguage() {
        try {
            const savedLanguage = localStorage.getItem('selectedLanguage');
            if (savedLanguage === 'pt-br') return 'pt';
            if (savedLanguage === 'es') return 'es';
            if (savedLanguage === 'en') return 'en';
        } catch (_) {
            // Use the browser language when storage is unavailable.
        }

        const languages = Array.isArray(navigator.languages) && navigator.languages.length
            ? navigator.languages
            : [navigator.language || 'en'];
        const browserLanguages = languages.map(language => String(language).toLowerCase());
        if (browserLanguages.some(language => language.startsWith('pt'))) return 'pt';
        if (browserLanguages.some(language => language.startsWith('es'))) return 'es';
        return 'en';
    }

    function applyLoadingLanguage() {
        const language = getLoadingLanguage();
        document.querySelectorAll('[data-loading-pt][data-loading-en]').forEach(element => {
            const suffix = language === 'pt' ? 'Pt' : language === 'es' ? 'Es' : 'En';
            element.textContent = element.dataset[`loading${suffix}`];
        });
        const screen = document.getElementById('siteLoadingScreen');
        if (screen) {
            screen.lang = language === 'pt' ? 'pt-BR' : language === 'es' ? 'es' : 'en';
            screen.setAttribute('aria-label', language === 'pt'
                ? 'Carregando a Universidade Livre'
                : language === 'es'
                    ? 'Cargando la Universidad Libre'
                : 'Loading Universidade Livre');
        }
    }

    function finishLoading() {
        const screen = document.getElementById('siteLoadingScreen');
        if (!screen) return;
        const wait = Math.max(0, 300 - (performance.now() - startedAt));
        window.setTimeout(() => {
            screen.classList.add('is-hidden');
            document.body.classList.remove('site-loading');
            window.setTimeout(() => screen.remove(), 400);
        }, wait);
    }

    function waitForApplicationReady() {
        const pageLoaded = document.readyState === 'complete'
            ? Promise.resolve()
            : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
        const translationsLoaded = window.i18nReady instanceof Promise
            ? window.i18nReady.catch(() => undefined)
            : Promise.resolve();
        const applicationReady = window.__applicationReady
            ? Promise.resolve()
            : new Promise(resolve => window.addEventListener('applicationReady', resolve, { once: true }));

        Promise.all([pageLoaded, translationsLoaded, applicationReady]).then(finishLoading);
    }

    applyLoadingLanguage();
    window.addEventListener('languageChanged', applyLoadingLanguage);
    window.addEventListener('storage', event => {
        if (event.key === 'selectedLanguage') applyLoadingLanguage();
    });

    waitForApplicationReady();
    window.setTimeout(finishLoading, 30000);
})();
