const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'theme.js'), 'utf8');

function setup(initial, isLight) {
    const storage = new Map(initial ? [['ks3_python_theme', initial]] : []);
    const documentEvents = {};
    const windowEvents = {};
    const selectorEvents = {};
    const mediaEvents = {};
    const selector = {
        value: '',
        addEventListener(name, callback) { selectorEvents[name] = callback; }
    };
    const media = {
        matches: isLight,
        addEventListener(name, callback) { mediaEvents[name] = callback; }
    };
    const document = {
        documentElement: { dataset: {} },
        getElementById: () => selector,
        addEventListener(name, callback) { documentEvents[name] = callback; }
    };
    const context = {
        document,
        window: {
            matchMedia: () => media,
            addEventListener(name, callback) { windowEvents[name] = callback; }
        },
        localStorage: {
            getItem: key => storage.has(key) ? storage.get(key) : null,
            setItem: (key, value) => storage.set(key, value)
        }
    };
    vm.runInNewContext(source, context);
    documentEvents.DOMContentLoaded();
    return { document, selector, selectorEvents, media, mediaEvents, windowEvents, storage };
}

const system = setup(null, true);
assert.equal(system.document.documentElement.dataset.theme, 'light');
assert.equal(system.selector.value, 'system');
system.media.matches = false;
system.mediaEvents.change();
assert.equal(system.document.documentElement.dataset.theme, 'dark');
system.selector.value = 'light';
system.selectorEvents.change();
assert.equal(system.storage.get('ks3_python_theme'), 'light');
assert.equal(system.document.documentElement.dataset.theme, 'light');
system.mediaEvents.change();
assert.equal(system.document.documentElement.dataset.theme, 'light');
system.storage.set('ks3_python_theme', 'dark');
system.windowEvents.storage({ key: 'ks3_python_theme' });
assert.equal(system.document.documentElement.dataset.theme, 'dark');
assert.equal(system.selector.value, 'dark');
system.storage.delete('ks3_python_theme');
system.windowEvents.storage({ key: null });
assert.equal(system.selector.value, 'system');
assert.equal(system.document.documentElement.dataset.theme, 'dark');

const invalid = setup('invalid', true);
assert.equal(invalid.selector.value, 'system');
assert.equal(invalid.document.documentElement.dataset.theme, 'light');
console.log('PASS theme preference, system changes, cross-tab updates and live switching');
