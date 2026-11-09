const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'firebase-sync.js'), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '');
const values = new Map();
const records = new Map();
let callback;
let offline = false;
let backupFailure = false;
let transactionGate = null;
const auth = { currentUser: null };
const elements = new Map();
const localStorage = {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem(key, value) {
        if (backupFailure && key.startsWith('ks3_python_account_backup:')) {
            throw new Error('Synthetic storage failure');
        }
        values.set(key, String(value));
    },
    removeItem: key => values.delete(key)
};
function element(id) {
    if (!elements.has(id)) elements.set(id, {
        textContent: '', disabled: false,
        classList: { toggle() {}, add() {}, remove() {} },
        addEventListener() {}
    });
    return elements.get(id);
}
const context = {
    console: { error() {}, warn() {} },
    localStorage,
    location: { protocol: 'https:', hostname: 'example.invalid' },
    document: {
        getElementById: element,
        body: { classList: { toggle() {}, add() {}, remove() {} } }
    },
    window: { dispatchEvent() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    initializeApp: () => ({}),
    getAuth: () => auth,
    getFirestore: () => ({}),
    GoogleAuthProvider: class { setCustomParameters() {} },
    onAuthStateChanged: (_, handler) => { callback = handler; },
    signInWithPopup: async () => {},
    signOut: async () => { auth.currentUser = null; await callback(null); },
    doc: (_, ...segments) => segments.join('/'),
    serverTimestamp: () => 'timestamp',
    setDoc: async (ref, data) => { records.set(ref, data); },
    getDoc: async () => ({ data: () => undefined }),
    runTransaction: async (_, action) => {
        if (offline) throw new Error('Synthetic offline failure');
        const writes = [];
        const transaction = {
            get: async ref => ({
                exists: () => records.has(ref),
                data: () => records.get(ref)
            }),
            set: (ref, data) => writes.push([ref, data])
        };
        const result = await action(transaction);
        if (transactionGate) {
            const gate = transactionGate;
            transactionGate = null;
            gate.entered();
            await gate.wait;
        }
        for (const [ref, data] of writes) records.set(ref, data);
        return result;
    }
};
vm.createContext(context);
vm.runInContext(source, context, { filename: 'firebase-sync.js' });

const alice = { uid: 'alice', email: 'alice@derbygrammar.org', emailVerified: true };
const bob = { uid: 'bob', email: 'bob@derbygrammar.org', emailVerified: true };
const lessonKey = 'ks3_python_lesson2_v1_state';
async function switchTo(user) {
    auth.currentUser = user;
    await callback(user);
}
function setTask(index) {
    const saved = JSON.parse(localStorage.getItem(lessonKey));
    saved.completedTasks[index] = true;
    localStorage.setItem(lessonKey, JSON.stringify(saved));
}
function tasks() {
    return JSON.parse(localStorage.getItem(lessonKey)).completedTasks;
}

async function main() {
    const unassigned = JSON.stringify({ completedTasks: [true], xp: 50 });
    localStorage.setItem(lessonKey, unassigned);
    await switchTo(alice);
    assert.match(element('workbook-auth-status').textContent, /Unassigned browser progress/);
    assert.equal(localStorage.getItem(lessonKey), unassigned);
    assert.equal(records.has('users/alice/progress/lesson2'), false);
    localStorage.removeItem(lessonKey);
    await switchTo(null);

    await switchTo(alice);
    setTask(0);
    await context.window.workbookCloud.saveProgress('lesson2');
    offline = true;
    setTask(1);
    await context.window.workbookCloud.saveProgress('lesson2');
    await switchTo(null);
    assert.equal(localStorage.getItem(lessonKey), null);
    const backup = JSON.parse(localStorage.getItem('ks3_python_account_backup:alice'));
    assert.equal(JSON.parse(backup[lessonKey]).completedTasks[1], true);

    offline = false;
    await switchTo(bob);
    assert.deepEqual(Array.from(tasks().slice(0, 2)), [false, false]);
    await switchTo(null);
    await switchTo(alice);
    assert.deepEqual(Array.from(tasks().slice(0, 2)), [true, true]);
    assert.equal(records.get('users/alice/progress/lesson2').completedTasks[1], true);

    backupFailure = true;
    await switchTo(null);
    assert.equal(tasks()[1], true);
    assert.match(element('workbook-auth-status').textContent, /Could not preserve/);
    await switchTo(bob);
    assert.match(element('workbook-auth-status').textContent, /Progress sync failed/);
    assert.equal(tasks()[1], true);
    backupFailure = false;
    await switchTo(null);
    await switchTo(alice);
    assert.equal(tasks()[1], true);

    let release;
    let entered;
    const enteredTransaction = new Promise(resolve => { entered = resolve; });
    transactionGate = { entered, wait: new Promise(resolve => { release = resolve; }) };
    setTask(2);
    const pending = context.window.workbookCloud.saveProgress('lesson2');
    await enteredTransaction;
    await switchTo(null);
    await switchTo(bob);
    release();
    await pending;
    assert.equal(tasks()[2], false);
    await switchTo(null);
    await switchTo(alice);
    assert.equal(tasks()[2], true);

    console.log('PASS Python unassigned progress, offline recovery, account isolation, backup failure and in-flight account switch');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
