import * as THREE from '../vendor/three.module.js';
import { Kit } from './kit.js';
import { roomPoint } from './characters.js';
import { COLLECTABLES } from './story.js';
import {buildMementoModel} from './mementos.js';
import {loadRelicModel} from './relic-assets.js';

// The physical relics, and the thing that comes for you when you go outside.
//
// Blender-authored relics rest on their actual supporting surfaces. Procedural
// tools remain as fallbacks; the supplied drive is placed by characters.js.

const build={
  pez:(k)=>{
    k.box('white',0,0,0,.024,.086,.014);                       // the sleeve
    for(let i=0;i<4;i++)k.box('blue',0,-.03+i*.02,.008,.019,.014,.003);
    k.box('yellow',0,.055,.004,.026,.03,.026);                 // the head, tipped back
    k.sphere('yellow',0,.072,.012,.014,.013,.016);
    k.box('ochre',0,.068,.028,.010,.008,.016);                 // bill
    for(const s of [-1,1])k.sphere('black',s*.008,.077,.021,.0028);
  },
  watch:(k)=>{
    k.cylinder('brass',0,0,0,.019,.008,Math.PI/2);
    k.cylinder('white',0,0,.0045,.0155,.001,Math.PI/2);
    k.torus('brass',0,0,0,.019,.0025,0);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;k.box('darkMetal',Math.sin(a)*.0125,Math.cos(a)*.0125,.005,.0016,.0032,.0006,0,0,-a);}
    k.box('darkMetal',0,.004,.0055,.0015,.009,.0006);
    k.box('darkMetal',.0035,-.001,.0055,.0075,.0014,.0006,0,0,.5);
    for(const s of [-1,1])for(let i=0;i<5;i++)k.box('rust',0,s*(.024+i*.014),0,.016,.013,.004,0,.12*i,0);
  },
  georgia:(k)=>{
    k.bevel('bread',0,0,0,.155,.021,.205);                     // boards
    k.bevel('paper',0,.002,0,.146,.020,.196);
    k.box('ochre',-.074,.001,0,.009,.023,.205);                // spine
    k.box('leafLight',0,.013,.028,.11,.001,.09);               // a photograph of water on the cover
    k.box('blue',0,.0135,.052,.108,.001,.042);
  },
  ledger:(k)=>{
    k.bevel('darkMetal',0,0,0,.19,.03,.255);
    k.bevel('paper',0,.004,.006,.178,.028,.243);
    for(let i=0;i<9;i++)k.box('darkConcrete',0,.019,-.09+i*.022,.15,.0006,.0012);
    for(let i=0;i<5;i++)k.box('red',-.03+i*.014,.0192,-.05+i*.03,.05,.0007,.0014,0,0,.02);
    k.box('brass',-.086,.002,0,.008,.032,.255);
  },
  crowbar:(k)=>{
    k.beam('darkMetal',[0,0,-.34],[0,0,.30],.018);
    k.beam('rust',[-.11,0,.36],[0,0,.30],.022);
    k.box('darkMetal',-.14,0,.39,.17,.018,.045,0,-.22,0);
  },
  pipekit:(k)=>{
    k.bevel('darkMetal',0,.09,0,.52,.18,.34);
    k.box('rust',0,.19,0,.48,.04,.3);
    for(const x of [-.13,.13])k.torus('metal',x,.25,0,.075,.018,Math.PI/2);
    k.beam('brass',[-.17,.29,.06],[.17,.29,-.06],.018);
  },
  suit:(k)=>{
    // Folded into an open crate: the helmet on top of the folded suit.
    k.bevel('wood',0,.16,0,.62,.32,.46);
    k.box('darkMetal',0,.32,0,.6,.02,.44);
    k.bevel('linen',0,.40,-.03,.5,.14,.34);
    k.box('darkMetal',0,.45,-.03,.46,.03,.3);
    k.sphere('linen',0,.56,.06,.145,.15,.125);
    k.sphere('darkMetal',0,.565,.17,.115,.105,.055);
    k.torus('brass',0,.455,.06,.1,.016,Math.PI/2);
    for(const s of [-1,1])k.box('yellow',s*.14,.474,-.03,.05,.012,.24);
  },
  shotgun:(k)=>{
    k.beam('darkMetal',[0,0,-.30],[0,0,.34],.014);             // barrel
    k.beam('darkMetal',[0,-.024,-.24],[0,-.024,.30],.011);     // magazine tube
    k.bevel('wood',0,-.014,-.40,.048,.062,.22,0);              // stock
    k.bevel('wood',0,-.03,.06,.05,.042,.14);                   // forend
    k.box('darkMetal',0,-.03,-.24,.036,.07,.16);               // receiver
    k.box('darkMetal',0,-.075,-.245,.012,.05,.03);             // trigger guard
    k.box('brass',0,0,.35,.016,.016,.012);
  },
};



