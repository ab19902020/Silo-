import * as THREE from '../vendor/three.module.js';
import { Kit, addSign } from './kit.js';
import { levelY, TAU } from './data.js';

export const MISSION_STANDS=Object.freeze([
  {id:'walker-orders',owner:'walker',name:'Walker’s work orders',level:144,wing:1,kind:'orders',label:'WORKSHOP / 144 B'},
  {id:'carla-orders',owner:'carla',name:'Carla’s dispatch ledger',level:126,wing:2,kind:'orders',label:'SUPPLY / 126 C'},
  {id:'pete-orders',owner:'pete',name:'Medical collection ledger',level:62,wing:0,kind:'orders',label:'MEDICAL / 062 A'},
  {id:'lukas-orders',owner:'lukas',name:'Lukas’s correspondence',level:19,wing:2,kind:'orders',label:'L. KYLE / 019 C'},
  {id:'lamp-panel',name:'Landing lamp service panel',level:140,wing:0,kind:'panel',label:'LANDING LIGHT / 140 A'},
  {id:'parcel-stand',name:'Unclaimed parcel and routing slip',level:61,wing:0,kind:'parcel',label:'RECOVERY / UNCLAIMED'},
  {id:'sky-strips',name:'Three timed observation strips',level:1,wing:0,kind:'chart',label:'OBSERVATIONS / COPIES'},
  {id:'school-copy',name:'School correspondence tray',level:35,wing:0,kind:'chart',label:'SCHOOL / QUESTIONS'},
]);
export function standPlacement(spec){
  const angle=spec.wing*TAU/6+.30;
  return {position:new THREE.Vector3(Math.cos(angle)*23.4,levelY(spec.level),Math.sin(angle)*23.4),rotation:-angle-Math.PI/2};
}
const USE_LABELS={
  'lamp-diagnose':'Read the lamp fault plate','lamp-isolate':'Isolate the lamp circuit',
  'lamp-fit':'Fit the tested relay','lamp-test':'Close and test the lamp panel',
  'parcel-collect':'Take the sealed parcel','parcel-label':'Read the torn routing slip',
  'sky-read':'Compare the timed observation strips','sky-school':'Leave an anonymous chart for the school',
};
export function workDuration(action){return ['lamp-isolate','lamp-fit','lamp-test'].includes(action)?2100:0;}
function buildStand(m,spec){
  const k=new Kit(m);
  k.bevel('darkMetal',0,.08,0,.64,.12,.46);
  for(const x of [-.25,.25])k.box('metal',x,.48,0,.036,.80,.045);
  k.bevel('wood',0,.90,0,.75,.065,.43);
  k.box('green',0,1.25,-.08,.77,.65,.07);
  for(const x of [-.37,.37])k.box('metal',x,1.28,-.03,.025,.75,.028);
  for(const y of [.94,1.63])k.box('metal',0,y,-.03,.77,.025,.028);
  k.box('paper',-.18,.94,.08,.28,.014,.20);
  const root=k.group([new THREE.Matrix4()],true);root.name='side-mission-'+spec.id;
  addSign(root,spec.label,[0,1.52,-.021],.70,.14,0,{font:'bold 38px Arial',glow:.12});
  if(spec.kind==='panel'){
    const kit=new Kit(m);kit.box('metal',0,1.23,0,.55,.30,.14);kit.box('black',-.15,1.24,.081,.07,.17,.02);kit.box('yellow',-.15,1.28,.098,.025,.07,.018);
    root.add(kit.group([new THREE.Matrix4()],true));addSign(root,'24 V  /  RELAY A',[.09,1.22,.09],.29,.11,0,{glow:.05});
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(.038,10,8),new THREE.MeshBasicMaterial({color:0x724632}));bulb.position.set(.28,1.40,.03);bulb.userData.ownedGeometry=bulb.userData.ownedMaterial=true;root.add(bulb);root.userData.indicator=bulb;
    // The interior pool renders this source; keep the repair state on the
    // fixture without adding a shader light when this floor streams in.
    const light=new THREE.PointLight(0xffdba1,0,7,2);light.position.set(0,1.70,.20);light.visible=false;root.add(light);root.userData.light=light;
    const housing=new Kit(m);housing.box('darkMetal',0,1.78,0,.46,.075,.30);root.add(housing.group([new THREE.Matrix4()],true));
  }else if(spec.kind==='chart'||spec.owner==='lukas'){
    const chart=new Kit(m);chart.box('paper',0,1.21,-.032,.65,.39,.009);
    const rows=[[18,30,42],[26,38,50],[34,46,58]];
    for(let row=0;row<3;row++){
      const y=1.33-row*.10;chart.box('ochre',.05,y,-.022,.005,.075,.007);
      for(const p of rows[row])chart.box('black',-.25+p*.006,y,-.020,.015,.015,.009);
    }
    const page=chart.group([new THREE.Matrix4()],true);root.add(page);root.userData.chart=page;
    addSign(page,'2200\n2300\n0000',[-.26,1.23,-.02],.09,.29,0,{color:'#333d36',background:'#c1bda6',glow:0});
  }else addSign(root,spec.kind==='parcel'?'062 / GREEN CROSS\nKEEP WRAPPING SEALED':'REQUESTS & RETURNS\nSIGN FOR COLLECTION',[0,1.22,-.021],.66,.34,0,{font:'30px Arial',glow:.06});
  if(spec.kind==='parcel'||['pete','carla'].includes(spec.owner)){
    const kit=new Kit(m);kit.bevel('linen',.12,1.01,.06,.30,.14,.25);kit.box('hide',.12,1.085,.06,.024,.013,.26);kit.box('paper',.16,1.093,.07,.12,.006,.07);
    const bundle=kit.group([new THREE.Matrix4()],true);root.add(bundle);root.userData.bundle=bundle;
  }
  return root;
}
export class SideMissionWorld{
  update(world,missions,body=null){
    world.sideMissionInteractions=[];
    for(const [level,entry]of world.loaded){
      if(!entry.missionStands){
        entry.missionStands=[];entry.missionSolids=[];
        for(const spec of MISSION_STANDS.filter(s=>s.level===level)){
          const {position,rotation}=standPlacement(spec),root=buildStand(world.m,spec);root.position.set(position.x,0,position.z);root.rotation.y=rotation;entry.root.add(root);
          entry.missionStands.push({spec,root,position});
          const solid={cx:position.x,cz:position.z,halfX:.38,halfZ:.23,rotationY:rotation,minY:position.y,maxY:position.y+1.64};entry.missionSolids.push(solid);if(!world.special)world.colliders.addOrientedBox(solid);
        }
      }
      for(const {spec,root,position}of entry.missionStands){
        if(spec.kind==='panel'){
          const lit=missions.stages.lamp>=6;root.userData.indicator.material.color.setHex(lit?0xffdfa0:missions.stages.lamp>=4?0x242924:0x724632);
          root.userData.light.intensity=lit&&!world.special&&!world.outside&&(!body||body.position.distanceTo(position)<24)?16:0;
        }
        if(root.userData.bundle)root.userData.bundle.visible=spec.kind==='parcel'?missions.stages.parcel<2:spec.owner==='pete'?missions.outcomes.parcel==='medical':missions.outcomes.parcel==='supply';
        if(root.userData.chart)root.userData.chart.visible=spec.id==='school-copy'?missions.outcomes.sky==='school':spec.owner==='lukas'?missions.outcomes.sky==='private':true;
        if(level!==world.activeLevel||world.special||world.outside)continue;
        const action=missions.availableAt(spec.id),target=position.clone().add(new THREE.Vector3(0,1.25,0));
        if(spec.owner)world.sideMissionInteractions.push({position:target,label:`Read ${spec.name}`,action:'side-board:'+spec.owner,spec});
        else world.sideMissionInteractions.push({position:target,label:action?USE_LABELS[action]:`Read ${spec.name}`,action:action?'side-task:'+action:'side-read:'+spec.id,spec});
      }
    }
  }
}
