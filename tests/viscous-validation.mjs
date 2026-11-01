import fs from 'node:fs';
import assert from 'node:assert/strict';
const wasm=await WebAssembly.instantiate(fs.readFileSync(new URL('../dist/assets/lbm.wasm',import.meta.url)));
const e=wasm.instance.exports;
const mask=new Uint8Array(e.memory.buffer,e.mask_ptr(),136*48*72);
mask.fill(0);assert.equal(e.init(16,12,12,.06,0,.52),1);assert.equal(e.advance(200),200);e.snapshot();
const uniform=new Float32Array(e.memory.buffer,e.output_ptr(),16*12*12*4);
let error=0;for(let p=0;p<16*12*12;p++)error=Math.max(error,Math.abs(uniform[4*p]-1),Math.abs(uniform[4*p+1]),Math.abs(uniform[4*p+2]));
assert.ok(error<.001,`Uniform-flow drift ${error}`);console.log('Uniform moving-ground flow:',error);
const info=JSON.parse(fs.readFileSync(new URL('../dist/assets/model-info.json',import.meta.url)));
const solid=fs.readFileSync(new URL('../dist/assets/solid.bin',import.meta.url));mask.set(solid);e.set_ramp(1);
const {nx,ny,nz,h}=info.grid;const tau=.5+3*.06*(info.dimensions[0]/h)/500;
assert.equal(e.init(nx,ny,nz,.06,0,tau),1);
const start=performance.now();for(let i=0;i<100;i++){const steps=e.advance(20);assert.ok(steps>0,`Solver unstable at ${e.step_count()} (${Array.from(new Float32Array(e.memory.buffer,e.output_ptr(),2))})`);if(i%10===0)console.log('Vehicle steps:',steps)}
e.snapshot();const data=new Float32Array(e.memory.buffer,e.output_ptr(),nx*ny*nz*4);let maxSpeed=0,minRho=2,maxRho=0;
for(let p=0;p<solid.length;p++)if(!solid[p]){const v=Math.hypot(data[4*p],data[4*p+1],data[4*p+2]);assert.ok(Number.isFinite(v));maxSpeed=Math.max(maxSpeed,v);const rho=1+data[4*p+3]*3*.06*.06/2;minRho=Math.min(minRho,rho);maxRho=Math.max(maxRho,rho)}
const probe=(x,y,z)=>{const p=Math.floor((x-info.grid.origin[0])/h)+nx*(Math.floor(y/h)+ny*Math.floor((z-info.grid.origin[2])/h));return Array.from(data.slice(4*p,4*p+4))};
const report={steps:e.step_count(),seconds:(performance.now()-start)/1000,reynolds:500,tau,maxSpeed,minRho,maxRho,uniformError:error,upstream:probe(-3,1,0),wake:probe(3,1,0)};
assert.ok(report.wake[0]<report.upstream[0],'No wake velocity deficit');
fs.writeFileSync(new URL('../solver/validation.json',import.meta.url),JSON.stringify(report,null,2));
fs.writeFileSync(new URL('../dist/assets/wake-preview.bin',import.meta.url),new Uint8Array(data.buffer,data.byteOffset,data.byteLength));
console.log(JSON.stringify(report));

