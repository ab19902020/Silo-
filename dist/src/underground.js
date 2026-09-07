import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign, railing, fixture, pipe, desk, bed, shelf, table, chair } from './kit.js';
import { wallGauge } from './environment-details.js';

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

  // ---- The camp, the caged descent and the lower door ---------------------
  // The inspection platform widens into a bay somebody has been living in, and
  // a caged stair runs from the platform down the side of the void to a
  // landing at the waterline, where a bulkhead is set into the tower's base.
  // The show establishes the flooded depth, an improvised camp lived in out of
  // sight, and a sealed lower door; no filmed plan of this space was
  // available, so the layout here is a reconstruction, not a copy.
  const CAMP_A=Math.PI,CAMP_HALF=.9,DECK=12;
  k.arc('rust',3.1,12,.3,DECK-.3,CAMP_A-CAMP_HALF,CAMP_HALF*2,32);
  walkways.push({kind:'arc',r0:3.1,r1:12,y:DECK,a:CAMP_A,half:CAMP_HALF});
  k.arc('darkMetal',11.8,12.04,1.1,DECK,CAMP_A-CAMP_HALF,CAMP_HALF*2,32);
  solids.push({arc:true,r0:11.8,r1:12.04,y0:DECK,y1:DECK+1.1,a:CAMP_A,half:CAMP_HALF});
  for(const edge of [-1,1]){
    const ea=CAMP_A+edge*CAMP_HALF;
    railing(k,[Math.cos(ea)*3.3,Math.sin(ea)*3.3],[Math.cos(ea)*11.9,Math.sin(ea)*11.9],DECK);
  }
  // The camp itself is axis aligned on the -X side so its walls and its hidden
  // cavity can carry ordinary box collision.
  const camp=new THREE.Group();camp.position.set(-8,DECK,0);root.add(camp);const ck=new Kit(m);
  const wall=(x,z,w,d,h=2.6)=>{ck.box('rust',x,h/2,z,w,h,d);solids.push({x:-8+x,z,w,d,y0:DECK,y1:DECK+h});};
  wall(-3.3,0,.16,7.2);wall(0,-3.5,6.6,.16);wall(0,3.5,6.6,.16);           // three salvaged plate walls
  ck.box('darkMetal',0,2.72,0,6.8,.12,7.2);                                 // a scavenged roof keeps the lamps in
  for(const z of [-2.2,2.2])fixture(ck,-1.4,2.5,z,1.2,false);
  bed(ck,-2.2,-2.1);
  shelf(ck,-2.6,1.9,2.6,2.1);
  table(ck,.9,1.4,1.5,.9);chair(ck,.9,.3,Math.PI);
  // Salvaged relics on the shelf: tins, a bottle, books and a wound-up cable.
  const relicMats=['brass','glass','wood','white','metal'];
  for(let i=0;i<16;i++){
    const shelfY=[.15,.8,1.45,2.1][i%4],off=-3.6+((i*.47)%2.2);
    ck.box(relicMats[i%relicMats.length],off,shelfY+.14,1.9+((i%3)-1)*.18,.16+((i%4)*.05),.26,.14);
  }
  ck.cylinder('brass',-1.6,.3,1.9,.13,.34);ck.torus('metal',-1.1,.34,1.9,.16,.03,Math.PI/2);
  // A hung curtain screens a cut-out in the outer plate: the hiding place.
  ck.box('green',-3.15,1.25,-.9,.06,2.4,1.9);
  ck.cylinder('metal',-3.15,2.5,-.9,.02,2,Math.PI/2,0,Math.PI/2);
  camp.add(ck.group());
  addSign(camp,'NO ENTRY · MAINTENANCE',[0,2.35,-3.58],2.6,.36,0,{background:'#4a2f22',color:'#d8c9a6'});
  interactions.push({position:[-11,DECK+1,-.9],label:'Look behind the curtain',action:'camp'});
  interactions.push({position:[-10.6,DECK+1,1.9],label:'Inspect the salvaged relics',action:'relics'});

  // A caged stair descends clear of the tower rings and stanchions.
  const STAIR_A=4.1,STAIR_SWEEP=1.745,TREADS=24,BASE=DECK-TREADS*.273;
  for(let i=0;i<TREADS;i++){
    const a0=STAIR_A+STAIR_SWEEP*i/TREADS,a1=STAIR_A+STAIR_SWEEP*(i+1)/TREADS,y=DECK-(i+1)*.273,half=(a1-a0)/2;
    k.arc('rust',8,11,.16,y-.16,a0,a1-a0,3);
    walkways.push({kind:'arc',r0:8,r1:11,y,a:a0+half,half:half*1.02});
    k.arc('darkMetal',10.85,11.06,1.06,y,a0,a1-a0,3);
    solids.push({arc:true,r0:10.85,r1:11.06,y0:y,y1:y+1.06,a:a0+half,half:half*1.02});
    // The inner guard starts below the head of the run: carried all the way up
    // it would wall the stair off from the platform it is reached from.
    if(i>=2){k.arc('darkMetal',7.94,8.15,1.06,y,a0,a1-a0,3);
      solids.push({arc:true,r0:7.94,r1:8.15,y0:y,y1:y+1.06,a:a0+half,half:half*1.02});}
    // Ladder-style hoops over the run, and a lamp every sixth tread.
    if(i%3===0){let prev=null;for(let h=0;h<=8;h++){const t=h/8,rr=8.06+t*2.88,yy=y+1.02+Math.sin(t*Math.PI)*1.3,pt=[Math.cos(a0)*rr,yy,Math.sin(a0)*rr];if(prev)k.beam('darkMetal',prev,pt,.035);prev=pt;}}
    if(i%6===0)fixture(k,Math.cos(a0)*8.4,y+2.3,Math.sin(a0)*8.4,.9,false);
  }
  // Landing at the waterline, reaching in to the tower's base.
  const END_A=STAIR_A+STAIR_SWEEP,LAND_HALF=.42;
  k.arc('rust',3.3,11,.3,BASE-.3,END_A-.06,LAND_HALF*2,20);
  walkways.push({kind:'arc',r0:3.3,r1:11,y:BASE,a:END_A-.06+LAND_HALF,half:LAND_HALF});
  k.arc('darkMetal',10.8,11.04,1.1,BASE,END_A-.06,LAND_HALF*2,20);
  solids.push({arc:true,r0:10.8,r1:11.04,y0:BASE,y1:BASE+1.1,a:END_A-.06+LAND_HALF,half:LAND_HALF});
  const doorA=END_A-.06+LAND_HALF,dx=Math.cos(doorA),dz=Math.sin(doorA);
  const lower=new THREE.Group();lower.position.set(dx*3.3,BASE,dz*3.3);lower.rotation.y=-doorA+Math.PI/2;root.add(lower);
  const lk=new Kit(m);
  // Local +z is radially outward here, so the door has to be built on that face
  // or it presents its blank back to everyone coming down the stair.
  lk.box('darkMetal',0,1.6,0,3.4,3.2,.34);lk.box('rust',0,1.55,.2,2.5,2.6,.14);
  lk.torus('metal',0,1.5,.31,.52,.07);for(const x of [-1.05,1.05])for(const y of [.5,1.5,2.5])lk.cylinder('brass',x,y,.29,.06,.1,Math.PI/2);
  fixture(lk,0,3.05,.26,1.4,false);
  lower.add(lk.group());
  addSign(lower,'LOWER ACCESS · SEALED',[0,3.42,.28],2.6,.4,0);
  interactions.push({position:[dx*4.4,BASE+1,dz*4.4],label:'Open the lower door',destination:'tunnel'});
  addSign(root,'DESCENT TO WATERLINE ↓',[Math.cos(STAIR_A)*9.4,DECK+1.5,Math.sin(STAIR_A)*9.4],3.4,.5,-STAIR_A+Math.PI/2);
  // The water reads as a floor from the landing: standing here you are level
  // with it, which is the point of the descent.
  const landingLight=new THREE.PointLight(0x9fc2b6,120,34,1.8);landingLight.position.set(dx*7,BASE+2.6,dz*7);root.add(landingLight);
  const campLight=new THREE.PointLight(0xe0b478,130,26,1.7);campLight.position.set(-7.4,DECK+2.2,0);root.add(campLight);
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
  // Lower passage: enclosed tunnel, pipe, bolted door and a fixed inspection
  // lamp. No invented connection to another silo is claimed.
  const tunnel=new THREE.Group();tunnel.position.set(105,8,88);root.add(tunnel);const tk=new Kit(m);
  tk.box('darkConcrete',0,-.2,0,5,.4,36);tk.box('darkConcrete',-2.6,1.7,0,.3,3.4,36);tk.box('darkConcrete',2.6,1.7,0,.3,3.4,36);tk.box('darkConcrete',0,3.5,0,5.5,.25,36);
  for(const x of [-2.1,2.1])pipe(tk,x,0,2.9,36,.18);for(let z=-16;z<17;z+=5)fixture(tk,0,3.28,z,.8);
  for(let z=-16;z<17;z+=3){tk.portal('metal',0,0,z,4.7,3.28,.14,0,.48,.09);for(const x of [-2.1,2.1]){tk.torus('metal',x,2.9,z,.215,.026);for(const dx of [-.14,.14])tk.cylinder('brass',x+dx,3.04,z,.019,.09,Math.PI/2);}}
  tk.box('darkMetal',0,1.65,17.8,4.8,3.3,.3);tk.torus('metal',0,1.7,17.58,.65,.075);for(const x of [-1.9,1.9])for(const y of [.4,1.2,2,2.8])tk.cylinder('brass',x,y,17.58,.07,.1,Math.PI/2);
  addSign(tunnel,'SEALED ACCESS',[0,2.8,17.6],3,.45,Math.PI);addSign(tunnel,'VOID ACCESS ↑',[0,2.6,-17.7],3,.5);
  walkways.push({kind:'box',x:105,z:88,w:5,d:36,y:8});
  solids.push({x:102.4,z:88,w:.3,d:36,y0:8,y1:12},{x:107.6,z:88,w:.3,d:36,y0:8,y1:12},{x:105,z:105.8,w:4.8,d:.3,y0:8,y1:12},{x:105,z:70,w:5,d:.3,y0:8,y1:12});
  interactions.push({position:[105,9,103.6],label:'Inspect sealed tunnel door',action:'tunnel'},{position:[105,9,72.5],label:'Return to the excavator',destination:'excavator'});
  tunnel.add(tk.group());root.add(k.group());
  const lights=[new THREE.PointLight(0xb8d2c7,550,100,1.7),new THREE.PointLight(0xd8a65f,450,100,1.6)];lights[0].position.set(28,42,16);lights[1].position.set(-28,24,-10);root.add(...lights);
  return {root,solids,interactions,walkways,water,mines,tunnel,lights};
}
