/**
 * Never the Same (2025) — static geometry port.
 *
 * Based on the artist's ORIGINAL archived code, Ethereum fxhash contract
 * 0x34D827cFFECD117C61BcdCE797f3Cd3993d0C409
 * Source snapshot:
 *   ipfs://QmcEFyzV5UHgdyVPTbaSVFd5jgCKq3SQM79HqMzAUUYWM5
 * The original openSimplexNoise, vector transforms, petal/leaf/disk forms,
 * flower species & palettes, stem/leaf placement and grass triangles are
 * reproduced below. Only p5 setup, old hatching/occlusion, and time-varying
 * animation/displacement were removed.
 */
const PI=Math.PI,TAU=2*Math.PI;
const sin=Math.sin,cos=Math.cos,sqrt=Math.sqrt,pow=Math.pow,
  sq=x=>x*x,round=Math.round,floor=Math.floor,ceil=Math.ceil,
  min=Math.min,max=Math.max,abs=Math.abs,atan2=Math.atan2;
const constrain=(x,a,b)=>max(a,min(b,x));
const map=(x,a,b,c,d,clamp=false)=>{
  const y=c+(x-a)*(d-c)/(b-a);
  return clamp?constrain(y,min(c,d),max(c,d)):y;
};
const norm=(x,a,b)=>(x-a)/(b-a);
const lerp=(a,b,m)=>a+(b-a)*m;
const color=c=>c;
const print=()=>{};
let prngState=2611;
function random(a,b) {
  prngState=(prngState+0x6D2B79F5)>>>0;
  let x=prngState;
  x=Math.imul(x^(x>>>15),x|1);
  x^=x+Math.imul(x^(x>>>7),x|61);
  const u=((x^(x>>>14))>>>0)/4294967296;
  if(Array.isArray(a))return a[floor(u*a.length)];
  if(a===undefined)return u;
  if(b===undefined)return a*u;
  return a+(b-a)*u;
}
function randomGaussian(mu=0,sigma=1){
  const u=max(1e-9,random());
  return mu+sigma*sqrt(-2*Math.log(u))*cos(TAU*random());
}
let sNoise,shapes=[],booleanShapes=[];
let leafPalette,grassPalette,bgColor,paletteIndex=0;
const MAP_WIDTH=100,MAP_HEIGHT=175;
let terrainHt=[],terrainLighting=[];
let time_short=0,time_long=0.17,timeVaryingWiggleMagnitude=0.48,windDirection=PI/2,flowerTypeNoiseScaleModifier=1;
let curveDetailMultiplier=1,targetSzX=75,targetSzY=75;
function noise(x,y=0,z=0){return norm(sNoise.noise3D(x,y,z),-1,1);}
// Same discrete 100×175 height and light maps as prepHeightmap() in the
// archived artwork. Computing both once also avoids noise calls per plant.
function prepareTerrain() {
  terrainHt=Array.from({length:MAP_WIDTH},()=>new Float64Array(MAP_HEIGHT));
  terrainLighting=Array.from({length:MAP_WIDTH-1},()=>new Float64Array(MAP_HEIGHT-1));
  const lightAngle=PI/5;
  const light=_normalize(_createV(cos(lightAngle),-.8,sin(lightAngle)));
  for(let i=0;i<MAP_WIDTH;i++)for(let j=0;j<MAP_HEIGHT;j++){
    terrainHt[i][j]=pow(j/MAP_HEIGHT,1)*fractalNoise({
      x:i*.024,y:0,z:j*.024,nOctaves:3,
      scaleFallout:1.5,weightFallout:.85
    });
  }
  for(let i=0;i<MAP_WIDTH-1;i++)for(let j=0;j<MAP_HEIGHT-1;j++){
    const normal=_normalize(_createV(
      terrainHt[i+1][j]-terrainHt[i][j],0,
      terrainHt[i][j+1]-terrainHt[i][j]));
    terrainLighting[i][j]=map(-_dot(normal,light),-1,1,0,1);
  }
}
function heightMap(x,z){
  const i=constrain(floor(map(x,-targetSzX/2,targetSzX/2,0,MAP_WIDTH)),0,MAP_WIDTH-1);
  const j=constrain(floor(map(z,-targetSzY*.6-10,targetSzY*.6-10,0,MAP_HEIGHT)),0,MAP_HEIGHT-1);
  return terrainHt[i][j]*100;
}
function terrainLight(x,z){
  // Original lightMap lookup uses distinct sampling bounds from heightMap.
  const i=floor(map(x,-targetSzX/1.4,targetSzX/1.4,0,MAP_WIDTH));
  const j=floor(map(z,-targetSzY*.48-25,1.15*targetSzY*.5-25,0,MAP_HEIGHT));
  return i>=0&&i<MAP_WIDTH-1&&j>=0&&j<MAP_HEIGHT-1
    ?terrainLighting[i][j]:1;
}
class _Shape {
  constructor(closed){this.closed=closed;this.points=[];}
  setPoints(points){this.points=points.map(_copyV);}
}


