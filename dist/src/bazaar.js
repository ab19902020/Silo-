import * as THREE from '../vendor/three.module.js';
import { Kit, addSign, fixture, table, shelf, pipe, random } from './kit.js';
import {dressBazaar, REPAIR_COUNTER} from './environment-details.js';

// Where the trader keeps what has been left with her. The numbers live in
// environment-details.js, because that file dresses this counter too and both
// passes have to leave the same space alone.
function repairDrop(k){
  const {x,z,surface,top}=REPAIR_COUNTER;
  // A pale mat, because you do not lay a customer's wristwatch face down on
  // bare steel — and because a small dark object on a dark counter in a dim
  // market is exactly the thing nobody can find. The mat is what makes it
  // read from the doorway.
  k.bevel('linen',x,(surface+top)/2,z,.52,top-surface,.34);
  k.box('ochre',x+.185,top+.006,z-.085,.075,.012,.05);              // the repair ticket
  k.cylinder('brass',x-.205,top+.017,z+.055,.019,.034);             // a loupe, stood on end
  k.torus('brass',x-.205,top+.035,z+.055,.018,.004,0);
  for(let i=0;i<4;i++)k.cylinder('darkMetal',x-.115+i*.032,top+.005,z+.105,.005,.01);   // spare pins
  // A cloth roll pushed to the back of the counter to make the room, so the
  // mat reads as space somebody cleared rather than dressing nobody finished.
  k.cylinder('fabric',x+.02,top+.04,z+.30,.038,.34,Math.PI/2);
}

