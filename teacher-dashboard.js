import './firebase-sync.js?v=20261109-2';
import { getApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const SCHOOL_DOMAIN = 'derbygrammar.org';
const BOOTSTRAP_ADMIN = 'wesley.m@derbygrammar.org';
const auth = getAuth(getApp());
const db = getFirestore(getApp());
const content = document.getElementById('teacher-content');
const status = document.getElementById('teacher-status');
const classList = document.getElementById('class-list');
const studentList = document.getElementById('unclassed-list');
const staffLink = document.getElementById('staff-management-link');
let currentUser = null;
let generation = 0;
let loadId = 0;
let classes = [];
let students = [];
let dashboardLoaded = false;
let busy = false;
let unsubscribeClasses = null;
let unsubscribeProfiles = null;
let unsubscribeStaff = null;
let refreshTimer = null;

function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
}

function clearView() {
    unsubscribeClasses?.();
    unsubscribeProfiles?.();
    unsubscribeStaff?.();
    unsubscribeClasses = null;
    unsubscribeProfiles = null;
    unsubscribeStaff = null;
    clearTimeout(refreshTimer);
    content.classList.add('hidden');
    staffLink.classList.add('hidden');
    classList.replaceChildren();
    studentList.replaceChildren();
    classes = [];
    students = [];
    dashboardLoaded = false;
}

function validSession(token, user) {
    return generation === token && currentUser?.uid === user.uid && auth.currentUser?.uid === user.uid;
}

function render() {
    classList.replaceChildren();
    studentList.replaceChildren();
    document.getElementById('class-empty').classList.toggle('hidden', classes.length > 0);
    document.getElementById('unclassed-empty').classList.toggle('hidden', students.length > 0);
    for (const item of classes) {
        const card = document.createElement('article');
        card.className = 'class-card';
        card.dataset.classId = item.id;
        const title = document.createElement('h3');
        const link = document.createElement('a');
        link.href = `class.html?id=${encodeURIComponent(item.id)}`;
        link.textContent = item.name;
        title.appendChild(link);
        const count = document.createElement('p');
        count.className = 'teacher-help';
        count.textContent = `${item.memberIds.length} student${item.memberIds.length === 1 ? '' : 's'}`;
        const actions = document.createElement('div');
        actions.className = 'class-actions';
        for (const [action, label] of [['rename', 'Rename'], ['delete', 'Delete']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'workbook-auth-button workbook-secondary-button';
            button.dataset.action = action;
            button.dataset.classId = item.id;
            button.textContent = label;
            button.setAttribute('aria-label', `${label} ${item.name}`);
            actions.appendChild(button);
        }
        card.append(title, count, actions);
        classList.appendChild(card);
    }
    for (const student of students) {
        const row = document.createElement('div');
        row.className = 'unclassed-row';
        row.draggable = true;
        row.dataset.uid = student.id;
        const name = document.createElement('strong');
        name.textContent = student.email;
        const select = document.createElement('select');
        select.setAttribute('aria-label', `Choose a class for ${student.email}`);
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose a class';
        select.appendChild(placeholder);
        for (const item of classes) {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.name;
            select.appendChild(option);
        }
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'workbook-auth-button';
        add.textContent = 'Add to class';
        add.disabled = classes.length === 0;
        add.setAttribute('aria-label', `Add ${student.email} to the selected class`);
        add.addEventListener('click', () => {
            if (!select.value) {
                message(`Choose a class for ${student.email}.`, true);
                select.focus();
                return;
            }
            addStudent(select.value, student.id);
        });
        row.append(name, select, add);
        studentList.appendChild(row);
    }
}

async function loadDashboard(token, user, quiet = false) {
    const request = ++loadId;
    if (!quiet) message('Loading classes and students…');
    const [classDocs, profileDocs, staffDocs] = await Promise.all([
        getDocs(collection(db, 'classes')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'staff'))
    ]);
    if (!validSession(token, user) || request !== loadId) return;
    const staffEmails = new Set([BOOTSTRAP_ADMIN, ...staffDocs.docs.map(entry => String(entry.data().email || '').toLowerCase())]);
    const nextClasses = classDocs.docs.map(entry => ({
        id: entry.id, name: entry.data().name, memberIds: entry.data().memberIds
    })).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const members = new Set(nextClasses.flatMap(item => item.memberIds));
    const nextStudents = profileDocs.docs.map(entry => ({ id: entry.id, email: entry.data().email || 'Unknown account' }))
        .filter(student => !members.has(student.id) && !staffEmails.has(student.email.toLowerCase()))
        .sort((a, b) => a.email.localeCompare(b.email) || a.id.localeCompare(b.id));
    const changed = !dashboardLoaded || JSON.stringify(classes) !== JSON.stringify(nextClasses)
        || JSON.stringify(students) !== JSON.stringify(nextStudents);
    classes = nextClasses;
    students = nextStudents;
    dashboardLoaded = true;
    if (changed) render();
    content.classList.remove('hidden');
    if (changed || !quiet) {
        message(`${classes.length} class${classes.length === 1 ? '' : 'es'}; ${students.length} un-classed student${students.length === 1 ? '' : 's'}.`);
    }
}

