import earcut from './earcut.js';
import { getRings, isLineObject, getLineStrokes, lineStrokesBounds, generateHatchStrokes, generateJitteredHatchStrokes, connectZigZagStrokes, visitHatchStrokes } from './geometry.js';
import { OccluderIndex, clipStrokeAgainstOccluders, ringBounds } from './occlusion.js';
import { ConservativeCoverage } from './coverage.js';

// One instance is one clipped hatch stroke. WebGL2 gl_VertexID synthesizes its
// six quad vertices; only one 48-byte record is uploaded per line segment.
const VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 aStart;
layout(location=1) in vec2 aEnd;
layout(location=2) in vec4 aInfo; // width override, cap-slope metadata, depth
layout(location=3) in vec4 aInk;
uniform vec2 uResolution;
uniform vec2 uCamera;
uniform float uZoom;
uniform float uLineWidth;
out float vCross;
out float vAlong;
flat out float vLength;
flat out float vHalfWidth;
flat out vec4 vInk;
flat out float vValid;
void main(){
  vec2 delta=aEnd-aStart;
  float rawLength=length(delta);
  vec2 along=rawLength>0.00001?delta/rawLength:vec2(1.0,0.0);
  vec2 crossDir=vec2(-along.y,along.x);
  float width=max(0.0,aInfo.x<0.0?uLineWidth:aInfo.x);
  float halfWidth=0.5*width;
  // Thickness must change ONLY the perpendicular extent. The former
  // halfWidth * capSlope end insets shortened hatches as width increased.
  // Retain the source-clipped endpoints for all widths (square caps), while
  // foreground occlusion remains handled by the CPU clip and depth prepass.
  float lengthWorld=rawLength;
  vValid=lengthWorld>0.00001?1.0:0.0;
  vec2 start=aStart;
  int vertex=gl_VertexID%6;
  bool atEnd=vertex==1 || vertex==2 || vertex==4;
  bool positiveSide=vertex==2 || vertex==4 || vertex==5;
  float guard=1.2;
  vHalfWidth=halfWidth*uZoom;
  vLength=lengthWorld*uZoom;
  vCross=(positiveSide?1.0:-1.0)*(vHalfWidth+guard);
  vAlong=(atEnd?vLength:0.0)+(atEnd?guard:-guard);
  vec2 worldCenter=start+(atEnd?along*lengthWorld:vec2(0.0));
  vec2 pixel=(worldCenter-uCamera)*uZoom+crossDir*vCross+along*(atEnd?guard:-guard);
  gl_Position=vec4(pixel.x*2.0/uResolution.x,-pixel.y*2.0/uResolution.y,aInfo.w,1.0);
  vInk=aInk;
}`;
const FRAGMENT = `#version 300 es
precision highp float;
in float vCross;
in float vAlong;
flat in float vLength;
flat in float vHalfWidth;
flat in vec4 vInk;
flat in float vValid;
uniform vec4 uInk;
out vec4 outColor;
void main(){
  vec4 ink=vInk.a<0.0?uInk:vInk;
  // Distance to a rectangle in screen pixels: ends are always perpendicular
  // to the hatch, independent of the angle of the polygon boundary.
  float across=abs(vCross)-vHalfWidth;
  float pastEnds=max(-vAlong,vAlong-vLength);
  float outside=max(across,pastEnds);
  float coverage=1.0-smoothstep(-0.5,0.5,outside);
  outColor=vec4(ink.rgb,ink.a*coverage*vValid);
}`;
function shader(gl, type, source) {
  const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;
}
function program(gl, vertex, fragment) {
  const p=gl.createProgram(),v=shader(gl,gl.VERTEX_SHADER,vertex),f=shader(gl,gl.FRAGMENT_SHADER,fragment);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
}
export function hexColor(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex))throw new Error('Color must be #RRGGBB');
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
}

/** Growable typed instance array: avoids the temporary boxed-number array and
 * conversion that previously cost several milliseconds for large scenes. */
class StrokeBuffer {
  constructor(estimate) {
    this.data=new Float32Array(Math.max(96,estimate*12));
    this.length=0;
  }
  add(a,b,sa,sb,width,depth,color,alpha) {
    this.addCoords(a[0],a[1],b[0],b[1],sa,sb,width,depth,color,alpha);
  }
  addCoords(x0,y0,x1,y1,sa,sb,width,depth,color,alpha) {
    let i=this.length;
    if(i+12>this.data.length){
      const next=new Float32Array(Math.max(this.data.length*2,i+12));
      next.set(this.data);this.data=next;
    }
    const d=this.data;
    d[i++]=x0;d[i++]=y0;d[i++]=x1;d[i++]=y1;
    d[i++]=width;d[i++]=sa;d[i++]=sb;d[i++]=depth;
    d[i++]=color[0];d[i++]=color[1];d[i++]=color[2];d[i++]=alpha;
    this.length=i;
  }
  get count(){return this.length/12;}
  view(){return this.data.subarray(0,this.length);}
}

/**
 * Renders square-capped hatch line segments in one instanced WebGL2 draw call.
 * Polygons can be concave and include holes; strokes are clipped on the CPU
 * when hatch angle/spacing/phase changes, not on every rendered frame.
 * Scene objects are ordered nearest first: polygon {points|rings},
 * {type:'line',start,end}, {type:'path',points,closed?}, or
 * {type:'segments',segments}. Lines/paths never generate hatches or fill depth.
 * Per-polygon hatch: {angle, spacing, lineWidth, color, opacity, phase}.
 * Plain strokes: {stroke:{color,lineWidth,opacity}} or fields at top level.
 */
export class HatchRenderer {
  constructor(canvas, options={}) {
    this.canvas=canvas;
    this.gl=canvas.getContext('webgl2',{alpha:false,depth:false,antialias:false,preserveDrawingBuffer:false});
    if(!this.gl)throw new Error('WebGL2 is not available');
    const gl=this.gl;
    this.program=program(gl,VERTEX,FRAGMENT);
    // Both hatches and outlines use the same square-cap instanced shader.
    // There is no depth/stencil mask: only CPU boolean clipping hides marks.
    this.mesh=gl.createBuffer();this.lines=gl.createBuffer();
    this.camera={x:0,y:0,zoom:1};
    this.style={angle:45,spacing:7,lineWidth:1.3,color:'#242d30',angleJitter:0,placementJitter:0,lengthJitter:0,connectZigzag:false,...options};
    this.background=hexColor(options.background??'#f7f6f0');
    this.showOutlines=false;
    this.occlusion=options.occlusion??false; // Input array order: nearest to farthest
    this.bounds={minX:0,minY:0,maxX:100,maxY:100};
    this.polygons=[];this.polygonRings=[];this.polygonBoxes=[];this.itemSegments=[];this.lineObjectCount=0;this.polygonCount=0;this.coverageDensity=0;
    this.stats={polygons:0,strokes:0,triangles:0,vertices:0,drawCalls:0,meshMs:0,hatchMs:0,occlusionMs:0,uploadMs:0,clipMs:0};
    this.meshMs=0;
    this.lineVertices=0;this.outlineCount=0;this.surfaceVertices=0;
    this.timerExt=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pendingGpu=[];this.frameNumber=0;
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }
  setStyle(partial) {
    const angleChanged=('angle' in partial&&partial.angle!==this.style.angle);
    const spacingChanged=('spacing' in partial&&partial.spacing!==this.style.spacing);
    const phaseChanged=('phase' in partial&&partial.phase!==this.style.phase);
    const angleJitterChanged=('angleJitter' in partial&&partial.angleJitter!==this.style.angleJitter);
    const placementJitterChanged=('placementJitter' in partial&&partial.placementJitter!==this.style.placementJitter);
    const lengthJitterChanged=('lengthJitter' in partial&&partial.lengthJitter!==this.style.lengthJitter);
    const connectZigzagChanged=('connectZigzag' in partial&&partial.connectZigzag!==this.style.connectZigzag);
    const lineInkChanged=('color' in partial&&partial.color!==this.style.color)&&this.itemSegments.some((segs,i)=>{
      if(!segs)return false;const item=this.polygons[i],stroke=item.stroke??item.style??item;
      return (stroke.color??item.color)==null && (stroke.opacity??item.opacity??1)!==1;
    });
    const previousWidth=this.style.lineWidth;
    Object.assign(this.style,partial);
    const widthChanged=('lineWidth' in partial&&partial.lineWidth!==previousWidth);
    // Wide-stroke boolean subtraction uses actual world-space thickness.
    // A width change therefore recomputes *occluded* fragments, but source
    // hatches still keep their original endpoints and length.
    if((angleJitterChanged||placementJitterChanged||lengthJitterChanged)&&this.occlusion)this.rebuildGeometry();
    if(angleChanged||spacingChanged||phaseChanged||angleJitterChanged||placementJitterChanged||lengthJitterChanged||connectZigzagChanged||lineInkChanged||(widthChanged&&this.occlusion))this.rebuildStrokes();
  }
  setOcclusion(enabled) {
    const value=Boolean(enabled);
    if(value!==this.occlusion){this.occlusion=value;this.rebuildGeometry();this.rebuildStrokes();}
  }
  /** Set a mixed front-to-back scene of polygons, unhatched lines and paths. */
  setScene(items){return this.setPolygons(items);}
  /** Legacy name retained for all-polygon callers; now accepts mixed items. */
  setPolygons(items) {
    if(!Array.isArray(items))throw new Error('Expected a scene array');
    const rings=[],boxes=[],segments=[];
    let polygonCount=0,lineObjectCount=0;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,coveredArea=0;
    for(const item of items){
      if(!item||typeof item!=='object')throw new Error('Invalid scene object');
      let r=null,strokes=null,bounds;
      if(isLineObject(item)){
        strokes=getLineStrokes(item);
        if(!strokes.length)throw new Error('Line/path must contain at least one non-zero segment');
        bounds=lineStrokesBounds(strokes);lineObjectCount++;
      }else if(item.type==null||item.type==='polygon'){
        r=getRings(item);bounds=ringBounds(r);polygonCount++;
        coveredArea+=(bounds.maxX-bounds.minX)*(bounds.maxY-bounds.minY);
      }else throw new Error(`Unknown scene object type: ${item.type}`);
      rings.push(r);segments.push(strokes);boxes.push(bounds);
      minX=Math.min(minX,bounds.minX);minY=Math.min(minY,bounds.minY);
      maxX=Math.max(maxX,bounds.maxX);maxY=Math.max(maxY,bounds.maxY);
    }
    this.polygons=items;this.polygonRings=rings;this.polygonBoxes=boxes;
    this.itemSegments=segments;this.polygonCount=polygonCount;this.lineObjectCount=lineObjectCount;
    this.bounds=Number.isFinite(minX)?{minX,minY,maxX,maxY}:{minX:0,minY:0,maxX:100,maxY:100};
    this.coverageDensity=coveredArea/Math.max(1,(this.bounds.maxX-this.bounds.minX)*(this.bounds.maxY-this.bounds.minY));
    this.rebuildGeometry();this.rebuildStrokes();
    return this.stats;
  }
  /** Fully-covered tile culling is only an optional conservative speedup;
   * it never masks or trims a stroke. Clipping is solely performed by the
   * full-width polygon boolean subtractor in rebuildStrokes().
   */
  rebuildGeometry(){
    const started=performance.now(),n=this.polygons.length;
    const useTiles=this.occlusion&&n>=5000&&this.coverageDensity>=4;
    const coverage=useTiles?new ConservativeCoverage(this.bounds,6):null;
    const hidden=new Uint8Array(n);
    let skipped=0;
    if(coverage){
      for(let i=0;i<n;i++){
        const rings=this.polygonRings[i];
        if(!rings)continue;
        const box=this.polygonBoxes[i],hatch=this.polygons[i].hatch??{};
        const aj=Math.abs(hatch.angleJitter??this.style.angleJitter??0);
        const pj=Math.abs(hatch.placementJitter??this.style.placementJitter??0);
        const lj=Math.abs(hatch.lengthJitter??this.style.lengthJitter??0);
        const diameter=Math.hypot(box.maxX-box.minX,box.maxY-box.minY);
        const reach=pj+diameter*Math.sin(Math.min(180,aj)*Math.PI/360)
          +diameter*lj/200;
        const testBounds=reach>0
          ?{minX:box.minX-reach,minY:box.minY-reach,maxX:box.maxX+reach,maxY:box.maxY+reach}:box;
        if(coverage.covers(testBounds)){hidden[i]=1;skipped++;continue;}
        const coords=[],holes=[];
        for(let j=0;j<rings.length;j++){
          if(j)holes.push(coords.length/2);
          for(const p of rings[j])coords.push(p[0],p[1]);
        }
        const indices=earcut(coords,holes,2);
        for(let k=0;k<indices.length;k+=3){
          const a=indices[k]*2,b=indices[k+1]*2,c=indices[k+2]*2;
          coverage.addTriangle(coords[a],coords[a+1],coords[b],coords[b+1],coords[c],coords[c+1]);
        }
      }
    }
    this.geometryHidden=hidden;this.geometrySkipped=skipped;
    this.surfaceVertices=0; // GPU polygon-depth masking is intentionally gone.
    this.meshMs=performance.now()-started;
  }

  /** Clip a whole thick-stroke rectangle before uploading it to the GPU.
   * Fragments always have perpendicular square ends, including when their
   * centerline would pass OUTSIDE a small foreground grass triangle.
   */
  rebuildStrokes(){
    const started=performance.now(),n=this.polygons.length;
    const data=new StrokeBuffer(n*(this.occlusion&&this.coverageDensity>=2?2:9));
    const outlines=new StrokeBuffer(n*4);
    const occluders=this.occlusion?new OccluderIndex(this.bounds,n,this.style.occlusionCellSize??null):null;
    const outlineInk=[0.16,0.19,0.2],outlineWidth=1;
    const safety=0.5; // Subpixel AA allowance in world units around a thick stroke.
    let rawStrokes=0,skippedPolygons=0,clipMs=0,hatchMs=0,outlineSegments=0;
    const inflate=(bounds,amount)=>({
      minX:bounds.minX-amount,minY:bounds.minY-amount,
      maxX:bounds.maxX+amount,maxY:bounds.maxY+amount
    });
    const packed=(buffer,stroke,width,depth,color,alpha)=>{
      const [a,b,sa,sb]=stroke;
      buffer.add(a,b,sa??0,sb??0,width,depth,color,alpha);
    };
    for(let i=0;i<n;i++){
      if(this.occlusion&&this.geometryHidden?.[i]){skippedPolygons++;continue;}
      const item=this.polygons[i],rings=this.polygonRings[i];
      const depth=(2*i+1)/(n+1)-1;
      if(this.itemSegments[i]){
        const declared=item.stroke??item.style??item;
        const width=declared.lineWidth??item.lineWidth??-1;
        const colorValue=declared.color??item.color;
        const opacity=declared.opacity??item.opacity??1;
        if(!Number.isFinite(width)||(width!==-1&&width<0))throw new Error('Invalid line/path width');
        if(!Number.isFinite(opacity)||opacity<0||opacity>1)throw new Error('Invalid line/path opacity');
        const color=colorValue?hexColor(colorValue):hexColor(this.style.color);
        const alpha=colorValue||opacity!==1?opacity:-1;
        const actualWidth=width<0?this.style.lineWidth:width;
        const halfWidth=Math.max(0,actualWidth)*0.5+safety;
        const near=occluders?occluders.query(inflate(this.polygonBoxes[i],halfWidth)):[];
        const begin=performance.now();
        for(const st of this.itemSegments[i]){
          rawStrokes++;
          const fragments=near.length?clipStrokeAgainstOccluders(st,near,halfWidth):[st];
          for(const fragment of fragments)packed(data,fragment,width,depth,color,alpha);
        }
        clipMs+=performance.now()-begin;
        continue;
      }
      const hatch=item.hatch??{};
      const angle=hatch.angle??this.style.angle,spacing=hatch.spacing??this.style.spacing;
      const phase=hatch.phase??this.style.phase??0;
      const angleJitter=Math.abs(hatch.angleJitter??this.style.angleJitter??0);
      const placementJitter=Math.abs(hatch.placementJitter??this.style.placementJitter??0);
      const lengthJitter=Math.abs(hatch.lengthJitter??this.style.lengthJitter??0);
      const connectZigzag=Boolean(hatch.connectZigzag??this.style.connectZigzag);
      const seed=hatch.seed??item.seed??i;
      const width=hatch.lineWidth??-1;
      if(![angleJitter,placementJitter,lengthJitter].every(Number.isFinite))throw new Error('Invalid hatch jitter');
      if(!Number.isFinite(width)||(width!==-1&&width<0))throw new Error('Invalid line width');
      const color=hatch.color?hexColor(hatch.color):[0,0,0];
      const alpha=hatch.color?(hatch.opacity??1):-1;
      if(!Number.isFinite(alpha)||alpha>1||alpha< -1)throw new Error('Invalid hatch opacity');
      const halfWidth=Math.max(0,width<0?this.style.lineWidth:width)*0.5+safety;
      const begin=performance.now();
      const hasJitter=angleJitter>0||placementJitter>0||lengthJitter>0;
      const source=hasJitter
        ?generateJitteredHatchStrokes(item,{angle,spacing,phase,angleJitter,placementJitter,lengthJitter,seed})
        :generateHatchStrokes(item,{angle,spacing,phase});
      const strokes=connectZigzag?connectZigZagStrokes(source):source;
      rawStrokes+=strokes.length;
      hatchMs+=performance.now()-begin;
      // Jittered and connected hatches can extend well beyond their polygon.
      // Query the exact finished centerline bounds, inflated by stroke width.
      let queryBox=this.polygonBoxes[i];
      if(strokes.length){
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        for(const [a,b] of strokes){
          minX=Math.min(minX,a[0],b[0]);minY=Math.min(minY,a[1],b[1]);
          maxX=Math.max(maxX,a[0],b[0]);maxY=Math.max(maxY,a[1],b[1]);
        }
        queryBox={minX,minY,maxX,maxY};
      }
      const near=occluders?occluders.query(inflate(queryBox,halfWidth)):[];
      const clipStart=performance.now();
      for(const st of strokes){
        const fragments=near.length?clipStrokeAgainstOccluders(st,near,halfWidth):[st];
        for(const fragment of fragments)packed(data,fragment,width,depth,color,alpha);
      }
      clipMs+=performance.now()-clipStart;

      // Outlines are also thick square-cap strokes. Apply the same CPU boolean
      // clipping against nearer shapes rather than GL.LINES / a depth mask.
      if(item.outline!==false){
        const outlineNear=occluders?occluders.query(inflate(this.polygonBoxes[i],outlineWidth*0.5+safety)):[];
        for(const ring of rings)for(let j=0;j<ring.length;j++){
          const a=ring[j],b=ring[(j+1)%ring.length];
          const base=[a,b,0,0];
          const fragments=outlineNear.length
            ?clipStrokeAgainstOccluders(base,outlineNear,outlineWidth*.5+safety):[base];
          for(const fragment of fragments){
            packed(outlines,fragment,outlineWidth,depth,outlineInk,0.45);
            outlineSegments++;
          }
        }
      }
      if(occluders)occluders.insert(item);
    }
    const upload=performance.now();
    const gl=this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER,this.mesh);
    gl.bufferData(gl.ARRAY_BUFFER,data.view(),gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.lines);
    gl.bufferData(gl.ARRAY_BUFFER,outlines.view(),gl.DYNAMIC_DRAW);
    const uploadMs=performance.now()-upload;
    this.outlineCount=outlines.count;
    this.lineVertices=outlines.count*2;
    this.surfaceVertices=0;
    const strokes=data.count;
    const total=performance.now()-started;
    this.stats={polygons:this.polygonCount,objects:n,lineObjects:this.lineObjectCount,
      strokes,rawStrokes,hiddenStrokes:Math.max(0,rawStrokes-strokes),skippedPolygons,
      triangles:strokes*2,vertices:strokes*6,drawCalls:0,
      meshMs:this.meshMs,hatchMs,occlusionMs:clipMs,uploadMs,
      packMs:Math.max(0,total-hatchMs-clipMs-uploadMs),clipMs:total,
      occlusion:this.occlusion,algorithm:this.occlusion?'boolean/full-width':'none',
      outlineStrokes:outlineSegments};
  }
  resize() {
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(1,Math.floor(this.canvas.clientWidth*dpr)),h=Math.max(1,Math.floor(this.canvas.clientHeight*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}
    this.gl.viewport(0,0,w,h);
  }
  fit(padding=52) {
    const {minX,minY,maxX,maxY}=this.bounds;
    const w=Math.max(1,this.canvas.clientWidth-2*padding),h=Math.max(1,this.canvas.clientHeight-2*padding);
    this.camera.x=(minX+maxX)/2;this.camera.y=(minY+maxY)/2;
    this.camera.zoom=Math.min(w/Math.max(1,maxX-minX),h/Math.max(1,maxY-minY),3);
  }
  zoomAt(multiplier,clientX,clientY) {
    const box=this.canvas.getBoundingClientRect(),c=this.camera;
    const sx=clientX-box.left-box.width/2,sy=clientY-box.top-box.height/2;
    const old=c.zoom;c.zoom=Math.max(0.02,Math.min(50,old*multiplier));
    c.x+=sx*(1/old-1/c.zoom);c.y+=sy*(1/old-1/c.zoom);
  }
  render() {
    const gl=this.gl,c=this.camera;
    this.resize();
    gl.clearColor(...this.background,1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if(!this.stats.strokes&&!(this.showOutlines&&this.outlineCount)){
      this.stats.drawCalls=0;return;
    }
    const ext=this.timerExt;
    if(ext&&this.pendingGpu.length){
      const query=this.pendingGpu[0];
      if(gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){
        if(!gl.getParameter(ext.GPU_DISJOINT_EXT))
          this.stats.gpuMs=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;
        gl.deleteQuery(query);this.pendingGpu.shift();
      }
    }
    let measuring=null;
    if(ext&&this.frameNumber++%30===0&&this.pendingGpu.length<3){
      measuring=gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT,measuring);
    }
    const res=[this.canvas.width,this.canvas.height];
    const zoom=c.zoom*(this.canvas.width/Math.max(1,this.canvas.clientWidth));
    this.stats.drawCalls=0;
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.program);
    gl.uniform2fv(gl.getUniformLocation(this.program,'uResolution'),res);
    gl.uniform2f(gl.getUniformLocation(this.program,'uCamera'),c.x,c.y);
    gl.uniform1f(gl.getUniformLocation(this.program,'uZoom'),zoom);
    gl.uniform1f(gl.getUniformLocation(this.program,'uLineWidth'),this.style.lineWidth);
    gl.uniform4fv(gl.getUniformLocation(this.program,'uInk'),[...hexColor(this.style.color),1]);
    const drawBuffer=(buffer,count)=>{
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      const stride=48;
      for(const [location,size,offset] of [[0,2,0],[1,2,8],[2,4,16],[3,4,32]]){
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location,size,gl.FLOAT,false,stride,offset);
        gl.vertexAttribDivisor(location,1);
      }
      gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);
      this.stats.drawCalls++;
    };
    if(this.stats.strokes)drawBuffer(this.mesh,this.stats.strokes);
    if(this.showOutlines&&this.outlineCount)drawBuffer(this.lines,this.outlineCount);
    if(measuring){gl.endQuery(ext.TIME_ELAPSED_EXT);this.pendingGpu.push(measuring);}
  }
  dispose() {
    const gl=this.gl;
    for(const query of this.pendingGpu)gl.deleteQuery(query);
    gl.deleteBuffer(this.mesh);gl.deleteBuffer(this.lines);
    gl.deleteProgram(this.program);
  }
}
