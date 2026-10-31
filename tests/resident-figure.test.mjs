import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { createResident } from '../dist/src/resident-model.js';
import { RESIDENT_CAST } from '../dist/src/resident-data.js';

globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

const meshOf=actor=>{let mesh;actor.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});return mesh;};
const wearing=(outfit,extra={})=>({id:`figure-${outfit}-${JSON.stringify(extra)}`,name:outfit,height:1.78,
  appearance:{outfit,skin:0xb08a6e,hair:0x3a2f26,coat:0x5d6b74,shirt:0xb7ae96,...extra}});

// A rolled sleeve bares the forearm. The rule used to be "anything wider than
// 16 cm below the elbow", which the hips are, so every short-sleeved resident
// had a patch of bare skin painted on the side of their trousers.
test('a rolled sleeve bares the forearm, never the hips',()=>{
  const def=wearing('work',{shortSleeves:true}),mesh=meshOf(createResident(def));
  const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color,skin=new T.Color(def.appearance.skin);
  const names=mesh.skeleton.bones.map(b=>b.name),index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;
  let onHips=0,onForearm=0;
  for(let i=0;i<p.count;i++){
    const dominant=weight.getX(i)>=weight.getY(i)?index.getX(i):index.getY(i),bone=names[dominant];
    const near=Math.abs(c.getX(i)-skin.r)+Math.abs(c.getY(i)-skin.g)+Math.abs(c.getZ(i)-skin.b)<.10;
    if(!near)continue;
    if(/^(Hips|Thigh)/.test(bone))onHips++;
    if(/^Forearm/.test(bone))onForearm++;
  }
  assert.ok(onForearm>20,`only ${onForearm} bare forearm vertices — the sleeve did not roll`);
  assert.equal(onHips,0,`${onHips} vertices of bare skin on the hips`);
});

// A heavier resident used to be a sideways stretch of every vertex, so the
// arms and legs became flat ovals: wide from the front, no thicker from the
// side. Limbs grow round with build.
test('a heavier build thickens the limbs all the way round',()=>{
  const ratio=build=>{
    const mesh=meshOf(createResident(wearing('shirt',{build}))),p=mesh.geometry.attributes.position;
    const names=mesh.skeleton.bones.map(b=>b.name),index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;
    let x0=9,x1=-9,z0=9,z1=-9;
    for(let i=0;i<p.count;i++){
      const dominant=weight.getX(i)>=weight.getY(i)?index.getX(i):index.getY(i);
      if(names[dominant]!=='ShinL')continue;
      const y=p.getY(i);if(y<.38||y>.44)continue;
      x0=Math.min(x0,p.getX(i));x1=Math.max(x1,p.getX(i));z0=Math.min(z0,p.getZ(i));z1=Math.max(z1,p.getZ(i));
    }
    return (x1-x0)/(z1-z0);
  };
  const slim=ratio(1),heavy=ratio(1.15);
  assert.ok(Math.abs(heavy-slim)<.06,`the calf goes from ${slim.toFixed(2)} to ${heavy.toFixed(2)} wide-to-deep with build; it should stay round`);
});

// The trunk came out of the baked mesh as a slab — as wide at the waist as
// across the chest — and it is most of why the cast read as blocky.
test('the trunk comes in at the waist',()=>{
  for(const female of [false,true]){
    const mesh=meshOf(createResident(wearing('shirt',{female}))),p=mesh.geometry.attributes.position;
    const names=mesh.skeleton.bones.map(b=>b.name),index=mesh.geometry.attributes.skinIndex,weight=mesh.geometry.attributes.skinWeight;
    const width=(lo,hi)=>{let w=0;for(let i=0;i<p.count;i++){
      const dominant=weight.getX(i)>=weight.getY(i)?index.getX(i):index.getY(i);
      if(!/^(Spine|Chest|Hips)$/.test(names[dominant]))continue;
      const y=p.getY(i)*1.78/1.78;if(y>=lo&&y<hi)w=Math.max(w,Math.abs(p.getX(i)));}return w;};
    const chest=width(1.26,1.30),waist=width(1.10,1.14);
    assert.ok(waist<chest*.87,`${female?'female':'male'}: waist ${(waist*200).toFixed(1)} cm against chest ${(chest*200).toFixed(1)} cm`);
  }
});

// An open garment's front is sampled round the chest. High on the chest the
// supported surface runs out, and a ray that found nothing in front used to come
// back with a point on the shoulder blade — so the top of every open jacket was
// built inside the body, and the shirt beneath showed through in a smear.
test('an open jacket is built on the front of the chest, not through it',()=>{
  for(const id of ['pete','walker','patrick']){
    const def=RESIDENT_CAST.find(d=>d.id===id);if(!def)continue;
    const mesh=meshOf(createResident(def)),p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color;
    const coat=new T.Color(def.appearance.coat),scale=def.height/1.78;
    let front=0,behind=0;
    for(let i=0;i<p.count;i++){
      const y=p.getY(i)/scale;if(y<1.36||y>1.44)continue;
      const near=Math.abs(c.getX(i)-coat.r)+Math.abs(c.getY(i)-coat.g)+Math.abs(c.getZ(i)-coat.b)<.12;
      if(!near)continue;
      const x=p.getX(i)/scale,z=p.getZ(i)/scale;
      if(Math.abs(x)>.04&&Math.abs(x)<.10)z>.04?front++:behind++;
    }
    assert.ok(front>4,`${id}: no jacket on the front of the upper chest`);
  }
});
