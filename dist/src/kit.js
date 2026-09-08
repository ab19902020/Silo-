import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { projectMaterial } from './materials.js';

export function random(seed = 18) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Deterministic, seamless multilayer material maps. Height, roughness and
// normal data are linear; albedo alone uses the sRGB transfer function.
function surfaceTexture(seed, kind) {
  const n=512, rng=random(seed), field=new Float32Array(64*64);
  for(let i=0;i<field.length;i++)field[i]=rng();
  const noise=(x,y,scale)=>{x=x/scale%64;y=y/scale%64;const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const at=(a,b)=>field[(b%64)*64+a%64];return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix,iy),at(ix+1,iy),u),THREE.MathUtils.lerp(at(ix,iy+1),at(ix+1,iy+1),u),v);};
  const height=new Float32Array(n*n),albedo=new Uint8Array(n*n*4),normal=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const fine=rng(),broad=noise(x,y,8),mid=noise(x,y,2),grain=noise(x,y,1);
    let h=.38+broad*.3+mid*.16+fine*.08;
    if(kind==='concrete'){if(y%128<2)h-=.15;if((x+((y/128|0)%2)*256)%512<2)h-=.09;if(fine>.987)h-=.13;}
    if(kind==='tile'&&(x%64<3||y%64<3))h-=.28;
    if(kind==='wood')h=.55+.07*Math.sin(x*.48+noise(x,y,8)*4)+grain*.1;
    if(kind==='cloth')h=.5+.08*Math.sin(x*Math.PI/3)*Math.cos(y*Math.PI/3)+fine*.025;
    if(kind==='metal')h=.65+mid*.025+fine*.02-(x%97===0?.08:0);
    if(kind==='rock')h=.2+broad*.5+mid*.25+grain*.1;
    height[y*n+x]=h;
    const i=(y*n+x)*4,v=THREE.MathUtils.clamp(170+h*78+(fine-.5)*12,30,250),stain=kind==='metal'?Math.max(0,.25-broad)*90:Math.max(0,.3-broad)*42;
    albedo[i]=v;albedo[i+1]=v-stain*.42;albedo[i+2]=v-stain;albedo[i+3]=255;
    const r=kind==='metal'?135+mid*70:205+mid*40;rough[i]=rough[i+1]=rough[i+2]=r;rough[i+3]=255;
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const strength=kind==='rock'?4:kind==='metal'?1.2:2.8,dx=(height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n])*strength,dy=(height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x])*strength,inv=1/Math.hypot(dx,dy,1),i=(y*n+x)*4;
    normal[i]=(-dx*inv*.5+.5)*255;normal[i+1]=(-dy*inv*.5+.5)*255;normal[i+2]=(inv*.5+.5)*255;normal[i+3]=255;
  }
  const texture=(data,color=false)=>{const t=new THREE.DataTexture(data,n,n);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='tile'?3:4,kind==='tile'?3:2);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=8;if(color)t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;};
  const map=texture(albedo,true);map.userData={normal:texture(normal),roughness:texture(rough)};return map;
}

