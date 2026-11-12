/** Public geometry helpers. Coordinates are in 2D world units, y positive downward. */
export function getRings(polygon) {
  const rings = polygon?.rings ?? (polygon?.points ? [polygon.points] : null);
  if (!Array.isArray(rings) || !rings.length) throw new Error('A polygon needs points or rings');
  return rings.map((ring) => {
    if (!Array.isArray(ring)) throw new Error('Each ring must be an array of [x,y] points');
    const points = ring.map((p) => {
      if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
        throw new Error('Points must contain finite numeric x and y coordinates');
      }
      return [p[0], p[1]];
    });
    if (points.length > 1 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]) points.pop();
    if (points.length < 3) throw new Error('Each ring requires at least 3 distinct vertices');
    return points;
  });
}


/** Non-filled scene objects that draw plain straight segments, never hatches.
 * - line: {type:'line', start:[x,y], end:[x,y]} or points:[start,end]
 * - path: {type:'path', points:[...], closed?:boolean}
 * - segments: {type:'segments', segments:[[start,end], ...]}
 * All coordinates are world-space. No shape's strokes occlude other objects.
 */
export function isLineObject(item) {
  return item?.type === 'line' || item?.type === 'path' || item?.type === 'segments';
}

export function getLineStrokes(item) {
  if (!isLineObject(item)) throw new Error('Expected a line, path, or segments scene object');
  const point=p=>{
    if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))
      throw new Error('Line/path points must be finite [x,y] pairs');
    return [p[0],p[1]];
  };
  let pairs=[];
  if(item.type==='line'){
    const endpoints=item.points??[item.start,item.end];
    if(!Array.isArray(endpoints)||endpoints.length!==2)throw new Error('Line requires exactly two endpoints');
    pairs=[endpoints];
  }else if(item.type==='path'){
    const points=item.points;
    if(!Array.isArray(points)||points.length<2)throw new Error('Path requires at least two points');
    const verified=points.map(point);
    for(let i=0;i+1<verified.length;i++)pairs.push([verified[i],verified[i+1]]);
    if(item.closed)pairs.push([verified.at(-1),verified[0]]);
  }else{
    if(!Array.isArray(item.segments))throw new Error('Segments object requires a segments array');
    pairs=item.segments;
  }
  const out=[];
  for(const pair of pairs){
    if(!Array.isArray(pair)||pair.length!==2)throw new Error('Each segment needs two endpoints');
    const a=point(pair[0]),b=point(pair[1]);
    if(Math.hypot(b[0]-a[0],b[1]-a[1])>1e-9)out.push([a,b,0,0]);
  }
  return out;
}

export function lineStrokesBounds(strokes) {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const [a,b] of strokes)for(const [x,y] of [a,b]){
    minX=Math.min(minX,x);minY=Math.min(minY,y);
    maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  return {minX,minY,maxX,maxY};
}

export function polygonBounds(polygons) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const polygon of polygons) for (const ring of getRings(polygon)) for (const [x, y] of ring) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : { minX: 0, minY: 0, maxX: 100, maxY: 100 };
}

/**
 * Enumerates clipped strokes with information about the boundary at both ends.
 * Each result is [start, end, startSlope, endSlope], where slope is the absolute
 * rate of boundary position change along the hatch direction across the stroke.
 * The renderer uses these slopes to inset square caps just enough to stay inside
 * an angled polygon edge, without changing global stroke widths on the CPU.
 * Uses even-odd intersections, so holes and concave shapes split strokes.
 */
