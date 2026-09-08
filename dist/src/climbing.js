import * as THREE from '../vendor/three.module.js';

// A climb stays in the same world: mount, travel along the rungs, dismount.
// Pausing the game freezes it; directory travel explicitly cancels it.
export class LadderClimb{
  constructor(body,ladder,up){
    this.ladder=ladder;this.up=up;this.heading=ladder.heading;this.stage='mount';this.elapsed=0;this.cycle=0;this.grip=0;this.speed=0;
    this.origin=body.position.clone();this.start=new THREE.Vector3(ladder.x,up?ladder.bottomY:ladder.topY,ladder.z);this.end=this.start.clone();this.end.y=up?ladder.topY:ladder.bottomY;
    this.exit=new THREE.Vector3(...(up?ladder.topExit:ladder.bottomExit));
  }
  static begin(body,ladder,up){
    const entry=new THREE.Vector3(...(up?ladder.bottomExit:ladder.topExit));
    if(body.climbing||body.position.distanceTo(entry)>2.2)return false;
    body.climbing=new LadderClimb(body,ladder,up);body.velocity.set(0,0,0);return true;
  }
  step(dt,body){
    const before=body.position.clone();this.elapsed+=dt;body.grounded=false;
    if(this.stage==='mount'){
      const t=Math.min(1,this.elapsed/.55);this.grip=THREE.MathUtils.smoothstep(t,0,1);body.position.lerpVectors(this.origin,this.start,this.grip);
      if(t===1){this.stage='rungs';this.elapsed=0;}
    }else if(this.stage==='rungs'){
      const distance=Math.abs(this.end.y-this.start.y),t=Math.min(1,this.elapsed*.9/distance);body.position.lerpVectors(this.start,this.end,t);this.grip=1;
      this.cycle+=Math.abs(body.position.y-before.y)/.56;
      if(t===1){this.stage='dismount';this.elapsed=0;}
    }else{
      const t=Math.min(1,this.elapsed/.65),blend=THREE.MathUtils.smoothstep(t,0,1);body.position.lerpVectors(this.end,this.exit,blend);this.grip=1-blend;
      if(t===1){body.climbing=null;body.grounded=true;body.groundY=this.exit.y;}
    }
    body.velocity.copy(body.position).sub(before).multiplyScalar(dt>0?1/dt:0);this.speed=Math.abs(body.velocity.y);body.landingImpact=0;
    if(!body.climbing)body.velocity.set(0,0,0);
  }
}
