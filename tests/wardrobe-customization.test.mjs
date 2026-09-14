import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {DEFAULT_PROFILE,OUTFITS,normalizeProfile,definitionFromProfile,saveProfile,loadProfile} from '../dist/src/character-profile.js';
import {createResident,disposeResident} from '../dist/src/resident-model.js';
import {shoeGeometry} from '../dist/src/resident-footwear.js';
import {fitSpectacles} from '../dist/src/resident-eyewear.js';
import {GarmentSurface} from '../dist/src/garment-surface.js';
import {shapeFace} from '../dist/src/face-shape.js';
import {RESIDENT_HEAD} from '../dist/src/resident-head-data.js';
import {CROWD_APPEARANCES,crowdAppearanceIndex,RESIDENT_CAST} from '../dist/src/resident-data.js';
import {populationRecords} from '../dist/src/population.js';
import {porterRecords} from '../dist/src/porter-traffic.js';

test('older resident saves gain separate wardrobe choices without losing identity or face',()=>{
 const old={name:'Ada Briggs',skin:4,outfit:'medical',cloth:2,faceWidth:1.08,glasses:true};
 const profile=normalizeProfile(old);for(const [k,v] of Object.entries(old))assert.equal(profile[k],v);
 const custom={...profile,trousers:1,underlayer:5,shoes:2,frames:1,trouserFit:'cargo',footwear:'boots',frameStyle:'rectangular',fabric:'ribbed'};
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)};
 assert.ok(saveProfile(storage,custom));assert.deepEqual(loadProfile(storage),custom);
 const a=definitionFromProfile(custom).appearance,b=definitionFromProfile({...custom,trousers:3}).appearance;
 assert.notEqual(a.pants,b.pants);for(const key of ['skin','coat','shirt','shoeColor','frameColor'])assert.equal(a[key],b[key]);
 assert.equal(a.frameStyle,'rectangular');assert.equal(a.footwear,'boots');
 const invalid=normalizeProfile({footwear:'bad',frameStyle:'bad',trouserFit:null,shoes:Infinity,frames:-99});
 assert.equal(invalid.footwear,'work');assert.equal(invalid.frameStyle,'round');assert.equal(invalid.trouserFit,'straight');assert.equal(invalid.shoes,0);assert.equal(invalid.frames,0);
});

test('all wardrobe cuts fit both body extremes through walking and running',()=>{
 const shapes=new Map(),v=new T.Vector3();
 for(const outfit of OUTFITS)for(const large of [false,true]){
  const definition=definitionFromProfile({...DEFAULT_PROFILE,outfit,height:large?195:155,build:large?1.15:.88,frame:large?'balanced':'slender',trouserFit:'cargo',footwear:'boots',glasses:true});
  const a=createResident(definition,{cache:false});let mesh;a.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});const g=mesh.geometry;
  assert.ok(g.attributes.position.count<60000,outfit+' exceeds mesh budget');
  for(let i=0;i<g.attributes.skinWeight.count;i++){
   const sum=Array.from({length:4},(_,k)=>g.attributes.skinWeight.array[i*4+k]).reduce((a,b)=>a+b,0);assert.ok(Math.abs(sum-1)<1e-5);
  }
  for(const pose of ['Idle','Walk','Run']){
   a.motion.sample(pose,.27);a.root.updateMatrixWorld(true);mesh.skeleton.update();
   for(let i=0;i<g.attributes.position.count;i+=23){mesh.getVertexPosition(i,v);assert.ok(v.toArray().every(Number.isFinite),outfit);assert.ok(Math.abs(v.x)<.85&&v.y>-.15&&v.y<2.15,outfit+' distorted in '+pose);}
  }
  if(!large)shapes.set(outfit,Array.from(g.attributes.position.array).join(','));
  disposeResident(a);
 }
 for(const [a,b] of [['coat','cardigan'],['coat','medical'],['shirt','vest'],['shirt','knit']])assert.notEqual(shapes.get(a),shapes.get(b),a+' shares the same geometry as '+b);
});