export function generateHatchStrokes(polygon, { angle = 45, spacing = 7, phase = 0 } = {}) {
  if (!(Number.isFinite(spacing) && spacing > 0)) throw new Error('spacing must be positive');
  if (!Number.isFinite(angle) || !Number.isFinite(phase)) throw new Error('angle and phase must be finite');
  const radians = angle * Math.PI / 180;
  const dx = Math.cos(radians), dy = Math.sin(radians);
  // u runs along the stroke; v runs across it.
  const mapped = getRings(polygon).map(r => r.map(([x, y]) => [x*dx+y*dy, -x*dy+y*dx]));
  let vMin = Infinity, vMax = -Infinity;
  for (const ring of mapped) for (const [,v] of ring) { vMin=Math.min(vMin,v); vMax=Math.max(vMax,v); }
  const first = Math.ceil((vMin-phase)/spacing), last = Math.floor((vMax-phase)/spacing);
  if (last-first > 2_000_000) throw new Error('Too many hatch lines; increase spacing');
  const strokes=[];
  for (let i=first;i<=last;i++) {
    const v=phase+i*spacing, intersections=[];
    for (const ring of mapped) for (let j=0;j<ring.length;j++) {
      const a=ring[j], b=ring[(j+1)%ring.length];
      // Half-open rule: vertex shared by two edges is counted only once.
      if ((a[1]<=v && v<b[1]) || (b[1]<=v && v<a[1])) {
        const du=b[0]-a[0], dv=b[1]-a[1];
        intersections.push([a[0]+(v-a[1])*du/dv, Math.abs(du/dv)]);
      }
    }
    intersections.sort((a,b)=>a[0]-b[0]);
    for(let j=0;j+1<intersections.length;j+=2){
      const a=intersections[j],b=intersections[j+1];
      if(b[0]-a[0]<1e-7)continue;
      strokes.push([
        [a[0]*dx-v*dy,a[0]*dy+v*dx],
        [b[0]*dx-v*dy,b[0]*dy+v*dx],
        a[1],b[1]
      ]);
    }
  }
  return strokes;
}

/**
 * Actual hatch line segments for plotting, SVG export or jitter transforms.
 * angle in degrees; spacing and phase in world units.
 * @returns {Array<[[number,number],[number,number]]>}
 */
export function generateHatchSegments(polygon, options={}) {
  const strokes=(options.angleJitter||options.placementJitter||options.lengthJitter||options.endpointWobble||options.endExtension)
    ?generateJitteredHatchStrokes(polygon, options)
    :generateHatchStrokes(polygon, options);
  const finalStrokes=options.connectZigzag?connectZigZagStrokes(strokes):strokes;
  return finalStrokes.map(([start,end])=>[start,end]);
}

/**
 * Allocation-light hatch scanner used by the bulk renderer for independent
 * polygons. Emits coordinates directly instead of creating Maps and arrays of
 * per-stroke point objects. Uses the same half-open even/odd fill rule as
 * generateHatchStrokes, including holes, concavities and square-cap slopes.
 * Returns the total number of strokes emitted.
 */
export function visitHatchStrokes(rings, {angle=45,spacing=7,phase=0}={},emit) {
  if(!(Number.isFinite(spacing)&&spacing>0)||!Number.isFinite(angle)||!Number.isFinite(phase))
    throw new Error('Invalid hatch lattice');
  const a=angle*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
  const mapped=[];let minV=Infinity,maxV=-Infinity;
  for(const ring of rings){
    const u=new Float64Array(ring.length),v=new Float64Array(ring.length);
    for(let j=0;j<ring.length;j++){
      const p=ring[j],uv=p[0]*ca+p[1]*sa,vv=-p[0]*sa+p[1]*ca;
      u[j]=uv;v[j]=vv;
      if(vv<minV)minV=vv;if(vv>maxV)maxV=vv;
    }
    mapped.push([u,v]);
  }
  const first=Math.ceil((minV-phase)/spacing),last=Math.ceil((maxV-phase)/spacing)-1;
  if(last-first>2_000_000)throw new Error('Too many hatch lines; increase spacing');
  const xs=[],slopes=[];let count=0;
  for(let k=first;k<=last;k++){
    const line=phase+k*spacing;
    let n=0;
    for(const [us,vs] of mapped){
      let au=us[us.length-1],av=vs[vs.length-1];
      for(let j=0;j<us.length;j++){
        const bu=us[j],bv=vs[j];
        if((av<=line&&line<bv)||(bv<=line&&line<av)){
          const slope=(bu-au)/(bv-av),pos=au+(line-av)*slope;
          // Most simple polygons have just two intersections. Maintain sorted
          // crossings as they arrive, avoiding a general-purpose sort call.
          let h=n;
          while(h>0&&xs[h-1]>pos){xs[h]=xs[h-1];slopes[h]=slopes[h-1];h--;}
          xs[h]=pos;slopes[h]=Math.abs(slope);n++;
        }
        au=bu;av=bv;
      }
    }
    for(let j=0;j+1<n;j+=2){
      const p=xs[j],q=xs[j+1];
      if(q-p<=1e-7)continue;
      emit(p*ca-line*sa,p*sa+line*ca,q*ca-line*sa,q*sa+line*ca,slopes[j],slopes[j+1]);
      count++;
    }
  }
  return count;
}


