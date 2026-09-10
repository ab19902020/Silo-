import * as THREE from '../vendor/three.module.js';

export function makeEnvironment(renderer,scene){
  const env=new THREE.Scene();env.background=new THREE.Color(0x747772);
  const room=new THREE.Mesh(new THREE.BoxGeometry(12,9,12),new THREE.MeshBasicMaterial({color:0x3b403f,side:THREE.BackSide}));env.add(room);
  for(const [x,y,z,w,h,d,color] of [[0,4,0,8,.1,5,0xf0e7d6],[-5,1,0,.1,3,7,0x889b9c],[5,1,0,.1,3,7,0x99968c],[0,1,-5,4,2,.1,0x85847c]]){const card=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshBasicMaterial({color}));card.position.set(x,y,z);env.add(card);}
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(env,.045);scene.environment=target.texture;scene.environmentIntensity=.72;pmrem.dispose();env.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}

// Depth-aware contact shading, halation off the practicals, an eye that adapts
// to the room it is in, and the grade. The renderer's own tone mapping and
// colour conversion run once, in this final composition pass.
//
// The grade is the cheapest thing in the game per unit of effect: it touches no
// geometry and changes every frame everywhere. What it is aiming at is the look
// the television series has — a narrow, desaturated palette with cold concrete
// shadows and tungsten highlights, contrast that lets the dark actually go
// dark, and light that blooms off a fixture the way it does on a real lens.
//
// Auto-exposure runs entirely on the GPU: two tiny reduction passes and a pair
// of one-pixel targets ping-ponged for temporal damping, so nothing is ever
// read back and the pipeline never stalls. It is deliberately gentle and hard
// clamped — an eye adjusting as you step off a lit gallery into the shaft, not
// a camera hunting for a new exposure every time you turn your head.
const LUMA_SIZE=32;                    // first reduction, full frame to 32x32
const EXPOSURE_KEY=.11;                // the average the adaptation aims at
// Asymmetric on purpose. The eye is allowed to pull a blown room back a long
// way, and to lift a dark one only a little: a symmetric clamp let the gain run
// up as the night cycle dimmed the fixtures and handed back most of the
// darkness the schedule had just taken away, so two in the morning looked like
// the afternoon with warmer lamps.
const EXPOSURE_FLOOR=.70,EXPOSURE_CEILING=1.12;
const EXPOSURE_RATE=.9;                // how fast the eye gives in, per second
const encodeLuma='float encodeLuma(float l){return clamp((log2(max(l,1e-5))+12.)/24.,0.,1.);}';
const decodeLuma='float decodeLuma(float e){return exp2(e*24.-12.);}';
const LUMA_WEIGHTS='vec3(.2126,.7152,.0722)';

