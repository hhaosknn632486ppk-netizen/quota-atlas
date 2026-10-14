'use strict';
const fs=require('node:fs');
const path=require('node:path');
// Electron safeStorage uses the Windows user's DPAPI protection. No plaintext fallback.
class CredentialVault {
 constructor(root,storage) { this.file=path.join(root,'credentials.json');this.storage=storage;this.memory=new Map();this.entries={};try{const saved=JSON.parse(fs.readFileSync(this.file,'utf8'));if(saved.version===1&&saved.entries&&typeof saved.entries==='object')this.entries=saved.entries;}catch{} }
 available(){return !!this.storage?.isEncryptionAvailable();}
 get(id){if(this.memory.has(id))return this.memory.get(id);if(!this.entries[id])return null;if(!this.available())throw Object.assign(new Error('Credential encryption unavailable'),{code:'credentialLocked'});try{return this.storage.decryptString(Buffer.from(this.entries[id],'base64'));}catch{throw Object.assign(new Error('Credential cannot be decrypted'),{code:'credentialLocked'});}}
 has(id){return this.memory.has(id)||Object.hasOwn(this.entries,id);}
 isRemembered(id){return Object.hasOwn(this.entries,id);}
 set(id,secret,remember){if(remember&&!this.available())throw Object.assign(new Error('Credential encryption unavailable'),{code:'credentialLocked'});const encrypted=remember?this.storage.encryptString(secret).toString('base64'):null;const next={...this.entries};if(encrypted)next[id]=encrypted;else delete next[id];this.persist(next);this.entries=next;this.memory.set(id,secret);}
 remove(id){const next={...this.entries};delete next[id];this.persist(next);this.entries=next;this.memory.delete(id);}
 persist(entries){fs.mkdirSync(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';fs.writeFileSync(temp,JSON.stringify({version:1,entries}),{mode:0o600});fs.renameSync(temp,this.file);}
}
module.exports={CredentialVault};
