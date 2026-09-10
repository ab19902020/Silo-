import * as THREE from '../vendor/three.module.js';
import {Kit,addSign,fixture,table} from './kit.js';
import {roomPoint} from './characters.js';

export const GEORGE_TERMINAL_POINT=roomPoint(68,0,5.7,3.1).add(new THREE.Vector3(0,1.4,0));
export function addGeorgeDesk(room,m){
  const k=new Kit(m); // Reuse the existing table in the apartment labelled Wilkins.
  k.bevel('darkMetal',5.7,1.23,3.4,.75,.62,.54);k.box('screen',5.7,1.25,3.11,.59,.4,.015);
  k.bevel('metal',5.7,.9,2.86,.68,.06,.27);k.box('black',6.24,.94,3.02,.13,.05,.22);
  k.beam('black',[6.12,.96,3.2],[6.37,.87,2.86],.015);
  k.box('paper',5,.9,3,.24,.015,.3);room.add(k.group());
  addSign(room,'EXTERNAL STORAGE\nMISSING',[5.7,1.25,3.095],.55,.36,Math.PI,{background:'#071712',color:'#a4c5aa',font:'bold 44px monospace',border:false});
  room.userData.interactions.push({position:[5.7,1.4,3.1],label:'Use George’s computer',action:'george-terminal'},
    {position:[4.9,1,2.6],label:'Read the paper beside the empty cable',action:'terminal-note'});
}

// This route is a declared reconstruction reached from the mine workings.
// All coordinates are local to its independent underground scene.
export function buildPressureGallery(m){
  const root=new THREE.Group(),k=new Kit(m),walkways=[],solids=[],interactions=[];
  root.name='pressure-gallery';
  const floor=(x,z,w,d)=>{k.box('darkConcrete',x,47.8,z,w,.4,d);walkways.push({kind:'box',x,z,w,d,y:48});};
  floor(0,-12,4.8,28);floor(0,7,13,12);
  for(const x of [-2.5,2.5]){k.box('rock',x,50,-12,.3,4.6,28);solids.push({x,z:-12,w:.3,d:28,y0:48,y1:53});}
  for(const x of [-6.6,6.6]){k.box('rock',x,50,7,.3,4.6,12);solids.push({x,z:7,w:.3,d:12,y0:48,y1:53});}
  for(const [x,z,w] of [[0,13,13],[0,-26,5],[-4.5,1,4],[4.5,1,4]]){k.box('rock',x,50,z,w,4.6,.3);solids.push({x,z,w,d:.3,y0:48,y1:53});}
  k.box('rock',0,52.5,-12,5,.4,28);k.box('darkConcrete',0,52.5,7,13,.4,12);
  for(let z=-23;z<12;z+=5){fixture(k,0,51.8,z,1);k.cylinder('rust',1.95,50.5,z,.13,5.1,Math.PI/2);k.box('red',1.78,50.5,z,.03,.3,.5);}
  k.cylinder('rust',0,49.4,10,.19,10,0,0,Math.PI/2);
  for(const x of [-4,-1.5,1.5,4]){k.torus('metal',x,49.4,10,.24,.045,0,Math.PI/2);}
  k.cylinder('metal',-4,49.8,10,.06,.6);k.torus('red',-4,50.1,10,.26,.05,Math.PI/2);
  k.box('white',3,49.8,9.76,.5,.65,.12);
  const cover=new THREE.Group(),ck=new Kit(m);ck.bevel('darkMetal',0,49.4,9.65,3.4,1.2,.1);cover.add(ck.group());root.add(cover);
  const collar=new THREE.Group(),cl=new Kit(m);cl.torus('brass',0,49.4,10,.28,.085,0,Math.PI/2);cl.box('metal',0,49.75,10,.22,.16,.65);collar.add(cl.group());collar.visible=false;root.add(collar);
  addSign(root,'18 / SERVICE\nISOLATE BEFORE OPENING',[0,51.1,12.78],4,.8,Math.PI,{background:'#442e24',color:'#d7c7a0'});
  root.add(k.group());
  for(const z of [-22,-9,6]){const light=new THREE.PointLight(z===6?0xe49b56:0xb2c7c7,65,22,1.8);light.position.set(0,51.7,z);root.add(light);}
  interactions.push({position:[0,49,-24],label:'Return to the ore workings',destination:'mine-deep-face'},
    {position:[0,49.5,9],label:'Remove the inspection cover',action:'pipe-cover'},
    {position:[-4,50,9],label:'Turn the isolation wheel',action:'pipe-isolate'},
    {position:[0,49.5,9],label:'Seat the sealing collar',action:'pipe-collar'},
    {position:[1.4,49.5,9],label:'Torque the collar',action:'pipe-torque'});
  return {root,solids,walkways,interactions,cover,collar,update(story){cover.visible=!story.hasFlag('pipe-cover-open');collar.visible=story.pipeSteps.includes('collar');}};
}
