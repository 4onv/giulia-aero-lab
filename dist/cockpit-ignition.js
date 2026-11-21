import { createEngineSound } from './engine-sound.js';

export function mountIgnition(details) {
  const panel=document.getElementById('cockpitIgnition');
  const toggle=document.getElementById('ignitionToggle');
  const throttle=document.getElementById('revEngine');
  const status=document.getElementById('ignitionStatus');
  const readout=document.getElementById('cockpitRPM');
  const viewHint=document.getElementById('viewHint');
  const driverHint='Press the red steering-wheel button to start or stop the V6.';
  let previousHint='';
  let driverView=false, phase='off', attempt=0, displayedRPM=0;

  function showPhase(next) {
    phase=next;
    details.setIgnition(next);
    toggle.textContent=next==='off'?'Start engine':next==='starting'?'Cancel start':'Stop engine';
    status.textContent=next==='off'?'Engine off':next==='starting'?'Starting engine…':'Engine running';
    throttle.disabled=next!=='running';
  }
  function showRPM(rpm) {
    details.setRPM(rpm);
    const rounded=Math.round(rpm/10)*10;
    if(rounded!==displayedRPM){
      displayedRPM=rounded;
      readout.textContent=rounded.toLocaleString('en-US')+' rpm';
    }
  }
  const engine=createEngineSound({onChange:showPhase,onRPM:showRPM});
  function stop() {
    attempt++;
    engine.stop();
  }
  async function operate() {
    if(!driverView||document.hidden)return;
    if(phase!=='off'){stop();return;}
    const current=++attempt;
    const started=await engine.start().catch(()=>false);
    if(!started&&current===attempt&&driverView){
      showPhase('off');
      status.textContent='Engine sound unavailable. Try again.';
    }
  }
  toggle.addEventListener('click',operate);
  throttle.addEventListener('click',()=>{if(driverView&&phase==='running')engine.rev();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',event=>{
    stop();
    if(!event.persisted)engine.dispose();
  });
  return {
    setDriverView(inside) {
      if(inside===driverView)return;
      driverView=inside;
      panel.hidden=!inside;
      if(inside){previousHint=viewHint.textContent;viewHint.textContent=driverHint;}
      else{
        if(viewHint.textContent===driverHint)viewHint.textContent=previousHint;
        stop();
      }
    },
    pick(mesh) {
      if(!driverView||!mesh.material.userData?.ignitionSwitch)return false;
      operate();
      return true;
    },
  };
}
