import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as T from '../dist/vendor/three.module.js';
import {rules,evaluate,resolve as resolveIn,stylesheet} from './helpers/css-cascade.mjs';
import { Story, COLLECTABLES, RELICS, CHAPTERS } from '../dist/src/story.js';
import { GeorgeTerminal, KEY } from '../dist/src/george-terminal.js';
import { SiloWorld } from '../dist/src/world.js';
import { StoryProps } from '../dist/src/relics.js';
import { CharacterBody } from '../dist/src/physics.js';
import { DRIVE_BAY, GEORGE_TERMINAL_POINT } from '../dist/src/mystery-spaces.js';
globalThis.document={createElement:()=>({width:0,height:0,style:{},getContext:()=>({fillRect(){},strokeRect(){},fillText(){},measureText:()=>({width:10})})})};

// The whole run, end to end, in the world the player actually walks.
//
// Every other test here checks one thing in isolation: the story graph on its
// own, one relic's clearance on its own, the terminal's state machine on its
// own. None of them would notice a chapter that advances but sends you at a
// prompt the game will not offer, and that is the failure a player meets.
//
// So this drives the real Story through the real SiloWorld with a real
// CharacterBody: plan a route over the floor the colliders report, walk it,
// look at the thing, and require the game to offer exactly that. If a beat
// here cannot be completed, the run is not completable.

// --- getting about -------------------------------------------------------
// Straight-line steering walks into walls, and the deck is an annulus with a
// hole in the middle, so "head towards it" is not navigation.
function walker(world,body){
  const step=1/120;
  const drive=(target,seconds,tol)=>{
    for(let i=0;i<seconds*120;i++){
      const v=target.clone().sub(body.position);v.y=0;
      if(v.length()<tol)return true;
      body.step(step,v.normalize().multiplyScalar(3.2),world.colliders);
      if(i%8===0)world.update(step*8,body.position);
    }
    return false;
  };
  const standable=(x,z,y)=>{
    const floor=world.colliders.floorAt(x,z,.32,y+1.2);
    if(!Number.isFinite(floor)||Math.abs(floor-y)>1.3)return false;
    return !world.colliders.contains(x,z,.32,floor+.25,floor+1.6);
  };
  // Breadth-first over a half-metre grid, body to target.
  const plan=target=>{
    const cell=.5,y=body.position.y,ox=body.position.x,oz=body.position.z;
    const limit=Math.ceil((body.position.distanceTo(target)+30)/cell);
    const key=(i,j)=>i*100000+j,at=(i,j)=>new T.Vector3(ox+i*cell,y,oz+j*cell);
    const ti=Math.round((target.x-ox)/cell),tj=Math.round((target.z-oz)/cell);
    const from=new Map([[key(0,0),null]]);
    let edge=[[0,0]];
    while(edge.length){
      const next=[];
      for(const [i,j] of edge){
        if(Math.hypot(i-ti,j-tj)*cell<=1.7){
          const path=[];let c=[i,j];
          while(c){path.unshift(at(c[0],c[1]));c=from.get(key(c[0],c[1]));}
          return path;
        }
        for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
          const ni=i+di,nj=j+dj,nk=key(ni,nj);
          if(from.has(nk)||Math.abs(ni)>limit||Math.abs(nj)>limit)continue;
          const p=at(ni,nj);
          if(!standable(p.x,p.z,y)){from.set(nk,undefined);continue;}
          from.set(nk,[i,j]);next.push([ni,nj]);
        }
      }
      edge=next;
    }
    return null;
  };
  return {plan,walkTo(target,{doors=true}={}){
    if(doors){for(const d of world.doors)if(d.level===world.activeLevel)d.open=true;
      for(let i=0;i<150;i++)world.update(1/60,body.position);world.rebuildCollision();}
    const path=plan(target);
    if(!path)return null;
    for(let i=0;i<path.length;i++){
      const p=path[i].clone();p.y=body.position.y;
      if(i<path.length-1&&p.distanceTo(body.position)<.6)continue;
      drive(p,8,i===path.length-1?.45:.6);
    }
    // The plan stops on the last cell a body fits in; a player then walks the
    // final stride straight at the thing and stops when it stops them.
    drive(target,4,.45);
    return Math.hypot(body.position.x-target.x,body.position.z-target.z);
  }};
}

