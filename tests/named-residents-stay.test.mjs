import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){},createRadialGradient:()=>({addColorStop(){}}),beginPath(){},arc(){},fill(){}})})};

const { populationRecords, CROWD_LIMITS }=await import('../dist/src/population.js');
const { RESIDENT_CAST }=await import('../dist/src/resident-data.js');
const { landingPoint, levelY }=await import('../dist/src/data.js');

// The cull the game runs every 0.8 s, lifted out so a test can ask it the one
// question that matters: standing HERE, who gets thrown away?
function keptFrom(level,at,limit){
  const records=populationRecords(level);
  const rank=r=>r.definition?0:1;
  const d2=r=>(r.position.x-at.x)**2+(r.position.z-at.z)**2;
  return new Set(records.slice().sort((a,b)=>rank(a)-rank(b)||d2(a)-d2(b)).slice(0,limit).map(r=>r.id));
}

test('the named cast of a floor is never culled, from anywhere on that floor',()=>{
  // What this exists for. The cull ranked everybody by distance squared and
  // gave named residents a bonus of 900 — which, because the key is squared,
  // is worth thirty metres and no more. Level 001 is the biggest floor in the
  // silo: travel drops you on the stair landing and the cafeteria is the far
  // side of it. Billings stands 50.7 m from the landing and sorted as 1672,
  // against 1172 for the forty-eighth crowd member, so he lost. So did Mara,
  // Jahns and Marnes.
  //
  // The effect in play: leave Level 001 and come back — which every player has
  // done by Chapter Eleven — and the entire named cast of the floor is gone,
  // permanently. Chapter Eleven is "take the Georgia book to Billings".
  const floors=new Map();
  for(const d of RESIDENT_CAST){
    if(d.absent)continue;
    for(const level of new Set([d.level,...(d.opening?[1]:[])]))
      floors.set(level,(floors.get(level)||new Set()).add(d.id));
  }
  for(const [level,expected] of floors){
    const records=populationRecords(level);
    const present=new Set(records.filter(r=>r.definition).map(r=>r.id));
    for(const id of expected)
      assert.ok(present.has(id),`${id} is not placed on level ${level} at all`);
    // Every corner a player can be standing in when the cull runs: the stair
    // landing they arrive on, and the far reaches of the floor.
    const landing=landingPoint(level,22);
    const spots=[{x:landing.cx,z:landing.cz},{x:0,z:0},{x:70,z:-40},{x:70,z:40},{x:-30,z:30}];
    for(const limit of Object.values(CROWD_LIMITS))
      for(const at of spots){
        const kept=keptFrom(level,at,limit);
        for(const id of present)
          assert.ok(kept.has(id),
            `level ${level}: ${id} is culled when the player stands at (${at.x}, ${at.z}) with a crowd limit of ${limit}`);
      }
  }
});

test('the crowd still gets culled, or the limit means nothing',()=>{
  // The opposite failure: keeping everybody would be a way to pass the test
  // above and quietly drop the budget that keeps the frame rate up.
  const level=1,limit=CROWD_LIMITS.balanced;
  const records=populationRecords(level);
  assert.ok(records.length>limit,`level ${level} has only ${records.length} people, so nothing is ever culled`);
  const kept=keptFrom(level,{x:22,z:0},limit);
  assert.equal(kept.size,limit,`the cull kept ${kept.size} of ${records.length}, not ${limit}`);
  const crowdKept=[...kept].filter(id=>!records.find(r=>r.id===id)?.definition).length;
  assert.ok(crowdKept>0,'the crowd is gone entirely');
});

test('a floor never has more named residents than the smallest crowd budget',()=>{
  // Keeping the named cast unconditionally is only safe while a floor's named
  // cast is small. If a floor ever had more named people than the low-quality
  // limit, "keep them all" would blow the budget it exists to protect.
  const low=CROWD_LIMITS.low;
  for(const level of new Set(RESIDENT_CAST.filter(d=>!d.absent).map(d=>d.level))){
    const named=populationRecords(level).filter(r=>r.definition).length;
    assert.ok(named<low,`level ${level} has ${named} named residents against a low budget of ${low}`);
  }
});
