'use strict';
const zones={PT:'America/Los_Angeles',ET:'America/New_York',UTC:'UTC',GMT:'UTC',PST:-8,PDT:-7,EST:-5,EDT:-4,'UTC+8':8,'北京时间':8};
function parts(time,zone){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));}
function zonedDate(y,m,d,h,minute,zone){const wall=Date.UTC(y,m-1,d,h,minute);if(typeof zone==='number')return wall-zone*3600000;let guess=wall;for(let i=0;i<3;i++){const p=parts(guess,zone),rendered=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute);guess+=wall-rendered;}const same=n=>{const p=parts(n,zone);return p.year===y&&p.month===m&&p.day===d&&p.hour===h&&p.minute===minute;};if(!same(guess)||same(guess-3600000)||same(guess+3600000))return null;return guess;}
function publicTiming(text,announcedAt,publishedPrecision){const s=String(text||''),announced=Date.parse(announcedAt);if(!Number.isFinite(announced))return {};
 const result={};const relativeExpiry=s.match(/(?:expires? in|valid for|有效期(?:为)?|将在)\s*(\d+(?:\.\d+)?)\s*(hours?|days?|小时|天)(?:后到期)?/i);if(relativeExpiry&&publishedPrecision!=='date'){const n=Number(relativeExpiry[1]),delta=n*(/days?|天/i.test(relativeExpiry[2])?86400000:3600000);if(delta>0&&delta<=30*86400000){result.expiresAt=new Date(announced+delta).toISOString();result.expiryPrecision='approximate';}}
 const pattern=/\b(?:(today|tomorrow)|(\d{4})-(\d{1,2})-(\d{1,2})|(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:,?\s+(20\d{2}))?)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(PT|PST|PDT|ET|EST|EDT|UTC\+8|UTC|GMT)\b/gi;
 for(const m of s.matchAll(pattern)){const zone=zones[m[11].toUpperCase()];let y,month,d;let h=Number(m[8]),minute=Number(m[9]||0);if(minute>59||h>23||m[10]&&(h<1||h>12))continue;if(m[10])h=h%12+(m[10].toLowerCase()==='pm'?12:0);
  const anchor=typeof zone==='number'?parts(announced+zone*3600000,'UTC'):parts(announced,zone);
  if(m[1]){if(publishedPrecision==='date')continue;const day=new Date(Date.UTC(anchor.year,anchor.month-1,anchor.day+(m[1].toLowerCase()==='tomorrow'?1:0)));y=day.getUTCFullYear();month=day.getUTCMonth()+1;d=day.getUTCDate();}
  else if(m[2]){y=Number(m[2]);month=Number(m[3]);d=Number(m[4]);}
  else{y=Number(m[7]||anchor.year);month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[5].slice(0,3).toLowerCase())+1;d=Number(m[6]);}
  if(month<1||month>12||d<1||d>31||new Date(Date.UTC(y,month-1,d)).getUTCMonth()+1!==month)continue;
  const value=zonedDate(y,month,d,h,minute,zone);if(value===null)continue;if(!m[2]&&!m[7]&&Math.abs(value-announced)>7*86400000)continue;const prefix=s.slice(Math.max(0,m.index-90),m.index);if(/expir|valid until|claim by|deadline|到期|截止/i.test(prefix)){result.expiresAt=new Date(value).toISOString();result.expiryPrecision='exact';}else if(/reset|start|begin|effective|重置|开始|生效/i.test(prefix)){result.effectiveAt=new Date(value).toISOString();result.precision='exact';}
 }
 return result;
}
module.exports={publicTiming,zonedDate};
