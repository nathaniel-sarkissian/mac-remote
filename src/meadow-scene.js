/** 3D flower modelling followed by orthographic polygon projection for HatchRenderer.
 * World axes: X across meadow, Y upwards, Z towards the viewer.
 * The renderer receives only projected 2D polygons and plain paths.
 */
import { createTerrain, simplexNoise3 } from './terrain.js';
import { generateGrassTufts } from './grass.js';

const RAD = Math.PI / 180;
const TAU = Math.PI * 2;

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Flower-local u/v are horizontal radial coordinates (world X/Z), w is up.
 * Spin rotates around the upward axis; pitch/yaw add a slight natural lean.
 * The local origin is exactly the tip of the stem, not in front of it.
 */
export function transformFlowerPoint(local, center, { yaw = 0, pitch = 0, spin = 0 } = {}) {
  const [u, v, w] = local;
  const cs = Math.cos(spin), ss = Math.sin(spin);
  const x = u * cs - v * ss;
  const z = u * ss + v * cs;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const tiltedY = w * cp - z * sp;
  const tiltedZ = w * sp + z * cp;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  return [center[0] + x * cy - tiltedY * sy,
          center[1] + x * sy + tiltedY * cy,
          center[2] + tiltedZ];
}

/** A segment samples the 3D noise at its actual world position. Using two
 * seeded 3D fields lets stems curve sideways and in depth independently.
 */
export function stemNoiseAngle(position,{scale=175,amplitude=22,seed=2611,axis=0}={}) {
  if(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite))
    throw new RangeError('stem position must be a finite [x,y,z] point');
  if(!(Number.isFinite(scale)&&scale>0))throw new RangeError('stem noise scale must be positive');
  if(!(Number.isFinite(amplitude)&&amplitude>=0&&amplitude<=50))
    throw new RangeError('stem angle amplitude must be 0–50 degrees');
  if(!Number.isFinite(seed)||!Number.isInteger(axis)||(axis!==0&&axis!==1))
    throw new RangeError('stem noise seed and axis must be valid');
  if(amplitude===0)return 0;
  const [x,y,z]=position;
  const noiseSeed=(seed^(axis===0?0x413C9E5F:0xB25D732B))>>>0;
  return amplitude*simplexNoise3(x/scale,y/scale,z/scale,noiseSeed);
}

/** Four connected 3D stem segments. The first follows the local terrain
 * surface normal; each later segment changes direction according to the 3D
 * simplex fields evaluated at that segment's actual starting world position.
 * Fixed fractions of total 3D stem length keep flower proportions stable
 * even when the ground normal is nearly horizontal on steep noise terrain.
 */
export function generateStemPath({x=0,z=0,groundHeight=0,height=160,
  terrainHeightAt=null,stemAngleAmplitude=22,stemNoiseScale=175,stemNoiseSeed=2611
}={}) {
  if(![x,z,groundHeight,height].every(Number.isFinite)||height<=0)
    throw new RangeError('stem origin and height must be finite, height positive');
  if(terrainHeightAt!==null&&typeof terrainHeightAt!=='function')
    throw new TypeError('terrainHeightAt must be a function');
  // Validate noise parameters even when amplitude is zero.
  stemNoiseAngle([x,groundHeight,z],{scale:stemNoiseScale,amplitude:stemAngleAmplitude,seed:stemNoiseSeed});
  const step=3;
  const gradientX=terrainHeightAt?
    (terrainHeightAt(x+step,z)-terrainHeightAt(x-step,z))/(2*step):0;
  const gradientZ=terrainHeightAt?
    (terrainHeightAt(x,z+step)-terrainHeightAt(x,z-step))/(2*step):0;
  // A stem initially sprouts in the outward normal direction of the ground.
  // tan(atan(-gradient))=-gradient makes the very first segment exact.
  let angleX=Math.atan(-gradientX);
  let angleZ=Math.atan(-gradientZ);
  const limits=70*RAD;
  const levels=[0,0.23,0.56,0.83,1];
  const points=[[x,groundHeight,z]];
  for(let segment=0;segment<4;segment++){
    const start=points[segment];
    if(segment>0){
      const opts={scale:stemNoiseScale,amplitude:stemAngleAmplitude,seed:stemNoiseSeed};
      // Blend the prior segment toward each new 3D field value. This creates
      // a smooth curved stem without compounding steep ground gradients into
      // near-horizontal upper segments or allowing a single noise spike to
      // fold the stem over.
      angleX=Math.max(-limits,Math.min(limits,angleX*0.45+stemNoiseAngle(start,{...opts,axis:0})*RAD));
      angleZ=Math.max(-limits,Math.min(limits,angleZ*0.45+stemNoiseAngle(start,{...opts,axis:1})*RAD));
    }
    const length=height*(levels[segment+1]-levels[segment]);
    const tx=Math.tan(angleX),tz=Math.tan(angleZ);
    const inv=1/Math.hypot(tx,1,tz);
    points.push([start[0]+length*tx*inv,start[1]+length*inv,
                 start[2]+length*tz*inv]);
  }
  return points;
}

