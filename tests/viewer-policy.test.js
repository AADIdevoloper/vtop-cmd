const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const root=__dirname+'/../';
test('extension documents prohibit remote network, executable code, and embedded objects',()=>{
 const manifest=JSON.parse(fs.readFileSync(root+'manifest.json','utf8'));
 const rules=Object.fromEntries(manifest.content_security_policy.extension_pages.split(';').filter(s=>s.trim()).map(s=>{const [key,...values]=s.trim().split(/\s+/);return[key,values];}));
 assert.deepEqual(rules['connect-src'],["'self'",'blob:','data:']);
 assert.deepEqual(rules['script-src'],["'self'"]);
 assert.deepEqual(rules['object-src'],["'none'"]);
 assert.deepEqual(rules['base-uri'],["'none'"]);
 assert.deepEqual(manifest.host_permissions,['https://vtop.vit.ac.in/*']);
 assert.equal(manifest.optional_host_permissions,undefined);
});
test('PowerPoint rendering blocks external media and retains lazy windowed rendering and ZIP limits',async()=>{
 const source=fs.readFileSync(root+'pptx-viewer.mjs','utf8').replace(/^import[^\n]+\n/,'').replace('export async function','async function');
 let args;const limits={maxEntries:100};const context={PptxViewer:{open:async(...a)=>{args=a;return 'viewer';}},RECOMMENDED_ZIP_LIMITS:limits,Uint8Array};
 vm.createContext(context);vm.runInContext(source,context);let cleared=false;
 assert.equal(await context.renderPptx(new ArrayBuffer(4),{replaceChildren(){cleared=true;}}),'viewer');
 assert.ok(cleared);assert.equal(args[2].externalMedia,'block');assert.equal(args[2].zipLimits,limits);
 assert.equal(args[2].lazySlides,true);assert.equal(args[2].lazyMedia,true);
 assert.equal(args[3].listOptions.windowed,true);assert.equal(args[3].listOptions.initialSlides,4);
});
