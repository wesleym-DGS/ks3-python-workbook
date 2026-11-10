const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'web-course', 'rewards.js'), 'utf8');
const elements = new Map();
function element(id) {
    if (!elements.has(id)) {
        elements.set(id, {
            textContent: '',
            dataset: {},
            classes: new Set(),
            classList: {
                add(name) { elements.get(id).classes.add(name); },
                remove(name) { elements.get(id).classes.delete(name); },
                toggle(name, enabled) {
                    if (enabled) elements.get(id).classes.add(name);
                    else elements.get(id).classes.delete(name);
                }
            },
            querySelector(selector) { return element(`${id} ${selector}`); }
        });
    }
    return elements.get(id);
}
const root = element('.web-rewards');
const context = {
    document: {
        querySelector: () => root,
        getElementById: element
    },
    window: {}
};
vm.runInNewContext(source, context);

const rewards = context.window.webRewards;
assert.equal(rewards.summarize([true, false, true, false, false, false]).completed, 2);
assert.equal(rewards.summarize([true, false, true, false, false, false]).xp, 200);
assert.equal(rewards.summarize([true, true, true, true, true, true]).xp, 600);
assert.equal(rewards.summarize([true, true, true, true, true, true, true]).completed, 6);
assert.throws(() => rewards.render('unknown', []), /Unknown web rewards state/);

rewards.render('loading');
assert.equal(element('web-rewards-xp').textContent, '--');
assert.equal(element('web-rewards-completed').textContent, '--');
rewards.render('ready', [true, false, true, false, false, false]);
assert.equal(element('web-rewards-xp').textContent, '200');
assert.equal(element('web-rewards-completed').textContent, '2');
assert.equal(element('.web-rewards [data-reward-milestone="1"]').classes.has('is-unlocked'), true);
assert.equal(element('.web-rewards [data-reward-milestone="3"]').classes.has('is-unlocked'), false);
rewards.render('ready', [true, true, true, false, false, false]);
assert.equal(element('.web-rewards [data-reward-milestone="3"]').classes.has('is-unlocked'), true);
rewards.render('ready', [false, true, true, false, false, false]);
assert.equal(element('web-rewards-xp').textContent, '200');
assert.equal(element('.web-rewards [data-reward-milestone="1"]').classes.has('is-unlocked'), true);
assert.equal(element('.web-rewards [data-reward-milestone="3"]').classes.has('is-unlocked'), false);
rewards.render('unavailable', [], 'Could not load.');
assert.equal(element('web-rewards-xp').textContent, '--');
assert.equal(element('.web-rewards [data-reward-milestone="1"]').classes.has('is-unlocked'), false);

const page = fs.readFileSync(path.join(__dirname, '..', 'web-course', 'index.html'), 'utf8');
assert.match(page, /<script src="\.\.\/theme\.js"><\/script>\s*<link rel="stylesheet" href="styles\.css">/);
assert.match(page, /<body class="auth-pending" data-strand="ict">/);
assert.match(page, /<link rel="stylesheet" href="rewards\.css">/);
assert.match(page, /self-report/i);
console.log('PASS web rewards XP, milestones, reversals, cleared states and dashboard wiring');
