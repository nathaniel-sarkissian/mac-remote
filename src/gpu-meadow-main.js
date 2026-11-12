import {GpuMeadow,GPU_MEADOW_SPEC} from './gpu-meadow.js';
import {bindOrbitControls} from './gpu-orbit-camera.js';
const $=id=>document.getElementById(id);
let gpu;
try{
  gpu=new GpuMeadow($('canvas'));
}catch(error){
  $('error').hidden=false;
  $('error').textContent='Could not initialize GPU-generated meadow: '+error.message;
  throw error;
}
let seed=2611,last=0,frames=0,sampleStart=0,fps=0;
const plant=$('plantDensity'),grass=$('grassDensity'),animate=$('animate');
const layerMode=$('layerMode'),visibleFlowers=$('visibleFlowers');
const canvas=$('canvas');
let dirty=true,rendered=0,lastResult=null,windowWidth=0,windowHeight=0;
function invalidate(){dirty=true;}
function sceneParts(){
  return ({all:null,flowers:[3,4],plants:[1,2,3,4],grass:[0]})[layerMode.value]??null;
}
function renderOptions(){
  return {seed,plants:Number(plant.value),grass:Number(grass.value),
    onlyParts:sceneParts(),flowersForeground:visibleFlowers.checked};
}
// Dedicated QA view exposes the *rendered canvas*, rather than screenshotting
// only the controls above it on a phone-sized browser viewport.
const urlOptions=new URLSearchParams(window.location.search);
if(urlOptions.has('focus'))document.documentElement.classList.add('scene-focus');
if(['all','flowers','plants','grass'].includes(urlOptions.get('layer')))
  layerMode.value=urlOptions.get('layer');
if(urlOptions.has('userView')){
  gpu.camera.yaw=185*Math.PI/180;
  gpu.camera.pitch=30*Math.PI/180;
  gpu.camera.zoom=.77;
}
function updateCameraStatus(){
  $('cameraStatus').textContent=
    'AZ '+Math.round(((gpu.camera.yaw*180/Math.PI)%360+360)%360)+'° · '+
    'EL '+Math.round(gpu.camera.pitch*180/Math.PI)+'° · '+
    'ZOOM '+Math.round(gpu.camera.zoom*100)+'%';
}
bindOrbitControls(canvas,gpu.camera,()=>{
  updateCameraStatus();invalidate();
});
$('resetView').addEventListener('click',()=>{
  gpu.camera.reset();
  updateCameraStatus();invalidate();
});
window.addEventListener('resize',invalidate);
for(const control of [layerMode,visibleFlowers,animate])
  control.addEventListener('change',invalidate);
