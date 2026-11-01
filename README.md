# VTOP Command

A Chrome Manifest V3 extension for `https://vtop.vit.ac.in/vtop/*`.

## Install

From a source checkout, run `npm ci` followed by `npm run build` first. This creates the unpacked extension and ZIP in `dist/`.

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select the `dist/vtop-command` folder from this project (or extract `dist/vtop-command.zip` and select that folder).
3. Reload VTOP and sign in normally.
4. Press **⌘K** on macOS or **Ctrl+K** on Windows/Linux. The launcher shows the shortcut for your platform, and the key works on any keyboard layout. Clicking the launcher also opens the menu.

Type a page name, category, or alias such as `DA`, `CGPA`, `timetable`, or `attendance`. Use ↑/↓ and Enter, click a result, and press Escape to close. Dark mode is available from the menu's theme button or by searching `dark mode`.

Dark mode covers legacy boxes, nested accordions, tabs and date pickers. It also checks loaded text against its solid background and repairs low contrast, preserving status colors where possible. Unnamed white/gray panels receive a dark background. These changes follow dynamically loaded views and disappear in light mode; native inline styles and form values are preserved. Images, charts, gradients, disabled content and documents are excluded from automatic contrast correction.

## Default semester

On the first page with a semester dropdown (for example Time Table or Attendance), the extension prompts you to choose a default from VTOP's available options. The picker also works from any other page: it lists semesters VTOP has offered before, and if none are known yet (or the list is a day old) it loads them from Time Table in the background with the same read-only request VTOP's menu sends. If that fails, an **Open Time Table** button takes you there. Save it once to select that semester automatically on other matching pages, including after reloads and page replacements.

Use **⌘K/Ctrl+K → Choose default semester**, or the **Semester** button in the menu, to change it or turn automatic selection off. A manual change on the current page stays in place. If the saved semester isn't available on a page, the extension leaves that dropdown unchanged. Semester selection dispatches VTOP's native change event; no extra submit button is clicked.

The **Course Page** registered-course dropdown shows only courses from the saved default semester. Use the **Default semester / All semesters** buttons beside it to switch views. If no default is set, all courses stay available; if no courses match, a message explains how to browse all semesters.

## Form presets

Each visible supported form has a **Create preset** button beside its main page actions, or beside its submit/search controls when there is no page action row. The button hides when that form is hidden or removed. The editor follows the ⌘K/Ctrl+K light/dark theme and shows a separate copy of its editable fields, with a scrollable field area and persistent bottom controls. Fill that copy, leave **Automatically fill this form** on at the bottom, and choose **Save preset**. The saved values fill the matching form when you return, including after VTOP replaces the page. **Edit preset · On/Off** reopens it; turn the bottom toggle off and save to pause automatic filling while retaining the values. Cancel discards edits; Delete preset removes them.

Presets stay in `chrome.storage.local` on this device, scoped by page and form. They support text, dates, times, dropdowns, checkboxes, radio buttons and multiple selections. Login/password forms, hidden values, CAPTCHA/security codes, file uploads and submit buttons are excluded. Presets do not click submit controls. Manual changes remain until that form is reopened. An enabled preset takes priority over default semester and remembered course/exam filters for its saved fields.

Late Hour Request and Leave Request dropdowns support type-to-search in both the original form and the preset editor, with arrow-key/Enter selection and an empty-results state. Inside the Late Hour preset, selecting a school loads faculty; selecting a venue type and academic block loads venues; work choices load date/time options. These lookups run VTOP's native change handlers on the underlying form without clicking submit. Loading choices temporarily disables Save. Changing a parent clears stale dependent selections. Reopening a saved preset loads its parent choices in sequence before restoring dependent values. Cancel discards preset edits; lookup choices already loaded in the underlying form remain there. Other forms use currently available options. Forms outside VTOP's content area and forms with no supported editable fields have no preset button.

## Study tools and filter memory

The floating launcher is a small pill with the logo, your platform's shortcut, and the default **semester**. Attendance and assignment details appear directly in VTOP's own tables.

