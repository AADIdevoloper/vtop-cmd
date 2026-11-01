const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const { courses, totals } = require('../cgpa');
const table = (history = false) => `<table><tr><th>Course Code</th><th>Course Title</th><th>Course Type</th><th>Credits</th>${history ? '<th>Grade</th><th>Semester</th>' : ''}</tr>
<tr><td>MAT1001</td><td>Calculus</td><td>Theory</td><td>4</td>${history ? '<td>A</td><td>Fall 2025</td>' : ''}</tr>
<tr><td>PHY1001</td><td>Physics</td><td>Theory</td><td>3</td>${history ? '<td>F</td><td>Winter 2025</td>' : ''}</tr></table>`;
test('parses semester groups and weights failed courses; unknown grades are excluded', () => {
  const dom = new JSDOM(table(true));
  const data = courses(dom.window.document, true);
  assert.equal(data.length, 2); assert.equal(data[1].semester, 'Winter 2025');
  assert.deepEqual(totals([...data, { credits: 9, grade: 'P' }]), { credits: 7, points: 36 });
  dom.window.close();
});
test('calculator navigates history then timetable, updates projection, and returns to search', async () => {
  const dom = new JSDOM(`<a class="systemBtnMenu" data-url="history">Grade History</a><a class="systemBtnMenu" data-url="time">Time Table</a><main></main>`, { runScripts: 'outside-only' });
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  const visited = [];
  for (const link of w.document.querySelectorAll('a')) link.addEventListener('click', event => {
    event.preventDefault(); visited.push(link.dataset.url);
    w.document.querySelector('main').innerHTML = table(link.dataset.url === 'history');
  });
  for (const file of ['brand.js', 'navigation.js', 'semesters.js', 'page-actions.js', 'cgpa.js', 'content.js', 'cgpa-ui.js']) w.eval(fs.readFileSync(`${__dirname}/../${file}`, 'utf8'));
  const shadow = w.document.querySelector('#vtop-command-root').shadowRoot;
  shadow.querySelector('.launcher').click();
  [...shadow.querySelectorAll('.option')].find(row => row.textContent.includes('CGPA calculator')).click();
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.deepEqual(visited, ['history', 'time']);
  assert.equal(shadow.querySelectorAll('.cgpa-bubble').length, 2);
  const grades = shadow.querySelectorAll('.cgpa-grade'); assert.equal(grades.length, 2);
  assert.ok([...grades].every(control => control.querySelector('output').textContent === 'S'));
  assert.match(shadow.querySelector('.cgpa-summary').textContent, /Selected-course GPA10.00/);
  assert.match(shadow.querySelector('.cgpa-summary').textContent, /Projected CGPA7.57/);
  const [minus, plus] = grades[0].querySelectorAll('button');
  assert.equal(minus.textContent, '−'); assert.equal(plus.textContent, '+');
  assert.equal(plus.disabled, true);
  minus.click(); assert.equal(grades[0].querySelector('output').textContent, 'A');
  assert.match(shadow.querySelector('.cgpa-summary').textContent, /Projected CGPA7.29/);
  plus.click(); assert.equal(grades[0].querySelector('output').textContent, 'S');
  for (let i = 0; i < 6; i++) minus.click();
  assert.equal(grades[0].querySelector('output').textContent, 'F');
  assert.equal(minus.disabled, true);
  shadow.querySelector('.cgpa-back').click();
  assert.equal(shadow.querySelector('.cgpa').hidden, true);
  assert.equal(shadow.querySelector('.search').hidden, false);
  dom.window.close();
});
test('timetable can initially contain only a semester picker; calculator loads and switches courses', async () => {
  const dom = new JSDOM(`<a class="systemBtnMenu" data-url="history">Grade History</a><a class="systemBtnMenu" data-url="time">Time Table</a><main></main>`, { runScripts: 'outside-only' });
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.chrome = { storage: { local: { get: async () => ({ defaultSemester: null }) }, onChanged: { addListener() {} } } };
  w.document.querySelector('[data-url="history"]').addEventListener('click', event => {
    event.preventDefault(); w.document.querySelector('main').innerHTML = table(true);
  });
  w.document.querySelector('[data-url="time"]').addEventListener('click', event => {
    event.preventDefault();
    w.document.querySelector('main').innerHTML = '<select id="semester"><option value="">Select semester</option><option value="fall">Fall 2026</option><option value="winter">Winter 2026</option></select><div id="courses"></div>';
    const select = w.document.querySelector('#semester');
    select.addEventListener('change', () => {
      const data = select.value === 'winter' ? table().replaceAll('Calculus', 'Winter Calculus') : table();
      w.document.querySelector('#courses').innerHTML = data;
    });
  });
  for (const file of ['brand.js', 'navigation.js', 'semesters.js', 'page-actions.js', 'cgpa.js', 'content.js', 'cgpa-ui.js']) w.eval(fs.readFileSync(`${__dirname}/../${file}`, 'utf8'));
  const shadow = w.document.querySelector('#vtop-command-root').shadowRoot;
  shadow.querySelector('.launcher').click();
  [...shadow.querySelectorAll('.option')].find(row => row.textContent.includes('CGPA calculator')).click();
  await new Promise(resolve => setTimeout(resolve, 550));
  assert.equal(shadow.querySelectorAll('.cgpa-row').length, 2);
  assert.equal(shadow.querySelector('.cgpa-term-label').hidden, false);
  const picker = shadow.querySelector('.cgpa-term');
  assert.equal(picker.value, 'fall');
  picker.value = 'winter'; picker.dispatchEvent(new w.Event('change'));
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.match(shadow.querySelector('.cgpa-courses').textContent, /Winter Calculus/);
  assert.equal(w.document.querySelector('#semester').value, 'winter');
  dom.window.close();
});
test('reads the live VTOP combined Course and L T P J C timetable layout', () => {
  const dom = new JSDOM(`<table><tr><th>Sl.No</th><th>Class Group</th><th>Course</th><th>L T P J C</th><th>Category</th></tr>
    <tr><td>1</td><td>General (Semester)</td><td><span>BCSE355L - Cloud Architecture Design</span><br><span>( Theory Only )</span></td><td><span>3</span><span>0</span><span>0</span><span>0</span><span>3.0</span></td><td>Open Elective</td></tr>
    <tr><td>2</td><td>General (Semester)</td><td>BITE303P - Operating Systems Lab<br>( Lab Only )</td><td>0 0 2 0 1.0</td><td>Discipline Core</td></tr>
    <tr><td>3</td><td>General (Semester)</td><td>BSTS301P - Advanced Competitive Coding - I<br>( Soft Skill )</td><td>0 0 3 0 1.5</td><td>Open Elective</td></tr>
    <tr><td colspan="5">Total Number Of Credits: 5.5</td></tr></table>`);
  const data = courses(dom.window.document);
  assert.deepEqual(data.map(course => [course.code, course.name, course.credits, course.type]), [
    ['BCSE355L', 'Cloud Architecture Design', 3, 'Theory Only'],
    ['BITE303P', 'Operating Systems Lab', 1, 'Lab Only'],
    ['BSTS301P', 'Advanced Competitive Coding - I', 1.5, 'Soft Skill']
  ]);
  assert.deepEqual(courses(dom.window.document, true), []);
  dom.window.close();
});
const { validatePredictions } = require('../cgpa');
test('NGCR categories override grades; F remains in the denominator', () => {
  const dom = new JSDOM(`<table><tr><th>Course Code</th><th>Credits</th><th>Grade</th><th>Course Category</th></tr><tr><td>TEST100N</td><td>2</td><td>S</td><td>NGCR</td></tr><tr><td>TEST200N</td><td>1</td><td>P</td><td>Non-graded Core Requirement</td></tr></table>`);
  const data = courses(dom.window.document, true);
  assert.ok(data.every(c => c.nonGraded));
  assert.deepEqual(totals(data), { credits: 0, points: 0 });
  assert.deepEqual(totals([...data, { credits: 4, grade: 'F' }, { credits: 3, grade: 'S' }]), { credits: 7, points: 30 });
  dom.window.close();
});
test('saved predictions retain only valid grades and discard retired features', () => {
  const result = validatePredictions({
    'term:fall': [{ code: 'TEST100L', type: 'TH', grade: 'A', credits: 99, corrected: true, included: false }, { code: 'BAD', grade: 'P' }],
    'future:test': { label: 'Retired plan', credits: 20, gpa: 10 }
  });
  assert.deepEqual(result['term:fall'], [{ code: 'TEST100L', type: 'TH', grade: 'A' }]);
  assert.equal(result['future:test'], undefined);
  assert.equal(Object.keys(validatePredictions(null)).length, 0);
});
async function calculatorSetup() {
  const dom = new JSDOM(`<a class="systemBtnMenu" data-url="history">Grade History</a><a class="systemBtnMenu" data-url="time">Time Table</a><main></main>`, { runScripts: 'outside-only' });
  const w = dom.window, saved = {};
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.chrome = { storage: { local: { get: async key => typeof key === 'string' ? { [key]: saved[key] } : { defaultSemester: null }, set: async values => Object.assign(saved, JSON.parse(JSON.stringify(values))) }, onChanged: { addListener() {} } } };
  const current = `<table><tr><th>Course</th><th>L T P J C</th><th>Category</th></tr><tr><td>TEST100L - Mathematics ( Theory Only )</td><td>3 1 0 0 4</td><td>Discipline Core</td></tr><tr><td>TEST200L - Computing ( Theory Only )</td><td>3 0 0 0 3</td><td>Discipline Core</td></tr><tr><td>TEST300N - Constitution ( Online Course )</td><td>0 0 0 0 2</td><td>Non-graded Core Requirement</td></tr></table>`;
  for (const link of w.document.querySelectorAll('a')) link.addEventListener('click', event => { event.preventDefault(); w.document.querySelector('main').innerHTML = link.dataset.url === 'history' ? table(true) : current; });
  for (const file of ['brand.js', 'navigation.js', 'semesters.js', 'page-actions.js', 'cgpa.js', 'content.js', 'cgpa-ui.js']) w.eval(fs.readFileSync(`${__dirname}/../${file}`, 'utf8'));
  const shadow = w.document.querySelector('#vtop-command-root').shadowRoot;
  shadow.querySelector('.launcher').click();
  [...shadow.querySelectorAll('.option')].find(row => row.textContent.includes('CGPA calculator')).click();
  await new Promise(resolve => setTimeout(resolve, 450));
  return { dom, w, shadow, saved };
}
test('simple calculator keeps NGCR exclusion and saved grades without advanced controls', async () => {
  const { dom, shadow, saved } = await calculatorSetup();
  assert.equal(shadow.querySelectorAll('.cgpa-row').length, 3);
  assert.equal(shadow.querySelectorAll('.cgpa-grade').length, 2);
  assert.match(shadow.querySelector('.cgpa-summary').textContent, /Selected credits7/);
  assert.match(shadow.querySelector('.cgpa-row:last-child').textContent, /Non-graded/);
  assert.equal(shadow.querySelector('.cgpa-future-add,.cgpa-import,.cgpa-target,.cgpa-row input'), null);
  assert.equal(shadow.querySelector('.cgpa-bubble').tagName, 'DIV');
  shadow.querySelector('.cgpa-grade button:first-child').click();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(saved['cgpaScenarios:local']['term:current'][0].grade, 'A');
  shadow.querySelector('.cgpa-reload').click();
  await new Promise(resolve => setTimeout(resolve, 450));
  assert.equal(shadow.querySelector('.cgpa-grade output').textContent, 'A');
  assert.match(shadow.querySelector('.cgpa-summary').textContent, /Selected credits7/);
  dom.window.close();
});
