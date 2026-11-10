const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'workbook-course.js'), 'utf8');

function render(course, lesson, saved = {}) {
    const app = {
        html: '',
        set innerHTML(value) { this.html = value; },
        get innerHTML() { return this.html; },
        querySelector() { return null; },
        querySelectorAll() { return []; }
    };
    const elements = new Map();
    const getElement = id => {
        if (id === 'course-app') return app;
        if (!elements.has(id)) elements.set(id, {
            value: '',
            textContent: '',
            disabled: false,
            classList: { toggle() {}, add() {}, remove() {} },
            querySelectorAll() { return []; },
            addEventListener() {}
        });
        return elements.get(id);
    };
    const editorRoot = { addEventListener() {} };
    const mockEditor = {
        root: editorRoot,
        setValue() {},
        format() {},
        clear() {},
        focus() {},
        run: async () => ({ output: '', hasError: false })
    };
    const window = {
        addEventListener() {},
        dispatchEvent() {},
        PythonIDE: { mount: () => mockEditor },
        pythonRuntime: {
            createTerminalInputHandler: () => () => {},
            runTests: async () => [],
            stop() {}
        }
    };
    const context = {
        console,
        document: { body: { dataset: { course, lesson: String(lesson) } }, getElementById: getElement },
        localStorage: { getItem: key => saved[key] || null, setItem() {} },
        window,
        Event
    };
    const content = fs.readFileSync(path.join(root, course, 'content.js'), 'utf8');
    vm.runInNewContext(content, context, { filename: `${course}/content.js` });
    vm.runInNewContext(renderer, context, { filename: 'workbook-course.js' });
    return app.innerHTML;
}