export function createMaterials() {
  const concreteMap=surfaceTexture(18,'concrete'), metalMap=surfaceTexture(34,'metal'), tileMap=surfaceTexture(14,'tile'), woodMap=surfaceTexture(97,'wood'), rockMap=surfaceTexture(144,'rock'),clothMap=surfaceTexture(71,'cloth');
  const terminal=document.createElement('canvas');terminal.width=512;terminal.height=384;const ctx=terminal.getContext('2d');ctx.fillStyle='#07100c';ctx.fillRect(0,0,512,384);ctx.fillStyle='#b0c3a2';ctx.font='19px monospace';
  ['SILO 18 / SYSTEM OPERATIONS','──────────────────────────','STATION 018       LOCAL LINK','', 'GENERATOR     NOMINAL','AIR PRESSURE  101.3 kPa','WATER SUPPLY  CIRCULATING','', 'ARCHIVE  /  RECORDS  /  LOG','', '> AUTHORIZED TERMINAL _'].forEach((line,i)=>ctx.fillText(line,20,32+i*29));
  ctx.fillStyle='#557457';for(let y=0;y<384;y+=3)ctx.fillRect(0,y,512,.28);const terminalMap=new THREE.CanvasTexture(terminal);terminalMap.colorSpace=THREE.SRGBColorSpace;
  const standard = (color, extra={}) => { const map=extra.map;return new THREE.MeshStandardMaterial({ color, roughness:.84, envMapIntensity:.38, ...(map?.userData.normal?{normalMap:map.userData.normal,normalScale:new THREE.Vector2(.48,.48),roughnessMap:map.userData.roughness}:{}),...extra,bumpMap:null }); };
  const materials={
    concrete: standard(0xb6aea0,{map:concreteMap,bumpMap:concreteMap,bumpScale:.075}),
    pale: standard(0xb4b19e,{map:concreteMap,bumpMap:concreteMap,bumpScale:.025}),
    plaster: standard(0xb58d7f,{map:concreteMap,roughness:.94}),
    darkConcrete: standard(0x74756a,{map:concreteMap,bumpMap:concreteMap,bumpScale:.05}),
    floor: standard(0x8b8b7e,{map:concreteMap,roughness:.88}),
    airlockTile: standard(0x94785a,{map:tileMap,roughness:.83}),
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
    fabric: standard(0x777b6b,{map:clothMap,roughness:1}),
    rug: standard(0x6f483e,{map:clothMap,roughness:1}),
    paper: standard(0xc1bda6,{roughness:.95}),
    enamel: standard(0x849281,{map:metalMap,metalness:.22,roughness:.32}),
    ochre: standard(0xa58244,{metalness:.18,roughness:.42}),
    bread: standard(0xc18d50,{map:rockMap,roughness:1}),
    linen: standard(0xb1b6a5,{map:clothMap,roughness:1}),
    wood: standard(0x82704b,{map:woodMap,roughness:.8}),
    soil: standard(0x3d3022,{map:rockMap}),
    leaf: standard(0x477646,{side:THREE.DoubleSide,roughness:.95}),
    leafLight: standard(0x7a9352,{side:THREE.DoubleSide,roughness:.95}),
    rock: standard(0x656a64,{map:rockMap,bumpMap:rockMap,bumpScale:.35,roughness:1}),
    lamp: new THREE.MeshBasicMaterial({color:new THREE.Color(3.1,2.1,1.1),toneMapped:false}),
    coldLamp: new THREE.MeshBasicMaterial({color:new THREE.Color(1.6,2.6,2.5),toneMapped:false}),
    indicator: new THREE.MeshBasicMaterial({color:0x85be86}),
    redLamp: new THREE.MeshBasicMaterial({color:0xff7951}),
    screen: standard(0xffffff,{map:terminalMap,emissive:0xd2dfc4,emissiveMap:terminalMap,emissiveIntensity:.8,roughness:.28}),
    black: standard(0x0d1513,{roughness:.55}),
    water: standard(0x273f3d,{metalness:.22,roughness:.46,transparent:true,opacity:.76,depthWrite:false,side:THREE.DoubleSide}),
    glass: standard(0x86b9af,{metalness:.12,roughness:.2,transparent:true,opacity:.21,depthWrite:false}),
  };
  for(const name of ['wood','fabric','linen','rug'])projectMaterial(materials[name],name==='wood'?.7:.42);
  return materials;
}

const geometries = new Map();
const cached=(id,fn)=>{ if(!geometries.has(id)) geometries.set(id,fn()); return geometries.get(id); };
const boxGeometry=cached('box',()=>new THREE.BoxGeometry(1,1,1));
const cylinderGeometry=cached('cylinder',()=>new THREE.CylinderGeometry(1,1,1,24));
const bevelGeometry=cached('bevel',()=>{const g=new THREE.BoxGeometry(1,1,1,4,4,4),p=g.attributes.position;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),q=v.clone().clampScalar(-.445,.445),d=v.sub(q).normalize().multiplyScalar(.055);q.add(d);p.setXYZ(i,q.x,q.y,q.z);}g.computeVertexNormals();return g;});
const sphereGeometry=cached('sphere',()=>new THREE.SphereGeometry(1,16,10));
const leafGeometry=cached('leaf',()=>{const g=new THREE.PlaneGeometry(2,2,4,10),p=g.attributes.position;for(let i=0;i<p.count;i++){const t=(p.getY(i)+1)/2,edge=Math.pow(Math.max(0,Math.sin(t*Math.PI)),.7);p.setXYZ(i,p.getX(i)*edge,.18*Math.sin(t*Math.PI)-.08*Math.abs(p.getX(i))*edge,p.getY(i));}g.computeVertexNormals();return g;});
const temp=new THREE.Object3D(), matrix=new THREE.Matrix4();

