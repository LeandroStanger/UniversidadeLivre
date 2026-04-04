// biblioteca.js – com i18n completo, suporte a download_label traduzido e detecção inteligente
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('booksGrid');
    const searchInput = document.getElementById('searchInput');
    const modal = document.getElementById('bookModal');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.querySelector('.close-modal');

    let allBooks = [];
    let currentLang = 'pt-br';
    let translations = {};
    let currentOpenBook = null;

    // ========== i18n ==========
    async function loadTranslations(lang) {
        console.log(`[i18n Biblioteca] Carregando traduções para: ${lang}`);
        try {
            const response = await fetch(`../lang/${lang}.json`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            translations = await response.json();
            console.log(`[i18n Biblioteca] Traduções carregadas para ${lang}`, translations);
            return true;
        } catch (error) {
            console.error(`[i18n Biblioteca] Erro ao carregar traduções para ${lang}:`, error);
            if (lang !== 'pt-br') return loadTranslations('pt-br');
            translations = {
                "library_title": "Biblioteca",
                "library_subtitle": "Biblioteca Digital",
                "library_book_count": "livros",
                "library_no_books": "Nenhum livro encontrado.",
                "library_download": "Baixar Livro",
                "library_github": "GitHub",
                "back_to_courses": "Voltar",
                "book_author": "Autor",
                "book_year": "Ano",
                "book_language": "Idioma",
                "book_subject": "Assunto",
                "book_publisher": "Editora",
                "book_isbn": "ISBN",
                "book_more_info": "Ver mais informações",
                "download_book": "Baixar Livro",
                "access_online": "Acessar Online",
                "lang_english": "Inglês",
                "lang_portuguese": "Português",
                "lang_spanish": "Espanhol"
            };
            return false;
        }
    }

    function t(key, replacements = {}) {
        let text = translations[key] || key;
        for (const [k, v] of Object.entries(replacements)) {
            text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
        }
        return text;
    }

    function translateDownloadLabel(label) {
        if (!label || label.trim() === '') return t('download_book');
        
        const normalized = label.toLowerCase().trim();
        console.log(`[download_label] valor original: "${label}", normalizado: "${normalized}"`);
        
        if (normalized === 'baixar livro' || normalized === 'download book') {
            const translated = t('download_book');
            console.log(`[download_label] traduzido para: "${translated}"`);
            return translated;
        }
        
        if (normalized === 'acessar online' || normalized === 'access online') {
            const translated = t('access_online');
            console.log(`[download_label] traduzido para: "${translated}"`);
            return translated;
        }
        
        console.log(`[download_label] mantendo original: "${label}"`);
        return label;
    }

    function translateBookLanguage(langCode) {
        const langMap = {
            "English": t("lang_english"),
            "Portuguese": t("lang_portuguese"),
            "Spanish": t("lang_spanish"),
            "en": t("lang_english"),
            "pt": t("lang_portuguese"),
            "es": t("lang_spanish")
        };
        return langMap[langCode] || langCode;
    }

    function getButtonIcon(book) {
        const label = (book.download_label || '').toLowerCase();
        if (label.includes('acessar') || label.includes('access') || label.includes('online')) {
            return 'fa-external-link-alt';
        }
        return 'fa-download';
    }

    function applyTranslations() {
        if (!translations || Object.keys(translations).length === 0) {
            console.warn('[i18n Biblioteca] Traduções não carregadas, ignorando apply');
            return;
        }
        console.log('[i18n Biblioteca] Aplicando traduções');
        
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && translations[key]) {
                if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                    el.placeholder = translations[key];
                } else if (el.innerHTML.includes('<i') && !el.hasAttribute('data-i18n-raw')) {
                    const icon = el.querySelector('i');
                    if (icon) {
                        const cloneIcon = icon.cloneNode(true);
                        el.innerHTML = '';
                        el.appendChild(cloneIcon);
                        el.appendChild(document.createTextNode(' ' + translations[key]));
                    } else {
                        el.innerText = translations[key];
                    }
                } else {
                    el.innerText = translations[key];
                }
            }
        });
        
        document.title = t('library_title');
        const bookCountSpan = document.getElementById('bookCount');
        if (bookCountSpan) {
            bookCountSpan.innerText = allBooks.length;
        }
        
        if (currentOpenBook) {
            showModal(currentOpenBook);
        }
    }

    function updateLanguageSelector(lang) {
        const ptBtn = document.getElementById('langPtBtn');
        const enBtn = document.getElementById('langEnBtn');
        if (ptBtn && enBtn) {
            if (lang === 'pt-br') {
                ptBtn.classList.add('active');
                enBtn.classList.remove('active');
            } else if (lang === 'en') {
                enBtn.classList.add('active');
                ptBtn.classList.remove('active');
            }
        }
    }

    async function setLanguage(lang) {
        if (lang === currentLang && Object.keys(translations).length > 0) {
            console.log('[i18n Biblioteca] Idioma já carregado, ignorando');
            return;
        }
        const success = await loadTranslations(lang);
        if (success || Object.keys(translations).length > 0) {
            currentLang = lang;
            localStorage.setItem('selectedLanguage', lang);
            applyTranslations();
            updateLanguageSelector(lang);
            renderBooks(allBooks);
        }
    }

    const langPtBtn = document.getElementById('langPtBtn');
    const langEnBtn = document.getElementById('langEnBtn');
    if (langPtBtn && langEnBtn) {
        langPtBtn.addEventListener('click', () => setLanguage('pt-br'));
        langEnBtn.addEventListener('click', () => setLanguage('en'));
    }

    // ========== LÓGICA DA BIBLIOTECA ==========
    function closeModal() {
        modal.style.display = 'none';
        modalBody.innerHTML = '';
        currentOpenBook = null;
    }
    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.style.display === 'flex') closeModal(); });

    async function loadBooks() {
        try {
            const response = await fetch('books.json');
            if (!response.ok) throw new Error('Erro ao carregar livros');
            allBooks = await response.json();
            document.getElementById('bookCount').innerText = allBooks.length;
            renderBooks(allBooks);
            const pendingBookId = localStorage.getItem('openBookId');
            if (pendingBookId) {
                const book = allBooks.find(b => b.id === pendingBookId);
                if (book) showModal(book);
                localStorage.removeItem('openBookId');
            }
            const highlightTitle = localStorage.getItem('highlightBook');
            if (highlightTitle) {
                localStorage.removeItem('highlightBook');
                highlightBook(highlightTitle);
            }
        } catch (error) {
            console.error('Erro ao carregar biblioteca:', error);
            grid.innerHTML = '<p>Erro ao carregar os livros. Tente novamente mais tarde.</p>';
        }
    }

    function renderBooks(books) {
        if (books.length === 0) {
            grid.innerHTML = `<p>${t('library_no_books')}</p>`;
            return;
        }
        grid.innerHTML = books.map(book => `
            <div class="book-mini-card" data-id="${book.id}">
                <img class="mini-cover" src="${book.cover}" alt="${escapeHtml(book.title)}" onerror="this.src='https://placehold.co/200x260/1F2933/9CA3AF?text=Sem+Imagem'">
                <div class="mini-title">${escapeHtml(book.title)}</div>
                <div class="mini-author">${escapeHtml(book.author)}</div>
                <div class="mini-year">${escapeHtml(book.year || 'Ano não informado')}</div>
            </div>
        `).join('');
        
        document.querySelectorAll('.book-mini-card').forEach(card => {
            const id = card.dataset.id;
            const book = allBooks.find(b => b.id === id);
            if (book) card.addEventListener('click', () => showModal(book));
        });
        
        applyTranslations();
    }

    function showModal(book) {
        currentOpenBook = book;
        const coverHtml = `<img class="modal-cover" src="${book.cover}" alt="${escapeHtml(book.title)}" onerror="this.src='https://placehold.co/140x200/1F2933/9CA3AF?text=Sem+Imagem'">`;
        
        const authorLabel = t('book_author');
        const yearLabel = t('book_year');
        const languageLabel = t('book_language');
        const subjectLabel = t('book_subject');
        const publisherLabel = t('book_publisher');
        const isbnLabel = t('book_isbn');
        
        let languageDisplay = book.language ? translateBookLanguage(book.language) : t('book_language') + ' não informado';
        
        const downloadLabelTranslated = translateDownloadLabel(book.download_label || t('download_book'));
        const buttonIcon = getButtonIcon(book);
        
        const detailsHtml = `
            <div class="modal-details">
                <h2>${escapeHtml(book.title)}</h2>
                <p><strong>${authorLabel}:</strong> ${escapeHtml(book.author)}</p>
                <p><strong>${yearLabel}:</strong> ${escapeHtml(book.year || 'Não informado')}</p>
                <p><strong>${languageLabel}:</strong> ${escapeHtml(languageDisplay)}</p>
                <p><strong>${subjectLabel}:</strong> ${escapeHtml(book.subject || 'Geral')}</p>
                <p><strong>${publisherLabel}:</strong> ${escapeHtml(book.publisher || 'Não informada')}</p>
                ${book.isbn ? `<p><strong>${isbnLabel}:</strong> ${escapeHtml(book.isbn)}</p>` : ''}
                <div class="modal-description">${escapeHtml(book.description)}</div>
                <div class="modal-actions">
                    <a href="${escapeHtml(book.download)}" class="download-btn" target="_blank" rel="noopener noreferrer">
                        <i class="fas ${buttonIcon}"></i> ${downloadLabelTranslated}
                    </a>
                    <a href="${escapeHtml(book.repositoryLink || 'https://github.com/KAYOKG/BibliotecaDev')}" class="repo-btn" target="_blank" rel="noopener noreferrer">
                        <i class="fab fa-github"></i> ${t('library_github')}
                    </a>
                </div>
            </div>
        `;
        modalBody.innerHTML = `<div style="display: flex; gap: 1.5rem; flex-wrap: wrap;">${coverHtml}${detailsHtml}</div>`;
        modal.style.display = 'flex';
        applyTranslations();
    }

    function filterBooks(term) {
        const lowerTerm = term.toLowerCase();
        return allBooks.filter(book =>
            book.title.toLowerCase().includes(lowerTerm) ||
            book.author.toLowerCase().includes(lowerTerm) ||
            (book.language && book.language.toLowerCase().includes(lowerTerm)) ||
            (book.subject && book.subject.toLowerCase().includes(lowerTerm))
        );
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function highlightBook(title) {
        setTimeout(() => {
            const normalizedTitle = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const cards = document.querySelectorAll('.book-mini-card');
            for (let card of cards) {
                const cardTitle = card.querySelector('.mini-title').innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                if (cardTitle === normalizedTitle) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.style.transition = 'background 0.3s';
                    card.style.backgroundColor = 'var(--accent-blue)';
                    setTimeout(() => { card.style.backgroundColor = ''; }, 2000);
                    break;
                }
            }
        }, 500);
    }

    searchInput.addEventListener('input', (e) => {
        const filtered = filterBooks(e.target.value);
        renderBooks(filtered);
        document.getElementById('bookCount').innerText = filtered.length;
    });

    window.addEventListener('languageChanged', () => {
        setLanguage(currentLang).then(() => {
            renderBooks(allBooks);
        });
    });

    const savedLang = localStorage.getItem('selectedLanguage') || 'pt-br';
    setLanguage(savedLang).then(() => loadBooks());
});