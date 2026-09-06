import * as THREE from '../vendor/three.module.js';
import { Kit, random } from './kit.js';

// Original, rendered landscape for the cafeteria's surveillance display.
// Its live render texture lights the fiction without embedding show footage.
export function makeOutsideScreen(renderer,m){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xa7b3ac);scene.fog=new THREE.FogExp2(0xa7b3ac,.016);
  scene.add(new THREE.HemisphereLight(0xdbe1db,0x64604e,2.5));const sun=new THREE.DirectionalLight(0xf2eee0,2.3);sun.position.set(-25,55,15);scene.add(sun);
  const terrain=new THREE.PlaneGeometry(300,220,100,80);terrain.rotateX(-Math.PI/2);const pos=terrain.getAttribute('position');
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,Math.sin(x*.037+z*.026)*2.3+Math.sin(x*.11-z*.02)*.7+Math.max(0,-z-25)*.036);}terrain.computeVertexNormals();
  const ground=new THREE.Mesh(terrain,new THREE.MeshStandardMaterial({color:0x777a63,roughness:1}));scene.add(ground);
  const k=new Kit(m),rng=random(18);
  // A dead tree on the rise and a hazy, ruined skyline.
  const t=[-12,0,-21];k.beam('darkConcrete',t,[-11,11,-21],.48);k.beam('darkConcrete',[-11,6,-21],[-17,9,-23],.24);k.beam('darkConcrete',[-14,7.5,-22],[-18,12,-23],.12);k.beam('darkConcrete',[-11,8,-21],[-6,12,-21],.2);k.beam('darkConcrete',[-6,12,-21],[-3,13,-24],.1);k.beam('darkConcrete',[-11,9,-21],[-12,14,-20],.16);
  for(let i=0;i<60;i++){const x=(rng()-.5)*180,z=-75-rng()*50,h=3+rng()*20;k.box('darkConcrete',x,h/2,z,2+rng()*5,h,2+rng()*5);}
  for(let i=0;i<140;i++)k.sphere('rock',(rng()-.5)*170,.5+rng(),(rng()-.5)*120,.5+rng()*2,.5+rng(),.5+rng()*2);
  scene.add(k.group());const camera=new THREE.PerspectiveCamera(65,3.6,.1,250);camera.position.set(0,3,29);camera.lookAt(0,5,-30);
  const target=new THREE.WebGLRenderTarget(1024,284,{depthBuffer:true});target.texture.colorSpace=THREE.SRGBColorSpace;
  const previous=renderer.getRenderTarget();renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(previous);
  return target;
}
