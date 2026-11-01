/** Velocities are stored as unit-freestream basis fields. Coordinates are metres. */
export class FlowField {
 constructor(info,solid,x,z){
  const n=info.grid.nx*info.grid.ny*info.grid.nz;
  if(solid.length!==n||x.length!==n*3||z.length!==n*3)throw Error('Incomplete flow dataset');
  if(!(info.flow.quantization>0))throw Error('Invalid flow scaling');
  this.info=info;this.grid=info.grid;this.solid=solid;this.x=x;this.z=z;this.cos=1;this.sin=0;this.scale=info.flow.quantization;
 }
 setYaw(degrees){if(!Number.isFinite(degrees))throw Error('Invalid wind angle');this.cos=Math.cos(degrees*Math.PI/180);this.sin=Math.sin(degrees*Math.PI/180)}
 sample(px,py,pz,out=[0,0,0]){
  const {nx,ny,nz,h,origin}=this.grid;
  const gx=(px-origin[0])/h-.5,gy=(py-origin[1])/h-.5,gz=(pz-origin[2])/h-.5;
  if(![gx,gy,gz].every(Number.isFinite)||gx<0||gx>=nx-1||gy<0||gy>=ny-1||gz<0||gz>=nz-1)return null;
  const ix=Math.floor(gx),iy=Math.floor(gy),iz=Math.floor(gz),tx=gx-ix,ty=gy-iy,tz=gz-iz;
  if(this.solid[Math.round(gx)+nx*(Math.round(gy)+ny*Math.round(gz))])return null;
  out.fill(0);let weightSum=0;
  // Solid cells are not air at zero velocity. Exclude them from interpolation.
  for(let k=0;k<2;k++)for(let j=0;j<2;j++)for(let i=0;i<2;i++){
   const p=ix+i+nx*(iy+j+ny*(iz+k));if(this.solid[p])continue;
   const w=(i?tx:1-tx)*(j?ty:1-ty)*(k?tz:1-tz);weightSum+=w;
   for(let a=0;a<3;a++)out[a]+=w*(this.x[3*p+a]*this.cos+this.z[3*p+a]*this.sin)/this.scale;
  }
  if(weightSum<1e-6)return null;for(let a=0;a<3;a++)out[a]/=weightSum;return out;
 }
 surface(point,normal){
  for(const distance of [.075,.125,.2,.3]){
   const position=point.map((v,i)=>v+normal[i]*distance),velocity=this.sample(...position);
   if(velocity)return{position,velocity,distance,cp:1-velocity.reduce((s,v)=>s+v*v,0)};
  }return null;
 }
 projectedArea(){const {nx,ny,nz,h,origin}=this.grid;const bins=new Set();for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const p=x+nx*(y+ny*z);if(!this.solid[p])continue;const lateral=-(origin[0]+(x+.5)*h)*this.sin+(origin[2]+(z+.5)*h)*this.cos;bins.add(`${y},${Math.floor(lateral/h)}`)}return bins.size*h*h}
 textureData(axis){const src=axis==='x'?this.x:this.z;const out=new Float32Array(this.solid.length*4);for(let p=0;p<this.solid.length;p++){out[4*p]=src[3*p]/this.scale;out[4*p+1]=src[3*p+1]/this.scale;out[4*p+2]=src[3*p+2]/this.scale;out[4*p+3]=this.solid[p]?0:1}return out}
 trace(seed){const points=[],times=[],speeds=[];let p=[...seed],time=0;const ds=this.grid.h*.35;
  for(let i=0;i<550;i++){const v=this.sample(...p);if(!v)break;const speed=Math.hypot(...v);if(speed<.035)break;points.push([...p]);times.push(time);speeds.push(speed);const middle=p.map((q,a)=>q+v[a]*ds/(2*speed));const vm=this.sample(...middle);if(!vm)break;const sm=Math.hypot(...vm);if(sm<.035)break;p=p.map((q,a)=>q+vm[a]*ds/sm);time+=ds/sm;}
  return{points,times,speeds,duration:times.at(-1)||0};
 }
}
export async function loadField(){
 const get=async(name,json=false)=>{const r=await fetch(`./assets/${name}`);if(!r.ok)throw Error(`Unable to load ${name}`);return json?r.json():r.arrayBuffer()};
 const [info,solid,x,z]=await Promise.all([get('model-info.json',true),get('solid.bin'),get('flow-x.bin'),get('flow-z.bin')]);
 return new FlowField(info,new Uint8Array(solid),new Int16Array(x),new Int16Array(z));
}
