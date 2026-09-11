import * as THREE from '../vendor/three.module.js';
import { Kit,addSign,random } from './kit.js';
import { SILO } from './data.js';

// Set dressing follows the filmed material language: repairable domestic
// objects, fluted concrete, enamel equipment and exposed building services.
// Unpublished room plans remain reconstructed, as recorded in WORLD.md.
export function pendant(k,x,y,z,shade='green',cold=false){
  const top=SILO.roomHeight-.05;
  k.cylinder('darkMetal',x,(y+.2+top)/2,z,.012,top-y-.2);k.cylinder('darkMetal',x,top,z,.11,.035);
  k.lathe(shade,x,y,z,[[.33,-.045],[.31,0],[.18,.13],[.09,.2],[0,.18]]);k.cylinder('darkMetal',x,y-.05,z,.34,.035);
  k.cylinder(cold?'coldLamp':'lamp',x,y-.075,z,.27,.018);k.sphere('lamp',x,y-.1,z,.075,.035,.075);
}
export function wallGauge(k,x,y,z,r=.16,ry=0){
  const f=new Kit(k.m);f.cylinder('metal',0,0,0,r,.065,Math.PI/2);f.cylinder('paper',0,0,.038,r*.86,.012,Math.PI/2);
  for(let j=0;j<10;j++){const a=-.75*Math.PI+j*Math.PI*1.5/9;f.beam('black',[Math.sin(a)*r*.63,Math.cos(a)*r*.63,.049],[Math.sin(a)*r*.79,Math.cos(a)*r*.79,.049],.005);}
  f.beam('red',[0,0,.053],[r*.43,r*.35,.053],.007);f.cylinder('darkMetal',0,0,.055,.019,.016,Math.PI/2);
  place(k,f,x,y,z,ry);
}
function place(k,source,x,y,z,ry=0){const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(1,1,1));for(const p of source.parts)k.parts.push({...p,matrix:matrix.clone().multiply(p.matrix)});}
function bookStack(k,x,y,z,seed=1){const rng=random(seed);for(let j=0;j<4;j++){const w=.26+rng()*.12;k.bevel(j%2?'paper':'fabric',x+(rng()-.5)*.055,y+j*.045,z,w,.04,.23,(rng()-.5)*.15);k.box('paper',x,y+.014+j*.045,z+.122,w-.025,.015,.008);}}
export function mug(k,x,y,z,color='white'){k.cylinder(color,x,y+.06,z,.067,.12);k.cylinder('black',x,y+.125,z,.052,.006);k.torus(color,x+.071,y+.065,z,.044,.013);}
export function deskDressing(k,x,z,seed=0){
  k.bevel('paper',x-.55,.886,z+.03,.36,.012,.27,.08);for(let j=0;j<5;j++)k.box('darkMetal',x-.55,.893,z-.045+j*.035,.24,.001,.003,.08);
  k.cylinder('green',x+.70,.955,z-.19,.058,.15);for(let j=0;j<4;j++)k.cylinder(j%2?'wood':'brass',x+.67+j*.017,1.09,z-.19,.006,.20);
  mug(k,x+.65,.88,z+.18);bookStack(k,x-.68,.90,z-.24,seed);
}
export function homeDetails(k,root,x,base,seed){
  // Raised oval ceramic backsplash, visible in the apartment references.
  for(let row=0;row<3;row++)for(let col=0;col<14;col++){
    const z=base+.65+col*.32;k.bevel('tile',x(8.40),1.22+row*.20,z,.025,.19,.30);
    k.sphere('enamel',x(8.38),1.22+row*.20,z,.025,.072,.105);
  }
  for(const v of [0.15,6.22,11.16]){k.box('wood',x(4.15),2.83,base+v,7.8,.035,.035);}
  // Radio, heirloom books, an enamel bread bin and a repaired woven runner.
  k.bevel('wood',x(.55),.76,base+5.7,.5,.32,.26);k.bevel('fabric',x(.55),.80,base+5.545,.34,.15,.016);
  for(let j=0;j<7;j++)k.box('darkMetal',x(.55)-.14+j*.046,.8,base+5.528,.016,.12,.014);
  for(const dx of [-.15,.15])k.cylinder('brass',x(.55)+dx,.664,base+5.52,.022,.019,Math.PI/2);
  k.bevel('enamel',x(7.7),1.27,base+4.55,.59,.35,.43);k.box('metal',x(7.7),1.24,base+4.32,.23,.035,.02);
  bookStack(k,x(2.4),.848,base+4.18,seed);mug(k,x(4.3),.84,base+2.35);
  k.box('rug',x(3.4),.024,base+8.48,1.6,.023,2.75);
  for(const edge of [-1,1])for(let j=0;j<24;j++)k.box('linen',x(3.4)-.76+j*.066,.027,base+8.48+edge*1.4,.019,.01,.095);
  // Small recessed shelves add household silhouettes without closing a route.
  for(const v of [7.2,9.6]){k.box('wood',x(5.38),1.65,base+v,.32,.065,1.28);bookStack(k,x(5.37),1.71,base+v,seed+v);}
  const artwork=addSign(root,'THE PACT',[x(4.2),2.18,base+.095],.63,.84,0,{background:'#8b8168',color:'#302f29',font:'bold 66px Georgia',glow:0});
  artwork.userData.environmentDetail='framed household copy';
  for(const v of [6.65,10.76]){k.box('metal',x(7.1),2.32,base+v,1.5,.03,.05);for(let j=0;j<6;j++)k.cylinder('metal',x(7.1)-.64+j*.25,2.08,base+v,.009,.45);}
  k.bevel('linen',x(7.35),1.82,base+6.72,.5,.68,.07);
}

