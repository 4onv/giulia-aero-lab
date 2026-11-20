// The two virtual anemometers stay fixed in vehicle coordinates across runs.
const sensors = [
  { key: 'roof', name: 'Above roof', position: [0, 1.60, 0] },
  { key: 'tail', name: 'Behind boot', position: [2.75, .75, 0] },
];

export function tunnelReading(field, speed) {
  if (!field || field.experimental) return null;
  const yaw = Math.round(Math.atan2(field.sin, field.cos) * 180 / Math.PI);
  const result = { speed, yaw, pressure: .5 * 1.225 * (speed / 3.6) ** 2 };
  for (const sensor of sensors) {
    const velocity = field.sample(...sensor.position);
    result[sensor.key] = velocity ? Math.hypot(...velocity) * speed : null;
  }
  return result;
}

const rows = [
  ['speed', 'Inlet', 'km/h', 0],
  ['yaw', 'Yaw', '°', 0],
  ['pressure', 'Dynamic pressure', 'Pa', 0],
  ...sensors.map(({ key, name }) => [key, name, 'km/h', 1]),
];

function number(value, places, signed = false) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(places));
  return (signed && rounded > 0 ? '+' : '') + rounded.toFixed(places).replace('-', '−');
}

export function mountComparison(panel) {
  const pin = panel.querySelector('[data-pin]');
  const clear = panel.querySelector('[data-clear]');
  const table = panel.querySelector('table');
  const hint = panel.querySelector('p');
  const body = table.tBodies[0];
  let reference = null;
  let current = null;
  let pending = false;

  const cells = rows.map(([, name, unit]) => {
    const row = body.insertRow();
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = name + ' ';
    const measure = document.createElement('small');
    measure.textContent = unit;
    label.append(measure);
    row.append(label);
    return [row.insertCell(), row.insertCell(), row.insertCell()];
  });

  function render() {
    pin.disabled = !current || pending;
    clear.hidden = !reference;
    pin.textContent = reference ? 'Replace reference' : 'Pin this run';
    table.hidden = !current || !reference;
    if (!current) {
      hint.textContent = 'Available in potential flow. A pinned run stays here while you use the viscous study.';
      return;
    }
    hint.textContent = reference
      ? 'Fixed probes at roof centre (1.60 m high) and behind the boot (x 2.75 m, y 0.75 m).'
      : 'Pin the current wind settings, then change speed or yaw to compare both runs.';
    if (!reference) return;
    rows.forEach(([key, , , places], i) => {
      const previous = reference[key], live = current[key];
      const change = previous === null || live === null ? null : live - previous;
      cells[i][0].textContent = number(previous, places);
      cells[i][1].textContent = pending ? '…' : number(live, places);
      cells[i][2].textContent = pending ? '…' : number(change, places, true);
    });
  }
  pin.addEventListener('click', () => {
    if (!current || pending) return;
    reference = { ...current };
    render();
  });
  clear.addEventListener('click', () => {
    reference = null;
    render();
    pin.focus();
  });
  return (reading, requestedYaw) => {
    current = reading;
    pending = current !== null && current.yaw !== requestedYaw;
    render();
  };
}
