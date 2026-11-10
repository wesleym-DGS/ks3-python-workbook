const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'class-page.js'), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '');

class Element {
    constructor() {
        this.children = [];
        this.listeners = {};
        this.classList = { toggle() {}, add() {}, remove() {} };
        this.value = '';
        this.textContent = '';
    }
    append(...items) { this.children.push(...items); }
    appendChild(item) { this.children.push(item); return item; }
    replaceChildren(...items) { this.children = items; }
    setAttribute() {}
    addEventListener(name, callback) { this.listeners[name] = callback; }
}

const elements = new Map();
const element = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
};
const records = new Map([
    ['classes/class-1', { name: '7A', memberIds: ['student'] }],
    ['staff/teacher@derbygrammar.org', { role: 'teacher' }],
    ['users/student', { email: 'student@derbygrammar.org' }],
    ['users/teacher@derbygrammar.org', { email: 'teacher@derbygrammar.org' }],
    ['users/student/progress/sequenceCoding1', { completedTasks: [true, false, false, false, false, false, false, false] }],
    ['users/student/progress/dataScience1', { completedTasks: [true, true, false, false] }]
]);
const auth = { currentUser: null };
let authCallback;
const snapshot = (ref, value) => ({ id: ref.split('/').pop(), exists: () => value !== undefined, data: () => value });
const context = {
    console,
    URLSearchParams,
    document: { getElementById: element, createElement: () => new Element() },
    window: { location: { search: '?id=class-1' }, addEventListener() {} },
    getApp: () => ({}), getAuth: () => auth, getFirestore: () => ({}),
    collection: (_, name) => name,
    doc: (_, ...parts) => parts.join('/'),
    getDoc: async ref => snapshot(ref, records.get(ref)),
    getDocs: async name => ({
        docs: [...records.entries()].filter(([ref]) => ref.startsWith(`${name}/`))
            .map(([ref, value]) => snapshot(ref, value))
    }),
    onAuthStateChanged: (_, callback) => { authCallback = callback; },
    runTransaction: async () => {},
    serverTimestamp: () => 'timestamp'
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'class-page.js' });

async function main() {
    const courseSelect = element('course-select');
    const teacher = { uid: 'teacher@derbygrammar.org', email: 'teacher@derbygrammar.org', emailVerified: true };
    auth.currentUser = teacher;

    courseSelect.value = 'python-sequences';
    await authCallback(teacher);
    assert.equal(element('progress-body').children[0].children[1].textContent, '1/8');
    assert.equal(element('progress-body').children[0].children[7].textContent, '1/48');
    assert.match(element('progress-help').textContent, /Python sequences.*48 tasks/);

    courseSelect.value = 'data-science';
    await authCallback(teacher);
    assert.equal(element('progress-body').children[0].children[1].textContent, '2/4');
    assert.equal(element('progress-body').children[0].children[7].textContent, '2/24');
    assert.match(element('progress-help').textContent, /Data science.*24 tasks/);
    console.log('PASS teacher class progress for Python sequences and data science');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
