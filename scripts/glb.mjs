import fs from 'node:fs/promises';
import { GLTFLoader } from '../dist/vendor/GLTFLoader.js';

export async function readGLB(path){
  const raw=Buffer.isBuffer(path)?path:await fs.readFile(path),n=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+n));
  if(raw.readUInt32LE(8)!==raw.length)throw Error('Incomplete GLB: '+path);
  return {json,bin:Buffer.from(raw.subarray(28+n))};
}
export function encodeGLB(json,bin){
  let text=JSON.stringify(json);text+=' '.repeat((4-Buffer.byteLength(text)%4)%4);
  const j=Buffer.from(text),b=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]),head=Buffer.alloc(20),bh=Buffer.alloc(8);
  head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(28+j.length+b.length,8);head.writeUInt32LE(j.length,12);head.writeUInt32LE(0x4e4f534a,16);bh.writeUInt32LE(b.length);bh.writeUInt32LE(0x004e4942,4);
  return Buffer.concat([head,j,bh,b]);
}
export async function geometryGLTF(json,bin){
  const j=structuredClone(json);delete j.images;delete j.textures;delete j.materials;
  for(const m of j.meshes)for(const p of m.primitives)delete p.material;
  const raw=encodeGLB(j,bin);return new GLTFLoader().parseAsync(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.length),'');
}
export function accessor(json,bin,index){
  const a=json.accessors[index],v=json.bufferViews[a.bufferView],size={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],bytes={5121:1,5123:2,5125:4,5126:4}[a.componentType],start=(v.byteOffset||0)+(a.byteOffset||0),stride=v.byteStride||size*bytes;
  const read={5121:'readUInt8',5123:'readUInt16LE',5125:'readUInt32LE',5126:'readFloatLE'}[a.componentType],write={5121:'writeUInt8',5123:'writeUInt16LE',5125:'writeUInt32LE',5126:'writeFloatLE'}[a.componentType];
  return {count:a.count,size,get:(i,j)=>bin[read](start+i*stride+j*bytes),set:(i,j,value)=>bin[write](value,start+i*stride+j*bytes)};
}
