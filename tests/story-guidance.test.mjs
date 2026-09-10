import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){},measureText:()=>({width:0}),createLinearGradient:()=>({addColorStop(){}})})})};
const { SiloWorld }=await import('../dist/src/world.js');
const { Story, CHAPTERS, COLLECTABLES }=await import('../dist/src/story.js');
const { LEVELS, roomType, TYPE_NAMES }=await import('../dist/src/data.js');

const world=new SiloWorld(new THREE.Scene());

test('every story item rests on something a player can see',()=>{
  // The crowbar hung at chest height in the middle of the machine hall with no
  // bench under it and nothing behind it. It was the one item players could
  // not find, and from inside the game it looked like a bug rather than a tool
  // somebody had put down.
  for(const item of COLLECTABLES){
    if(item.prop||item.id==='shotgun')continue;          // placed by the cast, or handed over
    world.loadLevel?.(item.level);
    const room=world.loaded.get(item.level)?.rooms?.[item.wing];
    assert.ok(room,`${item.id} names level ${item.level} wing ${item.wing}, which does not exist`);
    const [ix,iy,iz]=item.at;
    if(iy<=.25)continue;                                  // sitting on the floor is support enough
    let best=null;
    for(const solid of room.userData?.solids||[]){
      if(Math.abs(ix-solid.x)>solid.w/2+.3||Math.abs(iz-solid.z)>solid.d/2+.3)continue;
      if(solid.y1<=iy+.14&&(best===null||solid.y1>best))best=solid.y1;
    }
    assert.ok(best!==null,`${item.id} floats at ${iy.toFixed(2)} m with nothing under it on level ${item.level}`);
    assert.ok(iy-best<.3,`${item.id} hangs ${(iy-best).toFixed(2)} m above the nearest surface`);
  }
});

test('every chapter tells the player where to go, and the place is real',()=>{
  for(const chapter of CHAPTERS){
    if(!chapter.where)continue;                           // the drone and the ending have no destination
    const {level,wing,place}=chapter.where;
    assert.ok(LEVELS[level-1],`chapter ${chapter.id} points at level ${level}, which does not exist`);
    assert.ok(typeof wing==='number'&&wing>=0&&wing<6,`chapter ${chapter.id} has no wing`);
    // A player travels by level number. An objective that names a department
    // and not a number cannot be acted on in a silo 144 levels deep.
    assert.match(place,/\d{3}|gallery/i,`chapter ${chapter.id} names "${place}" with no level number`);
    assert.ok(place.length<48,`chapter ${chapter.id} destination line is too long for the card`);
  }
});

test('the chapter that asks for a thing points at the level the thing is on',()=>{
  // Chapters and items drifted apart once already: the objective said
  // "in Mechanical" while the crowbar was three rooms away from where the
  // words implied. Tie them together so they cannot drift again.
  const pairs=[['clues','pez'],['crowbar','crowbar'],['pipe-tools','pipekit'],['escape-kit','suit']];
  for(const [chapterId,itemId] of pairs){
    const chapter=CHAPTERS.find(c=>c.id===chapterId),item=COLLECTABLES.find(i=>i.id===itemId);
    assert.equal(chapter.where.level,item.level,`chapter ${chapterId} sends the player to ${chapter.where.level}, but ${itemId} is on ${item.level}`);
    assert.equal(chapter.where.wing,item.wing,`chapter ${chapterId} names wing ${chapter.where.wing}, but ${itemId} is in wing ${item.wing}`);
    assert.match(chapter.where.place,new RegExp(String(item.level).padStart(3,'0')));
  }
});

test('hints escalate, run out, and survive a reload',()=>{
  const story=new Story('story');
  story.beginSearch();
  const total=story.hintsTotal;
  assert.ok(total>=2,'a chapter a player can be stuck on needs more than one hint');
  const first=story.revealHint();
  assert.ok(first&&first.length>10);
  assert.equal(story.hintsShown,1);
  // Each hint is more specific than the last: the final one says where it is.
  const all=[first];
  while(story.hintsLeft)all.push(story.revealHint());
  assert.equal(all.length,total);
  assert.equal(story.revealHint(),null,'the hints must run out rather than repeat');
  assert.deepEqual(story.shownHints,all);
  // A reload is not a way to be told again, and not a way to lose the help.
  const back=Story.load(story.save());
  assert.equal(back.hintsShown,total);
  assert.equal(back.revealHint(),null);
});

test('arriving on the objective level is announced once, and only there',()=>{
  const story=new Story('story');
  story.beginSearch();
  const level=story.destination.level;
  assert.equal(story.arriving(level+1),false,'a level you wandered into is not an arrival');
  assert.equal(story.arriving(level),true);
  assert.equal(story.arriving(level),false,'the arrival notice must not repeat every quarter second');
  // A new chapter is a new arrival.
  story.take('pez');story.take('watch');
  assert.notEqual(story.chapter,'clues');
  if(story.destination)assert.equal(story.arriving(story.destination.level),true);
});

test('explore mode is never given objectives or hints',()=>{
  const story=new Story('explore');
  assert.equal(story.destination,null);
  assert.equal(story.revealHint(),null);
  assert.equal(story.arriving(26),false);
});
