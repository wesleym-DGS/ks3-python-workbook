const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const {
    doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch,
    runTransaction, serverTimestamp, Timestamp
} = require('firebase/firestore');

async function main() {
    const projectId = 'demo-ks3-integration';
    if (process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:18080') {
        throw new Error('Refusing to run without the expected isolated Firestore emulator.');
    }
    const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
    const env = await initializeTestEnvironment({ projectId, firestore: { rules } });
    const timestamp = Timestamp.now();
    let checks = 0;
    const allowed = async (label, operation) => {
        await assertSucceeds(operation);
        checks++;
        console.log(`PASS allow ${label}`);
    };
    const denied = async (label, operation) => {
        await assertFails(operation);
        checks++;
        console.log(`PASS deny ${label}`);
    };

    try {
        await env.clearFirestore();
        await env.withSecurityRulesDisabled(async context => {
            const db = context.firestore();
            await setDoc(doc(db, 'staff/teacher@derbygrammar.org'), {
                email: 'teacher@derbygrammar.org', role: 'teacher', updatedAt: timestamp,
                updatedBy: 'admin@derbygrammar.org'
            });
            await setDoc(doc(db, 'staff/admin@derbygrammar.org'), {
                email: 'admin@derbygrammar.org', role: 'admin', updatedAt: timestamp,
                updatedBy: 'admin@derbygrammar.org'
            });
            for (const uid of ['alice', 'bob', 'charlie']) {
                await setDoc(doc(db, `users/${uid}`), { email: `${uid}@derbygrammar.org` });
            }
            await setDoc(doc(db, 'users/alice/progress/lesson1'), {
                completedTasks: Array(10).fill(false), updatedAt: timestamp
            });
        });
        const identity = (uid, email, verified = true) =>
            env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
        const alice = identity('alice', 'alice@derbygrammar.org');
        const bob = identity('bob', 'bob@derbygrammar.org');
        const teacher = identity('teacher', 'teacher@derbygrammar.org');
        const staffAdmin = identity('admin', 'admin@derbygrammar.org');
        const admin = identity('admin', 'wesley.m@derbygrammar.org');
        const outsider = identity('outsider', 'outsider@example.org');
        const unverified = identity('unverified', 'unverified@derbygrammar.org', false);
        const guest = env.unauthenticatedContext().firestore();
        const workRef = (db, lesson = 'lesson1') => doc(db, `users/alice/webWork/${lesson}`);
        const progressRef = (db, lesson = 'lesson1') => doc(db, `users/alice/webProgress/${lesson}`);
        const work = (revision, completed = false) => ({
            revision,
            fields: { 'html-editor': '<h1>Synthetic</h1>', 'brick-ideas': 'test', 'lesson-complete': String(completed) },
            updatedAt: timestamp
        });
        const completion = completed => ({ completed, updatedAt: timestamp });
        const save = (db, revision, completed = false) => {
            const batch = writeBatch(db);
            batch.set(workRef(db), work(revision, completed));
            batch.set(progressRef(db), completion(completed));
            return batch.commit();
        };
        const saveLaterLesson = (db, lesson, revision, completed = false, fields = {}) => {
            const batch = writeBatch(db);
            batch.set(workRef(db, lesson), {
                revision,
                fields: { 'question-1': 'synthetic answer', 'html-editor': '<h1>Practice</h1>', ...fields, 'lesson-complete': String(completed) },
                updatedAt: timestamp
            });
            batch.set(progressRef(db, lesson), completion(completed));
            return batch.commit();
        };
        const classRef = (db, id) => doc(db, `classes/${id}`);
        const classData = (name, memberIds, updatedBy) => ({
            name, memberIds, updatedAt: serverTimestamp(), updatedBy
        });
        const addMemberTransaction = (db, id, uid, email) => runTransaction(db, async transaction => {
            const ref = classRef(db, id);
            const snapshot = await transaction.get(ref);
            transaction.update(ref, {
                memberIds: [...snapshot.data().memberIds, uid],
                updatedAt: serverTimestamp(),
                updatedBy: email
            });
        });

        await allowed('own profile', setDoc(doc(alice, 'users/alice'), { email: 'alice@derbygrammar.org', lastLogin: timestamp }));
        await denied('other profile write', setDoc(doc(bob, 'users/alice'), { email: 'bob@derbygrammar.org', lastLogin: timestamp }));
        await denied('unverified profile', setDoc(doc(unverified, 'users/unverified'), { email: 'unverified@derbygrammar.org', lastLogin: timestamp }));
        await denied('outside-domain profile', setDoc(doc(outsider, 'users/outsider'), { email: 'outsider@example.org', lastLogin: timestamp }));
        await denied('anonymous profile read', getDoc(doc(guest, 'users/alice')));
        await allowed('initial atomic web save', save(alice, 1));
        await allowed('owner reads private work', getDoc(workRef(alice)));
        await allowed('owner reads web progress', getDoc(progressRef(alice)));
        await denied('other pupil reads work', getDoc(workRef(bob)));
        await denied('other pupil reads progress', getDoc(progressRef(bob)));
        await denied('other pupil overwrites work', setDoc(workRef(bob), work(2)));
        await denied('teacher reads private work', getDoc(workRef(teacher)));
        await denied('admin reads private work', getDoc(workRef(admin)));
        await allowed('teacher reads web progress', getDoc(progressRef(teacher)));
        await allowed('teacher reads profiles', getDocs(collection(teacher, 'users')));
        await denied('pupil lists profiles', getDocs(collection(alice, 'users')));
        await denied('owner deletes work', deleteDoc(workRef(alice)));
        await denied('stale revision', save(alice, 1));
        await denied('mismatched completion', setDoc(progressRef(alice), completion(true)));
        await denied('unknown field', setDoc(workRef(alice), { ...work(2), fields: { extra: 'invalid' } }));
        await denied('invalid field type', setDoc(workRef(alice), { ...work(2), fields: { 'html-editor': 42 } }));
        await allowed('atomic completion update', save(alice, 2, true));
        assert.equal((await getDoc(progressRef(alice))).data().completed, true);
        await allowed('atomic reset', save(alice, 3));
        assert.equal((await getDoc(workRef(alice))).data().revision, 3);
        for (let lesson = 1; lesson <= 6; lesson++) {
            const ref = doc(alice, `users/alice/progress/lesson${lesson}`);
            await allowed(`Python lesson ${lesson} save`, setDoc(ref, {
                completedTasks: Array(lesson === 1 ? 10 : 8).fill(false), updatedAt: timestamp
            }));
            await allowed(`teacher reads Python lesson ${lesson}`, getDoc(doc(teacher, `users/alice/progress/lesson${lesson}`)));
        }
        await denied('invalid Python task count', setDoc(doc(alice, 'users/alice/progress/lesson6'), { completedTasks: [true], updatedAt: timestamp }));
        await denied('other pupil reads Python progress', getDoc(doc(bob, 'users/alice/progress/lesson6')));
        await denied('teacher modifies pupil progress', setDoc(doc(teacher, 'users/alice/progress/lesson6'), { completedTasks: Array(8).fill(true), updatedAt: timestamp }));
        for (let lesson = 2; lesson <= 6; lesson++) {
            const lessonId = `lesson${lesson}`;
            await allowed(`own web ${lessonId} save`, saveLaterLesson(alice, lessonId, 1));
            await allowed(`own web ${lessonId} completion`, saveLaterLesson(alice, lessonId, 2, true));
            await denied(`other pupil reads web ${lessonId}`, getDoc(workRef(bob, lessonId)));
            await denied(`teacher reads web ${lessonId} answers`, getDoc(workRef(teacher, lessonId)));
            await allowed(`teacher reads web ${lessonId} completion`, getDoc(progressRef(teacher, lessonId)));
            await denied(`invalid web ${lessonId} field`, saveLaterLesson(alice, lessonId, 3, false, { secret: 'invalid' }));
        }
        await allowed('multi-page website fields', saveLaterLesson(alice, 'lesson6', 3, true, {
            'page-about': '<h1>About</h1>',
            'page-gallery': '<h1>Gallery</h1>',
            'css-editor': 'nav a { color: blue; }'
        }));
        await denied('unknown web lesson read', getDoc(workRef(alice, 'lesson7')));
        await denied('teacher creates staff', setDoc(doc(teacher, 'staff/other@derbygrammar.org'), {
            email: 'other@derbygrammar.org', role: 'teacher', updatedAt: timestamp, updatedBy: 'teacher@derbygrammar.org'
        }));
        const staffRef = doc(admin, 'staff/other@derbygrammar.org');
        await allowed('bootstrap admin creates staff', setDoc(staffRef, {
            email: 'other@derbygrammar.org', role: 'teacher', updatedAt: timestamp, updatedBy: 'wesley.m@derbygrammar.org'
        }));
        await denied('invalid staff role', setDoc(staffRef, {
            email: 'other@derbygrammar.org', role: 'student', updatedAt: timestamp, updatedBy: 'wesley.m@derbygrammar.org'
        }));
        await allowed('bootstrap admin removes staff', deleteDoc(staffRef));

        const class7a = classRef(teacher, '7a');
        await allowed('teacher reads classes', getDocs(collection(teacher, 'classes')));
        await allowed('staff admin reads classes', getDocs(collection(staffAdmin, 'classes')));
        await allowed('bootstrap admin reads classes', getDocs(collection(admin, 'classes')));
        await denied('pupil lists classes', getDocs(collection(alice, 'classes')));
        await denied('anonymous lists classes', getDocs(collection(guest, 'classes')));
        await allowed('teacher creates empty class', setDoc(class7a, classData('7A', [], 'teacher@derbygrammar.org')));
        await allowed('staff admin reads class', getDoc(classRef(staffAdmin, '7a')));
        await denied('pupil reads class', getDoc(classRef(alice, '7a')));
        await denied('non-staff reads class', getDoc(classRef(outsider, '7a')));
        await denied('unverified staff-like user reads class', getDoc(classRef(unverified, '7a')));
        await denied('pupil creates class', setDoc(classRef(alice, 'pupil-created'), classData('7P', [], 'alice@derbygrammar.org')));
        await denied('staff creates initially populated class', setDoc(classRef(teacher, 'populated'), classData('7P', ['alice'], 'teacher@derbygrammar.org')));
        await denied('staff creates class with empty name', setDoc(classRef(teacher, 'empty-name'), classData('', [], 'teacher@derbygrammar.org')));
        await denied('staff creates class with long name', setDoc(classRef(teacher, 'long-name'), classData('x'.repeat(101), [], 'teacher@derbygrammar.org')));
        await denied('staff creates class with invalid members type', setDoc(classRef(teacher, 'bad-members'), classData('7P', 'alice', 'teacher@derbygrammar.org')));
        await denied('staff creates class with duplicate fields', setDoc(classRef(teacher, 'duplicate-members'), classData('7P', ['alice', 'alice'], 'teacher@derbygrammar.org')));
        await denied('staff creates class with unknown field', setDoc(classRef(teacher, 'unknown-field'), {
            ...classData('7P', [], 'teacher@derbygrammar.org'), extra: true
        }));
        await denied('staff creates class with missing field', setDoc(classRef(teacher, 'missing-field'), {
            name: '7P', memberIds: [], updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('staff spoofs class audit identity', setDoc(classRef(teacher, 'spoofed-audit'), classData('7P', [], 'admin@derbygrammar.org')));
        await denied('staff uses client timestamp', setDoc(classRef(teacher, 'client-time'), {
            name: '7P', memberIds: [], updatedAt: timestamp, updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('pupil updates class', updateDoc(classRef(alice, '7a'), classData('7A', [], 'alice@derbygrammar.org')));

        await allowed('teacher adds registered pupil', updateDoc(class7a, {
            memberIds: ['alice'], updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('teacher adds unregistered account', updateDoc(class7a, {
            memberIds: ['alice', 'missing-user'], updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('teacher adds multiple pupils in one update', updateDoc(class7a, {
            memberIds: ['alice', 'bob', 'charlie'], updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('teacher removes multiple pupils in one update', updateDoc(class7a, {
            memberIds: [], updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('teacher combines rename and membership change', updateDoc(class7a, {
            name: '7A renamed', memberIds: ['alice', 'bob'], updatedAt: serverTimestamp(),
            updatedBy: 'teacher@derbygrammar.org'
        }));
        await allowed('staff renames class separately', updateDoc(class7a, {
            name: '7A renamed', updatedAt: serverTimestamp(), updatedBy: 'admin@derbygrammar.org'
        }));
        await allowed('staff admin adds one registered pupil', updateDoc(classRef(staffAdmin, '7a'), {
            memberIds: ['alice', 'bob'], updatedAt: serverTimestamp(), updatedBy: 'admin@derbygrammar.org'
        }));
        await allowed('bootstrap admin removes one pupil', updateDoc(classRef(admin, '7a'), {
            memberIds: ['bob'], updatedAt: serverTimestamp(), updatedBy: 'wesley.m@derbygrammar.org'
        }));
        await allowed('staff creates second class', setDoc(classRef(teacher, '7b'), classData('7B', [], 'teacher@derbygrammar.org')));
        await allowed('same pupil can join multiple classes', updateDoc(classRef(teacher, '7b'), {
            memberIds: ['alice'], updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await allowed('concurrent transactional membership additions', Promise.all([
            addMemberTransaction(teacher, '7b', 'bob', 'teacher@derbygrammar.org'),
            addMemberTransaction(teacher, '7b', 'charlie', 'teacher@derbygrammar.org')
        ]));
        const concurrentMembers = (await getDoc(classRef(teacher, '7b'))).data().memberIds;
        assert.deepEqual(new Set(concurrentMembers), new Set(['alice', 'bob', 'charlie']));
        checks++;
        console.log('PASS both concurrent transactional additions persist');
        await env.withSecurityRulesDisabled(async context => {
            const db = context.firestore();
            const manyMembers = Array.from({ length: 200 }, (_, index) => `pupil-${index}`);
            await setDoc(doc(db, 'classes/at-capacity'), {
                name: 'Capacity', memberIds: manyMembers, updatedAt: timestamp, updatedBy: 'seed@derbygrammar.org'
            });
            await setDoc(doc(db, 'classes/over-capacity'), {
                name: 'Over capacity', memberIds: [...manyMembers, 'pupil-200'],
                updatedAt: timestamp, updatedBy: 'seed@derbygrammar.org'
            });
        });
        await allowed('class at membership limit remains valid', updateDoc(classRef(teacher, 'at-capacity'), {
            name: 'At capacity renamed', updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('class above membership limit is invalid', updateDoc(classRef(teacher, 'over-capacity'), {
            name: 'Over capacity renamed', updatedAt: serverTimestamp(), updatedBy: 'teacher@derbygrammar.org'
        }));
        await denied('pupil deletes class', deleteDoc(classRef(alice, '7a')));
        await allowed('teacher deletes class', deleteDoc(classRef(teacher, '7a')));
        await allowed('bootstrap admin deletes class', deleteDoc(classRef(admin, '7b')));
        await denied('non-staff deletes class', deleteDoc(classRef(outsider, 'at-capacity')));
        await env.withSecurityRulesDisabled(async context => {
            assert.equal((await getDoc(doc(context.firestore(), 'users/alice/progress/lesson1'))).exists(), true);
        });
        checks++;
        console.log('PASS deleting classes does not delete pupil progress');
        console.log(`Completed ${checks} authorization checks.`);
    } finally {
        await env.cleanup();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
