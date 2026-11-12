import { HatchRenderer } from './hatch-renderer.js';
import { generateMeadow } from './meadow-scene.js';

const $ = id => document.getElementById(id);
const canvas = $('canvas');
const DEFAULT_HATCH = Object.freeze({
  angle:32, angleSpread:18, angleJitter:0.5, placementJitter:0.2,
  lengthJitter:7, connectZigzag:false, spacing:2.9, lineWidth:1.1,
  color:'#455548', colors:true,
});
let renderer;
try {
  renderer = new HatchRenderer(canvas, {background:'#f7f5ec',occlusion:true,
    angle:32,spacing:2.9,lineWidth:1.1,color:'#455548'});
} catch(error) {
  $('error').hidden = false;
  $('error').textContent = `Cannot create WebGL2 renderer: ${error.message}`;
  throw error;
}
renderer.showOutlines = true;
let seed = 2611;
let actualGrassCount = 0;
let frameRequested = false;
let debounce;
const rangeIds = ['flowers','petals','size','stemAngleAmplitude','stemNoiseScale','slope','noiseScale','noiseAmplitude',
  'grassCount','grassHeight','grassNoiseScale','grassNoiseAmplitude','elevation','yaw','angle','angleSpread',
  'angleJitter','placementJitter','lengthJitter','spacing','lineWidth'];
const geometryRanges = new Set(['flowers','petals','size','stemAngleAmplitude','stemNoiseScale','slope','noiseScale','noiseAmplitude',
  'grassCount','grassHeight','grassNoiseScale','grassNoiseAmplitude','elevation','yaw','angle','angleSpread']);
