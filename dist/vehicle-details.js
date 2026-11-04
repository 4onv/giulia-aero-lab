import * as THREE from './vendor/three.module.js';

// Authored visual reconstruction, not measured CAD. Front = -X, vehicle left = +Z.
// Positions follow the 2017 Quadrifoglio supplement fig. 13 and a photographed bay.
export const BAY_REFERENCE='https://aftersales.fiat.com/eLumData/EN/83/620_GIULIA/83_620_GIULIA_604.90.474_EN_07_12.17_SA_QF/83_620_GIULIA_604.90.474_EN_07_12.17_SA_QF.pdf';
export const CABIN_REFERENCE='https://vehicleinfo.mopar.com/assets/publications/en-us/Alfa_Romeo/2017/Giulia/2017-Alfa_Romeo-Giulia-UG_4th.pdf';
export const PHOTO_REFERENCE='https://www.motortrend.com/features/alfa-romeo-giulia-quadrifoglio-6th-place-2017-best-drivers-car';
const v=p=>new THREE.Vector3(...p);

export function isVisible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}

// The artist combined bonnet vent rims with other brightwork in mesh 029.
// Partition by the disjoint upper-bonnet region, preserving every triangle.
export function separateBonnetTrim(car){
 let source;car.traverse(m=>{if(m.isMesh&&m.name==='029-0-29')source=m;});if(!source)return null;
 const geometry=source.geometry,position=geometry.attributes.position,indices=geometry.index?.array||Uint32Array.from({length:position.count},(_,i)=>i),moving=[],fixed=[];
 for(let i=0;i<indices.length;i+=3){const triangle=[indices[i],indices[i+1],indices[i+2]];const onBonnet=triangle.every(k=>position.getY(k)>.84&&position.getX(k)>-1.76&&position.getX(k)<-1.30);(onBonnet?moving:fixed).push(...triangle);}
 if(!moving.length)return null;
 const partition=(g,ids)=>{g.setIndex(ids);const bounds=new THREE.Box3(),point=new THREE.Vector3();for(const id of ids)bounds.expandByPoint(point.fromBufferAttribute(position,id));g.boundingBox=bounds;g.boundingSphere=bounds.getBoundingSphere(new THREE.Sphere());};
 const trim=new THREE.Mesh(geometry.clone(),source.material.clone());partition(trim.geometry,moving);trim.name='bonnet-vent-surrounds';trim.position.copy(source.position);trim.quaternion.copy(source.quaternion);trim.scale.copy(source.scale);
 partition(geometry,fixed);source.parent.add(trim);return trim;
}

