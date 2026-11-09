const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = [
    'index.html', 'teachers.html', 'class.html', 'staff.html',
    'python-course/index.html',
    ...Array.from({ length: 6 }, (_, index) => `python-course/Lesson${index + 1}.html`),
    'web-course/index.html', 'web-course/lesson-1.html'
];
let checked = 0;
for (const page of pages) {
    const file = path.join(root, page);
    const html = fs.readFileSync(file, 'utf8');
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
const dashboard = fs.readFileSync(path.join(root, 'python-course', 'index.html'), 'utf8');
for (let lesson = 1; lesson <= 6; lesson++) {
    assert.match(dashboard, new RegExp(`href="Lesson${lesson}\\.html"`));
}
assert.match(dashboard, /href="\.\.\/index\.html"/);
console.log(`PASS ${checked} local resource and navigation links across ${pages.length} pages`);
