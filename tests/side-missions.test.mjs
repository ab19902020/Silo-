import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {SideMissions} from '../dist/src/side-missions.js';
import {SideMissionWorld,MISSION_STANDS,standPlacement} from '../dist/src/side-mission-world.js';
import {SiloWorld} from '../dist/src/world.js';
import {Story} from '../dist/src/story.js';
import {CharacterBody} from '../dist/src/physics.js';
globalThis.document??={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){},measureText:()=>({width:10})})})};
const lamp=['lamp-accept','lamp-diagnose','lamp-spare','lamp-isolate','lamp-fit','lamp-test','lamp-report'];
const parcel=['parcel-accept','parcel-collect','parcel-label'];
const sky=['sky-accept','sky-read','sky-pattern'];
const perform=(s,actions)=>{for(const action of actions)assert.ok(s.perform(action).changed,action);};

test('three optional stories can interleave, persist after every step and leave the mystery untouched',()=>{
  const story=new Story('story'),before=story.save();let side=new SideMissions();
  const actions=[lamp[0],parcel[0],sky[0],lamp[1],parcel[1],sky[1],...lamp.slice(2),parcel[2],'parcel-deliver',sky[2],'sky-school'];
  for(const action of actions){assert.ok(side.perform(action).changed,action);const saved=side.save(),notes=side.journal(),carried=side.carried;side=SideMissions.load(saved);assert.deepEqual(side.save(),saved);assert.deepEqual(side.journal(),notes);assert.deepEqual(side.carried,carried);}
  assert.equal(side.completed,3);assert.equal(side.active,0);assert.deepEqual(side.carried,[]);assert.deepEqual(story.save(),before);
  assert.equal(side.outcomes.parcel,'medical');assert.equal(side.outcomes.sky,'school');
  assert.ok(side.topics('walker').some(t=>t.reply.includes('steady light')));
  assert.ok(side.topics('pete').some(t=>t.reply.includes('night orderly')));
});

test('out-of-order steps, duplicate rewards and false conclusions cannot advance a mission',()=>{
  const s=new SideMissions();for(const action of ['lamp-test','lamp-fit','parcel-deliver','sky-pattern','unknown'])assert.equal(s.perform(action).changed,false);
  perform(s,lamp);assert.equal(s.perform('lamp-report').changed,false);
  perform(s,sky.slice(0,2));const puzzle=s.topics('lukas').find(t=>t.id==='side-sky-compare');
  assert.equal(puzzle.follow.filter(t=>t.sideAction).length,1);assert.ok(puzzle.follow.some(t=>t.reply.includes('air')));
  assert.equal(s.stages.sky,2);perform(s,['sky-pattern','sky-private']);assert.equal(s.perform('sky-school').changed,false);
  perform(s,[...parcel,'parcel-return']);assert.equal(s.perform('parcel-deliver').changed,false);
  assert.deepEqual(SideMissions.load(s.save()).outcomes,{parcel:'supply',sky:'private'});
  assert.deepEqual(SideMissions.load({stages:{lamp:99,parcel:-2,sky:'4'}}).stages,{lamp:0,parcel:0,sky:0});
});

test('every physical mission stand is supported, reachable and offers the expected action',()=>{
  const world=new SiloWorld(new T.Scene()),side=new SideMissions(),view=new SideMissionWorld(),body=new CharacterBody();
  perform(side,['lamp-accept','parcel-accept','sky-accept']);
  for(const spec of MISSION_STANDS){
    world.setLevel(spec.level);world.actorInteractions=[];world.residentInteractions=[];view.update(world,side,body);world.rebuildCollision();
    const placement=standPlacement(spec),radial=placement.position.clone().setY(0).normalize();
    const start=placement.position.clone().addScaledVector(radial,-2.5);body.teleport(start.x,start.y,start.z);
    assert.equal(world.colliders.contains(start.x,start.z,.3,start.y+.15,start.y+1.7),false,`${spec.id}: blocked approach`);
    assert.ok(Math.abs(world.colliders.floorAt(start.x,start.z,.3,start.y+.3)-start.y)<.05,`${spec.id}: unsupported approach`);
    const velocity=radial.clone().multiplyScalar(1.2);
    for(let i=0;i<120;i++)body.step(1/120,velocity,world.colliders);
    assert.ok(body.position.distanceTo(start)>.5,`${spec.id}: cannot walk up to the stand`);
    const eye=body.position.clone().add(new T.Vector3(0,body.eyeHeight,0)),target=placement.position.clone().add(new T.Vector3(0,1.25,0));
    const prompt=world.nearestInteraction(eye,target.clone().sub(eye).normalize());
    assert.ok(prompt,`${spec.id}: no prompt`);assert.equal(prompt.spec?.id,spec.id,`${spec.id}: prompt is ${prompt.action}`);
    assert.equal(world.colliders.contains(placement.position.x,placement.position.z,.1,placement.position.y+.2,placement.position.y+1.5),true,'stand has no collision');
  }
});

test('repair and both delivery/observation outcomes survive floor streaming as physical changes',()=>{
  const world=new SiloWorld(new T.Scene()),s=new SideMissions(),view=new SideMissionWorld();perform(s,lamp);
  world.setLevel(140);view.update(world,s);let node=world.loaded.get(140).missionStands.find(x=>x.spec.id==='lamp-panel');assert.ok(node.root.userData.light.intensity>0);
  world.setLevel(1);view.update(world,s);world.setLevel(140);view.update(world,SideMissions.load(s.save()));node=world.loaded.get(140).missionStands.find(x=>x.spec.id==='lamp-panel');assert.ok(node.root.userData.light.intensity>0);
  perform(s,[...parcel,'parcel-deliver',...sky,'sky-school']);
  world.setLevel(61);view.update(world,s);assert.equal(world.loaded.get(61).missionStands[0].root.userData.bundle.visible,false);
  world.setLevel(62);view.update(world,s);assert.ok(world.loaded.get(62).missionStands[0].root.userData.bundle.visible);
  world.setLevel(35);view.update(world,s);assert.ok(world.loaded.get(35).missionStands[0].root.userData.chart.visible);
  const other=new SideMissions();perform(other,[...parcel,'parcel-return',...sky,'sky-private']);
  world.setLevel(126);view.update(world,other);assert.ok(world.loaded.get(126).missionStands[0].root.userData.bundle.visible);
  world.setLevel(19);view.update(world,other);assert.ok(world.loaded.get(19).missionStands[0].root.userData.chart.visible);
});
