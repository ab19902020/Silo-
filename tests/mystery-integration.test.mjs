import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {Story} from '../dist/src/story.js';
import {GeorgeTerminal} from '../dist/src/george-terminal.js';
import {SiloWorld} from '../dist/src/world.js';
import {CharacterBody} from '../dist/src/physics.js';
import {GEORGE_TERMINAL_POINT} from '../dist/src/mystery-spaces.js';
import {Population,populationRecords} from '../dist/src/population.js';
import {roomPoint} from '../dist/src/characters.js';
import fs from 'node:fs';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('terminal requires reboot after insertion, discovery and opening the concealed volume',()=>{
  const t=new GeorgeTerminal();t.boot();t.insertDrive(true);assert.equal(t.view.canSearch,false);
  t.search('library');assert.equal(t.found,false);t.boot();t.open('/ORDERS');t.search('library');
  assert.ok(t.view.rows.some(r=>r.id==='/LIBRARY'),'search works from an ordinary subfolder');
  t.open('/LIBRARY/SCHEMATIC.GAS');assert.equal(t.view.blueprint,null);
  t.open('/LIBRARY');t.open('/LIBRARY/SCHEMATIC.GAS');assert.ok(t.view.blueprint);
  assert.deepEqual(GeorgeTerminal.load(t.save()).view,t.view);
  assert.equal(GeorgeTerminal.load({...t.save(),opened:false}).view.blueprint,null);
  t.ejectDrive();assert.equal(t.view.blueprint,null);
});
test('story cannot bypass the breach, armoury, pressure tools, or physical airlock',()=>{
  const s=new Story('story');assert.ok(s.travelAllowed('surface'));assert.ok(s.travelAllowed('tunnel'));assert.equal(s.take('shotgun'),null);
  s.beginSearch();s.take('watch');assert.equal(s.pryHideout(),false);s.inspectVoidDoor();s.take('crowbar');s.pryHideout();assert.equal(s.travelAllowed('excavator'),null);
  s.take('harddrive');s.reachGeorgeHome();const t=new GeorgeTerminal();t.insertDrive(s.has('harddrive'));t.boot();t.search('library');t.open('/LIBRARY');t.open('/LIBRARY/SCHEMATIC.GAS');if(t.view.blueprint)s.terminalDiscovered();
  assert.equal(s.capPipe('isolate').complete,false);s.take('pipekit');assert.equal(s.capPipe('isolate').complete,false);s.openPipeCover();s.capPipe('isolate');
  const resumed=Story.load(s.save());assert.equal(resumed.pipeSteps.length,1);resumed.capPipe('collar');resumed.capPipe('torque');assert.equal(resumed.speakToBillings().helped,false);resumed.take('georgia');assert.equal(resumed.speakToBillings().helped,true);
  resumed.take('shotgun');resumed.take('suit');assert.equal(resumed.steppedOutside().drone,true);assert.ok(resumed.travelAllowed(1));resumed.droneKilled();assert.equal(resumed.steppedOutside(),null);assert.equal(resumed.travelAllowed('silo17'),null);
});
const walk=(world,body,target)=>{for(let i=0;i<9000;i++){const v=target.clone().sub(body.position);v.y=0;if(v.length()<.15)break;v.normalize().multiplyScalar(3);body.step(1/120,v,world.colliders);}assert.ok(body.position.distanceTo(target)<.65,`blocked at ${body.position.toArray()} on way to ${target.toArray()}`);};
test('Silo 17 stairs connect dry landings to wading floor and back without teleporting',()=>{
  const world=new SiloWorld(new T.Scene());world.setLevel(1,'silo17');const b=new CharacterBody({radius:.3,stepHeight:.3});b.teleport(0,12,-15.8);
  const route=[[10,12,-13],[20,12,-13],[20,6,13],[10,6,13],[0,6,16],[-10,6,13],[-14,6,0],[-10,6,-13],[-20,6,-13],[-20,0,13],[-10,0,13],[0,0,10]];
  for(const p of route)walk(world,b,new T.Vector3(...p));for(const p of route.slice(0,-1).reverse())walk(world,b,new T.Vector3(...p));walk(world,b,new T.Vector3(0,12,-15.8));
  world.update(1/60,b.position);assert.equal(world.sun.visible,false);assert.equal(world.silo17.root.visible,true);assert.equal(world.underground.root.visible,false);
});
test('pressure controls and George’s computer have supported physical approaches',()=>{
  const world=new SiloWorld(new T.Scene()),b=new CharacterBody({radius:.3,stepHeight:.3});world.setLevel(144,'pipe-gallery');b.teleport(0,48,-23);walk(world,b,new T.Vector3(0,48,8));walk(world,b,new T.Vector3(-4,48,9));walk(world,b,new T.Vector3(1.4,48,9));
  world.setLevel(68);const d=world.doors.find(d=>d.level===68&&d.wing===0);d.open=true;for(let i=0;i<150;i++)world.update(1/60,roomPoint(68,0,0,3));
  const start=roomPoint(68,0,0,3);b.teleport(...start.toArray());const target=GEORGE_TERMINAL_POINT.clone();target.y=start.y;walk(world,b,roomPoint(68,0,0,4.7));walk(world,b,roomPoint(68,0,2.1,4.7));walk(world,b,roomPoint(68,0,2.1,4.3));walk(world,b,roomPoint(68,0,6,4.3));
  assert.ok(b.position.distanceTo(GEORGE_TERMINAL_POINT)<4,'terminal cannot be used from its approach');
});
test('all main UI bindings exist once and all local accuracy links ship',()=>{
  const html=fs.readFileSync('dist/index.html','utf8'),main=fs.readFileSync('dist/src/main.js','utf8');const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'duplicate DOM ids');
  for(const [,id]of main.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.includes(id),`missing #${id}`);
});

