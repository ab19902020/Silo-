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
const { CLEANER, PARTNER, WITNESS, AFTER_THE_CLEAN, PACKAGE, DISMISSALS,
  DISMISSALS_TO_FEEL_IT, CLERK, DEPUTY }=await import('../dist/src/the-clean.js');
const { populationRecords }=await import('../dist/src/population.js');
const { objectiveTarget, OBJECTIVE_RULES }=await import('../dist/src/objective-target.js');
const { StoryProps }=await import('../dist/src/relics.js');
const { CharacterBody }=await import('../dist/src/physics.js');
const { roomPoint }=await import('../dist/src/characters.js');
const { conversationFor }=await import('../dist/src/conversations.js');
const { playChapterOne }=await import('./helpers/chapter-one.mjs');
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
  // Neither of them is in the silo to be walked up to: he is on the hill and
  // she has been at the foot of the tree since before the game started. This
  // used to assert the tag's spelling; what it is actually for is that they
  // are not standing in a room, so it asks the placement that question now.
  for(const who of [CLEANER,PARTNER]){
    assert.ok(RESIDENT_CAST.find(d=>d.id===who.id).absent,`${who.id} is not marked absent`);
    for(const level of [1,6,110,144])
      assert.ok(!populationRecords(level).some(r=>r.id===who.id),
        `${who.name} is standing about on level ${level}, and they are outside`);
  }
  // Mara is the opposite case and the one that was wrong: she is IN the
  // cafeteria, and Chapter One sends you to talk to her.
  assert.ok(!RESIDENT_CAST.find(d=>d.id===WITNESS.id).absent,'Mara is marked absent');
  assert.ok(populationRecords(1).some(r=>r.id===WITNESS.id),
    'Mara is not in the cafeteria — the chapter points at somebody who is not there');
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
  assert.equal(s.reachedSupply(),false,'the shift can be worked without the job');
  assert.equal(s.visible('package'),false);
  assert.equal(s.spokeToMara(),true);
  // A runner carries. Without the dispatch there is no shift, and without the
  // shift Supply has no reason to look anybody up.
  assert.equal(s.reachedSupply(),false,'the shift can be worked without the dispatch');
  assert.ok(s.take('dispatch'));
  assert.equal(s.destination.level,PACKAGE.level);
  assert.equal(s.reachedSupply(),true);
  assert.equal(s.chapter,'the-package');
  assert.equal(s.visible('package'),false,'the parcel is released before the job is done');
  assert.equal(s.deliverDispatch(),true);
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

test('the scene staging and the item agree on where Supply is',()=>{
 // the-clean.js cannot import story.js — story.js reaches THREE through
 // mementos.js and the writing is meant to load without a renderer — so the
 // two numbers the staging needs are restated there by hand. They used to be
 // a whole second copy of the item, blurb and all, and the copies drifted.
 // These are all that is left of that, and this is what keeps them honest: if
 // Supply ever moves, the clerk and the counter move with it.
 const parcel=COLLECTABLES.find(c=>c.id==='package');
 assert.equal(PACKAGE.level,parcel.level,'the clerk is staged on a different level from the parcel');
 assert.equal(PACKAGE.wing,parcel.wing,'the clerk is staged in a different wing from the parcel');
});

test('a Chapter One save comes back where it was left',()=>{
  const s=new Story('story');s.beginSearch();s.spokeToMara();
  s.askedAbout('marnes');s.askedAbout('billings');s.askedAbout('jahns');
  s.take('dispatch');
  const midRun=Story.load(JSON.parse(JSON.stringify(s.save())));
  assert.equal(midRun.chapter,'the-clean');
  assert.equal(midRun.hasFlag('mara-spoke'),true,'a reload forgets that Mara spoke');
  assert.equal(midRun.hasFlag('closed-ranks'),true,'a reload forgets who was asked');
  assert.equal(midRun.dismissalsHeard,3);
  assert.equal(midRun.has('dispatch'),true,'a reload loses the job you are carrying');
  assert.equal(midRun.destination.level,PACKAGE.level);
  s.reachedSupply();s.deliverDispatch();s.take('package');s.metTheDeputy(true);
  const after=Story.load(JSON.parse(JSON.stringify(s.save())));
  assert.equal(after.chapter,'clues');
  assert.equal(after.has('package'),true);
  assert.equal(after.hasFlag('dispatch-delivered'),true,'a reload forgets the shift was worked');
  assert.equal(after.hasFlag('deputy-met'),true,'a reload forgets the deputy');
  assert.equal(after.hasFlag('deputy-told'),true,'a reload forgets what was said to him');
});