function roundedPath(path,x,y,w,h,r){
  path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);
  path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);
  path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);return path;
}
export function portalGeometry(w,h,depth=.25,r=.3,trim=.16){
  return cached(`portal:${w}:${h}:${depth}:${r}:${trim}`,()=>{
    const shape=roundedPath(new THREE.Shape(),-w/2-trim,-trim,w+trim*2,h+trim*2,r+trim);
    shape.holes.push(roundedPath(new THREE.Path(),-w/2,0,w,h,r));
    const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:2,curveSegments:8});g.translate(0,0,-depth/2);return g;
  });
}

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
  bevel(mat,x,y,z,w,h,d,ry=0){return this.mesh(bevelGeometry,mat,x,y,z,w,h,d,0,ry,0);}
  portal(mat,x,y,z,w,h,depth=.25,ry=0,r=.3,trim=.16){return this.mesh(portalGeometry(w,h,depth,r,trim),mat,x,y,z,1,1,1,0,ry);}
  slab(mat,x,y,z,w,d,h=.3,r=.3){
    const g=cached(`slab:${w}:${d}:${h}:${r}`,()=>{const shape=roundedPath(new THREE.Shape(),-w/2,-d/2,w,d,r);const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:2,curveSegments:8});g.rotateX(-Math.PI/2);g.translate(0,-h/2,0);return g;});
    return this.mesh(g,mat,x,y,z);
  }
  cylinder(mat,x,y,z,r,h,rx=0,ry=0,rz=0){return this.mesh(cylinderGeometry,mat,x,y,z,r,h,r,rx,ry,rz);}
  lathe(mat,x,y,z,points,scale=1){return this.mesh(cached('lathe:'+JSON.stringify(points),()=>new THREE.LatheGeometry(points.map(p=>new THREE.Vector2(...p)),24)),mat,x,y,z,scale,scale,scale);}
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
      let i=0;for(const t of transforms)for(const m of mats){matrix.multiplyMatrices(t,m);mesh.setMatrixAt(i++,matrix);}mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();if(merge)mesh.userData.ownedGeometry=true;root.add(mesh);
    }
    return root;
  }
}

