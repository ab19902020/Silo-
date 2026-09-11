import * as THREE from '../vendor/three.module.js';
import { Kit, addSign, fixture, pipe } from './kit.js';
import { wallWriting } from './environment-lore.js';
import { SILO, TAU } from './data.js';

// Back-of-house circulation is inferred. It gives the six wings a second
// physical connection instead of turning every department into a dead end.
export const PASSAGE = Object.freeze({inner:52,outer:55.2,height:3.7});
// The removable warning plate conceals a small breach in an otherwise intact
// dead-end wall. Exact wording and surveyed offsets are not publicly verified.
export const SPUR=Object.freeze({level:144,angle:Math.PI/6,half:1.45,inner:55.2,outer:65.4,height:3.2,openingHalf:.7,openingHeight:2.15,throat:3.8});
export const breach={open:false,amount:0};
export const hasRearPassage = (level,type) => level !== 1 && type !== 'cafeteria';
export function buildPassages(m,level,types){
  const root=new THREE.Group(),k=new Kit(m),{inner:R,outer:O,height:H}=PASSAGE;
  const openings=types.flatMap((type,w)=>hasRearPassage(level,type)?[[w*TAU/6,1.55/R]]:[]);
  k.arc('floor',R,O,.3,-.3);k.arc('darkConcrete',R,O,.2,H);
  if(level===SPUR.level){const gap=SPUR.half/O;k.arc('darkConcrete',O,O+.18,H,0,SPUR.angle+gap,TAU-gap*2,144);}
  else k.arc('darkConcrete',O,O+.18,H,0);
  for(let w=0;w<6;w++){
    const a=w*TAU/6,next=a+TAU/6,gap=hasRearPassage(level,types[w])?1.55/R:0;
    const nextGap=hasRearPassage(level,types[(w+1)%6])?1.55/R:0;
    k.arc('pale',R-.16,R,H,0,a+gap,next-nextGap-a-gap,24);
    if(gap){
      const connector=new Kit(m),ry=Math.PI/2-a;
      connector.box('floor',0,-.15,26,3.1,.3,4.4);
      for(const side of [-1,1])connector.box('pale',side*1.55,H/2,25.25,.16,H,2.5);
      connector.box('darkConcrete',0,H,25.25,3.2,.18,2.5);
      fixture(connector,0,3.3,25.3,1.6);
      const g=connector.group();g.position.set(Math.cos(a)*SILO.deckOuter,0,Math.sin(a)*SILO.deckOuter);g.rotation.y=ry;root.add(g);
      const mount=new Kit(m);mount.box('darkMetal',0,2.7,26.76,2.65,.46,.08);
      for(const x of [-1,1])mount.box('metal',x,3.2,26.76,.025,1,.025);g.add(mount.group());
      const signPoint=new THREE.Vector3(0,2.7,26.7).applyAxisAngle(new THREE.Vector3(0,1,0),ry).add(g.position);
      addSign(root,`GALLERY ${String.fromCharCode(65+w)} · ${String(level).padStart(3,'0')}`,signPoint.toArray(),2.45,.32,ry);
    }
  }
  for(let j=0;j<48;j++){
    const a=(j+.5)*TAU/48,r=(R+O)/2,ry=Math.PI/2-a;
    // Compression ribs, pipe hangers and pools of light along the curve.
    for(const rr of [R+.06,O-.06])k.box('concrete',Math.cos(a)*rr,H/2,Math.sin(a)*rr,.16,H,.15,ry);
    k.box('concrete',Math.cos(a)*r,H-.08,Math.sin(a)*r,.17,.25,O-R,ry);
    if(j%2===0)fixture(k,Math.cos(a)*r,H-.3,Math.sin(a)*r,1.2,false,j%8===0);
    if(j%4===0){
      const signPoint=[Math.cos(a)*(O-.14),1.9,Math.sin(a)*(O-.14)];
      addSign(root,`←  ${String(level).padStart(3,'0')}  →`,signPoint,1.7,.34,ry+Math.PI);
    }
  }
  for(const y of [2.8,3.12]){const gap=level===SPUR.level?SPUR.half/O:0;k.arc('rust',O-.42,O-.31,.095,y,SPUR.angle+gap,TAU-gap*2,144);}
  root.userData.interactions=[];
  if(level===SPUR.level){
    const {angle:a,half,inner:I,outer:X,height:SH,openingHalf:Q,openingHeight:OH,throat}=SPUR,mid=(I+X)/2,len=X-I;
    const spur=new THREE.Group();spur.name='digger-passage';spur.rotation.y=Math.PI/2-a;root.add(spur);
    const sk=new Kit(m);                                   // local +z runs radially outward
    sk.box('floor',0,-.15,mid,half*2,.3,len);
    sk.box('darkConcrete',0,SH,mid,half*2+.5,.22,len);
    for(const side of [-1,1])sk.box('pale',side*(half+.11),SH/2,mid,.22,SH,len);
    for(let z=I+2.2;z<X-1;z+=3.6)fixture(sk,0,SH-.28,z,1.1,false);
    for(const side of [-1,1])pipe(sk,side*(half-.25),mid,SH-.5,len-.6,.11);
    for(const side of [-1,1])sk.box('darkConcrete',side*(half+Q)/2,SH/2,X-.13,half-Q,SH,.26);
    sk.box('darkConcrete',0,(OH+SH)/2,X-.13,Q*2,SH-OH,.26);
    // A real dark throat, with visible wall thickness and support underfoot.
    // There is no black card or disappearing whole wall across the opening.
    sk.box('darkConcrete',0,-.17,X+throat/2,Q*2,.34,throat);
    for(const side of [-1,1])sk.box('darkConcrete',side*(Q+.12),OH/2,X+throat/2,.24,OH,throat);
    sk.box('darkConcrete',0,OH+.11,X+throat/2,Q*2,.22,throat);
    sk.box('darkConcrete',0,OH/2,X+throat,Q*2,OH,.22);
    for(const side of [-1,1])for(let i=0;i<9;i++)sk.box('rock',side*(Q+.035+(i%3)*.017),.14+i*.235,X-.16,.10,.12+(i%2)*.07,.33);
    for(let i=0;i<8;i++)sk.box('rock',(i/7-.5)*1.28,OH+.035+(i%3)*.014,X-.15,.12,.09,.35);
    for(const side of [-1,1])for(let y=.28;y<3;y+=.43)sk.box('metal',side*(Q+.1),y,X-.275,.028,.06,.025);
    const panel=new THREE.Group();panel.name='removable-warning-sign';panel.position.set(1.25,0,X-.31);panel.rotation.y=Math.PI-(breach.open?Math.PI/2:0);spur.add(panel);
    addSign(panel,'DANGER\nDO NOT ENTER',[1.25,1.24,0],2.38,2.38,0,{background:'#a99b70',color:'#252921',font:'bold 125px Arial'});
    const pk=new Kit(m);for(const x of [.12,2.38])for(const y of [.16,2.3])pk.cylinder('rust',x,y,.04,.035,.028,Math.PI/2);
    for(const x of [.08,2.42])pk.box('rust',x,1.24,-.03,.045,2.43,.08);panel.add(pk.group());
    root.userData.breachPanel=panel;
    root.userData.interactions.push({position:[Math.cos(a)*(X-2.4),1.5,Math.sin(a)*(X-2.4)],...(breach.open?{label:'Step through the concealed opening',destination:'excavator'}:{label:'Move the warning sign aside',action:'breach'})});
    for(const [side,z,words] of [[-1,I+3.2,'MARA  /  ELI\nTOMAS  /  NELL\nWE KEPT YOUR PLACE'],[1,X-2.8,'REMEMBER THE HANDS\nTHAT KEPT THE LIGHTS ON\n||||  ||||  ||||']]){
      const writing=wallWriting(words);writing.position.set(side*(half-.008),1.65,z);writing.rotation.y=-side*Math.PI/2;spur.add(writing);
    }
    const lorePoint=new THREE.Vector3(-.85,1.5,I+3.2).applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2-a);
    root.userData.interactions.push({position:lorePoint.toArray(),label:'Read the names on the wall',action:'lore:memorial'});
    spur.add(sk.group());
  }
  root.add(k.group());root.userData.openings=openings;return root;
}
