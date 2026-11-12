import { getRings } from './geometry.js';

const EPS = 1e-7;

/** Bounds of a 2D ring collection. */
export function ringBounds(rings) {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const ring of rings) for (const [x,y] of ring) {
    if(x<minX)minX=x;if(x>maxX)maxX=x;
    if(y<minY)minY=y;if(y>maxY)maxY=y;
  }
  return {minX,minY,maxX,maxY};
}

export function overlappingBounds(a,b) {
  return a.minX<=b.maxX && a.maxX>=b.minX && a.minY<=b.maxY && a.maxY>=b.minY;
}

/**
 * A simple world-space spatial hash for already processed, nearer polygons.
 * Only neighboring occluders are examined when hatching a farther polygon.
 */
export class OccluderIndex {
  constructor(bounds, estimatedCount=1) {
    const area=Math.max(1,(bounds.maxX-bounds.minX)*(bounds.maxY-bounds.minY));
    this.cellSize=Math.max(12,Math.sqrt(area/Math.max(1,estimatedCount))*1.8);
    this.originX=bounds.minX;this.originY=bounds.minY;
    this.cells=new Map();this.large=[];this.items=[];
  }
  cellsFor(bounds) {
    return [Math.floor((bounds.minX-this.originX)/this.cellSize),
      Math.floor((bounds.maxX-this.originX)/this.cellSize),
      Math.floor((bounds.minY-this.originY)/this.cellSize),
      Math.floor((bounds.maxY-this.originY)/this.cellSize)];
  }
  insert(polygon) {
    const rings=getRings(polygon),bounds=ringBounds(rings);
    const item={rings,bounds};
    const id=this.items.push(item)-1;
    const [x0,x1,y0,y1]=this.cellsFor(bounds);
    if((x1-x0+1)*(y1-y0+1)>256){this.large.push(id);return;}
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
      const key=`${x},${y}`;
      let cell=this.cells.get(key);
      if(!cell){cell=[];this.cells.set(key,cell);}
      cell.push(id);
    }
  }
  query(bounds) {
    const found=new Set(this.large);
    const [x0,x1,y0,y1]=this.cellsFor(bounds);
    // Bounding region usually spans a handful of cells. If enormous,
    // scanning indexed objects is cheaper than enumerating millions of cells.
    if((x1-x0+1)*(y1-y0+1)>1024){
      for(let id=0;id<this.items.length;id++)found.add(id);
    }else{
      for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
        for(const id of this.cells.get(`${x},${y}`)??[])found.add(id);
      }
    }
    return [...found].map(id=>this.items[id]).filter(item=>overlappingBounds(bounds,item.bounds));
  }
}

/**
 * Subtracts the *filled portion* of an occluding polygon from one hatch stroke.
 * Holes and concave shapes use the same even/odd rule as the base hatch engine.
 * The returned strokes retain the local boundary slopes used for square caps.
 *
 * This zero-width centerline version remains for geometry APIs. The renderer
 * supplies halfWidth to the wide-stroke boolean clipper instead of relying on
 * GPU masking for pixels around the centerline.
 */
export function subtractOccluderFromStroke(stroke, blocker) {
  const [start,end,startSlope=0,endSlope=0]=stroke;
  const dx=end[0]-start[0],dy=end[1]-start[1],len=Math.hypot(dx,dy);
  if(len<EPS)return [];
  const ux=dx/len,uy=dy/len;
  const bounds=blocker.bounds??ringBounds(blocker.rings??getRings(blocker));
  const segBounds={minX:Math.min(start[0],end[0]),maxX:Math.max(start[0],end[0]),
    minY:Math.min(start[1],end[1]),maxY:Math.max(start[1],end[1])};
  if(!overlappingBounds(segBounds,bounds))return [stroke];
  const rings=blocker.rings??getRings(blocker);
  const cuts=[];
  for(const ring of rings){
    let prev=ring[ring.length-1];
    for(const next of ring){
      const ax=prev[0]-start[0],ay=prev[1]-start[1];
      const bx=next[0]-start[0],by=next[1]-start[1];
      const av=ax* -uy+ay*ux,bv=bx* -uy+by*ux;
      if((av<=0 && 0<bv)||(bv<=0 && 0<av)){
        const au=ax*ux+ay*uy,bu=bx*ux+by*uy;
        const slope=(bu-au)/(bv-av);
        const u=au-av*slope;
        cuts.push([u,Math.abs(slope)]);
      }
      prev=next;
    }
  }
  if(!cuts.length)return [stroke];
  cuts.sort((a,b)=>a[0]-b[0]);
  // A polygon may cover the line in multiple spans (concavity, holes).
  let intervals=[[0,len,startSlope,endSlope]];
  for(let i=0;i+1<cuts.length;i+=2){
    const [blockStart,slopeStart]=cuts[i], [blockEnd,slopeEnd]=cuts[i+1];
    if(blockEnd-blockStart<EPS)continue;
    const next=[];
    for(const [a,b,sa,sb] of intervals){
      if(blockStart>=b-EPS || blockEnd<=a+EPS){next.push([a,b,sa,sb]);continue;}
      if(blockStart>a+EPS)next.push([a,Math.min(b,blockStart),sa,slopeStart]);
      if(blockEnd<b-EPS)next.push([Math.max(a,blockEnd),b,slopeEnd,sb]);
    }
    intervals=next;
    if(!intervals.length)break;
  }
  return intervals.filter(([a,b])=>b-a>EPS).map(([a,b,sa,sb])=>[
    [start[0]+ux*a,start[1]+uy*a],
    [start[0]+ux*b,start[1]+uy*b],sa,sb
  ]);
}

