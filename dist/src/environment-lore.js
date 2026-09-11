import * as THREE from '../vendor/three.module.js';

export const LORE={
  memorial:{id:'lore-memorial',name:'Names under the paint',role:'Lower service passage · hand-written marks',greeting:'Some names are scratched into concrete. Others have been painted over and written again. A newer hand has added a small line beneath them.',topics:[
    {id:'read',label:'Read the newer writing.',reply:'“We carried the shift after you. We kept your place.” Beneath it: Mara, Eli, Tomas, Nell. These names are not on the warning plate.'},
    {id:'trace',label:'Look beside the warning plate.',reply:'A curved scrape crosses the dust near the plate’s lower corner. Someone has moved it before. The writing continues behind its edge.'},
    {id:'remember',label:'Look at the oldest layer.',reply:'You cannot make out the dates. Different hands have left the same tally: people counted, rather than parts or hours. The wall has become a quiet memorial.'}]},
  stars:{id:'lore-stars',name:'A sky observation sheet',role:'IT · personal working notes',greeting:'Small pencil crosses track points of light across a ruled sheet. The times are carefully recorded; the explanation is unfinished.',topics:[
    {id:'pattern',label:'Compare the rows.',reply:'Some lights return in a pattern. A circle in the margin has been erased and redrawn. This is someone observing, not copying an approved diagram.'},
    {id:'owner',label:'Read the initials.',reply:'L.K. A cafeteria seat number is written beneath them. Perhaps the person watching the screen can tell you more.'}]},
  tape:{id:'lore-tape',name:'Two strips of heat tape',role:'Mechanical · repair bench',greeting:'Two salvaged strips are fixed to a metal test plate. One has lifted at the corner; the other still holds against the heat-stained surface.',topics:[
    {id:'test',label:'Examine the repair notes.',reply:'The strips are marked SUPPLY and IT. Someone has recorded the temperature at which each adhesive begins to lift. A small difference in materials can become a very large difference in use.'},
    {id:'walker',label:'Read the note beneath.',reply:'“Keep both samples. Do not substitute without testing.” The note is in a repairer’s hand, not an official stamp.'}]},
};

// Chalk lives on the wall surface, without a metal sign backing or glow.
// The names/wording are original game memorials, not claimed show inscriptions.
export function wallWriting(text,width=2.3,height=1.7){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=Math.round(768*height/width);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#b6ac96';ctx.textAlign='left';ctx.textBaseline='middle';
  const lines=text.split('\n'),gap=canvas.height/(lines.length+1);ctx.font=`${Math.floor(gap*.48)}px Georgia`;
  lines.forEach((line,i)=>{ctx.globalAlpha=.42+(i%3)*.13;ctx.fillText(line,27+(i%2)*19,gap*(i+1),710);});
  // Missing flecks and rubbed chalk interrupt otherwise perfect font edges.
  ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=.5;
  for(let i=0;i<1600;i++)ctx.fillRect((i*137.3)%768,(i*79.7)%canvas.height,1+(i%3),1);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);mesh.name='resident-wall-writing';mesh.userData.ownedMaterial=true;mesh.userData.ownedGeometry=true;
  material.addEventListener('dispose',()=>texture.dispose());return mesh;
}
