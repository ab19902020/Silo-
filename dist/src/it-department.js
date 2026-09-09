import * as THREE from '../vendor/three.module.js';
import { Kit, fixture, desk, chair, table, shelf, bed } from './kit.js';

// Level 19: IT.
//
// Sourced, not invented. The IT offices are on Level 19 and are a large
// central office of workstations, with the Head of IT's own office separated
// from that workspace by a corridor. The server room connects through to a
// vault behind a locked door, and Bernard keeps a concealed radio in there to
// reach Silo 1. The vault itself is deliberately unlike everywhere else in the
// silo — smooth and lit rather than poured concrete — with the servers and
// their power banks raised on steps to one side so the machine keeps running
// through a cut, living quarters stocked to hold a lot of people for a long
// time, and an AI called Legacy that answers through a holographic interface
// and raises alerts of its own accord. Everything below is built to that
// description; the exact dimensions are inferred, as they are everywhere else
// in this reconstruction.

const rack=(k,x,y,z,w=1.65,h=3,d=1.1,mat='darkMetal')=>{
  k.box(mat,x,y+h/2,z,w,h,d);
  for(let t=.24;t<h-.15;t+=.235){
    k.box('metal',x,y+t,z-d/2+.03,w-.2,.16,.08);
    for(let j=0;j<4;j++)k.box(j===0?'indicator':'brass',x-w/2+.12+j*.14,y+t,z-d/2-.02,.045,.03,.012);
  }
};

// --- the offices ----------------------------------------------------------
export function buildITOffices(k,{box,solids,interactions,label}){
  // A long central office. Desks in facing rows with a walkway between them,
  // glazed partitions rather than block walls, and the server aisle closed off
  // at the back behind a door only IT opens.
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const z=4.4+row*4.2,x=side*4.6;
    desk(k,x,z);chair(k,x,z+1.15,side>0?0:Math.PI);solids.push({x,z,w:2,d:1,y0:0,y1:1.6});
    desk(k,x,z+2.1);chair(k,x,z+.95);solids.push({x,z:z+2.1,w:2,d:1,y0:0,y1:1.6});
    k.box('darkMetal',x-.42,1.16,z-.02,.52,.42,.4);k.box('screen',x-.42,1.16,z-.21,.44,.34,.012);
    k.box('darkMetal',x-.42,1.16,z+2.08,.52,.42,.4);k.box('screen',x-.42,1.16,z+2.27,.44,.34,.012);
  }
  for(const side of [-1,1]){
    box('panel',side*8.9,1.0,9,.14,2,17,true);
    k.box('glass',side*8.9,2.9,9,.1,1.8,17);
    box('panel',side*1.9,.55,9,.12,1.1,17,true);           // low glazed divider down the middle
    k.box('glass',side*1.9,1.5,9,.08,.8,17);
  }
  // A glazed screen down the left of the entrance makes a lobby of the near
  // end of the floor. The way in stays clear: the wing doorway is the 4 m gap
  // in the middle of the gallery wall and nothing may stand in it.
  box('panel',-6.1,1.85,2.6,7.6,3.7,.16,true);
  k.box('glass',-6.1,3.05,2.6,7.4,1.2,.1);
  k.portal('panel',-6.1,.02,2.6,1.4,2.4,.22,0,.18,.08);
  label('HEAD OF IT · LEVEL 19 WING C  →',4.6,2.9,2.45,4.4,.32,Math.PI);

  // Server aisle across the back, then the vault door.
  for(const x of [-7.4,-4.9,-2.4,2.4,4.9,7.4])rack(k,x,0,17.4);
  for(const x of [-7.4,-4.9,-2.4,2.4,4.9,7.4])solids.push({x,z:17.4,w:1.7,d:1.15,y0:0,y1:3});
  fixture(k,0,4.5,17.4,15,false,true);
  box('panel',0,1.9,20.4,20,3.8,.3,true);
  k.portal('metal',0,.02,20.4,2.2,2.9,.34,0,.2,.1);
  k.box('darkMetal',0,1.5,20.28,2.0,2.7,.12);
  k.torus('brass',0,1.55,20.16,.42,.055);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+.78;k.beam('brass',[Math.cos(a)*.1,1.55+Math.sin(a)*.1,20.12],[Math.cos(a)*.4,1.55+Math.sin(a)*.4,20.12],.022);}
  k.box('indicator',0,2.62,20.16,.1,.06,.03);
  label('INFORMATION TECHNOLOGY',0,4.3,23.92,6,.7);
  label('SERVER ROOM · AUTHORISED ENTRY',0,3.5,20.14,4.6,.4);
  interactions.push({position:[0,1.4,19.6],label:'Read the server room notice',action:'it-servers'});
}

