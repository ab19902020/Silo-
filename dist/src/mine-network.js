import * as THREE from '../vendor/three.module.js';
import { Kit, random, addSign, fixture } from './kit.js';

// The mine workings.
//
// What was here was one straight drive, 8 m wide and 64 m long, with a rock
// face at each end. You could see all of it from the door. A mine is not a
// corridor: it is a decision about which way to go, made repeatedly, in the
// dark, by somebody who has to be able to find their way back out.
//
// So this is a network with a hub, three ways north out of it and a cross-cut
// that joins them at the top — two genuine loops, which is the thing that makes
// it a place rather than a route. Everything off those is real: an ore face
// being worked, a pump chamber that was abandoned with the water still in it,
// a branch that genuinely collapsed and genuinely does not go anywhere, a
// ventilation gallery, a tool cache and a fan chamber up three steps that
// nothing requires you to visit.
//
// Nothing here is a fake door. If a passage is drawn, it is walkable; if it is
// blocked, you can walk up to the blockage and see what blocked it.
//
// FINDING YOUR WAY. There are no floating markers. Each route carries a painted
// band at shoulder height in its own colour, its timbers are numbered by
// notches cut into the post, the cable trays overhead follow the colour of the
// route they feed, chalk arrows point back the way you came at every junction,
// and the airflow cloth hangs into the draught so the way to the fan is the way
// the rags are pointing. Each part of the network is lit differently: the
// arrival gallery is warm strung lamps, the switch chamber is bright and even,
// the deep face is one hard work light, the pump chamber is a single failing
// green cold lamp, and the fan chamber is unlit except for what leaks in.
//
// GEOMETRY. Everything is merged into one batch per material through `Kit`. The
// walls are not placed by hand: the network is a 1 m cell grid, and a wall is
// emitted wherever a floor cell has no floor cell beside it. That is what makes
// every junction open correctly and what makes it impossible to draw a doorway
// into solid rock.
//
// COORDINATES. Everything is local to the mine anchor. Colliders and walkways
// carry `local: true`; the host translates them.

const routeColour={A:'ochre',B:'blue',C:'red',D:'enamel',E:'white'};

// The plan. Integer bounds on the cell grid, so the wall generator can decide
// what is a doorway and what is rock without being told.
const AREAS=Object.freeze([
  {id:'arrival',label:'ARRIVAL GALLERY',route:'A',x0:-4,x1:4,z0:-33,z1:5,y:0,height:4.4,kind:'drive'},
  {id:'switch',label:'SWITCH CHAMBER',route:'A',x0:-11,x1:11,z0:5,z1:19,y:0,height:5.6,kind:'chamber'},
  {id:'west-drive',label:'WEST DRIVE',route:'B',x0:-24,x1:-11,z0:7,z1:13,y:0,height:4.2,kind:'drive'},
  {id:'west-rise',label:'WEST DRIVE',route:'B',x0:-24,x1:-18,z0:13,z1:41,y:0,height:4.2,kind:'drive'},
  {id:'pump',label:'PUMP CHAMBER',route:'B',x0:-32,x1:-24,z0:17,z1:29,y:0,height:5,kind:'chamber'},
  {id:'east-drive',label:'EAST DRIVE',route:'C',x0:11,x1:24,z0:7,z1:13,y:0,height:4.2,kind:'drive'},
  {id:'east-rise',label:'EAST DRIVE',route:'C',x0:18,x1:24,z0:13,z1:41,y:0,height:4.2,kind:'drive'},
  {id:'collapse',label:'BRANCH 3 — CLOSED',route:'C',x0:24,x1:35,z0:19,z1:25,y:0,height:4,kind:'drive'},
  {id:'vent',label:'VENTILATION GALLERY',route:'D',x0:-4,x1:4,z0:19,z1:41,y:0,height:3.8,kind:'drive'},
  {id:'cache',label:'TOOL CACHE',route:'D',x0:4,x1:11,z0:27,z1:33,y:0,height:3.4,kind:'chamber'},
  {id:'fan-step',label:'FAN CHAMBER',route:'E',x0:-9,x1:-4,z0:31,z1:35,y:0,height:3.4,kind:'steps'},
  {id:'fan',label:'FAN CHAMBER',route:'E',x0:-16,x1:-9,z0:29,z1:37,y:.75,height:4.2,kind:'chamber'},
  {id:'crosscut',label:'CROSS-CUT 4',route:'B',x0:-24,x1:24,z0:41,z1:47,y:0,height:4.6,kind:'drive'},
  {id:'face',label:'ORE FACE 18',route:'A',x0:-7,x1:7,z0:47,z1:55,y:0,height:5.4,kind:'chamber'},
]);