export function dressRoom(k,root,type,level,wing){
  const lightPoints=[],warm=level<50?'enamel':level>100?'rust':'green';
  // Kept against the outer walls, above the circulation clearance.
  for(const side of (type==='vault'?[]:[-1,1])){
    const x=side*9.6;
    for(const z of [2.2,8.5,15,21.8]){
      k.bevel(warm,x,2.14,z,.23,.65,.56);k.box('black',x-side*.13,2.14,z,.01,.42,.35);
      for(const y of [1.91,2.36])for(const dz of [-.2,.2])k.sphere('metal',x-side*.14,y,z+dz,.016);
      for(const yy of [3.5,3.8])k.cylinder('metal',x-side*.09,yy,z,.052,.7,Math.PI/2);
    }
    // Cable trays, their brackets, and a narrow continuous pipe identification stripe.
    k.box('darkMetal',side*8.75,5.15,12,.38,.065,23.5);
    for(const z of [2,7,12,17,22]){k.box('metal',side*9.25,5.10,z,1.3,.065,.10);k.box('metal',side*9.83,4.95,z,.075,.36,.16);}
    for(let z=.8;z<24;z+=.7)k.box('metal',side*8.75,5.24,z,.42,.018,.025);
    for(const dx of [-.1,0,.1])k.cylinder('black',side*8.75+dx,5.22,12,.028,23.5,Math.PI/2);
  }
  for(const z of [3.4,10.4,17.4,22.6]){
    // The vault is the one room with no hanging fittings in it: its light comes
    // from the coves built into the panelling, and it is cold rather than warm.
    if(type==='vault'){lightPoints.push({position:[0,4.3,z],color:0xbcd6d8,intensity:78});continue;}
    if(type!=='residential'){pendant(k,0,4.35,z,level>100?'rust':'green',type==='medical'||type==='it');lightPoints.push({position:[0,4.15,z],color:type==='medical'?0xd7e5d9:type==='it'?0xc8dcd3:0xf5d8ad,intensity:110});}
  }
  if(type==='residential'){
    for(const s of [-1,1])for(const row of [0,1]){
      const base=1+row*11.4;homeDetails(k,root,u=>s*(1.5+u),base,level*100+row+wing*11);
      lightPoints.push({position:[s*5.1,2.88,base+3.5],color:level<50?0xffdeb3:0xe7cd9b,intensity:65},{position:[s*4.5,2.88,base+8.7],color:0xe8d5b3,intensity:48});
    }
    lightPoints.push({position:[0,3.1,7],color:0xc5d3bd,intensity:40},{position:[0,3.1,19],color:0xc5d3bd,intensity:40});
  }
  if(['office','judicial'].includes(type)){
    // Dark timber slats and curved cast-concrete reveals frame the civic rooms.
    for(const s of [-1,1])for(let z=2;z<24;z+=.23)k.box('wood',s*9.84,1.7,z,.04,3.25,.12);
    for(const s of [-1,1]){k.portal('concrete',s*6.5,0,23.69,4.2,4.65,.28,0,.75,.18);for(let j=0;j<8;j++)k.box('brass',s*6.5-1.65+j*.47,1.1,23.51,.035,1.8,.035);}
    const deskZ=level===19?15:18,deskTop=level===19?.83:.97;
    bookStack(k,.65,deskTop+.02,deskZ,level);k.box('fabric',-.05,deskTop+.0125,deskZ,1.04,.025,.64);mug(k,1.5,deskTop,deskZ+.35);
    wallGauge(k,-7.6,3.5,23.68,.38,Math.PI);
  }
  if(['it','surveillance','janitorial','sheriff'].includes(type)){
    const desks=type==='sheriff'?[6,10]:[];
    for(const z of desks)for(const x of (type==='sheriff'?[-6,-2]:[-5,0,5]))deskDressing(k,x,z,level+z+x);
    // Rack identification, wire conduits and slotted ventilation grilles.
    for(const s of [-1,1])for(const z of [5,11,17,22]){
      for(let j=0;j<10;j++)k.box('darkMetal',s*9.79,3.2+j*.075,z,.035,.037,1.36);
      k.bevel('green',s*9.77,.49,z,.10,.75,.68);
      wallGauge(k,s*9.65,1.16,z,.13,s>0?-Math.PI/2:Math.PI/2);
    }
  }
  if(type==='medical'){
    for(const x of [-7.4,7.4])for(const z of [5,10,15,20]){
      k.bevel('white',x,.83,z-.82,1.07,.40,.075);
      for(const dx of [-.53,.53]){k.beam('metal',[x+dx,.71,z-.45],[x+dx,.71,z+.65],.018);k.cylinder('black',x+dx,.09,z+.78,.055,.045,Math.PI/2);}
      k.bevel('enamel',x+(x<0?-.9:.9),.72,z-.6,.47,.60,.5);mug(k,x+(x<0?-.9:.9),1.025,z-.55);
      k.cylinder('metal',x,2.87,z+1.5,.023,3.7,0,0,Math.PI/2);for(let j=0;j<11;j++)k.torus('metal',x-1.5+j*.3,2.8,z+1.5,.043,.008,0,Math.PI/2);
      addSign(root,`BED ${x<0?'A':'B'}${Math.round(z/5)}`,[x,1.08,z-.875],.35,.10,Math.PI,{glow:.12,font:'bold 52px Arial'});
    }
    for(const x of [-2,2])for(let j=0;j<8;j++){k.cylinder('white',x-.44+j*.13,1.71,22.8,.039,.15);k.cylinder('blue',x-.44+j*.13,1.796,22.8,.041,.027);}
  }
  if(['mechanical','workshop','water','utility','recycling'].includes(type)){
    for(const s of [-1,1])for(const z of [3.5,10.5,17.5]){
      const x=s*9.27;k.cylinder('rust',x,2.7,z,.19,4.8);for(const y of [.42,1.7,3.65,4.6]){k.torus('metal',x,y,z,.228,.03,Math.PI/2);for(let j=0;j<6;j++){const a=j*Math.PI/3;k.cylinder('brass',x+Math.cos(a)*.224,y,z+Math.sin(a)*.224,.019,.09);}}
      k.beam('metal',[x,1.5,z],[x-s*.31,1.5,z],.043);k.torus('red',x-s*.36,1.5,z,.23,.025,0,Math.PI/2);for(let j=0;j<5;j++){const a=j*Math.PI*2/5;k.beam('red',[x-s*.36,1.5,z],[x-s*.36,1.5+Math.cos(a)*.21,z+Math.sin(a)*.21],.015);}
      wallGauge(k,x-s*.28,2.25,z,.19,s>0?-Math.PI/2:Math.PI/2);
    }
    addSign(root,'ISOLATE BEFORE MAINTENANCE',[9.79,2.9,8],2.2,.31,-Math.PI/2,{background:'#b39a5d',color:'#292b27',glow:.08});
  }
  if(['supply','porter','school'].includes(type)){
    for(const side of [-1,1])for(const z of [5,11,17,22]){
      k.bevel('wood',side*9.25,1.35,z,.45,2.5,1.6);
      for(let y=.4;y<2.5;y+=.42)for(let j=0;j<6;j++)k.bevel(j%3===0?'paper':j%3===1?'fabric':'red',side*9.0,y,z-.62+j*.24,.33,.3,.19);
    }
    if(type==='porter')for(let i=0;i<12;i++){k.box('paper',-7.3+i*.58,1.46,6,.38,.045,.23);}
  }
  if(type==='bar'){
    for(const z of [6,12,18]){pendant(k,4,2.7,z,'ochre');mug(k,3.5,.84,z);mug(k,4.5,.84,z);lightPoints.push({position:[4,2.55,z],color:0xffba70,intensity:42});}
    for(let z=5;z<21;z+=.6){k.cylinder('glass',-5,1.51,z,.07,.20);k.torus('metal',-5,1.62,z,.071,.008,Math.PI/2);}
  }
  if(['park','farm'].includes(type)){
    for(const s of [-1,1])for(const z of [2,10,18]){
      k.cylinder('wood',s*9.1,.73,z,.21,.6);k.torus('metal',s*9.1,.51,z,.215,.025,Math.PI/2);k.torus('metal',s*9.1,.96,z,.215,.025,Math.PI/2);
      k.beam('wood',[s*9.1,.4,z],[s*9.1,1.5,z+.16],.021);k.bevel('metal',s*9.1,.37,z,.16,.27,.035);
    }
  }
  if(type==='laundry')for(const s of [-1,1])for(const z of [6,10,14,18,22]){
    for(let j=0;j<7;j++)k.box('darkMetal',s*7-.75+j*.25,1.2,z-.795,.04,.17,.017);
    k.cylinder('brass',s*7-.8,1.31,z-.806,.046,.035,Math.PI/2);k.bevel('paper',s*7+.25,1.32,z-.81,.33,.10,.008);
  }
  // Floor insets and seams live below the collision surface; they cannot form
  // another invisible threshold. The middle route stays clear on every level.
  for(const z of [4,12,20])for(const x of [-9.72,9.72]){
    k.box('darkMetal',x,.006,z,.24,.01,1.25);for(let j=0;j<9;j++)k.box('metal',x,.014,z-.55+j*.14,.20,.007,.042);
  }
  root.userData.lightPoints=lightPoints;root.userData.detailRevision=2;
}