- **Attendance calculator:** open Attendance and load a semester. Each course row shows classes needed to reach 75%, or classes you can miss while staying at or above 75%, under the attendance percentage. The target is fixed at 75%. Estimates assume equally weighted future classes.
- **Assignment deadlines:** on **Digital Assignment Upload**, a **Pending** column (just before Dashboard) shows each unsubmitted assignment as a date chip, earliest first, coloured by urgency (overdue, due within two days, later). Hover or focus a chip to see the assignment and its countdown. Submitted assignments (a file has been uploaded) are hidden; a course with nothing left shows a dash. The extension reads each course's dashboard with the same read-only request VTOP's Dashboard button sends, one course at a time, and stops as soon as you open a dashboard yourself. Inside a dashboard, each pending due date shows its countdown. Deadlines use IST; date-only dates assume the end of the day. Each course's result is reused for a random 1–5 hours, so VTOP sees far fewer requests and refreshes don't line up. The cache lives in Chrome's session storage (memory only, cleared when Chrome closes) and is never written to disk. Opening a course's dashboard refreshes that course, and picking a file, submitting or clicking Upload on a dashboard forgets it so the next list view asks VTOP again.
- **Marks totals:** on **Marks**, each course's mark table ends with a **Total** row adding up Max. Mark, Weightage %, Scored Mark and Weightage Mark. Blank or non-numeric marks are skipped.
- **Remember filters:** enabled by default for identified course/exam query dropdowns, scoped by page and selected semester. Existing native change handlers load the results. Transactional forms, free-text fields, and unrelated dropdowns are excluded. Use **Turn off filter memory** or **Forget saved page filters** in the command menu.

The calculators read only loaded or fetched page data and keep it in memory. Unknown date formats are ignored rather than guessed.

## VTOP menus and Home

VTOP's top mega-menus close on **Esc** or a click outside them. **Home** in the command menu opens VTOP's home page through its own header link.

## CGPA calculator

Open Cmd+K / Ctrl+K and choose **CGPA calculator**. The command window expands,
loads Grade History through VTOP's navigation, then loads Time Table behind the
window. The saved default semester is used when available. You can switch the
semester inside the calculator.

Previous semester GPAs appear in horizontally scrolling tiles. Current courses
start at S, with **− S +** controls: minus lowers the grade (S → A → B → C → D → E → F),
and plus raises it. Matching grade predictions are remembered locally per semester
and course. Credits come directly from VTOP; course credits and historical results
are not editable.

NGCR / Non-graded Core Requirement courses remain visible as non-graded and are
excluded from SGPA and CGPA. S/A/B/C/D/E/F map to 10/9/8/7/6/5/0. F contributes
credits with zero grade points. Unknown grades and zero-credit courses are excluded.
Calculations use unrounded points and credits, rounding only the displayed GPA. The previous CGPA is checked against the CGPA VTOP shows in Grade History's CGPA Details; if the recomputed value ever differs beyond rounding, VTOP's figure is used for the projection. NGCR courses are recognised from Grade History's Course Distribution column and the Time Table's Category. Terms with only pass/fail results don't get a GPA tile.

Repeat-course, replacement, and special grading rules still need refinement. Nothing is submitted to your academic record.

## PDF viewer

Supported VTOP download links now open PDFs in an in-page viewer. Scroll continuously through all pages with your mouse wheel, trackpad, or keyboard. Type a page number to jump to it in the same scrollable document. Zoom with **⌘/Ctrl + scroll**, a trackpad pinch, **⌘/Ctrl + +/−**, or the toolbar; zoom keeps the point under the pointer in place, and **⌘/Ctrl + 0** or **Fit width** fits the page again. The preview uses the command menu's look and follows its light/dark setting; **Esc** closes it and **⌘K/Ctrl+K** jumps to the menu even while the PDF has focus. Pages render near the viewport and release distant canvases to limit memory use. **Download** saves the original PDF when you choose; **Close** returns to VTOP. Password-protected PDFs prompt inside the viewer.

The extension preserves VTOP's authenticated requests and supports same-origin PDF/download/view-file links, explicit PDF links with opaque URLs, JavaScript `window.open` download helpers, PDF blob/data URLs, download-only GET/POST forms, VTOP's `downloadFileWithProgress` and `vtopDownload` helpers, and location-style navigations to download endpoints (via the Navigation API). Icon-only download buttons count as download intent. Download intent is recognized from form IDs and the clicked PDF/download control as well as the URL, including Curriculum's `academics/curriculDown/` form. Non-PDF files retain download behavior. Shift-click a link to bypass the viewer. External document services are not intercepted.

PDF.js is bundled locally with its license; no document is sent to a third-party viewer. Documents and temporary PDF URLs stay in memory and are released when the viewer closes. Rendering failures leave the original Download option available.

## Navigation reliability

Automatic semester and remembered-filter changes wait for native page requests to finish. Command-menu navigation takes priority over queued changes on the page being left. Native VTOP handlers run in the page world, one action at a time. If an automatic action leaves a loading overlay behind after all requests finish, the extension clears only that action's leftover blocker; unrelated page blockers remain untouched.

