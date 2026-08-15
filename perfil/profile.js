// perfil/profile.js – Versão 16.1 – COMPLETO COM IMPORTAÇÃO/EXPORTAÇÃO APRIMORADA
// Módulo de Perfil com Avatar, Nome, Gênero, Senha, Exportação/Importação
// Integração com onboarding e outros módulos
// CORREÇÃO: Exportação inclui senha (hash), gênero, avatar, matrícula, tempo
// CORREÇÃO: Importação verifica senha (hash) antes de restaurar todos os dados
// CORREÇÃO: Restaura nome, gênero, avatar, matrícula, tempo, cursos, vídeos, livros, notas, tags
// CORREÇÃO: Atualiza interface após importação

(function() {
    'use strict';

    console.log('[Profile] Inicializando módulo...');

    // ========== CONSTANTES ==========
    const STORAGE_KEYS = {
        NAME: 'userProfileName',
        AVATAR: 'userAvatar',
        GENDER: 'userGender',
        PASSWORD: 'userPasswordHash',
        PASSWORD_PLAIN: 'userPassword', // Fallback inseguro (apenas para compatibilidade)
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

    // ========== FALLBACKS DE TRADUÇÃO ==========
    const FALLBACK_PT = {
        'profile': 'Perfil',
        'profile_title': 'Meu Perfil',
        'profile_change_photo': 'Alterar foto',
        'profile_name': 'Nome',
        'profile_name_placeholder': 'Seu nome...',
        'profile_gender': 'Gênero',
        'profile_password': 'Senha (para exportar/importar)',
        'profile_password_placeholder': 'Defina uma senha forte...',
        'profile_save_name': 'Salvar Nome',
        'profile_save': 'Salvar',
        'profile_save_progress': 'Salvar Progresso',
        'profile_import_progress': 'Importar Progresso',
        'profile_watched_videos': 'Vídeos assistidos',
        'profile_total_videos': 'Total de vídeos',
        'profile_completed_lessons': 'Lições concluídas',
        'profile_completed_disciplines': 'Disciplinas concluídas',
        'profile_total_points': 'Pontuação total',
        'profile_auditorio_hours': 'Horas no Auditório',
        'profile_saved_courses': 'Cursos salvos',
        'profile_no_courses': 'Nenhum curso iniciado ainda.',
        'profile_in_progress': 'Em andamento',
        'profile_completed': 'Concluído',
        'profile_export_import': 'Exportar / Importar dados',
        'profile_select_notes': 'Selecione quais notas exportar:',
        'profile_data_note': 'Dados armazenados localmente no navegador. A senha é usada para criptografar a exportação.',
        'profile_matricula': 'Matrícula:',
        'profile_choose_avatar': 'Escolher foto de perfil',
        'profile_avatar_description': 'Selecione uma imagem padrão ou faça upload da sua própria foto.',
        'profile_upload': 'Fazer upload',
        'profile_remove_photo': 'Remover foto',
        'profile_license': 'Licença das imagens',
        'profile_no_notes': 'Nenhuma nota encontrada.',
        'profile_name_saved': 'Nome salvo com sucesso!',
        'profile_gender_saved': 'Gênero salvo com sucesso!',
        'profile_password_saved': 'Senha salva com sucesso!',
        'profile_avatar_updated': 'Foto de perfil atualizada!',
        'profile_avatar_removed': 'Foto removida com sucesso.',
        'profile_export_success': 'Dados exportados com sucesso!',
        'profile_import_success': '✅ Importação concluída! {{count}} cursos importados com sucesso.',
        'profile_import_confirm': '⚠️ Isso irá substituir todos os dados atuais do seu perfil. Deseja continuar?',
        'profile_remove_confirm': 'Deseja remover sua foto de perfil?',
        'profile_no_password_confirm': 'Você não tem uma senha definida. Os dados serão exportados sem criptografia. Deseja continuar?',
        'profile_encrypt_error': 'Erro ao criptografar os dados. Tente novamente.',
        'profile_export_error': 'Erro ao exportar dados. Tente novamente.',
        'profile_import_error': 'Erro ao processar o arquivo. Verifique se é um arquivo válido.',
        'profile_invalid_file': 'Arquivo inválido: dados não encontrados.',
        'profile_password_incorrect': 'Senha incorreta! Tente novamente.',
        'profile_password_required': 'Por favor, digite a senha.',
        'profile_password_min': 'A senha deve ter pelo menos 8 caracteres.',
        'profile_password_weak': 'Senha muito fraca! Requisitos não atendidos: ',
        'profile_avatar_too_big': 'A imagem é muito grande. Tente uma foto menor.',
        'profile_avatar_upload_error': 'Erro ao processar a imagem. Tente novamente.',
        'profile_avatar_storage_error': 'A imagem é muito grande para ser armazenada. Tente uma foto menor.',
        'profile_avatar_save_error': 'Erro ao salvar a imagem. Tente novamente.',
        'profile_processing': 'Processando imagem...',
        'profile_select_image': 'Por favor, selecione uma imagem.',
        'profile_image_too_big': 'A imagem é muito grande. Máximo 5 MB.',
        'profile_name_required': 'Por favor, insira um nome.',
        'profile_password_saved_indicator': 'Senha salva',
        'profile_no_password_saved': 'Nenhuma senha salva',
        'profile_gender_not_informed': 'Não informado',
        'profile_gender_masculine': 'Masculino',
        'profile_gender_feminine': 'Feminino',
        'profile_gender_other': 'Outro',
        'profile_export_courses': 'Cursos',
        'profile_export_videos': 'Vídeos',
        'profile_export_books': 'Livros lidos',
        'profile_export_notes': 'Notas',
        'notas_heading': 'Notas',
        'avatar_aguia': 'Águia',
        'avatar_guepardo': 'Guepardo',
        'avatar_gato': 'Gato',
        'avatar_cachorro': 'Cachorro',
        'avatar_passaro': 'Pássaro',
        'avatar_papagaio_do_mar': 'Papagaio-do-mar',
        'avatar_pato': 'Pato',
        'avatar_galo': 'Galo',
        'avatar_flamingo': 'Flamingo',
        'avatar_cavalo': 'Cavalo',
        'avatar_dragao_barbudo': 'Dragão-barbudo',
        'avatar_leao': 'Leão',
        'avatar_urso': 'Urso',
        'avatar_columba_livia': 'Columba-lívia',
        'avatar_coruja': 'Coruja',
        'avatar_pastor_alemao': 'Pastor-alemão',
        'avatar_papagaio_verdadeiro': 'Papagaio-verdadeiro',
        'avatar_arara_azul_grande': 'Arara-azul-grande',
        'avatar_arara_caninde': 'Arara-caninde',
        'avatar_capivara': 'Capivara',
        'avatar_lobo': 'Lobo',
        'avatar_esquilo': 'Esquilo',
        'avatar_zebra': 'Zebra',
        'avatar_beija_flor': 'Beija-flor'
    };

    const FALLBACK_EN = {
        'profile': 'Profile',
        'profile_title': 'My Profile',
        'profile_change_photo': 'Change photo',
        'profile_name': 'Name',
        'profile_name_placeholder': 'Your name...',
        'profile_gender': 'Gender',
        'profile_password': 'Password (for export/import)',
        'profile_password_placeholder': 'Set a strong password...',
        'profile_save_name': 'Save Name',
        'profile_save': 'Save',
        'profile_save_progress': 'Save Progress',
        'profile_import_progress': 'Import Progress',
        'profile_watched_videos': 'Videos watched',
        'profile_total_videos': 'Total videos',
        'profile_completed_lessons': 'Lessons completed',
        'profile_completed_disciplines': 'Disciplines completed',
        'profile_total_points': 'Total points',
        'profile_auditorio_hours': 'Hours on Auditorium',
        'profile_saved_courses': 'Saved courses',
        'profile_no_courses': 'No courses started yet.',
        'profile_in_progress': 'In progress',
        'profile_completed': 'Completed',
        'profile_export_import': 'Export / Import data',
        'profile_select_notes': 'Select which notes to export:',
        'profile_data_note': 'Data stored locally in your browser. Password is used to encrypt the export.',
        'profile_matricula': 'Enrollment ID:',
        'profile_choose_avatar': 'Choose profile picture',
        'profile_avatar_description': 'Select a default image or upload your own photo.',
        'profile_upload': 'Upload',
        'profile_remove_photo': 'Remove photo',
        'profile_license': 'Image license',
        'profile_no_notes': 'No notes found.',
        'profile_name_saved': 'Name saved successfully!',
        'profile_gender_saved': 'Gender saved successfully!',
        'profile_password_saved': 'Password saved successfully!',
        'profile_avatar_updated': 'Profile picture updated!',
        'profile_avatar_removed': 'Photo removed successfully.',
        'profile_export_success': 'Data exported successfully!',
        'profile_import_success': '✅ Import completed! {{count}} courses imported successfully.',
        'profile_import_confirm': '⚠️ This will replace all your current profile data. Do you want to continue?',
        'profile_remove_confirm': 'Do you want to remove your profile picture?',
        'profile_no_password_confirm': "You don't have a password set. Data will be exported without encryption. Do you want to continue?",
        'profile_encrypt_error': 'Error encrypting data. Please try again.',
        'profile_export_error': 'Error exporting data. Please try again.',
        'profile_import_error': 'Error processing file. Please check if it\'s a valid file.',
        'profile_invalid_file': 'Invalid file: data not found.',
        'profile_password_incorrect': 'Incorrect password! Please try again.',
        'profile_password_required': 'Please enter the password.',
        'profile_password_min': 'Password must be at least 8 characters.',
        'profile_password_weak': 'Password too weak! Requirements not met: ',
        'profile_avatar_too_big': 'Image is too large. Please try a smaller photo.',
        'profile_avatar_upload_error': 'Error processing image. Please try again.',
        'profile_avatar_storage_error': 'Image is too large to store. Please try a smaller photo.',
        'profile_avatar_save_error': 'Error saving image. Please try again.',
        'profile_processing': 'Processing image...',
        'profile_select_image': 'Please select an image.',
        'profile_image_too_big': 'Image is too large. Maximum 5 MB.',
        'profile_name_required': 'Please enter a name.',
        'profile_password_saved_indicator': 'Password saved',
        'profile_no_password_saved': 'No password saved',
        'profile_gender_not_informed': 'Not informed',
        'profile_gender_masculine': 'Male',
        'profile_gender_feminine': 'Female',
        'profile_gender_other': 'Other',
        'profile_export_courses': 'Courses',
        'profile_export_videos': 'Videos',
        'profile_export_books': 'Books read',
        'profile_export_notes': 'Notes',
        'notas_heading': 'Notes',
        'avatar_aguia': 'Eagle',
        'avatar_guepardo': 'Cheetah',
        'avatar_gato': 'Cat',
        'avatar_cachorro': 'Dog',
        'avatar_passaro': 'Bird',
        'avatar_papagaio_do_mar': 'Puffin',
        'avatar_pato': 'Duck',
        'avatar_galo': 'Rooster',
        'avatar_flamingo': 'Flamingo',
        'avatar_cavalo': 'Horse',
        'avatar_dragao_barbudo': 'Bearded Dragon',
        'avatar_leao': 'Lion',
        'avatar_urso': 'Bear',
        'avatar_columba_livia': 'Rock Dove',
        'avatar_coruja': 'Owl',
        'avatar_pastor_alemao': 'German Shepherd',
        'avatar_papagaio_verdadeiro': 'True Parrot',
        'avatar_arara_azul_grande': 'Hyacinth Macaw',
        'avatar_arara_caninde': 'Caninde Macaw',
        'avatar_capivara': 'Capybara',
        'avatar_lobo': 'Wolf',
        'avatar_esquilo': 'Squirrel',
        'avatar_zebra': 'Zebra',
        'avatar_beija_flor': 'Hummingbird'
    };

    // ========== TRADUÇÃO ==========
    let translations = {};
    let currentLang = 'pt-br';
    let translationsLoaded = false;

    function t(key, replacements = {}) {
        let text = translations[key];
        if (!text) {
            const fallback = currentLang === 'en' ? FALLBACK_EN : FALLBACK_PT;
            text = fallback[key] || key;
        }
        for (const k in replacements) {
            if (replacements.hasOwnProperty(k)) {
                text = text.replace(new RegExp('{{' + k + '}}', 'g'), replacements[k]);
            }
        }
        return text;
    }

    // ========== I18N ==========
    async function loadTranslations(lang) {
        if (translationsLoaded && lang === currentLang && Object.keys(translations).length > 0) {
            return true;
        }
        const paths = [
            '../lang/' + lang + '.json',
            'lang/' + lang + '.json',
            '/lang/' + lang + '.json',
            './lang/' + lang + '.json'
        ];
        for (let i = 0; i < paths.length; i++) {
            try {
                const response = await fetch(paths[i]);
                if (response.ok) {
                    translations = await response.json();
                    translationsLoaded = true;
                    console.log('[Profile] Traduções carregadas de ' + paths[i]);
                    return true;
                }
            } catch (e) { /* continua */ }
        }
        console.warn('[Profile] Nenhum arquivo de tradução encontrado para ' + lang + '. Usando fallback.');
        translations = {};
        translationsLoaded = false;
        return false;
    }

    // ========== FUNÇÕES AUXILIARES ==========
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
    function showToast(message, type) {
        type = type || 'info';
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
        const cleaned = cleanObject(obj, maxDepth);
        try { return JSON.stringify(cleaned); } catch (e) { return '{"error":"Serialization failed"}'; }
    }

    // ========== CRIPTOGRAFIA ==========
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
            console.error('Erro na descriptografia:', error);
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
        return { checks: checks, passed: passed, strength: strength, color: color, total: 5 };
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
        localStorage.setItem(STORAGE_KEYS.PASSWORD, hash);
        // Armazenar em texto claro apenas para compatibilidade (fallback)
        localStorage.setItem(STORAGE_KEYS.PASSWORD_PLAIN, password);
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
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
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
        if (!img) return;
        const avatar = getUserAvatar();
        if (avatar) {
            img.src = avatar;
        } else {
            const name = loadProfileName() || 'Usuario';
            img.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=6C8CFF&color=fff&size=80';
        }
    }

    // ========== DETECÇÃO AUTOMÁTICA DO CAMINHO DAS IMAGENS ==========
    let imageBasePath = null;

    async function detectImageBasePath() {
        if (imageBasePath) return imageBasePath;

        const testFile = 'Aguia.png';
        const paths = [
            '/perfil/img/',
            'perfil/img/',
            '../perfil/img/',
            './perfil/img/',
            window.location.origin + '/perfil/img/',
            window.location.origin + '/universidade/perfil/img/'
        ];

        for (let i = 0; i < paths.length; i++) {
            const testUrl = paths[i] + testFile;
            try {
                const response = await fetch(testUrl, { method: 'HEAD' });
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
        for (let i = 0; i < DEFAULT_AVATARS.length; i++) {
            const av = DEFAULT_AVATARS[i];
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

        const licenseBtn = document.getElementById('licenseAvatarBtn');
        if (licenseBtn) {
            licenseBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                window.open('https://pixabay.com/service/license-summary/', '_blank');
            });
        }

        const options = document.querySelectorAll('.avatar-option');
        console.log('[Profile] Encontradas ' + options.length + ' opções de avatar');
        for (let j = 0; j < options.length; j++) {
            (function(opt) {
                const label = opt.querySelector('div:last-child');
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
                    const file = this.dataset.file;
                    console.log('[Profile] Avatar selecionado: ' + file);
                    const imgSrc = basePath + file;
                    fetch(imgSrc)
                        .then(function(res) { return res.blob(); })
                        .then(function(blob) {
                            const fileObj = new File([blob], file, { type: blob.type });
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

        const uploadBtn = document.getElementById('uploadAvatarBtn');
        const fileInput = document.createElement('input');
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
                const file = e.target.files[0];
                console.log('[Profile] Arquivo selecionado: ' + file.name);
                handleAvatarUpload(file, function() {
                    overlay.remove();
                    console.log('[Profile] Upload concluído, modal fechado');
                });
            }
            fileInput.value = '';
        });

        const removeBtn = document.getElementById('removeAvatarBtn');
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

        const escHandler = function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
                console.log('[Profile] Modal de avatar fechado com ESC');
            }
        };
        document.addEventListener('keydown', escHandler);

        const observer = new MutationObserver(function() {
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
        const btn = document.getElementById('profileBtn');
        if (!btn) {
            console.warn('[Profile] Botão #profileBtn não encontrado');
            return;
        }
        const avatar = getUserAvatar();
        const name = loadProfileName() || 'Usuário';
        const initials = name.split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);

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
        const watchedVideos = watchedMap.filter(function(v) { return v === true; }).length;
        const completedLessons = Math.floor(watchedVideos / 5);
        const completedDisciplines = Math.floor(watchedVideos / 25);
        const points = (watchedVideos * 10) + (completedLessons * 50) + (completedDisciplines * 200);
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
        const courses = [];
        const courseNames = {
            'computacao': 'Ciência da Computação',
            'matematica': 'Matemática',
            'computacao_grafica': 'Computação Gráfica',
            'embarcados': 'Embarcados',
            'desenvolvimento_web': 'Desenvolvimento Web',
            'cybersecurity': 'CyberSecurity',
            'devops': 'DevOps',
            'ciencia_de_dados': 'Ciência de Dados',
            'computer-science': 'Computer Science',
            'math': 'Math',
            'enem': 'ENEM',
            'espcex': 'EsPCEx',
            'ingles': 'Inglês',
            'espanhol': 'Espanhol',
            'espanhol-ingles': 'Spanish',
            'japones': 'Japonês',
            'portugues-brasileiro': 'Brazilian Portuguese',
            'japones-ingles': 'Japanese'
        };
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('ulivre_course_')) {
                const courseId = key.replace('ulivre_course_', '');
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.watchedMap) {
                        const stats = calculateCourseStats(data.watchedMap);
                        const name = courseNames[courseId] || courseId;
                        courses.push({ id: courseId, name: name, stats: stats, data: data });
                    }
                } catch (e) {}
            }
        }
        return courses;
    }

    // ========== EXPORTAÇÃO/IMPORTAÇÃO ==========
    function getVideosProgress() {
        const progress = localStorage.getItem('yt_video_progress');
        try { return progress ? JSON.parse(progress) : {}; } catch (e) { return {}; }
    }

    function getBooksRead() {
        const books = localStorage.getItem('ulivre_livros_lidos');
        try { return books ? JSON.parse(books) : []; } catch (e) { return []; }
    }

    function getNotes() {
        const notes = localStorage.getItem('ulivre_notas_estudo');
        try { return notes ? JSON.parse(notes) : []; } catch (e) { return []; }
    }

    function getTags() {
        const tags = localStorage.getItem('ulivre_notas_tags');
        try { return tags ? JSON.parse(tags) : []; } catch (e) { return []; }
    }

    function generateExportData(includeCourses, includeVideos, includeBooks, includeNotes, selectedNoteIds) {
        const exportData = {
            user: loadProfileName() || 'Anônimo',
            gender: getProfileGender() || '',
            timestamp: new Date().toISOString(),
            avatar: getUserAvatar() || null,
            matricula: getMatricula(),
            auditorioTime: localStorage.getItem(AUDITORIO_TIME_KEY) || '0',
            version: '2.0',
            data: {}
        };

        // ===== INCLUSÃO DA SENHA (HASH) PARA VERIFICAÇÃO NA IMPORTAÇÃO =====
        const passwordHash = localStorage.getItem(STORAGE_KEYS.PASSWORD) || null;
        exportData.password = passwordHash;

        if (includeCourses) {
            const courses = getAllCoursesProgress();
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
            const allNotes = getNotes();
            exportData.data.notes = (selectedNoteIds && selectedNoteIds.length > 0) ?
                allNotes.filter(function(n) { return selectedNoteIds.indexOf(n.id) !== -1; }) : allNotes;
            exportData.data.tags = getTags();
        }
        return exportData;
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
                    ${t('notas_cancel')}
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
        const closeModal = function() { overlay.remove(); };

        toggleBtn.addEventListener('click', function() {
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            toggleBtn.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });

        confirmBtn.addEventListener('click', async function() {
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
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') closeModal();
        });
        input.focus();
        return overlay;
    }

    // ========== EXPORTAÇÃO ==========
    async function handleExport() {
        const includeCourses = document.getElementById('exportCourses').checked;
        const includeVideos = document.getElementById('exportVideos').checked;
        const includeBooks = document.getElementById('exportBooks').checked;
        const includeNotes = document.getElementById('exportNotes').checked;
        let selectedNoteIds = [];
        if (includeNotes) {
            const checkboxes = document.querySelectorAll('#notesCheckboxes input[type="checkbox"]:checked');
            for (let i = 0; i < checkboxes.length; i++) {
                selectedNoteIds.push(checkboxes[i].value);
            }
        }
        const hasPassword = hasStoredPassword();

        const exportAction = async function(password) {
            try {
                const data = generateExportData(includeCourses, includeVideos, includeBooks, includeNotes, selectedNoteIds);
                let finalData = data;
                let isEncrypted = false;
                if (password && password.length > 0) {
                    try {
                        const encrypted = await encryptData(data, password);
                        finalData = {
                            encrypted: true,
                            data: encrypted,
                            version: '2.0-encrypted',
                            user: data.user,
                            timestamp: data.timestamp
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
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                let importedData = JSON.parse(e.target.result);
                if (importedData.encrypted === true) {
                    createPasswordModal(t('profile_export_import'), t('profile_password'), async function(password) {
                        try {
                            const decrypted = await decryptData(importedData.data, password);
                            importedData = decrypted;
                            await applyImportedData(importedData);
                        } catch (err) {
                            showToast(t('profile_password_incorrect'), 'error');
                        }
                    });
                    return;
                }

                // ===== ARQUIVO NÃO CRIPTOGRAFADO: VERIFICA SENHA =====
                if (importedData.password) {
                    // Se houver senha armazenada no arquivo, pede a senha do usuário
                    createPasswordModal(t('profile_export_import'), t('profile_password'), async function(password) {
                        try {
                            const match = await verifyPassword(password, importedData.password);
                            if (match) {
                                await applyImportedData(importedData);
                            } else {
                                showToast(t('profile_password_incorrect'), 'error');
                            }
                        } catch (err) {
                            showToast(t('profile_password_incorrect'), 'error');
                        }
                    });
                } else {
                    // Sem senha: aplica diretamente (fallback)
                    await applyImportedData(importedData);
                }
            } catch (error) {
                showToast(t('profile_import_error'), 'error');
            }
        };
        reader.readAsText(file);
    }

    async function applyImportedData(importedData) {
        if (!importedData.data) {
            showToast(t('profile_invalid_file'), 'error');
            return;
        }
        if (!confirm(t('profile_import_confirm'))) return;
        const data = importedData.data;
        let importedCount = 0;

        // ===== RESTAURAR DADOS DO PERFIL =====
        if (importedData.user) localStorage.setItem(STORAGE_KEYS.NAME, importedData.user);
        if (importedData.gender) localStorage.setItem(STORAGE_KEYS.GENDER, importedData.gender);
        if (importedData.avatar) localStorage.setItem(STORAGE_KEYS.AVATAR, importedData.avatar);
        if (importedData.matricula) localStorage.setItem(STORAGE_KEYS.MATRICULA, importedData.matricula);
        if (importedData.auditorioTime) localStorage.setItem(AUDITORIO_TIME_KEY, importedData.auditorioTime);

        // ===== RESTAURAR CURSOS =====
        if (data.courses) {
            for (let i = 0; i < data.courses.length; i++) {
                const course = data.courses[i];
                if (course.id && course.rawData) {
                    localStorage.setItem('ulivre_course_' + course.id, JSON.stringify(course.rawData));
                    importedCount++;
                }
            }
        }

        // ===== RESTAURAR OUTROS DADOS =====
        if (data.videos) localStorage.setItem('yt_video_progress', JSON.stringify(data.videos));
        if (data.booksRead) localStorage.setItem('ulivre_livros_lidos', JSON.stringify(data.booksRead));
        if (data.notes) localStorage.setItem('ulivre_notas_estudo', JSON.stringify(data.notes));
        if (data.tags) localStorage.setItem('ulivre_notas_tags', JSON.stringify(data.tags));

        // ===== ATUALIZAR INTERFACE =====
        showToast(t('profile_import_success', { count: importedCount }), 'success');

        // Atualiza o modal de perfil e o botão de perfil
        updateProfileModal();
        updateProfileButton();
        loadAvatarToModal();

        // Notifica outros módulos (ex: página principal)
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '/index') {
            location.reload();
        } else {
            if (window.updateProfileModal) window.updateProfileModal();
            if (window.renderCourseCards) window.renderCourseCards();
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
            for (let i = 0; i < options.length; i++) {
                const opt = options[i];
                if (genderMap[opt.value] !== undefined) opt.textContent = genderMap[opt.value];
            }
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
            for (let j = 0; j < statItems.length && j < texts.length; j++) {
                const labelSpan = statItems[j].querySelector('span:first-child');
                if (labelSpan) labelSpan.textContent = texts[j];
            }
        }

        const exportItems = [
            { id: 'exportCourses', key: 'profile_export_courses' },
            { id: 'exportVideos', key: 'profile_export_videos' },
            { id: 'exportBooks', key: 'profile_export_books' },
            { id: 'exportNotes', key: 'profile_export_notes' }
        ];
        for (let k = 0; k < exportItems.length; k++) {
            const item = exportItems[k];
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
        for (let m = 0; m < ongoingBadges.length; m++) {
            ongoingBadges[m].textContent = t('profile_in_progress');
        }
        const completedBadges = document.querySelectorAll('.profile-course-item .progress-badge.completed');
        for (let n = 0; n < completedBadges.length; n++) {
            completedBadges[n].textContent = t('profile_completed');
        }

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
        if (!translationsLoaded && Object.keys(translations).length === 0) {
            loadTranslations(currentLang).then(function() { _updateProfileModal(); });
        } else {
            _updateProfileModal();
        }
    }

    function _updateProfileModal() {
        const allCourses = getAllCoursesProgress();
        let totalStats = { watchedVideos: 0, totalVideos: 0, completedLessons: 0, completedDisciplines: 0, points: 0 };
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
        }
        if (passwordInput) {
            passwordInput.removeEventListener('input', updatePasswordStrengthIndicator);
            passwordInput.addEventListener('input', updatePasswordStrengthIndicator);
            if (passwordInput.value.length > 0) updatePasswordStrengthIndicator.call(passwordInput);
        }

        const matricula = getMatricula();
        const avatarSection = document.querySelector('.profile-avatar-section');
        if (avatarSection) {
            avatarSection.style.display = 'flex';
            avatarSection.style.flexDirection = 'column';
            avatarSection.style.alignItems = 'center';
            const oldMatricula = avatarSection.querySelector('.profile-matricula');
            if (oldMatricula) oldMatricula.remove();
            const matriculaEl = document.createElement('div');
            matriculaEl.className = 'profile-matricula';
            matriculaEl.style.cssText =
                'text-align:center;margin-top:0.3rem;font-size:0.7rem;' +
                'color:var(--text-tertiary);font-family:monospace;letter-spacing:0.3px;' +
                'border-top:1px solid var(--border-light);padding-top:0.3rem;padding-bottom:0.1rem;width:100%;';
            matriculaEl.innerHTML = '<span style="color:var(--text-secondary);font-weight:500;">' + t('profile_matricula') + '</span> <span style="font-weight:600;color:var(--text-secondary);margin-left:0.3rem;">' + matricula + '</span>';
            avatarSection.appendChild(matriculaEl);
        }

        const listContainer = document.getElementById('profileCoursesList');
        let listHtml = '<h4 style="margin:0.5rem 0;color:var(--text-secondary);"><i class="fas fa-graduation-cap"></i> ' + t('profile_saved_courses') + '</h4>';
        if (allCourses.length === 0) {
            listHtml += '<p style="color:var(--text-tertiary);font-size:0.9rem;">' + t('profile_no_courses') + '</p>';
        } else {
            for (let i = 0; i < allCourses.length; i++) {
                const course = allCourses[i];
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
        if (listContainer) listContainer.innerHTML = listHtml;

        const ongoingContainer = document.getElementById('ongoingCoursesContainer');
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
        for (let i = 0; i < notes.length; i++) {
            const note = notes[i];
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
        const modal = document.getElementById('profileModal');
        if (!modal) return;
        modal.classList.remove('show');
        modal.style.display = 'none';
        console.log('[Profile] Modal fechado');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========== INICIALIZAÇÃO ==========
    async function initProfileSystem() {
        console.log('[Profile] initProfileSystem iniciado');
        const savedLang = localStorage.getItem('selectedLanguage') || (navigator.language && navigator.language.startsWith('pt') ? 'pt-br' : 'en');
        currentLang = savedLang;
        await loadTranslations(currentLang);

        await detectImageBasePath();

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

        const avatarWrapper = document.getElementById('avatarWrapper');
        if (avatarWrapper) {
            avatarWrapper.removeEventListener('click', showAvatarSelector);
            avatarWrapper.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[Profile] Clique no avatarWrapper – abrindo seletor');
                showAvatarSelector();
            });
            console.log('[Profile] Listener de clique adicionado ao #avatarWrapper');
        } else {
            console.warn('[Profile] #avatarWrapper não encontrado');
        }

        const closeBtn = document.getElementById('closeProfileModal');
        if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);

        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) closeProfileModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.style.display === 'flex') closeProfileModal();
            });
        }

        const saveNameBtn = document.getElementById('profileSaveNameBtn');
        if (saveNameBtn) {
            saveNameBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save_name');
            saveNameBtn.addEventListener('click', function() {
                const name = document.getElementById('profileNameInput').value.trim();
                if (!name) { showToast(t('profile_name_required'), 'error'); return; }
                saveProfileName(name);
            });
        }

        const saveGenderBtn = document.getElementById('profileSaveGenderBtn');
        if (saveGenderBtn) {
            saveGenderBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');
            saveGenderBtn.addEventListener('click', function() {
                const gender = document.getElementById('profileGender').value;
                saveProfileGender(gender);
            });
        }

        const savePasswordBtn = document.getElementById('profileSavePasswordBtn');
        if (savePasswordBtn) {
            savePasswordBtn.innerHTML = '<i class="fas fa-save"></i> ' + t('profile_save');
            savePasswordBtn.addEventListener('click', async function() {
                const password = document.getElementById('profilePassword').value;
                const saved = await saveProfilePassword(password);
                if (saved) {
                    document.getElementById('profilePassword').value = '';
                    showPasswordSavedIndicator(true);
                }
            });
        }

        const exportBtn = document.getElementById('generateExportBtn');
        if (exportBtn) {
            exportBtn.innerHTML = '<i class="fas fa-file-export"></i> ' + t('profile_save_progress');
            exportBtn.addEventListener('click', handleExport);
        }

        const importBtn = document.getElementById('importProgressBtn');
        if (importBtn) {
            importBtn.innerHTML = '<i class="fas fa-file-import"></i> ' + t('profile_import_progress');
            importBtn.addEventListener('click', function() {
                const importInput = document.getElementById('importFileInput');
                if (importInput) importInput.click();
            });
        }

        const importInput = document.getElementById('importFileInput');
        if (importInput) {
            importInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files[0]) {
                    handleImport(e.target.files[0]);
                }
                e.target.value = '';
            });
        }

        if (!getUserAvatar()) setDefaultAvatar();

        loadAvatarToModal();
        const nameInputField = document.getElementById('profileNameInput');
        if (nameInputField) {
            nameInputField.value = loadProfileName();
            nameInputField.placeholder = t('profile_name_placeholder');
        }
        const genderSelectField = document.getElementById('profileGender');
        if (genderSelectField) genderSelectField.value = getProfileGender();
        const passwordInputField = document.getElementById('profilePassword');
        if (passwordInputField) passwordInputField.placeholder = t('profile_password_placeholder');
        showPasswordSavedIndicator(hasStoredPassword());

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

    // ========== INICIALIZAÇÃO AUTOMÁTICA ==========
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

    // ========== EVENTOS DE HORAS DO AUDITÓRIO ==========
    window.addEventListener('auditorioTimeUpdated', function(e) {
        const seconds = e.detail.seconds;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const formatted = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min';
        const el = document.getElementById('profileAuditorioTime');
        if (el) el.textContent = formatted;
    });

    window.addEventListener('storage', function(e) {
        if (e.key === AUDITORIO_TIME_KEY) {
            const el = document.getElementById('profileAuditorioTime');
            if (el && document.getElementById('profileModal').style.display === 'flex') {
                const seconds = parseInt(e.newValue || '0', 10);
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                el.textContent = hours > 0 ? hours + 'h ' + minutes + 'min' : minutes + 'min';
            }
        }
    });

    // ========== REAGIR A MUDANÇAS DE IDIOMA ==========
    window.addEventListener('languageChanged', async function(e) {
        const lang = e.detail.lang || 'pt-br';
        if (lang !== currentLang) {
            currentLang = lang;
            await loadTranslations(lang);
        }
        updateProfileButton();
        const modal = document.getElementById('profileModal');
        if (modal && modal.style.display === 'flex') {
            updateProfileTranslations();
            _updateProfileModal();
        }
    });

})();