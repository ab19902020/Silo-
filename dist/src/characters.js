import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { SILO, levelY } from './data.js';

export const CHARACTERS=Object.freeze([
  {id:'juliette',name:'Juliette Nichols',short:'Juliette',role:'Mechanical · engineer',level:144,wing:1,place:'Walker’s workshop',height:1.73},
  {id:'sims',name:'Robert Sims',short:'Sims',role:'Judicial · security',level:14,wing:0,place:'Judicial',height:1.83},
  {id:'bernard',name:'Bernard Holland',short:'Bernard',role:'Head of IT · acting mayor',level:19,wing:2,place:'IT administration',height:1.87},
]);
export function roomPoint(level,wing,x,z){const a=wing*Math.PI/3;return new THREE.Vector3(Math.cos(a)*(SILO.deckOuter+z)+Math.sin(a)*x,levelY(level),Math.sin(a)*(SILO.deckOuter+z)-Math.cos(a)*x);}
export const forwardYaw=(x,z)=>Math.atan2(x,z); // Supplied bodies face +Z.

function actorFrom(gltf,definition){
  const root=new THREE.Group();root.name=definition.id;const model=gltf.scene;root.add(model);const meshes=[],bones=[];
  model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;o.frustumCulled=false;meshes.push(o);}if(o.isBone)bones.push(o);});
  if(!meshes.some(o=>o.isSkinnedMesh))throw Error(`${definition.name} is missing its skeleton`);
  const mixer=new THREE.AnimationMixer(model),actions={};for(const name of ['Idle','Walk','Run']){const clip=gltf.animations.find(c=>c.name===name);if(!clip)throw Error(`${definition.name}: missing ${name}`);actions[name]=mixer.clipAction(clip);}
  actions.Idle.play();const feed=clone(root);feed.name=`cleaner-${definition.id}`;const feedBones=[];feed.traverse(o=>{if(o.isBone)feedBones.push(o);});feed.visible=false;
  return {definition,root,model,meshes,bones,feed,feedBones,mixer,actions,state:'Idle',heading:0,post:roomPoint(definition.level,definition.wing,2.8,5.5)};
}
export class CharacterCast{
  constructor(scene,world){this.scene=scene;this.world=world;this.actors=new Map();this.selected='juliette';this.thirdPerson=true;this.relic=null;}
  async load(onProgress=()=>{}){
    const loader=new GLTFLoader();let count=0;
    await Promise.all(CHARACTERS.map(async d=>{const gltf=await loader.loadAsync(new URL(`../assets/characters/${d.id}.glb`,import.meta.url).href),actor=actorFrom(gltf,d);this.actors.set(d.id,actor);this.scene.add(actor.root);this.world.surface.feedScene.add(actor.feed);onProgress(++count/4);}));
    const relic=await loader.loadAsync(new URL('../assets/characters/hard-drive-relic.glb',import.meta.url).href);this.relic=new THREE.Group();this.relic.add(relic.scene);this.relic.name='Hard drive relic';this.relic.rotation.order='YXZ';this.relic.rotation.x=-Math.PI/2;this.relic.rotation.y=Math.PI/2-Math.PI/3;this.relic.position.copy(roomPoint(144,1,-5.28,5.48));this.relic.position.y+=.863;this.relic.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;}});this.scene.add(this.relic);onProgress(1);
  }
  select(id){if(!this.actors.has(id))return false;this.selected=id;return true;}
  get active(){return this.actors.get(this.selected);}
  setAnimation(a,name,speed=0){
    if(name!==a.state){const prev=a.actions[a.state],next=a.actions[name];next.reset().play();next.crossFadeFrom(prev,.22,false);a.state=name;}
    const h=a.definition.height,stance=name==='Run'?.54:.60,reach=(name==='Run'?.23:.15)*h,duration=a.actions[name].getClip().duration;
    a.actions[name].timeScale=name==='Idle'?1:Math.max(.25,Math.min(3,speed*stance*duration/(2*reach)));
  }
  update(dt,body,started=true){
    const speed=body.horizontalSpeed;this.world.actorInteractions=[];
    for(const a of this.actors.values()){
      const selected=a.definition.id===this.selected,near=!this.world.special&&this.world.activeLevel===a.definition.level;
      if(selected){
        a.root.position.copy(body.position);if(speed>.08){const goal=forwardYaw(body.velocity.x,body.velocity.z),delta=Math.atan2(Math.sin(goal-a.heading),Math.cos(goal-a.heading));a.heading+=delta*(1-Math.exp(-18*dt));}
        a.root.rotation.y=a.heading;this.setAnimation(a,started&&speed>.08?(speed>2.6?'Run':'Walk'):'Idle',speed);a.root.visible=started&&this.thirdPerson;
      }else{
        a.root.position.copy(a.post);a.root.rotation.y=-a.definition.wing*Math.PI/3-Math.PI/2;this.setAnimation(a,'Idle');a.root.visible=near;
        if(near){const p=a.root.position.clone();p.y+=1.3;this.world.actorInteractions.push({position:p,label:`${a.definition.name} · ${a.definition.role}`,action:`person-${a.definition.id}`});}
      }
      a.mixer.update(dt);a.root.updateMatrixWorld(true);a.feed.visible=selected&&this.world.outside&&started;
      if(a.feed.visible){a.feed.position.copy(a.root.position);a.feed.quaternion.copy(a.root.quaternion);for(let i=0;i<a.bones.length;i++){const b=a.bones[i],f=a.feedBones[i];f.position.copy(b.position);f.quaternion.copy(b.quaternion);f.scale.copy(b.scale);}a.feed.updateMatrixWorld(true);}
    }
    if(this.relic){this.relic.visible=!this.world.special&&this.world.activeLevel===144;if(this.relic.visible)this.world.actorInteractions.push({position:this.relic.position.clone(),label:'Inspect the hard-drive relic',action:'hard-drive'});}
  }
  setCamera(camera,body,yaw,pitch,bob=0){
    camera.rotation.set(pitch,yaw,0,'YXZ');const eye=body.position.clone().add(new THREE.Vector3(0,body.eyeHeight+bob,0));
    if(!this.thirdPerson){camera.position.copy(eye);return;}
    const direction=new THREE.Vector3();camera.getWorldDirection(direction);const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),target=body.position.clone().add(new THREE.Vector3(0,1.43,0));
    const end=target.clone().addScaledVector(direction,-3.4).addScaledVector(right,.42),delta=end.clone().sub(target),length=delta.length();let allowed=length;
    for(let d=.12;d<=length;d+=.08){const p=target.clone().addScaledVector(delta,d/length);if(this.world.colliders.contains(p.x,p.z,.17,p.y-.17,p.y+.17)||p.y<body.position.y+.18){allowed=Math.max(0,d-.16);break;}}
    camera.position.copy(target).addScaledVector(delta,allowed/length);
    // When a narrow corridor brings the camera inside the body, fade the body.
    if(this.active)this.active.root.visible=allowed>.7;
  }
}
