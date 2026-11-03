import './firebase-sync.js';
import { getApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const SCHOOL_DOMAIN = 'derbygrammar.org';
const BOOTSTRAP_ADMIN_EMAIL = 'wesley.m@derbygrammar.org';
const auth = getAuth(getApp());
const database = getFirestore(getApp());
const activityPanel = document.getElementById('teacher-activity');
const managementPanel = document.getElementById('teacher-management');
const statusElement = document.getElementById('teacher-status');
let currentUser = null;
let currentRole = 'student';

function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle('is-error', isError);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

function completedCount(value, expected) {
    return Array.isArray(value) ? value.slice(0, expected).filter(task => task === true).length : 0;
}

function formatLastSeen(timestamp) {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'Not recorded';
    return timestamp.toDate().toLocaleString();
}

async function loadStudents() {
    setStatus('Loading student activity…');
    const [profiles, staff] = await Promise.all([
        getDocs(query(collection(database, 'users'), orderBy('lastLogin', 'desc'))),
        getDocs(collection(database, 'staff'))
    ]);
    const staffEmails = new Set([
        BOOTSTRAP_ADMIN_EMAIL,
        ...staff.docs.map(entry => String(entry.data().email).toLowerCase())
    ]);
    const students = profiles.docs.filter(profile =>
        !staffEmails.has(String(profile.data().email || '').toLowerCase())
    );
    const rows = await Promise.all(students.map(async profile => {
        const [lesson1, lesson2] = await Promise.all([
            getDoc(doc(database, 'users', profile.id, 'progress', 'lesson1')),
            getDoc(doc(database, 'users', profile.id, 'progress', 'lesson2'))
        ]);
        const lesson1Count = completedCount(lesson1.data()?.completedTasks, 10);
        const lesson2Count = completedCount(lesson2.data()?.completedTasks, 6);
        const email = profile.data().email || 'Unknown account';
        return `<tr>
            <td>${escapeHtml(email)}</td>
            <td>${escapeHtml(formatLastSeen(profile.data().lastLogin))}</td>
            <td>${lesson1Count} / 10</td>
            <td>${lesson2Count} / 6</td>
            <td>${lesson1Count + lesson2Count} / 16</td>
        </tr>`;
    }));

    document.getElementById('teacher-student-rows').innerHTML = rows.join('');
    document.getElementById('teacher-empty').classList.toggle('hidden', rows.length > 0);
    setStatus(`${rows.length} student account${rows.length === 1 ? '' : 's'} found.`);
}

async function loadStaff() {
    const list = document.getElementById('teacher-staff-list');
    const staff = await getDocs(collection(database, 'staff'));
    const records = staff.docs.map(entry => entry.data())
        .sort((left, right) => String(left.email).localeCompare(String(right.email)));

    list.innerHTML = records.map(record => `
        <div class="teacher-staff-row">
            <span><strong>${escapeHtml(record.email)}</strong><small>${escapeHtml(record.role)}</small></span>
            <button type="button" class="workbook-auth-button workbook-secondary-button" data-remove-staff="${escapeHtml(record.email)}">Remove</button>
        </div>
    `).join('');
}

async function loadDashboard(user) {
    currentUser = user;
    currentRole = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL ? 'admin' : 'student';

    if (currentRole !== 'admin') {
        const ownStaffRecord = await getDoc(doc(database, 'staff', user.email.toLowerCase()));
        const role = ownStaffRecord.data()?.role;
        if (role === 'teacher' || role === 'admin') currentRole = role;
    }

    if (currentRole !== 'teacher' && currentRole !== 'admin') {
        activityPanel.classList.add('hidden');
        managementPanel.classList.add('hidden');
        setStatus('This account does not have teacher dashboard access.', true);
        return;
    }

    activityPanel.classList.remove('hidden');
    managementPanel.classList.toggle('hidden', currentRole !== 'admin');
    try {
        await loadStudents();
        if (currentRole === 'admin') await loadStaff();
    } catch (error) {
        console.error('Could not load teacher dashboard data.', error);
        setStatus(`Could not load dashboard data: ${error.message}`, true);
    }
}

document.getElementById('teacher-refresh').addEventListener('click', async () => {
    if (currentUser && (currentRole === 'teacher' || currentRole === 'admin')) {
        try {
            await loadStudents();
        } catch (error) {
            console.error('Could not refresh student activity.', error);
            setStatus(`Could not refresh activity: ${error.message}`, true);
        }
    }
});

document.getElementById('teacher-add-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (currentRole !== 'admin' || !currentUser) return;

    const email = document.getElementById('teacher-email').value.trim().toLowerCase();
    const role = document.getElementById('teacher-role').value;
    const managementStatus = document.getElementById('teacher-management-status');
    if (!email.endsWith(`@${SCHOOL_DOMAIN}`)) {
        managementStatus.textContent = `Use an @${SCHOOL_DOMAIN} email address.`;
        return;
    }
    if (email === BOOTSTRAP_ADMIN_EMAIL) {
        managementStatus.textContent = 'The bootstrap admin account cannot be changed here.';
        return;
    }

    try {
        await setDoc(doc(database, 'staff', email), {
            email,
            role,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser.email
        });
        event.currentTarget.reset();
        managementStatus.textContent = `${email} added as ${role}.`;
        await loadStaff();
    } catch (error) {
        console.error('Could not update staff access.', error);
        managementStatus.textContent = `Could not update staff access: ${error.message}`;
    }
});

document.getElementById('teacher-staff-list').addEventListener('click', async event => {
    const button = event.target.closest('[data-remove-staff]');
    if (!button || currentRole !== 'admin') return;

    const email = button.dataset.removeStaff;
    try {
        await deleteDoc(doc(database, 'staff', email));
        document.getElementById('teacher-management-status').textContent = `${email} removed from staff access.`;
        await loadStaff();
    } catch (error) {
        console.error('Could not remove staff access.', error);
        document.getElementById('teacher-management-status').textContent = `Could not remove staff access: ${error.message}`;
    }
});

onAuthStateChanged(auth, user => {
    if (!user || !user.emailVerified || !user.email?.toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`)) {
        currentUser = null;
        activityPanel.classList.add('hidden');
        managementPanel.classList.add('hidden');
        setStatus('Sign in with a school staff account to access this page.');
        return;
    }

    loadDashboard(user).catch(error => {
        console.error('Could not determine staff access.', error);
        setStatus(`Could not verify staff access: ${error.message}`, true);
    });
});
