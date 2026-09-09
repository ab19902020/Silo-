import * as THREE from '../vendor/three.module.js';
import { Kit, random } from './kit.js';

// Animals in the growing halls.
//
// Wool is explicit that the farms carry livestock as well as crops — the
// levels smell of manure, there are pigs and there is rabbit on the plates —
// and the show keeps chickens under the grow lights. Cattle are inferred
// rather than sourced: a silo could just about keep a couple of small dairy
// cows and no more, so that is what is in here, two of them in stalls.
//
// Each animal is built as two merged part groups, a body and a head, so a
// hall full of them costs a handful of draw calls rather than a hundred. The
// head is a child of the body with its pivot at the neck, which is enough
// articulation for everything they do: birds peck, rabbits twitch, pigs root
// along the trough, cows lift and lower to the feed rail. Tails and ears ride
// on the same phase.
const TAU=Math.PI*2;

function part(m,draw){
  const k=new Kit(m);draw(k);
  const g=k.group([new THREE.Matrix4()],true);
  g.traverse(o=>{if(o.isMesh||o.isInstancedMesh){o.castShadow=true;o.receiveShadow=true;}});
  return g;
}

// --- the species ----------------------------------------------------------
// Sizes are real: a hen stands about 40 cm, a doe rabbit is 40 cm long, a
// grown pig is 1.4 m and a small dairy cow is 2.1 m nose to tail and 1.3 m at
// the shoulder. Nothing here is scaled to look cute.
// How much room each animal insists on. Without this the seven hens all walk
// to the same corner and stand inside one another.
const BULK={chicken:.34,rabbit:.30,pig:.95,cow:1.1};

const SPECIES={
  chicken:{
    height:.42,neck:[0,.335,.105],wander:1.9,pace:.42,
    body:(k,c)=>{
      k.sphere(c.coat,0,.215,-.01,.108,.125,.16);
      k.sphere(c.coat,0,.275,.075,.068,.085,.075);              // breast rising to the neck
      k.sphere(c.coat,0,.245,-.15,.075,.085,.085);              // tail root
      for(const s of [-1,1]){
        k.sphere(c.coat,s*.10,.225,.01,.045,.10,.13);           // folded wing
        k.beam('darkMetal',[s*.035,.135,.01],[s*.045,.02,.02],.011);
        for(const t of [-.35,0,.35])k.beam('darkMetal',[s*.045,.02,.02],[s*.045+t*.05,.008,.075],.007);
      }
      k.mesh(new THREE.ConeGeometry(.06,.20,7),c.coat,0,.28,-.20,1,1,1,-1.15,0,0);
    },
    head:(k,c)=>{
      k.sphere(c.coat,0,0,0,.052,.058,.055);
      k.mesh(new THREE.ConeGeometry(.022,.055,6),'ochre',0,-.004,.055,1,1,1,Math.PI/2,0,0);
      k.sphere('comb',0,.05,.008,.016,.032,.036);               // comb
      k.sphere('comb',0,-.035,.028,.014,.022,.010);             // wattle
      for(const s of [-1,1])k.sphere('black',s*.032,.008,.032,.008);
    },
  },
  rabbit:{
    height:.30,neck:[0,.20,.13],wander:1.2,pace:.30,
    body:(k,c)=>{
      k.sphere(c.coat,0,.155,-.02,.095,.105,.165);
      k.sphere(c.coat,0,.185,-.16,.075,.075,.075);
      for(const s of [-1,1]){k.sphere(c.coat,s*.075,.075,-.09,.045,.055,.075);k.sphere(c.coat,s*.065,.065,.09,.038,.045,.06);}
      k.sphere('white',0,.20,-.20,.045);
    },
    head:(k,c)=>{
      k.sphere(c.coat,0,0,0,.05,.052,.068);
      k.sphere(c.coat,0,-.012,.062,.03,.028,.03);
      for(const s of [-1,1])k.sphere('black',s*.036,.012,.042,.0085);
      for(const s of [-1,1])k.sphere('plaster',s*.028,.021,.078,.008,.006,.006);
    },
    ears:(k,c)=>{for(const s of [-1,1])k.sphere(c.coat,s*.028,.075,-.01,.018,.075,.028);},
  },
  pig:{
    height:.78,neck:[0,.60,.50],wander:1.4,pace:.36,
    body:(k,c)=>{
      k.sphere(c.coat,0,.52,0,.24,.245,.52);
      k.sphere(c.coat,0,.55,.34,.215,.215,.26);                 // shoulder, so the head has something to sit on
      k.sphere(c.coat,0,.55,-.42,.19,.19,.16);
      for(const s of [-1,1])for(const z of [.30,-.30]){
        k.beam(c.coat,[s*.14,.44,z],[s*.16,.20,z],.085);
        k.beam(c.coat,[s*.16,.22,z],[s*.17,.07,z],.048);
        k.cylinder('black',s*.17,.045,z,.055,.09);
      }
      for(let i=0;i<7;i++){const a=i*.9;k.sphere(c.coat,Math.sin(a)*.035,.62+i*.012,-.55-i*.022,.018);}
    },
    head:(k,c)=>{
      k.sphere(c.coat,0,0,0,.155,.155,.185);
      k.cylinder('plaster',0,-.03,.185,.062,.05,Math.PI/2);
      for(const s of [-1,1])k.sphere('black',s*.062,.05,.13,.014);
      for(const s of [-1,1])k.mesh(new THREE.ConeGeometry(.055,.11,4),c.coat,s*.085,.135,-.01,1,1,1,-.35,0,s*.3);
    },
  },
  cow:{
    height:1.34,neck:[0,1.20,.78],wander:.9,pace:.30,
    body:(k,c)=>{
      k.sphere(c.coat,0,.92,0,.34,.38,.92);
      k.sphere(c.patch,.12,1.14,.28,.24,.20,.34);               // a Friesian's patches
      k.sphere(c.patch,-.16,.86,-.42,.26,.24,.30);
      k.sphere(c.coat,0,1.06,-.86,.26,.27,.20);
      for(const s of [-1,1])for(const z of [.62,-.60]){
        k.beam(c.coat,[s*.24,.80,z],[s*.26,.42,z],.078);
        k.beam(c.coat,[s*.26,.42,z],[s*.26,.10,z],.05);
        k.cylinder('black',s*.26,.055,z,.075,.11);
      }
      k.sphere('plaster',0,.60,-.30,.14,.13,.16);               // udder
      k.beam(c.coat,[0,1.16,-1.02],[.04,.74,-1.16],.035);
      k.sphere('black',.04,.66,-1.18,.045,.10,.045);            // switch
    },
    head:(k,c)=>{
      k.sphere(c.coat,0,0,0,.14,.155,.26);
      k.sphere('plaster',0,-.05,.25,.10,.09,.075);
      for(const s of [-1,1])k.sphere('black',s*.05,-.045,.30,.018);
      for(const s of [-1,1])k.sphere('black',s*.075,.075,.14,.022);
      for(const s of [-1,1])k.mesh(new THREE.ConeGeometry(.05,.13,5),c.coat,s*.135,.09,-.02,1,1,1,0,0,s*1.25);
    },
  },
};

