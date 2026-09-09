// Silo 18 audio.
//
// One master bus feeds four sub-buses. The soundtrack keeps a constant level
// everywhere in the silo; only the ambience beds, the reverb return and the
// footstep material move with the location, so the music never ducks or
// restarts as you travel between levels.
//
//   destination <- limiter <- master <- music    -> tone filter -> soundtrack
//                                     <- ambience -> hum / air / wind / turbine
//                                     <- sfx      -> footsteps, doors, interface
//                                     <- space    -> convolved shaft reverb
//
// Everything except the two music files is synthesised at runtime.
//
// There are two of them and they have different jobs. The bed is the ten
// minute loop that plays everywhere in the silo, forever. The opening piece is
// a one-shot: it starts with the cleaning speech, turns into the score, and
// runs for ten and a half minutes from the moment the directory book is picked
// up; when it ends the bed takes over and loops from there on. The two are
// mastered to the same loudness (-14.7 and -14.8 LUFS) so the hand-over is not
// a step in level.
const FOOTSTEP_URL = new URL('../assets/audio/footsteps/', import.meta.url);
const MUSIC_URL = new URL('../assets/audio/silo-18-theme.mp3', import.meta.url);
const OPENING_URL = new URL('../assets/audio/silo-18-opening.mp3', import.meta.url);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const LEVEL=2.2;   // output trim ahead of the limiter; the sub-bus balance is set below

