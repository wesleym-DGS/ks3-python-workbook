(() => {
  "use strict";

  const LESSON_COUNT = 6;
  const XP_PER_LESSON = 100;
  const MILESTONES = [1, 3, 6];
  const root = document.querySelector(".web-rewards");
  if (!root) return;

  function summarize(completions) {
    const completed = Array.from({ length: LESSON_COUNT }, (_, index) => completions[index] === true)
      .filter(Boolean).length;
    return {
      completed,
      xp: completed * XP_PER_LESSON,
      milestones: MILESTONES.map(threshold => ({
        threshold,
        unlocked: completed >= threshold
      }))
    };
  }

  function render(state, completions, message) {
    if (!["loading", "signed-out", "unavailable", "ready"].includes(state)) {
      throw new Error(`Unknown web rewards state: ${state}`);
    }

    root.dataset.state = state;
    const status = document.getElementById("web-rewards-status");
    const xp = document.getElementById("web-rewards-xp");
    const completed = document.getElementById("web-rewards-completed");
    if (state !== "ready") {
      xp.textContent = "--";
      completed.textContent = "--";
      status.textContent = message || {
        loading: "Loading completion...",
        "signed-out": "Sign in to view your completion.",
        unavailable: "Rewards are unavailable until completion can be loaded."
      }[state];
      MILESTONES.forEach(threshold => {
        const milestone = root.querySelector(`[data-reward-milestone="${threshold}"]`);
        milestone.classList.remove("is-unlocked");
        milestone.querySelector(".web-milestone-state").textContent = "Locked";
      });
      return;
    }

    const summary = summarize(completions);
    xp.textContent = String(summary.xp);
    completed.textContent = String(summary.completed);
    status.textContent = message || "Completion loaded.";
    summary.milestones.forEach(milestone => {
      const card = root.querySelector(`[data-reward-milestone="${milestone.threshold}"]`);
      card.classList.toggle("is-unlocked", milestone.unlocked);
      card.querySelector(".web-milestone-state").textContent = milestone.unlocked ? "Unlocked" : "Locked";
    });
  }

  window.webRewards = Object.freeze({ summarize, render });
})();
