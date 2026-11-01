(() => {
  'use strict';
  if (document.getElementById('vtop-pdf-preview')) return;
  const host=document.createElement('div');host.id='vtop-pdf-preview';
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>
    :host{all:initial;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eaf0fa}*{box-sizing:border-box}dialog{position:fixed;inset:0;width:min(1200px,96vw);height:94vh;max-width:96vw;max-height:94vh;padding:0;margin:auto;border:1px solid #35435c;border-radius:14px;background:#171f2d;color:#eaf0fa;overflow:hidden}dialog::backdrop{background:#101827aa;backdrop-filter:blur(3px)}header{display:flex;gap:14px;align-items:center;padding:12px 16px;border-bottom:1px solid #35435c}h2{margin:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}button,a{font:inherit;padding:7px 12px;border:1px solid #4b5a73;border-radius:7px;background:#25334a;color:#edf3ff;text-decoration:none;cursor:pointer}button:focus-visible,a:focus-visible{outline:2px solid #a9beff}a[hidden]{display:none}.status{padding:14px 18px;color:#bdcbe0}.status:empty{display:none}iframe{width:100%;height:calc(100% - 58px);border:0;background:#293241}iframe[hidden]{display:none}
  </style><dialog aria-label="PDF preview"><header><h2>PDF preview</h2><a class="download" hidden>Download</a><button type="button" aria-label="Close PDF preview">Close</button></header><div class="status" role="status" aria-live="polite"></div><iframe title="PDF document viewer" hidden></iframe></dialog>`;
  document.documentElement.append(host);
  const dialog=shadow.querySelector('dialog'),frame=shadow.querySelector('iframe'),status=shadow.querySelector('.status'),download=shadow.querySelector('.download');
  const viewerURL=chrome.runtime.getURL('pdf-viewer.html');
  const parsedViewerURL=new URL(viewerURL);
  const viewerOrigin=parsedViewerURL.protocol==='chrome-extension:' ? `chrome-extension://${parsedViewerURL.host}` : parsedViewerURL.origin;
  let activeId,blobURL,previousFocus,nonce,bytes,filename;
  function release(){ if(blobURL)URL.revokeObjectURL(blobURL);blobURL=null;bytes=null;frame.src='about:blank';download.removeAttribute('href');download.hidden=true; }
  function close(){if(dialog.open)dialog.close();}
  shadow.querySelector('button').addEventListener('click',close);
  dialog.addEventListener('close',()=>{activeId=null;release();if(previousFocus?.isConnected)previousFocus.focus();});
  function show(id){
    if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();}
    activeId=id;release();shadow.querySelector('h2').textContent='PDF preview';status.textContent='Loading PDF…';frame.hidden=true;
  }
  window.addEventListener('message',async event=>{
    if(event.source===frame.contentWindow && event.origin===viewerOrigin && event.data?.nonce===nonce && event.data?.type==='viewer-ready'){
      if(bytes)frame.contentWindow.postMessage({type:'pdf-data',nonce,bytes:bytes.slice(0),filename},viewerOrigin);
      return;
    }
    const message=event.data;
    if(event.source!==window || event.origin!==location.origin || message?.source!=='vtop-command-pdf' || typeof message.id!=='string' || !/^pdf-\d+-\d+$/.test(message.id))return;
    if(message.kind==='loading'){show(message.id);return;}
    if(message.id!==activeId)return;
    if(message.kind==='not-pdf'){close();return;}
    if(message.kind==='error'){status.textContent='Unable to preview this document. Sign in again if needed, or Shift-click its original download link.';return;}
    if(message.kind!=='ready' || typeof message.blobUrl!=='string' || !message.blobUrl.startsWith(`blob:${location.origin}/`))return;
    const id=message.id;
    try{
      const response=await fetch(message.blobUrl);const data=await response.arrayBuffer();
      if(id!==activeId || !dialog.open)return;
      if(new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw new Error('Not PDF');
      filename=String(message.filename||'document.pdf').replace(/[\\/\x00-\x1f]/g,'_').slice(0,180);
      bytes=data;blobURL=URL.createObjectURL(new Blob([data],{type:'application/pdf'}));
      download.href=blobURL;download.download=filename;download.hidden=false;
      shadow.querySelector('h2').textContent=filename;
      nonce=crypto.randomUUID();frame.src=`${viewerURL}#${nonce}`;frame.hidden=false;status.textContent='';
    }catch{if(id===activeId)status.textContent='Unable to open this PDF. Retry the link, or Shift-click it to use the original download.';}
  });
  // Shortcut stays usable without placing the command menu behind an open preview.
  document.addEventListener('keydown',event=>{if(dialog.open&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k')close();},true);
})();
