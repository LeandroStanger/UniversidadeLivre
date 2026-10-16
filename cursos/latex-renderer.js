(function () {
    'use strict';

    const ready = new Promise((resolve, reject) => {
        window.MathJax = {
            tex: {
                inlineMath: [['\\(', '\\)'], ['$', '$']],
                displayMath: [['\\[', '\\]'], ['$$', '$$']],
                processEscapes: true,
                processEnvironments: true,
                packages: { '[+]': ['ams', 'boldsymbol', 'mathtools'] }
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
            },
            startup: {
                typeset: false,
                ready() {
                    window.MathJax.startup.defaultReady();
                    resolve(window.MathJax);
                }
            }
        };
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        script.async = true;
        script.onerror = () => reject(new Error('Não foi possível carregar o compilador LaTeX.'));
        document.head.appendChild(script);
    });

    window.renderLatex = function (root = document) {
        return ready
            .then(mathJax => mathJax.typesetPromise([root]))
            .catch(error => {
                console.warn('[LaTeX] Falha ao compilar fórmula:', error);
            });
    };
})();
