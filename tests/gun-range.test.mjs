import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
// Signs draw their text to a canvas, which needs a document to exist.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){},measureText:()=>({width:0}),createLinearGradient:()=>({addColorStop(){}})})})};
import { createMaterials } from '../dist/src/kit.js';
import { buildGunRange, updateRangeTargets, RANGE } from '../dist/src/gun-range.js';
import { Firearms } from '../dist/src/firearms.js';
import { WEAPONS } from '../dist/src/weapons.js';

// A camera standing on the firing line, looking down a lane.
function shooterAt(target){
  const camera=new THREE.PerspectiveCamera(70,1.8,.1,300);
  camera.position.set(target.x,1.6,RANGE.line);
  camera.lookAt(target.x,1.6,target.z);
  camera.updateMatrixWorld(true);
  return camera;
}

test('a round fired down a lane hits the target in it',async()=>{
  const scene=new THREE.Scene(),range=buildGunRange(createMaterials());
  scene.add(range.root);scene.updateMatrixWorld(true);
  const firearms=new Firearms(scene,null);
  firearms.targets=range.targets;
  firearms.spec=WEAPONS.armoryAssault01;firearms.key='armoryAssault01';
  firearms.loadout.for('armoryAssault01');
  const target=range.targets[1],camera=shooterAt(target);
  firearms.aiming=true;
  let hits=0;
  for(let i=0;i<40;i++)if(firearms.fire(i*1,camera))hits++;
  assert.ok(hits>0,'forty aimed rounds down a lane and nothing was hit');
  assert.ok(target.hits>0,`lane ${target.lane} recorded no hits`);
  // Rounds came out of the magazine, and it ran dry rather than firing for ever.
  const ammo=firearms.loadout.for('armoryAssault01');
  assert.ok(ammo.magazine<WEAPONS.armoryAssault01.magazine,'the magazine never went down');
});

test('steel swings when it is hit and comes back to rest',()=>{
  const range=buildGunRange(createMaterials()),target=range.targets[0];
  target.rate=9;
  let moved=0;
  for(let i=0;i<20;i++){updateRangeTargets(range.targets,1/60);moved=Math.max(moved,Math.abs(target.plate.rotation.x));}
  assert.ok(moved>.02,`the plate barely moved (${moved.toFixed(3)} rad)`);
  for(let i=0;i<600;i++)updateRangeTargets(range.targets,1/60);
  assert.equal(target.swing,0,'the plate never settled');
  assert.equal(target.plate.rotation.x,0);
});

test('paper takes a hole where the round went through, and not an unbounded number',()=>{
  const scene=new THREE.Scene(),range=buildGunRange(createMaterials());
  scene.add(range.root);scene.updateMatrixWorld(true);
  const firearms=new Firearms(scene,null);
  firearms.targets=range.targets;firearms.spec=WEAPONS.armoryPistol01;
  const target=range.targets[2];
  const point=new THREE.Vector3(target.x,1.7,target.z);
  for(let i=0;i<80;i++)firearms.punch(target,point);
  assert.ok(target.paper.children.length<=60,`${target.paper.children.length} holes accumulated without bound`);
  assert.ok(target.paper.children.length>0,'the paper took no holes at all');
});

test('an empty magazine stops the weapon, and reloading refills it from the reserve',()=>{
  const firearms=new Firearms(new THREE.Scene(),null);
  firearms.spec=WEAPONS.armoryPistol01;firearms.key='armoryPistol01';
  const ammo=firearms.loadout.for('armoryPistol01');
  const size=WEAPONS.armoryPistol01.magazine;
  for(let i=0;i<size;i++)firearms.fire(i*10,null);
  assert.equal(ammo.magazine,0,'the magazine did not empty');
  const before=ammo.reserve;
  firearms.fire((size+1)*10,null);
  assert.equal(ammo.magazine,0,'a shot came out of an empty magazine');
  assert.ok(firearms.reload(),'reloading was refused with rounds in reserve');
  firearms.update(WEAPONS.armoryPistol01.reloadTime+.1,0);
  assert.equal(ammo.magazine,size,'the magazine did not come back full');
  assert.equal(ammo.reserve,before-size,'the rounds did not come out of the reserve');
});

test('recoil is handed back to be ridden out, never applied behind the player',()=>{
  const firearms=new Firearms(new THREE.Scene(),null);
  firearms.spec=WEAPONS.armoryAssault01;firearms.key='armoryAssault01';
  firearms.loadout.for('armoryAssault01');
  firearms.fire(0,null);
  const kick=firearms.update(1/60,0);
  assert.ok(kick.pitch>0,'firing produced no rise at all');
  // It has to come back down, or a magazine leaves you looking at the ceiling.
  for(let i=0;i<240;i++)firearms.update(1/60,0);
  const settled=firearms.update(1/60,0);
  assert.ok(Math.abs(settled.pitch)<1e-3,`recoil never settled (${settled.pitch})`);
});
