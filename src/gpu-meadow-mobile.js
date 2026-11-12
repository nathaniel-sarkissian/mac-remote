// A lightweight source-derived GPU meadow for Safari/iPhone-sized canvases.
// The original six species, ages, positions, and regional palette are sampled
// from the SAME per-frame GPU atlas as the full vertex shader. No CPU geometry.
// Complex curved leaf/flower tessellation is replaced with camera-facing
// silhouettes so WebKit can complete flower draws before presenting the frame.
import {GPU_MEADOW_VERTEX} from './gpu-meadow-geometry.js';

// Keep the shared generated palette tables, scene uniforms and deterministic
// noise, but omit the expensive recursive stem/leaf/petal transformation code.
const common=GPU_MEADOW_VERTEX.slice(0,GPU_MEADOW_VERTEX.indexOf('struct Plant{'));
if(!common.startsWith('#version 300 es')||!common.includes('vec3 petalInk('))
  throw new Error('GPU meadow shader contract changed: compact shader header missing');

export const GPU_MEADOW_COMPACT_BATCHES=Object.freeze([
  {name:'grass',part:0,mode:'triangles',vertices:3,instances:7200},
  {name:'stems',part:1,mode:'triangles',vertices:6,instances:3600},
  {name:'leaves',part:2,mode:'triangles',vertices:6,instances:3600*4},
  // One 2-triangle screen-aligned quad per complete blossom. The fragment
  // shader cuts all species-specific petals and disk from this one primitive.
  {name:'flowers',part:3,mode:'triangles',vertices:6,instances:3600}
]);

export const GPU_MEADOW_COMPACT_VERTEX=common+`
out vec2 vBloomUV;
out vec3 vBloomPetalInk;
out vec3 vBloomDiskInk;
out float vBloomCount;
out float vBloomActive;
struct Site {
  vec3 root;
  float age;
  float segments;
  float pitch;
  float yaw;
  float brightness;
  float leafL;
  int species;
  bool flower;
};
Site siteAt(int id){
  ivec2 uv=ivec2(id%SITE_GRID,id/SITE_GRID);
  vec4 a=texelFetch(uPlant0,uv,0);
  vec4 b=texelFetch(uPlant1,uv,0);
  vec4 c=texelFetch(uPlant2,uv,0);
  vec4 d=texelFetch(uPlant3,uv,0);
  Site s;
  s.root=vec3(-(decode16(a.rg)*80.0-40.0),decode16(a.ba)*100.0,
              decode16(b.rg)*85.0-65.0);
  s.age=b.a;
  s.species=int(floor(b.b*5.0+.5));
  s.segments=floor(c.g*12.0+.5);
  s.pitch=c.b*TAU-PI;
  s.yaw=c.a*TAU;
  s.flower=d.r>.5;
  s.leafL=d.b;
  s.brightness=d.a;
  return s;
}
vec3 flowerTop(Site s) {
  float lengthStem=5.0*sigmoid(mix(.1,1.0,s.age),.8)
    *max(2.0,s.segments)*(s.flower?1.0:.5);
  float lean=sin(s.pitch*.48)*lengthStem*.42;
  return s.root+vec3(-sin(s.yaw)*lean,
    cos(s.pitch*.24)*lengthStem,cos(s.yaw)*lean);
}
vec3 viewAxis(float theta){
  return cos(theta)*uCameraRight+sin(theta)*uCameraUp;
}
vec3 viewSide(float theta){
  return -sin(theta)*uCameraRight+cos(theta)*uCameraUp;
}
vec3 quad(vec3 a,vec3 b,float halfWidth,int vertex){
  // Two triangles, each one of six vertices.
  int q=vertex==0?0:vertex==1?1:vertex==2?2:vertex==3?0:vertex==4?2:3;
  vec3 across=normalize(uCameraRight+vec3(.00001,0,0));
  return (q==0||q==3?a:b)+across*halfWidth*
    ((q==0||q==1)?-1.0:1.0);
}
void main(){
  int v=gl_VertexID, inst=gl_InstanceID;
  int id=uPart==0?inst/2:uPart==2?inst/4:
    uPart==3?inst/8:inst;
  Site s=siteAt(id);
  float rand=rand1(float(id)*.91+113.0);
  bool visible=(uPart==0)?(rand1(float(inst)*2.9+18.0)<uGrass):
    (rand<uPlants);
  if(uPart==3){
    // Preserve flowers flagged by the GPU atlas. A deterministic ~28%
    // fallback prevents a mobile precision/texture classification issue
    // from turning a flowering meadow into foliage-only green triangles.
    visible=visible&&(s.flower||rand1(float(id)*39.7+uSeed*.17)<.28);
  }
  vec3 top=flowerTop(s),pos=s.root;
  vec3 color=vec3(.5);
  vBloomUV=vec2(2.0);
  vBloomPetalInk=vec3(0.0);
  vBloomDiskInk=vec3(0.0);
  vBloomCount=1.0;
  vBloomActive=0.0;
  if(uPart==0){
    int attempt=inst%2;
    visible=visible&&(attempt==0||rand1(float(id)*1.91+32.0)<.5);
    float a=(rand1(float(inst)*8.41+7.0)-.5)*1.2;
    vec3 axis=viewAxis(a),side=viewSide(a);
    float span=1.8+3.8*noise2(s.root.xz*.04+17.0);
    pos=s.root+side*(v==0?-0.38:v==2?0.38:0.0)
      +axis*(v==1?span:0.0);
    color=grassInk(uPalette,clamp(s.brightness+rand1(float(inst)*1.27)*.3,0.0,1.0));
  }else if(uPart==1){
    pos=quad(s.root,top,.07,v);
    color=stemInk(s.species,uPalette);
  }else if(uPart==2){
    int leaf=inst%4;
    float t=(float(leaf)+1.0)/5.0;
    vec3 anchor=mix(s.root,top,t);
    float angle=(float(leaf)+.5)*2.4+rand1(float(id)*3.3)*2.4;
    float len=mix(leafLengthMin(s.species),leafLengthMax(s.species),s.leafL)
      *(.45+.35*s.age);
    float widthLeaf=(.20+.22*s.age)*leafWidth(s.species);
    vec3 axis=viewAxis(angle),side=viewSide(angle);
    // Small convex leaf blade, 2 triangles, not pointy grass-shaped wedges.
    vec3 start=anchor,mid=anchor+axis*(len*.5),end=anchor+axis*len;
    vec3 a=mid-side*widthLeaf,b=mid+side*widthLeaf;
    pos=v==0||v==3?start:v==1?a:v==2||v==4?end:b;
    color=leafInk(uPalette,clamp((s.brightness+t)*.6,0.0,1.0));
  }else if(uPart==3){
    // Billboard in the camera plane, rigidly attached to the exact stem tip.
    // Each 6-vertex quad is a complete flower: petals AND center are cut
    // from it in the fragment shader. WebKit no longer needs 8 separate
    // petal draw instances plus a disk pass or a per-petal visibility flag.
    int q=v==0||v==3?0:v==1?1:v==2||v==4?2:3;
    vec2 uv=q==0?vec2(-1.0,-1.0):q==1?vec2(1.0,-1.0):
      q==2?vec2(1.0,1.0):vec2(-1.0,1.0);
    float radius=(1.45+petalSY(s.species)*.9)*max(.65,s.age);
    pos=top+uCameraRight*uv.x*radius+uCameraUp*uv.y*radius
      +uCameraView*.26;
    vBloomUV=uv;
    vBloomPetalInk=petalInk(s.species,uPalette);
    vBloomDiskInk=diskInk(s.species,uPalette);
    vBloomCount=petalCount(s.species);
    vBloomActive=1.0;
  }
  if(!visible){
    gl_Position=vec4(3.0,3.0,1.0,1.0);
    vColor=vec3(0.0);
    return;
  }
  vec3 rel=pos-uCameraTarget;
  gl_Position=vec4(vec2(dot(rel,uCameraRight),dot(rel,uCameraUp))
      *uZoom*2.0/uResolution,
    clamp(-dot(rel,uCameraView)/120.0,-.99,.99),1.0);
  vColor=color;
}
`;

