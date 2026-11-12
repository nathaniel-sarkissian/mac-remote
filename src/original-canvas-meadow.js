// Reliable original-geometry renderer, independent of WebGL driver quirks.
// Uses the same recovered 2025 source as /nts/, not an icon or approximation.
// GPU/WebGL3D remains selectable; this is the visual-correctness fallback.
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
export class OriginalCanvasMeadow{
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{alpha:false});
    if(!this.ctx)throw new Error('Canvas2D is required for source geometry fallback');
    this.seed=null;
    this.source=null;
    this.lastStats=null;
    this.preparedMs=0;
  }
  prepare(seed){
    if(this.seed===seed&&this.source)return false;
    const t=performance.now();
    this.source=generateNeverSame({seed});
    this.seed=seed;
    this.preparedMs=performance.now()-t;
    return true;
  }
  render({seed=2611,plants=100,grass=100,layer='all',zoom=1,panX=0,panY=0,
    flowersForeground=true}={}){
    if(![seed,plants,grass,zoom,panX,panY].every(Number.isFinite)||zoom<=0)
      throw new RangeError('Invalid source geometry settings');
    const rebuild=this.prepare(seed);
    const stats=originalCanvasSceneStats(this.source,layer,plants,grass);
    const canvas=this.canvas,ctx=this.ctx;
    const width=Math.max(1,Math.round(canvas.clientWidth||canvas.width||1));
    const height=Math.max(1,Math.round(canvas.clientHeight||canvas.height||1));
    const dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1);
    const w=Math.round(width*dpr),h=Math.round(height*dpr);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha=1;
    ctx.fillStyle=this.source.background;
    ctx.fillRect(0,0,w,h);
    const pixelsPerWorld=Math.min(width,height)/75*zoom;
    ctx.setTransform(pixelsPerWorld*dpr,0,0,pixelsPerWorld*dpr,
      w*.5-panX*pixelsPerWorld*dpr,
      h*.5-panY*pixelsPerWorld*dpr);
    // Original data is sorted NEAR-to-FAR for hatching occlusion.
    // A painter's Canvas2D view must draw FAR-to-NEAR instead.
    const order=stats.scene.slice().reverse();
    if(flowersForeground&&layer!=='grass'){
      const flowers=[],others=[];
      for(const item of order){
        if(item.plantPart==='petal'||item.plantPart==='disk')flowers.push(item);
        else others.push(item);
      }
      order.splice(0,order.length,...others,...flowers);
    }
    let rendered=0;
    for(const item of order){
      const points=item.points;
      if(!points||points.length<2)continue;
      let finite=true;
      for(const [x,y] of points)if(!Number.isFinite(x)||!Number.isFinite(y)){finite=false;break;}
      if(!finite)continue;
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
    this.lastStats={...stats,rendered,rebuiltScene:rebuild,
      triangles:0,drawCalls:0,mode:'original-source-canvas2d',
      source:'recovered-2025-geometry',resolution:[w,h]};
    return this.lastStats;
  }
}
