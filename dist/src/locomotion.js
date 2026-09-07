import * as THREE from '../vendor/three.module.js';

const up=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(0,0,1),sideways=new THREE.Vector3(1,0,0);
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const cycle=t=>((t%1)+1)%1;
export const MOTION_CLIPS=Object.freeze({Idle:3.2,Walk:1.05,Run:.72,StairUp:1.2,StairDown:1.25,TurnLeft:1.4,TurnRight:1.4,Fall:1.4});

// One continuous gait for every supplied skeleton. Feet are solved from the
// actual joint lengths; changing pace never resets the phase of a planted leg.
export class SkeletalMotion{
  constructor(model,height){
    this.model=model;this.height=height;this.bones={};this.rest={};
    model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert(),mq=model.getWorldQuaternion(new THREE.Quaternion()).invert();
    model.traverse(b=>{if(b.isBone){this.bones[b.name]=b;this.rest[b.name]={p:b.position.clone(),q:b.quaternion.clone(),worldQ:mq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())),point:b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse)};}});
    this.legs=['L','R'].map(s=>{const hip=this.rest['Thigh'+s].point,knee=this.rest['Shin'+s].point,ankle=this.rest['Foot'+s].point;return {side:s,hip:hip.clone(),ankle:ankle.clone(),a:hip.distanceTo(knee),b:knee.distanceTo(ankle),anchor:null,stance:false,target:new THREE.Vector3(),error:0};});
    this.phase=0;this.time=0;this.weight=0;this.run=0;this.slope=0;this.air=0;this.unsupported=0;this.lastPosition=null;this.state='Idle';this.lastHeading=0;this.footContacts=[];this.stepCount=0;
  }
  reset(){this.lastPosition=null;this.weight=0;this.air=0;this.unsupported=0;this.stepCount=0;for(const leg of this.legs){leg.anchor=null;leg.stance=false;}}
  neutral(){for(const [name,b] of Object.entries(this.bones)){b.position.copy(this.rest[name].p);b.quaternion.copy(this.rest[name].q);}}
  rotate(name,angle,axis=sideways){
    const b=this.bones[name],r=this.rest[name];if(!b)return;
    const local=r.worldQ.clone().invert().multiply(new THREE.Quaternion().setFromAxisAngle(axis,angle)).multiply(r.worldQ);b.quaternion.multiply(local);
  }
  setWorldQuaternion(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);}
  aim(b,child,target){
    const p=b.getWorldPosition(new THREE.Vector3()),a=child.getWorldPosition(new THREE.Vector3()).sub(p).normalize(),to=target.clone().sub(p).normalize();
    const q=new THREE.Quaternion().setFromUnitVectors(a,to).multiply(b.getWorldQuaternion(new THREE.Quaternion()));this.setWorldQuaternion(b,q);
  }
  solve(leg,target,footQuaternion){
    const thigh=this.bones['Thigh'+leg.side],shin=this.bones['Shin'+leg.side],foot=this.bones['Foot'+leg.side],hip=thigh.getWorldPosition(new THREE.Vector3());
    const delta=target.clone().sub(hip),distance=clamp(delta.length(),.08,leg.a+leg.b-.0002),direction=delta.normalize();
    const bend=forward.clone().applyQuaternion(this.model.getWorldQuaternion(new THREE.Quaternion()));bend.addScaledVector(direction,-bend.dot(direction)).normalize();
    const along=(leg.a*leg.a-leg.b*leg.b+distance*distance)/(2*distance),lift=Math.sqrt(Math.max(0,leg.a*leg.a-along*along));
    const knee=hip.clone().addScaledVector(direction,along).addScaledVector(bend,lift);
    this.aim(thigh,shin,knee);this.aim(shin,foot,hip.clone().addScaledVector(direction,distance));this.setWorldQuaternion(foot,footQuaternion);
    leg.error=foot.getWorldPosition(new THREE.Vector3()).distanceTo(target);leg.target.copy(target);
  }
  pose({phase=this.phase,weight=this.weight,run=this.run,slope=this.slope,turn=0,air=0,ground=null,dt=0,lock=false}={}){
    this.neutral();const h=this.height,p=phase*Math.PI*2,stance=lerp(.60,.54,run),reach=lerp(.215,.30,run)*h*weight;
    const hips=this.bones.Hips;hips.position.y-=h*lerp(.027,.057,run)*weight;
    hips.position.y-=h*.012*air;
    hips.position.x+=Math.sin(this.time*Math.PI*2/3.2)*h*.003*(1-weight);
    this.rotate('Hips',Math.sin(p)*.022*weight,up);
    this.rotate('Spine',-.025*weight-.10*run-.065*Math.max(0,slope)*weight);
    this.rotate('Spine',Math.sin(p)*-.016*weight,forward);
    this.rotate('Chest',Math.sin(p)*-.034*weight+clamp(turn,-1,1)*.035,up);
    this.rotate('Chest',-.055*run);
    this.rotate('Chest',Math.sin(this.time*Math.PI*2/3.2)*.003);
    this.rotate('Head',Math.sin(this.time*Math.PI*2/3.2+.7)*.009,up);
    this.rotate('Neck',.012*weight);
    for(const [i,leg] of this.legs.entries()){
      const t=cycle(phase+i*.5),on=t<stance,u=on?t/stance:(t-stance)/(1-stance);
      let z=on?reach*(1-2*u):reach*(-1+2*ease(u));
      const lift=on?0:Math.sin(Math.PI*u)**1.5*h*lerp(.044,.10,run)*weight;
      const ankle=leg.ankle.clone();ankle.z+=z;ankle.y+=lift+Math.max(0,slope)*h*.045*(on?0:Math.sin(Math.PI*u))*weight;
      ankle.x+=Math.sin(p+i*Math.PI)*turn*.012*h*weight;
      if(air){ankle.y+=h*.08*air;ankle.z-=h*.035*air;}
      this.model.updateWorldMatrix(true,true);const goal=ankle.applyMatrix4(this.model.matrixWorld);
      const canLock=lock&&weight>.45&&air<.10;
      if(ground&&air<.10){
        const floor=ground(goal.x,goal.z);if(Number.isFinite(floor))goal.y=floor+leg.ankle.y+lift+Math.max(0,slope)*h*.045*(on?0:Math.sin(Math.PI*u))*weight;
        if(canLock&&on){
          if(!leg.stance||!leg.anchor||leg.anchor.distanceTo(goal)>.55){leg.anchor=goal.clone();}
          goal.x=leg.anchor.x;goal.z=leg.anchor.z;
          const anchorFloor=ground(goal.x,goal.z);if(Number.isFinite(anchorFloor))goal.y=anchorFloor+leg.ankle.y;
        }else leg.anchor=null;
      }
      leg.justLanded=canLock&&on&&!leg.stance;leg.stance=canLock&&on;
      const q=this.model.getWorldQuaternion(new THREE.Quaternion()).multiply(this.rest['Foot'+leg.side].worldQ);
      leg.goal={goal,q,swing:reach>1e-5?z/reach:0,i};
    }
    // Lower the pelvis only as much as the measured limbs require. This lets
    // the trailing foot stay on a lower tread instead of stretching the knee
    // or lifting the heel through the air as the capsule climbs a step.
    let drop=0;
    for(const leg of this.legs){const hip=this.bones['Thigh'+leg.side].getWorldPosition(new THREE.Vector3()),goal=leg.goal.goal,flat=(hip.x-goal.x)**2+(hip.z-goal.z)**2,vertical=Math.sqrt(Math.max(.01,(leg.a+leg.b-.004)**2-flat));drop=Math.max(drop,hip.y-goal.y-vertical);}
    hips.position.y-=Math.min(h*.19,Math.max(0,drop));this.model.updateWorldMatrix(true,true);
    for(const leg of this.legs){
      const {goal,q,swing,i}=leg.goal;this.solve(leg,goal,q);
      // Arms oppose the advancing leg. Elbows remain soft and wrists follow,
      // while a small inward adjustment removes the old spread-arm silhouette.
      this.rotate('UpperArm'+leg.side,(.36+.22*run)*swing*weight-.12*air);
      this.rotate('UpperArm'+leg.side,(i===0?-1:1)*.17,forward);
      this.rotate('Forearm'+leg.side,-.22-1.03*run*weight-.08*Math.max(0,-swing)*weight-.18*air);
      this.rotate('Hand'+leg.side,.04*weight*swing);
      this.rotate('Coat'+leg.side,clamp(-swing*.075*weight-.025*run,-.12,.12));
    }
    this.model.updateWorldMatrix(true,true);
    this.footContacts=this.legs.map(l=>({side:l.side,planted:l.stance,position:l.target.clone(),error:l.error}));
  }
  sample(name,time){
    const phase=time/MOTION_CLIPS[name];this.time=phase*3.2;const run=name==='Run'?1:0,walking=['Walk','Run','StairUp','StairDown','TurnLeft','TurnRight'].includes(name);
    this.pose({phase,weight:walking?(name.startsWith('Turn')?.35:1):0,run,slope:name==='StairUp'?.5:name==='StairDown'?-.5:0,turn:name==='TurnLeft'?-1:name==='TurnRight'?1:0,air:name==='Fall'?1:0});
  }
  update(dt,{speed=0,position,grounded=true,heading=0,ground=null,active=true}={}){
    this.time+=dt;
    const teleported=!this.lastPosition||this.lastPosition.distanceTo(position)>2.5;
    if(teleported){this.reset();this.lastPosition=position.clone();this.lastHeading=heading;}
    const distance=Math.hypot(position.x-this.lastPosition.x,position.z-this.lastPosition.z),vertical=position.y-this.lastPosition.y;
    const turn=dt?Math.atan2(Math.sin(heading-this.lastHeading),Math.cos(heading-this.lastHeading))/dt:0;
    this.weight=THREE.MathUtils.damp(this.weight,active&&speed>.025?clamp(speed/.8,0,1):0,9,dt);
    this.run=THREE.MathUtils.damp(this.run,ease((speed-2.05)/1.8),7,dt);
    this.slope=THREE.MathUtils.damp(this.slope,distance>.004?clamp(vertical/distance,-.8,.8):0,5,dt);
    const stride=2*lerp(.215,.30,this.run)*this.height/lerp(.60,.54,this.run);
    if(active&&!teleported)this.phase=cycle(this.phase+distance/stride);
    this.unsupported=grounded?0:this.unsupported+dt;this.air=THREE.MathUtils.damp(this.air,this.unsupported>.14?1:0,12,dt);
    this.state=this.air>.3?'Fall':this.weight<.08?'Idle':this.slope>.16?'StairUp':this.slope<-.16?'StairDown':this.run>.5?'Run':Math.abs(turn)>1.5?'Turn':'Walk';
    this.pose({turn,air:this.air,ground,dt,lock:active});
    this.stepCount+=this.legs.filter(l=>l.justLanded).length;
    this.lastPosition.copy(position);this.lastHeading=heading;
  }
}
