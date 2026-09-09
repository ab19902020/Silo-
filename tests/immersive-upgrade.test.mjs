import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { conversationFor, ALGORITHM } from '../dist/src/conversations.js';
import { PLAYABLE_CHARACTERS } from '../dist/src/characters.js';
import { SiloWorld } from '../dist/src/world.js';
import { levelY,TAU,roomType } from '../dist/src/data.js';
import { updateLivestock } from '../dist/src/livestock.js';
import { CharacterBody } from '../dist/src/physics.js';
import { Population } from '../dist/src/population.js';
import { CafeteriaOpening,CAFETERIA_START } from '../dist/src/opening.js';
import { topPoint,topLocal,groundY } from '../dist/src/surface.js';
import { reflectedCamera,VoidWater } from '../dist/src/water.js';
import { voidWaterGeometry } from '../dist/src/void-surfaces.js';
import { residentGLB } from '../scripts/export-residents.mjs';
import { readGLB } from '../scripts/glb.mjs';
import { RESIDENT_CAST } from '../dist/src/resident-data.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('every playable resident and department worker has complete conversations before and after the cleaning',()=>{
  const people=[...PLAYABLE_CHARACTERS,...['porter','diner','cafeteria','bazaar','farm','medical','mechanical','workshop','engineer','miner','it','water','recycling'].map(kind=>({id:'crowd-0',name:'Resident',kind}))];
  for(const person of people)for(const cleaned of [false,true]){
    const text=conversationFor(person,{cleaned,playerName:'Juliette Nichols'});assert.equal(text.name,person.name);assert.equal(text.topics.length,3);assert.equal(new Set(text.topics.map(t=>t.id)).size,3);
    for(const line of [text.role,text.greeting,...text.topics.flatMap(t=>[t.label,t.reply])])assert.ok(typeof line==='string'&&line.length>3&&!line.includes('undefined'));
  }
  assert.match(conversationFor({name:'Miner',kind:'miner'}).topics[0].reply,/Mining/);
});

test('NPC prompts persist between animation ticks, including unnamed cafeteria residents',()=>{
  const world=new SiloWorld(new T.Scene());world.setLevel(1);const body=new CharacterBody();body.position.copy(topPoint(...CAFETERIA_START));const population=new Population(world.scene,world);population.update(.1,body);
  const candidates=world.residentInteractions.map(x=>x.action);assert.ok(candidates.length>0);
  for(let i=0;i<5;i++){population.update(.0001,body);assert.deepEqual(world.residentInteractions.map(x=>x.action),candidates);assert.ok(world.residentInteractions.every(x=>x.resident?.name));}
});

test('Holston and Allison settle on the hillside together, including their visible skinned surfaces',()=>{
  const world=new SiloWorld(new T.Scene());world.setLevel(1);const opening=new CafeteriaOpening(world);opening.takeBook();
  for(let t=79;t<=90;t+=1/30){opening.time=t;opening.sample(1/30);}
  opening.finish();world.scene.updateMatrixWorld(true);const heads=[];
  for(const actor of opening.cleaners){
    const head=topLocal(actor.motion.bones.Head.getWorldPosition(new T.Vector3()));heads.push(new T.Vector3(head.x,head.y,head.z));let lowest=Infinity,highest=-Infinity;
    actor.model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const g=mesh.geometry,point=new T.Vector3();for(const group of g.groups){if(!mesh.material[group.materialIndex].visible)continue;for(let j=group.start;j<group.start+group.count;j+=7){mesh.getVertexPosition(g.index.getX(j),point);mesh.localToWorld(point);const p=topLocal(point),height=p.y-groundY(p.x,p.z);lowest=Math.min(lowest,height);highest=Math.max(highest,height);}}});
    assert.ok(lowest>-.025&&lowest<.04,`${actor.definition.id} has no ground contact: ${lowest}`);assert.ok(highest<.72,`${actor.definition.id} is still upright`);
    assert.ok(actor.model.position.length()<1.2,'invalid skin/world-space conversion');
  }
  assert.ok(heads[0].distanceTo(heads[1])>.45&&heads[0].distanceTo(heads[1])<.85,'heads do not lie beside each other');
  const cloth=opening.cleaners[0].model.children.find(x=>x.isSkinnedMesh);assert.ok(!cloth.material[1].visible&&!cloth.material[2].visible,'Holston still wears the helmet or visor');
});