function openSimplexNoise(clientSeed) {
    "use strict";
    const SQ5 = 2.23606797749979;
    const SQ4 = 2;
    const SQ3 = 1.7320508075688772;
    const toNums = (s) => s.split(",").map(s => new Uint8Array(s.split("").map(v => Number(v))));
    const decode = (m, r, s) => new Int8Array(s.split("").map(v => parseInt(v, r) + m));
    const toNumsB32 = (s) => s.split(",").map(s => parseInt(s, 32));
    const NORM_2D = 1.0 / 47.0;
    const NORM_3D = 1.0 / 103.0;
    const NORM_4D = 1.0 / 30.0;
    const SQUISH_2D = (SQ3 - 1) / 2;
    const SQUISH_3D = (SQ4 - 1) / 3;
    const SQUISH_4D = (SQ5 - 1) / 4;
    const STRETCH_2D = (1 / SQ3 - 1) / 2;
    const STRETCH_3D = (1 / SQ4 - 1) / 3;
    const STRETCH_4D = (1 / SQ5 - 1) / 4;
    var base2D = toNums("110101000,110101211");
    var base3D = toNums("0000110010101001,2110210120113111,110010101001211021012011");
    var base4D = toNums("0000011000101001001010001,3111031101310113011141111,11000101001001010001211002101021001201102010120011,31110311013101130111211002101021001201102010120011");
    const gradients2D = decode(-5, 11, "a77a073aa3700330");
    const gradients3D = decode(-11, 23, "0ff7mf7fmmfffmfffm07f70f77mm7ff0ff7m0f77m77f0mf7fm7ff0077707770m77f07f70");
    const gradients4D = decode(-3, 7, "6444464444644446044426442464244662444044426442460244204422642246642446244404442604242624240424266224402442044226022420242204222664424642446244400442264224622440624240424262424002422042226222406422462244024420042226222402242062224022420242200222202222022220");
    var lookupPairs2D = () => new Uint8Array([0, 1, 1, 0, 4, 1, 17, 0, 20, 2, 21, 2, 22, 5, 23, 5, 26, 4, 39, 3, 42, 4, 43, 3]);
    var lookupPairs3D = () => new Uint16Array(toNumsB32("0,2,1,1,2,2,5,1,6,0,7,0,10,2,12,2,41,1,45,1,50,5,51,5,g6,0,g7,0,h2,4,h6,4,k5,3,k7,3,l0,5,l1,5,l2,4,l5,3,l6,4,l7,3,l8,d,l9,d,la,c,ld,e,le,c,lf,e,m8,k,ma,i,p9,l,pd,n,q8,k,q9,l,15e,j,15f,m,16a,i,16e,j,19d,n,19f,m,1a8,f,1a9,h,1aa,f,1ad,h,1ae,g,1af,g,1ag,b,1ah,a,1ai,b,1al,a,1am,9,1an,9,1bg,b,1bi,b,1eh,a,1el,a,1fg,8,1fh,8,1qm,9,1qn,9,1ri,7,1rm,7,1ul,6,1un,6,1vg,8,1vh,8,1vi,7,1vl,6,1vm,7,1vn,6"));
    var lookupPairs4D = () => new Uint32Array(toNumsB32("0,3,1,2,2,3,5,2,6,1,7,1,8,3,9,2,a,3,d,2,g,3,i,3,m,1,n,1,o,3,q,3,11,2,15,2,16,1,17,1,19,2,1d,2,1m,1,1n,1,1o,0,1p,0,1q,0,1r,0,1s,0,1t,0,1u,0,1v,0,80,3,82,3,88,3,8a,3,8g,3,8i,3,8o,3,8q,3,201,2,205,2,209,2,20d,2,211,2,215,2,219,2,21d,2,280,9,281,9,288,9,289,9,g06,1,g07,1,g0m,1,g0n,1,g16,1,g17,1,g1m,1,g1n,1,g82,8,g86,8,g8i,8,g8m,8,i05,6,i07,6,i15,6,i17,6,i80,9,i81,9,i82,8,i85,6,i86,8,i87,6,i88,9,i89,9,i8i,8,i8m,8,i95,6,i97,6,401o,0,401p,0,401q,0,401r,0,401s,0,401t,0,401u,0,401v,0,408o,7,408q,7,409o,7,409q,7,4219,5,421d,5,421p,5,421t,5,4280,9,4281,9,4288,9,4289,9,428o,7,428q,7,4299,5,429d,5,429o,7,429p,5,429q,7,429t,5,4g1m,4,4g1n,4,4g1u,4,4g1v,4,4g82,8,4g86,8,4g8i,8,4g8m,8,4g8o,7,4g8q,7,4g9m,4,4g9n,4,4g9o,7,4g9q,7,4g9u,4,4g9v,4,4i05,6,4i07,6,4i15,6,4i17,6,4i19,5,4i1d,5,4i1m,4,4i1n,4,4i1p,5,4i1t,5,4i1u,4,4i1v,4,4i80,9,4i81,9,4i82,8,4i85,6,4i86,8,4i87,6,4i88,9,4i89,9,4i8i,8,4i8m,8,4i8o,7,4i8q,7,4i95,6,4i97,6,4i99,5,4i9d,5,4i9m,4,4i9n,4,4i9o,7,4i9p,5,4i9q,7,4i9t,5,4i9u,4,4i9v,4,4ia0,15,4ia1,15,4ia2,14,4ia5,12,4ia6,14,4ia7,12,4ia8,15,4ia9,15,4iai,14,4iam,14,4iao,13,4iaq,13,4ib5,12,4ib7,12,4ib9,11,4ibd,11,4ibm,10,4ibn,10,4ibo,13,4ibp,11,4ibq,13,4ibt,11,4ibu,10,4ibv,10,4ii0,1h,4ii2,1g,4ii8,1h,4iii,1g,4iio,1f,4iiq,1f,4ka1,1e,4ka5,1d,4ka9,1e,4kb5,1d,4kb9,1c,4kbd,1c,4ki0,1h,4ki1,1e,4ki8,1h,4ki9,1e,52a6,1b,52a7,1a,52am,1b,52b7,1a,52bm,19,52bn,19,52i2,1g,52i6,1b,52ii,1g,52im,1b,54a5,1d,54a7,1a,54b5,1d,54b7,1a,54i0,v,54i1,s,54i2,v,54i5,s,54i6,p,54i7,p,8ibo,18,8ibp,17,8ibq,18,8ibt,17,8ibu,16,8ibv,16,8iio,1f,8iiq,1f,8ijo,18,8ijq,18,8kb9,1c,8kbd,1c,8kbp,17,8kbt,17,8ki8,u,8ki9,r,8kio,u,8kj9,r,8kjo,m,8kjp,m,92bm,19,92bn,19,92bu,16,92bv,16,92ii,t,92im,o,92iq,t,92jm,o,92jq,l,92ju,l,94b5,q,94b7,n,94bd,q,94bn,n,94bt,k,94bv,k,94i0,v,94i1,s,94i2,v,94i5,s,94i6,p,94i7,p,94i8,u,94i9,r,94ii,t,94im,o,94io,u,94iq,t,94j5,q,94j7,n,94j9,r,94jd,q,94jm,o,94jn,n,94jo,m,94jp,m,94jq,l,94jt,k,94ju,l,94jv,k,94k0,1t,94k1,1s,94k2,1t,94k5,1s,94k6,1r,94k7,1r,94k8,1q,94k9,1p,94ki,1n,94km,1m,94ko,1q,94kq,1n,94l5,1k,94l7,1j,94l9,1p,94ld,1k,94lm,1m,94ln,1j,94lo,1o,94lp,1o,94lq,1l,94lt,1i,94lu,1l,94lv,1i,94s0,1t,94s2,1t,94s8,1q,94si,1n,94so,1q,94sq,1n,96k1,1s,96k5,1s,96k9,1p,96l5,1k,96l9,1p,96ld,1k,96s0,2f,96s1,2f,96s8,2c,96s9,2c,9kk6,1r,9kk7,1r,9kkm,1m,9kl7,1j,9klm,1m,9kln,1j,9ks2,2e,9ks6,2e,9ksi,29,9ksm,29,9mk5,2d,9mk7,2d,9ml5,26,9ml7,26,9ms0,2f,9ms1,2f,9ms2,2e,9ms5,2d,9ms6,2e,9ms7,2d,d4lo,1o,d4lp,1o,d4lq,1l,d4lt,1i,d4lu,1l,d4lv,1i,d4so,2b,d4sq,28,d4to,2b,d4tq,28,d6l9,2a,d6ld,25,d6lp,2a,d6lt,25,d6s8,2c,d6s9,2c,d6so,2b,d6t9,2a,d6to,2b,d6tp,2a,dklm,27,dkln,24,dklu,27,dklv,24,dksi,29,dksm,29,dksq,28,dktm,27,dktq,28,dktu,27,dml5,26,dml7,26,dmld,25,dmln,24,dmlt,25,dmlv,24,dms0,23,dms1,23,dms2,22,dms5,20,dms6,22,dms7,20,dms8,23,dms9,23,dmsi,22,dmsm,22,dmso,21,dmsq,21,dmt5,20,dmt7,20,dmt9,1v,dmtd,1v,dmtm,1u,dmtn,1u,dmto,21,dmtp,1v,dmtq,21,dmtt,1v,dmtu,1u,dmtv,1u,dmu0,j,dmu1,j,dmu2,i,dmu5,g,dmu6,i,dmu7,g,dmu8,j,dmu9,j,dmui,i,dmum,i,dmuo,h,dmuq,h,dmv5,g,dmv7,g,dmv9,f,dmvd,f,dmvm,e,dmvn,e,dmvo,h,dmvp,f,dmvq,h,dmvt,f,dmvu,e,dmvv,e,dn60,j,dn61,j,dn62,i,dn66,i,dn68,j,dn69,j,dn6i,i,dn6m,i,dn6o,h,dn6q,h,dn7o,h,dn7q,h,dou0,j,dou1,j,dou5,g,dou7,g,dou8,j,dou9,j,dov5,g,dov7,g,dov9,f,dovd,f,dovp,f,dovt,f,dp60,j,dp61,j,dp68,j,dp69,j,e6u2,i,e6u5,g,e6u6,i,e6u7,g,e6ui,i,e6um,i,e6v5,g,e6v7,g,e6vm,e,e6vn,e,e6vu,e,e6vv,e,e762,i,e766,i,e76i,i,e76m,i,e8u5,g,e8u7,g,e8v5,g,e8v7,g,e960,d,e961,d,e962,d,e963,d,e964,d,e965,d,e966,d,e967,d,hmuo,h,hmuq,h,hmv9,f,hmvd,f,hmvm,e,hmvn,e,hmvo,h,hmvp,f,hmvq,h,hmvt,f,hmvu,e,hmvv,e,hn6o,h,hn6q,h,hn7o,h,hn7q,h,hov9,f,hovd,f,hovp,f,hovt,f,hp68,c,hp69,c,hp6o,c,hp6p,c,hp78,c,hp79,c,hp7o,c,hp7p,c,i6vm,e,i6vn,e,i6vu,e,i6vv,e,i76i,b,i76m,b,i76q,b,i76u,b,i77i,b,i77m,b,i77q,b,i77u,b,i8v5,a,i8v7,a,i8vd,a,i8vf,a,i8vl,a,i8vn,a,i8vt,a,i8vv,a,i960,d,i961,d,i962,d,i963,d,i964,d,i965,d,i966,d,i967,d,i968,c,i969,c,i96i,b,i96m,b,i96o,c,i96p,c,i96q,b,i96u,b,i975,a,i977,a,i978,c,i979,c,i97d,a,i97f,a,i97i,b,i97l,a,i97m,b,i97n,a,i97o,c,i97p,c,i97q,b,i97t,a,i97u,b,i97v,a"));
    var p2D = decode(-1, 4, "112011021322233123132111");
    var p3D = decode(-1, 5, "112011210110211120110121102132212220132122202131222022243214231243124213241324123222113311221213131221123113311112202311112022311112220342223113342223311342223131322023113322023311320223113320223131322203311322203131");
    var p4D = decode(-1, 6, "11201112101121101102111120111210110121110211112011011211012111021322112220122210132121220212212013122120221212201321122201222102131212202122120213112220122210222532215232152231253212523125221325312252132521232513225123251223232211432114231123212143121421312312214132141231232112431124211323121241312412132311224113241123342221322203311134221232202331113421223202233111342221322203131134221232202313113412223022231311342221322203113134212232022311313412223022231131342212322023111334212232022311133412223022231113322201222101111132202122120111113202212122011111322012221021111132021221202111113201222102211111322201222103311132202122120331113220122210233111322201222103131132022121220313113202122120231311322021221203113132022121220311313201222102231131322012221023111332021221202311133201222102231113422111331113222042121131311322204211213113132220422111331113220242121131311322024211123111332202422111331113202242112131131320224211123111332022421211313113022242112131131302224211123111330222443211423115222244312142131522224413214123152222443112421135222244131241213522224411324112352222443211423113222044312142131322204413214123132220443211423113220244311242113322024413124121332202443121421313202244311242113320224411324112332022441321412313022244131241213302224411324112330222");

    const setOf = (count, cb = (i) => i) => { var a = [], i = 0; while (i < count) { a.push(cb(i++)) } return a };
    const doFor = (count, cb) => { var i = 0; while (i < count && cb(i++) !== true); };

    function shuffleSeed(seed, count = 1) {
        seed = seed * 1664525 + 1013904223 | 0;
        count -= 1;
        return count > 0 ? shuffleSeed(seed, count) : seed;
    }
    const types = {
        _2D: {
            base: base2D,
            squish: SQUISH_2D,
            dimensions: 2,
            pD: p2D,
            lookup: lookupPairs2D,
        },
        _3D: {
            base: base3D,
            squish: SQUISH_3D,
            dimensions: 3,
            pD: p3D,
            lookup: lookupPairs3D,
        },
        _4D: {
            base: base4D,
            squish: SQUISH_4D,
            dimensions: 4,
            pD: p4D,
            lookup: lookupPairs4D,
        },
    };

    function createContribution(type, baseSet, index) {
        var i = 0;
        const multiplier = baseSet[index++];
        const c = { next: undefined };
        while (i < type.dimensions) {
            const axis = ("xyzw")[i];
            c[axis + "sb"] = baseSet[index + i];
            c["d" + axis] = - baseSet[index + i++] - multiplier * type.squish;
        }
        return c;
    }

    function createLookupPairs(lookupArray, contributions) {
        var i;
        const a = lookupArray();
        const res = new Map();
        for (i = 0; i < a.length; i += 2) { res.set(a[i], contributions[a[i + 1]]) }
        return res;
    }

    function createContributionArray(type) {
        const conts = [];
        const d = type.dimensions;
        const baseStep = d * d;
        var k, i = 0;
        while (i < type.pD.length) {
            const baseSet = type.base[type.pD[i]];
            let previous, current;
            k = 0;
            do {
                current = createContribution(type, baseSet, k);
                if (!previous) { conts[i / baseStep] = current }
                else { previous.next = current }
                previous = current;
                k += d + 1;
            } while (k < baseSet.length);

            current.next = createContribution(type, type.pD, i + 1);
            if (d >= 3) { current.next.next = createContribution(type, type.pD, i + d + 2) }
            if (d === 4) { current.next.next.next = createContribution(type, type.pD, i + 11) }
            i += baseStep;
        }
        const result = [conts, createLookupPairs(type.lookup, conts)];
        type.base = undefined;
        type.lookup = undefined;
        return result;
    }

    const [contributions2D, lookup2D] = createContributionArray(types._2D);
    const [contributions3D, lookup3D] = createContributionArray(types._3D);
    const [contributions4D, lookup4D] = createContributionArray(types._4D);
    const perm = new Uint8Array(256);
    const perm2D = new Uint8Array(256);
    const perm3D = new Uint8Array(256);
    const perm4D = new Uint8Array(256);
    const source = new Uint8Array(setOf(256, i => i));
    var seed = shuffleSeed(clientSeed, 3);
    doFor(256, i => {
        i = 255 - i;
        seed = shuffleSeed(seed);
        var r = (seed + 31) % (i + 1);
        r += r < 0 ? i + 1 : 0;
        perm[i] = source[r];
        perm2D[i] = perm[i] & 0x0E;
        perm3D[i] = (perm[i] % 24) * 3;
        perm4D[i] = perm[i] & 0xFC;
        source[r] = source[i];
    });
    base2D = base3D = base4D = undefined;
    lookupPairs2D = lookupPairs3D = lookupPairs4D = undefined;
    p2D = p3D = p4D = undefined;

    const API = {
        noise2D(x, y) {
            const pD = perm2D;
            const p = perm;
            const g = gradients2D;
            const stretchOffset = (x + y) * STRETCH_2D;
            const xs = x + stretchOffset, ys = y + stretchOffset;
            const xsb = Math.floor(xs), ysb = Math.floor(ys);
            const squishOffset = (xsb + ysb) * SQUISH_2D;
            const dx0 = x - (xsb + squishOffset), dy0 = y - (ysb + squishOffset);
            var c = (() => {
                const xins = xs - xsb, yins = ys - ysb;
                const inSum = xins + yins;
                return lookup2D.get(
                    (xins - yins + 1) |
                    (inSum << 1) |
                    ((inSum + yins) << 2) |
                    ((inSum + xins) << 4)
                );
            })();
            var i, value = 0;
            while (c !== undefined) {
                const dx = dx0 + c.dx;
                const dy = dy0 + c.dy;
                let attn = 2 - dx * dx - dy * dy;
                if (attn > 0) {
                    i = pD[(p[(xsb + c.xsb) & 0xFF] + (ysb + c.ysb)) & 0xFF];
                    attn *= attn;
                    value += attn * attn * (g[i++] * dx + g[i] * dy);
                }
                c = c.next;
            }
            return value * NORM_2D;
        },
        noise3D(x, y, z) {
            const pD = perm3D;
            const p = perm;
            const g = gradients3D;
            const stretchOffset = (x + y + z) * STRETCH_3D;
            const xs = x + stretchOffset, ys = y + stretchOffset, zs = z + stretchOffset;
            const xsb = Math.floor(xs), ysb = Math.floor(ys), zsb = Math.floor(zs);
            const squishOffset = (xsb + ysb + zsb) * SQUISH_3D;
            const dx0 = x - (xsb + squishOffset), dy0 = y - (ysb + squishOffset), dz0 = z - (zsb + squishOffset);
            var c = (() => {
                const xins = xs - xsb, yins = ys - ysb, zins = zs - zsb;
                const inSum = xins + yins + zins;
                return lookup3D.get(
                    (yins - zins + 1) |
                    ((xins - yins + 1) << 1) |
                    ((xins - zins + 1) << 2) |
                    (inSum << 3) |
                    ((inSum + zins) << 5) |
                    ((inSum + yins) << 7) |
                    ((inSum + xins) << 9)
                );
            })();
            var i, value = 0;
            while (c !== undefined) {
                const dx = dx0 + c.dx, dy = dy0 + c.dy, dz = dz0 + c.dz;
                let attn = 2 - dx * dx - dy * dy - dz * dz;
                if (attn > 0) {
                    i = pD[(((p[(xsb + c.xsb) & 0xFF] + (ysb + c.ysb)) & 0xFF) + (zsb + c.zsb)) & 0xFF];
                    attn *= attn;
                    value += attn * attn * (g[i++] * dx + g[i++] * dy + g[i] * dz);
                }
                c = c.next;
            }
            return value * NORM_3D;
        },
        noise4D(x, y, z, w) {
            const pD = perm4D;
            const p = perm;
            const g = gradients4D;
            const stretchOffset = (x + y + z + w) * STRETCH_4D;
            const xs = x + stretchOffset, ys = y + stretchOffset, zs = z + stretchOffset, ws = w + stretchOffset;
            const xsb = Math.floor(xs), ysb = Math.floor(ys), zsb = Math.floor(zs), wsb = Math.floor(ws);
            const squishOffset = (xsb + ysb + zsb + wsb) * SQUISH_4D;
            const dx0 = x - (xsb + squishOffset), dy0 = y - (ysb + squishOffset), dz0 = z - (zsb + squishOffset), dw0 = w - (wsb + squishOffset);
            var c = (() => {
                const xins = xs - xsb, yins = ys - ysb, zins = zs - zsb, wins = ws - wsb;
                const inSum = xins + yins + zins + wins;
                return lookup4D.get(
                    (zins - wins + 1) |
                    ((yins - zins + 1) << 1) |
                    ((yins - wins + 1) << 2) |
                    ((xins - yins + 1) << 3) |
                    ((xins - zins + 1) << 4) |
                    ((xins - wins + 1) << 5) |
                    (inSum << 6) |
                    ((inSum + wins) << 8) |
                    ((inSum + zins) << 11) |
                    ((inSum + yins) << 14) |
                    ((inSum + xins) << 17)
                );
            })();
            var i, value = 0;
            while (c !== undefined) {
                const dx = dx0 + c.dx, dy = dy0 + c.dy, dz = dz0 + c.dz, dw = dw0 + c.dw;
                let attn = 2 - dx * dx - dy * dy - dz * dz - dw * dw;
                if (attn > 0) {
                    i = pD[(((((p[(xsb + c.xsb) & 0xFF] + (ysb + c.ysb)) & 0xFF) + (zsb + c.zsb)) & 0xFF) + (wsb + c.wsb)) & 0xFF];
                    attn *= attn;
                    value += attn * attn * (g[i++] * dx + g[i++] * dy + g[i++] * dz + g[i] * dw);
                }
                c = c.next;
            }
            return value * NORM_4D;
        },
    }
    return API;
}

