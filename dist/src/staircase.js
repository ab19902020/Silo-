import * as THREE from '../vendor/three.module.js';
import { SILO, TAU, stairStepY } from './data.js';

export const stairOpening=Math.asin((SILO.landingHalf+.22)/SILO.stairRadius);
export function hasStairGuard(angle){return angle>stairOpening&&angle<TAU-stairOpening;}

// The terminal parapet meets the circular core at the chord, not at its
// radius. Using C as its start left a triangular gap beside the column.
export const terminalStart=Math.sqrt(SILO.stairColumn**2-SILO.landingHalf**2)-.025;
export function buildTerminalLanding(k,side){
  const C=SILO.stairColumn,S=SILO.stairRadius,L=SILO.landingHalf,z=side*L;
  k.box('concrete',(terminalStart+C)/2,-.2,0,C-terminalStart,.4,L*2);
  k.box('darkConcrete',(terminalStart+S)/2,.36,z,S-terminalStart,.72,.2);
  k.box('concrete',(terminalStart+S)/2,.745,z,S-terminalStart,.07,.26);
  for(const h of [.95,1.12])k.beam('metal',[terminalStart,h,z],[S,h,z],.027);
  for(let x=terminalStart+.3;x<S;x+=.95)k.cylinder('metal',x,.94,z,.022,.37);
  // The helical rail finishes at a circular edge; return it to the straight
  // bridge rail on the side where the surviving flight arrives.
  const a=-side*stairOpening,x=Math.cos(a)*S,rz=Math.sin(a)*S;
  k.beam('concrete',[x,.745,rz],[S,.745,-side*L],.13);
  for(const h of [.95,1.12])k.beam('metal',[x,h,rz],[S,h,-side*L],.027);
}

// Smooth helical surfaces follow the rise while the actual treads stay flat.
function ribbon(inner,outer,bottom,height,start,end){
  const segments=Math.ceil((end-start)*48),vertices=[],uv=[],indices=[];
  for(let i=0;i<=segments;i++){
    const a=THREE.MathUtils.lerp(start,end,i/segments),step=a/TAU*SILO.stairSteps;
    const y=stairStepY(step-.5)+bottom;
    for(const [r,h] of [[inner,0],[outer,0],[inner,height],[outer,height]]){vertices.push(Math.cos(a)*r,y+h,Math.sin(a)*r);uv.push(a*r,h);}
    if(i){const p=(i-1)*4,q=i*4;for(const [a,b,c,d] of [[p,q,p+2,q+2],[p+1,p+3,q+1,q+3],[p+2,q+2,p+3,q+3],[p,p+1,q,q+1]])indices.push(a,b,c,b,d,c);}
  }
  indices.push(0,2,1,1,2,3);const n=segments*4;indices.push(n,n+1,n+2,n+1,n+3,n+2);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function buildStairFlight(k){
  const C=SILO.stairColumn,S=SILO.stairRadius,stepAngle=TAU/SILO.stairSteps;
  for(let j=0;j<SILO.stairSteps;j++){
    const a=j*stepAngle,y=stairStepY(j);k.arc('concrete',C,S,.18,y-.18,a,stepAngle*1.005,2);
    k.beam('darkMetal',[Math.cos(a)*(C+.04),y+.009,Math.sin(a)*(C+.04)],[Math.cos(a)*(S-.16),y+.009,Math.sin(a)*(S-.16)],.012);
  }
  // Every guard component shares one landing cut-out, including posts/caps.
  const end=TAU-stairOpening;
  k.mesh(ribbon(S-.1,S+.14,-.05,.76,stairOpening,end),'darkConcrete');
  k.mesh(ribbon(S-.13,S+.17,.71,.07,stairOpening,end),'concrete');
  for(const h of [.93,1.1])k.mesh(ribbon(S-.005,S+.04,h,.04,stairOpening,end),'metal');
  for(let a=stairOpening;a<=end;a+=stepAngle*2){const y=stairStepY(a/stepAngle-.5);k.cylinder('metal',Math.cos(a)*(S+.018),y+.93,Math.sin(a)*(S+.018),.023,.38);}
}
