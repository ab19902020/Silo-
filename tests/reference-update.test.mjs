import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { SILO,STAIR_SWEEP,landingAngle,landingPoint,levelY } from '../dist/src/data.js';
import { cleaningSample,ALLISON_REST } from '../dist/src/opening.js';
import { topPoint,groundY,sensorLocal,SENSOR,TREE } from '../dist/src/surface.js';
import { readGLB,geometryGLTF } from '../scripts/glb.mjs';
import { SkeletalMotion } from '../dist/src/locomotion.js';
import { CharacterBody,ColliderSet } from '../dist/src/physics.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const world=new SiloWorld(new T.Scene());world.setLevel(1);

test('near and distant bridge transforms use the same three bearings through all 144 floors',()=>{
  for(const active of [1,50,98,144]){
    world.updateStructure(active);let bridges=0,flights=0;
    for(const group of [world.landings,world.distantLandings]){
      const mesh=group.children[0],m=new T.Matrix4();
      for(let i=0;i<mesh.count;i++){
        mesh.getMatrixAt(i,m);const level=1+Math.round((levelY(1)-m.elements[13])/10),p=new T.Vector3(12,0,0).applyMatrix4(m),expected=landingPoint(level,12);
        assert.ok(Math.hypot(p.x-expected.cx,p.z-expected.cz)<1e-5);bridges++;
      }
    }
    for(const group of [world.stairs,world.distantStairs])flights+=group.children[0].count;
    assert.equal(bridges,144);assert.equal(flights,143);
  }
  world.updateStructure(3);world.scene.updateMatrixWorld(true);
  // A ray must hit visible slab under each walkable bridge, not just its collider.
  for(const level of [1,2,3]){const p=landingPoint(level,12),ray=new T.Raycaster(new T.Vector3(p.cx,levelY(level)+.5,p.cz),new T.Vector3(0,-1,0),0,.8);assert.ok(ray.intersectObject(world.landings,true).length,`invisible bridge ${level}`);}
});

test('cleaner emerges away from the sensor, turns, and approaches without crossing ramp walls',()=>{
  world.setLevel(1);const eye=sensorLocal();
  for(const t of [3,6]){const a=cleaningSample(t),b=cleaningSample(t+.02),forward=new T.Vector3(Math.sin(a.heading),0,Math.cos(a.heading));assert.ok(b.position.clone().sub(a.position).dot(forward)>0);assert.ok(forward.dot(a.position.clone().sub(eye))>0,'not showing the cleaner’s back');}
  for(const t of [14,16]){const a=cleaningSample(t),b=cleaningSample(t+.02),forward=new T.Vector3(Math.sin(a.heading),0,Math.cos(a.heading));assert.ok(b.position.clone().sub(a.position).dot(forward)>0,'walking backwards');assert.ok(forward.dot(eye.clone().sub(a.position))>0,'not approaching camera');}
  for(let t=0;t<30;t+=.08){const local=cleaningSample(t).position,p=topPoint(...local.toArray());assert.ok(!world.colliders.contains(p.x,p.z,.26,p.y+.025,p.y+1.75),`cleaner crosses a wall at ${t}`);assert.ok(Math.abs(world.colliders.floorAt(p.x,p.z,.26,p.y+.25)-p.y)<.02,`unsupported cleaner at ${t}`);}
  assert.equal(world.surface.feedRoot.getObjectByName('exterior-sensor-housing'),undefined);
});

