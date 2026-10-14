'use strict';
const {randomUUID}=require('node:crypto');
class NotificationDelivery {
 constructor({Notification,enabled=()=>true,onStatus=()=>{},onClick=()=>{},timeoutMs=8000}){this.Native=Notification;this.enabled=enabled;this.onStatus=onStatus;this.onClick=onClick;this.timeoutMs=timeoutMs;this.active=new Map();}
 send(options,{test=false,target='accounts',messageId=null}={}){
  const id='qa-'+randomUUID().replaceAll('-','').slice(0,12);let settled=false,timer;
  return new Promise(resolve=>{
   const status=state=>{const value={id,state,test,messageId,at:new Date().toISOString()};this.onStatus(value);if(!settled){settled=true;clearTimeout(timer);resolve(value);}return value;};
   if(!this.enabled()){status('suppressed');return;}
   if(!this.Native.isSupported()){status('unsupported');return;}
   let n;try{
    n=new this.Native({...options,id,groupId:'quota-atlas'});this.active.set(id,n);
    n.on('show',()=>status('shown'));
    n.on('failed',()=>{status('failed');this.active.delete(id);});
    n.on('click',()=>{status('clicked');this.onClick(target);});
    n.on('close',()=>{this.active.delete(id);});
    // Retain native objects while the toast is active; otherwise GC can lose events.
    if(this.active.size>50)this.active.delete(this.active.keys().next().value);
    this.onStatus({id,state:'submitted',test,messageId,at:new Date().toISOString()});
    timer=setTimeout(()=>status('unconfirmed'),this.timeoutMs);timer.unref?.();n.show();
   }catch{status('failed');this.active.delete(id);}
  });
 }
 close(){for(const notification of this.active.values())notification.close();this.active.clear();}
}
module.exports={NotificationDelivery};