// Impacts are modelled, not drawn with oscillators. A short excitation is fed
// through a bank of damped two-pole resonators; the frequencies and decay times
// of those modes are what make concrete sound like concrete and grating sound
// like steel.
//
// The first version of this got one line of arithmetic wrong and it cost the
// whole silo its footsteps. Feeding a two-pole resonator an impulse gives
// b0·r^n·sin((n+1)w)/sin(w), so a mode's peak is b0/sin(w) and the gain that
// makes the table's numbers mean what they say is b0 = sin(w). It was written
// as sin(w)·(1-r), and (1-r) is 4e-4 for a 95 Hz mode that rings for 48 ms
// against 4e-3 for a 3.1 kHz mode that rings for 5 — so every low mode came out
// three hundred times too quiet and every material in the game, whatever its
// table said, was reduced to its top two octaves. Measured on the old build, a
// boot on concrete had *zero* per cent of its energy below 120 Hz, 62 per cent
// above 2 kHz, and was over in ten milliseconds. That is not a footstep. That
// is a tap shoe.
//
// A real footstep is three things arriving together, and the table below now
// carries all three:
//
//   sole     the shoe. A boot is a lossy spring: it turns the strike into a
//            few milliseconds of shaped push rather than a click. `bright` is
//            its low-pass corner in Hz, `burst` its length, `shape` its decay.
//   body     the mass behind it. Eighty kilos arriving on a floor puts a
//            short, low half-cycle into the room; this is what you feel as
//            much as hear, and what was missing entirely.
//   modes    the floor and the room. [frequency Hz, decay seconds, gain]
//
//   direct   how much raw excitation survives on top, for bite
//   grains   loose material scattered after the strike
//   send     how much of it goes to the room reverb
const IMPACTS={
  // Floors, in the order a boot meets them. The mode tables are unchanged from
  // the first pass — they were always right; they were simply never audible.
  concrete:{duration:.42,burst:.0075,shape:1.5,bright:3400,direct:0.019,body:[62,0.055,0.06],
    grains:3, grainLevel:.07,grainSpread:.030,send:.9,
    modes:[[95,0.075,0.06],[168,0.052,0.09],[395,0.03,0.16],[880,0.016,0.32],[1650,0.01,0.32],[3100,0.006,1],[5600,0.004,0.77]]},
  // Steel stair treads: a plate on a frame. It rings, and the frame rattles.
  grating: {duration:.85,burst:.0042,shape:2.2,bright:3800,direct:0.02,body:[74,0.04,0.03],
    grains:9, grainLevel:.16,grainSpread:.140,send:1.15,
    modes:[[104,0.07,0.06],[196,0.058,0.08],[430,0.1,0.14],[915,0.085,0.3],[1780,0.065,0.3],[2960,0.045,0.84],[6200,0.028,1]]},
  metal:   {duration:.62,burst:.0038,shape:2.4,bright:3200,direct:0.019,body:[70,0.045,0.03],
    grains:6, grainLevel:.13,grainSpread:.110,send:1.0,
    modes:[[118,0.07,0.03],[210,0.055,0.05],[760,0.055,0.13],[1390,0.045,0.21],[2340,0.032,0.32],[3720,0.022,0.32],[5800,0.014,1]]},
  rock:    {duration:.40,burst:.0090,shape:1.3,bright:2200,direct:0.023,body:[58,0.06,0.07],
    grains:12,grainLevel:.20,grainSpread:.070,send:.85,
    modes:[[78,0.07,0.07],[132,0.05,0.08],[310,0.028,0.15],[640,0.015,0.15],[1400,0.009,0.53],[2900,0.005,1],[5400,0.003,0.75]]},
  grit:    {duration:.40,burst:.0130,shape:1.0,bright:1600, direct:0.021,body:[54,0.055,0.04],
    grains:24,grainLevel:.30,grainSpread:.110,send:.6,
    modes:[[80,0.055,0.04],[115,0.038,0.04],[260,0.02,0.1],[620,0.012,0.25],[1500,0.008,1],[3600,0.005,0.77],[6400,0.003,0.39]]},
  // Soil under a growing bed: almost no ring at all, just a soft compression.
  soil:    {duration:.30,burst:.0160,shape:.9, bright:1200, direct:0.25,body:[48,0.06,0.06],
    grains:16,grainLevel:.20,grainSpread:.090,send:.35,
    modes:[[70,0.035,0.06],[104,0.024,0.06],[210,0.012,0.17],[480,0.008,0.37],[1200,0.005,0.71],[2800,0.003,1]]},
  // Growing beds and the park. Almost all of this is the plants, not the floor.
  grass:   {duration:.34,burst:.0150,shape:.9, bright:1400, direct:0.18,body:[52,.045,0.06],
    grains:18,grainLevel:.22,grainSpread:.100,send:.32,
    modes:[[74,.030,0.06],[112,.022,0.08],[240,.014,0.20],[560,.009,0.35],[1400,.006,0.80],[3200,.004,1]]},
  // A covered floor damps its own low mode faster than bare concrete does; the
  // first pass gave it a longer decay, which made a rug ring like a slab.
  soft:    {duration:.26,burst:.0110,shape:1.2,bright:1500, direct:0.231,body:[52,0.048,0.03],
    grains:2, grainLevel:.04,grainSpread:.030,send:.3,
    modes:[[92,0.04,0.03],[142,0.026,0.05],[330,0.012,0.09],[720,0.007,0.09],[1600,0.005,0.79],[3400,0.003,1]]},
  // Standing water on concrete. The slap is bright and the splash is short.
  wet:     {duration:.44,burst:.0060,shape:1.8,bright:2600,direct:0.099,body:[60,0.05,0.09],
    grains:20,grainLevel:.26,grainSpread:.055,send:1.0,
    modes:[[92,0.07,0.09],[165,0.048,0.13],[420,0.026,0.25],[1250,0.014,0.56],[2600,0.008,0.95],[5200,0.004,1]]},
  // Fittings. These are struck objects rather than floors: no body, no sole.
  latch:   {duration:.12,burst:.0014,shape:3.4,bright:9000,direct:0.247,body:null,
    grains:0, grainLevel:0,grainSpread:0,send:.8,
    modes:[[560,0.02,0.17],[1800,0.014,0.62],[3400,0.009,1],[5200,0.005,0.91],[7600,0.003,0.91]]},
  thunk:   {duration:.70,burst:.0060,shape:1.8,bright:1400,direct:0.208,body:[46,0.075,0.07],
    grains:2, grainLevel:.08,grainSpread:.040,send:1.0,
    modes:[[62,0.11,0.07],[128,0.085,0.07],[255,0.05,0.07],[520,0.022,0.19],[1200,0.012,0.36],[2600,0.007,1]]},
  clunk:   {duration:1.10,burst:.0090,shape:1.6,bright:1000,direct:0.175,body:[38,0.095,0.04],
    grains:3, grainLevel:.10,grainSpread:.060,send:1.05,
    modes:[[48,0.19,0.04],[96,0.15,0.04],[190,0.09,0.08],[410,0.045,0.11],[980,0.02,0.35],[2200,0.01,1]]},
  // Something large and steel giving, a long way off down the shaft.
  clank:   {duration:1.8,burst:.0034,shape:2.6,bright:5200,direct:0.031,body:[64,0.07,0.02],
    grains:4, grainLevel:.12,grainSpread:.090,send:1.3,
    modes:[[128,0.46,0.04],[287,0.4,0.04],[604,0.32,0.1],[1130,0.24,0.16],[1980,0.15,0.16],[3600,0.1,0.46],[6100,0.06,1]]},
  click:   {duration:.06,burst:.0009,shape:3.6,bright:11000,direct:0.25,body:null,
    grains:0, grainLevel:0,grainSpread:0,send:.5,
    modes:[[720,0.01,0.1],[2400,0.007,0.4],[4100,0.004,0.4],[7200,0.002,1]]},
  switch:  {duration:.08,burst:.0011,shape:3.2,bright:9000,direct:0.242,body:null,
    grains:0, grainLevel:0,grainSpread:0,send:.5,
    modes:[[620,0.012,0.2],[1400,0.008,0.51],[3000,0.005,0.82],[5400,0.003,1],[8200,0.002,1]]},
  // --- things you pick up and put down ------------------------------------
  paper:   {duration:.34,burst:.0220,shape:.7, bright:5200,direct:0.02,body:null,
    grains:14,grainLevel:.22,grainSpread:.170,send:.5,
    modes:[[420,0.022,0.12],[1150,0.016,0.54],[2600,0.011,1],[4900,0.007,0.41],[7800,0.004,0.98]]},
  cloth:   {duration:.30,burst:.0260,shape:.6, bright:2400,direct:0.023,body:null,
    grains:9, grainLevel:.16,grainSpread:.150,send:.4,
    modes:[[180,0.028,0.04],[240,0.024,0.04],[680,0.017,0.24],[1600,0.011,1],[3200,0.006,0.77],[6000,0.003,0.66]]},
  glass:   {duration:.75,burst:.0016,shape:3.0,bright:12000,direct:0.228,body:null,
    grains:2, grainLevel:.06,grainSpread:.040,send:1.0,
    modes:[[1180,0.3,0.21],[2450,0.26,0.36],[3900,0.2,0.36],[6200,0.13,1],[9200,0.08,1]]},
  plastic: {duration:.22,burst:.0028,shape:2.4,bright:5200,direct:0.221,body:null,
    grains:1, grainLevel:.05,grainSpread:.030,send:.6,
    modes:[[240,0.034,0.05],[560,0.03,0.14],[1420,0.02,0.37],[2900,0.012,0.56],[5600,0.006,1]]},
  timber:  {duration:.40,burst:.0055,shape:1.9,bright:2200,direct:0.235,body:[88,0.045,0.04],
    grains:2, grainLevel:.07,grainSpread:.045,send:.8,
    modes:[[105,0.06,0.04],[190,0.055,0.07],[420,0.04,0.13],[880,0.024,0.25],[1700,0.013,0.25],[3400,0.007,1]]},
};
// One impact, rendered offline. Three things happen here that the old build
// did not do. The excitation is filtered before it reaches the resonators, so
// the strike carries a sole rather than a bare click; a low half-cycle is added
// underneath for the mass behind the foot; and b0 is sin(w) alone. The old
// b0 = sin(w)*(1-r) scaled every mode by its own bandwidth, which is 4.3e-4 for
// a 95 Hz mode that rings 48 ms against 4.2e-3 for a 3.1 kHz mode that rings 5 ms
// — a factor of three hundred against exactly the modes that carry the weight.
// Every material collapsed into its top two octaves no matter what its table
// said, which is why walking sounded like tap shoes on a hard floor.
const TAKES=6;      // rendered variants of each impact
const TEXTURE=.35;  // how much surface noise rides on the deterministic strike
const REFERENCE_RMS=.09;   // common loudness every rendered bank is trimmed to
function renderImpact(spec,rate,rng){
  const length=Math.max(64,Math.floor(rate*spec.duration)),excitation=new Float32Array(length),out=new Float32Array(length);
  // The strike itself is a force pulse, not noise. Modelling it as a short
  // random burst gave every take its own comb filter: measured across six
  // renders of concrete, the share of energy between 2 and 5 kHz swung from 7
  // to 50 per cent, so some steps landed dull and the next one ticked. A raised
  // decaying force pulse is both what actually happens when a heel meets a
  // floor and stable from take to take. Its spectrum is flat below 1/(2*pi*tau)
  // and falls at 6 dB per octave above with no nulls, so unlike a raised cosine
  // it colours nothing; jittering the contact time varies brightness smoothly
  // instead of randomly, and TEXTURE keeps enough noise on top for the surface
  // to sound like a surface.
  const burst=Math.max(2,Math.floor(rate*spec.burst));
  const contact=Math.max(2,burst*(.10+rng()*.06));
  for(let i=0;i<burst;i++)excitation[i]=Math.exp(-i/contact)+(rng()*2-1)*Math.pow(1-i/burst,spec.shape)*TEXTURE;
  // The sole: two one-pole passes = a gentle 12 dB slope that reads as rubber.
  if(spec.bright&&spec.bright<rate*.45){
    const k=Math.exp(-2*Math.PI*spec.bright/rate);
    for(let pass=0;pass<2;pass++){let y=0;for(let i=0;i<length;i++){y=y*k+excitation[i]*(1-k);excitation[i]=y;}}
    let peak=0;for(let i=0;i<burst*3&&i<length;i++)peak=Math.max(peak,Math.abs(excitation[i]));
    if(peak>1e-9)for(let i=0;i<length;i++)excitation[i]/=peak;
  }
  // Grit and scatter go on *after* the sole, not through it: loose material is
  // dragged straight off the floor by the edge of the shoe, so it keeps the top
  // octaves that the sole takes out of the strike itself.
  const grainLength=Math.max(2,Math.floor(rate*.0016));
  for(let g=0;g<spec.grains;g++){
    const at=Math.floor(rng()*rate*spec.grainSpread),amplitude=spec.grainLevel*(.25+rng()*.9);
    for(let i=0;i<grainLength&&at+i<length;i++)excitation[at+i]+=(rng()*2-1)*amplitude*(1-i/grainLength);
  }
  // Each mode is a bandpass, not a two-pole lowpass. Without the (1 - z^-2)
  // numerator a resonator passes DC — a 180 Hz mode damped over 28 ms has a DC
  // gain of about 1.6 — and the strike pulse is full of it, so a broad sub-300 Hz
  // lump appeared under every impact. Cloth measured 56 per cent of its energy
  // below 120 Hz while its lowest mode sat at 180. The zeros at DC and Nyquist
  // are what a real mode has, and they take the lump with them.
  //
  // b0 = sqrt(1-r^2)/2 gives every mode the same *energy* for a given gain, so
  // the table reads as a balance rather than as a set of peak heights: a mode
  // that rings for 75 ms and one that rings for 5 ms both contribute what they
  // say they do. The original b0 = sin(w)*(1-r) scaled each mode by its own
  // bandwidth, which is 4e-4 for a 95 Hz mode against 4e-3 for a 3.1 kHz one —
  // so every low mode came out three hundred times too quiet and every material
  // in the game, whatever its table said, was reduced to its top two octaves.
  for(const [frequency,decay,gain] of spec.modes){
    const w=2*Math.PI*Math.min(frequency,rate*.45)/rate,r=Math.exp(-1/Math.max(1e-4,decay)/rate);
    const a1=2*r*Math.cos(w),a2=-r*r,b0=Math.sqrt(1-r*r)/2;
    let y1=0,y2=0,x1=0,x2=0;
    for(let i=0;i<length;i++){
      const x=excitation[i],y=b0*(x-x2)+a1*y1+a2*y2;
      x2=x1;x1=x;y2=y1;y1=y;out[i]+=y*gain;
    }
  }
  // The mass behind the foot: one low half-cycle with a fast attack.
  if(spec.body){
    const [frequency,decay,gain]=spec.body,w=2*Math.PI*frequency/rate,attack=Math.max(2,Math.floor(rate*.0025));
    for(let i=0;i<length;i++){
      const envelope=Math.exp(-i/(decay*rate))*(i<attack?i/attack:1);
      out[i]+=Math.sin(w*i)*envelope*gain;
    }
  }
  // What survives on top of the modes is the contact patch radiating directly.
  // A small radiator is poor at low frequencies, so the pulse is high-passed
  // before it is added; adding it flat put the same DC lump back on top.
  const bite=new Float32Array(burst),hp=Math.exp(-2*Math.PI*400/rate);
  for(let i=0,prev=0,state=0;i<burst;i++){
    const v=excitation[i];state=hp*(state+v-prev);prev=v;bite[i]=state;
  }
  let peak=0;
  for(let i=0;i<length;i++){
    if(i<burst)out[i]+=bite[i]*spec.direct;
    const t=i/length;if(t>.82)out[i]*=1-(t-.82)/.18;
    const magnitude=Math.abs(out[i]);if(magnitude>peak)peak=magnitude;
  }
  if(peak>0)for(let i=0;i<length;i++)out[i]/=peak;
  return out;
}
const FLOORS=['concrete','grating','metal','rock','grit','soil','soft','grass','wet'];
// How loud a step is on each floor. `sample` is the level of the recording,
// which is what actually plays; `level`, `toe` and `scuff` drive the synthesised
// fallback underneath it, for the moments before the recordings finish decoding. A walk is heel, then
// forefoot about a tenth of a second later at a fraction of the level and
// duller — the old build put the second contact at a third of full level and
// *brighter*, fifty milliseconds behind the first, which is a heel-toe tap
// figure and is most of why it sounded like dancing.
const FOOTFALL={
  concrete:{level:0.041,sample:0.091,toe:.16,scuff:.10},
  grating: {level:0.043,sample:0.064,toe:.20,scuff:.16},
  metal:   {level:0.04,sample:0.06,toe:.18,scuff:.13},
  rock:    {level:0.041,sample:0.091,toe:.12,scuff:.26},
  grit:    {level:0.035,sample:0.135,toe:.09,scuff:.42},
  soil:    {level:0.032,sample:0.06,toe:.07,scuff:.34},
  soft:    {level:0.025,sample:0.04,toe:.10,scuff:.08},
  grass:   {level:0.028,sample:0.052,toe:.09,scuff:.20},
  wet:     {level:0.043,sample:0.061,toe:.15,scuff:.30},
};


