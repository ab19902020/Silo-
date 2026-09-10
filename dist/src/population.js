import * as THREE from '../vendor/three.module.js';
import { SILO, TAU, levelY, roomType, landingAngle, landingPoint } from './data.js';
import { roomPoint } from './characters.js';
import { topPoint } from './surface.js';
import { CharacterBody } from './physics.js';
import { RESIDENT_CAST, CROWD_APPEARANCES } from './resident-data.js';
import { createResident, poseResident } from './resident-model.js';

export const CROWD_LIMITS=Object.freeze({low:28,balanced:48,high:72});
const unit=new THREE.Vector3(),desired=new THREE.Vector3();
export function clearResidentSpot(world,p,r=.28){
  return !world.colliders.contains(p.x,p.z,r,p.y+.06,p.y+1.87)&&Math.abs(world.colliders.floorAt(p.x,p.z,r,p.y+.25)-p.y)<.06;
}
export function safeResidentSpot(world,p){
  if(clearResidentSpot(world,p))return p.clone();
  for(let r=.6;r<=3.6;r+=.6)for(let j=0;j<12;j++){
    const q=p.clone().add(new THREE.Vector3(Math.cos(j*TAU/12)*r,0,Math.sin(j*TAU/12)*r));if(clearResidentSpot(world,q))return q;
  }
  return null;
}
function clearSegment(world,a,b){
  const n=Math.ceil(a.distanceTo(b)/.35);
  for(let i=1;i<=n;i++)if(!clearResidentSpot(world,a.clone().lerp(b,i/n)))return false;
  return true;
}