function _createV(x, y, z) {
    let _z = z;
    if (_z == undefined) {
        _z = 0;
    }
    let _y = y;
    if (_y == undefined) {
        _y = 0;
    }
    let _x = x;
    if (_x == undefined) {
        _x = 0;
    }
    return {
        x: _x,
        y: _y,
        z: _z
    };
}

function _copyV(v) {
    return _createV(
        v.x,
        v.y,
        v.z
    );
}

function _normalize(v) {
    let mg = _mag(v);
    if (mg == 0) {
        return v;
    }
    return _scalarMult(v, 1.0 / mg);
}

function _setMag(v, mag) {
    return _scalarMult(_normalize(v), mag);
}

function _add(a, b) {
    return _createV(
        a.x + b.x,
        a.y + b.y,
        a.z + b.z
    );
}

function _sub(a, b) {
    return _createV(
        a.x - b.x,
        a.y - b.y,
        a.z - b.z
    );
}

function _mult(a, b) {
    return _createV(
        a.x * b.x,
        a.y * b.y,
        a.z * b.z
    );
}

function _scalarMult(v, s) {
    return _createV(
        v.x * s,
        v.y * s,
        v.z * s
    );
}

function _mag(v) {
    return sqrt(sq(v.x) + sq(v.y) + sq(v.z));
}

