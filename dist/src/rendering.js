import * as THREE from '../vendor/three.module.js';

export function makeEnvironment(renderer,scene){
  const env=new THREE.Scene();env.background=new THREE.Color(0x747772);
  const room=new THREE.Mesh(new THREE.BoxGeometry(12,9,12),new THREE.MeshBasicMaterial({color:0x3b403f,side:THREE.BackSide}));env.add(room);
  for(const [x,y,z,w,h,d,color] of [[0,4,0,8,.1,5,0xf0e7d6],[-5,1,0,.1,3,7,0x889b9c],[5,1,0,.1,3,7,0x99968c],[0,1,-5,4,2,.1,0x85847c],[0,.5,5,5,2,.1,0xaaa08b]]){const card=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));card.position.set(x,y,z);env.add(card);}
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(env,.045);scene.environment=target.texture;scene.environmentIntensity=.72;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}

// Depth-aware contact shading and restrained light bloom. The renderer's own
// tone mapping and color conversion run once, in this final composition pass.
export class Rendering {
  constructor(renderer){
    this.renderer=renderer;this.enabled=true;
    this.target=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{colorMap:{value:this.target.texture},depthMap:{value:this.target.depthTexture},resolution:{value:new THREE.Vector2(1,1)},inverseProjection:{value:new THREE.Matrix4()},strength:{value:.22}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      uniform sampler2D colorMap,depthMap;
      uniform vec2 resolution;uniform mat4 inverseProjection;uniform float strength;varying vec2 vUv;
      vec3 positionAt(vec2 uv){vec4 p=inverseProjection*vec4(uv*2.-1.,texture2D(depthMap,uv).x*2.-1.,1.);return p.xyz/p.w;}
      float luma(vec3 c){return dot(c/(1.+c),vec3(.299,.587,.114));}
      // Conservative FXAA also serves the low setting and devices without
      // multisampled float buffers. No temporal jitter or history ghosting.
      vec3 smoothColor(vec2 uv,vec2 px){
        vec3 c=texture2D(colorMap,uv).rgb;
        float a=luma(texture2D(colorMap,uv+px*vec2(-1.,-1.)).rgb),b=luma(texture2D(colorMap,uv+px*vec2(1.,-1.)).rgb),d=luma(texture2D(colorMap,uv+px*vec2(-1.,1.)).rgb),e=luma(texture2D(colorMap,uv+px).rgb),m=luma(c);
        float lo=min(m,min(min(a,b),min(d,e))),hi=max(m,max(max(a,b),max(d,e)));
        if(hi-lo<max(.025,hi*.10))return c;
        vec2 dir=vec2(-((a+b)-(d+e)),(a+d)-(b+e));float reduce=max((a+b+d+e)*.03125,.0078125);
        dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-4.),vec2(4.))*px;
        vec3 first=.5*(texture2D(colorMap,uv-dir/6.).rgb+texture2D(colorMap,uv+dir/6.).rgb);
        vec3 second=first*.5+.25*(texture2D(colorMap,uv-dir*.5).rgb+texture2D(colorMap,uv+dir*.5).rgb);float v=luma(second);
        return v<lo||v>hi?first:second;
      }
      void main(){
        vec2 pixel=1./resolution;vec3 c=smoothColor(vUv,pixel),p=positionAt(vUv);float occlusion=0.;vec3 glow=vec3(0.);
        // Choose the closest derivative on either side of a depth edge. A
        // sloping floor then contributes no occlusion against its own plane.
        if(strength>0.){
        vec3 left=p-positionAt(vUv-vec2(pixel.x,0.)),right=positionAt(vUv+vec2(pixel.x,0.))-p;
        vec3 down=p-positionAt(vUv-vec2(0.,pixel.y)),up=positionAt(vUv+vec2(0.,pixel.y))-p;
        vec3 dx=abs(left.z)<abs(right.z)?left:right,dy=abs(down.z)<abs(up.z)?down:up;
        vec3 n=normalize(cross(dx,dy));if(dot(n,-p)<0.)n=-n;
        float radius=clamp(resolution.y*.36/max(-p.z,1.),2.,22.);
        for(int i=0;i<12;i++){float a=float(i)*2.399963;vec2 dir=vec2(cos(a),sin(a));float r=radius*(.3+.7*sqrt((float(i)+1.)/12.));vec2 uv=clamp(vUv+dir*pixel*r,pixel,1.-pixel);vec3 delta=positionAt(uv)-p;float distance=length(delta);occlusion+=smoothstep(.012,.14,dot(n,delta))*(1.-smoothstep(.22,.72,distance));vec3 sampleColor=texture2D(colorMap,clamp(vUv+dir*pixel*5.,pixel,1.-pixel)).rgb;glow+=max(sampleColor-vec3(2.),vec3(0.));}
        }
        c*=1.-occlusion*.083333*strength;c+=glow*.0083;
        // Restrained tungsten highlights, cool concrete shadows and retained
        // colour in the domestic rooms; no film grain obscuring mobile detail.
        float light=dot(c,vec3(.2126,.7152,.0722));
        c*=mix(vec3(.975,1.008,1.025),vec3(1.026,1.012,.975),smoothstep(.05,.85,light));
        c=mix(vec3(light),c,1.035);
        float vignette=dot(vUv-.5,vUv-.5);c*=1.-vignette*.16;
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
  }
  setQuality(quality){const samples=Math.min(this.renderer.capabilities.maxSamples||0,quality==='high'?4:quality==='low'?0:2);if(this.target.samples!==samples){this.target.samples=samples;this.target.dispose();}this.material.uniforms.strength.value=quality==='high'?.34:quality==='low'?0:.24;}
  resize(){const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.target.setSize(size.x,size.y);this.material.uniforms.resolution.value.copy(size);}
  renderScreen(texture,aspect){
    if(!this.screenScene){this.screenScene=new THREE.Scene();this.screenScene.background=new THREE.Color(0x101614);this.screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.screenMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:texture,depthTest:false,depthWrite:false}));this.screenScene.add(this.screenMesh);}
    const ratio=30/6.8,w=Math.min(1.92,1.35*ratio/aspect),h=w*aspect/ratio;this.screenMesh.scale.set(w/2,h/2,1);this.renderer.setRenderTarget(null);this.renderer.render(this.screenScene,this.screenCamera);
  }
  render(scene,camera){
    if(!this.enabled){this.renderer.render(scene,camera);return;}
    this.material.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
    this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
  }
}
