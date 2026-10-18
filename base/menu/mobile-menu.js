(function () {
    'use strict';

    function initializeMobileMenu() {
        document.querySelectorAll('.header > .stats, .app-header > .app-actions').forEach(menu => {
            if (menu.dataset.mobileMenuReady === 'true') return;
            menu.dataset.mobileMenuReady = 'true';

            const header = menu.parentElement;
            const logo = header?.querySelector(':scope > .logo');
            if (!header || !logo) return;

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'mobile-menu-toggle';
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i><span>Menu</span><i class="fas fa-chevron-down mobile-menu-chevron" aria-hidden="true"></i>';

            const panel = document.createElement('div');
            panel.className = 'mobile-menu-panel';
            panel.id = `mobileNavigationMenu-${Math.random().toString(36).slice(2, 8)}`;
            toggle.setAttribute('aria-controls', panel.id);

            const keepOutside = node => node.matches('.stat-item, .language-switch');
            const navigationNodes = [...menu.children].filter(node => !keepOutside(node));
            const restorePoint = document.createComment('mobile-menu-restore-point');
            menu.appendChild(restorePoint);

            header.insertBefore(toggle, menu);
            header.insertBefore(panel, menu);

            const mobileQuery = window.matchMedia('(max-width: 768px)');
            const syncMenuPlacement = () => {
                if (mobileQuery.matches) {
                    navigationNodes.forEach(node => {
                        if (node.parentNode !== panel) panel.appendChild(node);
                    });
                    panel.classList.remove('mobile-menu-desktop');
                } else {
                    navigationNodes.forEach(node => {
                        if (node.parentNode !== menu) menu.insertBefore(node, restorePoint);
                    });
                    panel.classList.remove('mobile-menu-open');
                    toggle.setAttribute('aria-expanded', 'false');
                    panel.classList.add('mobile-menu-desktop');
                }
            };

            const close = () => {
                panel.classList.remove('mobile-menu-open');
                toggle.setAttribute('aria-expanded', 'false');
            };

            toggle.addEventListener('click', event => {
                event.stopPropagation();
                const open = panel.classList.toggle('mobile-menu-open');
                toggle.setAttribute('aria-expanded', String(open));
            });

            document.addEventListener('click', event => {
                if (panel.classList.contains('mobile-menu-open') &&
                    !panel.contains(event.target) && event.target !== toggle) {
                    close();
                }
            });
            document.addEventListener('keydown', event => {
                if (event.key === 'Escape') close();
            });

            syncMenuPlacement();
            mobileQuery.addEventListener?.('change', syncMenuPlacement);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMobileMenu, { once: true });
    } else {
        initializeMobileMenu();
    }
})();
