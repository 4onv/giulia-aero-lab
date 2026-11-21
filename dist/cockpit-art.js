import * as THREE from './vendor/three.module.js';

// Original instrument faces and controls for the educational cutaway.
function artwork(width, height, draw, luminous = false) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  if(luminous)return new THREE.MeshBasicMaterial({
    map, color:'#dbe0df', toneMapped:false, transparent:true, alphaTest:.06,
  });
  return new THREE.MeshStandardMaterial({
    map, roughness: luminous ? .31 : .57, metalness: .08,
    transparent: true, alphaTest: .06, depthWrite: true,
  });
}

function text(c, value, x, y, font, color = '#e2e5df', align = 'center') {
  c.fillStyle = color; c.font = font; c.textAlign = align;
  c.textBaseline = 'middle'; c.fillText(value, x, y);
}

export function instrumentDial(tach) {
  return artwork(512, 512, (c) => {
    c.translate(256, 256);
    const base = c.createRadialGradient(-40, -70, 15, 0, 0, 253);
    base.addColorStop(0,'#34383a'); base.addColorStop(.74,'#181c1f'); base.addColorStop(1,'#090b0e');
    c.fillStyle = base; c.beginPath(); c.arc(0,0,254,0,2*Math.PI); c.fill();
    for (const r of [240,222,138,131]) {
      c.strokeStyle = r === 222 ? '#54585a' : '#363b3d'; c.lineWidth = 2;
      c.beginPath(); c.arc(0,0,r,0,Math.PI*2); c.stroke();
    }
    const arc = unit => (135 + 270 * unit) * Math.PI / 180;
    const ticks = tach ? 40 : 80;
    for (let i=0; i<=ticks; i++) {
      const a = arc(i/ticks), major = i % (tach ? 5 : 10) === 0, half = i%5===0;
      const r = major ? 196 : half ? 203 : 212;
      c.strokeStyle = tach && i >= 34 ? '#cf554c' : '#d1d7d6'; c.lineWidth = major ? 5 : 2;
      c.beginPath(); c.moveTo(Math.cos(a)*r,Math.sin(a)*r); c.lineTo(Math.cos(a)*226,Math.sin(a)*226); c.stroke();
      if (major) text(c, String(tach ? i/5 : i*4),Math.cos(a)*168,Math.sin(a)*168,'italic 600 28px Arial');
    }
    text(c,tach?'RPM × 1000':'km/h',0,102,'18px Arial','#b4babd');
    text(c,tach?'GIRI':'VELOCITÀ',0,129,'12px Arial','#939da0');
    const needle = arc(tach ? .10 : 0);
    c.save(); c.rotate(needle); c.fillStyle='#e95340';
    c.beginPath(); c.moveTo(-35,-5); c.lineTo(202,-1); c.lineTo(202,1); c.lineTo(-35,5); c.fill(); c.restore();
    const hub=c.createLinearGradient(0,-19,0,19);hub.addColorStop(0,'#7e8484');hub.addColorStop(.3,'#242929');hub.addColorStop(1,'#0d1011');
    c.fillStyle=hub; c.beginPath(); c.arc(0,0,17,0,Math.PI*2); c.fill();
  },true);
}

export function clusterDisplay() {
  return artwork(384,320,(c,w,h)=>{
    c.fillStyle='#11181c'; c.fillRect(0,0,w,h);
    text(c,'P',34,32,'bold 29px Arial','#d8e0de'); text(c,'18.5°',344,32,'22px Arial','#d8e0de','right');
    c.fillStyle='#a73c30'; c.fillRect(23,57,w-46,3);
    text(c,'0',w/2,130,'300 94px Arial');text(c,'km/h',w/2,187,'21px Arial','#a5b1b1');
    c.fillStyle='#344044'; c.fillRect(35,236,140,7);c.fillRect(210,236,140,7);
    c.fillStyle='#b9c5c1';c.fillRect(35,236,64,7);c.fillRect(210,236,104,7);
    text(c,'50     °C     130',103,264,'16px Arial');text(c,'E            F',280,264,'16px Arial');
  },true);
}

