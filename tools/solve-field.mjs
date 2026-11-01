import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const dest=fileURLToPath(new URL('../dist/assets/',import.meta.url));
const info=JSON.parse(fs.readFileSync(dest+'model-info.json'));
const {nx:NX,ny:NY,nz:NZ,h,origin}=info.grid,N=NX*NY*NZ,plane=NX*NY;
const solid=new Uint8Array(fs.readFileSync(dest+'solid.bin'));
const active=[];const links=[];
for(let z=1;z<NZ-1;z++)for(let y=0;y<NY-1;y++)for(let x=1;x<NX-1;x++){
 const p=x+NX*(y+NY*z);if(solid[p])continue;active.push(p);
 for(const q of [p-1,p+1,y===0?p:p-NX,p+NX,p-plane,p+plane])links.push(solid[q]?p:q);
}
const ids=Int32Array.from(active),neighbors=Int32Array.from(links);const results=[];
for(const axis of ['x','z']){
 const phi=new Float32Array(N);for(let z=0;z<NZ;z++)for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){const p=x+NX*(y+NY*z);phi[p]=axis==='x'?origin[0]+(x+.5)*h:origin[2]+(z+.5)*h}
 let residual=1,iteration=0;
 while(iteration<1800&&residual>0.000008){residual=0;
  for(let i=0;i<ids.length;i++){const p=ids[i],k=i*6;const avg=(phi[neighbors[k]]+phi[neighbors[k+1]]+phi[neighbors[k+2]]+phi[neighbors[k+3]]+phi[neighbors[k+4]]+phi[neighbors[k+5]])/6;const d=avg-phi[p];phi[p]+=1.82*d;if(Math.abs(d)>residual)residual=Math.abs(d)}
  iteration++;if(iteration%200===0)console.log(axis,iteration,residual);
 }
 const velocity=new Float32Array(N*3);let maxSpeed=0;
 for(let z=0;z<NZ;z++)for(let y=0;y<NY;y++)for(let x=0;x<NX;x++){
  const p=x+NX*(y+NY*z);if(solid[p])continue;
  if(x===0||x===NX-1||z===0||z===NZ-1||y===NY-1){velocity[3*p+(axis==='x'?0:2)]=1;continue}
  const val=q=>solid[q]?phi[p]:phi[q];
  const vx=(val(p+1)-val(p-1))/(2*h),vy=(val(p+NX)-(y===0?phi[p]:val(p-NX)))/(2*h),vz=(val(p+plane)-val(p-plane))/(2*h);
  velocity[p*3]=vx;velocity[p*3+1]=vy;velocity[p*3+2]=vz;maxSpeed=Math.max(maxSpeed,Math.hypot(vx,vy,vz));
 }
 const packed=new Int16Array(N*3);for(let i=0;i<packed.length;i++)packed[i]=Math.round(velocity[i]*5000);
 fs.writeFileSync(dest+`flow-${axis}.bin`,new Uint8Array(packed.buffer));results.push({axis,iterations:iteration,residual,maxSpeed});
 console.log('complete',axis,iteration,residual,maxSpeed);
}
info.flow={method:'Finite-volume Laplace potential, impermeable voxel boundary and slip ground; two linear basis solutions for yaw.',quantization:5000,basis:results};
fs.writeFileSync(dest+'model-info.json',JSON.stringify(info,null,2));

