'use strict';
const fs=require('node:fs');const path=require('node:path');
class Store{
 constructor(root){this.root=root;fs.mkdirSync(root,{recursive:true});this.file=path.join(root,'state.json');const defaults={language:'system',notifications:true,widget:true,widgetExpanded:false,widgetPinned:true,widgetPosition:null,widgetAccount:"auto",followedProviders:null,notifyUnconfirmed:true,quietHoursEnabled:false,quietStart:"22:00",quietEnd:"08:00",uiVersion:2};this.state={version:1,accounts:[],sources:[],seenNotifications:[],notifications:[],tasks:[],settings:defaults,history:[],activitySeen:{},activityDismissed:{},observations:[]};try{const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(saved.version===1){this.state={...this.state,...saved,settings:{...defaults,...saved.settings}};if(!saved.settings?.uiVersion)Object.assign(this.state.settings,{widget:true,widgetExpanded:false,uiVersion:2});}}catch{} }
 save(){const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify(this.state,null,2));fs.renameSync(temp,this.file);}
}
module.exports={Store};
