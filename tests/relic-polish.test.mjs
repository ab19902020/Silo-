import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from '../dist/vendor/three.module.js';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {Story,COLLECTABLES} from '../dist/src/story.js';
import {SPECIALS,levelY} from '../dist/src/data.js';
import {SILO_LAYOUT} from '../dist/src/exterior-layout.js';
import {groundY} from '../dist/src/surface.js';
import {SiloWorld} from '../dist/src/world.js';
import {roomPoint} from '../dist/src/characters.js';
import {StoryProps} from '../dist/src/relics.js';
import {INTERIOR_LIGHT,floorAtmosphere} from '../dist/src/atmosphere.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('the three Blender relics load with materials, correct scale and bounded draw counts',async()=>{
 const manifest=JSON.parse(await fs.readFile('dist/assets/relics/manifest.json','utf8'));
 for(const id of ['pez','watch','georgia']){
  const raw=await fs.readFile(`dist/assets/relics/${id}.glb`),model=await new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length),'');
  assert.equal(raw.length,manifest[id].bytes);assert.ok((await fs.stat(manifest[id].source)).size>10000);
  const size=new T.Box3().setFromObject(model.scene).getSize(new T.Vector3());assert.ok(Math.max(...size.toArray())>.1&&Math.max(...size.toArray())<.3);
  let draws=0,triangles=0;model.scene.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok(o.material.isMeshStandardMaterial);}});
  assert.ok(draws<=12,`${id}: ${draws} draws`);assert.ok(triangles<22000,`${id}: ${triangles} triangles`);
 }
});
test('guidance follows the PEZ ticket and recovers the missing book before Billings',()=>{
 const s=new Story('story');s.beginSearch();s.revealHint();s.arriving(26);s.take('pez');assert.equal(s.destination.level,100);assert.equal(s.hintsShown,0);assert.equal(s.arriving(100),true);
 s.take('watch');s.inspectVoidDoor();s.take('crowbar');s.pryHideout();assert.match(s.objective,/Descend/);
 s.take('harddrive');s.reachGeorgeHome();s.terminalDiscovered();s.take('pipekit');s.openPipeCover();for(const a of ['isolate','collar','torque'])s.capPipe(a);
 assert.equal(s.destination.level,62);s.take('georgia');assert.equal(s.destination.level,1);assert.equal(s.speakToBillings().helped,true);
});
test('Free Roam admits every destination and relic without completing story prerequisites',()=>{
 const roam=new Story('explore');for(const d of SPECIALS)assert.equal(roam.travelAllowed(d.id),null,d.id);
 assert.ok(SPECIALS.some(s=>s.id==='silo17'));assert.ok(SPECIALS.some(s=>s.id==='pipe-gallery'));
 for(const item of COLLECTABLES)assert.ok(roam.take(item.id),item.id);
 assert.equal(roam.steppedOutside(),null);assert.equal(roam.sealed(68,0,'residential'),null);
});
test('every silo hatch sits below its earthen rim, and neighbouring bowls do not overlap',()=>{
 for(const s of SILO_LAYOUT){const x=26+s.x,z=108+s.z,base=groundY(x,z);assert.equal(base,14);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;assert.ok(groundY(x+Math.cos(a)*70,z+Math.sin(a)*70)>base+7);}
  for(const other of SILO_LAYOUT)if(other.id!==s.id)assert.ok(Math.hypot(s.x-other.x,s.z-other.z)>150,`${s.id}/${other.id} overlap`);
 }
});
test('all ordinary floors share a practical light tone and rear fittings illuminate a walking route',()=>{
 const w=new SiloWorld(new T.Scene());
 for(let level=1;level<=144;level++)assert.equal(floorAtmosphere(level).light,INTERIOR_LIGHT);
 for(const level of [26,62,100,144]){
  w.setLevel(level);const p=new T.Vector3(53.6,levelY(level),0);
  for(let frame=0;frame<90;frame++)w.update(1/60,p);
  assert.equal(w.sun.visible,false);assert.equal(w.sun.intensity,0);
  assert.ok(w.localLights.some(l=>l.visible&&l.userData.key?.startsWith('rear')&&l.intensity>20));
  assert.ok(w.localLights.filter(l=>l.visible).every(l=>l.color.getHex()===INTERIOR_LIGHT));
 }
});
test('every small relic has a supported, unobstructed pickup approach and remains stationary',()=>{
 const w=new SiloWorld(new T.Scene()),props=new StoryProps(w.scene,w.m),s=new Story('explore');
 for(const item of COLLECTABLES.filter(i=>!i.prop&&i.id!=='shotgun')){
  w.setLevel(item.level);const room=w.loaded.get(item.level).rooms[item.wing];
  const target=roomPoint(item.level,item.wing,...item.at);let reachable=false;
  for(let i=0;i<32&&!reachable;i++)for(const r of [1,1.6,2.4]){
   const a=i*Math.PI/16,p=target.clone().add(new T.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));p.y=levelY(item.level);
   if(w.colliders.contains(p.x,p.z,.3,p.y+.05,p.y+1.7))continue;
   if(Math.abs(w.colliders.floorAt(p.x,p.z,.3,p.y+.3)-p.y)>.1)continue;
   const eye=p.clone().add(new T.Vector3(0,1.65,0)),ray=target.clone().sub(eye);let blocked=false;
   for(let t=.35;t<ray.length()-.5;t+=.2){const q=eye.clone().addScaledVector(ray,t/ray.length());if(w.colliders.contains(q.x,q.z,.06,q.y-.06,q.y+.06)){blocked=true;break;}}
   if(!blocked)reachable=true;
  }
  assert.ok(reachable,`${item.id}: no physical pickup approach`);
  props.update(0,0,s,item.level,null);const model=props.inspectionModel(item.id),before=model.position.clone();props.update(1/60,10,s,item.level,null);assert.ok(model.position.equals(before),`${item.id} floats`);
 }
});
test('the outer plain is level, craters are circular, and the sensor cannot see neighbouring hatches',async()=>{
 const {sensorLocal}=await import('../dist/src/surface.js'),eye=sensorLocal();
 assert.equal(groundY(10000,10000),groundY(-10000,10000));
 for(const s of SILO_LAYOUT){
  for(const radius of [35,50,70,80]){const expected=groundY(26+s.x+radius,108+s.z);for(let i=1;i<36;i++){const a=i*Math.PI/18;assert.ok(Math.abs(groundY(26+s.x+Math.cos(a)*radius,108+s.z+Math.sin(a)*radius)-expected)<1e-8);}}
  if(s.id===18)continue;
  const target=new T.Vector3(26+s.x,14.8,108+s.z);let occluded=false;
  for(let t=.01;t<1;t+=.01){const p=eye.clone().lerp(target,t);if(groundY(p.x,p.z)>p.y){occluded=true;break;}}
  assert.ok(occluded,`the cafeteria sensor can see silo ${s.id}`);
 }
});