test('shoe cuts remain attached to the same rounded floor-contact sole',()=>{
 const tops=[];
 for(const style of ['work','boots','slipon']){
  const upper=shoeGeometry(0,{style}),sole=shoeGeometry(0,{style,sole:true});upper.computeBoundingBox();sole.computeBoundingBox();
  assert.ok(upper.boundingBox.min.y<sole.boundingBox.max.y);assert.ok(sole.boundingBox.min.y>=0&&sole.boundingBox.min.y<.015);tops.push(upper.boundingBox.max.y);upper.dispose();sole.dispose();
 }
 assert.ok(tops[1]>tops[0]+.08);assert.ok(tops[2]<tops[0]-.02);
});

test('glasses temples clear the deformed brow, cheek and ear across face extremes',()=>{
 for(const faceWidth of [.88,1.12])for(const eyeSpacing of [.85,1.15])for(const eyeSize of [.88,1.12])for(const frameStyle of ['round','rectangular']){
  const a={faceWidth,eyeSpacing,eyeSize,frameStyle},g=new T.BufferGeometry(),positions=[];
  for(let i=0;i<RESIDENT_HEAD.positions.length;i+=3)positions.push(...shapeFace(...RESIDENT_HEAD.positions.slice(i,i+3),a).toArray());
  g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(RESIDENT_HEAD.indices);g.computeVertexNormals();
  const surface=new GarmentSurface(g,()=>[0,0,1]),eyes=[-1,1].map(s=>shapeFace(s*.03385,1.6183,.08499,a)),fit=fitSpectacles(surface,eyes,a);
  for(let side=0;side<2;side++)for(let i=1;i<fit.arms[side].length;i++)for(let j=0;j<=4;j++){
   const p=fit.arms[side][i-1].clone().lerp(fit.arms[side][i],j/4),hit=surface.sample(side===0?-1:1,p.y,p.z,'x');
   if(hit)assert.ok(Math.abs(p.x)-Math.abs(hit.point.x)>.0016,'temple penetrates skin: '+JSON.stringify(a));
  }
  for(const frame of fit.frames)for(const p of frame){const hit=surface.sample(p.x,p.y);if(hit)assert.ok(p.z-hit.point.z>.004,'rim penetrates face');}
  g.dispose();
 }
});

test('generic crowd balance is repeatable across actual floors and porter routes',()=>{
 let light=0,total=0;
 for(let level=1;level<=144;level++)for(const r of populationRecords(level))if(!r.definition){
  const i=crowdAppearanceIndex(r.seed);assert.equal(i,crowdAppearanceIndex(r.seed));assert.ok(CROWD_APPEARANCES[i]);light+=i<7?1:0;total++;
 }
 assert.ok(total>500);assert.ok(light/total>.65&&light/total<.75,'floor complexion balance '+light+'/'+total);
 const routes=porterRecords(),ratio=routes.filter(r=>crowdAppearanceIndex(r.seed)<7).length/routes.length;
 assert.ok(ratio>.60&&ratio<.80,'porter complexion balance '+ratio);
 assert.equal(RESIDENT_CAST.find(r=>r.id==='carla').appearance.skin,0x835f49);
 assert.equal(RESIDENT_CAST.find(r=>r.id==='teddy').appearance.skin,0x694932);
});

test('fitted cloth can inherit smooth body shading without changing attachment weights',()=>{
 const g=new T.SphereGeometry(1,32,24);g.translate(0,1.2,0);const surface=new GarmentSurface(g,()=>[0,1,.6]);
 const panel=new T.PlaneGeometry(.3,.3,6,6);panel.translate(0,1.2,0);surface.fit(panel,{offset:.004,smooth:true});
 const p=panel.attributes.position,n=panel.attributes.normal;
 for(let i=0;i<p.count;i++){
  assert.ok(Math.abs(new T.Vector3().fromBufferAttribute(n,i).length()-1)<1e-5);
  const weights=panel.attributes.attachmentSkinWeight.array.slice(i*4,i*4+4);assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-5);
 }
 panel.dispose();g.dispose();
});
