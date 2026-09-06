import * as THREE from '../vendor/three.module.js';

// Meter-scaled projection prevents a 24 m wall stretching one tiny UV square.
// The same projected UV drives color, roughness and tangent-space normals.
export function projectMaterial(material,metres=1.8){
  material.userData.metreRepeat=metres;
  material.onBeforeCompile=shader=>{
    shader.uniforms.siloMetres={value:metres};
    shader.vertexShader='uniform float siloMetres;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 siloP = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        siloP = instanceMatrix * siloP;
      #endif
      siloP = modelMatrix * siloP;
      vec3 siloN = abs(inverseTransformDirection(transformedNormal, viewMatrix));
      vec2 siloUV = siloN.y > max(siloN.x,siloN.z) ? siloP.xz :
        (siloN.x > siloN.z ? siloP.zy : siloP.xy);
      siloUV /= siloMetres;
      #ifdef USE_MAP
        vMapUv = siloUV;
      #endif
      #ifdef USE_NORMALMAP
        vNormalMapUv = siloUV;
      #endif
      #ifdef USE_ROUGHNESSMAP
        vRoughnessMapUv = siloUV;
      #endif
    `);
  };
  material.customProgramCacheKey=()=>`silo-metre-surface-v1:${metres}`;
  material.needsUpdate=true;return material;
}

export const SURFACE_SETS=[
  {id:'concrete_wall_009',metres:1.805,materials:{concrete:0xd4cbb8,pale:0xe6ddca,plaster:0xb58d7f,darkConcrete:0xaaa494,floor:0xb0aca1}},
  {id:'green_metal_rust',metres:1,materials:{green:0xd3c6a4,metal:0xa9b1b0,darkMetal:0x535c58,rust:0xba996c,yellow:0xddba67,blue:0x8dacb3}},
  {id:'brown_floor_tiles',metres:1.7,materials:{airlockTile:0xdfc6a2,tile:0xb8bbae}},
  {id:'rock_boulder_dry',metres:1.8,materials:{rock:0xd0cec0,soil:0x625143}},
];
export async function loadPhotographicMaterials(materials){
  const loader=new THREE.TextureLoader();
  const results=await Promise.allSettled(SURFACE_SETS.map(async set=>{
    const maps=await Promise.all(['albedo','normal-gl','roughness'].map(name=>loader.loadAsync(new URL(`../assets/materials/${set.id}/${name}.jpg`,import.meta.url).href)));
    maps.forEach((t,i)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;t.colorSpace=i===0?THREE.SRGBColorSpace:THREE.NoColorSpace;});
    for(const [name,color] of Object.entries(set.materials)){
      const mat=materials[name];mat.map=maps[0];mat.normalMap=maps[1];mat.roughnessMap=maps[2];mat.normalScale.setScalar(name==='rock'?.9:.6);mat.color.setHex(color);
      mat.roughness=name==='metal'?.65:.94;mat.envMapIntensity=.52;projectMaterial(mat,set.metres);
    }
  }));
  return results.filter(r=>r.status==='rejected').length;
}
