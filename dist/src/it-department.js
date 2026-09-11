import * as THREE from '../vendor/three.module.js';
import { Kit, fixture, desk, chair, table, shelf, bed } from './kit.js';

// Level 19 is reconstructed within the existing six-wing game layout.
// Legacy is the archive; the Algorithm is its interface. Visual reference:
// https://territorystudio.com/project/silo/ . Dimensions and routes are adapted.
import { deskDressing } from './environment-details.js';
import { createAlgorithmInterface } from './algorithm-interface.js';

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
    deskDressing(k,x,z,row);deskDressing(k,x,z+2.1,row+3);
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
  for(const x of [-8.35,-3.85])box('panel',x,1.85,2.6,3.1,3.7,.16,true);
  k.box('glass',-6.1,3.05,2.6,7.4,1.2,.1);
  k.portal('panel',-6.1,.02,2.6,1.4,2.4,.22,0,.18,.08);
  label('HEAD OF IT · WING C  →',8.79,2.9,3.8,2.8,.32,-Math.PI/2);

  k.box('paper',-4.1,.889,4.55,.42,.018,.28);
  for(let j=0;j<9;j++)k.box('darkMetal',-4.25+(j%3)*.10,.9,4.46+Math.floor(j/3)*.06,.025,.002,.003);
  interactions.push({position:[-4.1,1.05,4.55],label:'Examine the sky observation sheet',action:'lore:stars'});
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
  interactions.push({position:[0,1.4,19.6],label:'Enter the IT vault',destination:'room:19:1'});
}

