import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as T from '../dist/vendor/three.module.js';
globalThis.document={createElement:()=>({width:0,height:0,style:{},getContext:()=>({fillRect(){},strokeRect(){},fillText(){},measureText:()=>({width:10})})})};
const { CafeteriaOpening, cleaningSample, CLEAN_START, CLEAN_END, GESTURE_FROM,
  gestureStrength, GESTURE_AT, OPENING_DURATION, HELMET_OFF, CLEANER_ID, PARTNER_ID }=await import('../dist/src/opening.js');
const { SiloWorld }=await import('../dist/src/world.js');
const { Story, CHAPTERS, COLLECTABLES }=await import('../dist/src/story.js');
const { RESIDENT_CAST }=await import('../dist/src/resident-data.js');
const { CLEANER, PARTNER, WITNESS, AFTER_THE_CLEAN, PACKAGE }=await import('../dist/src/the-clean.js');
const { topLocal }=await import('../dist/src/surface.js');

// Chapter One is a redirection of the story, not a rebuild of the game. The
// cleaning that was already here — the walk out, the crater, the lens, the
// climb, the helmet, the long rest, all of it cut against the opening piece —
// still runs frame for frame. These tests are mostly about proving that.

test('the existing cleaning is untouched: the same beats at the same seconds',()=>{
  // The scene is cut against assets/audio/silo-18-opening.mp3. If a beat moves,
  // the score no longer lands on it. These are the timings the sequence shipped
  // with, written out so a later change to the story cannot quietly shift them.
  assert.equal(OPENING_DURATION,90);
  assert.equal(CLEAN_START,21);
  assert.equal(CLEAN_END,30);
  assert.equal(HELMET_OFF,69.4);
  const beats=[[0,'emerge'],[8.5,'approach'],[12,'approach'],[20,'approach'],
    [25,'clean'],[29.5,'clean'],[30.5,'turn'],[32,'walk'],[50,'walk'],
    [70,'helmet'],[80,'crawl'],[88,'rest']];
  for(const [t,phase] of beats)
    assert.equal(cleaningSample(t).phase,phase,`the cleaning changed shape at ${t}s`);
});

test('the gesture happens inside the clean, before he turns away',()=>{
  // It is placed in the tail of the existing clean window on purpose: the
  // wiping arm's own envelope is already back to zero by 0.84 of the way
  // through, so the last sixth was a man standing still. Putting it there is
  // what lets the story add a beat without retiming the ninety seconds.
  assert.ok(GESTURE_FROM>.84&&GESTURE_FROM<1,`the gesture starts at ${GESTURE_FROM} of the clean`);
  const starts=CLEAN_START+(CLEAN_END-CLEAN_START)*GESTURE_FROM;
  assert.ok(starts>CLEAN_START&&starts<CLEAN_END,'the gesture is outside the clean window');
  assert.ok(CLEAN_END-starts>.8&&CLEAN_END-starts<2.5,
    `the gesture gets ${(CLEAN_END-starts).toFixed(2)}s, which is a twitch or a speech`);
  // Nothing before it, something held in the middle of it, nothing after it.
  assert.equal(gestureStrength(.5),0);
  assert.equal(gestureStrength(.84),0,'it overlaps the wiping arm');
  assert.equal(gestureStrength(1),0,'his hand is still up when he turns away');
  assert.equal(gestureStrength(.93),1,'it never reaches a hold');
  // And it is a hold, not a wave: full strength across a real span of time.
  let held=0;for(let p=GESTURE_FROM;p<=1;p+=.001)if(gestureStrength(p)>.99)held+=.001;
  const seconds=held*(CLEAN_END-CLEAN_START);
  assert.ok(seconds>.35&&seconds<1.2,`the hand is held out for ${seconds.toFixed(2)}s`);
});

