import * as THREE from '../vendor/three.module.js';

// The skin, cloth, hair and boots share one skinned draw call. Their surface
// response is stored per vertex; pores and weave stay in bind-pose space so
// neither swims over the body while it walks.
export function residentMaterial(){
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.80,metalness:0,envMapIntensity:.9,side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.vertexShader='attribute vec4 residentSurface; varying vec4 residentFinish; varying vec3 residentPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      residentFinish=residentSurface;residentPoint=position;
    `);
    shader.fragmentShader='varying vec4 residentFinish; varying vec3 residentPoint;\n'+shader.fragmentShader;
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
      vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
      vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);float det=dot(dpdx,r1);
      vec3 gradient=sign(det)*(dFdx(grain)*r1+dFdy(grain)*r2);
      normal=normalize(abs(det)*normal-gradient+normal*1e-9);
    `);
  };
  material.customProgramCacheKey=()=> 'silo-resident-fabric-skin-v1';return material;
}
