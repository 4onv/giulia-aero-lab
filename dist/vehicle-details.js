import { instrumentDial, clusterDisplay, navigationScreen, steeringBadge, vehicleScreen, wheelSwitches } from './cockpit-art.js';
import { bayLips, hoodInsulation, innerWing, paddedFace, rimPoint, steeringGrip } from './body-reconstruction.js';
import { cabinMaterial } from './cabin-finishes.js';
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

export function createVehicleDetails(sourceMeshes=[]){
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
 const hood=sourceMeshes.find(o=>o.name==='010-0-10~01');
 if(hood){
   const pad=part('bonnet-insulation','Bonnet insulation pad','Fitted acoustic insulation follows the underside of the bonnet and leaves both extraction vents open.');
   const felt=cabinMaterial('fascia').clone();felt.color.set('#313336');felt.roughness=.97;felt.side=THREE.DoubleSide;
   const {geometry,clips}=hoodInsulation(hood);
   mesh(pad,geometry,felt);
   for(const [x,y,z] of clips)cylinder(pad,.011,.003,[x,y-.002,z],m.plastic);
 }
 const lip=bayLips(hood);
 const stamped=new THREE.MeshPhysicalMaterial({color:'#66262c',metalness:.38,roughness:.47,clearcoat:.32,side:THREE.DoubleSide});
 const shield=m.cover.clone();shield.side=THREE.DoubleSide;shield.color.set('#303333');shield.roughness=.76;
 plate(liner,[[-2.085,-.43],[-2.0,-.68],[-1.62,-.71],[-.76,-.70],[-.76,.70],[-1.62,.71],[-2.0,.68],[-2.085,.43]],.463,.034,m.black);
 for(const side of [-1,1]){
   mesh(liner,innerWing(lip,side),stamped);
   const inset=lip.filter(s=>s.x> -1.91&&s.x<-.92);
   // Rubber edge seal and shallow stamped ribs follow the taper of the bonnet.
   pipe(liner,lip.map(s=>[s.x,s.y-.024,side*(s.width-.001)]),.007,m.rubber);
   pipe(liner,inset.map(s=>[s.x,s.y-.047,side*(s.width-.056)]),.0045,m.red);
   for(const row of inset.filter((_,i)=>i%10===3)){
     bolt(liner,[row.x,row.y-.033,side*(row.width-.024)],.008);
   }
   mesh(liner,innerWing(lip,side,true),shield);
   const coverPoints=[[-1.57,side*.562],[-1.46,side*.638],[-1.13,side*.636],[-1.04,side*.598],[-1.10,side*.49],[-1.28,side*.467],[-1.48,side*.514]];
   plate(liner,coverPoints,.751,.026,m.cover);
   for(const x of [-1.40,-1.365,-1.33]) pipe(liner,[[x,.757,side*.524],[x+.015,.762,side*.568],[x+.04,.757,side*.609]],.0035,m.plastic);
   plate(liner,[[-1.96,side*.412],[-1.90,side*.601],[-1.65,side*.626],[-1.60,side*.547],[-1.73,side*.431]],.647,.035,m.cover);
   for(const x of [-1.91,-1.82])bolt(liner,[x,.655,side*.548]);
 }
 plate(liner,[[-.97,-.67],[-.81,-.74],[-.71,-.68],[-.71,.68],[-.81,.74],[-.97,.67]],.882,.15,m.black);
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
 plate(front,[[-2.085,-.37],[-2.07,-.54],[-1.92,-.59],[-1.90,-.45],[-2.016,-.34],[-2.025,.34],[-1.90,.45],[-1.92,.59],[-2.07,.54],[-2.085,.37]],.677,.058,m.plastic);
 box(front,[.11,.07,1.17],[-1.99,.61,0]);
 for(const z of [-.43,.43]){box(front,[.055,.025,.07],[-1.98,.675,z],m.steel);bolt(front,[-1.98,.693,z],.009);}
 // The lamp reflector is bright metal when viewed through its exterior lens.
 // A rear service cover shields its back from the open engine compartment.
 for(const side of [-1,1]){
   plate(front,[[-2.006,side*.309],[-1.946,side*.300],[-1.839,side*.415],[-1.851,side*.54],[-1.942,side*.527]],.701,.028,m.cover);
   for(const x of [-1.949,-1.916])pipe(front,[[x,.708,side*.360],[x+.025,.708,side*.443],[x+.020,.708,side*.49]],.003,m.plastic);
 }
 for(let i=0;i<20;i++)box(front,[.020,.12,.006],[-1.977,.563,-.383+i*.04],m.steel,.001);

 // Cabin control models are added below the existing artist dashboard surface.
 // They are separate educational assemblies, not a working vehicle interface.
 function control(id,name,description){return part(id,name,description,{zone:'cabin',reference:CABIN_REFERENCE});}
 const instruments=control('instrument-cluster','Instrument cluster','Twin analogue tachometer and speedometer flank the driver information display. Warning lamps and the centre display communicate vehicle status. The displayed markings are illustrative.');
 for(const z of [.275,.48]){
  const housing=cylinder(instruments,.098,.075,[-.52,.96,z],m.black);housing.rotation.z=Math.PI/2;
  const face=cylinder(instruments,.084,.005,[-.479,.96,z],m.black);face.rotation.z=Math.PI/2;
  ring(instruments,[-.474,.96,z],.086,.004,[1,0,0]);
  // The Giulia's gauges sit inside independent, deep upper cowls. The lower
  // opening is cut back so that the needles remain readable below the rim.
  const hood=new THREE.Shape();
  hood.absarc(0,0,.102,.10,Math.PI-.10,false);
  hood.absarc(0,0,.093,Math.PI-.10,.10,true);hood.closePath();
  const shell=mesh(instruments,new THREE.ExtrudeGeometry(hood,{depth:.066,bevelEnabled:true,bevelSegments:3,bevelSize:.002,bevelThickness:.002,curveSegments:40}),cabinMaterial('fascia'),[-.535,.96,z]);
  shell.rotation.y=Math.PI/2;
  if(typeof document!=='undefined'){
   const dial = mesh(instruments,new THREE.PlaneGeometry(.165,.165),instrumentDial(z>.4),[-.472,.96,z]);
   dial.rotation.y=Math.PI/2;
  }
 }
 box(instruments,[.020,.092,.067],[-.5,.959,.377],m.black,.006);
 if(typeof document!=='undefined'){
  const trip=mesh(instruments,new THREE.PlaneGeometry(.064,.060),clusterDisplay(),[-.480,.959,.377]);
  trip.rotation.y=Math.PI/2;
 }
 const display=control('connect-display','Connect navigation display','Navigation, media and vehicle settings share an integrated dashboard screen. The cartography shown here is an original illustrative display.');
 const glassSurround=new THREE.MeshPhysicalMaterial({color:'#14191a',roughness:.25,metalness:.22,clearcoat:.78,clearcoatRoughness:.16});
 const glassOutline=new THREE.Shape();
 glassOutline.moveTo(-.194,-.035);glassOutline.quadraticCurveTo(-.197,-.052,-.176,-.052);
 glassOutline.lineTo(.166,-.052);glassOutline.quadraticCurveTo(.177,-.052,.182,-.043);
 glassOutline.lineTo(.198,.023);glassOutline.quadraticCurveTo(.200,.047,.173,.052);
 glassOutline.quadraticCurveTo(.035,.062,-.164,.058);glassOutline.quadraticCurveTo(-.197,.056,-.197,.038);glassOutline.closePath();
 const screenSurround=mesh(display,new THREE.ExtrudeGeometry(glassOutline,{depth:.034,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:3,curveSegments:18}),glassSurround,[-.614,.941,-.016]);
 screenSurround.rotation.y=Math.PI/2;
 let changeScreen=()=>{};
 if(typeof document!=='undefined'){
   const screen=navigationScreen();
   const map=screen.map;
   let vehicleMap;
   const panel=mesh(display,new THREE.PlaneGeometry(.315,.081),screen,[-.5775,.944,-.016]);
   panel.rotation.y=Math.PI/2;
   changeScreen=vehicle=>{
     if(vehicle&&!vehicleMap)vehicleMap=vehicleScreen().map;
     screen.map=vehicle?vehicleMap:map;
   };
 }
 const vents=control('centre-vents','Centre dashboard air outlets','Two adjustable outlets distribute air from the heating and air-conditioning system into the cabin.');
 function outlet(group,x,y,z,r){
   const barrel=cylinder(group,r,.039,[x-.019,y,z],m.black);barrel.rotation.z=Math.PI/2;
   for(const [scale,t,finish,dx] of [[1.05,.0025,m.cover,0],[1,.003,m.metal,.002],[.88,.003,m.plastic,.003]]){
     ring(group,[x+dx,y,z],r*scale,t,[1,0,0],finish);
   }
   for(let i=-3;i<=3;i++){
     const dy=i*r*.215;
     const width=2*Math.sqrt((r*.85)**2-dy*dy);
     const vane=box(group,[.009,.0024,width],[x-.001,y+dy,z],m.cover,.001);
     vane.rotation.z=-.14;
   }
   box(group,[.006,.006,r*.61],[x+.004,y,z],m.metal,.002);
 }
 for(const z of [-.065,.065])outlet(vents,-.496,.812,z,.047);
 outlet(vents,-.46,.867,.582,.047);
 outlet(vents,-.48,.862,-.626,.048);
 const door=control('front-door-cards','Front door trim and release','Sculpted door armrests, release handles and trim surrounding the adjacent dashboard air outlets.');
 for(const side of [-1,1]){
   const card=[[-.57,.090],[-.52,.126],[-.39,.137],[-.10,.149],[.23,.144],[.50,.126],[.59,.102],[.57,-.14],[.46,-.211],[-.33,-.219],[-.54,-.164]];
   const doorSkin=mesh(door,paddedFace(card,.028),cabinMaterial('fascia'),[.019,.79,side*.663]);doorSkin.scale.z=-side;
   const sweep=[[-.54,.066],[-.40,.089],[-.18,.076],[.06,.046],[.36,.052],[.49,.070],[.48,.032],[.17,.011],[-.08,.020],[-.31,.049],[-.49,.043]];
   const band=mesh(door,paddedFace(sweep,.012),cabinMaterial('carbon'),[.019,.79,side*.633]);band.scale.z=-side;
   const lip=[[-.50,.841,side*.626],[-.30,.860,side*.622],[-.04,.827,side*.622],[.18,.820,side*.622],[.43,.842,side*.634]];
   pipe(door,lip,.002,m.metal);
   const pull=[[-.099,.024],[-.055,.033],[.073,.020],[.093,.006],[.071,-.021],[-.037,-.024],[-.092,-.011]];
   const inset=mesh(door,paddedFace(pull,.013),m.black,[-.19,.777,side*.631]);inset.scale.z=-side;
   pipe(door,[[-.257,.781,side*.612],[-.230,.787,side*.605],[-.173,.787,side*.602],[-.136,.778,side*.606]],.005,m.metal);
 }
 const climate=control('climate-panel','Climate-control panel','Temperature, fan and airflow controls for the automatic climate-control system. Front and rear demisting functions are also operated from this area.');
 box(climate,[.035,.075,.28],[-.47,.70,0],m.plastic,.012);for(const z of [-.10,0,.10]){const knob=cylinder(climate,.024,.022,[-.443,.70,z],m.cover);knob.rotation.z=Math.PI/2;ring(climate,[-.43,.70,z],.023,.002,[1,0,0]);}
 for(const z of [-.10,0,.10])label(climate,[-.428,.70,z],.033,.016,z===0?'OFF':'AUTO',{vertical:true,size:42});
 for(const z of [-.047,.047])for(const y of [.68,.72])box(climate,[.008,.014,.035],[-.44,y,z],m.cover,.002);
 label(climate,[-.432,.719,-.047],.018,.014,'△',{vertical:true,color:'#d86052',size:58});
 for(const z of [-.10,0,.10]){
   for(let i=0;i<34;i++){
     const a=i*Math.PI/17;
     const ridge=box(climate,[.010,.0014,.002],[-.440,.70+Math.sin(a)*.024,z+Math.cos(a)*.024],m.steel,.0004);
     ridge.rotation.x=-a;
   }
 }
 const selector=control('gear-selector','Automatic gear selector','Selects transmission positions and manual shifting on an automatic-equipped Giulia. The park button is incorporated in the selector; this is an inspection model and does not operate a transmission.');
 box(selector,[.17,.026,.115],[-.14,.52,0],m.steel,.012);
 box(selector,[.15,.028,.095],[-.14,.54,0],m.black,.01);
 const boot=mesh(selector,new THREE.LatheGeometry([[.061,0],[.057,.015],[.043,.028],[.034,.042],[.020,.066],[.015,.076]].map(([r,y])=>new THREE.Vector2(r,y)),48),cabinMaterial('leather'),[-.14,.545,0]);
 boot.scale.set(1.04,1,.7);
 const shank=cylinder(selector,.013,.062,[-.149,.636,0],m.steel);shank.rotation.z=.19;
 const grip=mesh(selector,new THREE.SphereGeometry(1,40,24),cabinMaterial('leather'),[-.157,.666,0]);grip.scale.set(.038,.052,.027);grip.rotation.z=.25;
 const capFace=mesh(selector,new THREE.SphereGeometry(1,32,16),m.steel,[-.165,.686,-.002]);capFace.scale.set(.036,.029,.025);capFace.rotation.z=.26;
 const key=mesh(selector,new THREE.SphereGeometry(1,32,16),m.black,[-.159,.702,0]);key.scale.set(.020,.015,.020);
 label(selector,[-.159,.717,0],.016,.014,'P',{size:55});
 const dna=control('dna-selector','Alfa DNA Pro selector','Selects driving modes. The Quadrifoglio system includes Dynamic, Natural, Advanced Efficiency and Race modes, which alter the vehicle’s control strategies.');
 cylinder(dna,.027,.027,[-.06,.542,.10],m.steel);cylinder(dna,.023,.029,[-.06,.55,.10],m.cover);label(dna,[-.06,.566,.10],.04,.024,'DNA',{size:40});
 const controller=control('connect-controller','Connect rotary controller','Rotary and push control for the infotainment system, located behind the gear selector. Adjacent buttons provide shortcuts to the system menus.');
 cylinder(controller,.042,.025,[.09,.533,0],m.steel);cylinder(controller,.038,.026,[.09,.54,0],m.cover);for(const z of [-.07,.07])box(controller,[.055,.013,.022],[.09,.536,z],m.black,.005);
 const parking=control('parking-brake','Electric parking-brake switch','Console switch for the electric parking brake. It is a separate control from the automatic transmission’s Park position.');
 box(parking,[.042,.022,.029],[.19,.531,.07],m.black,.004);label(parking,[.19,.544,.07],.023,.018,'(P)',{size:44});
 const start=control('engine-start','Steering-wheel start button','Engine start/stop button positioned on the steering wheel. The red button is a distinctive Quadrifoglio control.');
 // A moulded lower spoke carries the start button. Its rounded pad shares
 // the rear surface of the horn at one end and the rim at the other.
 const wheelCenter=[-.242,.906,.377], tilt=.307;
 function wheelPiece(geometry,finish,x=0,y=0,z=0){
   const p=mesh(start,geometry,finish,[wheelCenter[0]+x,wheelCenter[1]+y,wheelCenter[2]+z]);
   p.rotation.order='ZXY';p.rotation.z=tilt;p.rotation.y=Math.PI/2;return p;
 }
 const cushion=[[-.062,.048],[-.030,.059],[.030,.059],[.062,.048],[.076,.033],[.075,.009],[.060,-.020],[.034,-.056],[0,-.067],[-.034,-.056],[-.060,-.020],[-.075,.009],[-.076,.033]];
 wheelPiece(paddedFace(cushion,.043),cabinMaterial('leather'));
 function facedShape(group,points,position,depth,finish,bevel=.003){
   const outline=new THREE.Shape(); outline.moveTo(points[0][0],points[0][1]);
   for(const [x,y] of points.slice(1))outline.lineTo(x,y);
   outline.closePath();
   const geo=new THREE.ExtrudeGeometry(outline,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1});
   const item=mesh(group,geo,finish,position);item.rotation.y=Math.PI/2;return item;
 }
 const pod=material('#32373a',.42,.19);
 const metalSpoke=new THREE.MeshPhysicalMaterial({color:'#aeb2b3',roughness:.30,metalness:.78,clearcoat:.22});
 const lowerFork=wheelPiece(paddedFace([[-.060,-.026],[-.032,-.038],[0,-.071],[.032,-.038],[.060,-.026],[.053,-.058],[.027,-.132],[.019,-.154],[-.019,-.154],[-.027,-.132],[-.053,-.058]],.011),metalSpoke,-.010);
 lowerFork.material.side=THREE.DoubleSide;
 wheelPiece(paddedFace([[-.029,-.064],[0,-.080],[.029,-.064],[.016,-.130],[0,-.145],[-.016,-.130]],.012),cabinMaterial('carbon'),.000);
 for(const side of [-1,1]){
   const profile=[[.046,.036],[.096,.036],[.153,.043],[.17,.034],[.163,.012],[.112,-.017],[.075,-.029],[.050,-.018]];
   const outline=profile.map(([u,y])=>[side*u,y]);
   if(side<0)outline.reverse();
   wheelPiece(paddedFace(outline,.014),metalSpoke,-.003);
   const inset=outline.map(([u,y])=>[u*.970, y*.81+.003]);
   wheelPiece(paddedFace(inset,.012),pod,.008);
   const base=[-.219,.913,.377+side*.113];
   if(typeof document!=='undefined'){
     const switches=mesh(start,new THREE.PlaneGeometry(.062,.029),wheelSwitches(side>0),base);
     switches.rotation.order='ZXY';switches.rotation.z=tilt;switches.rotation.y=Math.PI/2;
   }
 }
 // Perforated side grips, carbon base and their leather-to-inlay joins.
 const deg=n=>n*Math.PI/180;
 for(const [from,to,type] of [[-39,40,'perforated'],[140,219,'perforated'],[237,303,'carbon']]){
   mesh(start,steeringGrip(deg(from),deg(to),.00065),cabinMaterial(type));
   for(const angle of [from,to]){
     const points=Array.from({length:33},(_,i)=>rimPoint(deg(angle),i*Math.PI/16,.00090));
     pipe(start,points,.0010,m.rubber);
   }
 }
 // A separate moulded lobe carries the Quadrifoglio ignition switch.
 const podOutline=[[-.034,.031],[.011,.025],[.035,.008],[.034,-.021],[.017,-.035],[-.006,-.033],[-.025,-.009]];
 wheelPiece(paddedFace(podOutline,.022),pod,.007,-.033,.081);
 const startBezel=cylinder(start,.0185,.009,[-.211,.849,.470],metalSpoke);startBezel.rotation.z=Math.PI/2;
 const startCap=cylinder(start,.016,.009,[-.204,.849,.470],material('#a91b27',.32,.26));startCap.rotation.z=Math.PI/2;
 label(start,[-.198,.852,.470],.021,.007,'START',{vertical:true,size:45});
 label(start,[-.198,.844,.470],.021,.006,'STOP',{vertical:true,size:43});
 const paddles=control('shift-paddles','Steering-column shift paddles','Column-mounted aluminium paddles command manual gear changes on the automatic transmission. Left requests a downshift; right requests an upshift.');
 const brushed=new THREE.MeshPhysicalMaterial({color:'#9a9fa1',metalness:.79,roughness:.39,clearcoat:.18,clearcoatRoughness:.28});
 for(const side of [-1,1]){
   // Elongated column-mounted blade with a narrow heel and a curved shoulder.
   const z=.377+side*.144;
   const profile=[[-.010,-.073],[.009,-.065],[.023,-.021],[.030,.102],[.024,.113],[.013,.108],[-.002,.060],[-.011,.014],[-.014,-.044]].map(([u,v])=>[u*-side,v]);
   facedShape(paddles,profile,[-.335,.966,z],.008,brushed,.0018);
   label(paddles,[-.323,1.044,z+side*.014],.018,.018,side>0?'−':'+',{vertical:true,color:'#282c30',size:58});
 }
 // Fit stitches, dash inlay and switch pads to the artist's curved surfaces.
 // A front-facing ray lands each piece directly on its selectable parent surface.
 const wheelHub=sourceMeshes.find(o=>o.name==='051-0-51~04');
 const dash=sourceMeshes.find(o=>o.name==='051-0-51~01');
 if (wheelHub && dash && typeof document!=='undefined') {
   const ray=new THREE.Raycaster();
   function skin(object,y,z,offset) {
     ray.set(new THREE.Vector3(.95,y,z),new THREE.Vector3(-1,0,0));
     const hit=ray.intersectObject(object,false)[0];
     return hit ? [hit.point.x+offset,y,z] : null;
   }
   const badgePos=[-.193,.917,.377];
   if(badgePos){
     const bezel=cylinder(start,.0285,.005,badgePos,m.steel);
     bezel.rotation.z=Math.PI/2+tilt;
     const crest=mesh(start,new THREE.PlaneGeometry(.055,.055),steeringBadge(),[badgePos[0]+.0035,badgePos[1]+.001,badgePos[2]]);
     crest.rotation.order='ZXY';crest.rotation.z=tilt;crest.rotation.y=Math.PI/2;
   }
   const stitch=material('#7c625c',.83);
   const rim=sourceMeshes.find(o=>o.name==='051-0-51~00');
   if(rim){
     // Follow the actual leather rim. Stitch pairs cross its inner seam.
     for(let i=0;i<148;i++){
       const a=i*2*Math.PI/148;
       if(a>4.12&&a<5.30)continue;
       pipe(start,[rimPoint(a-.012,2.24,.00125),rimPoint(a,2.44,.00125),rimPoint(a+.012,2.25,.00125)],.00059,stitch);
     }
   }
   // The upper dash uses two parallel rows of satin thread. The lower line is a metal reveal.
   for(let i=0;i<190;i++){
     const z=-.69+i*.0071, y=.985-.037*Math.cos(z*3.2);
     if(z>-.20 && z<.565) continue;
     for (const lift of [0,.004]){
       const a=skin(dash,y+lift,z,.0016),b=skin(dash,y+lift,z+.0047,.0016);
       if(a&&b&&Math.abs(a[0]-b[0])<.022)pipe(instruments,[a,b],.00057,stitch);
     }
   }
   const reveal=[];
   for(let z=-.69;z<-.15;z+=.012){const p=skin(dash,.867,z,.002);if(p)reveal.push(p);}
   if(reveal.length>2)pipe(vents,reveal,.0025,m.metal);
   // The trim follows the actual passenger fascia, tapering toward the door.
   const vertices=[],uvs=[],indices=[];
   for(let i=0;i<=58;i++){
     const u=i/58,z=-.69+u*.54,y=.868+.014*Math.cos(Math.PI*u),height=.021+.017*u;
     const low=skin(dash,y,z,.0024),high=skin(dash,y+height,z,.0024);
     if(!low||!high)continue;
     const n=vertices.length/3;
     vertices.push(...low,...high);uvs.push(u*5,0,u*5,.34);
     if(n)indices.push(n-2,n-1,n,n,n-1,n+1);
   }
   if(indices.length){
     const trim=new THREE.BufferGeometry();
     trim.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
     trim.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));trim.setIndex(indices);trim.computeVertexNormals();
   const consoleSkin=cabinMaterial('carbon').clone();
     consoleSkin.side=THREE.DoubleSide;
     mesh(vents,trim,consoleSkin);
   }
 }
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
 return {root,parts,meshes,changeScreen};
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
