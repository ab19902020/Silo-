import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { sign, SIGN_DEPTH } from '../dist/src/kit.js';
import { SILO, TAU } from '../dist/src/data.js';
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
  const s=bridge[0];
  assert.ok(Math.abs(Math.abs(s.position.z)-(SILO.landingHalf+.09+SIGN_DEPTH/2))<1e-6,`bridge plate at z=${s.position.z}`);
  assert.ok(s.position.x>SILO.stairRadius&&s.position.x<SILO.wellRadius,'the plate must be over the parapet run');
});

test('no gallery pylon stands in a doorway approach',()=>{
  const c=world.colliders,doorHalf=2.05;
  assert.ok(c.columns.length>=24,'the gallery pylons are missing their collision');
  for(const column of c.columns){
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
