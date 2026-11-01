(() => {
  'use strict';
  const api = globalThis.VtopEnhancements, semesters = globalThis.VtopSemesters;
  if (!api || !semesters) return;
  const clean = text => (text || '').replace(/\s+/g,' ').trim();
  const isTerm = option => /^(fall|winter|summer|spring|tri|inter[ -]?session)\b.*?\b(?:semester|sem)\b/i.test(clean(option.textContent));
  const optionTerm = option => semesters.key(clean(option.textContent).match(/^(.+?\b\d{4}\s*[-–—/]\s*(?:\d{4}|\d{2}))(?=\s*(?:[-–—]|$))/i)?.[1] || option.textContent);
  const sameNodes = (a,b) => a.length === b.length && a.every((node,index)=>node===b[index]);
  const courseStates = new WeakMap(), attendanceStates = new WeakMap();
  const courseHosts = new Map();
  let preference = null, ready = false;

  function courseDropdown(select) {
    if (select.multiple || select.disabled) return false;
    const identity = [select.id, select.name, ...[...(select.labels||[])].map(label=>label.textContent)].join(' ');
    const choices=[...select.options];
    const courseLabels=choices.some(option=>isTerm(option)&&/\b\d{4}[-–—/]\d{2,4}\s*[-–—]\s*[a-z]{2,}\d{2,}/i.test(clean(option.textContent)));
    return (/course/i.test(identity)||courseLabels) && choices.some(isTerm);
  }
  function snapshot(select) {
    const children = new Map([[select,[...select.childNodes]]]);
    for (const group of select.querySelectorAll('optgroup')) children.set(group,[...group.childNodes]);
    return children;
  }
  function createCourseState(select) {
    const host = document.createElement('div'); host.className='vtop-course-scope';
    const shadow = host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>:host{display:block;margin:8px 0 12px;font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:inherit}.bar{display:flex;gap:7px;align-items:center;flex-wrap:wrap}button{font:inherit;padding:6px 10px;border:1px solid #8597af;border-radius:7px;background:transparent;color:inherit;cursor:pointer}button[aria-pressed=true]{background:#2459b8;color:#fff;border-color:#2459b8}button:disabled{opacity:.5;cursor:default}button:focus-visible{outline:2px solid #5a86e8;outline-offset:2px}p{font-size:12px;margin:5px 0;opacity:.85}</style><div class="bar" role="group" aria-label="Course semester filter"><span>Courses:</span><button type="button" class="default" aria-pressed="true">Default semester</button><button type="button" class="all" aria-pressed="false">All semesters</button></div><p role="status"></p>`;
    select.before(host);
    const state = {host,shadow,children:snapshot(select),expected:[...select.options],showAll:false};
    courseHosts.set(host,select);
    shadow.querySelector('.default').addEventListener('click',()=>{state.showAll=false;filterCourses(select,state);});
    shadow.querySelector('.all').addEventListener('click',()=>{state.showAll=true;filterCourses(select,state);});
    return state;
  }
  function filterCourses(select,state) {
    const original = [...state.children.values()].flat().filter(node=>node instanceof HTMLOptionElement);
    const target = preference?.label ? semesters.key(preference.label) : null;
    const all = state.showAll || !target;
    const allowed = option => all || !isTerm(option) && (!option.value || ['0','-1'].includes(option.value) || /^(?:--|choose|select|registered courses)/i.test(clean(option.textContent))) || isTerm(option) && optionTerm(option)===target;
    const currentValue=select.value;
    // Keep the original option nodes/attributes. Detached options are restored by All semesters.
    for (const [parent,nodes] of [...state.children.entries()].reverse()) {
      const visible=nodes.filter(node=>node instanceof HTMLOptionElement ? allowed(node) : node instanceof HTMLOptGroupElement ? [...node.querySelectorAll('option')].length>0 : true);
      if(!sameNodes([...parent.childNodes],visible)) parent.replaceChildren(...visible);
    }
    const optionStillVisible=[...select.options].some(option=>option.value===currentValue);
    if(optionStillVisible) select.value=currentValue;
    else { const placeholder=[...select.options].find(option=>!isTerm(option)); select.selectedIndex=placeholder?placeholder.index:-1; }
    state.expected=[...select.options];
    select.dataset.vtopSemesterScope=all?'all':target;
    state.shadow.querySelector('.default').disabled=!target;
    state.shadow.querySelector('.default').setAttribute('aria-pressed',String(!all));
    state.shadow.querySelector('.all').setAttribute('aria-pressed',String(all));
    const count=original.filter(option=>isTerm(option)&&(all||optionTerm(option)===target)).length;
    const message=all ? `${count} courses across all semesters.${target?'':' Choose a default semester in the launcher to filter them.'}` :
      count ? `${count} ${count===1?'course':'courses'} · ${preference.label}` : `No courses for ${preference.label}. Choose All semesters to browse other terms.`;
    const status=state.shadow.querySelector('p');if(status.textContent!==message)status.textContent=message;
    if(select.value!==currentValue){
      const event=new Event('change',{bubbles:true});event.vtopCourseScopeChange=true;select.dispatchEvent(event);
    }
  }
  function scanCourses() {
    if(!ready)return;
    for(const [host,select] of courseHosts)if(!select.isConnected){host.remove();courseHosts.delete(host);}
    for(const select of document.querySelectorAll('select')) {
      let state=courseStates.get(select);
      if(!state&&!courseDropdown(select))continue;
      if(!state){state=createCourseState(select);courseStates.set(select,state);}
      else if(!sameNodes([...select.options],state.expected)) {
        // VTOP replaced the options; discard the old snapshot rather than reviving stale courses.
        state.children=snapshot(select);
      }
      if(!state.host.isConnected)select.before(state.host);
      filterCourses(select,state);
    }
  }
  function scanAttendance() {
    for(const table of document.querySelectorAll('table')) {
      const rows=[...table.rows].filter(row=>row.closest('table')===table);
      const header=rows.find(row=>[...row.cells].some(cell=>/attended (?:classes|days)/i.test(cell.textContent)));
      if(!header)continue;
      const headings=[...header.cells].map(cell=>clean(cell.textContent));
      const a=headings.findIndex(text=>/attended/i.test(text)),t=headings.findIndex(text=>/total (?:classes|days)|conducted/i.test(text)),p=headings.findIndex(text=>/attendance percentage/i.test(text));
      if(a<0||t<0)continue;
      for(const row of rows.slice(rows.indexOf(header)+1)) {
        if(row.cells.length!==headings.length)continue;
        const attendedText=clean(row.cells[a].textContent),totalText=clean(row.cells[t].textContent);
        if(!/^\d+$/.test(attendedText)||!/^\d+$/.test(totalText))continue;
        const attended=Number(attendedText),total=Number(totalText);if(!api.attendance(attended,total))continue;
        let state=attendanceStates.get(row);
        if(!state||!state.host.isConnected) {
          const host=document.createElement('div');host.className='vtop-row-attendance';
          const shadow=host.attachShadow({mode:'open'});
          shadow.innerHTML=`<style>:host{display:block;min-width:170px;margin-top:8px;font:12px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:inherit}.target{text-align:center;opacity:.8}p{margin:5px 0 0;white-space:normal;text-align:center}</style><div class="target">Target: 75%</div><p role="status" aria-live="polite"></p>`;
          (row.cells[p>=0?p:t]).append(host);
          state={host,shadow,attended,total};attendanceStates.set(row,state);
          host.title='Estimate using equally weighted future classes.';
        }
        state.attended=attended;state.total=total;renderAttendance(state);
      }
    }
  }
  function renderAttendance(state) {
    const result=api.attendance(state.attended,state.total,75);
    const message=!result?'Attendance counts unavailable.':result.percentage===null?'No classes recorded yet.':result.needed>0?`Attend ${result.needed} more ${result.needed===1?'class':'classes'} to reach 75%.`:`Can miss ${result.missable} more ${result.missable===1?'class':'classes'} at 75%.`;
    const output=state.shadow.querySelector('p');if(output.textContent!==message)output.textContent=message;
  }
  function scan(){scanCourses();scanAttendance();}
  try {
    chrome.storage.local.get('defaultSemester').then(settings=>{preference=settings.defaultSemester;ready=true;scan();}).catch(()=>{ready=true;scan();});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.defaultSemester){preference=changes.defaultSemester.newValue;scanCourses();}});
  } catch {ready=true;}
  scanAttendance();
  let pending;
  new MutationObserver(()=>{clearTimeout(pending);pending=setTimeout(scan,110);}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','value','id','name']});
})();
