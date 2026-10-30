import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';

globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){},createRadialGradient:()=>({addColorStop(){}}),beginPath(){},arc(){},fill(){}})})};

const { Story, CHAPTERS, COLLECTABLES }=await import('../dist/src/story.js');
const { objectiveMark, objectiveItem, objectiveTarget }=await import('../dist/src/objective-target.js');
const { populationRecords }=await import('../dist/src/population.js');

// Walk the story the way a player does, stopping at each chapter so the tests
// below can ask "standing here, with this in my satchel, does the game point
// at anything?" — which is the entire difference between a story you can
// follow and a list of floor numbers.
function* progression(){
  const s=new Story('story');
  yield ['cleaning',s];
  s.beginSearch();                yield ['the-clean · nobody spoken to',s];
  s.spokeToMara();                yield ['the-clean · after Mara',s];
  s.take('dispatch');             yield ['the-clean · carrying the dispatch',s];
  s.reachedSupply();              yield ['the-package · at Supply',s];
  s.deliverDispatch();            yield ['the-package · dispatch handed over',s];
  s.take('package');              yield ['clues · parcel taken',s];
  s.metTheDeputy(false);          yield ['clues · deputy met',s];
}

test('every step of Chapters One and Two points at something',()=>{
  // The failure this exists for: the game marked the Supply clerk while the
  // player was standing forty-five metres away on the far side of the floor,
  // and nothing else said which way to walk. Pointing at the right person is
  // only half of it — there has to BE a mark at each step where the story is
  // waiting on the player to do something.
  const unmarked=[];
  for(const [where,s] of progression()){
    const mark=objectiveMark(s,COLLECTABLES);
    if(!mark)unmarked.push(where);
  }
  // Two steps legitimately have nothing on this floor to mark: the opening,
  // which is a scene rather than an errand, and the walk downstairs with the
  // dispatch already in hand, where the objective is a different floor and the
  // card says so.
  assert.deepEqual(unmarked,['cleaning','the-clean · carrying the dispatch'],
    `these steps point at nothing at all:\n  ${unmarked.join('\n  ')}`);
});

test('a marked person is standing on the floor the chapter names',()=>{
  // A mark over somebody who is not in the room is worse than no mark: the
  // game is confidently pointing at empty air. Mara was exactly that for a
  // while — named in the objective, tagged out of the world by the placement.
  const seen=new Set();
  for(const [where,s] of progression()){
    const who=objectiveTarget(s);
    if(!who||seen.has(who))continue;
    seen.add(who);
    const level=s.destination?.level;
    assert.ok(level,`${where}: marks ${who} but the chapter names no floor`);
    const here=populationRecords(level).some(r=>r.id===who);
    assert.ok(here,`${where}: marks ${who}, who is not on level ${level}`);
  }
  assert.ok(seen.size>=3,`only ${seen.size} people are ever marked across Chapters One and Two`);
});

test('a marked object is really in the world and really gettable',()=>{
  for(const [where,s] of progression()){
    const id=objectiveItem(s,COLLECTABLES);
    if(!id)continue;
    const item=COLLECTABLES.find(c=>c.id===id);
    assert.ok(item,`${where}: marks an item "${id}" that is not a collectable`);
    assert.equal(s.visible(id),true,`${where}: marks ${id}, which the story is not showing`);
    assert.equal(s.has(id),false,`${where}: marks ${id}, which is already in the satchel`);
    // Either it lies somewhere, or somebody puts it in your hands.
    assert.ok(Array.isArray(item.at)||item.handed,`${where}: ${id} has nowhere to be`);
  }
});

test('every chapter that sends you somewhere names the floor in its own text',()=>{
  // The compact card shows `destination.place`. A chapter with a destination
  // and no place to print would collapse to an empty line.
  for(const c of CHAPTERS){
    if(!c.where)continue;
    assert.ok(c.where.place,`chapter "${c.id}" has a destination with no place to print on the card`);
    assert.ok(/\d/.test(c.where.place)||/outside|ridge|surface/i.test(c.where.place),
      `chapter "${c.id}" place "${c.where.place}" does not name a floor`);
  }
});
