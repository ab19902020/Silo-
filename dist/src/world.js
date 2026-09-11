import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { ColliderSet } from './physics.js';
import { SILO, TAU, levelY, levelAt, roomType, TYPE_NAMES, stairStepY, STAIR_SWEEP, landingAngle, landingPoint } from './data.js';
import { Kit, createMaterials, addSign, fixture, disposeGroup, SIGN_DEPTH } from './kit.js';

// Gallery pylons, four to a wing sector. Spacing them evenly round the ring put
// a column 2.5 m from every door centre — half a metre clear of the jamb, right
// in the walking line out of the wing. Grouping them between the doorways keeps
// the same count and rhythm and leaves each doorway a clear approach.
const PYLON_ANGLES=Array.from({length:24},(_,i)=>(Math.floor(i/4)+(i%4+1)/5)*TAU/6);
// The gallery's outer wall steps back above the door head: it is a ring
// O-.2 .. O+.2 up to 3.35 m and O-.3 .. O+.3 above that. A sign hung at the
// wrong one of these either floats off the wall or is swallowed by it.
// Interior fixtures are dimmed and run down towards this on the night cycle.
// A silo that drops its lamps without warming them just looks underexposed.
const NIGHT_FILAMENT=new THREE.Color(0xff9a4e);
const SIGN_WALL=SILO.deckOuter-.2-SIGN_DEPTH/2;
const SIGN_WALL_HIGH=SILO.deckOuter-.3-SIGN_DEPTH/2;
import { buildRoom } from './rooms.js';
import { updateLivestock } from './livestock.js';

// The rooms a silo leaves standing open.
const PUBLIC_ROOMS=new Set(['cafeteria','bazaar','park','bar']);
import { buildBazaar } from './bazaar.js';
import { buildPassages, PASSAGE, hasRearPassage, SPUR, breach } from './passages.js';
import { loadPhotographicMaterials } from './materials.js';
import { buildTopFloor } from './top-floor.js';
import { SurfaceWorld, topPoint, topLocal, groundY, inRampCutout } from './surface.js';
import { buildGeneratorHall } from './generator-hall.js';
import { buildUnderground } from './underground.js';
import { buildStairFlight, hasStairGuard, buildTerminalLanding, terminalStart, buildNewel, sweepParapet,
  straightPath, helixPath, stairOpening, railRadius, guardZ, BRIDGE_GUARD_START, PARAPET, PARAPET_TOP, NEWEL } from './staircase.js';
import { buildSilo17 } from './silo17.js';
import { addGeorgeDesk, buildPressureGallery } from './mystery-spaces.js';
import { floorAtmosphere, dressFloor, INTERIOR_LIGHT } from './atmosphere.js';
import { VOID, voidLedgeGaps, tunnelPoint } from './void-access.js';

// 56 degrees off the middle when it is under half a metre away, closing to 21
// by five metres.
const ROOM_CENTRE=new THREE.Vector3();
const KEY_TARGET_DROP=new THREE.Vector3(0,-3,0);
const REACH_CONE=distance=>{const t=Math.min(1,Math.max(0,(distance-.45)/4.55));return .55+(.93-.55)*t*t;};

