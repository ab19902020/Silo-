import * as THREE from '../vendor/three.module.js';
import { Kit } from './kit.js';
import { JOBS } from './workday.js';

// Attach to existing bones, without changing the other agent's character rigs.
const templates=new WeakMap();
function make(m,kind){
  let cache=templates.get(m);if(!cache)templates.set(m,cache=new Map());if(cache.has(kind))return cache.get(kind);
  const k=new Kit(m);
  if(kind==='pack'){
    k.bevel('fabric',0,0,0,.49,.68,.29);k.bevel('linen',0,.35,-.01,.48,.12,.31);
    for(const x of [-.17,.17]){k.box('hide',x,0,-.155,.038,.69,.022);k.box('brass',x,-.17,-.174,.065,.045,.013);k.box('hide',x,.02,.21,.045,.63,.026);}
    k.bevel('fabric',0,-.20,-.20,.34,.23,.13);k.box('paper',.05,.12,-.153,.14,.085,.008);
    for(const x of [-.26,.26])k.cylinder('darkMetal',x,-.02,.035,.014,.69);
  }else if(kind==='parcel'){
    // A tied carrier: the parcel hangs below its grip instead of enclosing the
    // wrist. The body is offset outwards, clear of the trousers and fingers.
    k.bevel('paper',-.024,-.185,0,.14,.12,.23);
    for(const z of [-.072,.072]){
      k.box('hide',-.024,-.123,z,.145,.007,.014);
      k.beam('hide',[-.079,-.123,z],[0,-.010,z],.010);
      k.beam('hide',[.031,-.123,z],[0,-.010,z],.010);
    }
    k.cylinder('hide',0,-.010,0,.010,.165,Math.PI/2);
    k.box('paper',-.096,-.179,.019,.003,.046,.072);
  }
  else if(kind==='spanner'){k.box('metal',0,-.05,0,.025,.20,.012);k.box('metal',0,.06,0,.07,.025,.015);for(const x of [-.027,.027])k.box('metal',x,.08,0,.015,.04,.015);}
  else if(kind==='clipboard'){k.box('wood',0,-.055,.005,.16,.23,.014);k.box('paper',0,-.055,-.005,.145,.205,.004);k.box('metal',0,.061,-.013,.06,.023,.012);}
  else if(kind==='cloth')k.box('linen',0,-.035,0,.14,.10,.012);
  else if(kind==='cup'){k.cylinder('enamel',0,0,0,.043,.095);k.cylinder('darkMetal',0,.049,0,.035,.003);}
  else if(kind==='tray'){k.box('metal',0,0,0,.30,.015,.23);k.cylinder('enamel',.04,.015,0,.075,.016);}
  else {
    // A shallow open linen carrier hangs from its handle, below the hand.
    k.box('wood',0,-.24,0,.25,.018,.23);
    for(const x of [-.12,.12])k.box('wood',x,-.17,0,.015,.14,.23);
    for(const z of [-.11,.11])k.box('wood',0,-.17,z,.25,.14,.015);
    for(let i=0;i<3;i++)k.bevel('linen',0,-.215+i*.031,0,.19,.028,.17);
    for(const x of [-.11,.11])k.cylinder('hide',x,-.055,0,.012,.15);
    k.box('hide',0,.019,0,.235,.023,.026);
  }
  const group=k.group([new THREE.Matrix4()],true);group.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.userData.ownedGeometry=false;}});cache.set(kind,group);return group;
}
export function attachWorkProps(actor,materials,roster){
  const root=new THREE.Group();root.name='work-equipment';actor.workEquipment=root;
  const hand=actor.motion.bones.HandR;hand.add(root);actor.workTool=roster.tool||JOBS[roster.job].tool;
  // Equipment sockets use the same stature as the hand, rather than a fixed
  // world-size prop centred on its wrist joint.
  const scale=actor.motion.rest.Hips.point.y/.91;actor.workPropScale=scale;
  actor.workTools={};for(const kind of new Set([(roster.tool||JOBS[roster.job].tool),'cup','clipboard'])){const p=make(materials,kind).clone(true);p.name='work-'+kind;p.visible=false;root.add(p);actor.workTools[kind]=p;if(kind==='parcel'||kind==='basket')p.scale.setScalar(scale);}
  if(roster.job==='porter'){
    const pack=make(materials,'pack').clone(true);pack.name='porter-delivery-pack';pack.position.set(0,.04,-.27);actor.motion.bones.Spine.add(pack);actor.deliveryPack=pack;
  }
}
export function showWorkProps(actor,roster,state,working,loaded=true){
  if(!actor.workTools)return;
  const carrying=roster.job==='porter'&&state.onDuty&&loaded;
  const kind=state.phase==='break'||state.phase==='meal'?'cup':(carrying||state.onDuty&&working)?(roster.tool||JOBS[roster.job].tool):null;
  for(const [name,p] of Object.entries(actor.workTools))p.visible=name===kind;
  if(actor.deliveryPack){actor.deliveryPack.visible=state.onRoute||state.onDuty||state.phase==='errand';actor.deliveryPack.scale.z=loaded?1:.58;}
}

