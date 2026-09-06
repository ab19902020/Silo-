import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export function random(seed = 18) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function surfaceTexture(seed, kind) {
  const n = 256, rng = random(seed), data = new Uint8Array(n * n * 4);
  const grain = new Float32Array(n * n);
  for (let i = 0; i < grain.length; i++) grain[i] = rng();
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const broad = Math.sin(x * .064 + Math.sin(y * .032) * 2) * Math.sin(y * .046) * 10;
    let value = 185 + broad + (grain[y*n+x] - .5) * (kind === 'metal' ? 25 : 45);
    if (kind === 'concrete') { if (y % 64 < 2) value -= 38; if (x % 128 === 5 && y % 64 < 8) value -= 30; }
    if (kind === 'tile') { if (x % 32 < 2 || y % 32 < 2) value -= 65; }
    if (kind === 'wood') value += Math.sin(x * 1.5 + Math.sin(y * .02)) * 18;
    if (kind === 'rock') value += Math.sin(x * .18 + y * .05) * Math.cos(y * .09) * 32;
    const i = (y * n + x) * 4;
    data[i] = data[i+1] = data[i+2] = THREE.MathUtils.clamp(value, 15, 245); data[i+3] = 255;
  }
  const t = new THREE.DataTexture(data,n,n); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(kind==='tile'?3:4,kind==='tile'?3:2); t.magFilter=THREE.LinearFilter; t.minFilter=THREE.LinearMipmapLinearFilter; t.generateMipmaps=true; t.colorSpace=THREE.SRGBColorSpace; t.needsUpdate=true; return t;
}

export function createMaterials() {
  const concreteMap=surfaceTexture(18,'concrete'), metalMap=surfaceTexture(34,'metal'), tileMap=surfaceTexture(14,'tile'), woodMap=surfaceTexture(97,'wood'), rockMap=surfaceTexture(144,'rock');
  const standard = (color, extra={}) => new THREE.MeshStandardMaterial({ color, roughness:.84, ...extra });
  return {
    concrete: standard(0x9a9583,{map:concreteMap,bumpMap:concreteMap,bumpScale:.075}),
    pale: standard(0xb4b19e,{map:concreteMap,bumpMap:concreteMap,bumpScale:.025}),
    darkConcrete: standard(0x585c54,{map:concreteMap,bumpMap:concreteMap,bumpScale:.05}),
    floor: standard(0x777f70,{map:concreteMap,roughness:.88}),
    tile: standard(0x8c9788,{map:tileMap,bumpMap:tileMap,bumpScale:.025}),
    green: standard(0x476050,{map:metalMap,metalness:.32}),
    metal: standard(0x4d5956,{map:metalMap,metalness:.7,roughness:.46}),
    darkMetal: standard(0x262f2b,{map:metalMap,metalness:.65,roughness:.64}),
    rust: standard(0x806046,{map:metalMap,metalness:.55,roughness:.74}),
    brass: standard(0xb49a5f,{metalness:.68,roughness:.36}),
    yellow: standard(0xb99b51,{map:metalMap,metalness:.3}),
    red: standard(0x823f2e,{metalness:.18}),
    blue: standard(0x4e717b,{map:metalMap}),
    white: standard(0xd0d1bc,{roughness:.8}),
    fabric: standard(0x928d72,{roughness:1}),
    linen: standard(0xb1b6a5,{roughness:1}),
    wood: standard(0x82704b,{map:woodMap,roughness:.8}),
    soil: standard(0x3d3022,{map:rockMap}),
    leaf: standard(0x477646,{side:THREE.DoubleSide,roughness:.95}),
    leafLight: standard(0x7a9352,{side:THREE.DoubleSide,roughness:.95}),
    rock: standard(0x656a64,{map:rockMap,bumpMap:rockMap,bumpScale:.35,roughness:1}),
    lamp: new THREE.MeshBasicMaterial({color:0xf6db9f}),
    coldLamp: new THREE.MeshBasicMaterial({color:0xb9d8d1}),
    indicator: new THREE.MeshBasicMaterial({color:0x85be86}),
    redLamp: new THREE.MeshBasicMaterial({color:0xff7951}),
    screen: new THREE.MeshBasicMaterial({color:0x86a6a0}),
    black: standard(0x0d1513,{roughness:.55}),
    water: standard(0x273f3d,{metalness:.65,roughness:.17,transparent:true,opacity:.88}),
    glass: standard(0x86b9af,{metalness:.12,roughness:.2,transparent:true,opacity:.21,depthWrite:false}),
  };
}

