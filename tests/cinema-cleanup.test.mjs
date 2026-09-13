import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createScreeGeometry} from '../dist/src/surface.js';

test('cinema controls disappear, stop intercepting input, and return on request',()=>{
  const source=readFileSync(new URL('../dist/src/main.js',import.meta.url),'utf8');
  const start=source.indexOf('function updateInterface('),end=source.indexOf('\n}',start)+2;
  const classes=new Set(),nodes=Object.fromEntries(['cinemaControls','chapterHud','controlsButton'].map(id=>[id,{hidden:false,setAttribute(k,v){this[k]=v;}}]));
  const context={hudOpen:false,touchUntil:0,cinemaUntil:4500,chapterUntil:0,started:true,body:{horizontalSpeed:0},opening:{watching:true,focus:false},isPaused:false,$:id=>nodes[id],document:{body:{classList:{toggle(k,v){v?classes.add(k):classes.delete(k);},remove(k){classes.delete(k);}},style:{setProperty(){}}}}};
  vm.createContext(context);vm.runInContext('function paused(){return isPaused;}\n'+source.slice(start,end),context);
  context.updateInterface(1);assert.ok(classes.has('cinema-awake'));assert.equal(nodes.cinemaControls.inert,false);
  context.updateInterface(5);assert.ok(!classes.has('cinema-awake'));assert.equal(nodes.cinemaControls.inert,true);assert.equal(nodes.cinemaControls['aria-hidden'],'true');
  context.hudOpen=true;context.touchUntil=10000;context.updateInterface(6);assert.ok(classes.has('cinema-awake'));
  context.updateInterface(11);assert.equal(context.hudOpen,false);assert.equal(nodes.cinemaControls.inert,true);
  context.cinemaUntil=15000;context.isPaused=true;context.updateInterface(12);assert.equal(nodes.cinemaControls.inert,true);
});

test('weathered scree is a closed mesh, without disconnected triangular shards',()=>{
  const g=createScreeGeometry(),p=g.attributes.position,edges=new Map();
  const key=i=>[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');
  for(let i=0;i<p.count;i+=3)for(const [a,b] of [[i,i+1],[i+1,i+2],[i+2,i]]){const k=[key(a),key(b)].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
  assert.ok([...edges.values()].every(count=>count===2),'an edge is open or duplicated');
  g.computeBoundingSphere();assert.ok(g.boundingSphere.radius<1.1);g.dispose();
});
