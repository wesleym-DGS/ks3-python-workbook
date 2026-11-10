(function () {
    const STORAGE_KEY = 'ks3_python_theme';
    const choices = ['system', 'light', 'dark'];
    let preference = localStorage.getItem(STORAGE_KEY) || 'system';
    if (!choices.includes(preference)) preference = 'system';
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
            preference = choices.includes(selector.value) ? selector.value : 'system';
            localStorage.setItem(STORAGE_KEY, preference);
            applyTheme();
        });
    });

    window.addEventListener('storage', event => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        const saved = localStorage.getItem(STORAGE_KEY);
        preference = choices.includes(saved) ? saved : 'system';
        const selector = document.getElementById('theme-preference');
        if (selector) selector.value = preference;
        applyTheme();
    });
})();
