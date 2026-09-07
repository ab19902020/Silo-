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
// Everything except the soundtrack is synthesised at runtime, so the only
// bundled audio file is the theme itself.
const MUSIC_URL = new URL('../assets/audio/silo-18-theme.mp3', import.meta.url);
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a);
const LEVEL=2.2;   // output trim ahead of the limiter; the sub-bus balance is set below

// Footstep character per walking material. thump is the body of the step, tone
// and q shape the impact noise, ring adds the resonant clang of plate steel.
const SURFACES={
  concrete:{thump:96, body:.105,bodyDecay:.10,tone:1250,q:.9, noise:.075,noiseDecay:.085,ring:0},
  metal:   {thump:114,body:.080,bodyDecay:.07,tone:2700,q:1.5,noise:.085,noiseDecay:.130,ring:.026},
  rock:    {thump:84, body:.090,bodyDecay:.11,tone:900, q:.7, noise:.100,noiseDecay:.145,ring:0},
  grit:    {thump:70, body:.055,bodyDecay:.10,tone:640, q:.5, noise:.115,noiseDecay:.190,ring:0},
  soft:    {thump:78, body:.070,bodyDecay:.12,tone:520, q:.6, noise:.048,noiseDecay:.110,ring:0},
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
  farm:      {hum:.026,air:.030,wind:0,   machine:0,   tone:13000,space:.18,step:'soft',    event:'water'},
  park:      {hum:.020,air:.028,wind:0,   machine:0,   tone:14000,space:.16,step:'soft',    event:'water'},
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
    this.place=INTERIOR;this.stepSurface='concrete';this.musicRequested=false;this.musicPlaying=false;this.scrub=null;
  }

  // Created on the first user gesture; browsers refuse an AudioContext before one.
  start(){
    if(!this.context){
      const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return;
      let context;try{context=new Context();}catch{return;}
      this.context=context;this.build();this.loadMusic();this.scheduleEvent();
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
    this.spaceSend=c.createGain();this.spaceSend.gain.value=.55;
    this.spaceReturn=c.createGain();this.spaceReturn.gain.value=this.place.space;
    const convolver=c.createConvolver();convolver.buffer=this.makeImpulse(2.1,2.6);
    this.spaceSend.connect(convolver);convolver.connect(this.spaceReturn);this.spaceReturn.connect(this.master);

    this.noise=this.makeNoise(2.5);
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
  makeImpulse(seconds,decay){
    const c=this.context,rate=c.sampleRate,length=Math.floor(rate*seconds),buffer=c.createBuffer(2,length,rate),gap=Math.floor(rate*.018);
    for(let channel=0;channel<2;channel++){
      const data=buffer.getChannelData(channel);let low=0;
      for(let i=0;i<length;i++){
        low=low*.74+(Math.random()*2-1)*.26;                       // one-pole tilt keeps the tail concrete-dark
        data[i]=i<gap?0:low*Math.pow(1-i/length,decay);            // a short gap reads as distance to the first wall
      }
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
  async loadMusic(){
    if(this.musicRequested||!this.context)return;
    this.musicRequested=true;
    try{
      const response=await fetch(MUSIC_URL);
      if(!response.ok)throw Error(`soundtrack ${response.status}`);
      this.playMusic(await this.decode(await response.arrayBuffer()));
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
      element.play().catch(error=>{this.musicError=error;});
      this.musicElement=element;this.musicPlaying=true;this.fadeMusicIn();
    }catch(error){this.musicError=error;}
  }
  playMusic(buffer){
    if(!this.context||this.musicPlaying)return;
    const c=this.context,bounds=this.audibleBounds(buffer),source=c.createBufferSource();
    source.buffer=buffer;source.loop=true;source.loopStart=bounds.start;source.loopEnd=bounds.end;
    source.connect(this.musicTone);source.start(c.currentTime,bounds.start);
    this.musicSource=source;this.musicPlaying=true;this.fadeMusicIn();
  }
  // An exponential ramp out of true silence spends most of its length inaudible,
  // so start it around -34 dB and let the whole five seconds be a usable fade.
  fadeMusicIn(){
    const c=this.context,volume=Math.max(.0002,this.musicVolume);
    this.musicBus.gain.cancelScheduledValues(c.currentTime);
    this.musicBus.gain.setValueAtTime(volume/50,c.currentTime);
    this.musicBus.gain.exponentialRampToValueAtTime(volume,c.currentTime+5);
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
  voice(pan=0){
    const c=this.context,out=c.createGain();out.gain.value=1;
    let tail=out;
    if(pan&&c.createStereoPanner){const panner=c.createStereoPanner();panner.pan.value=clamp(pan,-1,1);out.connect(panner);tail=panner;}
    tail.connect(this.sfx);tail.connect(this.spaceSend);
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
  step(distance,speed,contactCount=null){
    if(!this.live()||speed<.4)return;
    const running=speed>2.6,stride=running?1.05:.72;
    // When a rig is present, its actual planted-foot transitions own cadence.
    // The original distance path remains available to older callers.
    if(Number.isFinite(contactCount)){
      const landed=contactCount>0&&contactCount!==this.lastContact;this.lastContact=contactCount;if(!landed)return;
    }else if(distance-this.lastStep<stride)return;
    this.lastStep=distance;this.foot=-this.foot;
    const surface=SURFACES[this.stepSurface]||SURFACES.concrete,t=this.context.currentTime+.005;
    const force=(running?1:.62)*rand(.86,1.14),out=this.voice(this.foot*.16);
    this.tone(out,t,{frequency:surface.thump*rand(.93,1.08),to:surface.thump*.42,gain:surface.body*force,decay:surface.bodyDecay,attack:.006});
    this.burst(out,t,{frequency:surface.tone*rand(.86,1.16),q:surface.q,gain:surface.noise*force,decay:surface.noiseDecay,rate:rand(.9,1.15)});
    if(surface.ring)for(const [multiplier,level] of [[1,1],[1.68,.55]])
      this.tone(out,t+.004,{frequency:rand(880,1180)*multiplier,gain:surface.ring*level*force,decay:rand(.16,.3),type:'triangle',attack:.002});
  }

  // --- interactions -------------------------------------------------------
  door(open){
    if(!this.live())return;
    const t=this.context.currentTime+.005,out=this.voice(rand(-.25,.25));
    this.burst(out,t,{frequency:3000,q:.9,type:'highpass',gain:.045,decay:.045,attack:.002});                    // latch
    this.tone(out,t+.03,{frequency:open?74:64,to:open?44:36,gain:.075,decay:.34,attack:.008});                   // the leaf taking its weight
    this.burst(out,t+.04,{frequency:open?520:900,to:open?900:420,q:.8,gain:.032,decay:.42,attack:.09,rate:.5});  // hinge scrape
    if(!open)this.tone(out,t+.4,{frequency:150,to:70,gain:.05,decay:.16,attack:.004});                           // seating thunk
  }
  airlock(){
    if(!this.live())return;
    const t=this.context.currentTime+.005,out=this.voice(0);
    this.tone(out,t,{frequency:58,to:31,gain:.09,decay:.55,attack:.01});
    this.burst(out,t+.05,{frequency:2100,to:3400,q:.6,type:'highpass',gain:.05,decay:1.5,attack:.28});           // pressure equalising
    this.tone(out,t+.1,{frequency:96,gain:.022,decay:1.6,type:'sawtooth',attack:.35});                           // door motor
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
    const t=this.context.currentTime+.005,out=this.voice(.1);
    this.burst(out,t,{frequency:on?4200:3400,q:1.4,type:'highpass',gain:.05,decay:.02,attack:.001});
    this.tone(out,t+.012,{frequency:on?900:620,to:on?520:360,gain:.03,decay:.05,attack:.002,type:'square'});
  }
  travel(){
    if(!this.live())return;
    const t=this.context.currentTime+.005,out=this.voice(0);
    this.burst(out,t,{frequency:180,to:1400,q:.7,type:'lowpass',gain:.05,decay:.7,attack:.22,rate:.7});
    this.tone(out,t,{frequency:120,to:38,gain:.045,decay:.85,attack:.05});
  }
  click(){
    if(!this.live())return;
    const c=this.context,t=c.currentTime+.002,osc=c.createOscillator(),gain=c.createGain();
    osc.type='triangle';osc.frequency.value=210;
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(.045,t+.003);gain.gain.exponentialRampToValueAtTime(.0001,t+.085);
    osc.connect(gain);gain.connect(this.sfx);osc.start(t);osc.stop(t+.1);   // interface stays dry
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
    const out=this.voice(rand(-.75,.75));
    if(family==='water'&&Math.random()<.62){                       // a drip finding standing water
      this.tone(out,t,{frequency:rand(1500,2500),to:rand(680,1080),gain:.045,decay:.15,attack:.002});
      this.burst(out,t,{frequency:3300,q:2.2,gain:.018,decay:.05,attack:.002});
      return;
    }
    if(family==='metal'||Math.random()<.45){                       // distant plate steel taking up load
      this.burst(out,t,{frequency:rand(1200,2200),q:1.4,gain:.03,decay:.09,attack:.003});
      for(const [multiplier,level] of [[1,.026],[1.71,.015],[2.64,.008]])
        this.tone(out,t,{frequency:rand(320,520)*multiplier,gain:level,decay:rand(.7,1.5),attack:.006});
      return;
    }
    this.burst(out,t,{frequency:rand(170,260),to:rand(300,430),q:6,gain:.055,decay:rand(1.1,2.2),attack:.45,rate:.35}); // the shaft settling
  }
}