// Shopfront proportions and dressing follow Sally Crees's Silo set photographs.
// The street arrangement and level assignment remain a reconstruction.
export function buildBazaar(m){
  const root=new THREE.Group(),k=new Kit(m),solids=[],floors=[],lightPoints=[];
  const box=(mat,x,y,z,w,h,d,solid=true)=>{k.box(mat,x,y,z,w,h,d);if(solid)solids.push({x,z,w,d,y0:y-h/2,y1:y+h/2});};
  const floor=(x,z,w,d,y=0)=>{box('floor',x,y-.15,z,w,.3,d,false);floors.push({x,z,w,d,y});};
  const label=(t,x,y,z,w=2.6,ry=Math.PI)=>addSign(root,t,[x,y,z],w,.34,ry);
  floor(0,12,20,24);box('darkConcrete',0,9.1,12,20,.28,24,false);
  for(const side of [-1,1]){
    box('darkConcrete',side*10.1,4.5,12,.2,9,24);
    box('darkConcrete',side*5.78,4.5,24.12,8.45,9,.24);
    box('darkConcrete',side*6,4.5,0,8,9,.24);
  }
  box('darkConcrete',0,6.5,24.12,3.1,5,.24);
  const stores=['BAKERY','FRESH PRODUCE','ELECTRICAL REPAIRS','TEXTILES','KITCHENWARE','SALVAGE'];
  const rng=random(10018);
  for(const side of [-1,1])for(let row=0;row<3;row++){
    const z=4.5+row*6.55,cx=side*6.6,front=side*3.3,ry=side===1?-Math.PI/2:Math.PI/2;
    const n=(side===1?3:0)+row,name=stores[n];
    // Three individual, accessible shop rooms on either side of the street.
    box('pale',cx,1.8,z-2.85,6.6,3.6,.2);box('pale',cx,1.8,z+2.85,6.6,3.6,.2);
    box('pale',front,1.8,z-2.02,.36,3.6,1.55);box('pale',front,1.8,z+2.02,.36,3.6,1.55);
    box('pale',front,3.26,z,.36,.68,2.5);k.portal('concrete',front,0,z,2.5,2.93,.5,ry,.4,.2);
    // Rounded cantilevered ledge with the set's characteristic horizontal ribs.
    k.slab('concrete',side*3.45,3.65,z,2.25,6.12,.44,.48);
    for(let j=0;j<5;j++)k.bevel('darkConcrete',side*2.29,3.48+j*.09,z,.07,.034,5.45);
    box('concrete',front,5.9,z,.45,4,5.65);
    for(const dz of [-1.4,1.4]){
      k.portal('darkConcrete',front-side*.27,4.45,z+dz,1.72,2.45,.22,ry,.36,.12);
      const window=new THREE.Mesh(new THREE.PlaneGeometry(1.7,2.43),m.glass);window.position.set(front-side*.22,5.67,z+dz);window.rotation.y=ry;root.add(window);
      k.box('darkMetal',front-side*.31,5.66,z+dz,.055,2.15,.05);
    }
    for(const dz of [-2.55,2.55]){
      k.cylinder('metal',front-side*.4,3.7,z+dz,.045,7.4);
      for(const y of [1.5,3.1,5.2])k.torus('rust',front-side*.4,y,z+dz,.068,.018,Math.PI/2);
    }
    label(name,front-side*.42,3.12,z,2.3,ry);fixture(k,front-side*.6,3.38,z,1.7,false,true);
    lightPoints.push({position:[side*2.2,2.8,z],color:n===0||n===4?0xffab68:0xb7d2c9,intensity:70});
    // Keep the center of each portal open; side counters admit the player.
    const counterZ=z+1.85;
    table(k,cx,counterZ,4.3,1.1);solids.push({x:cx,z:counterZ,w:4.3,d:1.1,y0:0,y1:.9});
    shelf(k,side*8.9,z-1.7,1.25,2.2);
    if(n===0||n===1){
      for(let tray=0;tray<3;tray++){
        const x=cx-1.4+tray*1.3;k.bevel('metal',x,.87,counterZ,1.17,.09,.82);
        for(let j=0;j<9;j++){const xx=x+(j%3-1)*.3,zz=counterZ+(Math.floor(j/3)-1)*.25;k.sphere(n===0?'bread':'leafLight',xx,1.02,zz,n===0?.17:.11,.11,.1);}
      }
      for(const dz of [-.9,.9]){k.cylinder('darkMetal',side*2.5,3.1,z+dz,.018,1.1);k.sphere('red',side*2.5,2.57,z+dz,.27,.2,.27);k.cylinder('redLamp',side*2.5,2.49,z+dz,.23,.018);}
    }else if(n===2||n===5){
      for(let i=0;i<7;i++){const x=cx-1.7+i*.53;k.bevel(i%2?'green':'metal',x,1.01,counterZ,.43,.25,.42);for(let j=0;j<3;j++)k.cylinder('brass',x-.13+j*.13,1.16,counterZ,.022,.07);}
      for(let i=0;i<5;i++)k.torus('rust',cx-1.1+i*.52,1.1,counterZ-.3,.14,.024,Math.PI/2);
    }else if(n===3){
      // The middle bolt is left out. A relic on a counter is only findable if
      // there is a space around it, which is the same thing the directory book
      // needed: it is not the object that hides it, it is the dressing.
      for(let i=0;i<7;i++){if(i===3&&side===1&&row===0)continue;const x=cx-1.55+i*.49;k.bevel(i%3===0?'blue':i%3===1?'fabric':'linen',x,.96,counterZ,.44,.27,.85);}
      if(side===1&&row===0)repairDrop(k);
      k.beam('metal',[side*8.3,2.45,z-2.3],[side*8.3,2.45,z+1.1],.025);
      for(let i=0;i<7;i++)k.bevel(i%2?'linen':'fabric',side*8.3,1.85,z-2+i*.42,.6,1.1,.11);
    }else{
      for(let i=0;i<8;i++){const x=cx-1.65+i*.47;k.cylinder('metal',x,1.08,counterZ,.15,.38);k.torus('metal',x,1.29,counterZ,.17,.025,Math.PI/2);k.beam('brass',[x,1.32,counterZ],[x,1.6,counterZ],.019);}
    }
    const banner=addSign(root,'FOUNDERS\nDAY',[front-side*.47,5.5,z+2.2],.6,2.2,ry,{color:'#c3ab7c',background:n%2?'#254b4b':'#6b3427',font:'bold 70px Georgia',border:true});
    void banner;
  }
  // Crossing lane at the rear and a physically open link to the service ring.
  label('BAZAAR',0,4.1,.3,4.7,0);label('SERVICE GALLERY  ↔',0,3.2,24,2.85);
  for(const z of [3,9.5,16,22]){
    k.beam('darkMetal',[-3,6.7,z],[3,6.7,z+.7],.018);
    for(let j=0;j<9;j++){
      const x=-2.7+j*.65,top=6.7-.35*Math.sin(j/8*Math.PI),geom=new THREE.BufferGeometry();
      geom.setAttribute('position',new THREE.Float32BufferAttribute([x,top,z,x+.45,top,z+.07,x+.25,top-.7,z+.05],3));geom.computeVertexNormals();
      const mesh=new THREE.Mesh(geom,j%3===0?m.blue:j%3===1?m.yellow:m.red);mesh.material.side=THREE.DoubleSide;mesh.userData.ownedGeometry=true;root.add(mesh);
    }
  }
  // Grated drains along the food counters, with no collision across the aisle.
  for(const x of [-2.12,2.12])for(let z=1;z<24;z+=.26)k.box('darkMetal',x,.018,z,.2,.02,.09);
  for(const x of [-9.6,9.6])pipe(k,x,12,8.5,23,.18,'rust');
  dressBazaar(k,root);root.add(k.group());root.userData={...root.userData,solids,floors,interactions:[],animated:[],type:'bazaar',lightPoints};return root;
}
