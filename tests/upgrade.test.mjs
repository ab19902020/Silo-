import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { LEVELS, SILO, levelY, roomType, roomsForLevel } from '../dist/src/data.js';
import { topPoint, topLocal, rampY, groundY, TREE } from '../dist/src/surface.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const world=new SiloWorld(new THREE.Scene());world.setLevel(1);
const clearAt=(p,c=world.colliders)=>{const q=p.clone();c.resolve(q,.28,p.y+.01,p.y+1.76,.3);return q.distanceTo(p)<.05;};
function walk(body,target,maxSeconds=50){
  const dt=1/120;for(let i=0;i<maxSeconds/dt;i++){const direction=target.clone().sub(body.position);direction.y=0;if(direction.length()<.09)return;direction.normalize().multiplyScalar(2.6);body.step(dt,direction,world.colliders);world.update(dt,body.position);}
  assert.fail(`Route blocked: ${JSON.stringify(topLocal(body.position))} -> ${JSON.stringify(topLocal(target))}`);
}

test('actual walking exits and reenters all 864 directory wing destinations',()=>{
  // A collision sample at y + .01 missed this regression. Exercise gravity
  // and horizontal integration together, exactly as the game controller does.
  const dt=1/120;
  for(let n=1;n<=144;n++){
    world.setLevel(n);
    for(let w=0;w<6;w++){
      const a=w*Math.PI/3,radial=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
      const b=new CharacterBody({radius:.3,stepHeight:.3});b.teleport(...world.destination(`room:${n}:${w}`).position.toArray());
      // Wing doors start shut. Work the handle first, the way a player does —
      // this test is looking for walls you cannot see, not for the ones you can.
      const door=world.doors.find(d=>d.level===n&&d.wing===w);
      assert.ok(door,`level ${n} wing ${w} has no door`);
      door.open=true;for(let j=0;j<120;j++)world.update(1/60,b.position);
      for(const radius of [23,29]){
        const target=radial.clone().multiplyScalar(radius);target.y=levelY(n);
        for(let j=0;j<420&&b.position.distanceTo(target)>.09;j++){
          const v=target.clone().sub(b.position);v.y=0;v.normalize().multiplyScalar(3.2);b.step(dt,v,world.colliders);
        }
        assert.ok(b.position.distanceTo(target)<.1,`Invisible wall on ${n}/${w} toward r=${radius}: ${b.position.toArray()}`);
      }
    }
  }
});

test('a shut wing door is shut, and opening it is what lets you through',()=>{
  const level=100;world.setLevel(level);
  for(let w=0;w<6;w++){
    const door=world.doors.find(d=>d.level===level&&d.wing===w);
    if(['cafeteria','bazaar','park','bar'].includes(door.type))continue;   // the public halls stand open
    assert.equal(door.open,false,`the ${door.type} wing opens itself`);
    const a=w*Math.PI/3,inside=new THREE.Vector3(Math.cos(a)*30,levelY(level),Math.sin(a)*30);
    const b=new CharacterBody({radius:.3,stepHeight:.3});
    b.teleport(Math.cos(a)*22,levelY(level),Math.sin(a)*22);
    const push=()=>{for(let j=0;j<600;j++){const v=inside.clone().sub(b.position);v.y=0;v.normalize().multiplyScalar(3.2);b.step(1/120,v,world.colliders);}};
    const r=()=>Math.hypot(b.position.x,b.position.z);
    push();
    assert.ok(r()<26.6,`walked straight through a shut ${door.type} door to r=${r().toFixed(1)}`);
    door.open=true;for(let j=0;j<150;j++)world.update(1/60,b.position);
    push();
    assert.ok(r()>29,`the ${door.type} door opened but still blocks, r=${r().toFixed(1)}`);
  }
});

test('rear passage openings and the whole circular service route are walkable',()=>{
  const level=100;world.setLevel(level);const b=new CharacterBody({radius:.3,stepHeight:.3}),y=levelY(level);
  b.teleport(47.7,y,0);walk(b,new THREE.Vector3(53.6,y,0));
  for(let j=1;j<=144;j++){
    const a=j*Math.PI*2/144;walk(b,new THREE.Vector3(Math.cos(a)*53.6,y,Math.sin(a)*53.6),5);
  }
  walk(b,new THREE.Vector3(47.7,y,0));
});

