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
  constructor(mesh,{height=VOID.waterY}={}){
    this.height=height;
    this.mesh=mesh;this.camera=new THREE.PerspectiveCamera();this.last=-Infinity;this.quality='balanced';
    this.target=new THREE.WebGLRenderTarget(512,256,{depthBuffer:true});
    // Six ripple rings, oldest overwritten. Each is [world x, world z, the time
    // it started, how hard]. Six is enough for a walking pace: a ring is spent
    // in about two and a half seconds and a step lands every half second.
    this.rippleSlots=6;this.nextRipple=0;
    this.ripples=new Float32Array(this.rippleSlots*4);
    // Fixed-size ballistic splash pool. The water now throws actual droplets
    // above the sheet at foot contact, as well as changing its reflected normal.
    this.dropletCount=48;this.nextDroplet=0;this.droplets=new Float32Array(48*7);
    this.dropletPositions=new Float32Array(48*3).fill(-10000);
    const drops=new THREE.BufferGeometry();drops.setAttribute('position',new THREE.BufferAttribute(this.dropletPositions,3));
    this.splash=new THREE.Points(drops,new THREE.PointsMaterial({color:0xa9cbc5,size:.052,transparent:true,opacity:.65,depthWrite:false}));
    this.splash.name='water-contact-droplets';this.splash.frustumCulled=false;mesh.add(this.splash);
    this.uniforms={waterTime:{value:0},waterReflection:{value:this.target.texture},waterProjection:{value:new THREE.Matrix4()},waterReflectionReady:{value:0},
      waterRipples:{value:this.ripples},waterWade:{value:new THREE.Vector3(0,0,0)}};
    const material=mesh.material.clone();material.color.setHex(0x182d2b);material.roughness=.25;material.metalness=.08;material.opacity=.90;material.depthWrite=false;material.envMapIntensity=.65;
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,this.uniforms);
      shader.vertexShader='uniform mat4 waterProjection; varying vec3 waterPoint; varying vec4 waterCoord;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
        vec4 waterWorld=modelMatrix*vec4(transformed,1.);waterPoint=waterWorld.xyz;waterCoord=waterProjection*waterWorld;
      `);
      shader.fragmentShader='uniform float waterTime,waterReflectionReady; uniform sampler2D waterReflection; uniform vec4 waterRipples['+this.rippleSlots+']; uniform vec3 waterWade; varying vec3 waterPoint; varying vec4 waterCoord;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('void main() {','void main() {\n  float waterFoamValue=0.;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec2 wave=vec2(sin(waterPoint.x*1.1+waterPoint.z*.45+waterTime*.48),cos(waterPoint.z*1.4-waterPoint.x*.31-waterTime*.37))*.019;
        wave+=vec2(sin(waterPoint.z*3.2+waterTime*.7),cos(waterPoint.x*2.8-waterTime*.6))*.006;
        // A third octave, small and fast. Two alone read as a slow swell; still
        // water in a cistern has fine texture on top of that swell.
        wave+=vec2(sin(waterPoint.x*7.9-waterTime*1.6),cos(waterPoint.z*8.7+waterTime*1.35))*.0022;
        float foam=0.;
        // Rings spreading from where a foot went in. Each ring is a travelling
        // crest: the displacement follows the distance from the ring's front,
        // so the wave moves outwards rather than the whole disc pulsing.
        for(int i=0;i<${this.rippleSlots};i++){
          vec4 ring=waterRipples[i];
          if(ring.w<=0.)continue;
          float age=waterTime-ring.z;
          if(age<0.||age>2.6)continue;
          vec2 offset=waterPoint.xz-ring.xy;
          float dist=length(offset);
          float front=age*1.55;                       // how far the crest has travelled
          float band=exp(-pow((dist-front)*1.35,2.));  // the crest, and the trough behind it
          float fade=ring.w*exp(-age*1.35)*band;
          if(fade<=0.0005)continue;
          float phase=(dist-front)*13.5;
          wave+=normalize(offset+1e-5)*sin(phase)*fade*.135;
          foam+=fade*.85;
        }
        // The churn around the player while they are actually moving through it.
        if(waterWade.z>0.){
          vec2 offset=waterPoint.xz-waterWade.xy;
          float dist=length(offset);
          float near=smoothstep(1.9,0.,dist)*waterWade.z;
          wave+=normalize(offset+1e-5)*sin(dist*22.-waterTime*11.)*near*.085;
          foam+=near*.65;
        }
        waterFoamValue=clamp(foam,0.,1.);
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
        // Disturbed water goes pale and loses its reflection: broken surface
        // scatters instead of mirroring. Without this the rings deform the
        // reflection but the water still reads as glass.
        outgoingLight=mix(outgoingLight,vec3(.64,.70,.68),waterFoamValue*.6);
        #include <opaque_fragment>
      `);
    };
    material.customProgramCacheKey=()=> 'silo-continuous-reflective-water-v3';this.material=mesh.material=material;
  }
  // A foot going in. World coordinates; strength is roughly how hard.
  ripple(x,z,strength=1){
    const slot=this.nextRipple%this.rippleSlots,base=slot*4;
    this.ripples[base]=x;this.ripples[base+1]=z;
    this.ripples[base+2]=this.uniforms.waterTime.value;
    this.ripples[base+3]=Math.max(.05,Math.min(2,strength));
    this.nextRipple++;
    this.mesh.updateWorldMatrix(true,false);
    const centre=this.mesh.worldToLocal(new THREE.Vector3(x,this.mesh.localToWorld(new THREE.Vector3(0,this.height,0)).y,z));
    for(let j=0;j<8;j++){
      const at=(this.nextDroplet++%this.dropletCount)*7,a=j*Math.PI/4+this.nextRipple*.71;
      this.droplets.set([centre.x,centre.y,centre.z,Math.cos(a)*.55,1.05+Math.min(2,Math.max(.05,strength))*.7,Math.sin(a)*.55,this.uniforms.waterTime.value],at);
    }
  }
  // Standing in it and moving: a patch of churn that follows the player.
  setWade(x,z,amount){
    this.uniforms.waterWade.value.set(x,z,Math.max(0,Math.min(1,amount)));
  }
  setQuality(quality){if(this.quality===quality)return;this.quality=quality;this.target.setSize(quality==='high'?768:512,quality==='high'?384:256);this.last=-Infinity;if(quality==='low')this.uniforms.waterReflectionReady.value=0;}
  update(renderer,scene,camera,time){
    this.uniforms.waterTime.value=time;
    for(let i=0;i<this.dropletCount;i++){
      const d=i*7,p=i*3,age=time-this.droplets[d+6],active=this.droplets[d+4]>0&&age>=0&&age<.55;
      this.dropletPositions[p]=active?this.droplets[d]+this.droplets[d+3]*age:0;
      this.dropletPositions[p+1]=active?this.droplets[d+1]+this.droplets[d+4]*age-4.905*age*age:-10000;
      this.dropletPositions[p+2]=active?this.droplets[d+2]+this.droplets[d+5]*age:0;
    }
    this.splash.geometry.attributes.position.needsUpdate=true;
    if(this.quality==='low'||!this.mesh.parent?.visible||time-this.last<(this.quality==='high'?1/20:1/12))return;
    this.mesh.updateWorldMatrix(true,false);const height=new THREE.Vector3(0,this.height,0).applyMatrix4(this.mesh.matrixWorld).y;
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