// `tables` is the cafeteria's own table grid, handed in by top-floor.js so the
// dressing cannot drift off the furniture it is dressing. `clear` names one
// table that is laid with nothing at all: the directory book stands on it, and
// a tray, a paper stack and a mug around a 43 cm book is how you lose it.
export function dressCafeteria(k,root,tables={}){
  const rows=tables.rows||[12.8,17,22,27,32],columns=tables.columns||[-11,-5,2,9],clear=tables.clear||null;
  // Rounded acoustic fins in the ceiling, brass expansion joints, and the
  // complete serving-counter language of the photographed communal hall.
  for(const s of [-1,1])for(const z of [12,20,28,36]){
    for(let j=0;j<7;j++)k.box('darkConcrete',s*(17.2+j*.07),4.2,z,.035,7.7,.78);
    k.bevel('wood',s*17.54,1.0,z,.22,.075,3.0);for(const dz of [-1.12,1.12])k.box('metal',s*17.65,.68,z+dz,.1,.64,.08);
  }
  for(let x=-16;x<=16;x+=4)k.box('brass',x,.006,24,.016,.009,28);
  for(const z of [11,19,27,35])k.box('brass',0,.007,z,35,.009,.016);
  for(const x of [-15.8,-12.5,-9.2]){
    for(let j=0;j<3;j++){k.bevel('metal',x-.95+j*.9,1.53,7,.72,.075,.95);k.bevel('black',x-.95+j*.9,1.566,7,.6,.015,.78);}
    for(const dx of [-1.3,1.3])k.cylinder('metal',x+dx,1.9,7,.018,.8);
    k.box('glass',x,2.14,7,2.65,.018,1.32);pendant(k,x,3.0,7,'ochre');
  }
  k.bevel('enamel',-6.1,1.74,7,.65,1.12,.65);wallGauge(k,-6.1,1.99,7.36,.10);
  for(const dx of [-.18,.18]){k.beam('metal',[-6.1+dx,1.55,7.3],[-6.1+dx,1.55,7.49],.025);k.cylinder('black',-6.1+dx,1.6,7.51,.026,.09);}
  for(const z of rows)for(const x of columns){
    if(clear&&x===clear[0]&&z===clear[1])continue;
    k.bevel('metal',x,.85,z,.3,.038,.2);for(let j=0;j<6;j++)k.box('paper',x,.92+j*.012,z,.19,.013,.11);mug(k,x+1.15,.837,z-.27);
  }
  addSign(root,'RETURN TRAYS',[0,2.35,9.83],2.3,.3,0,{glow:.1});
  root.userData.detailRevision=2;
}