export function deliveryCounter(materials){
  const k=new Kit(materials);
  k.bevel('wood',0,.82,0,.80,.09,.88);
  for(const x of [-.30,.30])for(const z of [-.32,.32])k.box('metal',x,.40,z,.045,.8,.045);
  k.box('wood',0,.24,0,.69,.055,.75);
  k.box('paper',-.18,.87,.20,.25,.007,.19);k.box('metal',-.18,.878,.28,.15,.009,.018);
  const root=k.group([new THREE.Matrix4()],true);root.name='porter-dispatch-counter';
  const parcel=make(materials,'parcel').clone(true);parcel.position.set(.06,1.195,-.10);parcel.scale.setScalar(1.3);root.add(parcel);root.userData.parcel=parcel;return root;
}

// Called after activity blending. The shoulder gives the load space, fingers
// close around its handle, and gravity keeps the parcel upright through turns.
export function updateWorkGrip(actor,dt=1/60){
 const parcel=actor.workTools?.parcel?.visible?actor.workTools.parcel:actor.workTools?.basket?.visible?actor.workTools.basket:actor.activeWorkCarrier;if(!parcel)return;actor.activeWorkCarrier=parcel;
 actor.parcelGripMix=THREE.MathUtils.damp(actor.parcelGripMix||0,parcel.visible?1:0,16,dt);const mix=actor.parcelGripMix;if(mix<.001)return;
 const m=actor.motion,scale=actor.workPropScale||1;
 const upper=m.bones.UpperArmR,forearm=m.bones.ForearmR;
 const sway=Math.sin(m.time*3)*.045;
 const upperQ=m.rest.UpperArmR.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),parcel.name==='work-basket'?-.28:-.20)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),sway));
 upper.quaternion.slerp(upperQ,mix);const forearmQ=m.rest.ForearmR.q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-.13));forearm.quaternion.slerp(forearmQ,mix);
 actor.model.updateWorldMatrix(true,true);m.relaxHand('R',0,mix);
 const frame=actor.model.userData.handFrames?.R;
 if(frame){const axis=new THREE.Vector3(1,0,0).applyQuaternion(new THREE.Quaternion().fromArray(frame.quaternion));m.rotate('FingersR',-.72*mix,axis);m.rotate('FingerTipsR',-.62*mix,axis);}
 actor.model.updateWorldMatrix(true,true);
 // The palm is below the wrist in bind space. This point follows the same
 // hand bone as its skin, including the common hand-frame correction.
 const socket=new THREE.Vector3(-.006,-.053,.007).multiplyScalar(scale);
 parcel.position.copy(socket);
 parcel.quaternion.copy(actor.workEquipment.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(actor.root.getWorldQuaternion(new THREE.Quaternion()));
 parcel.updateWorldMatrix(false,true);
}
