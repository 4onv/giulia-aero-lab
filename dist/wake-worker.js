let engine,mask,paused=true,generation=0,timer,ready=false;
async function initialize(data){
 const token=++generation;paused=!!data.paused;ready=false;engine=null;clearTimeout(timer);
 const response=await fetch('./assets/lbm.wasm');if(!response.ok)throw Error('Viscous solver is unavailable');
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer());if(token!==generation)return;
 engine=instance.exports;mask=data.mask;const grid=data.grid;
 new Uint8Array(engine.memory.buffer,engine.mask_ptr(),mask.length).set(mask);engine.set_ramp(1);
 const angle=data.yaw*Math.PI/180;
 if(!engine.init(grid.nx,grid.ny,grid.nz,.06*Math.cos(angle),.06*Math.sin(angle),.5+3*.06*(4.676282/grid.h)/500))throw Error('Invalid solver dimensions');
 ready=true;if(!paused)run(token);
}
function run(token){
 if(token!==generation||paused)return;
 try{
  if(engine.advance(4)<0)throw Error('The experimental solver became unstable. Return to ideal flow or restart.');
  postMessage({type:'progress',steps:engine.step_count()});
  if(engine.step_count()%40===0){engine.snapshot();const data=new Float32Array(engine.memory.buffer,engine.output_ptr(),mask.length*4).slice();postMessage({type:'frame',steps:engine.step_count(),data},[data.buffer]);}
  if(engine.step_count()>=2000){paused=true;postMessage({type:'complete'});return;}
  timer=setTimeout(()=>run(token),0);
 }catch(error){paused=true;postMessage({type:'error',message:error.message});}
}
onmessage=({data})=>{if(data.type==='start')initialize(data).catch(error=>postMessage({type:'error',message:error.message}));if(data.type==='pause'){paused=true;clearTimeout(timer);}if(data.type==='resume'&&paused){paused=false;if(ready&&engine.step_count()<2000)run(generation);}};