function _dot(v1, v2) {
    return (
        v1.x * v2.x +
        v1.y * v2.y +
        v1.z * v2.z
    );
}

function _cross(v1, v2) {
    return _createV(
        v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
        v1.x * v2.y - v1.y * v2.x
    );
}

function _lerp(v1, v2, m) {
    return _createV(
        lerp(v1.x, v2.x, m),
        lerp(v1.y, v2.y, m),
        lerp(v1.z, v2.z, m)
    );
}

function _rotate(v, a, b, c) {
    let ca = cos(c);
    let cb = cos(b);
    let cc = cos(a);

    let sa = sin(c);
    let sb = sin(b);
    let sc = sin(a);

    // XY
    let r = _createV(
        v.x,
        v.y,
        v.z
    );
    let x1 = ca;
    let x2 = sa;
    let x3 = 0;
    let y1 = -sa;
    let y2 = ca;
    let y3 = 0;
    let z1 = 0;
    let z2 = 0;
    let z3 = 1;

    // XZ
    r = _createV(
        r.x * x1 + r.y * y1 + r.z * z1,
        r.x * x2 + r.y * y2 + r.z * z2,
        r.x * x3 + r.y * y3 + r.z * z3
    );

    x1 = cb;
    x2 = 0;
    x3 = sb;
    y1 = 0;
    y2 = 1;
    y3 = 0;
    z1 = -sb;
    z2 = 0;
    z3 = cb;

    // YZ
    r = _createV(
        r.x * x1 + r.y * y1 + r.z * z1,
        r.x * x2 + r.y * y2 + r.z * z2,
        r.x * x3 + r.y * y3 + r.z * z3
    );

    x1 = 1;
    x2 = 0;
    x3 = 0;
    y1 = 0;
    y2 = cc;
    y3 = sc;
    z1 = 0;
    z2 = -sc;
    z3 = cc;

    r = _createV(
        r.x * x1 + r.y * y1 + r.z * z1,
        r.x * x2 + r.y * y2 + r.z * z2,
        r.x * x3 + r.y * y3 + r.z * z3
    );
    return r;
}

function fractalNoise(args) {
    let x = args.x;
    let y = args.y;
    let z = args.z;
    let nOctaves = args.nOctaves;
    let scaleFallout = args.scaleFallout;
    let weightFallout = args.weightFallout;

    let n = 0;
    let weight = 1;
    let weightSum = 0;
    let scale = 1;
    for (let i = 0; i < nOctaves; i++) {
        weightSum += weight;
        // n += noise(x * scale, y * scale, z * scale) * weight;
        n += norm(sNoise.noise3D(x * scale, y * scale, z * scale), -1, 1) * weight;
        scale *= scaleFallout;
        weight *= weightFallout;
    }
    return map(n, 0, weightSum, 0, 1);
}


let perspectiveType = "ortho";
let perspectivePower = 2;
let perspectiveShift = 0;
let lowPerspective = !true;
function _3dTo2d(p) {
    let transformedP = _rotate(_add(p, _createV(0, 0, 0)), PI / 4, 0, 0);
    let z = 1;
    let perspectiveShift = 0;
    let ret = _createV(
        transformedP.x / z,
        (transformedP.y - perspectiveShift) / z +
        + perspectiveShift
    );

    if (isNaN(ret.x) || isNaN(ret.y) || isNaN(ret.z)) {
        print("NAN!", ret.x, ret.y, ret.z, perspectivePower, transformedP.z);
    }
    return ret;
}

function lerpAngle(start, end, m) {
    let d = end - start;
    if (d > PI) {
        d -= TAU;
    } else if (d < -PI) {
        d += TAU;
    }
    return d * m;
}

function doubleExponentialSigmoid(x, a) {
    let epsilon = 0.00001;
    let min_param_a = 0.0 + epsilon;
    let max_param_a = 1.0 - epsilon;
    a = min(max_param_a, max(min_param_a, a));
    a = 1.0 - a;

    let y = 0;
    if (x <= 0.5) {
        y = (pow(2.0 * x, 1.0 / a)) / 2.0;
    } else {
        y = 1.0 - (pow(2.0 * (1.0 - x), 1.0 / a)) / 2.0;
    }
    return y;
}

function expSkewNorm(x, a, b, e) {
    return pow(norm(x, a, b), e);
}

function expSkewMap(x, a, b, c, d, e) {
    return map(expSkewNorm(x, a, b, e), 0, 1, c, d);
}

function lerpArray(p, m) {
    let index = constrain(floor(m * p.length), 0, p.length - 1);
    return p[index];
}

const zeroPad = (num, places) => String(num).padStart(places, '0');

