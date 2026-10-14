(function(root){
'use strict';
const channel=a=>a.channel||(['deepseek','gemini','grok'].includes(a.provider)?'web':'subscription');
const id=a=>a.id||a.provider+':'+channel(a);
function windowFor(a,now=Date.now()){
 const windows=(a?.windows||[]).filter(w=>!w.component&&w.metricKind!=='limit');
 const usable=windows.filter(w=>w.remaining!=null&&(!w.observedAt||now-Date.parse(w.observedAt)<5*60000));
 return usable.find(w=>w.durationMins===10080)||usable[0]||windows[0]||null;
}
function selectAccount(accounts,settings={},now=Date.now()){
 const pinned=accounts.find(a=>id(a)===settings.widgetAccount);
 if(pinned)return pinned;
 const quality=a=>({live:0,observed:1,manual:2,cached:3,error:4,waiting:5}[a.status]??6);
 const deadline=a=>{const w=windowFor(a,now),at=Date.parse(w?.expiresAt||w?.resetAt);return w?.remaining>0&&at>now?at:Infinity;};
 return [...accounts].sort((a,b)=>quality(a)-quality(b)||deadline(a)-deadline(b)||id(a).localeCompare(id(b)))[0]||null;
}
const api={channel,id,windowFor,selectAccount};
if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasCompanion=api;
})(typeof window==='undefined'?globalThis:window);
