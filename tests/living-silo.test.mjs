import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { createResident,poseResident } from '../dist/src/resident-model.js';
import { RESIDENT_CAST } from '../dist/src/resident-data.js';
import { Population,populationRecords,CROWD_LIMITS } from '../dist/src/population.js';
import { PLAYABLE_CHARACTERS } from '../dist/src/characters.js';
import { CafeteriaOpening,cleaningSample,OPENING_DURATION,CAFETERIA_START,BOOK_POSITION } from '../dist/src/opening.js';
import { topPoint,groundY,surfaceY } from '../dist/src/surface.js';
import { tunnelPoint } from '../dist/src/void-access.js';
import { residentGLB } from '../scripts/export-residents.mjs';
import { readGLB,geometryGLTF } from '../scripts/glb.mjs';
import { SPUR, breach } from '../dist/src/passages.js';
import { SILO,levelY } from '../dist/src/data.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('the basin and tunnel mouth have one water sheet with no duplicate transparent surface',()=>{
  const world=new SiloWorld(new THREE.Scene());world.setLevel(144,'tunnel');const water=[];world.underground.root.traverse(o=>{if(o.isMesh&&o.name==='continuous-void-water')water.push(o);});assert.equal(water.length,1);assert.equal(water[0].material.depthWrite,false);world.scene.updateMatrixWorld(true);
  for(const z of [0,3.21,6.93,7.19,8.3,9.1]){const p=tunnelPoint(.27,3,z),ray=new THREE.Raycaster(p,new THREE.Vector3(0,-1,0));const hits=ray.intersectObject(water[0]);assert.equal(hits.length,1,`water overlaps or is missing at tunnel ${z}`);assert.ok(Math.abs(hits[0].point.y-5)<1e-5);}
  for(const p of [tunnelPoint(0,.7,12),tunnelPoint(1,.7,17)]){world.update(.016,p);assert.equal(world.keyLight.visible,false);assert.ok(world.localLights.every(l=>!l.visible));}
});

test('every numbered level has residents and historical cleaners are not duplicated among the living',()=>{
  assert.equal(RESIDENT_CAST.length,20);assert.equal(PLAYABLE_CHARACTERS.length,20);
  const ids=new Set();for(let n=1;n<=144;n++){const records=populationRecords(n);assert.ok(records.length>=24);assert.ok(records.some(r=>r.kind==='porter'));for(const r of records){assert.ok(!ids.has(`${n}:${r.id}`));ids.add(`${n}:${r.id}`);assert.ok(!['holston','allison','george'].includes(r.id));}}
});

test('new character rigs remain finite, grounded and bounded through walk, work, sit and climb',()=>{
  const p=new THREE.Vector3();for(const def of RESIDENT_CAST){const a=createResident(def);let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});const weights=mesh.geometry.attributes.skinWeight;
    for(let i=0;i<weights.count;i+=19)assert.ok(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i)-1)<1e-5);
    for(const pose of ['idle','work','sit','walk','jump','climb'])for(let f=0;f<4;f++){
      if(pose==='climb')a.motion.climb({cycle:f/4,grip:1});else if(pose==='walk'||pose==='jump')a.motion.sample(pose==='jump'?'Jump':'Walk',f/4);else poseResident(a,pose,f*.3);a.root.updateMatrixWorld(true);mesh.skeleton.update();let min=Infinity,max=-Infinity;
      for(let i=0;i<mesh.geometry.attributes.position.count;i+=31){mesh.getVertexPosition(i,p);assert.ok(p.toArray().every(Number.isFinite));assert.ok(Math.abs(p.x)<1&&Math.abs(p.z)<1.15,`${def.id} ${pose}: distorted limbs`);min=Math.min(min,p.y);max=Math.max(max,p.y);}
      assert.ok(min>-.15&&max<def.height*1.2,`${def.id} ${pose}: body outside human bounds (${min}, ${max})`);
    }
  }
});

test('cafeteria residents move through clear aisles, yield, and stay within the active crowd budget',()=>{
  const world=new SiloWorld(new THREE.Scene());world.setLevel(1);const body=new CharacterBody();body.position.copy(topPoint(...CAFETERIA_START));world.update(0,body.position);const population=new Population(world.scene,world);population.update(.1,body);
  const start=new Map([...population.actors].map(([id,a])=>[id,a.root.position.clone()]));
  for(let i=0;i<180;i++)population.update(1/30,body);
  assert.equal(population.count,CROWD_LIMITS.balanced);let moved=0;
  for(const[id,a]of population.actors){if(a.root.position.distanceTo(start.get(id)||a.root.position)>.3)moved++;if(!a.record.seat)assert.ok(!world.colliders.contains(a.root.position.x,a.root.position.z,.22,a.root.position.y+.04,a.root.position.y+1.5),id);}
  assert.ok(moved>=4,`Only ${moved} residents moved`);
  population.rebalance=0;population.update(.1,body,false,'marnes');assert.ok(!population.actors.has('marnes'),'selected character duplicated as an NPC');
  world.quality='low';population.rebalance=0;population.update(.1,body);assert.equal(population.count,CROWD_LIMITS.low);
});