function harness(){
  const scene=new T.Scene(),world=new SiloWorld(scene),story=new Story('story');
  world.story=story;
  const props=new StoryProps(scene,world.m);
  const body=new CharacterBody({radius:.3,stepHeight:.35});
  const nav=walker(world,body);
  const go=id=>{
    const d=world.destination(id);
    world.setLevel(d.level,d.special??null);
    body.teleport(d.position.x,d.position.y+.1,d.position.z);
    for(let i=0;i<150;i++)world.update(1/60,body.position);
    world.rebuildCollision();
  };
  // The pool main.js assembles every frame.
  const offer=target=>{
    world.actorInteractions=[];
    props.update(1/60,0,story,world.activeLevel,world.special);
    world.actorInteractions.push(...props.interactions(story,world.activeLevel,world.special));
    const eye=body.position.clone();eye.y+=body.eyeHeight;
    return world.nearestInteraction(eye,target.clone().sub(eye).normalize());
  };
  // Walk at it and require the game to hand you exactly that.
  const reach=(target,action,{doors=true}={})=>{
    const gap=nav.walkTo(target,{doors});
    assert.notEqual(gap,null,`no walkable route to ${action}`);
    assert.ok(gap<4.6,`${action}: walked at it and stopped ${gap.toFixed(2)} m short, outside the game's own five-metre reach`);
    const found=offer(target);
    assert.ok(found,`${action}: standing ${gap.toFixed(2)} m away looking straight at it, nothing was offered`);
    assert.equal(found.action,action,`${action}: got "${found.label}" (${found.action||'a door'}) instead`);
    return found;
  };
  const relicPoint=item=>{
    const room=world.loaded.get(item.level).rooms[item.wing];room.updateWorldMatrix(true,false);
    return new T.Vector3(...item.at).applyMatrix4(room.matrixWorld);
  };
  const collect=id=>{
    const item=COLLECTABLES.find(c=>c.id===id);
    go(item.level);
    assert.ok(story.visible(id),`${id} is not offered in chapter "${story.chapter}"`);
    reach(relicPoint(item),`relic:${id}`);
    assert.ok(story.take(id),`take(${id}) refused`);
  };
  return {world,story,props,body,go,offer,reach,collect,relicPoint};
}

