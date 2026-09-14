import * as THREE from '../vendor/three.module.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { SkeletalMotion } from './locomotion.js';
import { residentMaterial } from './resident-surface.js';
import { addResidentHead } from './resident-head.js';
import { addResidentClothes } from './resident-clothes.js';
import { addResidentBody } from './resident-body.js';
import { workGesture,conversationGesture } from './resident-activity.js';
import { fitHandFrame } from './hand-frame.js';

const templates=new Map();
const material=residentMaterial();
const V=(x,y,z)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;

// A reusable, fully skinned human mesh, with shaped garment profiles rather
// than disconnected primitive limbs. Vertex colour keeps each resident at
// one draw call; the source geometry and bind-pose rig can also export to GLB.
export function buildResidentModel(definition,{suit=false}={}){
  const a=definition.appearance||{},female=!!a.female,wide=(a.build||1)*(female?.92:1),bones=[],points={},byName={};
  const rig=(name,parent,x,y,z)=>{const b=new THREE.Bone();b.name=name;points[name]=V(x,y,z);b.position.copy(points[name]);if(parent)b.position.sub(points[parent]);(parent?byName[parent]:model).add(b);bones.push(b);byName[name]=b;return b;};
  const model=new THREE.Group();model.name=definition.name;
  // The ankle joint sat at 6.5% of standing height; a real one is near 4%, and
  // the difference came straight off the leg, which is what the gait swings.
  // The boot mesh is unmoved — it hangs off this bone either way — so the sole
  // still meets the floor, the leg is simply the length it should be.
  // Shoulder joints sat 47 cm apart, with a deltoid on top of that, so every
  // resident was 65 cm across the shoulders on a 1.78 m frame — half a metre
  // is the real figure. Arms hung clear of the ribs instead of resting on
  // them, and the feet were planted 21 cm apart. All three read as a toy.
  rig('Hips',null,0,.91,0);rig('Spine','Hips',0,1.08,0);rig('Chest','Spine',0,1.31,0);rig('Neck','Chest',0,1.49,0);rig('Head','Neck',0,1.63,0);
  for(const [s,sign] of [['L',1],['R',-1]]){
    rig('UpperArm'+s,'Chest',sign*.178*wide,1.405,0);rig('Forearm'+s,'UpperArm'+s,sign*.196*wide,1.118,.011);rig('Hand'+s,'Forearm'+s,sign*.208*wide,.868,.017);
    rig('Fingers'+s,'Hand'+s,sign*.208*wide,.793,.02);rig('FingerTips'+s,'Fingers'+s,sign*.208*wide,.755,.025);
    rig('Thigh'+s,'Hips',sign*.092*wide,.90,0);rig('Shin'+s,'Thigh'+s,sign*.095*wide,.50,.012);rig('Foot'+s,'Shin'+s,sign*.095*wide,.080,.018);rig('Toe'+s,'Foot'+s,sign*.095*wide,.07,.155);rig('Coat'+s,'Hips',sign*.118,.85,-.04);
  }
  const positions=[],normals=[],colors=[],skinUVs=[],surfaces=[],weights=[],joints=[],indices=[],skin=new THREE.Color(a.skin??0xb79476),coat=new THREE.Color(suit?0xd4d0b6:a.coat??0x66715f),hair=new THREE.Color(a.hair??0x44352b),dark=new THREE.Color(0x242923),shirt=new THREE.Color(a.shirt??0xa29981);let helmetRange=null,visorRange=null;
  const binding=(b,b2=null,w=1)=>[bones.indexOf(byName[b]),bones.indexOf(byName[b2||b]),clamp(w,0,1)];
  const torso=y=>y<1.08?binding('Hips','Spine',clamp((1.13-y)/.15,0,1)):binding('Spine','Chest',clamp((1.34-y)/.25,0,1));
  // `paint` colours a surface per vertex from its own position, which is how
  // brows, lashes, lips and stubble reach the face without being objects laid
  // on it. A colour may also carry its own finish, for the eyes.
  const add=(geometry,color,bind,transform=null,cloth=false,paint=null,fallback=null)=>{
    if(transform)geometry.applyMatrix4(transform);const p=geometry.attributes.position,n=geometry.attributes.normal,start=positions.length/3;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),[b,c,w]=typeof bind==='function'?bind(y,x,z,i):binding(bind);
      const uv=geometry.attributes.skinUV;skinUVs.push(uv?uv.getX(i):0,uv?uv.getY(i):0,uv?uv.getZ(i):0);
      positions.push(x,y,z);normals.push(n.getX(i),n.getY(i),n.getZ(i));
      if(geometry.attributes.attachmentSkinIndex){for(let k=0;k<4;k++){joints.push(geometry.attributes.attachmentSkinIndex.array[i*4+k]);weights.push(geometry.attributes.attachmentSkinWeight.array[i*4+k]);}}
      else{joints.push(b,c,0,0);weights.push(w,1-w,0,0);}
      const painted=paint?paint(x,y,z,i):null,tone=painted?.color||(fallback&&!geometry.attributes.skinUV?.getZ(i)?fallback:color),finish=painted?.surface||tone.residentSurface;
      const shade=painted?1:cloth?.96+.021*Math.sin(y*85+x*44)+.019*Math.sin(z*31+y*11):tone===skin?.97+.025*Math.cos(y*11+x*24)+.010*Math.sin(x*47+y*31):1;
      colors.push(tone.r*shade,tone.g*shade,tone.b*shade);
      const skinPart=painted||tone===skin||tone.skinSurface,hairPart=tone===hair||tone.hairSurface,leather=tone===dark;
      if(finish)surfaces.push(finish[0],finish[1]||0,finish[2]||0,finish[3]||0);
      else surfaces.push(skinPart?.51:hairPart?.9:leather?.59:.84,0,skinPart?1:0,skinPart||hairPart||leather?0:1);
    }
    if(geometry.index)for(const i of geometry.index.array)indices.push(start+i);else for(let i=0;i<p.count;i++)indices.push(start+i);geometry.dispose();
  };
  const ell=(x,y,z,rx,ry,rz,color,b,segments=16)=>{const g=new THREE.SphereGeometry(1,segments,12);g.scale(rx,ry,rz);g.translate(x,y,z);add(g,color,b);};
  const box=(x,y,z,w,h,d,color,b,rz=0)=>{const g=new THREE.BoxGeometry(w,h,d,1,1,1);g.rotateZ(rz);g.translate(x,y,z);add(g,color,b,null,true);};
  const tube=(from,to,r0,r1,color,b,segments=12)=>{const delta=to.clone().sub(from),g=new THREE.CylinderGeometry(r1,r0,delta.length(),segments,typeof b==='string'&&/^(Head|Foot|Hand)/.test(b)?1:5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),delta.clone().normalize()));g.translate(...from.clone().addScaledVector(delta,.5).toArray());add(g,color,b,null,true);};
  const torus=(x,y,z,r,t,color,b,rx=0,sx=1,sz=1)=>{const g=new THREE.TorusGeometry(r,t,5,24);g.rotateX(rx);g.scale(sx,1,sz);g.translate(x,y,z);add(g,color,b);};
  const surface=addResidentBody({a,wide,suit,coat,skin,dark,add,binding});
  for(const [s,sign] of [['L',1],['R',-1]]){
    const hip=points['Thigh'+s],knee=points['Shin'+s],ankle=points['Foot'+s],upper=points['UpperArm'+s],elbow=points['Forearm'+s],hand=points['Hand'+s];
    const legSkin=y=>y>.53?binding('Thigh'+s,'Shin'+s,clamp((y-.45)/.13,0,1)):binding('Shin'+s,'Foot'+s,clamp((y-.10)/.13,0,1));
    const pants=suit?coat:coat.clone().multiplyScalar(.64);
    ell(ankle.x,.07,.063,.059,.064,.140,dark,'Foot'+s);box(ankle.x,.023,.055,.116,.028,.262,dark,'Foot'+s);
    if(!suit){for(let row=0;row<5;row++){const y=.095+row*.013,z=.14-row*.023;tube(V(ankle.x-.025,y,z),V(ankle.x+.025,y+.005,z-.012),.0025,.0025,shirt,'Foot'+s,6);}for(const side of [-1,1])tube(V(ankle.x+side*.052,.04,-.025),V(ankle.x+side*.048,.041,.16),.002,.002,coat,'Foot'+s,6);}
    if(suit){for(const y of [.2,.24])torus(ankle.x,y,0,.053,.012,dark,'Shin'+s,Math.PI/2,1,1);}
    if(suit)torus(hand.x,.898,.015,.035,.0035,dark,'Forearm'+s,Math.PI/2);
  }
  addResidentHead({a,skin,hair,dark,add,binding,ell,box,tube});
  if(suit){
    // A cleaning helmet, not a dome. The old one was a bare pale ellipsoid with
    // a black lens filling its whole front, which from any distance reads as a
    // large bald head — which is what it looked like walking up to the sensor.
    // This one is a shell with a hard brow, a horizontal faceplate set into a
    // recessed band, a locking neck ring, side fittings and a lamp: none of it
    // reads as a head, and the man inside is behind an opaque plate.
    // Seen from the sensor, which stands above a cleaner's head, what you get
    // is the crown. A pale sphere the size of a skull, in the same cream as the
    // suit, reads from up there as a bare head — which is what it looked like
    // walking up to the lens. So: a shell in its own harder grey, wider than a
    // head and flattened on top, a dark faceplate carried up over the front of
    // the crown where the camera can see it, and a ridge down the middle.
    const start=indices.length,HY=1.628,hard=new THREE.Color(0xbcbdb0);
    ell(0,HY,-.006,.164,.170,.166,hard,'Head',26);
    ell(0,HY+.104,-.012,.146,.062,.146,hard.clone().multiplyScalar(.90),'Head',22);   // flattened crown
    box(0,HY+.118,-.010,.036,.036,.230,hard.clone().multiplyScalar(.80),'Head');      // crest
    box(0,HY+.070,.104,.250,.058,.082,dark,'Head');                                   // brow bar
    // The faceplate sits in a recess and reaches up onto the crown, so it is in
    // shot from above as well as head on.
    ell(0,HY+.012,.108,.126,.104,.088,dark,'Head',26);
    const visorStart=indices.length;ell(0,HY+.014,.122,.112,.086,.078,new THREE.Color(0x252b2d),'Head',30);visorRange=[visorStart,indices.length-visorStart];
    for(const sign of [-1,1]){
      ell(sign*.152,HY-.014,.026,.030,.056,.052,hard.clone().multiplyScalar(.86),'Head',12); // ear cups
      ell(sign*.166,HY-.014,.026,.014,.028,.026,dark,'Head',10);
      box(sign*.096,HY+.030,.104,.020,.130,.030,dark,'Head');                                 // plate clamps
    }
    ell(.106,HY+.096,.070,.028,.026,.036,new THREE.Color(0xd8d2b4),'Head',12);               // lamp
    torus(0,HY-.148,.002,.126,.022,dark,'Head',Math.PI/2,1,.94);                             // neck ring
    torus(0,1.470,0,.100,.028,dark,'Neck',Math.PI/2,1,.88);                                   // collar seal
    helmetRange=[start,indices.length-start];
    box(0,1.19,-.156,.26,.40,.15,dark,'Chest');box(0,1.20,-.238,.232,.32,.065,coat,'Chest');
    for(const sign of [-1,1]){box(sign*.115,1.19,.151,.04,.46,.023,dark,torso);box(sign*.092,1.085,.172,.065,.045,.016,new THREE.Color(0xb29b62),torso);}
    // Air lines from the pack over each shoulder into the collar.
    for(const sign of [-1,1])for(let j=0;j<7;j++){const t=j/6,a=Math.PI*t;
      tube(V(sign*(.062+.052*Math.sin(a)),1.34+.10*Math.sin(a*.9),-.14+.28*t),V(sign*(.062+.052*Math.sin(a+.5)),1.34+.10*Math.sin((a+.5)*.9),-.14+.28*(t+1/6)),.016,.016,dark,'Chest',7);}
    torus(.18,1.22,-.03,.096,.019,dark,'Chest',0,.8,1);
  }else{
    addResidentClothes({a,wide,coat,shirt,dark,surface,add,binding});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setIndex(indices);
  geometry.setAttribute('skinUV',new THREE.Float32BufferAttribute(skinUVs,3));
  geometry.setAttribute('residentSurface',new THREE.Float32BufferAttribute(surfaces,4));
  geometry.computeBoundingBox();const factor=definition.height/geometry.boundingBox.max.y;geometry.scale(factor,factor,factor);for(const b of bones)b.position.multiplyScalar(factor);
  let finishes=material;
  if(helmetRange){geometry.addGroup(0,helmetRange[0],0);geometry.addGroup(helmetRange[0],visorRange[0]-helmetRange[0],1);geometry.addGroup(visorRange[0],visorRange[1],2);geometry.addGroup(visorRange[0]+visorRange[1],helmetRange[0]+helmetRange[1]-visorRange[0]-visorRange[1],1);geometry.addGroup(helmetRange[0]+helmetRange[1],indices.length-helmetRange[0]-helmetRange[1],0);
    finishes=[material,residentMaterial(),new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.22,metalness:.66,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.1,side:THREE.DoubleSide})];}
  const mesh=new THREE.SkinnedMesh(geometry,finishes);mesh.name=definition.id+(suit?'-cleaning-suit':'-resident');mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;model.add(mesh);model.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));geometry.computeBoundingSphere();
  // Every resident gets the same relaxed wrist alignment as the playable cast.
  model.userData.handFrames={};model.userData.armRetargeted=true;
  for(const side of ['L','R']){
    const hand=bones.indexOf(byName['Hand'+side]),cloud=[],p=geometry.attributes.position,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
    for(let i=0;i<p.count;i++)if((si.getX(i)===hand&&sw.getX(i)>.4)||(si.getY(i)===hand&&sw.getY(i)>.4))cloud.push(new THREE.Vector3().fromBufferAttribute(p,i));
    const direction=points['Hand'+side].clone().sub(points['Forearm'+side]).normalize();
    if(cloud.length>8)model.userData.handFrames[side]={quaternion:fitHandFrame(cloud,direction,side==='L'?1:-1).quaternion.toArray()};
  }
  return model;
}

