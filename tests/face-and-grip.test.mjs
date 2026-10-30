import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {FACE_CONTROLS,FACE_PRESETS,shapeFace,residentAppearance} from '../dist/src/face-shape.js';
import {DEFAULT_PROFILE,definitionFromProfile,normalizeProfile,applyFacePreset,randomizeFace} from '../dist/src/character-profile.js';
import {createResident,poseResident,disposeResident} from '../dist/src/resident-model.js';
import {attachWorkProps,showWorkProps,updateWorkGrip} from '../dist/src/work-props.js';
import {createMaterials} from '../dist/src/kit.js';
import {RESIDENT_HEAD} from '../dist/src/resident-head-data.js';

test('old saved residents gain neutral face controls and presets preserve identity and clothes',()=>{
 const old={name:'Ada Briggs',department:'medical',height:163,faceWidth:1.05,hairStyle:'bun',outfit:'medical',skin:4};
 const migrated=normalizeProfile(old);for(const [k,c] of Object.entries(FACE_CONTROLS))assert.equal(migrated[k],old[k]??c.default);
 for(const id of Object.keys(FACE_PRESETS)){
  const p=applyFacePreset(migrated,id);for(const k of ['name','department','height','hairStyle','outfit','skin'])assert.equal(p[k],old[k]);
  for(const k of Object.keys(FACE_CONTROLS))assert.equal(definitionFromProfile(p).appearance[k],p[k]);
 }
 const varied=randomizeFace(migrated,()=>.85);assert.notEqual(varied.jawWidth,migrated.jawWidth);assert.equal(varied.name,old.name);
});

test('every face control visibly deforms its mesh while preserving the neck seam',()=>{
 const neutral=definitionFromProfile(DEFAULT_PROFILE).appearance;
 for(const [key,c] of Object.entries(FACE_CONTROLS)){
  let change=0;for(let i=0;i<RESIDENT_HEAD.positions.length;i+=3){
   const xyz=RESIDENT_HEAD.positions.slice(i,i+3),a=shapeFace(...xyz,{...neutral,[key]:c.min}),b=shapeFace(...xyz,{...neutral,[key]:c.max});
   assert.ok(a.toArray().every(Number.isFinite)&&b.toArray().every(Number.isFinite));change=Math.max(change,a.distanceTo(b));
   if(xyz[1]<1.52&&key!=='faceWidth')assert.ok(a.distanceTo(b)<.0003,key+' moved neck seam');
  }
  assert.ok(change>.0015,key+' does not affect visible geometry');
 }
});

test('NPC facial identity is repeatable and differs across residents',()=>{
 const a={id:'resident-144-2',appearance:{skin:0x87654a,faceWidth:1.04}},b={...a,id:'resident-144-3'};
 assert.deepEqual(residentAppearance(a),residentAppearance(a));assert.notEqual(residentAppearance(a).jawWidth,residentAppearance(b).jawWidth);assert.equal(residentAppearance(a).faceWidth,1.04);
});

test('parcel body stays outside the hand and torso through carry poses and stature changes',()=>{
 const oldDocument=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
 try{
  const materials=createMaterials(),v=new T.Vector3();
  for(const height of [155,175,195])for(const frame of ['balanced','slender']){
   const definition=definitionFromProfile({...DEFAULT_PROFILE,height,frame,build:height===195?1.15:.88}),a=createResident(definition,{cache:false});
   const roster={job:'porter',tool:'parcel'};attachWorkProps(a,materials,roster);let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
   for(const pose of ['idle','walk','work','talk']){
    for(let i=0;i<30;i++){poseResident(a,pose,i/60,1/60,pose==='walk'?1.4:0);showWorkProps(a,roster,{phase:'work',onDuty:true,onRoute:pose==='walk'},pose==='work');updateWorkGrip(a);}
    a.root.rotation.y=.8;a.root.updateMatrixWorld(true);mesh.skeleton.update();const parcel=a.workTools.parcel,inverse=parcel.matrixWorld.clone().invert();assert.ok(parcel.visible);
    let intersections=0;for(let i=0;i<mesh.geometry.attributes.position.count;i++){
     mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
     if(v.x>-.093&&v.x<.045&&v.y>-.244&&v.y<-.126&&Math.abs(v.z)<.114)intersections++;
    }
    assert.equal(intersections,0,`${height}/${frame}/${pose}: hand or clothing intersects parcel`);
    const up=new T.Vector3(0,1,0).applyQuaternion(parcel.getWorldQuaternion(new T.Quaternion()));assert.ok(up.y>.9999,'parcel tips with wrist');
   }
   showWorkProps(a,roster,{phase:'work',onDuty:true,onRoute:true},false,false);assert.equal(a.workTools.parcel.visible,false,'empty return still carries parcel');disposeResident(a);
  }
 }finally{globalThis.document=oldDocument;}
});


test('blink morphs close both eyelids without deforming the body or other residents',async()=>{
 const {updateResidentExpression,blinkAmount}=await import('../dist/src/resident-expression.js');
 const definition=definitionFromProfile({...DEFAULT_PROFILE,glasses:true}),a=createResident(definition),b=createResident(definition);
 updateResidentExpression(a,0);updateResidentExpression(b,0);
 const time=.095-a.expressionSeed*.37;updateResidentExpression(a,time);updateResidentExpression(b,time+.5);
 const mesh=a.expressionMeshes[0],other=b.expressionMeshes[0];assert.equal(mesh.geometry,other.geometry);assert.notEqual(mesh.morphTargetInfluences,other.morphTargetInfluences);
 assert.ok(mesh.morphTargetInfluences[0]>.999);assert.equal(other.morphTargetInfluences[0],0);
 const p=mesh.geometry.attributes.position,delta=mesh.geometry.morphAttributes.position[0],scale=a.motion.rest.Hips.point.y/.91;let moving=0;
 for(let i=0;i<p.count;i++)if(Math.hypot(delta.getX(i),delta.getY(i),delta.getZ(i))>1e-6){moving++;assert.ok(p.getY(i)/scale>1.59&&p.getY(i)/scale<1.645,'blink deforms another body part');}
 assert.ok(moving>100);for(let t=0;t<10;t+=.005)assert.ok(blinkAmount(t,50)>=0&&blinkAmount(t,50)<=1);
 disposeResident(a);disposeResident(b);
});


test('combined facial extremes remain finite and anatomically bounded during motion',()=>{
 for(const side of ['min','max']){
  const profile={...DEFAULT_PROFILE,glasses:true,...Object.fromEntries(Object.entries(FACE_CONTROLS).map(([key,c])=>[key,c[side]]))};
  const a=createResident(definitionFromProfile(profile),{cache:false});let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
  for(const pose of ['Idle','Walk','Run']){a.motion.sample(pose,.2);a.model.updateMatrixWorld(true);mesh.skeleton.update();
   for(let i=0;i<mesh.geometry.attributes.position.count;i+=13){const v=mesh.getVertexPosition(i,new T.Vector3());assert.ok(v.toArray().every(Number.isFinite));assert.ok(Math.abs(v.x)<.85&&v.y>-.15&&v.y<2.1);}
  }disposeResident(a);
 }
});
