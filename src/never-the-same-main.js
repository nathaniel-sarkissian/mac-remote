import {HatchRenderer,hexColor} from './hatch-renderer.js';
import {generateNeverSame} from './never-the-same-geometry.js';

const $=id=>document.getElementById(id);
const canvas=$('canvas');
let renderer;
try {
  renderer=new HatchRenderer(canvas,{background:'#e9e8d7',occlusion:true,
    lineWidth:.35,spacing:.8,color:'#42544b'});
}catch(error){
  $('error').hidden=false;$('error').textContent='WebGL2 is required: '+error.message;
  throw error;
}
let schedule,frame=false,stats={};
const num=id=>Number($(id).value);
const format=(v,id)=>id==='angleJitter'?v.toFixed(1)+'°':id==='width'||id==='spacing'||id==='placementJitter'||id==='height'?v.toFixed(2):id==='lengthJitter'?v+'%':String(v);
for(const id of ['grid','grass','height','spacing','width','angleJitter','placementJitter','lengthJitter']){
  const el=$(id),out=$(id+'Out');
  const update=()=>{out.textContent=format(num(id),id);};
  update();
  el.addEventListener('input',()=>{
    update();
    clearTimeout(schedule);
    if(id==='width'||id==='angleJitter'||id==='placementJitter'||id==='lengthJitter'){
      schedule=setTimeout(()=>{renderer.setStyle(style());renderLater();setStats();},110);
    }else schedule=setTimeout(()=>rebuild(),110);
  });
  el.addEventListener('change',()=>{
    clearTimeout(schedule);
    if(id==='width'||id==='angleJitter'||id==='placementJitter'||id==='lengthJitter'){
      renderer.setStyle(style());renderLater();setStats();
    }else rebuild();
  });
}
function style(){
  return {lineWidth:num('width'),spacing:num('spacing'),angleJitter:num('angleJitter'),
    placementJitter:num('placementJitter'),lengthJitter:num('lengthJitter')};
}
function setStats(){
  $('stats').textContent=`${stats.plants??0} PLANTS · ${stats.grass??0} GRASS · ${renderer.stats.polygons.toLocaleString()} POLYGONS · ${renderer.stats.strokes.toLocaleString()} MARKS`;
}
function renderLater(){
  if(frame)return;frame=true;requestAnimationFrame(()=>{
    frame=false;renderer.render();$('zoom').textContent=Math.round(renderer.camera.zoom*100)+'%';
  });
}
// Original Never the Same uses a ~75-unit scene, much smaller than the
// Hatch Render test meadow. The shared fit() intentionally caps zoom at 3x,
// which makes these authentic plants tiny on desktop. Fit this page's
// coordinate scale directly without changing other demos' zoom behavior.
function fitOriginal(padding=38){
  const bounds=renderer.bounds;
  const w=Math.max(1,canvas.clientWidth-2*padding);
  const h=Math.max(1,canvas.clientHeight-2*padding);
  renderer.camera.x=(bounds.minX+bounds.maxX)*.5;
  renderer.camera.y=(bounds.minY+bounds.maxY)*.5;
  renderer.camera.zoom=Math.max(.05,Math.min(30,
    w/Math.max(1,bounds.maxX-bounds.minX),
    h/Math.max(1,bounds.maxY-bounds.minY)));
}
function rebuild({fit=false}={}){
  $('stats').textContent='Generating and clipping original geometry…';
  const seed=num('seed')>>>0;
  const geometry=generateNeverSame({seed,grid:num('grid'),grassPerPlant:num('grass'),
    plantScale:num('height'),palette:num('palette'),spacing:num('spacing')});
  stats=geometry.stats;
  renderer.background=hexColor(geometry.background);
  renderer.setStyle(style());
  renderer.setScene(geometry.scene);
  if(renderer.occlusion&&renderer.stats.algorithm!=='boolean/full-width')
    throw new Error('CPU boolean clipping is required');
  if(fit)fitOriginal(38);
  setStats();renderLater();
}
function attempt(fn){
  try{fn()}catch(e){console.error(e);$('error').hidden=false;$('error').textContent=e.message;throw e;}
}
$('seed').addEventListener('change',()=>attempt(()=>rebuild({fit:true})));
$('palette').addEventListener('change',()=>attempt(()=>rebuild()));
$('occlusion').addEventListener('change',e=>attempt(()=>{
  renderer.setOcclusion(e.target.checked);setStats();renderLater();
}));
$('outlines').addEventListener('change',e=>{renderer.showOutlines=e.target.checked;renderLater();});
$('generate').addEventListener('click',()=>attempt(()=>{
  $('seed').value=(num('seed')+7919)>>>0;rebuild({fit:true});
}));
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