// --- what makes the chapter worth playing -------------------------------
// The first version of Chapter One was five inputs: pick up a book, watch,
// click three times, travel, press Use. The structure was right and there was
// no game in it. These are the parts that were added to fix that, and each one
// is here because without it the chapter goes back to being an errand.

test('asking the room about the hand is four different people, and none of them explains it',()=>{
  assert.equal(DISMISSALS.length,4);
  const ids=new Set(DISMISSALS.map(d=>d.who));
  assert.equal(ids.size,4,'two of them are the same person');
  for(const d of DISMISSALS){
    const who=RESIDENT_CAST.find(r=>r.id===d.who);
    assert.ok(who,`${d.who} is not in the cast`);
    assert.ok(who.level<=110,`${d.who} is on ${who.level}, nowhere near the chapter`);
    assert.ok(d.ask.length>12&&d.reply.length>60&&d.close.length>20,`${d.who} has nothing to say`);
  }
  // Every answer has to be reasonable. Nobody is lying and nobody is hiding
  // anything — that is the whole point, and it is what makes it frightening.
  const all=DISMISSALS.map(d=>`${d.reply} ${d.close}`).join(' ').toLowerCase();
  for(const giveaway of ['signal','code','message','conspiracy','they know','cover'])
    assert.ok(!all.includes(giveaway),`a dismissal gives the game away: "${giveaway}"`);
  // And they do not all say the same thing.
  const openers=DISMISSALS.map(d=>d.reply.slice(0,18));
  assert.equal(new Set(openers).size,4,'the brush-offs are interchangeable');
});

test('asking three of them changes what the chapter says, and asking twice does not count twice',()=>{
  const s=new Story('story');s.beginSearch();s.spokeToMara();
  assert.equal(s.hasFlag('closed-ranks'),false);
  assert.equal(s.askedAbout('marnes'),1);
  assert.equal(s.askedAbout('marnes'),1,'asking the same person twice counted twice');
  assert.equal(s.askedAbout('billings'),2);
  assert.equal(s.hasFlag('closed-ranks'),false,`${DISMISSALS_TO_FEEL_IT - 1} people is enough`);
  assert.equal(s.askedAbout('jahns'),DISMISSALS_TO_FEEL_IT);
  assert.equal(s.hasFlag('closed-ranks'),true);
  s.take('dispatch');
  assert.match(s.objective,/Nobody in that room saw a thing/,
    'the chapter does not notice that the room closed ranks');
  // And it is optional: the chapter finishes without asking anybody.
  const quiet=new Story('story');quiet.beginSearch();quiet.spokeToMara();
  quiet.take('dispatch');quiet.reachedSupply();quiet.deliverDispatch();
  assert.ok(quiet.take('package'),'the chapter cannot be finished without asking around');
  assert.equal(quiet.hasFlag('closed-ranks'),false);
});

test('the parcel has to be earned: the dispatch is carried, handed over, and only then released',()=>{
  const s=new Story('story');s.beginSearch();s.spokeToMara();
  // You cannot work a shift you have not been given.
  assert.equal(s.reachedSupply(),false);
  assert.equal(s.visible('dispatch'),true,'the rack will not give out the job');
  assert.ok(s.take('dispatch'));
  assert.equal(s.visible('dispatch'),false,'the rack hands out a second one');
  // Arriving is not delivering.
  assert.equal(s.reachedSupply(),true);
  assert.equal(s.deliverDispatch(),true);
  assert.equal(s.deliverDispatch(),false,'the dispatch can be handed over twice');
  assert.equal(s.visible('package'),true);
  // The dispatch stays in the satchel afterwards — it is your stamped copy.
  assert.equal(s.has('dispatch'),true);
  // The clerk's lines are a person doing her job, not a lock.
  assert.equal(CLERK.hold.length,4);
  assert.ok(CLERK.hold.at(-1).beat>=1200,'she does not stop to think before the last of it');
  assert.match(CLERK.hold.map(b=>b.reply).join(' '),/REEVE|Reeve/,'she never reads the name out');
  assert.match(CLERK.hold.at(-1).reply,/forget/i,'she is not frightened by what she just read');
});

