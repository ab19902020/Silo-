import {FACE_CONTROLS,FACE_PRESETS,faceDefaults} from './face-shape.js';
export const PROFILE_KEY='silo18-custom-resident-v1';
export const DEPARTMENTS=Object.freeze({mechanical:{name:'Mechanical',level:144,wing:1},judicial:{name:'Judicial',level:14,wing:0},it:{name:'IT',level:19,wing:2},medical:{name:'Medical',level:62,wing:0},supply:{name:'Supply',level:126,wing:2},farming:{name:'Farming',level:85,wing:0}});
// Palettes are written as colour-and-name pairs and split below. They used to
// be bare colour arrays with the names typed out again in the studio's UI
// code, which is two lists that have to stay the same length forever: add a
// swatch and the labels shift by one, silently, and every screen reader after
// that reads the wrong colour out.
const palette=pairs=>({tones:Object.freeze(pairs.map(p=>p[0])),names:Object.freeze(pairs.map(p=>p[1]))});

// Six skin tones for a silo of ten thousand people was not a range, it was a
// gesture at one. Fourteen, walked evenly from light to deep, with the warm
// and the cool side of each so nobody has to settle for the nearest.
const SKIN=palette([
 [0xf0d9c2,'Porcelain'],[0xe1ba9c,'Fair'],[0xd9b494,'Fair olive'],[0xc49b7d,'Warm'],
 [0xbf9a86,'Rose beige'],[0xaf8160,'Tan'],[0xa77f6b,'Amber'],[0x95694e,'Bronze'],
 [0x8c6a57,'Chestnut'],[0x795039,'Deep'],[0x6f4f42,'Umber'],[0x593a29,'Dark'],
 [0x4a3227,'Espresso'],[0x3a2620,'Ebony'],
]);
const HAIR=palette([
 [0x17130f,'Jet'],[0x26201b,'Black'],[0x3a2c22,'Dark brown'],[0x493526,'Brown'],
 [0x6a4a30,'Mid brown'],[0x795134,'Chestnut'],[0x8b4330,'Auburn'],[0xa06a3a,'Copper'],
 [0xa68b57,'Dark blonde'],[0xc3a878,'Blonde'],[0xa7a396,'Grey'],[0x8d8a82,'Iron grey'],
 [0xd2cec0,'Silver'],[0xe8e4d8,'White'],
]);
// Silo cloth is dyed in the silo, so the range is what the dye vats make:
// greens, greys, browns and the one blue. Nothing bright.
const CLOTH=palette([
 [0x66756a,'Silo green'],[0x55645a,'Deep green'],[0x7c715c,'Khaki'],[0x8d8163,'Wheat'],
 [0x536972,'Slate blue'],[0x44545e,'Deep slate'],[0x353e39,'Charcoal'],[0x4c524c,'Graphite'],
 [0x968776,'Sand'],[0xa7aa97,'Stone'],[0x78635e,'Rust'],[0x8a5f4c,'Brick'],
 [0x6b6455,'Olive'],[0x9a9384,'Undyed'],
]);
const EYE=palette([
 [0x3a2d22,'Dark brown'],[0x504133,'Brown'],[0x6f5b3e,'Hazel'],[0x8a7a4a,'Amber'],
 [0x637d81,'Blue'],[0x4d6b78,'Deep blue'],[0x6c7853,'Green'],[0x84877c,'Grey'],
]);
const SHOE=palette([
 [0x292b27,'Black'],[0x3d3a33,'Pitch'],[0x574432,'Brown leather'],[0x6b5236,'Tan leather'],
 [0x766451,'Worn tan'],[0xaaa99a,'Stone'],
]);
const FRAME=palette([
 [0x242923,'Dark metal'],[0x82704b,'Brass'],[0x776c62,'Pewter'],[0x3f3a33,'Gunmetal'],
 [0x8d7b63,'Bone'],
]);
export const SKIN_TONES=SKIN.tones,SKIN_NAMES=SKIN.names;
export const HAIR_TONES=HAIR.tones,HAIR_NAMES=HAIR.names;
export const CLOTH_TONES=CLOTH.tones,CLOTH_NAMES=CLOTH.names;
export const EYE_TONES=EYE.tones,EYE_NAMES=EYE.names;
export const SHOE_TONES=SHOE.tones,SHOE_NAMES=SHOE.names;
export const FRAME_TONES=FRAME.tones,FRAME_NAMES=FRAME.names;

