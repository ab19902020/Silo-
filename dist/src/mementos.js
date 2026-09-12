import * as THREE from '../vendor/three.module.js';
import {Kit} from './kit.js';

// Optional finds use the television's objects and material language. Their
// locations and accompanying notes belong to this game's reconstruction.
export const MEMENTOS=Object.freeze([
 {id:'heat-tape',optional:true,sound:'cloth',name:'Mechanical heat tape',eyebrow:'KEEPSAKE · MECHANICAL',level:144,wing:1,at:[-3,1.108,2.1],
  blurb:'A half-used roll of heat tape, its foil creased where somebody tested the adhesive. The ordinary repairs that keep Mechanical running can also decide whether an outside suit holds together.',
  source:'TV-inspired heat tape; an original model and optional workshop placement.'},
 {id:'magnifier',optional:true,sound:'metal',name:'A forbidden magnifying lens',eyebrow:'RELIC · OPTICS',level:62,wing:0,at:[-3,1.108,2.1],
  blurb:'A small lens in a battered brass rim, wrapped in cloth. Its handle has been repaired. Something this ordinary lets a person see more than the rules permit—a reminder of Hanna Nichols’ forbidden work.',
  source:'Inspired by the television story about magnification. This surviving lens and its placement are reconstructed.'},
 {id:'camcorder',optional:true,sound:'plastic',name:'An old video camera',eyebrow:'RELIC · RECORDING DEVICE',level:144,wing:1,at:[3,1.108,2.1],
  blurb:'A hand-sized camera with a cloudy lens and an empty battery shoe. Turn it over: there is a cassette compartment and a worn hand strap. Once, people could keep moving pictures without asking IT.',
  source:'TV-inspired pre-rebellion recording equipment. This model, condition and workshop placement are original reconstructions.'},
 {id:'it-key',optional:true,sound:'metal',name:'An IT key marked 18',eyebrow:'KEEPSAKE · INFORMATION TECHNOLOGY',level:19,wing:0,at:[-3,1.108,2.1],
  blurb:'A compact electronic key on a metal loop, its dark red window marked 18. The casing is worn smooth along its edges. The number means more to the people inside IT than they admit in the gallery.',
  source:'Inspired by Bernard’s numbered key in the television series. This spare is an optional find; it does not unlock story doors.'},
 {id:'sheriff-badge',optional:true,sound:'metal',name:'A retired sheriff’s badge',eyebrow:'KEEPSAKE · SHERIFF’S STATION',level:1,wing:0,at:[-3,1.108,2.1],
  blurb:'A dulled brass badge with its fastening still intact. There is a pale outline in the cloth where it was kept. The office changes hands; the weight of what it asks a person to do stays the same.',
  source:'An original retired badge inspired by the television sheriff’s department; not a claim about a particular screen-used badge.'},
]);