export function dressBazaar(k,root){
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const z=4.5+row*6.55,x=side*6.6,front=side*3.3,ry=side===1?-Math.PI/2:Math.PI/2;
    // Canvas valances and sliding grille housings frame open shop portals.
    for(let j=0;j<14;j++){const zz=z-2.56+j*.395;k.bevel(row%2?'rug':'fabric',front-side*.7,3.15,zz,.66,.2,.37);}
    for(const dz of [-1.3,1.3])k.box('darkMetal',front,1.48,z+dz,.075,2.9,.075);
    k.bevel('enamel',side*8.83,1.0,z-1.7,.80,.3,.50);wallGauge(k,side*8.83,1.24,z-1.96,.14,Math.PI);
    for(let j=0;j<3;j++){const xx=x-1.3+j*1.25;k.bevel('wood',xx,.92,z+1.85,1.07,.19,.76);for(let n=0;n<5;n++)k.box('wood',xx-.42+n*.21,1.01,z+2.22,.06,.2,.035);}
    for(let j=0;j<8;j++){const zz=z-2.0+j*.48;k.cylinder('enamel',side*9.21,1.07,zz,.09,.24);k.cylinder('brass',side*9.21,1.20,zz,.095,.025);}
    addSign(root,row===0?'DAILY ALLOCATION':row===1?'REPAIR & REUSE':'COLLECTIONS',[front-side*.45,1.04,z-2.05],.87,.27,ry,{background:'#c2b994',color:'#363c31',glow:.05});
  }
  // A longitudinal ribbed vault changes the silhouette of the market street.
  for(const z of [1.2,7.8,14.4,21])k.portal('concrete',0,0,z,5.65,7.85,.20,0,1.0,.14);
  root.userData.detailRevision=2;
}
