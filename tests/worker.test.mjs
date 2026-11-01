import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual worker message protocol with a deterministic fake engine.
// In particular, a late WASM load must not override a pause from a hidden window.
function worker(){
 let steps=0,resolveFetch,next=0;const queue=new Map(),messages=[];
 const engine={memory:{buffer:new ArrayBuffer(4096)},mask_ptr:()=>0,output_ptr:()=>512,set_ramp(){},init(){steps=0;return 1;},advance(n){return steps+=n;},snapshot(){},step_count:()=>steps};
 const context={Float32Array,Uint8Array,Math,Error,WebAssembly:{instantiate:async()=>({instance:{exports:engine}})},fetch:()=>new Promise(resolve=>resolveFetch=resolve),setTimeout:fn=>{queue.set(++next,fn);return next;},clearTimeout:id=>queue.delete(id),postMessage:m=>messages.push(m),onmessage:null};
 vm.createContext(context);vm.runInContext(fs.readFileSync(new URL('../dist/wake-worker.js',import.meta.url),'utf8'),context);
 return {messages,send:data=>context.onmessage({data}),load:async()=>{resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});await new Promise(setImmediate);},tick:()=>{const item=queue.entries().next().value;if(item){queue.delete(item[0]);item[1]();}},steps:()=>steps,pending:()=>queue.size};
}
const start={type:'start',grid:{nx:4,ny:4,nz:4,h:.1},mask:new Uint8Array(64),yaw:0,paused:false};
test('Pause during WASM initialization persists until explicit resume',async()=>{
 const w=worker();w.send(start);w.send({type:'pause'});await w.load();assert.equal(w.steps(),0);assert.equal(w.pending(),0);
 w.send({type:'resume'});assert.equal(w.steps(),4);w.send({type:'pause'});assert.equal(w.pending(),0);w.tick();assert.equal(w.steps(),4);
});
test('Worker emits snapshots and stops exactly at the checked 2,000-step limit',async()=>{
 const w=worker();w.send(start);await w.load();for(let i=0;i<600;i++)w.tick();assert.equal(w.steps(),2000);assert.equal(w.pending(),0);
 assert.equal(w.messages.filter(m=>m.type==='frame').length,50);assert.equal(w.messages.at(-1).type,'complete');w.send({type:'resume'});assert.equal(w.pending(),0);assert.equal(w.steps(),2000);
});
