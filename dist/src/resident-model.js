import * as THREE from '../vendor/three.module.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { SkeletalMotion } from './locomotion.js';

const templates=new Map();
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.79,metalness:.025,side:THREE.DoubleSide});
const V=(x,y,z)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;

// A reusable, fully skinned human mesh, with shaped garment profiles rather
// than disconnected primitive limbs. Vertex colour keeps each resident at
// one draw call; the source geometry and bind-pose rig can also export to GLB.
export function buildResidentModel(definition,{suit=false}={}){
  const a=definition.appearance||{},female=!!a.female,wide=(a.build||1)*(female?.92:1),bones=[],points={},byName={};
  const rig=(name,parent,x,y,z)=>{const b=new THREE.Bone();b.name=name;points[name]=V(x,y,z);b.position.copy(points[name]);if(parent)b.position.sub(points[parent]);(parent?byName[parent]:model).add(b);bones.push(b);byName[name]=b;return b;};
  const model=new THREE.Group();model.name=definition.name;
  rig('Hips',null,0,.91,0);rig('Spine','Hips',0,1.08,0);rig('Chest','Spine',0,1.31,0);rig('Neck','Chest',0,1.49,0);rig('Head','Neck',0,1.63,0);
  for(const [s,sign] of [['L',1],['R',-1]]){
    rig('UpperArm'+s,'Chest',sign*.235*wide,1.39,0);rig('Forearm'+s,'UpperArm'+s,sign*.29*wide,1.115,.01);rig('Hand'+s,'Forearm'+s,sign*.31*wide,.865,.015);
    rig('Thigh'+s,'Hips',sign*.105*wide,.90,0);rig('Shin'+s,'Thigh'+s,sign*.108*wide,.50,.012);rig('Foot'+s,'Shin'+s,sign*.108*wide,.115,.018);rig('Toe'+s,'Foot'+s,sign*.108*wide,.07,.155);rig('Coat'+s,'Hips',sign*.13,.85,-.04);
  }
  const positions=[],normals=[],colors=[],weights=[],joints=[],indices=[],skin=new THREE.Color(a.skin??0xb79476),coat=new THREE.Color(suit?0xd4d0b6:a.coat??0x66715f),hair=new THREE.Color(a.hair??0x44352b),dark=new THREE.Color(0x242923),shirt=new THREE.Color(a.shirt??0xa29981);let helmetRange=null;
  const binding=(b,b2=null,w=1)=>[bones.indexOf(byName[b]),bones.indexOf(byName[b2||b]),clamp(w,0,1)];
  const torso=y=>y<1.08?binding('Hips','Spine',clamp((1.13-y)/.15,0,1)):binding('Spine','Chest',clamp((1.34-y)/.25,0,1));
  const add=(geometry,color,bind,transform=null,cloth=false)=>{
    if(transform)geometry.applyMatrix4(transform);const p=geometry.attributes.position,n=geometry.attributes.normal,start=positions.length/3;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),[b,c,w]=typeof bind==='function'?bind(y,x,z):binding(bind);
      positions.push(x,y,z);normals.push(n.getX(i),n.getY(i),n.getZ(i));joints.push(b,c,0,0);weights.push(w,1-w,0,0);
      const shade=cloth?.91+.045*Math.sin(y*85+x*44)+.045*Math.sin(z*31+y*11):1;
      colors.push(color.r*shade,color.g*shade,color.b*shade);
    }
    if(geometry.index)for(const i of geometry.index.array)indices.push(start+i);else for(let i=0;i<p.count;i++)indices.push(start+i);geometry.dispose();
  };
  const ell=(x,y,z,rx,ry,rz,color,b,segments=16)=>{const g=new THREE.SphereGeometry(1,segments,12);g.scale(rx,ry,rz);g.translate(x,y,z);add(g,color,b);};
  const box=(x,y,z,w,h,d,color,b,rz=0)=>{const g=new THREE.BoxGeometry(w,h,d,1,1,1);g.rotateZ(rz);g.translate(x,y,z);add(g,color,b,null,true);};
  const tube=(from,to,r0,r1,color,b,segments=12)=>{const delta=to.clone().sub(from),g=new THREE.CylinderGeometry(r1,r0,delta.length(),segments,5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),delta.clone().normalize()));g.translate(...from.clone().addScaledVector(delta,.5).toArray());add(g,color,b,null,true);};
  const torus=(x,y,z,r,t,color,b,rx=0,sx=1,sz=1)=>{const g=new THREE.TorusGeometry(r,t,5,24);g.rotateX(rx);g.scale(sx,1,sz);g.translate(x,y,z);add(g,color,b);};
  const profile=[[.83,.16],[.9,.185],[1.0,.17],[1.14,female?.155:.19],[1.29,.22],[1.37,.215],[1.44,.13],[1.47,.07]];
  const torsoGeo=new THREE.LatheGeometry(profile.map(([y,r])=>new THREE.Vector2(r*wide,y)),24);torsoGeo.scale(1,1,.64);add(torsoGeo,coat,torso,null,true);
  ell(0,.88,0,.18*wide,.105,.12,coat,'Hips');
  for(const [s,sign] of [['L',1],['R',-1]]){
    const hip=points['Thigh'+s],knee=points['Shin'+s],ankle=points['Foot'+s],upper=points['UpperArm'+s],elbow=points['Forearm'+s],hand=points['Hand'+s];
    const legSkin=y=>y>.53?binding('Thigh'+s,'Shin'+s,clamp((y-.45)/.13,0,1)):binding('Shin'+s,'Foot'+s,clamp((y-.10)/.13,0,1));
    const pants=suit?coat:coat.clone().multiplyScalar(.64);
    tube(ankle,knee,.059,.079,pants,legSkin);tube(knee,hip,.078,.10*wide,pants,legSkin);
    ell(knee.x,knee.y,knee.z,.078,.085,.079,pants,legSkin);
    ell(ankle.x,.07,.065,.074,.069,.147,dark,'Foot'+s);box(ankle.x,.024,.057,.142,.03,.267,dark,'Foot'+s);
    if(suit){for(const y of [.2,.24])torus(ankle.x,y,0,.063,.014,dark,'Shin'+s,Math.PI/2,1,1);}
    const armSkin=y=>y>1.1?binding('UpperArm'+s,'Forearm'+s,clamp((y-1.07)/.09,0,1)):binding('Forearm'+s,'Hand'+s,clamp((y-.85)/.09,0,1));
    tube(hand,elbow,.043,.058,a.shortSleeves&&!suit?skin:coat,armSkin);tube(elbow,upper,.058,.086*wide,coat,armSkin);ell(upper.x,upper.y,upper.z,.09*wide,.086,.08,coat,'UpperArm'+s);
    if(a.tattoo&&!suit)for(let i=0;i<5;i++)box(hand.x,1.04+i*.025,.066,.035,.004,.003,dark,'Forearm'+s,i%2?.6:-.6);
    const handColor=suit?dark:skin;ell(hand.x,.831,.018,.039,.061,.029,handColor,'Hand'+s);
    for(let f=0;f<4;f++){const xx=hand.x+(f-1.5)*.018,len=[.067,.076,.07,.055][f];tube(V(xx,.793,.02),V(xx,.793-len,.029),.0085,.0068,handColor,'Hand'+s,7);}
    tube(V(hand.x-sign*.027,.85,.034),V(hand.x-sign*.057,.799,.044),.013,.008,handColor,'Hand'+s,7);
    torus(hand.x,.898,.015,.046,.009,suit?dark:coat.clone().multiplyScalar(.7),'Forearm'+s,Math.PI/2);
    if(!suit){box(sign*.116*wide,1.273,.142,.095,.115,.015,coat.clone().multiplyScalar(.82),'Chest');box(sign*.116*wide,1.326,.154,.099,.012,.013,shirt,'Chest');}
    if(a.outfit==='work'||suit){box(hip.x,.70,.085,.12,.18,.014,coat.clone().multiplyScalar(.78),'Thigh'+s);}
  }
  ell(0,1.49,0,.059,.105,.055,skin,'Neck');
  const fw=(a.faceWidth||1)*(female?.96:1),age=a.age||0;
  ell(0,1.634,0,.102*fw,.131,.090,skin,'Head',24);
  ell(0,1.58,.023,.087*fw,.071,.075,skin,'Head',20);
  for(const sign of [-1,1]){
    ell(sign*.103*fw,1.631,-.005,.018,.032,.014,skin,'Head',10);
    ell(sign*.049*fw,1.643,.079,.031,.018,.014,skin.clone().multiplyScalar(.8),'Head',12);
    ell(sign*.046*fw,1.646,.088,.0205,.0095,.007,new THREE.Color(0xb4b0a3),'Head',12);
    ell(sign*.046*fw,1.646,.094,.007,.008,.004,new THREE.Color(0x454737),'Head',10);
    ell(sign*.046*fw,1.646,.097,.0035,.005,.002,dark,'Head',8);
    box(sign*.045*fw,1.666,.088,.045,.008,.009,hair,'Head',-sign*.1);
    ell(sign*.058,1.603,.073,.030,.026,.017,skin,'Head',12);
    if(age>.3)for(let i=0;i<2;i++)box(sign*.055,1.626-i*.009,.089,.034,.002,.002,skin.clone().multiplyScalar(.85),'Head',sign*.13);
  }
  ell(0,1.625,.091,.016,.033,.022,skin,'Head',12);ell(0,1.612,.111,.021,.011,.016,skin,'Head',12);
  ell(0,1.576,.087,.030,.009,.007,skin.clone().multiplyScalar(.69),'Head',16);box(0,1.576,.094,.045,.0018,.002,skin.clone().multiplyScalar(.48),'Head');
  ell(0,1.551,.070,.035,.018,.018,skin,'Head');
  if(a.beard){const g=new THREE.SphereGeometry(1,20,10,0,Math.PI*2,Math.PI*.40,Math.PI*.57);g.scale(.092, .061,.082);g.translate(0,1.596,.016);add(g,hair,'Head');}
  if(!a.bald){const g=new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI*.46);g.scale(.106*fw,.137,.094);g.translate(0,1.637,-.006);add(g,hair,'Head');}
  if(a.moustache)ell(0,1.592,.095,.032,.010,.009,hair,'Head');
  if(['waves','curls','long','bun','braids','longCurls','fringe'].includes(a.hairStyle)){
    const curls=['curls','longCurls'].includes(a.hairStyle),count=curls?32:18;
    for(let i=0;i<count;i++){const t=i*Math.PI*2/count;ell(Math.cos(t)*.091,1.682+Math.sin(i*2.4)*.019,-.020+Math.sin(t)*.071,curls?.027:.030,.042,.028,hair,'Head',8);}
    if(a.hairStyle==='long'||a.hairStyle==='waves'&&female){for(const sign of [-1,1])ell(sign*.09,1.574,-.026,.029,.105,.048,hair,'Head',12);ell(0,1.57,-.077,.082,.092,.025,hair,'Head');}
    if(a.hairStyle==='bun')ell(0,1.684,-.096,.052,.05,.046,hair,'Head');
    if(a.hairStyle==='fringe')for(let i=0;i<9;i++)ell((i-4)*.020,1.692,.070,.016,.044,.028,hair,'Head',8);
    if(a.hairStyle==='braids')for(const sign of [-1,1])for(let i=0;i<11;i++)ell(sign*(.101+Math.sin(i*1.6)*.008),1.60-i*.022,-.002,.019-i*.0008,.025,.025,hair,i<4?'Head':'Chest',8);
    if(a.hairStyle==='longCurls')for(const sign of [-1,1])for(let i=0;i<22;i++)ell(sign*(.100+(i%3)*.017),1.64-Math.floor(i/3)*.034,-.008+(i%3)*.004,.025,.027,.035,hair,i<9?'Head':'Chest',8);
  }
  if(a.glasses){for(const sign of [-1,1])torus(sign*.047,1.647,.1,.028,.0028,dark,'Head',0,1,.8);box(0,1.647,.101,.038,.003,.004,dark,'Head');}
  if(suit){
    const start=indices.length;
    ell(0,1.62,0,.18,.192,.155,coat,'Head',24);
    // Opaque reflective visor avoids sorting artefacts and hides the head.
    ell(0,1.631,.111,.142,.134,.069,new THREE.Color(0x555543),'Head',24);
    torus(0,1.473,0,.118,.035,dark,'Neck',Math.PI/2,1,.85);
    helmetRange=[start,indices.length-start];
    box(0,1.19,-.161,.30,.40,.16,dark,'Chest');box(0,1.20,-.25,.265,.32,.07,coat,'Chest');
    for(const sign of [-1,1]){box(sign*.115,1.19,.151,.04,.46,.023,dark,torso);box(sign*.092,1.085,.172,.065,.045,.016,new THREE.Color(0xb29b62),torso);}
    torus(.18,1.22,-.03,.096,.019,dark,'Chest',0,.8,1);
  }else{
    if(a.outfit==='vest')for(const sign of [-1,1])box(sign*.135,1.227,.141,.122,.33,.018,dark,torso);
    if(a.outfit==='knit')for(let row=0;row<6;row++)for(let j=0;j<11;j++)box((j-5)*.027,1.15+row*.039,.149,.02,.012,.006,new THREE.Color([0x414f53,0x867552,0x574638][(row+j)%3]),torso,(row+j)%2?.3:-.3);
    box(0,1.258,.143,.016,.34,.016,coat.clone().multiplyScalar(.65),torso);
    for(let i=0;i<5;i++)ell(0,1.12+i*.058,.155,.005,.005,.004,dark,torso,8);
    for(const sign of [-1,1])box(sign*.053,1.425,.087,.058,.079,.025,shirt,'Chest',sign*.37);
    if(['coat','cardigan','medical','robe'].includes(a.outfit)){
      for(const [s,sign] of [['L',1],['R',-1]]){
        const long=a.outfit==='robe',g=new THREE.LatheGeometry([[long?.33:.60,.205],[.78,.20],[.98,.18]].map(([y,r])=>new THREE.Vector2(r*wide,y)),18,sign<0?0:Math.PI,Math.PI-.055);g.scale(1,1,.68);add(g,coat,y=>binding('Coat'+s,'Hips',clamp((.98-y)/.16,0,1)),null,true);
      }
    }
    torus(0,.953,0,.181*wide,.018,dark,'Hips',Math.PI/2,1,.63);box(0,.953,.126,.050,.042,.018,new THREE.Color(0x9c8a60),'Hips');
    if(a.outfit==='uniform'){ell(.112,1.312,.159,.024,.033,.006,new THREE.Color(0xbca16a),'Chest',10);box(-.17,.92,.044,.065,.12,.075,dark,'Hips');}
    if(a.outfit==='work'){box(-.18,.91,.01,.075,.13,.10,new THREE.Color(0x67513c),'Hips');for(let i=0;i<3;i++)box(-.193+i*.013,.96,.066,.009,.15,.015,dark,'Hips');}
    if(a.chain){for(let i=0;i<17;i++){const t=i/16*Math.PI;ell(Math.cos(t)*.098,1.424-Math.sin(t)*.136,.155,.012,.012,.004,new THREE.Color(0xa98c52),'Chest',8);}ell(0,1.267,.16,.025,.035,.006,new THREE.Color(0xb6a167),'Chest');}
    if(a.outfit==='medical'){for(const sign of [-1,1])tube(V(sign*.044,1.46,.10),V(sign*.07,1.22,.152),.006,.006,dark,'Chest',6);ell(.07,1.218,.16,.018,.018,.004,dark,'Chest');}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setIndex(indices);
  geometry.computeBoundingBox();const factor=definition.height/geometry.boundingBox.max.y;geometry.scale(factor,factor,factor);for(const b of bones)b.position.multiplyScalar(factor);
  if(helmetRange){geometry.addGroup(0,helmetRange[0],0);geometry.addGroup(helmetRange[0],helmetRange[1],1);geometry.addGroup(helmetRange[0]+helmetRange[1],indices.length-helmetRange[0]-helmetRange[1],0);}
  const mesh=new THREE.SkinnedMesh(geometry,helmetRange?[material,material.clone()]:material);mesh.name=definition.id+(suit?'-cleaning-suit':'-resident');mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;model.add(mesh);model.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));geometry.computeBoundingSphere();
  return model;
}

