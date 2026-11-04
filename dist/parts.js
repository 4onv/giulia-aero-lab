import * as THREE from './vendor/three.module.js';

// Names refer to connected surfaces in this artist asset, not OEM part numbers.
// Vehicle left/right is defined while facing forward (-X); left is +Z.
const named = new Map();
function add(mesh,name,category,description){named.set(mesh,{name,category,description});}
const body={
 '010-0-10~00':['Rear bumper cover','Forms the rear exterior surface and closes the body around the rear impact structure.'],
 '010-0-10~01':['Bonnet / hood','Covers the engine compartment. Its external contour guides air toward the windscreen.'],
 '010-0-10~02':['Right front wing','Body panel surrounding the right front wheel opening.'],
 '010-0-10~03':['Left front wing','Body panel surrounding the left front wheel opening.'],
 '010-0-10~04':['Roof panel','Closes the passenger compartment and forms the upper aerodynamic surface.'],
 '010-0-10~05':['Left sill trim','Lower exterior trim running between the wheel openings.'],
 '010-0-10~06':['Right sill trim','Lower exterior trim running between the wheel openings.'],
 '010-0-10~07':['Roof antenna cover','Streamlined housing for roof-mounted antenna equipment.'],
 '011-0-11~00':['Front bumper cover','Forms the front exterior face around the grilles and lighting.'],
 '011-0-11~01':['Boot / trunk lid','Closes the luggage compartment at the rear of the car.'],
 '011-0-11~02':['Left body side and pillars','Combined source surface around the door apertures and rear quarter.'],
 '012-0-12~00':['Right body side and pillars','Combined source surface around the door apertures and rear quarter.'],
 '011-0-11~03':['Right rear door skin','Outer surface of the right rear passenger door.'],
 '011-0-11~05':['Left rear door skin','Outer surface of the left rear passenger door.'],
 '011-0-11~06':['Left front door skin','Outer surface of the left front passenger door.'],
 '011-0-11~07':['Right front door skin','Outer surface of the right front passenger door.'],
 '011-0-11~04':['Left front door handle','Exterior grip used to unlatch the front door.'],
 '011-0-11~10':['Right front door handle','Exterior grip used to unlatch the front door.'],
 '011-0-11~11':['Left rear door handle','Exterior grip used to unlatch the rear door.'],
 '011-0-11~12':['Right rear door handle','Exterior grip used to unlatch the rear door.'],
 '011-0-11~08':['Left mirror cap','Painted outer housing of the door mirror.'],
 '011-0-11~09':['Right mirror cap','Painted outer housing of the door mirror.'],
 '011-0-11~15':['Fuel filler flap','Covers the fuel filler access opening in the rear quarter.'],
 '015-0-15~00':['Rear lip spoiler','Small raised surface at the trailing edge of the boot lid. This flow grid cannot resolve its aerodynamic contribution.'],
 '015-0-15~01':['Front lower splitter','Lower leading-edge aero surface. The displayed geometry is static; the active mechanism is not included.'],
 '018-0-18~00':['Windscreen','Front glazing that provides forward visibility and separates the cabin from external airflow.'],
 '018-0-18~01':['Rear window','Glazing over the rear parcel shelf.'],
 '018-0-18~02':['Right side glazing','Combined window surfaces along the right side of the cabin.'],
 '018-0-18~03':['Left side glazing','Combined window surfaces along the left side of the cabin.'],
 '031-0-31~00':['Left mirror glass','Reflective surface for the view alongside and behind the vehicle.'],
 '031-0-31~01':['Right mirror glass','Reflective surface for the view alongside and behind the vehicle.']
};
for(const [id,[name,description]] of Object.entries(body))add(id,name,'Exterior',description);
const cabin=[
 ['Steering wheel rim','Outer grip of the steering wheel. The hub, spokes and steering mechanism are separate from this surface.'],
 ['Dashboard and front cabin trim','Combined dashboard, footwell and trim surface supplied by the artist. Reference-built controls are separate selectable assemblies.'],
 ['Cabin lining','Combined interior lining and trim around the passenger compartment.'],
 ['Rear seat assembly','Combined rear seating surface supporting rear passengers.'],
 ['Steering hub and column trim','Combined trim surface at the centre of the steering wheel and its column housing. The start button and shift paddles are separate reference-built components.'],
 ['Left front seat cushion','Lower seat surface supporting the driver in this left-hand-drive asset.'],
 ['Right front seat cushion','Lower seat surface supporting the front passenger.'],
 ['Right front seat backrest','Upright surface supporting the front passenger.'],
 ['Left front seat backrest','Upright surface supporting the driver.'],
 ['Right front headrest','Head restraint behind the front passenger.'],
 ['Left front headrest','Head restraint behind the driver.'],
 ['Left rear headrest','Head restraint at the left rear seating position.'],
 ['Right rear headrest','Head restraint at the right rear seating position.'],
 ['Centre rear headrest','Head restraint at the centre rear seating position.'],
 ['Rear parcel-shelf detail','Small surface above the rear seat. Its exact component identity is not confirmed.'],
 ['Centre console','Trim between the front seats around the central controls and storage area.'],
 ['Overhead console','Interior housing near the front roof lining. Individual switches are not separated.']
];
cabin.forEach(([name,description],i)=>add('051-0-51~'+String(i).padStart(2,'0'),name,'Cabin',description));
const basic={
 36:['Bonnet vents','Exterior','Openings represented in the bonnet surface. No engine-bay flow is simulated.'],
 37:['Front lower grille','Exterior','Perforated front opening. The airflow solver treats the car as a sealed volume.'],
 41:['Rear lower valance','Exterior','Lower rear bumper surface around the exhaust area.'],
 50:['Rear lamp lenses','Lighting','Red lens surfaces of the rear lighting assembly.'],
 52:['Interior mirror surface','Cabin','Reflective surface near the top of the windscreen.'],
 26:['Front badge','Exterior','Emblem at the centre of the front grille.'],
 22:['Rear badge','Exterior','Emblem on the rear luggage-compartment panel.']
};
export function identifyPart(name,box){
 if(name==='bonnet-vent-surrounds')return {name:'Bonnet vent surrounds',category:'Exterior',description:'Trim surrounding the bonnet ventilation openings. It moves with the bonnet during inspection.',mapped:true};
 if(named.has(name))return {...named.get(name),mapped:true};
 const id=Number(name.slice(0,3)),side=box.min.z+box.max.z>0?'Left':'Right',end=box.min.x+box.max.x<0?'front':'rear';
 if([2,3,7,8].includes(id))return {name:side+' '+end+' alloy wheel',category:'Wheels & brakes',description:'Wheel rim that supports the tyre and connects to the hub. Wheel rotation is not modeled by the airflow solver.',mapped:true};
 if([33,34,38,40].includes(id))return {name:side+' '+end+' tyre',category:'Wheels & brakes',description:'Rubber tyre surface providing the contact patch with the road. The simulation uses stationary wheels.',mapped:true};
 if([53,54,55,56].includes(id))return {name:side+' '+end+' brake caliper',category:'Wheels & brakes',description:'Caliper body surrounding the brake disc. In the real braking system, hydraulic pressure clamps the pads onto the disc.',mapped:true};
 if(basic[id]){const [name,category,description]=basic[id];return {name,category,description,mapped:true};}
 return {name:'Source mesh '+name,category:'Unmapped geometry',description:'This surface is selectable, but its exact component identity has not been verified. It may combine several pieces of trim or lighting. No OEM part number is assigned.',mapped:false};
}

