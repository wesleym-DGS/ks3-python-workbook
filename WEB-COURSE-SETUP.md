# Web course integration

The root `index.html` is the course chooser. Python lessons and their
dashboard live in `python-course/`; web lessons live in `web-course/`.
Shared sign-in, styling and teacher pages remain at the root. Add future
courses in their own folders and link them from the chooser.

The Python lessons have moved from the root to `python-course/`, so old direct
lesson links need updating; no redirects are provided. The existing Python
storage keys, task progress, XP and Firestore paths are unchanged. Browser
storage is tied to the site's origin, not its URL path. Progress from a
different origin (including some local-file previews) may not be available
automatically; do not clear it or migrate pupil data without approval.

The web course has separate Firestore records:

- `users/{uid}/webWork/lesson1` contains the pupil's lesson answers and HTML.
  The proposed rules allow only that pupil to read or change the record.
- `users/{uid}/webProgress/lesson1` contains a completion flag. The proposed
  rules allow the pupil and authorised staff to read it. This is self-reported
  completion, not a teacher assessment.

The live Firebase rules are not changed by editing this repository. Before
publishing, verify the rule changes in an isolated Firebase project or emulator
using separate pupil and staff accounts. Check that pupils cannot read other
pupils' work, staff cannot read pupils' web answers, and pupils cannot modify
other accounts. Test the Python course, web save and restore, simultaneous
edits, resets and account switching before deploying.

Make sure the hosted site's domain is authorised for Firebase Authentication.
Deploy compatible Firestore rules before publishing the web course; otherwise
the new course cannot save. The local rules also allow Python Lesson 6 progress,
which the local Python sync already attempts to access. Confirm the full local
repository changes and existing deployment workflow before publishing either
the rules or website. Do not deploy the example without school approval for
the collection, retention and handling of pupil work.

## Teacher classes

The teacher dashboard lists shared classes and pupils who are not in any
class. Only pupils who have signed in to the workbook appear. All authorised
teachers and admins can create and rename classes, add or remove pupils, and
delete classes. Pupils may belong to more than one class. To add a pupil who
is already in another class, use the search on the destination class page.
Removing a membership or deleting a class does not delete a pupil account,
progress or work. Staff access is managed separately by the bootstrap admin.

Each class page shows progress for the selected course. Python displays the
six lessons and 50 tasks; web Lesson 1 completion is self-reported. Staff
cannot read pupils' web answers or code under the proposed rules.

Classes are stored separately from pupil work as `classes/{classId}` records
containing the name, member UIDs and update metadata. A class can contain up
to 200 pupils. Class membership and pupil account emails are school data:
consider school retention and shared-device policies before rollout.
Class rules must be verified in an emulator or separate staging project and
approved before deployment; editing this checkout does not change live rules.

The GitHub repository currently has a GitHub Pages deployment workflow.
Confirm its publishing source and the actual production Firebase rules before
releasing; the local checkout contains a Python Lesson 6 that was not present
on the inspected GitHub `main` branch.

The old standalone web workbook uses storage associated with its local file
origin. That data will not automatically appear on the hosted site. Pupils
should download their HTML from the standalone editor before moving; written
answers need to be copied separately. Do not import data automatically on a
shared device because it may belong to another pupil.

Google sign-in and cloud sync need an internet connection. Browser storage may
retain a pending draft if a save fails, but clearing browser data or switching
devices can remove access to that draft. Drafts are scoped to the pupil in
the app, but other users of a shared computer may be able to inspect browser
storage. The lesson offers explicit draft recovery and deletion. Keep a
downloaded copy of important HTML. Check Firebase usage and school
data-retention requirements before rolling out to a class.

Python progress is also retained in an account-scoped browser backup on
sign-out or account switching, so unsynced tasks can be restored when the same
account signs in again on that browser. It is not a cloud backup and can be
lost if browser storage is cleared or the device is unavailable. The backup
can be inspected by someone with access to the browser. If the browser cannot
store it, sign back in with the same account and retry sync before clearing
storage or switching accounts.

Older Python progress that is not associated with an account is left unchanged
and is not automatically uploaded to the first account that signs in. Sync is
blocked on that browser until the unassigned progress can be dealt with safely.
Do not clear browser storage to bypass the warning: ask the teacher or
administrator how the existing progress should be preserved and handled.

## Local Firestore rule checks

The rules test uses only synthetic data and a local emulator with a demo project
ID. It never deploys the rules. With Node.js, npm and Java installed, run:

```powershell
Set-Location tests
npm ci
npm run test:links
npm run test:sync
npm run test:dashboard
npm run test:rules
```

Port 18080 must be available. The first run downloads the Firestore emulator.
The Python sync and dashboard regression tests use mocked Firebase responses;
the rules test uses the emulator. These checks do not verify real Google sign-in, actual
cross-device sync or the rules currently deployed to the live project. The
ordinary website still uses the live Firebase configuration; do not assume
opening it on localhost connects it to the emulators.
