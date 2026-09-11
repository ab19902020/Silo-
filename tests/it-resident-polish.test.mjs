import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createMaterials,signTextLayout,disposeGroup} from '../dist/src/kit.js';
import {buildRoom} from '../dist/src/rooms.js';
import {createAlgorithmInterface} from '../dist/src/algorithm-interface.js';
import {ConversationMemory,personalHistory} from '../dist/src/resident-stories.js';
import {conversationFor,algorithmAnswer} from '../dist/src/conversations.js';
import {buildPassages,SPUR} from '../dist/src/passages.js';
import {Story} from '../dist/src/story.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

test('free roam can enter the IT vault and the visible entrance is clear',()=>{
  const m=createMaterials(),it=buildRoom(m,'it',19,0,{}),vault=buildRoom(m,'vault',19,1,{});
  assert.ok(it.userData.interactions.some(i=>i.destination==='room:19:1'));
  const roam=new Story('explore');assert.equal(roam.sealed(19,1,'vault'),null);
  vault.updateMatrixWorld(true);
  for(const y of [.4,1.2,1.8]){
    const ray=new T.Raycaster(new T.Vector3(0,y,-.4),new T.Vector3(0,0,1),0,1.2);
    assert.equal(ray.intersectObject(vault,true).length,0,'opaque geometry crosses the entrance');
  }
  assert.ok(vault.userData.solids.some(s=>s.z===20.2&&s.y1>1),'table must stop the player');
  disposeGroup(it);disposeGroup(vault);
});

test('sand animation responds, decays and releases its GPU resources',()=>{
  const g=createAlgorithmInterface(),sand=g.getObjectByName('cymatic-sand');
  assert.equal(sand.geometry.attributes.position.count,6400);
  let disposed=0;sand.geometry.addEventListener('dispose',()=>disposed++);sand.material.addEventListener('dispose',()=>disposed++);
  g.userData.respond();assert.equal(sand.material.uniforms.response.value,1);
  for(let i=0;i<180;i++)g.userData.update(1/60);
  assert.ok(sand.material.uniforms.response.value<.15);assert.ok(sand.material.uniforms.time.value>2.9);
  disposeGroup(g);assert.equal(disposed,2);
});

test('multiline and narrow signs keep every line within the plate',()=>{
  const ctx={font:'',measureText(s){return {width:s.length*parseFloat(this.font.match(/[\d.]+/)[0])*.62};}};
  for(const [text,w,h] of [['DANGER\nDO NOT ENTER',1024,1024],['SERVER ROOM · AUTHORISED ENTRY',1024,72],['BED A1',1024,293],['A\nB\nC',1024,70]]){
    const layout=signTextLayout(ctx,text,w,h,'bold 125px Arial');
    for(const line of layout.lines){assert.ok(ctx.measureText(line.text).width<=w-layout.padding*2+.01);assert.ok(line.y-layout.size/2>=0);assert.ok(line.y+layout.size/2<=h);}
    for(let i=1;i<layout.lines.length;i++)assert.ok(layout.lines[i].y-layout.lines[i-1].y>layout.size);
  }
});

test('resident memories distinguish people, vary follow-ups and survive reload',()=>{
  let saved='';const storage={getItem:()=>saved,setItem:(k,v)=>saved=v},memory=new ConversationMemory(storage);
  const person={id:'resident-19-4',name:'Mira',kind:'it',level:19};
  const first=conversationFor(person,{visits:memory.visit(person.id)}),topic=first.topics.find(t=>t.id==='history');
  assert.notEqual(memory.reply(person.id,topic),memory.reply(person.id,topic));
  const reloaded=new ConversationMemory(storage),next=conversationFor(person,{visits:reloaded.visit(person.id)});
  assert.notEqual(first.greeting,next.greeting);assert.equal(reloaded.visit('resident-19-5'),0);
  assert.match(personalHistory(person)[0],/Level 19/);
  assert.doesNotThrow(()=>new ConversationMemory({getItem:()=>'{broken'}));
  assert.doesNotThrow(()=>new ConversationMemory({getItem:()=>'{"__proto__":{"visits":2,"topics":{}}}'}).visit('__proto__'));
});

test('archive queries preserve the story discovery gate',()=>{
  assert.match(algorithmAnswer('gas pipe'),/requires an archive record/);
  assert.match(algorithmAnswer('gas pipe',{freeRoam:true}),/physical fitting/);
  assert.match(algorithmAnswer('Atbash'),/A corresponds to Z/);
  assert.match(algorithmAnswer('<img src=x onerror=alert(1)>'),/No specific subject/);
});

test('memorial chalk is attached to both walls near the concealed passage',()=>{
  const p=buildPassages(createMaterials(),144,['mechanical','workshop','mines','supply','residential','residential']);
  const writing=[];p.traverse(o=>{if(o.name==='resident-wall-writing')writing.push(o);});
  assert.equal(writing.length,2);
  for(const w of writing){assert.ok(Math.abs(Math.abs(w.position.x)-(SPUR.half-.008))<.001);assert.ok(w.position.z>SPUR.inner&&w.position.z<SPUR.outer);assert.equal(w.material.depthWrite,false);}
  assert.ok(p.userData.interactions.some(i=>i.action==='lore:memorial'));disposeGroup(p);
});
