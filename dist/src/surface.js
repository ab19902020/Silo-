import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign } from './kit.js';
import { SILO, levelY } from './data.js';
import { ExteriorSky } from './sky.js';
import { projectMaterial } from './materials.js';
import { buildExteriorNetwork } from './exterior-network.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
export const topPoint=(x,y,z)=>new THREE.Vector3(SILO.deckOuter+z,levelY(1)+y,-x);
export const topLocal=p=>({x:-p.z,y:p.y-levelY(1),z:p.x-SILO.deckOuter});
export const rampY=z=>THREE.MathUtils.clamp((z-64)/44,0,1)*14;
export const inRampPassage=(x,z)=>x>23&&x<29&&z>=64&&z<108;
export const inRampCutout=(x,z)=>inRampPassage(x,z)&&z>=94;
// Silo 18 stands at the centre of a crater. The floor is flat for the first
// thirty metres, then the ground climbs away on every bearing and never comes
// back down: from anywhere on that floor the crest ring is the horizon, so
// there is nothing beyond the hill to see. The near shoulder is the rise
// Holston walks up; the far crest, at a quarter of a kilometre, closes the sky.
const rise=(a,b,r)=>{const t=THREE.MathUtils.clamp((r-a)/(b-a),0,1);return t*t*(3-2*t);};
export function groundY(x,z){
  const r=Math.hypot(x-26,z-108),bearing=Math.atan2(z-108,x-26);
  // Floor, near shoulder, the long climb, and then a crest that falls away
  // behind it. The ground used to climb forever, which reads as the inside of
  // a bowl but never as a rim: nothing stands against the sky. A crest that
  // drops on its far side is a ridge line, and a ridge line 44 m up at 230 m
  // out sits ten degrees above the exit — the horizon, on every bearing.
  const bowl=10*rise(30,84,r)+34*rise(84,232,r)-11*rise(232,420,r)-5*rise(420,900,r);
  // The rim is a ring of hills, not a cone: peaks and saddles run round it, and
  // the fog takes the far side, so the eye reads a landform rather than a wall.
  const crest=(Math.sin(bearing*2+2.4)*7.5+Math.sin(bearing*3+.7)*5.4+Math.sin(bearing*5-1.9)*3.1+Math.sin(bearing*8+.3)*1.6)*rise(110,220,r)*(1-rise(430,780,r));
  // Long, shallow folds across the slope, on wavelengths the 16 m outer terrain
  // tiles can still carry. They fade out past the fog, where nothing reads them.
  const ridges=(Math.sin(x*.0175+z*.0132)*1.5+Math.cos(z*.0231-x*.0163)*1.15)*rise(34,150,r)*(1-rise(360,760,r))
    +(Math.sin(bearing*11+1.1)*1.5+Math.sin(bearing*17-.4)*.9)*rise(46,150,r)*(1-rise(300,620,r));
  const detail=(Math.sin(x*.069+z*.022)*.75+Math.cos(z*.087-x*.031)*.52+Math.sin(x*.43+z*.24)*.15)*Math.min(1,Math.max(0,(z-111)/18));
  const entrance=Math.min(1,Math.hypot(x-26,z-108)/24);
  return 14+(bowl+crest+ridges+detail)*entrance;
}
// Broad tonal drift across the ground, brightening with height so the far
// crest hazes into the sky. The wavelengths are long on purpose: the terrain
// samples every four metres, and the first pass shaded on a ten metre sine,
// so what reached the screen was the aliasing rather than the shading.
const terrainShade=(x,y,z)=>.70+.105*Math.sin(x*.031+z*.023)+.062*Math.cos(z*.047-x*.038)+.038*Math.sin(z*.0121+x*.0094)+(y-14)*.0058;

// Height of the walking surface: inside the open part of the ramp cutout that
// is the incline itself, everywhere else it is the terrain. The cleaners walk
// on rails rather than through the collider, so they need this directly.
export const surfaceY=(x,z)=>inRampCutout(x,z)?rampY(z):groundY(x,z);

