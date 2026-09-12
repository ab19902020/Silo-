import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { SILO, levelY } from './data.js';
import { SkeletalMotion } from './locomotion.js';
import { RESIDENT_CAST } from './resident-data.js';
import { createResident } from './resident-model.js';
import {calibrateAnkles} from './rig-calibration.js';
import {gaitStyle} from './captured-motion.js';

export const CHARACTERS=Object.freeze([
  {id:'juliette',name:'Juliette Nichols',short:'Juliette',role:'Mechanical · engineer',level:144,wing:1,place:'Walker’s workshop',height:1.73},
  {id:'sims',name:'Robert Sims',short:'Sims',role:'Judicial · security',level:14,wing:0,place:'Judicial',height:1.83},
  {id:'bernard',name:'Bernard Holland',short:'Bernard',role:'Head of IT · acting mayor',level:19,wing:2,place:'IT administration',height:1.87},
]);
export const PLAYABLE_CHARACTERS=Object.freeze([...CHARACTERS,...RESIDENT_CAST.filter(d=>!d.story).map(d=>({...d,generated:true,short:d.name.split(' ')[0],place:d.role}))]);
export function roomPoint(level,wing,x,z){const a=wing*Math.PI/3;return new THREE.Vector3(Math.cos(a)*(SILO.deckOuter+z)+Math.sin(a)*x,levelY(level),Math.sin(a)*(SILO.deckOuter+z)-Math.cos(a)*x);}
export const forwardYaw=(x,z)=>Math.atan2(x,z); // Supplied bodies face +Z.

// The three supplied bodies are generated shells and none of them is
// watertight. `node scripts/mesh-report.mjs` on the shipped files: 47% of
// Sims' edges and 52% of Bernard's have only one triangle on them, against
// 18% of Juliette's — she is the one that looks right. Most of that is
// invisible —
// a missing front face still shows the inside of the back through it, which
// is what DoubleSide below is for, and it alone takes Bernard from 6.4% of
// his torso see-through to 0.64%. The rest is where the surface is missing on
// both sides and the room shows straight through the man.
//
// There is no repairing 90,000 triangles of that here, so the gaps are backed
// instead of closed: the same skinned geometry is drawn a second time six
// millimetres inside the surface, which puts a garment-coloured layer behind
// every hole. Six millimetres is enough that a hole in the outer shell and
// the matching hole in the lining no longer line up along the view ray, and
// little enough that the lining stays inside a finger. It reads the same
// texture at the same UV, so what shows through a pinhole is the colour that
// should have been there rather than a dark speck.
//
// Measured on a 900px close-up of the torso: Bernard 0.64% -> 0.05% of the
// figure see-through, Sims 0.23% -> 0.03%.
const LINING_INSET=.006;
function liningFor(mesh){
  const source=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
  // Unlit and map-only: it is never seen except through a pinhole, so it
  // costs one texture fetch rather than a second full shading pass. The grey
  // stands in for being six millimetres inside a garment.
  const material=new THREE.MeshBasicMaterial({map:source.map||null,color:new THREE.Color(.42,.42,.43),side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uInset={value:LINING_INSET};
    // Placed straight after begin_vertex, which is before skinning_vertex, so
    // the inset is applied in bind space and the skin then carries it. Offset
    // after skinning and it would be rotated twice and drift under animation.
    shader.vertexShader='uniform float uInset;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n\ttransformed -= normal * uInset;');
  };
  const lining=new THREE.SkinnedMesh(mesh.geometry,material);
  lining.bind(mesh.skeleton,mesh.bindMatrix);
  lining.name=`${mesh.name}-lining`;
  lining.frustumCulled=false;lining.renderOrder=-1;
  lining.castShadow=lining.receiveShadow=false;   // the outer shell already casts it
  return lining;
}