// Where the host can put somebody down, with a heading. `mine-junction`,
// `mine-pump` and `mine-deep-face` are the three the work package names.
const DESTINATIONS=Object.freeze([
  {id:'mine-arrival',name:'Mine · arrival gallery',position:Object.freeze([0,0,-29]),yaw:0},
  {id:'mine-junction',name:'Mine · switch chamber',position:Object.freeze([0,0,11]),yaw:0},
  {id:'mine-pump',name:'Mine · abandoned pump chamber',position:Object.freeze([-27,0,27.4]),yaw:0},
  {id:'mine-deep-face',name:'Mine · deep ore face',position:Object.freeze([0,0,50]),yaw:0},
]);

// Two things scratched into the rock by people who worked here. Both are this
// build's invention; neither quotes anything. See docs/mine-network.md.
const SCRATCHED=Object.freeze([
  {id:'mine-tally',position:Object.freeze([30.4,1.35,22]),
   label:'Read the tally cut into the last standing timber',
   text:'Sixty-one marks cut into the post in fours, and the sixty-second started and abandoned half way through. Under them, in a different hand and a steadier one: NOT TODAY. — B.M.'},
  {id:'mine-cache-lid',position:Object.freeze([9.4,1.1,30]),
   label:'Read the inside of the tool cache lid',
   text:'Chalked on the underside of the lid, where only somebody putting something back would see it: IF YOU ARE READING THIS THE LAMP IS ON MY SHELF. PUT IT BACK. — HOLLIS'},
]);

const key=(x,z)=>`${x},${z}`;
// Shared scratch objects: `update` must not allocate per frame.
const scratch=new THREE.Vector3(),pose=new THREE.Vector3(),lean=new THREE.Quaternion();
const matrix=new THREE.Matrix4(),ONE=new THREE.Vector3(1,1,1),AXIS=new THREE.Vector3(1,0,0);

// The cell grid. Every floor cell knows its height and which area it belongs
// to, which is what lets the wall pass tell rock from doorway.
function cells(){
  const map=new Map();
  for(const area of AREAS){
    for(let x=area.x0;x<area.x1;x++)for(let z=area.z0;z<area.z1;z++){
      // Three steps up into the fan chamber, 25 cm each — inside the walking
      // controller's 30 cm step, so it is stepped rather than ramped.
      const y=area.kind==='steps'?Math.max(0,Math.min(.75,(-4-x)*.25)):area.y;
      map.set(key(x,z),{x,z,y,area});
    }
  }
  return map;
}

// Merge collinear wall segments into runs, so 400 m of wall is a few dozen
// boxes rather than four hundred.
function wallRuns(grid){
  const runs=[],seen=new Set();
  const sides=[[1,0,'x'],[-1,0,'x'],[0,1,'z'],[0,-1,'z']];
  for(const cell of grid.values()){
    for(const [dx,dz,axis] of sides){
      const beyond=grid.get(key(cell.x+dx,cell.z+dz));
      if(beyond)continue;                                  // a doorway, not a wall
      const id=`${cell.x},${cell.z},${dx},${dz}`;if(seen.has(id))continue;
      // Walk along the wall while it stays a wall on the same side.
      const step=axis==='x'?[0,1]:[1,0];
      let length=0,top=cell.y+cell.area.height;
      for(let n=0;;n++){
        const at=grid.get(key(cell.x+step[0]*n,cell.z+step[1]*n));
        if(!at||grid.get(key(at.x+dx,at.z+dz)))break;
        seen.add(`${at.x},${at.z},${dx},${dz}`);length++;
        top=Math.max(top,at.y+at.area.height);
      }
      if(!length)continue;
      const cx=cell.x+.5+step[0]*(length-1)/2+dx*.5,cz=cell.z+.5+step[1]*(length-1)/2+dz*.5;
      runs.push({x:cx,z:cz,w:axis==='x'?.6:length,d:axis==='x'?length:.6,
        y0:cell.y-.4,y1:top,axis,along:length,area:cell.area});
    }
  }
  return runs;
}

