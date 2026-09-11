import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as T from '../dist/vendor/three.module.js';
import { EFFECTS, Haptics } from '../dist/src/haptics.js';
import { REPAIR_COUNTER } from '../dist/src/environment-details.js';
import { COLLECTABLES } from '../dist/src/story.js';
import { SiloWorld } from '../dist/src/world.js';
globalThis.document??={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

// --- the watch -------------------------------------------------------------
// It could not be found in the bazaar, and the reason was not that it was
// hidden: it hung ten and a half centimetres above the counter it was supposed
// to be lying on, unlit, in the gap between two bolts of cloth.
test('the watch rests on the counter rather than floating over it',()=>{
  const watch=COLLECTABLES.find(c=>c.id==='watch');
  assert.deepEqual([watch.at[0],watch.at[2]],[REPAIR_COUNTER.x,REPAIR_COUNTER.z],
    'the watch and the space the bazaar clears for it have drifted apart');
  assert.equal(watch.at[1],REPAIR_COUNTER.top,'the watch is not resting on the mat');
  // The mat is felt on a counter, not a plinth.
  const felt=REPAIR_COUNTER.top-REPAIR_COUNTER.surface;
  assert.ok(felt>.005&&felt<.04,`${(felt*1000).toFixed(0)} mm of mat is not a mat`);
});

// The bazaar has to actually leave the space. The bolts of cloth are .44 wide
// on a .49 pitch, so without one of them missing there is nowhere to put it.
test('the textile counter has a clear space where the watch lies',async()=>{
  const {createMaterials}=await import('../dist/src/kit.js');
  const {buildBazaar}=await import('../dist/src/bazaar.js');
  const root=buildBazaar(createMaterials());
  root.updateMatrixWorld(true);
  const point=new T.Vector3(),near=[];
  root.traverse(o=>{
    if(!o.isMesh)return;
    const position=o.geometry.getAttribute('position');if(!position)return;
    const count=o.isInstancedMesh?o.count:1,matrix=new T.Matrix4();
    for(let n=0;n<count;n++){
      if(o.isInstancedMesh){o.getMatrixAt(n,matrix);matrix.premultiply(o.matrixWorld);}else matrix.copy(o.matrixWorld);
      for(let i=0;i<position.count;i++){
        point.fromBufferAttribute(position,i).applyMatrix4(matrix);
        // The watch's own volume, from just above the mat to a hand's height.
        if(Math.abs(point.x-REPAIR_COUNTER.x)>.17)continue;
        if(Math.abs(point.z-REPAIR_COUNTER.z)>.13)continue;
        if(point.y<REPAIR_COUNTER.top+.025||point.y>REPAIR_COUNTER.top+.30)continue;
        near.push([+point.x.toFixed(2),+point.y.toFixed(2),+point.z.toFixed(2)]);
      }
    }
  });
  assert.equal(near.length,0,`${near.length} vertices stand in the space the watch lies in, e.g. ${JSON.stringify(near[0])}`);
});

// --- the controller --------------------------------------------------------
// Every button used to do two things. R2 was sprint and fire, L1 was sprint
// and reload, and sprint was also on L3, so holding the trigger to run meant
// you could not stop running to shoot.
test('no pad button is asked to do two things at once',()=>{
  const source=fs.readFileSync(path.join(import.meta.dirname,'..','dist','src','main.js'),'utf8');
  const block=source.slice(source.indexOf('function readPad('),source.indexOf('function resize('));
  assert.ok(block.length>400,'the pad block is not where this test thinks it is');
  // Everything the pad reads, by button name, whether held or tapped.
  const uses=new Map();
  for(const m of block.matchAll(/(?:tapped|down)\(PAD\.([A-Z0-9]+)\)/g)){
    uses.set(m[1],(uses.get(m[1])||0)+1);
  }
  assert.ok(uses.size>=10,`only ${uses.size} buttons are mapped`);
  // Sprint is held, fire is tapped, and they are not the same button.
  assert.match(block,/pad\.run=down\(PAD\.L3\)/,'sprint is not on L3');
  assert.match(block,/pad\.aim=down\(PAD\.L2\)/,'aim is not on L2');
  assert.match(block,/tapped\(PAD\.R2\)\)fire\(\)/,'fire is not on R2');
  assert.match(block,/tapped\(PAD\.CROSS\)\)jumpQueued/,'jump is not on ✕');
  assert.match(block,/tapped\(PAD\.TRIANGLE\)\|\|tapped\(PAD\.R1\)\)use\(\)/,'interact is not on △');
  for(const held of ['L3','L2'])assert.ok(!new RegExp(`tapped\\(PAD\\.${held}\\)`).test(block),
    `${held} is both a held control and a tapped one`);
  for(const tapped of ['R2','CROSS','TRIANGLE'])assert.ok(!new RegExp(`down\\(PAD\\.${tapped}\\)`).test(block),
    `${tapped} is both a tapped control and a held one`);
});

