import * as THREE from '../vendor/three.module.js';
import {RESIDENT_HEAD} from './resident-head-data.js';
let faceTexture;
function faces(){
 if(faceTexture)return faceTexture;
 const pixels=new Uint8Array(4*2*4);RESIDENT_HEAD.means.forEach((c,i)=>pixels.set([...c.map(v=>Math.round(v*255)),255],i*4));
 faceTexture=new THREE.DataTexture(pixels,4,2);faceTexture.needsUpdate=true;
 if(typeof document!=='undefined'&&document.createElementNS){new THREE.TextureLoader().load(new URL('../assets/characters/resident-faces.jpg',import.meta.url).href,texture=>{
  texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.anisotropy=4;
  const old=faceTexture;faceTexture=texture;for(const shader of shaders)shader.uniforms.residentFaces.value=texture;old.dispose();
 });}return faceTexture;
}
const shaders=new Set();


// The skin, cloth, hair and boots share one skinned draw call. Their surface
// response is stored per vertex; pores and weave stay in bind-pose space so
// neither swims over the body while it walks.
export function residentMaterial(){
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.80,metalness:0,envMapIntensity:.9,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.residentFaces={value:faces()};shaders.add(shader);
    shader.vertexShader='attribute vec3 skinUV; varying vec3 faceUV; attribute vec4 residentSurface; varying vec4 residentFinish; varying vec3 residentPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      faceUV=skinUV;residentFinish=residentSurface;residentPoint=position;
    `);
    shader.fragmentShader='uniform sampler2D residentFaces; varying vec3 faceUV; varying vec4 residentFinish; varying vec3 residentPoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float dye=.98+.014*sin(residentPoint.y*47.+sin(residentPoint.x*29.)*2.)+.008*sin(residentPoint.z*143.+residentPoint.y*91.);
      diffuseColor.rgb*=mix(1.,dye,residentFinish.w);
      diffuseColor.rgb*=mix(vec3(1.),texture2D(residentFaces,faceUV.xy).rgb,faceUV.z);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      vec3 weavePoint=residentPoint*420.;float weaveFade=1.-smoothstep(.45,2.8,length(fwidth(weavePoint)));
      float weave=sin(weavePoint.x+weavePoint.z)*sin(weavePoint.y);
      roughnessFactor=clamp(residentFinish.x+weave*.065*residentFinish.w*weaveFade,.18,.98);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
      metalnessFactor=residentFinish.y;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      // Derivative bump only survives while the pattern is resolved on screen.
      float grain=weave*residentFinish.w*.00022*weaveFade;
      grain+=dot(texture2D(residentFaces,faceUV.xy).rgb,vec3(.21,.72,.07))*.00032*faceUV.z;
      vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
      vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);float det=dot(dpdx,r1);
      vec3 gradient=sign(det)*(dFdx(grain)*r1+dFdy(grain)*r2);
      normal=normalize(abs(det)*normal-gradient+normal*1e-9);
    `);
  };
  material.customProgramCacheKey=()=> 'silo-resident-fabric-face-v2';return material;
}
