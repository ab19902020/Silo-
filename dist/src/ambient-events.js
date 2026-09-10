// The noises the silo makes that you did not make.
//
// There was already an "occasional life" timer in the audio module: every
// eleven to twenty-six seconds it picked one of four sounds from the ambience
// bed's family. It never knew what floor you were on, whether anyone was awake,
// or that you were standing in a two-hundred-metre concrete pipe with ten
// thousand people living up and down it. So the silo sounded the same at three
// in the morning on an empty landing as it did at noon in the bazaar.
//
// This is the director that decides instead. It is pure scheduling: it takes
// where you are and what hour it is, and returns descriptors. Rendering them
// is the audio module's job, which is what keeps this file testable.
//
// One rule holds throughout: **nothing here speaks.** There is no synthesised
// dialogue and no cloned voice. The public address is a chime, a carrier
// opening, an unintelligible cadence behind two hundred metres of concrete,
// and a click — which is what you actually hear from a landing anyway.

export const EVENT_IDS=Object.freeze([
  'pa','bell','steps-above','steps-below','door','gate','clank','drop','settle','drip','cough','chairs',
]);

// Weights per place. The place names are the ones the ambience bed already
// uses, so the two cannot drift apart into different ideas of where you are.
const COMMON={settle:2,door:2};
const TABLE={
  cafeteria:   {pa:6,chairs:5,cough:4,door:3,settle:1},
  bazaar:      {pa:4,chairs:4,cough:4,door:3,drop:2},
  residential: {pa:3,door:6,cough:3,chairs:2,settle:2},
  medical:     {pa:4,door:4,chairs:2,cough:3,settle:1},
  it:          {pa:3,door:3,clank:1,settle:2},
  vault:       {door:2,clank:1,settle:3},
  surveillance:{door:2,settle:3,clank:1},
  farm:        {pa:2,drip:4,door:2,drop:2,settle:1},
  park:        {pa:2,drip:3,chairs:2,cough:2,settle:1},
  water:       {drip:6,clank:3,gate:2,settle:2},
  recycling:   {clank:5,drop:3,door:2,settle:2},
  workshop:    {clank:5,drop:4,door:2,settle:1},
  mechanical:  {clank:6,drop:3,gate:2,settle:2,pa:1},
  generator:   {clank:5,gate:3,settle:2},
  mines:       {drip:5,clank:3,drop:2,settle:3},
  tunnel:      {drip:6,settle:4,clank:1},
  excavator:   {drip:5,clank:3,settle:3},
  airlock:     {clank:4,gate:3,settle:2},
  surface:     {},                       // the wind is the event out there
};
// The stairwell is not a room and has no bed of its own, but it is where the
// silo is most audible: everything in it arrives from a long way off.
const SHAFT={'steps-above':6,'steps-below':6,pa:4,door:3,clank:2,settle:4};

// What the night takes away. At the bottom of the lamp curve the silo is not
// silent, but nobody is dropping a spanner or scraping a chair.
const NOCTURNAL=new Set(['settle','drip','clank','door','steps-above','steps-below','gate']);

const mulberry=seed=>()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

// Somebody on the stairs is above you or below you, and which one it is
// changes the sound: a tread overhead arrives through the underside of a steel
// flight, a tread below comes up the open shaft. Both lose their top end on the
// way. `distance` is in floors, and is what makes a landing feel occupied
// rather than a corridor with a sound effect in it.
function stairs(rng,above){
  const floors=1+Math.floor(rng()*4);
  return {id:above?'steps-above':'steps-below',
    steps:3+Math.floor(rng()*6),
    distance:floors,
    interval:.34+rng()*.12,
    gain:clamp(.055/(1+floors*.55),.006,.05),
    muffle:above?900+rng()*500:1500+rng()*900,
    send:1.6,pan:(rng()*2-1)*.5,rate:.9+rng()*.3};
}