test('the free hand actually comes up to the lens, and is down before he turns',{timeout:120000},()=>{
  const world=new SiloWorld(new T.Scene());world.setLevel(1);
  const opening=new CafeteriaOpening(world);opening.takeBook();
  const cleaner=opening.cleaners[0];
  const read=()=>{
    world.scene.updateMatrixWorld(true);
    const hand=topLocal(cleaner.motion.bones.HandL.getWorldPosition(new T.Vector3()));
    const shoulder=topLocal(cleaner.motion.bones.UpperArmL.getWorldPosition(new T.Vector3()));
    const foot=topLocal(cleaner.motion.bones.FootL.getWorldPosition(new T.Vector3()));
    return {lift:hand.y-foot.y,reach:Math.hypot(hand.x-shoulder.x,hand.z-shoulder.z)};
  };
  // Step it the way the game does, so the phase blend runs at its real rate.
  const STEP=1/60;const samples={};
  for(let t=0;t<=32;t+=STEP){
    opening.time=t;opening.sample(STEP);
    for(const [name,at] of [['before',28.0],['during',29.5],['after',31.0]])
      if(!samples[name]&&t>=at)samples[name]=read();
  }
  assert.ok(samples.before.lift<.85,`his hand is already up before the gesture: ${samples.before.lift.toFixed(2)} m`);
  assert.ok(samples.before.reach<.15,'his arm is already out before the gesture');
  assert.ok(samples.during.lift>samples.before.lift+.30,
    `the hand only rises ${(samples.during.lift-samples.before.lift).toFixed(2)} m — nobody would see that`);
  assert.ok(samples.during.reach>.35,
    `the arm only extends ${samples.during.reach.toFixed(2)} m from the shoulder`);
  assert.ok(samples.after.lift<samples.before.lift+.10&&samples.after.reach<.20,
    'his hand is still raised after he has turned away');
  // The wiping arm is not disturbed: the gesture is the other hand.
  const right=topLocal(cleaner.motion.bones.HandR.getWorldPosition(new T.Vector3()));
  assert.ok(Number.isFinite(right.y));
  assert.ok(cleaner.cloth,'the cloth is no longer in the cleaning hand');
  assert.equal(cleaner.cloth.parent.name||cleaner.cloth.parent.type,cleaner.motion.bones.HandR.name);
});

test('the opening itself remembers whether the gesture was seen',{timeout:120000},()=>{
  // Chapter One opens on this, so it cannot live in the frame loop: a browser
  // that stalls, a tab that loses focus or a slow first frame must not be able
  // to step over the one moment the story hangs off. The opening advances the
  // time, so the opening is what knows.
  const world=new SiloWorld(new T.Scene());world.setLevel(1);
  const opening=new CafeteriaOpening(world);
  assert.equal(opening.sawGesture,false,'a fresh opening claims the gesture has been seen');
  opening.takeBook();
  opening.update(GESTURE_AT-.5);
  assert.equal(opening.sawGesture,false,'it fires before the gesture');
  // One enormous step, the way a stalled tab resumes. It still cannot be missed.
  opening.update(40);
  assert.equal(opening.sawGesture,true,'a long frame stepped straight over the gesture');
  opening.reset();
  assert.equal(opening.sawGesture,false,'replaying the opening keeps the old answer');
  // And a player who skips has not seen it.
  const skipped=new CafeteriaOpening(world);
  skipped.takeBook();skipped.finish();
  assert.equal(skipped.sawGesture,false,'skipping the opening still counts as watching it');
  // A completed save is past it and is not asked again.
  assert.equal(new CafeteriaOpening(world,{complete:true}).sawGesture,true);
});

test('the two people on the hill are original characters, not television ones',()=>{
  assert.equal(CLEANER.id,CLEANER_ID);
  assert.equal(PARTNER.id,PARTNER_ID);
  for(const who of [CLEANER,PARTNER]){
    const def=RESIDENT_CAST.find(d=>d.id===who.id);
    assert.ok(def,`${who.id} is not in the cast`);
    assert.equal(def.name,who.name);
  }
  assert.equal(RESIDENT_CAST.find(d=>d.id===CLEANER.id).story,'cleaner');
  assert.equal(RESIDENT_CAST.find(d=>d.id===PARTNER.id).story,'outside');
  // The names that were here are gone from everything that ships, including
  // the page itself. The rest of the television cast is untouched and stays.
  const files=[...fs.readdirSync(path.join(import.meta.dirname,'..','dist','src')).map(f=>['dist','src',f]),
    ['dist','index.html']];
  for(const parts of files){
    const file=path.join(import.meta.dirname,'..',...parts);
    if(!/\.(js|html)$/.test(file))continue;
    const text=fs.readFileSync(file,'utf8');
    for(const name of ['Holston','Allison','holston','allison'])
      assert.ok(!text.includes(name),`${parts.join('/')} still names the cleaner ${name}`);
  }
  // And the research panel says whose invention they are.
  const html=fs.readFileSync(path.join(import.meta.dirname,'..','dist','index.html'),'utf8');
  assert.match(html,/original Silo 18 characters/i,'the research panel does not say the cleaner is original');
  assert.ok(html.includes(CLEANER.name),'the research panel does not name the cleaner');
});

