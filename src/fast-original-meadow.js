// Source-faithful 2D geometry rendered using one batched WebGL2 call.
// All actual petal, leaf, disk, grass and stem coordinates come from the
// recovered Never the Same (2025) generator. Only rasterization is moved
// to the GPU; no shader reconstructs the complex geometry or noise.
import earcut from './earcut.js';
import {generateNeverSame} from './never-the-same-geometry.js';
import {originalCanvasSceneStats} from './original-canvas-meadow.js';

const VERTEX_SHADER=`#version 300 es
precision highp float;
layout(location=0) in vec2 aPoint;
layout(location=1) in vec4 aColor;
uniform vec2 uViewport;
uniform vec2 uPan;
uniform float uPixelsPerUnit;
out vec4 vColor;
void main(){
  vec2 q=(aPoint-uPan)*uPixelsPerUnit;
  gl_Position=vec4(2.0*q.x/uViewport.x,-2.0*q.y/uViewport.y,0.0,1.0);
  vColor=aColor;
}`;
const FRAGMENT_SHADER=`#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 outColor;
void main(){outColor=vColor;}`;

export function parseOriginalColor(color){
  if(typeof color!=='string')return [125,145,124];
  const value=color.trim();
  if(/^#[a-f0-9]{6}$/i.test(value))
    return [1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
  if(/^#[a-f0-9]{3}$/i.test(value))
    return [1,2,3].map(i=>parseInt(value[i]+value[i],16));
  const match=value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if(match)return [1,2,3].map(i=>Math.min(255,Math.max(0,Number(match[i]))));
  return [125,145,124];
}
export function preparedSourceOrder(scene,flowersForeground=true,layer='all'){
  const order=scene.slice().reverse();
  if(flowersForeground&&layer!=='grass'){
    const normal=[],heads=[];
    for(const item of order)
      (item.plantPart==='petal'||item.plantPart==='disk'?heads:normal).push(item);
    return normal.concat(heads);
  }
  return order;
}
export function sourceMesh(scene,flowersForeground=true,layer='all'){
  const ordered=preparedSourceOrder(scene,flowersForeground,layer);
  let points=0,segments=0;
  for(const item of ordered){
    if(item.type==='path')segments+=Math.max(0,(item.points?.length??0)-1);
    else if(item.points?.length>=3)points+=item.points.length;
  }
  const capacity=points+segments*4;
  const vertices=new Float32Array(capacity*2);
  const colors=new Uint8Array(capacity*4);
  const indices=[];
  let vertexCount=0,triangles=0,paths=0,polygons=0;
  function point(x,y,rgb,a){
    const i=vertexCount++;
    vertices[i*2]=x;vertices[i*2+1]=y;
    const j=i*4;
    colors[j]=rgb[0];colors[j+1]=rgb[1];colors[j+2]=rgb[2];colors[j+3]=a;
    return i;
  }
  for(const item of ordered){
    const p=item.points;
    if(!p||p.length<2||!p.every(q=>Number.isFinite(q[0])&&Number.isFinite(q[1])))continue;
    const path=item.type==='path';
    const rgb=parseOriginalColor(path?item.stroke?.color:item.hatch?.color);
    const alpha=path?255:item.grass?Math.round(.67*255):
      item.plantPart==='leaf'?Math.round(.82*255):255;
    if(path){
      const half=Math.max(.14,item.stroke?.lineWidth??.3)*.5;
      for(let k=0;k<p.length-1;k++){
        const a=p[k],z=p[k+1],dx=z[0]-a[0],dy=z[1]-a[1],length=Math.hypot(dx,dy);
        if(length<1e-10)continue;
        const nx=-dy/length*half,ny=dx/length*half;
        const offset=vertexCount;
        point(a[0]-nx,a[1]-ny,rgb,alpha);
        point(a[0]+nx,a[1]+ny,rgb,alpha);
        point(z[0]+nx,z[1]+ny,rgb,alpha);
        point(z[0]-nx,z[1]-ny,rgb,alpha);
        indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
        triangles+=2;paths++;
      }
    }else if(p.length>=3){
      const base=vertexCount,flattened=new Array(p.length*2);
      for(let k=0;k<p.length;k++){
        const x=p[k][0],y=p[k][1];
        flattened[k*2]=x;flattened[k*2+1]=y;
        point(x,y,rgb,alpha);
      }
      const local=earcut(flattened);
      for(let k=0;k<local.length;k+=3)
        indices.push(base+local[k],base+local[k+1],base+local[k+2]);
      triangles+=local.length/3;polygons++;
    }
  }
  return {vertices:vertices.subarray(0,vertexCount*2),
    colors:colors.subarray(0,vertexCount*4),
    indices:new Uint32Array(indices),vertexCount,triangles,polygons,paths};
}
function compile(gl,type,source){
  const shader=gl.createShader(type);
  gl.shaderSource(shader,source);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))
    throw new Error('Fast source shader compilation: '+gl.getShaderInfoLog(shader));
  return shader;
}
function createProgram(gl){
  const program=gl.createProgram();
  const vs=compile(gl,gl.VERTEX_SHADER,VERTEX_SHADER);
  const fs=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT_SHADER);
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))
    throw new Error('Fast source shader link: '+gl.getProgramInfoLog(program));
  return program;
}
export class FastOriginalMeadow{
  constructor(canvas){
    this.canvas=canvas;
    const gl=canvas.getContext('webgl2',
      {alpha:false,depth:false,antialias:true,preserveDrawingBuffer:true});
    if(!gl)throw new Error('WebGL2 unavailable for fast original geometry');
    this.gl=gl;
    this.program=createProgram(gl);
    this.vao=gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.positionBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    this.colorBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuffer);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1,4,gl.UNSIGNED_BYTE,true,0,0);
    this.indexBuffer=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);
    this.uniforms={
      viewport:gl.getUniformLocation(this.program,'uViewport'),
      pan:gl.getUniformLocation(this.program,'uPan'),
      pixelsPerUnit:gl.getUniformLocation(this.program,'uPixelsPerUnit')
    };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    this.seed=null;this.source=null;this.prepared=null;this.lastStats=null;
  }
  ensureSource(seed){
    if(this.source&&this.seed===seed)return 0;
    const start=performance.now();
    this.source=generateNeverSame({seed});
    this.seed=seed;
    this.prepared=null;
    return performance.now()-start;
  }
  render({seed=2611,plants=100,grass=100,layer='all',
    zoom=1,panX=0,panY=0,flowersForeground=true}={}){
    if(![seed,plants,grass,zoom,panX,panY].every(Number.isFinite)||zoom<=0)
      throw new RangeError('Invalid source geometry parameters');
    const start=performance.now(),gl=this.gl;
    const generationMs=this.ensureSource(seed);
    const key=[seed,plants,grass,layer,flowersForeground].join('|');
    let meshMs=0,uploadMs=0,rebuild=false;
    if(!this.prepared||this.prepared.key!==key){
      rebuild=true;
      const prepStart=performance.now();
      const stats=originalCanvasSceneStats(this.source,layer,plants,grass);
      const mesh=sourceMesh(stats.scene,flowersForeground,layer);
      meshMs=performance.now()-prepStart;
      const uploadStart=performance.now();
      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,mesh.colors,gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
      uploadMs=performance.now()-uploadStart;
      this.prepared={key,stats,mesh};
    }
    const {stats,mesh}=this.prepared;
    const width=Math.max(1,Math.round(this.canvas.clientWidth||this.canvas.width||1));
    const height=Math.max(1,Math.round(this.canvas.clientHeight||this.canvas.height||1));
    const dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1);
    const w=Math.max(1,Math.round(width*dpr)),h=Math.max(1,Math.round(height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){
      this.canvas.width=w;this.canvas.height=h;
    }
    const drawStart=performance.now();
    gl.viewport(0,0,w,h);
    const background=parseOriginalColor(this.source.background);
    gl.clearColor(background[0]/255,background[1]/255,background[2]/255,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(this.uniforms.viewport,width,height);
    gl.uniform2f(this.uniforms.pan,panX,panY);
    gl.uniform1f(this.uniforms.pixelsPerUnit,Math.min(width,height)/75*zoom);
    gl.drawElements(gl.TRIANGLES,mesh.indices.length,gl.UNSIGNED_INT,0);
    const err=gl.getError();
    if(err!==gl.NO_ERROR)throw new Error('WebGL draw error 0x'+err.toString(16));
    const drawMs=performance.now()-drawStart;
    this.lastStats={...stats,mode:'original-source-batched-webgl2',
      generated:rebuild,rebuiltScene:generationMs>0,rebuiltAtlas:rebuild,
      geometryMs:generationMs,meshMs,uploadMs,drawMs,
      cpuMs:performance.now()-start,vertices:mesh.vertexCount,
      triangles:mesh.triangles,drawCalls:1,
      flowerPolygons:stats.petals,flowerCenters:stats.disks,
      source:'recovered-2025-geometry'};
    return this.lastStats;
  }
  dispose(){
    const gl=this.gl;
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.colorBuffer);
    gl.deleteBuffer(this.indexBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
