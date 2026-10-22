'use strict';
const {makeEvent,fromRadar,fromObservatory,fromStatus,hash}=require('./domain.cjs');
const A=require('./announcements.cjs');
const {healthFor,applyHealth}=require('./source-health.cjs');
const {SOCIAL_SOURCES,fetchPublicPosts}=require('./public-posts.cjs');
const SOURCES=[
 {id:'openai-announcements',name:'OpenAI · ChatGPT & Codex changelog',url:'https://learn.chatgpt.com/docs/changelog',providers:['codex','chatgpt'],type:'official',format:'changelog',intervalMs:2*60000},
 {id:'anthropic-news',name:'Anthropic · Newsroom',url:'https://www.anthropic.com/news',providers:['claude'],type:'official',format:'news',intervalMs:2*60000,articleLimit:8},
 {id:'deepseek-news',name:'DeepSeek · News',url:'https://api-docs.deepseek.com/',providers:['deepseek'],type:'official',format:'news',linkScope:'document',intervalMs:2*60000,articleLimit:8},
 {id:'gemini-announcements',name:'Gemini API · Release notes',url:'https://ai.google.dev/gemini-api/docs/changelog',providers:['gemini'],type:'official',format:'changelog',channels:['api'],intervalMs:2*60000},
 {id:'grok-news',name:'xAI · News',url:'https://x.ai/news',providers:['grok'],type:'official',format:'news',intervalMs:2*60000,articleLimit:8},
 {id:'grok-api-policy',name:'xAI · API release-page changes',url:'https://docs.x.ai/developers/release-notes',providers:['grok'],type:'official',format:'policy',channels:['api'],intervalMs:5*60000},
 {id:'grok-usage-policy',name:'Grok · Usage and billing rules',url:'https://docs.x.ai/grok/faq',providers:['grok'],type:'official',format:'policy',channels:['subscription','web'],intervalMs:5*60000},
 {id:'claude-policy',name:'Claude · Usage rules',url:'https://support.claude.com/en/articles/9797557-usage-limit-best-practices',providers:['claude'],type:'official',format:'policy',intervalMs:5*60000},
 {id:'radar',name:'Quota Radar',url:'https://airesetclock.com/api/events.json',providers:['codex','claude'],type:'community',format:'radar'},
 {id:'observatory',name:'Reset Observatory',url:'https://codex.gussuriworks.com/api/current?locale=zh',providers:['codex'],type:'community',format:'observatory'},
 {id:'limitreset',name:'LimitReset',url:'https://limitreset.net/api/v1/status',providers:['codex','claude','cursor','gemini','copilot','grok'],type:'community',format:'limitreset'},
 {id:'openai-status',name:'OpenAI Status',url:'https://status.openai.com/api/v2/incidents.json',providers:['codex'],type:'official',format:'status'},
 {id:'claude-status',name:'Claude Status',url:'https://status.claude.com/api/v2/incidents.json',providers:['claude'],type:'official',format:'status'},
 {id:'cursor-status',name:'Cursor Status',url:'https://status.cursor.com/api/v2/incidents.json',providers:['cursor'],type:'official',format:'status'},
 {id:'workbuddy-policy',name:'WorkBuddy 定价与赠送规则',url:'https://www.workbuddy.cn/docs/workbuddy/Pricing',providers:['workbuddy'],type:'official',format:'policy'},
 {id:'deepseek-policy',name:'DeepSeek 价格规则',url:'https://api-docs.deepseek.com/quick_start/pricing',providers:['deepseek'],type:'official',format:'policy'}
];
function fromLimitReset(raw){const events=[];for(const [provider,product] of Object.entries(raw.products||{})){for(const e of [product.latestEvent,product.upcomingEvent]){if(!e)continue;events.push(makeEvent({id:e.id,provider,kind:e.kind==='upcoming'?'teaser':e.kind==='banked-reset'?'banked':e.kind,title:e.title,detail:e.text,campaignId:e.campaignId,relatedSourceUrl:e.relatedSourceUrl,precision:e.precision,sourceUrl:e.sourceUrl,announcedAt:e.announcedAt,effectiveAt:e.effectiveAt,expiresAt:e.expiresAt,plans:e.plans,channels:e.channels,region:e.region,claimRequired:e.claimRequired,conditionsUnparsed:e.conditionsUnparsed,scope:e.scope||'适用范围未说明',phase:e.phase||(e.kind==='upcoming'?'pending':'announced'),source:'LimitReset',sourceCheckedAt:raw.updatedAt}));}}return events.filter(Boolean);}
function policyText(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&[a-z#0-9]+;/gi,' ').replace(/\s+/g,' ').trim().slice(0,150000);}
function feedFreshness(source,raw,now){
 // A snapshot's check time is different from the date of its last announcement.
 const snapshot=source.format==='observatory';
 const value=snapshot?(raw.checkedAt||raw.dataHealth?.generatedAt):raw.updatedAt||raw.checkedAt;
 const time=typeof value==='string'?Date.parse(value):NaN;
 const verifiedAt=Number.isFinite(time)&&time<=now+5*60000?new Date(time).toISOString():null;
 const stale=!!(raw.stale||raw.dataHealth?.stale)||verifiedAt!==null&&now-time>24*3600000;
 const degraded=snapshot&&raw.dataHealth?.overall&&!['ok','healthy'].includes(raw.dataHealth.overall);
 return {verifiedAt,freshnessBasis:snapshot?'snapshot-check':'feed-update',freshness:stale?'stale':!verifiedAt||degraded?'unknown':'fresh'};
}
async function fetchSource(source,previous={},fetcher=fetch,now=Date.now()){
  const checkedAt=new Date(now).toISOString();let accessible=false;try{const response=await fetcher(source.url,{signal:AbortSignal.timeout(18000),headers:{'User-Agent':'QuotaAtlas/'+require('../package.json').version+' (public read-only feed)'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);accessible=true;let text='';let bytes=0;const decoder=new TextDecoder();for await(const chunk of response.body){bytes+=chunk.length;if(bytes>2500000)throw new Error('响应超过大小限制');text+=decoder.decode(chunk,{stream:true});}text+=decoder.decode();
    let events=[],updatedAt=null,fingerprint=null,note=null;
    if(source.format==='policy'){const normalized=policyText(text);if(normalized.length<100)throw new Error('规则页面内容不完整');fingerprint=hash(normalized);note='只监控页面变化；变化不代表新增赠送额度。';if(previous.fingerprint&&previous.fingerprint!==fingerprint)events=[makeEvent({provider:source.providers[0],kind:'policy',title:'官方规则页面发生变化',titleKey:'policyTitle',detailKey:'policyBody',detail:'页面内容与上次读取不同。请查看原文核实；尚未推断赠送金额、适用范围或到账。',sourceUrl:source.url,announcedAt:checkedAt,evidence:'official',source:source.name,sourceCheckedAt:checkedAt})];else events=previous.events||[];}
    else{const raw=JSON.parse(text);const valid=source.format==='radar'?Array.isArray(raw.events):source.format==='observatory'?raw.viewModel&&typeof raw.viewModel==='object':source.format==='limitreset'?raw.products&&typeof raw.products==='object'&&!Array.isArray(raw.products):Array.isArray(raw.incidents);if(!valid)throw new Error('Source structure unavailable');updatedAt=raw.updatedAt||raw.checkedAt||raw.page?.updated_at||null;if(source.format==='radar')events=fromRadar(raw);else if(source.format==='observatory')events=fromObservatory(raw);else if(source.format==='limitreset')events=fromLimitReset(raw);else events=fromStatus(raw,source.providers[0],source.name,checkedAt);
      if(source.type==='community'){
        const freshness=feedFreshness(source,raw,now);
        if(freshness.freshness!=='fresh')return {...source,...freshness,status:freshness.freshness==='stale'?'stale':'partial',noteKey:freshness.freshness==='stale'?'sourceStaleNote':'sourceFreshnessUnknown',checkedAt,updatedAt,events:events.map(e=>({...e,sourceStale:true})),fingerprint};
        return {...source,...freshness,status:'ok',checkedAt,updatedAt,events,fingerprint};
      }
    }
    return {...source,status:'ok',noteKey:source.format==='policy'?'sourcePolicyNote':null,checkedAt,updatedAt,note,events,fingerprint};
  }catch(e){return {...source,status:'error',noteKey:'sourceErrorNote',noteParams:{error:e.name==='TimeoutError'?'timeout':e.message},checkedAt,lastSuccessAt:previous.status==='ok'?previous.checkedAt:previous.lastSuccessAt,updatedAt:previous.updatedAt||null,note:`读取失败：${e.name==='TimeoutError'?'请求超时':e.message}。保留缓存，暂停据此生成提醒。`,events:(previous.events||[]).map(e=>({...e,sourceStale:true})),fingerprint:previous.fingerprint,health:healthFor(source,{accessible})};}
}
// Only public fixed hosts are read. Credentials are used exclusively by the X adapter.
async function readPublic(url,previous,fetcher,signal){let target=new URL(url),retries=0;const host=target.hostname;for(let i=0;i<4;i++){const headers={'User-Agent':'QuotaAtlas/'+require('../package.json').version+' (public read-only monitor)'};if(previous?.etag)headers['If-None-Match']=previous.etag;if(previous?.lastModified)headers['If-Modified-Since']=previous.lastModified;
 let response;
 try{response=await fetcher(target.href,{signal,redirect:'manual',headers});}
 catch(error){if(!signal?.aborted&&retries===0){retries++;i--;continue;}throw error;}
 if(response.status>=500&&response.status<=599&&!response.headers.get('retry-after')&&!signal?.aborted&&retries===0){retries++;i--;continue;}
 if(response.status===304)return {unchanged:true,etag:previous?.etag,lastModified:previous?.lastModified};
 if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw new Error('HTTP '+response.status);target=new URL(location,target);if(target.protocol!=='https:'||target.hostname!==host||target.username||target.password)throw new Error('Redirect unavailable');continue;}
 if(!response.ok){const err=new Error('HTTP '+response.status);if(response.status===429||response.status===503&&response.headers.get('retry-after')){const retry=response.headers.get('retry-after');const seconds=Number(retry);err.retryAt=Math.max(Date.now()+60000,Number.isFinite(seconds)?Date.now()+seconds*1000:Date.parse(retry)||Date.now()+10*60000);}throw err;}
 let bytes=0,text='';const decoder=new TextDecoder();for await(const chunk of response.body){bytes+=chunk.length;if(bytes>2500000)throw new Error('Response size limit');text+=decoder.decode(chunk,{stream:true});}text+=decoder.decode();return {text,etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified')};
 }throw new Error('Redirect unavailable');}
function annotate(result,previous,now,verifiedArticles=new Set()){const at=new Date(now).toISOString();result.events=(result.events||[]).map(e=>{const old=(previous?.events||[]).find(p=>p.id===e.id||p.sourceUrl===e.sourceUrl&&p.provider===e.provider);const revision=hash(JSON.stringify([e.kind,e.phase,e.effectiveAt,e.expiresAt,e.plans,e.channels,e.claimRequired,e.detail]));return {...e,sourceStale:!(result.status==='ok'||result.status==='partial'&&verifiedArticles.has(e.sourceUrl)),sourceCheckedAt:at,sourceRoute:e.sourceRoute|| (result.type==='community'?'aggregated':'direct'),firstSeenAt:old?.firstSeenAt||at,lastChangedAt:old?.revision===revision?old.lastChangedAt:at,revision};});return result;}
async function monitorSource(source,previous={},fetcher=fetch,now=Date.now(),options={}){
 let requestAccessible=false;const checkedAt=new Date(now).toISOString(),interval=source.intervalMs|| (source.type==='official'?5:10)*60000,parserVersion=10,verifiedArticles=new Set();
 if(source.format==='x-api'&&!options.token)return {...source,status:'disabled',noteKey:'socialNotConfigured',checkedAt:null,events:[],nextCheckAt:null};
 try{
  let result;
  if(source.format==='x-api'){const parsed=await fetchPublicPosts(source,previous,options.token,fetcher,now);result={...source,...parsed,events:parsed.records.map(makeEvent).filter(Boolean),status:'ok',noteKey:'socialDirectNote'};delete result.records;}
  else if(['news','changelog','policy'].includes(source.format)){
   const signal=AbortSignal.timeout(45000),page=await readPublic(source.url,previous.parserVersion===parserVersion?previous:{},fetcher,AbortSignal.any([signal,AbortSignal.timeout(15000)]));requestAccessible=true;let events=previous.events||[],articleCache=previous.articleCache||{};let fingerprint=previous.fingerprint,updatedAt=previous.updatedAt||null,failures=[],failedArticles=[],links=previous.links||[],recordsForHealth=[],expandedLinks=previous.expandedLinks||[];
   if(page.unchanged&&previous.parserVersion!==parserVersion&&source.format!=='news')throw new Error('Recheck required');
   if(!page.unchanged){
    if(source.format==='policy'){const normalized=A.content(page.text);if(!normalized||normalized.length<100)throw new Error('Page structure unavailable');fingerprint=hash(normalized);if(previous.fingerprintVersion===2&&previous.fingerprint&&fingerprint!==previous.fingerprint)events=[makeEvent({provider:source.providers[0],kind:'policy',titleKey:'policyTitle',detailKey:'policyBody',sourceUrl:source.url,announcedAt:checkedAt,evidence:'official',source:source.name})];}
    else if(source.format==='changelog'){const records=A.datedSections(page.text,source.url);recordsForHealth=records;if(!records.length)throw new Error('Page structure unavailable');events=A.activityRecords(records,source).map(e=>makeEvent({...e,channels:source.channels||e.channels})).filter(Boolean);updatedAt=records.map(r=>r.publishedAt).filter(Boolean).sort().at(-1)||null;}

   }
   if(source.format==='news'){
    links=page.unchanged?previous.links||[]:A.newsLinks(page.text,source);
    if(!links.length)throw new Error('News structure unavailable');
    const cache={},attempted=new Set();
    const inspect=async link=>{
     if(attempted.has(link.url))return;attempted.add(link.url);
     const old=articleCache[link.url];
     try{
      if(old?.retryAt>now&&(old.parserVersion===parserVersion||/^HTTP (429|503)$/.test(old.failureReason||'')))throw Object.assign(new Error(old.failureReason||'Article unavailable'),{retryAt:old.retryAt,deferred:true});
      const articleSignal=AbortSignal.any([signal,AbortSignal.timeout(source.articleTimeoutMs||10000)]);
      const article=await readPublic(link.url,old?.parserVersion===parserVersion?old:{},fetcher,articleSignal);
      const records=article.unchanged?old?.records:A.articleRecords(article.text,link.url);
      if(!records?.length)throw new Error('Article structure unavailable');
      const complete=records.every(r=>r.pageMatched!==false&&A.isoDate(r.publishedAt));
      cache[link.url]={etag:article.etag,lastModified:article.lastModified,records,parserVersion,verifiedAt:complete?checkedAt:null};
      if(complete)verifiedArticles.add(link.url);
      else {failures.push(link.url);failedArticles.push({url:link.url,reason:records.some(r=>r.pageMatched===false)?'page-mismatch':'date-unconfirmed'});}
      if(source.linkScope==='document'&&link.url===links[0].url&&!article.unchanged)expandedLinks=A.newsLinks(article.text,source);
     }catch(error){
      const reason=error.name==='TimeoutError'?'timeout':/^HTTP \d+$/.test(error.message)?error.message:/structure|Reparse/.test(error.message)?'structure':'unavailable';
      const failureCount=error.deferred?old.failureCount||1:(old?.failureCount||0)+1;
      const retryAt=error.retryAt||now+Math.min(30*60000,interval*2**Math.min(failureCount-1,4));
      failures.push(link.url);failedArticles.push({url:link.url,reason,retryAt});
      cache[link.url]={...(old||{records:[],parserVersion}),verifiedAt:null,retryAt,failureReason:reason,failureCount};
     }
    };
    if(source.linkScope==='document'&&links.length<(source.articleLimit||8)){
     await inspect(links[0]);links=[...new Map([...links,...expandedLinks].map(l=>[l.url,l])).values()].slice(0,source.articleLimit||8);
    }
    for(let i=0;i<links.length;i+=3)await Promise.all(links.slice(i,i+3).map(inspect));
    articleCache=cache;const records=Object.values(cache).flatMap(c=>c.records||[]);recordsForHealth=records;
    events=A.activityRecords(records,source).map(e=>makeEvent({...e,sourceStale:!verifiedArticles.has(e.sourceUrl)})).filter(Boolean);
    updatedAt=records.map(r=>r.publishedAt).filter(Boolean).sort().at(-1)||null;
   }
   // Stored article content is bounded; it is never executed or treated as instructions.
   result={...source,...page,status:failures.length?'partial':'ok',noteKey:failures.length?'sourcePartialArticles':source.format==='policy'?'sourcePolicyNote':'sourceDirectNote',checkedAt,updatedAt,events,articleCache,failedArticles,fingerprint,fingerprintVersion:2,parserVersion,expandedLinks,links:source.format==='news'?links:null,health:healthFor(source,{accessible:true,contentCount:source.format==='policy'?1:source.format==='changelog'&&page.unchanged?previous.health?.articleCount||1:recordsForHealth.filter(r=>r.text&&r.pageMatched!==false).length,articleCount:source.format==='policy'?0:source.format==='news'?links.length:page.unchanged?previous.health?.articleCount||0:recordsForHealth.length,datedCount:source.format==='changelog'&&page.unchanged?previous.health?.datedCount||0:recordsForHealth.filter(r=>r.publishedAt&&r.pageMatched!==false).length,eventCount:events.length,verifiedEventCount:events.filter(e=>!e.sourceStale).length,failedCount:failures.length})};delete result.text;delete result.unchanged;
   if(source.format==='news')result.noteParams={verified:verifiedArticles.size,total:links.length};
  }else result=await fetchSource(source,previous,fetcher,now);
  if(!result.health)result.health=healthFor(source,{accessible:result.status!=='error',contentCount:result.status!=='error'?1:0,articleCount:source.format==='x-api'?result.postCount:0,datedCount:source.format==='x-api'?result.datedPostCount:0,eventCount:result.events.length,stale:result.status==='stale'||result.freshness==='unknown'});applyHealth(result);
  const unhealthy=result.status!=='ok';result.failureCount=unhealthy?(previous.failureCount||0)+1:0;
  result.lastSuccessAt=result.status==='ok'?checkedAt:previous.lastSuccessAt||null;result.lastFetchedAt=checkedAt;
  const backoff=unhealthy&&!(result.status==='partial'&&verifiedArticles.size>0);
  result.nextCheckAt=now+(backoff?Math.min(30*60000,interval*2**Math.min(result.failureCount-1,4)):interval);result.retryAt=null;
  return annotate(result,previous,now,verifiedArticles);
 }catch(error){const failureCount=(previous.failureCount||0)+1;return {...source,status:'error',noteKey:error.code||(error.message==='HTTP 403'?'sourceAccessDenied':'sourceErrorNote'),noteParams:{error:error.name==='TimeoutError'?'timeout':/^HTTP \d+$/.test(error.message)?error.message:'unavailable'},checkedAt,lastSuccessAt:previous.lastSuccessAt||null,updatedAt:previous.updatedAt||null,verifiedAt:previous.verifiedAt||null,events:(previous.events||[]).map(e=>({...e,sourceStale:true})),articleCache:previous.articleCache,fingerprint:previous.fingerprint,fingerprintVersion:previous.fingerprintVersion,parserVersion:previous.parserVersion,expandedLinks:previous.expandedLinks,health:healthFor(source,{accessible:requestAccessible}),links:previous.links,etag:previous.etag,lastModified:previous.lastModified,userId:previous.userId,failureCount,retryAt:error.retryAt||null,nextCheckAt:error.retryAt||now+Math.min(30*60000,interval*2**Math.min(failureCount-1,4))};}
}
module.exports={SOURCES,SOCIAL_SOURCES,fromLimitReset,policyText,fetchSource,monitorSource,readPublic,annotate};
