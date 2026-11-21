import * as THREE from './vendor/three.module.js';

// Coordinates are metres in the body asset. The steering column rises towards
// the driver and the lower rim flattens out above the driver's thighs.
export function rimPoint(angle, section, clearance = 0) {
  const s = Math.sin(angle), c = Math.cos(angle);
  const roundY = .181 * s;
  const bottom = Math.max(0, -roundY - .113);
  const y = roundY + 4.25 * bottom * bottom;
  const thumb = Math.exp(-Math.pow((s - .47) / .19, 2));
  const sideGrip = Math.pow(Math.abs(c), 5);
  const inward = Math.max(0, -Math.cos(section));
  const width = .0165 + .0042 * sideGrip + .010 * thumb * inward;
  const z = .181 * c + c * Math.cos(section) * (width + clearance);
  const vertical = y + s * Math.cos(section) * (width + clearance);
  const depth = Math.sin(section) * (.020 + .004 * sideGrip + clearance);
  return [-.253 - .323 * vertical + depth, .909 + vertical, .377 + z];
}

function sheet(rows, uvRows) {
  const vertices = [], tex = [], index = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = 0; j < rows[i].length; j++) {
      const k = vertices.length / 3;
      vertices.push(...rows[i][j]);
      tex.push(...uvRows[i][j]);
      if (i && j) {
        const n = rows[i].length;
        index.push(k-n-1, k-1, k, k-n-1, k, k-n);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(tex, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

export function steeringGrip(start = 0, end = Math.PI * 2, clearance = 0) {
  const rows = [], uvs = [], count = Math.ceil((end-start) * 27);
  for (let i = 0; i <= count; i++) {
    const angle = start + (end-start) * i/count;
    const ring = [], uv = [];
    for (let j = 0; j <= 24; j++) {
      const section = -j * Math.PI / 12;
      ring.push(rimPoint(angle, section, clearance));
      uv.push([angle * .181 * 6, section * .020 * 6]);
    }
    rows.push(ring); uvs.push(uv);
  }
  return sheet(rows, uvs);
}

// Find the outermost cross-section of the closed bonnet at every station.
// Matching its two lips prevents daylight between the wheelhouse and wing.
export function bayLips(bonnet) {
  const stations = 60;
  const limits = [-2.085, -.862];
  const rows = Array.from({ length: stations+1 }, (_,i) => {
    const x = THREE.MathUtils.lerp(...limits, i/stations);
    const t = i/stations;
    return { x, width: 0, y: .729 + .284*t };
  });
  if (bonnet) {
    const geom = bonnet.geometry, pos = geom.attributes.position, ids = geom.index?.array;
    const count = ids?.length ?? pos.count;
    for (let i = 0; i < count; i += 3) {
      for (let j = 0; j < 3; j++) {
        const a = ids ? ids[i+j] : i+j, next = (j+1)%3, b = ids ? ids[i+next] : i+next;
        const ax = pos.getX(a), bx = pos.getX(b), ay=pos.getY(a), by=pos.getY(b), az=pos.getZ(a), bz=pos.getZ(b);
        if (Math.max(az,bz) < 0 || Math.abs(ax-bx) < .000001) continue;
        const step = (limits[1]-limits[0])/stations;
        const first = Math.max(0,Math.ceil((Math.min(ax,bx)-limits[0])/step));
        const last = Math.min(stations,Math.floor((Math.max(ax,bx)-limits[0])/step));
        for (let k = first; k <= last; k++) {
          const row = rows[k], t=(row.x-ax)/(bx-ax), width=az+(bz-az)*t;
          if (width>row.width) { row.width=width; row.y=ay+(by-ay)*t; }
        }
      }
    }
  }
  for (let i=0; i<rows.length; i++) {
    if (!rows[i].width) rows[i].width = .5+.24*Math.sin(Math.min(1,i/stations*2)*Math.PI/2);
  }
  return rows;
}

export function innerWing(stations, side, lined = false) {
  const rows = [], uvs = [];
  for (const { x, width, y } of stations) {
    const ridge = .012 * Math.exp(-Math.pow((x+1.48)/.37,2));
    // A gutter beneath the wing flange, a raised wheel tub, then a vertical
    // apron extending underneath both intake ducts and the service reservoirs.
    const edge = width+.025;
    const cross = [[edge,y-.020],[edge-.028,y-.026],[edge-.049,y-.044],
      [edge-.072,y-.046],[edge-.089,y-.055],[edge-.12,y-.068+ridge],
      [edge-.147,y-.084+ridge],[edge-.165,y-.106],[edge-.18,y-.151],
      [Math.max(.16,edge-.195),.47],[Math.max(.14,edge-.215),.422]];
    // The sheet metal and the fabric liner meet on the fourth pressed rib.
    // Neither crosses into the adjacent reservoir or strut service points.
    const strip=lined?cross.slice(4):cross.slice(0,5);
    rows.push(strip.map(([z,h])=>[x,h,side*z]));
    uvs.push(strip.map(([z,h])=>[x*6,(z+h)*6]));
  }
  return sheet(rows,uvs);
}

// Mould the insulation against the actual bonnet curvature; leave both
// extraction vents unobstructed. Its fixings share the moving bonnet hinge.
export function hoodInsulation(hood) {
  const stations=[[-2.04,.24],[-2.01,.36],[-1.94,.49],[-1.84,.54],[-1.74,.53],
    [-1.68,.43],[-1.62,.36],[-1.39,.35],[-1.32,.43],[-1.27,.54],[-1.17,.56],
    [-1.03,.56],[-.97,.51],[-.948,.42]];
  const ray=new THREE.Raycaster();
  const rows=[],uvs=[],clips=[];
  for(let i=0;i<stations.length;i++){
    const [x,width]=stations[i], row=[],uv=[];
    for(let j=0;j<=14;j++){
      const z=(j/7-1)*width;
      ray.set(new THREE.Vector3(x,1.8,z),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObject(hood,false)[0];
      const y=hit?.point.y??(.75+.24*(x+2.04));
      const edge=i===0||i===stations.length-1||j===0||j===14;
      const channel=Math.exp(-Math.pow((Math.abs(z)-.14-.12*(x+1.4))/.026,2));
      const point=[x,y-(edge?.010:.026)+.009*channel,z];
      row.push(point);uv.push([x*6,z*6]);
      if((i===2||i===7||i===11)&&(j===1||j===13))clips.push(point);
    }
    rows.push(row);uvs.push(uv);
  }
  return {geometry:sheet(rows,uvs),clips};
}

// Soft double-curvature upholstery built from nested, bevelled contours.
export function paddedFace(outline, depth) {
  const vectors = outline.map(([x,y])=>new THREE.Vector2(x,y));
  const curve = new THREE.SplineCurve([...vectors,vectors[0]]);
  const points = curve.getPoints(outline.length*6);
  const rows=[], uvs=[];
  for(const [size,offset] of [[.95,0],[1,.19],[1,.39],[.974,.64],[.90,.81],[.70,.94],[.37,.991],[.001,1]]){
    rows.push(points.map(p=>[p.x*size,p.y*size,depth*offset]));
    uvs.push(points.map(p=>[p.x*size*6,p.y*size*6]));
  }
  return sheet(rows,uvs);
}
