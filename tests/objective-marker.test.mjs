import test from 'node:test';
import assert from 'node:assert/strict';

// The marker draws itself with a canvas, so give it one. Nothing here renders;
// the texture just has to be constructible.
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({
  createRadialGradient:()=>({addColorStop(){}}),
  beginPath(){},arc(){},fill(){},fillRect(){},set fillStyle(v){},get fillStyle(){return '';}})})};

const T=await import('../dist/vendor/three.module.js');
const { StoryMarker }=await import('../dist/src/story-marker.js');
const { objectiveTarget }=await import('../dist/src/objective-target.js');
const { Story }=await import('../dist/src/story.js');

// Run the marker forward at a fixed step until it settles, and report the
// brightest it gets across a full breath. Peak rather than a single sample,
// because it breathes and one reading lands wherever the sine happens to be.
function settle(marker,at,eye,seconds=3,blocked=false){
  let peak=0,visible=false;
  for(let t=0;t<seconds;t+=1/60){
    marker.update(1/60,at,eye,blocked);
    if(marker.sprite.visible){visible=true;peak=Math.max(peak,marker.sprite.material.opacity);}
  }
  return {peak:Number(peak.toFixed(3)),visible,depthTest:marker.sprite.material.depthTest};
}
const fresh=()=>new StoryMarker(new T.Scene());
const head=y=>new T.Vector3(0,y,0);

test('the mark sits above the head and only while somebody is marked',()=>{
  const m=fresh(),eye=new T.Vector3(0,1.6,4);
  const at=head(1.67);
  const on=settle(m,at,eye);
  assert.ok(on.visible&&on.peak>.3,`marked and still invisible (peak ${on.peak})`);
  assert.ok(m.sprite.position.y>at.y,'the mark is not above the head');
  assert.ok(m.sprite.position.y-at.y<.4,`the mark floats ${(m.sprite.position.y-at.y).toFixed(2)} m over them`);
  // And it goes out again when the objective moves on. This is the half that
  // matters: a mark that stays on somebody you have finished with is a mark
  // the player learns to ignore.
  const off=settle(m,null,eye);
  assert.equal(off.peak,0,'the mark is still lit with nobody to mark');
  assert.equal(m.sprite.visible,false,'the sprite is still in the frame');
});

test('the mark carries the width of a floor, and gets out of the way up close',()=>{
 const at=head(1.67);
 const peak=(d,blocked=false)=>settle(fresh(),at,new T.Vector3(0,1.6,d),3,blocked).peak;
 // Right in front of them you have the prompt on screen and their name on it.
 assert.equal(peak(1.0),0,'the mark is still lit while standing on top of them');
 // Across a room is where it picks one person out of a crowd.
 assert.ok(peak(5)>.5,`too faint at five metres (${peak(5)})`);
 // And across a FLOOR is the part that makes an objective followable. Travel
 // drops you at the stair landing about forty-five metres from the Supply
 // counter; a mark that dies at nineteen leaves you turning on the spot.
 assert.ok(peak(20)>.1,`nothing at twenty metres (${peak(20)}) — you cannot cross a floor by it`);
 assert.ok(peak(40)>.1,`nothing at forty metres (${peak(40)}) — Supply is further than that`);
 // It does not carry the whole silo, though.
 assert.equal(peak(64),0,'the mark is visible from sixty-four metres');
 // Monotonic through the near fade, so it grows in rather than popping.
 const near=[1.6,2.0,2.4,3.0].map(d=>peak(d));
 for(let i=1;i<near.length;i++)
  assert.ok(near[i]>=near[i-1],`the near fade goes backwards: ${near.join(' → ')}`);
});

test('the mark is solid up close and faint through a wall',()=>{
 const at=head(1.67);
 // Near and unobstructed: depth-tested, so it cannot shine through anything,
 // and bright enough to say "this one".
 const close=settle(fresh(),at,new T.Vector3(0,1.6,4),3,false);
 assert.equal(close.depthTest,true,'the near mark would shine through a wall');
 // Far, or with something in the way: drawn through the geometry so it can be
 // a direction, and dimmed because it is on screen for as long as the walk.
 const across=settle(fresh(),at,new T.Vector3(0,1.6,30),3,false);
 assert.equal(across.depthTest,false,'the far mark is hidden by the room you are walking through');
 assert.ok(across.peak<close.peak,
   `the far mark (${across.peak}) is no dimmer than the near one (${close.peak})`);
 // A wall at close range counts as far: that is the case where you are near
 // somebody but in the next room, and a depth-tested dot shows you nothing.
 const behind=settle(fresh(),at,new T.Vector3(0,1.6,4),3,true);
 assert.equal(behind.depthTest,false,'a blocked mark stays depth-tested and invisible');
 assert.ok(behind.peak>0,'a blocked mark shows nothing at all');
});

test('a marked person who walks out of the level takes the mark with them',()=>{
  // population.actorHead returns null for somebody not loaded. The frame loop
  // hands that straight through, so the marker has to cope with it rather than
  // leaving a dot hanging in the air where they used to be.
  const m=fresh(),eye=new T.Vector3(0,1.6,4);
  settle(m,head(1.67),eye);
  assert.equal(m.sprite.visible,true);
  settle(m,null,eye);
  assert.equal(m.sprite.visible,false,'the mark is left behind after they leave');
});

test('the marker never marks two people at once',()=>{
  // objectiveTarget returns one id or none, by construction — but the rule
  // table is ordered and hand-written, so this walks the whole of Chapters One
  // and Two and checks it never disagrees with itself.
  const s=new Story('story');
  const steps=[()=>s.beginSearch(),()=>s.spokeToMara(),()=>s.take('dispatch'),
    ()=>s.reachedSupply(),()=>s.deliverDispatch(),()=>s.take('package'),()=>s.metTheDeputy(false)];
  for(const step of steps){
    const target=objectiveTarget(s);
    assert.ok(target===null||typeof target==='string',`marked something that is not a person: ${target}`);
    step();
  }
});
