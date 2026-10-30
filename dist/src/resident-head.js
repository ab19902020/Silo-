import * as T from '../vendor/three.module.js';
import {eyelidGeometry} from './resident-expression.js';
import {GarmentSurface} from './garment-surface.js';
import {fitSpectacles} from './resident-eyewear.js';
import {shapeFace} from './face-shape.js';
import {RESIDENT_HEAD as data} from './resident-head-data.js';

// Anatomical topology includes eyelids, lips, the nose and ears in one skin.
// The shared atlas keeps every ordinary resident in a single skinned draw.
export function addResidentHead({a,skin,hair,dark,add,binding,ell,box,tube}){
 const female=!!a.female,age=a.age||0,fw=(a.faceWidth||1)*(female?.96:1),clamp=T.MathUtils.clamp;
 const brightness=(skin.r+skin.g+skin.b)/3;
 const tile=female?(brightness<.24?6:age>.65?5:age>.35?7:4):(brightness<.15?2:a.beard?3:age>.65?1:0);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));geometry.setIndex(data.indices);
 const p=geometry.attributes.position,uv=[];const [u0,u1,v0,v1]=data.crop;
 for(let i=0;i<p.count;i++){
  const shaped=shapeFace(p.getX(i),p.getY(i),p.getZ(i),a);
  // Tuck the scanned neck's jagged, flared cut into the continuous skin bridge.
  // The blend ends below the jaw so facial controls retain their full range.
  const neck=1-T.MathUtils.smoothstep(shaped.y,1.475,1.525);
  if(neck>0){
   const angle=Math.atan2(shaped.x,shaped.z+.010);
   shaped.x=T.MathUtils.lerp(shaped.x,Math.sin(angle)*.051,neck);
   shaped.z=T.MathUtils.lerp(shaped.z,Math.cos(angle)*.046+.004,neck);
   if(shaped.y<1.475)shaped.y=1.442+(shaped.y-1.455)*.10;
  }
  p.setXYZ(i,shaped.x,shaped.y,shaped.z);
  const y=shaped.y,x=shaped.x,z=shaped.z;
  const u=data.uv[i*2],v=data.uv[i*2+1],scalpLine=1.665+.026*clamp((z+.04)/.13,0,1),valid=u>=u0&&v>=v0&&v<=v1;
  const mask=valid?(a.bald?1-T.MathUtils.smoothstep(y,scalpLine-.022,scalpLine+.007):1):0;
  uv.push(((tile%4)+clamp((u-u0)/(u1-u0),.001,.999))/4,(Math.floor(tile/4)+clamp((v1-v)/(v1-v0),.001,.999))/2,mask);
 }
 geometry.computeVertexNormals();geometry.setAttribute('skinUV',new T.Float32BufferAttribute(uv,3));
 // Preserve the skin palette (also used by hands and neck) while retaining
 // photographed detail. Texture colour is converted to linear by the GPU.
 const tint=skin.clone();tint.skinSurface=true;
 const headBind=y=>y>1.565?binding('Head'):binding('Neck','Chest',clamp((y-1.45)/.085,0,1));
 const scalp=geometry.clone();
 add(geometry,tint,headBind,null,false,(x,y,z,i)=>{
  const mask=uv[i*3+2],mapped=mask>.5,c=skin.clone();
  if(mapped&&z>.050&&(a.beard||a.moustache)){
   const edge=T.MathUtils.smoothstep(1.591-y,0,.035),mouth=1-Math.exp(-((x/.023)**2+((y-1.559)/.011)**2));
   const jaw=edge*mouth*T.MathUtils.smoothstep(y,1.491,1.516);
   const tache=Math.exp(-((x/.024)**2+((y-1.573)/.007)**2));
   const beard=typeof a.beard==='number'?a.beard:a.beard?.65:0;
   const amount=clamp(Math.max(jaw*beard,a.moustache?tache*.75:0),0,.85);
   c.lerp(hair,amount);
  }
  return {color:c,surface:[.53,0,1,0]};
 },skin);
 const eyeCenters=[-1,1].map(side=>shapeFace(side*.03385,1.6183,.08499,a)),r=.0118*(a.eyeSize??1);
 const glossy=(hex)=>{const c=new T.Color(hex);c.residentSurface=[.14,0,0,0];return c;};
 for(const [index,side] of [-1,1].entries()){
  const {x:ex,y:cy,z:ez}=eyeCenters[index];
  ell(ex,cy,ez,r,r,r,glossy(0xbcb8a9),'Head',20);
  const cap=(radius,half,color)=>{const g=new T.SphereGeometry(radius,20,8,0,Math.PI*2,0,half);g.rotateX(Math.PI/2);g.translate(ex,cy,ez);add(g,color,'Head');};
  cap(r+.00025,.51,glossy(a.eyes??0x575647));cap(r+.00045,.235,glossy(0x080b09));
  for(const upper of [true,false])add(eyelidGeometry(eyeCenters[index],r,upper),skin,'Head');
 }
 if(a.glasses){
  const surface=new GarmentSurface(scalp,()=>binding('Head')),fit=fitSpectacles(surface,eyeCenters,a),metal=new T.Color(a.frameColor??0x242923);metal.residentSurface=[.32,.4,0,0];
  for(const points of fit.frames){
   const path=new T.CatmullRomCurve3(points,true,'centripetal'),g=new T.TubeGeometry(path,64,.0017,6,true);add(g,metal,'Head');
  }
  for(const path of [...fit.arms,fit.bridge])for(let i=1;i<path.length;i++)tube(path[i-1],path[i],.0015,.0015,metal,'Head',6);
 }
 if(a.bald){scalp.dispose();return;}
 const sp=scalp.attributes.position,sn=scalp.attributes.normal,keep=[],masks=[];
 const curls=['curls','longCurls'].includes(a.hairStyle),long=['long','longCurls','braids'].includes(a.hairStyle)||female&&a.hairStyle==='waves';
 for(let i=0;i<sp.count;i++){
  const x=sp.getX(i),y=sp.getY(i),z=sp.getZ(i),front=clamp((z+.065)/.15,0,1);
  const line=1.565+.116*front+(female?.004:age*.020)-(a.hairStyle==='fringe'?.012:0);
  const m=clamp((y-line)/.025,0,1);masks.push(m);
  const grain=curls?.0018*Math.sin(x*430+y*207)*Math.cos(z*335):.0007*Math.sin(x*270+z*180);
  const offset=-.0035+m*(.009+clamp((y-1.67)/.09,0,1)*.009)+(grain*m);
  sp.setXYZ(i,x+sn.getX(i)*offset,y+sn.getY(i)*offset,z+sn.getZ(i)*offset);
 }
 for(let i=0;i<data.indices.length;i+=3){const ids=data.indices.slice(i,i+3);if(ids.some(k=>masks[k]>.001))keep.push(...ids);}
 scalp.setIndex(keep);scalp.deleteAttribute('skinUV');scalp.computeVertexNormals();add(scalp,hair,'Head');
 if(long){
  const positions=[],indices=[],rows=16,cols=32;
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
   const t=j/rows,angle=Math.PI*.39+i/cols*Math.PI*1.22,rx=.083*fw*(1+.16*t),rz=.095*(1+.20*t);
   positions.push(Math.sin(angle)*rx,1.655-t*(.29+.015*Math.sin(i*.7)),Math.cos(angle)*rz+.0015*Math.sin(t*18+i*.8));
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const k=j*(cols+1)+i;indices.push(k,k+cols+1,k+1,k+1,k+cols+1,k+cols+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();add(g,hair,y=>binding('Head','Chest',clamp((y-1.42)/.12,0,1)));
 }
 if(a.hairStyle==='bun')ell(0,1.68,-.091,.037,.034,.028,hair,'Head',20);
 if(a.hairStyle==='ponytail'){
  // A continuous tapered tail with a restrained neck blend, not stacked balls.
  const path=new T.CatmullRomCurve3([new T.Vector3(0,1.684,-.083),new T.Vector3(0,1.664,-.120),new T.Vector3(.010,1.555,-.132),new T.Vector3(.016,1.455,-.114)]);
  const g=new T.TubeGeometry(path,22,.018,12,false),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const t=Math.floor(i/13)/22,c=path.getPointAt(t),v=new T.Vector3().fromBufferAttribute(p,i).sub(c).multiplyScalar(1-.67*t).add(c);p.setXYZ(i,v.x,v.y,v.z);}
  g.computeVertexNormals();add(g,hair,y=>binding('Head','Chest',clamp((y-1.44)/.16,0,1)));
  const tie=new T.TorusGeometry(.019,.002,6,20);tie.rotateX(Math.PI/2);tie.translate(0,1.665,-.119);add(tie,dark,'Head');
 }
}
