import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { sign, SIGN_DEPTH } from '../dist/src/kit.js';
import { SILO, TAU, STAIR_SWEEP, landingAngle } from '../dist/src/data.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

const world=new SiloWorld(new THREE.Scene());
const LEVEL=50;world.setLevel(LEVEL);
const root=world.loaded.get(LEVEL).root;
const signs=[];root.updateMatrixWorld(true);
root.traverse(o=>{if(o._signMaterial&&o.parent.parent===root)signs.push(o.parent);});

test('a sign is a mounted plate, not a floating pane of text',()=>{
  const s=sign('LEVEL 050',3,.6);
  const plate=s.children.find(c=>c.geometry?.type==='BoxGeometry');
  const face=s.children.find(c=>c.geometry?.type==='PlaneGeometry');
  assert.ok(plate,'a sign needs a physical backing plate; a bare plane vanishes edge-on');
  assert.ok(face,'a sign needs a printed face');
  assert.ok(plate.geometry.parameters.depth===SIGN_DEPTH);
  assert.ok(face.position.z>plate.geometry.parameters.depth/2,'the face must sit proud of its plate');
  // Wider than the plate would leave the print hanging over the edge.
  assert.ok(plate.geometry.parameters.width>3&&plate.geometry.parameters.height>.6);
  assert.ok(face._signMaterial.emissiveMap,'signs stay legible on the dark levels');
});

test('every wing sign is bolted flat to the gallery wall, none left hanging in the walkway',()=>{
  const onWall=signs.filter(s=>Math.hypot(s.position.x,s.position.z)>20);
  assert.equal(onWall.length,12,`expected a level plate and a department plate per wing, found ${onWall.length}`);
  for(const s of onWall){
    const radius=Math.hypot(s.position.x,s.position.z);
    // The outer wall steps back above the door head: O-.2 below 3.35 m, O-.3 above.
    const wall=s.position.y<3.35?SILO.deckOuter-.2:SILO.deckOuter-.3;
    const gap=wall-(radius+SIGN_DEPTH/2);
    assert.ok(Math.abs(gap)<.02,`sign at y=${s.position.y.toFixed(2)} floats ${gap.toFixed(3)} m off the wall`);
  }
});

test('the bridge plate sits on the parapet rather than in mid air',()=>{
  const bridge=signs.filter(s=>Math.hypot(s.position.x,s.position.z)<20);
  assert.equal(bridge.length,1);
  const s=bridge[0].clone();s.position.applyAxisAngle(new THREE.Vector3(0,1,0),landingAngle(LEVEL));
  assert.ok(Math.abs(Math.abs(s.position.z)-(SILO.landingHalf+.09+SIGN_DEPTH/2))<1e-6,`bridge plate at z=${s.position.z}`);
  assert.ok(s.position.x>SILO.stairRadius&&s.position.x<SILO.wellRadius,'the plate must be over the parapet run');
});

test('no gallery pylon stands in a doorway approach',()=>{
  const c=world.colliders,doorHalf=2.05;
  assert.ok(c.columns.length>=24,'the gallery pylons are missing their collision');
  for(const column of c.columns.filter(c=>Math.hypot(c.cx,c.cz)>SILO.wellRadius+1)){
    const angle=Math.atan2(column.cz,column.cx),radius=Math.hypot(column.cx,column.cz);
    // Shortest angle to any of the six wing centres, as an arc distance.
    let nearest=Infinity;
    for(let wing=0;wing<6;wing++){
      const d=Math.abs(((angle-wing*TAU/6)%TAU+TAU+Math.PI)%TAU-Math.PI);
      nearest=Math.min(nearest,d*radius);
    }
    assert.ok(nearest-column.radius>doorHalf+1.5,
      `a pylon edge is ${(nearest-column.radius).toFixed(2)} m from a door centre, inside the ${doorHalf} m opening plus clearance`);
  }
});

test('a body can walk straight out of every wing without meeting a column',()=>{
  const dt=1/120;
  for(let wing=0;wing<6;wing++){
    const a=wing*TAU/6,body=new CharacterBody({radius:.3,stepHeight:.3});
    const y=world.loaded.get(LEVEL).root.position.y;
    body.teleport(Math.cos(a)*(SILO.deckOuter-1.2),y,Math.sin(a)*(SILO.deckOuter-1.2));
    const target=new THREE.Vector3(Math.cos(a)*(SILO.wellRadius+1.5),y,Math.sin(a)*(SILO.wellRadius+1.5));
    for(let i=0;i<3000&&body.position.distanceTo(target)>.2;i++){
      const to=target.clone().sub(body.position);to.y=0;
      body.step(dt,to.normalize().multiplyScalar(2.6),world.colliders);
    }
    assert.ok(body.position.distanceTo(target)<.35,`wing ${wing}: blocked leaving the doorway`);
  }
});

