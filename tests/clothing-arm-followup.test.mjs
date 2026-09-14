import {actorFrom} from './fixtures/imported-actor.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {readGLB,geometryGLTF} from '../scripts/glb.mjs';
import {CHARACTERS} from '../dist/src/characters.js';
import {calibrateArms,calibrateAnkles} from '../dist/src/rig-calibration.js';
import {createResident} from '../dist/src/resident-model.js';
import {RESIDENT_CAST} from '../dist/src/resident-data.js';
import {addResidentBody} from '../dist/src/resident-body.js';
import {addResidentClothes} from '../dist/src/resident-clothes.js';

async function asset(d){const {json,bin}=await readGLB(new URL(`./fixtures/imported-characters/${d.id}.glb`,import.meta.url));return geometryGLTF(json,bin);}

test('lead arm rebinding preserves surfaces and places functional elbows and wrists',async()=>{
 for(const d of CHARACTERS){
  const gltf=await asset(d),model=gltf.scene,v=new T.Vector3(),samples=[];calibrateAnkles(model,d.height);
  model.traverse(m=>{if(m.isSkinnedMesh)for(let i=0;i<m.geometry.attributes.position.count;i+=103)samples.push([m,i,m.getVertexPosition(i,v).clone()]);});
  calibrateArms(model,d.height);for(const [mesh,i,p] of samples)assert.ok(mesh.getVertexPosition(i,v).distanceTo(p)<1e-5,`${d.id}: changed source surface`);
  for(const side of ['L','R']){
   const p=n=>model.getObjectByName(n+side).getWorldPosition(new T.Vector3()),upper=p('UpperArm'),elbow=p('Forearm'),hand=p('Hand'),ratio=upper.distanceTo(elbow)/elbow.distanceTo(hand);
   assert.ok(ratio>1.10&&ratio<1.26,`${d.id}: disproportionate forearm`);assert.ok(model.userData.handFrames[side]);
  }
 }
});

test('lead walking has continuous arms and hands aligned with the forearms through turns',async()=>{
 for(const d of CHARACTERS){const a=actorFrom(await asset(d),d);let previous=null,maxJump=0;
  for(let i=0;i<300;i++){
   const angle=i>180?.7:0;a.root.rotation.y=angle;a.root.position.set(Math.sin(angle)*i*.024,0,Math.cos(angle)*i*.024);a.root.updateMatrixWorld(true);
   a.motion.update(1/60,{speed:1.45,position:a.root.position,heading:angle,ground:()=>0});if(i<90||i===181)continue;
   for(const side of ['L','R']){
    const hand=a.motion.bones['Hand'+side],elbow=a.motion.bones['Forearm'+side],along=hand.getWorldPosition(new T.Vector3()).sub(elbow.getWorldPosition(new T.Vector3())).normalize();
    const source=new T.Vector3(0,1,0).applyQuaternion(new T.Quaternion().fromArray(a.model.userData.handFrames[side].quaternion));
    const q=hand.getWorldQuaternion(new T.Quaternion()).multiply(a.motion.rest['Hand'+side].worldQ.clone().invert());
    assert.ok(source.applyQuaternion(q).dot(along)>.995,`${d.id}: wrist bends away from forearm`);
   }
   const wrist=a.motion.bones.HandR.getWorldPosition(new T.Vector3()).sub(a.root.position).applyAxisAngle(new T.Vector3(0,1,0),-angle);
   if(previous&&i!==182)maxJump=Math.max(maxJump,wrist.distanceTo(previous));previous=wrist;
  }
  assert.ok(maxJump<.035,`${d.id}: ${maxJump} arm jump per frame`);
 }
});

test('fitted clothing remains close to its supporting skin while the torso bends',()=>{
 for(const id of ['knox','walker','marnes']){
  const def=RESIDENT_CAST.find(d=>d.id===id),a=createResident(def);let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
  const bones=mesh.skeleton.bones,names=bones.map(b=>b.name),binding=(b,b2=b,w=1)=>[names.indexOf(b),names.indexOf(b2),w],appearance=def.appearance,wide=(appearance.build||1)*(appearance.female?.92:1);let body;
  const surface=addResidentBody({a:appearance,wide,suit:false,coat:new T.Color(appearance.coat),skin:new T.Color(appearance.skin),dark:new T.Color(0x242923),binding,add:g=>{body=g;}});surface.capture=true;
  const panel=new T.PlaneGeometry(.068,.083,6,8);panel.translate(.08*wide,1.275,0);surface.fit(panel,{offset:.0018});
  const scale=a.motion.rest.Hips.point.y/.91;body.scale(scale,scale,scale);panel.scale(scale,scale,scale);
  const si=[],sw=[];for(let i=0;i<body.attributes.position.count;i++){const b=surface.bindings[i];si.push(b[0],b[1],0,0);sw.push(b[2],1-b[2],0,0);}
  body.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));body.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));panel.setAttribute('skinIndex',panel.attributes.attachmentSkinIndex);panel.setAttribute('skinWeight',panel.attributes.attachmentSkinWeight);
  const source=new T.SkinnedMesh(body),cloth=new T.SkinnedMesh(panel);source.bind(mesh.skeleton,mesh.bindMatrix);cloth.bind(mesh.skeleton,mesh.bindMatrix);
  for(const angle of [0,.15,.35]){
   a.motion.neutral();a.motion.rotate('Spine',angle);a.motion.rotate('Chest',-.12,new T.Vector3(0,1,0));a.model.updateWorldMatrix(true,true);mesh.skeleton.update();
   for(let i=0;i<panel.attributes.position.count;i+=5){const support=panel.userData.supports[i],point=new T.Vector3();for(let k=0;k<3;k++)point.addScaledVector(source.getVertexPosition(support.triangle[k],new T.Vector3()),support.bary[k]);
    const gap=point.distanceTo(cloth.getVertexPosition(i,new T.Vector3()));assert.ok(gap<.009,`${id}: clothing detached by ${gap}m`);
   }
  }
 }
});


test('waistbands stay on the torso and collars inherit only minor shoulder influence',()=>{
 for(const id of ['knox','marnes','pete','jahns']){
  const def=RESIDENT_CAST.find(d=>d.id===id),actor=createResident(def);let mesh;actor.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
  const names=mesh.skeleton.bones.map(b=>b.name),binding=(b,b2=b,w=1)=>[names.indexOf(b),names.indexOf(b2),w],a=def.appearance,wide=(a.build||1)*(a.female?.92:1),coat=new T.Color(a.coat),skin=new T.Color(a.skin),dark=new T.Color(0x242923);
  const surface=addResidentBody({a,wide,suit:false,coat,skin,dark,binding,add(){}});
  addResidentClothes({a,wide,coat,shirt:new T.Color(0xa29981),dark,surface,binding,add(g){
   const index=g.attributes.attachmentSkinIndex,weight=g.attributes.attachmentSkinWeight;if(!index)return;
   for(let vertex=0;vertex<index.count;vertex++){
    let armWeight=0;for(let k=0;k<4;k++)if(/Arm|Forearm|Hand|Finger/.test(names[index.array[vertex*4+k]]))armWeight+=weight.array[vertex*4+k];
    // The collar shares a little shoulder skinning. Waist and chest details
    // must have none: a ray must not hit an arm resting beside the body.
    const allowance=g.attributes.position.getY(vertex)>1.35?.10:.001;
    assert.ok(armWeight<=allowance,`${id}: clothing at ${g.attributes.position.getY(vertex)} has ${armWeight} arm influence`);
   }
  }});
 }
});
