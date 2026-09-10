import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from '../dist/vendor/three.module.js';
import { createMaterials } from '../dist/src/kit.js';
import { SiloWorld } from '../dist/src/world.js';
import { CafeteriaOpening, createDirectoryBook, BOOK_POSITION, CAFETERIA_START } from '../dist/src/opening.js';
import { BOOK_TABLE, TABLE_ROWS, TABLE_COLUMNS, TABLE_TOP, buildTopFloor } from '../dist/src/top-floor.js';
import { topPoint, topLocal } from '../dist/src/surface.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

// The first thing a new game asks you to do is find this book. Everything here
// is about that one object being where the player is told it is, being visible
// when they get there, and being pickable when they press the key.
const SCREEN_Z=39.34;                       // the great display's glass
const TABLE=Object.freeze({w:3.3,d:1.4});   // top-floor.js builds them this size

const materials=createMaterials();
// The book is built in world space and rotated onto the top floor, so measure
// it the way the player meets it: in the top floor's own coordinates.
function bookBounds(){
  const book=createDirectoryBook(materials);
  book.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(book);
  const a=topLocal(box.min),b=topLocal(box.max);
  return {min:{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),z:Math.min(a.z,b.z)},
          max:{x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),z:Math.max(a.z,b.z)},book};
}

test('the book is on the front table — the one closest to the screen — and you start behind it',()=>{
  assert.equal(BOOK_TABLE[1],Math.max(...TABLE_ROWS),'the book is not on the row nearest the screen');
  assert.ok(TABLE_COLUMNS.includes(BOOK_TABLE[0]),'the book is not on a table at all');
  // and that row really is the near one: no table sits between it and the glass
  for(const z of TABLE_ROWS)assert.ok(z<=BOOK_TABLE[1]&&z<SCREEN_Z,`a table at ${z} is not behind the screen wall`);
  assert.ok(SCREEN_Z-BOOK_TABLE[1]<8,'the "front" table is nowhere near the screen');
  // the book column is the one closest to the middle of the room, so the start
  // faces the display square-on rather than from the side of the hall
  for(const x of TABLE_COLUMNS)assert.ok(Math.abs(x)>=Math.abs(BOOK_TABLE[0]),'a table sits closer to the centre line');

  // You start at that table, close enough to read the cover.
  assert.ok(Math.abs(BOOK_POSITION[0]-BOOK_TABLE[0])<TABLE.w/2&&Math.abs(BOOK_POSITION[2]-BOOK_TABLE[1])<TABLE.d/2,
    'the book is not on the table it is supposed to be on');
  assert.equal(CAFETERIA_START[1],0,'the start is not on the floor');
  const gap=Math.hypot(BOOK_POSITION[0]-CAFETERIA_START[0],BOOK_POSITION[2]-CAFETERIA_START[2]);
  assert.ok(gap>1.4&&gap<3,`you start ${gap.toFixed(2)} m from the book`);
  assert.ok(BOOK_POSITION[2]>CAFETERIA_START[2],'the book is behind you at the start');
  // The game opens in third person with the camera directly behind the player,
  // so anything on the start's own line of advance is hidden by the player's
  // own body. The book has to sit off to one side of that line.
  assert.ok(Math.abs(BOOK_POSITION[0]-CAFETERIA_START[0])>.6,
    'the book is directly in front of the start, where the player character covers it');
});

test('the book rests on the table top, inside the table, thick enough to see',()=>{
  const {min,max}=bookBounds();
  assert.ok(Math.abs(min.y-TABLE_TOP)<.003,
    `the book's underside is at ${min.y.toFixed(3)}, the table top is at ${TABLE_TOP} — it is buried or floating`);
  const thickness=max.y-min.y;
  assert.ok(thickness>.07&&thickness<.18,`a ${(thickness*100).toFixed(1)} cm book reads as a place mat`);
  // Both footprints inside the table, with a margin no plate would need.
  assert.ok(min.x>BOOK_TABLE[0]-TABLE.w/2+.1&&max.x<BOOK_TABLE[0]+TABLE.w/2-.1,'the book hangs off the side of the table');
  assert.ok(min.z>BOOK_TABLE[1]-TABLE.d/2+.05&&max.z<BOOK_TABLE[1]+TABLE.d/2-.05,'the book hangs off the front of the table');
  // Big enough to be a book across the room, not a coaster.
  assert.ok(max.x-min.x>.28&&max.z-min.z>.28,'the book is too small to find');
  // On the near edge, where somebody set it down, not pushed away to the back.
  assert.ok((min.z+max.z)/2<BOOK_TABLE[1],'the book is on the far side of the table from the player');
});