export function actorFrom(gltf,definition){
  const root=new THREE.Group();root.name=definition.id;const model=gltf.scene;root.add(model);const meshes=[],bones=[];
  calibrateAnkles(model,definition.height);model.userData.gaitStyle=gaitStyle(definition.id);
  model.traverse(o=>{if(o.isMesh){
    o.castShadow=o.receiveShadow=true;o.frustumCulled=false;
    // The scanned coat hems are thin shells. Culling their reverse faces
    // punches holes through Sims and Bernard as the cloth turns in motion.
    const solid=material=>{const m=material.clone();m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;m.transparent=false;m.opacity=1;m.alphaTest=0;m.depthTest=true;m.depthWrite=true;if(m.isMeshStandardMaterial){m.roughness=THREE.MathUtils.clamp(m.roughness,.55,.92);m.metalness=Math.min(m.metalness,.12);m.envMapIntensity=.9;}if(m.map)m.map.anisotropy=8;m.needsUpdate=true;return m;};
    o.material=Array.isArray(o.material)?o.material.map(solid):solid(o.material);meshes.push(o);
  }if(o.isBone)bones.push(o);});
  // Added after the walk so the linings are not themselves given linings, and
  // before the feed is cloned so the outside camera shows the same solid body.
  for(const mesh of meshes)if(mesh.isSkinnedMesh)mesh.parent.add(liningFor(mesh));
  if(!meshes.some(o=>o.isSkinnedMesh))throw Error(`${definition.name} is missing its skeleton`);
  for(const name of ['Idle','Walk','Run'])if(!gltf.animations.some(c=>c.name===name))throw Error(`${definition.name}: missing ${name}`);
  const motion=new SkeletalMotion(model,definition.height),feed=clone(root);feed.name=`cleaner-${definition.id}`;const feedBones=[];feed.traverse(o=>{if(o.isBone)feedBones.push(o);});feed.visible=false;
  return {definition,root,model,meshes,bones,feed,feedBones,motion,state:'Idle',heading:0,visualY:null,post:roomPoint(definition.level,definition.wing,2.8,5.5)};
}
export class CharacterCast{
  constructor(scene,world){this.scene=scene;this.world=world;this.actors=new Map();this.selected='juliette';this.thirdPerson=true;this.relic=null;}
  async load(onProgress=()=>{}){
    const loader=new GLTFLoader();let count=0;
    await Promise.all(CHARACTERS.map(async d=>{const gltf=await loader.loadAsync(new URL(`../assets/characters/${d.id}.glb`,import.meta.url).href),actor=actorFrom(gltf,d);this.actors.set(d.id,actor);this.scene.add(actor.root);this.world.surface.feedScene.add(actor.feed);onProgress(++count/4);}));
    for(const d of PLAYABLE_CHARACTERS.filter(d=>d.generated)){
      const actor=createResident(d);actor.meshes=[];actor.bones=[];actor.model.traverse(o=>{if(o.isMesh)actor.meshes.push(o);if(o.isBone)actor.bones.push(o);});actor.feed=clone(actor.root);actor.feedBones=[];actor.feed.traverse(o=>{if(o.isBone)actor.feedBones.push(o);});actor.feed.visible=false;actor.state='Idle';actor.heading=0;actor.visualY=null;actor.post=roomPoint(d.level,d.wing,2.8,5.5);this.actors.set(d.id,actor);this.scene.add(actor.root);this.world.surface.feedScene.add(actor.feed);
    }
    const relic=await loader.loadAsync(new URL('../assets/characters/hard-drive-relic.glb',import.meta.url).href);this.relic=new THREE.Group();this.relic.add(relic.scene);this.relic.name='Hard drive relic';this.relic.rotation.order='YXZ';this.relic.rotation.x=-Math.PI/2;this.relic.rotation.y=Math.PI/2-Math.PI/3;this.relic.position.copy(roomPoint(144,1,-5.28,5.48));this.relic.position.y+=.863;this.relic.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});this.scene.add(this.relic);onProgress(1);
  }
  select(id){if(!this.actors.has(id))return false;this.selected=id;this.active.motion.reset();this.active.visualY=null;return true;}
  get active(){return this.actors.get(this.selected);}
  update(dt,body,started=true){
    const speed=body.horizontalSpeed;this.world.actorInteractions=[];
    for(const a of this.actors.values()){
      const selected=a.definition.id===this.selected,near=!this.world.special&&this.world.activeLevel===a.definition.level;
      if(a.definition.generated&&!selected){a.root.visible=a.feed.visible=false;continue;}
      if(selected){
        if(a.visualY===null||a.root.position.distanceTo(body.position)>2.5){a.visualY=body.position.y;a.motion.reset();}
        a.visualY=THREE.MathUtils.damp(a.visualY,body.position.y,22,dt);a.root.position.copy(body.position);a.root.position.y=a.visualY;
        if(body.climbing)a.heading=body.climbing.heading;
        else if(speed>.035){const goal=forwardYaw(body.velocity.x,body.velocity.z),delta=Math.atan2(Math.sin(goal-a.heading),Math.cos(goal-a.heading)),limit=(speed>2.6?7:5)*dt;a.heading+=THREE.MathUtils.clamp(delta*(1-Math.exp(-11*dt)),-limit,limit);}
        a.root.rotation.y=a.heading;a.root.updateMatrixWorld(true);
        const ground=(x,z)=>{const f=this.world.colliders.floorAt(x,z,.035,body.position.y+.35);return Number.isFinite(f)&&Math.abs(f-body.position.y)<.48?f:body.position.y;};
        if(body.climbing){a.motion.climb(body.climbing);a.state='Climb';}
        else {if(a.state==='Climb')a.motion.reset();a.motion.update(dt,{speed:started?speed:0,position:body.position,grounded:body.grounded,heading:a.heading,ground,active:started,impact:body.landingImpact||0});a.state=a.motion.state;}
        a.root.visible=started&&this.thirdPerson;
      }else{
        a.root.position.copy(a.post);a.root.rotation.y=-a.definition.wing*Math.PI/3-Math.PI/2;a.root.updateMatrixWorld(true);if(near)a.motion.update(dt,{position:a.post,active:false});a.state='Idle';a.root.visible=near;
        if(near){const p=a.root.position.clone();p.y+=1.3;this.world.actorInteractions.push({position:p,label:`Talk to ${a.definition.name}`,action:`person-${a.definition.id}`,resident:a.definition});}
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
    const direction=new THREE.Vector3();camera.getWorldDirection(direction);const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),target=body.position.clone().add(new THREE.Vector3(0,1.43,0));
    const end=target.clone().addScaledVector(direction,-3.4).addScaledVector(right,.42),delta=end.clone().sub(target),length=delta.length();let allowed=length;
    for(let d=.12;d<=length;d+=.08){const p=target.clone().addScaledVector(delta,d/length);if(this.world.colliders.contains(p.x,p.z,.17,p.y-.17,p.y+.17)||p.y<body.position.y+.18){allowed=Math.max(0,d-.16);break;}}
    camera.position.copy(target).addScaledVector(delta,allowed/length);
    // Hide the complete avatar only when the camera reaches its volume. Never
    // leave the near plane slicing the broader coats into a partial body.
    if(this.active)this.active.root.visible=allowed>1.0;
  }
}
