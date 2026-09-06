import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { ColliderSet } from './physics.js';
import { SILO, TAU, levelY, levelAt, roomType, TYPE_NAMES, stairStepY } from './data.js';
import { Kit, createMaterials, addSign, fixture, railing, disposeGroup } from './kit.js';
import { buildRoom } from './rooms.js';
import { buildUnderground } from './underground.js';

export class SiloWorld {
  constructor(scene) {
    this.scene=scene;this.m=createMaterials();this.assets={};this.loaded=new Map();this.activeLevel=1;this.doors=[];this.interactions=[];this.colliders=new ColliderSet();this.animated=[];this.screens=[];this.special=null;this.quality='balanced';
    scene.background=new THREE.Color(0x121c19);scene.fog=new THREE.FogExp2(0x18221e,.0065);
    this.ambient=new THREE.HemisphereLight(0xd7e0cd,0x777765,2.3);scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xd7d9bc,2);this.sun.position.set(15,levelY(1)+20,-8);this.sun.target.position.set(0,levelY(1),0);scene.add(this.sun,this.sun.target);
    this.localLights=Array.from({length:8},()=>{const l=new THREE.PointLight(0xf3d6a0,140,38,1.7);scene.add(l);return l;});
    this.buildStructure();
    this.underground=buildUnderground(this.m);scene.add(this.underground.root);this.underground.root.visible=false;
  }
  async loadAssets(onProgress=()=>{}) {
    const names={hydroponics:'hab_hydroponics_v4',commons:'hab_commons_v4',door:'hab_door_v4',bed:'bed',chair:'chair',workbench:'maintenance_bench_v3',pipes:'pipe_cluster',lockers:'locker_bank_v3',storage:'storage_rack',wall_camera:'wall_camera_v3'};
    const loader=new GLTFLoader();let count=0;
    const results=await Promise.allSettled(Object.entries(names).map(async([name,file])=>{
      const gltf=await loader.loadAsync(new URL(`../assets/lost-signal/${file}.glb`,import.meta.url).href);
      const original=gltf.scene,marker=original.getObjectByName('LS_ORIENT_YUP'),pivot=new THREE.Group();
      if(marker)marker.removeFromParent();else original.rotation.x=Math.PI/2;
      pivot.add(original);pivot.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(pivot),center=bounds.getCenter(new THREE.Vector3());original.position.x-=center.x;original.position.y-=bounds.min.y;original.position.z-=center.z;
      pivot.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});this.assets[name]=pivot;onProgress(++count/10);
    }));
    this.assetFailures=results.filter(r=>r.status==='rejected').length;
    return results;
  }
  buildStructure() {
    const k=new Kit(this.m),R=SILO.wellRadius,O=SILO.deckOuter,H=SILO.levelHeight,C=SILO.stairColumn,S=SILO.stairRadius;
    const gap=Math.asin(SILO.landingHalf/R),stepAngle=TAU/SILO.stairSteps,rise=H/SILO.stairSteps;
    // Repeated structural geometry is instanced through the complete 144-level
    // shaft. Room contents stream independently; distant galleries stay real.
    k.arc('concrete',R,O,.42,-.42);k.arc('darkConcrete',R-.08,R+.5,.72,-.67);
    k.arc('concrete',R-.07,R+.16,.65,.02,gap,TAU-gap*2,96);
    for(const y of [.87,1.1])k.arc('metal',R+.005,R+.04,.035,y,gap,TAU-gap*2,96);
    for(let j=1;j<96;j++){const a=j*TAU/96;if(a<gap||a>TAU-gap)continue;k.cylinder('metal',Math.cos(a)*(R+.02),.88,Math.sin(a)*(R+.02),.025,.5);}
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
      }
    }
    for(let j=0;j<24;j++){
      const a=(j+.5)*TAU/24,r=O-1;
      k.box('concrete',Math.cos(a)*r,H/2,Math.sin(a)*r,.72,H,.88,-a);
      k.box('darkConcrete',Math.cos(a)*(r-.3),2,Math.sin(a)*(r-.3),.12,3.8,.78,-a);
      const la=a+.045;fixture(k,Math.cos(la)*(O-.9),3.15,Math.sin(la)*(O-.9),1.1,false,j%4===0);
    }
    // Full-depth bridge, including the last landing at the top of the stairs.
    k.box('concrete',(C+R+.3)/2,-.2,0,R+.3-C,.4,SILO.landingHalf*2);
    for(const z of [-SILO.landingHalf,SILO.landingHalf]){k.box('concrete',(S+R)/2,.35,z,R-S,.7,.18);railing(k,[S,z],[R,z],.05);}
    k.box('darkConcrete',(S+R)/2,-.85,0,R-S,.85,1.1);
    // Bridges have a narrow center stripe and real join plates at their ends.
    for(let x=S+.5;x<R;x+=1.4)k.box('yellow',x,.012,-1.56,.65,.025,.08);
    const transforms=Array.from({length:144},(_,i)=>new THREE.Matrix4().makeTranslation(0,levelY(i+1),0));
    this.structure=k.group(transforms,true);this.scene.add(this.structure);
    const sk=new Kit(this.m);
    sk.cylinder('concrete',0,H/2,0,C,H);
    for(let j=0;j<SILO.stairSteps;j++){
      const a=j*stepAngle,y=stairStepY(j);
      sk.arc('concrete',C,S,.18,y-.18,a,stepAngle*1.005,2);
      sk.arc('darkConcrete',S-.1,S+.14,.7,y,a,stepAngle*1.01,2);
      sk.arc('metal',S-.01,S+.035,.045,y+.92,a,stepAngle*1.01,2);
      sk.cylinder('metal',Math.cos(a)*S,y+.82,Math.sin(a)*S,.027,.46);
      // Tread nosing, a useful visual scale reference at close range.
      sk.beam('darkMetal',[Math.cos(a)*C,y+.015,Math.sin(a)*C],[Math.cos(a)*(S-.15),y+.015,Math.sin(a)*(S-.15)],.018);
    }
    // Stair guard is trimmed where each bridge meets it. The bridge extends
    // back to the column; short local openings avoid any top-landing wall.
    const openAngle=Math.asin(SILO.landingHalf/S);
    sk.parts=sk.parts.filter(p=>{
      if(p.geometry.type==='CylinderGeometry')return true;
      if(p.material!==this.m.darkConcrete&&p.material!==this.m.metal)return true;
      const b=p.geometry.boundingBox||(p.geometry.computeBoundingBox(),p.geometry.boundingBox),center=b.getCenter(new THREE.Vector3()).applyMatrix4(p.matrix),a=Math.atan2(center.z,center.x),y=center.y;
      return !(Math.abs(a)<openAngle&&(y<1.4||y>H-.4));
    });
    for(const y of [2.4,6.5]){sk.box('darkMetal',C+.06,y,0,.14,1.6,.35);sk.box('lamp',C+.14,y,0,.05,1.35,.16);}
    this.stairs=sk.group(transforms.slice(1),true);this.scene.add(this.stairs);
    // Crown closes the structure above the top landing; no exterior town.
    const crown=new Kit(this.m);crown.cylinder('darkConcrete',0,levelY(1)+H,0,O+1,.65);for(let i=0;i<12;i++){const a=i*TAU/12;crown.beam('concrete',[Math.cos(a)*C,levelY(1)+H-.6,Math.sin(a)*C],[Math.cos(a)*O,levelY(1)+H-.6,Math.sin(a)*O],.35);}this.scene.add(crown.group());
  }
  loadLevel(level){
    if(this.loaded.has(level))return this.loaded.get(level);
    const root=new THREE.Group(),y=levelY(level),rooms=[],doors=[],interactions=[];root.position.y=y;
    for(let wing=0;wing<6;wing++){
      const a=wing*TAU/6,ry=Math.PI/2-a,type=roomType(level,wing),room=buildRoom(this.m,type,level,wing,this.assets);
      room.position.set(Math.cos(a)*SILO.deckOuter,0,Math.sin(a)*SILO.deckOuter);room.rotation.y=ry;root.add(room);rooms.push(room);
      const sg=addSign(root,String(level).padStart(3,'0'),[Math.cos(a)*(SILO.deckOuter-.56),2.15,Math.sin(a)*(SILO.deckOuter-.56)],1.8,1.25,ry+Math.PI,{font:'bold 200px Arial',background:'#34453b'});
      sg.position.x+=Math.sin(a)*3.3;sg.position.z-=Math.cos(a)*3.3;
      addSign(root,TYPE_NAMES[type],[Math.cos(a)*(SILO.deckOuter-.52),3.6,Math.sin(a)*(SILO.deckOuter-.52)],4.6,.55,ry+Math.PI);
      // A real double leaf door with a switchable oriented collision volume.
      const doorRoot=new THREE.Group();doorRoot.position.copy(room.position);doorRoot.rotation.y=ry;root.add(doorRoot);const leaves=[];
      for(const side of [-1,1]){const pivot=new THREE.Group();pivot.position.set(side*1.95,0,0);const dk=new Kit(this.m);dk.box('green',-side*.975,1.6,0,1.95,3.2,.12);dk.box('darkMetal',-side*.975,2.15,-.075,1.25,.85,.04);dk.box('glass',-side*.975,2.15,-.105,1.1,.7,.02);dk.box('brass',-side*1.7,1.35,-.12,.065,.34,.07);for(let z=0;z<5;z++)dk.box('metal',-side*.975,.38+z*.11,-.08,1.45,.03,.025);pivot.add(dk.group());doorRoot.add(pivot);leaves.push({pivot,side});}
      const door={level,wing,position:new THREE.Vector3(room.position.x,y+1.5,room.position.z),ry,open:wing===0||type==='airlock',amount:wing===0||type==='airlock'?1:0,leaves,type,collider:null};doors.push(door);
      for(const interact of room.userData.interactions){const p=new THREE.Vector3(...interact.position).applyAxisAngle(new THREE.Vector3(0,1,0),ry).add(room.position);p.y+=y;interactions.push({...interact,position:p});}
    }
    const bridgeSign=addSign(root,`LEVEL ${String(level).padStart(3,'0')}`,[SILO.wellRadius+1.9,1.6,-2.9],3,.8,-Math.PI/2);void bridgeSign;
    this.scene.add(root);const entry={level,root,rooms,doors,interactions};this.loaded.set(level,entry);return entry;
  }
  setLevel(level,special=null){
    this.activeLevel=level;this.special=special;
    for(const n of [level-1,level,level+1])if(n>=1&&n<=144)this.loadLevel(n);
    for(const [n,e]of this.loaded)if(Math.abs(n-level)>2){disposeGroup(e.root);this.loaded.delete(n);}
    this.doors=[...this.loaded.values()].flatMap(e=>e.doors);this.interactions=[...this.loaded.values()].flatMap(e=>e.interactions);
    this.animated=[...this.loaded.values()].flatMap(e=>e.rooms.flatMap(r=>r.userData.animated));this.screens=[...this.loaded.values()].flatMap(e=>e.rooms.map(r=>r.userData.outsideScreen).filter(Boolean));
    this.underground.root.visible=!!special;
    this.rebuildCollision();
  }
  rebuildCollision(){
    const c=new ColliderSet(),R=SILO.wellRadius,O=SILO.deckOuter,S=SILO.stairRadius,C=SILO.stairColumn,H=SILO.levelHeight;
    if(this.special){
      for(const f of this.underground.walkways){if(f.kind==='ring')c.addRing({innerRadius:f.r0,outerRadius:f.r1,minY:f.y-.5,maxY:f.y,climbable:true});else c.addOrientedBox({cx:f.x,cz:f.z,halfX:f.w/2,halfZ:f.d/2,rotationY:0,minY:f.y-.4,maxY:f.y,climbable:true});}
      for(const b of this.underground.solids)c.addOrientedBox({cx:b.x,cz:b.z,halfX:b.w/2,halfZ:b.d/2,rotationY:0,minY:b.y0,maxY:b.y1});
      if(this.special==='excavator'){
        c.addRing({innerRadius:74,outerRadius:77,minY:0,maxY:68});c.addRing({innerRadius:0,outerRadius:3.15,minY:0,maxY:60});
        // Guard rails have a gap for the bridge at positive X.
        c.addRing({innerRadius:67.9,outerRadius:68.2,minY:12,maxY:13.2,gaps:[[0,.034]]});
        for(const z of [-1.8,1.8])c.addOrientedBox({cx:39,cz:z,halfX:31,halfZ:.08,rotationY:0,minY:12,maxY:13.1});
      }
      this.colliders=c;return;
    }
    for(let level=Math.max(1,this.activeLevel-2);level<=Math.min(144,this.activeLevel+2);level++){
      const y=levelY(level),gap=Math.asin(SILO.landingHalf/R);
      c.addRing({innerRadius:R,outerRadius:O,minY:y-.42,maxY:y,climbable:true});
      c.addRing({innerRadius:R-.07,outerRadius:R+.16,minY:y,maxY:y+1.13,gaps:[[0,gap]]});
      c.addRing({innerRadius:O-.2,outerRadius:O+.2,minY:y,maxY:y+3.35,gaps:Array.from({length:6},(_,j)=>[j*TAU/6,2.05/O])});
      c.addRing({innerRadius:O-.3,outerRadius:O+.3,minY:y+3.35,maxY:y+H});
      c.addOrientedBox({cx:(C+R+.3)/2,cz:0,halfX:(R+.3-C)/2,halfZ:SILO.landingHalf,rotationY:0,minY:y-.4,maxY:y,climbable:true});
      for(const z of [-SILO.landingHalf,SILO.landingHalf])c.addOrientedBox({cx:(S+R)/2,cz:z,halfX:(R-S)/2,halfZ:.1,rotationY:0,minY:y,maxY:y+1.13});
      if(level>1){
        const lower=y,stepAngle=TAU/SILO.stairSteps,rise=H/SILO.stairSteps;
        for(let j=0;j<SILO.stairSteps;j++){
          const center=(j+.5)*stepAngle,top=lower+stairStepY(j);
          c.addArc({innerRadius:C,outerRadius:S,minY:top-.18,maxY:top,centre:center,halfWidth:stepAngle*.505,climbable:true});
          const opening=Math.asin(SILO.landingHalf/S),nearEnd=center<opening||center>TAU-opening;
          if(!nearEnd)c.addArc({innerRadius:S-.1,outerRadius:S+.14,minY:top,maxY:top+1.02,centre:center,halfWidth:stepAngle*.51});
        }
      }
      const e=this.loaded.get(level);if(!e)continue;
      for(const room of e.rooms){
        const ry=room.rotation.y,cos=Math.cos(ry),sin=Math.sin(ry),ox=room.position.x,oz=room.position.z;
        c.addOrientedBox({cx:ox+sin*SILO.roomDepth/2,cz:oz+cos*SILO.roomDepth/2,halfX:SILO.roomHalf,halfZ:SILO.roomDepth/2,rotationY:ry,minY:y-.36,maxY:y,climbable:true});
        for(const b of room.userData.solids)c.addOrientedBox({cx:ox+cos*b.x+sin*b.z,cz:oz-sin*b.x+cos*b.z,halfX:b.w/2,halfZ:b.d/2,rotationY:ry+(b.ry||0),minY:y+b.y0,maxY:y+b.y1});
      }
      for(const d of e.doors)d.collider=c.addOrientedBox({cx:d.position.x,cz:d.position.z,halfX:1.95,halfZ:.08,rotationY:d.ry,minY:y,maxY:y+3.2,enabled:d.amount<.8});
    }
    c.addRing({innerRadius:0,outerRadius:C,minY:0,maxY:levelY(1)+H});
    this.colliders=c;
  }
  spawn(level,wing=null){const y=levelY(level);if(wing===null)return new THREE.Vector3(20.6,y,0);const a=wing*TAU/6;return new THREE.Vector3(Math.cos(a)*29,y,Math.sin(a)*29);}
  destination(id){
    if(id==='mines')return {level:144,special:id,position:new THREE.Vector3(105,48,-26),yaw:Math.PI};
    if(id==='excavator')return {level:144,special:id,position:new THREE.Vector3(71,12,0),yaw:Math.PI/2};
    if(id==='tunnel')return {level:144,special:id,position:new THREE.Vector3(105,8,74),yaw:Math.PI};
    if(id==='airlock')return {level:1,position:this.spawn(1,1),yaw:Math.PI/2-TAU/6+Math.PI};
    return {level:Number(id),position:this.spawn(Number(id)),yaw:-Math.PI/2};
  }
  nearestInteraction(position,direction){
    const pool=this.special?this.underground.interactions.map(v=>({...v,position:new THREE.Vector3(...v.position)})):[...this.doors.map(d=>({position:d.position,label:`${d.open?'Close':'Open'} ${TYPE_NAMES[d.type].toLowerCase()} door`,door:d})),...this.interactions];
    let nearest=null,best=5;
    for(const i of pool){const delta=i.position.clone().sub(position),dist=delta.length();if(dist>best||dist<.05)continue;if(delta.normalize().dot(direction)<.32)continue;best=dist;nearest=i;}return nearest;
  }
  update(dt,position){
    if(!this.special){const level=levelAt(position.y);if(level!==this.activeLevel)this.setLevel(level);}
    for(const door of this.doors){door.amount=THREE.MathUtils.damp(door.amount,door.open?1:0,6,dt);for(const leaf of door.leaves)leaf.pivot.rotation.y=-leaf.side*door.amount*Math.PI*.52;if(door.collider)door.collider.enabled=door.amount<.8;}
    for(const a of this.animated)a.object.rotation[a.axis]+=dt*a.speed;
    for(const [level,e]of this.loaded){e.root.visible=!this.special&&Math.abs(level-this.activeLevel)<=1;for(let i=0;i<e.rooms.length;i++){const room=e.rooms[i],center=new THREE.Vector3(0,1.5,10).applyMatrix4(room.matrixWorld);room.visible=level===this.activeLevel||center.distanceTo(position)<38;}}
    const y=levelY(this.activeLevel);
    for(let i=0;i<this.localLights.length;i++){
      const l=this.localLights[i];l.visible=true;
      if(this.special){l.position.set(position.x+Math.cos(i*TAU/8)*7,position.y+3,position.z+Math.sin(i*TAU/8)*7);l.intensity=i<4?95:0;l.color.setHex(i%2?0xcda575:0xadc5bf);}
      else if(i<6){const a=i*TAU/6;l.position.set(Math.cos(a)*21,y+4.8,Math.sin(a)*21);l.intensity=170;l.color.setHex(i%3?0xf4d39b:0xc0d4c3);}
      else {const angle=Math.atan2(position.z,position.x);l.position.set(Math.cos(angle)*(i===6?33:44),y+4.7,Math.sin(angle)*(i===6?33:44));l.intensity=210;l.color.setHex(roomType(this.activeLevel,Math.round(angle/TAU*6+6)%6)==='medical'?0xc1dcd5:0xe7d3a5);}
    }
    this.sun.position.set(position.x+14,position.y+24,position.z-9);this.sun.target.position.copy(position);this.sun.intensity=this.special?.45:1.7;
    this.scene.fog.density=this.special==='excavator'?.004:this.special?.007:.0065;
  }
}
