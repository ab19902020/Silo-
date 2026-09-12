// Apply the reference palette without resampling or replacing any mesh.
// Safe to run after Blender's authoring script: matching names are stable.
import fs from 'node:fs/promises';
import {readGLB,encodeGLB} from './glb.mjs';
const palettes={pez:{'Faded red sleeve':[.026,.16,.22,1]},georgia:{'Clothbound blue':[.63,.48,.20,1],'Faded cover gold':[.29,.031,.018,1]}};
const path='dist/assets/relics/manifest.json',manifest=JSON.parse(await fs.readFile(path,'utf8'));
for(const [id,palette] of Object.entries(palettes)){
 const file=`dist/assets/relics/${id}.glb`,{json,bin}=await readGLB(file);
 for(const m of json.materials){if(palette[m.name]){m.pbrMetallicRoughness.baseColorFactor=palette[m.name];m.pbrMetallicRoughness.roughnessFactor=.72;}}
 json.extras={...json.extras,paletteRevision:'tv-reference-2026-09-12',note:'Blue PEZ sleeve and ochre/red Georgia cover. Original geometry; not a scan of a screen-used prop.'};
 const raw=encodeGLB(json,bin);await fs.writeFile(file,raw);manifest[id].bytes=raw.length;manifest[id].paletteRevision=json.extras.paletteRevision;
}
await fs.writeFile(path,JSON.stringify(manifest,null,2)+'\n');
