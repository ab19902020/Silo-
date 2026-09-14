import {updateResidentExpression} from './resident-expression.js';
import * as T from '../vendor/three.module.js';
import {createResident,disposeResident} from './resident-model.js';

// A small, separate portrait stage. It renders only while the selector is open.
export class CharacterPreview{
 constructor(canvas,status){
  this.canvas=canvas;this.status=status;this.angle=.25;this.pose='Idle';this.view='full';this.frame=0;this.elapsed=0;this.active=false;
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(32,1,.05,20);
  this.scene.add(new T.HemisphereLight(0xcbd9c8,0x343626,2.3));
  const key=new T.DirectionalLight(0xffebcf,3.1);key.position.set(-2,3,4);this.scene.add(key);
  const rim=new T.DirectionalLight(0xa9c6bc,2);rim.position.set(2,2,-2);this.scene.add(rim);
  const floor=new T.Mesh(new T.CircleGeometry(1,64),new T.MeshStandardMaterial({color:0x303e35,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;this.scene.add(floor);
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,id:e.pointerId};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(drag){this.angle+=(e.clientX-drag.x)*.012;drag.x=e.clientX;this.render();}});
  const release=()=>{drag=null;};canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.turn(e.key==='ArrowLeft'?-.3:.3);}});
  this.resize=new ResizeObserver(()=>this.render());this.resize.observe(canvas);
 }
 open(){
  if(!this.renderer&&!this.failed){try{this.renderer=new T.WebGLRenderer({canvas:this.canvas,alpha:true,antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;}catch{this.failed=true;this.status.textContent='3D preview is unavailable in this browser. Your character settings still work.';}}
  cancelAnimationFrame(this.frame);this.active=true;this.last=0;this.tick(0);
 }
 close(){this.active=false;cancelAnimationFrame(this.frame);this.frame=0;}
 show(definition){
  const key=JSON.stringify([definition.height,definition.appearance]);if(this.actor&&key===this.appearanceKey){this.actor.definition=definition;return;}this.appearanceKey=key;
  const next=createResident(definition,{cache:false});if(this.actor)disposeResident(this.actor);this.actor=next;this.scene.add(next.root);this.elapsed=0;this.render();
 }
 turn(amount){this.angle+=amount;this.render();}
 tick(now){
  if(!this.active||!this.renderer)return;const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;this.elapsed+=dt;
  if(this.actor){this.actor.motion.sample(this.view==='face'?'Idle':this.pose,this.elapsed);updateResidentExpression(this.actor,this.elapsed);this.render();}
  this.frame=requestAnimationFrame(t=>this.tick(t));
 }
 render(){
  if(!this.active||!this.renderer||!this.actor)return;
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h)return;
  if(this.width!==w||this.height!==h){this.renderer.setSize(w,h,false);this.width=w;this.height=h;}this.camera.aspect=w/h;const height=this.actor.definition.height;
  const portrait=this.view==='face',distance=height*(portrait?.46:1.9)*Math.max(1,.65/this.camera.aspect),target=height*(portrait?.915:.51);this.camera.position.set(0,portrait?target:height*.59,distance);this.camera.lookAt(0,target,0);this.camera.updateProjectionMatrix();
  this.actor.root.rotation.y=this.angle;this.renderer.render(this.scene,this.camera);
 }
}
