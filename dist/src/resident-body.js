import * as T from '../vendor/three.module.js';
import {RESIDENT_BODY as data} from './resident-body-data.js';

export function addResidentBody({a,wide,suit,coat,skin,dark,add,binding}){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setIndex(data.indices);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setX(i,x*wide);
  // Fabric hangs from the anatomical form, with low folds at cuffs, knees and
  // waist. Millimetres of relief avoid the previous spherical joint shapes.
  if(data.tones[i]!==2){const fold=(Math.exp(-(((y-.52)/.085)**2))+.5*Math.exp(-(((y-1.12)/.055)**2)))*.0017*Math.sin(y*145+x*42);p.setZ(i,z+fold*Math.sign(z||1));}
 }
 g.computeVertexNormals();
 const pants=suit?coat:coat.clone().multiplyScalar(.64);
 add(g,coat,(y,x,z,i)=>binding(data.joints[data.skinIndices[i*2]],data.joints[data.skinIndices[i*2+1]],data.skinWeights[i]),null,false,(x,y,z,i)=>{
  const hand=data.tones[i]===2,forearm=a.shortSleeves&&Math.abs(x)>.16*wide&&y<1.10&&y>.865;
  const skinPart=(hand||forearm)&&!suit,base=skinPart?skin:hand?dark:data.tones[i]===1?pants:coat;
  const wear=skinPart?1:.98+.012*Math.sin(y*79+x*38)+.008*Math.sin(z*107+y*63);
  return {color:base.clone().multiplyScalar(wear),surface:[skinPart?.52:hand?.62:.87,0,skinPart?1:0,skinPart?0:1]};
 });
}