export function navigationScreen() {
  return artwork(1000,350,(c,w,h)=>{
    c.fillStyle='#1b2327'; c.fillRect(0,0,w,h);
    c.save(); c.beginPath(); c.rect(248,0,752,350); c.clip();
    c.fillStyle='#2b3535';c.fillRect(248,0,752,350);
    c.fillStyle='#36453d';c.beginPath();c.moveTo(770,0);c.lineTo(920,0);c.lineTo(880,140);c.lineTo(805,206);c.lineTo(736,142);c.fill();
    c.translate(620,170); c.rotate(-.21); c.lineCap='round';
    for(let i=-7;i<=7;i++){
      c.strokeStyle='#495354';c.lineWidth=3;c.beginPath();c.moveTo(i*56,-260);c.bezierCurveTo(i*56+50,-80,i*56-35,70,i*56+15,260);c.stroke();
      c.beginPath();c.moveTo(-450,i*35);c.bezierCurveTo(-55,i*35+15,140,i*35-15,490,i*35+25);c.stroke();
    }
    for (const [color,lineWidth] of [['#151c20',15],['#a89870',8]]) {
      c.strokeStyle=color;c.lineWidth=lineWidth;c.beginPath();c.moveTo(-455,160);c.bezierCurveTo(-170,125,-100,55,32,4);c.bezierCurveTo(112,-24,105,-111,186,-250);c.stroke();
    }
    c.restore();text(c,'MONZA',542,89,'600 17px Arial','#9fa8a3');
    text(c,'PARCO',842,137,'16px Arial','#99a797');
    c.fillStyle='#db7867';c.beginPath();c.moveTo(647,147);c.lineTo(657,183);c.lineTo(645,176);c.lineTo(632,180);c.closePath();c.fill();
    c.fillStyle='#11171b';c.fillRect(0,0,248,h);
    text(c,'ALFA  CONNECT',27,42,'600 18px Arial','#c4cccd','left');
    text(c,'Navigation',27,120,'32px Arial','#f1f0e8','left');
    text(c,'Monza',27,176,'23px Arial','#b9c4c4','left');
    c.fillStyle='#a43c36';c.fillRect(0,88,5,59);c.fillStyle='#3b4446';c.fillRect(27,240,190,2);
    text(c,'100 m',783,310,'17px Arial','#e1e6df'); c.fillStyle='#d0d2c8';c.fillRect(820,308,98,3);
  },true);
}

export function steeringBadge() {
  return artwork(256,256,(c)=>{
    c.translate(128,128);
    for(const [r,fill] of [[125,'#c4c8c6'],[120,'#172c39'],[89,'#b7c1ba'],[84,'#e5e2d7']]){
      c.fillStyle=fill;c.beginPath();c.arc(0,0,r,0,2*Math.PI);c.fill();
    }
    const letters='ALFA ROMEO';c.save();c.rotate(-1.02);
    for(const ch of letters){text(c,ch,0,-103,'bold 20px Arial','#e0e3d7');c.rotate(.224)}c.restore();
    c.save();c.beginPath();c.arc(0,0,82,0,Math.PI*2);c.clip();
    c.fillStyle='#983124';c.fillRect(-50,-85,17,170);c.fillRect(-89,-19,88,17);
    c.fillStyle='#cad3c1';c.fillRect(0,-86,88,174);
    c.fillStyle='#26523c';c.beginPath();
    c.moveTo(18,-36);c.quadraticCurveTo(30,-48,50,-42);c.quadraticCurveTo(66,-35,61,-22);
    c.bezierCurveTo(59,-12,42,-8,31,-7);c.bezierCurveTo(20,-3,29,4,42,1);
    c.bezierCurveTo(70,-5,76,10,60,20);c.bezierCurveTo(52,27,33,23,33,30);
    c.bezierCurveTo(32,37,54,33,57,41);c.bezierCurveTo(62,54,36,63,11,60);
    c.bezierCurveTo(37,56,44,51,43,46);c.bezierCurveTo(42,42,18,46,19,31);
    c.bezierCurveTo(18,20,29,18,43,15);c.quadraticCurveTo(62,10,47,10);
    c.bezierCurveTo(14,16,3,-6,23,-18);c.quadraticCurveTo(54,-27,44,-30);
    c.lineTo(33,-28);c.lineTo(18,-24);c.lineTo(23,-29);c.lineTo(13,-30);c.closePath();c.fill();
    c.fillStyle='#b59450';c.beginPath();c.moveTo(28,-49);c.lineTo(22,-65);c.lineTo(33,-59);c.lineTo(38,-71);c.lineTo(45,-60);c.lineTo(54,-67);c.lineTo(51,-48);c.fill();
    c.fillStyle='#963b30';c.fillRect(13,-32,6,4);c.beginPath();c.arc(12,-35,3,0,2*Math.PI);c.fill();c.restore();
  });
}

export function vehicleScreen() {
  return artwork(1000,350,(c,w,h)=>{
    c.fillStyle='#182025';c.fillRect(0,0,w,h);
    c.fillStyle='#10171b';c.fillRect(0,0,248,h);
    text(c,'ALFA  CONNECT',27,42,'600 18px Arial','#c4cccd','left');
    text(c,'Vehicle',27,120,'32px Arial','#f1f0e8','left');
    text(c,'Quadrifoglio',27,176,'23px Arial','#b9c4c4','left');
    c.fillStyle='#a43c36';c.fillRect(0,88,5,59);
    text(c,'Vehicle information',294,66,'32px Arial','#e5e9e7','left');
    for(const [i,first,second] of [[0,'Transmission','P'],[1,'Drive mode','Natural'],[2,'Speed','0 km/h']]){
      const y=135+i*58;c.fillStyle='#354045';c.fillRect(292,y+27,638,1);
      text(c,first,294,y,'23px Arial','#aab9ba','left');
      text(c,second,931,y,'24px Arial','#e6ebe6','right');
    }
  },true);
}