// What each kind of object sounds like coming off a shelf. A pickup is never
// one sound: the hand meets the object, the object answers with its own
// material, the sleeve moves behind both, and something heavy settles after.
// The old build played a single interface click for every relic in the silo.
const PICKUPS={
  paper:  {material:'paper',  gain:.030,rustle:.030,tick:.010,tilt:6000,rustleHz:[2200,3400]},
  book:   {material:'paper',  gain:.036,rustle:.026,tick:.014,tilt:4200,rustleHz:[1500,2400],settle:'timber'},
  cloth:  {material:'cloth',  gain:.030,rustle:.042,tick:.006,tilt:3000,rustleHz:[700,1400]},
  glass:  {material:'glass',  gain:.024,rustle:.014,tick:.014,tilt:9000,rustleHz:[1800,2800]},
  plastic:{material:'plastic',gain:.032,rustle:.016,tick:.014,tilt:7000,rustleHz:[1600,2600]},
  timber: {material:'timber', gain:.034,rustle:.014,tick:.015,tilt:5000,rustleHz:[1200,2000]},
  metal:  {material:'metal',  gain:.024,rustle:.016,tick:.017,tilt:8000,rustleHz:[1400,2400]},
  relic:  {material:'plastic',gain:.032,rustle:.022,tick:.015,tilt:6500,rustleHz:[1500,2500],settle:'timber'},
};

// Ambience mix, reverb return, footstep material and occasional-sound family
// per location. Keys are the special-location ids and the room types from
// data.js; anything unlisted falls back to the standard gallery interior.
const INTERIOR={hum:.030,air:.016,wind:0,machine:0,tone:13000,space:.26,step:'concrete',event:'interior'};
const PLACES={
  surface:   {hum:.004,air:.002,wind:.085,machine:0,   tone:15000,space:.04,step:'grit',    event:'surface'},
  airlock:   {hum:.032,air:.022,wind:.018,machine:.008,tone:11000,space:.22,step:'metal',   event:'metal'},
  generator: {hum:.052,air:.030,wind:0,   machine:.056,tone:8000, space:.40,step:'metal',   event:'metal'},
  excavator: {hum:.044,air:.028,wind:0,   machine:.040,tone:8000, space:.38,step:'rock',    event:'water'},
  mines:     {hum:.020,air:.020,wind:0,   machine:0,   tone:7500, space:.30,step:'rock',    event:'water'},
  tunnel:    {hum:.016,air:.014,wind:0,   machine:0,   tone:6500, space:.38,step:'rock',    event:'water'},
  mechanical:{hum:.046,air:.026,wind:0,   machine:.026,tone:9500, space:.32,step:'metal',   event:'metal'},
  workshop:  {hum:.034,air:.020,wind:0,   machine:.010,tone:11000,space:.24,step:'metal',   event:'metal'},
  water:     {hum:.034,air:.022,wind:0,   machine:.014,tone:9500, space:.30,step:'concrete',event:'water'},
  recycling: {hum:.038,air:.024,wind:0,   machine:.018,tone:9000, space:.30,step:'metal',   event:'metal'},
  farm:      {hum:.026,air:.030,wind:0,   machine:0,   tone:13000,space:.18,step:'grass',   event:'water'},
  park:      {hum:.020,air:.028,wind:0,   machine:0,   tone:14000,space:.16,step:'grass',   event:'water'},
  residential:{hum:.024,air:.016,wind:0,  machine:0,   tone:12000,space:.10,step:'soft',    event:'interior'},
  bazaar:    {hum:.026,air:.018,wind:0,   machine:0,   tone:13500,space:.20,step:'concrete',event:'interior'},
  cafeteria: {hum:.026,air:.018,wind:0,   machine:0,   tone:14000,space:.24,step:'concrete',event:'interior'},
  medical:   {hum:.030,air:.024,wind:0,   machine:0,   tone:12500,space:.12,step:'soft',    event:'interior'},
  it:        {hum:.036,air:.030,wind:0,   machine:.010,tone:11500,space:.14,step:'soft',    event:'interior'},
  vault:     {hum:.034,air:.026,wind:0,   machine:.008,tone:10500,space:.16,step:'soft',    event:'interior'},
  surveillance:{hum:.030,air:.024,wind:0, machine:.006,tone:11000,space:.10,step:'soft',    event:'interior'},
};

