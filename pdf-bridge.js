// Runs in VTOP's MAIN world to preserve its authenticated download requests.
(() => {
  'use strict';
  const marker = '__vtopCommandPdfBridge';
  if (window[marker]) return;
  window[marker] = true;
  const originalOpen = window.open;
  const originalClick = HTMLAnchorElement.prototype.click;
  const originalSubmit = HTMLFormElement.prototype.submit;
  const nativeFetch = window.fetch.bind(window);
  const createURL = URL.createObjectURL.bind(URL);
  const revokeURL = URL.revokeObjectURL.bind(URL);
  const pdfBlobs = new Set();
  URL.createObjectURL = function (blob) {
    const url = createURL(blob);
    if (/application\/(?:pdf|octet-stream)/i.test(blob?.type || '')) pdfBlobs.add(url);
    return url;
  };
  URL.revokeObjectURL = function (url) { pdfBlobs.delete(url); return revokeURL(url); };
  let sequence = 0;
  let bypassClick = false;
  let downloadIntent = null;
  const downloadHint = value => /\bpdf\b|download|dwnld|curriculdown/i.test(value || '');
  function localURL(value) {
    try {const url=new URL(value,document.baseURI);return url.origin===location.origin&&url.pathname.startsWith('/vtop/');} catch {return false;}
  }
  function pendingDownload() {return downloadIntent && Date.now()-downloadIntent.time<10000;}
  function controlHint(control) {
    return control ? [control.id,control.name,control.textContent,control.getAttribute('aria-label'),control.getAttribute('title'),control.value].filter(Boolean).join(' ') : '';
  }
  function candidate(value) {
    try {
      const url = new URL(value, document.baseURI);
      return url.origin === location.origin && url.pathname.startsWith('/vtop/') &&
        /\.pdf$|download|dwnld|curriculdown|viewfile/i.test(decodeURIComponent(url.pathname));
    } catch { return false; }
  }
  function filename(header, fallback = 'document.pdf') {
    const encoded = header?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
    const plain = header?.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
    let name = encoded || plain?.[1] || plain?.[2] || fallback;
    try { if (encoded) name = decodeURIComponent(name); } catch {}
    return name.replace(/[\\/\x00-\x1f]/g, '_').trim().slice(0,180) || fallback;
  }
  function emit(kind, id, extra = {}) { window.postMessage({ source: 'vtop-command-pdf', kind, id, ...extra }, location.origin); }
  function download(blob, name) {
    const url = createURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.dataset.vtopPdfBypass = 'true';
    document.documentElement.append(anchor); originalClick.call(anchor); anchor.remove();
    setTimeout(() => revokeURL(url),60000);
  }
  async function preview(url, init, suggestedName) {
    downloadIntent=null;
    const id = `pdf-${Date.now()}-${++sequence}`;
    emit('loading',id);
    try {
      const response = await nativeFetch(url,{credentials:'same-origin',...init});
      if (!response.ok) throw new Error('The document could not be loaded. Your VTOP session may have expired.');
      const blob = await response.blob();
      const signature = new Uint8Array(await blob.slice(0,5).arrayBuffer());
      const isPdf = signature.length === 5 && String.fromCharCode(...signature) === '%PDF-';
      const name = filename(response.headers.get('content-disposition'), suggestedName || (isPdf ? 'document.pdf' : 'download'));
      if (!isPdf) {
        if (/text\/html|application\/json/i.test(blob.type)) throw new Error('VTOP returned a page instead of a document. Sign in again and retry.');
        download(blob,name); emit('not-pdf',id); return;
      }
      const blobUrl = createURL(new Blob([blob],{type:'application/pdf'}));
      emit('ready',id,{blobUrl,filename:name});
      setTimeout(() => revokeURL(blobUrl),60000);
    } catch (error) { emit('error',id,{message:error.message || 'Unable to preview this document.'}); }
  }
  function handleAnchor(anchor) {
    if (bypassClick || anchor.dataset.vtopPdfBypass === 'true') return false;
    const rawHref=anchor.getAttribute('href')||'';
    // Menu entries and JavaScript helpers must run their native handlers first.
    if(!rawHref||/^\s*(?:#|javascript:)/i.test(rawHref)||anchor.matches('.systemB5BtnMenu,.systemBtnMenu,.quickB5MainMenu,[data-bs-toggle]'))return false;
    const url = anchor.href;
    const isBlob = url.startsWith(`blob:${location.origin}/`) && (/\.pdf$/i.test(anchor.download) || pdfBlobs.has(url));
    const isDataPdf=/^data:application\/pdf(?:[;,])/i.test(url);
    const explicitFile=localURL(url)&&(anchor.hasAttribute('download')||anchor.type==='application/pdf'||downloadHint(controlHint(anchor)));
    if (!candidate(url) && !isBlob && !isDataPdf && !explicitFile) return false;
    preview(url,undefined,anchor.download || undefined); return true;
  }
  window.open = function (url, ...args) {
    if (!bypassClick && (candidate(url) || pdfBlobs.has(url) || /^data:application\/pdf(?:[;,])/i.test(String(url)) || localURL(url)&&pendingDownload())) { preview(new URL(url,document.baseURI).href); return null; }
    return originalOpen.call(this,url,...args);
  };
  HTMLAnchorElement.prototype.click = function (...args) {
    if (!handleAnchor(this)) return originalClick.apply(this,args);
  };
  document.addEventListener('click',event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      downloadIntent=null;bypassClick=true;setTimeout(()=>{bypassClick=false;},0);return;
    }
    const control=event.target.closest?.('button,a,input[type="button"],input[type="submit"],[role="button"]');
    downloadIntent=downloadHint(controlHint(control))?{time:Date.now()}:null;
    if (event.defaultPrevented || event.button !== 0) return;
    const anchor = event.target.closest?.('a[href]');
    if (anchor && handleAnchor(anchor)) { event.preventDefault(); event.stopImmediatePropagation(); }
  },true);
  function handleForm(form, submitter) {
    if(bypassClick)return false;
    const url = new URL(submitter?.getAttribute('formaction') || form.action,document.baseURI);
    const intendedDownload=downloadHint(`${form.id} ${form.name} ${controlHint(submitter)}`)||pendingDownload();
    if (!localURL(url.href) || (!candidate(url.href)&&!intendedDownload) || form.querySelector('input[type=file]')) return false;
    const method = (submitter?.getAttribute('formmethod') || form.method || 'get').toUpperCase();
    if (!['GET','POST'].includes(method)) return false;
    const fields = new FormData(form);
    if (submitter?.name) fields.append(submitter.name,submitter.value);
    const params = new URLSearchParams(fields);
    if (method === 'GET') { for (const [key,value] of params) url.searchParams.append(key,value); preview(url.href); }
    else if (form.enctype === 'multipart/form-data') preview(url.href,{method,body:fields});
    else if (form.enctype === 'application/x-www-form-urlencoded') preview(url.href,{method,body:params});
    else return false;
    return true;
  }
  HTMLFormElement.prototype.submit = function (...args) { if (!handleForm(this)) return originalSubmit.apply(this,args); };
  document.addEventListener('submit',event=>{
    if (!event.defaultPrevented && handleForm(event.target,event.submitter)) {event.preventDefault();event.stopImmediatePropagation();}
  },true);
})();
