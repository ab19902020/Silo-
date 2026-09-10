import test from 'node:test';
import assert from 'node:assert/strict';
import { SiloClock, siloSchedule, formatClock, wrapHour, SHIFT_BELLS, DAY_LENGTH } from '../dist/src/silo-time.js';
import { AmbientDirector, EVENT_IDS } from '../dist/src/ambient-events.js';

// Both modules are arithmetic and scheduling, deliberately free of a renderer,
// an audio context and a DOM, so all of this runs on the real thing rather
// than on a description of it.

const CURVES=['lamp','warmth','crowd','meal','bustle','daylight'];

test('the schedule is a closed loop with nothing outside 0-1 anywhere on it',()=>{
  let previous=siloSchedule(0);
  for(let h=0;h<=24;h+=.01){
    const now=siloSchedule(h);
    for(const key of CURVES){
      assert.ok(Number.isFinite(now[key]),`${key} is not a number at ${h}`);
      assert.ok(now[key]>=0&&now[key]<=1,`${key} is ${now[key]} at ${h.toFixed(2)}`);
      // Continuity: no curve may jump between two adjacent hundredths of an
      // hour, or the lamps step instead of fading.
      assert.ok(Math.abs(now[key]-previous[key])<.02,`${key} jumps at ${h.toFixed(2)}`);
    }
    assert.ok(now.label&&typeof now.label==='string');
    previous=now;
  }
  // and midnight is not a seam
  for(const key of CURVES)assert.ok(Math.abs(siloSchedule(23.999)[key]-siloSchedule(.001)[key])<.02,`${key} jumps across midnight`);
  // negative and out-of-range hours wrap rather than clamp
  assert.deepEqual(siloSchedule(-1).clock,siloSchedule(23).clock);
  assert.deepEqual(siloSchedule(26).clock,siloSchedule(2).clock);
});

test('night is dark and empty, midday is lit and full, and there are three meals',()=>{
  const night=siloSchedule(2),noon=siloSchedule(12);
  assert.ok(night.lamp<.4&&night.crowd<.1,'the silo is awake in the middle of the night');
  assert.ok(night.lightsOut&&night.night);
  assert.ok(night.warmth>.9,'the night cycle is not warm');
  assert.ok(noon.lamp>.9&&noon.crowd>.7,'noon is dim and deserted');
  assert.ok(noon.warmth<.4,'the working day is amber');
  assert.ok(!noon.lightsOut);
  // The cafeteria fills three times a day and is empty between.
  const peaks=[7,12,19.5].map(h=>siloSchedule(h).meal);
  for(const meal of peaks)assert.ok(meal>.8,`a meal peak is only ${meal}`);
  for(const h of [3,10,15.5,23])assert.ok(siloSchedule(h).meal<.35,`the cafeteria is busy at ${h}`);
  // and the outside is dark at both ends of the day
  assert.ok(siloSchedule(3).daylight<.05&&siloSchedule(12).daylight>.9&&siloSchedule(22).daylight<.05);
});

test('the clock reads out in four digits',()=>{
  assert.equal(formatClock(0),'0000');
  assert.equal(formatClock(6.5),'0630');
  assert.equal(formatClock(13.25),'1315');
  assert.equal(formatClock(23.999),'0000');   // rounds up into the next day, not to 2400
  assert.equal(formatClock(-1),'2300');
  assert.equal(wrapHour(-1),23);
});

test('every bell rings once a day whatever the frame rate, and none is missed across midnight',()=>{
  for(const dt of [1/60,.25,2,11]){
    const clock=new SiloClock({hour:0});
    const rung=[];
    for(let elapsed=0;elapsed<DAY_LENGTH;elapsed+=dt)rung.push(...clock.update(dt));
    assert.deepEqual(rung,[...SHIFT_BELLS],`at dt=${dt} the bells rang ${rung.join(',')}`);
    assert.ok(Math.abs(clock.hour-0)<.2||Math.abs(clock.hour-24)<.2,`a day did not come back to midnight at dt=${dt}`);
  }
  // One long step over the small hours still catches the dawn bell exactly once.
  const late=new SiloClock({hour:23.9});
  assert.deepEqual(late.update(DAY_LENGTH*(6.2/24)),[6]);
  assert.ok(Math.abs(late.hour-6.1)<.01);
  assert.equal(late.days,1);
});

test('the clock can be stopped, and a step past a whole day rings nothing twice',()=>{
  const clock=new SiloClock({hour:5});
  clock.running=false;
  assert.deepEqual(clock.update(600),[]);
  assert.equal(clock.hour,5,'a stopped clock moved');
  clock.running=true;
  assert.deepEqual(clock.update(0),[]);
  assert.deepEqual(clock.update(-5),[]);
  assert.deepEqual(clock.update(NaN),[]);
  assert.equal(clock.hour,5);
  // A tab left in the background for an hour must not ring thirty bells.
  const skipped=clock.update(DAY_LENGTH*3);
  assert.deepEqual(skipped,[],'a multi-day step rang bells');
  assert.ok(clock.hour>=0&&clock.hour<24);
});

