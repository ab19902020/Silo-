import * as THREE from '../vendor/three.module.js';
import {Kit,addSign,fixture,railing} from './kit.js';
import {VoidWater} from './water.js';

export function buildSilo17(m){
  const root=new THREE.Group(),k=new Kit(m),solids=[],walkways=[],interactions=[];
  root.name='silo17-flooded-interior';
  // Three surviving landings overlook the drowned shaft. The deeper interior
  // is sealed below water; all accessible geometry is supported and enclosed.
  for(const y of [0,6,12]){
    const inner=y?8:0;k.arc('darkConcrete',inner,18,.4,y-.4,0,Math.PI*2,64);
    walkways.push({kind:'ring',r0:inner,r1:18,y});
    if(y)for(let j=0;j<40;j++){const a=j*Math.PI/20,b=(j+1)*Math.PI/20;railing(k,[Math.cos(a)*8.2,Math.sin(a)*8.2],[Math.cos(b)*8.2,Math.sin(b)*8.2],y);}
    if(y)solids.push({ring:true,r0:8,r1:8.35,y0:y,y1:y+1.1});
    for(let j=0;j<12;j++){const a=j*Math.PI/6; k.box('rust',Math.cos(a)*17.6,y+2.8,Math.sin(a)*17.6,.3,5.6,.3);}
  }
  // Compact stair towers sit outside the ring so upper slabs cannot block a
  // descending player's head. Their open landings touch both galleries.
  for(const [x,high] of [[20,12],[-20,6]]){
    for(let i=0;i<40;i++){
      const z=-12+(i+.5)*.6,y=high-(i+1)*.15;
      k.box('darkMetal',x,y-.11,z,4,.22,.61);walkways.push({kind:'box',x,z,w:4,d:.61,y});
      for(const edge of [-2,2]){k.box('rust',x+edge,y+.55,z,.12,1.1,.61);solids.push({x:x+edge,z,w:.12,d:.61,y0:y,y1:y+1.1});}
    }
    for(const [z,y] of [[-13,high],[13,high-6]]){const cx=Math.sign(x)*16;k.box('darkMetal',cx,y-.2,z,12,.4,2);walkways.push({kind:'box',x:cx,z,w:12,d:2,y});
      for(const edge of [-1,1]){const width=4,railX=Math.sign(x)*16;k.box('rust',railX,y+.55,z+edge,width,1.1,.12);solids.push({x:railX,z:z+edge,w:width,d:.12,y0:y,y1:y+1.1});}}
  }
  // Outer wall is square around the stair towers; the circular shaft remains
  // visible inside it. Colliders match the room envelope exactly.
  for(const x of [-24,24]){k.box('darkConcrete',x,7,0,.5,19,40);solids.push({x,z:0,w:.5,d:40,y0:-1,y1:17});}
  for(const z of [-20,20]){k.box('darkConcrete',0,7,z,48,19,.5);solids.push({x:0,z,w:48,d:.5,y0:-1,y1:17});}
  k.box('darkConcrete',0,17,0,48,.5,40);
  for(const y of [1.1,3.8,7.6])for(const z of [-19.72,19.72])k.box('green',0,y,z,47,.13,.03);
  // A submerged floor supports wading in the lowest section.
  const geo=new THREE.CircleGeometry(17.95,64);geo.rotateX(-Math.PI/2);geo.translate(0,.65,0);
  const water=new THREE.Mesh(geo,m.water);water.name='silo17-reactive-water';root.add(water);
  const waterSurface=new VoidWater(water,{height:.65});
  for(const [x,y,z] of [[-12,14,0],[12,8,3],[-11,2,6]]){
    fixture(k,x,y,z,1.2);const light=new THREE.PointLight(y>10?0x88b8b7:0x83a697,80,23,1.8);light.position.set(x,y-.1,z);root.add(light);
  }
  // Faded queue barriers, abandoned crates and high-water bands carry the story.
  for(const x of [-4,0,4]){k.bevel('wood',x,.3,5,1.8,.6,1.2);solids.push({x,z:5,w:1.8,d:1.2,y0:0,y1:.6});}
  k.bevel('darkMetal',-12,12.8,0,2.5,1.6,1);k.box('screen',-12,13, -.52,.7,.4,.02);
  addSign(root,'17\nEMERGENCY LIGHTING',[0,14.2,-17.5],4,1.4,Math.PI,{background:'#1a302f',color:'#92b7ad'});
  addSign(root,'PUMP CONTROL',[ -12,13.8,-.53],2,.4,Math.PI);
  interactions.push({position:[0,13.2,-16],label:'Climb back to the breached crown',destination:'silo17-surface'},
    {position:[-12,13,-1.2],label:'Read the last pump log',action:'silo17-log'},
    {position:[0,1,5],label:'Inspect the water-stained supply crate',action:'silo17-crate'});
  root.add(k.group());
  return {root,solids,walkways,interactions,water,waterSurface,spawn:new THREE.Vector3(0,12,-15.8)};
}
