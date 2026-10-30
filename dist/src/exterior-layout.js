// Reference-led reconstruction: seven clusters around a central silo.
// The supplied low-resolution map does not establish every numbered centre.
// Silo 0 is a gameplay extension; distances are game scale, not a canon survey.
const raw=[{id:0,x:-1080,z:0},{id:1,x:0,z:0}];
for(let cluster=0;cluster<7;cluster++){
  const angle=-Math.PI/2+cluster*Math.PI*2/7,cx=Math.cos(angle)*640,cz=Math.sin(angle)*640;
  for(let j=0;j<7;j++){const a=(j-1)*Math.PI/3;raw.push({id:2+cluster*7+j,x:cx+(j?Math.cos(a)*178:0),z:cz+(j?Math.sin(a)*178:0)});}
}
const origin=raw.find(s=>s.id===18);
export const SILO_LAYOUT=Object.freeze(raw.sort((a,b)=>a.id-b.id).map(s=>Object.freeze({id:s.id,q:s.x,r:s.z,x:s.x-origin.x,z:s.z-origin.z})));
export const siloPosition=id=>SILO_LAYOUT.find(s=>s.id===id);
