// Repair legacy inline/inherited text colors after VTOP replaces a page or opens a detail view.
(function (root) {
  'use strict';
  const palette = {
    text: [237,242,252], ink: [16,21,31], white: [255,255,255], black: [0,0,0], red: [255,180,193],
    green: [152,230,181], blue: [174,203,255], amber: [255,224,162], purple: [223,186,255]
  };
  const parse = value => {
    const match = /^rgba?\(([^)]+)\)$/.exec(value || '');
    if (!match) return null;
    const parts = match[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
    return parts.length >= 3 && parts.every(Number.isFinite) ? [...parts.slice(0,3), parts[3] ?? 1] : null;
  };
  const blend = (front, back) => front.slice(0,3).map((v,i) => v * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
  const luminance = color => color.slice(0,3).map(v => {
    v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  }).reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i], 0);
  const contrast = (a,b) => (Math.max(luminance(a),luminance(b)) + .05) / (Math.min(luminance(a),luminance(b)) + .05);
  function replacement(foreground, background) {
    if (contrast(blend(foreground,background),background) >= 4.5) return null;
    const [r,g,b] = foreground, spread = Math.max(r,g,b) - Math.min(r,g,b);
    let hue = 'text';
    if (spread > 35) {
      hue = r > g * 1.2 && r > b * 1.1 ? 'red' : g > r * 1.15 && g > b * 1.05 ? 'green' :
        b > r * 1.15 && b > g * 1.05 ? 'blue' : r > b * 1.2 && g > b * 1.2 ? 'amber' : 'purple';
    }
    if (contrast(palette[hue],background) >= 4.5) return hue;
    if (contrast(palette.text,background) >= 4.5) return 'text';
    if (contrast(palette.ink,background) >= 4.5) return 'ink';
    return contrast(palette.white,background) >= contrast(palette.black,background) ? 'white' : 'black';
  }
  const lightSurface = color => color && color[3] >= .99 && luminance(color) > .5 && Math.max(...color.slice(0,3)) - Math.min(...color.slice(0,3)) < 30;
  const api = { parse, blend, luminance, contrast, replacement, palette, lightSurface };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }
  const doc = root.document;
  if (!doc || doc.documentElement.hasAttribute('data-vtop-readability-ready')) return;
  doc.documentElement.setAttribute('data-vtop-readability-ready','');
  let timer;
  const excluded = 'script,style,svg,canvas,iframe,video,picture,[hidden],[disabled],[aria-disabled="true"],.blockUI';
  function scan() {
    // Measure with transitions off: otherwise a button fading between its native and corrected colour reads as
    // readable mid-fade, loses its fix, fades back, and the next transitionend repeats it (visible flicker).
    doc.documentElement.setAttribute('data-vtop-readability-scan','');
    try { measure(); } finally { doc.documentElement.removeAttribute('data-vtop-readability-scan'); }
  }
  function measure() {
    // Attributes are our only changes: no native styles, form values or handlers are rewritten.
    doc.querySelectorAll('[data-vtop-readable]').forEach(e => e.removeAttribute('data-vtop-readable'));
    doc.querySelectorAll('[data-vtop-dark-surface]').forEach(e => e.removeAttribute('data-vtop-dark-surface'));
    if (!doc.documentElement.hasAttribute('data-vtop-command-dark')) return;
    const backgrounds = new WeakMap();
    function background(element) {
      if (!element) return [16,21,31];
      if (backgrounds.has(element)) return backgrounds.get(element);
      const css = root.getComputedStyle(element), parent = background(element.parentElement);
      // Do not guess contrast over images, gradients or faded/disabled content.
      const color = parse(css.backgroundColor);
      const value = !parent || css.backgroundImage !== 'none' && css.backgroundImage !== '' || Number(css.opacity || 1) < .9 ? null :
        color ? blend(color,parent) : parent;
      backgrounds.set(element,value); return value;
    }
    const scope = '#b5-pagewrapper,#page-holder,.modal.show,.dropdown-menu.show,.datepicker-dropdown';
    const candidates = new Set();
    doc.querySelectorAll(scope).forEach(container => {
      candidates.add(container); container.querySelectorAll('*').forEach(e => candidates.add(e));
    });
    // Some nested views have unnamed white/gray containers, outside the shared component classes.
    for (const element of candidates) {
      if (!element.matches('div,section,article,aside,header,footer,form,fieldset,legend,ul,ol') || element.closest(excluded) || !element.getClientRects().length) continue;
      const css = root.getComputedStyle(element);
      if (css.visibility === 'visible' && (!css.backgroundImage || css.backgroundImage === 'none') && lightSurface(parse(css.backgroundColor))) {
        element.setAttribute('data-vtop-dark-surface','');
      }
    }
    for (const element of candidates) {
      if (element.closest(excluded) || !element.getClientRects().length) continue;
      const text = [...element.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!text && !element.matches('input,textarea,select,button')) continue;
      const css = root.getComputedStyle(element);
      if (css.visibility !== 'visible') continue;
      const foreground = parse(css.color), back = background(element);
      if (!foreground || !back) continue;
      const name = replacement(foreground,back);
      if (name) element.setAttribute('data-vtop-readable',name);
    }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(scan,120); }
  new MutationObserver(schedule).observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','style','color','hidden','disabled','aria-disabled','data-vtop-command-dark']});
  doc.addEventListener('transitionend',schedule,true);
  schedule();
})(globalThis);
