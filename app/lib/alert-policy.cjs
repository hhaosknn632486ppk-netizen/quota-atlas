'use strict';
const {createHash}=require('node:crypto');
function followedProviders(settings,accounts){
 return settings.followedProviders===null||settings.followedProviders===undefined
  ? [...new Set(accounts.filter(a=>a.status==='live'||a.status==='observed'||a.windows?.length).map(a=>a.provider))]
  : settings.followedProviders;
}
function quietNow(settings,now=Date.now()){
 if(!settings.quietHoursEnabled)return false;
 const minutes=s=>/^([01]\d|2[0-3]):[0-5]\d$/.test(s||'')?Number(s.slice(0,2))*60+Number(s.slice(3)):null;
 const start=minutes(settings.quietStart),end=minutes(settings.quietEnd),d=new Date(now),current=d.getHours()*60+d.getMinutes();
 if(start===null||end===null||start===end)return false;
 return start<end?current>=start&&current<end:current>=start||current<end;
}
function directEvidence(event){return [event,...(event.variants||[])].some(e=>!e.sourceStale&&!e.stale&&e.sourceRoute==='direct'&&['official','public'].includes(e.evidence));}
function activityLevel(event,personal,now=Date.now()){
 if(!['reset','teaser','banked','grant','boost'].includes(event.kind)||event.sourceStale||event.conflict||personal?.state==='no'||now-Date.parse(event.announcedAt)>7*86400000||Date.parse(event.announcedAt)>now+60000||event.expiresAt&&Date.parse(event.expiresAt)<=now)return null;
 if(personal?.state==='yes')return 'action';
 return directEvidence(event)?'watch':null;
}
function activityFingerprint(event){
 const semantic={kind:event.kind==='teaser'?'reset':event.kind,effectiveAt:event.effectiveAt||null,expiresAt:event.expiresAt||null,claim:!!event.claimRequired,apply:!!event.applicationRequired,plans:[...(event.plans||[])].sort(),channels:[...(event.channels||[])].sort(),region:event.region||null,conditions:!!event.conditionsUnparsed};
 return createHash('sha256').update(JSON.stringify(semantic)).digest('hex').slice(0,16);
}
module.exports={followedProviders,quietNow,directEvidence,activityLevel,activityFingerprint};
