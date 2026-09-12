import * as THREE from '../vendor/three.module.js';

const up=new THREE.Vector3(0,1,0),forward=new THREE.Vector3(0,0,1),sideways=new THREE.Vector3(1,0,0);
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const cycle=t=>((t%1)+1)%1;
export const MOTION_CLIPS=Object.freeze({Idle:3.2,Walk:1.05,Run:.72,StairUp:1.2,StairDown:1.25,TurnLeft:1.4,TurnRight:1.4,Fall:1.4});

// Stance duration and reach are shared by phase advance and IK targets.
// Reach is measured against each rig's leg length. The shorter travel and
// slightly shorter support interval reduce crouching without a large change
// in cadence; both feet still overlap in a walk and leave the ground in a run.
const STANCE=run=>lerp(.60,.32,run);
const REACH=run=>lerp(.45,.56,run);
// The foot's travel through stance is not centred on the hip. The hip passes
// over the planted foot at about 40% of stance, not half way, so the foot is
// planted nearer the body than it is left behind: measured, a 2 m/s walk puts
// the heel down about 0.40 m ahead and takes the toe off about 0.62 m behind.
// Placing it symmetrically is what forced the pelvis to sink — reaching the
// full half-stride ahead with a straight leg costs L - sqrt(L^2 - reach^2),
// which was 17 cm a step at a brisk walk and made the walk a pogo stick.
// The total travel is unchanged, so the stride and the phase advance still
// agree and the foot still does not skate.
const BIAS=run=>lerp(.22,.08,run);
// Nobody takes a full stride up a staircase. Shortening it on a slope is both
// what people do and what keeps the ankle inside the leg's reach on a tread.
// The pose and the phase advance must apply this identically.
const SHORTEN=slope=>1-.45*Math.min(1,Math.abs(slope));