const COATS={
  chicken:[{coat:'white'},{coat:'bread'},{coat:'hide'},{coat:'linen'}],
  rabbit:[{coat:'linen'},{coat:'hide'},{coat:'white'}],
  pig:[{coat:'pigSkin'},{coat:'pigSkin'}],
  cow:[{coat:'hidePale',patch:'black'},{coat:'hidePale',patch:'hide'}],
};

const templates=new Map();
function template(m,species,coatIndex){
  const key=`${species}:${coatIndex}`;
  if(templates.has(key))return templates.get(key);
  const spec=SPECIES[species],coat=COATS[species][coatIndex%COATS[species].length];
  const root=new THREE.Group();
  root.add(part(m,k=>spec.body(k,coat)));
  const head=part(m,k=>spec.head(k,coat));head.position.set(...spec.neck);root.add(head);head.name='head';
  if(spec.ears){const ears=part(m,k=>spec.ears(k,coat));head.add(ears);ears.name='ears';}
  templates.set(key,root);return root;
}

// One animal, placed inside a pen it will not leave.
export function animal(m,species,x,z,pen,rng=Math.random){
  const spec=SPECIES[species],coatIndex=Math.floor(rng()*COATS[species].length);
  const group=template(m,species,coatIndex).clone(true);
  group.position.set(x,0,z);group.rotation.y=rng()*TAU;
  return {group,head:group.getObjectByName('head'),ears:group.getObjectByName('ears'),species,spec,pen,
    seed:rng()*100,heading:group.rotation.y,goal:null,rest:2+rng()*6,rng};
}