for (const [course, strand, taskCount, xpPerLesson, totalXp, version] of [
    ['python-sequences', 'computer-science', 8, 1450, '8,700', 2],
    ['data-science', 'ict', 4, 375, '2,250', 1],
    ['digital-guidebook', 'digital-literacy', 4, 375, '2,250', 1]
]) {
    const dashboard = render(course, 0);
    assert.match(dashboard, /Six lessons/);
    assert.match(dashboard, new RegExp(`· YEAR ${course === 'digital-guidebook' ? 7 : 9}`));
    assert.match(dashboard, new RegExp(`0 \\/ ${totalXp.replace(/,/g, ',')}`));
    assert.equal((dashboard.match(/class="course-lesson-card"/g) || []).length, 6);
    assert.equal((dashboard.match(/class="course-achievement /g) || []).length, 6);
    assert.match(fs.readFileSync(path.join(root, course, 'index.html'), 'utf8'), new RegExp(`data-strand="${strand}"`));

    const completedState = JSON.stringify({ completedTasks: Array(taskCount).fill(true), xp: xpPerLesson });
    const prefix = {
        'python-sequences': 'ks3_python_sequences',
        'data-science': 'ks3_data_science',
        'digital-guidebook': 'ks3_digital_guidebook'
    }[course];
    const completedDashboard = render(course, 0, Object.fromEntries(
        Array.from({ length: 6 }, (_, index) => [`${prefix}_lesson${index + 1}_v${version}_state`, completedState])
    ));
    assert.match(completedDashboard, new RegExp(`${totalXp} \\/ ${totalXp}`));
    assert.match(completedDashboard, /100%/);
    assert.match(completedDashboard, /6 \/ 6/);
    assert.equal((completedDashboard.match(/<small>EARNED<\/small>/g) || []).length, 6);

    for (let lesson = 1; lesson <= 6; lesson++) {
        const page = render(course, lesson);
        assert.match(page, /Check your understanding/);
        assert.equal((page.match(/Check answer/g) || []).length, 3, `${course} lesson ${lesson}: three checks`);
        if (course === 'python-sequences') {
            assert.match(page, /CodeMirror 6/);
            assert.equal((page.match(/data-check-challenge=/g) || []).length, 8, `${course} lesson ${lesson}: eight coding challenges`);
            assert.match(page, /class="python-practice-layout"/);
            assert.ok(page.indexOf('id="python-challenge-groups"') < page.indexOf('class="python-workspace"'), `${course} lesson ${lesson}: challenges before editor`);
            assert.equal((page.match(/>Load prompt<\/button>/g) || []).length, 8, `${course} lesson ${lesson}: load-prompt controls`);
            assert.equal((page.match(/>Check task<\/button>/g) || []).length, 8, `${course} lesson ${lesson}: check-task controls`);
        } else {
            assert.match(page, /Save and complete activity/, `${course} lesson ${lesson}: practical task`);
        }
    }
}

for (const [course, strand] of [
    ['python-course', 'computer-science'],
    ['python-sequences', 'computer-science'],
    ['data-science', 'ict'],
    ['digital-guidebook', 'digital-literacy'],
    ['web-course', 'ict']
]) {
    const index = fs.readFileSync(path.join(root, course, 'index.html'), 'utf8');
    assert.match(index, /course-index\.css/, `${course} index uses the shared course style`);
    assert.match(index, new RegExp(`data-strand="${strand}"`), `${course} index keeps its strand`);
    if (course !== 'python-course') {
        assert.match(index, /class="[^"]*course-index-page/, `${course} index opts into shared styling`);
    } else {
        assert.match(index, /class="dashboard-page course-index-page"/);
    }
    if (course === 'python-sequences' || course === 'data-science' || course === 'digital-guidebook') {
        const lesson = fs.readFileSync(path.join(root, course, 'lesson-1.html'), 'utf8');
        assert.doesNotMatch(lesson, /course-index\.css/, `${course} lesson keeps its own layout`);
    }
}

const pythonContent = fs.readFileSync(path.join(root, 'python-sequences', 'content.js'), 'utf8');
const dataContent = fs.readFileSync(path.join(root, 'data-science', 'content.js'), 'utf8');
const digitalGuidebookContent = fs.readFileSync(path.join(root, 'digital-guidebook', 'content.js'), 'utf8');
const firebaseSync = fs.readFileSync(path.join(root, 'firebase-sync.js'), 'utf8');
assert.match(pythonContent, /stateVersion: 2/);
assert.match(pythonContent, /Never enter a real password|never enter a real password/i);
assert.match(dataContent, /correlation.*causation/i);
assert.match(dataContent, /PPDAC/i);
assert.match(dataContent, /personal information/i);
assert.doesNotMatch(dataContent, /summative assessment/i);
assert.match(digitalGuidebookContent, /stateVersion: 1/);
assert.match(digitalGuidebookContent, /yearGroup: 7/);
assert.match(digitalGuidebookContent, /sourceAttribution:.*Oak National Academy/);
assert.match(render('digital-guidebook', 0), /© Oak National Academy 2026/);
assert.doesNotMatch(render('digital-guidebook', 0), /Teach Computing/);
assert.match(render('digital-guidebook', 1), /© Oak National Academy 2026/);
assert.doesNotMatch(render('digital-guidebook', 1), /Teach Computing/);
assert.match(digitalGuidebookContent, /Creative Commons licence/i);
assert.match(digitalGuidebookContent, /alternative text/i);
const workbookCourseStyles = fs.readFileSync(path.join(root, 'workbook-course.css'), 'utf8');
const courseIndexStyles = fs.readFileSync(path.join(root, 'course-index.css'), 'utf8');
assert.match(workbookCourseStyles, /\.course-misconception[\s\S]*?color:\s*#854d0e/);
assert.match(workbookCourseStyles, /html\[data-theme="dark"\]\s+\.course-misconception[\s\S]*?color:\s*#fde68a/);
assert.match(workbookCourseStyles, /\.course-worked-example pre[\s\S]*?overflow:\s*visible;[\s\S]*?white-space:\s*pre-wrap/);
assert.match(courseIndexStyles, /\.course-section-heading\s*>\s*a\.course-button\s*\{\s*color:\s*#fff;/);
for (let lesson = 1; lesson <= 6; lesson++) {
    assert.match(firebaseSync, new RegExp(`digitalGuidebook${lesson}: \\{\\s*storageKey: 'ks3_digital_guidebook_lesson${lesson}_v1_state',\\s*taskXp: \\[50, 75, 100, 150\\]`), `digital-guidebook lesson ${lesson}: progress sync is registered`);
}
assert.match(render('data-science', 2), /course-scatter-chart/);
assert.match(render('data-science', 3), /350-foot height constraint/);
assert.match(render('data-science', 4), /not handle litter/i);
assert.match(render('data-science', 5), /Clean it up/);
assert.match(render('data-science', 6), /recommendation/);

console.log('PASS all six-lesson courses render learning checks, progress, activities and the Python challenge path');
