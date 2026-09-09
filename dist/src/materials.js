import * as THREE from '../vendor/three.module.js';

// Meter-scaled projection prevents a 24 m wall stretching one tiny UV square.
// The same projected UV drives color, roughness and tangent-space normals.
export function projectMaterial(material,metres=1.8){
  material.userData.metreRepeat=metres;
  material.onBeforeCompile=shader=>{
    shader.uniforms.siloMetres={value:metres};
    shader.vertexShader='uniform float siloMetres; varying vec3 siloSurfacePoint; varying vec3 siloSurfaceNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
      vec4 siloP = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        siloP = instanceMatrix * siloP;
      #endif
      siloP = modelMatrix * siloP;
      vec3 siloN = abs(inverseTransformDirection(transformedNormal, viewMatrix));
      siloSurfacePoint=siloP.xyz;siloSurfaceNormal=siloN;
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
    shader.fragmentShader='varying vec3 siloSurfacePoint; varying vec3 siloSurfaceNormal;\n'+shader.fragmentShader;
    if(material.userData.bareSteel){
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float steelLuma=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(steelLuma),.94)*1.35;
      `);
    }
    if(material.userData.voidStrata){
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float layers=.5+.5*sin(siloSurfacePoint.y*1.8+sin(siloSurfacePoint.x*.14+siloSurfacePoint.z*.09));
        float seep=exp(-max(0.,siloSurfacePoint.y-5.)*.29);
        diffuseColor.rgb*=mix(vec3(.92,.95,.94),vec3(.60,.72,.69),seep)*(.91+.09*layers);
      `);
    }
    if(material.userData.patina){
      shader.uniforms.siloPatina={value:material.userData.patina};
      shader.fragmentShader='uniform float siloPatina;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
        float wall=1.-smoothstep(.45,.85,normalize(siloSurfaceNormal).y);
        float foot=exp(-mod(siloSurfacePoint.y+1000.,10.)*2.2);
        float damp=.5+.5*sin(siloSurfacePoint.x*.31+siloSurfacePoint.z*.47+sin(siloSurfacePoint.y*.35));
        diffuseColor.rgb*=1.-siloPatina*wall*(foot*.55+damp*.25);
      `);
    }
  };
  material.customProgramCacheKey=()=>`silo-metre-surface-v3:${metres}:${material.userData.patina||0}:${!!material.userData.bareSteel}:${!!material.userData.voidStrata}`;
  material.needsUpdate=true;return material;
}

export const SURFACE_SETS=[
  {id:'concrete_wall_009',metres:1.805,materials:{concrete:0xc4c2b8,pale:0xd6d4c9,plaster:0xb58d7f,darkConcrete:0x9d9e98,floor:0xa4a6a0}},
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
      mat.roughness=['metal','darkMetal'].includes(name)?.73:['green','blue','yellow'].includes(name)?.78:name==='rust'?.88:.95;
      mat.userData.bareSteel=['metal','darkMetal'].includes(name);if(mat.userData.bareSteel){mat.metalness=.72;mat.normalScale.set(.20,.20);}
      mat.userData.patina=['concrete','darkConcrete','plaster','pale'].includes(name)?.32:0;
      mat.envMapIntensity=mat.userData.bareSteel?1.05:.72;projectMaterial(mat,set.metres);
    }
  }));
  return results.filter(r=>r.status==='rejected').length;
}