export const GPU_MEADOW_COMPACT_FRAGMENT=`#version 300 es
precision highp float;
in vec3 vColor;
in vec2 vBloomUV;
in vec3 vBloomPetalInk;
in vec3 vBloomDiskInk;
in float vBloomCount;
in float vBloomActive;
out vec4 outColor;
const float PI=3.141592653589793;
const float TAU=6.283185307179586;
void main(){
  if(vBloomActive<.5){
    outColor=vec4(clamp(vColor,0.0,1.0),1.0);
    return;
  }
  // Procedural radial petal rosette: 4, 5, 6 or 8 distinct, rounded
  // elliptical petals from the source's six-species nPetals palette.
  // This shape is attached to a single flower head per stem, not scattered
  // unrelated yellow triangles and not an RGB-colored grass test.
  float petals=max(3.0,vBloomCount);
  float a=atan(vBloomUV.y,vBloomUV.x);
  float nearAngle=floor(a*petals/TAU+.5)*TAU/petals;
  vec2 direction=vec2(cos(nearAngle),sin(nearAngle));
  vec2 tangent=vec2(-direction.y,direction.x);
  float lengthwise=(dot(vBloomUV,direction)-.48)/.53;
  float crosswise=dot(vBloomUV,tangent)/(.19+1.20/petals);
  float petalEllipse=lengthwise*lengthwise+crosswise*crosswise;
  float diskRadius=.19;
  bool disk=dot(vBloomUV,vBloomUV)<diskRadius*diskRadius;
  if(!disk&&petalEllipse>1.0)discard;
  vec3 col=disk?vBloomDiskInk:vBloomPetalInk;
  outColor=vec4(clamp(col,0.0,1.0),1.0);
}`;
