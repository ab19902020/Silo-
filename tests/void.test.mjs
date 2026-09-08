import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { LadderClimb } from '../dist/src/climbing.js';
import { VOID,tunnelPoint } from '../dist/src/void-access.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const world=new SiloWorld(new THREE.Scene());world.setLevel(144,'excavator');
const ladder=world.underground.ladders[0],vector=p=>new THREE.Vector3(...p);
function walk(body,target,seconds=30){
  const dt=1/120;for(let i=0;i<seconds/dt;i++){
    const to=target.clone().sub(body.position);to.y=0;if(to.length()<.08){assert.ok(Math.abs(body.position.y-target.y)<.16,`Unsupported route: ${body.position.toArray()} -> ${target.toArray()}`);return;}
    body.step(dt,to.normalize().multiplyScalar(2.4),world.colliders);
  }
  assert.fail(`Blocked route: ${body.position.toArray()} -> ${target.toArray()}`);
}
function climb(body,up){
  assert.ok(LadderClimb.begin(body,ladder,up));let frames=0;
  while(body.climbing&&frames++<2000){const before=body.position.clone();body.step(1/120,new THREE.Vector3(9,0,9),world.colliders);assert.ok(before.distanceTo(body.position)<.04,'climb jumped between positions');}
  assert.ok(!body.climbing,'climb failed to finish');assert.ok(body.grounded);assert.ok(body.position.distanceTo(vector(up?ladder.topExit:ladder.bottomExit))<.001);
}
test('the preserved camp is on the perimeter with a supported entrance and the ladder beside it',()=>{
  const camp=world.underground.camp;assert.ok(Math.hypot(camp.position.x,camp.position.z)>60,'camp still attached to the central tower');
  const body=new CharacterBody();body.teleport(71,12,0);
  // Pass through the doorway and around the real table, then to the ladder.
  for(const p of [[69.4,12,3.3],[69.4,12,5],[69.9,12,5.2],[69.9,12,8],ladder.topExit])walk(body,vector(p));
  assert.ok(body.position.distanceTo(vector(ladder.topExit))<.1);
  for(const wanted of ['camp','relics'])assert.ok(world.underground.interactions.some(i=>i.action===wanted));
});
test('all three body sizes descend the ladder, wade to the hidden door and return to the camp',()=>{
  for(const height of [1.73,1.83,1.87]){
    const body=new CharacterBody({standHeight:height,radius:.3,stepHeight:.3});body.teleport(...ladder.topExit);climb(body,false);
    assert.ok(body.position.y<VOID.waterY&&body.position.y+height>VOID.waterY,'expected a supported wading depth');
    walk(body,tunnelPoint(0,0,0));for(const z of [3,6,9,12,20,28,34])walk(body,tunnelPoint(0,Math.min(.7,(Math.floor(z/.5)+1)*.035),z));
    const door=world.underground.interactions.find(i=>i.action==='tunnel');const eye=body.position.clone().add(new THREE.Vector3(0,body.eyeHeight,0));assert.ok(eye.distanceTo(vector(door.position))<3);
    const out=new THREE.Vector3(Math.cos(VOID.tunnelAngle),0,Math.sin(VOID.tunnelAngle));for(let i=0;i<240;i++)body.step(1/120,out.clone().multiplyScalar(3),world.colliders);
    const doorPoint=tunnelPoint(0,.7,35.65);assert.ok(body.position.distanceTo(doorPoint)>.3,'walked through the sealed door');
    for(const z of [28,20,12,9,6,3,0])walk(body,tunnelPoint(0,Math.min(.7,(Math.floor(z/.5)+1)*.035),z));
    walk(body,vector(ladder.bottomExit));climb(body,true);walk(body,vector([69.4,12,8]));
  }
});
test('directory access uses the same physical tunnel and ladder entry cannot start remotely',()=>{
  const d=world.destination('tunnel');world.setLevel(d.level,d.special);const floor=world.colliders.floorAt(d.position.x,d.position.z,.3,d.position.y+.3);assert.ok(Math.abs(floor-d.position.y)<.02);
  const body=new CharacterBody();body.teleport(71,12,0);assert.equal(LadderClimb.begin(body,ladder,false),false);body.teleport(...ladder.topExit);assert.ok(LadderClimb.begin(body,ladder,false));
  body.step(.1,new THREE.Vector3(),world.colliders);body.teleport(71,12,0);assert.equal(body.climbing,null,'travel must detach from the ladder');
});