function watchDashboard(token, user) {
    unsubscribeClasses?.();
    unsubscribeProfiles?.();
    unsubscribeStaff?.();
    const changed = () => {
        if (!validSession(token, user)) return;
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            loadDashboard(token, user, true)
                .catch(error => {
                    if (!validSession(token, user)) return;
                    console.error('Could not refresh classes.', error);
                    message(`Could not refresh classes: ${error.message}`, true);
                });
        }, 100);
    };
    const failed = error => {
        if (!validSession(token, user)) return;
        console.error('Could not watch class updates.', error);
        if (error.code === 'permission-denied') {
            currentUser = null;
            clearView();
            message('Staff access could not be verified. Reload or contact an administrator.', true);
            return;
        }
        message(`Live updates stopped: ${error.message}. Use Refresh to try again.`, true);
    };
    unsubscribeClasses = onSnapshot(collection(db, 'classes'), changed, failed);
    unsubscribeProfiles = onSnapshot(collection(db, 'users'), changed, failed);
    unsubscribeStaff = onSnapshot(collection(db, 'staff'), changed, failed);
}

async function perform(action, success) {
    if (!currentUser || busy) return;
    const user = currentUser;
    const token = generation;
    busy = true;
    message('Saving changes…');
    try {
        await action(user);
        if (!validSession(token, user)) return;
        await loadDashboard(token, user);
        if (validSession(token, user)) message(success);
    } catch (error) {
        if (!validSession(token, user)) return;
        console.error('Could not update classes.', error);
        message(`Could not update classes: ${error.message}`, true);
    } finally {
        busy = false;
    }
}

async function addStudent(classId, uid) {
    if (!students.some(student => student.id === uid)) {
        message('This student is no longer in the un-classed list. Refresh and try again.', true);
        return;
    }
    await perform(async user => {
        const ref = doc(db, 'classes', classId);
        await runTransaction(db, async transaction => {
            const [classSnapshot, pupil] = await Promise.all([
                transaction.get(ref), transaction.get(doc(db, 'users', uid))
            ]);
            if (!classSnapshot.exists()) throw new Error('This class no longer exists. Refresh and try again.');
            if (!pupil.exists()) throw new Error('This student account no longer exists.');
            const data = classSnapshot.data();
            if (data.memberIds.includes(uid)) throw new Error('This student is already in this class.');
            if (data.memberIds.length >= 200) throw new Error('This class has reached its limit of 200 students.');
            transaction.update(ref, {
                memberIds: [...data.memberIds, uid],
                updatedAt: serverTimestamp(),
                updatedBy: user.email
            });
        });
    }, 'Student added to the class.');
}

document.getElementById('class-create-form').addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('class-name');
    const name = input.value.trim();
    if (!name) {
        message('Enter a class name.', true);
        return;
    }
    perform(async user => {
        await setDoc(doc(collection(db, 'classes')), {
            name, memberIds: [], updatedAt: serverTimestamp(), updatedBy: user.email
        });
        if (auth.currentUser?.uid === user.uid) input.value = '';
    }, 'Class created.');
});

document.getElementById('teacher-refresh').addEventListener('click', () => {
    if (!currentUser) return;
    const user = currentUser;
    const token = generation;
    loadDashboard(token, user)
        .then(() => {
            if (validSession(token, user)) watchDashboard(token, user);
        })
        .catch(error => {
            if (!validSession(token, user)) return;
            console.error('Could not refresh classes.', error);
            message(`Could not refresh classes: ${error.message}`, true);
        });
});

classList.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const item = classes.find(entry => entry.id === button.dataset.classId);
    if (!item) return;
    if (button.dataset.action === 'delete') {
        if (!window.confirm(`Delete "${item.name}" and its memberships? Student accounts and progress will not be deleted.`)) return;
        perform(async () => deleteDoc(doc(db, 'classes', item.id)), 'Class deleted. Student accounts and progress are unchanged.');
    } else {
        const value = window.prompt('New class name:', item.name);
        if (value === null) return;
        const name = value.trim();
        if (!name || name.length > 100) {
            message('Class names must contain 1 to 100 characters.', true);
            return;
        }
        perform(async user => runTransaction(db, async transaction => {
            const ref = doc(db, 'classes', item.id);
            const snapshot = await transaction.get(ref);
            if (!snapshot.exists()) throw new Error('This class no longer exists.');
            transaction.update(ref, { name, updatedAt: serverTimestamp(), updatedBy: user.email });
        }), 'Class renamed.');
    }
});

studentList.addEventListener('dragstart', event => {
    const row = event.target.closest('[data-uid]');
    if (!row) return;
    event.dataTransfer.setData('text/plain', row.dataset.uid);
    event.dataTransfer.effectAllowed = 'copy';
});
classList.addEventListener('dragover', event => {
    if (event.target.closest('[data-class-id]')) event.preventDefault();
});
classList.addEventListener('drop', event => {
    const card = event.target.closest('.class-card');
    if (!card) return;
    event.preventDefault();
    addStudent(card.dataset.classId, event.dataTransfer.getData('text/plain'));
});

onAuthStateChanged(auth, async user => {
    const token = ++generation;
    ++loadId;
    currentUser = null;
    clearView();
    if (!user || !user.emailVerified || !user.email?.toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`)) {
        message('Sign in with a school staff account to access this page.');
        return;
    }
    currentUser = user;
    message('Checking staff access…');
    try {
        const email = user.email.toLowerCase();
        const staff = email === BOOTSTRAP_ADMIN ? null : await getDoc(doc(db, 'staff', email));
        if (!validSession(token, user)) return;
        if (email !== BOOTSTRAP_ADMIN && !['teacher', 'admin'].includes(staff.data()?.role)) {
            currentUser = null;
            message('This account does not have teacher dashboard access.', true);
            return;
        }
        staffLink.classList.toggle('hidden', email !== BOOTSTRAP_ADMIN);
        await loadDashboard(token, user);
        if (validSession(token, user)) watchDashboard(token, user);
    } catch (error) {
        if (!validSession(token, user)) return;
        console.error('Could not load teacher dashboard.', error);
        message(`Could not load classes: ${error.message}`, true);
    }
});
