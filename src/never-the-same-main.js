import {HatchRenderer,hexColor} from './hatch-renderer.js';
import {generateNeverSame,filterNeverSameScene} from './never-the-same-geometry.js';

const $=id=>document.getElementById(id);
const canvas=$('canvas');
let renderer;
try {
  renderer=new HatchRenderer(canvas,{background:'#e9e8d7',occlusion:true,
    lineWidth:.25,spacing:.6,color:'#42544b',occlusionCellSize:2});
}catch(error){
  $('error').hidden=false;$('error').textContent='WebGL2 is required: '+error.message;
  throw error;
}
let schedule,densitySchedule,frame=false,stats={},visibleStats={},seed=2611,scene=[],source=null;
const num=id=>Number($(id).value);
const format=(v,id)=>id==='angleJitter'?v.toFixed(1)+'°':id==='width'||id==='spacing'||id==='placementJitter'?v.toFixed(2):id==='lengthJitter'?v+'%':String(v);
const hatchControls=['spacing','width','angleJitter','placementJitter','lengthJitter'];
const densityControls=['plantDensity','grassDensity'];
function updateDensityOutputs(){
  for(const id of densityControls){
    const total=id==='plantDensity'?stats.plants:stats.grass;
    $(id+'Out').textContent=Number.isFinite(total)
      ?Math.round(total*num(id)/100).toLocaleString()+' / '+total.toLocaleString()
      :num(id)+'%';
  }
}
function applyDensity(){
  const selection=filterNeverSameScene(source,{
    plants:num('plantDensity'),grass:num('grassDensity')});
  visibleStats=selection.stats;
  renderer.setScene(selection.scene);
  if(renderer.occlusion&&renderer.stats.algorithm!=='boolean/full-width')
    throw new Error('CPU boolean clipping is required');
  setStats();renderLater();
}
for(const id of densityControls){
  const el=$(id);
  el.addEventListener('input',()=>{
    updateDensityOutputs();clearTimeout(densitySchedule);
    densitySchedule=setTimeout(()=>attempt(applyDensity),160);
  });
  el.addEventListener('change',()=>{
    updateDensityOutputs();clearTimeout(densitySchedule);attempt(applyDensity);
  });
}
updateDensityOutputs();
function updateHatches(){
  // Change hatch density without regenerating the original scene geometry.
  const spacing=num('spacing'),width=num('width');
  for(const object of scene)if(object.hatch){
    object.hatch.spacing=spacing*(object.hatch.spacingScale??1);
    object.hatch.lineWidth=width*(object.hatch.lineWidthScale??1);
  }
  renderer.setStyle(style());
  setStats();renderLater();
}
for(const id of hatchControls){
  const el=$(id),out=$(id+'Out');
  const update=()=>{out.textContent=format(num(id),id);};
  update();
  el.addEventListener('input',()=>{
    update();clearTimeout(schedule);
    schedule=setTimeout(()=>attempt(updateHatches),160);
  });
  el.addEventListener('change',()=>{
    clearTimeout(schedule);attempt(updateHatches);
  });
}
function style(){
  return {lineWidth:num('width'),spacing:num('spacing'),angleJitter:num('angleJitter'),
    placementJitter:num('placementJitter'),lengthJitter:num('lengthJitter')};
}
function setStats(){
  $('stats').textContent=`${visibleStats.plants??0} PLANTS · ${visibleStats.grass??0} GRASS · ${renderer.stats.polygons.toLocaleString()} POLYGONS · ${renderer.stats.strokes.toLocaleString()} MARKS`;
}
function renderLater(){
  if(frame)return;frame=true;requestAnimationFrame(()=>{
    frame=false;renderer.render();$('zoom').textContent=Math.round(renderer.camera.zoom*100)+'%';
  });
}
// The 2025 artwork uses a fixed 75×75 orthographic canvas, independent
// of outlier plants' bounding boxes. Fit that square rather than shrinking
// the field to contain every projected leaf or stem.
function fitOriginal(padding=38){
  const w=Math.max(1,canvas.clientWidth-2*padding);
  const h=Math.max(1,canvas.clientHeight-2*padding);
  renderer.camera.x=0;
  renderer.camera.y=0;
  renderer.camera.zoom=Math.max(.05,Math.min(30,Math.min(w,h)/75));
}
function rebuild({fit=false}={}){
  $('error').hidden=true;
  $('stats').textContent='Constructing the original 3,600-position meadow…';
  const geometry=generateNeverSame({seed,spacing:num('spacing'),width:num('width')});
  source=geometry;stats=geometry.stats;scene=geometry.scene;
  updateDensityOutputs();
  renderer.background=hexColor(geometry.background);
  renderer.setStyle(style());
  applyDensity();
  if(fit)fitOriginal(38);
}
function attempt(fn){
  try{fn()}catch(e){console.error(e);$('error').hidden=false;$('error').textContent=e.message;throw e;}
}
$('occlusion').addEventListener('change',e=>attempt(()=>{
  renderer.setOcclusion(e.target.checked);setStats();renderLater();
}));
$('outlines').addEventListener('change',e=>{renderer.showOutlines=e.target.checked;renderLater();});
$('generate').addEventListener('click',()=>{
  seed=(seed+7919)>>>0;
  $('stats').textContent='Regenerating original meadow…';
  requestAnimationFrame(()=>attempt(()=>rebuild({fit:true})));
});
$('fit').addEventListener('click',()=>{fitOriginal(38);renderLater();});
const pointers=new Map();
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});});
canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;
  const before=[...pointers.values()],old=pointers.get(e.pointerId);
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const now=[...pointers.values()];
  if(now.length===1){
    renderer.camera.x-=(e.clientX-old.x)/renderer.camera.zoom;
    renderer.camera.y-=(e.clientY-old.y)/renderer.camera.zoom;
  }else if(now.length===2&&before.length===2){
    const middle=p=>[(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2];
    const previous=middle(before),next=middle(now);
    renderer.camera.x-=(next[0]-previous[0])/renderer.camera.zoom;
    renderer.camera.y-=(next[1]-previous[1])/renderer.camera.zoom;
    const distance=p=>Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
    const oldDist=distance(before);
    if(oldDist>3)renderer.zoomAt(distance(now)/oldDist,next[0],next[1]);
  }
  renderLater();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
canvas.addEventListener('wheel',e=>{e.preventDefault();renderer.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);renderLater();},{passive:false});
window.addEventListener('resize',renderLater);
attempt(()=>rebuild({fit:true}));
