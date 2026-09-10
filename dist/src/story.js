// Event-driven mystery progression. Objects provide leads; the player must
// inspect, operate, search and persuade rather than complete a shopping list.
export const MODES=Object.freeze(['story','explore']);

export const RELICS=Object.freeze([
  {id:'pez',sound:'plastic',name:'A duck-headed PEZ dispenser',eyebrow:'RELIC · UNAUTHORISED',level:26,wing:0,at:[-4.9,1.45,9.6],float:true,
   blurb:'A yellow duck head on a spring. A repair ticket is folded under the spring: “G. Wilkins — watch left at the market, Level 100. Book with the Medical returns, 62.” On the sleeve, three scratches: 1–4–4.',
   source:'Named in the television series. The scratched level clue is reconstructed for this game.'},
  {id:'watch',sound:'metal',name:'George Wilkins’ wristwatch',eyebrow:'RELIC · AUTHORISED',level:100,wing:0,at:[4.6,1.02,9.4],float:true,
   blurb:'Still running. The back is scarred by a crude wave and a downward arrow. It is not decoration: George left a direction: below Mechanical, behind the warning sign in the rear service gallery.',
   source:'George’s authorised watch is established in the television series. The engraved void clue is reconstructed for this game.'},
  {id:'georgia',sound:'book',name:'Amazing Adventures in Georgia',eyebrow:'RELIC · RED',level:62,wing:0,at:[6.9,1.06,17.4],float:true,
   blurb:'A children’s travel guide full of open sky, roads and water. A folded Atlanta page carries George’s pencil marks. It is dangerous evidence—and proof that the world has names.',
   source:'The Georgia travel guide and its importance are established in the television series. The pencil annotations are reconstructed.'},
  {id:'harddrive',sound:'plastic',name:'Hard Drive 18',eyebrow:'RELIC · RED',level:144,wing:1,at:[-5.28,.863,5.48],hideoutAt:[68.5,12.92,6.6],prop:true,needs:'hideout-open',
   blurb:'An old hard drive stamped 18. Nothing on its casing explains what it contains. One connector is polished from use; George expected it to be inserted somewhere.',
   source:'Hard Drive 18 and George’s use of it are established in the television series. Its discovery in the hideout is reconstructed for this game.'},
]);

export const EQUIPMENT=Object.freeze([
  {id:'crowbar',sound:'metal',name:'A maintenance crowbar',eyebrow:'TOOL · MECHANICAL',level:144,wing:0,at:[1.9,.95,11.7],needs:'crowbar',
   blurb:'A short forged bar with a flattened end. The wear marks match the fasteners on the concealed void bulkhead.',source:'A gameplay tool and placement reconstructed for this game.'},
  {id:'pipekit',sound:'metal',name:'A pipe-capping kit',eyebrow:'TOOL · WATER FILTRATION',level:55,wing:0,at:[-6.7,1.15,18.7],needs:'pipe-tools',
   blurb:'A split steel collar, seal compound, torque handle and pressure key. The sizes match the service line drawn in the hidden blueprint.',source:'The kit and its placement are reconstructed for this game; the exact gas-pipe location is not presented as canon.'},
  {id:'suit',sound:'cloth',name:'A sealed outside suit',eyebrow:'SUPPLY · NOT ON THE MANIFEST',level:144,wing:3,at:[5.6,.4,18.5],needs:'escape-kit',
   blurb:'A suit with sound seals and Mechanical heat tape. It was prepared to survive the hill, not to perform a cleaning.',source:'The importance of correctly made heat tape is established in the books and television series; this stored suit is reconstructed.'},
  {id:'shotgun',sound:'metal',name:'Billings’ shotgun',eyebrow:'SHERIFF · ISSUED',level:1,wing:0,at:[1.9,.95,11.7],needs:'billings',
   blurb:'Officer Billings has opened the armoury and placed the shotgun in your hands. It is not permission to clean. It is his decision to believe the evidence.',source:'Billings, the Atlanta book and sheriff’s station are established. This handoff is reconstructed for the game’s finale.'},
]);
export const COLLECTABLES=Object.freeze([...RELICS,...EQUIPMENT]);
const byId=new Map(COLLECTABLES.map(item=>[item.id,item]));

