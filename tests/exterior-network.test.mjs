import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createMaterials} from '../dist/src/kit.js';
import {SILO_LAYOUT,siloPosition,buildExteriorNetwork} from '../dist/src/exterior-network.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('the exterior has unique silos zero through fifty with 18 at the origin',()=>{
  assert.deepEqual(SILO_LAYOUT.map(s=>s.id),Array.from({length:51},(_,i)=>i));
  assert.equal(new Set(SILO_LAYOUT.map(s=>`${s.q},${s.r}`)).size,51);
  assert.deepEqual([siloPosition(18).x,siloPosition(18).z],[0,0]);
  assert.ok(Math.hypot(siloPosition(17).x,siloPosition(17).z)<190,'Silo 17 is not a walkable neighbour');
});

test('only Silo 17 has an entry and a flooded crown',()=>{
  const n=buildExteriorNetwork(createMaterials(),()=>14);
  assert.deepEqual(n.interactions.map(i=>i.id),['silo17-entry']);
  assert.equal(n.water.name,'silo-17-water');
  assert.equal(n.tops.children.length,3);assert.equal(n.tops.userData.crowns.length,49);assert.ok(n.tops.children.every(m=>m.isInstancedMesh&&m.count===49));
  let triangles=0;n.root.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
  assert.ok(triangles<70000,`exterior crowns cost ${triangles} triangles`);
  assert.ok(n.root.children.every(o=>!(o instanceof THREE.DirectionalLight)));
});