// Somewhere for a story item to live.
//
// A relic lying at chest height in the middle of a room reads as a bug, and it
// is invisible: there is nothing to catch the eye and nothing to walk towards.
// The crowbar sat like that in the machine hall — no bench under it, no board
// behind it — which is exactly the one item players could not find.
//
// A fixture is the furniture that explains the item. It is built once and stays
// after the item is taken, so the empty outline reads as somebody having been
// here before you.
const FIXTURES=[
  {id:'tool-board',level:144,wing:0,at:[6.5,0,13.62],build:(k)=>{
    for(const x of [-1.5,1.5])k.beam('darkMetal',[x,.88,0],[x,2.02,0],.035);
    k.box('wood',0,1.5,.06,3.2,1.16,.05);
    k.box('darkMetal',0,2.06,.04,3.3,.07,.12);
    // Painted outlines of what hangs here, so a gap reads as a missing tool.
    for(let i=0;i<5;i++)k.box('pale',-1.2+i*.6,1.72,.026,.055,.42,.006);
    k.box('pale',-1.2,1.28,.026,.5,.05,.006);k.box('pale',-.95,1.16,.026,.05,.3,.006);
    for(const x of [-.35,.25,.85])k.beam('rust',[x,1.86,.03],[x,1.5,.03],.014);
    for(const x of [-1.5,1.5])k.box('brass',x,1.16,.04,.09,.09,.05);
  }},
];

// The concession the comment below has always promised and the file never
// made good on. A relic is a real object at its real size: a wristwatch is
// five centimetres of dark metal, and on a market counter in a silo lit by
// half a dozen fittings it is not so much hidden as simply unlit.
//
// So a relic carries a trace of its own texture as light. It is not a marker
// and not a glow — at arm's length you cannot tell it is there, and it never
// lifts the object off its own surface. It only stops a small thing sinking
// entirely into a dark room, which is what was happening.
const GLINT=.055;
function catchTheLight(model){
  model.traverse(o=>{
    if(!o.isMesh)return;
    const single=!Array.isArray(o.material);
    const lit=(single?[o.material]:o.material).map(source=>{
      const m=source.clone();
      // Only the materials that have somewhere to put it. A basic material
      // has no emissive channel and needs none — it is already unlit.
      if(m.emissive){
        m.emissive.copy(m.color);
        if(m.map)m.emissiveMap=m.map;
        m.emissiveIntensity=GLINT;
        m.needsUpdate=true;
      }
      return m;
    });
    o.material=single?lit[0]:lit;
  });
}

export class StoryProps{
  constructor(scene,materials){
    this.scene=scene;this.m=materials;this.items=new Map();
    this.fixtures=FIXTURES.map(fixture=>{
      const k=new Kit(materials);fixture.build(k);
      const group=new THREE.Group();group.add(k.group());group.name=`fixture-${fixture.id}`;
      group.position.copy(roomPoint(fixture.level,fixture.wing,fixture.at[0],fixture.at[2]));
      group.position.y+=fixture.at[1];
      group.traverse(o=>{if(o.isMesh||o.isInstancedMesh){o.castShadow=true;o.receiveShadow=true;}});
      group.visible=false;scene.add(group);
      return {fixture,group};
    });
    for(const item of COLLECTABLES){
      if(item.prop||item.id==='shotgun'||(!build[item.id]&&!item.optional))continue;                  // the hard drive is a supplied model
      const group=new THREE.Group();
      if(item.optional)group.add(buildMementoModel(item.id,materials));else{const k=new Kit(materials);build[item.id](k);group.add(k.group());}
      group.name=`relic-${item.id}`;
      // A relic is a real object at its real size, and a PEZ dispenser on a bar
      // among forty mugs is genuinely hard to see. A faint glint above it is
      // the concession: enough to catch the eye down the room, not enough to
      // turn the silo into a trail of markers.
      group.position.copy(roomPoint(item.level,item.wing,item.at[0],item.at[2]));
      group.position.y+=item.at[1];
      group.traverse(o=>{if(o.isMesh||o.isInstancedMesh){o.castShadow=true;o.receiveShadow=true;}});
      group.visible=false;scene.add(group);
      this.items.set(item.id,{item,group,base:group.position.y});
    }
  }
  async loadAssets(){
    const results=await Promise.allSettled(['pez','watch','georgia'].map(async id=>{
      const model=await loadRelicModel(id),entry=this.items.get(id);if(!entry||!model)return;
      entry.group.clear();entry.group.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
      catchTheLight(model);
    }));return results.filter(r=>r.status==='rejected').length;
  }
  inspectionModel(id){return this.items.get(id)?.group||null;}
  // Only what the story says is there, on the level you are standing on.
  update(dt,time,story,level,special){
    for(const {fixture,group} of this.fixtures)group.visible=!special&&fixture.level===level;
    for(const [id,entry] of this.items){
      const on=!special&&story.visible(id)&&entry.item.level===level;
      entry.group.visible=on;
      if(!on)continue;
      // Relics rest on their support. Rotation belongs to the inspection view.
      entry.group.rotation.y=Math.PI/2-entry.item.wing*Math.PI/3;
      entry.group.position.y=entry.base;
    }
  }
  interactions(story,level,special){
    const out=[];
    if(special)return out;
    for(const [id,entry] of this.items){
      if(!story.visible(id)||entry.item.level!==level)continue;
      out.push({position:entry.group.position.clone(),label:`Take ${entry.item.name.replace(/^A /,'the ').replace(/^An /,'the ')}`,action:`relic:${id}`});
    }
    return out;
  }
}

