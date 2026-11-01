import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
 let file;try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return}
 if(file!==path.resolve(root)&&!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403).end();return}
 if(file===path.resolve(root))file=path.join(root,'index.html');
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end();return}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(res)});
});
server.listen(Number(process.env.PORT||8766),'127.0.0.1',()=>console.log('Giulia Aero Lab: http://127.0.0.1:'+server.address().port));
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Giulia Aero Lab is already running on this port.':error.message);process.exitCode=1});
