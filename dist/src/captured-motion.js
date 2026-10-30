import {CAPTURED_GAITS} from './captured-gaits.js';

export function gaitStyle(id='',appearance={}){
 if(id==='bernard'||appearance.age>.65)return 'measured';
 if(id==='sims'||id==='knox'||id==='amundsen')return 'security';
 return 'engineer';
}
// Reuse per-actor output arrays. Sampling a crowd must not allocate dozens of
// short arrays per person per frame; callers without an output keep snapshots.
function blendTrack(walk,fast,phase,run,out){
 const phase01=((phase%1+1)%1),wf=phase01*(walk.length-1),ff=phase01*(fast.length-1),wi=Math.floor(wf),fi=Math.floor(ff),wt=wf-wi,ft=ff-fi;
 for(let j=0;j<walk[0].length;j++){
  const a=walk[wi][j]+(walk[wi+1][j]-walk[wi][j])*wt,b=fast[fi][j]+(fast[fi+1][j]-fast[fi][j])*ft;out[j]=a+(b-a)*run;
 }return out;
}
export function capturedPose(style,phase,run=0,out=null){
 const walk=CAPTURED_GAITS[style]||CAPTURED_GAITS.engineer,fast=CAPTURED_GAITS.run;
 const pose=out||{pelvis:[],body:[],joints:{}};
 blendTrack(walk.pelvis,fast.pelvis,phase,run,pose.pelvis);blendTrack(walk.body,fast.body,phase,run,pose.body);
 for(const name of Object.keys(walk.joints))blendTrack(walk.joints[name],fast.joints[name],phase,run,pose.joints[name]||(pose.joints[name]=[]));
 return pose;
}
