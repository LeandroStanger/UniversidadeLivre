(function () {
    'use strict';
    const startedAt = performance.now();

    function getLoadingLanguage() {
        try {
            const savedLanguage = localStorage.getItem('selectedLanguage');
            if (savedLanguage === 'pt-br') return 'pt';
            if (savedLanguage === 'en') return 'en';
        } catch (_) {
            // Use the browser language when storage is unavailable.
        }

        const languages = Array.isArray(navigator.languages) && navigator.languages.length
            ? navigator.languages
            : [navigator.language || 'en'];
        return languages.some(language => String(language).toLowerCase().startsWith('pt'))
            ? 'pt'
            : 'en';
    }

    function applyLoadingLanguage() {
        const language = getLoadingLanguage();
        document.querySelectorAll('[data-loading-pt][data-loading-en]').forEach(element => {
            element.textContent = element.dataset[`loading${language === 'pt' ? 'Pt' : 'En'}`];
        });
        const screen = document.getElementById('siteLoadingScreen');
        if (screen) {
            screen.lang = language === 'pt' ? 'pt-BR' : 'en';
            screen.setAttribute('aria-label', language === 'pt'
                ? 'Carregando a Universidade Livre'
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

    applyLoadingLanguage();
    window.addEventListener('languageChanged', applyLoadingLanguage);
    window.addEventListener('storage', event => {
        if (event.key === 'selectedLanguage') applyLoadingLanguage();
    });

    if (document.readyState === 'complete') {
        finishLoading();
    } else {
        window.addEventListener('load', finishLoading, { once: true });
        window.setTimeout(finishLoading, 12000);
    }
})();
