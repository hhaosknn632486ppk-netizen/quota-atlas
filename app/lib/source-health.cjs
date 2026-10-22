'use strict';
function healthFor(source,values={}){
 const {accessible=false,contentCount=0,datedCount=0,articleCount=0,eventCount=0,failedCount=0,verifiedEventCount=0,stale=false}=values;
 const policy=source.format==='policy';const activityNotRequired=policy||source.format==='status';const needsDate=['news','changelog','x-api'].includes(source.format);
 const emptyTimeline=source.format==='x-api'&&accessible&&articleCount===0;
 return {access:accessible?'passed':'failed',content:accessible?(contentCount||emptyTimeline?'passed':'failed'):'unknown',publication:policy||emptyTimeline?'not-required':needsDate?(articleCount&&datedCount===articleCount?'passed':datedCount?'partial':'failed'):'not-required',activities:activityNotRequired?'not-required':stale?'blocked':verifiedEventCount>0?'found':!accessible||!contentCount&&!emptyTimeline||needsDate&&!emptyTimeline&&(datedCount<articleCount||!datedCount||failedCount)?'blocked':eventCount?'found':'none',articleCount,datedCount,eventCount,verifiedEventCount,failedCount};
}
function applyHealth(result){if(result.health&&(result.health.access!=='passed'||result.health.content!=='passed'||result.health.publication==='failed'||result.health.publication==='partial'||result.health.failedCount>0)&&result.status==='ok'){result.status='partial';result.noteKey=result.health.publication==='failed'||result.health.publication==='partial'?'sourceDateIncomplete':'sourcePartial';}return result;}
module.exports={healthFor,applyHealth};
