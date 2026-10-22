'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {monitorSource,SOURCES,readPublic}=require('../lib/sources.cjs'),A=require('../lib/announcements.cjs'),Alerts=require('../lib/alert-policy.cjs'),I=require('../ui/i18n.js');
const now=Date.parse('2026-10-19T12:00:00Z'),stamp=delta=>new Date(now+delta).toISOString();
const source=id=>SOURCES.find(s=>s.id===id),json=body=>async()=>new Response(JSON.stringify(body));
const article=(title='Bonus credits')=>'<main><h1>'+title+'</h1><p>October 19, 2026</p><p>All Pro users receive free credits.</p></main>';
const news=source('anthropic-news'),listing='<main><a href="/news/one">One</a><a href="/news/two">Two</a></main>';

test('recent Observatory snapshot stays fresh even when its last announcement is old',async()=>{
 const r=await monitorSource(source('observatory'),{},json({checkedAt:stamp(-60000),updatedAt:stamp(-3*86400000),dataHealth:{overall:'ok',stale:false},viewModel:{}}),now);
 assert.equal(r.status,'ok');assert.equal(r.freshness,'fresh');assert.equal(r.verifiedAt,stamp(-60000));assert.equal(r.updatedAt,stamp(-3*86400000));
});
test('Observatory generated health check can establish freshness without an announcement',async()=>{
 const r=await monitorSource(source('observatory'),{},json({updatedAt:stamp(-3*86400000),dataHealth:{overall:'ok',generatedAt:stamp(-1000)},viewModel:{}}),now);assert.equal(r.status,'ok');
});
test('upstream stale flags and old snapshot checks still block activity judgment',async()=>{
 for(const extra of [{checkedAt:stamp(-1000),dataHealth:{overall:'ok',stale:true}},{checkedAt:stamp(-2*86400000),dataHealth:{overall:'ok'}}]){
  const r=await monitorSource(source('observatory'),{},json({updatedAt:stamp(0),viewModel:{},...extra}),now);assert.equal(r.status,'stale');assert.equal(r.health.activities,'blocked');
 }
});
test('a truly old Radar feed is retained as stale instead of relabelled fresh at fetch time',async()=>{
 const r=await monitorSource(source('radar'),{},json({updatedAt:stamp(-5*86400000),events:[]}),now);assert.equal(r.status,'stale');assert.equal(r.verifiedAt,stamp(-5*86400000));assert.equal(r.lastSuccessAt,null);
});
test('missing, invalid and implausibly future feed timestamps cannot make a green source',async()=>{
 for(const updatedAt of [null,'not-a-date',stamp(3600000)]){const r=await monitorSource(source('radar'),{},json({updatedAt,events:[]}),now);assert.equal(r.status,'partial');assert.equal(r.freshness,'unknown');assert.equal(r.health.activities,'blocked');}
});
test('an upstream snapshot reporting degraded health is not treated as fully verified',async()=>{
 const r=await monitorSource(source('observatory'),{},json({checkedAt:stamp(-1000),dataHealth:{overall:'degraded'},viewModel:{}}),now);assert.equal(r.status,'partial');
});
test('one failed article pauses its cached event while a different verified article remains eligible',async()=>{
 const first=await monitorSource(news,{},async url=>new Response(url===news.url?listing:article(url.endsWith('one')?'First bonus credits':'Second bonus credits')),now);
 const second=await monitorSource(news,first,async url=>url===news.url?new Response(listing):url.endsWith('two')?new Response('',{status:503}):new Response(article('First bonus credits')),now+120000);
 assert.equal(second.status,'partial');assert.equal(second.events.length,2);const good=second.events.find(e=>e.sourceUrl.endsWith('one')),bad=second.events.find(e=>e.sourceUrl.endsWith('two'));
 assert.equal(good.sourceStale,false);assert.equal(bad.sourceStale,true);assert(Alerts.activityLevel(good,{state:'yes'},now));assert.equal(Alerts.activityLevel(bad,{state:'yes'},now),null);
 assert.equal(second.noteParams.verified,1);assert.equal(second.health.verifiedEventCount,1);assert.equal(second.failedArticles[0].reason,'HTTP 503');
});
test('a failed article can recover on an unchanged index and revalidate its cached body',async()=>{
 const first=await monitorSource(news,{},async url=>new Response(url===news.url?listing:article(),{headers:{etag:'original'}}),now);
 const second=await monitorSource(news,first,async url=>url===news.url?new Response(null,{status:304}):new Response('',{status:503}),now+120000);
 assert(second.events.every(e=>e.sourceStale));
 const third=await monitorSource(news,second,async()=>new Response(null,{status:304}),now+240000);
 assert.equal(third.status,'ok');assert(third.events.every(e=>!e.sourceStale));assert.equal(third.events[0].firstSeenAt,first.events[0].firstSeenAt);
});
test('article rate limits keep per-article retry time and do not block healthy articles',async()=>{
 const time=Date.now();let phase=0,limitedCalls=0;
 const fetcher=async url=>{if(url===news.url)return new Response(listing);if(url.endsWith('two')){limitedCalls++;if(!phase)return new Response('',{status:429,headers:{'retry-after':'120'}});}return new Response(article());};
 const a=await monitorSource(news,{},fetcher,time);assert.equal(a.status,'partial');assert.equal(a.events.length,1);assert.equal(a.events[0].sourceStale,false);
 await monitorSource(news,a,fetcher,time+1000);assert.equal(limitedCalls,1);phase=1;
 const b=await monitorSource(news,a,fetcher,time+180000);assert.equal(limitedCalls,2);assert.equal(b.status,'ok');
});
test('undated article pauses only its own activity without inventing a publication time',async()=>{
 const r=await monitorSource(news,{},async url=>new Response(url===news.url?listing:url.endsWith('two')?'<main><h1>Claim free credits</h1><p>All Pro users receive free credits.</p></main>':article()),now);
 assert.equal(r.status,'partial');assert.equal(r.events.length,1);assert.equal(r.events[0].sourceStale,false);assert.equal(r.failedArticles[0].reason,'date-unconfirmed');
});
test('semantic article time inside a header is read without treating footer dates as publication',()=>{
 const exact='<main><header><h1>Bonus credits</h1><time datetime="2026-10-19T12:30:00Z">Published today</time></header><p>Claim free credits</p></main>';
 const r=A.articleRecords(exact,news.url)[0];assert.equal(r.publishedAt,'2026-10-19T12:30:00.000Z');assert.equal(r.publishedPrecision,null);
 const unknown=A.articleRecords('<main><h1>Bonus credits</h1><p>Claim free credits</p><footer><time datetime="2026-10-19">Copyright</time></footer></main>',news.url)[0];assert.equal(unknown.publishedAt,null);
});
test('publication meta content may precede its property and date precision stays date-only',()=>{
 const r=A.articleRecords('<meta content="2026-10-19" property="article:published_time"><main><h1>Bonus credits</h1><p>Claim free credits</p></main>',news.url)[0];assert.equal(r.publishedAt,'2026-10-19T00:00:00.000Z');assert.equal(r.publishedPrecision,'date');
});
test('inaccessible index has an explicit denied-access reason and preserves its last success',async()=>{
 const r=await monitorSource(news,{lastSuccessAt:stamp(-1000)},async()=>new Response('',{status:403}),now);assert.equal(r.noteKey,'sourceAccessDenied');assert.equal(r.lastSuccessAt,stamp(-1000));assert.equal(r.status,'error');
});
test('repeated stale reads back off while a fresh feed resets the failure count',async()=>{
 const stale=json({updatedAt:stamp(-5*86400000),events:[]});const a=await monitorSource(source('radar'),{},stale,now),b=await monitorSource(source('radar'),a,stale,now+600000);
 assert(b.nextCheckAt-(now+600000)>a.nextCheckAt-now);assert.equal(b.lastSuccessAt,null);
 const c=await monitorSource(source('radar'),b,json({updatedAt:stamp(0),events:[]}),now+1200000);assert.equal(c.status,'ok');assert.equal(c.failureCount,0);
});
test('official xAI documentation monitors establish a quiet baseline without claiming quota grants',async()=>{
 for(const id of ['grok-api-policy','grok-usage-policy']){const s=source(id);assert.equal(s.format,'policy');const r=await monitorSource(s,{},async()=>new Response('<main>'+('API rules: claim free credits. '.repeat(8))+'</main>'),now);assert.equal(r.status,'ok');assert.equal(r.events.length,0);}
});
test('new user-facing source descriptions are translated in all four languages',()=>{
 for(const locale of ['zh-CN','en','ja','ko'])for(const key of ['sourcePartialArticles','sourceFreshnessUnknown','sourceAccessDenied','upstreamChecked','grokApiSource','grokUsageSource']){const text=I.t(locale,key,{verified:1,total:2});
test('a transient public connection or server failure gets only one bounded retry',async()=>{
 for(const mode of ['network','server']){let calls=0;const r=await readPublic(news.url,{},async()=>{calls++;if(calls===1){if(mode==='network')throw new TypeError('fetch failed');return new Response('',{status:503});}return new Response('recovered');},AbortSignal.timeout(1000));assert.equal(r.text,'recovered');assert.equal(calls,2);}
 let calls=0;await assert.rejects(readPublic(news.url,{},async()=>{calls++;throw new TypeError('offline');},AbortSignal.timeout(1000)));assert.equal(calls,2);
});
test('an access denial is not retried, and a server Retry-After is respected',async()=>{
 for(const status of [403,503]){let calls=0;await assert.rejects(readPublic(news.url,{},async()=>{calls++;return new Response('',{status,headers:status===503?{'retry-after':'120'}:{}});
test('one persistently broken article cannot slow discovery on a working news index',async()=>{
 const fetcher=async url=>url===news.url?new Response(listing):url.endsWith('two')?new Response('',{status:503}):new Response(article());
 let previous={};for(let step=0;step<5;step++){const time=now+step*120000;previous=await monitorSource(news,previous,fetcher,time);assert.equal(previous.nextCheckAt,time+news.intervalMs);assert.equal(previous.noteParams.verified,1);}
});
test('an unavailable article backs off independently while other articles are still checked',async()=>{
 let calls=0;const fetcher=async url=>{if(url.endsWith('two')){calls++;return new Response('',{status:503});
test('xAI marked article sections provide their actual body and nested sections without navigation noise',()=>{
 const html='<nav>Claim free credits from a different campaign</nav><script type="application/ld+json">{"@type":"NewsArticle","datePublished":"2026-10-19T12:00:00Z"}</script><section><span data-article-top="true"></span><h1 id="post-title-navigator-anchor">Grok bonus credits</h1><section><p>All Pro users receive free credits.</p></section><p>Claim before the deadline.</p></section><footer>Other promotion</footer>';
 const r=A.articleRecords(html,'https://x.ai/news/credits')[0];assert.equal(r.publishedAt,'2026-10-19T12:00:00.000Z');assert(r.text.includes('Claim before the deadline'));assert(!r.text.includes('different campaign'));assert(!r.text.includes('Other promotion'));
 assert.equal(A.activityRecords([r],source('grok-news')).length,1);assert.throws(()=>A.articleRecords(html,'https://www.anthropic.com/news/credits'),/Article structure/);
});
test('a random section without official article identity is not accepted as the xAI news body',()=>{
 assert.throws(()=>A.articleRecords('<section><h1>Claim free credits</h1><time datetime="2026-10-19"></time></section>','https://x.ai/news/credits'),/Article structure/);
});
test('a new parser retries a previous structural failure while keeping upstream rate limits',async()=>{
 let calls=0;const old={parserVersion:8,links:[{url:news.url+'/one'}],articleCache:{[news.url+'/one']:{parserVersion:8,records:[],retryAt:now+3600000,failureReason:'structure'}}};
 await monitorSource(news,old,async url=>{if(url===news.url)return new Response('<main><a href="/news/one">One</a></main>');calls++;return new Response(article());},now);assert.equal(calls,1);
 calls=0;old.articleCache[news.url+'/one'].failureReason='HTTP 429';await monitorSource(news,old,async url=>{if(url===news.url)return new Response('<main><a href="/news/one">One</a></main>');calls++;return new Response(article());},now);assert.equal(calls,0);
});
test('slow articles time out individually without aborting articles in the next batch',async()=>{
 const keepAlive=setTimeout(()=>{},2000);try{
  const entries='<main>'+[1,2,3,4].map(i=>'<a href="/news/item'+i+'">Item '+i+'</a>').join('')+'</main>';
  const r=await monitorSource({...news,articleTimeoutMs:40},{},async(url,options)=>{
   if(url===news.url)return new Response(entries);if(url.endsWith('item4'))return new Response(article());
   return new Promise((resolve,reject)=>{if(options.signal.aborted)reject(options.signal.reason);else options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true});});
  },now);
  assert.equal(r.status,'partial');assert.equal(r.noteParams.verified,1);assert.equal(r.events[0].sourceUrl,'https://www.anthropic.com/news/item4');assert.equal(r.events[0].sourceStale,false);
 }finally{clearTimeout(keepAlive);}
});}return new Response(url===news.url?listing:article());};
 const a=await monitorSource(news,{},fetcher,now);assert.equal(calls,2);
 const b=await monitorSource(news,a,fetcher,now+1000);assert.equal(calls,2);assert.equal(b.events[0].sourceStale,false);assert.equal(b.articleCache['https://www.anthropic.com/news/two'].failureCount,1);
});},AbortSignal.timeout(1000)),e=>e.message==='HTTP '+status&&(status!==503||e.retryAt>Date.now()));assert.equal(calls,1);}
});assert.notEqual(text,key);assert(!/\{(?:verified|total)\}/.test(text));}
});