test('water reflection mirrors the camera and restores render state even on failure',()=>{
  const scene=new T.Scene(),mesh=new T.Mesh(voidWaterGeometry(),new T.MeshStandardMaterial()),water=new VoidWater(mesh);scene.add(mesh);const camera=new T.PerspectiveCamera(65,1.7,.1,250);camera.position.set(10,12,15);camera.lookAt(0,5,0);camera.updateMatrixWorld(true);
  const reflected=reflectedCamera(camera,5),eye=reflected.getWorldPosition(new T.Vector3());assert.ok(eye.distanceTo(new T.Vector3(10,-2,15))<1e-6);
  const expected=camera.getWorldDirection(new T.Vector3()).reflect(new T.Vector3(0,1,0));assert.ok(expected.distanceTo(reflected.getWorldDirection(new T.Vector3()))<1e-6);
  const previous={id:'main target'};let current=previous,fail=false,rendered=0;
  const renderer={shadowMap:{autoUpdate:true},getRenderTarget:()=>current,setRenderTarget:t=>{current=t;},render:(s,c)=>{rendered++;assert.equal(mesh.visible,false);assert.equal(current,water.target);assert.ok(c.projectionMatrix.elements.every(Number.isFinite));const below=new T.Vector3(0,3,0).project(c);assert.ok(below.z < -1,'basin bed enters the reflection');if(fail)throw Error('render failed');}};
  water.update(renderer,scene,camera,1);assert.equal(rendered,1);assert.equal(mesh.visible,true);assert.equal(current,previous);assert.equal(renderer.shadowMap.autoUpdate,true);
  water.update(renderer,scene,camera,1.001);assert.equal(rendered,1,'reflection ignores rate limit');
  fail=true;assert.throws(()=>water.update(renderer,scene,camera,2),/render failed/);assert.equal(mesh.visible,true);assert.equal(current,previous);assert.equal(renderer.shadowMap.autoUpdate,true);
});

test('exported cleaning suits preserve separate skin, cloth and visor materials with valid primitive references',async()=>{
  const {json}=await readGLB(residentGLB(RESIDENT_CAST.find(x=>x.id==='holston'),true));
  const materials=new Set();for(const mesh of json.meshes)for(const p of mesh.primitives){assert.ok(json.materials[p.material]);materials.add(p.material);assert.ok(p.attributes.JOINTS_0!==undefined&&p.attributes.WEIGHTS_0!==undefined);}
  for(const index of [0,1,2,3,4,5])assert.ok(materials.has(index));assert.ok(json.materials[2].pbrMetallicRoughness.metallicFactor>.5);assert.ok(json.materials[3].pbrMetallicRoughness.roughnessFactor<json.materials[0].pbrMetallicRoughness.roughnessFactor);
});

// --- lighting --------------------------------------------------------------
// A silo is a windowless concrete tube. Every light in it is bolted to
// something, so walking must not move a single one of them, and the pool must
// not pop a light from one fitting to another in front of you.
test('every light in the silo belongs to a fixture, and none of them follow the camera',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(50);
  const seen=new Map();
  let jumped=0,keyHops=0,keyHotHops=0,sunLit=0;
  let keyKey=null,keyPos=null;
  for(let i=0;i<900;i++){
    // A lap of the gallery that then walks out along a wing and back.
    const a=i/900*TAU*2,r=14+Math.abs(((i/900)*4%2)-1)*30;
    const p=new T.Vector3(Math.cos(a)*r,levelY(50)+1.7,Math.sin(a)*r);
    world.update(1/60,p);
    if(world.sun.visible||world.sun.intensity>0)sunLit++;
    for(const l of world.localLights){
      const was=seen.get(l);
      if(was&&was.lit&&l.intensity>.5&&was.position.distanceTo(l.position)>1e-9)jumped++;
      seen.set(l,{position:l.position.clone(),lit:l.intensity>.5});
    }
    const k=world.keyLight;
    if(keyPos&&k.position.distanceTo(keyPos)>1e-9){keyHops++;if(k.userData.lastLit>1)keyHotHops++;}
    if(keyKey!==k.userData.key)keyKey=k.userData.key;
    keyPos=k.position.clone();k.userData.lastLit=k.intensity;
  }
  assert.equal(jumped,0,`a lit lamp teleported ${jumped} times; lights must dim out before they move`);
  assert.equal(sunLit,0,'there is no sun inside a silo');
  assert.ok(keyHops<40,`the shadow caster moved on ${keyHops} of 900 frames; it must sit on a fitting, not on the player`);
  assert.equal(keyHotHops,0,'the shadow caster moved while still lit, which swings every shadow in the room');
  assert.ok(world.localLights.some(l=>l.intensity>1),'the walk lit nothing at all');
});

