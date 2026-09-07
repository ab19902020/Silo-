import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import { GLTFLoader } from '../dist/vendor/GLTFLoader.js';
import { CHARACTERS, CharacterCast, roomPoint, forwardYaw } from '../dist/src/characters.js';
import { SiloWorld } from '../dist/src/world.js';
import { CharacterBody } from '../dist/src/physics.js';
import { levelY } from '../dist/src/data.js';
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},strokeRect(){},fillText(){}})})};
async function geometryOnly(id){
  const raw=await fs.readFile(new URL(`../dist/assets/characters/${id}.glb`,import.meta.url));assert.equal(raw.readUInt32LE(8),raw.length,'Complete GLB');const n=raw.readUInt32LE(12),json=JSON.parse(raw.subarray(20,20+n));
  for(const im of json.images||[]){const v=json.bufferViews[im.bufferView];assert.ok(v.byteLength>10000,'Embedded texture is present');}
  const source=structuredClone(json);delete json.images;delete json.textures;delete json.materials;for(const mesh of json.meshes)for(const p of mesh.primitives)delete p.material;
  let text=JSON.stringify(json);text+=' '.repeat((4-text.length%4)%4);const bin=raw.subarray(20+n),head=Buffer.alloc(20);head.writeUInt32LE(0x46546c67);head.writeUInt32LE(2,4);head.writeUInt32LE(20+text.length+bin.length,8);head.writeUInt32LE(text.length,12);head.writeUInt32LE(0x4e4f534a,16);const buf=Buffer.concat([head,Buffer.from(text),bin]);return {gltf:await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength),''),source};
}

test('each supplied human has a normalized skin, relaxed body and working idle/walk/run clips',async()=>{
  for(const def of CHARACTERS){
    const {gltf}=await geometryOnly(def.id);let mesh;gltf.scene.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});assert.ok(mesh,def.id);assert.ok(mesh.skeleton.bones.length>=19);
    const weights=mesh.geometry.attributes.skinWeight;for(let i=0;i<weights.count;i++){const total=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);assert.ok(Math.abs(total-1)<1e-4,`${def.id}: normalized weights`);}
    const mixer=new THREE.AnimationMixer(gltf.scene),p=new THREE.Vector3();
    for(const name of ['Idle','Walk','Run']){
      const clip=gltf.animations.find(c=>c.name===name);assert.ok(clip,`${def.id}: ${name}`);mixer.stopAllAction();mixer.clipAction(clip).reset().play();
      for(let f=0;f<8;f++){
        mixer.setTime(clip.duration*f/8);gltf.scene.updateMatrixWorld(true);mesh.skeleton.update();let floor=Infinity,top=-Infinity;
        for(let i=0;i<mesh.geometry.attributes.position.count;i+=3){mesh.getVertexPosition(i,p).applyMatrix4(mesh.matrixWorld);assert.ok(p.toArray().every(Number.isFinite));floor=Math.min(floor,p.y);top=Math.max(top,p.y);}
        assert.ok(floor>-.045&&floor<.055,`${def.id} ${name} frame ${f}: grounded soles ${floor}`);assert.ok(top>def.height*.85&&top<def.height*1.04,`${def.id}: human scale`);
      }
    }
  }
});

test('cast posts, relic approach, view toggle and forward heading respect the world',()=>{
  const world=new SiloWorld(new THREE.Scene()),cast=new CharacterCast(world.scene,world);
  for(const d of CHARACTERS){world.setLevel(d.level);const p=roomPoint(d.level,d.wing,2.8,5.5);assert.ok(!world.colliders.contains(p.x,p.z,.3,p.y+.02,p.y+d.height),d.name);assert.ok(Math.abs(world.colliders.floorAt(p.x,p.z,.3,p.y+.3)-p.y)<.01);}
  world.setLevel(144);const dest=world.destination('relic');assert.ok(!world.colliders.contains(dest.position.x,dest.position.z,.3,levelY(144)+.02,levelY(144)+1.8),'Relic approach');
  for(const [x,z] of [[0,-1],[0,1],[-1,0],[1,0]]){const forward=new THREE.Vector3(0,0,1).applyAxisAngle(new THREE.Vector3(0,1,0),forwardYaw(x,z));assert.ok(forward.dot(new THREE.Vector3(x,0,z))>.999);}
  const body=new CharacterBody();body.teleport(20.6,levelY(144),0);const camera=new THREE.PerspectiveCamera();cast.thirdPerson=false;cast.setCamera(camera,body,0,0);assert.ok(Math.abs(camera.position.y-body.position.y-body.eyeHeight)<.001);cast.thirdPerson=true;cast.setCamera(camera,body,0,0);assert.ok(camera.position.distanceTo(body.position)>1);
});

test('hard-drive relic is the supplied textured mesh at handheld scale',async()=>{const {gltf,source}=await geometryOnly('hard-drive-relic');gltf.scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());assert.ok(Math.abs(Math.max(size.x,size.y,size.z)-.147)<.003);assert.ok(source.images.length>0);});
