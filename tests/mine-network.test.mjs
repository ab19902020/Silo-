import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import { createMaterials } from '../dist/src/kit.js';
import { buildMineNetwork, MINE_AREAS, MINE_INSCRIPTIONS } from '../dist/src/mine-network.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};

const materials=createMaterials();
const net=buildMineNetwork(materials);
const SPAWN=[0,-29];

// The player: 0.3 m across the shoulders, 1.78 m tall, 0.3 m step. Everything
// below walks the network the way that body would, over the collision the
// module actually hands back — not over the plan it was drawn from.
const BODY={radius:.3,height:1.78,step:.3};
const STEP=.5;

const covers=(box,x,z,pad=0)=>Math.abs(x-box.x)<=box.w/2+pad&&Math.abs(z-box.z)<=box.d/2+pad;
function floorAt(x,z,walkways){
  let y=null;
  for(const w of walkways)if(covers(w,x,z)&&(y===null||w.y>y))y=w.y;
  return y;
}
function blocked(x,z,y){
  for(const s of net.solids){
    if(!covers(s,x,z,BODY.radius-.02))continue;
    if(s.y1>y+.05&&s.y0<y+BODY.height)return true;
  }
  return false;
}
// Every cell a body could stand in, and which of them join up.
function walkable(walkways){
  const open=new Map();
  const {min,max}=net.bounds;
  for(let x=min[0];x<=max[0];x+=STEP)for(let z=min[2];z<=max[2];z+=STEP){
    const y=floorAt(x,z,walkways);
    if(y===null||blocked(x,z,y))continue;
    open.set(`${x.toFixed(1)},${z.toFixed(1)}`,{x,z,y});
  }
  return open;
}
function reach(open,from){
  const start=nearest(open,from[0],from[1]);
  assert.ok(start,`nothing to stand on at ${from}`);
  const seen=new Set([`${start.x.toFixed(1)},${start.z.toFixed(1)}`]),queue=[start];
  while(queue.length){
    const at=queue.pop();
    for(const [dx,dz] of [[STEP,0],[-STEP,0],[0,STEP],[0,-STEP]]){
      const id=`${(at.x+dx).toFixed(1)},${(at.z+dz).toFixed(1)}`;
      if(seen.has(id))continue;
      const next=open.get(id);
      if(!next||Math.abs(next.y-at.y)>BODY.step)continue;
      seen.add(id);queue.push(next);
    }
  }
  return seen;
}
function nearest(open,x,z){
  let best=null,distance=Infinity;
  for(const cell of open.values()){const d=(cell.x-x)**2+(cell.z-z)**2;if(d<distance){distance=d;best=cell;}}
  return distance<=4?best:null;
}
const reached=(seen,open,x,z,within=1.6)=>{
  for(const id of seen){const cell=open.get(id);if((cell.x-x)**2+(cell.z-z)**2<=within*within)return true;}
  return false;
};

const OPEN=walkable(net.walkways),FROM_SPAWN=reach(OPEN,SPAWN);

test('the mine is one network: every destination is walkable from where you come in',()=>{
  assert.ok(OPEN.size>1200,`only ${OPEN.size} standable cells — this is a corridor, not a network`);
  for(const d of net.destinations)
    assert.ok(reached(FROM_SPAWN,OPEN,d.position[0],d.position[2]),`${d.id} cannot be walked to from the arrival`);
  // and the two things somebody scratched are reachable, not decoration
  // hanging in rock somewhere you cannot get to
  for(const egg of MINE_INSCRIPTIONS)
    assert.ok(reached(FROM_SPAWN,OPEN,egg.position[0],egg.position[2],2.2),`${egg.id} is unreachable`);
  for(const i of net.interactions)
    assert.ok(reached(FROM_SPAWN,OPEN,i.position[0],i.position[2],2.4),`nobody can reach "${i.label}"`);
});

