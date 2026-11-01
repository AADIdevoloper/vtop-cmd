(() => {
  'use strict';
  if (document.getElementById('vtop-command-root')) return;
  const { discover, search } = globalThis.VtopNavigation;
  const semesters = globalThis.VtopSemesters;
  const host = document.createElement('div');
  host.id = 'vtop-command-root';
  const shadow = host.attachShadow({ mode: 'open' });
  const logo = "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"logo\" aria-hidden=\"true\" width=\"22\" height=\"22\" viewBox=\"0 0 128 128\" fill=\"none\">\n  <defs><linearGradient id=\"vtop-logo-bg\" x1=\"12\" y1=\"8\" x2=\"116\" y2=\"128\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#244B86\"/><stop offset=\"1\" stop-color=\"#101B34\"/></linearGradient></defs>\n  <rect x=\"2\" y=\"2\" width=\"124\" height=\"124\" rx=\"30\" fill=\"url(#vtop-logo-bg)\"/>\n  <rect x=\"3\" y=\"3\" width=\"122\" height=\"122\" rx=\"29\" stroke=\"#86B5FF\" stroke-opacity=\".22\" stroke-width=\"2\"/>\n  <path d=\"M29 40L59 88L92 39\" stroke=\"#F4F8FF\" stroke-width=\"11\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <path d=\"M78 32H97V51\" stroke=\"#61E1E3\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n</svg>";
  shadow.innerHTML = `
    <style>
      :host{all:initial;color-scheme:light;--surface:#fff;--text:#182438;--muted:#748093;--line:#e8ecf2;--hover:#f0f4fb;--accent:#3664d9;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text)}
      :host([data-dark]){color-scheme:dark;--surface:#171d29;--text:#edf1fa;--muted:#97a4bb;--line:#2a3344;--hover:#242f46;--accent:#a9beff}
      *{box-sizing:border-box}button,input{font:inherit}button{cursor:pointer}button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
      .dock{position:fixed;right:22px;bottom:22px;z-index:2147483645;display:flex;gap:8px;align-items:center;padding:10px 15px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--text);box-shadow:0 4px 24px #0002;font-weight:600}
      .logo{display:block;flex-shrink:0}.brand{display:flex;align-items:center;gap:9px}.brand .logo{width:24px;height:24px}.launcher{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--text);padding:0;font-weight:600}.semester-chip{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid var(--line);border-radius:20px;padding:4px 9px;background:var(--hover);color:var(--accent);font-size:11px}
      kbd{font:11px/1.5 inherit;color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:2px 5px;white-space:nowrap}
      dialog{padding:0;margin:12vh auto 0;width:min(620px,calc(100vw - 28px));max-height:78vh;border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--text);box-shadow:0 24px 100px #0005;overflow:hidden}
      dialog::backdrop{background:#10182788;backdrop-filter:blur(5px)}
      header{display:flex;gap:12px;align-items:center;padding:20px 22px 12px}.brand{font-size:11px;font-weight:750;letter-spacing:2px;color:var(--muted)}.spacer{flex:1}
      .theme,.close,.semester-button{border:1px solid var(--line);border-radius:8px;color:var(--muted);background:transparent;padding:5px 8px;font-size:12px}
      [hidden]{display:none!important}.semester-settings{padding:8px 22px 24px}.semester-settings h2{font-size:20px;margin:8px 0}.semester-settings p{color:var(--muted);font-size:13px}.semester-settings label{display:block;margin:18px 0 8px}.semester-settings select{width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);font:inherit}.semester-actions{display:flex;gap:10px;margin-top:20px}.semester-actions button{padding:9px 13px;border:1px solid var(--line);border-radius:8px;background:var(--hover);color:var(--text)}.semester-actions button:disabled{opacity:.5;cursor:default}.semester-button{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .search{display:flex;align-items:center;gap:14px;margin:0 22px 16px}.search span{font-size:24px;color:var(--accent)}input{width:100%;padding:7px 0;border:0;outline:none;background:transparent;color:var(--text);font-size:21px;letter-spacing:-.5px}input::placeholder{color:var(--muted)}
      .meta{display:flex;justify-content:space-between;padding:10px 22px;border-top:1px solid var(--line);font-size:11px;color:var(--muted);letter-spacing:.5px}
      .results{padding:0 10px 10px;max-height:46vh;overflow-y:auto;overscroll-behavior:contain}.option{display:flex;align-items:center;gap:13px;border-radius:10px;padding:12px;cursor:pointer;scroll-margin:8px}.option[aria-selected=true]{background:var(--hover)}.icon{display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--line);border-radius:9px;color:var(--muted);flex-shrink:0}.label{font-size:14px;font-weight:550}.category{font-size:11px;color:var(--muted);margin-top:2px}.arrow{margin-left:auto;color:var(--accent);opacity:0}.option[aria-selected=true] .arrow{opacity:1}.empty{padding:30px 14px;text-align:center;color:var(--muted)}
      footer{display:flex;gap:14px;padding:13px 22px;border-top:1px solid var(--line);color:var(--muted);font-size:11px}.local{margin-left:auto}
      @media(max-width:480px){.dock{right:12px;bottom:12px}.local{display:none}dialog{margin-top:7vh}header{padding-top:16px}input{font-size:18px}}
      @media(prefers-reduced-motion:no-preference){dialog[open]{animation:arrive .13s ease-out}@keyframes arrive{from{transform:translateY(-8px);opacity:0}to{transform:translateY(0);opacity:1}}}
    </style>
    <div class="dock"><button class="launcher" type="button" aria-label="Open VTOP command menu">${logo} <span>Jump to…</span><kbd class="shortcut"></kbd></button><button class="semester-chip" type="button" aria-label="Change default semester">Choose semester</button></div>
    <dialog aria-label="VTOP command menu">
      <header><span class="brand">${logo}VTOP / COMMAND</span><span class="spacer"></span><button class="semester-button" type="button" aria-label="Choose default semester">Semester</button><button class="theme" type="button"></button><button class="close" type="button" aria-label="Close command menu">Esc</button></header>
      <section class="semester-settings" hidden aria-labelledby="semester-title">
        <h2 id="semester-title">Choose your default semester</h2>
        <p class="semester-help">We'll select this semester whenever a VTOP page asks for one. You can still change it on any page.</p>
        <label for="default-semester">Default semester</label><select id="default-semester"></select>
        <p class="semester-status" role="status"></p>
        <div class="semester-actions"><button class="save-semester" type="button">Save default</button><button class="clear-semester" type="button">Turn off</button><button class="skip-semester" type="button">Back</button></div>
      </section>
      <div class="search"><span aria-hidden="true">⌕</span><input aria-label="Search VTOP pages" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="results" placeholder="Where do you want to go?" autocomplete="off" spellcheck="false"></div>
      <div class="meta"><span class="section">ALL PAGES</span><span class="count" role="status" aria-live="polite"></span></div>
      <div class="results" id="results" role="listbox" aria-label="VTOP pages"></div>
      <footer><span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span class="local">On your device. In your flow.</span></footer>
    </dialog>`;
  document.documentElement.append(host);
  const dialog = shadow.querySelector('dialog');
  const input = shadow.querySelector('input');
  const list = shadow.querySelector('.results');
  let commands = [], filtered = [], selected = 0, recent = [], previousFocus, dark = false;
  let defaultSemester = null, preferencesReady = false, prompted = false, semesterView = false;
  let appliedSemesters = new WeakMap();
  const knownSemesters = new Map();
  const semesterPicker = shadow.querySelector('#default-semester');
  let semesterChoices = [];
  function setSemesterPreference(value) {
    defaultSemester = value?.value && value?.label ? { value: String(value.value), label: String(value.label) } : null;
    appliedSemesters = new WeakMap();
    shadow.querySelector('.semester-button').textContent = defaultSemester?.label || 'Semester';
    shadow.querySelector('.semester-button').title = defaultSemester ? `Default: ${defaultSemester.label}` : 'Choose default semester';
    shadow.querySelector('.semester-chip').textContent = defaultSemester?.label.replace(/\s+Semester/i, '') || 'Choose semester';
    shadow.querySelector('.semester-chip').title = defaultSemester ? `Default semester: ${defaultSemester.label}. Click to change.` : 'Choose default semester';
  }
  function saveSemesterPreference(value) {
    setSemesterPreference(value);
    try { chrome.storage.local.set({ defaultSemester })?.catch(() => {}); } catch { /* Extension reloaded. */ }
    scanSemesters();
  }
  function showSemesterSettings() {
    open(); host.dispatchEvent(new CustomEvent('vtop-cgpa-hide')); semesterView = true;
    for (const selector of ['.search', '.meta', '.results', 'footer']) shadow.querySelector(selector).hidden = true;
    shadow.querySelectorAll('p.empty').forEach(p => p.remove());
    shadow.querySelector('.semester-settings').hidden = false;
    const available = semesters.discover(document).flatMap(semesters.options);
    for (const choice of available) knownSemesters.set(semesters.key(choice.label), choice);
    semesterChoices = [...knownSemesters.values()];
    semesterPicker.replaceChildren(new Option('Choose a semester…', ''));
    semesterChoices.forEach((choice, index) => semesterPicker.add(new Option(choice.label, String(index))));
    const current = semesterChoices.findIndex(choice => defaultSemester && semesters.key(choice.label) === semesters.key(defaultSemester.label));
    semesterPicker.value = current < 0 ? '' : String(current);
    semesterPicker.disabled = !semesterChoices.length;
    shadow.querySelector('.save-semester').disabled = semesterPicker.value === '';
    shadow.querySelector('.clear-semester').hidden = !defaultSemester;
    shadow.querySelector('.semester-status').textContent = semesterChoices.length ?
      'Applied on matching pages. If unavailable, the page stays unchanged.' :
      'Open Time Table, Attendance, or another page with a semester dropdown, then choose your default here.';
    semesterPicker.focus();
  }
  function showPages() {
    host.dispatchEvent(new CustomEvent('vtop-cgpa-hide'));
    semesterView = false;
    shadow.querySelector('.semester-settings').hidden = true;
    for (const selector of ['.search', '.meta', '.results', 'footer']) shadow.querySelector(selector).hidden = false;
  }
  function scanSemesters() {
    if (!preferencesReady) return;
    const selectors = semesters.discover(document);
    for (const select of selectors) {
      const choices = semesters.options(select);
      for (const choice of choices) knownSemesters.set(semesters.key(choice.label), choice);
      if (!defaultSemester || !choices.length) continue;
      const signature = JSON.stringify(choices);
      if (appliedSemesters.get(select) === signature) continue;
      const choice = semesters.match(select, defaultSemester);
      if (!choice) continue;
      // Record before dispatch: VTOP's handler may synchronously replace options.
      appliedSemesters.set(select, signature);
      if (select.value === choice.value) continue;
      if (globalThis.VtopPageActions) globalThis.VtopPageActions.change(select, choice.value);
      else { select.value = choice.value; select.dispatchEvent(new Event('change', { bubbles: true })); }
    }
    if (!defaultSemester && !prompted && knownSemesters.size && !dialog.open) {
      prompted = true; showSemesterSettings();
    }
  }
  shadow.querySelector('.shortcut').textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';

  function setTheme(value) {
    dark = value;
    document.documentElement.toggleAttribute('data-vtop-command-dark', dark);
    host.toggleAttribute('data-dark', dark);
    shadow.querySelector('.theme').textContent = dark ? '☀ Light mode' : '☾ Dark mode';
    shadow.querySelector('.theme').setAttribute('aria-pressed', String(dark));
  }
  function toggleTheme() {
    setTheme(!dark);
    try { chrome.storage.local.set({ darkMode: dark })?.catch(() => {}); } catch { /* Extension reloaded. */ }
  }
  setTheme(false);
  try {
    chrome.storage.local.get(['darkMode', 'defaultSemester']).then(settings => {
      setTheme(settings.darkMode === true); setSemesterPreference(settings.defaultSemester);
      if (settings.defaultSemester === null) prompted = true;
      preferencesReady = true; scanSemesters();
    }).catch(() => { preferencesReady = true; scanSemesters(); });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.darkMode) setTheme(changes.darkMode.newValue === true);
      if (area === 'local' && changes.defaultSemester) { setSemesterPreference(changes.defaultSemester.newValue); scanSemesters(); }
    });
  } catch { preferencesReady = true; setTimeout(scanSemesters, 0); }

  function allCommands() {
    return [...commands,
      { id: 'vtop:cgpa', label: 'CGPA calculator', category: 'Study tools', keywords: 'grades gpa credits predict semester', action: () => {
        semesterView = true;
        for (const selector of ['.search', '.meta', '.results', 'footer', '.semester-settings']) shadow.querySelector(selector).hidden = true;
        shadow.querySelectorAll('p.empty').forEach(p => p.remove());
        host.dispatchEvent(new CustomEvent('vtop-cgpa-open', { detail: { defaultSemester } }));
      } },
      { id: 'vtop:semester', label: 'Choose default semester', category: defaultSemester?.label || 'Preferences', keywords: 'semester term default automatic', action: showSemesterSettings },
      { id: 'vtop:tools', label: 'Assignment countdown & page filters', category: 'Study tools', keywords: 'due deadline digital assignment filters remember', action: () => host.dispatchEvent(new CustomEvent('vtop-tools-open')) },
      { id: 'vtop:theme', label: 'Toggle dark mode', category: 'Appearance', keywords: 'light theme night', action: toggleTheme }];
  }
  function updateSelection() {
    [...list.children].forEach((row, index) => row.setAttribute('aria-selected', String(index === selected)));
    const row = list.children[selected];
    if (row?.getAttribute('role') === 'option') {
      input.setAttribute('aria-activedescendant', row.id);
      row.scrollIntoView?.({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function render() {
    filtered = search(allCommands(), input.value, recent);
    selected = 0;
    list.replaceChildren();
    shadow.querySelector('.section').textContent = input.value.trim() ? 'SEARCH RESULTS' : recent.length ? 'RECENT & ALL PAGES' : 'ALL PAGES';
    shadow.querySelector('.count').textContent = `${filtered.length} ${filtered.length === 1 ? 'result' : 'results'}`;
    if (!commands.length && !input.value) {
      const message = document.createElement('p'); message.className = 'empty';
      message.textContent = 'Sign in to VTOP to search its pages. Appearance is available below.';
      list.before(message); shadow.querySelectorAll('.meta ~ p.empty').forEach((p, i) => { if (i) p.remove(); });
    } else shadow.querySelectorAll('p.empty').forEach(p => p.remove());
    if (!filtered.length) {
      const empty = document.createElement('div'); empty.className = 'empty';
      empty.textContent = 'No pages found. Try a page name or category.'; list.append(empty);
    }
    filtered.forEach((command, index) => {
      const row = document.createElement('div'); row.className = 'option'; row.id = `vtop-option-${index}`;
      row.setAttribute('role', 'option'); row.setAttribute('aria-selected', String(index === selected));
      const icon = document.createElement('span'); icon.className = 'icon'; icon.textContent = command.action ? '◐' : '↗'; icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('div');
      const label = document.createElement('div'); label.className = 'label'; label.textContent = command.label;
      const category = document.createElement('div'); category.className = 'category'; category.textContent = command.category;
      const arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '↵'; arrow.setAttribute('aria-hidden', 'true');
      text.append(label, category); row.append(icon, text, arrow);
      row.addEventListener('pointermove', () => { selected = index; updateSelection(); });
      row.addEventListener('mousedown', event => event.preventDefault());
      row.addEventListener('click', () => activate(index)); list.append(row);
    });
    list.scrollTop = 0; updateSelection();
  }
  function open() {
    if (dialog.open) return;
    previousFocus = shadow.activeElement || document.activeElement;
    showPages(); commands = discover(document); input.value = ''; render();
    dialog.showModal(); input.setAttribute('aria-expanded', 'true'); input.focus();
  }
  function close() { if (dialog.open) dialog.close(); }
  host.addEventListener('vtop-cgpa-back', () => { showPages(); render(); input.focus(); });
  function activate(index) {
    const command = filtered[index]; if (!command) return;
    if (command.action) { command.action(); return; }
    // Re-resolve after AJAX replacements. Never replay a stale route or submit a page form.
    const current = discover(document).find(item => item.id === command.id);
    if (!current) { commands = discover(document); render(); return; }
    recent = [command.id, ...recent.filter(id => id !== command.id)].slice(0, 8);
    close();
    if (globalThis.VtopPageActions) globalThis.VtopPageActions.navigate(() => discover(document).find(item => item.id === command.id)?.element);
    else current.element.click();
  }
  try {
    chrome.runtime.onMessage.addListener((message, sender, respond) => {
      if (message?.type !== 'vtop-toggle-command-menu') return;
      const tools = shadow.querySelector('.tools-dialog'); if (tools?.open) tools.close();
      const pdf = document.getElementById('vtop-pdf-preview')?.shadowRoot?.querySelector('dialog'); if (pdf?.open) pdf.close();
      dialog.open ? close() : open(); respond({ opened: dialog.open });
    });
  } catch { /* Preview without the extension runtime. */ }
  shadow.querySelector('.launcher').addEventListener('click', open);
  shadow.querySelector('.semester-chip').addEventListener('click', showSemesterSettings);
  shadow.querySelector('.close').addEventListener('click', close);
  shadow.querySelector('.theme').addEventListener('click', toggleTheme);
  shadow.querySelector('.semester-button').addEventListener('click', showSemesterSettings);
  semesterPicker.addEventListener('change', () => { shadow.querySelector('.save-semester').disabled = semesterPicker.value === ''; });
  shadow.querySelector('.save-semester').addEventListener('click', () => {
    const choice = semesterChoices[Number(semesterPicker.value)];
    if (semesterPicker.value === '' || !choice) return;
    prompted = true; saveSemesterPreference(choice); close();
  });
  shadow.querySelector('.clear-semester').addEventListener('click', () => { prompted = true; saveSemesterPreference(null); close(); });
  shadow.querySelector('.skip-semester').addEventListener('click', () => { prompted = true; showPages(); render(); input.focus(); });
  dialog.addEventListener('close', () => { host.dispatchEvent(new CustomEvent('vtop-cgpa-hide')); input.setAttribute('aria-expanded', 'false'); if (previousFocus?.isConnected) previousFocus.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); } });
  input.addEventListener('input', render);
  dialog.addEventListener('keydown', event => {
    if (event.isComposing || semesterView || event.target !== input) return;
    if (['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      if (event.key === 'Enter') activate(selected);
      else if (filtered.length) { selected = (selected + (event.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length; updateSelection(); }
    }
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k' && !event.isComposing && !event.repeat) {
      const tools = shadow.querySelector('.tools-dialog'); if (tools?.open) tools.close();
      event.preventDefault(); event.stopImmediatePropagation(); dialog.open ? close() : open();
    }
  }, true);
  // VTOP swaps page fragments in place. Keep discovery current while the menu is open.
  let pending;
  new MutationObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      scanSemesters();
      if (dialog.open && !semesterView) { commands = discover(document); render(); }
    }, 100);
    if (!host.isConnected) document.documentElement.append(host);
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-url', 'data-status', 'aria-disabled', 'disabled', 'value', 'id', 'name'] });
})();
