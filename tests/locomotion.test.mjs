import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { readGLB,geometryGLTF,accessor } from '../scripts/glb.mjs';
import { SkeletalMotion,MOTION_CLIPS } from '../dist/src/locomotion.js';
const definitions=[['juliette',1.73],['sims',1.83],['bernard',1.87]];
async function person(id,h){const {json,bin}=await readGLB(new URL(`../dist/assets/characters/${id}.glb`,import.meta.url));const gltf=await geometryGLTF(json,bin);return {json,bin,gltf,motion:new SkeletalMotion(gltf.scene,h)};}

test('all embedded motions loop without a pose discontinuity or invalid joint rotation',async()=>{
  for(const [id,h] of definitions){const {gltf}=await person(id,h);assert.equal(gltf.animations.length,Object.keys(MOTION_CLIPS).length);
    for(const clip of gltf.animations){for(const track of clip.tracks){const size=track.getValueSize(),v=track.values;assert.ok([...v].every(Number.isFinite),`${id}/${clip.name} finite`);
      for(let j=0;j<size;j++)assert.ok(Math.abs(v[j]-v[v.length-size+j])<.0002,`${id}/${clip.name}/${track.name} loop seam`);
      if(track.name.endsWith('.quaternion'))for(let i=0;i<v.length;i+=4)assert.ok(Math.abs(Math.hypot(...v.slice(i,i+4))-1)<.0002,`${id}/${clip.name} normalized rotation`);
    }}
  }
});

test('feet stay fixed during stance and remain reachable while walking up physical treads',async()=>{
  for(const [id,h] of definitions){const {gltf,motion}=await person(id,h);const previous=new Map(),ground=(x,z)=>Math.floor(Math.max(0,z)/.65)*.18;let locked=0,maxError=0;
    for(let i=0;i<500;i++){
      const z=i/60*1.45,y=ground(0,z);gltf.scene.position.set(0,y,z);gltf.scene.updateMatrixWorld(true);motion.update(1/60,{speed:1.45,position:gltf.scene.position,grounded:true,ground});
      for(const foot of motion.footContacts){
        maxError=Math.max(maxError,foot.error);const old=previous.get(foot.side);
        if(foot.planted&&old?.planted&&Math.abs(old.position.y-foot.position.y)<.01&&old.position.distanceTo(foot.position)<.3){assert.ok(Math.hypot(old.position.x-foot.position.x,old.position.z-foot.position.z)<.003,`${id} skating during stance`);locked++;}
        previous.set(foot.side,foot);
      }
    }
    assert.ok(locked>150,`${id} did not plant its feet`);assert.ok(maxError<.045,`${id}: unreachable stair ankle ${maxError}`);
  }
});

test('changes of pace retain gait phase and idle settles without drift',async()=>{
  for(const [id,h] of definitions){const {gltf,motion}=await person(id,h);let z=0;
    for(let i=0;i<420;i++){const speed=i<100?1.45:i<210?3.8:i<320?1.45:0;z+=speed/60;gltf.scene.position.set(0,0,z);gltf.scene.updateMatrixWorld(true);const before=motion.phase;motion.update(1/60,{speed,position:gltf.scene.position,ground:()=>0});const advance=(motion.phase-before+1)%1;assert.ok(advance<.055,`${id} phase reset at a pace change`);}
    assert.equal(motion.state,'Idle');assert.ok(motion.weight<.002);for(const leg of motion.legs)assert.ok(leg.error<.01);
  }
});

test('trouser vertices below each coat hem follow leg joints',async()=>{
  for(const [id,h] of definitions.filter(([id])=>id!=='juliette')){const {json,bin}=await person(id,h),a=json.meshes[0].primitives[0].attributes,p=accessor(json,bin,a.POSITION),j=accessor(json,bin,a.JOINTS_0),w=accessor(json,bin,a.WEIGHTS_0),names=json.skins[0].joints.map(n=>json.nodes[n].name);let legs=0;
    for(let i=0;i<p.count;i++)if(p.get(i,1)/h<(id==='sims'?.37:.31)&&p.get(i,1)/h>.12){for(let k=0;k<4;k++){if(names[j.get(i,k)].startsWith('Coat'))assert.ok(w.get(i,k)<1e-5,`${id}: trouser controlled by coat`);}legs++;}
    assert.ok(legs>500);
  }
});

test('landing restores terrain foot placement and contact sounds after a fall',async()=>{
  const {gltf,motion}=await person('juliette',1.73);let z=0;
  for(let i=0;i<210;i++){const airborne=i>=50&&i<85;z+=1.45/60;gltf.scene.position.set(0,airborne?.8:0,z);gltf.scene.updateMatrixWorld(true);motion.update(1/60,{speed:1.45,position:gltf.scene.position,grounded:!airborne,ground:()=>0});}
  assert.ok(motion.air<.001);assert.ok(motion.stepCount>3);assert.ok(motion.footContacts.some(f=>f.planted));assert.ok(motion.legs.every(l=>l.error<.01));
});
