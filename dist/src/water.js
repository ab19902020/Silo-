import * as THREE from '../vendor/three.module.js';
import { VOID } from './void-access.js';

const UP=new THREE.Vector3(0,1,0);
export function reflectedCamera(source,height,target=new THREE.PerspectiveCamera()){
  source.updateMatrixWorld(true);target.copy(source,false);
  const eye=source.getWorldPosition(new THREE.Vector3()),look=source.getWorldDirection(new THREE.Vector3()).add(eye);
  eye.y=2*height-eye.y;look.y=2*height-look.y;
  target.position.copy(eye);target.up.set(0,1,0).applyQuaternion(source.getWorldQuaternion(new THREE.Quaternion())).reflect(UP);target.lookAt(look);target.updateMatrixWorld(true);
  return target;
}

// One stationary water surface shares the basin and the passage. Ripples
// change its shading, never its vertices or collision height.
export class VoidWater{
  constructor(mesh){
    this.mesh=mesh;this.camera=new THREE.PerspectiveCamera();this.last=-Infinity;this.quality='balanced';
    this.target=new THREE.WebGLRenderTarget(512,256,{depthBuffer:true});
    this.uniforms={waterTime:{value:0},waterReflection:{value:this.target.texture},waterProjection:{value:new THREE.Matrix4()},waterReflectionReady:{value:0}};
    const material=mesh.material.clone();material.color.setHex(0x182d2b);material.roughness=.25;material.metalness=.08;material.opacity=.90;material.depthWrite=false;material.envMapIntensity=.65;
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader='uniform mat4 waterProjection; varying vec3 waterPoint; varying vec4 waterCoord;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        vec4 waterWorld=modelMatrix*vec4(transformed,1.);waterPoint=waterWorld.xyz;waterCoord=waterProjection*waterWorld;
      `);
      shader.fragmentShader='uniform float waterTime,waterReflectionReady; uniform sampler2D waterReflection; varying vec3 waterPoint; varying vec4 waterCoord;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 wave=vec2(sin(waterPoint.x*1.1+waterPoint.z*.45+waterTime*.48),cos(waterPoint.z*1.4-waterPoint.x*.31-waterTime*.37))*.019;
        wave+=vec2(sin(waterPoint.z*3.2+waterTime*.7),cos(waterPoint.x*2.8-waterTime*.6))*.006;
        normal=normalize(mat3(viewMatrix)*vec3(-wave.x,1.,-wave.y));
        #ifdef DOUBLE_SIDED
          normal*=faceDirection;
        #endif
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
        vec2 reflectionUV=waterCoord.xy/waterCoord.w+wave*.20;
        float onSheet=step(0.,reflectionUV.x)*step(reflectionUV.x,1.)*step(0.,reflectionUV.y)*step(reflectionUV.y,1.);
        vec3 reflection=texture2D(waterReflection,clamp(reflectionUV,vec2(.002),vec2(.998))).rgb;
        float fresnel=.055+.82*pow(1.-clamp(abs(dot(normal,normalize(vViewPosition))),0.,1.),3.);
        outgoingLight=mix(outgoingLight,reflection,waterReflectionReady*onSheet*fresnel);
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey=()=> 'silo-continuous-reflective-water-v1';this.material=mesh.material=material;
  }
  setQuality(quality){if(this.quality===quality)return;this.quality=quality;this.target.setSize(quality==='high'?768:512,quality==='high'?384:256);this.last=-Infinity;if(quality==='low')this.uniforms.waterReflectionReady.value=0;}
  update(renderer,scene,camera,time){
    this.uniforms.waterTime.value=time;
    if(this.quality==='low'||!this.mesh.parent?.visible||time-this.last<(this.quality==='high'?1/20:1/12))return;
    this.mesh.updateWorldMatrix(true,false);const height=new THREE.Vector3(0,VOID.waterY,0).applyMatrix4(this.mesh.matrixWorld).y;
    if(camera.getWorldPosition(new THREE.Vector3()).y<=height+.035){this.uniforms.waterReflectionReady.value=0;return;}
    this.last=time;const reflected=reflectedCamera(camera,height,this.camera);
    this.uniforms.waterProjection.value.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(reflected.projectionMatrix).multiply(reflected.matrixWorldInverse);
    // Oblique near plane clips geometry below the real water level out of the
    // reflection. The basin bed cannot be reflected through the sheet.
    const plane=new THREE.Plane(UP.clone(),-height).applyMatrix4(reflected.matrixWorldInverse),clip=new THREE.Vector4(...plane.normal.toArray(),plane.constant),p=reflected.projectionMatrix.elements;
    const q=new THREE.Vector4((Math.sign(clip.x)+p[8])/p[0],(Math.sign(clip.y)+p[9])/p[5],-1,(1+p[10])/p[14]),dot=clip.dot(q);
    if(Math.abs(dot)<1e-5)return;
    clip.multiplyScalar(2/dot);p[2]=clip.x;p[6]=clip.y;p[10]=clip.z+1-.002;p[14]=clip.w;reflected.projectionMatrixInverse.copy(reflected.projectionMatrix).invert();
    const previous=renderer.getRenderTarget(),visible=this.mesh.visible,shadows=renderer.shadowMap.autoUpdate;
    try{this.mesh.visible=false;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(this.target);renderer.render(scene,reflected);this.uniforms.waterReflectionReady.value=1;}
    finally{this.mesh.visible=visible;renderer.shadowMap.autoUpdate=shadows;renderer.setRenderTarget(previous);}
  }
}
