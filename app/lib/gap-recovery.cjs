'use strict';
const {accountId}=require('./accounts.cjs'),I=require('../ui/i18n.js');
function gapChanges(previous,current,now=Date.now(),locale='zh-CN'){
 if(!previous?.accountKey||previous.accountKey!==current?.accountKey||current.status!=='live'||accountId(previous)!==accountId(current)||now-new Date(previous.checkedAt)>7*86400000||now-new Date(current.checkedAt)>(current.freshForMs||3*60000))return [];
 const changes=(current.windows||[]).flatMap(w=>{const old=previous.windows?.find(p=>p.id===w.id);if(!old||w.remaining==null||old.remaining==null||w.component||old.component||w.metricKind==='limit'||old.unit!==w.unit)return [];const diff=w.remaining-old.remaining;if(w.unit==='%'?diff<10:!['points','积分','USD','CNY'].includes(w.unit)||diff<=0.000001)return [];
 return [{id:'gap-recovery:'+accountId(current)+':'+w.id+':'+current.checkedAt,provider:current.provider,kind:'recovery',...I.message(locale,'gapRecoveryTitle','gapRecoveryBody',{nameWindow:w,name:I.windowName(w,locale),from:old.remaining,to:w.remaining,rawUnit:w.unit,unit:I.unitName(w.unit,locale)}),basis:I.t(locale,'basisSnapshots')}];});
 const before=previous.resetCredits?.availableCount,after=current.resetCredits?.availableCount;if(Number.isInteger(before)&&Number.isInteger(after)&&after>before)changes.push({id:'gap-credit:'+accountId(current)+':'+current.checkedAt,provider:current.provider,kind:'credit',...I.message(locale,'creditIncrease','gapVoucherBody',{n:after}),basis:I.t(locale,'basisSnapshots')});return changes;
}
module.exports={gapChanges};