export class PartsInspector{
 constructor(meshes,originals,camera,controls,details,bonnet){
  this.meshes=meshes;this.originals=originals;this.camera=camera;this.controls=controls;this.details=details;this.bonnet=bonnet;this.view='exterior';this.active=false;this.selected=null;this.isolated=false;this.highlights=[];
  this.entries=meshes.map(mesh=>{const box=new THREE.Box3().setFromObject(mesh);const info=identifyPart(mesh.name,box);return {mesh,...info,zone:info.category==='Cabin'?'cabin':'exterior'};});
  this.entries.push(...details.parts.map(mesh=>({mesh,...mesh.userData.part})));
  this.entries.sort((a,b)=>Number(b.mapped)-Number(a.mapped)||a.name.localeCompare(b.name));
  this.lookup=new Map();for(const entry of this.entries)entry.mesh.traverse(m=>{if(m.isMesh)this.lookup.set(m,entry);});
  this.$=id=>document.getElementById(id);
  this.$('partSearch').oninput=()=>this.renderList();
  document.querySelectorAll('[data-vehicle]').forEach(b=>b.onclick=()=>this.setView(b.dataset.vehicle));
  this.$('openBonnet').onchange=e=>{this.bonnet.setOpen(e.target.checked);if(!e.target.checked&&this.selected?.zone==='engine')this.clear();this.visibility();};
  this.$('cockpitView').onclick=()=>{this.clear();this.dashboard=true;this.visibility();this.camera.position.set(.68,1.42,.12);this.controls.target.set(-.44,.82,.12);this.controls.update();};
  this.$('closePart').onclick=()=>this.clear();
  this.$('focusPart').onclick=()=>this.focus();
  this.$('isolatePart').onclick=()=>{this.isolated=!this.isolated;this.visibility();};
  this.$('showAll').onclick=()=>{this.clear();this.home();};
  this.renderList();
 }
 activate(value){this.clear();this.active=value;this.details.root.visible=value;if(!value)this.bonnet.setOpen(false,true);else{this.bonnet.setOpen(this.view==='engine');this.home();}this.visibility();}
 setView(view){this.view=view;this.$('partSearch').value='';this.clear();this.bonnet.setOpen(view==='engine');this.visibility();this.renderList();this.home();}
 home(){
  this.dashboard=false;this.visibility();
  const poses={exterior:[[-5.4,2.65,5.5],[0,.65,0]],cabin:[[1.65,2.0,1.8],[-.25,.78,.15]],engine:[[-3.6,3.0,1.8],[-1.25,.95,0]]};
  const [position,target]=poses[this.view];this.camera.position.set(...position);this.controls.target.set(...target);this.controls.update();
  document.querySelectorAll('[data-camera]').forEach(b=>b.classList.remove('active'));
 }
 visibility(){
  for(const entry of this.entries){
   if(!this.active){entry.mesh.visible=!entry.inspectionOnly;continue;}
   entry.mesh.visible=this.isolated?entry===this.selected:entry.zone==='engine'?this.view!=='cabin'&&this.bonnet.open:this.view==='cabin'?entry.zone==='cabin':true;
   if(!this.isolated&&this.view==='cabin'&&this.dashboard&&/^051-0-51~(07|08|09|10)$/.test(entry.mesh.name))entry.mesh.visible=false;
  }
  this.$('bonnetControl').hidden=this.view==='cabin';this.$('cockpitView').hidden=this.view!=='cabin';this.$('openBonnet').checked=this.bonnet.open;
  this.$('isolatePart').setAttribute('aria-pressed',String(this.isolated));
  document.querySelectorAll('[data-vehicle]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vehicle===this.view)));
 }
 clear(){if(this.selected)this.selected.mesh.traverse(m=>{if(m.isMesh)m.material=this.originals.get(m);});this.highlights.forEach(m=>m.dispose());this.highlights=[];this.selected=null;this.isolated=false;this.$('partDetail').hidden=true;this.visibility();this.renderList();}
 select(mesh){
  const next=this.lookup.get(mesh)||this.entries.find(e=>e.mesh===mesh);if(!next)return;
  const previousView=this.view;this.clear();this.selected=next;
  if(/^051-0-51~(07|08|09|10)$/.test(next.mesh.name))this.dashboard=false;
  if(next.zone==='cabin')this.view='cabin';
  if(next.zone==='exterior'&&this.view==='cabin'){this.view='exterior';this.bonnet.setOpen(false);}
  if(next.zone==='engine'){this.view='engine';this.bonnet.setOpen(true);}
  if(previousView!==this.view)this.home();
  this.visibility();
  next.mesh.traverse(m=>{if(!m.isMesh)return;const highlight=this.originals.get(m).clone();highlight.emissive?.set('#dc7336');highlight.emissiveIntensity=.20;m.material=highlight;this.highlights.push(highlight);});
  this.$('partCategory').textContent=next.category;this.$('partName').textContent=next.name;this.$('partDescription').textContent=next.description;
  this.$('partEvidence').textContent=next.evidence||(next.mapped?'Identified from artist geometry':'Component identity unverified');
  this.$('partReference').hidden=!next.reference;if(next.reference)this.$('partReference').href=next.reference;
  this.$('partDetail').hidden=false;this.renderList();
 }
 focus(){
  if(!this.selected)return;this.selected.mesh.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(this.selected.mesh),centre=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).length();
  const direction=this.camera.position.clone().sub(this.controls.target).normalize();this.controls.target.copy(centre);this.camera.position.copy(centre).addScaledVector(direction,Math.max(.6,size*1.9));this.controls.update();
  document.querySelectorAll('[data-camera]').forEach(b=>b.classList.remove('active'));
 }
 renderList(){
  const query=this.$('partSearch').value.toLowerCase().trim(),entries=this.entries.filter(e=>query?(e.name+' '+e.category+' '+(e.service?'service '+e.service:'')).toLowerCase().includes(query):e.zone===this.view&&e.mapped);
  this.$('partCount').textContent=entries.length+(entries.length===1?' component':' components')+(query?' found':'');
  this.$('partList').replaceChildren(...entries.map(entry=>{const b=document.createElement('button');b.textContent=entry.name;b.classList.toggle('selected',entry===this.selected);b.setAttribute('aria-pressed',String(entry===this.selected));b.onclick=()=>{this.select(entry.mesh);this.focus();};return b;}));
  if(!entries.length)this.$('partCount').textContent='No matching component. Try another name.';
 }
}
