import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign, railing, fixture } from './kit.js';
import { wallGauge } from './environment-details.js';
import { VOID, voidLedgeGaps, buildVoidAccess } from './void-access.js';
import { voidWaterGeometry } from './void-surfaces.js';

export function buildUnderground(m) {
  const root=new THREE.Group(),k=new Kit(m),solids=[],interactions=[],walkways=[];
  const rng=random(14418);
  // The entire void exists below the numbered silo. Its width is a separate
  // scale from the central atrium; dimensions remain reconstruction estimates.
  const R=80,base=5;
  const shell=new THREE.CylinderGeometry(R,R*1.04,68,192,68,true);
  const p=shell.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),n=1+(rng()-.5)*.045;p.setXYZ(i,x*n,p.getY(i),z*n);if(r===0)continue;}const indices=[];for(let i=0;i<shell.index.count;i+=3){const ids=[0,1,2].map(j=>shell.index.getX(i+j)),x=ids.reduce((v,j)=>v+p.getX(j),0)/3,z=ids.reduce((v,j)=>v+p.getZ(j),0)/3,y=ids.reduce((v,j)=>v+p.getY(j),0)/3+38;const d=Math.atan2(Math.sin(Math.atan2(z,x)-VOID.tunnelAngle),Math.cos(Math.atan2(z,x)-VOID.tunnelAngle));const entrance=Math.abs(Math.atan2(z,x))<.024&&y>11.6&&y<15.35;if(!(Math.abs(d)<.053&&y<9.5)&&!entrance)indices.push(...ids);}shell.setIndex(indices);shell.computeVertexNormals();
  const rockMat=m.rock.clone();rockMat.side=THREE.BackSide;const rock=new THREE.Mesh(shell,rockMat);rock.position.y=38;root.add(rock);
  k.cylinder('darkConcrete',0,70,0,R,1.2);
  const water=new THREE.Mesh(voidWaterGeometry(),m.water);water.name='continuous-void-water';water.renderOrder=2;root.add(water);
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
  const mines=new THREE.Group();mines.position.set(105,48,0);root.add(mines);const mk=new Kit(m);
  const mineFloor={x:105,z:0,w:7.8,d:64,y:48};walkways.push({kind:'box',...mineFloor});
  mk.box('rock',0,-.3,0,8,.6,64);mk.box('rock',0,4.8,0,9,1.2,64);mk.box('rock',-4.5,2,0,1.3,5.4,64);mk.box('rock',4.5,2,0,1.3,5.4,64);
  solids.push({x:100.5,z:0,w:1.3,d:64,y0:47.5,y1:54},{x:109.5,z:0,w:1.3,d:64,y0:47.5,y1:54});
  for(let z=-30;z<=30;z+=4){for(const x of [-3.65,3.65])mk.box('wood',x,2,z,.4,4.2,.4);mk.box('wood',0,4,z,7.7,.5,.5);fixture(mk,0,3.9,z,1,false);for(let x=-1.5;x<=1.5;x+=3)mk.box('metal',x,.16,z, .09,.14,4.15);}
  for(let z=-31;z<32;z+=.8)mk.box('wood',0,.05,z,3.8,.1,.17);
  for(let z=-30;z<=30;z+=4){
    for(const x of [-3.65,3.65]){
      for(const y of [.25,3.8]){mk.box('darkMetal',x,y,z-.225,.46,.26,.035);for(const dx of [-.14,.14])mk.cylinder('brass',x+dx,y,z-.251,.023,.037,Math.PI/2);}
      mk.box('darkMetal',x,3.31,z,.13,.16,.18);
    }
    for(const x of [-1.5,1.5])for(const dz of [-.7,0,.7])mk.box('rust',x,.195,z+dz,.22,.025,.10);
  }
  for(const x of [-3.72,-3.61,-3.5])mk.cylinder('black',x,3.27,0,.025,62,Math.PI/2);
  for(const z of [-8,7,21]){
    mk.box('rust',0,1.1,z,2.2,1.6,3);mk.box('black',0,1.94,z,1.9,.05,2.7);for(const x of [-1.1,1.1])for(const dz of [-1.05,1.05])mk.cylinder('darkMetal',x,.44,z+dz,.38,.18,0,0,Math.PI/2);
    for(let i=0;i<12;i++)mk.sphere('rock',(rng()-.5)*1.7,2+rng()*.2,z+(rng()-.5)*2.5,.25+rng()*.25,.3,.3);
    solids.push({x:105,z,w:2.4,d:3.1,y0:48,y1:50.4});
  }
  for(let i=0;i<60;i++){const side=i%2?1:-1;mk.sphere('rock',side*(3.2+rng()*.6),rng()*3.8,-30+rng()*60,.5+rng()*.5,.5,.7);}
  mk.box('rock',0,2.1,32,8,4.8,1);mk.box('rock',0,2.1,-32,8,4.8,1);solids.push({x:105,z:32,w:8,d:1,y0:48,y1:54},{x:105,z:-32,w:8,d:1,y0:48,y1:54});
  mk.cylinder('yellow',2.5,1.3,29,.4,2,Math.PI/2);mk.cylinder('metal',2.5,1.3,30.3,.13,1.2,Math.PI/2);
  for(let z=28.1;z<30;z+=.2)mk.torus('metal',2.5,1.3,z,.405,.025);
  wallGauge(mk,2.5,1.95,28.5,.15);for(let j=0;j<7;j++){const z=27.6+j*.4;mk.torus('black',2.6,.12,z,.22,.028,Math.PI/2);}
  addSign(mines,'MINING · ORE WORKING 18',[0,3.2,-28],5,.7);addSign(mines,'MECHANICAL ↑',[0,2.5,-31.4],4,.65);
  interactions.push({position:[105,49,-29],label:'Return to Mechanical',destination:144},{position:[107,49,28],label:'Inspect the rock drill',action:'mines'});
  mines.add(mk.group());
  const mineLights=[];for(const z of [-26,-10,6,22]){const light=new THREE.PointLight(0xe1c392,72,20,1.8);light.position.set(0,3.7,z);mines.add(light);mineLights.push(light);}
  const tunnel=access.tunnel;root.add(k.group());
  const lights=[new THREE.PointLight(0xb8d2c7,550,100,1.7),new THREE.PointLight(0xd8a65f,450,100,1.6)];lights[0].position.set(28,42,16);lights[1].position.set(-28,24,-10);root.add(...lights);
  return {root,solids,interactions,walkways,water,mines,tunnel,lights,mineLights,entry,camp:access.camp,ladders:access.ladders,access};
}
