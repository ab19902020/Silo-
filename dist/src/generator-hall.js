import * as THREE from '../vendor/three.module.js';
import { Kit, railing, pipe, addSign, fixture } from './kit.js';
import { TAU } from './data.js';
export function buildGeneratorHall(m){
  const root=new THREE.Group(),k=new Kit(m),walkways=[],solids=[],interactions=[],animated=[];root.position.y=52;
  k.arc('floor',0,25,.6,-.6);walkways.push({kind:'ring',r0:0,r1:25,y:52});
  k.arc('darkConcrete',24.6,25.4,27,0);solids.push({ring:true,r0:24.6,r1:25.4,y0:52,y1:80});
  k.cylinder('darkConcrete',0,27,0,25,.6);
  for(let i=0;i<24;i++){const a=i*TAU/24;k.box('concrete',Math.cos(a)*24.3,13.5,Math.sin(a)*24.3,.7,27,1,-a);for(const y of [3,13,23])fixture(k,Math.cos(a)*23.8,y,Math.sin(a)*23.8,1.9,true);}
  k.cylinder('darkMetal',0,.55,0,9.2,1.1);k.cylinder('metal',0,17,0,7.5,.8);k.cylinder('darkMetal',0,18,0,5.8,1.3);
  const rotor=new THREE.Group(),rk=new Kit(m);rotor.position.y=9;
  rk.cylinder('brass',0,0,0,1.2,16);for(let i=0;i<36;i++){const a=i*TAU/36;rk.bevel('metal',Math.cos(a)*3.8,0,Math.sin(a)*3.8,.25,13,4,-a+.45);}rotor.add(rk.group());root.add(rotor);animated.push({object:rotor,axis:'y',speed:.4});
  for(let i=0;i<6;i++){
    const a=i*TAU/6,panel=new THREE.Group(),pk=new Kit(m);panel.position.set(Math.sin(a)*7.35,8.9,Math.cos(a)*7.35);panel.rotation.y=a;
    pk.bevel('green',0,0,0,7.05,15.1,.65);for(const x of [-3.22,3.22])pk.box('metal',x,0,-.43,.24,15,.32);
    for(const y of [-7,-4,0,4,7]){pk.box('metal',0,y,-.39,6.7,.16,.2);for(const x of [-3.15,3.15])pk.cylinder('brass',x,y,-.54,.12,.1,Math.PI/2);}
    pk.box('darkMetal',0,-3,-.39,3,2.7,.09);for(let j=0;j<13;j++)pk.box('metal',0,-4.1+j*.18,-.48,2.8,.04,.08);
    panel.add(pk.group());root.add(panel);if(i===3){panel.position.x=-9.5;panel.position.z=-8.2;panel.rotation.y+=.26;}
    addSign(panel,`0${i+1}`,[0,5,-.49],1.3,1,Math.PI,{font:'bold 150px Arial'});
  }
  solids.push({x:0,z:0,w:15.3,d:15.3,y0:52,y1:70});
  // An accessible full annular maintenance deck with a half-turn stair.
  k.arc('darkMetal',10.2,14,.22,10);walkways.push({kind:'ring',r0:10.2,r1:14,y:62.22});
  for(let j=0;j<64;j++){const a=j*TAU/64,b=(j+1)*TAU/64;railing(k,[Math.cos(a)*10.3,Math.sin(a)*10.3],[Math.cos(b)*10.3,Math.sin(b)*10.3],10.22);if(j>4&&j<60)railing(k,[Math.cos(a)*13.8,Math.sin(a)*13.8],[Math.cos(b)*13.8,Math.sin(b)*13.8],10.22);}
  for(let j=0;j<60;j++){const a=Math.PI+j*Math.PI/60,y=(j+1)*10.22/60;k.arc('metal',15.3,18.7,.17,y-.17,a,Math.PI/60*1.005,3);walkways.push({kind:'arc',r0:15.3,r1:18.7,y:52+y,a:a+Math.PI/120,half:Math.PI/120*1.01});k.beam('yellow',[Math.cos(a)*18.65,y+1.05,Math.sin(a)*18.65],[Math.cos(a+Math.PI/60)*18.65,y+1.22,Math.sin(a+Math.PI/60)*18.65],.04);}
  k.box('metal',14.6,10.11,0,8.3,.22,3);walkways.push({x:14.6,z:0,w:8.3,d:3,y:62.22});railing(k,[10.5,-1.5],[18.7,-1.5],10.22);railing(k,[10.5,1.5],[18.7,1.5],10.22);
  for(const x of [-22,22])for(const y of [2,4,6,19,21])pipe(k,x,0,y,34,.32,'rust');
  // Overhead travelling crane, cable tackle and lifting hook.
  for(const x of [-21,21])k.box('darkMetal',x,24,0,.5,.7,42);
  for(const z of [-.9,.9])k.box('yellow',0,23.5,z,43,1.1,.55);k.bevel('green',-8,23,0,4,1.5,3);
  for(const x of [-8.7,-7.3]){k.cylinder('metal',x,17,0,.045,11);k.cylinder('darkMetal',x,11.7,0,.55,.22,Math.PI/2);}
  k.torus('rust',-8,10.8,0,.65,.16);k.box('metal',-8,11.6,0,2,.8,.4);
  for(const x of [-15,-10,10,15]){k.bevel('green',x,.65,-19,3,1.3,1.4);for(let i=0;i<4;i++){k.cylinder('white',x-1+i*.65,1.2,-18.26,.19,.045,Math.PI/2);k.beam('black',[x-1+i*.65,1.2,-18.23],[x-.91+i*.65,1.27,-18.23],.012);}solids.push({x,z:-19,w:3,d:1.4,y0:52,y1:53.5});}
  addSign(root,'MECHANICAL · GENERATOR HALL',[0,5,-24.28],9,1,0);addSign(root,'LEVEL 144 ↑',[-6,2,-23.7],4,.6,0);addSign(root,'MINES ↓',[6,2,-23.7],4,.6,0);
  interactions.push({position:[-6,53.5,-22.5],label:'Return to Level 144',destination:144},{position:[6,53.5,-22.5],label:'Descend to the mines',destination:'mines'},{position:[0,53.5,-10],label:'Inspect the generator',action:'generator'});
  root.add(k.group());return {root,walkways,solids,interactions,animated};
}