test('you can stand where the host puts you down, with room over your head',()=>{
  for(const at of [SPAWN,...net.destinations.map(d=>[d.position[0],d.position[2]])]){
    const y=floorAt(at[0],at[1],net.walkways);
    assert.ok(y!==null,`nothing to stand on at ${at}`);
    assert.ok(!blocked(at[0],at[1],y),`${at} is inside something`);
    // and a full body's width of clear floor around it
    for(const [dx,dz] of [[.4,0],[-.4,0],[0,.4],[0,-.4]]){
      const near=floorAt(at[0]+dx,at[1]+dz,net.walkways);
      assert.ok(near!==null&&Math.abs(near-y)<=BODY.step,`the floor gives way ${dx},${dz} from ${at}`);
    }
  }
  const home=net.interactions.find(i=>i.destination===144);
  assert.ok(home,'no way back to Mechanical');
  assert.ok(Math.hypot(home.position[0]-SPAWN[0],home.position[2]-SPAWN[1])<1.5,'the way back is not at the arrival');
});

// A tree of dead ends is not a mine. Three ways lead north out of the switch
// chamber and a cross-cut joins them at the top; cutting any one of them has
// to leave the deep face reachable, and cutting all three has to cut it off.
// That is the difference between a loop and a corridor drawn in a circle.
test('the network holds a genuine loop, and it is those three routes that make it',()=>{
  const deep=net.destinations.find(d=>d.id==='mine-deep-face').position;
  const without=ids=>{
    const kept=net.walkways.filter(w=>!ids.includes(w.area));
    const open=walkable(kept);
    return reached(reach(open,SPAWN),open,deep[0],deep[2]);
  };
  assert.ok(without(['vent','cache','fan-step','fan']),'closing the ventilation gallery cuts off the deep face');
  assert.ok(without(['west-rise','pump']),'closing the west drive cuts off the deep face');
  assert.ok(without(['east-rise','collapse']),'closing the east drive cuts off the deep face');
  assert.ok(!without(['vent','cache','fan-step','fan','west-rise','pump','east-rise','collapse']),
    'the deep face is still reachable with all three routes closed, so they are not what connects it');
});

test('the collapsed branch is a real passage that really is blocked',()=>{
  const branch=MINE_AREAS.find(a=>a.id==='collapse');
  assert.ok(branch,'no collapsed branch');
  // You can walk into it from the east drive...
  assert.ok(reached(FROM_SPAWN,OPEN,branch.x0+2,22),'the closed branch cannot be entered, so it is a fake door');
  // ...and you cannot walk out the far end of it.
  assert.ok(!reached(FROM_SPAWN,OPEN,branch.x1+1.5,22,1.2),'the closed branch is not closed');
});

// The wall pass puts rock 30 cm inside the edge of every floor, so a body that
// can reach a spot always has ground under the whole of its footprint. Both
// halves of that are worth holding: nothing you can stand on is a lip, and
// nothing you can reach is outside the plan.
test('you cannot stand on a lip, and you cannot get outside the workings',()=>{
  const inside=(x,z)=>MINE_AREAS.some(a=>x>=a.x0&&x<=a.x1&&z>=a.z0&&z<=a.z1);
  let footprints=0;
  for(const id of FROM_SPAWN){
    const at=OPEN.get(id);
    assert.ok(inside(at.x,at.z),`a body can reach ${at.x},${at.z}, which is outside every area in the plan`);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=at.x+dx*(BODY.radius+.1),z=at.z+dz*(BODY.radius+.1),under=floorAt(x,z,net.walkways);
      assert.ok(under!==null&&Math.abs(under-at.y)<=BODY.step,
        `a body standing at ${at.x},${at.z} has nothing under its ${dx||dz>0?'':'-'}edge`);
      footprints++;
    }
  }
  assert.ok(footprints>4000,`only ${footprints} footprints examined`);
});

