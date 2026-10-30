// CPU-only repeatable workload. These timings are not a GPU/frame-rate claim.
import {performance} from 'node:perf_hooks';
import * as T from '../dist/vendor/three.module.js';
import {createResident,poseResident,disposeResident} from '../dist/src/resident-model.js';
import {PorterTraffic} from '../dist/src/porter-traffic.js';
const samples=(step,warm=90,frames=300)=>{for(let i=0;i<warm;i++)step(i);const times=[];for(let i=0;i<frames;i++){const start=performance.now();step(i+warm);times.push(performance.now()-start);}times.sort((a,b)=>a-b);return {medianMs:+times[Math.floor(frames*.5)].toFixed(3),p95Ms:+times[Math.floor(frames*.95)].toFixed(3)};};
const actors=Array.from({length:24},(_,i)=>{const a=createResident({id:'bench-'+i%3,height:1.75,appearance:{outfit:'work'}});a.ground=()=>0;return a;});
const animation=samples(frame=>{for(const [i,a] of actors.entries()){a.root.position.set(i%6,0,frame*(i%3?1.4:0)/60);a.root.updateMatrixWorld(true);poseResident(a,i%3?'walk':'idle',frame/60,1/60,i%3?1.4:0);}});
for(const a of actors)disposeResident(a);
const world={outside:true,special:null,loaded:new Map(),quality:'balanced'},porters=new PorterTraffic(new T.Scene(),world),body={position:new T.Vector3(0,1500,0)};
const backgroundPorters=samples(()=>porters.update(1/60,body,{hour:8.4}));
console.log(JSON.stringify({workload:{residents:24,moving:16,frames:300,porters:porters.records.length},animation,backgroundPorters},null,2));
