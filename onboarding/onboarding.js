// onboarding/onboarding.js – Versão 22.1 – CORREÇÃO DE INERT E INTERAÇÃO
// Trilha de boas-vindas (Onboarding) com Login, Cadastro, Importação de progresso
// Suporte a verificação de senha para importação (incluindo arquivos criptografados)
// Restauração completa do perfil (nome, gênero, avatar, matrícula, tempo, cursos, etc.)
// CORREÇÃO: Remoção do atributo inert ao abrir o modal e recolocação ao fechar
// CORREÇÃO: Garantia de pointer-events e z-index para interação
// CORREÇÃO: Inicialização robusta mesmo quando o DOM não está pronto

(function() {
    'use strict';

    console.log('[Onboarding] Inicializando módulo v22.1...');

    // ========== CONSTANTES ==========
    const ONBOARDING_COMPLETE_KEY = 'ulivre_onboarding_complete';
    const TOTAL_STEPS = 5; // 0 a 4

    // ========== ESTADO GLOBAL ==========
    let modal = null;
    let stepsContainer = null;
    let prevBtn = null;
    let nextBtn = null;
    let finishBtn = null;
    let currentStep = 0;
    let loginMode = true; // true = modo login, false = modo cadastro
    let selectedLang = null; // 'pt-br' ou 'en'

    let formData = {
        name: '',
        gender: '',
        password: '',
        avatar: null // base64 ou null
    };

    // ========== FUNÇÕES DE CRIPTOGRAFIA EMBUTIDAS ==========
    async function deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async function encryptData(data, password) {
        try {
            const encoder = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const key = await deriveKey(password, salt);
            const jsonString = JSON.stringify(data);
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(jsonString)
            );
            const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
            result.set(salt, 0);
            result.set(iv, salt.length);
            result.set(new Uint8Array(encrypted), salt.length + iv.length);
            return btoa(String.fromCharCode.apply(null, result));
        } catch (error) {
            console.error('[Onboarding] Erro na criptografia:', error);
            throw new Error('Falha ao criptografar dados: ' + error.message);
        }
    }

    async function decryptData(encryptedBase64, password) {
        try {
            const encrypted = Uint8Array.from(atob(encryptedBase64), function(c) { return c.charCodeAt(0); });
            const salt = encrypted.slice(0, 16);
            const iv = encrypted.slice(16, 28);
            const data = encrypted.slice(28);
            const key = await deriveKey(password, salt);
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('[Onboarding] Erro na descriptografia:', error);
            throw new Error('Falha ao descriptografar dados: ' + error.message);
        }
    }

    async function verifyPassword(inputPassword, storedHash) {
        if (!storedHash) return false;
        const encoder = new TextEncoder();
        const data = encoder.encode(inputPassword);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
        return hashBase64 === storedHash;
    }

    async function hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
    }

    // ========== TRADUÇÃO (INTEGRAÇÃO COM i18n CENTRAL) ==========
    function t(key, replacements = {}) {
        if (window.t && typeof window.t === 'function') {
            try {
                return window.t(key, replacements);
            } catch (e) { /* fallback */ }
        }
        let text = (window.__translations && window.__translations[key]) || key;
        for (const k in replacements) {
            if (replacements.hasOwnProperty(k)) {
                text = text.replace(new RegExp('{{' + k + '}}', 'g'), replacements[k]);
            }
        }
        return text;
    }

    // ========== CARREGAR TRADUÇÕES ==========
    async function loadTranslations(lang) {
        if (window.i18n && typeof window.i18n.loadTranslations === 'function') {
            try {
                await window.i18n.loadTranslations(lang);
                if (window.i18n.getTranslations) {
                    window.__translations = window.i18n.getTranslations();
                }
                return true;
            } catch (e) {
                console.warn('[Onboarding] Falha ao carregar do i18n central:', e);
            }
        }

        const paths = [
            `../lang/${lang}.json`,
            `lang/${lang}.json`,
            `/lang/${lang}.json`,
            `./lang/${lang}.json`
        ];
        for (const path of paths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    window.__translations = await response.json();
                    return true;
                }
            } catch (e) { /* continua */ }
        }
        console.warn('[Onboarding] Nenhum arquivo de tradução encontrado. Usando chaves como fallback.');
        window.__translations = {};
        return false;
    }

    // ========== APLICAR TRADUÇÕES NO DOM ==========
    function applyTranslations() {
        if (window.applyTranslations && typeof window.applyTranslations === 'function') {
            try {
                window.applyTranslations();
                return;
            } catch (e) {
                console.warn('[Onboarding] Erro ao chamar applyTranslations central:', e);
            }
        }

        const translations = window.__translations || {};
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (translations[key]) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = translations[key];
                } else {
                    const icon = el.querySelector('i');
                    if (icon) {
                        const cloneIcon = icon.cloneNode(true);
                        el.innerHTML = '';
                        el.appendChild(cloneIcon);
                        el.appendChild(document.createTextNode(' ' + translations[key]));
                    } else {
                        el.innerText = translations[key];
                    }
                }
            }
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (translations[key]) el.placeholder = translations[key];
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (translations[key]) el.title = translations[key];
        });
        if (translations.app_title) {
            document.title = translations.app_title;
        }
    }

    // ========== INICIALIZAR ELEMENTOS ==========
    function initElements() {
        modal = document.getElementById('onboardingModal');
        if (modal && !document.getElementById('onboardingSteps')) {
            modal.innerHTML = `
                <div class="onboarding-modal-content">
                    <div id="onboardingSteps" class="onboarding-steps"></div>
                    <div class="onboarding-footer">
                        <button id="onboardingPrev" class="btn-secondary" style="display:none;"></button>
                        <button id="onboardingNext" class="btn-primary"></button>
                        <button id="onboardingFinish" class="btn-primary" style="display:none;"></button>
                    </div>
                </div>
            `;
        }
        stepsContainer = document.getElementById('onboardingSteps');
        prevBtn = document.getElementById('onboardingPrev');
        nextBtn = document.getElementById('onboardingNext');
        finishBtn = document.getElementById('onboardingFinish');

        if (!modal || !stepsContainer) {
            console.warn('[Onboarding] Elementos principais não encontrados. Verifique o HTML.');
            return false;
        }

        if (!prevBtn || !nextBtn || !finishBtn) {
            console.warn('[Onboarding] Algum botão não foi encontrado no DOM.');
            return false;
        }

        return true;
    }

    // ========== RENDERIZAR PASSO ATUAL ==========
    function renderStep(index) {
        const steps = stepsContainer.querySelectorAll('.step');
        steps.forEach((s, i) => s.classList.toggle('active', i === index));

        prevBtn.style.display = index === 0 ? 'none' : 'inline-flex';
        finishBtn.style.display = index === TOTAL_STEPS - 1 ? 'inline-flex' : 'none';

        if (index === 0) {
            if (selectedLang) {
                nextBtn.style.display = 'inline-flex';
                nextBtn.disabled = false;
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            } else {
                nextBtn.style.display = 'inline-flex';
                nextBtn.disabled = true;
                nextBtn.style.opacity = '0.5';
                nextBtn.style.cursor = 'not-allowed';
            }
        } else if (index === 1 || index === 2) {
            nextBtn.style.display = 'inline-flex';
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        } else if (index === 3 && loginMode) {
            nextBtn.style.display = 'none';
        } else if (index === TOTAL_STEPS - 1) {
            nextBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'inline-flex';
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        }

        prevBtn.textContent = t('onboarding_button_prev');
        nextBtn.textContent = t('onboarding_button_next');
        finishBtn.textContent = t('onboarding_button_finish');

        if (index === 3) {
            updateModeUI();
            if (!loginMode) {
                const passwordInput = document.getElementById('onboardingPassword');
                if (passwordInput && passwordInput.value) {
                    updatePasswordStrength(passwordInput.value);
                }
            }
        }

        if (index === 3) {
            if (loginMode) {
                const loginPass = document.getElementById('onboardingLoginPassword');
                if (loginPass) setTimeout(() => loginPass.focus(), 150);
            } else {
                const nameInput = document.getElementById('onboardingName');
                if (nameInput) setTimeout(() => nameInput.focus(), 150);
            }
        }

        applyTranslations();
    }

    // ========== ESCOLHA DE IDIOMA ==========
    function handleLanguageSelect(lang) {
        selectedLang = lang;
        const ptBtn = document.getElementById('onboardingLangPt');
        const enBtn = document.getElementById('onboardingLangEn');
        if (ptBtn && enBtn) {
            ptBtn.style.borderColor = lang === 'pt-br' ? 'var(--accent-blue)' : 'var(--border)';
            ptBtn.style.background = lang === 'pt-br' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)';
            enBtn.style.borderColor = lang === 'en' ? 'var(--accent-blue)' : 'var(--border)';
            enBtn.style.background = lang === 'en' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)';
        }
        const errorDiv = document.getElementById('onboardingLangError');
        if (errorDiv) errorDiv.style.display = 'none';

        if (window.setLanguage && typeof window.setLanguage === 'function') {
            window.setLanguage(lang);
        } else {
            localStorage.setItem('selectedLanguage', lang);
            loadTranslations(lang).then(() => {
                applyTranslations();
                renderStep(currentStep);
            });
        }

        renderStep(currentStep);
        nextBtn.disabled = false;
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }

    // ========== MODO LOGIN / CADASTRO ==========
    function updateModeUI() {
        const signupDiv = document.getElementById('onboardingSignupMode');
        const loginDiv = document.getElementById('onboardingLoginMode');
        const title = document.getElementById('onboardingModeTitle');

        if (!signupDiv || !loginDiv || !title) return;

        if (loginMode) {
            signupDiv.style.display = 'none';
            loginDiv.style.display = 'block';
            title.textContent = t('onboarding_login_button');
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'none';
            updateImportButtonState();
        } else {
            signupDiv.style.display = 'block';
            loginDiv.style.display = 'none';
            title.textContent = t('onboarding_form_title');
            renderStep(currentStep);
        }
        applyTranslations();
    }

    // ========== IMPORTAÇÃO (LOGIN VIA ARQUIVO) ==========
    function handleImportProgress() {
        const passwordInput = document.getElementById('onboardingLoginPassword');
        if (!passwordInput) return;

        const password = passwordInput.value.trim();
        if (!password) {
            const errorDiv = document.getElementById('onboardingLoginError');
            if (errorDiv) {
                errorDiv.textContent = t('onboarding_error_password_required');
                errorDiv.style.display = 'block';
            }
            return;
        }

        const fileInput = document.getElementById('onboardingImportFileInput');
        if (fileInput) {
            fileInput.click();
        } else {
            console.error('[Onboarding] Input de arquivo não encontrado');
        }
    }

    // ========== MANIPULADOR DE ARQUIVO DE IMPORTAÇÃO ==========
    function onImportFileSelected(e) {
        const file = e.target.files[0];
        if (!file) return;

        const passwordInput = document.getElementById('onboardingLoginPassword');
        const password = passwordInput ? passwordInput.value.trim() : '';

        const reader = new FileReader();
        reader.onload = async function(ev) {
            try {
                let importedData = JSON.parse(ev.target.result);

                if (importedData.encrypted === true) {
                    if (!password) {
                        showToast(t('onboarding_error_password_required'), 'error');
                        return;
                    }

                    try {
                        const decrypted = await decryptData(importedData.data, password);
                        applyImportedData(decrypted);
                    } catch (err) {
                        console.error('[Onboarding] Erro na descriptografia:', err);
                        showToast(t('onboarding_error_login_failed'), 'error');
                    }
                    return;
                }

                if (importedData.password) {
                    const storedPassword = importedData.password;

                    try {
                        const match = await verifyPassword(password, storedPassword);
                        if (match) {
                            applyImportedData(importedData);
                        } else {
                            showToast(t('onboarding_error_login_failed'), 'error');
                        }
                    } catch (err) {
                        showToast(t('onboarding_error_login_failed'), 'error');
                    }
                } else {
                    applyImportedData(importedData);
                }
            } catch (err) {
                console.error('[Onboarding] Erro na importação:', err);
                showToast('Erro ao importar arquivo. Verifique se o arquivo é válido.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // ========== APLICAR DADOS IMPORTADOS ==========
    function applyImportedData(importedData) {
        if (!importedData.user) {
            showToast('Arquivo inválido: usuário não encontrado.', 'error');
            return;
        }

        if (importedData.user) localStorage.setItem('userProfileName', importedData.user);
        if (importedData.gender) localStorage.setItem('userGender', importedData.gender);
        if (importedData.avatar) {
            localStorage.setItem('userAvatar', importedData.avatar);
            if (window.saveUserAvatar && typeof window.saveUserAvatar === 'function') {
                window.saveUserAvatar(importedData.avatar);
            }
        }
        if (importedData.matricula) localStorage.setItem('userMatricula', importedData.matricula);
        if (importedData.auditorioTime) localStorage.setItem('auditorio_total_time', importedData.auditorioTime);

        let importedCount = 0;
        if (importedData.data && importedData.data.courses) {
            importedData.data.courses.forEach(c => {
                if (c.id && c.rawData) {
                    localStorage.setItem('ulivre_course_' + c.id, JSON.stringify(c.rawData));
                    importedCount++;
                }
            });
        }

        if (importedData.data && importedData.data.videos) {
            localStorage.setItem('yt_video_progress', JSON.stringify(importedData.data.videos));
        }
        if (importedData.data && importedData.data.booksRead) {
            localStorage.setItem('ulivre_livros_lidos', JSON.stringify(importedData.data.booksRead));
        }
        if (importedData.data && importedData.data.notes) {
            localStorage.setItem('ulivre_notas_estudo', JSON.stringify(importedData.data.notes));
        }
        if (importedData.data && importedData.data.tags) {
            localStorage.setItem('ulivre_notas_tags', JSON.stringify(importedData.data.tags));
        }
        if (importedData.data && importedData.data.community && typeof importedData.data.community === 'object') {
            Object.entries(importedData.data.community).forEach(([key, value]) => {
                if (key.startsWith('comunidade_posts_') || key.startsWith('comunidade_chat_')) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            });
        }
        if (importedData.data && importedData.data.cursorTimeset && typeof importedData.data.cursorTimeset === 'object') {
            Object.entries(importedData.data.cursorTimeset).forEach(([key, value]) => {
                if (key.startsWith('cursor_timeset')) {
                    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                }
            });
        }

        localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');

        closeOnboarding();

        if (window.updateProfileButton) window.updateProfileButton();
        if (window.updateProfileModal) window.updateProfileModal();

        window.dispatchEvent(new CustomEvent('onboardingComplete'));

        showToast(t('profile_import_success', { count: importedCount }), 'success');

        setTimeout(() => {
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                window.location.reload();
            } else {
                window.location.href = 'index.html';
            }
        }, 1500);
    }

    // ========== ATUALIZAR ESTADO DO BOTÃO DE IMPORTAÇÃO ==========
    function updateImportButtonState() {
        const importBtn = document.getElementById('onboardingImportProgressBtn');
        const passwordInput = document.getElementById('onboardingLoginPassword');
        if (!importBtn || !passwordInput) return;

        const hasPassword = passwordInput.value.trim().length > 0;
        importBtn.disabled = !hasPassword;
        importBtn.style.opacity = hasPassword ? '1' : '0.5';
        importBtn.style.cursor = hasPassword ? 'pointer' : 'not-allowed';
    }

    // ========== MUTATION OBSERVER PARA DETECTAR CAMPO DE SENHA ==========
    let passwordObserver = null;

    function startPasswordObserver() {
        if (passwordObserver) {
            passwordObserver.disconnect();
            passwordObserver = null;
        }

        passwordObserver = new MutationObserver(function(mutations) {
            const passwordInput = document.getElementById('onboardingLoginPassword');
            if (passwordInput) {
                if (!passwordInput._listenerAttached) {
                    attachPasswordListener(passwordInput);
                }
            }
        });

        if (stepsContainer) {
            passwordObserver.observe(stepsContainer, {
                childList: true,
                subtree: true
            });
        }

        const passwordInput = document.getElementById('onboardingLoginPassword');
        if (passwordInput) {
            attachPasswordListener(passwordInput);
        }

        console.log('[Onboarding] MutationObserver de senha iniciado.');
    }

    function attachPasswordListener(passwordInput) {
        if (!passwordInput) {
            passwordInput = document.getElementById('onboardingLoginPassword');
        }
        if (!passwordInput) return;

        if (passwordInput._listenerAttached) {
            passwordInput.removeEventListener('input', onPasswordInputDirect);
            passwordInput._listenerAttached = false;
        }

        passwordInput.addEventListener('input', onPasswordInputDirect);
        passwordInput._listenerAttached = true;

        updateImportButtonState();
        console.log('[Onboarding] Listener de senha anexado com sucesso.');
    }

    function onPasswordInputDirect(e) {
        updateImportButtonState();
    }

    // ========== CONSTRUIR PASSOS ==========
    function buildSteps() {
        loginMode = true;

        const stepsHtml = `
            <!-- Passo 0: Escolha de idioma -->
            <div class="step active" data-step="0">
                <h2><i class="fas fa-globe"></i> ${t('onboarding_language_title')}</h2>
                <p>${t('onboarding_language_text')}</p>
                <div style="display: flex; gap: 1rem; justify-content: center; margin: 1.5rem 0;">
                    <button id="onboardingLangPt" class="lang-select-btn" data-lang="pt-br" style="padding: 0.8rem 2rem; border-radius: 2rem; border: 2px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 1.2rem; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); min-width: 120px;">
                        🇧🇷 Português
                    </button>
                    <button id="onboardingLangEn" class="lang-select-btn" data-lang="en" style="padding: 0.8rem 2rem; border-radius: 2rem; border: 2px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); font-size: 1.2rem; font-weight: 600; cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); min-width: 120px;">
                        🇺🇸 English
                    </button>
                </div>
                <div id="onboardingLangError" class="form-error" style="display:none; text-align: center;">${t('onboarding_error_language_required')}</div>
            </div>
            <!-- Passo 1: Boas-vindas -->
            <div class="step" data-step="1">
                <img src="logo-da-universidade-livre.png" alt="Universidade Livre" class="logo-large" style="max-width:120px; margin:0 auto 1rem; display:block;">
                <h2><i class="fas fa-hand-wave"></i> ${t('onboarding_welcome_title')}</h2>
                <p>${t('onboarding_welcome_text')}</p>
                <p style="font-size:0.9rem; color:var(--text-tertiary); margin-top:1rem;">${t('main_program_description')}</p>
            </div>
            <!-- Passo 2: Sobre o projeto -->
            <div class="step" data-step="2">
                <h2><i class="fas fa-info-circle"></i> ${t('onboarding_about_title')}</h2>
                <p>${t('onboarding_about_text')}</p>
                <p style="font-size:0.9rem; color:var(--text-secondary);">${t('course_progress')} – ${t('course_hours')}</p>
            </div>
            <!-- Passo 3: Login (apenas senha + importação) -->
            <div class="step" data-step="3">
                <h2><i class="fas fa-sign-in-alt"></i> <span id="onboardingModeTitle">${t('onboarding_login_button')}</span></h2>

                <div id="onboardingLoginMode">
                    <div class="form-group">
                        <label for="onboardingLoginPassword">${t('onboarding_login_password_label')}</label>
                        <input type="password" id="onboardingLoginPassword" placeholder="${t('onboarding_login_password_placeholder')}">
                        <div id="onboardingLoginError" class="form-error" style="display:none;">${t('onboarding_error_login_failed')}</div>
                    </div>
                    <div style="display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: 0.5rem;">
                        <button type="button" id="onboardingImportProgressBtn" class="btn-secondary" style="background: var(--accent-green); color: #070B14; border: none; opacity: 0.5; cursor: not-allowed;" disabled><i class="fas fa-file-import"></i> ${t('profile_import_progress')}</button>
                        <input type="file" id="onboardingImportFileInput" accept=".json" style="display: none;">
                    </div>

                    <div style="margin-top: 1.5rem; text-align: center; border-top: 1px solid var(--border); padding-top: 1.5rem;">
                        <button type="button" id="onboardingToggleModeBtn" class="btn-secondary" style="font-size:0.85rem; background:transparent; border:none; color:var(--accent-teal); cursor:pointer; text-decoration:underline;">
                            ${t('onboarding_create_account')}
                        </button>
                    </div>
                </div>

                <div id="onboardingSignupMode" style="display: none;">
                    <div class="form-group">
                        <label for="onboardingName">${t('onboarding_form_name_label')}</label>
                        <input type="text" id="onboardingName" placeholder="${t('onboarding_form_name_placeholder')}" value="${formData.name}" autofocus>
                        <div id="onboardingNameError" class="form-error" style="display:none;">${t('onboarding_error_name_required')}</div>
                    </div>
                    <div class="form-group">
                        <label for="onboardingGender">${t('onboarding_form_gender_label')} <span style="color:#EF4444;">*</span></label>
                        <select id="onboardingGender">
                            <option value="">${t('onboarding_form_gender_not_informed')}</option>
                            <option value="masculino">${t('onboarding_form_gender_masculine')}</option>
                            <option value="feminino">${t('onboarding_form_gender_feminine')}</option>
                            <option value="outro">${t('onboarding_form_gender_other')}</option>
                        </select>
                        <div id="onboardingGenderError" class="form-error" style="display:none;">${t('onboarding_error_gender_required')}</div>
                    </div>
                    <div class="form-group">
                        <label for="onboardingPassword">${t('onboarding_form_password_label')}</label>
                        <div style="position:relative;">
                            <input type="password" id="onboardingPassword" placeholder="${t('onboarding_form_password_placeholder')}" value="${formData.password}" style="padding-right:40px;">
                            <button type="button" id="onboardingTogglePassword" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:1.1rem;">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <div id="passwordStrengthIndicator" style="margin-top: 6px;"></div>
                        <div id="onboardingPasswordError" class="form-error" style="display:none;">${t('onboarding_error_password_min')}</div>
                    </div>
                    <div class="form-group">
                        <label for="onboardingConfirmPassword">${t('onboarding_form_confirm_password_label')}</label>
                        <input type="password" id="onboardingConfirmPassword" placeholder="${t('onboarding_form_confirm_password_placeholder')}">
                        <div id="onboardingConfirmError" class="form-error" style="display:none;">${t('onboarding_error_password_mismatch')}</div>
                    </div>
                    <div class="form-group">
                        <label>${t('onboarding_form_avatar_label')}</label>
                        <div id="avatarSelectorContainer" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 10px; margin-top: 6px; padding: 4px 0; max-height: 280px; overflow-y: auto; overflow-x: hidden;"></div>
                        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                            <button type="button" id="onboardingUploadAvatar" class="btn-secondary" style="padding:4px 12px; font-size:0.8rem;">
                                <i class="fas fa-upload"></i> ${t('onboarding_form_avatar_upload')}
                            </button>
                            <button type="button" id="onboardingRemoveAvatar" class="btn-secondary" style="padding:4px 12px; font-size:0.8rem; background:var(--bg-tertiary);">
                                <i class="fas fa-trash-alt"></i> ${t('onboarding_form_avatar_remove')}
                            </button>
                            <button type="button" id="onboardingAvatarLicense" class="btn-secondary" style="padding:4px 12px; font-size:0.7rem; background:transparent; border-color:var(--border);">
                                <i class="fas fa-balance-scale"></i> ${t('onboarding_form_avatar_license')}
                            </button>
                        </div>
                        <input type="file" id="onboardingAvatarInput" accept="image/*" style="display:none;">
                    </div>
                    <div style="margin-top: 0.5rem; text-align: center;">
                        <button type="button" id="onboardingToggleModeBackBtn" class="btn-secondary" style="font-size:0.85rem; background:transparent; border:none; color:var(--accent-teal); cursor:pointer; text-decoration:underline;">
                            ${t('onboarding_switch_to_login')}
                        </button>
                    </div>
                </div>
            </div>
            <!-- Passo 4: Confirmação -->
            <div class="step" data-step="4">
                <h2><i class="fas fa-check-circle"></i> ${t('onboarding_confirm_title')}</h2>
                <p>${t('onboarding_confirm_text')}</p>
                <p style="margin-top:1rem; color:var(--accent-green);"><i class="fas fa-graduation-cap"></i> ${t('course_progress')}: 0%</p>
            </div>
        `;
        stepsContainer.innerHTML = stepsHtml;

        const ptBtn = document.getElementById('onboardingLangPt');
        const enBtn = document.getElementById('onboardingLangEn');
        if (ptBtn) {
            ptBtn.addEventListener('click', function() {
                handleLanguageSelect('pt-br');
            });
        }
        if (enBtn) {
            enBtn.addEventListener('click', function() {
                handleLanguageSelect('en');
            });
        }

        initAvatarSelector();
        initPasswordToggle();
        initAvatarUpload();
        initAvatarRemove();
        initAvatarLicense();
        initToggleEvents();
        initImportEvents();

        const savedLang = localStorage.getItem('selectedLanguage') || (navigator.language?.startsWith('pt') ? 'pt-br' : 'en');
        if (savedLang) {
            selectedLang = savedLang;
            if (ptBtn && enBtn) {
                ptBtn.style.borderColor = savedLang === 'pt-br' ? 'var(--accent-blue)' : 'var(--border)';
                ptBtn.style.background = savedLang === 'pt-br' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)';
                enBtn.style.borderColor = savedLang === 'en' ? 'var(--accent-blue)' : 'var(--border)';
                enBtn.style.background = savedLang === 'en' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)';
            }
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.style.opacity = '1';
                nextBtn.style.cursor = 'pointer';
            }
        }

        applyTranslations();
        updateImportButtonState();
        updateModeUI();
        startPasswordObserver();
    }

    // ========== AVATAR ==========
    const DEFAULT_AVATARS = [
        { key: 'avatar_aguia', file: 'Aguia.png' },
        { key: 'avatar_guepardo', file: 'Guepardo.png' },
        { key: 'avatar_gato', file: 'Gato.png' },
        { key: 'avatar_cachorro', file: 'Cachorro.png' },
        { key: 'avatar_passaro', file: 'Passaro.png' },
        { key: 'avatar_papagaio_do_mar', file: 'Paragaio-do-mar.png' },
        { key: 'avatar_pato', file: 'Pato.png' },
        { key: 'avatar_galo', file: 'Galo.png' },
        { key: 'avatar_flamingo', file: 'Flamingo.png' },
        { key: 'avatar_cavalo', file: 'Cavalo.png' },
        { key: 'avatar_dragao_barbudo', file: 'Dragao-barbudo.png' },
        { key: 'avatar_leao', file: 'Leao.png' },
        { key: 'avatar_urso', file: 'Urso.png' },
        { key: 'avatar_columba_livia', file: 'Columba-livia.png' },
        { key: 'avatar_coruja', file: 'Coruja.png' },
        { key: 'avatar_pastor_alemao', file: 'Pastor-alemao.png' },
        { key: 'avatar_papagaio_verdadeiro', file: 'Papagaio-verdadeiro.png' },
        { key: 'avatar_arara_azul_grande', file: 'Arara-azul-grande.png' },
        { key: 'avatar_arara_caninde', file: 'Arara-caninde.png' },
        { key: 'avatar_capivara', file: 'Capivara.png' },
        { key: 'avatar_lobo', file: 'Lobo.png' },
        { key: 'avatar_esquilo', file: 'Esquilo.png' },
        { key: 'avatar_zebra', file: 'Zebra.png' },
        { key: 'avatar_beija_flor', file: 'Beija-flor.png' }
    ];

    let avatarBasePath = null;
    let selectedAvatarFile = null;

    async function detectAvatarBasePath() {
        if (avatarBasePath) return avatarBasePath;
        const testFile = 'Aguia.png';
        const paths = [
            '/perfil/img/',
            'perfil/img/',
            '../perfil/img/',
            './perfil/img/',
            window.location.origin + '/perfil/img/'
        ];
        for (const path of paths) {
            try {
                const response = await fetch(path + testFile, { method: 'HEAD' });
                if (response.ok) {
                    avatarBasePath = path;
                    console.log('[Onboarding] Avatar path detectado:', avatarBasePath);
                    return avatarBasePath;
                }
            } catch (e) { /* ignora */ }
        }
        avatarBasePath = '/perfil/img/';
        console.warn('[Onboarding] Fallback avatar path:', avatarBasePath);
        return avatarBasePath;
    }

    function initAvatarSelector() {
        const container = document.getElementById('avatarSelectorContainer');
        if (!container) return;
        container.innerHTML = '';

        detectAvatarBasePath().then(basePath => {
            DEFAULT_AVATARS.forEach(av => {
                const div = document.createElement('div');
                div.style.cssText = `
                    cursor: pointer;
                    border-radius: 50%;
                    overflow: hidden;
                    width: 100%;
                    aspect-ratio: 1 / 1;
                    border: 2px solid var(--border);
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    position: relative;
                    background: var(--bg-tertiary);
                `;
                div.dataset.file = av.file;
                div.title = t(av.key) || av.file.replace('.png', '');

                const img = document.createElement('img');
                img.src = basePath + av.file;
                img.alt = av.file;
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
                img.onerror = function() {
                    this.style.display = 'none';
                    this.parentElement.innerHTML = `<span style="color:var(--text-secondary);font-size:0.7rem;text-align:center;">${av.file.replace('.png','')}</span>`;
                };
                div.appendChild(img);

                if (selectedAvatarFile === av.file) {
                    div.style.borderColor = 'var(--accent-blue)';
                    div.style.transform = 'scale(1.04)';
                    div.style.boxShadow = '0 0 20px rgba(108, 140, 255, 0.25)';
                }

                div.addEventListener('click', function() {
                    container.querySelectorAll('div').forEach(el => {
                        el.style.borderColor = 'var(--border)';
                        el.style.transform = 'scale(1)';
                        el.style.boxShadow = 'none';
                    });
                    this.style.borderColor = 'var(--accent-blue)';
                    this.style.transform = 'scale(1.04)';
                    this.style.boxShadow = '0 0 20px rgba(108, 140, 255, 0.25)';
                    selectedAvatarFile = this.dataset.file;
                    formData.avatar = basePath + selectedAvatarFile;
                    const fileInput = document.getElementById('onboardingAvatarInput');
                    if (fileInput) fileInput.value = '';
                });

                container.appendChild(div);
            });
        });
    }

    function initPasswordToggle() {
        const toggleBtn = document.getElementById('onboardingTogglePassword');
        const passwordInput = document.getElementById('onboardingPassword');
        if (!toggleBtn || !passwordInput) return;

        toggleBtn.addEventListener('click', function() {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });

        passwordInput.addEventListener('input', function() {
            updatePasswordStrength(this.value);
            const errorDiv = document.getElementById('onboardingPasswordError');
            if (errorDiv) errorDiv.style.display = 'none';
        });
    }

    function updatePasswordStrength(password) {
        const indicator = document.getElementById('passwordStrengthIndicator');
        if (!indicator) return;
        if (!password) {
            indicator.innerHTML = '';
            return;
        }

        const checks = {
            minLength: password.length >= 8,
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecial: /[^A-Za-z0-9]/.test(password)
        };
        const passed = Object.values(checks).filter(Boolean).length;
        let strengthText = '', color = '', barWidth = 0;

        if (passed <= 2) { strengthText = t('onboarding_password_strength_weak'); color = '#ef4444'; barWidth = 20; }
        else if (passed === 3) { strengthText = t('onboarding_password_strength_medium'); color = '#f59e0b'; barWidth = 45; }
        else if (passed === 4) { strengthText = t('onboarding_password_strength_good'); color = '#eab308'; barWidth = 70; }
        else { strengthText = t('onboarding_password_strength_strong'); color = '#22c55e'; barWidth = 100; }

        const missing = [];
        if (!checks.minLength) missing.push('8 caracteres');
        if (!checks.hasUpper) missing.push('maiúscula');
        if (!checks.hasLower) missing.push('minúscula');
        if (!checks.hasNumber) missing.push('número');
        if (!checks.hasSpecial) missing.push('especial (!@#$...)');

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom:2px;">
                <span style="color:${color}; font-weight:600;">${strengthText}</span>
                <span style="color:var(--text-tertiary);">${passed}/5</span>
            </div>
            <div class="strength-bar" style="width:100%; height:4px; background:var(--bg-secondary); border-radius:4px; overflow:hidden;">
                <div class="strength-bar-fill" style="width:${barWidth}%; height:100%; background:${color}; border-radius:4px; transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);"></div>
            </div>
        `;
        if (missing.length) {
            html += `<div style="font-size:0.7rem; color:var(--text-tertiary); margin-top:2px;">Falta: ${missing.join(', ')}</div>`;
        }
        indicator.innerHTML = html;
        indicator.dataset.passed = passed;
    }

    function initAvatarUpload() {
        const uploadBtn = document.getElementById('onboardingUploadAvatar');
        const fileInput = document.getElementById('onboardingAvatarInput');
        if (!uploadBtn || !fileInput) return;

        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files[0]) {
                handleAvatarUpload(this.files[0]);
            }
            this.value = '';
        });
    }

    function handleAvatarUpload(file) {
        if (!file.type.startsWith('image/')) {
            showToast(t('profile_select_image'), 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast(t('profile_image_too_big'), 'error');
            return;
        }

        if (window.resizeImage && typeof window.resizeImage === 'function') {
            window.resizeImage(file, 150, 150, 0.7)
                .then(base64 => {
                    formData.avatar = base64;
                    selectedAvatarFile = null;
                    const container = document.getElementById('avatarSelectorContainer');
                    if (container) {
                        container.querySelectorAll('div').forEach(el => {
                            el.style.borderColor = 'var(--border)';
                            el.style.transform = 'scale(1)';
                            el.style.boxShadow = 'none';
                        });
                        const uploadIndicator = document.createElement('div');
                        uploadIndicator.className = 'upload-indicator';
                        uploadIndicator.style.cssText = `
                            border-radius: 50%;
                            width: 100%;
                            aspect-ratio: 1 / 1;
                            background: var(--accent-green);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 1.8rem;
                            border: 2px solid var(--accent-blue);
                            animation: onboardingPulse 2s ease-in-out infinite;
                        `;
                        uploadIndicator.innerHTML = '<i class="fas fa-check"></i>';
                        uploadIndicator.title = 'Foto personalizada';
                        const oldIndicator = container.querySelector('.upload-indicator');
                        if (oldIndicator) oldIndicator.remove();
                        container.appendChild(uploadIndicator);
                    }
                    showToast(t('profile_avatar_updated'), 'success');
                })
                .catch(err => {
                    console.error('[Onboarding] Erro ao processar imagem:', err);
                    showToast(t('profile_avatar_upload_error'), 'error');
                });
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                formData.avatar = e.target.result;
                selectedAvatarFile = null;
                const container = document.getElementById('avatarSelectorContainer');
                if (container) {
                    container.querySelectorAll('div').forEach(el => {
                        el.style.borderColor = 'var(--border)';
                        el.style.transform = 'scale(1)';
                        el.style.boxShadow = 'none';
                    });
                    const uploadIndicator = document.createElement('div');
                    uploadIndicator.className = 'upload-indicator';
                    uploadIndicator.style.cssText = `
                        border-radius: 50%;
                        width: 100%;
                        aspect-ratio: 1 / 1;
                        background: var(--accent-green);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 1.8rem;
                        border: 2px solid var(--accent-blue);
                        animation: onboardingPulse 2s ease-in-out infinite;
                    `;
                    uploadIndicator.innerHTML = '<i class="fas fa-check"></i>';
                    uploadIndicator.title = 'Foto personalizada';
                    const oldIndicator = container.querySelector('.upload-indicator');
                    if (oldIndicator) oldIndicator.remove();
                    container.appendChild(uploadIndicator);
                }
                showToast(t('profile_avatar_updated'), 'success');
            };
            reader.readAsDataURL(file);
        }
    }

    function initAvatarRemove() {
        const removeBtn = document.getElementById('onboardingRemoveAvatar');
        if (!removeBtn) return;

        removeBtn.addEventListener('click', function() {
            formData.avatar = null;
            selectedAvatarFile = null;
            const container = document.getElementById('avatarSelectorContainer');
            if (container) {
                container.querySelectorAll('div').forEach(el => {
                    el.style.borderColor = 'var(--border)';
                    el.style.transform = 'scale(1)';
                    el.style.boxShadow = 'none';
                });
                const indicator = container.querySelector('.upload-indicator');
                if (indicator) indicator.remove();
            }
            const fileInput = document.getElementById('onboardingAvatarInput');
            if (fileInput) fileInput.value = '';
            showToast(t('profile_avatar_removed'), 'info');
        });
    }

    function initAvatarLicense() {
        const licenseBtn = document.getElementById('onboardingAvatarLicense');
        if (!licenseBtn) return;

        licenseBtn.addEventListener('click', function() {
            window.open('https://pixabay.com/service/license-summary/', '_blank');
        });
    }

    function initToggleEvents() {
        const toggleBtn = document.getElementById('onboardingToggleModeBtn');
        const toggleBackBtn = document.getElementById('onboardingToggleModeBackBtn');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', function() {
                loginMode = false;
                updateModeUI();
                renderStep(currentStep);
                const nameInput = document.getElementById('onboardingName');
                if (nameInput) setTimeout(() => nameInput.focus(), 150);
            });
        }

        if (toggleBackBtn) {
            toggleBackBtn.addEventListener('click', function() {
                loginMode = true;
                updateModeUI();
                renderStep(currentStep);
                const loginPass = document.getElementById('onboardingLoginPassword');
                if (loginPass) setTimeout(() => loginPass.focus(), 150);
            });
        }
    }

    function initImportEvents() {
        const importBtn = document.getElementById('onboardingImportProgressBtn');
        const fileInput = document.getElementById('onboardingImportFileInput');

        if (importBtn) {
            importBtn.addEventListener('click', handleImportProgress);
        }

        if (fileInput) {
            fileInput.addEventListener('change', onImportFileSelected);
        }

        updateImportButtonState();
    }

    // ========== TOAST ==========
    function showToast(message, type = 'info') {
        if (window.showNotification && typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        const existing = document.getElementById('onboardingToast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'onboardingToast';
        toast.style.cssText = `
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
            background: var(--bg-card); backdrop-filter: blur(12px);
            padding: 12px 24px; border-radius: 16px;
            border: 1px solid var(--border);
            box-shadow: var(--modal-shadow);
            color: var(--text-primary);
            font-size: 0.9rem;
            z-index: 99999;
            max-width: 90%;
            text-align: center;
            transition: opacity 0.3s ease;
        `;
        if (type === 'success') toast.style.borderLeft = '4px solid #22c55e';
        else if (type === 'error') toast.style.borderLeft = '4px solid #ef4444';
        else toast.style.borderLeft = '4px solid #6C8CFF';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ========== NAVEGAÇÃO ==========
    function goToStep(index) {
        if (index < 0 || index >= TOTAL_STEPS) return;
        currentStep = index;
        renderStep(currentStep);
    }

    function nextStep() {
        if (currentStep === 0) {
            if (!selectedLang) {
                const errorDiv = document.getElementById('onboardingLangError');
                if (errorDiv) errorDiv.style.display = 'block';
                return;
            }
        }

        if (currentStep === 3 && !loginMode) {
            const nameInput = document.getElementById('onboardingName');
            const genderSelect = document.getElementById('onboardingGender');
            const passwordInput = document.getElementById('onboardingPassword');
            const confirmInput = document.getElementById('onboardingConfirmPassword');

            const nameError = document.getElementById('onboardingNameError');
            const genderError = document.getElementById('onboardingGenderError');
            const passwordError = document.getElementById('onboardingPasswordError');
            const confirmError = document.getElementById('onboardingConfirmError');

            nameError.style.display = 'none';
            genderError.style.display = 'none';
            passwordError.style.display = 'none';
            confirmError.style.display = 'none';

            const name = nameInput.value.trim();
            if (!name) {
                nameError.style.display = 'block';
                nameInput.focus();
                return;
            }

            const gender = genderSelect.value;
            if (!gender) {
                genderError.style.display = 'block';
                genderSelect.focus();
                return;
            }

            const password = passwordInput.value;
            if (!password || password.length < 8) {
                passwordError.textContent = t('onboarding_error_password_min');
                passwordError.style.display = 'block';
                passwordInput.focus();
                return;
            }
            const indicator = document.getElementById('passwordStrengthIndicator');
            const passed = parseInt(indicator.dataset.passed || '0', 10);
            if (passed < 3) {
                const checks = {
                    minLength: password.length >= 8,
                    hasUpper: /[A-Z]/.test(password),
                    hasLower: /[a-z]/.test(password),
                    hasNumber: /[0-9]/.test(password),
                    hasSpecial: /[^A-Za-z0-9]/.test(password)
                };
                const missing = [];
                if (!checks.minLength) missing.push('8 caracteres');
                if (!checks.hasUpper) missing.push('maiúscula');
                if (!checks.hasLower) missing.push('minúscula');
                if (!checks.hasNumber) missing.push('número');
                if (!checks.hasSpecial) missing.push('especial (!@#$...)');
                passwordError.textContent = t('onboarding_error_password_weak') + missing.join(', ');
                passwordError.style.display = 'block';
                passwordInput.focus();
                return;
            }

            const confirm = confirmInput.value;
            if (password !== confirm) {
                confirmError.style.display = 'block';
                confirmInput.focus();
                return;
            }

            formData.name = name;
            formData.gender = gender;
            formData.password = password;
        }

        if (currentStep < TOTAL_STEPS - 1) {
            goToStep(currentStep + 1);
        }
    }

    function prevStep() {
        if (currentStep === 3 && !loginMode) {
            loginMode = true;
            updateModeUI();
            renderStep(currentStep);
            const loginPass = document.getElementById('onboardingLoginPassword');
            if (loginPass) setTimeout(() => loginPass.focus(), 150);
            return;
        }
        if (currentStep > 0) {
            goToStep(currentStep - 1);
        }
    }

    // ========== FINALIZAR ONBOARDING (cadastro) ==========
    async function finishOnboarding() {
        try {
            if (formData.name) {
                if (window.saveProfileName) window.saveProfileName(formData.name);
                else localStorage.setItem('userProfileName', formData.name);
                if (window.saveProfileGender) window.saveProfileGender(formData.gender);
                else localStorage.setItem('userGender', formData.gender);
            }

            if (formData.password) {
                if (window.saveProfilePassword && typeof window.saveProfilePassword === 'function') {
                    await window.saveProfilePassword(formData.password);
                } else {
                    console.warn('[Onboarding] saveProfilePassword não disponível, armazenando em texto claro (inseguro)');
                    localStorage.setItem('userPassword', formData.password);
                }
            }

            if (formData.avatar) {
                if (window.saveUserAvatar) {
                    if (formData.avatar.startsWith('http')) {
                        try {
                            const response = await fetch(formData.avatar);
                            const blob = await response.blob();
                            const reader = new FileReader();
                            reader.onload = function(e) { window.saveUserAvatar(e.target.result); };
                            reader.readAsDataURL(blob);
                        } catch (e) {
                            console.error('[Onboarding] Erro ao baixar avatar:', e);
                        }
                    } else {
                        window.saveUserAvatar(formData.avatar);
                    }
                } else {
                    localStorage.setItem('userAvatar', formData.avatar);
                }
            } else {
                if (window.setDefaultAvatar) window.setDefaultAvatar();
            }

            localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
            closeOnboarding();

            if (window.updateProfileButton) window.updateProfileButton();
            window.dispatchEvent(new CustomEvent('onboardingComplete'));

            console.log('[Onboarding] Cadastro concluído com sucesso.');
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } catch (error) {
            console.error('[Onboarding] Erro ao finalizar:', error);
            showToast('Erro ao salvar perfil. Tente novamente.', 'error');
        }
    }

    // ========== FECHAR ONBOARDING ==========
    function closeOnboarding() {
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('inert', '');        // ← CORREÇÃO: bloqueia interações quando fechado
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        if (passwordObserver) {
            passwordObserver.disconnect();
            passwordObserver = null;
            console.log('[Onboarding] MutationObserver desconectado.');
        }
    }

    // ========== ABRIR ONBOARDING ==========
    async function openOnboarding() {
        if (localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true') {
            const hasName = localStorage.getItem('userProfileName');
            if (hasName) {
                console.log('[Onboarding] Já concluído.');
                return;
            }
        }

        const savedLang = localStorage.getItem('selectedLanguage') || (navigator.language?.startsWith('pt') ? 'pt-br' : 'en');
        selectedLang = savedLang;
        await loadTranslations(savedLang);
        applyTranslations();

        buildSteps();

        const ptBtn = document.getElementById('onboardingLangPt');
        const enBtn = document.getElementById('onboardingLangEn');
        if (ptBtn && enBtn && selectedLang) {
            ptBtn.style.borderColor = selectedLang === 'pt-br' ? 'var(--accent-blue)' : 'var(--border)';
            ptBtn.style.background = selectedLang === 'pt-br' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)';
            enBtn.style.borderColor = selectedLang === 'en' ? 'var(--accent-blue)' : 'var(--border)';
            enBtn.style.background = selectedLang === 'en' ? 'var(--bg-secondary)' : 'var(--bg-tertiary)';
        }

        requestAnimationFrame(() => {
            const nameInput = document.getElementById('onboardingName');
            const genderSelect = document.getElementById('onboardingGender');
            if (nameInput) nameInput.value = formData.name;
            if (genderSelect) genderSelect.value = formData.gender;
            updateModeUI();
        });

        currentStep = 0;
        renderStep(0);

        if (!modal) return;
        modal.style.display = 'flex';
        modal.style.pointerEvents = 'auto';   // ← CORREÇÃO: garante que receba cliques
        modal.style.zIndex = '9999';           // ← CORREÇÃO: prioridade máxima
        modal.offsetHeight;
        modal.classList.add('show');
        modal.removeAttribute('inert');        // ← CORREÇÃO: permite interação
        modal.removeAttribute('aria-hidden');
        document.body.style.overflow = 'hidden';

        console.log('[Onboarding] Modal aberto.');
    }

    // ========== EVENTOS GLOBAIS ==========
    function initEvents() {
        if (!prevBtn || !nextBtn || !finishBtn) return;

        const newPrev = prevBtn.cloneNode(true);
        const newNext = nextBtn.cloneNode(true);
        const newFinish = finishBtn.cloneNode(true);
        prevBtn.parentNode.replaceChild(newPrev, prevBtn);
        nextBtn.parentNode.replaceChild(newNext, nextBtn);
        finishBtn.parentNode.replaceChild(newFinish, finishBtn);
        prevBtn = newPrev;
        nextBtn = newNext;
        finishBtn = newFinish;

        prevBtn.addEventListener('click', prevStep);
        nextBtn.addEventListener('click', nextStep);
        finishBtn.addEventListener('click', finishOnboarding);

        document.addEventListener('keydown', function escHandler(e) {
            if (!modal || !modal.classList.contains('show')) return;
            if (e.key === 'Enter') {
                if (currentStep === 0) {
                    if (selectedLang) nextStep();
                } else if (currentStep === 3 && loginMode) {
                    const importBtn = document.getElementById('onboardingImportProgressBtn');
                    if (importBtn && !importBtn.disabled) {
                        importBtn.click();
                    }
                } else if (finishBtn.style.display !== 'none') {
                    finishOnboarding();
                } else {
                    nextStep();
                }
            }
        });

        window.addEventListener('languageChanged', () => {
            if (modal && modal.classList.contains('show')) {
                const nameInput = document.getElementById('onboardingName');
                const genderSelect = document.getElementById('onboardingGender');
                const passwordInput = document.getElementById('onboardingPassword');
                if (nameInput) formData.name = nameInput.value;
                if (genderSelect) formData.gender = genderSelect.value;
                if (passwordInput) formData.password = passwordInput.value;
                buildSteps();
                requestAnimationFrame(() => {
                    const newName = document.getElementById('onboardingName');
                    const newGender = document.getElementById('onboardingGender');
                    const newPassword = document.getElementById('onboardingPassword');
                    if (newName) newName.value = formData.name;
                    if (newGender) newGender.value = formData.gender;
                    if (newPassword) newPassword.value = formData.password;
                    renderStep(currentStep);
                });
            }
        });
    }

    // ========== FUNÇÃO PÚBLICA ==========
    window.startOnboarding = function() {
        if (!initElements()) {
            console.warn('[Onboarding] Elementos não encontrados, tentando novamente...');
            setTimeout(window.startOnboarding, 500);
            return;
        }
        openOnboarding();
        initEvents();
        console.log('[Onboarding] Pronto.');
    };

    window.onboardingReady = true;
    console.log('[Onboarding] Módulo carregado. Use window.startOnboarding() para iniciar.');
})();