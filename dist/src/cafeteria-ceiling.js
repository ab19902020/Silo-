import * as THREE from '../vendor/three.module.js';
import { Kit } from './kit.js';

// Modelled from the supplied cafeteria still: soft concrete coffers surround
// a luminous flower. These are rounded lenses, not triangular radial strips.
export function buildCafeteriaCeiling(m){
  const k=new Kit(m),root=new THREE.Group();root.name='cafeteria-petal-ceiling';
  const rounded=(p,w,d,r)=>{const x=-w/2,z=-d/2;p.moveTo(x+r,z);p.lineTo(x+w-r,z);p.quadraticCurveTo(x+w,z,x+w,z+r);p.lineTo(x+w,z+d-r);p.quadraticCurveTo(x+w,z+d,x+w-r,z+d);p.lineTo(x+r,z+d);p.quadraticCurveTo(x,z+d,x,z+d-r);p.lineTo(x,z+r);p.quadraticCurveTo(x,z,x+r,z);};
  for(const [w,d,r,y,depth] of [[35,29,5.7,8.03,.30],[33.5,27.5,5.4,7.80,.26],[31.9,25.9,5.1,7.57,.22]]){
    const shape=new THREE.Shape(),hole=new THREE.Path();rounded(shape,w,d,r);rounded(hole,w-.58,d-.58,r-.29);shape.holes.push(hole);
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.07,bevelThickness:.06,bevelSegments:3,curveSegments:16,steps:1});g.rotateX(Math.PI/2);k.mesh(g,'concrete',0,y,24);
  }
  k.cylinder('darkConcrete',0,7.45,24,12.5,.32);k.cylinder('concrete',0,7.20,24,2.13,.18);
  k.cylinder('coldLamp',0,7.094,24,1.82,.035);
  const petal=new THREE.Shape();petal.moveTo(2.55,-.19);
  petal.bezierCurveTo(4.4,-.44,8.6,-1.90,10.5,-1.47);petal.bezierCurveTo(12.1,-1.15,12.1,1.15,10.5,1.47);petal.bezierCurveTo(8.6,1.90,4.4,.44,2.55,.19);petal.quadraticCurveTo(2.25,0,2.55,-.19);
  const geometry=new THREE.ExtrudeGeometry(petal,{depth:.045,bevelEnabled:true,bevelThickness:.025,bevelSize:.04,bevelSegments:3,curveSegments:18,steps:1});geometry.rotateX(Math.PI/2);
  for(let i=0;i<16;i++)k.mesh(geometry,'lamp',0,7.10,24,1,1,1,0,i*Math.PI/8);
  for(const [r,y,t] of [[2.14,7.1,.075],[12.13,7.12,.12],[12.58,7.34,.12]])k.torus('concrete',0,y,24,r,t,Math.PI/2);
  // Recessed oblong perimeter lamps, with cast returns and black baffles.
  for(const x of [-15,15])for(const z of [14,24,34]){k.bevel('darkMetal',x,7.99,z,.80,.17,2.6);k.bevel('lamp',x,7.88,z,.46,.025,2.13);}
  root.add(k.group());root.userData.petals=16;return root;
}