export class Rendering {
  constructor(renderer){
    this.renderer=renderer;this.enabled=true;this.last=0;
    this.target=new THREE.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true});this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
    this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    // The exposure chain. Byte targets on purpose: luminance is stored as log2
    // remapped into 0-1 over twenty-four stops, so a single byte still carries
    // it to a tenth of a stop and the chain works on hardware with no float
    // render targets at all.
    const small={depthBuffer:false,stencilBuffer:false,type:THREE.UnsignedByteType,
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter};
    this.lumaTarget=new THREE.WebGLRenderTarget(LUMA_SIZE,LUMA_SIZE,small);
    this.exposureTargets=[new THREE.WebGLRenderTarget(1,1,small),new THREE.WebGLRenderTarget(1,1,small)];
    this.exposureIndex=0;this.exposurePrimed=false;
    this.lumaMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      uniforms:{colorMap:{value:this.target.texture},resolution:{value:new THREE.Vector2(1,1)}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`
        uniform sampler2D colorMap;uniform vec2 resolution;varying vec2 vUv;
        ${encodeLuma}
        void main(){
          // Nine taps across this texel's share of the frame. Exact coverage is
          // pointless here — this is a key, not a measurement.
          vec2 step=1./vec2(${LUMA_SIZE}.);float total=0.;
          for(int y=0;y<3;y++)for(int x=0;x<3;x++){
            vec2 uv=vUv+(vec2(float(x),float(y))-1.)*step*.33;
            total+=dot(texture2D(colorMap,clamp(uv,vec2(.001),vec2(.999))).rgb,${LUMA_WEIGHTS});
          }
          gl_FragColor=vec4(encodeLuma(total/9.),0.,0.,1.);
        }`});
    this.exposureMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,
      uniforms:{lumaMap:{value:this.lumaTarget.texture},previous:{value:this.exposureTargets[1].texture},
        blend:{value:1},primed:{value:0}},
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`
        uniform sampler2D lumaMap,previous;uniform float blend,primed;varying vec2 vUv;
        void main(){
          float total=0.;
          for(int y=0;y<8;y++)for(int x=0;x<8;x++)
            total+=texture2D(lumaMap,(vec2(float(x),float(y))+.5)/8.).r;
          float now=total/64.;
          // Damped in log space, which is where a stop is a stop. The first
          // frame takes the reading whole so the game does not open mid-fade.
          gl_FragColor=vec4(primed<.5?now:mix(texture2D(previous,vec2(.5)).r,now,blend),0.,0.,1.);
        }`});
    this.reduceScene=new THREE.Scene();this.reduceMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.lumaMaterial);this.reduceScene.add(this.reduceMesh);
    this.material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{colorMap:{value:this.target.texture},depthMap:{value:this.target.depthTexture},resolution:{value:new THREE.Vector2(1,1)},inverseProjection:{value:new THREE.Matrix4()},strength:{value:.22},exposureMap:{value:this.exposureTargets[0].texture},look:{value:1},grain:{value:.030},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      uniform sampler2D colorMap,depthMap,exposureMap;
      uniform vec2 resolution;uniform mat4 inverseProjection;uniform float strength,look,grain,time;varying vec2 vUv;
      float decodeLuma(float e){return exp2(e*24.-12.);}
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
        for(int i=0;i<12;i++){float a=float(i)*2.399963;vec2 dir=vec2(cos(a),sin(a));float r=radius*(.3+.7*sqrt((float(i)+1.)/12.));vec2 uv=clamp(vUv+dir*pixel*r,pixel,1.-pixel);vec3 delta=positionAt(uv)-p;float distance=length(delta);occlusion+=smoothstep(.035,.20,dot(n,delta))*(1.-smoothstep(.35,1.15,distance));vec3 sampleColor=texture2D(colorMap,clamp(vUv+dir*pixel*5.,pixel,1.-pixel)).rgb;glow+=max(sampleColor-vec3(2.),vec3(0.));}
        }
        c*=1.-occlusion*.083333*strength;c+=glow*.0083;
        if(look>0.){
          // Halation. A real lens does not stop a bright practical at the edge
          // of the fixture: it spreads, and it spreads warm. Twelve taps at a
          // radius that scales with the frame rather than with the pixel count,
          // so a phone and a monitor bleed by the same amount of picture.
          vec3 halo=vec3(0.);float wide=resolution.y*.030;
          for(int i=0;i<12;i++){
            float a=float(i)*2.399963+.7;
            vec2 uv=clamp(vUv+vec2(cos(a),sin(a))*pixel*wide*(.45+.55*sqrt((float(i)+1.)/12.)),pixel,1.-pixel);
            halo+=max(texture2D(colorMap,uv).rgb-vec3(1.2),vec3(0.));
          }
          c+=halo*vec3(.052,.034,.019)*look;
        }
        // The eye. Gently, and hard clamped at both ends: this is somebody
        // stepping off a lit gallery into the shaft and letting their eyes go,
        // not a camera hunting a new exposure every time you turn your head.
        float average=decodeLuma(texture2D(exposureMap,vec2(.5)).r);
        c*=mix(1.,clamp(.11/max(average,1e-4),.70,1.12),look);

        float light=dot(c,vec3(.2126,.7152,.0722));
        // Cold concrete in the shadows, tungsten in the highlights. Two lines,
        // and most of the palette of the show is in them.
        c*=mix(mix(vec3(1.),vec3(.930,.995,1.070),look),mix(vec3(1.),vec3(1.055,1.014,.936),look),smoothstep(.03,.80,light));
        // Take the colour out, then put a little back into whatever is actually
        // bright, so the practicals stay amber while the concrete goes grey.
        c=mix(vec3(light),c,mix(1.035,.86+.42*smoothstep(.10,.95,light),look));
        // Contrast about a mid grey, in a form that survives values well over
        // one — this buffer is still linear and a lamp in it is not 1.0. Doing
        // it with a smoothstep drives the highlights negative.
        c=.18*pow(max(c,vec3(1e-5))/.18,vec3(1.+look*.20));
        c=max(c-look*.006,vec3(0.));   // a real toe, so the dark can go dark
        float vignette=dot(vUv-.5,vUv-.5);c*=1.-vignette*(.16+.15*look);
        // Grain, in the shadows where film has it, and never on the battery
        // setting where it would cost a phone detail it cannot spare.
        if(grain>0.){
          float n=fract(sin(dot(vUv*resolution+time,vec2(12.9898,78.233)))*43758.5453)-.5;
          c+=n*grain*(1.-smoothstep(0.,.55,light));
        }
        gl_FragColor=vec4(max(c,vec3(0.)),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material));
  }
  setQuality(quality){
    const samples=Math.min(this.renderer.capabilities.maxSamples||0,quality==='high'?4:quality==='low'?0:2);
    if(this.target.samples!==samples){this.target.samples=samples;this.target.dispose();}
    this.material.uniforms.strength.value=quality==='high'?.28:quality==='low'?0:.18;
    // The grade survives the battery setting at reduced strength — it costs
    // one pass either way and it is most of what the game looks like. The
    // halation loop and the grain are what actually cost, so those go first.
    this.material.uniforms.look.value=quality==='low'?.55:1;
    this.material.uniforms.grain.value=quality==='low'?0:quality==='high'?.034:.026;
  }
  resize(){const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.target.setSize(size.x,size.y);this.material.uniforms.resolution.value.copy(size);}
  renderScreen(texture,aspect){
    if(!this.screenScene){this.screenScene=new THREE.Scene();this.screenScene.background=new THREE.Color(0x101614);this.screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.screenMesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:texture,depthTest:false,depthWrite:false}));this.screenScene.add(this.screenMesh);}
    const ratio=30/6.8,w=Math.min(1.92,1.35*ratio/aspect),h=w*aspect/ratio;this.screenMesh.scale.set(w/2,h/2,1);this.renderer.setRenderTarget(null);this.renderer.render(this.screenScene,this.screenCamera);
  }
  // Two reductions and a ping-pong, all on the GPU. Nothing is read back, so
  // the pipeline never stalls waiting for the frame it has just drawn.
  measureExposure(dt){
    const uniforms=this.material.uniforms;
    if(uniforms.look.value<=0)return;
    const r=this.renderer;
    this.lumaMaterial.uniforms.resolution.value.copy(uniforms.resolution.value);
    this.reduceMesh.material=this.lumaMaterial;
    r.setRenderTarget(this.lumaTarget);r.render(this.reduceScene,this.camera);
    const write=this.exposureTargets[this.exposureIndex],previous=this.exposureTargets[1-this.exposureIndex];
    this.exposureMaterial.uniforms.previous.value=previous.texture;
    this.exposureMaterial.uniforms.blend.value=1-Math.exp(-EXPOSURE_RATE*dt);
    this.exposureMaterial.uniforms.primed.value=this.exposurePrimed?1:0;
    this.reduceMesh.material=this.exposureMaterial;
    r.setRenderTarget(write);r.render(this.reduceScene,this.camera);
    uniforms.exposureMap.value=write.texture;
    this.exposureIndex=1-this.exposureIndex;this.exposurePrimed=true;
  }
  render(scene,camera){
    if(!this.enabled){this.renderer.render(scene,camera);return;}
    this.material.uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);
    const now=(typeof performance!=='undefined'?performance.now():Date.now())*.001;
    const dt=this.last?Math.min(.25,Math.max(0,now-this.last)):0;this.last=now;
    this.material.uniforms.time.value=now%1000;
    this.renderer.setRenderTarget(this.target);this.renderer.render(scene,camera);
    this.measureExposure(dt);
    this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);
  }
}