test('the panorama includes sky above the crater and night lighting reaches both exterior views',()=>{
  const s=world.surface;s.camera.updateMatrixWorld(true);const eye=sensorLocal();let horizon=-Infinity;
  for(let z=eye.z+35;z<=eye.z+800;z+=4){const p=topPoint(eye.x,groundY(eye.x,z),z).project(s.camera);horizon=Math.max(horizon,p.y);}
  assert.ok(horizon<.40&&horizon>-.45,`horizon at ${horizon}; reserve at least 30% of the image for sky`);
  s.setTimeOfDay('night');s.update(0);assert.equal(s.sky.daylight,0);assert.equal(s.sky.feed.material,s.sky.mesh.material);assert.equal(s.sky.material.uniforms.day.value,0);assert.ok(s.feedAmbient.intensity<.2);
  s.setTimeOfDay('cycle');s.update(600);assert.equal(s.sky.daylight,0);s.update(600);assert.equal(s.sky.daylight,1);
  s.setTimeOfDay('day');s.update(0);assert.equal(s.sky.daylight,1);assert.equal(s.feedAmbient.intensity,2);
  assert.equal(world.loaded.get(1).rooms[0].getObjectByName('cafeteria-petal-ceiling').userData.petals,16);
});

test('all three supplied rigs distinguish jump ascent, fall and grounded recovery',async()=>{
  for(const [id,height] of [['juliette',1.73],['sims',1.83],['bernard',1.87]]){
    const {json,bin}=await readGLB(new URL(`../dist/assets/characters/${id}.glb`,import.meta.url)),gltf=await geometryGLTF(json,bin),motion=new SkeletalMotion(gltf.scene,height),body=new CharacterBody({standHeight:height}),colliders=new ColliderSet();
    colliders.addRing({innerRadius:0,outerRadius:30,minY:-1,maxY:0,climbable:true});body.teleport(0,0,0);const states=new Set();
    for(let i=0;i<180;i++){body.step(1/60,new T.Vector3(0,0,1.4),colliders,{jump:i===30});gltf.scene.position.copy(body.position);gltf.scene.updateMatrixWorld(true);motion.update(1/60,{speed:body.horizontalSpeed,position:body.position,grounded:body.grounded,impact:body.landingImpact,ground:()=>0});states.add(motion.state);for(const b of Object.values(motion.bones))assert.ok(b.quaternion.toArray().every(Number.isFinite));}
    assert.ok(states.has('Jump')&&states.has('Fall'),`${id}: ${[...states]}`);assert.ok(body.grounded&&motion.air<.001);assert.ok(motion.legs.every(l=>l.error<.02));
  }
});

test('each landing has one visible top face, without overlapping flat treads',()=>{
  world.updateStructure(3);world.scene.updateMatrixWorld(true);
  for(const level of [1,2,3])for(const side of [-1,1]){
    const p=landingPoint(level,5.123,side*.623),ray=new T.Raycaster(new T.Vector3(p.cx,levelY(level)+.5,p.cz),new T.Vector3(0,-1,0),0,.7);
    const faces=ray.intersectObjects([world.landings,world.stairs],true).filter(h=>Math.abs(h.distance-.5)<.0001);
    assert.equal(faces.length,1,`level ${level} side ${side}: ${faces.length} coplanar top faces`);
  }
});


test('the centred sensor frames the whole cleaner, stair lip and body on the right slope',()=>{
  const s=world.surface;s.camera.updateMatrixWorld(true);assert.equal(SENSOR.x,26);
  const feet=cleaningSample(8).position,foot=topPoint(...feet.toArray()).project(s.camera),head=topPoint(feet.x,feet.y+1.8,feet.z).project(s.camera);
  assert.ok(Math.abs(foot.x)<.001&&Math.abs(head.x)<.001);assert.ok(foot.y>-.98&&head.y<.9);
  const lip=topPoint(26,14,108).project(s.camera);assert.ok(lip.y>-.98&&lip.y<-.55,`stair lip ${lip.y}`);
  const body=topPoint(ALLISON_REST[0],groundY(...ALLISON_REST)+.25,ALLISON_REST[1]).project(s.camera);
  assert.ok(body.x>.3&&body.x<.8&&Math.abs(body.y)<.85);
  const tree=world.surface.feedRoot.getObjectByName('dead-tree'),bounds=new T.Box3().setFromObject(tree),tip=new T.Vector3(TREE.z+SILO.deckOuter,bounds.max.y,-TREE.x).project(s.camera);assert.ok(tip.y<1,'tree crown cropped');
});
