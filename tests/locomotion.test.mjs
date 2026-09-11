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

// A swing that arrives with zero speed puts the foot down while it is still
// travelling forward with the body, so it has to stop dead the instant it
// lands. Measured in the model's own space, where a planted foot travels
// backwards at exactly the body's speed, the frame before touchdown used to
// read +0.25 m/s at a walk — still going forwards — and then jumped 1.58 m/s
// in a single frame. At a run it jumped 3.87. That is the skate on every
// step. Giving the swing the same end velocity as the stance it hands over to
// means the foot is already travelling with the ground when it arrives.
test('the foot is already travelling with the ground at the moment it lands',async()=>{
  for(const [id,h] of definitions){
    for(const [speed,jumpLimit] of [[1.45,1.0],[3.8,1.5]]){
      const {gltf,motion}=await person(id,h);
      const dt=1/120,local=new T.Vector3();
      let z=0,previous=null;const series=[];
      for(let i=0;i<1200;i++){
        z+=speed*dt;gltf.scene.position.set(0,0,z);gltf.scene.updateMatrixWorld(true);
        motion.update(dt,{speed,position:gltf.scene.position,grounded:true,ground:()=>0});
        motion.bones.FootL.getWorldPosition(local);
        const forward=local.z-z;
        series.push({v:previous===null?0:(forward-previous)/dt,
          planted:!!motion.footContacts.find(f=>f.side==='L')?.planted});
        previous=forward;
      }
      // Only once the damped pace has settled, so that is not what is measured.
      let landings=0,worstJump=0,worstApproach=-Infinity;
      for(let i=600;i<series.length-1;i++){
        if(!series[i].planted||series[i-1].planted)continue;
        landings++;
        worstJump=Math.max(worstJump,Math.abs(series[i].v-series[i-1].v));
        worstApproach=Math.max(worstApproach,series[i-1].v);
      }
      assert.ok(landings>3,`${id} at ${speed} m/s: only ${landings} touchdowns to measure`);
      assert.ok(worstApproach<0,
        `${id} at ${speed} m/s: the foot is still going forwards at ${worstApproach.toFixed(2)} m/s when it lands`);
      assert.ok(worstJump<jumpLimit,
        `${id} at ${speed} m/s: the foot changes speed by ${worstJump.toFixed(2)} m/s in one frame as it lands`);
    }
  }
});

// The body has to put its weight over the foot that is holding it up. Without
// that the hips travel down a rail and no amount of leg animation reads as
// weight. Measured human excursion is about 4.5 cm side to side at a walk and
// roughly half that at a run, where the feet land nearer the midline.
test('the pelvis carries across onto whichever leg is standing',async()=>{
  for(const [id,h] of definitions){
    const range=speed=>{
      const motion=speed.motion,dt=1/120;let z=0,lo=Infinity,hi=-Infinity;
      for(let i=0;i<900;i++){
        z+=speed.v*dt;speed.scene.position.set(0,0,z);speed.scene.updateMatrixWorld(true);
        motion.update(dt,{speed:speed.v,position:speed.scene.position,grounded:true,ground:()=>0});
        if(i>450){lo=Math.min(lo,motion.bones.Hips.position.x);hi=Math.max(hi,motion.bones.Hips.position.x);}
      }
      return hi-lo;
    };
    const walk=await person(id,h),run=await person(id,h);
    const atWalk=range({v:1.45,motion:walk.motion,scene:walk.gltf.scene});
    const atRun=range({v:3.8,motion:run.motion,scene:run.gltf.scene});
    assert.ok(atWalk>.025&&atWalk<.075,`${id}: ${(atWalk*100).toFixed(1)} cm of hip sway at a walk`);
    assert.ok(atRun<atWalk,`${id}: a run sways as wide as a walk`);
    assert.ok(atRun>.008,`${id}: the run has no weight shift at all`);
  }
});
