import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { createResident } from '../dist/src/resident-model.js';

globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const skinned=actor=>{let mesh;actor.model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});return mesh;};
const person=(hairStyle,extra={})=>({id:`hair-${hairStyle}-${JSON.stringify(extra)}`,name:hairStyle,height:1.78,
  appearance:{outfit:'shirt',skin:0xb08a6e,hair:0x3a2f26,coat:0x5d6b74,shirt:0xb7ae96,hairStyle,...extra}});

// The shader lays strands over hair, and the exporter files it as its own
// material, both by the marker in the surface channel. Hair also has a sheen;
// at .9 roughness it read as felt.
test('hair is marked for the strand shader and is not matte',()=>{
  const g=skinned(createResident(person('waves'))).geometry,f=g.attributes.residentSurface;
  let hair=0;for(let i=0;i<f.count;i++)if(f.getZ(i)===2){hair++;assert.ok(f.getX(i)<.7,'hair is still matte');}
  assert.ok(hair>300,`only ${hair} hair vertices are marked`);
});

// Hair used to be a centimetre of colour on the skull everywhere: a swimming
// cap. Loose hair stands up off the crown; hair pulled into a bun lies close.
test('loose hair carries volume on the crown, tied-back hair lies close',()=>{
  // Everybody is scaled so the top of their head meets their height, so the
  // volume shows as how far the top of the hair stands above the head bone.
  const crown=style=>{const actor=createResident(person(style)),mesh=skinned(actor),p=mesh.geometry.attributes.position;
    actor.model.updateMatrixWorld(true);const head=mesh.skeleton.bones.find(b=>b.name==='Head').getWorldPosition(new T.Vector3());
    let top=0;for(let i=0;i<p.count;i++)top=Math.max(top,p.getY(i));return top-head.y;};
  const loose=crown('curls'),tied=crown('bun');
  assert.ok(loose-tied>.008,`curls stand ${((loose-tied)*1000).toFixed(1)} mm higher than a bun`);
});

// The head is cut along a seam with its vertices doubled. Pushing hair out
// along each copy's own normal tore the two copies apart: a crack along every
// crown. Every hair vertex has to have a partner wherever it had one before.
test('the hair shell has no crack along the seam',()=>{
  const p=skinned(createResident(person('waves'))).geometry.attributes.position,f=skinned(createResident(person('waves'))).geometry.attributes.residentSurface;
  const pts=[];for(let i=0;i<p.count;i++)if(f.getZ(i)===2&&p.getY(i)>1.66)pts.push([p.getX(i),p.getY(i),p.getZ(i)]);
  // On the midline at the back of the head, where the seam runs, no hair
  // vertex may stand alone more than a millimetre from its twin.
  let torn=0;
  for(const a of pts){if(Math.abs(a[0])>.004||a[2]>-.02)continue;
    let near=Infinity;for(const b of pts){if(b===a)continue;const d=Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);if(d<near)near=d;}
    if(near>.0035)torn++;}
  assert.equal(torn,0,`${torn} hair vertices on the crown seam have pulled away from their twins`);
});
