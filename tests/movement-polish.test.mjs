import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {readGLB,geometryGLTF} from '../scripts/glb.mjs';
import {SkeletalMotion} from '../dist/src/locomotion.js';
import {createResident,poseResident} from '../dist/src/resident-model.js';
import {RESIDENT_CAST} from '../dist/src/resident-data.js';
async function supplied(id,h){const {json,bin}=await readGLB(new URL(`../dist/assets/characters/${id}.glb`,import.meta.url));const {scene}=await geometryGLTF(json,bin);return {root:scene,motion:new SkeletalMotion(scene,h)};}

test('walks stay upright without the old bounce across supplied and resident bodies',async()=>{
  const actors=[await supplied('juliette',1.73),await supplied('sims',1.83),await supplied('bernard',1.87),...['knox','walker','shirley'].map(id=>createResident(RESIDENT_CAST.find(d=>d.id===id)))];
  for(const a of actors)for(const speed of [1.45,3.8]){
    a.motion.reset();let lo=Infinity,hi=-Infinity,contactError=0,contacts=0;
    for(let i=0;i<720;i++){
      a.root.position.set(0,0,i*speed/120);a.root.updateMatrixWorld(true);a.motion.update(1/120,{speed,position:a.root.position,ground:()=>0});
      if(i<360)continue;
      const y=a.motion.bones.Hips.getWorldPosition(new T.Vector3()).y;lo=Math.min(lo,y);hi=Math.max(hi,y);
      for(const foot of a.motion.footContacts)if(foot.planted){contacts++;contactError=Math.max(contactError,foot.error);}
    }
    assert.ok(hi-lo<(speed<2?.065:.115),`${a.root.name} at ${speed}: ${((hi-lo)*100).toFixed(1)} cm bounce`);
    assert.ok(contacts>100);assert.ok(contactError<.002,'a supporting leg no longer reaches the floor');
  }
});

test('selecting or teleporting clears running, slope and support state',()=>{
  const a=createResident(RESIDENT_CAST.find(d=>d.id==='knox')),m=a.motion;
  for(let i=0;i<200;i++){a.root.position.set(0,i*.008,i*.06);a.root.updateMatrixWorld(true);m.update(1/60,{speed:3.8,position:a.root.position,ground:(x,z)=>z*.008/.06});}
  assert.ok(m.run>.9);m.reset();
  a.root.position.set(80,0,80);a.root.updateMatrixWorld(true);m.update(1/60,{speed:0,position:a.root.position,ground:()=>0});
  assert.equal(m.run,0);assert.equal(m.slope,0);assert.equal(m.phase,0);assert.equal(m.state,'Idle');
  assert.ok(m.legs.every(l=>!l.anchor&&!l.stance));
});

test('residents settle into idle and release foot anchors for conversation before resuming',()=>{
  const a=createResident(RESIDENT_CAST.find(d=>d.id==='knox'));a.ground=()=>0;
  for(let i=0;i<120;i++){a.root.position.z+=1.2/60;poseResident(a,'walk',i/60,1/60,1.2);}
  assert.ok(a.motion.weight>.9);
  for(let i=0;i<60;i++)poseResident(a,'idle',2+i/60,1/60,0);
  assert.equal(a.motion.state,'Idle');assert.ok(a.motion.weight<.001);
  poseResident(a,'talk',3,1/60);assert.equal(a.motion.lastPosition,null);assert.ok(a.motion.legs.every(l=>!l.anchor));
  a.root.position.z+=.02;poseResident(a,'walk',4,1/60,1.2);
  assert.equal(a.motion.phase,0,'a stale position advanced the first returning step');
});
