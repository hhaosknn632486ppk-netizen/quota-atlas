'use strict';
const { createHash } = require('node:crypto');
const I=require('../ui/i18n.js');const {timing,mergeEvents}=require('./events.cjs');
const {channelFor,accountId}=require('./accounts.cjs');
const {interpretation}=require('./announcements.cjs');
const PROVIDERS = [
  {id:'codex',name:'Codex',vendor:'OpenAI',color:'#29b89e',icon:'C',mode:'auto',url:'https://chatgpt.com/codex/settings/usage'},
  {id:'chatgpt',name:'ChatGPT',vendor:'OpenAI',color:'#168f79',icon:'◎',mode:'manual',url:'https://chatgpt.com/'},
  {id:'workbuddy',name:'WorkBuddy',vendor:'腾讯',color:'#6275f5',icon:'W',mode:'manual',url:'https://www.workbuddy.cn/docs/workbuddy/Pricing'},
  {id:'claude',name:'Claude',vendor:'Anthropic',color:'#cb8d70',icon:'✳',mode:'manual',url:'https://claude.ai/settings/usage'},
  {id:'cursor',name:'Cursor',vendor:'Anysphere',color:'#848cff',icon:'↗',mode:'manual',url:'https://cursor.com/dashboard'},
  {id:'gemini',name:'Gemini',vendor:'Google',color:'#5f9eea',icon:'✦',mode:'manual',url:'https://aistudio.google.com/'},
  {id:'copilot',name:'Copilot',vendor:'GitHub',color:'#b6a0f7',icon:'⌘',mode:'manual',url:'https://github.com/settings/billing'},
  {id:'deepseek',name:'DeepSeek',vendor:'DeepSeek',color:'#4b87ee',icon:'D',mode:'manual',url:'https://platform.deepseek.com/'},
  {id:'grok',name:'Grok',vendor:'xAI',color:'#9aa8b7',icon:'G',mode:'manual',url:'https://console.x.ai/'}
];
const KINDS={reset:'直接重置',banked:'重置券',grant:'赠送额度',boost:'临时扩容',teaser:'重置预告',incident:'服务事件',policy:'规则变化',unknown:'待分类'};
const iso=value=>{if(value==null||value==='')return null;const d=new Date(typeof value==='number'?(value<1e12?value*1000:value):value);return Number.isFinite(d.valueOf())?d.toISOString():null;};
const hash=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,20);
function safeUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function providerId(value){const s=String(value||'').toLowerCase().replace(/[\s_-]/g,'');return {anthropic:'claude',claudecode:'claude',githubcopilot:'copilot',google:'gemini',codebuddy:'workbuddy',xai:'grok'}[s]||s;}
function normalizeCodex(raw,account={}){
  const buckets=raw.rateLimitsByLimitId&&Object.keys(raw.rateLimitsByLimitId).length?Object.values(raw.rateLimitsByLimitId):raw.rateLimits?[raw.rateLimits]:[];
  const windows=[];
  for(const bucket of buckets){for(const slot of ['primary','secondary']){
    const w=bucket[slot];if(!w)continue;
    const used=typeof w.usedPercent==='number'&&Number.isFinite(w.usedPercent)?Math.min(100,Math.max(0,w.usedPercent)):null;
    const mins=Number(w.windowDurationMins);const length=Number.isFinite(mins)&&mins>0?mins:null;
    windows.push({id:`${bucket.limitId||'codex'}:${slot}`,bucket:bucket.limitId||'codex',name:bucket.limitName||(length===10080?'每周额度':length===300?'5 小时额度':length?`${length>=1440?length/1440+' 天':length/60+' 小时'}额度`:'额度窗口'),nameKey:bucket.limitName?null:length===10080?'weekly':length===300?'fiveHour':length?length>=1440?'daysQuota':'hoursQuota':'quotaWindow',remaining:used===null?null:100-used,resetAt:iso(w.resetsAt),durationMins:length,unit:'%',rollover:'unknown',source:'official'});
  }}
  const details=raw.rateLimitResetCredits;
  return {provider:'codex',mode:'auto',status:'live',plan:raw.rateLimits?.planType||account.planType||'unknown',accountKey:raw.accountId?hash(raw.accountId):null,windows,resetCredits:details?{availableCount:Number.isInteger(details.availableCount)&&details.availableCount>=0?details.availableCount:null,credits:Array.isArray(details.credits)?details.credits.map(c=>({key:hash(c.id),title:c.title||'重置券',titleKey:c.title?null:'banked',expiresAt:iso(c.expiresAt),grantedAt:iso(c.grantedAt),status:c.status})):null}:null,checkedAt:new Date().toISOString()};
}
function makeEvent(data){
  const provider=providerId(data.provider);if(!PROVIDERS.some(p=>p.id===provider))return null;
  const sourceUrl=safeUrl(data.sourceUrl);const announcedAt=iso(data.announcedAt);if(!sourceUrl||!announcedAt)return null;
  const kind=Object.hasOwn(KINDS,data.kind)?data.kind:'unknown';
  const time=timing({...data,announcedAt});
  const interpreted=interpretation((data.title||'')+' '+(data.detail||''),provider);
  return {id:data.id||hash(provider+sourceUrl+announcedAt),provider,kind,title:String(data.title||KINDS[kind]).slice(0,500),detail:String(data.detail||'').slice(0,3000),sourceUrl,announcedAt,...time,campaignId:data.campaignId?String(data.campaignId).slice(0,200):null,relatedSourceUrls:[data.relatedSourceUrl,...(Array.isArray(data.relatedSourceUrls)?data.relatedSourceUrls:[])].map(safeUrl).filter(Boolean),titles:data.titles||null,titleKey:data.titleKey||(data.title?null:kind==='unknown'?'unknownKind':kind),detailKey:data.detailKey||null,expiresAt:iso(data.expiresAt)||time.parsedExpiresAt,scope:String(data.scope||'适用范围未说明').slice(0,300),plans:Array.isArray(data.plans)?data.plans.map(x=>String(x).toLowerCase()):null,region:data.region||null,phase:data.phase||'announced',evidence:data.evidence||'community',source:data.source||'公开来源',sourceCheckedAt:iso(data.sourceCheckedAt),sourceStale:!!data.sourceStale,rollover:data.rollover||'unknown',claimRequired:data.claimRequired===true||interpreted.claimRequired,applicationRequired:data.applicationRequired===true||interpreted.applicationRequired,channels:Array.isArray(data.channels)?data.channels.filter(c=>['api','web','subscription'].includes(c)):interpreted.channels,conditionsUnparsed:data.conditionsUnparsed===true||interpreted.conditionsUnparsed,targetDurationMins:data.targetDurationMins||interpreted.targetDurationMins,originalText:String(data.originalText||data.detail||data.title||'').slice(0,6000),sourceRoute:data.sourceRoute||null,firstSeenAt:iso(data.firstSeenAt),lastChangedAt:iso(data.lastChangedAt),revision:data.revision||null,identityUrl:safeUrl(data.identityUrl),publishedPrecision:data.publishedPrecision||null,variants:[],demo:!!data.demo};
}
function fromRadar(raw){return (raw.events||[]).map(e=>makeEvent({id:e.id,provider:e.provider,kind:e.kind==='boost'&&/赠送|试用额度|送.*额度|free credits|credit grant/i.test((e.zh||'')+(e.detail||''))?'grant':e.kind,title:e.zh||e.en||e.title,titles:{'zh-CN':e.zh,en:e.en},detail:e.detail,plans:e.plans,channels:e.channels,conditionsUnparsed:e.conditionsUnparsed,region:e.region,claimRequired:e.claimRequired,rollover:e.rollover,effectiveAt:e.effectiveAt||e.expectedAt||e.resetAt,expiresAt:e.expiresAt,precision:e.precision,campaignId:e.campaignId,relatedSourceUrl:e.relatedSourceUrl,sourceUrl:e.sourceUrl,announcedAt:e.announcedAt,scope:e.scope,phase:e.phase||(e.pendingReset||e.kind==='teaser'?'pending':'announced'),evidence:'community',source:'Quota Radar',sourceCheckedAt:raw.updatedAt})).filter(Boolean);}
function fromObservatory(raw){const vm=raw.viewModel||{};const out=[];const base={provider:'codex',source:'Reset Observatory',sourceCheckedAt:raw.checkedAt,sourceStale:raw.stale||raw.dataHealth?.stale};
  const w=vm.latestWindow;if(w?.source&&w.openedAt)out.push(makeEvent({...base,id:hash(w.source),kind:/bank|券|卡/.test((w.kind||'')+(w.summary||''))?'banked':'reset',title:w.summary||w.title,detail:'上游记录为已执行；个人账户是否到账仍需独立核对。',sourceUrl:w.source,announcedAt:w.openedAt,effectiveAt:w.closedAt,phase:w.closedAt?'reported':'pending',scope:w.scope,precision:'announcement_fallback'}));
  const a=vm.activeWindow;if(a?.active&&a.source&&a.openedAt)out.push(makeEvent({...base,kind:/bank|券|卡/.test((a.kind||'')+(a.summary||''))?'banked':'teaser',title:a.summary||a.label,sourceUrl:a.source,announcedAt:a.openedAt,effectiveAt:a.expectedAt,scope:a.scope,phase:'pending',precision:a.expectedPrecision||'unknown'}));
  return out.filter(Boolean);
}
function fromStatus(raw,provider,source,checkedAt){return (raw.incidents||[]).slice(0,20).map(i=>makeEvent({provider,kind:'incident',title:i.name,detail:i.incident_updates?.[0]?.body||'',sourceUrl:i.shortlink||`${raw.page?.url||''}/incidents/${i.id}`,announcedAt:i.created_at,phase:i.status==='resolved'?'resolved':'active',evidence:'official',source,sourceCheckedAt:checkedAt,scope:'受影响服务；不代表补偿或赠送额度'})).filter(Boolean);}
function applicability(event,account,locale='zh-CN'){const result=(state,key)=>({state,reasonKey:key,reason:I.t(locale,key)});if(!account)return result('unknown','reasonPlanMissing');
  if(event.provider!==account.provider)return result('no','reasonProviderNo');
  const channel=channelFor(account);if(event.channels?.length&&!event.channels.includes(channel))return result('no','reasonChannelNo');
  if(!event.channels?.length)return result('unknown','reasonChannelUnknown');
  if(event.region&&account.region&&event.region!==account.region)return result('no','reasonRegionNo');
  if(event.region&&!account.region)return result('unknown','reasonRegionUnknown');
  if(event.plans?.length){let plan=String(account.plan||'unknown').toLowerCase();if(!event.plans.includes('all')&&(plan==='unknown'||plan==='paid'&&!event.plans.includes('paid')))return result('unknown','reasonPlanUnknown');if(/^max[_ -](5x|20x)$/.test(plan))plan='max';if(!event.plans.includes(plan)&&!event.plans.includes('all')&&!(event.plans.includes('paid')&&!['free','unknown','api'].includes(plan)))return result('no','reasonPlanNo');}
  else if(/待核实|未说明|under review|unknown/i.test(event.scope||''))return result('unknown','reasonScope');
  else return result('unknown','reasonStructured');
  if(event.conditionsUnparsed)return result('unknown','reasonExtraConditions');
  return result('yes','reasonYes');
}
function eventContext(event,accounts,now=Date.now(),locale='zh-CN'){
 const candidates=accounts.filter(a=>a.provider===event.provider);const ranked=candidates.map(a=>({account:a,eligible:applicability(event,a,locale)})).sort((a,b)=>({yes:0,unknown:1,no:2}[a.eligible.state]-{yes:0,unknown:1,no:2}[b.eligible.state]));
 const selected=ranked[0]||{account:null,eligible:applicability(event,null,locale)};const a=selected.account;
 const windows=selected.eligible.state!=='no'&&accountFresh(a,now)?(a.windows||[]).filter(w=>!w.component&&w.metricKind!=='limit'&&w.remaining!=null&&(!w.observedAt||now-new Date(w.observedAt)<5*60000)):[];
 const window=event.targetDurationMins?windows.find(w=>w.durationMins===event.targetDurationMins):windows.find(w=>w.durationMins===10080)||windows[0];
 return {...selected,window,accountId:a?accountId(a):null,channel:a?channelFor(a):event.channels?.[0]||null,actionKey:event.applicationRequired?'actionApply':event.kind==='banked'?event.claimRequired?'actionClaimVoucher':'actionCheckVoucher':event.claimRequired?'actionClaim':event.kind==='reset'&&event.phase==='pending'?'actionPlanTasks':'actionCheckAccount'};
}
function accountFresh(account,now=Date.now()){return account?.status==='live'&&now-new Date(account.checkedAt).valueOf()<(account.freshForMs||3*60000);}
function advise(accounts,events,now=Date.now(),locale='zh-CN'){
  const tr=(key,p)=>I.t(locale,key,p);const msg=(title,body,p)=>I.message(locale,title,body,p);
  const items=[];
  for(const a of accounts){const fresh=accountFresh(a,now);if(['auto','local','web'].includes(a.mode)&&!fresh)continue;
    for(const w of a.windows||[]){if(w.remaining===null||w.remaining===undefined||w.component||w.observedAt&&now-new Date(w.observedAt)>5*60000)continue;const deadline=w.expiresAt||w.resetAt;const diff=new Date(deadline).valueOf()-now;if(!deadline||diff<=0||diff>24*3600000||w.remaining<=0)continue;
      const expiry=!!w.expiresAt;items.push({id:`window:${accountId(a)}:${w.id}:${deadline}`,provider:a.provider,priority:diff<3*3600000?90:60,...msg(expiry?'adviceGiftExpiry':'adviceResetSoon','adviceWindowBody',{nameWindow:w,rawUnit:w.unit,name:I.windowName(w,locale),amount:w.remaining,unit:I.unitName(w.unit,locale),actionKey:expiry?'expiresAt':'resetAt',extraKey:!expiry&&w.rollover!=='no'?'rolloverAdvice':null,action:tr(expiry?'expiresAt':'resetAt'),extra:!expiry&&w.rollover!=='no'?tr('rolloverAdvice'):''}),action:'查看额度',kind:'window',deadline,basis:tr(a.mode==='manual'?'basisManual':'basisAccount'),manual:a.mode==='manual'});
    }
    if(a.resetCredits?.availableCount>0){items.push({id:`credits:${accountId(a)}`,provider:a.provider,priority:45,...msg('adviceCredits','adviceCreditsBody',{n:a.resetCredits.availableCount}),kind:'credit',basis:tr('basisAccount')});for(const c of a.resetCredits.credits||[]){const d=new Date(c.expiresAt).valueOf()-now;if(c.expiresAt&&d>0&&d<24*3600000)items.push({id:`credit-expiry:${accountId(a)}:${c.key}`,provider:a.provider,priority:95,...msg('adviceVoucherExpiry',c.titleKey||null),body:c.titleKey?tr(c.titleKey):c.title,deadline:c.expiresAt,kind:'credit',basis:tr('basisAccount')});}}
  }
  for(const e of events){if(now-new Date(e.announcedAt)>7*86400000||e.expiresAt&&new Date(e.expiresAt)<=now||e.sourceStale)continue;const context=eventContext(e,accounts,now,locale),account=context.account,eligible=context.eligible;if(eligible.state==='no'||e.kind==='incident'||e.kind==='policy')continue;
    if(e.conflict){items.push({id:`event:${e.id}`,provider:e.provider,priority:55,...msg('adviceConflict','adviceConflictBody'),kind:'event',eventId:e.id,basis:tr('basisCross')});continue;}
    const baseLength=items.length;
    if(e.kind==='banked')items.push({id:`event:${e.id}`,provider:e.provider,priority:50,...msg('adviceBanked','adviceBankedBody',{reasonKey:eligible.reasonKey,reason:eligible.reason}),kind:'event',eventId:e.id,basis:e.source});
    else if(e.kind==='grant')items.push({id:`event:${e.id}`,provider:e.provider,priority:75,...msg('adviceGrant','adviceGrantBody',{claimKey:e.claimRequired?'claimManual':null,expiryKey:e.expiresAt?'checkDeadline':null,claim:e.claimRequired?tr('claimManual'):'',reasonKey:eligible.reasonKey,reason:eligible.reason,expiry:e.expiresAt?tr('checkDeadline'):''}),deadline:e.expiresAt,kind:'event',eventId:e.id,basis:e.source});
    else if(['teaser','reset'].includes(e.kind)&&e.effectiveAt&&new Date(e.effectiveAt)>now){const matched=eligible.state==='yes';const remaining=context.window?.remaining;
      items.push({id:`event:${e.id}`,provider:e.provider,priority:matched?85:50,...msg('adviceFuture',matched&&accountFresh(account,now)&&remaining!==undefined?'advicePersonalReset':'adviceFutureBody',{amount:remaining,nameWindow:context.window,name:context.window?I.windowName(context.window,locale):'',rawUnit:context.window?.unit,unit:context.window?I.unitName(context.window.unit,locale):'',reasonKey:eligible.reasonKey,reason:eligible.reason}),deadline:e.effectiveAt,kind:'event',eventId:e.id,basis:e.source});
    }else if(!e.effectiveAt&&(e.kind==='teaser'||e.kind==='reset'&&e.phase==='pending'))items.push({id:`event:${e.id}`,provider:e.provider,priority:35,...msg('adviceNoTime','adviceNoTimeBody',{reasonKey:eligible.reasonKey,reason:eligible.reason}),kind:'event',eventId:e.id,basis:e.source});
    else if(['reset','boost'].includes(e.kind)&&now-new Date(e.announcedAt)<48*3600000)items.push({id:`event:${e.id}`,provider:e.provider,priority:45,...msg(e.kind==='reset'?'adviceReset':'adviceBoost','adviceActivityBody',{reasonKey:eligible.reasonKey,reason:eligible.reason}),kind:'event',eventId:e.id,basis:e.source});
    for(const item of items.slice(baseLength)){if(e.expiresAt)item.deadline=e.expiresAt;item.applicability=eligible.state;item.accountId=context.accountId;item.channel=context.channel;item.actionKey=eligible.state==='unknown'?'actionCheckConditions':context.actionKey;item.sourceUrl=e.sourceUrl;
     if(eligible.state!=='yes')item.priority=Math.min(item.priority,50);else if(!e.conflict)item.priority=Math.max(item.priority,e.claimRequired||e.kind==='banked'?75:65); 
     if(e.kind==='grant'&&eligible.state==='yes'&&context.window){const w=context.window;item.body+=' '+tr('personalBalance',{name:I.windowName(w,locale),amount:new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(w.remaining),unit:I.unitName(w.unit,locale)});}
    }
  }
  return items.sort((a,b)=>b.priority-a.priority);
}
function detectChanges(previous,current,now=Date.now(),locale='zh-CN'){const tr=key=>I.t(locale,key);
  if(!previous||!current.accountKey||previous.accountKey!==current.accountKey||accountId(previous)!==accountId(current)||!accountFresh(previous,now)||!accountFresh(current,now))return [];
  const out=[];for(const w of current.windows||[]){const p=previous.windows.find(x=>x.id===w.id);if(p?.remaining==null||w.remaining==null||p.unit!==w.unit||w.component||p.component||w.metricKind==='limit')continue;const points=['points','积分'].includes(w.unit);const currency=['CNY','USD'].includes(w.unit);if(((currency||points)&&w.remaining-p.remaining>0.000001)||(w.unit==='%'&&w.remaining-p.remaining>=10))out.push({id:`recovery:${accountId(current)}:${w.id}:${current.checkedAt}`,provider:current.provider,...I.message(locale,points?'localCreditIncrease':currency?'balanceIncreaseTitle':'recoveryTitle',currency||points?'balanceIncreaseBody':'recoveryBody',{nameWindow:w,name:I.windowName(w,locale),from:p.remaining,to:w.remaining,unit:w.unit,rawUnit:w.unit}),kind:'recovery',basis:tr('basisSnapshots')});}
  if(Number.isInteger(previous.resetCredits?.availableCount)&&previous.resetCredits.availableCount>=0&&Number.isInteger(current.resetCredits?.availableCount)&&current.resetCredits.availableCount>previous.resetCredits.availableCount)out.push({id:`credit-arrived:${current.checkedAt}`,provider:current.provider,...I.message(locale,'creditIncrease','creditIncreaseBody',{n:current.resetCredits.availableCount}),kind:'credit',basis:tr('basisSnapshots')});return out;
}
function validateManual(input,locale='zh-CN'){const tr=key=>I.t(locale,key);const provider=providerId(input.provider);if(!PROVIDERS.some(p=>p.id===provider)||provider==='codex')throw new Error(tr('errProvider'));if(input.remaining==null||String(input.remaining).trim()==='')throw new Error(tr('errMissing'));const remaining=Number(input.remaining);if(!Number.isFinite(remaining)||remaining<0)throw new Error(tr('errAmount'));const unit=input.unit==='%'?'%':['USD','CNY'].includes(input.unit)?input.unit:'积分';if(unit==='%'&&remaining>100)throw new Error(tr('errPercent'));const deadline=iso(input.deadline);if(input.deadline&&!deadline)throw new Error(tr('errDate'));return {provider,mode:'manual',status:'manual',plan:String(input.plan||'unknown').slice(0,60),checkedAt:new Date().toISOString(),windows:[{id:'manual',name:input.kind==='grant'?'赠送额度':'手动额度',nameKey:input.kind==='grant'?'giftQuota':'manualQuota',remaining,unit,...(input.kind==='grant'?{expiresAt:deadline}:{resetAt:deadline}),rollover:input.rollover==='yes'?'yes':input.rollover==='no'?'no':'unknown'}],resetCredits:null};}
module.exports={PROVIDERS,KINDS,iso,hash,safeUrl,providerId,normalizeCodex,makeEvent,fromRadar,fromObservatory,fromStatus,mergeEvents,applicability,eventContext,advise,accountFresh,detectChanges,validateManual};
