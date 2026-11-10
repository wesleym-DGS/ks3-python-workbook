const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'web-course', 'web-loader.js'), 'utf8');

function run(protocol, hostname, saved) {
    const listeners = {};
    const storage = new Map(saved ? Object.entries(saved) : []);
    const status = { textContent: '' };
    const saveStatus = { textContent: '', classList: { add() {}, remove() {} } };
    const body = { dataset: { lesson: '2' }, classList: { remove(name) { this.removed = name; } } };
    const scripts = [];
    let applied;
    const context = {
        location: { protocol, hostname },
        document: {
            body,
            head: { appendChild: script => scripts.push(script) },
            createElement: () => ({}),
            getElementById: id => id === 'auth-status' ? status : saveStatus
        },
        window: {
            webLesson: { apply: value => { applied = value; }, read: () => ({ 'question-1': 'changed' }) },
            addEventListener: (name, handler) => { listeners[name] = handler; }
        },
        localStorage: {
            getItem: key => storage.has(key) ? storage.get(key) : null,
            setItem: (key, value) => storage.set(key, value)
        },
        console: { error() {} }
    };
    vm.runInNewContext(source, context);
    return { body, status, saveStatus, scripts, listeners, storage, applied };
}

for (const [protocol, hostname] of [['file:', ''], ['http:', 'localhost'], ['http:', '127.0.0.1'], ['http:', '[::1]']]) {
    const result = run(protocol, hostname, { 'web-course-local-preview:lesson2': '{"question-1":"saved"}' });
    assert.equal(result.body.dataset.localPreview, 'true');
    assert.equal(result.body.classList.removed, 'auth-pending');
    assert.equal(result.applied['question-1'], 'saved');
    assert.equal(result.scripts.length, 0);
    result.listeners['web-work-change']();
    assert.equal(JSON.parse(result.storage.get('web-course-local-preview:lesson2'))['question-1'], 'changed');
}

const invalid = run('file:', '', { 'web-course-local-preview:lesson2': '{invalid' });
invalid.listeners['web-work-change']();
assert.equal(invalid.storage.get('web-course-local-preview:lesson2'), '{invalid');
assert.match(invalid.saveStatus.textContent, /could not save/i);

for (const hostname of ['example.com', 'localhost.example.com', '127.0.0.2']) {
    const result = run('https:', hostname);
    assert.equal(result.scripts.length, 1);
    assert.equal(result.scripts[0].src, 'web-cloud.js');
    assert.equal(result.body.dataset.localPreview, undefined);
    assert.equal(result.body.classList.removed, undefined);
}
console.log('PASS local preview isolation, save/restore, invalid data and hosted sign-in gate');
