import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {FACE_CONTROLS,FACE_PRESETS,faceDefaults,shapeFace} from '../dist/src/face-shape.js';
import {DEFAULT_PROFILE,normalizeProfile,definitionFromProfile,
 SKIN_TONES,SKIN_NAMES,HAIR_TONES,HAIR_NAMES,CLOTH_TONES,CLOTH_NAMES,
 EYE_TONES,EYE_NAMES,SHOE_TONES,SHOE_NAMES,FRAME_TONES,FRAME_NAMES,
 COAT_LENGTHS,FABRICS,HAIR_STYLES,OUTFITS} from '../dist/src/character-profile.js';

// The front of a head, sampled densely enough that a change to one feature
// shows up and sparsely enough to run in a test.
// It starts below the neck seam on purpose. The first version of this began
// at 1.525 and then skipped everything above 1.523, so the neck test below
// was checking nothing at all and passed happily with the seam blend deleted.
const HEAD=[],NECK=[],FACE=[];
for(let y=1.46;y<=1.70;y+=.004)for(let x=-.07;x<=.07;x+=.007)for(const z of [.02,.045,.07]){
 const i=HEAD.length;HEAD.push([x,y,z]);
 if(y<=1.518)NECK.push(i); else if(y>=1.525)FACE.push(i);
}
const faceOf=values=>{
 const a={...faceDefaults(),...values};
 return HEAD.map(([x,y,z])=>shapeFace(x,y,z,a));
};
// RMS displacement between two faces, in millimetres, measured over the face
// and not the neck. The neck is identical on every preset by design, so
// including it just divides every answer by a constant and makes two genuinely
// different faces look similar.
const apart=(a,b)=>{let s=0;for(const i of FACE)s+=a[i].distanceToSquared(b[i]);return Math.sqrt(s/FACE.length)*1000;};

test('every starting face is a real face and none of them is a duplicate',()=>{
 const ids=Object.keys(FACE_PRESETS);
 assert.ok(ids.length>=20,`only ${ids.length} faces to start from`);
 // Every value has to name a control that exists and sit inside its range, or
 // the slider it lands on will not agree with the face you were shown.
 for(const [id,preset] of Object.entries(FACE_PRESETS))
  for(const [key,value] of Object.entries(preset.values||{})){
   const c=FACE_CONTROLS[key];
   assert.ok(c,`${id} sets ${key}, which is not a face control`);
   assert.ok(value>=c.min&&value<=c.max,`${id}.${key} is ${value}, outside ${c.min}..${c.max}`);
  }
 // And they have to be twenty faces rather than one face and nineteen nudges.
 // 1.2 mm is RMS across the whole head, so a pair at that distance differ by
 // several millimetres at the feature they disagree about — plainly visible.
 const shaped=Object.fromEntries(ids.map(id=>[id,faceOf(FACE_PRESETS[id].values||{})]));
 let closest=Infinity,pair='';
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  const d=apart(shaped[ids[i]],shaped[ids[j]]);
  if(d<closest){closest=d;pair=`${ids[i]} and ${ids[j]}`;}
 }
 assert.ok(closest>=1.2,`${pair} are the same face (${closest.toFixed(2)} mm apart)`);
});

test('each face control moves the face, and none of them tears the neck',()=>{
 const base=faceOf({});
 assert.ok(NECK.length>200&&FACE.length>500,`${NECK.length} neck and ${FACE.length} face sample points — too few to prove anything`);
 for(const [key,c] of Object.entries(FACE_CONTROLS)){
  // A control that does nothing is a slider that lies.
  const low=faceOf({[key]:c.min}),high=faceOf({[key]:c.max});
  assert.ok(apart(base,high)>.05,`${key} is a slider that does nothing at its maximum`);
  assert.ok(apart(base,low)>.05,`${key} is a slider that does nothing at its minimum`);
  // Nothing may move anything below the neck seam. The head is welded to the
  // body there, and a control that reaches under it opens a hole in the throat.
  for(const face of [low,high])
   for(const i of NECK){
    const moved=face[i].distanceTo(new T.Vector3(...HEAD[i]));
    assert.ok(moved<1e-6,`${key} moves the neck ${(moved*1000).toFixed(3)} mm below the seam`);
   }
 }
});

