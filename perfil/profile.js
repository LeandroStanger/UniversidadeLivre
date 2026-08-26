// perfil/profile.js – Versão 29.0 – COMPLETO E OTIMIZADO
// Módulo de Perfil com Avatar, Nome, Gênero, Senha, Exportação/Importação
// CORREÇÃO: Validação robusta de estrutura de dados na importação
// CORREÇÃO: Logs detalhados para depuração
// CORREÇÃO: Suporte a todos os cursos (incluindo Física, Letras e Química)
// CORREÇÃO: Fallback para estruturas antigas de arquivos
// CORREÇÃO: Tratamento de exceções individuais (avatar, cursos, etc.)
// CORREÇÃO: Sincronização com módulo de Onboarding
// CORREÇÃO: Exportação de dados do perfil com checksum e senha
// CORREÇÃO: Importação com verificação de integridade e estrutura
// CORREÇÃO: Usa módulo central i18n (window.t) com fallback próprio

(function() {
    'use strict';

    console.log('[Profile] Inicializando módulo...');

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

    // ========== TRADUÇÃO (com fallback mínimo) ==========
    let translations = {};
    let currentLang = 'pt-br';
    let translationsLoaded = false;

    // Função t() que usa window.t se disponível
    function t(key, replacements = {}) {
        // Tenta usar o módulo central i18n
        if (window.t && typeof window.t === 'function') {
            try {
                return window.t(key, replacements);
            } catch (e) { /* fallback */ }
        }

        // Fallback próprio
        let text = translations[key] || key;
        for (var k in replacements) {
            if (replacements.hasOwnProperty(k)) {
                text = text.replace(new RegExp('{{' + k + '}}', 'g'), replacements[k]);
            }
        }
        return text;
    }

    function getCourseName(courseId) {
        var nameObj = COURSE_NAMES[courseId];
        if (!nameObj) return courseId;
        return nameObj[currentLang] || nameObj.pt || courseId;
    }

    // ========== I18N ==========
    async function loadTranslations(lang) {
        // Tenta usar o módulo central i18n
        if (window.i18n && typeof window.i18n.loadTranslations === 'function') {
            try {
                await window.i18n.loadTranslations(lang);
                translations = window.i18n.getTranslations ? window.i18n.getTranslations() : {};
                if (Object.keys(translations).length > 0) {
                    translationsLoaded = true;
                    console.log('[Profile] Traduções carregadas do módulo central i18n');
                    return true;
                }
            } catch (e) {
                console.warn('[Profile] Falha ao carregar do módulo central:', e);
            }
        }

        // Fallback: tenta carregar o arquivo JSON diretamente
        var paths = [
            '../lang/' + lang + '.json',
            'lang/' + lang + '.json',
            '/lang/' + lang + '.json',
            './lang/' + lang + '.json'
        ];
        for (var i = 0; i < paths.length; i++) {
            try {
                var response = await fetch(paths[i]);
                if (response.ok) {
                    translations = await response.json();
                    translationsLoaded = true;
                    console.log('[Profile] Traduções carregadas de ' + paths[i]);
                    return true;
                }
            } catch (e) { /* continua */ }
        }
        console.warn('[Profile] Nenhum arquivo de tradução encontrado para ' + lang + '. Usando fallback mínimo.');
        translations = {};
        translationsLoaded = false;
        return false;
    }

    // ========== FUNÇÕES AUXILIARES ==========
    function generateMatricula() {
        var now = new Date();
        var year = now.getFullYear();
        var month = String(now.getMonth() + 1).padStart(2, '0');
        var day = String(now.getDate()).padStart(2, '0');
        var hour = String(now.getHours()).padStart(2, '0');
        var minute = String(now.getMinutes()).padStart(2, '0');
        var second = String(now.getSeconds()).padStart(2, '0');
        var millisecond = String(now.getMilliseconds()).padStart(3, '0');
        return year + month + day + hour + minute + second + millisecond;
    }

    function getMatricula() {
        var matricula = localStorage.getItem(STORAGE_KEYS.MATRICULA);
        if (!matricula) {
            matricula = generateMatricula();
            localStorage.setItem(STORAGE_KEYS.MATRICULA, matricula);
        }
        return matricula;
    }

    function getAuditorioHours() {
        var timeInSeconds = parseInt(localStorage.getItem(AUDITORIO_TIME_KEY) || '0', 10);
        var hours = Math.floor(timeInSeconds / 3600);
        var minutes = Math.floor((timeInSeconds % 3600) / 60);
        return {
            seconds: timeInSeconds,
            hours: hours,
            minutes: minutes,
            formatted: hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min'
        };
    }

    function updateAuditorioTimeDisplay() {
        var auditTime = getAuditorioHours();
        var el = document.getElementById('profileAuditorioTime');
        if (el) el.textContent = auditTime.formatted;
    }

    // ========== SISTEMA DE NOTIFICAÇÕES ==========
    function showToast(message, type) {
        type = type || 'info';
        if (window.queueNotification && typeof window.queueNotification === 'function') {
            window.queueNotification(message, type);
            return;
        }
        var existing = document.getElementById('customToast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
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
        requestAnimationFrame(function() {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    // ========== LIMPEZA DE OBJETOS ==========
    function cleanObject(obj, maxDepth) {
        maxDepth = maxDepth || 15;
        var seen = new WeakSet();
        var depth = 0;

        function clean(value) {
            if (typeof value !== 'object' || value === null) return value;
            if (seen.has(value)) return '[Circular]';
            if (depth > maxDepth) return '[MaxDepth]';
            seen.add(value);
            depth++;
            if (Array.isArray(value)) {
                var arr = value.map(clean);
                depth--;
                return arr;
            }
            var result = {};
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    try { result[key] = clean(value[key]); } catch (e) { result[key] = '[Error]'; }
                }
            }
            depth--;
            return result;
        }
        try { return clean(obj); } catch (e) { return { error: 'Não foi possível limpar os dados' }; }
    }

    function safeStringify(obj, maxDepth) {
        maxDepth = maxDepth || 15;
        var cleaned = cleanObject(obj, maxDepth);
        try { return JSON.stringify(cleaned); } catch (e) { return '{"error":"Serialization failed"}'; }
    }

    // ========== CRIPTOGRAFIA (com fallback) ==========
    async function deriveKey(password, salt) {
        var encoder = new TextEncoder();
        var keyMaterial = await crypto.subtle.importKey(
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
            var encoder = new TextEncoder();
            var salt = crypto.getRandomValues(new Uint8Array(16));
            var iv = crypto.getRandomValues(new Uint8Array(12));
            var key = await deriveKey(password, salt);
            var jsonString = safeStringify(data, 15);
            var encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encoder.encode(jsonString)
            );
            var result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
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
            var encrypted = Uint8Array.from(atob(encryptedBase64), function(c) { return c.charCodeAt(0); });
            var salt = encrypted.slice(0, 16);
            var iv = encrypted.slice(16, 28);
            var data = encrypted.slice(28);
            var key = await deriveKey(password, salt);
            var decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );
            var decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decrypted));
        } catch (error) {
            console.error('Erro na descriptografia:', error);
            throw new Error('Falha ao descriptografar dados: ' + error.message);
        }
    }

    async function verifyPassword(inputPassword, storedHash) {
        if (!storedHash) return false;
        try {
            var encoder = new TextEncoder();
            var data = encoder.encode(inputPassword);
            var hash = await crypto.subtle.digest('SHA-256', data);
            var hashBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
            return hashBase64 === storedHash;
        } catch (e) {
            console.error('[Profile] Erro ao verificar senha:', e);
            return false;
        }
    }

    async function hashPassword(password) {
        try {
            var encoder = new TextEncoder();
            var data = encoder.encode(password);
            var hash = await crypto.subtle.digest('SHA-256', data);
            return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
        } catch (e) {
            console.error('[Profile] Erro ao gerar hash:', e);
            return null;
        }
    }

    // ========== VALIDAÇÃO DE SENHA ==========
    function checkPasswordStrength(password) {
        var checks = {
            minLength: password.length >= PASSWORD_MIN_LENGTH,
            hasUpper: PASSWORD_REQUIREMENTS.hasUpper.test(password),
            hasLower: PASSWORD_REQUIREMENTS.hasLower.test(password),
            hasNumber: PASSWORD_REQUIREMENTS.hasNumber.test(password),
            hasSpecial: PASSWORD_REQUIREMENTS.hasSpecial.test(password)
        };
        var passed = 0;
        for (var key in checks) {
            if (checks.hasOwnProperty(key) && checks[key]) passed++;
        }
        var strength = 'Fraca';
        var color = '#ef4444';
        if (passed === 5) { strength = 'Forte'; color = '#22c55e'; }
        else if (passed >= 4) { strength = 'Boa'; color = '#eab308'; }
        else if (passed >= 3) { strength = 'Média'; color = '#f59e0b'; }
        else if (passed >= 2) { strength = 'Fraca'; color = '#ef4444'; }
        else { strength = 'Muito fraca'; color = '#dc2626'; }
        return { checks: checks, passed: passed, strength: strength, color: color, total: 5 };
    }

    function getPasswordFeedback(checks) {
        var messages = [];
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
        var strength = checkPasswordStrength(password);
        if (strength.passed < 3) {
            var feedback = getPasswordFeedback(strength.checks);
            showToast(t('profile_password_weak') + feedback.join(', '), 'error');
            return false;
        }
        var hash = await hashPassword(password);
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
    function resizeImage(file, maxWidth, maxHeight, quality) {
        maxWidth = maxWidth || 150;
        maxHeight = maxHeight || 150;
        quality = quality || 0.7;
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var width = img.width;
                    var height = img.height;
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
                    var canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    var ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                    var dataUrl = canvas.toDataURL('image/jpeg', quality);
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
        var sizeInBytes = base64.length * 0.75;
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
        var img = document.getElementById('profileAvatar');
        if (!img) {
            console.warn('[Profile] #profileAvatar não encontrado');
            return;
        }
        var avatar = getUserAvatar();
        if (avatar) {
            img.src = avatar;
            console.log('[Profile] Avatar carregado do localStorage');
        } else {
            var name = loadProfileName() || 'Usuario';
            img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=6C8CFF&color=fff&size=80';
            console.log('[Profile] Avatar gerado via API');
        }
    }

    // ========== DETECÇÃO AUTOMÁTICA DO CAMINHO DAS IMAGENS ==========
    async function detectImageBasePath() {
        if (imageBasePath) return imageBasePath;

        var testFile = 'Aguia.png';
        var paths = [
            '/perfil/img/',
            'perfil/img/',
            '../perfil/img/',
            './perfil/img/',
            window.location.origin + '/perfil/img/',
            window.location.origin + '/universidade/perfil/img/'
        ];

        for (var i = 0; i < paths.length; i++) {
            var testUrl = paths[i] + testFile;
            try {
                var response = await fetch(testUrl, { method: 'HEAD' });
                if (response.ok) {
                    imageBasePath = paths[i];
                    console.log('[Profile] Caminho das imagens detectado: ' + imageBasePath);
                    return imageBasePath;
                }
            } catch (e) { /* ignora */ }
        }

        imageBasePath = '/perfil/img/';
        console.warn('[Profile] Nenhum caminho válido encontrado, usando fallback: ' + imageBasePath);
        return imageBasePath;
    }

    async function setDefaultAvatar() {
        if (getUserAvatar()) return;
        try {
            var basePath = await detectImageBasePath();
            var firstAvatar = DEFAULT_AVATARS[0];
            var imgSrc = basePath + firstAvatar.file;
            var response = await fetch(imgSrc);
            if (!response.ok) throw new Error('Falha ao carregar imagem padrão');
            var blob = await response.blob();
            var fileObj = new File([blob], firstAvatar.file, { type: blob.type });
            var resizedBase64 = await resizeImage(fileObj, 150, 150, 0.7);
            saveUserAvatar(resizedBase64);
        } catch (error) {
            console.warn('[Profile] Erro ao definir avatar padrão:', error);
        }
    }

    // ========== SELETOR DE AVATAR ==========
    async function showAvatarSelector() {
        console.log('[Profile] showAvatarSelector chamado');
        var existing = document.getElementById('avatarSelectorModal');
        if (existing) {
            existing.remove();
            console.log('[Profile] Modal de avatar já existia, removido');
        }

        var basePath = await detectImageBasePath();

        var overlay = document.createElement('div');
        overlay.id = 'avatarSelectorModal';
        overlay.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);' +
            'z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;';

        var modal = document.createElement('div');
        modal.style.cssText =
            'background:var(--bg-secondary);border-radius:24px;padding:1.5rem;' +
            'max-width:780px;width:100%;max-height:90vh;overflow-y:auto;' +
            'border:1px solid var(--border);box-shadow:0 20px 40px rgba(0,0,0,0.7);' +
            'animation:scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1);';

        var avatarOptionsHtml = '';
        for (var i = 0; i < DEFAULT_AVATARS.length; i++) {
            var av = DEFAULT_AVATARS[i];
            var imgSrc = basePath + av.file;
            var avatarName = t(av.key);
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

        var closeBtn = document.getElementById('closeAvatarSelector');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                overlay.remove();
                console.log('[Profile] Modal de avatar fechado pelo botão X');
            });
        }

        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
                console.log('[Profile] Modal de avatar fechado pelo overlay');
            }
        });

        var licenseBtn = document.getElementById('licenseAvatarBtn');
        if (licenseBtn) {
            licenseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.open('https://pixabay.com/service/license-summary/', '_blank');
            });
        }

        var options = document.querySelectorAll('.avatar-option');
        console.log('[Profile] Encontradas ' + options.length + ' opções de avatar');
        for (var j = 0; j < options.length; j++) {
            (function(opt) {
                var label = opt.querySelector('div:last-child');
                opt.addEventListener('mouseenter', function() {
                    if (label) label.style.opacity = '1';
                    this.style.borderColor = 'var(--accent-blue)';
                    this.style.transform = 'scale(1.04)';
                });
                opt.addEventListener('mouseleave', function() {
                    if (label) label.style.opacity = '0';
                    this.style.borderColor = 'var(--border)';
                    this.style.transform = 'scale(1)';
                });
                opt.addEventListener('click', function() {
                    var file = this.dataset.file;
                    console.log('[Profile] Avatar selecionado: ' + file);
                    var imgSrc = basePath + file;
                    fetch(imgSrc)
                        .then(function(res) { return res.blob(); })
                        .then(function(blob) {
                            var fileObj = new File([blob], file, { type: blob.type });
                            return resizeImage(fileObj, 150, 150, 0.7);
                        })
                        .then(function(resizedBase64) {
                            saveUserAvatar(resizedBase64);
                            overlay.remove();
                            console.log('[Profile] Avatar salvo com sucesso');
                        })
                        .catch(function(err) {
                            console.error('Erro ao carregar imagem padrão:', err);
                            showToast(t('profile_avatar_upload_error'), 'error');
                        });
                });
            })(options[j]);
        }

        var uploadBtn = document.getElementById('uploadAvatarBtn');
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);

        if (uploadBtn) {
            uploadBtn.addEventListener('click', function() {
                fileInput.click();
                console.log('[Profile] Clique em upload, abrindo seletor de arquivos');
            });
        }

        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                var file = e.target.files[0];
                console.log('[Profile] Arquivo selecionado: ' + file.name);
                handleAvatarUpload(file, function() {
                    overlay.remove();
                    console.log('[Profile] Upload concluído, modal fechado');
                });
            }
            fileInput.value = '';
        });

        var removeBtn = document.getElementById('removeAvatarBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
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

        var escHandler = function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
                console.log('[Profile] Modal de avatar fechado com ESC');
            }
        };
        document.addEventListener('keydown', escHandler);

        var observer = new MutationObserver(function() {
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
            .then(function(resizedBase64) {
                saveUserAvatar(resizedBase64);
                if (typeof callback === 'function') callback();
            })
            .catch(function(err) {
                console.error('Erro ao redimensionar imagem:', err);
                showToast(t('profile_avatar_upload_error'), 'error');
            });
    }

    // ========== ATUALIZAR BOTÃO DE PERFIL ==========
    function updateProfileButton() {
        var btn = document.getElementById('profileBtn');
        if (!btn) {
            console.warn('[Profile] Botão #profileBtn não encontrado');
            return;
        }
        var avatar = getUserAvatar();
        var name = loadProfileName() || 'Usuário';
        var initials = name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);

        btn.setAttribute('data-profile-custom', 'true');
        btn.innerHTML = '';

        if (avatar) {
            var img = document.createElement('img');
            img.src = avatar;
            img.alt = 'Perfil';
            img.style.cssText = 'width:32px;height:32px;border-radius:50%;object-fit:cover;margin-right:8px;';
            btn.appendChild(img);
        } else {
            var span = document.createElement('span');
            span.textContent = initials;
            span.className = 'profile-initials';
            span.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.15);color:#fff;font-size:0.85rem;font-weight:600;margin-right:8px;';
            btn.appendChild(span);
        }

        var textNode = document.createTextNode(' ' + t('profile'));
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
        var container = document.getElementById('profilePassword');
        if (!container) return;
        var parent = container.closest('.profile-user-section');
        if (!parent) return;
        var indicator = parent.querySelector('.password-saved-indicator');
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
        var totalVideos = watchedMap.length;
        var watchedVideos = watchedMap.filter(function(v) { return v === true; }).length;
        var completedLessons = Math.floor(watchedVideos / 5);
        var completedDisciplines = Math.floor(watchedVideos / 25);
        var points = (watchedVideos * 10) + (completedLessons * 50) + (completedDisciplines * 200);
        return {
            totalVideos: totalVideos,
            watchedVideos: watchedVideos,
            completedLessons: completedLessons,
            completedDisciplines: completedDisciplines,
            points: points,
            progressPercent: totalVideos ? Math.round((watchedVideos / totalVideos) * 100) : 0
        };
    }

    function getAllCoursesProgress() {
        var courses = [];
        for (var i = 0; i < localStorage.length; i++) {
            var key = localStorage.key(i);
            if (key && key.startsWith('ulivre_course_')) {
                var courseId = key.replace('ulivre_course_', '');
                try {
                    var data = JSON.parse(localStorage.getItem(key));
                    if (data && data.watchedMap) {
                        var stats = calculateCourseStats(data.watchedMap);
                        var name = getCourseName(courseId);
                        courses.push({ id: courseId, name: name, stats: stats, data: data });
                    }
                } catch (e) {}
            }
        }
        return courses;
    }

    // ========== EXPORTAÇÃO/IMPORTAÇÃO ==========
    function getVideosProgress() {
        var progress = localStorage.getItem('yt_video_progress');
        try { return progress ? JSON.parse(progress) : {}; } catch (e) { return {}; }
    }

    function getBooksRead() {
        var books = localStorage.getItem('ulivre_livros_lidos');
        try { return books ? JSON.parse(books) : []; } catch (e) { return []; }
    }

    function getNotes() {
        var notes = localStorage.getItem('ulivre_notas_estudo');
        try { return notes ? JSON.parse(notes) : []; } catch (e) { return []; }
    }

    function getTags() {
        var tags = localStorage.getItem('ulivre_notas_tags');
        try { return tags ? JSON.parse(tags) : []; } catch (e) { return []; }
    }

    function generateExportData(includeCourses, includeVideos, includeBooks, includeNotes, selectedNoteIds) {
        var exportData = {
            user: loadProfileName() || 'Anônimo',
            gender: getProfileGender() || '',
            timestamp: new Date().toISOString(),
            avatar: getUserAvatar() || null,
            matricula: getMatricula(),
            auditorioTime: localStorage.getItem(AUDITORIO_TIME_KEY) || '0',
            version: '2.1',
            data: {}
        };

        // ===== INCLUSÃO DA SENHA (HASH) PARA VERIFICAÇÃO NA IMPORTAÇÃO =====
        var passwordHash = localStorage.getItem(STORAGE_KEYS.PASSWORD) || null;
        exportData.password = passwordHash;

        // ===== CHECKSUM PARA VALIDAÇÃO DE INTEGRIDADE =====
        try {
            var tempJson = JSON.stringify(exportData);
            var hash = 0;
            for (var idx = 0; idx < tempJson.length; idx++) {
                hash = ((hash << 5) - hash) + tempJson.charCodeAt(idx);
                hash |= 0;
            }
            exportData.checksum = hash.toString(16);
        } catch (e) {
            console.warn('[Profile] Erro ao gerar checksum:', e);
        }

        if (includeCourses) {
            var courses = getAllCoursesProgress();
            exportData.data.courses = courses.map(function(c) {
                return {
                    id: c.id,
                    name: c.name,
                    stats: c.stats,
                    progressPercent: c.stats.progressPercent,
                    rawData: cleanObject(c.data, 15)
                };
            });
            exportData.data.totalStats = courses.reduce(function(acc, c) {
                acc.watchedVideos += c.stats.watchedVideos;
                acc.totalVideos += c.stats.totalVideos;
                acc.points += c.stats.points;
                return acc;
            }, { watchedVideos: 0, totalVideos: 0, points: 0 });
        }
        if (includeVideos) exportData.data.videos = getVideosProgress();
        if (includeBooks) exportData.data.booksRead = getBooksRead();
        if (includeNotes) {
            var allNotes = getNotes();
            exportData.data.notes = (selectedNoteIds && selectedNoteIds.length > 0) ?
                allNotes.filter(function(n) { return selectedNoteIds.indexOf(n.id) !== -1; }) : allNotes;
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

        // Verifica se há pelo menos um campo obrigatório
        const hasUser = !!data.user;
        const hasData = !!data.data && typeof data.data === 'object';
        const hasCourses = data.data && Array.isArray(data.data.courses);
        
        if (!hasUser && !hasData) {
            console.error('[Profile] Estrutura de dados não reconhecida.');
            throw new Error('Arquivo inválido: estrutura de dados não reconhecida.');
        }

        // Se não tiver data, tenta construir a partir dos dados antigos (fallback)
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
        var existing = document.getElementById('customPasswordModal');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'customPasswordModal';
        overlay.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;' +
            'background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;' +
            'z-index:9999;backdrop-filter:blur(8px);';
        var modal = document.createElement('div');
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

        var input = document.getElementById('passwordModalInput');
        var errorDiv = document.getElementById('passwordModalError');
        var confirmBtn = document.getElementById('passwordModalConfirm');
        var cancelBtn = document.getElementById('passwordModalCancel');
        var toggleBtn = document.getElementById('togglePasswordVisibility');
        var closeModal = function() { overlay.remove(); };

        toggleBtn.addEventListener('click', function() {
            var type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });

        confirmBtn.addEventListener('click', async function() {
            var password = input.value;
            if (!password) {
                errorDiv.textContent = t('profile_password_required');
                errorDiv.style.display = 'block';
                return;
            }
            try {
                var storedHash = localStorage.getItem(STORAGE_KEYS.PASSWORD);
                if (storedHash) {
                    var isValid = await verifyPassword(password, storedHash);
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
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') closeModal();
        });
        input.focus();
        return overlay;
    }

    // ========== EXPORTAÇÃO ==========
    async function handleExport() {
        var includeCourses = document.getElementById('exportCourses');
        var includeVideos = document.getElementById('exportVideos');
        var includeBooks = document.getElementById('exportBooks');
        var includeNotes = document.getElementById('exportNotes');

        if (!includeCourses || !includeVideos || !includeBooks || !includeNotes) {
            showToast('Erro ao carregar opções de exportação.', 'error');
            return;
        }

        var includeCoursesChecked = includeCourses.checked;
        var includeVideosChecked = includeVideos.checked;
        var includeBooksChecked = includeBooks.checked;
        var includeNotesChecked = includeNotes.checked;

        var selectedNoteIds = [];
        if (includeNotesChecked) {
            var checkboxes = document.querySelectorAll('#notesCheckboxes input[type="checkbox"]:checked');
            for (var i = 0; i < checkboxes.length; i++) {
                selectedNoteIds.push(checkboxes[i].value);
            }
        }
        var hasPassword = hasStoredPassword();

        var exportAction = async function(password) {
            try {
                var data = generateExportData(includeCoursesChecked, includeVideosChecked, includeBooksChecked, includeNotesChecked, selectedNoteIds);
                var finalData = data;
                var isEncrypted = false;
                if (password && password.length > 0) {
                    try {
                        var encrypted = await encryptData(data, password);
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
                var json = JSON.stringify(finalData, null, 2);
                var blob = new Blob([json], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                var suffix = isEncrypted ? '_criptografado' : '';
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
            createPasswordModal(t('profile_export_import'), t('profile_password'), async function(password) {
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

        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                console.log('[Import] Leitura do arquivo concluída. Tamanho:', e.target.result.length);
                var importedData = JSON.parse(e.target.result);
                console.log('[Import] JSON parseado com sucesso. Chaves:', Object.keys(importedData));

                // Validação inicial
                if (!importedData || typeof importedData !== 'object') {
                    throw new Error('Arquivo inválido: dados não encontrados.');
                }

                // Verifica checksum se presente
                if (importedData.checksum) {
                    try {
                        var tempJson = JSON.stringify(importedData);
                        var hash = 0;
                        for (var idx = 0; idx < tempJson.length; idx++) {
                            hash = ((hash << 5) - hash) + tempJson.charCodeAt(idx);
                            hash |= 0;
                        }
                        var computedChecksum = hash.toString(16);
                        if (computedChecksum !== importedData.checksum) {
                            console.warn('[Import] Checksum inválido. O arquivo pode estar corrompido.');
                            // Não interrompe a importação, apenas avisa
                        } else {
                            console.log('[Import] Checksum verificado com sucesso.');
                        }
                    } catch (e) {
                        console.warn('[Import] Erro ao verificar checksum:', e);
                    }
                }

                // === ARQUIVO CRIPTOGRAFADO ===
                if (importedData.encrypted === true) {
                    console.log('[Import] Arquivo criptografado detectado.');
                    createPasswordModal(t('profile_export_import'), t('profile_password'), async function(password) {
                        try {
                            console.log('[Import] Iniciando descriptografia...');
                            var decrypted = await decryptData(importedData.data, password);
                            console.log('[Import] Descriptografia bem-sucedida. Chaves:', Object.keys(decrypted));
                            // Valida a estrutura antes de aplicar
                            validateImportedData(decrypted);
                            await applyImportedData(decrypted);
                        } catch (err) {
                            console.error('[Import] Erro na descriptografia:', err);
                            showToast(t('profile_password_incorrect') || 'Senha incorreta ou arquivo corrompido.', 'error');
                        }
                    });
                    return;
                }

                // === ARQUIVO NÃO CRIPTOGRAFADO ===
                console.log('[Import] Arquivo não criptografado.');

                // Verifica se há campo de senha
                if (importedData.password) {
                    console.log('[Import] Arquivo com hash de senha detectado.');
                    createPasswordModal(t('profile_export_import'), t('profile_password'), async function(password) {
                        try {
                            console.log('[Import] Verificando senha...');
                            var match = await verifyPassword(password, importedData.password);
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

        reader.onerror = function() {
            console.error('[Import] Erro ao ler o arquivo.');
            showToast('Erro ao ler o arquivo. Tente novamente.', 'error');
        };

        reader.readAsText(file);
    }

    // ========== APLICAR DADOS IMPORTADOS ==========
    async function applyImportedData(importedData) {
        console.log('[Import] Aplicando dados importados...');

        // Verificação robusta
        if (!importedData) {
            showToast('Dados importados inválidos.', 'error');
            return;
        }

        // Se não houver data, tenta construir com dados antigos
        if (!importedData.data) {
            console.warn('[Import] Propriedade "data" ausente. Tentando adaptar...');
            if (Array.isArray(importedData.courses)) {
                importedData.data = { courses: importedData.courses };
            } else {
                showToast(t('profile_invalid_file'), 'error');
                return;
            }
        }

        var data = importedData.data;
        var importedCount = 0;

        // Confirmação do usuário
        if (!confirm(t('profile_import_confirm'))) return;

        try {
            // === DADOS DO PERFIL ===
            if (importedData.user) localStorage.setItem(STORAGE_KEYS.NAME, importedData.user);
            if (importedData.gender) localStorage.setItem(STORAGE_KEYS.GENDER, importedData.gender);
            if (importedData.avatar) {
                try {
                    localStorage.setItem(STORAGE_KEYS.AVATAR, importedData.avatar);
                    if (window.saveUserAvatar && typeof window.saveUserAvatar === 'function') {
                        window.saveUserAvatar(importedData.avatar);
                    }
                } catch (e) {
                    console.warn('[Import] Erro ao salvar avatar:', e);
                }
            }
            if (importedData.matricula) localStorage.setItem(STORAGE_KEYS.MATRICULA, importedData.matricula);
            if (importedData.auditorioTime) localStorage.setItem(AUDITORIO_TIME_KEY, importedData.auditorioTime);

            // === CURSOS ===
            if (data.courses && Array.isArray(data.courses)) {
                for (var course of data.courses) {
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

            // === OUTROS DADOS ===
            if (data.videos) localStorage.setItem('yt_video_progress', JSON.stringify(data.videos));
            if (data.booksRead) localStorage.setItem('ulivre_livros_lidos', JSON.stringify(data.booksRead));
            if (data.notes) localStorage.setItem('ulivre_notas_estudo', JSON.stringify(data.notes));
            if (data.tags) localStorage.setItem('ulivre_notas_tags', JSON.stringify(data.tags));

            // === ATUALIZAR INTERFACE ===
            showToast(t('profile_import_success', { count: importedCount }), 'success');
            if (window.updateProfileModal) window.updateProfileModal();
            if (window.updateProfileButton) window.updateProfileButton();
            if (window.loadAvatarToModal) window.loadAvatarToModal();

            // Recarregar a página se estiver na home, senão apenas atualiza os componentes
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                setTimeout(function() { location.reload(); }, 1000);
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
        var modalHeader = document.querySelector('.profile-modal-header h2');
        if (modalHeader) modalHeader.innerHTML = '<i class="fas fa-user-circle"></i> ' + t('profile_title');

        var avatarOverlay = document.querySelector('.avatar-overlay span');
        if (avatarOverlay) avatarOverlay.textContent = t('profile_change_photo');

        var nameLabel = document.querySelector('label[for="profileNameInput"]');
        if (nameLabel) nameLabel.innerHTML = '<i class="fas fa-user"></i> ' + t('profile_name');

        var nameInput = document.getElementById('profileNameInput');
        if (nameInput) nameInput.placeholder = t('profile_name_placeholder');

        var genderLabel = document.querySelector('label[for="profileGender"]');
        if (genderLabel) genderLabel.innerHTML = '<i class="fas fa-venus-mars"></i> ' + t('profile_gender');

        var passwordLabel = document.querySelector('label[for="profilePassword"]');
        if (passwordLabel) passwordLabel.innerHTML = '<i class="fas fa-lock"></i> ' + t('profile_password');

        var passwordInput = document.getElementById('profilePassword');
        if (passwordInput) passwordInput.placeholder = t('profile_password_placeholder');

        var saveNameBtn = document.getElementById('profileSaveNameBtn');
        if (saveNameBtn) saveNameBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save_name');

        var saveGenderBtn = document.getElementById('profileSaveGenderBtn');
        if (saveGenderBtn) saveGenderBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');

        var savePasswordBtn = document.getElementById('profileSavePasswordBtn');
        if (savePasswordBtn) savePasswordBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');

        var genderSelect = document.getElementById('profileGender');
        if (genderSelect) {
            var options = genderSelect.querySelectorAll('option');
            var genderMap = {
                '': t('profile_gender_not_informed'),
                'masculino': t('profile_gender_masculine'),
                'feminino': t('profile_gender_feminine'),
                'outro': t('profile_gender_other')
            };
            for (var i = 0; i < options.length; i++) {
                var opt = options[i];
                if (genderMap[opt.value] !== undefined) opt.textContent = genderMap[opt.value];
            }
        }

        var statItems = document.querySelectorAll('.profile-stats .stat-item');
        if (statItems.length >= 6) {
            var texts = [
                t('profile_watched_videos'),
                t('profile_total_videos'),
                t('profile_completed_lessons'),
                t('profile_completed_disciplines'),
                t('profile_total_points'),
                t('profile_auditorio_hours')
            ];
            for (var j = 0; j < statItems.length && j < texts.length; j++) {
                var labelSpan = statItems[j].querySelector('span:first-child');
                if (labelSpan) labelSpan.textContent = texts[j];
            }
        }

        var exportItems = [
            { id: 'exportCourses', key: 'profile_export_courses' },
            { id: 'exportVideos', key: 'profile_export_videos' },
            { id: 'exportBooks', key: 'profile_export_books' },
            { id: 'exportNotes', key: 'profile_export_notes' }
        ];
        for (var k = 0; k < exportItems.length; k++) {
            var item = exportItems[k];
            var input = document.getElementById(item.id);
            if (input) {
                var label = input.closest('label');
                if (label) {
                    var icon = label.querySelector('i');
                    if (icon) {
                        var inputClone = input.cloneNode(true);
                        label.innerHTML = '';
                        label.appendChild(inputClone);
                        label.appendChild(document.createTextNode(' '));
                        var iconClone = icon.cloneNode(true);
                        label.appendChild(iconClone);
                        label.appendChild(document.createTextNode(' ' + t(item.key)));
                    } else {
                        label.textContent = t(item.key);
                    }
                }
            }
        }

        var coursesTitle = document.querySelector('#profileCoursesList h4');
        if (coursesTitle) coursesTitle.innerHTML = '<i class="fas fa-graduation-cap"></i> ' + t('profile_saved_courses');

        var exportTitle = document.querySelector('.profile-modal-body hr + h4');
        if (exportTitle) exportTitle.innerHTML = '<i class="fas fa-file-export"></i> ' + t('profile_export_import');

        var selectNotesLabel = document.querySelector('#notesSelectionContainer p');
        if (selectNotesLabel) selectNotesLabel.textContent = t('profile_select_notes');

        var exportBtn = document.getElementById('generateExportBtn');
        if (exportBtn) exportBtn.innerHTML = '<i class="fas fa-file-export"></i> ' + t('profile_save_progress');

        var importBtn = document.getElementById('importProgressBtn');
        if (importBtn) importBtn.innerHTML = '<i class="fas fa-file-import"></i> ' + t('profile_import_progress');

        var profileNote = document.querySelector('.profile-note');
        if (profileNote) profileNote.innerHTML = '<i class="fas fa-database"></i> ' + t('profile_data_note');

        var matriculaLabel = document.querySelector('.profile-matricula span:first-child');
        if (matriculaLabel) matriculaLabel.textContent = t('profile_matricula');

        var ongoingBadges = document.querySelectorAll('.profile-course-item .progress-badge.ongoing');
        for (var m = 0; m < ongoingBadges.length; m++) {
            ongoingBadges[m].textContent = t('profile_in_progress');
        }
        var completedBadges = document.querySelectorAll('.profile-course-item .progress-badge.completed');
        for (var n = 0; n < completedBadges.length; n++) {
            completedBadges[n].textContent = t('profile_completed');
        }

        var ongoingText = document.querySelector('.ongoing-courses-summary span');
        if (ongoingText) {
            var ongoingCount = document.querySelectorAll('.profile-course-item .progress-badge.ongoing').length;
            if (ongoingCount > 0) {
                ongoingText.innerHTML = '<strong>' + ongoingCount + '</strong> ' + t('profile_in_progress').toLowerCase();
            }
        }
    }

    // ========== UI DO MODAL ==========
    function updateProfileModal() {
        if (!translationsLoaded && Object.keys(translations).length === 0) {
            loadTranslations(currentLang).then(function() { _updateProfileModal(); });
        } else {
            _updateProfileModal();
        }
    }

    function _updateProfileModal() {
        var allCourses = getAllCoursesProgress();
        var totalStats = { watchedVideos: 0, totalVideos: 0, completedLessons: 0, completedDisciplines: 0, points: 0 };
        var ongoingCount = 0;

        var nameInput = document.getElementById('profileNameInput');
        if (nameInput) {
            nameInput.value = loadProfileName();
            nameInput.placeholder = t('profile_name_placeholder');
        }

        var genderSelect = document.getElementById('profileGender');
        if (genderSelect) genderSelect.value = getProfileGender();

        var passwordInput = document.getElementById('profilePassword');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.placeholder = t('profile_password_placeholder');
            showPasswordSavedIndicator(hasStoredPassword());
        }
        if (passwordInput) {
            passwordInput.removeEventListener('input', updatePasswordStrengthIndicator);
            passwordInput.addEventListener('input', updatePasswordStrengthIndicator);
            if (passwordInput.value.length > 0) updatePasswordStrengthIndicator.call(passwordInput);
        }

        var matricula = getMatricula();
        var avatarSection = document.querySelector('.profile-avatar-section');
        if (avatarSection) {
            avatarSection.style.display = 'flex';
            avatarSection.style.flexDirection = 'column';
            avatarSection.style.alignItems = 'center';
            var oldMatricula = avatarSection.querySelector('.profile-matricula');
            if (oldMatricula) oldMatricula.remove();
            var matriculaEl = document.createElement('div');
            matriculaEl.className = 'profile-matricula';
            matriculaEl.style.cssText =
                'text-align:center;margin-top:0.3rem;font-size:0.7rem;' +
                'color:var(--text-tertiary);font-family:monospace;letter-spacing:0.3px;' +
                'border-top:1px solid var(--border-light);padding-top:0.3rem;padding-bottom:0.1rem;width:100%;';
            matriculaEl.innerHTML = '<span style="color:var(--text-secondary);font-weight:500;">' + t('profile_matricula') + '</span> <span style="font-weight:600;color:var(--text-secondary);margin-left:0.3rem;">' + matricula + '</span>';
            avatarSection.appendChild(matriculaEl);
        }

        var listContainer = document.getElementById('profileCoursesList');
        var listHtml = '<h4 style="margin:0.5rem 0;color:var(--text-secondary);"><i class="fas fa-graduation-cap"></i> ' + t('profile_saved_courses') + '</h4>';
        if (allCourses.length === 0) {
            listHtml += '<p style="color:var(--text-tertiary);font-size:0.9rem;">' + t('profile_no_courses') + '</p>';
        } else {
            for (var i = 0; i < allCourses.length; i++) {
                var course = allCourses[i];
                var stats = course.stats;
                var isOngoing = stats.progressPercent > 0 && stats.progressPercent < 100;
                var isCompleted = stats.progressPercent >= 100;
                var badge = '';
                if (isOngoing) { badge = '<span class="progress-badge ongoing">' + t('profile_in_progress') + '</span>'; ongoingCount++; }
                else if (isCompleted) badge = '<span class="progress-badge completed">' + t('profile_completed') + '</span>';
                totalStats.watchedVideos += stats.watchedVideos;
                totalStats.totalVideos += stats.totalVideos;
                totalStats.completedLessons += stats.completedLessons;
                totalStats.completedDisciplines += stats.completedDisciplines;
                totalStats.points += stats.points;
                var iconClass = course.id === 'computacao' ? 'laptop-code' : (course.id === 'matematica' ? 'square-root-alt' : 'book');
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
        if (listContainer) listContainer.innerHTML = listHtml;

        var ongoingContainer = document.getElementById('ongoingCoursesContainer');
        if (ongoingContainer) {
            if (ongoingCount > 0) {
                ongoingContainer.innerHTML = '<div class="ongoing-courses-summary"><i class="fas fa-play-circle"></i> <span><strong>' + ongoingCount + '</strong> ' + t('profile_in_progress').toLowerCase() + '</span></div>';
            } else {
                ongoingContainer.innerHTML = '';
            }
        }

        document.getElementById('profileWatchedVideos').textContent = totalStats.watchedVideos;
        document.getElementById('profileTotalVideos').textContent = totalStats.totalVideos;
        document.getElementById('profileCompletedLessons').textContent = totalStats.completedLessons;
        document.getElementById('profileCompletedDisciplines').textContent = totalStats.completedDisciplines;
        document.getElementById('profileTotalPoints').textContent = totalStats.points;

        updateAuditorioTimeDisplay();
        loadAvatarToModal();
        updateNotesCheckboxes();
        updateProfileTranslations();
    }

    // ========== ESCAPE HTML ==========
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========== INDICADOR DE FORÇA DA SENHA ==========
    function updatePasswordStrengthIndicator() {
        var input = document.getElementById('profilePassword');
        if (!input) return;
        var password = input.value;
        var container = input.closest('.profile-user-section');
        if (!container) return;
        var oldIndicator = container.querySelector('.password-strength-indicator');
        if (oldIndicator) oldIndicator.remove();
        if (password.length === 0) return;
        var strength = checkPasswordStrength(password);
        var feedback = getPasswordFeedback(strength.checks);
        var indicator = document.createElement('div');
        indicator.className = 'password-strength-indicator';
        indicator.style.cssText = 'margin-top:0.5rem;width:100%;background:var(--bg-tertiary);border-radius:8px;padding:0.6rem 1rem;border:1px solid var(--border);';
        var barContainer = document.createElement('div');
        barContainer.style.cssText = 'width:100%;height:6px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;margin-bottom:0.3rem;';
        var bar = document.createElement('div');
        var percent = (strength.passed / strength.total) * 100;
        bar.style.cssText = 'width:' + percent + '%;height:100%;background:' + strength.color + ';transition:width 0.3s;border-radius:4px;';
        barContainer.appendChild(bar);
        indicator.appendChild(barContainer);
        var textRow = document.createElement('div');
        textRow.style.cssText = 'display:flex;justify-content:space-between;color:var(--text-secondary);font-size:0.8rem;';
        var strengthText = document.createElement('span');
        strengthText.textContent = 'Força: ' + strength.strength;
        strengthText.style.color = strength.color;
        strengthText.style.fontWeight = '600';
        textRow.appendChild(strengthText);
        var reqsText = document.createElement('span');
        reqsText.textContent = strength.passed + '/' + strength.total + ' requisitos';
        textRow.appendChild(reqsText);
        indicator.appendChild(textRow);
        if (feedback.length > 0) {
            var feedbackDiv = document.createElement('div');
            feedbackDiv.style.cssText = 'margin-top:0.3rem;font-size:0.75rem;color:var(--text-tertiary);';
            feedbackDiv.textContent = 'Falta: ' + feedback.join(', ');
            indicator.appendChild(feedbackDiv);
        }
        container.appendChild(indicator);
    }

    function updateNotesCheckboxes() {
        var container = document.getElementById('notesCheckboxes');
        if (!container) return;
        var notes = getNotes();
        if (notes.length === 0) {
            container.innerHTML = '<p style="color:var(--text-tertiary);">' + t('profile_no_notes') + '</p>';
            return;
        }
        var html = '';
        for (var i = 0; i < notes.length; i++) {
            var note = notes[i];
            html += '<label style="display:block;margin:0.2rem 0;"><input type="checkbox" class="note-select" value="' + note.id + '" checked> ' + escapeHtml(note.titulo || 'Sem título') + '</label>';
        }
        container.innerHTML = html;
    }

    // ========== ABRIR/FECHAR MODAL ==========
    function openProfileModal() {
        console.log('[Profile] openProfileModal chamado');
        var modal = document.getElementById('profileModal');
        if (!modal) {
            console.warn('[Profile] Modal #profileModal não encontrado no DOM');
            return;
        }
        if (translationsLoaded && Object.keys(translations).length > 0) {
            _updateProfileModal();
            modal.classList.add('show');
            modal.style.display = 'flex';
            console.log('[Profile] Modal aberto com sucesso');
        } else {
            loadTranslations(currentLang).then(function() {
                _updateProfileModal();
                modal.classList.add('show');
                modal.style.display = 'flex';
                console.log('[Profile] Modal aberto com sucesso (após carregar traduções)');
            });
        }
    }

    function closeProfileModal() {
        var modal = document.getElementById('profileModal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
        console.log('[Profile] Modal fechado');
    }

    // ========== INICIALIZAÇÃO ==========
    let imageBasePath = null;
    let _initialized = false;

    async function initProfileSystem() {
        if (_initialized) {
            console.log('[Profile] Sistema já inicializado.');
            return;
        }
        _initialized = true;

        console.log('[Profile] initProfileSystem iniciado');
        var savedLang = localStorage.getItem('selectedLanguage') || (navigator.language && navigator.language.startsWith('pt') ? 'pt-br' : 'en');
        currentLang = savedLang;
        await loadTranslations(currentLang);

        await detectImageBasePath();

        // ===== ATUALIZAR BOTÃO DE PERFIL =====
        var profileBtn = document.getElementById('profileBtn');
        console.log('[Profile] Botão #profileBtn encontrado?', !!profileBtn);

        if (profileBtn) {
            // Remove listeners antigos para evitar duplicação
            profileBtn.removeEventListener('click', openProfileModal);
            profileBtn.addEventListener('click', openProfileModal);
            console.log('[Profile] Listener de clique adicionado ao botão #profileBtn');
            // Atualiza imediatamente a aparência do botão
            setTimeout(updateProfileButton, 50);
            setTimeout(updateProfileButton, 300);
        } else {
            console.warn('[Profile] Botão #profileBtn NÃO encontrado. Verifique o HTML.');
        }

        // ===== AVATAR WRAPPER =====
        var avatarWrapper = document.getElementById('avatarWrapper');
        console.log('[Profile] #avatarWrapper encontrado?', !!avatarWrapper);
        if (avatarWrapper) {
            // Remove listeners antigos
            avatarWrapper.removeEventListener('click', showAvatarSelector);
            avatarWrapper.addEventListener('click', function(e) {
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
        var closeBtn = document.getElementById('closeProfileModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeProfileModal);
        }

        // ===== MODAL DE PERFIL =====
        var modal = document.getElementById('profileModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeProfileModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.style.display === 'flex') closeProfileModal();
            });
        }

        // ===== BOTÕES DE SALVAR =====
        var saveNameBtn = document.getElementById('profileSaveNameBtn');
        if (saveNameBtn) {
            saveNameBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save_name');
            saveNameBtn.addEventListener('click', function() {
                var name = document.getElementById('profileNameInput').value.trim();
                if (!name) { showToast(t('profile_name_required'), 'error'); return; }
                saveProfileName(name);
            });
        }

        var saveGenderBtn = document.getElementById('profileSaveGenderBtn');
        if (saveGenderBtn) {
            saveGenderBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');
            saveGenderBtn.addEventListener('click', function() {
                var gender = document.getElementById('profileGender').value;
                saveProfileGender(gender);
            });
        }

        var savePasswordBtn = document.getElementById('profileSavePasswordBtn');
        if (savePasswordBtn) {
            savePasswordBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');
            savePasswordBtn.addEventListener('click', async function() {
                var password = document.getElementById('profilePassword').value;
                var saved = await saveProfilePassword(password);
                if (saved) {
                    document.getElementById('profilePassword').value = '';
                    showPasswordSavedIndicator(true);
                }
            });
        }

        // ===== EXPORTAÇÃO E IMPORTAÇÃO =====
        var exportBtn = document.getElementById('generateExportBtn');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-file-export"></i> ' + t('profile_save_progress');
            exportBtn.addEventListener('click', handleExport);
        }

        var importBtn = document.getElementById('importProgressBtn');
        if (importBtn) {
            importBtn.innerHTML = '<i class="fas fa-file-import"></i> ' + t('profile_import_progress');
            importBtn.addEventListener('click', function() {
                var importInput = document.getElementById('importFileInput');
                if (importInput) importInput.click();
            });
        }

        var importInput = document.getElementById('importFileInput');
        if (importInput) {
            importInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    handleImport(e.target.files[0]);
                }
                e.target.value = '';
            });
        }

        // ===== AVATAR INICIAL =====
        if (!getUserAvatar()) {
            setDefaultAvatar();
        }

        // ===== CARREGAR DADOS NO MODAL =====
        loadAvatarToModal();
        var nameInputField = document.getElementById('profileNameInput');
        if (nameInputField) {
            nameInputField.value = loadProfileName();
            nameInputField.placeholder = t('profile_name_placeholder');
        }
        var genderSelectField = document.getElementById('profileGender');
        if (genderSelectField) {
            genderSelectField.value = getProfileGender();
        }
        var passwordInputField = document.getElementById('profilePassword');
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
    window.t = t;
    window.getCurrentLanguage = function() { return currentLang; };
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
            document.addEventListener('DOMContentLoaded', function() {
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
    window.addEventListener('auditorioTimeUpdated', function(e) {
        var seconds = e.detail.seconds;
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        var formatted = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min';
        var el = document.getElementById('profileAuditorioTime');
        if (el) el.textContent = formatted;
    });

    window.addEventListener('storage', function(e) {
        if (e.key === AUDITORIO_TIME_KEY) {
            var el = document.getElementById('profileAuditorioTime');
            if (el && document.getElementById('profileModal').style.display === 'flex') {
                var seconds = parseInt(e.newValue || '0', 10);
                var hours = Math.floor(seconds / 3600);
                var minutes = Math.floor((seconds % 3600) / 60);
                el.textContent = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min';
            }
        }
    });

    // ========== REAGIR A MUDANÇAS DE IDIOMA ==========
    window.addEventListener('languageChanged', async function(e) {
        var lang = e.detail.lang || 'pt-br';
        if (lang !== currentLang) {
            currentLang = lang;
            await loadTranslations(lang);
        }
        updateProfileButton();
        var modal = document.getElementById('profileModal');
        if (modal && modal.style.display === 'flex') {
            updateProfileTranslations();
            _updateProfileModal();
        }
    });

})();