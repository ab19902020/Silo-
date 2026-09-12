// Event-driven mystery progression. Objects provide leads; the player must
// inspect, operate, search and persuade rather than complete a shopping list.
export const MODES=Object.freeze(['story','explore']);

export const RELICS=Object.freeze([
  {id:'pez',sound:'plastic',name:'A duck-headed PEZ dispenser',eyebrow:'RELIC · UNAUTHORISED',level:26,wing:0,at:[-4.9,1.45,9.6],float:true,
   blurb:'A yellow duck head on a spring. A repair ticket is folded under the spring: “G. Wilkins — watch left at the market, Level 100. Book with the Medical returns, 62.” On the sleeve, three scratches: 1–4–4.',
   source:'Named in the television series. The scratched level clue is reconstructed for this game.'},
  // On the felt in the gap the trader keeps clear on her counter, which is
  // where the ticket in the duck says it was left. It used to hang ten and a
  // half centimetres above that counter, unlit, between two bolts of cloth.
  // bazaar.js REPAIR_COUNTER owns these numbers; a test keeps them in step.
  {id:'watch',sound:'metal',name:'George Wilkins’ wristwatch',eyebrow:'RELIC · AUTHORISED',level:100,wing:0,at:[6.52,.855,6.35],float:true,
   blurb:'Still running. The back is scarred by a crude wave and a downward arrow. It is not decoration: George left a direction: below Mechanical, behind the warning sign in the rear service gallery.',
   source:'George’s authorised watch is established in the television series. The engraved void clue is reconstructed for this game.'},
  {id:'georgia',sound:'book',name:'Amazing Adventures in Georgia',eyebrow:'RELIC · RED',level:62,wing:0,at:[7.4,.72,15],float:true,
   blurb:'A children’s travel guide full of open sky, roads and water. A folded Atlanta page carries George’s pencil marks. It is dangerous evidence—and proof that the world has names.',
   source:'The Georgia travel guide and its importance are established in the television series. The pencil annotations are reconstructed.'},
  {id:'harddrive',sound:'plastic',name:'Hard Drive 18',eyebrow:'RELIC · RED',level:144,wing:1,at:[-5.28,.863,5.48],hideoutAt:[68.5,12.92,6.6],prop:true,needs:'hideout-open',
   blurb:'An old hard drive stamped 18. Nothing on its casing explains what it contains. One connector is polished from use; George expected it to be inserted somewhere.',
   source:'Hard Drive 18 and George’s use of it are established in the television series. Its discovery in the hideout is reconstructed for this game.'},
]);

export const EQUIPMENT=Object.freeze([
  {id:'crowbar',sound:'metal',name:'A maintenance crowbar',eyebrow:'TOOL · MECHANICAL',level:144,wing:0,at:[5.4,.93,13],needs:'crowbar',
   blurb:'A short forged bar with a flattened end. The wear marks match the fasteners on the concealed void bulkhead.',source:'A gameplay tool and placement reconstructed for this game.'},
  {id:'pipekit',sound:'metal',name:'A pipe-capping kit',eyebrow:'TOOL · WATER FILTRATION',level:55,wing:0,at:[-6.7,0,18.7],needs:'pipe-tools',
   blurb:'A split steel collar, seal compound, torque handle and pressure key. The sizes match the service line drawn in the hidden blueprint.',source:'The kit and its placement are reconstructed for this game; the exact gas-pipe location is not presented as canon.'},
  {id:'suit',sound:'cloth',name:'A sealed outside suit',eyebrow:'SUPPLY · NOT ON THE MANIFEST',level:144,wing:3,at:[5.6,0,18.5],needs:'escape-kit',
   blurb:'A suit with sound seals and Mechanical heat tape. It was prepared to survive the hill, not to perform a cleaning.',source:'The importance of correctly made heat tape is established in the books and television series; this stored suit is reconstructed.'},
  {id:'shotgun',sound:'metal',name:'Billings’ shotgun',eyebrow:'SHERIFF · ISSUED',level:1,wing:0,at:[1.9,.95,11.7],needs:'billings',
   blurb:'Officer Billings has opened the armoury and placed the shotgun in your hands. It is not permission to clean. It is his decision to believe the evidence.',source:'Billings, the Atlanta book and sheriff’s station are established. This handoff is reconstructed for the game’s finale.'},
]);
export const COLLECTABLES=Object.freeze([...RELICS,...EQUIPMENT]);
const byId=new Map(COLLECTABLES.map(item=>[item.id,item]));