const textCache=new Map();
// Signs are physical objects in the silo, not decals. Every one is a printed
// face on a shallow steel plate with a returned edge, so it catches the
// gallery lighting, reads as mounted from an angle, and never vanishes when
// seen edge-on the way a bare plane does. SIGN_DEPTH is the plate thickness:
// mount a sign at SIGN_DEPTH/2 proud of its host surface and the plate backs
// flat onto it. The face is unlit-bright enough to stay legible in the dark
// levels but the plate itself shades with the room.
export const SIGN_DEPTH=.05;
const plateMaterial=new THREE.MeshStandardMaterial({color:0x23282a,roughness:.62,metalness:.42});
const frameMaterial=new THREE.MeshStandardMaterial({color:0x3b423d,roughness:.5,metalness:.55});
export function sign(text,w=3,h=.65,{color='#ddd7b5',background='#2d3e35',font='bold 54px Arial',border=true,glow=.34}={}){
  const key=[text,w,h,color,background,font,border,glow].join('|');
  let material=textCache.get(key);
  if(!material){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=Math.max(32,Math.round(512*h/w));const ctx=canvas.getContext('2d');
    ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);if(border){ctx.strokeStyle='#b7b797';ctx.lineWidth=1.5;ctx.strokeRect(5,5,canvas.width-10,canvas.height-10);}
    ctx.fillStyle=color;ctx.font=font.replace(/(\d+)px/,(_,n)=>`${Number(n)/2}px`);ctx.textAlign='center';ctx.textBaseline='middle';const lines=text.split('\n');lines.forEach((line,i)=>ctx.fillText(line,256,canvas.height*(.5+(i-(lines.length-1)/2)*.16),485));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    material=new THREE.MeshStandardMaterial({map:texture,emissive:0xffffff,emissiveMap:texture,emissiveIntensity:glow,roughness:.58,metalness:.05});
    material.userData.signRefs=0;material.userData.signCached=true;textCache.set(key,material);
    if(textCache.size>128){const oldest=textCache.keys().next().value,oldMaterial=textCache.get(oldest);textCache.delete(oldest);oldMaterial.userData.signCached=false;if(!oldMaterial.userData.signRefs){oldMaterial.map.dispose();oldMaterial.dispose();}}
  }
  const group=new THREE.Group();
  const plate=new THREE.Mesh(new THREE.BoxGeometry(w+.055,h+.055,SIGN_DEPTH),plateMaterial);
  plate.userData.ownedGeometry=true;plate.castShadow=true;plate.receiveShadow=true;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);face.position.z=SIGN_DEPTH/2+.004;
  group.add(plate,face);
  // Two mounting bolts read at close range and settle the sign onto its wall.
  if(w>1.2){
    const bolt=new THREE.SphereGeometry(.022,6,4);
    for(const side of [-1,1]){const b=new THREE.Mesh(bolt,frameMaterial);b.position.set(side*(w/2-.055),0,SIGN_DEPTH/2+.012);b.userData.ownedGeometry=side<0;group.add(b);}
  }
  material.userData.signRefs++;face._signMaterial=material;return group;
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
  k.bevel('wood',x,.82,z,2,.12,.95,angle);for(const dx of [-.8,.8])for(const dz of [-.32,.32])k.cylinder('darkMetal',x+dx,.38,z+dz,.045,.76);
  k.bevel('enamel',x,1.16,z-.15,.79,.59,.54,angle);k.bevel('darkMetal',x,1.19,z+.129,.66,.46,.04,angle);k.bevel('screen',x,1.19,z+.158,.59,.38,.015,angle);
  k.bevel('enamel',x,.91,z+.32,.77,.065,.27,angle);
  for(let row=0;row<4;row++)for(let col=0;col<11;col++)k.bevel('darkMetal',x-.31+col*.06,.952,z+.235+row*.05,.045,.012,.034,angle);
  for(const dx of [-.33,.33]){k.cylinder('brass',x+dx,.94,z-.35,.04,.09);}
  for(let j=0;j<8;j++)k.box('black',x-.30+j*.085,1.465,z-.18,.035,.008,.24,angle);
}
export function chair(k,x,z,rot=0){
  const base=new Kit(k.m);base.bevel('wood',0,.48,0,.5,.07,.51);base.bevel('wood',0,.89,-.23,.5,.6,.055);for(const dx of [-.2,.2]){base.beam('metal',[dx,.05,.24],[dx,.45,.19],.024);base.beam('metal',[dx,.05,-.25],[dx,1.08,-.21],.024);base.beam('metal',[dx,.22,-.23],[dx,.22,.22],.016);for(const y of [.7,1.08])base.cylinder('brass',dx,y,-.273,.019,.02,Math.PI/2);}
  temp.position.set(x,0,z);temp.rotation.set(0,rot,0);temp.scale.set(1,1,1);temp.updateMatrix();for(const p of base.parts)k.parts.push({...p,matrix:temp.matrix.clone().multiply(p.matrix)});
}
export function table(k,x,z,w=2,d=1){k.bevel('wood',x,.79,z,w,.09,d);for(const dz of [-d*.2,d*.2])k.box('darkMetal',x,.837,z+dz,w-.08,.007,.008);for(const dx of [-w*.4,w*.4]){for(const dz of [-d*.35,d*.35])k.beam('metal',[x+dx*.94,.04,z+dz*1.2],[x+dx,.75,z+dz],.028);k.beam('metal',[x+dx,.69,z-d*.35],[x+dx,.69,z+d*.35],.025);}k.beam('metal',[x-w*.4,.59,z],[x+w*.4,.59,z],.024);}
export function shelf(k,x,z,w=2,h=2.2){for(const dx of [-w/2,w/2])for(const dz of [-.34,.34])k.box('metal',x+dx,h/2,z+dz,.055,h,.055);for(const y of [.15,.8,1.45,2.1])k.box('metal',x,y,z,w,.06,.8);}
export function bed(k,x,z){k.box('metal',x,.29,z,1.05,.12,2.15);k.bevel('linen',x,.45,z,1,.24,2);k.box('fabric',x,.61,z+.27,1.03,.08,1.32);k.bevel('white',x,.63,z-.68,.78,.14,.42);for(const dx of [-.45,.45])for(const dz of [-.9,.9])k.box('metal',x+dx,.15,z+dz,.06,.3,.06);}
export function pipe(k,x,z,y=3,length=8,r=.14,mat='rust'){k.cylinder(mat,x,y,z,r,length,Math.PI/2);for(let dz=-length/2;dz<=length/2;dz+=2)k.torus('metal',x,y,z+dz,r+.025,.025);}

export function disposeGroup(group){
  group.traverse(o=>{if(o._signMaterial){const m=o._signMaterial;m.userData.signRefs--;if(!m.userData.signRefs&&!m.userData.signCached){m.map.dispose();m.dispose();}}if(o.userData.ownedGeometry)o.geometry?.dispose();if(o.userData.ownedMaterial)o.material?.dispose();if(o.isInstancedMesh){o.dispose();}else if(o.isMesh&&o.geometry?.type==='PlaneGeometry')o.geometry.dispose();});
  group.removeFromParent();
}