// --- the farms -------------------------------------------------------------
test('every agricultural wing keeps animals as well as crops, and they stay in their pens',()=>{
  const world=new SiloWorld(new T.Scene());
  const farms=[];
  for(let level=1;level<=144;level++)for(let wing=0;wing<6;wing++)if(roomType(level,wing)==='farm')farms.push([level,wing]);
  assert.ok(farms.length>=6,`only ${farms.length} agricultural wings`);
  for(const [level,wing] of farms){
    world.setLevel(level);
    const room=world.loaded.get(level).rooms[wing],stock=room.userData.livestock;
    assert.ok(stock?.length,`level ${level} wing ${wing} grows crops but keeps nothing`);
    const kinds=new Set(stock.map(a=>a.species));
    for(const kind of ['chicken','rabbit','pig','cow'])assert.ok(kinds.has(kind),`no ${kind} on level ${level}`);
  }
  // Half an hour of them milling about: nothing may wander out of its pen, or
  // out of the room, and nothing may end up standing inside anything else.
  world.setLevel(farms[0][0]);
  const stock=world.loaded.get(farms[0][0]).rooms[farms[0][1]].userData.livestock;
  const start=stock.map(a=>a.group.position.clone());
  for(let i=0;i<8000;i++)updateLivestock(stock,1/8,i/8);
  for(const a of stock){
    const p=a.group.position;
    assert.ok(Math.abs(p.x-a.pen.x)<a.pen.w/2+1.2&&Math.abs(p.z-a.pen.z)<a.pen.d/2+1.2,
      `a ${a.species} left its pen: ${p.x.toFixed(1)},${p.z.toFixed(1)} vs ${a.pen.x},${a.pen.z}`);
    assert.ok(Math.abs(p.x)<10&&p.z>0&&p.z<24,`a ${a.species} left the room at ${p.x.toFixed(1)},${p.z.toFixed(1)}`);
  }
  for(let i=0;i<stock.length;i++)for(let j=i+1;j<stock.length;j++){
    if(stock[i].pen!==stock[j].pen)continue;
    assert.ok(stock[i].group.position.distanceTo(stock[j].group.position)>.25,'two animals ended up inside each other');
  }
  assert.ok(stock.some((a,i)=>a.group.position.distanceTo(start[i])>.5),'nothing moved at all in half an hour');
});

// --- IT -------------------------------------------------------------------
test('Level 19 carries the IT floor, the Head of IT behind a corridor, and the vault',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(19);
  const [it,vault,office]=[0,1,2].map(w=>world.loaded.get(19).rooms[w]);
  assert.equal(it.userData.type,'it');
  assert.equal(vault.userData.type,'vault');
  assert.equal(office.userData.type,'office');
  const actions=r=>r.userData.interactions.map(i=>i.action);
  assert.ok(actions(vault).includes('algorithm'),'you cannot address the Algorithm');
  assert.ok(actions(vault).includes('vault-radio'),'the concealed radio is missing');
  assert.ok(actions(it).includes('it-servers'),'the server room notice is missing');
  assert.ok(actions(office).includes('head-of-it'));
  assert.ok(vault.getObjectByName('algorithm-interface'),'the interface is not in the room');
  assert.ok(world.animated.some(a=>a.object.name==='algorithm-interface'),'the interface is not turning');
  // All three doorways have to stay clear: the wing entrance is a 4 m gap in
  // the gallery wall and a partition standing in it makes the room unreachable.
  for(const [wing,room] of [[0,it],[1,vault],[2,office]]){
    room.updateWorldMatrix(true,false);
    const b=new CharacterBody({radius:.3,stepHeight:.3});
    const door=world.doors.find(d=>d.level===19&&d.wing===wing);door.open=true;
    const target=new T.Vector3(0,0,10).applyMatrix4(room.matrixWorld);
    b.teleport(...new T.Vector3(0,0,-3.4).applyMatrix4(room.matrixWorld).toArray());
    for(let j=0;j<200;j++)world.update(1/60,b.position);
    for(let j=0;j<900;j++){const v=target.clone().sub(b.position);v.y=0;v.normalize().multiplyScalar(3.2);b.step(1/120,v,world.colliders);}
    assert.ok(b.position.distanceTo(target)<1.2,`wing ${wing} of Level 19 cannot be walked into: ${b.position.distanceTo(target).toFixed(1)} m short`);
  }
});

test('the Algorithm answers, and does not read out television lines',()=>{
  assert.equal(ALGORITHM.name,'LEGACY');
  assert.ok(ALGORITHM.topics.length>=4);
  for(const t of ALGORITHM.topics){assert.ok(t.label&&t.reply&&t.reply.length>30,`thin reply for ${t.id}`);}
});
