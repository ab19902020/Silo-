import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign, fixture, desk, chair, table, shelf, bed, pipe, railing } from './kit.js';
import { makeDisplayGeometry } from './top-floor.js';
import { SILO, TYPE_NAMES, RESIDENCES } from './data.js';
import { hasRearPassage } from './passages.js';
import { dressWorkshop } from './workshop-details.js';
import { dressRoom } from './environment-details.js';
import { buildLivestock } from './livestock.js';
import { buildITOffices, buildHeadOffice, buildVault } from './it-department.js';

const TAU=Math.PI*2;
export function buildRoom(materials,type,level,wing,assets) {
  const root=new THREE.Group(),k=new Kit(materials), solids=[],interactions=[],animated=[];
  let livestock=null;
  const rng=random(level*107+wing*7919), H=SILO.roomHeight, W=SILO.roomHalf, D=SILO.roomDepth;
  const box=(mat,x,y,z,w,h,d,solid=true,ry=0)=>{(Math.min(w,h,d)>.22&&Math.max(w,h,d)<6?k.bevel.bind(k):k.box.bind(k))(mat,x,y,z,w,h,d,ry);if(solid)solids.push({x,z,w,d,y0:y-h/2,y1:y+h/2,ry});};
  const label=(text,x,y,z,w=3,h=.5,ry=Math.PI)=>{
    if(z>.8&&z<1.2&&y>3.4){k.box('darkMetal',x,y,z+.06,w+.12,h+.12,.08);for(const dx of [-w*.38,w*.38])k.beam('metal',[x+dx,y+h/2,z+.06],[x+dx,H-.1,z+.06],.012);}
    return addSign(root,text,[x,y,z],w,h,ry);
  };
  const prop=(name,x,z,scale=1,ry=0)=>{const source=assets[name];if(!source)return false;const model=source.clone(true);model.position.set(x,0,z);model.scale.setScalar(scale);model.rotation.y=ry;root.add(model);const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());if(size.x<8&&size.z<8)solids.push({x:center.x,z:center.z,w:size.x,d:size.z,y0:0,y1:size.y});return true;};
  // Six actual wings extend outward from every numbered gallery.
  box('darkConcrete',-6,H/2,0,8,H,.24);box('darkConcrete',6,H/2,0,8,H,.24);
  box('floor',0,-.18,D/2,W*2,.36,D,false);
  box('darkConcrete',-W-.12,H/2,D/2,.24,H,D);box('darkConcrete',W+.12,H/2,D/2,.24,H,D);
  if(hasRearPassage(level,type)){
    for(const side of [-1,1])box('darkConcrete',side*5.775,H/2,D+.12,8.45,H,.24);
    box('darkConcrete',0,4.65,D+.12,3.1,2.3,.24);
    label('SERVICE GALLERY  ↔',0,3.8,D-.03,2.8,.32);
  }else box('darkConcrete',0,H/2,D+.12,W*2,H,.24);
  box('darkConcrete',0,H+.15,D/2,W*2,.3,D,false);
  for(const z of [3,10,17,23]){box('concrete',-W+.35,H/2,z,.7,H,.65);box('concrete',W-.35,H/2,z,.7,H,.65);k.box('concrete',0,H-.25,z,W*2,.5,.7);fixture(k,0,H-.6,z,3.2,false,type==='medical'||type==='water');}
  for(const x of [-8.8,8.8])pipe(k,x,D/2,H-.6,D,.12);
  k.box('darkMetal',0,3.7,.12,5.2,.82,.15);
  label(TYPE_NAMES[type]||type.toUpperCase(),0,3.7,.24,5,.68);

  const furnishings={
    residential(){
      // Four human-scale homes share a central corridor. Each has an open
      // entrance, living/kitchen space, a bedroom and a reachable bathroom.
      for(const side of [-1,1])for(const row of [0,1]){
        const start=1+row*11.4,doorZ=start+3.7,homeX=u=>side*(1.5+u),base=start;
        const unitBox=(mat,u,y,v,w,h,d,solid=true)=>box(mat==='pale'&&level<50?'plaster':mat,homeX(u),y,base+v,w,h,d,solid);
        // Corridor wall split around the real 1.5 m doorway.
        unitBox('pale',0,1.65,1.475,.14,3.3,2.95);unitBox('pale',0,1.65,7.975,.14,3.3,6.55);unitBox('pale',0,3.02,3.7,.14,.56,1.5);
        unitBox('pale',4.25,1.65,0,8.5,3.3,.14);unitBox('pale',4.25,1.65,11.3,8.5,3.3,.14);
        unitBox('pale',4.25,3.45,5.65,8.5,.2,11.3,false);
        for(const v of [2.95,4.45])unitBox('wood',0,1.35,v,.19,2.7,.09,false);
        k.portal('concrete',side*1.5,.02,doorZ,1.5,2.7,.22,side===1?-Math.PI/2:Math.PI/2,.23,.085);
        // Bedroom doorway, then a separate bathroom door in the side wall.
        unitBox('pale',1.25,1.45,6.4,2.5,2.9,.12);unitBox('pale',6.4,1.45,6.4,4.2,2.9,.12);unitBox('pale',3.4,2.62,6.4,1.8,.55,.12);
        unitBox('pale',6,1.45,6.95,.12,2.9,1.1);unitBox('pale',6,1.45,10.05,.12,2.9,2.5);unitBox('pale',6,2.62,8.15,.12,.55,1.3);
        // Deep rounded portals and a compact kitchen alcove follow the production
        // apartment concept; room dimensions and unseen unit layouts are inferred.
        k.portal('concrete',homeX(5.8),.02,base+2.85,4.5,2.8,.2,side===1?-Math.PI/2:Math.PI/2,.42,.13);
        for(const v of [.46,5.24])unitBox('plaster',5.8,1.5,v,.16,3,.4);
        unitBox('plaster',5.8,3.03,2.85,.16,.35,4.5);
        for(const v of [1.5,2.9,4.3]){unitBox('blue',8,2.27,v,.9,.95,1.28,false);unitBox('metal',7.52,2.28,v,.03,.26,.06,false);}
        fixture(k,homeX(7.45),1.77,base+2.85,2.7,false,true);
        // Living space with rounded upholstery, a rug and repaired timberwork.
        unitBox(row?'fabric':'linen',2.1,.43,2.2,2.5,.52,1);unitBox('fabric',2.1,.92,2.7,2.5,.75,.19);
        for(const u of [.84,3.36]){unitBox('wood',u,.65,2.2,.16,.75,1.08);k.beam('metal',[homeX(u),.44,base+1.8],[homeX(u),.74,base+2.4],.025);}
        for(const u of [1.36,2.1,2.84]){unitBox('fabric',u,.73,2.2,.7,.13,.84,false);unitBox('blue',u,.99,2.53,.52,.43,.19,false);}
        for(const u of [1.01,1.72,2.46,3.19])unitBox('linen',u,.806,2.19,.012,.015,.82,false);
        unitBox('red',2.2,.018,4.1,3.9,.024,2.15,false);table(k,homeX(2.2),base+4.1,1.6,.85);solids.push({x:homeX(2.2),z:base+4.1,w:1.6,d:.85,y0:0,y1:.85});
        unitBox('wood',2.2,.89,4.1,.4,.025,.28,false);k.cylinder('white',homeX(2.8),.93,base+4.1,.09,.13);
        unitBox('green',7.75,.5,2.8,1.1,1,4.1);unitBox('white',7.75,1.045,2.8,1.14,.09,4.15,false);
        unitBox('metal',7.75,1.11,1.8,.8,.035,.7,false);k.cylinder('metal',homeX(8.1),1.3,base+1.8,.026,.38);
        for(const u of [7.48,7.98])for(const v of [3.3,3.75])k.torus('black',homeX(u),1.12,base+v,.14,.028,Math.PI/2);
        for(const v of [1.2,2.2,3.2,4.2]){unitBox('brass',7.15,.72,v,.025,.035,.24,false);unitBox('wood',8.36,2.05,v,.04,.055,.8,false);k.cylinder('white',homeX(8.08),2.15,base+v,.12,.16);}
        unitBox('green',7.7,1.05,5.6,1.1,2.1,.75);
        table(k,homeX(4.2),base+2.4,1.3,.8);chair(k,homeX(4.2),base+1.55,Math.PI);chair(k,homeX(4.2),base+3.3);
        // Pottery, a desk fan, bedside lamps and repaired skirting add scale.
        for(const [u,v] of [[.65,.7],[4.85,10.4]]){k.cylinder('brass',homeX(u),.91,base+v,.06,.24);k.sphere('linen',homeX(u),1.14,base+v,.21,.25,.21);}
        for(const u of [4.5,5.1]){k.sphere('wood',homeX(u),.36,base+.65,.22,.3,.22);k.cylinder('brass',homeX(u),.65,base+.65,.11,.16);}
        unitBox('wood',.55,.54,5.7,.7,.08,.55,false);k.cylinder('metal',homeX(.55),.77,base+5.7,.035,.4);k.torus('metal',homeX(.55),1.04,base+5.7,.27,.02);
        for(let j=0;j<12;j++){const a=j*Math.PI/6;k.beam('metal',[homeX(.55),1.04,base+5.7],[homeX(.55)+Math.cos(a)*.27,1.04+Math.sin(a)*.27,base+5.7],.008);}
        for(const v of [.11,6.28,11.18])unitBox('wood',4.1,.075,v,7.9,.15,.035,false);
        bed(k,homeX(2.3),base+8.7);solids.push({x:homeX(2.3),z:base+8.7,w:1.1,d:2.15,y0:0,y1:.7});
        if(row===1){bed(k,homeX(.9),base+8.7);solids.push({x:homeX(.9),z:base+8.7,w:1.1,d:2.15,y0:0,y1:.7});}
        unitBox('wood',4.75,1.05,10.7,1.6,2.1,.65);for(const u of [4.65,4.85])unitBox('brass',u,1.05,10.33,.025,.23,.035,false);
        unitBox('tile',7.3,.016,8.8,2.45,.024,4.6,false);unitBox('white',7.65,.55,6.95,.85,1.1,.55);k.sphere('white',homeX(6.8),.5,base+10.05,.3,.23,.44);unitBox('white',6.8,.76,10.45,.55,.75,.18);
        unitBox('glass',7.6,1.1,9.32,1.2,2.2,.035,false);unitBox('metal',8.27,1.8,10.2,.025,.5,.06,false);
        fixture(k,homeX(3.8),3.28,base+3.3,1.8);fixture(k,homeX(3.2),3.28,base+8.6,1.2);
        const name=row===0&&side===1?(RESIDENCES[`${level}:${wing}`]||`HOME ${level}-${wing+1}A`):`HOME ${level}-${wing+1}${side===1?'B':row===0?'C':'D'}`;
        label(name,side*1.39,2.3,doorZ,1.1,.22,side===1?-Math.PI/2:Math.PI/2);
      }
      label('RESIDENTIAL GALLERY',0,3.8,23.9,3.2,.5);
    },
    cafeteria(){
      // The large horizontally rounded screen is geometry, fed by an original
      // live 3D exterior view. No frame from the television series is embedded.
      for(const z of [6,10.3,14.6,18.4])for(const x of [-6,-1,4]){table(k,x,z,2.7,1.25);solids.push({x,z,w:2.7,d:1.25,y0:0,y1:.9});for(const dx of [-.85,.85]){chair(k,x+dx,z-1,Math.PI);chair(k,x+dx,z+1);}}
      box('wood',-8.8,.7,6.5,1.2,1.4,8);for(let i=0;i<8;i++){k.cylinder('white',-8.7,1.49,3+i*.9,.17,.2);}
      const screen=new THREE.Mesh(makeDisplayGeometry(17,4.7,26),new THREE.MeshBasicMaterial({color:0xffffff}));screen.position.set(0,.6,23.8);screen.rotation.y=Math.PI;screen.userData.ownedGeometry=true;screen.userData.ownedMaterial=true;root.add(screen);root.userData.outsideScreen=screen;
      for(let i=0;i<12;i++){const a=i*TAU/12;k.box('lamp',Math.sin(a)*2.6,H-.32,11+Math.cos(a)*2.6,.27,.06,4.4,-a);}
      if(level>1)label('DOWN DEEP · COMMON ROOM',0,4.7,1,6,.45);
    },
    office(){
      if(level===19){buildHeadOffice(k,{box,solids,interactions,label});return;}
      box('wood',0,.88,18,4.6,.18,1.4);for(const x of [-1.8,1.8])box('wood',x,.42,18,.7,.84,1.1);
      chair(k,0,19.3);chair(k,-1,16.3,Math.PI);chair(k,1,16.3,Math.PI);k.box('wood',0,1.05,18,1.2,.18,.7);
      for(let i=0;i<6;i++){shelf(k,-8.5+i*3.3,22.3,2.7);for(let j=0;j<12;j++)k.box(j%3?'fabric':'red',-9.6+i*3.3+j*.18,.99,22.3,.12,.3,.4);}
      table(k,-4,8,6,2);for(let i=0;i<4;i++){chair(k,-6.3+i*1.5,6.4,Math.PI);chair(k,-6.3+i*1.5,9.6);}
      label('FOR THE GOOD OF THE SILO',0,3.9,23.96,5,.7);
    },
    sheriff(){
      for(const [x,z] of [[-6,6],[-2,6],[-6,10],[-2,10]]){desk(k,x,z);chair(k,x,z+1);solids.push({x,z,w:2,d:1,y0:0,y1:1.5});}
      for(const z of [16,21]){box('concrete',5,1.8,z,8,3.6,.18);for(let x=1.1;x<9;x+=.22){if(x>2.1&&x<3.6)continue;k.cylinder('darkMetal',x,1.6,z-2.4,.027,3.2);}solids.push({x:1.6,z:z-2.4,w:1,d:.09,y0:0,y1:3.2},{x:6.3,z:z-2.4,w:5.4,d:.09,y0:0,y1:3.2});bed(k,7,z-1);}
      label('HOLDING',5,3.6,13.65,3,.5);label('SHERIFF’S DEPARTMENT',-4,2.8,23.94,5,.7);
      prop('wall_camera',-9.4,12,.7);
    },
    judicial(){furnishings.office();box('wood',0,.15,18,8,.3,5);label('JUDICIAL',0,4.8,23.9,5,.75);for(const x of [-6.7,6.7])box('green',x,1.8,18,2,3.6,.6);},
    it(){buildITOffices(k,{box,solids,interactions,label});},
    vault(){
      const halo=buildVault(k,{box,solids,interactions,label,animated});
      root.add(halo);
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
      // Half the agricultural wings grow, half of them keep animals. The books
      // are clear the farms do both — the levels smell of manure and there is
      // pork and rabbit on the plates — and a hall of hydroponic troughs on
      // its own is only half of what a silo has to feed itself with.
      // Beds at the front, animals at the back. Every agricultural wing does
      // both: a hall of hydroponic troughs on its own is half of what a silo
      // has to feed itself with, and the books are plain that the farm levels
      // smell of manure and put pork and rabbit on the plates.
      for(const x of [-7.4,-2.6,2.6,7.4]){
        box('darkConcrete',x,.26,8.6,3.5,.52,10.2);k.box('soil',x,.54,8.6,3.2,.06,9.9);
        for(let z=4.2;z<13.2;z+=.75)for(let dx=-1.1;dx<1.3;dx+=.72){const p=x+dx+(rng()-.5)*.18;k.cylinder('leaf',p,.88,z,.035,.65);for(let j=0;j<3;j++)k.leaf(j%2?'leafLight':'leaf',p+(rng()-.5)*.25,.8+j*.17,z,.24,.07,.48,rng()*TAU);}
        fixture(k,x,4.7,8.6,9,false,true);
        pipe(k,x,8.6,.8,11,.04,'blue');
      }
      prop('hydroponics',-8,1.7,.72);
      livestock=buildLivestock(materials,k,rng,{solids,fixtureAt:(x,y,z,len)=>fixture(k,x,y,z,len,false,true)});
      label('AGRICULTURE · GROWING HALL AND STOCK',0,4.6,1,7,.6);
      interactions.push({position:[0,1.2,15.6],label:'Look over the pens',action:'livestock'});
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
      prop('workbench',0,20,.75);dressWorkshop(k,root);
      for(const z of [4,9,14,19]){shelf(k,-8.8,z,1.4);k.cylinder('rust',8.5,1,z,.5,2);}
      label(level===144?'WALKER · ELECTRICAL REPAIRS':'MECHANICAL · REPAIR SHOP',0,4.2,1,6,.55);
      interactions.push({position:[0,1.2,19],label:'Inspect the repair bench',action:'workshop'});
    },
    mechanical(){furnishings.workshop();if(level===144){label('GENERATOR HALL ↓',0,3.4,23.91,5,.65);interactions.push({position:[0,1.5,22],label:'Descend to generator hall',destination:'generator'},{position:[-6,1.5,22],label:'Descend to mines',destination:'mines'});}for(const x of [-3.5,3.5]){k.cylinder('metal',x,1.1,11,1,2.5,Math.PI/2);solids.push({x,z:11,w:2,d:2.6,y0:0,y1:2.2});pipe(k,x,13,3.8,17,.32,'rust');}},
    recycling(){
      box('metal',0,.7,13,3,1.4,15);k.box('black',0,1.43,13,2.7,.05,14.8);for(let z=6;z<20;z+=.4)k.box('metal',0,1.49,z,2.65,.035,.04);
      for(let i=0;i<18;i++)k.box(i%3?'rust':'wood',(rng()-.5)*2,1.7,6+rng()*13,.3+rng()*.5,.3,.4,false);
      for(const x of [-6.5,6.5])for(const z of [7,14,21]){box('rust',x,.6,z,2.8,1.2,2.2);k.box('black',x,1.22,z,2.5,.02,1.9);}
      box('darkMetal',0,2.7,23,4.5,5.4,1.4);label('REFUSE CHUTE',0,3,22.25,3,.6);interactions.push({position:[0,1.5,21.8],label:'Inspect refuse chute',action:'chute'});
    },
    porter(){
      box('wood',-4,.7,6,8,1.4,1.1);for(const x of [-7,-4,0,4,7])for(const z of [12,18,22]){shelf(k,x,z,2.3);for(const y of [.5,1.15,1.8])k.bevel('fabric',x,y,z,1.8,.5,.62);}
      label('PORTER DISPATCH',0,4.3,1,5,.65);label('DELIVERIES · COLLECTIONS',0,3.4,23.9,5,.45);desk(k,6,5);chair(k,6,6);
    },
    bar(){
      box('wood',-5,.65,13,1.3,1.3,17);k.bevel('metal',-5,1.33,13,1.6,.1,17);
      for(const z of [5,8,11,14,17,20]){k.cylinder('metal',-3.1,.4,z,.04,.8);k.cylinder('wood',-3.1,.83,z,.33,.13);}
      for(const z of [6,12,18]){table(k,4,z,3,1.5);for(const x of [2.9,5.1]){chair(k,x,z-1.1,Math.PI);chair(k,x,z+1.1);}}
      for(const y of [1.3,2.3,3.3]){k.box('wood',-8.5,y,13,1,.08,17);for(let z=5;z<21;z+=.5){k.cylinder('green',-8.5,y+.2,z,.1,.36);k.cylinder('brass',-8.5,y+.42,z,.044,.13);}}
      label('THE BAR',0,4.2,1,4,.75);
    },
    park(){
      for(const x of [-6.5,6.5])for(const z of [7,15,21]){box('darkConcrete',x,.2,z,4.4,.4,4.4);k.box('soil',x,.42,z,4.1,.05,4.1);k.cylinder('wood',x,1.7,z,.18,2.7);for(let j=0;j<8;j++){const a=j*TAU/8;k.leaf(j%2?'leaf':'leafLight',x+Math.cos(a),3+Math.sin(j)*.3,z+Math.sin(a),1.2,.45,1.5,a);}}
      for(const z of [5,12,19])for(const x of [-2.6,2.6]){k.bevel('wood',x,.55,z,1.7,.13,.65);k.box('wood',x,.94,z+.34,1.7,.7,.09);}
      label('PARK & ORCHARD',0,4.6,1,5,.55);
    },
    laundry(){
      for(const x of [-7,7])for(const z of [6,10,14,18,22]){box('pale',x,.75,z,2.2,1.5,1.5);k.torus('metal',x,.83,z-.79,.49,.055);k.cylinder('black',x,.83,z-.78,.41,.04,Math.PI/2);k.box('brass',x+.6,1.31,z-.79,.14,.06,.03);}
      for(const z of [7,14,21]){table(k,0,z,4,1.5);for(const x of [-1,0,1])k.bevel('linen',x,.95,z,.65,.24,1.1);}
      label('LAUNDRY',0,4.5,1,5,.65);
    },
    janitorial(){
      // Public closet at the front, through-door to the concealed Watcher Room.
      box('pale',-5.9,2.2,8,8.2,4.4,.2);box('pale',5.9,2.2,8,8.2,4.4,.2);k.box('pale',0,3.9,8,3.6,1,.2);
      for(const x of [-7,7]){shelf(k,x,4,2.6);for(let j=0;j<6;j++){k.cylinder('blue',x-1+j*.4,1,4,.14,.32);k.cylinder('wood',x-1+j*.4,1.55,5,.018,2.7);}}
      furnishings.surveillance();label('JANITORIAL',0,3.8,1,4,.6);label('AUTHORIZED ACCESS',0,3,7.85,2.8,.4);
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
      for(const x of [-7,7]){box('metal',x,.6,4,3.4,1.2,.7);for(const dx of [-1,0,1]){k.bevel('linen',x+dx,1.25,4,.65,.16,.6);}}
      label('CLEANING · SUIT PREPARATION',0,4.1,1,6,.6);label('OUTER DOOR · SEALED',0,3.5,8.8,3,.5);
      interactions.push({position:[0,1.6,8.1],label:'Inspect cleaning airlock',action:'airlock'});
    },
  };
  function serverRack(x,z){box('darkMetal',x,1.5,z,1.65,3,1.1);for(let y=.3;y<2.9;y+=.24){k.box('metal',x,y,z-.58,1.45,.17,.08);for(let j=0;j<4;j++)k.box(j===0?'indicator':'brass',x-.56+j*.14,y,z-.63,.045,.03,.01);}}
  (furnishings[type]||furnishings.residential)();
  if(level===144&&wing===1){k.box('metal',-5.35,.8525,6,.52,.035,.32);for(const dx of [-.12,.12])k.box(dx<0?'linen':'black',-5.35+dx,.874,6,.08,.008,.26);interactions.push({position:[-5.35,1.1,6],label:'Examine the heat-tape samples',action:'lore:tape'});}
  for(const x of (type==='vault'?[]:[-W+.18,W-.18])){k.box('green',x,.75,D/2,.09,1.5,D-.3);k.box('darkMetal',x,.08,D/2,.12,.16,D-.3);k.box('metal',x,1.51,D/2,.1,.05,D-.3);}
  for(const z of [4.5,11.5,18.5])for(const x of [-W+.22,W-.22]){k.cylinder('metal',x,2.3,z,.035,4.6);k.bevel('green',x<0?x+.08:x-.08,1.6,z,.19,.36,.25);}
  for(const x of [-7,-3.5,3.5,7]){k.box('metal',x,H-.13,D/2,.055,.05,D-.4);}
  for(const x of [-1.96,1.96]){k.bevel('metal',x,1.62,.05,.15,3.26,.27);for(const y of [.3,1.4,2.8])k.cylinder('brass',x,y,-.12,.035,.06,Math.PI/2);}
  dressRoom(k,root,type,level,wing);root.add(k.group());
  if(livestock)for(const a of livestock)root.add(a.group);
  root.userData={...root.userData,solids,interactions,animated,type,livestock};
  return root;
}
