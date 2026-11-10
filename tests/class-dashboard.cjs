const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'teacher-dashboard.js'), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '');

class Element {
    constructor() {
        this.children = [];
        this.dataset = {};
        this.listeners = {};
        this.attributes = {};
        this.textContent = '';
        this.value = '';
        this.classList = {
            values: new Set(),
            add: name => this.classList.values.add(name),
            remove: name => this.classList.values.delete(name),
            toggle: (name, enabled) => enabled ? this.classList.values.add(name) : this.classList.values.delete(name),
            contains: name => this.classList.values.has(name)
        };
    }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.children.push(child); return child; }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    focus() {}
}

const elements = new Map();
const element = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
};
const records = {
    classes: new Map([['class-1', { name: '7A', memberIds: ['alice'], updatedAt: 'time', updatedBy: 'teacher@derbygrammar.org' }]]),
    users: new Map([
        ['alice', { email: 'alice@derbygrammar.org' }],
        ['bob', { email: 'bob@derbygrammar.org' }],
        ['staff', { email: 'teacher@derbygrammar.org' }]
    ]),
    staff: new Map([['teacher@derbygrammar.org', { email: 'teacher@derbygrammar.org', role: 'teacher' }]])
};
const auth = { currentUser: null };
const errors = [];
let authCallback;
let delayClasses = null;
const watchErrors = new Map();
const watchChanges = new Map();
let subscriptions = 0;
const snapshot = (id, value) => ({ id, exists: () => value !== undefined, data: () => value });
const getDoc = async ref => snapshot(ref[1], records[ref[0]].get(ref[1]));
const getDocs = async name => {
    if (name === 'classes' && delayClasses) await delayClasses;
    return { docs: [...records[name]].map(([id, value]) => snapshot(id, value)) };
};
const context = {
    console: { error: (...args) => errors.push(args) }, setTimeout, clearTimeout,
    document: { getElementById: element, createElement: () => new Element() },
    window: { confirm: () => true, prompt: () => null },
    getApp: () => ({}), getAuth: () => auth, getFirestore: () => ({}),
    collection: (_, name) => name,
    doc: (parent, first, second) => typeof parent === 'string' ? [parent, first || 'generated'] : [first, second],
    getDoc, getDocs,
    onAuthStateChanged: (_, callback) => { authCallback = callback; },
    onSnapshot: (name, changed, error) => {
        subscriptions++;
        watchErrors.set(name, error);
        watchChanges.set(name, changed);
        let active = true;
        queueMicrotask(() => { if (active) changed(); });
        return () => { active = false; watchErrors.delete(name); watchChanges.delete(name); };
    },
    serverTimestamp: () => 'timestamp',
    setDoc: async (ref, value) => records[ref[0]].set(ref[1], value),
    deleteDoc: async ref => records[ref[0]].delete(ref[1]),
    runTransaction: async (_, action) => action({
        get: getDoc,
        update(ref, changes) { records[ref[0]].set(ref[1], { ...records[ref[0]].get(ref[1]), ...changes }); }
    })
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'teacher-dashboard.js' });
const { addStudent } = vm.runInContext('({ addStudent })', context);

async function main() {
    const teacher = { uid: 'teacher', email: 'teacher@derbygrammar.org', emailVerified: true };
    auth.currentUser = teacher;
    await authCallback(teacher);
    assert.equal(element('class-list').children.length, 1);
    assert.equal(element('unclassed-list').children.length, 1);
    assert.equal(element('unclassed-list').children[0].children[0].textContent, 'bob@derbygrammar.org');

    const row = element('unclassed-list').children[0];
    const select = row.children[1];
    select.value = 'class-1';
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(subscriptions, 3, 'initial listener snapshots must not recreate subscriptions');
    assert.equal(element('unclassed-list').children[0], row, 'unchanged snapshots must not replace student controls');
    assert.equal(select.value, 'class-1');
    assert.match(element('teacher-status').textContent, /1 class; 1 un-classed student/);
    records.users.get('bob').lastLogin = 'new timestamp';
    watchChanges.get('users')();
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(element('unclassed-list').children[0], row, 'profile-only metadata changes must preserve the selector');
    assert.equal(select.value, 'class-1');

    records.classes.set('class-2', { name: '7B', memberIds: ['bob'] });
    watchChanges.get('classes')();
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(element('unclassed-list').children.length, 0);
    records.classes.delete('class-2');
    watchChanges.get('classes')();
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(element('unclassed-list').children.length, 1);

    await addStudent('class-1', 'bob');
    assert.deepEqual(Array.from(records.classes.get('class-1').memberIds), ['alice', 'bob']);
    assert.equal(element('unclassed-list').children.length, 0);

    records.users.set('charlie', { email: 'charlie@derbygrammar.org' });
    await vm.runInContext('loadDashboard(generation, currentUser)', context);
    records.classes.delete('class-1');
    await addStudent('class-1', 'charlie');
    assert.equal(records.classes.has('class-1'), false);
    assert.match(element('teacher-status').textContent, /no longer exists/);
    records.classes.set('class-1', { name: '7A', memberIds: ['alice', 'bob'] });

    let release;
    delayClasses = new Promise(resolve => { release = resolve; });
    const pending = authCallback(teacher);
    await new Promise(resolve => setImmediate(resolve));
    auth.currentUser = null;
    await authCallback(null);
    release();
    await pending;
    assert.equal(element('class-list').children.length, 0);
    assert.equal(element('unclassed-list').children.length, 0);
    assert.equal(element('teacher-content').classList.contains('hidden'), true);
    delayClasses = null;
    auth.currentUser = teacher;
    await authCallback(teacher);
    watchErrors.get('classes')({ code: 'permission-denied', message: 'Synthetic revocation' });
    assert.equal(element('teacher-content').classList.contains('hidden'), true);
    assert.equal(element('class-list').children.length, 0);
    assert.equal(errors.length, 2);
    console.log('PASS class dashboard filtering, membership, stale sign-out and revoked access');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