test('the opening starts at an accessible book, plays once, releases the directory and resets cleanly',()=>{
  const world=new SiloWorld(new THREE.Scene());world.setLevel(1);const opening=new CafeteriaOpening(world),start=topPoint(...CAFETERIA_START),book=topPoint(...BOOK_POSITION),eye=start.clone().add(new THREE.Vector3(0,1.6,0));world.update(0,start);
  assert.ok(!world.colliders.contains(start.x,start.z,.3,start.y+.02,start.y+1.8));assert.ok(eye.distanceTo(book)<3);assert.equal(world.nearestInteraction(eye,book.clone().sub(eye).normalize()).action,'opening-book');
  assert.equal(opening.openBook(),false);assert.equal(opening.takeBook(),true);assert.equal(opening.takeBook(),false);
  const phases=new Set();let previous=cleaningSample(0).position,reach=0,blanks=0,covered=false;
  const camera=world.surface.camera,corner=new THREE.Vector3();
  for(let i=0;i<OPENING_DURATION*30;i++){
    opening.update(1/30);const s=cleaningSample(opening.time);phases.add(s.phase);assert.ok(s.position.distanceTo(previous)<.08,'Holston teleported');assert.ok(Math.abs(s.position.y-surfaceY(s.position.x,s.position.z))<1e-6,'Holston left the ground');previous=s.position;
    if(opening.time>19.2&&opening.time<25.8){
      // The wipe has to be a wipe: the hand stays within one stretched arm of
      // the sensor it is cleaning, and the rag it is holding has to cross the
      // lens close enough to fill the whole frame — that momentary blackout on
      // the cafeteria screen is the only thing that reads as contact from
      // inside the silo.
      reach=Math.max(reach,opening.cleaners[0].motion.bones.HandR.getWorldPosition(new THREE.Vector3()).distanceTo(world.surface.cleaningPoint));
      const cloth=opening.cleaners[0].cloth;cloth.updateWorldMatrix(true,false);camera.updateMatrixWorld(true);
      let left=1,right=-1,down=1,up=-1,behind=false;
      for(const x of [-.5,.5])for(const y of [-.5,.5])for(const z of [-.5,.5]){
        corner.set(x*.28,y*.40,z*.014).applyMatrix4(cloth.matrixWorld);
        if(corner.clone().applyMatrix4(camera.matrixWorldInverse).z>-camera.near)behind=true;
        const p=corner.project(camera);left=Math.min(left,p.x);right=Math.max(right,p.x);down=Math.min(down,p.y);up=Math.max(up,p.y);
      }
      if(!behind&&left<-1&&right>1&&down<-1&&up>1)blanks++;
      if(blanks)covered=true;
    }
  }
  assert.ok(reach<.62,`the wiping hand strayed ${reach.toFixed(2)} m from the sensor`);
  assert.ok(covered,'the rag never covers the lens, so the cafeteria screen never blanks during the clean');
  assert.ok(blanks>12&&blanks<150,`the screen is blanked on ${blanks} of 240 frames; it should flick out on each pass, not stay dark`);
  assert.deepEqual([...phases],['emerge','approach','clean','turn','walk','helmet','crawl','rest']);assert.equal(opening.state,'read-book');assert.equal(opening.surface.cleanliness,1);assert.equal(opening.surface.storyActive,false);assert.ok(opening.helmet.visible);assert.equal(opening.openBook(),true);assert.equal(opening.state,'explore');
  for(const a of opening.cleaners){assert.ok(a.root.visible&&a.feed.visible);assert.ok(a.root.position.distanceTo(a.feed.position)<1e-6);assert.ok(a.model.quaternion.angleTo(a.feed.children[0].quaternion)<1e-6);}
  assert.ok(opening.cleaners[0].root.position.distanceTo(opening.cleaners[1].root.position)<1);opening.reset();opening.update(0);assert.equal(opening.state,'find-book');assert.equal(opening.hasBook,false);assert.equal(opening.cleaners[0].root.visible,false);assert.equal(opening.book.visible,true);assert.equal(opening.helmet.visible,false);
});

test('standalone model export reloads with a genuine glTF skeleton and seven working clips',async()=>{
  const raw=residentGLB(RESIDENT_CAST.find(d=>d.id==='walker'));const {json,bin}=await readGLB(raw),gltf=await geometryGLTF(json,bin);assert.equal(gltf.animations.length,7);let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert.ok(mesh);for(const name of ['Hips','Head','HandL','HandR','ThighL','ThighR','ShinL','ShinR','FootL','FootR'])assert.ok(mesh.skeleton.bones.some(b=>b.name===name),`Missing articulated joint ${name}`);const mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations.find(c=>c.name==='Walk')).play();mixer.setTime(.4);gltf.scene.updateMatrixWorld(true);mesh.skeleton.update();const p=new THREE.Vector3();mesh.getVertexPosition(100,p);assert.ok(p.toArray().every(Number.isFinite));
  for(const clip of gltf.animations)for(const track of clip.tracks){const n=track.getValueSize();for(let i=0;i<n;i++)assert.ok(Math.abs(track.values[i]-track.values[track.values.length-n+i])<1e-5,`${clip.name} jumps at its loop boundary`);}
});