test('the whole run walks: every relic collected, every chapter entered, out onto the hill',{timeout:900000},()=>{
  const h=harness(),{world,story}=h;

  // 1 · the cleaning. Nothing is collectable until the book is read.
  h.go(1);
  assert.equal(story.chapter,'cleaning');
  for(const item of COLLECTABLES)assert.equal(story.visible(item.id),false,`${item.id} is collectable before the book is read`);
  story.beginSearch();
  assert.equal(story.chapter,'clues');

  // 2 · the duck on the bar, and 3 · the watch on the trader's counter.
  h.collect('pez');
  h.collect('watch');
  assert.equal(story.chapter,'void-lead');

  // 4 · the bulkhead in the rear service gallery of Mechanical.
  h.go(144);
  const breach=world.interactions.find(i=>i.action==='breach');
  assert.ok(breach,'there is no bulkhead on 144');
  h.reach(breach.position.clone(),'breach');
  assert.equal(story.inspectVoidDoor().needs,'crowbar');

  // 5 · the crowbar on the bench, 6 · back to the bulkhead with it.
  h.collect('crowbar');
  assert.equal(story.chapter,'hideout');
  h.go(144);
  h.reach(world.interactions.find(i=>i.action==='breach').position.clone(),'breach');
  assert.equal(story.pryHideout(),true,'the crowbar would not open the bulkhead');
  for(const id of ['tunnel','excavator'])
    assert.equal(story.travelAllowed(id),null,`${id} is still refused with the bulkhead open`);

  // the hard drive, which the character cast places rather than StoryProps.
  h.go('excavator');
  assert.equal(world.special,'excavator');
  const drive=new T.Vector3(68.5,12.92,6.6);
  assert.ok(story.visible('harddrive'));
  world.actorInteractions=[{position:drive.clone(),label:'Take Hard Drive 18',action:'hard-drive'}];
  const toDrive=walker(world,h.body).walkTo(drive,{doors:false});
  assert.notEqual(toDrive,null,'no walkable route to the drive in the hideout');
  assert.ok(toDrive<4.6,`the drive is ${toDrive.toFixed(2)} m out of reach`);
  story.take('harddrive');
  assert.equal(story.chapter,'george-home');

  // 7 · George's room. The seal lifts, and the machine and its bay are both there.
  h.go(68);
  assert.equal(story.sealed(68,0,'residential'),null,'the residence is still sealed');
  h.reach(world.interactions.find(i=>i.action==='george-terminal').position.clone(),'george-terminal');
  assert.equal(story.reachGeorgeHome(),true);
  h.reach(world.interactions.find(i=>i.action==='drive-bay').position.clone(),'drive-bay');

  // 8 · the machine: drive in, boot, search, open the sheet.
  const terminal=new GeorgeTerminal();
  assert.equal(terminal.insertDrive(false),false);
  assert.equal(terminal.insertDrive(story.has('harddrive')),true);
  terminal.boot();
  terminal.search(KEY);
  const found=terminal.view.rows.find(r=>r.concealed);
  assert.ok(found,`searching "${KEY}" reveals nothing`);
  terminal.open(found.id);
  const sheet=terminal.view.rows.find(r=>/SCHEMATIC/i.test(r.name));
  assert.ok(sheet,'the concealed volume has no schematic on it');
  terminal.open(sheet.id);
  assert.ok(terminal.view.blueprint,'opening the schematic does not draw it');
  assert.equal(story.terminalDiscovered(),true);
  assert.equal(story.chapter,'pipe-tools');

  // 9 · the capping kit, 10 · the line itself.
  h.collect('pipekit');
  assert.equal(story.chapter,'pipe');
  assert.equal(story.travelAllowed('pipe-gallery'),null,'the gallery is still refused with the schematic read');
  h.go('mines');
  assert.ok(world.specialSpace().interactions.some(i=>i.destination==='pipe-gallery'),
    'there is no hatch from the ore workings to the gallery');
  h.go('pipe-gallery');
  for(const [action,step] of [['pipe-cover',null],['pipe-isolate','isolate'],['pipe-collar','collar'],['pipe-torque','torque']]){
    const point=world.specialSpace().interactions.find(i=>i.action===action);
    assert.ok(point,`there is no ${action} point in the gallery`);
    h.reach(new T.Vector3(...point.position),action,{doors:false});
    const result=step?story.capPipe(step):{complete:story.openPipeCover()};
    assert.ok(!result.message,`${action}: ${result.message}`);
    world.pressure.update(story);
  }
  assert.equal(story.hasFlag('pipe-capped'),true);
  assert.equal(story.chapter,'billings');

  // 11 · Billings wants the book first.
  assert.equal(story.chapterInfo.where.level,62,'the objective does not send you for the book');
  h.collect('georgia');
  assert.equal(story.chapterInfo.where.level,1,'with the book in hand the objective does not point at the station');
  assert.equal(story.speakToBillings().helped,true);

  // 12 · the shotgun comes across the desk, the suit off Supply's floor.
  assert.ok(story.take('shotgun'),'Billings released nothing');
  assert.equal(story.chapter,'escape-kit');
  assert.equal(story.sealed(144,3,'supply'),null,'Supply is still sealed');
  h.collect('suit');
  assert.equal(story.chapter,'airlock');

  // 13 · out, and 14 · the thing over the ridge.
  h.go('airlock');
  assert.ok(world.interactions.some(i=>i.action==='airlock-inner'),'no inner airlock control');
  assert.ok(world.interactions.some(i=>i.action==='airlock-outer'),'no outer airlock control');
  assert.equal(story.steppedOutside()?.drone,true,'nothing came over the crest');
  assert.equal(story.droneKilled(),true);
  assert.equal(story.complete,true);
  for(const id of ['surface','silo17','silo17-surface'])
    assert.equal(story.travelAllowed(id),null,`${id} is still refused after the ending`);

  assert.equal(story.relicsHeld,RELICS.length,'the run finished without all four relics');
  assert.equal(story.held.size,COLLECTABLES.length,'the run finished without every collectable');
  assert.equal(story.chapterIndex,CHAPTERS.length-1);
});