export function createVehicleDetails(){
 const root=new THREE.Group();root.name='Reference reconstruction';
 const parts=[],meshes=[];
 const material=(color,roughness=.5,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const m={plastic:material('#202326',.65),cover:material('#2b2d30',.56),rubber:material('#15191b',.86),metal:material('#b6bdc0',.3,.85),steel:material('#686d72',.3,.9),red:material('#860e1a',.35,.3),yellow:material('#e8b72d',.45),blue:material('#53a7ca',.4),white:material('#d4d0c1',.45),pink:material('#b26875',.5),black:material('#0b1014',.35)};
 function part(id,name,description,{zone='engine',reference=PHOTO_REFERENCE,service=null}={}){
  const group=new THREE.Group();group.name=id;group.userData.part={id,name,description,zone,category:zone==='engine'?'Engine bay':'Cabin controls',reference,service,mapped:true,inspectionOnly:true,evidence:'Reference-based reconstruction · dimensions estimated'};
  root.add(group);parts.push(group);return group;
 }
 function mesh(g,geometry,mat,pos=[0,0,0]){const o=new THREE.Mesh(geometry,mat);o.position.set(...pos);o.castShadow=true;o.receiveShadow=true;g.add(o);meshes.push(o);return o;}
 function box(g,size,pos,mat=m.plastic,bevel=.006){
  const [w,h,d]=size,r=Math.min(bevel,w/4,h/4,d/4),s=new THREE.Shape();
  s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
  const geometry=new THREE.ExtrudeGeometry(s,{depth:Math.max(.001,h-2*r),bevelEnabled:r>0,bevelSegments:2,steps:1,bevelSize:r,bevelThickness:r,curveSegments:5});geometry.rotateX(Math.PI/2);geometry.translate(0,h/2-r,0);return mesh(g,geometry,mat,pos);
 }
 function plate(g,points,y,depth,mat=m.plastic){const s=new THREE.Shape();points.forEach(([x,z],i)=>{const prev=points[(i+points.length-1)%points.length],next=points[(i+1)%points.length];const a=new THREE.Vector2(prev[0]-x,prev[1]-z),b=new THREE.Vector2(next[0]-x,next[1]-z);a.setLength(Math.min(.028,a.length()/3));b.setLength(Math.min(.028,b.length()/3));if(i)s.lineTo(x+a.x,z+a.y);else s.moveTo(x+a.x,z+a.y);s.quadraticCurveTo(x,z,x+b.x,z+b.y);});s.closePath();const geo=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,bevelSegments:3,curveSegments:8,steps:1});geo.rotateX(Math.PI/2);return mesh(g,geo,mat,[0,y,0]);}
 function cylinder(g,r,h,pos,mat=m.plastic,r2=r){return mesh(g,new THREE.CylinderGeometry(r,r2,h,32),mat,pos);}
 function pipe(g,points,r=.018,mat=m.rubber){const curve=new THREE.CatmullRomCurve3(points.map(v));return mesh(g,new THREE.TubeGeometry(curve,Math.max(12,points.length*8),r,12,false),mat);}
 function ring(g,pos,r,t=.003,axis=[0,1,0],mat=m.steel){const o=mesh(g,new THREE.TorusGeometry(r,t,8,32),mat,pos);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v(axis).normalize());return o;}
 function bolt(g,pos,r=.008){const o=mesh(g,new THREE.CylinderGeometry(r,r,r*.65,6),m.steel,pos);ring(g,[pos[0],pos[1]-.003,pos[2]],r*1.25,.0015);return o;}
 function label(g,pos,width,height,text,{color='#d2d4d2',background=null,vertical=false,size=50}={}){
  // Canvas labels are original artwork; no reference photographs are redistributed.
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.max(64,Math.round(512*height/width));const ctx=canvas.getContext('2d');
  if(background){ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.fillStyle=color;ctx.font=`600 ${size}px Georgia, serif`;const measured=ctx.measureText(text).width;ctx.font=`600 ${Math.min(canvas.height*.82,size*480/Math.max(1,measured))}px Georgia, serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,canvas.height/2,490);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const o=mesh(g,new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:texture,transparent:true,roughness:.65,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),pos);
  o.rotation.set(vertical?0:-Math.PI/2,vertical?Math.PI/2:0,vertical?0:(g.userData.part.zone==='cabin'?Math.PI/2:-Math.PI/2));return o;
 }
 function cap(g,pos,r=.032,mat=m.plastic,mark=''){
  cylinder(g,r,.018,pos,mat);for(let a=0;a<12;a++){const t=a*Math.PI/6;box(g,[.008,.015,.008],[pos[0]+Math.cos(t)*r,pos[1],pos[2]+Math.sin(t)*r],mat,.002);}
  if(mark)label(g,[pos[0],pos[1]+.010,pos[2]],r*1.6,r*.7,mark,{color:mat===m.blue?'#101a22':'#e9bf45',size:52});
 }
 const liner=part('bay-structure','Engine-compartment liners','Inner panels and cowl trim enclose the engine bay. Their surfaces are reconstructed from photographs; underlying body structure is not modeled.');
 box(liner,[1.18,.05,1.3],[-1.4,.39,0],m.black);
 for(const side of [-1,1]){box(liner,[1.2,.21,.09],[-1.4,.56,side*.64],m.red);box(liner,[.54,.045,.19],[-1.25,.76,side*.60]);box(liner,[.36,.045,.25],[-1.81,.65,side*.57]);for(const x of [-1.93,-1.73,-1.02])bolt(liner,[x,.79,side*.63]);}
 box(liner,[.17,.15,1.26],[-.82,.84,0]);
 for(let i=0;i<29;i++)box(liner,[.09,.004,.012],[-.82,.919,-.56+i*.04],m.black,.001);

 const cover=part('engine-cover','2.9 V6 engine cover','Moulded cover above the Quadrifoglio V6. The six silver accents, central badge and tapered shell follow the photographed cover. The internal engine is not exposed in this model.');
 plate(cover,[[-.96,-.29],[-.90,-.22],[-.90,.22],[-.96,.29],[-1.28,.27],[-1.53,.17],[-1.57,.10],[-1.57,-.10],[-1.53,-.17],[-1.28,-.27]],.835,.07,m.cover);
 plate(cover,[[-.92,-.105],[-.92,.105],[-1.10,.10],[-1.23,.07],[-1.26,0],[-1.23,-.07],[-1.10,-.10]],.856,.025,m.plastic);
 for(const side of [-1,1]){
  for(let i=0;i<3;i++){const o=mesh(cover,new THREE.SphereGeometry(1,32,16),m.metal,[-1.02-i*.115,.849,side*(.208-i*.006)]);o.scale.set(.027,.011,.064);o.rotation.y=side*-.28;}
  for(const x of [-1.03,-1.26])bolt(cover,[x,.848,side*.268],.009);
  const script=label(cover,[-1.11,.852,side*.125],.19,.022,'Alfa Romeo',{size:42});if(script)script.rotation.z=0;
 }
 box(cover,[.045,.009,.18],[-1.31,.847,0],m.red,.008);label(cover,[-1.31,.853,0],.16,.032,'V6 90°',{size:56});
 // Clover emblem is drawn procedurally on a triangular white field.
 const emblem=new THREE.Shape();emblem.moveTo(-.025,0);emblem.lineTo(.02,-.037);emblem.lineTo(.02,.037);emblem.closePath();const eg=new THREE.ShapeGeometry(emblem);eg.rotateX(-Math.PI/2);mesh(cover,eg,m.white,[-1.46,.848,0]);
 const green=material('#216845',.5);for(const [x,z] of [[-.009,0],[.009,0],[0,-.012],[0,.012]]){const o=mesh(cover,new THREE.SphereGeometry(.012,12,8),green,[-1.46+x,.850,z]);o.scale.y=.12;}

 for(const side of [-1,1]){
  const title=side>0?'Left':'Right';
  const intake=part(`intake-${side}`,`${title} intake pipe and coupling`,'Curved intake plumbing carries air through the induction system. Corrugated couplings allow movement and metal bands secure the hose joints. Routing is a visible-envelope reconstruction.');
  const points=[[-1.03,.72,side*.30],[-1.17,.70,side*.41],[-1.46,.65,side*.43],[-1.69,.58,side*.40],[-1.74,.56,side*.33]];
  pipe(intake,points,.053,m.plastic);
  for(const x of [-1.19,-1.21,-1.23,-1.25,-1.27,-1.29])ring(intake,[x,.684,side*.426],.055,.004,[1,0,0],m.rubber);
  for(const x of [-1.18,-1.31])ring(intake,[x,.68,side*.42],.055,.005,[1,0,0]);
  const duct=part(`front-duct-${side}`,`${title} front air duct`,'Broad moulded duct at the front of the bay. Its flattened inlet and ribbed section follow the photographed induction layout; the air passage is not a simulated cooling duct.');
  plate(duct,[[-1.97,side*.12],[-1.97,side*.40],[-1.70,side*.33],[-1.43,side*.29],[-1.36,side*.20],[-1.51,side*.17],[-1.77,side*.21]],.65,.095,m.cover);
  for(let i=0;i<8;i++)box(duct,[.012,.017,.112],[-1.65+i*.024,.662,side*.254],m.rubber,.004);
  const throttle=part(`throttle-${side}`,`${title} throttle housing`,'Aluminium housing visible at the front of the engine, with a clamped rubber connection. Throttle valves regulate airflow into the engine; internal valve geometry is not included.');
  const housing=cylinder(throttle,.06,.10,[-1.57,.66,side*.13],m.metal);housing.rotation.z=Math.PI/2;
  box(throttle,[.10,.09,.13],[-1.56,.66,side*.13],m.metal,.008);
  pipe(throttle,[[-1.60,.65,side*.13],[-1.69,.60,side*.13],[-1.67,.50,side*.16]],.043);
  for(const x of [-1.59,-1.62])ring(throttle,[x,.64,side*.13],.045,.004,[1,0,0]);
  for(const z of [-.041,.041])bolt(throttle,[-1.57,.713,side*.13+z],.006);
  const tower=part(`strut-${side}`,`${title} front strut top`,'Upper mounting area of the front suspension. The visible cap and surrounding fasteners are reconstructed; the suspension below is not disassembled.');
  cylinder(tower,.08,.045,[-1.25,.733,side*.55],m.red);cylinder(tower,.046,.04,[-1.25,.767,side*.55],m.rubber);bolt(tower,[-1.25,.792,side*.55],.013);
  for(let a=0;a<3;a++){const t=a*2*Math.PI/3;bolt(tower,[-1.25+Math.cos(t)*.065,.76,side*.55+Math.sin(t)*.065]);}
 }
 const brace=part('cross-brace','Engine-bay cross brace','Curved brace spanning the rear of the engine compartment. It ties the upper body mounting areas together; this model does not calculate structural stiffness.');
 pipe(brace,[[-1.25,.84,-.66],[-1.10,.9,-.40],[-.94,.927,0],[-1.10,.9,.40],[-1.25,.84,.66]],.019,m.plastic);
 for(const side of [-1,1]){box(brace,[.09,.02,.07],[-1.25,.84,side*.64]);bolt(brace,[-1.25,.855,side*.64],.01);}
 const oil=part('oil-filler','Engine oil filler cap','Service point 2 in the Quadrifoglio supplement. This cap closes the engine-oil filling opening.',{reference:BAY_REFERENCE,service:2});
 cylinder(oil,.035,.045,[-1.40,.751,-.30]);cap(oil,[-1.40,.784,-.30],.042,m.plastic,'OIL');box(oil,[.055,.012,.012],[-1.40,.80,-.30],m.cover,.004);
 const dipstick=part('oil-dipstick','Engine oil dipstick','Service point 1 in the Quadrifoglio supplement. The removable dipstick provides a physical engine-oil level check.',{reference:BAY_REFERENCE,service:1});
 pipe(dipstick,[[-1.48,.56,-.33],[-1.49,.70,-.32]],.006,m.steel);ring(dipstick,[-1.49,.736,-.32],.019,.006,[0,0,1],m.yellow);
 function reservoir(id,name,description,service,pos,size){
  const g=part(id,name,description,{reference:BAY_REFERENCE,service});
  box(g,size,pos,m.white,.018);box(g,[size[0]*1.01,.028,size[2]*1.01],[pos[0],pos[1]-.015,pos[2]],m.pink,.012);
  cap(g,[pos[0],pos[1]+size[1]/2+.014,pos[2]],.034,m.plastic,'!');
  pipe(g,[[pos[0]+.06,pos[1],pos[2]],[pos[0]+.10,pos[1]-.08,pos[2]],[pos[0],.48,pos[2]*.75]],.012);
  label(g,[pos[0]-.055,pos[1]+size[1]/2+.004,pos[2]],.04,.035,'MAX',{color:'#354b6a',size:46});return g;
 }
 reservoir('engine-coolant','Engine coolant reservoir','Service point 3 in the Quadrifoglio supplement. Expansion reservoir for the engine cooling circuit. The cap is a pressure closure; this view is for identification, not servicing.',3,[-1.02,.76,-.48],[.23,.11,.17]);
 reservoir('intercooler-coolant','Intercooler coolant reservoir','Service point 6 in the Quadrifoglio supplement. Reservoir for the separate charge-air cooling circuit. Its front-left location distinguishes it from the engine coolant reservoir.',6,[-1.72,.62,.52],[.20,.13,.14]);
 const brake=part('brake-access','Brake-fluid access cover','Service point 4 in the Quadrifoglio supplement. This rear-left cover provides access to the brake-fluid reservoir cap; the cover itself is not the reservoir.',{reference:BAY_REFERENCE,service:4});
 box(brake,[.18,.024,.25],[-.94,.907,.46]);box(brake,[.14,.006,.20],[-.94,.925,.46],m.cover);bolt(brake,[-.88,.932,.52],.006);
 const washer=part('washer-filler','Washer-fluid filler cap','Service point 5 in the Quadrifoglio supplement. Blue cap on the filling neck for the windscreen washer-fluid reservoir.',{reference:BAY_REFERENCE,service:5});
 pipe(washer,[[-.93,.6,.64],[-.94,.85,.63],[-.94,.91,.61]],.023,m.white);cap(washer,[-.94,.933,.61],.029,m.blue,'W');
 const wiring=part('wiring-loom','Engine-bay wiring looms','Bundled electrical wiring connects sensors and actuators. Visible cable paths and clips are represented; connector pinouts and hidden wiring are not mapped.');
 for(const side of [-1,1]){pipe(wiring,[[-.96,.68,side*.64],[-1.24,.65,side*.63],[-1.58,.56,side*.57],[-1.83,.49,side*.46],[-1.86,.49,0]],.014);
  for(let i=0;i<7;i++){const x=-1.21-i*.073;ring(wiring,[x,.63-(i*.012),side*.59],.015,.002,[1,0,0],m.cover);}
  for(const x of [-1.32,-1.62])box(wiring,[.018,.032,.025],[x,.60,side*.60],m.plastic,.003);
 }
 const lines=part('bay-hardlines','Aluminium lines and fittings','Metal lines routed around the left side of the bay, reproduced from the visible photograph. Individual circuit assignments are not verified; this is a grouped visual assembly.');
 for(let n=0;n<3;n++){pipe(lines,[[-.99,.69,.39+n*.035],[-1.19,.68,.47+n*.035],[-1.39,.59,.46+n*.035],[-1.60,.49,.42+n*.035]],.008,m.metal);cylinder(lines,.016,.03,[-1.38,.6,.46+n*.035],m.steel);}
 const terminal=part('positive-terminal','Remote positive connection cover','Red protective cover for the positive remote connection in the engine bay. The vehicle battery is located in the luggage compartment.',{reference:BAY_REFERENCE});
 box(terminal,[.065,.045,.06],[-1.69,.59,-.56],m.red);label(terminal,[-1.69,.615,-.56],.04,.04,'+',{color:'#ededed',size:60});
 const front=part('front-carrier','Upper front carrier and latch area','Front support and trim across the radiator area, including a representation of the twin bonnet latch positions. Radiator internals and cooling flow are outside this inspection model.');
 box(front,[.11,.07,1.17],[-1.99,.61,0]);for(const z of [-.43,.43]){box(front,[.055,.025,.07],[-1.98,.66,z],m.steel);bolt(front,[-1.98,.678,z],.009);}

 // Cabin control models are added below the existing artist dashboard surface.
 // They are separate educational assemblies, not a working vehicle interface.
 function control(id,name,description){return part(id,name,description,{zone:'cabin',reference:CABIN_REFERENCE});}
 const instruments=control('instrument-cluster','Instrument cluster','Twin analogue tachometer and speedometer flank the driver information display. Warning lamps and the centre display communicate vehicle status. The displayed markings are illustrative.');
 for(const z of [.275,.48]){
  const housing=cylinder(instruments,.098,.075,[-.52,.96,z],m.black);housing.rotation.z=Math.PI/2;
  const face=cylinder(instruments,.084,.005,[-.479,.96,z],m.black);face.rotation.z=Math.PI/2;
  ring(instruments,[-.474,.96,z],.086,.004,[1,0,0]);
  for(let i=0;i<31;i++){const a=(-.75+i/30*1.5)*Math.PI,yy=.96+Math.cos(a)*.070,zz=z+Math.sin(a)*.070;const tick=box(instruments,[.003,i%5===0?.016:.007,.002],[-.47,yy,zz],m.white,.0005);tick.rotation.x=-a;}
  pipe(instruments,[[-.466,.96,z],[-.466,1.001,z+.045]],.002,m.red);cylinder(instruments,.007,.006,[-.464,.96,z],m.steel).rotation.z=Math.PI/2;
  for(let i=0;i<9;i++){const a=(.75-i/8*1.5)*Math.PI;label(instruments,[-.46,.96+Math.cos(a)*.052,z+Math.sin(a)*.052],.015,.018,String(z>.4?i:i*40),{vertical:true,size:54});}
  label(instruments,[-.46,.93,z],.035,.009,z>.4?'RPM ×1000':'km/h',{vertical:true,size:40});
 }
 box(instruments,[.025,.102,.085],[-.49,.96,.377],m.black);label(instruments,[-.475,.96,.377],.075,.04,'GIULIA',{vertical:true,color:'#b6c3c9',size:46});
 const display=control('connect-display','Connect infotainment display','Display integrated into the dashboard for navigation, media, telephone and vehicle settings. The rotary controller on the centre console operates the Connect system.');
 box(display,[.035,.11,.29],[-.60,.941,-.015],m.black,.015);label(display,[-.57,.943,-.015],.25,.08,'Alfa Romeo',{vertical:true,color:'#b8bcbc',size:52});
 const vents=control('centre-vents','Centre dashboard air outlets','Two adjustable outlets distribute air from the heating and air-conditioning system into the cabin.');
 for(const z of [-.08,.08]){const o=cylinder(vents,.043,.045,[-.53,.81,z],m.black);o.rotation.z=Math.PI/2;ring(vents,[-.505,.81,z],.043,.0035,[1,0,0]);for(let i=-2;i<=2;i++)box(vents,[.006,.006,.068],[-.501,.81+i*.011,z],m.cover,.001);}
 const climate=control('climate-panel','Climate-control panel','Temperature, fan and airflow controls for the automatic climate-control system. Front and rear demisting functions are also operated from this area.');
 box(climate,[.035,.075,.28],[-.47,.70,0],m.plastic,.012);for(const z of [-.10,0,.10]){const knob=cylinder(climate,.024,.022,[-.443,.70,z],m.cover);knob.rotation.z=Math.PI/2;ring(climate,[-.43,.70,z],.023,.002,[1,0,0]);}
 for(const z of [-.10,0,.10])label(climate,[-.428,.70,z],.033,.016,z===0?'OFF':'AUTO',{vertical:true,size:42});
 for(const z of [-.047,.047])for(const y of [.68,.72])box(climate,[.008,.014,.035],[-.44,y,z],m.cover,.002);
 const selector=control('gear-selector','Automatic gear selector','Selects transmission positions and manual shifting on an automatic-equipped Giulia. The park button is incorporated in the selector; this is an inspection model and does not operate a transmission.');
 box(selector,[.17,.026,.115],[-.14,.52,0],m.steel,.012);box(selector,[.15,.028,.095],[-.14,.54,0],m.black,.01);pipe(selector,[[-.14,.54,0],[-.16,.64,0],[-.18,.67,0]],.024,m.cover);box(selector,[.08,.04,.055],[-.18,.674,0],m.cover,.012);label(selector,[-.18,.698,0],.026,.026,'P',{size:60});
 const dna=control('dna-selector','Alfa DNA Pro selector','Selects driving modes. The Quadrifoglio system includes Dynamic, Natural, Advanced Efficiency and Race modes, which alter the vehicle’s control strategies.');
 cylinder(dna,.027,.027,[-.06,.542,.10],m.steel);cylinder(dna,.023,.029,[-.06,.55,.10],m.cover);label(dna,[-.06,.566,.10],.04,.024,'DNA',{size:40});
 const controller=control('connect-controller','Connect rotary controller','Rotary and push control for the infotainment system, located behind the gear selector. Adjacent buttons provide shortcuts to the system menus.');
 cylinder(controller,.042,.025,[.09,.533,0],m.steel);cylinder(controller,.038,.026,[.09,.54,0],m.cover);for(const z of [-.07,.07])box(controller,[.055,.013,.022],[.09,.536,z],m.black,.005);
 const parking=control('parking-brake','Electric parking-brake switch','Console switch for the electric parking brake. It is a separate control from the automatic transmission’s Park position.');
 box(parking,[.042,.022,.029],[.19,.531,.07],m.black,.004);label(parking,[.19,.544,.07],.023,.018,'(P)',{size:44});
 const start=control('engine-start','Steering-wheel start button','Engine start/stop button positioned on the steering wheel. The red button is a distinctive Quadrifoglio control.');
 const startCap=cylinder(start,.019,.014,[-.214,.804,.435],m.red);startCap.rotation.z=Math.PI/2;label(start,[-.205,.804,.435],.029,.02,'START',{vertical:true,color:'#eee9e4',size:38});
 const paddles=control('shift-paddles','Steering-column shift paddles','Column-mounted aluminium paddles command manual gear changes on the automatic transmission. Left requests a downshift; right requests an upshift.');
 for(const side of [-1,1]){const z=.377+side*.15;box(paddles,[.018,.15,.035],[-.32,.94,z],m.metal,.008);label(paddles,[-.309,.98,z],.025,.03,side>0?'−':'+',{vertical:true,color:'#333',size:60});}

 // Fit the reference controls to the actual artist console/dashboard surfaces.
 display.position.x=.153;vents.position.x=.11;climate.position.x=.12;
 selector.position.y=.08;dna.position.y=.065;controller.position.y=.05;parking.position.y=.03;

 // Batch decorative fasteners/ribs by material within each selectable assembly.
 // A click still resolves to the assembly, without hundreds of extra draw calls.
 meshes.length=0;
 for(const group of parts){
  const batches=new Map();
  for(const child of [...group.children]){child.updateMatrix();const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(child.matrix);const list=batches.get(child.material)||[];list.push(geo);batches.set(child.material,list);group.remove(child);child.geometry.dispose();}
  for(const [mat,geometries] of batches){const combined=new THREE.BufferGeometry();for(const attr of ['position','normal','uv']){const arrays=geometries.map(g=>g.getAttribute(attr));if(arrays.some(a=>!a))continue;const data=new Float32Array(arrays.reduce((n,a)=>n+a.array.length,0));let offset=0;for(const a of arrays){data.set(a.array,offset);offset+=a.array.length;}combined.setAttribute(attr,new THREE.BufferAttribute(data,arrays[0].itemSize));}mesh(group,combined,mat);geometries.forEach(g=>g.dispose());}
 }
 root.visible=false;
 return {root,parts,meshes};
}

export class BonnetMotion{
 constructor(scene,meshes){
  this.pivot=new THREE.Group();this.pivot.name='Bonnet hinge';this.pivot.position.set(-.85,1.0,0);scene.add(this.pivot);scene.updateMatrixWorld(true);
  this.panels=meshes.filter(m=>m.name==='010-0-10~01'||m.name==='bonnet-vent-surrounds'||Number(m.name.slice(0,3))===36);
  for(const panel of this.panels){panel.material.side=THREE.DoubleSide;this.pivot.attach(panel);}
  this.open=false;
 }
 setOpen(value,immediate=false){this.open=value;if(immediate)this.pivot.rotation.z=value?-1.08:0;this.pivot.updateMatrixWorld(true);}
 update(dt){const target=this.open?-1.08:0;this.pivot.rotation.z=THREE.MathUtils.damp(this.pivot.rotation.z,target,8,dt);if(Math.abs(this.pivot.rotation.z-target)<.0001)this.pivot.rotation.z=target;}
}
