'use strict';
const {accountId}=require('./accounts.cjs');
// The caller supplies changes already validated by detectChanges / gapChanges.
// Observations describe the account, never a provider campaign's cause.
function observations(previous,current,changes,interrupted=false){
 if(!changes.length||!previous?.accountKey||previous.accountKey!==current.accountKey||accountId(previous)!==accountId(current))return [];
 const common={accountId:accountId(current),accountKey:current.accountKey,provider:current.provider,observedAt:current.checkedAt,sinceAt:previous.checkedAt,interrupted,cause:'unknown'};
 const rows=(current.windows||[]).flatMap(w=>{
  const before=previous.windows?.find(p=>p.id===w.id);
  if(!before||before.remaining==null||w.remaining==null||before.unit!==w.unit||w.component||before.component||w.metricKind==='limit')return [];
  const difference=w.remaining-before.remaining;
  if(w.unit==='%'?difference<10:!['USD','CNY','points','积分'].includes(w.unit)||difference<=0.000001)return [];
  return [{...common,id:common.accountId+':'+w.id+':'+common.observedAt,type:w.unit==='%'?'quota_increase':'balance_increase',windowId:w.id,unit:w.unit,from:before.remaining,to:w.remaining}];
 });
 const from=previous.resetCredits?.availableCount,to=current.resetCredits?.availableCount;
 if(Number.isInteger(from)&&Number.isInteger(to)&&from>=0&&to>from)rows.push({...common,id:common.accountId+':voucher:'+common.observedAt,type:'voucher_increase',from,to});
 return rows;
}
function recentObservation(event,context,rows,now=Date.now()){
 if(context.eligible.state!=='yes'||!context.account?.accountKey||event.conflict||event.sourceStale)return null;
 return rows.filter(o=>o.accountId===context.accountId&&o.accountKey===context.account.accountKey&&Date.parse(o.observedAt)<=now&&Date.parse(o.observedAt)>=Date.parse(event.announcedAt)&&now-Date.parse(o.observedAt)<48*3600000&&(!event.expiresAt||Date.parse(o.observedAt)<=Date.parse(event.expiresAt))&&(
  event.kind==='banked'?o.type==='voucher_increase':event.kind==='grant'?o.type==='balance_increase':['reset','teaser','boost'].includes(event.kind)&&o.type==='quota_increase'&&(!event.targetDurationMins||context.window?.id===o.windowId)
 )).sort((a,b)=>Date.parse(b.observedAt)-Date.parse(a.observedAt))[0]||null;
}
module.exports={observations,recentObservation};
