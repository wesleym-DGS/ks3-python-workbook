import './firebase-sync.js?v=20261110-2';
import { getApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, getFirestore, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const BOOTSTRAP_ADMIN = 'wesley.m@derbygrammar.org';
const auth = getAuth(getApp());
const db = getFirestore(getApp());
const content = document.getElementById('teacher-content');
const status = document.getElementById('teacher-status');
const title = document.getElementById('class-title');
const courseSelect = document.getElementById('course-select');
const search = document.getElementById('student-search');
const head = document.getElementById('progress-head');
const body = document.getElementById('progress-body');
const studentList = document.getElementById('student-list');
let currentUser = null;
let generation = 0;
let loadId = 0;
let courseVersion = 0;
let busy = false;
let model = null;

function classId() {
    const id = new URLSearchParams(window.location.search).get('id');
    return id && !id.includes('/') && id !== '.' && id !== '..' ? id : '';
}

function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
}

function valid(token, user, id) {
    return generation === token && currentUser === user && auth.currentUser === user && classId() === id;
}

function reset() {
    ++loadId;
    busy = false;
    model = null;
    content.classList.add('hidden');
    title.textContent = 'Class progress';
    head.replaceChildren();
    body.replaceChildren();
    studentList.replaceChildren();
}

function cell(tag, text) {
    const item = document.createElement(tag);
    item.textContent = text;
    return item;
}

function membershipButton(label, uid, email, adding) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'workbook-auth-button workbook-secondary-button';
    button.textContent = label;
    button.disabled = busy || (adding && model.members.length >= 200);
    button.setAttribute('aria-label', `${label} ${email}`);
    button.addEventListener('click', () => changeMembership(uid, adding));
    return button;
}

function render() {
    if (!model) return;
    title.textContent = model.name;
    const web = courseSelect.value === 'web';
    const sequence = courseSelect.value === 'python-sequences';
    const dataScience = courseSelect.value === 'data-science';
    const courseName = sequence ? 'Python sequences' : dataScience ? 'Data science' : 'Python';
    const taskTotal = web ? 0 : sequence ? 48 : dataScience ? 24 : 50;
    document.getElementById('progress-help').textContent = web
        ? 'Web lesson completion is self-reported by the student.'
        : `${courseName} progress counts completed tasks across lessons 1–6 (${taskTotal} tasks).`;
    head.replaceChildren();
    const headings = document.createElement('tr');
    for (const label of ['Student', 'Lesson 1', 'Lesson 2', 'Lesson 3', 'Lesson 4', 'Lesson 5', 'Lesson 6', 'Total', 'Membership']) {
        const heading = cell('th', label);
        heading.scope = 'col';
        headings.appendChild(heading);
    }
    head.appendChild(headings);
    body.replaceChildren();
    for (const member of model.members) {
        const row = document.createElement('tr');
        const name = cell('th', member.email);
        name.scope = 'row';
        row.appendChild(name);
        if (web) {
            for (const completed of member.progress) {
                row.appendChild(cell('td', completed === null ? 'Unavailable' : completed ? 'Complete' : 'Not complete'));
            }
            row.appendChild(cell('td', member.progress.includes(null)
                ? 'Unavailable'
                : `${member.progress.filter(Boolean).length}/6`));
        } else {
            const tasksPerLesson = sequence ? 8 : dataScience ? 4 : null;
            const totalTasks = tasksPerLesson ? tasksPerLesson * 6 : 50;
            for (let i = 0; i < 6; i++) {
                const count = tasksPerLesson || (i === 0 ? 10 : 8);
                row.appendChild(cell('td', member.progress[i] === null ? 'Unavailable' : `${member.progress[i]}/${count}`));
            }
            row.appendChild(cell('td', member.progress.includes(null) ? 'Unavailable' : `${member.progress.reduce((a, b) => a + b, 0)}/${totalTasks}`));
        }
        const action = document.createElement('td');
        action.appendChild(membershipButton('Remove', member.id, member.email, false));
        row.appendChild(action);
        body.appendChild(row);
    }
    document.getElementById('class-empty').classList.toggle('hidden', model.members.length !== 0);
    renderSearch();
}

