(() => {
  'use strict';
  let queue=[],current=null,timer,sequence=0;
  const bridged=()=>document.documentElement.hasAttribute('data-vtop-runtime-ready');
  const blocked=()=>document.documentElement.getAttribute('data-vtop-page-busy')==='true'||[...document.querySelectorAll('.blockUI.blockOverlay,.blockUI.blockMsg,.modal-backdrop')].some(node=>{const css=getComputedStyle(node);return css.display!=='none'&&css.visibility!=='hidden'&&css.pointerEvents!=='none';});
  function schedule(){clearTimeout(timer);if(queue.length&&!current)timer=setTimeout(pump,50);}
  function pump(){
    if(current||!queue.length)return;
    if(bridged()&&blocked()){schedule();return;}
    const task=queue.shift(),element=task.resolve();
    if(!element?.isConnected){task.done(false);schedule();return;}
    if(task.kind==='change'&&element.value===task.value){task.done(true);schedule();return;}
    if(!bridged()){
      if(task.kind==='change'){element.value=task.value;element.dispatchEvent(new Event('change',{bubbles:true}));}else element.click();
      task.done(true);schedule();return;
    }
    current=task;task.token=`action-${++sequence}`;
    element.dispatchEvent(new CustomEvent('vtop-native-action',{bubbles:true,detail:JSON.stringify({token:task.token,kind:task.kind,value:task.value})}));
  }
  document.addEventListener('vtop-native-action-result',event=>{
    let message;try{message=JSON.parse(event.detail);}catch{return;}
    if(!current||message.token!==current.token)return;
    const task=current;current=null;
    if(message.status==='busy')queue.unshift(task);else task.done(message.status==='done');
    schedule();
  });
  function change(element,value){
    // Unbridged previews/tests retain native synchronous behavior.
    if(!bridged()){element.value=value;element.dispatchEvent(new Event('change',{bubbles:true}));return Promise.resolve(true);}
    if(current?.element===element&&current.value===value)return current.promise;
    const existing=queue.find(task=>task.element===element);
    if(existing){existing.value=value;return existing.promise;}
    let done;const promise=new Promise(resolve=>{done=resolve;});
    queue.push({kind:'change',element,value,resolve:()=>element,done,promise});schedule();return promise;
  }
  function navigate(resolve){
    // Navigation takes priority over pending automatic changes on the old page.
    for(const task of queue)task.done(false);queue=[];
    if(!bridged()){resolve()?.click();return;}
    queue.push({kind:'click',resolve,done:()=>{}});schedule();
  }
  globalThis.VtopPageActions={change,navigate};
})();
