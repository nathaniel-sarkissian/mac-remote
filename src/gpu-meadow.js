// Reconstruct the 2025 meadow source's species, age, terrain, geometry and
// palettes on the GPU. A 60x60 RGBA8 multipass attribute atlas is generated
// by one fragment-shader draw per new seed. Leaves/petals are instanced by the
// vertex shader; no CPU polygons, hatch fragments or GPU readbacks.
import {OrbitCamera} from './gpu-orbit-camera.js';
import {
  SOURCE_GPU_VERTEX,SOURCE_GPU_BATCHES,
  SOURCE_STEM_PREPASS_VERTEX,SOURCE_STEM_PREPASS_FRAGMENT,SOURCE_STEM_JOINTS
} from './gpu-meadow-faithful.js';
import {
  GPU_MEADOW_VERTEX,GPU_MEADOW_PREPASS_VERTEX,GPU_MEADOW_PREPASS_FRAGMENT,
  originalSceneTraits
} from './gpu-meadow-geometry.js';
export {GPU_MEADOW_VERTEX,originalSceneTraits} from './gpu-meadow-geometry.js';

export const GPU_MEADOW_SPEC=Object.freeze({
  grid:60,plants:3600,grassAttempts:7200,stemSegments:12,
  leavesPerPlant:16,petalsPerPlant:13,diskLayers:3,ringPoints:13,flowerSpecies:6
});
// All platforms now draw the archived source's 3D petal/leaf outlines,
// incrementally grown stems and six-sided flower disks; no billboard path.
export const GPU_MEADOW_BATCHES=SOURCE_GPU_BATCHES;
// The original artwork uses thirteen samples per leaf and petal perimeter.
// Reducing to seven on phones collapsed the curved flower geometry into
// angular slivers. The instanced triangle-fan path already saves more than
// half the original work without changing the actual silhouettes.
export function ringPointsForViewport(width,height,zoom=1){
  if(![width,height,zoom].every(Number.isFinite)||width<=0||height<=0||zoom<=0)
    throw new RangeError('Invalid GPU meadow viewport');
  return GPU_MEADOW_SPEC.ringPoints;
}
export function selectCompactGpu(width,userAgent=''){
  return width<640||/iPhone|iPad|iPod/.test(userAgent);
}
export const GPU_MEADOW_FRAGMENT=`#version 300 es
precision highp float;
in vec3 vColor;
out vec4 outColor;
void main(){outColor=vec4(clamp(vColor,0.0,1.0),1.0);}`;

function compile(gl,type,source){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
    const error=gl.getShaderInfoLog(shader)||'unknown shader compiler error';
    gl.deleteShader(shader);
    throw new Error(error);
  }
  return shader;
}
function makeProgram(gl,vertex=GPU_MEADOW_VERTEX,fragment=GPU_MEADOW_FRAGMENT){
  const v=compile(gl,gl.VERTEX_SHADER,vertex);
  const f=compile(gl,gl.FRAGMENT_SHADER,fragment);
  const program=gl.createProgram();
  gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
  gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program)||'GPU meadow program link failed');
  return program;
}

