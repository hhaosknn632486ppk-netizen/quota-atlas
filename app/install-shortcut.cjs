'use strict';
const {app,shell}=require('electron'),path=require('node:path'),fs=require('node:fs');
const [shortcut,appId,data]=process.argv.slice(2),root=path.resolve(__dirname,'..');
if(!shortcut||!path.isAbsolute(shortcut)||!shortcut.endsWith('.lnk')||!/^QuotaAtlas\.(Desktop|Validation\.[A-Za-z0-9]+)$/.test(appId||'')||!data||!path.isAbsolute(data))process.exit(2);
app.setPath('userData',path.join(data,'installer-session'));
app.whenReady().then(()=>{
 fs.mkdirSync(path.dirname(shortcut),{recursive:true});
 const target=path.join(root,'runtime','electron.exe');
 if(!shell.writeShortcutLink(shortcut,'create',{target,args:'"'+__dirname+'"',cwd:root,description:'Quota Atlas',appUserModelId:appId}))throw new Error('Unable to create shortcut');
 const saved=shell.readShortcutLink(shortcut);
 if(saved.target.toLowerCase()!==target.toLowerCase()||saved.appUserModelId!==appId)throw new Error('Shortcut verification failed');
 app.exit(0);
}).catch(()=>app.exit(1));