// --- being told where to go ----------------------------------------------
// Reading the schematic used to leave you with "follow the red line past the
// mine drill": true, but it named no floor, and the route it meant is an 82 m
// walk through a mine network from the arrival gallery. Every chapter that
// asks you to go somewhere now names the floor in words, and the directory's
// own "take me there" button goes rather than filtering a list.
test('every objective that sends you somewhere says which floor, in the objective itself',()=>{
  const s=new Story('story');
  for(const chapter of CHAPTERS){
    s.chapter=chapter.id;
    const where=s.destination;
    if(!where)continue;
    const number=String(where.level).padStart(3,'0');
    const text=`${s.objective} ${where.place}`;
    assert.match(text,new RegExp(`${number}|Level\\s*${where.level}\\b`,'i'),
      `chapter ${chapter.id} sends you to level ${where.level} without saying so: "${s.objective}"`);
  }
});

test('the gas line names its floor and the directory can travel straight to it',()=>{
  const s=new Story('story');
  s.beginSearch();s.take('georgia');s.take('watch');s.inspectVoidDoor();s.take('crowbar');
  s.pryHideout();s.take('harddrive');s.reachGeorgeHome();
  assert.equal(s.chapter,'terminal');
  assert.equal(s.terminalDiscovered(),true);
  assert.equal(s.chapter,'pipe-tools');
  assert.match(s.objective,/055/,'the kit chapter does not name Water Filtration’s floor');
  s.take('pipekit');
  assert.equal(s.chapter,'pipe');
  assert.match(s.objective,/144/,'the pipe chapter does not tell you what floor the line is on');
  const where=s.destination;
  assert.equal(where.special,'pipe-gallery','the pipe chapter does not point at a place the directory can travel to');
  assert.equal(where.level,144);
  assert.equal(s.travelAllowed(where.special),null,'the place the objective names is refused by travel');
  // And you can still get there the long way, on foot through the workings.
  assert.equal(s.travelAllowed('mines'),null);
});

test('the telltale in the gallery shows the line falling to zero as you cap it',()=>{
  const world=new SiloWorld(new T.Scene());
  const s=new Story('story');world.story=s;
  const gallery=world.pressure;
  assert.ok(gallery.needle,'the pressure gallery has no telltale needle');
  gallery.update(s);
  const charged=gallery.needle.rotation.z;
  s.flags.add('pipe-cover-open');s.pipeSteps.push('isolate');
  gallery.update(s);
  const isolated=gallery.needle.rotation.z;
  s.pipeSteps.push('collar');s.pipeSteps.push('torque');s.flags.add('pipe-capped');
  gallery.update(s);
  const zero=gallery.needle.rotation.z;
  assert.ok(charged>isolated&&isolated>zero,
    `the needle does not fall as the line is capped: ${charged.toFixed(2)} → ${isolated.toFixed(2)} → ${zero.toFixed(2)}`);
  assert.ok(charged-zero>.9,'the swing is too small to read from the fitting');
  // And it walks rather than snapping, so you see it move while you stand there.
  s.flags.delete('pipe-capped');s.pipeSteps.length=0;gallery.update(s);
  const walked=[];for(let i=0;i<6;i++){s.flags.add('pipe-capped');gallery.update(s,1/60);walked.push(gallery.needle.rotation.z);}
  assert.ok(walked[0]>walked.at(-1)&&walked[0]<charged,'the needle snapped instead of falling');
});