function renderSearch() {
    if (!model) return;
    studentList.replaceChildren();
    const query = search.value.trim().toLowerCase();
    const matches = model.students.filter(student => student.email.toLowerCase().includes(query));
    const empty = document.getElementById('student-empty');
    empty.classList.toggle('hidden', matches.length > 0);
    empty.textContent = query ? 'No matching students found.' : 'No signed-in students found.';
    const memberIds = new Set(model.members.map(member => member.id));
    for (const student of matches) {
        const row = document.createElement('div');
        row.className = 'unclassed-row';
        row.appendChild(cell('strong', student.email));
        if (memberIds.has(student.id)) {
            row.appendChild(cell('span', 'Already in this class'));
        } else {
            row.appendChild(membershipButton('Add', student.id, student.email, true));
        }
        studentList.appendChild(row);
    }
}

async function load(token, user, id) {
    const request = ++loadId;
    const course = courseSelect.value;
    const sequence = course === 'python-sequences';
    const dataScience = course === 'data-science';
    const fresh = () => valid(token, user, id) && request === loadId && courseSelect.value === course;
    message('Loading class and progress…');
    try {
        const [classSnapshot, profiles, staff] = await Promise.all([
            getDoc(doc(db, 'classes', id)),
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'staff'))
        ]);
        if (!fresh()) return;
        if (!classSnapshot.exists()) {
            reset();
            message('This class no longer exists.', true);
            return;
        }
        const data = classSnapshot.data();
        if (!Array.isArray(data.memberIds) || data.memberIds.some(uid => typeof uid !== 'string' || !uid || uid.includes('/'))) {
            throw new Error('The class membership data is invalid.');
        }
        const staffEmails = new Set([BOOTSTRAP_ADMIN, ...staff.docs.map(entry => String(entry.data().email || entry.id).toLowerCase())]);
        const profileMap = new Map(profiles.docs.map(entry => [entry.id, String(entry.data().email || '')]));
        const students = [...profileMap].filter(([, email]) => email && !staffEmails.has(email.toLowerCase()))
            .map(([studentId, email]) => ({ id: studentId, email }))
            .sort((a, b) => a.email.localeCompare(b.email));
        const members = await Promise.all([...new Set(data.memberIds)].map(async uid => {
            const email = profileMap.get(uid) || `Unknown account (${uid})`;
            const lessons = course === 'python-sequences'
                ? Array.from({ length: 6 }, (_, index) => `sequenceCoding${index + 1}`)
                : course === 'data-science'
                    ? Array.from({ length: 6 }, (_, index) => `dataScience${index + 1}`)
                    : ['lesson1', 'lesson2', 'lesson3', 'lesson4', 'lesson5', 'lesson6'];
            const progress = await Promise.all(lessons.map(async (lesson, index) => {
                try {
                    const snapshot = await getDoc(doc(db, 'users', uid, course === 'web' ? 'webProgress' : 'progress', lesson));
                    if (!snapshot.exists()) return course === 'web' ? false : 0;
                    const value = snapshot.data();
                    if (course === 'web') return typeof value.completed === 'boolean' ? value.completed : null;
                    const count = sequence ? 8 : dataScience ? 4 : index === 0 ? 10 : 8;
                    return Array.isArray(value.completedTasks) && value.completedTasks.length === count
                        && value.completedTasks.every(task => typeof task === 'boolean')
                        ? value.completedTasks.filter(Boolean).length : null;
                } catch (error) {
                    if (fresh()) console.error('Could not load student progress.', error);
                    return null;
                }
            }));
            return { id: uid, email, progress };
        }));
        if (!fresh()) return;
        members.sort((a, b) => a.email.localeCompare(b.email));
        model = { name: String(data.name || 'Class progress'), members, students };
        render();
        content.classList.remove('hidden');
        message(`${members.length} student${members.length === 1 ? '' : 's'} in this class.`);
        return true;
    } catch (error) {
        if (!fresh()) return;
        reset();
        console.error('Could not load class.', error);
        message(`Could not load class: ${error.message}`, true);
    }
}

