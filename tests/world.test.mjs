import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import { GLTFLoader } from '../dist/vendor/GLTFLoader.js';
import { SiloWorld } from '../dist/src/world.js';
import { SILO, LEVELS, LANDMARKS, SPECIALS, TAU, levelY, roomType, roomsForLevel, STAIR_SWEEP, landingAngle, landingPoint } from '../dist/src/data.js';
import { CharacterBody } from '../dist/src/physics.js';

// Only a text-canvas adapter: no browser, DOM rendering or WebGL QA is implied.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const scene=new THREE.Scene(),world=new SiloWorld(scene);
world.setLevel(1);

test('all 144 numbered levels and all requested landmark categories exist',()=>{
  assert.equal(LEVELS.length,144);assert.deepEqual(LEVELS.map(x=>x.level),Array.from({length:144},(_,i)=>i+1));
  for(const type of ['cafeteria','it','judicial','medical','farm','water','recycling','workshop','generator'])assert.ok([...LEVELS.flatMap(l=>roomsForLevel(l.level)),...SPECIALS].some(l=>l.type===type),type);
  for(const id of ['mines','excavator','tunnel'])assert.ok(SPECIALS.some(l=>l.id===id));
  assert.equal(SILO.stairSteps*(SILO.levels-1),10296);
});

test('every original Lost Signal asset parses as glTF with finite geometry',async()=>{
  // Recursive, so the weapons in guns/ are checked on the same terms as the
  // interior props beside them.
  const root=new URL('../dist/assets/lost-signal/',import.meta.url);
  const entries=await fs.readdir(root,{recursive:true});
  let checked=0;
  for(const entry of entries){
    if(!entry.endsWith('.glb'))continue;
    const buf=await fs.readFile(new URL(entry,root));
    const array=buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
    const gltf=await new GLTFLoader().parseAsync(array,'');
    let count=0;
    gltf.scene.traverse(o=>{if(o.isMesh){count++;assert.ok(o.geometry.attributes.position.count>0,entry);
      for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v),`${entry} has a non-finite vertex`);}});
    assert.ok(count>0,entry);checked++;
  }
  assert.ok(checked>=30,`only ${checked} models were checked`);
});

test('every weapon on the rack has a mesh, a magazine and a way to be heard',async()=>{
  const {WEAPONS,USABLE_WEAPON_KEYS,shotInterval}=await import('../dist/src/weapons.js');
  const {fireSampleForWeapon,reloadSamplesForWeapon,GUN_SAMPLE_URLS}=await import('../dist/src/gun-samples.js');
  assert.ok(USABLE_WEAPON_KEYS.length>=24,`only ${USABLE_WEAPON_KEYS.length} usable weapons`);
  for(const key of USABLE_WEAPON_KEYS){
    const spec=WEAPONS[key];
    assert.ok(spec.model,`${key} names no mesh`);
    const file=new URL(`../dist/assets/lost-signal/guns/weapon_${spec.model}_v1.glb`,import.meta.url);
    assert.ok(await fs.stat(file).then(()=>true,()=>false),`${key} points at a mesh that is not there: ${spec.model}`);
    assert.ok(spec.kick,`${key} has no recoil profile`);
    if(spec.kind==='melee')continue;
    assert.ok(spec.magazine>0&&spec.reserve>=0,`${key} has no ammunition`);
    assert.ok(shotInterval(spec)>0&&shotInterval(spec)<2,`${key} fires at ${spec.rpm} rpm`);
    // Either a recording belongs to it or its own modelled voice does; a
    // weapon that is silent when fired is the one thing that cannot ship.
    const sample=fireSampleForWeapon(spec);
    assert.ok(sample?GUN_SAMPLE_URLS[sample]:spec.audio?.fire,`${key} makes no sound when fired`);
    // A reload that schedules nothing is a reload the player cannot hear.
    assert.ok(reloadSamplesForWeapon(spec).length>0,`${key} reloads in silence`);
  }
});

test('the range is behind the station, and everything downrange of the line',async()=>{
  const {RANGE}=await import('../dist/src/gun-range.js');
  // The shooter stands nearest the door and fires away from it. If the targets
  // ever ended up between the firing line and the door, the lanes would point
  // back into the sheriff's office.
  assert.ok(RANGE.line<RANGE.door,'the firing line must be inside the room');
  assert.ok(RANGE.targets<RANGE.line,'the targets must be downrange of the shooter');
  assert.ok(RANGE.backstop<RANGE.targets,'the backstop must be behind the targets');
  assert.ok(RANGE.line-RANGE.targets>=10,`only ${(RANGE.line-RANGE.targets).toFixed(1)} m of range`);
});

test('all structural instances and generated rooms have finite geometry',()=>{
  let triangles=0,draws=0;
  scene.traverse(o=>{if(!o.isMesh)return;draws++;const p=o.geometry.getAttribute('position');for(let i=0;i<p.array.length;i++)assert.ok(Number.isFinite(p.array[i]),`Non-finite vertex ${o.uuid}`);if(o.isInstancedMesh){for(const n of o.instanceMatrix.array)assert.ok(Number.isFinite(n));}triangles+=(o.geometry.index?.count||p.count)/3*(o.count||1);});
  console.log(`Initial scene: ${draws} mesh batches; ${Math.round(triangles).toLocaleString()} triangles before visibility culling.`);
  assert.ok(triangles<7_000_000,'Keep complete geometry below the mobile budget');
});

