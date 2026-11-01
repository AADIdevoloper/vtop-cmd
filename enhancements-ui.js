(() => {
  'use strict';
  const host = document.getElementById('vtop-command-root');
  if (!host?.shadowRoot || !globalThis.VtopEnhancements) return;
  const api = globalThis.VtopEnhancements;
  let ready=false, remember=true, saved={}, applied=new WeakMap(), restoring=false;
  // Filter memory has no panel of its own; its two controls live in the command menu.
  globalThis.VtopCommandExtras = () => [
    { id: 'vtop:filters-toggle', label: remember ? 'Turn off filter memory' : 'Turn on filter memory', category: 'Page filters',
      keywords: 'remember filters course exam dropdown restore', action: () => { remember = !remember; persist(); host.dispatchEvent(new CustomEvent('vtop-command-done')); } },
    { id: 'vtop:filters-clear', label: 'Forget saved page filters', category: Object.keys(saved).length ? `Page filters · ${Object.keys(saved).length} saved` : 'Page filters',
      keywords: 'clear reset remember filters', action: () => { saved = {}; applied = new WeakMap(); persist(); host.dispatchEvent(new CustomEvent('vtop-command-done')); } }
  ];
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
  try {chrome.storage.local.get(['pageFilters','rememberFilters']).then(settings=>{
    saved=settings.pageFilters&&typeof settings.pageFilters==='object'&&!Array.isArray(settings.pageFilters)?settings.pageFilters:{};
    remember=settings.rememberFilters!==false;ready=true;restoreFilters();
  }).catch(()=>{ready=true;});} catch {ready=true;}
  let pending;
  new MutationObserver(()=>{
    clearTimeout(pending);pending=setTimeout(restoreFilters,140);
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','value','id','name']});
})();
