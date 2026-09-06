import * as THREE from '../vendor/three.module.js';
import { Kit, addSign, fixture, pipe } from './kit.js';
import { SILO, TAU } from './data.js';

// Back-of-house circulation is inferred. It gives the six wings a second
// physical connection instead of turning every department into a dead end.
export const PASSAGE = Object.freeze({inner:52,outer:55.2,height:3.7});
export const hasRearPassage = (level,type) => level !== 1 && type !== 'cafeteria';
export function buildPassages(m,level,types){
  const root=new THREE.Group(),k=new Kit(m),{inner:R,outer:O,height:H}=PASSAGE;
  const openings=types.flatMap((type,w)=>hasRearPassage(level,type)?[[w*TAU/6,1.55/R]]:[]);
  k.arc('floor',R,O,.3,-.3);k.arc('darkConcrete',R,O,.2,H);
  k.arc('darkConcrete',O,O+.18,H,0);
  for(let w=0;w<6;w++){
    const a=w*TAU/6,next=a+TAU/6,gap=hasRearPassage(level,types[w])?1.55/R:0;
    const nextGap=hasRearPassage(level,types[(w+1)%6])?1.55/R:0;
    k.arc('pale',R-.16,R,H,0,a+gap,next-nextGap-a-gap,24);
    if(gap){
      const connector=new Kit(m),ry=Math.PI/2-a;
      connector.box('floor',0,-.15,26,3.1,.3,4.4);
      for(const side of [-1,1])connector.box('pale',side*1.55,H/2,25.25,.16,H,2.5);
      connector.box('darkConcrete',0,H,25.25,3.2,.18,2.5);
      fixture(connector,0,3.3,25.3,1.6);
      const g=connector.group();g.position.set(Math.cos(a)*SILO.deckOuter,0,Math.sin(a)*SILO.deckOuter);g.rotation.y=ry;root.add(g);
      const signPoint=new THREE.Vector3(0,2.7,26.7).applyAxisAngle(new THREE.Vector3(0,1,0),ry).add(g.position);
      addSign(root,`GALLERY ${String.fromCharCode(65+w)} · ${String(level).padStart(3,'0')}`,signPoint.toArray(),2.45,.32,ry);
    }
  }
  for(let j=0;j<48;j++){
    const a=(j+.5)*TAU/48,r=(R+O)/2,ry=Math.PI/2-a;
    // Compression ribs, pipe hangers and pools of light along the curve.
    for(const rr of [R+.06,O-.06])k.box('concrete',Math.cos(a)*rr,H/2,Math.sin(a)*rr,.16,H,.15,ry);
    k.box('concrete',Math.cos(a)*r,H-.08,Math.sin(a)*r,.17,.25,O-R,ry);
    if(j%2===0)fixture(k,Math.cos(a)*r,H-.3,Math.sin(a)*r,1.2,false,j%8===0);
    if(j%4===0){
      const signPoint=[Math.cos(a)*(O-.14),1.9,Math.sin(a)*(O-.14)];
      addSign(root,`←  ${String(level).padStart(3,'0')}  →`,signPoint,1.7,.34,ry+Math.PI);
    }
  }
  for(const y of [2.8,3.12])k.arc('rust',O-.42,O-.31,.095,y,0,TAU,144);
  root.add(k.group());root.userData.openings=openings;return root;
}
