import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { doc, getDocFromServer, getFirestore, runTransaction, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const config = {
  apiKey: 'AIzaSyC4sS7kiQH-hR0DVpmamJu7pZlTPcJ8wrY',
  authDomain: 'ks3-python-workbook.firebaseapp.com',
  projectId: 'ks3-python-workbook',
  storageBucket: 'ks3-python-workbook.firebasestorage.app',
  messagingSenderId: '838999240009',
  appId: '1:838999240009:web:ca90f6d7abffd553f57e98'
};
const app = getApps().length ? getApps()[0] : initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ hd: 'derbygrammar.org' });
const status = document.getElementById('auth-status');
const saveStatus = document.getElementById('storage-status');
const signInButton = document.getElementById('sign-in');
const signOutButton = document.getElementById('sign-out');
const retryButton = document.getElementById('retry');
const conflictPanel = document.getElementById('conflict');
const isLesson = Boolean(document.body.dataset.lesson);
const lessonId = isLesson ? `lesson${document.body.dataset.lesson}` : 'lesson1';
let user = null;
let revision = 0;
let dirty = false;
let saving = false;
let conflict = null;
let timer = null;
let generation = 0;
let editVersion = 0;
let cloudFields = {};
const draftId = crypto.randomUUID();

function message(text, warning = false) {
  status.textContent = text;
  if (saveStatus) {
    saveStatus.textContent = text;
    saveStatus.classList.toggle('warning', warning);
  }
}

function workRef(uid) { return doc(db, 'users', uid, 'webWork', lessonId); }
function progressRef(uid) { return doc(db, 'users', uid, 'webProgress', lessonId); }
function draftPrefix(uid) {
  const lessonPrefix = lessonId === 'lesson1' ? '' : `${lessonId}:`;
  return `web-course-draft:${uid}:${lessonPrefix}`;
}
function draftKey(uid) { return draftPrefix(uid) + draftId; }

function storeDraft() {
  if (!user || !isLesson) return false;
  try {
    localStorage.setItem(draftKey(user.uid), JSON.stringify({
      revision, fields: window.webLesson.read(), savedAt: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    console.error('Could not retain the unsynced draft.', error);
    message('Could not save a browser draft. Keep this page open and retry online; download your HTML as a backup.', true);
    return false;
  }
}

function removeDraft(uid) {
  try {
    localStorage.removeItem(draftKey(uid));
    return true;
  } catch (error) {
    console.error('Could not remove the browser draft.', error);
    message('Saved online, but the browser draft could not be removed from this device.', true);
    return false;
  }
}

function getDrafts(uid) {
  const found = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(draftPrefix(uid))) continue;
      const draft = JSON.parse(localStorage.getItem(key));
      if (draft && Number.isInteger(draft.revision) && draft.fields && typeof draft.fields === 'object') {
        found.push({ key, ...draft });
      }
    }
  } catch (error) {
    console.error('Could not read browser drafts.', error);
    message('Could not read browser drafts. Your cloud work may still be available.', true);
  }
  return found;
}

function showRecovery(uid) {
  if (!isLesson) return;
  const candidates = getDrafts(uid).filter(item => item.key !== draftKey(uid));
  const panel = document.getElementById('draft-recovery');
  const list = document.getElementById('draft-list');
  list.replaceChildren();
  candidates.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = item.key;
    option.textContent = `Draft ${index + 1} - ${item.savedAt || 'date unknown'}`;
    list.appendChild(option);
  });
  panel.hidden = candidates.length === 0;
}

function showConflict(localFields, remoteRevision, remoteFields) {
  conflict = { localFields, remoteRevision, remoteFields };
  document.getElementById('conflict-local').value = JSON.stringify(localFields, null, 2);
  document.getElementById('conflict-remote').value = JSON.stringify(remoteFields, null, 2);
  conflictPanel.hidden = false;
  retryButton.hidden = true;
  message('Changes conflict with a saved version. Compare both versions and choose which to keep.', true);
  conflictPanel.scrollIntoView({ block: 'center' });
}

