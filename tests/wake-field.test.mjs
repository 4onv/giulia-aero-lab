import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WakeField} from '../dist/wake-field.js';
test('Viscous probes use density pressure, independent of Bernoulli pressure',()=>{
 const n=27,ideal={info:{grid:{nx:3,ny:3,nz:3,h:1,origin:[0,0,0]},flow:{quantization:5000}},solid:new Uint8Array(n),projectedArea:()=>2.26};
 const field=new WakeField(ideal,20),data=new Float32Array(n*4);for(let p=0;p<n;p++){data[p*4]=1;data[p*4+3]=.75;}
 field.update(data,40);assert.equal(field.pressureAt(1,1,1),.75);assert.deepEqual(field.sample(1,1,1),[1,0,0]);assert.equal(field.steps,40);assert.equal(field.projectedArea(),2.26);assert.equal(field.pressureAt(-1,0,0),null);
});
