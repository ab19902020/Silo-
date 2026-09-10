import * as THREE from '../vendor/three.module.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { SkeletalMotion } from './locomotion.js';
import { residentMaterial } from './resident-surface.js';

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
    rig('Thigh'+s,'Hips',sign*.092*wide,.90,0);rig('Shin'+s,'Thigh'+s,sign*.095*wide,.50,.012);rig('Foot'+s,'Shin'+s,sign*.095*wide,.080,.018);rig('Toe'+s,'Foot'+s,sign*.095*wide,.07,.155);rig('Coat'+s,'Hips',sign*.118,.85,-.04);
  }
  const positions=[],normals=[],colors=[],surfaces=[],weights=[],joints=[],indices=[],skin=new THREE.Color(a.skin??0xb79476),coat=new THREE.Color(suit?0xd4d0b6:a.coat??0x66715f),hair=new THREE.Color(a.hair??0x44352b),dark=new THREE.Color(0x242923),shirt=new THREE.Color(a.shirt??0xa29981);let helmetRange=null,visorRange=null;
  const skinTone=factor=>{const c=skin.clone().multiplyScalar(factor);c.skinSurface=true;return c;};
  const hairTone=factor=>{const c=hair.clone().multiplyScalar(factor);c.hairSurface=true;return c;};
  const binding=(b,b2=null,w=1)=>[bones.indexOf(byName[b]),bones.indexOf(byName[b2||b]),clamp(w,0,1)];
  const torso=y=>y<1.08?binding('Hips','Spine',clamp((1.13-y)/.15,0,1)):binding('Spine','Chest',clamp((1.34-y)/.25,0,1));
  // `paint` colours a surface per vertex from its own position, which is how
  // brows, lashes, lips and stubble reach the face without being objects laid
  // on it. A colour may also carry its own finish, for the eyes.
  const add=(geometry,color,bind,transform=null,cloth=false,paint=null)=>{
    if(transform)geometry.applyMatrix4(transform);const p=geometry.attributes.position,n=geometry.attributes.normal,start=positions.length/3;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i),[b,c,w]=typeof bind==='function'?bind(y,x,z):binding(bind);
      positions.push(x,y,z);normals.push(n.getX(i),n.getY(i),n.getZ(i));joints.push(b,c,0,0);weights.push(w,1-w,0,0);
      const painted=paint?paint(x,y,z):null,tone=painted?.color||color,finish=painted?.surface||tone.residentSurface;
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
  // 44 cm across the chest and 28 cm through it: a barrel. A clothed chest is
  // about 37 by 26, so the profile comes in and the section is rounded out,
  // and the lathe now stops below the jaw so there is a neck to see.
  const profile=[[.83,.152],[.9,.174],[1.0,.161],[1.14,female?.138:.154],[1.29,.181],[1.36,.179],[1.41,.150],[1.44,.096],[1.462,.062]];
  const torsoGeo=new THREE.LatheGeometry(profile.map(([y,r])=>new THREE.Vector2(r*wide,y)),24);torsoGeo.scale(1,1,.72);add(torsoGeo,coat,torso,null,true);
  ell(0,.893,0,.166*wide,.096,.108,coat,'Hips');
  for(const [s,sign] of [['L',1],['R',-1]]){
    const hip=points['Thigh'+s],knee=points['Shin'+s],ankle=points['Foot'+s],upper=points['UpperArm'+s],elbow=points['Forearm'+s],hand=points['Hand'+s];
    const legSkin=y=>y>.53?binding('Thigh'+s,'Shin'+s,clamp((y-.45)/.13,0,1)):binding('Shin'+s,'Foot'+s,clamp((y-.10)/.13,0,1));
    const pants=suit?coat:coat.clone().multiplyScalar(.64);
    tube(ankle,knee,.048,.064,pants,legSkin);tube(knee,hip,.064,.089*wide,pants,legSkin);
    ell(knee.x,knee.y,knee.z,.065,.074,.068,pants,legSkin);
    ell(ankle.x,.07,.063,.059,.064,.140,dark,'Foot'+s);box(ankle.x,.023,.055,.116,.028,.262,dark,'Foot'+s);
    if(!suit){for(let row=0;row<5;row++){const y=.095+row*.013,z=.14-row*.023;tube(V(ankle.x-.025,y,z),V(ankle.x+.025,y+.005,z-.012),.0025,.0025,shirt,'Foot'+s,6);}for(const side of [-1,1])tube(V(ankle.x+side*.052,.04,-.025),V(ankle.x+side*.048,.041,.16),.002,.002,coat,'Foot'+s,6);}
    if(suit){for(const y of [.2,.24])torus(ankle.x,y,0,.053,.012,dark,'Shin'+s,Math.PI/2,1,1);}
    const armSkin=y=>y>1.1?binding('UpperArm'+s,'Forearm'+s,clamp((y-1.07)/.09,0,1)):binding('Forearm'+s,'Hand'+s,clamp((y-.85)/.09,0,1));
    tube(hand,elbow,.033,.046,a.shortSleeves&&!suit?skin:coat,armSkin);tube(elbow,upper,.047,.058*wide,coat,armSkin);
    // The shoulder was a sphere stuck on the end of a tube and read as a ball
    // of a sleeve. A deltoid is longer than it is wide and sits inside the arm.
    {const g=new THREE.SphereGeometry(1,18,14);g.scale(.055*wide,.082,.072);g.translate(upper.x-sign*.004,upper.y-.026,upper.z);add(g,coat,'UpperArm'+s,null,true);}
    if(a.tattoo&&!suit)for(let i=0;i<5;i++)box(hand.x,1.04+i*.025,.066,.035,.004,.003,dark,'Forearm'+s,i%2?.6:-.6);
    const handColor=suit?dark:skin;ell(hand.x,.831,.018,.041,.064,.030,handColor,'Hand'+s);
    for(let f=0;f<4;f++){const xx=hand.x+(f-1.5)*.018,len=[.067,.076,.07,.055][f];tube(V(xx,.793,.02),V(xx,.793-len,.029),.0085,.0068,handColor,'Hand'+s,7);}
    tube(V(hand.x-sign*.027,.85,.034),V(hand.x-sign*.057,.799,.044),.013,.008,handColor,'Hand'+s,7);
    torus(hand.x,.898,.015,.039,.008,suit?dark:coat.clone().multiplyScalar(.7),'Forearm'+s,Math.PI/2);
    if(!suit){box(sign*.116*wide,1.273,.142,.095,.115,.015,coat.clone().multiplyScalar(.82),'Chest');box(sign*.116*wide,1.326,.154,.099,.012,.013,shirt,'Chest');}
    if(!suit){for(let row=0;row<3;row++){const y=.55+row*.027;ell(knee.x,y,.059,.049,.005,.008,pants.clone().multiplyScalar(row%2?1.06:.91),legSkin,12);}tube(V(hip.x+sign*.076,.82,.015),V(knee.x+sign*.061,.54,.012),.0018,.0018,pants.clone().multiplyScalar(.7),legSkin,6);}
    if(a.outfit==='work'||suit){box(hip.x,.70,.085,.12,.18,.014,coat.clone().multiplyScalar(.78),'Thigh'+s);}
  }
  // A neck tapers: narrow under the jaw, flaring into the collarbones. The old
  // one was a 21 cm ellipsoid as wide at the jaw as at the shoulders, which is
  // most of what made every resident read as a mannequin on a post.
  {const neck=new THREE.LatheGeometry([[1.585,.0400],[1.560,.0450],[1.520,.0492],[1.470,.0545],[1.420,.0640],[1.380,.0790],[1.355,.0930]].map(([y,r])=>new THREE.Vector2(r,y)),22);
   neck.scale(1,1,.94);add(neck,skin,y=>binding('Neck','Chest',clamp((y-1.40)/.10,0,1)),null,false,(x,y,z)=>({color:skin.clone().multiplyScalar(y>1.50?.90+.10*clamp((1.545-y)/.045,0,1):1)}));}
  // The neck used to rise out of the collar as a plain tube with a hard seam
  // where the lathe stopped. This is the trapezius: it carries the line from
  // the base of the skull out to each shoulder, which is most of what makes a
  // clothed figure read as having a body under the cloth.
  {const g=new THREE.SphereGeometry(1,26,14,0,Math.PI*2,0,Math.PI*.66);
   g.scale(.182*wide,.086,.122);g.translate(0,1.382,-.004);add(g,coat,'Chest');}
  // ---------------------------------------------------------------- the head
  // One continuous skin surface. Every feature — brow ridge, sockets, nose,
  // lips, chin, cheekbones — is sculpted into it, and every marking — brows,
  // lashes, lip colour, stubble — is painted onto it. The head used to be two
  // dozen separate ellipsoids and boxes laid over a sphere at guessed depths,
  // and geometry laid over geometry can only do two things: cross it or float
  // off it. Both were happening. The hair cap crossed the skull and cut a hard
  // bowl-cut band across the forehead and cheeks; the brows, crow's feet and
  // forehead lines floated a centimetre proud of the face; the lids were a
  // ring of beads. No amount of nudging offsets fixes that, because a surface
  // laid on another surface has no correct offset. A single surface cannot
  // cross itself, so all of it is one surface now.
  const fw=(a.faceWidth||1)*(female?.96:1),age=clamp(a.age||0,0,1);
  // Head centre at the eye line. 15.7 cm across, 23.6 cm chin to crown.
  const CY=1.636,HW=.0795*fw,HUP=.108,HDN=.121,HZ=.098,TAU2=Math.PI*2;
  const bell=(v,c,w)=>Math.exp(-(((v-c)/w)**2));
  const step=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  // 63 mm between the pupils, a 29 mm opening and a 12 mm iris: the measured
  // figures. The old eye was 60 mm across with a 40 mm iris, which is the one
  // thing that made every face in the silo read as a cartoon.
  const EYE={x:.0320*fw,y:.006,w:.0152,h:.0068,r:.0120,z:.0715};
  const NOSE={root:.021,tip:-.023},MOUTH={y:-.0525};
  const beardAmount=a.beard?clamp(typeof a.beard==='number'?a.beard:.7,.12,1):0;
  const stubbleColor=hair.clone().lerp(skin,.38);
  const lipColor=skin.clone().lerp(new THREE.Color(0x8f4a3e),female?.46:.30).multiplyScalar(.95);
  const glossy=c=>{c.residentSurface=[.11,0,0,0];return c;};
  const sclera=glossy(new THREE.Color(0xc6c0ae)),iris=glossy(new THREE.Color(a.eyes??0x5c6047)),pupil=glossy(new THREE.Color(0x0a0c0b));

  // Where the hair starts, as a height above the head centre: high across the
  // forehead, dropping past the temples and down to the nape at the back.
  const hairLine=d=>-.036+.098*step((d.z+1)/2)+(age*(female?.004:.016));
  const beardMask=(y,ax)=>{
    if(!beardAmount&&!a.moustache)return 0;
    const jaw=Math.pow(step((-.020-y)/.020),1.4)*step((.062-ax)/.014)*step((y+.106)/.016);
    const lips=1-.94*bell(y,MOUTH.y,.0145)*bell(ax,0,.023);
    const tache=bell(y,-.036,.0105)*bell(ax,0,.021);
    return clamp(Math.max(beardAmount?jaw*lips:0,a.moustache?tache:0),0,1);
  };

  // The skin surface, as a function of a unit direction out of the head centre.
  function headSurface(d){
    const below=clamp(-d.y,0,1),front=clamp(d.z,0,1),back=clamp(-d.z,0,1);
    const jaw=1-.30*Math.pow(clamp((-d.y-.20)/.80,0,1),1.5)*(1-.28*back)+.030*bell(d.y,-.40,.16)*(1-front*.5);
    const temple=1-.060*bell(d.y,.34,.26)*front-.035*bell(d.y,.80,.30);
    const px=d.x*HW*jaw*temple,py=CY+d.y*(d.y>0?HUP:HDN);
    let pz=d.z*HZ*(d.z>0?1-.20*Math.pow(below,1.8)-.055*bell(d.y,.55,.30):1.07);
    if(front>.002){
      const y=py-CY,ax=Math.abs(px);let out=0;
      out+=bell(y,.029,.021)*bell(ax,.030*fw,.040)*.0072;                 // brow ridge
      out+=bell(y,-.002,.024)*bell(ax,.050*fw,.020)*.0068;                // cheekbone
      out-=bell(y,-.040,.017)*bell(ax,.049*fw,.012)*.0022*(.35+age*.65);  // cheek hollow
      out-=bell(y,EYE.y,.016)*bell(ax-EYE.x,0,.021)*.0068;                // orbit
      // The nose: a bridge falling from between the brows, the ball of the
      // tip, the wings either side, and the nostrils under them.
      // One smooth ridge that grows from the root, peaks at the tip and dies
      // away above the lip. Gating it on and off instead gave first a 2 cm
      // vertical wall under the tip, then a ramp so wide it shaded the whole
      // lower face — both of them a nose smeared across the middle of a face.
      const along=clamp((NOSE.root-y)/(NOSE.root-NOSE.tip),0,2);
      const fall=Math.exp(-Math.pow(Math.max(0,along-1)/.34,2));
      out+=step(along/.90)*fall*bell(ax,0,.0072+.0050*clamp(along,0,1))*.0212;
      out+=bell(y,NOSE.tip+.001,.0082)*bell(ax,0,.0112)*.0072;              // tip
      out+=bell(y,NOSE.tip-.003,.0068)*bell(ax,.0148,.0058)*.0056;          // wings
      out-=bell(y,NOSE.tip-.0104,.0040)*bell(ax,.0096,.0042)*.0026;         // nostrils
      out-=bell(y,-.036,.0085)*bell(ax,0,.0052)*.0014;                    // philtrum
      out+=bell(y,MOUTH.y+.008,.0080)*bell(ax,0,.0250)*.0052;             // upper lip
      out-=bell(y,MOUTH.y,.0030)*bell(ax,0,.0270)*.0042;                  // mouth line
      out+=bell(y,MOUTH.y-.010,.0090)*bell(ax,0,.0225)*.0062;             // lower lip
      out-=bell(y,-.075,.0098)*bell(ax,0,.0245)*.0022;                    // sulcus
      out+=bell(y,-.089,.0205)*bell(ax,0,.0290)*.0062;                    // chin
      out+=bell(y,-.068,.028)*bell(ax,.052*fw,.016)*.0022;                // masseter
      out-=age*bell(y,-.040,.020)*bell(ax,.028*fw,.010)*.0016;            // nasolabial fold
      // The eye opening: the skin falls away behind the eyeball inside an
      // almond, and rolls forward into lids just outside it.
      const er=Math.hypot((ax-EYE.x)/EYE.w,(y-EYE.y)/EYE.h);
      if(er<1)out-=(1-er*er)*.0132;
      else{const roll=Math.max(0,1-(er-1)/.85);out+=roll*roll*.0019*(y>EYE.y?1.2:1)-bell(er,1.75,.32)*.0011*step((y-EYE.y)/.004);}
      out+=beardMask(y,ax)*beardAmount*.0028;
      pz+=out*front;
    }
    return new THREE.Vector3(px,py,pz);
  }
  // Skin colour, from the same surface. Brows, lashes, lips and stubble are
  // paint, not parts: nothing here can lift off the face or cross it.
  const facePaint=(x,y0,z)=>{
    const y=y0-CY,ax=Math.abs(x),front=clamp(z/HZ,0,1);
    let c=skin.clone().multiplyScalar(.985+.012*Math.cos(y*23+ax*17)+.007*Math.sin(ax*61-y*44));
    if(front<=0)return {color:c};
    const er=Math.hypot((ax-EYE.x)/EYE.w,(y-EYE.y)/EYE.h);
    c.lerp(skin.clone().multiplyScalar(.90),bell(er,1.15,.50)*.22*front);         // socket shading
    c.lerp(skin.clone().multiplyScalar(.55),Math.max(0,1-Math.abs(er-1.02)/.16)*(y>EYE.y?.80:.45)*front); // lash line
    const brow=bell(y,.0300+.0055*bell(ax,.028*fw,.015),.0070)*step((ax-.006)/.006)*step((.048*fw-ax)/.011);
    c.lerp(hair,clamp(brow*1.5,0,1)*(female?.72:.88)*front);
    // An almond, the size a mouth is: 50 mm across and 20 mm deep. A gaussian
    // in y alone smeared lip colour over the whole lower face.
    const lip=step((1-Math.hypot(ax/.0265,(y-MOUTH.y)/.0108))/.22);
    c.lerp(lipColor,lip*.98*front);
    c.lerp(lipColor.clone().multiplyScalar(.62),lip*bell(y,MOUTH.y,.0022)*.85*front);
    if(beardAmount||a.moustache)c.lerp(stubbleColor,beardMask(y,ax)*(.20+.62*beardAmount)*front);
    return {color:c};
  };
  // A sphere grid, theta zero facing +z. `keep` drops quads, which is how the
  // hair gets a hairline instead of a cap that stops in mid-forehead.
  // Rings and columns are not evenly spaced: a uniform sphere puts two columns
  // across the whole nose and smooths it into the cheek. This spends its
  // vertices where the face is, by integrating a density along each axis.
  const spread=(n,density)=>{
    const fine=600,w=[];let total=0;
    for(let i=0;i<fine;i++){const d=density((i+.5)/fine);w.push(d);total+=d;}
    const out=[0];let acc=0,k=0;
    for(let s=1;s<n;s++){const target=total*s/n;while(k<fine-1&&acc+w[k]<target){acc+=w[k];k++;}out.push((k+(target-acc)/w[k])/fine);}
    out.push(1);return out;
  };
  const faceRows=n=>spread(n,t=>1+2.4*Math.exp(-(((t-.60)/.19)**2))),
        faceCols=n=>spread(n,u=>1+2.6*Math.exp(-(((u-.5)/.17)**2)));
  const shell=(rows,cols,place,keep)=>{
    const position=[],index=[],row=cols+1,rowT=faceRows(rows),colT=faceCols(cols);
    // The seam runs down the back of the head, never down the middle of a face.
    const dir=(j,i)=>{const phi=rowT[j]*Math.PI,theta=Math.PI+colT[i]*TAU2;const s=Math.sin(phi);return new THREE.Vector3(s*Math.sin(theta),Math.cos(phi),s*Math.cos(theta));};
    for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const p=place(dir(j,i));position.push(p.x,p.y,p.z);}
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      if(keep&&![[j,i],[j,i+1],[j+1,i],[j+1,i+1]].every(([r,c])=>keep(dir(r,c))))continue;
      const a1=j*row+i,b1=j*row+i+1,c1=(j+1)*row+i,d1=(j+1)*row+i+1;index.push(a1,c1,b1,b1,c1,d1);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setIndex(index);g.computeVertexNormals();return g;
  };
  add(shell(46,64,headSurface),skin,'Head',null,false,facePaint);
  // Eyes. Iris and pupil are concentric caps of the same sphere, so they are
  // always the same tiny distance proud of it and can never cross it.
  const capGeo=(r,half,segments=18)=>{const g=new THREE.SphereGeometry(r,segments,Math.max(3,Math.round(segments*half/1.2)),0,TAU2,0,half);g.rotateX(Math.PI/2);return g;};
  for(const sign of [-1,1]){
    const ex=sign*EYE.x,ey=CY+EYE.y;
    const eye=new THREE.SphereGeometry(EYE.r,20,14);eye.translate(ex,ey,EYE.z);add(eye,sclera,'Head');
    const ir=capGeo(EYE.r+.0004,Math.asin(.0059/EYE.r));ir.translate(ex,ey,EYE.z);add(ir,iris,'Head');
    const pu=capGeo(EYE.r+.0009,Math.asin(.0026/EYE.r),14);pu.translate(ex,ey,EYE.z);add(pu,pupil,'Head');
  }
  // Ears: a shell with a rolled helix rim, a hollow and a lobe, tilted back the
  // way a real one is and half buried in the skull, rather than a flat disc.
  for(const sign of [-1,1]){
    const ex=sign*.0725*fw,ey=CY-.014,ez=-.022,tilt=.19;
    const shellGeo=new THREE.SphereGeometry(1,18,16);shellGeo.scale(.0070,.0290,.0142);
    shellGeo.applyMatrix4(new THREE.Matrix4().makeRotationX(tilt));shellGeo.translate(ex,ey,ez);add(shellGeo,skinTone(.97),'Head');
    const rim=new THREE.TorusGeometry(1,.155,7,22,Math.PI*1.45);rim.rotateZ(Math.PI*.34);
    rim.scale(.0176,.0335,.0068);rim.rotateY(sign*Math.PI/2);rim.rotateX(tilt);
    rim.translate(ex+sign*.0016,ey+.0022,ez-.0010);add(rim,skinTone(1.03),'Head');
    ell(ex+sign*.0010,ey-.0020,ez+.0026,.0056,.0140,.0080,skinTone(.78),'Head',12);   // concha
    ell(ex+sign*.0026,ey-.0310,ez+.0020,.0068,.0082,.0080,skinTone(1.01),'Head',12);  // lobe
    ell(ex+sign*.0030,ey-.0035,ez+.0128,.0042,.0072,.0042,skinTone(1.0),'Head',10);   // tragus
  }
  if(a.glasses){
    for(const sign of [-1,1]){const t=new THREE.TorusGeometry(.0215,.0022,6,22);t.scale(1,.82,.6);t.translate(sign*EYE.x,CY+EYE.y,.0805);add(t,dark,'Head');}
    box(0,CY+EYE.y+.003,.0795,.024,.0025,.003,dark,'Head');
    for(const sign of [-1,1])tube(V(sign*.0400,CY+EYE.y+.006,.0755),V(sign*.0700,CY+.004,-.010),.0018,.0018,dark,'Head',6);
  }
  // Hair, generated from the same surface the skin is: every strand of it is
  // the scalp pushed out along its own normal, so it lies on the head instead
  // of cutting through it, and it fades to a 1 mm edge at the hairline.
  if(!a.bald){
    const curls=['curls','longCurls'].includes(a.hairStyle),fringe=a.hairStyle==='fringe';
    const volume=curls?1.55:['waves','long','longCurls','bun','braids'].includes(a.hairStyle)?1.2:1;
    const centre=new THREE.Vector3(0,CY,.004);
    const mask=d=>{const p=headSurface(d);return step((p.y-CY-hairLine(d)+(fringe?.030:0))/.017);};
    const hairPoint=d=>{
      const p=headSurface(d),m=mask(d),out=p.clone().sub(centre),len=out.length()||1;
      const noise=curls?.0028*Math.sin(d.x*70+d.y*53)*Math.cos(d.z*61-d.y*23):.0009*Math.sin(d.x*39+d.z*31);
      return p.addScaledVector(out.divideScalar(len),-.0075+(.0135+.0125*clamp(d.y,0,1))*volume*Math.pow(m,1.1)+noise*m);
    };
    // Dropping quads at a threshold gave a staircase hairline. Letting the
    // thickness go negative buries the cap inside the skull instead, so the
    // edge is the smooth curve where it surfaces.
    add(shell(38,52,hairPoint),hair,'Head',null,false,(x,y,z)=>({color:hair.clone().multiplyScalar(.90+.16*Math.abs(Math.sin(x*63+z*47))),surface:[.86,0,0,0]}));
    if(['long','longCurls','braids'].includes(a.hairStyle)||a.hairStyle==='waves'&&female){
      // The fall: one mass down the back and past the jaw. The old version was
      // sixteen straight tapered tubes a side and read as plastic bristles.
      const rows=14,cols=26,position=[],index=[],rw=cols+1;
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const t=j/rows,theta=Math.PI*.42+(i/cols)*Math.PI*1.16,drop=.30+.055*Math.sin(t*7+i*.4);
        const d=new THREE.Vector3(Math.sin(theta)*.86,.30-t*.10,Math.cos(theta)*.86).normalize();
        const anchor=hairPoint(d),spread=1+t*(.22+.10*Math.sin(i*.9));
        position.push(anchor.x*spread+Math.sin(t*9+i)*.0016,CY+.030-t*drop,(anchor.z-.004)*spread+.004+Math.sin(t*6+i*.7)*.0022);
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a1=j*rw+i,b1=j*rw+i+1,c1=(j+1)*rw+i,d1=(j+1)*rw+i+1;index.push(a1,c1,b1,b1,c1,d1);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setIndex(index);g.computeVertexNormals();
      add(g,hair,y=>binding('Head','Chest',clamp((y-(CY-.20))/.11,0,1)));
    }
    if(a.hairStyle==='bun'){const g=new THREE.SphereGeometry(1,20,14);g.scale(.040,.038,.034);g.translate(0,CY+.052,-.098);add(g,hair,'Head');
      const t=new THREE.TorusGeometry(.040,.0075,6,20);t.rotateX(.35);t.translate(0,CY+.052,-.094);add(t,hairTone(.88),'Head');}
    if(fringe){const g=new THREE.SphereGeometry(1,26,14,0,TAU2,0,Math.PI*.42);g.scale(.086*fw,.052,.078);g.translate(0,CY+.038,.010);add(g,hair,'Head');}
  }
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
    if(a.outfit==='vest'){
      // Two flat black slabs stuck on the chest read as holes cut in the shirt.
      // A waistcoat is a garment: it follows the body, it is a shade of the
      // coat rather than pure black, and it has a front edge and buttons.
      const cloth=coat.clone().multiplyScalar(.52);
      for(const sign of [-1,1]){
        const g=new THREE.LatheGeometry(profile.filter(([y])=>y>=1.0&&y<=1.37).map(([y,r])=>new THREE.Vector2(r*wide*1.05,y)),18,sign>0?.13:-1.16,1.03);
        g.scale(1,1,.72);add(g,cloth,torso,null,true);
        box(sign*.083*wide,1.185,.152,.018,.30,.02,cloth.clone().multiplyScalar(.8),torso);
      }
      for(let i=0;i<4;i++)ell(0,1.08+i*.072,.152,.007,.007,.005,coat.clone().multiplyScalar(.34),torso,8);
    }
    if(a.outfit==='knit')for(let row=0;row<6;row++)for(let j=0;j<11;j++)box((j-5)*.027,1.15+row*.039,.149,.02,.012,.006,new THREE.Color([0x414f53,0x867552,0x574638][(row+j)%3]),torso,(row+j)%2?.3:-.3);
    box(0,1.258,.143,.016,.34,.016,coat.clone().multiplyScalar(.65),torso);
    for(let i=0;i<5;i++)ell(0,1.12+i*.058,.155,.005,.005,.004,dark,torso,8);
    for(const sign of [-1,1])box(sign*.053,1.425,.087,.058,.079,.025,shirt,'Chest',sign*.37);
    if(['coat','cardigan','medical','robe'].includes(a.outfit)){
      for(const [s,sign] of [['L',1],['R',-1]]){
        const long=a.outfit==='robe',g=new THREE.LatheGeometry([[long?.33:.60,.205],[.78,.20],[.98,.18]].map(([y,r])=>new THREE.Vector2(r*wide,y)),18,sign<0?0:Math.PI,Math.PI-.055);g.scale(1,1,.68);add(g,coat,y=>binding('Coat'+s,'Hips',clamp((.98-y)/.16,0,1)),null,true);
      }
    }
    torus(0,.953,0,.170*wide,.017,dark,'Hips',Math.PI/2,1,.70);box(0,.953,.126,.050,.042,.018,new THREE.Color(0x9c8a60),'Hips');
    if(a.outfit==='uniform'){ell(.112,1.312,.159,.024,.033,.006,new THREE.Color(0xbca16a),'Chest',10);box(-.17,.92,.044,.065,.12,.075,dark,'Hips');}
    if(a.outfit==='work'){box(-.18,.91,.01,.075,.13,.10,new THREE.Color(0x67513c),'Hips');for(let i=0;i<3;i++)box(-.193+i*.013,.96,.066,.009,.15,.015,dark,'Hips');}
    if(a.chain){for(let i=0;i<17;i++){const t=i/16*Math.PI;ell(Math.cos(t)*.098,1.424-Math.sin(t)*.136,.155,.012,.012,.004,new THREE.Color(0xa98c52),'Chest',8);}ell(0,1.267,.16,.025,.035,.006,new THREE.Color(0xb6a167),'Chest');}
    if(a.outfit==='medical'){for(const sign of [-1,1])tube(V(sign*.044,1.46,.10),V(sign*.07,1.22,.152),.006,.006,dark,'Chest',6);ell(.07,1.218,.16,.018,.018,.004,dark,'Chest');}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(joints,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setIndex(indices);
  geometry.setAttribute('residentSurface',new THREE.Float32BufferAttribute(surfaces,4));
  geometry.computeBoundingBox();const factor=definition.height/geometry.boundingBox.max.y;geometry.scale(factor,factor,factor);for(const b of bones)b.position.multiplyScalar(factor);
  let finishes=material;
  if(helmetRange){geometry.addGroup(0,helmetRange[0],0);geometry.addGroup(helmetRange[0],visorRange[0]-helmetRange[0],1);geometry.addGroup(visorRange[0],visorRange[1],2);geometry.addGroup(visorRange[0]+visorRange[1],helmetRange[0]+helmetRange[1]-visorRange[0]-visorRange[1],1);geometry.addGroup(helmetRange[0]+helmetRange[1],indices.length-helmetRange[0]-helmetRange[1],0);
    finishes=[material,residentMaterial(),new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.22,metalness:.66,clearcoat:1,clearcoatRoughness:.12,envMapIntensity:1.1,side:THREE.DoubleSide})];}
  const mesh=new THREE.SkinnedMesh(geometry,finishes);mesh.name=definition.id+(suit?'-cleaning-suit':'-resident');mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;model.add(mesh);model.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));geometry.computeBoundingSphere();
  return model;
}

