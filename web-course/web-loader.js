(() => {
  "use strict";

  const isLocal = location.protocol === "file:" ||
    (["http:", "https:"].includes(location.protocol) &&
      ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname));

  if (!isLocal) {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "web-cloud.js";
    document.head.appendChild(script);
    return;
  }

  document.body.dataset.localPreview = "true";
  const status = document.getElementById("auth-status");
  const saveStatus = document.getElementById("storage-status");
  const lesson = document.body.dataset.lesson;
  const key = `web-course-local-preview:lesson${lesson}`;
  const notice = "Local preview: no sign-in or cloud sync. Work stays in this browser and may be lost if its data is cleared.";
  status.textContent = "Local preview - not signed in";
  if (saveStatus) saveStatus.textContent = notice;

  function reportFailure(action, error) {
    console.error(`Local preview could not ${action}.`, error);
    const message = `Local preview could not ${action}. Work may not be retained; download your HTML before leaving.`;
    status.textContent = message;
    if (saveStatus) {
      saveStatus.textContent = message;
      saveStatus.classList.add("warning");
    }
  }

  if (lesson) {
    let canSave = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const values = JSON.parse(saved);
        if (!values || typeof values !== "object" || Array.isArray(values)) {
          throw new Error("The saved local preview is not a valid lesson record.");
        }
        window.webLesson.apply(values);
      }
    } catch (error) {
      canSave = false;
      reportFailure("load saved work", error);
    }
    window.addEventListener("web-work-change", () => {
      if (!canSave) {
        reportFailure("save work because the existing local record could not be read", new Error("Local storage is unavailable or invalid."));
        return;
      }
      try {
        localStorage.setItem(key, JSON.stringify(window.webLesson.read()));
        status.textContent = "Local preview - not signed in";
        saveStatus.textContent = notice;
        saveStatus.classList.remove("warning");
      } catch (error) {
        reportFailure("save work in this browser", error);
      }
    });
  } else {
    const courseNotice = document.querySelector(".main-content > .notice");
    if (courseNotice) courseNotice.textContent = notice;
    try {
      document.querySelectorAll("[data-lesson-card]").forEach(card => {
        const saved = localStorage.getItem(`web-course-local-preview:lesson${card.dataset.lessonCard}`);
        if (saved !== null && JSON.parse(saved)["lesson-complete"] === "true") {
          card.querySelector(".pill").textContent = "Completed locally";
        }
      });
    } catch (error) {
      reportFailure("load local completion", error);
    }
  }
  document.body.classList.remove("auth-pending");
})();
