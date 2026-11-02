(function (root) {
  'use strict';
  const points = { S: 10, A: 9, B: 8, C: 7, D: 6, E: 5, F: 0 };
  const clean = value => (value || '').replace(/\s+/g, ' ').trim();
  const heading = value => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  // VTOP wraps course names and L/T/P/J/C values in separate text nodes.
  // Join them with spaces so adjacent spans do not merge numbers or words.
  function cellText(cell) {
    if (!cell) return '';
    const walker = cell.ownerDocument.createTreeWalker(cell, 4), parts = [];
    while (walker.nextNode()) parts.push(walker.currentNode.textContent);
    return clean(parts.join(' '));
  }
  function courses(doc, history = false) {
    const result = [], seen = new Set();
    for (const table of doc.querySelectorAll('table')) {
      const rows = [...table.rows];
      const header = rows.find(row => {
        const labels = [...row.cells].map(cell => heading(cellText(cell)));
        return (labels.includes('coursecode') || labels.includes('course')) && labels.some(label => /^(credits?|c|ltpj?c)$/.test(label));
      });
      if (!header) continue;
      const labels = [...header.cells].map(cell => heading(cellText(cell)));
      const index = pattern => labels.findIndex(label => pattern.test(label));
      const code = index(/^(coursecode|course)$/), name = index(/^(coursetitle|coursename)$/), credit = index(/^(credits?|c|ltpj?c)$/);
      const grade = index(/^(grade|lettergrade)$/), semester = index(/^(semester|sem|term|exammonth|exammonthyear|monthyear)$/), type = index(/^(coursetype|type)$/), category = index(/^(category|coursecategory|coursedistribution|distribution)$/);
      if (history && grade < 0) continue;
      for (const row of rows.slice(rows.indexOf(header) + 1)) {
        const cells = [...row.cells].map(cellText);
        // History has separate code/title columns; Time Table combines them
        // with a trailing course type, e.g. CODE - Title ( Theory Only ).
        const combined = labels[code] === 'course';
        const match = combined ? cells[code]?.match(/^([A-Z]{2,}\d+[A-Z]*)\s*[-–—]\s*(.*?)(?:\s*\(\s*([^()]+)\s*\))?$/i) : null;
        const courseCode = combined ? match?.[1] : cells[code];
        const courseType = combined ? clean(match?.[3]) : cells[type] || '';
        const numbers = cells[credit]?.match(/\d+(?:\.\d+)?/g) || [];
        // C is the last value in the combined L T P J C cell, including fractional credits.
        const creditText = /^ltpj?c$/.test(labels[credit]) ? numbers.at(-1) : cells[credit];
        const credits = Number(creditText);
        if (!courseCode || !/^[A-Z]{2,}\d/i.test(courseCode) || !creditText || !Number.isFinite(credits) || credits < 0) continue;
        const term = semester >= 0 ? cells[semester] : '';
        const key = [term, courseCode, courseType].join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        result.push({ code: courseCode, name: combined ? clean(match[2]) : cells[name] || courseCode, credits, grade: cells[grade] || '', semester: term || 'Previous semesters', type: courseType, category: cells[category] || '', nonGraded: /\bNGCR\b|non[ -]?graded/i.test(cells[category] || '') });
      }
    }
    return result;
  }
  // NGCR is excluded regardless of the chosen grade. F still adds credits
  // with zero points; keep raw totals so rounding happens only for display.
  function totals(courses) {
    return courses.reduce((sum, course) => {
      if (course.nonGraded || !Object.hasOwn(points, course.grade) || !Number.isFinite(course.credits) || course.credits <= 0) return sum;
      sum.credits += course.credits; sum.points += course.credits * points[course.grade];
      return sum;
    }, { credits: 0, points: 0 });
  }
  // Grade History's CGPA Details table: VTOP's own CGPA, the reference the projection must agree with.
  function official(doc) {
    for (const table of doc.querySelectorAll('table')) {
      const rows = [...table.rows], header = rows.findIndex(row => [...row.cells].some(cell => heading(cellText(cell)) === 'cgpa'));
      if (header < 0 || !rows[header + 1]) continue;
      const labels = [...rows[header].cells].map(cell => heading(cellText(cell))), cells = [...rows[header + 1].cells].map(cellText);
      const cgpa = Number(cells[labels.indexOf('cgpa')]), earned = Number(cells[labels.indexOf('creditsearned')]);
      if (Number.isFinite(cgpa) && cgpa > 0 && cgpa <= 10) return { cgpa, creditsEarned: Number.isFinite(earned) ? earned : null };
    }
    return null;
  }
  // Past grade points for the projection. The recomputed total is exact; if it disagrees with VTOP's
  // published CGPA beyond rounding (a grading rule we cannot see), VTOP's figure wins.
  function previous(history, reference) {
    const past = totals(history);
    if (!reference || !past.credits || Math.abs(past.points / past.credits - reference.cgpa) < 0.005) return past;
    return { credits: past.credits, points: reference.cgpa * past.credits };
  }
  // Only grade choices survive reloads. Ignore retired scenario fields and plans.
  function validatePredictions(value) {
    const result = Object.create(null);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
    for (const [term, list] of Object.entries(value).slice(0, 100)) {
      if (!term.startsWith('term:') || term.length > 300 || !Array.isArray(list)) continue;
      result[term] = list.slice(0, 200).filter(course => course && typeof course.code === 'string' && course.code.length <= 100 && Object.hasOwn(points, course.grade))
        .map(course => ({ code: course.code, type: typeof course.type === 'string' ? course.type.slice(0, 100) : '', grade: course.grade }));
    }
    return result;
  }
  // VIT's academic year runs Fall (Jul–Nov), Winter (Dec–Apr), then Summer (May–Jun).
  function termOrder(label) {
    const term = clean(label).toLowerCase().replace(/[–—]/g, '-').match(/\b(fall|winter|summer)\b.*?\b(\d{4})\s*[-/]\s*\d{2,4}\b/);
    return term ? Number(term[2]) * 3 + { fall: 0, winter: 1, summer: 2 }[term[1]] : null;
  }
  // The semester in progress: the latest offered term that has already started, so a newly listed future
  // term isn't picked. Unrecognised labels fall back to VTOP's own first choice.
  function currentTerm(choices, now = new Date()) {
    const month = now.getMonth() + 1, start = month >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    const today = start * 3 + (month >= 7 && month <= 11 ? 0 : month === 12 || month <= 4 ? 1 : 2);
    const started = choices.map((choice, index) => ({ choice, index, order: termOrder(choice.label) }))
      .filter(item => item.order !== null && item.order <= today).sort((a, b) => b.order - a.order || a.index - b.index);
    return started[0]?.choice || choices[0] || null;
  }
  const api = { points, courses, totals, official, previous, validatePredictions, currentTerm };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VtopCgpa = api;
})(globalThis);
