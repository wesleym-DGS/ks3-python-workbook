(function () {
    const STORAGE_KEY = 'ks3_python_theme';
    const preference = localStorage.getItem(STORAGE_KEY) || 'system';
    const colorScheme = window.matchMedia('(prefers-color-scheme: light)');

    function applyTheme() {
        const theme = preference === 'system' ? (colorScheme.matches ? 'light' : 'dark') : preference;
        document.documentElement.dataset.theme = theme;
    }

    applyTheme();
    colorScheme.addEventListener('change', applyTheme);

    document.addEventListener('DOMContentLoaded', () => {
        const selector = document.getElementById('theme-preference');
        if (!selector) return;

        selector.value = preference;
        selector.addEventListener('change', () => {
            localStorage.setItem(STORAGE_KEY, selector.value);
            window.location.reload();
        });
    });
})();
