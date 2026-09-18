import * as THREE from '../vendor/three.module.js';
import { clone } from '../vendor/SkeletonUtils.js';
import { SkeletalMotion } from './locomotion.js';
import { residentMaterial } from './resident-surface.js';

const templates=new Map();
const material=residentMaterial();
const V=(x,y,z)=>new THREE.Vector3(x,y,z),clamp=THREE.MathUtils.clamp;
const TAU=Math.PI*2;

// --------------------------------------------------------------- lofted cloth
//
// A garment is a surface swept up a stack of landmark sections, not a body of
// revolution. Everything below the neck used to be a LatheGeometry squashed to
// 72 per cent in z, and a lathe has exactly one radius at each height: it
// cannot be wider than it is deep, cannot put the seat behind the spine, cannot
// nip in at the waist and cannot square off a shoulder. Every resident in the
// silo was therefore the same drainpipe in a different colour, with a ball
// stuck on each shoulder for a sleeve — which is what made them read as boxes
// with heads on.
//
// A section is [y, halfWidth, halfDepth, centreZ, squareness]. They are read
// through a Catmull-Rom spline, so eight landmarks describe a whole torso and
// the surface between them is smooth; the cross-section is a superellipse, so a
// shoulder can square off while the waist under it stays round.
const sectionAt=(sections,t)=>{
  const n=sections.length-1,u=clamp(t,0,1)*n,i=Math.min(n-1,Math.floor(u)),f=u-i;
  const at=k=>sections[clamp(k,0,n)],a=at(i-1),b=at(i),c=at(i+1),d=at(i+2),out=[];
  for(let k=0;k<5;k++){
    const p0=a[k]??b[k],p1=b[k]??0,p2=c[k]??p1,p3=d[k]??p2;
    out.push(.5*(2*p1+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f*f+(-p0+3*p1-3*p2+p3)*f*f*f));
  }
  return out;
};
// `from`/`to` sweep the section angle — zero is the centre front — so a coat can
// be left open down the middle. `thickness` turns the sheet into cloth: a second
// surface runs just inside the first and the two are joined along every open
// edge. Without it an open coat is a zero-thickness shell that vanishes edge-on
// and shows its own lining through itself, which is what the old lathe skirts
// did every time a resident turned side-on.
function garment(sections,{from=0,to=TAU,rings=28,cols=30,thickness=0,capTop=false,capBottom=false,wrinkle=0,phase=0,taper=null}={}){
  const closed=(to-from)>=TAU-1e-6,perRing=closed?cols:cols+1,position=[],index=[];
  const place=(t,i,inset)=>{
    const [y,w,d,z,square]=sectionAt(sections,t),theta=from+(to-from)*(i/cols);
    const c=Math.cos(theta),s=Math.sin(theta),n=2/Math.max(1.15,square||2);
    // Cloth is not drum-tight. A little wander in the radius, keyed to both the
    // height and the way round, is the difference between a garment and a pipe.
    const wander=wrinkle?1+wrinkle*(Math.sin(theta*4+t*17+phase)*.6+Math.sin(theta*7-t*29+phase*1.7)*.4):1;
    const ease=taper?taper(t):0;
    const rw=Math.max(.002,(w+ease-inset)*wander),rd=Math.max(.002,(d+ease-inset)*wander);
    return [rw*Math.sign(s)*Math.abs(s)**n,y,z+rd*Math.sign(c)*Math.abs(c)**n];
  };
  const surface=inset=>{
    const base=position.length/3;
    for(let j=0;j<=rings;j++)for(let i=0;i<perRing;i++)position.push(...place(j/rings,i,inset));
    return base;
  };
  const quads=(base,flip)=>{
    for(let j=0;j<rings;j++)for(let i=0;i<(closed?cols:cols);i++){
      const i2=(i+1)%perRing,a=base+j*perRing+i,b=base+j*perRing+i2,c=base+(j+1)*perRing+i,d=base+(j+1)*perRing+i2;
      if(flip)index.push(a,b,c,b,d,c);else index.push(a,c,b,b,c,d);
    }
  };
  const outer=surface(0);quads(outer,false);
  if(thickness>0){
    const inner=surface(thickness);quads(inner,true);
    const seam=(a,b,c,d)=>index.push(a,c,b,b,c,d);
    if(!closed)for(let j=0;j<rings;j++)for(const [i,flip] of [[0,true],[perRing-1,false]]){
      const a=outer+j*perRing+i,b=outer+(j+1)*perRing+i,c=inner+j*perRing+i,d=inner+(j+1)*perRing+i;
      if(flip)seam(a,b,c,d);else seam(c,d,a,b);
    }
    for(const [row,flip] of [[0,true],[rings,false]]){          // the hem and the neck edge
      const o=outer+row*perRing,n2=inner+row*perRing;
      for(let i=0;i<(closed?cols:cols);i++){const i2=(i+1)%perRing;
        if(flip)seam(o+i,o+i2,n2+i,n2+i2);else seam(n2+i,n2+i2,o+i,o+i2);}
    }
  }
  for(const [row,cap,flip] of [[0,capBottom,true],[rings,capTop,false]]){
    if(!cap)continue;
    const [y,,,z]=sectionAt(sections,row/rings),centre=position.length/3;position.push(0,y,z);
    for(let i=0;i<(closed?cols:cols);i++){const a=row*perRing+i,b=row*perRing+(i+1)%perRing;
      if(flip)index.push(centre,a,b);else index.push(centre,b,a);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setIndex(index);g.computeVertexNormals();return g;
}
// Shift a colour's lightness and saturation together, which is how a real
// wardrobe is put together: the trousers are a heavier version of the jacket
// and the shirt a lighter, greyer one, rather than all three being one hue at
// three brightnesses.
const tone=(hex,light,sat)=>{
  const c=new THREE.Color(hex),hsl={};c.getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h+(light<0?-.012:.010),clamp(hsl.s*(1+sat*2.2),0,.42),clamp(hsl.l*(1+light)+light*.06,.04,.92));
};
// The wardrobe. Each entry is a silhouette, not a decal: where the garment ends,
// how much cloth stands off the body, whether it hangs open, what the collar
// does, how long the sleeve is and what closes the front. Before this there was
// one shape — a tube — and the outfits differed only by a few flat cards stuck
// on the chest, so from three metres away the whole silo was wearing the same
// thing.
const GARMENTS={
  // Mechanical: a one-piece coverall, loose enough to work in, gathered by its
  // own webbing belt, with a bib of pockets and a tool pocket on the thigh.
  work:     {hem:.900,ease:.021,flare:.004,open:0,neck:1.412,collar:'fold',closure:'zip',belt:'web',
             pockets:'bib',thighPocket:true,sleeve:1,cuffArm:.005,cuffLeg:.004,armWrinkle:.030,legWrinkle:.026,
             wrinkle:.013,onePiece:true},
  // Sheriff and deputies: a fitted tunic to below the hip, stand collar,
  // shoulder straps, a duty belt over it.
  uniform:  {hem:.822,ease:.013,flare:.010,open:0,neck:1.448,collar:'stand',closure:'placket',belt:'duty',
             pockets:'flap',epaulettes:true,sleeve:1,cuffArm:.004,cuffLeg:.002,armWrinkle:.014,legWrinkle:.012,
             wrinkle:.007,crease:true,trouser:null},
  // A shirt, tucked in, worn on its own.
  shirt:    {hem:.938,ease:.011,flare:0,open:0,neck:1.444,collar:'open',closure:'placket',belt:'plain',
             pockets:'chest',sleeve:1,cuffArm:.004,cuffLeg:.002,armWrinkle:.020,legWrinkle:.014,
             wrinkle:.010,crease:true},
  // A heavy jumper: no closure at all, a ribbed hem and cuffs, and enough cloth
  // on it that the body under it is a suggestion rather than a diagram.
  knit:     {hem:.868,ease:.028,flare:.008,open:0,neck:1.424,collar:'crew',closure:'none',belt:null,
             pockets:null,sleeve:1,cuffArm:.006,cuffLeg:.002,armWrinkle:.026,legWrinkle:.016,
             wrinkle:.018,ribbed:true,hang:.5,crease:false},
  // A cardigan hangs open over a shirt, which is the whole reason there is a
  // shirt under every garment in this file.
  cardigan: {hem:.800,ease:.030,flare:.014,open:.30,thickness:.010,neck:1.418,collar:'band',closure:'none',
             belt:null,pockets:'patch',sleeve:1,cuffArm:.006,cuffLeg:.002,armWrinkle:.024,legWrinkle:.014,
             wrinkle:.016,ribbed:true,hang:.75},
  // A waistcoat: fitted, open in a deep V, and the shirt sleeves are the sleeves.
  vest:     {hem:.944,ease:.014,flare:.004,open:.34,thickness:.008,neck:1.352,collar:'v',closure:'button',
             belt:'plain',pockets:'welt',sleeve:1,sleeveCloth:'under',cuffArm:.004,cuffLeg:.002,
             armWrinkle:.018,legWrinkle:.012,wrinkle:.007,crease:true},
  // A long coat, open, with notched lapels and a hem that flares at mid-thigh.
  coat:     {hem:.600,ease:.032,flare:.030,open:.28,thickness:.012,neck:1.430,collar:'lapel',closure:'none',
             belt:null,pockets:'patch',sleeve:1,cuffArm:.007,cuffLeg:.003,armWrinkle:.022,legWrinkle:.014,
             wrinkle:.014,hang:1},
  // A physician's coat: the same cut, lighter cloth, patch pockets at the hip.
  medical:  {hem:.640,ease:.027,flare:.018,open:.24,thickness:.010,neck:1.432,collar:'lapel',closure:'none',
             belt:null,pockets:'patch',sleeve:1,cuffArm:.009,cuffLeg:.002,armWrinkle:.018,legWrinkle:.012,
             wrinkle:.012,hang:1},
  // The mayor's and the judge's robe: hung from the shoulder, full length, with
  // a rolled shawl collar and bell sleeves.
  robe:     {hem:.175,ease:.038,flare:.082,open:.20,thickness:.013,neck:1.428,collar:'shawl',closure:'none',
             belt:'plain',pockets:null,sleeve:1,cuffArm:.014,cuffLeg:.002,armWrinkle:.020,legWrinkle:.008,
             wrinkle:.016,hang:1},
  // Under the cleaning suit there is no wardrobe: the suit is the garment.
  suit:     {hem:.880,ease:.026,flare:.004,open:0,neck:1.436,collar:'none',closure:'none',belt:null,
             pockets:null,sleeve:1,cuffArm:.007,cuffLeg:.006,armWrinkle:.010,legWrinkle:.010,
             wrinkle:.008,onePiece:true},
};
// A sleeve or a trouser leg, swept along the line the bone actually runs on
// with its own radius down the length. The deltoid swell at the top is part of
// the sleeve rather than a sphere stuck on the end of it, and the profile can
// carry an elbow, a knee, a cuff and a hem without any of them being a separate
// object laid over the limb.
function sleeve(path,profile,{rings=18,cols=14,squash=1,wrinkle=0,phase=0}={}){
  const position=[],index=[],curve=new THREE.CatmullRomCurve3(path,false,'catmullrom',.4);
  const up=V(0,0,1);
  for(let j=0;j<=rings;j++){
    const t=j/rings,centre=curve.getPoint(t),tangent=curve.getTangent(t).normalize();
    const side=new THREE.Vector3().crossVectors(up,tangent);
    if(side.lengthSq()<1e-6)side.set(1,0,0);side.normalize();
    const front=new THREE.Vector3().crossVectors(tangent,side).normalize();
    const r=profile(t),rx=(typeof r==='number'?r:r[0]),rz=(typeof r==='number'?r*squash:r[1]);
    for(let i=0;i<cols;i++){
      const theta=i/cols*TAU,wander=wrinkle?1+wrinkle*Math.sin(theta*3+t*21+phase):1;
      position.push(
        centre.x+side.x*Math.cos(theta)*rx*wander+front.x*Math.sin(theta)*rz*wander,
        centre.y+side.y*Math.cos(theta)*rx*wander+front.y*Math.sin(theta)*rz*wander,
        centre.z+side.z*Math.cos(theta)*rx*wander+front.z*Math.sin(theta)*rz*wander);
    }
  }
  for(let j=0;j<rings;j++)for(let i=0;i<cols;i++){
    const i2=(i+1)%cols,a=j*cols+i,b=j*cols+i2,c=(j+1)*cols+i,d=(j+1)*cols+i2;index.push(a,c,b,b,c,d);
  }
  for(const [row,flip] of [[0,true],[rings,false]]){              // close both ends
    const centre=position.length/3,p=curve.getPoint(row/rings);position.push(p.x,p.y,p.z);
    for(let i=0;i<cols;i++){const a=row*cols+i,b=row*cols+(i+1)%cols;if(flip)index.push(centre,a,b);else index.push(centre,b,a);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setIndex(index);g.computeVertexNormals();return g;
}

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
  // An unknown joint name used to fall through as index -1, which becomes 65535
  // in an unsigned skin index and sends the renderer looking for a bone that is
  // not there. Naming it is cheaper than hunting it.
  const joint=name=>{const i=bones.indexOf(byName[name]);if(i<0)throw Error(`${definition.id}: no bone named ${name}`);return i;};
  const binding=(b,b2=null,w=1)=>[joint(b),joint(b2||b),clamp(w,0,1)];
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
  // A boot, not a ball on a slab. The old one was a sphere with a box under it
  // whose corners stuck out past the toe as a visible plinth, which gave every
  // resident in the silo the feet of a deep-sea diver. This is a last: swept
  // along the length of the foot rather than up it, with a heel, a ball, a toe
  // box that narrows, a vamp rising over the instep and a sole under all of it.
  const boot=(x,bone,sign)=>{
    const upper=dark,sole=dark.clone().multiplyScalar(.66),cols=16;
    const lastOf=list=>{
      const position=[],index=[];
      for(const [z,w,top,bottom] of list){
        const cy=(top+bottom)/2,ry=(top-bottom)/2;
        for(let i=0;i<cols;i++){const th=i/cols*TAU,c=Math.cos(th),s=Math.sin(th),n=2/2.7;
          position.push(x+w*Math.sign(s)*Math.abs(s)**n,cy+ry*Math.sign(c)*Math.abs(c)**n,z);}
      }
      for(let j=0;j<list.length-1;j++)for(let i=0;i<cols;i++){
        const i2=(i+1)%cols,a1=j*cols+i,b1=j*cols+i2,c1=(j+1)*cols+i,d1=(j+1)*cols+i2;index.push(a1,c1,b1,b1,c1,d1);}
      for(const [row,flip] of [[0,true],[list.length-1,false]]){
        const [z,,top,bottom]=list[row],centre=position.length/3;position.push(x,(top+bottom)/2,z);
        for(let i=0;i<cols;i++){const a1=row*cols+i,b1=row*cols+(i+1)%cols;if(flip)index.push(centre,a1,b1);else index.push(centre,b1,a1);}}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setIndex(index);g.computeVertexNormals();return g;
    };
    // [along the foot, half-width, top of the boot, bottom of it]
    add(lastOf([[-.078,.036,.130,.030],[-.058,.045,.148,.020],[-.028,.050,.150,.016],
                [ .012,.052,.128,.014],[ .056,.050,.096,.013],[ .100,.045,.070,.013],
                [ .137,.035,.050,.015],[ .158,.020,.034,.019]]),upper,bone,null,true);
    // The shaft round the ankle, and the sole under the whole of it.
    add(lastOf([[-.070,.038,.215,.120],[-.030,.047,.228,.120],[.010,.048,.210,.112],[.040,.044,.170,.104]]),
        suit?upper:upper.clone().multiplyScalar(1.12),bone,null,true);
    add(lastOf([[-.080,.034,.028,.004],[-.040,.046,.024,.002],[.020,.052,.022,.002],
                [ .090,.050,.021,.002],[ .138,.036,.024,.004],[.157,.019,.028,.011]]),sole,bone,null,true);
    box(x,.014,-.052,.086,.028,.062,sole.clone().multiplyScalar(.9),bone);           // the heel block
    if(!suit)for(let row=0;row<4;row++){                                             // laces across the instep
      const y=.112+row*.019,z=.070-row*.026;
      add(sleeve([V(x-.026,y,z),V(x,y+.006,z-.004),V(x+.026,y-.001,z-.010)],()=>.0028,{rings:4,cols:5}),under,bone);
    }
    else for(const y of [.175,.215])torus(x,y,.004,.050,.011,upper.clone().multiplyScalar(1.2),bone,Math.PI/2,1,1);
  };
  // A hand at rest is not a splayed paddle with four straight pegs on it. The
  // fingers curl, the middle one is longest, and the whole hand hangs slightly
  // in towards the thigh.
  const buildHand=(s,sign,x,color)=>{
    const bone='Hand'+s;
    // A hand hanging at rest is edge-on to the world: the palm faces the thigh,
    // so the blade of it is deep front-to-back and thin across. It used to be
    // built the other way round — a wide flat paddle presented to the camera
    // with four straight pegs fanned off the bottom, which is a rake, and it is
    // the first thing you see at conversation distance because the hands sit
    // right on the edge of the silhouette.
    add(sleeve([V(x,.874,.008),V(x+sign*.002,.828,.012),V(x+sign*.003,.780,.014)],
      t=>[.017-t*.002,.027+t*.013],{rings:8,cols:12}),color,bone);
    ell(x+sign*.003,.782,.016,.015,.013,.040,color,bone,12);                        // the knuckles
    for(let f=0;f<4;f++){
      // Index at the front, little at the back, and every one of them curling in
      // towards the palm rather than pointing at the floor.
      const zz=.046-f*.0196,len=[.060,.068,.064,.050][f],curl=[.019,.023,.023,.018][f];
      add(sleeve([V(x,.776,zz),V(x-sign*curl*.45,.776-len*.52,zz+.003),V(x-sign*curl,.776-len*.90,zz+.005)],
        ramp([[0,.0092],[.5,.0085],[.85,.0072],[1,.0054]]),{rings:6,cols:8}),color,bone);
    }
    // The thumb comes off the front of the palm and lies across it, not out to
    // the side like a spike.
    add(sleeve([V(x,.848,.040),V(x-sign*.009,.820,.060),V(x-sign*.016,.800,.070)],
      ramp([[0,.0128],[.6,.0102],[1,.0078]]),{rings:5,cols:8}),color,bone);
  };
  // ------------------------------------------------------------- the body
  // The clothed torso, as measured landmarks rather than one radius per height.
  // A man is about 50 cm across the shoulders, 37 across the chest and 26
  // through it, and comes in to 32 at the waist; the old profile ran 30 cm wide
  // from the hip to the armpit with no waist in it at all, which is most of why
  // every resident read as a box. Each entry is
  // [height, half-width, half-depth, how far the section sits forward of the
  // spine line, how square the corners are].
  const bust=female?.013:0,belly=clamp((a.build||1)-1,0,.4);
  const BODY=[
    [.795,.150*wide,.100,-.012,2.0],
    [.865,.170*wide,.114,-.010,2.0],                                   // seat, behind the spine line
    [.935,.176*wide,.120,-.004,2.0],
    [1.010,.163*wide+belly*.02,.116+belly*.03,.006,2.05],
    [1.090,(female?.138:.152)*wide+belly*.03,(female?.100:.106)+belly*.05,.006,2.1],   // waist
    [1.175,(female?.152:.162)*wide,.113+bust*1.1,.008,2.1],
    [1.265,.180*wide,.121+bust,.010,2.15],                             // chest
    [1.336,.182*wide,.116,.004,2.14],
    [1.392,.158*wide,.101,-.004,2.10],                                 // the armpit, not the shoulder
    [1.432,.128*wide,.086,-.008,2.08],
    [1.470,.081,.069,-.004,2.10],
  ];
  // The half-metre across a man's shoulders is the deltoid, not the ribcage, so
  // the torso stops narrower than that and the sleeve cap makes up the rest. The
  // first attempt widened the torso itself to shoulder width, which gave every
  // resident a hard square shelf with a corner on it — American football pads,
  // worn under a cardigan.
  // Invert the landmark list so any garment can be cut at any height on the
  // same body. This is what keeps a coat, the shirt under it and the belt round
  // both of them on one figure instead of three concentric tubes.
  const tForY=y=>{let lo=0,hi=1;for(let i=0;i<22;i++){const m=(lo+hi)/2;if(sectionAt(BODY,m)[0]<y)lo=m;else hi=m;}return (lo+hi)/2;};
  const bodyAt=y=>sectionAt(BODY,tForY(y));
  // How far forward the front of the body is at a given height. A section is
  // [y, halfWidth, halfDepth, centreZ, squareness], so the front is the centre
  // plus the depth — reading the depth alone left every button, badge, zip and
  // buckle up to a centimetre off where the chest actually is.
  const front=y=>{const[,,d,z]=bodyAt(y);return z+d;};
  // Cut a garment panel between two heights. `shape` may add ease, flare the
  // hem, relax the waist or square the shoulder — all of it relative to the one
  // body underneath.
  const cut=(y0,y1,count,shape)=>{
    const out=[];
    for(let i=0;i<=count;i++){const f=i/count,y=y0+(y1-y0)*f,[,w,d,z,square]=bodyAt(y);out.push(shape(y,w,d,z,square,f));}
    return out;
  };
  const ramp=list=>t=>{
    for(let i=0;i<list.length-1;i++){
      const [t0,v0]=list[i],[t1,v1]=list[i+1];
      if(t<=t1||i===list.length-2){const f=clamp((t-t0)/Math.max(1e-6,t1-t0),0,1);return v0+(v1-v0)*f*f*(3-2*f);}
    }
    return list[list.length-1][1];
  };
  const G=GARMENTS[suit?'suit':a.outfit]||GARMENTS.shirt;
  // Below the hips a garment stops following the pelvis and starts swinging on
  // its own, which is what the Coat bones are for: a long coat has to open
  // round a stride rather than clamp to it.
  const skirtBind=(y,x)=>y>.97?torso(y):binding((x??0)>0?'CoatL':'CoatR','Hips',clamp((.97-y)/.16,0,1));
  // Three cloths, not one. Everything used to be the coat colour with the
  // trousers at 64 per cent of it, so each resident was a single hue from collar
  // to boot and the whole silo was one crowd in one uniform.
  const base=a.coat??0x66715f;
  const trouser=new THREE.Color(suit||G.onePiece?coat.getHex():a.trouser??tone(base,-.40,-.02));
  const under=new THREE.Color(suit?0xd4d0b6:a.shirt??tone(base,G.onePiece?.16:.36,-.24));
  const outer=coat;
  const seam=c=>c.clone().multiplyScalar(.80);

  // ---------------------------------------------------------- the underlayer
  // Built only where something open reveals it. Under a closed garment it is two
  // surfaces a few millimetres apart competing for the same pixels, which came
  // out as a rash of torn patches across the belly of every shirt in the silo.
  // The shirt ends at the hip whatever the coat over it does. Cutting it to the
  // outer garment's hem sent the mayor's undershirt to the floor inside her
  // robe, where it hung off the pelvis and went through the chair when she sat.
  const shirtHem=clamp(G.hem-.02,.86,.95);
  if(G.open)add(garment(cut(shirtHem,1.462,13,(y,w,d,z,sq)=>[y,w+.004,d+.004,z,sq]),
      {rings:24,cols:30,capTop:true,wrinkle:.007,phase:1.3}),under,torso,null,true);

  // ------------------------------------------------------------ the trousers
  for(const [s,sign] of [['L',1],['R',-1]]){
    const hip=points['Thigh'+s],knee=points['Shin'+s],ankle=points['Foot'+s];
    const legBind=y=>y>.53?binding('Thigh'+s,'Shin'+s,clamp((y-.45)/.13,0,1)):binding('Shin'+s,'Foot'+s,clamp((y-.10)/.13,0,1));
    // A leg is not a cone. The thigh is the thickest part of it, the knee is
    // narrower than the thigh above it, the calf swells behind the shin, and the
    // trouser breaks over the boot instead of stopping in mid-air.
    const legR=ramp([[0,.099*wide],[.10,.100*wide],[.40,.075],[.54,.067],[.67,.073],[.86,.058],[1,.061+G.cuffLeg]]);
    const leg=sleeve([V(hip.x,.902,-.004),V(hip.x*.99,.78,.002),V(knee.x,knee.y+.02,knee.z-.004),V(ankle.x,.30,.010),V(ankle.x,.115,.016)],
      t=>[legR(t),legR(t)*(t<.5?1.0:1.04)],{rings:22,cols:16,wrinkle:G.legWrinkle,phase:sign*2.1});
    add(leg,trouser,legBind,null,true);
    // The crease down the front of a pressed leg, and the outside seam.
    if(G.crease)for(const [dz,shade] of [[.055,1.05],[-.052,.94]])
      add(sleeve([V(hip.x,.90,dz*1.05),V(knee.x,.56,dz),V(ankle.x,.16,dz*.82)],()=>.0055,{rings:9,cols:6}),trouser.clone().multiplyScalar(shade),legBind,null,true);
    boot(ankle.x,'Foot'+s,sign);
  }
  // The seat and crotch, so the two legs belong to one pair of trousers rather
  // than hanging off the hips as separate pipes with daylight between them.
  // Wide enough at the crotch to hold both thighs and close to the body at the
  // waist. Cut the other way round, the leg tubes came out through the hips as a
  // ragged band right where the belt goes.
  add(garment(cut(.840,.974,9,(y,w,d,z,sq,f)=>[y,w+.010+(1-f)*.018,d+.010+(1-f)*.016,z,sq]),
    // No cap on the bottom: the legs fill it. A disc across the hips stuck out
    // five millimetres past the thighs and its unlit underside read as a dark
    // bar ruled across everybody's hips.
    {rings:14,cols:26,wrinkle:.006,phase:2.4}),trouser,y=>y>.955?torso(y):binding('Hips'),null,true);
  // A waistband, on every pair of trousers whether or not a belt goes over it.
  // Without one the trouser front just stopped, and through the front of an open
  // cardigan that read as a dark rectangle hanging on the hips.
  if(!G.onePiece){
    add(garment(cut(.952,.986,3,(y,w,d,z,sq)=>[y,w+.013,d+.013,z,sq]),{rings:4,cols:26}),
      trouser.clone().multiplyScalar(1.10),'Hips',null,true);
    ell(0,.978,front(.978)+.020,.0075,.0075,.004,trouser.clone().multiplyScalar(.7),'Hips',8);
  }

  // -------------------------------------------------------------- the sleeves
  for(const [s,sign] of [['L',1],['R',-1]]){
    const upper=points['UpperArm'+s],elbow=points['Forearm'+s],hand=points['Hand'+s];
    // Above the joint the cloth is the shoulder of the garment and belongs to the
    // chest; below it, it is the sleeve and belongs to the arm. Binding the whole
    // thing to the arm tears the yoke open the moment a resident reaches.
    const armBind=(y,x)=>y>1.30?binding('UpperArm'+s,'Chest',clamp((Math.abs(x)-.086)/.072,0,1))
      :y>1.1?binding('UpperArm'+s,'Forearm'+s,clamp((y-1.07)/.09,0,1))
            :binding('Forearm'+s,'Hand'+s,clamp((y-.85)/.09,0,1));
    // Mechanical rolls its sleeves. That used to be read straight off the
    // appearance; the wardrobe took it over and quietly stopped honouring it.
    const bare=a.shortSleeves&&!suit,cloth=G.sleeveCloth==='under'?under:outer;
    const sleeveRun=bare?.46:G.sleeve;
    // The deltoid is part of the sleeve, not a sphere stuck on the end of it.
    // The old ball sat proud of the shoulder on every resident and read as a
    // puffed Victorian sleeve head from any angle.
    // A shoulder is not a cap stuck on the end of a tube. This starts beside the
    // neck, runs out along the line the shoulder actually takes and only then
    // turns down the arm, so the yoke, the shoulder and the sleeve are one
    // surface. Every earlier attempt built them as three overlapping pieces and
    // they met in a hard shelf with a corner on it.
    const armR=ramp([[0,.030],[.09,.048*wide],[.21,.056*wide],[.33,.050*wide],[.45,.045],[.56,.043],[.63,.042],[.81,.038],[.95,.034],[1,.034+G.cuffArm]]);
    // While the sweep is still running out across the shoulder its section is
    // vertical, so flattening it there is what turns a round roll of cloth lying
    // on the collarbones into a shoulder. The frame turns with the path, so by
    // the time it is running down the arm the section is round again.
    const flatten=ramp([[0,.66],[.16,.74],[.34,1],[1,1]]),deepen=ramp([[0,1.12],[.16,1.08],[.34,1],[1,1]]);
    const armSection=t=>[armR(t)*flatten(t),armR(t)*deepen(t)];
    const path=[V(sign*.046,1.420,-.006),V(sign*.110,1.416,-.004),V(sign*.164,1.390,-.001),
                V(upper.x+sign*.004,1.322,.001),V(elbow.x,elbow.y+.012,elbow.z),
                V((elbow.x+hand.x)/2,1.00,.014),V(hand.x,.872,.018)];
    if(sleeveRun>=1||suit)add(sleeve(path,armSection,{rings:22,cols:14,wrinkle:G.armWrinkle,phase:sign*3.7}),cloth,armBind,null,true);
    else{
      // A short or three-quarter sleeve ends where the cloth ends; the arm
      // under it is skin, and it is the same arm, not a thinner substitute.
      const stop=clamp(sleeveRun,.3,.99),curve=new THREE.CatmullRomCurve3(path,false,'catmullrom',.4);
      const slice=(t0,t1,n)=>Array.from({length:n+1},(_,i)=>curve.getPoint(t0+(t1-t0)*i/n));
      add(sleeve(slice(stop-.06,1,5),t=>armR(stop-.06+(1.06-stop)*t)*.87,{rings:13,cols:12}),bare?skin:under,armBind,null,true);
      add(sleeve(slice(0,stop,4),t=>armSection(stop*t).map(r=>r*(t>.9?1.06:1)),{rings:14,cols:14,wrinkle:G.armWrinkle,phase:sign*3.7}),cloth,armBind,null,true);
    }
    if(a.tattoo&&!suit)for(let i=0;i<5;i++)box(hand.x,1.04+i*.025,.062,.033,.004,.003,dark,'Forearm'+s,i%2?.6:-.6);
    buildHand(s,sign,hand.x,suit?dark:skin);
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
  {const g=new THREE.SphereGeometry(1,26,14,0,Math.PI*2,0,Math.PI*.60);
   g.scale(.118*wide,.074,.098);g.translate(0,1.382,-.004);add(g,outer,'Chest');}
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
    // The pack sits against the back and the harness follows the chest. Both were
    // placed against the old lathe torso and, on a body with a chest and a waist
    // in it, they hung in mid-air: two flat black planks floating a centimetre
    // off the front and a crate behind the shoulder blades.
    {const [,,bd,bz]=bodyAt(1.20),back=bz-bd-G.ease;
     // The pack is a carried object: a case against the back with two air
     // bottles strapped to it, not one black slab the width of the shoulders.
     const shell=new THREE.BoxGeometry(.244,.40,.132,2,3,2);
     shell.translate(0,1.205,back-.074);add(shell,dark,'Chest',null,true);
     for(const sign of [-1,1])
       add(sleeve([V(sign*.070,1.036,back-.150),V(sign*.070,1.372,back-.150)],
         ramp([[0,.046],[.06,.052],[.94,.052],[1,.046]]),{rings:8,cols:12}),
         coat.clone().multiplyScalar(.86),'Chest',null,true);
     for(const y of [1.08,1.31])
       add(garment([[y-.014,.126,.058,back-.150,2.4],[y+.014,.126,.058,back-.150,2.4]],{rings:2,cols:16}),
         dark.clone().multiplyScalar(1.3),'Chest',null,true);
     box(0,1.226,back-.146,.068,.090,.040,dark.clone().multiplyScalar(1.5),'Chest');}
    // Two webbing straps over the shoulders and down the chest, lying on the
    // suit the whole way rather than cutting the corner across it.
    for(const sign of [-1,1]){
      const rail=[];
      for(let i=0;i<=7;i++){
        const y=1.402-i*.050,[,w,d,z]=bodyAt(y),e=G.ease*.80+.004;
        const th=Math.asin(clamp(sign*.118/(w+e),-.95,.95));
        rail.push(V((w+e)*Math.sin(th),y,z+(d+e)*Math.cos(th)));
      }
      add(sleeve(rail,()=>[.025,.0055],{rings:9,cols:8}),dark,torso,null,true);
      const [,w,d,z]=bodyAt(1.092),e=G.ease*.80+.010;
      const th=Math.asin(clamp(sign*.100/(w+e),-.95,.95));
      box((w+e)*Math.sin(th),1.092,z+(d+e)*Math.cos(th),.062,.044,.016,new THREE.Color(0xb29b62),torso);
    }
    // Air lines from the pack over each shoulder into the collar.
    // A short run from the top of the pack, over the shoulder, into the collar
    // ring — not a loop of hose swinging free down the chest.
    {const [,,bdT,bzT]=bodyAt(1.34),behind=bzT-bdT-.100;
     for(const sign of [-1,1])
       add(sleeve([V(sign*.072,1.316,behind),V(sign*.096,1.392,behind*.55),
                   V(sign*.098,1.428,.006),V(sign*.052,1.430,.052)],
         ramp([[0,.017],[1,.012]]),{rings:12,cols:8}),dark,'Chest',null,true);}
    // The suit closes round the neck: a soft collar up to the helmet's seal, so
    // no skin shows between the two.
    add(garment(cut(1.398,1.486,5,(y,w,d,z,sq,f)=>[y,.074-f*.004,.066-f*.004,z+.004,2.0]),
      {rings:6,cols:20,capTop:false}),coat,y=>binding('Neck','Chest',clamp((y-1.39)/.09,0,1)),null,true);
  }else{
    // A trim that follows the front edge of an open garment, from the hem up to
    // the collar. A cardigan band, a coat facing and a waistcoat edge are all
    // this line in different widths, and it is what stops an open garment
    // reading as a tube with a slot cut down it.
    const frontEdge=(width,shade,y0=G.hem,y1=G.neck)=>{
      for(const sign of [-1,1]){
        const rail=[];
        for(let i=0;i<=8;i++){
          const f=i/8,y=y0+(y1-y0)*f,[,w,d,z]=bodyAt(y),fall=(1-f)**2;
          const e=G.ease*(.76+.24*f)+G.flare*fall+(G.hang?(1-f)*G.hang*.014:0);
          const th=G.open+width*.5;
          rail.push(V(sign*(w+e)*Math.sin(th)*1.012,y,z+(d+e)*Math.cos(th)*1.012));
        }
        add(sleeve(rail,ramp([[0,width*.42],[1,width*.34]]),{rings:9,cols:7,squash:.42}),shade,G.hem<.8?skirtBind:torso,null,true);
      }
    };
    // ------------------------------------------------------- the outer layer
    // A one-piece runs past the waist and over the top of the legs, because the
    // hem of a coverall is at the ankle. Cutting it at the hip left the inside of
    // its own hem on show as a dark slot right across the middle of Mechanical.
    const hemAt=G.onePiece?.782:G.hem;
    const panel=cut(hemAt,G.neck,15,(y,w,d,z,square,f)=>{
      const fall=(1-f)**2,relax=G.hang?(1-f)*G.hang:0;
      const e=G.ease*(.76+.24*f)+G.flare*fall;
      return [y,w+e+relax*.013,d+e*.92+relax*.011,z,square];
    });
    add(garment(panel,{from:G.open,to:TAU-G.open,rings:26,cols:30,
      thickness:G.open?G.thickness:0,capTop:!G.open,wrinkle:G.wrinkle,phase:.7}),
      outer,hemAt<.8?skirtBind:torso,null,true);
    // A ribbed hem and cuffs: the one thing that says knitwear rather than cloth.
    if(G.ribbed)for(let i=0;i<14;i++){
      const th=G.open+(TAU-G.open*2)*(i+.5)/14,[,w,d,z]=bodyAt(G.hem+.012);
      add(sleeve([V((w+G.ease)*Math.sin(th)*1.01,G.hem+.002,z+(d+G.ease)*Math.cos(th)*1.01),
                  V((w+G.ease)*Math.sin(th)*1.01,G.hem+.044,z+(d+G.ease)*Math.cos(th)*1.01)],
        ()=>.0055,{rings:3,cols:5}),seam(outer),G.hem<.8?skirtBind:torso,null,true);
    }

    // ---------------------------------------------------------- the collar
    // Every garment here ended at a flat horizontal cut round the neck, so the
    // neck rose out of a hole. A collar is the join: it stands off the neck, it
    // has an outside and an inside, and its shape is most of what tells a tunic
    // from a jumper from a lab coat at across-the-room distance.
    if(G.collar==='stand'||G.collar==='fold'){
      // A band standing round the neck, and for a coverall a second one folded
      // down over it.
      // One band standing against the neck, and — on a work collar — one fold
      // lying down over it. Stacking three rings of cloth round the throat gave
      // Mechanical a set of horizontal shelves under the chin.
      const top=G.neck+.034;
      add(garment([[G.neck-.010,.062,.055,.004,2.0],[top-.012,.064,.056,.004,2.0],[top,.067,.058,.004,2.0]],
        {rings:6,cols:20,thickness:.005}),outer,y=>binding('Neck','Chest',clamp((y-1.39)/.09,0,1)),null,true);
      if(G.collar==='fold')
        add(garment([[G.neck-.044,.092,.079,.004,2.1],[G.neck-.012,.078,.067,.004,2.0],[top-.004,.068,.059,.004,2.0]],
          {rings:7,cols:20,thickness:.006}),outer.clone().multiplyScalar(.93),'Chest',null,true);
    }
    if(G.collar==='crew')add(garment(cut(1.400,1.436,4,(y,w,d,z,sq,f)=>[y,.072+f*.003,.061+f*.003,z+.004,2.0]),
      {rings:5,cols:20,thickness:.007}),seam(outer),y=>binding('Neck','Chest',clamp((y-1.39)/.09,0,1)),null,true);
    if(G.collar==='open'){
      // A soft shirt collar: a low band, and a point falling on each side of the
      // opening, lying on the chest rather than standing up off it.
      add(garment(cut(1.398,1.428,4,(y,w,d,z,sq,f)=>[y,.076,.064,z+.004,2.0]),{rings:5,cols:20,thickness:.005,
        }),outer,y=>binding('Neck','Chest',clamp((y-1.39)/.09,0,1)),null,true);
      for(const sign of [-1,1]){
        const g=new THREE.BufferGeometry(),pts=[[sign*.020,1.418,.086],[sign*.086,1.408,.056],[sign*.040,1.326,.098],[sign*.014,1.402,.088]];
        g.setAttribute('position',new THREE.Float32BufferAttribute(pts.flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
        add(g,seam(outer),'Chest',null,true);
      }
    }
    if(G.collar==='lapel'){
      // A lapel is the front edge of the coat folded back on itself, from the
      // neck down to a break at the chest, with a notch cut where the collar
      // meets it. As a flat triangle it read as a paper cut-out lying on the
      // chest, so it is swept with thickness like the cloth it is.
      for(const sign of [-1,1]){
        const [,w,d]=bodyAt(1.30),[,wn,dn]=bodyAt(1.416),e=G.ease;
        const fold=[V(sign*(.020+wn*.12),1.422,dn+e+.006),V(sign*(wn*.62),1.404,(dn+e)*.62),
                    V(sign*(w*.50),1.352,(d+e)*.76),V(sign*(w*.34),1.290,(d+e)*.90),V(sign*.028,1.252,d+e+.004)];
        add(sleeve(fold,ramp([[0,.014],[.30,.019],[.72,.016],[1,.009]]),{rings:11,cols:8,squash:.34}),seam(outer),'Chest',null,true);
      }
    }
    if(G.collar==='shawl'){
      // A shawl collar is one rolled band with no notch in it: it runs from the
      // break on one side of the chest, up and round the back of the neck, and
      // down to the break on the other. That continuity is the whole difference
      // between the mayor's robe and a coat.
      const [,w,d]=bodyAt(1.28),[,wn,dn]=bodyAt(1.418),e=G.ease,roll=[];
      for(let i=0;i<=16;i++){
        const f=i/16,th=Math.PI*(f*2-1);                                  // -pi at the left break, 0 behind the neck
        const near=Math.abs(Math.cos(th/2));                              // 1 at the breaks, 0 behind the neck
        const y=1.418-near*near*.150,r=1-near*.34;
        roll.push(V(Math.sin(th/2)*(wn*.86+e)*(1+near*1.5)*r,y,(dn*.80+e)*Math.cos(th)*r+near*near*(d+e)*.58));
      }
      add(sleeve(roll,ramp([[0,.010],[.5,.022],[1,.010]]),{rings:16,cols:9,squash:.52}),seam(outer),
        y=>binding('Chest','Neck',clamp((1.44-y)/.10,0,1)),null,true);
    }
    if(G.collar==='band')frontEdge(.030,outer.clone().multiplyScalar(.90));
    if(G.collar==='v')frontEdge(.022,outer.clone().multiplyScalar(.90),G.hem,1.340);
    if(['lapel','shawl'].includes(G.collar))frontEdge(.020,outer.clone().multiplyScalar(.92),G.hem,1.270);

    // ---------------------------------------------------------- the closure
    if(G.closure==='zip'){
      add(sleeve([V(0,G.hem+.010,front(G.hem)+G.ease+.004),V(0,1.20,front(1.20)+G.ease+.010),V(0,1.412,front(1.412)+G.ease+.004)],
        ()=>.0075,{rings:9,cols:6,squash:.5}),seam(outer),torso,null,true);
      ell(0,1.386,front(1.386)+G.ease+.014,.010,.018,.007,new THREE.Color(0x8d8a7c),torso,8);
    }
    if(G.closure==='placket'){
      add(sleeve([V(0,G.hem+.014,front(G.hem)+G.ease+.003),V(0,1.22,front(1.22)+G.ease+.009),V(0,1.400,front(1.400)+G.ease+.003)],
        ()=>.014,{rings:9,cols:7,squash:.32}),seam(outer),torso,null,true);
      for(let i=0;i<5;i++){const y=G.hem+.060+i*.072;if(y>1.38)break;
        ell(0,y,front(y)+G.ease+.015,.0062,.0062,.0035,seam(seam(outer)),torso,8);}
    }
    if(G.closure==='button')for(let i=0;i<4;i++){const y=1.030+i*.070;
      ell(0,y,front(y)+G.ease+.012,.0060,.0060,.0034,seam(seam(outer)),torso,8);}

    // ------------------------------------------------------------ the belt
    if(G.belt){
      const wide2=G.belt==='duty'?.026:G.belt==='web'?.020:.013,y=G.belt==='duty'?.952:.966;
      add(garment(cut(y-wide2,y+wide2,3,(yy,ww,dd,zz,sq)=>[yy,ww+G.ease+.019,dd+G.ease+.017,zz,sq]),
        {rings:4,cols:26}),G.belt==='plain'?seam(outer):dark,'Hips',null,true);
      box(0,y,front(y)+G.ease+.030,.052,wide2*1.9,.014,new THREE.Color(G.belt==='duty'?0xb9b2a0:0x9c8a60),'Hips');
      if(G.belt==='duty'){box(-.168,.918,.030,.070,.128,.082,dark,'Hips');ell(.170,.952,.022,.036,.050,.042,dark,'Hips',12);}
      if(G.belt==='web'){box(-.176,.906,.012,.078,.132,.098,new THREE.Color(0x67513c),'Hips');
        for(let i=0;i<3;i++)box(-.190+i*.014,.958,.066,.009,.150,.015,dark,'Hips');}
    }

    // ---------------------------------------------------------- the pockets
    // Pockets used to be flat cards floating a centimetre off the chest, and in
    // profile you could see daylight behind them. These sit on the body's own
    // surface and have a flap with thickness.
    // A pocket lies on the garment it is sewn to. A flat box stuck on the chest
    // shows daylight behind it the moment the resident turns side-on, which is
    // what every pocket in the silo used to do.
    const pocket=(cx,cy,halfW,halfH,bind,flap=true)=>{
      const cols=7,rows=7,position=[],index=[],cloth=outer.clone().multiplyScalar(.93);
      const at=(u,v,push)=>{
        const y=clamp(cy+halfH*v,.20,1.45),[,w,d,z]=bodyAt(y);
        const ew=w+G.ease+push,ed=d+G.ease*.92+push;
        const th=Math.asin(clamp((cx+halfW*u)/(w+G.ease),-.97,.97));
        return [ew*Math.sin(th),y,z+ed*Math.cos(th)];
      };
      for(const push of [.008,.0015])for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++)position.push(...at(i/cols*2-1,j/rows*2-1,push));
      const face=(base,flip)=>{for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
        const a1=base+j*(cols+1)+i,b1=a1+1,c1=a1+cols+1,d1=c1+1;
        if(flip)index.push(a1,b1,c1,b1,d1,c1);else index.push(a1,c1,b1,b1,c1,d1);}};
      const back=(rows+1)*(cols+1);face(0,false);face(back,true);
      // Walk the perimeter once, in order, so every rim quad is wound the same
      // way. Stitching the four edges independently left half of them inside
      // out, and the averaged normals turned each pocket into a dark hole.
      const loop=[];
      for(let i=0;i<=cols;i++)loop.push(i);
      for(let j=1;j<=rows;j++)loop.push(j*(cols+1)+cols);
      for(let i=cols-1;i>=0;i--)loop.push(rows*(cols+1)+i);
      for(let j=rows-1;j>=1;j--)loop.push(j*(cols+1));
      for(let k=0;k<loop.length;k++){
        const a1=loop[k],b1=loop[(k+1)%loop.length];
        index.push(a1,b1,b1+back,a1,b1+back,a1+back);
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(position,3));g.setIndex(index);g.computeVertexNormals();
      add(g,cloth,bind,null,true);
      if(flap){
        const f=new THREE.BufferGeometry(),fp=[];
        for(const push of [.013,.004])for(let i=0;i<=cols;i++){fp.push(...at(i/cols*2-1,1.10,push));fp.push(...at(i/cols*2-1,.80,push));}
        f.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));
        const idx=[],stride=(cols+1)*2;
        for(const [base,flip] of [[0,false],[stride,true]])for(let i=0;i<cols;i++){
          const a1=base+i*2,b1=a1+1,c1=a1+2,d1=a1+3;
          if(flip)idx.push(a1,b1,c1,b1,d1,c1);else idx.push(a1,c1,b1,b1,c1,d1);}
        for(let i=0;i<cols;i++){const a1=i*2+1,b1=a1+2;idx.push(a1,b1,a1+stride,b1,b1+stride,a1+stride);}
        f.setIndex(idx);f.computeVertexNormals();add(f,cloth.clone().multiplyScalar(.90),bind,null,true);
      }
    };
    const chestPocket=(x,y)=>pocket(x,y,.040,.046,'Chest');
    const hipPocket=(x,y)=>pocket(x,y,.048,.055,G.hem<.8?skirtBind:torso,false);
    if(G.pockets==='bib')for(const sign of [-1,1])chestPocket(sign*.098*wide,1.268);
    if(G.pockets==='flap')for(const sign of [-1,1])chestPocket(sign*.100*wide,1.276);
    if(G.pockets==='chest')chestPocket(-.098*wide,1.272);
    if(G.pockets==='patch')for(const sign of [-1,1])hipPocket(sign*.118*wide,G.hem+.115);
    if(G.pockets==='welt')for(const sign of [-1,1])pocket(sign*.086*wide,1.072,.033,.009,torso,false);
    if(G.thighPocket)for(const [s,sign] of [['L',1],['R',-1]]){
      // A tool pocket wraps the thigh rather than hanging off the front of it.
      const x=points['Thigh'+s].x,leg=sleeve([V(x+sign*.022,.652,.006),V(x+sign*.024,.762,.008)],
        t=>[.069,.064],{rings:4,cols:12});
      add(leg,outer.clone().multiplyScalar(.93),'Thigh'+s,null,true);
      add(sleeve([V(x+sign*.024,.762,.006),V(x+sign*.025,.782,.008)],t=>[.072,.067],{rings:2,cols:12}),
        outer.clone().multiplyScalar(.88),'Thigh'+s,null,true);
    }
    if(G.epaulettes)for(const sign of [-1,1])
      box(sign*.150*wide,1.404,.006,.058,.012,.104,seam(outer),'Chest',sign*.10);

    // --------------------------------------------------------- the insignia
    if(a.outfit==='uniform')ell(.104*wide,1.306,front(1.306)+G.ease+.012,.024,.032,.006,new THREE.Color(0xbca16a),'Chest',10);
    if(a.chain){for(let i=0;i<17;i++){const t=i/16*Math.PI,y=1.424-Math.sin(t)*.136;
      ell(Math.cos(t)*.100,y,front(Math.min(y,1.44))+G.ease+.012,.011,.011,.004,new THREE.Color(0xa98c52),'Chest',8);}
      ell(0,1.276,front(1.276)+G.ease+.014,.025,.035,.007,new THREE.Color(0xb6a167),'Chest');}
    if(a.outfit==='medical'){
      for(const sign of [-1,1])add(sleeve([V(sign*.046,1.452,.082),V(sign*.078,1.330,.116),V(sign*.062,1.222,.140)],
        ()=>.0062,{rings:7,cols:6}),dark,'Chest',null,true);
      {const [,,bd,bz]=bodyAt(1.222);ell(.062,1.216,bz+bd+G.ease+.014,.019,.019,.011,dark,'Chest',10);}
    }
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
    // A floor-length robe hangs from the hips, so sitting drops its hem through
    // the floor. Swinging the skirt bones forward lays it over the lap and down
    // the front of the chair, which is where it would actually be. Only the
    // three long garments weight anything to these bones, so this does nothing
    // to the rest of the cast.
    for(const s of ['L','R'])m.rotate('Coat'+s,-.95);
    for(const s of ['L','R']){m.rotate('Thigh'+s,-Math.PI*.48);m.rotate('Shin'+s,Math.PI*.49);m.rotate('Foot'+s,-.03);m.rotate('UpperArm'+s,-.19);m.rotate('Forearm'+s,-1.28);m.rotate('Hand'+s,1.12);}
    m.rotate('Spine',.055);m.rotate('Head',.07);
  }else if(pose==='work'){m.rotate('Spine',.09);m.rotate('UpperArmR',-.42);m.rotate('ForearmR',-.92+Math.sin(time*2.3)*.17);m.rotate('UpperArmL',-.28);m.rotate('ForearmL',-.75);m.rotate('Head',.10);}
  else if(pose==='talk'){m.rotate('ForearmR',-.58+Math.sin(time*1.1)*.16);m.rotate('UpperArmR',-.17);}
  else if(pose==='watch'){m.rotate('Head',-.04);}
  actor.model.updateWorldMatrix(true,true);
}
