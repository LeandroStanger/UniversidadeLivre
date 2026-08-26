// i18n.js – Versão 2.0 – Módulo Centralizado de Internacionalização
// Carrega e gerencia as traduções para toda a aplicação
// Suporte a pt-br e en (expansível para outros idiomas)
// Fornece função t() global e dispara evento 'languageChanged'
// Armazena traduções em window.__translations para acesso global
// Fallback mínimo: exibe a chave se não encontrada (para facilitar depuração)

(function() {
    'use strict';

    // ========== ESTADO INTERNO ==========
    let currentLang = 'pt-br';
    let translations = {};
    let isLoaded = false;
    let loadingPromise = null;
    const listeners = [];

    // ========== DETECTAR IDIOMA DO SISTEMA ==========
    function detectSystemLanguage() {
        const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || '';
        if (browserLang.startsWith('pt')) return 'pt-br';
        if (browserLang.startsWith('en')) return 'en';
        return 'en';
    }

    // ========== CARREGAR TRADUÇÕES ==========
    async function loadTranslations(lang) {
        if (loadingPromise) {
            await loadingPromise;
            // Se o idioma já foi carregado e é o mesmo, retorna
            if (lang === currentLang && isLoaded) return;
        }

        loadingPromise = (async () => {
            const paths = [
                `/lang/${lang}.json`,
                `lang/${lang}.json`,
                `../lang/${lang}.json`,
                `./lang/${lang}.json`
            ];

            let data = null;
            for (const path of paths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        data = await response.json();
                        console.log(`[i18n] Traduções carregadas de: ${path}`);
                        break;
                    }
                } catch (e) {
                    // Continua tentando outros caminhos
                }
            }

            if (!data) {
                console.warn(`[i18n] Nenhum arquivo de tradução encontrado para "${lang}". Usando fallback vazio.`);
                data = {};
            }

            translations = data;
            currentLang = lang;
            isLoaded = true;

            // Expor traduções globalmente para outros módulos
            window.__translations = translations;

            // Salvar preferência
            localStorage.setItem('selectedLanguage', lang);

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
            // Fallback mínimo: exibe a chave para facilitar a identificação de faltas
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
            // Mesmo idioma, apenas reaplica as traduções (útil após recarregar)
            applyTranslationsToDOM();
            return;
        }

        await loadTranslations(lang);
        applyTranslationsToDOM();
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

        // Atributos data-i18n para elementos com texto
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                // Verifica se o elemento tem ícone para preservá-lo
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

        // Título da página
        if (translations.app_title) {
            document.title = translations.app_title;
        }

        console.log(`[i18n] Traduções aplicadas ao DOM (${currentLang}).`);
    }

    // ========== ADICIONAR OUVINTE DE MUDANÇA ==========
    function onLanguageChanged(callback) {
        if (typeof callback === 'function') {
            listeners.push(callback);
        }
    }

    // ========== INICIALIZAÇÃO ==========
    async function initI18n() {
        // Verificar se já foi inicializado
        if (window.__i18n_initialized) {
            console.log('[i18n] Já inicializado.');
            return;
        }

        // Detectar idioma salvo ou do sistema
        const savedLang = localStorage.getItem('selectedLanguage');
        let initialLang = savedLang;
        if (!initialLang) {
            initialLang = detectSystemLanguage();
        }

        // Carregar traduções
        await loadTranslations(initialLang);

        // Aplicar ao DOM
        applyTranslationsToDOM();

        // Marcar como inicializado
        window.__i18n_initialized = true;
        console.log(`[i18n] Inicializado com sucesso. Idioma: ${currentLang}`);
    }

    // ========== EXPOSIÇÃO GLOBAL ==========
    window.i18n = {
        init: initI18n,
        loadTranslations,
        setLanguage,
        getCurrentLanguage,
        getTranslations,
        t,
        applyTranslations: applyTranslationsToDOM,
        onLanguageChanged,
        // Atalho para compatibilidade com módulos antigos
        setLanguage,
        getLanguage: getCurrentLanguage,
        translate: t,
        apply: applyTranslationsToDOM
    };

    // Para compatibilidade com o sistema antigo, expõe também funções globais
    window.__translations = translations;
    window.t = t;
    window.setLanguage = setLanguage;
    window.getCurrentLanguage = getCurrentLanguage;
    window.applyTranslations = applyTranslationsToDOM;

    // ========== AUTOINICIALIZAÇÃO SEGURA ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initI18n);
    } else {
        initI18n();
    }

    console.log('[i18n] Módulo carregado.');
})();