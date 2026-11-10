(() => {
  "use strict";

  const plainStarter = `Developing for the Web
This website will provide you with information on the following:
Using HTML to produce the pages of your website
Implementing CSS to format your web pages
How search engines work
Improving search results
Hypertext Markup Language (HTML) and Cascading Style Sheets (CSS) are used to create and format pages of a website.
CSS allows you to make formatting changes to your website in one document. The 'instructions' in this document are then
applied to your web pages.`;
  const taggedStarter = `<!DOCTYPE html>
<html>
<body>
<h1>Developing for the Web</h1>
<p>This website will provide you with information on the following:</p>
<ul>
<li>Using HTML to produce the pages of your website</li>
<li>Implementing CSS to format your web pages</li>
<li>How search engines work</li>
<li>Improving search results</li>
</ul>
<p><em>Hypertext Markup Language</em> <b>(HTML)</b> and <em>Cascading Style Sheets</em> <b>(CSS)</b> are used to create and format pages of a website.
CSS allows you to make formatting changes to your website in one document. The 'instructions' in this document are then
applied to your web pages.</p>
</body>
</html>`;
  const fields = document.querySelectorAll("[data-save]");
  const fieldStarters = new Map([...fields].map((field) => [field.id, field.value]));
  const editor = document.getElementById("html-editor");
  const preview = document.getElementById("preview");
  const cssEditor = document.getElementById("css-editor");
  const isLessonOne = document.body.dataset.lesson === "1";
  if (editor) editor.maxLength = 200000;
  if (cssEditor) cssEditor.maxLength = 200000;
  const editorStarter = editor ? (isLessonOne ? plainStarter : (editor.value || editor.textContent)) : "";
  const cssStarter = cssEditor ? (cssEditor.value || cssEditor.textContent) : "";

  function updatePreview() {
    if (!preview) return;
    if (!editor) {
      preview.srcdoc = "";
      return;
    }
    let html = editor.value;
    if (cssEditor) {
      html = html.replace(/<link\b(?=[^>]*\bhref=["']style\.css["'])[^>]*>/i, "");
    }
    if (cssEditor && cssEditor.value) {
      const style = `<style>${cssEditor.value}</style>`;
      html = /<\/head\s*>/i.test(html)
        ? html.replace(/<\/head\s*>/i, `${style}</head>`)
        : `${style}${html}`;
    }
    preview.srcdoc = html;
  }

  function changed() {
    window.dispatchEvent(new CustomEvent("web-work-change"));
  }

  fields.forEach((field) => {
    if (field.type !== "checkbox") field.maxLength = 20000;
    field.addEventListener("input", changed);
  });

  if (editor) editor.value = editorStarter;
  updatePreview();
  editor?.addEventListener("input", () => {
    updatePreview();
    changed();
  });
  cssEditor?.addEventListener("input", () => {
    updatePreview();
    changed();
  });

  window.webLesson = {
    read() {
      const result = {};
      fields.forEach((field) => {
        result[field.id] = field.type === "checkbox" ? String(field.checked) : field.value;
      });
      if (editor) result["html-editor"] = editor.value;
      if (cssEditor) result["css-editor"] = cssEditor.value;
      return result;
    },
    apply(values) {
      fields.forEach((field) => {
        if (field.type === "checkbox") field.checked = values[field.id] === "true";
        else field.value = Object.prototype.hasOwnProperty.call(values, field.id)
          ? values[field.id] : (fieldStarters.get(field.id) || "");
        field.removeAttribute("aria-invalid");
        field.classList.remove("incorrect");
      });
      if (editor) editor.value = Object.prototype.hasOwnProperty.call(values, "html-editor") ? values["html-editor"] : editorStarter;
      if (cssEditor) cssEditor.value = Object.prototype.hasOwnProperty.call(values, "css-editor") ? values["css-editor"] : cssStarter;
      updatePreview();
      const feedback = document.getElementById("homework-feedback");
      if (feedback) feedback.textContent = "";
      window.dispatchEvent(new CustomEvent("web-work-applied"));
    },
    empty() {
      const empty = { "lesson-complete": "false" };
      if (editor) empty["html-editor"] = editorStarter;
      if (cssEditor) empty["css-editor"] = cssStarter;
      fields.forEach((field) => {
        empty[field.id] = field.type === "checkbox" ? "false" : (fieldStarters.get(field.id) || "");
      });
      return empty;
    }
  };

  function loadStarter(content) {
    if (!editor) return;
    if (editor.value !== content && !window.confirm("Replace your current HTML? Download it first if you want to keep a copy.")) return;
    editor.value = content;
    updatePreview();
    changed();
    editor.focus();
  }
  document.getElementById("load-plain")?.addEventListener("click", () => loadStarter(plainStarter));
  document.getElementById("load-tagged")?.addEventListener("click", () => loadStarter(taggedStarter));
  function downloadText(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.getElementById("export-html")?.addEventListener("click", (event) => {
    const filename = event.currentTarget.dataset.filename || `my-web-page-lesson-${document.body.dataset.lesson}.html`;
    downloadText(editor.value, filename, "text/html;charset=utf-8");
  });
  document.querySelectorAll("[data-download-textarea]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = document.getElementById(button.dataset.downloadTextarea);
      if (!source) throw new Error(`Missing export source: ${button.dataset.downloadTextarea}`);
      downloadText(source.value, button.dataset.filename || "web-page.html", "text/html;charset=utf-8");
    });
  });
  document.getElementById("export-css")?.addEventListener("click", (event) => {
    const filename = event.currentTarget.dataset.filename || "style.css";
    downloadText(cssEditor.value, filename, "text/css;charset=utf-8");
  });

  const expected = ["/h1", "p", "em", "/em", "/b", "/p", "color:red", "br", "100px", "/body"];
  const feedback = document.getElementById("homework-feedback");
  document.getElementById("homework-form")?.addEventListener("input", (event) => {
    if (event.target.matches("input")) {
      event.target.removeAttribute("aria-invalid");
      event.target.classList.remove("incorrect");
      if (feedback) feedback.textContent = "";
    }
  });
  document.getElementById("homework-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const incorrect = [];
    expected.forEach((answer, index) => {
      const field = document.getElementById(`gap-${index + 1}`);
      const actual = field.value.trim().toLowerCase().replace(/\s+/g, "").replace(/;$/, "");
      const correct = actual === answer;
      field.setAttribute("aria-invalid", String(!correct));
      field.classList.toggle("incorrect", !correct);
      if (!correct) incorrect.push(index + 1);
    });
    feedback.textContent = incorrect.length
      ? `${expected.length - incorrect.length} of ${expected.length} correct. Check gaps ${incorrect.join(", ")} and try again. Closing tags need a slash.`
      : "All 10 gaps are correct. Well done!";
  });

  const searchInput = document.getElementById("search-query");
  const searchResults = document.getElementById("search-results");
  if (searchInput && searchResults) {
    const emptyMessage = document.getElementById("search-empty");
    const tokenize = (value) => value.toLowerCase().match(/[a-z0-9]+/g) || [];
    const rankResults = () => {
      const terms = tokenize(searchInput.value);
      const items = [...searchResults.querySelectorAll("[data-search-title]")].map((item, index) => {
        const titleTerms = tokenize(item.dataset.searchTitle);
        const textTerms = tokenize(`${item.dataset.searchTitle} ${item.dataset.searchText || ""}`);
        const score = terms.reduce((total, term) => total + (titleTerms.includes(term) ? 3 : 0) + (textTerms.includes(term) ? 1 : 0), 0);
        return { item, index, score, matches: terms.every((term) => textTerms.includes(term)) };
      });
      items.forEach(({ item, matches }) => { item.hidden = !matches; });
      items.sort((a, b) => b.score - a.score || a.index - b.index)
        .forEach(({ item }) => searchResults.appendChild(item));
      if (emptyMessage) emptyMessage.hidden = items.some(({ matches }) => matches);
    };
    searchInput.addEventListener("input", rankResults);
    window.addEventListener("web-work-applied", rankResults);
    rankResults();
  }

  document.getElementById("reset-lesson")?.addEventListener("click", () => {
    const location = document.body.dataset.localPreview === "true" ? "in this browser" : "in your account";
    if (!window.confirm(`Reset Lesson ${document.body.dataset.lesson} answers, code and completion ${location}? Download your HTML first if you need it.`)) return;
    window.webLesson.apply(window.webLesson.empty());
    changed();
  });
})();
