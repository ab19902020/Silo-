import * as THREE from '../vendor/three.module.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { RESIDENT_CAST } from './resident-data.js';
import { createResident, poseResident } from './resident-model.js';
import { topPoint, groundY } from './surface.js';
import { Kit, addSign } from './kit.js';

export const OPENING_DURATION=84;
export const BOOK_POSITION=Object.freeze([2,.855,22]);
export const CAFETERIA_START=Object.freeze([2,0,19.8]);
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp,ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const at=(x,z)=>new THREE.Vector3(x,groundY(x,z),z);
const followGround=p=>{p.y=groundY(p.x,p.z);return p;};
export function cleaningSample(time){
  const t=clamp(time,0,OPENING_DURATION),entry=at(26,108),lens=at(26.3,117.6),hill=at(43,77),wife=at(46.2,72.7);
  if(t<10)return {phase:'emerge',position:followGround(entry.lerp(lens,t/10)),heading:0,speed:.95};
  if(t<22)return {phase:'clean',position:lens,heading:0,progress:(t-10)/12,speed:0};
  const heading=Math.atan2(hill.x-lens.x,hill.z-lens.z);
  if(t<26)return {phase:'turn',position:lens,heading:heading*ease((t-22)/4),speed:0};
  if(t<57)return {phase:'walk',position:followGround(lens.lerp(hill,(t-26)/31)),heading,speed:1.42};
  if(t<64)return {phase:'helmet',position:hill,heading,progress:(t-57)/7,speed:0};
  const finalHeading=Math.atan2(wife.x-hill.x,wife.z-hill.z);
  if(t<76)return {phase:'crawl',position:followGround(hill.lerp(wife,(t-64)/12)),heading:finalHeading,progress:(t-64)/12,speed:.43};
  return {phase:'rest',position:wife,heading:finalHeading*(1-ease((t-76)/5)),progress:ease((t-76)/5),speed:0};
}

export function createDirectoryBook(m){
  const root=new THREE.Group(),k=new Kit(m);root.name='cafeteria-directory-book';
  k.bevel('green',0,-.01,0,.31,.015,.41);k.bevel('linen',.006,.011,0,.283,.030,.383);k.bevel('green',0,.034,0,.31,.012,.41);k.bevel('darkMetal',-.153,.012,0,.018,.052,.41);
  for(const z of [-.15,.15])k.box('brass',-.145,.042,z,.03,.005,.027);
  for(const z of [-.173,.173])k.box('brass',0,.042,z,.258,.002,.004);
  const label=addSign(root,'SILO 18\nDIRECTORY',[0,.041,0],.225,.205,0,{background:'#35483d',color:'#d0be8b',font:'bold 72px Georgia'});label.rotation.x=-Math.PI/2;label.scale.z=.035;
  root.add(k.group());root.position.copy(topPoint(...BOOK_POSITION));root.rotation.y=Math.PI/2;return root;
}