// --- the Head of IT's office ----------------------------------------------
export function buildHeadOffice(k,{box,solids,interactions,label}){
  // The office proper sits behind a corridor rather than opening straight off
  // the floor, which is how the department is described. The gap is on the
  // entrance axis so the doorway is never blocked.
  for(const side of [-1,1])box('panel',side*5.6,1.85,3.4,8.8,3.7,.18,true);
  box('panel',0,3.35,3.4,2.4,.7,.18,false);
  k.portal('panel',0,.02,3.4,2.2,2.9,.26,0,.2,.09);
  label('HEAD OF INFORMATION TECHNOLOGY',0,3.05,3.25,6.4,.4);
  const dz=15;
  box('wood',0,.76,dz,3.6,.14,1.6);for(const x of [-1.5,1.5])box('wood',x,.38,dz,.5,.76,1.3);
  chair(k,0,dz+1.5,0);chair(k,-1.1,dz-1.6,Math.PI);chair(k,1.1,dz-1.6,Math.PI);
  k.box('darkMetal',-1.1,1.06,dz,.56,.46,.44);k.box('screen',-1.1,1.06,dz-.22,.46,.36,.012);
  k.box('paper',.9,.845,dz,.5,.03,.36);k.cylinder('white',1.5,.86,dz,.055,.09);
  for(let i=0;i<5;i++){shelf(k,-8.4+i*4.2,22.6,3.4,2.4);solids.push({x:-8.4+i*4.2,z:22.6,w:3.4,d:.5,y0:0,y1:2.4});
    for(let j=0;j<14;j++)k.box(j%3?'fabric':'red',-9.8+i*4.2+j*.21,1.02,22.6,.14,.34,.42);}
  table(k,-5.2,8.6,3.4,1.6);for(let i=0;i<3;i++){chair(k,-6.4+i*1.2,7.2,Math.PI);chair(k,-6.4+i*1.2,10,0);}
  label('FOR THE GOOD OF THE SILO',0,3.9,23.96,5,.7);
  interactions.push({position:[0,1.2,dz-1.1],label:'Look over the desk',action:'head-of-it'});
}

