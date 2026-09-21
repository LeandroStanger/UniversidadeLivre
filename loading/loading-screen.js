(function () {
    'use strict';

    function getLoadingLanguage() {
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
            screen.setAttribute('aria-label', language === 'pt'
                ? 'Carregando a Universidade Livre'
                : 'Loading Universidade Livre');
        }
    }

    function finishLoading() {
        const screen = document.getElementById('siteLoadingScreen');
        if (!screen) return;
        screen.classList.add('is-hidden');
        document.body.classList.remove('site-loading');
        window.setTimeout(() => screen.remove(), 400);
    }

    applyLoadingLanguage();

    if (document.readyState === 'complete') {
        finishLoading();
    } else {
        window.addEventListener('load', finishLoading, { once: true });
        window.setTimeout(finishLoading, 12000);
    }
})();
