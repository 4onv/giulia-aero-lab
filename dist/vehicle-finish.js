import * as THREE from './vendor/three.module.js';
import { steeringGrip } from './body-reconstruction.js';
import { cabinMaterial } from './cabin-finishes.js';

// These maps are generated locally. The source body has positions and normals
// but no texture coordinates, so each finish supplies its own projection.
const maps = new Map();
function texture(key, size, draw) {
  if (maps.has(key)) return maps.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const result = new THREE.CanvasTexture(canvas);
  result.wrapS = result.wrapT = THREE.RepeatWrapping;
  result.anisotropy = 4;
  maps.set(key, result);
  return result;
}

function grain(weave = false) {
  return texture(weave ? 'woven' : 'hide', 256, (ctx, size) => {
    const pixels = ctx.createImageData(size, size);
    let seed = 9471;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        const noise = seed / 4294967296;
        const thread = ((x >> 2) + (y >> 2)) % 4 < 2 ? x : y;
        const shade = weave
          ? 119 + 51 * Math.cos(thread * Math.PI / 2) + 19 * noise
          : 112 + 66 * noise + 14 * Math.sin(x * .77 + Math.sin(y * .64));
        const offset = (y * size + x) * 4;
        pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = shade;
        pixels.data[offset + 3] = 255;
      }
    }
    ctx.putImageData(pixels, 0, 0);
  });
}

function sidewall() {
  return texture('sidewall', 512, (ctx, size) => {
    const r = size / 2;
    ctx.fillStyle = '#747474';
    ctx.fillRect(0, 0, size, size);
    ctx.translate(r, r);
    for (const radius of [.78, .79, .93, .944, .962, .978]) {
      ctx.strokeStyle = '#a8a8a8';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, r * radius, 0, 2 * Math.PI); ctx.stroke();
    }
    for (const [word, angle] of [['RADIAL  TUBELESS', -.62], ['OUTSIDE', 2.08]]) {
      ctx.save(); ctx.rotate(angle);
      for (const letter of word) {
        ctx.fillStyle = '#b9b9b9'; ctx.textAlign = 'center';
        ctx.font = 'bold 11px Arial'; ctx.fillText(letter, 0, -r * .86);
        ctx.rotate(.043);
      }
      ctx.restore();
    }
    for (let i = 0; i < 120; i++) {
      ctx.rotate(Math.PI / 60); ctx.strokeStyle = '#898989';
      ctx.beginPath(); ctx.moveTo(-1, -r * .95); ctx.lineTo(4, -r); ctx.stroke();
    }
  });
}

// Mesh 017 contains the outer lamp covers together with unrelated trim.
// Preserve its triangles and separate the two covers so the reflectors show.
export function separateLampCovers(car) {
  const trim = car.getObjectByName('017-0-17');
  if (!trim?.isMesh) return;
  const geometry = trim.geometry;
  const pos = geometry.attributes.position;
  const index = geometry.index?.array ?? Uint32Array.from({length:pos.count},(_,i)=>i);
  const covers = [], other = [];
  for (let i=0;i<index.length;i+=3) {
    const tri = [index[i],index[i+1],index[i+2]];
    const lamp = tri.every(v=>pos.getX(v)<-1.64 && pos.getY(v)>.57 && pos.getY(v)<.78 && Math.abs(pos.getZ(v))>.37);
    (lamp ? covers : other).push(...tri);
  }
  if (!covers.length || !other.length) return;
  const lens = trim.clone();
  lens.geometry = geometry.clone(); lens.geometry.setIndex(covers);
  lens.name = 'lamp-covers'; trim.parent.add(lens); geometry.setIndex(other);
}

export function fitWingEmblems(car) {
  const face = texture('clover fender shield',256,(c)=>{
    c.fillStyle='#deded7';c.strokeStyle='#969994';c.lineWidth=9;
    c.beginPath();c.moveTo(128,17);c.quadraticCurveTo(134,14,139,23);
    c.lineTo(237,208);c.quadraticCurveTo(243,221,229,223);c.lineTo(28,223);
    c.quadraticCurveTo(15,220,22,209);c.lineTo(118,26);c.closePath();c.fill();c.stroke();
    c.fillStyle='#2e664e';c.strokeStyle='#2e664e';c.lineCap='round';c.lineWidth=6;
    c.beginPath();c.moveTo(127,140);c.quadraticCurveTo(145,163,171,187);c.stroke();
    c.translate(128,139);c.rotate(-.44);
    for(let i=0;i<4;i++){
      c.rotate(Math.PI/2);c.beginPath();c.moveTo(0,1);c.bezierCurveTo(-44,-21,-26,-60,0,-43);
      c.bezierCurveTo(32,-64,45,-22,0,1);c.fill();
    }
  });
  face.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map:face,transparent:true,alphaTest:.3,roughness:.32,metalness:.27});
  const ray=new THREE.Raycaster();
  const result=[];
  car.updateMatrixWorld(true);
  for(const [side,wingName] of [[1,'010-0-10~03'],[-1,'010-0-10~02']]){
    const wing=car.getObjectByName(wingName);if(!wing)continue;
    ray.set(new THREE.Vector3(-.996,.797,side*1.5),new THREE.Vector3(0,0,-side));
    const hit=ray.intersectObject(wing,false)[0];if(!hit)continue;
    const normal=hit.face.normal.clone().normalize();
    const badge=new THREE.Mesh(new THREE.PlaneGeometry(.080,.080),material);
    badge.name='Enamel clover';
    badge.position.copy(wing.worldToLocal(hit.point.clone())).addScaledVector(normal,.0014);
    badge.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,side),normal);
    if(side<0)badge.rotateY(Math.PI);
    wing.add(badge);result.push(badge);
  }
  return result;
}

