import * as THREE from '../vendor/three.module.js';
import { Kit, addSign, fixture, table, chair, desk, bed, pipe } from './kit.js';
import { buildCafeteriaCeiling } from './cafeteria-ceiling.js';
import { dressCafeteria } from './environment-details.js';

export function makeDisplayGeometry(w,h,radius=34){
  const positions=[],uv=[],indices=[],cols=96,rows=16,r=1.15;
  for(let i=0;i<=cols;i++){const x=(i/cols-.5)*w,dx=Math.max(0,Math.abs(x)-(w/2-r)),clip=r-Math.sqrt(Math.max(0,r*r-dx*dx));for(let j=0;j<=rows;j++){const y=clip+(h-2*clip)*j/rows;positions.push(x,y,radius-Math.sqrt(radius*radius-x*x));uv.push(i/cols,y/h);}}
  for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const a=i*(rows+1)+j,b=(i+1)*(rows+1)+j;indices.push(a,b,b+1,a,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

// A connected bespoke Level 1 plan. The exact passage dimensions are inferred.
// Local +Z leads out from the gallery, through civic rooms, then up to daylight.
export function buildTopFloor(m) {
  const root=new THREE.Group(),k=new Kit(m),solids=[],floors=[],interactions=[],animated=[],doors=[];
  const box=(mat,x,y,z,w,h,d,solid=true)=>{k.box(mat,x,y,z,w,h,d);if(solid)solids.push({x,z,w,d,y0:y-h/2,y1:y+h/2});};
  const floor=(x,z,w,d,y=0)=>{box('floor',x,y-.2,z,w,.4,d,false);floors.push({x,z,w,d,y});};
  const label=(t,x,y,z,w=4,h=.5,ry=Math.PI)=>addSign(root,t,[x,y,z],w,h,ry);
  const wall=(x,z,w,d,h=8.3)=>box('pale',x,h/2,z,w,h,d);
  wall(-6,0,8,.25);wall(6,0,8,.25);
  floor(0,5,20,10);floor(0,24.5,36,29);floor(0,39.5,36,1);
  wall(-10,5,.3,10);wall(10,5,.3,10);wall(-14,10,8,.3);wall(14,10,8,.3);
  wall(-18,25,.35,30);wall(18,17,.35,14);wall(18,36,.35,8);wall(0,40,36,.35);
  box('darkConcrete',0,8.5,25,36,.4,30,false);box('darkConcrete',0,8.5,5,20,.4,10,false);
  // Deep coffered ceiling and ribbed stone piers frame the communal hall.
  for(const z of [10,18,26,34,39]){k.box('concrete',0,7.9,z,36,.7,.75);for(const x of [-17.65,17.65]){k.bevel('concrete',x,4,z,.8,8,.9);k.box('darkConcrete',x,.55,z,.94,1.1,1.05);}}
  root.add(buildCafeteriaCeiling(m));
  for(const x of [-17.45,17.45])for(const z of [14,22,36]){k.bevel('brass',x,3.3,z,.22,.75,.35);k.sphere('lamp',x,3.4,z,.18,.27,.18);}
  for(const z of [12.8,17,22,27,32])for(const x of [-11,-5,2,9]){
    table(k,x,z,3.3,1.4,'metal');solids.push({x,z,w:3.3,d:1.4,y0:0,y1:.9});
    // Both rows face the screen wall at +z, the way a room built around a view is seated.
    for(const dx of [-1.05,0,1.05]){chair(k,x+dx,z-1.15);chair(k,x+dx,z+1.15);for(const side of [-1,1])solids.push({x:x+dx,z:z+side*1.15,w:.48,d:.5,y0:0,y1:.96});}
    k.cylinder('white',x+.6,.91,z,.11,.13);k.cylinder('white',x-.6,.84,z,.22,.02);
  }
  for(const x of [-15.8,-12.5,-9.2]){box('green',x,.7,7,3.1,1.4,1.5);k.bevel('metal',x,1.45,7,3.2,.1,1.6);}
  for(let j=0;j<10;j++){k.cylinder('white',-16+j*.7,1.57,7,.2,.15);}
  label('CAFETERIA',0,4.1,1,5,.7);label('SHERIFF  →',15,3.7,30,3.1,.4,Math.PI/2);
  // A 30 m rounded wall display, continuously fed by the exterior camera.
  const frame=new THREE.Mesh(makeDisplayGeometry(31.1,7.3),m.darkMetal);frame.position.set(0,.35,39.56);frame.rotation.y=Math.PI;frame.userData.ownedGeometry=true;root.add(frame);
  const screen=new THREE.Mesh(makeDisplayGeometry(30,6.8),new THREE.MeshBasicMaterial({color:0xffffff}));screen.rotation.y=Math.PI;screen.position.set(0,.6,39.34);screen.userData.ownedGeometry=true;screen.userData.ownedMaterial=true;root.add(screen);
  for(const x of [-16.15,16.15]){k.bevel('concrete',x,4.0,38.1,.55,7.8,.65);for(const y of [.22,7.62])k.bevel('darkConcrete',x,y,38.1,.72,.18,.80);}
  for(const side of [-1,1])for(const y of [.2,.38,7.6])k.bevel('darkConcrete',side*17.77,y,25,.09,.12,29.6);
  // Sheriff's station: its only public entrance is through the cafeteria.
  floor(26,34,16,20);wall(26,24,16,.3,4.7);wall(34,34,.3,20,4.7);wall(18,42,.3,4,4.7);
  box('darkConcrete',26,4.9,34,16,.4,20,false);
  for(const x of [22,28])for(const z of [29,35]){desk(k,x,z);chair(k,x,z+1);solids.push({x,z,w:2,d:1,y0:0,y1:1.5});}
  for(const x of [20,22,24]){box('green',x,1.25,42,1.6,2.5,.7);for(const y of [.4,.9,1.4,1.9]){k.box('brass',x,y,41.61,.28,.04,.03);}}
  label('SHERIFF’S STATION',26,3.8,24.2,6,.7,0);for(const z of [28,37])fixture(k,26,4.55,z,5);
  // A duty monitor on the station wall, on the same feed. Wool only ever
  // describes two wall-screens — the cafeteria and the cell — so this one is a
  // placement, not a claim: the office that runs the cleanings watches them.
  const dutyFrame=new THREE.Mesh(new THREE.BoxGeometry(.10,1.18,1.86),m.darkMetal);dutyFrame.position.set(33.79,2.28,32);dutyFrame.userData.ownedGeometry=true;root.add(dutyFrame);
  const dutyScreen=new THREE.Mesh(new THREE.PlaneGeometry(1.66,.96),new THREE.MeshBasicMaterial({color:0xffffff}));
  dutyScreen.rotation.y=-Math.PI/2;dutyScreen.position.set(33.72,2.28,32);dutyScreen.userData.ownedGeometry=true;dutyScreen.userData.ownedMaterial=true;root.add(dutyScreen);
  // Solid wall above an open internal doorway into preparation.
  wall(21,44,6,.3,4.7);wall(31,44,6,.3,4.7);box('pale',26,4.25,44,4,.9,.3);
  floor(26,49,8,10);wall(30,49,.3,10,4.7);wall(22,45,.3,2,4.7);wall(22,53,.3,2,4.7);box('darkConcrete',26,4.85,49,8,.3,10,false);
  floor(18,49,8,6);wall(14,49,.3,6,3.7);wall(18,46,8,.3,3.7);wall(18,52,8,.3,3.7);box('pale',18,3.85,49,8,.3,6,false);
  bed(k,15.3,49);k.box('wood',19.5,.5,51.5,2,.15,.5);label('HOLDING 3',21.8,2.8,47,2,.35,Math.PI/2);
  // The cell carries the same exterior feed as the cafeteria wall. It is the
  // one thing the condemned are given to look at, and it faces the bunk.
  const cellFrame=new THREE.Mesh(new THREE.BoxGeometry(.12,1.5,2.4),m.darkMetal);cellFrame.position.set(14.28,1.85,49);cellFrame.userData.ownedGeometry=true;root.add(cellFrame);
  const cellScreen=new THREE.Mesh(new THREE.PlaneGeometry(2.16,1.28),new THREE.MeshBasicMaterial({color:0xffffff}));
  cellScreen.rotation.y=Math.PI/2;cellScreen.position.set(14.35,1.85,49);cellScreen.userData.ownedGeometry=true;cellScreen.userData.ownedMaterial=true;root.add(cellScreen);
  fixture(k,17,3.6,49,2.2);
  // Bars leave a true 1.5 m opening. Empty benches and folded equipment only.
  for(const z of [46.2,46.45,46.7,47,47.25,50.75,51,51.3,51.6,51.8])k.cylinder('darkMetal',22,1.6,z,.026,3.2);
  box('green',29,.55,49,1,1.1,5);for(const z of [47.5,49,50.5]){k.bevel('linen',29,1.18,z,.72,.13,.65);k.torus('brass',29,1.27,z,.17,.035,Math.PI/2);}
  label('CLEANING PREPARATION',26,3.9,44.2,3.5,.42,0);fixture(k,26,4.5,49,3.2,true,true);
  // Mechanically operated inner / outer pressure doors with collision linked
  // to their animated position. Cycling one closes the other first.
  floor(26,59,6,10);wall(23,59,.45,10,4.8);wall(29,59,.45,10,4.8);box('darkConcrete',26,5,59,6,.4,10,false);
  for(const x of [23.27,28.73])box('airlockTile',x,2.4,59,.075,4.8,9.7,false);
  for(const z of [54,64]){
    wall(23.5,z,1,.6,5);wall(28.5,z,1,.6,5);box('concrete',26,4.5,z,4.2,1,.65);
    const outline=(path,x,y,w,h,r)=>{path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);};
    const shape=new THREE.Shape(),hole=new THREE.Path();outline(shape,-2.9,-.25,5.8,5.5,1.2);outline(hole,-2.03,0,4.06,4.15,.55);shape.holes.push(hole);const frameGeo=new THREE.ExtrudeGeometry(shape,{depth:.55,bevelEnabled:true,bevelSize:.055,bevelThickness:.05,bevelSegments:2,steps:1,curveSegments:12});const frame=new THREE.Mesh(frameGeo,m.concrete);frame.position.set(26,0,z-.27);frame.castShadow=frame.receiveShadow=true;frame.userData.ownedGeometry=true;root.add(frame);
    const pivot=new THREE.Group(),dk=new Kit(m);pivot.position.set(26,0,z);
    dk.bevel('metal',0,2,0,3.95,4,.4);dk.box('green',0,2,-.23,3.4,3.45,.08);dk.beam('darkMetal',[-1.55,.25,-.29],[1.55,3.7,-.29],.035);dk.beam('darkMetal',[-1.55,3.7,-.29],[1.55,.25,-.29],.035);
    for(const x of [-1.65,1.65])dk.bevel('brass',x,2,-.32,.06,.5,.1);
    for(const x of [-1.78,1.78])for(const y of [.25,1.15,2.85,3.75])dk.cylinder('brass',x,y,-.27,.065,.1,Math.PI/2);
    pivot.add(dk.group());root.add(pivot);
    const id=z===54?'inner':'outer';doors.push({id,pivot,x:26,z,w:3.95,h:4,open:false,amount:0,requested:false,collider:null});
    for(const side of [-1,1]){label(id==='inner'?'INNER DOOR':'SURFACE',26,4.5,z+side*.36,2.7,.35,side<0?Math.PI:0);interactions.push({position:[26,1.5,z+side*1.25],label:`Cycle ${id} airlock door`,action:`airlock-${id}`});}
  }
  for(const z of [56,60,63]){fixture(k,23.32,2.7,z,1.4,true,true);fixture(k,28.68,2.7,z,1.4,true,true);}
  for(const x of [24,28])pipe(k,x,59,4.4,9,.08,'metal');
  for(let z=55;z<64;z+=.35)k.box('darkMetal',26,.008,z,4.8,.012,.06);
  dressCafeteria(k,root);root.add(k.group());
  root.userData={...root.userData,solids,floors,interactions,animated,doors,type:'cafeteria',outsideScreen:screen,extraScreens:[cellScreen,dutyScreen],bespoke:true};return root;
}
