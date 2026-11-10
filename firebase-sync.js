import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import {
    GoogleAuthProvider,
    getAuth,
    onAuthStateChanged,
    signInWithPopup,
    signOut
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import {
    doc,
    getDoc,
    getFirestore,
    runTransaction,
    setDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const SCHOOL_DOMAIN = 'derbygrammar.org';
const BOOTSTRAP_ADMIN_EMAIL = 'wesley.m@derbygrammar.org';
const ACCOUNT_KEY = 'ks3_python_account_uid';
const ACCOUNT_BACKUP_PREFIX = 'ks3_python_account_backup:';
const IS_LOCAL_PREVIEW = location.protocol === 'file:' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname.toLowerCase());
const LESSONS = {
    lesson1: {
        storageKey: 'ks3_python_lesson1_v3_state',
        taskXp: [50, 75, 75, 100, 125, 150, 150, 250, 300, 450],
        taskMap: true
    },
    lesson2: {
        storageKey: 'ks3_python_lesson2_v1_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    lesson3: {
        storageKey: 'ks3_python_lesson3_v1_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    lesson4: {
        storageKey: 'ks3_python_lesson4_v1_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    lesson5: {
        storageKey: 'ks3_python_lesson5_v1_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    lesson6: {
        storageKey: 'ks3_python_lesson6_v1_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    sequence1: {
        storageKey: 'ks3_python_sequences_lesson1_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    sequence2: {
        storageKey: 'ks3_python_sequences_lesson2_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    sequence3: {
        storageKey: 'ks3_python_sequences_lesson3_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    sequence4: {
        storageKey: 'ks3_python_sequences_lesson4_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    sequence5: {
        storageKey: 'ks3_python_sequences_lesson5_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    sequence6: {
        storageKey: 'ks3_python_sequences_lesson6_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    sequenceCoding1: {
        storageKey: 'ks3_python_sequences_lesson1_v2_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    sequenceCoding2: {
        storageKey: 'ks3_python_sequences_lesson2_v2_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    sequenceCoding3: {
        storageKey: 'ks3_python_sequences_lesson3_v2_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    sequenceCoding4: {
        storageKey: 'ks3_python_sequences_lesson4_v2_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    sequenceCoding5: {
        storageKey: 'ks3_python_sequences_lesson5_v2_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    sequenceCoding6: {
        storageKey: 'ks3_python_sequences_lesson6_v2_state',
        taskXp: [50, 75, 100, 125, 150, 200, 300, 450],
        taskMap: false
    },
    dataScience1: {
        storageKey: 'ks3_data_science_lesson1_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    dataScience2: {
        storageKey: 'ks3_data_science_lesson2_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    dataScience3: {
        storageKey: 'ks3_data_science_lesson3_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    dataScience4: {
        storageKey: 'ks3_data_science_lesson4_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    dataScience5: {
        storageKey: 'ks3_data_science_lesson5_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    dataScience6: {
        storageKey: 'ks3_data_science_lesson6_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    digitalGuidebook1: {
        storageKey: 'ks3_digital_guidebook_lesson1_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    digitalGuidebook2: {
        storageKey: 'ks3_digital_guidebook_lesson2_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    digitalGuidebook3: {
        storageKey: 'ks3_digital_guidebook_lesson3_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    digitalGuidebook4: {
        storageKey: 'ks3_digital_guidebook_lesson4_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    digitalGuidebook5: {
        storageKey: 'ks3_digital_guidebook_lesson5_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    },
    digitalGuidebook6: {
        storageKey: 'ks3_digital_guidebook_lesson6_v1_state',
        taskXp: [50, 75, 100, 150],
        taskMap: false
    }
};

const firebaseConfig = {
    apiKey: 'AIzaSyC4sS7kiQH-hR0DVpmamJu7pZlTPcJ8wrY',
    authDomain: 'ks3-python-workbook.firebaseapp.com',
    projectId: 'ks3-python-workbook',
    storageBucket: 'ks3-python-workbook.firebasestorage.app',
    messagingSenderId: '838999240009',
    appId: '1:838999240009:web:ca90f6d7abffd553f57e98'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: SCHOOL_DOMAIN });

let activeUser = null;
let activeRole = 'student';
let cloudReady = false;
let syncInProgress = false;
let rejectedAccountMessage = '';
let authGeneration = 0;

function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
}

