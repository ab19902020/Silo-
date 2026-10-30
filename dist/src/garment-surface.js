import * as T from '../vendor/three.module.js';

// Project clothing onto the actual bind surface and inherit the supporting
// triangle's skin weights. Spatial bins keep fitting a resident inexpensive.
export class GarmentSurface{
 constructor(geometry,bindingForVertex,{excludedBones=[]}={}){
  this.g=geometry;this.bindings=Array.from({length:geometry.attributes.position.count},(_,i)=>bindingForVertex(i));this.bins={x:new Map(),z:new Map()};this.cell=.025;
  const p=geometry.attributes.position,idx=geometry.index.array,excluded=new Set(excludedBones);
  const supported=this.bindings.map(([a,b,w])=>(excluded.has(a)?w:0)+(excluded.has(b)?1-w:0)<.10);
  for(let i=0;i<idx.length;i+=3)for(const axis of ['x','z']){
   // An arm alongside the waist must never become the support for a belt.
   if(!supported[idx[i]]||!supported[idx[i+1]]||!supported[idx[i+2]])continue;
   const horizontal=axis==='z'?0:2,coords=[idx[i],idx[i+1],idx[i+2]].map(j=>[p.array[j*3+horizontal],p.getY(j)]);
   const lo=[0,1].map(k=>Math.floor(Math.min(...coords.map(v=>v[k]))/this.cell)),hi=[0,1].map(k=>Math.floor(Math.max(...coords.map(v=>v[k]))/this.cell));
   for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++){const key=x+','+y;if(!this.bins[axis].has(key))this.bins[axis].set(key,[]);this.bins[axis].get(key).push(i);}
  }
 }
 sample(x,y,z=1,axis='z'){
  const side=Math.sign(axis==='z'?z:x)||1,origin=new T.Vector3(x,y,z),direction=new T.Vector3(axis==='x'?-side:0,0,axis==='z'?-side:0);
  if(axis==='radial'){direction.set(-x,0,-z).normalize();origin.set(x,y,z);}else origin[axis]=side*1;const ray=new T.Ray(origin,direction),p=this.g.attributes.position,n=this.g.attributes.normal,idx=this.g.index.array;
  const row=Math.floor(y/this.cell),key=Math.floor((axis==='z'?x:z)/this.cell)+','+row;
  const candidates=axis==='radial'?[...new Set(Array.from({length:41},(_,i)=>this.bins.z.get((i-20)+','+row)||[]).flat())]:this.bins[axis].get(key)||[];
  let nearest=Infinity,hit=null;const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),point=new T.Vector3();
  for(const i of candidates){a.fromBufferAttribute(p,idx[i]);b.fromBufferAttribute(p,idx[i+1]);c.fromBufferAttribute(p,idx[i+2]);if(!ray.intersectTriangle(a,b,c,false,point))continue;const distance=point.distanceToSquared(origin);if(distance>=nearest)continue;
   nearest=distance;const bary=T.Triangle.getBarycoord(point,a,b,c,new T.Vector3()),normal=new T.Vector3(),weights=new Map();
   for(let j=0;j<3;j++){const vertex=idx[i+j],f=bary.getComponent(j),bind=this.bindings[vertex];normal.addScaledVector(new T.Vector3().fromBufferAttribute(n,vertex),f);for(const [bone,w] of [[bind[0],bind[2]],[bind[1],1-bind[2]]])weights.set(bone,(weights.get(bone)||0)+f*w);}
   const pairs=[...weights].filter(([,w])=>w>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4),total=pairs.reduce((s,[,w])=>s+w,0);
   normal.normalize();if(normal.dot(direction)>0)normal.negate();hit={point:point.clone(),normal,triangle:[idx[i],idx[i+1],idx[i+2]],bary:bary.toArray(),indices:Array.from({length:4},(_,i)=>pairs[i]?.[0]||0),weights:Array.from({length:4},(_,i)=>(pairs[i]?.[1]||0)/total)};
  }
  return hit;
 }
 fit(geometry,{offset=.0018,axis='z',side=1,smooth=false}={}){
  const p=geometry.attributes.position,indices=[],weights=[],supports=[],normals=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),sample=this.sample(axis==='x'?side:x,y,axis==='z'?side:z,axis);
   if(!sample)throw Error(`Garment has no body support at ${x.toFixed(3)}, ${y.toFixed(3)}, ${z.toFixed(3)}`);
   if(smooth)normals.push(...sample.normal.toArray());
   if(this.capture)supports.push({triangle:sample.triangle,bary:sample.bary});
   const relief=axis==='z'?z:x,point=sample.point.addScaledVector(sample.normal,offset+relief*side);p.setXYZ(i,point.x,point.y,point.z);indices.push(...sample.indices);weights.push(...sample.weights);
  }
  if(this.capture)geometry.userData.supports=supports;
  geometry.setAttribute('attachmentSkinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('attachmentSkinWeight',new T.Float32BufferAttribute(weights,4));if(smooth)geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));else geometry.computeVertexNormals();return geometry;
 }
}
