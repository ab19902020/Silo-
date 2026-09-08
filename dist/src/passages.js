import * as THREE from '../vendor/three.module.js';
import { Kit, addSign, fixture, pipe } from './kit.js';
import { SILO, TAU } from './data.js';

// Back-of-house circulation is inferred. It gives the six wings a second
// physical connection instead of turning every department into a dead end.
export const PASSAGE = Object.freeze({inner:52,outer:55.2,height:3.7});
// A short dead-end spur off the back walkway on the bottom floor. It ends in a
// plain wall with a notice on it — no doorway, no frame, nothing to show that
// anything was ever there. Move the notice and the wall behind it is already
// broken through. The wording of the filmed plate was not available, so this is
// written to match the silo's other stencilled signage.
//
// Module state on purpose: the level is rebuilt when it changes, so the opening
// gets real collision instead of a wall you can walk through.
export const SPUR=Object.freeze({level:144,angle:Math.PI/6,half:1.45,inner:55.38,outer:65.4,height:3.2});
export const breach={open:false};
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
  root.userData.interactions=[];
  if(level===SPUR.level){
    const {angle:a,half,inner:I,outer:X,height:SH}=SPUR,mid=(I+X)/2,len=X-I;
    const spur=new THREE.Group();spur.name='digger-passage';spur.rotation.y=Math.PI/2-a;root.add(spur);
    const sk=new Kit(m);                                   // local +z runs radially outward
    sk.box('floor',0,-.15,mid,half*2,.3,len);
    sk.box('darkConcrete',0,SH,mid,half*2+.5,.22,len);
    for(const side of [-1,1])sk.box('pale',side*(half+.11),SH/2,mid,.22,SH,len);
    for(let z=I+2.2;z<X-1;z+=3.6)fixture(sk,0,SH-.28,z,1.1,false);
    for(const side of [-1,1])pipe(sk,side*(half-.25),mid,SH-.5,len-.6,.11);
    if(breach.open){
      // Broken through. The blockwork was only ever a skin over the opening.
      for(const side of [-1,1])sk.box('darkConcrete',side*(half-.3),SH/2,X-.13,.62,SH,.26);
      sk.box('darkConcrete',0,SH-.32,X-.13,half*2,.64,.26);
      sk.box('black',0,1.25,X-.31,half*1.55,2.45,.05);
      for(let i=0;i<12;i++){const t=(i/11-.5)*2.2;sk.box('rock',t,(i%2?.2:2.42)+(i%3)*.05,X-.34,.26+(i%3)*.07,.2,.22,false);}
      root.userData.interactions.push({position:[Math.cos(a)*(X-2.4),1.5,Math.sin(a)*(X-2.4)],label:'Climb through the wall',destination:'excavator'});
    }else{
      sk.box('darkConcrete',0,SH/2,X-.13,half*2+.5,SH,.26);
      addSign(spur,'DO NOT PASS THIS POINT\nSTRUCTURAL LIMIT · MECHANICAL',[0,1.86,X-.27],2.55,.72,Math.PI,{background:'#3a2f22',color:'#d9cbaa'});
      root.userData.interactions.push({position:[Math.cos(a)*(X-2.4),1.5,Math.sin(a)*(X-2.4)],label:'Move the sign aside',action:'breach'});
    }
    spur.add(sk.group());
  }
  root.add(k.group());root.userData.openings=openings;return root;
}
