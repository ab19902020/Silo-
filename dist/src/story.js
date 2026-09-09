// Story mode.
//
// Two ways to play. **Explore** is the silo as it has always been: every door
// opens, every character is yours, nothing is watching. **Story** is a short
// run — half an hour or so — that starts where the game already started, in the
// cafeteria on the morning of Holston's cleaning, and turns the silo into
// somewhere you have a reason to walk end to end.
//
// The relics are the spine of it. Four of the five are named in the source
// material and are placed on the floors the people who owned them lived and
// worked on; the fifth is a game placement and is marked as one. Judicial and
// Supply are sealed until you have earned a reason to be in them, which is what
// stops the run being a shopping list you can do in any order.

export const MODES=Object.freeze(['story','explore']);

// id, what it is, where it is, and whether the show says so or this build put
// it there. `at` is room-local: x across the wing, z outward from the gallery.
export const RELICS=Object.freeze([
  {id:'pez',name:'A duck-headed PEZ dispenser',eyebrow:'RELIC · UNAUTHORISED',
   level:26,wing:0,at:[-4.9,1.45,9.6],float:true,
   blurb:'A yellow plastic duck on a spring, and a sleeve of chalky sweets that went stale before anyone in this silo was born. George Wilkins gave it to Juliette Nichols. It is the least valuable thing in this list and the hardest to explain away.',
   source:'Named in the television series: George gives Juliette the duck PEZ dispenser.'},
  {id:'watch',name:'George Wilkins’ wristwatch',eyebrow:'RELIC · AUTHORISED',
   level:100,wing:0,at:[4.6,1.02,9.4],float:true,
   blurb:'Still running. Judicial authorises watches — a relic can be made legal if enough of them are in circulation to be useless as evidence — so this one is carried openly, and that is exactly why nobody looks twice at the man carrying it.',
   source:'Named in the television series: George’s watch, passed to Juliette, and legal because watches can be authorised.'},
  {id:'georgia',name:'Amazing Adventures in Georgia',eyebrow:'RELIC · RED',
   level:62,wing:0,at:[6.9,1.06,17.4],float:true,
   blurb:'A children’s travel guide from before, full of photographs of beaches and roads and open water. It came down through the Flamekeepers, hand to hand, and reached George from his aunt. Every page of it is a thing the Pact says does not exist.',
   source:'Named in the television series: the picture book kept by the Flamekeepers and traded away for the hard drive.'},
  {id:'ledger',name:'A relic buyer’s ledger',eyebrow:'SEIZED EVIDENCE',
   level:14,wing:0,at:[-5.6,1.0,12.6],float:true,needs:'judicial',
   blurb:'Ruled columns in a careful hand: what came up out of the ground, who brought it, what it was traded for. Two thirds of the entries have been struck through in a different ink. The last legible line is a hard drive, traded for a book.',
   source:'A placement, not a claim. The show establishes a relic buyer and a trade of the book for the hard drive; the ledger itself is this build’s invention.'},
  {id:'harddrive',name:'George’s hard drive',eyebrow:'RELIC · RED',
   level:144,wing:1,at:[-5.28,.863,5.48],prop:true,
   blurb:'A red-level relic: possession alone is a cleaning, and reading it takes an access level three people in this silo have. George died for it. It has been sitting on a repair bench in Mechanical ever since, because the safest place for it is the one nobody thinks to search.',
   source:'Named in the television series: George’s hard drive, classified red and requiring sysop access.'},
]);

// The two things that are not relics: they are equipment, and the run does not
// end without both of them.
export const EQUIPMENT=Object.freeze([
  {id:'suit',name:'A cleaning suit',eyebrow:'SUPPLY · NOT ON THE MANIFEST',
   level:144,wing:3,at:[5.6,.4,18.5],needs:'supply',
   blurb:'Heat tape, seals and a helmet, folded into a crate that is not on any manifest. Supply makes the suits that go out of the airlock. Supply also knows exactly which of them are made to last, and this is one of the ones that is.',
   source:'Supply builds the cleaning suits; a better-made suit put aside by Mechanical’s friends in Supply is from the books.'},
  {id:'shotgun',name:'A shotgun',eyebrow:'MECHANICAL · CONCEALED',
   level:144,wing:0,at:[1.9,.95,11.7],needs:'shotgun',
   blurb:'Broken down into three parts and taped inside the housing of a pump that has been out of service for a decade, in the aisle where nobody stops. Mechanical does not advertise what it keeps. You will want this on the hill.',
   source:'A placement. Mechanical arms itself in the books; the specific weapon and its hiding place are this build’s invention.'},
]);

export const COLLECTABLES=Object.freeze([...RELICS,...EQUIPMENT]);
const byId=new Map(COLLECTABLES.map(c=>[c.id,c]));

// Sealed wings, and what opens them. Explore mode ignores this entirely.
const SEALS={
  judicial:{types:['judicial'],label:'Judicial holding',
    reason:'Sealed under the Pact. Judicial does not open its evidence rooms to the curious.'},
  it:{types:['it','vault'],levels:[19],label:'Information Technology',
    reason:'IT is closed to the floor. The department decides who comes in, and it has not decided about you.'},
  supply:{types:['supply'],levels:[144],label:'Supply, Level 144',
    reason:'The store is shut. Supply opens it for people it already knows.'},
};

