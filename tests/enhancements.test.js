const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const api=require('../enhancements');
const root=__dirname+'/../';
const semester='<select id="semesterSubId"><option value="S1">Fall Semester 2026-27</option></select>';
const course='<select id="courseId"><option value="">Choose course</option><option value="C1">Course A</option><option value="C2">Course B</option></select>';
function setup(html,settings={}){
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://vtop.vit.ac.in/vtop/content'}),w=dom.window,writes=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
 w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
 w.chrome={storage:{local:{get:async()=>({defaultSemester:null,...settings}),set:async v=>writes.push(JSON.parse(JSON.stringify(v)))},onChanged:{addListener(){}}}};
 for(const file of ['brand.js','navigation.js','semesters.js','enhancements.js','content.js','page-enhancements.js','enhancements-ui.js'])w.eval(fs.readFileSync(root+file,'utf8'));
 return{dom,w,writes,shadow:w.document.querySelector('#vtop-command-root').shadowRoot};
}
const pause=()=>new Promise(r=>setTimeout(r,200));
test('attendance boundaries use exact counts, editable targets and conservative rounding',()=>{
 assert.equal(api.attendance(30,40).missable,0);
 assert.equal(api.attendance(29,40).needed,4);
 assert.equal(api.attendance(40,40).missable,13);
 assert.equal(api.attendance(39,40,100).needed,Infinity);
 assert.equal(api.attendance(40,40,100).missable,0);
 assert.equal(api.attendance(8,10,80).needed,0);
 for(const values of [[5,4,75],[-1,5,75],[1.5,5,75],[1,5,0],[1,5,101],[NaN,5,75]])assert.equal(api.attendance(...values),null);
 assert.equal(api.attendance(0,0).percentage,null);
});
test('attendance DOM reader handles observed VTOP headers and ignores percentage-only or malformed rows',()=>{
 const dom=new JSDOM('<table><tr><td>Course Detail</td><td>Attended Classes/Days</td><td>Total Classes</td><td>Attendance Percentage</td></tr><tr><td>Sample A</td><td>29</td><td>40</td><td>73%</td></tr><tr><td>Bad</td><td>--</td><td>40</td><td>--</td></tr></table>');
 assert.deepEqual(api.attendanceRows(dom.window.document),[{label:'Sample A',attended:29,total:40}]);dom.window.close();
});
test('deadline parser uses IST, supports explicit dates/times, validates dates and marks date-only estimates',()=>{
 assert.equal(api.parseDeadline('03-Nov-2026 11:59 PM').time,Date.parse('2026-11-03T23:59:00+05:30'));
 assert.equal(api.parseDeadline('2026-11-03T18:30').time,Date.parse('2026-11-03T18:30:00+05:30'));
 assert.equal(api.parseDeadline('03/11/2026').time,Date.parse('2026-11-03T23:59:59+05:30'));
 assert.equal(api.parseDeadline('03-Nov-2026').dateOnly,true);
 for(const date of ['31-Feb-2026','2026-13-01','03-Nov-2026 25:00','03-Nov-2026 00:30 PM','not a date'])assert.equal(api.parseDeadline(date),null,date);
});
test('next due excludes submitted assignments, includes not uploaded, sorts deadlines and tracks overdue',()=>{
 const dom=new JSDOM('<table><tr><th>Course Name</th><th>Title</th><th>Last Date</th><th>Uploaded</th></tr><tr><td>A</td><td>DA1</td><td>04-Nov-2026 18:00</td><td>No</td></tr><tr><td>B</td><td>DA2</td><td>03-Nov-2026 18:00</td><td>Not Uploaded</td></tr><tr><td>C</td><td>DA3</td><td>02-Nov-2026 18:00</td><td>Yes</td></tr><tr><td>D</td><td>DA4</td><td>01-Nov-2026 18:00</td><td>Pending</td></tr></table>');
 const result=api.dueSummary(api.assignmentRows(dom.window.document),Date.parse('2026-11-02T18:00:00+05:30'));
 assert.equal(result.next.label,'B · DA2');assert.equal(result.overdue,1);assert.equal(result.pending.length,3);
 assert.equal(api.countdown(result.next.time,Date.parse('2026-11-02T18:00:00+05:30')),'Due in 1d 0h 0m');dom.window.close();
});
test('semester chip is visible and attendance calculates per table row without storing grades',async()=>{
 const {dom,w,shadow,writes}=setup('<main id="b5-pagewrapper"><h1>Attendance</h1><table><tr><th>Course Detail</th><th>Attended Classes/Days</th><th>Total Classes</th></tr><tr><td>Sample A</td><td>29</td><td>40</td></tr></table></main>',{defaultSemester:{value:'S1',label:'Fall Semester 2026-27'}});
 await pause();assert.equal(shadow.querySelector('.semester-chip').textContent,'Fall 2026-27');
 const row= w.document.querySelector('.vtop-row-attendance').shadowRoot;
 assert.match(row.querySelector('p').textContent,/Attend 4 more classes/);
 assert.equal(row.querySelector('input'),null);assert.match(row.textContent,/Target: 75%/);
 shadow.querySelector('.tools-launcher').click();
 assert.equal(shadow.querySelector('#attendance-course'),null);assert.ok(!shadow.querySelector('.tools-dialog').textContent.includes('Attendance calculator'));
 assert.equal(writes.length,0);dom.window.close();
});
test('filters persist only supported dropdowns and restore per page/semester with native handlers',async()=>{
 const html=`<main id="b5-pagewrapper"><h1>Marks</h1><form id="marks-form">${semester}${course}<input id="password" value="secret"><select id="paymentMethod"><option>Cash</option></select></form></main>`;
 const first=setup(html);await pause();
 let select=first.w.document.querySelector('#courseId');select.value='C2';select.dispatchEvent(new first.w.Event('change',{bubbles:true}));
 const settings=first.writes.at(-1);assert.equal(Object.values(settings.pageFilters)[0],'C2');assert.ok(!JSON.stringify(settings).includes('secret'));
 const second=setup(html,settings);let changes=0;second.w.document.querySelector('#courseId').addEventListener('change',()=>changes++);await pause();
 assert.equal(second.w.document.querySelector('#courseId').value,'C2');assert.equal(changes,1);
 // DOM churn must not repeatedly invoke the query handler.
 second.w.document.body.append(second.w.document.createElement('p'));await pause();assert.equal(changes,1);
 const different=setup(html.replace('value="S1"','value="S2"'),settings);await pause();assert.equal(different.w.document.querySelector('#courseId').value,'');
 const unavailable=setup(html.replace('value="C2"','value="C3"'),settings);await pause();assert.equal(unavailable.w.document.querySelector('#courseId').value,'');
 const transactional=setup(html.replace('Marks','Course Registration'),settings);await pause();assert.equal(transactional.w.document.querySelector('#courseId').value,'');
 for(const item of [first,second,different,unavailable,transactional])item.dom.window.close();
});
test('filter memory can be disabled and cleared from tools',async()=>{
 const {dom,w,shadow,writes}=setup(`<main id="b5-pagewrapper"><h1>Marks</h1>${course}</main>`);await pause();
 shadow.querySelector('.tools-launcher').click();const toggle=shadow.querySelector('#remember-filters');toggle.checked=false;toggle.dispatchEvent(new w.Event('change'));
 const select=w.document.querySelector('#courseId');select.value='C1';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert.equal(writes.length,1);assert.equal(writes[0].rememberFilters,false);
 shadow.querySelector('.clear-filters').click();assert.deepEqual(writes.at(-1).pageFilters,{});dom.window.close();
});
test('Cmd+K moves from study tools to the command palette without leaving stacked dialogs',async()=>{
 const {dom,w,shadow}=setup('<main id="b5-pagewrapper"><h1>Marks</h1></main>');await pause();
 shadow.querySelector('.tools-launcher').click();
 w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'k',metaKey:true,bubbles:true,cancelable:true}));
 assert.equal(shadow.querySelector('.tools-dialog').open,false);
 assert.equal(shadow.querySelector('dialog').open,true);
 dom.window.close();
});
const registeredCourses=`<main id="b5-pagewrapper"><h1>Course Page - view</h1><label for="courseId">Select Registered Course</label><select id="courseId"><option value="">-- Registered Courses --</option><option value="W1">Winter Semester 2026-27 - SAMPLE101 - Course W</option><option value="F1">Fall Semester 2026-27 - SAMPLE102 - Course F</option><option value="OLD">Fall Semester 2025-26 - SAMPLE103 - Old course</option><option value="F2">Fall Semester 2026-27 - SAMPLE104 - Course F2</option></select></main>`;
const defaultFall={value:'S1',label:'Fall Semester 2026-27'};
test('Course Page defaults to saved semester, toggles all/default with original order and nodes preserved',async()=>{
 const {dom,w}=setup(registeredCourses,{defaultSemester:defaultFall});const select=w.document.querySelector('#courseId'),original=[...select.options];await pause();
 assert.deepEqual([...select.options].map(o=>o.value),['','F1','F2']);
 const bar=w.document.querySelector('.vtop-course-scope').shadowRoot;assert.match(bar.querySelector('p').textContent,/2 courses.*Fall Semester 2026-27/);
 bar.querySelector('.all').click();assert.deepEqual([...select.options].map(o=>o.value),['','W1','F1','OLD','F2']);assert.equal(select.options[1],original[1]);
 bar.querySelector('.default').click();await pause();assert.deepEqual([...select.options].map(o=>o.value),['','F1','F2']);
 assert.equal(w.document.querySelectorAll('.vtop-course-scope').length,1);dom.window.close();
});
test('no default shows all terms; unavailable default reports empty results and lets user show all',async()=>{
 const none=setup(registeredCourses);await pause();assert.equal(none.w.document.querySelector('#courseId').options.length,5);assert.equal(none.w.document.querySelector('.vtop-course-scope').shadowRoot.querySelector('.default').disabled,true);none.dom.window.close();
 const missing=setup(registeredCourses,{defaultSemester:{value:'other',label:'Summer Semester 2026-27'}});await pause();
 const shadow=missing.w.document.querySelector('.vtop-course-scope').shadowRoot;assert.match(shadow.querySelector('p').textContent,/No courses for Summer/);assert.equal(missing.w.document.querySelector('#courseId').options.length,1);shadow.querySelector('.all').click();assert.equal(missing.w.document.querySelector('#courseId').options.length,5);missing.dom.window.close();
});
test('filter clears an out-of-term selection and refreshes AJAX options without reviving stale courses',async()=>{
 const {dom,w}=setup(registeredCourses.replace('value="W1"','value="W1" selected'),{defaultSemester:defaultFall});
 const select=w.document.querySelector('#courseId');let changed=0;select.addEventListener('change',()=>changed++);await pause();assert.equal(select.value,'');assert.equal(changed,1);
 select.innerHTML='<option value="">Choose course</option><option value="NEW">Fall Semester 2026-27 - NEW100 - New course</option><option value="OTHER">Winter Semester 2026-27 - NEW101 - Other course</option>';await pause();
 assert.deepEqual([...select.options].map(o=>o.value),['','NEW']);w.document.querySelector('.vtop-course-scope').shadowRoot.querySelector('.all').click();assert.deepEqual([...select.options].map(o=>o.value),['','NEW','OTHER']);dom.window.close();
});
test('attendance annotations update in place after count changes and AJAX row replacement',async()=>{
 const html='<main id="b5-pagewrapper"><table><tr><th>Course Detail</th><th>Attended Classes/Days</th><th>Total Classes</th><th>Attendance Percentage</th></tr><tr><td>A</td><td>29</td><td>40</td><td>73%</td></tr><tr><td>B</td><td>40</td><td>40</td><td>100%</td></tr></table></main>';
 const {dom,w}=setup(html);await pause();assert.equal(w.document.querySelectorAll('.vtop-row-attendance').length,2);
 const rows=w.document.querySelector('table').rows;assert.match(rows[2].querySelector('.vtop-row-attendance').shadowRoot.textContent,/Can miss 13/);
 rows[1].cells[1].textContent='30';await pause();assert.match(rows[1].querySelector('.vtop-row-attendance').shadowRoot.textContent,/Can miss 0/);assert.equal(w.document.querySelectorAll('.vtop-row-attendance').length,2);
 rows[1].outerHTML='<tr><td>C</td><td>28</td><td>40</td><td>70%</td></tr>';await pause();assert.equal(w.document.querySelectorAll('.vtop-row-attendance').length,2);assert.match(rows[1].querySelector('.vtop-row-attendance').shadowRoot.textContent,/Attend 8 more/);dom.window.close();
});
test('scope toggles preserve remembered course filters for both default and all-semester views',async()=>{
 const {dom,w}=setup(registeredCourses,{defaultSemester:defaultFall});await pause();
 const select=w.document.querySelector('#courseId'),bar=w.document.querySelector('.vtop-course-scope').shadowRoot;
 select.value='F1';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 bar.querySelector('.all').click();await pause();select.value='W1';select.dispatchEvent(new w.Event('change',{bubbles:true}));
 bar.querySelector('.default').click();await pause();assert.equal(select.value,'F1');
 bar.querySelector('.all').click();await pause();assert.equal(select.value,'W1');dom.window.close();
});
test('semester-prefixed course labels support unnamed course controls and restore grouped options',async()=>{
 const html='<main id="b5-pagewrapper"><h1>Course Page - view</h1><select id="registeredClass"><option value="">Choose class</option><optgroup label="Fall"><option value="F">Fall Semester 2026-27 - SAMPLE101 - Fall course</option></optgroup><optgroup label="Winter"><option value="W">Winter Semester 2026-27 - SAMPLE102 - Winter course</option></optgroup></select></main>';
 const {dom,w}=setup(html,{defaultSemester:defaultFall});await pause();const select=w.document.querySelector('select');
 assert.deepEqual([...select.options].map(o=>o.value),['','F']);assert.equal(select.querySelectorAll('optgroup').length,1);
 w.document.querySelector('.vtop-course-scope').shadowRoot.querySelector('.all').click();assert.deepEqual([...select.options].map(o=>o.value),['','F','W']);assert.equal(select.querySelectorAll('optgroup').length,2);dom.window.close();
});
