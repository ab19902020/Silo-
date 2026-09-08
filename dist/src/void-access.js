import * as THREE from '../vendor/three.module.js';
import { Kit, bed, shelf, table, chair, fixture, railing } from './kit.js';

// Spatial relationships follow the excavator/water/tunnel references. Exact
// offsets are reconstructed; no surveyed plan of the filmed camp is public.
export const VOID=Object.freeze({campX:69.4,campZ:8,deckY:12,waterY:5,bedY:4.35,tunnelAngle:Math.atan2(20,73.4),tunnelRadius:72,tunnelLength:36});
export const voidLedgeGaps=[[0,.037],[Math.atan2(VOID.campZ,VOID.campX),.07]];
export const tunnelPoint=(x,y,z)=>{
  const a=VOID.tunnelAngle,c=Math.cos(a),s=Math.sin(a);return new THREE.Vector3(c*(VOID.tunnelRadius+z)+s*x,VOID.bedY+y,s*(VOID.tunnelRadius+z)-c*x);
};
export function buildVoidAccess(m){
  const root=new THREE.Group(),k=new Kit(m),solids=[],walkways=[],interactions=[];
  root.name='void-camp-and-water-access';const {campX:cx,campZ:cz,deckY:deck,bedY:bottom}=VOID;
  // Keep the room and its contents, relocated to the sheltered edge of the
  // excavation. Its open side now faces the machine and the water.
  const camp=new THREE.Group();camp.name='george-and-juliette-hideout';camp.position.set(cx,deck,cz);camp.rotation.y=Math.PI;root.add(camp);const ck=new Kit(m);
  k.box('rust',cx,deck-.15,cz,6.8,.3,7.2);walkways.push({kind:'box',x:cx,z:cz,w:6.8,d:7.2,y:deck});
  const wall=(x,z,w,d,h=2.6)=>{ck.box('rust',x,h/2,z,w,h,d);solids.push({x:cx-x,z:cz-z,w,d,y0:deck,y1:deck+h});};
  wall(-3.3,0,.16,7.2);wall(0,-3.5,6.6,.16);
  // The outer ledge enters through an actual opening in the salvaged plate.
  wall(-2.1,3.5,2.4,.16);wall(2.1,3.5,2.4,.16);
  ck.box('darkMetal',0,2.53,3.5,1.8,.14,.18);
  ck.box('darkMetal',0,2.72,0,6.8,.12,7.2);
  for(const z of [-2.2,2.2])fixture(ck,-1.4,2.5,z,1.2,false);
  bed(ck,-2.2,-2.1);shelf(ck,-2.6,1.9,2.6,2.1);table(ck,.9,1.4,1.5,.9);chair(ck,.9,.3,Math.PI);
  const relicMats=['brass','glass','wood','white','metal'];
  for(let i=0;i<16;i++){const y=[.15,.8,1.45,2.1][i%4],x=-3.6+((i*.47)%2.2);ck.box(relicMats[i%5],x,y+.14,1.9+((i%3)-1)*.18,.16+((i%4)*.05),.26,.14);}
  ck.cylinder('brass',-1.6,.3,1.9,.13,.34);ck.torus('metal',-1.1,.34,1.9,.16,.03,Math.PI/2);
  ck.box('green',-3.15,1.25,-.9,.06,2.4,1.9);ck.cylinder('metal',-3.15,2.5,-.9,.02,2,Math.PI/2,0,Math.PI/2);camp.add(ck.group());
  solids.push({x:cx+2.2,z:cz+2.1,w:1.1,d:2.05,y0:deck,y1:deck+.75},{x:cx-.9,z:cz-1.4,w:1.5,d:.9,y0:deck,y1:deck+.86});
  interactions.push({position:[cx+2.6,deck+1,cz+.9],label:'Look behind the curtain',action:'camp'},{position:[cx+2.6,deck+1,cz-1.9],label:'Inspect the salvaged relics',action:'relics'});
  // A narrow, open rung ladder drops directly from the camp apron. The old
  // caged spiral and central tower door are deliberately absent.
  const ladder={id:'void-water',x:65.6,z:cz,topY:deck,bottomY:bottom,heading:Math.PI/2,topExit:[66.5,deck,cz],bottomExit:[64.5,bottom,cz]};
  const ladderMesh=new THREE.Group();ladderMesh.name='water-ladder';const lk=new Kit(m),railX=66.02;
  for(const z of [cz-.43,cz+.43]){
    lk.cylinder('rust',railX,(deck+bottom+.9)/2,z,.037,deck-bottom+.9);
    for(const y of [bottom+.3,deck-3.5,deck-.25])lk.beam('metal',[railX,y,z],[66.3,y,z],.023);
  }
  for(let y=bottom+.08;y<=deck;y+=.28)lk.beam('metal',[railX-.035,y,cz-.43],[railX-.035,y,cz+.43],.025);
  for(const [a,b] of [[cz-3.5,cz-.65],[cz+.65,cz+3.5]]){
    railing(lk,[66.02,a],[66.02,b],deck);
    solids.push({x:66.02,z:(a+b)/2,w:.1,d:b-a,y0:deck,y1:deck+1.08});
  }
  ladderMesh.add(lk.group());root.add(ladderMesh);
  interactions.push({position:[67.25,deck+.85,cz],label:'Climb down the ladder to the water',action:'ladder',ladder:ladder.id,up:false},{position:[65.5,bottom+1,cz],label:'Climb the ladder back to the camp',action:'ladder',ladder:ladder.id,up:true});
  const basin=new THREE.Mesh(new THREE.RingGeometry(3.15,79.5,96),m.darkConcrete);basin.name='submerged-solid-bed';basin.rotation.x=-Math.PI/2;basin.position.y=bottom-.02;root.add(basin);walkways.push({kind:'ring',r0:3.15,r1:79.5,y:bottom});
  // A round culvert opens through the cavern perimeter. Walking from the
  // ladder through the water to the far door requires no travel transition.
  const tunnel=new THREE.Group();tunnel.name='hidden-water-tunnel';tunnel.position.copy(tunnelPoint(0,0,0));tunnel.rotation.y=Math.PI/2-VOID.tunnelAngle;root.add(tunnel);const tk=new Kit(m);
  const lining=m.darkConcrete.clone();lining.side=THREE.DoubleSide;
  const tube=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.45,36,64,1,true),lining);tube.rotation.x=Math.PI/2;tube.position.set(0,2.2,18);tunnel.add(tube);
  for(let z=0;z<=36;z+=3){tk.torus('darkMetal',0,2.2,z,2.43,.045);for(const x of [-1.9,1.9])tk.cylinder('brass',x,3.63,z,.028,.045,Math.PI/2);}
  const ry=tunnel.rotation.y,box=(x,z,w,d,y,h,mat)=>{tk.box(mat,x,y-h/2,z,w,h,d);const p=tunnelPoint(x,y,z);walkways.push({kind:'box',x:p.x,z:p.z,w,d,y:p.y,ry});};
  for(let j=0;j<20;j++)box(0,(j+.5)*.5,4.6,.5,(j+1)*.035,.18,'darkConcrete');
  box(0,23,4.6,26,.7,.2,'darkConcrete');
  for(const x of [-2.43,2.43]){const p=tunnelPoint(x,0,18);solids.push({x:p.x,z:p.z,w:.18,d:36,y0:bottom,y1:bottom+4.7,ry});}
  for(const x of [-2.05,2.05])tk.cylinder('rust',x,3.48,18,.10,35.5,Math.PI/2);
  // A heavy sealed door sits at the far end of the culvert, not on the digger.
  const door=new THREE.Group();door.name='hidden-tunnel-door';door.position.set(0,.7,35.65);const dk=new Kit(m);
  dk.portal('metal',0,0,0,4.55,3.93,.28,0,.48,.20);dk.bevel('darkMetal',0,1.93,0,4.25,3.85,.28);dk.box('black',0,1.95,-.15,.045,3.64,.016);
  for(const x of [-1,1]){dk.bevel('metal',x,1.95,-.18,1.83,3.38,.075);dk.box('darkMetal',x,1.95,-.23,1.45,2.6,.025);dk.box('brass',x*.18,1.48,-.29,.08,.4,.10);}
  for(const x of [-2.1,2.1])for(let y=.25;y<3.9;y+=.42)dk.cylinder('rust',x,y,-.19,.045,.05,Math.PI/2);
  door.add(dk.group());tunnel.add(door);const dp=tunnelPoint(0,.7,35.65);solids.push({x:dp.x,z:dp.z,w:4.6,d:.34,y0:dp.y,y1:dp.y+4,ry});
  const approach=tunnelPoint(0,1.7,34.1);interactions.push({position:approach.toArray(),label:'Inspect the hidden door',action:'tunnel'});
  for(const z of [1.5,14,30]){fixture(tk,1.8,3.5,z,.62,true);const light=new THREE.PointLight(0xc1d0bf,24,12,1.8);light.position.set(1.8,3.2,z);tunnel.add(light);}
  tunnel.add(tk.group());root.add(k.group());
  const campLight=new THREE.PointLight(0xe0b478,85,16,1.8);campLight.position.set(cx,deck+2.2,cz);root.add(campLight);
  return {root,camp,tunnel,door,ladderMesh,ladders:[ladder],solids,walkways,interactions};
}
