// perfil/profile.js – Versão 30.3 – COMPLETO E OTIMIZADO
// =========================================================
// CORREÇÃO: Não sobrescreve window.t (usa i18n central)
// CORREÇÃO: Verificações de nulidade em TODOS os elementos DOM
// CORREÇÃO: Prioriza caminho relativo `../perfil/img/` para avatares
// CORREÇÃO: Validação robusta de estrutura de dados na importação
// CORREÇÃO: Integração total com i18n central (usa window.t)
// CORREÇÃO: Logs detalhados para depuração
// CORREÇÃO: Suporte a todos os cursos
// CORREÇÃO: Fallback para estruturas antigas de arquivos
// CORREÇÃO: Tratamento de exceções individuais
// CORREÇÃO: Sincronização com módulo de Onboarding
// CORREÇÃO: Exportação criptografada com checksum
// CORREÇÃO: Importação com verificação de integridade
// CORREÇÃO: Fechamento do modal com clique no overlay e tecla ESC
// CORREÇÃO: Scroll do modal funcionando (overflow-y: auto no body)

(function() {
    'use strict';

    console.log('[Profile] Inicializando módulo v30.3...');

    // ========== CONSTANTES ==========
    const STORAGE_KEYS = {
        NAME: 'userProfileName',
        AVATAR: 'userAvatar',
        GENDER: 'userGender',
        PASSWORD: 'userPasswordHash',
        MATRICULA: 'userMatricula'
    };

    const AUDITORIO_TIME_KEY = 'auditorio_total_time';
    const PASSWORD_MIN_LENGTH = 8;
    const PASSWORD_REQUIREMENTS = {
        minLength: PASSWORD_MIN_LENGTH,
        hasUpper: /[A-Z]/,
        hasLower: /[a-z]/,
        hasNumber: /[0-9]/,
        hasSpecial: /[^A-Za-z0-9]/
    };

    // ========== LISTA DE AVATARES PADRÃO ==========
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

    // ========== MAPA DE NOMES DE CURSOS TRADUZIDOS ==========
    const COURSE_NAMES = {
        'administracao': { pt: 'Administração', en: 'Administration' },
        'biologia': { pt: 'Biologia', en: 'Biology' },
        'ciencia_de_dados': { pt: 'Ciência de Dados', en: 'Data Science' },
        'ciencia-de-dados-bacharelado': { pt: 'Ciência de Dados (Bacharelado)', en: 'Data Science (Bachelor)' },
        'computacao': { pt: 'Ciência da Computação', en: 'Computer Science' },
        'computacao_grafica': { pt: 'Computação Gráfica', en: 'Computer Graphics' },
        'computer-science': { pt: 'Computer Science', en: 'Computer Science' },
        'cybersecurity': { pt: 'CyberSecurity', en: 'CyberSecurity' },
        'desenvolvimento_web': { pt: 'Desenvolvimento Web', en: 'Web Development' },
        'devops': { pt: 'DevOps', en: 'DevOps' },
        'embarcados': { pt: 'Embarcados', en: 'Embedded Systems' },
        'enem': { pt: 'ENEM', en: 'ENEM' },
        'engenharia_computacao': { pt: 'Engenharia de Computação', en: 'Computer Engineering' },
        'engenharia-producao': { pt: 'Engenharia de Produção', en: 'Production Engineering' },
        'espanhol': { pt: 'Espanhol', en: 'Spanish' },
        'espanhol-ingles': { pt: 'Espanhol (para falantes de inglês)', en: 'Spanish (for English Speakers)' },
        'espcex': { pt: 'EsPCEx', en: 'EsPCEx' },
        'fisica': { pt: 'Física', en: 'Physics' },
        'gestao-publica': { pt: 'Gestão Pública', en: 'Public Management' },
        'ingles': { pt: 'Inglês', en: 'English' },
        'japones': { pt: 'Japonês', en: 'Japanese' },
        'japones-ingles': { pt: 'Japonês (para falantes de inglês)', en: 'Japanese (for English Speakers)' },
        'letras': { pt: 'Letras', en: 'Letters' },
        'letras-portugues': { pt: 'Letras – Habilitação em Língua Portuguesa', en: 'Portuguese Language and Literature' },
        'matematica': { pt: 'Matemática', en: 'Mathematics' },
        'matematica-licenciatura': { pt: 'Matemática (Licenciatura)', en: 'Mathematics (Teaching Degree)' },
        'math': { pt: 'Math', en: 'Math' },
        'pedagogia': { pt: 'Pedagogia', en: 'Pedagogy' },
        'portugues-brasileiro': { pt: 'Português Brasileiro', en: 'Brazilian Portuguese' },
        'processos-gerenciais': { pt: 'Processos Gerenciais', en: 'Management Processes' },
        'quimica': { pt: 'Química', en: 'Chemistry' },
        'tecnologia-informacao': { pt: 'Tecnologia da Informação', en: 'Information Technology' }
    };

    // ========== TRADUÇÃO (usa window.t com fallback) ==========
    function t(key, replacements = {}) {
        if (window.t && typeof window.t === 'function') {
            try {
                return window.t(key, replacements);
            } catch (e) { /* fallback */ }
        }
        let text = key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    function getCourseName(courseId) {
        const nameObj = COURSE_NAMES[courseId];
        if (!nameObj) return courseId;
        const lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'pt-br';
        return nameObj[lang] || nameObj.pt || courseId;
    }

    // ========================================================================
    // FUNÇÕES AUXILIARES
    // ========================================================================
    function generateMatricula() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        const second = String(now.getSeconds()).padStart(2, '0');
        const millisecond = String(now.getMilliseconds()).padStart(3, '0');
        return year + month + day + hour + minute + second + millisecond;
    }

    function getMatricula() {
        let matricula = localStorage.getItem(STORAGE_KEYS.MATRICULA);
        if (!matricula) {
            matricula = generateMatricula();
            localStorage.setItem(STORAGE_KEYS.MATRICULA, matricula);
        }
        return matricula;
    }

    function getAuditorioHours() {
        const timeInSeconds = parseInt(localStorage.getItem(AUDITORIO_TIME_KEY) || '0', 10);
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        return {
            seconds: timeInSeconds,
            hours: hours,
            minutes: minutes,
            formatted: hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min'
        };
    }

    function updateAuditorioTimeDisplay() {
        const auditTime = getAuditorioHours();
        const el = document.getElementById('profileAuditorioTime');
        if (el) el.textContent = auditTime.formatted;
    }

    // ========== SISTEMA DE NOTIFICAÇÕES ==========
    function showToast(message, type = 'info') {
        if (window.queueNotification && typeof window.queueNotification === 'function') {
            window.queueNotification(message, type);
            return;
        }
        const existing = document.getElementById('customToast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'customToast';
        toast.style.cssText =
            'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);' +
            'background: var(--bg-card); backdrop-filter: blur(12px);' +
            'padding: 16px 32px; border-radius: 16px;' +
            'border: 1px solid var(--border);' +
            'box-shadow: var(--modal-shadow);' +
            'color: var(--text-primary);' +
            'font-size: 1rem; font-weight: 500; z-index: 9999;' +
            'transition: opacity 0.3s ease, transform 0.3s ease;' +
            'max-width: 90%; text-align: center;';
        toast.textContent = message;
        if (type === 'success') toast.style.borderLeft = '4px solid #22c55e';
        else if (type === 'error') toast.style.borderLeft = '4px solid #ef4444';
        else toast.style.borderLeft = '4px solid #6C8CFF';
        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========== LIMPEZA DE OBJETOS ==========
    function cleanObject(obj, maxDepth = 15) {
        const seen = new WeakSet();
        let depth = 0;

        function clean(value) {
            if (typeof value !== 'object' || value === null) return value;
            if (seen.has(value)) return '[Circular]';
            if (depth > maxDepth) return '[MaxDepth]';
            seen.add(value);
            depth++;
            if (Array.isArray(value)) {
                const arr = value.map(clean);
                depth--;
                return arr;
            }
            const result = {};
            for (const key in value) {
                if (value.hasOwnProperty(key)) {
                    try { result[key] = clean(value[key]); } catch (_) { result[key] = '[Error]'; }
                }
            }
            depth--;
            return result;
        }
        try { return clean(obj); } catch (_) { return { error: 'Não foi possível limpar os dados' }; }
    }

    function safeStringify(obj, maxDepth = 15) {
        const cleaned = cleanObject(obj, maxDepth);
        try { return JSON.stringify(cleaned); } catch (_) { return '{"error":"Serialization failed"}'; }
    }

    // ========== CRIPTOGRAFIA ==========
    async function deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode(salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
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
            const jsonString = safeStringify(data, 15);
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
            console.error('Erro na criptografia:', error);
            throw new Error('Falha ao criptografar dados: ' + error.message);
        }
    }

    async function decryptData(encryptedBase64, password) {
        try {
            const encrypted = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
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
            console.error('Erro na descriptografia:', error);
            throw new Error('Falha ao descriptografar dados: ' + error.message);
        }
    }

    async function verifyPassword(inputPassword, storedHash) {
        if (!storedHash) return false;
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(inputPassword);
            const hash = await crypto.subtle.digest('SHA-256', data);
            const hashBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
            return hashBase64 === storedHash;
        } catch (e) {
            console.error('[Profile] Erro ao verificar senha:', e);
            return false;
        }
    }

    async function hashPassword(password) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
        } catch (e) {
            console.error('[Profile] Erro ao gerar hash:', e);
            return null;
        }
    }

    // ========== VALIDAÇÃO DE SENHA ==========
    function checkPasswordStrength(password) {
        const checks = {
            minLength: password.length >= PASSWORD_MIN_LENGTH,
            hasUpper: PASSWORD_REQUIREMENTS.hasUpper.test(password),
            hasLower: PASSWORD_REQUIREMENTS.hasLower.test(password),
            hasNumber: PASSWORD_REQUIREMENTS.hasNumber.test(password),
            hasSpecial: PASSWORD_REQUIREMENTS.hasSpecial.test(password)
        };
        let passed = 0;
        for (const key in checks) {
            if (checks.hasOwnProperty(key) && checks[key]) passed++;
        }
        let strength = 'Fraca';
        let color = '#ef4444';
        if (passed === 5) { strength = 'Forte'; color = '#22c55e'; }
        else if (passed >= 4) { strength = 'Boa'; color = '#eab308'; }
        else if (passed >= 3) { strength = 'Média'; color = '#f59e0b'; }
        else if (passed >= 2) { strength = 'Fraca'; color = '#ef4444'; }
        else { strength = 'Muito fraca'; color = '#dc2626'; }
        return { checks, passed, strength, color, total: 5 };
    }

    function getPasswordFeedback(checks) {
        const messages = [];
        if (!checks.minLength) messages.push('Mínimo de ' + PASSWORD_MIN_LENGTH + ' caracteres');
        if (!checks.hasUpper) messages.push('Pelo menos uma letra maiúscula');
        if (!checks.hasLower) messages.push('Pelo menos uma letra minúscula');
        if (!checks.hasNumber) messages.push('Pelo menos um número');
        if (!checks.hasSpecial) messages.push('Pelo menos um caractere especial (!@#$% etc.)');
        return messages;
    }

    // ========== FUNÇÕES DE PERFIL ==========
    function loadProfileName() { return localStorage.getItem(STORAGE_KEYS.NAME) || ''; }

    function saveProfileName(name) {
        localStorage.setItem(STORAGE_KEYS.NAME, name.trim());
        updateProfileModal();
        updateProfileButton();
        showToast(t('profile_name_saved'), 'success');
    }

    function getProfileGender() { return localStorage.getItem(STORAGE_KEYS.GENDER) || ''; }

    function saveProfileGender(gender) {
        localStorage.setItem(STORAGE_KEYS.GENDER, gender);
        updateProfileModal();
        showToast(t('profile_gender_saved'), 'success');
    }

    async function saveProfilePassword(password) {
        if (!password || password.length < PASSWORD_MIN_LENGTH) {
            showToast(t('profile_password_min'), 'error');
            return false;
        }
        const strength = checkPasswordStrength(password);
        if (strength.passed < 3) {
            const feedback = getPasswordFeedback(strength.checks);
            showToast(t('profile_password_weak') + feedback.join(', '), 'error');
            return false;
        }
        const hash = await hashPassword(password);
        if (!hash) {
            showToast('Erro ao salvar senha. Tente novamente.', 'error');
            return false;
        }
        localStorage.setItem(STORAGE_KEYS.PASSWORD, hash);
        updateProfileModal();
        showPasswordSavedIndicator(true);
        showToast(t('profile_password_saved'), 'success');
        return true;
    }

    function hasStoredPassword() { return !!localStorage.getItem(STORAGE_KEYS.PASSWORD); }

    // ========== REDIMENSIONAR IMAGEM ==========
    function resizeImage(file, maxWidth = 150, maxHeight = 150, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ========== FUNÇÕES DE AVATAR ==========
    function getUserAvatar() { return localStorage.getItem(STORAGE_KEYS.AVATAR) || null; }

    function saveUserAvatar(base64) {
        const sizeInBytes = base64.length * 0.75;
        if (sizeInBytes > 500 * 1024) {
            showToast(t('profile_avatar_too_big'), 'error');
            return false;
        }
        try {
            localStorage.setItem(STORAGE_KEYS.AVATAR, base64);
            updateProfileButton();
            loadAvatarToModal();
            showToast(t('profile_avatar_updated'), 'success');
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.code === 22) {
                showToast(t('profile_avatar_storage_error'), 'error');
            } else {
                showToast(t('profile_avatar_save_error'), 'error');
            }
            return false;
        }
    }

    function loadAvatarToModal() {
        const img = document.getElementById('profileAvatar');
        if (!img) {
            console.warn('[Profile] #profileAvatar não encontrado');
            return;
        }
        const avatar = getUserAvatar();
        if (avatar) {
            img.src = avatar;
            console.log('[Profile] Avatar carregado do localStorage');
        } else {
            const name = loadProfileName() || 'Usuario';
            img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=6C8CFF&color=fff&size=80';
            console.log('[Profile] Avatar gerado via API');
        }
    }

    // ========== DETECÇÃO AUTOMÁTICA DO CAMINHO DAS IMAGENS ==========
    let imageBasePath = null;

    async function detectImageBasePath() {
        if (imageBasePath) return imageBasePath;

        // Prioriza o caminho relativo `../perfil/img/` (subindo um nível)
        const paths = [
            '../perfil/img/',
            './perfil/img/',
            '/perfil/img/',
            'perfil/img/',
            window.location.origin + '/perfil/img/',
            window.location.origin + '/universidade/perfil/img/'
        ];

        for (const path of paths) {
            const testUrl = path + 'Aguia.png';
            try {
                const response = await fetch(testUrl, { method: 'HEAD' });
                if (response.ok) {
                    imageBasePath = path;
                    console.log('[Profile] Caminho das imagens detectado: ' + imageBasePath);
                    return imageBasePath;
                }
            } catch (_) { /* ignora */ }
        }

        imageBasePath = '../perfil/img/';
        console.warn('[Profile] Nenhum caminho válido encontrado, usando fallback: ' + imageBasePath);
        return imageBasePath;
    }

    async function setDefaultAvatar() {
        if (getUserAvatar()) return;
        try {
            const basePath = await detectImageBasePath();
            const firstAvatar = DEFAULT_AVATARS[0];
            const imgSrc = basePath + firstAvatar.file;
            const response = await fetch(imgSrc);
            if (!response.ok) throw new Error('Falha ao carregar imagem padrão');
            const blob = await response.blob();
            const fileObj = new File([blob], firstAvatar.file, { type: blob.type });
            const resizedBase64 = await resizeImage(fileObj, 150, 150, 0.7);
            saveUserAvatar(resizedBase64);
        } catch (error) {
            console.warn('[Profile] Erro ao definir avatar padrão:', error);
        }
    }

    // ========== SELETOR DE AVATAR ==========
    async function showAvatarSelector() {
        console.log('[Profile] showAvatarSelector chamado');
        const existing = document.getElementById('avatarSelectorModal');
        if (existing) {
            existing.remove();
            console.log('[Profile] Modal de avatar já existia, removido');
        }

        const basePath = await detectImageBasePath();

        const overlay = document.createElement('div');
        overlay.id = 'avatarSelectorModal';
        overlay.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);' +
            'z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;';

        const modal = document.createElement('div');
        modal.style.cssText =
            'background:var(--bg-secondary);border-radius:24px;padding:1.5rem;' +
            'max-width:780px;width:100%;max-height:90vh;overflow-y:auto;' +
            'border:1px solid var(--border);box-shadow:0 20px 40px rgba(0,0,0,0.7);' +
            'animation:scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1);';

        let avatarOptionsHtml = '';
        for (const av of DEFAULT_AVATARS) {
            const imgSrc = basePath + av.file;
            const avatarName = t(av.key);
            avatarOptionsHtml += `
                <div class="avatar-option" data-file="${av.file}" style="
                    cursor:pointer;border-radius:12px;overflow:hidden;
                    border:2px solid var(--border);aspect-ratio:1/1;
                    background:var(--bg-tertiary);display:flex;align-items:center;
                    justify-content:center;position:relative;
                    transition:border-color 0.3s, transform 0.2s;
                ">
                    <img src="${imgSrc}" alt="${avatarName}" style="
                        width:100%;height:100%;object-fit:cover;display:block;
                    " onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\\'color:var(--text-secondary);font-size:1.1rem;font-weight:600;text-align:center;padding:0.5rem;\\'>${avatarName}</span>'">
                    <div style="
                        position:absolute;bottom:0;left:0;right:0;
                        background:linear-gradient(transparent,rgba(0,0,0,0.8));
                        padding:0.4rem 0.3rem;text-align:center;font-size:0.75rem;
                        color:white;opacity:0;transition:opacity 0.3s;
                        pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
                        font-weight:500;letter-spacing:0.3px;
                    ">${avatarName}</div>
                </div>
            `;
        }

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;">
                <h3 style="color:var(--text-primary);font-size:1.3rem;display:flex;align-items:center;gap:0.5rem;">
                    <i class="fas fa-camera" style="color:var(--accent-teal);"></i> ${t('profile_choose_avatar')}
                </h3>
                <button id="closeAvatarSelector" style="background:none;border:none;color:var(--text-secondary);font-size:1.5rem;cursor:pointer;">&times;</button>
            </div>
            <p style="color:var(--text-secondary);margin-bottom:1rem;">${t('profile_avatar_description')}</p>
            <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:0.5rem;margin-bottom:1.2rem;">
                ${avatarOptionsHtml}
            </div>
            <div style="display:flex;gap:0.8rem;flex-wrap:wrap;justify-content:center;align-items:center;">
                <button id="uploadAvatarBtn" style="padding:0.6rem 1.5rem;background:var(--gradient-primary);border:none;border-radius:2rem;color:white;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;">
                    <i class="fas fa-upload"></i> ${t('profile_upload')}
                </button>
                <button id="removeAvatarBtn" style="padding:0.6rem 1.5rem;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:2rem;color:var(--text-secondary);font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:0.5rem;">
                    <i class="fas fa-trash-alt"></i> ${t('profile_remove_photo')}
                </button>
                <button id="licenseAvatarBtn" style="padding:0.4rem 1rem;background:transparent;border:1px solid var(--border);border-radius:2rem;color:var(--text-tertiary);font-size:0.7rem;cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem;text-decoration:none;">
                    <i class="fas fa-balance-scale"></i> ${t('profile_license')}
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        console.log('[Profile] Modal de avatar adicionado ao DOM');

        const closeBtn = document.getElementById('closeAvatarSelector');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => overlay.remove());
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        const licenseBtn = document.getElementById('licenseAvatarBtn');
        if (licenseBtn) {
            licenseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open('https://pixabay.com/service/license-summary/', '_blank');
            });
        }

        const options = document.querySelectorAll('.avatar-option');
        console.log('[Profile] Encontradas ' + options.length + ' opções de avatar');
        for (const opt of options) {
            const label = opt.querySelector('div:last-child');
            opt.addEventListener('mouseenter', () => {
                if (label) label.style.opacity = '1';
                opt.style.borderColor = 'var(--accent-blue)';
                opt.style.transform = 'scale(1.04)';
            });
            opt.addEventListener('mouseleave', () => {
                if (label) label.style.opacity = '0';
                opt.style.borderColor = 'var(--border)';
                opt.style.transform = 'scale(1)';
            });
            opt.addEventListener('click', () => {
                const file = opt.dataset.file;
                console.log('[Profile] Avatar selecionado: ' + file);
                const imgSrc = basePath + file;
                fetch(imgSrc)
                    .then(res => res.blob())
                    .then(blob => {
                        const fileObj = new File([blob], file, { type: blob.type });
                        return resizeImage(fileObj, 150, 150, 0.7);
                    })
                    .then(resizedBase64 => {
                        saveUserAvatar(resizedBase64);
                        overlay.remove();
                        console.log('[Profile] Avatar salvo com sucesso');
                    })
                    .catch(err => {
                        console.error('Erro ao carregar imagem padrão:', err);
                        showToast(t('profile_avatar_upload_error'), 'error');
                    });
            });
        }

        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => fileInput.click());
        }

        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                console.log('[Profile] Arquivo selecionado: ' + file.name);
                handleAvatarUpload(file, () => overlay.remove());
            }
            fileInput.value = '';
        });

        const removeBtn = document.getElementById('removeAvatarBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                if (confirm(t('profile_remove_confirm'))) {
                    localStorage.removeItem(STORAGE_KEYS.AVATAR);
                    updateProfileButton();
                    loadAvatarToModal();
                    showToast(t('profile_avatar_removed'), 'info');
                    overlay.remove();
                    console.log('[Profile] Avatar removido');
                }
            });
        }

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
                console.log('[Profile] Modal de avatar fechado com ESC');
            }
        };
        document.addEventListener('keydown', escHandler);

        const observer = new MutationObserver(() => {
            if (!document.getElementById('avatarSelectorModal')) {
                document.removeEventListener('keydown', escHandler);
                if (fileInput.parentNode) fileInput.remove();
                observer.disconnect();
                console.log('[Profile] Observer desconectado');
            }
        });
        observer.observe(document.body, { childList: true });
    }

    function handleAvatarUpload(file, callback) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast(t('profile_select_image'), 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast(t('profile_image_too_big'), 'error');
            return;
        }
        showToast(t('profile_processing'), 'info');
        resizeImage(file, 150, 150, 0.7)
            .then(resizedBase64 => {
                saveUserAvatar(resizedBase64);
                if (typeof callback === 'function') callback();
            })
            .catch(err => {
                console.error('Erro ao redimensionar imagem:', err);
                showToast(t('profile_avatar_upload_error'), 'error');
            });
    }

    // ========== ATUALIZAR BOTÃO DE PERFIL ==========
    function updateProfileButton() {
        const btn = document.getElementById('profileBtn');
        if (!btn) {
            console.warn('[Profile] Botão #profileBtn não encontrado');
            return;
        }
        const avatar = getUserAvatar();
        const name = loadProfileName() || 'Usuário';
        const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

        btn.setAttribute('data-profile-custom', 'true');
        btn.innerHTML = '';

        if (avatar) {
            const img = document.createElement('img');
            img.src = avatar;
            img.alt = 'Perfil';
            img.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:8px;';
            btn.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = initials;
            span.className = 'profile-initials';
            span.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;font-size:0.85rem;font-weight:600;margin-right:8px;';
            btn.appendChild(span);
        }

        const textNode = document.createTextNode(' ' + t('profile'));
        btn.appendChild(textNode);
        btn.style.cssText =
            'display: inline-flex; align-items: center; gap: 0.4rem;' +
            'padding: 6px 16px 6px 10px; background: var(--accent-purple);' +
            'color: #fff !important; border-radius: 8px; font-weight: 600;' +
            'font-size: 0.85rem; cursor: pointer; border: none;' +
            'transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);' +
            'text-decoration: none; white-space: nowrap; box-shadow: none; min-height: 44px;';

        console.log('[Profile] Botão de perfil atualizado');
    }

    // ========== INDICADOR DE SENHA ==========
    function showPasswordSavedIndicator(saved) {
        const container = document.getElementById('profilePassword');
        if (!container) return;
        const parent = container.closest('.profile-user-section');
        if (!parent) return;
        let indicator = parent.querySelector('.password-saved-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'password-saved-indicator';
            indicator.style.cssText = 'margin-top:0.3rem;font-size:0.8rem;display:flex;align-items:center;gap:0.4rem;';
            parent.appendChild(indicator);
        }
        if (saved) {
            indicator.innerHTML = '<i class="fas fa-check-circle" style="color:#22c55e;"></i> <span style="color:var(--text-secondary);">' + t('profile_password_saved_indicator') + '</span>';
            indicator.style.display = 'flex';
        } else {
            indicator.innerHTML = '<i class="fas fa-exclamation-circle" style="color:#f59e0b;"></i> <span style="color:var(--text-secondary);">' + t('profile_no_password_saved') + '</span>';
            indicator.style.display = 'flex';
        }
    }

    // ========== ESTATÍSTICAS DOS CURSOS ==========
    function calculateCourseStats(watchedMap) {
        const totalVideos = watchedMap.length;
        const watchedVideos = watchedMap.filter(v => v === true).length;
        const completedLessons = Math.floor(watchedVideos / 5);
        const completedDisciplines = Math.floor(watchedVideos / 25);
        const points = (watchedVideos * 10) + (completedLessons * 50) + (completedDisciplines * 200);
        return {
            totalVideos,
            watchedVideos,
            completedLessons,
            completedDisciplines,
            points,
            progressPercent: totalVideos ? Math.round((watchedVideos / totalVideos) * 100) : 0
        };
    }

    function getAllCoursesProgress() {
        const courses = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ulivre_course_')) {
                const courseId = key.replace('ulivre_course_', '');
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.watchedMap) {
                        const stats = calculateCourseStats(data.watchedMap);
                        const name = getCourseName(courseId);
                        courses.push({ id: courseId, name, stats, data });
                    }
                } catch (_) {}
            }
        }
        return courses;
    }

    // ========== EXPORTAÇÃO/IMPORTAÇÃO ==========
    function getVideosProgress() {
        const progress = localStorage.getItem('yt_video_progress');
        try { return progress ? JSON.parse(progress) : {}; } catch (_) { return {}; }
    }

    function getBooksRead() {
        const books = localStorage.getItem('ulivre_livros_lidos');
        try { return books ? JSON.parse(books) : []; } catch (_) { return []; }
    }

    function getNotes() {
        const notes = localStorage.getItem('ulivre_notas_estudo');
        try { return notes ? JSON.parse(notes) : []; } catch (_) { return []; }
    }

    function getTags() {
        const tags = localStorage.getItem('ulivre_notas_tags');
        try { return tags ? JSON.parse(tags) : []; } catch (_) { return []; }
    }

    function generateExportData(includeCourses, includeVideos, includeBooks, includeNotes, selectedNoteIds) {
        const exportData = {
            user: loadProfileName() || 'Anônimo',
            gender: getProfileGender() || '',
            timestamp: new Date().toISOString(),
            avatar: getUserAvatar() || null,
            matricula: getMatricula(),
            auditorioTime: localStorage.getItem(AUDITORIO_TIME_KEY) || '0',
            version: '2.1',
            data: {}
        };

        const passwordHash = localStorage.getItem(STORAGE_KEYS.PASSWORD) || null;
        exportData.password = passwordHash;

        try {
            const tempJson = JSON.stringify(exportData);
            let hash = 0;
            for (let idx = 0; idx < tempJson.length; idx++) {
                hash = ((hash << 5) - hash) + tempJson.charCodeAt(idx);
                hash |= 0;
            }
            exportData.checksum = hash.toString(16);
        } catch (_) { /* ignora */ }

        if (includeCourses) {
            const courses = getAllCoursesProgress();
            exportData.data.courses = courses.map(c => ({
                id: c.id,
                name: c.name,
                stats: c.stats,
                progressPercent: c.stats.progressPercent,
                rawData: cleanObject(c.data, 15)
            }));
            exportData.data.totalStats = courses.reduce((acc, c) => {
                acc.watchedVideos += c.stats.watchedVideos;
                acc.totalVideos += c.stats.totalVideos;
                acc.points += c.stats.points;
                return acc;
            }, { watchedVideos: 0, totalVideos: 0, points: 0 });
        }
        if (includeVideos) exportData.data.videos = getVideosProgress();
        if (includeBooks) exportData.data.booksRead = getBooksRead();
        if (includeNotes) {
            const allNotes = getNotes();
            exportData.data.notes = (selectedNoteIds && selectedNoteIds.length > 0) ?
                allNotes.filter(n => selectedNoteIds.indexOf(n.id) !== -1) : allNotes;
            exportData.data.tags = getTags();
        }
        return exportData;
    }

    // ========== VALIDAÇÃO DE ESTRUTURA DE DADOS ==========
    function validateImportedData(data) {
        console.log('[Profile] Validando estrutura dos dados importados...');
        
        if (!data || typeof data !== 'object') {
            console.error('[Profile] Dados inválidos: objeto vazio ou malformado.');
            throw new Error('Dados inválidos: objeto vazio ou malformado.');
        }

        const hasUser = !!data.user;
        const hasData = !!data.data && typeof data.data === 'object';
        const hasCourses = data.data && Array.isArray(data.data.courses);
        
        if (!hasUser && !hasData) {
            console.error('[Profile] Estrutura de dados não reconhecida.');
            throw new Error('Arquivo inválido: estrutura de dados não reconhecida.');
        }

        if (!hasData) {
            console.warn('[Profile] Propriedade "data" ausente. Tentando adaptar estrutura antiga...');
            if (Array.isArray(data.courses)) {
                data.data = { courses: data.courses };
                console.log('[Profile] Estrutura adaptada: data.courses criado a partir de courses raiz.');
            } else {
                console.error('[Profile] Não foi possível adaptar: courses não encontrado na raiz.');
                throw new Error('Estrutura de dados não suportada.');
            }
        }

        console.log('[Profile] Validação concluída com sucesso.');
        return true;
    }

    // ========== MODAL DE SENHA ==========
    function createPasswordModal(title, message, callback) {
        const existing = document.getElementById('customPasswordModal');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.id = 'customPasswordModal';
        overlay.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;' +
            'z-index:9999;backdrop-filter:blur(8px);';
        const modal = document.createElement('div');
        modal.style.cssText =
            'background:var(--bg-secondary);border-radius:24px;padding:2rem;' +
            'max-width:420px;width:90%;border:1px solid var(--border);' +
            'box-shadow:var(--modal-shadow);';
        modal.innerHTML = `
            <h3 style="color:var(--text-primary);margin-bottom:0.5rem;font-size:1.3rem;display:flex;align-items:center;gap:0.6rem;">
                <i class="fas fa-lock" style="color:var(--accent-teal);"></i> ${title}
            </h3>
            <p style="color:var(--text-secondary);margin-bottom:1rem;">${message}</p>
            <div style="position:relative;">
                <input type="password" id="passwordModalInput" placeholder="${t('profile_password')}..." style="
                    width:100%;padding:0.8rem 2.5rem 0.8rem 1rem;
                    background:var(--bg-tertiary);border:1px solid var(--border);
                    border-radius:12px;color:var(--text-primary);font-size:1rem;margin-bottom:1rem;
                ">
                <button id="togglePasswordVisibility" style="
                    position:absolute;right:12px;top:50%;transform:translateY(-50%);
                    background:none;border:none;color:var(--text-secondary);
                    cursor:pointer;font-size:1.1rem;padding:4px;
                ">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <div id="passwordModalError" style="color:#ef4444;font-size:0.85rem;margin-bottom:0.5rem;display:none;"></div>
            <div style="display:flex;gap:0.8rem;justify-content:flex-end;">
                <button id="passwordModalCancel" style="padding:0.6rem 1.2rem;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:12px;color:var(--text-primary);cursor:pointer;">
                    ${t('notas_cancel') || 'Cancelar'}
                </button>
                <button id="passwordModalConfirm" style="padding:0.6rem 1.2rem;background:var(--gradient-primary);border:none;border-radius:12px;color:white;cursor:pointer;font-weight:600;">
                    ${t('profile_save')}
                </button>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = document.getElementById('passwordModalInput');
        const errorDiv = document.getElementById('passwordModalError');
        const confirmBtn = document.getElementById('passwordModalConfirm');
        const cancelBtn = document.getElementById('passwordModalCancel');
        const toggleBtn = document.getElementById('togglePasswordVisibility');
        const closeModal = () => overlay.remove();

        toggleBtn.addEventListener('click', () => {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });

        confirmBtn.addEventListener('click', async () => {
            const password = input.value;
            if (!password) {
                errorDiv.textContent = t('profile_password_required');
                errorDiv.style.display = 'block';
                return;
            }
            try {
                const storedHash = localStorage.getItem(STORAGE_KEYS.PASSWORD);
                if (storedHash) {
                    const isValid = await verifyPassword(password, storedHash);
                    if (!isValid) {
                        errorDiv.textContent = t('profile_password_incorrect');
                        errorDiv.style.display = 'block';
                        input.value = '';
                        input.focus();
                        return;
                    }
                }
                closeModal();
                callback(password);
            } catch (e) {
                errorDiv.textContent = t('profile_password_incorrect');
                errorDiv.style.display = 'block';
            }
        });
        cancelBtn.addEventListener('click', closeModal);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') closeModal();
        });
        input.focus();
        return overlay;
    }

    // ========== EXPORTAÇÃO ==========
    async function handleExport() {
        const includeCourses = document.getElementById('exportCourses');
        const includeVideos = document.getElementById('exportVideos');
        const includeBooks = document.getElementById('exportBooks');
        const includeNotes = document.getElementById('exportNotes');

        if (!includeCourses || !includeVideos || !includeBooks || !includeNotes) {
            showToast('Erro ao carregar opções de exportação.', 'error');
            return;
        }

        const includeCoursesChecked = includeCourses.checked;
        const includeVideosChecked = includeVideos.checked;
        const includeBooksChecked = includeBooks.checked;
        const includeNotesChecked = includeNotes.checked;

        const selectedNoteIds = [];
        if (includeNotesChecked) {
            const checkboxes = document.querySelectorAll('#notesCheckboxes input[type="checkbox"]:checked');
            checkboxes.forEach(cb => selectedNoteIds.push(cb.value));
        }
        const hasPassword = hasStoredPassword();

        const exportAction = async (password) => {
            try {
                const data = generateExportData(includeCoursesChecked, includeVideosChecked, includeBooksChecked, includeNotesChecked, selectedNoteIds);
                let finalData = data;
                let isEncrypted = false;
                if (password && password.length > 0) {
                    try {
                        const encrypted = await encryptData(data, password);
                        finalData = {
                            encrypted: true,
                            data: encrypted,
                            version: '2.1-encrypted',
                            user: data.user,
                            timestamp: data.timestamp,
                            checksum: data.checksum
                        };
                        isEncrypted = true;
                    } catch (e) {
                        showToast(t('profile_encrypt_error'), 'error');
                        return;
                    }
                }
                const json = JSON.stringify(finalData, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const suffix = isEncrypted ? '_criptografado' : '';
                a.download = 'dados_completos_' + data.user + '_' + new Date().toISOString().slice(0,10) + suffix + '.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(t('profile_export_success'), 'success');
            } catch (error) {
                console.error('[Profile] Erro na exportação:', error);
                showToast(t('profile_export_error'), 'error');
            }
        };

        if (hasPassword) {
            createPasswordModal(t('profile_export_import'), t('profile_password'), async (password) => {
                await exportAction(password);
            });
        } else {
            if (confirm(t('profile_no_password_confirm'))) await exportAction('');
        }
    }

    // ========== IMPORTAÇÃO ==========
    async function handleImport(file) {
        if (!file) {
            showToast('Nenhum arquivo selecionado.', 'error');
            return;
        }
        console.log('[Import] Arquivo selecionado:', file.name, file.size, file.type);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                console.log('[Import] Leitura do arquivo concluída. Tamanho:', e.target.result.length);
                const importedData = JSON.parse(e.target.result);
                console.log('[Import] JSON parseado com sucesso. Chaves:', Object.keys(importedData));

                if (!importedData || typeof importedData !== 'object') {
                    throw new Error('Arquivo inválido: dados não encontrados.');
                }

                if (importedData.checksum) {
                    try {
                        const tempJson = JSON.stringify(importedData);
                        let hash = 0;
                        for (let idx = 0; idx < tempJson.length; idx++) {
                            hash = ((hash << 5) - hash) + tempJson.charCodeAt(idx);
                            hash |= 0;
                        }
                        const computedChecksum = hash.toString(16);
                        if (computedChecksum !== importedData.checksum) {
                            console.warn('[Import] Checksum inválido. O arquivo pode estar corrompido.');
                        } else {
                            console.log('[Import] Checksum verificado com sucesso.');
                        }
                    } catch (_) {}
                }

                if (importedData.encrypted === true) {
                    console.log('[Import] Arquivo criptografado detectado.');
                    createPasswordModal(t('profile_export_import'), t('profile_password'), async (password) => {
                        try {
                            console.log('[Import] Iniciando descriptografia...');
                            const decrypted = await decryptData(importedData.data, password);
                            console.log('[Import] Descriptografia bem-sucedida. Chaves:', Object.keys(decrypted));
                            validateImportedData(decrypted);
                            await applyImportedData(decrypted);
                        } catch (err) {
                            console.error('[Import] Erro na descriptografia:', err);
                            showToast(t('profile_password_incorrect') || 'Senha incorreta ou arquivo corrompido.', 'error');
                        }
                    });
                    return;
                }

                console.log('[Import] Arquivo não criptografado.');

                if (importedData.password) {
                    console.log('[Import] Arquivo com hash de senha detectado.');
                    createPasswordModal(t('profile_export_import'), t('profile_password'), async (password) => {
                        try {
                            console.log('[Import] Verificando senha...');
                            const match = await verifyPassword(password, importedData.password);
                            if (match) {
                                console.log('[Import] Senha correta.');
                                validateImportedData(importedData);
                                await applyImportedData(importedData);
                            } else {
                                console.warn('[Import] Senha incorreta.');
                                showToast(t('profile_password_incorrect'), 'error');
                            }
                        } catch (err) {
                            console.error('[Import] Erro na verificação de senha:', err);
                            showToast(t('profile_password_incorrect'), 'error');
                        }
                    });
                } else {
                    console.log('[Import] Arquivo sem senha. Aplicando diretamente.');
                    validateImportedData(importedData);
                    await applyImportedData(importedData);
                }

            } catch (error) {
                console.error('[Import] Erro crítico:', error);
                showToast(t('profile_import_error') || 'Erro ao processar o arquivo. Verifique se é um arquivo válido.', 'error');
            }
        };

        reader.onerror = () => {
            console.error('[Import] Erro ao ler o arquivo.');
            showToast('Erro ao ler o arquivo. Tente novamente.', 'error');
        };

        reader.readAsText(file);
    }

    // ========== APLICAR DADOS IMPORTADOS ==========
    async function applyImportedData(importedData) {
        console.log('[Import] Aplicando dados importados...');

        if (!importedData) {
            showToast('Dados importados inválidos.', 'error');
            return;
        }

        if (!importedData.data) {
            console.warn('[Import] Propriedade "data" ausente. Tentando adaptar...');
            if (Array.isArray(importedData.courses)) {
                importedData.data = { courses: importedData.courses };
            } else {
                showToast(t('profile_invalid_file'), 'error');
                return;
            }
        }

        const data = importedData.data;
        let importedCount = 0;

        if (!confirm(t('profile_import_confirm'))) return;

        try {
            if (importedData.user) localStorage.setItem(STORAGE_KEYS.NAME, importedData.user);
            if (importedData.gender) localStorage.setItem(STORAGE_KEYS.GENDER, importedData.gender);
            if (importedData.avatar) {
                try {
                    localStorage.setItem(STORAGE_KEYS.AVATAR, importedData.avatar);
                } catch (e) {
                    console.warn('[Import] Erro ao salvar avatar:', e);
                }
            }
            if (importedData.matricula) localStorage.setItem(STORAGE_KEYS.MATRICULA, importedData.matricula);
            if (importedData.auditorioTime) localStorage.setItem(AUDITORIO_TIME_KEY, importedData.auditorioTime);

            if (data.courses && Array.isArray(data.courses)) {
                for (const course of data.courses) {
                    if (course.id && course.rawData) {
                        try {
                            localStorage.setItem('ulivre_course_' + course.id, JSON.stringify(course.rawData));
                            importedCount++;
                        } catch (e) {
                            console.warn('[Import] Erro ao salvar curso ' + course.id + ':', e);
                        }
                    }
                }
            }

            if (data.videos) localStorage.setItem('yt_video_progress', JSON.stringify(data.videos));
            if (data.booksRead) localStorage.setItem('ulivre_livros_lidos', JSON.stringify(data.booksRead));
            if (data.notes) localStorage.setItem('ulivre_notas_estudo', JSON.stringify(data.notes));
            if (data.tags) localStorage.setItem('ulivre_notas_tags', JSON.stringify(data.tags));

            showToast(t('profile_import_success', { count: importedCount }), 'success');
            if (window.updateProfileModal) window.updateProfileModal();
            if (window.updateProfileButton) window.updateProfileButton();
            if (window.loadAvatarToModal) window.loadAvatarToModal();

            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                setTimeout(() => location.reload(), 1000);
            } else {
                if (window.renderCourseCards) window.renderCourseCards();
            }

            console.log('[Import] Importação concluída. ' + importedCount + ' cursos importados.');
        } catch (error) {
            console.error('[Import] Erro ao aplicar dados:', error);
            showToast('Erro ao aplicar os dados importados. Tente novamente.', 'error');
        }
    }

    // ========== ATUALIZAR TRADUÇÕES DO MODAL ==========
    function updateProfileTranslations() {
        const modalHeader = document.querySelector('.profile-modal-header h2');
        if (modalHeader) modalHeader.innerHTML = '<i class="fas fa-user-circle"></i> ' + t('profile_title');

        const avatarOverlay = document.querySelector('.avatar-overlay span');
        if (avatarOverlay) avatarOverlay.textContent = t('profile_change_photo');

        const nameLabel = document.querySelector('label[for="profileNameInput"]');
        if (nameLabel) nameLabel.innerHTML = '<i class="fas fa-user"></i> ' + t('profile_name');

        const nameInput = document.getElementById('profileNameInput');
        if (nameInput) nameInput.placeholder = t('profile_name_placeholder');

        const genderLabel = document.querySelector('label[for="profileGender"]');
        if (genderLabel) genderLabel.innerHTML = '<i class="fas fa-venus-mars"></i> ' + t('profile_gender');

        const passwordLabel = document.querySelector('label[for="profilePassword"]');
        if (passwordLabel) passwordLabel.innerHTML = '<i class="fas fa-lock"></i> ' + t('profile_password');

        const passwordInput = document.getElementById('profilePassword');
        if (passwordInput) passwordInput.placeholder = t('profile_password_placeholder');

        const saveNameBtn = document.getElementById('profileSaveNameBtn');
        if (saveNameBtn) saveNameBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save_name');

        const saveGenderBtn = document.getElementById('profileSaveGenderBtn');
        if (saveGenderBtn) saveGenderBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');

        const savePasswordBtn = document.getElementById('profileSavePasswordBtn');
        if (savePasswordBtn) savePasswordBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');

        const genderSelect = document.getElementById('profileGender');
        if (genderSelect) {
            const options = genderSelect.querySelectorAll('option');
            const genderMap = {
                '': t('profile_gender_not_informed'),
                'masculino': t('profile_gender_masculine'),
                'feminino': t('profile_gender_feminine'),
                'outro': t('profile_gender_other')
            };
            options.forEach(opt => {
                if (genderMap[opt.value] !== undefined) opt.textContent = genderMap[opt.value];
            });
        }

        const statItems = document.querySelectorAll('.profile-stats .stat-item');
        if (statItems.length >= 6) {
            const texts = [
                t('profile_watched_videos'),
                t('profile_total_videos'),
                t('profile_completed_lessons'),
                t('profile_completed_disciplines'),
                t('profile_total_points'),
                t('profile_auditorio_hours')
            ];
            statItems.forEach((item, idx) => {
                if (idx < texts.length) {
                    const labelSpan = item.querySelector('span:first-child');
                    if (labelSpan) labelSpan.textContent = texts[idx];
                }
            });
        }

        const exportItems = [
            { id: 'exportCourses', key: 'profile_export_courses' },
            { id: 'exportVideos', key: 'profile_export_videos' },
            { id: 'exportBooks', key: 'profile_export_books' },
            { id: 'exportNotes', key: 'profile_export_notes' }
        ];
        for (const item of exportItems) {
            const input = document.getElementById(item.id);
            if (input) {
                const label = input.closest('label');
                if (label) {
                    const icon = label.querySelector('i');
                    if (icon) {
                        const inputClone = input.cloneNode(true);
                        label.innerHTML = '';
                        label.appendChild(inputClone);
                        label.appendChild(document.createTextNode(' '));
                        const iconClone = icon.cloneNode(true);
                        label.appendChild(iconClone);
                        label.appendChild(document.createTextNode(' ' + t(item.key)));
                    } else {
                        label.textContent = t(item.key);
                    }
                }
            }
        }

        const coursesTitle = document.querySelector('#profileCoursesList h4');
        if (coursesTitle) coursesTitle.innerHTML = '<i class="fas fa-graduation-cap"></i> ' + t('profile_saved_courses');

        const exportTitle = document.querySelector('.profile-modal-body hr + h4');
        if (exportTitle) exportTitle.innerHTML = '<i class="fas fa-file-export"></i> ' + t('profile_export_import');

        const selectNotesLabel = document.querySelector('#notesSelectionContainer p');
        if (selectNotesLabel) selectNotesLabel.textContent = t('profile_select_notes');

        const exportBtn = document.getElementById('generateExportBtn');
        if (exportBtn) exportBtn.innerHTML = '<i class="fas fa-file-export"></i> ' + t('profile_save_progress');

        const importBtn = document.getElementById('importProgressBtn');
        if (importBtn) importBtn.innerHTML = '<i class="fas fa-file-import"></i> ' + t('profile_import_progress');

        const profileNote = document.querySelector('.profile-note');
        if (profileNote) profileNote.innerHTML = '<i class="fas fa-database"></i> ' + t('profile_data_note');

        const matriculaLabel = document.querySelector('.profile-matricula span:first-child');
        if (matriculaLabel) matriculaLabel.textContent = t('profile_matricula');

        const ongoingBadges = document.querySelectorAll('.profile-course-item .progress-badge.ongoing');
        ongoingBadges.forEach(badge => badge.textContent = t('profile_in_progress'));
        const completedBadges = document.querySelectorAll('.profile-course-item .progress-badge.completed');
        completedBadges.forEach(badge => badge.textContent = t('profile_completed'));

        const ongoingText = document.querySelector('.ongoing-courses-summary span');
        if (ongoingText) {
            const ongoingCount = document.querySelectorAll('.profile-course-item .progress-badge.ongoing').length;
            if (ongoingCount > 0) {
                ongoingText.innerHTML = '<strong>' + ongoingCount + '</strong> ' + t('profile_in_progress').toLowerCase();
            }
        }
    }

    // ========== UI DO MODAL ==========
    function updateProfileModal() {
        const allCourses = getAllCoursesProgress();
        const totalStats = { watchedVideos: 0, totalVideos: 0, completedLessons: 0, completedDisciplines: 0, points: 0 };
        let ongoingCount = 0;

        const nameInput = document.getElementById('profileNameInput');
        if (nameInput) {
            nameInput.value = loadProfileName();
            nameInput.placeholder = t('profile_name_placeholder');
        }

        const genderSelect = document.getElementById('profileGender');
        if (genderSelect) genderSelect.value = getProfileGender();

        const passwordInput = document.getElementById('profilePassword');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.placeholder = t('profile_password_placeholder');
            showPasswordSavedIndicator(hasStoredPassword());
            passwordInput.removeEventListener('input', updatePasswordStrengthIndicator);
            passwordInput.addEventListener('input', updatePasswordStrengthIndicator);
            if (passwordInput.value.length > 0) updatePasswordStrengthIndicator.call(passwordInput);
        }

        const matricula = getMatricula();
        const matriculaDisplay = document.getElementById('profileMatriculaDisplay');
        if (matriculaDisplay) matriculaDisplay.textContent = matricula;

        const listContainer = document.getElementById('profileCoursesList');
        if (listContainer) {
            let listHtml = '<h4 style="margin:0.5rem 0;color:var(--text-secondary);"><i class="fas fa-graduation-cap"></i> ' + t('profile_saved_courses') + '</h4>';
            if (allCourses.length === 0) {
                listHtml += '<p style="color:var(--text-tertiary);font-size:0.9rem;">' + t('profile_no_courses') + '</p>';
            } else {
                for (const course of allCourses) {
                    const stats = course.stats;
                    const isOngoing = stats.progressPercent > 0 && stats.progressPercent < 100;
                    const isCompleted = stats.progressPercent >= 100;
                    let badge = '';
                    if (isOngoing) { badge = '<span class="progress-badge ongoing">' + t('profile_in_progress') + '</span>'; ongoingCount++; }
                    else if (isCompleted) badge = '<span class="progress-badge completed">' + t('profile_completed') + '</span>';
                    totalStats.watchedVideos += stats.watchedVideos;
                    totalStats.totalVideos += stats.totalVideos;
                    totalStats.completedLessons += stats.completedLessons;
                    totalStats.completedDisciplines += stats.completedDisciplines;
                    totalStats.points += stats.points;
                    const iconClass = course.id === 'computacao' ? 'laptop-code' : (course.id === 'matematica' ? 'square-root-alt' : 'book');
                    listHtml +=
                        '<div class="profile-course-item">' +
                        '<div class="profile-course-name">' +
                        '<i class="fas fa-' + iconClass + '"></i> ' + escapeHtml(course.name) + ' ' + badge +
                        '</div>' +
                        '<div class="profile-course-progress">' +
                        '<span>' + stats.progressPercent + '%</span>' +
                        '<span class="points">' + stats.points + ' pts</span>' +
                        '</div>' +
                        '</div>';
                }
            }
            listContainer.innerHTML = listHtml;
        }

        const ongoingContainer = document.getElementById('ongoingCoursesContainer');
        if (ongoingContainer) {
            if (ongoingCount > 0) {
                ongoingContainer.innerHTML = '<div class="ongoing-courses-summary"><i class="fas fa-play-circle"></i> <span><strong>' + ongoingCount + '</strong> ' + t('profile_in_progress').toLowerCase() + '</span></div>';
            } else {
                ongoingContainer.innerHTML = '';
            }
        }

        const watchedEl = document.getElementById('profileWatchedVideos');
        if (watchedEl) watchedEl.textContent = totalStats.watchedVideos;
        const totalEl = document.getElementById('profileTotalVideos');
        if (totalEl) totalEl.textContent = totalStats.totalVideos;
        const lessonsEl = document.getElementById('profileCompletedLessons');
        if (lessonsEl) lessonsEl.textContent = totalStats.completedLessons;
        const disciplinesEl = document.getElementById('profileCompletedDisciplines');
        if (disciplinesEl) disciplinesEl.textContent = totalStats.completedDisciplines;
        const pointsEl = document.getElementById('profileTotalPoints');
        if (pointsEl) pointsEl.textContent = totalStats.points;

        updateAuditorioTimeDisplay();
        loadAvatarToModal();
        updateNotesCheckboxes();
        updateProfileTranslations();
    }

    // ========== ESCAPE HTML ==========
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    // ========== INDICADOR DE FORÇA DA SENHA ==========
    function updatePasswordStrengthIndicator() {
        const input = document.getElementById('profilePassword');
        if (!input) return;
        const password = input.value;
        const container = input.closest('.profile-user-section');
        if (!container) return;
        const oldIndicator = container.querySelector('.password-strength-indicator');
        if (oldIndicator) oldIndicator.remove();
        if (password.length === 0) return;
        const strength = checkPasswordStrength(password);
        const feedback = getPasswordFeedback(strength.checks);
        const indicator = document.createElement('div');
        indicator.className = 'password-strength-indicator';
        indicator.style.cssText = 'margin-top:0.5rem;width:100%;background:var(--bg-tertiary);border-radius:8px;padding:0.6rem 1rem;border:1px solid var(--border);';
        const barContainer = document.createElement('div');
        barContainer.style.cssText = 'width:100%;height:6px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;margin-bottom:0.3rem;';
        const bar = document.createElement('div');
        const percent = (strength.passed / strength.total) * 100;
        bar.style.cssText = 'width:' + percent + '%;height:100%;background:' + strength.color + ';transition:width 0.3s;border-radius:4px;';
        barContainer.appendChild(bar);
        indicator.appendChild(barContainer);
        const textRow = document.createElement('div');
        textRow.style.cssText = 'display:flex;justify-content:space-between;color:var(--text-secondary);font-size:0.8rem;';
        const strengthText = document.createElement('span');
        strengthText.textContent = 'Força: ' + strength.strength;
        strengthText.style.color = strength.color;
        strengthText.style.fontWeight = '600';
        textRow.appendChild(strengthText);
        const reqsText = document.createElement('span');
        reqsText.textContent = strength.passed + '/' + strength.total + ' requisitos';
        textRow.appendChild(reqsText);
        indicator.appendChild(textRow);
        if (feedback.length > 0) {
            const feedbackDiv = document.createElement('div');
            feedbackDiv.style.cssText = 'margin-top:0.3rem;font-size:0.75rem;color:var(--text-tertiary);';
            feedbackDiv.textContent = 'Falta: ' + feedback.join(', ');
            indicator.appendChild(feedbackDiv);
        }
        container.appendChild(indicator);
    }

    function updateNotesCheckboxes() {
        const container = document.getElementById('notesCheckboxes');
        if (!container) return;
        const notes = getNotes();
        if (notes.length === 0) {
            container.innerHTML = '<p style="color:var(--text-tertiary);">' + t('profile_no_notes') + '</p>';
            return;
        }
        let html = '';
        for (const note of notes) {
            html += '<label style="display:block;margin:0.2rem 0;"><input type="checkbox" class="note-select" value="' + note.id + '" checked> ' + escapeHtml(note.titulo || 'Sem título') + '</label>';
        }
        container.innerHTML = html;
    }

    // ========== ABRIR/FECHAR MODAL ==========
    function openProfileModal() {
        console.log('[Profile] openProfileModal chamado');
        const modal = document.getElementById('profileModal');
        if (!modal) {
            console.warn('[Profile] Modal #profileModal não encontrado no DOM');
            return;
        }
        try {
            updateProfileModal();
        } catch (e) {
            console.warn('[Profile] Erro ao atualizar modal, mas abrindo mesmo assim:', e);
        }
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('[Profile] Modal aberto com sucesso');
    }

    function closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        console.log('[Profile] Modal fechado');
    }

    // ========== INICIALIZAÇÃO ==========
    let _initialized = false;

    async function initProfileSystem() {
        if (_initialized) {
            console.log('[Profile] Sistema já inicializado.');
            return;
        }
        _initialized = true;

        console.log('[Profile] initProfileSystem iniciado');
        await detectImageBasePath();

        // ===== ATUALIZAR BOTÃO DE PERFIL =====
        const profileBtn = document.getElementById('profileBtn');
        console.log('[Profile] Botão #profileBtn encontrado?', !!profileBtn);

        if (profileBtn) {
            profileBtn.removeEventListener('click', openProfileModal);
            profileBtn.addEventListener('click', openProfileModal);
            console.log('[Profile] Listener de clique adicionado ao botão #profileBtn');
            setTimeout(updateProfileButton, 50);
            setTimeout(updateProfileButton, 300);
        } else {
            console.warn('[Profile] Botão #profileBtn NÃO encontrado. Verifique o HTML.');
        }

        // ===== AVATAR WRAPPER =====
        const avatarWrapper = document.getElementById('avatarWrapper');
        console.log('[Profile] #avatarWrapper encontrado?', !!avatarWrapper);
        if (avatarWrapper) {
            avatarWrapper.removeEventListener('click', showAvatarSelector);
            avatarWrapper.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Profile] Clique no avatarWrapper – abrindo seletor');
                showAvatarSelector();
            });
            console.log('[Profile] Listener de clique adicionado ao #avatarWrapper');
        } else {
            console.warn('[Profile] #avatarWrapper não encontrado. O seletor de avatar não funcionará.');
        }

        // ===== FECHAR MODAL DE PERFIL =====
        const closeBtn = document.getElementById('closeProfileModal');
        if (closeBtn) {
            closeBtn.removeEventListener('click', closeProfileModal);
            closeBtn.addEventListener('click', closeProfileModal);
        }

        // ===== MODAL DE PERFIL =====
        const modal = document.getElementById('profileModal');
        if (modal) {
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        closeProfileModal();
                    }
                });
            }
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    closeProfileModal();
                }
            });
        }

        // ===== BOTÕES DE SALVAR =====
        const saveNameBtn = document.getElementById('profileSaveNameBtn');
        if (saveNameBtn) {
            saveNameBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save_name');
            saveNameBtn.removeEventListener('click', handleSaveName);
            saveNameBtn.addEventListener('click', handleSaveName);
        }

        const saveGenderBtn = document.getElementById('profileSaveGenderBtn');
        if (saveGenderBtn) {
            saveGenderBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');
            saveGenderBtn.removeEventListener('click', handleSaveGender);
            saveGenderBtn.addEventListener('click', handleSaveGender);
        }

        const savePasswordBtn = document.getElementById('profileSavePasswordBtn');
        if (savePasswordBtn) {
            savePasswordBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');
            savePasswordBtn.removeEventListener('click', handleSavePassword);
            savePasswordBtn.addEventListener('click', handleSavePassword);
        }

        // Handlers separados
        function handleSaveName() {
            const nameInput = document.getElementById('profileNameInput');
            if (!nameInput) return;
            const name = nameInput.value.trim();
            if (!name) { showToast(t('profile_name_required'), 'error'); return; }
            saveProfileName(name);
        }

        function handleSaveGender() {
            const genderSelect = document.getElementById('profileGender');
            if (!genderSelect) return;
            const gender = genderSelect.value || '';
            saveProfileGender(gender);
        }

        async function handleSavePassword() {
            const passwordInput = document.getElementById('profilePassword');
            if (!passwordInput) return;
            const password = passwordInput.value;
            const saved = await saveProfilePassword(password);
            if (saved) {
                passwordInput.value = '';
                showPasswordSavedIndicator(true);
            }
        }

        // ===== EXPORTAÇÃO E IMPORTAÇÃO =====
        const exportBtn = document.getElementById('generateExportBtn');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-file-export"></i> ' + t('profile_save_progress');
            exportBtn.removeEventListener('click', handleExport);
            exportBtn.addEventListener('click', handleExport);
        }

        const importBtn = document.getElementById('importProgressBtn');
        if (importBtn) {
            importBtn.innerHTML = '<i class="fas fa-file-import"></i> ' + t('profile_import_progress');
            importBtn.removeEventListener('click', handleImportClick);
            importBtn.addEventListener('click', handleImportClick);
        }

        function handleImportClick() {
            const importInput = document.getElementById('importFileInput');
            if (importInput) importInput.click();
        }

        const importInput = document.getElementById('importFileInput');
        if (importInput) {
            importInput.removeEventListener('change', handleImportChange);
            importInput.addEventListener('change', handleImportChange);
        }

        function handleImportChange(e) {
            if (e.target.files && e.target.files[0]) {
                handleImport(e.target.files[0]);
            }
            e.target.value = '';
        }

        // ===== AVATAR INICIAL =====
        if (!getUserAvatar()) {
            setDefaultAvatar();
        }

        // ===== CARREGAR DADOS NO MODAL =====
        loadAvatarToModal();
        const nameInputField = document.getElementById('profileNameInput');
        if (nameInputField) {
            nameInputField.value = loadProfileName();
            nameInputField.placeholder = t('profile_name_placeholder');
        }
        const genderSelectField = document.getElementById('profileGender');
        if (genderSelectField) {
            genderSelectField.value = getProfileGender();
        }
        const passwordInputField = document.getElementById('profilePassword');
        if (passwordInputField) {
            passwordInputField.placeholder = t('profile_password_placeholder');
            showPasswordSavedIndicator(hasStoredPassword());
        }

        updateProfileButton();
        updateProfileTranslations();

        console.log('[Profile] Sistema de perfil inicializado com sucesso');
    }

    // ========== EXPOSIÇÃO GLOBAL ==========
    window.initProfileSystem = initProfileSystem;
    window.openProfileModal = openProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.updateProfileModal = updateProfileModal;
    window.updateProfileTranslations = updateProfileTranslations;
    window.handleExport = handleExport;
    window.handleImport = handleImport;
    window.getUserAvatar = getUserAvatar;
    window.loadAvatarToModal = loadAvatarToModal;
    window.updateProfileButton = updateProfileButton;
    window.showAvatarSelector = showAvatarSelector;
    window.saveProfileName = saveProfileName;
    window.saveProfileGender = saveProfileGender;
    window.saveProfilePassword = saveProfilePassword;
    window.saveUserAvatar = saveUserAvatar;
    window.setDefaultAvatar = setDefaultAvatar;
    window.verifyPassword = verifyPassword;
    window.hashPassword = hashPassword;
    window.resizeImage = resizeImage;
    window.checkPasswordStrength = checkPasswordStrength;
    window.getPasswordFeedback = getPasswordFeedback;
    window.getCourseName = getCourseName;
    window.validateImportedData = validateImportedData;

    // ========== INICIALIZAÇÃO AUTOMÁTICA ==========
    function autoInit() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('[Profile] DOMContentLoaded – iniciando profile');
                if (!window._profileInitialized) {
                    window._profileInitialized = true;
                    initProfileSystem();
                }
            });
        } else {
            console.log('[Profile] DOM já carregado – iniciando profile imediatamente');
            if (!window._profileInitialized) {
                window._profileInitialized = true;
                initProfileSystem();
            }
        }
    }

    autoInit();

    // ========== EVENTOS DE HORAS DO AUDITÓRIO ==========
    window.addEventListener('auditorioTimeUpdated', (e) => {
        const seconds = e.detail.seconds;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const formatted = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min';
        const el = document.getElementById('profileAuditorioTime');
        if (el) el.textContent = formatted;
    });

    window.addEventListener('storage', (e) => {
        if (e.key === AUDITORIO_TIME_KEY) {
            const el = document.getElementById('profileAuditorioTime');
            if (el && document.getElementById('profileModal')?.style?.display === 'flex') {
                const seconds = parseInt(e.newValue || '0', 10);
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                el.textContent = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min';
            }
        }
    });

    // ========== REAGIR A MUDANÇAS DE IDIOMA ==========
    window.addEventListener('languageChanged', async (e) => {
        const lang = e.detail.lang || 'pt-br';
        console.log('[Profile] Idioma alterado para:', lang);
        updateProfileButton();
        const modal = document.getElementById('profileModal');
        if (modal && modal.style.display === 'flex') {
            updateProfileTranslations();
            updateProfileModal();
        }
    });

})();