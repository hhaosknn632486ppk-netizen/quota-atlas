'use strict';
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const {spawn,execFile}=require('node:child_process');const {createInterface}=require('node:readline');
const I=require('../ui/i18n.js');function codedError(key,locale){const e=new Error(I.t(locale||'zh-CN',key));e.code=key;return e;}
const {normalizeCodex}=require('./domain.cjs');
const {resolveCodexCandidate}=require('./local-paths.cjs');
async function findCodex(){
  const configured=resolveCodexCandidate(process.env.QUOTA_ATLAS_CODEX);if(configured)return configured;
  const results=await new Promise(resolve=>execFile('where.exe',['codex.exe'],{windowsHide:true,shell:false,timeout:5000},(e,out)=>resolve(e?[]:out.trim().split(/\r?\n/))));for(const result of results){const candidate=resolveCodexCandidate(result);if(candidate)return candidate;}
  const root=path.join(os.homedir(),'AppData','Local','OpenAI','Codex','bin');try{for(const entry of fs.readdirSync(root).reverse()){const candidate=resolveCodexCandidate(path.join(root,entry,'codex.exe'));if(candidate)return candidate;}}catch{}return null;
}
class CodexClient{
  constructor(){this.child=null;this.pending=new Map();this.nextId=0;this.starting=null;}
  async connect(){if(this.child)return;if(this.starting)return this.starting;this.starting=this.start();try{await this.starting;}finally{this.starting=null;}}
  async start(){const binary=await findCodex();if(!binary)throw codedError('codexMissing',this.locale);
    const child=spawn(binary,['app-server','--listen','stdio://'],{windowsHide:true,shell:false,stdio:['pipe','pipe','pipe']});this.child=child;
    child.stderr.on('data',()=>{});const lines=createInterface({input:child.stdout});
    const fail=()=>{if(this.child!==child)return;this.child=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(codedError('codexClosed',this.locale));}this.pending.clear();};child.on('error',fail);child.on('exit',fail);
    child.stdin.on('error',fail);
    lines.on('line',line=>{let message;try{message=JSON.parse(line);}catch{return;}if(message.method&&message.id!==undefined){child.stdin.write(JSON.stringify({id:message.id,error:{code:-32601,message:'Read-only quota client'}})+'\n');return;}const request=this.pending.get(message.id);if(!request)return;clearTimeout(request.timer);this.pending.delete(message.id);message.error?request.reject(codedError('codexReadError',this.locale)):request.resolve(message.result);});
    try{await this.call('initialize',{clientInfo:{name:'quota_atlas',title:'Quota Atlas',version:require('../package.json').version}});child.stdin.write(JSON.stringify({method:'initialized'})+'\n');}catch(e){this.close();throw e;}
  }
  call(method,params){return new Promise((resolve,reject)=>{const id=++this.nextId;const timer=setTimeout(()=>{this.pending.delete(id);reject(codedError('codexTimeout',this.locale));this.close();},18000);this.pending.set(id,{resolve,reject,timer});this.child.stdin.write(JSON.stringify({id,method,...(params?{params}:{})})+'\n');});}
  async read(){await this.connect();const raw=await this.call('account/rateLimits/read');return normalizeCodex(raw);}
  close(){const child=this.child;this.child=null;if(child)child.kill();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(codedError('codexClosed',this.locale));}this.pending.clear();}
}
module.exports={CodexClient,findCodex};