function project(mesh, wheels = false) {
  const geometry = mesh.geometry;
  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const middle = bounds.getCenter(new THREE.Vector3());
  const diameter = bounds.max.y - bounds.min.y;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    uvs[2 * i] = wheels ? .5 + (x - middle.x) / diameter * Math.sign(middle.z) : 6 * (z - .71 * x);
    uvs[2 * i + 1] = wheels ? .5 + (y - middle.y) / diameter : 6 * (y + .54 * x);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

const finishes = new Map();
function finish(key, parameters) {
  if (!finishes.has(key)) finishes.set(key, new THREE.MeshPhysicalMaterial(parameters));
  return finishes.get(key);
}

export function vehicleFinish(mesh) {
  const id = Number(mesh.name.slice(0, 3));
  if (id === 51) {
    if(mesh.name.endsWith('~00')){
      mesh.geometry.dispose();
      mesh.geometry=steeringGrip();
      return cabinMaterial('leather');
    }
    if(mesh.name.endsWith('~04')){
      // Keep the telescoping column behind the new contoured horn pad and spokes.
      const g=mesh.geometry, p=g.attributes.position, index=g.index.array, retained=[];
      for(let i=0;i<index.length;i+=3){
        const triangle=[index[i],index[i+1],index[i+2]];
        if(triangle.some(k=>p.getX(k)+.323*(p.getY(k)-.909)<-.312))retained.push(...triangle);
      }
      g.setIndex(retained);
    }
    project(mesh);
    const trim = mesh.name.endsWith('~15');
    return cabinMaterial(trim?'carbon':mesh.name.endsWith('~01')?'leather':'fascia');
  }
  if ([33, 34, 38, 40].includes(id)) {
    project(mesh, true);
    return finish('tyre', { color: '#232528', roughness: .77, bumpMap: sidewall(), bumpScale: .0019 });
  }
  if ([10, 11, 12].includes(id)) {
    return finish('rosso', { color: '#a42028', metalness: .32, roughness: .38,
      clearcoat: .92, clearcoatRoughness: .135, ior: 1.5, specularIntensity: .86 });
  }
  if ([2, 3, 7, 8].includes(id)) return finish('alloy', { color: '#697178', metalness: .88, roughness: .255, clearcoat: .48, clearcoatRoughness: .19 });
  if ([14, 32].includes(id)) return finish('disc', { color: '#727474', metalness: .82, roughness: .37 });
  if ([53, 54, 55, 56].includes(id)) return finish('caliper', { color: '#b51c21', metalness: .24, roughness: .32, clearcoat: .8, clearcoatRoughness: .22 });
  if (id===18 || mesh.name==='lamp-covers') {
    const window = id === 18;
    return finish(window ? 'glass' : 'lamp lens', {color: window ? '#849a9c' : '#e2eceb',
      transparent: true, opacity: window ? .235 : .105, depthWrite: false,
      roughness: .055, metalness: .07, ior: 1.52, clearcoat: 1, clearcoatRoughness: .045,
      side: THREE.FrontSide, envMapIntensity: 1.12});
  }
  if ([6, 9, 46, 47, 48, 49, 57].includes(id)) return finish('optics', { color: '#b0b6b9', metalness: .94, roughness: .16, clearcoat: .35 });
  if (id === 50) return finish('tail lens', { color: '#790611', metalness: .18, roughness: .15, clearcoat: 1, clearcoatRoughness: .073 });
  if ([31, 52].includes(id)) return finish('mirror', { color: '#c3cbce', metalness: 1, roughness: .045 });
  if ([15, 41].includes(id)) {
    project(mesh);
    return finish('carbon', { color: '#34363a', metalness: .35, roughness: .41, bumpMap: grain(true), bumpScale: .00065, clearcoat: .75, clearcoatRoughness: .2 });
  }
  if ([17,19,20,28,30,37,39,45,58].includes(id)) return finish('dark brightwork', {color: '#34383b', metalness: .7, roughness: .33, clearcoat: .19});
  return mesh.material;
}
