import * as T from '../vendor/three.module.js';
import {GarmentSurface} from './garment-surface.js';
import {GARMENT_BODY as data,SHIRT_HEM} from './resident-garment-data.js';
import {clotheBody} from './resident-cloth.js';
import {JACKET_OPEN,JACKET_NECK} from './resident-clothes.js';

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

// How much of a vertex follows the forearm or the hand. Used to tell bare
// forearm from cloth by anatomy rather than by a guessed width.
const forearmWeight=new Float32Array(data.positions.length/3);
for(let i=0;i<forearmWeight.length;i++){
 const w=data.skinWeights[i],a=data.joints[data.skinIndices[i*2]],b=data.joints[data.skinIndices[i*2+1]];
 forearmWeight[i]=(/^(Forearm|Hand)/.test(a)?w:0)+(/^(Forearm|Hand)/.test(b)?1-w:0);
}
const forearmSkin=i=>forearmWeight[i]>.5;
// How much of a vertex follows the trunk — hips, spine, chest — as opposed to a
// limb or the neck. The figure is reshaped by this amount, so the arms and legs
// keep their own shape and the joins blend.
const trunkWeight=new Float32Array(data.positions.length/3);
for(let i=0;i<trunkWeight.length;i++){
 const w=data.skinWeights[i],a=data.joints[data.skinIndices[i*2]],b=data.joints[data.skinIndices[i*2+1]];
 trunkWeight[i]=(/^(Hips|Spine|Chest)$/.test(a)?w:0)+(/^(Hips|Spine|Chest)$/.test(b)?1-w:0);
}
const legWeight=new Float32Array(data.positions.length/3);
for(let i=0;i<legWeight.length;i++){
 const w=data.skinWeights[i],a=data.joints[data.skinIndices[i*2]],b=data.joints[data.skinIndices[i*2+1]];
 legWeight[i]=(/^(Thigh|Shin)/.test(a)?w:0)+(/^(Thigh|Shin)/.test(b)?1-w:0);
}
const armWeight=new Float32Array(data.positions.length/3);
for(let i=0;i<armWeight.length;i++){
 const w=data.skinWeights[i],a=data.joints[data.skinIndices[i*2]],b=data.joints[data.skinIndices[i*2+1]];
 armWeight[i]=(/^(UpperArm|Forearm)/.test(a)?w:0)+(/^(UpperArm|Forearm)/.test(b)?1-w:0);
}
// The line a limb runs along, at the height of a vertex, in the unscaled bind
// pose: legs hang straight from the hip, arms run shoulder, elbow, wrist.
const ARM_LINE=[[1.405,.178,0],[1.118,.196,.011],[.868,.208,.017]];
function limbAxis(i,x,y){
 const side=Math.sign(x)||1;
 if(legWeight[i]>=armWeight[i])return [side*.095,.012];
 const [a,b]=y>=ARM_LINE[1][0]?[ARM_LINE[0],ARM_LINE[1]]:[ARM_LINE[1],ARM_LINE[2]];
 const f=Math.min(1,Math.max(0,(a[0]-y)/(a[0]-b[0])));
 return [side*(a[1]+(b[1]-a[1])*f),a[2]+(b[2]-a[2])*f];
}
const ramp=(list,t)=>{
 if(t<=list[0][0])return list[0][1];
 for(let k=0;k<list.length-1;k++){const [t0,v0]=list[k],[t1,v1]=list[k+1];
  if(t<=t1){const f=(t-t0)/(t1-t0),e=f*f*(3-2*f);return v0+(v1-v0)*e;}}
 return list[list.length-1][1];
};