const CHAPTERS=Object.freeze([
  {id:'cleaning',title:'The last cleaning',objective:'Find the directory book in the cafeteria and watch Holston cross the hill.'},
  {id:'clues',title:'Things George left',objective:'A receipt in the directory reads: “George left the little duck at the bar, 026.” Start there.'},
  {id:'void-lead',title:'A mark like water',objective:'The watch points down, toward the water below Mechanical. Find the concealed route to the void.'},
  {id:'crowbar',title:'The blocked way',objective:'The old bulkhead has already moved once. Find a short leverage tool in Mechanical and return.'},
  {id:'hideout',title:'Behind the wall',objective:'Pry open the bulkhead and search George’s hideout. Do not assume the most obvious relic explains itself.'},
  {id:'george-home',title:'Something missing',objective:'The drive came with a folded delivery slip: “G. Wilkins · 068 · A.” Find the machine it belonged to.'},
  {id:'terminal',title:'The ordinary answer',objective:'George’s machine is missing its external storage. Check the cable and the papers he left beside it.'},
  {id:'pipe-tools',title:'The service line',objective:'The hidden schematic identifies a service gas line. Collect the capping kit from Water Filtration on Level 055.'},
  {id:'pipe',title:'Under pressure',objective:'Follow the red line beyond the mine drill into the pressure gallery. Open the cover, isolate, seat the collar, then torque it.'},
  {id:'billings',title:'A page called Atlanta',objective:'Take the Georgia book to Officer Billings in the Level 001 sheriff’s station. Give him a reason to help.'},
  {id:'escape-kit',title:'Not a cleaning',objective:'Billings has granted the shotgun. Collect the sealed suit from Supply on Level 144, then return to the airlock.'},
  {id:'airlock',title:'First sunlight',objective:'Cycle the airlock and leave Silo 18. You are escaping—not cleaning.'},
  {id:'drone',title:'The thing over the ridge',objective:'Hold the shotgun on the drone, let it close, and fire twice.'},
  {id:'free',title:'Fifty-one doors',objective:'The ridge is open. Explore the exterior network and enter the flooded remains of Silo 17.'},
]);
const indexOf=id=>CHAPTERS.findIndex(chapter=>chapter.id===id);
const SEALS={george:{types:['residential'],levels:[68],label:'Wilkins residence',reason:'The lock is intact. George’s watch has a maker number that may fit the old resident register.'},supply:{types:['supply'],levels:[144],label:'Supply, Level 144',reason:'Supply will not release an outside suit without a reason and a name.'}};

