import * as T from '../dist/vendor/three.module.js';
import { SiloWorld } from '../dist/src/world.js';
import { levelY, levelAt, landingAngle, stairStepY, STAIR_SWEEP, SILO } from '../dist/src/data.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
const w=new SiloWorld(new T.Scene()),p=new T.Vector3();
function energy(p){let e=.42;for(const l of w.localLights){if(!l.visible)continue;const d=l.position.distanceTo(p),cut=Math.pow(Math.max(0,1-Math.pow(d/l.distance,4)),2);e+=l.intensity*cut/Math.max(Math.pow(d,l.decay),.01);}return e;}
const routes={stairs:i=>{const t=i/1200*2.999,level=52-Math.floor(t),u=t%1,a=landingAngle(level)+u*STAIR_SWEEP;p.set(Math.cos(a)*5.6,levelY(level)+stairStepY(u*(SILO.stairSteps-1)),Math.sin(a)*5.6);},rooms:i=>{const a=.05,r=20+24*(1-Math.cos(i/1200*Math.PI*2))/2;p.set(Math.cos(a)*r,levelY(50),Math.sin(a)*r);}};
for(const [route,sample]of Object.entries(routes)){
 sample(0);w.setLevel(levelAt(p.y));for(let j=0;j<90;j++){w.buildAhead(10);w.update(1/60,p);}
 let last,frameJump=0,min=Infinity,max=0,dark=0,countChanges=0,lastCount=null,totalCost=0;const crossings=[];
 for(let i=0;i<1200;i++){sample(i);const prev=w.activeLevel;w.buildAhead(4);const start=performance.now();w.update(1/60,p);totalCost+=performance.now()-start;const e=energy(p),count=w.localLights.filter(l=>l.visible).length;if(last){frameJump=Math.max(frameJump,Math.abs(e-last)/last);if(w.activeLevel!==prev)crossings.push({frame:i,level:w.activeLevel,ratio:e/last});}if(lastCount!==null&&lastCount!==count)countChanges++;last=e;lastCount=count;min=Math.min(min,e);max=Math.max(max,e);if(w.localLights.every(l=>l.intensity<1))dark++;}
 console.log(JSON.stringify({route,min,max,frameJump,countChanges,dark,meanUpdateMs:totalCost/1200,crossings}));
}
