import {GLTFLoader} from '../vendor/GLTFLoader.js';
const paths={pez:'pez.glb',watch:'watch.glb',georgia:'georgia.glb'},models=new Map();
export async function loadRelicModel(id){
  if(!paths[id])return null;
  if(!models.has(id))models.set(id,new GLTFLoader().loadAsync(new URL(`../assets/relics/${paths[id]}`,import.meta.url).href).then(g=>g.scene));
  try{return (await models.get(id)).clone(true);}catch(error){models.delete(id);throw error;}
}
