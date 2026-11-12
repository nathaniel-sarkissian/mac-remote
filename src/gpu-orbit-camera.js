// Orbit / pan / zoom is camera-only; plant geometry remains generated
// entirely by the vertex shader from gl_VertexID and gl_InstanceID.
export const CAMERA_DEFAULT=Object.freeze({
  yaw:0.38,pitch:0.35,zoom:1,target:Object.freeze([0,2,-21])
});
export const MIN_PITCH=0.06;
export const MAX_PITCH=Math.PI/2-0.045;
export const MIN_ZOOM=0.15;
export const MAX_ZOOM=12;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function orbitBasis(yaw,pitch){
  const a=Math.sin(yaw),b=Math.cos(yaw),c=Math.sin(pitch),d=Math.cos(pitch);
  // All vectors are orthonormal. View points from target to camera.
  return {
    right:[b,0,-a],
    up:[-a*c,d,-b*c],
    view:[a*d,c,b*d]
  };
}
export class OrbitCamera{
  constructor(){this.reset();}
  reset(){
    this.yaw=CAMERA_DEFAULT.yaw;
    this.pitch=CAMERA_DEFAULT.pitch;
    this.zoom=CAMERA_DEFAULT.zoom;
    this.target=[...CAMERA_DEFAULT.target];
    return this;
  }
  basis(){return orbitBasis(this.yaw,this.pitch);}
  pixelsPerWorld(width,height){
    return Math.max(0.0001,Math.min(width,height)/75)*this.zoom;
  }
  orbit(dx,dy){
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return this;
    this.yaw=(this.yaw+dx*0.007)%(2*Math.PI);
    this.pitch=clamp(this.pitch-dy*0.006,MIN_PITCH,MAX_PITCH);
    return this;
  }
  pan(dx,dy,width,height){
    if(![dx,dy,width,height].every(Number.isFinite)||width<=0||height<=0)return this;
    const {right,up}=this.basis(),scale=this.pixelsPerWorld(width,height);
    // Drag right/down moves the world right/down in screen coordinates.
    for(let i=0;i<3;i++)
      this.target[i]+=(-dx*right[i]+dy*up[i])/scale;
    return this;
  }
  zoomAt(factor,x,y,width,height){
    if(![factor,x,y,width,height].every(Number.isFinite)||factor<=0||width<=0||height<=0)return this;
    const old=this.pixelsPerWorld(width,height);
    const next=clamp(this.zoom*factor,MIN_ZOOM,MAX_ZOOM);
    this.zoom=next;
    const now=this.pixelsPerWorld(width,height);
    // Keep the 3D view-plane point underneath the cursor fixed. This also
    // works for the centroid of a two-finger pinch.
    const sx=x-width*0.5,sy=y-height*0.5;
    const delta=1/old-1/now;
    const {right,up}=this.basis();
    for(let i=0;i<3;i++)
      this.target[i]+=(sx*right[i]-sy*up[i])*delta;
    return this;
  }
}
/** Mouse: left orbit; shift/right/middle pan; wheel zoom at pointer.
 * Touch: one finger orbit; two fingers pan and pinch simultaneously.
 * Pointer capture prevents interrupted gestures leaving a stuck state.
 */
export function bindOrbitControls(canvas,camera,onChange=()=>{}){
  const pointers=new Map();
  let previous=null;
  const bounds=()=>canvas.getBoundingClientRect();
  function snapshot(){
    const values=[...pointers.values()];
    const count=values.length;
    if(!count)return null;
    const cx=values.reduce((s,p)=>s+p.x,0)/count;
    const cy=values.reduce((s,p)=>s+p.y,0)/count;
    const distance=count>=2?Math.hypot(values[0].x-values[1].x,values[0].y-values[1].y):0;
    return {count,cx,cy,distance,mode:values[0].mode};
  }
  function down(e){
    if(e.pointerType!=='touch'&&e.button>2)return;
    e.preventDefault();
    const mode=e.shiftKey||e.button===1||e.button===2?'pan':'orbit';
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,mode});
    try{canvas.setPointerCapture?.(e.pointerId);}catch{}
    previous=snapshot();
  }
  function move(e){
    const old=pointers.get(e.pointerId);if(!old)return;
    e.preventDefault();
    pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
    const next=snapshot();
    if(!previous||!next||next.count!==previous.count){previous=next;return;}
    const rect=bounds();
    if(next.count>=2){
      camera.pan(next.cx-previous.cx,next.cy-previous.cy,rect.width,rect.height);
      if(previous.distance>1&&next.distance>1)
        camera.zoomAt(next.distance/previous.distance,next.cx-rect.left,next.cy-rect.top,rect.width,rect.height);
    }else if(next.mode==='pan')
      camera.pan(next.cx-previous.cx,next.cy-previous.cy,rect.width,rect.height);
    else camera.orbit(next.cx-previous.cx,next.cy-previous.cy);
    previous=next;
    onChange();
  }
  function up(e){
    if(!pointers.has(e.pointerId))return;
    pointers.delete(e.pointerId);
    try{if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);}catch{}
    previous=snapshot();
  }
  function wheel(e){
    e.preventDefault();
    const rect=bounds();
    const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?rect.height:1);
    camera.zoomAt(Math.exp(-delta*0.0015),e.clientX-rect.left,e.clientY-rect.top,rect.width,rect.height);
    onChange();
  }
  function contextMenu(e){e.preventDefault();}
  canvas.addEventListener('pointerdown',down);
  canvas.addEventListener('pointermove',move);
  canvas.addEventListener('pointerup',up);
  canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('lostpointercapture',up);
  canvas.addEventListener('wheel',wheel,{passive:false});
  canvas.addEventListener('contextmenu',contextMenu);
  return ()=>{
    pointers.clear();previous=null;
    for(const event of ['pointerup','pointercancel','lostpointercapture'])
      canvas.removeEventListener(event,up);
    canvas.removeEventListener('pointerdown',down);
    canvas.removeEventListener('pointermove',move);
    canvas.removeEventListener('wheel',wheel);
    canvas.removeEventListener('contextmenu',contextMenu);
  };
}