function shuffle(array) {
    let currentIndex = array.length;
    while (currentIndex != 0) {
        let randomIndex = floor(random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
}

function paletteLerp(palette, m, useLerp) {
    if (useLerp) {
        let ind = floor(map(m, 0, 1, 0, palette.length - 1));
        let _ind;
        _ind = ind + 1;
        let c0 = palette[constrain(ind, 0, palette.length - 1)];
        let c1 = palette[constrain(_ind, 0, palette.length - 1)];
        return lerpColor(c0, c1, m * (palette.length - 1) - ind);
    } else {
        let ind = floor(map(m, 0, 1, 0, palette.length - 1));
        return palette[constrain(ind, 0, palette.length - 1)];
    }
}

class Flower {
    constructor(args) {
        this.args = args;
        this.basePosition = args.position;
        let droopAngleNoiseScale = 0.001;
        this.droopAngle = map(
            doubleExponentialSigmoid(
                norm(
                    sNoise.noise3D(
                        this.basePosition.x * droopAngleNoiseScale,
                        this.basePosition.y * droopAngleNoiseScale,
                        this.basePosition.z * droopAngleNoiseScale),
                    -1, 1
                ),
                0.95
            ),
            0, 1,
            -PI, PI
        );

        this.age = max(this.args.age, 0) *
            doubleExponentialSigmoid(map(this.args.flowerThresholdNoise - this.args.flowerThreshold, -1, 1, 0, 1, true), 0.9);

        this.args.plantHeight *= doubleExponentialSigmoid(map(this.args.flowerThresholdNoise - this.args.flowerThreshold, -1, 1, 0, 1, true), 0.9);

        this.targetPitch = 0;
        this.targetYaw = 0;

        this.br = terrainLight(this.basePosition.x, this.basePosition.z);

        let flowerTypeNoiseNoiseScale = 0.0075 * flowerTypeNoiseScaleModifier;
        let flowerTypeNoise = doubleExponentialSigmoid(
            norm(
                sNoise.noise3D(
                    this.basePosition.x * flowerTypeNoiseNoiseScale,
                    this.basePosition.y * flowerTypeNoiseNoiseScale,
                    this.basePosition.z * flowerTypeNoiseNoiseScale * 4
                ),
                -1, 1
            ),
            0.1
        );

        let flowerTypePicker = flowerTypeNoise;
        this.flowerTypeIndex = constrain(floor(flowerTypePicker * flowerTypes.length), 0, flowerTypes.length - 1);
        this.flowerType = lerpArray(flowerTypes, flowerTypePicker);

        this.args.isFlower = (
            norm(sNoise.noise2D(this.basePosition.x * 100, this.basePosition.z * 100), -1, 1) * 2.98 <
            (this.flowerType.isFlowerChance)
        );

        if (this.args.isFlower) {
            this.leafWidth = norm(sNoise.noise2D(this.basePosition.x * 100 + 432, this.basePosition.z * 100 + 54321), -1, 1);
            this.leafLength = norm(sNoise.noise2D(this.basePosition.x * 100 + 765432, this.basePosition.z * 100 - 5442), -1, 1);
        } else {
            this.leafWidth = norm(sNoise.noise2D(this.basePosition.x * 100 - 74389, this.basePosition.z * 100 + 682), -1, 1);
            this.leafLength = norm(sNoise.noise2D(this.basePosition.x * 100 - 9189, this.basePosition.z * 100 - 19889), -1, 1);
        }

        this.windNoiseScale = 0.05;
        this.windStrength = 5;

        this.wiggleNoiseScale = 0.015; // * 2;
        this.wiggleMagnitude = map(map(this.flowerType.nStemSegsMax, 5, 8, 0.25, 1) * this.age, 0, 1, 0.3, 1);

    }

    // The source's wind displacement is intentionally frozen out.
    windDisplacement(p) {return _createV(0,0,0);}

    draw() {
        this.targetPitch = this.wiggleMagnitude *
            map(doubleExponentialSigmoid(fractalNoise({
                x: (this.basePosition.x + 4321) * this.wiggleNoiseScale + (cos((time_short) * TAU) + 1) * map(timeVaryingWiggleMagnitude, 0.25, 1, 0.375 * 0.25, 0.45),
                y: (this.basePosition.y + 15000) * this.wiggleNoiseScale,
                z: (this.basePosition.z + 54321) * this.wiggleNoiseScale * 2 + (sin((time_short) * TAU) + 1) * map(timeVaryingWiggleMagnitude, 0.25, 1, 0.375 * 0.25, 0.45),
                nOctaves: 2,
                scaleFallout: 2,
                weightFallout: 0.5
            }), 0.0), 0, 1, -1, 1) * (PI / 1.5) * map(timeVaryingWiggleMagnitude, 0.25, 1, 0.75, 1);

        if (this.args.isFlower) {
            let droop = (this.droopAngle - this.targetPitch) * pow(map(sin(map(this.age, 0, 1, 0, PI)), 0, 1, 0, 1), 15);
            this.targetPitch += droop;
        }
        this.targetYaw = sNoise.noise3D(
            (this.basePosition.x) * this.wiggleNoiseScale * 10 + 523544 + (cos((time_short) * TAU) + 1) * 0.45,
            0,
            (this.basePosition.z) * this.wiggleNoiseScale * 10 + 54321 + (sin((time_short) * TAU) + 1) * 0.45,
        ) * PI / 4 + windDirection;

        this.flower();
    }

    flower() {
        let vert = this.args.position;
        let nStemSegs;
        if (this.args.isFlower) {
            nStemSegs = round(map(this.args.plantHeight, 0, 1, 2, round(this.flowerType.nStemSegsMax * 1.5)));
        } else {
            nStemSegs = round(map(this.args.plantHeight, 0, 1, 2, 8));
        }
        nStemSegs *= 1;
        let stemSegLen = 1 * doubleExponentialSigmoid(map(this.age, 0, 1, 0.1, 1), 0.8) * (this.args.isFlower ? 1 : 0.5);
        let pitch = 0, yaw = 0;
        let dPitch = lerpAngle(pitch, this.targetPitch, 1 / (nStemSegs - 1));
        let dYaw = lerpAngle(yaw, this.targetYaw, 1 / nStemSegs);
        let step = _rotate(_rotate(_createV(0, -5 / curveDetailMultiplier * stemSegLen, 0), pitch, 0, 0), 0, yaw, 0);
        for (let i = 0; i < nStemSegs; i++) {
            let dAngleStepSize = 1 / pow(map(i, 0, nStemSegs - 1, nStemSegs, 1), 1);
            dPitch = lerpAngle(pitch, this.targetPitch, dAngleStepSize);
            dYaw = lerpAngle(yaw, this.targetYaw, dAngleStepSize);
            pitch += dPitch;
            yaw += dYaw;
            step = _rotate(_rotate(step, dPitch, 0, 0), 0, dYaw, 0);

            let stemPoints = [_copyV(vert)];
            vert = _add(vert, step);

            vert = _add(vert, this.windDisplacement(vert));

            stemPoints.push(_copyV(vert));
            stemPoints.closed = false;
            stemPoints.zIndex = min(stemPoints[0].z, vert.z);
            stemPoints.fill = color('#000');
            stemPoints.stroke = this.flowerType.stemPalette[paletteIndex];
            shapes.push(stemPoints);

            let nLeaves = (this.args.isFlower ? 1 : 2);
            for (let k = 0; k < nLeaves; k++) {
                let _vert = _lerp(stemPoints[0], stemPoints[1], noise(k * 100));
                let leafScaleFactor = constrain(
                    this.age - map(i, 0, nStemSegs, 0, 0.5),
                    0, 1
                );

                let leafPoints = leaf({
                    position: this.args.position,
                    size: _scalarMult(
                        _createV(
                            map(this.leafWidth, 0, 1, this.flowerType.leafWidthMin, this.flowerType.leafWidthMin),
                            map(this.leafLength, 0, 1, this.flowerType.leafLengthMin, this.flowerType.leafLengthMax),
                            map(this.leafLength, 0, 1, this.flowerType.leafHeightMin, this.flowerType.leafHeightMax),
                        ),
                        map(i, 0, nStemSegs, 0.75, 0.5) * leafScaleFactor
                    ),
                    orientation: _createV(
                        0,
                        0,
                        PI / 2
                    ),
                    shapeFunction: function (x, y, z, alongAxis) {
                        return 0;
                    },
                    petalOffsetFromCenter: 0,
                    age: this.age,
                    taperFactor: 1,
                    squareness: map(sNoise.noise3D(this.basePosition.x, this.basePosition.y, this.basePosition.z), -1, 1, 0.2, 1),
                });


                let stepNorm = _normalize(step);
                for (let j = 0; j < leafPoints.length; j++) {
                    leafPoints[j] = _rotate(leafPoints[j], 0, PI / 2, 0);
                    leafPoints[j] = _rotate(leafPoints[j], 0, 0, sNoise.noise3D(this.basePosition.x, this.basePosition.y, this.basePosition.z + i + k * 10) * TAU);
                    leafPoints[j] = _rotate(leafPoints[j], atan2(stepNorm.y, sqrt(stepNorm.x * stepNorm.x + stepNorm.z * stepNorm.z)), 0, 0);
                    leafPoints[j] = _rotate(leafPoints[j], 0, -atan2(stepNorm.x, stepNorm.z), 0);
                    leafPoints[j] = _add(leafPoints[j], _sub(_vert, _scalarMult(step, sNoise.noise3D(this.basePosition.x, this.basePosition.y, this.basePosition.z + i + k * 10))));

                    leafPoints[j] = _add(leafPoints[j], this.windDisplacement(leafPoints[j]));

                    leafPoints.zIndex = min(leafPoints.zIndex, leafPoints[j].z);
                }

                let shadowBr = max(0, terrainLight(this.basePosition.x, this.basePosition.z) * 0.4 + sNoise.noise2D(this.basePosition.x, this.basePosition.z) * 0.2);

                leafPoints.fill = lerpArray(
                    leafPalette,
                    pow(map(i, 0, nStemSegs, shadowBr, 1), 0.5) *
                    map(this.br, 0, 1, 0.5, 1) + sNoise.noise2D(this.basePosition.x * 123 + 6511, this.basePosition.z * 1123 + 651311) * 0.1
                );
                leafPoints.stroke = color('#000');
                shapes.push(leafPoints);
            }
        }

        if (this.args.isFlower) {
            let stepNorm = _normalize(step);
            let petalThreshold = 0.2;
            this.flowerHead({
                position: vert,
                size: _scalarMult(this.flowerType.petalSize,
                    (this.age > petalThreshold ? pow(map(this.age, petalThreshold, 1, 0.5, 1), 2) : pow(map(this.age, 0, petalThreshold, 0, 0.5), 4))
                ),
                transforms: [
                    { type: "r", val: _createV(PI / 2, 0, 0) },
                    { type: "r", val: _createV(atan2(stepNorm.y, sqrt(stepNorm.x * stepNorm.x + stepNorm.z * stepNorm.z)) + PI / 2, 0, 0) },
                    { type: "r", val: _createV(0, -atan2(stepNorm.x, stepNorm.z) + PI, 0) },
                    { type: "t", val: vert },
                ],
                nPetals: this.flowerType.nPetals,
                nLayers: this.flowerType.nLayers,
                age: this.age,
                petalOffsetFromCenter: this.flowerType.petalOffsetFromCenter,
                taperFactor: this.flowerType.taperFactor, // 0 to 1
                squareness: this.flowerType.squareness, // 0 to 1
            });
        }
    }

    flowerHead(args) {
        for (let k = 0; k < args.nLayers; k++) {
            let petalW = args.size.x;
            let petalH = args.size.y;
            let nPetals = round(args.nPetals * map(k, 0, args.nLayers, 0.8, 1));

            for (let i = 0; i < nPetals; i++) {
                if (norm(sNoise.noise3D(this.basePosition.x, this.basePosition.y, this.basePosition.z + i), -1, 1) < (this.age < 0.5 ? 2 : map(this.age, 0.5, 1, 2, 0.2))) {
                    let petalRadialAngle = map(i, 0, nPetals, 0, TAU) + PI / 2 + k * PI / 8 * 1;
                    let pos =
                        _rotate(
                            _createV(args.petalOffsetFromCenter * this.age, 0, 0),
                            0, 0, petalRadialAngle + PI / 2
                        );
                    let petalPoints = petal({
                        position: pos,
                        size: _createV(petalW, petalH, args.size.z),
                        orientation: _createV(
                            expSkewMap(k, 0, args.nLayers, 0, -1, 0.8) * (PI / 2) * doubleExponentialSigmoid(this.age, 0.8),
                            0,
                            petalRadialAngle
                        ),
                        shapeFunction: function (x, y, z, alongAxis) {
                            return 0;
                        },
                        age: this.age,
                        taperFactor: args.taperFactor,
                        squareness: args.taperFactor,
                    });


                    if (args.transforms) {
                        for (let j = 0; j < petalPoints.length; j++) {
                            for (let k = 0; k < args.transforms.length; k++) {
                                let tf = args.transforms[k];
                                if (tf.type == "t") {
                                    petalPoints[j] = _add(petalPoints[j], tf.val);
                                } else if (tf.type == "s") {
                                    petalPoints[j] = _mult(petalPoints[j], tf.val);
                                } else if (tf.type == "r") {
                                    petalPoints[j] = _rotate(petalPoints[j], tf.val.x, tf.val.y, tf.val.z);
                                }
                            }
                            petalPoints.zIndex = min(petalPoints.zIndex, petalPoints[j].z);

                            petalPoints[j] = _add(petalPoints[j], this.windDisplacement(petalPoints[j]));
                        }
                    }

                    petalPoints.fill = this.flowerType.petalPalette[paletteIndex];
                    petalPoints.stroke = color('#000');
                    shapes.push(petalPoints);
                }
            }

            let diskPoints = disk({
                position: _createV(0, 0, 0),
                size: _scalarMult(_createV(args.petalOffsetFromCenter + 0.8, args.petalOffsetFromCenter + 0.8, 0), 1 * this.age),
                nPoints: constrain(ceil(args.petalOffsetFromCenter * this.age * 3), 6, 16) * curveDetailMultiplier
            });

            if (args.transforms) {
                for (let j = 0; j < diskPoints.length; j++) {
                    for (let k = 0; k < args.transforms.length; k++) {
                        let tf = args.transforms[k];
                        if (tf.type == "t") {
                            diskPoints[j] = _add(diskPoints[j], tf.val);
                        } else if (tf.type == "s") {
                            diskPoints[j] = _mult(diskPoints[j], tf.val);
                        } else if (tf.type == "r") {
                            diskPoints[j] = _rotate(diskPoints[j], tf.val.x, tf.val.y, tf.val.z);
                        }
                    }
                    diskPoints[j] = _add(diskPoints[j], this.windDisplacement(diskPoints[j]));
                    diskPoints.zIndex = min(diskPoints.zIndex, diskPoints[j].z);
                }
            }
            diskPoints.disk = true;
            diskPoints.fill = this.flowerType.diskPalette[paletteIndex];
            diskPoints.stroke = color('#000');
            shapes.push(diskPoints);

        }


    }
}

function petal(args) {
    let points = [];
    let nPoints = 13 * curveDetailMultiplier;
    let angle = 0;
    let zIndex = 1e10;
    for (let i = 0; i < nPoints; i++) {
        // let angle = map(i, 0, nPoints, 0, TAU);
        let x = sin(angle);
        let y = cos(angle) + 1;
        let z = 0;
        let alongAxis = map(y, 0, 2, 0, 1);
        y += args.shapeFunction(x, y, z, alongAxis);
        x *= pow(map(alongAxis, 0, 1, 1, args.taperFactor), 1);
        z = -sqrt(1 - sq(1 - alongAxis));

        let pt = _createV(x, y, z);
        pt = _mult(pt, args.size);
        pt = _rotate(
            pt,
            args.orientation.x + pow((1 - args.age), 0.5) * PI / 1 - PI / 10,
            0,
            0
        );
        pt = _rotate(pt, 0, args.orientation.y, 0);
        pt = _rotate(pt, 0, 0, args.orientation.z);
        pt = _add(pt, args.position);
        points.push(pt);
        let pointPlacementFactor = 1; //1.5;
        angle += (TAU / nPoints) * map(cos(angle + PI), -1, 1, 1 / pointPlacementFactor, pointPlacementFactor); // put more points at the tip where there needs to be more detail.
    }
    points.closed = true;
    points.zIndex = zIndex;
    points.type = "petal";
    return points;
}


/*
args: 
position
size
orientation
shapeFunction
petalOffsetFromCenter
age
*/
function leaf(args) {
    let points = [];
    let nPoints = 13 * curveDetailMultiplier;
    let angle = 0;
    let zIndex = 1e10;
    for (let i = 0; i < nPoints; i++) {
        let x = sin(angle);
        let y = cos(angle) + 1;
        let z = 0;
        let alongAxis = map(y, 0, 2, 0, 1);
        y += args.shapeFunction(x, y, z, alongAxis);
        x *= pow(map(alongAxis, 0, 1, 1, args.taperFactor), 1);
        z = -sqrt(1 - sq(1 - alongAxis));

        let pt = _createV(x, y, z);;
        pt.y += args.petalOffsetFromCenter;
        pt = _mult(pt, args.size);
        pt = _rotate(
            pt,
            args.orientation.x + pow(args.age, 1) * PI / 2 + PI / 4,
            0,
            0,
        );
        pt = _rotate(pt, 0, args.orientation.y, 0);
        pt = _rotate(pt, 0, 0, args.orientation.z);
        points.push(pt);
        let pointPlacementFactor = 1; //2;
        angle += (TAU / nPoints) * map(cos(angle + PI), -1, 1, 1 / pointPlacementFactor, pointPlacementFactor); // put more points at the tip where there needs to be more detail.
    }
    points.closed = true;
    points.zIndex = zIndex;
    points.type = "leaf";
    return points;
}

function disk(args) {
    let points = [];
    let zIndex = 1e10;
    for (let i = 0; i < args.nPoints; i++) {
        let angle = map(i, 0, args.nPoints, 0, TAU);
        let x = sin(angle);
        let y = cos(angle);
        let z = 0;
        let pt = _createV(x, y, z);;
        pt = _mult(pt, args.size);
        pt = _add(pt, args.position);
        points.push(pt);
    }
    points.closed = true;
    points.zIndex = zIndex;
    points.type = "disk";
    return points;
}

function setPalette(index) {
    paletteIndex = index;

    if (index == 0) { // green
        bgColor = random([
            color('#bac9ed'),
            color('#ffe4a8'),
            color('#e6c1cb'),
            color('#d1c7b8'),
        ]);

        leafPalette = [
            color('#778a75'),
            color('#859683'),
            color('#8d9e8f'),
            color('#8d9e8f'),
            color('#8d9e8f'),
            color('#aeb982'),
            color('#aeb982'),
            color('#f7eca4'),
        ];

        grassPalette = [ //1
            color('#71826f'),
            color('#b9b682'),
            color('#cec96c'),
            color('#f3d14b'),
        ];

    } else if (index == 1) { // teal
        bgColor = random([
            color('#bac9ed'),
            color('#e6c1cb'),
            color('#d1c7b8'),
        ]);

        leafPalette = [
            color('#758a7d'),
            color('#83968a'),
            color('#87a5a2'),
            color('#82b9b6'),
            color('#f7eca4'),
        ];

        grassPalette = [ //1
            color('#6f8276'),
            color('#82a3ac'),
            color('#89b19c'),
            color('#f4e08e'),
        ];

    } else if (index == 2) { // blue
        bgColor = random([
            color('#bac9ed'),
            color('#e6c1cb'),
            color('#d1c7b8'),
        ]);

        leafPalette = [
            color('#556a8e'),
            color('#769198'),
            color('#769198'),
            color('#769198'),
            color('#769198'),
            color('#b0b7df'),
            color('#d8d7ee'),
            color('#d3a0d3'),
            color('#f8d294'),
        ];

        grassPalette = [ //1
            color('#4e6781'),
            color('#4e6781'),
            color('#6987a5'),
            color('#6987a5'),
            color('#8f96d1'),
            color('#8f96d1'),
            color('#8f96d1'),
            color('#b8c5d3'),
            color('#b8c5d3'),
            color('#f7cb82'),
            color('#f7cb82'),
        ];

    } else if (index == 3) { // yellow
        bgColor = random([
            color('#ffe4a8'),
            color('#e6c1cb'),
            color('#d1c7b8'),
        ]);

        leafPalette = [
            color('#73879d'),
            color('#73879d'),
            color('#b98a5b'),
            color('#d6b37e'),
            color('#d6b37e'),
            color('#f4bf5b'),
            color('#f7ce8a'),
        ];

        grassPalette = [
            color('#73879d'),
            color('#958b7b'),
            color('#9a9676'),
            color('#d6aa7e'),
            color('#d6aa7e'),
            color('#d6b37e'),
            color('#d6b37e'),
            color('#f4c25b'),
            color('#f4c25b'),
            color('#f5cd70'),
            color('#f5cd70'),
            color('#f9dd9b'),
        ];

    }

}

let flowerTypes;
function prepareFlowerTypes() {
    flowerTypes = [
        {
            petalPalette: [color('#ffbf00'), color('#fa6b73'), color('#f7a295'), color('#f89807')],
            diskPalette: [color('#462b00'), color('#462b00'), color('#462b00'), color('#462b00')],
            stemPalette: [color('#71826f'), color('#6a7d71'), color('#657ca3'), color('#d09424')],
            petalSize: _scalarMult(_createV(
                1,
                1,
                1,
            ), 0.75),
            nStemSegsMin: 3,
            nStemSegsMax: 5,
            nPetals: 6,
            nLayers: 2,
            petalOffsetFromCenter: 0.75 * 0.125,
            // petalOffsetFromCenter: norm(sNoise.noise2D(this.args.position.x, this.args.position.y, this.args.position.z + 87654), -1, 1) * map(this.args.age, 0, 1, 0.5, 1) * 0.125,
            taperFactor: 1,
            squareness: 0,
            isFlowerChance: 0.85,
            leafLengthMin: 4,
            leafLengthMax: 7,
            leafWidthMin: 1,
            leafWidthMax: 1,
            leafHeightMin: 1,
            leafHeightMax: 5,
        }, {
            petalPalette: [color('#e3e1d9'), color('#e3e1d9'), color('#e3e1d9'), color('#e3e1d9')],
            diskPalette: [color('#ee8e00'), color('#ee8e00'), color('#ee8e00'), color('#ee8e00')],
            stemPalette: [color('#97a695'), color('#798e82'), color('#657ca3'), color('#d09424')],
            petalSize: _scalarMult(_createV(
                1,
                1,
                1,
            ), 1.75),
            nStemSegsMin: 3,
            nStemSegsMax: 8,
            nPetals: 4,
            nLayers: 2,
            petalOffsetFromCenter: 0.75 * 0.5,
            // petalOffsetFromCenter: norm(sNoise.noise2D(this.args.position.x, this.args.position.y, this.args.position.z + 87654), -1, 1) * map(this.args.age, 0, 1, 0.5, 1) * 0.5,
            taperFactor: 1,
            squareness: 0,
            isFlowerChance: 0.82,
            leafLengthMin: 4,
            leafLengthMax: 7,
            leafWidthMin: 0.75,
            leafWidthMax: 0.75,
            leafHeightMin: 1,
            leafHeightMax: 5,
        },
        {
            petalPalette: [color('#e6e2d7'), color('#e6e2d7'), color('#e6e2d7'), color('#e6e2d7')],
            diskPalette: [color('#ee7700'), color('#ee7700'), color('#ee7700'), color('#ee7700')],
            stemPalette: [color('#839481'), color('#778c80'), color('#8395b4'), color('#d09424')],
            petalSize: _scalarMult(_createV(
                0.4,
                1,
                1,
            ), 1),
            nStemSegsMin: 3,
            nStemSegsMax: 5,
            nPetals: 4,
            nLayers: 3,
            petalOffsetFromCenter: 0.75 * 0.5, //map(this.args.age, 0, 1, 0.35, 0.6),
            // petalOffsetFromCenter: norm(sNoise.noise2D(this.args.position.x,this.args.position.y,this.args.position.z + 87654),-1, 1) *map(this.args.age, 0, 1, 0.35, 0.6),
            taperFactor: 1,
            squareness: 0,
            isFlowerChance: 0.75,
            leafLengthMin: 2,
            leafLengthMax: 3,
            leafWidthMin: 1,
            leafWidthMax: 1,
            leafHeightMin: 1,
            leafHeightMax: 5,
        },
        {
            petalPalette: [color('#fbcb73'), color('#997de3'), color('#f1e2af'), color('#d5a9e7')],
            // petalPalette: [color('#997de3'), color('#997de3'), color('#f1e2af'), color('#d5a9e7')],
            diskPalette: [color('#fa9970'), color('#b5397a'), color('#e8821c'), color('#f9c526')],
            // diskPalette: [color('#b5397a'), color('#b5397a'), color('#e8821c'), color('#f9c526')],
            stemPalette: [color('#9ba965'), color('#85988c'), color('#89a0b8'), color('#d09424')],
            petalSize: _scalarMult(_createV(
                1,
                1,
                1,
            ), 0.8),
            nStemSegsMin: 5,
            nStemSegsMax: 7,
            nPetals: 5,
            nLayers: 2,
            petalOffsetFromCenter: 0.75 * 0.7,
            // petalOffsetFromCenter: norm(sNoise.noise2D(this.args.position.x, this.args.position.y, this.args.position.z + 87654), -1, 1) * map(this.args.age, 0, 1, 0.5, 1) * 0.7,
            taperFactor: 0.5,
            squareness: 0,
            isFlowerChance: 0.9,
            leafLengthMin: 1,
            leafLengthMax: 2,
            leafWidthMin: 1,
            leafWidthMax: 1,
            leafHeightMin: 1,
            leafHeightMax: 2,
        },
        {
            petalPalette: [color('#fb8680'), color('#fccdf0'), color('#fb8c80'), color('#fa6f5f')],
            diskPalette: [color('#462b00'), color('#462b00'), color('#462b00'), color('#462b00')],
            stemPalette: [color('#778a75'), color('#7e9286'), color('#8093b3'), color('#d09424')],
            petalSize: _createV(
                1,
                1,
                1,
            ),
            nStemSegsMin: 3,
            nStemSegsMax: 7,
            nPetals: 8,
            nLayers: 1,
            petalOffsetFromCenter: 0.75 * 0.5,
            // petalOffsetFromCenter: norm(sNoise.noise2D(this.args.position.x, this.args.position.y, this.args.position.z + 87654), -1, 1) * map(this.args.age, 0, 1, 0.5, 1) * 0.5,
            taperFactor: 1,
            squareness: 0,
            isFlowerChance: 0.85,
            leafLengthMin: 1,
            leafLengthMax: 1,
            leafWidthMin: 1,
            leafWidthMax: 1,
            leafHeightMin: 1,
            leafHeightMax: 2,
        },
        {
            petalPalette: [color('#f8c11f'), color('#f89807'), color('#ebc576'), color('#fccdf0')],
            diskPalette: [color('#462b00'), color('#47856a'), color('#462b00'), color('#3d4b54')],
            stemPalette: [color('#71826f'), color('#6a7d71'), color('#657ca3'), color('#d09424')],
            petalSize: _scalarMult(_createV(
                0.6,
                1,
                1.8,
            ), 1),
            nStemSegsMin: 4,
            nStemSegsMax: 6,
            nPetals: 8,
            nLayers: 2,
            petalOffsetFromCenter: 0.75 * 0.3,
            // petalOffsetFromCenter: norm(sNoise.noise2D(this.args.position.x, this.args.position.y, this.args.position.z + 87654), -1, 1) * map(this.args.age, 0, 1, 0.5, 1) * 0.3,
            taperFactor: 1,
            squareness: 0,
            isFlowerChance: 0.8,
            leafLengthMin: 1.5,
            leafLengthMax: 3,
            leafWidthMin: 0.75,
            leafWidthMax: 1.5,
            leafHeightMin: 1,
            leafHeightMax: 2,
        }
    ];
}

function grassShape(args) {
    let _pos = _3dTo2d(args.pos);
    let pts = [];
    let angleNoiseScale = 0.01;
    let baseAngle = (fractalNoise({
        x: args.pos.x * angleNoiseScale,
        y: 0,
        z: args.pos.z * angleNoiseScale * 4,
        nOctaves: 3,
        scaleFallout: 2,
        weightFallout: 0.8
    }) * 2 - 1) * (PI / 3);
    let angle = baseAngle + (fractalNoise({
        x: args.pos.x * angleNoiseScale + (cos((time_short + time_long * 2) * TAU) + 1) * map(timeVaryingWiggleMagnitude, 0.25, 1, 0.375 * 0.25, 0.45),
        y: 0,
        z: args.pos.z * angleNoiseScale * 4 + (sin((time_short + time_long * 2) * TAU) + 1) * map(timeVaryingWiggleMagnitude, 0.25, 1, 0.375 * 0.25, 0.45),
        nOctaves: 3,
        scaleFallout: 2,
        weightFallout: 0.8
    }) * 2 - 1) * (PI / 3) * timeVaryingWiggleMagnitude * 0.75 + sNoise.noise2D(args.pos.x * 100, args.pos.z * 100) * PI / 32;
    pts.push(_add(_rotate(_mult(_createV(-1, 0), args.scale), 0, 0, angle), _pos));
    pts.push(_add(_rotate(_mult(_createV(0, -1), args.scale), 0, 0, angle), _pos));
    pts.push(_add(_rotate(_mult(_createV(1, 0), args.scale), 0, 0, angle), _pos));


    let scaleNoiseScale = 0.005;
    let _scale = map(fractalNoise({
        x: args.pos.x * scaleNoiseScale + 532,
        y: 0,
        z: args.pos.z * scaleNoiseScale * 2 - 54323,
        nOctaves: 3,
        scaleFallout: 2,
        weightFallout: 0.5
    }), 0, 1, 3, 6);

    let _grassShape = new _Shape(true);
    _grassShape.setPoints(pts);
    _grassShape.zIndex = args.pos.z;
    _grassShape.fill = paletteLerp(args.palette, args.br, false);
    _grassShape.strokeWeight = 1;
    _grassShape.nHashesMult = 1.5;
    _grassShape.hashWeight = 0.3;
    _grassShape.occlude = false;
    _grassShape.scaleAmt = 0.1;
    _grassShape.wobbleAmt = 0.4;
    _grassShape.hashAngleOffset = 0;
    _grassShape.type = "grass";
    _grassShape.hashAngle = angle + PI / 2;
    booleanShapes.push(_grassShape);

}


const toXY=p=>{const q=_3dTo2d(p);return [q.x,q.y];};
const angleDegrees=rad=>((rad*180/PI)%180+180)%180;
// The 2025 hatcher used ceil(max projected bbox extent), then
// ceil(hashSz*2*nHashesMult) hatches across a 2*hashSz/1.7 strip.
const ORIGINAL_HATCH_SPACING=.6;
function originalHatch(points,angle,{density=1,wobble=.3,weight=.25,repeatCount=9,opacity=.5}={}){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const [x,y] of points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  const hashSz=Math.max(1,Math.ceil(Math.max(maxX-minX,maxY-minY)));
  const nHashes=Math.ceil(hashSz*2*density);
  const spacingScale=(2*hashSz/1.7/nHashes)/ORIGINAL_HATCH_SPACING;
  const a=angle*PI/180;
  const phase=-(minX+maxX)/2*Math.sin(a)+(minY+maxY)/2*Math.cos(a)-hashSz/1.7;
  const lineWidthScale=weight/.25;
  return {angle,phase,spacing:geometrySpacing*spacingScale,spacingScale,
    nHashesMult:density,endpointWobble:wobble,endExtension:.1,
    repeatCount,opacity,lineWidth:geometryWidth*lineWidthScale,lineWidthScale};
}
function visiblePolygon(shape){
  const points=shape.map(toXY);
  if(points.length<3||points.some(p=>!p.every(Number.isFinite)))return null;
  const minX=Math.min(...points.map(p=>p[0]));
  const maxX=Math.max(...points.map(p=>p[0]));
  const minY=Math.min(...points.map(p=>p[1]));
  const maxY=Math.max(...points.map(p=>p[1]));
  const first=points[floor(points.length/2)];
  const center=[(minX+maxX)*.5,(minY+maxY)*.5];
  const angle=atan2(center[1]-first[1],center[0]-first[0])+
    (shape.type==='leaf'?0:shape.type==='petal'?PI/2:PI/4);
  const density=shape.type==='leaf'?4:shape.type==='petal'?1.2:1;
  const wobble=shape.type==='petal'?.35:.3;
  return {type:'polygon',points,outline:shape.type!=='leaf',
    hatch:{...originalHatch(points,angleDegrees(angle),{density,wobble}),
      color:shape.fill??'#7d917c'},
    plantPart:shape.type??'polygon'};
}
let geometrySpacing=.6,geometryWidth=.25;

// Deterministic, uniformly shuffled reveal order for plant/grass groups.
// This RNG is deliberately independent of the original meadow's PRNG,
// so density adjustments cannot alter species, placement, or proportions.
function densityRanks(count,seed){
  const order=Array.from({length:count},(_,i)=>i);
  let state=seed>>>0;
  for(let i=count-1;i>0;i--){
    state=(state+0x6D2B79F5)>>>0;
    let z=state;
    z=Math.imul(z^(z>>>15),z|1);
    z^=z+Math.imul(z^(z>>>7),z|61);
    const j=Math.floor(((z^(z>>>14))>>>0)/4294967296*(i+1));
    [order[i],order[j]]=[order[j],order[i]];
  }
  const rank=new Uint32Array(count);
  for(let i=0;i<count;i++)rank[order[i]]=i;
  return rank;
}

/**
 * Select whole plants (all stems, leaves, petals, disks) and individual grass
 * blades from an unchanged source meadow. 0% selects none; 100% returns the
 * exact same scene array. Adjusting these controls never regenerates geometry.
 * Rankings are assigned once per original seed, so slider movement is stable
 * and increasing a percentage only adds shapes, never replaces existing ones.
 */
export function filterNeverSameScene(generated,{plants=100,grass=100}={}){
  if(!Number.isFinite(plants)||plants<0||plants>100||
     !Number.isFinite(grass)||grass<0||grass>100)
    throw new RangeError('Plant and grass density must be between 0 and 100');
  if(plants===100&&grass===100)return {scene:generated.scene,stats:generated.stats};
  const plantCount=Math.round(generated.stats.plants*plants/100);
  const grassCount=Math.round(generated.stats.grass*grass/100);
  const scene=[];
  let leaves=0,petals=0,disks=0;
  for(const item of generated.scene){
    const show=item.grass?item.densityRank<grassCount:item.densityRank<plantCount;
    if(!show)continue;
    scene.push(item);
    if(item.plantPart==='leaf')leaves++;
    else if(item.plantPart==='petal')petals++;
    else if(item.plantPart==='disk')disks++;
  }
  return {scene,stats:{...generated.stats,plants:plantCount,grass:grassCount,
    leaves,petals,disks}};
}

/**
 * Original specimen geometry with a deliberately static time state.
 * Returns front-to-back HatchRenderer scene objects. The old raster buffer,
 * old hatch and old shadow/crayon shaders are never instantiated.
 */
export function generateNeverSame({seed=2611,grid=60,grassPerPlant=2,palette=null,
  spacing=.6,width=.25,plantScale=1,sceneSize=75}={}){
  if(!Number.isFinite(seed)||!Number.isInteger(grid)||grid<2||grid>60||
     !Number.isInteger(grassPerPlant)||grassPerPlant<0||grassPerPlant>4||
     (palette!==null&&(!Number.isInteger(palette)||palette<0||palette>3))||
     !(spacing>0)||!Number.isFinite(spacing)||
     !(width>0)||!Number.isFinite(width)||
     !(plantScale>0)||!Number.isFinite(plantScale)||
     !(sceneSize>10)||!Number.isFinite(sceneSize))
    throw new RangeError('Invalid Never the Same scene options');
  prngState=seed>>>0;
  sNoise=openSimplexNoise((seed^0x5F9DF6A3)>>>0);
  shapes=[];booleanShapes=[];
  targetSzX=sceneSize;targetSzY=sceneSize;
  time_short=0;time_long=.17;timeVaryingWiggleMagnitude=.48;
  windDirection=PI/2;flowerTypeNoiseScaleModifier=random(.8,1.5);
  geometrySpacing=spacing;geometryWidth=width;curveDetailMultiplier=1;
  prepareTerrain();
  // The original scene chooses a palette once per image rather than letting
  // each plant pick its own. A caller may still force a palette for tests.
  setPalette(palette===null?random([0,1,2,3]):palette);
  prepareFlowerTypes();
  shuffle(flowerTypes);
  const flowerThreshold=random(-.075,.1)-.2;
  let generatedPlants=0,generatedGrass=0;
  const nStepsX=grid,nStepsZ=grid;
  for(let i=0;i<nStepsX;i++)for(let j=0;j<nStepsZ;j++){
    const pos=_add(
      _add(_mult(_rotate(
        _createV(constrain(pow(abs(randomGaussian(0,1)),.8),0,2),0,0),
        0,random(TAU),0),
        _scalarMult(_createV(targetSzX/2,1,targetSzY/2),.02)),
        _createV(0,0,-25)),
      _createV(map(i,0,nStepsX-1,-1,1)*targetSzX/2,0,
        map(j,0,nStepsZ-1,-1,1.15)*targetSzY/2));
    const flowerThresholdNoise=fractalNoise({
      x:pos.x*.02+5432,y:pos.z*.08+654321,z:time_long*.01,
      nOctaves:1,scaleFallout:4,weightFallout:.25})*2-1;
    pos.y=-heightMap(pos.x,pos.z);
    const plant=new Flower({
      position:pos,plantHeight:constrain(map(sNoise.noise2D(pos.x*.1,pos.z*.1),-1,1,.1,1),.1,1)*plantScale,
      age:(random(.2,1)+time_long)%1,isFlower:true,scale:2,
      flowerThresholdNoise,flowerThreshold
    });
    const plantShapeStart=shapes.length;
    plant.draw();
    // Every segment and polygon of a plant must appear/disappear together.
    for(let s=plantShapeStart;s<shapes.length;s++)
      shapes[s].plantIndex=generatedPlants;
    generatedPlants++;
    for(let k=0;k<grassPerPlant;k++){
      const nBladesToDraw=round(map(flowerThresholdNoise-flowerThreshold,-1,1,2,1,true));
      if(k>=nBladesToDraw)continue;
      const grassPos=_copyV(pos);
      grassPos.y=-heightMap(grassPos.x,grassPos.z);
      const br=terrainLight(grassPos.x,grassPos.z)+random(-1,1)*.3;
      const grassHeight=map(sNoise.noise2D(grassPos.x*.04+543232,grassPos.z*.04+6544121),-1,1,5,15);
      grassShape({pos:grassPos,scale:_scalarMult(_createV(2.5,grassHeight,0),.5),palette:grassPalette,br});
      booleanShapes[booleanShapes.length-1].grassIndex=generatedGrass;
      generatedGrass++;
    }
  }
  const plantRanks=densityRanks(generatedPlants,(seed>>>0)^0x91E10DA5);
  const grassRanks=densityRanks(generatedGrass,(seed>>>0)^0xBA4D1C65);
  const entries=[];
  for(const shape of shapes){
    if(shape.length===2){
      const points=shape.map(toXY);
      if(!points.flat().every(Number.isFinite))continue;
      entries.push({depth:shape.zIndex,item:{
        type:'path',points,densityRank:plantRanks[shape.plantIndex],
        stroke:{color:shape.stroke??'#627e70',lineWidth:.3}
      }});
    }else{
      const item=visiblePolygon(shape);
      if(item){
        item.densityRank=plantRanks[shape.plantIndex];
        entries.push({depth:shape.zIndex,item});
      }
    }
  }
  for(const grass of booleanShapes){
    const points=grass.points.map(p=>[p.x,p.y]);
    if(points.length!==3||!points.flat().every(Number.isFinite))continue;
    entries.push({depth:grass.zIndex,item:{
      type:'polygon',grass:true,outline:false,points,
      densityRank:grassRanks[grass.grassIndex],
      hatch:{...originalHatch(points,angleDegrees(grass.hashAngle),
        {density:grass.nHashesMult,wobble:grass.wobbleAmt,weight:grass.hashWeight,
          repeatCount:4,opacity:.65}),
        color:grass.fill??'#82947e'}
    }});
  }
  // Original occlusion order visits ascending zIndex first (nearer).
  entries.sort((a,b)=>a.depth-b.depth);
  return {scene:entries.map(x=>x.item),background:bgColor,
    stats:{plants:generatedPlants,grass:generatedGrass,plantGrid:[nStepsX,nStepsZ],
      palette:paletteIndex,
      petals:shapes.filter(p=>p.type==='petal').length,
      leaves:shapes.filter(p=>p.type==='leaf').length,
      disks:shapes.filter(p=>p.type==='disk').length,
      source:'Never the Same (2025) original plant and grass geometry'}};
}