// Persistent lightweight records exist for every numbered level. Only nearby
// residents acquire a GPU skeleton; nobody is simulated 1.4 km out of view.
export function populationRecords(level){
  if(['excavator','tunnel','silo17','pipe-gallery'].includes(level))return [];
  const records=[],y=levelY(level);
  const add=(position,extra={})=>{const i=records.length;records.push({id:`resident-${level}-${i}`,position,seed:level*197+i*37,level,kind:'resident',activity:'idle',...extra});};
  if(level==='generator'||level==='mines'){
    const generator=level==='generator';
    const stations=generator?[[-15,52,-17.5],[-10,52,-17.5],[10,52,-17.5],[15,52,-17.5],[-11.7,62.22,2],[11.7,62.22,2]]:[[102.5,48,-8],[111,48,10],[84,48,20],[126,48,28]];
    stations.forEach((p,i)=>add(new THREE.Vector3(...p),{kind:generator?'engineer':'miner',activity:'work',heading:generator?Math.PI:i%2?0:Math.PI/2,seed:18000+i*41}));
    const routes=generator?[[[-20,52,7],[-20,52,-8]],[[-8,52,20],[8,52,20]],[[20,52,-8],[20,52,7]]]:[[[102.5,48,-26],[102.5,48,-13]],[[102.5,48,21],[102.5,48,37]]];
    routes.forEach((route,i)=>add(new THREE.Vector3(...route[0]),{kind:generator?'engineer':'miner',activity:'walk',seed:19000+i*31,
      stops:route.map((p,j)=>({p:new THREE.Vector3(...p),pose:j%2?'work':'idle',hold:j%2?6:3}))}));
    return records;
  }
  // A routine is a ring of stops. At each one a resident does something for a
  // while — leans on the well rail and watches the shaft, waits at a wing door,
  // talks to whoever is there — and then walks on. Standing on one spot for the
  // whole game is not a routine, and neither is orbiting the gallery for ever,
  // which between them was every resident on all 144 floors.
  const ring=(a,radius)=>new THREE.Vector3(Math.cos(a)*radius,y,Math.sin(a)*radius);
  const at=(a,radius,pose,hold,face)=>({p:ring(a,radius),pose,hold,face});
  const rail=a=>at(a,19.35,'watch',7+((level*7+a*11)%5),new THREE.Vector3(0,y,0));   // the well
  const door=(wing,pose,hold)=>at(wing*TAU/6,24.15,pose,hold);
  const bridge=x=>{const {cx,cz}=landingPoint(level,x,0);return {p:new THREE.Vector3(cx,y,cz),pose:'idle',hold:4};};
  // Porters carry loads between floors: round the gallery, calling at two wing
  // doors, then out along the bridge to the stairs and back the other way.
  for(let i=0;i<4;i++){
    const start=i*TAU/4+.3,dir=i%2?1:-1;
    add(ring(start,i%2?20.4:22.1),{kind:'porter',activity:'walk',stops:[
      at(start,i%2?20.4:22.1,'idle',2),
      door((i*2+1)%6,'work',7+i),
      at(start+dir*TAU/6,21.6,'idle',2),
      door((i*2+3)%6,'work',6),
      at(start+dir*TAU/3,20.6,'idle',3),
      bridge(11.5),bridge(16.5),
      at(start+dir*TAU/2,22.4,'idle',4),
    ]});
  }
  // Residents of the floor, going about it: the rail, a neighbour's door, the
  // bridge, the rail on the far side.
  for(let i=0;i<9;i++){
    const a=i*TAU/9+.9,wing=(i*2+1)%6;
    add(ring(a,21.4),{kind:'resident',activity:'walk',stops:[
      rail(a),
      door(wing,i%3?'talk':'idle',9+i),
      at(a+TAU/6,22.6,i%2?'talk':'idle',6),
      rail(a+TAU/3),
      at(a+TAU/2,20.7,'idle',5),
    ]});
  }
  for(let wing=0;wing<6;wing++){
    if(level===1&&wing===0)continue;const type=roomType(level,wing);
    const works=['workshop','mechanical','farm','medical','it','recycling','water','laundry'].includes(type);
    // One of the two stays at the bench; the other works the room.
    add(roomPoint(level,wing,3.1,5.5),{wing,activity:works?'work':'talk',kind:type});
    add(roomPoint(level,wing,-3.1,11.5),{wing,kind:type,activity:'walk',stops:[
      {p:roomPoint(level,wing,-3.1,11.5),pose:works?'work':'idle',hold:11},
      {p:roomPoint(level,wing,3.4,13.5),pose:'idle',hold:5},
      {p:roomPoint(level,wing,-2.2,5.2),pose:works?'work':'talk',hold:10},
      {p:roomPoint(level,wing,2.6,8.5),pose:'idle',hold:4},
    ]});
  }
  if(level===1){
    for(const z of [12.8,17,22,27,32])for(const x of [-11,-5,2,9])for(const dx of [-1.05,1.05]){
      // Leave the book table and the adjacent player's approach unoccupied.
      if(z===32&&x===2)continue;
      add(topPoint(x+dx,0,z-1.15),{kind:'diner',activity:'sit',heading:Math.PI/2,seat:true});
    }
    const paths=[[-15,14.7],[-15,35.2],[-.8,35.2],[-.8,14.7],[14.5,14.7],[14.5,35.2],[5.6,35.2],[5.6,14.7]];
    for(let i=0;i<8;i++)add(topPoint(...[paths[i][0],0,paths[i][1]]),{kind:'cafeteria',activity:'walk',
      stops:paths.slice(i).concat(paths.slice(0,i)).map(([x,z],j)=>({p:topPoint(x,0,z),pose:j%3===0?'talk':'idle',hold:j%2?3:7}))});
  }
  if(level===100)for(let i=0;i<16;i++)add(roomPoint(level,0,(i%4-1.5)*3,5+Math.floor(i/4)*4),{kind:'bazaar',activity:i%3?'talk':'work',wing:0});
  for(const def of RESIDENT_CAST.filter(d=>!d.story&&(d.level===level||level===1&&d.opening))){
    const position=level===1?(def.top?topPoint(def.top[0],0,def.top[1]):topPoint(-15,0,35)):roomPoint(level,def.wing,def.id==='shirley'?-3.2:2.8,def.id==='cooper'?12:7);
    add(position,{id:def.id,definition:def,kind:'named',activity:def.activity==='read'?'idle':def.activity||'idle',wing:def.wing,heading:level===1?Math.PI/2:Math.PI/2-def.wing*TAU/6});
  }
  return records;
}