// Idle behaviour. Birds peck and potter, rabbits sit and twitch, pigs root
// along the trough, cows stand at the rail and lift their heads. They stay
// inside their pen because the pen is the only place a silo can keep them.
export function updateLivestock(animals,dt,time){
  for(let i=0;i<animals.length;i++)for(let j=i+1;j<animals.length;j++){
    const a=animals[i],b=animals[j];
    if(a.pen!==b.pen)continue;
    const dx=b.group.position.x-a.group.position.x,dz=b.group.position.z-a.group.position.z;
    const want=BULK[a.species]+BULK[b.species],d=Math.hypot(dx,dz);
    if(d>want||d<1e-4)continue;
    const push=(want-d)/2/d;
    a.group.position.x-=dx*push;a.group.position.z-=dz*push;
    b.group.position.x+=dx*push;b.group.position.z+=dz*push;
  }
  for(const a of animals){
    const n=a.seed,phase=time*.9+n;
    if(a.rest>0){
      a.rest-=dt;
      if(a.rest<=0&&a.spec.wander>0){
        const p=a.pen,r=a.rng();
        a.goal=new THREE.Vector2(p.x+(a.rng()-.5)*p.w*.7,p.z+(a.rng()-.5)*p.d*.7);
        if(r<.35)a.goal=null,a.rest=1.5+a.rng()*5;
      }
    }else if(a.goal){
      const dx=a.goal.x-a.group.position.x,dz=a.goal.y-a.group.position.z,d=Math.hypot(dx,dz);
      if(d<.12){a.goal=null;a.rest=1.5+a.rng()*6;}
      else{
        a.heading=Math.atan2(dx,dz);
        const step=Math.min(d,a.spec.pace*dt);
        a.group.position.x+=dx/d*step;a.group.position.z+=dz/d*step;
        // A walking bird bobs its whole body; a walking pig does not.
        if(a.species==='chicken')a.group.position.y=Math.abs(Math.sin(time*9+n))*.012;
      }
    }
    const turn=((a.heading-a.group.rotation.y+Math.PI*3)%TAU)-Math.PI;
    a.group.rotation.y+=turn*Math.min(1,dt*4);
    if(!a.head)continue;
    const [hx,hy,hz]=a.spec.neck;
    if(a.species==='chicken'){
      const peck=a.goal?0:Math.max(0,Math.sin(phase*2.2))**6;      // sharp, occasional
      a.head.position.set(hx,hy-peck*.24,hz+peck*.06);
      a.head.rotation.x=peck*1.25+Math.sin(time*1.7+n)*.05;
      a.head.rotation.y=a.goal?0:Math.sin(time*.6+n)*.5;
    }else if(a.species==='rabbit'){
      a.head.position.set(hx,hy+Math.sin(time*3.1+n)*.006,hz);
      a.head.rotation.x=Math.sin(time*.8+n)*.10-.05;
      if(a.ears)a.ears.rotation.z=Math.sin(time*1.3+n*3)*.16;
    }else if(a.species==='pig'){
      const root=(Math.sin(phase*.8)+1)/2;
      a.head.position.set(hx,hy-root*.20,hz+root*.05);
      a.head.rotation.x=root*.75;a.head.rotation.y=Math.sin(time*.7+n)*.22;
    }else{
      const graze=(Math.sin(phase*.35)+1)/2;
      a.head.position.set(hx,hy-graze*.62,hz+graze*.14);
      a.head.rotation.x=graze*1.05;a.head.rotation.y=Math.sin(time*.4+n)*.13;
    }
  }
}