test('the exchange after the cleaning is the one that was written, and explains nothing',()=>{
  assert.deepEqual(AFTER_THE_CLEAN.map(b=>b.say??null),
    ['Did you see that?','No. His hand.','What was it?',null]);
  assert.deepEqual(AFTER_THE_CLEAN.map(b=>b.reply),
    ['The cleaning?','Yeah.','I don’t know.','But he wanted somebody to see it.']);
  assert.match(AFTER_THE_CLEAN[1].stage,/empty screen/,'Mara does not look back at the screen');
  assert.ok(AFTER_THE_CLEAN[3].beat>=900,'there is no beat before her last line');
  // Nothing in it may say what the hand meant. The hook has to survive
  // Chapter One intact.
  const said=AFTER_THE_CLEAN.map(b=>`${b.say||''} ${b.reply}`).join(' ').toLowerCase();
  for(const giveaway of ['signal','message','code','sign','meant','because','warning','told'])
    assert.ok(!said.includes(giveaway),`the exchange explains the gesture: "${giveaway}"`);
  assert.equal(WITNESS.name,'Mara Teague');
  assert.ok(RESIDENT_CAST.find(d=>d.id===WITNESS.id),'Mara is not in the cast');
  assert.equal(RESIDENT_CAST.find(d=>d.id===WITNESS.id).level,1,'Mara is not in the room for the cleaning');
});

test('Chapter One runs from the cleaning to the parcel, and the parcel hands off to George',()=>{
  const order=CHAPTERS.map(c=>c.id);
  assert.deepEqual(order.slice(0,4),['cleaning','the-clean','the-package','clues'],
    'the opening no longer runs cleaning -> Chapter One -> the parcel -> George');
  const s=new Story('story');
  assert.equal(s.chapter,'cleaning');
  assert.equal(s.visible('package'),false,'the parcel exists before the cleaning has been watched');
  s.beginSearch();
  assert.equal(s.chapter,'the-clean','watching the cleaning does not open Chapter One');
  assert.match(s.chapterInfo.title,/Chapter One/);
  assert.match(s.objective,/runner/i,'Chapter One does not put the player to work as a runner');
  assert.match(s.objective,/110/,'Chapter One does not say where the shift goes');
  assert.equal(s.reachedSupply(),false,'the shift can be finished without talking to Mara');
  assert.equal(s.visible('package'),false);
  assert.equal(s.spokeToMara(),true);
  assert.equal(s.destination.level,PACKAGE.level);
  assert.equal(s.reachedSupply(),true);
  assert.equal(s.chapter,'the-package');
  assert.equal(s.visible('package'),true);
  assert.ok(s.take('package'));
  assert.equal(s.chapter,'clues');
  // The parcel is what names the bar and George; the directory receipt used to.
  const parcel=COLLECTABLES.find(c=>c.id==='package');
  assert.match(parcel.blurb,/026/,'the parcel does not name the bar');
  assert.match(parcel.blurb,/WILKINS/,'the parcel does not name George');
  assert.match(parcel.blurb,/REEVE/,'the parcel does not say who lodged it');
  assert.match(s.objective,/026/,'the chapter after the parcel does not follow the chit');
});

test('a Chapter One save comes back where it was left',()=>{
  const s=new Story('story');s.beginSearch();s.spokeToMara();
  const midRun=Story.load(JSON.parse(JSON.stringify(s.save())));
  assert.equal(midRun.chapter,'the-clean');
  assert.equal(midRun.hasFlag('mara-spoke'),true,'a reload forgets that Mara spoke');
  assert.equal(midRun.destination.level,PACKAGE.level);
  s.reachedSupply();s.take('package');
  const after=Story.load(JSON.parse(JSON.stringify(s.save())));
  assert.equal(after.chapter,'clues');
  assert.equal(after.has('package'),true);
});