// The lens is behind and alongside the sunken exit, looking outwards. A
// cleaner climbs away from it and must turn back around the curb to clean.
// The sensor stands beside the mouth of the ramp, looking out across the crater
// at the hill.
//
// It was on the left of the exit at x=20.5, which is what put the silo off to
// one side of the exterior view. It is on the right now, mirrored across the
// ramp's centreline so the walk out to it is the same length it always was.
//
// It cannot go on the centreline itself. The centreline over the exit is the
// open cutting, so the only spot on it is past the lip — and that is in the
// cleaner's path. From there they walk towards the lens from the moment they
// emerge, which inverts the walk this build already fixed once: they come up
// with their back to the camera and turn to face it. There is a test on that.
export const SENSOR=Object.freeze({x:31.5,z:99,eye:1.85});
export const TREE=Object.freeze({x:-5,z:155});
export const sensorLocal=()=>new THREE.Vector3(SENSOR.x,groundY(SENSOR.x,SENSOR.z)+SENSOR.eye,SENSOR.z+.95);

export class SurfaceWorld {
  constructor(m){
    this.root=new THREE.Group();this.root.position.set(SILO.deckOuter,levelY(1),0);this.root.rotation.y=Math.PI/2;
    this.solids=[];this.cleanliness=.28;this.cleaning=false;this.cleanTime=0;this.lastFeed=-100;this.m=m;
    // The open end of the ramp is built into its own group. The sensor looks
    // straight over it, so it has to appear in the cafeteria panorama as well
    // as in the exterior: a cleaner climbs out of this hole in full view, and
    // the picture used to patch it over with flat ground so they simply
    // materialised. `near` decides which side of that line each piece lands on.
    const k=new Kit(m),mouth=new Kit(m),rng=random(180018);
    const near=z=>z>=90,pick=z=>near(z)?mouth:k;
    const box=(mat,x,y,z,w,h,d,solid=false)=>{pick(z).box(mat,x,y,z,w,h,d);if(solid)this.solids.push({x,z,w,d,y0:y-h/2,y1:y+h/2});};
    const mouthRoot=new THREE.Group();mouthRoot.name='ramp-mouth';this.root.add(mouthRoot);
    // Real inclined slab, with a matching analytic collision surface.
    const vertices=[23,0,64,29,0,64,29,14,108,23,14,108],g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,2,0,2,18,0,18],2));g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();const slab=new THREE.Mesh(g,m.concrete);slab.receiveShadow=true;mouthRoot.add(slab);
    for(let z=64;z<108;z+=2){
      const y=rampY(z+1);for(const x of [22.75,29.25]){const bottom=y-.35,top=Math.min(y+5.15,14.5);box('concrete',x,(bottom+top)/2,z+1,.5,top-bottom,2.03,true);pick(z+1).box('darkMetal',x<26?23.05:28.95,y+.16,z+1,.075,.08,2.03);}
      if(z<94){box('darkConcrete',26,y+4.95,z+1,6.8,.45,2.04);if(z%6===4){for(const x of [23.05,28.95]){box('darkMetal',x,y+2.5,z+.8,.12,.95,.45);box('coldLamp',x<26?23.13:28.87,y+2.5,z+.8,.04,.8,.19);}}}
      for(const x of [23.45,28.55])pick(z).box('yellow',x,rampY(z)+.022,z,.11,.025,.75);
    }
    // Trailer reference: slatted incline, chamfered tunnel shoulders, exposed
    // transverse steel ribs, cyan wall strips and small ceiling indicators.
    for(let z=64.2;z<108;z+=.24)pick(z).box('metal',26,rampY(z)+.014,z,5.55,.018,.045);
    for(let z=65;z<95;z+=2){const y=rampY(z),r=pick(z);for(const side of [-1,1]){const x=26+side*2.93;r.beam('darkMetal',[x,y+.1,z],[x,y+3.15,z],.065);r.beam('darkMetal',[x,y+3.15,z],[26+side*1.9,y+4.72,z],.065);r.box('metal',26+side*2.43,y+3.94,z,1.9,.08,1.91,0,0,-side*.99);for(let j=0;j<8;j++)r.box('darkMetal',x,y+.5+j*.28,z,.025,.035,1.75);}r.beam('darkMetal',[24.1,y+4.72,z],[27.9,y+4.72,z],.065);if(z%6===5)r.box('redLamp',26,y+4.69,z,.12,.035,.12);}
    // The exit is sunken, edged by a low rounded curb. Its reinforced hatch
    // leaves stand open to each side; there is no tall above-ground doorway.
    for(const x of [22.35,29.65])mouth.bevel('concrete',x,14.27,101.5,.75,.55,15);
    // Split curb leaves the walking route open at the ramp lip.
    for(const x of [22.7,29.3])mouth.bevel('concrete',x,14.28,108.6,1.4,.56,.85);
    for(const side of [-1,1]){const hatch=new THREE.Group(),hk=new Kit(m);hk.bevel('metal',side*1.7,0,0,3.35,.17,12.4);for(let j=0;j<9;j++){const z=-5.5+j*1.4;hk.beam('darkMetal',[side*.15,.13,0],[side*3.2,.13,z],.046);}hatch.add(hk.group());hatch.position.set(26+side*3.25,14.45,101.8);hatch.rotation.z=-side*.35;mouthRoot.add(hatch);}
    mouthRoot.add(mouth.group());
    // A low camera plinth behind the exit; its housing never enters its own feed.
    const {x:sx,z:sz}=SENSOR,base=groundY(sx,sz),sensor=new Kit(m);
    sensor.bevel('concrete',sx,base+.09,sz,2.45,.18,2.05);
    sensor.bevel('concrete',sx,base+1.2,sz-.25,1.8,2.4,.65);
    sensor.bevel('concrete',sx,base+2.5,sz,2.4,.25,1.8);
    for(const side of [-1,1]){sensor.beam('concrete',[sx+side*.98,base+.2,sz+.66],[sx+side*.78,base+2.4,sz-.35],.26);}
    sensor.bevel('metal',sx,base+1.85,sz+.3,1.16,.64,.75);
    sensor.cylinder('darkMetal',sx,base+1.85,sz+.73,.26,.15,Math.PI/2);sensor.cylinder('glass',sx,base+1.85,sz+.83,.2,.035,Math.PI/2);sensor.torus('brass',sx,base+1.85,sz+.855,.235,.025);
    const sensorRoot=sensor.group();sensorRoot.name='exterior-sensor-housing';this.root.add(sensorRoot);
    this.solids.push({x:sx,z:sz-.3,w:2.2,d:1.3,y0:base,y1:base+2.65});
    this.lensDirt=new THREE.MeshBasicMaterial({color:0x81775b,transparent:true,opacity:.48,depthWrite:false,side:THREE.DoubleSide});const dirt=new THREE.Mesh(new THREE.CircleGeometry(.2,32),this.lensDirt);dirt.position.set(sx,base+1.85,sz+.88);this.root.add(dirt);
    this.sensorPoint=topPoint(...sensorLocal().toArray());
    addSign(this.root,'18',[sx,base+.6,sz+.12],.65,.48,0,{background:'#77796e',color:'#252c27',font:'bold 180px Arial',border:false});
    // Hatch boundaries are actual grid edges; no triangle bridges the opening.
    this.groundMaterial=m.rock.clone();this.groundMaterial.color.setHex(0x7f7869);this.groundMaterial.vertexColors=true;this.groundMaterial.normalScale.set(.42,.42);projectMaterial(this.groundMaterial,3.2);
    this.terrainTiles=new Map();this.tileKey='';this.streamTerrain({x:26,z:140});this.ground=this.terrainTiles.get('0,0');
    // Angular scree with uneven silhouette, never a field of smooth spheres.
    const rockGeo=new THREE.IcosahedronGeometry(1,1),rp=rockGeo.attributes.position;for(let i=0;i<rp.count;i++){const v=new THREE.Vector3().fromBufferAttribute(rp,i).multiplyScalar(.78+rng()*.36);rp.setXYZ(i,v.x,v.y,v.z);}rockGeo.computeVertexNormals();
    const rocks=new Kit(m);for(let i=0;i<900;i++){const x=26+(rng()-.5)*760,z=140+(rng()-.5)*760;if(Math.abs(x-26)<8&&z<125)continue;const far=Math.hypot(x-26,z-108)/260;const size=(.15+Math.pow(rng(),4)*2.9)*(1+far*2.2);rocks.mesh(rockGeo,'rock',x,groundY(x,z)+size*.17,z,size,size*.4,size*.8,rng(),rng()*6,rng()*.3);}
    const scree=rocks.group();scree.name='surface-scree';this.root.add(scree);
    // The one dead tree on the crater slope. It was four dozen straight
    // untapered cylinders, each its own mesh and its own draw call, forking
    // twice into a Y. A dead tree is a trunk that thickens into its roots,
    // splits into a few heavy limbs and then divides again and again into
    // hundreds of thinning twigs, and none of it is straight. This grows one
    // from a seeded rule and merges the whole thing into a single mesh.
    const tx=TREE.x,tz=TREE.z,ty=groundY(tx,tz),trng=random(1553);
    this.treeMaterial=m.rock.clone();this.treeMaterial.color.setHex(0x7a7263);this.treeMaterial.roughness=.98;
    const limbs=[];
    const limb=(from,to,r1,r2,sides)=>{
      const v=to.clone().sub(from),g=new THREE.CylinderGeometry(r2,r1,v.length(),sides,1,true);
      g.translate(0,v.length()/2,0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize()));
      g.translate(from.x,from.y,from.z);limbs.push(g);
    };
    // Every limb bends as it goes, and forks into two or three thinner ones.
    const grow=(base,dir,length,radius,depth)=>{
      const sides=depth>3?9:depth>1?7:5,segments=depth>2?4:2;let point=base.clone(),heading=dir.clone().normalize(),r=radius;
      for(let i=0;i<segments;i++){
        const next=r*(depth>2?.86:.72),step=length/segments;
        const bend=new THREE.Vector3(trng()-.5,(trng()-.5)*.35,trng()-.5).multiplyScalar(.34/Math.max(1,depth-1));
        heading=heading.add(bend).normalize();
        const end=point.clone().addScaledVector(heading,step);
        limb(point,end,r,next,sides);point=end;r=next;
      }
      if(depth<=0)return;
      const forks=depth>3?3:trng()<.34?3:2;
      for(let f=0;f<forks;f++){
        const side=new THREE.Vector3(Math.cos(f*2.4+trng()*1.6),0,Math.sin(f*2.4+trng()*1.6));
        const away=heading.clone().addScaledVector(side,.55+trng()*.55).add(new THREE.Vector3(0,.12,0)).normalize();
        grow(point,away,length*(.58+trng()*.16),r*(.74+trng()*.12),depth-1);
      }
    };
    // A trunk that leans off the slope, with root spurs flaring into the ground.
    const lean=new THREE.Vector3(-.16,1,.10).normalize();
    grow(new THREE.Vector3(tx,ty-.4,tz),lean,5.6,.44,4);
    for(let i=0;i<7;i++){const a=i*Math.PI*2/7+trng()*.5,out=new THREE.Vector3(Math.cos(a),-1.5,Math.sin(a)).normalize();
      limb(new THREE.Vector3(tx,ty+.5,tz),new THREE.Vector3(tx,ty+.5,tz).addScaledVector(out,1.15),.30,.10,7);}
    const treeGeo=mergeGeometries(limbs,false);limbs.forEach(g=>g.dispose());
    const tree=new THREE.Mesh(treeGeo,this.treeMaterial);tree.name='dead-tree';tree.castShadow=true;tree.receiveShadow=true;tree.userData.ownedGeometry=true;this.root.add(tree);
    this.solids.push({x:tx,z:tz,w:1.1,d:1.1,y0:ty,y1:ty+7});
    // One tree, and only one. Nothing else grew back.
    // No city geometry: the exterior is a barren bowl.
    this.root.add(k.group());
    // Kept out of the cafeteria feed: the network is the revelation after the
    // player survives the ridge, not information Silo 18's sensor gives away.
    this.network=buildExteriorNetwork(m,groundY);this.network.root.visible=false;this.root.add(this.network.root);
    // Sparse moving dust is visible in both views without adding inhabitants.
    const dustGeo=new THREE.BufferGeometry(),dp=[];for(let i=0;i<180;i++)dp.push(26+(rng()-.5)*180,15+rng()*18,130+(rng()-.5)*160);dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(dp,3));this.dust=new THREE.Points(dustGeo,new THREE.PointsMaterial({color:0xbdb8a0,size:.035,transparent:true,opacity:.23,depthWrite:false}));this.dust.name='wind-dust';this.root.add(this.dust);
    this.feedScene=new THREE.Scene();this.feedScene.background=new THREE.Color(0x929fa3);this.feedScene.fog=new THREE.FogExp2(0x929fa3,.0029);this.feedRoot=new THREE.Group();this.feedRoot.position.copy(this.root.position);this.feedRoot.rotation.copy(this.root.rotation);
    // The sensor looks straight out over the hatch, so the hatch belongs in the
    // picture. It used to be patched over with a flat sheet of ground, which
    // meant a cleaner walked up the ramp and out of solid earth. The real mouth
    // is in the panorama now: they climb out of a hole, in view, from the
    // moment their helmet clears the lip.
    for(const child of this.root.children)if(['barren-ground','surface-scree','dead-tree','wind-dust','ramp-mouth'].includes(child.name)&&(child.name!=='barren-ground'||child===this.ground))this.feedRoot.add(child.clone(true));
    // Only the mouth of the ramp is in the panorama; the covered tunnel behind
    // it is closed off with an unlit plate. From out here in daylight that is
    // what the throat looks like anyway, and it stops the sensor seeing all
    // the way down an eighty metre tube to nothing.
    {const throat=new THREE.Mesh(new THREE.PlaneGeometry(6.9,5.6),new THREE.MeshBasicMaterial({color:0x15181a}));throat.position.set(26,rampY(89.5)+2.5,89.5);throat.name='ramp-mouth';throat.userData.ownedGeometry=throat.userData.ownedMaterial=true;this.feedRoot.add(throat);}
    this.feedDust=this.feedRoot.getObjectByName('wind-dust');this.feedAmbient=new THREE.HemisphereLight(0xdddcd0,0x79705c,2);this.feedSun=new THREE.DirectionalLight(0xf3e6ce,2.2);this.feedSun.position.copy(topPoint(-20,100,200));this.feedScene.add(this.feedRoot,this.feedAmbient,this.feedSun);
    this.camera=new THREE.PerspectiveCamera(24,30/6.8,.02,2500);this.camera.position.copy(this.sensorPoint);
    const eye=sensorLocal();this.camera.lookAt(topPoint(eye.x,eye.y+Math.tan(5*Math.PI/180)*180,eye.z+180));
    this.sky=new ExteriorSky();this.sky.mesh.position.copy(eye);this.root.add(this.sky.mesh);this.sky.feed.position.copy(this.sensorPoint);this.feedScene.add(this.sky.feed);

  }
  terrainGeometry(ix,iz){
    const size=800,step=ix===0&&iz===0?4:16,cx=26+ix*size,cz=140+iz*size;
    const axis=(center,extra)=>[...new Set([...Array.from({length:size/step+1},(_,i)=>center-size/2+i*step),...extra.filter(v=>v>center-size/2&&v<center+size/2)])].sort((a,b)=>a-b);
    const xs=axis(cx,[23,29]),zs=axis(cz,[94,108]),pos=[],colors=[],uv=[],indices=[];
    for(const z of zs)for(const x of xs){const y=groundY(x,z),shade=terrainShade(x,y,z);pos.push(x,y,z);colors.push(shade,shade*.99,shade*.96);uv.push(x/1.8,z/1.8);}
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
  refreshMaterials(){const bark=this.treeMaterial;bark.map=this.m.rock.map;bark.normalMap=this.m.rock.normalMap;bark.roughnessMap=this.m.rock.roughnessMap;bark.normalScale.set(.9,.9);projectMaterial(bark,1.1);const mat=this.groundMaterial;mat.map=this.m.rock.map;mat.normalMap=this.m.rock.normalMap;mat.roughnessMap=this.m.rock.roughnessMap;mat.roughness=.96;mat.normalScale.set(.42,.42);projectMaterial(mat,3.2);}
  setNetworkVisible(visible){this.network.root.visible=!!visible;}
  get networkInteractions(){
    if(!this.network.root.visible)return [];
    return this.network.interactions.map(i=>({...i,position:topPoint(i.position[0],i.position[1],i.position[2])}));
  }
  floorAt(x,z,radius,maxHeight){
    const p=topLocal({x,y:maxHeight,z}),terrain=levelY(1)+groundY(p.x,p.z);
    if(inRampPassage(p.x,p.z)&&(inRampCutout(p.x,p.z)||maxHeight<terrain-.001)){const y=levelY(1)+rampY(p.z);return y<=maxHeight+.001?y:0;}
    const crown=this.network?.root.visible?this.network.floorAt(p.x,p.z,p.y):-Infinity;return Math.max(terrain<=maxHeight+.001?terrain:0,Number.isFinite(crown)?levelY(1)+crown:0);
  }
  setQuality(quality){
    this.quality=quality;if(!this.raw)return;const width=quality==='high'?1920:quality==='low'?1024:1536,height=Math.round(width*6.8/30),samples=Math.min(this.maxSamples||0,quality==='high'?4:quality==='low'?0:2);
    if(this.raw.samples!==samples){this.raw.samples=samples;this.raw.dispose();}this.raw.setSize(width,height);this.target.setSize(width,height);this.lastFeed=-100;
  }
  setTimeOfDay(mode){this.sky.setMode(mode);this.lastFeed=-100;}
  beginCleaning(){this.cleaning=true;this.cleanTime=(this.cleanliness-.28)/.72*4;}
  update(dt){this.sky.update(dt);this.feedAmbient.intensity=THREE.MathUtils.lerp(.16,2,this.sky.daylight);this.feedSun.intensity=THREE.MathUtils.lerp(.12,2.2,this.sky.daylight);this.feedScene.fog.color.copy(this.sky.fogColor);if(this.cleaning){this.cleanTime+=dt;this.cleanliness=Math.min(1,.28+this.cleanTime/4*.72);if(this.cleanTime>=4)this.cleaning=false;}this.lensDirt.opacity=(1-this.cleanliness)*.67;this.dust.position.x=(this.dust.position.x+dt*.6)%8;this.feedDust.position.x=this.dust.position.x;}
  get cleaningPoint(){return this.sensorPoint.clone();}
  initFeed(renderer){
    this.raw=new THREE.WebGLRenderTarget(1280,290,{type:renderer.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType});this.target=new THREE.WebGLRenderTarget(1280,290,{type:this.raw.texture.type});this.maxSamples=renderer.capabilities.maxSamples;this.setQuality(this.quality||'balanced');
    this.postScene=new THREE.Scene();this.postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    // Years of dust on the outside of the glass do three things, and the old
    // pass only did one of them. It tints — but it also scatters, so the
    // picture goes soft, and it absorbs, so the picture goes dark and grey.
    // Before Holston wipes it you can just make out that there is a world out
    // there; the whole point of the clean is that it opens up.
    this.lensMaterial=new THREE.ShaderMaterial({uniforms:{source:{value:this.raw.texture},clean:{value:this.cleanliness},time:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
      uniform sampler2D source;uniform float clean,time;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){
        float grime=1.-clean;
        // Six taps on a widening ring: a cheap, stable blur whose radius is
        // the difference between "outside" and "outside, through the dirt".
        vec2 spread=vec2(.0085,.036)*grime;
        vec3 c=texture2D(source,vUv).rgb*.34;
        for(int i=0;i<6;i++){float a=float(i)*1.0471976;c+=texture2D(source,vUv+vec2(cos(a),sin(a))*spread).rgb*.11;}
        // Grime is not a mosaic. Hashing whole cells drew a 70 x 22 chequer over
        // the whole picture; these are interpolated so the dirt has shape.
        vec2 g0=vUv*vec2(46.,15.),g1=vUv*vec2(155.,44.)+31.;
        float soil=smoothstep(.16,.90,noise(g0)*.68+noise(g0*2.7+7.)*.32);
        float fine=smoothstep(.30,.95,noise(g1));
        float streak=smoothstep(.35,.95,noise(vec2(vUv.x*9.,vUv.y*130.)));
        float edge=smoothstep(.10,.62,length((vUv-.5)*vec2(.65,1.)));
        // The clean sweeps left to right across the glass as the count rises,
        // with a ragged edge where the cloth has and has not reached.
        float wipe=smoothstep(clean-.16,clean+.09,vUv.x+(noise(vec2(vUv.y*26.,3.))-.5)*.05);
        float dirt=grime*(.14+soil*.30+fine*.11+streak*.09+edge*.38)*(.50+wipe*.50);
        c=mix(c,vec3(.27,.23,.16),clamp(dirt,0.,.90));
        c*=1.-grime*.42*(.55+edge*.45);
        c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,1.-grime*.55);
        c*=.975+.025*sin(vUv.y*1450.);
        gl_FragColor=vec4(c,1.);
      }`,depthTest:false,depthWrite:false});this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.lensMaterial));this.renderFeed(renderer,0,true);return this.target;
  }
  renderFeed(renderer,time,force=false){if(!this.target||(!force&&time-this.lastFeed<(this.storyActive?1/30:.1)))return;this.lastFeed=time;const prev=renderer.getRenderTarget(),tone=renderer.toneMapping;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setRenderTarget(this.raw);renderer.render(this.feedScene,this.camera);this.lensMaterial.uniforms.clean.value=this.cleanliness;this.lensMaterial.uniforms.time.value=time;renderer.setRenderTarget(this.target);renderer.render(this.postScene,this.postCamera);renderer.setRenderTarget(prev);renderer.toneMapping=tone;}
}
