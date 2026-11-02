# Firefox branch audit — 2026-11-02

Reviewed merge 19824b3 from feat/firefox and its runtime files, document renderers, storage paths and packaging script.

## Network boundaries

No telemetry, analytics, remote OCR, or third-party API calls were found in the reviewed application source. Native VTOP navigation and authenticated document requests remain in use. The assignment summary fetch is pinned to https://vtop.vit.ac.in/vtop/examinations/processDigitalAssignment so a document base tag cannot redirect its CSRF token or authorized ID. Semester discovery already validates its native route against the VTOP origin.

PDF.js resources and workers are bundled locally. The bundled PDF modules match the installed PDF.js 6.5.438 files. PowerPoint rendering blocks external media, limits ZIP processing, and lazily renders a window of slides. The extension-page CSP allows connections only to packaged resources, blob URLs and data URLs; it excludes remote scripts, remote media and embedded objects. This policy applies to extension viewer pages, not VTOP's own application requests.

## Cache preservation and fixes

Firefox does not implement storage.session.setAccessLevel. The previous optional call could therefore leave the deadline cache inaccessible to content scripts and silently degrade it to page-only memory. A narrow background message relay now owns the session cache, validates the extension sender and VTOP URL, and stores only sanitized deadline summaries. Records are separated by signed-in account. Old unscoped entries are not reused.

Random 1–5 hour expiries, upload invalidation and page-reload reuse are preserved. Serialized, incremental updates prevent one tab's snapshot from overwriting another tab's courses or restoring another course's invalidated cache. There is no local/disk storage fallback for deadlines. If session storage fails, background memory remains usable while that background context lives. Existing semester and page-filter caches are unchanged.

## Packaging

The merged signed 1.1.0 XPI contained Git objects and nested old build archives. It is removed from source tracking; XPI files are now ignored. The builder uses an explicit runtime file list, clears stale output before copying, and checks that the ZIP contains no .git, node_modules, nested dist, XPI or ZIP entries. The package stays at version 1.2.0. Other Firefox ZIP versions are removed after a successful build.

## Verification scope

Automated checks exercise account separation, cache expiry, concurrent updates, upload invalidation, storage failures, and a complete page/client/background reload flow without content-script session storage. A foreign-base-tag regression verifies that assignment POSTs remain on VTOP. Viewer policy tests check the network policy and PowerPoint lazy rendering settings.

This audit does not include live Firefox rendering or a packet capture. It does not assert that VTOP itself or browser-managed requests contact no other services. Dependency-internal paths were reviewed statically; document parsing was not fuzz-tested.
