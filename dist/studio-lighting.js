import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

// The floor/wall seam was traced in the 2:1 panorama (1100 x 550 reference).
// Reconstruct its footprint so orbiting the car gives the floor and vertical
// walls separate, consistent parallax. Open bays extend to their back wall.
function workshopRoom(THREE, texture) {
  const seam = [
    [0, 346], [64, 337], [124, 348], [205, 355], [302, 346], [348, 334],
    [353, 307], [410, 307], [466, 310], [528, 309], [571, 311], [601, 335],
    [677, 339], [772, 346], [862, 343], [919, 335], [963, 322], [983, 316],
    [987, 300], [1023, 298], [1045, 300], [1052, 341], [1100, 346],
  ];
  const eye = 2.85, floor = -.035, ceiling = 10;
  const positions = [0, floor, 0, 0, ceiling, 0];
  const indices = [];
  let segment = 0;
  const columns = 360;
  for (let i = 0; i <= columns; i++) {
    const u = i / columns, px = u * 1100;
    while (segment < seam.length - 2 && px > seam[segment + 1][0]) segment++;
    const [x0, y0] = seam[segment], [x1, y1] = seam[segment + 1];
    const row = y0 + (y1 - y0) * (px - x0) / (x1 - x0);
    const radius = eye / Math.tan(Math.PI * (row / 550 - .5));
    const x = -Math.cos(u * Math.PI * 2) * radius;
    const z = -Math.sin(u * Math.PI * 2) * radius;
    positions.push(x, floor, z, x, ceiling, z);
    const bottom = 2 + i * 2;
    if (i < columns) indices.push(0, bottom + 2, bottom, bottom, bottom + 2, bottom + 1,
      bottom + 1, bottom + 2, bottom + 3, 1, bottom + 1, bottom + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  texture.wrapS = THREE.RepeatWrapping;
  const material = new THREE.ShaderMaterial({
    uniforms: { panorama: { value: texture }, eye: { value: eye + floor } },
    vertexShader: `varying vec3 workshopPosition;
      void main() { workshopPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D panorama; uniform float eye; varying vec3 workshopPosition;
      void main() {
        vec3 d = normalize(workshopPosition - vec3(0.0, eye, 0.0));
        vec2 uv = vec2(atan(d.z, d.x) / 6.28318531 + .5, asin(clamp(d.y, -1., 1.)) / 3.14159265 + .5);
        // At the wrap seam neighboring fragments straddle 0/1. Use the
        // short angular difference when choosing the panorama's mip level.
        vec2 dx = dFdx(uv), dy = dFdy(uv);
        dx.x -= floor(dx.x + .5);
        dy.x -= floor(dy.x + .5);
        gl_FragColor = textureGrad(panorama, uv, dx, dy);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
  return new THREE.Mesh(geometry, material);
}

// Contact shadows are strongest beneath the four tyres. The larger, softer
// patch represents the daylight blocked by the underbody between them.
function contactShadow(THREE) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  function patch(x, y, rx, ry, opacity) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(rx, ry);
    const fade = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    fade.addColorStop(0, 'rgba(15,11,12,' + opacity + ')');
    fade.addColorStop(.54, 'rgba(20,16,14,' + opacity * .61 + ')');
    fade.addColorStop(1, 'rgba(26,20,17,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  patch(256, 128, 226, 103, .76);
  patch(256, 128, 173, 62, .48);
  for (const x of [139, 372]) {
    for (const y of [74, 182]) patch(x, y, 37, 17, .88);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.35, 3.65), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -.014;
  return mesh;
}

export function setupStudio(THREE, scene, renderer) {
  const tunnelBackground = scene.background;
  const tunnelFog = scene.fog;
  const rig = scene.children.filter(obj => obj.isGridHelper || obj.isLine || obj.geometry?.type === 'PlaneGeometry');
  const lights = scene.children.filter(obj => obj.isLight).map(light => ({ light, intensity: light.intensity }));
  // Broad daylight from the left window and windscreen exposes the dark
  // materials inside the car; the exterior keeps the photographed workshop rig.
  const cabinFill = new THREE.HemisphereLight(0xf5eada, 0x7f90a0, .93);
  const windowLight = new THREE.DirectionalLight(0xf8ece0, 1.65);
  windowLight.position.set(.32,1.7,1.1);
  windowLight.target.position.set(-.47,.78,.03);
  cabinFill.visible = windowLight.visible = false;
  scene.add(cabinFill, windowLight, windowLight.target);
  const room = new THREE.Group();
  room.visible = false;
  const bayHeading = 115 * Math.PI / 180;
  const tunnelHeading = scene.environmentRotation.y;
  const receiver = new THREE.Mesh(new THREE.PlaneGeometry(48, 48), new THREE.ShadowMaterial({ color: 0x2a201a, opacity: .33, depthWrite: false }));
  receiver.rotation.x = -Math.PI / 2;
  receiver.position.y = -.023;
  receiver.receiveShadow = true;
  room.add(receiver, contactShadow(THREE));
  scene.add(room);
  let inspecting = false, interior = false, loading = false, dome, workshopLight, tunnelLight = scene.environment;

  function update() {
    cabinFill.visible = windowLight.visible = inspecting && interior;
    const photographic = Boolean(inspecting && dome);
    room.visible = photographic;
    rig.forEach(item => { item.visible = !photographic; });
    scene.background = tunnelBackground;
    scene.fog = photographic ? null : tunnelFog;
    scene.environment = inspecting && workshopLight ? workshopLight : tunnelLight;
    scene.environmentRotation.y = inspecting && workshopLight ? bayHeading : tunnelHeading;
    scene.environmentIntensity = inspecting && workshopLight ? (interior ? .54 : .86) : .98;
    for (const { light, intensity } of lights) {
      const weight = interior ? (light.isHemisphereLight ? .25 : .48) : (light.isHemisphereLight ? .53 : .68);
      light.intensity = photographic ? intensity * weight : intensity;
    }
  }
  function loadWorkshop() {
    loading = true;
    new THREE.TextureLoader().load('./assets/workshop-interior.webp', texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      dome = workshopRoom(THREE, texture);
      dome.rotation.y = bayHeading;
      dome.renderOrder = -2;
      room.add(dome);
      update();
    }, undefined, () => { loading = false; });
    new HDRLoader().load('./assets/workshop-light.hdr', hdr => {
      const convolution = new THREE.PMREMGenerator(renderer);
      workshopLight = convolution.fromEquirectangular(hdr).texture;
      hdr.dispose();
      convolution.dispose();
      update();
    });
  }
  return {
    setInterior(value) {
      if (value === interior) return;
      interior = value;
      update();
    },
    setInspection(value) {
      inspecting = value;
      if (value && !loading) loadWorkshop();
      update();
    },
    setTunnelEnvironment(texture) {
      tunnelLight = texture;
      update();
    },
  };
}