// --- the vault ------------------------------------------------------------
export function buildVault(k,{box,solids,interactions,label,animated}){
  // Panelled throughout: this room does not look like the rest of the silo,
  // and that is the point of it.
  for(const side of [-1,1])box('panel',side*9.6,2.4,12,.7,4.8,24,false);
  box('panel',0,2.4,23.7,20,4.8,.6,false);box('panel',0,2.4,.3,20,4.8,.6,false);
  box('panel',0,4.9,12,20,.5,24,false);
  box('panel',0,.02,12,19.4,.1,24,false);
  // Cove lighting behind a lip rather than fittings hung in the room. It is
  // deliberately gentle: the first pass had this at emissive-lamp brightness
  // and the whole vault blew out to a white sheet.
  for(const side of [-1,1]){k.box('panel',side*8.9,4.24,12,.36,.16,23,0,0,side*.5);k.box('cove',side*9.14,4.16,12,.06,.05,22.6);}
  k.box('cove',0,4.6,23.3,17,.05,.06);

  // The blast door you come in through, standing open against the wall.
  box('panelDark',-3.4,1.6,1.5,3.2,3.2,.5,true);
  k.cylinder('metal',-3.4,1.6,1.22,.62,.14,Math.PI/2);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;k.beam('brass',[-3.4+Math.cos(a)*.12,1.6+Math.sin(a)*.12,1.14],[-3.4+Math.cos(a)*.5,1.6+Math.sin(a)*.5,1.14],.03);}
  for(let i=0;i<6;i++)k.cylinder('brass',-1.9,.5+i*.5,1.5,.075,.32,0,0,Math.PI/2);
  label('VAULT · SILO 18',0,3.6,.2,5,.5);

  // Living quarters: bunks, a galley and enough stores to sit out a long stay.
  for(const row of [0,1])for(const bunk of [0,1]){
    const x=-6.9+row*3.0,z=5.4+bunk*3.4;
    bed(k,x,z);solids.push({x,z,w:1.1,d:2.1,y0:0,y1:.7});
    k.box('panel',x,1.44,z,1.24,.1,2.2);k.box('linen',x,1.62,z,1.1,.26,1.95);
    for(const y of [.02,1.5])for(const dx of [-.58,.58])k.beam('metal',[x+dx,y,z-1],[x+dx,y+1.5,z-1],.03);
    k.box('coldLamp',x+.58,1.3,z-.6,.05,.05,.36);
  }
  box('panel',-2.0,1.3,7,.14,2.6,7.6,true);
  for(let i=0;i<3;i++){shelf(k,3.6+i*2.6,3.1,2.4,2.2);solids.push({x:3.6+i*2.6,z:3.1,w:2.4,d:.5,y0:0,y1:2.2});
    for(let j=0;j<10;j++)for(const y of [.5,1.06,1.62])k.box(j%2?'enamel':'white',2.6+i*2.6+j*.22,y,3.1,.16,.3,.34);}
  k.bevel('metal',6.4,.46,7.4,3.6,.92,1.1);solids.push({x:6.4,z:7.4,w:3.6,d:1.1,y0:0,y1:.92});
  k.cylinder('metal',5.4,.98,7.4,.24,.12);k.box('darkMetal',7.4,1.06,7.4,.9,.28,.7);
  table(k,5.2,10.4,2.4,1.2);solids.push({x:5.2,z:10.4,w:2.4,d:1.2,y0:0,y1:.78});
  for(const dx of [-.7,.7]){chair(k,5.2+dx,9.4,Math.PI);chair(k,5.2+dx,11.4,0);}
  label('QUARTERS',-4.6,2.9,2.6,2.4,.34);

  // Servers and their power banks, up two steps to either side, so a cut to
  // the silo's own generator never reaches the machine.
  for(const side of [-1,1]){
    for(let step=0;step<2;step++){
      const y=step*.42,x=side*(6.0+step*1.5),w=1.5;
      k.bevel('panel',x,y+.21,16.4,w,.42+y,9.6);
      solids.push({x,z:16.4,w,d:9.6,y0:0,y1:y+.42});
    }
    for(let i=0;i<4;i++)rack(k,side*7.5,.84,13.0+i*2.1,1.5,2.5,1.0,'panelDark');
    for(let i=0;i<4;i++)solids.push({x:side*7.5,z:13.0+i*2.1,w:1.55,d:1.05,y0:.84,y1:3.34});
    for(let i=0;i<3;i++){k.box('panelDark',side*5.6,.84+.7,13.6+i*2.6,1.1,1.4,1.9);k.box('indicator',side*5.6,1.9,13.6+i*2.6,.5,.05,.02);}
    for(let i=0;i<3;i++)solids.push({x:side*5.6,z:13.6+i*2.6,w:1.15,d:1.95,y0:.42,y1:2.24});
  }
  label('POWER BANK · UNINTERRUPTED',-6.6,3.5,11.6,3.4,.3);

  // The Algorithm. A low dais, a ring console, and the interface standing in
  // the air above it. Legacy answers when it is asked and speaks when it is
  // not, which is the unnerving part.
  k.cylinder('panel',0,.11,20.2,2.9,.22);solids.push({x:0,z:20.2,w:5.8,d:5.8,y0:0,y1:.22});
  k.cylinder('panel',0,.34,20.2,2.35,.24);
  k.torus('metal',0,.46,20.2,2.35,.06,Math.PI/2);
  k.cylinder('panelDark',0,.72,20.2,1.15,.72);
  k.torus('brass',0,1.09,20.2,1.15,.045,Math.PI/2);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;k.box('screen',Math.cos(a)*1.12,.88,20.2+Math.sin(a)*1.12,.5,.34,.02,-a+Math.PI/2);}
  const halo=new THREE.Group();
  const core=new Kit(k.m);
  core.cylinder('holo',0,0,0,.40,2.0);
  core.cylinder('holoCore',0,0,0,.07,2.1);
  // Rings wider than the column, so it reads as something projected into the
  // air rather than a jar with shelves in it.
  for(let i=0;i<7;i++){const t=i/6;core.torus('holoCore',0,-.95+i*.32,0,.30+Math.sin(t*Math.PI)*.55,.008,Math.PI/2);}
  for(let i=0;i<3;i++)core.torus('holo',0,-.4+i*.4,0,.86,.02,Math.PI/2);
  halo.add(core.group());halo.position.set(0,2.2,20.2);halo.name='algorithm-interface';
  animated.push({object:halo,axis:'y',speed:.22});
  k.box('holoCore',0,1.13,20.2,.9,.02,.9);
  label('LEGACY',0,3.9,23.9,3.2,.6);
  interactions.push({position:[0,1.5,17.9],label:'Address the Algorithm',action:'algorithm'});

  // The concealed radio: a panel in the server steps that is not quite flush.
  k.box('panelDark',8.4,1.35,21.6,1.9,2.2,.7);
  k.box('metal',8.4,1.35,21.22,1.6,1.9,.06);
  for(let i=0;i<3;i++)k.cylinder('brass',7.85+i*.55,.85,21.16,.09,.05,Math.PI/2);
  k.box('indicator',8.4,2.05,21.16,.3,.04,.02);
  solids.push({x:8.4,z:21.6,w:1.9,d:.7,y0:0,y1:2.45});
  interactions.push({position:[7.1,1.4,21.3],label:'Open the concealed panel',action:'vault-radio'});
  return halo;
}