// The trunk, as it came out of the baked mesh, was a slab: twenty-eight
// centimetres deep at the chest, at the waist and at the hips alike, and barely
// narrower at the waist than across the chest. From the front that is a
// rectangle with arms pressed flat against it, from the side a plank, and it is
// most of why every resident in the silo read as blocky. A man is about 24 cm
// through the chest and 21 through the waist; the waist comes in, and the arms
// hang clear of it.
//
// The shoulders were a flat shelf as well — the top of the figure sat at one
// height from the base of the neck all the way out to the shoulder tip. A real
// shoulder falls about four centimetres over that distance, along the trapezius,
// and that slope is the single biggest difference between a figure and a box.
function shapeFigure(p,{a,wide}){
 const female=!!a.female,count=p.count;
 // Front-to-back centre of the trunk at each height, so depth is taken in about
 // the body's own middle rather than about the origin.
 const bins=new Map();
 for(let i=0;i<count;i++){
  if(trunkWeight[i]<.5)continue;const k=Math.round(p.getY(i)*50),z=p.getZ(i),b=bins.get(k)||{lo:9,hi:-9};
  b.lo=Math.min(b.lo,z);b.hi=Math.max(b.hi,z);bins.set(k,b);
 }
 const centre=y=>{const b=bins.get(Math.round(y*50));return b?(b.lo+b.hi)/2:.005;};
 const depth=[[.84,1],[.90,.93],[.97,.91],[1.06,.88],[1.13,.86],[1.22,.89],[1.30,.91],[1.38,.96],[1.43,1]];
 const waist=female?
  [[.88,1],[.96,1.02],[1.04,.95],[1.12,.86],[1.20,.93],[1.28,1]]:
  [[.88,1],[.96,1],[1.04,.96],[1.12,.915],[1.20,.95],[1.28,1]];
 // A leg is not a column. It is widest at the top of the thigh, comes in at the
 // knee, swells a little for the calf and is narrowest at the ankle, and that
 // taper is what the eye reads as a leg. The baked legs were nearly straight
 // from the hip to the boot, so every resident stood on two posts.
 const legBins=new Map();
 for(let i=0;i<count;i++){
  if(legWeight[i]<.5)continue;const side=Math.sign(p.getX(i))||1,k=side*1000+Math.round(p.getY(i)*40),z=p.getZ(i),b=legBins.get(k)||{lo:9,hi:-9};
  b.lo=Math.min(b.lo,z);b.hi=Math.max(b.hi,z);legBins.set(k,b);
 }
 const taper=[[.18,.86],[.28,.93],[.38,.98],[.47,.93],[.53,.90],[.62,.95],[.74,1],[.90,1]];
 for(let i=0;i<count;i++){
  const leg=legWeight[i];if(leg<.02)continue;
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),side=Math.sign(x)||1,b=legBins.get(side*1000+Math.round(y*40));
  const cx=side*.095*wide,cz=b?(b.lo+b.hi)/2:.012,k=1+(ramp(taper,y)-1)*leg;
  p.setXYZ(i,cx+(x-cx)*k,y,cz+(z-cz)*(1+(k-1)*.75));
 }
 for(let i=0;i<count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),trunk=trunkWeight[i];
  // The slope of the shoulder, carried out across the trunk and into the top of
  // the arm. Nothing moves at the neck, so the sewn neckline and the collar on
  // it stay where they are.
  const out=T.MathUtils.smoothstep(Math.abs(x),.062*wide,.205*wide),high=T.MathUtils.smoothstep(y,1.29,1.45);
  const fall=.036*out*high;
  if(trunk<.02){if(fall)p.setY(i,y-fall*(1-T.MathUtils.smoothstep(1.40-y,0,.10)));continue;}
  const c=centre(y),d=1+(ramp(depth,y)-1)*trunk,w=1+(ramp(waist,y)-1)*trunk;
  p.setXYZ(i,x*w,y-fall,c+(z-c)*d);
 }
}

