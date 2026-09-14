import * as THREE from '../../dist/vendor/three.module.js';
import { GLTFLoader } from '../../dist/vendor/GLTFLoader.js';
import { clone } from '../../dist/vendor/SkeletonUtils.js';
import { SILO, levelY } from '../../dist/src/data.js';
import { SkeletalMotion } from '../../dist/src/locomotion.js';
import { RESIDENT_CAST } from '../../dist/src/resident-data.js';
import { createResident } from '../../dist/src/resident-model.js';
import {calibrateAnkles,calibrateArms} from '../../dist/src/rig-calibration.js';
import {gaitStyle} from '../../dist/src/captured-motion.js';
import { assignWorkday, workAt } from '../../dist/src/workday.js';
import { attachWorkProps, showWorkProps } from '../../dist/src/work-props.js';

export {CHARACTERS} from '../../dist/src/characters.js';
export function roomPoint(level,wing,x,z){const a=wing*Math.PI/3;return new THREE.Vector3(Math.cos(a)*(SILO.deckOuter+z)+Math.sin(a)*x,levelY(level),Math.sin(a)*(SILO.deckOuter+z)-Math.cos(a)*x);}
export const forwardYaw=(x,z)=>Math.atan2(x,z); // Supplied bodies face +Z.

// The three supplied bodies are generated shells and none of them is
// watertight. `node scripts/mesh-report.mjs` on the shipped files: 47% of
// Sims' edges and 52% of Bernard's have only one triangle on them, against
// 18% of Juliette's — she is the one that looks right. Most of that is
// invisible —
// a missing front face still shows the inside of the back through it, which
// is what DoubleSide below is for, and it alone takes Bernard from 6.4% of
// his torso see-through to 0.64%. The rest is where the surface is missing on
// both sides and the room shows straight through the man.
//
// There is no repairing 90,000 triangles of that here, so the gaps are backed
// instead of closed: the same skinned geometry is drawn a second time six
// millimetres inside the surface, which puts a garment-coloured layer behind
// every hole. Six millimetres is enough that a hole in the outer shell and
// the matching hole in the lining no longer line up along the view ray, and
// little enough that the lining stays inside a finger. It reads the same
// texture at the same UV, so what shows through a pinhole is the colour that
// should have been there rather than a dark speck.
//
// Measured on a 900px close-up of the torso: Bernard 0.64% -> 0.05% of the
// figure see-through, Sims 0.23% -> 0.03%.
const LINING_INSET=.006;
function liningFor(mesh){
  const source=Array.isArray(mesh.material)?mesh.material[0]:mesh.material;
  // Unlit and map-only: it is never seen except through a pinhole, so it
  // costs one texture fetch rather than a second full shading pass. The grey
  // stands in for being six millimetres inside a garment.
  const material=new THREE.MeshBasicMaterial({map:source.map||null,color:new THREE.Color(.42,.42,.43),side:THREE.DoubleSide});
  material.onBeforeCompile=shader=>{
    shader.uniforms.uInset={value:LINING_INSET};
    // Placed straight after begin_vertex, which is before skinning_vertex, so
    // the inset is applied in bind space and the skin then carries it. Offset
    // after skinning and it would be rotated twice and drift under animation.
    shader.vertexShader='uniform float uInset;\n'+shader.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\n\ttransformed -= normal * uInset;');
  };
  const lining=new THREE.SkinnedMesh(mesh.geometry,material);
  lining.bind(mesh.skeleton,mesh.bindMatrix);
  lining.name=`${mesh.name}-lining`;
  lining.frustumCulled=false;lining.renderOrder=-1;
  lining.castShadow=lining.receiveShadow=false;   // the outer shell already casts it
  return lining;
}

export function actorFrom(gltf,definition){
  const root=new THREE.Group();root.name=definition.id;const model=gltf.scene;root.add(model);const meshes=[],bones=[];
  calibrateAnkles(model,definition.height);calibrateArms(model,definition.height);model.userData.gaitStyle=gaitStyle(definition.id);
  model.traverse(o=>{if(o.isMesh){
    o.castShadow=o.receiveShadow=true;o.frustumCulled=false;
    // The scanned coat hems are thin shells. Culling their reverse faces
    // punches holes through Sims and Bernard as the cloth turns in motion.
    const solid=material=>{const m=material.clone();m.side=THREE.DoubleSide;m.shadowSide=THREE.DoubleSide;m.transparent=false;m.opacity=1;m.alphaTest=0;m.depthTest=true;m.depthWrite=true;if(m.isMeshStandardMaterial){m.roughness=THREE.MathUtils.clamp(m.roughness,.55,.92);m.metalness=Math.min(m.metalness,.12);m.envMapIntensity=.9;}if(m.map)m.map.anisotropy=8;m.needsUpdate=true;return m;};
    o.material=Array.isArray(o.material)?o.material.map(solid):solid(o.material);meshes.push(o);
  }if(o.isBone)bones.push(o);});
  // Added after the walk so the linings are not themselves given linings, and
  // before the feed is cloned so the outside camera shows the same solid body.
  for(const mesh of meshes)if(mesh.isSkinnedMesh)mesh.parent.add(liningFor(mesh));
  if(!meshes.some(o=>o.isSkinnedMesh))throw Error(`${definition.name} is missing its skeleton`);
  for(const name of ['Idle','Walk','Run'])if(!gltf.animations.some(c=>c.name===name))throw Error(`${definition.name}: missing ${name}`);
  const motion=new SkeletalMotion(model,definition.height),feed=clone(root);feed.name=`cleaner-${definition.id}`;const feedBones=[];feed.traverse(o=>{if(o.isBone)feedBones.push(o);});feed.visible=false;
  return {definition,root,model,meshes,bones,feed,feedBones,motion,state:'Idle',heading:0,visualY:null,post:roomPoint(definition.level,definition.wing,2.8,5.5)};
}