test('bazaar street and all six shop doorways admit a walking body',()=>{
  world.setLevel(100);const room=world.loaded.get(100).rooms[0],y=levelY(100);
  const p=(x,z)=>new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),room.rotation.y).add(new THREE.Vector3(room.position.x,y,room.position.z));
  const b=new CharacterBody({radius:.3,stepHeight:.3});b.teleport(...p(0,2).toArray());
  for(let row=0;row<3;row++){
    const z=4.5+row*6.55;walk(b,p(0,z));
    for(const side of [-1,1]){walk(b,p(side*6.5,z));walk(b,p(0,z));}
  }
  walk(b,p(0,27));
});

test('corrected TV departments and 864 direct wing destinations',()=>{
  assert.equal(LEVELS.length,144);assert.equal(LEVELS.flatMap(l=>roomsForLevel(l.level)).length,864);
  for(const [n,w,t] of [[1,0,'cafeteria'],[10,0,'porter'],[14,0,'judicial'],[19,0,'it'],[20,0,'janitorial'],[20,1,'recycling'],[62,0,'medical'],[126,1,'it'],[140,0,'residential'],[144,1,'workshop']])assert.equal(roomType(n,w),t);
  assert.ok(world.generator.root.position.y<levelY(144));
  for(const n of [1,50,100,144])for(const r of roomsForLevel(n)){const d=world.destination(r.id);world.setLevel(n);assert.ok(clearAt(d.position),r.id);assert.ok(Math.abs(world.colliders.floorAt(d.position.x,d.position.z,.28,d.position.y+.3)-d.position.y)<.01);}
});

test('all 144 floors remain represented when detailed geometry streams',()=>{
  for(const level of [1,8,50,98,144]){world.updateStructure(level);const counts=world.structure.children[0].count+world.distant.children[0].count;assert.equal(counts,144);const y=[];for(const group of [world.structure,world.distant]){const mesh=group.children[0];for(let i=0;i<mesh.count;i++){const m=new THREE.Matrix4();mesh.getMatrixAt(i,m);y.push(Math.round(m.elements[13]));}}assert.equal(new Set(y).size,144);assert.equal(Math.max(...y)-Math.min(...y),1430);}
});

test('continuous walking route from cafeteria through Holding 3, airlock and ramp, then back inside',()=>{
  world.setLevel(1);const b=new CharacterBody({radius:.28,stepHeight:.3});b.teleport(...topPoint(0,0,3).toArray());
  for(const [x,z] of [[0,10.7],[16,10.7],[16,28],[20,28],[20,31],[26,31],[26,49],[18,49],[26,49],[26,52]])walk(b,topPoint(x,0,z));
  world.cycleAirlock('inner');for(let i=0;i<240;i++)world.update(1/60,b.position);
  for(const z of [56,60,62])walk(b,topPoint(26,0,z));
  world.cycleAirlock('outer');for(let i=0;i<240;i++)world.update(1/60,b.position);
  const doors=world.loaded.get(1).rooms[0].userData.doors;assert.ok(doors.find(d=>d.id==='inner').amount<.01);assert.ok(doors.find(d=>d.id==='outer').amount>.96);
  for(const z of [66,85,103,108,115])walk(b,topPoint(26,z<=108?rampY(z):groundY(26,z),z));
  assert.ok(world.outside);assert.ok(Math.abs(b.position.y-levelY(1)-groundY(26,115))<.15);
  for(const [x,z] of [[26,110.2],[20.2,110.2],[20.2,100.39]])walk(b,topPoint(x,groundY(x,z),z));
  const p=b.position.clone();p.y+=1.65;const look=world.surface.cleaningPoint.clone().sub(p).normalize();assert.equal(world.nearestInteraction(p,look)?.action,'clean-camera');
  const before=world.surface.cleanliness;world.surface.beginCleaning();for(let i=0;i<250;i++)world.update(1/60,b.position);assert.ok(world.surface.cleanliness>before);assert.equal(world.surface.cleanliness,1);assert.equal(world.surface.cleaning,false);
  for(const [x,z] of [[20.2,110.2],[26,110.2]])walk(b,topPoint(x,groundY(x,z),z));
  for(const z of [103,85,66,61])walk(b,topPoint(26,rampY(z),z));
  world.cycleAirlock('inner');for(let i=0;i<240;i++)world.update(1/60,b.position);walk(b,topPoint(26,0,50));assert.ok(!world.outside);assert.ok(Math.abs(b.position.y-levelY(1))<.02);
});