test('the settings panel documents the map it actually implements',()=>{
  const html=fs.readFileSync(path.join(import.meta.dirname,'..','dist','index.html'),'utf8');
  const map=html.slice(html.indexOf('<dl class="pad-map">'),html.indexOf('</dl>',html.indexOf('<dl class="pad-map">')));
  assert.ok(map.length>200,'there is no controller map in Settings');
  for(const label of ['Left stick','L3','Right stick','R3','✕','△ / R1','□','○','L1','L2 / R2','Options'])
    assert.ok(map.includes(`<dt>${label}</dt>`),`the map does not mention ${label}`);
  assert.match(map,/L3<\/dt><dd>Sprint/,'the map does not say L3 sprints');
});

// --- vibration -------------------------------------------------------------
test('every effect is short, and none of them is silent',()=>{
  for(const [name,e] of Object.entries(EFFECTS)){
    assert.ok(e.duration>=20&&e.duration<=260,`${name} runs for ${e.duration} ms`);
    assert.ok(Math.max(e.strong,e.weak)>0,`${name} does nothing`);
    for(const k of ['strong','weak'])assert.ok(e[k]>=0&&e[k]<=1,`${name}.${k} is ${e[k]}`);
  }
});

test('vibration can be switched off, and holds off',()=>{
  const played=[];
  const pad={connected:true,vibrationActuator:{playEffect:(...a)=>{played.push(a);return Promise.resolve();}}};
  const h=new Haptics();h.attach(pad);
  assert.equal(h.play('pickup'),true);
  assert.equal(played.length,1);
  assert.equal(played[0][0],'dual-rumble');
  h.set(false);
  h.last=0;                                   // the rate limit is not what is being tested
  assert.equal(h.play('pickup'),false);
  assert.equal(played.length,1,'an effect played with vibration switched off');
});

test('one effect does not fire once a frame',()=>{
  const played=[];
  const pad={connected:true,vibrationActuator:{playEffect:()=>{played.push(1);return Promise.resolve();}}};
  const h=new Haptics();h.attach(pad);
  for(let i=0;i<20;i++)h.play('tick');        // twenty frames at 60fps is a third of a second
  assert.equal(played.length,1,`${played.length} pulses from twenty consecutive frames`);
});

test('a pad that cannot rumble falls back to the phone, and a phone that cannot either is not an error',()=>{
  const h=new Haptics();
  h.attach({connected:true});                  // no actuator of any kind
  const buzzed=[];
  const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  const set=v=>Object.defineProperty(globalThis,'navigator',{value:v,configurable:true,writable:true});
  try{
    set({vibrate:ms=>{buzzed.push(ms);return true;}});
    assert.equal(h.play('shot'),true);
    assert.equal(buzzed.length,1);
    assert.ok(buzzed[0]>=12,`a ${buzzed[0]} ms buzz is below what a phone motor can spin up for`);
    set({});
    h.last=0;
    assert.equal(h.play('shot'),false,'a device with no vibration at all reported success');
  }finally{
    if(original)Object.defineProperty(globalThis,'navigator',original);
  }
});

// --- how often a prompt is on the screen -----------------------------------
// The complaint was prompts covering the silo. They were offered inside a cone
// 71 degrees off the middle of the view at any range up to five metres, so a
// corridor of doors kept one on screen more or less permanently.
test('something has to be near the middle of the view before it offers itself',()=>{
  const world=new SiloWorld(new T.Scene());
  world.setLevel(1);
  const room=world.loaded.get(1).rooms[0];room.updateWorldMatrix(true,false);
  const spawn=world.spawn(1);
  // An open patch of the cafeteria floor, and a thing to reach for on it, so
  // the cone is what is measured and not the furniture.
  const centre=new T.Vector3(0,0,10).applyMatrix4(room.matrixWorld);
  const floor=world.colliders.floorAt(centre.x,centre.z,.3,spawn.y+2.2);
  assert.ok(Number.isFinite(floor),'no floor to stand on');
  const mark=new T.Vector3(centre.x,floor+1.1,centre.z);
  world.interactions.push({position:mark,label:'a thing on the floor',action:'test-mark'});

  const widest=range=>{
    const from=new T.Vector3(centre.x,floor+1.6,centre.z+range).applyMatrix4(new T.Matrix4());
    from.set(centre.x,floor+1.6,centre.z+range);
    const straight=mark.clone().sub(from).normalize();
    let out=-1;
    for(let deg=0;deg<=85;deg+=1){
      const dir=straight.clone().applyAxisAngle(new T.Vector3(0,1,0),deg*Math.PI/180);
      const hit=world.nearestInteraction(from,dir);
      if(hit?.action==='test-mark')out=deg;else if(out>=0)break;
    }
    return out;
  };
  const close=widest(.8),far=widest(4.4);
  assert.ok(close>=30,`at 0.8 m you have to be within ${close} degrees, which is too fussy up close`);
  assert.ok(far>=0&&far<=35,`at 4.4 m it still offers itself ${far} degrees off to the side`);
  assert.ok(close>far,`the cone does not close with distance (${close} near, ${far} far)`);
});
