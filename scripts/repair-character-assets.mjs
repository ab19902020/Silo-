// Rebuilds embedded clips from the same measured-joint solver used in play.
// Textured geometry and the uploaded people's appearance stay intact.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readGLB,encodeGLB,geometryGLTF,accessor } from './glb.mjs';
import { SkeletalMotion,MOTION_CLIPS } from '../dist/src/locomotion.js';

const dir=path.resolve(fileURLToPath(new URL('../dist/assets/characters',import.meta.url)));
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
for(const def of manifest.filter(d=>d.heightMetres)){
  const file=path.join(dir,def.file),revision=process.argv[2],source=revision?execFileSync('git',['show',`${revision}:dist/assets/characters/${def.file}`],{maxBuffer:32*1024*1024}):file,{json,bin}=await readGLB(source);let repaired=0;
  // The first pass assigned outer trouser surfaces below the coat hem to coat
  // joints. Transfer those vertices back to the correct leg with a soft knee.
  for(const mesh of json.meshes)for(const primitive of mesh.primitives){
    if(primitive.attributes.JOINTS_0===undefined||json.asset.extras?.siloRigRevision>=2)continue;
    const positions=accessor(json,bin,primitive.attributes.POSITION),joints=accessor(json,bin,primitive.attributes.JOINTS_0),weights=accessor(json,bin,primitive.attributes.WEIGHTS_0),skin=json.skins[0],names=skin.joints.map(n=>json.nodes[n].name),hem=def.id==='sims'?.39:.33;
    for(let i=0;i<positions.count;i++){
      const y=positions.get(i,1)/def.heightMetres,x=positions.get(i,0),coat=Array.from({length:4},(_,j)=>({j,name:names[joints.get(i,j)],w:weights.get(i,j)})).filter(v=>v.name?.startsWith('Coat')&&v.w>0);
      if(!coat.length||y>hem+.012)continue;
      const t=Math.max(0,Math.min(1,(y-hem+.018)/.03)),retain=t*t*(3-2*t),side=x>=0?'L':'R',knee=Math.max(0,Math.min(1,(y-.235)/.10)),w=new Map();
      for(let j=0;j<4;j++){const name=names[joints.get(i,j)],value=weights.get(i,j);if(name?.startsWith('Coat')){w.set(name,(w.get(name)||0)+value*retain);for(const [part,f] of [['Thigh',knee],['Shin',1-knee]])w.set(part+side,(w.get(part+side)||0)+value*(1-retain)*f);}else w.set(name,(w.get(name)||0)+value);}
      const pairs=[...w].filter(([,v])=>v>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=pairs.reduce((s,p)=>s+p[1],0);
      for(let j=0;j<4;j++){joints.set(i,j,j<pairs.length?names.indexOf(pairs[j][0]):0);weights.set(i,j,j<pairs.length?pairs[j][1]/sum:0);}repaired++;
    }
  }
  const gltf=await geometryGLTF(json,bin),motion=new SkeletalMotion(gltf.scene,def.heightMetres);
  const chunks=[bin];let length=bin.length;json.animations=[];
  function append(values,size,type){
    const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}
    const data=Buffer.from(new Float32Array(values).buffer),view=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:length,byteLength:data.length});chunks.push(data);length+=data.length;
    const index=json.accessors.length,a={bufferView:view,componentType:5126,count:values.length/size,type};if(type==='SCALAR'){a.min=[Math.min(...values)];a.max=[Math.max(...values)];}json.accessors.push(a);return index;
  }
  for(const [name,duration] of Object.entries(MOTION_CLIPS)){
    const frames=Math.ceil(duration*30),times=Array.from({length:frames+1},(_,i)=>i*duration/frames),tracks=Object.fromEntries(Object.keys(motion.bones).map(n=>[n,{q:[],p:[]}])) ;
    for(const t of times){motion.sample(name,t);for(const [n,b] of Object.entries(motion.bones)){tracks[n].q.push(...b.quaternion.toArray());tracks[n].p.push(...b.position.toArray());}}
    const input=append(times,1,'SCALAR'),animation={name,samplers:[],channels:[]};
    for(const [n,track] of Object.entries(tracks))for(const [key,target,type,size] of [['q','rotation','VEC4',4],['p','translation','VEC3',3]]){
      const output=append(track[key],size,type),sampler=animation.samplers.length;animation.samplers.push({input,output,interpolation:'LINEAR'});animation.channels.push({sampler,target:{node:json.nodes.findIndex(x=>x.name===n),path:target}});
    }
    json.animations.push(animation);
  }
  json.buffers[0].byteLength=length;json.asset.extras={...(json.asset.extras||{}),siloRigRevision:2};
  await fs.writeFile(file,encodeGLB(json,Buffer.concat(chunks)));def.clips=Object.keys(MOTION_CLIPS);def.rigRevision=2;def.repairedTrouserVertices=repaired;def.method='Measured-joint two-bone IK, continuous gait, world-space stance locking, terrain-aware feet and corrected coat/trouser weights; procedural motion, not motion capture.';
  console.log(def.id,JSON.stringify({clips:def.clips,correctedVertices:repaired,bytes:(await fs.stat(file)).size}));
}
await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
