import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign, fixture, desk, chair, table, shelf, bed, pipe, railing } from './kit.js';
import { SILO, TYPE_NAMES } from './data.js';

const TAU=Math.PI*2;
export function buildRoom(materials,type,level,wing,assets) {
  const root=new THREE.Group(),k=new Kit(materials), solids=[],interactions=[],animated=[];
  const rng=random(level*107+wing*7919), H=SILO.roomHeight, W=SILO.roomHalf, D=SILO.roomDepth;
  const box=(mat,x,y,z,w,h,d,solid=true,ry=0)=>{k.box(mat,x,y,z,w,h,d,ry);if(solid)solids.push({x,z,w,d,y0:y-h/2,y1:y+h/2,ry});};
  const label=(text,x,y,z,w=3,h=.5,ry=Math.PI)=>addSign(root,text,[x,y,z],w,h,ry);
  const prop=(name,x,z,scale=1,ry=0)=>{const source=assets[name];if(!source)return false;const model=source.clone(true);model.position.set(x,0,z);model.scale.setScalar(scale);model.rotation.y=ry;root.add(model);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());if(size.x<8&&size.z<8)solids.push({x:center.x,z:center.z,w:size.x,d:size.z,y0:0,y1:size.y});return true;};
  // Six actual wings extend outward from every numbered gallery.
  box('floor',0,-.18,D/2,W*2,.36,D,false);
  box('darkConcrete',-W-.12,H/2,D/2,.24,H,D);box('darkConcrete',W+.12,H/2,D/2,.24,H,D);box('darkConcrete',0,H/2,D+.12,W*2,.24+H,.24);
  box('darkConcrete',0,H+.15,D/2,W*2,.3,D,false);
  for(const z of [3,10,17,23]){box('concrete',-W+.35,H/2,z,.7,H,.65);box('concrete',W-.35,H/2,z,.7,H,.65);k.box('concrete',0,H-.25,z,W*2,.5,.7);fixture(k,0,H-.6,z,3.2,false,type==='medical'||type==='water');}
  for(const x of [-8.8,8.8])pipe(k,x,D/2,H-.6,D,.12);
  label(TYPE_NAMES[type]||type.toUpperCase(),0,3.7,.24,5,.68);

  const furnishings={
    residential(){
      // Living / kitchen first; two bedrooms and a bathroom behind partitions.
      box('pale',-5.9,1.7,12,8.2,3.4,.16);box('pale',5.9,1.7,12,8.2,3.4,.16);
      box('pale',0,1.7,19,.16,3.4,10);box('pale',6.6,1.7,20,.15,3.4,8);
      box('fabric',-5,.4,6,3.6,.55,1.2);box('fabric',-5,.95,6.48,3.6,.8,.25);for(const x of [-6.75,-3.25])box('wood',x,.65,6,.2,.8,1.25);
      table(k,-5,3.7,2.2,1.1);solids.push({x:-5,z:3.7,w:2.2,d:1.1,y0:0,y1:.9});k.box('wood',-5,.87,3.7,.5,.04,.33);
      box('green',6,.5,3,5.8,1,1.1);box('white',6,1.04,3,5.9,.1,1.15);k.box('darkMetal',7.5,1.11,3,.95,.06,.85);for(const x of [7.25,7.7])for(const z of [2.8,3.2])k.torus('metal',x,1.16,z,.13,.025,Math.PI/2);
      k.box('metal',4.5,1.11,3,.8,.04,.68);k.cylinder('metal',4.5,1.3,2.72,.035,.35);
      box('green',8.6,1.05,5.5,.95,2.1,.8);label('COLD STORE',8.6,1.55,5.04,.7,.18,0);
      table(k,5.5,7.5,2.4,1.25);for(const x of [4.7,6.3]){chair(k,x,6.55,Math.PI);chair(k,x,8.45);}
      for(const [x,z] of [[-7,18],[-4.5,18],[3,18]]){bed(k,x,z);solids.push({x,z,w:1.1,d:2.15,y0:0,y1:.7});}
      if(level===62&&wing===0)prop('bed',-1.6,18);
      for(const x of [-8.5,5.5]){box('wood',x,1,22.5,1.7,2,.75);k.cylinder('brass',x,1.05,22.09,.025,.2);}
      box('white',8,.5,17,.8,1,.7);k.sphere('white',8,.55,20,.45,.28,.65);k.box('white',8,.77,20.55,.65,.8,.22);box('tile',8,.04,22.3,2,.08,2.3,false);
      label(`HOME ${String(level).padStart(3,'0')} / ${wing+1}`,0,2.5,12.12,2.6,.34);
      label('REMEMBER THE PACT',-7,2.3,23.96,2,.8,Math.PI);
      const rug=k.box('red',-5,.016,3.4,4.8,.014,3.9);void rug;
    },
    cafeteria(){
      // The large horizontally rounded screen is geometry, fed by an original
      // live 3D exterior view. No frame from the television series is embedded.
      for(const z of [6,10.3,14.6,18.4])for(const x of [-6,-1,4]){table(k,x,z,2.7,1.25);solids.push({x,z,w:2.7,d:1.25,y0:0,y1:.9});for(const dx of [-.85,.85]){chair(k,x+dx,z-1,Math.PI);chair(k,x+dx,z+1);}}
      box('wood',-8.8,.7,6.5,1.2,1.4,8);for(let i=0;i<8;i++){k.cylinder('white',-8.7,1.49,3+i*.9,.17,.2);}
      const screenShape=new THREE.Shape();const sw=17,sh=4.7,r=.95;
      screenShape.moveTo(-sw/2+r,0);screenShape.lineTo(sw/2-r,0);screenShape.quadraticCurveTo(sw/2,0,sw/2,r);screenShape.lineTo(sw/2,sh-r);screenShape.quadraticCurveTo(sw/2,sh,sw/2-r,sh);screenShape.lineTo(-sw/2+r,sh);screenShape.quadraticCurveTo(-sw/2,sh,-sw/2,sh-r);screenShape.lineTo(-sw/2,r);screenShape.quadraticCurveTo(-sw/2,0,-sw/2+r,0);
      const screen=new THREE.Mesh(new THREE.ShapeGeometry(screenShape),new THREE.MeshBasicMaterial({color:0xc1cbc0,side:THREE.DoubleSide}));
      screen.position.set(0,.6,23.8);screen.rotation.y=Math.PI;
      const uv=screen.geometry.getAttribute('uv'),pos=screen.geometry.getAttribute('position');for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getX(i)+sw/2)/sw,pos.getY(i)/sh);root.add(screen);root.userData.outsideScreen=screen;
      for(let i=0;i<12;i++){const a=i*TAU/12;k.box('lamp',Math.sin(a)*2.6,H-.32,11+Math.cos(a)*2.6,.27,.06,4.4,-a);}
      if(level>1)label('DOWN DEEP · COMMON ROOM',0,4.7,1,6,.45);
    },
    office(){
      box('wood',0,.88,18,4.6,.18,1.4);for(const x of [-1.8,1.8])box('wood',x,.42,18,.7,.84,1.1);
      chair(k,0,19.3);chair(k,-1,16.3,Math.PI);chair(k,1,16.3,Math.PI);k.box('wood',0,1.05,18,1.2,.18,.7);
      for(let i=0;i<6;i++){shelf(k,-8.5+i*3.3,22.3,2.7);for(let j=0;j<12;j++)k.box(j%3?'fabric':'red',-9.6+i*3.3+j*.18,.99,22.3,.12,.3,.4);}
      table(k,-4,8,6,2);for(let i=0;i<4;i++){chair(k,-6.3+i*1.5,6.4,Math.PI);chair(k,-6.3+i*1.5,9.6);}
      label('FOR THE GOOD OF THE SILO',0,3.9,23.96,5,.7);
    },
    sheriff(){
      for(const [x,z] of [[-6,6],[-2,6],[-6,10],[-2,10]]){desk(k,x,z);chair(k,x,z+1);solids.push({x,z,w:2,d:1,y0:0,y1:1.5});}
      for(const z of [16,21]){box('concrete',5,1.8,z,8,3.6,.18);for(let x=1.1;x<9;x+=.22)k.cylinder('darkMetal',x,1.6,z-2.4,.027,3.2);bed(k,7,z-1);}
      label('HOLDING',5,3.6,13.65,3,.5);label('SHERIFF’S DEPARTMENT',-4,2.8,23.94,5,.7);
      prop('wall_camera',-9.4,12,.7);
    },
    judicial(){furnishings.office();box('wood',0,.15,18,8,.3,5);label('JUDICIAL',0,4.8,23.9,5,.75);for(const x of [-6.7,6.7])box('green',x,1.8,18,2,3.6,.6);},
    it(){
      for(const z of [5,9,13,17])for(const x of [-5,0,5]){desk(k,x,z);chair(k,x,z+1);solids.push({x,z,w:2,d:1,y0:0,y1:1.6});}
      for(const x of [-7.5,-4.5,-1.5,1.5,4.5,7.5]){serverRack(x,22);}
      label('INFORMATION TECHNOLOGY',0,4.3,23.92,6,.7);
    },
    vault(){
      for(const x of [-6,-2,2,6])for(const z of [6,11,16])serverRack(x,z);
      box('metal',0,1.5,21.5,3,3,.4);k.torus('brass',0,1.6,21.22,.5,.07);
      label('18',0,3.6,23.9,2,1.2);label('RESTRICTED · HEAD OF IT',0,4.3,1,5,.55);
      interactions.push({position:[0,1.5,20.9],label:'Inspect the vault terminal',action:'vault'});
    },
    surveillance(){
      for(let x=-8;x<=8;x+=2.1)for(const y of [1.6,2.9,4.2]){k.box('darkMetal',x,y,22.7,1.94,1.18,.45);k.box('screen',x,y,22.45,1.7,.93,.015);for(let j=0;j<5;j++)k.box('darkMetal',x-.65+j*.3,y,22.43,.05,.8,.01);}
      for(const x of [-5,0,5]){desk(k,x,15);chair(k,x,13.9,Math.PI);}
      label('OBSERVATION',0,4.1,1,4,.55);interactions.push({position:[0,1.2,14],label:'Inspect observation console',action:'surveillance'});
    },
    medical(){
      box('tile',0,.015,12,19.5,.03,23.8,false);
      for(const x of [-7.4,7.4])for(const z of [5,10,15,20]){bed(k,x,z);solids.push({x,z,w:1.1,d:2.2,y0:0,y1:.7});k.cylinder('metal',x+1,1.1,z,.025,2.2);k.box('glass',x+1,1.85,z,.18,.45,.12);k.box('linen',x<0?-5.5:5.5,1.4,z+1.5,3.4,2.7,.025);}
      box('white',0,.75,19,2.3,1.5,1.1);k.cylinder('metal',0,3.3,19,.035,2.6);k.cylinder('coldLamp',0,2.3,19,.6,.15);
      for(let i=0;i<6;i++){k.box('white',-3+i*1.2,1.2,23.25,1,2.4,.65);k.box('glass',-3+i*1.2,1.55,22.9,.8,1,.02);}
      label('MEDICAL · WARD & THEATRE',0,4.5,1,6,.7);
    },
    school(){
      for(const z of [5,8,11,14])for(const x of [-6,-2,2,6]){table(k,x,z,1.35,.85);chair(k,x,z-1,Math.PI);}
      box('green',0,2.4,23.82,9,2.8,.06,false);label('WE DO NOT KNOW WHY WE ARE HERE',0,2.9,23.72,8,.6);label('WE DO NOT KNOW WHO BUILT THE SILO',0,1.9,23.72,8,.6);
      for(const x of [-8,8]){shelf(k,x,20,2);for(let i=0;i<10;i++)k.box(i%3?'wood':'red',x-.8+i*.16,1.15,20,.12,.6,.4);}
    },
    water(){
      for(const x of [-5.8,5.8])for(const z of [7,14,21]){k.cylinder('green',x,2,z,1.7,4);k.sphere('metal',x,4,z,1.7,.45,1.7);k.torus('metal',x,1,z,1.73,.075,Math.PI/2);solids.push({x,z,w:3.4,d:3.4,y0:0,y1:4.5});pipe(k,x,z,1.2,5,.18,'blue');}
      for(const x of [-2,2])pipe(k,x,12,4.8,22,.25,'blue');desk(k,0,21);chair(k,0,22);
      label('WATER FILTRATION · 55',0,4.6,1,6,.6);interactions.push({position:[0,1.3,20.5],label:'Read filtration gauges',action:'water'});
    },
    farm(){
      for(const x of [-7.4,-2.6,2.6,7.4]){
        box('darkConcrete',x,.26,13,3.5,.52,17);k.box('soil',x,.54,13,3.2,.06,16.7);
        for(let z=5.2;z<21.5;z+=.75)for(let dx=-1.1;dx<1.3;dx+=.72){const p=x+dx+(rng()-.5)*.18;k.cylinder('leaf',p,.88,z,.035,.65);for(let j=0;j<3;j++)k.leaf(j%2?'leafLight':'leaf',p+(rng()-.5)*.25,.8+j*.17,z,.24,.07,.48,rng()*TAU);}
        fixture(k,x,4.7,12,14,false,true);
        pipe(k,x,13,.8,18,.04,'blue');
      }
      prop('hydroponics',-8,1.7,.72);
      label('AGRICULTURE · GROWING HALL',0,4.6,1,6,.6);
    },
    supply(){
      for(const x of [-7.6,-3.7,3.7,7.6])for(const z of [6,11,16,21]){
        shelf(k,x,z,2.6,2.3);solids.push({x,z,w:2.7,d:.85,y0:0,y1:2.3});
        for(const y of [.5,1.15,1.8])for(const dx of [-.75,0,.75])k.box(rng()>.5?'wood':'fabric',x+dx,y,z,.62,.55,.67);
      }
      table(k,0,3,3,1.2);label('SUPPLY · REPAIR · REUSE',0,4.4,1,6,.6);
    },
    workshop(){
      for(const x of [-6.5,6.5])for(const z of [6,13,20]){table(k,x,z,3.4,1.4);solids.push({x,z,w:3.4,d:1.4,y0:0,y1:.9});k.box('green',x,.96,z,.7,.3,.5);for(let i=0;i<5;i++){k.torus('rust',x-1+i*.42,.93,z+.3,.13,.025,Math.PI/2);}}
      prop('workbench',0,20,.75);
      for(const z of [4,9,14,19]){shelf(k,-8.8,z,1.4);k.cylinder('rust',8.5,1,z,.5,2);}
      label(level===130?'WALKER · ELECTRICAL REPAIRS':'MECHANICAL · REPAIR SHOP',0,4.2,1,6,.55);
      interactions.push({position:[0,1.2,19],label:'Inspect the repair bench',action:'workshop'});
    },
    mechanical(){furnishings.workshop();for(const x of [-3.5,3.5]){k.cylinder('metal',x,1.1,11,1,2.5,Math.PI/2);solids.push({x,z:11,w:2,d:2.6,y0:0,y1:2.2});pipe(k,x,13,3.8,17,.32,'rust');}},
    recycling(){
      box('metal',0,.7,13,3,1.4,15);k.box('black',0,1.43,13,2.7,.05,14.8);for(let z=6;z<20;z+=.4)k.box('metal',0,1.49,z,2.65,.035,.04);
      for(let i=0;i<18;i++)k.box(i%3?'rust':'wood',(rng()-.5)*2,1.7,6+rng()*13,.3+rng()*.5,.3,.4,false);
      for(const x of [-6.5,6.5])for(const z of [7,14,21]){box('rust',x,.6,z,2.8,1.2,2.2);k.box('black',x,1.22,z,2.5,.02,1.9);}
      box('darkMetal',0,2.7,23,4.5,5.4,1.4);label('REFUSE CHUTE',0,3,22.25,3,.6);interactions.push({position:[0,1.5,21.8],label:'Inspect refuse chute',action:'chute'});
    },
    utility(){
      for(const x of [-7,-3.5,3.5,7]){box('green',x,1.4,21,2.2,2.8,.7);for(const y of [.6,1.2,1.8,2.4]){k.box('black',x,y,20.61,1.8,.34,.03);k.box('indicator',x+.65,y,20.57,.07,.07,.02);}}
      prop('pipes',-7,10);prop('lockers',6,10,.7);for(const x of [-5,5])pipe(k,x,12,3.8,18,.32);
      label('VENTILATION · ELECTRICAL · SERVICES',0,4.6,1,7,.6);
    },
    generator(){
      // The six doors, ribs, turbine rotor and maintenance gantry are separate
      // authored parts. One bank opens for inspection; the running core is intact.
      const center=14, cy=2.1, rotor=new THREE.Group();rotor.position.set(0,cy,center);root.add(rotor);
      k.cylinder('darkMetal',0,.25,center,4.4,.5);k.cylinder('darkMetal',0,4,center,3.6,.4);
      const rk=new Kit(materials);rk.cylinder('brass',0,0,0,.42,3.3);for(let j=0;j<24;j++){const a=j*TAU/24;rk.box('metal',Math.cos(a)*1.7,0,Math.sin(a)*1.7,.12,2.8,2.6,-a+.5);}rotor.add(rk.group());animated.push({object:rotor,axis:'y',speed:.5});
      for(let j=0;j<6;j++){
        const a=j*TAU/6,x=Math.sin(a)*3.45,z=center+Math.cos(a)*3.45;
        const panel=new THREE.Group();panel.position.set(x,2.1,z);panel.rotation.y=a;
        const pk=new Kit(materials);pk.box('green',0,0,0,3.25,3.5,.36);for(const dx of [-1.4,1.4])pk.box('metal',dx,0,-.24,.1,3.5,.16);for(const yy of [-1.5,1.5])for(const xx of [-1.35,1.35])pk.cylinder('brass',xx,yy,-.22,.085,.07,Math.PI/2);panel.add(pk.group());root.add(panel);
        if(j===3){panel.position.x-=2.9;panel.position.z-=1.4;panel.rotation.y+=.35;}
      }
      const gantry=new Kit(materials);gantry.arc('darkMetal',4.15,5.9,.17,2.8,0,TAU,64);for(let i=0;i<32;i++){const a=i*TAU/32,b=(i+1)*TAU/32;railing(gantry,[Math.cos(a)*5.7,Math.sin(a)*5.7],[Math.cos(b)*5.7,Math.sin(b)*5.7],2.97);}const gg=gantry.group();gg.position.z=center;root.add(gg);
      for(const x of [-8.5,8.5])for(const yy of [1,2,3,4.5])pipe(k,x,13,yy,20,.22);
      k.box('yellow',0,H-.6,14,18,.65,.55);for(const x of [-7,7])k.box('darkMetal',x,2.7,14,.35,5.4,.35);k.cylinder('metal',0,4.65,14,.035,1.7);k.torus('rust',0,3.8,14,.28,.07);
      desk(k,-5,4);desk(k,5,4);label('GENERATOR · MECHANICAL',0,4.7,1,6,.65);
      solids.push({x:0,z:center,w:7.8,d:7.8,y0:0,y1:4.5});
      interactions.push({position:[0,1.3,8.2],label:'Inspect the generator',action:'generator'});
      label('MINES ↓',-6,2.2,23.93,2.4,.55);label('LOWER ACCESS ↓',6,2.2,23.93,3,.55);
      for(const x of [-6,6]){k.box('darkMetal',x,.04,22.7,1.8,.08,1.8);for(let j=0;j<5;j++)k.box('metal',x,.1,22.1+j*.28,1.6,.08,.07);}
      interactions.push({position:[-6,1,22],label:'Descend to the mines',destination:'mines'},{position:[6,1,22],label:'Descend to the excavator',destination:'excavator'});
    },
    airlock(){
      for(const z of [9,18]){box('pale',-6,2.5,z,8,5,.4);box('pale',6,2.5,z,8,5,.4);k.box('pale',0,4.6,z,4,.8,.4);const door=box('darkMetal',0,2.1,z,3.95,4.2,.32);void door;k.torus('metal',0,2.1,z-.2,.7,.09);}
      for(const x of [-7,7]){box('metal',x,.6,4,3.4,1.2,.7);for(const dx of [-1,0,1]){k.sphere('white',x+dx,2.7,4,.32,.36,.32);k.box('linen',x+dx,1.9,4,.5,1.1,.35);}}
      label('CLEANING · SUIT PREPARATION',0,4.1,1,6,.6);label('OUTER DOOR · SEALED',0,3.5,8.8,3,.5);
      interactions.push({position:[0,1.6,8.1],label:'Inspect cleaning airlock',action:'airlock'});
    },
  };
  function serverRack(x,z){box('darkMetal',x,1.5,z,1.65,3,1.1);for(let y=.3;y<2.9;y+=.24){k.box('metal',x,y,z-.58,1.45,.17,.08);for(let j=0;j<4;j++)k.box(j===0?'indicator':'brass',x-.56+j*.14,y,z-.63,.045,.03,.01);}}
  (furnishings[type]||furnishings.residential)();
  root.add(k.group());
  root.userData={...root.userData,solids,interactions,animated,type};
  return root;
}
