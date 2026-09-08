import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { Kit,createMaterials } from '../dist/src/kit.js';
import { buildStairFlight } from '../dist/src/staircase.js';
import { SILO } from '../dist/src/data.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
test('both bridge openings are clear of all rendered stair posts, caps and handrails',()=>{
  const kit=new Kit(createMaterials());buildStairFlight(kit);const p=new T.Vector3();let checked=0;
  for(const part of kit.parts){const points=part.geometry.attributes.position;
    for(let i=0;i<points.count;i++){
      p.fromBufferAttribute(points,i).applyMatrix4(part.matrix);assert.ok(p.toArray().every(Number.isFinite));
      if(p.x<SILO.stairRadius-.45||p.x>SILO.stairRadius+.45||Math.abs(p.z)>SILO.landingHalf+.04)continue;
      for(const landing of [0,SILO.levelHeight])assert.ok(p.y<landing+.04||p.y>landing+1.9,`Stair geometry intrudes into landing: ${p.toArray()}`);
      checked++;
    }
  }
  assert.ok(checked>40,'the opening geometry was not examined');
});