const geometries = new Map();
const cached=(id,fn)=>{ if(!geometries.has(id)) geometries.set(id,fn()); return geometries.get(id); };
const boxGeometry=cached('box',()=>new THREE.BoxGeometry(1,1,1));
const cylinderGeometry=cached('cylinder',()=>new THREE.CylinderGeometry(1,1,1,24));
const sphereGeometry=cached('sphere',()=>new THREE.SphereGeometry(1,16,10));
const leafGeometry=cached('leaf',()=>new THREE.SphereGeometry(1,8,5));
const temp=new THREE.Object3D(), matrix=new THREE.Matrix4();

// A solid arc in XZ, with a top surface, underside and closed ends.
export function arcGeometry(inner,outer,height,start=0,angle=Math.PI*2,segments=96) {
  return cached(`arc:${inner}:${outer}:${height}:${start}:${angle}:${segments}`,()=>{
    const positions=[],uvs=[];
    const quad=(a,b,c,d)=>{for(const p of [a,b,c,a,c,d]){positions.push(...p);uvs.push(p[0]/4,p[2]/4);}};
    const point=(r,a,y)=>[Math.cos(a)*r,y,Math.sin(a)*r];
    for(let i=0;i<segments;i++){
      const a=start+i*angle/segments,b=start+(i+1)*angle/segments;
      const ia=point(inner,a,0),ib=point(inner,b,0),oa=point(outer,a,0),ob=point(outer,b,0),iat=point(inner,a,height),ibt=point(inner,b,height),oat=point(outer,a,height),obt=point(outer,b,height);
      quad(iat,ibt,obt,oat); quad(ia,oa,ob,ib); quad(oa,oat,obt,ob); quad(ia,ib,ibt,iat);
      if(i===0)quad(ia,iat,oat,oa); if(i===segments-1)quad(ib,ob,obt,ibt);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.computeVertexNormals();return g;
  });
}

export class Kit {
  constructor(materials) { this.m=materials; this.parts=[]; }
  mesh(geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
    temp.position.set(x,y,z);temp.rotation.set(rx,ry,rz);temp.scale.set(sx,sy,sz);temp.updateMatrix();
    this.parts.push({geometry,material:typeof material==='string'?this.m[material]:material,matrix:temp.matrix.clone()});return this;
  }
  box(mat,x,y,z,w,h,d,ry=0,rx=0,rz=0){return this.mesh(boxGeometry,mat,x,y,z,w,h,d,rx,ry,rz);}
  cylinder(mat,x,y,z,r,h,rx=0,ry=0,rz=0){return this.mesh(cylinderGeometry,mat,x,y,z,r,h,r,rx,ry,rz);}
  sphere(mat,x,y,z,rx,ry=rx,rz=rx){return this.mesh(sphereGeometry,mat,x,y,z,rx,ry,rz);}
  leaf(mat,x,y,z,sx,sy,sz,rot=0){return this.mesh(leafGeometry,mat,x,y,z,sx,sy,sz,0,rot,.4);}
  arc(mat,inner,outer,height,y,start=0,angle=Math.PI*2,segments=96){return this.mesh(arcGeometry(inner,outer,height,start,angle,segments),mat,0,y,0);}
  beam(mat,a,b,r=.05){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));temp.position.copy(new THREE.Vector3(...a).addScaledVector(v,.5));temp.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());temp.scale.set(r,v.length(),r);temp.updateMatrix();this.parts.push({geometry:cylinderGeometry,material:this.m[mat],matrix:temp.matrix.clone()});return this;}
  torus(mat,x,y,z,r,tube=.06,rx=0,ry=0){return this.mesh(cached(`torus:${r}:${tube}`,()=>new THREE.TorusGeometry(r,tube,6,48)),mat,x,y,z,1,1,1,rx,ry);}
  group(transforms=[new THREE.Matrix4()], merge=false){
    const root=new THREE.Group(),groups=new Map();
    for(const p of this.parts){const key=merge?p.material.uuid:`${p.geometry.uuid}:${p.material.uuid}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
    for(const parts of groups.values()){
      let geometry=parts[0].geometry,mats=parts.map(p=>p.matrix);
      if(merge){const gs=parts.map(p=>{const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone();g.applyMatrix4(p.matrix);return g;});geometry=mergeGeometries(gs);gs.forEach(g=>g.dispose());mats=[new THREE.Matrix4()];}
      const mesh=new THREE.InstancedMesh(geometry,parts[0].material,mats.length*transforms.length);
      let i=0;for(const t of transforms)for(const m of mats){matrix.multiplyMatrices(t,m);mesh.setMatrixAt(i++,matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);
    }
    return root;
  }
}

const textCache=new Map();
export function sign(text,w=3,h=.65,{color='#ddd7b5',background='#2d3e35',font='bold 54px Arial',border=true}={}){
  const key=[text,w,h,color,background,font,border].join('|');
  let material=textCache.get(key);
  if(!material){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.max(32,Math.round(512*h/w));const ctx=canvas.getContext('2d');
    ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);if(border){ctx.strokeStyle='#b7b797';ctx.lineWidth=1.5;ctx.strokeRect(5,5,canvas.width-10,canvas.height-10);}
    ctx.fillStyle=color;ctx.font=font.replace(/(\d+)px/,(_,n)=>`${Number(n)/2}px`);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,canvas.height/2,485);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});textCache.set(key,material);
    if(textCache.size>128){const oldest=textCache.keys().next().value;textCache.delete(oldest);}
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
}
export function addSign(root,text,position,w=3,h=.65,ry=0,options={}){const s=sign(text,w,h,options);s.position.set(...position);s.rotation.y=ry;root.add(s);return s;}

export function fixture(k,x,y,z,length=1.2,vertical=false,cold=false){
  k.box('darkMetal',x,y,z,length+.18,.16,.25);
  if(vertical){k.box(cold?'coldLamp':'lamp',x,y,z,.16,length,.12);}else{k.box(cold?'coldLamp':'lamp',x,y-.085,z,length,.04,.14);}
}
export function railing(k,a,b,y=0){
  for(const h of [.55,1.05])k.beam('metal',[a[0],y+h,a[1]],[b[0],y+h,b[1]],.035);
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(length/1.8));
  for(let i=0;i<=n;i++){const t=i/n;k.cylinder('metal',THREE.MathUtils.lerp(a[0],b[0],t),y+.52,THREE.MathUtils.lerp(a[1],b[1],t),.04,1.04);}
}
export function desk(k,x,z,angle=0){
  k.box('wood',x,.82,z,2,.12,.95,angle);for(const dx of [-.8,.8])for(const dz of [-.32,.32])k.cylinder('darkMetal',x+dx,.38,z+dz,.045,.76);
  k.box('green',x,1.13,z-.15,.65,.49,.43,angle);k.box('screen',x,1.15,z+.073,.5,.3,.012,angle);k.box('darkMetal',x,.91,z+.28,.65,.045,.2,angle);
}
export function chair(k,x,z,rot=0){
  const base=new Kit(k.m);base.box('wood',0,.48,0,.5,.07,.51);base.box('wood',0,.89,-.23,.5,.6,.07);for(const dx of [-.2,.2])for(const dz of [-.2,.2])base.cylinder('metal',dx,.23,dz,.023,.46);
  temp.position.set(x,0,z);temp.rotation.set(0,rot,0);temp.scale.set(1,1,1);temp.updateMatrix();for(const p of base.parts)k.parts.push({...p,matrix:temp.matrix.clone().multiply(p.matrix)});
}
export function table(k,x,z,w=2,d=1){k.box('wood',x,.79,z,w,.09,d);for(const dx of [-w*.4,w*.4])for(const dz of [-d*.35,d*.35])k.cylinder('metal',x+dx,.37,z+dz,.04,.74);}
export function shelf(k,x,z,w=2,h=2.2){for(const dx of [-w/2,w/2])for(const dz of [-.34,.34])k.box('metal',x+dx,h/2,z+dz,.055,h,.055);for(const y of [.15,.8,1.45,2.1])k.box('metal',x,y,z,w,.06,.8);}
export function bed(k,x,z){k.box('metal',x,.29,z,1.05,.12,2.15);k.box('linen',x,.45,z,1,.24,2);k.box('fabric',x,.61,z+.27,1.03,.08,1.32);k.box('white',x,.63,z-.68,.78,.14,.42);for(const dx of [-.45,.45])for(const dz of [-.9,.9])k.box('metal',x+dx,.15,z+dz,.06,.3,.06);}
export function pipe(k,x,z,y=3,length=8,r=.14,mat='rust'){k.cylinder(mat,x,y,z,r,length,Math.PI/2);for(let dz=-length/2;dz<=length/2;dz+=2)k.torus('metal',x,y,z+dz,r+.025,.025);}

export function disposeGroup(group){
  group.traverse(o=>{if(o.isInstancedMesh)o.dispose();else if(o.isMesh&&o.geometry?.type==='PlaneGeometry')o.geometry.dispose();});
  group.removeFromParent();
}