export class SiloAudio {
  constructor(){
    this.context=null;this.enabled=true;this.musicVolume=.148;this.lastStep=0;this.foot=1;
    this.musicHeld=false;this.musicOffset=0;this.musicBuffer=null;this.musicCue=null;this.musicFade=5;this.openingPlaying=false;this.openingElement=null;
    this.place=INTERIOR;this.stepSurface='concrete';this.surfaceOverride=null;this.steps=null;this.musicRequested=false;this.musicPlaying=false;this.scrub=null;
  }

  // Created on the first user gesture; browsers refuse an AudioContext before one.
  start(){
    if(!this.context){
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;
      let context;try{context=new Context();}catch{return;}
      this.context=context;this.build();this.loadFootsteps();this.loadMusic();this.scheduleEvent();
    }
    this.context.resume?.().catch(()=>{});
  }

  build(){
    const c=this.context;
    this.limiter=c.createDynamicsCompressor();
    this.limiter.threshold.value=-10;this.limiter.knee.value=4;this.limiter.ratio.value=8;this.limiter.attack.value=.005;this.limiter.release.value=.25;
    this.limiter.connect(c.destination);
    this.master=c.createGain();this.master.gain.value=this.enabled?LEVEL:0;this.master.connect(this.limiter);
    this.sfx=c.createGain();this.sfx.gain.value=1;this.sfx.connect(this.master);
    this.ambience=c.createGain();this.ambience.gain.value=.6;this.ambience.connect(this.master);   // room tone sits under the soundtrack, never over it
    this.musicBus=c.createGain();this.musicBus.gain.value=.0001;this.musicBus.connect(this.master);
    this.musicTone=c.createBiquadFilter();this.musicTone.type='lowpass';this.musicTone.frequency.value=this.place.tone;this.musicTone.Q.value=.6;this.musicTone.connect(this.musicBus);

    // A synthetic impulse response gives footsteps and doors the tail of a deep
    // concrete shaft without shipping a reverb sample.
    this.spaceSend=c.createGain();this.spaceSend.gain.value=.70;   // base feed; each voice scales it by its material's send
    this.spaceReturn=c.createGain();this.spaceReturn.gain.value=this.place.space;
    const convolver=c.createConvolver();convolver.buffer=this.makeImpulse(2.1,2.6);
    this.spaceSend.connect(convolver);convolver.connect(this.spaceReturn);this.spaceReturn.connect(this.master);

    this.noise=this.makeNoise(2.5);
    this.bank=this.renderBank();
    // Deep electrical hum. The detuned pair beats slowly against itself so the
    // bed never sounds like a held test tone.
    this.humGain=c.createGain();this.humGain.gain.value=this.place.hum;this.humGain.connect(this.ambience);
    for(const [frequency,level] of [[50,1],[50.31,.55],[100,.34],[150.4,.12]]){
      const osc=c.createOscillator(),gain=c.createGain();
      osc.type='sine';osc.frequency.value=frequency;gain.gain.value=level;
      osc.connect(gain);gain.connect(this.humGain);osc.start();
    }
    // Ventilation room tone and the wind heard through the airlock and outside.
    this.airGain=this.makeBed(this.makeBrown(4),340,.7,this.place.air);
    this.windGain=this.makeBed(this.makeBrown(6),700,.6,this.place.wind);
    // Turbine and excavator throb: a filtered saw with a slow amplitude wobble.
    this.machineGain=c.createGain();this.machineGain.gain.value=this.place.machine;this.machineGain.connect(this.ambience);
    const machine=c.createOscillator(),machineFilter=c.createBiquadFilter(),throb=c.createGain(),wobble=c.createOscillator(),wobbleDepth=c.createGain();
    machine.type='sawtooth';machine.frequency.value=41;machineFilter.type='lowpass';machineFilter.frequency.value=190;machineFilter.Q.value=3.4;
    // The wobble rides its own stage inside the chain. Modulating the bus gain
    // instead would add the LFO to a zero base and leak the turbine everywhere.
    throb.gain.value=.62;wobble.frequency.value=2.35;wobbleDepth.gain.value=.36;wobble.connect(wobbleDepth);wobbleDepth.connect(throb.gain);
    machine.connect(machineFilter);machineFilter.connect(throb);throb.connect(this.machineGain);machine.start();wobble.start();
  }

