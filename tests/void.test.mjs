import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

const world=new SiloWorld(new THREE.Scene());
world.setLevel(144,'excavator');
const at=(r,a,y)=>new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
// Below-silo interactions hang off the built space, not the numbered levels.
const voidInteractions=()=>world.underground.interactions.map(v=>({...v,position:new THREE.Vector3(...v.position)}));
// Walk toward a target the way the controller does: horizontal intent only,
// gravity and stepping resolved by the same integration the game runs.
function walk(body,target,seconds=26){
  const dt=1/120;
  for(let i=0;i<seconds/dt;i++){
    const to=target.clone().sub(body.position);to.y=0;
    if(to.length()<.16)return;
    body.step(dt,to.normalize().multiplyScalar(2.4),world.colliders);
  }
  assert.fail(`stuck at ${body.position.toArray().map(n=>n.toFixed(2))} heading for ${target.toArray().map(n=>n.toFixed(2))}`);
}

const DECK=12,STAIR_A=4.1,STAIR_SWEEP=1.745,TREADS=24,BASE=DECK-TREADS*.273;
const END_A=STAIR_A+STAIR_SWEEP,DOOR_A=END_A-.06+.42;

test('the caged stair carries a walking body from the platform down to the waterline',()=>{
  const body=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3});
  body.teleport(...at(5.6,STAIR_A,DECK).toArray());
  // Out onto the head of the stair, then down every tread on the centre line.
  walk(body,at(9.5,STAIR_A+.03,DECK));
  for(let i=1;i<=TREADS;i++)walk(body,at(9.5,STAIR_A+STAIR_SWEEP*i/TREADS,DECK-i*.273),8);
  assert.ok(Math.abs(body.position.y-BASE)<.4,`ended at y=${body.position.y.toFixed(2)}, expected about ${BASE}`);
  // Across the landing to the tower base, where the lower door is set.
  walk(body,at(9,DOOR_A,BASE));
  walk(body,at(4.6,DOOR_A,BASE));
  assert.ok(Math.abs(body.position.y-BASE)<.35,`landing height ${body.position.y.toFixed(2)}`);
  assert.ok(Math.hypot(body.position.x,body.position.z)<5.4,'did not reach the tower base');
  // The lower door is reachable from where the descent ends.
  const eye=body.position.clone();eye.y+=1.65;
  const door=voidInteractions().find(i=>i.label==='Open the lower door');
  assert.ok(door,'the lower door interaction is missing');
  assert.ok(eye.distanceTo(door.position)<4,`door is ${eye.distanceTo(door.position).toFixed(2)} m from the foot of the stair`);
});

test('the descent is a stair, not a drop: no single step exceeds the step height',()=>{
  const rises=[];
  for(let i=1;i<=TREADS;i++)rises.push((DECK-(i-1)*.273)-(DECK-i*.273));
  assert.equal(rises.length,TREADS);
  for(const rise of rises)assert.ok(rise<=.3+1e-9,`a ${rise.toFixed(3)} m rise is taller than the controller can step`);
  assert.ok(BASE>5,`the landing at ${BASE} must stay clear of the water surface at y=5`);
});

test("Juliette's camp is a walkable bay with solid walls and a way back out",()=>{
  const body=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3});
  body.teleport(...at(5.5,Math.PI,DECK).toArray());
  walk(body,new THREE.Vector3(-8,DECK,0));              // in through the open side
  assert.ok(Math.abs(body.position.y-DECK)<.35,'the camp floor did not carry the body');
  const inside=body.position.clone();
  // The salvaged plate walls stop you: pushing hard at one for two seconds
  // must not put you outside the camp.
  const dt=1/120;
  for(let i=0;i<240;i++)body.step(dt,new THREE.Vector3(0,0,4),world.colliders);
  assert.ok(body.position.z<3.5,`walked through the camp wall to z=${body.position.z.toFixed(2)}`);
  body.teleport(...inside.toArray());
  walk(body,at(5.5,Math.PI,DECK));                      // and back out onto the platform
});

test('the camp and the lower door are both reachable interactions',()=>{
  const labels=voidInteractions().map(i=>i.label);
  for(const wanted of ['Look behind the curtain','Inspect the salvaged relics','Open the lower door'])
    assert.ok(labels.includes(wanted),`missing interaction: ${wanted}`);
  const door=voidInteractions().find(i=>i.label==='Open the lower door');
  assert.equal(door.destination,'tunnel');
  assert.ok(door.position.y<7,'the lower door must sit down at the waterline, not up on the ledge');
});
