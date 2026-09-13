import * as THREE from '../vendor/three.module.js';
import { SILO, STAIR_SWEEP, landingAngle, landingPoint, levelY, stairStepY, stairHeight, levelAt } from './data.js';
import { createResident, poseResident } from './resident-model.js';
import { CROWD_APPEARANCES } from './resident-data.js';
import { residentName } from './resident-stories.js';
import { assignWorkday, workAt } from './workday.js';
import { attachWorkProps, showWorkProps, deliveryCounter } from './work-props.js';

const V=(x,y,z)=>new THREE.Vector3(x,y,z),routeCache=new Map();
const landing=(n,r,lane=0)=>{const p=landingPoint(n,r,lane);return V(p.cx,levelY(n),p.cz);};
// Separate up/down lanes, with parcel handovers on the gallery end of a bridge.
// Routes are sampled from the real stair rise and bearing, never a vertical lift.
export function deliveryRoute(upper,lower){
  const key=upper+':'+lower;if(routeCache.has(key))return routeCache.get(key);
  const nodes=[];const add=(p,hold=0,event=null)=>nodes.push({p,hold,event});
  const flight=(n,up,r)=>{for(let j=0;j<=SILO.stairSteps;j++){const k=up?j:SILO.stairSteps-j,a=landingAngle(n)+k/SILO.stairSteps*STAIR_SWEEP;add(V(Math.cos(a)*r,levelY(n)+stairStepY(k-.5),Math.sin(a)*r));}};
  add(landing(upper,21.25,2.55),9,'collect');add(landing(upper,19,.7));add(landing(upper,6.15,.7));add(landing(upper,6.15));
  for(let n=upper+1;n<=lower;n++)flight(n,false,6.15);
  add(landing(lower,6.15,-.7));add(landing(lower,19,-.7));add(landing(lower,21.25,-2.55),11,'deliver');add(landing(lower,19,-.7));add(landing(lower,5.15,-.7));add(landing(lower,5.15));
  for(let n=lower;n>upper;n--)flight(n,true,5.15);
  add(landing(upper,5.15,.7));add(landing(upper,19,.7));add(landing(upper,21.25,2.55));
  let duration=0;const segments=[];
  for(let i=0;i<nodes.length;i++){
    const a=nodes[i],b=nodes[(i+1)%nodes.length];
    if(a.hold){segments.push({start:duration,end:duration+a.hold,a:a.p,b:a.p,event:a.event,speed:0});duration+=a.hold;}
    const distance=Math.hypot(a.p.x-b.p.x,a.p.z-b.p.z);
    if(distance>.0001){const speed=Math.abs(a.p.y-b.p.y)>.001?2.35:1.5,seconds=distance/speed;segments.push({start:duration,end:duration+seconds,a:a.p,b:b.p,event:null,speed});duration+=seconds;}
  }
  const route={upper,lower,segments,duration,deliveryEnd:segments.find(s=>s.event==='deliver').end};routeCache.set(key,route);return route;
}
export function sampleDelivery(route,seconds){
  const t=((seconds%route.duration)+route.duration)%route.duration;
  let lo=0,hi=route.segments.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(route.segments[mid].end<=t)lo=mid+1;else hi=mid;}
  const s=route.segments[lo],u=(t-s.start)/(s.end-s.start),position=s.a.clone().lerp(s.b,u);
  if(Math.hypot(position.x,position.z)<SILO.stairRadius){const y=stairHeight(position.x,position.z,position.y);if(y!=null&&Math.abs(y-position.y)<.4)position.y=y;}
  return {position,speed:s.speed,event:s.event,loaded:t<route.deliveryEnd,heading:Math.atan2(s.b.x-s.a.x,s.b.z-s.a.z),progress:t/route.duration};
}
export function porterRecords(){
  const records=[];
  for(let upper=1;upper<144;upper+=2)for(let shift=0;shift<3;shift++){
    const seed=upper*113+shift*31,id=`delivery-${upper}-${shift}`,roster=assignWorkday({id,seed,kind:'porter',level:upper,shift});
    const route=deliveryRoute(upper,Math.min(144,upper+2));
    const cargo=['repair fittings','clean work clothes','clinic supplies','lesson materials','kitchen parcels','reclaimed fasteners'][seed%6];
    roster.station=`relay between Levels ${upper} and ${route.lower}`;roster.specialty='Stair porter';roster.title='Stair porter';roster.cargo=cargo;roster.tasks=[`Collecting ${cargo}`,`Delivering ${cargo}`,`Returning signed receipts`];
    records.push({id,seed,roster,route,seconds:(seed%97)/97*route.duration,delivered:0,lastEvent:null,position:new THREE.Vector3(),state:null});
  }
  return records;
}
export class PorterTraffic{
  constructor(scene,world){this.scene=scene;this.world=world;this.records=porterRecords();this.actors=new Map();this.interactions=[];this.events=[];this.time=0;this.count=0;this.receipts=new Map();}
  remove(id){const a=this.actors.get(id);if(!a)return;a.root.removeFromParent();a.model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.dispose();if(o.isInstancedMesh)o.dispose();});this.actors.delete(id);}
  update(dt,body,schedule,talkingTo=null,watch=false){
    this.time+=dt;this.interactions=[];this.events=[];
    this.ensureCounters();
    const allowed=!this.world.outside&&!this.world.special&&!watch,near=[];
    for(const r of this.records){
      const duty=workAt(r.roster,schedule?.hour??8.4),previous=sampleDelivery(r.route,r.seconds),actor=this.actors.get(r.id);
      const yielding=actor&&actor.root.position.distanceTo(body.position)<.85;
      // Finish a flight before taking a break; never vanish halfway upstairs.
      const moving=duty.onDuty||previous.event===null;
      if(moving&&!yielding&&talkingTo!==r.id&&!watch)r.seconds+=Math.min(dt,.2);
      const sample=sampleDelivery(r.route,r.seconds);r.position.copy(sample.position);
      r.state={...duty,onRoute:sample.event===null,task:sample.event==='collect'?`Collecting ${r.roster.cargo} on Level ${r.route.upper}`:sample.event==='deliver'?`Handing over ${r.roster.cargo} on Level ${r.route.lower}`:sample.loaded?`Delivering ${r.roster.cargo} to Level ${r.route.lower}`:`Returning signed receipts to Level ${r.route.upper}`};
      if(!duty.onDuty&&sample.event)r.state.task=duty.task;
      if(sample.event!=='deliver'&&r.lastEvent==='deliver'){r.delivered++;this.receipts.set(r.route.lower,this.time);if(actor)this.events.push({id:'gate',position:r.position.clone()});}
      r.lastEvent=sample.event;r.sample=sample;r.moving=moving&&!yielding&&talkingTo!==r.id;
      const distance=r.position.distanceTo(body.position);
      if(allowed&&distance<48&&(duty.onDuty||sample.event===null||actor))near.push({r,distance});
    }
    const budget={low:3,balanced:5,high:8}[this.world.quality]||5;
    near.sort((a,b)=>a.distance-b.distance);const keep=new Set(near.slice(0,budget).map(x=>x.r.id));
    for(const id of this.actors.keys())if(!keep.has(id))this.remove(id);
    for(const {r,distance} of near.slice(0,budget)){
      let a=this.actors.get(r.id);
      if(!a){const index=r.seed%CROWD_APPEARANCES.length,definition={id:`delivery-body-${index}`,name:residentName(r.seed),role:'Stair porter',height:1.72,appearance:CROWD_APPEARANCES[index]};a=createResident(definition);a.root.position.copy(r.position);a.heading=r.sample.heading;a.root.rotation.y=a.heading;attachWorkProps(a,this.world.m,r.roster);this.scene.add(a.root);this.actors.set(r.id,a);}
      a.root.position.copy(r.position);
      // The rendered body eases over risers; IK still samples the actual treads.
      a.visualY=a.visualY==null?r.position.y:THREE.MathUtils.damp(a.visualY,r.position.y,22,dt);a.root.position.y=a.visualY;
      const target=talkingTo===r.id?Math.atan2(body.position.x-r.position.x,body.position.z-r.position.z):r.sample.speed?r.sample.heading:a.heading;
      a.heading+=Math.atan2(Math.sin(target-a.heading),Math.cos(target-a.heading))*(1-Math.exp(-12*dt));a.root.rotation.y=a.heading;
      a.ground=(x,z)=>{const floor=this.world.colliders.floorAt(x,z,.03,r.position.y+.35);return Number.isFinite(floor)&&Math.abs(floor-r.position.y)<.5?floor:r.position.y;};
      const speed=r.moving?r.sample.speed:0;poseResident(a,talkingTo===r.id?'talk':speed>.01?'walk':r.state.onDuty?'work':'idle',this.time,dt,speed);
      showWorkProps(a,r.roster,r.state,speed<.01,r.sample.loaded);
      if(speed>0&&a.motion.stepCount!==a.lastStep){a.lastStep=a.motion.stepCount;if(distance<22)this.events.push({id:r.position.y>body.position.y?'steps-above':'steps-below',position:r.position.clone(),steps:1,interval:.4});}
      if(distance<4.5)this.interactions.push({position:r.position.clone().add(V(0,1.25,0)),label:`Talk to ${a.definition.name}`,hint:r.state.task,action:`resident-${r.id}`,actor:r.id,resident:{...a.definition,id:r.id,kind:'porter',level:levelAt(r.position.y),workday:r.roster,currentWork:r.state}});
      a.root.updateMatrixWorld(true);
    }
    this.count=this.actors.size;
  }
  ensureCounters(){
    for(const [level,entry] of this.world.loaded){
      if(!entry.dispatchCounters){
        entry.dispatchCounters=[];entry.dispatchSolids=[];
        // These are relay stops, not a new room or a route through a locked door.
        for(const side of [1,-1]){
          if(side===1&&(level%2===0||level===144)||side===-1&&(level<3||level%2===0&&level!==144))continue;
          const p=landingPoint(level,22.1,side*2.55),counter=deliveryCounter(this.world.m);
          counter.position.set(p.cx,0,p.cz);counter.rotation.y=-landingAngle(level);entry.root.add(counter);entry.dispatchCounters.push({counter,side});
          const solid={cx:p.cx,cz:p.cz,halfX:.4,halfZ:.44,rotationY:-landingAngle(level),minY:levelY(level),maxY:levelY(level)+.87};entry.dispatchSolids.push(solid);if(!this.world.special)this.world.colliders.addOrientedBox(solid);
        }
      }
      for(const {counter,side} of entry.dispatchCounters)counter.userData.parcel.visible=side>0||this.time-(this.receipts.get(level)??-Infinity)<60;
    }
  }
  actorPosition(id){return this.actors.get(id)?.root.position.clone()||null;}
}