  makeBed(buffer,cutoff,q,level){
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=cutoff;filter.Q.value=q;gain.gain.value=level;
    source.connect(filter);filter.connect(gain);gain.connect(this.ambience);source.start();
    return gain;
  }
  // Six takes of every impact. One sample retriggered is the machine-gun
  // footstep everybody recognises. Four was better; six, each one also pitched,
  // levelled and tilted per hit, is enough that a corridor of thirty steps never
  // repeats a recognisable pair.
  renderBank(){
    const c=this.context,bank={},rng=(()=>{let seed=0x5f18a3;return()=>((seed=seed*1664525+1013904223>>>0)/4294967296);})();
    for(const [name,spec] of Object.entries(IMPACTS)){
      let energy=0,samples=0;
      const takes=Array.from({length:TAKES},()=>{
        const data=renderImpact(spec,c.sampleRate,rng),buffer=c.createBuffer(1,data.length,c.sampleRate);
        for(let i=0;i<data.length;i++)energy+=data[i]*data[i];
        samples+=data.length;
        buffer.getChannelData(0).set?.(data);return buffer;
      });
      // A level should mean loudness, not peak height. Every take is normalised
      // to peak 1 for headroom, but a sharp transient with no tail (a rug) has
      // far less energy at that peak than something that rings (a steel deck) —
      // measured, the two differ by 6 dB at the same gain. Each bank carries the
      // trim that brings it to a common RMS so the tables below can be read as
      // how loud a thing is rather than how tall its first sample is.
      // Clamped, because every take peaks at 1: an unclamped trim on something
      // very peaky (struck glass measures a crest factor of 76) would multiply
      // its peak by seven and drive the limiter on a single pickup.
      const rms=Math.sqrt(energy/Math.max(1,samples));
      bank[name]={takes,trim:clamp(rms>1e-6?REFERENCE_RMS/rms:1,.4,2.2)};
    }
    return bank;
  }
  // Fire one rendered impact. `tilt` is a per-hit low-pass corner: pitching a
  // take is not enough on its own, because every playback rate keeps the same
  // spectral shape and the ear hears the repeat. Moving the corner as well
  // changes which modes survive, so two hits of the same take differ in colour
  // and not only in pitch.
  hit(out,name,t,{gain=1,rate=1,tilt=0}={}){
    const entry=this.bank?.[name];if(!entry)return;
    const {takes,trim}=entry;
    const c=this.context,source=c.createBufferSource(),level=c.createGain();
    source.buffer=takes[Math.floor(Math.random()*takes.length)];source.playbackRate.value=rate;level.gain.value=gain*trim;
    let tail=source;
    if(tilt>0&&tilt<c.sampleRate*.45){
      const lowpass=c.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=tilt;lowpass.Q.value=.55;
      tail.connect(lowpass);tail=lowpass;
    }
    tail.connect(level);level.connect(out);source.start(t);
  }
  makeNoise(seconds){
    const c=this.context,buffer=c.createBuffer(1,Math.floor(c.sampleRate*seconds),c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    return buffer;
  }
  makeBrown(seconds){
    const c=this.context,buffer=c.createBuffer(1,Math.floor(c.sampleRate*seconds),c.sampleRate),data=buffer.getChannelData(0);
    let last=0;for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.03)/1.03;data[i]=clamp(last*3.4,-1,1);}
    // Taper the seam so the looping bed does not click once a second.
    const fade=Math.floor(c.sampleRate*.25);
    for(let i=0;i<fade;i++){const k=i/fade;data[i]*=k;data[data.length-1-i]*=k;}
    return buffer;
  }
  // The shaft tail. The first version used a single one-pole at roughly 2.3 kHz
  // and measured 60 per cent of its energy above 2 kHz — a hiss, not a hundred
  // and forty levels of concrete. Two poles take it down to around 800 Hz, and
  // the corner closes further as the tail decays, because air and concrete both
  // absorb the top end faster than the bottom. Level is matched to the old tail
  // by RMS so the per-location send values still mean what they did.
  makeImpulse(seconds,decay){
    const c=this.context,rate=c.sampleRate,length=Math.floor(rate*seconds),buffer=c.createBuffer(2,length,rate),gap=Math.floor(rate*.018);
    for(let channel=0;channel<2;channel++){
      const data=buffer.getChannelData(channel);let a=0,b=0,sum=0;
      for(let i=0;i<length;i++){
        const t=i/length,k=.86+.11*t,white=Math.random()*2-1;
        a=a*k+white*(1-k);b=b*k+a*(1-k);
        data[i]=i<gap?0:b*Math.pow(1-t,decay);                     // a short gap reads as distance to the first wall
        sum+=data[i]*data[i];
      }
      const rms=Math.sqrt(sum/length);
      if(rms>1e-9){const scale=.085/rms;for(let i=0;i<length;i++)data[i]*=scale;}
    }
    return buffer;
  }

  // --- soundtrack ---------------------------------------------------------
  decode(raw){
    return new Promise((resolve,reject)=>{
      const promise=this.context.decodeAudioData(raw,resolve,reject);
      if(promise&&promise.then)promise.then(resolve,reject);
    });
  }
  // MP3 decoding pads the stream with a few milliseconds of silence at each
  // end. The supplied master runs at full level from its first sample to its
  // last, so looping between the outermost audible samples rejoins the ten
  // minute bed onto itself without an audible gap.
  audibleBounds(buffer){
    const threshold=1e-3,channels=[];
    for(let i=0;i<buffer.numberOfChannels;i++)channels.push(buffer.getChannelData(i));
    const length=buffer.length,quiet=index=>channels.every(data=>Math.abs(data[index])<threshold);
    let start=0,end=length-1;
    while(start<length&&quiet(start))start++;
    while(end>start&&quiet(end))end--;
    if(end-start<length*.9)return {start:0,end:buffer.duration};   // not codec padding; leave the buffer alone
    return {start:start/buffer.sampleRate,end:(end+1)/buffer.sampleRate};
  }
  // Hold the looping bed back. The cafeteria is silent while you are looking
  // for the directory book, and once you have it the opening piece owns the
  // music until it finishes. Nothing else in the silo cares where in the bed it
  // comes in, so the offset machinery below is only ever used for that.
  holdMusic(){this.musicHeld=true;}
  // Start, or restart, the soundtrack `offset` seconds into the loop. If the
  // ten minute file is still decoding, the cue time is remembered and the wait
  // is added on when it lands, so a slow decode delays the music without
  // sliding it out of step with the scene it was cut against.
  startMusicAt(offset=0,fade=5){
    if(!this.context)return;
    this.musicHeld=false;this.musicOffset=offset;this.musicFade=fade;this.musicCue=this.context.currentTime;
    if(this.musicBuffer){this.stopMusic();this.playMusic(this.musicBuffer);}
    else if(this.musicElement){
      try{this.musicElement.currentTime=this.startOffset(this.musicElement.duration||0);}catch{}
      this.musicElement.play().catch(error=>{this.musicError=error;});this.musicPlaying=true;this.fadeMusicIn();
    }
  }
  // Start the bed, unless the opening piece is still running — it owns the
  // music until it ends, and it ends by calling this itself.
  releaseMusic(){if(this.openingPlaying)return;if(this.musicHeld)this.startMusicAt(0,5);}
  // The opening piece. It streams through a media element rather than being
  // decoded into a buffer: a one-shot needs no sample-accurate loop point, it
  // starts the instant it is asked to instead of after a ten minute decode —
  // which matters, because it has to begin on the frame the book is picked up
  // and the scene on the cafeteria screen is cut against it — and it costs
  // essentially no memory. See the beat sheet in opening.js.
  playOpeningTheme(){
    if(!this.context)return;
    this.musicHeld=true;this.stopMusic();
    if(!this.openingElement){
      if(typeof Audio!=='function'){this.musicHeld=false;this.releaseMusic();return;}
      try{
        const element=new Audio(OPENING_URL);element.preload='auto';
        this.context.createMediaElementSource(element).connect(this.musicTone);
        element.addEventListener('ended',()=>{this.openingPlaying=false;this.releaseMusic();});
        this.openingElement=element;
      }catch(error){this.musicError=error;this.musicHeld=false;this.releaseMusic();return;}
    }
    this.openingPlaying=true;this.musicFade=2.5;
    try{this.openingElement.currentTime=0;}catch{}
    this.openingElement.play().catch(error=>{this.musicError=error;this.openingPlaying=false;this.releaseMusic();});
    this.fadeMusicIn();
  }
  stopOpeningTheme(){
    this.openingPlaying=false;
    if(this.openingElement){try{this.openingElement.pause();this.openingElement.currentTime=0;}catch{}}
  }
  // The scene stops advancing when the game is paused or the tab is hidden, and
  // a media element does not stop with a suspended AudioContext the way a
  // buffer source does. Hold it with the scene or the two drift apart.
  setStoryPaused(value){
    const element=this.openingElement;
    if(!element||!this.openingPlaying)return;
    if(value){if(!element.paused)element.pause();}
    else if(element.paused)element.play().catch(()=>{});
  }
  stopMusic(){try{this.musicSource?.stop();}catch{}this.musicSource=null;this.musicPlaying=false;}
  async loadMusic(){
    if(this.musicRequested||!this.context)return;
    this.musicRequested=true;
    try{
      const response=await fetch(MUSIC_URL);
      if(!response.ok)throw Error(`soundtrack ${response.status}`);
      this.musicBuffer=await this.decode(await response.arrayBuffer());
      if(!this.musicHeld)this.playMusic(this.musicBuffer);
    }catch(error){this.musicError=error;this.streamMusic();}
  }
  // Ten minutes decodes to roughly 200 MB of float samples, which buys a
  // sample-accurate loop point. If a device refuses that allocation, or the
  // fetch itself failed, stream the same file through a media element instead:
  // near zero memory, at the cost of the browser's own seam once every ten
  // minutes. Better than a silo with no soundtrack in it.
  streamMusic(){
    if(!this.context||this.musicPlaying||typeof Audio!=='function')return;
    try{
      const element=new Audio(MUSIC_URL);element.loop=true;element.preload='auto';
      this.context.createMediaElementSource(element).connect(this.musicTone);
      this.musicElement=element;
      if(this.musicHeld)return;
      element.currentTime=this.startOffset(0);
      element.play().catch(error=>{this.musicError=error;});
      this.musicPlaying=true;this.fadeMusicIn();
    }catch(error){this.musicError=error;}
  }
  // Where in the loop to drop the needle: the requested cue point, plus however
  // long the decode kept the scene waiting, wrapped back into the loop.
  startOffset(length){
    const waited=this.musicCue==null?0:Math.max(0,this.context.currentTime-this.musicCue);
    const at=this.musicOffset+waited;
    return length>0?at%length:at;
  }
  playMusic(buffer){
    if(!this.context||this.musicPlaying||this.musicHeld)return;
    const c=this.context,bounds=this.audibleBounds(buffer),source=c.createBufferSource();
    source.buffer=buffer;source.loop=true;source.loopStart=bounds.start;source.loopEnd=bounds.end;
    source.connect(this.musicTone);source.start(c.currentTime,bounds.start+this.startOffset(bounds.end-bounds.start));
    this.musicSource=source;this.musicPlaying=true;this.fadeMusicIn();
  }
  // An exponential ramp out of true silence spends most of its length inaudible,
  // so start it around -34 dB and let the whole five seconds be a usable fade.
  fadeMusicIn(){
    const c=this.context,volume=Math.max(.0002,this.musicVolume);
    this.musicBus.gain.cancelScheduledValues(c.currentTime);
    this.musicBus.gain.setValueAtTime(volume/50,c.currentTime);
    this.musicBus.gain.exponentialRampToValueAtTime(volume,c.currentTime+Math.max(.5,this.musicFade));
  }
  // fraction is 0..1 from the settings slider; the curve keeps the low end usable.
  setMusicVolume(fraction){
    this.musicVolume=.30*Math.pow(clamp(fraction,0,1),1.6);
    if(this.musicBus&&this.musicPlaying)this.musicBus.gain.setTargetAtTime(Math.max(.0001,this.musicVolume),this.context.currentTime,.4);
  }

  // --- mix ----------------------------------------------------------------
  setEnabled(value){
    this.enabled=value;
    if(this.master)this.master.gain.setTargetAtTime(value?LEVEL:0,this.context.currentTime,.25);
  }
  // The floor the player is standing on, which is not always the floor of the
  // room they are in: the staircase runs through every level as open steel.
  // Passing null clears the override and hands the surface back to the room.
  setSurface(name){
    this.surfaceOverride=FLOORS.includes(name)?name:null;
  }
  material(){
    const name=this.surfaceOverride||this.stepSurface;
    return FLOORS.includes(name)?name:'concrete';
  }
  setLocation(type){
    const place=PLACES[type]||INTERIOR;
    this.place=place;this.stepSurface=place.step;
    if(!this.context)return;
    const t=this.context.currentTime;
    this.humGain.gain.setTargetAtTime(place.hum,t,.9);
    this.airGain.gain.setTargetAtTime(place.air,t,.9);
    this.windGain.gain.setTargetAtTime(place.wind,t,1.4);
    this.machineGain.gain.setTargetAtTime(place.machine,t,1.4);
    this.spaceReturn.gain.setTargetAtTime(place.space,t,1);
    this.musicTone.frequency.setTargetAtTime(place.tone,t,1.6);
  }

  // --- one-shot helpers ---------------------------------------------------
  // Sends dry to the effects bus and wet to the shaft reverb, optionally panned.
  // `send` scales the reverb feed per sound: a boot on open steel grating throws
  // far more into the shaft than the same boot on a carpeted residential floor,
  // and a fixed send made every surface sound like it was in the same room.
  voice(pan=0,muffle=0,send=1){
    const c=this.context,out=c.createGain();out.gain.value=1;
    let tail=out;
    if(muffle){const lowpass=c.createBiquadFilter();lowpass.type='lowpass';lowpass.frequency.value=muffle;lowpass.Q.value=.6;tail.connect(lowpass);tail=lowpass;}
    if(pan&&c.createStereoPanner){const panner=c.createStereoPanner();panner.pan.value=clamp(pan,-1,1);tail.connect(panner);tail=panner;}
    tail.connect(this.sfx);
    if(send>0){const feed=c.createGain();feed.gain.value=send;tail.connect(feed);feed.connect(this.spaceSend);}
    return out;
  }
  burst(out,t,{gain,decay,frequency,to=frequency,q=1,type='bandpass',attack=.004,rate=1}){
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),envelope=c.createGain(),end=t+attack+decay;
    source.buffer=this.noise;source.loop=true;source.playbackRate.value=rate;
    filter.type=type;filter.Q.value=q;filter.frequency.setValueAtTime(frequency,t);
    if(to!==frequency)filter.frequency.linearRampToValueAtTime(to,end);
    envelope.gain.setValueAtTime(.0001,t);envelope.gain.linearRampToValueAtTime(gain,t+attack);envelope.gain.exponentialRampToValueAtTime(.0001,end);
    source.connect(filter);filter.connect(envelope);envelope.connect(out);
    source.start(t,Math.random()*(this.noise.duration-.6));source.stop(end+.05);
  }
  tone(out,t,{gain,decay,frequency,to=frequency,type='sine',attack=.004}){
    const c=this.context,osc=c.createOscillator(),envelope=c.createGain(),end=t+attack+decay;
    osc.type=type;osc.frequency.setValueAtTime(frequency,t);
    if(to!==frequency)osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),end);
    envelope.gain.setValueAtTime(.0001,t);envelope.gain.linearRampToValueAtTime(gain,t+attack);envelope.gain.exponentialRampToValueAtTime(.0001,end);
    osc.connect(envelope);envelope.connect(out);osc.start(t);osc.stop(end+.05);
  }
  live(){return this.context&&this.enabled&&this.master;}

  // --- footsteps ----------------------------------------------------------
  // Footsteps are recordings, not synthesis.
  //
  // They were modelled: a strike fed through a bank of damped resonators. That
  // is the right tool for a bell, a steel plate or a pane of glass, and the
  // wrong one for a floor — a floor answers with broadband noise, not with a
  // set of tuned partials, and no amount of retuning the mode tables fixed the
  // artificial quality that gave every step. One set of real recordings per
  // surface does what three passes of modelling could not.
  //
  // Provenance and licence: dist/assets/audio/footsteps/README.txt. The synth
  // is kept as the fallback below, for the moments before the samples finish
  // decoding and for any surface that has no recording.
  async loadFootsteps(){
    let manifest;
    try{
      const response=await fetch(new URL('manifest.json',FOOTSTEP_URL));
      if(!response.ok)throw new Error(response.status);
      manifest=await response.json();
    }catch{return;}                                        // no recordings: the synth stays
    const steps={};
    await Promise.all(Object.entries(manifest.materials||{}).map(async([material,entry])=>{
      const takes=await Promise.all((entry.takes||[]).map(async take=>{
        try{
          const response=await fetch(new URL(take.file,FOOTSTEP_URL));
          if(!response.ok)return null;
          return await this.decode(await response.arrayBuffer());
        }catch{return null;}
      }));
      const usable=takes.filter(Boolean);
      if(usable.length)steps[material]=usable;
    }));
    if(Object.keys(steps).length)this.steps=steps;
  }
  // One recording, pitched and levelled for this particular step. Rotating
  // through the variants matters more than any single one of them: the same
  // sample retriggered at a walking cadence is the machine-gun footstep, and
  // it is audible after about three steps.
  sample(out,material,t,{gain=1,rate=1}={}){
    const takes=this.steps?.[material];if(!takes||!takes.length)return false;
    const c=this.context,source=c.createBufferSource(),level=c.createGain();
    source.buffer=takes[Math.floor(Math.random()*takes.length)];
    source.playbackRate.value=rate;level.gain.value=gain;
    source.connect(level);level.connect(out);source.start(t);
    return true;
  }
  // A walking step is not one event. The heel lands; the forefoot follows it
  // down about a tenth of a second later, quieter and *duller*, because that
  // second contact is a sole flattening rather than an edge striking; then the
  // sole scuffs as it leaves. The first build fired two near-identical bright
  // hits fifty milliseconds apart, the second of them pitched *up* — which is
  // the rhythm and the tone of a tap step, and is what the whole silo walked on.
  step(distance,speed,contactCount=null){
    if(!this.live()||speed<.4)return;
    const running=speed>2.6,stride=running?1.05:.72;
    // When a rig is present, its actual planted-foot transitions own cadence.
    // The original distance path remains available to older callers.
    if(Number.isFinite(contactCount)){
      const landed=contactCount>0&&contactCount!==this.lastContact;this.lastContact=contactCount;if(!landed)return;
    }else if(distance-this.lastStep<stride)return;
    this.lastStep=distance;this.foot=-this.foot;
    const material=this.material(),fall=FOOTFALL[material],spec=IMPACTS[material];
    const t=this.context.currentTime+.005,force=(running?1.15:.72)*rand(.86,1.14);
    const out=this.voice(this.foot*.18,0,spec.send);
    // A recording is already a whole footstep — heel, roll and all — so it is
    // played once. Layering the synthesised forefoot on top of one would be
    // hearing the same step twice.
    if(this.sample(out,material,t,{gain:fall.sample*force,rate:running?rand(.94,1.04):rand(.92,1.08)}))return;
    // One tilt per step, shared by both contacts so they read as one foot.
    const tilt=spec.bright*rand(.72,1.35),heel=rand(.90,1.06);
    this.hit(out,material,t,{gain:fall.level*force,rate:heel,tilt});
    // The forefoot is pitched and tilted *relative to the heel of the same
    // step*, never drawn independently: with two independent ranges they
    // overlap, and a second contact that lands brighter than the first is the
    // tap-shoe figure this rewrite exists to remove.
    if(running)
      // A run lands flat: the forefoot arrives with the heel, not behind it.
      this.hit(out,material,t+rand(.012,.026),{gain:fall.level*force*.5,rate:heel*rand(.86,.95),tilt:tilt*.7});
    else
      this.hit(out,material,t+rand(.085,.140),{gain:fall.level*force*fall.toe*rand(.8,1.2),rate:heel*rand(.80,.92),tilt:tilt*.55});
    // Toe-off: the sole dragging as it leaves. Loose floors give far more of it.
    if(fall.scuff>.05)
      this.burst(out,t+(running?.05:.16),{frequency:rand(1500,2800)*(.55+fall.scuff),to:rand(500,900),q:.7,
        gain:.0085*fall.scuff*force,decay:running?.09:.15,attack:.02,rate:rand(.7,1.15)});
  }

  // Take-off is the scuff of a sole pushing away, not an impact.
  jump(){
    if(!this.live())return;
    const material=this.material(),spec=IMPACTS[material];
    const t=this.context.currentTime+.005,out=this.voice(rand(-.1,.1),0,spec.send);
    this.burst(out,t,{frequency:rand(900,1400),to:rand(320,520),q:.8,gain:.038,decay:.16,attack:.012,rate:rand(.8,1.1)});
    if(!this.sample(out,material,t,{gain:FOOTFALL[material].sample*.7,rate:rand(1.04,1.16)}))
      this.hit(out,material,t,{gain:FOOTFALL[material].level*.55,rate:rand(1.02,1.16),tilt:spec.bright*rand(.9,1.3)});
  }
  // Landing is both feet at once and the whole body's weight behind them.
  land(strength=1){
    if(!this.live())return;
    const material=this.material(),spec=IMPACTS[material],fall=FOOTFALL[material];
    const force=clamp(strength,0,1),t=this.context.currentTime+.005,out=this.voice(0,0,spec.send*1.15);
    // Both feet at once, so the recording is played twice a few milliseconds
    // apart and pitched down — a landing is heavier than a step, not just louder.
    if(this.sample(out,material,t,{gain:fall.sample*(1.1+1.1*force),rate:rand(.82,.90)}))
      this.sample(out,material,t+.028,{gain:fall.sample*(.5+.6*force),rate:rand(.90,.99)});
    else{
      this.hit(out,material,t,{gain:fall.level*(.95+.95*force),rate:rand(.80,.90),tilt:spec.bright*rand(.55,.85)});
      this.hit(out,material,t+.022,{gain:fall.level*(.65+.7*force),rate:rand(.92,1.02),tilt:spec.bright*rand(.7,1.0)});
    }
    if(fall.scuff>.05)this.burst(out,t+.04,{frequency:rand(1200,2200),to:rand(400,700),q:.7,gain:.012*fall.scuff*(.4+force),decay:.18,attack:.02});
    if(force>.35)this.hit(out,'thunk',t,{gain:.016*force,rate:rand(1.1,1.35)});
  }

  // --- interactions -------------------------------------------------------
  // Picking something up. Four things, close together: fingers finding the edge,
  // the object's own material answering, the sleeve moving behind it, and — for
  // anything with weight — the object settling into the hand a moment later.
  pickup(kind='relic'){
    if(!this.live())return;
    const spec=PICKUPS[kind]||PICKUPS.relic,t=this.context.currentTime+.005;
    const out=this.voice(rand(-.12,.12),0,.55);
    this.hit(out,'latch',t,{gain:spec.tick,rate:rand(1.3,1.7),tilt:spec.tilt});
    this.hit(out,spec.material,t+rand(.012,.028),{gain:spec.gain,rate:rand(.94,1.08),tilt:spec.tilt*rand(.8,1.25)});
    const [low,high]=spec.rustleHz;
    this.burst(out,t+rand(.03,.06),{frequency:rand(low,high),to:rand(low*.4,low*.7),q:.6,
      gain:spec.rustle,decay:rand(.16,.24),attack:.03,rate:rand(.8,1.2)});
    if(spec.settle)this.hit(out,spec.settle,t+rand(.16,.26),{gain:spec.gain*.42,rate:rand(.88,1.06),tilt:spec.tilt*.7});
  }
  // Putting it down again, or dropping it. Same object, no sleeve, and a
  // second contact where it rocks and settles.
  drop(kind='relic'){
    if(!this.live())return;
    const spec=PICKUPS[kind]||PICKUPS.relic,t=this.context.currentTime+.005;
    const out=this.voice(rand(-.12,.12),0,.7);
    this.hit(out,spec.material,t,{gain:spec.gain*1.25,rate:rand(.88,1.02),tilt:spec.tilt*rand(.8,1.2)});
    this.hit(out,spec.material,t+rand(.045,.085),{gain:spec.gain*.34,rate:rand(1.0,1.18),tilt:spec.tilt*.6});
  }
  door(open){
    if(!this.live())return;
    const t=this.context.currentTime+.005,out=this.voice(rand(-.25,.25),0,IMPACTS.thunk.send);
    this.hit(out,'latch',t,{gain:.030,rate:rand(.94,1.08)});                                                     // the handle throwing
    this.hit(out,'thunk',t+.035,{gain:.042,rate:open?rand(1.02,1.1):rand(.92,.98)});                              // the leaf taking its weight
    this.burst(out,t+.05,{frequency:open?430:820,to:open?880:380,q:.9,gain:.030,decay:.44,attack:.10,rate:.45}); // hinge drag
    if(!open){this.hit(out,'thunk',t+.42,{gain:.055,rate:rand(.86,.94)});this.hit(out,'latch',t+.47,{gain:.020,rate:.8});}
  }
  airlock(){
    if(!this.live())return;
    const t=this.context.currentTime+.005,out=this.voice(0,0,IMPACTS.clunk.send);
    this.hit(out,'clunk',t,{gain:.055,rate:rand(.94,1.04)});                                                      // dogs releasing
    // Pressure equalising. A high-pass on noise put 62 per cent of the airlock's
    // energy above 5 kHz — tape hiss, not air moving through a gap under load.
    this.burst(out,t+.05,{frequency:2400,to:800,q:.8,gain:.030,decay:1.7,attack:.3});                            // pressure equalising
    this.burst(out,t+.05,{frequency:340,to:190,q:1.4,gain:.024,decay:1.9,attack:.45});                           // and the weight of it
    this.tone(out,t+.1,{frequency:96,gain:.020,decay:1.6,type:'sawtooth',attack:.35});                           // door motor
    this.hit(out,'clunk',t+1.75,{gain:.040,rate:rand(.8,.9)});                                                    // and seating at the end of travel
  }
  scrubStart(){
    if(!this.live()||this.scrub)return;
    const c=this.context,t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),envelope=c.createGain();
    const stroke=c.createGain(),sweep=c.createOscillator(),sweepDepth=c.createGain(),pulse=c.createOscillator(),pulseDepth=c.createGain();
    source.buffer=this.noise;source.loop=true;
    filter.type='bandpass';filter.frequency.value=1750;filter.Q.value=1.1;
    envelope.gain.setValueAtTime(.0001,t);envelope.gain.linearRampToValueAtTime(.045,t+.18);
    sweep.frequency.value=2.6;sweepDepth.gain.value=950;sweep.connect(sweepDepth);sweepDepth.connect(filter.frequency);
    stroke.gain.value=.62;pulse.frequency.value=2.6;pulseDepth.gain.value=.38;pulse.connect(pulseDepth);pulseDepth.connect(stroke.gain);
    source.connect(filter);filter.connect(stroke);stroke.connect(envelope);envelope.connect(this.sfx);envelope.connect(this.spaceSend);
    source.start(t);sweep.start(t);pulse.start(t);
    this.scrub={nodes:[source,sweep,pulse],envelope};
  }
  scrubStop(){
    if(!this.scrub)return;
    const {nodes,envelope}=this.scrub,t=this.context.currentTime;
    envelope.gain.cancelScheduledValues(t);envelope.gain.setValueAtTime(Math.max(.0001,envelope.gain.value),t);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+.22);
    for(const node of nodes){try{node.stop(t+.28);}catch{}}
    this.scrub=null;
  }
  torch(on){
    if(!this.live())return;
    const t=this.context.currentTime+.005,out=this.voice(.1,0,IMPACTS.switch.send);
    this.hit(out,'switch',t,{gain:.030,rate:on?1.12:.9});
    this.hit(out,'switch',t+.016,{gain:.013,rate:on?.86:1.06});      // the sprung return of a real toggle
  }
  travel(){
    if(!this.live())return;
    const t=this.context.currentTime+.005,out=this.voice(0);
    this.burst(out,t,{frequency:180,to:1400,q:.7,type:'lowpass',gain:.05,decay:.7,attack:.22,rate:.7});
    this.tone(out,t,{frequency:120,to:38,gain:.045,decay:.85,attack:.05});
  }
  click(){
    if(!this.live())return;
    this.hit(this.sfx,'click',this.context.currentTime+.002,{gain:.024,rate:rand(.96,1.05)});   // interface stays dry
  }
  residents(count,watching=false){
    if(!this.live()||count<1)return;
    // Quiet clothing, chair movement and distant steps use the existing
    // ambience bus. No synthetic speech or cloned character dialogue.
    const t=this.context.currentTime+.005,out=this.voice(rand(-.8,.8),1100,.6),gain=(watching?.0012:.0055)*Math.min(1,count/18);
    this.hit(out,watching?'soft':'concrete',t,{gain,rate:rand(.82,1.12)});
    if(!watching&&this.stepSurface==='concrete'&&Math.random()<.4)this.hit(out,'latch',t+.17,{gain:.006,rate:rand(1.4,1.8)});
  }

  // --- occasional life ----------------------------------------------------
  scheduleEvent(){
    clearTimeout(this.eventTimer);
    this.eventTimer=setTimeout(()=>{this.fireEvent();this.scheduleEvent();},rand(11000,26000));
  }
  fireEvent(){
    if(!this.live()||this.context.state!=='running')return;
    if(typeof document!=='undefined'&&document.hidden)return;
    const family=this.place.event,t=this.context.currentTime+.05;
    if(family==='surface'){                                        // a gust rather than a hit
      const gain=this.windGain.gain;
      gain.setTargetAtTime(this.place.wind*rand(1.6,2.5),t,1.3);
      gain.setTargetAtTime(this.place.wind,t+rand(2.5,4.5),1.8);
      return;
    }
    const out=this.voice(rand(-.75,.75),rand(1400,2600),1.2);
    if(family==='water'&&Math.random()<.62){
      // A falling drop rings the cavity it makes in the water, and that cavity
      // shrinks — so the pitch climbs. Sweeping it down is the usual mistake.
      this.tone(out,t,{frequency:rand(620,900),to:rand(1700,2600),gain:.05,decay:.13,attack:.0015});
      this.burst(out,t,{frequency:3300,q:2.2,gain:.014,decay:.04,attack:.0015});
      return;
    }
    if(family==='metal'||Math.random()<.45){                       // plate steel taking up load
      this.hit(out,'clank',t,{gain:.030,rate:rand(.72,1.3)});
      return;
    }
    this.burst(out,t,{frequency:rand(170,260),to:rand(300,430),q:6,gain:.06,decay:rand(1.1,2.2),attack:.45,rate:.35}); // the shaft settling
  }
}
