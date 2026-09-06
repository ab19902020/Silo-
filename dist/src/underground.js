import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign, railing, fixture, pipe, desk } from './kit.js';

export function buildUnderground(m) {
  const root=new THREE.Group(),k=new Kit(m),solids=[],interactions=[],walkways=[];
  const rng=random(14418);
  // The entire void exists below the numbered silo. Its width is a separate
  // scale from the central atrium; dimensions remain reconstruction estimates.
  const R=80,base=5;
  const shell=new THREE.CylinderGeometry(R,R*1.04,68,96,16,true);
  const p=shell.getAttribute('position');for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z),n=1+(rng()-.5)*.045;p.setXYZ(i,x*n,p.getY(i),z*n);if(r===0)continue;}shell.computeVertexNormals();
  const rockMat=m.rock.clone();rockMat.side=THREE.BackSide;const rock=new THREE.Mesh(shell,rockMat);rock.position.y=38;root.add(rock);
  k.cylinder('darkConcrete',0,70,0,R,1.2);
  const water=new THREE.Mesh(new THREE.CircleGeometry(R-1,96),m.water);water.rotation.x=-Math.PI/2;water.position.y=5;root.add(water);
  for(let i=0;i<140;i++){const a=rng()*Math.PI*2,r=52+rng()*27,y=5+rng()*8;k.sphere('rock',Math.cos(a)*r,y,Math.sin(a)*r,1+rng()*4,.8+rng()*2,1+rng()*4);}
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
  k.arc('darkConcrete',68,74,.5,11.5,0,Math.PI*2,128);
  walkways.push({kind:'ring',r0:68,r1:74,y:12});
  for(let j=0;j<80;j++){const a=j*Math.PI/40,b=(j+1)*Math.PI/40;railing(k,[Math.cos(a)*68.2,Math.sin(a)*68.2],[Math.cos(b)*68.2,Math.sin(b)*68.2],12);if(j%5===0)fixture(k,Math.cos(a)*73.4,14.7,Math.sin(a)*73.4,1.5,true);}
  k.box('metal',39,11.85,0,64,.3,3.6);railing(k,[7,-1.8],[71,-1.8],12);railing(k,[7,1.8],[71,1.8],12);walkways.push({kind:'box',x:39,z:0,w:64,d:3.6,y:12});
  // Inspection platform at the end of the radial bridge.
  k.arc('rust',3.1,8,.3,11.7);walkways.push({kind:'ring',r0:3.1,r1:8,y:12});
  addSign(root,'LOWER ACCESS · MECHANICAL ↑',[72,14.2,-2],4,.6,-Math.PI/2);
  interactions.push({position:[72,13,0],label:'Climb to Mechanical',destination:144});
  addSign(root,'MAINTENANCE PASSAGE →',[69,13.7,15],4,.6,-Math.PI/2);
  interactions.push({position:[70,13,15],label:'Enter the hidden passage',destination:'tunnel'});
  // Mine workings are above the void, outside its upper rim. They are a
  // separate, inferred network reached by the Mechanical maintenance hatch.
  const mines=new THREE.Group();mines.position.set(105,48,0);root.add(mines);const mk=new Kit(m);
  const mineFloor={x:105,z:0,w:7.8,d:64,y:48};walkways.push({kind:'box',...mineFloor});
  mk.box('rock',0,-.3,0,8,.6,64);mk.box('rock',0,4.8,0,9,1.2,64);mk.box('rock',-4.5,2,0,1.3,5.4,64);mk.box('rock',4.5,2,0,1.3,5.4,64);
  solids.push({x:100.5,z:0,w:1.3,d:64,y0:47.5,y1:54},{x:109.5,z:0,w:1.3,d:64,y0:47.5,y1:54});
  for(let z=-30;z<=30;z+=4){for(const x of [-3.65,3.65])mk.box('wood',x,2,z,.4,4.2,.4);mk.box('wood',0,4,z,7.7,.5,.5);fixture(mk,0,3.9,z,1,false);for(let x=-1.5;x<=1.5;x+=3)mk.box('metal',x,.16,z, .09,.14,4.15);}
  for(let z=-31;z<32;z+=.8)mk.box('wood',0,.05,z,3.8,.1,.17);
  for(const z of [-8,7,21]){
    mk.box('rust',0,1.1,z,2.2,1.6,3);mk.box('black',0,1.94,z,1.9,.05,2.7);for(const x of [-1.1,1.1])for(const dz of [-1.05,1.05])mk.cylinder('darkMetal',x,.44,z+dz,.38,.18,0,0,Math.PI/2);
    for(let i=0;i<12;i++)mk.sphere('rock',(rng()-.5)*1.7,2+rng()*.2,z+(rng()-.5)*2.5,.25+rng()*.25,.3,.3);
    solids.push({x:105,z,w:2.4,d:3.1,y0:48,y1:50.4});
  }
  for(let i=0;i<60;i++){const side=i%2?1:-1;mk.sphere('rock',side*(3.2+rng()*.6),rng()*3.8,-30+rng()*60,.5+rng()*.5,.5,.7);}
  mk.box('rock',0,2.1,32,8,4.8,1);mk.box('rock',0,2.1,-32,8,4.8,1);solids.push({x:105,z:32,w:8,d:1,y0:48,y1:54},{x:105,z:-32,w:8,d:1,y0:48,y1:54});
  mk.cylinder('yellow',2.5,1.3,29,.4,2,Math.PI/2);mk.cylinder('metal',2.5,1.3,30.3,.13,1.2,Math.PI/2);
  addSign(mines,'MINING · ORE WORKING 18',[0,3.2,-28],5,.7);addSign(mines,'MECHANICAL ↑',[0,2.5,-31.4],4,.65);
  interactions.push({position:[105,49,-29],label:'Return to Mechanical',destination:144},{position:[107,49,28],label:'Inspect the rock drill',action:'mines'});
  mines.add(mk.group());
  // Lower passage: enclosed tunnel, pipe, bolted door and a fixed inspection
  // lamp. No invented connection to another silo is claimed.
  const tunnel=new THREE.Group();tunnel.position.set(105,8,88);root.add(tunnel);const tk=new Kit(m);
  tk.box('darkConcrete',0,-.2,0,5,.4,36);tk.box('darkConcrete',-2.6,1.7,0,.3,3.4,36);tk.box('darkConcrete',2.6,1.7,0,.3,3.4,36);tk.box('darkConcrete',0,3.5,0,5.5,.25,36);
  for(const x of [-2.1,2.1])pipe(tk,x,0,2.9,36,.18);for(let z=-16;z<17;z+=5)fixture(tk,0,3.28,z,.8);
  tk.box('darkMetal',0,1.65,17.8,4.8,3.3,.3);tk.torus('metal',0,1.7,17.58,.65,.075);for(const x of [-1.9,1.9])for(const y of [.4,1.2,2,2.8])tk.cylinder('brass',x,y,17.58,.07,.1,Math.PI/2);
  addSign(tunnel,'SEALED ACCESS',[0,2.8,17.6],3,.45,Math.PI);addSign(tunnel,'VOID ACCESS ↑',[0,2.6,-17.7],3,.5);
  walkways.push({kind:'box',x:105,z:88,w:5,d:36,y:8});
  solids.push({x:102.4,z:88,w:.3,d:36,y0:8,y1:12},{x:107.6,z:88,w:.3,d:36,y0:8,y1:12},{x:105,z:105.8,w:4.8,d:.3,y0:8,y1:12},{x:105,z:70,w:5,d:.3,y0:8,y1:12});
  interactions.push({position:[105,9,103.6],label:'Inspect sealed tunnel door',action:'tunnel'},{position:[105,9,72.5],label:'Return to the excavator',destination:'excavator'});
  tunnel.add(tk.group());root.add(k.group());
  const lights=[new THREE.PointLight(0xb8d2c7,550,100,1.7),new THREE.PointLight(0xd8a65f,450,100,1.6)];lights[0].position.set(28,42,16);lights[1].position.set(-28,24,-10);root.add(...lights);
  return {root,solids,interactions,walkways,water,mines,tunnel,lights};
}