export function createResident(definition,options={}){
  const key=definition.id+(options.suit?'-suit':'');if(options.cache!==false&&!templates.has(key))templates.set(key,buildResidentModel(definition,options));
  const root=new THREE.Group(),model=options.cache===false?buildResidentModel(definition,options):clone(templates.get(key));root.name=definition.name;root.add(model);model.userData.gaitStyle=definition.appearance?.age>.65?'measured':['sims','knox','amundsen'].includes(definition.id)?'security':'engineer';const motion=new SkeletalMotion(model,definition.height);
  return {definition,root,model,motion,time:0,pose:'idle',heading:0,ownsGeometry:options.cache===false};
}

export function poseResident(actor,pose,time,dt=0,speed=0){
  const m=actor.motion;
  // Idle decelerates through the same gait. Activities release old foot
  // anchors, so resuming a route cannot consume stale movement history.
  if(pose==='walk'||pose==='idle'){m.update(dt,{speed,position:actor.root.position,heading:actor.root.rotation.y,grounded:true,active:pose==='walk'||speed>.025,ground:actor.ground||null});return;}
  m.reset();m.neutral();m.time=time;m.rotate('Spine',Math.sin(time*1.8)*.006);m.rotate('Head',Math.sin(time*.53+actor.heading)*.026,new THREE.Vector3(0,1,0));
  for(const s of ['L','R'])m.rotate('Forearm'+s,-.16);
  if(pose==='sit'||pose==='read'){
    // Sit the pelvis on the seat itself, not a fraction of the sitter's height:
    // a tall person and a short one both put their backside at chair height.
    m.bones.Hips.position.y=.525;
    for(const s of ['L','R']){m.rotate('Thigh'+s,-Math.PI*.48);m.rotate('Shin'+s,Math.PI*.49);m.rotate('Foot'+s,-.03);m.rotate('UpperArm'+s,-.19);m.rotate('Forearm'+s,-1.28);m.rotate('Hand'+s,1.12);}
    m.rotate('Spine',.055);m.rotate('Head',.07);
  }else if(pose==='work'){workGesture(m,actor.record?.workday?.tool||'spanner',time);}
  else if(pose==='talk'){conversationGesture(m,time);}
  else if(pose==='watch'){m.rotate('Head',-.04);}
  actor.model.updateWorldMatrix(true,true);
}

export function disposeResident(actor){actor.root.removeFromParent();actor.model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.dispose();if(actor.ownsGeometry)o.geometry.dispose();}});}