// --- the drive bay -------------------------------------------------------
// The complaint was that you cannot see where the drive goes. What was there
// was a 130 × 50 × 220 mm black block with a 30 mm tube ending in mid-air, and
// nothing on the desk changed when the drive went in. Worse, measured against
// the table it is meant to be standing on — `table(k,5.7,3.4,1.3,.8)`, whose
// top kit.js beds at .835 — every piece of it floated: the tower 85 mm above
// the surface, the keyboard 35 mm above it and entirely off the front edge.
test('George’s machine stands on the table, and the bay you plug the drive into is visible from in front of it',()=>{
  const world=new SiloWorld(new T.Scene());
  world.story=new Story('explore');
  world.setLevel(68);
  const room=world.loaded.get(68).rooms[0];
  const desk=room.userData.georgeDesk;
  assert.ok(desk,'the desk exposes no state for the drive');

  // Nothing on the desk floats, and nothing hangs off it. The table top is at
  // .835 and spans x 5.05..6.35, z 3.0..3.8.
  const box=new T.Box3();let lowest=Infinity,pieces=0;
  const seen=new T.Box3();
  for(const child of room.children){
    if(!child.isGroup&&!child.isMesh&&!child.isInstancedMesh)continue;
    child.updateWorldMatrix(true,true);
  }
  // Walk the desk's own instanced batches by their local bounds.
  const local=new T.Box3();
  room.traverse(o=>{
    if(!o.isInstancedMesh||!o.geometry.boundingBox)return;
    const m=new T.Matrix4();
    for(let i=0;i<o.count;i++){
      o.getMatrixAt(i,m);
      local.copy(o.geometry.boundingBox).applyMatrix4(m);
      // Only what stands over the table's footprint, and below head height.
      const c=local.getCenter(new T.Vector3());
      if(c.x<5.05||c.x>6.35||c.z<3.0||c.z>3.8||local.min.y<.83||local.min.y>1.4)continue;
      pieces++;lowest=Math.min(lowest,local.min.y);seen.union(local);
    }
  });
  assert.ok(pieces>10,`only ${pieces} pieces of the desk stand over the table`);
  assert.ok(Math.abs(lowest-.835)<.006,
    `the lowest thing on the desk sits at ${lowest.toFixed(3)}, not on the table top at .835`);
  assert.ok(seen.min.x>=5.04&&seen.max.x<=6.36&&seen.min.z>=2.99&&seen.max.z<=3.81,
    `the desk overhangs the table: x ${seen.min.x.toFixed(2)}..${seen.max.x.toFixed(2)}, z ${seen.min.z.toFixed(2)}..${seen.max.z.toFixed(2)}`);

  // The bay has an actual mouth, at eye-line for somebody standing at the desk.
  assert.ok(DRIVE_BAY.mouth.w>.12&&DRIVE_BAY.mouth.h>.06,
    `the slot is ${(DRIVE_BAY.mouth.w*1000)|0} × ${(DRIVE_BAY.mouth.h*1000)|0} mm, which is not a thing you can see`);
  // Wide enough for the drive the game hands you: the supplied model is
  // 90 × 146 × 52 mm.
  assert.ok(DRIVE_BAY.mouth.w>.09&&DRIVE_BAY.mouth.h>.052,'the drive does not fit the slot');

  // And the prompt is a separate one from the computer, so you can look at the
  // bay and be told what it is.
  const bay=world.interactions.find(i=>i.action==='drive-bay');
  assert.ok(bay,'there is no prompt on the drive bay');
  const terminal=world.interactions.find(i=>i.action==='george-terminal');
  assert.ok(terminal,'there is no prompt on the computer');
  assert.ok(bay.position.distanceTo(terminal.position)>.4,'the bay and the computer are the same prompt');
  assert.ok(GEORGE_TERMINAL_POINT.distanceTo(terminal.position)<.01,
    'the exported terminal point and the interaction have drifted apart');
});

test('putting the drive in changes what is on the desk and what the screen says',()=>{
  const world=new SiloWorld(new T.Scene());
  world.story=new Story('explore');
  world.setLevel(68);
  const room=world.loaded.get(68).rooms[0];
  // Visible means visible all the way up: the two states are Groups, and the
  // meshes inside them are Kit batches one level further down again.
  const shown=o=>{for(let n=o;n&&n!==room.parent;n=n.parent)if(!n.visible)return false;return true;};
  const count=(node=room)=>{let on=0;node.traverse(o=>{if((o.isMesh||o.isInstancedMesh)&&shown(o))on++;});return on;};
  room.userData.georgeDesk.set(false);
  const empty=count();
  room.userData.georgeDesk.set(true);
  const seated=count();
  assert.notEqual(empty,seated,'the desk looks the same with the drive in as without it');
  assert.ok(seated>empty,'seating the drive removed things from the desk instead of adding the drive');
  // Both states exist at all times; only their visibility changes, so nothing
  // is rebuilt while the player is standing there.
  room.userData.georgeDesk.set(false);
  assert.equal(count(),empty,'the desk did not come back to the state it started in');

  // And the world carries the flag, so the room comes back right when Level
  // 068 streams out and in again.
  world.driveSeated=true;
  world.update(1/60,new T.Vector3(0,world.loaded.get(68).root.position.y,0));
  world.setLevel(60);world.setLevel(68);
  const back=world.loaded.get(68).rooms[0];
  assert.ok(back.userData.georgeDesk,'the rebuilt room has no desk state');
  const shownIn=o=>{for(let n=o;n&&n!==back.parent;n=n.parent)if(!n.visible)return false;return true;};
  const tally=()=>{let on=0;back.traverse(o=>{if((o.isMesh||o.isInstancedMesh)&&shownIn(o))on++;});return on;};
  const before=tally();
  back.userData.georgeDesk.set(false);
  const after=tally();
  assert.ok(before>after,'Level 068 came back with the bay empty even though the drive is in');
});

