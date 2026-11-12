import {GpuMeadow,GPU_MEADOW_SPEC} from './gpu-meadow.js';
import {bindOrbitControls,OrbitCamera} from './gpu-orbit-camera.js';
import {OriginalCanvasMeadow} from './original-canvas-meadow.js';
import {FastOriginalMeadow} from './fast-original-meadow.js';
const $=id=>document.getElementById(id);
let realGpu=null,gpuInitError=null;
const sharedCamera=new OrbitCamera();
// The user's Windows laptop should not even COMPILE the failing WebGL shaders
// when defaulting to the reliable source view. Initialize GPU lazily only
// when it is selected or the hardware probe is explicitly requested.
function ensureGpu(){
  if(realGpu)return realGpu;
  if(gpuInitError)throw gpuInitError;
  try{
    realGpu=new GpuMeadow($('canvas'));
    realGpu.camera=sharedCamera;
    return realGpu;
  }catch(error){gpuInitError=error;throw error;}
}
const gpu={
  camera:sharedCamera,
  get gl(){return realGpu?.gl??null;},
  get compact(){return realGpu?.compact??false;},
  get stats(){return realGpu?.stats??null;},
  render(options){return ensureGpu().render(options);}
};
const sourceCanvas=$('sourceCanvas');
const sourceRenderer=new OriginalCanvasMeadow(sourceCanvas);
const fastCanvas=$('fastCanvas');
let fastRenderer=null,fastFailed=false,fastError='';
function ensureFast(){
  if(fastRenderer)return fastRenderer;
  if(fastFailed)throw new Error(fastError||'Fast GPU path unavailable');
  try{
    fastRenderer=new FastOriginalMeadow(fastCanvas);
    return fastRenderer;
  }catch(error){fastFailed=true;fastError=error.message;throw error;}
}
let gpuFailed=false,gpuProbed=false,gpuProbeText='Not tested';
let seed=2611,last=0,frames=0,sampleStart=0,fps=0;
const plant=$('plantDensity'),grass=$('grassDensity'),animate=$('animate');
const layerMode=$('layerMode'),visibleFlowers=$('visibleFlowers');
const rendererMode=$('rendererMode');
const windowsLaptop=/Windows|Win32|Win64/i.test(navigator.userAgent);
function selectedRenderer(){
  if(rendererMode.value==='original')return 'original';
  if(rendererMode.value==='fast')return fastFailed?'original':'fast';
  if(rendererMode.value==='gpu')return gpuInitError?'original':'gpu';
  // Fast source mesh uses the original CPU-constructed polygons, but
  // draws them in ONE simple GPU batch. It bypasses the experimental
  // 3D procedural vertex shaders that show grass-only on Windows.
  if(windowsLaptop&&!animate.checked)return fastFailed?'original':'fast';
  if(gpuInitError||gpuFailed)return fastFailed?'original':'fast';
  return 'gpu';
}
function layerName(){return layerMode.value;}
function showRenderer(active){
  sourceCanvas.style.display=active==='original'?'block':'none';
  fastCanvas.style.display=active==='fast'?'block':'none';
  $('rendererStatus').textContent=active==='original'?
    'ORIGINAL 2025 GEOMETRY / CANVAS2D':
    active==='fast'?
    'ORIGINAL 2025 GEOMETRY / BATCHED GPU 2D':
    'GPU 3D SOURCE GEOMETRY / EXPERIMENTAL';
}
function sourceOptions(){
  return {seed,plants:Number(plant.value),grass:Number(grass.value),
    layer:layerName(),zoom:gpu.camera.zoom,
    panX:gpu.camera.target[0],panY:gpu.camera.target[1],
    flowersForeground:visibleFlowers.checked};
}
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
if(['auto','original','gpu'].includes(urlOptions.get('renderer')))
  rendererMode.value=urlOptions.get('renderer');
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
for(const control of [layerMode,visibleFlowers,animate,rendererMode])
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
$('backend').textContent=selectedRenderer()==='gpu'?
  'WEBGL2 / ORIGINAL 3D GEOMETRY':'INITIALIZING SOURCE MEADOW';
