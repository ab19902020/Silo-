// How solid is a supplied body?
//
// Written to answer one question that took a long time to answer by looking:
// why do Bernard and Sims render partly see-through when Juliette does not.
// It is not the materials — all three are one OPAQUE mesh with correct indices
// and clean skin weights. The meshes are simply not watertight, and these two
// are three times worse than she is.
//
//   node scripts/mesh-report.mjs                 # the three supplied bodies
//   node scripts/mesh-report.mjs path/to.glb     # anything else
//
// Run it on a new body before wiring it in. An open-edge share near Juliette's
// will look solid; near Bernard's it will need the lining in characters.js,
// which is there precisely because these two do.

import path from 'node:path';
import { readGLB, accessor } from './glb.mjs';

const DEFAULTS=['juliette','sims','bernard']
  .map(id=>new URL(`../dist/assets/characters/${id}.glb`,import.meta.url));

// Weld by position with a neighbouring-cell search rather than a grid snap.
// A plain snap leaves any two points that straddle a cell boundary unmerged,
// however close they are, and then reports their shared edge as a hole.
function weld(position,count,tolerance){
  const cell=tolerance,buckets=new Map(),map=new Int32Array(count),ids=new Map();
  const key=(a,b,c)=>`${a},${b},${c}`;
  const representative=new Int32Array(count).fill(-1);
  for(let v=0;v<count;v++){
    const x=position[v*3],y=position[v*3+1],z=position[v*3+2];
    const i=Math.floor(x/cell),j=Math.floor(y/cell),k=Math.floor(z/cell);
    let found=-1;
    for(let di=-1;di<=1&&found<0;di++)for(let dj=-1;dj<=1&&found<0;dj++)for(let dk=-1;dk<=1&&found<0;dk++){
      for(const u of buckets.get(key(i+di,j+dj,k+dk))||[]){
        const dx=position[u*3]-x,dy=position[u*3+1]-y,dz=position[u*3+2]-z;
        if(dx*dx+dy*dy+dz*dz<=tolerance*tolerance){found=u;break;}
      }
    }
    if(found>=0)representative[v]=representative[found];
    else{representative[v]=v;const k0=key(i,j,k);if(!buckets.has(k0))buckets.set(k0,[]);buckets.get(k0).push(v);}
    const r=representative[v];
    if(!ids.has(r))ids.set(r,ids.size);
    map[v]=ids.get(r);
  }
  return {map,count:ids.size};
}

export function report(json,bin){
  const primitive=json.meshes[0].primitives[0];
  const position=accessor(json,bin,primitive.attributes.POSITION);
  const index=accessor(json,bin,primitive.indices);
  const triangles=index.count/3;
  // Pulled into flat arrays once: the weld below touches every vertex against
  // twenty-seven buckets, and reading each component through the accessor
  // makes that an hour rather than a second.
  const points=new Float32Array(position.count*3);
  for(let v=0;v<position.count;v++)for(let c=0;c<3;c++)points[v*3+c]=position.get(v,c);
  const indices=new Uint32Array(index.count);
  for(let i=0;i<index.count;i++)indices[i]=index.get(i,0);
  const {map,count:welded}=weld(points,position.count,1e-5);

  const edges=new Map();let degenerate=0;
  for(let t=0;t<triangles;t++){
    const a=map[indices[t*3]],b=map[indices[t*3+1]],c=map[indices[t*3+2]];
    if(a===b||b===c||a===c){degenerate++;continue;}
    for(const [u,v] of [[a,b],[b,c],[c,a]]){
      const k=u<v?`${u}_${v}`:`${v}_${u}`;edges.set(k,(edges.get(k)||0)+1);
    }
  }
  let open=0,nonManifold=0;
  for(const n of edges.values()){if(n===1)open++;else if(n>2)nonManifold++;}

  // Skin sanity, because a torn skin looks like a hole and is not one.
  const weights=accessor(json,bin,primitive.attributes.WEIGHTS_0);
  const joints=accessor(json,bin,primitive.attributes.JOINTS_0);
  const jointCount=json.skins?.[0]?.joints.length??0;
  let unweighted=0,outOfRange=0;
  for(let v=0;v<weights.count;v++){
    let sum=0;
    for(let c=0;c<4;c++){sum+=weights.get(v,c);if(joints.get(v,c)>=jointCount)outOfRange++;}
    if(sum<1e-6)unweighted++;
  }
  return {triangles,vertices:position.count,welded,openEdges:open,
    openShare:open/edges.size,nonManifold,degenerate,unweighted,outOfRange,
    indexType:json.accessors[primitive.indices].componentType===5125?'UNSIGNED_INT':'UNSIGNED_SHORT'};
}

const targets=process.argv.slice(2);
const files=targets.length?targets:DEFAULTS;
for(const file of files){
  const {json,bin}=await readGLB(file instanceof URL?file:path.resolve(String(file)));
  const r=report(json,bin);
  const name=path.basename(String(file instanceof URL?file.pathname:file));
  console.log(`\n${name}`);
  console.log(`  ${r.triangles} triangles, ${r.vertices} vertices (${r.welded} welded), ${r.indexType} indices`);
  console.log(`  open edges ${r.openEdges} — ${(r.openShare*100).toFixed(1)}% of the surface is not closed`);
  console.log(`  non-manifold ${r.nonManifold}, degenerate ${r.degenerate}`);
  console.log(`  skin: ${r.unweighted} unweighted vertices, ${r.outOfRange} out-of-range joint references`);
  console.log(`  -> ${r.openShare>.2?'needs the lining: it will read as see-through without it'
    :r.openShare>.05?'some gaps; the lining covers them':'close to watertight'}`);
}
