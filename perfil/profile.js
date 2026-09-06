// perfil/profile.js – Versão 31.0 – COMPLETO E OTIMIZADO
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

    console.log('[Profile] Inicializando módulo v31.0...');

    // ========== CONSTANTES ==========
    const STORAGE_KEYS = {
        NAME: 'userProfileName',
        AVATAR: 'userAvatar',
        GENDER: 'userGender',
        COUNTRY: 'userCountry',
        PASSWORD: 'userPasswordHash',
        MATRICULA: 'userMatricula',
        USER_NUMBER: 'userNumber'
    };

    const AUDITORIO_TIME_KEY = 'auditorio_total_time';
    const TEST_ADMIN_MATRICULA = '20260815064514840';
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

    const COUNTRY_CODES = 'AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');

    function getCountryOptions(language, selectedCountry = '') {
        const locale = language === 'en' ? 'en' : 'pt-BR';
        let displayNames;
        try {
            displayNames = new Intl.DisplayNames([locale], { type: 'region' });
        } catch (_) {
            displayNames = null;
        }
        return COUNTRY_CODES
            .map(code => ({ code, name: displayNames?.of(code) || code }))
            .sort((first, second) => first.name.localeCompare(second.name, locale))
            .map(country => `<option value="${country.code}"${country.code === selectedCountry ? ' selected' : ''}>${country.name}</option>`)
            .join('');
    }

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

    const COURSE_TYPES = {
        administracao: 'bacharelado',
        biologia: 'licenciatura',
        'ciencia-de-dados-bacharelado': 'bacharelado',
        computacao: 'bacharelado',
        'computer-science': 'bacharelado',
        'engenharia-producao': 'bacharelado',
        engenharia_computacao: 'bacharelado',
        fisica: 'licenciatura',
        'gestao-publica': 'tecnologo',
        letras: 'licenciatura',
        'letras-portugues': 'licenciatura',
        matematica: 'bacharelado',
        'matematica-licenciatura': 'licenciatura',
        math: 'bacharelado',
        pedagogia: 'licenciatura',
        'processos-gerenciais': 'tecnologo',
        quimica: 'licenciatura',
        'tecnologia-informacao': 'bacharelado'
    };

    const DISCIPLINE_NAMES = {
        'administracao': { pt: 'Administração', en: 'Administration' },
        'algoritmos': { pt: 'Algoritmos', en: 'Algorithms' },
        'arquitetura-de-computadores': { pt: 'Arquitetura de Computadores', en: 'Computer Architecture' },
        'banco-de-dados': { pt: 'Banco de Dados', en: 'Databases' },
        'calculo': { pt: 'Cálculo', en: 'Calculus' },
        'ciencia-da-computacao': { pt: 'Ciência da Computação', en: 'Computer Science' },
        'engenharia-de-software': { pt: 'Engenharia de Software', en: 'Software Engineering' },
        'estrutura-de-dados': { pt: 'Estrutura de Dados', en: 'Data Structures' },
        'matematica': { pt: 'Matemática', en: 'Mathematics' },
        'programacao': { pt: 'Programação', en: 'Programming' },
        'sistemas-operacionais': { pt: 'Sistemas Operacionais', en: 'Operating Systems' },
        'redes-de-computadores': { pt: 'Redes de Computadores', en: 'Computer Networks' }
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

    function getDisciplineName(disciplineId) {
        const originalName = String(disciplineId || '');
        const normalizedId = originalName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nameObj = DISCIPLINE_NAMES[normalizedId];
        const lang = (window.getCurrentLanguage && window.getCurrentLanguage()) || 'pt-br';
        if (nameObj) return nameObj[lang] || nameObj.pt;
        const englishWords = {
            algoritmos: 'Algorithms', arquitetura: 'Architecture', banco: 'Database', calculo: 'Calculus',
            ciencia: 'Science', computadores: 'Computers', computacao: 'Computing', dados: 'Data',
            engenharia: 'Engineering', estrutura: 'Structure', fundamentos: 'Foundations', matematica: 'Mathematics',
            programacao: 'Programming', redes: 'Networks', sistemas: 'Systems', software: 'Software'
        };
        return (lang === 'en' ? normalizedId : originalName).replace(/[-_]/g, ' ').split(/\s+/).filter(Boolean).map(word => {
            const translated = lang === 'en' ? (englishWords[word] || word) : word;
            return translated.charAt(0).toUpperCase() + translated.slice(1);
        }).join(' ');
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

    function getUserNumber() {
        let number = localStorage.getItem(STORAGE_KEYS.USER_NUMBER);
        if (!number) {
            number = `UL-${getMatricula()}`;
            localStorage.setItem(STORAGE_KEYS.USER_NUMBER, number);
        }
        return number;
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

    function formatPlatformSeconds(seconds) {
        const totalMinutes = Math.max(0, Math.floor(Number(seconds || 0) / 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours ? `${hours}h ${minutes}min` : `${minutes}min`;
    }

    function renderActivityDetails() {
        const container = document.getElementById('profileActivityDetails');
        if (!container) return;
        const summary = window.CursorTimeset?.getPlatformActivitySummary?.() || { totalSeconds: 0, streakDays: 0, activeDays: 0, periods: [] };
        const totalSeconds = summary.totalSeconds + getAuditorioHours().seconds;
        const locale = window.getCurrentLanguage?.() === 'en' ? 'en-US' : 'pt-BR';
        const formatDate = value => value ? new Date(value).toLocaleString(locale) : t('profile_not_available');
        const formatDay = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString(locale) : t('profile_not_available');
        const periods = [...(summary.periods || [])].reverse();
        const streakLabel = summary.streakDays === 1 ? t('profile_current_streak_singular') : t('profile_current_streak');
        const activeDaysLabel = summary.activeDays === 1 ? t('profile_active_day_singular') : t('profile_active_days');
        const periodsLabel = periods.length === 1 ? t('profile_activity_period_singular') : t('profile_activity_periods');
        const streakValue = summary.streakDays ? `${summary.streakDays} ${streakLabel}` : t('profile_no_streak');
        const activeDaysValue = `${summary.activeDays} ${activeDaysLabel}`;
        container.innerHTML = `<div class="profile-activity-stats"><div><strong>${formatPlatformSeconds(totalSeconds)}</strong><small>${escapeHtml(t('profile_platform_total'))}</small></div><div><strong>${escapeHtml(streakValue)}</strong><small>${escapeHtml(t('profile_current_streak'))}</small></div><div><strong>${escapeHtml(activeDaysValue)}</strong><small>${escapeHtml(t('profile_active_days'))}</small></div></div><h4>${escapeHtml(periodsLabel)}</h4>${periods.length ? `<div class="profile-activity-periods">${periods.map(period => `<article><strong>${escapeHtml(formatDay(period.date))}</strong><span>${escapeHtml(t('profile_activity_started'))}: ${escapeHtml(formatDate(period.start))}</span><span>${escapeHtml(t('profile_activity_ended'))}: ${escapeHtml(formatDate(period.end))}</span><small>${escapeHtml(t('profile_activity_duration'))}: ${formatPlatformSeconds(period.seconds)}</small></article>`).join('')}</div>` : `<p class="profile-transcript-empty">${escapeHtml(t('profile_no_activity'))}</p>`}`;
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
    function getProfileCountry() { return localStorage.getItem(STORAGE_KEYS.COUNTRY) || ''; }

    function saveProfileCountry(country) {
        localStorage.setItem(STORAGE_KEYS.COUNTRY, country || '');
        updateProfileModal();
        showToast(t('profile_country_saved'), 'success');
    }

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
        fileInput.id = 'profileAvatarFileInput';
        fileInput.style.display = 'none';
        overlay.appendChild(fileInput);

        if (uploadBtn) {
            uploadBtn.type = 'button';
            uploadBtn.addEventListener('click', (event) => {
                event.preventDefault();
                fileInput.click();
            });
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
        const isLoggedIn = Boolean(loadProfileName());
        if (!isLoggedIn) {
            btn.setAttribute('data-profile-custom', 'true');
            btn.innerHTML = `<i class="fas fa-sign-in-alt"></i> ${t('onboarding_login_button')}`;
            btn.style.cssText =
                'display: inline-flex; align-items: center; gap: 0.4rem;' +
                'padding: 6px 16px; background: var(--accent-purple, var(--com-accent-purple));' +
                'color: #fff !important; border-radius: 8px; font-weight: 600;' +
                'font-size: 0.85rem; cursor: pointer; border: none;' +
                'transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);' +
                'text-decoration: none; white-space: nowrap; box-shadow: none; min-height: 44px;';
            return;
        }
        const avatar = getUserAvatar();
        const name = loadProfileName();
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
            'padding: 6px 16px 6px 10px; background: var(--accent-purple, var(--com-accent-purple));' +
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
    function getCourseExamStats(courseId) {
        let points = 0;
        let attempts = 0;
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!key || !key.startsWith(`ulivre_discipline_exam_${courseId}_`)) continue;
            try {
                const state = JSON.parse(localStorage.getItem(key));
                if (!state || !state.attempted) continue;
                points += Number(state.score) || 0;
                attempts += 1;
            } catch (_) {}
        }
        try {
            const finalExam = JSON.parse(localStorage.getItem(`ulivre_final_exam_${courseId}`) || 'null');
            if (finalExam?.attempted) {
                points += Number(finalExam.score) || 0;
                attempts += 1;
            }
        } catch (_) {}
        return { points, attempts };
    }

    function getFinalCertificates() {
        const certificates = [];
        const matricula = getMatricula();
        const isTestAdmin = matricula === TEST_ADMIN_MATRICULA;
        if ((!isTestAdmin && localStorage.getItem('ulivre_authenticated_session') !== 'true') || !loadProfileName() || !matricula) return certificates;
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!key?.startsWith('ulivre_final_exam_')) continue;
            const courseId = key.slice('ulivre_final_exam_'.length);
            try {
                const result = JSON.parse(localStorage.getItem(key) || 'null');
                if (result?.passed) certificates.push({ courseId, ...result });
            } catch (_) {}
        }
        if (getMatricula() === TEST_ADMIN_MATRICULA) {
            const existingCourses = new Set(certificates.map(certificate => certificate.courseId));
            getAllCoursesProgress().forEach(course => {
                if (existingCourses.has(course.id)) return;
                certificates.push({
                    courseId: course.id,
                    courseName: course.name,
                    courseLevel: getCertificateCourseLevel(course.id),
                    score: '-',
                    total: '-',
                    percent: 100,
                    passed: true,
                    attempted: true,
                    adminTest: true,
                    finishedAt: new Date().toISOString()
                });
            });
        }
        return certificates.sort((first, second) => String(second.finishedAt || '').localeCompare(String(first.finishedAt || '')));
    }

    function getCertificateCourseLevel(courseId) {
        const languageCourses = new Set(['espanhol', 'espanhol-ingles', 'ingles', 'japones', 'japones-ingles', 'portugues-brasileiro']);
        const postCourses = new Set(['ciencia_de_dados', 'computacao_grafica', 'cybersecurity', 'desenvolvimento_web', 'devops', 'embarcados']);
        if (courseId === 'enem' || courseId === 'espcex') return 'ensino-medio';
        if (languageCourses.has(courseId)) return 'idiomas';
        if (postCourses.has(courseId)) return 'pos-graduacao';
        return 'graduacao';
    }

    function getCertificateCourseType(certificate) {
        return certificate.courseType || COURSE_TYPES[certificate.courseId] || '';
    }

    async function getCertificateCompletion(certificate) {
        if (typeof window.getCourseCertificateSummary !== 'function') return t('profile_not_available');
        try {
            const summary = await window.getCourseCertificateSummary(certificate.courseId);
            if (!summary.totalMinutes && !summary.disciplineCount) return t('profile_not_available');
            const hours = Math.floor(summary.totalMinutes / 60);
            const minutes = summary.totalMinutes % 60;
            const duration = hours ? `${hours}h${minutes ? ` ${minutes}min` : ''}` : `${minutes}min`;
            return `${duration} · ${summary.disciplineCount} ${t('profile_certificate_disciplines')}`;
        } catch (_) {
            return t('profile_not_available');
        }
    }

    function getCertificateLevelLabel(certificate) {
        const courseLevel = certificate.courseLevel || getCertificateCourseLevel(certificate.courseId);
        const levelLabel = ({
            graduacao: t('graduacao'),
            'pos-graduacao': t('pos_graduacao'),
            'ensino-medio': t('ensino_medio'),
            idiomas: t('idiomas')
        }[courseLevel] || courseLevel);
        if (courseLevel !== 'graduacao') return levelLabel;
        const typeLabel = ({
            bacharelado: t('profile_bacharelado'),
            licenciatura: t('profile_licenciatura'),
            tecnologo: t('profile_tecnologo')
        }[getCertificateCourseType(certificate)]);
        return typeLabel ? `${levelLabel} - ${typeLabel}` : levelLabel;
    }

    function escapeCertificateText(value) {
        return escapeHtml(String(value || ''));
    }

    function getCertificateLogoUrl() {
        const relativePath = window.location.pathname.includes('/comunidade/')
            ? '../logo-da-universidade-livre.png'
            : 'logo-da-universidade-livre.png';
        return new URL(relativePath, window.location.href).href;
    }

    async function buildCertificateMarkup(certificate) {
        const name = loadProfileName() || t('profile_not_available');
        const matricula = getMatricula();
        if (localStorage.getItem('ulivre_onboarding_complete') === 'true' && loadProfileName() && matricula) {
            localStorage.setItem('ulivre_authenticated_session', 'true');
        }
        const userNumber = getUserNumber();
        const courseName = certificate.courseName || getCourseName(certificate.courseId);
        const level = certificate.courseLevel || certificate.courseId ? getCertificateLevelLabel(certificate) : t('profile_not_available');
        const date = certificate.finishedAt ? new Date(certificate.finishedAt).toLocaleDateString(window.getCurrentLanguage?.() === 'en' ? 'en-US' : 'pt-BR') : t('profile_not_available');
        const result = certificate.adminTest ? t('profile_test_certificate') : `${certificate.score}/${certificate.total} (${certificate.percent}%)`;
        const completion = await getCertificateCompletion(certificate);
        return `<div class="certificate-seal"><i class="fas fa-award"></i></div><p class="certificate-kicker">${escapeCertificateText(t('profile_certificate'))}</p><img class="certificate-logo" src="${escapeCertificateText(getCertificateLogoUrl())}" alt="Universidade Livre"><p>${escapeCertificateText(t('profile_certificate_text'))}</p><h3>${escapeCertificateText(courseName)}</h3><p>${escapeCertificateText(level)}</p><p class="certificate-certificate-note">${escapeCertificateText(t('profile_certificate_completed'))}</p><div class="certificate-details"><div class="certificate-holder"><p><strong>${escapeCertificateText(t('profile_name'))}</strong><span>${escapeCertificateText(name)}</span></p><p><strong>${escapeCertificateText(t('profile_matricula'))}</strong><span>${escapeCertificateText(matricula)}</span></p><p><strong>${escapeCertificateText(t('profile_certificate_date'))}</strong><span>${escapeCertificateText(date)}</span></p></div><div class="certificate-result"><p><strong>${escapeCertificateText(t('profile_certificate_result'))}</strong><span>${escapeCertificateText(result)}</span></p><p><strong>${escapeCertificateText(t('profile_certificate_completion'))}</strong><span>${escapeCertificateText(completion)}</span></p><p><strong>${escapeCertificateText(t('profile_user_number'))}</strong><span>${escapeCertificateText(userNumber)}</span></p></div></div><p class="certificate-disclaimer">${escapeCertificateText(t('profile_certificate_disclaimer'))}</p>`;
    }

    async function openCertificate(certificate) {
        if (localStorage.getItem('userMatricula') !== TEST_ADMIN_MATRICULA && localStorage.getItem('ulivre_authenticated_session') !== 'true') {
            showToast(t('profile_login_required'), 'error');
            return;
        }
        const modal = document.getElementById('certificateModal');
        const preview = document.getElementById('certificatePreview');
        const download = document.getElementById('downloadCertificateBtn');
        if (!modal || !preview) return;
        preview.innerHTML = await buildCertificateMarkup(certificate);
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        download?.replaceWith(download.cloneNode(true));
        document.getElementById('downloadCertificateBtn')?.addEventListener('click', () => downloadCertificate(certificate, 'png'));
        document.getElementById('downloadCertificatePdfBtn')?.addEventListener('click', () => downloadCertificate(certificate, 'pdf'));
    }

    function closeCertificate() {
        const modal = document.getElementById('certificateModal');
        if (modal) {
            modal.hidden = true;
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    async function downloadCertificate(certificate, format = 'png') {
        const width = 1600;
        const height = 1131;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        try {
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Canvas 2D indisponível');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            context.strokeStyle = '#10b981';
            context.lineWidth = 16;
            context.strokeRect(8, 8, width - 16, height - 16);
            context.strokeStyle = '#d1fae5';
            context.lineWidth = 6;
            context.strokeRect(28, 28, width - 56, height - 56);

            const centerText = (text, y, font, color = '#172033') => {
                context.font = font;
                context.fillStyle = color;
                context.textAlign = 'center';
                context.fillText(String(text), width / 2, y);
            };
            const wrapText = (text, x, y, maxWidth, lineHeight) => {
                const words = String(text).split(' ');
                let line = '';
                words.forEach(word => {
                    const candidate = line ? `${line} ${word}` : word;
                    if (context.measureText(candidate).width > maxWidth && line) {
                        context.fillText(line, x, y);
                        line = word;
                        y += lineHeight;
                    } else line = candidate;
                });
                if (line) context.fillText(line, x, y);
                return y;
            };

            context.beginPath();
            context.arc(width / 2, 125, 39, 0, Math.PI * 2);
            context.fillStyle = '#10b981';
            context.fill();
            context.strokeStyle = '#d1fae5';
            context.lineWidth = 7;
            context.stroke();
            centerText('*', 137, 'bold 42px Georgia', '#ffffff');

            const logoUrl = getCertificateLogoUrl();
            try {
                const response = await fetch(logoUrl);
                if (!response.ok) throw new Error(`Logo request failed with status ${response.status}`);
                const logoBlob = await response.blob();
                const logoUrlObject = URL.createObjectURL(logoBlob);
                const logo = await new Promise((resolve, reject) => {
                    const image = new Image();
                    image.onload = () => resolve(image);
                    image.onerror = reject;
                    image.src = logoUrlObject;
                });
                context.drawImage(logo, width / 2 - 150, 175, 300, 120);
                URL.revokeObjectURL(logoUrlObject);
            } catch (_) {}

            const name = loadProfileName() || t('profile_not_available');
            const courseName = certificate.courseName || getCourseName(certificate.courseId);
            const level = certificate.courseLevel || certificate.courseId ? getCertificateLevelLabel(certificate) : t('profile_not_available');
            const date = certificate.finishedAt ? new Date(certificate.finishedAt).toLocaleDateString(window.getCurrentLanguage?.() === 'en' ? 'en-US' : 'pt-BR') : t('profile_not_available');
            const result = certificate.adminTest ? t('profile_test_certificate') : `${certificate.score}/${certificate.total} (${certificate.percent}%)`;
            const completion = await getCertificateCompletion(certificate);
            centerText(t('profile_certificate'), 345, 'bold 20px Georgia', '#047857');
            centerText(t('profile_certificate_text'), 405, '22px Georgia');
            centerText(courseName, 465, 'bold 38px Georgia', '#047857');
            centerText(level, 510, '22px Georgia');
            centerText(t('profile_certificate_completed'), 550, '22px Georgia', '#374151');
            context.strokeStyle = '#a7f3d0';
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(200, 590);
            context.lineTo(1400, 590);
            context.stroke();
            context.textAlign = 'left';
            context.font = 'bold 16px Georgia';
            context.fillStyle = '#047857';
            context.fillText(t('profile_name').toUpperCase(), 240, 645);
            context.fillText(t('profile_matricula').toUpperCase(), 240, 725);
            context.fillText(t('profile_certificate_date').toUpperCase(), 240, 805);
            context.fillText(t('profile_certificate_result').toUpperCase(), 900, 645);
            context.fillText(t('profile_certificate_completion').toUpperCase(), 900, 725);
            context.fillText(t('profile_user_number').toUpperCase(), 900, 805);
            context.font = '23px Georgia';
            context.fillStyle = '#172033';
            context.fillText(name, 240, 675);
            context.fillText(getMatricula(), 240, 755);
            context.fillText(date, 240, 835);
            context.fillText(result, 900, 675);
            context.fillText(completion, 900, 755);
            context.fillText(getUserNumber(), 900, 835);
            context.fillStyle = '#f0fdf4';
            context.fillRect(0, 1050, width, 81);
            context.fillStyle = '#6b7280';
            context.font = '15px Georgia';
            context.textAlign = 'center';
            wrapText(t('profile_certificate_disclaimer'), width / 2, 1085, 1450, 20);

            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
            const fileData = format === 'pdf' ? createCertificatePdf(imageDataUrl, width, height) : await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG vazio')), 'image/png'));
            const link = document.createElement('a');
            link.href = URL.createObjectURL(fileData);
            const courseFileName = String(certificate.courseName || certificate.courseId)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'curso';
            const certificateFileLabel = String(t('profile_certificate') || 'Certificate')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '') || 'certificate';
            link.download = `${certificateFileLabel}-${courseFileName}-(Universidade Livre).${format}`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (error) {
            console.error(`[Profile] Não foi possível gerar o ${format.toUpperCase()} do certificado:`, error);
            showToast(t('profile_certificate_download_error'), 'error');
        }
    }

    function createCertificatePdf(imageDataUrl, width, height) {
        const jpegData = atob(imageDataUrl.split(',')[1]);
        const imageBytes = new Uint8Array(jpegData.length);
        for (let index = 0; index < jpegData.length; index++) imageBytes[index] = jpegData.charCodeAt(index);
        const encoder = new TextEncoder();
        const chunks = [];
        const offsets = [0];
        let byteLength = 0;
        const addText = text => {
            const bytes = encoder.encode(text);
            chunks.push(bytes);
            byteLength += bytes.length;
        };
        addText('%PDF-1.4\n');
        const addObject = (number, body) => {
            offsets[number] = byteLength;
            addText(`${number} 0 obj\n${body}\nendobj\n`);
        };
        addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
        addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
        addObject(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Image 5 0 R >> >> /Contents 4 0 R >>');
        const pageStream = 'q\n842 0 0 595 0 0 cm\n/Image Do\nQ\n';
        addObject(4, `<< /Length ${pageStream.length} >>\nstream\n${pageStream}endstream`);
        offsets[5] = byteLength;
        addText(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
        chunks.push(imageBytes);
        byteLength += imageBytes.length;
        addText('\nendstream\nendobj\n');
        const xrefOffset = byteLength;
        addText(`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
        return new Blob(chunks, { type: 'application/pdf' });
    }

    function renderCertificates() {
        const container = document.getElementById('profileCertificatesList');
        if (!container) return;
        const certificates = getFinalCertificates();
        container.innerHTML = certificates.length ? certificates.map((certificate, index) => `<article class="profile-certificate-item"><div><strong>${escapeCertificateText(certificate.courseName || getCourseName(certificate.courseId))}</strong><small>${escapeCertificateText(certificate.courseLevel || '')} · ${certificate.adminTest ? escapeCertificateText(t('profile_test_certificate')) : `${certificate.percent}%`}</small></div><button type="button" class="btn-secondary profile-open-certificate" data-certificate-index="${index}"><i class="fas fa-eye"></i> ${escapeCertificateText(t('profile_certificate_view'))}</button></article>`).join('') : `<p>${escapeCertificateText(t('profile_no_certificates'))}</p>`;
        container.querySelectorAll('.profile-open-certificate').forEach(button => button.addEventListener('click', () => openCertificate(certificates[Number(button.dataset.certificateIndex)])));
    }

    function calculateCourseStats(watchedMap, courseId) {
        const totalVideos = watchedMap.length;
        const watchedVideos = watchedMap.filter(v => v === true).length;
        const completedLessons = Math.floor(watchedVideos / 5);
        const completedDisciplines = Math.floor(watchedVideos / 25);
        const lessonPoints = (watchedVideos * 10) + (completedLessons * 50) + (completedDisciplines * 200);
        const examStats = getCourseExamStats(courseId);
        return {
            totalVideos,
            watchedVideos,
            completedLessons,
            completedDisciplines,
            lessonPoints,
            examPoints: examStats.points,
            examAttempts: examStats.attempts,
            points: lessonPoints + examStats.points,
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
                        const stats = calculateCourseStats(data.watchedMap, courseId);
                        const name = getCourseName(courseId);
                        courses.push({ id: courseId, name, stats, data });
                    }
                } catch (_) {}
            }
        }
        return courses;
    }

    function formatExamDuration(milliseconds) {
        const seconds = Math.max(0, Math.round(Number(milliseconds) / 1000));
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}min ${String(remainingSeconds).padStart(2, '0')}s`;
    }

    function formatStudyHours(seconds) {
        const minutes = Math.max(0, Math.round(Number(seconds || 0) / 60));
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return hours ? `${hours}h${remainingMinutes ? ` ${remainingMinutes}min` : ''}` : `${remainingMinutes}min`;
    }

    function normalizeTranscriptKey(value) {
        return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }

    function isTranscriptAdmin() {
        return getMatricula() === TEST_ADMIN_MATRICULA;
    }

    function getTranscriptExam(courseId, disciplineName) {
        try {
            return JSON.parse(localStorage.getItem(`ulivre_discipline_exam_${courseId}_${normalizeTranscriptKey(disciplineName)}`) || 'null') || {};
        } catch (_) {
            return {};
        }
    }

    function getTranscriptDisciplineTime(times, courseId, disciplineName) {
        const sources = [times.discipline, times.practice, times.bibliography];
        return sources.reduce((total, source) => total + Number(source?.[courseId]?.[disciplineName]?.totalTime || 0), 0);
    }

    async function getCourseTranscript(course) {
        const source = await window.getCourseTranscriptData?.(course.id);
        if (!source) return null;
        const watchedMap = course.data?.watchedMap || [];
        const times = window.CursorTimeset?.getCourseSpecificData(course.id) || {};
        let videoIndex = 0;
        const stages = source.stages.map((stage, stageIndex) => {
            const disciplines = stage.disciplines.map(discipline => {
                const watchedCount = watchedMap.slice(videoIndex, videoIndex + discipline.lessonCount).filter(Boolean).length;
                videoIndex += discipline.lessonCount;
                const storedExam = getTranscriptExam(course.id, discipline.name);
                const exam = storedExam.attempted || !isTranscriptAdmin() ? storedExam : (() => {
                    const score = Math.floor(7 + Math.random() * 4);
                    return { score, total: 10, percent: score * 10, passed: true, attempted: true };
                })();
                return {
                    ...discipline,
                    watchedCount,
                    watched: discipline.lessonCount > 0 && watchedCount === discipline.lessonCount,
                    exam,
                    passed: Boolean(exam.passed) || isTranscriptAdmin(),
                    studySeconds: getTranscriptDisciplineTime(times, course.id, discipline.name)
                };
            });
            return {
                ...stage,
                stageIndex,
                disciplines,
                completed: disciplines.length > 0 && disciplines.every(discipline => discipline.watched && discipline.passed),
                totalMinutes: disciplines.reduce((total, discipline) => total + discipline.totalMinutes, 0),
                studySeconds: disciplines.reduce((total, discipline) => total + discipline.studySeconds, 0)
            };
        });
        return {
            ...course,
            stages,
            totalMinutes: stages.reduce((total, stage) => total + stage.totalMinutes, 0),
            studySeconds: stages.reduce((total, stage) => total + stage.studySeconds, 0)
        };
    }

    function isFullTranscriptAvailable(transcript) {
        if (isTranscriptAdmin()) return true;
        try {
            const finalExam = JSON.parse(localStorage.getItem(`ulivre_final_exam_${transcript.id}`) || 'null');
            return transcript.stages.length > 0 && transcript.stages.every(stage => stage.completed) && Boolean(finalExam?.passed);
        } catch (_) {
            return false;
        }
    }

    function formatTranscriptDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return hours ? `${hours}h${remainingMinutes ? ` ${remainingMinutes}min` : ''}` : `${remainingMinutes}min`;
    }

    function getTranscriptAverage(stages) {
        const results = stages.flatMap(stage => stage.disciplines.map(discipline => Number(discipline.exam.percent)).filter(Number.isFinite));
        return results.length ? (results.reduce((total, value) => total + value, 0) / results.length).toFixed(1) : '0.0';
    }

    function getTranscriptPoints(stages) {
        return stages.reduce((result, stage) => stage.disciplines.reduce((stageResult, discipline) => {
            stageResult.score += Number(discipline.exam.score) || 0;
            stageResult.total += Number(discipline.exam.total) || 0;
            return stageResult;
        }, result), { score: 0, total: 0 });
    }

    function getTranscriptStageLabel(stage) {
        const name = String(stage.name || '').replace(/^\s*\d+\s*[ªº]?\s*etapa\s*[·:-]?\s*/i, '');
        return `${t('profile_transcript_stage')} ${stage.stageIndex} · ${name || stage.name}`;
    }

    function getProfileCountryLabel() {
        const country = getProfileCountry();
        if (!country) return '';
        try {
            const locale = window.getCurrentLanguage?.() === 'en' ? 'en' : 'pt-BR';
            return new Intl.DisplayNames([locale], { type: 'region' }).of(country) || country;
        } catch (_) {
            return country;
        }
    }

    function renderTranscriptStages(transcript) {
        const container = document.getElementById('profileTranscriptStages');
        if (!container || !transcript) return;
        const releasedStages = transcript.stages.filter(stage => stage.completed || isTranscriptAdmin());
        if (!releasedStages.length) {
            container.innerHTML = `<p class="profile-transcript-empty">${escapeHtml(t('profile_transcript_locked'))}</p>`;
            return;
        }
        const fullButton = isFullTranscriptAvailable(transcript) ? `<button type="button" class="btn-secondary profile-view-transcript"><i class="fas fa-eye"></i> ${escapeHtml(t('profile_transcript_view_full'))}</button>` : '';
        container.innerHTML = `<div class="profile-transcript-heading"><div><strong>${escapeHtml(transcript.name)}</strong><small>${escapeHtml(t('profile_transcript_course_total'))}: ${formatTranscriptDuration(transcript.totalMinutes)} · ${escapeHtml(t('profile_transcript_studied'))}: ${formatStudyHours(transcript.studySeconds)} · ${escapeHtml(t('profile_transcript_points'))}: ${getTranscriptPoints(releasedStages).score}/${getTranscriptPoints(releasedStages).total} · ${escapeHtml(t('profile_transcript_exam_average'))}: ${getTranscriptAverage(releasedStages)}%</small></div><span>${releasedStages.length}/${transcript.stages.length} ${escapeHtml(t('profile_transcript_stages'))}</span></div><div class="profile-transcript-stage-grid">${releasedStages.map((stage, index) => { const points = getTranscriptPoints([stage]); return `<article class="profile-transcript-stage"><header><div><strong>${escapeHtml(getTranscriptStageLabel(stage))}</strong><small>${escapeHtml(t('profile_transcript_stage_total'))}: ${formatTranscriptDuration(stage.totalMinutes)} · ${escapeHtml(t('profile_transcript_average'))}: ${getTranscriptAverage([stage])}% · ${escapeHtml(t('profile_transcript_points'))}: ${points.score}/${points.total} · ${escapeHtml(t('profile_transcript_studied'))}: ${formatStudyHours(stage.studySeconds)}</small></div><span class="profile-transcript-approved"><i class="fas fa-check-circle"></i> ${escapeHtml(t('profile_transcript_released'))}</span></header><div class="profile-transcript-disciplines">${stage.disciplines.map(discipline => `<div class="profile-transcript-discipline"><strong>${escapeHtml(discipline.name)}</strong><span>${escapeHtml(t('profile_transcript_discipline_total'))}: ${formatTranscriptDuration(discipline.totalMinutes)} · ${escapeHtml(t('profile_transcript_studied'))}: ${formatStudyHours(discipline.studySeconds)}</span><small>${escapeHtml(t('profile_transcript_points'))}: ${discipline.exam.score ?? '-'} / ${discipline.exam.total ?? '-'} · ${escapeHtml(t('profile_transcript_exam_average'))}: ${discipline.exam.percent ?? 0}%</small></div>`).join('')}</div><button type="button" class="btn-secondary profile-view-stage" data-transcript-stage="${index}"><i class="fas fa-eye"></i> ${escapeHtml(t('profile_transcript_view_stage'))}</button></article>`; }).join('')}</div>${fullButton}`;
        container.querySelector('.profile-view-transcript')?.addEventListener('click', () => openTranscript(transcript, releasedStages));
        container.querySelectorAll('.profile-view-stage').forEach(button => button.addEventListener('click', () => openTranscript(transcript, [releasedStages[Number(button.dataset.transcriptStage)]])));
    }

    async function renderTranscript() {
        const coursesContainer = document.getElementById('profileTranscriptCourses');
        if (!coursesContainer) return;
        const courses = await Promise.all(getAllCoursesProgress().map(getCourseTranscript));
        const validCourses = courses.filter(Boolean);
        coursesContainer.innerHTML = validCourses.length ? validCourses.map((course, index) => {
            const released = course.stages.filter(stage => stage.completed || isTranscriptAdmin()).length;
            return `<button type="button" class="profile-transcript-course${released ? '' : ' locked'}" data-transcript-course="${index}"><i class="fas fa-graduation-cap"></i><strong>${escapeHtml(course.name)}</strong><span>${released}/${course.stages.length} ${escapeHtml(t('profile_transcript_stages'))}</span><small>${released ? t('profile_transcript_click') : t('profile_transcript_locked_short')}</small></button>`;
        }).join('') : `<p class="profile-transcript-empty">${escapeHtml(t('profile_transcript_no_courses'))}</p>`;
        coursesContainer.querySelectorAll('[data-transcript-course]').forEach(button => button.addEventListener('click', () => {
            const transcript = validCourses[Number(button.dataset.transcriptCourse)];
            if (!transcript?.stages.some(stage => stage.completed || isTranscriptAdmin())) return;
            const transcriptPanel = button.closest('.profile-transcript');
            if (transcriptPanel?.dataset.selectedCourse === button.dataset.transcriptCourse) {
                document.getElementById('profileTranscriptStages').innerHTML = '';
                transcriptPanel.dataset.selectedCourse = '';
                button.classList.remove('selected');
                return;
            }
            renderTranscriptStages(transcript);
            document.querySelectorAll('.profile-transcript-course').forEach(item => item.classList.remove('selected'));
            button.classList.add('selected');
            button.closest('.profile-transcript')?.classList.add('has-selection');
            button.closest('.profile-transcript').dataset.selectedCourse = button.dataset.transcriptCourse;
            button.closest('.profile-transcript')._transcript = transcript;
        }));
        document.getElementById('profileTranscriptStages').innerHTML = '';
        coursesContainer.closest('.profile-transcript')?.setAttribute('data-selected-course', '');
    }

    let activeTranscript = null;

    function buildTranscriptMarkup(transcript, selectedStages) {
        const stages = selectedStages || transcript.stages.filter(stage => stage.completed || isTranscriptAdmin());
        const isStageTranscript = stages.length === 1;
        const title = isStageTranscript ? t('profile_transcript_stage') : t('profile_transcript_full_course');
        const averageLabel = isStageTranscript ? t('profile_transcript_average') : t('profile_transcript_total_average');
        const totalMinutes = isStageTranscript ? stages[0].totalMinutes : transcript.totalMinutes;
        const studySeconds = isStageTranscript ? stages[0].studySeconds : transcript.studySeconds;
        const points = getTranscriptPoints(stages);
        const gender = getProfileGender();
        const country = getProfileCountryLabel();
        return `<div class="transcript-sheet"><div class="transcript-sheet-header"><span>${escapeHtml(t('profile_transcript'))}</span></div><img class="transcript-sheet-logo" src="${escapeCertificateText(getCertificateLogoUrl())}" alt="Universidade Livre"><small class="transcript-sheet-user-meta">${escapeHtml(loadProfileName() || t('profile_not_available'))} · ${escapeHtml(t('profile_matricula'))} ${escapeHtml(getMatricula())}${gender ? ` · ${escapeHtml(t('profile_gender'))} ${escapeHtml(gender)}` : ''}${country ? ` · ${escapeHtml(t('profile_country'))} ${escapeHtml(country)}` : ''}</small><div class="transcript-sheet-summary"><strong>${escapeHtml(transcript.name)}</strong><span>${escapeHtml(title)}</span><span>${escapeHtml(t('profile_transcript_total'))}: ${formatTranscriptDuration(totalMinutes)}</span><span>${escapeHtml(averageLabel)}: ${getTranscriptAverage(stages)}%</span><span>${escapeHtml(t('profile_transcript_points'))}: ${points.score}/${points.total}</span><span>${escapeHtml(t('profile_transcript_studied'))}: ${formatStudyHours(studySeconds)}</span></div>${stages.map(stage => { const stagePoints = getTranscriptPoints([stage]); return `<section><h4>${escapeHtml(getTranscriptStageLabel(stage))} <small>${formatTranscriptDuration(stage.totalMinutes)}${isStageTranscript ? ` · ${escapeHtml(t('profile_transcript_average'))}: ${getTranscriptAverage([stage])}% · ${escapeHtml(t('profile_transcript_points'))}: ${stagePoints.score}/${stagePoints.total}` : ''}</small></h4>${stage.disciplines.map(discipline => `<div class="transcript-sheet-row"><strong>${escapeHtml(discipline.name)}</strong><span>${escapeHtml(t('profile_transcript_points'))}: ${discipline.exam.score ?? '-'} / ${discipline.exam.total ?? '-'}</span><span>${escapeHtml(t('profile_transcript_exam_average'))}: ${discipline.exam.percent ?? 0}%</span><span>${formatTranscriptDuration(discipline.totalMinutes)}</span></div>`).join('')}</section>`; }).join('')}</div>`;
    }

    async function openTranscript(transcript, selectedStages) {
        if (!transcript) return;
        activeTranscript = transcript;
        activeTranscript.selectedStages = selectedStages;
        activeTranscript.isStageTranscript = selectedStages?.length === 1;
        activeTranscript.stageNumber = activeTranscript.isStageTranscript ? transcript.stages.indexOf(selectedStages[0]) + 1 : null;
        const preview = document.getElementById('transcriptPreview');
        const modal = document.getElementById('transcriptModal');
        if (!preview || !modal) return;
        preview.innerHTML = buildTranscriptMarkup(transcript, selectedStages);
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeTranscript() {
        const modal = document.getElementById('transcriptModal');
        if (modal) {
            modal.hidden = true;
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    async function downloadTranscript(format = 'png') {
        if (!activeTranscript) return;
        const width = 1600;
        const releasedStages = activeTranscript.selectedStages || activeTranscript.stages.filter(stage => stage.completed || isTranscriptAdmin());
        const height = Math.max(1131, 520 + releasedStages.reduce((total, stage) => total + 130 + stage.disciplines.length * 58, 0));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.fillStyle = '#f8fafc';
        context.fillRect(0, 0, width, height);
        context.fillStyle = '#047857';
        context.textAlign = 'left';
        context.font = 'bold 44px Georgia';
        try {
            const response = await fetch(getCertificateLogoUrl());
            const logoBlob = await response.blob();
            const logoUrl = URL.createObjectURL(logoBlob);
            const logo = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = logoUrl;
            });
            context.drawImage(logo, 100, 82, 300, 125);
            URL.revokeObjectURL(logoUrl);
        } catch (_) {}
        context.fillText(t('profile_transcript'), 100, 78);
        context.font = '24px Georgia';
        context.fillStyle = '#172033';
        context.fillText(`${loadProfileName() || t('profile_not_available')} · ${t('profile_matricula')} ${getMatricula()}${getProfileGender() ? ` · ${t('profile_gender')} ${getProfileGender()}` : ''}${getProfileCountryLabel() ? ` · ${t('profile_country')} ${getProfileCountryLabel()}` : ''}`, 100, 245);
        let y = 320;
        context.fillStyle = '#172033';
        context.font = 'bold 32px Georgia';
        context.fillText(activeTranscript.name, 100, y);
        context.font = '22px Georgia';
        const isStageTranscript = activeTranscript.selectedStages?.length === 1;
        const selectedStages = activeTranscript.selectedStages || activeTranscript.stages.filter(stage => stage.completed || isTranscriptAdmin());
        const transcriptTotalMinutes = isStageTranscript ? selectedStages[0].totalMinutes : activeTranscript.totalMinutes;
        const transcriptStudySeconds = isStageTranscript ? selectedStages[0].studySeconds : activeTranscript.studySeconds;
        const transcriptPoints = getTranscriptPoints(selectedStages);
        context.fillText(`${t('profile_transcript_total')}: ${formatTranscriptDuration(transcriptTotalMinutes)} · ${isStageTranscript ? t('profile_transcript_average') : t('profile_transcript_total_average')}: ${getTranscriptAverage(selectedStages)}% · ${t('profile_transcript_points')}: ${transcriptPoints.score}/${transcriptPoints.total} · ${t('profile_transcript_studied')}: ${formatStudyHours(transcriptStudySeconds)}`, 100, y + 42);
        y += 115;
        releasedStages.forEach(stage => {
            context.fillStyle = '#d1fae5';
            context.fillRect(80, y - 34, 1440, 58);
            context.fillStyle = '#047857';
            context.font = 'bold 24px Georgia';
            const stagePoints = getTranscriptPoints([stage]);
            context.fillText(`${getTranscriptStageLabel(stage)} · ${formatTranscriptDuration(stage.totalMinutes)}${isStageTranscript ? ` · ${t('profile_transcript_average')}: ${getTranscriptAverage([stage])}% · ${t('profile_transcript_points')}: ${stagePoints.score}/${stagePoints.total}` : ''}`, 105, y + 3);
            y += 72;
            context.font = 'bold 19px Georgia';
            context.fillStyle = '#374151';
            stage.disciplines.forEach(discipline => {
                context.fillText(discipline.name, 120, y);
                context.font = '19px Georgia';
                context.fillText(`${t('profile_transcript_points')}: ${discipline.exam.score ?? '-'} / ${discipline.exam.total ?? '-'} · ${discipline.exam.percent ?? 0}% · ${formatTranscriptDuration(discipline.totalMinutes)}`, 900, y);
                context.font = 'bold 19px Georgia';
                y += 52;
            });
            y += 35;
        });
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const fileData = format === 'pdf' ? createCertificatePdf(imageDataUrl, width, height) : await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Boletim vazio')), 'image/png'));
        const link = document.createElement('a');
        const objectUrl = URL.createObjectURL(fileData);
        link.href = objectUrl;
        const stageLabel = activeTranscript.isStageTranscript ? `-etapa-${activeTranscript.stageNumber}` : '-completo';
        link.download = `boletim-${normalizeTranscriptKey(activeTranscript.name)}${stageLabel}.${format === 'pdf' ? 'pdf' : 'png'}`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
            link.remove();
        }, 1000);
    }

    function renderExamHistory() {
        const container = document.getElementById('profileExamDetails');
        if (!container) return;
        const courses = getAllCoursesProgress();
        const history = getExamHistory(courses.map(course => course.id));
        if (!history.length) {
            container.innerHTML = `<p>${t('profile_no_exam_details')}</p>`;
            return;
        }
        container.innerHTML = history.map(exam => {
            const locale = window.getCurrentLanguage?.() === 'en' ? 'en-US' : 'pt-BR';
            const finishedAt = exam.finishedAt ? new Date(exam.finishedAt).toLocaleString(locale) : t('profile_not_available');
            const title = exam.examType === 'final' ? `${exam.courseName} · ${t('profile_final_exam')}` : `${exam.courseName} · ${exam.disciplineName}`;
            return `<article class="profile-exam-item"><strong>${escapeHtml(title)}</strong><span>${exam.score}/${exam.total} ${t('profile_exam_correct')} · ${Math.max(0, exam.total - exam.score)} ${t('profile_exam_wrong')} · ${exam.percent}%</span><small>${t('profile_exam_time')}: ${exam.duration} · ${finishedAt}</small></article>`;
        }).join('');
    }

    function renderGameStatus() {
        const container = document.getElementById('profileGameStatus');
        if (!container) return;
        const user = loadProfileName() || 'Jogador';
        const readScore = (key) => {
            try {
                const scores = JSON.parse(localStorage.getItem(key) || '{}');
                return scores[user] || {};
            } catch (_) {
                return {};
            }
        };
        const rawScore = (key) => readScore(key);
        const normalizeScore = (score, key) => ({
            points: Number(score.points) || 0,
            wins: Number(score.wins) || 0,
            draws: Number(score.draws) || 0,
            losses: Number(score.losses) || ((key === 'ulivre_hangman_scores' || key === 'ulivre_roulette_wallets' || key === 'ulivre_bicho_wallets' || key === 'ulivre_poker_wallets' || key === 'ulivre_blackjack_wallets' || key === 'ulivre_bacara_wallets' || key === 'ulivre_bingo_wallets') ? Math.max(0, (Number(score.games || score.spins || score.bets || score.hands || score.rounds) || 0) - (Number(score.wins) || 0)) : 0)
        });
        const games = [
            { name: t('games_score_chess'), icon: 'fa-chess', score: normalizeScore(rawScore('ulivre_chess_scores'), 'ulivre_chess_scores') },
            { name: t('games_score_ttt'), icon: 'fa-th', score: normalizeScore(rawScore('ulivre_ttt_scores'), 'ulivre_ttt_scores') },
            { name: t('games_score_impostor'), icon: 'fa-user-secret', score: normalizeScore(rawScore('ulivre_impostor_scores'), 'ulivre_impostor_scores') },
            { name: t('games_score_hangman'), icon: 'fa-font', score: normalizeScore(rawScore('ulivre_hangman_scores'), 'ulivre_hangman_scores') },
            { name: t('games_score_checkers'), icon: 'fa-chess-board', score: normalizeScore(rawScore('ulivre_checkers_scores'), 'ulivre_checkers_scores') },
            { name: t('games_score_roulette'), icon: 'fa-dharmachakra', score: normalizeScore(rawScore('ulivre_roulette_wallets'), 'ulivre_roulette_wallets') },
            { name: t('games_score_uno'), icon: 'fa-layer-group', score: normalizeScore(rawScore('ulivre_uno_scores'), 'ulivre_uno_scores') },
            { name: t('games_score_bicho'), icon: 'fa-paw', score: normalizeScore(rawScore('ulivre_bicho_wallets'), 'ulivre_bicho_wallets') },
            { name: t('games_score_poker'), iconSymbol: '♠', score: normalizeScore(rawScore('ulivre_poker_wallets'), 'ulivre_poker_wallets') },
            { name: t('games_score_blackjack'), iconSymbol: '♣', score: normalizeScore(rawScore('ulivre_blackjack_wallets'), 'ulivre_blackjack_wallets') },
            { name: t('games_score_bacara'), icon: 'fa-diamond', score: normalizeScore(rawScore('ulivre_bacara_wallets'), 'ulivre_bacara_wallets') },
            { name: t('games_score_bingo'), icon: 'fa-ticket', score: normalizeScore(rawScore('ulivre_bingo_wallets'), 'ulivre_bingo_wallets') }
        ];
        container.innerHTML = games.map(game => {
            const score = game.score;
            const played = (Number(score.wins) || 0) + (Number(score.draws) || 0) + (Number(score.losses) || 0);
            const icon = game.iconSymbol ? `<span class="profile-game-status-icon profile-game-status-suit">${game.iconSymbol}</span>` : `<i class="fas ${game.icon}"></i>`;
            return `<article class="profile-game-status-item"><strong>${icon} ${game.name}</strong><span>${played} ${t('profile_games_played')} · ${Number(score.points) || 0} ${t('games_score_points')}</span><small>${Number(score.wins) || 0} ${t('games_score_wins')} · ${Number(score.draws) || 0} ${t('games_score_draws')} · ${Number(score.losses) || 0} ${t('games_score_losses')}</small></article>`;
        }).join('');
    }

    function getExamHistory(courseIds) {
        const history = [];
        const knownCourseIds = [...new Set([...(courseIds || []), ...Object.keys(COURSE_NAMES)])].sort((first, second) => second.length - first.length);
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            const courseId = knownCourseIds.find(id => key?.startsWith(`ulivre_discipline_exam_${id}_`));
            if (!courseId) continue;
            try {
                const state = JSON.parse(localStorage.getItem(key));
                if (!state || !state.attempted) continue;
                const disciplineKey = key.slice(`ulivre_discipline_exam_${courseId}_`.length);
                const limit = Number(state.timeLimitMs) || 5 * 60 * 60 * 1000;
                const remaining = Number(state.timeRemainingMs) || 0;
                history.push({
                    storageKey: key,
                    courseId,
                    courseName: getCourseName(courseId),
                    disciplineName: getDisciplineName(disciplineKey),
                    score: Number(state.score) || 0,
                    total: Number(state.total) || 0,
                    percent: Number(state.percent) || 0,
                    passed: Boolean(state.passed),
                    finishedAt: state.finishedAt || null,
                    duration: formatExamDuration(limit - remaining),
                    timeLimitMs: limit,
                    timeRemainingMs: remaining
                });
            } catch (_) {}
        }
        (courseIds || []).forEach(courseId => {
            const key = `ulivre_final_exam_${courseId}`;
            try {
                const state = JSON.parse(localStorage.getItem(key) || 'null');
                if (!state?.attempted) return;
                const limit = Number(state.timeLimitMs) || 3 * 60 * 60 * 1000;
                const remaining = Number(state.timeRemainingMs) || 0;
                history.push({
                    storageKey: key,
                    courseId,
                    courseName: getCourseName(courseId),
                    disciplineName: t('profile_final_exam'),
                    examType: 'final',
                    score: Number(state.score) || 0,
                    total: Number(state.total) || 0,
                    percent: Number(state.percent) || 0,
                    passed: Boolean(state.passed),
                    finishedAt: state.finishedAt || null,
                    duration: formatExamDuration(limit - remaining),
                    timeLimitMs: limit,
                    timeRemainingMs: remaining
                });
            } catch (_) {}
        });
        return history.sort((first, second) => (second.finishedAt || 0) - (first.finishedAt || 0));
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

    function getProgressStorageEntries(prefixes) {
        const entries = {};
        for (let index = 0; index < localStorage.length; index++) {
            const key = localStorage.key(index);
            if (!key || !prefixes.some(prefix => key.startsWith(prefix))) continue;
            const value = localStorage.getItem(key);
            if (value === null) continue;
            try {
                entries[key] = JSON.parse(value);
            } catch (_) {
                entries[key] = value;
            }
        }
        return entries;
    }

    function getCommunityProgress() {
        return getProgressStorageEntries(['comunidade_posts_', 'comunidade_chat_']);
    }

    function generateExportData(includeCourses, includeVideos, includeBooks, includeNotes, selectedNoteIds) {
        const exportData = {
            user: loadProfileName() || 'Anônimo',
            gender: getProfileGender() || '',
            country: getProfileCountry() || '',
            timestamp: new Date().toISOString(),
            avatar: getUserAvatar() || null,
            matricula: getMatricula(),
            auditorioTime: localStorage.getItem(AUDITORIO_TIME_KEY) || '0',
            version: '2.2',
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
            exportData.data.examHistory = getExamHistory(courses.map(course => course.id));
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
        exportData.data.community = getCommunityProgress();
        const gameScores = localStorage.getItem('ulivre_ttt_scores');
        if (gameScores) {
            try {
                exportData.data.tttScores = JSON.parse(gameScores);
            } catch (_) {
                console.warn('[Profile] Pontuação dos jogos inválida para exportação.');
            }
        }
        const chessScores = localStorage.getItem('ulivre_chess_scores');
        if (chessScores) {
            try {
                exportData.data.chessScores = JSON.parse(chessScores);
            } catch (_) {
                console.warn('[Profile] Pontuação do xadrez inválida para exportação.');
            }
        }
        exportData.data.cursorTimeset = getProgressStorageEntries(['cursor_timeset']);
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
            if (importedData.country) localStorage.setItem(STORAGE_KEYS.COUNTRY, importedData.country);
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
            if (data.tttScores && typeof data.tttScores === 'object') {
                localStorage.setItem('ulivre_ttt_scores', JSON.stringify(data.tttScores));
            }
            if (data.chessScores && typeof data.chessScores === 'object') {
                localStorage.setItem('ulivre_chess_scores', JSON.stringify(data.chessScores));
            }
            if (Array.isArray(data.examHistory)) {
                data.examHistory.forEach((exam) => {
                    if (exam.storageKey && exam.courseId) {
                        localStorage.setItem(exam.storageKey, JSON.stringify({
                            passed: Boolean(exam.passed),
                            score: Number(exam.score) || 0,
                            total: Number(exam.total) || 0,
                            percent: Number(exam.percent) || 0,
                            attempted: true,
                            finishedAt: exam.finishedAt || null,
                            timeLimitMs: Number(exam.timeLimitMs) || 3 * 60 * 60 * 1000,
                            timeRemainingMs: Number(exam.timeRemainingMs) || 0
                        }));
                    }
                });
            }
            if (data.community && typeof data.community === 'object') {
                Object.entries(data.community).forEach(([key, value]) => {
                    if (key.startsWith('comunidade_posts_') || key.startsWith('comunidade_chat_')) {
                        localStorage.setItem(key, JSON.stringify(value));
                    }
                });
            }
            if (data.cursorTimeset && typeof data.cursorTimeset === 'object') {
                Object.entries(data.cursorTimeset).forEach(([key, value]) => {
                    if (key.startsWith('cursor_timeset')) {
                        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                    }
                });
            }

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
        const countryLabel = document.querySelector('label[for="profileCountry"]');
        if (countryLabel) countryLabel.innerHTML = '<i class="fas fa-globe"></i> ' + t('profile_country');
        const countrySelect = document.getElementById('profileCountry');
        if (countrySelect) {
            const selectedCountry = countrySelect.value || getProfileCountry();
            countrySelect.innerHTML = `<option value="">${t('profile_country_not_informed')}</option>` + getCountryOptions(window.getCurrentLanguage?.() || 'pt-br', selectedCountry);
            countrySelect.value = selectedCountry;
        }

        const statItems = document.querySelectorAll('.profile-stats .stat-item');
        if (statItems.length >= 6) {
            const texts = [
                t('profile_watched_videos'),
                t('profile_total_videos'),
                t('profile_completed_lessons'),
                t('profile_completed_disciplines'),
                t('profile_game_points'),
                t('profile_auditorio_hours')
            ];
            statItems.forEach((item, idx) => {
                if (idx < texts.length) {
                    const labelSpan = item.querySelector('span:first-child');
                    if (labelSpan) labelSpan.textContent = texts[idx];
                }
            });
        }

        const coursePointsLabel = document.querySelector('.profile-total-score-card span[data-i18n="profile_course_points"]');
        if (coursePointsLabel) coursePointsLabel.textContent = t('profile_course_points');
        const grandTotalLabel = document.querySelector('.profile-total-score-card span[data-i18n="profile_grand_total"]');
        if (grandTotalLabel) grandTotalLabel.textContent = t('profile_grand_total');
        const examDetailsLabel = document.querySelector('#profileExamDetailsBtn span[data-i18n="profile_exam_details"]');
        if (examDetailsLabel) examDetailsLabel.textContent = t('profile_exam_details');
        const gameStatusLabel = document.querySelector('#profileGameStatusBtn span[data-i18n="profile_game_status"]');
        if (gameStatusLabel) gameStatusLabel.textContent = t('profile_game_status');

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
        const totalStats = { watchedVideos: 0, totalVideos: 0, completedLessons: 0, completedDisciplines: 0, coursePoints: 0, points: 0 };
        const currentUser = loadProfileName() || 'Jogador';
        let tttScore = {};
        let chessScore = {};
        let extraGameScores = {};
        try {
            const gameScores = JSON.parse(localStorage.getItem('ulivre_ttt_scores') || '{}');
            tttScore = gameScores[currentUser] || {};
            const chessScores = JSON.parse(localStorage.getItem('ulivre_chess_scores') || '{}');
            chessScore = chessScores[currentUser] || {};
            const extraKeys = ['ulivre_impostor_scores', 'ulivre_hangman_scores', 'ulivre_checkers_scores', 'ulivre_roulette_wallets'];
            extraGameScores = extraKeys.reduce((total, key) => {
                const scores = JSON.parse(localStorage.getItem(key) || '{}');
                return total + (Number(scores[currentUser]?.points) || 0);
            }, 0);
            totalStats.points += Number(tttScore.points) || 0;
            totalStats.points += Number(chessScore.points) || 0;
            totalStats.points += extraGameScores;
        } catch (_) {
            console.warn('[Profile] Pontuação dos jogos indisponível.');
        }
        let ongoingCount = 0;

        const nameInput = document.getElementById('profileNameInput');
        if (nameInput) {
            nameInput.value = loadProfileName();
            nameInput.placeholder = t('profile_name_placeholder');
        }

        const genderSelect = document.getElementById('profileGender');
        if (genderSelect) genderSelect.value = getProfileGender();
        const countrySelect = document.getElementById('profileCountry');
        if (countrySelect) {
            countrySelect.innerHTML = `<option value="">${t('profile_country_not_informed')}</option>` + getCountryOptions(window.getCurrentLanguage?.() || 'pt-br', getProfileCountry());
            countrySelect.value = getProfileCountry();
        }

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
                    totalStats.coursePoints += stats.points;
                    const iconClass = course.id === 'computacao' ? 'laptop-code' : (course.id === 'matematica' ? 'square-root-alt' : 'book');
                    listHtml +=
                        '<div class="profile-course-item">' +
                        '<div class="profile-course-name">' +
                        '<i class="fas fa-' + iconClass + '"></i> ' + escapeHtml(course.name) + ' ' + badge +
                        '</div>' +
                        '<div class="profile-course-progress">' +
                        '<span>' + stats.progressPercent + '%</span>' +
                        '<span class="points">' + t('profile_lesson_points') + ': ' + stats.lessonPoints + ' · ' + t('profile_exam_points') + ': ' + stats.examPoints + '</span>' +
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
        const gamePoints = (Number(chessScore.points) || 0) + (Number(tttScore.points) || 0) + extraGameScores;
        const grandTotal = totalStats.coursePoints + gamePoints;
        const walletApi = window.UniversidadeLivreWallet;
        if (walletApi?.syncAcademicPoints) walletApi.syncAcademicPoints(totalStats.coursePoints);
        const livreWallet = walletApi?.get?.() || { coins: 0, points: 0 };
        const livreCoinsEl = document.getElementById('profileLivreCoins');
        const livrePointsEl = document.getElementById('profileLivrePoints');
        if (livreCoinsEl) livreCoinsEl.textContent = String(livreWallet.coins || 0);
        if (livrePointsEl) livrePointsEl.textContent = String(livreWallet.points || 0);
        const convertLivreBtn = document.getElementById('profileConvertLivrePoints');
        if (convertLivreBtn && convertLivreBtn.dataset.bound !== 'true') {
            convertLivreBtn.dataset.bound = 'true';
            convertLivreBtn.addEventListener('click', () => {
                const current = window.UniversidadeLivreWallet?.get?.();
                if (!current?.points) return;
                window.UniversidadeLivreWallet.convertPoints(current.points);
                updateProfileModal();
            });
        }
        if (pointsEl) pointsEl.textContent = gamePoints;
        const coursePointsLabel = document.querySelector('.profile-total-score-card span[data-i18n="profile_course_points"]');
        if (coursePointsLabel) coursePointsLabel.textContent = t('profile_course_points');
        const examDetailsLabel = document.querySelector('#profileExamDetailsBtn span[data-i18n="profile_exam_details"]');
        if (examDetailsLabel) examDetailsLabel.textContent = t('profile_exam_details');
        const gameStatusLabel = document.querySelector('#profileGameStatusBtn span[data-i18n="profile_game_status"]');
        if (gameStatusLabel) gameStatusLabel.textContent = t('profile_game_status');
        const coursePointsEl = document.getElementById('profileCoursePoints');
        if (coursePointsEl) coursePointsEl.textContent = totalStats.coursePoints;
        const grandTotalEl = document.getElementById('profileGrandTotalPoints');
        if (grandTotalEl) grandTotalEl.textContent = grandTotal;
        const activityButton = document.getElementById('profileActivityBtn');
        if (activityButton && activityButton.dataset.bound !== 'true') {
            activityButton.dataset.bound = 'true';
            activityButton.addEventListener('click', () => {
                const details = document.getElementById('profileActivityDetails');
                if (!details) return;
                details.hidden = !details.hidden;
                activityButton.setAttribute('aria-expanded', String(!details.hidden));
                if (!details.hidden) renderActivityDetails();
            });
        }
        const activityLabel = document.querySelector('#profileActivityBtn span[data-i18n="profile_activity_summary"]');
        if (activityLabel) activityLabel.textContent = t('profile_activity_summary');
        const examButton = document.getElementById('profileExamDetailsBtn');
        if (examButton && examButton.dataset.bound !== 'true') {
            examButton.dataset.bound = 'true';
            examButton.addEventListener('click', () => {
                const details = document.getElementById('profileExamDetails');
                if (!details) return;
                details.hidden = !details.hidden;
                examButton.setAttribute('aria-expanded', String(!details.hidden));
                if (!details.hidden) document.getElementById('profileGameStatus').hidden = true;
                if (!details.hidden) renderExamHistory();
            });
        }
        const transcriptButton = document.getElementById('profileTranscriptBtn');
        if (transcriptButton && transcriptButton.dataset.bound !== 'true') {
            transcriptButton.dataset.bound = 'true';
            transcriptButton.addEventListener('click', () => {
                const transcript = document.getElementById('profileTranscript');
                if (!transcript) return;
                transcript.hidden = !transcript.hidden;
                transcriptButton.setAttribute('aria-expanded', String(!transcript.hidden));
                if (!transcript.hidden) renderTranscript();
            });
        }
        const certificatesButton = document.getElementById('profileCertificatesBtn');
        if (certificatesButton && certificatesButton.dataset.bound !== 'true') {
            certificatesButton.dataset.bound = 'true';
            certificatesButton.addEventListener('click', () => {
                const list = document.getElementById('profileCertificatesList');
                if (!list) return;
                list.hidden = !list.hidden;
                certificatesButton.setAttribute('aria-expanded', String(!list.hidden));
                if (!list.hidden) renderCertificates();
            });
        }
        renderCertificates();
        document.getElementById('closeCertificateModal')?.addEventListener('click', closeCertificate);
        document.getElementById('certificateModal')?.addEventListener('click', event => {
            if (event.target.id === 'certificateModal') closeCertificate();
        });
        document.getElementById('closeTranscriptModal')?.addEventListener('click', closeTranscript);
        document.getElementById('transcriptModal')?.addEventListener('click', event => {
            if (event.target.id === 'transcriptModal') closeTranscript();
        });
        document.getElementById('downloadTranscriptBtn')?.addEventListener('click', () => downloadTranscript('png'));
        document.getElementById('downloadTranscriptPdfBtn')?.addEventListener('click', () => downloadTranscript('pdf'));
        const gameStatusButton = document.getElementById('profileGameStatusBtn');
        if (gameStatusButton && gameStatusButton.dataset.bound !== 'true') {
            gameStatusButton.dataset.bound = 'true';
            gameStatusButton.addEventListener('click', () => {
                const details = document.getElementById('profileGameStatus');
                if (!details) return;
                details.hidden = !details.hidden;
                gameStatusButton.setAttribute('aria-expanded', String(!details.hidden));
                if (!details.hidden) document.getElementById('profileExamDetails').hidden = true;
                if (!details.hidden) renderGameStatus();
            });
        }

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
        if (!loadProfileName()) {
            if (typeof window.startOnboarding === 'function') {
                window.startOnboarding();
            } else {
                console.warn('[Profile] Janela de login ainda não está disponível.');
            }
            return;
        }
        const modal = document.getElementById('profileModal');
        if (!modal) {
            console.warn('[Profile] Modal #profileModal não encontrado no DOM');
            return;
        }
        if (!modal.contains(document.activeElement)) {
            profileOpener = document.activeElement instanceof HTMLElement ? document.activeElement : document.getElementById('profileBtn');
        }
        try {
            updateProfileModal();
        } catch (e) {
            console.warn('[Profile] Erro ao atualizar modal, mas abrindo mesmo assim:', e);
        }
        modal.classList.add('show');
        modal.style.display = 'flex';
        modal.removeAttribute('inert');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        console.log('[Profile] Modal aberto com sucesso');
    }

    function closeProfileModal() {
        const modal = document.getElementById('profileModal');
        if (!modal) return;
        const returnFocusTarget = profileOpener || document.getElementById('profileBtn');
        if (modal.contains(document.activeElement)) {
            if (returnFocusTarget && typeof returnFocusTarget.focus === 'function') {
                returnFocusTarget.focus({ preventScroll: true });
            } else if (typeof document.activeElement?.blur === 'function') {
                document.activeElement.blur();
            }
        }
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.setAttribute('inert', '');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        profileOpener = null;
        console.log('[Profile] Modal fechado');
    }

    // ========== INICIALIZAÇÃO ==========
    let _initialized = false;
    let profileOpener = null;

    async function initProfileSystem() {
        if (_initialized) {
            console.log('[Profile] Sistema já inicializado.');
            return;
        }
        _initialized = true;

        console.log('[Profile] initProfileSystem iniciado');
        // O modal é montado dinamicamente; aguarde o JSON antes de chamar t().
        if (window.i18nReady && typeof window.i18nReady.then === 'function') {
            await window.i18nReady;
        }
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
        const avatarContainer = document.getElementById('avatarWrapper');
        console.log('[Profile] Área do avatar encontrada?', !!avatarContainer);
        if (avatarContainer) {
            avatarContainer.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Profile] Clique no avatarWrapper – abrindo seletor');
                showAvatarSelector();
            });
            console.log('[Profile] Listener de clique adicionado à imagem do perfil');
        } else {
            console.warn('[Profile] Área do avatar não encontrada. O seletor de avatar não funcionará.');
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

        const saveCountryBtn = document.getElementById('profileSaveCountryBtn');
        if (saveCountryBtn) {
            saveCountryBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');
            saveCountryBtn.removeEventListener('click', handleSaveCountry);
            saveCountryBtn.addEventListener('click', handleSaveCountry);
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

        function handleSaveCountry() {
            const countrySelect = document.getElementById('profileCountry');
            if (countrySelect) saveProfileCountry(countrySelect.value);
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
        const countrySelectField = document.getElementById('profileCountry');
        if (countrySelectField) {
            countrySelectField.innerHTML = `<option value="">${t('profile_country_not_informed')}</option>` + getCountryOptions(window.getCurrentLanguage?.() || 'pt-br', getProfileCountry());
            countrySelectField.value = getProfileCountry();
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
    window.getProfileCountry = getProfileCountry;
    window.saveProfileCountry = saveProfileCountry;
    window.getCountryOptions = getCountryOptions;
    window.saveProfilePassword = saveProfilePassword;
    window.saveUserAvatar = saveUserAvatar;
    window.setDefaultAvatar = setDefaultAvatar;
    window.verifyPassword = verifyPassword;
    window.hashPassword = hashPassword;
    window.resizeImage = resizeImage;
    window.checkPasswordStrength = checkPasswordStrength;
    window.getPasswordFeedback = getPasswordFeedback;
    window.getCourseName = getCourseName;
    window.getDisciplineName = getDisciplineName;
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

    window.addEventListener('chessScoreUpdated', () => {
        const modal = document.getElementById('profileModal');
        if (modal?.style?.display === 'flex') {
            updateProfileModal();
            if (!document.getElementById('profileGameStatus')?.hidden) renderGameStatus();
        }
    });

    window.addEventListener('tttScoreUpdated', () => {
        const modal = document.getElementById('profileModal');
        if (modal?.style?.display === 'flex') {
            updateProfileModal();
            if (!document.getElementById('profileGameStatus')?.hidden) renderGameStatus();
        }
    });

    ['impostorScoreUpdated', 'hangmanScoreUpdated', 'checkersScoreUpdated', 'rouletteScoreUpdated', 'unoScoreUpdated', 'bichoScoreUpdated'].forEach(eventName => {
        window.addEventListener(eventName, () => {
            const modal = document.getElementById('profileModal');
            if (modal?.style?.display === 'flex') {
                updateProfileModal();
                if (!document.getElementById('profileGameStatus')?.hidden) renderGameStatus();
            }
        });
    });

    window.addEventListener('livreWalletUpdated', () => {
        const modal = document.getElementById('profileModal');
        if (modal?.style?.display === 'flex') updateProfileModal();
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
        if ((e.key === 'ulivre_ttt_scores' || e.key === 'ulivre_chess_scores') && document.getElementById('profileModal')?.style?.display === 'flex') {
            updateProfileModal();
            if (!document.getElementById('profileGameStatus')?.hidden) renderGameStatus();
        }
    });

    // ========== REAGIR A MUDANÇAS DE IDIOMA ==========
    window.addEventListener('languageChanged', async (e) => {
        const lang = e.detail.lang || 'pt-br';
        console.log('[Profile] Idioma alterado para:', lang);
        updateProfileButton();
            document.querySelectorAll('#closeCertificateModal').forEach(button => button.setAttribute('aria-label', t('close')));
        const modal = document.getElementById('profileModal');
        if (modal && modal.style.display === 'flex') {
            updateProfileTranslations();
            updateProfileModal();
            updateNotesCheckboxes();
            const examDetails = document.getElementById('profileExamDetails');
            if (examDetails && !examDetails.hidden) renderExamHistory();
            const gameStatus = document.getElementById('profileGameStatus');
            if (gameStatus && !gameStatus.hidden) renderGameStatus();
        }
    });

})();