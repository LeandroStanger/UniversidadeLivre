// cursos/notas/notas.js – Gerenciador de notas modular com Quill 2.0.3
// v2.0.0 - Adicionado favoritos, tags e filtro por tags
// Correção: fallback de traduções completo e aplicação dinâmica

const NoteApp = (function() {
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
        tagFilter: null    // ID da tag ativa no filtro (null = todas)
    };

    // Elementos do DOM
    let elements = {};
    
    // Quill editor
    let quill = null;

    // ========== MÓDULO I18N ==========
    const I18n = {
        async loadTranslations(lang) {
            try {
                const response = await fetch(`../lang/${lang}.json`);
                if (!response.ok) throw new Error();
                state.translations = await response.json();
                console.log(`[i18n] Traduções carregadas de ../lang/${lang}.json`);
                return true;
            } catch (error) {
                console.warn(`[i18n] Falha ao carregar ${lang}, usando fallback.`);
                if (lang !== 'pt-br') return this.loadTranslations('pt-br');
                state.translations = this.getFallbackTranslations();
                return false;
            }
        },

        getFallbackTranslations() {
            return {
                "notas_title": "Notas de Estudo · Universidade Livre",
                "notas_subtitle": "Caderno de Estudos",
                "notas_heading": "Minhas Notas",
                "notas_description": "Crie e organize suas anotações com formatação rica, imagens e muito mais.",
                "notas_editor_title": "Nova Nota",
                "notas_clear_editor": "Limpar editor",
                "notas_title_placeholder": "Título da nota...",
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
                // Novas chaves para tags e favoritos
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
                "notas_add_tag_to_note": "Adicionar tag à nota"
            };
        },

        t(key, fallback = '') {
            return state.translations[key] || fallback || key;
        },

        applyTranslations() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (state.translations[key]) {
                    if (el.tagName === 'INPUT') {
                        el.placeholder = state.translations[key];
                    } else {
                        el.innerText = state.translations[key];
                    }
                }
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (state.translations[key]) el.placeholder = state.translations[key];
            });
            document.querySelectorAll('[data-i18n-title]').forEach(el => {
                const key = el.getAttribute('data-i18n-title');
                if (state.translations[key]) el.title = state.translations[key];
            });
            document.title = this.t('notas_title');
            this.updateQuillPlaceholder();
        },

        updateQuillPlaceholder() {
            if (quill) {
                const placeholder = this.t('notas_content_placeholder') || 'Escreva sua anotação aqui...';
                quill.root.setAttribute('data-placeholder', placeholder);
            }
        },

        async setLanguage(lang) {
            state.currentLang = lang;
            await this.loadTranslations(lang);
            this.applyTranslations();
            UIRenderer.renderNotasList();
            UIRenderer.updateEditorTitle();
            localStorage.setItem('selectedLanguage', lang);
            
            const langPtBtn = document.getElementById('langPtBtn');
            const langEnBtn = document.getElementById('langEnBtn');
            if (langPtBtn && langEnBtn) {
                langPtBtn.classList.toggle('active', lang === 'pt-br');
                langEnBtn.classList.toggle('active', lang === 'en');
            }
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
        },

        addNota(titulo, conteudoHtml, tags = []) {
            const now = new Date();
            const nota = {
                id: Date.now().toString(),
                titulo: titulo.trim(),
                conteudo: conteudoHtml,
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                favorite: false,
                tags: tags
            };
            state.notas.unshift(nota);
            this.saveNotas();
            return nota;
        },

        updateNota(id, titulo, conteudoHtml, tags = null) {
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
            // Remove a tag de todas as notas
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

        // Renderiza a lista de tags existentes no modal de gerenciamento
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
            I18n.applyTranslations(); // Garantir textos nos botões

            // Adicionar listeners para editar/excluir tags
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

        // Renderiza os chips de filtro por tag
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

            container.querySelectorAll('.chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const tagId = chip.dataset.tagId || null;
                    state.tagFilter = tagId;
                    this.renderTagFilterChips();
                    this.renderNotasList();
                });
            });
        },

        // Renderiza as tags disponíveis no seletor da nota
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

            // Toggle de seleção
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
                    Utils.stripHtml(nota.conteudo).toLowerCase().includes(searchTerm)
                );
            }

            // Filtro por tag
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
                
                // Construir badges de tags
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
            I18n.applyTranslations(); // Garantir textos dinâmicos (placeholders, etc.)
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
            
            if (quill) {
                quill.root.innerHTML = nota.conteudo;
            }
            
            elements.cancelBtn.style.display = 'inline-flex';
            this.updateEditorTitle();

            // Exibir seletor de tags e marcar as tags da nota
            this.renderNoteTagsSelector(nota.tags || []);

            document.querySelector('.note-editor-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

        clearEditor() {
            elements.tituloInput.value = '';
            if (quill) {
                quill.root.innerHTML = '';
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
                alert('O título da nota é obrigatório.');
                return;
            }

            const selectedTags = this.getSelectedTagsFromSelector();

            if (state.editingId) {
                Storage.updateNota(state.editingId, titulo, conteudoHtml, selectedTags);
            } else {
                Storage.addNota(titulo, conteudoHtml, selectedTags);
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
            I18n.applyTranslations(); // Traduzir textos do modal
            // Reset form
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
            searchInput: document.getElementById('searchNotasInput')
        };

        initQuill();

        const savedLang = localStorage.getItem('selectedLanguage') || 
            (navigator.language?.startsWith('pt') ? 'pt-br' : 'en');
        await I18n.setLanguage(savedLang);

        TagManager.loadTags();
        Storage.loadNotas();
        UIRenderer.renderNotasList();

        initTagManagerModal();

        // Event listeners
        elements.saveBtn.addEventListener('click', () => UIRenderer.handleSaveNota());
        elements.cancelBtn.addEventListener('click', () => UIRenderer.clearEditor());
        elements.clearEditorBtn.addEventListener('click', () => UIRenderer.clearEditor());
        
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', () => UIRenderer.renderNotasList());
        }

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                UIRenderer.handleSaveNota();
            }
        });

        document.getElementById('langPtBtn')?.addEventListener('click', () => I18n.setLanguage('pt-br'));
        document.getElementById('langEnBtn')?.addEventListener('click', () => I18n.setLanguage('en'));

        UIRenderer.updateEditorTitle();
    }

    // API pública para extensibilidade futura
    return {
        init,
        I18n,
        Storage,
        TagManager,
        Utils,
        UIRenderer
    };
})();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    NoteApp.init();
});