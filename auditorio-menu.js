(function () {
    'use strict';

    const contentTypes = [
        ['all', 'all'],
        ['video', 'type_video'],
        ['podcast', 'type_podcast'],
        ['live', 'type_live'],
        ['shorts', 'type_shorts']
    ];

    function setupDropdown(wrapper) {
        const toggle = wrapper.querySelector('.header-dropdown-toggle');
        const menu = wrapper.querySelector('.header-dropdown-menu');
        if (!toggle || !menu) return;

        const basePath = wrapper.dataset.auditorioBase || 'auditorio/auditorio.html';
        menu.innerHTML = '';
        contentTypes.forEach(([type, translationKey]) => {
            const link = document.createElement('a');
            link.href = type === 'all' ? basePath : `${basePath}?tipo=${type}`;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.role = 'menuitem';
            link.dataset.i18n = translationKey;
            link.textContent = translationKey === 'all' ? 'Todos' : ({
                type_video: 'Vídeos',
                type_podcast: 'Podcasts',
                type_live: 'Lives',
                type_shorts: 'Shorts'
            }[translationKey]);
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
            positionMenu();
            menu.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
        });
        menu.addEventListener('click', event => event.stopPropagation());
        document.addEventListener('click', close);
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') close();
        });
        window.addEventListener('resize', () => {
            if (!menu.hidden) positionMenu();
        });
        window.addEventListener('scroll', () => {
            if (!menu.hidden) positionMenu();
        }, { passive: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.header-dropdown').forEach(setupDropdown);
    });
})();