// --- the Head of IT's office ----------------------------------------------
export function buildHeadOffice(k,{box,solids,interactions,label}){
  // The office proper sits behind a corridor rather than opening straight off
  // the floor, which is how the department is described. The gap is on the
  // entrance axis so the doorway is never blocked.
  for(const side of [-1,1])box('panel',side*5.6,1.85,3.4,8.8,3.7,.18,true);
  box('panel',0,3.35,3.4,2.4,.7,.18,false);
  k.portal('panel',0,.02,3.4,2.2,2.9,.26,0,.2,.09);
  label('HEAD OF INFORMATION TECHNOLOGY',0,3.38,3.25,6.4,.32);
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
  box('panel',0,2.4,23.7,20,4.8,.6,false);
  for(const side of [-1,1])box('panel',side*5.85,2.4,.3,8.3,4.8,.6,false);
  box('panel',0,4.05,.3,3.4,1.5,.6,false);
  box('panel',0,4.9,12,20,.5,24,false);
  box('panel',0,-.038,12,19.4,.1,24,false);
  // Cove lighting behind a lip rather than fittings hung in the room. It is
  // deliberately gentle: the first pass had this at emissive-lamp brightness
  // and the whole vault blew out to a white sheet.
  for(const side of [-1,1]){k.box('panel',side*8.9,4.24,12,.36,.16,23,0,0,side*.5);k.box('cove',side*9.14,4.16,12,.06,.05,22.6);}
  k.box('cove',0,4.6,23.3,17,.05,.06);

  // The blast door you come in through, standing open against the wall.
  k.cylinder('metal',-3.4,1.65,1.5,1.62,.5,Math.PI/2);
  k.torus('panelDark',-3.4,1.65,1.22,1.43,.08);
  solids.push({x:-3.4,z:1.5,w:3.24,d:.5,y0:0,y1:3.27});
  k.cylinder('metal',-3.4,1.6,1.22,.62,.14,Math.PI/2);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;k.beam('brass',[-3.4+Math.cos(a)*.12,1.6+Math.sin(a)*.12,1.14],[-3.4+Math.cos(a)*.5,1.6+Math.sin(a)*.5,1.14],.03);}
  for(let i=0;i<6;i++)k.cylinder('brass',-1.9,.5+i*.5,1.5,.075,.32,0,0,Math.PI/2);
  label('VAULT · SILO 18',0,3.6,-.04,3.1,.36);
  for(const side of [-1,1])k.box('metal',side*1.7,1.65,.0,.16,3.3,.22);
  k.box('metal',0,3.28,0,3.5,.12,.22);

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
    for(let j=0;j<10;j++)for(const y of [.33,.98,1.63])k.box(j%2?'enamel':'white',2.6+i*2.6+j*.22,y,3.1,.16,.3,.34);}
  k.bevel('metal',6.4,.46,7.4,3.6,.92,1.1);solids.push({x:6.4,z:7.4,w:3.6,d:1.1,y0:0,y1:.92});
  k.cylinder('metal',5.4,.98,7.4,.24,.12);k.box('darkMetal',7.4,1.06,7.4,.9,.28,.7);
  table(k,5.2,10.4,2.4,1.2);solids.push({x:5.2,z:10.4,w:2.4,d:1.2,y0:0,y1:.78});
  for(const dx of [-.7,.7]){chair(k,5.2+dx,9.4,Math.PI);chair(k,5.2+dx,11.4,0);}
  label('QUARTERS',-4.6,2.9,.64,2.4,.34,0);

  // Servers and their power banks, up two steps to either side, so a cut to
  // the silo's own generator never reaches the machine.
  for(const side of [-1,1]){
    for(const [x,w,h] of [[4.25,.6,.24],[4.85,.6,.48],[7.35,4.4,.72]]){
      k.box('panel',side*x,h/2,16.4,w,h,9.6);solids.push({x:side*x,z:16.4,w,d:9.6,y0:0,y1:h});
    }
    for(let i=0;i<4;i++){
      rack(k,side*7.5,.72,13.0+i*2.1,1.5,2.5,1.0,'panelDark');
      solids.push({x:side*7.5,z:13.0+i*2.1,w:1.55,d:1.05,y0:.72,y1:3.22});
    }
    for(let i=0;i<3;i++){
      k.box('panelDark',side*5.6,1.42,13.6+i*2.6,1.1,1.4,1.9);k.box('indicator',side*5.6,1.9,12.64+i*2.6,.5,.05,.02);
      solids.push({x:side*5.6,z:13.6+i*2.6,w:1.15,d:1.95,y0:.72,y1:2.12});
    }
  }
  label('POWER BANK · UNINTERRUPTED',-9.22,3.5,16.4,3.4,.3,Math.PI/2);

  // A tactile dark table, pale concentric ribs and a quiet sand interface.
  k.cylinder('panelDark',0,.5,20.2,1.65,1.0);
  k.cylinder('black',0,1.025,20.2,1.85,.05);
  k.torus('metal',0,1.05,20.2,1.84,.035,Math.PI/2);
  solids.push({x:0,z:20.2,w:3.7,d:3.7,y0:0,y1:1.08});
  const curved=new Kit(k.m);curved.arc('panelDark',3.14,3.3,4.3,0,0,Math.PI,48);
  for(let j=0;j<6;j++){
    curved.arc('panel',3.0,3.15,.36,1.3+j*.46,0,Math.PI,48);
  }
  curved.arc('panel',2.35,3.3,.15,.96,0,Math.PI,48);
  curved.arc('cove',2.34,2.37,.11,.98,0,Math.PI,48);
  for(const part of curved.parts)k.parts.push({...part,matrix:new THREE.Matrix4().makeTranslation(0,0,20.2).multiply(part.matrix)});
  for(let j=0;j<24;j++){const a=(j+.5)*Math.PI/24;solids.push({x:Math.cos(a)*2.83,z:20.2+Math.sin(a)*2.83,w:.47,d:.96,y0:0,y1:1.11,ry:-a-Math.PI/2});solids.push({x:Math.cos(a)*3.22,z:20.2+Math.sin(a)*3.22,w:.45,d:.18,y0:0,y1:4.3,ry:-a-Math.PI/2});}
  k.cylinder('metal',0,4.59,20.2,.16,.18);
  k.cylinder('panelDark',0,4.42,20.2,2.25,.2);
  k.torus('cove',0,4.29,20.2,2.1,.025,Math.PI/2);
  const halo=createAlgorithmInterface();
  animated.push({object:halo,update:halo.userData.update});
  label('LEGACY',0,4.48,23.36,2.0,.20);
  interactions.push({position:[0,1.5,18.0],label:'Address the Algorithm',action:'algorithm'});

  // The concealed radio: a panel in the server steps that is not quite flush.
  k.box('panelDark',8.4,1.35,21.6,1.9,2.2,.7);
  k.box('metal',8.4,1.35,21.22,1.6,1.9,.06);
  for(let i=0;i<3;i++)k.cylinder('brass',7.85+i*.55,.85,21.16,.09,.05,Math.PI/2);
  k.box('indicator',8.4,2.05,21.16,.3,.04,.02);
  solids.push({x:8.4,z:21.6,w:1.9,d:.7,y0:0,y1:2.45});
  interactions.push({position:[7.1,1.4,21.3],label:'Open the concealed panel',action:'vault-radio'});
  return halo;
}
