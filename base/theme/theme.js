(function () {
    const themeKey = 'ulivre-theme';
    const savedTheme = localStorage.getItem(themeKey);
    const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
    document.documentElement.dataset.theme = theme;

    function updateThemeControls() {
        const isLight = document.documentElement.dataset.theme === 'light';
        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            const icon = button.querySelector('i');
            const label = button.querySelector('.theme-toggle-label');
            button.setAttribute('aria-label', isLight ? 'Ativar tema escuro' : 'Ativar tema claro');
            if (icon) icon.className = `fas fa-${isLight ? 'moon' : 'sun'}`;
            if (label) label.textContent = isLight ? 'Escuro' : 'Claro';
        });
        document.querySelectorAll('input[data-theme-option]').forEach((option) => {
            const selected = option.dataset.themeOption === (isLight ? 'light' : 'dark');
            option.checked = selected;
            option.closest('.profile-theme-option')?.classList.toggle('active', selected);
        });
        document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
            meta.content = isLight ? '#F8FAFC' : '#0B0D10';
        });
    }

    function setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            throw new TypeError(`Tema inválido: ${theme}`);
        }
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(themeKey, theme);
        updateThemeControls();
    }

    function toggleTheme() {
        setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
            button.addEventListener('click', toggleTheme);
        });
        document.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) return;
            const themeOption = event.target.closest('[data-theme-option]');
            if (themeOption) setTheme(themeOption.dataset.themeOption);
        });
        updateThemeControls();
    });

    window.setTheme = setTheme;
}());
