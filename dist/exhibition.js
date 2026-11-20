export function mountExhibition(stage, controls) {
  const open = document.getElementById('enter-exhibition');
  const exit = document.getElementById('exit-exhibition');
  const orbit = document.getElementById('exhibit-orbit');
  const readout = document.getElementById('exhibit-reading');
  let active = false;

  function setOrbit(value) {
    controls.autoRotate = value;
    controls.autoRotateSpeed = .72;
    orbit.setAttribute('aria-pressed', String(value));
  }
  function show(value) {
    active = value;
    document.body.classList.toggle('exhibiting', active);
    document.getElementById('exhibit-rail').hidden = !active;
    if (!active) setOrbit(false);
    (active ? exit : open).focus({ preventScroll: true });
  }
  open.onclick = () => show(true);
  exit.onclick = () => show(false);
  orbit.onclick = () => setOrbit(!controls.autoRotate);
  stage.addEventListener('pointerdown', event => {
    if (active && !event.target.closest('button')) setOrbit(false);
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || document.querySelector('dialog[open]')) return;
    if (active && event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      show(false);
    } else if (event.key.toLowerCase() === 'h' && !open.disabled && !event.target.matches('input,textarea,select,[contenteditable=true]')) {
      event.preventDefault();
      show(!active);
    }
  }, true);

  return {
    get active() { return active; },
    ready() { open.disabled = false; },
    describe(mode, speed, yaw, viscous) {
      if (mode === 'inspect') readout.textContent = 'Vehicle study';
      else if (viscous) readout.textContent = 'Viscous study  /  Re 500';
      else readout.textContent = speed + ' km/h  /  ' + yaw + '° yaw';
    }
  };
}
