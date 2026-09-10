import * as THREE from '../vendor/three.module.js';
import {Kit,addSign,random} from './kit.js';

import {SILO_LAYOUT,siloPosition} from './exterior-layout.js';
export {SILO_LAYOUT,siloPosition} from './exterior-layout.js';

export function buildExteriorNetwork(materials,groundY){
  const root=new THREE.Group(),tops=new THREE.Group(),wreck=new THREE.Group(),interactions=[],rng=random(170018);
  root.name='exterior-silo-network';tops.name='distant-silo-crowns';wreck.name='silo-17-breach';root.add(tops,wreck);
  const capGeo=new THREE.BoxGeometry(7,.3,11),rimGeo=new THREE.BoxGeometry(7.5,.18,11.5),hatchGeo=new THREE.BoxGeometry(6,.18,10);
  const capMat=materials.darkConcrete,rimMat=materials.concrete,hatchMat=materials.darkMetal;
  const crowns=SILO_LAYOUT.filter(s=>s.id!==18&&s.id!==17),surfaces=[];
  const caps=new THREE.InstancedMesh(capGeo,capMat,49),rims=new THREE.InstancedMesh(rimGeo,rimMat,49),hatches=new THREE.InstancedMesh(hatchGeo,hatchMat,49);
  tops.add(caps,rims,hatches);const pose=new THREE.Object3D();let index=0;
  for(const silo of SILO_LAYOUT){
    if(silo.id===18||silo.id===17)continue;
    const x=26+silo.x,z=108+silo.z,y=groundY(x,z)+.15;
    surfaces.push({id:silo.id,x,z,y});
    pose.position.set(x,y,z);pose.rotation.set(0,0,0);pose.updateMatrix();caps.setMatrixAt(index,pose.matrix);
    pose.position.y=y+.2;pose.rotation.x=0;pose.updateMatrix();rims.setMatrixAt(index,pose.matrix);
    pose.position.set(x,y+.4,z);pose.rotation.set(0,0,0);pose.updateMatrix();hatches.setMatrixAt(index,pose.matrix);index++;
    addSign(root,String(silo.id).padStart(2,'0'),[x,y+.7,z-5.9],1.6,.7,Math.PI,{background:'#434b44',color:'#ccd0b9'});
  }
  for(const mesh of tops.children){mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  tops.userData.crowns=crowns.map(s=>s.id);
  // Silo 17: a broken crown, an open service throat and a flooded chamber.
  const s17=siloPosition(17),x=26+s17.x,z=108+s17.z,y=groundY(x,z),k=new Kit(materials);
  k.arc('darkConcrete',3.8,4.5,.45,0,.22,Math.PI*1.72,32);
  for(let i=0;i<12;i++){const a=.28+i*.245,rr=3.8+rng()*1.5;k.bevel('concrete',Math.cos(a)*rr,rng()*.35,Math.sin(a)*rr,.4+rng()*.8,.2+rng()*.4,.4+rng()*.9,rng());}
  // Terrain occludes the below-ground throat. The climb interaction leads to
  // the separately streamed interior; the surface opening stays a broken lip.
  k.box('darkMetal',0,.02,0,6,.08,8);k.bevel('rust',3,.25,0,.25,.5,8);
  const waterMat=materials.glass.clone();waterMat.color.setHex(0x172d2d);waterMat.transparent=true;waterMat.opacity=.82;waterMat.roughness=.24;const water=new THREE.Mesh(new THREE.CircleGeometry(17,48),waterMat);water.rotation.x=-Math.PI/2;water.position.y=-4.35;water.name='silo-17-water';
  wreck.add(k.group(),water);wreck.position.set(x,y,z);addSign(wreck,'17',[0,.9,-4.8],2.2,1.1,0,{background:'#3b403d',color:'#b7b39f'});
  interactions.push({id:'silo17-entry',position:[x,y+1,z-5.5],label:'Climb into Silo 17',action:'enter-silo17'});
  const bounds=new THREE.Box3().setFromObject(root);
  return {root,tops,wreck,water,interactions,bounds,layout:SILO_LAYOUT,surfaces,
    floorAt(x,z,maxHeight){for(const s of surfaces)if(Math.abs(x-s.x)<3.5&&Math.abs(z-s.z)<5.5&&s.y+.5<=maxHeight+.001)return s.y+.5;return -Infinity;}};
}