export class Population{
  constructor(scene,world){this.scene=scene;this.world=world;this.records=new Map();this.actors=new Map();this.level=null;this.time=0;this.rebalance=0;this.watch=false;this.count=0;this.talkingTo=null;this.total=[...Array.from({length:144},(_,i)=>i+1),'generator','mines'].reduce((total,level)=>total+populationRecords(level).length,0);}
  load(level){
    for(const actor of this.actors.values())this.remove(actor);this.actors.clear();this.level=level;
    if(!this.records.has(level)){
      const placed=populationRecords(level).map(r=>({...r,position:r.seat?r.position:safeResidentSpot(this.world,r.position)})).filter(r=>r.position);
      for(const r of placed){
        r.home=r.position.clone();r.wait=(r.seed%17)*.31;r.goal=r.seed%7;r.holding='idle';
        if(r.stops){r.stops=r.stops.map(s=>({...s,p:safeResidentSpot(this.world,s.p)})).filter(s=>s.p);if(r.stops.length<2)r.activity='idle';}
      }
      this.records.set(level,placed);
    }
    this.rebalance=0;
  }
  remove(actor){actor.root.removeFromParent();actor.model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();});}
  spawn(r){
    const index=r.seed%CROWD_APPEARANCES.length;
    const definition=r.definition||{id:`crowd-${index}`,name:r.kind==='porter'?'Silo porter':r.kind==='diner'?'Cafeteria resident':r.kind==='bazaar'?'Market resident':`${r.kind[0].toUpperCase()+r.kind.slice(1)} worker`,height:1.63+(index%5)*.045,appearance:CROWD_APPEARANCES[index]};
    const actor=createResident(definition);actor.record=r;actor.root.position.copy(r.position);actor.root.rotation.y=r.heading??(r.seed%628)/100;actor.heading=actor.root.rotation.y;actor.body=new CharacterBody({radius:.26,standHeight:definition.height,stepHeight:.3});actor.body.teleport(r.position.x,r.position.y,r.position.z);actor.tick=0;this.scene.add(actor.root);this.actors.set(r.id,actor);return actor;
  }
  update(dt,body,watch=false,selected=null){
    this.time+=dt;this.watch=watch;this.world.residentInteractions=[];
    if(this.world.outside||['excavator','tunnel','silo17','pipe-gallery'].includes(this.world.special)){for(const a of this.actors.values())a.root.visible=false;this.count=0;return;}
    const level=this.world.special||this.world.activeLevel;if(this.level!==level)this.load(level);
    const records=this.records.get(this.level),limit=CROWD_LIMITS[this.world.quality]||48;
    this.rebalance-=dt;
    if(this.rebalance<=0){
      this.rebalance=.8;
      const order=records.filter(r=>r.id!==selected).sort((a,b)=>(a.position.distanceToSquared(body.position)-(a.definition?900:0))-(b.position.distanceToSquared(body.position)-(b.definition?900:0))),keep=new Set(order.slice(0,limit).map(r=>r.id));
      for(const [id,a] of this.actors)if(!keep.has(id)){this.remove(a);this.actors.delete(id);}
      for(const r of order.slice(0,limit))if(!this.actors.has(r.id))this.spawn(r);
    }
    this.count=this.actors.size;
    for(const a of this.actors.values()){
      const r=a.record,dist=a.root.position.distanceTo(body.position);a.root.visible=r.id!==selected;if(!a.root.visible)continue;
      const cafeteria=this.level===1&&r.position.x>SILO.deckOuter&&-r.position.z<18&&r.position.x<SILO.deckOuter+40;
      const watching=watch&&cafeteria;a.tick+=dt;
      if(dist<5)this.world.residentInteractions.push({position:a.root.position.clone().add(new THREE.Vector3(0,1.25,0)),label:`Talk to ${a.definition.name}`,hint:a.definition.role||'Silo resident',action:`resident-${r.id}`,actor:r.id,resident:{...a.definition,kind:r.kind}});
      const interval=r.id===this.talkingTo?0:dist<16?1/30:dist<40?1/15:1/8;if(a.tick<interval)continue;const step=Math.min(a.tick,.15);a.tick=0;
      let pose=r.activity,speed=0;desired.set(0,0,0);
      // Whoever you are talking to stops what they were doing and turns to
      // face you, and stays turned until you walk away. Being addressed by
      // somebody who carries on walking away up the gallery is not a
      // conversation, and there was no way to tell who had heard you.
      if(r.id===this.talkingTo){
        r.wait=Math.max(r.wait,.7);r.holding='talk';pose='talk';
        const want=Math.atan2(body.position.x-a.root.position.x,body.position.z-a.root.position.z);
        const delta=Math.atan2(Math.sin(want-a.root.rotation.y),Math.cos(want-a.root.rotation.y));
        a.root.rotation.y+=delta*(1-Math.exp(-6*step));
      }
      if(watching){pose=r.seat?'sit':'watch';a.root.rotation.y=THREE.MathUtils.damp(a.root.rotation.y,Math.PI/2,4,step);}
      else if(r.activity==='walk'&&r.id!==this.talkingTo){
        let target,facing=null;
        const here=r.stops?.[r.goal%r.stops.length];
        if(here){
          if(r.wait>0){r.wait=Math.max(0,r.wait-step);pose=r.holding;facing=r.facing;}
          else if(here.p.distanceTo(r.position)<.5){r.wait=here.hold??5;r.holding=here.pose||'idle';r.facing=here.face||null;r.goal++;pose=r.holding;facing=r.facing;}
          else target=here.p;
        }
        if(facing){const want=Math.atan2(facing.x-r.position.x,facing.z-r.position.z),delta=Math.atan2(Math.sin(want-a.root.rotation.y),Math.cos(want-a.root.rotation.y));a.root.rotation.y+=delta*(1-Math.exp(-4*step));}
        if(target&&r.wait<=0){
          desired.copy(target).sub(r.position).setY(0);if(desired.length()>0)desired.normalize().multiplyScalar(1.06+(r.seed%9)*.042);   // an unhurried indoor walk, not a shuffle
          // Residents yield to the player and one another, then keep walking.
          for(const other of this.actors.values())if(other!==a){unit.copy(a.root.position).sub(other.root.position).setY(0);const d=unit.length();if(d>0&&d<.85)desired.addScaledVector(unit,Math.min(1.4,(.85-d)*1.6)/d);}
          unit.copy(a.root.position).sub(body.position).setY(0);const d=unit.length();if(d>0&&d<1.25)desired.addScaledVector(unit,(1.25-d)*1.5/d);
          if(desired.length()>1)desired.normalize();
        }
        r.wait=Math.max(0,r.wait-step);
        for(let t=0;t<step;t+=1/60)a.body.step(Math.min(1/60,step-t),desired,this.world.colliders);
        speed=a.body.horizontalSpeed;a.root.position.copy(a.body.position);r.position.copy(a.body.position);
        if(speed>.04){const heading=Math.atan2(a.body.velocity.x,a.body.velocity.z),delta=Math.atan2(Math.sin(heading-a.root.rotation.y),Math.cos(heading-a.root.rotation.y));a.root.rotation.y+=delta*(1-Math.exp(-7*step));}else if(pose==='walk')pose='idle';
        // A closed door or furniture blocks the route; choose a reachable
        // neighbour after a pause rather than teleporting through it.
        if(speed<.035&&desired.length()>.2){r.blocked=(r.blocked||0)+step;if(r.blocked>2){r.wait=1.5;r.holding='idle';r.blocked=0;if(r.stops){const candidates=r.stops.map((s,i)=>({s,i})).filter(v=>v.s.p.distanceTo(r.position)>.6&&clearSegment(this.world,r.position,v.s.p));if(candidates.length)r.goal=candidates[(r.seed+r.goal)%candidates.length].i;}}}
        else r.blocked=0;
      }
      if(a.pose!==pose){a.poseFrom=Object.fromEntries(Object.entries(a.motion.bones).map(([n,b])=>[n,{q:b.quaternion.clone(),p:b.position.clone()}]));a.pose=pose;a.poseMix=0;}
      a.ground=(x,z)=>this.world.colliders.floorAt(x,z,.08,a.root.position.y+.3);
      poseResident(a,pose,this.time+r.seed*.37,step,speed);
      if(a.poseFrom){a.poseMix=Math.min(1,a.poseMix+step/.28);const t=a.poseMix*a.poseMix*(3-2*a.poseMix);for(const [n,b] of Object.entries(a.motion.bones)){const old=a.poseFrom[n];b.quaternion.copy(old.q.clone().slerp(b.quaternion,t));b.position.copy(old.p.clone().lerp(b.position,t));}if(t>=1)a.poseFrom=null;a.model.updateWorldMatrix(true,true);}

    }
  }
  actorPosition(id){const a=this.actors.get(id);return a?a.root.position.clone():null;}
  separatePlayer(body){
    if(this.world.outside||['excavator','tunnel','silo17','pipe-gallery'].includes(this.world.special))return;
    for(const a of this.actors.values()){
      if(!a.root.visible||Math.abs(a.root.position.y-body.position.y)>.4)continue;
      const delta=body.position.clone().sub(a.root.position).setY(0),dist=delta.length();if(dist>=.53||dist<.0001)continue;
      const candidate=body.position.clone().addScaledVector(delta,(.53-dist)/dist);
      if(clearResidentSpot(this.world,candidate,body.radius))body.position.copy(candidate);
    }
  }
}
