import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {SiloWorld} from '../dist/src/world.js';
import {Story,COLLECTABLES} from '../dist/src/story.js';
import {StoryProps} from '../dist/src/relics.js';
import {Population} from '../dist/src/population.js';
import {CharacterBody} from '../dist/src/physics.js';
import {roomPoint} from '../dist/src/characters.js';
import {objectiveMark} from '../dist/src/objective-target.js';
import {siloSchedule} from '../dist/src/silo-time.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
function setup(){
 const world=new SiloWorld(new T.Scene()),story=new Story('story');world.story=story;world.setLevel(1);
 const props=new StoryProps(world.scene,world.m),body=new CharacterBody({radius:.3,stepHeight:.3}),population=new Population(world.scene,world);population.schedule=siloSchedule(8.4);
 const refresh=()=>{props.update(1/60,0,story,world.activeLevel,world.special);world.actorInteractions=props.interactions(story,world.activeLevel,world.special);};
 const eye=()=>body.position.clone().add(new T.Vector3(0,body.eyeHeight,0));
 const offered=target=>world.nearestInteraction(eye(),target.clone().sub(eye()).normalize());
 const walk=target=>{for(let j=0;j<2400&&body.position.distanceTo(target)>.1;j++){
  const v=target.clone().sub(body.position);v.y=0;body.step(1/120,v.normalize().multiplyScalar(2.4),world.colliders);
  if(j%12===0){population.update(.1,body);population.separatePlayer(body);}
 }assert.ok(body.position.distanceTo(target)<.15,`blocked approach: ${body.position.toArray()} -> ${target.toArray()}`);};
 return {world,story,props,body,population,refresh,eye,offered,walk};
}
test('a resumed Chapter One can open Wing A, walk to the dispatch among residents and collect it once',()=>{
 const h=setup(),{world,story,props,body,population}=h;
 h.refresh();assert.equal(props.items.get('dispatch').group.visible,false);
 story.beginSearch();story.spokeToMara();const saved=story.save();Object.assign(story,Story.load(saved));
 assert.deepEqual(objectiveMark(story,COLLECTABLES),{kind:'thing',id:'dispatch'});
 body.position.copy(roomPoint(1,0,0,-1.8));world.update(0,body.position);population.update(.01,body);
 const door=world.doors.find(d=>d.level===1&&d.wing===0);assert.ok(door);door.open=false;door.amount=0;world.rebuildCollision();
 assert.equal(h.offered(door.position)?.door,door,'the entrance handle cannot be used');
 door.open=true;for(let j=0;j<150;j++)world.update(1/60,body.position);
 h.walk(roomPoint(1,0,0,5.8));h.walk(roomPoint(1,0,-6.1,5.8));h.refresh();
 const card=props.items.get('dispatch').group;assert.ok(card.visible);
 const pickup=h.offered(card.position);assert.equal(pickup?.action,'relic:dispatch');
 assert.ok(story.take(pickup.action.slice(6)));h.refresh();assert.equal(card.visible,false);
 assert.equal(world.actorInteractions.some(i=>i.action==='relic:dispatch'),false);assert.equal(story.take('dispatch'),null);
 assert.equal(Story.load(story.save()).has('dispatch'),true,'saving loses the dispatch');
 assert.equal(story.destination.level,110);
});
test('looking directly at a close dispatch wins over a nearby talk prompt, without collecting through walls',()=>{
 const h=setup(),{world,story,props,body}=h;story.beginSearch();story.spokeToMara();body.position.copy(roomPoint(1,0,-6.1,5.8));h.refresh();
 const target=props.items.get('dispatch').group.position;
 const resident=h.eye().lerp(target,.65).add(new T.Vector3(0,.08,0));
 world.residentInteractions=[{position:resident,action:'resident-nearby',label:'Talk to resident'}];
 assert.equal(h.offered(target)?.action,'relic:dispatch','the closer resident stole the pickup');
 // Looking deliberately at the resident still gives the conversation.
 resident.copy(h.eye()).add(new T.Vector3(0,0,1));assert.equal(h.offered(resident)?.action,'resident-nearby');
 const wall=h.eye().lerp(target,.5);world.colliders.addOrientedBox({cx:wall.x,cz:wall.z,halfX:.15,halfZ:.15,minY:wall.y-.5,maxY:wall.y+.5});
 world.residentInteractions=[];assert.notEqual(h.offered(target)?.action,'relic:dispatch','pickup bypassed a solid obstruction');
});
test('Supply hands the marker to the released parcel and then to the deputy',()=>{
 const h=setup(),{world,story,props,body,population}=h;story.beginSearch();story.spokeToMara();story.take('dispatch');story.reachedSupply();world.setLevel(110);
 const door=world.doors.find(d=>d.level===110&&d.wing===0);body.position.copy(roomPoint(110,0,0,-1.8));world.update(0,body.position);
 assert.equal(h.offered(door.position)?.door,door);door.open=true;for(let j=0;j<150;j++)world.update(1/60,body.position);
 h.walk(roomPoint(110,0,0,3));population.update(.01,body);h.refresh();
 assert.deepEqual(objectiveMark(story,COLLECTABLES),{kind:'person',id:'delen'});
 const clerk=world.residentInteractions.find(i=>i.actor==='delen');assert.ok(clerk);assert.equal(h.offered(clerk.position)?.actor,'delen');
 assert.equal(props.items.get('package').group.visible,false);story.deliverDispatch();h.refresh();
 assert.deepEqual(objectiveMark(story,COLLECTABLES),{kind:'thing',id:'package'});
 const parcel=props.items.get('package').group;assert.ok(parcel.visible);assert.equal(h.offered(parcel.position)?.action,'relic:package');
 assert.ok(story.take('package'));h.refresh();assert.equal(parcel.visible,false);
 assert.deepEqual(objectiveMark(story,COLLECTABLES),{kind:'person',id:'kell'});
 const deputy=world.residentInteractions.find(i=>i.actor==='kell');assert.ok(deputy);assert.equal(h.offered(deputy.position)?.actor,'kell');
 assert.ok(story.metTheDeputy(false));assert.equal(story.chapter,'clues');
});