// Every chapter names a place the player can actually travel to, and carries
// hints that get more specific the longer they are stuck.
//
// `where` is a real destination: the level the directory travels to, the wing
// letter on its door, and a short label for the heads-up display. An objective
// that says "in Mechanical" is useless in a silo a hundred and forty-four
// levels deep — Mechanical is a level number, and the player needs it.
//
// `hints` escalate. The first is the reasoning the character would do for
// themselves; the last says where the thing is. They are revealed one at a
// time, on request or after being stuck long enough, so the player who wants
// to work it out still can and the player who is lost is not stranded.
const CHAPTERS=Object.freeze([
  {id:'cleaning',title:'The last cleaning',objective:'Find the directory book in the cafeteria and watch Holston cross the hill.',
   where:{level:1,wing:0,place:'Cafeteria · Level 001'},
   hints:['The book is on a table in front of the screen wall.',
          'Walk up to it and press Use. Everything starts from the book.']},
  {id:'clues',title:'Things George left',objective:'A receipt in the directory reads: “George left the little duck at the bar, 026.” Start there.',
   where:{level:26,wing:0,place:'The bar · Level 026'},
   hints:['The receipt gives you a level: 026. Open the directory and travel to it.',
          'The bar is wing A. Go to the bar itself, not the tables.',
          'A small yellow duck head, sitting on the bar counter among the mugs.']},
  {id:'void-lead',title:'A mark like water',objective:'The watch is scratched with a wave and a downward arrow. Follow it below Mechanical, Level 144.',
   where:{level:144,wing:0,place:'Mechanical · Level 144 · wing A'},
   hints:['A wave and an arrow pointing down. Water, below. The lowest working level is Mechanical, 144.',
          'The watch said the rear service gallery, behind the warning sign — the back of the machine hall, not the front.',
          'There is an old bulkhead set into the wall back there. Get close and inspect it.']},
  {id:'crowbar',title:'The blocked way',objective:'The bulkhead has been prised open before. Find a lever on the tool board in Mechanical, Level 144, and come back.',
   where:{level:144,wing:0,place:'Mechanical · Level 144 · wing A'},
   hints:['A bulkhead that has moved once will move again, with something to lever it. Tools live in Mechanical.',
          'You do not need to travel. It is the same level you are standing on: 144, wing A.',
          'Look for the tool board standing on a workbench along the side of the machine hall. The crowbar is lying on the bench in front of it.']},
  // One chapter, two actions: the objective has to still be true after the
  // bulkhead is open, or it sits there telling you to do something you have
  // already done.
  {id:'hideout',title:'Behind the wall',objective:'Pry the bulkhead open with the crowbar, then search George’s hideout. The obvious relic is not what he hid.',
   where:{level:144,wing:0,place:'Mechanical · Level 144 · wing A'},
   hints:['Back to the bulkhead in the rear service gallery, with the crowbar in hand. Inspect it again.',
          'It is open. Now go through it and look at everything, not just the thing on the shelf.',
          'What matters is a hard drive stamped 18. He left it where nobody would look twice.']},
  {id:'george-home',title:'Something missing',objective:'The drive came with a folded slip: “G. Wilkins · 068 · A.” Find the machine it belonged to.',
   where:{level:68,wing:0,place:'Wilkins residence · Level 068 · wing A'},
   hints:['The slip is an address. 068 is the level; A is the wing.',
          'It is a residence on Level 068. The watch carries a maker number the old register will accept.',
          'George’s own room. His machine is still in it.']},
  {id:'terminal',title:'The ordinary answer',objective:'George’s machine has no storage in it. Insert Hard Drive 18 and look properly — an empty file list is not an answer.',
   where:{level:68,wing:0,place:'Wilkins residence · Level 068 · wing A'},
   hints:['Insert the drive first. What comes up is meant to look like nothing.',
          'The machine has a search. George would not leave the thing he died for in a folder called SECRET.',
          'Search for the word a Flamekeeper would use for a place things are kept: library.']},
  {id:'pipe-tools',title:'The service line',objective:'The hidden schematic names a service gas line. Collect the capping kit from Water Filtration, Level 055.',
   where:{level:55,wing:0,place:'Water filtration · Level 055 · wing A'},
   hints:['The schematic needs tools you do not have. Water Filtration keeps them: Level 055.',
          'Wing A, on the floor among the filter vessels and pump controls.',
          'A steel case: split collar, seal compound, torque handle and pressure key.']},
  {id:'pipe',title:'Under pressure',objective:'The schematic puts the line below Mechanical, LEVEL 144 — the abandoned pressure gallery. Open your directory and travel there, then lever the cover off, isolate the line, seat the collar and torque it.',
   where:{level:144,special:'pipe-gallery',place:'Abandoned pressure gallery · below Level 144'},
   hints:['Open the directory. Search 144 and the pressure gallery is listed under BENEATH & BEYOND, with the mines and the generator.',
          'Carry both the crowbar and Water Filtration’s capping kit, or the cover will not come off.',
          'The order is on the schematic and it matters: isolate the line, seat the collar, then torque it to the mark.',
          'On foot instead of by directory: travel to the mines, follow the red service band past the deep-face drill, and open the hatch at the ore face.']},
  {id:'billings',title:'A page called Atlanta',objective:'Take the Georgia book to Officer Billings in the sheriff’s station, Level 001, and give him a reason to help.',
   where:{level:1,wing:0,place:'Sheriff’s station · Level 001'},
   hints:['Billings will not act on an account. He needs something he can hold.',
          'Carry the Georgia book to him. The station is off the cafeteria on Level 001.',
          'Talk to him, and offer the book with the Atlanta page in it.']},
  {id:'escape-kit',title:'Not a cleaning',objective:'Billings has released the shotgun. Collect the sealed suit from Supply, Level 144, then go up to the airlock.',
   where:{level:144,wing:3,place:'Supply · Level 144 · wing D'},
   hints:['Supply is on Level 144, wing D. It will open for you now.',
          'It is an open crate on the floor, not on the manifest, with Mechanical’s own heat tape on it.',
          'With the suit and the shotgun, the airlock is on Level 001.']},
  {id:'airlock',title:'First sunlight',objective:'Cycle the airlock on Level 001 and walk out. You are escaping — not cleaning.',
   where:{level:1,wing:0,place:'Airlock · Level 001'},
   hints:['Through the sheriff’s station and the cleaning preparation room, to the airlock.',
          'Cycle the inner door, step in, then cycle the outer one.']},
  {id:'drone',title:'The thing over the ridge',objective:'Something is circling. Let it come inside thirty metres, put the sight on it and give it both barrels.',
   where:null,
   hints:['Do not fire at the sky. It has to be close.',
          'Two shots. Hold still and let it commit.']},
  {id:'free',title:'Fifty-one doors',objective:'The ridge is open. Explore the exterior network and the flooded remains of Silo 17.',
   where:null,hints:[]},
]);
const indexOf=id=>CHAPTERS.findIndex(chapter=>chapter.id===id);
const SEALS={george:{types:['residential'],levels:[68],label:'Wilkins residence',reason:'The lock is intact. George’s watch has a maker number that may fit the old resident register.'},supply:{types:['supply'],levels:[144],label:'Supply, Level 144',reason:'Supply will not release an outside suit without a reason and a name.'}};