export class GpuMeadow {
  constructor(canvas){
    this.canvas=canvas;
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,depth:true,preserveDrawingBuffer:false});
    if(!gl)throw new Error('WebGL2 required for procedural meadow generation');
    this.gl=gl;
    this.camera=new OrbitCamera();
    this.compact=false;
    this.batches=GPU_MEADOW_BATCHES;
    this.program=makeProgram(gl,SOURCE_GPU_VERTEX,GPU_MEADOW_FRAGMENT);
    this.vao=gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.uniforms={};
    for(const key of ['uSeed','uResolution','uZoom','uCameraRight','uCameraUp','uCameraView','uCameraTarget',
      'uPlants','uGrass','uPart','uRingPoints','uPalette','uFlowerThreshold','uPlant0','uPlant1','uPlant2','uPlant3','uStemXY','uStemZ'])
      this.uniforms[key]=gl.getUniformLocation(this.program,key);
    // Standard WebGL2 RGBA8 MRTs. Avoid optional floating-point framebuffer
    // extensions, preserving compatibility with iOS Safari/WebGL2.
    this.prepassProgram=makeProgram(gl,GPU_MEADOW_PREPASS_VERTEX,GPU_MEADOW_PREPASS_FRAGMENT);
    this.prepassVao=gl.createVertexArray();
    this.prepassUniforms={};
    for(const key of ['uSeed','uPalette','uFlowerThreshold','uSpeciesNoiseScale','uSpeciesOrder[0]'])
      this.prepassUniforms[key]=gl.getUniformLocation(this.prepassProgram,key);
    this.instanceFramebuffer=gl.createFramebuffer();
    this.instanceTextures=[];
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.instanceFramebuffer);
    for(let i=0;i<4;i++){
      const texture=gl.createTexture();
      this.instanceTextures.push(texture);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,60,60,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,gl.TEXTURE_2D,texture,0);
    }
    gl.drawBuffers([0,1,2,3].map(i=>gl.COLOR_ATTACHMENT0+i));
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)
      throw new Error('WebGL2 RGBA8 plant-atlas framebuffer is incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    // GPU-only stem joint transform cache. A dedicated 60x(60*13)
    // RGBA8 atlas computes the source's incremental rotations once per
    // site and joint; all leaves, petal layers, disks and stem strokes
    // fetch the same positions. Works without float color extensions.
    this.stemProgram=makeProgram(gl,SOURCE_STEM_PREPASS_VERTEX,SOURCE_STEM_PREPASS_FRAGMENT);
    this.stemVao=gl.createVertexArray();
    this.stemUniforms={};
    for(const name of ['uPlant0','uPlant1','uPlant2','uPlant3'])
      this.stemUniforms[name]=gl.getUniformLocation(this.stemProgram,name);
    this.stemFramebuffer=gl.createFramebuffer();
    this.stemTextures=[];
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.stemFramebuffer);
    for(let i=0;i<2;i++){
      const texture=gl.createTexture();
      this.stemTextures.push(texture);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,60,60*SOURCE_STEM_JOINTS,
        0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0+i,
        gl.TEXTURE_2D,texture,0);
    }
    gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT0+1]);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)
      throw new Error('WebGL2 GPU stem transform atlas is incomplete');
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    this.timerExt=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pendingQueries=[];
    this.frames=0;
    this.stats={cpuMs:0,gpuMs:null,triangles:0,vertices:0,drawCalls:0,instances:0,ringPoints:13,
      mode:'original-3d-geometry',glErrors:[]};
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
  }
  resize(){
    const dpr=Math.min(1.5,typeof window==='undefined'?1:(window.devicePixelRatio||1));
    const width=Math.max(1,Math.floor(this.canvas.clientWidth*dpr));
    const height=Math.max(1,Math.floor(this.canvas.clientHeight*dpr));
    if(this.canvas.width!==width||this.canvas.height!==height){
      this.canvas.width=width;this.canvas.height=height;
      this.gl.viewport(0,0,width,height);
    }
  }
  render({seed=2611,plants=100,grass=100,onlyPart=null}={}){
    if(!Number.isFinite(seed)||!Number.isFinite(plants)||plants<0||plants>100||
       !Number.isFinite(grass)||grass<0||grass>100||
       (onlyPart!==null&&(!Number.isInteger(onlyPart)||onlyPart<0||onlyPart>4)))
      throw new RangeError('Invalid procedural meadow parameters');
    const start=performance.now(),gl=this.gl;
    this.resize();
    const ext=this.timerExt;
    if(ext&&this.pendingQueries.length){
      const q=this.pendingQueries[0];
      if(gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE)){
        if(!gl.getParameter(ext.GPU_DISJOINT_EXT))
          this.stats.gpuMs=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;
        gl.deleteQuery(q);this.pendingQueries.shift();
      }
    }
    let query=null;
    if(ext&&this.frames%30===0&&this.pendingQueries.length<2){
      query=gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT,query);
    }
    // GPU-only scene generation: rasterize all 3600 sites into four RGBA8
    // attribute textures, each storing source-derived plant parameters.
    const traits=originalSceneTraits(seed);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.instanceFramebuffer);
    gl.viewport(0,0,60,60);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.prepassProgram);
    gl.bindVertexArray(this.prepassVao);
    gl.uniform1f(this.prepassUniforms.uSeed,seed);
    gl.uniform1i(this.prepassUniforms.uPalette,traits.palette);
    gl.uniform1f(this.prepassUniforms.uFlowerThreshold,traits.flowerThreshold);
    gl.uniform1f(this.prepassUniforms.uSpeciesNoiseScale,traits.speciesNoiseScale);
    gl.uniform1iv(this.prepassUniforms['uSpeciesOrder[0]'],new Int32Array(traits.speciesOrder));
    gl.drawArrays(gl.TRIANGLES,0,3);
    // Second GPU compute-style raster pass: generate exact source stem
    // segment rotations and joint positions from the fresh plant atlas.
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.stemFramebuffer);
    gl.viewport(0,0,60,60*SOURCE_STEM_JOINTS);
    gl.useProgram(this.stemProgram);
    gl.bindVertexArray(this.stemVao);
    for(let i=0;i<4;i++){
      gl.activeTexture(gl.TEXTURE0+i);
      gl.bindTexture(gl.TEXTURE_2D,this.instanceTextures[i]);
      gl.uniform1i(this.stemUniforms['uPlant'+i],i);
    }
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    const bg=traits.background;
    gl.clearColor(parseInt(bg.slice(1,3),16)/255,parseInt(bg.slice(3,5),16)/255,
      parseInt(bg.slice(5,7),16)/255,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    for(let i=0;i<4;i++){
      gl.activeTexture(gl.TEXTURE0+i);
      gl.bindTexture(gl.TEXTURE_2D,this.instanceTextures[i]);
      gl.uniform1i(this.uniforms['uPlant'+i],i);
    }
    for(let i=0;i<2;i++){
      gl.activeTexture(gl.TEXTURE0+4+i);
      gl.bindTexture(gl.TEXTURE_2D,this.stemTextures[i]);
    }
    gl.uniform1i(this.uniforms.uStemXY,4);
    gl.uniform1i(this.uniforms.uStemZ,5);
    gl.uniform1i(this.uniforms.uPalette,traits.palette);
    gl.uniform1f(this.uniforms.uFlowerThreshold,traits.flowerThreshold);
    gl.uniform1f(this.uniforms.uSeed,seed);
    gl.uniform2f(this.uniforms.uResolution,this.canvas.width,this.canvas.height);
    gl.uniform1f(this.uniforms.uZoom,Math.min(this.canvas.width,this.canvas.height)/75*this.camera.zoom);
    const basis=this.camera.basis();
    gl.uniform3f(this.uniforms.uCameraRight,...basis.right);
    gl.uniform3f(this.uniforms.uCameraUp,...basis.up);
    gl.uniform3f(this.uniforms.uCameraView,...basis.view);
    gl.uniform3f(this.uniforms.uCameraTarget,...this.camera.target);
    gl.uniform1f(this.uniforms.uPlants,plants/100);
    gl.uniform1f(this.uniforms.uGrass,grass/100);
    const ring=ringPointsForViewport(this.canvas.clientWidth,this.canvas.clientHeight,this.camera.zoom);
    gl.uniform1i(this.uniforms.uRingPoints,ring);
    let triangles=0,vertices=0,instances=0;
    for(const batch of this.batches){
      if(onlyPart!==null&&batch.part!==onlyPart)continue;
      gl.uniform1i(this.uniforms.uPart,batch.part);
      // The original source's grassShape is explicitly non-occluding.
      // All 3D plant polygons, including layered petals, participate in
      // the depth buffer. No detached screen-facing flower overlays.
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(batch.part!==0);
      const fan=batch.mode==='fan';
      const count=batch.vertices;
      gl.drawArraysInstanced(fan?gl.TRIANGLE_FAN:gl.TRIANGLES,0,count,batch.instances);
      triangles+=(fan?count-2:count/3)*batch.instances;
      vertices+=count*batch.instances;
      instances+=batch.instances;
      // A single first-frame diagnostic is cheap and exposes iOS WebGL
      // errors in the UI instead of silently drawing only the first pass.
      if(this.frames===0&&typeof gl.getError==='function'){
        const error=gl.getError();
        if(error!==gl.NO_ERROR)this.stats.glErrors.push(batch.name+': 0x'+error.toString(16));
      }
    }
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(true);
    if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);this.pendingQueries.push(query);}
    this.frames++;
    Object.assign(this.stats,{cpuMs:performance.now()-start,triangles,vertices,
      drawCalls:this.batches.length+2,instances,ringPoints:ring});
    return this.stats;
  }
  dispose(){
    const gl=this.gl;
    for(const q of this.pendingQueries)gl.deleteQuery(q);
    gl.deleteVertexArray(this.vao);
    gl.deleteVertexArray(this.prepassVao);
    gl.deleteVertexArray(this.stemVao);
    gl.deleteProgram(this.program);
    gl.deleteProgram(this.prepassProgram);
    gl.deleteProgram(this.stemProgram);
    for(const texture of this.instanceTextures)gl.deleteTexture(texture);
    for(const texture of this.stemTextures)gl.deleteTexture(texture);
    gl.deleteFramebuffer(this.instanceFramebuffer);
    gl.deleteFramebuffer(this.stemFramebuffer);
    this.pendingQueries=[];
  }
}
