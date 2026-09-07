// Software-render input for inspecting the real skinned meshes without a browser.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as T from '../dist/vendor/three.module.js';
import { readGLB,geometryGLTF } from './glb.mjs';
const dir=process.argv[2];if(!dir)throw Error('Supply a temporary inspection directory');await fs.mkdir(dir,{recursive:true});
const scenes=[];
for(const id of ['juliette','sims','bernard']){
  const {json,bin}=await readGLB(new URL(`../dist/assets/characters/${id}.glb`,import.meta.url)),gltf=await geometryGLTF(json,bin);let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
  const material=json.materials[json.meshes[0].primitives[0].material],texture=json.textures[material.pbrMetallicRoughness.baseColorTexture.index],im=json.images[texture.source],view=json.bufferViews[im.bufferView];await fs.writeFile(path.join(dir,id+'.jpg'),bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength));
  const index=Uint32Array.from(mesh.geometry.index.array),uv=Float32Array.from(mesh.geometry.attributes.uv.array);await fs.writeFile(path.join(dir,id+'-index.bin'),Buffer.from(index.buffer));await fs.writeFile(path.join(dir,id+'-uv.bin'),Buffer.from(uv.buffer));
  const mixer=new T.AnimationMixer(gltf.scene),v=new T.Vector3();
  for(const [name,phase,label] of [['Idle',0,'Idle'],['Walk',0,'Walk · contact'],['Walk',.25,'Walk · passing'],['Run',.25,'Run']]){
    const clip=gltf.animations.find(c=>c.name===name);mixer.stopAllAction();mixer.clipAction(clip).reset().play();mixer.setTime(clip.duration*phase);gltf.scene.updateMatrixWorld(true);mesh.skeleton.update();const vertices=new Float32Array(mesh.geometry.attributes.position.count*3);
    for(let i=0;i<vertices.length/3;i++){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld);vertices.set(v.toArray(),i*3);}
    const file=`${id}-${scenes.length}.bin`;await fs.writeFile(path.join(dir,file),Buffer.from(vertices.buffer));scenes.push({id,file,label});
  }
}
await fs.writeFile(path.join(dir,'scenes.json'),JSON.stringify(scenes));console.log(dir);
