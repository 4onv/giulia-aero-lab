const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('giuliaDesktop',{hide:()=>ipcRenderer.send('hide-to-tray'),ready:()=>ipcRenderer.send('scene-ready')});
