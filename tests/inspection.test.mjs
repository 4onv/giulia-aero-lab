import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createVehicleDetails,BonnetMotion,separateBonnetTrim,isVisible,BAY_REFERENCE} from '../dist/vehicle-details.js';
import {PartsInspector} from '../dist/parts.js';

test('Reconstructed assemblies have finite geometry and independently identified service points',()=>{
 const details=createVehicleDetails();assert.equal(details.root.visible,false);
 assert.equal(new Set(details.parts.map(p=>p.name)).size,details.parts.length);
 assert.ok(details.meshes.length<180,'Decorations must be batched for interactive rendering');
 for(const mesh of details.meshes){for(const name of ['position','normal'])assert.ok([...mesh.geometry.attributes[name].array].every(Number.isFinite),mesh.parent.name);}
 const services=details.parts.filter(p=>p.userData.part.service).sort((a,b)=>a.userData.part.service-b.userData.part.service);
 assert.deepEqual(services.map(p=>p.userData.part.service),[1,2,3,4,5,6]);
 // Supplement fig. 13: oil/dipstick/engine coolant on vehicle right; brake,
 // washer and intercooler coolant on vehicle left. This prevents mirroring.
 services.forEach((p,i)=>{const centre=new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());assert.equal(Math.sign(centre.z),i<3?-1:1,p.name);assert.equal(p.userData.part.reference,BAY_REFERENCE);});
 const engine=new THREE.Box3();for(const p of details.parts.filter(p=>p.userData.part.zone==='engine'))engine.union(new THREE.Box3().setFromObject(p));
 assert.ok(engine.min.x>-2.1&&engine.max.x<-.7&&engine.max.y<1&&engine.min.z>-.8&&engine.max.z<.8);
});

test('Bonnet trim partition preserves triangles and opening restores the exact closed pose',()=>{
 const scene=new THREE.Scene(),car=new THREE.Group();scene.add(car);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1.5,.9,.5,-1.6,.9,.5,-1.5,.92,.55,-2.1,.5,0,-2.2,.5,0,-2.1,.6,.1],3));geometry.setIndex([0,1,2,3,4,5]);
 const source=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());source.name='029-0-29';car.add(source);
 const trim=separateBonnetTrim(car);assert.ok(trim);assert.equal(source.geometry.index.count+trim.geometry.index.count,6);assert.deepEqual([...trim.geometry.index.array],[0,1,2]);assert.ok(trim.geometry.boundingBox.min.y>.84);assert.ok(source.geometry.boundingBox.max.y<.7);
 const hood=new THREE.Mesh(new THREE.BoxGeometry(1.2,.02,1.3),new THREE.MeshStandardMaterial());hood.name='010-0-10~01';hood.position.set(-1.5,.9,0);car.add(hood);scene.updateMatrixWorld(true);
 const closed=hood.matrixWorld.clone(),trimClosed=trim.matrixWorld.clone();const motion=new BonnetMotion(scene,[hood,trim,source]);
 assert.ok(hood.matrixWorld.equals(closed));motion.setOpen(true,true);scene.updateMatrixWorld(true);assert.ok(hood.getWorldPosition(new THREE.Vector3()).y>1.4);assert.ok(!trim.matrixWorld.equals(trimClosed));assert.equal(source.parent,car);
 motion.setOpen(false,true);scene.updateMatrixWorld(true);hood.matrixWorld.elements.forEach((n,i)=>assert.ok(Math.abs(n-closed.elements[i])<1e-12));assert.ok(trim.matrixWorld.equals(trimClosed));
});

test('Assembly selection, isolation, cross-zone search selection and tunnel reset keep visibility consistent',()=>{
 const nodes=new Map(),stub=()=>({hidden:false,value:'',textContent:'',href:'',setAttribute(){},replaceChildren(){},classList:{toggle(){},remove(){}}});
 globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,stub());return nodes.get(id);},querySelectorAll:()=>[],createElement:()=>stub()};
 try{
  // Build without a canvas DOM; this test exercises geometry and state, not text rasterization.
  delete globalThis.document;const details=createVehicleDetails();
  globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,stub());return nodes.get(id);},querySelectorAll:()=>[],createElement:()=>stub()};
  const scene=new THREE.Scene();scene.add(details.root);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(1,.02,1),new THREE.MeshStandardMaterial());hood.name='010-0-10~01';scene.add(hood);
  const wheel=new THREE.Mesh(new THREE.BoxGeometry(.2,.2,.2),new THREE.MeshStandardMaterial());wheel.name='002-0-2';scene.add(wheel);
  const originals=new Map([hood,wheel,...details.meshes].map(m=>[m,m.material]));
  const camera=new THREE.PerspectiveCamera(),controls={target:new THREE.Vector3(),update(){}};camera.position.set(-3,2,2);
  const bonnet=new BonnetMotion(scene,[hood,wheel]),inspector=new PartsInspector([hood,wheel],originals,camera,controls,details,bonnet);
  inspector.activate(true);inspector.setView('engine');const oil=details.parts.find(p=>p.name==='oil-filler');const leaf=oil.children[0];inspector.select(leaf);
  assert.equal(inspector.selected.mesh,oil);assert.notEqual(leaf.material,originals.get(leaf));
  inspector.isolated=true;inspector.visibility();assert.ok(isVisible(leaf));assert.equal(isVisible(wheel),false);
  inspector.setView('cabin');assert.equal(isVisible(leaf),false);inspector.select(wheel);assert.equal(inspector.view,'exterior');assert.ok(isVisible(wheel));
  inspector.setView('engine');bonnet.update(.1);inspector.activate(false);assert.equal(bonnet.pivot.rotation.z,0);assert.equal(isVisible(leaf),false);assert.ok(isVisible(hood));assert.equal(leaf.material,originals.get(leaf));assert.equal(inspector.highlights.length,0);
  // An explicitly visible child of a hidden assembly must never be raycastable.
  leaf.visible=true;assert.equal(isVisible(leaf),false);
 }finally{delete globalThis.document;}
});
