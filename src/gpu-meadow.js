// Experimental, GPU-only Never the Same scene generation.
// Every visible vertex (roots, segmented stems, thirteen-point leaves/petals,
// flower disks, two grass attempts per site) is synthesized in a WebGL2 shader.
// There is no CPU scene array, geometry readback, hatch pass or CPU clipping.
// The source artwork's 60x60 layout is retained, but species/noise geometry
// is a GPU approximation rather than a pixel-identical port of OpenSimplex.
import {OrbitCamera} from './gpu-orbit-camera.js';

export const GPU_MEADOW_SPEC=Object.freeze({
  grid:60,plants:3600,grassAttempts:7200,stemSegments:6,
  leavesPerPlant:8,petalsPerPlant:8,ringPoints:13
});
export const GPU_MEADOW_BATCHES=Object.freeze([
  {name:'grass',part:0,vertices:3,instances:GPU_MEADOW_SPEC.grassAttempts},
  {name:'stems',part:1,vertices:GPU_MEADOW_SPEC.stemSegments*6,instances:GPU_MEADOW_SPEC.plants},
  {name:'leaves',part:2,vertices:GPU_MEADOW_SPEC.leavesPerPlant*GPU_MEADOW_SPEC.ringPoints*3,instances:GPU_MEADOW_SPEC.plants},
  {name:'petals',part:3,vertices:GPU_MEADOW_SPEC.petalsPerPlant*GPU_MEADOW_SPEC.ringPoints*3,instances:GPU_MEADOW_SPEC.plants},
  {name:'disks',part:4,vertices:GPU_MEADOW_SPEC.ringPoints*3,instances:GPU_MEADOW_SPEC.plants}
]);
export const GPU_MEADOW_VERTEX=`#version 300 es
precision highp float;
precision highp int;
uniform float uSeed;
uniform vec2 uResolution;
uniform float uZoom;
uniform vec3 uCameraRight;
uniform vec3 uCameraUp;
uniform vec3 uCameraView;
uniform vec3 uCameraTarget;
uniform float uPlants;
uniform float uGrass;
uniform int uPart;
out vec3 vColor;
const float PI=3.141592653589793;
const float TAU=6.283185307179586;
const int RING=13;
float hash1(float n){
  return fract(sin(n*127.1+uSeed*0.0673)*43758.5453);
}
float hash2(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*0.0431)*43758.5453);
}
float noise2(vec2 p){
  vec2 a=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash2(a),hash2(a+vec2(1.0,0.0)),f.x),
             mix(hash2(a+vec2(0.0,1.0)),hash2(a+vec2(1.0,1.0)),f.x),f.y);
}
float terrain(vec2 xz){
  float h=(noise2(xz*0.04)-0.5)*4.0+(noise2(xz*0.12+34.0)-0.5)*1.4;
  return h*mix(0.65,1.5,clamp((xz.y+65.0)/80.0,0.0,1.0));
}
vec3 rootAt(int id){
  float ix=float(id%60),iz=float(id/60);
  vec2 xz=vec2(mix(-37.5,37.5,ix/59.0),
               mix(-37.5,43.125,iz/59.0)-25.0);
  float a=hash1(float(id)*5.7+11.0)*TAU;
  float r=sqrt(-2.0*log(max(0.0001,hash1(float(id)*13.1+71.0))));
  xz+=vec2(cos(a),sin(a))*min(r,2.5)*0.85;
  return vec3(xz.x,terrain(xz),xz.y);
}
float stemHeight(int id){
  vec3 r=rootAt(id);
  return (3.5+5.8*noise2(r.xz*0.08+51.0))*(0.7+0.5*hash1(float(id)*11.3+15.0));
}
vec3 stemAt(vec3 root,float height,float t,int id){
  float sway=hash1(float(id)*2.7+3.0)*2.0-1.0;
  float bend=hash1(float(id)*9.1+65.0)*2.0-1.0;
  return root+vec3(sway*t*t*2.3, height*t, bend*t*t*2.0);
}
vec3 leafTint(int id){
  float h=hash1(float(id)*8.17+84.0);
  return mix(vec3(0.24,0.36,0.31),vec3(0.73,0.69,0.46),h);
}
vec3 petalTint(int id,int species){
  float n=hash1(float(id)*15.3+43.0);
  if(species==0)return mix(vec3(0.98,0.70,0.22),vec3(0.92,0.38,0.39),n);
  if(species==1)return mix(vec3(0.96,0.89,0.77),vec3(0.85,0.82,0.87),n);
  if(species==2)return mix(vec3(0.82,0.49,0.57),vec3(0.92,0.70,0.61),n);
  if(species==3)return mix(vec3(0.98,0.73,0.35),vec3(0.99,0.86,0.56),n);
  if(species==4)return mix(vec3(0.56,0.58,0.79),vec3(0.78,0.79,0.90),n);
  if(species==5)return mix(vec3(0.98,0.78,0.61),vec3(0.93,0.56,0.50),n);
  return mix(vec3(0.89,0.78,0.83),vec3(0.98,0.91,0.72),n);
}
vec3 leafBoundary(int id,int li,float angle,vec3 root,float height){
  float t=(float(li)+1.0)/10.0;
  vec3 attach=stemAt(root,height,t,id);
  float dir=hash1(float(id)*4.1+float(li)*7.3)*TAU;
  vec3 axis=vec3(cos(dir),0.15+0.2*hash1(float(li)+float(id)*3.1),sin(dir));
  vec3 side=vec3(-sin(dir),0.0,cos(dir));
  float along=0.5+0.5*cos(angle);
  float len=1.4+2.7*hash1(float(id)*23.3+float(li)*2.8);
  float breadth=(0.30+0.36*hash1(float(id)*4.5+float(li)*4.0))
    *pow(max(0.0,sin(PI*along)),0.7);
  return attach+axis*(along*len)+side*(sin(angle)*breadth);
}
vec3 petalBoundary(int id,int pi,float angle,vec3 root,float height,int species){
  vec3 center=stemAt(root,height,1.0,id);
  float dir=float(pi)*TAU/float(4+species%5)+0.4;
  vec3 axis=vec3(cos(dir),0.12+0.14*sin(dir*3.0),sin(dir));
  vec3 side=vec3(-sin(dir),0.0,cos(dir));
  float along=0.5+0.5*cos(angle);
  float len=(species==1?3.0:2.0)*(0.68+0.44*hash1(float(id)*18.7+8.0));
  float breadth=(0.55+0.45*hash1(float(id)*4.5+float(pi)*3.9))
    *pow(max(0.0,sin(PI*along)),0.65);
  return center+axis*len*along+side*sin(angle)*breadth;
}
void main(){
  int vertex=gl_VertexID;
  int inst=gl_InstanceID;
  int id=(uPart==0)?inst/2:inst;
  vec3 root=rootAt(id);
  float height=stemHeight(id);
  int species=int(floor(hash1(float(id)*1.37+9.2)*7.0));
  bool visible=true;
  vec3 pos=root;
  float shade=0.86+0.24*hash1(float(id)*2.9+57.0);
  if(uPart==0){
    int attempt=inst%2;
    // Two grass attempts per planting position, like the archived source.
    visible=hash1(float(inst)*2.9+18.0)<uGrass;
    if(attempt==1)visible=visible&&(hash1(float(id)*1.91+32.0)<0.31);
    float dir=TAU*hash1(float(inst)*4.21+23.0);
    vec3 axis=vec3(cos(dir),0.0,sin(dir));
    vec3 across=vec3(-sin(dir),0.0,cos(dir));
    float width=0.25+0.45*hash1(float(inst)*9.6+22.0);
    float heightGrass=2.5+5.0*noise2(root.xz*0.04+17.0);
    float corner=float(vertex%3);
    vec3 at=root+axis*(0.5+hash1(float(inst)*12.7)*0.5);
    pos=at+across*((corner==0.0?-1.0:corner==1.0?1.0:0.0)*width)
      +vec3(0.0,corner==2.0?heightGrass:0.0,0.0);
    vColor=mix(vec3(0.35,0.49,0.38),vec3(0.83,0.75,0.55),
      hash1(float(inst)*5.2+11.0))*shade;
  }else if(uPart==1){
    visible=hash1(float(id)*0.91+113.0)<uPlants;
    int seg=vertex/6,q=vertex%6;
    int corner=q==0?0:q==1?1:q==2?2:q==3?0:q==4?2:3;
    float t=(corner==0||corner==3)?float(seg)/6.0:float(seg+1)/6.0;
    vec3 stem=stemAt(root,height,t,id);
    float halfW=mix(0.14,0.038,t);
    pos=stem+vec3((corner==0||corner==1)?-halfW:halfW,0.0,0.0);
    vColor=leafTint(id)*0.68*shade;
  }else if(uPart==2){
    visible=hash1(float(id)*0.91+113.0)<uPlants;
    int leaf=vertex/(RING*3),tri=(vertex/3)%RING,q=vertex%3;
    float angleA=TAU*float(tri)/float(RING);
    float angleB=TAU*float((tri+1)%RING)/float(RING);
    float dir=hash1(float(id)*4.1+float(leaf)*7.3)*TAU;
    vec3 axis=vec3(cos(dir),0.21,sin(dir));
    float len=1.4+2.7*hash1(float(id)*23.3+float(leaf)*2.8);
    if(q==0)pos=stemAt(root,height,(float(leaf)+1.0)/10.0,id)+axis*len*0.5;
    else pos=leafBoundary(id,leaf,q==1?angleA:angleB,root,height);
    vColor=leafTint(id)*(shade+(float(leaf%3)-1.0)*0.035);
  }else if(uPart==3){
    visible=hash1(float(id)*0.91+113.0)<uPlants;
    visible=visible&&(hash1(float(id)*5.93+6.0)<0.58);
    int pi=vertex/(RING*3),tri=(vertex/3)%RING,q=vertex%3;
    visible=visible&&(pi<(4+species%5));
    float angleA=TAU*float(tri)/float(RING);
    float angleB=TAU*float((tri+1)%RING)/float(RING);
    if(q==0){
      float dir=float(pi)*TAU/float(4+species%5)+0.4;
      float len=(species==1?3.0:2.0)*(0.68+0.44*hash1(float(id)*18.7+8.0));
      pos=stemAt(root,height,1.0,id)+vec3(cos(dir),0.12,sin(dir))*len*0.5;
    }else pos=petalBoundary(id,pi,q==1?angleA:angleB,root,height,species);
    vColor=petalTint(id,species)*(0.85+0.16*hash1(float(pi)*3.1+float(id)*8.7));
  }else{
    visible=hash1(float(id)*0.91+113.0)<uPlants;
    visible=visible&&(hash1(float(id)*5.93+6.0)<0.58);
    int tri=(vertex/3)%RING,q=vertex%3;
    float a=TAU*float(tri)/float(RING);
    float b=TAU*float((tri+1)%RING)/float(RING);
    vec3 center=stemAt(root,height,1.0,id)+vec3(0.0,0.03,0.0);
    float radius=species==1?0.52:0.27;
    float v=q==0?0.0:1.0;
    float ang=q==1?a:b;
    pos=center+vec3(cos(ang)*radius*v,0.11,sin(ang)*radius*v);
    vColor=mix(vec3(0.30,0.26,0.19),vec3(0.79,0.55,0.23),float(species==1));
  }
  if(!visible){
    gl_Position=vec4(3.0,3.0,1.0,1.0);
    vColor=vec3(0.0);
    return;
  }
  // All world-to-camera projection remains on GPU; orbit/pan/zoom only
  // change four small uniforms, never regenerate CPU polygon geometry.
  vec3 relative=pos-uCameraTarget;
  vec2 viewPlane=vec2(dot(relative,uCameraRight),dot(relative,uCameraUp));
  vec2 ndc=viewPlane*uZoom*2.0/uResolution;
  // Ortographic depth honors arbitrary orbit angles including side views.
  float depth=clamp(-dot(relative,uCameraView)/120.0,-0.99,0.99);
  gl_Position=vec4(ndc,depth,1.0);
}`;
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
function makeProgram(gl){
  const v=compile(gl,gl.VERTEX_SHADER,GPU_MEADOW_VERTEX);
  const f=compile(gl,gl.FRAGMENT_SHADER,GPU_MEADOW_FRAGMENT);
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
    this.program=makeProgram(gl);
    this.vao=gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.uniforms={};
    for(const key of ['uSeed','uResolution','uZoom','uCameraRight','uCameraUp','uCameraView','uCameraTarget','uPlants','uGrass','uPart'])
      this.uniforms[key]=gl.getUniformLocation(this.program,key);
    this.timerExt=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pendingQueries=[];
    this.frames=0;
    this.stats={cpuMs:0,gpuMs:null,triangles:0,drawCalls:0,instances:0};
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
  render({seed=2611,plants=100,grass=100}={}){
    if(!Number.isFinite(seed)||!Number.isFinite(plants)||plants<0||plants>100||
       !Number.isFinite(grass)||grass<0||grass>100)
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
    gl.clearColor(0.92,0.91,0.84,1);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
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
    let triangles=0,instances=0;
    for(const batch of GPU_MEADOW_BATCHES){
      gl.uniform1i(this.uniforms.uPart,batch.part);
      gl.drawArraysInstanced(gl.TRIANGLES,0,batch.vertices,batch.instances);
      triangles+=batch.vertices/3*batch.instances;
      instances+=batch.instances;
    }
    if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);this.pendingQueries.push(query);}
    this.frames++;
    Object.assign(this.stats,{cpuMs:performance.now()-start,triangles,
      drawCalls:GPU_MEADOW_BATCHES.length,instances});
    return this.stats;
  }
  dispose(){
    const gl=this.gl;
    for(const q of this.pendingQueries)gl.deleteQuery(q);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
    this.pendingQueries=[];
  }
}