// --- landings and the way to the digger ------------------------------------
const { SPUR, breach } = await import('../dist/src/passages.js');

// Walking downstairs also loses height. A fall is free flight: the body reaches
// a downward speed no staircase in the silo could ever give it.
function freeFalls(level){
  world.setLevel(level);
  const y=world.loaded.get(level).root.position.y,dt=1/120,found=[];
  const starts=[];
  for(let x=8;x<=17.5;x+=1.2)starts.push(new THREE.Vector3(x,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),-landingAngle(level)).setY(y));
  for(let j=0;j<10;j++){const a=landingAngle(level)+j*STAIR_SWEEP/SILO.stairSteps,r=(SILO.stairColumn+SILO.stairRadius)/2;
    starts.push(new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r));}
  for(const p of starts){
    const floor=world.colliders.floorAt(p.x,p.z,.3,p.y+.8);
    if(!Number.isFinite(floor)||Math.abs(floor-p.y)>.9)continue;
    // A capsule initially straddling the outside of the terminal barrier is
    // already in the void. Exercise every valid standing start instead.
    if(world.colliders.contains(p.x,p.z,.3,floor+.01,floor+1.78))continue;
    for(let d=0;d<24;d++){
      const a=d*TAU/24,dir=new THREE.Vector3(Math.cos(a),0,Math.sin(a)).multiplyScalar(3.8);
      const b=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3});
      b.teleport(p.x,floor,p.z);
      let worst=0;
      for(let i=0;i<420;i++){b.step(dt,dir,world.colliders);if(b.velocity.y<worst)worst=b.velocity.y;}
      if(worst<-6)found.push(`from ${p.x.toFixed(1)},${p.z.toFixed(1)} heading ${Math.round(a*180/Math.PI)}° (${worst.toFixed(1)} m/s)`);
    }
  }
  return found;
}

test('the top and bottom landings cannot be walked off',()=>{
  // Every other level has the next flight arriving at the landing; these two
  // have an open stairwell on that side instead, and used to let you straight in.
  for(const level of [1,144]){
    const falls=freeFalls(level);
    assert.equal(falls.length,0,`level ${level}: ${falls.length} way(s) to fall off — ${falls[0]}`);
  }
});

test('mid-silo landings stay walkable and still cannot be fallen from',()=>{
  for(const level of [2,50,143])assert.equal(freeFalls(level).length,0,`level ${level} lets you fall`);
});

test('the digger passage is a dead end until the notice is moved',()=>{
  const spurEnd=new THREE.Vector3(Math.cos(SPUR.angle)*(SPUR.outer-2.4),0,Math.sin(SPUR.angle)*(SPUR.outer-2.4));
  const reach=()=>{
    world.loaded.forEach((e,n)=>{e.root.parent?.remove(e.root);world.loaded.delete(n);});
    world.setLevel(SPUR.level);
    const y=world.loaded.get(SPUR.level).root.position.y;
    const here=world.interactions.filter(i=>Math.hypot(i.position.x-spurEnd.x,i.position.z-spurEnd.z)<3);
    // Can a body stand at the end of the spur, and is the end wall solid?
    const b=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3});
    b.teleport(spurEnd.x,y,spurEnd.z);
    const out=new THREE.Vector3(Math.cos(SPUR.angle),0,Math.sin(SPUR.angle)).multiplyScalar(3);
    for(let i=0;i<360;i++)b.step(1/120,out,world.colliders);
    return {here,radius:Math.hypot(b.position.x,b.position.z)};
  };
  breach.open=false;
  const sealed=reach();
  assert.equal(sealed.here.length,1,'the spur should offer exactly one thing to do');
  assert.equal(sealed.here[0].action,'breach');
  assert.equal(sealed.here[0].destination,undefined,'a sealed wall must not travel anywhere');
  assert.ok(sealed.radius<SPUR.outer-.3,`walked through the sealed end wall to r=${sealed.radius.toFixed(2)}`);

  breach.open=true;
  const open=reach();
  assert.equal(open.here.length,1);
  assert.equal(open.here[0].destination,'excavator','once through, the wall leads to the excavator');
  breach.open=false;
  // And the wing itself no longer offers a direct way down to the excavator.
  world.loaded.forEach((e,n)=>{e.root.parent?.remove(e.root);world.loaded.delete(n);});
  world.setLevel(SPUR.level);
  assert.ok(!world.interactions.some(i=>i.destination==='excavator'&&Math.hypot(i.position.x,i.position.z)<40),
    'the excavator must not still be reachable straight from the Mechanical wing');
});
