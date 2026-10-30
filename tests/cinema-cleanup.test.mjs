import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createScreeGeometry} from '../dist/src/surface.js';

test('cinema controls disappear, stop intercepting input, and return on request',()=>{
  const source=readFileSync(new URL('../dist/src/main.js',import.meta.url),'utf8');
  const start=source.indexOf('function updateInterface('),end=source.indexOf('\n}',start)+2;
  // The stub has to look like a real element or it tests a DOM that does not
  // exist: every node has a classList and an offsetHeight, and the objective
  // card now uses both to collapse itself rather than disappear.
  const classes=new Set();
  const node=()=>{const own=new Set();return {hidden:false,offsetHeight:0,setAttribute(k,v){this[k]=v;},
    classList:{toggle(k,v){const on=v===undefined?!own.has(k):v;on?own.add(k):own.delete(k);},
      contains:k=>own.has(k),add:k=>own.add(k),remove:k=>own.delete(k)}};};
  const nodes=Object.fromEntries(['cinemaControls','chapterHud','controlsButton'].map(id=>[id,node()]));
  const context={hudOpen:false,touchUntil:0,cinemaUntil:4500,chapterUntil:0,started:true,body:{horizontalSpeed:0},opening:{watching:true,focus:false},isPaused:false,story:null,$:id=>nodes[id],document:{body:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k);},remove(k){classes.delete(k);}},style:{setProperty(){}}}}};
  vm.createContext(context);vm.runInContext('function paused(){return isPaused;}\n'+source.slice(start,end),context);
  context.updateInterface(1);assert.ok(classes.has('cinema-awake'));assert.equal(nodes.cinemaControls.inert,false);
  context.updateInterface(5);assert.ok(!classes.has('cinema-awake'));assert.equal(nodes.cinemaControls.inert,true);assert.equal(nodes.cinemaControls['aria-hidden'],'true');
  context.hudOpen=true;context.touchUntil=10000;context.updateInterface(6);assert.ok(classes.has('cinema-awake'));
  context.updateInterface(11);assert.equal(context.hudOpen,false);assert.equal(nodes.cinemaControls.inert,true);
  context.cinemaUntil=15000;context.isPaused=true;context.updateInterface(12);assert.equal(nodes.cinemaControls.inert,true);
  // The objective card collapses rather than vanishing once its linger is up,
  // so the player can still see where they were going. With no story loaded
  // there is nothing to collapse TO, so it goes.
  context.isPaused=false;context.opening={watching:false,focus:false};
  context.chapterUntil=99000;context.updateInterface(12);
  assert.equal(nodes.chapterHud.hidden,false,'the card is hidden while its chapter is still lingering');
  assert.equal(nodes.chapterHud.classList.contains('compact'),false,'the card collapsed while still lingering');
  context.story={story:true,destination:{level:110,place:'Supply · Level 110'}};
  context.chapterUntil=0;context.updateInterface(12);
  assert.equal(nodes.chapterHud.hidden,false,'the card vanished instead of collapsing');
  assert.equal(nodes.chapterHud.classList.contains('compact'),true,'the card did not collapse after its linger');
  context.story=null;context.updateInterface(12);
  assert.equal(nodes.chapterHud.hidden,true,'the card stays up in free roam, with no objective to show');
});

test('weathered scree is a closed mesh, without disconnected triangular shards',()=>{
  const g=createScreeGeometry(),p=g.attributes.position,edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');
  for(let i=0;i<p.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const k=[key(a),key(b)].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
  assert.ok([...edges.values()].every(count=>count===2),'an edge is open or duplicated');
  g.computeBoundingSphere();assert.ok(g.boundingSphere.radius<1.1);g.dispose();
});