test('nothing else is laid on the book’s table',()=>{
  const root=buildTopFloor(materials);
  root.updateMatrixWorld(true);
  // Anything standing on this table would be geometry above its surface and
  // inside its footprint. A mug and a plate used to sit either side of the
  // book and turned it into the middle piece of a place setting.
  const half={x:TABLE.w/2-.02,z:TABLE.d/2-.02},point=new THREE.Vector3();
  let intruders=0,sampled=0;
  root.traverse(o=>{
    if(!o.isMesh)return;
    const position=o.geometry.getAttribute('position');
    if(!position)return;
    const count=o.isInstancedMesh?o.count:1,matrix=new THREE.Matrix4();
    for(let n=0;n<count;n++){
      if(o.isInstancedMesh){o.getMatrixAt(n,matrix);matrix.premultiply(o.matrixWorld);}else matrix.copy(o.matrixWorld);
      for(let i=0;i<position.count;i++){
        point.fromBufferAttribute(position,i).applyMatrix4(matrix);sampled++;
        // Between the table top and head height. Higher than that is the
        // ceiling and its fittings, which are over every table in the room.
        if(point.y<TABLE_TOP+.03||point.y>TABLE_TOP+1.2)continue;
        if(Math.abs(point.x-BOOK_TABLE[0])>half.x||Math.abs(point.z-BOOK_TABLE[1])>half.z)continue;
        intruders++;
      }
    }
  });
  assert.ok(sampled>1000,`only ${sampled} vertices examined; the room did not build`);
  assert.equal(intruders,0,`${intruders} vertices stand on the book's table`);
});

test('the pickup prompt is on the book and is there the moment the game starts',()=>{
  const world=new SiloWorld(new THREE.Scene());world.setLevel(1);
  const opening=new CafeteriaOpening(world);
  world.update(0,topPoint(...CAFETERIA_START));
  opening.update(1/60);
  assert.equal(world.storyInteractions.length,1,'the opening does not own the story interactions');
  const prompt=world.storyInteractions[0];
  assert.equal(prompt.action,'opening-book');
  // The prompt marker has to be on the object, not on the floor under it.
  const {min,max}=bookBounds(),local=topLocal(prompt.position);
  assert.ok(local.x>=min.x&&local.x<=max.x&&local.z>=min.z&&local.z<=max.z&&local.y>=min.y&&local.y<=max.y,
    'the pickup marker is not inside the book');

  const eye=topPoint(...CAFETERIA_START);eye.y+=1.6;
  const direction=prompt.position.clone().sub(eye).normalize();
  assert.equal(world.nearestInteraction(eye,direction)?.action,'opening-book','the book cannot be picked up from the start');
  // and it survives the pick-up: once taken, the book and its prompt both go
  assert.equal(opening.takeBook(),true);
  opening.update(1/60);
  assert.equal(world.storyInteractions.length,0);
  assert.equal(opening.book.visible,false);
});

// The bug this file exists for. The book was correct, the prompt was correct,
// and the frame loop reassigned world.storyInteractions a few lines after the
// opening had filled it — so the only interaction in a new game was silently
// replaced every tick and the story could not be started at all. That is not
// visible from either module on its own, so it is asserted at the source.
test('only the opening writes world.storyInteractions',()=>{
  const dir=path.join(import.meta.dirname,'..','dist','src');
  const writers=fs.readdirSync(dir).filter(name=>name.endsWith('.js')).filter(name=>{
    const source=fs.readFileSync(path.join(dir,name),'utf8');
    return /storyInteractions\s*(=[^=]|\.push|\.splice|\.pop|\.shift|\.unshift)/.test(source);
  });
  assert.deepEqual(writers,['opening.js'],
    `these files write world.storyInteractions: ${writers.join(', ')} — the list has one owner`);
});
