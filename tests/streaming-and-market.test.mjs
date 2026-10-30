import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { Population, populationRecords } from '../dist/src/population.js';
import { CharacterBody } from '../dist/src/physics.js';
import { roomPoint } from '../dist/src/characters.js';
import { levelY } from '../dist/src/data.js';
globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

// --- building a floor without dropping the frame ---------------------------
// A level is six rooms, a set of doors and a dozen canvas-drawn signs: twenty
// to thirty milliseconds of work, and it used to happen inside the one frame
// in which you crossed the floor. The whole frame budget at sixty a second is
// 16.7 ms, so every flight of stairs cost two or three dropped frames.

test('arriving on a floor builds that floor and only queues its neighbours',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(60);
  assert.ok(world.loaded.has(60),'the level you are standing on was not built');
  for(const n of [59,61]){
    assert.ok(!world.loaded.has(n),`level ${n} was built during the transition instead of queued`);
    assert.ok(world.pending.has(n),`level ${n} was neither built nor queued`);
  }
});

test('a half-built floor is in neither the world nor the scene',()=>{
  const scene=new T.Scene(),world=new SiloWorld(scene);
  world.setLevel(60);
  const before=scene.children.length;
  const steps=world.pending.get(61);
  steps.next();steps.next();                        // two wings in, nowhere near done
  assert.ok(!world.loaded.has(61),'a partly built level joined the world');
  assert.equal(scene.children.length,before,'a partly built level was added to the scene');
});

test('the queue finishes a floor, and it comes out the same as building it outright',()=>{
  const a=new SiloWorld(new T.Scene());a.setLevel(60);
  while(a.pending.size)a.buildAhead(1000);
  const b=new SiloWorld(new T.Scene());
  const direct=b.loadLevel(61);
  const queued=a.loaded.get(61);
  assert.ok(queued,'the queue never finished');
  for(const key of ['rooms','doors','interactions'])
    assert.equal(queued[key].length,direct[key].length,`${key} differ between a queued and a direct build`);
  assert.equal(queued.root.position.y,levelY(61));
  // and the finished level is in the lists the player interacts through
  assert.ok(a.doors.some(d=>d.level===61),'a finished level never reached the door list');
});

test('walking down a flight builds nothing in the frame you cross in',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(60);
  while(world.pending.size)world.buildAhead(1000);   // the frames on the way down
  let built=0;
  const real=world.buildLevel.bind(world);
  world.buildLevel=function*(level){built++;yield*real(level);};
  world.setLevel(61);                                 // cross the floor
  assert.equal(built,0,`${built} levels were built synchronously as the floor was crossed`);
  assert.ok(world.loaded.has(61),'the level walked into was not ready');
});

test('a budget of nothing does nothing, and the queue is dropped when you walk away from it',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(60);
  const queued=world.pending.size;
  assert.ok(queued>0,'nothing was queued to begin with');
  world.buildAhead(0);
  assert.equal(world.pending.size,queued,'work happened on a zero budget');
  world.setLevel(100);                                // a lift, not a staircase
  for(const n of world.pending.keys())assert.ok(Math.abs(n-100)<=2,`level ${n} is still queued from three floors away`);
});

// --- the market ------------------------------------------------------------
// The bazaar had sixteen people arranged in a four-by-four grid, every one of
// them standing on the spot. Over two and a half minutes, seventeen of the
// eighteen people on that level moved a total of zero metres.

test('everyone in the bazaar has somewhere to be',()=>{
  const market=populationRecords(100).filter(r=>['trader','shopper','bazaar'].includes(r.kind));
  assert.ok(market.length>=16,`only ${market.length} people in the whole market`);
  const traders=market.filter(r=>r.kind==='trader');
  assert.equal(traders.length,6,'there are six shops and they each need somebody in them');
  for(const r of market){
    assert.ok(r.stops?.length>=3,`${r.kind} ${r.id} has ${r.stops?.length||0} stops, which is not a routine`);
    // A routine that never leaves one spot is standing still with extra steps.
    const spread=Math.max(...r.stops.map(a=>Math.max(...r.stops.map(b=>a.p.distanceTo(b.p)))));
    assert.ok(spread>1.2,`${r.kind} ${r.id} covers ${spread.toFixed(2)} m — that is a shuffle, not a routine`);
  }
  // Somebody is being served at each of the six counters.
  const shoppers=market.filter(r=>r.kind==='shopper');
  assert.ok(shoppers.length>=6,`${shoppers.length} shoppers cannot keep six stalls busy`);
});

test('every stall, and every route into one, is somewhere a body can actually stand',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(100);
  const population=new Population(world.scene,world);
  population.load(100);
  const placed=population.records.get(100);
  const raw=populationRecords(100);
  assert.equal(placed.length,raw.length,'the colliders rejected somebody the market needs');
  const stops=r=>r.stops?.length||0;
  assert.equal(placed.reduce((n,r)=>n+stops(r),0),raw.reduce((n,r)=>n+stops(r),0),
    'a stop was dropped for being inside something');
  // The traders stand at their own counters, not in the street.
  for(const r of placed.filter(r=>r.kind==='trader')){
    const local=r.home.clone().sub(new T.Vector3(0,levelY(100),0));
    const x=-local.z;                                  // wing 0 maps local x to world -z
    assert.ok(Math.abs(x)>3.6,`a trader is standing in the street at x=${x.toFixed(1)}`);
  }
});

test('nobody in the bazaar spends the day standing on one spot',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(100);
  const population=new Population(world.scene,world);
  population.schedule={crowd:1,bustle:1};
  const stand=roomPoint(100,0,0,12),floor=world.spawn(100).y;
  const body=new CharacterBody({radius:.3,standHeight:1.78,stepHeight:.3});
  body.teleport(stand.x,floor,stand.z);
  population.update(1/60,body,false,null);
  const last=new Map(),walked=new Map();
  for(const [id,a] of population.actors){last.set(id,a.root.position.clone());walked.set(id,0);}
  for(let f=0;f<40*60;f++){
    population.update(1/60,body,false,null);
    for(const [id,a] of population.actors){
      const l=last.get(id);
      if(!l){last.set(id,a.root.position.clone());walked.set(id,0);continue;}
      walked.set(id,(walked.get(id)||0)+a.root.position.distanceTo(l));l.copy(a.root.position);
    }
  }
  const market=[...population.actors].filter(([,a])=>['trader','shopper','bazaar'].includes(a.record.kind));
  assert.ok(market.length>=12,`only ${market.length} market people were kept alive`);
  const still=market.filter(([id])=>(walked.get(id)||0)<1);
  assert.equal(still.length,0,`${still.length} of ${market.length} market people never moved in forty seconds`);
  const shoppers=market.filter(([,a])=>a.record.kind==='shopper').map(([id])=>walked.get(id)||0);
  const median=shoppers.sort((a,b)=>a-b)[Math.floor(shoppers.length/2)];
  assert.ok(median>8,`the median shopper covered ${median.toFixed(1)} m in forty seconds`);
});
