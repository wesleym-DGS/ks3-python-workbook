import './firebase-sync.js?v=20261110-2';
import { getApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    serverTimestamp,
    setDoc
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const SCHOOL_DOMAIN = 'derbygrammar.org';
const BOOTSTRAP_ADMIN = 'wesley.m@derbygrammar.org';
const auth = getAuth(getApp());
const db = getFirestore(getApp());
const content = document.getElementById('staff-content');
const status = document.getElementById('teacher-status');
const form = document.getElementById('staff-add-form');
const emailInput = document.getElementById('staff-email');
const roleInput = document.getElementById('staff-role');
const saveButton = document.getElementById('staff-save');
const staffList = document.getElementById('staff-list');
const emptyMessage = document.getElementById('staff-empty');
let currentUser = null;
let generation = 0;
let loadId = 0;
let staff = [];
let dataReady = false;
let busy = false;

function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
}

function clearView() {
    content.classList.add('hidden');
    staffList.replaceChildren();
    emptyMessage.classList.add('hidden');
    form.reset();
    staff = [];
    dataReady = false;
    busy = false;
    updateControls();
}

function validSession(token, user) {
    return generation === token
        && currentUser?.uid === user.uid
        && auth.currentUser?.uid === user.uid;
}

function updateControls() {
    const disabled = !currentUser || !dataReady || busy;
    emailInput.disabled = disabled;
    roleInput.disabled = disabled;
    saveButton.disabled = disabled;
    for (const button of staffList.querySelectorAll('button')) button.disabled = disabled;
    const refreshButton = document.getElementById('staff-refresh');
    refreshButton.disabled = !currentUser || busy;
}

function render() {
    staffList.replaceChildren();
    emptyMessage.textContent = 'No staff accounts have been added.';
    emptyMessage.classList.toggle('hidden', staff.length > 0);

    for (const entry of staff) {
        const row = document.createElement('div');
        row.className = 'teacher-staff-row';

        const details = document.createElement('span');
        const email = document.createElement('strong');
        email.textContent = entry.email;
        const role = document.createElement('small');
        role.textContent = entry.role === 'admin'
            ? 'Admin role · teacher-dashboard access'
            : 'Teacher role';
        details.append(email, role);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'workbook-auth-button workbook-secondary-button';
        remove.dataset.email = entry.email;
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label', `Remove staff access for ${entry.email}`);
        row.append(details, remove);
        staffList.appendChild(row);
    }

    updateControls();
}

async function loadStaff(token, user) {
    const request = ++loadId;
    dataReady = false;
    staff = [];
    render();
    emptyMessage.classList.add('hidden');
    message('Loading staff accounts…');

    try {
        const snapshot = await getDocs(collection(db, 'staff'));
        if (!validSession(token, user) || request !== loadId) return false;
        staff = snapshot.docs
            .map(entry => ({
                email: entry.id,
                role: entry.data().role
            }))
            .filter(entry =>
                entry.email.toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`)
                && ['teacher', 'admin'].includes(entry.role)
            )
            .sort((a, b) => a.email.localeCompare(b.email));
        dataReady = true;
        render();
        content.classList.remove('hidden');
        message(`${staff.length} staff account${staff.length === 1 ? '' : 's'} listed.`);
        return true;
    } catch (error) {
        if (!validSession(token, user) || request !== loadId) return false;
        console.error('Could not load staff accounts.', error);
        if (error.code === 'permission-denied') {
            currentUser = null;
            clearView();
            message('Staff-management access was denied by Firestore rules. Only the bootstrap administrator can manage staff.', true);
            return false;
        }
        dataReady = false;
        render();
        content.classList.remove('hidden');
        emptyMessage.textContent = 'Staff accounts could not be loaded. Use Refresh to try again.';
        emptyMessage.classList.remove('hidden');
        updateControls();
        message(`Could not load staff accounts: ${error.message}`, true);
        return false;
    }
}

async function saveStaff(email, role, token, user) {
    busy = true;
    updateControls();
    message('Saving staff access…');

    try {
        await setDoc(doc(db, 'staff', email), {
            email,
            role,
            updatedAt: serverTimestamp(),
            updatedBy: user.email
        });
        if (!validSession(token, user)) return;
        const refreshed = await loadStaff(token, user);
        if (validSession(token, user)) {
            form.reset();
            message(refreshed
                ? `Staff access saved for ${email}.`
                : 'Staff access was saved, but the staff list could not be refreshed. Use Refresh to verify.', !refreshed);
        }
    } catch (error) {
        if (!validSession(token, user)) return;
        console.error('Could not save staff access.', error);
        message(`Could not save staff access: ${error.message}`, true);
    } finally {
        if (validSession(token, user)) {
            busy = false;
            updateControls();
        }
    }
}

async function removeStaff(email, token, user) {
    busy = true;
    updateControls();
    message('Removing staff access…');

    try {
        await deleteDoc(doc(db, 'staff', email));
        if (!validSession(token, user)) return;
        const refreshed = await loadStaff(token, user);
        if (validSession(token, user)) {
            message(refreshed
                ? `Staff access removed for ${email}.`
                : 'Staff access was removed, but the staff list could not be refreshed. Use Refresh to verify.', !refreshed);
        }
    } catch (error) {
        if (!validSession(token, user)) return;
        console.error('Could not remove staff access.', error);
        message(`Could not remove staff access: ${error.message}`, true);
    } finally {
        if (validSession(token, user)) {
            busy = false;
            updateControls();
        }
    }
}

form.addEventListener('submit', event => {
    event.preventDefault();
    if (!currentUser || !dataReady || busy) return;

    const email = emailInput.value.trim().toLowerCase();
    const role = roleInput.value;
    if (!email.endsWith(`@${SCHOOL_DOMAIN}`)) {
        message(`Enter an email address ending in @${SCHOOL_DOMAIN}.`, true);
        emailInput.focus();
        return;
    }
    if (email === BOOTSTRAP_ADMIN) {
        message('The bootstrap administrator is built in and cannot be added or removed here.', true);
        emailInput.focus();
        return;
    }
    if (!['teacher', 'admin'].includes(role)) {
        message('Choose a valid staff role.', true);
        roleInput.focus();
        return;
    }

    saveStaff(email, role, generation, currentUser);
});

document.getElementById('staff-refresh').addEventListener('click', () => {
    if (!currentUser || busy) return;
    loadStaff(generation, currentUser);
});

staffList.addEventListener('click', event => {
    const button = event.target.closest('button[data-email]');
    if (!button || !currentUser || !dataReady || busy) return;
    const email = button.dataset.email;
    if (!email || email === BOOTSTRAP_ADMIN || !staff.some(entry => entry.email === email)) return;
    if (!window.confirm(`Remove staff access for ${email}?`)) return;
    removeStaff(email, generation, currentUser);
});

onAuthStateChanged(auth, async user => {
    const token = ++generation;
    ++loadId;
    currentUser = null;
    clearView();

    if (!user || !user.emailVerified || !user.email?.toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`)) {
        message('Sign in with a verified school staff account to access this page.');
        return;
    }

    if (user.email !== BOOTSTRAP_ADMIN) {
        message('Staff management is restricted to the bootstrap administrator. Teacher and admin roles do not grant management access.', true);
        return;
    }

    currentUser = user;
    content.classList.remove('hidden');
    updateControls();
    message('Verifying bootstrap administrator access…');
    await loadStaff(token, user);
});
