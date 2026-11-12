/** 3D triangular grass anchored to the terrain height field.
 * The blade tilts only left/right in the camera-facing vertical plane.
 * Terrain slope toward/away from the camera changes root altitude, not lean.
 */
import { simplexNoise2, TERRAIN_BOUNDS } from './terrain.js';

function random(seed) {
  let state=seed>>>0;
  return () => {
    state+=0x6D2B79F5;
    let t=state;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
function normalize([x,y,z]) {
  const length=Math.hypot(x,y,z);
  return [x/length,y/length,z/length];
}

/** Surface normal from the exact terrain sampler, measured in 3D world space. */
export function terrainNormal(heightAt,x,z,step=3) {
  if(!(Number.isFinite(step)&&step>0))throw new RangeError('normal step must be positive');
  const dx=(heightAt(x+step,z)-heightAt(x-step,z))/(2*step);
  const dz=(heightAt(x,z+step)-heightAt(x,z-step))/(2*step);
  return normalize([-dx,1,-dz]);
}

/** Frame for a camera-facing grass triangle. Only the terrain gradient
 * measured left/right across the view is allowed to rotate a blade. The
 * along-view gradient still determines root Y but must never lean the tip
 * forward/backward. camera-right = [cos(yaw), 0, -sin(yaw)].
 */
function lateralTerrainFrame(heightAt,x,z,yaw=0,step=3) {
  if(!(Number.isFinite(yaw)&&Number.isFinite(step)&&step>0))
    throw new RangeError('invalid lateral terrain frame');
  const angle=yaw*Math.PI/180;
  const rx=Math.cos(angle),rz=-Math.sin(angle);
  const slope=(heightAt(x+step*rx,z+step*rz)-heightAt(x-step*rx,z-step*rz))/(2*step);
  return {
    normal:normalize([-rx*slope,1,-rz*slope]),
    tangent:normalize([rx,slope,rz]),
    right:[rx,0,rz]
  };
}

export function lateralTerrainNormal(heightAt,x,z,{yaw=0}={}) {
  if(typeof heightAt!=='function')throw new TypeError('heightAt must be a terrain sampler');
  return lateralTerrainFrame(heightAt,x,z,yaw).normal;
}

/** Screen-space area per unit X/Z terrain area under the orthographic camera.
 * Unlike surface area (sqrt(1+gradient^2)), this measures how much space the
 * hillside actually occupies in the drawing. The finite differences also
 * capture local simplex slopes and yaw rather than assuming one uniform grade.
 */
export function projectedGroundArea(heightAt,x,z,{elevation=38,yaw=0}={}) {
  if(typeof heightAt!=='function')throw new TypeError('heightAt must be a terrain sampler');
  if(!Number.isFinite(elevation)||elevation<=0||elevation>90||
      !Number.isFinite(yaw))throw new RangeError('invalid camera');
  const step=3;
  const dx=(heightAt(x+step,z)-heightAt(x-step,z))/(2*step);
  const dz=(heightAt(x,z+step)-heightAt(x,z-step))/(2*step);
  const e=elevation*Math.PI/180,a=yaw*Math.PI/180;
  return Math.abs(Math.sin(e)-Math.cos(e)*(Math.sin(a)*dx+Math.cos(a)*dz));
}

/** Position grass using systematic, area-weighted stratification. A flat
 * hillside gets exactly 'count' tufts. As more hillside area projects onto
 * the page, the count grows accordingly (bounded for interactive rendering);
 * cells with a larger projected footprint receive proportionally more tufts.
 * A null camera keeps the original fixed-count API for standalone callers.
 */
export function grassRootPositions(heightAt,{count=850,seed=2611,camera=null}={}) {
  if(typeof heightAt!=='function')throw new TypeError('heightAt must be a terrain sampler');
  if(!Number.isInteger(count)||count<0||count>3000)throw new RangeError('grass count must be 0–3000');
  if(!count)return [];
  const rng=random(seed^0xA5B35719);
  const cols=Math.ceil(Math.sqrt(count*1.48));
  const rows=Math.ceil(count/cols);
  const {minX,maxX,minZ,maxZ}=TERRAIN_BOUNDS;
  const xMin=minX+35,xWidth=maxX-minX-70;
  const zMin=minZ+25,zWidth=maxZ-minZ-50;
  const weights=[];
  const flatArea=camera?Math.sin((camera.elevation??38)*Math.PI/180):1;
  if(camera&&(!(Number.isFinite(flatArea)&&flatArea>0)||
      !Number.isFinite(camera.yaw??0)))throw new RangeError('invalid camera');
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const x=xMin+xWidth*(col+0.5)/cols;
    const z=zMin+zWidth*(row+0.5)/rows;
    // Restrict pathological near-edge-on footprints, preventing an extreme
    // slope or grazing camera angle from exhausting the polygon budget.
    weights.push(camera?Math.min(8,projectedGroundArea(heightAt,x,z,camera)/flatArea):1);
  }
  const sum=weights.reduce((a,b)=>a+b,0);
  const total=Math.min(3000,Math.round(count*sum/weights.length));
  if(!total||sum<=1e-12)return [];

  if(!camera){
    // Standalone caller's original fixed-count placement stays lightweight.
    const stride=sum/total,offset=rng()*stride;
    let cell=0,cumulative=weights[0];
    const roots=[];
    for(let i=0;i<total;i++){
      const target=offset+i*stride;
      while(cell<weights.length-1&&cumulative<=target){cell++;cumulative+=weights[cell];}
      const col=cell%cols,row=Math.floor(cell/cols);
      roots.push([xMin+xWidth*(col+0.15+0.7*rng())/cols,
                  zMin+zWidth*(row+0.15+0.7*rng())/rows]);
    }
    return roots;
  }

  // Dense candidate bank, stratified by local projected-area Jacobian. This
  // samples steep simplex wrinkles even when a terrain tile contains several
  // projected grass-sized cells; no corner-only or center-only placement.
  const candidates=[];
  const candidateCount=Math.min(48000,Math.max(4000,total*14));
  const stride=sum/candidateCount,offset=rng()*stride;
  const e=(camera.elevation??38)*Math.PI/180,a=(camera.yaw??0)*Math.PI/180;
  const ca=Math.cos(a),sa=Math.sin(a),ce=Math.cos(e),se=Math.sin(e);
  let cell=0,cumulative=weights[0],minSX=Infinity,minSY=Infinity,maxSX=-Infinity,maxSY=-Infinity;
  for(let i=0;i<candidateCount;i++){
    const target=offset+i*stride;
    while(cell<weights.length-1&&cumulative<=target){cell++;cumulative+=weights[cell];}
    const col=cell%cols,row=Math.floor(cell/cols);
    const x=xMin+xWidth*(col+rng())/cols;
    const z=zMin+zWidth*(row+rng())/rows;
    const sy=-heightAt(x,z)*ce+(x*sa+z*ca)*se;
    const sx=x*ca-z*sa;
    candidates.push({x,z,sx,sy});
    minSX=Math.min(sx,minSX);maxSX=Math.max(sx,maxSX);
    minSY=Math.min(sy,minSY);maxSY=Math.max(sy,maxSY);
  }

  // Stratify in the *projected* drawing, rather than only in the X/Z plane.
  // Repeated / folded terrain projections share image-space cells, so they
  // cannot consume the full budget while leaving other visible areas bald.
  function buckets(width,collect=false){
    const across=Math.ceil((maxSX-minSX)/width)+1;
    const map=new Map();
    for(const c of candidates){
      const ix=Math.floor((c.sx-minSX)/width),iy=Math.floor((c.sy-minSY)/width);
      const key=iy*across+ix;
      if(!map.has(key))map.set(key,collect?{ix,iy,points:[c]}:true);
      else if(collect)map.get(key).points.push(c);
    }
    return map;
  }
  let lo=0.1,hi=Math.max(maxSX-minSX,maxSY-minSY,1);
  for(let i=0;i<16;i++){
    const mid=(lo+hi)/2;
    if(buckets(mid).size>total)lo=mid;
    else hi=mid;
  }
  const chosen=buckets(hi,true);
  const roots=[],cells=[...chosen.values()];
  const extras=[];
  for(const bucket of cells){
    // A jittered target within each screen cell breaks lattice alignment,
    // while making the nearest candidate spread over the whole visible area.
    const tx=minSX+(bucket.ix+0.2+0.6*rng())*hi;
    const ty=minSY+(bucket.iy+0.2+0.6*rng())*hi;
    let best=bucket.points[0],score=Infinity;
    for(const c of bucket.points){
      const distance=(c.sx-tx)**2+(c.sy-ty)**2;
      if(distance<score){best=c;score=distance;}
    }
    roots.push([best.x,best.z]);
    if(bucket.points.length>1){
      let second=null,secondScore=-Infinity;
      for(const c of bucket.points){
        const distance=(c.sx-best.sx)**2+(c.sy-best.sy)**2;
        if(distance>secondScore){second=c;secondScore=distance;}
      }
      extras.push([second.x,second.z]);
    }
  }
  // Numeric grid boundaries occasionally leave a handful of slots open.
  // Fill those in well-separated bins instead of creating a visible cluster.
  const missing=total-roots.length;
  for(let i=0;i<missing&&extras.length;i++){
    roots.push(extras[Math.floor((i+0.5)*extras.length/missing)%extras.length]);
  }

  return roots;
}

/** Model grass as three 3D vertices, to be projected and hatched downstream. */
export function generateGrassTufts(heightAt,{
  count=850,height=35,noiseScale=145,noiseAmplitude=0.65,seed=2611,
  camera=null
}={}) {
  if(typeof heightAt!=='function')throw new TypeError('heightAt must be a terrain sampler');
  if(!Number.isInteger(count)||count<0||count>3000)throw new RangeError('grass count must be 0–3000');
  if(!(Number.isFinite(height)&&height>0))throw new RangeError('grass height must be positive');
  if(!(Number.isFinite(noiseScale)&&noiseScale>0))throw new RangeError('grass noise scale must be positive');
  if(!Number.isFinite(noiseAmplitude)||noiseAmplitude<0||noiseAmplitude>1)throw new RangeError('grass noise amplitude must be 0–1');
  if(!count)return [];
  const roots=grassRootPositions(heightAt,{count,seed,camera});
  const rng=random(seed^0x5EED1965);
  const tufts=[];
  for(const [x,z] of roots){
    const ground=[x,heightAt(x,z),z];
    const {normal,tangent,right}=lateralTerrainFrame(heightAt,x,z,camera?.yaw??0);
    const n=simplexNoise2(x/noiseScale,z/noiseScale,seed^0x9365ADE1);
    // Local simplex field makes nearby tufts share height variation. A small
    // independent factor prevents the blades from looking mechanically equal.
    const baseHeight=height*(0.86+0.28*rng());
    const actualHeight=Math.max(3,baseHeight*(1+0.9*noiseAmplitude*n));
    const width=Math.max(3.7,height*(0.26+0.11*rng()));

    // The triangle lies in the camera-right/world-up plane. Both corners are
    // planted on the *actual* surface, but the triangle's width and its tip
    // have no displacement along camera-forward. This removes front/back lean.
    const half=width/2;
    const leftX=x-half*right[0],leftZ=z-half*right[2];
    const rightX=x+half*right[0],rightZ=z+half*right[2];
    const left=[leftX,heightAt(leftX,leftZ),leftZ];
    const rightVertex=[rightX,heightAt(rightX,rightZ),rightZ];
    const lateral=(rng()-0.5)*width*0.38;
    // Jitter only along the sideways surface tangent (perpendicular to the
    // lateral normal); its normal component remains the selected tuft height.
    const tip=[
      x+normal[0]*actualHeight+tangent[0]*lateral,
      ground[1]+normal[1]*actualHeight+tangent[1]*lateral,
      z+normal[2]*actualHeight+tangent[2]*lateral
    ];
    tufts.push({ground,normal,height:actualHeight,vertices:[left,rightVertex,tip]});
  }
  return tufts;
}