updateCameraStatus();
function controls(){
  $('plantDensityOut').textContent=plant.value+'%';
  $('grassDensityOut').textContent=grass.value+'%';
}
for(const input of [plant,grass])input.addEventListener('input',()=>{
  controls();invalidate();
});
controls();
$('regenerate').addEventListener('click',()=>{
  seed=1+Math.floor(Math.random()*100000);
  $('seed').textContent=String(seed);invalidate();
});
$('seed').textContent=String(seed);
$('backend').textContent='WEBGL2 / ORIGINAL 3D GEOMETRY';
$('geometry').textContent=GPU_MEADOW_SPEC.plants.toLocaleString()+' PLANT INSTANCES · '+GPU_MEADOW_SPEC.grassAttempts.toLocaleString()+' GRASS ATTEMPTS · '+GPU_MEADOW_SPEC.flowerSpecies+' SOURCE SPECIES · 0 CPU POLYGONS';
function loop(now){
  // A reference seed is stable by default. Do not rebuild its 3600-site
  // GPU attributes, 46800 stem joints, or 1.9M draw vertices 60x/second.
  // This prevents integrated laptop GPUs from being overloaded so severely
  // that only the initial grass draw can be presented.
  if(animate.checked){seed=(seed+1)%100000;invalidate();}
  if(canvas.clientWidth!==windowWidth||canvas.clientHeight!==windowHeight){
    windowWidth=canvas.clientWidth;windowHeight=canvas.clientHeight;invalidate();
  }
  if(dirty){
    try{
      lastResult=gpu.render(renderOptions());
      rendered++;
      dirty=false;
      $('gpuErrors').textContent=lastResult.glErrors.join(', ')||'No WebGL draw errors';
    }catch(error){
      $('error').hidden=false;
      $('error').textContent='GPU render failed: '+error.message;
      dirty=false;
    }
  }
  if(!sampleStart)sampleStart=now;
  if(now-sampleStart>=600){
    $('fps').textContent=animate.checked?
      (rendered*1000/(now-sampleStart)).toFixed(1)+' FPS':'STATIC';
    rendered=0;sampleStart=now;
    if(lastResult){
      $('cpu').textContent=lastResult.cpuMs.toFixed(2)+' ms last draw';
      $('gpu').textContent=lastResult.gpuMs===null?
        'GPU timer unavailable':lastResult.gpuMs.toFixed(2)+' ms GPU';
      $('triangles').textContent=lastResult.triangles.toLocaleString()+
        ' TRIANGLES · '+lastResult.mode+
        (lastResult.rebuiltScene?' · NEW SEED':' · GPU ATLAS REUSED');
    }
    $('seed').textContent=String(seed);
  }
  requestAnimationFrame(loop);
}
// CI smoke mode renders one GPU-generated frame and checks actual shader output.
// Pixel-level smoke verification is isolated to ?smoke=1. The production
// render loop does not read pixels back from the GPU.
function countWarmFlowerPixels(){
  const gl=gpu.gl,px=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,px);
  let flowers=0;
  for(let i=0;i<px.length;i+=4){
    const r=px[i],g=px[i+1],b=px[i+2];
    if(r>160&&r>g*1.17&&b<g*.85)flowers++;
  }
  return flowers;
}
// This test samples only the isolated flower batch. It cannot pass because
// grass is yellow or leaves are warm-colored; an absent head draws 0 pixels.
function measureFlowerOnly(seedValue){
  gpu.render({seed:seedValue,plants:100,grass:0,onlyPart:3});
  const bg=gpu.gl.getParameter(gpu.gl.COLOR_CLEAR_VALUE);
  const bytes=new Uint8Array(canvas.width*canvas.height*4);
  gpu.gl.readPixels(0,0,canvas.width,canvas.height,gpu.gl.RGBA,gpu.gl.UNSIGNED_BYTE,bytes);
  const rgb=[bg[0]*255,bg[1]*255,bg[2]*255];
  let colored=0,minX=canvas.width,maxX=-1;
  for(let i=0;i<bytes.length;i+=4){
    if(Math.max(Math.abs(bytes[i]-rgb[0]),Math.abs(bytes[i+1]-rgb[1]),
      Math.abs(bytes[i+2]-rgb[2]))>45){
      colored++;
      const x=(i/4)%canvas.width;
      minX=Math.min(minX,x);
      maxX=Math.max(maxX,x);
    }
  }
  return {colored,spanPx:maxX<0?0:maxX-minX+1};
}
if(urlOptions.has('smoke')){
  // Draw the actual full scene, then a grass-free plant-only scene. A renderer
  // that displays only grass now fails deployment instead of reporting READY.
  gpu.render({seed,plants:100,grass:100});
  const fullBlooms=countWarmFlowerPixels();
  gpu.render({seed,plants:100,grass:0});
  const bareBlooms=countWarmFlowerPixels();
  const heads=measureFlowerOnly(seed);
  $('flowerOnlyPixels').textContent=heads.colored+' FLOWER-ONLY';
  $('flowerSpanPixels').textContent=heads.spanPx+' PX SPAN';
  $('bloomPixels').textContent=fullBlooms+' FULL / '+bareBlooms+' NO-GRASS';
  if(fullBlooms<16||bareBlooms<16||heads.colored<250||
      (gpu.compact&&heads.spanPx<canvas.width*.32))
    throw new Error('GPU blossom coverage regression: '+
      $('flowerOnlyPixels').textContent+' / '+$('flowerSpanPixels').textContent);
  if(!urlOptions.has('userView')){
    gpu.camera.orbit(60,-35);
    gpu.camera.pan(30,-15,canvas.clientWidth,canvas.clientHeight);
    gpu.camera.zoomAt(1.25,canvas.clientWidth*.6,canvas.clientHeight*.4,
      canvas.clientWidth,canvas.clientHeight);
  }
  updateCameraStatus();
  // Snapshot mode leaves ONLY the verified blossom batch on the canvas.
  // A flower-only PNG proves there are recognizable heads, not merely yellow
  // grass/foliage. Normal playback and ordinary smoke render the full scene.
  const headsOnly=urlOptions.has('headsOnly');
  const result=gpu.render(headsOnly?
    {seed,plants:100,grass:0,onlyParts:[3,4],flowersForeground:true}:
    renderOptions());
  $('triangles').textContent=result.triangles.toLocaleString()+
    ' GENERATED TRIANGLES / FRAME · '+result.ringPoints+' RING POINTS';
  $('cpu').textContent=result.cpuMs.toFixed(2)+' ms CPU submission';
  $('gpuErrors').textContent=result.glErrors.join(', ')||'No WebGL draw errors';
  $('backend').textContent+=' / READY';
}else requestAnimationFrame(loop);