function normalizeSeed(seed) {
  if (typeof seed === 'string') {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  return Number.isFinite(seed) ? (Math.floor(seed) >>> 0) : 0;
}

function hashUnit(seed, index, channel) {
  let x = (normalizeSeed(seed) ^ Math.imul((index + 1) >>> 0, 0x9E3779B1) ^ Math.imul((channel + 1) >>> 0, 0x85EBCA77)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7FEB352D) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x846CA68B) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967295;
}

function hashSigned(seed, index, channel) {
  return hashUnit(seed, index, channel) * 2 - 1;
}

/**
 * Connect each hatch segment's ORIGINAL end to the next segment's ORIGINAL
 * start. The scanner's established stroke order (hatch row, then within-row
 * position) is preserved. No segment is reversed: doing that connects to the
 * wrong end of the next stroke and changes the requested Z-shaped path.
 *
 * Connectors are constructed after polygon clipping and any jitter, and are
 * intentionally NOT clipped back to their own polygon. Both hatch lines and
 * connectors retain square caps; foreground polygons can still occlude them.
 * Use zero source-boundary cap insets for the joined strokes.
 */
export function connectZigZagStrokes(strokes) {
  if (!Array.isArray(strokes)) throw new Error('Expected an array of hatch strokes');
  const chain=[];
  for(let i=0;i<strokes.length;i++) {
    const current=strokes[i];
    const start=current[0],end=current[1];
    // Keep the original segment orientation. This is the critical invariant.
    chain.push([[...start],[...end],0,0]);
    if(i+1<strokes.length){
      const nextStart=strokes[i+1][0];
      if(Math.hypot(end[0]-nextStart[0],end[1]-nextStart[1])>1e-9){
        chain.push([[...end],[...nextStart],0,0]);
      }
    }
  }
  return chain;
}

/**
 * First generate the complete polygon-clipped hatch strokes, then jitter each
 * finite segment as a rigid line about its own midpoint. Deliberately DO NOT
 * reclip to the source polygon: endpoints may extend beyond its silhouette.
 * More-nearby filled polygons can still occlude these protruding strokes in
 * HatchRenderer after this geometry stage.
 *
 * The placement offset is perpendicular to the segment's FINAL orientation.
 * Length jitter scales each segment about its own midpoint after clipping, so
 * both endpoints may extend beyond the original polygon or retract inside it.
 * Hashes are stable for a seed and stroke index. Hole/concave clipping happens
 * before jitter, so fragments on either side of holes can drift into the hole.
 */
/**
 * Transform already-clipped hatch strokes with an independent jitter pass.
 * Reusing one source hatch lattice is essential: redraws re-wobble the SAME
 * strokes, instead of sampling additional hatch lines. pass=0 retains the
 * historical deterministic jitter and all non-repeated renderer behavior.
 */
