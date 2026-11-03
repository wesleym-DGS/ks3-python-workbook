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
    getFirestore,
    runTransaction,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const SCHOOL_DOMAIN = 'derbygrammar.org';
const ACCOUNT_KEY = 'ks3_python_account_uid';
const LESSONS = {
    lesson1: {
        storageKey: 'ks3_python_lesson1_v3_state',
        taskXp: [50, 75, 75, 100, 125, 150, 150, 250, 300, 450],
        taskMap: true
    },
    lesson2: {
        storageKey: 'ks3_python_lesson2_v1_state',
        taskXp: [50, 75, 100, 125, 150, 200],
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
let cloudReady = false;
let syncInProgress = false;
let rejectedAccountMessage = '';

function emit(name, detail = {}) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
}

function setAuthStatus(status, message, email = '') {
    const statusElement = document.getElementById('workbook-auth-status');
    const emailElement = document.getElementById('workbook-account-email');
    const signInButton = document.getElementById('workbook-sign-in');
    const signOutButton = document.getElementById('workbook-sign-out');
    const retryButton = document.getElementById('workbook-sync-retry');

    if (statusElement) statusElement.textContent = message;
    if (emailElement) {
        emailElement.textContent = email;
        emailElement.classList.toggle('hidden', !email);
    }
    if (signInButton) {
        signInButton.classList.toggle('hidden', Boolean(activeUser));
        signInButton.disabled = syncInProgress;
    }
    if (signOutButton) {
        signOutButton.classList.toggle('hidden', !activeUser);
        signOutButton.disabled = syncInProgress;
    }
    if (retryButton) {
        retryButton.classList.toggle('hidden', !['error', 'warning'].includes(status) || !activeUser);
        retryButton.disabled = syncInProgress;
    }

    document.body.classList.toggle('workbook-auth-required', !['ready', 'warning'].includes(status));
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

function mergeTasks(localTasks, cloudTasks, length) {
    return Array.from({ length }, (_, index) =>
        localTasks[index] === true || (Array.isArray(cloudTasks) && cloudTasks[index] === true)
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

async function syncUserProgress(user) {
    if (syncInProgress) return;
    syncInProgress = true;
    cloudReady = false;
    setAuthStatus('checking', 'Checking school account and syncing progress…', user.email);

    try {
        const previousUid = localStorage.getItem(ACCOUNT_KEY);
        if (previousUid && previousUid !== user.uid) clearLocalProgress();

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
            saveLocalTasks(lessonId, mergedTasks);
        }

        localStorage.setItem(ACCOUNT_KEY, user.uid);
        activeUser = user;
        cloudReady = true;
        setAuthStatus('ready', 'Progress synced', user.email);
        emit('workbook-progress-updated');
    } catch (error) {
        console.error('Could not sync workbook progress with Firebase.', error);
        setAuthStatus('error', `Progress sync failed: ${error.message}`, user.email);
    } finally {
        syncInProgress = false;
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
    const localTasks = readLocalTasks(lessonId);
    const progressRef = doc(database, 'users', user.uid, 'progress', lessonId);

    try {
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
        saveLocalTasks(lessonId, mergedTasks);
        emit('workbook-progress-updated');
        setAuthStatus('ready', 'Progress synced', user.email);
    } catch (error) {
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

document.body.classList.add('workbook-auth-required');
setAuthStatus('checking', 'Checking Google sign-in…');

onAuthStateChanged(auth, async user => {
    if (!user) {
        if (activeUser && cloudReady) clearLocalProgress();
        activeUser = null;
        cloudReady = false;
        setAuthStatus(
            rejectedAccountMessage ? 'rejected' : 'signed-out',
            rejectedAccountMessage || 'Sign in with your school Google account to continue.'
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