export class Story{
  constructor(mode='explore'){this.mode=MODES.includes(mode)?mode:'explore';this.held=new Set();this.flags=new Set();this.chapter=this.story?'cleaning':'free';this.pipeSteps=[];this.wearing=false;this.armed=false;this.droneDown=false;this.deaths=0;this.hints={};this.seen=new Set();}
  get story(){return this.mode==='story';} get chapterInfo(){
    const c=CHAPTERS.find(c=>c.id===this.chapter)||CHAPTERS.at(-1);
    if(c.id==='clues'&&this.has('pez'))return {...c,title:'The repair ticket',objective:'The duck concealed a repair ticket: George left his watch at the market, Level 100. Find the watch.',where:{level:100,wing:0,place:'Bazaar · Level 100 · wing A'},hints:['The ticket mentions a watch left for repair at the market.','Travel to Level 100, wing A. Look at the trader’s counter.','The leather strap lies beside the repair goods. Pick it up and turn it over.']};
    if(c.id==='hideout'&&this.hasFlag('hideout-open'))return {...c,objective:'The bulkhead is open. Descend into the flooded void and search George’s camp beside the excavator.',where:{level:144,wing:0,place:'George’s hideout · below Level 144'},hints:['Go through the open bulkhead and down the maintenance route.','Follow the camp lights beside the digging machine.','Look on George’s work surface for an old drive stamped 18.']};
    if(c.id==='billings'&&!this.has('georgia'))return {...c,objective:'Billings needs evidence. George left the Georgia travel book with Medical returns on Level 062. Bring him the Atlanta page.',where:{level:62,wing:0,place:'Medical returns · Level 062 · wing A'},hints:['George’s repair ticket mentioned a book at Medical returns, Level 062.','Look on the low return table in wing A.','Keep the book. Billings is in the sheriff’s station off the cafeteria on Level 001.']};
    return c;
  } get chapterIndex(){return Math.max(0,indexOf(this.chapter));}
  get relicsHeld(){return RELICS.filter(r=>this.held.has(r.id)).length;} get objective(){return this.story?this.chapterInfo.objective:'Explore every level, the mine network, the void and the exterior silos.';} get complete(){return this.chapter==='free';}
  has(id){return this.held.has(id);} hasFlag(id){return this.flags.has(id);}

