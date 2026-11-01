// MAIN-world coordination: run native VTOP handlers only when the page is idle.
(() => {
  'use strict';
  let requests=0,active=null;
  const state=()=>{const root=document.documentElement;if(root){root.setAttribute('data-vtop-runtime-ready','true');root.setAttribute('data-vtop-page-busy',String(requests>0||Number(window.jQuery?.active||0)>0||!!active));}};
  const begin=()=>{requests++;state();};
  const end=()=>{requests=Math.max(0,requests-1);state();};
  if(window.fetch){const native=window.fetch;window.fetch=function(...args){begin();try{return Promise.resolve(native.apply(this,args)).then(response=>{
    // fetch resolves at headers; keep the gate closed until the body has arrived too.
    if(typeof response.clone==='function'&&response.body){
      try{
        const reader=response.clone().body.getReader();
        (async()=>{try{while(!(await reader.read()).done){}}finally{reader.releaseLock();end();}})().catch(()=>{});
      }catch{end();}
    }else end();
    return response;
  },error=>{end();throw error;});}catch(error){end();throw error;}};}
  const nativeSend=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send=function(...args){begin();let ended=false;const finish=()=>{if(ended)return;ended=true;this.removeEventListener('loadend',finish);end();};this.addEventListener('loadend',finish);try{return nativeSend.apply(this,args);}catch(error){finish();throw error;}};
  const visible=element=>{const css=getComputedStyle(element);return css.display!=='none'&&css.visibility!=='hidden'&&css.pointerEvents!=='none';};
  const blockers=()=>[...document.querySelectorAll('.blockUI.blockOverlay,.blockUI.blockMsg,.modal-backdrop')].filter(visible);
  function reply(token,status){document.dispatchEvent(new CustomEvent('vtop-native-action-result',{detail:JSON.stringify({token,status})}));}
  document.addEventListener('vtop-native-action',event=>{
    let message;try{message=JSON.parse(event.detail);}catch{return;}
    const element=event.target;
    if(!/^action-\d+$/.test(message?.token)||!element?.isConnected)return;
    if(message.kind==='change' ? !(element instanceof HTMLSelectElement)||![...element.options].some(o=>o.value===message.value&&!o.disabled) : message.kind!=='click'||!element.matches('a.systemB5BtnMenu[data-url],a.systemBtnMenu[data-url],a.quickB5MainMenu[data-url],a[onclick*="home()"]')){reply(message.token,'skipped');return;}
    if(active||requests||Number(window.jQuery?.active||0)||blockers().length){reply(message.token,'busy');return;}
    const task={token:message.token,started:Date.now(),before:new Set(document.querySelectorAll('.blockUI')),failed:false};active=task;state();
    const onError=()=>{task.failed=true;};window.addEventListener('error',onError);
    const finish=status=>{window.removeEventListener('error',onError);if(active===task)active=null;state();reply(message.token,status);};
    try{if(message.kind==='change'){element.value=message.value;element.dispatchEvent(new Event('change',{bubbles:true}));}else element.click();}catch{task.failed=true;}
    function settle(){
      const busy=requests>0||Number(window.jQuery?.active||0)>0;
      if(!busy){
        // Only clean up a blocker introduced by this action, after every request has settled.
        const owned=[...document.querySelectorAll('.blockUI')].filter(node=>!task.before.has(node));
        if(owned.length&&!document.querySelector('.modal.show')){
          if(typeof window.jQuery?.unblockUI==='function')window.jQuery.unblockUI({fadeOut:0});
          else owned.forEach(node=>node.remove());
        }
        finish(task.failed?'error':'done');return;
      }
      if(Date.now()-task.started>30000){finish('timeout');return;}
      setTimeout(settle,60);
    }
    setTimeout(settle,80);
  },true);
  state();document.addEventListener('DOMContentLoaded',state,{once:true});
})();
