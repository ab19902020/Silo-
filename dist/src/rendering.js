import * as THREE from '../vendor/three.module.js';

export function makeEnvironment(renderer,scene){
  const env=new THREE.Scene();env.background=new THREE.Color(0x646a60);
  const room=new THREE.Mesh(new THREE.BoxGeometry(12,9,12),new THREE.MeshBasicMaterial({color:0x333b34,side:THREE.BackSide}));env.add(room);
  for(const [x,y,z,w,h,d,color] of [[0,4,0,8,.1,5,0xe3d8b1],[-5,1,0,.1,3,7,0x72897e],[5,1,0,.1,3,7,0x7a7560],[0,1,-5,4,2,.1,0x79756b]]){const card=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));card.position.set(x,y,z);env.add(card);}
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(env,.035);scene.environment=target.texture;scene.environmentIntensity=.42;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}

// Depth-aware contact shading and restrained light bloom. The renderer's own
// tone mapping and color conversion run once, in this final composition pass.
export class Rendering {
  constructor(renderer){
    this.renderer=renderer;this.enabled=true;
    this.target=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{colorMap:{value:this.target.texture},depthMap:{value:this.target.depthTexture},resolution:{value:new THREE.Vector2(1,1)},nearClip:{value:.08},farClip:{value:2300},strength:{value:.25}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      uniform sampler2D colorMap,depthMap;
      uniform vec2 resolution;uniform float nearClip,farClip,strength;varying vec2 vUv;
      float distanceAt(vec2 uv){float d=texture2D(depthMap,uv).x;return nearClip*farClip/(farClip-d*(farClip-nearClip));}
      void main(){
        vec3 c=texture2D(colorMap,vUv).rgb;float z=distanceAt(vUv),occlusion=0.;vec3 glow=vec3(0.);
        vec2 pixel=1./resolution;float radius=clamp(90./max(z,1.),2.,14.);
        for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 dir=vec2(cos(a),sin(a));float sampleZ=distanceAt(vUv+dir*pixel*radius);float delta=z-sampleZ;occlusion+=smoothstep(.055,.34,delta)*(1.-smoothstep(.6,2.7,delta));vec3 sampleColor=texture2D(colorMap,vUv+dir*pixel*4.).rgb;glow+=max(sampleColor-vec3(1.35),vec3(0.));}
        c*=1.-occlusion*.125*strength;c+=glow*.0125;
        float vignette=dot(vUv-.5,vUv-.5);c*=1.-vignette*.16;
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
  }
  resize(){const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.target.setSize(size.x,size.y);this.material.uniforms.resolution.value.copy(size);}
  render(scene,camera){
    if(!this.enabled){this.renderer.render(scene,camera);return;}
    this.material.uniforms.nearClip.value=camera.near;this.material.uniforms.farClip.value=camera.far;
    this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
  }
}
