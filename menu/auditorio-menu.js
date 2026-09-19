(function () {
    'use strict';

    const contentTypes = [
        ['all', 'all', 'fa-layer-group'],
        ['video', 'type_video', 'fa-play-circle'],
        ['podcast', 'type_podcast', 'fa-podcast'],
        ['live', 'type_live', 'fa-circle'],
        ['shorts', 'type_shorts', 'fa-film']
    ];

    function setupDropdown(wrapper) {
        if (wrapper.dataset.dropdownReady === 'true') return;
        const toggle = wrapper.querySelector('.header-dropdown-toggle');
        const menu = wrapper.querySelector('.header-dropdown-menu');
        if (!toggle || !menu) return;
        wrapper.dataset.dropdownReady = 'true';

        const basePath = wrapper.dataset.auditorioBase || 'auditorio/auditorio.html';
        menu.innerHTML = '';
        contentTypes.forEach(([type, translationKey, icon]) => {
            const link = document.createElement('a');
            link.href = type === 'all' ? basePath : `${basePath}?tipo=${type}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.role = 'menuitem';
            link.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i> <span data-i18n="${translationKey}">${translationKey === 'all' ? 'Todos' : ({
                type_video: 'Vídeos',
                type_podcast: 'Podcasts',
                type_live: 'Lives',
                type_shorts: 'Shorts'
            }[translationKey])}</span>`;
            menu.appendChild(link);
        });

        const close = () => {
            menu.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
        };

        const positionMenu = () => {
            const rect = toggle.getBoundingClientRect();
            const width = Math.min(240, window.innerWidth - 24);
            const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
            menu.style.top = `${rect.bottom + 8}px`;
            menu.style.left = `${left}px`;
            menu.style.width = `${width}px`;
        };

        menu.hidden = true;
        document.body.appendChild(menu);
        toggle.addEventListener('click', event => {
            event.stopPropagation();
            if (!menu.hidden) {
                close();
                return;
            }
            window.UniversidadeLivreAnalytics?.navigation('auditorio', 'aba-aberta');
            document.dispatchEvent(new CustomEvent('dropdown:open', { detail: { source: 'auditorio' } }));
            positionMenu();
            menu.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
        });
        menu.addEventListener('click', event => {
            const link = event.target.closest('a');
            if (link) {
                const type = new URL(link.href, window.location.href).searchParams.get('tipo') || 'all';
                window.UniversidadeLivreAnalytics?.navigation('auditorio', 'item-selecionado', { type });
            }
            event.stopPropagation();
        });
        document.addEventListener('click', close);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') close();
        });
        document.addEventListener('dropdown:open', event => {
            if (event.detail?.source !== 'auditorio') close();
        });
        window.addEventListener('resize', () => {
            if (!menu.hidden) positionMenu();
        });
        window.addEventListener('scroll', () => {
            if (!menu.hidden) positionMenu();
        }, { passive: true });
    }

    function initialize() {
        document.querySelectorAll('.header-dropdown').forEach(setupDropdown);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
