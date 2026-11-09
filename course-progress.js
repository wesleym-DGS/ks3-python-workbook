import './firebase-sync.js?v=20261109-2';
import { getApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
import { doc, getDocFromServer, getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';

const app = getApp();
const output = document.getElementById('web-course-progress');
let requestId = 0;
onAuthStateChanged(getAuth(app), async user => {
    const request = ++requestId;
    output.textContent = 'Sign in to see web lesson progress.';
    if (!user || !user.emailVerified || !(user.email || '').toLowerCase().endsWith('@derbygrammar.org')) return;
    output.textContent = 'Loading web lesson progress...';
    try {
        const progress = await getDocFromServer(doc(getFirestore(app), 'users', user.uid, 'webProgress', 'lesson1'));
        if (request !== requestId) return;
        output.textContent = progress.exists() && progress.data().completed === true
            ? 'Lesson 1 marked complete'
            : 'Lesson 1 not yet marked complete';
    } catch (error) {
        if (request !== requestId) return;
        console.error('Could not load web course progress.', error);
        output.textContent = 'Web progress could not be loaded. Check your connection.';
    }
});
