import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../dist/vendor/three.module.js';
import {PLAYABLE_CHARACTERS,CharacterCast,createPlayableActor} from '../dist/src/characters.js';
import {RESIDENT_CAST} from '../dist/src/resident-data.js';
import {DEFAULT_PROFILE,normalizeProfile,definitionFromProfile,loadProfile,saveProfile} from '../dist/src/character-profile.js';
import {createResident,disposeResident} from '../dist/src/resident-model.js';

test('registry covers every existing resident and named cast from all three television seasons',()=>{
 const ids=new Set(PLAYABLE_CHARACTERS.map(c=>c.id));assert.equal(ids.size,PLAYABLE_CHARACTERS.length);
 for(const c of RESIDENT_CAST)assert.ok(ids.has(c.id),c.name);
 for(const id of ['juliette','sims','bernard','reeve','hana','george','solo','audrey','rick','hope','daniel','helen','thurman','charlotte','anna','henry','victor','per','ed','orla','mike','glenda'])assert.ok(ids.has(id),id);
 for(const season of [1,2,3])assert.ok(PLAYABLE_CHARACTERS.some(c=>c.season===season));
 for(const id of ['juliette','sims','bernard'])assert.ok(!fs.existsSync(`dist/assets/characters/${id}.glb`));
 assert.ok(fs.existsSync('dist/assets/characters/hard-drive-relic.glb'));
});

test('custom profiles round-trip, reject invalid values and preserve the chosen name',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const input={...DEFAULT_PROFILE,name:'Ada Briggs',height:163,frame:'slender',department:'medical',hairStyle:'ponytail',skin:4,outfit:'medical',glasses:true};
 assert.ok(saveProfile(storage,input));assert.deepEqual(loadProfile(storage),normalizeProfile(input));
 const def=definitionFromProfile(loadProfile(storage));assert.equal(def.name,'Ada Briggs');assert.equal(def.height,1.63);assert.equal(def.level,62);assert.ok(def.appearance.glasses);assert.equal(def.appearance.female,true);
 const bad=normalizeProfile({name:'<resident>\u0000',height:Infinity,build:-9,skin:999,hairStyle:'../../fake',outfit:'script',department:'void'});
 assert.equal(bad.height,175);assert.equal(bad.build,.88);assert.equal(bad.skin,5);assert.equal(bad.hairStyle,'short');assert.equal(bad.outfit,'work');assert.equal(bad.department,'mechanical');assert.equal(bad.name,'resident');
 assert.equal(loadProfile({getItem(){throw Error('storage denied');}}),null);assert.equal(saveProfile({setItem(){throw Error('quota');}},input),false);
});

test('switching among cast and revised custom profiles keeps one actor and matching feed skeleton',()=>{
 const scene=new T.Scene(),world={surface:{feedScene:new T.Scene()}},cast=new CharacterCast(scene,world);
 for(const id of ['juliette','sims','solo','helen','bernard']){assert.ok(cast.select(id));assert.equal(cast.actors.size,1);assert.equal(scene.children.length,1);assert.equal(world.surface.feedScene.children.length,1);assert.equal(cast.active.bones.length,cast.active.feedBones.length);}
 const previous=cast.active;assert.equal(cast.select('missing-character'),false);assert.equal(cast.active,previous);
 for(const height of [155,195]){cast.register(definitionFromProfile({...DEFAULT_PROFILE,name:'A saved resident',height}));assert.ok(cast.select('custom-resident'));assert.equal(cast.active.definition.height,height/100);const bounds=new T.Box3().setFromObject(cast.active.model);assert.ok(Math.abs(bounds.max.y-height/100)<.005);assert.equal(scene.children.length,1);}
});

test('every selectable rig has finite surfaces, normalized weights and working idle/walk/run poses',()=>{
 const p=new T.Vector3();for(const def of PLAYABLE_CHARACTERS){
  const a=createResident(def,{cache:false});let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
  assert.ok(a.model.userData.handFrames.L&&a.model.userData.handFrames.R,def.id);const g=mesh.geometry;assert.ok(g.attributes.position.count<60000);assert.equal(mesh.material.transparent,false);
  for(let i=0;i<g.attributes.skinWeight.count;i+=17){const sum=Array.from({length:4},(_,k)=>g.attributes.skinWeight.array[i*4+k]).reduce((a,b)=>a+b,0);assert.ok(Math.abs(sum-1)<1e-5,def.id);}
  for(const pose of ['Idle','Walk','Run']){a.motion.sample(pose,.2);a.root.updateMatrixWorld(true);mesh.skeleton.update();for(let i=0;i<g.attributes.position.count;i+=71){mesh.getVertexPosition(i,p);assert.ok(p.toArray().every(Number.isFinite),def.id);assert.ok(p.y>-.15&&p.y<def.height*1.16&&Math.abs(p.x)<.85,`${def.id}: distorted ${pose}`);}}
  disposeResident(a);
 }
});

test('new common rigs keep feet planted and wrist travel continuous while walking',()=>{
 for(const id of ['juliette','sims','bernard','helen','solo']){
  const a=createPlayableActor(PLAYABLE_CHARACTERS.find(d=>d.id===id));let previous=null;
  for(let frame=0;frame<200;frame++){
   a.root.position.z=frame*1.4/60;a.root.updateMatrixWorld(true);a.motion.update(1/60,{speed:1.4,position:a.root.position,ground:()=>0});if(frame<90)continue;
   for(const c of a.motion.footContacts)if(c.planted)assert.ok(c.error<.004,id+' lost foot contact');
   const wrist=a.motion.bones.HandR.getWorldPosition(new T.Vector3()).sub(a.root.position);if(previous)assert.ok(wrist.distanceTo(previous)<.04,id+' wrist snaps');previous=wrist;
  }
 }
});
