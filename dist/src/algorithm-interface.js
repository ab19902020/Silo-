import * as THREE from '../vendor/three.module.js';

// Territory Studio's screen work uses cymatic sand patterns. This is an
// original real-time reconstruction, not footage or a surveyed set replica.
export function createAlgorithmInterface(){
  const group=new THREE.Group();group.name='algorithm-interface';
  const count=6400,positions=new Float32Array(count*3),seeds=new Float32Array(count);
  for(let i=0;i<count;i++){
    const r=Math.sqrt((i+.5)/count)*1.65,a=i*2.3999632297;
    positions[i*3]=Math.cos(a)*r;positions[i*3+2]=Math.sin(a)*r;seeds[i]=(i*.61803398875)%1;
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},response:{value:0}},
    vertexShader:`attribute float seed; uniform float time; uniform float response; varying float glow;
      void main(){vec3 p=position;float r=length(p.xz);float a=atan(p.z,p.x);
      float wave=sin(r*19.-time*.65)*cos(a*6.+time*.13);
      p.y=.015+abs(wave)*(.025+response*.28)*(1.-r*.32);
      p.xz*=1.+sin(a*8.+time*.2)*.012;
      glow=.4+.6*pow(abs(wave),2.);vec4 mv=modelViewMatrix*vec4(p,1.);
      gl_PointSize=clamp((11.+seed*7.)/-mv.z,1.,5.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float glow; void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;
      gl_FragColor=vec4(vec3(.85,.83,.75)*(.55+glow*.45),(1.-smoothstep(.18,.5,d))*.9);}`});
  const sand=new THREE.Points(geometry,material);sand.name='cymatic-sand';sand.userData.ownedGeometry=true;sand.userData.ownedMaterial=true;group.add(sand);
  group.position.set(0,1.10,20.2);
  group.userData.respond=()=>{material.uniforms.response.value=1;};
  group.userData.update=dt=>{material.uniforms.time.value+=Math.min(dt,.1);material.uniforms.response.value*=Math.exp(-Math.min(dt,.1)*.65);};
  return group;
}