$('rendererStatus').textContent='Renderer pending';
$('gpuDiagnostics').textContent=gpuInitError?
  'GPU initialization error: '+gpuInitError.message:'GPU diagnostic: not yet checked';
$('geometry').textContent=GPU_MEADOW_SPEC.plants.toLocaleString()+' PLANT INSTANCES · '+GPU_MEADOW_SPEC.grassAttempts.toLocaleString()+' GRASS ATTEMPTS · '+GPU_MEADOW_SPEC.flowerSpecies+' SOURCE SPECIES · 0 CPU POLYGONS';
function gpuFlowerProbe(){
  try{ensureGpu();}
  catch(error){return {ok:false,detail:'GPU initialization failed: '+error.message};}
  if(!gpu?.gl)return {ok:false,detail:'WebGL2 unavailable'};
  const gl=gpu.gl;
  // Detect non-rendering hardware on the REAL device. The normal GPU draw
  // may be submitted successfully yet fail to produce any petals. Isolate
  // petals and disks, sample their framebuffer, then redraw the full scene.
  gpu.render({seed,plants:100,grass:0,onlyParts:[3,4],flowersForeground:true});
  const bg=gl.getParameter(gl.COLOR_CLEAR_VALUE);
  const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  const bytes=new Uint8Array(w*h*4),rgb=bg.slice(0,3).map(c=>c*255);
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
  let pixels=0,minX=w,maxX=-1;
  for(let i=0;i<bytes.length;i+=4){
    const difference=Math.max(Math.abs(bytes[i]-rgb[0]),
      Math.abs(bytes[i+1]-rgb[1]),Math.abs(bytes[i+2]-rgb[2]));
    if(difference>45){pixels++;const x=(i/4)%w;minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
  }
  const span=maxX<0?0:maxX-minX+1;
  const errors=gpu.stats?.glErrors??[];
  return {ok:pixels>=250&&span>=Math.min(w*.18,200)&&!errors.length,
    detail:'Petals/disks: '+pixels+' pixels, '+span+'px span; WebGL errors: '+(errors.join(', ')||'none')};
}
function drawScene(){
  let kind=selectedRenderer();
  if(kind==='gpu'&&!gpuProbed&&rendererMode.value==='auto'){
    gpuProbed=true;
    try{
      const probe=gpuFlowerProbe();
      gpuProbeText=probe.detail;
      if(!probe.ok){gpuFailed=true;kind='original';}
    }catch(error){
      gpuProbeText='GPU flower test failed: '+error.message;
      gpuFailed=true;kind='original';
    }
  }
  const start=performance.now();
  if(kind==='gpu'){
    try{
      lastResult=gpu.render(renderOptions());
    }catch(error){
      gpuFailed=true;
      gpuProbeText='GPU drawing failed: '+error.message;
      kind='original';
    }
  }
  if(kind==='fast'){
    try{
      showRenderer(kind);
      lastResult=ensureFast().render(sourceOptions());
    }catch(error){
      fastFailed=true;
      fastError=error.message;
      gpuProbeText='Batched GPU rendering failed: '+error.message;
      kind='original';
    }
  }
  if(kind==='original'){
    showRenderer(kind); // visible before Canvas2D reads clientWidth/Height
    lastResult=sourceRenderer.render(sourceOptions());
  }else showRenderer(kind);
  lastResult.cpuMs=performance.now()-start;
  $('backend').textContent=kind==='original'?
    'CANVAS2D / ORIGINAL 2025 GEOMETRY':kind==='fast'?
    'WEBGL2 / ORIGINAL 2025 BATCHED GEOMETRY':
    'WEBGL2 / ORIGINAL 3D GEOMETRY';
  $('gpuDiagnostics').textContent=gpuProbeText+
    (gpuFailed?' · Original source fallback selected':'');
  $('sourceStats').textContent=(kind==='original'||kind==='fast')?
    'SOURCE: '+lastResult.petals+' PETALS · '+lastResult.disks+
    ' CENTERS · '+lastResult.leaves+' LEAVES · '+lastResult.paths+
    ' STEM PATHS · '+lastResult.grass+' GRASS':'GPU original source geometry';
  $('pipelinePerf').textContent=kind==='fast'?
    'BUILD '+lastResult.cpuMs.toFixed(1)+' ms · GENERATE '+
    lastResult.geometryMs.toFixed(1)+' · MESH '+lastResult.meshMs.toFixed(1)+
    ' · UPLOAD '+lastResult.uploadMs.toFixed(1)+
    ' · DRAW '+lastResult.drawMs.toFixed(1)+' ms':'';

  $('gpuErrors').textContent=kind==='gpu'?
    (lastResult.glErrors.join(', ')||'No WebGL draw errors'):
    kind==='fast'?'Batched WebGL: no shader-generation dependency':
    'Canvas2D: no WebGL dependence';
  return kind;
}
function loop(now){
  const mode=selectedRenderer();
  if(animate.checked&&mode==='gpu'){seed=(seed+1)%100000;invalidate();}
  if(canvas.clientWidth!==windowWidth||canvas.clientHeight!==windowHeight){
    windowWidth=canvas.clientWidth;windowHeight=canvas.clientHeight;invalidate();
  }
  if(dirty){
    try{
      drawScene();
      rendered++;
      dirty=false;
      $('error').hidden=true;
    }catch(error){
      $('error').hidden=false;
      $('error').textContent='Original meadow render failed: '+error.message;
      dirty=false;
    }
  }
  if(!sampleStart)sampleStart=now;
  if(now-sampleStart>=600){
    $('fps').textContent=animate.checked&&mode==='gpu'?
      (rendered*1000/(now-sampleStart)).toFixed(1)+' FPS':'STATIC';
    rendered=0;sampleStart=now;
    if(lastResult){
      $('cpu').textContent=lastResult.cpuMs.toFixed(2)+' ms '+
        (lastResult.mode==='original-source-cached-canvas2d'?
          (lastResult.rebuiltAtlas?'cache build':'cached camera draw'):'last draw');
      $('gpu').textContent=lastResult.mode==='original-source-batched-webgl2'?
        'SIMPLE GPU · '+lastResult.drawCalls+' DRAW · '+
        lastResult.triangles.toLocaleString()+' TRIANGLES':
        lastResult.mode==='original-source-cached-canvas2d'?
        'ORIGINAL GEOMETRY CACHED · '+(lastResult.atlasPixels/1000000).toFixed(1)+
          'M pixels · 1 image blit per camera move':
        (lastResult.gpuMs==null?'GPU timer unavailable':
          lastResult.gpuMs.toFixed(2)+' ms GPU');
      $('triangles').textContent=(lastResult.triangles||0).toLocaleString()+
        ' GPU TRIANGLES · '+lastResult.mode;
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
if(urlOptions.has('smoke')&&selectedRenderer()==='fast'){
  showRenderer('fast');
  const current=sourceOptions();
  const original=ensureFast().render(current);
  if(original.petals<100||original.disks<100||original.leaves<100)
    throw new Error('Fast GPU scene missing original source flowers or leaves');
  const samples=[];
  for(let i=0;i<12;i++){
    const t=performance.now();
    const frame=ensureFast().render({...current,panX:i*.13,zoom:1+i*.03});
    samples.push(performance.now()-t);
    if(frame.meshMs!==0||frame.uploadMs!==0||frame.drawCalls!==1)
      throw new Error('Fast GPU unexpectedly rebuilt source geometry on camera move');
  }
  // Render ONLY the original 2025 petal and disk triangles, and verify
  // pixels actually appear in the GPU framebuffer, not just in source stats.
  ensureFast().render({...current,layer:'flowers'});
  const gl=ensureFast().gl,w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
  const buffer=new Uint8Array(w*h*4);
  gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buffer);
  const bg=gl.getParameter(gl.COLOR_CLEAR_VALUE);
  const rgb=[bg[0]*255,bg[1]*255,bg[2]*255];
  let flowerPixels=0,left=w,right=-1;
  for(let k=0;k<buffer.length;k+=4){
    const delta=Math.max(Math.abs(buffer[k]-rgb[0]),
      Math.abs(buffer[k+1]-rgb[1]),Math.abs(buffer[k+2]-rgb[2]));
    if(delta>50){
      flowerPixels++;const x=(k/4)%w;
      left=Math.min(left,x);right=Math.max(right,x);
    }
  }
  const spread=right>=left?right-left+1:0;
  $('fastFlowerPixels').textContent=flowerPixels+' FLOWER PIXELS / '+spread+' PX SPREAD';
  if(flowerPixels<250||spread<w*.20)
    throw new Error('Batched source GPU failed to display real flower geometry: '+
      $('fastFlowerPixels').textContent);
  ensureFast().render(current); // return to original screenshot view
  const avg=samples.reduce((a,b)=>a+b,0)/samples.length;
  const max=Math.max(...samples);
  $('cachedPerf').textContent='BATCHED '+avg.toFixed(2)+' ms AVG / '+
    max.toFixed(2)+' ms MAX / INITIAL '+original.cpuMs.toFixed(2)+
    ' ms / GENERATE '+original.geometryMs.toFixed(2)+
    ' / MESH '+original.meshMs.toFixed(2)+
    ' / UPLOAD '+original.uploadMs.toFixed(2)+
    ' / DRAW '+original.drawMs.toFixed(2)+' / 12 REUSED MESHES';
  $('sourceStats').textContent='SOURCE: '+original.petals+' PETALS · '+
    original.disks+' CENTERS · '+original.leaves+' LEAVES · '+
    original.paths+' STEM PATHS · '+original.grass+' GRASS';
  $('backend').textContent='WEBGL2 / ORIGINAL 2025 BATCHED GEOMETRY / READY';
  $('rendererStatus').textContent='SOURCE VERTICES PREPARED ONCE / ONE GPU DRAW';
  $('triangles').textContent=original.triangles.toLocaleString()+
    ' GPU TRIANGLES / ORIGINAL GEOMETRY';
}else if(urlOptions.has('smoke')&&selectedRenderer()==='original'){
  showRenderer('original');
  const result=sourceRenderer.render(sourceOptions());
  // Measure actual camera interactions with the entire original source
  // present. None of these 12 moves may regenerate/repaint polygons.
  const samples=[];
  for(let i=0;i<12;i++){
    const start=performance.now();
    const cached=sourceRenderer.render({
      ...sourceOptions(),panX:i*.35,panY:-i*.16,zoom:1+i*.03
    });
    samples.push(performance.now()-start);
    if(cached.rebuiltAtlas||cached.drawCalls!==1)
      throw new Error('Camera movement unexpectedly rerasterized the meadow');
  }
  sourceRenderer.render(sourceOptions()); // restore the screenshot camera
  const avg=samples.reduce((a,b)=>a+b,0)/samples.length;
  const worst=Math.max(...samples);
  $('cachedPerf').textContent='CACHED '+avg.toFixed(2)+' ms AVG / '+
    worst.toFixed(2)+' ms MAX / INITIAL '+result.frameMs.toFixed(2)+
    ' ms / 12 CACHE HITS / 1 DRAW EACH';
  $('backend').textContent='CANVAS2D / ORIGINAL 2025 GEOMETRY / READY';
  $('rendererStatus').textContent='ORIGINAL SOURCE VERIFIED';
  $('sourceStats').textContent='SOURCE: '+result.petals+' PETALS · '+
    result.disks+' CENTERS · '+result.leaves+' LEAVES · '+
    result.paths+' STEM PATHS · '+result.grass+' GRASS';
  $('triangles').textContent=result.rendered.toLocaleString()+' ORIGINAL SHAPES';
  if(result.petals<100||result.disks<100||result.leaves<100)
    throw new Error('Original source fallback missing expected flower and leaf geometry');
}else if(urlOptions.has('smoke')){
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