test('every swatch has a name, and every name has a swatch',()=>{
 // These were two lists side by side, the colours in one file and the words
 // in another. Add a swatch to one and every label after it is wrong, and the
 // screen reader reads the wrong colour out with total confidence.
 for(const [label,tones,names] of [['skin',SKIN_TONES,SKIN_NAMES],['hair',HAIR_TONES,HAIR_NAMES],
   ['cloth',CLOTH_TONES,CLOTH_NAMES],['eye',EYE_TONES,EYE_NAMES],
   ['shoe',SHOE_TONES,SHOE_NAMES],['frame',FRAME_TONES,FRAME_NAMES]]){
  assert.equal(tones.length,names.length,`${label}: ${tones.length} colours and ${names.length} names`);
  assert.equal(new Set(names).size,names.length,`${label} has two swatches with the same name`);
  assert.equal(new Set(tones).size,tones.length,`${label} has the same colour twice`);
  for(const t of tones)assert.ok(Number.isInteger(t)&&t>=0&&t<=0xffffff,`${label} has a colour that is not a colour: ${t}`);
 }
 assert.ok(SKIN_TONES.length>=12,`only ${SKIN_TONES.length} skin tones for a silo of ten thousand people`);
});

test('the wardrobe options the model already understood are offered and reach it',()=>{
 // coatLength, quilted, tattoo and chain were rendered for the written cast
 // and unreachable in the creator. This is the wire, end to end.
 const dressed=definitionFromProfile({...DEFAULT_PROFILE,coatLength:'full',quilted:true,tattoo:true,chain:true});
 assert.equal(dressed.appearance.coatLength,COAT_LENGTHS.find(c=>c.id==='full').value);
 for(const key of ['quilted','tattoo','chain'])assert.equal(dressed.appearance[key],true,`${key} does not reach the model`);
 const plain=definitionFromProfile(DEFAULT_PROFILE);
 for(const key of ['quilted','tattoo','chain'])assert.equal(plain.appearance[key],false,`${key} is on by default`);
 // A hem has to be a real length, and shorter ids must give larger values
 // (the geometry measures down from the shoulder, so a bigger number is a
 // higher hem). Getting that backwards would put the robe on upside down.
 const v=id=>COAT_LENGTHS.find(c=>c.id===id).value;
 assert.ok(v('short')>v('hip')&&v('hip')>v('thigh')&&v('thigh')>v('knee')&&v('knee')>v('full'),
   'the coat lengths are not in order');
});

test('junk in a saved profile cannot reach the model',()=>{
 // A profile is read back out of localStorage, which anybody can edit.
 const junk=normalizeProfile({coatLength:'../../etc',quilted:'true',tattoo:1,chain:{},
   fabric:'<script>',hairStyle:'',outfit:null,skin:-40,eyes:9e9});
 assert.ok(COAT_LENGTHS.some(c=>c.id===junk.coatLength));
 assert.ok(FABRICS.includes(junk.fabric));
 assert.ok(HAIR_STYLES.includes(junk.hairStyle));
 assert.ok(OUTFITS.includes(junk.outfit));
 // A string that is not `true` is not true. Anything else and a saved profile
 // could switch on a garment by containing the word "true".
 for(const key of ['quilted','tattoo','chain'])assert.equal(junk[key],false,`${key} was turned on by junk`);
 assert.ok(junk.skin>=0&&junk.skin<SKIN_TONES.length);
 assert.ok(junk.eyes>=0&&junk.eyes<EYE_TONES.length);
});