export function buildMineNetwork(materials,options={}){
  const {seed=52118,detail=1}=options;
  const root=new THREE.Group();root.name='mine-network';
  const k=new Kit(materials),rng=random(seed);
  const solids=[],walkways=[],interactions=[],lights=[];
  const grid=cells(),runs=wallRuns(grid);

  const solid=(x,z,w,d,y0,y1)=>solids.push({x,z,w,d,y0,y1,local:true});
  const floor=(area,x,z,w,d,y)=>walkways.push({kind:'box',x,z,w,d,y,local:true,area:area.id});

  // --- rock ---------------------------------------------------------------
  for(const area of AREAS){
    const w=area.x1-area.x0,d=area.z1-area.z0,cx=(area.x0+area.x1)/2,cz=(area.z0+area.z1)/2;
    if(area.kind==='steps'){
      // Each tread is its own floor, so the collision reads the rise the same
      // way the geometry does.
      for(let x=area.x0;x<area.x1;x++){
        const y=Math.max(0,Math.min(.75,(-4-x)*.25));
        k.box('rock',x+.5,y-.3,cz,1,.6,d);floor(area,x+.5,cz,1,d,y);
      }
    }else{
      k.box('rock',cx,area.y-.3,cz,w,.6,d);floor(area,cx,cz,w,d,area.y);
    }
    k.box('rock',cx,area.y+area.height+.4,cz,w+.6,.8,d+.6);           // back of the roof
  }
  // Walls, from the grid: rock where there is no floor beyond, and nowhere else.
  for(const run of runs){
    k.box('rock',run.x,(run.y0+run.y1)/2,run.z,run.w,run.y1-run.y0,run.d);
    solid(run.x,run.z,run.w,run.d,run.y0,run.y1);
    // Broken rock along the foot and shoulder of every wall, so the cut faces
    // read as blasted rather than cast.
    const along=run.along,step=run.axis==='x'?[0,1]:[1,0];
    for(let i=0;i<along;i+=2){
      const t=i+.5-along/2,x=run.x+step[0]*t,z=run.z+step[1]*t;
      k.sphere('rock',x+(rng()-.5)*.5,run.y0+.45+rng()*.5,z+(rng()-.5)*.5,.42+rng()*.5,.34+rng()*.3,.42+rng()*.5);
      if(rng()<.45*detail)k.sphere('rock',x+(rng()-.5)*.6,run.y1-.5-rng()*.7,z+(rng()-.5)*.6,.36+rng()*.42,.3+rng()*.26,.36+rng()*.42);
    }
  }

  // --- the drives: timbers, numbers, bands, cable, track -------------------
  // A timber set every four metres, numbered by notches cut into the near post
  // the way a set actually is, and a painted band at shoulder height in the
  // route's colour. That is the whole wayfinding system: no markers, nothing
  // floating, nothing that is not a thing somebody put there.
  const timberSet=(area,along,at,number)=>{
    const drive=area.kind!=='chamber',half=drive?(area.x1-area.x0)/2:(area.x1-area.x0)/2;
    const cx=along==='z'?(area.x0+area.x1)/2:at,cz=along==='z'?at:(area.z0+area.z1)/2;
    const across=along==='z'?half:(area.z1-area.z0)/2,head=area.y+area.height-.5;
    for(const side of [-1,1]){
      const px=cx+(along==='z'?side*(across-.35):0),pz=cz+(along==='z'?0:side*(across-.35));
      k.box('wood',px,area.y+head/2,pz,.34,head,.34);
      // Notches: the set number, cut in fours.
      for(let n=0;n<Math.min(number,8);n++)k.box('black',px+(along==='z'?side*.18:0),area.y+1.62-n*.09,pz+(along==='z'?0:side*.18),along==='z'?.03:.2,.022,along==='z'?.2:.03);
    }
    k.box('wood',cx,area.y+head,cz,along==='z'?across*2:.36,.36,along==='z'?.36:across*2);
  };
  const band=(area,along,colour)=>{
    // Painted along both walls at 1.5 m, unbroken, so it can be followed by
    // hand in the dark as well as by eye.
    const across=along==='z'?(area.x1-area.x0)/2:(area.z1-area.z0)/2;
    const cx=(area.x0+area.x1)/2,cz=(area.z0+area.z1)/2;
    const length=along==='z'?area.z1-area.z0:area.x1-area.x0;
    // The wall pass leaves rock 30 cm inside the area edge, so the band sits at
    // across-.35: painted at .06 it was buried in the rock and could not be
    // followed at all, which is the one job it has.
    for(const side of [-1,1]){
      const x=cx+(along==='z'?side*(across-.35):0),z=cz+(along==='z'?0:side*(across-.35));
      k.box(colour,x,area.y+1.5,z,along==='z'?.06:length,.13,along==='z'?length:.06);
    }
  };
  const cableRun=(area,along,colour)=>{
    const across=along==='z'?(area.x1-area.x0)/2:(area.z1-area.z0)/2;
    const cx=(area.x0+area.x1)/2,cz=(area.z0+area.z1)/2,length=along==='z'?area.z1-area.z0:area.x1-area.x0;
    const x=cx+(along==='z'?across-.55:0),z=cz+(along==='z'?0:across-.55),y=area.y+area.height-.75;
    k.box('darkMetal',x,y,z,along==='z'?.26:length,.05,along==='z'?length:.26);
    for(const dy of [.05,.12])k.box(colour,x,y+dy,z,along==='z'?.05:length,.035,along==='z'?length:.05);
  };
  // A chalk arrow, pointing back the way out. Three strokes, nothing more.
  const chalkArrow=(x,y,z,heading)=>{
    const c=Math.cos(heading),s=Math.sin(heading);
    k.box('white',x,y,z,.5*Math.abs(c)+.06,.05,.5*Math.abs(s)+.06);
    for(const turn of [-.7,.7]){
      const hx=Math.cos(heading+turn)*.17,hz=Math.sin(heading+turn)*.17;
      k.box('white',x-c*.22+hx,y,z-s*.22+hz,Math.abs(hx)*2+.06,.05,Math.abs(hz)*2+.06);
    }
  };

  for(const area of AREAS){
    const along=(area.x1-area.x0)>(area.z1-area.z0)?'x':'z';
    const colour=routeColour[area.route];
    if(area.kind==='drive'){
      band(area,along,colour);cableRun(area,along,colour);
      const from=along==='z'?area.z0:area.x0,to=along==='z'?area.z1:area.x1;
      let number=1;
      for(let at=from+2;at<to;at+=4)timberSet(area,along,at+.5,number++);
      // Track down the middle of every drive, and sleepers under it.
      const cx=(area.x0+area.x1)/2,cz=(area.z0+area.z1)/2;
      for(let at=from;at<to;at+=.8)k.box('wood',along==='z'?cx:at,area.y+.05,along==='z'?at:cz,along==='z'?2.6:.18,.1,along==='z'?.18:2.6);
      for(const rail of [-.72,.72])k.box('rust',along==='z'?cx+rail:cx,area.y+.14,along==='z'?cz:cz+rail,along==='z'?.1:to-from,.09,along==='z'?to-from:.1);
    }
    if(area.kind==='chamber'){band(area,along,colour);cableRun(area,along,colour);}
  }

  // --- the switch chamber -------------------------------------------------
  // The hub. Four ways out and a rock pillar left standing in the middle of it
  // because taking it out would have brought the roof down.
  // Left standing because taking it out would have brought the roof down —
  // and set off the line the arrival and the ventilation gallery share, so the
  // chamber can be walked straight through.
  k.cylinder('rock',5.5,2.8,13,1.5,5.6);solid(5.5,13,3,3,0,5.6);
  for(const [x,z,heading] of [[-8,9,-Math.PI],[8,9,0],[0,17.4,Math.PI/2],[0,6.6,-Math.PI/2]])chalkArrow(x,.06,z,heading);
  // A route board: four painted bars on the rock, one per way out, in the four
  // colours. Not a sign — paint, the way a shift boss would actually mark it.
  for(const [i,route] of ['A','B','D','C'].entries()){
    k.box(routeColour[route],-10.62,2.5-i*.34,7.4,.08,.22,1.5);
    for(let n=0;n<=i;n++)k.box('white',-10.62,2.5-i*.34,8.4+n*.16,.08,.06,.09);
  }
  for(const [x,z] of [[-6,7.5],[6,7.5],[-6,16.5],[6,16.5]]){k.box('wood',x,1.1,z,1.6,2.2,1.2);k.box('darkMetal',x,1.1,z,1.68,.1,1.28);solid(x,z,1.6,1.2,0,2.2);}   // stacked crates
  addSign(root,'ORE WORKING 18',[0,3.4,5.4],5,.7);

  // --- arrival ------------------------------------------------------------
  addSign(root,'MECHANICAL ↑',[0,2.5,-32.4],4,.65);
  interactions.push({position:[0,1,-29],label:'Return to Mechanical',destination:144});
  for(let z=-30;z<4;z+=6)fixture(k,0,3.9,z,1.1,false);
  chalkArrow(0,.06,-26,-Math.PI/2);

  // --- the deep ore face --------------------------------------------------
  // Being worked: a face with a drill against it, cut rock on the floor, a
  // cart on the track and a single hard light on a stand.
  k.box('rock',0,2.7,54.4,14,5.4,1.4);solid(0,54.4,14,1.4,0,5.4);
  for(let i=0;i<28;i++)k.sphere('rock',(rng()-.5)*11,.2+rng()*.9,50.5+rng()*3.2,.3+rng()*.55,.26+rng()*.3,.3+rng()*.5);
  k.cylinder('yellow',1.6,1.35,53,.42,2.1,Math.PI/2);k.cylinder('metal',1.6,1.35,54.1,.14,1.3,Math.PI/2);
  for(let z=51.6;z<53.4;z+=.22)k.torus('metal',1.6,1.35,z,.425,.026);
  k.box('rust',-2.6,1.05,49.6,2.3,1.7,3.1);k.box('black',-2.6,1.9,49.6,2,.06,2.8);
  for(const dz of [-1.1,1.1])for(const x of [-3.7,-1.5])k.cylinder('darkMetal',x,.44,49.6+dz,.38,.18,0,0,Math.PI/2);
  solid(-2.6,49.6,2.5,3.2,0,2.4);
  k.cylinder('darkMetal',5.4,1.2,50,.09,2.4);k.box('metal',5.4,2.45,50,.5,.2,.36);
  interactions.push({position:[2.6,1,52.6],label:'Inspect the rock drill at the deep face',action:'mines'});

  // --- the pump chamber ---------------------------------------------------
  // Abandoned with the water still in it. The pump is seized, its cabling has
  // been cut back and taken away for something else, and the standing water
  // has not moved in long enough to have gone flat and green.
  k.cylinder('rust',-28,1.3,23,1.5,2.6);k.cylinder('darkMetal',-28,2.75,23,1.62,.32);
  k.cylinder('rust',-28,.85,20.4,.62,4,Math.PI/2);
  for(const z of [21.2,25.4])k.torus('metal',-28,.85,z,.66,.06,Math.PI/2);
  k.box('darkMetal',-30.4,1.5,23,.5,3,2.2);for(let i=0;i<4;i++)k.box('black',-30.1,2.3-i*.4,23,.08,.24,1.7);
  solid(-28,23,3.4,3.4,0,3.1);solid(-30.4,23,.5,2.2,0,3);
  // Cut cable ends, hanging.
  for(let i=0;i<7;i++)k.cylinder(routeColour.B,-30.05,2.1-i*.02,21.6+i*.42,.028,.5+rng()*.7);
  {const water=new THREE.Mesh(new THREE.PlaneGeometry(6.4,5.6),materials.water);
   water.name='mine-pump-water';water.rotation.x=-Math.PI/2;water.position.set(-28.2,.06,23);
   water.userData.ownedGeometry=true;water.renderOrder=2;root.add(water);}
  addSign(root,'PUMP 4 · OUT OF SERVICE',[-24.4,2.2,23],3,.5,-Math.PI/2);
  interactions.push({position:[-26.2,1,23],label:'Inspect the seized pump',action:'mines'});

  // --- the collapsed branch -----------------------------------------------
  // A real fall, at the far end of a real passage. You can walk up to it, and
  // the last set of timbers is standing at an angle it should not be standing at.
  for(let i=0;i<34;i++){const t=rng();k.sphere('rock',31.5+t*3.4+(rng()-.5)*1.2,.2+rng()*3.2*(1-t*.3),19.4+rng()*5.2,.5+rng()*.9,.45+rng()*.8,.5+rng()*.9);}
  solid(33,22,4,6,0,4);
  for(const side of [-1,1]){k.box('wood',30.6,1.7,22+side*2.3,.32,3.4,.32,0,0,side*.19);}
  k.box('wood',30.6,3.3,22,.34,.34,4.8,0,0,.09);
  addSign(root,'BRANCH 3 · CLOSED',[24.6,2.2,22],3,.5,Math.PI/2);

  // --- the ventilation gallery and the fan ---------------------------------
  // Airflow cloth: rags nailed to the roof that hang into the draught. They are
  // the only moving thing in the mine and they all lean the same way, which is
  // the way to the fan.
  const clothZ=[];for(let z=21;z<40;z+=3.2)clothZ.push(z);
  const clothGeo=new THREE.BoxGeometry(.05,.68,.34);clothGeo.translate(0,-.34,0);
  const cloths=new THREE.InstancedMesh(clothGeo,materials.linen,clothZ.length);
  cloths.name='mine-airflow-cloth';cloths.userData.ownedGeometry=true;
  cloths.castShadow=cloths.receiveShadow=true;cloths.frustumCulled=false;root.add(cloths);
  for(let z=22;z<40;z+=6)fixture(k,-2.6,3.3,z,.9,false,true);
  chalkArrow(0,.06,21,-Math.PI/2);chalkArrow(0,.06,39,-Math.PI/2);

  // The extract fan, in a chamber nothing sends you to.
  const fan=new THREE.Group();fan.position.set(-13,2.7,33);fan.rotation.y=Math.PI/2;
  {const fk=new Kit(materials);
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7;fk.box('metal',Math.cos(a)*.9,Math.sin(a)*.9,0,1.6,.34,.06,0,0,a+.5);}
   fk.cylinder('darkMetal',0,0,0,.34,.5,Math.PI/2);
   fan.add(fk.group([new THREE.Matrix4()],true));}
  root.add(fan);
  k.torus('rust',-13,2.7,33,1.9,.16,0,1,1);
  k.box('darkMetal',-13,.55,33,2.4,1.1,1.4);solid(-13,33,2.4,1.4,.75,1.85);
  for(let i=0;i<9;i++)k.box('darkMetal',-13,2.7,33+(i-4)*.42,3.6,.05,.05);
  addSign(root,'EXTRACT FAN 11',[-9.4,2.4,33],2.6,.44,-Math.PI/2);
  interactions.push({position:[-10.8,1.75,33],label:'Listen to the extract fan',action:'mines'});

  // --- the tool cache -----------------------------------------------------
  k.box('wood',9.2,.55,30,2.4,1.1,3.2);k.box('wood',9.2,1.16,30,2.5,.12,3.3);
  solid(9.2,30,2.4,3.2,0,1.2);
  for(const z of [28.8,31.2])k.box('darkMetal',9.2,1.24,z,1.9,.06,.14);
  for(let i=0;i<6;i++)k.box('rust',8.4+rng()*1.4,1.3,28.7+rng()*2.5,.1,.06,.9,rng()*3);
  k.box('metal',6.2,1.4,28.4,.5,2.8,.5);solid(6.2,28.4,.5,.5,0,2.8);for(let i=0;i<4;i++)k.box('darkMetal',6.2,2.4-i*.55,28.7,.42,.07,.1);

  // --- lighting -----------------------------------------------------------
  // Fixed practicals only. Nothing here follows anybody, nothing casts, and
  // each part of the network has its own character so you can tell where you
  // are with your eyes shut to everything but the colour.
  const lamp=(x,y,z,colour,intensity,distance)=>{
    const light=new THREE.PointLight(colour,intensity,distance,1.8);
    light.position.set(x,y,z);light.castShadow=false;root.add(light);lights.push(light);return light;
  };
  for(let z=-28;z<4;z+=8)lamp(0,3.5,z,0xe6c391,54,17);            // arrival: warm, strung
  for(const [x,z] of [[-6,9],[6,9],[-6,16],[6,16],[0,12]])lamp(x,4.6,z,0xd9d6c0,58,18);  // switch: bright, even
  for(const z of [16,26,36])lamp(-21,3.3,z,0xdcc9a4,42,15);       // west drive
  for(const z of [16,26,36])lamp(21,3.3,z,0xdcc9a4,42,15);        // east drive
  for(const z of [24,32,38])lamp(0,3,z,0xc8d6c4,38,13);           // vent gallery: cooler
  lamp(-28,3.4,23,0x8fc2a2,30,14);                                // pump: one failing green
  lamp(29,2.8,22,0xd0b489,26,11);                                 // the closed branch
  for(const [x,z] of [[-12,44],[12,44]])lamp(x,3.6,z,0xdcc9a4,44,16);
  lamp(0,4.2,51,0xf2e6c6,92,22);                                  // deep face: one hard work light
  lamp(8.4,2.6,30,0xe6c391,26,9);                                 // tool cache
  // The fan chamber has no lamp of its own. What is in there is what leaks in.

  // --- the two things somebody scratched ----------------------------------
  for(const egg of SCRATCHED)interactions.push({position:[...egg.position],label:egg.label,text:egg.text,action:egg.id});

  root.add(k.group([new THREE.Matrix4()],true));

  const bounds={min:[-33,-1,-34],max:[36,7,56]};
  const chambers=AREAS.map(a=>({id:a.id,label:a.label,route:a.route,kind:a.kind,
    bounds:{min:[a.x0,a.y,a.z0],max:[a.x1,a.y+a.height,a.z1]}}));

  // The only moving things in the mine: the fan, and the rags in its draught.
  // No allocation, and safe to leave out of the loop entirely.
  let spin=0;
  const update=(dt=0,time=0,playerPosition=null,quality='balanced')=>{
    if(!(dt>0))dt=0;
    spin+=dt*.9;fan.rotation.z=spin;
    if(quality==='low')return;
    // The rags only bother moving while somebody is in the gallery to see it.
    if(playerPosition){
      scratch.set(playerPosition.x,0,playerPosition.z);
      if(!(scratch.z>10&&scratch.z<44&&Math.abs(scratch.x)<14))return;
    }
    for(let i=0;i<clothZ.length;i++){
      lean.setFromAxisAngle(AXIS,-.62+Math.sin(time*1.7+i*.8)*.13);
      pose.set(2.6,3.5,clothZ[i]);
      matrix.compose(pose,lean,ONE);cloths.setMatrixAt(i,matrix);
    }
    cloths.instanceMatrix.needsUpdate=true;
  };

  return {root,solids,walkways,interactions,lights,destinations:DESTINATIONS,chambers,bounds,update};
}

export { AREAS as MINE_AREAS, DESTINATIONS as MINE_DESTINATIONS, SCRATCHED as MINE_INSCRIPTIONS };
