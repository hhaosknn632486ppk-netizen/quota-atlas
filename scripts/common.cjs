'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function plain(p){for(let current=path.resolve(p);;current=path.dirname(current)){if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw new Error('Linked path refused');if(current===path.dirname(current))break;}}
function child(base,p){const a=path.resolve(base),b=path.resolve(p);if(!b.startsWith(a+path.sep))throw new Error('Path escapes intended directory');plain(b);return b;}
function files(dir){plain(dir);return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);plain(p);return e.isDirectory()?files(p):e.isFile()?[p]:[];});}
function powershell(script,args=[]){if(process.platform!=='win32')throw new Error('Windows x64 is required for this command');const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts',script),...args],{encoding:'utf8',windowsHide:true,timeout:180000});if(r.status!==0)throw new Error(r.stderr||r.stdout||'PowerShell failed');return r.stdout;}
module.exports={root,hash,plain,child,files,powershell};
