// cursos/cursor-timeset.js – Rastreamento de tempo de atividade do usuário (versão final)
(function() {
    'use strict';

    // Configurações
    const STORAGE_KEY = 'cursor_timeset';
    const ACTIVE_CHECK_INTERVAL = 5000; // 5 segundos
    const ACTIVITY_EVENTS = ['mousemove', 'click', 'scroll', 'keydown', 'touchstart'];
    
    let currentContext = null;      // 'graduation', 'discipline', 'practice', 'bibliography'
    let currentCourseId = null;
    let currentDisciplineName = null;
    let lastActiveTimestamp = null;
    let activeInterval = null;
    let isActive = true;
    
    // Carregar dados do localStorage
    function loadTimesetData() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('[CursorTimeset] Erro ao parsear dados:', e);
            }
        }
        return {
            graduation: {},
            discipline: {},
            practice: {},
            bibliography: {}
        };
    }
    
    // Salvar dados no localStorage
    function saveTimesetData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    
    // Obter timestamp atual ISO 8601
    function getCurrentTimestamp() {
        return new Date().toISOString();
    }
    
    // Registrar timestamp para um contexto específico
    function registerTimestamp(context, id, subId = null) {
        const data = loadTimesetData();
        const now = getCurrentTimestamp();
        
        if (!data[context]) data[context] = {};
        
        if (context === 'graduation') {
            if (!data.graduation[id]) {
                data.graduation[id] = { firstAccess: now, lastAccess: now, totalTime: 0 };
            } else {
                data.graduation[id].lastAccess = now;
            }
            // Suporte específico para Computer Science
            if (id === 'computer-science') {
                localStorage.setItem('cursor_timeset_computer_science_last_access', now);
                const sessionTime = localStorage.getItem('cursor_timeset_computer_science_session_time') || '0';
                localStorage.setItem('cursor_timeset_computer_science_session_time', sessionTime);
            }
        } else if (context === 'discipline' && subId) {
            if (!data.discipline[id]) data.discipline[id] = {};
            if (!data.discipline[id][subId]) {
                data.discipline[id][subId] = { firstAccess: now, lastAccess: now, totalTime: 0 };
            } else {
                data.discipline[id][subId].lastAccess = now;
            }
        } else if (context === 'practice' && subId) {
            if (!data.practice[id]) data.practice[id] = {};
            if (!data.practice[id][subId]) {
                data.practice[id][subId] = { firstAccess: now, lastAccess: now, totalTime: 0 };
            } else {
                data.practice[id][subId].lastAccess = now;
            }
        } else if (context === 'bibliography' && subId) {
            if (!data.bibliography[id]) data.bibliography[id] = {};
            if (!data.bibliography[id][subId]) {
                data.bibliography[id][subId] = { firstAccess: now, lastAccess: now, totalTime: 0 };
            } else {
                data.bibliography[id][subId].lastAccess = now;
            }
        }
        
        saveTimesetData(data);
        console.log(`[CursorTimeset] Timestamp registrado: ${context}/${id}${subId ? '/'+subId : ''} at ${now}`);
    }
    
    // Atualizar tempo decorrido para o contexto atual
    function updateElapsedTime() {
        if (!currentContext || !currentCourseId || !isActive) return;
        
        const data = loadTimesetData();
        const now = Date.now();
        
        if (lastActiveTimestamp) {
            const elapsedSeconds = Math.floor((now - lastActiveTimestamp) / 1000);
            if (elapsedSeconds > 0 && elapsedSeconds < 300) { // limite de 5 minutos por segurança
                if (currentContext === 'graduation') {
                    if (data.graduation[currentCourseId]) {
                        data.graduation[currentCourseId].totalTime += elapsedSeconds;
                        // Suporte específico para Computer Science
                        if (currentCourseId === 'computer-science') {
                            let csSession = parseInt(localStorage.getItem('cursor_timeset_computer_science_session_time') || '0');
                            csSession += elapsedSeconds;
                            localStorage.setItem('cursor_timeset_computer_science_session_time', csSession.toString());
                            localStorage.setItem('cursor_timeset_computer_science_activity_time', now.toString());
                        }
                    }
                } else if (currentContext === 'discipline' && currentDisciplineName) {
                    if (data.discipline[currentCourseId] && data.discipline[currentCourseId][currentDisciplineName]) {
                        data.discipline[currentCourseId][currentDisciplineName].totalTime += elapsedSeconds;
                    }
                } else if (currentContext === 'practice' && currentDisciplineName) {
                    if (data.practice[currentCourseId] && data.practice[currentCourseId][currentDisciplineName]) {
                        data.practice[currentCourseId][currentDisciplineName].totalTime += elapsedSeconds;
                    }
                } else if (currentContext === 'bibliography' && currentDisciplineName) {
                    if (data.bibliography[currentCourseId] && data.bibliography[currentCourseId][currentDisciplineName]) {
                        data.bibliography[currentCourseId][currentDisciplineName].totalTime += elapsedSeconds;
                    }
                }
                saveTimesetData(data);
                console.log(`[CursorTimeset] Tempo atualizado: +${elapsedSeconds}s (total acumulado)`);
            }
        }
        lastActiveTimestamp = now;
    }
    
    // Detectar atividade do usuário
    function onUserActivity() {
        if (!isActive) {
            isActive = true;
            console.log('[CursorTimeset] Atividade detectada – sessão reativada');
            lastActiveTimestamp = Date.now();
        } else {
            lastActiveTimestamp = Date.now();
        }
    }
    
    // Iniciar monitoramento de atividade
    function startActivityMonitoring() {
        ACTIVITY_EVENTS.forEach(event => {
            window.addEventListener(event, onUserActivity);
        });
        window.addEventListener('scroll', onUserActivity);
        document.addEventListener('scroll', onUserActivity);
        
        setInterval(() => {
            const now = Date.now();
            if (lastActiveTimestamp && (now - lastActiveTimestamp) > 30000) {
                if (isActive) {
                    isActive = false;
                    console.log('[CursorTimeset] Usuário inativo – pausando contagem');
                }
            }
        }, 10000);
    }
    
    // Parar monitoramento
    function stopActivityMonitoring() {
        ACTIVITY_EVENTS.forEach(event => {
            window.removeEventListener(event, onUserActivity);
        });
        window.removeEventListener('scroll', onUserActivity);
        document.removeEventListener('scroll', onUserActivity);
        if (activeInterval) {
            clearInterval(activeInterval);
            activeInterval = null;
        }
        isActive = false;
        currentContext = null;
        currentCourseId = null;
        currentDisciplineName = null;
    }
    
    // Registrar entrada em graduação
    function registerGraduationEntry(courseId) {
        if (currentContext === 'graduation' && currentCourseId === courseId) return;
        stopActivityMonitoring();
        
        currentContext = 'graduation';
        currentCourseId = courseId;
        currentDisciplineName = null;
        lastActiveTimestamp = Date.now();
        isActive = true;
        
        registerTimestamp('graduation', courseId);
        
        if (activeInterval) clearInterval(activeInterval);
        activeInterval = setInterval(() => updateElapsedTime(), ACTIVE_CHECK_INTERVAL);
        startActivityMonitoring();
        
        console.log(`[CursorTimeset] Entrada na graduação: ${courseId}`);
    }
    
    // Registrar entrada em disciplina/prática/bibliografia
    function registerDisciplineEntry(courseId, disciplineName, context = 'discipline') {
        if (!currentCourseId || currentCourseId !== courseId) {
            registerGraduationEntry(courseId);
        }
        
        currentContext = context;
        currentDisciplineName = disciplineName;
        lastActiveTimestamp = Date.now();
        isActive = true;
        
        registerTimestamp(context, courseId, disciplineName);
        
        console.log(`[CursorTimeset] Entrada em ${context}: ${disciplineName} (curso: ${courseId})`);
    }
    
    // Registrar saída
    function registerExit() {
        if (currentContext) {
            updateElapsedTime();
            stopActivityMonitoring();
            console.log(`[CursorTimeset] Saída do contexto ${currentContext}`);
        }
    }
    
    // Inicialização
    function initializeCursorTimeset() {
        console.log('[CursorTimeset] Inicializado');
        // Verificar se há dados de sessão anterior e restaurar se necessário
        const lastSession = localStorage.getItem('cursor_timeset_computer_science_last_access');
        if (lastSession) {
            console.log(`[CursorTimeset] Sessão anterior detectada para Computer Science: ${lastSession}`);
        }
        window.addEventListener('beforeunload', () => {
            if (currentContext) updateElapsedTime();
        });
        // Adicionar atributo indicador de sessão ativa no body
        document.body.setAttribute('data-cursor-active', 'true');
    }
    
    // Expor API pública
    window.CursorTimeset = {
        initialize: initializeCursorTimeset,
        registerGraduationEntry,
        registerDisciplineEntry,
        registerExit,
        getTimesetData: loadTimesetData,
        // Método para obter dados específicos do Computer Science
        getComputerScienceData: function() {
            return {
                lastAccess: localStorage.getItem('cursor_timeset_computer_science_last_access'),
                sessionTime: localStorage.getItem('cursor_timeset_computer_science_session_time'),
                activityTime: localStorage.getItem('cursor_timeset_computer_science_activity_time')
            };
        }
    };
    
    // Auto-inicialização segura (aguarda DOM pronto)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCursorTimeset);
    } else {
        initializeCursorTimeset();
    }
})();