function setAuthStatus(status, message, email = '') {
    const statusElement = document.getElementById('workbook-auth-status');
    const emailElement = document.getElementById('workbook-account-email');
    const signInButton = document.getElementById('workbook-sign-in');
    const signOutButton = document.getElementById('workbook-sign-out');
    const retryButton = document.getElementById('workbook-sync-retry');
    const teacherLink = document.getElementById('teacher-dashboard-link');

    if (statusElement) statusElement.textContent = message;
    if (emailElement) {
        emailElement.textContent = email;
        emailElement.classList.toggle('hidden', !email);
    }
    if (signInButton) {
        signInButton.classList.toggle('hidden', IS_LOCAL_PREVIEW || Boolean(activeUser));
        signInButton.disabled = syncInProgress;
    }
    if (signOutButton) {
        signOutButton.classList.toggle('hidden', IS_LOCAL_PREVIEW || !activeUser);
        signOutButton.disabled = syncInProgress;
    }
    if (retryButton) {
        retryButton.classList.toggle('hidden', IS_LOCAL_PREVIEW || !['error', 'warning'].includes(status) || !activeUser);
        retryButton.disabled = syncInProgress;
    }
    if (teacherLink) teacherLink.classList.toggle('hidden', !['teacher', 'admin'].includes(activeRole));

    document.body.classList.toggle('workbook-auth-required', !['ready', 'warning', 'local'].includes(status));
    emit('workbook-auth-state', { status, message, email });
}

function readLocalTasks(lessonId) {
    const lesson = LESSONS[lessonId];
    const raw = localStorage.getItem(lesson.storageKey);
    if (!raw) return lesson.taskXp.map(() => false);

    try {
        const saved = JSON.parse(raw);
        const completed = saved?.completedTasks;
        return lesson.taskXp.map((_, index) => {
            if (lesson.taskMap) {
                return Array.isArray(completed)
                    ? completed[index] === true
                    : completed?.[index + 1] === true;
            }
            return Array.isArray(completed)
                ? completed[index] === true
                : completed?.[index + 1] === true;
        });
    } catch (error) {
        console.error(`Could not read local ${lessonId} progress for cloud sync.`, error);
        return lesson.taskXp.map(() => false);
    }
}

function normalizeTasks(tasks, length) {
    if (!Array.isArray(tasks)) return Array.from({ length }, () => false);
    const normalized = tasks.slice(0, length).map(task => task === true);
    while (normalized.length < length) normalized.push(false);
    return normalized;
}

function mergeTasks(localTasks, cloudTasks, length) {
    const normalizedLocal = normalizeTasks(localTasks, length);
    const normalizedCloud = normalizeTasks(cloudTasks, length);
    return Array.from({ length }, (_, index) =>
        normalizedLocal[index] || normalizedCloud[index]
    );
}

function saveLocalTasks(lessonId, tasks) {
    const lesson = LESSONS[lessonId];
    let saved = {};
    const raw = localStorage.getItem(lesson.storageKey);

    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
        } catch (error) {
            console.error(`Could not preserve local settings for ${lessonId}.`, error);
        }
    }

    saved.completedTasks = lesson.taskMap
        ? Object.fromEntries(tasks.map((completed, index) => [index + 1, completed]))
        : tasks;
    saved.xp = tasks.reduce((xp, completed, index) => xp + (completed ? lesson.taskXp[index] : 0), 0);

    if (lessonId === 'lesson1') {
        saved.level = saved.xp >= 1400
            ? 'Creative Master'
            : saved.xp >= 900
                ? 'Python Wizard'
                : saved.xp >= 400
                    ? 'Apprentice Coder'
                    : 'Novice Coder';
    }
    localStorage.setItem(lesson.storageKey, JSON.stringify(saved));
}

function clearLocalProgress() {
    for (const lesson of Object.values(LESSONS)) {
        localStorage.removeItem(lesson.storageKey);
    }
    localStorage.removeItem(ACCOUNT_KEY);
    emit('workbook-progress-updated');
}

