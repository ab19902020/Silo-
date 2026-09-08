import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from '../dist/vendor/three.module.js';
import { RESIDENT_CAST } from '../dist/src/resident-data.js';
import { createResident, poseResident } from '../dist/src/resident-model.js';
import { encodeGLB } from './glb.mjs';

// Standalone glTF 2.0 derivatives. The browser builds the same source geometry
// on demand, avoiding a second large model download on mobile connections.
export function residentGLB(definition,suit=false){
  const actor=createResident(definition,{suit}),model=actor.model,bones=[];let mesh;
  model.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)mesh=o;});
  const chunks=[],views=[],accessors=[];let size=0;
  const append=(array,type,componentType,{min,max}={})=>{
    const padding=(4-size%4)%4;if(padding){chunks.push(Buffer.alloc(padding));size+=padding;}
    const bytes=Buffer.from(array.buffer,array.byteOffset,array.byteLength),view=views.length;views.push({buffer:0,byteOffset:size,byteLength:bytes.length});chunks.push(bytes);size+=bytes.length;
    const width={SCALAR:1,VEC3:3,VEC4:4,MAT4:16}[type],index=accessors.length;accessors.push({bufferView:view,componentType,count:array.length/width,type,...(min?{min,max}:{})});return index;
  };
  const g=mesh.geometry;g.computeBoundingBox();const attributes={};
  for(const [name,key,type,component] of [['position','POSITION','VEC3',5126],['normal','NORMAL','VEC3',5126],['color','COLOR_0','VEC3',5126],['skinIndex','JOINTS_0','VEC4',5123],['skinWeight','WEIGHTS_0','VEC4',5126]]){
    attributes[key]=append(g.attributes[name].array,type,component,name==='position'?{min:g.boundingBox.min.toArray(),max:g.boundingBox.max.toArray()}:{});
  }
  const primitives=(g.groups.length?g.groups:[{start:0,count:g.index.count,materialIndex:0}]).map(group=>({attributes,indices:append(new Uint32Array(g.index.array.slice(group.start,group.start+group.count)),'SCALAR',5125),material:group.materialIndex,mode:4}));
  const nodes=[{name:definition.name,children:[1,bones.length+1]}];
  for(const b of bones)nodes.push({name:b.name,translation:b.position.toArray(),rotation:b.quaternion.toArray(),...(b.children.filter(c=>c.isBone).length?{children:b.children.filter(c=>c.isBone).map(c=>bones.indexOf(c)+1)}:{})});
  nodes.push({name:mesh.name,mesh:0,skin:0});
  const inverses=append(new Float32Array(mesh.skeleton.boneInverses.flatMap(m=>m.toArray())),'MAT4',5126);
  const animations=[];
  for(const [name,duration] of [['Idle',3.2],['Walk',1.05],['Run',.72],['Sit',3],['Work',3],['Climb',2]]){
    const frames=Math.ceil(duration*20)+1,times=new Float32Array(frames),tracks=bones.map(()=>({q:[],p:[]}));
    for(let i=0;i<frames;i++){
      const t=duration*i/(frames-1);times[i]=t;
      if(['Idle','Walk','Run'].includes(name))actor.motion.sample(name,t);
      else if(name==='Climb')actor.motion.climb({cycle:t/2,grip:1});
      else poseResident(actor,name==='Sit'?'sit':'work',duration/Math.PI*Math.sin(Math.PI*t/duration)**2);
      bones.forEach((b,j)=>{tracks[j].q.push(...b.quaternion.toArray());tracks[j].p.push(...b.position.toArray());});
    }
    const input=append(times,'SCALAR',5126,{min:[0],max:[duration]}),samplers=[],channels=[];
    for(let j=0;j<bones.length;j++)for(const [key,type,target] of [['q','VEC4','rotation'],['p','VEC3','translation']]){const output=append(new Float32Array(tracks[j][key]),type,5126),sampler=samplers.length;samplers.push({input,output,interpolation:'LINEAR'});channels.push({sampler,target:{node:j+1,path:target}});}
    animations.push({name,samplers,channels});
  }
  const json={asset:{version:'2.0',generator:'Silo 18 resident model source',copyright:'Original game reconstruction; fictional character references belong to their respective owners.'},scene:0,scenes:[{nodes:[0]}],nodes,meshes:[{name:mesh.name,primitives}],skins:[{joints:bones.map((_,i)=>i+1),skeleton:1,inverseBindMatrices:inverses}],materials:[{name:'Aged clothing and skin',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.025,roughnessFactor:.79}},...(suit?[{name:'Removable cleaning helmet',doubleSided:true,pbrMetallicRoughness:{baseColorFactor:[1,1,1,1],metallicFactor:.12,roughnessFactor:.47}}]:[])],animations,accessors,bufferViews:views,buffers:[{byteLength:size}],extras:{character:definition.name,role:definition.role,heightMetres:definition.height,likeness:'Approximate original mesh informed by production stills',suit}};
  actor.motion.neutral();return encodeGLB(json,Buffer.concat(chunks));
}
if(process.argv[1]&&import.meta.url===new URL('file://'+path.resolve(process.argv[1])).href){
  const out=path.resolve(process.argv[2]||'models/cast');await fs.mkdir(out,{recursive:true});const manifest=[];
  for(const d of RESIDENT_CAST)for(const suit of ['holston','allison'].includes(d.id)?[false,true]:[false]){const file=d.id+(suit?'-cleaning-suit':'')+'.glb',data=residentGLB(d,suit);await fs.writeFile(path.join(out,file),data);manifest.push({id:d.id,name:d.name,file,bytes:data.length,suit,height:d.height});}
  await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(`Exported ${manifest.length} rigged GLBs; ${(manifest.reduce((n,d)=>n+d.bytes,0)/1048576).toFixed(2)} MiB.`);
}
