import * as THREE from '../vendor/three.module.js';
import { Kit, addSign } from './kit.js';

// Analogue equipment, hanging lamps and repairs visible in the workshop
// production references; each is a modeled part rather than a wall image.
export function dressWorkshop(k,root){
  for(const side of [-1,1])for(const z of [6,13,20]){
    const x=side*6.5;
    k.bevel('darkMetal',x,1.34,z,.89,.83,.73);
    k.bevel('green',x,1.37,z-.39,.81,.69,.09);
    k.portal('black',x,1.13,z-.455,.53,.41,.04,0,.075,.04);
    k.bevel('screen',x,1.34,z-.443,.48,.35,.025);
    for(const y of [1.16,1.29,1.42])k.cylinder('brass',x+.32,y,z-.46,.038,.07,Math.PI/2);
    for(let j=0;j<8;j++)k.box('black',x-.26+j*.074,1.81,z,.026,.02,.38);
    // A separate oscilloscope/test set with knobs and patch sockets.
    k.bevel('pale',x+1.07,1.08,z-.02,.77,.43,.52);
    k.bevel('black',x+.95,1.1,z-.3,.35,.25,.028);
    for(let j=0;j<6;j++)k.box('indicator',x+.81+j*.05,1.09+Math.sin(j*1.6)*.06,z-.321,.036,.022,.004);
    for(const dx of [1.28,1.39])for(const y of [1.01,1.17])k.cylinder('metal',x+dx,y,z-.32,.026,.04,Math.PI/2);
    // Articulated desk light, joints and conical shade.
    k.cylinder('darkMetal',x-1.22,.86,z+.36,.17,.06);
    k.beam('metal',[x-1.22,.9,z+.36],[x-1.08,1.63,z+.35],.022);
    k.beam('metal',[x-1.08,1.63,z+.35],[x-.52,1.99,z+.2],.022);
    for(const p of [[x-1.08,1.63,z+.35],[x-.52,1.99,z+.2]])k.sphere('brass',...p,.05);
    k.sphere('green',x-.5,1.94,z+.14,.2,.12,.22);k.sphere('lamp',x-.5,1.87,z+.14,.15,.035,.17);
    // Wound copper, connection leads, soldering iron and repair trays.
    for(let j=0;j<8;j++)k.torus('brass',x-.5,.91,z+.4+j*.013,.13,.012,Math.PI/2);
    k.beam('darkMetal',[x+.42,.91,z-.15],[x+.67,.93,z+.28],.045);
    k.beam('metal',[x+.67,.93,z+.28],[x+.82,.93,z+.53],.014);
    const points=[new THREE.Vector3(x+.3,1.09,z-.29),new THREE.Vector3(x+.5,.88,z-.6),new THREE.Vector3(x-.4,.79,z-.72),new THREE.Vector3(x-.8,.87,z-.1)];
    const g=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,.013,5,false),wire=new THREE.Mesh(g,k.m.black);wire.userData.ownedGeometry=true;root.add(wire);
    k.bevel('metal',x-1.2,.88,z-.2,.54,.035,.52);
    for(let j=0;j<7;j++)k.cylinder('brass',x-1.4+j*.059,.92,z-.15,.021,.08);
    addSign(root,'REPAIR / RETURN',[x,2.45,z+.65],1.9,.24,Math.PI,{background:'#473d2e',color:'#c9c1a2'});
    // Tool board fixed to the outer end of the bench, away from walking lanes.
    k.box('wood',side*9.3,1.95,z,.08,1.6,2.7);
    for(let j=0;j<8;j++){
      const zz=z-1.05+j*.3;k.cylinder('darkMetal',side*9.2,1.83,zz,.028,.55);
      if(j%2)k.beam('metal',[side*9.12,2.13,zz-.075],[side*9.12,2.13,zz+.075],.052);
      else k.torus('metal',side*9.15,2.13,zz,.065,.016,0,Math.PI/2);
    }
  }
  for(const x of [-7.8,7.8]){
    k.box('metal',x,4.38,12,.45,.18,22);
    for(let z=1.5;z<23;z+=.45)k.box('darkMetal',x,4.51,z,.58,.035,.035);
    for(const dx of [-.13,0,.13])k.cylinder('black',x+dx,4.53,12,.034,22,Math.PI/2);
  }
}