test('airlock never admits both pressure doors at once',()=>{
  world.setLevel(1);const pos=topPoint(26,0,59),doors=world.loaded.get(1).rooms[0].userData.doors;
  for(const id of ['inner','outer','inner','outer']){world.cycleAirlock(id);for(let i=0;i<270;i++){world.update(1/60,pos);assert.ok(!(doors[0].amount>.96&&doors[1].amount>.96));}}
});

test('all four homes in a residential wing have reachable bedroom and bathroom entrances',()=>{
  world.setLevel(140);const room=world.loaded.get(140).rooms[0],toWorld=(x,z)=>new THREE.Vector3(x,0,z).applyAxisAngle(new THREE.Vector3(0,1,0),room.rotation.y).add(new THREE.Vector3(room.position.x,levelY(140),room.position.z));
  for(const side of [-1,1])for(const row of [0,1]){
    const base=1+row*11.4,x=u=>side*(1.5+u),paths=[[[0,base+3.7],[x(.8),base+3.7]],[[x(3.4),base+5.5],[x(3.4),base+7.1]],[[x(5.4),base+8.15],[x(7.25),base+8.15]]];
    for(const [a,b]of paths)for(let t=0;t<=1;t+=.025){const p=toWorld(THREE.MathUtils.lerp(a[0],b[0],t),THREE.MathUtils.lerp(a[1],b[1],t));assert.ok(clearAt(p),`Closed home opening ${side}/${row}: ${a} -> ${b}`);}
  }
});

test('generator maintenance stairs connect ground to the upper gantry',()=>{
  world.setLevel(144,'generator');const r=17;let floor=52;
  for(let j=0;j<480;j++){const a=Math.PI+(j+.5)*Math.PI/480,x=Math.cos(a)*r,z=Math.sin(a)*r;const y=world.colliders.floorAt(x,z,.24,floor+.3);assert.ok(y>=floor-.02&&y-floor<=.3);floor=y;assert.ok(clearAt(new THREE.Vector3(x,y,z)));}
  assert.ok(Math.abs(floor-62.22)<.02);for(let x=17;x>11;x-=.2)assert.ok(world.colliders.floorAt(x,0,.24,62.5)>=62.2);
});

test('barren terrain supports the old hatch gap and continues past the former map edge',()=>{
  world.setLevel(1);const dt=1/120;
  // Walk directly over the old false cutout, beside both sides of the ramp.
  for(const x of [20,22,30,32]){
    const b=new CharacterBody();b.teleport(...topPoint(x,groundY(x,45),45).toArray());
    for(let i=0;i<3000;i++){b.step(dt,new THREE.Vector3(3,0,0),world.colliders);assert.ok(b.position.y>levelY(1)+13,'Fell through the visible ground');}
  }
  for(const [x,z] of [[600,600],[-1500,1800],[2600,-2600],[4100,5200]]){
    const b=new CharacterBody();b.teleport(...topPoint(x,groundY(x,z),z).toArray());world.update(0,b.position);
    for(let i=0;i<240;i++){b.step(dt,new THREE.Vector3(2,0,1),world.colliders);world.update(dt,b.position);const p=topLocal(b.position);assert.ok(Math.abs(p.y-groundY(p.x,p.z))<.18);assert.equal(world.activeLevel,1);assert.ok(world.outside);}
    assert.ok(world.surface.terrainTiles.has(world.surface.tileKey));assert.ok(world.surface.terrainTiles.size<=10);
  }
});

test('camera feed contains only bowl terrain, debris and plants with the tree on the right',()=>{
  const surface=world.surface;surface.camera.updateMatrixWorld(true);
  for(const child of surface.feedRoot.children)assert.ok(['barren-ground','surface-scree','dead-tree','wind-dust','ramp-mouth'].includes(child.name));
  assert.ok(surface.feedRoot.getObjectByName('ramp-mouth'),'the panorama has to show the hatch the cleaner climbs out of');
  const p=topPoint(TREE.x,groundY(TREE.x,TREE.z)+3,TREE.z).project(surface.camera);assert.ok(p.x>.3&&p.x<.75,`Tree composition ${p.x}`);
  assert.ok(surface.camera.fov<30);assert.equal(surface.feedRoot.getObjectByName('18'),undefined);
});
