import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { conversationFor } from '../dist/src/conversations.js';
import { PLAYABLE_CHARACTERS } from '../dist/src/characters.js';
import { SiloWorld } from '../dist/src/world.js';
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