test('integrated mine has walkable loops, a reachable pressure hatch and bounded fixed lights',()=>{
  const world=new SiloWorld(new T.Scene()),b=new CharacterBody({radius:.3,stepHeight:.3});
  world.setLevel(144,'mines');b.teleport(...world.destination('mines').position.toArray());
  // Follow both loops using the host's translated colliders, including the new deep-face exit.
  const local=[[2,0],[-6,10],[-21,10],[-21,44],[0,44],[0,50],[-2.5,53.2],[0,50],[0,44],[21,44],[21,10],[6,10],[2,0]];
  for(const [x,z] of local)walk(world,b,new T.Vector3(105+x,48,z));
  const space=world.specialSpace();assert.equal(space.chambers.length,14);
  const hatch=space.interactions.find(i=>i.destination==='pipe-gallery');assert.ok(hatch);
  assert.equal(world.pressure.interactions[0].destination,'mine-deep-face');
  assert.equal(world.destination('mine-deep-face').special,'mines');
  const lights=world.underground.mineLights,before=lights.map(l=>l.position.clone());
  for(const [quality,budget] of [['low',4],['balanced',6],['high',10]]){
    world.quality=quality;world.update(.4,b.position);assert.ok(lights.filter(l=>l.visible).length<=budget);
    lights.forEach((l,i)=>assert.ok(l.position.equals(before[i])));assert.equal(world.sun.visible,false);
  }
  assert.ok(world.underground.root.children.filter(c=>c.visible).every(c=>c===world.underground.mines));
  world.setLevel(144,'excavator');assert.equal(world.underground.mines.visible,false);
});
test('abandoned spaces do not spawn ordinary floor residents or leave old collision bodies active',()=>{
  const world=new SiloWorld(new T.Scene()),body=new CharacterBody({radius:.3,stepHeight:.3}),pop=new Population(world.scene,world);
  for(const special of ['silo17','pipe-gallery']){
    assert.deepEqual(populationRecords(special),[]);world.setLevel(special==='silo17'?1:144,special);
    body.teleport(...world.destination(special).position.toArray());pop.update(1/60,body);pop.separatePlayer(body);
    assert.equal(pop.count,0);assert.deepEqual(world.residentInteractions,[]);assert.ok(body.position.toArray().every(Number.isFinite));
  }
});