function posedCleaner(actor,sample,time,dt){
  const m=actor.motion;
  if(actor.lastPhase!==sample.phase&&actor.lastPhase){actor.blendFrom=Object.fromEntries(Object.entries(m.bones).map(([n,b])=>[n,{q:b.quaternion.clone(),p:b.position.clone()}]));actor.blendTime=0;}
  actor.lastPhase=sample.phase;actor.root.position.copy(sample.position);actor.root.rotation.y=sample.heading;actor.model.rotation.set(0,0,0);actor.model.position.set(0,0,0);
  const walking=sample.phase==='emerge'||sample.phase==='walk';
  poseResident(actor,walking?'walk':'idle',time,dt,sample.speed);
  if(sample.phase==='clean'){
    const envelope=Math.min(ease(sample.progress/.1),ease((1-sample.progress)/.1));
    m.rotate('Spine',.18*envelope);
    m.rotate('UpperArmR',-1.70*envelope+Math.sin(time*2.6)*.08*envelope);m.rotate('ForearmR',-.55*envelope);m.rotate('HandR',Math.sin(time*2.6)*.21*envelope);m.rotate('Head',-.04);
  }
  if(sample.phase==='helmet'){
    const u=ease(sample.progress),reach=Math.sin(u*Math.PI);
    for(const s of ['L','R']){m.rotate('UpperArm'+s,-1.72*reach);m.rotate('Forearm'+s,-.77*reach);}
    m.bones.Hips.position.y-=u*.30;m.rotate('Spine',.27*u);for(const s of ['L','R']){m.rotate('Thigh'+s,-.72*u);m.rotate('Shin'+s,1.23*u);}
  }
  if(sample.phase==='crawl'){
    m.bones.Hips.position.y-=.39;m.rotate('Spine',.88);m.rotate('Chest',.22);m.rotate('Head',-.24);
    for(const [i,s] of ['L','R'].entries()){const step=Math.sin(time*3+i*Math.PI);m.rotate('Thigh'+s,-1.1+step*.15);m.rotate('Shin'+s,1.50);m.rotate('UpperArm'+s,-.48-step*.13);m.rotate('Forearm'+s,-.28);}
  }
  if(sample.phase==='rest'){
    // Lower onto the slope rather than snapping a standing rig into a corpse.
    const u=sample.progress??1;actor.model.rotation.x=-Math.PI/2*u;actor.model.position.y=.17*u;
    m.bones.Hips.position.y-=.39*(1-u);m.rotate('Spine',.88*(1-u));m.rotate('Chest',.22*(1-u));
    for(const s of ['L','R']){m.rotate('Thigh'+s,-1.1*(1-u));m.rotate('Shin'+s,1.5*(1-u));}
    m.rotate('UpperArmL',-.10);m.rotate('UpperArmR',-.20);m.rotate('ShinR',.13);m.rotate('Head',.07);
  }
  if(actor.blendFrom){actor.blendTime+=dt;const w=ease(actor.blendTime/.6);for(const [n,b] of Object.entries(m.bones)){const from=actor.blendFrom[n];b.quaternion.copy(from.q.clone().slerp(b.quaternion,w));b.position.copy(from.p.clone().lerp(b.position,w));}if(w>=1)actor.blendFrom=null;}
  if(sample.phase==='clean'){
    // Solve the wiping hand against the actual sensor, so the cloth makes
    // contact instead of waving beside the camera in the live panorama.
    const envelope=Math.min(ease(sample.progress/.12),ease((1-sample.progress)/.12)),upper=m.bones.UpperArmR,fore=m.bones.ForearmR,hand=m.bones.HandR;
    actor.model.updateWorldMatrix(true,true);
    const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=fore.getWorldPosition(new THREE.Vector3()),wrist=hand.getWorldPosition(new THREE.Vector3()),a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist);
    const target=topPoint(26+Math.sin(time*2.6)*.08,groundY(26,119)+1.84+Math.cos(time*2.6)*.045,118.03),goal=wrist.clone().lerp(target,envelope),delta=goal.clone().sub(shoulder),distance=clamp(delta.length(),.04,a+b-.001),direction=delta.normalize();
    const bend=new THREE.Vector3(-1,-.5,0).applyQuaternion(actor.model.getWorldQuaternion(new THREE.Quaternion()));bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const along=(a*a-b*b+distance*distance)/(2*distance),lift=Math.sqrt(Math.max(0,a*a-along*along));
    m.aim(upper,fore,shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,lift));m.aim(fore,hand,shoulder.clone().addScaledVector(direction,distance));m.setWorldQuaternion(hand,actor.model.getWorldQuaternion(new THREE.Quaternion()));
  }
  actor.model.updateWorldMatrix(true,true);
  actor.model.traverse(o=>{if(o.isSkinnedMesh&&Array.isArray(o.material))o.material[1].visible=!(time>61);});
  actor.cloth.visible=sample.phase==='clean';
}

