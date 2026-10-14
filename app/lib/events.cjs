'use strict';
const {createHash}=require('node:crypto');
const {publicTiming}=require('./public-timing.cjs');
function canonicalUrl(value){try{const u=new URL(value);if(u.protocol!=='https:')return null;if(!/^#(?:20\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(u.hash))u.hash='';u.search='';if(['twitter.com','www.twitter.com','x.com','www.x.com','mobile.twitter.com'].includes(u.hostname)){const status=u.pathname.match(/\/status\/(\d+)/);if(status)return 'https://x.com/i/status/'+status[1];}return u.origin+u.pathname.replace(/\/$/,'')+u.hash;}catch{return null;}}
const family=kind=>['reset','teaser'].includes(kind)?'reset':kind;
const phaseRank={pending:0,announced:1,active:2,reported:3,resolved:4};
function timing(data){const parsed=publicTiming((data.title||'')+' '+(data.detail||''),data.announcedAt,data.publishedPrecision);const explicit=data.effectiveAt||data.expectedAt||data.resetAt||parsed.effectiveAt;let effectiveAt=explicit?new Date(typeof explicit==='number'&&explicit<1e12?explicit*1000:explicit):null;if(effectiveAt&&!Number.isFinite(+effectiveAt))effectiveAt=null;let precision=data.precision||data.timePrecision||parsed.precision||(effectiveAt?'exact':'unknown');let timeHint=data.timeHint?String(data.timeHint).slice(0,160):null;let referenceAt=null;
 if(precision==='announcement_fallback'){referenceAt=effectiveAt&&Number.isFinite(+effectiveAt)?effectiveAt.toISOString():null;effectiveAt=null;}
 const text=(data.title||'')+' '+(data.detail||'');if(!effectiveAt&&data.publishedPrecision!=='date'&&(data.phase==='pending'||data.kind==='teaser')){
  const en=text.match(/\bin\s+(?:(?:about|around|approximately)\s+)?(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b/i),zh=text.match(/(?:约|大约|大概|预计)?(\d+(?:\.\d+)?)\s*(小时|分钟)(?:后|内)/);
  const match=en||zh;const announced=new Date(data.announcedAt);if(match&&Number.isFinite(+announced)){const minutes=/hour|hr|小时/i.test(match[2])?Number(match[1])*60:Number(match[1]);if(minutes>0&&minutes<=7*24*60){effectiveAt=new Date(+announced+minutes*60000);precision='approximate';}}
  if(!effectiveAt&&!timeHint){const hint=text.match(/tonight|this afternoon|this evening|later today|今晚|今天中午|今日中午|今天下午|今日下午|接下来几小时/i);if(hint)timeHint=hint[0];}
 }
 return {effectiveAt:effectiveAt&&Number.isFinite(+effectiveAt)?effectiveAt.toISOString():null,precision,timeHint,referenceAt,parsedExpiresAt:parsed.expiresAt||null,expiryPrecision:data.expiryPrecision||parsed.expiryPrecision||null};
}
function mergeEvents(input){
 const events=input.filter(Boolean).map(e=>e.precision==='announcement_fallback'&&e.effectiveAt?{...e,effectiveAt:null,referenceAt:e.effectiveAt}:e);const parents=events.map((_,i)=>i);const aliases=new Map();
 const find=i=>parents[i]===i?i:(parents[i]=find(parents[i]));const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[b]=a;};
 events.forEach((e,i)=>{const urls=[e.sourceUrl,...(e.relatedSourceUrls||[])].map(canonicalUrl).filter(Boolean);const keys=urls.map(u=>e.provider+':url:'+u);if(e.campaignId)keys.push(e.provider+':campaign:'+e.campaignId);for(const key of keys){if(aliases.has(key))union(i,aliases.get(key));else aliases.set(key,i);}});
 events.forEach((done,i)=>{
  if(family(done.kind)!=='reset'||!['reported','resolved'].includes(done.phase)||done.sourceStale)return;
  const roots=new Map();
  events.forEach((planned,j)=>{if(done.provider!==planned.provider||find(i)===find(j)||family(planned.kind)!=='reset'||planned.phase!=='pending'||planned.sourceStale||done.campaignId&&planned.campaignId&&done.campaignId!==planned.campaignId)return;
   const expected=new Date(planned.effectiveAt),reported=new Date(done.effectiveAt||done.announcedAt);if(!planned.effectiveAt||!Number.isFinite(+reported)||Math.abs(reported-expected)>2*3600000)return;
   if(done.plans?.length&&planned.plans?.length&&[...done.plans].sort().join()!==[...planned.plans].sort().join())return;
   const generic=s=>!s||/未说明|待核实|unknown|under review/i.test(s);if(!generic(done.scope)&&!generic(planned.scope)&&done.scope.trim().toLowerCase()!==planned.scope.trim().toLowerCase())return;
   roots.set(find(j),j);
  });
  if(roots.size===1)union(i,[...roots.values()][0]);
 });
 const groups=new Map();events.forEach((e,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(e);});
 return [...groups.values()].map(members=>{
  members.sort((a,b)=>new Date(a.announcedAt)-new Date(b.announcedAt));const fresh=members.filter(e=>!e.sourceStale);const pool=fresh.length?fresh:members;
  const ranked=[...pool].sort((a,b)=>(phaseRank[b.phase]??1)-(phaseRank[a.phase]??1)||new Date(b.sourceCheckedAt||b.announcedAt)-new Date(a.sourceCheckedAt||a.announcedAt));const latest=ranked[0],first=members[0];
  const direct=pool.filter(e=>e.sourceRoute==='direct'&&['official','public'].includes(e.evidence));const preferred=direct.sort((a,b)=>Number(b.evidence==='official')-Number(a.evidence==='official')||new Date(b.sourceCheckedAt||b.announcedAt)-new Date(a.sourceCheckedAt||a.announcedAt))[0];
  const variants=members.map(e=>({source:e.source,kind:e.kind,phase:e.phase,checkedAt:e.sourceCheckedAt,stale:e.sourceStale,sourceUrl:e.sourceUrl,announcedAt:e.announcedAt,effectiveAt:e.effectiveAt,precision:e.precision,sourceRoute:e.sourceRoute,firstSeenAt:e.firstSeenAt,lastChangedAt:e.lastChangedAt,evidence:e.evidence}));
  const typeConflict=pool.some(e=>family(e.kind)!==family(pool[0].kind));
  const exact=pool.filter(e=>e.effectiveAt&&e.precision==='exact');const timeConflict=exact.some(a=>exact.some(b=>a.source!==b.source&&a.phase===b.phase&&Math.abs(new Date(a.effectiveAt)-new Date(b.effectiveAt))>60000));
  const scopeConflict=pool.some(a=>pool.some(b=>a.channels?.length&&b.channels?.length&&!a.channels.some(c=>b.channels.includes(c))));
  const conflict=typeConflict||timeConflict||scopeConflict;const timePick=[...pool].filter(e=>e.effectiveAt).sort((a,b)=>new Date(b.sourceCheckedAt||b.announcedAt)-new Date(a.sourceCheckedAt||a.announcedAt))[0];
  const anchor=canonicalUrl(first.sourceUrl);const id=createHash('sha256').update(first.provider+':'+(first.campaignId||anchor)).digest('hex').slice(0,20);
  const firstSeenAt=members.map(e=>e.firstSeenAt).filter(Boolean).sort()[0]||null;
  return {...latest,...(preferred?{sourceUrl:preferred.sourceUrl,source:preferred.source,sourceRoute:preferred.sourceRoute,evidence:preferred.evidence,originalText:preferred.originalText}:{}),firstSeenAt,lastChangedAt:members.map(e=>e.lastChangedAt).filter(Boolean).sort().at(-1)||null,id,title:first.title,titles:first.titles,titleKey:first.titleKey,detail:latest.detail||first.detail,announcedAt:first.announcedAt,kind:family(latest.kind)==='reset'?'reset':latest.kind,effectiveAt:timePick?.effectiveAt||null,precision:timePick?.precision||latest.precision,timeHint:timePick?.timeHint||pool.find(e=>e.timeHint)?.timeHint||null,referenceAt:pool.find(e=>e.referenceAt)?.referenceAt||null,expiresAt:pool.find(e=>e.expiresAt)?.expiresAt||null,plans:latest.plans||members.find(e=>e.plans)?.plans||null,scope:members.find(e=>e.scope&&!/未说明|unknown|not specified/i.test(e.scope))?.scope||latest.scope,variants,conflict,phase:conflict?'disputed':latest.phase,sourceStale:!fresh.length,history:members.map(e=>({phase:e.phase,at:e.announcedAt,source:e.source,url:e.sourceUrl})),hasProgress:members.some(e=>e.phase==='pending')&&members.some(e=>['reported','resolved'].includes(e.phase))};
 }).sort((a,b)=>new Date(b.announcedAt)-new Date(a.announcedAt));
}
module.exports={canonicalUrl,timing,mergeEvents};