function describe(id,rng,{crowd=0,bustle=0}={}){
  const pan=(rng()*2-1)*.75;
  switch(id){
    case 'steps-above':return stairs(rng,true);
    case 'steps-below':return stairs(rng,false);
    // The tannoy. A two-note chime, the carrier opening, a cadence with no
    // words in it, and the click of the key being let go.
    case 'pa':return {id,pan:pan*.3,muffle:1300+rng()*700,send:1.9,gain:.055+rng()*.02,
      syllables:5+Math.floor(rng()*7),rate:.92+rng()*.18};
    case 'bell':return {id,pan:pan*.2,muffle:0,send:2.2,gain:.09,strikes:3};
    case 'door':return {id,pan,muffle:700+rng()*600,send:1.3,gain:.020+rng()*.014,distance:1+Math.floor(rng()*3)};
    case 'gate':return {id,pan,muffle:900+rng()*700,send:1.5,gain:.024,rate:.7+rng()*.3};
    case 'clank':return {id,pan,muffle:1800+rng()*1400,send:1.4,gain:.026+rng()*.016,rate:.72+rng()*.6};
    case 'drop':return {id,pan,muffle:2200+rng()*1600,send:1.2,gain:.024,bounces:2+Math.floor(rng()*3),rate:.9+rng()*.5};
    case 'drip':return {id,pan,muffle:0,send:1.2,gain:.045,frequency:620+rng()*280,to:1700+rng()*900};
    case 'cough':return {id,pan,muffle:1100+rng()*700,send:.8,gain:(.012+rng()*.010)*clamp(crowd,.2,1)};
    case 'chairs':return {id,pan,muffle:1600+rng()*900,send:.9,gain:(.014+rng()*.012)*clamp(crowd,.2,1),rate:.85+rng()*.4};
    default:return {id:'settle',pan,muffle:0,send:1.6,gain:.05+rng()*.02,
      frequency:170+rng()*90,to:300+rng()*130,decay:1.1+rng()*1.1};
  }
}

export class AmbientDirector{
  constructor({seed=20240918,gap=15}={}){
    this.rng=mulberry(seed);this.gap=gap;this.wait=gap*.5;this.lastId=null;
  }
  // `context` is the world as the player is standing in it:
  //   place    the ambience bed's own name for the room
  //   inShaft  true on the stairs or a landing, where the silo carries
  //   crowd    0-1, how many people are out (the schedule's own number)
  //   bustle   0-1, how eventful the hour is
  //   silent   nothing at all — the cleaning, a paused game, a dialog open
  update(dt,context={}){
    if(!Number.isFinite(dt)||dt<=0)return [];
    const {silent=false,bustle=.7}=context;
    if(silent){this.wait=Math.max(this.wait,2);return [];}
    this.wait-=dt;
    if(this.wait>0)return [];
    // A quiet hour does not fire quiet events more slowly and loud ones as
    // often — it fires everything less often, and fires fewer kinds of thing.
    const rate=clamp(bustle,.06,1);
    this.wait=this.gap*(.55+this.rng()*.9)/rate;
    const id=this.pick(context);
    if(!id)return [];
    this.lastId=id;
    return [describe(id,this.rng,context)];
  }
  pick({place='residential',inShaft=false,crowd=.6,bustle=.7}={}){
    const weights={...(inShaft?SHAFT:{...COMMON,...(TABLE[place]||TABLE.residential)})};
    if(place==='surface'&&!inShaft)return null;
    const night=bustle<.3;
    let total=0;const pool=[];
    for(const [id,weight] of Object.entries(weights)){
      if(!weight)continue;
      if(night&&!NOCTURNAL.has(id))continue;              // nobody is up
      if((id==='cough'||id==='chairs')&&crowd<.22)continue; // nobody is there
      if(id==='pa'&&bustle<.45)continue;                  // the tannoy sleeps too
      // Never the same sound twice running: two identical clanks read as a
      // loop, and one loop undoes a hundred good ones.
      const w=id===this.lastId?weight*.25:weight;
      total+=w;pool.push([id,total]);
    }
    if(!total)return 'settle';
    const roll=this.rng()*total;
    for(const [id,ceiling] of pool)if(roll<=ceiling)return id;
    return pool[pool.length-1][0];
  }
}

// The shift bell is not random and does not belong to the director: the clock
// says when it rings. This only shapes it.
export const shiftBell=()=>describe('bell',()=>.5,{});
