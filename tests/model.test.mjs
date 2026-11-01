import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const b=fs.readFileSync(new URL('../dist/assets/giulia.glb',import.meta.url));
const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
test('Component extraction preserves detailed geometry and independent cabin/body surfaces',()=>{
 assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);
 const tris=gltf.meshes.reduce((sum,m)=>sum+m.primitives.reduce((s,p)=>s+gltf.accessors[p.indices].count/3,0),0);
 assert.ok(tris>1_160_000&&tris<1_162_000);
 for(const name of ['010-0-10~01','010-0-10~04','051-0-51~00','051-0-51~05','051-0-51~13']){
  const node=gltf.nodes.find(n=>n.name===name);assert.ok(node?.mesh!==undefined,name);
  const p=gltf.meshes[node.mesh].primitives[0],bounds=gltf.accessors[p.attributes.POSITION];
  assert.ok(bounds.max.every(Number.isFinite)&&bounds.min.every(Number.isFinite));
 }
 // Hundreds of separate headlamp draw calls previously dominated render cost.
 assert.ok(gltf.meshes.reduce((sum,m)=>sum+m.primitives.length,0)<150);
});
