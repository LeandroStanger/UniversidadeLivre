// notas.js – Gerenciador de notas modular com Quill 2.0.3
// v2.6.0 - CORREÇÃO: Preservação de ícones nas traduções
// v2.6.0 - CORREÇÃO: Logs para depuração de chaves não encontradas
// v2.6.0 - CORREÇÃO: Fallback inline completo para pt-br e en
// v2.6.1 - MELHORIA: Usa window.t() se disponível, senão fallback interno

(function() {
    'use strict';

    // ========== CONFIGURAÇÕES ==========
    const STORAGE_KEY = 'ulivre_notas_estudo';
    const TAGS_STORAGE_KEY = 'ulivre_notas_tags';
    
    // Estado da aplicação
    let state = {
        notas: [],
        tags: [],          // { id: string, name: string, color: string }
        editingId: null,
        currentLang: 'pt-br',
        translations: {},
        tagFilter: null,   // ID da tag ativa no filtro (null = todas)
        courses: [],
        courseDataCache: new Map()
    };

    // Elementos do DOM
    let elements = {};
    
    // Quill editor
    let quill = null;

    const COURSE_DATA_PATHS = {
        administracao: 'graduacao/administracao/administracao-data.json',
        biologia: 'graduacao/biologia/biologia-data.json',
        computacao: 'graduacao/ciencia-computacao/ciencia-computacao-data.json',
        matematica: 'graduacao/matematica/matematica-data.json',
        'matematica-licenciatura': 'graduacao/matematica-licenciatura/matematica-licenciatura-data.json',
        'ciencia-de-dados-bacharelado': 'graduacao/ciencia-de-dados/ciencia-de-dados-bacharelado-data.json',
        'computer-science': 'graduacao/computer-science/computer-science-data.json',
        math: 'graduacao/math/math-data.json',
        computacao_grafica: 'pos-graduacao/computacao-grafica/computacao-grafica-data.json',
        embarcados: 'pos-graduacao/embarcados/embarcados-data.json',
        desenvolvimento_web: 'pos-graduacao/desenvolvimento-web/desenvolvimento-web-data.json',
        cybersecurity: 'pos-graduacao/cybersecurity/cybersecurity-data.json',
        devops: 'pos-graduacao/devops/devops-data.json',
        ciencia_de_dados: 'pos-graduacao/ciencia-de-dados/ciencia-de-dados-data.json',
        enem: 'ensino-medio/enem/enem-data.json',
        espcex: 'ensino-medio/espcex/espcex-data.json',
        ingles: 'idiomas/ingles/ingles-data.json',
        espanhol: 'idiomas/espanhol/espanhol-data.json',
        'espanhol-ingles': 'idiomas/espanhol-ingles/espanhol-ingles-data.json',
        japones: 'idiomas/japones/japones-data.json',
        'portugues-brasileiro': 'idiomas/portugues-brasileiro/portugues-brasileiro-data.json',
        'japones-ingles': 'idiomas/japones-ingles/japones-ingles-data.json',
        engenharia_computacao: 'graduacao/engenharia-computacao/engenharia-computacao-data.json',
        'engenharia-producao': 'graduacao/engenharia-producao/engenharia-producao-data.json',
        letras: 'graduacao/letras/letras-data.json',
        'letras-portugues': 'graduacao/letras-portugues/letras-portugues-data.json',
        pedagogia: 'graduacao/pedagogia/pedagogia-data.json',
        'gestao-publica': 'graduacao/gestao-publica/gestao-publica-data.json',
        'tecnologia-informacao': 'graduacao/tecnologia-informacao/tecnologia-informacao-data.json',
        'processos-gerenciais': 'graduacao/processos-gerenciais/processos-gerenciais-data.json',
        fisica: 'graduacao/fisica/fisica-data.json',
        quimica: 'graduacao/quimica/quimica-data.json'
    };

    // ========== FALLBACKS INLINE (usados apenas se window.t não estiver disponível) ==========
    const FALLBACK_PT = {
        "notas_title": "Notas de Estudo · Universidade Livre",
        "notas_subtitle": "Caderno de Estudos",
        "notas_heading": "Minhas Notas",
        "notas_description": "Crie e organize suas anotações com formatação rica, imagens e muito mais.",
        "notas_editor_title": "Nova Nota",
        "notas_clear_editor": "Limpar editor",
        "notas_title_placeholder": "Título da nota...",
        "notas_title_required": "Esqueceu o título da nota?",
        "notas_course_type_label": "Tipo de curso",
        "notas_course_type_all": "Todos os tipos",
        "notas_course_label": "Curso",
        "notas_course_placeholder": "Selecione um curso",
        "notas_discipline_label": "Disciplina",
        "notas_discipline_placeholder": "Selecione uma disciplina",
        "notas_no_disciplines": "Nenhuma disciplina disponível para este curso.",
        "notas_lesson_label": "Aula",
        "notas_lesson_placeholder": "Selecione uma aula",
        "notas_general_lesson": "Geral (toda a disciplina)",
        "notas_lesson_format": "Aula {{number}}",
        "notas_content_placeholder": "Escreva sua anotação aqui...",
        "notas_save": "Salvar",
        "notas_cancel": "Cancelar",
        "notas_saved": "Notas Salvas",
        "notas_search_placeholder": "Buscar notas...",
        "notas_empty": "Nenhuma nota criada ainda.",
        "notas_edit": "Editar",
        "notas_delete": "Excluir",
        "notas_confirm_delete": "Tem certeza que deseja excluir esta nota?",
        "notas_updated": "Atualizado",
        "notas_created": "Criado",
        "donate_button": "Doar",
        "donate_text": "Doar",
        "back_to_courses": "Voltar para cursos",
        "notas_manage_tags": "Gerenciar tags",
        "notas_filter_by_tag": "Filtrar por tag:",
        "notas_all_tags": "Todas",
        "notas_favorite": "Favoritar",
        "notas_tag_name_placeholder": "Nome da tag",
        "notas_tag_color": "Cor:",
        "notas_add_tag": "Adicionar Tag",
        "notas_manage_tags_title": "Gerenciar Tags",
        "notas_edit_tag": "Editar tag",
        "notas_delete_tag": "Excluir tag",
        "notas_tags": "Tags:",
        "notas_add_tag_to_note": "Adicionar tag à nota",
        "profile": "Perfil",
        "auditorio_title": "Auditório",
        "library_button": "Biblioteca"
    };

    const FALLBACK_EN = {
        "notas_title": "Study Notes · Open University",
        "notas_subtitle": "Study Notebook",
        "notas_heading": "My Notes",
        "notas_description": "Create and organize your notes with rich formatting, images, and more.",
        "notas_editor_title": "New Note",
        "notas_clear_editor": "Clear editor",
        "notas_title_placeholder": "Note title...",
        "notas_title_required": "Did you forget the note title?",
        "notas_course_type_label": "Course type",
        "notas_course_type_all": "All types",
        "notas_course_label": "Course",
        "notas_course_placeholder": "Select a course",
        "notas_discipline_label": "Discipline",
        "notas_discipline_placeholder": "Select a discipline",
        "notas_no_disciplines": "No disciplines available for this course.",
        "notas_lesson_label": "Lesson",
        "notas_lesson_placeholder": "Select a lesson",
        "notas_general_lesson": "General (entire discipline)",
        "notas_lesson_format": "Lesson {{number}}",
        "notas_content_placeholder": "Write your note here...",
        "notas_save": "Save",
        "notas_cancel": "Cancel",
        "notas_saved": "Saved Notes",
        "notas_search_placeholder": "Search notes...",
        "notas_empty": "No notes created yet.",
        "notas_edit": "Edit",
        "notas_delete": "Delete",
        "notas_confirm_delete": "Are you sure you want to delete this note?",
        "notas_updated": "Updated",
        "notas_created": "Created",
        "donate_button": "Donate",
        "donate_text": "Donate",
        "back_to_courses": "Back to Courses",
        "notas_manage_tags": "Manage tags",
        "notas_filter_by_tag": "Filter by tag:",
        "notas_all_tags": "All",
        "notas_favorite": "Favorite",
        "notas_tag_name_placeholder": "Tag name",
        "notas_tag_color": "Color:",
        "notas_add_tag": "Add Tag",
        "notas_manage_tags_title": "Manage Tags",
        "notas_edit_tag": "Edit tag",
        "notas_delete_tag": "Delete tag",
        "notas_tags": "Tags:",
        "notas_add_tag_to_note": "Add tag to note",
        "profile": "Profile",
        "auditorio_title": "Auditorium",
        "library_button": "Library"
    };

    // ========== MÓDULO I18N ==========
    const I18n = {
        async loadTranslations(lang) {
            // Tenta usar o módulo central i18n se disponível
            if (window.i18n && typeof window.i18n.loadTranslations === 'function') {
                try {
                    await window.i18n.loadTranslations(lang);
                    state.translations = window.i18n.getTranslations ? window.i18n.getTranslations() : {};
                    if (Object.keys(state.translations).length > 0) {
                        console.log('[Notas] Traduções carregadas do módulo central i18n');
                        return true;
                    }
                } catch (e) {
                    console.warn('[Notas] Falha ao carregar do módulo central:', e);
                }
            }

            // Fallback: tenta carregar o arquivo JSON diretamente
            const paths = [
                `../lang/${lang}.json`,
                `./lang/${lang}.json`,
                `lang/${lang}.json`,
                `/lang/${lang}.json`
            ];
            for (const path of paths) {
                try {
                    console.log(`[Notas] Tentando carregar traduções de: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        state.translations = await response.json();
                        console.log(`[Notas] Traduções carregadas com sucesso de ${path}`);
                        return true;
                    } else {
                        console.warn(`[Notas] Falha ao carregar ${path}: HTTP ${response.status}`);
                    }
                } catch (e) {
                    console.warn(`[Notas] Erro ao tentar ${path}:`, e.message);
                }
            }
            // Fallback inline
            console.warn('[Notas] Nenhum arquivo de tradução encontrado. Usando fallback inline.');
            state.translations = (lang === 'en') ? { ...FALLBACK_EN } : { ...FALLBACK_PT };
            return false;
        },

        t(key, fallback = '') {
            // Se window.t estiver disponível (módulo central), usa-o
            if (window.t && typeof window.t === 'function') {
                try {
                    return window.t(key);
                } catch (e) {
                    // fallback
                }
            }
            return state.translations[key] || fallback || key;
        },

        applyTranslations() {
            if (!state.translations || Object.keys(state.translations).length === 0) {
                console.warn('[Notas] applyTranslations ignorado: traduções vazias.');
                return;
            }

            // Se window.applyTranslations estiver disponível, usa-o para evitar duplicação
            if (window.applyTranslations && typeof window.applyTranslations === 'function') {
                try {
                    window.applyTranslations();
                    console.log('[Notas] applyTranslations delegado ao módulo central.');
                    // Ainda assim, aplica as específicas do módulo
                } catch (e) {
                    console.warn('[Notas] Erro ao chamar applyTranslations central:', e);
                }
            }

            // Aplica traduções específicas do módulo notas
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (state.translations[key]) {
                    // Verifica se o elemento tem ícone para preservá-lo
                    const icon = el.querySelector('i');
                    if (icon) {
                        // Preserva o ícone e atualiza o texto
                        const iconClone = icon.cloneNode(true);
                        el.innerHTML = '';
                        el.appendChild(iconClone);
                        el.appendChild(document.createTextNode(' ' + state.translations[key]));
                    } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                        el.placeholder = state.translations[key];
                    } else {
                        el.innerText = state.translations[key];
                    }
                } else {
                    console.warn(`[Notas] Chave não encontrada: ${key}`);
                }
            });
            // Placeholders
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (state.translations[key]) el.placeholder = state.translations[key];
            });
            // Títulos (tooltips)
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                if (state.translations[key]) el.title = state.translations[key];
            });
            // Título da página
            document.title = this.t('notas_title');
            // Placeholder do Quill
            this.updateQuillPlaceholder();
            // Botão de perfil (se não tiver imagem ou iniciais personalizadas)
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn && profileBtn.getAttribute('data-profile-custom') !== 'true' &&
                !profileBtn.querySelector('img') && !profileBtn.querySelector('.profile-initials')) {
                const icon = profileBtn.querySelector('i');
                if (icon) {
                    const iconClone = icon.cloneNode(true);
                    profileBtn.innerHTML = '';
                    profileBtn.appendChild(iconClone);
                    profileBtn.appendChild(document.createTextNode(' ' + this.t('profile')));
                } else {
                    profileBtn.innerText = this.t('profile');
                }
            }
            console.log('[Notas] Traduções aplicadas.');
        },

        updateQuillPlaceholder() {
            if (quill) {
                const placeholder = this.t('notas_content_placeholder') || 'Escreva sua anotação aqui...';
                quill.root.setAttribute('data-placeholder', placeholder);
            }
        },

        async setLanguage(lang) {
            if (lang === state.currentLang && Object.keys(state.translations).length > 0) {
                // Já está no idioma, apenas reaplica para garantir
                this.applyTranslations();
                UIRenderer.renderNotasList();
                UIRenderer.updateEditorTitle();
                return;
            }
            state.currentLang = lang;
            await this.loadTranslations(lang);
            this.applyTranslations();
            UIRenderer.renderNotasList();
            UIRenderer.updateEditorTitle();
            UIRenderer.renderTagFilterChips();
            // Atualiza o seletor de idioma
            const langPtBtn = document.getElementById('langPtBtn');
            const langEnBtn = document.getElementById('langEnBtn');
            if (langPtBtn && langEnBtn) {
                langPtBtn.classList.toggle('active', lang === 'pt-br');
                langEnBtn.classList.toggle('active', lang === 'en');
            }
            localStorage.setItem('selectedLanguage', lang);
            // Dispara evento global para sincronizar outros módulos
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    };

    const CourseCatalog = {
        async load() {
            try {
                const response = await fetch('../cursos/courses.json');
                if (!response.ok) throw new Error('Falha ao carregar cursos');
                const courses = await response.json();
                state.courses = courses.filter(course => course && course.id && course.name);
            } catch (error) {
                console.error('[Notas] Erro ao carregar catálogo de cursos:', error);
                state.courses = [];
            }
            this.renderCourseOptions();
        },

        renderCourseOptions(selectedId = '') {
            const select = document.getElementById('notaCursoSelect');
            if (!select) return;
            const typeFilter = document.getElementById('notaTipoCursoSelect')?.value || 'all';
            const visibleCourses = state.courses.filter(course => typeFilter === 'all' || course.courseLevel === typeFilter);
            select.innerHTML = `<option value="">${I18n.t('notas_course_placeholder')}</option>` +
                visibleCourses.map(course => {
                    const levelKeys = {
                        graduacao: 'graduacao',
                        'ensino-medio': 'ensino_medio',
                        'pos-graduacao': 'pos_graduacao',
                        idiomas: 'idiomas'
                    };
                    const level = I18n.t(levelKeys[course.courseLevel] || course.courseLevel);
                    const type = course.courseType ? ` - ${I18n.t(course.courseType)}` : '';
                    return `<option value="${Utils.escapeHtml(course.id)}">${Utils.escapeHtml(course.name)} (${Utils.escapeHtml(level)}${Utils.escapeHtml(type)})</option>`;
                }).join('');
            select.disabled = visibleCourses.length === 0;
            select.value = visibleCourses.some(course => course.id === selectedId) ? selectedId : '';
        },

        async loadDisciplines(courseId) {
            const select = document.getElementById('notaDisciplinaSelect');
            if (!select) return;
            select.innerHTML = `<option value="">${I18n.t('loading')}</option>`;
            select.disabled = true;
            if (!courseId) {
                this.renderDisciplineOptions([]);
                return;
            }

            let data = state.courseDataCache.get(courseId);
            if (!data) {
                const path = COURSE_DATA_PATHS[courseId];
                if (!path) {
                    this.renderDisciplineOptions([]);
                    return;
                }
                try {
                    const response = await fetch(`../cursos/${path}`);
                    if (!response.ok) throw new Error('Falha ao carregar disciplinas');
                    data = await response.json();
                    state.courseDataCache.set(courseId, data);
                } catch (error) {
                    console.error('[Notas] Erro ao carregar disciplinas:', error);
                    this.renderDisciplineOptions([]);
                    return;
                }
            }

            const disciplines = (data.stages || []).flatMap(stage => stage.disciplines || [])
                .map(discipline => discipline.name)
                .filter(Boolean)
                .filter((name, index, names) => names.indexOf(name) === index);
            this.renderDisciplineOptions(disciplines);
        },

        renderDisciplineOptions(disciplines, selectedName = '') {
            const select = document.getElementById('notaDisciplinaSelect');
            if (!select) return;
            const placeholder = disciplines.length ? I18n.t('notas_discipline_placeholder') : I18n.t('notas_no_disciplines');
            select.innerHTML = `<option value="">${placeholder}</option>` +
                disciplines.map(name => `<option value="${Utils.escapeHtml(name)}">${Utils.escapeHtml(name)}</option>`).join('');
            select.disabled = disciplines.length === 0;
            select.value = selectedName;
        },

        async loadLessons(courseId, disciplineName, selectedLesson = '') {
            const select = document.getElementById('notaAulaSelect');
            if (!select) return;
            select.innerHTML = `<option value="">${I18n.t('loading')}</option>`;
            select.disabled = true;
            if (!courseId || !disciplineName) {
                this.renderLessonOptions(0);
                return;
            }

            let data = state.courseDataCache.get(courseId);
            if (!data) {
                await this.loadDisciplines(courseId);
                data = state.courseDataCache.get(courseId);
            }
            const discipline = (data?.stages || [])
                .flatMap(stage => stage.disciplines || [])
                .find(item => item.name === disciplineName);
            const lessonCount = discipline?.videoIds?.length || discipline?.lessons?.length ||
                (discipline?.type === 'external' || discipline?.type === 'exercise' ? 1 : 0);
            this.renderLessonOptions(lessonCount, selectedLesson);
        },

        renderLessonOptions(lessonCount, selectedLesson = '') {
            const select = document.getElementById('notaAulaSelect');
            if (!select) return;
            const options = lessonCount > 0
                ? `<option value="">${I18n.t('notas_lesson_placeholder')}</option><option value="all">${I18n.t('notas_general_lesson')}</option>` +
                    Array.from({ length: lessonCount }, (_, index) => `<option value="${index + 1}">${I18n.t('notas_lesson_format').replace('{{number}}', index + 1)}</option>`).join('')
                : `<option value="">${I18n.t('notas_lesson_placeholder')}</option>`;
            select.innerHTML = options;
            select.disabled = lessonCount === 0;
            select.value = selectedLesson ? String(selectedLesson) : '';
        },

        getSelected() {
            const courseSelect = document.getElementById('notaCursoSelect');
            const disciplineSelect = document.getElementById('notaDisciplinaSelect');
            const lessonSelect = document.getElementById('notaAulaSelect');
            const course = state.courses.find(item => item.id === courseSelect?.value);
            return {
                courseId: course?.id || '',
                courseName: course?.name || '',
                disciplineName: disciplineSelect?.value || '',
                lessonNumber: lessonSelect?.value && lessonSelect.value !== 'all' ? Number(lessonSelect.value) : '',
                lessonName: lessonSelect?.value && lessonSelect.value !== 'all'
                    ? I18n.t('notas_lesson_format').replace('{{number}}', lessonSelect.value)
                    : ''
            };
        },

        async setSelected(courseId = '', disciplineName = '', lessonNumber = '') {
            this.renderCourseOptions(courseId);
            await this.loadDisciplines(courseId);
            const disciplines = [...(document.getElementById('notaDisciplinaSelect')?.options || [])]
                .slice(1).map(option => option.value);
            this.renderDisciplineOptions(disciplines, disciplineName);
            await this.loadLessons(courseId, disciplineName, lessonNumber);
        },

        clearSelection() {
            this.renderCourseOptions('');
            this.renderDisciplineOptions([]);
            this.renderLessonOptions(0);
        }
    };

    // ========== MÓDULO DE ARMAZENAMENTO ==========
    const Storage = {
        loadNotas() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                state.notas = stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('Erro ao carregar notas:', e);
                state.notas = [];
            }
        },

        saveNotas() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state.notas));
            try {
                const event = new StorageEvent('storage', {
                    key: STORAGE_KEY,
                    newValue: JSON.stringify(state.notas)
                });
                window.dispatchEvent(event);
            } catch (e) {}
        },

        addNota(titulo, conteudoHtml, tags = [], courseId = '', courseName = '', disciplineName = '', lessonNumber = '', lessonName = '') {
            const now = new Date();
            const nota = {
                id: Date.now().toString(),
                titulo: titulo.trim(),
                conteudo: conteudoHtml,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                favorite: false,
                tags: tags,
                courseId,
                courseName,
                disciplineName,
                lessonNumber,
                lessonName
            };
            state.notas.unshift(nota);
            this.saveNotas();
            return nota;
        },

        updateNota(id, titulo, conteudoHtml, tags = null, courseId = '', courseName = '', disciplineName = '', lessonNumber = '', lessonName = '') {
            const index = state.notas.findIndex(n => n.id === id);
            if (index !== -1) {
                const updated = {
                    ...state.notas[index],
                    titulo: titulo.trim(),
                    conteudo: conteudoHtml,
                    updatedAt: new Date().toISOString()
                };
                if (tags !== null) {
                    updated.tags = tags;
                }
                updated.courseId = courseId;
                updated.courseName = courseName;
                updated.disciplineName = disciplineName;
                updated.lessonNumber = lessonNumber;
                updated.lessonName = lessonName;
                state.notas[index] = updated;
                this.saveNotas();
                return updated;
            }
            return null;
        },

        deleteNota(id) {
            state.notas = state.notas.filter(n => n.id !== id);
            this.saveNotas();
        }
    };

    // ========== MÓDULO DE TAGS ==========
    const TagManager = {
        loadTags() {
            try {
                const stored = localStorage.getItem(TAGS_STORAGE_KEY);
                state.tags = stored ? JSON.parse(stored) : [];
            } catch (e) {
                state.tags = [];
            }
        },

        saveTags() {
            localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(state.tags));
        },

        createTag(name, color) {
            const tag = { id: Date.now().toString(), name: name.trim(), color };
            state.tags.push(tag);
            this.saveTags();
            return tag;
        },

        updateTag(id, name, color) {
            const tag = state.tags.find(t => t.id === id);
            if (tag) {
                tag.name = name.trim();
                tag.color = color;
                this.saveTags();
            }
        },

        deleteTag(id) {
            state.notas.forEach(nota => {
                nota.tags = (nota.tags || []).filter(tagId => tagId !== id);
            });
            Storage.saveNotas();
            state.tags = state.tags.filter(t => t.id !== id);
            this.saveTags();
        },

        getTagById(id) {
            return state.tags.find(t => t.id === id);
        },

        renderExistingTags() {
            const container = document.getElementById('existingTagsList');
            if (!container) return;

            if (state.tags.length === 0) {
                container.innerHTML = `<p style="color: var(--text-secondary);">${I18n.t('notas_empty')}</p>`;
                return;
            }

            let html = '';
            state.tags.forEach(tag => {
                html += `
                    <div class="tag-item" data-tag-id="${tag.id}">
                        <div class="tag-info">
                            <span class="tag-color-dot" style="background: ${tag.color};"></span>
                            <span>${Utils.escapeHtml(tag.name)}</span>
                        </div>
                        <div class="tag-actions">
                            <button class="edit-tag-btn" data-id="${tag.id}" title="${I18n.t('notas_edit_tag')}"><i class="fas fa-pencil-alt"></i></button>
                            <button class="delete-tag-btn" data-id="${tag.id}" title="${I18n.t('notas_delete_tag')}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
            I18n.applyTranslations();

            container.querySelectorAll('.edit-tag-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const tag = state.tags.find(t => t.id === id);
                    if (tag) {
                        document.getElementById('newTagNameInput').value = tag.name;
                        document.getElementById('newTagColorInput').value = tag.color;
                        document.getElementById('addTagBtn').setAttribute('data-editing-id', id);
                        document.getElementById('addTagBtn').innerHTML = '<i class="fas fa-save"></i> ' + I18n.t('notas_save');
                    }
                });
            });

            container.querySelectorAll('.delete-tag-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    if (confirm(I18n.t('notas_confirm_delete'))) {
                        TagManager.deleteTag(id);
                        TagManager.renderExistingTags();
                        UIRenderer.renderNotasList();
                        UIRenderer.renderTagFilterChips();
                    }
                });
            });
        }
    };

    // ========== MÓDULO DE UTILITÁRIOS ==========
    const Utils = {
        stripHtml(html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString(state.currentLang === 'pt-br' ? 'pt-BR' : 'en-US', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        },

        escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }
    };

    // ========== MÓDULO DE RENDERIZAÇÃO ==========
    const UIRenderer = {
        updateEditorTitle() {
            const editorTitle = document.querySelector('.editor-title');
            if (editorTitle) {
                editorTitle.innerText = state.editingId ? I18n.t('notas_edit') : I18n.t('notas_editor_title');
            }
        },

        renderTagFilterChips() {
            const container = document.getElementById('tagChips');
            const filterContainer = document.getElementById('tagFilterContainer');
            if (!container || !filterContainer) return;

            if (state.tags.length === 0) {
                filterContainer.style.display = 'none';
                return;
            }
            filterContainer.style.display = 'flex';

            let html = `<div class="chip ${state.tagFilter === null ? 'active' : ''}" data-tag-id="">${I18n.t('notas_all_tags')}</div>`;
            state.tags.forEach(tag => {
                html += `<div class="chip ${state.tagFilter === tag.id ? 'active' : ''}" style="border-color: ${tag.color};" data-tag-id="${tag.id}">
                    <span class="tag-color-dot" style="background: ${tag.color};"></span> ${Utils.escapeHtml(tag.name)}
                </div>`;
            });
            container.innerHTML = html;
            I18n.applyTranslations();

            container.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const tagId = chip.dataset.tagId || null;
                    state.tagFilter = tagId;
                    this.renderTagFilterChips();
                    this.renderNotasList();
                });
            });
        },

        renderNoteTagsSelector(selectedTagIds = []) {
            const container = document.getElementById('availableTagsContainer');
            const selectorDiv = document.getElementById('noteTagsSelector');
            if (!container || !selectorDiv) return;

            if (state.tags.length === 0) {
                selectorDiv.style.display = 'none';
                return;
            }
            selectorDiv.style.display = 'flex';

            let html = '';
            state.tags.forEach(tag => {
                const isSelected = selectedTagIds.includes(tag.id);
                html += `<span class="selectable-tag ${isSelected ? 'selected' : ''}" style="background: ${tag.color}20; border-color: ${tag.color};" data-tag-id="${tag.id}">
                    ${Utils.escapeHtml(tag.name)}
                </span>`;
            });
            container.innerHTML = html;
            I18n.applyTranslations();

            container.querySelectorAll('.selectable-tag').forEach(el => {
                el.addEventListener('click', () => {
                    const tagId = el.dataset.tagId;
                    const currentTags = this.getSelectedTagsFromSelector();
                    const index = currentTags.indexOf(tagId);
                    if (index > -1) {
                        currentTags.splice(index, 1);
                    } else {
                        currentTags.push(tagId);
                    }
                    this.renderNoteTagsSelector(currentTags);
                });
            });
        },

        getSelectedTagsFromSelector() {
            const container = document.getElementById('availableTagsContainer');
            if (!container) return [];
            const selected = [];
            container.querySelectorAll('.selectable-tag.selected').forEach(el => {
                selected.push(el.dataset.tagId);
            });
            return selected;
        },

        renderNotasList() {
            const searchTerm = elements.searchInput ? elements.searchInput.value.trim().toLowerCase() : '';
            let filteredNotas = state.notas;
            
            if (searchTerm) {
                filteredNotas = state.notas.filter(nota => 
                    nota.titulo.toLowerCase().includes(searchTerm) || 
                    Utils.stripHtml(nota.conteudo).toLowerCase().includes(searchTerm) ||
                    (nota.courseName || '').toLowerCase().includes(searchTerm) ||
                    (nota.disciplineName || '').toLowerCase().includes(searchTerm) ||
                    (nota.lessonName || '').toLowerCase().includes(searchTerm)
                );
            }

            if (state.tagFilter) {
                filteredNotas = filteredNotas.filter(nota => (nota.tags || []).includes(state.tagFilter));
            }

            elements.notasCount.textContent = filteredNotas.length;

            if (filteredNotas.length === 0) {
                elements.notasList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-book-open" aria-hidden="true"></i>
                        <p>${I18n.t('notas_empty')}</p>
                    </div>
                `;
                I18n.applyTranslations();
                this.renderTagFilterChips();
                return;
            }

            let html = '';
            filteredNotas.forEach(nota => {
                const plainText = Utils.stripHtml(nota.conteudo);
                const preview = plainText.length > 150 
                    ? plainText.substring(0, 150) + '…' 
                    : plainText;
                
                const statusText = nota.createdAt === nota.updatedAt 
                    ? I18n.t('notas_created') 
                    : I18n.t('notas_updated');
                
                let tagsHtml = '';
                if (nota.tags && nota.tags.length) {
                    tagsHtml = '<div class="note-tags">';
                    nota.tags.forEach(tagId => {
                        const tag = TagManager.getTagById(tagId);
                        if (tag) {
                            tagsHtml += `<span class="note-tag" style="background: ${tag.color}20; color: ${tag.color}; border-left: 3px solid ${tag.color};">${Utils.escapeHtml(tag.name)}</span>`;
                        }
                    });
                    tagsHtml += '</div>';
                }

                const contextHtml = nota.courseName || nota.disciplineName
                    ? `<div class="note-context">
                        ${nota.courseName ? `<span><i class="fas fa-graduation-cap" aria-hidden="true"></i> ${Utils.escapeHtml(nota.courseName)}</span>` : ''}
                        ${nota.disciplineName ? `<span><i class="fas fa-book-open" aria-hidden="true"></i> ${Utils.escapeHtml(nota.disciplineName)}</span>` : ''}
                        ${nota.lessonName ? `<span><i class="fas fa-play-circle" aria-hidden="true"></i> ${Utils.escapeHtml(nota.lessonName)}</span>` : ''}
                    </div>`
                    : '';
                
                html += `
                    <div class="note-card" data-id="${nota.id}" role="article">
                        <div class="note-card-header">
                            <div class="note-card-title">${Utils.escapeHtml(nota.titulo)}</div>
                            <div class="note-card-actions">
                                <button class="favorite-btn" data-id="${nota.id}" title="${I18n.t('notas_favorite')}" aria-label="Favoritar nota">
                                    <i class="fas fa-star${nota.favorite ? '' : '-o'}"></i>
                                </button>
                                <button class="edit-btn" data-id="${nota.id}" title="${I18n.t('notas_edit')}" aria-label="Editar nota">
                                    <i class="fas fa-pencil-alt" aria-hidden="true"></i>
                                </button>
                                <button class="delete-btn" data-id="${nota.id}" title="${I18n.t('notas_delete')}" aria-label="Excluir nota">
                                    <i class="fas fa-trash-alt" aria-hidden="true"></i>
                                </button>
                            </div>
                        </div>
                        <div class="note-card-content">${Utils.escapeHtml(preview)}</div>
                        ${contextHtml}
                        ${tagsHtml}
                        <div class="note-card-footer">
                            <span class="note-date">
                                <i class="far fa-calendar-alt" aria-hidden="true"></i> 
                                ${Utils.formatDate(nota.updatedAt)}
                            </span>
                            <span>
                                <i class="far fa-clock" aria-hidden="true"></i> 
                                ${statusText}
                            </span>
                        </div>
                    </div>
                `;
            });
            elements.notasList.innerHTML = html;

            this.attachCardEventListeners();
            this.renderTagFilterChips();
            I18n.applyTranslations();
        },

        attachCardEventListeners() {
            document.querySelectorAll('.note-card').forEach(card => {
                const id = card.dataset.id;
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('button')) {
                        this.editNotaById(id);
                    }
                });
            });

            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editNotaById(btn.dataset.id);
                });
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(I18n.t('notas_confirm_delete'))) {
                        Storage.deleteNota(btn.dataset.id);
                        this.renderNotasList();
                    }
                });
            });

            document.querySelectorAll('.favorite-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const nota = state.notas.find(n => n.id === id);
                    if (nota) {
                        nota.favorite = !nota.favorite;
                        Storage.saveNotas();
                        this.renderNotasList();
                    }
                });
            });
        },

        editNotaById(id) {
            const nota = state.notas.find(n => n.id === id);
            if (!nota) return;

            state.editingId = id;
            elements.tituloInput.value = nota.titulo;
            CourseCatalog.setSelected(nota.courseId || '', nota.disciplineName || '', nota.lessonNumber || '');
            
            if (quill) {
                quill.root.innerHTML = nota.conteudo;
            }
            
            elements.cancelBtn.style.display = 'inline-flex';
            this.updateEditorTitle();

            this.renderNoteTagsSelector(nota.tags || []);

            document.querySelector('.note-editor-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

        clearEditor() {
            elements.tituloInput.value = '';
            CourseCatalog.clearSelection();
            if (quill) {
                quill.root.innerHTML = '';
                quill.setContents([]);
            }
            state.editingId = null;
            elements.cancelBtn.style.display = 'none';
            document.getElementById('noteTagsSelector').style.display = 'none';
            const addBtn = document.getElementById('addTagBtn');
            if (addBtn) {
                addBtn.removeAttribute('data-editing-id');
                addBtn.innerHTML = '<i class="fas fa-plus"></i> ' + I18n.t('notas_add_tag');
            }
            this.updateEditorTitle();
        },

        handleSaveNota() {
            const titulo = elements.tituloInput.value.trim();
            const conteudoHtml = quill ? quill.root.innerHTML : '';

            if (!titulo) {
                const notice = document.getElementById('notaTitleNotice');
                if (notice) {
                    notice.hidden = false;
                    window.clearTimeout(notice.hideTimeout);
                    notice.hideTimeout = window.setTimeout(() => { notice.hidden = true; }, 4000);
                }
                elements.tituloInput.focus();
                return;
            }

            const selectedTags = this.getSelectedTagsFromSelector();
            const selectedCourse = CourseCatalog.getSelected();

            if (state.editingId) {
                Storage.updateNota(state.editingId, titulo, conteudoHtml, selectedTags, selectedCourse.courseId, selectedCourse.courseName, selectedCourse.disciplineName, selectedCourse.lessonNumber, selectedCourse.lessonName);
            } else {
                Storage.addNota(titulo, conteudoHtml, selectedTags, selectedCourse.courseId, selectedCourse.courseName, selectedCourse.disciplineName, selectedCourse.lessonNumber, selectedCourse.lessonName);
            }

            this.clearEditor();
            this.renderNotasList();
        }
    };

    // ========== INICIALIZAÇÃO DO QUILL ==========
    function initQuill() {
        quill = new Quill('#quillEditor', {
            theme: 'snow',
            placeholder: 'Escreva sua anotação aqui...',
            modules: {
                toolbar: {
                    container: [
                        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
                        [{ 'script': 'sub' }, { 'script': 'super' }],
                        [{ 'indent': '-1' }, { 'indent': '+1' }],
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'font': [] }],
                        [{ 'align': [] }],
                        ['link', 'image', 'video', 'formula'],
                        ['clean']
                    ]
                },
                clipboard: { matchVisual: false }
            }
        });

        I18n.updateQuillPlaceholder();
    }

    // ========== GERENCIAMENTO DO MODAL DE TAGS ==========
    function initTagManagerModal() {
        const modal = document.getElementById('tagManagerModal');
        const closeBtn = document.getElementById('closeTagManagerModal');
        const addBtn = document.getElementById('addTagBtn');
        const nameInput = document.getElementById('newTagNameInput');
        const colorInput = document.getElementById('newTagColorInput');

        document.getElementById('manageTagsBtn').addEventListener('click', () => {
            TagManager.renderExistingTags();
            modal.style.display = 'flex';
            I18n.applyTranslations();
            nameInput.value = '';
            colorInput.value = '#2563EB';
            addBtn.removeAttribute('data-editing-id');
            addBtn.innerHTML = '<i class="fas fa-plus"></i> ' + I18n.t('notas_add_tag');
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });

        addBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert('O nome da tag é obrigatório.');
                return;
            }
            const color = colorInput.value;
            const editingId = addBtn.getAttribute('data-editing-id');

            if (editingId) {
                TagManager.updateTag(editingId, name, color);
                addBtn.removeAttribute('data-editing-id');
                addBtn.innerHTML = '<i class="fas fa-plus"></i> ' + I18n.t('notas_add_tag');
            } else {
                TagManager.createTag(name, color);
            }

            nameInput.value = '';
            colorInput.value = '#2563EB';
            TagManager.renderExistingTags();
            UIRenderer.renderNotasList();
            UIRenderer.renderTagFilterChips();
        });
    }

    // ========== PERFIL E EXPORTAÇÃO ==========
    function initProfile() {
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                if (window.openProfileModal) {
                    window.openProfileModal();
                } else {
                    const modal = document.getElementById('profileModal');
                    if (modal) {
                        modal.style.display = 'flex';
                        if (window.updateProfileModal) window.updateProfileModal();
                    }
                }
            });
        }
    }

    // ========== REAGIR A MUDANÇAS DE IDIOMA GLOBAIS ==========
    function initGlobalLanguageListener() {
        window.addEventListener('languageChanged', function(e) {
            const lang = e.detail.lang || 'pt-br';
            console.log('[Notas] Idioma global alterado para:', lang);
            I18n.setLanguage(lang).then(() => {
                const selectedCourse = document.getElementById('notaCursoSelect')?.value || '';
                CourseCatalog.renderCourseOptions(selectedCourse);
                CourseCatalog.loadDisciplines(selectedCourse);
            });
        });
    }

    // ========== INICIALIZAÇÃO ==========
    async function init() {
        // Capturar elementos do DOM
        elements = {
            tituloInput: document.getElementById('notaTituloInput'),
            saveBtn: document.getElementById('saveNotaBtn'),
            cancelBtn: document.getElementById('cancelEditBtn'),
            clearEditorBtn: document.getElementById('clearEditorBtn'),
            notasList: document.getElementById('notasList'),
            notasCount: document.getElementById('notasCount'),
            searchInput: document.getElementById('searchNotasInput'),
            tipoCursoSelect: document.getElementById('notaTipoCursoSelect'),
            cursoSelect: document.getElementById('notaCursoSelect'),
            disciplinaSelect: document.getElementById('notaDisciplinaSelect'),
            aulaSelect: document.getElementById('notaAulaSelect')
        };

        initQuill();

        // Carregar idioma salvo ou do navegador
        const savedLang = localStorage.getItem('selectedLanguage') || 
            (navigator.language?.startsWith('pt') ? 'pt-br' : 'en');
        state.currentLang = savedLang;
        await I18n.loadTranslations(savedLang);
        I18n.applyTranslations();
        await CourseCatalog.load();

        TagManager.loadTags();
        Storage.loadNotas();
        UIRenderer.renderNotasList();

        initTagManagerModal();
        initProfile();
        initGlobalLanguageListener();

        // Event listeners
        elements.saveBtn.addEventListener('click', () => UIRenderer.handleSaveNota());
        elements.cancelBtn.addEventListener('click', () => UIRenderer.clearEditor());
        elements.clearEditorBtn.addEventListener('click', () => UIRenderer.clearEditor());

        if (elements.cursoSelect) {
            elements.cursoSelect.addEventListener('change', async () => {
                await CourseCatalog.loadDisciplines(elements.cursoSelect.value);
                CourseCatalog.loadLessons(elements.cursoSelect.value, '');
            });
        }
        if (elements.tipoCursoSelect) {
            elements.tipoCursoSelect.addEventListener('change', () => {
                CourseCatalog.renderCourseOptions('');
                CourseCatalog.renderDisciplineOptions([]);
                CourseCatalog.renderLessonOptions(0);
            });
        }
        if (elements.disciplinaSelect) {
            elements.disciplinaSelect.addEventListener('change', () => {
                CourseCatalog.loadLessons(elements.cursoSelect?.value || '', elements.disciplinaSelect.value);
            });
        }
        
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', () => UIRenderer.renderNotasList());
        }

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                UIRenderer.handleSaveNota();
            }
        });

        // Botões de idioma locais
        const langPtBtn = document.getElementById('langPtBtn');
        const langEnBtn = document.getElementById('langEnBtn');
        if (langPtBtn) {
            langPtBtn.addEventListener('click', () => I18n.setLanguage('pt-br'));
        }
        if (langEnBtn) {
            langEnBtn.addEventListener('click', () => I18n.setLanguage('en'));
        }

        // Sincronizar com outras abas
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY) {
                Storage.loadNotas();
                UIRenderer.renderNotasList();
                UIRenderer.renderTagFilterChips();
            }
            if (e.key === TAGS_STORAGE_KEY) {
                TagManager.loadTags();
                UIRenderer.renderNotasList();
                UIRenderer.renderTagFilterChips();
            }
        });

        UIRenderer.updateEditorTitle();

        console.log('[Notas] Aplicação inicializada com sucesso');
    }

    // ========== EXPOSIÇÃO GLOBAL ==========
    window.NoteApp = {
        init,
        I18n,
        Storage,
        TagManager,
        Utils,
        UIRenderer
    };

    // Inicializar quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NoteApp.init());
    } else {
        NoteApp.init();
    }

})();