import * as THREE from '../vendor/three.module.js';

// One sky material drives the real exterior and its live camera. Angular star
// positions are fixed; only their brightness changes, so turning cannot make
// the star field swim. The horizon stays hazy above the enclosing crater.
export class ExteriorSky{
  constructor(){
    this.mode='day';this.elapsed=0;this.daylight=1;
    this.material=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,toneMapped:false,uniforms:{day:{value:1},time:{value:0}},vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
      precision highp float;varying vec3 vDirection;uniform float day,time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec3 d=normalize(vDirection);float elevation=max(0.,d.y);
        // A band of dust sits on the horizon and the crest dissolves into it.
        // A clean gradient straight to blue drew a hard line along every ridge.
        vec3 daylight=mix(vec3(.39,.45,.46),vec3(.16,.26,.34),smoothstep(0.,.85,elevation));
        daylight=mix(vec3(.565,.605,.615),daylight,smoothstep(0.,.20,elevation));
        vec3 night=mix(vec3(.021,.031,.045),vec3(.002,.006,.018),smoothstep(0.,.65,elevation));
        vec3 color=mix(night,daylight,day);
        vec2 uv=vec2(atan(d.z,d.x)/6.2831853+.5,asin(d.y)/3.14159265+.5),grid=uv*vec2(900.,450.);
        vec2 cell=floor(grid),offset=vec2(hash(cell+31.),hash(cell+93.));
        float distance=length(fract(grid)-(.18+.64*offset));
        float radius=mix(.065,.16,hash(cell+7.));
        float star=(1.-smoothstep(radius*.25,radius,distance))*step(.988,hash(cell));
        float haze=smoothstep(.025,.18,elevation),twinkle=.88+.12*sin(time*.6+hash(cell)*60.);
        color+=star*haze*(1.-day)*twinkle*mix(vec3(.58,.73,1.),vec3(1.,.84,.61),hash(cell+13.))*1.8;
        gl_FragColor=vec4(color,1.);
      }`});
    const geometry=new THREE.SphereGeometry(1100,40,24);this.mesh=new THREE.Mesh(geometry,this.material);this.mesh.name='exterior-sky';this.mesh.frustumCulled=false;this.mesh.renderOrder=-100;this.feed=this.mesh.clone();
  }
  setMode(mode){this.mode=['day','night','cycle'].includes(mode)?mode:'day';this.update(0);}
  update(dt){this.elapsed+=dt;const sun=this.mode==='night'?0:this.mode==='day'?1:.5+.5*Math.cos(this.elapsed/1200*Math.PI*2);this.daylight=THREE.MathUtils.smoothstep(sun,.12,.65);this.material.uniforms.day.value=this.daylight;this.material.uniforms.time.value=this.elapsed;}
  get fogColor(){return new THREE.Color(0x0b1221).lerp(new THREE.Color(0x929fa3),this.daylight);}
}
