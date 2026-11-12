// Reliable original 2025 geometry, cached as a world-space raster.
// Source polygons are built only when the seed or scene content changes.
// Subsequent orbit-independent pan/zoom views require one Canvas2D drawImage,
// not ~50,000 individual polygon/path submissions per camera movement.
import {generateNeverSame,filterNeverSameScene} from './never-the-same-geometry.js';

export function sceneLayerVisible(item,layer='all'){
  if(layer==='all')return true;
  if(layer==='grass')return !!item.grass;
  if(layer==='flowers')return item.plantPart==='petal'||item.plantPart==='disk';
  if(layer==='plants')return !item.grass;
  throw new RangeError('Unknown original scene layer');
}
export function originalCanvasSceneStats(source,layer='all',plants=100,grass=100){
  const selected=filterNeverSameScene(source,{plants,grass});
  const displayed=selected.scene.filter(item=>sceneLayerVisible(item,layer));
  return {
    scene:displayed,
    petals:displayed.filter(x=>x.plantPart==='petal').length,
    disks:displayed.filter(x=>x.plantPart==='disk').length,
    leaves:displayed.filter(x=>x.plantPart==='leaf').length,
    grass:displayed.filter(x=>x.grass).length,
    paths:displayed.filter(x=>x.type==='path').length
  };
}
export function sourceSceneBounds(scene,padding=2){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const item of scene){
    for(const p of item.points||[]){
      if(!Number.isFinite(p[0])||!Number.isFinite(p[1]))continue;
      if(p[0]<minX)minX=p[0];
      if(p[0]>maxX)maxX=p[0];
      if(p[1]<minY)minY=p[1];
      if(p[1]>maxY)maxY=p[1];
    }
  }
  if(!Number.isFinite(minX))return {minX:-37.5,minY:-37.5,width:75,height:75};
  // Preserve the entire original source, including off-screen stems that
  // come into view when panning. Do not crop to the initial camera bounds.
  return {minX:minX-padding,minY:minY-padding,
    width:Math.max(1,maxX-minX+2*padding),
    height:Math.max(1,maxY-minY+2*padding)};
}
export function atlasPixelScale(bounds,desired,limitPixels=12_000_000,maxDim=4096){
  if(!Number.isFinite(desired)||desired<=0||
    !Number.isFinite(bounds.width)||!Number.isFinite(bounds.height)||
    bounds.width<=0||bounds.height<=0)throw new RangeError('Invalid atlas dimensions');
  return Math.min(desired,maxDim/bounds.width,maxDim/bounds.height,
    Math.sqrt(limitPixels/(bounds.width*bounds.height)));
}
export class OriginalCanvasMeadow{
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx)throw new Error('Canvas2D is required for original source geometry');
    this.seed=null;
    this.source=null;
    this.cache=null;
    this.lastStats=null;
    this.preparedMs=0;
  }
  prepare(seed){
    if(this.seed===seed&&this.source)return false;
    const start=performance.now();
    this.source=generateNeverSame({seed});
    this.seed=seed;
    this.cache=null;
    this.preparedMs=performance.now()-start;
    return true;
  }
  createAtlas(){
    // Browser canvas also works in old Firefox and in environments lacking
    // OffscreenCanvas. Never require a WebGL context on this fallback path.
    const doc=this.canvas.ownerDocument||
      (typeof document==='undefined'?null:document);
    if(doc&&typeof doc.createElement==='function')
      return doc.createElement('canvas');
    if(typeof OffscreenCanvas!=='undefined')return new OffscreenCanvas(1,1);
    return null; // Deterministic drawing fallback for non-browser test mocks.
  }
  drawSource(ctx,scene,bounds,scale,flowersForeground,layer){
    ctx.setTransform(scale,0,0,scale,-bounds.minX*scale,-bounds.minY*scale);
    const order=scene.slice().reverse(); // source sorted near to far
    if(flowersForeground&&layer!=='grass'){
      const heads=[],other=[];
      for(const item of order)
        (item.plantPart==='petal'||item.plantPart==='disk'?heads:other).push(item);
      order.splice(0,order.length,...other,...heads);
    }
    let rendered=0;
    for(const item of order){
      const points=item.points;
      if(!points||points.length<2||points.some(p=>
        !Number.isFinite(p[0])||!Number.isFinite(p[1])))continue;
      ctx.beginPath();
      ctx.moveTo(points[0][0],points[0][1]);
      for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
      if(item.type==='path'){
        ctx.lineWidth=Math.max(.14,item.stroke?.lineWidth??.3);
        ctx.strokeStyle=item.stroke?.color??'#607c6d';
        ctx.globalAlpha=1;
        ctx.stroke();
      }else{
        ctx.closePath();
        ctx.fillStyle=item.hatch?.color??'#718774';
        ctx.globalAlpha=item.grass?.67:item.plantPart==='leaf'?.82:1;
        ctx.fill();
      }
      rendered++;
    }
    ctx.globalAlpha=1;
    return rendered;
  }
  render({seed=2611,plants=100,grass=100,layer='all',zoom=1,panX=0,panY=0,
    flowersForeground=true}={}){
    if(![seed,plants,grass,zoom,panX,panY].every(Number.isFinite)||zoom<=0)
      throw new RangeError('Invalid source geometry settings');
    const began=performance.now();
    const rebuiltScene=this.prepare(seed);
    const canvas=this.canvas,ctx=this.ctx;
    const width=Math.max(1,Math.round(canvas.clientWidth||canvas.width||1));
    const height=Math.max(1,Math.round(canvas.clientHeight||canvas.height||1));
    const dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    const key=[seed,plants,grass,layer,flowersForeground].join('|');
    let builtAtlas=false;
    if(!this.cache||this.cache.key!==key){
      const stats=originalCanvasSceneStats(this.source,layer,plants,grass);
      const bounds=sourceSceneBounds(stats.scene);
      const desired=Math.max(4,Math.min(width,height)/75*dpr*2);
      const scale=atlasPixelScale(bounds,desired);
      const atlas=this.createAtlas();
      if(atlas){
        atlas.width=Math.max(1,Math.ceil(bounds.width*scale));
        atlas.height=Math.max(1,Math.ceil(bounds.height*scale));
        const atlasCtx=atlas.getContext('2d',{alpha:true});
        if(!atlasCtx)throw new Error('Canvas2D source cache unavailable');
        const rendered=this.drawSource(atlasCtx,stats.scene,bounds,scale,
          flowersForeground,layer);
        this.cache={key,atlas,bounds,scale,stats,rendered};
      }else{
        // No browser canvas factory, e.g. node test stubs. Keep a faithful
        // uncached geometry renderer rather than silently showing nothing.
        this.cache={key,atlas:null,bounds,scale,stats,rendered:0};
      }
      builtAtlas=true;
    }
    const cache=this.cache;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha=1;
    ctx.fillStyle=this.source.background;
    ctx.fillRect(0,0,w,h);
    const pixelsPerWorld=Math.min(width,height)/75*zoom;
    let rendered=cache.rendered;
    if(cache.atlas){
      // The single image blit is the *only* geometry draw during pan/zoom.
      // Transform the already-rendered original 2025 scene in screen space.
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.drawImage(cache.atlas,
        width*.5+(cache.bounds.minX-panX)*pixelsPerWorld,
        height*.5+(cache.bounds.minY-panY)*pixelsPerWorld,
        cache.atlas.width/cache.scale*pixelsPerWorld,
        cache.atlas.height/cache.scale*pixelsPerWorld);
    }else{
      const bounds={minX:panX-width/(2*pixelsPerWorld),
        minY:panY-height/(2*pixelsPerWorld)};
      rendered=this.drawSource(ctx,cache.stats.scene,bounds,pixelsPerWorld*dpr,
        flowersForeground,layer);
    }
    ctx.globalAlpha=1;
    this.lastStats={...cache.stats,rendered,rebuiltScene,
      rebuiltAtlas:builtAtlas,triangles:0,drawCalls:cache.atlas?1:rendered,
      mode:cache.atlas?'original-source-cached-canvas2d':'original-source-canvas2d',
      source:'recovered-2025-geometry',resolution:[w,h],
      atlasPixels:cache.atlas?cache.atlas.width*cache.atlas.height:0,
      frameMs:performance.now()-began};
    return this.lastStats;
  }
}
