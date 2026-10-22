'use strict';
// Deliberately conservative: extract explicit statements; uncertain conditions stay uncertain.
function decode(s){return String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[\da-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c>0&&c<=0x10ffff?String.fromCodePoint(c):' ';}).replace(/&(amp|lt|gt|quot|apos|nbsp);/g,(_,n)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '})[n]);}
function readable(html){return decode(String(html).replace(/<(script|style|nav|header|footer|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<(?:p|div|h[1-6]|li|tr|br|section)\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ')).replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();}
function content(html){const main=String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||String(html).match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];return main?readable(main):null;}
function isoDate(value){if(!value)return null;const s=String(value),n=Date.parse(!/T\d{2}|:\d{2}/.test(s)?s+' UTC':s);return Number.isFinite(n)?new Date(n).toISOString():null;}
function explicitChannels(text,provider){const api=/\bAPI\b|开发者平台|API\s*余额/i.test(text),sub=/\b(?:subscribers?|subscription|Claude Code|ChatGPT|Codex|Pro|Max|Plus|Business)\b|订阅|网页版|会员/.test(text);if(api&&sub)return null;if(api)return ['api'];if(sub||['codex','chatgpt','claude','workbuddy','cursor','copilot'].includes(provider))return ['subscription','web'];return null;}
function interpretation(text,provider){
 const s=String(text||'');const claimRequired=/\b(?:claim|redeem|activate|manually use)\b|需要(?:手动)?(?:领取|兑换|激活|使用)|点击领取|主动领取/i.test(s)&&!/no (?:need to |action |claiming )|无需(?:手动)?(?:领取|兑换|操作)/i.test(s);
 const plans=[];const names={plus:'plus',pro:'pro',business:'business',team:'team',enterprise:'enterprise',free:'free',max:'max',standard:'standard',premium:'premium',ultimate:'ultimate'};
 const planClauses=[...s.matchAll(/\b(?:for|to|on|with|all|our)\s+([^.!?\n]{0,180}(?:users?|subscribers?|plans?|members?|accounts?|tiers?))\b/gi)].map(m=>m[0]).join(' ');
 for(const [word,id] of Object.entries(names))if(new RegExp('\\b'+word+'\\s+(?:(?:(?:and|,|or|&)\\s*)?(?:Plus|Pro|Max|Business|Team|Enterprise|Free|Standard|Premium|Ultimate)\\s*)*(?:plan|users?|subscribers?|tier|members?|accounts?)\\b','i').test(s)||new RegExp('\\b'+word+'\\b','i').test(planClauses))plans.push(id);
 if(provider==='workbuddy'){for(const [word,id] of [['体验版','free'],['标准版','standard'],['高级版','premium'],['旗舰版','ultimate']])if(s.includes(word))plans.push(id);}
 if(/\ball (?:codex |claude |chatgpt )?(?:users|accounts)\b|所有用户|全部用户/i.test(s))plans.push('all');
 const conditionsUnparsed=/\b(?:new (?:(?:Pro|Plus|Max|paid) )?(?:users?|subscribers?|customers?)|selected|eligible|first \d+|only in|only (?:US|UK|EU)|United States|except|excluding|not available|may receive|might receive|researchers?|universities|institutions|nonprofits?|approved|verification)\b|新用户|首次订阅|受邀|部分用户|不包括|不适用|指定地区|仅限.*地区|符合条件|科研机构|高校|资格审核/i.test(s);
 const targetDurationMins=/weekly|week(?:ly)? quota|每周|周额度|七天|7.day/i.test(s)?10080:/five.hour|5.hour|五小时|5\s*小时/i.test(s)?300:null;
 return {claimRequired,plans:[...new Set(plans)],channels:explicitChannels(s,provider),conditionsUnparsed,targetDurationMins,applicationRequired:/\b(?:apply|applications?|application form)\b|申请|资格审核/i.test(s)};
}
function classify(text){
 const s=String(text||'');
 if(!/quota|rate.limit|usage.limit|credits?|reset|额度|积分|重置|扩容|用量/i.test(s))return null;
 if(/\b(?:should we|would you|we are considering|we're considering|we may|might reset|could reset|not resetting|won't reset|will not reset|no (?:quota |rate.limit )reset)\b|是否.*重置|考虑.*(?:重置|送额度)|不会重置|不进行重置/i.test(s))return null;
 let kind;if(/banked reset|reset (?:credit|voucher|card)|重置[券卡]/i.test(s))kind='banked';
 else if(/\b(?:resetting|reset|resetting all)\b[^.!?\n]{0,100}(?:quota|rate.limit|usage.limit)|(?:quota|rate.limit|usage.limit)[^.!?\n]{0,100}\breset\b|(?:额度|限额)[^。\n]{0,40}重置|重置[^。\n]{0,40}(?:额度|限额)/i.test(s))kind='reset';
 else if(/(?:free|bonus|gift|grant|give|giving|receive|claim|provid(?:e|es|ing)|award(?:ed|ing)?)[^.!?\n]{0,80}\bcredits?\b|\bcredits?\b[^.!?\n]{0,60}(?:free|bonus|grant)|(?:赠送|加赠|赠予|领取|送)[^。\n]{0,30}(?:额度|积分)/i.test(s))kind='grant';
 else if(/(?:double|doubled|doubling|increase|increased|boost|higher)[^.!?\n]{0,80}(?:usage|rate.limit|quota)|(?:usage|rate.limit|quota)[^.!?\n]{0,80}(?:double|increase|boost)|(?:提升|提高|扩容|翻倍)[^。\n]{0,30}(?:额度|限额|用量)|(?:额度|用量)[^。\n]{0,30}(?:提升|翻倍)/i.test(s))kind='boost';
 if(!kind)return null;
 // Explanatory documentation is a policy observation, not a new campaign.
 if(/how (?:to|.*work)|automatically resets? (?:every|after)|reset(?:s)? every|reset(?:s)? after \d+|每(?:周|月|天).*重置/i.test(s)&&!/celebrate|celebration|today|tomorrow|limited.time|promotion|活动|限时|今天|明天/i.test(s))return null;
 const phase=kind==='reset'?/\b(?:will|going to|tomorrow|in \d+)\b|将(?:在|于)|即将|预计|明天/i.test(s)?'pending':/\b(?:have reset|has reset|reset all propagated|already reset|limits were reset)\b|已经重置|已完成重置|已重置/i.test(s)?'reported':'announced':/\b(?:will|tomorrow)\b|即将|将发放/i.test(s)?'pending':'announced';
 return {kind,phase};
}
function explicitTimes(text){const s=String(text||'');const stamps=[...s.matchAll(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})\b/g)];let effectiveAt=null,expiresAt=null;
 for(const m of stamps){const prefix=s.slice(Math.max(0,m.index-70),m.index);if(/expir|valid until|claim by|deadline|到期|截止|有效期至/i.test(prefix))expiresAt=isoDate(m[0]);else if(/reset|start|effective|begin|重置|开始|生效/i.test(prefix))effectiveAt=isoDate(m[0]);}
 return {effectiveAt,expiresAt};
}
function activityRecords(records,source){return records.flatMap(r=>{const text=r.text?.includes(r.title||'')?r.text:(r.title||'')+'\n'+(r.text||'');const type=classify(text);if(!type||r.pageMatched===false||!isoDate(r.publishedAt)||!r.url)return [];const providers=source.providers.length===1?source.providers:source.providers.filter(p=>new RegExp('\\b'+p+'\\b','i').test(text));if(!providers.length)return [];return providers.map(provider=>{const interpreted=interpretation(text,provider);return {provider,...type,...interpreted,...explicitTimes(text),title:r.title||text.split('\n')[0].slice(0,180),detail:r.text||text,originalText:text.slice(0,6000),sourceUrl:r.url,announcedAt:r.publishedAt,publishedPrecision:r.publishedPrecision||null,evidence:source.type==='official'?'official':'public',source:source.name,scope:interpreted.plans.length?interpreted.plans.join(' / '):'适用范围未说明',interpretation:'rules',sourceRoute:'direct',campaignId:r.campaignId||null,identityUrl:source.identityUrl||null};});});}
function articleRecords(html,url){let text=content(html);
 // xAI's article template uses a marked section rather than main/article.
 // Keep this fallback tied to its official host and article markers.
 if(!text&&new URL(url).hostname==='x.ai'&&/^\/news\/[^/]+\/?$/.test(new URL(url).pathname)){
  let depth=0,start=0;
  for(const tag of String(html).matchAll(/<\/?section\b[^>]*>/gi)){
   if(!/^<\//.test(tag[0])){if(depth===0)start=tag.index;depth++;}
   else if(depth>0&&--depth===0){const section=String(html).slice(start,tag.index+tag[0].length);if(/\bdata-article-top=["']true["']/i.test(section)&&/<h1\b[^>]*\bid=["']post-title-navigator-anchor["']/i.test(section)){text=readable(section);break;}}
  }
 }
 if(!text)throw new Error('Article structure unavailable');let publishedAt=null,publishedValue=null;
 for(const m of String(html).matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const parsed=JSON.parse(m[1]);const visit=x=>{if(!x||typeof x!=='object')return;if(x.datePublished&&!publishedAt){publishedAt=isoDate(x.datePublished);publishedValue=String(x.datePublished);}if(Array.isArray(x))x.forEach(visit);if(x['@graph'])visit(x['@graph']);};visit(parsed);}catch{}}
 const meta=html.match(/<meta[^>]*(?:property|name)=["']article:published_time["'][^>]*content=["']([^"']+)/i);if(!publishedAt&&meta){publishedAt=isoDate(meta[1]);publishedValue=meta[1];}
 if(!publishedAt){
  for(const tag of String(html).matchAll(/<meta\b[^>]*>/gi)){
   if(!/(?:property|name)=["']article:published_time["']/i.test(tag[0]))continue;
   const value=tag[0].match(/\bcontent=["']([^"']+)/i)?.[1];if(isoDate(value)){publishedAt=isoDate(value);publishedValue=value;break;}
  }
 }
 if(!publishedAt){
  const body=String(html).match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i)?.[1]||'';
  const header=body.split(/<h2\b|<footer\b|<nav\b/i)[0];
  const value=header.match(/<time\b[^>]*\bdatetime=["']([^"']+)/i)?.[1];
  if(isoDate(value)){publishedAt=isoDate(value);publishedValue=value;}
 }
 const date=text.split(/\n/).slice(0,12).map(line=>line.trim().match(/^(?:(?:Published|发布日期)[:：]?\s*)?((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2}|20\d{2}[/-]\d{1,2}[/-]\d{1,2})$/i)).find(Boolean);publishedAt ||= isoDate(date?.[1]);
 let publicationBasis=publishedValue?'metadata':date?'body':null;
 // Docusaurus dates may live only in the active article's navigation label.
 if(!publishedAt&&new URL(url).hostname==='api-docs.deepseek.com'&&/deepseek/i.test(readable(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||''))){for(const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){let target;try{target=new URL(decode(m[1]),url);}catch{continue;}if(target.origin!==new URL(url).origin||target.pathname.replace(/\/$/,'')!==new URL(url).pathname.replace(/\/$/,''))continue;const linkedDate=readable(m[2]).match(/\b20\d{2}[/-]\d{1,2}[/-]\d{1,2}\b/);if(linkedDate){publishedAt=isoDate(linkedDate[0]);publicationBasis='matching-official-link';break;}}}
 const title=readable(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'').slice(0,500);
 const pageMatched=!!title&&!(new URL(url).hostname==='api-docs.deepseek.com'&&/\/news\//.test(new URL(url).pathname)&&/your first api call/i.test(title));
 return [{title,text,publishedAt,url,pageMatched,publicationBasis,publishedPrecision:publishedAt&&!/T\d{2}:/.test(publishedValue||'')?'date':null}];
}
function newsLinks(html,source){const main=source.linkScope==='document'?html:String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||html;const links=[];const seen=new Set();for(const m of main.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){let u;try{u=new URL(decode(m[1]),source.url);}catch{continue;}if(u.protocol!=='https:'||u.username||u.password||u.hostname!==new URL(source.url).hostname||!/^\/news\/[^/]+\/?$/.test(u.pathname)||seen.has(u.href))continue;if(u.hostname==='api-docs.deepseek.com'&&!u.pathname.endsWith('/'))u.pathname+='/';seen.add(u.href);links.push({url:u.href,title:readable(m[2])});}return links.slice(0,source.articleLimit||8);}
function datedSections(html,url){const text=content(html);if(!text)throw new Error('Changelog structure unavailable');const headings=[...text.matchAll(/(?:^|\n)\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2}|20\d{2}[/-]\d{1,2}[/-]\d{1,2})\s*(?:\n|$)/g)];return headings.slice(0,40).map((m,i)=>({title:m[1],publishedAt:isoDate(m[1]),text:text.slice(m.index+m[0].length,headings[i+1]?.index||text.length).slice(0,7000),url:url+'#'+m[1].toLowerCase().replace(/[^a-z0-9]+/g,'-')}));}
module.exports={decode,readable,content,isoDate,explicitChannels,interpretation,classify,explicitTimes,activityRecords,articleRecords,newsLinks,datedSections};