test('a saved clock comes back, and a forged one does not break the silo',()=>{
  const clock=new SiloClock({hour:13.75});clock.update(60);
  const back=SiloClock.load(JSON.parse(JSON.stringify(clock.save())));
  assert.ok(Math.abs(back.hour-clock.hour)<1e-9);
  assert.equal(back.days,clock.days);
  for(const saved of [null,undefined,'0700',42,{hour:'noon'},{hour:NaN},{hour:1/0},{days:-9}]){
    const loaded=SiloClock.load(saved);
    assert.ok(loaded.hour>=0&&loaded.hour<24,`a forged save produced hour ${loaded.hour}`);
    assert.ok(Number.isInteger(loaded.days)&&loaded.days>=0);
    assert.ok(CURVES.every(key=>Number.isFinite(loaded.schedule[key])));
  }
});

// --- the director -------------------------------------------------------

const run=(director,context,seconds=4000,dt=.5)=>{
  const fired=[];
  for(let t=0;t<seconds;t+=dt)fired.push(...director.update(dt,context));
  return fired;
};

test('the director only emits sounds the audio module knows how to make',()=>{
  const places=['cafeteria','residential','mechanical','mines','water','workshop','bazaar','farm','tunnel','generator','airlock','it'];
  for(const place of places){
    const fired=run(new AmbientDirector({seed:place.length*7919}),{place,crowd:.7,bustle:.8},2000);
    assert.ok(fired.length>4,`${place} made no sound at all in half an hour`);
    for(const event of fired){
      assert.ok(EVENT_IDS.includes(event.id),`${place} asked for "${event.id}"`);
      assert.ok(Number.isFinite(event.gain)&&event.gain>0&&event.gain<.2,`${event.id} gain ${event.gain}`);
      assert.ok(Number.isFinite(event.pan)&&Math.abs(event.pan)<=1);
      assert.ok(Number.isFinite(event.send)&&event.send>=0);
    }
  }
});

test('nobody drops a spanner at three in the morning',()=>{
  const day=run(new AmbientDirector({seed:5}),{place:'mechanical',crowd:.8,bustle:.9});
  const night=run(new AmbientDirector({seed:5}),{place:'mechanical',crowd:.04,bustle:.10});
  assert.ok(night.length>0,'the silo went completely silent at night');
  assert.ok(night.length*3<day.length,`night fired ${night.length} against the day's ${day.length}`);
  for(const event of night)
    assert.ok(!['cough','chairs','pa','drop'].includes(event.id),`"${event.id}" at night`);
  assert.ok(day.some(e=>e.id==='drop'||e.id==='clank'),'the day shift is not working');
});

test('an empty room has nobody coughing in it, and the tannoy sleeps',()=>{
  const empty=run(new AmbientDirector({seed:11}),{place:'cafeteria',crowd:.05,bustle:.6});
  for(const event of empty)assert.ok(event.id!=='cough'&&event.id!=='chairs',`"${event.id}" in an empty cafeteria`);
  const quiet=run(new AmbientDirector({seed:12}),{place:'cafeteria',crowd:.8,bustle:.3});
  for(const event of quiet)assert.ok(event.id!=='pa','the tannoy is on at night');
});

test('the stairwell is where the silo is audible: it carries feet from other floors',()=>{
  const fired=run(new AmbientDirector({seed:3}),{place:'residential',inShaft:true,crowd:.7,bustle:.85});
  const steps=fired.filter(e=>e.id==='steps-above'||e.id==='steps-below');
  assert.ok(steps.length>3,`only ${steps.length} sets of footsteps in an hour on the stairs`);
  assert.ok(steps.some(e=>e.id==='steps-above')&&steps.some(e=>e.id==='steps-below'),'everyone is walking the same way');
  for(const run_ of steps){
    assert.ok(run_.steps>=3&&run_.steps<=8,`${run_.steps} steps is a stumble, not a flight`);
    assert.ok(run_.distance>=1&&run_.distance<=4);
    assert.ok(run_.interval>.3&&run_.interval<.5,'that is a sprint or a limp');
    assert.ok(run_.muffle>0,'footsteps four floors up arrive with their top end intact');
    // Further away is quieter. Nothing else about the sound has to change,
    // but this does, or distance means nothing.
    assert.ok(run_.gain<.055/(1+run_.distance*.5)+.001);
  }
  // Off the stairs, nothing walks past on another floor.
  const room=run(new AmbientDirector({seed:3}),{place:'residential',inShaft:false,crowd:.7,bustle:.85});
  assert.ok(!room.some(e=>e.id.startsWith('steps-')),'footsteps on the stairs heard from inside a flat');
});