## Logo and toolbar

VTOP Command uses an original V-shaped navigation-arrow logo. Pin the extension in Chrome and click its icon to open the command menu. On other sites, the toolbar icon opens VTOP in a new tab. The logo is also shown in the floating launcher and menu header.

## Read-only by design

The extension never writes to VTOP or your academic record. It reads pages with the same requests VTOP's own menu and buttons send: a single Time Table load when the semester picker has nothing remembered yet (cached for a day), and each course's dashboard on Digital Assignment Upload, one at a time (cached for a random 1–5 hours). It clicks only menu links, the home link and menu toggles, and changes only dropdowns that load a view. Automatic semester selection and filter memory skip registration, application, payment, feedback and similar pages. PDF previews replace the browser's own download request (sent once, never replayed); a POST is only taken over for an explicit download endpoint. Form inputs are filled only from presets you save yourself; file uploads and submit buttons are never touched.

## Behavior and privacy

- Discovers available native menu links on each open, including collapsed menus. No hardcoded route catalog.
- Uses existing VTOP click handlers for both Bootstrap 5 and legacy navigation. Opening a destination only activates its menu entry; it does not submit the destination's form.
- Categories and subsections distinguish repeated names, such as regular and arrear exam schedules.
- Detects menu replacement while open and resolves the current menu element before activation.
- Recent choices exist only in the current tab's memory. Only the theme, default semester, the list of semester names VTOP offers (up to 30), filter-memory setting, selected query dropdown values (up to 100), form presets, and CGPA predictions are saved to `chrome.storage.local`. Attendance counts and assignment deadlines are not persisted.
- No analytics, credential storage, third-party document uploads, or broad host permissions. PDF preview fetches the original VTOP download using the existing session.
- Theme styles are opt-in. Images and PDF pages retain original colors; the PDF viewer's chrome follows the menu theme.

## Validation

`npm ci`, then `npm test` and `npm run check`.

Read-only inspection of the signed-in Vellore portal found 116 menu destinations in nine groups. Dashboard, Time Table, Attendance, and Grade History were inspected. Tests use synthetic DOM fixtures with the observed menu attributes, both menu handler classes, and duplicate page names. No account data is included in the fixtures.

A partial signed-in Brave audit found low-contrast legacy status colors and light nested panels. The updated extension was loaded into Brave, but a VTOP `ERR_CONNECTION_RESET` interrupted the broader page audit. All-page and all-nested-view verification remains incomplete; see [the audit report](docs/dark-mode-audit.md) for findings and limits.

Live inspection in Brave verified the preset button and copied editor on Leave Request, including the bottom enable/disable switch. No live form values were entered or saved, and no live forms were submitted. Automated tests exercise preset restoration with synthetic fixtures; every VTOP page has not been checked.

## Files

- `search-select.js`: accessible type-to-search dropdown UI around native form controls.
- `form-presets.js`: per-form local presets, isolated editor, enable/disable switch and automatic restoration.
- `manifest.json`: VTOP-only content scripts and local preference permission.
- `brand.js`: shared logo, colour tokens and platform shortcut for the menu, presets and PDF viewer.
- `combobox.js`: searchable dropdown used inside the extension's own panels (command menu, CGPA calculator, preset editor).
- `navigation.js`: menu discovery, categories, aliases, and search ranking.
- `semesters.js`: semester dropdown discovery and matching across page labels.
- `content.js`: isolated Shadow DOM command palette, semester chip, preferences, and automatic semester selection.
- `dark-readability.js`: local contrast correction for loaded VTOP text and neutral light panels.
- `cgpa.js`: Grade History and Time Table course readers and SGPA/CGPA maths.
- `cgpa-ui.js`: CGPA calculator inside the command window.
- `enhancements.js`: attendance/deadline calculations, table readers, and filter identification.
- `enhancements-ui.js`: local filter restoration and its command-menu controls.
- `page-runtime.js`: native request tracking and page-handler coordination.
- `page-actions.js`: serialized automatic changes and navigation priority.
- `page-enhancements.js`: per-row Attendance calculators, inline assignment deadlines, and default/all course filtering.
- `pdf-bridge.js`: same-origin native download interception in the page world.
- `pdf-preview.js`: in-page preview shell, original Download option, and temporary document cleanup.
- `pdf-viewer.*`: local PDF.js renderer with pagination, zoom, and password support.
- `dark.css`: scoped VTOP dark theme.
