// GPU generation of the original Never the Same (2025) *geometry*.
// All planting sites, stem segments, leaves, petals and disk vertices
// originate in shaders. Source: src/never-the-same-geometry.js.
// Uses one GPU stem-position atlas so the source's incremental rotations
// are calculated ONCE per stem joint, not on each visible polygon vertex.
import {GPU_MEADOW_VERTEX} from './gpu-meadow-geometry.js';
const structStart=GPU_MEADOW_VERTEX.indexOf('struct Plant{');
const rotationStart=GPU_MEADOW_VERTEX.indexOf('vec3 rotateOriginal(',structStart);
const rotationEnd=GPU_MEADOW_VERTEX.indexOf('float stemSegmentLength(',rotationStart);
if(structStart<0||rotationStart<0||rotationEnd<0)
  throw new Error('Source GPU plant shader contract changed');
const header=GPU_MEADOW_VERTEX.slice(0,structStart);
const plant=GPU_MEADOW_VERTEX.slice(structStart,GPU_MEADOW_VERTEX.indexOf('// The archived art',structStart));
const rotate=GPU_MEADOW_VERTEX.slice(rotationStart,rotationEnd);
const sourceHeader=header+plant+rotate;

export const SOURCE_STEM_JOINTS=13;
export const SOURCE_GPU_BATCHES=Object.freeze([
  {name:'grass',part:0,mode:'triangles',vertices:3,instances:7200},
  {name:'stems',part:1,mode:'triangles',vertices:12*6,instances:3600},
  {name:'leaves',part:2,mode:'fan',vertices:15,instances:3600*16},
  {name:'petals',part:3,mode:'fan',vertices:15,instances:3600*13},
  // In the source, ceil(offset*age*3) is always < 6; disk() clamps to 6.
  {name:'disks',part:4,mode:'fan',vertices:8,instances:3600*3}
]);

export const SOURCE_STEM_PREPASS_VERTEX=`#version 300 es
precision highp float;
void main(){
  vec2 p=vec2(gl_VertexID==1?3.0:-1.0,gl_VertexID==2?3.0:-1.0);
  gl_Position=vec4(p,0.0,1.0);
}`;

// This atlas has 60 columns by 780 rows: 13 exact incremental joints
// for each of 3,600 plants. Two RGBA8 textures encode XYZ to 16-bit
// fixed point, avoiding EXT_color_buffer_float on iPhone/WebGL2.
export const SOURCE_STEM_PREPASS_FRAGMENT=sourceHeader.replace('out vec3 vColor;','')+`
layout(location=0) out vec4 stemXY;
layout(location=1) out vec4 stemZ;
float wrappedAngleStep(float current,float target,float divisor){
  float delta=target-current;
  if(delta>PI)delta-=TAU;
  else if(delta< -PI)delta+=TAU;
  return delta/max(divisor,.00001);
}
void main(){
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int site=(pixel.y/13)*60+pixel.x;
  int joint=pixel.y%13;
  Plant p=plantAt(site);
  float n=max(2.0,p.count);
  float segLength=5.0*sigmoid(mix(.1,1.0,p.age),.8)*(p.flower?1.0:.5);
  vec3 current=p.root;
  vec3 step=vec3(0.0,-segLength,0.0);
  float pitch=0.0,yaw=0.0;
  for(int i=0;i<12;i++){
    if(i>=joint||float(i)>=n)break;
    // Exact source Flower.flower() progression; rotate the PREVIOUS step
    // by the incremental pitch/yaw rather than linearly interpolating a
    // single bent line from the root to the flower head.
    float remaining=mix(n,1.0,float(i)/max(n-1.0,1.0));
    float dp=wrappedAngleStep(pitch,p.pitch,remaining);
    float dy=wrappedAngleStep(yaw,p.yaw,remaining);
    pitch+=dp;
    yaw+=dy;
    step=rotateOriginal(rotateOriginal(step,dp,0.0,0.0),0.0,dy,0.0);
    current+=step;
  }
  stemXY=vec4(encode16((current.x+70.0)/140.0),
              encode16((current.y+170.0)/200.0));
  stemZ=vec4(encode16((current.z+90.0)/160.0),0.0,1.0);
}`;

