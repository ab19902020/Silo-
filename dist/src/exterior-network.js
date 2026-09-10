import * as THREE from '../vendor/three.module.js';
import {Kit,addSign,random} from './kit.js';

// The story establishes a field of numbered silos, but no public dimensioned
// survey fixes every centre point. This compact staggered grid is therefore a
// declared reconstruction. Silo 17 is adjacent to 18 so it can be reached on
// foot, as the television story requires.
const raw=[];for(let row=-3;row<=3;row++)for(let col=-3;col<=3;col++)raw.push({q:col,r:row});
raw.push({q:-4,r:-1},{q:-4,r:0});
const centre=raw.findIndex(p=>p.q===0&&p.r===0);[raw[18],raw[centre]]=[raw[centre],raw[18]];
const seventeen=raw.findIndex(p=>p.q===1&&p.r===0);[raw[17],raw[seventeen]]=[raw[seventeen],raw[17]];
export const SILO_LAYOUT=Object.freeze(raw.slice(0,51).map((p,id)=>Object.freeze({id,q:p.q,r:p.r,x:(p.q+p.r*.5)*178,z:p.r*154})));
export const siloPosition=id=>SILO_LAYOUT.find(s=>s.id===id);

export function buildExteriorNetwork(materials,groundY){
  const root=new THREE.Group(),tops=new THREE.Group(),wreck=new THREE.Group(),interactions=[],rng=random(170018);
  root.name='exterior-silo-network';tops.name='distant-silo-crowns';wreck.name='silo-17-breach';root.add(tops,wreck);
  const capGeo=new THREE.CylinderGeometry(27,29,12,32),rimGeo=new THREE.TorusGeometry(29.2,1.05,8,32),hatchGeo=new THREE.BoxGeometry(6,.8,10);
  const capMat=materials.darkConcrete,rimMat=materials.concrete,hatchMat=materials.darkMetal;
  const crowns=SILO_LAYOUT.filter(s=>s.id!==18&&s.id!==17),surfaces=[];
  const caps=new THREE.InstancedMesh(capGeo,capMat,49),rims=new THREE.InstancedMesh(rimGeo,rimMat,49),hatches=new THREE.InstancedMesh(hatchGeo,hatchMat,49);
  tops.add(caps,rims,hatches);const pose=new THREE.Object3D();let index=0;
  for(const silo of SILO_LAYOUT){
    if(silo.id===18||silo.id===17)continue;
    const x=26+silo.x,z=108+silo.z,y=Math.max(...Array.from({length:8},(_,j)=>groundY(x+Math.cos(j*Math.PI/4)*29,z+Math.sin(j*Math.PI/4)*29)))+.3;
    surfaces.push({id:silo.id,x,z,y});
    pose.position.set(x,y-6,z);pose.rotation.set(0,0,0);pose.updateMatrix();caps.setMatrixAt(index,pose.matrix);
    pose.position.y=y+.4;pose.rotation.x=Math.PI/2;pose.updateMatrix();rims.setMatrixAt(index,pose.matrix);
    pose.position.set(x,y+.4,z-8);pose.rotation.set(0,(silo.id%8)*Math.PI/4,0);pose.updateMatrix();hatches.setMatrixAt(index,pose.matrix);index++;
    addSign(root,String(silo.id).padStart(2,'0'),[x,y+.9,z-12],1.6,.7,Math.PI,{background:'#434b44',color:'#ccd0b9'});
  }
  for(const mesh of tops.children){mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
  tops.userData.crowns=crowns.map(s=>s.id);
  // Silo 17: a broken crown, an open service throat and a flooded chamber.
  const s17=siloPosition(17),x=26+s17.x,z=108+s17.z,y=groundY(x,z),k=new Kit(materials);
  k.arc('darkConcrete',18,31,2.2,0,.22,Math.PI*1.72,46);
  for(let i=0;i<22;i++){const a=.28+i*.245,rr=18+rng()*12;k.bevel('concrete',Math.cos(a)*rr,1+rng()*1.8,Math.sin(a)*rr,1.5+rng()*3,.7+rng()*1.6,1.2+rng()*2.5,rng());}
  // Terrain occludes the below-ground throat. The climb interaction leads to
  // the separately streamed interior; the surface opening stays a broken lip.
  k.box('darkMetal',0,.02,-19,7,.08,8);k.portal('rust',0,-.1,-16,7,3,.4,0,.55,.18);
  const waterMat=materials.glass.clone();waterMat.color.setHex(0x172d2d);waterMat.transparent=true;waterMat.opacity=.82;waterMat.roughness=.24;const water=new THREE.Mesh(new THREE.CircleGeometry(17,48),waterMat);water.rotation.x=-Math.PI/2;water.position.y=-4.35;water.name='silo-17-water';
  wreck.add(k.group(),water);wreck.position.set(x,y,z);addSign(wreck,'17',[0,1.4,-21],2.2,1.1,0,{background:'#3b403d',color:'#b7b39f'});
  interactions.push({id:'silo17-entry',position:[x,y+1,z-20],label:'Enter the breached crown of Silo 17',action:'enter-silo17'});
  const bounds=new THREE.Box3().setFromObject(root);
  return {root,tops,wreck,water,interactions,bounds,layout:SILO_LAYOUT,surfaces,
    floorAt(x,z,maxHeight){for(const s of surfaces)if(Math.hypot(x-s.x,z-s.z)<27&&s.y<=maxHeight+.001)return s.y;return -Infinity;}};
}
