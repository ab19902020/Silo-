import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { Story, RELICS, EQUIPMENT, COLLECTABLES, CHAPTERS } from '../dist/src/story.js';
import { Drone } from '../dist/src/relics.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { roomType } from '../dist/src/data.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('every collectable is a real thing in a real room, and says where it came from',()=>{
  const ids=new Set();
  for(const item of COLLECTABLES){
    assert.ok(!ids.has(item.id),`two collectables share the id ${item.id}`);ids.add(item.id);
    assert.ok(item.level>=1&&item.level<=144,`${item.id} is on level ${item.level}`);
    assert.ok(item.wing>=0&&item.wing<6);
    assert.ok(Math.abs(item.at[0])<10&&item.at[2]>0&&item.at[2]<24,`${item.id} sits outside its room`);
    assert.ok(item.blurb.length>80,`${item.id} has nothing to read`);
    assert.ok(item.source.length>30,`${item.id} does not say whether it is sourced or placed`);
  }
  assert.equal(RELICS.length,4);
  assert.equal(EQUIPMENT.length,4);
  // Spread across the silo: a run that only visits one end is not a run.
  const levels=[...new Set(COLLECTABLES.map(c=>c.level))];
  assert.ok(levels.length>=5,'the collectables are not spread through the silo');
  assert.ok(Math.max(...levels)-Math.min(...levels)>100,'nothing is far from anything else');
});

test('explore mode opens everything and never runs the story',()=>{
  const s=new Story('explore');
  assert.equal(s.story,false);
  assert.equal(s.complete,true);
  for(const item of COLLECTABLES)assert.equal(s.visible(item.id),true,`${item.id} is hidden in explore mode`);
  for(const [level,wing] of [[14,0],[19,0],[19,1],[144,3]])assert.equal(s.sealed(level,wing,roomType(level,wing)),null);
  assert.equal(s.steppedOutside(),null,'explore mode sent a drone');
});

test('story mode follows George from relic clue to pipe and Billings',()=>{
  const s=new Story('story');
  assert.equal(s.chapter,'cleaning');
  assert.ok(s.sealed(68,0,'residential'),'George’s home opened before the lead');
  assert.equal(s.visible('suit'),false);
  assert.equal(s.visible('shotgun'),false);
  assert.equal(s.visible('pez'),false); // The opening cannot be skipped by collecting relics.
  s.beginSearch();
  assert.equal(s.chapter,'clues');
  s.take('georgia');s.take('watch');
  assert.equal(s.chapter,'void-lead');
  assert.equal(s.inspectVoidDoor().needs,'crowbar');
  assert.equal(s.visible('crowbar'),true);s.take('crowbar');
  assert.equal(s.pryHideout(),true);assert.equal(s.visible('harddrive'),true);
  s.take('harddrive');assert.equal(s.chapter,'george-home');
  assert.equal(s.sealed(68,0,'residential'),null);
  assert.equal(s.reachGeorgeHome(),true);assert.equal(s.terminalDiscovered(),true);
  s.take('pipekit');s.openPipeCover();
  assert.deepEqual(s.capPipe('collar').complete,false);
  s.capPipe('isolate');s.capPipe('collar');assert.equal(s.capPipe('torque').complete,true);
  assert.equal(s.speakToBillings().helped,true);assert.equal(s.visible('shotgun'),true);
  s.take('shotgun');s.take('suit');assert.equal(s.chapter,'airlock');
});

test('you cannot walk out without a suit, and you do not survive the hill unarmed',()=>{
  const bare=new Story('story');bare.beginSearch();
  const stopped=bare.steppedOutside();
  assert.equal(stopped.stop,true,'the airlock let a man out in his shirtsleeves');

  const s=new Story('story');s.beginSearch();s.take('georgia');s.take('watch');s.inspectVoidDoor();s.take('crowbar');s.pryHideout();s.take('harddrive');s.reachGeorgeHome();s.terminalDiscovered();s.take('pipekit');s.openPipeCover();for(const step of ['isolate','collar','torque'])s.capPipe(step);s.speakToBillings();s.take('shotgun');s.take('suit');
  assert.equal(s.chapter,'airlock');
  const out=s.steppedOutside();
  assert.equal(out.drone,true,'nothing came for you');
  assert.equal(s.chapter,'drone');
  s.killedByDrone();
  assert.equal(s.chapter,'airlock','being killed did not put you back at the airlock');
  assert.equal(s.deaths,1);
  s.steppedOutside();
  assert.equal(s.droneKilled(),true);
  assert.equal(s.complete,true);
});