// One continuous gait for every supplied skeleton. Feet are solved from the
// actual joint lengths; changing pace never resets the phase of a planted leg.
export class SkeletalMotion{
  constructor(model,height){
    this.model=model;this.height=height;this.bones={};this.rest={};
    model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert(),mq=model.getWorldQuaternion(new THREE.Quaternion()).invert();
    model.traverse(b=>{if(b.isBone){this.bones[b.name]=b;this.rest[b.name]={p:b.position.clone(),q:b.quaternion.clone(),worldQ:mq.clone().multiply(b.getWorldQuaternion(new THREE.Quaternion())),point:b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse)};}});
    this.legs=['L','R'].map(s=>{const hip=this.rest['Thigh'+s].point,knee=this.rest['Shin'+s].point,ankle=this.rest['Foot'+s].point;return {side:s,hip:hip.clone(),ankle:ankle.clone(),a:hip.distanceTo(knee),b:knee.distanceTo(ankle),anchor:null,stance:false,target:new THREE.Vector3(),error:0};});
    // What the gait is actually built on: how far this rig's leg reaches, not
    // how tall it happens to be.
    this.legLength=Math.min(...this.legs.map(l=>l.a+l.b));
    // Which way the pelvis leans to stand over the first leg. Taken from the
    // rig rather than assumed, so a mirrored skeleton does not sway backwards.
    this.stanceSide=Math.sign(this.legs[0].ankle.x)||1;
    this.pelvisDrop=0;this.phase=0;this.time=0;this.weight=0;this.run=0;this.pace=1;this.slope=0;this.air=0;this.unsupported=0;this.lastPosition=null;this.state='Idle';this.lastHeading=0;this.footContacts=[];this.stepCount=0;this.rise=0;this.landing=0;
  }
  reset(){this.pelvisDrop=0;this.lastPosition=null;this.weight=0;this.run=0;this.pace=1;this.phase=0;this.slope=0;this.air=0;this.unsupported=0;this.stepCount=0;this.rise=0;this.landing=0;for(const leg of this.legs){leg.anchor=null;leg.stance=false;}}
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
  pose({phase=this.phase,weight=this.weight,run=this.run,slope=this.slope,pace=this.pace,turn=0,air=0,impact=0,rise=0,ground=null,dt=0,lock=false}={}){
    this.neutral();const h=this.height,L=this.legLength,p=phase*Math.PI*2,stance=STANCE(run),reach=REACH(run)*SHORTEN(slope)*L*weight*pace*(1-air);
    // Residual knee flex at mid-stance. This is not cosmetic: a walker whose
    // stance leg is straight has to drop the pelvis the full geometric depth
    // at double support, which is a 10 cm bounce a step. A real mid-stance
    // knee carries about 18 degrees, four per cent off the leg, and taking
    // that off the top of the arc is most of what flattens the trajectory.
    const hips=this.bones.Hips;hips.position.y-=L*lerp(.042,.060,run)*weight;
    // The pelvis rises over the planted leg and falls through double support,
    // twice a stride. Without it the body glides along on moving legs, which
    // is the single clearest tell of a bad walk. A run inverts it: highest at
    // mid-flight, lowest at mid-stance under peak knee flexion, so the peak
    // reference slides half a period across as the pace comes up.
    const bob=Math.cos(4*Math.PI*(phase-lerp(stance*.5,stance*.5+.25,run)));
    // Measured human pelvis rise is about 4.5 cm walking and 9 cm running, and
    // at a walk nearly all of it already arrives for free out of the leg
    // geometry below — the pelvis has to drop at double support because both
    // legs are reaching. Adding a full explicit rise on top of that produced a
    // 10.5 cm bounce, which is twice a person. A run does need it, because the
    // flight phase is not in the geometry.
    hips.position.y+=L*lerp(.006,.025,run)*bob*weight*(1-.5*Math.min(1,Math.abs(slope)));   // stairs are climbed flatter
    hips.position.y-=h*.012*air;
    hips.position.y-=L*.30*impact;                                  // knees absorb the landing
    hips.position.x+=Math.sin(this.time*Math.PI*2/3.2)*h*.003*(1-weight);
    // The pelvis shifts across onto whichever leg is carrying, once per step,
    // because the body has to put its weight over the foot that is holding it
    // up. Measured excursion is about 4.5 cm side to side at a walk and half
    // that at a run, where the feet land nearer the midline. Without it the
    // hips travel down a rail and no amount of leg animation reads as weight.
    const carry=Math.cos(2*Math.PI*(phase-stance*.5));
    hips.position.x+=this.stanceSide*L*lerp(.027,.012,run)*carry*weight;
    // Pelvic rotation about the spine. Kept small deliberately: the foot goals
    // in this rig are placed in model space and do not follow the pelvis, so
    // turning it further pulls the hips off their own feet and the stance leg
    // runs out of reach on a stair tread.
    this.rotate('Hips',Math.sin(p)*.040*weight,up);
    this.rotate('Hips',Math.sin(p)*.028*weight,forward);            // pelvis lists onto the swing side
    this.rotate('Spine',-.025*weight-.10*run-.065*Math.max(0,slope)*weight-.30*impact);
    this.rotate('Spine',Math.sin(p)*-.016*weight,forward);
    this.rotate('Chest',Math.sin(p)*-.045*weight+clamp(turn,-1,1)*.025,up);   // shoulders counter the hips
    this.rotate('Chest',-.055*run-.12*impact);
    this.rotate('Chest',Math.sin(this.time*Math.PI*2/3.2)*.003);
    this.rotate('Head',Math.sin(this.time*Math.PI*2/3.2+.7)*.009,up);
    this.rotate('Head',.062*run+.06*Math.max(0,slope)*weight+.22*impact);     // eyes stay on the horizon
    this.rotate('Neck',.012*weight);
    for(const [i,leg] of this.legs.entries()){
      const t=cycle(phase+i*.5),on=t<stance,u=on?t/stance:(t-stance)/(1-stance);
      // Where the foot is planted and where it leaves, biased backward.
      const bias=BIAS(run),front=reach*(1-bias),back=-reach*(1+bias);
      // Through stance the foot tracks the ground exactly. Through swing it
      // used to be a smoothstep, which arrives with zero speed — so the foot
      // touched down travelling forward with the body and then stopped dead,
      // a 1.6 m/s jump at a walk and 4.4 m/s at a run, on every step. A cubic
      // that leaves and arrives at the ground's own speed removes that, and
      // the overshoot it produces late in swing is the retraction a real foot
      // makes just before it lands.
      // The speed the foot is travelling as stance hands over to swing, and
      // as swing hands back. Named for the handover and not for `slope`,
      // which is the ground's and is still needed further down this loop.
      const handover=-(front-back)*(1-stance)/stance;
      let z;
      if(on)z=front+(back-front)*u;
      else {const u2=u*u,u3=u2*u;z=(2*u3-3*u2+1)*back+(-2*u3+3*u2)*front+(2*u3-3*u2+u)*handover;}
      // The heel recovers early during running; a late, low arc reads as a
      // straight-legged shuffle. Both ends have zero vertical velocity.
      const peak=lerp(.5,.40,run),arc=u<peak?Math.sin(Math.PI*.5*u/peak):Math.cos(Math.PI*.5*(u-peak)/(1-peak));
      const lift=on?0:arc*arc*h*lerp(.044,.16,run)*weight*(1-air);
      // A foot held flat through the whole cycle is what makes a walk read as
      // a shuffle. Heel lands first with the toe up, the sole rolls flat, then
      // the heel lifts and the step leaves off the toe. Positive pitch is
      // toe-down about the model's own sideways axis.
      const roll=(on
        ?(u<.20?lerp(-.24,0,u/.20):u<.60?0:lerp(0,.46,(u-.60)/.40))
        :lerp(.46,-.24,ease(clamp(u/.75,0,1))))*weight*(1-air);
      // Pivoting onto the toe raises the ankle; without this the heel drives
      // through the floor exactly when it should be lifting off it.
      // Rolling onto the toe raises the ankle, and how far it raises it is what
      // decides how much the pelvis has to drop through double support. At
      // 5.5 cm the hips fell nearly 10 cm a step — twice a person — because the
      // trailing leg was still flat on the floor at full reach.
      // A dorsiflexed foot at heel strike raises the ankle just as much as a
      // toe-off does, and leaving that half out is why the pelvis had to drop
      // so far: the leading leg was reaching for the floor with a flat foot.
      // The lift each way is the geometry of the foot, not a free parameter:
      // pitching the sole by `roll` about the ankle swings the toe or the heel
      // through the floor unless the ankle rises by the same amount.
      const toe=(Math.max(0,roll)*.100+Math.max(0,-roll)*.050)*h;
      const slopeLift=Math.max(0,slope)*h*.045*(on?0:Math.sin(Math.PI*u))*weight;
      const ankle=leg.ankle.clone();ankle.z+=z;ankle.y+=lift+toe+slopeLift;
      ankle.x+=Math.sin(p+i*Math.PI)*turn*.012*h*weight;
      // Going up, the legs trail and tuck; coming down they reach for the floor.
      if(air){const ascent=ease((rise+.75)/1.5);ankle.y+=h*lerp(.018,.15,ascent)*air;ankle.z+=h*lerp(.040,-.08,ascent)*air+(i===0?1:-1)*h*.018*air*weight;}
      this.model.updateWorldMatrix(true,true);const goal=ankle.applyMatrix4(this.model.matrixWorld);
      const canLock=lock&&weight>.45&&air<.10&&Math.abs(turn)<2.4;
      let floorUnder=null;
      if(ground&&air<.10){
        const floor=ground(goal.x,goal.z);if(Number.isFinite(floor)){goal.y=floor+leg.ankle.y+lift+toe+slopeLift;floorUnder=floor;}
        if(canLock&&on){
          if(!leg.stance||!leg.anchor||leg.anchor.distanceTo(goal)>.55){leg.anchor=goal.clone();}
          goal.x=leg.anchor.x;goal.z=leg.anchor.z;
          const anchorFloor=ground(goal.x,goal.z);if(Number.isFinite(anchorFloor)){goal.y=anchorFloor+leg.ankle.y+toe;floorUnder=anchorFloor;}
        }else leg.anchor=null;
      }
      leg.justLanded=canLock&&on&&!leg.stance;leg.stance=canLock&&on;
      const q=this.model.getWorldQuaternion(new THREE.Quaternion())
        .multiply(new THREE.Quaternion().setFromAxisAngle(sideways,roll))
        .multiply(this.rest['Foot'+leg.side].worldQ);
      leg.goal={goal,q,swing:reach>1e-5?z/reach:0,i,on,u,floorUnder};
    }
    // Lower the pelvis only as much as the measured limbs require. This lets
    // the trailing foot stay on a lower tread instead of stretching the knee
    // or lifting the heel through the air as the capsule climbs a step.
    let drop=0;
    // Only a foot that is carrying can pull the pelvis down. A foot in the air
    // does not need to be reached — it can simply swing shorter — and letting
    // it ask was most of the bounce: the moment the trailing foot left the
    // ground it was still at its furthest back, so the deepest reach of the
    // whole cycle was being demanded of a leg with no weight on it. The demand
    // is held through stance, released over the first quarter of swing and
    // taken up again over the last, so the pelvis is already low enough when
    // the foot lands rather than snapping down to meet it.
    //
    // The release is off the moment the two feet are on different floors: on a
    // stair the swinging foot really is reaching for a tread the pelvis has to
    // come down to, which is what the depth below is for. The treads are
    // compared directly rather than inferred from the slope, which reads near
    // zero on a flight of flat ones.
    for(const [i,leg] of this.legs.entries()){
      const other=this.legs[1-i].goal;
      const stepped=leg.goal.floorUnder!=null&&other?.floorUnder!=null
        &&Math.abs(leg.goal.floorUnder-other.floorUnder)>.06;
      const {on,u,goal}=leg.goal,hold=on||stepped?1:Math.max(1-u/.25,ease((u-.75)/.25));
      if(hold<=0)continue;
      const hip=this.bones['Thigh'+leg.side].getWorldPosition(new THREE.Vector3()),
        flat=(hip.x-goal.x)**2+(hip.z-goal.z)**2,
        vertical=Math.sqrt(Math.max(.01,(leg.a+leg.b-.004)**2-flat));
      drop=Math.max(drop,hold*(hip.y-goal.y-vertical));
    }
    // On the flat a deep sink is the kneeling walk and is capped hard. Climbing
    // a stair genuinely needs the depth, so the cap opens up with the slope.
    // The cap is a backstop, not the thing that keeps the walk upright — the
    // stride does that. Measured slope reads near zero on a stair of flat
    // treads, so capping against it starved the drop exactly where the trailing
    // foot is a whole tread below the hip and the depth is real.
    // Meet the supporting foot immediately, but release the load gradually.
    // Snapping up as the trailing leg lifts made each step visibly hitch.
    drop=Math.min(L*.42,Math.max(0,drop));
    this.pelvisDrop=dt>0?Math.max(drop,THREE.MathUtils.damp(this.pelvisDrop,drop,18,dt)):drop;
    hips.position.y-=this.pelvisDrop;this.model.updateWorldMatrix(true,true);
    for(const leg of this.legs){
      const {goal,q,swing,i}=leg.goal;this.solve(leg,goal,q);
      // Arms follow the stride rhythm, not the asymmetric foot trajectory.
      // Peak forward swing opposes the leg at its forward passing position.
      const arm=Math.cos(2*Math.PI*(phase+i*.5));
      // Arms oppose the advancing leg. Elbows remain soft and wrists follow,
      // while a small inward adjustment removes the old spread-arm silhouette.
      this.rotate('UpperArm'+leg.side,(.30+.34*run)*arm*weight-(.24+.44*Math.max(0,rise))*air-.24*impact);
      // Tuck the upper arms in as the pace rises. Left wide with the elbows
      // closed for a run, the hands end up parked in front of the chest.
      this.rotate('UpperArm'+leg.side,-Math.sign(leg.hip.x)*(.055+.035*run+.14*air),forward);
      this.rotate('UpperArm'+leg.side,-.10*run*weight,up);
      // The elbow closes as the arm comes through and opens as it goes back;
      // at a run it never straightens.
      this.rotate('Forearm'+leg.side,-.18-.95*run*weight-(.12+.18*run)*Math.max(0,-arm)*weight-.30*air-.45*impact);
      this.rotate('Hand'+leg.side,.035*weight*arm);
      if(this.bones['Fingers'+leg.side]){
        // Generated hands have two finger segments; relax them when walking
        // and curl them into a loose fist at a run, palms facing the ribs.
        this.rotate('Hand'+leg.side,-Math.sign(leg.hip.x)*.95,up);
        this.rotate('Fingers'+leg.side,-.22-.65*run*weight);
        this.rotate('FingerTips'+leg.side,-.28-.72*run*weight);
      }
      this.rotate('Coat'+leg.side,clamp(-swing*.075*weight-.025*run,-.12,.12));
    }
    this.model.updateWorldMatrix(true,true);
    this.footContacts=this.legs.map(l=>({side:l.side,planted:l.stance,position:l.target.clone(),error:l.error}));
  }
  sample(name,time){
    const duration=name==='Jump'?.96:MOTION_CLIPS[name],phase=time/duration;this.time=phase*3.2;const run=name==='Run'?1:0,walking=['Walk','Run','StairUp','StairDown','TurnLeft','TurnRight'].includes(name);
    if(name==='Jump'){const u=clamp(phase,0,1);this.pose({phase:0,weight:0,air:Math.sin(Math.PI*u)**.7,rise:Math.cos(Math.PI*u),impact:u>.74?Math.sin((u-.74)/.26*Math.PI)*.34:0});return;}
    this.pose({phase,weight:walking?(name.startsWith('Turn')?.35:1):0,run,slope:name==='StairUp'?.5:name==='StairDown'?-.5:0,turn:name==='TurnLeft'?-1:name==='TurnRight'?1:0,air:name==='Fall'?1:0});
  }
  climb({cycle=0,grip=1}){
    this.neutral();this.state='Climb';this.weight=0;this.run=0;this.air=0;
    const h=this.height,p=cycle*Math.PI*2;this.rotate('Spine',-.06*grip);this.rotate('Head',-.12*grip);
    this.bones.Hips.position.y-=h*.035*grip;this.model.updateWorldMatrix(true,true);
    for(const [i,leg] of this.legs.entries()){
      const wave=Math.sin(p+i*Math.PI),ankle=leg.ankle.clone();ankle.z+=h*.17*grip;ankle.y+=h*(.075+.07*wave)*grip;
      const target=ankle.applyMatrix4(this.model.matrixWorld),q=this.model.getWorldQuaternion(new THREE.Quaternion()).multiply(this.rest['Foot'+leg.side].worldQ);this.solve(leg,target,q);
      const upper=this.bones['UpperArm'+leg.side],forearm=this.bones['Forearm'+leg.side],hand=this.bones['Hand'+leg.side];
      const shoulder=upper.getWorldPosition(new THREE.Vector3()),elbow=forearm.getWorldPosition(new THREE.Vector3()),wrist=hand.getWorldPosition(new THREE.Vector3());
      const a=shoulder.distanceTo(elbow),b=elbow.distanceTo(wrist),goalLocal=this.rest['Hand'+leg.side].point.clone();
      goalLocal.lerp(new THREE.Vector3(i===0?.32:-.32,h*(.79-.085*wave),.42),grip);const goal=goalLocal.applyMatrix4(this.model.matrixWorld),d=goal.clone().sub(shoulder),length=clamp(d.length(),.08,a+b-.001);d.normalize();
      const pole=new THREE.Vector3(i===0?1:-1,-.4,-.4).applyQuaternion(this.model.getWorldQuaternion(new THREE.Quaternion()));pole.addScaledVector(d,-pole.dot(d)).normalize();
      const along=(a*a-b*b+length*length)/(2*length),lift=Math.sqrt(Math.max(0,a*a-along*along));
      this.aim(upper,forearm,shoulder.clone().addScaledVector(d,along).addScaledVector(pole,lift));this.aim(forearm,hand,shoulder.clone().addScaledVector(d,length));
      this.rotate('Coat'+leg.side,-.025*grip);
    }
    this.model.updateWorldMatrix(true,true);this.footContacts=[];
  }
  update(dt,{speed=0,position,grounded=true,heading=0,ground=null,active=true,impact=0}={}){
    this.time+=dt;
    const teleported=!this.lastPosition||this.lastPosition.distanceTo(position)>2.5;
    if(teleported){this.reset();this.lastPosition=position.clone();this.lastHeading=heading;}
    const distance=Math.hypot(position.x-this.lastPosition.x,position.z-this.lastPosition.z),vertical=position.y-this.lastPosition.y;
    const turn=dt?Math.atan2(Math.sin(heading-this.lastHeading),Math.cos(heading-this.lastHeading))/dt:0;
    this.weight=THREE.MathUtils.damp(this.weight,active&&speed>.025?clamp(speed/.8,0,1):0,9,dt);
    this.run=THREE.MathUtils.damp(this.run,ease((speed-2.05)/1.8),7,dt);
    // People do not walk faster by taking the same step more often. Step length
    // and cadence both grow about as the square root of speed, so the stride
    // has to grow with the pace or a brisk walk turns into a scurry: this rig
    // held a 61 cm step from 0.8 m/s all the way to 2 m/s and put every extra
    // metre per second into cadence alone.
    this.pace=THREE.MathUtils.damp(this.pace,clamp(Math.sqrt(Math.max(speed,.4)/1.25),.72,lerp(1.26,1,this.run)),6,dt);
    this.slope=THREE.MathUtils.damp(this.slope,distance>.004?clamp(vertical/distance,-.8,.8):0,5,dt);
    // Signed vertical speed, in body heights per second, so the air pose knows
    // whether it is on the way up or reaching for the ground.
    this.rise=THREE.MathUtils.damp(this.rise,dt?clamp(vertical/dt/(this.height*3),-1,1):0,10,dt);
    this.landing=Math.max(impact,THREE.MathUtils.damp(this.landing,0,6,dt));
    // reach is scaled by weight in the pose, so the stride the phase advances
    // against has to be scaled by it too. Left unmatched, the legs swing shorter
    // than the ground the body covers and the whole walk drags — which is what
    // the slow-motion residents were: they move below full weight all the time.
    const stride=2*REACH(this.run)*SHORTEN(this.slope)*this.legLength*Math.max(.55,this.weight)*this.pace/STANCE(this.run);
    if(active&&!teleported)this.phase=cycle(this.phase+distance/stride);
    this.unsupported=grounded?0:this.unsupported+dt;this.air=THREE.MathUtils.damp(this.air,this.unsupported>.035?1:0,12,dt);
    this.state=this.air>.3?(this.rise>.08?'Jump':'Fall'):this.landing>.18?'Land':this.weight<.08?'Idle':this.slope>.16?'StairUp':this.slope<-.16?'StairDown':this.run>.5?'Run':Math.abs(turn)>1.5?'Turn':'Walk';
    this.pose({turn,air:this.air,impact:this.landing,rise:this.rise,ground,dt,lock:active});
    this.stepCount+=this.legs.filter(l=>l.justLanded).length;
    this.lastPosition.copy(position);this.lastHeading=heading;
  }
}
