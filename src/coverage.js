/**
 * Conservative early-Z coverage for the CPU geometry builder.
 * A cell is marked covered ONLY when every point of its square falls within
 * one already triangulated foreground triangle. This is a sufficient, not
 * necessary, condition: false negatives cost work but cannot hide geometry.
 * Hole boundaries remain empty because their area has no fill triangles.
 */
export class ConservativeCoverage {
  constructor(bounds, cellSize = 14) {
    if (!(Number.isFinite(cellSize) && cellSize > 0)) throw new Error('Invalid coverage tile size');
    this.originX = bounds.minX;
    this.originY = bounds.minY;
    this.size = cellSize;
    this.cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX)/cellSize));
    this.rows = Math.max(1, Math.ceil((bounds.maxY - bounds.minY)/cellSize));
    this.wordCols = Math.ceil(this.cols/32);
    this.filledWords = new Uint32Array(this.wordCols * this.rows);
  }
  cellRange(bounds) {
    const cs=this.size;
    return [
      Math.max(0,Math.floor((bounds.minX-this.originX)/cs)),
      Math.min(this.cols-1,Math.floor((bounds.maxX-this.originX)/cs)),
      Math.max(0,Math.floor((bounds.minY-this.originY)/cs)),
      Math.min(this.rows-1,Math.floor((bounds.maxY-this.originY)/cs))
    ];
  }
  /** If true, the entire bounding rectangle is guaranteed hidden by nearer polygons. */
  covers(bounds) {
    const [x0,x1,y0,y1]=this.cellRange(bounds);
    if(x1<x0||y1<y0)return false;
    // One 32-bit word covers 32 consecutive full tiles. Dense scenes often
    // query thousands of AABBs covering hundreds of tiles each; whole-word
    // queries make early-Z culling effectively independent of tile width.
    const start=x0>>>5,end=x1>>>5;
    const beginMask=(0xffffffff<<(x0&31))>>>0;
    const endMask=(0xffffffff>>>(31-(x1&31)))>>>0;
    const words=this.filledWords,stride=this.wordCols;
    if(start===end){
      const needed=(beginMask&endMask)>>>0;
      for(let y=y0;y<=y1;y++)if((words[y*stride+start]&needed)>>>0 !== needed)return false;
      return true;
    }
    for(let y=y0;y<=y1;y++){
      const base=y*stride;
      if(((words[base+start]&beginMask)>>>0)!==beginMask)return false;
      for(let x=start+1;x<end;x++)if(words[base+x]!==0xffffffff)return false;
      if(((words[base+end]&endMask)>>>0)!==endMask)return false;
    }
    return true;
  }
  addTriangle(ax,ay,bx,by,cx,cy){
    const cs=this.size, ox=this.originX,oy=this.originY;
    const left=Math.ceil((Math.min(ax,bx,cx)-ox)/cs);
    const right=Math.floor((Math.max(ax,bx,cx)-ox)/cs)-1;
    const top=Math.ceil((Math.min(ay,by,cy)-oy)/cs);
    const bottom=Math.floor((Math.max(ay,by,cy)-oy)/cs)-1;
    if(left>right||top>bottom)return;
    const minX=Math.max(0,left),maxX=Math.min(this.cols-1,right);
    const minY=Math.max(0,top),maxY=Math.min(this.rows-1,bottom);
    const abx=bx-ax,aby=by-ay,bcx=cx-bx,bcy=cy-by,cax=ax-cx,cay=ay-cy;
    const orientation=abx*(cy-ay)-aby*(cx-ax);
    if(!Number.isFinite(orientation)||Math.abs(orientation)<1e-8)return;
    const sign=orientation>0?1:-1;
    // For a convex triangle, the minimum edge half-plane value over a tile
    // occurs at one of its corners. Check only that support corner per edge,
    // rather than 12 cross products across all four corners.
    const e1x=-aby*sign,e1y=abx*sign;
    const e2x=-bcy*sign,e2y=bcx*sign;
    const e3x=-cay*sign,e3y=cax*sign;
    const words=this.filledWords,stride=this.wordCols;
    for(let y=minY;y<=maxY;y++){
      const y0=oy+y*cs,y1=y0+cs;
      for(let x=minX;x<=maxX;x++){
        const at=y*stride+(x>>>5),bit=1<<(x&31);
        if(words[at]&bit)continue;
        const x0=ox+x*cs,x1=x0+cs;
        const p1x=e1x>=0?x0:x1,p1y=e1y>=0?y0:y1;
        const p2x=e2x>=0?x0:x1,p2y=e2y>=0?y0:y1;
        const p3x=e3x>=0?x0:x1,p3y=e3y>=0?y0:y1;
        if(e1x*(p1x-ax)+e1y*(p1y-ay)>1e-7 &&
           e2x*(p2x-bx)+e2y*(p2y-by)>1e-7 &&
           e3x*(p3x-cx)+e3y*(p3y-cy)>1e-7)words[at]|=bit;
      }
    }
  }
}
