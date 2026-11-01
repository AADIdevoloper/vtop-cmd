(function (root) {
  'use strict';
  // One visual language for the command menu, the PDF preview and the PDF viewer.
  const logo = "<svg xmlns=\"http://www.w3.org/2000/svg\" class=\"logo\" aria-hidden=\"true\" width=\"22\" height=\"22\" viewBox=\"0 0 128 128\" fill=\"none\">\n  <defs><linearGradient id=\"vtop-logo-bg\" x1=\"12\" y1=\"8\" x2=\"116\" y2=\"128\" gradientUnits=\"userSpaceOnUse\"><stop stop-color=\"#244B86\"/><stop offset=\"1\" stop-color=\"#101B34\"/></linearGradient></defs>\n  <rect x=\"2\" y=\"2\" width=\"124\" height=\"124\" rx=\"30\" fill=\"url(#vtop-logo-bg)\"/>\n  <rect x=\"3\" y=\"3\" width=\"122\" height=\"122\" rx=\"29\" stroke=\"#86B5FF\" stroke-opacity=\".22\" stroke-width=\"2\"/>\n  <path d=\"M29 40L59 88L92 39\" stroke=\"#F4F8FF\" stroke-width=\"11\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n  <path d=\"M78 32H97V51\" stroke=\"#61E1E3\" stroke-width=\"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n</svg>";
  const tokens = {
    light: '--surface:#fff;--text:#182438;--muted:#748093;--line:#e8ecf2;--hover:#f0f4fb;--accent:#3664d9;--backdrop:#eef1f6',
    dark: '--surface:#171d29;--text:#edf1fa;--muted:#97a4bb;--line:#2a3344;--hover:#242f46;--accent:#a9beff;--backdrop:#0e131c'
  };
  const font = '14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
  const nav = root.navigator || {};
  const mac = /Mac|iPhone|iPad/i.test(nav.userAgentData?.platform || nav.platform || '');
  // ⌘K on macOS, Ctrl+K on Windows/Linux (the Windows key belongs to the OS). `code` covers non-Latin layouts.
  const shortcut = {
    mac, label: mac ? '⌘ K' : 'Ctrl K', modifier: mac ? '⌘' : 'Ctrl',
    matches: event => (mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey) &&
      !event.altKey && !event.shiftKey && (event.key?.toLowerCase() === 'k' || event.code === 'KeyK')
  };
  const api = { logo, tokens, font, shortcut };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VtopBrand = api;
})(globalThis);
