import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign } from './kit.js';
import { SILO, levelY } from './data.js';
import { projectMaterial } from './materials.js';
export const topPoint=(x,y,z)=>new THREE.Vector3(SILO.deckOuter+z,levelY(1)+y,-x);
export const topLocal=p=>({x:-p.z,y:p.y-levelY(1),z:p.x-SILO.deckOuter});
export const rampY=z=>THREE.MathUtils.clamp((z-64)/44,0,1)*14;
export const inRampPassage=(x,z)=>x>23&&x<29&&z>=64&&z<108;
export const inRampCutout=(x,z)=>inRampPassage(x,z)&&z>=94;
export function groundY(x,z){
  const r=Math.hypot(x-26,z-139),rim=6.4*Math.exp(-Math.pow((r-108)/27,2));
  const detail=(Math.sin(x*.069+z*.022)*.75+Math.cos(z*.087-x*.031)*.52+Math.sin(x*.43+z*.24)*.15)*Math.min(1,Math.max(0,(z-111)/18));
  const entrance=Math.min(1,Math.hypot(x-26,z-108)/24);
  return 14+(rim+detail)*entrance;
}
export class SurfaceWorld {
  constructor(m){
    this.root=new THREE.Group();this.root.position.set(SILO.deckOuter,levelY(1),0);this.root.rotation.y=Math.PI/2;
    this.solids=[];this.cleanliness=.28;this.cleaning=false;this.cleanTime=0;this.lastFeed=-100;this.m=m;
    const k=new Kit(m),rng=random(180018),box=(mat,x,y,z,w,h,d,solid=false)=>{k.box(mat,x,y,z,w,h,d);if(solid)this.solids.push({x,z,w,d,y0:y-h/2,y1:y+h/2});};
    // Real inclined slab, with a matching analytic collision surface.
    const vertices=[23,0,64,29,0,64,29,14,108,23,14,108],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,2,18,0,18],2));g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();const slab=new THREE.Mesh(g,m.concrete);slab.receiveShadow=true;this.root.add(slab);
    for(let z=64;z<108;z+=2){
      const y=rampY(z+1);for(const x of [22.75,29.25]){const bottom=y-.35,top=Math.min(y+5.15,14.5);box('concrete',x,(bottom+top)/2,z+1,.5,top-bottom,2.03,true);k.box('darkMetal',x<26?23.05:28.95,y+.16,z+1,.075,.08,2.03);}
      if(z<94){box('darkConcrete',26,y+4.95,z+1,6.8,.45,2.04);if(z%6===4){for(const x of [23.05,28.95]){box('darkMetal',x,y+2.5,z+.8,.12,.95,.45);box('coldLamp',x<26?23.13:28.87,y+2.5,z+.8,.04,.8,.19);}}}
      for(const x of [23.45,28.55])k.box('yellow',x,rampY(z)+.022,z,.11,.025,.75);
    }
    // Trailer reference: slatted incline, chamfered tunnel shoulders, exposed
    // transverse steel ribs, cyan wall strips and small ceiling indicators.
    for(let z=64.2;z<108;z+=.24)k.box('metal',26,rampY(z)+.014,z,5.55,.018,.045);
    for(let z=65;z<95;z+=2){const y=rampY(z);for(const side of [-1,1]){const x=26+side*2.93;k.beam('darkMetal',[x,y+.1,z],[x,y+3.15,z],.065);k.beam('darkMetal',[x,y+3.15,z],[26+side*1.9,y+4.72,z],.065);k.box('metal',26+side*2.43,y+3.94,z,1.9,.08,1.91,0,0,-side*.99);for(let j=0;j<8;j++)k.box('darkMetal',x,y+.5+j*.28,z,.025,.035,1.75);}k.beam('darkMetal',[24.1,y+4.72,z],[27.9,y+4.72,z],.065);if(z%6===5)k.box('redLamp',26,y+4.69,z,.12,.035,.12);}
    // The exit is sunken, edged by a low rounded curb. Its reinforced hatch
    // leaves stand open to each side; there is no tall above-ground doorway.
    for(const x of [22.35,29.65])k.bevel('concrete',x,14.27,101.5,.75,.55,15);
    k.bevel('concrete',26,14.28,108.6,8,.56,.85);
    // Split curb leaves the walking route open at the ramp lip.
    k.parts.pop();for(const x of [22.7,29.3])k.bevel('concrete',x,14.28,108.6,1.4,.56,.85);
    for(const side of [-1,1]){const hatch=new THREE.Group(),hk=new Kit(m);hk.bevel('metal',side*1.7,0,0,3.35,.17,12.4);for(let j=0;j<9;j++){const z=-5.5+j*1.4;hk.beam('darkMetal',[side*.15,.13,0],[side*3.2,.13,z],.046);}hatch.add(hk.group());hatch.position.set(26+side*3.25,14.45,101.8);hatch.rotation.z=-side*.35;this.root.add(hatch);}
    // A squat, buttressed sensor monument beyond the lip of the ramp.
    const sensorZ=119,base=groundY(26,sensorZ);
    k.bevel('concrete',26,base+.1,sensorZ,6.7,.2,3.1);k.bevel('concrete',26,base+1.35,sensorZ+.45,5.6,2.5,.65);k.bevel('concrete',26,base+2.8,sensorZ,6.25,.35,2.4);
    for(const side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(-.55,0);shape.lineTo(.55,0);shape.lineTo(.2,2.6);shape.lineTo(-.2,2.6);const geo=new THREE.ExtrudeGeometry(shape,{depth:1.8,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2,steps:1});const buttress=new THREE.Mesh(geo,m.concrete);buttress.position.set(26+side*2.55,base,sensorZ-.9);buttress.castShadow=buttress.receiveShadow=true;this.root.add(buttress);}
    k.bevel('concrete',26,base+.65,sensorZ-.6,2.4,1.3,1.15);
    this.solids.push({x:26,z:sensorZ+.3,w:6,d:1.3,y0:base,y1:base+3});
    const lens=new Kit(m);lens.bevel('metal',26,base+1.85,sensorZ-.3,1.16,.64,.75);lens.cylinder('darkMetal',26,base+1.85,sensorZ-.73,.26,.15,Math.PI/2);lens.cylinder('glass',26,base+1.85,sensorZ-.83,.2,.035,Math.PI/2);lens.torus('brass',26,base+1.85,sensorZ-.855,.235,.025);this.root.add(lens.group());
    this.lensDirt=new THREE.MeshBasicMaterial({color:0x81775b,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide});const dirt=new THREE.Mesh(new THREE.CircleGeometry(.2,32),this.lensDirt);dirt.position.set(26,base+1.85,sensorZ-.88);this.root.add(dirt);
    this.sensorPoint=topPoint(26,base+1.85,sensorZ-.95);
    addSign(this.root,'18',[26,base+.6,sensorZ-1.2],.9,.65,Math.PI,{background:'#77796e',color:'#252c27',font:'bold 180px Arial',border:false});
    // Hatch boundaries are actual grid edges; no triangle bridges the opening.
    this.groundMaterial=m.rock.clone();this.groundMaterial.color.setHex(0xa09d8b);this.groundMaterial.vertexColors=true;this.groundMaterial.normalScale.set(.7,.7);projectMaterial(this.groundMaterial,1.8);
    this.terrainTiles=new Map();this.tileKey='';this.streamTerrain({x:26,z:140});this.ground=this.terrainTiles.get('0,0');
    // Angular scree with uneven silhouette, never a field of smooth spheres.
    const rockGeo=new THREE.IcosahedronGeometry(1,1),rp=rockGeo.attributes.position;for(let i=0;i<rp.count;i++){const v=new THREE.Vector3().fromBufferAttribute(rp,i).multiplyScalar(.78+rng()*.36);rp.setXYZ(i,v.x,v.y,v.z);}rockGeo.computeVertexNormals();
    const rocks=new Kit(m);for(let i=0;i<620;i++){const x=26+(rng()-.5)*510,z=140+(rng()-.5)*510;if(Math.abs(x-26)<8&&z<125)continue;const size=.15+Math.pow(rng(),4)*2.9;rocks.mesh(rockGeo,'rock',x,groundY(x,z)+size*.17,z,size,size*.4,size*.8,rng(),rng()*6,rng()*.3);}
    const scree=rocks.group();scree.name='surface-scree';this.root.add(scree);
    // The recognizable bare tree on the crater slope. Tapered branching mesh.
    const branch=(a,b,r1,r2)=>{const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a)),o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r1,v.length(),9),m.darkConcrete);o.position.copy(new THREE.Vector3(...a).addScaledVector(v,.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());o.name='dead-tree';o.castShadow=true;this.root.add(o);};
    const tx=49,tz=68,ty=groundY(tx,tz);branch([tx,ty,tz],[tx-1,ty+10,tz+1],.64,.26);
    const branchTree=(x,y,z,angle,length,r,depth)=>{const end=[x+Math.cos(angle)*length*.72,y+length*.68,z+Math.sin(angle)*length*.52];branch([x,y,z],end,r,r*.48);if(depth>0){branchTree(...end,angle+.65,length*.61,r*.48,depth-1);branchTree(...end,angle-.8,length*.55,r*.45,depth-1);}};
    branchTree(tx-.6,ty+5,tz,2.3,6,.3,3);branchTree(tx-.9,ty+8,tz+1,-.5,5.9,.23,3);branchTree(tx-1,ty+9.8,tz+1,1.5,4.6,.18,2);
    this.solids.push({x:tx,z:tz,w:1.2,d:1.2,y0:ty,y1:ty+8});
    for(const [x,z,h] of [[-31,37,3.2],[4,31,3.8],[78,47,2.8]]){const y=groundY(x,z);branch([x,y,z],[x+.25,y+h,z],.13,.035);branch([x+.1,y+h*.55,z],[x-1,y+h*.9,z+.2],.07,.018);branch([x+.2,y+h*.7,z],[x+1,y+h*1.06,z-.2],.06,.016);}
    // No city geometry: the exterior is a barren bowl.
    this.root.add(k.group());
    // Sparse moving dust is visible in both views without adding inhabitants.
    const dustGeo=new THREE.BufferGeometry(),dp=[];for(let i=0;i<180;i++)dp.push(26+(rng()-.5)*180,15+rng()*18,130+(rng()-.5)*160);dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));this.dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xbdb8a0,size:.035,transparent:true,opacity:.23,depthWrite:false}));this.dust.name='wind-dust';this.root.add(this.dust);
    this.feedScene=new THREE.Scene();this.feedScene.background=new THREE.Color(0x929fa3);this.feedScene.fog=new THREE.FogExp2(0x929fa3,.0038);this.feedRoot=new THREE.Group();this.feedRoot.position.copy(this.root.position);this.feedRoot.rotation.copy(this.root.rotation);for(const child of this.root.children)if((child.name!=='barren-ground'||child===this.ground)&&['barren-ground','surface-scree','dead-tree','wind-dust'].includes(child.name))this.feedRoot.add(child.clone(true));// The production display is a composed panorama. Fill the hatch cutout
    // in that panorama while the physical ramp remains open in the exterior.
    const cover=new THREE.PlaneGeometry(6,14,3,7);cover.rotateX(-Math.PI/2);cover.translate(26,0,101);for(let i=0;i<cover.attributes.position.count;i++){const p=cover.attributes.position;p.setY(i,groundY(p.getX(i),p.getZ(i)));}cover.computeVertexNormals();const cap=new THREE.Mesh(cover,this.groundMaterial);cap.name='barren-ground';cap.geometry.setAttribute('color',new THREE.Float32BufferAttribute(Array.from({length:cover.attributes.position.count},()=>[.84,.8148,.7644]).flat(),3));this.feedRoot.add(cap);
    this.feedDust=this.feedRoot.getObjectByName('wind-dust');this.feedScene.add(this.feedRoot,new THREE.HemisphereLight(0xdddcd0,0x79705c,2));const sun=new THREE.DirectionalLight(0xf3e6ce,2.2);sun.position.copy(topPoint(-20,100,200));this.feedScene.add(sun);
    this.camera=new THREE.PerspectiveCamera(24,30/6.8,.08,2500);this.camera.position.copy(this.sensorPoint);this.camera.lookAt(topPoint(26,base+2.2,0));
  }
  terrainGeometry(ix,iz){
    const size=800,step=ix===0&&iz===0?4:16,cx=26+ix*size,cz=140+iz*size;
    const axis=(center,extra)=>[...new Set([...Array.from({length:size/step+1},(_,i)=>center-size/2+i*step),...extra.filter(v=>v>center-size/2&&v<center+size/2)])].sort((a,b)=>a-b);
    const xs=axis(cx,[23,29]),zs=axis(cz,[94,108]),pos=[],colors=[],uv=[],indices=[];
    for(const z of zs)for(const x of xs){const y=groundY(x,z),shade=.82+.045*Math.sin(x*.63+z*.51)+(y-14)*.007;pos.push(x,y,z);colors.push(shade,shade*.97,shade*.91);uv.push(x/1.8,z/1.8);}
    for(let j=0;j<zs.length-1;j++)for(let i=0;i<xs.length-1;i++){
      if(inRampCutout((xs[i]+xs[i+1])/2,(zs[j]+zs[j+1])/2))continue;
      const a=j*xs.length+i,b=a+1,c=a+xs.length,d=c+1;indices.push(a,c,b,b,c,d);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  streamTerrain(p){
    const ix=Math.floor((p.x-26+400)/800),iz=Math.floor((p.z-140+400)/800),key=`${ix},${iz}`;if(key===this.tileKey)return;this.tileKey=key;
    const keep=new Set(['0,0']);for(let x=ix-1;x<=ix+1;x++)for(let z=iz-1;z<=iz+1;z++)keep.add(`${x},${z}`);
    for(const key of keep)if(!this.terrainTiles.has(key)){const [x,z]=key.split(',').map(Number),mesh=new THREE.Mesh(this.terrainGeometry(x,z),this.groundMaterial);mesh.name='barren-ground';mesh.receiveShadow=true;this.root.add(mesh);this.terrainTiles.set(key,mesh);}
    for(const [key,mesh] of this.terrainTiles)if(!keep.has(key)){mesh.removeFromParent();mesh.geometry.dispose();this.terrainTiles.delete(key);}
  }
  refreshMaterials(){const mat=this.groundMaterial;mat.map=this.m.rock.map;mat.normalMap=this.m.rock.normalMap;mat.roughnessMap=this.m.rock.roughnessMap;mat.roughness=.96;projectMaterial(mat,1.8);}
  floorAt(x,z,radius,maxHeight){
    const p=topLocal({x,y:maxHeight,z}),terrain=levelY(1)+groundY(p.x,p.z);
    if(inRampPassage(p.x,p.z)&&(inRampCutout(p.x,p.z)||maxHeight<terrain-.001)){const y=levelY(1)+rampY(p.z);return y<=maxHeight+.001?y:0;}
    return terrain<=maxHeight+.001?terrain:0;
  }
  beginCleaning(){this.cleaning=true;this.cleanTime=(this.cleanliness-.28)/.72*4;}
  update(dt){if(this.cleaning){this.cleanTime+=dt;this.cleanliness=Math.min(1,.28+this.cleanTime/4*.72);if(this.cleanTime>=4)this.cleaning=false;}this.lensDirt.opacity=(1-this.cleanliness)*.67;this.dust.position.x=(this.dust.position.x+dt*.6)%8;this.feedDust.position.x=this.dust.position.x;}
  get cleaningPoint(){return this.sensorPoint.clone();}
  initFeed(renderer){
    this.raw=new THREE.WebGLRenderTarget(1280,290,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType});this.target=new THREE.WebGLRenderTarget(1280,290);
    this.postScene=new THREE.Scene();this.postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    this.lensMaterial=new THREE.ShaderMaterial({uniforms:{source:{value:this.raw.texture},clean:{value:this.cleanliness},time:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D source;uniform float clean,time;varying vec2 vUv;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec3 c=texture2D(source,vUv).rgb;float soil=smoothstep(.12,.88,hash(floor(vUv*vec2(70.,22.))));float edge=smoothstep(.16,.65,length((vUv-.5)*vec2(.65,1.)));float wipe=smoothstep(clean-.12,clean+.06,vUv.x);float dirt=(1.-clean)*(.10+soil*.28+edge*.25)*(.7+wipe*.3);c=mix(c,vec3(.32,.27,.18),dirt);c*=.975+.025*sin(vUv.y*1450.);gl_FragColor=vec4(c,1.);}`,depthTest:false,depthWrite:false});this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.lensMaterial));this.renderFeed(renderer,0,true);return this.target;
  }
  renderFeed(renderer,time,force=false){if(!this.target||(!force&&time-this.lastFeed<.1))return;this.lastFeed=time;const prev=renderer.getRenderTarget(),tone=renderer.toneMapping;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setRenderTarget(this.raw);renderer.render(this.feedScene,this.camera);this.lensMaterial.uniforms.clean.value=this.cleanliness;this.lensMaterial.uniforms.time.value=time;renderer.setRenderTarget(this.target);renderer.render(this.postScene,this.postCamera);renderer.setRenderTarget(prev);renderer.toneMapping=tone;}
}
