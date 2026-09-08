import * as THREE from '../vendor/three.module.js';
import { SILO, TAU, stairStepY } from './data.js';

export const stairOpening=Math.asin((SILO.landingHalf+.22)/SILO.stairRadius);
export function hasStairGuard(angle){return angle>stairOpening&&angle<TAU-stairOpening;}

// The stairwell in the reference has no metal balustrade anywhere. Helix,
// landing and bridge are one cast wall finished with a half-round coping, and
// the coping runs unbroken from the flight, round the landing corner and out
// along the bridge to the column it dies into. Modelling that as a single
// section swept along a path is what keeps the three identical: they are the
// same profile, so they meet without a joint wherever a flight arrives.
export const PARAPET=Object.freeze({half:.13,base:-.06,crown:1});
export const PARAPET_TOP=PARAPET.crown+PARAPET.half;
// Guard centrelines. The helix guard's inner face lands on stairRadius-.1 and
// the bridge guard's on landingHalf-.1 — the radii the collision has always
// used — so the new profile changes how the guard looks, not where you walk.
export const railRadius=SILO.stairRadius+PARAPET.half-.1;
export const guardZ=SILO.landingHalf+PARAPET.half-.1;
// The terminal parapet meets the circular core at the chord, not at its
// radius. Using C as its start left a triangular gap beside the column.
export const terminalStart=Math.sqrt(SILO.stairColumn**2-SILO.landingHalf**2)-.025;
// The column each bridge guard dies into, at the well lip where the bridge
// meets the gallery. One per side per level, stacked into a continuous shaft.
export const NEWEL=Object.freeze({radius:.24,x:SILO.wellRadius-.34,z:SILO.landingHalf+.06});

// Section in (lateral, height): a plumb wall capped by a half-round coping.
function section(quality){
  const points=[[PARAPET.half,PARAPET.base]];
  for(let i=0;i<=quality;i++){const a=i*Math.PI/quality;points.push([Math.cos(a)*PARAPET.half,PARAPET.crown+Math.sin(a)*PARAPET.half]);}
  points.push([-PARAPET.half,PARAPET.base]);return points;
}

// Sweeps the section along a path of centreline points. The faces stay plumb
// and only the coping follows the rise, the way the concrete is actually cast:
// a helical path gives the flight guard, a straight one the bridge guard, and
// a bezier the corner between them.
export function parapetGeometry(path,quality=7){
  const shape=section(quality),m=shape.length,position=[],uv=[],index=[];
  let run=0;
  for(let i=0;i<path.length;i++){
    const previous=path[Math.max(0,i-1)],next=path[Math.min(path.length-1,i+1)];
    let dx=next[0]-previous[0],dz=next[2]-previous[2];const length=Math.hypot(dx,dz)||1;dx/=length;dz/=length;
    if(i)run+=Math.hypot(path[i][0]-path[i-1][0],path[i][2]-path[i-1][2]);
    for(const [lateral,height] of shape){position.push(path[i][0]-dz*lateral,path[i][1]+height,path[i][2]+dx*lateral);uv.push(run,height);}
    if(i)for(let j=0;j<m;j++){const a=(i-1)*m+j,b=(i-1)*m+(j+1)%m,c=i*m+j,d=i*m+(j+1)%m;index.push(a,c,b,b,c,d);}
  }
  // Both ends are closed: a guard that stops at a wall or a column has to read
  // as solid concrete, and a closed hull is also what orients the sweep below.
  const last=(path.length-1)*m;
  for(let j=1;j<m-1;j++){index.push(0,j,j+1,last,last+j+1,last+j);}
  // A sweep's winding follows the handedness of the path it was sampled along,
  // so half of these would come out inside-out. Take the orientation from the
  // hull's signed volume instead of trusting the direction of travel.
  let volume=0;
  for(let i=0;i<index.length;i+=3){
    const a=index[i]*3,b=index[i+1]*3,c=index[i+2]*3;
    volume+=position[a]*(position[b+1]*position[c+2]-position[b+2]*position[c+1])
      -position[a+1]*(position[b]*position[c+2]-position[b+2]*position[c])
      +position[a+2]*(position[b]*position[c+1]-position[b+1]*position[c]);
  }
  if(volume<0)for(let i=0;i<index.length;i+=3){const swap=index[i+1];index[i+1]=index[i+2];index[i+2]=swap;}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(index);geometry.computeVertexNormals();return geometry;
}
export const sweepParapet=(k,path,quality=7,material='concrete')=>k.mesh(parapetGeometry(path,quality),material);