export const SOURCE_GPU_VERTEX=sourceHeader+`
uniform sampler2D uStemXY;
uniform sampler2D uStemZ;
vec3 sourceJoint(int id,int joint){
  ivec2 uv=ivec2(id%60,(id/60)*13+clamp(joint,0,12));
  vec4 a=texelFetch(uStemXY,uv,0);
  vec4 b=texelFetch(uStemZ,uv,0);
  return vec3(decode16(a.rg)*140.0-70.0,
              decode16(a.ba)*200.0-170.0,
              decode16(b.rg)*160.0-90.0);
}
vec3 finiteUnit(vec3 v){
  float m=length(v);
  return m>0.00003?v/m:vec3(0.0,-1.0,0.0);
}
vec3 sourceOutline(int index,float taper){
  float a=TAU*float(index%13)/13.0;
  float along=(cos(a)+1.0)*.5;
  return vec3(sin(a)*mix(1.0,taper,along),
              cos(a)+1.0,-sqrt(max(0.0,1.0-(1.0-along)*(1.0-along))));
}
vec3 leafAt(Plant p,int id,int leaf,int point){
  int segment=p.flower?leaf:leaf/2;
  int k=p.flower?0:leaf%2;
  vec3 before=sourceJoint(id,segment);
  vec3 after=sourceJoint(id,segment+1);
  vec3 step=after-before;
  vec3 normal=finiteUnit(step);
  // The source's 13-point leaf shape, age-dependent lifting, and original
  // orientation order (X, then Z, then Y, twist, stem pitch and yaw).
  float scale=mix(.75,.5,float(segment)/max(p.count,1.0))*
    clamp(p.age-.5*float(segment)/max(p.count,1.0),0.0,1.0);
  vec3 size=vec3(leafWidth(p.species),
    mix(leafLengthMin(p.species),leafLengthMax(p.species),p.leafL),
    mix(leafHeightMin(p.species),leafHeightMax(p.species),p.leafL))*scale;
  vec3 q=sourceOutline(point,1.0)*size;
  q=rotateOriginal(q,p.age*PI*.5+PI*.25,0.0,PI*.5);
  q=rotateOriginal(q,0.0,PI*.5,0.0);
  float twist=noise2(vec2(p.root.x*.097+float(segment),
                         p.root.z*.097+float(k)*10.0))*2.0-1.0;
  q=rotateOriginal(q,0.0,0.0,twist*TAU);
  q=rotateOriginal(q,atan(normal.y,length(normal.xz)),0.0,0.0);
  q=rotateOriginal(q,0.0,-atan(normal.x,normal.z),0.0);
  float placement=noise2(vec2(float(k)*100.0,0.0));
  // Original adds one additional signed-noise step displacement.
  return mix(before,after,placement)-step*twist+q;
}
vec3 petalAt(Plant p,int id,int layer,int petal,int point){
  int layers=int(layerCount(p.species));
  int total=int(floor(petalCount(p.species)*
    mix(.8,1.0,float(layer)/float(layers))+.5));
  float radial=float(petal)*TAU/max(float(total),1.0)+PI*.5+float(layer)*PI/8.0;
  float age=p.age;
  float sz=age>.2?pow(mix(.5,1.0,clamp((age-.2)/.8,0.0,1.0)),2.0):
    pow(mix(0.0,.5,age/.2),4.0);
  vec3 q=sourceOutline(point,petalTaper(p.species))*
    vec3(petalSX(p.species),petalSY(p.species),petalSZ(p.species))*sz;
  // Identical petal() rotation progression from recovered original.
  float layerPitch=-pow(float(layer)/float(layers),.8)*PI*.5*sigmoid(age,.8);
  q=rotateOriginal(q,layerPitch+sqrt(max(0.0,1.0-age))*PI-PI/10.0,0.0,0.0);
  q=rotateOriginal(q,0.0,0.0,radial);
  q+=rotateOriginal(vec3(headOffset(p.species)*age,0.0,0.0),
                    0.0,0.0,radial+PI*.5);
  vec3 t=finiteUnit(sourceJoint(id,int(p.count))-sourceJoint(id,int(p.count)-1));
  q=rotateOriginal(q,PI*.5,0.0,0.0);
  q=rotateOriginal(q,atan(t.y,length(t.xz))+PI*.5,0.0,0.0);
  q=rotateOriginal(q,0.0,-atan(t.x,t.z)+PI,0.0);
  return sourceJoint(id,int(p.count))+q;
}
vec3 diskAt(Plant p,int id,int point){
  float a=TAU*float(point%6)/6.0;
  float r=(headOffset(p.species)+.8)*p.age;
  vec3 q=vec3(sin(a)*r,cos(a)*r,0.0);
  vec3 t=finiteUnit(sourceJoint(id,int(p.count))-sourceJoint(id,int(p.count)-1));
  q=rotateOriginal(q,PI*.5,0.0,0.0);
  q=rotateOriginal(q,atan(t.y,length(t.xz))+PI*.5,0.0,0.0);
  q=rotateOriginal(q,0.0,-atan(t.x,t.z)+PI,0.0);
  return sourceJoint(id,int(p.count))+q;
}
vec3 grassAt(Plant p,int corner){
  // grassShape() in the source draws one vertical 2D triangle directly
  // after _3dTo2d(). Embed those exact three screen coordinates in 3D.
  float h=mix(5.0,15.0,noise2(p.root.xz*.04+vec2(543232.0,6544121.0)));
  float a=(fractal(p.root.xz*.01,2.0,.8,3)*2.0-1.0)*PI/3.0+
    (fractal(p.root.xz*.01+vec2(.21,.37),2.0,.8,3)*2.0-1.0)*PI/3.0*.48*.75;
  vec2 local=corner==0?vec2(-1.25,0.0):
             corner==1?vec2(0.0,-h*.5):vec2(1.25,0.0);
  vec2 shifted=vec2(local.x*cos(a)-local.y*sin(a),
                    local.x*sin(a)+local.y*cos(a));
  return p.root+vec3(shifted.x,shifted.y/.707106781,0.0);
}
void main(){
  int vertex=gl_VertexID,instance=gl_InstanceID;
  int id=uPart==0?instance/2:
         uPart==2?instance/16:
         uPart==3?instance/13:
         uPart==4?instance/3:instance;
  Plant p=plantAt(id);
  bool visible=uPart==0?
    rand1(float(instance)*2.9+18.0)<uGrass:
    rand1(float(id)*.91+113.0)<uPlants;
  if(uPart>=3)visible=visible&&p.flower;
  vec3 position=p.root;
  vec3 ink=vec3(.5);
  if(uPart==0){
    float threshold=fractal(vec2(p.root.x*.02+5432.0,
      p.root.z*.08+654321.0),4.0,.25,1)*2.0-1.0;
    float bladeCount=clamp(1.5-.5*(threshold-uFlowerThreshold),1.0,2.0);
    if(instance%2==1&&bladeCount<=1.5)visible=false;
    position=grassAt(p,vertex);
    ink=grassInk(uPalette,clamp(p.brightness+
      (rand1(float(instance)*1.87)-.5)*.6,0.0,1.0));
  }else if(uPart==1){
    int segment=vertex/6;
    if(float(segment)>=p.count)visible=false;
    int q=vertex%6;
    int endpoint=q==0||q==3?0:1;
    vec3 a=sourceJoint(id,segment+endpoint);
    vec3 tangent=finiteUnit(sourceJoint(id,segment+1)-sourceJoint(id,segment));
    // The original stems are unhatched 2-point paths.
    // Thin eye-facing quads emulate the stroke without a CPU line array.
    vec3 side=finiteUnit(cross(tangent,uCameraView));
    position=a+side*((q==0||q==1)?-.10:.10);
    ink=stemInk(p.species,uPalette);
  }else if(uPart==2){
    int leaf=instance%16,segment=p.flower?leaf:leaf/2;
    if(float(segment)>=p.count)visible=false;
    position=vertex==0?
      mix(leafAt(p,id,leaf,0),leafAt(p,id,leaf,6),.5):
      leafAt(p,id,leaf,(vertex-1)%13);
    float rank=sqrt(max(0.0,
      mix(p.brightness*.4,1.0,float(segment)/max(p.count,1.0))))*
      (.5+.5*p.brightness);
    ink=leafInk(uPalette,clamp(rank,0.0,1.0));
  }else if(uPart==3){
    int cursor=instance%13,layer=-1,petal=0;
    int layers=int(layerCount(p.species));
    for(int k=0;k<3;k++){
      if(k>=layers)break;
      int count=int(floor(petalCount(p.species)*
        mix(.8,1.0,float(k)/float(layers))+.5));
      if(cursor<count){layer=k;petal=cursor;break;}
      cursor-=count;
    }
    if(layer<0)visible=false;
    // Older blooms drop some petals in the source; younger heads keep all.
    float pick=rand1(float(id)*23.1+float(petal)*5.6+float(layer)*1.3);
    if(pick>= (p.age<.5?1.0:mix(1.0,.20,clamp((p.age-.5)/.5,0.0,1.0))))
      visible=false;
    if(visible)position=vertex==0?
      mix(petalAt(p,id,layer,petal,0),petalAt(p,id,layer,petal,6),.5):
      petalAt(p,id,layer,petal,(vertex-1)%13);
    ink=petalInk(p.species,uPalette);
  }else{
    int layer=instance%3;
    if(float(layer)>=layerCount(p.species))visible=false;
    if(visible)position=vertex==0?
      sourceJoint(id,int(p.count)):
      diskAt(p,id,(vertex-1)%6);
    ink=diskInk(p.species,uPalette);
  }
  if(!visible){gl_Position=vec4(3.0,3.0,1.0,1.0);vColor=vec3(0);return;}
  vec3 world=vec3(-position.x,-position.y,position.z);
  vec3 rel=world-uCameraTarget;
  gl_Position=vec4(vec2(dot(rel,uCameraRight),dot(rel,uCameraUp))*
    uZoom*2.0/uResolution,
    clamp(-dot(rel,uCameraView)/120.0,-.99,.99),1.0);
  vColor=ink;
}
`;
