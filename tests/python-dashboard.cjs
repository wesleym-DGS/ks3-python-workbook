const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'python-course', 'dashboard.js'), 'utf8');
const index = fs.readFileSync(path.join(__dirname, '..', 'python-course', 'index.html'), 'utf8');
assert.match(index, /course-index\.css/);
assert.match(index, /class="dashboard-page course-index-page" data-strand="computer-science"/);
const values = new Map();
const elements = new Map();
const handlers = {};

function element(key) {
    if (!elements.has(key)) {
        const state = {
            textContent: '', href: '', style: {}, attributes: {}, classes: new Set(),
            setAttribute(name, value) { this.attributes[name] = value; },
            classList: { toggle(name, enabled) { if (enabled) state.classes.add(name); else state.classes.delete(name); } },
            querySelector(selector) { return element(`${key} ${selector}`); }
        };
        state.parentElement = { setAttribute(name, value) { state.attributes[name] = value; } };
        elements.set(key, state);
    }
    return elements.get(key);
}

const context = {
    console,
    localStorage: { getItem: key => values.has(key) ? values.get(key) : null },
    document: {
        getElementById: id => element(id),
        querySelector: selector => element(selector)
    },
    window: { addEventListener(name, callback) { handlers[name] = callback; } }
};
vm.runInNewContext(source, context);

assert.equal(element('dashboard-xp').textContent, '0');
assert.equal(element('dashboard-progress').textContent, '0%');
assert.equal(element('dashboard-medal-count').textContent, 0);
assert.equal(element('.dashboard-primary-link').href, 'Lesson1.html');

values.set('ks3_python_lesson1_v3_state', JSON.stringify({
    completedTasks: { 1: true, 2: true, 3: true, 4: true },
    xp: 400
}));
handlers['workbook-progress-updated']();
assert.equal(element('dashboard-xp').textContent, '400');
assert.equal(element('dashboard-progress').textContent, '8%');
assert.equal(element('dashboard-rank').textContent, 'Apprentice Coder');
assert.equal(element('dashboard-lesson1-progress-label').textContent, '4 of 10 tasks');
assert.equal(element('dashboard-lesson1-progress-bar').style.width, '40%');
assert.equal(element('dashboard-lesson1-progress-bar').attributes['aria-valuenow'], '4');
assert.equal(element('dashboard-medal-count').textContent, 1);
assert.equal(element('[data-medal="syntax"] .dashboard-medal-state').textContent, 'EARNED');
assert.equal(element('dashboard-primary-action').textContent, 'Continue learning');

values.clear();
handlers.storage({ key: null });
assert.equal(element('dashboard-xp').textContent, '0');
assert.equal(element('dashboard-medal-count').textContent, 0);
assert.equal(element('[data-medal="syntax"] .dashboard-medal-state').textContent, 'LOCKED');
console.log('PASS Python dashboard progress, XP, resume, medals and reset');