test('the story survives being saved and rejects an invalid pipe sequence',()=>{
  const s=new Story('story');s.beginSearch();s.take('georgia');s.take('watch');s.inspectVoidDoor();s.take('crowbar');s.pryHideout();s.take('harddrive');s.reachGeorgeHome();s.terminalDiscovered();s.take('pipekit');s.openPipeCover();s.capPipe('isolate');
  const back=Story.load(JSON.parse(JSON.stringify(s.save())));
  assert.equal(back.mode,'story');
  assert.equal(back.chapter,s.chapter);
  assert.equal(back.wearing,false);
  assert.equal(back.armed,false);
  assert.equal(back.relicsHeld,s.relicsHeld);
  const forged=Story.load({...s.save(),pipeSteps:['torque','isolate']});
  assert.deepEqual(forged.pipeSteps,[]);
});

test('every chapter has an objective a player can act on',()=>{
  const s=new Story('story');
  for(const chapter of CHAPTERS){
    s.chapter=chapter.id;
    assert.ok(s.objective.length>30,`chapter ${chapter.id} has no objective`);
    assert.ok(s.chapterInfo.title.length>=3);
  }
});

test('the drone closes, fires if it is left alone, and comes down when it is hit twice',()=>{
  const scene=new T.Scene(),world=new SiloWorld(scene);
  const drone=new Drone(scene,world.m);
  const target=new T.Vector3(0,1.7,0);
  assert.equal(drone.active,false);
  drone.launch(new T.Vector3(0,20,60));
  assert.equal(drone.active,true);
  let fired=null,frames=0;
  for(;frames<3000&&!fired;frames++)fired=drone.update(1/60,target);
  assert.equal(fired,'fired','the drone never fired');
  assert.ok(frames/60>12&&frames/60<40,`it took ${(frames/60).toFixed(0)} s to fire`);
  assert.ok(drone.group.position.distanceTo(target)<16,'it fired from out of sight');

  // Shooting it: one barrel is not enough, two is, and only if you are aiming.
  drone.launch(new T.Vector3(0,20,60));
  for(let i=0;i<900;i++)drone.update(1/60,target);
  const eye=target.clone(),aim=drone.group.position.clone().sub(eye).normalize();
  assert.equal(drone.shoot(eye,new T.Vector3(0,0,-1),0),false,'a shot into the ground brought it down');
  assert.equal(drone.shoot(eye,aim,0),false,'one barrel was enough');
  assert.equal(drone.shoot(eye,aim,0),true,'two aimed barrels did not bring it down');
  let landed=null;
  for(let i=0;i<1200&&!landed;i++)landed=drone.update(1/60,target);
  assert.equal(landed,'landed');
  assert.equal(drone.active,false);
});

test('every collectable stands in open space you can actually walk up to',()=>{
  const world=new SiloWorld(new T.Scene());
  for(const item of COLLECTABLES){
    world.setLevel(item.level);
    const room=world.loaded.get(item.level).rooms[item.wing];
    room.updateWorldMatrix(true,false);
    const at=new T.Vector3(item.at[0],0,item.at[2]).applyMatrix4(room.matrixWorld);
    const floor=world.colliders.floorAt(at.x,at.z,.3,at.y+2.2);
    assert.ok(Number.isFinite(floor)&&Math.abs(floor-at.y)<1.7,
      `${item.id} on ${item.level}/${item.wing} has no floor under it (floor ${floor}, room ${at.y})`);
    // The object's own volume has to be clear — resting on a bar top is fine,
    // buried inside the bar is not.
    const itemY=at.y+item.at[1];
    // From ten centimetres up: a bench's collision box stands a little proud of
    // the surface you actually put things down on.
    assert.ok(!world.colliders.contains(at.x,at.z,.16,itemY+.10,itemY+.34),
      `${item.id} on ${item.level}/${item.wing} is inside something`);
    // And a body can reach it from the middle of the wing.
    const from=new T.Vector3(0,0,3).applyMatrix4(room.matrixWorld);
    const b=new CharacterBody({radius:.3,stepHeight:.3});
    b.teleport(from.x,floor+.1,from.z);
    const door=world.doors.find(d=>d.level===item.level&&d.wing===item.wing);
    if(door){door.open=true;for(let i=0;i<150;i++)world.update(1/60,b.position);}
    for(let i=0;i<1400;i++){const v=at.clone().sub(b.position);v.y=0;v.normalize().multiplyScalar(3.2);b.step(1/120,v,world.colliders);}
    assert.ok(Math.hypot(b.position.x-at.x,b.position.z-at.z)<1.6,
      `${item.id} on ${item.level}/${item.wing} cannot be reached: stopped ${Math.hypot(b.position.x-at.x,b.position.z-at.z).toFixed(1)} m away`);
  }
});