export function createResident(definition,options={}){
  const key=definition.id+(options.suit?'-suit':'');if(!templates.has(key))templates.set(key,buildResidentModel(definition,options));
  const root=new THREE.Group(),model=clone(templates.get(key));root.name=definition.name;root.add(model);const motion=new SkeletalMotion(model,definition.height);
  return {definition,root,model,motion,time:0,pose:'idle',heading:0};
}

export function poseResident(actor,pose,time,dt=0,speed=0){
  const m=actor.motion;
  if(pose==='walk'){m.update(dt,{speed,position:actor.root.position,heading:actor.root.rotation.y,grounded:true,active:true,ground:actor.ground||null});return;}
  m.neutral();m.time=time;m.rotate('Spine',Math.sin(time*1.8)*.006);m.rotate('Head',Math.sin(time*.53+actor.heading)*.026,new THREE.Vector3(0,1,0));
  for(const s of ['L','R'])m.rotate('Forearm'+s,-.16);
  if(pose==='sit'||pose==='read'){
    // Sit the pelvis on the seat itself, not a fraction of the sitter's height:
    // a tall person and a short one both put their backside at chair height.
    m.bones.Hips.position.y=.525;
    for(const s of ['L','R']){m.rotate('Thigh'+s,-Math.PI*.48);m.rotate('Shin'+s,Math.PI*.49);m.rotate('Foot'+s,-.03);m.rotate('UpperArm'+s,-.19);m.rotate('Forearm'+s,-1.28);m.rotate('Hand'+s,1.12);}
    m.rotate('Spine',.055);m.rotate('Head',.07);
  }else if(pose==='work'){m.rotate('Spine',.09);m.rotate('UpperArmR',-.42);m.rotate('ForearmR',-.92+Math.sin(time*2.3)*.17);m.rotate('UpperArmL',-.28);m.rotate('ForearmL',-.75);m.rotate('Head',.10);}
  else if(pose==='talk'){m.rotate('ForearmR',-.58+Math.sin(time*1.1)*.16);m.rotate('UpperArmR',-.17);}
  else if(pose==='watch'){m.rotate('Head',-.04);}
  actor.model.updateWorldMatrix(true,true);
}