async function loadWork(currentUser, token) {
  const snapshot = await getDocFromServer(workRef(currentUser.uid));
  if (token !== generation) return;
  const remote = snapshot.exists() ? snapshot.data() : { revision: 0, fields: {} };
  revision = remote.revision;
  cloudFields = remote.fields;
  window.webLesson.apply(remote.fields);
  message('Work loaded from your school account.');
  showRecovery(currentUser.uid);
}

async function saveWork() {
  if (!user || !isLesson || !dirty || saving || conflict) return;
  clearTimeout(timer);
  const currentUser = user;
  const token = generation;
  const fields = window.webLesson.read();
  const base = revision;
  const version = editVersion;
  saving = true;
  retryButton.hidden = true;
  message('Saving to your school account...');
  try {
    const result = await runTransaction(db, async transaction => {
      const current = await transaction.get(workRef(currentUser.uid));
      const remote = current.exists() ? current.data() : { revision: 0, fields: {} };
      if (remote.revision !== base) return { conflict: true, remote };
      transaction.set(workRef(currentUser.uid), { revision: base + 1, fields, updatedAt: serverTimestamp() });
      transaction.set(progressRef(currentUser.uid), { completed: fields['lesson-complete'] === 'true', updatedAt: serverTimestamp() });
      return { conflict: false };
    });
    if (token !== generation) return;
    if (result.conflict) {
      showConflict(window.webLesson.read(), result.remote.revision, result.remote.fields);
      storeDraft();
      return;
    }
    revision = base + 1;
    cloudFields = fields;
    if (version === editVersion) {
      dirty = false;
      if (removeDraft(currentUser.uid)) message('Saved to your school account.');
    } else {
      storeDraft();
      scheduleSave(0);
    }
  } catch (error) {
    if (token !== generation) return;
    console.error('Could not sync web lesson work.', error);
    const retained = storeDraft();
    message(retained
      ? 'Not synced. A draft is stored in this browser; retry when online. Do not clear browser data.'
      : 'Not synced and browser draft storage failed. Keep this page open and download your HTML.', true);
    retryButton.hidden = false;
  } finally {
    saving = false;
    if (token !== generation && user && dirty && !conflict) scheduleSave(0);
  }
}

function scheduleSave(delay = 900) {
  clearTimeout(timer);
  timer = setTimeout(saveWork, delay);
}

if (isLesson) {
  window.addEventListener('web-work-change', () => {
    if (!user) return;
    dirty = true;
    editVersion += 1;
    if (conflict) conflict.localFields = window.webLesson.read();
    if (storeDraft()) message(conflict ? 'Changes kept in your browser. Resolve the conflict before syncing.' : 'Changes pending save...');
    if (conflict) document.getElementById('conflict-local').value = JSON.stringify(conflict.localFields, null, 2);
    else scheduleSave();
  });
  window.addEventListener('beforeunload', event => {
    if (dirty || saving || conflict) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  document.getElementById('use-local').addEventListener('click', () => {
    if (!conflict || !window.confirm('Replace the saved account version with your version?')) return;
    revision = conflict.remoteRevision;
    conflict = null;
    conflictPanel.hidden = true;
    storeDraft();
    scheduleSave(0);
  });
  document.getElementById('use-remote').addEventListener('click', async () => {
    if (!conflict || !window.confirm('Discard this browser version and use the account version?')) return;
    const token = generation;
    const shown = conflict;
    const version = editVersion;
    try {
      const snapshot = await getDocFromServer(workRef(user.uid));
      if (token !== generation || conflict !== shown) return;
      const latest = snapshot.exists() ? snapshot.data() : { revision: 0, fields: {} };
      if (latest.revision !== shown.remoteRevision || version !== editVersion) {
        showConflict(window.webLesson.read(), latest.revision, latest.fields);
        return;
      }
      window.webLesson.apply(latest.fields);
      revision = latest.revision;
      cloudFields = latest.fields;
      conflict = null;
      dirty = false;
      conflictPanel.hidden = true;
      if (removeDraft(user.uid)) message('Using the version saved to your account.');
    } catch (error) {
      console.error('Could not verify the saved version.', error);
      message('Could not verify the saved version. Reconnect and try again; your draft is still retained.', true);
    }
  });
  document.getElementById('recover-draft').addEventListener('click', () => {
    if (dirty || saving || conflict) {
      message('Resolve or save your current work before reviewing another draft.', true);
      return;
    }
    const selected = document.getElementById('draft-list').value;
    const draft = getDrafts(user.uid).find(item => item.key === selected);
    if (!draft) {
      message('That draft is no longer available. Reload to refresh the list.', true);
      return;
    }
    window.webLesson.apply(draft.fields);
    dirty = true;
    editVersion += 1;
    const retained = storeDraft();
    showConflict(draft.fields, revision, cloudFields);
    if (!retained) message('Your draft is open but could not be saved in this browser. Keep this page open until you resolve the conflict.', true);
  });
  document.getElementById('delete-draft').addEventListener('click', () => {
    const key = document.getElementById('draft-list').value;
    if (!key || !window.confirm('Delete this browser draft? This cannot be undone. Make sure another tab is not using it.')) return;
    try {
      localStorage.removeItem(key);
      showRecovery(user.uid);
    } catch (error) {
      console.error('Could not delete the browser draft.', error);
      message('Could not delete the browser draft.', true);
    }
  });
}

signInButton.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error('Sign-in failed.', error);
    message(`Sign-in failed: ${error.message}`, true);
  }
});
signOutButton.addEventListener('click', async () => {
  if (dirty || saving || conflict) {
    message('Save your work or resolve the conflict before signing out.', true);
    return;
  }
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out failed.', error);
    message(`Sign-out failed: ${error.message}`, true);
  }
});
retryButton.addEventListener('click', () => {
  if (dirty) saveWork();
  else if (auth.currentUser) initialise(auth.currentUser);
});

