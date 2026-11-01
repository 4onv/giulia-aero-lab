import fs from 'node:fs';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {draco,prune,joinPrimitives} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()});
const [path,output]=process.argv.slice(2);
if(!path||!output)throw Error('Usage: node split-parts.mjs source.glb output.glb');
const doc=await io.read(path);
if(doc.getRoot().listNodes().some(n=>n.getName().includes('~')))throw Error('Input already contains split components. Use the original artist GLB.');
const buffer=doc.getRoot().listBuffers()[0],report=[];let triangles=0;
for(const node of [...doc.getRoot().listNodes()]){
 const mesh=node.getMesh();if(!mesh)continue;const base=Number(node.getName().slice(0,3));
 if(![4,10,11,12,15,18,31,51].includes(base)){for(const p of mesh.listPrimitives())triangles+=p.getIndices().getCount()/3;continue;}
 const primitive=mesh.listPrimitives()[0],pos=primitive.getAttribute('POSITION'),a=pos.getArray(),indices=primitive.getIndices().getArray();const parent=new Int32Array(pos.getCount()),seen=new Map();for(let i=0;i<parent.length;i++)parent[i]=i;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};const join=(i,j)=>parent[find(i)]=find(j);
 for(let i=0;i<parent.length;i++){const key=[a[i*3],a[i*3+1],a[i*3+2]].map(v=>Math.round(v*10000)).join(',');if(seen.has(key))join(i,seen.get(key));else seen.set(key,i);}
 for(let i=0;i<indices.length;i+=3){join(indices[i],indices[i+1]);join(indices[i],indices[i+2]);}
 const groups=new Map();for(let i=0;i<indices.length;i+=3){const root=find(indices[i]);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(indices[i],indices[i+1],indices[i+2]);}
 const chunks=[...groups.values()].sort((x,y)=>y.length-x.length);node.setMesh(null);
 chunks.forEach((chunk,index)=>{const name=node.getName()+'~'+String(index).padStart(2,'0'),p=primitive.clone(),idx=doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(chunk)).setBuffer(buffer);p.setIndices(idx);const m=doc.createMesh(name).addPrimitive(p),child=doc.createNode(name).setMesh(m);node.addChild(child);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const v of chunk)for(let k=0;k<3;k++){min[k]=Math.min(min[k],a[v*3+k]);max[k]=Math.max(max[k],a[v*3+k]);}triangles+=chunk.length/3;report.push({name,triangles:chunk.length/3,min:min.map(v=>+v.toFixed(4)),max:max.map(v=>+v.toFixed(4))});});
}
// Merge matching material batches within each component, preserving selection boundaries.
for(const mesh of doc.getRoot().listMeshes()){
 const groups=new Map();for(const p of mesh.listPrimitives()){const key=p.getMaterial();if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
 for(const list of groups.values())if(list.length>1){const combined=joinPrimitives(list);for(const p of list)mesh.removePrimitive(p);mesh.addPrimitive(combined);}
}
await doc.transform(prune(),draco({quantizePosition:16,quantizeNormal:10,quantizeTexcoord:12}));
await io.write(output,doc);fs.writeFileSync(output+'.parts.json',JSON.stringify(report,null,2));console.log(JSON.stringify({triangles,components:report.length,output}));
