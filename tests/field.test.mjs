import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FlowField} from '../dist/field.js';
const asset=new URL('../dist/assets/',import.meta.url);
const info=JSON.parse(fs.readFileSync(new URL('model-info.json',asset)));
const load=(name,Type)=>{const b=fs.readFileSync(new URL(name,asset));return new Type(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength))};
const field=new FlowField(info,load('solid.bin',Uint8Array),load('flow-x.bin',Int16Array),load('flow-z.bin',Int16Array));
test('Complete data and converged basis fields',()=>{
 assert.equal(field.solid.reduce((a,b)=>a+b,0),info.grid.occupied);
 for(const basis of info.flow.basis)assert.ok(basis.residual<8e-6);
 assert.ok(field.x.some(v=>v!==0));assert.ok(field.z.some(v=>v!==0));
 assert.throws(()=>new FlowField(info,new Uint8Array(1),field.x,field.z));
});
test('Fluid interpolation excludes solid neighbours rather than treating them as stationary air',()=>{
 const meta={grid:{nx:3,ny:3,nz:3,h:1,origin:[0,2,0]},flow:{quantization:100}};
 const mask=new Uint8Array(27),x=new Int16Array(81),z=new Int16Array(81);for(let p=0;p<27;p++)x[3*p]=100;
 mask[0]=1;x[0]=0;const f=new FlowField(meta,mask,x,z);
 assert.deepEqual(f.sample(1.1,3.1,1.1),[1,0,0]);
 assert.equal(f.sample(.6,2.6,.6),null);assert.equal(f.sample(-1,3,1),null);assert.equal(f.sample(NaN,3,1),null);
});
test('Yaw is a linear combination of the two solved fields',()=>{
 const p=[-3,1.8,.5];field.setYaw(0);const a=field.sample(...p);field.setYaw(90);const b=field.sample(...p);field.setYaw(17);const c=field.sample(...p);
 c.forEach((v,i)=>assert.ok(Math.abs(v-a[i]*Math.cos(17*Math.PI/180)-b[i]*Math.sin(17*Math.PI/180))<1e-7));
});
test('Actual streamlines stay in fluid with finite, increasing travel times at all supported wind extremes',()=>{
 for(const angle of [-20,0,20]){field.setYaw(angle);let total=0;
  for(const y of [.2,.8,1.5,2.05])for(const z of [-1.8,-.9,0,.9,1.8]){
   const path=field.trace([-4.5*field.cos-z*field.sin,y,-4.5*field.sin+z*field.cos]);assert.ok(path.points.length>20);assert.equal(path.duration,path.times.at(-1));total+=path.points.length;
   path.points.forEach((p,i)=>{assert.ok(field.sample(...p));assert.ok(p.every(Number.isFinite));if(i)assert.ok(path.times[i]>path.times[i-1]);});
  }assert.ok(total>2000);
 }
});
test('Geometry area and upstream boundary have sensible scale',()=>{
 field.setYaw(0);assert.ok(field.projectedArea()>2&&field.projectedArea()<2.6);
 const v=field.sample(-5.3,3,0);assert.ok(Math.abs(v[0]-1)<.08);assert.ok(Math.abs(v[1])<.08);
 assert.equal(field.sample(0,.8,0),null);
});
