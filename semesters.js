(function (root) {
  'use strict';
  const clean = text => (text || '').replace(/\s+/g, ' ').trim();
  function key(label) {
    const text = clean(label).toLowerCase().replace(/[–—]/g, '-');
    const term = text.match(/\b(fall|winter|summer|spring)\s*(?:semester|sem)?\s*(\d{4})\s*[-/]\s*(\d{2}|\d{4})\b/);
    if (term) return `${term[1]} ${term[2]}-${term[3].slice(-2)}`;
    return text.replace(/\s*[-(]?\s*(?:vlr|vellore)\)?\s*$/i, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function options(select) {
    return [...select.options].filter(option => !option.disabled && !option.parentElement?.disabled &&
      !['', '0', '-1'].includes(option.value.trim()) && !/choose|select|^all\b/i.test(clean(option.textContent)))
      .map(option => ({ value: option.value, label: clean(option.textContent) }));
  }
  function discover(doc) {
    return [...doc.querySelectorAll('select')].filter(select => !select.multiple && !select.disabled &&
      /semester/i.test([select.id, select.name, select.getAttribute('aria-label'),
        ...[...(select.labels || [])].map(label => label.textContent)].join(' ')));
  }
  function match(select, preference) {
    if (!preference?.value || !preference?.label) return null;
    const choices = options(select);
    const exact = choices.find(option => option.value === preference.value && key(option.label) === key(preference.label));
    if (exact) return exact;
    const equivalent = choices.filter(option => key(option.label) === key(preference.label));
    return equivalent.length === 1 ? equivalent[0] : null;
  }
  // Semester options from a fetched page fragment (e.g. Time Table), without running its scripts.
  function fromHTML(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return discover(doc).flatMap(options);
  }
  // Strictly read-only: pages that submit something (registrations, applications, payments…) are never
  // changed automatically, even though picking a semester there would normally only load a view.
  const transactionalPage = /registration|payment|refund|password|leave request|withdraw|enroll|application|apply|booking|mess|profile|bank|feedback|re-?exam/i;
  function transactional(select) {
    const doc = select.ownerDocument, container = doc.querySelector('#b5-pagewrapper, #page-wrapper, #page-content') || doc.body;
    const form = select.closest('form');
    const heading = clean(container.querySelector('h1,h2,h3,h4,h5,h6,.card-header,.panel-title')?.textContent);
    return transactionalPage.test(`${form?.id || ''} ${form?.getAttribute('name') || ''} ${heading}`);
  }
  const api = { key, options, discover, match, fromHTML, transactional };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VtopSemesters = api;
})(globalThis);
