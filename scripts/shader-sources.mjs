import fs from 'node:fs';
import path from 'node:path';
import * as T from '../dist/vendor/three.module.js';
import {residentMaterial} from '../dist/src/resident-surface.js';
import {projectMaterial} from '../dist/src/materials.js';
import {VoidWater} from '../dist/src/water.js';
import {Rendering} from '../dist/src/rendering.js';
const counts=['NUM_SPOT_LIGHT_COORDS','NUM_DIR_LIGHTS','NUM_POINT_LIGHTS','NUM_SPOT_LIGHTS','NUM_HEMI_LIGHTS','NUM_RECT_AREA_LIGHTS','NUM_DIR_LIGHT_SHADOWS','NUM_POINT_LIGHT_SHADOWS','NUM_SPOT_LIGHT_SHADOWS','NUM_SPOT_LIGHT_MAPS','NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS','NUM_CLIPPING_PLANES','UNION_CLIPPING_PLANES'];
const expand=s=>s.replace(/#include <(\w+)>/g,(_,n)=>expand(T.ShaderChunk[n]));
const common='#version 300 es\nprecision highp float;precision highp int;\n#define texture2D texture\n#define textureCube texture\n#define texture2DProj textureProj\n#define texture2DLodEXT textureLod\n#define textureCubeLodEXT textureLod\n'+counts.map(n=>`#define ${n} 0`).join('\n')+'\nuniform mat4 viewMatrix;uniform vec3 cameraPosition;uniform bool isOrthographic;\n';
const vp=common+'#define attribute in\n#define varying out\nuniform mat4 modelMatrix,modelViewMatrix,projectionMatrix;uniform mat3 normalMatrix;in vec3 position,normal;in vec2 uv;in vec3 color;in vec4 skinIndex,skinWeight;in mat4 instanceMatrix;\n';
const fp=common+'#define varying in\nout vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\nvec4 linearToOutputTexel(vec4 c){return c;}\n';
const records=[];
function record(name,material,defines='',lib=T.ShaderLib.standard){const shader={uniforms:{},vertexShader:lib.vertexShader,fragmentShader:lib.fragmentShader};material.onBeforeCompile(shader);records.push({name,vertex:vp+defines+expand(shader.vertexShader),fragment:fp+defines+expand(shader.fragmentShader)});}
record('resident',residentMaterial(),'#define USE_SKINNING\n#define USE_COLOR\n');
for(const mode of ['bareSteel','voidStrata','patina']){const m=new T.MeshStandardMaterial();m.userData[mode]=mode==='patina'?.3:true;projectMaterial(m);record(mode,m,'#define USE_INSTANCING\n#define USE_MAP\n#define MAP_UV uv\n#define USE_NORMALMAP\n#define USE_NORMALMAP_TANGENTSPACE\n#define NORMALMAP_UV uv\n#define USE_ROUGHNESSMAP\n#define ROUGHNESSMAP_UV uv\n');}
const water=new VoidWater(new T.Mesh(new T.PlaneGeometry(),new T.MeshStandardMaterial()));record('water',water.material,'#define DOUBLE_SIDED\n');
const renderer=new Rendering({extensions:{has:()=>true}});records.push({name:'composition',vertex:vp+expand(renderer.material.vertexShader),fragment:fp+expand(renderer.material.fragmentShader)});
const output=process.argv[2]||'qa-output/shaders.json';fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(records));