export function addMementoFixtures(root,m,level,wing){
 const items=MEMENTOS.filter(i=>i.level===level&&i.wing===wing);if(!items.length)return;
 const k=new Kit(m);
 for(const item of items){const [x,,z]=item.at;
  k.bevel('wood',x,1.05,z,.78,.1,.48);
  k.box('linen',x,1.104,z,.55,.008,.36);
  for(const dx of [-.32,.32])for(const dz of [-.18,.18])k.box('darkMetal',x+dx,.5,z+dz,.032,1,.032);
  k.beam('darkMetal',[x-.32,.28,z+.18],[x+.32,.28,z+.18],.014);
  // The ledge has a solid footprint: a player's legs cannot pass through it.
  root.userData.solids.push({x,z,w:.78,d:.48,y0:0,y1:1.1});
 }
 const fixtures=k.group();fixtures.name='keepsake-work-surfaces';root.add(fixtures);
}
function label(model,text,w,h,position,rotation=[-Math.PI/2,0,0]){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const c=canvas.getContext('2d');
 c.fillStyle='#302e25';c.fillRect(0,0,512,256);c.fillStyle='#d2c494';c.font='bold 116px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,128);
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.7,metalness:.1}));mesh.position.set(...position);mesh.rotation.set(...rotation);model.add(mesh);
}
export function buildMementoModel(id,m){
 const k=new Kit(m),root=new THREE.Group();root.name=`keepsake-${id}`;
 if(id==='heat-tape'){
  k.arc('paper',.025,.03,.04,0);k.arc('metal',.03,.057,.038,.001);
  for(const r of [.034,.041,.048,.055])k.arc('darkMetal',r,r+.0005,.0005,.0391);
  k.box('metal',.073,.002,0,.055,.004,.038);k.box('paper',.077,.0008,0,.042,.001,.032);
  for(let n=0;n<8;n++)k.box('darkMetal',.05+n*.006,.0041,0,.0007,.0002,.028,0,0,.03);
 }else if(id==='magnifier'){
  k.torus('brass',0,.008,0,.039,.004,Math.PI/2);
  k.sphere('glass',0,.008,0,.036,.004,.036);
  k.beam('brass',[0,.008,-.039],[0,.008,-.065],.006);
  k.bevel('wood',0,.008,-.107,.016,.016,.093,0);
  for(const z of [-.064,-.083,-.145])k.box('brass',0,.008,z,.018,.017,.004);
  k.beam('metal',[-.003,.017,-.088],[.004,.017,-.115],.0007);
 }else if(id==='camcorder'){
  k.bevel('darkMetal',0,.05,0,.094,.096,.19);k.bevel('black',-.049,.048,0,.012,.065,.125);
  k.bevel('metal',.049,.044,-.016,.01,.064,.12);k.box('black',.055,.044,-.016,.001,.049,.1);
  k.cylinder('black',.012,.052,.105,.029,.042,Math.PI/2);k.torus('metal',.012,.052,.129,.025,.003);
  k.cylinder('glass',.012,.052,.131,.022,.003,Math.PI/2);
  k.bevel('black',-.023,.102,-.054,.029,.029,.06);
  k.cylinder('black',-.023,.102,-.094,.019,.03,Math.PI/2);
  k.box('metal',0,.004,-.074,.06,.007,.022);
  for(const x of [-.018,.018])k.box('brass',x,.002,-.074,.004,.001,.012);
  k.beam('fabric',[.05,.062,-.063],[.072,.062,-.045],.009);k.beam('fabric',[.072,.062,-.045],[.072,.062,.063],.009);k.beam('fabric',[.072,.062,.063],[.05,.062,.08],.009);
  k.box('red',.024,.1,-.06,.009,.005,.009);
  for(let i=0;i<7;i++)k.box('black',-.027+i*.008,.098,.02,.002,.001,.045);
 }else if(id==='it-key'){
  k.bevel('metal',0,.009,0,.038,.018,.076);k.bevel('black',0,.016,0,.03,.006,.051);
  k.box('red',0,.0192,0,.028,.001,.029);
  for(const x of [-.01,.01])k.box('brass',x,.009,.039,.004,.005,.004);
  k.torus('metal',0,.004,-.052,.018,.0025,Math.PI/2);
 }else if(id==='sheriff-badge'){
  const shape=new THREE.Shape();shape.moveTo(-.024,.026);shape.quadraticCurveTo(0,.019,.024,.026);shape.lineTo(.022,-.009);shape.quadraticCurveTo(.016,-.027,0,-.035);shape.quadraticCurveTo(-.016,-.027,-.022,-.009);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:.003,bevelEnabled:true,bevelSize:.001,bevelThickness:.0008,bevelSegments:2,steps:1,curveSegments:8});const badge=new THREE.Mesh(geo,m.brass);badge.rotation.x=-Math.PI/2;badge.position.y=.003;root.add(badge);
  k.torus('brass',0,.007,0,.012,.001,Math.PI/2);k.beam('metal',[0,.001,-.023],[0,.001,.015],.001);
 }
 root.add(k.group());
 if(id==='it-key')label(root,'18',.023,.019,[0,.0198,0]);
 if(id==='camcorder')label(root,'REC',.027,.01,[0,.0982,-.014]);
 if(id==='sheriff-badge'){label(root,'SHERIFF',.034,.007,[0,.0069,-.016]);label(root,'18',.009,.006,[0,.0071,0]);}
 return root;
}
