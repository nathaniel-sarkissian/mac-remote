// GPU version of the archived Never the Same meadow's geometry.
// Source parameters and palettes are transcribed from the recovered 2025
// src/never-the-same-geometry.js; only seeded noise implementation and
// analytic stem integration differ. No CPU shape arrays or hatching.
export const ORIGINAL_SPECIES=[
  {
    "size": [
      0.75,
      0.75,
      0.75
    ],
    "stemMax": 5,
    "petals": 6,
    "layers": 2,
    "offset": 0.09375,
    "taper": 1,
    "flowerChance": 0.85,
    "leafLength": [
      4,
      7
    ],
    "leafWidth": 1,
    "leafHeight": [
      1,
      5
    ],
    "petalColors": [
      "#ffbf00",
      "#fa6b73",
      "#f7a295",
      "#f89807"
    ],
    "diskColors": [
      "#462b00",
      "#462b00",
      "#462b00",
      "#462b00"
    ],
    "stemColors": [
      "#71826f",
      "#6a7d71",
      "#657ca3",
      "#d09424"
    ]
  },
  {
    "size": [
      1.75,
      1.75,
      1.75
    ],
    "stemMax": 8,
    "petals": 4,
    "layers": 2,
    "offset": 0.375,
    "taper": 1,
    "flowerChance": 0.82,
    "leafLength": [
      4,
      7
    ],
    "leafWidth": 0.75,
    "leafHeight": [
      1,
      5
    ],
    "petalColors": [
      "#e3e1d9",
      "#e3e1d9",
      "#e3e1d9",
      "#e3e1d9"
    ],
    "diskColors": [
      "#ee8e00",
      "#ee8e00",
      "#ee8e00",
      "#ee8e00"
    ],
    "stemColors": [
      "#97a695",
      "#798e82",
      "#657ca3",
      "#d09424"
    ]
  },
  {
    "size": [
      0.4,
      1,
      1
    ],
    "stemMax": 5,
    "petals": 4,
    "layers": 3,
    "offset": 0.375,
    "taper": 1,
    "flowerChance": 0.75,
    "leafLength": [
      2,
      3
    ],
    "leafWidth": 1,
    "leafHeight": [
      1,
      5
    ],
    "petalColors": [
      "#e6e2d7",
      "#e6e2d7",
      "#e6e2d7",
      "#e6e2d7"
    ],
    "diskColors": [
      "#ee7700",
      "#ee7700",
      "#ee7700",
      "#ee7700"
    ],
    "stemColors": [
      "#839481",
      "#778c80",
      "#8395b4",
      "#d09424"
    ]
  },
  {
    "size": [
      0.8,
      0.8,
      0.8
    ],
    "stemMax": 7,
    "petals": 5,
    "layers": 2,
    "offset": 0.525,
    "taper": 0.5,
    "flowerChance": 0.9,
    "leafLength": [
      1,
      2
    ],
    "leafWidth": 1,
    "leafHeight": [
      1,
      2
    ],
    "petalColors": [
      "#fbcb73",
      "#997de3",
      "#f1e2af",
      "#d5a9e7"
    ],
    "diskColors": [
      "#fa9970",
      "#b5397a",
      "#e8821c",
      "#f9c526"
    ],
    "stemColors": [
      "#9ba965",
      "#85988c",
      "#89a0b8",
      "#d09424"
    ]
  },
  {
    "size": [
      1,
      1,
      1
    ],
    "stemMax": 7,
    "petals": 8,
    "layers": 1,
    "offset": 0.375,
    "taper": 1,
    "flowerChance": 0.85,
    "leafLength": [
      1,
      1
    ],
    "leafWidth": 1,
    "leafHeight": [
      1,
      2
    ],
    "petalColors": [
      "#fb8680",
      "#fccdf0",
      "#fb8c80",
      "#fa6f5f"
    ],
    "diskColors": [
      "#462b00",
      "#462b00",
      "#462b00",
      "#462b00"
    ],
    "stemColors": [
      "#778a75",
      "#7e9286",
      "#8093b3",
      "#d09424"
    ]
  },
  {
    "size": [
      0.6,
      1,
      1.8
    ],
    "stemMax": 6,
    "petals": 8,
    "layers": 2,
    "offset": 0.225,
    "taper": 1,
    "flowerChance": 0.8,
    "leafLength": [
      1.5,
      3
    ],
    "leafWidth": 0.75,
    "leafHeight": [
      1,
      2
    ],
    "petalColors": [
      "#f8c11f",
      "#f89807",
      "#ebc576",
      "#fccdf0"
    ],
    "diskColors": [
      "#462b00",
      "#47856a",
      "#462b00",
      "#3d4b54"
    ],
    "stemColors": [
      "#71826f",
      "#6a7d71",
      "#657ca3",
      "#d09424"
    ]
  }
];
export const ORIGINAL_PALETTES=[
  {
    "background": [
      "#bac9ed",
      "#ffe4a8",
      "#e6c1cb",
      "#d1c7b8"
    ],
    "leaf": [
      "#778a75",
      "#859683",
      "#8d9e8f",
      "#8d9e8f",
      "#8d9e8f",
      "#aeb982",
      "#aeb982",
      "#f7eca4"
    ],
    "grass": [
      "#71826f",
      "#b9b682",
      "#cec96c",
      "#f3d14b"
    ]
  },
  {
    "background": [
      "#bac9ed",
      "#e6c1cb",
      "#d1c7b8"
    ],
    "leaf": [
      "#758a7d",
      "#83968a",
      "#87a5a2",
      "#82b9b6",
      "#f7eca4"
    ],
    "grass": [
      "#6f8276",
      "#82a3ac",
      "#89b19c",
      "#f4e08e"
    ]
  },
  {
    "background": [
      "#bac9ed",
      "#e6c1cb",
      "#d1c7b8"
    ],
    "leaf": [
      "#556a8e",
      "#769198",
      "#769198",
      "#769198",
      "#769198",
      "#b0b7df",
      "#d8d7ee",
      "#d3a0d3",
      "#f8d294"
    ],
    "grass": [
      "#4e6781",
      "#4e6781",
      "#6987a5",
      "#6987a5",
      "#8f96d1",
      "#8f96d1",
      "#8f96d1",
      "#b8c5d3",
      "#b8c5d3",
      "#f7cb82",
      "#f7cb82"
    ]
  },
  {
    "background": [
      "#ffe4a8",
      "#e6c1cb",
      "#d1c7b8"
    ],
    "leaf": [
      "#73879d",
      "#73879d",
      "#b98a5b",
      "#d6b37e",
      "#d6b37e",
      "#f4bf5b",
      "#f7ce8a"
    ],
    "grass": [
      "#73879d",
      "#958b7b",
      "#9a9676",
      "#d6aa7e",
      "#d6b37e",
      "#d6b37e",
      "#f4c25b",
      "#f4c25b",
      "#f5cd70",
      "#f5cd70",
      "#f9dd9b"
    ]
  }
];
function rng(seed){
 let state=seed>>>0;
 return ()=>{
   state=(state+0x6D2B79F5)>>>0;
   let x=state;
   x=Math.imul(x^(x>>>15),x|1);
   x^=x+Math.imul(x^(x>>>7),x|61);
   return ((x^(x>>>14))>>>0)/4294967296;
 };
}
export function originalSceneTraits(seed){
 if(!Number.isFinite(seed))throw new RangeError('Invalid meadow seed');
 const random=rng(seed);
 const speciesNoiseScale=.8+random()*.7;
 const palette=Math.min(3,Math.floor(random()*4));
 const backgrounds=ORIGINAL_PALETTES[palette].background;
 const background=backgrounds[Math.floor(random()*backgrounds.length)];
 const speciesOrder=[0,1,2,3,4,5];
 for(let n=speciesOrder.length;n>0;){
   const k=Math.floor(random()*n);
   n--;
   [speciesOrder[k],speciesOrder[n]]=[speciesOrder[n],speciesOrder[k]];
 }
 const flowerThreshold=-.275+random()*.175;
 return {palette,background,speciesOrder,flowerThreshold,speciesNoiseScale};
}
export const GPU_MEADOW_PREPASS_VERTEX=`#version 300 es
precision highp float;
void main(){
 vec2 p=vec2(gl_VertexID==1?3.0:-1.0,gl_VertexID==2?3.0:-1.0);
 gl_Position=vec4(p,0,1);
}`;
export const GPU_MEADOW_PREPASS_FRAGMENT=`#version 300 es
precision highp float;
precision highp int;
const float PI=3.141592653589793;
const float TAU=6.283185307179586;
const int SITE_GRID=60;
uniform float uSeed;
uniform int uPalette;
uniform float uFlowerThreshold;
uniform float uSpeciesNoiseScale;
uniform int uSpeciesOrder[6];
float rand1(float n){return fract(sin(n*127.1+uSeed*.0673)*43758.5453);}
float rand2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*.0431)*43758.5453);}
float noise2(vec2 p){
  vec2 a=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(rand2(a),rand2(a+vec2(1,0)),f.x),
             mix(rand2(a+vec2(0,1)),rand2(a+vec2(1,1)),f.x),f.y);
}
float fractal(vec2 p,float scaleFallout,float weightFallout,int octaves){
  float sum=0.0,w=1.0,weight=0.0,s=1.0;
  for(int k=0;k<3;k++){
    if(k>=octaves)break;
    sum+=noise2(p*s)*w;weight+=w;s*=scaleFallout;w*=weightFallout;
  }
  return sum/max(weight,0.001);
}
float sigmoid(float x,float a){
  x=clamp(x,0.0,1.0);
  float e=1.0/(1.0-clamp(a,.00001,.99999));
  if(x<=.5)return pow(2.0*x,e)*.5;
  return 1.0-pow(2.0*(1.0-x),e)*.5;
}
float terrain(vec2 xz){
  float i=clamp(floor((xz.x+37.5)/75.0*100.0),0.0,99.0);
  float j=clamp(floor((xz.y+55.0)/90.0*175.0),0.0,174.0);
  return 100.0*(j/175.0)*fractal(vec2(i,j)*.024,1.5,.85,3);
}
vec3 rootAt(int id){
  float ix=float(id/60),iz=float(id%60);
  // Original nested loop visits i then j; the terrain lattice is 75 by 80.625
  vec2 xz=vec2(mix(-37.5,37.5,ix/59.0),
               mix(-37.5,43.125,iz/59.0)-25.0);
  float gaussian=pow(abs(sqrt(-2.0*log(max(.000001,rand1(float(id)*19.1+8.0))))*
    cos(TAU*rand1(float(id)*21.3+3.0))),.8);
  gaussian=min(gaussian,2.0)*.75;
  float a=rand1(float(id)*4.9+12.0)*TAU;
  xz+=vec2(cos(a),sin(a))*gaussian;
  return vec3(xz.x,-terrain(xz),xz.y);
}
vec2 encode16(float value){
  float scaled=floor(clamp(value,0.0,1.0)*65535.0+.5);
  return vec2(floor(scaled/256.0),mod(scaled,256.0))/255.0;
}
float decode16(vec2 v){
  return (floor(v.x*255.0+.5)*256.0+floor(v.y*255.0+.5))/65535.0;
}
float petalSX(int species){if(species==0)return 0.75000;if(species==1)return 1.75000;if(species==2)return 0.40000;if(species==3)return 0.80000;if(species==4)return 1.00000;if(species==5)return 0.60000;return 0.0;}

float petalSY(int species){if(species==0)return 0.75000;if(species==1)return 1.75000;if(species==2)return 1.00000;if(species==3)return 0.80000;if(species==4)return 1.00000;if(species==5)return 1.00000;return 0.0;}

float petalSZ(int species){if(species==0)return 0.75000;if(species==1)return 1.75000;if(species==2)return 1.00000;if(species==3)return 0.80000;if(species==4)return 1.00000;if(species==5)return 1.80000;return 0.0;}

float stemMax(int species){if(species==0)return 5.00000;if(species==1)return 8.00000;if(species==2)return 5.00000;if(species==3)return 7.00000;if(species==4)return 7.00000;if(species==5)return 6.00000;return 0.0;}

float petalCount(int species){if(species==0)return 6.00000;if(species==1)return 4.00000;if(species==2)return 4.00000;if(species==3)return 5.00000;if(species==4)return 8.00000;if(species==5)return 8.00000;return 0.0;}

float layerCount(int species){if(species==0)return 2.00000;if(species==1)return 2.00000;if(species==2)return 3.00000;if(species==3)return 2.00000;if(species==4)return 1.00000;if(species==5)return 2.00000;return 0.0;}

float headOffset(int species){if(species==0)return 0.09375;if(species==1)return 0.37500;if(species==2)return 0.37500;if(species==3)return 0.52500;if(species==4)return 0.37500;if(species==5)return 0.22500;return 0.0;}

float petalTaper(int species){if(species==0)return 1.00000;if(species==1)return 1.00000;if(species==2)return 1.00000;if(species==3)return 0.50000;if(species==4)return 1.00000;if(species==5)return 1.00000;return 0.0;}

float bloomChance(int species){if(species==0)return 0.85000;if(species==1)return 0.82000;if(species==2)return 0.75000;if(species==3)return 0.90000;if(species==4)return 0.85000;if(species==5)return 0.80000;return 0.0;}

float leafLengthMin(int species){if(species==0)return 4.00000;if(species==1)return 4.00000;if(species==2)return 2.00000;if(species==3)return 1.00000;if(species==4)return 1.00000;if(species==5)return 1.50000;return 0.0;}

float leafLengthMax(int species){if(species==0)return 7.00000;if(species==1)return 7.00000;if(species==2)return 3.00000;if(species==3)return 2.00000;if(species==4)return 1.00000;if(species==5)return 3.00000;return 0.0;}

float leafWidth(int species){if(species==0)return 1.00000;if(species==1)return 0.75000;if(species==2)return 1.00000;if(species==3)return 1.00000;if(species==4)return 1.00000;if(species==5)return 0.75000;return 0.0;}

float leafHeightMin(int species){if(species==0)return 1.00000;if(species==1)return 1.00000;if(species==2)return 1.00000;if(species==3)return 1.00000;if(species==4)return 1.00000;if(species==5)return 1.00000;return 0.0;}

float leafHeightMax(int species){if(species==0)return 5.00000;if(species==1)return 5.00000;if(species==2)return 5.00000;if(species==3)return 2.00000;if(species==4)return 2.00000;if(species==5)return 2.00000;return 0.0;}

vec3 petalInk(int species,int palette){
if(species==0){
if(palette==0)return vec3(1.0000000,0.7490196,0.0000000);
if(palette==1)return vec3(0.9803922,0.4196078,0.4509804);
if(palette==2)return vec3(0.9686275,0.6352941,0.5843137);
if(palette==3)return vec3(0.9725490,0.5960784,0.0274510);
return vec3(1.0000000,0.7490196,0.0000000);}
if(species==1){
if(palette==0)return vec3(0.8901961,0.8823529,0.8509804);
if(palette==1)return vec3(0.8901961,0.8823529,0.8509804);
if(palette==2)return vec3(0.8901961,0.8823529,0.8509804);
if(palette==3)return vec3(0.8901961,0.8823529,0.8509804);
return vec3(0.8901961,0.8823529,0.8509804);}
if(species==2){
if(palette==0)return vec3(0.9019608,0.8862745,0.8431373);
if(palette==1)return vec3(0.9019608,0.8862745,0.8431373);
if(palette==2)return vec3(0.9019608,0.8862745,0.8431373);
if(palette==3)return vec3(0.9019608,0.8862745,0.8431373);
return vec3(0.9019608,0.8862745,0.8431373);}
if(species==3){
if(palette==0)return vec3(0.9843137,0.7960784,0.4509804);
if(palette==1)return vec3(0.6000000,0.4901961,0.8901961);
if(palette==2)return vec3(0.9450980,0.8862745,0.6862745);
if(palette==3)return vec3(0.8352941,0.6627451,0.9058824);
return vec3(0.9843137,0.7960784,0.4509804);}
if(species==4){
if(palette==0)return vec3(0.9843137,0.5254902,0.5019608);
if(palette==1)return vec3(0.9882353,0.8039216,0.9411765);
if(palette==2)return vec3(0.9843137,0.5490196,0.5019608);
if(palette==3)return vec3(0.9803922,0.4352941,0.3725490);
return vec3(0.9843137,0.5254902,0.5019608);}
if(species==5){
if(palette==0)return vec3(0.9725490,0.7568627,0.1215686);
if(palette==1)return vec3(0.9725490,0.5960784,0.0274510);
if(palette==2)return vec3(0.9215686,0.7725490,0.4627451);
if(palette==3)return vec3(0.9882353,0.8039216,0.9411765);
return vec3(0.9725490,0.7568627,0.1215686);}
return vec3(0.5);}

vec3 diskInk(int species,int palette){
if(species==0){
if(palette==0)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==1)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==2)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==3)return vec3(0.2745098,0.1686275,0.0000000);
return vec3(0.2745098,0.1686275,0.0000000);}
if(species==1){
if(palette==0)return vec3(0.9333333,0.5568627,0.0000000);
if(palette==1)return vec3(0.9333333,0.5568627,0.0000000);
if(palette==2)return vec3(0.9333333,0.5568627,0.0000000);
if(palette==3)return vec3(0.9333333,0.5568627,0.0000000);
return vec3(0.9333333,0.5568627,0.0000000);}
if(species==2){
if(palette==0)return vec3(0.9333333,0.4666667,0.0000000);
if(palette==1)return vec3(0.9333333,0.4666667,0.0000000);
if(palette==2)return vec3(0.9333333,0.4666667,0.0000000);
if(palette==3)return vec3(0.9333333,0.4666667,0.0000000);
return vec3(0.9333333,0.4666667,0.0000000);}
if(species==3){
if(palette==0)return vec3(0.9803922,0.6000000,0.4392157);
if(palette==1)return vec3(0.7098039,0.2235294,0.4784314);
if(palette==2)return vec3(0.9098039,0.5098039,0.1098039);
if(palette==3)return vec3(0.9764706,0.7725490,0.1490196);
return vec3(0.9803922,0.6000000,0.4392157);}
if(species==4){
if(palette==0)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==1)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==2)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==3)return vec3(0.2745098,0.1686275,0.0000000);
return vec3(0.2745098,0.1686275,0.0000000);}
if(species==5){
if(palette==0)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==1)return vec3(0.2784314,0.5215686,0.4156863);
if(palette==2)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==3)return vec3(0.2392157,0.2941176,0.3294118);
return vec3(0.2745098,0.1686275,0.0000000);}
return vec3(0.5);}

vec3 stemInk(int species,int palette){
if(species==0){
if(palette==0)return vec3(0.4431373,0.5098039,0.4352941);
if(palette==1)return vec3(0.4156863,0.4901961,0.4431373);
if(palette==2)return vec3(0.3960784,0.4862745,0.6392157);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.4431373,0.5098039,0.4352941);}
if(species==1){
if(palette==0)return vec3(0.5921569,0.6509804,0.5843137);
if(palette==1)return vec3(0.4745098,0.5568627,0.5098039);
if(palette==2)return vec3(0.3960784,0.4862745,0.6392157);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.5921569,0.6509804,0.5843137);}
if(species==2){
if(palette==0)return vec3(0.5137255,0.5803922,0.5058824);
if(palette==1)return vec3(0.4666667,0.5490196,0.5019608);
if(palette==2)return vec3(0.5137255,0.5843137,0.7058824);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.5137255,0.5803922,0.5058824);}
if(species==3){
if(palette==0)return vec3(0.6078431,0.6627451,0.3960784);
if(palette==1)return vec3(0.5215686,0.5960784,0.5490196);
if(palette==2)return vec3(0.5372549,0.6274510,0.7215686);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.6078431,0.6627451,0.3960784);}
if(species==4){
if(palette==0)return vec3(0.4666667,0.5411765,0.4588235);
if(palette==1)return vec3(0.4941176,0.5725490,0.5254902);
if(palette==2)return vec3(0.5019608,0.5764706,0.7019608);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.4666667,0.5411765,0.4588235);}
if(species==5){
if(palette==0)return vec3(0.4431373,0.5098039,0.4352941);
if(palette==1)return vec3(0.4156863,0.4901961,0.4431373);
if(palette==2)return vec3(0.3960784,0.4862745,0.6392157);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.4431373,0.5098039,0.4352941);}
return vec3(0.5);}

vec3 leafInk(int palette,float rank){
if(palette==0){
int index=int(clamp(floor(rank*7.00000),0.0,7.00000));
if(index==0)return vec3(0.4666667,0.5411765,0.4588235);
if(index==1)return vec3(0.5215686,0.5882353,0.5137255);
if(index==2)return vec3(0.5529412,0.6196078,0.5607843);
if(index==3)return vec3(0.5529412,0.6196078,0.5607843);
if(index==4)return vec3(0.5529412,0.6196078,0.5607843);
if(index==5)return vec3(0.6823529,0.7254902,0.5098039);
if(index==6)return vec3(0.6823529,0.7254902,0.5098039);
if(index==7)return vec3(0.9686275,0.9254902,0.6431373);
}
if(palette==1){
int index=int(clamp(floor(rank*4.00000),0.0,4.00000));
if(index==0)return vec3(0.4588235,0.5411765,0.4901961);
if(index==1)return vec3(0.5137255,0.5882353,0.5411765);
if(index==2)return vec3(0.5294118,0.6470588,0.6352941);
if(index==3)return vec3(0.5098039,0.7254902,0.7137255);
if(index==4)return vec3(0.9686275,0.9254902,0.6431373);
}
if(palette==2){
int index=int(clamp(floor(rank*8.00000),0.0,8.00000));
if(index==0)return vec3(0.3333333,0.4156863,0.5568627);
if(index==1)return vec3(0.4627451,0.5686275,0.5960784);
if(index==2)return vec3(0.4627451,0.5686275,0.5960784);
if(index==3)return vec3(0.4627451,0.5686275,0.5960784);
if(index==4)return vec3(0.4627451,0.5686275,0.5960784);
if(index==5)return vec3(0.6901961,0.7176471,0.8745098);
if(index==6)return vec3(0.8470588,0.8431373,0.9333333);
if(index==7)return vec3(0.8274510,0.6274510,0.8274510);
if(index==8)return vec3(0.9725490,0.8235294,0.5803922);
}
if(palette==3){
int index=int(clamp(floor(rank*6.00000),0.0,6.00000));
if(index==0)return vec3(0.4509804,0.5294118,0.6156863);
if(index==1)return vec3(0.4509804,0.5294118,0.6156863);
if(index==2)return vec3(0.7254902,0.5411765,0.3568627);
if(index==3)return vec3(0.8392157,0.7019608,0.4941176);
if(index==4)return vec3(0.8392157,0.7019608,0.4941176);
if(index==5)return vec3(0.9568627,0.7490196,0.3568627);
if(index==6)return vec3(0.9686275,0.8078431,0.5411765);
}
return vec3(0.5);}

vec3 grassInk(int palette,float rank){
if(palette==0){
int index=int(clamp(floor(rank*3.00000),0.0,3.00000));
if(index==0)return vec3(0.4431373,0.5098039,0.4352941);
if(index==1)return vec3(0.7254902,0.7137255,0.5098039);
if(index==2)return vec3(0.8078431,0.7882353,0.4235294);
if(index==3)return vec3(0.9529412,0.8196078,0.2941176);
}
if(palette==1){
int index=int(clamp(floor(rank*3.00000),0.0,3.00000));
if(index==0)return vec3(0.4352941,0.5098039,0.4627451);
if(index==1)return vec3(0.5098039,0.6392157,0.6745098);
if(index==2)return vec3(0.5372549,0.6941176,0.6117647);
if(index==3)return vec3(0.9568627,0.8784314,0.5568627);
}
if(palette==2){
int index=int(clamp(floor(rank*10.00000),0.0,10.00000));
if(index==0)return vec3(0.3058824,0.4039216,0.5058824);
if(index==1)return vec3(0.3058824,0.4039216,0.5058824);
if(index==2)return vec3(0.4117647,0.5294118,0.6470588);
if(index==3)return vec3(0.4117647,0.5294118,0.6470588);
if(index==4)return vec3(0.5607843,0.5882353,0.8196078);
if(index==5)return vec3(0.5607843,0.5882353,0.8196078);
if(index==6)return vec3(0.5607843,0.5882353,0.8196078);
if(index==7)return vec3(0.7215686,0.7725490,0.8274510);
if(index==8)return vec3(0.7215686,0.7725490,0.8274510);
if(index==9)return vec3(0.9686275,0.7960784,0.5098039);
if(index==10)return vec3(0.9686275,0.7960784,0.5098039);
}
if(palette==3){
int index=int(clamp(floor(rank*10.00000),0.0,10.00000));
if(index==0)return vec3(0.4509804,0.5294118,0.6156863);
if(index==1)return vec3(0.5843137,0.5450980,0.4823529);
if(index==2)return vec3(0.6039216,0.5882353,0.4627451);
if(index==3)return vec3(0.8392157,0.6666667,0.4941176);
if(index==4)return vec3(0.8392157,0.7019608,0.4941176);
if(index==5)return vec3(0.8392157,0.7019608,0.4941176);
if(index==6)return vec3(0.9568627,0.7607843,0.3568627);
if(index==7)return vec3(0.9568627,0.7607843,0.3568627);
if(index==8)return vec3(0.9607843,0.8039216,0.4392157);
if(index==9)return vec3(0.9607843,0.8039216,0.4392157);
if(index==10)return vec3(0.9764706,0.8666667,0.6078431);
}
return vec3(0.5);}


layout(location=0) out vec4 data0;
layout(location=1) out vec4 data1;
layout(location=2) out vec4 data2;
layout(location=3) out vec4 data3;
void main(){
  ivec2 pixel=ivec2(gl_FragCoord.xy);
  int id=pixel.y*SITE_GRID+pixel.x;
  vec3 root=rootAt(id);
  // Original flower types are noise-clustered, never independent per plant.
  float typeNoise=sigmoid(noise2(vec2(root.x*.0075,root.z*.03)*uSpeciesNoiseScale),.1);
  int typeIndex=int(clamp(floor(typeNoise*6.0),0.0,5.0));
  int species=uSpeciesOrder[typeIndex];
  float bloomNoise=noise2(root.xz*100.0);
  bool isFlower=bloomNoise*2.98<bloomChance(species);
  float leafW=noise2(root.xz*100.0+vec2(432.0,54321.0));
  float leafL=noise2(root.xz*100.0+vec2(765432.0,-5442.0));
  if(!isFlower){
    leafW=noise2(root.xz*100.0+vec2(-74389.0,682.0));
    leafL=noise2(root.xz*100.0+vec2(-9189.0,-19889.0));
  }
  float thresholdNoise=fractal(vec2(root.x*.02+5432.0,root.z*.08+654321.0),4.0,.25,1)*2.0-1.0;
  float growth=sigmoid(clamp((thresholdNoise-uFlowerThreshold+1.0)*.5,0.0,1.0),.9);
  float age=fract(mix(.2,1.0,rand1(float(id)*9.73+47.0))+.17)*growth;
  float plantHeight=clamp(mix(.1,1.0,noise2(root.xz*.1)),.1,1.0)*growth;
  float count=isFlower?floor(mix(2.0,floor(stemMax(species)*1.5+.5),plantHeight)+.5):
    floor(mix(2.0,8.0,plantHeight)+.5);
  float magnitude=mix(.3,1.0,mix(.25,1.0,(stemMax(species)-5.0)/3.0)*age);
  float pitch=magnitude*(fractal(vec2((root.x+4321.0)*.015,(root.z+54321.0)*.03),2.0,.5,2)*2.0-1.0)*PI/1.5;
  float yaw=PI/2.0+(noise2(vec2(root.x,root.z)*.15+vec2(523544.0,54321.0))*2.0-1.0)*PI/4.0;
  float br=clamp(noise2(root.xz*.025+31.0),0.0,1.0);
  data0=vec4(encode16((root.x+40.0)/80.0),encode16((-root.y)/100.0));
  data1=vec4(encode16((root.z+65.0)/85.0),float(species)/5.0,age);
  data2=vec4(plantHeight,count/12.0,clamp((pitch+PI)/(2.0*PI),0.0,1.0),
             clamp(yaw/TAU,0.0,1.0));
  data3=vec4(isFlower?1.0:0.0,leafW,leafL,br);
}`;
export const GPU_MEADOW_VERTEX=`#version 300 es
precision highp float;
precision highp int;
const float PI=3.141592653589793;
const float TAU=6.283185307179586;
const int SITE_GRID=60;
uniform float uSeed;
uniform int uPalette;
uniform float uFlowerThreshold;
uniform float uSpeciesNoiseScale;
uniform int uSpeciesOrder[6];
float rand1(float n){return fract(sin(n*127.1+uSeed*.0673)*43758.5453);}
float rand2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7))+uSeed*.0431)*43758.5453);}
float noise2(vec2 p){
  vec2 a=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(rand2(a),rand2(a+vec2(1,0)),f.x),
             mix(rand2(a+vec2(0,1)),rand2(a+vec2(1,1)),f.x),f.y);
}
float fractal(vec2 p,float scaleFallout,float weightFallout,int octaves){
  float sum=0.0,w=1.0,weight=0.0,s=1.0;
  for(int k=0;k<3;k++){
    if(k>=octaves)break;
    sum+=noise2(p*s)*w;weight+=w;s*=scaleFallout;w*=weightFallout;
  }
  return sum/max(weight,0.001);
}
float sigmoid(float x,float a){
  x=clamp(x,0.0,1.0);
  float e=1.0/(1.0-clamp(a,.00001,.99999));
  if(x<=.5)return pow(2.0*x,e)*.5;
  return 1.0-pow(2.0*(1.0-x),e)*.5;
}
float terrain(vec2 xz){
  float i=clamp(floor((xz.x+37.5)/75.0*100.0),0.0,99.0);
  float j=clamp(floor((xz.y+55.0)/90.0*175.0),0.0,174.0);
  return 100.0*(j/175.0)*fractal(vec2(i,j)*.024,1.5,.85,3);
}
vec3 rootAt(int id){
  float ix=float(id/60),iz=float(id%60);
  // Original nested loop visits i then j; the terrain lattice is 75 by 80.625
  vec2 xz=vec2(mix(-37.5,37.5,ix/59.0),
               mix(-37.5,43.125,iz/59.0)-25.0);
  float gaussian=pow(abs(sqrt(-2.0*log(max(.000001,rand1(float(id)*19.1+8.0))))*
    cos(TAU*rand1(float(id)*21.3+3.0))),.8);
  gaussian=min(gaussian,2.0)*.75;
  float a=rand1(float(id)*4.9+12.0)*TAU;
  xz+=vec2(cos(a),sin(a))*gaussian;
  return vec3(xz.x,-terrain(xz),xz.y);
}
vec2 encode16(float value){
  float scaled=floor(clamp(value,0.0,1.0)*65535.0+.5);
  return vec2(floor(scaled/256.0),mod(scaled,256.0))/255.0;
}
float decode16(vec2 v){
  return (floor(v.x*255.0+.5)*256.0+floor(v.y*255.0+.5))/65535.0;
}
float petalSX(int species){if(species==0)return 0.75000;if(species==1)return 1.75000;if(species==2)return 0.40000;if(species==3)return 0.80000;if(species==4)return 1.00000;if(species==5)return 0.60000;return 0.0;}

float petalSY(int species){if(species==0)return 0.75000;if(species==1)return 1.75000;if(species==2)return 1.00000;if(species==3)return 0.80000;if(species==4)return 1.00000;if(species==5)return 1.00000;return 0.0;}

float petalSZ(int species){if(species==0)return 0.75000;if(species==1)return 1.75000;if(species==2)return 1.00000;if(species==3)return 0.80000;if(species==4)return 1.00000;if(species==5)return 1.80000;return 0.0;}

float stemMax(int species){if(species==0)return 5.00000;if(species==1)return 8.00000;if(species==2)return 5.00000;if(species==3)return 7.00000;if(species==4)return 7.00000;if(species==5)return 6.00000;return 0.0;}

float petalCount(int species){if(species==0)return 6.00000;if(species==1)return 4.00000;if(species==2)return 4.00000;if(species==3)return 5.00000;if(species==4)return 8.00000;if(species==5)return 8.00000;return 0.0;}

float layerCount(int species){if(species==0)return 2.00000;if(species==1)return 2.00000;if(species==2)return 3.00000;if(species==3)return 2.00000;if(species==4)return 1.00000;if(species==5)return 2.00000;return 0.0;}

float headOffset(int species){if(species==0)return 0.09375;if(species==1)return 0.37500;if(species==2)return 0.37500;if(species==3)return 0.52500;if(species==4)return 0.37500;if(species==5)return 0.22500;return 0.0;}

float petalTaper(int species){if(species==0)return 1.00000;if(species==1)return 1.00000;if(species==2)return 1.00000;if(species==3)return 0.50000;if(species==4)return 1.00000;if(species==5)return 1.00000;return 0.0;}

float bloomChance(int species){if(species==0)return 0.85000;if(species==1)return 0.82000;if(species==2)return 0.75000;if(species==3)return 0.90000;if(species==4)return 0.85000;if(species==5)return 0.80000;return 0.0;}

float leafLengthMin(int species){if(species==0)return 4.00000;if(species==1)return 4.00000;if(species==2)return 2.00000;if(species==3)return 1.00000;if(species==4)return 1.00000;if(species==5)return 1.50000;return 0.0;}

float leafLengthMax(int species){if(species==0)return 7.00000;if(species==1)return 7.00000;if(species==2)return 3.00000;if(species==3)return 2.00000;if(species==4)return 1.00000;if(species==5)return 3.00000;return 0.0;}

float leafWidth(int species){if(species==0)return 1.00000;if(species==1)return 0.75000;if(species==2)return 1.00000;if(species==3)return 1.00000;if(species==4)return 1.00000;if(species==5)return 0.75000;return 0.0;}

float leafHeightMin(int species){if(species==0)return 1.00000;if(species==1)return 1.00000;if(species==2)return 1.00000;if(species==3)return 1.00000;if(species==4)return 1.00000;if(species==5)return 1.00000;return 0.0;}

float leafHeightMax(int species){if(species==0)return 5.00000;if(species==1)return 5.00000;if(species==2)return 5.00000;if(species==3)return 2.00000;if(species==4)return 2.00000;if(species==5)return 2.00000;return 0.0;}

vec3 petalInk(int species,int palette){
if(species==0){
if(palette==0)return vec3(1.0000000,0.7490196,0.0000000);
if(palette==1)return vec3(0.9803922,0.4196078,0.4509804);
if(palette==2)return vec3(0.9686275,0.6352941,0.5843137);
if(palette==3)return vec3(0.9725490,0.5960784,0.0274510);
return vec3(1.0000000,0.7490196,0.0000000);}
if(species==1){
if(palette==0)return vec3(0.8901961,0.8823529,0.8509804);
if(palette==1)return vec3(0.8901961,0.8823529,0.8509804);
if(palette==2)return vec3(0.8901961,0.8823529,0.8509804);
if(palette==3)return vec3(0.8901961,0.8823529,0.8509804);
return vec3(0.8901961,0.8823529,0.8509804);}
if(species==2){
if(palette==0)return vec3(0.9019608,0.8862745,0.8431373);
if(palette==1)return vec3(0.9019608,0.8862745,0.8431373);
if(palette==2)return vec3(0.9019608,0.8862745,0.8431373);
if(palette==3)return vec3(0.9019608,0.8862745,0.8431373);
return vec3(0.9019608,0.8862745,0.8431373);}
if(species==3){
if(palette==0)return vec3(0.9843137,0.7960784,0.4509804);
if(palette==1)return vec3(0.6000000,0.4901961,0.8901961);
if(palette==2)return vec3(0.9450980,0.8862745,0.6862745);
if(palette==3)return vec3(0.8352941,0.6627451,0.9058824);
return vec3(0.9843137,0.7960784,0.4509804);}
if(species==4){
if(palette==0)return vec3(0.9843137,0.5254902,0.5019608);
if(palette==1)return vec3(0.9882353,0.8039216,0.9411765);
if(palette==2)return vec3(0.9843137,0.5490196,0.5019608);
if(palette==3)return vec3(0.9803922,0.4352941,0.3725490);
return vec3(0.9843137,0.5254902,0.5019608);}
if(species==5){
if(palette==0)return vec3(0.9725490,0.7568627,0.1215686);
if(palette==1)return vec3(0.9725490,0.5960784,0.0274510);
if(palette==2)return vec3(0.9215686,0.7725490,0.4627451);
if(palette==3)return vec3(0.9882353,0.8039216,0.9411765);
return vec3(0.9725490,0.7568627,0.1215686);}
return vec3(0.5);}

vec3 diskInk(int species,int palette){
if(species==0){
if(palette==0)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==1)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==2)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==3)return vec3(0.2745098,0.1686275,0.0000000);
return vec3(0.2745098,0.1686275,0.0000000);}
if(species==1){
if(palette==0)return vec3(0.9333333,0.5568627,0.0000000);
if(palette==1)return vec3(0.9333333,0.5568627,0.0000000);
if(palette==2)return vec3(0.9333333,0.5568627,0.0000000);
if(palette==3)return vec3(0.9333333,0.5568627,0.0000000);
return vec3(0.9333333,0.5568627,0.0000000);}
if(species==2){
if(palette==0)return vec3(0.9333333,0.4666667,0.0000000);
if(palette==1)return vec3(0.9333333,0.4666667,0.0000000);
if(palette==2)return vec3(0.9333333,0.4666667,0.0000000);
if(palette==3)return vec3(0.9333333,0.4666667,0.0000000);
return vec3(0.9333333,0.4666667,0.0000000);}
if(species==3){
if(palette==0)return vec3(0.9803922,0.6000000,0.4392157);
if(palette==1)return vec3(0.7098039,0.2235294,0.4784314);
if(palette==2)return vec3(0.9098039,0.5098039,0.1098039);
if(palette==3)return vec3(0.9764706,0.7725490,0.1490196);
return vec3(0.9803922,0.6000000,0.4392157);}
if(species==4){
if(palette==0)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==1)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==2)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==3)return vec3(0.2745098,0.1686275,0.0000000);
return vec3(0.2745098,0.1686275,0.0000000);}
if(species==5){
if(palette==0)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==1)return vec3(0.2784314,0.5215686,0.4156863);
if(palette==2)return vec3(0.2745098,0.1686275,0.0000000);
if(palette==3)return vec3(0.2392157,0.2941176,0.3294118);
return vec3(0.2745098,0.1686275,0.0000000);}
return vec3(0.5);}

vec3 stemInk(int species,int palette){
if(species==0){
if(palette==0)return vec3(0.4431373,0.5098039,0.4352941);
if(palette==1)return vec3(0.4156863,0.4901961,0.4431373);
if(palette==2)return vec3(0.3960784,0.4862745,0.6392157);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.4431373,0.5098039,0.4352941);}
if(species==1){
if(palette==0)return vec3(0.5921569,0.6509804,0.5843137);
if(palette==1)return vec3(0.4745098,0.5568627,0.5098039);
if(palette==2)return vec3(0.3960784,0.4862745,0.6392157);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.5921569,0.6509804,0.5843137);}
if(species==2){
if(palette==0)return vec3(0.5137255,0.5803922,0.5058824);
if(palette==1)return vec3(0.4666667,0.5490196,0.5019608);
if(palette==2)return vec3(0.5137255,0.5843137,0.7058824);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.5137255,0.5803922,0.5058824);}
if(species==3){
if(palette==0)return vec3(0.6078431,0.6627451,0.3960784);
if(palette==1)return vec3(0.5215686,0.5960784,0.5490196);
if(palette==2)return vec3(0.5372549,0.6274510,0.7215686);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.6078431,0.6627451,0.3960784);}
if(species==4){
if(palette==0)return vec3(0.4666667,0.5411765,0.4588235);
if(palette==1)return vec3(0.4941176,0.5725490,0.5254902);
if(palette==2)return vec3(0.5019608,0.5764706,0.7019608);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.4666667,0.5411765,0.4588235);}
if(species==5){
if(palette==0)return vec3(0.4431373,0.5098039,0.4352941);
if(palette==1)return vec3(0.4156863,0.4901961,0.4431373);
if(palette==2)return vec3(0.3960784,0.4862745,0.6392157);
if(palette==3)return vec3(0.8156863,0.5803922,0.1411765);
return vec3(0.4431373,0.5098039,0.4352941);}
return vec3(0.5);}

vec3 leafInk(int palette,float rank){
if(palette==0){
int index=int(clamp(floor(rank*7.00000),0.0,7.00000));
if(index==0)return vec3(0.4666667,0.5411765,0.4588235);
if(index==1)return vec3(0.5215686,0.5882353,0.5137255);
if(index==2)return vec3(0.5529412,0.6196078,0.5607843);
if(index==3)return vec3(0.5529412,0.6196078,0.5607843);
if(index==4)return vec3(0.5529412,0.6196078,0.5607843);
if(index==5)return vec3(0.6823529,0.7254902,0.5098039);
if(index==6)return vec3(0.6823529,0.7254902,0.5098039);
if(index==7)return vec3(0.9686275,0.9254902,0.6431373);
}
if(palette==1){
int index=int(clamp(floor(rank*4.00000),0.0,4.00000));
if(index==0)return vec3(0.4588235,0.5411765,0.4901961);
if(index==1)return vec3(0.5137255,0.5882353,0.5411765);
if(index==2)return vec3(0.5294118,0.6470588,0.6352941);
if(index==3)return vec3(0.5098039,0.7254902,0.7137255);
if(index==4)return vec3(0.9686275,0.9254902,0.6431373);
}
if(palette==2){
int index=int(clamp(floor(rank*8.00000),0.0,8.00000));
if(index==0)return vec3(0.3333333,0.4156863,0.5568627);
if(index==1)return vec3(0.4627451,0.5686275,0.5960784);
if(index==2)return vec3(0.4627451,0.5686275,0.5960784);
if(index==3)return vec3(0.4627451,0.5686275,0.5960784);
if(index==4)return vec3(0.4627451,0.5686275,0.5960784);
if(index==5)return vec3(0.6901961,0.7176471,0.8745098);
if(index==6)return vec3(0.8470588,0.8431373,0.9333333);
if(index==7)return vec3(0.8274510,0.6274510,0.8274510);
if(index==8)return vec3(0.9725490,0.8235294,0.5803922);
}
if(palette==3){
int index=int(clamp(floor(rank*6.00000),0.0,6.00000));
if(index==0)return vec3(0.4509804,0.5294118,0.6156863);
if(index==1)return vec3(0.4509804,0.5294118,0.6156863);
if(index==2)return vec3(0.7254902,0.5411765,0.3568627);
if(index==3)return vec3(0.8392157,0.7019608,0.4941176);
if(index==4)return vec3(0.8392157,0.7019608,0.4941176);
if(index==5)return vec3(0.9568627,0.7490196,0.3568627);
if(index==6)return vec3(0.9686275,0.8078431,0.5411765);
}
return vec3(0.5);}

vec3 grassInk(int palette,float rank){
if(palette==0){
int index=int(clamp(floor(rank*3.00000),0.0,3.00000));
if(index==0)return vec3(0.4431373,0.5098039,0.4352941);
if(index==1)return vec3(0.7254902,0.7137255,0.5098039);
if(index==2)return vec3(0.8078431,0.7882353,0.4235294);
if(index==3)return vec3(0.9529412,0.8196078,0.2941176);
}
if(palette==1){
int index=int(clamp(floor(rank*3.00000),0.0,3.00000));
if(index==0)return vec3(0.4352941,0.5098039,0.4627451);
if(index==1)return vec3(0.5098039,0.6392157,0.6745098);
if(index==2)return vec3(0.5372549,0.6941176,0.6117647);
if(index==3)return vec3(0.9568627,0.8784314,0.5568627);
}
if(palette==2){
int index=int(clamp(floor(rank*10.00000),0.0,10.00000));
if(index==0)return vec3(0.3058824,0.4039216,0.5058824);
if(index==1)return vec3(0.3058824,0.4039216,0.5058824);
if(index==2)return vec3(0.4117647,0.5294118,0.6470588);
if(index==3)return vec3(0.4117647,0.5294118,0.6470588);
if(index==4)return vec3(0.5607843,0.5882353,0.8196078);
if(index==5)return vec3(0.5607843,0.5882353,0.8196078);
if(index==6)return vec3(0.5607843,0.5882353,0.8196078);
if(index==7)return vec3(0.7215686,0.7725490,0.8274510);
if(index==8)return vec3(0.7215686,0.7725490,0.8274510);
if(index==9)return vec3(0.9686275,0.7960784,0.5098039);
if(index==10)return vec3(0.9686275,0.7960784,0.5098039);
}
if(palette==3){
int index=int(clamp(floor(rank*10.00000),0.0,10.00000));
if(index==0)return vec3(0.4509804,0.5294118,0.6156863);
if(index==1)return vec3(0.5843137,0.5450980,0.4823529);
if(index==2)return vec3(0.6039216,0.5882353,0.4627451);
if(index==3)return vec3(0.8392157,0.6666667,0.4941176);
if(index==4)return vec3(0.8392157,0.7019608,0.4941176);
if(index==5)return vec3(0.8392157,0.7019608,0.4941176);
if(index==6)return vec3(0.9568627,0.7607843,0.3568627);
if(index==7)return vec3(0.9568627,0.7607843,0.3568627);
if(index==8)return vec3(0.9607843,0.8039216,0.4392157);
if(index==9)return vec3(0.9607843,0.8039216,0.4392157);
if(index==10)return vec3(0.9764706,0.8666667,0.6078431);
}
return vec3(0.5);}


uniform vec2 uResolution;
uniform float uZoom;
uniform vec3 uCameraRight,uCameraUp,uCameraView,uCameraTarget;
uniform float uPlants,uGrass;
uniform int uPart;
uniform sampler2D uPlant0,uPlant1,uPlant2,uPlant3;
out vec3 vColor;
struct Plant{
 vec3 root;
 float age;
 float height;
 float count;
 float pitch;
 float yaw;
 float brightness;
 float leafW;
 float leafL;
 int species;
 bool flower;
};
Plant plantAt(int id){
  ivec2 uv=ivec2(id%SITE_GRID,id/SITE_GRID);
  vec4 a=texelFetch(uPlant0,uv,0);
  vec4 b=texelFetch(uPlant1,uv,0);
  vec4 c=texelFetch(uPlant2,uv,0);
  vec4 d=texelFetch(uPlant3,uv,0);
  Plant p;
  p.root=vec3(decode16(a.rg)*80.0-40.0,
             -decode16(a.ba)*100.0,decode16(b.rg)*85.0-65.0);
  p.species=int(floor(b.b*5.0+.5));
  p.age=b.a;
  p.height=c.r;
  p.count=floor(c.g*12.0+.5);
  p.pitch=c.b*2.0*PI-PI;
  p.yaw=c.a*TAU;
  p.flower=d.r>.5;
  p.leafW=d.g;p.leafL=d.b;p.brightness=d.a;
  return p;
}
// The archived art uses rotations about x, then y, then z; preserve that order.
vec3 rotateOriginal(vec3 v,float x,float y,float z){
  float cx=cos(x),sx=sin(x),cy=cos(y),sy=sin(y),cz=cos(z),sz=sin(z);
  v=vec3(v.x*cz-v.y*sz,v.x*sz+v.y*cz,v.z);
  v=vec3(v.x*cy-v.z*sy,v.y,v.x*sy+v.z*cy);
  return vec3(v.x,v.y*cx-v.z*sx,v.y*sx+v.z*cx);
}
float stemSegmentLength(Plant p){
  return 5.0*sigmoid(mix(.1,1.0,p.age),.8)*(p.flower?1.0:.5);
}
vec3 stemAt(Plant p,float t){
  // Integrates the original incremental yaw/pitch curvature approximately,
  // with the same number of 5-unit age-scaled stem segments.
  float length=stemSegmentLength(p)*p.count*t;
  float angle=p.pitch*t*.78;
  return p.root+vec3(-sin(p.yaw)*sin(angle)*length,
                      -cos(angle)*length,
                      cos(p.yaw)*sin(angle)*length);
}
vec3 stemTangent(Plant p,float t){
  float lo=max(0.0,t-.005),hi=min(1.0,t+.005);
  return normalize(stemAt(p,hi)-stemAt(p,lo));
}
vec3 localLeaf(Plant p,int leaf,int index){
  int segment=p.flower?leaf:(leaf/2);
  int k=p.flower?0:(leaf%2);
  float step=float(segment)/max(p.count,1.0);
  float within=noise2(vec2(float(k)*100.0,0.0));
  float attach=(float(segment)+within)/max(p.count,1.0);
  float scale=mix(.75,.5,step)*clamp(p.age-step*.5,0.0,1.0);
  float length=mix(leafLengthMin(p.species),leafLengthMax(p.species),p.leafL);
  float h=mix(leafHeightMin(p.species),leafHeightMax(p.species),p.leafL);
  float ang=TAU*float(index%13)/13.0;
  float along=(cos(ang)+1.0)*.5;
  // Exactly thirteen samples on the archive's elongated curved leaf outline.
  vec3 shape=vec3(sin(ang),cos(ang)+1.0,
                -sqrt(max(0.0,1.0-pow(1.0-along,2.0))));
  shape*=vec3(leafWidth(p.species),length,h)*scale;
  shape=rotateOriginal(shape,p.age*PI/2.0+PI/4.0,0.0,PI/2.0);
  shape=rotateOriginal(shape,0.0,PI/2.0,0.0);
  float twist=(noise2(p.root.xz*.045+vec2(float(segment),float(k)*10.0))*2.0-1.0)*TAU;
  shape=rotateOriginal(shape,0.0,0.0,twist);
  vec3 tangent=stemTangent(p,attach);
  shape=rotateOriginal(shape,atan(tangent.y,length(tangent.xz)),0.0,0.0);
  shape=rotateOriginal(shape,0.0,-atan(tangent.x,tangent.z),0.0);
  return stemAt(p,attach)+shape;
}
vec3 localPetal(Plant p,int layer,int petal,int index){
  float n=petalCount(p.species);
  float layers=layerCount(p.species);
  float count=floor(n*mix(.8,1.0,float(layer)/layers)+.5);
  float radial=float(petal)*TAU/max(count,1.0)+PI/2.0+float(layer)*PI/8.0;
  float a=TAU*float(index%13)/13.0;
  float along=(cos(a)+1.0)*.5;
  vec3 shape=vec3(sin(a),cos(a)+1.0,-sqrt(max(0.0,1.0-pow(1.0-along,2.0))));
  shape.x*=mix(1.0,petalTaper(p.species),along);
  float age=p.age;
  float sz=age>.2?pow(mix(.5,1.0,clamp((age-.2)/.8,0.0,1.0)),2.0):
    pow(mix(0.0,.5,age/.2),4.0);
  shape*=vec3(petalSX(p.species),petalSY(p.species),petalSZ(p.species))*sz;
  float layerPitch=-pow(float(layer)/layers,.8)*PI/2.0*sigmoid(age,.8);
  shape=rotateOriginal(shape,layerPitch+sqrt(max(0.0,1.0-age))*PI-PI/10.0,0.0,0.0);
  shape=rotateOriginal(shape,0.0,0.0,radial);
  vec3 offset=rotateOriginal(vec3(headOffset(p.species)*age,0.0,0.0),0.0,0.0,radial+PI/2.0);
  shape+=offset;
  vec3 tangent=stemTangent(p,1.0);
  shape=rotateOriginal(shape,PI/2.0,0.0,0.0);
  shape=rotateOriginal(shape,atan(tangent.y,length(tangent.xz))+PI/2.0,0.0,0.0);
  shape=rotateOriginal(shape,0.0,-atan(tangent.x,tangent.z)+PI,0.0);
  return stemAt(p,1.0)+shape;
}
vec3 localDisk(Plant p,int index){
  float a=TAU*float(index%13)/13.0;
  float r=(headOffset(p.species)+.8)*p.age;
  vec3 shape=vec3(sin(a)*r,cos(a)*r,0.0);
  vec3 tangent=stemTangent(p,1.0);
  shape=rotateOriginal(shape,PI/2.0,0.0,0.0);
  shape=rotateOriginal(shape,atan(tangent.y,length(tangent.xz))+PI/2.0,0.0,0.0);
  shape=rotateOriginal(shape,0.0,-atan(tangent.x,tangent.z)+PI,0.0);
  return stemAt(p,1.0)+shape;
}
vec3 grassAt(Plant p,int attempt,int corner){
  float angleNoise=fractal(p.root.xz*.01,2.0,.8,3)*2.0-1.0;
  float a=angleNoise*PI/3.0+
    (fractal(p.root.xz*.014+vec2(3.7,2.5),2.0,.8,3)*2.0-1.0)*PI/3.0*.48*.75;
  float height=mix(5.0,15.0,noise2(p.root.xz*.04+vec2(543232.0,6544121.0)));
  // Grass is constructed in the original screen-aligned XY plane; convert
  // its 2D triangle into the same 3D coordinate plane for orbiting.
  vec2 local=corner==0?vec2(-1.25,0.0):corner==1?vec2(0.0,-height*.5):vec2(1.25,0.0);
  vec2 projected=vec2(local.x*cos(a)-local.y*sin(a),
                      local.x*sin(a)+local.y*cos(a));
  vec2 inverseRot=vec2((projected.x+projected.y)*.70710678,
                       (projected.y-projected.x)*.70710678);
  return p.root+vec3(inverseRot,0.0);
}
void main(){
  int vertex=gl_VertexID,inst=gl_InstanceID;
  int id=uPart==0?inst/2:inst;
  Plant p=plantAt(id);
  // At 0 density, leave the instance invisible without modifying its seed.
  bool visible=true;
  if(uPart==0){
    int attempt=inst%2;
    float thresholdNoise=fractal(vec2(p.root.x*.02+5432.0,p.root.z*.08+654321.0),4.0,.25,1)*2.0-1.0;
    float bladeCount=clamp(1.5-.5*(thresholdNoise-uFlowerThreshold),1.0,2.0);
    visible=rand1(float(inst)*2.9+18.0)<uGrass;
    visible=visible&&(attempt==0||bladeCount>1.5);
  }else visible=rand1(float(id)*.91+113.0)<uPlants;
  if(uPart>=3)visible=visible&&p.flower;
  if(!visible){
    gl_Position=vec4(3.0,3.0,1.0,1.0);
    vColor=vec3(0.0);
    return;
  }
  vec3 position=p.root;
  if(uPart==0){
    position=grassAt(p,inst%2,vertex%3);
    vColor=grassInk(uPalette,clamp(p.brightness+(rand1(float(inst)*1.87)-.5)*.6,0.0,1.0));
  }else if(uPart==1){
    int segment=vertex/6;
    if(float(segment)>=p.count){gl_Position=vec4(3.0,3.0,1.0,1.0);return;}
    int q=vertex%6;
    int corner=q==0?0:q==1?1:q==2?2:q==3?0:q==4?2:3;
    float t=float(segment+(corner==0||corner==3?0:1))/max(p.count,1.0);
    vec3 base=stemAt(p,t);
    vec3 across=normalize(cross(stemTangent(p,t),vec3(0,0,1)));
    if(length(across)<.01)across=vec3(1,0,0);
    position=base+across*mix(.20,.045,t)*(corner==0||corner==1?-1.0:1.0);
    vColor=stemInk(p.species,uPalette);
  }else if(uPart==2){
    int leaf=vertex/(13*3);
    int maxLeaves=p.flower?int(p.count):int(p.count)*2;
    if(leaf>=maxLeaves){gl_Position=vec4(3.0,3.0,1.0,1.0);return;}
    int tri=(vertex/3)%13,q=vertex%3;
    int point=q==0?0:q==1?tri:(tri+1)%13;
    position=localLeaf(p,leaf,point);
    float light=mix(p.brightness*.45,1.0,float(leaf)/max(float(maxLeaves),1.0));
    vColor=leafInk(uPalette,clamp(sqrt(max(light,0.0))*(.5+.5*p.brightness),0.0,1.0));
  }else if(uPart==3){
    int slot=vertex/(13*3),layer=0,petal=0,cursor=slot;
    int layers=int(layerCount(p.species));
    bool selected=false;
    for(int k=0;k<3;k++){
      if(k>=layers)break;
      int count=int(floor(petalCount(p.species)*mix(.8,1.0,float(k)/float(layers))+.5));
      if(cursor<count){layer=k;petal=cursor;selected=true;break;}
      cursor-=count;
    }
    if(!selected){gl_Position=vec4(3.0,3.0,1.0,1.0);return;}
    int tri=(vertex/3)%13,q=vertex%3;
    int point=q==0?0:q==1?tri:(tri+1)%13;
    // Source condition thins older blossoms but retains juveniles.
    float no=rand1(float(id)*29.2+float(petal)*17.0+float(layer));
    if(no>= (p.age<.5?1.0:mix(1.0,.20,clamp((p.age-.5)/.5,0.0,1.0))))
      {gl_Position=vec4(3.0,3.0,1.0,1.0);return;}
    position=localPetal(p,layer,petal,point);
    vColor=petalInk(p.species,uPalette);
  }else{
    int layer=vertex/(13*3);
    if(float(layer)>=layerCount(p.species)){gl_Position=vec4(3.0,3.0,1.0,1.0);return;}
    int tri=(vertex/3)%13,q=vertex%3;
    int point=q==0?0:q==1?tri:(tri+1)%13;
    position=localDisk(p,point);
    vColor=diskInk(p.species,uPalette);
  }
  // The original source is Y-down, then rotates XY by 45 degrees for its
  // orthographic view. In a proper orbit scene we invert world X/Y here and
  // use a +45-degree camera roll to reproduce that same view at reset.
  vec3 world=vec3(-position.x,-position.y,position.z);
  vec3 rel=world-uCameraTarget;
  vec2 viewPlane=vec2(dot(rel,uCameraRight),dot(rel,uCameraUp));
  vec2 ndc=viewPlane*uZoom*2.0/uResolution;
  float depth=clamp(-dot(rel,uCameraView)/120.0,-.99,.99);
  gl_Position=vec4(ndc,depth,1.0);
}`;
