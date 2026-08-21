// cursos/cursor-timeset.js – Rastreamento de tempo de atividade do usuário (versão final)
// Suporte completo para todos os cursos, incluindo Engenharia de Computação, Tecnologia da Informação
// e Ciência de Dados (Bacharelado)
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
    
    // ========== LISTA DE CURSOS COM RASTREAMENTO ESPECIAL ==========
    const SPECIAL_COURSES = [
        'computer-science',
        'engenharia_computacao',
        'tecnologia-informacao',
        'ciencia-de-dados-bacharelado'
    ];
    
    // ========== CARREGAR DADOS ==========
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
    
    // ========== SALVAR DADOS ==========
    function saveTimesetData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    
    // ========== OBTER TIMESTAMP ==========
    function getCurrentTimestamp() {
        return new Date().toISOString();
    }
    
    // ========== REGISTRAR TIMESTAMP PARA UM CONTEXTO ==========
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
            // Suporte específico para cursos selecionados
            if (SPECIAL_COURSES.includes(id)) {
                const storageKey = `cursor_timeset_${id}_last_access`;
                localStorage.setItem(storageKey, now);
                const sessionKey = `cursor_timeset_${id}_session_time`;
                const sessionTime = localStorage.getItem(sessionKey) || '0';
                localStorage.setItem(sessionKey, sessionTime);
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
    
    // ========== ATUALIZAR TEMPO DECORRIDO ==========
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
                        // Suporte específico para cursos selecionados
                        if (SPECIAL_COURSES.includes(currentCourseId)) {
                            const sessionKey = `cursor_timeset_${currentCourseId}_session_time`;
                            let session = parseInt(localStorage.getItem(sessionKey) || '0');
                            session += elapsedSeconds;
                            localStorage.setItem(sessionKey, session.toString());
                            const activityKey = `cursor_timeset_${currentCourseId}_activity_time`;
                            localStorage.setItem(activityKey, now.toString());
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
    
    // ========== DETECTAR ATIVIDADE DO USUÁRIO ==========
    function onUserActivity() {
        if (!isActive) {
            isActive = true;
            console.log('[CursorTimeset] Atividade detectada – sessão reativada');
            lastActiveTimestamp = Date.now();
        } else {
            lastActiveTimestamp = Date.now();
        }
    }
    
    // ========== INICIAR MONITORAMENTO DE ATIVIDADE ==========
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
    
    // ========== PARAR MONITORAMENTO ==========
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
    
    // ========== REGISTRAR ENTRADA EM GRADUAÇÃO ==========
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
    
    // ========== REGISTRAR ENTRADA EM DISCIPLINA/PRÁTICA/BIBLIOGRAFIA ==========
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
    
    // ========== REGISTRAR SAÍDA ==========
    function registerExit() {
        if (currentContext) {
            updateElapsedTime();
            stopActivityMonitoring();
            console.log(`[CursorTimeset] Saída do contexto ${currentContext}`);
        }
    }
    
    // ========== OBTER DADOS ESPECÍFICOS DE UM CURSO ==========
    function getCourseSpecificData(courseId) {
        const data = loadTimesetData();
        const result = {
            graduation: data.graduation[courseId] || null,
            discipline: data.discipline[courseId] || {},
            practice: data.practice[courseId] || {},
            bibliography: data.bibliography[courseId] || {}
        };
        // Dados específicos do localStorage para cursos selecionados
        if (SPECIAL_COURSES.includes(courseId)) {
            const extra = {
                lastAccess: localStorage.getItem(`cursor_timeset_${courseId}_last_access`),
                sessionTime: localStorage.getItem(`cursor_timeset_${courseId}_session_time`),
                activityTime: localStorage.getItem(`cursor_timeset_${courseId}_activity_time`)
            };
            // Usar chave dinâmica
            const key = courseId === 'computer-science' ? 'csExtra' :
                       courseId === 'engenharia_computacao' ? 'ecExtra' :
                       courseId === 'tecnologia-informacao' ? 'tiExtra' :
                       courseId === 'ciencia-de-dados-bacharelado' ? 'cdExtra' : 'extra';
            result[key] = extra;
        }
        return result;
    }
    
    // ========== OBTER DADOS GERAIS DE TEMPO ==========
    function getTotalTimeData() {
        const data = loadTimesetData();
        let totalGraduationTime = 0;
        let totalDisciplineTime = 0;
        let totalPracticeTime = 0;
        let totalBibliographyTime = 0;
        
        for (const courseId in data.graduation) {
            if (data.graduation[courseId] && data.graduation[courseId].totalTime) {
                totalGraduationTime += data.graduation[courseId].totalTime;
            }
        }
        for (const courseId in data.discipline) {
            for (const discipline in data.discipline[courseId]) {
                if (data.discipline[courseId][discipline] && data.discipline[courseId][discipline].totalTime) {
                    totalDisciplineTime += data.discipline[courseId][discipline].totalTime;
                }
            }
        }
        for (const courseId in data.practice) {
            for (const discipline in data.practice[courseId]) {
                if (data.practice[courseId][discipline] && data.practice[courseId][discipline].totalTime) {
                    totalPracticeTime += data.practice[courseId][discipline].totalTime;
                }
            }
        }
        for (const courseId in data.bibliography) {
            for (const discipline in data.bibliography[courseId]) {
                if (data.bibliography[courseId][discipline] && data.bibliography[courseId][discipline].totalTime) {
                    totalBibliographyTime += data.bibliography[courseId][discipline].totalTime;
                }
            }
        }
        
        return {
            graduation: totalGraduationTime,
            discipline: totalDisciplineTime,
            practice: totalPracticeTime,
            bibliography: totalBibliographyTime,
            total: totalGraduationTime + totalDisciplineTime + totalPracticeTime + totalBibliographyTime
        };
    }
    
    // ========== INICIALIZAÇÃO ==========
    function initializeCursorTimeset() {
        console.log('[CursorTimeset] Inicializado');
        // Verificar se há dados de sessão anterior e restaurar se necessário
        SPECIAL_COURSES.forEach(courseId => {
            const lastAccess = localStorage.getItem(`cursor_timeset_${courseId}_last_access`);
            if (lastAccess) {
                console.log(`[CursorTimeset] Sessão anterior detectada para ${courseId}: ${lastAccess}`);
            }
        });
        window.addEventListener('beforeunload', () => {
            if (currentContext) updateElapsedTime();
        });
        // Adicionar atributo indicador de sessão ativa no body
        document.body.setAttribute('data-cursor-active', 'true');
        // Iniciar o monitoramento mesmo sem curso ativo (apenas para detectar atividade)
        startActivityMonitoring();
    }
    
    // ========== EXPOR API PÚBLICA ==========
    window.CursorTimeset = {
        initialize: initializeCursorTimeset,
        registerGraduationEntry,
        registerDisciplineEntry,
        registerExit,
        getTimesetData: loadTimesetData,
        getCourseSpecificData,
        getTotalTimeData,
        // Método para obter dados específicos do Computer Science (mantido para compatibilidade)
        getComputerScienceData: function() {
            return getCourseSpecificData('computer-science').csExtra || {};
        },
        // Método para obter dados específicos da Engenharia de Computação
        getEngenhariaComputacaoData: function() {
            return getCourseSpecificData('engenharia_computacao').ecExtra || {};
        },
        // Método para obter dados específicos da Tecnologia da Informação
        getTecnologiaInformacaoData: function() {
            return getCourseSpecificData('tecnologia-informacao').tiExtra || {};
        },
        // Método para obter dados específicos da Ciência de Dados (Bacharelado)
        getCienciaDadosBachareladoData: function() {
            return getCourseSpecificData('ciencia-de-dados-bacharelado').cdExtra || {};
        }
    };
    
    // ========== AUTOINICIALIZAÇÃO SEGURA ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCursorTimeset);
    } else {
        initializeCursorTimeset();
    }
})();