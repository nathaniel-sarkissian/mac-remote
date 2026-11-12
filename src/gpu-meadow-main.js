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
$('geometry').textContent=GPU_MEADOW_SPEC.plants.toLocaleString()+' PLANT INSTANCES · '+GPU_MEADOW_SPEC.grassAttempts.toLocaleString()+' GRASS ATTEMPTS · 0 CPU POLYGONS';
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
if(new URLSearchParams(window.location.search).has('smoke')){
  // Test the camera matrix in a real shader draw too, not only the defaults.
  gpu.render({seed,plants:Number(plant.value),grass:Number(grass.value)});
  gpu.camera.orbit(60,-35);
  gpu.camera.pan(30,-15,canvas.clientWidth,canvas.clientHeight);
  gpu.camera.zoomAt(1.25,canvas.clientWidth*.6,canvas.clientHeight*.4,
    canvas.clientWidth,canvas.clientHeight);
  updateCameraStatus();
  const result=gpu.render({seed,plants:Number(plant.value),grass:Number(grass.value)});
  $('triangles').textContent=result.triangles.toLocaleString()+' GENERATED TRIANGLES / FRAME';
  $('cpu').textContent=result.cpuMs.toFixed(2)+' ms CPU submission';
  $('backend').textContent+=' / READY';
}else requestAnimationFrame(loop);
