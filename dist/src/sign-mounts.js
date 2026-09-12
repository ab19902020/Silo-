import * as THREE from '../vendor/three.module.js';
import {Kit,addSign,SIGN_DEPTH} from './kit.js';

// Plate, fixings and support share one coordinate system. The enamel face is
// +Z; mounting metal always stays behind it, even on a rotated shopfront.
export function hangingSign(root,m,text,position,w,h,ry,ceiling,options={}){
  const sign=addSign(root,text,position,w,h,ry,options),k=new Kit(m);
  const top=(h+.055)/2;
  for(const x of [-w*.36,w*.36]){
    k.beam('darkMetal',[x,top,0],[x,ceiling-position[1],0],.012);
    k.box('metal',x,ceiling-position[1],0,.12,.035,.12);
  }
  sign.add(k.group());sign.userData.mount='ceiling';sign.userData.mountTop=ceiling;return sign;
}
export function wallSign(root,m,text,position,w,h,ry,gap=.002,options={}){
  const sign=addSign(root,text,position,w,h,ry,options),k=new Kit(m);
  for(const x of [-w*.37,w*.37])k.box('darkMetal',x,0,-SIGN_DEPTH/2-gap/2,.045,Math.min(h*.65,.18),Math.max(.004,gap));
  sign.add(k.group());sign.userData.mount='wall';return sign;
}
export function curvedWallSign(root,m,text,angle,y,radius,w,h,options={}){
  // A wide tangent plate used to disappear into the circular wall at its
  // corners. Set the entire back edge inside the wall, then bridge the gap.
  const half=(w+.055)/2,r=Math.sqrt(radius*radius-half*half)-SIGN_DEPTH/2-.006;
  const group=addSign(root,text,[Math.cos(angle)*r,y,Math.sin(angle)*r],w,h,Math.PI*1.5-angle,options),k=new Kit(m);
  for(const x of [-w*.37,w*.37]){
    const gap=Math.sqrt(radius*radius-x*x)-r-SIGN_DEPTH/2;
    k.box('darkMetal',x,0,-SIGN_DEPTH/2-gap/2,.05,Math.min(h*.7,.24),gap+.008);
  }
  group.add(k.group());group.userData.mount='curved-wall';group.userData.wallRadius=radius;return group;
}