export class CafeteriaOpening{
  constructor(world,{complete=false,onChange=()=>{}}={}){
    this.world=world;this.surface=world.surface;this.onChange=onChange;this.state=complete?'explore':'find-book';this.time=complete?OPENING_DURATION:0;this.hasBook=complete;this.focus=false;this.phase='';
    this.book=createDirectoryBook(world.m);world.scene.add(this.book);
    this.cleaners=['holston','allison'].map(id=>{
      const def=RESIDENT_CAST.find(d=>d.id===id),actor=createResident(def,{suit:true});
      const cloth=new THREE.Mesh(new THREE.BoxGeometry(.15,.19,.012),world.m.linen);cloth.name='cleaning-cloth';cloth.position.set(0,-.075,.032);actor.motion.bones.HandR.add(cloth);actor.cloth=cloth;
      actor.feed=clone(actor.root);actor.feedBones=[];actor.bones=[];actor.root.traverse(o=>{if(o.isBone)actor.bones.push(o);});actor.feed.traverse(o=>{if(o.isBone)actor.feedBones.push(o);});
      this.surface.root.add(actor.root);this.surface.feedRoot.add(actor.feed);return actor;
    });
    // The dropped helmet remains an object on the real slope and the feed.
    const helmet=new THREE.Group();helmet.name='holston-discarded-helmet';const shell=new THREE.Mesh(new THREE.SphereGeometry(.175,20,14),world.m.linen);shell.scale.set(1,1.08,.88);helmet.add(shell);const visor=new THREE.Mesh(new THREE.SphereGeometry(.145,20,12),world.m.darkMetal);visor.scale.set(1,.85,.3);visor.position.z=.11;helmet.add(visor);this.helmet=helmet;this.helmetFeed=helmet.clone(true);this.surface.root.add(helmet);this.surface.feedRoot.add(this.helmetFeed);
    this.sample(0);this.update(0);
  }
  get watching(){return this.state==='watch';}
  get directoryReady(){return this.state==='read-book'||this.state==='explore';}
  reset(){this.state='find-book';this.time=0;this.hasBook=false;this.focus=false;this.surface.cleanliness=.28;this.surface.cleaning=false;this.surface.storyActive=false;for(const a of this.cleaners){a.lastPhase=null;a.blendFrom=null;a.motion.reset();}this.sample(0);this.onChange(this.state);}
  takeBook(){if(this.state!=='find-book')return false;this.hasBook=true;this.state='watch';this.time=0;this.surface.storyActive=true;this.onChange(this.state);return true;}
  finish(){this.state='read-book';this.time=OPENING_DURATION;this.focus=false;this.surface.storyActive=false;this.hasBook=true;this.sample(0);this.onChange(this.state);}
  openBook(){if(!this.directoryReady)return false;this.state='explore';this.onChange(this.state);return true;}
  sample(dt){
    const [holston,allison]=this.cleaners,sample=cleaningSample(this.time);
    posedCleaner(holston,sample,this.time,dt);holston.root.visible=this.hasBook;
    posedCleaner(allison,{phase:'rest',position:at(45.35,72.8),heading:0,progress:1,speed:0},0,0);allison.cloth.visible=false;
    if(this.watching||this.directoryReady)this.surface.cleanliness=this.time<10?.28:this.time<22?lerp(.28,1,(this.time-10)/12):1;
    this.helmet.visible=this.time>61&&this.hasBook;this.helmet.position.copy(at(43.55,77.1)).add(new THREE.Vector3(0,.18,0));this.helmet.rotation.set(.4,.8,1.3);this.helmetFeed.visible=this.helmet.visible;this.helmetFeed.position.copy(this.helmet.position);this.helmetFeed.quaternion.copy(this.helmet.quaternion);
    for(const actor of this.cleaners){
      actor.feed.visible=actor.root.visible;actor.feed.position.copy(actor.root.position);actor.feed.quaternion.copy(actor.root.quaternion);
      const feedModel=actor.feed.children[0];feedModel.position.copy(actor.model.position);feedModel.quaternion.copy(actor.model.quaternion);
      for(let i=0;i<actor.bones.length;i++){const b=actor.bones[i],f=actor.feedBones[i];f.position.copy(b.position);f.quaternion.copy(b.quaternion);}
      actor.feed.getObjectByName('cleaning-cloth').visible=actor.cloth.visible;actor.root.updateMatrixWorld(true);actor.feed.updateMatrixWorld(true);
    }
    if(this.phase!==sample.phase){this.phase=sample.phase;if(this.watching)this.onChange(this.state);}
  }
  update(dt){
    if(this.watching){this.time=Math.min(OPENING_DURATION,this.time+dt);this.sample(dt);if(this.time>=OPENING_DURATION-1e-7)this.finish();}
    this.book.visible=!this.hasBook&&!this.world.special&&this.world.activeLevel===1;
    this.world.storyInteractions=this.book.visible?[{position:topPoint(...BOOK_POSITION),label:'Pick up the directory book',action:'opening-book'}]:[];
  }
}