export class SiloWorld {
  constructor(scene) {
    this.scene=scene;this.m=createMaterials();this.assets={};this.loaded=new Map();this.pending=new Map();this.lastLevel=null;this.activeLevel=1;this.doors=[];this.interactions=[];this.colliders=new ColliderSet();this.animated=[];this.screens=[];this.special=null;this.quality='balanced';this.story=null;
    scene.background=new THREE.Color(0x121c19);scene.fog=new THREE.FogExp2(0x18221e,.0065);
    this.ambient=new THREE.HemisphereLight(0xb5c4c0,0x36332b,.42);scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xd7d9bc,2);this.sun.position.set(15,levelY(1)+20,-8);this.sun.target.position.set(0,levelY(1),0);scene.add(this.sun,this.sun.target);
    this.localLights=Array.from({length:8},()=>{const l=new THREE.PointLight(0xf3d6a0,0,38,1.7);l.userData={key:null,goal:0,baseColor:0xf3d6a0};scene.add(l);return l;});
    // What hour the silo thinks it is, handed in by the frame loop. Null
    // means no clock is running and the fixtures stay at working daylight.
    this.schedule=null;this.lampScale=1;this.lampWarmth=0;
    this.buildStructure();this.surface=new SurfaceWorld(this.m);scene.add(this.surface.root);this.generator=buildGeneratorHall(this.m);scene.add(this.generator.root);this.generator.root.visible=false;
    this.keyLight=new THREE.SpotLight(0xffd6a0,0,48,1.05,.8,1.65);this.keyLight.userData={key:null};this.keyLight.castShadow=true;this.keyLight.shadow.mapSize.set(1024,1024);this.keyLight.shadow.bias=-.00015;this.keyLight.shadow.normalBias=.045;this.keyLight.shadow.camera.near=.4;scene.add(this.keyLight,this.keyLight.target);
    this.sun.castShadow=false;this.sun.visible=false;this.sun.intensity=0;
    this.silo17=buildSilo17(this.m);scene.add(this.silo17.root);this.silo17.root.visible=false;
    this.pressure=buildPressureGallery(this.m);scene.add(this.pressure.root);this.pressure.root.visible=false;
    this.underground=buildUnderground(this.m);scene.add(this.underground.root);this.underground.root.visible=false;
  }
  async loadAssets(onProgress=()=>{}) {
    const names={hydroponics:'hab_hydroponics_v4',commons:'hab_commons_v4',door:'hab_door_v4',bed:'bed',chair:'chair',workbench:'maintenance_bench_v3',pipes:'pipe_cluster',lockers:'locker_bank_v3',storage:'storage_rack',wall_camera:'wall_camera_v3'};
    const loader=new GLTFLoader();let count=0;const materialLoad=loadPhotographicMaterials(this.m);
    const results=await Promise.allSettled(Object.entries(names).map(async([name,file])=>{
      const gltf=await loader.loadAsync(new URL(`../assets/lost-signal/${file}.glb`,import.meta.url).href);
      const original=gltf.scene,marker=original.getObjectByName('LS_ORIENT_YUP'),pivot=new THREE.Group();
      if(marker)marker.removeFromParent();else original.rotation.x=Math.PI/2;
      pivot.add(original);pivot.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(pivot),center=bounds.getCenter(new THREE.Vector3());original.position.x-=center.x;original.position.y-=bounds.min.y;original.position.z-=center.z;
      pivot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.assets[name]=pivot;onProgress(++count/10);
    }));
    this.assetFailures=results.filter(r=>r.status==='rejected').length;this.materialFailures=await materialLoad;this.surface.refreshMaterials();this.underground.refreshMaterials();
    return results;
  }
  buildStructure() {
    const k=new Kit(this.m),R=SILO.wellRadius,O=SILO.deckOuter,H=SILO.levelHeight,C=SILO.stairColumn,S=SILO.stairRadius;
    const gap=Math.asin((SILO.landingHalf+.02)/R),lk=new Kit(this.m);
    // Repeated structural geometry is instanced through the complete 144-level
    // shaft. Room contents stream independently; distant galleries stay real.
    k.arc('concrete',R,O,.42,-.42);k.arc('darkConcrete',R-.08,R+.5,.72,-.67);
    const galleryPath=Array.from({length:129},(_,i)=>{const a=gap+(TAU-gap*2)*i/128;return [Math.cos(a)*(R+.04),0,Math.sin(a)*(R+.04)];});
    sweepParapet(lk,galleryPath);
    // Three pairs of columns stay vertically aligned as the bridges rotate.
    for(let bearing=1;bearing<=3;bearing++)for(const side of [-1,1]){const p=landingPoint(bearing,NEWEL.x,side*NEWEL.z);buildNewel(k,p.cx,p.cz,H);}
    // Four-meter door gaps and service clerestories articulate the curved wall.
    const doorGap=2.05/O;
    for(let wing=0;wing<6;wing++){
      const a=wing*TAU/6,start=a+doorGap,end=a+TAU/6-doorGap;
      k.arc('darkConcrete',O-.2,O+.2,3.35,0,start,end-start,14);
      k.arc('concrete',O-.3,O+.3,H-3.35,3.35,a-TAU/12,TAU/6,24);
      for(const offset of [-.28,0,.28]){
        const aa=a+offset,rr=O-.36;
        k.box('darkMetal',Math.cos(aa)*rr,6.7,Math.sin(aa)*rr,2.6,1.9,.13,Math.PI/2-aa);
        k.box('glass',Math.cos(aa)*(rr-.1),6.7,Math.sin(aa)*(rr-.1),2.3,1.65,.04,Math.PI/2-aa);
        k.box('metal',Math.cos(aa)*(rr-.15),6.7,Math.sin(aa)*(rr-.15),.04,1.9,.1,Math.PI/2-aa);
        k.portal('concrete',Math.cos(aa)*(rr-.16),5.75,Math.sin(aa)*(rr-.16),2.46,1.9,.14,Math.PI/2-aa,.31,.10);
      }
      // Layered cast-concrete fascias and dark returns give each level the
      // broad horizontal rhythm of the production shaft, even at a distance.
      for(const yy of [3.42,3.60,8.77,8.95])k.arc('darkConcrete',O-.37,O-.30,.055,yy,a-TAU/12,TAU/6,24);
    }
    for(const [j,a] of PYLON_ANGLES.entries()){
      const r=O-1;
      k.cylinder('concrete',Math.cos(a)*r,H/2,Math.sin(a)*r,.68,H);
      k.cylinder('darkConcrete',Math.cos(a)*r,1.18,Math.sin(a)*r,.71,.24);
      k.cylinder('lamp',Math.cos(a)*r,1.6,Math.sin(a)*r,.72,.59);
      for(const yy of [1.27,1.94])k.torus('darkMetal',Math.cos(a)*r,yy,Math.sin(a)*r,.75,.044,Math.PI/2);
      for(let c=0;c<10;c++){const a2=c*TAU/10;k.cylinder('darkMetal',Math.cos(a)*r+Math.cos(a2)*.725,1.6,Math.sin(a)*r+Math.sin(a2)*.725,.018,.6);}
      for(const yy of [3.4,8.8])k.torus('darkConcrete',Math.cos(a)*r,yy,Math.sin(a)*r,.72,.045,Math.PI/2);
      for(let flute=0;flute<12;flute++){const f=flute*TAU/12;for(const [yy,hh] of [[.61,1.05],[5.33,6.64]])k.cylinder('darkConcrete',Math.cos(a)*r+Math.cos(f)*.666,yy,Math.sin(a)*r+Math.sin(f)*.666,.018,hh);}
      for(const yy of [.12,9.84])k.cylinder('concrete',Math.cos(a)*r,yy,Math.sin(a)*r,.73,.20);
      const la=a+.045;fixture(k,Math.cos(la)*(O-.9),3.15,Math.sin(la)*(O-.9),1.1,false,j%4===0);
    }
    // Full-depth bridge, including the last landing at the top of the stairs.
    // The deck runs .16 m past the walkable half-width so the guard, which sits
    // on the same line as the flight's, stands on slab rather than on air.
    lk.box('concrete',(terminalStart+R+.3)/2,-.2,0,R+.3-terminalStart,.4,(SILO.landingHalf+.16)*2);
    // One guard section for the whole stairwell: the bridge run is the same
    // swept profile the flight uses, and it dies into a column at the well lip.
    for(const side of [-1,1]){sweepParapet(lk,straightPath(BRIDGE_GUARD_START,NEWEL.x,side*guardZ));}
    lk.box('darkConcrete',(S+R)/2,-.85,0,R-S,.85,1.1);
    // Bridges have a narrow center stripe and real join plates at their ends.
    for(let x=S+.5;x<R;x+=1.4)lk.box('yellow',x,.012,-1.56,.65,.025,.08);
    const transforms=Array.from({length:144},(_,i)=>new THREE.Matrix4().makeTranslation(0,levelY(i+1),0));
    this.structure=k.group(transforms.slice(0,15),true);this.scene.add(this.structure);this.landings=lk.group(transforms.slice(0,15),true);this.scene.add(this.landings);
    const sk=new Kit(this.m);
    sk.cylinder('concrete',0,H/2,0,C,H);
    for(let j=0;j<8;j++){const a=j*TAU/8,ry=Math.PI/2-a;for(const da of [-.06,0,.06]){const aa=a+da;sk.box('darkMetal',Math.cos(aa)*(C+.018),H/2,Math.sin(aa)*(C+.018),.12,H-.5,.04,Math.PI/2-aa);}
      if(j%2===0)for(const y of [2.7,7.1]){sk.cylinder('metal',Math.cos(a)*(C+.17),y,Math.sin(a)*(C+.17),.19,1.95);sk.cylinder('lamp',Math.cos(a)*(C+.19),y,Math.sin(a)*(C+.19),.17,1.72);sk.sphere('lamp',Math.cos(a)*(C+.19),y+.87,Math.sin(a)*(C+.19),.17);sk.sphere('lamp',Math.cos(a)*(C+.19),y-.87,Math.sin(a)*(C+.19),.17);for(const dy of [-.47,.47])sk.torus('darkMetal',Math.cos(a)*(C+.19),y+dy,Math.sin(a)*(C+.19),.185,.025,Math.PI/2);}
    }
    buildStairFlight(sk);
    for(const y of [2.4,6.5]){sk.box('darkMetal',C+.06,y,0,.14,1.6,.35);sk.box('lamp',C+.14,y,0,.05,1.35,.16);}
    this.stairs=sk.group(transforms.slice(1,16),true);this.scene.add(this.stairs);
    // Far levels retain the full silhouette while nearby floors carry the
    // individual treads, railings, windows and fittings. No floors are omitted.
    const fk=new Kit(this.m),fl=new Kit(this.m),fs=new Kit(this.m);
    fk.arc('concrete',R,O,.42,-.42,0,TAU,36);fk.arc('darkConcrete',O-.12,O+.12,H,0,0,TAU,36);
    for(let bearing=1;bearing<=3;bearing++)for(const side of [-1,1]){const p=landingPoint(bearing,NEWEL.x,side*NEWEL.z);buildNewel(fk,p.cx,p.cz,H,{slats:10,rings:false});}
    sweepParapet(fl,galleryPath.filter((_,i)=>i%4===0),3);
    fl.box('concrete',(terminalStart+R+.3)/2,-.2,0,R+.3-terminalStart,.4,(SILO.landingHalf+.16)*2);
    for(const side of [-1,1])sweepParapet(fl,straightPath(BRIDGE_GUARD_START,NEWEL.x,side*guardZ),3);
    fs.cylinder('concrete',0,H/2,0,C,H);
    buildStairFlight(fs,{steps:36,quality:3,density:7});
    this.distant=fk.group(transforms,true);this.distantLandings=fl.group(transforms,true);this.distantStairs=fs.group(transforms,true);
    this.scene.add(this.distant,this.distantLandings,this.distantStairs);this.updateStructure(1);
    // Crown closes the structure above the top landing; no exterior town.
    const crown=new Kit(this.m);crown.cylinder('darkConcrete',0,levelY(1)+H,0,O+1,.65);for(let i=0;i<12;i++){const a=i*TAU/12;crown.beam('concrete',[Math.cos(a)*C,levelY(1)+H-.6,Math.sin(a)*C],[Math.cos(a)*O,levelY(1)+H-.6,Math.sin(a)*O],.35);}
    // Continue the visible spine through the top storey. Previously only its
    // collision continued: from the top landing it looked like a bare disk.
    const core=new Kit(this.m);core.cylinder('concrete',0,H/2,0,C,H);
    for(let j=0;j<8;j++){const a=j*TAU/8;core.box('darkMetal',Math.cos(a)*(C+.018),H/2,Math.sin(a)*(C+.018),.12,H-.5,.045,Math.PI/2-a);if(j%2===0)for(const y of [2.7,7.1]){core.cylinder('metal',Math.cos(a)*(C+.17),y,Math.sin(a)*(C+.17),.19,1.95);core.cylinder('lamp',Math.cos(a)*(C+.19),y,Math.sin(a)*(C+.19),.17,1.72);}}
    this.topCore=core.group();this.topCore.name='top-floor-stair-spine';this.topCore.position.y=levelY(1);this.scene.add(this.topCore,crown.group());
  }
  updateStructure(level){
    const near=Array.from({length:15},(_,i)=>Math.max(1,Math.min(130,level-7))+i),stairs=near.filter(n=>n>1),far=Array.from({length:144},(_,i)=>i+1).filter(n=>!near.includes(n));
    for(const [group,numbers,rotate] of [[this.structure,near,false],[this.landings,near,true],[this.stairs,stairs,true],[this.distant,far,false],[this.distantLandings,far,true],[this.distantStairs,far.filter(n=>n>1),true]])for(const mesh of group.children){
      mesh.count=numbers.length;for(let i=0;i<numbers.length;i++){const matrix=new THREE.Matrix4().makeRotationY(rotate?-landingAngle(numbers[i]):0);matrix.setPosition(0,levelY(numbers[i]),0);mesh.setMatrixAt(i,matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
    }
  }
  // Building a level is twenty to thirty milliseconds of geometry — six rooms,
  // a dozen canvas-drawn signs, a set of doors — and it used to happen inside
  // the single frame in which you crossed the floor. At sixty frames a second
  // the whole budget is 16.7 ms, so every flight of stairs cost two or three
  // dropped frames and the lights appeared to stutter on.
  //
  // The work is not the problem; doing all of it at once is. A level is built
  // as a sequence of steps, one wing at a time, and the frame loop spends a
  // few milliseconds a frame on whatever is queued. Nothing is added to the
  // scene until the last step, so a half-built level is never visible.
  *buildLevel(level){
    const root=new THREE.Group(),y=levelY(level),rooms=[],doors=[],interactions=[];root.position.y=y;
    for(let wing=0;wing<6;wing++){
      yield;
      const a=wing*TAU/6,ry=Math.PI/2-a,type=roomType(level,wing),room=level===1&&wing===0?buildTopFloor(this.m):type==='bazaar'?buildBazaar(this.m):buildRoom(this.m,type,level,wing,this.assets);
      room.position.set(Math.cos(a)*SILO.deckOuter,0,Math.sin(a)*SILO.deckOuter);room.rotation.y=ry;if(level===68&&wing===0)addGeorgeDesk(room,this.m);root.add(room);rooms.push(room);
      // Both plates are bolted to the gallery wall. Offsetting the level plate
      // along the ring keeps it flat on the curve; offsetting it in x and z, as
      // this once did, left it hanging in the walkway well clear of the wall.
      const beside=a+3.3/SILO.deckOuter;
      addSign(root,String(level).padStart(3,'0'),[Math.cos(beside)*SIGN_WALL,2.15,Math.sin(beside)*SIGN_WALL],1.8,1.25,Math.PI/2-beside+Math.PI,{font:'bold 200px Arial',background:'#34453b'});
      addSign(root,TYPE_NAMES[type],[Math.cos(a)*SIGN_WALL_HIGH,3.72,Math.sin(a)*SIGN_WALL_HIGH],4.6,.55,ry+Math.PI);
      // A real double leaf door with a switchable oriented collision volume.
      const surround=new Kit(this.m);surround.portal('concrete',0,.01,0,3.9,3.2,.48,0,.34,.18);surround.portal('metal',0,.02,-.27,3.85,3.16,.045,0,.32,.045);const surroundRoot=surround.group();surroundRoot.position.copy(room.position);surroundRoot.rotation.y=ry;root.add(surroundRoot);
      const doorRoot=new THREE.Group();doorRoot.position.copy(room.position);doorRoot.rotation.y=ry;root.add(doorRoot);const leaves=[];
      for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*1.95,0,0);const dk=new Kit(this.m);dk.box('green',-side*.975,1.6,0,1.95,3.2,.12);dk.box('darkMetal',-side*.975,2.15,-.075,1.25,.85,.04);dk.box('glass',-side*.975,2.15,-.105,1.1,.7,.02);dk.box('brass',-side*1.7,1.35,-.12,.065,.34,.07);for(let z=0;z<5;z++)dk.box('metal',-side*.975,.38+z*.11,-.08,1.45,.03,.025);pivot.add(dk.group());doorRoot.add(pivot);leaves.push({pivot,side});}
      // Every wing has had a real double leaf door on it all along and every
      // one of them started wide open, which is why the silo read as one open
      // plan floor rather than a corridor of shut doors. They start shut. The
      // three genuinely public halls — the cafeteria you begin in, the bazaar
      // and the park — stand open, because those are the rooms a silo leaves
      // open; everything else you have to work the handle on.
      const open=PUBLIC_ROOMS.has(type);
      const door={level,wing,position:new THREE.Vector3(room.position.x,y+1.5,room.position.z),ry,open,amount:open?1:0,leaves,type,collider:null};doors.push(door);
      for(const leaf of leaves)leaf.pivot.rotation.y=-leaf.side*door.amount*Math.PI*.52;
      for(const interact of room.userData.interactions){const p=new THREE.Vector3(...interact.position).applyAxisAngle(new THREE.Vector3(0,1,0),ry).add(room.position);p.y+=y;interactions.push({...interact,position:p});}
    }
    const plate=landingPoint(level,13,-(SILO.landingHalf+.09+SIGN_DEPTH/2));
    addSign(root,`LEVEL ${String(level).padStart(3,'0')}`,[plate.cx,.44,plate.cz],2.4,.42,Math.PI-landingAngle(level));
    const passages=level===1?null:buildPassages(this.m,level,rooms.map(r=>r.userData.type));
    if(passages){root.add(passages);for(const i of passages.userData.interactions||[])interactions.push({...i,position:new THREE.Vector3(i.position[0],i.position[1]+y,i.position[2])});}
    // Close the open side of the top and bottom landings. Every other level has
    // the next flight arriving there; these two have a drop instead.
    if(level===1||level===144){
      const gk=new Kit(this.m);buildTerminalLanding(gk,level===1?1:-1);
      const landing=gk.group();landing.name='terminal-stair-parapet';landing.rotation.y=-landingAngle(level);root.add(landing);
    }
    yield;
    dressFloor(root,this.m,level);this.scene.add(root);const entry={level,root,rooms,doors,interactions,passages};this.loaded.set(level,entry);return entry;
  }
  // The whole level, now, because something is about to stand in it.
  loadLevel(level){
    if(this.loaded.has(level))return this.loaded.get(level);
    const steps=this.pending.get(level)||this.buildLevel(level);
    this.pending.delete(level);
    let step=steps.next();
    while(!step.done)step=steps.next();
    return step.value;
  }
  // The same level, eventually. Queued in the order given, so the level you
  // are walking towards is finished before the one behind you.
  queueLevel(level){
    if(level<1||level>144||this.loaded.has(level)||this.pending.has(level))return;
    this.pending.set(level,this.buildLevel(level));
  }
  // Called once a frame with whatever time the frame can spare. Steps the
  // queue until the budget runs out; a level that finishes rejoins the world
  // immediately, because its doors and interactions have to be in the lists
  // before the player can reach them.
  buildAhead(budgetMs=4){
    if(!this.pending.size)return 0;
    const until=performance.now()+Math.max(0,budgetMs);
    let finished=0;
    for(const [level,steps] of this.pending){
      let step=steps.next();
      while(!step.done&&performance.now()<until)step=steps.next();
      if(step.done){this.pending.delete(level);finished++;}
      if(performance.now()>=until)break;
    }
    if(finished){this.refreshLevelLists();this.rebuildCollision();}
    return finished;
  }
  refreshLevelLists(){
    this.doors=[...this.loaded.values()].flatMap(e=>e.doors);this.interactions=[...this.loaded.values()].flatMap(e=>e.interactions);
    this.animated=[...this.loaded.values()].flatMap(e=>e.rooms.flatMap(r=>r.userData.animated));this.livestock=[...this.loaded.values()].flatMap(e=>e.rooms.flatMap(r=>r.userData.livestock||[]));this.screens=[...this.loaded.values()].flatMap(e=>e.rooms.flatMap(r=>[r.userData.outsideScreen,...(r.userData.extraScreens||[])])).filter(Boolean);
    if(this.special==='generator')this.animated=this.generator.animated;
  }
  setLevel(level,special=null){
    const descending=level>(this.lastLevel??level);this.lastLevel=level;
    this.activeLevel=level;this.special=special;this.updateStructure(level);
    // You are standing in this one, so it is built now. The neighbours are
    // queued: by the time you reach one it has been finished a frame at a time.
    this.loadLevel(level);
    for(const n of descending?[level+1,level-1]:[level-1,level+1])this.queueLevel(n);
    for(const [n,e]of this.loaded)if(Math.abs(n-level)>2){disposeGroup(e.root);this.loaded.delete(n);}
    for(const n of [...this.pending.keys()])if(Math.abs(n-level)>2)this.pending.delete(n);
    this.underground.root.visible=['mines','excavator','tunnel'].includes(special);this.silo17.root.visible=special==='silo17';this.pressure.root.visible=special==='pipe-gallery';this.generator.root.visible=special==='generator';this.surface.root.visible=!special;
    for(const child of this.underground.root.children)child.visible=special==='mines'?child===this.underground.mines:child!==this.underground.mines;
    this.refreshLevelLists();
    this.rebuildCollision();
  }
  specialSpace(){return this.special==='mines'?this.underground.mineSpace:this.special==='generator'?this.generator:this.special==='silo17'?this.silo17:this.special==='pipe-gallery'?this.pressure:this.underground;}
  resetStoryWorld(){breach.open=breach.amount=false;for(const entry of this.loaded.values())for(const i of entry.interactions)if(i.destination==='excavator'){delete i.destination;i.action='breach';i.label='Inspect the concealed warning panel';}this.rebuildCollision();}
  rebuildCollision(){
    const c=new ColliderSet(),R=SILO.wellRadius,O=SILO.deckOuter,S=SILO.stairRadius,C=SILO.stairColumn,H=SILO.levelHeight;
    if(this.special){
      const below=this.specialSpace();
      for(const f of below.walkways){if(f.kind==='ring')c.addRing({innerRadius:f.r0,outerRadius:f.r1,minY:f.y-.5,maxY:f.y,climbable:true});else if(f.kind==='arc')c.addArc({innerRadius:f.r0,outerRadius:f.r1,minY:f.y-.17,maxY:f.y,centre:f.a,halfWidth:f.half,climbable:true});else c.addOrientedBox({cx:f.x,cz:f.z,halfX:f.w/2,halfZ:f.d/2,rotationY:f.ry||0,minY:f.y-.4,maxY:f.y,climbable:true});}
      for(const b of below.solids)if(b.arc)c.addArc({innerRadius:b.r0,outerRadius:b.r1,minY:b.y0,maxY:b.y1,centre:b.a,halfWidth:b.half});else if(b.ring)c.addRing({innerRadius:b.r0,outerRadius:b.r1,minY:b.y0,maxY:b.y1});else c.addOrientedBox({cx:b.x,cz:b.z,halfX:b.w/2,halfZ:b.d/2,rotationY:b.ry||0,minY:b.y0,maxY:b.y1});
      if(this.special==='excavator'||this.special==='tunnel'){
        c.addRing({innerRadius:74,outerRadius:80,minY:0,maxY:9.5,gaps:[[VOID.tunnelAngle,.053]]});
        c.addRing({innerRadius:74,outerRadius:80,minY:9.5,maxY:11.6});
        c.addRing({innerRadius:74,outerRadius:80,minY:11.6,maxY:15.35,gaps:[[0,.024]]});
        c.addRing({innerRadius:74,outerRadius:80,minY:15.35,maxY:68});c.addRing({innerRadius:0,outerRadius:3.15,minY:0,maxY:60});
        c.addRing({innerRadius:67.9,outerRadius:68.2,minY:12,maxY:13.2,gaps:voidLedgeGaps});
        for(const z of [-1.8,1.8])c.addOrientedBox({cx:39,cz:z,halfX:31,halfZ:.08,rotationY:0,minY:12,maxY:13.1});
      }
      this.colliders=c;return;
    }
    for(let level=Math.max(1,this.activeLevel-2);level<=Math.min(144,this.activeLevel+2);level++){
      const y=levelY(level),angle=landingAngle(level),at=(x,z=0)=>landingPoint(level,x,z),gap=Math.asin(SILO.landingHalf/R);
      for(const a of PYLON_ANGLES)c.addColumn({cx:Math.cos(a)*(O-1),cz:Math.sin(a)*(O-1),radius:.68,minY:y,maxY:y+H});
      c.addRing({innerRadius:R,outerRadius:O,minY:y-.42,maxY:y,climbable:true});
      c.addRing({innerRadius:R-.07,outerRadius:R+.16,minY:y,maxY:y+1.13,gaps:[[angle,gap]]});
      c.addRing({innerRadius:O-.2,outerRadius:O+.2,minY:y,maxY:y+3.35,gaps:Array.from({length:6},(_,j)=>[j*TAU/6,2.05/O])});
      c.addRing({innerRadius:O-.3,outerRadius:O+.3,minY:y+3.35,maxY:y+H});
      c.addOrientedBox({...at((terminalStart+R+.3)/2),halfX:(R+.3-terminalStart)/2,halfZ:SILO.landingHalf,rotationY:-angle,minY:y-.4,maxY:y,climbable:true});
      // The guard is solid from the corner the flight sweeps out of, right
      // along the bridge and into the column, so there is no unguarded pocket
      // beside the landing. The newels line up vertically at all three bearings;
      // their round collision leaves the gallery doorway approaches clear.
      const guardStart=Math.cos(stairOpening)*railRadius;
      for(const side of [-1,1]){
        c.addOrientedBox({...at((guardStart+R)/2,side*guardZ),halfX:(R-guardStart)/2,halfZ:PARAPET.half,rotationY:-angle,minY:y,maxY:y+PARAPET_TOP});

      }
      for(let bearing=1;bearing<=3;bearing++)for(const side of [-1,1])c.addColumn({...landingPoint(bearing,NEWEL.x,side*NEWEL.z),radius:NEWEL.radius,minY:y,maxY:y+H});
      if(level>1){
        const lower=y,stepAngle=STAIR_SWEEP/SILO.stairSteps;
        for(let j=0;j<SILO.stairSteps;j++){
          const center=(j+.5)*stepAngle,top=lower+stairStepY(j);
          c.addArc({innerRadius:C,outerRadius:S,minY:top-.18,maxY:top,centre:angle+center,halfWidth:stepAngle*.505,climbable:true});
          if(hasStairGuard(center))c.addArc({innerRadius:railRadius-PARAPET.half,outerRadius:railRadius+PARAPET.half,minY:top,maxY:top+PARAPET_TOP,centre:angle+center,halfWidth:stepAngle*.51});
        }
      }
      const e=this.loaded.get(level);if(!e)continue;
      if(e.passages){
        const {inner,outer,height}=PASSAGE;
        c.addRing({innerRadius:inner,outerRadius:outer,minY:y-.3,maxY:y,climbable:true});
        c.addRing({innerRadius:inner-.16,outerRadius:inner,minY:y,maxY:y+height,gaps:e.passages.userData.openings});
          c.addRing({innerRadius:outer,outerRadius:outer+.18,minY:y,maxY:y+height,
          gaps:level===SPUR.level?[[SPUR.angle,SPUR.half/outer]]:[]});
        if(level===SPUR.level){
          const {angle:a,half,inner:I,outer:X,height:SH,openingHalf:Q,openingHeight:OH,throat}=SPUR,ry=Math.PI/2-a,mid=(I+X)/2,len=X-I;
          const at=(r,t=0)=>({cx:Math.cos(a)*r+Math.sin(a)*t,cz:Math.sin(a)*r-Math.cos(a)*t});
          c.addOrientedBox({...at(mid),halfX:half,halfZ:len/2,rotationY:ry,minY:y-.3,maxY:y,climbable:true});
          for(const side of [-1,1])c.addOrientedBox({...at(mid,side*(half+.11)),halfX:.11,halfZ:len/2,rotationY:ry,minY:y,maxY:y+SH});
          for(const side of [-1,1])c.addOrientedBox({...at(X-.13,side*(half+Q)/2),halfX:(half-Q)/2,halfZ:.13,rotationY:ry,minY:y,maxY:y+SH});
          c.addOrientedBox({...at(X-.13),halfX:Q,halfZ:.13,rotationY:ry,minY:y+OH,maxY:y+SH});
          this.breachCollider=c.addOrientedBox({...at(X-.3),halfX:Q,halfZ:.06,rotationY:ry,minY:y,maxY:y+OH,enabled:!breach.open});
          c.addOrientedBox({...at(X+throat/2),halfX:Q,halfZ:throat/2,rotationY:ry,minY:y-.34,maxY:y,climbable:true});
          for(const side of [-1,1])c.addOrientedBox({...at(X+throat/2,side*(Q+.12)),halfX:.12,halfZ:throat/2,rotationY:ry,minY:y,maxY:y+OH});
          c.addOrientedBox({...at(X+throat),halfX:Q,halfZ:.11,rotationY:ry,minY:y,maxY:y+OH});
        }
        for(let w=0;w<6;w++)if(hasRearPassage(level,e.rooms[w].userData.type)){
          const a=w*TAU/6,ry=Math.PI/2-a;
          c.addOrientedBox({cx:Math.cos(a)*51.6,cz:Math.sin(a)*51.6,halfX:1.55,halfZ:2.2,rotationY:ry,minY:y-.3,maxY:y,climbable:true});
          for(const side of [-1,1]){const x=side*1.55,z=SILO.deckOuter+25.25;c.addOrientedBox({cx:Math.cos(a)*z+Math.sin(a)*x,cz:Math.sin(a)*z-Math.cos(a)*x,halfX:.08,halfZ:1.25,rotationY:ry,minY:y,maxY:y+height});}
        }
      }
      // The top and bottom landings have no flight continuing past them, so the
      // stairwell is open on that side with nothing to stop you walking in.
      if(level===1||level===144){
        const side=level===1?1:-1;
        c.addOrientedBox({...at((terminalStart+S)/2,side*guardZ),halfX:(S-terminalStart)/2,halfZ:PARAPET.half,rotationY:-angle,minY:y,maxY:y+PARAPET_TOP});
      }
      for(const room of e.rooms){
        const ry=room.rotation.y,cos=Math.cos(ry),sin=Math.sin(ry),ox=room.position.x,oz=room.position.z;
        const floors=room.userData.floors||[{x:0,z:SILO.roomDepth/2,w:SILO.roomHalf*2,d:SILO.roomDepth,y:0}];
        for(const f of floors)c.addOrientedBox({cx:ox+cos*f.x+sin*f.z,cz:oz-sin*f.x+cos*f.z,halfX:f.w/2,halfZ:f.d/2,rotationY:ry,minY:y+(f.y||0)-.4,maxY:y+(f.y||0),climbable:true});
        for(const d of room.userData.doors||[])d.collider=c.addOrientedBox({cx:ox+cos*d.x+sin*d.z,cz:oz-sin*d.x+cos*d.z,halfX:d.w/2,halfZ:.22,rotationY:ry,minY:y,maxY:y+d.h,enabled:d.amount<.96});
        for(const b of room.userData.solids)c.addOrientedBox({cx:ox+cos*b.x+sin*b.z,cz:oz-sin*b.x+cos*b.z,halfX:b.w/2,halfZ:b.d/2,rotationY:ry+(b.ry||0),minY:y+b.y0,maxY:y+b.y1});
      }
      for(const d of e.doors)d.collider=c.addOrientedBox({cx:d.position.x,cz:d.position.z,halfX:1.95,halfZ:.08,rotationY:d.ry,minY:y,maxY:y+3.2,enabled:d.amount<.8});
    }
    c.addRing({innerRadius:0,outerRadius:C,minY:0,maxY:levelY(1)+H});
    if(this.activeLevel===1){
      if(this.surface.network.root.visible)for(const crown of this.surface.network.surfaces){const p=topPoint(crown.x,0,crown.z);c.addColumn({cx:p.x,cz:p.z,radius:3.5,minY:levelY(1)+crown.y-.15,maxY:levelY(1)+crown.y+.5});}
      for(const b of this.surface.solids){const p=topPoint(b.x,0,b.z);c.addOrientedBox({cx:p.x,cz:p.z,halfX:b.w/2,halfZ:b.d/2,rotationY:Math.PI/2,minY:levelY(1)+b.y0,maxY:levelY(1)+b.y1});}
      const floorAt=c.floorAt.bind(c);c.floorAt=(x,z,r,h)=>Math.max(floorAt(x,z,r,h),this.surface.floorAt(x,z,r,h));
    }
    this.colliders=c;
  }
  spawn(level,wing=null){const y=levelY(level);if(wing===null){const p=landingPoint(level,20.6);return new THREE.Vector3(p.cx,y,p.cz);}const a=wing*TAU/6;return new THREE.Vector3(Math.cos(a)*29,y,Math.sin(a)*29);}
  destination(id){
    if(typeof id==='string'&&id.startsWith('room:')){const [,n,w]=id.split(':').map(Number);return {level:n,position:this.spawn(n,w),yaw:Math.PI/2-w*TAU/6+Math.PI};}
    if(id==='relic')return {level:144,position:new THREE.Vector3(-3.8,0,4.9).applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/6).add(new THREE.Vector3(SILO.deckOuter*.5,levelY(144),SILO.deckOuter*Math.sqrt(3)/2)),yaw:Math.PI*.786};
    if(id==='silo17')return {level:1,special:id,position:this.silo17.spawn.clone(),yaw:Math.PI};
    if(id==='pipe-gallery')return {level:144,special:id,position:new THREE.Vector3(0,48,-23),yaw:Math.PI};
    if(id==='silo17-surface'){const entry=this.surface.network.interactions[0].position;return {level:1,position:topPoint(entry[0],groundY(entry[0],entry[2]-3),entry[2]-3),yaw:Math.PI};}
    if(id==='surface')return {level:1,position:topPoint(26,groundY(26,114),114),yaw:-Math.PI/2};
    if(id==='generator')return {level:144,special:id,position:new THREE.Vector3(0,52,-20),yaw:Math.PI};
    if(id==='mines'||this.underground.mineSpace.destinations.some(d=>d.id===id)){const d=this.underground.mineSpace.destinations.find(d=>d.id===(id==='mines'?'mine-arrival':id));return {level:144,special:'mines',position:new THREE.Vector3(...d.position).add(new THREE.Vector3(105,48,0)),yaw:Math.PI+d.yaw};}
    if(id==='excavator')return {level:144,special:id,position:new THREE.Vector3(79.5,12,0),yaw:Math.PI/2};
    if(id==='digger-passage')return {level:144,position:new THREE.Vector3(Math.cos(SPUR.angle)*(SPUR.outer-1.2),levelY(144),Math.sin(SPUR.angle)*(SPUR.outer-1.2)),yaw:Math.PI/2-SPUR.angle};
    if(id==='tunnel')return {level:144,special:id,position:tunnelPoint(0,.7,12),yaw:-Math.PI/2-VOID.tunnelAngle};
    if(id==='airlock')return {level:1,position:topPoint(26,0,50),yaw:-Math.PI/2};
    return {level:Number(id),position:this.spawn(Number(id)),yaw:Math.PI/2-landingAngle(Number(id))};
  }
  nearestInteraction(position,direction){
    const pool=this.special?this.specialSpace().interactions.map(v=>({...v,position:new THREE.Vector3(...v.position)})):[...this.doors.map(d=>{const seal=this.story?.sealed(d.level,d.wing,d.type);
      return seal?{position:d.position,label:`${seal.label} — sealed`,sealed:seal}
                 :{position:d.position,label:`${d.open?'Close':'Open'} ${TYPE_NAMES[d.type].toLowerCase()} door`,door:d};}),...this.interactions];
    if(this.actorInteractions)pool.push(...this.actorInteractions);
    if(this.residentInteractions)pool.push(...this.residentInteractions);
    if(this.storyInteractions)pool.push(...this.storyInteractions);
    if(!this.special&&this.activeLevel===1&&this.outside)pool.push(...this.surface.networkInteractions);
    if(!this.story?.story&&!this.special&&this.activeLevel===1)pool.push({position:this.surface.cleaningPoint,label:this.surface.cleaning?'Cleaning lens…':this.surface.cleanliness>.99?'Clean camera lens again':'Clean the outside camera lens',action:'clean-camera'});
    const seen=[];
    for(const i of pool){if(this.story?.story&&this.story.chapter==='cleaning'&&i.action!=='opening-book')continue;if(this.special==='pipe-gallery'&&i.action?.startsWith('pipe-')){const next=!this.story?.hasFlag('pipe-cover-open')?'cover':['isolate','collar','torque'][this.story?.pipeSteps.length||0];if(i.action!==`pipe-${next}`)continue;}const delta=i.position.clone().sub(position),dist=delta.length();if(dist>5||dist<.05)continue;
      // How near the middle of the view a thing has to be before it offers
      // itself. A fixed cone of 71 degrees meant a corridor of doors and a
      // gallery of people put a prompt on the screen more or less permanently,
      // which is what was covering the silo up. The cone now closes with
      // distance, because that is what a target does: at arm's length you can
      // reach something well off to the side, and at five metres you have to
      // be looking at it.
      if(delta.normalize().dot(direction)<REACH_CONE(dist))continue;
      seen.push({i,dist});}
    // Range and direction are not enough on their own: the gun room's racks sit
    // less than two metres behind the cafeteria's east wall, so walking up to
    // blank blockwork offered you a rifle through it. Nearest first, and the
    // first one you can actually see wins.
    seen.sort((a,b)=>a.dist-b.dist);
    for(const {i,dist} of seen)if(!this.blockedFromView(position,i.position,dist))return i;
    return null;
  }
  // True when something solid stands between the eye and the marker. The walk
  // stops short of both ends: the thing itself, and whatever it rests on or is
  // fixed to, must not be what hides it — a book on a table and a sign on a
  // wall are both reached along a line that ends inside their own collider.
  blockedFromView(eye,target,distance){
    const colliders=this.colliders;
    if(!colliders||!(distance>1))return false;
    const far=distance-.5,near=Math.min(.35,far);
    if(!(far>near))return false;
    // The cafeteria's walls are 350 mm thick, so a sample every 350 mm can step
    // clean over one depending on where the samples happen to land. Spacing is
    // 200 mm and the probe carries 60 mm of its own, which leaves no gap wider
    // than 80 mm between samples and is still far too small to catch the jamb
    // of a door you are walking through.
    const steps=Math.max(1,Math.ceil((far-near)/.2));
    for(let s=0;s<=steps;s++){
      const t=(near+(far-near)*s/steps)/distance;
      const x=eye.x+(target.x-eye.x)*t,y=eye.y+(target.y-eye.y)*t,z=eye.z+(target.z-eye.z)*t;
      if(colliders.contains(x,z,.06,y-.04,y+.04))return true;
    }
    return false;
  }
  cycleAirlock(id){
    const doors=this.loaded.get(1)?.rooms[0].userData.doors;if(!doors)return;
    const wanted=doors.find(d=>d.id===id),other=doors.find(d=>d.id!==id);
    if(!wanted||!other)return;
    if(wanted.open||wanted.requested){wanted.open=false;wanted.requested=false;return;}
    other.open=false;other.requested=false;wanted.requested=true;
  }
  openBreach(){
    breach.open=true;if(this.breachCollider)this.breachCollider.enabled=false;
    for(const entry of this.loaded.values())for(const i of entry.interactions)if(i.action==='breach'){delete i.action;i.destination='excavator';i.label='Step through the concealed opening';}
  }
  transitionAt(position){
    if(this.special==='excavator'&&position.x>81.6&&Math.abs(position.z)<1.1&&Math.abs(position.y-12)<.4)return 'digger-passage';
    if(this.special||this.activeLevel!==SPUR.level||!breach.open||breach.amount<.95)return null;
    const a=SPUR.angle,r=position.x*Math.cos(a)+position.z*Math.sin(a),t=position.x*Math.sin(a)-position.z*Math.cos(a);
    return r>SPUR.outer+.65&&Math.abs(t)<SPUR.openingHalf&&Math.abs(position.y-levelY(144))<.4?'excavator':null;
  }
  // --- lighting -----------------------------------------------------------
  // Nothing in a silo moves. There is no sun down here and no lamp on a track:
  // every light is bolted to a wall or a ceiling and stays where it was bolted.
  // The first pass did the opposite — a directional "sun" and a shadow-casting
  // spotlight both nailed to the player, two of the eight pooled lights orbiting
  // the silo on the player's own bearing, and the room's fixtures re-sorted and
  // re-assigned to the pool on every single frame. Walking therefore swung every
  // shadow in the room, slid light along the gallery walls, and popped lamps from
  // one fitting to another. All three are the same bug: the lights were following
  // the camera instead of belonging to the building.
  //
  // Every fixture the level has, with a stable key so a light can be recognised
  // as already being on it. Positions are fixed; only which ones are close
  // enough to be worth spending a light on changes as you walk.
  lampCandidates(position,top){
    const out=[],level=this.activeLevel,y=levelY(level);
    if(this.special)return out;
    if(level===1){
      // The cafeteria, the station and the rooms behind it. The last six are the
      // range: without them the lanes were lit by whatever spilled through the
      // doorway, which on a twenty-two metre room is nothing.
      const fittings=[[-10,6.7,17],[10,6.7,17],[-10,6.7,31],[10,6.7,31],[26,3.7,29],[26,3.7,40],[26,3.7,50],[26,3.7,59],
                      [21,4.4,8.5],[31,4.4,8.5],[21,4.4,15],[31,4.4,15],[21,4.4,21],[31,4.4,21]];
      for(let i=0;i<fittings.length;i++)out.push({key:`top:${i}`,position:topPoint(...fittings[i]),color:INTERIOR_LIGHT,intensity:i<4?145:i<8?75:95,distance:i<8?28:24,cone:i<8?32:38});
      return out;
    }
    for(let i=0;i<6;i++){const a=i*TAU/6;out.push({key:`g${level}:${i}`,position:new THREE.Vector3(Math.cos(a)*21,y+4.8,Math.sin(a)*21),color:INTERIOR_LIGHT,intensity:105,distance:38,cone:48});}
    for(let w=0;w<6;w++){const a=w*TAU/6,color=INTERIOR_LIGHT;
      for(const r of [33,44])out.push({key:`c${level}:${w}:${r}`,position:new THREE.Vector3(Math.cos(a)*r,y+4.7,Math.sin(a)*r),color,intensity:150,distance:38,cone:48});}
    // Fixed service-gallery fittings share the room lamps’ warm neutral tone.
    for(let j=0;j<48;j+=2){const a=(j+.5)*TAU/48,r=53.6;out.push({key:`rear${level}:${j}`,position:new THREE.Vector3(Math.cos(a)*r,y+3.4,Math.sin(a)*r),color:INTERIOR_LIGHT,intensity:55,distance:10,cone:12,room:true,keyIntensity:70});}
    if(level===144)for(let r=57.4;r<64.4;r+=3.6)out.push({key:`spur:${r}`,position:new THREE.Vector3(Math.cos(Math.PI/6)*r,y+2.92,Math.sin(Math.PI/6)*r),color:INTERIOR_LIGHT,intensity:45,distance:10,cone:12,room:true,keyIntensity:65});
    // The wing you are in and its two neighbours; the rest are behind walls.
    const here=(Math.round(Math.atan2(position.z,position.x)/TAU*6)+6)%6;
    for(const w of [here,(here+1)%6,(here+5)%6]){
      const room=this.loaded.get(level)?.rooms[w];
      if(!room?.userData.lightPoints?.length)continue;
      room.updateWorldMatrix(true,false);
      const residential=room.userData.type==='residential';
      room.userData.lightPoints.forEach((p,j)=>out.push({key:`r${level}:${w}:${j}`,position:new THREE.Vector3(...p.position).applyMatrix4(room.matrixWorld),
        color:INTERIOR_LIGHT,intensity:p.intensity,distance:11,cone:14,room:true,keyIntensity:residential?95:150}));
    }
    return out;
  }
  // Hand the pool out to fixtures. A light already on a wanted fixture is left
  // strictly alone; one that has to move fades out first, relocates dark, and
  // comes back up. Fixtures a light is already holding are ranked as if they
  // were nearer than they are, so the pair either side of the cut-off cannot
  // trade places every few steps and blink at each other.
  placeLamps(candidates,position,dt){
    const lamps=this.localLights;
    if(!candidates.length){for(const l of lamps){l.intensity=0;l.visible=false;l.userData.key=null;l.userData.goal=0;}return;}
    const held=new Set();
    for(const l of lamps)if(l.userData.key&&l.intensity>.5)held.add(l.userData.key);
    const wanted=new Map(candidates
      .map(c=>[c,c.position.distanceToSquared(position)*(held.has(c.key)?.45:1)])
      .sort((a,b)=>a[1]-b[1]).slice(0,lamps.length).map(([c])=>[c.key,c]));
    const free=[];
    for(const l of lamps){
      const c=l.userData.key?wanted.get(l.userData.key):null;
      if(c){l.userData.goal=c.intensity*this.lampScale;wanted.delete(c.key);}else free.push(l);
    }
    const spare=[...wanted.values()];
    for(const l of free){
      // A light may only be moved once it is dark. Half a second off while it
      // relocates is invisible; a lit one changing position is not.
      if(!spare.length||l.intensity>.02){l.userData.goal=0;continue;}
      const c=spare.shift();
      l.userData.key=c.key;l.position.copy(c.position);l.userData.baseColor=c.color;l.distance=c.distance;l.userData.goal=c.intensity*this.lampScale;
    }
    // The tint is re-applied every frame rather than on relocation: a lamp
    // that was placed at noon and is still burning at midnight has to go amber
    // where it stands, not wait to be moved before it notices the hour.
    for(const l of lamps){
      l.intensity=THREE.MathUtils.damp(l.intensity,l.userData.goal,l.userData.goal?6:16,dt);l.visible=l.intensity>.4;
      l.color.setHex(l.userData.baseColor).lerp(NIGHT_FILAMENT,this.lampWarmth*.55);
    }
  }
  lightRig(position,top,dt){
    const candidates=this.lampCandidates(position,top);
    if(this.special||this.outside||!candidates.length){
      for(const l of this.localLights){l.intensity=0;l.visible=false;l.userData.key=null;l.userData.goal=0;}
      this.keyLight.visible=false;this.keyLight.userData.key=null;return;
    }
    this.placeLamps(candidates,position,dt);
    // The shadow caster is a fixture too, and it keeps the fixture it is on
    // until a different one is clearly nearer — otherwise every shadow in the
    // room swings as you cross it. Room fittings win over the gallery ring:
    // they are the ones actually lighting what you are standing in.
    const overhead=candidates.filter(c=>c.position.y>position.y+.5),pool=overhead.length?overhead:candidates;
    const score=c=>c.position.distanceToSquared(position)*(c.room?.55:1);
    const held=this.keyLight.userData.key&&pool.find(c=>c.key===this.keyLight.userData.key);
    const best=pool.reduce((a,b)=>score(b)<score(a)?b:a);
    const target=held&&score(held)<score(best)*2.6?held:best;
    this.keyLight.visible=true;
    if(this.keyLight.userData.key!==target.key&&this.keyLight.intensity>.02){this.keyLight.intensity=THREE.MathUtils.damp(this.keyLight.intensity,0,16,dt);return;}
    if(this.keyLight.userData.key!==target.key){
      this.keyLight.userData.key=target.key;this.keyLight.position.copy(target.position);
      this.keyLight.target.position.copy(target.position).add(KEY_TARGET_DROP);
      this.keyLight.userData.baseColor=target.color;this.keyLight.distance=target.cone;
    }
    this.keyLight.color.setHex(this.keyLight.userData.baseColor??target.color).lerp(NIGHT_FILAMENT,this.lampWarmth*.55);
    this.keyLight.intensity=THREE.MathUtils.damp(this.keyLight.intensity,(target.keyIntensity??Math.min(190,target.intensity*1.35))*this.lampScale,7,dt);
  }

  update(dt,position){
    breach.amount=THREE.MathUtils.damp(breach.amount,breach.open?1:0,5,dt);
    const panel=this.loaded.get(SPUR.level)?.passages?.userData.breachPanel;if(panel)panel.rotation.y=Math.PI-breach.amount*Math.PI/2;
    // One clock, read once. Everything downstream — fixture brightness,
    // fixture colour, the ambient fill and the light outside — comes off
    // these two numbers, so no part of the silo can be at a different hour.
    const hourly=this.schedule;
    // Very shallow, and it took three goes to believe how shallow it had to be.
    // The level here is not the whole story: the grade's contrast curve, the
    // vignette and the swing to amber all read as "darker" on top of it, so a
    // fifth off the fixtures landed nearer a half off the picture. The night
    // reads as night through colour — the warmth curve runs the filaments from
    // a cold working white right down to amber — and the level barely moves,
    // which is how a real building on a night setting behaves. You have to be
    // able to see where you are going on a landing at three in the morning.
    this.lampScale=hourly?.83+.17*hourly.lamp:1;
    this.lampWarmth=hourly?hourly.warmth:0;
    if(hourly)this.surface.sky.scheduledDay=hourly.daylight;
    this.surface.update(dt);const top=topLocal(position);this.outside=!this.special&&this.activeLevel===1&&(inRampCutout(top.x,top.z)?top.z>99&&top.y>10:top.y>=groundY(top.x,top.z)-.5);if(this.outside){this.surface.streamTerrain(top);this.surface.sky.mesh.position.set(top.x,top.y+1.7,top.z);}this.surface.sky.mesh.visible=this.outside;
    const airlocks=this.loaded.get(1)?.rooms[0].userData.doors||[];
    for(const door of airlocks){const other=airlocks.find(d=>d!==door);if(door.requested&&other.amount<.01){door.open=true;door.requested=false;}door.amount=THREE.MathUtils.damp(door.amount,door.open?1:0,3.5,dt);door.pivot.position.y=door.amount*4.35;if(door.collider)door.collider.enabled=door.amount<.96;}

    if(!this.special&&!this.outside){const level=levelAt(position.y);if(level!==this.activeLevel)this.setLevel(level);}
    for(const door of this.doors){door.amount=THREE.MathUtils.damp(door.amount,door.open?1:0,6,dt);for(const leaf of door.leaves)leaf.pivot.rotation.y=-leaf.side*door.amount*Math.PI*.52;if(door.collider)door.collider.enabled=door.amount<.8;}
    for(const a of this.animated){if(a.update)a.update(dt);else a.object.rotation[a.axis]+=dt*a.speed;}
    this.clock=(this.clock||0)+dt;if(this.special==='mines')this.underground.updateMine(dt,this.clock,position,this.quality);if(this.livestock?.length&&!this.special)updateLivestock(this.livestock,dt,this.clock);
    // Eighteen rooms a frame, and this used to make a fresh vector for each of
    // them. Nothing here is slow, but a few hundred throwaway objects a second
    // is the kind of litter a browser eventually stops to sweep up, and that
    // sweep is a dropped frame you cannot see the cause of.
    for(const [level,e]of this.loaded){e.root.visible=!this.special&&Math.abs(level-this.activeLevel)<=1;for(let i=0;i<e.rooms.length;i++){const room=e.rooms[i];ROOM_CENTRE.set(0,1.5,10).applyMatrix4(room.matrixWorld);room.visible=level===this.activeLevel||ROOM_CENTRE.distanceTo(position)<38;}}
    const y=levelY(this.activeLevel);if(this.special==='pipe-gallery'&&this.story)this.pressure.update(this.story);
    this.lightRig(position,top,dt);
    this.sun.visible=this.outside;this.sun.position.set(position.x+14,position.y+24,position.z-9);this.sun.target.position.copy(position);this.sun.intensity=this.outside?THREE.MathUtils.lerp(.12,2.4,this.surface.sky.daylight):0;
    // The fill comes off slightly faster than the fixtures, so there is a
    // little more shape between the lamps at night than in the middle of the
    // day — but only a little. Enough to feel, not enough to lose the floor.
    this.ambient.intensity=this.outside?THREE.MathUtils.lerp(.16,1.65,this.surface.sky.daylight):(this.special==='silo17'?.28:.48)*Math.pow(this.lampScale,1.15);this.sun.castShadow=this.outside&&this.quality==='high';this.sun.shadow.camera.left=-45;this.sun.shadow.camera.right=45;this.sun.shadow.camera.top=45;this.sun.shadow.camera.bottom=-45;this.sun.shadow.camera.near=1;this.sun.shadow.camera.far=130;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.06;
    this.scene.environmentIntensity=this.outside?.9:this.special==='silo17'?.28:.48;
    const mood=floorAtmosphere(this.activeLevel);this.ambient.color.setHex(this.outside?0xb5c4c0:this.special==="silo17"?0x70948f:mood.light);
    this.scene.fog.density=this.outside?.0012:this.special==='excavator'?.004:this.special==='silo17'?.023:this.special?.009:mood.density;this.scene.fog.color.setHex(this.outside?0x929fa3:this.special==='silo17'?0x132526:mood.fog);this.scene.background.setHex(this.outside?0x929fa3:0x171e1c);if(this.outside)this.scene.fog.color.copy(this.surface.sky.fogColor);this.structure.visible=this.landings.visible=this.stairs.visible=this.distant.visible=this.distantLandings.visible=this.distantStairs.visible=this.topCore.visible=!this.special&&!this.outside;
  }
}