// --- the drone ------------------------------------------------------------
// It comes up over the crest, closes on you, hangs there while it decides, and
// then fires. A shotgun is the only answer this build offers.
export function buildDrone(materials){
  const k=new Kit(materials),g=new THREE.Group();
  k.bevel('darkMetal',0,0,0,.44,.13,.62);
  k.bevel('metal',0,.07,-.04,.34,.06,.4);
  k.sphere('glass',0,-.02,.30,.075,.065,.09);
  k.box('redLamp',0,-.02,.375,.03,.012,.01);
  for(const sx of [-1,1])for(const sz of [-1,1]){
    k.beam('metal',[sx*.14,.02,sz*.2],[sx*.42,.06,sz*.46],.018);
    k.cylinder('darkMetal',sx*.42,.075,sz*.46,.055,.03);
    k.torus('darkMetal',sx*.42,.085,sz*.46,.20,.012,Math.PI/2);
    const rotor=new THREE.Group(),rk=new Kit(materials);
    for(let i=0;i<3;i++)rk.box('metal',0,0,0,.028,.004,.36,i*Math.PI/3);
    rotor.add(rk.group());rotor.position.set(sx*.42,.09,sz*.46);g.add(rotor);
    (g.userData.rotors=g.userData.rotors||[]).push(rotor);
  }
  k.box('darkMetal',0,-.10,.02,.10,.12,.26);
  k.beam('darkMetal',[0,-.15,-.02],[0,-.15,.30],.018);
  g.add(k.group());g.name='surveillance-drone';
  g.traverse(o=>{if(o.isMesh||o.isInstancedMesh)o.castShadow=true;});
  return g;
}

// Approach, hold, fire. `target` is the player's eye position in world space.
export class Drone{
  constructor(scene,materials){
    this.group=buildDrone(materials);this.group.visible=false;scene.add(this.group);
    this.reset();
  }
  reset(){this.active=false;this.state='idle';this.timer=0;this.group.visible=false;this.hits=0;}
  launch(from){
    this.active=true;this.state='closing';this.timer=0;this.hits=0;
    this.group.position.copy(from);this.group.rotation.set(0,0,0);this.group.visible=true;
  }
  // Returns 'fired' on the frame it kills you, 'down' when it has been shot.
  update(dt,target){
    if(!this.active)return null;
    for(const r of this.group.userData.rotors||[])r.rotation.y+=dt*(this.state==='falling'?9:64);
    if(this.state==='falling'){
      this.velocity=(this.velocity||0)-9.81*dt;
      this.group.position.y+=this.velocity*dt;
      this.group.rotation.z+=dt*3.4;this.group.rotation.x+=dt*1.9;
      if(this.group.position.y<=this.floor){this.active=false;return 'landed';}
      return null;
    }
    const to=target.clone().sub(this.group.position),distance=to.length();
    const hold=this.state==='holding';
    if(distance>(hold?9:11))this.group.position.addScaledVector(to.normalize(),Math.min(distance-8,dt*(hold?5:14)));
    this.group.position.y=THREE.MathUtils.damp(this.group.position.y,target.y+3.1,2.2,dt);
    this.group.lookAt(target);
    this.timer+=dt;
    if(this.state==='closing'&&distance<13){this.state='holding';this.timer=0;}
    if(hold&&this.timer>13)return 'fired';
    return null;
  }
  // A hitscan from the eye. Generous, because a shotgun is generous.
  shoot(eye,direction,floorY){
    if(!this.active||this.state==='falling')return false;
    const to=this.group.position.clone().sub(eye),distance=to.length();
    if(distance>70)return false;
    if(to.normalize().dot(direction)<Math.cos(.16))return false;
    if(++this.hits<2)return false;
    this.state='falling';this.velocity=0;this.floor=floorY;return true;
  }
}
