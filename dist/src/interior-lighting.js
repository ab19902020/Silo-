import * as THREE from '../vendor/three.module.js';
import { SILO, TAU, levelY, landingAngle } from './data.js';
import { INTERIOR_LIGHT } from './atmosphere.js';
import { topPoint } from './surface.js';

const UP=new THREE.Vector3(0,1,0);
const smooth=THREE.MathUtils.smoothstep;

// Geometry and lamp coordinates share the same immutable building space.
// Cache room transforms only while that streamed room is alive.
export class InteriorFixtures {
  constructor(){this.floors=new Map();this.rooms=new WeakMap();this.props=new WeakMap();}
  floor(level){
    if(this.floors.has(level))return this.floors.get(level);
    const out=[],y=levelY(level);
    const add=(key,x,h,z,intensity,distance,extra={})=>out.push({key,position:new THREE.Vector3(x,y+h,z),color:INTERIOR_LIGHT,intensity,distance,cone:distance+3,floorY:y,...extra});
    // Wall fittings are built by SiloWorld.buildStructure, four per sector.
    for(let j=0;j<24;j++){
      const a=(Math.floor(j/4)+(j%4+1)/5)*TAU/6+.045,r=SILO.deckOuter-.9;
      add(`g${level}:${j}`,Math.cos(a)*r,3.15,Math.sin(a)*r,65,16);
    }
    // The existing caged lamps on the stair spine now illuminate the treads.
    // Each flight rotates with its landing, including the top-storey spine.
    const rotation=level===1?0:landingAngle(level),r=SILO.stairColumn+.19;
    for(let j=0;j<4;j++)for(const h of [2.7,7.1]){
      const a=j*TAU/4+rotation;
      add(`stair${level}:${j}:${h}`,Math.cos(a)*r,h,Math.sin(a)*r,24,12,{stair:true});
    }
    if(level===1){
      const fittings=[[-10,6.7,17],[10,6.7,17],[-10,6.7,31],[10,6.7,31],[26,3.7,29],[26,3.7,40],[26,3.7,50],[26,3.7,59],
        [21,4.4,8.5],[31,4.4,8.5],[21,4.4,15],[31,4.4,15],[21,4.4,21],[31,4.4,21]];
      fittings.forEach((p,i)=>out.push({key:`top:${i}`,position:topPoint(...p),color:INTERIOR_LIGHT,intensity:i<4?145:i<8?75:95,distance:i<8?28:24,cone:32,floorY:y}));
    }else{
      for(let j=0;j<48;j+=2){const a=(j+.5)*TAU/48;add(`rear${level}:${j}`,Math.cos(a)*53.6,3.4,Math.sin(a)*53.6,55,12,{room:true});}
    }
    if(level===144)for(let r=57.4;r<64.4;r+=3.6)add(`spur:${r}`,Math.cos(Math.PI/6)*r,2.92,Math.sin(Math.PI/6)*r,45,10,{room:true});
    this.floors.set(level,out);return out;
  }
  candidates(world,position){
    const out=[],level=world.activeLevel;
    for(const n of this.floors.keys())if(Math.abs(n-level)>2)this.floors.delete(n);
    // Fixtures on both sides of the current flight survive the floor counter
    // changing. Structural lights do not wait for room geometry to stream in.
    for(let n=Math.max(1,level-1);n<=Math.min(144,level+1);n++){
      out.push(...this.floor(n));
      const rooms=world.loaded.get(n)?.rooms??[];
      for(let w=0;w<rooms.length;w++){
        const room=rooms[w];let points=this.rooms.get(room);
        if(!points){
          // Rooms cannot move after construction. Avoid matrix walks and new
          // vectors for every fitting on every animation frame.
          const a=w*TAU/6,rotation=Math.PI/2-a,origin=new THREE.Vector3(Math.cos(a)*SILO.deckOuter,levelY(n),Math.sin(a)*SILO.deckOuter);
          points=(room.userData.lightPoints??[]).map((p,j)=>({key:`r${n}:${w}:${j}`,position:new THREE.Vector3(...p.position).applyAxisAngle(UP,rotation).add(origin),color:INTERIOR_LIGHT,
            intensity:p.intensity,distance:room.userData.type==='residential'?12:16,cone:17,room:true,floorY:levelY(n)}));
          this.rooms.set(room,points);
        }
        out.push(...points);
      }
      // A repaired work lamp participates in the same budget. Its stand can
      // stream without adding another shader light or changing program counts.
      for(const {spec,root} of world.loaded.get(n)?.missionStands??[]){
        const lamp=root.userData.light;
        if(!lamp||lamp.intensity<=0)continue;
        let c=this.props.get(root);
        if(!c){
          const position=lamp.position.clone().applyAxisAngle(UP,root.rotation.y).add(root.position);position.y+=levelY(n);
          c={key:`work:${spec.id}`,position,color:INTERIOR_LIGHT,intensity:16,distance:7,cone:10,floorY:levelY(n)};
          this.props.set(root,c);
        }
        out.push(c);
      }
    }
    // Ceiling slabs separate rooms on different floors. Fade their influence
    // continuously with height, rather than switching at levelAt's midpoint.
    // Stair lamps span the open shaft and use their ordinary physical range.
    for(const c of out){
      c.gain=c.stair?1:1-smooth(Math.abs(position.y-(c.floorY+1)),4,8);
      c.distanceSq=c.position.distanceToSquared(position);
    }
    return out.filter(c=>c.gain>.001&&c.distanceSq<c.distance*c.distance);
  }
}

// Six working sources plus two overlapping handover slots, still only eight
// PointLights on the GPU. Retiring sources reach zero before they relocate.
export function placeInteriorLamps(lamps,candidates,position,dt,scale,warmth,nightColor){
  const held=new Set(lamps.filter(l=>l.userData.key&&l.userData.goal>0).map(l=>l.userData.key));
  const score=c=>c.distanceSq/(Math.sqrt(c.intensity)*c.gain)*(held.has(c.key)?.8:1);
  const wanted=new Map(candidates.slice().sort((a,b)=>score(a)-score(b)).slice(0,lamps.length-2).map(c=>[c.key,c]));
  const cold=lamps.every(l=>!l.userData.key),free=[];
  for(const l of lamps){
    const c=wanted.get(l.userData.key);
    if(c){l.userData.goal=c.intensity*c.gain*scale;wanted.delete(c.key);}else{l.userData.goal=0;free.push(l);}
  }
  for(const c of wanted.values()){
    const l=free.find(l=>l.intensity<=.02);
    if(!l)break;
    free.splice(free.indexOf(l),1);l.position.copy(c.position);l.distance=c.distance;
    Object.assign(l.userData,{key:c.key,goal:c.intensity*c.gain*scale,baseColor:c.color,fade:0,output:0});
  }
  for(const l of lamps){
    const d=l.userData,step=Math.min(Math.max(dt,0),.1)/.45;
    d.fade=cold&&d.goal>0?1:THREE.MathUtils.clamp((d.fade??0)+(d.goal>0?step:-step),0,1);
    if(d.goal>0)d.output=cold?d.goal:THREE.MathUtils.damp(d.output??0,d.goal,8,dt);
    l.intensity=(d.output??0)*smooth(d.fade,0,1);
    // Visible zero-energy slots keep Three.js's light-count shader signature
    // constant while sources fade. No shader variant per passing fitting.
    l.visible=true;l.color.setHex(d.baseColor).lerp(nightColor,warmth*.55);
  }
}