test('all 144 gallery bridges have continuous support and no wall across the path',()=>{
  for(let n=1;n<=144;n++){
    world.activeLevel=n;world.special=null;world.rebuildCollision();const y=levelY(n);
    for(let r=SILO.stairColumn+.4;r<24;r+=.17){const {cx:x,cz:z}=landingPoint(n,r);assert.ok(world.colliders.floorAt(x,z,.24,y+.2)>=y-.02,`No floor on level ${n}, r ${r}`);const p=new THREE.Vector3(x,y,z);world.colliders.resolve(p,.24,y+.01,y+1.7,.3);assert.ok(Math.hypot(p.x-x,p.z-z)<.04,`Blocked landing on level ${n}, r ${r}`);}
  }
});

test('stair surface is continuous in both directions across 143 level intervals',()=>{
  const r=5.15;
  for(let n=2;n<=144;n++){
    world.activeLevel=n;world.special=null;world.rebuildCollision();const base=levelY(n);
    let previous=base;
    for(let i=0;i<432;i++){
      const a=landingAngle(n)+(i+.5)*STAIR_SWEEP/432,x=Math.cos(a)*r,z=Math.sin(a)*r;
      const floor=world.colliders.floorAt(x,z,.23,previous+.31);assert.ok(floor>=previous-.02&&floor<=previous+.31,`Stair gap ${n}:${i} (${floor-previous})`);previous=floor;
      const p=new THREE.Vector3(x,floor,z);world.colliders.resolve(p,.23,floor+.005,floor+1.7,.3);assert.ok(Math.hypot(p.x-x,p.z-z)<.045,`Stair obstructed ${n}:${i}`);
    }assert.ok(Math.abs(previous-base-SILO.levelHeight)<.02,`Stair ${n} never reached the next level`);
  }
});

test('a walking body can ascend and descend a full stair flight',()=>{
  for(const n of [61,62,63]){const base=levelY(n),r=5.15,dt=1/120,offset=landingAngle(n);world.setLevel(n);const c=world.colliders;
  for(const sign of [1,-1]){
    const b=new CharacterBody({radius:.28,stepHeight:.3});let a=offset+(sign>0?.01:STAIR_SWEEP-.01);
    const startY=c.floorAt(Math.cos(a)*r,Math.sin(a)*r,.28,base+(a-offset)/STAIR_SWEEP*10+.3);b.teleport(Math.cos(a)*r,startY,Math.sin(a)*r);
    const travel=STAIR_SWEEP-.05,steps=Math.ceil(travel*r/2.4/dt);
    for(let i=0;i<steps;i++){const current=Math.atan2(b.position.z,b.position.x),radial=new THREE.Vector3(b.position.x,0,b.position.z).normalize();const desired=new THREE.Vector3(-Math.sin(current)*sign,0,Math.cos(current)*sign).multiplyScalar(2.4);desired.addScaledVector(radial,(r-Math.hypot(b.position.x,b.position.z))*4);b.step(dt,desired,c);}
    assert.ok(Math.abs(b.position.y-(sign>0?base+10:base))<.65,`Walking ${sign>0?'up':'down'} ended at ${b.position.y-base}m`);
  }}
});

test('doors collide when closed and all six rotated openings admit a player',()=>{
  for(const n of [1,14,19,50,55,62,97,130,144]){
    world.setLevel(n);const e=world.loaded.get(n),y=levelY(n);
    for(const d of e.doors){const a=d.wing*TAU/6;d.amount=0;d.open=false;world.rebuildCollision();
      let p=new THREE.Vector3(Math.cos(a)*SILO.deckOuter,y,Math.sin(a)*SILO.deckOuter);const original=p.clone();world.colliders.resolve(p,.3,y+.01,y+1.7,.3);assert.ok(p.distanceTo(original)>.2,`Closed door ${n}:${d.wing} must stop the body`);
      d.amount=1;d.open=true;world.rebuildCollision();
      for(let r=24.8;r<28.1;r+=.2){p=new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);const q=p.clone();world.colliders.resolve(p,.3,y+.01,y+1.7,.3);assert.ok(p.distanceTo(q)<.06,`Open door blocked ${n}:${d.wing}, r=${r}`);assert.ok(world.colliders.floorAt(q.x,q.z,.3,y+.3)>=y-.01);}
    }
  }
});

test('every furnished wing template can be constructed and contains actual interior geometry',()=>{
  const seen=new Set();for(let n=1;n<=144;n++)for(let w=0;w<6;w++)seen.add(roomType(n,w));
  const built=new Set();
  for(const n of [...new Set([...LANDMARKS.map(l=>l.level),9,16,22])]){world.setLevel(n);for(const room of world.loaded.get(n).rooms){built.add(room.userData.type);assert.ok(room.userData.solids.length>5,`${room.userData.type} missing furniture or walls`);assert.ok(room.children.length>1);}}
  for(const type of seen)assert.ok(built.has(type),`No constructed ${type}`);
  assert.ok(world.loaded.size<=5,'Floor streaming must stay bounded');
});

test('all directory destinations spawn on supported, unobstructed floor',()=>{
  for(const id of [1,14,19,20,50,55,62,97,130,144,'airlock','surface','generator','mines','excavator','tunnel']){
    const d=world.destination(id);world.setLevel(d.level,d.special||null);const p=d.position.clone(),c=world.colliders,y=p.y;
    assert.ok(Math.abs(c.floorAt(p.x,p.z,.28,y+.3)-y)<.03,`${id}: unsupported spawn`);c.resolve(p,.28,y+.01,y+1.7,.3);assert.ok(p.distanceTo(d.position)<.05,`${id}: spawn overlaps a wall`);
  }
});

test('lower access portals have supported approaches and return destinations',()=>{
  for(const item of world.underground.interactions){assert.ok(item.destination!==undefined||item.action);if(item.destination!==undefined)assert.ok(world.destination(item.destination));}
  world.setLevel(144,'excavator');for(let x=7.5;x<=72;x+=.4)assert.equal(world.colliders.floorAt(x,0,.28,12.3),12);
});