function preserveAndClearLocalProgress() {
    const uid = localStorage.getItem(ACCOUNT_KEY);
    if (uid) {
        const saved = {};
        for (const lesson of Object.values(LESSONS)) {
            saved[lesson.storageKey] = localStorage.getItem(lesson.storageKey);
        }
        localStorage.setItem(ACCOUNT_BACKUP_PREFIX + uid, JSON.stringify(saved));
    }
    clearLocalProgress();
}

function restoreLocalProgress(uid) {
    const raw = localStorage.getItem(ACCOUNT_BACKUP_PREFIX + uid);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        throw new Error('The saved browser backup is invalid.');
    }
    for (const lesson of Object.values(LESSONS)) {
        const value = saved[lesson.storageKey];
        if (value !== null && typeof value !== 'string') {
            throw new Error('The saved browser backup is incomplete.');
        }
    }
    for (const lesson of Object.values(LESSONS)) {
        const value = saved[lesson.storageKey];
        if (value === null) localStorage.removeItem(lesson.storageKey);
        else localStorage.setItem(lesson.storageKey, value);
    }
}

async function syncUserProgress(user) {
    if (syncInProgress) return;
    const generation = authGeneration;
    const isCurrent = () => generation === authGeneration && auth.currentUser?.uid === user.uid;
    syncInProgress = true;
    cloudReady = false;
    setAuthStatus('checking', 'Checking school account and syncing progress…', user.email);

    try {
        await setDoc(doc(database, 'users', user.uid), {
            email: user.email,
            lastLogin: serverTimestamp()
        }, { merge: true });
        if (!isCurrent()) return;

        const staffSnapshot = user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
            ? null
            : await getDoc(doc(database, 'staff', user.email.toLowerCase()));
        if (!isCurrent()) return;
        activeRole = user.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
            ? 'admin'
            : staffSnapshot?.data()?.role === 'admin'
                ? 'admin'
                : staffSnapshot?.data()?.role === 'teacher'
                    ? 'teacher'
                    : 'student';

        const previousUid = localStorage.getItem(ACCOUNT_KEY);
        if (previousUid && previousUid !== user.uid) preserveAndClearLocalProgress();
        if (!previousUid && Object.values(LESSONS).some(lesson => localStorage.getItem(lesson.storageKey) !== null)) {
            throw new Error('Unassigned browser progress was not changed or linked to an account. Contact your teacher before syncing.');
        }
        localStorage.setItem(ACCOUNT_KEY, user.uid);
        restoreLocalProgress(user.uid);

        for (const lessonId of Object.keys(LESSONS)) {
            const localTasks = readLocalTasks(lessonId);
            const progressRef = doc(database, 'users', user.uid, 'progress', lessonId);
            const mergedTasks = await runTransaction(database, async transaction => {
                const snapshot = await transaction.get(progressRef);
                const cloudTasks = snapshot.exists() ? snapshot.data().completedTasks : [];
                const merged = mergeTasks(localTasks, cloudTasks, LESSONS[lessonId].taskXp.length);
                transaction.set(progressRef, {
                    completedTasks: merged,
                    updatedAt: serverTimestamp()
                });
                return merged;
            });
            if (!isCurrent()) return;
            saveLocalTasks(lessonId, mergeTasks(readLocalTasks(lessonId), mergedTasks, LESSONS[lessonId].taskXp.length));
        }

        localStorage.removeItem(ACCOUNT_BACKUP_PREFIX + user.uid);
        activeUser = user;
        cloudReady = true;
        setAuthStatus('ready', 'Progress synced', user.email);
        emit('workbook-progress-updated');
    } catch (error) {
        if (!isCurrent()) return;
        console.error('Could not sync workbook progress with Firebase.', error);
        setAuthStatus('error', `Progress sync failed: ${error.message}`, user.email);
    } finally {
        syncInProgress = false;
        if (!isCurrent() && auth.currentUser?.emailVerified
            && (auth.currentUser.email || '').toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`)) {
            syncUserProgress(auth.currentUser);
            return;
        }
        if (!isCurrent()) return;
        const status = document.getElementById('workbook-auth-status');
        if (status) {
            const failed = status.textContent.startsWith('Progress sync failed:');
            const signInButton = document.getElementById('workbook-sign-in');
            const signOutButton = document.getElementById('workbook-sign-out');
            const retryButton = document.getElementById('workbook-sync-retry');
            if (signInButton) signInButton.disabled = false;
            if (signOutButton) signOutButton.disabled = false;
            if (retryButton) {
                retryButton.classList.toggle('hidden', !failed);
                retryButton.disabled = false;
            }
        }
    }
}

async function saveProgress(lessonId) {
    if (!cloudReady || !activeUser || !LESSONS[lessonId]) return;

    const user = activeUser;
    const generation = authGeneration;
    const localTasks = readLocalTasks(lessonId);
    const progressRef = doc(database, 'users', user.uid, 'progress', lessonId);

    try {
        const result = await runTransaction(database, async transaction => {
            const snapshot = await transaction.get(progressRef);
            const cloudTasks = snapshot.exists() ? snapshot.data().completedTasks : [];
            const merged = mergeTasks(localTasks, cloudTasks, LESSONS[lessonId].taskXp.length);
            transaction.set(progressRef, {
                completedTasks: merged,
                updatedAt: serverTimestamp()
            });
            return merged;
        });
        if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
        saveLocalTasks(lessonId, mergeTasks(readLocalTasks(lessonId), result, LESSONS[lessonId].taskXp.length));
        emit('workbook-progress-updated');
        setAuthStatus('ready', 'Progress synced', user.email);
    } catch (error) {
        if (generation !== authGeneration || auth.currentUser?.uid !== user.uid) return;
        console.error(`Could not save ${lessonId} progress to Firebase.`, error);
        setAuthStatus('warning', 'Progress is saved on this device but has not synced. Retry when online.', user.email);
    }
}

async function signIn() {
    try {
        setAuthStatus('checking', 'Opening school Google sign-in…');
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error('Google sign-in failed.', error);
        setAuthStatus('error', `Sign-in failed: ${error.message}`);
    }
}

async function signOutCurrentUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Could not sign out of the workbook.', error);
        setAuthStatus('error', `Sign-out failed: ${error.message}`, activeUser?.email || '');
    }
}

window.workbookCloud = { saveProgress, retry: () => activeUser && syncUserProgress(activeUser) };

document.getElementById('workbook-sign-in')?.addEventListener('click', signIn);
document.getElementById('workbook-sign-out')?.addEventListener('click', signOutCurrentUser);
document.getElementById('workbook-sync-retry')?.addEventListener('click', () => {
    if (activeUser) syncUserProgress(activeUser);
});

if (IS_LOCAL_PREVIEW) {
    setAuthStatus('local', 'Local preview — progress is saved only in this browser.');
} else {
    document.body.classList.add('workbook-auth-required');
    setAuthStatus('checking', 'Checking Google sign-in…');

    onAuthStateChanged(auth, async user => {
        authGeneration += 1;
        if (!user) {
            let backupFailed = false;
            if (activeUser && cloudReady) {
                try {
                    preserveAndClearLocalProgress();
                } catch (error) {
                    console.error('Could not preserve local progress before signing out.', error);
                    backupFailed = true;
                }
            }
            activeUser = null;
            activeRole = 'student';
            cloudReady = false;
            setAuthStatus(
                rejectedAccountMessage ? 'rejected' : 'signed-out',
                rejectedAccountMessage || (backupFailed
                    ? 'Could not preserve your browser progress. Sign in with the same account and retry sync.'
                    : 'Sign in with your school Google account to continue.')
            );
            rejectedAccountMessage = '';
            return;
        }

        const email = user.email || '';
        if (!user.emailVerified || !email.toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`)) {
            activeUser = user;
            cloudReady = false;
            rejectedAccountMessage = `Use a verified @${SCHOOL_DOMAIN} account to access the workbook.`;
            setAuthStatus('rejected', rejectedAccountMessage, email);
            try {
                await signOut(auth);
            } catch (error) {
                console.error('Could not end the non-school Google session.', error);
            }
            return;
        }

        activeUser = user;
        await syncUserProgress(user);
    });
}
