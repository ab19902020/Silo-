import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { Kit,createMaterials } from '../dist/src/kit.js';
import { buildStairFlight, landingPath, helixPath, parapetGeometry,
  stairOpening, railRadius, guardZ, PARAPET, PARAPET_TOP } from '../dist/src/staircase.js';
import { SILO, TAU } from '../dist/src/data.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

// The flight's guard no longer stops short of the landing: it sweeps round the
// corner and becomes the bridge guard. So the opening to protect is the clear
// walkway between the two guards, not the deck's full width — the guard itself
// standing on the deck edge is the thing that makes the landing safe.
const CLEAR=guardZ-PARAPET.half-.02;
test('both bridge openings are clear of the flight, its guard and its sweeps',()=>{
  const kit=new Kit(createMaterials());buildStairFlight(kit);const p=new T.Vector3();let checked=0;
  for(const part of kit.parts){const points=part.geometry.attributes.position;
    for(let i=0;i<points.count;i++){
      p.fromBufferAttribute(points,i).applyMatrix4(part.matrix);assert.ok(p.toArray().every(Number.isFinite));
      if(p.x<SILO.stairRadius-.45||p.x>SILO.stairRadius+.45||Math.abs(p.z)>CLEAR)continue;
      for(const landing of [0,SILO.levelHeight])assert.ok(p.y<landing+.04||p.y>landing+1.9,`Stair geometry intrudes into landing: ${p.toArray()}`);
      checked++;
    }
  }
  assert.ok(checked>40,'the opening geometry was not examined');
});

// What used to be an open corner: the helix guard ended at its own radius and
// the bridge guard began at another, leaving the landing edge unguarded between
// them. The sweep has to leave one and arrive on the other without a break.
test('the landing sweep carries the guard from the flight onto the bridge',()=>{
  for(const [side,lift] of [[1,0],[-1,SILO.levelHeight]]){
    const path=landingPath(side,lift),first=path[0],last=path[path.length-1];
    assert.ok(Math.abs(Math.hypot(first[0],first[2])-railRadius)<1e-9,'the sweep must start on the flight guard');
    assert.ok(Math.abs(Math.atan2(first[2],first[0])-side*stairOpening)<1e-9,'and at the angle the flight guard stops at');
    assert.ok(Math.abs(last[2]-side*guardZ)<1e-9,'the sweep must end on the bridge guard line');
    assert.ok(last[0]>SILO.stairRadius+.5,'and far enough along it to overlap the bridge run');
    for(const point of path){
      assert.ok(point[1]===lift,'the landing sweep is level; only the flight rises');
      assert.ok(Math.abs(point[2])>=guardZ-1e-9,`the sweep oversails the walkway at ${point}`);
    }
    for(let i=1;i<path.length;i++)assert.ok(Math.hypot(path[i][0]-path[i-1][0],path[i][2]-path[i-1][2])<.2,'the sweep has a step in it');
  }
});

// A sweep's winding follows the handedness of its path, so a guard built from a
// clockwise run would render inside out — invisible from the stairs, and lit
// from the wrong side everywhere else.
test('a swept guard is solid and faces outwards',()=>{
  const geometry=parapetGeometry(helixPath(stairOpening,TAU-stairOpening,railRadius));
  const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
  let checked=0;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),z=position.getZ(i),radius=Math.hypot(x,z);
    if(Math.abs(radius-(railRadius+PARAPET.half))>1e-4)continue;
    assert.ok((normal.getX(i)*x+normal.getZ(i)*z)/radius>.5,'the outer face of the guard points into the concrete');
    checked++;
  }
  assert.ok(checked>100,'the outer face was not examined');
  assert.ok(position.getY(position.count-1)<=SILO.levelHeight+PARAPET_TOP+1e-6);
});