/**
 * Boolean subtraction of the full-width *rectangle* of a stroke against a
 * foreground polygon. Every surviving piece remains a rectangular stroke with
 * ends perpendicular to its axis. No polygon-edge masks or GPU depth test.
 *
 * Transform the occluder to (along,across) coordinates. The blocked along-axis
 * intervals are exactly the projection of filled polygon ∩ the infinite
 * stroke-width strip. Sweep the critical positions where polygon edges cross
 * the two strip boundaries or turn at a vertex. Within each open interval,
 * the even/odd filled cross-section cannot change topology. This handles
 * concavities and polygon holes without clipping the drawn quad diagonally.
 *
 * Half-width is measured in world units and may include an AA safety margin.
 */
export function subtractWideOccluderFromStroke(stroke, blocker, halfWidth) {
  if(!Number.isFinite(halfWidth)||halfWidth<0)throw new RangeError('halfWidth must be nonnegative');
  if(halfWidth===0)return subtractOccluderFromStroke(stroke,blocker);
  const [start,end,startSlope=0,endSlope=0]=stroke;
  const dx=end[0]-start[0],dy=end[1]-start[1],len=Math.hypot(dx,dy);
  if(len<EPS)return [];
  const ux=dx/len,uy=dy/len;
  const box=blocker.bounds??ringBounds(blocker.rings??getRings(blocker));
  const strokeBox={
    minX:Math.min(start[0],end[0])-halfWidth,
    maxX:Math.max(start[0],end[0])+halfWidth,
    minY:Math.min(start[1],end[1])-halfWidth,
    maxY:Math.max(start[1],end[1])+halfWidth
  };
  if(!overlappingBounds(strokeBox,box))return [stroke];
  const rings=blocker.rings??getRings(blocker);
  const critical=[0,len],edges=[];
  const cross=(point)=>{
    const x=point[0]-start[0],y=point[1]-start[1];
    return [x*ux+y*uy,-x*uy+y*ux];
  };
  for(const ring of rings){
    let prev=cross(ring[ring.length-1]);
    for(const p of ring){
      const next=cross(p),[au,av]=prev,[bu,bv]=next;
      edges.push([au,av,bu,bv]);
      if(av>=-halfWidth-EPS&&av<=halfWidth+EPS)critical.push(au);
      if(Math.abs(bv-av)>EPS){
        for(const v of [-halfWidth,halfWidth]){
          const t=(v-av)/(bv-av);
          if(t>=0&&t<=1)critical.push(au+t*(bu-au));
        }
      }
      prev=next;
    }
  }
  // Restrict sweep to the finite stroke before sorting; polygon edges outside
  // the stroke can still contribute crossings at every interior sample.
  const cuts=critical.filter(u=>u>=0&&u<=len).sort((a,b)=>a-b);
  const ordered=[];
  for(const value of cuts)if(!ordered.length||value-ordered.at(-1)>EPS)ordered.push(value);
  if(ordered[0]!==0)ordered.unshift(0);
  if(ordered.at(-1)!==len)ordered.push(len);
  const visible=[];
  let runStart=null;
  for(let j=0;j<ordered.length-1;j++){
    const a=ordered[j],b=ordered[j+1];
    if(b-a<EPS)continue;
    const u=(a+b)*0.5;
    const crossings=[];
    for(const [au,av,bu,bv] of edges){
      // Half-open edge inclusion keeps shared vertices from double counting.
      if((au<=u&&bu>u)||(bu<=u&&au>u))
        crossings.push(av+(u-au)*(bv-av)/(bu-au));
    }
    crossings.sort((a,b)=>a-b);
    let covered=false;
    for(let i=0;i+1<crossings.length;i+=2){
      if(crossings[i]<halfWidth-EPS&&crossings[i+1]>-halfWidth+EPS){
        covered=true;break;
      }
    }
    if(!covered&&runStart===null)runStart=a;
    if(covered&&runStart!==null){visible.push([runStart,a]);runStart=null;}
  }
  if(runStart!==null)visible.push([runStart,len]);
  return visible.filter(([a,b])=>b-a>EPS).map(([a,b])=>[
    [start[0]+ux*a,start[1]+uy*a],
    [start[0]+ux*b,start[1]+uy*b],
    a<=EPS?startSlope:0,b>=len-EPS?endSlope:0
  ]);
}

/** Return visible fragments of one square-capped stroke after nearer polygons. */
export function clipStrokeAgainstOccluders(stroke, occluders, halfWidth=0) {
  let fragments=[stroke];
  for(const occluder of occluders){
    if(!fragments.length)break;
    const next=[];
    for(const fragment of fragments)next.push(...(halfWidth>0
      ?subtractWideOccluderFromStroke(fragment,occluder,halfWidth)
      :subtractOccluderFromStroke(fragment,occluder)));
    fragments=next;
  }
  return fragments;
}

/** A visible world-space segment (without cap metadata) for optional outlines. */
export function clipLineAgainstOccluders(start,end,occluders) {
  return clipStrokeAgainstOccluders([start,end,0,0],occluders).map(([a,b])=>[a,b]);
}
