import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {shoeGeometry} from '../dist/src/resident-footwear.js';
import {GARMENT_BODY,SHIRT_HEM} from '../dist/src/resident-garment-data.js';
import {RESIDENT_BODY} from '../dist/src/resident-body-data.js';
import {addResidentBody} from '../dist/src/resident-body.js';

test('shoe soles have rounded closed footprints and meet their uppers',()=>{
 const sole=shoeGeometry(0,{sole:true}),upper=shoeGeometry(0);
 sole.computeBoundingBox();upper.computeBoundingBox();
 assert.ok(upper.boundingBox.min.y<sole.boundingBox.max.y,'shoe floats above sole');
 assert.ok(sole.boundingBox.min.y>=0&&sole.boundingBox.min.y<.015);
 const p=sole.attributes.position;let corners=0;
 for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))>.05&&(p.getZ(i)>.18||p.getZ(i)<-.067))corners++;
 assert.equal(corners,0,'rectangular heel or toe corners remain');
 const edges=new Map();for(let i=0;i<sole.index.count;i+=3)for(let k=0;k<3;k++){
  const pair=[sole.index.getX(i+k),sole.index.getX(i+(k+1)%3)].sort((a,b)=>a-b).join(':');edges.set(pair,(edges.get(pair)||0)+1);
 }
 assert.ok([...edges.values()].every(count=>count===2),'sole has an open seam');sole.dispose();upper.dispose();
});

test('shirt hem cannot interpolate trouser colour across the waist or sleeves',()=>{
 const d=GARMENT_BODY;
 for(let i=0;i<d.indices.length;i+=3){
  const tri=d.indices.slice(i,i+3);if(tri.some(v=>/Arm|Forearm|Hand|Finger/.test(d.joints[d.skinIndices[v*2]])))continue;
  const ys=tri.map(v=>d.positions[v*3+1]);assert.ok(Math.max(...ys)<=SHIRT_HEM+1e-6||Math.min(...ys)>=SHIRT_HEM-1e-6,'triangle crosses sewn hem');
 }
 for(let i=0;i<RESIDENT_BODY.tones.length;i++)if(/Arm|Forearm|Hand|Finger/.test(RESIDENT_BODY.joints[RESIDENT_BODY.skinIndices[i*2]]))assert.equal(d.tones[i],RESIDENT_BODY.tones[i],'sleeve recoloured as trousers');
 for(const w of d.skinWeights)assert.ok(Number.isFinite(w)&&w>=0&&w<=1);
});

test('neckline stays continuous at every supported build without moving the shoulders',()=>{
 for(const wide of [.8096,1,1.15]){
  let geometry;addResidentBody({a:{},wide,suit:false,coat:new T.Color(0x777766),skin:new T.Color(0x997755),dark:new T.Color(0x222222),binding:(a,b=a,w=1)=>[GARMENT_BODY.joints.indexOf(a),GARMENT_BODY.joints.indexOf(b),w],add:g=>{geometry=g;}});
  const p=geometry.attributes.position,edges=new Map();
  for(let i=0;i<geometry.index.count;i+=3)for(let k=0;k<3;k++){
   const a=geometry.index.getX(i+k),b=geometry.index.getX(i+(k+1)%3),key=[Math.min(a,b),Math.max(a,b)].join(':');const e=edges.get(key);if(e)e.count++;else edges.set(key,{a,b,count:1});
  }
  let n=0;for(const {a,b,count} of edges.values())if(count===1&&p.getY(a)>1.4&&p.getY(b)>1.4)for(const i of [a,b]){
   const radius=(p.getX(i)/(.066*wide))**2+((p.getZ(i)-.010)/.060)**2;assert.ok(Math.abs(radius-1)<1e-5,'ragged neckline');assert.ok(p.getY(i)>=1.4519&&p.getY(i)<=1.4661);n++;
  }
  assert.ok(n>40);assert.ok(Array.from({length:p.count},(_,i)=>p.getY(i)>1.46&&Math.abs(p.getX(i))>.15*wide).some(Boolean),'shoulders were flattened');geometry.dispose();
 }
});