const format = (id, n) => {
  switch(id) {
    case 'flowers': case 'petals': case 'grassCount': return String(n);
    case 'elevation': case 'yaw': case 'angle': case 'angleSpread': case 'stemAngleAmplitude': return `${n}°`;
    case 'angleJitter': return `${n.toFixed(1)}°`;
    case 'size': return `${n.toFixed(2)}×`;
    case 'slope': return `${n}%`;
    case 'noiseScale': case 'noiseAmplitude': case 'grassHeight': case 'grassNoiseScale': case 'stemNoiseScale': return `${n} units`;
    case 'grassNoiseAmplitude': return `${Math.round(n*100)}%`;
    case 'lengthJitter': return `${n}%`;
    default: return n.toFixed(1);
  }
};
const num = id => Number($(id).value);
function updateStats(elapsed) {
  $('seed-label').textContent = `SEED ${seed}`;
  $('stats').textContent = `${actualGrassCount.toLocaleString()} GRASS   ·   ${renderer.stats.polygons.toLocaleString()} POLYGONS   ·   ${renderer.stats.strokes.toLocaleString()} VISIBLE MARKS   ·   ${renderer.occlusion ? 'CPU BOOLEAN CLIP' : 'CLIPPING OFF'}   ·   ${elapsed.toFixed(0)} MS`;
}
function draw() {
  frameRequested = false;
  renderer.render();
  $('zoom-label').textContent = `${Math.round(renderer.camera.zoom*100)}%`;
}
function redraw() {
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(draw);
}
function hatchStyle() {
  return {
    angle:num('angle'), angleJitter:num('angleJitter'),
    placementJitter:num('placementJitter'), lengthJitter:num('lengthJitter'),
    connectZigzag:$('zigzag').checked, spacing:num('spacing'),
    lineWidth:num('lineWidth'), color:$('ink').value,
  };
}
function applyStyle() {
  const started = performance.now();
  renderer.setStyle(hatchStyle());
  updateStats(performance.now()-started);
  redraw();
}
function rebuild({fit=false}={}) {
  clearTimeout(debounce);
  const started = performance.now();
  const {scene,grass} = generateMeadow({
    count:num('flowers'), petals:num('petals'), seed,
    elevation:num('elevation'), yaw:num('yaw'),
    size:num('size'), angle:num('angle'), angleSpread:num('angleSpread'),
    stemAngleAmplitude:num('stemAngleAmplitude'), stemNoiseScale:num('stemNoiseScale'),
    slope:num('slope')/100, noiseScale:num('noiseScale'),
    noiseAmplitude:num('noiseAmplitude'),
    grassCount:num('grassCount'),grassHeight:num('grassHeight'),
    grassNoiseScale:num('grassNoiseScale'),grassNoiseAmplitude:num('grassNoiseAmplitude'),
    colors:$('depth-colors').checked,
  });
  // The source polygon styles do not override the renderer hatch settings.
  renderer.setScene(scene);
  // Meadow must never fall back to the old GPU silhouette/depth mask: it
  // diagonally cuts wide grass hatches instead of giving them square ends.
  if (renderer.occlusion && renderer.stats.algorithm !== 'boolean/full-width') {
    throw new Error('Meadow requires full-width CPU boolean stroke clipping');
  }
  actualGrassCount = grass.length;
  if(fit)renderer.fit(35);
  updateStats(performance.now()-started);
  redraw();
}
function scheduleRebuild(fit=false) {
  clearTimeout(debounce);
  debounce = setTimeout(()=>rebuild({fit}),85);
}
for(const id of rangeIds) {
  const input=$(id);
  input.addEventListener('input',()=>{
    $(id+'-value').textContent = format(id,num(id));
    if(geometryRanges.has(id))scheduleRebuild(['flowers','petals','size','stemAngleAmplitude','stemNoiseScale','slope','noiseScale','noiseAmplitude',
      'grassCount','grassHeight','grassNoiseScale','grassNoiseAmplitude','elevation','yaw'].includes(id));
    else applyStyle();
  });
  // Finish a dragged geometry slider immediately, without a second delayed update.
  if(geometryRanges.has(id))input.addEventListener('change',()=>rebuild({
    fit:['flowers','petals','size','stemAngleAmplitude','stemNoiseScale','slope','noiseScale','noiseAmplitude',
      'grassCount','grassHeight','grassNoiseScale','grassNoiseAmplitude','elevation','yaw'].includes(id),
  }));
  $(id+'-value').textContent=format(id,num(id));
}
$('zigzag').addEventListener('change',applyStyle);
$('depth-colors').addEventListener('change',()=>rebuild());
$('ink').addEventListener('change',()=>{
  // Picking a custom ink switches from botanical palette to monochrome.
  if($('depth-colors').checked) {
    $('depth-colors').checked=false;
    renderer.setStyle({color:$('ink').value});
    rebuild();
  } else applyStyle();
});
$('occlusion').addEventListener('change',e=>{
  const started=performance.now();
  renderer.setOcclusion(e.target.checked);
  updateStats(performance.now()-started);
  redraw();
});
$('outlines').addEventListener('change',e=>{
  renderer.showOutlines=e.target.checked;
  redraw();
});
$('reset-hatch').addEventListener('click',()=>{
  for (const id of ['angle','angleSpread','angleJitter','placementJitter','lengthJitter','spacing','lineWidth']){
    $(id).value=DEFAULT_HATCH[id];
    $(id+'-value').textContent=format(id,DEFAULT_HATCH[id]);
  }
  $('ink').value=DEFAULT_HATCH.color;
  $('zigzag').checked=DEFAULT_HATCH.connectZigzag;
  $('depth-colors').checked=DEFAULT_HATCH.colors;
  renderer.setStyle(hatchStyle());
  rebuild();
});
$('regenerate').addEventListener('click',()=>{seed+=7919;rebuild({fit:true});});
renderer.setStyle(hatchStyle());
$('fit').addEventListener('click',()=>{renderer.fit(35);redraw();});
const mid = () => {const r=canvas.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];};
$('plus').addEventListener('click',()=>{renderer.zoomAt(1.22,...mid());redraw();});
$('minus').addEventListener('click',()=>{renderer.zoomAt(1/1.22,...mid());redraw();});
// Consistent mouse, touch and pen camera manipulation, without regenerating geometry.
const pointers=new Map();
canvas.addEventListener('pointerdown',e=>{
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const previous=[...pointers.values()];
  const old=pointers.get(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const current=[...pointers.values()];
  if(current.length===1){
    renderer.camera.x-=(e.clientX-old.x)/renderer.camera.zoom;
    renderer.camera.y-=(e.clientY-old.y)/renderer.camera.zoom;
  }else if(current.length===2&&previous.length===2){
    const center=a=>[(a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2];
    const before=center(previous),after=center(current);
    const distance=a=>Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);
    renderer.camera.x-=(after[0]-before[0])/renderer.camera.zoom;
    renderer.camera.y-=(after[1]-before[1])/renderer.camera.zoom;
    const prevDistance=distance(previous);
    if(prevDistance>2)renderer.zoomAt(distance(current)/prevDistance,after[0],after[1]);
  }
  redraw();
});
function end(e){pointers.delete(e.pointerId);if(!pointers.size)canvas.classList.remove('dragging');}
canvas.addEventListener('pointerup',end);
canvas.addEventListener('pointercancel',end);
canvas.addEventListener('lostpointercapture',end);
canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  renderer.zoomAt(Math.exp(-e.deltaY*.0012),e.clientX,e.clientY);
  redraw();
},{passive:false});
window.addEventListener('resize',redraw);
rebuild({fit:true});
