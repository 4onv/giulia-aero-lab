import * as THREE from './vendor/three.module.js';

const finishes = new Map();
const maps = new Map();

// Model UVs repeat approximately six times per metre. Keep the grain and
// punched holes at that scale across the dashboard, wheel, and armrests.
function surfaceMap(name, color = false) {
  if (!maps.has(name)) {
    const url = new URL('./assets/cabin/' + name + '.webp', import.meta.url);
    const texture = new THREE.TextureLoader().load(url.href);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    if (name.startsWith('twill-')) texture.repeat.set(3.75,3.75);
    texture.anisotropy = 4;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    maps.set(name, texture);
  }
  return maps.get(name);
}

export function cabinMaterial(kind) {
  if (finishes.has(kind)) return finishes.get(kind);
  const carbon = kind === 'carbon';
  const fascia = kind === 'fascia';
  const leather = kind === 'perforated' ? 'grip' : 'nappa';
  const material = new THREE.MeshPhysicalMaterial(carbon ? {
    color: '#9c9fa1', roughness: .47, metalness: .32, anisotropy: .56,
    clearcoat: .88, clearcoatRoughness: .21, ior: 1.49,
  } : {
    color: fascia ? '#3b3d40' : '#414042', roughness: fascia ? .95 : .80,
    sheen: fascia ? .13 : .20, sheenColor: '#a6a0a0', sheenRoughness: .81,
    clearcoat: fascia ? .025 : .065, clearcoatRoughness: .53, ior: 1.46,
  });
  material.name = 'Cabin ' + kind;
  if (typeof document !== 'undefined') {
    material.map = surfaceMap(carbon ? 'twill-color' : leather + '-color', true);
    material.normalMap = surfaceMap(carbon ? 'twill-normal' : leather + '-normal');
    material.normalScale.setScalar(carbon ? .38 : fascia ? .36 : .62);
    if (carbon) material.anisotropyMap = surfaceMap('twill-direction');
    else material.roughnessMap = surfaceMap('hide-rough');
  }
  finishes.set(kind, material);
  return material;
}
