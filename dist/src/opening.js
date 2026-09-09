import * as THREE from '../vendor/three.module.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { RESIDENT_CAST } from './resident-data.js';
import { createResident, poseResident } from './resident-model.js';
import { topPoint, topLocal, groundY, surfaceY, sensorLocal } from './surface.js';
import { Kit, addSign } from './kit.js';

export const OPENING_DURATION=90;
// The frame the suit's own helmet is hidden and the loose one takes over.
export const HELMET_OFF=63.2;
// The book is on a front table, one row back from the great screen, and you
// start at that table. From here the whole 30 m display is in front of you, so
// the cleaning can be watched from inside the room, standing where the rest of
// the silo is standing, rather than from a camera bolted to the picture.
export const BOOK_POSITION=Object.freeze([2,.855,32]);
export const CAFETERIA_START=Object.freeze([2,0,29.7]);
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp,ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const at=(x,z)=>new THREE.Vector3(x,surfaceY(x,z),z);
const followGround=p=>{p.y=surfaceY(p.x,p.z);return p;};
const UP=new THREE.Vector3(0,1,0);
// The slope under the tree runs at about one in four. A body laid out flat on
// the horizontal is buried to the shoulder at the uphill end, so anything that
// lies down here is laid along the ground's own normal instead.
function groundNormal(x,z,e=.6){
  return new THREE.Vector3(-(groundY(x+e,z)-groundY(x-e,z))/(2*e),1,-(groundY(x,z+e)-groundY(x,z-e))/(2*e)).normalize();
}
// The one dead tree stands on the crater's near shoulder, and Allison has been
// lying at the foot of it since her own cleaning. Holston climbs the slope to
// her, gets the helmet off, goes down, and drags himself the last four metres.
// The beats are cut against the opening piece; the note below the cast list
// gives the timings that decision rests on.
export const ALLISON_REST=Object.freeze([-4,153.4]);
export const REST_HEADING=.36;
export const HOLSTON_REST=Object.freeze([ALLISON_REST[0]+Math.cos(REST_HEADING)*.70,ALLISON_REST[1]-Math.sin(REST_HEADING)*.70]);
// The scene is cut against assets/audio/silo-18-opening.mp3, which starts on
// the frame the book is picked up. Measured off that file: spoken word runs to
// about 0:54, the score is established by 0:57, its loudest bar is 1:19 and a
// second swell runs 1:27-1:29. So the climb out, the clean and the long walk up
// the hill all play under the speech; the score arrives as he reaches the tree
// and the helmet comes off; the peak lands as he drags himself the last few
// metres to her; and the swell is on him going still. Retime one and you have
// to retime the other.
// Where he stands to be seen, and where he steps in to reach the glass. The
// sensor sits at eye height and looks slightly up, so a man closer than 1.8 m
// is entirely below the frame: he used to do the whole clean from 44 cm away,
// which is why the cafeteria screen showed an empty hillside wiping itself.
// From 2.6 m the helmet and shoulders are in shot, and stepping in to 60 cm
// fills the picture with the suit and puts the rag across the lens.
export const CLEAN_STAND=Object.freeze([20.5,102.5]),CLEAN_REACH=Object.freeze([20.5,100.42]);
export function cleaningSample(time){
  const t=clamp(time,0,OPENING_DURATION),entry=at(26,100),lip=at(26,110.2),corner=at(20.2,110.2),lens=at(...CLEAN_STAND),reach=at(...CLEAN_REACH),slope=at(-.6,149.1),beside=at(...HOLSTON_REST);
  // The sensor is behind the hatch. He emerges away from it, turns, and walks
  // around the curb before approaching the lens. No backwards walking or
  // scripted shortcut across the hole in the ramp.
  if(t<8)return {phase:'emerge',position:followGround(entry.lerp(lip,t/8)),heading:0,speed:1.275};
  if(t<9)return {phase:'approach',position:lip,heading:-Math.PI/2*ease(t-8),speed:0};
  if(t<12.5)return {phase:'approach',position:followGround(lip.lerp(corner,(t-9)/3.5)),heading:-Math.PI/2,speed:1.657};
  if(t<13.5)return {phase:'approach',position:corner,heading:-Math.PI/2-Math.PI/2*ease(t-12.5),speed:0};
  if(t<18)return {phase:'approach',position:followGround(corner.lerp(lens,(t-13.5)/4.5)),heading:-Math.PI,speed:2.18};
  if(t<27){
    // He steps in over the first second and back out over the last, so the
    // music beats stay where they are and the wipe still happens up close.
    const progress=(t-18)/9,close=Math.min(ease(progress/.20),ease((1-progress)/.20));
    return {phase:'clean',position:followGround(lens.clone().lerp(reach,close)),heading:-Math.PI,progress,speed:close>.02&&close<.98?1.15:0};
  }
  const heading=Math.atan2(slope.x-lens.x,slope.z-lens.z);
  if(t<30)return {phase:'turn',position:lens,heading:-Math.PI+(heading+Math.PI)*ease((t-27)/3),speed:0};
  if(t<60)return {phase:'walk',position:followGround(lens.lerp(slope,(t-30)/30)),heading,speed:1.77};
  if(t<68)return {phase:'helmet',position:slope,heading,progress:(t-60)/8,speed:0};
  const finalHeading=Math.atan2(beside.x-slope.x,beside.z-slope.z);
  if(t<80)return {phase:'crawl',position:followGround(slope.lerp(beside,(t-68)/12)),heading:finalHeading,progress:(t-68)/12,speed:.39};
  return {phase:'rest',position:beside,heading:lerp(finalHeading,REST_HEADING,ease((t-80)/7)),progress:ease((t-80)/7),speed:0};
}

