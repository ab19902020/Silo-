import {CAPTURED_GAITS} from './captured-gaits.js';

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Retain the captured rhythm, but remove a recording's mean arm angle. Those
// offsets differ between sides and previously made one hand reach forward for
// most of a stride. A bounded elbow hinge also avoids sideways wrist scoops.
const tracks={};
for(const [style,gait] of Object.entries(CAPTURED_GAITS)){
 tracks[style]={};
 for(const side of ['L','R']){
  const values=gait.joints['upper'+side].slice(0,-1).map(v=>Math.atan2(v[2],-v[1]));
  const mean=values.reduce((a,b)=>a+b,0)/values.length,range=Math.max(...values)-Math.min(...values);
  const flex=values.map((v,i)=>Math.atan2(gait.joints['fore'+side][i][2],-gait.joints['fore'+side][i][1])-v);
  tracks[style][side]={swing:values.map(v=>(v-mean)/Math.max(range*.5,.1)),flex};
 }
}
function sample(track,phase){
 const f=((phase%1+1)%1)*track.length,i=Math.floor(f),t=f-i,n=track.length;
 const a=track[(i+n-1)%n],b=track[i],c=track[(i+1)%n],d=track[(i+2)%n];
 return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
}
export function leadArmPose(style,phase,run,result={}){
 const walk=tracks[style]||tracks.engineer,fast=tracks.run,amplitude=style==='measured'?.19:style==='security'?.25:.29;
 for(const [side,sign] of [['L',1],['R',-1]]){
  const swing=sample(walk[side].swing,phase),running=sample(fast[side].swing,phase);
  const pitch=(swing*amplitude-.015)*(1-run)+(running*.43-.23)*run;
  const capturedFlex=sample(walk[side].flex,phase),walkFlex=.27+.10*Math.tanh((capturedFlex-.40)*2);
  const flex=walkFlex*(1-run)+(1.15+.16*Math.tanh(sample(fast[side].flex,phase)-1.3))*run;
  // The two long coats need room between the wrist and the garment side.
  const coat=style==='security'||style==='measured';
  const ux=sign*((coat?.205:.090)*(1-run)+.115*run),fx=sign*((coat?.195:.035)*(1-run)-.095*run);
  const upper=result['upper'+side]||(result['upper'+side]=[]);upper[0]=ux;upper[1]=-Math.cos(pitch)*Math.sqrt(1-ux*ux);upper[2]=Math.sin(pitch)*Math.sqrt(1-ux*ux);
  const fore=result['fore'+side]||(result['fore'+side]=[]);fore[0]=fx;fore[1]=-Math.cos(pitch+flex)*Math.sqrt(1-fx*fx);fore[2]=Math.sin(pitch+flex)*Math.sqrt(1-fx*fx);
 }
 return result;
}
