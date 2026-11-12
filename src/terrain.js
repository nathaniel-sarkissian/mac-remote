/** Deterministic 2D simplex-noise terrain in X/Z, with world Y as height.
 * The viewer starts near positive Z; negative Z is farther up the meadow.
 */
export const TERRAIN_BOUNDS = Object.freeze({minX:-630,maxX:630,minZ:-405,maxZ:470});
const GRADIENTS = [
  [1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]
];
const F2 = 0.5 * (Math.sqrt(3)-1);
const G2 = (3-Math.sqrt(3))/6;
function gradient(i,j,seed){
  let h=(seed^Math.imul(i,0x9e3779b1)^Math.imul(j,0x85ebca6b))>>>0;
  h=Math.imul(h^(h>>>16),0x7feb352d);
  h=Math.imul(h^(h>>>15),0x846ca68b);
  return GRADIENTS[(h^(h>>>16))&7];
}
/** 2D simplex gradient noise. No random-state advances or grid discontinuities. */
export function simplexNoise2(x,z,seed=2611){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new RangeError('simplex coordinates must be finite');
  const s=(x+z)*F2;
  const i=Math.floor(x+s),j=Math.floor(z+s);
  const t=(i+j)*G2;
  const x0=x-(i-t),z0=z-(j-t);
  const i1=x0>z0?1:0,j1=x0>z0?0:1;
  const x1=x0-i1+G2,z1=z0-j1+G2;
  const x2=x0-1+2*G2,z2=z0-1+2*G2;
  const contribution=(dx,dz,ii,jj)=>{
    let factor=0.5-dx*dx-dz*dz;
    if(factor<=0)return 0;
    factor*=factor;
    const [gx,gz]=gradient(ii,jj,seed);
    return factor*factor*(gx*dx+gz*dz);
  };
  return 70*(contribution(x0,z0,i,j)
    +contribution(x1,z1,i+i1,j+j1)
    +contribution(x2,z2,i+1,j+1));
}
// Standard skewed 3D simplex lattice. Hash lattice corners directly rather
// than using a shared permutation table, preserving deterministic seeding and
// continuity without any random-state advancement.
const GRADIENTS3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
];
function gradient3(i,j,k,seed) {
  let h=(seed^Math.imul(i,0x9e3779b1)^Math.imul(j,0x85ebca6b)^Math.imul(k,0xc2b2ae35))>>>0;
  h=Math.imul(h^(h>>>16),0x7feb352d);
  h=Math.imul(h^(h>>>15),0x846ca68b);
  return GRADIENTS3[((h^(h>>>16))>>>0)%12];
}

/** Smooth, seeded 3D simplex noise for world-space stem-segment directions.
 * All three input coordinates participate in lattice selection and gradients.
 */
export function simplexNoise3(x,y,z,seed=2611) {
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||
     !Number.isFinite(seed))throw new RangeError('simplex coordinates and seed must be finite');
  const f=(x+y+z)/3;
  const i=Math.floor(x+f),j=Math.floor(y+f),k=Math.floor(z+f);
  const t=(i+j+k)/6;
  const x0=x-i+t,y0=y-j+t,z0=z-k+t;
  let i1,j1,k1,i2,j2,k2;
  if(x0>=y0) {
    if(y0>=z0){i1=1;j1=0;k1=0;i2=1;j2=1;k2=0;}
    else if(x0>=z0){i1=1;j1=0;k1=0;i2=1;j2=0;k2=1;}
    else {i1=0;j1=0;k1=1;i2=1;j2=0;k2=1;}
  } else {
    if(y0<z0){i1=0;j1=0;k1=1;i2=0;j2=1;k2=1;}
    else if(x0<z0){i1=0;j1=1;k1=0;i2=0;j2=1;k2=1;}
    else {i1=0;j1=1;k1=0;i2=1;j2=1;k2=0;}
  }
  const x1=x0-i1+1/6,y1=y0-j1+1/6,z1=z0-k1+1/6;
  const x2=x0-i2+1/3,y2=y0-j2+1/3,z2=z0-k2+1/3;
  const x3=x0-0.5,y3=y0-0.5,z3=z0-0.5;
  const contribution=(dx,dy,dz,a,b,c)=>{
    let d=0.6-dx*dx-dy*dy-dz*dz;
    if(d<=0)return 0;
    d*=d;
    const [gx,gy,gz]=gradient3(a,b,c,seed);
    return d*d*(gx*dx+gy*dy+gz*dz);
  };
  return 32*(contribution(x0,y0,z0,i,j,k)
    +contribution(x1,y1,z1,i+i1,j+j1,k+k1)
    +contribution(x2,y2,z2,i+i2,j+j2,k+k2)
    +contribution(x3,y3,z3,i+1,j+1,k+1));
}

export function terrainHeight(x,z,{
  slope=0.25,noiseScale=200,noiseAmplitude=26,seed=2611
}={}){
  if(!Number.isFinite(slope)||slope<0||slope>2)throw new RangeError('slope must be between 0 and 2');
  if(!Number.isFinite(noiseScale)||noiseScale<=0)throw new RangeError('noiseScale must be positive');
  if(!Number.isFinite(noiseAmplitude)||noiseAmplitude<0)throw new RangeError('noiseAmplitude must be nonnegative');
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new RangeError('terrain coordinates must be finite');
  const distanceFromFront=TERRAIN_BOUNDS.maxZ-z;
  return slope*distanceFromFront
    +noiseAmplitude*simplexNoise2(x/noiseScale,z/noiseScale,seed^0x5D4E2A73);
}
/** Shared height sampler for the land mesh and every flower root. */
export function createTerrain(options={}){
  const heightAt=(x,z)=>terrainHeight(x,z,options);
  const {minX,maxX,minZ,maxZ}=TERRAIN_BOUNDS;
  const columns=20,rows=14;
  const patches=[];
  for(let row=0;row<rows;row++){
    const z0=minZ+(maxZ-minZ)*row/rows;
    const z1=minZ+(maxZ-minZ)*(row+1)/rows;
    for(let col=0;col<columns;col++){
      const x0=minX+(maxX-minX)*col/columns;
      const x1=minX+(maxX-minX)*(col+1)/columns;
      patches.push({
        vertices:[[x0,heightAt(x0,z0),z0],[x1,heightAt(x1,z0),z0],
                  [x1,heightAt(x1,z1),z1],[x0,heightAt(x0,z1),z1]],
        row,col
      });
    }
  }
  return {patches,heightAt,bounds:TERRAIN_BOUNDS};
}