/** A genuine 3D flower: a flat-but-oriented disk, bent petal polygons and a curved stem. */
export function createFlowerModel({ x = 0, z = 0, height = 160, radius = 11, petalCount = 9, seed = 1,
  palette = 0, scale = 1, groundHeight = 0, terrainHeightAt = null,
  stemAngleAmplitude = 22, stemNoiseScale = 175, stemNoiseSeed = 2611 } = {}) {
  if (!Number.isInteger(petalCount) || petalCount < 3 || petalCount > 32) throw new RangeError('petalCount must be 3–32');
  const stem=generateStemPath({x,z,height,groundHeight,terrainHeightAt,
    stemAngleAmplitude,stemNoiseScale,stemNoiseSeed});
  const center=stem.at(-1);
  const rng=random(seed);
  // Preserve the petal/head RNG sequence despite replacing the old random
  // center offsets with actual 3D segment integration.
  rng();rng();
  const tilt = { yaw: (rng() - 0.5) * 0.40, pitch: (rng() - 0.5) * 0.40, spin: rng() * TAU };
  const local = p => transformFlowerPoint(p, center, tilt);
  const headRadius = radius * 0.47;
  const disk = Array.from({length: 22}, (_, i) => {
    const a = -TAU * i / 22; // +Y-facing winding
    return local([Math.cos(a) * headRadius, Math.sin(a) * headRadius, 0]);
  });
  const petals = [];
  for (let i = 0; i < petalCount; i++) {
    const angle = TAU * i / petalCount + (rng() - 0.5) * 0.085;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const petalLength = radius * (1.75 + rng() * 0.54);
    const halfWidth = radius * (0.53 + rng() * 0.20);
    const tipCurl = (rng() - 0.5) * radius * 0.24;
    const edge = (distance, sideways, vertical) => local([
      ca * distance - sa * sideways,
      sa * distance + ca * sideways,
      vertical + tipCurl * (distance / (headRadius + petalLength))
    ]);
    const base = headRadius * 0.61;
    // Petals radiate in the horizontal X/Z plane from beneath the disk.
    // Their outer edges bend slightly downward in world Y.
    const left = [
      edge(base, -halfWidth * 0.32, -radius * 0.09),
      edge(base + petalLength * 0.23, -halfWidth * 0.80, -radius * 0.10),
      edge(base + petalLength * 0.53, -halfWidth, -radius * 0.17),
      edge(base + petalLength * 0.83, -halfWidth * 0.72, -radius * 0.33),
      edge(base + petalLength * 0.98, -halfWidth * 0.25, -radius * 0.52),
    ];
    const right = [
      edge(base + petalLength * 0.98, halfWidth * 0.25, -radius * 0.52),
      edge(base + petalLength * 0.83, halfWidth * 0.72, -radius * 0.33),
      edge(base + petalLength * 0.53, halfWidth, -radius * 0.17),
      edge(base + petalLength * 0.23, halfWidth * 0.80, -radius * 0.10),
      edge(base, halfWidth * 0.32, -radius * 0.09),
    ];
    petals.push({ vertices: [...left, ...right].reverse(), index: i }); // upward winding
  }
  const ground=stem[0];
  return { center, ground, stem, disk, petals, headRadius, radius, petalCount, palette, height };

}

