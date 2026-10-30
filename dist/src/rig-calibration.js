import * as THREE from '../vendor/three.module.js';
import {fitHandFrame} from './hand-frame.js';

// The original spatial rig put the ankle at 6.4% of standing height, near the
// boot cuff. Rebind at the ankle without moving the supplied mesh or its UVs.
// This restores lower-leg reach and moves the foot's rotation into the boot.
export function calibrateAnkles(model,height){
 if(model.userData.anklesCalibrated)return;
 model.updateWorldMatrix(true,true);
 for(const side of ['L','R']){
  const foot=model.getObjectByName('Foot'+side);if(!foot)continue;
  const point=foot.getWorldPosition(new THREE.Vector3());point.y-=height*.025;
  foot.position.copy(foot.parent.worldToLocal(point));foot.updateWorldMatrix(false,true);
 }
 model.updateWorldMatrix(true,true);const skeletons=new Set();
 model.traverse(o=>{if(o.isSkinnedMesh)skeletons.add(o.skeleton);});
 for(const skeleton of skeletons){skeleton.calculateInverses();skeleton.update();}
 model.userData.anklesCalibrated=true;
}

// The spatial source rigs put nearly two thirds of the arm above the elbow.
// Correct the pivot and its surrounding weight transition, retaining the hand
// position and every neutral surface vertex. The forearm can then hinge instead
// of flicking a short wrist section at the end of a long, rigid sleeve.
export function calibrateArms(model,height){
 if(model.userData.armRetargeted)return;
 model.updateWorldMatrix(true,true);const frames=[],fingerBones=[];model.userData.handFrames={};
 for(const side of ['L','R']){
  const upper=model.getObjectByName('UpperArm'+side),elbow=model.getObjectByName('Forearm'+side),hand=model.getObjectByName('Hand'+side);
  if(!upper||!elbow||!hand)continue;
  const start=upper.getWorldPosition(new THREE.Vector3()),end=hand.getWorldPosition(new THREE.Vector3()),oldElbow=elbow.getWorldPosition(new THREE.Vector3()),points=[];
  model.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const id=mesh.skeleton.bones.indexOf(hand),g=mesh.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;for(let i=0;i<g.attributes.position.count;i++){let w=0;for(let k=0;k<4;k++)if(si.array[i*4+k]===id)w+=sw.array[i*4+k];if(w>.8)points.push(new THREE.Vector3().fromBufferAttribute(g.attributes.position,i).applyMatrix4(mesh.matrixWorld));}});
  if(points.length>50){const frame=fitHandFrame(points,end.clone().sub(oldElbow).normalize(),side==='L'?1:-1),mq=model.getWorldQuaternion(new THREE.Quaternion()).invert();end.copy(frame.pivot);model.userData.handFrames[side]={quaternion:mq.clone().multiply(frame.quaternion).toArray()};}
  const descriptor=model.userData.handFrames[side];
  if(descriptor){
   const q=model.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().fromArray(descriptor.quaternion)),along=new THREE.Vector3(0,1,0).applyQuaternion(q);
   const lengths=points.map(p=>p.clone().sub(end).dot(along)).sort((a,b)=>a-b),length=lengths[Math.floor(lengths.length*.95)],knuckle=length*.45,tip=length*.72;
   const addFinger=(name,parent,distance)=>{const b=new THREE.Bone();b.name=name;parent.add(b);b.position.copy(parent.worldToLocal(end.clone().addScaledVector(along,distance)));b.updateWorldMatrix(false,true);fingerBones.push(b);return b;};
   const finger=addFinger('Fingers'+side,hand,knuckle);addFinger('FingerTips'+side,finger,tip);
   descriptor.knuckle=knuckle;descriptor.tip=tip;descriptor.length=length;
  }
  const pivot=start.clone().lerp(end,.54);pivot.z-=height*.006;
  elbow.position.copy(elbow.parent.worldToLocal(pivot));elbow.updateWorldMatrix(false,true);
  hand.position.copy(hand.parent.worldToLocal(end));hand.updateWorldMatrix(false,true);
  if(descriptor){const q=model.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().fromArray(descriptor.quaternion)),along=new THREE.Vector3(0,1,0).applyQuaternion(q);for(const [name,distance] of [['Fingers',descriptor.knuckle],['FingerTips',descriptor.tip]]){const bone=model.getObjectByName(name+side);bone.position.copy(bone.parent.worldToLocal(end.clone().addScaledVector(along,distance)));bone.updateWorldMatrix(false,true);}}
  frames.push({side,start,end});
 }
 model.updateWorldMatrix(true,true);const skeletons=new Set();
 model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  if(!skeletons.has(mesh.skeleton)){mesh.skeleton.bones.push(...fingerBones);mesh.skeleton.calculateInverses();mesh.skeleton.init();skeletons.add(mesh.skeleton);}
  const g=mesh.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,v=new THREE.Vector3();
  for(const {side,start,end} of frames){
   const names=mesh.skeleton.bones.map(b=>b.name),ids=['UpperArm','Forearm','Hand'].map(n=>names.indexOf(n+side));
   const axis=end.clone().sub(start),length2=axis.lengthSq();
   for(let i=0;i<p.count;i++){
    const old=new Map();for(let k=0;k<4;k++){const bone=si.array[i*4+k],w=sw.array[i*4+k];if(w)old.set(bone,(old.get(bone)||0)+w);}
    const total=ids.reduce((s,id)=>s+(old.get(id)||0),0);if(total<.02)continue;
    v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).sub(start);const along=v.dot(axis)/length2;
    const fore=THREE.MathUtils.smoothstep(along,.40,.68),hand=(old.get(ids[2])||0)/total;
    for(const id of ids)old.delete(id);old.set(ids[0],total*(1-hand)*(1-fore));old.set(ids[1],total*(1-hand)*fore);
    const descriptor=model.userData.handFrames[side];
    if(descriptor){
     const alongAxis=new THREE.Vector3(0,1,0).applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().fromArray(descriptor.quaternion)));
     const distance=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).sub(end).dot(alongAxis);
     const finger=THREE.MathUtils.smoothstep(distance,descriptor.knuckle-.012,descriptor.knuckle+.014),tip=THREE.MathUtils.smoothstep(distance,descriptor.tip-.012,descriptor.tip+.015);
     old.set(ids[2],total*hand*(1-finger));old.set(names.indexOf('Fingers'+side),total*hand*finger*(1-tip));old.set(names.indexOf('FingerTips'+side),total*hand*finger*tip);
    }else old.set(ids[2],total*hand);
    const pairs=[...old].filter(([,w])=>w>1e-7).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=pairs.reduce((s,[,w])=>s+w,0);
    for(let k=0;k<4;k++){si.array[i*4+k]=pairs[k]?.[0]||0;sw.array[i*4+k]=(pairs[k]?.[1]||0)/sum;}
   }
  }
  si.needsUpdate=sw.needsUpdate=true;
 });
 for(const skeleton of skeletons){skeleton.calculateInverses();skeleton.update();}
 model.userData.armRetargeted=true;
}
