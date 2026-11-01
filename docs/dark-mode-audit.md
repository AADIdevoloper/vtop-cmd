# Dark-mode audit — 2 November 2026

Inspection used the user's signed-in Brave session and the installed unpacked extension. Only navigation and read-only detail views were used; no application, registration, payment, upload or account-change action was submitted. Private records, screenshots, tokens and document contents are not included in this report.

## Findings

| Page or component | Observed problem | Shared repair |
| --- | --- | --- |
| Time Table | Dark green registration statuses on dark rows | Measured foreground contrast correction, retaining green |
| Course Page Consolidated | Pale legend text on white panels; white nested accordions | Dark legends and accordions |
| Facility Registration | Green instructions at 3.15:1; red text below 4.5:1 | Readable green/red foregrounds |
| HOD and Dean Info | Legacy white `.box` surface | Dark legacy boxes |
| Class Attendance and its detail table | Red note at 4.04:1 | Readable red foreground |
| Co-Extra Curricular and Academics Calendar | Pale query labels on white boxes at 1.25:1 | Dark legacy boxes |
| Course Registration Allocation | Pale legend on white at 1.25:1 and dim red text | Dark legends and readable status text |
| Project Mark View and Graduated information | Red text at 4.04:1 | Readable red foreground |
| Apaar ID Upload | Green outline button text at 3.57:1 | Readable button foreground |
| Proctor Message | Pale heading on light background at 1.03:1; dim green/red text | Neutral light-panel correction and readable foregrounds |

Ratios describe individual styles found before correction, using computed foreground colors and composited solid ancestor backgrounds. The target for corrected text is at least 4.5:1. They are not an accessibility certification of entire pages.

## Verification and limits

- The updated installed extension was reloaded in Brave; the new readability content script and dark-mode state were confirmed active. The Home page was also inspected visually after reload.
- Automated tests cover contrast math, transparent text, colored badge backgrounds, neutral panel detection, dynamic nested content and restoration of native colors in light mode. The complete test suite, syntax checks and packaged build are checked separately.
- A broader navigation audit was interrupted by VTOP returning `ERR_CONNECTION_RESET`. Earlier batches that repeated stale page contents were discarded. A full pass over all 116 navigation destinations was **not completed**.
- Attendance's read-only course detail table was opened. Other course dashboards, expanded accordions, archived course material, calendar dialogs and every possible nested form still require a complete live pass. Empty/unavailable pages and pages awaiting a query are not evidence that their results were checked.
- Security/account-secret pages were excluded. No transactional form was submitted to reveal a deeper screen.
- Automatic contrast correction skips images, gradients, charts, disabled/faded content and embedded documents. Cross-origin frames are outside this extension's VTOP-only scope.

The user asked to finish with the checks completed so far after the connection failure. These repairs address the reproduced styles; remaining live coverage is explicitly open.