export function addResidentBody({a,wide,suit,coat,skin,dark,add,binding}){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setIndex(data.indices);const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  // Build used to be a sideways stretch of every vertex, so a heavy resident's
  // arms and legs became flat ovals: half as wide again from the front, no
  // thicker from the side, which is exactly the slab-limbed look. A bigger
  // person's limbs sit further apart and are thicker all the way round, so the
  // limbs move out by the full build and grow round by part of it; the trunk
  // keeps the plain stretch and gains a little depth with it.
  const limb=Math.max(legWeight[i],armWeight[i]);
  if(limb>.02){
   const [cx,cz]=limbAxis(i,x,y),girth=1+(wide-1)*.55;
   const lx=cx*wide+(x-cx)*girth,lz=cz+(z-cz)*girth;
   p.setXYZ(i,x*wide+(lx-x*wide)*limb,y,z+(lz-z)*limb);
  }else p.setXYZ(i,x*wide,y,z*(1+(wide-1)*.35));
  if(!suit&&data.tones[i]===1&&y<.87){
   const centre=Math.sign(x)*.095*wide,fit=a.trouserFit==='cargo'?1.10:a.trouserFit==='tapered'?1-.18*(1-T.MathUtils.smoothstep(y,.17,.76)):1;
   p.setX(i,centre+(p.getX(i)-centre)*fit);p.setZ(i,.012+(p.getZ(i)-.012)*fit);
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
 shapeFigure(p,{a,wide});
 g.computeVertexNormals();
 // Everything above shapes bare anatomy. This is where it gets dressed: the
 // covered part of the body is inflated into the garment hanging on it, so the
 // cloth has thickness and the silhouette is the clothes rather than the person
 // inside them. It runs before the garment surface is built, so every panel,
 // collar, waistband and coat skirt fitted to that surface lands on the cloth.
 clotheBody({geometry:g,data,neighbours,a,wide,suit,hem:SHIRT_HEM,pinned:neckline,forearmWeight});
 const bind=i=>neckline.has(i)?binding('Neck','Chest',T.MathUtils.clamp((p.getY(i)-1.45)/.085,0,1)):binding(data.joints[data.skinIndices[i*2]],data.joints[data.skinIndices[i*2+1]],data.skinWeights[i]);
 const excludedBones=data.joints.filter(n=>/Arm|Forearm|Hand|Fingers|FingerTips/.test(n)).map(n=>binding(n)[0]);
 const surface=new GarmentSurface(g,bind,{excludedBones});
 // Arms are kept out of the garment surface so a belt cannot latch on to a
 // forearm hanging beside the waist. High on the front of the chest that rule
 // leaves nothing to stand on, because the skin there follows the arm a little;
 // a second surface that keeps the arms is offered for the front of the chest,
 // where no arm can be in the way.
 surface.full=new GarmentSurface(g,bind);
 // Trousers default to a darker shade of the top, which works for everything
 // except a white coat: two-thirds of white is pale grey, and pale grey
 // trousers under a lab coat read as tights. A physician wears slate.
 const pants=suit?coat:a.pants!==undefined?new T.Color(a.pants):a.outfit==='medical'?new T.Color(0x3d4446):coat.clone().multiplyScalar(.64);
 const underlayer=new T.Color(a.shirt??0xa29981);
 add(g,coat,(y,x,z,i)=>bind(i),null,false,(x,y,z,i)=>{
  // A rolled sleeve bares the forearm, and a forearm is whatever is skinned to
  // the forearm. Testing position instead (wider than 16 cm, below the elbow)
  // also caught the hips, which are wider than that, and painted a patch of
  // bare skin on the side of every short-sleeved resident's trousers.
  const hand=data.tones[i]===2,forearm=a.shortSleeves&&forearmSkin(i)&&y<1.10;
  // Under an open jacket the front of the chest is the shirt. The jacket shell's
  // front edge lies over this boundary, so its vertex-by-vertex raggedness is
  // never seen; what is seen is the clean edge of the garment over a shirt.
  let shirtFront=false;
  if(['coat','cardigan','medical'].includes(a.outfit)&&data.tones[i]===0&&y>SHIRT_HEM-.001&&y<1.445){
   const base=JACKET_OPEN[a.outfit],neck=JACKET_NECK[a.outfit];
   const open=base+(neck-base)*T.MathUtils.smoothstep(y,1.10,1.40);
   // Wide enough below the chest to sit well under the jacket's edge, and
   // drawn in towards the neck so no shirt shows on the shoulders above it.
   shirtFront=z>0&&Math.abs(Math.atan2(x,z-.010))<open+.07-.05*T.MathUtils.smoothstep(y,1.34,1.43);
  }
  const skinPart=(hand||forearm)&&!suit,base=skinPart?skin:hand?dark:data.tones[i]===1?pants:a.outfit==='vest'||shirtFront?underlayer:coat;
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
