import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {Story, MEMENTOS} from '../dist/src/story.js';
import {FLOOR_MEMORIES} from '../dist/src/floor-memories.js';
import {SiloWorld} from '../dist/src/world.js';
import {CharacterBody} from '../dist/src/physics.js';
import {StoryProps} from '../dist/src/relics.js';
import {buildMementoModel} from '../dist/src/mementos.js';
import {inspectionDistance} from '../dist/src/relic-inspector.js';
import {levelY} from '../dist/src/data.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('optional finds cannot skip the opening or change the investigation, and survive a story save',()=>{
 const story=new Story('story');
 for(const item of MEMENTOS)assert.equal(story.take(item.id),null);
 story.beginSearch();
 for(const item of MEMENTOS){assert.ok(story.take(item.id));assert.equal(story.chapter,'clues');}
 for(const note of FLOOR_MEMORIES)story.seen.add(`memory:${note.level}`);
 const restored=Story.load(JSON.parse(JSON.stringify(story.save())));
 assert.deepEqual(restored.held,story.held);assert.deepEqual(restored.seen,story.seen);
 assert.equal(restored.chapter,'clues');assert.equal(restored.relicsHeld,0);
});

test('every floor has a distinct mounted note that can be approached and read through the actual interaction system',()=>{
 assert.equal(FLOOR_MEMORIES.length,144);
 assert.equal(new Set(FLOOR_MEMORIES.map(n=>n.title)).size,144);
 const world=new SiloWorld(new T.Scene());world.story=new Story('explore');
 for(let level=1;level<=144;level++){
  world.setLevel(level);
  const entry=world.loaded.get(level),note=entry.interactions.find(i=>i.action===`floor-memory:${level}`);
  assert.ok(note,`no note on ${level}`);
  const inward=new T.Vector3(-note.position.x,0,-note.position.z).normalize();
  const stand=note.position.clone().addScaledVector(inward,1.35);stand.y=levelY(level);
  assert.ok(!world.colliders.contains(stand.x,stand.z,.3,stand.y+.2,stand.y+1.7),`floor ${level}: blocked approach`);
  assert.ok(Math.abs(world.colliders.floorAt(stand.x,stand.z,.3,stand.y+.3)-stand.y)<.1,`floor ${level}: missing floor`);
  const eye=stand.clone().add(new T.Vector3(0,1.65,0));
  assert.equal(world.nearestInteraction(eye,note.position.clone().sub(eye).normalize())?.action,note.action,`floor ${level}: note not offered`);
  entry.root.updateMatrixWorld(true);
  entry.root.traverse(sign=>{
   if(sign.userData.mount!=='curved-wall')return;
   const {signSize,wallRadius}=sign.userData;
   for(const x of [-1,1])for(const z of [-1,1]){
    const corner=new T.Vector3(x*(signSize[0]+.055)/2,0,z*.025).applyMatrix4(sign.matrixWorld);
    assert.ok(Math.hypot(corner.x,corner.z)<wallRadius,`${level}: ${sign.userData.signText} is buried at a corner`);
   }
  });
 }
});

test('optional models rest on their supporting cloth, and a body can pick each one up',()=>{
 const world=new SiloWorld(new T.Scene()),story=new Story('explore'),props=new StoryProps(world.scene,world.m);
 world.story=story;
 for(const item of MEMENTOS){
  const bounds=new T.Box3().setFromObject(buildMementoModel(item.id,world.m));
  assert.ok(Math.abs(bounds.min.y)<.003,`${item.id}: floats or sinks ${bounds.min.y} m`);
  assert.ok(bounds.getSize(new T.Vector3()).length()<.4,`${item.id}: wrong scale`);
  world.setLevel(item.level);
  const room=world.loaded.get(item.level).rooms[item.wing];room.updateWorldMatrix(true,false);
  const target=new T.Vector3(...item.at).applyMatrix4(room.matrixWorld);
  const start=new T.Vector3(0,0,3).applyMatrix4(room.matrixWorld),body=new CharacterBody({radius:.3,stepHeight:.3});body.teleport(start.x,start.y+.1,start.z);
  for(let i=0;i<800;i++){const velocity=target.clone().sub(body.position);velocity.y=0;body.step(1/120,velocity.normalize().multiplyScalar(3.2),world.colliders);}
  props.update(0,0,story,item.level,null);world.actorInteractions=props.interactions(story,item.level,null);
  const eye=body.position.clone().add(new T.Vector3(0,body.eyeHeight,0));
  assert.equal(world.nearestInteraction(eye,target.clone().sub(eye).normalize())?.action,`relic:${item.id}`,`${item.id}: no pickup prompt`);
 }
});

test('the inspection camera fits every rotation in portrait, landscape and short mobile viewports',()=>{
 const fov=38*Math.PI/180;
 for(const aspect of [.28,.5,1,1.8,3.5])for(const radius of [.5,.72,Math.sqrt(3)/2]){
  const distance=inspectionDistance(aspect,radius),vertical=fov/2,horizontal=Math.atan(Math.tan(vertical)*aspect);
  assert.ok(Math.asin(radius/distance)<Math.min(vertical,horizontal));
  assert.ok(distance+radius<20,'relic crosses far clipping plane');
 }
});
