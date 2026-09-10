import * as THREE from '../vendor/three.module.js';
// An isolated, lazily created tabletop viewer. It borrows no world light and
// never moves the actual relic. All input belongs to the inspection canvas.
export class RelicInspector{
  constructor(canvas,status){
    this.canvas=canvas;this.status=status;this.renderer=null;this.model=null;this.active=false;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x111819);
    this.camera=new THREE.PerspectiveCamera(38,1,.01,20);
    this.pivot=new THREE.Group();this.scene.add(this.pivot);
    this.scene.add(new THREE.HemisphereLight(0xd8dfd8,0x333128,2.1));
    for(const [color,intensity,p] of [[0xffe5ba,24,[-2,3,3]],[0xc3d6d9,13,[3,1,-2]]]){const l=new THREE.PointLight(color,intensity,10,2);l.position.set(...p);this.scene.add(l);}
    this.pointers=new Map();this.yaw=-.35;this.pitch=.65;this.zoom=1;this.lastSpan=0;
    canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus();canvas.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,[e.clientX,e.clientY]);this.lastSpan=this.span();});
    canvas.addEventListener('pointermove',e=>{
      const before=this.pointers.get(e.pointerId);if(!before)return;
      const dx=e.clientX-before[0],dy=e.clientY-before[1];this.pointers.set(e.pointerId,[e.clientX,e.clientY]);
      if(this.pointers.size>1){const span=this.span();if(this.lastSpan>0)this.zoom=THREE.MathUtils.clamp(this.zoom*this.lastSpan/span,.55,2.8);this.lastSpan=span;}
      else{this.yaw+=dx*.009;this.pitch+=dy*.009;}
    });
    const release=e=>{this.pointers.delete(e.pointerId);this.lastSpan=this.span();};
    canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=THREE.MathUtils.clamp(this.zoom*Math.exp(e.deltaY*.001),.55,2.8);},{passive:false});
    canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='ArrowLeft')this.yaw-=.15;if(e.key==='ArrowRight')this.yaw+=.15;if(e.key==='ArrowUp')this.pitch-=.15;if(e.key==='ArrowDown')this.pitch+=.15;if(e.key==='+'||e.key==='=')this.zoom=Math.max(.55,this.zoom*.9);if(e.key==='-')this.zoom=Math.min(2.8,this.zoom*1.1);if(e.key==='0')this.reset();});
  }
  span(){const p=[...this.pointers.values()];return p.length>1?Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]):0;}
  reset(){this.yaw=-.35;this.pitch=.65;this.zoom=1;}
  flip(){this.pitch+=Math.PI;}
  show(source){
    this.pivot.clear();this.reset();this.pointers.clear();
    if(!source){this.status.textContent='The model is still loading. Close this view and try again.';this.active=false;return;}
    if(!this.renderer){this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:true,alpha:false});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}
    const clone=source.clone(true);clone.position.set(0,0,0);clone.visible=true;clone.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(clone),size=bounds.getSize(new THREE.Vector3()),centre=bounds.getCenter(new THREE.Vector3());
    const fit=1/Math.max(size.x,size.y,size.z,.001);clone.position.copy(centre).multiplyScalar(-fit);clone.scale.multiplyScalar(fit);
    clone.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=false;}});
    this.pivot.add(clone);this.model=clone;this.active=true;this.status.textContent='Drag to turn · pinch or scroll to zoom';this.render();
  }
  hide(){this.active=false;this.pointers.clear();this.pivot.clear();this.model=null;}
  render(){
    if(!this.active||!this.renderer)return;
    const box=this.canvas.getBoundingClientRect(),w=Math.max(1,Math.round(box.width)),h=Math.max(1,Math.round(box.height));
    const size=this.renderer.getSize(new THREE.Vector2());if(size.x!==w||size.y!==h){this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
    this.pivot.rotation.set(this.pitch,this.yaw,0);this.camera.position.set(0,.48*this.zoom,2.15*this.zoom);this.camera.lookAt(0,0,0);this.renderer.render(this.scene,this.camera);
  }
}