/** Orthographic projection plus a single, consistent camera-space depth. */
export function projectPoint([x, y, z], { yaw = 0, elevation = 38, scale = 1 } = {}) {
  const a = yaw * RAD, e = elevation * RAD;
  const cy = Math.cos(a), sy = Math.sin(a);
  const ce = Math.cos(e), se = Math.sin(e);
  const toward = x * sy + z * cy;
  return {
    point: [(x * cy - z * sy) * scale, (-y * ce + toward * se) * scale],
    depth: (toward * ce + y * se) * scale,
  };
}

function projectPolygon(vertices, camera) {
  const projected = vertices.map(v => projectPoint(v, camera));
  const depth = projected.reduce((sum, v) => sum + v.depth, 0) / projected.length;
  return { points: projected.map(v => v.point), depth };
}

const PETAL_INKS = ['#b75f66', '#9b839e', '#ae7854', '#6c8a91', '#b98b84', '#a98e61', '#7a85a5'];
const CENTER_INKS = ['#a56e30', '#a36a37', '#8c693c', '#aa753c'];
const GRASS_INKS = ['#5d8051','#6f8d55','#799459','#577660','#79926a','#66834d'];

/**
 * Build 3D flowers first, project their individual polygons and stem pieces,
 * then sort every 2D shape nearest-first for depth-aware hatch occlusion.
 */
