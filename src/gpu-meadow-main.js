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
const canvas=$('canvas');
// Dedicated QA view exposes the *rendered canvas*, rather than screenshotting
// only the controls above it on a phone-sized browser viewport.
const urlOptions=new URLSearchParams(window.location.search);
if(urlOptions.has('focus'))document.documentElement.classList.add('scene-focus');
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
bindOrbitControls(canvas,gpu.camera,updateCameraStatus);
$('resetView').addEventListener('click',()=>{
  gpu.camera.reset();
  updateCameraStatus();
});
updateCameraStatus();
function controls(){
  $('plantDensityOut').textContent=plant.value+'%';
  $('grassDensityOut').textContent=grass.value+'%';
}
for(const input of [plant,grass])input.addEventListener('input',controls);
controls();
$('regenerate').addEventListener('click',()=>{
  seed=1+Math.floor(Math.random()*100000);
  $('seed').textContent=String(seed);
});
$('seed').textContent=String(seed);
$('backend').textContent='WEBGL2 / VERTEX-SHADER GEOMETRY';
$('geometry').textContent=GPU_MEADOW_SPEC.plants.toLocaleString()+' PLANT INSTANCES · '+GPU_MEADOW_SPEC.grassAttempts.toLocaleString()+' GRASS ATTEMPTS · '+GPU_MEADOW_SPEC.flowerSpecies+' SOURCE SPECIES · 0 CPU POLYGONS';
function loop(now){
  if(animate.checked)seed=(seed+1)%100000;
  const result=gpu.render({seed,plants:Number(plant.value),grass:Number(grass.value)});
  if(last>0&&now-last<1000)frames++;
  last=now;
  if(!sampleStart)sampleStart=now;
  if(now-sampleStart>=600){
    fps=frames*1000/(now-sampleStart);
    frames=0;sampleStart=now;
    $('fps').textContent=fps.toFixed(1)+' FPS';
    $('cpu').textContent=result.cpuMs.toFixed(2)+' ms CPU submission';
    $('gpu').textContent=result.gpuMs===null?'GPU timer unavailable':result.gpuMs.toFixed(2)+' ms GPU';
    $('triangles').textContent=result.triangles.toLocaleString()+' GENERATED TRIANGLES / FRAME';
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
if(urlOptions.has('smoke')){
  // Draw the actual full scene, then a grass-free plant-only scene. A renderer
  // that displays only grass now fails deployment instead of reporting READY.
  gpu.render({seed,plants:100,grass:100});
  const fullBlooms=countWarmFlowerPixels();
  gpu.render({seed,plants:100,grass:0});
  const bareBlooms=countWarmFlowerPixels();
  $('bloomPixels').textContent=fullBlooms+' FULL / '+bareBlooms+' NO-GRASS';
  if(fullBlooms<16||bareBlooms<16)
    throw new Error('GPU plant visibility regression: '+$('bloomPixels').textContent);
  if(!urlOptions.has('userView')){
    gpu.camera.orbit(60,-35);
    gpu.camera.pan(30,-15,canvas.clientWidth,canvas.clientHeight);
    gpu.camera.zoomAt(1.25,canvas.clientWidth*.6,canvas.clientHeight*.4,
      canvas.clientWidth,canvas.clientHeight);
  }
  updateCameraStatus();
  const result=gpu.render({seed,plants:Number(plant.value),grass:Number(grass.value)});
  $('triangles').textContent=result.triangles.toLocaleString()+
    ' GENERATED TRIANGLES / FRAME · '+result.ringPoints+' RING POINTS';
  $('cpu').textContent=result.cpuMs.toFixed(2)+' ms CPU submission';
  $('backend').textContent+=' / READY';
}else requestAnimationFrame(loop);
