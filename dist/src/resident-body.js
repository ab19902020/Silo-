import * as T from '../vendor/three.module.js';
import {GarmentSurface} from './garment-surface.js';
import {GARMENT_BODY as data,SHIRT_HEM} from './resident-garment-data.js';

const neighbours=Array.from({length:data.positions.length/3},()=>new Set());
for(let i=0;i<data.indices.length;i+=3){const tri=data.indices.slice(i,i+3);for(const a of tri)for(const b of tri)if(a!==b)neighbours[a].add(b);}

// Locate the cut edge itself. Clamping every high torso vertex would flatten
// the shoulders; only the open neckline needs a continuous sewn boundary.
const edges=new Map();
for(let i=0;i<data.indices.length;i+=3)for(let j=0;j<3;j++){
 const a=data.indices[i+j],b=data.indices[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');
 const edge=edges.get(key);if(edge)edge.count++;else edges.set(key,{a,b,count:1});
}
const neckline=new Set();
for(const {a,b,count} of edges.values())if(count===1&&data.positions[a*3+1]>1.4&&data.positions[b*3+1]>1.4){neckline.add(a);neckline.add(b);}

export function addResidentBody({a,wide,suit,coat,skin,dark,add,binding}){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setIndex(data.indices);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);p.setX(i,x*wide);
  if(!suit&&data.tones[i]===1&&y<.87){
   const centre=Math.sign(x)*.095,fit=a.trouserFit==='cargo'?1.10:a.trouserFit==='tapered'?1-.18*(1-T.MathUtils.smoothstep(y,.17,.76)):1;
   p.setX(i,(centre+(x-centre)*fit)*wide);p.setZ(i,.012+(z-.012)*fit);
  }
  if(!suit&&Math.abs(x)>.145&&y>1.27){const relief=.006*Math.exp(-(((y-1.39)/.065)**2));p.setX(i,p.getX(i)-Math.sign(x)*relief);}
  // Fabric hangs from the anatomical form, with low folds at cuffs, knees and
  // waist. Millimetres of relief avoid the previous spherical joint shapes.
  if(neckline.has(i)){
   const angle=Math.atan2(x,z-.01);
   p.setXYZ(i,Math.sin(angle)*.066*wide,1.459-.007*Math.cos(angle),Math.cos(angle)*.060+.010);
  }
  else if(data.tones[i]!==2){const fold=(Math.exp(-(((y-.52)/.085)**2))+.5*Math.exp(-(((y-1.12)/.055)**2)))*.0017*Math.sin(y*145+x*42);p.setZ(i,p.getZ(i)+fold*Math.sign(z||1));}
 }
 // Soften the cloth envelope across shoulder and waist transitions without
 // changing facial topology, fingers or the underlying rig.
 for(let pass=0;pass<2;pass++){const next=p.array.slice();for(let i=0;i<p.count;i++){
  if(data.tones[i]===2||p.getY(i)>1.435||Math.abs(p.getY(i)-SHIRT_HEM)<1e-6)continue;const near=neighbours[i];if(!near.size)continue;
  for(let k=0;k<3;k++){let mean=0;for(const j of near)mean+=p.array[j*3+k];next[i*3+k]=p.array[i*3+k]*.82+mean/near.size*.18;}
 }p.array.set(next);}
 g.computeVertexNormals();
 const bind=i=>neckline.has(i)?binding('Neck','Chest',T.MathUtils.clamp((p.getY(i)-1.45)/.085,0,1)):binding(data.joints[data.skinIndices[i*2]],data.joints[data.skinIndices[i*2+1]],data.skinWeights[i]);
 const excludedBones=data.joints.filter(n=>/Arm|Forearm|Hand|Fingers|FingerTips/.test(n)).map(n=>binding(n)[0]);
 const surface=new GarmentSurface(g,bind,{excludedBones});
 const pants=suit?coat:a.pants!==undefined?new T.Color(a.pants):coat.clone().multiplyScalar(.64);
 const underlayer=new T.Color(a.shirt??0xa29981);
 add(g,coat,(y,x,z,i)=>bind(i),null,false,(x,y,z,i)=>{
  const hand=data.tones[i]===2,forearm=a.shortSleeves&&Math.abs(x)>.16*wide&&y<1.10&&y>.865;
  const skinPart=(hand||forearm)&&!suit,base=skinPart?skin:hand?dark:data.tones[i]===1?pants:a.outfit==='vest'?underlayer:coat;
  const wear=skinPart?1:.98+.012*Math.sin(y*79+x*38)+.008*Math.sin(z*107+y*63);
  const color=base.clone().multiplyScalar(wear);
  if(!skinPart&&!suit&&data.tones[i]===0){
   if(a.fabric==='striped')color.multiplyScalar(Math.sin(y*130)>.4?.84:1);
   if(a.fabric==='ribbed'||a.outfit==='knit')color.multiplyScalar(.97+.03*Math.cos(x*520));
  }
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