test('Chapter Two ends with somebody having noticed',()=>{
  const s=new Story('story');playChapterOne(s);
  assert.equal(s.hasFlag('parcel-taken'),true);
  assert.equal(s.hasFlag('deputy-met'),false);
  // Two answers, neither of them a fail state and neither of them safe.
  const branch=DEPUTY.beats.filter(b=>b.tell!==undefined);
  assert.equal(branch.length,2,'the deputy asks a question with only one answer');
  assert.ok(branch.some(b=>b.tell===true)&&branch.some(b=>b.tell===false));
  assert.match(DEPUTY.close,/notebook/,'he does not write anything down');
  const quiet=new Story('story');playChapterOne(quiet);
  assert.equal(quiet.metTheDeputy(false),true);
  assert.equal(quiet.hasFlag('deputy-met'),true);
  assert.equal(quiet.hasFlag('deputy-told'),false);
  const told=new Story('story');playChapterOne(told);
  assert.equal(told.metTheDeputy(true),true);
  assert.equal(told.hasFlag('deputy-told'),true,'telling him is not remembered');
  // He cannot appear before there is anything to notice.
  const early=new Story('story');early.beginSearch();
  assert.equal(early.metTheDeputy(true),false,'the deputy stops you before you have the parcel');
});

test('the runners’ rack is a real thing in the cafeteria you can walk up to',{timeout:120000},()=>{
  const world=new SiloWorld(new T.Scene());
  world.story=new Story('explore');
  world.setLevel(1);
  const rack=world.interactions.find(i=>i.action==='take-dispatch');
  assert.ok(rack,'there is no runners’ rack on Level 001');
  // It stands on its own feet rather than floating, and you cannot walk
  // through it — the Supply counter had that bug and this is the same shape.
  const room=world.loaded.get(1).rooms[0];
  const solid=(room.userData.solids||[]).find(s=>
    Math.hypot(s.x-33.2,s.z-26.6)<1&&s.y1>.8&&s.y1<1.1);
  assert.ok(solid,'the rack has no collider, so you can walk through it');
  assert.ok(rack.position.y-solid.y1>.1,'the prompt is inside the shelf');
});

test('the clerk and the deputy are people standing in the room',{timeout:300000},()=>{
 // They used to be two prompts floating at measured points on an empty floor:
 // you walked up to a bare Supply counter and a voice handed you a parcel, and
 // the deputy who is the whole last beat of Chapter Two was nobody at all.
 // They are residents now, placed at a station rather than dropped in the
 // middle of the room by the generic placement.
 const records=populationRecords(110);
 for(const [id,name] of [['delen',CLERK.name],['kell',DEPUTY.name]]){
  const r=records.find(x=>x.id===id);
  assert.ok(r,`${name} is not in the room at all — nobody is standing there`);
  assert.equal(r.definition.name,name,`${id} in the world is not the ${id} in the writing`);
  // The role is the same fact written twice — the speaker panel reads it from
  // the writing, the prompt over their head reads it from the cast — so they
  // have to say the same thing. Case and separators are presentation.
  const plain=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const written=id==='delen'?CLERK.role:DEPUTY.role;
  assert.equal(plain(r.definition.role),plain(written),
    `${id}'s posting reads "${r.definition.role}" in the world and "${written}" in the writing`);
 }
 // And they stand somewhere a person can stand: on the floor, not inside the
 // counter they serve from. The counter had no collider once and you could
 // walk through it; standing a body inside it is the same bug wearing a hat.
 const world=new SiloWorld(new T.Scene());
 world.setLevel(110);
 for(const d of world.doors)d.open=true;
 world.rebuildCollision();
 const y=world.destination(110).position.y;
 for(const id of ['delen','kell']){
  const r=records.find(x=>x.id===id),p=r.position.clone();
  const floor=world.colliders.floorAt(p.x,p.z,.3,y+.35);
  assert.ok(Number.isFinite(floor)&&Math.abs(floor-y)<.06,`${id} is not standing on the floor of 110`);
  const q=p.clone();q.y=y;const before=q.clone();
  world.colliders.resolve(q,.3,y+.01,y+1.75,.3);
  assert.ok(Math.hypot(q.x-before.x,q.z-before.z)<.05,`${id} is standing inside something solid`);
 }
});

