import {CAPTURED_GAITS} from './captured-gaits.js';

export function gaitStyle(id='',appearance={}){
 if(id==='bernard'||appearance.age>.65)return 'measured';
 if(id==='sims'||id==='knox'||id==='amundsen')return 'security';
 return 'engineer';
}
function at(track,phase){
 const f=((phase%1+1)%1)*(track.length-1),i=Math.floor(f),t=f-i;
 return track[i].map((v,j)=>v+(track[i+1][j]-v)*t);
}
export function capturedPose(style,phase,run=0){
 const walk=CAPTURED_GAITS[style]||CAPTURED_GAITS.engineer,fast=CAPTURED_GAITS.run;
 const blend=(a,b)=>a.map((v,i)=>v+(b[i]-v)*run);
 const pose={pelvis:blend(at(walk.pelvis,phase),at(fast.pelvis,phase)),body:blend(at(walk.body,phase),at(fast.body,phase)),joints:{}};
 for(const name of Object.keys(walk.joints))pose.joints[name]=blend(at(walk.joints[name],phase),at(fast.joints[name],phase));
 return pose;
}
