import * as pdfjs from './vendor/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
const $=selector=>document.querySelector(selector),nonce=location.hash.slice(1);
const parentOrigin=document.referrer?new URL(document.referrer).origin:'https://vtop.vit.ac.in';
const container=$('#pages'),states=[],nearby=new Set();
let pdf,pageNumber=1,scale=1,received=false,autoFit=true,lastFitWidth=0,generation=0,running=false,scrollFrame;
function status(text){$('#status').textContent=text;}
function controls(){
 $('#page').value=pageNumber;$('#previous').disabled=pageNumber===1;$('#next').disabled=pageNumber===pdf.numPages;$('#zoom').textContent=`${Math.round(scale*100)}%`;
}
function dimensions(state){state.element.style.width=`${state.width*scale}px`;state.element.style.height=`${state.height*scale}px`;}
function clearCanvas(state){
 if(state.task){state.task.cancel();state.task=null;}
 state.canvas.width=state.canvas.height=0;state.rendered=false;
 state.placeholder.hidden=false;state.placeholder.textContent=`Page ${state.number}`;
}
function updateCurrent(){
 if(!pdf)return;const bounds=container.getBoundingClientRect();let best=null,distance=Infinity;
 for(const state of nearby){const rect=state.element.getBoundingClientRect();if(rect.bottom<=bounds.top||rect.top>=bounds.bottom)continue;
  const value=Math.abs(Math.max(rect.top,bounds.top)-bounds.top);
  if(value<distance){distance=value;best=state;}
 }
 if(best){pageNumber=best.number;controls();}
}
async function paint(){
 if(running||!pdf)return;running=true;
 try{
  while(true){
   const state=[...nearby].find(item=>!item.rendered&&!item.failed);if(!state)break;
   const version=generation;state.rendered=true;
   try{
    const page=await pdf.getPage(state.number);if(version!==generation)continue;
    const base=page.getViewport({scale:1});state.width=base.width;state.height=base.height;dimensions(state);
    const viewport=page.getViewport({scale});
    const ratio=Math.min(devicePixelRatio||1,2,Math.sqrt(8000000/(viewport.width*viewport.height)));
    state.canvas.width=Math.ceil(viewport.width*ratio);state.canvas.height=Math.ceil(viewport.height*ratio);
    state.canvas.style.width=`${viewport.width}px`;state.canvas.style.height=`${viewport.height}px`;
    const task=page.render({canvasContext:state.canvas.getContext('2d'),viewport,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});state.task=task;
    await task.promise;state.task=null;if(version!==generation)continue;
    state.placeholder.hidden=true;
    const text=await page.getTextContent();if(version===generation)state.text.textContent=text.items.map(item=>item.str||'').join(' ');
    if(!nearby.has(state))clearCanvas(state);
   }catch(error){
    if(version!==generation||error.name==='RenderingCancelledException'){state.rendered=false;continue;}
    state.failed=true;state.placeholder.hidden=false;state.placeholder.textContent=`Page ${state.number} could not be rendered. Download the original PDF above to read it.`;
   }
  }
 }finally{running=false;}
}
const observer=new IntersectionObserver(entries=>{
 for(const entry of entries){const state=states[Number(entry.target.dataset.page)-1];if(!state)continue;
  if(entry.isIntersecting)nearby.add(state);else{nearby.delete(state);if(!state.task)clearCanvas(state);}
 }
 updateCurrent();paint();
},{root:container,rootMargin:'800px 0px'});
function jump(number){
 if(!pdf||number<1||number>pdf.numPages)return;
 pageNumber=number;controls();const state=states[number-1];state.element.scrollIntoView({block:'start'});nearby.add(state);paint();
}
function reflow(){
 if(!pdf)return;const current=states[pageNumber-1];
 const offset=current?(container.scrollTop-current.element.offsetTop)/Math.max(1,parseFloat(current.element.style.height)):0;
 generation++;
 for(const state of states){clearCanvas(state);state.failed=false;dimensions(state);}
 controls();
 if(current)container.scrollTop=current.element.offsetTop+Math.max(0,offset)*current.height*scale;
 paint();
}
async function fit(){
 if(!pdf)return;autoFit=true;lastFitWidth=container.clientWidth;
 const first=await pdf.getPage(pageNumber),width=first.getViewport({scale:1}).width;
 scale=Math.max(.25,Math.min(4,(lastFitWidth-36)/width));reflow();
}
new ResizeObserver(()=>{if(pdf&&autoFit&&container.clientWidth!==lastFitWidth)fit();}).observe(container);
container.addEventListener('scroll',()=>{if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=null;updateCurrent();});},{passive:true});
window.addEventListener('message',async event=>{
 if(received||event.source!==parent||event.origin!==parentOrigin||event.data?.type!=='pdf-data'||event.data.nonce!==nonce||!(event.data.bytes instanceof ArrayBuffer))return;
 received=true;
 try{
  const task=pdfjs.getDocument({data:new Uint8Array(event.data.bytes),isEvalSupported:false,useWasm:false,useSystemFonts:true,cMapUrl:new URL('./vendor/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/standard_fonts/',import.meta.url).href});
  task.onPassword=(updatePassword,reason)=>{status(reason===2?'Incorrect password. Try again.':'This PDF is password protected.');$('#password-form').hidden=false;$('#password').focus();$('#password-form').onsubmit=event=>{event.preventDefault();updatePassword($('#password').value);$('#password').value='';$('#password-form').hidden=true;};};
  pdf=await task.promise;$('#total').textContent=`/ ${pdf.numPages}`;$('#page').max=pdf.numPages;
  const first=await pdf.getPage(1),base=first.getViewport({scale:1});
  lastFitWidth=container.clientWidth;scale=Math.max(.25,Math.min(4,(lastFitWidth-36)/base.width));
  for(let number=1;number<=pdf.numPages;number++){
   const element=document.createElement('section');element.className='sheet';element.dataset.page=number;element.setAttribute('role','group');element.setAttribute('aria-label',`PDF page ${number} of ${pdf.numPages}`);
   const canvas=document.createElement('canvas');canvas.setAttribute('role','img');canvas.setAttribute('aria-label',`PDF page ${number} of ${pdf.numPages}`);
   const placeholder=document.createElement('div');placeholder.className='page-placeholder';placeholder.textContent=`Page ${number}`;
   const text=document.createElement('div');text.className='sr-only';
   element.append(canvas,placeholder,text);container.append(element);
   const state={number,element,canvas,placeholder,text,width:base.width,height:base.height,rendered:false,task:null};states.push(state);dimensions(state);observer.observe(element);
  }
  for(const control of document.querySelectorAll('nav button,nav input'))control.disabled=false;
  status('');jump(1);
 }catch{status('This PDF could not be opened. You can still download the original using Download above.');}
});
$('#previous').addEventListener('click',()=>jump(pageNumber-1));
$('#next').addEventListener('click',()=>jump(pageNumber+1));
$('#page').addEventListener('change',()=>{const value=Number($('#page').value);if(pdf&&Number.isInteger(value)&&value>=1&&value<=pdf.numPages)jump(value);else $('#page').value=pageNumber;});
$('#zoom-in').addEventListener('click',()=>{autoFit=false;scale=Math.min(4,scale+.25);reflow();});
$('#zoom-out').addEventListener('click',()=>{autoFit=false;scale=Math.max(.25,scale-.25);reflow();});
$('#fit').addEventListener('click',fit);
parent.postMessage({type:'viewer-ready',nonce},parentOrigin);
