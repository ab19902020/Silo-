import { RESIDENT_BODY as source } from './resident-body-data.js';

// Split the anatomical topology at the shirt hem. Painting complete triangles
// either trouser or shirt colour produced a ragged, triangular waistline.
const p=[...source.positions],joints=[...source.skinIndices],weights=[...source.skinWeights],tones=[...source.tones],indices=[];
export const SHIRT_HEM=.955;
const hem=SHIRT_HEM,body=i=>!/(Arm|Forearm|Hand|Finger)/.test(source.joints[joints[i*2]]);
for(let i=0;i<tones.length;i++)if(body(i))tones[i]=p[i*3+1]<hem?1:0;
const cuts=new Map();
function cut(a,b,tone){
 const key=[Math.min(a,b),Math.max(a,b),tone].join(':');if(cuts.has(key))return cuts.get(key);
 const t=(hem-p[a*3+1])/(p[b*3+1]-p[a*3+1]),i=p.length/3;
 p.push(p[a*3]+(p[b*3]-p[a*3])*t,hem,p[a*3+2]+(p[b*3+2]-p[a*3+2])*t);
 const ws=new Map();for(const [v,mix]of [[a,1-t],[b,t]])for(const [joint,w]of [[joints[v*2],weights[v]],[joints[v*2+1],1-weights[v]]])ws.set(joint,(ws.get(joint)||0)+w*mix);
 const best=[...ws].sort((a,b)=>b[1]-a[1]).slice(0,2);if(best.length===1)best.push([best[0][0],0]);
 joints.push(best[0][0],best[1][0]);weights.push(best[0][1]/(best[0][1]+best[1][1]));tones.push(tone);cuts.set(key,i);return i;
}
for(let i=0;i<source.indices.length;i+=3){
 const tri=source.indices.slice(i,i+3),ys=tri.map(v=>p[v*3+1]);
 if(!tri.every(body)||Math.min(...ys)>=hem||Math.max(...ys)<=hem){indices.push(...tri);continue;}
 for(const tone of [0,1]){
  const inside=v=>tone===0?p[v*3+1]>=hem:p[v*3+1]<=hem,poly=[];
  for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3];if(inside(a))poly.push(a);if(inside(a)!==inside(b))poly.push(cut(a,b,tone));}
  for(let k=1;k<poly.length-1;k++)indices.push(poly[0],poly[k],poly[k+1]);
 }
}
export const GARMENT_BODY={...source,positions:p,indices,skinIndices:joints,skinWeights:weights,tones};

