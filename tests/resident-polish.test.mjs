import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createResident,poseResident,disposeResident} from '../dist/src/resident-model.js';
import {Population,populationRecords} from '../dist/src/population.js';
import {SiloWorld} from '../dist/src/world.js';
import {CharacterBody} from '../dist/src/physics.js';
import {siloSchedule} from '../dist/src/silo-time.js';
import {capturedPose} from '../dist/src/captured-motion.js';
import {leadArmPose} from '../dist/src/arm-motion.js';
globalThis.document??={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

const resident=height=>createResident({id:'polish-'+height,name:'Resident',height,appearance:{outfit:'coat'}},{cache:false});
test('short and tall seated residents keep both ankles on the floor at a fixed chair height',()=>{
 for(const height of [1.55,1.75,1.95]){
  const a=resident(height);a.root.position.set(8,12,-4);a.root.rotation.y=1.2;a.ground=()=>12;
  for(const pose of ['sit','read']){
   poseResident(a,pose,3,1/60);assert.equal(a.motion.bones.Hips.position.y,.525);
   for(const leg of a.motion.legs){const p=a.motion.bones['Foot'+leg.side].getWorldPosition(new T.Vector3());assert.ok(Math.abs(p.y-12-leg.ankle.y)<.005,`${height}/${pose}/${leg.side}: ankle ${p.y}`);assert.ok(leg.error<.005);}
  }disposeResident(a);
 }
});
test('resident culling bounds include animated skin through seated, working, walking and running poses',()=>{
 for(const height of [1.55,1.95]){
  const a=resident(height);let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert.equal(mesh.frustumCulled,true);a.ground=()=>0;
  const v=new T.Vector3();
  const check=pose=>{a.root.updateMatrixWorld(true);mesh.skeleton.update();for(let i=0;i<mesh.geometry.attributes.position.count;i++)assert.ok(mesh.boundingSphere.containsPoint(mesh.getVertexPosition(i,v)),`${height}/${pose}: vertex ${i} clipped`);};
  for(const pose of ['sit','read','work','talk','watch']){poseResident(a,pose,2,1/60);check(pose);}
  for(const speed of [0,1.45,3.8])for(let frame=0;frame<90;frame++){
   a.root.position.z+=speed/60;poseResident(a,speed?'walk':'idle',frame/60,1/60,speed);if(frame%15===0)check('gait '+speed);
  }
  for(let frame=0;frame<8;frame++){a.motion.sample('Jump',frame*.12);check('jump');a.motion.climb({cycle:frame/8,grip:1});check('climb');}
  const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().makePerspective(-1,1,1,-1,1,30));
  a.root.position.set(0,0,-5);a.root.updateMatrixWorld(true);assert.ok(frustum.intersectsObject(mesh));
  a.root.position.x=100;a.root.updateMatrixWorld(true);assert.equal(frustum.intersectsObject(mesh),false);
  disposeResident(a);
 }
});
test('reusable motion outputs match independent snapshots without sharing data between people',()=>{
 let reuse=null,arms={};
 for(const style of ['engineer','security','measured'])for(const phase of [0,.17,.6,.99,1])for(const run of [0,.4,1]){
  const snapshot=capturedPose(style,phase,run);reuse=capturedPose(style,phase,run,reuse);assert.deepEqual(reuse,snapshot);assert.notEqual(reuse.joints.upperL,snapshot.joints.upperL);
  arms=leadArmPose(style,phase,run,arms);assert.deepEqual(arms,leadArmPose(style,phase,run));
 }
});
test('minimum crowd settings and porter allocation cannot remove named story contacts',()=>{
 const world=new SiloWorld(new T.Scene());world.quality='low';world.setLevel(1);const p=new Population(world.scene,world),body=new CharacterBody();body.position.copy(world.spawn(1));
 p.schedule={...siloSchedule(3),crowd:0};p.porters.update=()=>{p.porters.count=3;};p.update(.01,body);
 for(const r of populationRecords(1).filter(r=>r.definition))assert.ok(p.actors.has(r.id),`${r.id} lost to crowd budget`);
});

test('choosing the required contact as an avatar cannot remove the story conversation',()=>{
 const world=new SiloWorld(new T.Scene());world.setLevel(1);const p=new Population(world.scene,world),body=new CharacterBody();
 const required=populationRecords(1).find(r=>r.id==='billings');body.position.copy(required.position).add(new T.Vector3(1,0,0));
 world.story={story:true,chapter:'billings',has:id=>id==='georgia',hasFlag:()=>false};
 p.update(.01,body,false,'billings');const actor=p.actors.get('billings');assert.ok(actor?.root.visible);
 const interaction=world.residentInteractions.find(i=>i.actor==='billings');assert.ok(interaction,'no conversation prompt for the required contact');
 const eye=body.position.clone().add(new T.Vector3(0,body.eyeHeight,0));world.story.sealed=()=>null;
 assert.equal(world.nearestInteraction(eye,interaction.position.clone().sub(eye).normalize())?.action,'resident-billings');
 world.story={story:false};p.update(.9,body,false,'billings');assert.equal(p.actors.has('billings'),false,'free roam still duplicates the selected avatar');
});
