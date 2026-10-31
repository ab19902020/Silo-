import * as THREE from '../vendor/three.module.js';

// A resident is about thirty-four thousand triangles — a sculpted body, a face
// with lids and lips, cloth with real thickness — and that is right at arm's
// length. Across a gallery the same person is a few dozen pixels tall, and a
// crowd of them was most of what the GPU spent its frame on.
//
// The distant version is the same mesh with its nearby vertices merged. Every
// vertex is put in a small cell of a grid; within a cell, vertices of the same
// colour that follow the same bone collapse onto one of them, and triangles left
// with fewer than three corners vanish. Nothing new is made: the far mesh is a
// shorter index into the very same vertex buffer, so it costs one small upload,
// it skins and blinks exactly like the near one, and swapping between them
// cannot pop the silhouette by more than a cell.
//
// Colour and bone are both part of the key, or the merge would join a sleeve
// to the hip it hangs beside and tear the cloth whenever the arm swung.

const FAR=new WeakMap();
export const RESIDENT_CELL=.028;

export function buildFarResident(geometry,{cell=RESIDENT_CELL,fine=new Set()}={}){
  const p=geometry.attributes.position,n=geometry.attributes.normal,c=geometry.attributes.color,si=geometry.attributes.skinIndex,sw=geometry.attributes.skinWeight;
  const count=p.count,group=new Int32Array(count),keys=new Map(),sums=[];
  for(let i=0;i<count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    let bone=si.getX(i),weight=sw.getX(i);
    for(let k=1;k<4;k++){const w=sw.getComponent(i,k);if(w>weight){weight=w;bone=si.getComponent(i,k);}}
    const colour=c?((c.getX(i)*24)|0)*625+((c.getY(i)*24)|0)*25+((c.getZ(i)*24)|0):0;
    // Which way the surface faces, to the nearest of six directions. Cloth has
    // an inside and an outside a few millimetres apart, and a jacket lies on a
    // shirt; merging across them pulls the outer layer through the inner one.
    const nx=n.getX(i),ny=n.getY(i),nz=n.getZ(i),ax=Math.abs(nx),ay=Math.abs(ny),az=Math.abs(nz);
    const facing=ax>=ay&&ax>=az?(nx>0?0:1):ay>=az?(ny>0?2:3):(nz>0?4:5);
    // The head keeps a finer grid. A face is where anybody looks first, and at
    // the coarse size the lids, lips and hairline fold into each other.
    const size=fine.has(bone)?cell*.42:cell;
    const key=`${Math.floor(x/size)},${Math.floor(y/size)},${Math.floor(z/size)},${bone},${colour},${facing}`;
    let at=keys.get(key);if(at===undefined){at=sums.length;keys.set(key,at);sums.push([0,0,0,0,-1,Infinity]);}
    const s=sums[at];s[0]+=x;s[1]+=y;s[2]+=z;s[3]++;group[i]=at;
  }
  // Each group collapses onto the member nearest its middle, so no corner moves
  // further than it has to.
  for(let i=0;i<count;i++){
    const s=sums[group[i]],d=(p.getX(i)-s[0]/s[3])**2+(p.getY(i)-s[1]/s[3])**2+(p.getZ(i)-s[2]/s[3])**2;
    if(d<s[5]){s[5]=d;s[4]=i;}
  }
  const map=new Uint32Array(count);for(let i=0;i<count;i++)map[i]=sums[group[i]][4];
  const source=geometry.index.array,kept=[],faces=new Set();
  for(let t=0;t<source.length;t+=3){
    const a=map[source[t]],b=map[source[t+1]],d=map[source[t+2]];
    if(a===b||b===d||a===d)continue;
    const key=a<b?(b<d?`${a},${b},${d}`:a<d?`${a},${d},${b}`:`${d},${a},${b}`):(a<d?`${b},${a},${d}`:b<d?`${b},${d},${a}`:`${d},${b},${a}`);
    if(faces.has(key))continue;faces.add(key);kept.push(a,b,d);
  }
  const far=new THREE.BufferGeometry();
  for(const [name,attribute] of Object.entries(geometry.attributes))far.setAttribute(name,attribute);
  far.morphAttributes=geometry.morphAttributes;far.morphTargetsRelative=geometry.morphTargetsRelative;
  far.setIndex(new THREE.BufferAttribute(count>65535?new Uint32Array(kept):new Uint16Array(kept),1));
  far.boundingBox=geometry.boundingBox;far.boundingSphere=geometry.boundingSphere;
  far.userData.farOf=geometry;far.userData.mergedOnto=map;
  FAR.set(geometry,far);
  return far;
}

// Show an actor at full detail or as its distant version. Residents built as
// one-offs (the player's own character, the cleaning suits) have no distant
// version and stay as they are.
export function setResidentDetail(actor,far){
  if(actor.detailFar===far)return;
  actor.detailFar=far;
  actor.detailMeshes??=(()=>{const list=[];actor.model.traverse(o=>{if(o.isSkinnedMesh&&FAR.has(o.geometry))list.push([o,o.geometry,FAR.get(o.geometry)]);});return list;})();
  for(const [mesh,near,distant] of actor.detailMeshes)mesh.geometry=far?distant:near;
}

// How far away a resident switches to the distant version. It comes back a
// couple of metres closer than it left, so somebody standing at the boundary
// does not flicker between the two.
const REACH={high:18,balanced:13,low:9};
export function updateResidentDetail(actor,distance,quality){
  const reach=REACH[quality]??REACH.balanced;
  setResidentDetail(actor,actor.detailFar?distance>reach-1:distance>reach+1);
}
