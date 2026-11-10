# Course styling guide

Use this guide when adding a course or changing a course index. The goal is to
keep every index page visually consistent with the Web course while preserving
each subject's strand colour and each lesson's purpose-specific layout.

## Shared design tokens and files

- Load `theme.js` before the page styles. It applies the shared `ks3_python_theme`
  preference to `<html data-theme="light|dark">`.
- Include the root `styles.css` for the shared workbook layout, controls, theme
  and strand variables.
- Use `course-index.css` on every course **index page**. Add the class
  `course-index-page` to the page's `<body>`.
- Use `workbook-course.css` only for pages rendered by `workbook-course.js`.
  Course lesson pages may load it, but should not load `course-index.css`; this
  keeps the Python challenge/editor layout and other lesson-specific layouts
  independent of index styling.
- Keep CSS cache-busting query strings consistent with the deployment
  convention already used in the page.

The shared strand colours are declared in `design-system.css`:

| Strand | `data-strand` | Accent |
|---|---|---|
| Digital Literacy | `digital-literacy` | red |
| Computer Science | `computer-science` | green |
| ICT | `ict` | blue |

Set the correct `data-strand` on the page body. Do not hard-code another
strand's colour for a course accent. Use `--workbook-accent` and
`--workbook-accent-light` for buttons, status markers, lesson numbers and
other accent details.

## Course index page structure

The index pages share the Web course's treatment: a full-width course-colour
banner, a consistent header, a centered content column, and responsive lesson
cards. Keep existing sign-in, progress, lesson links, theme selector, and
course-specific content/credit information intact.

### Static HTML course

Follow `web-course/index.html`:

- Include `theme.js`, the course's stylesheet(s), and then
  `course-index.css`.
- Set the body classes to include `course-index-page`, and set the correct
  `data-strand`.
- Use the `site-header`/`header-inner`/`brand`/`header-link` structure for
  navigation and controls.
- Put the course title, eyebrow, short introduction and primary action in
  `.hero > .shell`.
- Put the course pathway and lesson links inside `.shell.main-content`.
- Use `.lesson-grid` and `.lesson-card` for lesson cards.
- Include a skip link to the main element and keep visible focus styles.

### Shared workbook renderer

For Data Science, Python Sequences, or another course using
`workbook-course.js`:

- Provide course metadata and lesson data through that course folder's
  `content.js`.
- The course index body must include `dashboard-page course-index-page`, its
  `data-course`, and its strand.
- Keep `workbook-course.css` and `workbook-course.js` for shared dashboard and
  lesson rendering. The renderer outputs `.course-header`, `.course-main`,
  `.course-hero`, `.course-stats`, `.course-lesson-grid`, and achievements.
- Keep banner text inside `.course-hero-content`. This inner wrapper is
  centered to the same 1120px content width as the rest of the page, while the
  banner itself remains full-bleed.
- The index-only stylesheet intentionally overrides dashboard/hero appearance.
  Do not remove the `course-index-page` class or load index CSS on lesson pages.

### Existing Python dashboard

The original Python course has its own progress, rank and medal logic in
`python-course/dashboard.js`. Preserve its element IDs and markup hooks. Its
index uses `dashboard-welcome` as the full-width banner; keep its text and
primary resume action together inside `.dashboard-welcome > div`.
`dashboard-main` provides the centered content width.

## Layout, banners, and content widths

- Main content uses a centered maximum width of 1120px with 24px minimum
  gutters on desktop and 16px on small screens.
- Banner backgrounds extend edge-to-edge. Keep banner copy in a centered inner
  wrapper aligned to the main content's left edge; do not center-align course
  titles unless the reference design is intentionally changed for all course
  indexes.
- Prefer shared `.hero`, `.course-hero`, and `.dashboard-welcome` structures
  over course-specific positioning values.
- At tablet widths, lesson grids use two columns; at phone widths they use one.
- Avoid horizontal overflow, including from long course names, buttons, auth
  controls, and prerequisite text. Let heading and card text wrap.
- Use the shared `.course-catalog` only on the main chooser when organizing
  course choices by year group; its panels are not the course-index lesson
  pathway.

## Theme and readability

- Both System and explicit Light/Dark choices must work without changing the
  page structure or progress data.
- Keep body copy readable against its actual background. Banner headings are
  white; banner descriptions use a pale colour such as `#e0f0f7`, not body
  text colours intended for white cards.
- Check `.course-hero` against rules in `workbook-course.css`: theme-specific
  selectors there can override a generic index rule. Use sufficiently
  specific index selectors for the full-width gradient and banner copy.
- Cards, status labels, buttons, progress bars, and links must remain legible
  in both themes and retain the correct strand accent.
- Respect `prefers-reduced-motion` and use `:focus-visible` for keyboard
  focus.

## Responsive validation checklist

Before considering a new course index finished:

1. Open the index at a desktop width and confirm banner copy aligns with the
   main content left edge and the banner reaches both viewport edges.
2. Check mobile width: one-column cards, wrapped header controls, no
   horizontal scrolling, no clipped headings, and usable buttons.
3. Check Light and Dark themes, including banner description contrast, card
   body copy, status pills, and secondary controls.
4. Confirm the course accent matches its strand: Digital Literacy red,
   Computer Science green, ICT blue.
5. Confirm progress, achievements, lesson links, and auth states still work.
6. Confirm lesson pages do not load `course-index.css`, and validate their
   lesson-specific layout remains unchanged.
7. Run the existing targeted checks from `tests/package.json`, normally:
   `npm --prefix tests run test:links`,
   `npm --prefix tests run test:theme`,
   `npm --prefix tests run test:workbook-courses`, and
   `npm --prefix tests run test:python-dashboard` when relevant.

## Useful references

- Web course index reference: `web-course/index.html`
- Shared index styling: `course-index.css`
- Shared strand variables: `design-system.css`
- Shared course index/lesson renderer: `workbook-course.js`
- Shared renderer styling: `workbook-course.css`
- Original Python dashboard reference: `python-course/index.html`
- Current course chooser/grouping: root `index.html`