export const HAIR_STYLES=['short','waves','curls','fringe','bun','ponytail','long','longCurls','braids','bald'];
export const OUTFITS=['work','uniform','coat','shirt','knit','cardigan','robe','medical','vest'];
export const TROUSER_FITS=['straight','tapered','cargo'];
export const FOOTWEAR=['work','boots','slipon'];
export const FRAME_STYLES=['round','rectangular'];
export const FABRICS=['plain','ribbed','striped'];
// Things the model has always been able to wear, which the creator never
// offered: Knox's forearm tattoo, Lukas's quilted jacket, the Mayor's chain of
// office, and the hem length that robes and cardigans already read. The
// renderer supported every one of these the whole time.
export const COAT_LENGTHS=Object.freeze([
 {id:'short',label:'Cropped',value:.86},
 {id:'hip',label:'Hip length',value:.68},
 {id:'thigh',label:'Mid-thigh',value:.59},
 {id:'knee',label:'Knee length',value:.44},
 {id:'full',label:'Full length',value:.34},
]);
export const DEFAULT_PROFILE=Object.freeze({version:1,name:'New resident',department:'mechanical',frame:'balanced',height:175,build:1,...faceDefaults(),age:.25,skin:3,hair:3,eyes:1,cloth:0,trousers:6,underlayer:9,shoes:0,frames:0,trouserFit:'straight',footwear:'work',frameStyle:'round',fabric:'plain',hairStyle:'short',outfit:'work',coatLength:'thigh',beard:0,glasses:false,shortSleeves:false,quilted:false,tattoo:false,chain:false});
const number=(n,f,min,max)=>n!==null&&n!==''&&typeof n!=='boolean'&&Number.isFinite(Number(n))?Math.min(max,Math.max(min,Number(n))):f;
const option=(v,values,f)=>values.includes(v)?v:f;
export function normalizeProfile(raw={}){
 const p=raw&&typeof raw==='object'?raw:{};
 const out={...DEFAULT_PROFILE};
 out.name=String(p.name||out.name).replace(/[<>\x00-\x1f]/g,'').trim().slice(0,32)||'New resident';
 out.department=option(p.department,Object.keys(DEPARTMENTS),out.department);
 out.frame=option(p.frame,['balanced','slender'],out.frame);out.height=Math.round(number(p.height,175,155,195));
 for(const [key,min,max] of [['build',.88,1.15],['age',0,1],['beard',0,1]])out[key]=number(p[key],out[key],min,max);
 for(const [key,c] of Object.entries(FACE_CONTROLS))out[key]=number(p[key],c.default,c.min,c.max);
 for(const [key,palette] of [['skin',SKIN_TONES],['hair',HAIR_TONES],['eyes',EYE_TONES],['cloth',CLOTH_TONES],['trousers',CLOTH_TONES],['underlayer',CLOTH_TONES],['shoes',SHOE_TONES],['frames',FRAME_TONES]])out[key]=Math.round(number(p[key],out[key],0,palette.length-1));
 out.hairStyle=option(p.hairStyle,HAIR_STYLES,out.hairStyle);out.outfit=option(p.outfit,OUTFITS,out.outfit);
 for(const [key,values] of [['trouserFit',TROUSER_FITS],['footwear',FOOTWEAR],['frameStyle',FRAME_STYLES],['fabric',FABRICS],['coatLength',COAT_LENGTHS.map(c=>c.id)]])out[key]=option(p[key],values,out[key]);
 for(const key of ['glasses','shortSleeves','quilted','tattoo','chain'])out[key]=p[key]===true;
 return out;
}
export function definitionFromProfile(raw){
 const p=normalizeProfile(raw),job=DEPARTMENTS[p.department];
 return {id:'custom-resident',name:p.name,short:p.name,role:job.name+' · your resident',place:job.name,level:job.level,wing:job.wing,height:p.height/100,generated:true,custom:true,origin:'Your resident',season:0,profile:p,
 appearance:{skin:SKIN_TONES[p.skin],hair:HAIR_TONES[p.hair],eyes:EYE_TONES[p.eyes],coat:CLOTH_TONES[p.cloth],pants:CLOTH_TONES[p.trousers],shirt:CLOTH_TONES[p.underlayer],shoeColor:SHOE_TONES[p.shoes],frameColor:FRAME_TONES[p.frames],trouserFit:p.trouserFit,footwear:p.footwear,frameStyle:p.frameStyle,fabric:p.fabric,outfit:p.outfit,hairStyle:p.hairStyle,bald:p.hairStyle==='bald',female:p.frame==='slender',build:p.build,...Object.fromEntries(Object.keys(FACE_CONTROLS).map(k=>[k,p[k]])),age:p.age,beard:p.beard,glasses:p.glasses,shortSleeves:p.shortSleeves,
  // Straight through to the renderer, which has read all four of these since
  // long before the creator offered them.
  coatLength:(COAT_LENGTHS.find(c=>c.id===p.coatLength)||COAT_LENGTHS[2]).value,quilted:p.quilted,tattoo:p.tattoo,chain:p.chain}};
}
export function loadProfile(storage){try{const raw=storage?.getItem(PROFILE_KEY);return raw?normalizeProfile(JSON.parse(raw)):null;}catch{return null;}}
export function saveProfile(storage,profile){try{storage.setItem(PROFILE_KEY,JSON.stringify(normalizeProfile(profile)));return true;}catch{return false;}}

export function applyFacePreset(profile,id){
 return normalizeProfile({...profile,...faceDefaults(),...(FACE_PRESETS[id]?.values||{})});
}
export function randomizeFace(profile,random=Math.random){
 const keys=Object.keys(FACE_PRESETS),base=applyFacePreset(profile,keys[Math.min(keys.length-1,Math.floor(random()*keys.length))]);
 for(const [key,c] of Object.entries(FACE_CONTROLS))base[key]=Math.round((base[key]+(random()-.5)*(c.max-c.min)*.28)*100)/100;
 return normalizeProfile(base);
}
