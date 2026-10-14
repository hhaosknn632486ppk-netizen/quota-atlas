'use strict';
const {app,shell}=require('electron'),path=require('node:path'),fs=require('node:fs');
const [requested,appId]=process.argv.slice(2),root=path.resolve(__dirname,'..');
const programs=path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs');
const {resolveShortcutPath}=require('./lib/local-paths.cjs');
const shortcut=resolveShortcutPath(requested,programs);
if(!shortcut||!/^QuotaAtlas\.(Desktop|Validation\.[A-Za-z0-9]+)$/.test(appId||''))process.exit(2);
app.setPath('userData',path.join(app.getPath('temp'),'QuotaAtlas','shortcut-helper-'+process.pid));
app.whenReady().then(()=>{
 fs.mkdirSync(programs,{recursive:true});
 const target=path.join(root,'runtime','electron.exe');
 if(!shell.writeShortcutLink(shortcut,'create',{target,args:'"'+__dirname+'"',cwd:root,description:'Quota Atlas',appUserModelId:appId}))throw new Error('Unable to create shortcut');
 const saved=shell.readShortcutLink(shortcut);
 if(saved.target.toLowerCase()!==target.toLowerCase()||saved.appUserModelId!==appId)throw new Error('Shortcut verification failed');
 app.exit(0);
}).catch(()=>app.exit(1));