test('top landing has a visible spine and the terminal barrier joins the curved core',()=>{
  const world=new SiloWorld(new THREE.Scene());world.setLevel(1);world.scene.updateMatrixWorld(true);
  const y=levelY(1),ray=new THREE.Raycaster(new THREE.Vector3(5,y+1.6,0),new THREE.Vector3(-1,0,0));
  const hit=ray.intersectObject(world.topCore,true)[0];assert.ok(hit&&hit.distance<2,'invisible core above the top landing');
  const body=new CharacterBody({radius:.3});body.teleport(3.22,y,1.1);
  for(let i=0;i<200;i++)body.step(1/120,new THREE.Vector3(-.5,0,2),world.colliders);
  assert.ok(body.position.y>=y-.05&&body.position.z<1.65,'fell through the core/terminal parapet joint');
  assert.ok(!world.colliders.contains(5,0,.3,y+.04,y+1.7),'barrier blocks the landing centre');
});

test('the sign reveals a bounded masonry opening, reached on foot from the rear gallery',()=>{
  breach.open=false;breach.amount=0;const world=new SiloWorld(new THREE.Scene());world.setLevel(144);world.scene.updateMatrixWorld(true);
  const a=SPUR.angle,point=r=>new THREE.Vector3(Math.cos(a)*r,levelY(144),Math.sin(a)*r),heading=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
  const body=new CharacterBody({radius:.3});body.position.copy(point(53.5));
  for(let i=0;i<900;i++)body.step(1/120,heading.clone().multiplyScalar(2.5),world.colliders);
  assert.ok(Math.hypot(body.position.x,body.position.z)>SPUR.outer-.8,'invisible wall at spur entrance');
  assert.ok(Math.hypot(body.position.x,body.position.z)<SPUR.outer-.3,'closed sign was not solid');
  world.openBreach();for(let i=0;i<90;i++)world.update(1/30,body.position);
  let transition=null;for(let i=0;i<180;i++){body.step(1/120,heading.clone().multiplyScalar(2.5),world.colliders);transition=world.transitionAt(body.position);if(transition)break;}
  assert.equal(transition,'excavator');assert.ok(Math.abs(body.position.y-levelY(144))<.02,'unsupported opening floor');
  const side=point(SPUR.outer-.13).add(new THREE.Vector3(Math.sin(a),0,-Math.cos(a)).multiplyScalar(1.08));
  assert.ok(world.colliders.contains(side.x,side.z,.12,side.y+.2,side.y+1.8),'moving sign removed the masonry beside it');
  const view=point(SPUR.outer-.5).add(new THREE.Vector3(0,1.5,0));world.scene.updateMatrixWorld(true);const ray=new THREE.Raycaster(view,heading,0,1.2);
  assert.equal(ray.intersectObject(world.loaded.get(144).passages,true).length,0,'a visual wall still covers the open breach');
  const dest=world.destination(transition);world.setLevel(dest.level,dest.special);body.teleport(...dest.position.toArray());
  for(let i=0;i<420;i++)body.step(1/120,new THREE.Vector3(-2.3,0,0),world.colliders);
  assert.ok(body.position.x<73&&Math.abs(body.position.y-12)<.02,'the void arrival passage is obstructed');
  body.teleport(80.8,12,0);for(let i=0;i<100;i++){body.step(1/120,new THREE.Vector3(2,0,0),world.colliders);if(world.transitionAt(body.position))break;}
  assert.equal(world.transitionAt(body.position),'digger-passage');assert.equal(world.destination('digger-passage').level,144);
  breach.open=false;breach.amount=0;
});

test('generator and mine workers have supported routes and fixed practical lighting',()=>{
  const world=new SiloWorld(new THREE.Scene()),population=new Population(world.scene,world),body=new CharacterBody();
  for(const area of ['generator','mines']){
    const d=world.destination(area);world.setLevel(d.level,d.special);body.teleport(...d.position.toArray());world.update(0,body.position);population.update(.1,body);
    assert.ok(population.count>=6,`missing ${area} workers`);const start=new Map([...population.actors].map(([id,a])=>[id,a.root.position.clone()]));
    const lamps=area==='generator'?world.generator.lights:world.underground.mineLights,places=lamps.map(l=>l.position.clone());assert.ok(lamps.length>=4&&lamps.every(l=>l.intensity>0&&!l.castShadow));
    for(let i=0;i<210;i++)population.update(1/30,body);
    assert.ok([...population.actors].some(([id,a])=>a.root.position.distanceTo(start.get(id))>.4),`stationary ${area} patrols`);
    for(const actor of population.actors.values())assert.ok(!world.colliders.contains(actor.root.position.x,actor.root.position.z,.22,actor.root.position.y+.04,actor.root.position.y+1.5));
    world.update(.03,body.position.clone().add(new THREE.Vector3(1,0,1)));assert.ok(lamps.every((l,i)=>l.position.equals(places[i])));
  }
});
