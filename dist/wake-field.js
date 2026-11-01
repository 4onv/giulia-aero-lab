import {FlowField} from './field.js';
export class WakeField extends FlowField {
 constructor(ideal,yaw){const n=ideal.solid.length;super(ideal.info,ideal.solid,new Float32Array(n*3),new Float32Array(n*3));this.cp=new Float32Array(n);this.experimental=true;this.steps=0;this.seedCos=Math.cos(yaw*Math.PI/180);this.seedSin=Math.sin(yaw*Math.PI/180);this.area=ideal.projectedArea();}
 update(data,steps){if(data.length!==this.solid.length*4)throw Error('Invalid wake snapshot');for(let p=0;p<this.solid.length;p++){this.x[3*p]=data[4*p]*this.scale;this.x[3*p+1]=data[4*p+1]*this.scale;this.x[3*p+2]=data[4*p+2]*this.scale;this.cp[p]=data[4*p+3];}this.steps=steps;}
 projectedArea(){return this.area;}
 pressureAt(px,py,pz){if(!this.sample(px,py,pz))return null;const {nx,ny,h,origin}=this.grid;const a=[px,py,pz].map((v,i)=>(v-origin[i])/h-.5),base=a.map(Math.floor),t=a.map((v,i)=>v-base[i]);let sum=0,weight=0;
 for(let z=0;z<2;z++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){const p=base[0]+x+nx*(base[1]+y+ny*(base[2]+z));if(this.solid[p])continue;const w=(x?t[0]:1-t[0])*(y?t[1]:1-t[1])*(z?t[2]:1-t[2]);sum+=w*this.cp[p];weight+=w;}return weight?sum/weight:null;}
 surface(point,normal){const s=super.surface(point,normal);if(s)s.cp=this.pressureAt(...s.position);return s;}
}
