import * as THREE from '../vendor/three.module.js';
import {Kit,addSign,random,SIGN_DEPTH} from './kit.js';
export function floorAtmosphere(level){
  if(level<50)return {band:'blue',name:'CIVIC SERVICES',light:0xc4dcda,fog:0x202a2c,density:.0072};
  if(level<=100)return {band:'green',name:'RESIDENT SERVICES',light:0xe6d8b8,fog:0x292d26,density:.008};
  return {band:'rust',name:'MECHANICAL SERVICES',light:0xe4b381,fog:0x302920,density:.009};
}
export function dressFloor(root,m,level){
  const labels=new THREE.Group();labels.name='service-notices';root.add(labels);
  const k=new Kit(m),theme=floorAtmosphere(level),rng=random(level*1889);
  // Repaired wall seams, numbered conduit straps and service paint are batched
  // into the streamed floor. They sit above or outside the walking envelope.
  for(let wing=0;wing<6;wing++){
    const a=wing*Math.PI/3,r=25.14,ry=Math.PI/2-a;
    for(const side of [-1,1]){
      const angle=a+side*.17,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      k.box(theme.band,x,2.9,z,1.75,.14,.024,Math.PI/2-angle);
      k.box('metal',x,2.5,z,.46,.65,.08,Math.PI/2-angle);
      for(let j=0;j<4;j++)k.box('darkMetal',x,2.28+j*.12,z,.3,.025,.09,Math.PI/2-angle);
    }
    const aa=a+.34,signRadius=25.4-SIGN_DEPTH/2,x=Math.cos(aa)*signRadius,z=Math.sin(aa)*signRadius;
    addSign(labels,`${String(level).padStart(3,'0')} / ${String.fromCharCode(65+wing)}\n${level>100?'POWER & WATER':level>49?'REPAIRS & RETURNS':'SERVICE REGISTER'}`,[x,1.93,z],1.3,.66,Math.PI/2-aa+Math.PI,{background:level>100?'#503f2d':'#2b4040',color:'#c5c6ab',font:'bold 58px monospace'});
    // Patch bolts and damp streaks vary by floor without changing navigation.
    for(let j=0;j<4;j++){const ang=a+.24+rng()*.25;k.box('darkConcrete',Math.cos(ang)*25.12,4+rng()*.45,Math.sin(ang)*25.12,.06+rng()*.15,.7+rng(),.016,Math.PI/2-ang);}
  }
  const detail=k.group();detail.name='lived-in-floor-services';root.add(detail);
}
