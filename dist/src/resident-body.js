import * as T from '../vendor/three.module.js';
import {GarmentSurface} from './garment-surface.js';
import {RESIDENT_BODY as data} from './resident-body-data.js';

const neighbours=Array.from({length:data.positions.length/3},()=>new Set());
for(let i=0;i<data.indices.length;i+=3){const tri=data.indices.slice(i,i+3);for(const a of tri)for(const b of tri)if(a!==b)neighbours[a].add(b);}

export function addResidentBody({a,wide,suit,coat,skin,dark,add,binding}){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setIndex(data.indices);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setX(i,x*wide);
  // Fabric hangs from the anatomical form, with low folds at cuffs, knees and
  // waist. Millimetres of relief avoid the previous spherical joint shapes.
  if(data.tones[i]!==2){const fold=(Math.exp(-(((y-.52)/.085)**2))+.5*Math.exp(-(((y-1.12)/.055)**2)))*.0017*Math.sin(y*145+x*42);p.setZ(i,z+fold*Math.sign(z||1));}
 }
 // Soften the cloth envelope across shoulder and waist transitions without
 // changing facial topology, fingers or the underlying rig.
 for(let pass=0;pass<2;pass++){const next=p.array.slice();for(let i=0;i<p.count;i++){
  if(data.tones[i]===2||p.getY(i)>1.435)continue;const near=neighbours[i];if(!near.size)continue;
  for(let k=0;k<3;k++){let mean=0;for(const j of near)mean+=p.array[j*3+k];next[i*3+k]=p.array[i*3+k]*.82+mean/near.size*.18;}
 }p.array.set(next);}
 g.computeVertexNormals();
 const bind=i=>binding(data.joints[data.skinIndices[i*2]],data.joints[data.skinIndices[i*2+1]],data.skinWeights[i]);
 const excludedBones=data.joints.filter(n=>/Arm|Forearm|Hand|Fingers|FingerTips/.test(n)).map(n=>binding(n)[0]);
 const surface=new GarmentSurface(g,bind,{excludedBones});
 const pants=suit?coat:coat.clone().multiplyScalar(.64);
 add(g,coat,(y,x,z,i)=>bind(i),null,false,(x,y,z,i)=>{
  const hand=data.tones[i]===2,forearm=a.shortSleeves&&Math.abs(x)>.16*wide&&y<1.10&&y>.865;
  const skinPart=(hand||forearm)&&!suit,base=skinPart?skin:hand?dark:data.tones[i]===1?pants:coat;
  const wear=skinPart?1:.98+.012*Math.sin(y*79+x*38)+.008*Math.sin(z*107+y*63);
  const color=base.clone().multiplyScalar(wear);
  if(!skinPart&&!suit){
   // Dyed seams and subtle abrasion are part of the fabric surface and cannot
   // detach when knees, sleeves or the waist bend.
   const trouser=data.tones[i]===1,legX=Math.abs(x)-.095*wide;
   const seam=trouser&&y>.18&&y<.86?Math.exp(-(((Math.abs(legX)-.050*wide)/.0018)**2)):0;
   const crease=trouser?Math.exp(-(((y-.52)/.035)**2))*.024:Math.exp(-(((y-1.12)/.026)**2))*.018;
   color.multiplyScalar(1-seam*.07+crease);
  }
  if(a.tattoo&&skinPart&&forearm&&z>.021){const ink=Math.max(0,1-Math.abs(Math.sin(y*106+Math.sin(x*47)*1.5))/.28);color.lerp(dark,ink*.66);}
  return {color,surface:[skinPart?.52:hand?.62:.87,0,skinPart?1:0,skinPart?0:1]};
 });
 return surface;
}