function settleOnSlope(actor){
  // Sample the visible skinned surface, including the backpack. A pelvis
  // height alone left the suit sunk into this uneven hillside.
  actor.root.updateWorldMatrix(true,false);actor.root.updateMatrixWorld(true);const point=new THREE.Vector3();let clearance=Infinity;
  actor.model.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    const g=mesh.geometry,groups=g.groups.length?g.groups:[{start:0,count:g.index.count,materialIndex:0}];
    for(const group of groups){if(Array.isArray(mesh.material)&&!mesh.material[group.materialIndex].visible)continue;
      for(let j=group.start;j<group.start+group.count;j+=29){mesh.getVertexPosition(g.index.getX(j),point);mesh.localToWorld(point);const p=topLocal(point);clearance=Math.min(clearance,p.y-groundY(p.x,p.z));}
    }
  });
  if(Number.isFinite(clearance))actor.model.position.y+=.015-clearance;
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
  const walking=sample.phase==='emerge'||sample.phase==='approach'||sample.phase==='walk';
  poseResident(actor,walking?'walk':'idle',time,dt,sample.speed);
  if(sample.phase==='clean'){
    const envelope=Math.min(ease((sample.progress-.16)/.12),ease((.84-sample.progress)/.12));
    m.rotate('Spine',.18*envelope);
    m.rotate('UpperArmR',-1.70*envelope+Math.sin(time*1.75)*.10*envelope);m.rotate('ForearmR',-.55*envelope);m.rotate('HandR',Math.sin(time*1.75)*.21*envelope);m.rotate('Head',-.04);
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
    // Lower onto the slope rather than snapping a standing rig into a corpse,
    // and settle onto the hillside's own plane rather than the horizontal.
    const u=sample.progress??1,normal=groundNormal(sample.position.x,sample.position.z).applyAxisAngle(UP,-sample.heading);
    const tilt=new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(UP,normal),u);
    actor.model.quaternion.copy(tilt).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2*u));
    m.bones.Hips.position.y-=.39*(1-u);m.rotate('Spine',.88*(1-u));m.rotate('Chest',.22*(1-u));
    for(const s of ['L','R']){m.rotate('Thigh'+s,-1.1*(1-u));m.rotate('Shin'+s,1.5*(1-u));}
    m.rotate('UpperArmL',-.10);m.rotate('ForearmL',-.28*u);m.rotate('UpperArmR',-.15);m.rotate('UpperArmR',-.30*u,new THREE.Vector3(0,0,1));m.rotate('ForearmR',-.16*u);m.rotate('ShinR',.13);m.rotate('Head',.07);m.rotate('Head',-.13*u,new THREE.Vector3(0,1,0));
  }
  if(actor.blendFrom){actor.blendTime+=dt;const w=ease(actor.blendTime/.6);for(const [n,b] of Object.entries(m.bones)){const from=actor.blendFrom[n];b.quaternion.copy(from.q.clone().slerp(b.quaternion,w));b.position.copy(from.p.clone().lerp(b.position,w));}if(w>=1)actor.blendFrom=null;}
  if(sample.phase==='rest'){
    const u=sample.progress??1,hip=m.bones.Hips.position.clone().applyQuaternion(actor.model.quaternion);
    // Rotate around the pelvis rather than sweeping a rigid body around its
    // feet. Both final bodies use the same heading and settle side by side.
    actor.model.position.set(-hip.x*u,lerp(m.bones.Hips.position.y,.32,u)-hip.y,-hip.z*u);
    if(u>.82){const before=actor.model.position.y;settleOnSlope(actor);actor.model.position.y=lerp(before,actor.model.position.y,ease((u-.82)/.18));}
  }
  if(sample.phase==='clean'){
    // Solve the wiping hand against the actual sensor, so the cloth makes
    // contact instead of waving beside the camera in the live panorama.
    const envelope=Math.min(ease((sample.progress-.16)/.12),ease((.84-sample.progress)/.12)),upper=m.bones.UpperArmR,fore=m.bones.ForearmR,hand=m.bones.HandR;
    actor.model.updateWorldMatrix(true,true);
    const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=fore.getWorldPosition(new THREE.Vector3()),wrist=hand.getWorldPosition(new THREE.Vector3()),a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist);
    // One stroke of the wipe. The hand crosses the glass and, at the middle of
    // the sweep, reaches up over the top of the housing and presses the rag
    // flat; at each end it drops and pulls away. The sensor's own lens is a
    // 24-degree slot, so a rag pressed a hand's width from it fills the entire
    // picture: the cafeteria screen blanks out for a moment on every pass,
    // which is the only way anyone inside can see how the cleaning is going.
    // The reach is deliberately at the limit of a 1.78 m man's arm — the lens
    // sits half a metre above his shoulder and he has to stretch for it.
    const stroke=time*1.75,across=Math.sin(stroke),press=Math.max(0,1-Math.abs(across)*2.4);
    const eye=sensorLocal(),target=topPoint(eye.x-across*.20,eye.y+.005+press*.035,eye.z+.140+(1-press)*.11),goal=wrist.clone().lerp(target,envelope),delta=goal.clone().sub(shoulder),distance=clamp(delta.length(),.04,a+b-.001),direction=delta.normalize();
    const bend=new THREE.Vector3(-1,-.5,0).applyQuaternion(actor.model.getWorldQuaternion(new THREE.Quaternion()));bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const along=(a*a-b*b+distance*distance)/(2*distance),lift=Math.sqrt(Math.max(0,a*a-along*along));
    m.aim(upper,fore,shoulder.clone().addScaledVector(direction,along).addScaledVector(bend,lift));m.aim(fore,hand,shoulder.clone().addScaledVector(direction,distance));m.setWorldQuaternion(hand,actor.model.getWorldQuaternion(new THREE.Quaternion()));
  }
  actor.model.updateWorldMatrix(true,true);
  actor.model.traverse(o=>{if(o.isSkinnedMesh&&Array.isArray(o.material))o.material.slice(1).forEach(material=>{material.visible=!(time>HELMET_OFF);});});
  actor.cloth.visible=sample.phase==='clean';
}

