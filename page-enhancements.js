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
  // Digital Assignment Upload: deadlines beside each course, read from the dashboards VTOP's own Dashboard
  // button opens. Read-only, one request at a time, kept in memory only, and stopped once a dashboard is opened.
  const DUE_STYLE=`:host{display:block;margin-top:2px;min-width:230px;font:12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:inherit;text-align:left}
    ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}li{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
    .title{opacity:.85}.when{display:inline-flex;gap:6px;align-items:baseline;white-space:nowrap}.date{opacity:.65;font-size:11px}.muted{opacity:.65}
    .badge{border:1px solid currentColor;border-radius:999px;padding:0 7px;font-size:11px;font-weight:600;white-space:nowrap}
    .pending .badge{color:#3664d9}.soon .badge{color:#c26a00}.overdue .badge{color:#d93036}.done .badge{color:#23845a}
    :host-context(html[data-vtop-command-dark]) .pending .badge{color:#9cbcff}:host-context(html[data-vtop-command-dark]) .soon .badge{color:#ffc46b}
    :host-context(html[data-vtop-command-dark]) .overdue .badge{color:#ff8f96}:host-context(html[data-vtop-command-dark]) .done .badge{color:#83d9ae}`;
  const CACHE_MS=5*60000, deadlineCache=new Map(), deadlineStates=new WeakMap(), dueStates=new WeakMap(), liveBadges=new Set();
  let deadlineQueue=[], deadlineController=null, deadlineRunning=false;
  const istDate=(time,dateOnly)=>new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',...(dateOnly?{}:{hour:'numeric',minute:'2-digit'})}).format(time);
  function badgeHost(cell,className){
    const host=document.createElement('div');host.className=className;
    const shadow=host.attachShadow({mode:'open'});shadow.innerHTML=`<style>${DUE_STYLE}</style><ul></ul>`;
    cell.append(host);return {host,shadow};
  }
  function line(record){
    const state=api.dueState(record),item=document.createElement('li');item.className=state.tone;
    const badge=document.createElement('span');badge.className='badge';badge.textContent=state.text;
    item.title=`Due ${istDate(record.time,false)} IST${record.dateOnly?' (date only; end of day assumed)':''}`;
    return {item,badge};
  }
  function renderDeadlines(state){
    const entry=deadlineCache.get(state.classId),list=state.shadow.querySelector('ul');list.replaceChildren();
    if(!entry||entry.status==='loading'){const item=document.createElement('li');item.className='muted';item.textContent='Loading deadlines…';list.append(item);return;}
    if(entry.status==='error'){const item=document.createElement('li');item.className='muted';item.textContent='Deadlines unavailable. Open the dashboard to check.';list.append(item);return;}
    // Submitted work is done; only what still needs attention is listed.
    const now=Date.now(),records=entry.records.filter(record=>!record.submitted);
    if(!records.length){const item=document.createElement('li');item.className='muted';item.textContent='Nothing pending';list.append(item);return;}
    // Upcoming work first (it is still actionable), then overdue.
    records.sort((a,b)=>Number(a.time<now)-Number(b.time<now)||a.time-b.time);
    for(const record of records){
      const {item,badge}=line(record);
      const title=document.createElement('span');title.className='title';title.textContent=record.title;
      const date=document.createElement('span');date.className='date';date.textContent=istDate(record.time,record.dateOnly);
      const when=document.createElement('span');when.className='when';when.append(badge,date);
      item.append(title,when);list.append(item);
    }
  }
  async function loadDeadlines(classId,signal){
    const csrf=document.querySelector('input[name="_csrf"]')?.value,id=document.querySelector('#authorizedID')?.value||document.querySelector('#authorizedIDX')?.value;
    if(!csrf||!id)throw new Error('Not signed in');
    const response=await fetch(new URL('examinations/processDigitalAssignment',document.baseURI),{method:'POST',credentials:'same-origin',signal,
      headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_csrf:csrf,classId,authorizedID:id,x:new Date().toUTCString()})});
    const html=response.ok?await response.text():'';
    if(!html||html.includes('___INTERNAL___RESPONSE___'))throw new Error('Unavailable');
    return api.assignmentRows(new DOMParser().parseFromString(html,'text/html')).map(({title,label,time,dateOnly,submitted})=>({title:title||label,time,dateOnly,submitted}));
  }
  async function pumpDeadlines(){
    if(deadlineRunning)return;deadlineRunning=true;
    try{
      while(deadlineQueue.length){
        const {classId,state}=deadlineQueue.shift();if(!state.host.isConnected)continue;
        const cached=deadlineCache.get(classId);
        if(cached?.status==='done'&&Date.now()-cached.at<CACHE_MS){renderDeadlines(state);continue;}
        deadlineCache.set(classId,{status:'loading'});renderDeadlines(state);
        deadlineController=new AbortController();
        try{deadlineCache.set(classId,{status:'done',records:await loadDeadlines(classId,deadlineController.signal),at:Date.now()});}
        catch(error){if(error?.name==='AbortError'){deadlineCache.delete(classId);break;}deadlineCache.set(classId,{status:'error'});}
        if(state.host.isConnected)renderDeadlines(state);
      }
    }finally{deadlineRunning=false;deadlineController=null;}
  }
  function stopDeadlines(){deadlineQueue=[];deadlineController?.abort();}
  // Opening a course hands the page back to VTOP; never race its own dashboard request.
  document.addEventListener('click',event=>{if(event.target.closest?.('[onclick*="myFunction"]'))stopDeadlines();},true);
  function scanDeadlines(){
    const courses=api.assignmentCourses(document);
    for(const course of courses){
      // A dedicated column just before Dashboard, so VTOP's own cells stay untouched.
      if(!course.headerRow.querySelector(':scope > .vtop-deadline-col')){
        const dashboardHeader=[...course.headerRow.cells].find(cell=>/dashboard/i.test(cell.textContent))||null;
        const heading=document.createElement(dashboardHeader?.tagName==='TH'?'th':'td');heading.className='vtop-deadline-col';heading.textContent='Pending assignments';
        course.headerRow.insertBefore(heading,dashboardHeader);
      }
      let cell=course.row.querySelector(':scope > .vtop-deadline-col');
      if(!cell){cell=document.createElement('td');cell.className='vtop-deadline-col';course.row.insertBefore(cell,course.dashboardCell);}
      let state=deadlineStates.get(course.row);
      if(state&&state.host.isConnected&&state.classId===course.classId)continue;
      state={...badgeHost(cell,'vtop-course-deadlines'),classId:course.classId};deadlineStates.set(course.row,state);liveBadges.add(state);
      deadlineQueue.push({classId:course.classId,state});
    }
    if(courses.length)pumpDeadlines();
    for(const record of api.assignmentRows(document)){
      if(!record.dueCell||!record.row)continue;
      let state=dueStates.get(record.row);
      // VTOP's Last Updated On column already shows submissions; countdowns are for pending work only.
      if(record.submitted){if(state?.host.isConnected)state.host.remove();continue;}
      if(!state||!state.host.isConnected){state=badgeHost(record.dueCell,'vtop-due-countdown');dueStates.set(record.row,state);liveBadges.add(state);}
      state.record=record;renderDue(state);
    }
  }
  function renderDue(state){
    const {item,badge}=line(state.record);item.append(badge);state.shadow.querySelector('ul').replaceChildren(item);
  }
  setInterval(()=>{for(const state of liveBadges){if(!state.host.isConnected){liveBadges.delete(state);continue;}state.record?renderDue(state):renderDeadlines(state);}},60000);
  function scan(){scanCourses();scanAttendance();scanDeadlines();}
  try {
    chrome.storage.local.get('defaultSemester').then(settings=>{preference=settings.defaultSemester;ready=true;scan();}).catch(()=>{ready=true;scan();});
    chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.defaultSemester){preference=changes.defaultSemester.newValue;scanCourses();}});
  } catch {ready=true;}
  scanAttendance();scanDeadlines();
  let pending;
  new MutationObserver(()=>{clearTimeout(pending);pending=setTimeout(scan,110);}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','value','id','name']});
})();
