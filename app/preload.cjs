'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('atlas',{invoke:(operation,payload)=>ipcRenderer.invoke('atlas:invoke',operation,payload),onUpdate:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('atlas:update',listener);return ()=>ipcRenderer.removeListener('atlas:update',listener);},onNavigate:callback=>{const listener=(_event,view)=>callback(view);ipcRenderer.on('atlas:navigate',listener);return ()=>ipcRenderer.removeListener('atlas:navigate',listener);}});