test('the objective marks one person, and only while it is waiting on them',()=>{
 // The point of the mark is that everybody in the silo looks like everybody
 // else. The point of THIS test is that it goes out again: a dot that stays on
 // somebody you have already spoken to is a dot the player learns to ignore.
 const s=new Story('story');
 assert.equal(objectiveTarget(s),null,'somebody is marked during the opening');
 s.beginSearch();
 assert.equal(objectiveTarget(s),'mara','Chapter One does not point at the one other witness');
 s.spokeToMara();
 assert.equal(objectiveTarget(s),null,'Mara is still marked after she has said her piece');

 s.take('dispatch');s.reachedSupply();
 assert.equal(objectiveTarget(s),'delen','the counter you were sent to is not marked');
 s.deliverDispatch();
 assert.equal(objectiveTarget(s),'delen','she is not marked for the half where she stops you leaving');
 s.take('package');
 assert.equal(objectiveTarget(s),'kell','the man on the door is not marked once you have the parcel');
 s.metTheDeputy(true);
 assert.equal(objectiveTarget(s),null,'the deputy stays marked after the conversation is over');
});

test('free roam marks nobody',()=>{
 // No objective, no mark. The free-roam silo is a place to walk around in.
 assert.equal(objectiveTarget(new Story('free')),null);
 assert.equal(objectiveTarget(null),null);
 assert.equal(objectiveTarget({story:true}),null,'a story without the flags should mark nobody, not throw');
});

test('the dismissal is counted on its own topic, not on what the button happens to say',()=>{
  // It was counted by comparing the button's text to the written question.
  // renderChoices puts a numbered <kbd> inside every button, so the label read
  // back as "1Did you see what Reeve did at the end?" and never matched: you
  // could ask all four people and the chapter would not notice. Playing it in
  // a browser is what found that, so the shape of the fix is pinned here.
  const main=fs.readFileSync(path.join(import.meta.dirname,'..','dist','src','main.js'),'utf8');
  assert.ok(!/textContent===dismissal\.ask/.test(main),
    'the dismissal is counted by matching button text again');
  assert.match(main,/topic\?\.id==='the-hand'/,
    'nothing counts the dismissal when the topic is asked');
  // And the topic the conversation offers carries that id.
  assert.match(main,/id:'the-hand',label:dismissal\.ask/,
    'the dismissal topic does not carry the id the counter looks for');
});

test('the question about the hand is actually offered, to the right four people, at the right time',()=>{
  // main.js unshifts it onto whatever the conversation would otherwise show.
  // This builds the same topic list the panel renders, so "it is in the data"
  // and "it is on screen" cannot drift apart.
  const offered=(resident,story)=>{
    const base=conversationFor(resident,{cleaned:true,playerName:'',visits:0}).topics.map(t=>({...t}));
    const dismissal=story?.story&&story.chapterIndex<=2?DISMISSALS.find(d=>d.who===resident.id):null;
    if(dismissal&&!(dismissal.who===WITNESS.id&&!story.hasFlag('mara-spoke')))
      base.unshift({id:'the-hand',label:dismissal.ask,reply:dismissal.reply});
    return base;
  };
  const s=new Story('story');s.beginSearch();s.spokeToMara();
  for(const d of DISMISSALS){
    const who=RESIDENT_CAST.find(r=>r.id===d.who);
    const topics=offered(who,s);
    assert.equal(topics[0]?.id,'the-hand',`${d.who} is not asked about the hand, or it is buried`);
    assert.equal(topics[0].label,d.ask);
  }
  // Somebody who was not in the room is not asked.
  const walker=RESIDENT_CAST.find(r=>r.id==='walker');
  assert.ok(!offered(walker,s).some(t=>t.id==='the-hand'),'somebody on 144 is asked what they saw on 001');
  // Nor is anybody in Free Roam, or once the chapter is long past.
  assert.ok(!offered(RESIDENT_CAST.find(r=>r.id==='marnes'),new Story('explore')).some(t=>t.id==='the-hand'));
  const later=new Story('story');playChapterOne(later);
  later.setChapter('void-lead');later.setChapter('crowbar');later.setChapter('hideout');
  assert.ok(!offered(RESIDENT_CAST.find(r=>r.id==='marnes'),later).some(t=>t.id==='the-hand'),
    'people are still being asked about the hand three chapters later');
  // And Mara is not asked before she has said her piece.
  const fresh=new Story('story');fresh.beginSearch();
  assert.ok(!offered(RESIDENT_CAST.find(r=>r.id===WITNESS.id),fresh).some(t=>t.id==='the-hand'),
    'Mara is asked what the others think before she has spoken herself');
});