// The guard rides the tread nosings, so it carries the flight's flat landing
// zones as well as its rise and arrives level with the bridge at both ends.
export function helixPath(from,to,radius,lift=0,density=44){
  const segments=Math.max(2,Math.ceil(Math.abs(to-from)*density)),path=[];
  for(let i=0;i<=segments;i++){
    const a=THREE.MathUtils.lerp(from,to,i/segments);
    path.push([Math.cos(a)*radius,lift+stairStepY(a/TAU*SILO.stairSteps-.5),Math.sin(a)*radius]);
  }
  return path;
}
export const straightPath=(fromX,toX,z,y=0)=>[[fromX,y,z],[toX,y,z]];

// The corner. The coping leaves the helix along its tangent, swings out and
// arrives on the bridge line pointing straight down the bridge, so the join is
// a continuous curve rather than the open gap the flight used to stop at.
// `side` is +1 at the flight's foot and -1 at its head, one level up.
export function landingPath(side,lift,segments=14){
  const a=stairOpening,z=side*guardZ,end=railRadius+.95;
  const p0=[Math.cos(a)*railRadius,side*Math.sin(a)*railRadius];
  const c1=[p0[0]+Math.sin(a)*.22,p0[1]-side*Math.cos(a)*.22],c2=[end-.62,z],path=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,u=1-t,at=(p,q,r,s)=>u*u*u*p+3*u*u*t*q+3*u*t*t*r+t*t*t*s;
    const across=at(p0[1],c1[1],c2[1],z);
    path.push([at(p0[0],c1[0],c2[0],end),lift,side>0?Math.max(z,across):Math.min(z,across)]);
  }
  return path;
}

// Bare concrete treads: the reference has no nosing strip, and the wedges read
// on their own shadow the way they do in the shaft.
export function buildStairFlight(k){
  const C=SILO.stairColumn,S=SILO.stairRadius,stepAngle=TAU/SILO.stairSteps;
  for(let j=0;j<SILO.stairSteps;j++){const y=stairStepY(j);k.arc('concrete',C,S,.18,y-.18,j*stepAngle,stepAngle*1.005,2);}
  sweepParapet(k,helixPath(stairOpening,TAU-stairOpening,railRadius));
  sweepParapet(k,landingPath(1,0));
  sweepParapet(k,landingPath(-1,SILO.levelHeight));
}

// The top and bottom landings have no flight leaving on one side, so the same
// guard closes the opening there instead of sweeping away into a flight.
export function buildTerminalLanding(k,side){
  const C=SILO.stairColumn,S=SILO.stairRadius;
  k.box('concrete',(terminalStart+C)/2,-.2,0,C-terminalStart,.4,(SILO.landingHalf+.16)*2);
  sweepParapet(k,straightPath(terminalStart,S+.15,side*guardZ));
}

// A light collar at the coping's height marks every level on the column, which
// is how the reference reads the shaft's depth: one band per storey.
export function buildNewel(k,x,z,height,{collar=PARAPET.crown,slats=26,rings=true}={}){
  const r=NEWEL.radius;
  k.cylinder('concrete',x,height/2,z,r,height);
  k.cylinder('darkMetal',x,collar,z,r+.008,.34);
  if(rings)for(const dy of [-.185,.185])k.cylinder('darkMetal',x,collar+dy,z,r+.035,.045);
  for(let i=0;i<slats;i++){const a=i*TAU/slats;k.box('lamp',x+Math.cos(a)*(r+.022),collar,z+Math.sin(a)*(r+.022),.05,.3,.042,-a);}
}
