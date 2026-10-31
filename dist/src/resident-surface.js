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
    shader.uniforms.residentFaces={value:faces()};shader.uniforms.residentFaceMeans={value:RESIDENT_HEAD.means.map(c=>new THREE.Vector3(...c))};shaders.add(shader);
    shader.vertexShader='attribute vec3 skinUV; varying vec3 faceUV; attribute vec4 residentSurface; varying vec4 residentFinish; varying vec3 residentPoint;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      faceUV=skinUV;residentFinish=residentSurface;residentPoint=position;
    `);
    shader.fragmentShader='uniform sampler2D residentFaces; uniform vec3 residentFaceMeans[8]; varying vec3 faceUV; varying vec4 residentFinish; varying vec3 residentPoint;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      float dye=.98+.014*sin(residentPoint.y*47.+sin(residentPoint.x*29.)*2.)+.008*sin(residentPoint.z*143.+residentPoint.y*91.);
      diffuseColor.rgb*=mix(1.,dye,residentFinish.w);
      // Normalize in the fragment, before blending. Interpolating the inverse
      // tint at vertices made pale zigzags where scalp texture faded away.
      int faceTile=int(clamp(floor(faceUV.x*4.)+floor(faceUV.y*2.)*4.,0.,7.));
      vec3 faceDetail=texture2D(residentFaces,faceUV.xy).rgb/max(residentFaceMeans[faceTile],vec3(.01));
      diffuseColor.rgb*=mix(vec3(1.),faceDetail,faceUV.z);
      // Hair: strands that radiate from the crown and hang straight down the
      // sides and back, in clumps, finer than the mesh can carry. The angle is
      // taken round a vertical axis through the crown, so on top they fan out
      // and below they fall. Every multiplier of the angle is a whole number,
      // which keeps the pattern continuous across the seam at the back.
      float hairMask=step(1.5,residentFinish.z);
      vec2 crownAxis=residentPoint.xz-vec2(0.,-.02);
      float hairAngle=atan(crownAxis.x,crownAxis.y);
      float strandCoord=hairAngle*190.+sin(residentPoint.y*27.+hairAngle*7.)*2.5;
      float strandFade=1.-smoothstep(.3,1.4,length(vec2(dFdx(strandCoord),dFdy(strandCoord))));
      float strand=(sin(strandCoord)*.6+sin(strandCoord*3.+1.3)*.4)*strandFade;
      float clump=sin(hairAngle*23.+sin(residentPoint.y*31.)*1.5);
      diffuseColor.rgb*=mix(1.,.90+.08*clump+.10*strand,hairMask);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      // A twill, not a lattice. At 420 the diamonds were a centimetre and a half
      // across and every shirt in the silo read as a quilted jacket; a real
      // weave is too fine to see, so this only survives at arm's length, runs
      // diagonally the way twill does, and is gone by the time the cloth is
      // across a room.
      vec3 weavePoint=residentPoint*1350.;float weaveFade=1.-smoothstep(.35,1.6,length(fwidth(weavePoint)));
      float weave=sin(weavePoint.x+weavePoint.y*.85+weavePoint.z)*(.75+.25*sin(weavePoint.y*.31));
      roughnessFactor=clamp(residentFinish.x+weave*.045*residentFinish.w*weaveFade+strand*.10*hairMask,.18,.98);
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
      metalnessFactor=residentFinish.y;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      // Derivative bump only survives while the pattern is resolved on screen.
      float grain=weave*residentFinish.w*.00006*weaveFade+strand*.00009*hairMask;
      grain+=dot(texture2D(residentFaces,faceUV.xy).rgb,vec3(.21,.72,.07))*.00032*faceUV.z;
      vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
      vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);float det=dot(dpdx,r1);
      vec3 gradient=sign(det)*(dFdx(grain)*r1+dFdy(grain)*r2);
      normal=normalize(abs(det)*normal-gradient+normal*1e-9);
    `);
  };
  material.customProgramCacheKey=()=> 'silo-resident-fabric-face-hair-v5';return material;
}
