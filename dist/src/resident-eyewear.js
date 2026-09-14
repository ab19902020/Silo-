import * as T from '../vendor/three.module.js';

// Fit both the rim and temples to the deformed skin, including broad heads.
// The sampled paths are reused for geometry and clearance regression checks.
export function fitSpectacles(surface,eyes,a={}){
 const radius=.021*(a.eyeSize??1),rectangular=a.frameStyle==='rectangular',frames=[],arms=[];
 for(const [index,side] of [-1,1].entries()){
  const eye=eyes[index],points=[];
  for(let i=0;i<48;i++){
   const angle=i/48*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle);
   const x=rectangular?Math.sign(c)*Math.pow(Math.abs(c),.48):c,y=rectangular?Math.sign(s)*Math.pow(Math.abs(s),.48):s;
   points.push(new T.Vector3(eye.x+x*radius,eye.y+.001+y*radius*(rectangular?.64:.78),0));
  }
  let depth=eye.z+.016;
  for(const p of points){const hit=surface.sample(p.x,p.y);if(hit)depth=Math.max(depth,hit.point.z+.006);}
  for(const p of points)p.z=depth;frames.push(points);
  let width=Math.abs(eye.x)+radius+.004;
  const stem=[];
  for(let i=0;i<=28;i++){
   const z=depth-.006-(depth+.060)*i/28,y=eye.y+.004-(i>24?(i-24)*.002:0),hit=surface.sample(side,y,z,'x');
   if(hit)width=Math.max(width,Math.abs(hit.point.x)+.007);
   stem.push({y,z});
  }
  // The hinge flares outside the cheek before turning back. Allowing the
  // arm to follow a narrow eye socket first would cut through the brow.
  const arm=[new T.Vector3(eye.x+side*radius,eye.y+.004,depth),new T.Vector3(side*width,eye.y+.004,depth)];
  for(const p of stem)arm.push(new T.Vector3(side*width,p.y,p.z));
  arms.push(arm);
 }
 const midY=(eyes[0].y+eyes[1].y)/2+.003,hit=surface.sample(0,midY),depth=Math.max(frames[0][0].z,frames[1][0].z,(hit?.point.z||0)+.006);
 const bridge=[new T.Vector3(eyes[0].x+radius,midY,frames[0][0].z),new T.Vector3(0,midY+.002,depth),new T.Vector3(eyes[1].x-radius,midY,frames[1][0].z)];
 return {frames,arms,bridge};
}
