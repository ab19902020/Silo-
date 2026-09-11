import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
import { GLTFLoader } from '../dist/vendor/GLTFLoader.js';
import { CHARACTERS, CharacterCast, actorFrom, roomPoint, forwardYaw } from '../dist/src/characters.js';
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

test('moving coat surfaces remain visible from both faces and avatars remain opaque',async()=>{
  for(const def of CHARACTERS){
    const {gltf}=await geometryOnly(def.id),actor=actorFrom(gltf,def),mesh=actor.meshes[0];actor.motion.sample('Walk',.31);actor.root.position.y=1400;actor.root.updateMatrixWorld(true);mesh.skeleton.update();mesh.computeBoundingSphere();
    assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.transparent,false);assert.ok(mesh.material.depthWrite);
    const index=mesh.geometry.index,ray=new THREE.Raycaster(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();let hits=0;
    for(let i=0;i<index.count&&hits<6;i+=699){
      mesh.getVertexPosition(index.getX(i),a).applyMatrix4(mesh.matrixWorld);mesh.getVertexPosition(index.getX(i+1),b).applyMatrix4(mesh.matrixWorld);mesh.getVertexPosition(index.getX(i+2),c).applyMatrix4(mesh.matrixWorld);
      const center=a.clone().add(b).add(c).multiplyScalar(1/3);if(center.y-1400<def.height*.4||center.y-1400>def.height*.64)continue;
      const normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.length()<1e-7)continue;normal.normalize();
      for(const sign of [-1,1]){ray.set(center.clone().addScaledVector(normal,.004*sign),normal.clone().multiplyScalar(-sign));ray.near=0;ray.far=.008;assert.ok(ray.intersectObject(mesh,false).length,`${def.id}: a coat face disappears from one side`);}
      hits++;
    }
    assert.equal(hits,6);
  }
});

test('every supplied skeleton has finite, human-scale climbing poses',async()=>{
  for(const def of CHARACTERS){const {gltf}=await geometryOnly(def.id),actor=actorFrom(gltf,def),mesh=actor.meshes[0],v=new THREE.Vector3();
    for(let i=0;i<12;i++){
      actor.motion.climb({cycle:i/12,grip:1});actor.root.updateMatrixWorld(true);mesh.skeleton.update();
      for(const b of actor.bones)assert.ok(Number.isFinite(b.quaternion.length())&&Math.abs(b.quaternion.length()-1)<1e-4);
      for(let j=0;j<mesh.geometry.attributes.position.count;j+=91){mesh.getVertexPosition(j,v);assert.ok(v.toArray().every(Number.isFinite));assert.ok(Math.abs(v.x)<.8&&Math.abs(v.z)<.9&&v.y>-.1&&v.y<def.height*1.2,`${def.id}: distorted ladder pose ${v.toArray()}`);}
    }
  }
});

// None of the three supplied bodies is watertight. Per scripts/mesh-report.mjs,
// 52% of Bernard's edges and 47% of Sims' have one triangle on them against 18%
// of Juliette's, and where the surface is missing on both sides of him the room
// shows straight through the man. DoubleSide above catches most of it — a
// missing front face still shows the inside of the back — and the rest is
// backed by drawing the same skinned geometry again just inside the surface.
// Rendered at 900px against a flat backdrop, that took Bernard from 0.64% of
// his torso see-through to 0.05% and Sims from 0.23% to 0.03%.
test('every supplied body is backed, so a gap in the mesh shows cloth and not the room',async()=>{
  for(const def of CHARACTERS){
    const {gltf}=await geometryOnly(def.id),actor=actorFrom(gltf,def);
    const bodies=actor.meshes.filter(m=>m.isSkinnedMesh),linings=[];
    actor.root.traverse(o=>{if(o.isSkinnedMesh&&o.name.endsWith('-lining'))linings.push(o);});
    assert.equal(linings.length,bodies.length,`${def.id}: ${bodies.length} bodies but ${linings.length} linings`);
    for(const lining of linings){
      const outer=bodies.find(m=>`${m.name}-lining`===lining.name);
      assert.ok(outer,`${def.id}: ${lining.name} does not name a body it backs`);
      // Shared, not copied: a second 90,000-triangle buffer per character is
      // not worth paying for, and a copy would drift out of step with the skin.
      assert.equal(lining.geometry,outer.geometry,`${def.id}: the lining copies the geometry`);
      assert.equal(lining.skeleton,outer.skeleton,`${def.id}: the lining is on its own skeleton`);
      assert.equal(lining.material.side,THREE.DoubleSide,`${def.id}: the lining is one-sided`);
      assert.equal(lining.material.transparent,false,`${def.id}: the lining is see-through itself`);
      assert.equal(lining.castShadow,false,`${def.id}: the lining casts a second shadow`);
      assert.equal(lining.frustumCulled,false,`${def.id}: the lining culls away from its body`);
      // The inset has to be applied before the skin deforms the vertex. Offset
      // after skinning it is rotated twice and the lining walks out of the body.
      const shader={uniforms:{},vertexShader:'#include <begin_vertex>\n#include <skinning_vertex>'};
      lining.material.onBeforeCompile(shader);
      const inset=shader.uniforms.uInset?.value;
      assert.ok(inset>.002&&inset<.02,`${def.id}: a ${inset} m inset is outside a garment's thickness`);
      assert.ok(/transformed\s*-=\s*normal\s*\*\s*uInset/.test(shader.vertexShader),`${def.id}: the lining is not inset at all`);
      assert.ok(shader.vertexShader.indexOf('uInset;')<shader.vertexShader.indexOf('skinning_vertex'),
        `${def.id}: the lining is inset after the skin, so it will drift as the body moves`);
    }
  }
});
