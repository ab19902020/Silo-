import * as THREE from '../vendor/three.module.js';
import { VOID } from './void-access.js';

// One water sheet for the basin AND culvert. Two coplanar transparent meshes
// used to compete for the depth buffer at the mouth on every camera movement.
export function voidWaterGeometry(){
  const radius=79,half=2.275,a=VOID.tunnelAngle,cut=Math.asin(half/radius);
  const perimeter=[];
  for(let i=0;i<=192;i++){
    const t=a+cut+i*(Math.PI*2-2*cut)/192;
    perimeter.push([Math.cos(t)*radius,Math.sin(t)*radius]);
  }
  const c=Math.cos(a),s=Math.sin(a),end=VOID.tunnelRadius+9.6;
  perimeter.push([c*end+s*half,s*end-c*half],[c*end-s*half,s*end+c*half]);
  const positions=[0,VOID.waterY,0],indices=[];
  for(const [x,z] of perimeter)positions.push(x,VOID.waterY,z);
  for(let i=0;i<perimeter.length;i++)indices.push(0,(i+1)%perimeter.length+1,i+1);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
