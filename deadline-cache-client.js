(() => {
  'use strict';
  globalThis.VtopDeadlineCache={create(){
    const runtime=globalThis.browser?.runtime||globalThis.chrome?.runtime;
    if(!runtime?.sendMessage)return null;
    const owner=()=>document.querySelector('#authorizedID')?.value||document.querySelector('#authorizedIDX')?.value||'';
    async function request(change){
      const id=owner();if(!id)throw Error('Not signed in');
      const result=await runtime.sendMessage({type:'vtop-deadline-cache',owner:id,...change});
      if(!result?.ok)throw Error('Session cache unavailable');
      return result;
    }
    return {get:()=>request({action:'get'}),update:change=>request({action:'update',...change})};
  }};
})();
