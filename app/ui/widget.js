'use strict';
const I=window.AtlasI18n,C=window.AtlasCompanion,$=id=>document.getElementById(id);let state,locale='zh-CN',optionKey='';const t=(key,p)=>I.t(locale,key,p);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function until(value){if(!value)return t('noDeadline');const ms=new Date(value)-Date.now();if(!Number.isFinite(ms))return t('noDeadline');if(ms<=0)return t('waitingPeriod');const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return t('resetIn',{time:h>=24?t('daysHours',{d:Math.floor(h/24),h:h%24}):h?t('hoursMins',{h,m}):t('mins',{m})});}
function time(value){return new Intl.DateTimeFormat(locale,{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));}
function label(a){return (state.providers.find(p=>p.id===a.provider)?.name||a.provider)+' · '+t(C.channel(a)==='api'?'api':C.channel(a)==='web'?'web':'subscription');}
function value(w){return w?.remaining!=null&&(!w.observedAt||Date.now()-new Date(w.observedAt)<5*60000)?w.remaining:null;}
function format(w){const amount=value(w);return amount==null?'—':new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(amount)+(w.unit==='%'?'%':' '+I.unitName(w.unit,locale));}
function followed(){return state.settings.followedProviders??[...new Set(state.accounts.filter(a=>a.status==='live'||a.status==='observed'||a.windows?.length).map(a=>a.provider))];}
function render(s){
 state=s;locale=s.locale;I.apply(document,locale);document.title=t('app')+' · '+t('widget');$('brand-name').textContent=t('app');document.body.classList.toggle('expanded',s.settings.widgetExpanded);
 const a=C.selectAccount(s.accounts,s.settings),w=C.windowFor(a),select=$('widget-account');
 const nextKey=JSON.stringify([locale,s.accounts.map(a=>[C.id(a),a.provider,C.channel(a)])]);
 if(nextKey!==optionKey){select.innerHTML='<option value="auto">'+esc(t('autoAccount'))+'</option>'+s.accounts.map(a=>'<option value="'+esc(C.id(a))+'">'+esc(label(a))+'</option>').join('');optionKey=nextKey;}
 select.value=s.settings.widgetAccount||'auto';if(!select.value)select.value='auto';select.title=t('widgetAccount')+' · '+(a?label(a):t('notConnected'));select.ariaLabel=t('widgetAccount');
 const status=s.testData?'testDataShort':s.demo?'demo':a?.status==='live'?'realtime':a?.status==='observed'?'pageSnapshot':a?.status==='manual'?'manual':a?.status==='error'?'readFailed':a?'cached':'connecting';
 $('mode').textContent=t(status);$('mode').classList.toggle('demo',s.demo);$('value').textContent=format(w);$('value').title=w?I.windowName(w,locale):t('usageUnknown');
 $('note').textContent=a?(s.settings.widgetAccount==='auto'||!s.settings.widgetAccount?(s.providers.find(p=>p.id===a.provider)?.name||a.provider):I.windowName(w||{},locale)||''):t('notConnected');
 const track=$('fill').parentElement;track.hidden=w?.unit!=='%'||value(w)===null;$('fill').style.width=Math.max(0,Math.min(100,value(w)??0))+'%';
 $('pin').setAttribute('aria-pressed',String(s.settings.widgetPinned));$('pin').title=$('pin').ariaLabel=t(s.settings.widgetPinned?'unpin':'pin');$('expand').title=$('expand').ariaLabel=t(s.settings.widgetExpanded?'collapse':'expand');$('close').title=$('close').ariaLabel=t('hideSmall');
 const advice=s.advice.filter(item=>followed().includes(item.provider));const first=advice[0];
 const event=s.events.find(e=>e.id===first?.eventId),deadlineText=first?.deadline?(event&&((event.expiresAt&&event.expiryPrecision==='approximate')||!event.expiresAt&&event.precision!=='exact')?t('approxTime',{time:time(first.deadline)}):time(first.deadline)):'';
 const providerName=first?s.providers.find(p=>p.id===first.provider)?.name||first.provider:'';const actionKey=first?.applicability==='unknown'?'compactCheck':first?.kind==='window'?'compactExpiry':event?.kind==='banked'?'compactVoucher':event?.claimRequired?'compactClaim':event?.kind==='reset'?'compactReset':'compactCheck';
 const shortTime=first?.deadline?new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',hourCycle:'h23',...(new Date(first.deadline).toDateString()!==new Date().toDateString()?{month:'2-digit',day:'2-digit'}:{})}).format(new Date(first.deadline)):'';
 const approximate=event&&!event.expiresAt&&event.precision!=='exact';const brief=first?providerName+' · '+(shortTime?(approximate?t('approxTime',{time:shortTime}):shortTime)+' ':'')+t(actionKey):until(w?.expiresAt||w?.resetAt);
 $('reset').textContent=brief;$('reset').title=first?first.title+' · '+first.body:brief;$('attention').textContent=first?t('widgetAction')+' ↗':t('openMain')+' ↗';
 const others=s.accounts.filter(other=>C.id(other)!== (a?C.id(a):'')).sort((x,y)=>Number(['auto','local'].includes(y.mode))-Number(['auto','local'].includes(x.mode))).slice(0,2);
 document.querySelector('.section-title>span').textContent=t('primarySource');
 $('other-accounts').innerHTML=others.length?others.map(other=>{const p=s.providers.find(p=>p.id===other.provider),win=C.windowFor(other);return '<div class="other-row"><span class="other-name"><i class="provider-dot" style="--color:'+p.color+'"></i>'+esc(p.name)+'<small>'+t(C.channel(other)==='api'?'api':C.channel(other)==='web'?'web':'subscription')+'</small></span><span class="other-value '+(['cached','error'].includes(other.status)?'cached':'')+'" title="'+esc(t(other.status==='error'?'readFailed':other.status==='cached'?'cached':other.status==='observed'?'pageSnapshot':other.status==='manual'?'manual':'live'))+'">'+esc(format(win))+'</span></div>';}).join(''):'<div class="empty-note">'+t('notConnected')+'</div>';
 $('advice').innerHTML=first?'<button class="notice" data-event="'+esc(first.eventId||'')+'"><span><b>'+esc(providerName+' · '+first.title)+'</b><small>'+esc(brief)+'</small></span></button>':'<div class="empty-note">'+t('noAdvice')+'</div>';
}
window.atlas.onUpdate(render);window.atlas.invoke('snapshot').then(render);setInterval(()=>{if(state)render(state);},60000);
$('widget-account').onchange=e=>window.atlas.invoke('settings',{widgetAccount:e.target.value});
$('pin').onclick=()=>window.atlas.invoke('widget:pin');$('expand').onclick=()=>window.atlas.invoke('widget:expand');$('open').onclick=()=>window.atlas.invoke('main','overview');$('open-events').onclick=()=>window.atlas.invoke('main','events');$('advice').onclick=e=>{const notice=e.target.closest('button');if(notice)window.atlas.invoke('main',notice.dataset.event?'events':'accounts');};$('attention').onclick=()=>{const first=state.advice.find(item=>followed().includes(item.provider));return window.atlas.invoke('main',first?.eventId?'events':first?'accounts':'overview');};$('close').onclick=()=>window.atlas.invoke('settings',{widget:false});
window.addEventListener('offline',()=>window.atlas.invoke('networkState',false));window.addEventListener('online',()=>window.atlas.invoke('networkState',true));
