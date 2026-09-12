import * as THREE from '../vendor/three.module.js';
import {Kit} from './kit.js';
export const RELIC_DETAILS={
 pez:[['The duck',.12,0,'A duck head, a hinge and a sliding sleeve. The worn blue plastic belongs to an ordinary sweet dispenser, made dangerous by how old it is.'],['Repair ticket',.1,Math.PI,'The folded repair ticket leads to George’s watch at the Level 100 market and the book at Medical returns on 062.'],['Maker marks',-.25,Math.PI*.65,'Three scratches on the back read 1–4–4. They are a clue added for this investigation.']],
 watch:[['Dial',.9,0,'The minute track, worn bezel and stitched strap were built to be seen close up. The repair counter has kept the watch running.'],['Reverse engraving',.9+Math.PI,0,'A wave and a downward arrow are scratched into the back. George’s clue points below Mechanical, Level 144, behind the warning sign.'],['Crown & lugs',.6,-1.05,'The winding crown sits beside the case; small lugs hold the repaired leather strap.']],
 georgia:[['Front cover',1.0,0,'Amazing Adventures in Georgia: a travel guide for children. A named place beyond the hill, printed as if anyone could visit it.'],['Open to Atlanta',.65,0,'The folded Atlanta page is the evidence Billings needs. Keep the book in your satchel and take it to the sheriff’s station when the service line is sealed.','open-book'],['Spine & pages',.35,-1.05,'The cloth boards protect an uneven block of yellowed pages. A bookmark protrudes where somebody returned to the same page.']],
 harddrive:[['Casing',.65,0,'The supplied Hard Drive 18 model is preserved. Scratches and wear make this an object somebody used, not a symbol on a checklist.'],['Connector',.2,Math.PI,'The connector belongs in George’s machine on Level 068, wing A. Insert the drive, reboot the terminal and search its contents.'],['Reverse',.65+Math.PI,0,'Nothing on the outside explains what was hidden inside. A blank file list is only the first answer.']],
 'heat-tape':[['Foil & adhesive',.85,0,'Look at the separate foil layers and the ragged loose end. A roll from a workshop can look much like an issued roll and behave differently.'],['Cardboard core',.85+Math.PI,0,'The cardboard sleeve is scuffed from being pulled on and off a spindle. This optional roll does not replace the sealed suit.']],
 magnifier:[['The lens',1,0,'A single piece of curved glass held in a brass ring. Close examination is the point of the object—and the reason it could be dangerous.'],['Repaired handle',.3,Math.PI,'The ferrule and repaired wooden handle show it was useful enough to mend.']],
 camcorder:[['Lens & controls',.15,0,'A lens barrel, eyepiece and a small record button. A physical camera, with no image left playing on it.'],['Cassette door',.25,-Math.PI/2,'A side compartment would have held recording tape. The strap is still attached; the battery is gone.'],['Battery contacts',Math.PI,.2,'Two worn contacts and an empty battery shoe. The camera is an optional find, not a powered story device.']],
 'it-key':[['Numbered window',1,0,'A dark red window, marked 18. A small personal object carries the same number as an entire world.'],['Contacts & ring',.6,Math.PI,'The contacts and retaining ring are worn. This unpowered spare stays a keepsake; it cannot bypass the investigation.']],
 'sheriff-badge':[['Worn face',1,0,'The raised rim has been polished by handling. Most of the original shine is gone.'],['Fastening',1+Math.PI,0,'A simple pin on the reverse. Authority still has to be fastened to an ordinary piece of clothing.']],
 crowbar:[['Pry end',.6,0,'The flattened working end fits the marks on the hidden bulkhead and the service-line cover.'],['Shaft',.2,1.3,'A short, forged bar. It is a tool, not another key to collect and forget.']],
 pipekit:[['Split collar',.75,0,'The split collar goes around the line after isolation. The torque handle is used last.'],['Underside',.75+Math.PI,0,'Keep the kit until the telltale settles at zero. The sequence is cover, isolation, collar, torque.']],
};
export function openGeorgiaBook(materials){
 const k=new Kit(materials),root=new THREE.Group();root.name='Georgia — open at Atlanta';
 for(const side of [-1,1]){
  k.bevel('ochre',side*.079,.003,0,.16,.006,.215);
  k.bevel('paper',side*.078,.016,0,.15,.022,.204);
  for(let i=0;i<6;i++)k.box('linen',side*.077,.007+i*.003,0,.15,.0006,.205);
 }
 k.beam('fabric',[0,.012,-.104],[0,.012,.104],.006);
 const page=(title,lines,x)=>{
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=1024;const c=canvas.getContext('2d');
  c.fillStyle='#d6c79a';c.fillRect(0,0,768,1024);c.fillStyle='#922f23';c.font='bold 96px Georgia';c.textAlign='center';c.fillText(title,384,160);
  c.fillStyle='#303c48';c.font='32px Georgia';lines.forEach((line,i)=>c.fillText(line,384,300+i*64));
  c.font='italic 29px Georgia';c.fillText('Amazing Adventures in Georgia',384,944);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  const p=new THREE.Mesh(new THREE.PlaneGeometry(.145,.198),new THREE.MeshStandardMaterial({map,roughness:.88}));p.rotation.x=-Math.PI/2;p.position.set(x,.0271,0);root.add(p);
 };
 page('ATLANTA',['A city in Georgia.','Streets open to the sky.','Buildings above the ground.','','A place with a name.'],.079);
 page('A WORLD',['An old guide for children.','','George folded this page.','Keep it safe.','Let Billings see it.'], -.079);
 k.bevel('red',.13,.028,.083,.017,.001,.044);root.add(k.group());return root;
}
