const {app,BrowserWindow,Menu,Tray,protocol,net,ipcMain,shell}=require('electron');
const path=require('node:path');const fs=require('node:fs');const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'giulia',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
app.setName('Giulia Aero Lab');
let win,tray,quitting=false;
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{win?.show();win?.focus();});
 app.on('before-quit',()=>quitting=true);
 app.whenReady().then(()=>{
  const root=path.resolve(__dirname,'../dist');
  const log=(text)=>fs.appendFileSync(path.join(__dirname,'../session.log'),new Date().toISOString()+' '+text+'\n');
  log('desktop starting');
  protocol.handle('giulia',request=>{
   let file;try{const url=new URL(request.url);if(url.host!=='app')return new Response('Not found',{status:404});file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(file===root)file=path.join(root,'index.html');}catch{return new Response('Invalid path',{status:400});}
   if(!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
   return net.fetch(pathToFileURL(file).toString());
  });
  let bounds={width:1380,height:900};const settings=path.join(app.getPath('userData'),'window.json');try{const saved=JSON.parse(fs.readFileSync(settings));if(saved.width>=900&&saved.height>=650)bounds={width:saved.width,height:saved.height};}catch{}
  win=new BrowserWindow({...bounds,minWidth:900,minHeight:650,title:'Giulia Aero Lab',backgroundColor:'#161b20',autoHideMenuBar:true,show:false,icon:path.join(__dirname,'icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  Menu.setApplicationMenu(null);
  win.webContents.on('dom-ready',()=>log('DOM READY'));
  win.webContents.on('did-finish-load',()=>log('DOCUMENT LOADED'));
  win.webContents.on('render-process-gone',(_event,details)=>log('renderer stopped '+details.reason));
  win.webContents.on('did-fail-load',(_event,code,description)=>log('load failure '+code+' '+description));
  win.webContents.on('console-message',(event,level,message)=>{const text=event.message||message;if(text)log('renderer '+text);});
  ipcMain.on('scene-ready',event=>{if(event.sender===win.webContents)log('SCENE READY: vehicle, flow field and rendering initialized');});
  win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(www\.)?(cadnav\.com|polyhaven\.com|docs\.polyhaven\.com)\//.test(url))shell.openExternal(url);return{action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('giulia://app/'))event.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  win.on('close',event=>{fs.writeFileSync(settings,JSON.stringify(win.getBounds()));if(!quitting){event.preventDefault();win.hide();}});
  win.once('ready-to-show',()=>win.show());
  win.on('hide',()=>log('WINDOW HIDDEN: rendering and worker pause on document visibility'));
  win.on('show',()=>log('WINDOW SHOWN'));
  tray=new Tray(path.join(__dirname,'icon.png'));tray.setToolTip('Giulia Aero Lab • click to reopen');
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Open Giulia Aero Lab',click:()=>{win.show();win.focus();}},{label:'Keep on top',type:'checkbox',click:item=>win.setAlwaysOnTop(item.checked)},{type:'separator'},{label:'Quit',click:()=>app.quit()}]));
  tray.on('click',()=>{win.show();win.focus();});
  ipcMain.on('hide-to-tray',event=>{if(event.sender===win.webContents)win.hide();});
  win.loadURL('giulia://app/');
 });
 app.on('window-all-closed',()=>{});
}
