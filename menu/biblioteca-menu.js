(function () {
    'use strict';

    const libraryTypes = [
        ['all', 'tab_library', 'fa-book'],
        ['audiobooks', 'tab_audiobooks', 'fa-headphones'],
        ['book', 'filter_books', 'fa-book'],
        ['article', 'filter_articles', 'fa-file-alt'],
        ['paper', 'filter_papers', 'fa-file-pdf'],
        ['tcc', 'filter_tcc', 'fa-graduation-cap'],
        ['dissertation', 'filter_dissertation', 'fa-tasks'],
        ['thesis', 'filter_thesis', 'fa-award']
    ];

    function initialize() {
        document.querySelectorAll('.library-dropdown').forEach(wrapper => {
            if (wrapper.dataset.dropdownReady === 'true') return;
            const toggle = wrapper.querySelector('.library-dropdown-toggle');
            const menu = wrapper.querySelector('.library-dropdown-menu');
            if (!toggle || !menu) return;
            wrapper.dataset.dropdownReady = 'true';

            const basePath = wrapper.dataset.libraryBase || 'biblioteca/biblioteca.html';
            menu.innerHTML = '';
            libraryTypes.forEach(([type, translationKey, icon]) => {
                const link = document.createElement('a');
                link.href = type === 'all'
                    ? basePath
                    : type === 'audiobooks'
                        ? `${basePath}?aba=audiobooks`
                        : `${basePath}?tipo=${type}`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.role = 'menuitem';
                link.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i> <span data-i18n="${translationKey}">${translationKey}</span>`;
                menu.appendChild(link);
            });

            const close = () => {
                menu.hidden = true;
                toggle.setAttribute('aria-expanded', 'false');
            };
            const positionMenu = () => {
                const rect = toggle.getBoundingClientRect();
                const width = Math.min(260, window.innerWidth - 24);
                const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
                menu.style.left = `${left}px`;
                menu.style.width = `${width}px`;
                menu.style.bottom = 'auto';
                menu.style.top = `${rect.bottom + 8}px`;
            };

            menu.hidden = true;
            document.body.appendChild(menu);
            toggle.addEventListener('click', event => {
                event.stopPropagation();
                if (!menu.hidden) return close();
                window.UniversidadeLivreAnalytics?.navigation('biblioteca', 'aba-aberta');
                document.dispatchEvent(new CustomEvent('dropdown:open', { detail: { source: 'biblioteca' } }));
                positionMenu();
                menu.hidden = false;
                toggle.setAttribute('aria-expanded', 'true');
            });
            menu.addEventListener('click', event => {
                const link = event.target.closest('a');
                if (link) {
                    const type = new URL(link.href, window.location.href).searchParams.get('tipo') || 'all';
                    window.UniversidadeLivreAnalytics?.navigation('biblioteca', 'item-selecionado', { type });
                }
                event.stopPropagation();
            });
            document.addEventListener('click', close);
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') close();
            });
            document.addEventListener('dropdown:open', event => {
                if (event.detail?.source !== 'biblioteca') close();
            });
            window.addEventListener('resize', () => {
                if (!menu.hidden) positionMenu();
            });
            window.addEventListener('scroll', () => {
                if (!menu.hidden) positionMenu();
            }, { passive: true });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
