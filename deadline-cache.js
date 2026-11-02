// Firefox does not expose storage.session to content scripts. Keep it privileged and relay only deadline data.
(() => {
  'use strict';
  const api=globalThis.browser||chrome;
  const memory=new Map();let queue=Promise.resolve();
  function sanitize(entries){
    const result=Object.create(null),now=Date.now();
    for(const [id,entry] of Object.entries(entries||{}).slice(0,500)){
      if(['__proto__','constructor','prototype'].includes(id)||!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!Number.isFinite(entry?.expires)||entry.expires<=now||entry.expires>now+5*3600000+5000||!Array.isArray(entry.records)||entry.records.length>100)continue;
      const records=entry.records.filter(r=>typeof r?.title==='string'&&r.title.length<=500&&Number.isFinite(r.time)&&typeof r.submitted==='boolean')
        .map(r=>({title:r.title,time:r.time,dateOnly:!!r.dateOnly,submitted:r.submitted}));
      result[id]={records,expires:entry.expires};
    }
    return result;
  }
  async function update(message){
    const key=`deadlineCache:${message.owner}`;
    let entries=memory.get(key)||{};
    try{entries=(await api.storage.session?.get(key))?.[key]||entries;}catch{/* Background-memory fallback; never write deadlines to disk. */}
    entries=sanitize(entries);
    if(message.action==='update'){
      if(message.clear===true)entries={};
      for(const id of Array.isArray(message.remove)?message.remove:[])delete entries[id];
      Object.assign(entries,sanitize(message.put));
      memory.set(key,entries);
      try{await api.storage.session?.set({[key]:entries});}catch{/* Memory remains usable. */}
    }
    return {ok:true,deadlineCache:entries};
  }
  api.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type!=='vtop-deadline-cache')return;
    if(sender.id!==api.runtime.id||!/^https:\/\/vtop\.vit\.ac\.in\/vtop\//.test(sender.url||'')||
       !['get','update'].includes(message.action)||typeof message.owner!=='string'||!message.owner||message.owner.length>200||/[\x00-\x1f]/.test(message.owner)){
      reply({ok:false});return;
    }
    queue=queue.catch(()=>{}).then(()=>update(message));
    queue.then(reply,()=>reply({ok:false}));return true;
  });
})();