export function jitterClippedHatchStrokes(baseStrokes, {
  angleJitter = 0,
  placementJitter = 0,
  lengthJitter = 0, // maximum +/- percentage of the originally clipped length
  endpointWobble = 0, // independent, perpendicular noise on both clipped endpoints
  endExtension = 0, // amount to extend each clipped end in world units
  seed = 0,
  pass = 0
} = {}) {
  if(!Array.isArray(baseStrokes))throw new Error('Expected polygon-clipped hatches');
  if(![angleJitter,placementJitter,lengthJitter,endpointWobble,endExtension].every(Number.isFinite)
    ||endpointWobble<0||endExtension<0||!Number.isInteger(pass)||pass<0)
    throw new Error('Jitter values must be finite and pass must be a nonnegative integer');
  // The first pass preserves the earlier hatch jitter exactly. Subsequent
  // passes salt the per-segment hash without moving the base hatch lattice.
  const rotation=Math.abs(angleJitter);
  const offset=Math.abs(placementJitter);
  const lengthAmount=Math.abs(lengthJitter)/100;
  if(rotation===0&&offset===0&&lengthAmount===0&&endpointWobble===0&&endExtension===0)return baseStrokes;
  const baseSeed=(normalizeSeed(seed)^Math.imul(pass,0x9E3779B9))>>>0;
  const result=new Array(baseStrokes.length);
  for(let i=0;i<baseStrokes.length;i++){
    const [start,end]=baseStrokes[i];
    const cx=(start[0]+end[0])*0.5,cy=(start[1]+end[1])*0.5;
    const hx=(end[0]-start[0])*0.5,hy=(end[1]-start[1])*0.5;
    const delta=rotation?hashSigned(baseSeed,i,0)*rotation*Math.PI/180:0;
    const ca=delta?Math.cos(delta):1,sa=delta?Math.sin(delta):0;
    const lengthScale=Math.max(0.01,1+(lengthAmount?hashSigned(baseSeed,i,2)*lengthAmount:0));
    const rx=(hx*ca-hy*sa)*lengthScale,ry=(hx*sa+hy*ca)*lengthScale;
    const length=Math.hypot(rx,ry);
    const amount=offset?hashSigned(baseSeed,i,1)*offset:0;
    const ox=length>1e-12?-ry/length*amount:0;
    const oy=length>1e-12?rx/length*amount:0;
    // Do not carry the old polygon-boundary cap insets: they were intended
    // to keep square ends INSIDE the source polygon. Only newly introduced
    // foreground occlusion cuts should receive boundary-aware cap insets.
    const ux=length>1e-12?rx/length:1,uy=length>1e-12?ry/length:0;
    const nx=-uy,ny=ux;
    const w1=endpointWobble?hashSigned(baseSeed,i,3)*endpointWobble:0;
    const w2=endpointWobble?hashSigned(baseSeed,i,4)*endpointWobble:0;
    // Original raster hatches independently wobbled both clipped endpoints,
    // then extended each end by a fixed 0.1 world units.
    result[i]=[
      [cx-rx+ox-ux*endExtension+nx*w1,cy-ry+oy-uy*endExtension+ny*w1],
      [cx+rx+ox+ux*endExtension+nx*w2,cy+ry+oy+uy*endExtension+ny*w2],0,0
    ];
  }
  return result;
}


/** Generate polygon-clipped source hatches once, then apply one jitter pass. */
export function generateJitteredHatchStrokes(polygon,options={}){
  const {angle=45,spacing=7,phase=0}=options;
  if(!(Number.isFinite(spacing)&&spacing>0))throw new Error('spacing must be positive');
  if(!Number.isFinite(angle)||!Number.isFinite(phase))
    throw new Error('Hatch angle and phase must be finite');
  return jitterClippedHatchStrokes(generateHatchStrokes(polygon,{angle,spacing,phase}),options);
}
