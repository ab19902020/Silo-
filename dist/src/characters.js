import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { SILO, levelY } from './data.js';
import { RESIDENT_CAST } from './resident-data.js';
import { LEAD_CAST, EXTENDED_CAST } from './tv-cast.js';
import { SUPPORTING_CAST } from './tv-supporting-cast.js';
import { createResident, disposeResident } from './resident-model.js';

export const CHARACTERS=LEAD_CAST;
export const PLAYABLE_CHARACTERS=Object.freeze([...RESIDENT_CAST,...EXTENDED_CAST,...SUPPORTING_CAST].map(d=>({...d,generated:true,season:d.season||1,origin:d.origin||'Silo 18',short:d.name.split(' ')[0],place:d.role})));
export function roomPoint(level,wing,x,z){const a=wing*Math.PI/3;return new THREE.Vector3(Math.cos(a)*(SILO.deckOuter+z)+Math.sin(a)*x,levelY(level),Math.sin(a)*(SILO.deckOuter+z)-Math.cos(a)*x);}
export const forwardYaw=(x,z)=>Math.atan2(x,z);
export function createPlayableActor(definition){
 const actor=createResident(definition,{cache:false});actor.meshes=[];actor.bones=[];
 actor.model.traverse(o=>{if(o.isMesh)actor.meshes.push(o);if(o.isBone)actor.bones.push(o);});
 actor.feed=clone(actor.root);actor.feedBones=[];actor.feed.traverse(o=>{if(o.isBone)actor.feedBones.push(o);});actor.feed.visible=false;
 actor.state='Idle';actor.heading=0;actor.visualY=null;actor.post=roomPoint(definition.level,definition.wing,2.8,5.5);return actor;
}
export class CharacterCast{
  constructor(scene,world){this.scene=scene;this.world=world;this.actors=new Map();this.selected='juliette';this.thirdPerson=true;this.relic=null;this.definitions=new Map(PLAYABLE_CHARACTERS.map(d=>[d.id,d]));}
  async load(onProgress=()=>{}){
    const loader=new GLTFLoader();this.select('juliette');onProgress(.5);
    const relic=await loader.loadAsync(new URL('../assets/characters/hard-drive-relic.glb',import.meta.url).href);this.relic=new THREE.Group();this.relic.add(relic.scene);this.relic.name='Hard drive relic';this.relic.rotation.order='YXZ';this.relic.rotation.x=-Math.PI/2;this.relic.rotation.y=Math.PI/2-Math.PI/3;this.relic.position.copy(roomPoint(144,1,-5.28,5.48));this.relic.position.y+=.863;this.relic.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});this.scene.add(this.relic);onProgress(1);
  }
  register(definition){this.definitions.set(definition.id,definition);}
  select(id){
    const definition=this.definitions.get(id);if(!definition)return false;
    if(this.active?.definition===definition)return true;
    // Build before releasing the current resident: a failed selection cannot
    // leave the player without a body. Only one playable avatar stays loaded.
    const next=createPlayableActor(definition);
    for(const actor of this.actors.values()){
      actor.feed.removeFromParent();actor.feed.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});disposeResident(actor);
    }
    this.actors.clear();this.actors.set(id,next);this.selected=id;
    this.scene.add(next.root);this.world.surface.feedScene.add(next.feed);return true;
  }
  get active(){return this.actors.get(this.selected);}
  update(dt,body,started=true){
    const speed=body.horizontalSpeed;this.world.actorInteractions=[];
    for(const a of this.actors.values()){
      const selected=a.definition.id===this.selected,near=!this.world.special&&this.world.activeLevel===a.definition.level;
      if(a.definition.generated&&!selected){a.root.visible=a.feed.visible=false;continue;}
      if(selected){
        if(a.workEquipment)a.workEquipment.visible=false;
        if(a.visualY===null||a.root.position.distanceTo(body.position)>2.5){a.visualY=body.position.y;a.motion.reset();}
        a.visualY=THREE.MathUtils.damp(a.visualY,body.position.y,22,dt);a.root.position.copy(body.position);a.root.position.y=a.visualY;
        if(body.climbing)a.heading=body.climbing.heading;
        else if(speed>.035){const goal=forwardYaw(body.velocity.x,body.velocity.z),delta=Math.atan2(Math.sin(goal-a.heading),Math.cos(goal-a.heading)),limit=(speed>2.6?7:5)*dt;a.heading+=THREE.MathUtils.clamp(delta*(1-Math.exp(-11*dt)),-limit,limit);}
        a.root.rotation.y=a.heading;a.root.updateMatrixWorld(true);
        const ground=(x,z)=>{const f=this.world.colliders.floorAt(x,z,.035,body.position.y+.35);return Number.isFinite(f)&&Math.abs(f-body.position.y)<.48?f:body.position.y;};
        if(body.climbing){a.motion.climb(body.climbing);a.state='Climb';}
        else {if(a.state==='Climb')a.motion.reset();a.motion.update(dt,{speed:started?speed:0,position:body.position,grounded:body.grounded,heading:a.heading,ground,active:started,impact:body.landingImpact||0});a.state=a.motion.state;}
        a.root.visible=started&&this.thirdPerson;
      }
      a.root.updateMatrixWorld(true);a.feed.visible=selected&&this.world.outside&&started;
      if(a.feed.visible){a.feed.position.copy(a.root.position);a.feed.quaternion.copy(a.root.quaternion);for(let i=0;i<a.bones.length;i++){const b=a.bones[i],f=a.feedBones[i];f.position.copy(b.position);f.quaternion.copy(b.quaternion);f.scale.copy(b.scale);}a.feed.updateMatrixWorld(true);}
    }
    if(this.relic){
      const story=this.world.story;
      if(story?.story){this.relic.position.set(68.5,12.92,6.6);this.relic.visible=this.world.special==='excavator'&&story.visible('harddrive');}
      else {this.relic.position.copy(roomPoint(144,1,-5.28,5.48));this.relic.position.y+=.863;this.relic.visible=!this.world.special&&this.world.activeLevel===144;}
      if(this.relic.visible)this.world.actorInteractions.push({position:this.relic.position.clone(),label:story?.story?'Take Hard Drive 18':'Inspect the hard-drive relic',action:'hard-drive'});
    }
  }
  setCamera(camera,body,yaw,pitch,bob=0){
    camera.rotation.set(pitch,yaw,0,'YXZ');const eye=body.position.clone().add(new THREE.Vector3(0,body.eyeHeight+bob,0));
    if(!this.thirdPerson){camera.position.copy(eye);return;}
    const direction=new THREE.Vector3();camera.getWorldDirection(direction);const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),target=body.position.clone().add(new THREE.Vector3(0,body.standHeight*.81,0));
    const end=target.clone().addScaledVector(direction,-3.4).addScaledVector(right,.42),delta=end.clone().sub(target),length=delta.length();let allowed=length;
    for(let d=.12;d<=length;d+=.08){const p=target.clone().addScaledVector(delta,d/length);if(this.world.colliders.contains(p.x,p.z,.17,p.y-.17,p.y+.17)||p.y<body.position.y+.18){allowed=Math.max(0,d-.16);break;}}
    camera.position.copy(target).addScaledVector(delta,allowed/length);
    // Hide the complete avatar only when the camera reaches its volume. Never
    // leave the near plane slicing the broader coats into a partial body.
    if(this.active)this.active.root.visible=allowed>1.0;
  }
}
