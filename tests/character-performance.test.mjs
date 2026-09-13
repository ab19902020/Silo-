import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {readGLB,geometryGLTF} from '../scripts/glb.mjs';
import {actorFrom,CHARACTERS} from '../dist/src/characters.js';
import {calibrateAnkles} from '../dist/src/rig-calibration.js';
import {createResident} from '../dist/src/resident-model.js';
import {RESIDENT_CAST,CROWD_APPEARANCES} from '../dist/src/resident-data.js';
import {capturedPose} from '../dist/src/captured-motion.js';

async function asset(def){const {json,bin}=await readGLB(new URL(`../dist/assets/characters/${def.id}.glb`,import.meta.url));return geometryGLTF(json,bin);}

test('ankle rebinding preserves the supplied neutral surface and is idempotent',async()=>{
 for(const def of CHARACTERS){
  const gltf=await asset(def),model=gltf.scene,points=[],v=new T.Vector3();
  model.updateMatrixWorld(true);model.traverse(m=>{if(m.isSkinnedMesh){m.skeleton.update();for(let i=0;i<m.geometry.attributes.position.count;i+=131)points.push([m,i,m.getVertexPosition(i,v).clone()]);}});
  calibrateAnkles(model,def.height);for(const [m,i,p] of points)assert.ok(m.getVertexPosition(i,v).distanceTo(p)<1e-5,`${def.id}: rebinding changed its appearance`);
  const foot=model.getObjectByName('FootL'),position=foot.position.clone();calibrateAnkles(model,def.height);assert.ok(foot.position.equals(position));
 }
});

test('the three runtime lead rigs stay planted with bounded pelvis and joint travel',async()=>{
 for(const def of CHARACTERS){
  const a=actorFrom(await asset(def),def);let low=Infinity,high=-Infinity,previous=null,maxJump=0;
  for(let i=0;i<420;i++){
   a.root.position.z=i*1.45/60;a.root.updateMatrixWorld(true);a.motion.update(1/60,{speed:1.45,position:a.root.position,ground:()=>0});
   if(i<120)continue;
   const hip=a.motion.bones.Hips.getWorldPosition(new T.Vector3());low=Math.min(low,hip.y);high=Math.max(high,hip.y);
   const wrist=a.motion.bones.HandR.getWorldPosition(new T.Vector3()).sub(a.root.position);if(previous)maxJump=Math.max(maxJump,wrist.distanceTo(previous));previous=wrist;
   for(const c of a.motion.footContacts)if(c.planted)assert.ok(c.error<.003,`${def.id}: planted foot lost contact`);
  }
  assert.ok(high-low<.065,`${def.id}: ${high-low} pelvis bounce`);assert.ok(maxJump<.075,`${def.id}: arm discontinuity`);
 }
});

test('all residents use finite anatomical meshes, an opaque face atlas and human-sized hands',()=>{
 for(const def of [...RESIDENT_CAST,...CROWD_APPEARANCES.map((appearance,i)=>({id:'performance-crowd-'+i,name:'Resident',height:1.75,appearance}))]){
  const a=createResident(def);let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});const g=mesh.geometry,p=g.attributes.position,uv=g.attributes.skinUV;
  assert.ok(!mesh.material.transparent&&mesh.material.opacity===1);assert.equal(uv.count,p.count);assert.ok(p.count<60000,'resident exceeds mobile mesh budget');
  let face=0;for(let i=0;i<p.count;i++){assert.ok([p.getX(i),p.getY(i),p.getZ(i),uv.getX(i),uv.getY(i),uv.getZ(i)].every(Number.isFinite));if(uv.getZ(i)>.5){face++;assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1);}}
  assert.ok(face>3000,'anatomical head is missing');
  // This catches unmapped metacarpals stretching a palm back to its source rig.
  for(let i=0;i<p.count;i++)if(p.getY(i)>.70&&p.getY(i)<1.0)assert.ok(Math.abs(p.getX(i))<.40,`${def.id}: stretched hand or garment`);
 }
});

test('lead gait performances differ and loop without a pose seam',()=>{
 const a=capturedPose('engineer',.17,0),b=capturedPose('security',.17,0),c=capturedPose('measured',.17,0);
 assert.notDeepEqual(a.joints.upperL,b.joints.upperL);assert.notDeepEqual(b.joints.upperL,c.joints.upperL);
 for(const style of ['engineer','security','measured'])assert.deepEqual(capturedPose(style,0,0),capturedPose(style,1,0));
});
