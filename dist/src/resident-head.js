import * as T from '../vendor/three.module.js';
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
  p.setX(i,p.getX(i)*fw);
  // Small jaw and brow differences retain character individuality without
  // distorting the eye openings or stretching texture features.
  const y=p.getY(i),x=p.getX(i),z=p.getZ(i);
  if(y<1.59&&y>1.53)p.setX(i,x*(female?.94:1.025));
  const u=data.uv[i*2],v=data.uv[i*2+1],valid=u>=u0&&v>=v0&&v<=v1;
  uv.push(((tile%4)+clamp((u-u0)/(u1-u0),.001,.999))/4,(Math.floor(tile/4)+clamp((v1-v)/(v1-v0),.001,.999))/2,valid?1:0);
 }
 geometry.computeVertexNormals();geometry.setAttribute('skinUV',new T.Float32BufferAttribute(uv,3));
 // Preserve the skin palette (also used by hands and neck) while retaining
 // photographed detail. Texture colour is converted to linear by the GPU.
 const mean=data.means[tile],tint=new T.Color().setRGB(skin.r/mean[0],skin.g/mean[1],skin.b/mean[2]);tint.skinSurface=true;
 const headBind=y=>y>1.565?binding('Head'):binding('Neck','Chest',clamp((y-1.45)/.085,0,1));
 const scalp=geometry.clone();
 add(geometry,tint,headBind,null,false,(x,y,z,i)=>{
  const mapped=uv[i*3+2]>.5,c=(mapped?tint:skin).clone();
  if(mapped&&z>.050&&(a.beard||a.moustache)){
   const edge=T.MathUtils.smoothstep(1.591-y,0,.035),mouth=1-Math.exp(-((x/.023)**2+((y-1.559)/.011)**2));
   const jaw=edge*mouth*T.MathUtils.smoothstep(y,1.491,1.516);
   const tache=Math.exp(-((x/.024)**2+((y-1.573)/.007)**2));
   const beard=typeof a.beard==='number'?a.beard:a.beard?.65:0;
   const amount=clamp(Math.max(jaw*beard,a.moustache?tache*.75:0),0,.85);
   c.lerp(new T.Color().setRGB(hair.r/mean[0],hair.g/mean[1],hair.b/mean[2]),amount);
  }
  return {color:c,surface:[.53,0,1,0]};
 },skin);
 const cy=1.6183,ex=.03385*fw,ez=.08499,r=.0118;
 const glossy=(hex)=>{const c=new T.Color(hex);c.residentSurface=[.14,0,0,0];return c;};
 for(const side of [-1,1]){
  ell(side*ex,cy,ez,r,r,r,glossy(0xbcb8a9),'Head',20);
  const cap=(radius,half,color)=>{const g=new T.SphereGeometry(radius,20,8,0,Math.PI*2,0,half);g.rotateX(Math.PI/2);g.translate(side*ex,cy,ez);add(g,color,'Head');};
  cap(r+.00025,.51,glossy(a.eyes??0x575647));cap(r+.00045,.235,glossy(0x080b09));
 }
 if(a.glasses){for(const side of [-1,1]){const g=new T.TorusGeometry(.021,.0018,6,24);g.scale(1,.78,.7);g.translate(side*ex,cy+.001,.100);add(g,dark,'Head');tube(new T.Vector3(side*.052,cy+.004,.091),new T.Vector3(side*.077,cy+.005,-.006),.0016,.0016,dark,'Head',6);}box(0,cy+.004,.101,.027,.0025,.003,dark,'Head');}
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
}
