const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = [
    'index.html', 'teachers.html', 'class.html', 'staff.html',
    'python-course/index.html',
    ...Array.from({ length: 6 }, (_, index) => `python-course/Lesson${index + 1}.html`),
    'python-sequences/index.html',
    ...Array.from({ length: 6 }, (_, index) => `python-sequences/lesson-${index + 1}.html`),
    'data-science/index.html',
    ...Array.from({ length: 6 }, (_, index) => `data-science/lesson-${index + 1}.html`),
    'digital-guidebook/index.html',
    ...Array.from({ length: 6 }, (_, index) => `digital-guidebook/lesson-${index + 1}.html`),
    'web-course/index.html',
    ...Array.from({ length: 6 }, (_, index) => `web-course/lesson-${index + 1}.html`)
];
let checked = 0;
for (const page of pages) {
    const file = path.join(root, page);
    const html = fs.readFileSync(file, 'utf8').replace(/<(?:textarea|code|pre)\b[^>]*>[\s\S]*?<\/(?:textarea|code|pre)\s*>/gi, '');
    assert.match(html, /<script src="(?:\.\.\/)?theme\.js"><\/script>/, `${page}: missing theme script`);
    if (html.includes('workbook-course.js')) {
        assert.match(fs.readFileSync(path.join(root, 'workbook-course.js'), 'utf8'), /id="theme-preference"/, `${page}: shared renderer must provide a theme selector`);
    } else {
        assert.match(html, /id="theme-preference"/, `${page}: missing theme selector`);
    }
    for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
        const url = match[1];
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) continue;
        const target = url.split(/[?#]/, 1)[0];
        if (!target) continue;
        assert.ok(fs.existsSync(path.resolve(path.dirname(file), target)), `${page}: missing ${url}`);
        checked++;
    }
}
const chooser = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(chooser, /href="python-course\/index\.html"/);
assert.match(chooser, /href="web-course\/index\.html"/);
assert.match(chooser, /href="python-sequences\/index\.html"/);
assert.match(chooser, /href="data-science\/index\.html"/);
assert.match(chooser, /href="digital-guidebook\/index\.html"/);
const pythonGroup = chooser.match(/<section\b(?=[^>]*aria-labelledby="python-course-heading")[^>]*>([\s\S]*?)<\/section>/)?.[1];
const year7Group = chooser.match(/<section\b(?=[^>]*aria-labelledby="year-7-heading")[^>]*>([\s\S]*?)<\/section>/)?.[1];
const year9Group = chooser.match(/<section\b(?=[^>]*aria-labelledby="year-9-heading")[^>]*>([\s\S]*?)<\/section>/)?.[1];
assert.ok(pythonGroup?.includes('href="python-course/index.html"'), 'core Python stays in its own returning-course group');
assert.ok(!pythonGroup?.includes('href="python-sequences/index.html"'), 'Year 9 sequences is separate from core Python');
assert.ok(year7Group?.includes('href="web-course/index.html"'), 'web development is grouped under Year 7');
assert.ok(year7Group?.includes('href="digital-guidebook/index.html"'), 'digital literacy is grouped under Year 7');
assert.ok(!year7Group?.includes('href="data-science/index.html"'), 'Year 9 courses are not in the Year 7 group');
assert.ok(year9Group?.includes('href="python-sequences/index.html"'), 'Python sequences is grouped under Year 9');
assert.ok(year9Group?.includes('href="data-science/index.html"'), 'data science is grouped under Year 9');
const dashboard = fs.readFileSync(path.join(root, 'python-course', 'index.html'), 'utf8');
for (let lesson = 1; lesson <= 6; lesson++) {
    assert.match(dashboard, new RegExp(`href="Lesson${lesson}\\.html"`));
}
assert.match(dashboard, /href="\.\.\/index\.html"/);
const webDashboard = fs.readFileSync(path.join(root, 'web-course', 'index.html'), 'utf8');
for (let lesson = 1; lesson <= 6; lesson++) {
    assert.match(webDashboard, new RegExp(`href="lesson-${lesson}\\.html"`));
}
for (const course of ['python-sequences', 'data-science', 'digital-guidebook']) {
    const courseDashboard = fs.readFileSync(path.join(root, course, 'index.html'), 'utf8');
    assert.match(courseDashboard, /data-course="[^"]+"/, `${course}: course identity is required`);
    assert.match(courseDashboard, /workbook-course\.js/, `${course}: shared course renderer is required`);
    for (let lesson = 1; lesson <= 6; lesson++) {
        const lessonPage = fs.readFileSync(path.join(root, course, `lesson-${lesson}.html`), 'utf8');
        assert.match(lessonPage, new RegExp(`data-lesson="${lesson}"`), `${course}: lesson ${lesson} must be addressable by the course renderer`);
    }
}
console.log(`PASS ${checked} local resource and navigation links across ${pages.length} pages`);
