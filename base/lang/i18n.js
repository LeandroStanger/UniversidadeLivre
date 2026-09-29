// lang/i18n.js – Versão 3.4 – Módulo Central de Internacionalização
// ================================================================
// - CORREÇÃO: Traduções resolvidas a partir do diretório deste script
// - CORREÇÃO: Não sobrescreve funções se já definidas (preserva window.t)
// - CORREÇÃO: Logs detalhados para depuração
// - Persiste idioma em localStorage
// - Aplica traduções via data-i18n, data-i18n-placeholder, data-i18n-title
// - Suporte a placeholders {{var}}
// - Dispara evento 'languageChanged' ao trocar idioma

(function() {
    'use strict';

    console.log('[i18n] Inicializando módulo central v3.4...');

    // ========== ESTADO INTERNO ==========
    let currentLang = 'pt-br';
    let translations = {};
    let isLoaded = false;
    let loadingPromise = null;
    const listeners = [];
    let initialized = false;

    // ========== DETECTAR IDIOMA DO SISTEMA ==========
    function detectSystemLanguage() {
        const browserLang = String(navigator.language || (navigator.languages && navigator.languages[0]) || '').toLowerCase();
        if (browserLang.startsWith('pt')) return 'pt-br';
        if (browserLang.startsWith('es')) return 'es';
        if (browserLang.startsWith('en')) return 'en';
        return 'en';
    }

    function getDocumentLanguage(lang) {
        return lang === 'pt-br' ? 'pt-BR' : lang === 'es' ? 'es' : 'en';
    }

    // O caminho é calculado a partir do próprio script para funcionar tanto
    // na página inicial quanto nas páginas que ficam em subpastas.
    const translationBaseUrl = (() => {
        const script = document.currentScript;
        if (script && script.src) return new URL('.', script.src).href;
        return new URL('base/lang/', document.baseURI).href;
    })();

    // ========== CARREGAR TRADUÇÕES ==========
    async function loadTranslations(lang) {
        // Evita carregamento concorrente
        if (loadingPromise) {
            await loadingPromise;
            if (lang === currentLang && isLoaded) return;
        }

        loadingPromise = (async () => {
            const paths = [
                new URL(`${lang}.json`, translationBaseUrl).href
            ];

            let data = null;
            let loadedPath = '';

            for (const path of paths) {
                try {
                    console.log(`[i18n] Tentando carregar: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        data = await response.json();
                        loadedPath = path;
                        console.log(`[i18n] Traduções carregadas de: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.warn(`[i18n] Falha ao carregar ${path}:`, e.message);
                }
            }

            if (!data) {
                console.warn(`[i18n] Nenhum arquivo de tradução encontrado para "${lang}". Usando fallback vazio.`);
                data = {};
                loadedPath = '(fallback vazio)';
            }

            translations = data;
            currentLang = lang;
            isLoaded = true;

            // Expor traduções globalmente
            window.__translations = translations;

            // Salvar preferência
            try {
                localStorage.setItem('selectedLanguage', lang);
            } catch (_) { /* ignora */ }

            // Disparar evento para sincronizar outros módulos
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { lang }
            }));

            // Notificar ouvintes locais
            listeners.forEach(callback => callback(lang, translations));

            loadingPromise = null;
        })();

        return loadingPromise;
    }

    // ========== FUNÇÃO DE TRADUÇÃO (t) ==========
    function t(key, replacements = {}) {
        if (!key) return '';

        let text = translations[key];
        if (text === undefined) {
            // Fallback: exibe a chave para facilitar a identificação de faltas
            text = key;
        }

        // Substituir placeholders {{var}}
        for (const [k, v] of Object.entries(replacements)) {
            if (v !== undefined && v !== null) {
                text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
            }
        }

        return text;
    }

    // ========== ALTERAR IDIOMA ==========
    async function setLanguage(lang) {
        if (lang === currentLang && isLoaded) {
            // Mesmo idioma, apenas reaplica as traduções
            applyTranslationsToDOM();
            updateLanguageSelector(lang);
            document.documentElement.lang = getDocumentLanguage(lang);
            return;
        }

        await loadTranslations(lang);
        applyTranslationsToDOM();
        updateLanguageSelector(lang);
        document.documentElement.lang = getDocumentLanguage(lang);
    }

    // ========== OBTER IDIOMA ATUAL ==========
    function getCurrentLanguage() {
        return currentLang;
    }

    // ========== OBTER TRADUÇÕES ==========
    function getTranslations() {
        return translations;
    }

    // ========== APLICAR TRADUÇÕES AO DOM ==========
    function applyTranslationsToDOM() {
        if (!isLoaded || Object.keys(translations).length === 0) {
            console.warn('[i18n] Aplicação de traduções ignorada: traduções não carregadas.');
            return;
        }

        console.log('[i18n] Aplicando traduções ao DOM...');

        // Elementos com data-i18n (texto)
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                // Preserva ícone se existir
                const icon = el.querySelector('i');
                if (icon) {
                    const iconClone = icon.cloneNode(true);
                    el.innerHTML = '';
                    el.appendChild(iconClone);
                    el.appendChild(document.createTextNode(' ' + translations[key]));
                } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[key];
                } else {
                    el.innerText = translations[key];
                }
            } else {
                console.warn(`[i18n] Chave não encontrada: ${key}`);
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[key]) el.placeholder = translations[key];
        });

        // Títulos (tooltips)
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (translations[key]) el.title = translations[key];
        });

        // Acessibilidade
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            if (translations[key]) el.setAttribute('aria-label', translations[key]);
        });

        // Título da página
        if (translations.app_title) {
            document.title = translations.app_title;
        }

        console.log(`[i18n] Traduções aplicadas ao DOM (${currentLang}).`);
    }

    // ========== ATUALIZAR SELETOR DE IDIOMA ==========
    function updateLanguageSelector(lang) {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        const esBtn = document.getElementById('langEsBtn');
        ptBtn?.classList.toggle('active', lang === 'pt-br');
        enBtn?.classList.toggle('active', lang === 'en');
        esBtn?.classList.toggle('active', lang === 'es');
        ptBtn?.setAttribute('aria-checked', String(lang === 'pt-br'));
        enBtn?.setAttribute('aria-checked', String(lang === 'en'));
        esBtn?.setAttribute('aria-checked', String(lang === 'es'));
        const selectedLanguageLabel = document.getElementById('selectedLanguageLabel');
        if (selectedLanguageLabel) {
            selectedLanguageLabel.textContent = ({
                'pt-br': 'Português',
                en: 'English',
                es: 'Español'
            })[lang] || 'Português';
        }
    }

    // ========== ADICIONAR OUVINTE DE MUDANÇA ==========
    function onLanguageChanged(callback) {
        if (typeof callback === 'function') {
            listeners.push(callback);
        }
    }

    // ========== INICIALIZAÇÃO ==========
    async function initI18n() {
        if (window.__i18n_initialized) {
            console.log('[i18n] Já inicializado.');
            return;
        }

        // Detectar idioma salvo ou do sistema
        let initialLang = null;
        try {
            initialLang = localStorage.getItem('selectedLanguage');
        } catch (_) { /* ignora */ }

        if (!initialLang) {
            initialLang = detectSystemLanguage();
        }

        // Carregar traduções
        await loadTranslations(initialLang);

        // Aguardar DOM pronto para aplicar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                applyTranslationsToDOM();
                setupLanguageButtons();
                updateLanguageSelector(initialLang);
                document.documentElement.lang = getDocumentLanguage(initialLang);
            });
        } else {
            applyTranslationsToDOM();
            setupLanguageButtons();
            updateLanguageSelector(initialLang);
            document.documentElement.lang = getDocumentLanguage(initialLang);
        }

        // Marcar como inicializado
        window.__i18n_initialized = true;
        console.log(`[i18n] Inicializado com sucesso. Idioma: ${currentLang}`);
    }

    // ========== CONFIGURAR BOTÕES DE IDIOMA ==========
    function setupLanguageButtons() {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        const esBtn = document.getElementById('langEsBtn');
        const toggle = document.getElementById('langDropdownToggle');
        const menu = document.getElementById('languageMenu');

        if (toggle && menu) {
            menu.classList.add('lang-dropdown-menu--portal');
            document.body.appendChild(menu);

            const positionMenu = () => {
                if (menu.hidden) return;

                const toggleRect = toggle.getBoundingClientRect();
                const menuRect = menu.getBoundingClientRect();
                const edgeGap = 8;
                const gap = 6;
                const left = Math.max(
                    edgeGap,
                    Math.min(toggleRect.right - menuRect.width, window.innerWidth - menuRect.width - edgeGap)
                );
                let top = toggleRect.bottom + gap;

                if (top + menuRect.height > window.innerHeight - edgeGap) {
                    top = Math.max(edgeGap, toggleRect.top - menuRect.height - gap);
                }

                menu.style.left = `${left}px`;
                menu.style.top = `${top}px`;
            };
            const closeMenu = () => {
                menu.hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
            };
            toggle.addEventListener('click', event => {
                event.stopPropagation();
                menu.hidden = !menu.hidden;
                toggle.setAttribute('aria-expanded', String(!menu.hidden));
                positionMenu();
            });
            window.addEventListener('resize', positionMenu);
            document.addEventListener('scroll', positionMenu, true);
            menu.addEventListener('click', event => {
                if (event.target instanceof Element && event.target.closest('.lang-btn')) closeMenu();
            });
            document.addEventListener('click', event => {
                if (!menu.contains(event.target) && !toggle.contains(event.target)) closeMenu();
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape' && !menu.hidden) {
                    closeMenu();
                    toggle.focus();
                }
            });
        }

        if (ptBtn) {
            // Remove listeners antigos para evitar duplicação
            const newPtBtn = ptBtn.cloneNode(true);
            ptBtn.parentNode.replaceChild(newPtBtn, ptBtn);
            newPtBtn.addEventListener('click', function() {
                setLanguage('pt-br');
            });
        }

        if (enBtn) {
            const newEnBtn = enBtn.cloneNode(true);
            enBtn.parentNode.replaceChild(newEnBtn, enBtn);
            newEnBtn.addEventListener('click', function() {
                setLanguage('en');
            });
        }

        if (esBtn) {
            const newEsBtn = esBtn.cloneNode(true);
            esBtn.parentNode.replaceChild(newEsBtn, esBtn);
            newEsBtn.addEventListener('click', function() {
                setLanguage('es');
            });
        }

        console.log('[i18n] Listeners dos botões de idioma configurados.');
    }

    // ========== EXPOSIÇÃO GLOBAL ==========
    // Apenas define se ainda não existirem, para evitar sobrescrita
    if (!window.i18n) {
        window.i18n = {
            init: initI18n,
            loadTranslations,
            setLanguage,
            getCurrentLanguage,
            getTranslations,
            t,
            applyTranslations: applyTranslationsToDOM,
            onLanguageChanged
        };
    }

    // Funções globais (não sobrescrever se já existirem)
    if (typeof window.t !== 'function') {
        window.t = t;
    }
    if (typeof window.setLanguage !== 'function') {
        window.setLanguage = setLanguage;
    }
    if (typeof window.getCurrentLanguage !== 'function') {
        window.getCurrentLanguage = getCurrentLanguage;
    }
    if (typeof window.applyTranslations !== 'function') {
        window.applyTranslations = applyTranslationsToDOM;
    }
    if (typeof window.updateLanguageSelector !== 'function') {
        window.updateLanguageSelector = updateLanguageSelector;
    }
    window.addEventListener('languageChanged', event => {
        updateLanguageSelector(event.detail?.lang || currentLang);
    });

    // Expor traduções brutas (read-only)
    Object.defineProperty(window, '__translations', {
        get: function() { return translations; },
        set: function() { /* read-only */ }
    });

    // ========== AUTOINICIALIZAÇÃO ==========
    if (document.readyState === 'loading') {
        window.i18nReady = new Promise((resolve, reject) => {
            document.addEventListener('DOMContentLoaded', () => {
                initI18n().then(resolve).catch(reject);
            }, { once: true });
        });
    } else {
        window.i18nReady = initI18n();
    }

    console.log('[i18n] Módulo carregado.');
})();