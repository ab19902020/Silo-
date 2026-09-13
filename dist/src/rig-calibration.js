import * as THREE from '../vendor/three.module.js';

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
