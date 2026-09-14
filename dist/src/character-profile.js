import {FACE_CONTROLS,FACE_PRESETS,faceDefaults} from './face-shape.js';
export const PROFILE_KEY='silo18-custom-resident-v1';
export const DEPARTMENTS=Object.freeze({mechanical:{name:'Mechanical',level:144,wing:1},judicial:{name:'Judicial',level:14,wing:0},it:{name:'IT',level:19,wing:2},medical:{name:'Medical',level:62,wing:0},supply:{name:'Supply',level:126,wing:2},farming:{name:'Farming',level:85,wing:0}});
export const SKIN_TONES=[0xe1ba9c,0xc49b7d,0xaf8160,0x95694e,0x795039,0x593a29];
export const HAIR_TONES=[0x26201b,0x493526,0x795134,0xa68b57,0x8b4330,0xa7a396,0xd2cec0];
export const CLOTH_TONES=[0x66756a,0x7c715c,0x536972,0x353e39,0x968776,0xa7aa97,0x78635e];
export const EYE_TONES=[0x504133,0x637d81,0x6c7853,0x84877c];
export const HAIR_STYLES=['short','waves','curls','fringe','bun','ponytail','long','longCurls','braids','bald'];
export const OUTFITS=['work','uniform','coat','shirt','knit','cardigan','robe','medical','vest'];
export const TROUSER_FITS=['straight','tapered','cargo'];
export const FOOTWEAR=['work','boots','slipon'];
export const FRAME_STYLES=['round','rectangular'];
export const SHOE_TONES=[0x292b27,0x574432,0x766451,0xaaa99a];
export const FRAME_TONES=[0x242923,0x82704b,0x776c62];
export const DEFAULT_PROFILE=Object.freeze({version:1,name:'New resident',department:'mechanical',frame:'balanced',height:175,build:1,...faceDefaults(),age:.25,skin:1,hair:1,eyes:0,cloth:0,trousers:3,underlayer:5,shoes:0,frames:0,trouserFit:'straight',footwear:'work',frameStyle:'round',fabric:'plain',hairStyle:'short',outfit:'work',beard:0,glasses:false,shortSleeves:false});
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
 for(const [key,values] of [['trouserFit',TROUSER_FITS],['footwear',FOOTWEAR],['frameStyle',FRAME_STYLES],['fabric',['plain','ribbed','striped']]])out[key]=option(p[key],values,out[key]);
 out.glasses=p.glasses===true;out.shortSleeves=p.shortSleeves===true;
 return out;
}
export function definitionFromProfile(raw){
 const p=normalizeProfile(raw),job=DEPARTMENTS[p.department];
 return {id:'custom-resident',name:p.name,short:p.name,role:job.name+' · your resident',place:job.name,level:job.level,wing:job.wing,height:p.height/100,generated:true,custom:true,origin:'Your resident',season:0,profile:p,
 appearance:{skin:SKIN_TONES[p.skin],hair:HAIR_TONES[p.hair],eyes:EYE_TONES[p.eyes],coat:CLOTH_TONES[p.cloth],pants:CLOTH_TONES[p.trousers],shirt:CLOTH_TONES[p.underlayer],shoeColor:SHOE_TONES[p.shoes],frameColor:FRAME_TONES[p.frames],trouserFit:p.trouserFit,footwear:p.footwear,frameStyle:p.frameStyle,fabric:p.fabric,outfit:p.outfit,hairStyle:p.hairStyle,bald:p.hairStyle==='bald',female:p.frame==='slender',build:p.build,...Object.fromEntries(Object.keys(FACE_CONTROLS).map(k=>[k,p[k]])),age:p.age,beard:p.beard,glasses:p.glasses,shortSleeves:p.shortSleeves}};
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