test('the same sound never lands twice running, and silence is silent',()=>{
  const fired=run(new AmbientDirector({seed:99}),{place:'water',crowd:.6,bustle:.8},6000);
  let repeats=0;
  for(let i=1;i<fired.length;i++)if(fired[i].id===fired[i-1].id)repeats++;
  assert.ok(repeats/fired.length<.2,`${repeats} of ${fired.length} events repeated the one before`);

  const director=new AmbientDirector({seed:1});
  assert.deepEqual(run(director,{place:'cafeteria',crowd:.8,bustle:.9,silent:true},3000),[],'the cleaning was not silent');
  // and it picks straight back up afterwards
  assert.ok(run(director,{place:'cafeteria',crowd:.8,bustle:.9},600).length>0);
  // The surface has the wind and needs nothing else banging about on it.
  assert.deepEqual(run(new AmbientDirector({seed:2}),{place:'surface',crowd:.2,bustle:.5},3000),[]);
});

// --- and the silo actually obeys it -------------------------------------
// The two modules above are only worth having if the world reads them. These
// run the real SiloWorld and the real Population against the real schedule.
import * as THREE from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { Population } from '../dist/src/population.js';
import { levelY } from '../dist/src/data.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('the fixtures dim and go amber on the night cycle, and come back in the morning',()=>{
  const world=new SiloWorld(new THREE.Scene());world.setLevel(26);
  const at=new THREE.Vector3(53.6,levelY(26),0);
  const settle=hour=>{
    world.schedule=hour===null?null:siloSchedule(hour);
    for(let frame=0;frame<150;frame++)world.update(1/60,at);
    const lamps=world.localLights.filter(l=>l.visible);
    const warmth=lamps.length?lamps.reduce((total,l)=>total+(l.color.r-l.color.b),0)/lamps.length:0;
    return {lit:lamps.reduce((total,l)=>total+l.intensity,0),key:world.keyLight.intensity,ambient:world.ambient.intensity,warmth,lamps:lamps.length};
  };
  const noon=settle(12),night=settle(2),morning=settle(9);
  assert.ok(noon.lit>0&&noon.lamps>0,'nobody turned the lights on at noon');
  // Half brightness at the fixture is not half a room — pale concrete, evenly
  // spaced lamps and an ACES shoulder ate most of the first attempt, and a
  // gallery at "half" still read as the afternoon. These are the numbers that
  // actually make it look like two in the morning.
  assert.ok(night.lit<noon.lit*.55,`night burns ${night.lit.toFixed(0)} against noon's ${noon.lit.toFixed(0)}`);
  assert.ok(night.key<noon.key*.55,'the shadow caster ignores the hour');
  // The fill has to fall faster than the fixtures, or the room dims evenly and
  // no dark ever appears between the lamps. That contrast is what reads.
  assert.ok(night.ambient<noon.ambient*.30,'the ambient fill does not fall faster than the fixtures');
  assert.ok(night.ambient/noon.ambient<night.lit/noon.lit,'the fill and the fixtures fall together');
  assert.ok(night.warmth>noon.warmth+.02,'the night cycle is not warmer than the working day');
  // and it is a cycle, not a decay: the morning comes back up.
  assert.ok(morning.lit>night.lit*1.3&&Math.abs(morning.lit-noon.lit)<noon.lit*.25,'the lamps never recover');
  // With no clock at all the fixtures are exactly the tone every other test
  // in this repo asserts they are — an unscheduled silo is not a tinted one.
  const unscheduled=settle(null);
  assert.equal(unscheduled.warmth.toFixed(4),(new THREE.Color(0xe6ddc9).r-new THREE.Color(0xe6ddc9).b).toFixed(4));
  // The view out follows the same clock rather than a second sun of its own.
  world.schedule=siloSchedule(2);world.update(1/60,at);
  assert.equal(world.surface.sky.scheduledDay,siloSchedule(2).daylight);
});

test('the galleries empty at night and fill again by the middle of the day',()=>{
  const world=new SiloWorld(new THREE.Scene());world.setLevel(26);
  const body=new CharacterBody();body.position.set(53.6,levelY(26),0);
  world.update(0,body.position);
  const population=new Population(world.scene,world);
  const count=hour=>{population.schedule=siloSchedule(hour);population.rebalance=0;population.update(.9,body);return population.count;};
  const noon=count(12),night=count(2);
  assert.ok(noon>12,`only ${noon} people about at midday`);
  assert.ok(night<noon*.62,`${night} people still out at two in the morning against ${noon} at noon`);
  assert.ok(night>=6,'the silo emptied completely; there is always somebody on shift');
  // Returns to a full gallery rather than staying emptied.
  assert.ok(count(12)>night*1.4,'the crowd never came back');
  // No schedule means no opinion: the crowd is whatever the quality budget says.
  population.schedule=null;population.rebalance=0;population.update(.9,body);
  assert.ok(population.count>=noon,'an unscheduled silo is quieter than a scheduled noon');
});
