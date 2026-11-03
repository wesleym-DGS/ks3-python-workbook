(function () {
    const LESSON1_KEY = 'ks3_python_lesson1_v3_state';
    const LESSON2_KEY = 'ks3_python_lesson2_v1_state';
    const LESSON1_TASK_COUNT = 10;
    const LESSON2_TASK_COUNT = 6;
    const TOTAL_XP = 2425;

    function readSavedState(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return {};
            const saved = JSON.parse(raw);
            return saved && typeof saved === 'object' ? saved : {};
        } catch (error) {
            console.error(`Could not read saved progress for ${key}.`, error);
            return {};
        }
    }

    function getProgress(key, count, isArray) {
        const saved = readSavedState(key);
        const source = saved.completedTasks && typeof saved.completedTasks === 'object'
            ? saved.completedTasks
            : {};
        const tasks = [];
        for (let index = 1; index <= count; index++) {
            const value = isArray ? source[index - 1] : source[index];
            tasks.push(value === true);
        }
        const completed = tasks.filter(Boolean).length;
        const rawXp = Number(saved.xp);
        const xp = Number.isFinite(rawXp) ? Math.max(0, Math.floor(rawXp)) : 0;
        return { tasks, completed, xp };
    }

    function updateLessonCard(lesson, progress) {
        const percent = Math.round(progress.completed / lesson.taskCount * 100);
        const complete = progress.completed === lesson.taskCount;
        const status = document.getElementById(`dashboard-lesson${lesson.id}-status`);
        status.textContent = complete ? 'COMPLETE' : progress.completed ? 'IN PROGRESS' : 'READY';

        document.getElementById(`dashboard-lesson${lesson.id}-progress-label`).textContent =
            `${progress.completed} of ${lesson.taskCount} tasks`;
        document.getElementById(`dashboard-lesson${lesson.id}-action`).textContent =
            complete ? 'Review lesson' : progress.completed ? 'Continue lesson' : 'Start lesson';

        const bar = document.getElementById(`dashboard-lesson${lesson.id}-progress-bar`);
        bar.style.width = `${percent}%`;
        bar.parentElement.setAttribute('aria-valuenow', String(progress.completed));
    }

    function render() {
        const lessons = [
            { id: 1, taskCount: LESSON1_TASK_COUNT, progress: getProgress(LESSON1_KEY, LESSON1_TASK_COUNT, false) },
            { id: 2, taskCount: LESSON2_TASK_COUNT, progress: getProgress(LESSON2_KEY, LESSON2_TASK_COUNT, true) }
        ];
        const totalTasks = lessons.reduce((sum, lesson) => sum + lesson.taskCount, 0);
        const completedTasks = lessons.reduce((sum, lesson) => sum + lesson.progress.completed, 0);
        const xp = lessons.reduce((sum, lesson) => sum + lesson.progress.xp, 0);
        const percent = Math.round(completedTasks / totalTasks * 100);
        const rank = xp >= 1400
            ? 'Creative Master'
            : xp >= 900
                ? 'Python Wizard'
                : xp >= 400
                    ? 'Apprentice Coder'
                    : 'Novice Coder';

        document.getElementById('dashboard-xp').textContent = xp.toLocaleString();
        document.getElementById('dashboard-rank').textContent = rank;
        document.querySelector('.dashboard-stat-total').textContent = ` / ${TOTAL_XP}`;
        document.getElementById('dashboard-progress').textContent = `${percent}%`;
        document.getElementById('dashboard-task-count').textContent = `${completedTasks} of ${totalTasks} tasks complete`;

        for (const lesson of lessons) updateLessonCard(lesson, lesson.progress);

        const firstIncomplete = lessons.find(lesson => lesson.progress.completed < lesson.taskCount);
        const primaryAction = document.getElementById('dashboard-primary-action');
        const primaryLink = document.querySelector('.dashboard-primary-link');
        if (firstIncomplete) {
            primaryLink.href = `Lesson${firstIncomplete.id}.html`;
            primaryAction.textContent = firstIncomplete.progress.completed ? 'Continue learning' : 'Start learning';
        } else {
            primaryLink.href = 'Lesson1.html';
            primaryAction.textContent = 'Review your progress';
        }

        const lesson1Tasks = lessons[0].progress.tasks;
        const lesson2Tasks = lessons[1].progress.tasks;
        const medals = [
            { id: 'syntax', unlocked: lesson1Tasks[0] && lesson1Tasks[1] && lesson1Tasks[2] && lesson1Tasks[3] },
            { id: 'escape', unlocked: lesson1Tasks[4] && lesson1Tasks[5] },
            { id: 'ascii', unlocked: lesson1Tasks[7] && lesson1Tasks[8] },
            { id: 'master', unlocked: lesson1Tasks[9] },
            { id: 'variables', unlocked: lesson2Tasks[0] && lesson2Tasks[1] && lesson2Tasks[2] },
            { id: 'input', unlocked: lesson2Tasks[3] && lesson2Tasks[4] && lesson2Tasks[5] }
        ];
        const unlockedCount = medals.filter(medal => medal.unlocked).length;

        document.getElementById('dashboard-medal-count').textContent = unlockedCount;
        document.getElementById('dashboard-medal-summary').textContent = `${unlockedCount} unlocked`;
        document.querySelector('.dashboard-stat-card:nth-child(3) .dashboard-stat-total').textContent = ` / ${medals.length}`;
        for (const medal of medals) {
            const card = document.querySelector(`[data-medal="${medal.id}"]`);
            card.classList.toggle('is-unlocked', medal.unlocked);
            card.querySelector('.dashboard-medal-state').textContent = medal.unlocked ? 'EARNED' : 'LOCKED';
        }
    }

    render();
    window.addEventListener('storage', event => {
        if (event.key === LESSON1_KEY || event.key === LESSON2_KEY || event.key === null) render();
    });
    window.addEventListener('workbook-progress-updated', render);
    window.addEventListener('focus', render);
})();