async function initialise(currentUser) {
  const token = ++generation;
  user = null;
  dirty = false;
  conflict = null;
  cloudFields = {};
  clearTimeout(timer);
  document.body.classList.add('auth-pending');
  if (isLesson) {
    conflictPanel.hidden = true;
    document.getElementById('draft-recovery').hidden = true;
  }
  if (!isLesson) document.querySelectorAll('[data-lesson-card] .pill').forEach(pill => {
    pill.textContent = 'Ready to explore';
  });
  if (!isLesson) window.webRewards.render('loading');
  retryButton.hidden = true;
  signInButton.hidden = true;
  signOutButton.hidden = !currentUser;
  if (!currentUser) {
    if (isLesson) window.webLesson.apply(window.webLesson.empty());
    else window.webRewards.render('signed-out');
    message('Sign in with your school Google account to continue.');
    signInButton.hidden = false;
    return;
  }
  if (!currentUser.emailVerified || !(currentUser.email || '').toLowerCase().endsWith('@derbygrammar.org')) {
    if (!isLesson) window.webRewards.render('signed-out');
    message('Use a verified school Google account.', true);
    try { await signOut(auth); } catch (error) { console.error('Could not sign out rejected account.', error); }
    return;
  }
  message('Loading your school account...');
  try {
    await setDoc(doc(db, 'users', currentUser.uid), { email: currentUser.email, lastLogin: serverTimestamp() }, { merge: true });
    if (token !== generation) return;
    user = currentUser;
    if (isLesson) {
      await loadWork(currentUser, token);
    } else {
      const progress = await Promise.all(Array.from({ length: 6 }, (_, index) =>
        getDocFromServer(doc(db, 'users', currentUser.uid, 'webProgress', `lesson${index + 1}`))));
      if (token !== generation) return;
      progress.forEach((snapshot, index) => {
        const card = document.querySelector(`[data-lesson-card="${index + 1}"] .pill`);
        if (card && snapshot.exists() && snapshot.data().completed) card.textContent = 'Completed';
      });
      window.webRewards.render('ready', progress.map(snapshot =>
        snapshot.exists() && snapshot.data().completed === true
      ));
      message(`Signed in as ${currentUser.email}`);
    }
    if (token === generation) document.body.classList.remove('auth-pending');
  } catch (error) {
    if (token !== generation) return;
    console.error('Could not load web course.', error);
    user = null;
    if (!isLesson) window.webRewards.render('unavailable', [], 'Rewards are unavailable. Retry to load completion.');
    message(`Could not load your work: ${error.message}. Check your connection and retry.`, true);
    retryButton.hidden = false;
  }
}

onAuthStateChanged(auth, initialise);