export class CafeteriaOpening{
  constructor(world,{complete=false,onChange=()=>{}}={}){
    this.world=world;this.surface=world.surface;this.onChange=onChange;this.state=complete?'explore':'find-book';this.time=complete?OPENING_DURATION:0;this.hasBook=complete;this.focus=false;this.phase='';
    this.book=createDirectoryBook(world.m);world.scene.add(this.book);
    this.cleaners=['holston','allison'].map(id=>{
      const def=RESIDENT_CAST.find(d=>d.id===id),actor=createResident(def,{suit:true});
      const cloth=new THREE.Mesh(new THREE.BoxGeometry(.28,.40,.014),world.m.linen);cloth.name='cleaning-cloth';cloth.position.set(0,-.06,.10);actor.motion.bones.HandR.add(cloth);actor.cloth=cloth;
      actor.feed=clone(actor.root);actor.feedBones=[];actor.bones=[];actor.root.traverse(o=>{if(o.isBone)actor.bones.push(o);});actor.feed.traverse(o=>{if(o.isBone)actor.feedBones.push(o);});
      this.surface.root.add(actor.root);this.surface.feedRoot.add(actor.feed);return actor;
    });
    // The dropped helmet remains an object on the real slope and the feed.
    const helmet=new THREE.Group();helmet.name='holston-discarded-helmet';
    const shell=new THREE.Mesh(new THREE.SphereGeometry(.152,22,16),world.m.linen);shell.scale.set(1,1.14,1.04);helmet.add(shell);
    const brow=new THREE.Mesh(new THREE.BoxGeometry(.232,.050,.074),world.m.linen);brow.position.set(0,.062,.106);helmet.add(brow);
    const plate=new THREE.Mesh(new THREE.SphereGeometry(.108,22,14),world.m.darkMetal);plate.scale.set(1,.62,.60);plate.position.z=.118;helmet.add(plate);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.114,.020,7,22),world.m.darkMetal);ring.rotation.x=Math.PI/2;ring.position.y=-.150;helmet.add(ring);
    this.helmet=helmet;this.helmetFeed=helmet.clone(true);this.surface.root.add(helmet);this.surface.feedRoot.add(this.helmetFeed);
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
    if(!allison.settled){posedCleaner(allison,{phase:'rest',position:at(...ALLISON_REST),heading:REST_HEADING,progress:1,speed:0},0,0);allison.cloth.visible=false;allison.settled=true;}
    if(this.watching||this.directoryReady)this.surface.cleanliness=this.time<18?.28:this.time<27?lerp(.28,1,(this.time-18)/9):1;
    // The helmet used to blink off his head and reappear on the ground four
    // metres away in the same frame. It comes off in his hands now: the moment
    // the suit's own helmet is hidden, this one takes its place at his head and
    // travels down to the slope, turning over as it goes.
    const rest=at(0,148.6).add(new THREE.Vector3(0,.17,0));
    this.helmet.visible=this.helmetFeed.visible=this.time>HELMET_OFF&&this.hasBook;
    if(this.helmet.visible){
      // He holds it for a second, in the hands that lifted it, and then puts
      // it down. Lerping straight from his head the moment it came off sent it
      // sailing away across the slope while his arms were still raised.
      const u=ease((this.time-HELMET_OFF-1.1)/2.0);
      const hand=holston.motion.bones.HandR.getWorldPosition(new THREE.Vector3());
      this.surface.root.worldToLocal(hand);
      const held=hand.add(new THREE.Vector3(0,-.10,.09).applyAxisAngle(UP,sample.heading));
      this.helmet.position.copy(held).lerp(rest,u);
      this.helmet.position.y+=Math.sin(u*Math.PI)*.06;
      this.helmet.rotation.set(.10+u*1.00,.06+u*.74,u*1.30);
    }
    this.helmetFeed.position.copy(this.helmet.position);this.helmetFeed.quaternion.copy(this.helmet.quaternion);
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