test('ids are unique and the three named destinations are there',()=>{
  const ids=net.destinations.map(d=>d.id);
  assert.equal(new Set(ids).size,ids.length,'two destinations share an id');
  for(const id of ['mine-junction','mine-pump','mine-deep-face'])assert.ok(ids.includes(id),`missing ${id}`);
  for(const d of net.destinations){
    assert.equal(d.position.length,3);
    assert.ok(d.position.every(Number.isFinite)&&Number.isFinite(d.yaw));
  }
  const areas=MINE_AREAS.map(a=>a.id);
  assert.equal(new Set(areas).size,areas.length,'two areas share an id');
  const chambers=net.chambers.map(c=>c.id);
  assert.equal(new Set(chambers).size,chambers.length);
  assert.deepEqual(chambers,areas,'the chamber list does not describe the network that was built');
  const actions=net.interactions.filter(i=>i.action).map(i=>i.action);
  assert.equal(new Set(MINE_INSCRIPTIONS.map(e=>e.id)).size,MINE_INSCRIPTIONS.length);
  assert.ok(actions.length>=4);
});

test('the geometry stays inside the bounds it declares, and inside its budget',()=>{
  const {min,max}=net.bounds,p=new THREE.Vector3();
  let meshes=0,triangles=0;
  net.root.updateMatrixWorld(true);
  net.root.traverse(o=>{
    if(!o.isMesh)return;
    meshes++;
    const g=o.geometry,position=g.getAttribute('position');
    triangles+=(g.index?g.index.count:position.count)/3*(o.count||1);
    for(let i=0;i<position.count;i+=7){
      p.fromBufferAttribute(position,i).applyMatrix4(o.matrixWorld);
      assert.ok(p.toArray().every(Number.isFinite),`${o.name}: non-finite vertex`);
      for(const axis of [0,1,2])
        assert.ok(p.getComponent(axis)>=min[axis]-.6&&p.getComponent(axis)<=max[axis]+.6,
          `${o.name} reaches ${p.toArray().map(v=>v.toFixed(1))}, outside the declared bounds`);
    }
  });
  assert.ok(meshes<45,`${meshes} mesh batches; the budget is 45`);
  assert.ok(triangles<350000,`${Math.round(triangles)} triangles; the budget is 350k`);
  // and the colliders are local to the anchor, for the host to translate
  for(const c of [...net.solids,...net.walkways])assert.equal(c.local,true,'a collider is not marked local');
});

test('the lights are fixed practicals: nothing directional, nothing casting, nothing following',()=>{
  const seen=[];
  net.root.traverse(o=>{if(o.isLight)seen.push(o);});
  assert.ok(seen.length>=8,'the mine is unlit');
  for(const light of seen){
    assert.ok(light.isPointLight,`${light.type} in the mine; practicals only`);
    assert.equal(light.castShadow,false,'a mine lamp casts shadows');
    assert.ok(Number.isFinite(light.distance)&&light.distance>0,'a mine lamp has unbounded reach');
  }
  assert.equal(new Set(net.lights).size,net.lights.length);
  // Nothing follows anybody: the positions do not move when update runs.
  const before=seen.map(l=>l.position.clone());
  for(let i=0;i<30;i++)net.update(1/60,i/60,{x:0,y:0,z:11},'balanced');
  seen.forEach((l,i)=>assert.ok(l.position.equals(before[i]),'a mine lamp moved with the player'));
});

test('update is optional, tolerant, and does not reallocate every frame',()=>{
  // A network that was never ticked still has to be a network.
  const still=buildMineNetwork(materials,{seed:99});
  assert.ok(still.root.children.length>0);
  assert.doesNotThrow(()=>still.update());
  assert.doesNotThrow(()=>still.update(0,0,null));
  assert.doesNotThrow(()=>still.update(NaN,0,{x:0,y:0,z:0},'low'));
  const cloth=net.root.getObjectByName('mine-airflow-cloth');
  assert.ok(cloth&&cloth.isInstancedMesh,'the airflow cloth should be one instanced batch, not one mesh a rag');
  const buffer=cloth.instanceMatrix.array;
  for(let i=0;i<120;i++)net.update(1/60,i/60,{x:0,y:0,z:30},'balanced');
  assert.equal(cloth.instanceMatrix.array,buffer,'update replaced the instance buffer instead of writing into it');
});
