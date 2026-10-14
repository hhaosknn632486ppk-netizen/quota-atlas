'use strict';
const {hash}=require('./domain.cjs');
const WEB_PROVIDERS={
 claude:{url:'https://claude.ai/settings/usage',host:'claude.ai'},
 deepseek:{url:'https://chat.deepseek.com/',host:'chat.deepseek.com'},
 gemini:{url:'https://gemini.google.com/',host:'gemini.google.com'},
 grok:{url:'https://grok.com/dashboard',host:'grok.com'}
};
// Runs inside a sandboxed provider window. Only returns quota fields, never
// cookies, account details, conversation text or the page's complete text.
function collectPageQuota(){
 const quota=/usage\s*(?:limits?|quota)|quota|使用(?:量|额度|限额)|用量|额度|利用(?:枠|上限|状況)|사용량|이용\s*한도/i;
 const remaining=/remaining|left\b|剩余|剩餘|残り|남(?:은|음)/i;
 const used=/\bused\b|consumed|已用|已使用|已消耗|使用済み|사용(?:됨|한|량)/i;
 const week=/weekly|week\b|每周|本周|周额度|週間|주간/i;
 const five=/5[ -]?(?:hour|hr)|5\s*小时|5\s*時間|5\s*시간/i;
 const values=[];
 function add(percent,context,usedDirection){if(!Number.isFinite(percent)||percent<0||percent>100)return;const weekly=week.test(context),fiveHour=five.test(context);if(weekly&&fiveHour)return;const nameKey=weekly?'weekly':fiveHour?'fiveHour':'quotaWindow';values.push({nameKey,remaining:Math.round((usedDirection?100-percent:percent)*100)/100,unit:'%'});}
 function contextFor(el,section,own){let context=own,p=el.parentElement;for(let i=0;i<4&&p&&section.contains(p);i++,p=p.parentElement){const text=p.innerText||'';if(text.length>1500||[...text.matchAll(/\d+(?:\.\d+)?\s*%/g)].length>1||p.querySelectorAll('[role="progressbar"],progress').length>1)break;context=[own,text].join(' ');if(week.test(context)||five.test(context))break;}return context;}
 // Never infer a usage meter from a conversation page. A heading or a dialog
 // explicitly identifying quotas is required, even for aria progress meters.
 const sections=new Set();
 const exactHeading=/^(?:usage(?:\s+limits?)?|quota|limits|使用量|用量|额度|使用限额|利用枠|利用状況|사용량|이용\s*한도)$/i;
 const usagePage=location.hostname==='grok.com'&&/^\/dashboard(?:\/(?:usage|billing))?\/?$/.test(location.pathname);
 if(usagePage)for(const h of document.querySelectorAll('h1,h2,h3,[role="heading"]')){const label=(h.textContent||'').trim();if(!exactHeading.test(label))continue;let p=h.parentElement;for(let i=0;i<3&&p;i++,p=p.parentElement){const text=p.innerText||'';if(text.length>12000)break;if(p.querySelector('[role="progressbar"],progress')||/[0-9]\s*%/.test(text)){sections.add(p);break;}}}
 for(const p of document.querySelectorAll('[role="dialog"]')){const text=p.innerText||'';const heading=p.querySelector('h1,h2,h3,[role="heading"]');if(text.length<=12000&&heading&&exactHeading.test((heading.textContent||'').trim()))sections.add(p);}
 for(const section of sections){
  for(const bar of [...section.querySelectorAll('[role="progressbar"],progress')].slice(0,100)){
   const raw=bar.getAttribute('aria-valuenow')??bar.getAttribute('value');const maxRaw=bar.getAttribute('aria-valuemax')??bar.getAttribute('max');if(raw===null||maxRaw===null||raw.trim()===''||maxRaw.trim()==='')continue;const value=Number(raw),max=Number(maxRaw),min=Number(bar.getAttribute('aria-valuemin')||0);if(!Number.isFinite(value)||!Number.isFinite(max)||!Number.isFinite(min)||max<=min||value<min||value>max)continue;
   const ownLabel=[bar.getAttribute('aria-label'),bar.getAttribute('aria-valuetext')].filter(Boolean).join(' '),context=contextFor(bar,section,ownLabel);const direction=remaining.test(ownLabel)&&!used.test(ownLabel)?false:used.test(ownLabel)&&!remaining.test(ownLabel)?true:remaining.test(context)&&!used.test(context)?false:used.test(context)&&!remaining.test(context)?true:null;if(direction!==null)add((value-min)/(max-min)*100,context,direction);
  }
  for(const el of [...section.querySelectorAll('span,p,div')].slice(0,500)){
   if(el.querySelector('span,p,div,[role="progressbar"],progress'))continue;const label=el.innerText||'';const matches=[...label.matchAll(/(\d+(?:\.\d+)?)\s*%/g)];if(matches.length!==1||label.length>180)continue;const ownRemaining=remaining.test(label),ownUsed=used.test(label);if(ownRemaining===ownUsed)continue;add(Number(matches[0][1]),contextFor(el,section,label),ownUsed);
  }
 }
 const out=[];for(const nameKey of ['weekly','fiveHour','quotaWindow']){const list=values.filter(v=>v.nameKey===nameKey);const distinct=new Set(list.map(v=>v.remaining));if(distinct.size===1)out.push(list[0]);}return out;
}
function normalizePageQuota(provider,values,sessionId,sourceUrl,now=Date.now()){
 const allowed=WEB_PROVIDERS[provider];let url;try{url=new URL(sourceUrl);}catch{return null;}
 if(!allowed||url.protocol!=='https:'||url.hostname!==allowed.host||!Array.isArray(values))return null;
 const windows=[];for(const v of values){if(!['weekly','fiveHour','quotaWindow'].includes(v.nameKey)||typeof v.remaining!=='number'||!Number.isFinite(v.remaining)||v.remaining<0||v.remaining>100||v.unit!=='%')continue;if(windows.some(w=>w.id===v.nameKey))continue;windows.push({id:v.nameKey,nameKey:v.nameKey,remaining:v.remaining,unit:'%',resetAt:null,expiresAt:null,rollover:'unknown',source:'official_page'});}
 if(!windows.length)return null;return {id:`${provider}:web`,provider,channel:'web',mode:'web',status:'observed',plan:'unknown',accountKey:hash(sessionId),checkedAt:new Date(now).toISOString(),windows,resetCredits:null,noteKey:'webNote'};
}
module.exports={WEB_PROVIDERS,collectPageQuota,normalizePageQuota};
