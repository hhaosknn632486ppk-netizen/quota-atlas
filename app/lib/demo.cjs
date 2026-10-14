'use strict';
const {makeEvent}=require('./domain.cjs');
function demoState(now=Date.now()){
 const date=delta=>new Date(now+delta*3600000).toISOString();
 const accounts=[{provider:'codex',plan:'pro',mode:'auto',status:'live',accountKey:'demo',checkedAt:date(0),windows:[{id:'week',name:'每周额度',remaining:38,unit:'%',resetAt:date(7*24),durationMins:10080,rollover:'no'}],resetCredits:{availableCount:2,credits:[{key:'demo-1',title:'模型发布赠送券',titleKey:'demoVoucher',expiresAt:date(5)}]}},{provider:'workbuddy',plan:'pro',mode:'manual',status:'manual',checkedAt:date(0),windows:[{id:'manual',name:'赠送积分',remaining:420,unit:'积分',expiresAt:date(3),rollover:'no'}]},{provider:'claude',plan:'pro',mode:'manual',status:'manual',checkedAt:date(0),windows:[{id:'manual',name:'会话额度',remaining:64,unit:'%',resetAt:date(2),rollover:'unknown'}]}];
 const events=[
  {id:'demo-direct',provider:'codex',kind:'reset',title:'演示：今晚直接重置周额度',titleKey:'demoDirect',detail:'用于验证预告与个人额度的联动；不是真实公告。',plans:['pro','plus'],scope:'Pro / Plus',sourceUrl:'https://example.com/demo/direct',announcedAt:date(-1),effectiveAt:date(4),phase:'pending',rollover:'no'},
  {id:'demo-chatgpt',provider:'chatgpt',kind:'reset',title:'ChatGPT weekly quota reset',plans:['plus','pro'],scope:'Plus / Pro',sourceUrl:'https://example.com/demo/chatgpt/announcement',campaignId:'chatgpt-demo-reset',announcedAt:date(-6),effectiveAt:date(-2),precision:'approximate',phase:'pending'},
  {id:'demo-chatgpt-update',provider:'chatgpt',kind:'reset',title:'ChatGPT quota reset completed',plans:['plus','pro'],scope:'Plus / Pro',sourceUrl:'https://example.com/demo/chatgpt/update',campaignId:'chatgpt-demo-reset',announcedAt:date(-1),effectiveAt:date(-2),precision:'approximate',phase:'reported'},
  {id:'demo-banked',provider:'codex',kind:'banked',title:'演示：发放可留存的重置券',titleKey:'demoBanked',plans:['pro','plus'],scope:'Pro / Plus',sourceUrl:'https://example.com/demo/banked',announcedAt:date(-2),phase:'announced'},
  {id:'demo-gift',provider:'claude',kind:'grant',title:'演示：Pro 套餐试用额度待领取',titleKey:'demoGift',detail:'只用于演示手动领取建议。',plans:['pro'],scope:'Pro',claimRequired:true,sourceUrl:'https://example.com/demo/gift',announcedAt:date(-3),expiresAt:date(20)},
  {id:'demo-mismatch',provider:'cursor',kind:'grant',title:'演示：仅限企业账户的赠送',titleKey:'demoEnterprise',plans:['enterprise'],scope:'Enterprise',sourceUrl:'https://example.com/demo/enterprise',announcedAt:date(-2)},
  {id:'demo-incident',provider:'gemini',kind:'incident',title:'演示：服务恢复，尚无补偿公告',titleKey:'demoIncident',sourceUrl:'https://example.com/demo/incident',announcedAt:date(-1),phase:'resolved',evidence:'official'}
 ].map(e=>makeEvent({...e,source:'内置演示场景',sourceCheckedAt:date(0),demo:true}));
 return {accounts,events,sources:[{id:'demo',name:'内置场景 · 非真实数据',status:'ok',type:'demo',providers:['codex','claude','workbuddy','cursor','gemini'],checkedAt:date(0),events}],demo:true};
}
module.exports={demoState};