export class Story{
  constructor(mode='explore'){this.mode=MODES.includes(mode)?mode:'explore';this.held=new Set();this.flags=new Set();this.chapter=this.story?'cleaning':'free';this.pipeSteps=[];this.wearing=false;this.armed=false;this.droneDown=false;this.deaths=0;}
  get story(){return this.mode==='story';} get chapterInfo(){return CHAPTERS.find(c=>c.id===this.chapter)||CHAPTERS.at(-1);} get chapterIndex(){return Math.max(0,indexOf(this.chapter));}
  get relicsHeld(){return RELICS.filter(r=>this.held.has(r.id)).length;} get objective(){return this.story?this.chapterInfo.objective:'Explore every level, the mine network, the void and the exterior silos.';} get complete(){return this.chapter==='free';}
  has(id){return this.held.has(id);} hasFlag(id){return this.flags.has(id);}
  setChapter(id){if(!this.story||indexOf(id)<0||indexOf(id)<this.chapterIndex)return false;const changed=this.chapter!==id;this.chapter=id;return changed;}
  beginSearch(){return this.chapter==='cleaning'&&this.setChapter('clues');}
  opened(key){if(!this.story)return true;if(key==='supply')return this.opened('escape-kit');if(key==='crowbar')return this.chapter==='crowbar';if(key==='hideout-open')return this.flags.has('hideout-open');if(key==='pipe-tools')return this.chapter==='pipe-tools';if(key==='billings')return this.flags.has('billings-helped');if(key==='escape-kit')return this.chapterIndex>=indexOf('escape-kit');if(key==='george')return this.flags.has('george-home-known');return true;}
  visible(id){const item=byId.get(id);return !!item&&!this.held.has(id)&&(!this.story||this.chapter!=='cleaning')&&(!this.story||!item.needs||this.opened(item.needs));}
  sealed(level,wing,type){if(!this.story)return null;for(const [id,seal] of Object.entries(SEALS))if(seal.types.includes(type)&&seal.levels.includes(level)&&!this.opened(id))return seal;return null;}
  take(id){const item=byId.get(id);if(!item||!this.visible(id))return null;this.held.add(id);if(!this.story)return item;if(id==='watch'&&this.chapterIndex<=indexOf('clues'))this.setChapter('void-lead');if(id==='crowbar')this.setChapter('hideout');if(id==='harddrive'){this.flags.add('george-home-known');this.setChapter('george-home');}if(id==='pipekit')this.setChapter('pipe');if(id==='shotgun'){this.armed=true;this.setChapter('escape-kit');}if(id==='suit'){this.wearing=true;this.setChapter('airlock');}return item;}
  inspectVoidDoor(){if(!this.story||this.flags.has('hideout-open'))return {open:true};if(!this.has('watch'))return {message:'The bulkhead is old, but nothing tells you why it matters.'};this.setChapter('crowbar');return {needs:'crowbar',message:'Fresh pry marks score the lower seam. A crowbar would move it.'};}
  pryHideout(){if(!this.story){this.flags.add('hideout-open');return true;}if(this.chapter!=='hideout'||!this.has('crowbar'))return false;this.flags.add('hideout-open');return true;}
  reachGeorgeHome(){if(!this.story)return true;if(!this.has('harddrive'))return false;this.setChapter('terminal');return true;}
  terminalDiscovered(){if(!this.story)return true;if(this.chapter!=='terminal'||!this.has('harddrive'))return false;this.flags.add('blueprint-found');this.setChapter('pipe-tools');return true;}
  capPipe(step){const order=['isolate','collar','torque'];if(this.story&&(this.chapter!=='pipe'||!this.has('pipekit')))return {complete:false,message:'You do not have the tools or the schematic.'};if(!this.flags.has('pipe-cover-open'))return {complete:false,message:'Remove the inspection cover with the crowbar first.'};if(step!==order[this.pipeSteps.length])return {complete:false,message:'Follow the schematic: isolate the line, seat the collar, then torque it.'};this.pipeSteps.push(step);if(this.pipeSteps.length===order.length){this.flags.add('pipe-capped');this.setChapter('billings');return {complete:true};}return {complete:false,next:order[this.pipeSteps.length]};}
  openPipeCover(){if(!this.story){this.flags.add('pipe-cover-open');return true;}if(this.chapter!=='pipe'||!this.has('crowbar')||!this.has('pipekit'))return false;this.flags.add('pipe-cover-open');return true;}
  travelAllowed(id){if(!this.story)return null;if(['surface','silo17','silo17-surface'].includes(id)&&!this.complete)return 'The way out is through the airlock, once the work is finished.';if(['excavator','tunnel'].includes(id)&&!this.flags.has('hideout-open'))return 'The route is concealed. Follow George’s clue through Mechanical.';if(id==='pipe-gallery'&&!this.flags.has('blueprint-found'))return 'A disused service hatch. You do not know where this line leads.';if(this.chapter==='drone')return 'Get clear of the drone before opening the directory.';return null;}
  speakToBillings(){if(!this.story)return {helped:true};if(this.chapter!=='billings')return {helped:false,message:'Billings listens, but you have not brought him proof he can act on.'};if(!this.has('georgia'))return {helped:false,message:'Your account is only a story. Billings needs something he can see and hold.'};this.flags.add('billings-helped');return {helped:true,message:'Billings rests a thumb on the printed skyline. “They told us there was nothing worth saving out there. I cannot promise the air is safe. But if that pipe is sealed, I can give you a chance. Take the shotgun. Come back with the truth.”'};}
  steppedOutside(){if(!this.story)return null;if(this.complete||this.chapter==='drone')return null;if(this.chapter!=='airlock')return {stop:true,message:'The airlock will not turn this investigation into an escape yet.'};if(!this.flags.has('pipe-capped'))return {stop:true,message:'The gas line is still live.'};if(!this.wearing||!this.armed)return {stop:true,message:'You need the sealed suit and Billings’ shotgun.'};this.setChapter('drone');return {drone:true};}
  droneKilled(){if(this.chapter!=='drone')return false;this.droneDown=true;this.setChapter('free');return true;} killedByDrone(){this.deaths++;if(this.chapter==='drone')this.chapter='airlock';}
  save(){return {version:2,mode:this.mode,chapter:this.chapter,held:[...this.held],flags:[...this.flags],pipeSteps:[...this.pipeSteps],deaths:this.deaths};}
  static load(saved){
    const s=new Story(saved?.mode||'explore');
    const held=new Set(Array.isArray(saved?.held)?saved.held:[]),flags=new Set(Array.isArray(saved?.flags)?saved.flags:[]),past=indexOf(saved?.chapter);
    if(!s.story){for(const id of held)if(byId.has(id))s.held.add(id);s.wearing=held.has('suit');s.armed=held.has('shotgun');return s;}
    if(past>0||held.size)s.beginSearch();
    for(const id of ['pez','georgia','watch'])if(held.has(id))s.take(id);
    if(s.has('watch')&&(past>=indexOf('crowbar')||held.has('crowbar')))s.inspectVoidDoor();
    if(held.has('crowbar'))s.take('crowbar');if(flags.has('hideout-open'))s.pryHideout();
    if(held.has('harddrive'))s.take('harddrive');if(past>=indexOf('terminal'))s.reachGeorgeHome();
    if(flags.has('blueprint-found'))s.terminalDiscovered();if(held.has('pipekit'))s.take('pipekit');
    if(flags.has('pipe-cover-open'))s.openPipeCover();
    for(const step of Array.isArray(saved?.pipeSteps)?saved.pipeSteps:[]){if(step!==['isolate','collar','torque'][s.pipeSteps.length])break;s.capPipe(step);}
    if(flags.has('billings-helped'))s.speakToBillings();if(held.has('shotgun'))s.take('shotgun');if(held.has('suit'))s.take('suit');
    if(past>=indexOf('drone')&&s.chapter==='airlock')s.steppedOutside();if(saved?.chapter==='free'&&s.chapter==='drone')s.droneKilled();
    s.deaths=Math.min(9999,Math.max(0,Number(saved?.deaths)||0));return s;
  }
}
export {CHAPTERS};
