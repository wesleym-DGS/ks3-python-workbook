(() => {
    'use strict';

    const DATA_TASK_XP = [50, 75, 100, 150];
    const app = document.getElementById('course-app');
    if (!app) return;

    const course = window.WORKBOOK_COURSE_DATA;
    if (!course) throw new Error('This course has no lesson content configured.');

    const lessonNumber = Number(document.body.dataset.lesson || 0);
    let lessonStates = course.lessons.map((_, index) => readState(index + 1));

    function xpValues(number) {
        return course.lessons[number - 1].challenges ? course.taskXp : DATA_TASK_XP;
    }

    function taskTotal(number) {
        return xpValues(number).length;
    }

    function courseTaskTotal() {
        return course.lessons.reduce((total, _, index) => total + taskTotal(index + 1), 0);
    }

    function courseXpTotal() {
        return course.lessons.reduce((total, _, index) =>
            total + xpValues(index + 1).reduce((sum, value) => sum + value, 0), 0);
    }

    function stateKey(number) {
        const version = course.stateVersion || 1;
        return `ks3_${course.id.replace(/-/g, '_')}_lesson${number}_v${version}_state`;
    }

    function emptyState(number) {
        return {
            completedTasks: xpValues(number).map(() => false),
            xp: 0,
            answers: [],
            codeByChallenge: {},
            projectAnswers: {}
        };
    }

    function readState(number) {
        const raw = localStorage.getItem(stateKey(number));
        if (!raw) return emptyState(number);
        try {
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyState(number);
            const state = emptyState(number);
            state.completedTasks = xpValues(number).map((_, index) =>
                Array.isArray(parsed.completedTasks) && parsed.completedTasks[index] === true
            );
            state.xp = calculateXp(state, number);
            state.answers = Array.isArray(parsed.answers) ? parsed.answers : [];
            state.activeChallenge = Number.isInteger(parsed.activeChallenge)
                && parsed.activeChallenge >= 0 && parsed.activeChallenge < taskTotal(number)
                ? parsed.activeChallenge : 0;
            state.codeByChallenge = parsed.codeByChallenge && typeof parsed.codeByChallenge === 'object'
                && !Array.isArray(parsed.codeByChallenge) ? parsed.codeByChallenge : {};
            state.projectAnswers = parsed.projectAnswers && typeof parsed.projectAnswers === 'object'
                && !Array.isArray(parsed.projectAnswers) ? parsed.projectAnswers : {};
            return state;
        } catch (error) {
            console.error(`Could not read saved progress for ${stateKey(number)}.`, error);
            return emptyState(number);
        }
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function calculateXp(state, number) {
        return state.completedTasks.reduce((sum, completed, index) =>
            sum + (completed ? xpValues(number)[index] : 0), 0);
    }

    function saveState(number, state) {
        state.xp = calculateXp(state, number);
        localStorage.setItem(stateKey(number), JSON.stringify(state));
        window.workbookCloud?.saveProgress(`${course.syncPrefix}${number}`);
        window.dispatchEvent(new Event('workbook-progress-updated'));
    }

    function saveDraft(number, state) {
        state.xp = calculateXp(state, number);
        localStorage.setItem(stateKey(number), JSON.stringify(state));
    }

    function taskCount(state) {
        return state.completedTasks.filter(Boolean).length;
    }

    function renderChart(chart) {
        if (!chart) return '';
        if (chart.type === 'scatter' && Array.isArray(chart.points)) {
            const xValues = chart.points.map(point => point.x);
            const yValues = chart.points.map(point => point.y);
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);
            const xRange = maxX - minX || 1;
            const yRange = maxY - minY || 1;
            const points = chart.points.map(point => {
                const x = 52 + ((point.x - minX) / xRange) * 280;
                const y = 158 - ((point.y - minY) / yRange) * 118;
                return `<circle cx="${x}" cy="${y}" r="5"><title>${escapeHtml(point.label)}: ${escapeHtml(point.x)}, ${escapeHtml(point.y)}</title></circle>`;
            }).join('');
            return `<figure class="course-chart course-scatter-chart">
                <figcaption>${escapeHtml(chart.title)}</figcaption>
                <svg viewBox="0 0 360 220" role="img" aria-label="${escapeHtml(chart.title)}">
                    <line x1="48" y1="158" x2="340" y2="158"></line>
                    <line x1="48" y1="20" x2="48" y2="158"></line>
                    ${points}
                    <text x="194" y="198" text-anchor="middle">${escapeHtml(chart.xLabel)}</text>
                    <text x="8" y="16">${escapeHtml(chart.yLabel)}</text>
                    <text x="43" y="158" text-anchor="end">${escapeHtml(minY)}</text>
                    <text x="43" y="42" text-anchor="end">${escapeHtml(maxY)}</text>
                    <text x="48" y="176">${escapeHtml(minX)}</text>
                    <text x="310" y="176">${escapeHtml(maxX)}</text>
                </svg>
                <p class="course-chart-unit">${escapeHtml(chart.unit)}</p>
            </figure>`;
        }
        const max = Math.max(...chart.values, 1);
        const bars = chart.values.map((value, index) => `
            <div class="course-chart-row">
                <span>${escapeHtml(chart.labels[index])}</span>
                <span class="course-chart-track"><span style="width:${Math.max(3, value / max * 100)}%"></span></span>
                <strong>${escapeHtml(value)}</strong>
            </div>`).join('');
        return `<figure class="course-chart" aria-label="${escapeHtml(chart.title)}">
            <figcaption>${escapeHtml(chart.title)}</figcaption>${bars}
            <p class="course-chart-unit">${escapeHtml(chart.unit)}</p>
        </figure>`;
    }

    function renderAchievements(states) {
        return course.achievements.map((name, index) => {
            const complete = taskCount(states[index]) === taskTotal(index + 1);
            return `<article class="course-achievement ${complete ? 'is-earned' : ''}">
                <span aria-hidden="true">${complete ? '★' : '☆'}</span>
                <div><strong>${escapeHtml(name)}</strong><small>${complete ? 'EARNED' : 'Complete lesson ' + (index + 1)}</small></div>
            </article>`;
        }).join('');
    }

    function renderCourseCredit(prefix, suffix) {
        if (course.sourceAttribution) {
            return `<footer class="course-credit">${escapeHtml(course.sourceAttribution)}</footer>`;
        }
        return `<footer class="course-credit">${prefix} <a href="${course.sourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(course.sourceTitle)}</a>${suffix} <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noopener noreferrer">Open Government Licence v3.0</a>.</footer>`;
    }

    function renderDashboard() {
        const tasksTotal = courseTaskTotal();
        const completed = lessonStates.reduce((sum, state) => sum + taskCount(state), 0);
        const xp = lessonStates.reduce((sum, state, index) => sum + calculateXp(state, index + 1), 0);
        const earned = lessonStates.filter((state, index) => taskCount(state) === taskTotal(index + 1)).length;
        const next = lessonStates.findIndex((state, index) => taskCount(state) < taskTotal(index + 1));
        const cards = course.lessons.map((lesson, index) => {
            const state = lessonStates[index];
            const count = taskCount(state);
            const number = index + 1;
            return `<article class="course-lesson-card">
                <div class="course-lesson-top"><span class="course-lesson-number">${String(number).padStart(2, '0')}</span>
                    <span class="course-status">${count === taskTotal(number) ? 'COMPLETE' : count ? 'IN PROGRESS' : 'READY'}</span></div>
                <h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.summary)}</p>
                <div class="course-progress" role="progressbar" aria-label="Lesson ${number} progress" aria-valuemin="0" aria-valuemax="${taskTotal(number)}" aria-valuenow="${count}">
                    <span style="width:${count / taskTotal(number) * 100}%"></span></div>
                <p class="course-lesson-meta">${count} of ${taskTotal(number)} tasks · ${xpValues(number).reduce((a, b) => a + b, 0)} XP</p>
                <a class="course-button" href="lesson-${number}.html">${count === taskTotal(number) ? 'Review lesson' : count ? 'Continue lesson' : 'Start lesson'} <span aria-hidden="true">→</span></a>
            </article>`;
        }).join('');

        const header = `<header class="course-header">
            <a class="course-brand" href="../index.html">KS3 Computing Workbook</a>
            <div class="course-header-actions"><label class="theme-control"><span>Theme</span><select id="theme-preference" aria-label="Colour theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
                <a class="course-button course-button-secondary" href="../index.html">All courses</a>
                <a id="teacher-dashboard-link" class="workbook-auth-button hidden" href="../teachers.html">Teacher dashboard</a>
                <div class="workbook-auth" aria-live="polite"><span id="workbook-auth-status" class="workbook-auth-status">Checking Google sign-in…</span>
                    <span id="workbook-account-email" class="workbook-account-email hidden"></span>
                    <button id="workbook-sign-in" class="workbook-auth-button">Sign in with school Google</button>
                    <button id="workbook-sign-out" class="workbook-auth-button workbook-secondary-button hidden">Sign out</button>
                    <button id="workbook-sync-retry" class="workbook-auth-button workbook-secondary-button hidden">Retry sync</button></div>
            </div></header>`;
        const main = `<main class="course-main">
            <section class="course-hero"><div class="course-hero-content">
                <p class="course-eyebrow">${escapeHtml(course.strand.replace('-', ' '))} · YEAR ${escapeHtml(course.yearGroup || 9)}</p>
                <h1>${escapeHtml(course.title)}</h1><p>${escapeHtml(course.intro)}</p></div></section>
            <section class="course-stats" aria-label="Course progress">
                <article><span>XP</span><strong>${xp.toLocaleString()} / ${courseXpTotal().toLocaleString()}</strong></article>
                <article><span>LESSON PROGRESS</span><strong>${Math.round(completed / tasksTotal * 100)}%</strong></article>
                <article><span>ACHIEVEMENTS</span><strong>${earned} / ${course.lessons.length}</strong></article>
            </section>
            <p class="course-prerequisite"><strong>Before you begin:</strong> ${escapeHtml(course.prerequisite)}</p>
            <section class="course-section"><div class="course-section-heading"><div><p class="course-eyebrow">LEARNING PATHWAY</p><h2>Six lessons</h2></div>
                <a class="course-button" href="lesson-${next < 0 ? 1 : next + 1}.html">${next < 0 ? 'Review your progress' : 'Continue learning'} <span aria-hidden="true">→</span></a></div>
                <div class="course-lesson-grid">${cards}</div></section>
            <section class="course-section"><div class="course-section-heading"><div><p class="course-eyebrow">YOUR PROGRESS</p><h2>Achievements</h2></div></div>
                <div class="course-achievement-grid">${renderAchievements(lessonStates)}</div></section>
            ${renderCourseCredit("Curriculum adapted from Teach Computing's", ' unit. Activities and examples here are original adaptations. Teach Computing resources are available under the ')}
        </main>`;
        if (app.querySelector('.course-header')) app.querySelector('.course-main').outerHTML = main;
        else app.innerHTML = header + main;
    }

    function renderQuestion(question, index, state) {
        const chosen = state.answers[index];
        const options = question.choices.map((choice, choiceIndex) =>
            `<label class="course-option"><input type="radio" name="question-${index}" value="${choiceIndex}" ${chosen === choiceIndex ? 'checked' : ''}>
                <span>${escapeHtml(choice)}</span></label>`).join('');
        return `<fieldset class="course-question" data-question="${index}">
            <legend>${index + 1}. ${escapeHtml(question.prompt)}</legend>${options}
            <button type="button" class="course-button course-check" data-check-question="${index}">Check answer</button>
            <p class="course-feedback" id="feedback-${index}" role="status"></p></fieldset>`;
    }

    function renderSections(lesson) {
        if (lesson.sections) {
            return `<div class="course-theory">${lesson.sections.map(section =>
                `<section><h3>${escapeHtml(section.heading)}</h3><p>${escapeHtml(section.body)}</p></section>`
            ).join('')}</div>`;
        }
        return `<p>${escapeHtml(lesson.explanation || '')}</p>`;
    }

    function renderTools(tools) {
        if (!tools?.length) return '';
        return `<section class="course-tool-links" aria-label="Suggested tools"><h3>Tools for this lesson</h3><ul>${tools.map(tool =>
            tool.url
                ? `<li><a href="${escapeHtml(tool.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tool.label)}</a></li>`
                : `<li>${escapeHtml(tool.label)}</li>`
        ).join('')}</ul></section>`;
    }

    function exampleText(challenge) {
        if (challenge.example) return challenge.example;
        return (challenge.tests || []).slice(0, 2).map(test =>
            `${test.inputs.length ? `User types: ${test.inputs.join(' , ')}\n` : ''}Program prints:\n${test.expected}`
        ).join('\n\n');
    }

    function wrapComment(text, prefix = '# ') {
        const lines = [];
        let line = '';
        String(text).split(/\s+/).forEach(word => {
            if (line && (line + ' ' + word).length > 68) { lines.push(line); line = word; }
            else line = line ? `${line} ${word}` : word;
        });
        if (line) lines.push(line);
        return lines.map(item => prefix + item).join('\n');
    }

    function challengeStarter(challenge, index) {
        const steps = challenge.steps.map((step, stepIndex) => wrapComment(`${stepIndex + 1}. ${step}`)).join('\n');
        const example = exampleText(challenge).split('\n').map(line => `#   ${line}`).join('\n');
        return `# TASK ${index + 1}: ${challenge.title}\n${wrapComment(challenge.description)}\n#\n# Steps:\n${steps}\n#\n# Example:\n${example}\n# ----------------------------------------\n\n${challenge.starter}`;
    }

    function renderPythonChallengeGroups(lesson, state) {
        return course.challengeTiers.map(tier => `<section class="python-challenge-tier">
            <h3>${escapeHtml(tier.title)}</h3>
            ${lesson.challenges.slice(tier.start, tier.end).map((challenge, offset) => {
                const index = tier.start + offset;
                const complete = state.completedTasks[index];
                return `<article class="python-challenge-card ${complete ? 'is-complete' : ''} ${state.activeChallenge === index ? 'is-active' : ''}">
                    <div class="python-challenge-title"><span>${index + 1}</span><div><h4>${escapeHtml(challenge.title)}</h4><small>+${course.taskXp[index]} XP</small></div></div>
                    <p>${escapeHtml(challenge.description)}</p>
                    <ol>${challenge.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
                    <div class="python-example"><strong>Example</strong><pre>${escapeHtml(exampleText(challenge))}</pre></div>
                    <details><summary>Hint</summary><p>${escapeHtml(challenge.hint)}</p></details>
                    ${challenge.selfCheck ? `<p class="python-self-check"><strong>Self-check:</strong> ${escapeHtml(challenge.selfCheck)}</p>` : ''}
                    <div class="python-challenge-actions">
                        <button type="button" class="course-button course-button-secondary" data-load-challenge="${index}" aria-pressed="${state.activeChallenge === index}">${state.activeChallenge === index ? 'Prompt loaded' : 'Load prompt'}</button>
                        <button type="button" class="course-button" data-check-challenge="${index}" ${complete ? 'disabled' : ''}>${complete ? 'Completed' : 'Check task'}</button>
                    </div>
                    <p class="course-feedback" id="challenge-feedback-${index}" role="status">${complete ? 'Challenge complete.' : ''}</p>
                </article>`;
            }).join('')}
        </section>`).join('');
    }

    function renderPythonChallenges(lesson, state) {
        return `<section class="course-activity python-practice" aria-labelledby="python-practice-heading">
            <h2 id="python-practice-heading">Programming challenge path <span>8 challenges · 4 tiers</span></h2>
            <p>Choose a challenge, load its starter, and work in the Python editor. Run your own examples as you go. The automatic checks use fresh example inputs; creative tasks use the self-check criteria.</p>
            <div class="python-practice-layout">
                <div id="python-challenge-groups" class="python-challenge-groups">${renderPythonChallengeGroups(lesson, state)}</div>
                <div class="python-workspace">
                <div class="python-workspace-heading"><strong>CodeMirror 6 · Python</strong><span>Ctrl+Enter to run</span></div>
                <div class="python-editor" data-python-ide data-placeholder="# Load a challenge and start coding"></div>
                <div class="python-editor-actions">
                    <button type="button" class="course-button" id="run-python">Run Python</button>
                    <button type="button" class="course-button course-button-secondary" id="stop-python">Stop</button>
                    <button type="button" class="course-button course-button-secondary" id="format-python">Tidy lines</button>
                    <button type="button" class="course-button course-button-secondary" id="clear-python">Clear editor</button>
                </div>
                <pre id="python-console" class="python-console" aria-live="polite">Choose a challenge, then run your code.</pre>
                <p id="python-run-feedback" class="course-feedback" role="status"></p>
                </div>
            </div>
        </section>`;
    }

    function renderProject(lesson, state) {
        const project = lesson.project;
        if (!project) return '';
        const fields = project.fields.map(field => `<label class="course-project-field" for="project-${field.key}">
            <span>${escapeHtml(field.label)}</span>
            <textarea id="project-${field.key}" data-project-field="${escapeHtml(field.key)}" rows="3" placeholder="${escapeHtml(field.placeholder)}">${escapeHtml(state.projectAnswers[field.key] || '')}</textarea>
        </label>`).join('');
        const hasCsv = project.csv || lesson.csv || lesson.chart;
        return `<section class="course-activity course-project">
            <h2>${escapeHtml(project.title)} <span>${DATA_TASK_XP[3]} XP</span></h2>
            <p>${escapeHtml(project.intro)}</p>
            ${fields}
            ${hasCsv ? '<button type="button" id="download-csv" class="course-button course-button-secondary">Download a sample CSV</button>' : ''}
            <p class="course-project-help">These notes are saved in this browser. Do not enter names, personal information, or raw class responses.</p>
            <button type="button" id="complete-project" class="course-button" ${state.completedTasks[3] ? 'disabled' : ''}>${state.completedTasks[3] ? 'Activity complete' : 'Save and complete activity'}</button>
            <p id="project-feedback" class="course-feedback" role="status">${state.completedTasks[3] ? 'Activity saved.' : ''}</p>
        </section>`;
    }

    function renderLesson(number) {
        if (!Number.isInteger(number) || number < 1 || number > course.lessons.length) {
            throw new Error(`Lesson ${number} does not exist in ${course.id}.`);
        }
        const lesson = course.lessons[number - 1];
        const state = readState(number);
        state.answers = Array.isArray(state.answers) ? state.answers : [];
        state.projectAnswers = state.projectAnswers || {};
        state.codeByChallenge = state.codeByChallenge || {};
        const quizMarkup = lesson.questions.map((question, index) => renderQuestion(question, index, state)).join('');
        const pythonLesson = Boolean(lesson.challenges);
        const activity = pythonLesson
            ? renderPythonChallenges(lesson, state)
            : renderProject(lesson, state);
        const example = lesson.example ? `<section class="course-worked-example"><h3>Worked example</h3><pre><code>${escapeHtml(lesson.example)}</code></pre></section>` : '';
        const misconception = lesson.misconception
            ? `<aside class="course-misconception"><strong>Common trap:</strong> ${escapeHtml(lesson.misconception)}</aside>` : '';
        const chart = lesson.chart ? renderChart(lesson.chart) : '';
        const tools = renderTools(lesson.tools);
        const completed = taskCount(state);
        const nav = course.lessons.map((entry, index) => `<a href="lesson-${index + 1}.html" ${index + 1 === number ? 'aria-current="page"' : ''}>${index + 1}. ${escapeHtml(entry.title)}</a>`).join('');
        const questionXp = xpValues(number).slice(0, 3);

        app.innerHTML = `<header class="course-header"><a class="course-brand" href="index.html">${escapeHtml(course.shortTitle)}</a>
            <div class="course-header-actions"><label class="theme-control"><span>Theme</span><select id="theme-preference" aria-label="Colour theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
                <a class="course-button course-button-secondary" href="index.html">Course dashboard</a>
                <a id="teacher-dashboard-link" class="workbook-auth-button hidden" href="../teachers.html">Teacher dashboard</a>
                <div class="workbook-auth" aria-live="polite"><span id="workbook-auth-status" class="workbook-auth-status">Checking Google sign-in…</span>
                    <span id="workbook-account-email" class="workbook-account-email hidden"></span>
                    <button id="workbook-sign-in" class="workbook-auth-button">Sign in with school Google</button>
                    <button id="workbook-sign-out" class="workbook-auth-button workbook-secondary-button hidden">Sign out</button>
                    <button id="workbook-sync-retry" class="workbook-auth-button workbook-secondary-button hidden">Retry sync</button></div></div></header>
            <main class="course-main course-lesson-main"><p class="course-eyebrow">LESSON ${String(number).padStart(2, '0')} / ${escapeHtml(course.strand.replace('-', ' '))}</p>
                <h1>${escapeHtml(lesson.title)}</h1><p class="course-lead">${escapeHtml(lesson.summary)}</p>
                <div class="course-lesson-status"><span>Lesson XP</span><strong id="lesson-xp">${state.xp} / ${xpValues(number).reduce((a, b) => a + b, 0)}</strong>
                    <span>Tasks</span><strong id="lesson-task-count">${completed} / ${taskTotal(number)}</strong></div>
                <div class="course-lesson-layout"><nav class="course-nav" aria-label="Course lessons"><strong>Six lessons</strong>${nav}</nav>
                    <div class="course-lesson-content">
                        <section class="course-activity"><h2>Learn</h2>${renderSections(lesson)}${example}${misconception}${chart}${tools}</section>
                        <section class="course-activity course-understanding"><h2>Check your understanding</h2><p>Use these short practice checks to revisit the ideas from this lesson.</p>${quizMarkup}</section>
                        ${activity}<p class="course-feedback" id="lesson-feedback" role="status"></p>
                        <div class="course-bottom-nav">${number > 1 ? `<a class="course-button course-button-secondary" href="lesson-${number - 1}.html">← Previous lesson</a>` : ''}
                            <a class="course-button" href="${number < course.lessons.length ? `lesson-${number + 1}.html` : 'index.html'}">${number < course.lessons.length ? 'Next lesson →' : 'Finish course'}</a></div>
                    </div></div>
                ${renderCourseCredit("Adapted from Teach Computing's", ' scheme. Student explanations, examples, and practice activities are original adaptations. Teach Computing resources are available under the ')}
            </main>`;
        attachLesson(number, lesson, state);
    }

    function attachLesson(number, lesson, state) {
        app.querySelectorAll('[data-check-question]').forEach(button => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.checkQuestion);
                const selected = app.querySelector(`input[name="question-${index}"]:checked`);
                const response = document.getElementById(`feedback-${index}`);
                if (!selected) {
                    response.textContent = 'Choose an answer first.';
                    return;
                }
                const correct = Number(selected.value) === lesson.questions[index].answer;
                response.textContent = correct ? 'Correct — idea checked.' : 'Not quite. Review the explanation and try again.';
                response.classList.toggle('is-correct', correct);
                if (correct && !state.completedTasks[index]) {
                    state.completedTasks[index] = true;
                    state.answers[index] = Number(selected.value);
                    saveState(number, state);
                    updateLessonStatus(state, number);
                }
            });
        });

        if (lesson.challenges) attachPythonLesson(number, lesson, state);
        else attachProjectLesson(number, lesson, state);
    }

    function attachPythonLesson(number, lesson, state) {
        if (!window.PythonIDE) throw new Error('The CodeMirror Python IDE did not load.');
        if (!window.pythonRuntime) throw new Error('The Python runtime did not load.');
        const editor = window.PythonIDE.mount(app.querySelector('[data-python-ide]'));
        const consoleElement = document.getElementById('python-console');
        const inputHandler = window.pythonRuntime.createTerminalInputHandler(consoleElement);
        let lastRunCode = '';
        let lastRunSucceeded = false;
        let running = false;
        let activeChallenge = state.activeChallenge || 0;
        const runButton = document.getElementById('run-python');
        const stopButton = document.getElementById('stop-python');
        const runFeedback = document.getElementById('python-run-feedback');
        stopButton.disabled = true;

        editor.setValue(state.codeByChallenge[activeChallenge] ?? challengeStarter(lesson.challenges[activeChallenge], activeChallenge));
        editor.root.addEventListener('ide-change', event => {
            state.codeByChallenge[activeChallenge] = event.detail.value;
            lastRunSucceeded = false;
            lastRunCode = '';
            saveDraft(number, state);
        });
        editor.root.addEventListener('ide-run', runCode);

        async function runCode() {
            if (running) return;
            running = true;
            runButton.disabled = true;
            stopButton.disabled = false;
            runFeedback.textContent = 'Running your Python program…';
            try {
                const result = await editor.run({
                    onInput: inputHandler,
                    onStatus(status) {
                        runButton.textContent = status === 'running' ? 'Running Python…' : 'Loading Python…';
                    }
                });
                lastRunCode = editor.value;
                lastRunSucceeded = !result.hasError && !result.stopped;
                consoleElement.textContent = result.output || (result.hasError ? 'Python reported an error.' : '(Program executed with no output)');
                consoleElement.classList.toggle('has-error', result.hasError);
                runFeedback.textContent = result.hasError ? 'Check the error message, then edit and run again.' : 'Program finished.';
            } catch (error) {
                lastRunSucceeded = false;
                consoleElement.textContent = error instanceof Error ? error.message : String(error);
                consoleElement.classList.add('has-error');
                runFeedback.textContent = 'The program could not run. Check the message above.';
            } finally {
                running = false;
                runButton.disabled = false;
                stopButton.disabled = true;
                runButton.textContent = 'Run Python';
            }
        }

        runButton.addEventListener('click', runCode);
        stopButton.addEventListener('click', () => window.pythonRuntime.stop('Execution stopped by you.'));
        document.getElementById('format-python').addEventListener('click', () => editor.format());
        document.getElementById('clear-python').addEventListener('click', () => {
            editor.clear();
            consoleElement.textContent = 'Editor cleared.';
        });

        const challengeGroup = document.getElementById('python-challenge-groups');
        function bindChallengeButtons() {
            challengeGroup.querySelectorAll('[data-load-challenge]').forEach(button => {
                button.addEventListener('click', () => {
                    activeChallenge = Number(button.dataset.loadChallenge);
                    state.activeChallenge = activeChallenge;
                    editor.setValue(state.codeByChallenge[activeChallenge] ?? challengeStarter(lesson.challenges[activeChallenge], activeChallenge));
                    renderChallengeStates(state, lesson);
                    saveDraft(number, state);
                    bindChallengeButtons();
                    editor.focus();
                });
            });
            challengeGroup.querySelectorAll('[data-check-challenge]').forEach(button => {
                button.addEventListener('click', () => checkChallenge(button));
            });
        }
        bindChallengeButtons();

        async function checkChallenge(button) {
            const index = Number(button.dataset.checkChallenge);
            const challenge = lesson.challenges[index];
            const feedback = document.getElementById(`challenge-feedback-${index}`);
            if (state.completedTasks[index]) {
                feedback.textContent = 'Challenge complete.';
                return;
            }
            if (challenge.creative) {
                const hasExecutableCode = editor.value.split(/\r?\n/).some(line =>
                    line.trim() && !line.trim().startsWith('#')
                );
                if (index !== activeChallenge) {
                    feedback.textContent = 'Load this challenge’s prompt first, so your code is in the editor for this task.';
                    return;
                }
                if (editor.value.trim() === challengeStarter(challenge, index).trim() || !hasExecutableCode) {
                    feedback.textContent = 'There is no code of your own yet — write your solution below the comments, following the steps listed.';
                    return;
                }
                if (lastRunCode !== editor.value) {
                    feedback.textContent = 'You have changed your code since it last ran. Press Run Python and test it, then check the task again.';
                    return;
                }
                if (!lastRunSucceeded) {
                    feedback.textContent = 'Your last run had an error. Read the message in the terminal, fix it, run again, then check the task.';
                    return;
                }
                completeChallenge(index, state, number, feedback, lesson);
                return;
            }
            if (running) {
                feedback.textContent = 'Wait for the current program to finish first.';
                return;
            }
            button.disabled = true;
            feedback.textContent = 'Running the example checks…';
            try {
                const results = await window.pythonRuntime.runTests(editor.value, challenge.tests);
                const failedIndex = challenge.tests.findIndex((test, testIndex) => {
                    const result = results[testIndex];
                    return !result || result.hasError || result.programOutput.trim() !== test.expected;
                });
                if (failedIndex < 0) {
                    completeChallenge(index, state, number, feedback, lesson);
                } else {
                    const failed = results[failedIndex];
                    feedback.textContent = explainFailure(challenge, challenge.tests[failedIndex], failed, failedIndex, editor.value);
                }
            } catch (error) {
                feedback.textContent = `Python could not run the checks: ${error instanceof Error ? error.message : String(error)}`;
            } finally {
                button.disabled = state.completedTasks[index];
            }
        }

        function completeChallenge(index, currentState, lessonIndex, feedback, currentLesson) {
            currentState.completedTasks[index] = true;
            saveState(lessonIndex, currentState);
            feedback.textContent = 'Challenge complete — XP earned!';
            feedback.classList.add('is-correct');
            updateLessonStatus(currentState, lessonIndex);
            renderChallengeStates(currentState, currentLesson);
            bindChallengeButtons();
            celebrate(index);
        }
    }

    let confettiLoader;
    function loadConfetti() {
        if (typeof window.confetti === 'function') return Promise.resolve(window.confetti);
        confettiLoader = confettiLoader || new Promise(resolve => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
            script.onload = () => resolve(window.confetti);
            script.onerror = () => resolve(null);
            document.head.appendChild(script);
        });
        return confettiLoader;
    }

    function celebrate(index) {
        const messages = ['Nailed it!', 'Brilliant coding!', 'Challenge crushed!', 'Boom! Task complete!', 'Python power!', 'Great work, coder!'];
        const toast = document.createElement('div');
        toast.className = 'course-celebration';
        toast.setAttribute('role', 'status');
        toast.textContent = `${messages[Math.floor(Math.random() * messages.length)]} +${course.taskXp[index]} XP`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2800);
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const intensity = 1 + Math.floor(index / 2);
        loadConfetti().then(confetti => {
            if (!confetti) return;
            const rand = (min, max) => Math.random() * (max - min) + min;
            const effects = [
                function fireworks() {
                    for (let burst = 0; burst < 2 + intensity; burst++) {
                        setTimeout(() => confetti({ startVelocity: 30, spread: 360, ticks: 70, zIndex: 9999, particleCount: 40 + intensity * 15, origin: { x: rand(0.15, 0.85), y: rand(0.1, 0.5) } }), burst * 280);
                    }
                },
                function cannons() {
                    const shared = { particleCount: 40 + intensity * 20, spread: 70, startVelocity: 55, zIndex: 9999 };
                    confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.8 } });
                    confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.8 } });
                },
                function stars() {
                    const shared = { spread: 360, ticks: 60, gravity: 0, decay: 0.94, startVelocity: 25, shapes: ['star'], colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'], zIndex: 9999 };
                    confetti({ ...shared, particleCount: 30 + intensity * 10, scalar: 1.2, origin: { x: rand(0.3, 0.7), y: 0.5 } });
                    setTimeout(() => confetti({ ...shared, particleCount: 20, scalar: 0.8, origin: { x: rand(0.3, 0.7), y: 0.4 } }), 200);
                },
                function rain() {
                    const end = Date.now() + 700 + intensity * 250;
                    (function frame() {
                        confetti({ particleCount: 4, angle: 90, spread: 140, startVelocity: 20, origin: { x: Math.random(), y: -0.1 }, zIndex: 9999 });
                        if (Date.now() < end) requestAnimationFrame(frame);
                    })();
                },
                function emoji() {
                    if (typeof confetti.shapeFromText !== 'function') return effects[0]();
                    const symbols = ['🐍', '🎉', '⭐', '🚀', '💻'];
                    const shapes = [confetti.shapeFromText({ text: symbols[Math.floor(Math.random() * symbols.length)], scalar: 3 })];
                    confetti({ shapes, scalar: 3, particleCount: 20 + intensity * 8, spread: 100, origin: { y: 0.65 }, zIndex: 9999 });
                }
            ];
            effects[Math.floor(Math.random() * effects.length)]();
        });
    }

    const ERROR_ADVICE = {
        SyntaxError: 'Python cannot read this line. Check brackets, quotes, commas and colons, and that every ( [ or " is closed.',
        IndentationError: 'The indentation is wrong. Lines inside a loop or if must be indented by the same amount, and other lines must not be indented.',
        TabError: 'Tabs and spaces are mixed. Use spaces only.',
        NameError: 'A name is used that Python does not know. Check the spelling and capital letters, that you created the variable before using it, and that text is inside quotes.',
        TypeError: 'A value has the wrong type for what you did with it. For example, you may be adding text to a number, or you may have forgotten int() around input().',
        ValueError: 'A value is the right type but not usable here. For example, int() was given text that is not a whole number.',
        IndexError: 'You asked for a position that does not exist. Positions start at 0, and a list of length n ends at index n - 1 (or -1).',
        KeyError: 'You looked up something that is not there.',
        AttributeError: 'That type of value does not have that method. Check the method name and that you are using it on the right variable.',
        ZeroDivisionError: 'You divided by zero.',
        EOFError: 'The program asked for more input() than the test supplies.'
    };

    function explainFailure(challenge, test, result, testIndex, code) {
        const lines = [];
        const inputs = test.inputs || [];
        const testLabel = inputs.length ? `When the user types ${inputs.map(value => `"${value}"`).join(', ')}` : 'When the program runs';
        const hint = `Hint: ${challenge.hint}`;
        if (!result) return `The check could not run. Try again.\n${hint}`;
        const stripped = code.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));

        if (result.hasError) {
            const text = String(result.output || '');
            const match = text.match(/(\w+(?:Error|Exception)): ?([^\n]*)\s*$/m) || text.match(/(\w+Error): ?(.*)/);
            const lineMatch = [...text.matchAll(/line (\d+)/g)].pop();
            if (/ran out of supplied input/.test(text)) {
                return `Your program asked for more input() than expected. ${testLabel}, it should only ask ${inputs.length} question${inputs.length === 1 ? '' : 's'}.\n${hint}`;
            }
            lines.push(match ? `${match[1]}${lineMatch ? ` on line ${lineMatch[1]}` : ''}: ${match[2] || ''}`.trim() : text.trim() || 'Python reported an error.');
            if (match && ERROR_ADVICE[match[1]]) lines.push(ERROR_ADVICE[match[1]]);
            lines.push(hint);
            return lines.join('\n');
        }

        const actual = String(result.programOutput ?? '').trim();
        const expected = String(test.expected).trim();
        if (!stripped.length) return `Your editor only has comments so far — write your code underneath them.\n${hint}`;
        if (!actual) {
            return `Nothing was printed. Use print() to show your answer on screen — the answer must be output, not just stored in a variable.\n${hint}`;
        }
        if (inputs.length && !result.inputCount) {
            lines.push('Your program never called input(), so it ignored what the user typed.');
        }
        const actualLines = actual.split('\n');
        const expectedLines = expected.split('\n');
        lines.push(`${testLabel}, expected:\n${expected}\nbut your program printed:\n${actual}`);

        if (actual.toLowerCase() === expected.toLowerCase()) {
            lines.push('The wording is right but the capital letters are different.');
        } else if (actual.replace(/\s+/g, '') === expected.replace(/\s+/g, '')) {
            lines.push('The characters are right but the spacing or line breaks are different. Check where you used print() separately.');
        } else if (actual.replace(/["']/g, '') === expected.replace(/["']/g, '')) {
            lines.push('The quote style differs. Printing a list shows single quotes, so print the list itself rather than building text.');
        } else if (actualLines.length < expectedLines.length) {
            lines.push(`Your program printed ${actualLines.length} line${actualLines.length === 1 ? '' : 's'} but ${expectedLines.length} ${expectedLines.length === 1 ? 'is' : 'are'} needed. Something is missing.`);
        } else if (actualLines.length > expectedLines.length) {
            lines.push(`Your program printed ${actualLines.length} lines but only ${expectedLines.length} ${expectedLines.length === 1 ? 'is' : 'are'} needed. Remove extra print() calls or debugging output.`);
        } else {
            const first = actualLines.findIndex((line, i) => line.trim() !== expectedLines[i].trim());
            if (first >= 0) lines.push(`The first difference is on output line ${first + 1}: expected "${expectedLines[first]}" but got "${actualLines[first]}".`);
            if (/^-?\d+(\.\d+)?$/.test(expected) && /^-?\d+(\.\d+)?$/.test(actual)) {
                lines.push('Both are numbers but the value differs. Check your calculation, index, or counter starting value.');
            }
        }
        if (testIndex > 0) lines.push(`This failed on example ${testIndex + 1}, so your code may work for the first case but not in general.`);
        lines.push(hint);
        return lines.join('\n');
    }

    function renderChallengeStates(state, lesson) {
        const group = document.getElementById('python-challenge-groups');
        if (!group) return;
        const currentScroll = group.scrollTop;
        group.innerHTML = renderPythonChallengeGroups(lesson, state);
        group.scrollTop = currentScroll;
    }

    function attachProjectLesson(number, lesson, state) {
        const project = lesson.project;
        const fields = app.querySelectorAll('[data-project-field]');
        fields.forEach(field => {
            field.addEventListener('input', () => {
                state.projectAnswers[field.dataset.projectField] = field.value;
                saveDraft(number, state);
            });
        });

        const download = document.getElementById('download-csv');
        if (download) {
            download.addEventListener('click', () => {
                const csv = project.csv || lesson.csv || chartToCsv(lesson.chart);
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `data-science-lesson-${number}-sample.csv`;
                link.click();
                URL.revokeObjectURL(url);
            });
        }

        const complete = document.getElementById('complete-project');
        complete.addEventListener('click', () => {
            const feedback = document.getElementById('project-feedback');
            const missing = project.fields.find(field =>
                (state.projectAnswers[field.key] || '').trim().length < 12
            );
            if (missing) {
                feedback.textContent = `Add a little more to “${missing.label}” before completing this activity.`;
                feedback.classList.remove('is-correct');
                return;
            }
            state.completedTasks[3] = true;
            saveState(number, state);
            feedback.textContent = 'Activity saved — task complete!';
            feedback.classList.add('is-correct');
            complete.disabled = true;
            complete.textContent = 'Activity complete';
            updateLessonStatus(state, number);
        });
    }

    function escapeCsv(value) {
        return `"${String(value).replace(/"/g, '""')}"`;
    }

    function chartToCsv(chart) {
        if (Array.isArray(chart.points)) {
            return `${escapeCsv(chart.xLabel)},${escapeCsv(chart.yLabel)}\n${chart.points
                .map(point => `${point.x},${point.y}`).join('\n')}\n`;
        }
        return `Category,Value\n${chart.labels.map((label, index) =>
            `${escapeCsv(label)},${chart.values[index]}`).join('\n')}\n`;
    }

    function updateLessonStatus(state, number) {
        document.getElementById('lesson-xp').textContent =
            `${state.xp.toLocaleString()} / ${xpValues(number).reduce((a, b) => a + b, 0)}`;
        document.getElementById('lesson-task-count').textContent = `${taskCount(state)} / ${taskTotal(number)}`;
        const feedback = document.getElementById('lesson-feedback');
        if (taskCount(state) === taskTotal(number)) {
            feedback.textContent = `Achievement earned: ${course.achievements[number - 1]}!`;
            feedback.classList.add('is-correct');
        }
    }

    function watchProgress() {
        window.addEventListener('storage', event => {
            if (event.key === null || course.lessons.some((_, index) => event.key === stateKey(index + 1))) {
                lessonStates = course.lessons.map((_, index) => readState(index + 1));
                renderDashboard();
            }
        });
        window.addEventListener('workbook-progress-updated', () => {
            lessonStates = course.lessons.map((_, index) => readState(index + 1));
            renderDashboard();
        });
    }

    if (lessonNumber) renderLesson(lessonNumber);
    else {
        renderDashboard();
        watchProgress();
    }
})();
