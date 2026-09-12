import * as THREE from '../vendor/three.module.js';
import {Kit,random} from './kit.js';
import {memoryFor} from './floor-memories.js';
import {curvedWallSign} from './sign-mounts.js';
export const INTERIOR_LIGHT=0xe6ddc9;
export function floorAtmosphere(level){
  if(level<50)return {band:'blue',name:'CIVIC SERVICES',light:INTERIOR_LIGHT,fog:0x282c29,density:.0072};
  if(level<=100)return {band:'green',name:'RESIDENT SERVICES',light:INTERIOR_LIGHT,fog:0x282c29,density:.008};
  return {band:'rust',name:'MECHANICAL SERVICES',light:INTERIOR_LIGHT,fog:0x282c29,density:.009};
}
export function dressFloor(root,m,level){
  const labels=new THREE.Group();labels.name='service-notices';root.add(labels);
  const k=new Kit(m),theme=floorAtmosphere(level),rng=random(level*1889);
  // Repaired wall seams, numbered conduit straps and service paint are batched
  // into the streamed floor. They sit above or outside the walking envelope.
  for(let wing=0;wing<6;wing++){
    const a=wing*Math.PI/3,r=25.14;
    for(const side of [-1,1]){
      const angle=a+side*.17,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      k.box(theme.band,x,2.9,z,1.75,.14,.024,Math.PI/2-angle);
      k.box('metal',x,2.5,z,.46,.65,.08,Math.PI/2-angle);
      for(let j=0;j<4;j++)k.box('darkMetal',x,2.28+j*.12,z,.3,.025,.09,Math.PI/2-angle);
    }
    const aa=a+.34;
    curvedWallSign(labels,m,`${String(level).padStart(3,'0')} / ${String.fromCharCode(65+wing)}\n${level>100?'POWER & WATER':level>49?'REPAIRS & RETURNS':'SERVICE REGISTER'}`,aa,1.93,25.4,1.3,.66,{background:level>100?'#503f2d':'#2b4040',color:'#c5c6ab',font:'bold 58px monospace'});
    // Patch bolts and damp streaks vary by floor without changing navigation.
    for(let j=0;j<4;j++){const ang=a+.24+rng()*.25;k.box('darkConcrete',Math.cos(ang)*25.12,4+rng()*.45,Math.sin(ang)*25.12,.06+rng()*.15,.7+rng(),.016,Math.PI/2-ang);}
  }
  const memory=memoryFor(level),angle=.51;
  const record=curvedWallSign(labels,m,`${String(level).padStart(3,'0')} / RESIDENT NOTES\n${memory.title.toUpperCase()}`,angle,1.9,25.4,1.45,.62,{background:level>100?'#493d2e':'#35423c',color:'#dfd4b5',font:'bold 56px monospace',glow:.18});
  record.name=`floor-memory-${level}`;
  // The clipped papers and the service fixture have real thickness and
  // fixings. No freestanding labels or emissive pickup markers.
  const pk=new Kit(m);pk.box('brass',0,.31,.01,.20,.06,.025);
  pk.box('wood',0,-.43,-.04,1.4,.21,.018);
  for(const x of [-.62,.62])pk.box('metal',x,-.35,-.035,.035,.18,.025);
  for(let i=0;i<3;i++)pk.box(i===level%3?'ochre':'paper',-.45+i*.45,-.43,-.027,.37,.13,.012);
  record.add(pk.group());
  root.userData.floorMemory=memory;
  root.userData.memoryInteraction={position:record.position.clone().add(new THREE.Vector3(-Math.cos(angle)*.06,0,-Math.sin(angle)*.06)),label:`Read: ${memory.title}`,action:`floor-memory:${level}`};
  const detail=k.group();detail.name='lived-in-floor-services';root.add(detail);
}
