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
  const editor = document.getElementById("html-editor");
  const preview = document.getElementById("preview");
  editor.maxLength = 200000;
  function updatePreview() {
    preview.srcdoc = editor.value;
  }
  function changed() {
    window.dispatchEvent(new CustomEvent("web-work-change"));
  }
  fields.forEach((field) => {
    if (field.type !== "checkbox") field.maxLength = 20000;
    field.addEventListener("input", changed);
  });

  editor.value = plainStarter;
  updatePreview();
  editor.addEventListener("input", () => {
    updatePreview();
    changed();
  });

  window.webLesson = {
    read() {
      const result = {};
      fields.forEach((field) => {
        result[field.id] = field.type === "checkbox" ? String(field.checked) : field.value;
      });
      result["html-editor"] = editor.value;
      return result;
    },
    apply(values) {
      fields.forEach((field) => {
        if (field.type === "checkbox") field.checked = values[field.id] === "true";
        else field.value = values[field.id] || "";
        field.removeAttribute("aria-invalid");
        field.classList.remove("incorrect");
      });
      editor.value = Object.prototype.hasOwnProperty.call(values, "html-editor") ? values["html-editor"] : plainStarter;
      updatePreview();
      document.getElementById("homework-feedback").textContent = "";
    },
    empty() {
      return { "html-editor": plainStarter, "lesson-complete": "false" };
    }
  };

  function loadStarter(content) {
    if (editor.value !== content && !window.confirm("Replace your current HTML? Download it first if you want to keep a copy.")) return;
    editor.value = content;
    updatePreview();
    changed();
    editor.focus();
  }
  document.getElementById("load-plain").addEventListener("click", () => loadStarter(plainStarter));
  document.getElementById("load-tagged").addEventListener("click", () => loadStarter(taggedStarter));
  document.getElementById("export-html").addEventListener("click", () => {
    const blob = new Blob([editor.value], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-web-page.html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const expected = ["/h1", "p", "em", "/em", "/b", "/p", "color:red", "br", "100px", "/body"];
  const feedback = document.getElementById("homework-feedback");
  document.getElementById("homework-form").addEventListener("input", (event) => {
    if (event.target.matches("input")) {
      event.target.removeAttribute("aria-invalid");
      event.target.classList.remove("incorrect");
      feedback.textContent = "";
    }
  });
  document.getElementById("homework-form").addEventListener("submit", (event) => {
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

  document.getElementById("reset-lesson").addEventListener("click", () => {
    if (!window.confirm("Reset Lesson 1 answers, code and completion in your account? Download your HTML first if you need it.")) return;
    window.webLesson.apply(window.webLesson.empty());
    changed();
  });
})();