async function changeMembership(uid, adding) {
    if (!currentUser || !model || busy) return;
    const user = currentUser;
    const token = generation;
    const id = classId();
    const course = courseSelect.value;
    const version = courseVersion;
    const fresh = () => valid(token, user, id) && courseSelect.value === course && courseVersion === version;
    busy = true;
    ++loadId;
    render();
    message('Saving membership…');
    try {
        const result = await runTransaction(db, async transaction => {
            const ref = doc(db, 'classes', id);
            const [classSnapshot, profile] = await Promise.all([
                transaction.get(ref), transaction.get(doc(db, 'users', uid))
            ]);
            if (!fresh()) throw new Error('The page changed before the membership could be saved.');
            if (!classSnapshot.exists()) throw new Error('This class no longer exists.');
            const members = classSnapshot.data().memberIds;
            if (!Array.isArray(members)) throw new Error('The class membership data is invalid.');
            if (adding) {
                if (!profile.exists() || typeof profile.data().email !== 'string' || !profile.data().email) throw new Error('This student profile no longer exists.');
                const email = profile.data().email.toLowerCase();
                const staff = await transaction.get(doc(db, 'staff', email));
                if (!fresh()) throw new Error('The page changed before the membership could be saved.');
                if (email === BOOTSTRAP_ADMIN || staff.exists()) throw new Error('Staff accounts cannot be added as students.');
                if (members.includes(uid)) return 'This student is already in the class.';
                if (members.length >= 200) throw new Error('A class can have at most 200 students.');
            } else if (!members.includes(uid)) {
                return 'This student is no longer in the class.';
            }
            const next = adding ? [...members, uid] : members.filter(member => member !== uid);
            transaction.update(ref, { memberIds: next, updatedAt: serverTimestamp(), updatedBy: user.email });
            return adding ? 'Student added.' : 'Student removed.';
        });
        if (!fresh()) return;
        busy = false;
        const loaded = await load(token, user, id);
        if (fresh() && loaded) message(result);
    } catch (error) {
        if (!fresh()) return;
        busy = false;
        console.error('Could not change class membership.', error);
        if (model) render();
        message(`Could not save membership: ${error.message}`, true);
    }
}

async function start(user) {
    const token = ++generation;
    currentUser = null;
    reset();
    const id = classId();
    if (!id) {
        message('A valid class id is required. Return to All classes and choose a class.', true);
        return;
    }
    if (!user || !user.emailVerified || !user.email?.toLowerCase().endsWith('@derbygrammar.org')) {
        message('Sign in with a school staff account to access this page.');
        return;
    }
    currentUser = user;
    message('Checking staff access…');
    try {
        const email = user.email.toLowerCase();
        const staff = email === BOOTSTRAP_ADMIN ? null : await getDoc(doc(db, 'staff', email));
        if (!valid(token, user, id)) return;
        if (email !== BOOTSTRAP_ADMIN && (!staff.exists() || !['teacher', 'admin'].includes(staff.data().role))) {
            currentUser = null;
            message('This account does not have teacher dashboard access.', true);
            return;
        }
        await load(token, user, id);
    } catch (error) {
        if (!valid(token, user, id)) return;
        console.error('Could not verify staff access.', error);
        message(`Could not verify staff access: ${error.message}`, true);
    }
}

search.addEventListener('input', renderSearch);
courseSelect.addEventListener('change', () => {
    ++courseVersion;
    if (!currentUser) return;
    busy = false;
    model = null;
    content.classList.add('hidden');
    load(generation, currentUser, classId());
});
document.getElementById('teacher-refresh').addEventListener('click', () => {
    if (currentUser) load(generation, currentUser, classId());
});
document.getElementById('class-retry').addEventListener('click', () => start(auth.currentUser));
window.addEventListener('popstate', () => start(auth.currentUser));
onAuthStateChanged(auth, start);