  // --- guidance -----------------------------------------------------------
  // Where the current chapter is asking you to go, if it is asking for a place
  // at all. The heads-up display, the directory and the arrival notice all read
  // this rather than each keeping their own idea of where the player should be.
  get destination(){return this.story?this.chapterInfo.where||null:null;}
  get hintsTotal(){return this.chapterInfo.hints?.length||0;}
  get hintsShown(){return Math.min(this.hintsTotal,this.hints[this.chapter]||0);}
  get hintsLeft(){return this.hintsTotal-this.hintsShown;}
  get shownHints(){return (this.chapterInfo.hints||[]).slice(0,this.hintsShown);}
  // One more hint, or null when the chapter has nothing further to say. Asking
  // is always allowed; being stuck long enough asks on the player's behalf.
  revealHint(){
    if(!this.story||!this.hintsLeft)return null;
    const next=this.chapterInfo.hints[this.hintsShown];
    this.hints[this.chapter]=this.hintsShown+1;
    return next;
  }
  // True once, the first time the player reaches the level the chapter points
  // at, so arriving somewhere correct is confirmed instead of silent.
  arriving(level){
    const where=this.destination;
    if(!where||where.level!==level)return false;
    const key=`arrived:${this.chapter}`;
    if(this.seen.has(key))return false;
    this.seen.add(key);return true;
  }
  setChapter(id){if(!this.story||indexOf(id)<0||indexOf(id)<this.chapterIndex)return false;const changed=this.chapter!==id;this.chapter=id;return changed;}
  beginSearch(){return this.chapter==='cleaning'&&this.setChapter('clues');}
  opened(key){if(!this.story)return true;if(key==='supply')return this.opened('escape-kit');if(key==='crowbar')return this.chapter==='crowbar';if(key==='hideout-open')return this.flags.has('hideout-open');if(key==='pipe-tools')return this.chapter==='pipe-tools';if(key==='billings')return this.flags.has('billings-helped');if(key==='escape-kit')return this.chapterIndex>=indexOf('escape-kit');if(key==='george')return this.flags.has('george-home-known');return true;}
  visible(id){const item=byId.get(id);return !!item&&!this.held.has(id)&&(!this.story||this.chapter!=='cleaning')&&(!this.story||!item.needs||this.opened(item.needs));}
  sealed(level,wing,type){if(!this.story)return null;for(const [id,seal] of Object.entries(SEALS))if(seal.types.includes(type)&&seal.levels.includes(level)&&!this.opened(id))return seal;return null;}
  take(id){const item=byId.get(id);if(!item||!this.visible(id))return null;this.held.add(id);if(!this.story)return item;if(id==='pez'&&this.chapter==='clues'){delete this.hints.clues;this.seen.delete('arrived:clues');}if(id==='georgia'&&this.chapter==='billings'){delete this.hints.billings;this.seen.delete('arrived:billings');}if(id==='watch'&&this.chapterIndex<=indexOf('clues'))this.setChapter('void-lead');if(id==='crowbar')this.setChapter('hideout');if(id==='harddrive'){this.flags.add('george-home-known');this.setChapter('george-home');}if(id==='pipekit')this.setChapter('pipe');if(id==='shotgun'){this.armed=true;this.setChapter('escape-kit');}if(id==='suit'){this.wearing=true;this.setChapter('airlock');}return item;}
  inspectVoidDoor(){if(!this.story||this.flags.has('hideout-open'))return {open:true};if(!this.has('watch'))return {message:'The bulkhead is old, but nothing tells you why it matters.'};this.setChapter('crowbar');return {needs:'crowbar',message:'Fresh pry marks score the lower seam. A crowbar would move it.'};}
  pryHideout(){if(!this.story){this.flags.add('hideout-open');return true;}if(this.chapter!=='hideout'||!this.has('crowbar'))return false;this.flags.add('hideout-open');delete this.hints.hideout;return true;}
  reachGeorgeHome(){if(!this.story)return true;if(!this.has('harddrive'))return false;this.setChapter('terminal');return true;}
  terminalDiscovered(){if(!this.story)return true;if(this.chapter!=='terminal'||!this.has('harddrive'))return false;this.flags.add('blueprint-found');this.setChapter('pipe-tools');return true;}
  capPipe(step){const order=['isolate','collar','torque'];if(this.story&&(this.chapter!=='pipe'||!this.has('pipekit')))return {complete:false,message:'You do not have the tools or the schematic.'};if(!this.flags.has('pipe-cover-open'))return {complete:false,message:'Remove the inspection cover with the crowbar first.'};if(step!==order[this.pipeSteps.length])return {complete:false,message:'Follow the schematic: isolate the line, seat the collar, then torque it.'};this.pipeSteps.push(step);if(this.pipeSteps.length===order.length){this.flags.add('pipe-capped');this.setChapter('billings');return {complete:true};}return {complete:false,next:order[this.pipeSteps.length]};}
  openPipeCover(){if(!this.story){this.flags.add('pipe-cover-open');return true;}if(this.chapter!=='pipe'||!this.has('crowbar')||!this.has('pipekit'))return false;this.flags.add('pipe-cover-open');return true;}
  travelAllowed(id){if(!this.story)return null;if(['surface','silo17','silo17-surface'].includes(id)&&!this.complete)return 'The way out is the airlock on Level 001, once the work is finished.';if(['excavator','tunnel'].includes(id)&&!this.flags.has('hideout-open'))return 'The route is concealed. George’s clue points below Mechanical, Level 144.';if(id==='pipe-gallery'&&!this.flags.has('blueprint-found'))return 'A disused service hatch. Until the schematic tells you where this line goes, it is only a hole.';if(this.chapter==='drone')return 'Get clear of the drone before opening the directory.';return null;}
  speakToBillings(){if(!this.story)return {helped:true};if(this.chapter!=='billings')return {helped:false,message:'Billings listens, but you have not brought him proof he can act on.'};if(!this.has('georgia'))return {helped:false,message:'Your account is only a story. Billings needs something he can see and hold.'};this.flags.add('billings-helped');return {helped:true,message:'Billings rests a thumb on the printed skyline. “They told us there was nothing worth saving out there. I cannot promise the air is safe. But if that pipe is sealed, I can give you a chance. Take the shotgun. Come back with the truth.”'};}
  steppedOutside(){if(!this.story)return null;if(this.complete||this.chapter==='drone')return null;if(this.chapter!=='airlock')return {stop:true,message:'The airlock will not turn this investigation into an escape yet.'};if(!this.flags.has('pipe-capped'))return {stop:true,message:'The gas line is still live.'};if(!this.wearing||!this.armed)return {stop:true,message:'You need the sealed suit and Billings’ shotgun.'};this.setChapter('drone');return {drone:true};}
  droneKilled(){if(this.chapter!=='drone')return false;this.droneDown=true;this.setChapter('free');return true;} killedByDrone(){this.deaths++;if(this.chapter==='drone')this.chapter='airlock';}
  save(){return {version:3,mode:this.mode,chapter:this.chapter,held:[...this.held],flags:[...this.flags],pipeSteps:[...this.pipeSteps],deaths:this.deaths,hints:{...this.hints},seen:[...this.seen]};}
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
    s.deaths=Math.min(9999,Math.max(0,Number(saved?.deaths)||0));
    // Hints already given stay given: a reload is not a way to be told again,
    // and more to the point it is not a way to lose the help you already had.
    if(saved?.hints&&typeof saved.hints==='object')
      for(const [chapter,count] of Object.entries(saved.hints))
        if(indexOf(chapter)>=0)s.hints[chapter]=Math.max(0,Math.min(20,Number(count)||0));
    if(Array.isArray(saved?.seen))for(const key of saved.seen)if(typeof key==='string')s.seen.add(key);
    return s;
  }
}
export {CHAPTERS};