// --- how much you are told when you pick something up --------------------
// Four things fired at once on every pickup: a card with the relic's whole
// blurb, a toast pushing the next objective, a second card with the chapter
// title and that objective again, and the 3D inspector. Finding a thing is
// not the moment to be told what to do next.
test('picking a relic up says what you picked up, and does not push the next objective at you',()=>{
  const source=fs.readFileSync(path.join(import.meta.dirname,'..','dist','src','main.js'),'utf8');
  const start=source.indexOf('function takeRelic(');
  assert.ok(start>0,'takeRelic is not where this test thinks it is');
  const body=source.slice(start,source.indexOf('\nfunction ',start+10));
  assert.ok(!/notify\([^)]*story\.objective/.test(body),
    'taking something still puts the next objective on screen');
  assert.ok(!/showObjective\(/.test(body),
    'taking something still throws up an objective card of its own');
  assert.ok(!/syncStoryHud\(true\)/.test(body),
    'taking something still forces the chapter card up even when the chapter did not change');
  // Say what was collected without interrupting play. Inspection is an
  // explicit satchel action, as requested in the UI cleanup.
  assert.match(body,/notify\(`\$\{item\.name\}/,'taking something says nothing at all now');
  assert.doesNotMatch(body,/inspectRelic\(id\)/,'a pickup still interrupts play with a modal');
  assert.match(source,/inspect\.onclick=\(\)=>inspectRelic\(item\.id\)/,'the satchel lost its inspection action');
  // And the chapter card still comes up when the chapter genuinely moves on.
  assert.match(body,/syncStoryHud\(\)/,'nothing tells the HUD the story moved');
});

// --- a closed dialog is a closed dialog ----------------------------------
// This shipped, and it broke the game outright: giving `.terminal-panel` a
// `display:flex` so its content could scroll also beat the user-agent rule
// `dialog:not([open]){display:none}`, so George's terminal stood over the
// cafeteria from the moment the page loaded, for the whole game. The directory
// book got this right — `.book-panel[open]` — and the terminal did not.
//
// Every dialog in the page, not just the one that broke: an author-level
// `display` on a dialog element must be scoped to [open].
test('no dialog is painted over the game while it is closed',()=>{
  const html=fs.readFileSync(path.join(import.meta.dirname,'..','dist','index.html'),'utf8');
  const ids=[...html.matchAll(/<dialog[^>]*id="([^"]+)"/g)].map(m=>m[1]);
  const classes=new Set();
  for(const m of html.matchAll(/<dialog[^>]*class="([^"]+)"/g))for(const c of m[1].split(/\s+/))classes.add(c);
  assert.ok(ids.length>=8,`only ${ids.length} dialogs found; this test is looking in the wrong place`);
  assert.ok(classes.has('terminal-panel')&&classes.has('book-panel'));

  const subjectOf=selector=>selector.trim().split(/\s+(?![^(]*\))/).pop();
  const offenders=[];
  for(const rule of ALL){
    const subject=subjectOf(rule.selector);
    // A pseudo-element cannot paint when its host is display:none.
    if(/::/.test(subject))continue;
    const bare=subject.replace(/\[[^\]]*\]|::?[a-z-]+(\([^)]*\))?/g,'');
    const isDialog=bare==='dialog'||ids.some(id=>bare==='#'+id)||[...classes].some(c=>bare==='.'+c);
    if(!isDialog)continue;
    const declaration=[...rule.body.matchAll(/(^|;)\s*display\s*:\s*([^;]+)/g)].pop();
    if(!declaration)continue;
    const value=declaration[2].trim();
    if(value==='none'||/\[open\]/.test(subject))continue;
    offenders.push(`${rule.selector}${rule.media?` @media ${rule.media}`:''} -> display:${value}`);
  }
  assert.deepEqual(offenders,[],
    'a dialog is given a display that is not scoped to [open]; it will be painted over the game while closed');
});

// --- the sheet you have to be able to read -------------------------------
// The terminal panel is capped at 90dvh and nothing inside it scrolled, so the
// recovered schematic — a drawing and nine numbered steps — was laid out past
// the bottom of the box and lost. Measured in a browser with the sheet on
// screen: 475 px below the panel at 1280 × 760, 691 in portrait and 808 in
// phone landscape, where all that could be read was "SCHEMATIC RECOVERED".
// The pixel measurements belong in docs/the-playthrough.md; what is asserted
// here is the cascade that produced them.
const CSS=stylesheet();
const ALL=rules(CSS);
const resolve=(selectors,property,viewport)=>resolveIn(ALL,selectors,property,viewport);
const CONTENT=['.terminal-content','.terminal-panel[open]:has(#terminalBlueprint:not([hidden])) .terminal-content'];
const SHEET=['#terminalBlueprint','.terminal-panel[open]:has(#terminalBlueprint:not([hidden])) #terminalBlueprint'];
const MACHINE=['.terminal-machine','.terminal-panel[open]:has(#terminalBlueprint:not([hidden])) .terminal-machine'];

const SIZES=[
  {name:'desktop',width:1280,height:760,short:false},
  {name:'phone landscape',width:844,height:390,short:true},
  {name:'small phone landscape',width:667,height:375,short:true},
  {name:'phone portrait',width:390,height:844,short:false},
  {name:'tiny portrait',width:320,height:568,short:false},
  {name:'tablet',width:1024,height:1366,short:false},
];

// The subject of a selector is its last compound — `.terminal-content` in
// `.terminal-panel:has(…) .terminal-content` — and that is the element it
// actually styles. Matching the whole string instead would count every rule
// that merely mentions the sheet in a `:has()` guard.
const subject=selector=>selector.trim().split(/\s+(?![^(]*\))/).pop();
test('nothing styles the terminal panel through a query this test cannot read',()=>{
  const mine=new Set([...CONTENT,...SHEET,...MACHINE]);
  const walked=new Set(['.terminal-content','.terminal-machine','#terminalBlueprint']);
  const strays=ALL.filter(r=>walked.has(subject(r.selector))&&!mine.has(r.selector));
  assert.deepEqual(strays.map(r=>r.selector),[],'a selector reaches the terminal content that this test does not model');
  const unreadable=ALL.filter(r=>r.media&&evaluate(r.media,{width:844,height:390})===null&&mine.has(r.selector));
  assert.deepEqual(unreadable.map(r=>r.media),[],'the terminal is styled inside a media query this test cannot evaluate');
});

test('the recovered schematic can always be scrolled to, at every size a phone reports',()=>{
  for(const size of SIZES){
    const overflow=resolve(CONTENT,'overflow',size);
    const floor=resolve(CONTENT,'min-height',size);
    assert.equal(floor,'0',`${size.name}: the content still has a floor of ${floor}, which is what pushed it past the panel`);
    if(overflow==='hidden'){
      // Two pages: the machine down one side and the sheet down the other,
      // each scrolling on its own at the panel's full height.
      assert.ok(size.short,`${size.name}: the panel clips its content and is not short enough for the two-page layout`);
      assert.match(resolve(CONTENT,'display',size)||'',/grid/,`${size.name}: the content clips without re-laying out`);
      for(const [what,selectors] of [['the sheet',SHEET],['the machine',MACHINE]]){
        assert.equal(resolve(selectors,'overflow',size),'auto',`${size.name}: ${what} does not scroll`);
        assert.equal(resolve(selectors,'min-height',size),'0',`${size.name}: ${what} cannot shrink into its column`);
      }
    }else{
      assert.equal(overflow,'auto',`${size.name}: the panel neither re-lays out nor scrolls, so whatever overflows is lost`);
    }
  }
});

test('the panel keeps its head still and gives the rest of itself to the content',()=>{
  assert.match(resolve(['.terminal-panel[open]'],'display',SIZES[0])||'',/flex/,'the panel is not a column, so nothing in it can be made to scroll');
  assert.equal(resolve(['.terminal-panel[open] .panel-head'],'flex',SIZES[0]),'none','the head is allowed to shrink, which is not what a head does');
  assert.match(resolve(CONTENT,'flex',SIZES[0])||'','1 1 auto'.length?/1 1 auto/:/./,'the content does not take the space the head leaves');
});
