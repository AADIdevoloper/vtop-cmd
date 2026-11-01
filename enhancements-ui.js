(() => {
  'use strict';
  const host = document.getElementById('vtop-command-root');
  if (!host?.shadowRoot || !globalThis.VtopEnhancements) return;
  const shadow = host.shadowRoot, api = globalThis.VtopEnhancements;
  const style = document.createElement('style');
  style.textContent = `
    .tools-dialog{overflow:auto}.tools-body{padding:0 22px 24px}.tools-body h2{font-size:19px;margin:14px 0 8px}.tools-body p{color:var(--muted);font-size:12px}.tools-body section{padding:10px 0 20px;border-bottom:1px solid var(--line)}.tools-body label{display:block;font-size:12px;margin:10px 0 6px}.tools-body select,.tools-body input:not([type=checkbox]){width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--text);font-size:14px;letter-spacing:normal}.tools-body button{padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--hover);color:var(--text)}.numbers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.calculation{padding:12px 0;color:var(--text)!important;font-size:14px!important;min-height:45px}.due-list{list-style:none;margin:0;padding:0}.due-list li{padding:10px 0;border-bottom:1px solid var(--line);font-size:12px}.due-list strong{display:block;font-size:13px}.remember-label{display:flex!important;gap:8px;align-items:center}.remember-label input{width:auto}.tools-launcher{border:0;border-left:1px solid var(--line);background:transparent;color:var(--muted);padding:3px 0 3px 10px;font-size:12px}
  `;
  shadow.append(style);
  const button = document.createElement('button'); button.type = 'button'; button.className = 'tools-launcher'; button.textContent = 'Tools'; button.setAttribute('aria-label','Open assignment and filter tools');
  shadow.querySelector('.dock').append(button);
  const dialog = document.createElement('dialog'); dialog.className = 'tools-dialog'; dialog.setAttribute('aria-label','VTOP study tools');
  dialog.innerHTML = `<header><span class="brand">VTOP / STUDY TOOLS</span><span class="spacer"></span><button type="button" class="close" aria-label="Close study tools">Esc</button></header>
    <div class="tools-body">
      <section><h2>Next digital assignment</h2><p>Reads pending deadlines in the currently loaded page or course dashboard. Open each course's assignment details to see its dates.</p>
        <p class="calculation due-result" role="status" aria-live="polite"></p><ul class="due-list"></ul>
        <label for="manual-deadline">Calculate another deadline (IST)</label><input id="manual-deadline" type="datetime-local"><p class="manual-result" role="status" aria-live="polite"></p>
        <p>Date-only deadlines are treated as the end of that day in IST. Check VTOP for the exact cutoff.</p>
      </section>
      <section><h2>Page filters</h2><label class="remember-label"><input type="checkbox" id="remember-filters" checked>Remember course and exam filters on this device</label><p>Restores supported query dropdowns per page and semester. Form inputs and submission choices are excluded.</p><button type="button" class="clear-filters">Forget saved filters</button><p class="filter-status" role="status"></p></section>
    </div>`;
  shadow.append(dialog);
  const $ = selector => dialog.querySelector(selector);
  let dueRecords = [], previousFocus;
  function renderDue() {
    const summary = api.dueSummary(dueRecords);
    $('.due-result').textContent = summary.next ? `Next: ${summary.next.label} — ${api.countdown(summary.next.time)}${summary.overdue ? ` · ${summary.overdue} overdue` : ''}` :
      summary.overdue ? `${summary.overdue} overdue; no upcoming pending deadline is visible.` : dueRecords.length ? 'No pending assignments in the loaded data.' : 'No assignment deadlines are loaded. Open an assignment detail page, or enter a deadline below.';
    $('.due-list').replaceChildren();
    for (const assignment of summary.pending.slice(0,8)) {
      const item = document.createElement('li'), title = document.createElement('strong'), detail = document.createElement('span');
      title.textContent = assignment.label;
      detail.textContent = `${api.countdown(assignment.time)} · ${new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}).format(assignment.time)} IST${assignment.statusKnown ? '' : ' · submission status unavailable'}`;
      item.append(title, detail); $('.due-list').append(item);
    }
    const manual = api.parseDeadline($('#manual-deadline').value);
    $('.manual-result').textContent = manual ? api.countdown(manual.time) : '';
  }
  function refreshTools() {
    dueRecords = api.assignmentRows(document);
    renderDue();
  }
  function openTools() {
    if (dialog.open) return;
    const menu = shadow.querySelector('dialog');
    previousFocus = menu.open ? shadow.querySelector('.launcher') : shadow.activeElement || document.activeElement;
    if (menu.open) menu.close();
    refreshTools(); dialog.showModal(); $('.close').focus();
  }
  button.addEventListener('click',openTools);
  host.addEventListener('vtop-tools-open',openTools);
  $('.close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{ if(previousFocus?.isConnected) previousFocus.focus(); });
  $('#manual-deadline').addEventListener('input',renderDue);

  let ready=false, remember=true, saved={}, applied=new WeakMap(), restoring=false;
  function persist() { try { chrome.storage.local.set({pageFilters:saved,rememberFilters:remember})?.catch(()=>{}); } catch {} }
  function restoreFilters() {
    if(!ready || !remember) return;
    for(const select of document.querySelectorAll('select')) {
      if(!select.isConnected) continue;
      const key=api.filterKey(select,document); if(!key) continue;
      const signature=JSON.stringify([key,[...select.options].map(option=>[option.value,option.disabled])]);
      if(applied.get(select)===signature) continue;
      const value=saved[key];
      if(typeof value!=='string' || ![...select.options].some(option=>option.value===value&&!option.disabled&&!option.parentElement?.disabled)) continue;
      applied.set(select,signature);
      if(select.value===value) continue;
      restoring=true;
      try {if(globalThis.VtopPageActions)globalThis.VtopPageActions.change(select,value);else{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));}} finally {restoring=false;}
    }
  }
  document.addEventListener('change',event=>{
    const select=event.target;
    if(restoring || event.vtopCourseScopeChange || !ready || !remember || !(select instanceof HTMLSelectElement)) return;
    const key=api.filterKey(select,document); if(!key) return;
    // Only dropdown values are saved, never page contents or free-text fields.
    saved[key]=select.value;
    if(Object.keys(saved).length>100) delete saved[Object.keys(saved)[0]];
    applied.set(select,JSON.stringify([key,[...select.options].map(option=>[option.value,option.disabled])]));
    persist();
  },true);
  $('#remember-filters').addEventListener('change',()=>{
    remember=$('#remember-filters').checked; persist();
    $('.filter-status').textContent=remember?'Filter memory enabled.':'Filter memory paused.';
  });
  $('.clear-filters').addEventListener('click',()=>{saved={};applied=new WeakMap();persist();$('.filter-status').textContent='Saved filters cleared.';});
  try {chrome.storage.local.get(['pageFilters','rememberFilters']).then(settings=>{
    saved=settings.pageFilters&&typeof settings.pageFilters==='object'&&!Array.isArray(settings.pageFilters)?settings.pageFilters:{};
    remember=settings.rememberFilters!==false; $('#remember-filters').checked=remember;ready=true;restoreFilters();
  }).catch(()=>{ready=true;});} catch {ready=true;}
  let pending;
  new MutationObserver(()=>{
    clearTimeout(pending);pending=setTimeout(()=>{restoreFilters();if(dialog.open) refreshTools();},140);
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','value','id','name']});
  setInterval(()=>{if(dialog.open) renderDue();},30000);
})();
