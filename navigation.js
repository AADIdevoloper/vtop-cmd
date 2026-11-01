(function (root) {
  'use strict';
  const selector = 'a.systemB5BtnMenu[data-url], a.systemBtnMenu[data-url], a.quickB5MainMenu[data-url]';
  const clean = value => (value || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\s+/g, ' ').trim();
  const normalize = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const aliases = [
    [/time table/i, 'timetable schedule tt'],
    [/attendance/i, 'attendance att'],
    [/digital assignment/i, 'da assignments upload'],
    [/grade history/i, 'cgpa gpa results history'],
    [/marks|grades/i, 'results exams scores'],
    [/course page/i, 'courses materials syllabus'],
    [/fees|payments|receipts/i, 'fees finance'],
    [/academics calendar/i, 'academic calendar holidays']
  ];

  function discover(doc) {
    const commands = new Map();
    // Prefer the full menu to quick links so categories remain informative.
    const nodes = [...doc.querySelectorAll(selector)].sort((a, b) =>
      Number(!a.closest('.hmenubox')) - Number(!b.closest('.hmenubox')));
    for (const element of nodes) {
      const route = element.getAttribute('data-url')?.trim();
      const label = clean(element.querySelector('span')?.textContent || element.textContent);
      if (!route || !label || commands.has(route) || element.matches('[disabled],.disabled,[aria-disabled="true"],[data-status="false"]')) continue;
      // Routes are identifiers only. Activation always uses the original element.
      const box = element.closest('.hmenubox');
      const group = clean(box?.querySelector('.h5')?.textContent) || 'Quick links';
      let sibling = element.previousElementSibling;
      while (sibling && !sibling.matches('.card-title')) sibling = sibling.previousElementSibling;
      const section = clean(sibling?.textContent);
      const category = section && section !== 'General' ? `${group} / ${section}` : group;
      commands.set(route, { id: route, label, category, element,
        keywords: aliases.filter(([pattern]) => pattern.test(label)).map(([, words]) => words).join(' ') });
    }
    return [...commands.values()];
  }

  function score(command, query) {
    const q = normalize(query);
    if (!q) return 1;
    const label = normalize(command.label);
    const words = `${label} ${normalize(command.category)} ${normalize(command.keywords)}`;
    if (label === q) return 1000;
    if (normalize(command.keywords).split(' ').includes(q)) return 950;
    if (label.startsWith(q)) return 900;
    if (label.includes(q)) return 800;
    if (q.split(' ').every(token => words.includes(token))) return 650;
    const acronym = label.split(' ').map(word => word[0]).join('');
    if (acronym.startsWith(q)) return 600;
    // Small omissions still find a page, without accepting unrelated queries.
    if (q.length < 3 || q.includes(' ')) return 0;
    let i = 0;
    for (const char of label) if (char === q[i]) i++;
    return i === q.length ? 200 - (label.length - q.length) : 0;
  }

  function search(commands, query, recent = []) {
    return commands.map((command, index) => ({ command, index, score: score(command, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score ||
        (!normalize(query) ? (recent.indexOf(a.command.id) < 0 ? 999 : recent.indexOf(a.command.id)) -
          (recent.indexOf(b.command.id) < 0 ? 999 : recent.indexOf(b.command.id)) : 0) || a.index - b.index)
      .map(item => item.command);
  }
  const api = { discover, search, normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VtopNavigation = api;
})(globalThis);