export function generateMeadow({ count = 85, petals = 9, seed = 2611, elevation = 38, yaw = 0,
  size = 1, angle = 32, angleSpread = 18, colors = true,
  stemAngleAmplitude = 22, stemNoiseScale = 175,
  slope = 0.25, noiseScale = 200, noiseAmplitude = 26,
  grassCount = 850, grassHeight = 35, grassNoiseScale = 145, grassNoiseAmplitude = 0.65,
  spacing, jitter } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 500) throw new RangeError('count must be 1–500');
  if (spacing !== undefined && (!Number.isFinite(spacing) || spacing <= 0)) throw new RangeError('spacing must be positive');
  if (!Number.isFinite(angle) || !Number.isFinite(angleSpread) || angleSpread < 0) throw new RangeError('invalid hatch angles');
  if (jitter !== undefined && (!Number.isFinite(jitter) || jitter < 0)) throw new RangeError('jitter must be nonnegative');
  if (!Number.isFinite(size) || size <= 0) throw new RangeError('size must be positive');
  const rng = random(seed), camera = {yaw, elevation};
  const terrain = createTerrain({slope,noiseScale,noiseAmplitude,seed});
  const cols = Math.ceil(Math.sqrt(count * 1.7)), rows = Math.ceil(count / cols);
  const flowers = [], layered = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols), col = i % cols;
    const front = (row + 0.45 + (rng() - 0.5) * 0.65) / rows;
    const x = ((col + 0.5 + (rng() - 0.5) * 0.66) / cols - 0.5) * 1120;
    const z = -300 + front * 680;
    const height = (114 + 106 * front + (rng() - 0.5) * 72) * size;
    const radius = (8.3 + front * 6.7 + (rng() - 0.5) * 3.6) * size;
    const pCount = Math.max(3, petals + Math.floor(rng() * 3) - 1);
    const palette = Math.floor(rng() * PETAL_INKS.length);
    const flower = createFlowerModel({ x, z, height, radius, petalCount:pCount,
      seed: ((rng() * 0xFFFFFFFF) >>> 0), palette, scale:size,
      groundHeight:terrain.heightAt(x,z),terrainHeightAt:terrain.heightAt,
      stemAngleAmplitude,stemNoiseScale,stemNoiseSeed:seed });
    flowers.push(flower);
    // The meadow sets only polygon-specific angle, optional botanical ink and
    // deterministic seed. Global spacing, width, jitter and zigzag come from
    // renderer.setStyle() so the live controls apply to every polygon.
    const hatchStyle = (color, salt) => ({
      angle: angle + (rng() * 2 - 1) * angleSpread,
      seed: salt >>> 0,
      ...(colors ? {color} : {}),
      ...(spacing === undefined ? {} : {spacing}),
      ...(jitter === undefined ? {} : {angleJitter:jitter})
    });
    const ink = PETAL_INKS[palette];
    for (const petal of flower.petals) {
      const projected = projectPolygon(petal.vertices, camera);
      layered.push({ depth:projected.depth, item:{ type:'polygon', points:projected.points,
        hatch:hatchStyle(ink, seed ^ Math.imul(i + 1, 1013904223) ^ petal.index)
      }});
    }
    const disk = projectPolygon(flower.disk, camera);
    layered.push({ depth:disk.depth, item:{ type:'polygon', points:disk.points,
      hatch:hatchStyle(CENTER_INKS[i%CENTER_INKS.length], seed ^ Math.imul(i + 1, 3877))
    }});
    // Each independently projected stem segment retains a sensible 3D depth;
    // it is unhatched, and a nearer flower/petal may cover it.
    for (let j = 0; j < flower.stem.length - 1; j++) {
      const a = projectPoint(flower.stem[j], camera), b = projectPoint(flower.stem[j+1], camera);
      layered.push({depth:(a.depth+b.depth)/2, item:{ type:'path', points:[a.point,b.point],
        stroke:{color:j%2===0?'#56745d':'#668264',lineWidth:2.1+radius*0.067,opacity:1}
      }});
    }
  }
  // The land remains an invisible height field; no terrain polygons are
  // submitted to HatchRenderer. Every grass root samples that exact surface.
  const grass = generateGrassTufts(terrain.heightAt, {
    count:grassCount, height:grassHeight, noiseScale:grassNoiseScale,
    noiseAmplitude:grassNoiseAmplitude, seed, camera
  });
  for (let i=0;i<grass.length;i++) {
    const tuft=grass[i];
    const projected=projectPolygon(tuft.vertices,camera);
    const baseA=projectPoint(tuft.vertices[0],camera).point;
    const baseB=projectPoint(tuft.vertices[1],camera).point;
    const tip=projectPoint(tuft.vertices[2],camera).point;
    const dx=tip[0]-(baseA[0]+baseB[0])*0.5;
    const dy=tip[1]-(baseA[1]+baseB[1])*0.5;
    // The hatch direction follows the projected root-to-tip axis; straight
    // strokes read as vertical grass veins even on tilted ground.
    const verticalAngle=((Math.atan2(dy,dx)/RAD)%180+180)%180;
    layered.push({depth:projected.depth,item:{
      type:'polygon', grass:true, outline:false, points:projected.points,
      hatch:{
        angle:verticalAngle,
        seed:(seed ^ Math.imul(i+1, 1597334677))>>>0,
        ...(colors ? {color:GRASS_INKS[i%GRASS_INKS.length],opacity:0.88} : {}),
        ...(spacing === undefined ? {} : {spacing}),
        ...(jitter === undefined ? {} : {angleJitter:jitter})
      }
    }});
  }
  // Stable depth tie-breaking preserves deterministic scene output.
  layered.sort((a,b) => b.depth-a.depth);
  return {flowers, grass, scene:layered.map(entry => entry.item), camera, terrain};
}
