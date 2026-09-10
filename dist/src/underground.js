import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign, railing, fixture } from './kit.js';
import { buildMineNetwork } from './mine-network.js';
import { VOID, voidLedgeGaps, buildVoidAccess } from './void-access.js';
import { voidWaterGeometry } from './void-surfaces.js';
import { projectMaterial } from './materials.js';
import { VoidWater } from './water.js';

export function buildUnderground(m) {
  const root=new THREE.Group(),k=new Kit(m),solids=[],interactions=[],walkways=[];
  const rng=random(14418);
  // The entire void exists below the numbered silo. Its width is a separate
  // scale from the central atrium; dimensions remain reconstruction estimates.
  const R=80,base=5;
  const shell=new THREE.CylinderGeometry(R,R*1.04,68,192,68,true);
  const p=shell.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),angle=Math.atan2(z,x),y=p.getY(i),r=Math.hypot(x,z),n=1+.014*Math.sin(angle*11+y*.27)+.009*Math.cos(angle*23-y*.48)+.006*Math.sin(y*1.12+Math.sin(angle*7));p.setXYZ(i,x*n,p.getY(i),z*n);if(r===0)continue;}const indices=[];for(let i=0;i<shell.index.count;i+=3){const ids=[0,1,2].map(j=>shell.index.getX(i+j)),x=ids.reduce((v,j)=>v+p.getX(j),0)/3,z=ids.reduce((v,j)=>v+p.getZ(j),0)/3,y=ids.reduce((v,j)=>v+p.getY(j),0)/3+38;const d=Math.atan2(Math.sin(Math.atan2(z,x)-VOID.tunnelAngle),Math.cos(Math.atan2(z,x)-VOID.tunnelAngle));const entrance=Math.abs(Math.atan2(z,x))<.024&&y>11.6&&y<15.35;if(!(Math.abs(d)<.053&&y<9.5)&&!entrance)indices.push(...ids);}shell.setIndex(indices);shell.computeVertexNormals();
  const rockMat=m.rock.clone();rockMat.side=THREE.BackSide;rockMat.userData.voidStrata=true;projectMaterial(rockMat,2.8);const rock=new THREE.Mesh(shell,rockMat);rock.position.y=38;root.add(rock);
  k.cylinder('darkConcrete',0,70,0,R,1.2);
  const water=new THREE.Mesh(voidWaterGeometry(),m.water);water.name='continuous-void-water';water.renderOrder=2;root.add(water);const waterSurface=new VoidWater(water);
  for(let i=0;i<140;i++){
    const a=rng()*Math.PI*2,r=52+rng()*27,y=5+rng()*8,x=Math.cos(a)*r,z=Math.sin(a)*r,rx=1+rng()*4,ry=.8+rng()*2,rz=1+rng()*4;
    // Keep the visible wading route clear of the decorative scree too.
    if(x>58&&x<79&&z>1&&z<25)continue;
    k.sphere('rock',x,y,z,rx,ry,rz);
  }
  // Central abandoned tower with multiple steel platforms, radial excavation
  // arms, cutting drums, trusses, access ladders and attached cable runs.
  k.cylinder('darkMetal',0,25,0,3.1,43);
  for(const y of [9,18,29,42,54]){
    k.arc('rust',3,7.3,.28,y,0,Math.PI*2,64);
    for(let j=0;j<24;j++){const a=j*Math.PI/12,b=(j+1)*Math.PI/12;railing(k,[Math.cos(a)*7.15,Math.sin(a)*7.15],[Math.cos(b)*7.15,Math.sin(b)*7.15],y+.28);}
    for(let j=0;j<8;j++){const a=j*Math.PI/4;k.box('metal',Math.cos(a)*4.5,y+2,Math.sin(a)*4.5,.35,4,.35);}
  }
  for(let j=0;j<8;j++){
    const a=j*Math.PI/4,ux=Math.cos(a),uz=Math.sin(a),vx=-uz,vz=ux;
    for(const y of [16,30]){
      for(const side of [-1,1]){const start=[ux*5+vx*side*1.2,y,uz*5+vz*side*1.2],end=[ux*49+vx*side*2,y-7,uz*49+vz*side*2];k.beam('rust',start,end,.45);}
      for(let i=0;i<11;i++){const r=6+i*4.1,next=r+4.1,yy=y-(r-5)/44*7,ny=y-(next-5)/44*7;const left=[ux*r-vx*1.4,yy,uz*r-vz*1.4],right=[ux*next+vx*1.4,ny,uz*next+vz*1.4];k.beam('metal',left,right,.12);k.beam('metal',[ux*r+vx*1.4,yy,uz*r+vz*1.4],[ux*next-vx*1.4,ny,uz*next-vz*1.4],.12);}
    }
    k.beam('darkMetal',[ux*5,44,uz*5],[ux*49,24,uz*49],.065);
    const drum=new THREE.Group();drum.position.set(ux*49,10,uz*49);drum.rotation.y=-a+Math.PI/2;
    const dk=new Kit(m);dk.cylinder('rust',0,0,0,4.3,5,Math.PI/2);for(let tooth=0;tooth<32;tooth++){const angle=tooth*Math.PI/16;for(const z of [-2,-.7,.7,2])dk.box('metal',Math.cos(angle)*4.4,Math.sin(angle)*4.4,z,.5,.65,.45,0,0,angle);}drum.add(dk.group());root.add(drum);
  }
  for(const x of [-3.5,3.5]){k.cylinder('metal',x,32,3.7,.07,43);for(let y=11;y<54;y+=.35)k.beam('metal',[x-.4,y,3.9],[x+.4,y,3.9],.028);}
  for(let i=0;i<8;i++){const a=i*Math.PI/4;fixture(k,Math.cos(a)*6.8,30,Math.sin(a)*6.8,1,true);}

  // A dry circumferential service ledge and bridge allow on-foot inspection.
  k.arc('darkConcrete',68,74,.47,11.5,0,Math.PI*2,128);
  walkways.push({kind:'ring',r0:68,r1:74,y:12});
  for(let j=0;j<80;j++){const a=j*Math.PI/40,b=(j+1)*Math.PI/40;const mid=(a+b)/2,open=voidLedgeGaps.some(([c,h])=>Math.abs(Math.atan2(Math.sin(mid-c),Math.cos(mid-c)))<h+(b-a)/2);if(!open)railing(k,[Math.cos(a)*68.2,Math.sin(a)*68.2],[Math.cos(b)*68.2,Math.sin(b)*68.2],12);if(j%5===0)fixture(k,Math.cos(a)*73.4,14.7,Math.sin(a)*73.4,1.5,true);}
  k.box('metal',39,11.85,0,64,.3,3.6);railing(k,[7,-1.8],[71,-1.8],12);railing(k,[7,1.8],[71,1.8],12);walkways.push({kind:'box',x:39,z:0,w:64,d:3.6,y:12});
  // Inspection platform at the end of the radial bridge.
  k.arc('rust',3.1,8,.265,11.7);walkways.push({kind:'ring',r0:3.1,r1:8,y:12});
  // Concealed access arrives through the perimeter, facing the excavator.
  // The exit is a narrow, unmarked passage, not a Mechanical sign in the void.
  const entry=new THREE.Group(),ek=new Kit(m);entry.name='concealed-void-entry';root.add(entry);
  ek.box('darkConcrete',78,11.81,0,14,.38,2.7);walkways.push({kind:'box',x:78,z:0,w:14,d:2.7,y:12});
  for(const z of [-1.47,1.47]){ek.box('darkConcrete',79.5,13.5,z,11,3,.24);solids.push({x:79.5,z,w:11,d:.24,y0:12,y1:15});}
  ek.box('darkConcrete',79.5,15.1,0,11,.2,3.18);ek.box('darkConcrete',84.8,13.5,0,.4,3,2.7);solids.push({x:84.8,z:0,w:.4,d:2.7,y0:12,y1:15});
  for(const x of [75,78,81.4]){ek.portal('rust',x,12,0,2.65,3,.12,Math.PI/2,.18,.06);fixture(ek,x,14.7,0,.6);}
  entry.add(ek.group());const entryLight=new THREE.PointLight(0xb4c1ac,48,16,1.8);entryLight.position.set(78.5,14.4,0);entry.add(entryLight);
  interactions.push({position:[82.2,13,0],label:'Return through the concealed passage',destination:'digger-passage'});
  const access=buildVoidAccess(m);root.add(access.root);solids.push(...access.solids);walkways.push(...access.walkways);interactions.push(...access.interactions);
  // Mine workings are above the void, outside its upper rim. They are a
  // separate, inferred network reached by the Mechanical maintenance hatch.
  const mineNetwork=buildMineNetwork(m),mines=mineNetwork.root;
  mines.position.set(105,48,0);root.add(mines);
  const shiftBox=b=>({...b,local:false,x:b.x+105,y0:b.y0+48,y1:b.y1+48});
  const mineSpace={...mineNetwork,
    solids:mineNetwork.solids.map(shiftBox),
    walkways:mineNetwork.walkways.map(f=>({...f,local:false,x:f.x+105,y:f.y+48})),
    interactions:mineNetwork.interactions.map(i=>({...i,position:[i.position[0]+105,i.position[1]+48,i.position[2]]})),
  };
  // This panel joins the new deep face to the independently loaded pressure gallery.
  const hatch=new Kit(m);hatch.bevel('darkMetal',-2.5,1.25,54.75,1.4,2.5,.12);
  hatch.box('red',-3.04,1.25,54.65,.08,2.3,.05);hatch.box('brass',-2.02,1.25,54.58,.08,.24,.09);
  mines.add(hatch.group());addSign(mines,'18 / SERVICE',[-2.5,2.95,54.68],1.7,.35,Math.PI);
  mineSpace.interactions.push({position:[102.5,49.3,54.1],label:'Open the red-line service hatch',destination:'pipe-gallery'});
  const mineLights=mineNetwork.lights,mineLocal=new THREE.Vector3();
  // Fixed fixtures with a bounded set of active lights. Hysteresis keeps lamps
  // stable near chamber boundaries; inactive fittings retain emissive lenses.
  let lampTick=0;
  mineNetwork.update(0,0,null,'balanced');
  const updateMine=(dt,time,position,quality)=>{
    mineLocal.copy(position).sub(mines.position);mineNetwork.update(dt,time,mineLocal,quality);
    lampTick-=dt;if(lampTick>0)return;lampTick=.3;
    const budget=quality==='low'?4:quality==='high'?10:6;
    const score=l=>l.position.distanceToSquared(mineLocal)*(l.visible?.7:1);
    const ranked=mineLights.slice().sort((a,b)=>score(a)-score(b));
    for(let i=0;i<ranked.length;i++)ranked[i].visible=i<budget;
  };
  const tunnel=access.tunnel;root.add(k.group());
  const lights=[new THREE.PointLight(0xb8d2c7,550,100,1.7),new THREE.PointLight(0xd8a65f,450,100,1.6)];lights[0].position.set(28,42,16);lights[1].position.set(-28,24,-10);root.add(...lights);
  const refreshMaterials=()=>{for(const key of ['map','normalMap','roughnessMap'])rockMat[key]=m.rock[key];rockMat.normalScale.set(.65,.65);rockMat.color.setHex(0x969d98);rockMat.roughness=.92;rockMat.envMapIntensity=.45;projectMaterial(rockMat,2.8);};
  return {root,solids,interactions,walkways,water,waterSurface,refreshMaterials,mines,mineSpace,updateMine,tunnel,lights,mineLights,entry,camp:access.camp,ladders:access.ladders,access};
}