export function createResident(definition,options={}){
  const key=definition.id+(options.suit?'-suit':'');if(!templates.has(key))templates.set(key,buildResidentModel(definition,options));
  const root=new THREE.Group(),model=clone(templates.get(key));root.name=definition.name;root.add(model);const motion=new SkeletalMotion(model,definition.height);
  return {definition,root,model,motion,time:0,pose:'idle',heading:0};
}

export function poseResident(actor,pose,time,dt=0,speed=0){
  const m=actor.motion;
  if(pose==='walk'){m.update(dt,{speed,position:actor.root.position,heading:actor.root.rotation.y,grounded:true,active:true});return;}
  m.neutral();m.time=time;m.rotate('Spine',Math.sin(time*1.8)*.006);m.rotate('Head',Math.sin(time*.53+actor.heading)*.026,new THREE.Vector3(0,1,0));
  for(const s of ['L','R'])m.rotate('Forearm'+s,-.16);
  if(pose==='sit'||pose==='read'){
    m.bones.Hips.position.y-=actor.definition.height*.255;
    for(const s of ['L','R']){m.rotate('Thigh'+s,-Math.PI*.48);m.rotate('Shin'+s,Math.PI*.49);m.rotate('Foot'+s,-.03);m.rotate('UpperArm'+s,-.8);m.rotate('Forearm'+s,-.75);m.rotate('Hand'+s,1.5);}
    m.rotate('Head',.10);
  }else if(pose==='work'){m.rotate('Spine',.09);m.rotate('UpperArmR',-.42);m.rotate('ForearmR',-.92+Math.sin(time*2.3)*.17);m.rotate('UpperArmL',-.28);m.rotate('ForearmL',-.75);m.rotate('Head',.10);}
  else if(pose==='talk'){m.rotate('ForearmR',-.58+Math.sin(time*1.1)*.16);m.rotate('UpperArmR',-.17);}
  else if(pose==='watch'){m.rotate('Head',-.04);}
  actor.model.updateWorldMatrix(true,true);
}
