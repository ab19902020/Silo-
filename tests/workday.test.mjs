import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {assignWorkday,workAt,JOBS} from '../dist/src/workday.js';
import {populationRecords,Population,CROWD_LIMITS} from '../dist/src/population.js';
import {deliveryRoute,sampleDelivery,PorterTraffic} from '../dist/src/porter-traffic.js';
import {SiloWorld} from '../dist/src/world.js';
import {CharacterBody} from '../dist/src/physics.js';
import {CHARACTERS} from '../dist/src/characters.js';
import {conversationFor} from '../dist/src/conversations.js';
import {siloSchedule} from '../dist/src/silo-time.js';
import {levelAt,levelY,landingPoint} from '../dist/src/data.js';
globalThis.document??={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('every resident, special-space worker and supplied character has a deterministic complete workday',()=>{
  let total=0;const starts=new Set();
  for(const level of [...Array.from({length:144},(_,i)=>i+1),'mines','generator'])for(const r of populationRecords(level)){
    total++;const roster=r.workday;assert.ok(JOBS[roster.job]);assert.equal(roster.timetable.length,8);assert.deepEqual(roster,assignWorkday(r));starts.add(roster.start);
    const phases=new Set();for(let h=0;h<24;h+=.1){const state=workAt(roster,h);assert.ok(state.task.length>5);phases.add(state.phase);}
    for(const phase of ['work','break','meal','errand','off-duty','rest'])assert.ok(phases.has(phase),`${r.id}: missing ${phase}`);
  }
  assert.ok(total>3000);assert.ok(starts.size>10,'everyone changes shift together');
  for(const character of CHARACTERS)assert.ok(JOBS[assignWorkday(character).job]);
});

test('a porter route reaches both counters continuously over the real treads in all three stair orientations',()=>{
  const world=new SiloWorld(new T.Scene()),traffic=new PorterTraffic(world.scene,world);let checked=0;
  for(const upper of [1,60,142]){
    const route=deliveryRoute(upper,Math.min(144,upper+2));let previous=null,active=null;const events=new Set();
    for(let t=0;t<route.duration;t+=.09){
      const s=sampleDelivery(route,t),p=s.position,n=levelAt(p.y);events.add(s.event);
      if(n!==active){world.setLevel(n);traffic.ensureCounters();active=n;}
      const floor=world.colliders.floorAt(p.x,p.z,.26,p.y+.3);
      assert.ok(Number.isFinite(floor)&&Math.abs(floor-p.y)<.23,`unsupported porter ${upper}/${t}: ${floor-p.y}`);
      assert.equal(world.colliders.contains(p.x,p.z,.26,p.y+.31,p.y+1.65),false,'route crosses a guard or counter');
      if(previous)assert.ok(previous.distanceTo(p)<.5,'porter teleports along route');previous=p;checked++;
    }
    assert.ok(events.has('collect')&&events.has('deliver'));
    const a=sampleDelivery(route,0).position,b=sampleDelivery(route,route.duration-.001).position;assert.ok(a.distanceTo(b)<.005);
  }
  assert.ok(checked>3000);
});

test('deliveries complete, leave a parcel, and a nearby porter survives a floor transition',()=>{
  const world=new SiloWorld(new T.Scene());world.setLevel(61);const traffic=new PorterTraffic(world.scene,world),r=traffic.records.find(r=>r.route.upper===61),body=new CharacterBody();
  const end=r.route.deliveryEnd;r.seconds=end-.08;body.position.copy(sampleDelivery(r.route,r.seconds).position).add(new T.Vector3(2,0,0));const schedule=siloSchedule(r.roster.start+1);
  traffic.update(.01,body,schedule);const a=traffic.actors.get(r.id);assert.ok(a);assert.ok(a.deliveryPack);traffic.update(.15,body,schedule);
  assert.equal(r.delivered,1);assert.ok(traffic.receipts.has(63));assert.equal(r.sample.loaded,false);
  world.setLevel(62);traffic.update(.01,body,schedule);assert.equal(traffic.actors.get(r.id),a,'a floor change replaced a nearby porter');
  world.setLevel(63);traffic.ensureCounters();assert.ok(world.loaded.get(63).dispatchCounters.some(s=>s.side<0&&s.counter.userData.parcel.visible));
  const before=r.seconds;traffic.update(.1,body,schedule,r.id);assert.equal(r.seconds,before,'talking porter walks away');
});

test('clock changes alter jobs and dialogue while named contacts stay available and crowd remains bounded',()=>{
  const world=new SiloWorld(new T.Scene());world.setLevel(144);const body=new CharacterBody();body.position.copy(world.spawn(144));const population=new Population(world.scene,world);
  population.schedule=siloSchedule(8.4);population.update(.01,body);
  const records=population.records.get(144),worker=records.find(r=>r.id==='walker');assert.ok(worker);
  population.schedule=siloSchedule(worker.workday.start+1);population.update(.01,body);const first=worker.currentWork;
  population.schedule=siloSchedule(worker.workday.start+4.4);population.update(.01,body);assert.equal(worker.currentWork.phase,'meal');assert.notEqual(first.task,worker.currentWork.task);
  const dialogue=conversationFor({...worker.definition,workday:worker.workday,currentWork:worker.currentWork});assert.ok(dialogue.topics.some(t=>t.id==='daily-work'&&t.reply.includes('Having a meal')));
  assert.ok(population.actors.has('walker'));assert.ok(population.count<=CROWD_LIMITS.balanced);
  assert.deepEqual(worker.home,worker.position,'a story contact was teleported to another department');
});

test('individual duties cover the departments and named residents keep their identity between visits',()=>{
  const roles=new Set(),assignments=new Set();
  for(let level=1;level<=144;level++)for(const r of populationRecords(level)){
    const w=r.workday;roles.add(w.specialty);
    assert.ok(w.tasks.length>=3&&w.tasks.every(t=>t.length>12));assert.ok(w.station&&w.personal.length===2);
    if(!r.definition){assert.ok(!assignments.has(w.assignment));assignments.add(w.assignment);}
    if(r.kind==='diner')assert.ok(['clerk','teacher','laundry'].includes(w.job),'seated table worker has an impossible job');
  }
  assert.ok(roles.size>=45,`only ${roles.size} responsibilities`);
  const a=populationRecords(1).find(r=>r.id==='jahns').workday,b=populationRecords(3).find(r=>r.id==='jahns').workday;
  assert.deepEqual(a,b,'the mayor has a different workday when visiting the cafeteria');
  assert.match(populationRecords(144).find(r=>r.id==='walker').workday.tasks.join(' '),/circuit|electronic/);
  assert.match(populationRecords(62).find(r=>r.id==='pete').workday.tasks.join(' '),/patient|clinic/);
});

test('table work produces activity, a meal changes props, and the opening interrupts the job',()=>{
  const world=new SiloWorld(new T.Scene());world.setLevel(1);const population=new Population(world.scene,world),body=new CharacterBody();population.load(1);
  const r=population.records.get(1).find(r=>r.seat);body.position.copy(r.position).add(new T.Vector3(1,0,0));population.schedule=siloSchedule(r.workday.start+1);
  for(let i=0;i<180;i++)population.update(.1,body);
  const a=population.actors.get(r.id);assert.ok(a);assert.ok(r.completedTasks>0);assert.ok(a.workTools[r.workday.tool].visible);assert.equal(a.pose,'sit');
  population.schedule=siloSchedule(r.workday.start+4.4);population.update(.1,body);assert.ok(a.workTools.cup.visible);assert.equal(r.currentWork.phase,'meal');
  population.schedule=siloSchedule(r.workday.start+1);const before=r.completedTasks;
  for(let i=0;i<180;i++)population.update(.1,body,true);
  assert.equal(r.completedTasks,before,'a resident keeps working during the cleaning');assert.ok(Object.values(a.workTools).every(p=>!p.visible));
});
