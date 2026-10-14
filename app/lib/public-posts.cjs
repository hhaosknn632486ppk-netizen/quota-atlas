'use strict';
const {activityRecords}=require('./announcements.cjs');
const SOCIAL_SOURCES=[
 {id:'x-tibo',name:'Tibo · @thsottiaux',username:'thsottiaux',providers:['codex','chatgpt'],identityUrl:'https://openai.com/index/openai-to-acquire-astral/'},
 {id:'x-openai',name:'OpenAI · @OpenAI',username:'OpenAI',providers:['codex','chatgpt'],identityUrl:'https://openai.com/'},
 {id:'x-anthropic',name:'Anthropic · @AnthropicAI',username:'AnthropicAI',providers:['claude'],identityUrl:'https://www.anthropic.com/'},
 {id:'x-deepseek',name:'DeepSeek · @deepseek_ai',username:'deepseek_ai',providers:['deepseek'],identityUrl:'https://www.deepseek.com/'},
 {id:'x-gemini',name:'Gemini · @GeminiApp',username:'GeminiApp',providers:['gemini'],identityUrl:'https://gemini.google.com/'},
 {id:'x-grok',name:'xAI · @xai',username:'xai',providers:['grok'],identityUrl:'https://x.ai/'}
].map(s=>({...s,type:'public',format:'x-api',url:'https://x.com/'+s.username,intervalMs:5*60000}));
function publicFailure(code,retryAt){return Object.assign(new Error(code),{code,retryAt});}
async function xJson(url,token,fetcher){const signal=AbortSignal.timeout(18000);let response;try{response=await fetcher(url,{signal,redirect:'error',headers:{Authorization:'Bearer '+token,'User-Agent':'QuotaAtlas/0.6.0'}});}catch{throw publicFailure('socialNetwork');}
 if(!response.ok){if(response.status===429){const reset=Number(response.headers.get('x-rate-limit-reset'));throw publicFailure('socialRateLimited',Math.max(Date.now()+5*60000,Number.isFinite(reset)?reset*1000:0));}throw publicFailure([401,403].includes(response.status)?'socialPermission':'socialNetwork');}
 let text='',bytes=0;const decoder=new TextDecoder();try{for await(const chunk of response.body){bytes+=chunk.length;if(bytes>1000000)throw publicFailure('socialNetwork');text+=decoder.decode(chunk,{stream:true});}text+=decoder.decode();return JSON.parse(text);}catch{throw publicFailure('socialNetwork');}
}
async function fetchPublicPosts(source,previous,token,fetcher=fetch,now=Date.now()){
 const profile=await xJson('https://api.x.com/2/users/by/username/'+source.username+'?user.fields=name,username',token,fetcher);
 if(!/^\d+$/.test(profile.data?.id||'')||String(profile.data?.username).toLowerCase()!==source.username.toLowerCase())throw publicFailure('socialIdentity');
 const userId=profile.data.id;if(previous.userId&&previous.userId!==userId)throw publicFailure('socialIdentity');
 const base='https://api.x.com/2/users/'+userId+'/tweets';const u=new URL(base);u.searchParams.set('max_results','20');u.searchParams.set('tweet.fields','created_at,author_id,entities,referenced_tweets');u.searchParams.set('exclude','retweets');
 // Scan a bounded recent window on each refresh so edits can update an existing campaign.
 const raw=await xJson(u.href,token,fetcher);if(raw.errors?.length||raw.data&&!Array.isArray(raw.data)||!raw.data&&!raw.meta)throw publicFailure('socialNetwork');
 const posts=(raw.data||[]).filter(p=>p.author_id===userId&&/^\d+$/.test(p.id)&&!p.referenced_tweets?.some(r=>r.type==='quoted'||r.type==='retweeted'));
 const records=posts.filter(p=>typeof p.text==='string').map(p=>({title:p.text.split('\n')[0].slice(0,180),text:p.text,publishedAt:p.created_at,url:'https://x.com/'+source.username+'/status/'+p.id}));
 return {userId,postCount:posts.length,datedPostCount:posts.filter(p=>Number.isFinite(Date.parse(p.created_at))).length,records:activityRecords(records,source),updatedAt:posts.map(p=>p.created_at).sort().at(-1)||null,checkedAt:new Date(now).toISOString()};
}
module.exports={SOCIAL_SOURCES,fetchPublicPosts,publicFailure};