const CHAPTERS=[
  {id:'cleaning',title:'A book on the table',
   objective:'Find the directory book on the cafeteria table, and watch the screen.'},
  {id:'relics',title:'What people keep',
   objective:'Three relics are hidden on the floors the people who owned them lived on, and a fourth is on a bench in Mechanical. Use the directory to travel.'},
  {id:'ledger',title:'Seized evidence',
   objective:'The hard drive names a buyer’s ledger. Judicial holds it on Level 014 — and Judicial is open to you now.'},
  {id:'suit',title:'Not on the manifest',
   objective:'The ledger names a crate in Supply on Level 144. There is a cleaning suit in it that was built to last.'},
  {id:'shotgun',title:'What Mechanical keeps',
   objective:'You will not survive the hill unarmed. Mechanical has a shotgun taped inside a dead pump housing.'},
  {id:'airlock',title:'Out',
   objective:'Suit and gun. Go up to Level 001, cycle the airlock and walk out. Something will come for you.'},
  {id:'drone',title:'Something is coming',
   objective:'It is circling. Let it come inside thirty metres, put the sight on it and give it both barrels — it takes two.'},
  {id:'done',title:'Over the hill',
   objective:'You are outside, and nothing is watching you any more.'},
];

export class Story{
  constructor(mode='explore'){
    this.mode=MODES.includes(mode)?mode:'explore';
    this.held=new Set();
    this.chapter=this.mode==='story'?'cleaning':'done';
    this.wearing=false;this.armed=false;this.droneDown=false;this.deaths=0;
  }
  get story(){return this.mode==='story';}
  get relicsHeld(){return RELICS.filter(r=>this.held.has(r.id)).length;}
  get chapterInfo(){return CHAPTERS.find(c=>c.id===this.chapter)||CHAPTERS[CHAPTERS.length-1];}
  get objective(){
    if(!this.story)return 'Explore the silo. Every door opens and every resident is yours to play.';
    if(this.chapter==='relics'){
      const missing=RELICS.filter(r=>!r.needs&&!this.held.has(r.id));
      return `${this.chapterInfo.objective} ${4-missing.length} of 4 found.`;
    }
    return this.chapterInfo.objective;
  }
  has(id){return this.held.has(id);}
  // Which of the collectables should exist in the world right now.
  visible(id){
    const item=byId.get(id);if(!item||this.held.has(id))return false;
    if(!this.story)return true;
    if(item.needs&&!this.opened(item.needs))return false;
    return true;
  }
  opened(seal){
    if(!this.story)return true;
    if(seal==='judicial')return this.chapterIndex>=2;
    if(seal==='supply')return this.chapterIndex>=3;
    if(seal==='shotgun')return this.chapterIndex>=4;
    if(seal==='it')return this.chapterIndex>=2;
    return true;
  }
  get chapterIndex(){return Math.max(0,CHAPTERS.findIndex(c=>c.id===this.chapter));}
  // A wing that will not open, and why. null means it opens.
  sealed(level,wing,type){
    if(!this.story)return null;
    for(const [id,seal] of Object.entries(SEALS)){
      if(!seal.types.includes(type))continue;
      if(seal.levels&&!seal.levels.includes(level))continue;
      if(this.opened(id))continue;
      return seal;
    }
    return null;
  }
  // Picking something up. Returns what to say about it.
  take(id){
    const item=byId.get(id);
    if(!item||this.held.has(id))return null;
    this.held.add(id);
    if(id==='suit')this.wearing=true;
    if(id==='shotgun')this.armed=true;
    this.advance();
    return item;
  }
  advance(){
    if(!this.story)return;
    const at=this.chapter;
    if(at==='relics'&&RELICS.filter(r=>!r.needs).every(r=>this.held.has(r.id)))this.chapter='ledger';
    if(this.chapter==='ledger'&&this.held.has('ledger'))this.chapter='suit';
    if(this.chapter==='suit'&&this.held.has('suit'))this.chapter='shotgun';
    if(this.chapter==='shotgun'&&this.held.has('shotgun'))this.chapter='airlock';
    return this.chapter!==at;
  }
  // The opening hands over when the directory is read.
  beginSearch(){if(this.story&&this.chapter==='cleaning')this.chapter='relics';}
  // Stepping out of the airlock onto the ramp.
  steppedOutside(){
    if(!this.story)return null;
    if(!this.wearing)return {stop:true,message:'The outer door will open, and you will die on the ramp. Not without a suit.'};
    if(this.chapter==='airlock'){this.chapter='drone';return {drone:true};}
    return null;
  }
  droneKilled(){if(this.chapter==='drone'){this.droneDown=true;this.chapter='done';return true;}return false;}
  killedByDrone(){this.deaths++;if(this.chapter==='drone')this.chapter='airlock';}
  get complete(){return this.chapter==='done';}
  save(){return {mode:this.mode,chapter:this.chapter,held:[...this.held],deaths:this.deaths};}
  static load(saved){
    const s=new Story(saved?.mode||'explore');
    if(saved?.held)for(const id of saved.held)s.held.add(id);
    if(saved?.chapter)s.chapter=saved.chapter;
    s.wearing=s.held.has('suit');s.armed=s.held.has('shotgun');s.deaths=saved?.deaths||0;
    return s;
  }
}
export { CHAPTERS };