// --- the pens -------------------------------------------------------------
// A livestock hall: a bird run down one side, hutches stacked against the
// wall, two pig pens and a pair of stalls at the far end, all built to the
// same block-and-steel vocabulary as the rest of the silo.
export function buildLivestock(m,k,rng,{solids,fixtureAt}){
  const animals=[],add=(species,x,z,pen,y=0)=>{const a=animal(m,species,x,z,pen,rng);a.group.position.y=y;animals.push(a);return a;};
  const rail=(x0,z0,x1,z1,h=1.05)=>{
    k.beam('metal',[x0,h,z0],[x1,h,z1],.028);k.beam('metal',[x0,h*.55,z0],[x1,h*.55,z1],.022);
    const n=Math.max(2,Math.round(Math.hypot(x1-x0,z1-z0)/1.6));
    for(let i=0;i<=n;i++){const t=i/n;k.beam('metal',[x0+(x1-x0)*t,0,z0+(z1-z0)*t],[x0+(x1-x0)*t,h+.05,z0+(z1-z0)*t],.030);}
    solids.push({x:(x0+x1)/2,z:(z0+z1)/2,w:Math.max(.22,Math.abs(x1-x0)),d:Math.max(.22,Math.abs(z1-z0)),y0:0,y1:h});
  };
  const kerb=(x,z,w,d,h=.34)=>{k.bevel('concrete',x,h/2,z,w,h,d);solids.push({x,z,w,d,y0:0,y1:h});};

  // Bird run down the left of the aisle: mesh over a kerb, nest boxes against
  // the wall, two feeders. Seven hens, which is what that floor area carries.
  const rx=-6.2,rz=19.4,rw=6.4,rd=7.6;
  kerb(rx,rz-rd/2,rw,.26,.3);kerb(rx,rz+rd/2,rw,.26,.3);kerb(rx+rw/2,rz,.26,rd,.3);
  for(const [ax,az,bx,bz] of [[rx-rw/2,rz-rd/2,rx+rw/2,rz-rd/2],[rx+rw/2,rz-rd/2,rx+rw/2,rz+rd/2],[rx-rw/2,rz+rd/2,rx+rw/2,rz+rd/2]])rail(ax,az,bx,bz,1.45);
  for(let i=0;i<24;i++){const t=i/23;k.beam('darkMetal',[rx-rw/2+rw*t,.28,rz-rd/2],[rx-rw/2+rw*t,1.45,rz-rd/2],.006);}
  k.box('soil',rx,.03,rz,rw-.5,.06,rd-.5);
  for(let i=0;i<4;i++){const z=rz-2.7+i*1.8;k.bevel('wood',rx-rw/2+.6,.78,z,1.0,1.5,1.5);k.box('darkMetal',rx-rw/2+1.06,.78,z,.05,1.15,1.15);}
  solids.push({x:rx-rw/2+.6,z:rz,w:1.05,d:rd-.8,y0:0,y1:1.5});
  for(const z of [rz-2.2,rz+2.2]){k.cylinder('metal',rx+1.6,.16,z,.42,.10);k.cylinder('metal',rx+1.6,.32,z,.09,.36);k.box('bread',rx+1.6,.20,z,.7,.03,.7);}
  fixtureAt(rx,3.3,rz,5);
  const run={x:rx+.7,z:rz,w:rw-2.4,d:rd-1.4};
  for(let i=0;i<7;i++)add('chicken',rx+.7+(rng()-.5)*3,rz+(rng()-.5)*5.6,run);

  // A pig pen off the aisle, with the trough on the aisle side so it can be
  // filled without going in.
  const px=1.9,pz=17.5;
  // Block to hip height with a rail above it: any higher and the pen is a
  // blank wall from the aisle and you cannot see the animals at all.
  for(const [x,z,w,d] of [[px,pz-1.9,5.4,.32],[px,pz+1.9,5.4,.32],[px+2.7,pz,.32,4.1]]){
    kerb(x,z,w,d,.72);
    if(w>d)rail(x-w/2,z,x+w/2,z,1.12);else rail(x,z-d/2,x,z+d/2,1.12);
  }
  k.bevel('darkConcrete',px-2.4,.32,pz,.62,.4,3.5);
  k.box('soil',px,.02,pz,5.0,.04,3.5);
  const sty={x:px+.3,z:pz,w:3.6,d:2.6};
  for(const dx of [-1.4,1.3])add('pig',px+dx,pz+(rng()-.5)*1.4,sty);
  fixtureAt(px,3.3,pz,4);

  // Rabbit hutches, stacked in pairs against the end wall.
  for(let i=0;i<3;i++){
    const hx=-.3+i*2.3;
    for(const y of [.6,1.62]){
      k.bevel('wood',hx,y,22.75,2.05,.98,1.7);k.box('darkConcrete',hx,y,21.92,1.85,.84,.06);
      for(let j=0;j<8;j++)k.beam('darkMetal',[hx-.78+j*.22,y-.4,21.88],[hx-.78+j*.22,y+.4,21.88],.006);
      k.box('bread',hx,y-.46,22.75,1.75,.05,1.5);
    }
    solids.push({x:hx,z:22.75,w:2.05,d:1.7,y0:0,y1:2.15});
    add('rabbit',hx+(rng()-.5)*.8,22.75+(rng()-.5)*.7,{x:hx,z:22.75,w:1.2,d:1.0},1.15);
  }
  fixtureAt(1.9,3.3,22.4,5);

  // Two stalls at the right-hand wall, cows facing the feed rail on the aisle.
  for(let i=0;i<2;i++){
    const sz=18.1+i*2.6;
    rail(5.9,sz-1.05,9.4,sz-1.05,1.3);rail(5.9,sz+1.05,9.4,sz+1.05,1.3);
    k.bevel('wood',5.75,.34,sz,.5,.68,2.1);                     // feed rail and manger
    k.box('bread',7.7,.06,sz,3.2,.12,1.9);
    solids.push({x:5.75,z:sz,w:.5,d:2.1,y0:0,y1:.68});
    const cow=add('cow',8.0,sz,{x:8.0,z:sz,w:.5,d:.6});
    cow.heading=-Math.PI/2;cow.group.rotation.y=-Math.PI/2;cow.rest=1e9;cow.goal=null;
  }
  fixtureAt(7.7,3.3,19.4,6);
  return animals;
}
