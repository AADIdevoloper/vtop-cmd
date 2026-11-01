const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const pause=()=>new Promise(resolve=>setTimeout(resolve,35));
function setup(){
 const html=fs.readFileSync(__dirname+'/../pdf-viewer.html','utf8');
 const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://vtop.vit.ac.in/pdf-viewer.html#scroll-test',pretendToBeVisual:true}),w=dom.window;
 const container=w.document.querySelector('#pages'),paints=[];let observer;
 Object.defineProperty(container,'clientWidth',{value:800});
 w.HTMLElement.prototype.getBoundingClientRect=function(){if(this===container)return{top:0,bottom:600};if(this.classList.contains('sheet')){const top=this.offsetTop-container.scrollTop;return{top,bottom:top+parseFloat(this.style.height)};}return{top:0,bottom:0};};
 Object.defineProperty(w.HTMLElement.prototype,'offsetTop',{get(){return this.classList.contains('sheet')?(Number(this.dataset.page)-1)*(parseFloat(this.style.height)+18):0;}});
 w.HTMLElement.prototype.scrollIntoView=function(){container.scrollTop=this.offsetTop;container.dispatchEvent(new w.Event('scroll'));};
 w.HTMLCanvasElement.prototype.getContext=()=>({});
 w.ResizeObserver=class{observe(){}};
 w.IntersectionObserver=class{constructor(callback){this.callback=callback;observer=this;}observe(element){this.callback([{target:element,isIntersecting:element.dataset.page==='1'}]);}};
 w.testPdf={GlobalWorkerOptions:{},getDocument:()=>({promise:Promise.resolve({numPages:3,getPage:async number=>({getViewport:({scale})=>({width:600*scale,height:800*scale}),render:()=>{paints.push(number);return{promise:Promise.resolve(),cancel(){}};},getTextContent:async()=>({items:[{str:`Sample page ${number}`} ]})})})})};
 let source=fs.readFileSync(__dirname+'/../pdf-viewer.mjs','utf8').replace(/^import \* as pdfjs[^\n]+\n/,'const pdfjs=window.testPdf;\n').replaceAll('import.meta.url',JSON.stringify('https://vtop.vit.ac.in/pdf-viewer.mjs'));
 w.eval(source);
 w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:'https://vtop.vit.ac.in',data:{type:'pdf-data',nonce:'scroll-test',bytes:new w.ArrayBuffer(8)}}));
 return{dom,w,container,paints,entries:entries=>observer.callback(entries)};
}
test('continuous viewer creates every page in one scroll container and renders only nearby pages',async()=>{
 const {dom,w,container,paints,entries}=setup();await pause();
 const pages=[...container.querySelectorAll('.sheet')];assert.equal(pages.length,3);assert.ok(paints.includes(1));assert.ok(!paints.includes(3));
 container.scrollTop=pages[2].offsetTop;entries([{target:pages[0],isIntersecting:false},{target:pages[2],isIntersecting:true}]);await pause();
 assert.equal(pages[0].querySelector('canvas').width,0);assert.ok(pages[2].querySelector('canvas').width>0);assert.equal(w.document.querySelector('#page').value,'3');assert.equal(w.document.querySelector('#next').disabled,true);dom.window.close();
});
test('page controls scroll within the full document instead of replacing a single canvas',async()=>{
 const {dom,w,container}=setup();await pause();const original=[...container.children];
 w.document.querySelector('#next').click();await pause();assert.equal(w.document.querySelector('#page').value,'2');assert.ok(container.scrollTop>0);assert.equal(container.children.length,3);assert.equal(container.children[0],original[0]);
 const input=w.document.querySelector('#page');input.value='3';input.dispatchEvent(new w.Event('change'));await pause();assert.equal(container.children[2],original[2]);assert.equal(input.value,'3');dom.window.close();
});
test('zoom resizes all page placeholders while retaining continuous page order',async()=>{
 const {dom,w,container}=setup();await pause();const pages=[...container.children],width=parseFloat(pages[0].style.width);
 w.document.querySelector('#zoom-in').click();await pause();assert.ok(parseFloat(pages[0].style.width)>width);
 assert.deepEqual([...container.children].map(page=>page.dataset.page),['1','2','3']);assert.equal(container.children[0],pages[0]);assert.equal(parseFloat(pages[0].style.width),parseFloat(pages[2].style.width));dom.window.close();
});
test('viewer acknowledges the document and reports when it has loaded',async()=>{
 const {dom,w}=setup(),types=[];w.addEventListener('message',event=>types.push(event.data?.type));await pause();
 assert.ok(types.includes('viewer-loaded'));assert.equal(w.document.querySelector('#status').textContent,'');dom.window.close();
});
