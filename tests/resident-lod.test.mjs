import test from 'node:test';
import assert from 'node:assert/strict';
import { createResident } from '../dist/src/resident-model.js';
import { setResidentDetail, updateResidentDetail } from '../dist/src/resident-lod.js';
import { RESIDENT_CAST } from '../dist/src/resident-data.js';

globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const skinned=actor=>{let mesh;actor.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});return mesh;};

// Across a gallery a resident is a few dozen pixels tall; drawing all thirty-
// odd thousand triangles of them there was most of the frame on a busy floor.
test('a distant resident is a fraction of the triangles, on the same vertices',()=>{
  for(const id of ['walker','juliette','bernard']){
    const actor=createResident(RESIDENT_CAST.find(d=>d.id===id)),mesh=skinned(actor),near=mesh.geometry;
    setResidentDetail(actor,true);const far=mesh.geometry;
    assert.notEqual(far,near,`${id}: no distant version`);
    assert.ok(far.index.count<near.index.count*.5,`${id}: ${far.index.count/3} of ${near.index.count/3} triangles kept`);
    // Same buffers, so the distant body skins, blinks and shades exactly like the near one.
    for(const name of Object.keys(near.attributes))assert.equal(far.attributes[name],near.attributes[name],`${id}: ${name} copied`);
    assert.equal(far.morphAttributes,near.morphAttributes);
    for(const i of far.index.array)assert.ok(i<near.attributes.position.count);
    setResidentDetail(actor,false);assert.equal(mesh.geometry,near);
  }
});

// Merging across colours or bones is what tears a mesh: a sleeve joined to the
// hip it hangs beside stretches every time the arm swings.
test('a vertex only ever merges onto one of its own colour and bone, close by',()=>{
  const actor=createResident(RESIDENT_CAST.find(d=>d.id==='walker')),mesh=skinned(actor);
  setResidentDetail(actor,true);
  const g=mesh.geometry,map=g.userData.mergedOnto,p=g.attributes.position,c=g.attributes.color,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;
  const dominant=i=>{let b=si.getX(i),w=sw.getX(i);for(let k=1;k<4;k++)if(sw.getComponent(i,k)>w){w=sw.getComponent(i,k);b=si.getComponent(i,k);}return b;};
  const colour=i=>[c.getX(i),c.getY(i),c.getZ(i)].map(v=>(v*24)|0).join();
  let moved=0;
  for(let i=0;i<map.length;i++){
    const j=map[i];if(j===i)continue;moved++;
    assert.equal(dominant(j),dominant(i),`vertex ${i} merged across bones`);
    assert.equal(colour(j),colour(i),`vertex ${i} merged across colours`);
    const d=Math.hypot(p.getX(i)-p.getX(j),p.getY(i)-p.getY(j),p.getZ(i)-p.getZ(j));
    assert.ok(d<.05,`vertex ${i} moved ${(d*100).toFixed(1)} cm`);
  }
  assert.ok(moved>1000);
});

test('the switch has slack so a resident at the boundary does not flicker',()=>{
  const actor=createResident(RESIDENT_CAST.find(d=>d.id==='walker')),mesh=skinned(actor),near=mesh.geometry;
  updateResidentDetail(actor,13.5,'balanced');assert.equal(mesh.geometry,near);
  updateResidentDetail(actor,14.5,'balanced');assert.notEqual(mesh.geometry,near);
  updateResidentDetail(actor,12.5,'balanced');assert.notEqual(mesh.geometry,near);
  updateResidentDetail(actor,11.5,'balanced');assert.equal(mesh.geometry,near);
});
